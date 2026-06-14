import React from "react";
import { useSpotify } from "../SpotifyContext";
import { Play } from "lucide-react";
import "./Home.css";

const Home = () => {
  const {
    user,
    featuredPlaylists,
    newReleases,
    navigateTo
  } = useSpotify();

  // Determine greeting based on current local time
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleCardClick = (type, id) => {
    if (type === "playlist") {
      navigateTo("playlist", id);
    } else if (type === "album") {
      // For simplicity, we can load albums in the same playlist view
      // as our views will display tracks in a list format
      navigateTo("album", id);
    }
  };

  return (
    <div className="home-view animate-fade-in">
      <div className="home-hero">
        <h1 className="home-greeting">{getGreeting()}</h1>
      </div>

      {/* Featured Playlists Grid */}
      <section className="home-section">
        <h2 className="section-title">Featured Playlists</h2>
        <div className="card-grid">
          {featuredPlaylists.length === 0 ? (
            Array(6).fill(0).map((_, i) => <div key={i} className="card-skeleton"></div>)
          ) : (
            featuredPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="music-card"
                onClick={() => handleCardClick("playlist", playlist.id)}
              >
                <div className="card-img-container">
                  <img
                    src={playlist.images?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300"}
                    alt={playlist.name}
                    className="card-img"
                  />
                  <button className="card-play-btn" title={`Play ${playlist.name}`}>
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
                <h4 className="card-title ellipsis">{playlist.name}</h4>
                <p className="card-desc ellipsis-2">
                  {playlist.description || `By ${playlist.owner?.display_name}`}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* New Releases Grid */}
      <section className="home-section">
        <h2 className="section-title">New Releases</h2>
        <div className="card-grid">
          {newReleases.length === 0 ? (
            Array(6).fill(0).map((_, i) => <div key={i} className="card-skeleton"></div>)
          ) : (
            newReleases.map((album) => (
              <div
                key={album.id}
                className="music-card"
                onClick={() => handleCardClick("album", album.id)}
              >
                <div className="card-img-container">
                  <img
                    src={album.images?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300"}
                    alt={album.name}
                    className="card-img"
                  />
                  <button className="card-play-btn" title={`Play ${album.name}`}>
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
                <h4 className="card-title ellipsis">{album.name}</h4>
                <p className="card-desc ellipsis">
                  {album.artists?.map((a) => a.name).join(", ")}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
