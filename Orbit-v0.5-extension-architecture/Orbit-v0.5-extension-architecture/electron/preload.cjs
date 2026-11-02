
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orbit", {
  platform: process.platform,
  version: "0.5.0",

  launchApp: (appId) => ipcRenderer.invoke("orbit:launch-app", appId),

  openExternal: (url) => ipcRenderer.invoke("orbit:open-external", url),

  searchFiles: (query) => ipcRenderer.invoke("orbit:search-files", query),

  openFile: (filePath) => ipcRenderer.invoke("orbit:open-file", filePath),
});
