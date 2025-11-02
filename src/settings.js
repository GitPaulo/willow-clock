const DEFAULT_SETTINGS = {
  // Audio settings
  audioOnStart: true,
  audioDetectionEnabled: true,
  timerAlarmSound: true,

  // Visual settings
  cursorTrailEnabled: true,
  debugMode: false,
  clockFormat24Hour: true, // true = 24-hour format, false = 12-hour format

  // Speech settings
  modeChangeSpeech: true,

  // Weather settings
  weatherUpdateFrequency: 120000, // 2 minutes in milliseconds
  temperatureUnit: "celsius", // "celsius" or "fahrenheit"

  // Behavior settings
  dayNightTransitionHours: { start: 6, end: 18 }, // Day: 6am-6pm, Night: 6pm-6am

  // Performance settings
  hardwareAcceleration: true, // Requires app restart
  fpsTarget: 60,
};

let currentSettings = { ...DEFAULT_SETTINGS };
let isElectron = false;

function checkElectronEnvironment() {
  isElectron =
    typeof window !== "undefined" &&
    typeof window.process !== "undefined" &&
    window.process.type === "renderer";
  return isElectron;
}

export async function loadSettings() {
  checkElectronEnvironment();

  try {
    if (isElectron && window.settingsAPI) {
      // Electron: load from file system
      const loaded = await window.settingsAPI.load();
      currentSettings = { ...DEFAULT_SETTINGS, ...loaded };
      console.log("[Settings] Loaded from file:", currentSettings);
    } else {
      // Browser: load from localStorage
      const stored = localStorage.getItem("willow-clock-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
        console.log("[Settings] Loaded from localStorage:", currentSettings);
      } else {
        console.log("[Settings] Using defaults (first run)");
      }
    }
  } catch (error) {
    console.error("[Settings] Failed to load settings:", error);
    console.log("[Settings] Using defaults due to error");
    currentSettings = { ...DEFAULT_SETTINGS };
  }

  return currentSettings;
}

export async function saveSettings(settings = null) {
  if (settings) {
    currentSettings = { ...currentSettings, ...settings };
  }

  try {
    if (isElectron && window.settingsAPI) {
      // Electron: save to file system
      await window.settingsAPI.save(currentSettings);
      console.log("[Settings] Saved to file:", currentSettings);
    } else {
      // Browser: save to localStorage
      localStorage.setItem(
        "willow-clock-settings",
        JSON.stringify(currentSettings),
      );
      console.log("[Settings] Saved to localStorage:", currentSettings);
    }
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
  if (key in currentSettings) {
    return currentSettings[key];
  }
  return defaultValue !== undefined ? defaultValue : DEFAULT_SETTINGS[key];
}

export async function updateSettings(updates) {
  currentSettings = { ...currentSettings, ...updates };
  return await saveSettings();
}

export async function resetSettings() {
  currentSettings = { ...DEFAULT_SETTINGS };
  return await saveSettings();
}

export function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}
