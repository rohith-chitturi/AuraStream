import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  streamUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

interface AudioContextProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  playbackError: string | null;
  progress: number; // in seconds
  duration: number; // in seconds
  queue: Track[];
  queueIndex: number;
  playlists: Playlist[];
  guestMode: boolean;
  searchQuery: string;
  searchResults: Track[];
  isSearching: boolean;
  user: { username: string; email: string } | null;
  setSearchQuery: (query: string) => void;
  playTrack: (track: Track, newQueue?: Track[], index?: number, shouldBroadcast?: boolean) => Promise<void>;
  togglePlay: (shouldBroadcast?: boolean) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (seconds: number, shouldBroadcast?: boolean) => Promise<void>;
  createPlaylist: (name: string, initialTrack?: Track) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  setGuestMode: (val: boolean) => void;
  performSearch: (query: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addToQueue: (track: Track) => void;
  roomId: string | null;
  roomUsers: string[];
  isHost: boolean;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  recentSearches: string[];
  addToRecentSearches: (query: string) => Promise<void>;
  removeRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
}

const AudioContext = createContext<AudioContextProps | undefined>(undefined);

const INVIDIOUS_INSTANCES = [
  "https://iv.melmac.space", // Put verified fast working instance first
  "https://invidious.flokinet.to",
  "https://invidious.nerdvpn.de",
  "https://invidious.yewtu.ch",
  "https://invidious.no-logs.com"
];

let activeInstanceIndex = 0;
const getActiveInstance = () => INVIDIOUS_INSTANCES[activeInstanceIndex];
const rotateInstance = () => {
  activeInstanceIndex = (activeInstanceIndex + 1) % INVIDIOUS_INSTANCES.length;
  console.log(`Rotating Invidious instance to: ${getActiveInstance()}`);
};

// Helper to fetch with timeout
async function fetchWithTimeout(resource: string, options: any = {}) {
  const { timeout = 3000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// MQTT over WebSocket protocol helpers
const MQTT_BROKER = "wss://broker.hivemq.com:8884/mqtt";

function stringToUtf8(str: string): Uint8Array {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

function utf8ToString(bytes: Uint8Array): string {
  let str = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      str += String.fromCharCode(b1);
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++];
      str += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f));
    } else {
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      str += String.fromCharCode(((b1 & 0x0f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f));
    }
  }
  return str;
}

function encodeRemainingLength(length: number): number[] {
  const bytes = [];
  do {
    let encodedByte = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) {
      encodedByte = encodedByte | 128;
    }
    bytes.push(encodedByte);
  } while (length > 0);
  return bytes;
}

function decodeRemainingLength(bytes: Uint8Array, startIdx: number) {
  let multiplier = 1;
  let value = 0;
  let idx = startIdx;
  let encodedByte;
  do {
    encodedByte = bytes[idx++];
    value += (encodedByte & 127) * multiplier;
    multiplier *= 128;
  } while ((encodedByte & 128) !== 0);
  return { value, lengthBytes: idx - startIdx };
}

function sendMqttMessage(ws: WebSocket | null, topic: string, messageObj: any) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const payloadStr = JSON.stringify(messageObj);
  const topicBytes = stringToUtf8(topic);
  const payloadBytes = stringToUtf8(payloadStr);
  
  const remainingLen = 2 + topicBytes.length + payloadBytes.length;
  const lenBytes = encodeRemainingLength(remainingLen);
  
  const packet = new Uint8Array(1 + lenBytes.length + remainingLen);
  let pos = 0;
  packet[pos++] = 0x30; // PUBLISH (QoS 0)
  
  for (let i = 0; i < lenBytes.length; i++) {
    packet[pos++] = lenBytes[i];
  }
  
  packet[pos++] = (topicBytes.length >> 8) & 0xff;
  packet[pos++] = topicBytes.length & 0xff;
  
  packet.set(topicBytes, pos);
  pos += topicBytes.length;
  
  packet.set(payloadBytes, pos);
  
  ws.send(packet);
}

