import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, FolderPlus, Trash2, ChevronLeft, Play, Music, ArrowRight } from "lucide-react-native";
import { useAudio, Playlist, Track } from "@/context/AudioContext";

const { width } = Dimensions.get("window");

export default function LibraryScreen() {
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    playTrack,
  } = useAudio();

  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setCreateModalVisible(false);
  };

  const handleDeletePlaylist = async (id: string) => {
    await deletePlaylist(id);
    if (activePlaylist && activePlaylist.id === id) {
      setActivePlaylist(null);
    }
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    if (playlist.tracks.length === 0) return;
    await playTrack(playlist.tracks[0], playlist.tracks, 0);
  };

  // Sync active playlist state when context updates (e.g. tracks added/removed)
  const currentActivePlaylist = activePlaylist
    ? playlists.find((p) => p.id === activePlaylist.id) || null
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {currentActivePlaylist ? (
        /* Playlist Detail Subview */
        <View style={styles.detailContainer}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setActivePlaylist(null)} style={styles.backButton}>
              <ChevronLeft color="#ffffff" size={24} />
              <Text style={styles.backText}>Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeletePlaylist(currentActivePlaylist.id)}
              style={styles.deletePlaylistButton}
            >
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>

          {/* Playlist Info */}
          <View style={styles.playlistHero}>
            <View style={styles.heroArtContainer}>
              {currentActivePlaylist.tracks.length > 0 ? (
                <Image
                  source={{ uri: currentActivePlaylist.tracks[0].album.images[0]?.url }}
                  style={styles.heroArt}
                />
              ) : (
                <View style={styles.heroArtPlaceholder}>
                  <Music color="#b3b3b3" size={40} />
                </View>
              )}
            </View>
            <Text style={styles.heroName}>{currentActivePlaylist.name}</Text>
            <Text style={styles.heroCount}>
              {currentActivePlaylist.tracks.length}{" "}
              {currentActivePlaylist.tracks.length === 1 ? "song" : "songs"}
            </Text>

            {currentActivePlaylist.tracks.length > 0 && (
              <TouchableOpacity
                onPress={() => handlePlayPlaylist(currentActivePlaylist)}
                style={styles.playButton}
              >
                <Play color="#000000" fill="#000000" size={20} />
                <Text style={styles.playButtonText}>PLAY</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Songs List */}
          {currentActivePlaylist.tracks.length === 0 ? (
            <View style={styles.emptyDetailState}>
              <Music color="#444" size={48} />
              <Text style={styles.emptyDetailText}>This playlist is empty</Text>
              <Text style={styles.emptyDetailSub}>
                Search for songs and tap the '+' button to add them here!
              </Text>
            </View>
          ) : (
            <FlatList
              data={currentActivePlaylist.tracks}
              keyExtractor={(item, index) => `${item.id}_${index}`}
              contentContainerStyle={{ paddingBottom: 140 }}
              renderItem={({ item, index }) => (
                <View style={styles.songRow}>
                  <TouchableOpacity
                    style={styles.songPressable}
                    onPress={() => playTrack(item, currentActivePlaylist.tracks, index)}
                  >
                    <Image
                      source={{ uri: item.album.images[0]?.url }}
                      style={styles.songArt}
                    />
                    <View style={styles.songMeta}>
                      <Text style={styles.songTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {item.artists.map((a) => a.name).join(", ")}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      removeTrackFromPlaylist(currentActivePlaylist.id, item.id)
                    }
                    style={styles.songRemove}
                  >
                    <Trash2 color="#b3b3b3" size={18} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      ) : (
        /* Library Playlists List View */
        <View style={styles.listContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Your Library</Text>
            <TouchableOpacity
              onPress={() => setCreateModalVisible(true)}
              style={styles.addButton}
            >
              <Plus color="#ffffff" size={24} />
            </TouchableOpacity>
          </View>

          {playlists.length === 0 ? (
            <View style={styles.emptyState}>
              <FolderPlus color="#1db954" size={64} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>Create your first playlist</Text>
              <Text style={styles.emptySubText}>
                Keep track of your favorite tracks offline. Add songs directly from search results.
              </Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Create Playlist</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 140 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistRow}
                  onPress={() => setActivePlaylist(item)}
                >
                  <View style={styles.playlistArtContainer}>
                    {item.tracks.length > 0 ? (
                      <Image
                        source={{ uri: item.tracks[0].album.images[0]?.url }}
                        style={styles.playlistArt}
                      />
                    ) : (
                      <View style={styles.playlistArtPlaceholder}>
                        <Music color="#b3b3b3" size={20} />
                      </View>
                    )}
                  </View>
                  <View style={styles.playlistMeta}>
                    <Text style={styles.playlistName}>{item.name}</Text>
                    <Text style={styles.playlistCount}>
                      Playlist • {item.tracks.length}{" "}
                      {item.tracks.length === 1 ? "song" : "songs"}
                    </Text>
                  </View>
                  <ArrowRight color="#444" size={18} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {/* Create Playlist Prompt Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Give your playlist a name</Text>
            <TextInput
              style={styles.modalInput}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="My Playlist"
              placeholderTextColor="#777"
              autoFocus
              maxLength={32}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setNewPlaylistName("");
                  setCreateModalVisible(false);
                }}
                style={[styles.modalBtn, styles.modalBtnCancel]}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePlaylist}
                style={[styles.modalBtn, styles.modalBtnCreate]}
              >
                <Text style={styles.modalBtnCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  listContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "800",
  },
  addButton: {
    padding: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubText: {
    color: "#b3b3b3",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  createBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  createBtnText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 14,
  },
  playlistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  playlistArtContainer: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 16,
  },
  playlistArt: {
    width: "100%",
    height: "100%",
  },
  playlistArtPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  playlistMeta: {
    flex: 1,
  },
  playlistName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  playlistCount: {
    color: "#b3b3b3",
    fontSize: 12,
    marginTop: 4,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  deletePlaylistButton: {
    padding: 8,
  },
  playlistHero: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  heroArtContainer: {
    width: 150,
    height: 150,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  heroArt: {
    width: "100%",
    height: "100%",
  },
  heroArtPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#181818",
    justifyContent: "center",
    alignItems: "center",
  },
  heroName: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  heroCount: {
    color: "#b3b3b3",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 16,
  },
  playButton: {
    flexDirection: "row",
    backgroundColor: "#1db954",
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 24,
    alignItems: "center",
    gap: 8,
  },
  playButtonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1,
  },
  emptyDetailState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyDetailText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyDetailSub: {
    color: "#888888",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  songPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  songArt: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginRight: 12,
  },
  songMeta: {
    flex: 1,
    justifyContent: "center",
  },
  songTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  songArtist: {
    color: "#b3b3b3",
    fontSize: 12,
    marginTop: 2,
  },
  songRemove: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    padding: 24,
    width: width - 64,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#2c2c2e",
    color: "#ffffff",
    fontSize: 15,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  modalBtnCancel: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modalBtnCancelText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  modalBtnCreate: {
    marginLeft: 8,
    backgroundColor: "#ffffff",
  },
  modalBtnCreateText: {
    color: "#000000",
    fontWeight: "700",
  },
});
