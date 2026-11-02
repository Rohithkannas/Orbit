
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orbit", {
  platform: process.platform,
  version: "1.6.0",

  launchApp: (appId) => ipcRenderer.invoke("orbit:launch-app", appId),

  openExternal: (url) => ipcRenderer.invoke("orbit:open-external", url),

  searchFiles: (query) => ipcRenderer.invoke("orbit:search-files", query),

  openFile: (filePath) => ipcRenderer.invoke("orbit:open-file", filePath),
  readTextFile: (filePath) => ipcRenderer.invoke("orbit:read-text-file", filePath),
  saveAIDraft: (fileName, content) => ipcRenderer.invoke("orbit:save-ai-draft", fileName, content),
  setGlobalShortcut: (accelerator) => ipcRenderer.invoke("orbit:set-global-shortcut", accelerator),
  setLaunchAtStartup: (enabled) => ipcRenderer.invoke("orbit:set-launch-at-startup", enabled),
  getLaunchAtStartup: () => ipcRenderer.invoke("orbit:get-launch-at-startup"),
  askAI: (config, prompt, history) => ipcRenderer.invoke("orbit:ask-ai", config, prompt, history),
  testAI: (config) => ipcRenderer.invoke("orbit:test-ai", config),
});
