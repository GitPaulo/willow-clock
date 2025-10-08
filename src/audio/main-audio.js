import { isMusicPlaying } from "./media-api.js";

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

  // Start polling for music state every 3 seconds
  musicCheckInterval = setInterval(async () => {
    if (!isActive || !mainWindow) return;

    try {
      const isPlaying = await isMusicPlaying();

      // Send the music status to the renderer process
      mainWindow.webContents.send("music-status-changed", isPlaying);
    } catch (error) {
      console.warn("[MainAudio] Music detection error:", error.message);
    }
  }, 3000);

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
  }, 1000); // Wait 1 second for window to be ready
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

/**
 * Toggle system audio detection on/off
 */
export function toggleSystemAudio() {
  if (isActive) {
    console.log("[MainAudio] Pausing music detection");
    isActive = false;
  } else {
    console.log("[MainAudio] Resuming music detection");
    isActive = true;
  }

  return isActive;
}
