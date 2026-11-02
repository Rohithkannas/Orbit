
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  shell,
} = require("electron");

const path = require("node:path");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");

let mainWindow;
let currentShortcut = "CommandOrControl+Shift+Space";

const allowedApps = {
  notepad: {
    executable: "notepad.exe",
    args: [],
  },
  calculator: {
    executable: "calc.exe",
    args: [],
  },
};

const allowedExternalUrls = new Set([
  "https://www.google.com",
  "https://github.com",
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 450,
    title: "Orbit",
    backgroundColor: "#0b0b10",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (allowedExternalUrls.has(url)) {
      void shell.openExternal(url).catch((error) => {
        console.error("Failed to open external URL:", error.message);
      });
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedDevUrl = "http://127.0.0.1:5173/";

    if (!app.isPackaged && url === allowedDevUrl) {
      return;
    }

    if (app.isPackaged && url.startsWith("file://")) {
      return;
    }

    event.preventDefault();
  });

  if (app.isPackaged) {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    void mainWindow.loadURL("http://127.0.0.1:5173/");
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

// Launch only explicitly allowlisted Windows applications.
ipcMain.handle("orbit:launch-app", async (_event, appId) => {
  if (
    typeof appId !== "string" ||
    !Object.prototype.hasOwnProperty.call(allowedApps, appId)
  ) {
    return {
      success: false,
      error: "Application not allowed.",
    };
  }

  const target = allowedApps[appId];

  return new Promise((resolve) => {
    const child = spawn(target.executable, target.args, {
      detached: true,
      stdio: "ignore",
      shell: false,
      windowsHide: true,
    });

    child.once("error", (error) => {
      console.error(`Failed to launch ${appId}:`, error.message);

      resolve({
        success: false,
        error: `Could not launch ${appId}.`,
      });
    });

    child.once("spawn", () => {
      child.unref();
      resolve({ success: true });
    });
  });
});

// Open only approved external websites.
ipcMain.handle("orbit:open-external", async (_event, url) => {
  if (typeof url !== "string" || !allowedExternalUrls.has(url)) {
    return {
      success: false,
      error: "URL not allowed.",
    };
  }

  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error("Failed to open website:", error);

    return {
      success: false,
      error: "Could not open website.",
    };
  }
});

function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else { mainWindow.show(); mainWindow.focus(); }
}

function registerToggleShortcut(accelerator) {
  globalShortcut.unregister(currentShortcut);
  const registered = globalShortcut.register(accelerator, toggleMainWindow);
  if (registered) currentShortcut = accelerator;
  else globalShortcut.register(currentShortcut, toggleMainWindow);
  return registered;
}

ipcMain.handle("orbit:set-global-shortcut", async (_event, accelerator) => {
  const allowed = new Set([
    "CommandOrControl+Shift+Space",
    "CommandOrControl+Alt+Space",
    "CommandOrControl+Shift+O",
  ]);
  if (typeof accelerator !== "string" || !allowed.has(accelerator)) {
    return { success: false, error: "That shortcut is not supported." };
  }
  if (!registerToggleShortcut(accelerator)) {
    return { success: false, error: "That shortcut is already in use by another application." };
  }
  return { success: true };
});

ipcMain.handle("orbit:get-launch-at-startup", async () => {
  try { return app.getLoginItemSettings().openAtLogin === true; }
  catch { return false; }
});

ipcMain.handle("orbit:set-launch-at-startup", async (_event, enabled) => {
  if (typeof enabled !== "boolean") return { success: false, error: "Invalid startup preference." };
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: app.isPackaged ? [] : [app.getAppPath()],
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update launch-at-startup setting:", error);
    return { success: false, error: "Windows could not update the launch-at-sign-in setting." };
  }
});

app.whenReady().then(() => {
  createWindow();

  registerToggleShortcut(currentShortcut);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});


const searchableFolders = [
  path.join(os.homedir(), "Desktop"),
  path.join(os.homedir(), "Documents"),
  path.join(os.homedir(), "Downloads"),
];

ipcMain.handle("orbit:search-files", async (_event, query) => {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 160) {
    return [];
  }

  const searchTerm = query.trim().toLowerCase();
  const results = [];
  const maxResults = 30;
  const maxEntriesPerFolder = 2000;

  async function scanFolder(folder, depth = 0) {
    if (depth > 3 || results.length >= maxResults) return;

    let entries;

    try {
      entries = await fs.readdir(folder, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries.slice(0, maxEntriesPerFolder)) {
      if (results.length >= maxResults) return;

      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      const fullPath = path.join(folder, entry.name);

      if (entry.name.toLowerCase().includes(searchTerm)) {
        results.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
        });
      }

      if (entry.isDirectory()) {
        await scanFolder(fullPath, depth + 1);
      }
    }
  }

  for (const folder of searchableFolders) {
    await scanFolder(folder);

    if (results.length >= maxResults) break;
  }

  return results;
});

ipcMain.handle("orbit:open-file", async (_event, filePath) => {
  if (typeof filePath !== "string" || filePath.length > 4096) {
    return { success: false, error: "Invalid file path." };
  }

  const normalizedPath = path.resolve(filePath);
  const isAllowed = searchableFolders.some((folder) => {
    const relative = path.relative(folder, normalizedPath);
    return relative === "" ||
      (!relative.startsWith("..") && !path.isAbsolute(relative));
  });

  if (!isAllowed) {
    return { success: false, error: "Path is outside searchable folders." };
  }

  try {
    await fs.access(normalizedPath);
    const error = await shell.openPath(normalizedPath);

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Could not open the selected item." };
  }
});
