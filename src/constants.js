// Application Constants
// Centralized configuration for the Willow Clock application

// Window Configuration
export const WINDOW_CONFIG = {
  WIDTH: 470,
  HEIGHT: 512,
  ICON_PATH: "public/assets/icons/app-icon.png",
  BACKGROUND_COLOR: "#00000000",
};

// Shake Detection
export const SHAKE_CONFIG = {
  HISTORY_SIZE: 10,
  THRESHOLD: 150, // Movement speed threshold (pixels/second)
  DIRECTION_CHANGES: 3, // Minimum direction changes to detect shake
  COOLDOWN_MS: 5000, // 5 seconds between shake detections
};

// IPC Channel Names
export const IPC_CHANNELS = {
  // Audio detection
  AUDIO_START: "audio:start",
  AUDIO_STOP: "audio:stop",
  AUDIO_STATUS_CHANGED: "audio:status-changed",

  // Settings
  SETTINGS_LOAD: "settings:load",
  SETTINGS_SAVE: "settings:save",

  // Window controls
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close",
  WINDOW_SHAKE: "window:shake-detected",
};

// Default Settings
export const DEFAULT_SETTINGS = {
  // Audio
  audioOnStart: true,
  audioDetectionEnabled: false,
  timerAlarmSound: true,
  textSoundEnabled: true,

  // Visual
  cursorTrailEnabled: true,
  debugMode: false,
  hardwareAcceleration: true,
  fpsTarget: 60,

  // UI
  modeChangeSpeech: true,
  clockFormat24Hour: true,

  // Weather
  weatherUpdateFrequency: 1800000, // 30 minutes in ms
  temperatureUnit: "celsius",

  // Day/Night transitions
  dayNightTransitionHours: {
    start: 6,
    end: 18,
  },

  // User stats
  petCount: 0,
};

// Application Modes
export const MODE = {
  CLOCK: "clock-mode",
  STOPWATCH: "stopwatch",
  TIMER: "timer",
  FOCUS: "focus",
};

export const MODES = Object.values(MODE);

// Audio Detection
export const AUDIO_CONFIG = {
  MUSIC_CHECK_INTERVAL_MS: 1000, // Poll every second for responsive detection
  INITIAL_CHECK_DELAY_MS: 500, // Quick initial check
  MEDIA_STATE_TIMEOUT_MS: 5000, // Timeout for external media state processes
};

// Timeouts & Intervals
export const TIMEOUTS = {
  CLEANUP_GRACE_PERIOD_MS: 150,
  AUDIO_CHECK_DELAY_MS: 50,
};
