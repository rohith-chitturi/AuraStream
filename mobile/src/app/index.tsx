import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Play, Flame, Disc, Radio, Library } from "lucide-react-native";
import { useAudio, Track } from "@/context/AudioContext";
import { Colors } from "@/constants/theme";

const { width } = Dimensions.get("window");

// Premium pre-configured tracks for immediate search & playback
const FEATURED_TRACKS = [
  { name: "Blinding Lights", artist: "The Weeknd" },
  { name: "Starboy", artist: "The Weeknd" },
  { name: "Sweater Weather", artist: "The Neighbourhood" },
  { name: "Another Love", artist: "Tom Odell" },
  { name: "Perfect", artist: "Ed Sheeran" },
  { name: "Nightcall", artist: "Kavinsky" },
];

const PRESET_MOODS = [
  { name: "Neon Cyberpunk", query: "synthwave retrowave neon drive", color: ["#d946ef", "#8b5cf6"] },
  { name: "Deep Focus Lofi", query: "lofi hip hop beats study coding chill", color: ["#3b82f6", "#06b6d4"] },
  { name: "Phonk Workout", query: "phonk drift workout gym extreme music", color: ["#ef4444", "#f97316"] },
  { name: "Rainy Day Indie", query: "indie folk acoustic cozy bedroom pop", color: ["#10b981", "#059669"] },
];

export default function HomeScreen() {
  const { playTrack } = useAudio();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  // Compile a playlist on the fly based on a mood query
  const generateMoodPlaylist = async (moodName: string, query: string) => {
    if (aiGenerating) return;
    setAiGenerating(true);
    setActiveMood(moodName);

    try {
      const instance = "https://invidious.flokinet.to"; // Primary fast instance
      const encodedQuery = encodeURIComponent(query);
      const searchRes = await fetch(`${instance}/api/v1/search?q=${encodedQuery}&type=video`);
      
      if (!searchRes.ok) throw new Error("Search failed");
      const searchData = await searchRes.json();
      if (searchData.length === 0) throw new Error("No tracks found");

      // Format tracks
      const tracks: Track[] = searchData.slice(0, 8).map((item: any) => ({
        id: item.videoId,
        name: item.title,
        artists: [{ name: item.author }],
        album: {
          name: `${moodName} Aura`,
          images: [{ url: item.videoThumbnails?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300" }]
        },
        duration_ms: (item.lengthSeconds || 180) * 1000
      }));

      // Play first track and load the rest in queue
      if (tracks.length > 0) {
        await playTrack(tracks[0], tracks, 0);
      }
    } catch (err) {
      console.error("Mood compilation error:", err);
    } finally {
      setAiGenerating(false);
      setActiveMood(null);
    }
  };

  // Play a quick featured song by searching Invidious
  const playQuickSong = async (name: string, artist: string) => {
    try {
      const instance = "https://invidious.flokinet.to";
      const query = encodeURIComponent(`${name} ${artist}`);
      const searchRes = await fetch(`${instance}/api/v1/search?q=${query}&type=video`);
      if (!searchRes.ok) throw new Error("Search failed");
      const searchData = await searchRes.json();
      if (searchData.length === 0) return;

      const matched = searchData[0];
      const track: Track = {
        id: matched.videoId,
        name: matched.title,
        artists: [{ name: matched.author }],
        album: {
          name: "Featured Single",
          images: [{ url: matched.videoThumbnails?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300" }]
        },
        duration_ms: (matched.lengthSeconds || 200) * 1000
      };

      await playTrack(track, [track], 0);
    } catch (e) {
      console.error("Quick play error:", e);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <View style={styles.iconContainer}>
            <Sparkles color="#1db954" size={24} />
          </View>
        </View>

        {/* AI Aura DJ Card */}
        <LinearGradient
          colors={["#1e1b4b", "#0f052d", "#020617"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiCard}
        >
          <View style={styles.aiBadge}>
            <Sparkles color="#1db954" size={14} />
            <Text style={styles.aiBadgeText}>AURA DJ</Text>
          </View>
          <Text style={styles.aiTitle}>Generate your Aura Soundscape</Text>
          <Text style={styles.aiDesc}>
            Choose a mood or setting. Our AI engine compiles a seamless YouTube Music stream based on your energy.
          </Text>

          {/* Grid of Mood Presets */}
          <View style={styles.moodGrid}>
            {PRESET_MOODS.map((mood) => {
              const isThisActive = aiGenerating && activeMood === mood.name;
              return (
                <TouchableOpacity
                  key={mood.name}
                  style={styles.moodItem}
                  onPress={() => generateMoodPlaylist(mood.name, mood.query)}
                  disabled={aiGenerating}
                >
                  <LinearGradient
                    colors={mood.color}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.moodBg}
                  >
                    {isThisActive ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Radio color="#ffffff" size={18} />
                        <Text style={styles.moodText}>{mood.name}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        {/* Popular Tracks Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Editor's Picks</Text>
          <Text style={styles.sectionSub}>Tap to search and play instantly</Text>
        </View>

        <View style={styles.gridContainer}>
          {FEATURED_TRACKS.map((track, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.trackCard}
              onPress={() => playQuickSong(track.name, track.artist)}
            >
              <LinearGradient
                colors={["#181818", "#121212"]}
                style={styles.cardInner}
              >
                <View style={styles.cardImageContainer}>
                  <Image
                    source={{ uri: `https://picsum.photos/seed/${track.name}/150` }}
                    style={styles.cardImage}
                  />
                  <View style={styles.playOverlay}>
                    <Play color="#ffffff" fill="#ffffff" size={18} />
                  </View>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {track.name}
                </Text>
                <Text style={styles.cardArtist} numberOfLines={1}>
                  {track.artist}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Guest Stream Engine active</Text>
          <Text style={styles.infoText}>
            All audio search queries, feeds, and tracks are fetched directly from decentralized, censorship-free Invidious instances. No Spotify Premium subscription or developer registration is required.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 48,
    paddingBottom: 140, // Space for floating MiniPlayer
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "800",
  },
  iconContainer: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
  },
  aiCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 28,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 185, 84, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
    gap: 6,
  },
  aiBadgeText: {
    color: "#1db954",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  aiTitle: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "700",
    marginBottom: 8,
  },
  aiDesc: {
    color: "#b3b3b3",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  moodItem: {
    width: "48%",
    borderRadius: 10,
    overflow: "hidden",
  },
  moodBg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
    minHeight: 46,
  },
  moodText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "700",
  },
  sectionSub: {
    color: "#b3b3b3",
    fontSize: 12,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    justifyContent: "space-between",
    marginBottom: 28,
  },
  trackCard: {
    width: "50%",
    padding: 6,
  },
  cardInner: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  cardImageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1db954",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  cardArtist: {
    color: "#b3b3b3",
    fontSize: 11,
    marginTop: 2,
  },
  infoBox: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoText: {
    color: "#8e8e8e",
    fontSize: 11,
    lineHeight: 16,
  },
});
