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
  Platform,
  ToastAndroid,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Search, X, Play, Plus, Music, ListPlus, ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudio, Track } from "@/context/AudioContext";
import { LinearGradient } from "expo-linear-gradient";
import ArtistDetailModal from "@/components/ArtistDetailModal";

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
    addToQueue,
    createPlaylist,
    recentSearches,
    addToRecentSearches,
    removeRecentSearch,
    clearRecentSearches,
  } = useAudio();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [searchMode, setSearchMode] = useState<"songs" | "albums" | "artists">("songs");
  const [albumResults, setAlbumResults] = useState<any[]>([]);
  const [isSearchingAlbums, setIsSearchingAlbums] = useState(false);
  const [artistResults, setArtistResults] = useState<any[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
  const [inlinePlaylistName, setInlinePlaylistName] = useState("");
  const [isCreatingInline, setIsCreatingInline] = useState(false);

  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [selectedAlbumTracks, setSelectedAlbumTracks] = useState<Track[]>([]);
  const [loadingAlbumDetails, setLoadingAlbumDetails] = useState(false);

  const [selectedArtist, setSelectedArtist] = useState<any | null>(null);

  // Trigger search when input query or mode shifts
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(inputVal);
      if (searchMode === "songs") {
        performSearch(inputVal);
      } else if (searchMode === "albums") {
        performAlbumSearch(inputVal);
      } else {
        performArtistSearch(inputVal);
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

  const performArtistSearch = async (query: string) => {
    if (!query.trim()) {
      setArtistResults([]);
      return;
    }
    setIsSearchingArtists(true);
    try {
      let json;
      try {
        const res = await fetch(`https://saavn.sumit.co/api/search/artists?query=${encodeURIComponent(query)}`);
        if (res.ok) json = await res.json();
      } catch (e) {
        console.warn("Artist search failed, trying backup");
      }

      if (json && json.success && json.data?.results) {
        setArtistResults(json.data.results);
      } else {
        setArtistResults([]);
      }
    } catch (e) {
      console.error("Artist search failed:", e);
      setArtistResults([]);
    } finally {
      setIsSearchingArtists(false);
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

    const handleViewAlbum = async (album: any) => {
      const albumArtist = album.artists?.primary?.[0]?.name || "Various Artists";
      const images = album.image || [];
      const albumImage = images[images.length - 1]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300";

      setSelectedAlbum({
        id: album.id,
        name: album.name,
        artist: albumArtist,
        image: albumImage,
        year: album.year || ""
      });
      setLoadingAlbumDetails(true);
      setSelectedAlbumTracks([]);

      try {
        let json;
        try {
          const res = await fetch(`https://saavn.dev/api/albums?id=${album.id}`);
          if (res.ok) json = await res.json();
        } catch (e) {
          console.warn("saavn.dev album details failed, trying backup");
        }

        if (!json || !json.success) {
          const res = await fetch(`https://saavn.sumit.co/api/albums?id=${album.id}`);
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
                name: album.name,
                images: [{ url: bestImage.url }]
              },
              duration_ms: (song.duration || 180) * 1000,
              streamUrl: bestStream.url
            };
          });
          setSelectedAlbumTracks(tracks);
        }
      } catch (e) {
        console.error("Failed to load album tracks details:", e);
        Alert.alert("Error", "Could not load album tracks.");
      } finally {
        setLoadingAlbumDetails(false);
      }
    };

  const handleClear = () => {
    setInputVal("");
    setSearchQuery("");
    setAlbumResults([]);
    setArtistResults([]);
  };

  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
    if (Platform.OS === "android") {
      ToastAndroid.show("Added to queue", ToastAndroid.SHORT);
    } else {
      Alert.alert("Added to queue", `"${track.name}" added to queue.`);
    }
  };

  const handleViewArtist = (artist: any) => {
    setSelectedArtist(artist);
  };

  const selectCategory = (query: string) => {
    setSearchMode("songs");
    setInputVal(query);
  };

  const renderRecentSearches = () => {
    if (recentSearches.length === 0) return null;
    return (
      <View style={styles.recentContainer}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <TouchableOpacity onPress={clearRecentSearches} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScrollContent}>
          {recentSearches.map((query, index) => (
            <View key={query + index} style={styles.recentPill}>
              <TouchableOpacity
                style={styles.recentPillPressable}
                onPress={() => setInputVal(query)}
              >
                <Text style={styles.recentPillText} numberOfLines={1}>
                  {query}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recentPillClose}
                onPress={() => removeRecentSearch(query)}
              >
                <X color="#b3b3b3" size={14} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <View style={styles.trackItem}>
      <TouchableOpacity
        style={styles.trackPressable}
        onPress={() => {
          playTrack(item, searchResults, index);
          if (inputVal.trim()) addToRecentSearches(inputVal);
        }}
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

      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => handleAddToQueue(item)}
          style={styles.addQueueButton}
        >
          <ListPlus color="#b3b3b3" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedTrackForPlaylist(item)}
          style={styles.addPlaylistButton}
        >
          <Plus color="#b3b3b3" size={20} />
        </TouchableOpacity>
      </View>
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
          onPress={() => {
            handleViewAlbum(item);
            if (inputVal.trim()) addToRecentSearches(inputVal);
          }}
          disabled={loadingAlbumDetails}
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
          {selectedAlbum?.id === item.id && loadingAlbumDetails ? (
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

  const renderArtistItem = ({ item }: { item: any }) => {
    const images = Array.isArray(item.image) ? item.image : [];
    const artistImage = images.length > 0 ? (images[images.length - 1]?.url || images[0]?.url) : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150";

    return (
      <View style={styles.trackItem}>
        <TouchableOpacity
          style={styles.trackPressable}
          onPress={() => {
            handleViewArtist(item);
            if (inputVal.trim()) addToRecentSearches(inputVal);
          }}
        >
          <Image source={{ uri: artistImage }} style={styles.artistAvatar} />
          <View style={styles.trackMeta}>
            <Text style={styles.trackName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              Artist
            </Text>
          </View>
          <View style={styles.playIconContainer}>
            <Play color="#1db954" fill="#1db954" size={16} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const isCurrentSearching = searchMode === "songs" ? isSearching : (searchMode === "albums" ? isSearchingAlbums : isSearchingArtists);
  const hasResults = searchMode === "songs" ? searchResults.length > 0 : (searchMode === "albums" ? albumResults.length > 0 : artistResults.length > 0);

  return (
    <View style={[styles.container, { paddingTop: Math.max(10, insets.top) }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Search color="#ffffff" size={20} style={styles.searchIcon} />
          <TextInput
            placeholder={searchMode === "songs" ? "Search for songs..." : (searchMode === "albums" ? "Search for albums or movies..." : "Search for singers...")}
            placeholderTextColor="#777"
            value={inputVal}
            onChangeText={setInputVal}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (inputVal.trim()) addToRecentSearches(inputVal);
            }}
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
              Albums
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, searchMode === "artists" && styles.segmentBtnActive]}
            onPress={() => setSearchMode("artists")}
          >
            <Text style={[styles.segmentText, searchMode === "artists" && styles.segmentTextActive]}>
              Artists
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Body */}
      {isCurrentSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1db954" />
          <Text style={styles.loadingText}>Searching RohiBeatz...</Text>
        </View>
      ) : inputVal.trim() === "" ? (
        /* Categories Browse View */
        <FlatList
          key="categories"
          data={CATEGORIES}
          keyExtractor={(item) => item.name}
          numColumns={2}
          contentContainerStyle={styles.browseContainer}
          ListHeaderComponent={renderRecentSearches}
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
          data={searchMode === "songs" ? searchResults : (searchMode === "albums" ? albumResults : artistResults)}
          keyExtractor={(item) => item.id}
          renderItem={searchMode === "songs" ? renderTrackItem : (searchMode === "albums" ? renderAlbumItem : renderArtistItem)}
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

            {/* Inline Playlist Creator */}
            {isCreatingInline ? (
              <View style={styles.inlineCreator}>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="New Playlist Name"
                  placeholderTextColor="#777"
                  value={inlinePlaylistName}
                  onChangeText={setInlinePlaylistName}
                  autoFocus
                  maxLength={32}
                />
                <View style={styles.inlineCreatorButtons}>
                  <TouchableOpacity
                    onPress={() => {
                      setInlinePlaylistName("");
                      setIsCreatingInline(false);
                    }}
                    style={[styles.inlineBtn, styles.inlineBtnCancel]}
                  >
                    <Text style={styles.inlineBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!inlinePlaylistName.trim()) return;
                      await createPlaylist(inlinePlaylistName.trim(), selectedTrackForPlaylist);
                      setInlinePlaylistName("");
                      setIsCreatingInline(false);
                      setSelectedTrackForPlaylist(null);
                      if (Platform.OS === "android") {
                        ToastAndroid.show("Playlist created & song added", ToastAndroid.SHORT);
                      }
                    }}
                    style={[styles.inlineBtn, styles.inlineBtnCreate]}
                  >
                    <Text style={styles.inlineBtnCreateText}>Create & Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {playlists.length === 0 ? (
                  <View style={styles.dialogEmpty}>
                    <Text style={styles.dialogEmptyText}>You don't have any playlists yet.</Text>
                    <TouchableOpacity
                      onPress={() => setIsCreatingInline(true)}
                      style={styles.createInlineBtn}
                    >
                      <Text style={styles.createInlineBtnText}>Create New Playlist</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setIsCreatingInline(true)}
                      style={styles.dialogCreateLink}
                    >
                      <Text style={styles.dialogCreateLinkText}>+ Create New Playlist</Text>
                    </TouchableOpacity>

                    <FlatList
                      data={playlists}
                      keyExtractor={(p) => p.id}
                      style={{ maxHeight: 180, marginVertical: 8 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.dialogPlaylistItem}
                          onPress={() => {
                            addTrackToPlaylist(item.id, selectedTrackForPlaylist);
                            setSelectedTrackForPlaylist(null);
                            if (Platform.OS === "android") {
                              ToastAndroid.show(`Added to ${item.name}`, ToastAndroid.SHORT);
                            }
                          }}
                        >
                          <Text style={styles.dialogPlaylistName}>{item.name}</Text>
                          <Text style={styles.dialogPlaylistCount}>
                            {item.tracks.length} {item.tracks.length === 1 ? "song" : "songs"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </>
                )}
              </>
            )}

            {!isCreatingInline && (
              <TouchableOpacity
                onPress={() => setSelectedTrackForPlaylist(null)}
                style={styles.dialogCancel}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Album Songs Detail Modal */}
      <Modal
        visible={selectedAlbum !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedAlbum(null)}
      >
        <LinearGradient
          colors={["#0d1117", "#000000"]}
          style={[styles.modalContainer, { paddingTop: insets.top }]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedAlbum(null)} style={styles.modalBackButton}>
              <ChevronLeft color="#ffffff" size={24} />
              <Text style={styles.modalBackText}>Back to Search</Text>
            </TouchableOpacity>
          </View>

          {loadingAlbumDetails ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#1db954" />
              <Text style={styles.modalLoadingText}>Loading album tracks...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {selectedAlbum && (
                <View style={styles.modalHero}>
                  <Image source={{ uri: selectedAlbum.image }} style={styles.modalHeroArt} />
                  <Text style={styles.modalHeroTitle}>{selectedAlbum.name}</Text>
                  <Text style={styles.modalHeroSubtitle}>
                    {selectedAlbum.artist} • {selectedAlbum.year}
                  </Text>
                  <Text style={styles.modalHeroCount}>
                    {selectedAlbumTracks.length} {selectedAlbumTracks.length === 1 ? "song" : "songs"}
                  </Text>
                </View>
              )}

              {/* Tracks List */}
              <View style={styles.modalSongsList}>
                {selectedAlbumTracks.map((item, index) => (
                  <View key={item.id} style={styles.modalSongRow}>
                    <TouchableOpacity
                      style={styles.modalSongPressable}
                      onPress={() => {
                        playTrack(item, selectedAlbumTracks, index);
                        setSelectedAlbum(null); // Close modal when track starts playing
                      }}
                    >
                      <View style={styles.modalSongIndexContainer}>
                        <Text style={styles.modalSongIndex}>{index + 1}</Text>
                      </View>
                      <View style={styles.modalSongMeta}>
                        <Text style={styles.modalSongTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.modalSongArtist} numberOfLines={1}>
                          {item.artists.map((a) => a.name).join(", ")}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.modalSongActions}>
                      <TouchableOpacity
                        onPress={() => handleAddToQueue(item)}
                        style={styles.modalSongBtn}
                      >
                        <ListPlus color="#b3b3b3" size={20} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setSelectedTrackForPlaylist(item);
                        }}
                        style={styles.modalSongBtn}
                      >
                        <Plus color="#b3b3b3" size={20} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </LinearGradient>
      </Modal>

      {/* Artist Detail Modal Overlay */}
      <ArtistDetailModal
        visible={selectedArtist !== null}
        artistId={selectedArtist?.id}
        artistName={selectedArtist?.name}
        artistImage={selectedArtist?.image?.[selectedArtist.image.length - 1]?.url || selectedArtist?.image?.[0]?.url}
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
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  addQueueButton: {
    padding: 10,
    marginRight: 2,
  },
  dialogInput: {
    backgroundColor: "#2c2c2e",
    color: "#ffffff",
    fontSize: 14,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  inlineCreator: {
    marginVertical: 8,
  },
  inlineCreatorButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  inlineBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  inlineBtnCancel: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  inlineBtnCancelText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  inlineBtnCreate: {
    backgroundColor: "#1db954",
  },
  inlineBtnCreateText: {
    color: "#000000",
    fontWeight: "700",
  },
  dialogEmpty: {
    alignItems: "center",
    paddingVertical: 16,
  },
  dialogEmptyText: {
    color: "#b3b3b3",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  createInlineBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  createInlineBtnText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 13,
  },
  dialogCreateLink: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    marginBottom: 8,
  },
  dialogCreateLinkText: {
    color: "#1db954",
    fontWeight: "700",
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  modalBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalBackText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  modalLoadingText: {
    color: "#b3b3b3",
    fontSize: 14,
  },
  modalScrollContent: {
    paddingBottom: 100,
  },
  modalHero: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  modalHeroArt: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  modalHeroTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  modalHeroSubtitle: {
    color: "#b3b3b3",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  modalHeroCount: {
    color: "#1db954",
    fontSize: 13,
    fontWeight: "700",
  },
  modalSongsList: {
    paddingHorizontal: 16,
  },
  modalSongRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.03)",
  },
  modalSongPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  modalSongIndexContainer: {
    width: 32,
    alignItems: "center",
  },
  modalSongIndex: {
    color: "#b3b3b3",
    fontSize: 14,
    fontWeight: "500",
  },
  modalSongMeta: {
    flex: 1,
    marginLeft: 8,
  },
  modalSongTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  modalSongArtist: {
    color: "#b3b3b3",
    fontSize: 13,
    marginTop: 2,
  },
  modalSongActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalSongBtn: {
    padding: 8,
  },
  artistAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  recentContainer: {
    paddingHorizontal: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "700",
  },
  clearAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  recentScrollContent: {
    paddingVertical: 4,
    gap: 8,
  },
  recentPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingLeft: 14,
    paddingRight: 8,
    height: 36,
    gap: 8,
  },
  recentPillPressable: {
    justifyContent: "center",
  },
  recentPillText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 120,
  },
  recentPillClose: {
    padding: 4,
  },
});
