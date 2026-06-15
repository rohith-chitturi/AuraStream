import React, { useState } from "react";
import { SpotifyProvider, useSpotify } from "./SpotifyContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Player from "./components/Player";
import Login from "./views/Login";
import Home from "./views/Home";
import Search from "./views/Search";
import Playlist from "./views/Playlist";
import Room from "./views/Room";
import "./App.css";

const AppContent = () => {
  const { token, view, apiError, logout } = useSpotify();
  const [searchQuery, setSearchQuery] = useState("");

  // Render the Connection Error screen if Spotify API failed
  if (apiError) {
    return (
      <div className="login-container">
        <div className="login-card glassmorphism animate-fade-in" style={{ border: "1px solid rgba(255, 92, 92, 0.3)" }}>
          <div className="login-header">
            <div className="login-logo-container">
              <img
                src="/logo.png"
                alt="AuraStream Logo"
                className="login-logo"
              />
              <span className="login-logo-text">AuraStream</span>
            </div>
            <h1 className="login-title" style={{ color: "#ff5c5c" }}>
              Connection Failed
            </h1>
            <p className="login-subtitle" style={{ marginBottom: "16px" }}>
              We couldn't load your Spotify data.
            </p>
          </div>

          <div style={{ 
            backgroundColor: "rgba(255, 92, 92, 0.05)", 
            border: "1px solid rgba(255, 92, 92, 0.2)",
            color: "#ff5c5c",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "20px",
            wordBreak: "break-word"
          }}>
            {apiError}
          </div>

          {(apiError.includes("403") || apiError.toLowerCase().includes("forbidden")) && (
            <div style={{
              backgroundColor: "rgba(255, 179, 0, 0.08)",
              border: "1px solid rgba(255, 179, 0, 0.3)",
              color: "#ffb300",
              padding: "14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "20px",
              textAlign: "left",
              lineHeight: "1.5"
            }}>
              ⚠️ <strong>Spotify Whitelist Needed:</strong> Since your Spotify app is in Development Mode, Spotify blocks all API requests unless your login email is whitelisted. Follow the whitelisting steps below to fix this!
            </div>
          )}

          <div style={{ 
            textAlign: "left", 
            backgroundColor: "rgba(0, 0, 0, 0.4)", 
            padding: "16px", 
            borderRadius: "8px", 
            fontSize: "13px", 
            color: "var(--text-secondary)", 
            marginBottom: "24px", 
            lineHeight: "1.5" 
          }}>
            <h4 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>How to fix this:</h4>
            <ol style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <strong>Add Spotify Account:</strong> If your Spotify Developer App is in **Development Mode**, you must add your Spotify login email under the **Users and Members** section of your Spotify Developer Dashboard.
              </li>
              <li>
                <strong>Verify Client ID:</strong> Ensure the Client ID you entered matches your Spotify Developer App exactly.
              </li>
              <li>
                <strong>CORS / Network:</strong> Check your internet connection. Some enterprise networks or VPNs block Spotify APIs.
              </li>
            </ol>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button className="green-btn" onClick={() => window.location.reload()}>
              Retry Connection
            </button>
            <button 
              className="settings-toggle-btn" 
              onClick={logout} 
              style={{ textDecoration: "none", color: "#ff5c5c", fontWeight: "600", marginTop: "8px" }}
            >
              Disconnect and Change Client ID
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the Login page if the user is not authenticated
  if (!token) {
    return <Login />;
  }

  // Render the appropriate main view
  const renderActiveView = () => {
    switch (view) {
      case "home":
        return <Home />;
      case "search":
        return <Search query={searchQuery} />;
      case "playlist":
      case "album":
        return <Playlist />;
      case "room":
        return <Room />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app-layout">
      <div className="app-body">
        {/* Navigation Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="app-main-content">
          <Header onSearchChange={setSearchQuery} />
          <div className="view-container">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Playback Control Bar */}
      <Player />
    </div>
  );
};

const App = () => {
  return (
    <SpotifyProvider>
      <AppContent />
    </SpotifyProvider>
  );
};

export default App;
