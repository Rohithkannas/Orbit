
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  shell,
  dialog,
  clipboard,
} = require("electron");

const path = require("node:path");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);
const fs = require("node:fs/promises");
const os = require("node:os");
const http = require("node:http");

let mainWindow;
let currentShortcut = "CommandOrControl+Shift+Space";
let focusTrackerServer;
let focusTrackerData = { byDay: {} };
let focusTrackerFile = "";

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDomain(value) {
  return typeof value === "string" && value.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(value) &&
    value.includes(".") && !value.startsWith(".") && !value.endsWith(".") &&
    !value.includes("..") && !["localhost", "127.0.0.1"].includes(value.toLowerCase());
}

async function saveFocusTrackerData() {
  if (!focusTrackerFile) return;
  try {
    const temp = `${focusTrackerFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(focusTrackerData), "utf8");
    await fs.rename(temp, focusTrackerFile);
  } catch (error) { console.error("Could not save Orbit focus data:", error.message); }
}

function startFocusTrackerServer() {
  focusTrackerFile = path.join(app.getPath("userData"), "focus-time-v1.json");
  void fs.readFile(focusTrackerFile, "utf8").then((raw) => {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.byDay && typeof parsed.byDay === "object") focusTrackerData = parsed;
  }).catch(() => undefined);

  focusTrackerServer = http.createServer((req, res) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    const allowedOrigin = origin.startsWith("chrome-extension://") || origin === "http://127.0.0.1:5176" || origin === "http://localhost:5176";
    if (allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    if (!allowedOrigin && origin) { res.writeHead(403); res.end("Origin not allowed"); return; }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, app: "Orbit Focus Tracker", version: app.getVersion() }));
      return;
    }
    if (req.method === "POST" && req.url === "/v1/site-time") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; if (body.length > 4096) req.destroy(); });
      req.on("end", () => {
        try {
          const item = JSON.parse(body);
          const date = typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : "";
          const domain = typeof item.domain === "string" ? item.domain.toLowerCase() : "";
          const seconds = Number(item.seconds);
          if (!date || !validDomain(domain) || !Number.isFinite(seconds) || seconds <= 0 || seconds > 180) {
            res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ success: false, error: "Invalid site-time event." })); return;
          }
          focusTrackerData.byDay[date] ??= {};
          focusTrackerData.byDay[date][domain] = Math.min(86400, (focusTrackerData.byDay[date][domain] || 0) + Math.round(seconds));
          void saveFocusTrackerData();
          res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
        } catch { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ success: false, error: "Invalid JSON." })); }
      });
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" }); res.end(JSON.stringify({ success: false, error: "Not found." }));
  });
  focusTrackerServer.on("error", (error) => console.error("Orbit focus tracker server unavailable:", error.message));
  focusTrackerServer.listen(48761, "127.0.0.1");
}


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

ipcMain.handle("orbit:focus-time-stats", async (_event, requestedDate) => {
  const date = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate : localDateKey();
  const today = focusTrackerData.byDay[date] || {};
  const entries = Object.entries(today).map(([domain, seconds]) => ({ domain, seconds: Number(seconds) || 0 }))
    .filter((item) => item.seconds > 0).sort((a, b) => b.seconds - a.seconds).slice(0, 100);
  const week = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(); day.setHours(12, 0, 0, 0); day.setDate(day.getDate() - offset);
    const key = localDateKey(day); const dailyEntries = Object.entries(focusTrackerData.byDay[key] || {}).map(([domain, seconds]) => ({ domain, seconds: Number(seconds) || 0 })).filter((item) => item.seconds > 0).sort((a, b) => b.seconds - a.seconds);
    week.push({ date: key, entries: dailyEntries, totalSeconds: dailyEntries.reduce((sum, item) => sum + item.seconds, 0) });
  }
  return { success: true, date, entries, totalSeconds: entries.reduce((sum, item) => sum + item.seconds, 0), week, trackerPort: 48761 };
});

ipcMain.handle("orbit:focus-time-clear", async (_event, requestedDate) => {
  const date = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate : localDateKey();
  delete focusTrackerData.byDay[date];
  await saveFocusTrackerData();
  return { success: true, date };
});

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

  // Keep the prompt compact: long chat history is a major source of latency on local models.
  const systemMessage = {
    role: "system",
    content: "You are Orbit, a fast, accurate desktop AI assistant. Answer simple factual questions directly in 1-4 sentences. Do not show internal reasoning or lengthy preambles. For complex questions, explain clearly with relevant detail. For code requests, provide complete usable code and concise explanation. Use conversation history only when relevant to the current question. Format with Markdown. If uncertain, say so rather than inventing facts."
  };
  const safeHistory = !testOnly && Array.isArray(history)
    ? history.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
        .slice(-6).map((item) => ({ role: item.role, content: item.content.slice(0, 2500) }))
    : [];
  const messages = [systemMessage, ...safeHistory, { role: "user", content: input }];
  // Qwen3 supports the /no_think directive as a prompt-level fallback on Ollama versions
  // that may not honor the top-level think:false field consistently.
  if (isOllama && /qwen3/i.test(model)) messages[messages.length - 1].content = `/no_think\n${messages[messages.length - 1].content}`;
  const complexRequest = /\b(code|program|implement|debug|explain in detail|step.by.step|compare|analy[sz]e|review|summari[sz]e|write|draft|generate|prove|derive|calculate|file|repository|codebase|document|essay|plan)\b/i.test(input);
  const maxTokens = testOnly ? 48 : complexRequest ? 768 : 192;
  const body = isOllama
    ? {
        model,
        messages,
        stream: false,
        think: false,
        keep_alive: "30m",
        options: { temperature: 0.2, num_predict: maxTokens, num_ctx: 4096 }
      }
    : { model, messages, stream: false, temperature: 0.2, max_tokens: maxTokens };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
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
    if (error?.name === "AbortError") throw new Error("AI request timed out after 90 seconds. A local model may be too slow for this hardware; use a smaller model or a hosted API for faster responses.");
    throw new Error(error?.message || "Could not connect to the AI provider.");
  } finally { clearTimeout(timeout); }
}

const activeAIStreams = new Map();

async function streamAI(config, prompt, history, requestId, sender) {
  // Task-aware routing can use an explicitly configured specialist model. No provider is
  // assumed to exist: the primary configuration remains the safe default.
  let routedConfig = config;
  const routePrompt = String(prompt || "");
  if (config?.routerEnabled) {
    const codeTask = /\b(code|debug|compile|typescript|python|java|function|class|bug|stack trace|exception|repository|codebase|refactor)\b/i.test(routePrompt);
    const deepTask = /\b(compare|architecture|design|research|trade.?off|evaluate|analy[sz]e|plan|reason|thorough|deep dive)\b/i.test(routePrompt);
    const candidate = codeTask ? config?.codeProvider : deepTask ? config?.deepProvider : config?.quickProvider;
    if (candidate && typeof candidate.baseUrl === "string" && typeof candidate.model === "string" && candidate.baseUrl.trim() && candidate.model.trim()) {
      routedConfig = { ...config, ...candidate, responseMode: config.responseMode };
    }
  }
  const { baseUrl, model, apiKey } = validateAIConfig(routedConfig);
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 12000) throw new Error("Enter a prompt under 12,000 characters.");
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const isOllama = /\/api$/.test(baseUrl) || /localhost:11434$/.test(baseUrl) || /127\.0\.0\.1:11434$/.test(baseUrl);
  const endpoint = isOllama ? `${baseUrl.replace(/\/api$/, "")}/api/chat` : `${baseUrl}/chat/completions`;
  const responseMode = ["quick", "balanced", "deep"].includes(config?.responseMode) ? config.responseMode : "balanced";
  const modeInstruction = responseMode === "quick"
    ? "Prefer the shortest useful answer: usually 1-3 sentences or a compact list. Avoid unnecessary background."
    : responseMode === "deep"
      ? "Give a thorough, structured answer with assumptions, steps, trade-offs, and examples when relevant. Avoid padding and do not reveal hidden chain-of-thought."
      : "Be concise for simple questions and provide enough structured detail for complex tasks.";
  const systemMessage = { role: "system", content: `You are Orbit, a fast, accurate desktop AI assistant. ${modeInstruction} Do not show internal reasoning or lengthy preambles. For code requests, provide complete usable code and concise explanation. Use conversation history only when relevant. Format with Markdown. If uncertain, say so rather than inventing facts.` };
  const safeHistory = Array.isArray(history) ? history.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string").slice(-6).map((item) => ({ role: item.role, content: item.content.slice(0, 2500) })) : [];
  const messages = [systemMessage, ...safeHistory, { role: "user", content: prompt }];
  if (isOllama && /qwen3/i.test(model)) messages[messages.length - 1].content = `/no_think\n${messages[messages.length - 1].content}`;
  const complexRequest = /\b(code|program|implement|debug|explain in detail|step.by.step|compare|analy[sz]e|review|summari[sz]e|write|draft|generate|prove|derive|calculate|file|repository|codebase|document|essay|plan)\b/i.test(prompt);
  const maxTokens = responseMode === "quick" ? 192 : responseMode === "deep" ? 1200 : complexRequest ? 768 : 192;
  const controller = new AbortController();
  activeAIStreams.set(requestId, controller);
  const timeout = setTimeout(() => controller.abort(), 90000);
  let fullText = "";
  try {
    const body = isOllama
      ? { model, messages, stream: true, think: false, keep_alive: "30m", options: { temperature: 0.2, num_predict: maxTokens, num_ctx: 4096 } }
      : { model, messages, stream: true, temperature: 0.2, max_tokens: maxTokens };
    const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail.slice(0, 400) || `Provider returned HTTP ${response.status}.`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    while (!done) {
      const part = await reader.read();
      done = part.done;
      buffer += decoder.decode(part.value || new Uint8Array(), { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let piece = "";
        try {
          if (isOllama) {
            const obj = JSON.parse(trimmed);
            piece = obj?.message?.content || "";
            if (obj?.error) throw new Error(obj.error);
          } else if (trimmed.startsWith("data:")) {
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            const obj = JSON.parse(payload);
            piece = obj?.choices?.[0]?.delta?.content || "";
          }
        } catch (error) { if (error instanceof Error && error.message !== "Unexpected end of JSON input") throw error; }
        if (piece) {
          fullText += piece;
          if (!sender.isDestroyed()) sender.send("orbit:ai-chunk", { requestId, chunk: piece, fullText });
        }
      }
    }
    if (!fullText.trim()) throw new Error("The model returned an empty response.");
    if (!sender.isDestroyed()) sender.send("orbit:ai-finished", { requestId, answer: fullText.trim(), model });
  } catch (error) {
    const cancelled = controller.signal.aborted && activeAIStreams.get(requestId) === controller;
    const fallback = config?.fallbackProvider;
    if (!cancelled && !fullText.trim() && fallback && typeof fallback.baseUrl === "string" && fallback.baseUrl.trim() && typeof fallback.model === "string" && fallback.model.trim() && !config?._fallbackAttempted) {
      if (!sender.isDestroyed()) sender.send("orbit:ai-chunk", { requestId, chunk: "", fullText: "" });
      void streamAI({ ...config, ...fallback, routerEnabled: false, fallbackProvider: undefined, _fallbackAttempted: true }, prompt, history, requestId, sender).catch((fallbackError) => { if (!sender.isDestroyed()) sender.send("orbit:ai-failed", { requestId, error: fallbackError?.message || "Fallback provider could not be started." }); });
    } else if (!sender.isDestroyed()) sender.send("orbit:ai-failed", { requestId, error: cancelled ? "Response cancelled." : (error?.message || "AI request failed.") });
  } finally {
    clearTimeout(timeout);
    if (activeAIStreams.get(requestId) === controller) activeAIStreams.delete(requestId);
  }
}

ipcMain.on("orbit:ai-stream-start", (event, config, prompt, history, requestId) => {
  if (typeof requestId !== "string" || requestId.length > 100) return;
  void streamAI(config, prompt, history, requestId, event.sender).catch((error) => { if (!event.sender.isDestroyed()) event.sender.send("orbit:ai-failed", { requestId, error: error?.message || "AI request could not be started." }); });
});
ipcMain.on("orbit:ai-stream-stop", (_event, requestId) => {
  const controller = activeAIStreams.get(requestId);
  if (controller) controller.abort();
});

ipcMain.handle("orbit:ask-ai", async (_event, config, prompt, history) => {
  try { return await requestAI(config, prompt, history, false); }
  catch (error) { return { success: false, error: error.message || "AI request failed." }; }
});
ipcMain.handle("orbit:test-ai", async (_event, config) => {
  try { const result = await requestAI(config, "test", [], true); return { success: true, answer: result.answer }; }
  catch (error) { return { success: false, error: error.message || "AI connection test failed." }; }
});

// Project intelligence is explicitly scoped to a folder the user selects. The
// indexer only reads bounded, text-based source files and skips secrets/build output.
let selectedProjectRoot = "";
const projectTextExtensions = new Set([".md", ".txt", ".json", ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".h", ".css", ".html", ".xml", ".yaml", ".yml", ".toml", ".sql", ".go", ".rs", ".sh", ".ps1"]);
const projectSkipDirs = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".venv", "venv", "vendor", "target", "__pycache__", ".idea", ".vscode"]);
const projectSensitiveNames = /(^|\.)(env|secrets?|credentials?|id_rsa|id_ed25519)(\.|$)|\.(pem|key|p12|pfx)$/i;
function insideRoot(root, target) { const rel = path.relative(path.resolve(root), path.resolve(target)); return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel)); }
ipcMain.handle("orbit:restore-project-folder", async (_event, rootPath) => {
  if (typeof rootPath !== "string" || !rootPath.trim()) return { success: false, error: "No saved project folder." };
  const root = path.resolve(rootPath);
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) return { success: false, error: "The saved project path is not a folder. Select it again." };
    selectedProjectRoot = root;
    return { success: true, path: root };
  } catch {
    selectedProjectRoot = "";
    return { success: false, error: "The saved project folder is unavailable. Select it again." };
  }
});
ipcMain.handle("orbit:choose-project-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, { title: "Choose a project folder for Orbit Intelligence", properties: ["openDirectory"] });
  if (result.canceled || !result.filePaths?.[0]) return { success: false, canceled: true };
  selectedProjectRoot = path.resolve(result.filePaths[0]);
  return { success: true, path: selectedProjectRoot };
});
ipcMain.handle("orbit:search-project", async (_event, rootPath, query) => {
  if (typeof rootPath !== "string" || typeof query !== "string" || query.trim().length < 2 || query.length > 500) return { success: false, error: "Choose a project folder and enter a meaningful search query.", results: [] };
  const root = path.resolve(rootPath);
  if (!selectedProjectRoot || root !== selectedProjectRoot) return { success: false, error: "Select this project folder in Orbit before searching it.", results: [] };
  try { if (!(await fs.stat(root)).isDirectory()) return { success: false, error: "Project path is not a directory.", results: [] }; }
  catch { return { success: false, error: "Project folder is unavailable. Select it again.", results: [] }; }
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9_+#.-]+/).filter((x) => x.length > 2).slice(0, 12))];
  if (!terms.length) return { success: true, results: [] };
  const queue = [{ folder: root, depth: 0 }]; const results = []; let scanned = 0;
  while (queue.length && scanned < 1800 && results.length < 8) {
    const current = queue.shift(); scanned++;
    let entries; try { entries = await fs.readdir(current.folder, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries.slice(0, 1200)) {
      const full = path.join(current.folder, entry.name); const lower = entry.name.toLowerCase();
      if (entry.isDirectory()) { if (current.depth < 7 && !projectSkipDirs.has(lower) && !lower.startsWith(".")) queue.push({ folder: full, depth: current.depth + 1 }); continue; }
      if (!projectTextExtensions.has(path.extname(lower)) || projectSensitiveNames.test(lower)) continue;
      try {
        const stat = await fs.stat(full); if (stat.size > 180000 || !stat.isFile()) continue;
        const content = await fs.readFile(full, "utf8");
        if (content.includes("\0")) continue;
        const lines = content.split(/\r?\n/); let score = 0; const excerpts = [];
        lines.forEach((line, i) => { const lc = line.toLowerCase(); const hits = terms.filter((term) => lc.includes(term)).length; if (hits) { score += hits; if (excerpts.length < 5) excerpts.push(`${i + 1}: ${line.slice(0, 240)}`); } });
        const nameHits = terms.filter((term) => lower.includes(term)).length; score += nameHits * 3;
        if (score > 0) results.push({ path: full, relativePath: path.relative(root, full), score, excerpt: excerpts.join("\n") || "Filename match; no matching content line found." });
      } catch { /* Skip unreadable/binary files. */ }
    }
  }
  results.sort((a, b) => b.score - a.score); return { success: true, root, scannedFiles: scanned, results: results.slice(0, 8) };
});
const approvedActions = {
  "git-status": { executable: "git", args: ["status", "--short", "--branch"], label: "git status --short --branch" },
  "git-diff-stat": { executable: "git", args: ["diff", "--stat"], label: "git diff --stat" },
  "git-log": { executable: "git", args: ["log", "-5", "--oneline"], label: "git log -5 --oneline" },
  "npm-build": { executable: process.platform === "win32" ? "npm.cmd" : "npm", args: ["run", "build"], label: "npm run build" },
  "npm-test": { executable: process.platform === "win32" ? "npm.cmd" : "npm", args: ["test", "--", "--runInBand"], label: "npm test -- --runInBand" },
};
ipcMain.handle("orbit:run-approved-action", async (_event, rootPath, actionId) => {
  if (typeof rootPath !== "string" || !Object.prototype.hasOwnProperty.call(approvedActions, actionId)) return { success: false, error: "Action is not allowlisted." };
  const cwd = path.resolve(rootPath); if (!selectedProjectRoot || cwd !== selectedProjectRoot) return { success: false, error: "Select this project folder in Orbit before running actions." };
  try { if (!(await fs.stat(cwd)).isDirectory()) return { success: false, error: "Project folder is unavailable." }; }
  catch { return { success: false, error: "Project folder is unavailable." }; }
  const action = approvedActions[actionId];
  try {
    const { stdout, stderr } = await execFileAsync(action.executable, action.args, { cwd, timeout: 45000, windowsHide: true, maxBuffer: 500000, shell: process.platform === "win32" && action.executable === "npm.cmd" });
    return { success: true, label: action.label, output: `${stdout || ""}${stderr ? `\\n${stderr}` : ""}`.trim().slice(0, 12000) || "Command completed with no output." };
  } catch (error) {
    const output = `${error?.stdout || ""}${error?.stderr ? `\\n${error.stderr}` : ""}`.trim();
    return { success: false, label: action.label, error: (output || error?.message || "Command failed.").slice(0, 12000) };
  }
});
ipcMain.handle("orbit:copy-text", async (_event, text) => {
  if (typeof text !== "string" || text.length > 100000) return { success: false, error: "Clipboard text must be under 100 KB." };
  try { clipboard.writeText(text); return { success: true }; }
  catch { return { success: false, error: "Could not copy text to the clipboard." }; }
});

ipcMain.handle("orbit:read-clipboard", async () => {
  try { const text = clipboard.readText(); return { success: true, text: text.slice(0, 12000), truncated: text.length > 12000 }; }
  catch { return { success: false, error: "Could not read clipboard text." }; }
});

app.whenReady().then(() => {
  startFocusTrackerServer();
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
