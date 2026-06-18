import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Play, Flame, Disc, Radio, Library } from "lucide-react-native";
import { useAudio, Track } from "@/context/AudioContext";
import { Colors } from "@/constants/theme";
import ArtistDetailModal from "@/components/ArtistDetailModal";

const { width } = Dimensions.get("window");

const POPULAR_SINGERS = [
  { id: "459320", name: "Arijit Singh", image: "https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg" },
  { id: "615155", name: "The Weeknd", image: "https://c.saavncdn.com/artists/The_Weeknd_002_20241003071400_500x500.jpg" },
  { id: "565990", name: "Taylor Swift", image: "https://c.saavncdn.com/artists/Taylor_Swift_003_20200226074119_500x500.jpg" },
  { id: "455663", name: "Anirudh", image: "https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20260121134149_500x500.jpg" },
  { id: "468245", name: "Diljit Dosanjh", image: "https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg" },
  { id: "455130", name: "Shreya Ghoshal", image: "https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg" }
];

const PRESET_MOODS = [
  { name: "Neon Cyberpunk", query: "synthwave retrowave neon drive", color: ["#d946ef", "#8b5cf6"] },
  { name: "Deep Focus Lofi", query: "lofi hip hop beats study coding chill", color: ["#3b82f6", "#06b6d4"] },
  { name: "Phonk Workout", query: "phonk drift workout gym extreme music", color: ["#ef4444", "#f97316"] },
  { name: "Rainy Day Indie", query: "indie folk acoustic cozy bedroom pop", color: ["#10b981", "#059669"] },
];

