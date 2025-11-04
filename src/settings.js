const STORAGE_KEY = "willow-clock-settings";

const DEFAULT_SETTINGS = {
  // Audio Settings
  audioOnStart: true,
  audioDetectionEnabled: true,
  timerAlarmSound: true,

  // Visual Settings
  cursorTrailEnabled: true,
  debugMode: false,
  clockFormat24Hour: true,

  // Speech Settings
  modeChangeSpeech: true,
  textSoundEnabled: true,

  // Weather Settings
  weatherUpdateFrequency: 120000,
  temperatureUnit: "celsius",

  // Day/Night Settings
  dayNightTransitionHours: { start: 6, end: 18 },

  // Performance Settings
  hardwareAcceleration: true,
  fpsTarget: 60,
};

let currentSettings = { ...DEFAULT_SETTINGS };
let isElectron = false;

function detectElectron() {
  return (
    typeof window !== "undefined" &&
    typeof window.process !== "undefined" &&
    window.process.type === "renderer"
  );
}

function checkElectronEnvironment() {
  isElectron = detectElectron();
  return isElectron;
}

export async function loadSettings() {
  checkElectronEnvironment();

  try {
    if (isElectron && window.settingsAPI) {
      const loaded = await window.settingsAPI.load();
      currentSettings = { ...DEFAULT_SETTINGS, ...loaded };
      console.log("[Settings] Loaded from file:", currentSettings);
      return currentSettings;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
      console.log("[Settings] Loaded from localStorage:", currentSettings);
    } else {
      console.log("[Settings] Using defaults (first run)");
    }
    return currentSettings;
  } catch (error) {
    console.error("[Settings] Failed to load settings:", error);
    currentSettings = { ...DEFAULT_SETTINGS };
    console.log("[Settings] Using defaults due to error");
    return currentSettings;
  }
}

export async function saveSettings(settings = null) {
  if (settings) currentSettings = { ...currentSettings, ...settings };

  try {
    // Re-evaluate environment to be robust if called before loadSettings()
    checkElectronEnvironment();

    if (isElectron && window.settingsAPI) {
      await window.settingsAPI.save(currentSettings);
      console.log("[Settings] Saved to file:", currentSettings);
      return true;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    console.log("[Settings] Saved to localStorage:", currentSettings);
    return true;
  } catch (error) {
    console.error("[Settings] Failed to save settings:", error);
    return false;
  }
}

export function getSettings() {
  return { ...currentSettings };
}

export function getSetting(key, defaultValue = undefined) {
  if (key in currentSettings) return currentSettings[key];
  return defaultValue !== undefined ? defaultValue : DEFAULT_SETTINGS[key];
}

export async function updateSettings(updates) {
  currentSettings = { ...currentSettings, ...updates };
  return saveSettings();
}

export async function resetSettings() {
  currentSettings = { ...DEFAULT_SETTINGS };
  return saveSettings();
}

export function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}
