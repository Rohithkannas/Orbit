
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orbit", {
  platform: process.platform,
  version: "1.9.0",

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
  startAIStream: (config, prompt, history, requestId) => ipcRenderer.send("orbit:ai-stream-start", config, prompt, history, requestId),
  stopAIStream: (requestId) => ipcRenderer.send("orbit:ai-stream-stop", requestId),
  onAIStreamEvent: (callback) => {
    const handlers = ["orbit:ai-chunk", "orbit:ai-finished", "orbit:ai-failed"];
    const listener = (_event, payload) => callback(payload);
    handlers.forEach((channel) => ipcRenderer.on(channel, listener));
    return () => handlers.forEach((channel) => ipcRenderer.removeListener(channel, listener));
  },
  testAI: (config) => ipcRenderer.invoke("orbit:test-ai", config),
});
