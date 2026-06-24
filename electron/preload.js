// Exposes a safe `window.prism` bridge to the renderer. The shape mirrors the
// Android Capacitor "Wallpaper" plugin so the same React UI works unchanged.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("prism", {
  platform: "electron",

  getPlayback: () => ipcRenderer.invoke("prism:getPlayback"),
  getNowPlaying: () => ipcRenderer.invoke("prism:getNowPlaying"),
  mediaControl: (opts) => ipcRenderer.invoke("prism:mediaControl", opts),
  seekTo: (opts) => ipcRenderer.invoke("prism:seekTo", opts),
  setWallpaperFromBase64: (data, target) =>
    ipcRenderer.invoke("prism:setWallpaper", { data, target }),
  applyWallpaper: (target) => ipcRenderer.invoke("prism:applyWallpaper", { target }),
  getAutoApply: () => ipcRenderer.invoke("prism:getAutoApply"),
  setAutoApply: (enabled, target) =>
    ipcRenderer.invoke("prism:setAutoApply", { enabled, target }),

  // live push of the SMTC snapshot (main polls once/sec)
  onPlayback: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on("prism:playback", handler);
    return () => ipcRenderer.removeListener("prism:playback", handler);
  },

  // frameless window controls
  window: {
    minimize: () => ipcRenderer.send("prism:win", "min"),
    maximize: () => ipcRenderer.send("prism:win", "max"),
    close: () => ipcRenderer.send("prism:win", "close"),
  },
});
