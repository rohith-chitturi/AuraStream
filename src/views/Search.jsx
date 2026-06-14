import React, { useState, useEffect } from "react";
import { useSpotify } from "../SpotifyContext";
import { searchSpotify } from "../spotify";
import SongRow from "../components/SongRow";
import { Play, Music } from "lucide-react";
import "./Search.css";

const SEARCH_CATEGORIES = [
  { title: "Podcasts", color: "#27856a", img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=200" },
  { title: "Made For You", color: "#1e3264", img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200" },
  { title: "New Releases", color: "#e8115b", img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200" },
  { title: "Hindi", color: "#e91429", img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200" },
  { title: "Pop", color: "#148a08", img: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200" },
  { title: "Indie", color: "#e1118c", img: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=200" },
  { title: "Rock", color: "#777777", img: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200" },
  { title: "Romance", color: "#8d67ab", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200" },
  { title: "Discover", color: "#5187eb", img: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=200" },
  { title: "Party", color: "#af2896", img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200" },
  { title: "Decades", color: "#ba3242", img: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=200" },
  { title: "Focus", color: "#503750", img: "https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=200" }
];

const Search = ({ query }) => {
  const { token, playTrack, navigateTo } = useSpotify();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debounced search trigger
  useEffect(() => {
    if (!query) {
      setResults(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const searchData = await searchSpotify(query, token);
        setResults(searchData);
      } catch (err) {
        console.error("Search API Error:", err);
      } finally {
        setLoading(false);
      }
    }, 450); // 450ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query, token]);

  const handlePlaylistClick = (playlistId) => {
    navigateTo("playlist", playlistId);
  };

  const handleAlbumClick = (albumId) => {
    navigateTo("album", albumId);
  };

  return (
    <div className="search-view animate-fade-in">
      {!query ? (
        /* Browse Categories Screen */
        <section className="search-browse-section">
          <h2 className="search-section-title">Browse all</h2>
          <div className="category-grid">
            {SEARCH_CATEGORIES.map((category, index) => (
              <div
                key={index}
                className="category-card"
                style={{ backgroundColor: category.color }}
              >
                <h3 className="category-title">{category.title}</h3>
                <img
                  src={category.img}
                  alt={category.title}
                  className="category-img"
                />
              </div>
            ))}
          </div>
        </section>
      ) : loading ? (
        /* Loading Results Screen */
        <div className="search-loading">
          <div className="spinner"></div>
          <p>Searching tracks, artists, and playlists...</p>
        </div>
      ) : (
        /* Search Results Screen */
        <div className="search-results">
          {/* Best Match & Top Songs */}
          {results?.tracks?.items?.length > 0 && (
            <div className="search-top-results">
              <div className="best-match-panel">
                <h2 className="search-section-title">Best Match</h2>
                {(() => {
                  const best = results.tracks.items[0];
                  const artistNames = best.artists.map((a) => a.name).join(", ");
                  return (
                    <div
                      className="best-match-card"
                      onClick={() => playTrack(best, results.tracks.items, 0)}
                    >
                      <img
                        src={best.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300"}
                        alt={best.name}
                        className="best-match-img"
                      />
                      <h2 className="best-match-title ellipsis">{best.name}</h2>
                      <div className="best-match-meta">
                        <span className="best-match-type">Song</span>
                        <span className="dot">•</span>
                        <span className="best-match-artist ellipsis">{artistNames}</span>
                      </div>
                      <button className="best-match-play-btn" title="Play">
                        <Play size={24} fill="currentColor" />
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="top-songs-panel">
                <h2 className="search-section-title">Songs</h2>
                <div className="songs-list">
                  {results.tracks.items.slice(0, 4).map((track, index) => (
                    <SongRow
                      key={track.id}
                      track={track}
                      index={index}
                      queue={results.tracks.items}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Featured Playlists Results */}
          {results?.playlists?.items?.length > 0 && (
            <section className="search-result-section">
              <h2 className="search-section-title">Playlists</h2>
              <div className="search-card-grid">
                {results.playlists.items.slice(0, 6).map((playlist) => {
                  if (!playlist) return null;
                  return (
                    <div
                      key={playlist.id}
                      className="search-music-card"
                      onClick={() => handlePlaylistClick(playlist.id)}
                    >
                      <div className="search-card-img-container">
                        <img
                          src={playlist.images?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150"}
                          alt={playlist.name}
                          className="search-card-img"
                        />
                      </div>
                      <h4 className="search-card-title ellipsis">{playlist.name}</h4>
                      <p className="search-card-desc ellipsis">
                        By {playlist.owner?.display_name || "Spotify"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Albums Results */}
          {results?.albums?.items?.length > 0 && (
            <section className="search-result-section">
              <h2 className="search-section-title">Albums</h2>
              <div className="search-card-grid">
                {results.albums.items.slice(0, 6).map((album) => {
                  if (!album) return null;
                  return (
                    <div
                      key={album.id}
                      className="search-music-card"
                      onClick={() => handleAlbumClick(album.id)}
                    >
                      <div className="search-card-img-container">
                        <img
                          src={album.images?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150"}
                          alt={album.name}
                          className="search-card-img"
                        />
                      </div>
                      <h4 className="search-card-title ellipsis">{album.name}</h4>
                      <p className="search-card-desc ellipsis">
                        {album.artists?.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
