
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
    const allowedDevUrl = "http://127.0.0.1:5174/";

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
    void mainWindow.loadURL("http://127.0.0.1:5174/");
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


const userHome = os.homedir();
const projectRoot = process.cwd();
const searchableFolders = [...new Set([
  // Search the project the user actually launched first. This avoids confusion
  // when multiple extracted Orbit versions exist under the same parent folder.
  projectRoot,
  path.join(userHome, "Orbit"),
  path.join(userHome, "Desktop"),
  path.join(userHome, "Documents"),
  path.join(userHome, "Downloads"),
].map((folder) => path.resolve(folder)))];

const skippedDirectoryNames = new Set([
  "node_modules", ".git", ".cache", "appdata", "application data",
  "local settings", "temp", "tmp", "windows", "$recycle.bin",
  "program files", "program files (x86)", "programdata", "system volume information",
]);

ipcMain.handle("orbit:search-files", async (_event, query) => {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 160) {
    return [];
  }

  const searchTerm = query.trim().toLocaleLowerCase();
  const results = [];
  const seenPaths = new Set();
  const visitedFolders = new Set();
  const maxResults = 60;
  const maxEntriesPerFolder = 2500;
  const maxFoldersScanned = 1500;

  function addResult(entry, fullPath) {
    const normalized = path.resolve(fullPath).toLocaleLowerCase();
    if (seenPaths.has(normalized)) return;
    seenPaths.add(normalized);
    results.push({ name: entry.name, path: fullPath, isDirectory: entry.isDirectory() });
  }

  async function scanRoot(root, maxDepth) {
    const queue = [{ folder: root, depth: 0 }];

    while (queue.length && results.length < maxResults && visitedFolders.size < maxFoldersScanned) {
      const current = queue.shift();
      if (!current) break;
      const normalizedFolder = path.resolve(current.folder).toLocaleLowerCase();
      if (visitedFolders.has(normalizedFolder)) continue;
      visitedFolders.add(normalizedFolder);

      let entries;
      try {
        entries = await fs.readdir(current.folder, { withFileTypes: true });
      } catch {
        continue;
      }

      // Breadth-first traversal checks shallow, likely results before exploring
      // large nested trees. A project root is searched before user libraries.
      for (const entry of entries.slice(0, maxEntriesPerFolder)) {
        if (results.length >= maxResults) break;
        if (entry.name.startsWith(".")) continue;
        const fullPath = path.join(current.folder, entry.name);
        if (entry.name.toLocaleLowerCase().includes(searchTerm)) addResult(entry, fullPath);
        if (
          entry.isDirectory() &&
          current.depth < maxDepth &&
          !skippedDirectoryNames.has(entry.name.toLocaleLowerCase())
        ) {
          queue.push({ folder: fullPath, depth: current.depth + 1 });
        }
      }
    }
  }

  // Keep scopes explicit and ordered. Do not recursively crawl the entire user
  // profile before searching the project: that made results appear missing or
  // extremely slow on machines with large OneDrive/dev folders.
  const roots = [
    { folder: projectRoot, depth: 5 },
    { folder: path.join(userHome, "Orbit"), depth: 5 },
    { folder: path.join(userHome, "Desktop"), depth: 4 },
    { folder: path.join(userHome, "Documents"), depth: 4 },
    { folder: path.join(userHome, "Downloads"), depth: 4 },
  ];

  for (const root of roots) {
    if (results.length >= maxResults) break;
    try {
      const stat = await fs.stat(root.folder);
      if (stat.isDirectory()) await scanRoot(root.folder, root.depth);
    } catch {
      // A missing or inaccessible search root should not stop the other roots.
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
