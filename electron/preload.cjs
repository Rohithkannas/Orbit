const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("orbit", {
  platform: process.platform,
  version: "0.1.0",
});