export default function HomeScreen() {
  const { playTrack, user, logout, setGuestMode } = useAudio();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Dynamic shelves state
  const [language, setLanguage] = useState<"hindi" | "english" | "telugu">("hindi");
  const [trendingSongs, setTrendingSongs] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingNewReleases, setLoadingNewReleases] = useState(false);

  // Selected artist details modal state
  const [selectedArtist, setSelectedArtist] = useState<any | null>(null);

  useEffect(() => {
    fetchTrendingSongs();
    fetchNewReleases();
  }, [language]);

  const fetchTrendingSongs = async () => {
    setLoadingTrending(true);
    try {
      const query = language === "hindi" 
        ? "trending hindi hits" 
        : (language === "english" ? "trending english hits" : "trending telugu hits");
      
      const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (res.ok && json.success && json.data?.results) {
        const mapped: Track[] = json.data.results.slice(0, 10).map((item: any) => {
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
        setTrendingSongs(mapped);
      }
    } catch (e) {
      console.warn("Failed fetching trending songs:", e);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchNewReleases = async () => {
    setLoadingNewReleases(true);
    try {
      const query = language === "hindi" 
        ? "latest hindi songs" 
        : (language === "english" ? "latest english songs" : "latest telugu songs");

      const res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (res.ok && json.success && json.data?.results) {
        const mapped: Track[] = json.data.results.slice(0, 10).map((item: any) => {
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
        setNewReleases(mapped);
      }
    } catch (e) {
      console.warn("Failed fetching new releases:", e);
    } finally {
      setLoadingNewReleases(false);
    }
  };

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
        const tracks: Track[] = json.data.results.slice(0, 8).map((item: any) => {
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
              name: item.album?.name || `${moodName} Aura`,
              images: [{ url: bestImage.url }]
            },
            duration_ms: (item.duration || 180) * 1000,
            streamUrl: bestStream.url
          };
        });

        if (tracks.length > 0) {
          await playTrack(tracks[0], tracks, 0);
          return;
        }
      }
    } catch (err) {
      console.warn("Saavn mood compile failed, trying Invidious:", err);
      // Fallback: Invidious
      try {
        const instance = "https://iv.melmac.space"; 
        const encodedQuery = encodeURIComponent(query);
        const searchRes = await fetch(`${instance}/api/v1/search?q=${encodedQuery}&type=video`);
        if (!searchRes.ok) throw new Error("Search failed");
        const searchData = await searchRes.json();
        if (searchData.length === 0) throw new Error("No tracks found");

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

        if (tracks.length > 0) {
          await playTrack(tracks[0], tracks, 0);
        }
      } catch (e) {
        console.error("Mood compilation fallback failed:", e);
      }
    } finally {
      setAiGenerating(false);
      setActiveMood(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}
            {user ? `, ${user.username}` : ""}
          </Text>
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
                    colors={mood.color as [string, string]}
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

        {/* Language Selection Pills */}
        <View style={styles.langSelectorRow}>
          <Text style={styles.langLabel}>Music Language</Text>
          <View style={styles.langPills}>
            {(["hindi", "english", "telugu"] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langPill, language === lang && styles.langPillActive]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Curated Artist Selection (Singer Selection) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Singer Selection</Text>
          <Text style={styles.sectionSub}>Tap to view top songs and profiles</Text>
        </View>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.singersScrollContent}
        >
          {POPULAR_SINGERS.map((singer) => (
            <TouchableOpacity
              key={singer.id}
              style={styles.singerCard}
              onPress={() => setSelectedArtist(singer)}
            >
              <Image source={{ uri: singer.image }} style={styles.singerAvatar} />
              <Text style={styles.singerName} numberOfLines={1}>
                {singer.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Live Trending Songs Shelf */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trending Songs</Text>
          <Text style={styles.sectionSub}>The hottest chartbusters right now</Text>
        </View>
        {loadingTrending ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1db954" />
          </View>
        ) : (
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalShelfContent}
          >
            {trendingSongs.map((track, idx) => (
              <TouchableOpacity
                key={track.id}
                style={styles.shelfCard}
                onPress={() => playTrack(track, trendingSongs, idx)}
              >
                <View style={styles.shelfImageContainer}>
                  <Image source={{ uri: track.album.images[0]?.url }} style={styles.shelfCardImage} />
                  <View style={styles.shelfPlayOverlay}>
                    <Play color="#ffffff" fill="#ffffff" size={14} />
                  </View>
                </View>
                <Text style={styles.shelfCardTitle} numberOfLines={1}>
                  {track.name}
                </Text>
                <Text style={styles.shelfCardArtist} numberOfLines={1}>
                  {track.artists.map((a) => a.name).join(", ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Live New Releases Shelf */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New Releases</Text>
          <Text style={styles.sectionSub}>Fresh upcoming drops and hits</Text>
        </View>
        {loadingNewReleases ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1db954" />
          </View>
        ) : (
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalShelfContent}
          >
            {newReleases.map((track, idx) => (
              <TouchableOpacity
                key={track.id}
                style={styles.shelfCard}
                onPress={() => playTrack(track, newReleases, idx)}
              >
                <View style={styles.shelfImageContainer}>
                  <Image source={{ uri: track.album.images[0]?.url }} style={styles.shelfCardImage} />
                  <View style={styles.shelfPlayOverlay}>
                    <Play color="#ffffff" fill="#ffffff" size={14} />
                  </View>
                </View>
                <Text style={styles.shelfCardTitle} numberOfLines={1}>
                  {track.name}
                </Text>
                <Text style={styles.shelfCardArtist} numberOfLines={1}>
                  {track.artists.map((a) => a.name).join(", ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Info Box */}
        {user ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Logged in as {user.username}</Text>
            <Text style={styles.infoText}>
              Email: {user.email}{"\n"}
              Your playlists and search library are automatically synchronized to your profile.
            </Text>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>LOG OUT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Guest Session Engine active</Text>
            <Text style={styles.infoText}>
              You are currently using RohiBeatz in Guest Mode. Playlists created will not be saved permanently to an account.
            </Text>
            <TouchableOpacity onPress={() => setGuestMode(false)} style={styles.loginBtn}>
              <Text style={styles.loginBtnText}>SIGN IN / CREATE ACCOUNT</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Artist Detail Modal Overlay */}
      <ArtistDetailModal
        visible={selectedArtist !== null}
        artistId={selectedArtist?.id}
        artistName={selectedArtist?.name}
        artistImage={selectedArtist?.image}
        onClose={() => setSelectedArtist(null)}
      />
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
    marginBottom: 20,
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
    marginBottom: 12,
  },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loginBtn: {
    backgroundColor: "rgba(29, 185, 84, 0.15)",
    borderColor: "rgba(29, 185, 84, 0.3)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: {
    color: "#1db954",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  langSelectorRow: {
    paddingHorizontal: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  langLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  langPills: {
    flexDirection: "row",
    gap: 8,
  },
  langPill: {
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  langPillActive: {
    backgroundColor: "#1db954",
    borderColor: "#1db954",
  },
  langText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  langTextActive: {
    color: "#000000",
    fontWeight: "800",
  },
  singersScrollContent: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 16,
    marginBottom: 28,
  },
  singerCard: {
    alignItems: "center",
    width: 80,
  },
  singerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 8,
  },
  singerName: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  horizontalShelfContent: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 16,
    marginBottom: 28,
  },
  shelfCard: {
    width: 130,
  },
  shelfImageContainer: {
    position: "relative",
    width: 130,
    height: 130,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  shelfCardImage: {
    width: "100%",
    height: "100%",
  },
  shelfPlayOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1db954",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  shelfCardTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  shelfCardArtist: {
    color: "#b3b3b3",
    fontSize: 11,
    marginTop: 2,
  },
  loaderContainer: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});