function sendMqttConnect(ws: WebSocket, clientId: string) {
  const protocolName = "MQTT";
  const payloadLen = 2 + clientId.length;
  const variableHeaderLen = 10;
  const remainingLen = variableHeaderLen + payloadLen;
  const lenBytes = encodeRemainingLength(remainingLen);
  
  const packet = new Uint8Array(1 + lenBytes.length + remainingLen);
  let pos = 0;
  packet[pos++] = 0x10; // CONNECT
  
  for (let i = 0; i < lenBytes.length; i++) {
    packet[pos++] = lenBytes[i];
  }
  
  packet[pos++] = 0x00;
  packet[pos++] = 0x04;
  packet[pos++] = 0x4d; // M
  packet[pos++] = 0x51; // Q
  packet[pos++] = 0x54; // T
  packet[pos++] = 0x54; // T
  
  packet[pos++] = 0x04; // Level
  packet[pos++] = 0x02; // Flags (Clean session)
  packet[pos++] = 0x00;
  packet[pos++] = 0x3c; // Keepalive (60s)
  
  packet[pos++] = (clientId.length >> 8) & 0xff;
  packet[pos++] = clientId.length & 0xff;
  
  const idBytes = stringToUtf8(clientId);
  packet.set(idBytes, pos);
  
  ws.send(packet);
}

