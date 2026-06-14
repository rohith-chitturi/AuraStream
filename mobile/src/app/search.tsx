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
  SafeAreaView,
  Keyboard,
  Dimensions,
} from "react-native";
import { Search, X, Play, Plus, Music } from "lucide-react-native";
import { useAudio, Track } from "@/context/AudioContext";
import { LinearGradient } from "expo-linear-gradient";
import PlayerView from "@/components/PlayerView";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  { name: "Pop", color: ["#d946ef", "#8b5cf6"], query: "pop hits 2026" },
  { name: "Hip-Hop", color: ["#ef4444", "#f97316"], query: "hip hop rap" },
  { name: "Electronic", color: ["#3b82f6", "#06b6d4"], query: "edm electronic dance" },
  { name: "Rock", color: ["#eab308", "#ca8a04"], query: "rock classics" },
  { name: "Lofi", color: ["#10b981", "#059669"], query: "lofi beats chill" },
  { name: "Jazz", color: ["#6366f1", "#4f46e5"], query: "jazz classic instrumental" },
];

export default function SearchScreen() {
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
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(inputVal);
      performSearch(inputVal);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [inputVal]);

  const handleClear = () => {
    setInputVal("");
    setSearchQuery("");
    performSearch("");
  };

  const selectCategory = (query: string) => {
    setInputVal(query);
    setSearchQuery(query);
    performSearch(query);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Search color="#ffffff" size={20} style={styles.searchIcon} />
          <TextInput
            placeholder="What do you want to listen to?"
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
      </View>

      {/* Main Content */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1db954" />
          <Text style={styles.loadingText}>Searching Aura Stream...</Text>
        </View>
      ) : inputVal.trim() === "" ? (
        /* Categories Browse View */
        <FlatList
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
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Music color="#b3b3b3" size={48} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your keywords or checking your internet connection.</Text>
        </View>
      ) : (
        /* Search Results List */
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderTrackItem}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
