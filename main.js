import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import {
  initSystemAudio,
  stopSystemAudio,
  toggleSystemAudio,
} from "./src/audio/main-audio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const isWindows = process.platform === "win32";
  const isMacOS = process.platform === "darwin";
  const isLinux = process.platform === "linux";

  /** @type {Electron.BrowserWindowConstructorOptions} */
  const windowConfig = {
    width: 470,
    height: 500,
    frame: false, // fully custom window
    resizable: true,
    show: false, // show only when ready
    icon: path.join(__dirname, "assets/icons/app-icon.png"), // app icon
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

app.whenReady().then(() => {
  // Audio optimizations for better playback
  app.commandLine.appendSwitch('--disable-background-timer-throttling');
  app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('--disable-renderer-backgrounding');
  app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopSystemAudio();
  if (process.platform !== "darwin") app.quit();
});
