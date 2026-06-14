// Spotify API Helper with PKCE (Proof Key for Code Exchange)
import { Browser } from "@capacitor/browser";
import { CapacitorHttp } from "@capacitor/core";

export const authEndpoint = "https://accounts.spotify.com/authorize";

// Scopes required for Spotify features
const scopes = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-top-read",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read"
];

// PKCE Helper: Generate random string for code verifier
const generateRandomString = (length) => {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    try {
      const values = crypto.getRandomValues(new Uint8Array(length));
      return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    } catch (e) {
      console.warn("crypto.getRandomValues failed, using Math.random fallback");
    }
  }

  let text = "";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Standard Production-Grade Pure JS SHA-256 Implementation
const sha256Pure = (str) => {
  const rotateRight = (n, x) => (x >>> n) | (x << (32 - n));
  
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const utf8 = unescape(encodeURIComponent(str));
  const words = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (utf8.charCodeAt(i) << (24 - (i % 4) * 8));
  }

  const bitLength = utf8.length * 8;
  words[bitLength >> 5] = (words[bitLength >> 5] || 0) | (0x80 << (24 - (bitLength % 32)));
  
  const wordLength = ((bitLength + 64) >> 9 << 4) + 15;
  words[wordLength] = bitLength;

  for (let i = 0; i < words.length; i++) {
    if (words[i] === undefined) words[i] = 0;
  }

  const W = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    let a = H[0], b = H[1], c = H[2], d = H[3];
    let e = H[4], f = H[5], g = H[6], h = H[7];

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        W[j] = words[i + j];
      } else {
        const s0 = rotateRight(7, W[j - 15]) ^ rotateRight(18, W[j - 15]) ^ (W[j - 15] >>> 3);
        const s1 = rotateRight(17, W[j - 2]) ^ rotateRight(19, W[j - 2]) ^ (W[j - 2] >>> 10);
        W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
      }

      const s0 = rotateRight(2, a) ^ rotateRight(13, a) ^ rotateRight(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) | 0;
      
      const s1 = rotateRight(6, e) ^ rotateRight(11, e) ^ rotateRight(25, e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + s1 + ch + K[j] + W[j]) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  const buf = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    buf[i * 4] = (H[i] >> 24) & 255;
    buf[i * 4 + 1] = (H[i] >> 16) & 255;
    buf[i * 4 + 2] = (H[i] >> 8) & 255;
    buf[i * 4 + 3] = H[i] & 255;
  }
  return buf;
};

// Unified SHA-256 selector
const sha256 = async (plain) => {
  if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return await crypto.subtle.digest("SHA-256", data);
    } catch (e) {
      console.warn("Web Crypto API failed, utilizing pure JS fallback");
    }
  }
  return sha256Pure(plain);
};

// Base64URL encode buffer
const base64urlencode = (buffer) => {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// Helper to get the correct Redirect URI based on environment (native mobile vs web PWA)
export const getRedirectUri = () => {
  const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if (isNative) {
    return "aurastream://localhost/";
  }

  let origin = window.location.origin;
  if (window.location.hostname === "localhost") {
    origin = origin.replace("localhost", "127.0.0.1");
  }
  return origin + "/";
};

// Redirect to Spotify login using Authorization Code Flow with PKCE
export const redirectToAuthCodeFlow = async (clientId) => {
  try {
    const verifier = generateRandomString(128);
    localStorage.setItem("spotify_code_verifier", verifier);

    const challengeBuffer = await sha256(verifier);
    const challenge = base64urlencode(challengeBuffer);

    const redirectUri = getRedirectUri();

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
      scope: scopes.join(" "),
      show_dialog: "true"
    });

    const authUrl = `${authEndpoint}?${params.toString()}`;
    console.log("Redirecting to Auth URL:", authUrl);

    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    if (isNative) {
      await Browser.open({ url: authUrl });
    } else {
      window.location.href = authUrl;
    }
  } catch (err) {
    console.error("Critical Auth Redirection Failure:", err);
    alert("Authorization failed to launch: " + err.message);
  }
};

