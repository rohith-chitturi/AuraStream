import React, { useState, useEffect } from "react";
import { useSpotify } from "../SpotifyContext";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Volume1,
  VolumeX,
  Loader,
  AlertCircle
} from "lucide-react";
import { formatDuration } from "./SongRow";
import "./Player.css";

const Player = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    playbackError,
    progress,
    duration,
    volume,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    changeVolume
  } = useSpotify();

  const [prevVolume, setPrevVolume] = useState(0.5);

  const handleVolumeMuteToggle = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      changeVolume(0);
    } else {
      changeVolume(prevVolume);
    }
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={20} />;
    if (volume < 0.5) return <Volume1 size={20} />;
    return <Volume2 size={20} />;
  };

  // Percent progress for slider styling
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const volumePercent = volume * 100;

  if (!currentTrack) {
    return (
      <div className="player-bar-placeholder glassmorphism">
        <p>Select a track to start listening for free</p>
      </div>
    );
  }

  const albumImage =
    currentTrack.album?.images && currentTrack.album.images.length > 0
      ? currentTrack.album.images[0].url
      : "";

  const artistsList = currentTrack.artists
    ? currentTrack.artists.map((artist) => artist.name).join(", ")
    : "Unknown Artist";

  return (
    <footer className="player-bar glassmorphism">
      {/* Left side: Track Info */}
      <div className="player-track-info">
        {albumImage && (
          <img
            src={albumImage}
            alt={currentTrack.name}
            className="player-album-art"
          />
        )}
        <div className="player-song-details">
          <h4 className="player-song-title ellipsis" title={currentTrack.name}>
            {currentTrack.name}
          </h4>
          <p className="player-song-artists ellipsis" title={artistsList}>
            {artistsList}
          </p>
        </div>
      </div>

      {/* Middle: Controls & Progress */}
      <div className="player-controls-container">
        <div className="player-buttons">
          <button className="control-btn" onClick={playPrevious} title="Previous">
            <SkipBack size={20} />
          </button>
          
          <button
            className="play-pause-btn"
            onClick={togglePlay}
            disabled={isLoading}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <Loader size={20} className="spinner" />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="play-icon-offset" />
            )}
          </button>

          <button className="control-btn" onClick={playNext} title="Next">
            <SkipForward size={20} />
          </button>
        </div>

        <div className="progress-bar-container">
          <span className="time-text">{formatDuration(progress * 1000)}</span>
          <div className="slider-wrapper">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="progress-slider"
              style={{
                background: `linear-gradient(to right, var(--spotify-green) 0%, var(--spotify-green) ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>
          <span className="time-text">{formatDuration(duration * 1000)}</span>
        </div>
      </div>

      {/* Right side: Volume & Errors */}
      <div className="player-actions-container">
        {playbackError && (
          <div className="playback-error-toast" title={playbackError}>
            <AlertCircle size={16} className="error-icon" />
            <span className="error-message hide-mobile">{playbackError}</span>
          </div>
        )}
        
        <div className="volume-control">
          <button className="volume-btn" onClick={handleVolumeMuteToggle}>
            {getVolumeIcon()}
          </button>
          <div className="slider-wrapper volume-slider-wrapper">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              className="volume-slider"
              style={{
                background: `linear-gradient(to right, var(--text-primary) 0%, var(--text-primary) ${volumePercent}%, rgba(255,255,255,0.1) ${volumePercent}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Player;
