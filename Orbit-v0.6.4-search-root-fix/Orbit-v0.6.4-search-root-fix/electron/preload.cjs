
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orbit", {
  platform: process.platform,
  version: "0.6.4",

  launchApp: (appId) => ipcRenderer.invoke("orbit:launch-app", appId),

  openExternal: (url) => ipcRenderer.invoke("orbit:open-external", url),

  searchFiles: (query) => ipcRenderer.invoke("orbit:search-files", query),

  openFile: (filePath) => ipcRenderer.invoke("orbit:open-file", filePath),
  setGlobalShortcut: (accelerator) => ipcRenderer.invoke("orbit:set-global-shortcut", accelerator),
  setLaunchAtStartup: (enabled) => ipcRenderer.invoke("orbit:set-launch-at-startup", enabled),
  getLaunchAtStartup: () => ipcRenderer.invoke("orbit:get-launch-at-startup"),
});
