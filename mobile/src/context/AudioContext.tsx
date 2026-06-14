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
  playTrack: (track: Track, newQueue?: Track[], index?: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  setGuestMode: (val: boolean) => void;
  performSearch: (query: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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
  const [guestMode, setGuestMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isSeeking = useRef(false);

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
  const playTrack = async (track: Track, newQueue: Track[] = [], index = -1) => {
    setPlaybackError(null);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTrack(track);

    if (newQueue.length > 0) {
      setQueue(newQueue);
      setQueueIndex(index !== -1 ? index : newQueue.findIndex((t) => t.id === track.id));
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

  const togglePlay = async () => {
    if (!soundRef.current || !currentTrack) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
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

  const seekTo = async (seconds: number) => {
    if (!soundRef.current) return;
    try {
      isSeeking.current = true;
      setProgress(seconds);
      await soundRef.current.setPositionAsync(seconds * 1000);
      isSeeking.current = false;
    } catch (e) {
      console.error("Seek failed:", e);
      isSeeking.current = false;
    }
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

  const createPlaylist = async (name: string) => {
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}`,
      name,
      tracks: []
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
        const url = `https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data?.results?.length > 0) {
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
        logout
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
