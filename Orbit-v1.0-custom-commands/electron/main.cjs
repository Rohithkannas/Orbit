
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

function isAllowedExternalUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

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
    if (allowedExternalUrls.has(url) || isAllowedExternalUrl(url)) {
      void shell.openExternal(url).catch((error) => {
        console.error("Failed to open external URL:", error.message);
      });
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedDevUrl = "http://127.0.0.1:5176/";

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
    void mainWindow.loadURL("http://127.0.0.1:5176/");
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
  if (!isAllowedExternalUrl(url)) {
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


const userHome = os.homedir();
// app.getAppPath() is the actual Electron project root; process.cwd() can vary
// depending on how Electron was launched, so both are included explicitly.
const searchableFolders = [...new Set([
  app.getAppPath(),
  process.cwd(),
  path.join(userHome, "Orbit"),
  path.join(userHome, "Desktop"),
  path.join(userHome, "Documents"),
  path.join(userHome, "Downloads"),
].map((folder) => path.resolve(folder)))];

const skippedDirectoryNames = new Set([
  "node_modules", ".git", ".cache", "appdata", "application data",
  "local settings", "temp", "tmp", "windows", "$recycle.bin",
  "program files", "program files (x86)", "programdata", "system volume information",
  "dist", "build", ".venv", "venv",
]);

ipcMain.handle("orbit:search-files", async (_event, query) => {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 160) return [];

  const searchTerm = query.trim().toLocaleLowerCase();
  const results = [];
  const seenPaths = new Set();
  const maxResults = 80;
  const maxEntriesPerFolder = 3000;
  const maxFoldersScanned = 2500;
  let scannedFolders = 0;

  function addResult(name, fullPath, isDirectory) {
    const normalized = path.resolve(fullPath).toLocaleLowerCase();
    if (seenPaths.has(normalized) || results.length >= maxResults) return;
    seenPaths.add(normalized);
    results.push({ name, path: fullPath, isDirectory });
  }

  async function scanRoot(root, maxDepth) {
    const queue = [{ folder: root, depth: 0 }];
    while (queue.length && results.length < maxResults && scannedFolders < maxFoldersScanned) {
      const current = queue.shift();
      if (!current) break;
      scannedFolders += 1;
      let entries;
      try {
        entries = await fs.readdir(current.folder, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries.slice(0, maxEntriesPerFolder)) {
        if (results.length >= maxResults) break;
        const fullPath = path.join(current.folder, entry.name);
        const name = entry.name.toLocaleLowerCase();
        // Match both the item's name and its full path. This means searching
        // for "orbit" can find files inside a folder named Orbit as expected.
        if (name.includes(searchTerm) || fullPath.toLocaleLowerCase().includes(searchTerm)) {
          addResult(entry.name, fullPath, entry.isDirectory());
        }
        if (entry.isDirectory() && current.depth < maxDepth &&
            !skippedDirectoryNames.has(name) && !name.startsWith(".")) {
          queue.push({ folder: fullPath, depth: current.depth + 1 });
        }
      }
    }
  }

  for (const root of searchableFolders) {
    if (results.length >= maxResults || scannedFolders >= maxFoldersScanned) break;
    try {
      const stat = await fs.stat(root);
      if (!stat.isDirectory()) continue;
      const rootName = path.basename(root);
      if (rootName.toLocaleLowerCase().includes(searchTerm)) {
        addResult(rootName, root, true);
      }
      // Prioritize shallow results in the current project before user folders.
      const depth = root === path.resolve(app.getAppPath()) || root === path.resolve(process.cwd()) ? 6 : 4;
      await scanRoot(root, depth);
    } catch {
      // Missing or inaccessible roots are skipped; remaining roots still work.
    }
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
