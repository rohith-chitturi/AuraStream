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
}

const AudioContext = createContext<AudioContextProps | undefined>(undefined);

const INVIDIOUS_INSTANCES = [
  "https://invidious.flokinet.to",
  "https://invidious.nerdvpn.de",
  "https://invidious.yewtu.ch",
  "https://invidious.no-logs.com",
  "https://iv.melmac.space"
];

let activeInstanceIndex = 0;
const getActiveInstance = () => INVIDIOUS_INSTANCES[activeInstanceIndex];
const rotateInstance = () => {
  activeInstanceIndex = (activeInstanceIndex + 1) % INVIDIOUS_INSTANCES.length;
  console.log(`Rotating Invidious instance to: ${getActiveInstance()}`);
};

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

  const soundRef = useRef<Audio.Sound | null>(null);
  const isSeeking = useRef(false);

  // Initialize Audio Mode for Background Playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldRouteThroughEarpieceAndroid: false,
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

      // Fetch streaming URL from Invidious
      let streamUrl = "";
      let attempts = 0;
      let videoId = track.id; // Search query matches videoId or we look it up

      while (attempts < INVIDIOUS_INSTANCES.length) {
        const instance = getActiveInstance();
        try {
          if (!videoId.startsWith("yt_") && videoId.length !== 11) {
            // Need to lookup videoId first
            const query = encodeURIComponent(`${track.name} ${track.artists[0]?.name || ""} audio`);
            const searchRes = await fetch(`${instance}/api/v1/search?q=${query}&type=video`);
            if (!searchRes.ok) throw new Error("Search query failed");
            const searchData = await searchRes.json();
            if (searchData.length === 0) throw new Error("No video results");
            videoId = searchData[0].videoId;
          }

          streamUrl = `${instance}/latest_version?id=${videoId}&itag=140&local=true`;
          
          // Test fetch to see if stream link is valid
          const headRes = await fetch(streamUrl, { method: "HEAD" });
          if (!headRes.ok) throw new Error("Stream invalid");
          break;
        } catch (err) {
          console.warn(`Instance failed during playback resolver: ${instance}`);
          rotateInstance();
          attempts++;
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
      const stored = await AsyncStorage.getItem("aurastream_playlists");
      if (stored) {
        setPlaylists(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Load playlists failed:", e);
    }
  };

  const savePlaylists = async (updated: Playlist[]) => {
    try {
      await AsyncStorage.setItem("aurastream_playlists", JSON.stringify(updated));
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

  // Free Search Implementation via Invidious
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    let attempts = 0;
    
    while (attempts < INVIDIOUS_INSTANCES.length) {
      const instance = getActiveInstance();
      try {
        const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Search request failed");
        
        const data = await res.json();
        
        // Map Invidious JSON results into standard Track formatting
        const normalized: Track[] = data.map((item: any) => ({
          id: item.videoId,
          name: item.title,
          artists: [{ name: item.author }],
          album: {
            name: "YouTube Music",
            images: [{ url: item.videoThumbnails?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300" }]
          },
          duration_ms: (item.lengthSeconds || 200) * 1000
        }));

        setSearchResults(normalized);
        setIsSearching(false);
        return;
      } catch (err) {
        console.warn(`Instance search failed: ${instance}`);
        rotateInstance();
        attempts++;
      }
    }

    setSearchResults([]);
    setIsSearching(false);
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
        performSearch
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
