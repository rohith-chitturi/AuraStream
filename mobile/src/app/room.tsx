import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudio } from "@/context/AudioContext";
import { LinearGradient } from "expo-linear-gradient";
import { Users, Music, LogOut, Radio, Play, Pause, ChevronRight } from "lucide-react-native";

export default function RoomScreen() {
  const insets = useSafeAreaInsets();
  const {
    roomId,
    roomUsers,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    currentTrack,
    isPlaying,
    progress,
    duration,
  } = useAudio();

  const [joinCode, setJoinCode] = useState("");

  const handleCreateRoom = () => {
    try {
      createRoom();
    } catch (err) {
      Alert.alert("Error", "Could not create listening room.");
    }
  };

  const handleJoinRoom = () => {
    if (joinCode.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter a 6-character room code.");
      return;
    }
    try {
      joinRoom(joinCode.trim());
      setJoinCode("");
    } catch (err) {
      Alert.alert("Error", "Could not join listening room.");
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <LinearGradient
      colors={["#0d1117", "#000000"]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Group Session</Text>
        <Text style={styles.subtitle}>Listen to music in sync with friends</Text>
      </View>

      {!roomId ? (
        <ScrollView contentContainerStyle={styles.centerContainer}>
          <View style={styles.card}>
            <Radio color="#1db954" size={48} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Host a Session</Text>
            <Text style={styles.cardDescription}>
              Create a group session, share your code, and play music. Your friends can listen along in real-time.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleCreateRoom}>
              <Text style={styles.buttonText}>Start a Session</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Users color="#8b5cf6" size={48} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Join a Session</Text>
            <Text style={styles.cardDescription}>
              Enter a 6-character code from a friend to slave your playback to theirs.
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="ENTER CODE"
                placeholderTextColor="#666"
                value={joinCode}
                onChangeText={(txt) => setJoinCode(txt.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={[styles.button, styles.joinButton]} onPress={handleJoinRoom}>
                <ChevronRight color="#fff" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.activeContainer}>
          {/* Room Details */}
          <View style={styles.roomCodeCard}>
            <View style={styles.roomCodeHeader}>
              <View>
                <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
                <Text style={styles.roomCode}>{roomId}</Text>
              </View>
              <TouchableOpacity style={styles.leaveButton} onPress={leaveRoom}>
                <LogOut color="#ef4444" size={20} />
                <Text style={styles.leaveText}>Leave</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.roleBadgeContainer}>
              <View style={[styles.roleBadge, isHost ? styles.hostBadge : styles.peerBadge]}>
                <Text style={styles.roleText}>{isHost ? "HOST" : "LISTENING"}</Text>
              </View>
            </View>
          </View>

          {/* Player Sync Status */}
          <View style={styles.syncCard}>
            <Text style={styles.sectionTitle}>Playback Sync</Text>
            {currentTrack ? (
              <View style={styles.trackDetails}>
                <Music color="#1db954" size={24} style={styles.trackIcon} />
                <View style={styles.trackText}>
                  <Text style={styles.trackName} numberOfLines={1}>
                    {currentTrack.name}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {currentTrack.artists.map((a) => a.name).join(", ")}
                  </Text>
                </View>
                {isPlaying ? (
                  <Play color="#1db954" size={20} />
                ) : (
                  <Pause color="#b3b3b3" size={20} />
                )}
              </View>
            ) : (
              <Text style={styles.noTrackText}>No song currently playing</Text>
            )}

            {currentTrack && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${(progress / (duration || 1)) * 100}%` },
                    ]}
                  />
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>{formatTime(progress)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Members list */}
          <View style={styles.membersCard}>
            <Text style={styles.sectionTitle}>Participants ({roomUsers.length})</Text>
            {roomUsers.map((user, index) => (
              <View key={`${user}_${index}`} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {user.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>{user}</Text>
                {index === 0 && <Text style={styles.hostLabel}>Host</Text>}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#b3b3b3",
    marginTop: 4,
  },
  centerContainer: {
    padding: 24,
    gap: 24,
    paddingBottom: 120,
  },
  activeContainer: {
    padding: 24,
    gap: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#b3b3b3",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1db954",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 24,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 2,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  joinButton: {
    paddingHorizontal: 16,
    aspectRatio: 1,
    borderRadius: 24,
  },
  roomCodeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  roomCodeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomCodeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1db954",
    letterSpacing: 1,
  },
  roomCode: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
    marginTop: 4,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  leaveText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
  },
  roleBadgeContainer: {
    flexDirection: "row",
    marginTop: 16,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  hostBadge: {
    backgroundColor: "rgba(29, 185, 84, 0.2)",
  },
  peerBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
  syncCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  trackDetails: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 12,
  },
  trackIcon: {
    marginRight: 12,
  },
  trackText: {
    flex: 1,
    marginRight: 12,
  },
  trackName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  trackArtist: {
    fontSize: 13,
    color: "#b3b3b3",
    marginTop: 2,
  },
  noTrackText: {
    color: "#b3b3b3",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#1db954",
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
    color: "#b3b3b3",
  },
  membersCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  hostLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1db954",
    backgroundColor: "rgba(29, 185, 84, 0.1)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
});
