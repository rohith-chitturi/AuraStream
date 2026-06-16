import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  ToastAndroid,
  Alert,
} from "react-native";
import { ChevronLeft, Play, ListPlus, Plus, Sparkles, Heart } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAudio, Track } from "@/context/AudioContext";

const { width, height } = Dimensions.get("window");

interface ArtistDetailModalProps {
  visible: boolean;
  artistId?: string;
  artistName?: string;
  artistImage?: string;
  onClose: () => void;
}

export default function ArtistDetailModal({
  visible,
  artistId,
  artistName,
  artistImage,
  onClose,
}: ArtistDetailModalProps) {
  const { playTrack, addToQueue, playlists, addTrackToPlaylist, createPlaylist } = useAudio();
  const [loading, setLoading] = useState(false);
  const [artistDetails, setArtistDetails] = useState<any>(null);
  const [artistSongs, setArtistSongs] = useState<Track[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  // States for playlist adding
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);

  useEffect(() => {
    if (visible && artistId) {
      fetchArtistDetails();
    } else {
      setArtistDetails(null);
      setArtistSongs([]);
      setIsFollowing(false);
    }
  }, [visible, artistId]);

  const fetchArtistDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://saavn.sumit.co/api/artists/${artistId}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setArtistDetails(json.data);
        
        // Map topSongs to Track format
        if (json.data.topSongs && Array.isArray(json.data.topSongs)) {
          const mappedTracks: Track[] = json.data.topSongs.map((song: any) => {
            const streams = song.downloadUrl || [];
            const bestStream = streams.find((s: any) => s.quality === "320kbps") || 
                               streams.find((s: any) => s.quality === "160kbps") || 
                               streams[streams.length - 1] || 
                               { url: "" };

            const images = song.image || [];
            const bestImage = images.find((img: any) => img.quality === "500x500") || 
                              images.find((img: any) => img.quality === "150x150") || 
                              images[images.length - 1] || 
                              { url: artistImage || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300" };

            return {
              id: `saavn_${song.id}`,
              name: song.name,
              artists: song.artists?.primary?.length > 0 
                ? song.artists.primary.map((a: any) => ({ name: a.name })) 
                : [{ name: artistName || "Unknown Artist" }],
              album: {
                name: song.album?.name || "Single",
                images: [{ url: bestImage.url }]
              },
              duration_ms: (song.duration || 180) * 1000,
              streamUrl: bestStream.url
            };
          });
          setArtistSongs(mappedTracks);
        }
      } else {
        Alert.alert("Error", "Could not fetch artist profile.");
      }
    } catch (e) {
      console.error("Failed loading artist:", e);
      Alert.alert("Error", "Network request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
    if (Platform.OS === "android") {
      ToastAndroid.show("Added to queue", ToastAndroid.SHORT);
    } else {
      Alert.alert("Added to queue", `"${track.name}" added to queue.`);
    }
  };

  const formatFollowers = (countStr: any) => {
    if (!countStr) return "0";
    const num = parseInt(countStr, 10);
    if (isNaN(num)) return countStr;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderHeader = () => {
    const followers = artistDetails ? formatFollowers(artistDetails.followerCount || artistDetails.fanCount) : "...";
    const bio = artistDetails?.bio && Array.isArray(artistDetails.bio) && artistDetails.bio.length > 0
      ? artistDetails.bio[0]?.text
      : (artistDetails?.bio || "");
    const cleanBio = bio ? bio.replace(/<[^>]*>/g, "") : "";

    return (
      <View style={styles.headerHero}>
        <Image source={{ uri: artistImage }} style={styles.heroBackground} blurRadius={10} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)", "#000000"]} style={styles.heroGradient}>
          <Image source={{ uri: artistImage }} style={styles.artistPhoto} />
          <Text style={styles.artistNameText}>{artistName}</Text>
          <View style={styles.badgeRow}>
            {artistDetails?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Sparkles color="#1db954" size={12} />
                <Text style={styles.verifiedText}>VERIFIED ARTIST</Text>
              </View>
            )}
            <Text style={styles.followerText}>{followers} Listeners</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={() => setIsFollowing(!isFollowing)}
            >
              <Heart color={isFollowing ? "#1db954" : "#ffffff"} fill={isFollowing ? "#1db954" : "transparent"} size={16} />
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>

            {artistSongs.length > 0 && (
              <TouchableOpacity
                style={styles.playAllBtn}
                onPress={() => playTrack(artistSongs[0], artistSongs, 0)}
              >
                <Play color="#000000" fill="#000000" size={18} />
                <Text style={styles.playAllText}>PLAY TOP TRACKS</Text>
              </TouchableOpacity>
            )}
          </View>

          {cleanBio ? (
            <Text style={styles.bioText} numberOfLines={3}>
              {cleanBio}
            </Text>
          ) : null}
        </LinearGradient>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <ChevronLeft color="#ffffff" size={24} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1db954" />
            <Text style={styles.loadingText}>Fetching Artist Portfolio...</Text>
          </View>
        ) : (
          <FlatList
            data={artistSongs}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <View style={styles.songRow}>
                <TouchableOpacity
                  style={styles.songMain}
                  onPress={() => playTrack(item, artistSongs, index)}
                >
                  <Text style={styles.songIndex}>{index + 1}</Text>
                  <Image source={{ uri: item.album.images[0]?.url }} style={styles.songArt} />
                  <View style={styles.songMeta}>
                    <Text style={styles.songName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.songAlbum} numberOfLines={1}>
                      {item.album.name}
                    </Text>
                  </View>
                  <Play color="#1db954" fill="#1db954" size={14} style={styles.playIcon} />
                </TouchableOpacity>

                <View style={styles.songActions}>
                  <TouchableOpacity onPress={() => handleAddToQueue(item)} style={styles.actionBtn}>
                    <ListPlus color="#b3b3b3" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedTrackForPlaylist(item)}
                    style={styles.actionBtn}
                  >
                    <Plus color="#b3b3b3" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No top songs available for this artist.</Text>
              </View>
            }
          />
        )}

        {/* Playlist Selector Dialog */}
        {selectedTrackForPlaylist && (
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add to Playlist</Text>
              <Text style={styles.dialogSub} numberOfLines={1}>
                "{selectedTrackForPlaylist.name}"
              </Text>

              {playlists.length === 0 ? (
                <View style={styles.dialogEmpty}>
                  <Text style={styles.dialogEmptyText}>You don't have any playlists yet.</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await createPlaylist("My Favorites", selectedTrackForPlaylist);
                      setSelectedTrackForPlaylist(null);
                      if (Platform.OS === "android") {
                        ToastAndroid.show("Playlist created & song added", ToastAndroid.SHORT);
                      }
                    }}
                    style={styles.createBtn}
                  >
                    <Text style={styles.createBtnText}>Create "My Favorites"</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={playlists}
                  keyExtractor={(p) => p.id}
                  style={{ maxHeight: 180, marginVertical: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dialogItem}
                      onPress={() => {
                        addTrackToPlaylist(item.id, selectedTrackForPlaylist);
                        setSelectedTrackForPlaylist(null);
                        if (Platform.OS === "android") {
                          ToastAndroid.show(`Added to ${item.name}`, ToastAndroid.SHORT);
                        }
                      }}
                    >
                      <Text style={styles.dialogItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity
                onPress={() => setSelectedTrackForPlaylist(null)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  navbar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#b3b3b3",
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerHero: {
    position: "relative",
    width: "100%",
    height: 380,
    backgroundColor: "#121212",
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  heroGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  artistPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#1db954",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  artistNameText: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 185, 84, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    color: "#1db954",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  followerText: {
    color: "#b3b3b3",
    fontSize: 12,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  followingBtn: {
    borderColor: "#1db954",
    backgroundColor: "rgba(29,185,84,0.1)",
  },
  followText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  followingText: {
    color: "#1db954",
  },
  playAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1db954",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  playAllText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
  },
  bioText: {
    color: "#8e8e8e",
    fontSize: 12,
    lineHeight: 18,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  songMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  songIndex: {
    color: "#b3b3b3",
    width: 24,
    fontSize: 14,
    textAlign: "center",
  },
  songArt: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  songMeta: {
    flex: 1,
  },
  songName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  songAlbum: {
    color: "#b3b3b3",
    fontSize: 12,
    marginTop: 2,
  },
  playIcon: {
    marginRight: 10,
  },
  songActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "#b3b3b3",
    fontSize: 14,
  },
  dialogOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  dialogCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 24,
    width: width - 64,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dialogTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  dialogSub: {
    color: "#b3b3b3",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  dialogItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  dialogItemText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  dialogEmpty: {
    alignItems: "center",
    paddingVertical: 16,
  },
  dialogEmptyText: {
    color: "#b3b3b3",
    fontSize: 13,
    marginBottom: 12,
  },
  createBtn: {
    backgroundColor: "#1db954",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  createBtnText: {
    color: "#000000",
    fontWeight: "700",
  },
  cancelBtn: {
    alignItems: "center",
    paddingTop: 16,
  },
  cancelBtnText: {
    color: "#ef4444",
    fontWeight: "700",
  },
});
