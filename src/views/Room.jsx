import React, { useState } from "react";
import { useSpotify } from "../SpotifyContext";
import { Users, Music, Radio, Play, Pause, LogOut, Copy, Check } from "lucide-react";
import "./Room.css";

const Room = () => {
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
  } = useSpotify();

  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = () => {
    try {
      createRoom();
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (joinCode.trim().length !== 6) return;
    joinRoom(joinCode.trim().toUpperCase());
    setJoinCode("");
  };

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="room-view animate-fade-in">
      <div className="room-header">
        <h1 className="room-title">Social Listening Room</h1>
        <p className="room-subtitle">Listen along and sync music in real-time with friends.</p>
      </div>

      {!roomId ? (
        <div className="room-setup-grid">
          <div className="room-setup-card">
            <div className="icon-wrapper host-color">
              <Radio size={36} />
            </div>
            <h2>Host a Session</h2>
            <p>
              Create an isolated listening channel, share the room code, and control the playback. Anyone who joins will hear what you play in perfect synchronization.
            </p>
            <button className="room-btn host-btn" onClick={handleCreateRoom}>
              Start Session
            </button>
          </div>

          <div className="room-setup-card">
            <div className="icon-wrapper join-color">
              <Users size={36} />
            </div>
            <h2>Join a Session</h2>
            <p>
              Enter a 6-character room code shared by a friend to sync your local audio queue and timeline to their player.
            </p>
            <form onSubmit={handleJoinRoom} className="join-form">
              <input
                type="text"
                className="join-input"
                placeholder="ENTER 6-CHARACTER CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                type="submit"
                className="room-btn join-btn"
                disabled={joinCode.trim().length !== 6}
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="active-room-layout">
          <div className="active-room-main">
            {/* Room Info card */}
            <div className="room-info-card">
              <div className="room-info-header">
                <div>
                  <span className="room-label">ROOM CODE</span>
                  <div className="room-code-display" onClick={handleCopyCode} title="Click to copy code">
                    <h2>{roomId}</h2>
                    <button className="copy-btn">
                      {copied ? <Check size={18} className="copy-success" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <button className="leave-room-btn" onClick={leaveRoom}>
                  <LogOut size={16} />
                  Leave Room
                </button>
              </div>

              <div className="badge-row">
                <span className={`role-badge ${isHost ? "host" : "listener"}`}>
                  {isHost ? "Hosting Session" : "Listening Session"}
                </span>
              </div>
            </div>

            {/* Playback card */}
            <div className="room-playback-card">
              <h3>Playback Sync Status</h3>
              {currentTrack ? (
                <div className="sync-track-info">
                  <div className="sync-track-details">
                    <div className="track-icon-wrapper">
                      <Music size={24} />
                    </div>
                    <div>
                      <div className="sync-track-name">{currentTrack.name}</div>
                      <div className="sync-track-artist">
                        {currentTrack.artists?.map((a) => a.name).join(", ") || "Unknown Artist"}
                      </div>
                    </div>
                  </div>

                  <div className="sync-play-indicator">
                    {isPlaying ? (
                      <span className="sync-status active">
                        <Play size={14} fill="currentColor" /> Synced & Playing
                      </span>
                    ) : (
                      <span className="sync-status paused">
                        <Pause size={14} fill="currentColor" /> Synced & Paused
                      </span>
                    )}
                  </div>

                  <div className="sync-timeline">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-filled"
                        style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="sync-timestamps">
                      <span>{formatTime(progress)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-sync-track">
                  <p>No active music track is currently synced in this room.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Participants */}
          <div className="active-room-sidebar">
            <div className="participants-card">
              <h3>Participants ({roomUsers.length})</h3>
              <div className="participants-list">
                {roomUsers.map((user, idx) => (
                  <div key={`${user}_${idx}`} className="participant-item">
                    <div className="participant-avatar">
                      {user.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="participant-name-wrapper">
                      <span className="participant-name">{user}</span>
                      {idx === 0 && <span className="participant-host-tag">Host</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
