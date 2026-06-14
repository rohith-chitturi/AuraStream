import React from "react";
import { useSpotify } from "../SpotifyContext";
import { Play, Volume2 } from "lucide-react";
import "./SongRow.css";

// Helper to convert milliseconds to MM:SS format
export const formatDuration = (ms) => {
  if (!ms) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const SongRow = ({ track, index, queue = [] }) => {
  const { playTrack, currentTrack, isPlaying, togglePlay } = useSpotify();

  const isCurrentTrack = currentTrack?.id === track.id;

  const handleRowClick = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else {
      playTrack(track, queue, index);
    }
  };

  // Get image URL
  const albumImage =
    track.album?.images && track.album.images.length > 0
      ? track.album.images[track.album.images.length - 1].url // Smallest image
      : "";

  // Get artists list string
  const artistsList = track.artists
    ? track.artists.map((artist) => artist.name).join(", ")
    : "Unknown Artist";

  return (
    <div
      className={`song-row ${isCurrentTrack ? "active-row" : ""}`}
      onClick={handleRowClick}
    >
      <div className="song-row-number">
        {isCurrentTrack && isPlaying ? (
          <Volume2 size={16} className="playing-volume-icon" />
        ) : (
          <>
            <span className="row-index">{index + 1}</span>
            <Play size={16} className="row-play-icon" />
          </>
        )}
      </div>

      {albumImage && (
        <img src={albumImage} alt={track.name} className="song-row-album-art" />
      )}

      <div className="song-row-info">
        <h4 className="song-row-title ellipsis">{track.name}</h4>
        <p className="song-row-artists ellipsis">{artistsList}</p>
      </div>

      <div className="song-row-album hide-mobile ellipsis">
        {track.album?.name || ""}
      </div>

      <div className="song-row-duration">
        {formatDuration(track.duration_ms)}
      </div>
    </div>
  );
};

export default SongRow;
