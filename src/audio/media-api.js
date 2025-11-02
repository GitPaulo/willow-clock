import { execFile } from "child_process";
import { platform } from "os";
import { resolve } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const MEDIA_STATE_TIMEOUT_MS = 5000; // 5 second timeout for external processes

// Platform-specific executables bundled with the app
const EXECUTABLES = {
  win32: resolve("./bin/MediaState.exe"),
  linux: resolve("./src/audio/lib/linux/media-state.js"),
  darwin: resolve("./src/audio/lib/macos/media-state.js"),
};

/**
 * Check if external music is currently playing on the system
 * Filters out our own Electron app to avoid detecting app's background music
 * @returns {Promise<boolean>} True if any external media is playing
 */
export async function isMusicPlaying() {
  try {
    const { playing, sources } = await getMediaState();

    if (!playing) return false;

    // macOS Swift: No source tracking, trust audio device state
    if (!sources || sources.length === 0) return playing;

    // Windows/Linux: Filter out our own Electron app (chromium instances)
    const externalSources = sources.filter(
      (source) => !/chromium\.instance\d+/.test(source),
    );

    return externalSources.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get current system media state
 * @returns {Promise<{playing: boolean, sources: string[]}>}
 * @private
 */
async function getMediaState() {
  const currentPlatform = platform();
  const executable = EXECUTABLES[currentPlatform];

  if (!executable) {
    throw new Error(`Unsupported platform: ${currentPlatform}`);
  }

  const isUnixLike =
    currentPlatform === "linux" || currentPlatform === "darwin";
  const command = isUnixLike ? "node" : executable;
  const args = isUnixLike ? [executable] : [];

  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: MEDIA_STATE_TIMEOUT_MS,
      encoding: "utf8",
    });

    const result = JSON.parse(stdout.trim());

    return {
      playing: Boolean(result.playing),
      sources: Array.isArray(result.sources) ? result.sources : [],
    };
  } catch (error) {
    if (error.code === "TIMEOUT") {
      throw new Error("Media state check timeout");
    }
    throw error;
  }
}