function sendMqttSubscribe(ws: WebSocket, topic: string) {
  const topicBytes = stringToUtf8(topic);
  const remainingLen = 2 + 2 + topicBytes.length + 1;
  const lenBytes = encodeRemainingLength(remainingLen);
  
  const packet = new Uint8Array(1 + lenBytes.length + remainingLen);
  let pos = 0;
  packet[pos++] = 0x82; // SUBSCRIBE
  
  for (let i = 0; i < lenBytes.length; i++) {
    packet[pos++] = lenBytes[i];
  }
  
  packet[pos++] = 0x00;
  packet[pos++] = 0x01; // Msg ID
  
  packet[pos++] = (topicBytes.length >> 8) & 0xff;
  packet[pos++] = topicBytes.length & 0xff;
  
  packet.set(topicBytes, pos);
  pos += topicBytes.length;
  
  packet[pos++] = 0x00; // QoS 0
  
  ws.send(packet);
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [guestMode, setGuestMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Auth state
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);

  const playerRef = useRef<AudioPlayer | null>(null);
  const statusSubscriptionRef = useRef<any>(null);
  const isSeeking = useRef(false);

  // Group Listening Room states
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const currentTrackRef = useRef<Track | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const progressRef = useRef<number>(0);
  const userRef = useRef<any>(null);
  const queueRef = useRef<Track[]>([]);
  const queueIndexRef = useRef<number>(-1);
  const durationRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);
  const consecutiveErrors = useRef<number>(0);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  const broadcastMessage = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && roomId) {
      const codeLower = roomId.toLowerCase();
      sendMqttMessage(wsRef.current, `rohibeatz_room_${codeLower}`, msg);
    }
  };

  // Load user session on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("rohibeatz_session");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          setGuestMode(false);
        }
      } catch (e) {
        console.error("Check session failed:", e);
      }
    };
    checkSession();
  }, []);

  // Reload playlists and recent searches whenever the user profile changes (scopes data)
  useEffect(() => {
    loadPlaylists();
    loadRecentSearches();
  }, [user]);

  // Initialize Audio Mode for Background Playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn("Failed to set audio mode:", e);
      }
    };
    setupAudio();
    loadPlaylists();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Sync Progress updates from Sound object
  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) {
      if (status.error) {
        setPlaybackError(`Status error: ${status.error}`);
      }
      return;
    }

    if (status.isPlaying !== isPlayingRef.current) {
      setIsPlaying(status.isPlaying);
    }
    if (status.isBuffering !== isLoadingRef.current) {
      setIsLoading(status.isBuffering);
    }

    if (status.durationMillis) {
      const newDuration = Math.floor(status.durationMillis / 1000);
      if (durationRef.current !== newDuration) {
        setDuration(newDuration);
      }
    }

    if (!isSeeking.current && status.positionMillis !== undefined) {
      const newProgress = Math.floor(status.positionMillis / 1000);
      if (progressRef.current !== newProgress) {
        setProgress(newProgress);
      }
    }

    // Auto-advance track on ended
    if (status.didJustFinish) {
      playNext();
    }
  };

  // Resolve media stream URL and play using expo-av
  const playTrack = async (track: Track, newQueue: Track[] = [], index = -1, shouldBroadcast = true) => {
    setPlaybackError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTrack(track);

    if (newQueue.length > 0) {
      setQueue(newQueue);
      setQueueIndex(index !== -1 ? index : newQueue.findIndex((t) => t.id === track.id));
    }

    if (shouldBroadcast) {
      broadcastMessage({
        action: "play",
        track,
        isPlaying: true,
        progress: 0,
        timestamp: Date.now()
      });
    }

    try {
      // Unload previous track
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Use direct streamUrl if available (e.g. from JioSaavn)
      let streamUrl = track.streamUrl || "";
      
      if (!streamUrl) {
        // Fallback: Fetch streaming URL from Invidious
        let attempts = 0;
        let videoId = track.id; // Search query matches videoId or we look it up

        while (attempts < INVIDIOUS_INSTANCES.length) {
          const instance = getActiveInstance();
          try {
            if (!videoId.startsWith("yt_") && videoId.length !== 11) {
              // Need to lookup videoId first
              const query = encodeURIComponent(`${track.name} ${track.artists[0]?.name || ""} audio`);
              const searchRes = await fetchWithTimeout(`${instance}/api/v1/search?q=${query}&type=video`, { timeout: 3000 });
              if (!searchRes.ok) throw new Error("Search query failed");
              const searchData = await searchRes.json();
              if (searchData.length === 0) throw new Error("No video results");
              videoId = searchData[0].videoId;
            }

            streamUrl = `${instance}/latest_version?id=${videoId}&itag=140&local=true`;
            
            // Test fetch with a HEAD request to see if stream link is valid
            const headRes = await fetchWithTimeout(streamUrl, { method: "HEAD", timeout: 3000 });
            if (!headRes.ok) throw new Error("Stream invalid");
            break;
          } catch (err) {
            console.warn(`Instance failed during playback resolver: ${instance}`);
            rotateInstance();
            attempts++;
          }
        }
      }

      if (!streamUrl) {
        throw new Error("Unable to resolve a working media stream. Servers busy.");
      }

      // Load and play audio (Update status once per second to save battery)
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 1000 },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoading(false);
      consecutiveErrors.current = 0; // Reset consecutive errors on successful play
    } catch (err: any) {
      console.error("Playback error:", err);
      setPlaybackError(err.message || "Failed to load audio stream.");
      setIsLoading(false);
      
      // Auto skip to next after delay if error occurs, but limit to 3 errors to prevent data/battery loops
      consecutiveErrors.current += 1;
      if (consecutiveErrors.current < 3) {
        setTimeout(() => {
          playNext();
        }, 2000);
      } else {
        console.warn("Too many consecutive playback errors. Autoplay stopped.");
        setPlaybackError("Autoplay stopped due to consecutive connection errors.");
      }
    }
  };

  const togglePlay = async (shouldBroadcast = true) => {
    if (!soundRef.current || !currentTrack) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        if (shouldBroadcast) {
          broadcastMessage({
            action: "pause",
            timestamp: Date.now()
          });
        }
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        if (shouldBroadcast) {
          broadcastMessage({
            action: "play",
            track: currentTrack,
            isPlaying: true,
            progress: progress,
            timestamp: Date.now()
          });
        }
      }
    } catch (e) {
      console.error("Toggle play failed:", e);
    }
  };

  const playNext = async () => {
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    if (currentQueue.length === 0 || currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % currentQueue.length;
    await playTrack(currentQueue[nextIndex], currentQueue, nextIndex);
  };

  const playPrevious = async () => {
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    if (currentQueue.length === 0 || currentIndex === -1) return;
    if (progressRef.current > 3) {
      await seekTo(0);
      return;
    }
    const prevIndex = currentIndex === 0 ? currentQueue.length - 1 : currentIndex - 1;
    await playTrack(currentQueue[prevIndex], currentQueue, prevIndex);
  };

  const seekTo = async (seconds: number, shouldBroadcast = true) => {
    if (!soundRef.current) return;
    try {
      isSeeking.current = true;
      setProgress(seconds);
      await soundRef.current.setPositionAsync(seconds * 1000);
      isSeeking.current = false;

      if (shouldBroadcast) {
        broadcastMessage({
          action: "seek",
          progress: seconds,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error("Seek failed:", e);
      isSeeking.current = false;
    }
  };

  const addToQueue = (track: Track) => {
    const updatedQueue = [...queue, track];
    setQueue(updatedQueue);
    if (queue.length === 0 || queueIndex === -1) {
      setQueueIndex(0);
      playTrack(track, updatedQueue, 0);
    }
  };

  // Room WebSocket Logic
  const connectToRoom = (code: string, asHost: boolean) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const codeLower = code.toLowerCase();
    console.log(`Connecting to MQTT room via HiveMQ: ${MQTT_BROKER} (topic: rohibeatz_room_${codeLower})`);
    
    const ws = new WebSocket(MQTT_BROKER, "mqtt");
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket opened. Sending MQTT CONNECT...");
      const clientId = "rohibeatz_mobile_" + Math.random().toString(36).substring(2, 7);
      sendMqttConnect(ws, clientId);
    };

    ws.onmessage = async (event) => {
      try {
        if (!(event.data instanceof ArrayBuffer)) {
          console.warn("Expected ArrayBuffer data from MQTT broker, got:", typeof event.data);
          return;
        }
        
        const bytes = new Uint8Array(event.data);
        const header = bytes[0];
        
        if (header === 0x20) {
          console.log("CONNACK received. Subscribing to topic...");
          sendMqttSubscribe(ws, `rohibeatz_room_${codeLower}`);
          
          setRoomId(code);
          setIsHost(asHost);
          const username = userRef.current?.username || "Guest";
          
          if (asHost) {
            setRoomUsers([username]);
          } else {
            sendMqttMessage(ws, `rohibeatz_room_${codeLower}`, {
              action: "join",
              username
            });
          }
        }
        else if (header === 0x90) {
          console.log("SUBACK received. Room sync connection established.");
        }
        else if ((header & 0xf0) === 0x30) {
          // PUBLISH message received
          const { value: remainingLen, lengthBytes: varLenBytes } = decodeRemainingLength(bytes, 1);
          const startOfTopic = 1 + varLenBytes;
          const topicLen = (bytes[startOfTopic] << 8) | bytes[startOfTopic + 1];
          
          const payloadStart = startOfTopic + 2 + topicLen;
          const payloadBytes = bytes.slice(payloadStart);
          const payloadStr = utf8ToString(payloadBytes);
          
          const data = JSON.parse(payloadStr);
          console.log("MQTT action received:", data.action, data);

          switch (data.action) {
            case "join":
              if (asHost) {
                setRoomUsers((prev) => {
                  const updated = prev.includes(data.username) ? prev : [...prev, data.username];
                  sendMqttMessage(ws, `rohibeatz_room_${codeLower}`, {
                    action: "sync",
                    track: currentTrackRef.current,
                    isPlaying: isPlayingRef.current,
                    progress: progressRef.current,
                    users: updated,
                    timestamp: Date.now()
                  });
                  return updated;
                });
              }
              break;

            case "sync":
              if (!asHost) {
                if (data.users) {
                  setRoomUsers(data.users);
                }
                if (data.track) {
                  const latency = data.timestamp ? (Date.now() - data.timestamp) / 1000 : 0;
                  const targetPos = data.progress + (data.isPlaying ? latency : 0);
                  
                  if (!currentTrackRef.current || currentTrackRef.current.id !== data.track.id) {
                    await playTrack(data.track, [data.track], 0, false);
                    await seekTo(targetPos, false);
                  } else {
                    if (Math.abs(progressRef.current - targetPos) > 2) {
                      await seekTo(targetPos, false);
                    }
                  }

                  if (soundRef.current) {
                    if (data.isPlaying && !isPlayingRef.current) {
                      await soundRef.current.playAsync();
                      setIsPlaying(true);
                    } else if (!data.isPlaying && isPlayingRef.current) {
                      await soundRef.current.pauseAsync();
                      setIsPlaying(false);
                    }
                  }
                }
              }
              break;

            case "play":
              if (!asHost) {
                if (data.track) {
                  const latency = data.timestamp ? (Date.now() - data.timestamp) / 1000 : 0;
                  const targetPos = (data.progress || 0) + latency;
                  
                  if (!currentTrackRef.current || currentTrackRef.current.id !== data.track.id) {
                    await playTrack(data.track, [data.track], 0, false);
                    if (targetPos > 0) {
                      await seekTo(targetPos, false);
                    }
                  } else {
                    if (Math.abs(progressRef.current - targetPos) > 2) {
                      await seekTo(targetPos, false);
                    }
                    if (soundRef.current && !isPlayingRef.current) {
                      await soundRef.current.playAsync();
                      setIsPlaying(true);
                    }
                  }
                }
              }
              break;

            case "pause":
              if (!asHost) {
                if (soundRef.current && isPlayingRef.current) {
                  await soundRef.current.pauseAsync();
                  setIsPlaying(false);
                }
              }
              break;

            case "seek":
              if (!asHost) {
                const latency = data.timestamp ? (Date.now() - data.timestamp) / 1000 : 0;
                const targetPos = data.progress + latency;
                await seekTo(targetPos, false);
              }
              break;

            case "leave":
              setRoomUsers((prev) => prev.filter((u) => u !== data.username));
              break;

            default:
              break;
          }
        }
      } catch (err) {
        console.error("Error processing WebSocket/MQTT event:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setRoomId(null);
      setRoomUsers([]);
      setIsHost(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  };

  const createRoom = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    connectToRoom(code, true);
  };

  const joinRoom = (code: string) => {
    if (!code || code.trim().length !== 6) return;
    connectToRoom(code.toUpperCase().trim(), false);
  };

  const leaveRoom = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN && roomId) {
        const codeLower = roomId.toLowerCase();
        sendMqttMessage(wsRef.current, `rohibeatz_room_${codeLower}`, {
          action: "leave",
          username: userRef.current?.username || "Guest"
        });
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setRoomId(null);
    setRoomUsers([]);
    setIsHost(false);
  };

  // Local Playlists Manager
  const loadRecentSearches = async () => {
    try {
      const key = user ? `rohibeatz_recent_searches_${user.email}` : "rohibeatz_recent_searches";
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      } else {
        setRecentSearches([]);
      }
    } catch (e) {
      console.error("Load recent searches failed:", e);
    }
  };

  const saveRecentSearches = async (updated: string[]) => {
    try {
      const key = user ? `rohibeatz_recent_searches_${user.email}` : "rohibeatz_recent_searches";
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {
      console.error("Save recent searches failed:", e);
    }
  };

  const addToRecentSearches = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const filtered = recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 10);
    await saveRecentSearches(updated);
  };

  const removeRecentSearch = async (query: string) => {
    const updated = recentSearches.filter((s) => s !== query);
    await saveRecentSearches(updated);
  };

  const clearRecentSearches = async () => {
    await saveRecentSearches([]);
  };

  // Local Playlists Manager
  const loadPlaylists = async () => {
    try {
      const key = user ? `rohibeatz_playlists_${user.email}` : "rohibeatz_playlists";
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setPlaylists(JSON.parse(stored));
      } else {
        setPlaylists([]); // Clear if no playlist
      }
    } catch (e) {
      console.error("Load playlists failed:", e);
    }
  };

  const savePlaylists = async (updated: Playlist[]) => {
    try {
      const key = user ? `rohibeatz_playlists_${user.email}` : "rohibeatz_playlists";
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setPlaylists(updated);
    } catch (e) {
      console.error("Save playlists failed:", e);
    }
  };

  const createPlaylist = async (name: string, initialTrack?: Track) => {
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      name,
      tracks: initialTrack ? [initialTrack] : []
    };
    await savePlaylists([...playlists, newPlaylist]);
  };

  const deletePlaylist = async (id: string) => {
    const updated = playlists.filter((p) => p.id !== id);
    await savePlaylists(updated);
  };

  const addTrackToPlaylist = async (playlistId: string, track: Track) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        // Prevent duplicate songs
        if (p.tracks.some((t) => t.id === track.id)) return p;
        return { ...p, tracks: [...p.tracks, track] };
      }
      return p;
    });
    await savePlaylists(updated);
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
      }
      return p;
    });
    await savePlaylists(updated);
  };

  // Free Search Implementation via Hybrid JioSaavn & Invidious Concurrent Resolver
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    let saavnTracks: Track[] = [];
    let invidiousTracks: Track[] = [];

    // 1. Query JioSaavn (Fast, high-quality streams)
    const saavnPromise = (async () => {
      try {
        let json;
        try {
          const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
          if (res.ok) json = await res.json();
        } catch (e) {
          console.warn("saavn.dev search failed, trying backup");
        }

        if (!json || !json.success) {
          const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}`);
          if (res.ok) json = await res.json();
        }

        if (json && json.success && json.data?.results?.length > 0) {
          saavnTracks = json.data.results.map((item: any) => {
            const streams = item.downloadUrl || [];
            const bestStream = streams.find((s: any) => s.quality === "160kbps") || 
                               streams.find((s: any) => s.quality === "120kbps") || 
                               streams.find((s: any) => s.quality === "320kbps") || 
                               streams.find((s: any) => s.quality === "96kbps") || 
                               streams[streams.length - 1] || 
                               { url: "" };

            const images = item.image || [];
            const bestImage = images.find((img: any) => img.quality === "500x500") || 
                              images.find((img: any) => img.quality === "150x150") || 
                              images[images.length - 1] || 
                              { url: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300" };

            return {
              id: `saavn_${item.id}`,
              name: item.name,
              artists: item.artists?.primary?.length > 0 
                ? item.artists.primary.map((a: any) => ({ name: a.name })) 
                : [{ name: item.label || "Unknown Artist" }],
              album: {
                name: item.album?.name || "JioSaavn",
                images: [{ url: bestImage.url }]
              },
              duration_ms: (item.duration || 180) * 1000,
              streamUrl: bestStream.url
            };
          });
        }
      } catch (err) {
        console.warn("Saavn search query failed:", err);
      }
    })();

    // 2. Query Invidious/YouTube Music concurrently (completeness index)
    const invidiousPromise = (async () => {
      let attempts = 0;
      while (attempts < 2) { // Query the top 2 fast Invidious instances
        const instance = INVIDIOUS_INSTANCES[attempts];
        try {
          const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
          const res = await fetchWithTimeout(url, { timeout: 3000 });
          if (!res.ok) throw new Error("Search request failed");
          
          const data = await res.json();
          invidiousTracks = data.slice(0, 8).map((item: any) => ({
            id: item.videoId,
            name: item.title,
            artists: [{ name: item.author }],
            album: {
              name: "YouTube Music",
              images: [{ url: item.videoThumbnails?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300" }]
            },
            duration_ms: (item.lengthSeconds || 200) * 1000
          }));
          break;
        } catch (err) {
          console.warn(`Invidious failed during concurrent search: ${instance}`);
          attempts++;
        }
      }
    })();

    // Wait for both searches to finish (or time out)
    await Promise.allSettled([saavnPromise, invidiousPromise]);

    // Merge results, prioritizing JioSaavn (direct streams) and adding Invidious for catalog completeness
    const merged = [...saavnTracks, ...invidiousTracks];
    const seen = new Set<string>();
    const deduplicated = merged.filter(track => {
      const nameKey = track.name.toLowerCase().replace(/[^\w\s]/gi, "").trim();
      const artistKey = track.artists[0]?.name.toLowerCase().replace(/[^\w\s]/gi, "").trim() || "";
      const key = `${nameKey}_${artistKey}`;
      
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setSearchResults(deduplicated);
    setIsSearching(false);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const storedUsers = await AsyncStorage.getItem("rohibeatz_users");
      const usersList = storedUsers ? JSON.parse(storedUsers) : [];
      
      const found = usersList.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (found) {
        const sessionUser = { username: found.username, email: found.email };
        await AsyncStorage.setItem("rohibeatz_session", JSON.stringify(sessionUser));
        setUser(sessionUser);
        setGuestMode(false);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const storedUsers = await AsyncStorage.getItem("rohibeatz_users");
      const usersList = storedUsers ? JSON.parse(storedUsers) : [];
      
      if (usersList.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        console.warn("User already exists");
        return false;
      }
      
      const newUser = { username, email, password };
      const updatedList = [...usersList, newUser];
      await AsyncStorage.setItem("rohibeatz_users", JSON.stringify(updatedList));
      
      // Auto log in after registration
      const sessionUser = { username, email };
      await AsyncStorage.setItem("rohibeatz_session", JSON.stringify(sessionUser));
      setUser(sessionUser);
      setGuestMode(false);
      return true;
    } catch (e) {
      console.error("Registration failed:", e);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("rohibeatz_session");
      setUser(null);
      setGuestMode(true);
      // Unload active sound when signing out
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setCurrentTrack(null);
      setIsPlaying(false);
      setProgress(0);
      setQueue([]);
      setQueueIndex(-1);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        playbackError,
        progress,
        duration,
        queue,
        queueIndex,
        playlists,
        guestMode,
        searchQuery,
        searchResults,
        isSearching,
        user,
        setSearchQuery,
        playTrack,
        togglePlay,
        playNext,
        playPrevious,
        seekTo,
        createPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        setGuestMode,
        performSearch,
        login,
        register,
        logout,
        addToQueue,
        roomId,
        roomUsers,
        isHost,
        createRoom,
        joinRoom,
        leaveRoom,
        recentSearches,
        addToRecentSearches,
        removeRecentSearch,
        clearRecentSearches
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
};
