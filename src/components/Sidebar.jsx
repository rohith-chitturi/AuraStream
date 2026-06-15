import React from "react";
import { useSpotify } from "../SpotifyContext";
import { Home, Search, Library, LogOut, Music, Users } from "lucide-react";
import "./Sidebar.css";

const Sidebar = () => {
  const {
    playlists,
    view,
    navigateTo,
    logout,
    activePlaylist
  } = useSpotify();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar hide-mobile">
        <div className="logo-container" onClick={() => navigateTo("home")}>
          <div className="logo-badge">
            <img
              src="/logo.png"
              alt="AuraStream Logo"
              className="logo"
            />
            <span className="logo-text">AuraStream</span>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-link-btn ${view === "home" ? "active" : ""}`}
            onClick={() => navigateTo("home")}
          >
            <Home size={22} />
            <span>Home</span>
          </button>
          <button
            className={`nav-link-btn ${view === "search" ? "active" : ""}`}
            onClick={() => navigateTo("search")}
          >
            <Search size={22} />
            <span>Search</span>
          </button>
          <button
            className={`nav-link-btn ${view === "room" ? "active" : ""}`}
            onClick={() => navigateTo("room")}
          >
            <Users size={22} />
            <span>Listening Room</span>
          </button>
        </nav>

        <div className="library-section">
          <div className="library-header">
            <Library size={22} />
            <span>Your Library</span>
          </div>

          <div className="playlist-list">
            {playlists.length === 0 ? (
              <p className="no-playlists">No playlists found</p>
            ) : (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  className={`playlist-item ${
                    view === "playlist" && activePlaylist?.id === playlist.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() => navigateTo("playlist", playlist.id)}
                >
                  <Music size={16} className="playlist-icon" />
                  <span className="ellipsis">{playlist.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav-bar glassmorphism">
        <button
          className={`mobile-nav-btn ${view === "home" ? "active" : ""}`}
          onClick={() => navigateTo("home")}
        >
          <Home size={24} />
          <span>Home</span>
        </button>
        <button
          className={`mobile-nav-btn ${view === "search" ? "active" : ""}`}
          onClick={() => navigateTo("search")}
        >
          <Search size={24} />
          <span>Search</span>
        </button>
        <button
          className={`mobile-nav-btn ${view === "playlist" || view === "library" ? "active" : ""}`}
          onClick={() => {
            // For mobile library, open first playlist if available, or just render home for now
            if (playlists.length > 0) {
              navigateTo("playlist", playlists[0].id);
            } else {
              navigateTo("home");
            }
          }}
        >
          <Library size={24} />
          <span>Library</span>
        </button>
        <button
          className={`mobile-nav-btn ${view === "room" ? "active" : ""}`}
          onClick={() => navigateTo("room")}
        >
          <Users size={24} />
          <span>Room</span>
        </button>
        <button className="mobile-nav-btn" onClick={logout}>
          <LogOut size={24} />
          <span>Logout</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
