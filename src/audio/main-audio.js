// Internal modules
import { AUDIO_CONFIG } from "../constants.js";
import { isMusicPlaying } from "./media-api.js";

let musicCheckInterval = null;
let mainWindow = null;
let isActive = false;

// Initialize system audio detection
export function initSystemAudio(window) {
  mainWindow = window;
  isActive = true;

  console.log("[MainAudio] Starting music detection...");

  if (musicCheckInterval) {
    clearInterval(musicCheckInterval);
  }

  musicCheckInterval = setInterval(
    () => checkAndBroadcastMusicState(),
    AUDIO_CONFIG.MUSIC_CHECK_INTERVAL_MS,
  );

  // Initial check after short delay
  setTimeout(
    () => checkAndBroadcastMusicState(),
    AUDIO_CONFIG.INITIAL_CHECK_DELAY_MS,
  );
}

async function checkAndBroadcastMusicState() {
  if (!isActive || !mainWindow) return;

  try {
    const isPlaying = await isMusicPlaying();
    mainWindow.webContents.send("audio:status-changed", isPlaying);
  } catch (error) {
    console.warn("[MainAudio] Music detection error:", error.message);
  }
}

// Stop system audio detection
export async function stopSystemAudio() {
  isActive = false;

  if (musicCheckInterval) {
    clearInterval(musicCheckInterval);
    musicCheckInterval = null;
    console.log("[MainAudio] Music detection stopped");
  }

  // Wait a tick to ensure any in-flight checks complete
  await new Promise((resolve) => setTimeout(resolve, 50));

  mainWindow = null;
}
