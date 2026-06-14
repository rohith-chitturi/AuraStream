import React, { useState } from "react";
import { useSpotify } from "../SpotifyContext";
import { redirectToAuthCodeFlow, getRedirectUri } from "../spotify";
import { Music, Eye, EyeOff, Settings, Sparkles } from "lucide-react";
import "./Login.css";

const Login = () => {
  const { clientId, updateClientId, authStatus } = useSpotify();
  const [localId, setLocalId] = useState(clientId);
  const [showId, setShowId] = useState(false);
  const [showSettings, setShowSettings] = useState(!clientId);

  const handleSave = (e) => {
    e.preventDefault();
    updateClientId(localId);
    setShowSettings(false);
  };

  const handleConnect = () => {
    if (!localId.trim()) {
      alert("Please enter your Spotify Client ID first. Open settings below.");
      setShowSettings(true);
      return;
    }
    // Launch Spotify OAuth login using PKCE (response_type=code)
    redirectToAuthCodeFlow(localId.trim());
  };

  return (
    <div className="login-container">
      <div className="login-card glassmorphism animate-fade-in">
        <div className="login-header">
          <div className="login-logo-container">
            <img
              src="/logo.png"
              alt="AuraStream Logo"
              className="login-logo"
            />
            <span className="login-logo-text">AuraStream</span>
          </div>
          <h1 className="login-title">
            Premium Experience <span className="free-badge">FREE</span>
          </h1>
          <p className="login-subtitle">
            Search playlists, browse albums, and listen to any song completely for free!
          </p>
        </div>

        {authStatus && (
          <div className="auth-status-banner animate-fade-in">
            <div className="spinner auth-spinner"></div>
            <span>{authStatus}</span>
          </div>
        )}

        {!showSettings ? (
          <div className="login-actions">
            <button className="green-btn connect-btn" onClick={handleConnect}>
              <Sparkles size={18} className="btn-icon" />
              Connect Spotify Account
            </button>
            <button
              className="settings-toggle-btn"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={16} />
              Change Spotify Client ID
            </button>
            
            <div className="redirect-debug-info">
              <span>Required Spotify Redirect URI:</span>
              <code>{getRedirectUri()}</code>
            </div>
          </div>
        ) : (
          <form className="settings-form" onSubmit={handleSave}>
            <h3>Configure Spotify Client ID</h3>
            <p className="settings-help">
              To connect, you need a free Client ID from the Spotify Developer Panel.
            </p>

            <div className="input-group">
              <input
                type={showId ? "text" : "password"}
                placeholder="Paste your Spotify Client ID here"
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-toggle-visible"
                onClick={() => setShowId(!showId)}
              >
                {showId ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="save-settings-btn">
              Save and Continue
            </button>

            <div className="redirect-debug-info" style={{ marginTop: "16px" }}>
              <span>Required Spotify Redirect URI:</span>
              <code>{getRedirectUri()}</code>
            </div>

            {clientId && (
              <button
                type="button"
                className="cancel-settings-btn"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
            )}
          </form>
        )}

        <div className="setup-guide">
          <h4>Quick Developer Setup Guide (3 minutes):</h4>
          <ol>
            <li>
              Go to the{" "}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                Spotify Developer Dashboard
              </a>{" "}
              and log in.
            </li>
            <li>
              Click <strong>Create App</strong>. Enter any Name/Description.
            </li>
            <li>
              Add the following **Redirect URIs** in your app settings, then click Save:
              <ul style={{ paddingLeft: "16px", marginTop: "4px", listStyleType: "disc", color: "var(--text-secondary)" }}>
                <li>Web: <code>{window.location.origin.replace("localhost", "127.0.0.1")}/</code></li>
                <li>Mobile App: <code>aurastream://localhost/</code></li>
              </ul>
            </li>
            <li>
              Copy your **Client ID** and paste it above!
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Login;
