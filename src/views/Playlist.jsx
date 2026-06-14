import React, { useState, useEffect } from "react";
import { useSpotify } from "../SpotifyContext";
import { getPlaylistDetails, getAlbumDetails } from "../spotify";
import SongRow from "../components/SongRow";
import { Play, Pause, Clock, Music } from "lucide-react";
import "./Playlist.css";

const Playlist = () => {
  const {
    view,
    viewId,
    token,
    currentTrack,
    isPlaying,
    togglePlay,
    playTrack,
    setActivePlaylist
  } = useSpotify();

  const [details, setDetails] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewId || !token) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        let data;
        let normalizedTracks = [];

        if (view === "playlist") {
          data = await getPlaylistDetails(viewId, token);
          setDetails({
            name: data.name,
            description: data.description,
            image: data.images?.[0]?.url || "",
            owner: data.owner?.display_name || "Spotify",
            type: "PLAYLIST",
            id: data.id
          });
          // Normalizing track objects (playlist tracks are nested inside `item.track`)
          normalizedTracks = data.tracks?.items
            .map((item) => item.track)
            .filter((t) => t !== null); // Filter out local/removed tracks
        } else if (view === "album") {
          data = await getAlbumDetails(viewId, token);
          setDetails({
            name: data.name,
            description: `Album by ${data.artists?.map((a) => a.name).join(", ")}`,
            image: data.images?.[0]?.url || "",
            owner: data.artists?.[0]?.name || "Artist",
            type: "ALBUM",
            id: data.id
          });
          // Normalizing album tracks (they don't contain the `album` property inside, we add it back)
          normalizedTracks = data.tracks?.items.map((track) => ({
            ...track,
            album: {
              name: data.name,
              images: data.images
            }
          })) || [];
        }

        setTracks(normalizedTracks);
        
        // Update context active playlist so sidebar highlight stays in sync
        if (view === "playlist") {
          setActivePlaylist(data);
        }
      } catch (err) {
        console.error("Failed to load playlist/album details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [view, viewId, token]);

  const isCurrentPlaylistPlaying = () => {
    if (!currentTrack || tracks.length === 0) return false;
    return tracks.some((t) => t.id === currentTrack.id);
  };

  const handlePlayPlaylist = () => {
    if (tracks.length === 0) return;

    if (isCurrentPlaylistPlaying()) {
      togglePlay();
    } else {
      // Play the first track in the playlist and load the playlist tracks as the queue
      playTrack(tracks[0], tracks, 0);
    }
  };

  if (loading) {
    return (
      <div className="playlist-loading">
        <div className="spinner"></div>
        <p>Loading tracks...</p>
      </div>
    );
  }

  return (
    <div className="playlist-view animate-fade-in">
      {/* Header Banner */}
      <div className="playlist-header-banner">
        <img
          src={details?.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500"}
          alt={details?.name}
          className="playlist-cover-image"
        />
        <div className="playlist-header-info">
          <span className="playlist-badge-text">{details?.type}</span>
          <h1 className="playlist-name-title">{details?.name}</h1>
          <p className="playlist-desc-text" dangerouslySetInnerHTML={{ __html: details?.description }}></p>
          <div className="playlist-meta-details">
            <span className="meta-owner">{details?.owner}</span>
            <span className="dot">•</span>
            <span className="meta-count">{tracks.length} songs</span>
          </div>
        </div>
      </div>

      {/* Playlist Actions (Play/Pause Banner) */}
      <div className="playlist-actions-row">
        <button
          className="playlist-play-btn"
          onClick={handlePlayPlaylist}
          disabled={tracks.length === 0}
          title="Play playlist"
        >
          {isCurrentPlaylistPlaying() && isPlaying ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" className="play-icon-offset" />
          )}
        </button>
      </div>

      {/* Tracks Table / List */}
      <div className="playlist-tracks-table">
        <div className="table-header hide-mobile">
          <div className="col-num">#</div>
          <div className="col-title">Title</div>
          <div className="col-album">Album</div>
          <div className="col-duration">
            <Clock size={16} />
          </div>
        </div>

        <div className="tracks-list">
          {tracks.length === 0 ? (
            <div className="empty-playlist">
              <Music size={48} className="empty-icon" />
              <p>No playable songs found in this {details?.type.toLowerCase()}</p>
            </div>
          ) : (
            tracks.map((track, index) => (
              <SongRow
                key={track.id}
                track={track}
                index={index}
                queue={tracks}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Playlist;
