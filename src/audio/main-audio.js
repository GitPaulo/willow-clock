import { isMusicPlaying } from "./media-api.js";

const MUSIC_CHECK_INTERVAL_MS = 3000; // Poll every 3 seconds
const INITIAL_CHECK_DELAY_MS = 1000; // Wait 1 second for window to be ready

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

  // Clear any existing interval
  if (musicCheckInterval) {
    clearInterval(musicCheckInterval);
  }

  // Start polling for music state
  musicCheckInterval = setInterval(async () => {
    if (!isActive || !mainWindow) return;

    try {
      const isPlaying = await isMusicPlaying();

      // Send the music status to the renderer process
      mainWindow.webContents.send("music-status-changed", isPlaying);
    } catch (error) {
      console.warn("[MainAudio] Music detection error:", error.message);
    }
  }, MUSIC_CHECK_INTERVAL_MS);

  // Initial check
  setTimeout(async () => {
    if (!isActive || !mainWindow) return;

    try {
      const isPlaying = await isMusicPlaying();
      mainWindow.webContents.send("music-status-changed", isPlaying);
      console.log("[MainAudio] Music detection initialized");
    } catch (error) {
      console.warn("[MainAudio] Initial music check failed:", error.message);
    }
  }, INITIAL_CHECK_DELAY_MS);
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
