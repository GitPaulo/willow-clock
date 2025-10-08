import { execFile } from 'child_process';
import { platform } from 'os';
import { resolve } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Platform-specific executables bundled with the app
const EXECUTABLES = {
  win32: resolve('./bin/MediaState.exe'),
  linux: resolve('./src/audio/lib/linux/media-state.js')
};

/**
 * Check if music is currently playing on the system
 * Filters out our own Electron app to avoid detecting background music
 * @returns {Promise<boolean>} True if any external media is playing
 */
export async function isMusicPlaying() {
  try {
    const { playing, sources } = await getMediaState();

    if (!playing || !sources || sources.length === 0) {
      return false;
    }

    // Filter out chromium instances (our own Electron app)
    const externalSources = sources.filter(source =>
      !/chromium\.instance\d+/.test(source)
    );

    // If no external sources remain, no external music is playing
    return externalSources.length > 0;

  } catch (error) {
    // Fail silently - return false if detection fails
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

  const isLinux = currentPlatform === 'linux';
  const command = isLinux ? 'node' : executable;
  const args = isLinux ? [executable] : [];

  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: 5000,
      encoding: 'utf8'
    });

    const result = JSON.parse(stdout.trim());

    return {
      playing: Boolean(result.playing),
      sources: Array.isArray(result.sources) ? result.sources : []
    };
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      throw new Error('Media state check timeout');
    }
    throw error;
  }
}
