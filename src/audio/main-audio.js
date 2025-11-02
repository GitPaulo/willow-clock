import { isMusicPlaying } from "./media-api.js";

const MUSIC_CHECK_INTERVAL_MS = 1000; // Poll every second for responsive detection
const INITIAL_CHECK_DELAY_MS = 500; // Quick initial check

let musicCheckInterval = null;
let mainWindow = null;
let isActive = false;

/**
 * Initialize system audio detection
 * @param {Electron.BrowserWindow} window - Main window instance
 */
export function initSystemAudio(window) {
  mainWindow = window;
  isActive = true;

  console.log("[MainAudio] Starting music detection...");

  if (musicCheckInterval) {
    clearInterval(musicCheckInterval);
  }

  musicCheckInterval = setInterval(
    () => checkAndBroadcastMusicState(),
    MUSIC_CHECK_INTERVAL_MS,
  );

  // Initial check after short delay
  setTimeout(() => checkAndBroadcastMusicState(), INITIAL_CHECK_DELAY_MS);
}

async function checkAndBroadcastMusicState() {
  if (!isActive || !mainWindow) return;

  try {
    const isPlaying = await isMusicPlaying();
    mainWindow.webContents.send("music-status-changed", isPlaying);
  } catch (error) {
    console.warn("[MainAudio] Music detection error:", error.message);
  }
}

/**
 * Stop system audio detection
 */
export function stopSystemAudio() {
  isActive = false;

  if (musicCheckInterval) {
    clearInterval(musicCheckInterval);
    musicCheckInterval = null;
    console.log("[MainAudio] Music detection stopped");
  }

  mainWindow = null;
}
