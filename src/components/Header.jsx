import React, { useState, useEffect } from "react";
import { useSpotify } from "../SpotifyContext";
import { ChevronLeft, ChevronRight, Search, User } from "lucide-react";
import { searchSpotify } from "../spotify";
import "./Header.css";

const Header = ({ onSearchChange }) => {
  const {
    user,
    view,
    navigateBack,
    navigateForward,
    canGoBack,
    canGoForward,
    token
  } = useSpotify();

  const [searchQuery, setSearchQuery] = useState("");

  // Handle local query state and lift it up
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearchChange) {
      onSearchChange(query);
    }
  };

  // Reset query when view shifts
  useEffect(() => {
    if (view !== "search") {
      setSearchQuery("");
    }
  }, [view]);

  return (
    <header className="app-header glassmorphism">
      <div className="nav-navigation">
        <button
          className="nav-arrow"
          onClick={navigateBack}
          disabled={!canGoBack}
          title="Go back"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          className="nav-arrow"
          onClick={navigateForward}
          disabled={!canGoForward}
          title="Go forward"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {view === "search" && (
        <div className="search-bar-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="What do you want to listen to?"
            value={searchQuery}
            onChange={handleSearch}
            autoFocus
          />
        </div>
      )}

      <div className="user-profile">
        {user ? (
          <div className="profile-badge">
            {user.images && user.images.length > 0 ? (
              <img
                src={user.images[0].url}
                alt={user.display_name}
                className="user-avatar"
              />
            ) : (
              <div className="user-avatar-placeholder">
                <User size={16} />
              </div>
            )}
            <span className="user-name hide-mobile">{user.display_name}</span>
          </div>
        ) : (
          <div className="profile-badge offline">
            <span className="user-name">Guest Mode</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
