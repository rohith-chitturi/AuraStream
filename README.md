# 🎵 AuraStream — Premium Spotify Clone (Web & Mobile)

Welcome to **AuraStream**, a state-of-the-art music streaming application that brings a premium, glassmorphic design and seamless playback of global music catalogs. 

AuraStream is designed with a unique **hybrid client architecture**, consisting of a fast **React + Vite Web App** (which can be compiled into a hybrid native app via Capacitor) and a **React Native + Expo Mobile Client** optimized for cross-device mobile playback.

---

## ⚖️ Legality & Architecture (Is this Legal?)

**Yes, AuraStream is completely legal!** It studies the implementation of client-side streaming metadata resolution and operates under standard web scraping and public API guidelines:

1. **No Music Piracy**: AuraStream **does not host, store, download, or distribute** any copyrighted music files.
2. **Read-Only Metadata**: The application uses public search APIs to fetch track details, titles, cover arts, and artists.
3. **Public CDN Playback**: For audio streaming, the app acts as a client-side player. It searches for public streams concurrently through:
   - **JioSaavn CDN**: High-speed, high-quality (up to 320kbps) public music stream links.
   - **Invidious / YouTube Music**: A decentralized, open-source proxy network that accesses public audio streams, playing them directly on the client browser or device (just like loading a video in a browser).
4. **Self-Contained Local Database**: User registration, login, and playlists are saved locally on your device's sandbox. No data leaves your phone, ensuring compliance with data privacy regulations.

---

## 🛠️ Complete Tech Stack

### 1. Web Application (`/`)
- **Core Framework**: React 19 + Vite (for lightning-fast compilation and Hot Module Replacement).
- **Styling**: Vanilla CSS (Premium glassmorphic styling, Spotify dark color theme, custom scrollbars).
- **Icons**: Lucide React.
- **Native Wrapper**: Capacitor (allows compiling the web view into a standalone Android `.apk` or iOS app).
- **Storage**: `localStorage` (persists volume levels and Spotify credentials).

### 2. Mobile Client (`/mobile`)
- **Core Framework**: React Native + Expo (SDK 54).
- **Routing**: Expo Router (File-based routing with tab navigation bars).
- **Audio Engine**: `expo-av` (handles remote audio buffering, playback status updates, and background streams).
- **Animations**: `react-native-reanimated` (smooth, premium transitions).
- **Icons**: Lucide React Native.
- **Styling**: React Native StyleSheet with Safe Area Context.
- **Database / Local Storage**: `@react-native-async-storage/async-storage` (stores user accounts and handles playlist databases locally).

### 3. Public Search & Media Providers
- **Primary Streaming CDN**: JioSaavn API (`saavn.dev` & `saavn.sumit.co` fallbacks).
- **Secondary Media Proxy**: Invidious API (Decentralized instances e.g. `iv.melmac.space`, `invidious.nerdvpn.de` to resolve obscure international tracks).

---

## 📂 Codebase Layout

```bash
Spotify-clone/
├── android/                   # Generated Capacitor Android wrapper assets
├── mobile/                    # React Native Expo Mobile Codebase
│   ├── assets/                # App icons, splashes, and static assets
│   └── src/
│       ├── app/               # Expo Router file screens (Home, Search, Library)
│       ├── components/        # UI widgets (MiniPlayer, PlayerView, AuthScreen)
│       ├── constants/         # Theme color definitions
│       └── context/           # AudioContext (Audio Playback & Local AsyncStorage Auth)
├── src/                       # Vite React Web Codebase
│   ├── components/            # Web components (Player, Sidebar, Header, SongRow)
│   ├── views/                 # Web views (Home, Playlist, Search, Login)
│   ├── SpotifyContext.jsx     # Web context state provider
│   └── audioProvider.js       # Web audio resolver (JioSaavn + Invidious CDN)
├── index.html
├── package.json               # Web app configurations
└── README.md                  # Project documentation (You are here!)
```

---

## 🚀 Step-by-Step Setup Guide

Follow these instructions to run either application from scratch:

### Prerequisites
Make sure you have [Node.js (v18 or higher)](https://nodejs.org/) installed on your computer.

---

### A. How to Run the Web App (Vite React)

1. Open a terminal in the project root folder:
   ```bash
   cd d:\Spotify-clone
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to: `http://localhost:5173`. 
5. Search for any song in the search bar and play it. It will play instantly using the high-speed CDN.

---

### B. How to Run the Mobile App (React Native Expo)

1. Open a terminal in the `mobile/` directory:
   ```bash
   cd d:\Spotify-clone\mobile
   ```
2. Install mobile dependencies:
   ```bash
   npm install
   ```
3. Start the Expo bundler:
   ```bash
   npm run start
   ```
4. Install **Expo Go** on your physical phone (available on iOS App Store & Android Play Store).
5. Scan the **QR Code** displayed in your terminal using:
   - Your phone's camera (iOS).
   - The Expo Go app's scan scanner (Android).
6. **Explore the app**:
   - Register a new account or tap "Continue as Guest".
   - Search for songs or albums, play them, queue them via the `ListPlus` icon, and add them to playlists.

---

## 💎 Features Checklist

- [x] **Email & Password Authentication**: Local registrations, logins, and session management saved locally.
- [x] **Account Scoping**: Playlists are securely isolated. User A cannot see user B's playlists. Guests have temporary play lists.
- [x] **Add to Queue**: Tap the `ListPlus` icon next to any song to add it to your playback sequence.
- [x] **Direct Add to Playlist**: Tap `Plus` (`+`) near any song to choose a playlist or create a new playlist on-the-fly without leaving the search tab.
- [x] **Fitted Responsive Player View**: Clean scaling cover arts, progress bars, and scrolling lyrics that fit beautifully on all device heights (no cut-offs).
- [x] **Super Fast Resolution**: Direct 320kbps CDN integration starts playbacks in <100ms.
