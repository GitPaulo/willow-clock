import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { initSystemAudio, stopSystemAudio } from "./src/audio/main-audio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSettingsPath() {
  const home =
    process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
  return path.join(home, ".willow-clock", "settings.json");
}

async function applyHardwareAccelerationSetting() {
  try {
    const data = await fs.readFile(getSettingsPath(), "utf-8");
    const { hardwareAcceleration } = JSON.parse(data);

    if (hardwareAcceleration === false) {
      app.disableHardwareAcceleration();
      console.log("[Main] Hardware acceleration disabled");
      return;
    }
    console.log("[Main] Hardware acceleration enabled");
  } catch {
    console.log("[Main] Default hardware acceleration (enabled)");
  }
}

function createWindow() {
  const platform = process.platform;

  const config = {
    width: 470,
    height: 512,
    frame: false,
    resizable: true,
    show: false,
    icon: path.join(__dirname, "public/assets/icons/app-icon.png"),
    backgroundColor: "#00000000",
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "src/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      experimentalFeatures: true,
      enableBlinkFeatures: "AudioWorklet",
    },
  };

  if (platform === "darwin") {
    Object.assign(config, {
      titleBarStyle: "hiddenInset",
      roundedCorners: true,
      vibrancy: "under-window",
    });
  } else if (platform === "win32") {
    config.roundedCorners = true;
  } else if (platform === "linux") {
    config.titleBarStyle = "hidden";
  }

  const win = new BrowserWindow(config);
  win.loadFile("public/index.html");

  win.once("ready-to-show", () => {
    win.show();
    if (platform === "darwin") win.focus();
  });

  if (!app.isPackaged) win.webContents.openDevTools({ mode: "detach" });

  registerIPC(win);

  return win;
}

function registerIPC(mainWindow) {
  ipcMain.handle("start-audio-detection", () => initSystemAudio(mainWindow));
  ipcMain.handle("stop-audio-detection", () => stopSystemAudio());

  ipcMain.handle("settings:load", async () => {
    try {
      const data = await fs.readFile(getSettingsPath(), "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  });

  ipcMain.handle("settings:save", async (_, settings) => {
    try {
      const file = getSettingsPath();
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(settings, null, 2));
      return true;
    } catch (err) {
      console.error("[Main] Failed to save settings:", err);
      return false;
    }
  });

  ipcMain.on("window:minimize", (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    win?.minimize();
  });

  ipcMain.on("window:close", (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    win?.close();
  });

  ipcMain.on("window:maximize", (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
}

// App lifecycle
applyHardwareAccelerationSetting();

app.whenReady().then(() => {
  // Audio and render stability
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
