import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  ListMusic,
  Volume2,
  Heart,
  Repeat,
  Shuffle,
  Music,
} from "lucide-react-native";
import { useAudio, Track } from "@/context/AudioContext";
import { Colors } from "@/constants/theme";

const { width, height } = Dimensions.get("window");

interface PlayerViewProps {
  visible: boolean;
  onClose: () => void;
}

// Generates simulated lyrics based on song title
const getMockLyrics = (title: string, durationSec: number) => {
  const words = title.split(" ");
  const baseLines = [
    `Now listening to ${title}...`,
    "Feel the beat flow through your mind",
    "Aura Stream is taking you higher",
    "Lost in the sound of this rhythm",
    "Let the melodies guide your soul",
    "Every chord strikes a memory",
    "Riding the waves of the soundscape",
    "This is your Aura, your moment",
    "Floating in a digital dream",
    "Thank you for streaming with us!",
  ];

  const linesCount = Math.max(8, Math.floor(durationSec / 15));
  const lyrics: { time: number; text: string }[] = [];
  
  for (let i = 0; i < linesCount; i++) {
    const time = Math.floor((durationSec / linesCount) * i);
    const text = baseLines[i % baseLines.length];
    lyrics.push({ time, text });
  }
  return lyrics;
};

export default function PlayerView({ visible, onClose }: PlayerViewProps) {
  const isSmallScreen = height < 800;
  const artSize = isSmallScreen ? Math.min(width * 0.45, 170) : Math.min(width - 64, 300);
  const lyricsHeight = isSmallScreen ? 90 : 150;

  const {
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    queue,
    queueIndex,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    playlists,
    addTrackToPlaylist,
  } = useAudio();

  const [showQueue, setShowQueue] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const lyricsScrollViewRef = useRef<ScrollView>(null);

  const mockLyrics = currentTrack ? getMockLyrics(currentTrack.name, duration || 240) : [];

  // Auto scroll lyrics based on progress
  useEffect(() => {
    if (!showQueue && !showPlaylistPicker && lyricsScrollViewRef.current && mockLyrics.length > 0) {
      // Find current lyric index
      const activeIndex = mockLyrics.findIndex(
        (l, i) => progress >= l.time && (i === mockLyrics.length - 1 || progress < mockLyrics[i + 1].time)
      );

      if (activeIndex !== -1) {
        lyricsScrollViewRef.current.scrollTo({
          y: activeIndex * 36 - 50,
          animated: true,
        });
      }
    }
  }, [progress, showQueue, showPlaylistPicker]);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Custom progress slider touch handling
  const handleProgressBarPress = (e: any) => {
    if (!duration) return;
    const locationX = e.nativeEvent.locationX;
    const sliderWidth = width - 64; // Horizontal margin padding
    const percent = Math.min(Math.max(0, locationX / sliderWidth), 1);
    seekTo(percent * duration);
  };

  const currentLyricIndex = mockLyrics.findIndex(
    (l, i) => progress >= l.time && (i === mockLyrics.length - 1 || progress < mockLyrics[i + 1].time)
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <LinearGradient
        colors={["#2e1065", "#020617", "#000000"]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <ChevronDown color="#ffffff" size={28} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerSub}>PLAYING FROM PLAYBACK QUEUE</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentTrack.album.name || "Aura Stream"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowQueue(!showQueue);
                setShowPlaylistPicker(false);
              }}
              style={styles.headerButton}
            >
              <ListMusic color={showQueue ? "#1db954" : "#ffffff"} size={24} />
            </TouchableOpacity>
          </View>

          {showQueue ? (
            /* Queue Viewer Overlay */
            <View style={styles.contentContainer}>
              <Text style={styles.panelTitle}>Playback Queue ({queue.length} songs)</Text>
              <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 40 }}>
                {queue.map((item, idx) => {
                  const isCurrent = idx === queueIndex;
                  return (
                    <TouchableOpacity
                      key={`${item.id}_${idx}`}
                      style={[styles.queueItem, isCurrent && styles.queueItemActive]}
                      onPress={() => playTrack(item, queue, idx)}
                    >
                      <Image
                        source={{ uri: item.album.images[0]?.url }}
                        style={styles.queueArt}
                      />
                      <View style={styles.queueMeta}>
                        <Text
                          style={[styles.queueName, isCurrent && styles.greenText]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.queueArtist} numberOfLines={1}>
                          {item.artists.map((a) => a.name).join(", ")}
                        </Text>
                      </View>
                      {isCurrent && (
                        <View style={styles.playingIndicator}>
                          <Music color="#1db954" size={16} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.closePanelButton}
                onPress={() => setShowQueue(false)}
              >
                <Text style={styles.closePanelText}>Back to Player</Text>
              </TouchableOpacity>
            </View>
          ) : showPlaylistPicker ? (
            /* Playlist Picker Overlay */
            <View style={styles.contentContainer}>
              <Text style={styles.panelTitle}>Add to Playlist</Text>
              <ScrollView style={styles.scrollContainer}>
                {playlists.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No playlists created yet.</Text>
                    <Text style={styles.emptySubText}>Go to Your Library to create one.</Text>
                  </View>
                ) : (
                  playlists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      style={styles.playlistPickerItem}
                      onPress={() => {
                        addTrackToPlaylist(playlist.id, currentTrack);
                        setShowPlaylistPicker(false);
                      }}
                    >
                      <Text style={styles.playlistPickerName}>{playlist.name}</Text>
                      <Text style={styles.playlistPickerTracks}>
                        {playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.closePanelButton}
                onPress={() => setShowPlaylistPicker(false)}
              >
                <Text style={styles.closePanelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Normal Player View Details */
            <View style={[styles.playerDetailsContainer, isSmallScreen && { paddingHorizontal: 20 }]}>
              {/* Cover Art Wrapper */}
              <View style={[styles.artContainer, isSmallScreen && { marginVertical: 8 }]}>
                <Image
                  source={{ uri: currentTrack.album.images[0]?.url }}
                  style={[styles.albumArt, { width: artSize, height: artSize }]}
                />
              </View>

              {/* Title & Artist */}
              <View style={[styles.titleContainer, isSmallScreen && { marginBottom: 8 }]}>
                <View style={styles.metaInfo}>
                  <Text style={[styles.trackName, isSmallScreen && { fontSize: 18 }]} numberOfLines={1}>
                    {currentTrack.name}
                  </Text>
                  <Text style={[styles.artistName, isSmallScreen && { fontSize: 13 }]} numberOfLines={1}>
                    {currentTrack.artists.map((a) => a.name).join(", ")}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsLiked(!isLiked)} style={styles.likeButton}>
                  <Heart
                    color={isLiked ? "#1db954" : "#ffffff"}
                    fill={isLiked ? "#1db954" : "transparent"}
                    size={24}
                  />
                </TouchableOpacity>
              </View>

              {/* Progress Slider (Interactive scrubber) */}
              <View style={[styles.progressSection, isSmallScreen && { marginBottom: 10 }]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleProgressBarPress}
                  style={styles.sliderTrack}
                >
                  <View
                    style={[
                      styles.sliderProgress,
                      { width: `${(duration ? progress / duration : 0) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: `${(duration ? progress / duration : 0) * 100}%` },
                    ]}
                  />
                </TouchableOpacity>
                <View style={styles.timeLabels}>
                  <Text style={styles.timeText}>{formatTime(progress)}</Text>
                  <Text style={styles.timeText}>
                    {duration ? formatTime(duration) : "0:00"}
                  </Text>
                </View>
              </View>

              {/* Controls */}
              <View style={[styles.controlsRow, isSmallScreen && { marginBottom: 10 }]}>
                <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
                  <Shuffle color={isShuffle ? "#1db954" : "#b3b3b3"} size={20} />
                </TouchableOpacity>

                <TouchableOpacity onPress={playPrevious}>
                  <SkipBack color="#ffffff" size={30} fill="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => togglePlay()}
                  style={[styles.playPauseContainer, isSmallScreen && { width: 56, height: 56, borderRadius: 28 }]}
                >
                  {isPlaying ? (
                    <Pause color="#000000" size={26} fill="#000000" />
                  ) : (
                    <Play color="#000000" size={26} fill="#000000" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={playNext}>
                  <SkipForward color="#ffffff" size={30} fill="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsRepeat(!isRepeat)}>
                  <Repeat color={isRepeat ? "#1db954" : "#b3b3b3"} size={20} />
                </TouchableOpacity>
              </View>

              {/* Lyrics Panel */}
              <View style={[styles.lyricsContainer, { height: lyricsHeight }, isSmallScreen && { marginBottom: 10 }]}>
                <Text style={styles.lyricsLabel}>Lyrics</Text>
                <ScrollView
                  ref={lyricsScrollViewRef}
                  style={styles.lyricsScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 12 }}
                >
                  {mockLyrics.map((lyric, idx) => {
                    const isActive = idx === currentLyricIndex;
                    return (
                      <Text
                        key={idx}
                        style={[
                          styles.lyricLine,
                          isActive && styles.lyricLineActive,
                        ]}
                      >
                        {lyric.text}
                      </Text>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Bottom Actions Row */}
              <View style={styles.bottomActions}>
                <TouchableOpacity onPress={() => setShowPlaylistPicker(true)}>
                  <ListMusic color="#b3b3b3" size={20} />
                </TouchableOpacity>
                <Text style={styles.streamProvider}>Guest Streaming (Saavn CDN)</Text>
                <Volume2 color="#b3b3b3" size={20} />
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 56,
  },
  headerButton: {
    padding: 6,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerSub: {
    fontSize: 9,
    color: "#b3b3b3",
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  panelTitle: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "700",
    marginBottom: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  queueItemActive: {
    backgroundColor: "rgba(29, 185, 84, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  queueArt: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginRight: 12,
  },
  queueMeta: {
    flex: 1,
    justifyContent: "center",
  },
  queueName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  queueArtist: {
    color: "#b3b3b3",
    fontSize: 12,
    marginTop: 2,
  },
  greenText: {
    color: "#1db954",
  },
  playingIndicator: {
    paddingHorizontal: 8,
  },
  closePanelButton: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginVertical: 20,
  },
  closePanelText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
  playlistPickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  playlistPickerName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  playlistPickerTracks: {
    color: "#b3b3b3",
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    color: "#b3b3b3",
    fontSize: 13,
    marginTop: 4,
  },
  playerDetailsContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  artContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 14,
  },
  albumArt: {
    maxWidth: 340,
    maxHeight: 340,
    borderRadius: 12,
    shadowColor: "#1db954",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  metaInfo: {
    flex: 1,
    marginRight: 16,
  },
  trackName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  artistName: {
    color: "#b3b3b3",
    fontSize: 15,
    marginTop: 4,
  },
  likeButton: {
    padding: 6,
  },
  progressSection: {
    marginBottom: 20,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    position: "relative",
    justifyContent: "center",
  },
  sliderProgress: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    marginLeft: -6,
  },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    color: "#b3b3b3",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  playPauseContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  lyricsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  lyricsLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricLine: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    marginVertical: 6,
  },
  lyricLineActive: {
    color: "#ffffff",
    fontSize: 17,
  },
  bottomActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 16,
  },
  streamProvider: {
    color: "#b3b3b3",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});
