import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  getProfile,
  getUserPlaylists,
  getFeaturedPlaylists,
  getNewReleases,
  getAccessToken,
  getRefreshToken
} from "./spotify";
import { searchAndGetAudioStream } from "./audioProvider";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const SpotifyContext = createContext();

// Global set to keep track of token exchange codes in progress to prevent duplicate requests
const exchangingCodes = new Set();

export const SpotifyProvider = ({ children }) => {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem("spotify_token") || null);
  const [user, setUser] = useState(null);
  const [clientId, setClientIdState] = useState(localStorage.getItem("spotify_client_id") || "");
  const [authStatus, setAuthStatus] = useState("");
  const [apiError, setApiError] = useState(null);

  // Navigation / Views
  const [view, setView] = useState("home"); // 'home', 'search', 'playlist', 'album', 'artist'
  const [viewId, setViewId] = useState(null);
  const [history, setHistory] = useState(["home"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Music Metadata state
  const [playlists, setPlaylists] = useState([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [volume, setVolume] = useState(parseFloat(localStorage.getItem("spotify_volume")) || 0.5);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(null);

  // HTML5 Audio Reference
  const audioRef = useRef(new Audio());

  // Group Listening Room states
  const [roomId, setRoomId] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const wsRef = useRef(null);

  const currentTrackRef = useRef(null);
  const isPlayingRef = useRef(false);
  const progressRef = useRef(0);
  const userRef = useRef(null);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Set initial volume
  useEffect(() => {
    audioRef.current.volume = volume;
  }, []);

  // Sync volume state with audio element
  const changeVolume = (newVolume) => {
    const vol = Math.max(0, Math.min(1, newVolume));
    setVolume(vol);
    audioRef.current.volume = vol;
    localStorage.setItem("spotify_volume", vol);
  };

  // Navigating views with history support
  const navigateTo = (newView, id = null) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(id ? `${newView}:${id}` : newView);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setView(newView);
    setViewId(id);
  };

  const navigateBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const [prevView, id] = history[prevIndex].split(":");
      setView(prevView);
      setViewId(id || null);
    }
  };

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const [nextView, id] = history[nextIndex].split(":");
      setView(nextView);
      setViewId(id || null);
    }
  };

  // Handle OAuth PKCE Token Retrieval on Load
  useEffect(() => {
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    if (isNative) return; // Native app handles this via deep link listeners below

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code && clientId) {
      if (exchangingCodes.has(code)) {
        console.log("Token exchange already in progress for this code:", code);
        return;
      }
      exchangingCodes.add(code);

      // Clear query params immediately so the URL is clean
      window.history.replaceState({}, document.title, window.location.pathname);

      const exchangeCode = async () => {
        try {
          setIsLoading(true);
          setAuthStatus("Connecting to Spotify...");
          const data = await getAccessToken(clientId, code);
          setToken(data.access_token);
          localStorage.setItem("spotify_token", data.access_token);
          if (data.refresh_token) {
            localStorage.setItem("spotify_refresh_token", data.refresh_token);
          }
          const expiresAt = Date.now() + data.expires_in * 1000;
          localStorage.setItem("spotify_expires_at", expiresAt.toString());
          setAuthStatus("");
          setApiError(null);
          navigateTo("home");
        } catch (err) {
          console.error("Token exchange failed:", err);
          setAuthStatus("Authentication failed: " + err.message);
          exchangingCodes.delete(code); // Allow retry on failure
        } finally {
          setIsLoading(false);
        }
      };

      exchangeCode();
    }
  }, [clientId]);

  // Token Background Auto-Refresher
  useEffect(() => {
    if (!token || !clientId) return;

    const checkAndRefreshToken = async () => {
      const refreshToken = localStorage.getItem("spotify_refresh_token");
      const expiresAt = parseInt(localStorage.getItem("spotify_expires_at") || "0");

      if (refreshToken && expiresAt && Date.now() > expiresAt - 300000) {
        try {
          console.log("Token expiring soon, refreshing in background...");
          const data = await getRefreshToken(clientId, refreshToken);
          setToken(data.access_token);
          localStorage.setItem("spotify_token", data.access_token);
          if (data.refresh_token) {
            localStorage.setItem("spotify_refresh_token", data.refresh_token);
          }
          const nextExpiresAt = Date.now() + data.expires_in * 1000;
          localStorage.setItem("spotify_expires_at", nextExpiresAt.toString());
        } catch (err) {
          console.error("Background token refresh failed:", err);
        }
      }
    };

    const interval = setInterval(checkAndRefreshToken, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [token, clientId]);

  // Native App Deep Link URL Listener & Launch URL checker
  useEffect(() => {
    if (!clientId) return;

    const handleDeepLink = async (event) => {
      if (!event || !event.url) return;
      console.log("Deep link URL intercepted:", event.url);
      
      try {
        const url = new URL(event.url);
        const code = url.searchParams.get("code");

        if (code) {
          if (exchangingCodes.has(code)) {
            console.log("Deep link token exchange already in progress, skipping duplicate call:", code);
            return;
          }
          exchangingCodes.add(code);

          setAuthStatus("Exchanging authorization code...");
          // Explicitly close the native Chrome Custom Tab overlay sheet
          try {
            await Browser.close();
          } catch (e) {
            console.log("Browser already closed:", e);
          }

          setIsLoading(true);
          const data = await getAccessToken(clientId, code);
          setToken(data.access_token);
          localStorage.setItem("spotify_token", data.access_token);
          if (data.refresh_token) {
            localStorage.setItem("spotify_refresh_token", data.refresh_token);
          }
          const expiresAt = Date.now() + data.expires_in * 1000;
          localStorage.setItem("spotify_expires_at", expiresAt.toString());
          setAuthStatus("");
          setApiError(null);
          navigateTo("home");
        }
      } catch (err) {
        console.error("Failed to process deep link login:", err);
        setAuthStatus("Failed: " + err.message);
        // Clear lock on failure
        const url = new URL(event.url);
        const code = url.searchParams.get("code");
        if (code) exchangingCodes.delete(code);
      } finally {
        setIsLoading(false);
      }
    };

    // 1. Listen for background deep links (when app is already running)
    let sub;
    const registerListener = async () => {
      sub = await App.addListener("appUrlOpen", handleDeepLink);
    };
    registerListener();

    // 2. Check launch URL (when app was closed and opened fresh by the deep link)
    const checkLaunchUrl = async () => {
      try {
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl && launchUrl.url) {
          console.log("App started by launch URL:", launchUrl.url);
          handleDeepLink(launchUrl);
        }
      } catch (err) {
        console.error("Failed to read launch URL:", err);
      }
    };
    checkLaunchUrl();

    return () => {
      if (sub) {
        sub.remove();
      }
    };
  }, [clientId]);

  // Fetch initial profile & metadata when token is present
  useEffect(() => {
    if (!token) return;

    const fetchInitialData = async () => {
      try {
        setApiError(null);
        setIsLoading(true);
        const profile = await getProfile(token);
        setUser(profile);

        const playlistsData = await getUserPlaylists(token);
        setPlaylists(playlistsData.items || []);

        const featured = await getFeaturedPlaylists(token);
        setFeaturedPlaylists(featured.playlists?.items || []);

        const releases = await getNewReleases(token);
        setNewReleases(releases.albums?.items || []);
      } catch (err) {
        console.error("Error loading initial Spotify data:", err);
        setApiError(err.message || "Failed to load initial Spotify data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [token]);

  // Audio Playback Listeners
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      playNext();
    };

    const handleError = (e) => {
      console.error("Audio error event:", e);
      if (audio.src) {
        setPlaybackError("Failed to play audio. Retrying next song...");
        setTimeout(() => {
          playNext();
        }, 2000);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [queue, queueIndex]);

  // Play a specific track
  const playTrack = async (track, newQueue = [], index = -1, shouldBroadcast = true) => {
    if (!track) return;
    
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
      const artistName = track.artists ? track.artists[0].name : "Unknown Artist";
      const streamInfo = await searchAndGetAudioStream(track.name, artistName);
      
      audioRef.current.src = streamInfo.streamUrl;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error("Play request interrupted:", err);
            setIsLoading(false);
            setPlaybackError("Playback interrupted by browser. Tap Play to resume.");
          });
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setIsLoading(false);
      setPlaybackError(err.message || "Failed to search audio stream.");
    }
  };

  // Toggle Play / Pause
  const togglePlay = (shouldBroadcast = true) => {
    if (!currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (shouldBroadcast && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: "pause",
          timestamp: Date.now()
        }));
      }
    } else {
      audioRef.current.play()
        .then(() => {
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
        })
        .catch(err => {
          console.error("Error resuming playback:", err);
          if (currentTrack) playTrack(currentTrack, [], -1, shouldBroadcast);
        });
    }
  };

  // Skip to next track
  const playNext = () => {
    if (queue.length === 0 || queueIndex === -1) return;
    const nextIndex = (queueIndex + 1) % queue.length;
    playTrack(queue[nextIndex], queue, nextIndex);
  };

  // Skip to previous track
  const playPrevious = () => {
    if (queue.length === 0 || queueIndex === -1) return;
    
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }

    const prevIndex = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    playTrack(queue[prevIndex], queue, prevIndex);
  };

  // Seek progress
  const seekTo = (seconds, shouldBroadcast = true) => {
    if (!currentTrack) return;
    audioRef.current.currentTime = seconds;
    setProgress(seconds);
    if (shouldBroadcast && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "seek",
        progress: seconds,
        timestamp: Date.now()
      }));
    }
  };

  // Logout helper
  const logout = () => {
    setToken(null);
    setUser(null);
    setPlaylists([]);
    setApiError(null);
    localStorage.removeItem("spotify_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_expires_at");
    audioRef.current.pause();
    audioRef.current.src = "";
    setCurrentTrack(null);
    setIsPlaying(false);
    setView("home");
  };

  // Save new Client ID
  const updateClientId = (id) => {
    setClientIdState(id);
    localStorage.setItem("spotify_client_id", id.trim());
  };

  const addToQueue = (track) => {
    const updatedQueue = [...queue, track];
    setQueue(updatedQueue);
    if (queue.length === 0 || queueIndex === -1) {
      setQueueIndex(0);
      playTrack(track, updatedQueue, 0);
    }
  };

  // Room WebSocket Logic
  const connectToRoom = (code, asHost) => {
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
      const username = userRef.current?.display_name || userRef.current?.id || "Web Guest";
      
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
                  seekTo(targetPos, false);
                } else {
                  if (Math.abs(progressRef.current - targetPos) > 2) {
                    seekTo(targetPos, false);
                  }
                }

                if (data.isPlaying && !isPlayingRef.current) {
                  audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => console.error("Sync play failed", e));
                } else if (!data.isPlaying && isPlayingRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
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
                    seekTo(targetPos, false);
                  }
                } else {
                  if (Math.abs(progressRef.current - targetPos) > 2) {
                    seekTo(targetPos, false);
                  }
                  if (!isPlayingRef.current) {
                    audioRef.current.play()
                      .then(() => setIsPlaying(true))
                      .catch(e => console.error("Play transition failed", e));
                  }
                }
              }
            }
            break;

          case "pause":
            if (!asHost) {
              if (isPlayingRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
              }
            }
            break;

          case "seek":
            if (!asHost) {
              const latency = data.timestamp ? (Date.now() - data.timestamp) / 1000 : 0;
              const targetPos = data.progress + latency;
              seekTo(targetPos, false);
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

  const joinRoom = (code) => {
    if (!code || code.trim().length !== 6) return;
    connectToRoom(code.toUpperCase().trim(), false);
  };

  const leaveRoom = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        const username = userRef.current?.display_name || userRef.current?.id || "Web Guest";
        wsRef.current.send(JSON.stringify({
          action: "leave",
          username
        }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setRoomId(null);
    setRoomUsers([]);
    setIsHost(false);
  };

  return (
    <SpotifyContext.Provider
      value={{
        token,
        user,
        clientId,
        authStatus,
        setAuthStatus,
        apiError,
        setApiError,
        view,
        viewId,
        playlists,
        featuredPlaylists,
        newReleases,
        activePlaylist,
        setActivePlaylist,
        currentTrack,
        isPlaying,
        isLoading,
        playbackError,
        queue,
        queueIndex,
        volume,
        progress,
        duration,
        navigateTo,
        navigateBack,
        navigateForward,
        canGoBack: historyIndex > 0,
        canGoForward: historyIndex < history.length - 1,
        playTrack,
        togglePlay,
        playNext,
        playPrevious,
        seekTo,
        changeVolume,
        logout,
        updateClientId,
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
    </SpotifyContext.Provider>
  );
};

export const useSpotify = () => useContext(SpotifyContext);
