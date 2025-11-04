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

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  // Shake detection
  setupShakeDetection(win);

  return win;
}

function setupShakeDetection(win) {
  const positionHistory = [];
  const HISTORY_SIZE = 10;
  const SHAKE_THRESHOLD = 150; // Movement speed threshold
  const DIRECTION_CHANGES = 3; // Minimum direction changes to detect shake
  const COOLDOWN_MS = 5000; // 5 seconds between shake detections
  let lastShakeTime = 0;

  win.on("move", () => {
    const bounds = win.getBounds();
    const now = Date.now();

    positionHistory.push({ x: bounds.x, y: bounds.y, time: now });
    if (positionHistory.length > HISTORY_SIZE) positionHistory.shift();

    // Need at least a few positions to detect shake
    if (positionHistory.length < 5) return;

    // Check if we're in cooldown
    if (now - lastShakeTime < COOLDOWN_MS) return;

    // Calculate velocities and direction changes
    let totalSpeed = 0;
    let directionChanges = 0;
    let prevDx = 0;
    let prevDy = 0;

    for (let i = 1; i < positionHistory.length; i++) {
      const curr = positionHistory[i];
      const prev = positionHistory[i - 1];
      const dt = (curr.time - prev.time) / 1000; // seconds

      if (dt === 0) continue;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = distance / dt;

      totalSpeed += speed;

      // Count direction changes
      if (i > 1) {
        if ((dx > 0 && prevDx < 0) || (dx < 0 && prevDx > 0))
          directionChanges++;
        if ((dy > 0 && prevDy < 0) || (dy < 0 && prevDy > 0))
          directionChanges++;
      }

      prevDx = dx;
      prevDy = dy;
    }

    const avgSpeed = totalSpeed / (positionHistory.length - 1);

    // Detect shake: high speed + multiple direction changes
    if (avgSpeed > SHAKE_THRESHOLD && directionChanges >= DIRECTION_CHANGES) {
      lastShakeTime = now;
      positionHistory.length = 0; // Clear history
      win.webContents.send("window:shake-detected");
    }
  });
}

// -------------------------------------------------------------------------------------
// IPC Handlers (registered once at startup)
// -------------------------------------------------------------------------------------
function registerIPCHandlers() {
  // Audio detection
  ipcMain.handle("start-audio-detection", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return initSystemAudio(win);
  });

  ipcMain.handle("stop-audio-detection", () => stopSystemAudio());

  // Settings management
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
      const settingsPath = getSettingsPath();
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
      return true;
    } catch (err) {
      console.error("[Main] Failed to save settings:", err);
      return false;
    }
  });

  // Window controls
  ipcMain.on("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.on("window:maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    }
  });
}

// -------------------------------------------------------------------------------------
// App Lifecycle
// -------------------------------------------------------------------------------------
applyHardwareAccelerationSetting();

app.whenReady().then(() => {
  // Audio and render stability switches
  app.commandLine.appendSwitch("--disable-background-timer-throttling");
  app.commandLine.appendSwitch("--disable-backgrounding-occluded-windows");
  app.commandLine.appendSwitch("--disable-renderer-backgrounding");
  app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");

  // Register IPC handlers once
  registerIPCHandlers();

  // Create initial window
  createWindow();

  // macOS: recreate window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopSystemAudio();
  if (process.platform !== "darwin") app.quit();
});
