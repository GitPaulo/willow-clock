const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("audioAPI", {
  startAudio: () => ipcRenderer.invoke("start-audio-detection"),
  toggleAudio: () => ipcRenderer.invoke("toggle-audio-detection"),
  stopAudio: () => ipcRenderer.invoke("stop-audio-detection"),
  onAudioStateChanged: (callback) => {
    ipcRenderer.on("audio-state-changed", (event, audioActive) => {
      callback(audioActive);
    });
  },
});

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
