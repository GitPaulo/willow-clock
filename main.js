import { app, BrowserWindow } from "electron";
import { stopSystemAudio } from "./src/audio/main-audio.js";
import { TIMEOUTS } from "./src/constants.js";
import { readSettings } from "./src/settings-manager.js";
import { createWindow } from "./src/window/window-factory.js";
import { registerIPCHandlers } from "./src/ipc-handlers.js";

// Bootstrap: Apply settings before app is ready
async function bootstrapAppFlags() {
  const settings = await readSettings();

  if (settings.hardwareAcceleration === false) {
    app.disableHardwareAcceleration();
    console.log("[Main] Hardware acceleration disabled");
  }

  app.commandLine.appendSwitch("--disable-background-timer-throttling");
  app.commandLine.appendSwitch("--disable-backgrounding-occluded-windows");
  app.commandLine.appendSwitch("--disable-renderer-backgrounding");
  app.commandLine.appendSwitch("--autoplay-policy", "no-user-gesture-required");
}

bootstrapAppFlags();

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  console.log("[Main] Another instance is already running");
  app.quit();
} else {
  app.on("second-instance", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// Windows app ID
if (process.platform === "win32") {
  app.setAppUserModelId("com.willow-clock.app");
}

// App ready
app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Cleanup on quit
let isQuitting = false;

async function cleanup() {
  if (isQuitting) return;
  isQuitting = true;

  console.log("[Main] Cleaning up...");

  try {
    await stopSystemAudio();
    await new Promise((resolve) =>
      setTimeout(resolve, TIMEOUTS.CLEANUP_GRACE_PERIOD_MS),
    );
  } catch (error) {
    console.error("[Main] Cleanup error:", error);
  }
}

app.on("before-quit", async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    await cleanup();
    app.exit(0);
  }
});

app.on("window-all-closed", async () => {
  await cleanup();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
