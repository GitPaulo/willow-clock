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
  const mainWindow = new BrowserWindow({
    width: 324,
    height: 380,
    webPreferences: {
      preload: path.join(__dirname, "src/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.loadFile("public/index.html");

  mainWindow.webContents.openDevTools();
  ipcMain.handle("start-audio-detection", () => {
    return initSystemAudio(mainWindow);
  });

  ipcMain.handle("toggle-audio-detection", () => {
    return toggleSystemAudio();
  });

  ipcMain.handle("stop-audio-detection", () => {
    stopSystemAudio();
  });

  return mainWindow;
}

app.whenReady().then(() => {
  const mainWindow = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopSystemAudio();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
