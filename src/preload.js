/* eslint-env node */

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("audioAPI", {
  startAudio: () => ipcRenderer.invoke("start-audio-detection"),
  stopAudio: () => ipcRenderer.invoke("stop-audio-detection"),
  onMusicStatusChanged: (callback) => {
    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners("music-status-changed");
    ipcRenderer.on("music-status-changed", (_, isPlaying) => {
      callback(isPlaying);
    });
  },
});

contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  onShake: (callback) => {
    ipcRenderer.removeAllListeners("window:shake-detected");
    ipcRenderer.on("window:shake-detected", callback);
  },
});

contextBridge.exposeInMainWorld("settingsAPI", {
  load: () => ipcRenderer.invoke("settings:load"),
  save: (settings) => ipcRenderer.invoke("settings:save", settings),
});

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});
