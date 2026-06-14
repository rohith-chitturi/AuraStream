import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Play, Pause, SkipForward, Heart } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudio } from "@/context/AudioContext";
import PlayerView from "./PlayerView";

const { width } = Dimensions.get("window");

export default function MiniPlayer() {
  const { currentTrack, isPlaying, isLoading, progress, duration, togglePlay, playNext } = useAudio();
  const [playerVisible, setPlayerVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const insets = useSafeAreaInsets();

  if (!currentTrack) return null;

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setPlayerVisible(true)}
        style={[styles.container, { bottom: Math.max(12, insets.bottom + 60) }]}
      >
        {/* Progress Bar Line */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFilled, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.content}>
          {/* Album Art & Meta */}
          <Image
            source={{ uri: currentTrack.album.images[0]?.url }}
            style={styles.albumArt}
          />
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentTrack.artists.map((a) => a.name).join(", ")}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={() => setIsLiked(!isLiked)} style={styles.controlButton}>
              <Heart
                color={isLiked ? "#1db954" : "#ffffff"}
                fill={isLiked ? "#1db954" : "transparent"}
                size={20}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.controlButton}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#1db954" />
              ) : isPlaying ? (
                <Pause color="#ffffff" fill="#ffffff" size={22} />
              ) : (
                <Play color="#ffffff" fill="#ffffff" size={22} />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext} style={styles.controlButton}>
              <SkipForward color="#ffffff" fill="#ffffff" size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Full Player Modal */}
      <PlayerView visible={playerVisible} onClose={() => setPlayerVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 8,
    right: 8,
    backgroundColor: "rgba(18, 18, 18, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    overflow: "hidden",
  },
  progressBarContainer: {
    height: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: "100%",
  },
  progressBarFilled: {
    height: "100%",
    backgroundColor: "#1db954",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    height: 58,
  },
  albumArt: {
    width: 42,
    height: 42,
    borderRadius: 6,
  },
  meta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  artist: {
    color: "#b3b3b3",
    fontSize: 11,
    marginTop: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlButton: {
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
