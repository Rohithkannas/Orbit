
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orbit", {
  platform: process.platform,
  version: "3.1.0",

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
  restoreProjectFolder: (rootPath) => ipcRenderer.invoke("orbit:restore-project-folder", rootPath),
  chooseProjectFolder: () => ipcRenderer.invoke("orbit:choose-project-folder"),
  searchProject: (rootPath, query) => ipcRenderer.invoke("orbit:search-project", rootPath, query),
  runApprovedAction: (rootPath, actionId) => ipcRenderer.invoke("orbit:run-approved-action", rootPath, actionId),
  readClipboard: () => ipcRenderer.invoke("orbit:read-clipboard"),
  copyText: (text) => ipcRenderer.invoke("orbit:copy-text", text),
  getFocusTimeStats: (date) => ipcRenderer.invoke("orbit:focus-time-stats", date),
  clearFocusTime: (date) => ipcRenderer.invoke("orbit:focus-time-clear", date),
  getDesktopActivity: () => ipcRenderer.invoke("orbit:desktop-activity-stats"),
  getForegroundApplication: () => ipcRenderer.invoke("orbit:foreground-application"),
  setDesktopActivityEnabled: (enabled) => ipcRenderer.invoke("orbit:set-desktop-activity-enabled", enabled),
  checkForUpdates: () => ipcRenderer.invoke("orbit:check-for-updates"),
});
