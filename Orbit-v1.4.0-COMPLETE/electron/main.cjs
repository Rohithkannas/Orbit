
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


function validateAIConfig(config) {
  if (!config || typeof config !== "object") throw new Error("Configure your AI provider in Settings first.");
  const baseUrl = typeof config.baseUrl === "string" ? config.baseUrl.trim().replace(/\/$/, "") : "";
  const model = typeof config.model === "string" ? config.model.trim() : "";
  const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
  if (!baseUrl || baseUrl.length > 500 || !model || model.length > 200) throw new Error("Enter a provider URL and model name in AI Settings.");
  let parsed;
  try { parsed = new URL(baseUrl); } catch { throw new Error("Provider URL is invalid."); }
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) throw new Error("Use HTTPS for remote providers. HTTP is allowed only for localhost.");
  if (parsed.username || parsed.password) throw new Error("Do not embed credentials in the provider URL.");
  return { baseUrl, model, apiKey };
}

async function requestAI(config, prompt, history = [], testOnly = false) {
  const { baseUrl, model, apiKey } = validateAIConfig(config);
  const input = testOnly ? "Reply with exactly: Orbit AI connection successful." : prompt;
  if (typeof input !== "string" || !input.trim() || input.length > 12000) throw new Error("Enter a prompt under 12,000 characters.");
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const isOllama = /\/api$/.test(baseUrl) || /localhost:11434$/.test(baseUrl) || /127\.0\.0\.1:11434$/.test(baseUrl);
  const endpoint = isOllama ? `${baseUrl.replace(/\/api$/, "")}/api/chat` : `${baseUrl}/chat/completions`;
  const systemMessage = { role: "system", content: "You are Orbit, a fast, helpful desktop AI assistant. Use the conversation history to answer follow-up questions. Remember facts the user stated earlier in this conversation. For code requests, provide complete, usable code and a concise explanation. Format answers with Markdown. Be concise unless detail is requested." };
  const safeHistory = !testOnly && Array.isArray(history)
    ? history.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
        .slice(-12).map((item) => ({ role: item.role, content: item.content.slice(0, 12000) }))
    : [];
  const messages = [systemMessage, ...safeHistory, { role: "user", content: input }];
  const body = isOllama
    ? { model, messages, stream: false, think: false, keep_alive: "10m", options: { temperature: 0.2, num_predict: 1024, num_ctx: 4096 } }
    : { model, messages, stream: false, temperature: 0.2, max_tokens: 1024 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || data?.error || data?.message;
      throw new Error(typeof detail === "string" ? detail.slice(0, 500) : `Provider returned HTTP ${response.status}.`);
    }
    const content = isOllama ? data?.message?.content : data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("The model returned an empty response. Check the model name and provider endpoint.");
    return { success: true, answer: content.trim() };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("AI request timed out after 90 seconds. Check that the model is running.");
    throw new Error(error?.message || "Could not connect to the AI provider.");
  } finally { clearTimeout(timeout); }
}

ipcMain.handle("orbit:ask-ai", async (_event, config, prompt, history) => {
  try { return await requestAI(config, prompt, history, false); }
  catch (error) { return { success: false, error: error.message || "AI request failed." }; }
});
ipcMain.handle("orbit:test-ai", async (_event, config) => {
  try { const result = await requestAI(config, "test", [], true); return { success: true, answer: result.answer }; }
  catch (error) { return { success: false, error: error.message || "AI connection test failed." }; }
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

ipcMain.handle("orbit:read-text-file", async (_event, filePath) => {
  if (typeof filePath !== "string" || filePath.length > 4096) return { success: false, error: "Invalid file path." };
  const normalizedPath = path.resolve(filePath);
  const isAllowed = searchableFolders.some((folder) => {
    const relative = path.relative(folder, normalizedPath);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
  if (!isAllowed) return { success: false, error: "Path is outside searchable folders." };
  const allowedExtensions = new Set([".txt", ".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".h", ".css", ".html", ".xml", ".yaml", ".yml", ".toml", ".sql", ".log"]);
  if (!allowedExtensions.has(path.extname(normalizedPath).toLowerCase())) return { success: false, error: "For safety, Orbit can read text and source-code files only." };
  try {
    const stat = await fs.stat(normalizedPath);
    if (!stat.isFile()) return { success: false, error: "Selected path is not a file." };
    if (stat.size > 120000) return { success: false, error: "File is larger than the 120 KB reading limit." };
    const content = await fs.readFile(normalizedPath, "utf8");
    return { success: true, name: path.basename(normalizedPath), path: normalizedPath, content: content.slice(0, 50000) };
  } catch { return { success: false, error: "Could not read the selected text file." }; }
});

ipcMain.handle("orbit:save-ai-draft", async (_event, fileName, content) => {
  if (typeof fileName !== "string" || typeof content !== "string") return { success: false, error: "Invalid draft." };
  const safeName = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  if (!safeName || safeName.length > 120 || !content.trim() || content.length > 100000) return { success: false, error: "Provide a filename and content under 100 KB." };
  const draftsFolder = path.join(userHome, "Documents", "Orbit AI Drafts");
  try {
    await fs.mkdir(draftsFolder, { recursive: true });
    let target = path.join(draftsFolder, safeName);
    try { await fs.access(target); target = path.join(draftsFolder, `${path.parse(safeName).name}-${Date.now()}${path.extname(safeName)}`); } catch {}
    await fs.writeFile(target, content, { encoding: "utf8", flag: "wx" });
    return { success: true, path: target };
  } catch { return { success: false, error: "Could not save the draft in Documents\\Orbit AI Drafts." }; }
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
