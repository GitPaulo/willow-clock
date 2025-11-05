import { DEFAULT_SETTINGS } from "./renderer-constants.js";

const STORAGE_KEY = "willow-clock-settings";

let settings = { ...DEFAULT_SETTINGS };

const isElectron = () => typeof window !== "undefined" && !!window.settingsAPI;

export async function loadSettings() {
  try {
    if (isElectron()) {
      const loaded = await window.settingsAPI.load();
      settings = { ...DEFAULT_SETTINGS, ...loaded };
      console.log("[Settings] Loaded from file:", settings);
    } else {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        console.log("[Settings] Loaded from localStorage:", settings);
      } else {
        console.log("[Settings] Using defaults (first run)");
      }
    }
  } catch (error) {
    console.error("[Settings] Load failed:", error);
    settings = { ...DEFAULT_SETTINGS };
  }
  return settings;
}

export async function saveSettings(updates = null) {
  if (updates) settings = { ...settings, ...updates };

  try {
    if (isElectron()) {
      await window.settingsAPI.save(settings);
      console.log("[Settings] Saved to file:", settings);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log("[Settings] Saved to localStorage:", settings);
    }
    return true;
  } catch (error) {
    console.error("[Settings] Save failed:", error);
    return false;
  }
}

export function getSettings() {
  return { ...settings };
}

export function getSetting(key, defaultValue) {
  return settings[key] ?? defaultValue ?? DEFAULT_SETTINGS[key];
}

export async function updateSettings(updates) {
  return saveSettings(updates);
}

export async function resetSettings() {
  settings = { ...DEFAULT_SETTINGS };
  return saveSettings();
}

export function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}
