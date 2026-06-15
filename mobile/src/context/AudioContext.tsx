import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Audio } from "expo-av";
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
  
  // Auth state
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
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

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Load user session on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("aurastream_session");
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

  // Reload playlists whenever the user profile changes (scopes data)
  useEffect(() => {
    loadPlaylists();
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

    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);

    if (status.durationMillis) {
      setDuration(status.durationMillis / 1000);
    }

    if (!isSeeking.current && status.positionMillis !== undefined) {
      setProgress(status.positionMillis / 1000);
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

    if (shouldBroadcast && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "play",
        track,
        isPlaying: true,
        progress: 0,
        timestamp: Date.now()
      }));
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

      // Load and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Playback error:", err);
      setPlaybackError(err.message || "Failed to load audio stream.");
      setIsLoading(false);
      
      // Auto skip to next after delay if error occurs
      setTimeout(() => {
        playNext();
      }, 2000);
    }
  };

  const togglePlay = async (shouldBroadcast = true) => {
    if (!soundRef.current || !currentTrack) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        if (shouldBroadcast && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            action: "pause",
            timestamp: Date.now()
          }));
        }
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        if (shouldBroadcast && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            action: "play",
            track: currentTrack,
            isPlaying: true,
            progress: progress,
            timestamp: Date.now()
          }));
        }
      }
    } catch (e) {
      console.error("Toggle play failed:", e);
    }
  };

  const playNext = async () => {
    if (queue.length === 0 || queueIndex === -1) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    await playTrack(queue[nextIndex], queue, nextIndex);
  };

  const playPrevious = async () => {
    if (queue.length === 0 || queueIndex === -1) return;
    if (progress > 3) {
      await seekTo(0);
      return;
    }
    const prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    await playTrack(queue[prevIndex], queue, prevIndex);
  };

  const seekTo = async (seconds: number, shouldBroadcast = true) => {
    if (!soundRef.current) return;
    try {
      isSeeking.current = true;
      setProgress(seconds);
      await soundRef.current.setPositionAsync(seconds * 1000);
      isSeeking.current = false;

      if (shouldBroadcast && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: "seek",
          progress: seconds,
          timestamp: Date.now()
        }));
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

    const wsUrl = `wss://free.piesocket.com/v3/aurastream_room_${code}?api_key=VCbEZPAgoj7cw1oTvzb658HOp9twm2VJCM6u5X3D`;
    console.log(`Connecting to room: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setRoomId(code);
      setIsHost(asHost);
      const username = userRef.current?.username || "Guest";
      
      if (asHost) {
        setRoomUsers([username]);
      } else {
        ws.send(JSON.stringify({
          action: "join",
          username
        }));
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message:", data);

        switch (data.action) {
          case "join":
            if (asHost) {
              setRoomUsers((prev) => {
                const updated = prev.includes(data.username) ? prev : [...prev, data.username];
                ws.send(JSON.stringify({
                  action: "sync",
                  track: currentTrackRef.current,
                  isPlaying: isPlayingRef.current,
                  progress: progressRef.current,
                  users: updated,
                  timestamp: Date.now()
                }));
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
      } catch (err) {
        console.error("Error processing WebSocket event:", err);
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
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: "leave",
          username: userRef.current?.username || "Guest"
        }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setRoomId(null);
    setRoomUsers([]);
    setIsHost(false);
  };

  // Local Playlists Manager
  const loadPlaylists = async () => {
    try {
      const key = user ? `aurastream_playlists_${user.email}` : "aurastream_playlists";
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
      const key = user ? `aurastream_playlists_${user.email}` : "aurastream_playlists";
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
            const bestStream = streams.find((s: any) => s.quality === "320kbps") || 
                               streams.find((s: any) => s.quality === "160kbps") || 
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
      const storedUsers = await AsyncStorage.getItem("aurastream_users");
      const usersList = storedUsers ? JSON.parse(storedUsers) : [];
      
      const found = usersList.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (found) {
        const sessionUser = { username: found.username, email: found.email };
        await AsyncStorage.setItem("aurastream_session", JSON.stringify(sessionUser));
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
      const storedUsers = await AsyncStorage.getItem("aurastream_users");
      const usersList = storedUsers ? JSON.parse(storedUsers) : [];
      
      if (usersList.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        console.warn("User already exists");
        return false;
      }
      
      const newUser = { username, email, password };
      const updatedList = [...usersList, newUser];
      await AsyncStorage.setItem("aurastream_users", JSON.stringify(updatedList));
      
      // Auto log in after registration
      const sessionUser = { username, email };
      await AsyncStorage.setItem("aurastream_session", JSON.stringify(sessionUser));
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
      await AsyncStorage.removeItem("aurastream_session");
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
        leaveRoom
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
