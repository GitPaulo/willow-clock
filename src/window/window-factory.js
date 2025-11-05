/* eslint-env node */

import path from "path";
import { fileURLToPath } from "url";
import { app, BrowserWindow } from "electron";
import { WINDOW_CONFIG } from "../constants.js";
import { setupShakeDetection } from "./shake-detection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildWindowOptions() {
  const platform = process.platform;

  // Base configuration
  const baseConfig = {
    width: WINDOW_CONFIG.WIDTH,
    height: WINDOW_CONFIG.HEIGHT,
    frame: false,
    resizable: true,
    show: false,
    icon: path.join(__dirname, "../../", WINDOW_CONFIG.ICON_PATH),
    backgroundColor: WINDOW_CONFIG.BACKGROUND_COLOR,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  };

  // Platform-specific overrides
  const platformOverrides = {
    darwin: {
      titleBarStyle: "hiddenInset",
      roundedCorners: true,
      vibrancy: "under-window",
    },
    win32: {
      roundedCorners: true,
    },
    linux: {
      titleBarStyle: "hidden",
    },
  };

  return { ...baseConfig, ...platformOverrides[platform] };
}

export function createWindow() {
  const config = buildWindowOptions();
  const win = new BrowserWindow(config);

  win.loadFile("public/index.html");

  win.once("ready-to-show", () => {
    win.show();
    if (process.platform === "darwin") win.focus();
  });

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  setupShakeDetection(win);

  return win;
}
