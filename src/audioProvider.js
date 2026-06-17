// Free Audio Streaming Provider using public Invidious instances
import { CapacitorHttp } from "@capacitor/core";

// A list of reliable public Invidious instances as fallbacks
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.flokinet.to",
  "https://invidious.nerdvpn.de",
  "https://invidious.yewtu.ch",
  "https://invidious.no-logs.com",
  "https://iv.melmac.space"
];

let activeInstanceIndex = 0;

// Get the currently active Invidious instance
const getActiveInstance = () => {
  return INVIDIOUS_INSTANCES[activeInstanceIndex];
};

// Switch to the next instance if one fails
const rotateInstance = () => {
  activeInstanceIndex = (activeInstanceIndex + 1) % INVIDIOUS_INSTANCES.length;
  console.log(`Switching audio stream instance to: ${getActiveInstance()}`);
};

/**
 * Searches for a track on Invidious and returns the videoId of the best match.
 * @param {string} trackName 
 * @param {string} artistName 
 * @returns {Promise<string>} videoId
 */
export const searchAndGetAudioStream = async (trackName, artistName) => {
  const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

  // 1. Search JioSaavn first (Fast CDN, high-quality streams)
  try {
    const saavnUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(trackName + " " + artistName)}`;
    let saavnRes;
    if (isNative) {
      const res = await CapacitorHttp.get({ url: saavnUrl, connectTimeout: 3000 });
      if (res.status === 200) saavnRes = res.data;
    } else {
      const res = await fetch(saavnUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) saavnRes = await res.json();
    }

    if (saavnRes && saavnRes.success && saavnRes.data?.results?.length > 0) {
      const matched = saavnRes.data.results[0];
      const streams = matched.downloadUrl || [];
      const bestStream = streams.find((s) => s.quality === "160kbps") || 
                         streams.find((s) => s.quality === "120kbps") || 
                         streams.find((s) => s.quality === "320kbps") || 
                         streams.find((s) => s.quality === "96kbps") || 
                         streams[streams.length - 1] || 
                         { url: "" };
      
      if (bestStream.url) {
        console.log("Resolved track via JioSaavn CDN:", trackName, bestStream.url);
        return {
          streamUrl: bestStream.url,
          videoId: `saavn_${matched.id}`,
          duration: matched.duration || 180
        };
      }
    }
  } catch (err) {
    console.warn("JioSaavn fast resolver failed, trying backup Sumit API:", err.message);
    
    // Backup Sumit Saavn host
    try {
      const saavnUrl = `https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(trackName + " " + artistName)}`;
      let saavnRes;
      if (isNative) {
        const res = await CapacitorHttp.get({ url: saavnUrl, connectTimeout: 3000 });
        if (res.status === 200) saavnRes = res.data;
      } else {
        const res = await fetch(saavnUrl, { signal: AbortSignal.timeout(3000) });
        if (res.ok) saavnRes = await res.json();
      }

      if (saavnRes && saavnRes.success && saavnRes.data?.results?.length > 0) {
        const matched = saavnRes.data.results[0];
        const streams = matched.downloadUrl || [];
        const bestStream = streams.find((s) => s.quality === "160kbps") || 
                           streams.find((s) => s.quality === "120kbps") || 
                           streams.find((s) => s.quality === "320kbps") || 
                           streams.find((s) => s.quality === "96kbps") || 
                           streams[streams.length - 1] || 
                           { url: "" };
        
        if (bestStream.url) {
          console.log("Resolved track via backup JioSaavn CDN:", trackName, bestStream.url);
          return {
            streamUrl: bestStream.url,
            videoId: `saavn_${matched.id}`,
            duration: matched.duration || 180
          };
        }
      }
    } catch (innerErr) {
      console.warn("Backup JioSaavn resolver failed:", innerErr.message);
    }
  }

  // 2. Fallback to Invidious search
  const query = `${trackName} ${artistName} audio`;
  const encodedQuery = encodeURIComponent(query);
  
  let attempts = 0;
  while (attempts < INVIDIOUS_INSTANCES.length) {
    const instance = getActiveInstance();
    try {
      const url = `${instance}/api/v1/search?q=${encodedQuery}&type=video`;
      let results;

      if (isNative) {
        console.log(`CapacitorHttp searching Invidious at: ${url}`);
        const res = await CapacitorHttp.get({
          url,
          connectTimeout: 6000
        });
        if (res.status >= 300) {
          throw new Error(`Instance returned status ${res.status}`);
        }
        results = res.data;
      } else {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(6000) // Timeout after 6 seconds
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch search results");
        }
        results = await response.json();
      }
      
      if (results && results.length > 0) {
        // Return the first videoId
        const videoId = results[0].videoId;
        // Construct the proxied streaming URL
        // itag=140 is the standard AAC 128kbps audio format on YouTube
        // local=true forces the instance to proxy the media stream, preventing CORS issues
        const audioStreamUrl = `${instance}/latest_version?id=${videoId}&itag=140&local=true`;
        return {
          streamUrl: audioStreamUrl,
          videoId: videoId,
          duration: results[0].lengthSeconds
        };
      }
      
      throw new Error("No search results found");
    } catch (error) {
      console.warn(`Instance ${instance} failed: ${error.message}`);
      rotateInstance();
      attempts++;
    }
  }
  
  throw new Error("All streaming audio servers are currently busy. Please try again.");
};
