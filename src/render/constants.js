// Only constants needed by the renderer process

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