// Exchange Authorization Code for Access & Refresh Tokens
export const getAccessToken = async (clientId, code) => {
  const verifier = localStorage.getItem("spotify_code_verifier");
  
  if (!verifier) {
    throw new Error("Missing code_verifier in local storage");
  }

  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

  if (isNative) {
    const options = {
      url: "https://accounts.spotify.com/api/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: params.toString()
    };
    
    console.log("CapacitorHttp POST to getAccessToken...");
    const res = await CapacitorHttp.post(options);
    
    if (res.status >= 300) {
      let errorMsg = "Failed to exchange authorization code for token";
      if (res.data) {
        errorMsg = res.data.error_description || res.data.error || errorMsg;
      }
      throw new Error(errorMsg);
    }
    return res.data;
  } else {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!response.ok) {
      let errorMsg = "Failed to exchange authorization code for token";
      try {
        const errData = await response.json();
        errorMsg = errData.error_description || errData.error || errorMsg;
      } catch (e) {
        try {
          const text = await response.text();
          if (text) errorMsg = text;
        } catch (inner) {}
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }
};

// Refresh Access Token using Refresh Token
export const getRefreshToken = async (clientId, refreshToken) => {
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

  if (isNative) {
    const options = {
      url: "https://accounts.spotify.com/api/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: params.toString()
    };
    
    console.log("CapacitorHttp POST to getRefreshToken...");
    const res = await CapacitorHttp.post(options);
    
    if (res.status >= 300) {
      throw new Error(`Failed to refresh token: status ${res.status}`);
    }
    return res.data;
  } else {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token Refresh Error Status:", response.status, errorText);
      throw new Error("Failed to refresh token");
    }

    return response.json();
  }
};

// Retrieve Client ID from localStorage
export const getClientId = () => {
  return localStorage.getItem("spotify_client_id") || "";
};

// Save Client ID to localStorage
export const setClientId = (id) => {
  localStorage.setItem("spotify_client_id", id.trim());
};

// Generic Spotify fetch wrapper
export const spotifyFetch = async (endpoint, token) => {
  const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  const url = `https://api.spotify.com/v1/${endpoint}`;

  if (isNative) {
    const options = {
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    };
    
    const res = await CapacitorHttp.get(options);
    
    if (res.status === 401) {
      localStorage.removeItem("spotify_token");
      localStorage.removeItem("spotify_refresh_token");
      window.location.reload();
      throw new Error("Unauthorized");
    }
    
    if (res.status >= 300) {
      let errorDetail = `HTTP ${res.status}`;
      if (res.data && res.data.error) {
        errorDetail = res.data.error.message || errorDetail;
      }
      throw new Error(errorDetail);
    }
    
    return res.data;
  } else {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (response.status === 401) {
      localStorage.removeItem("spotify_token");
      localStorage.removeItem("spotify_refresh_token");
      window.location.reload();
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      let errorDetail = response.statusText || `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errorDetail = errData.error?.message || errorDetail;
      } catch (e) {}
      throw new Error(errorDetail);
    }

    return response.json();
  }
};

// Spotify API Endpoints
export const getProfile = (token) => spotifyFetch("me", token);
export const getUserPlaylists = (token) => spotifyFetch("me/playlists?limit=50", token);
export const getFeaturedPlaylists = (token) => spotifyFetch("browse/featured-playlists?limit=6", token);
export const getNewReleases = (token) => spotifyFetch("browse/new-releases?limit=6", token);
export const getPlaylistDetails = (playlistId, token) => spotifyFetch(`playlists/${playlistId}`, token);
export const getAlbumDetails = (albumId, token) => spotifyFetch(`albums/${albumId}`, token);
export const getArtistDetails = (artistId, token) => spotifyFetch(`artists/${artistId}`, token);
export const getArtistTopTracks = (artistId, token) => spotifyFetch(`artists/${artistId}/top-tracks?market=IN`, token);
export const getRecommendations = (seedTracks, token) => spotifyFetch(`recommendations?seed_tracks=${seedTracks}&limit=10`, token);

// Search endpoint supporting track, artist, album, playlist
export const searchSpotify = (query, token) => {
  const encodedQuery = encodeURIComponent(query);
  return spotifyFetch(`search?q=${encodedQuery}&type=track,artist,album,playlist&limit=10`, token);
};
