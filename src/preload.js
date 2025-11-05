/* eslint-env node */

import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./constants.js";

contextBridge.exposeInMainWorld("audioAPI", {
  startAudio: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_START),
  stopAudio: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_STOP),
  onMusicStatusChanged: (callback) => {
    // Remove any existing listeners to prevent duplicates
    ipcRenderer.removeAllListeners(IPC_CHANNELS.AUDIO_STATUS_CHANGED);
    ipcRenderer.on(IPC_CHANNELS.AUDIO_STATUS_CHANGED, (_, isPlaying) => {
      callback(isPlaying);
    });
  },
});

contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
  onShake: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.WINDOW_SHAKE);
    ipcRenderer.on(IPC_CHANNELS.WINDOW_SHAKE, callback);
  },
});

contextBridge.exposeInMainWorld("settingsAPI", {
  load: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LOAD),
  save: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings),
});

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});
