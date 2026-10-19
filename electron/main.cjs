const { app, BrowserWindow, globalShortcut } = require("electron");
const path = require("node:path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 520,
    minWidth: 600,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#101014",
    title: "Orbit",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL("http://127.0.0.1:5173");

  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: "deny",
  }));

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== "http://127.0.0.1:5173/") {
      event.preventDefault();
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function toggleLauncher() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
  createWindow();

  const registered = globalShortcut.register(
    "CommandOrControl+Shift+Space",
    toggleLauncher
  );

  if (!registered) {
    console.error("Could not register Orbit's global shortcut.");
  }

  app.on("activate", () => {
    if (!mainWindow) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
