import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import {
  initSystemAudio,
  stopSystemAudio,
  toggleSystemAudio,
} from "./src/audio/main-audio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSettingsPath() {
  const userHome =
    process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
  return path.join(userHome, ".willow-clock", "settings.json");
}

async function applyHardwareAccelerationSetting() {
  try {
    const settingsPath = getSettingsPath();
    const data = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(data);

    if (settings.hardwareAcceleration === false) {
      app.disableHardwareAcceleration();
      console.log("[Main] Hardware acceleration disabled");
    } else {
      console.log("[Main] Hardware acceleration enabled");
    }
  } catch {
    // File doesn't exist or error - use default (enabled)
    console.log("[Main] Using default hardware acceleration (enabled)");
  }
}

function createWindow() {
  const isWindows = process.platform === "win32";
  const isMacOS = process.platform === "darwin";
  const isLinux = process.platform === "linux";

  /** @type {Electron.BrowserWindowConstructorOptions} */
  const windowConfig = {
    width: 470,
    height: 512,
    frame: false, // fully custom window
    resizable: true,
    show: false, // show only when ready
    icon: path.join(__dirname, "public/assets/icons/app-icon.png"), // app icon
    backgroundColor: "#00000000", // transparent background (for CSS radius)
    transparent: true, // allow rounded corners to be visible
    webPreferences: {
      preload: path.join(__dirname, "src/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Audio optimizations
      experimentalFeatures: true,
      enableBlinkFeatures: "AudioWorklet",
    },
  };

  if (isMacOS) {
    windowConfig.titleBarStyle = "hiddenInset";
    windowConfig.roundedCorners = true;
    windowConfig.vibrancy = "under-window";
  } else if (isWindows) {
    windowConfig.roundedCorners = true;
    // keep transparency for custom border-radius
  } else if (isLinux) {
    windowConfig.titleBarStyle = "hidden";
    // transparency works but no native shadow on most WMs
  }

  const mainWindow = new BrowserWindow(windowConfig);

  mainWindow.loadFile("public/index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isMacOS) mainWindow.focus();
  });

  // Open DevTools only in dev env
  if (!app.isPackaged) mainWindow.webContents.openDevTools({ mode: "detach" });

  // IPC Handlers
  ipcMain.handle("start-audio-detection", () => initSystemAudio(mainWindow));
  ipcMain.handle("toggle-audio-detection", () => toggleSystemAudio());
  ipcMain.handle("stop-audio-detection", () => stopSystemAudio());

  // Settings IPC handlers
  ipcMain.handle("settings:load", async () => {
    try {
      const settingsPath = getSettingsPath();
      const data = await fs.readFile(settingsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid, return empty object (will use defaults)
      return {};
    }
  });

  ipcMain.handle("settings:save", async (event, settings) => {
    try {
      const settingsPath = getSettingsPath();
      const settingsDir = path.dirname(settingsPath);

      // Ensure directory exists
      await fs.mkdir(settingsDir, { recursive: true });

      // Write settings file
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
      return true;
    } catch (error) {
      console.error("[Main] Failed to save settings:", error);
      return false;
    }
  });

  // Window controls (from preload)
  ipcMain.on("window:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on("window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.on("window:maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });

  return mainWindow;
}

// Apply hardware acceleration setting before app initialization
applyHardwareAccelerationSetting();

app.whenReady().then(() => {
  // Audio optimizations for better playback
  app.commandLine.appendSwitch("--disable-background-timer-throttling");
  app.commandLine.appendSwitch("--disable-backgrounding-occluded-windows");
  app.commandLine.appendSwitch("--disable-renderer-backgrounding");
  app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopSystemAudio();
  if (process.platform !== "darwin") app.quit();
});
