import { BrowserWindow, ipcMain } from "electron";
import { IPC_CHANNELS } from "./constants.js";
import { initSystemAudio, stopSystemAudio } from "./audio/main-audio.js";
import { readSettings, writeSettings } from "./settings-manager.js";

export function registerIPCHandlers() {
  // Audio detection
  ipcMain.handle(IPC_CHANNELS.AUDIO_START, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return initSystemAudio(win);
  });

  ipcMain.handle(IPC_CHANNELS.AUDIO_STOP, () => stopSystemAudio());

  // Settings management
  ipcMain.handle(IPC_CHANNELS.SETTINGS_LOAD, async () => {
    return await readSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_, settings) => {
    const result = await writeSettings(settings);
    return result.ok;
  });

  // Window controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    }
  });
}
