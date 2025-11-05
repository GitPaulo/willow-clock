/* eslint-env node */

import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import { DEFAULT_SETTINGS } from "./constants.js";

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

export async function readSettings() {
  try {
    const data = await fs.readFile(getSettingsPath(), "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    console.log("[Settings] Using defaults:", error.message);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    return { ok: true };
  } catch (error) {
    console.error("[Settings] Write failed:", error);
    return { ok: false, error: error.message };
  }
}
