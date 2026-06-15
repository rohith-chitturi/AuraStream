import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Search, X, Play, Plus, Music } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudio, Track } from "@/context/AudioContext";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  { name: "Pop", color: ["#d946ef", "#8b5cf6"], query: "pop hits" },
  { name: "Hip-Hop", color: ["#ef4444", "#f97316"], query: "hip hop" },
  { name: "Electronic", color: ["#3b82f6", "#06b6d4"], query: "edm dance" },
  { name: "Rock", color: ["#eab308", "#ca8a04"], query: "rock classics" },
  { name: "Lofi", color: ["#10b981", "#059669"], query: "lofi sleep" },
  { name: "Jazz", color: ["#6366f1", "#4f46e5"], query: "smooth jazz instrumental" },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    performSearch,
    playTrack,
    playlists,
    addTrackToPlaylist,
  } = useAudio();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [searchMode, setSearchMode] = useState<"songs" | "albums">("songs");
  const [albumResults, setAlbumResults] = useState<any[]>([]);
  const [isSearchingAlbums, setIsSearchingAlbums] = useState(false);
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);

  // Trigger search when input query or mode shifts
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(inputVal);
      if (searchMode === "songs") {
        performSearch(inputVal);
      } else {
        performAlbumSearch(inputVal);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [inputVal, searchMode]);

  const performAlbumSearch = async (query: string) => {
    if (!query.trim()) {
      setAlbumResults([]);
      return;
    }
    setIsSearchingAlbums(true);
    try {
      let json;
      try {
        const res = await fetch(`https://saavn.dev/api/search/albums?query=${encodeURIComponent(query)}`);
        if (res.ok) json = await res.ok ? await res.json() : null;
      } catch (e) {
        console.warn("saavn.dev album search failed, trying backup");
      }

      if (!json || !json.success) {
        const res = await fetch(`https://saavn.sumit.co/api/search/albums?query=${encodeURIComponent(query)}`);
        if (res.ok) json = await res.json();
      }

      if (json && json.success && json.data?.results) {
        setAlbumResults(json.data.results);
      } else {
        setAlbumResults([]);
      }
    } catch (e) {
      console.error("Album search failed:", e);
      setAlbumResults([]);
    } finally {
      setIsSearchingAlbums(false);
    }
  };

  // Click an album/movie: fetch all songs and play/queue them
  const handlePlayAlbum = async (albumId: string, albumName: string) => {
    setLoadingAlbumId(albumId);
    try {
      let json;
      try {
        const res = await fetch(`https://saavn.dev/api/albums?id=${albumId}`);
        if (res.ok) json = await res.json();
      } catch (e) {
        console.warn("saavn.dev album details failed, trying backup");
      }

      if (!json || !json.success) {
        const res = await fetch(`https://saavn.sumit.co/api/albums?id=${albumId}`);
        if (res.ok) json = await res.json();
      }

      if (json && json.success && json.data?.songs?.length > 0) {
        const tracks: Track[] = json.data.songs.map((song: any) => {
          const streams = song.downloadUrl || [];
          const bestStream = streams.find((s: any) => s.quality === "320kbps") || 
                             streams.find((s: any) => s.quality === "160kbps") || 
                             streams[streams.length - 1] || 
                             { url: "" };

          const images = song.image || [];
          const bestImage = images.find((img: any) => img.quality === "500x500") || 
                            images.find((img: any) => img.quality === "150x150") || 
                            images[images.length - 1] || 
                            { url: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300" };

          return {
            id: `saavn_${song.id}`,
            name: song.name,
            artists: song.artists?.primary?.length > 0 
              ? song.artists.primary.map((a: any) => ({ name: a.name })) 
              : [{ name: song.label || "Unknown Artist" }],
            album: {
              name: albumName,
              images: [{ url: bestImage.url }]
            },
            duration_ms: (song.duration || 180) * 1000,
            streamUrl: bestStream.url
          };
        });

        if (tracks.length > 0) {
          await playTrack(tracks[0], tracks, 0);
        }
      }
    } catch (e) {
      console.error("Failed to load album tracks:", e);
    } finally {
      setLoadingAlbumId(null);
    }
  };

  const handleClear = () => {
    setInputVal("");
    setSearchQuery("");
    setAlbumResults([]);
  };

  const selectCategory = (query: string) => {
    setSearchMode("songs");
    setInputVal(query);
  };

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <View style={styles.trackItem}>
      <TouchableOpacity
        style={styles.trackPressable}
        onPress={() => playTrack(item, searchResults, index)}
      >
        <Image source={{ uri: item.album.images[0]?.url }} style={styles.trackArt} />
        <View style={styles.trackMeta}>
          <Text style={styles.trackName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artists.map((a) => a.name).join(", ")}
          </Text>
        </View>
        <View style={styles.playIconContainer}>
          <Play color="#1db954" fill="#1db954" size={16} />
        </View>
      </TouchableOpacity>

      {playlists.length > 0 && (
        <TouchableOpacity
          onPress={() => setSelectedTrackForPlaylist(item)}
          style={styles.addPlaylistButton}
        >
          <Plus color="#b3b3b3" size={20} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAlbumItem = ({ item }: { item: any }) => {
    const albumArtist = item.artists?.primary?.[0]?.name || "Various Artists";
    const images = item.image || [];
    const albumImage = images[images.length - 1]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300";

    return (
      <View style={styles.trackItem}>
        <TouchableOpacity
          style={styles.trackPressable}
          onPress={() => handlePlayAlbum(item.id, item.name)}
          disabled={loadingAlbumId !== null}
        >
          <Image source={{ uri: albumImage }} style={styles.trackArt} />
          <View style={styles.trackMeta}>
            <Text style={styles.trackName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              Movie/Album • {albumArtist} • {item.year || ""}
            </Text>
          </View>
          {loadingAlbumId === item.id ? (
            <ActivityIndicator size="small" color="#1db954" style={{ marginRight: 8 }} />
          ) : (
            <View style={styles.playIconContainer}>
              <Play color="#1db954" fill="#1db954" size={16} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const isCurrentSearching = searchMode === "songs" ? isSearching : isSearchingAlbums;
  const hasResults = searchMode === "songs" ? searchResults.length > 0 : albumResults.length > 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(10, insets.top) }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Search color="#ffffff" size={20} style={styles.searchIcon} />
          <TextInput
            placeholder={searchMode === "songs" ? "Search for songs..." : "Search for albums or movies..."}
            placeholderTextColor="#777"
            value={inputVal}
            onChangeText={setInputVal}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {inputVal.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <X color="#ffffff" size={18} />
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle Pills */}
        <View style={styles.segmentBar}>
          <TouchableOpacity
            style={[styles.segmentBtn, searchMode === "songs" && styles.segmentBtnActive]}
            onPress={() => setSearchMode("songs")}
          >
            <Text style={[styles.segmentText, searchMode === "songs" && styles.segmentTextActive]}>
              Songs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, searchMode === "albums" && styles.segmentBtnActive]}
            onPress={() => setSearchMode("albums")}
          >
            <Text style={[styles.segmentText, searchMode === "albums" && styles.segmentTextActive]}>
              Albums & Movies
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Body */}
      {isCurrentSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1db954" />
          <Text style={styles.loadingText}>Searching Aura Stream...</Text>
        </View>
      ) : inputVal.trim() === "" ? (
        /* Categories Browse View */
        <FlatList
          key="categories"
          data={CATEGORIES}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.browseContainer}
          ListHeaderComponent={
            <Text style={styles.browseTitle}>Browse all categories</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => selectCategory(item.query)}
            >
              <LinearGradient
                colors={item.color as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoryInner}
              >
                <Text style={styles.categoryText}>{item.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
      ) : !hasResults ? (
        <View style={styles.emptyContainer}>
          <Music color="#b3b3b3" size={48} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your keywords or switching search modes.</Text>
        </View>
      ) : (
        /* Dynamic search lists */
        <FlatList
          key={searchMode}
          data={searchMode === "songs" ? searchResults : albumResults}
          keyExtractor={(item) => item.id}
          renderItem={searchMode === "songs" ? renderTrackItem : renderAlbumItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Quick Add Playlist Dialog */}
      {selectedTrackForPlaylist && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Add to Playlist</Text>
            <Text style={styles.dialogSub} numberOfLines={1}>
              "{selectedTrackForPlaylist.name}"
            </Text>
            <FlatList
              data={playlists}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 200, marginVertical: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dialogPlaylistItem}
                  onPress={() => {
                    addTrackToPlaylist(item.id, selectedTrackForPlaylist);
                    setSelectedTrackForPlaylist(null);
                  }}
                >
                  <Text style={styles.dialogPlaylistName}>{item.name}</Text>
                  <Text style={styles.dialogPlaylistCount}>
                    {item.tracks.length} {item.tracks.length === 1 ? "song" : "songs"}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setSelectedTrackForPlaylist(null)}
              style={styles.dialogCancel}
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "800",
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181818",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    height: "100%",
  },
  clearButton: {
    padding: 6,
  },
  segmentBar: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    backgroundColor: "#181818",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  segmentBtnActive: {
    backgroundColor: "#1db954",
    borderColor: "#1db954",
  },
  segmentText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#000000",
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#b3b3b3",
    marginTop: 12,
    fontSize: 13,
  },
  browseContainer: {
    paddingHorizontal: 14,
    paddingBottom: 140,
  },
  browseTitle: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "700",
    marginHorizontal: 6,
    marginVertical: 14,
  },
  categoryCard: {
    width: "50%",
    padding: 6,
  },
  categoryInner: {
    height: 94,
    borderRadius: 8,
    padding: 12,
    justifyContent: "space-between",
  },
  categoryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  trackPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  trackArt: {
    width: 46,
    height: 46,
    borderRadius: 4,
    marginRight: 12,
  },
  trackMeta: {
    flex: 1,
    justifyContent: "center",
  },
  trackName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  trackArtist: {
    color: "#b3b3b3",
    fontSize: 12,
    marginTop: 2,
  },
  playIconContainer: {
    padding: 8,
    marginRight: 4,
  },
  addPlaylistButton: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    color: "#888888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 16,
  },
  dialogOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
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
    borderColor: "rgba(255, 255, 255, 0.1)",
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
  dialogPlaylistItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dialogPlaylistName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  dialogPlaylistCount: {
    color: "#888",
    fontSize: 11,
  },
  dialogCancel: {
    alignItems: "center",
    paddingTop: 16,
  },
  dialogCancelText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 14,
  },
});
