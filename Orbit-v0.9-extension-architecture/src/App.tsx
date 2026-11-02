import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { commands, rankCommands, commandRegistry, type Command } from "./commandRegistry";
import { calculate } from "./calculator";
import { createCommandEngine, type CommandResult } from "./commandEngine";

type OperationResult = { success: boolean; error?: string };
type FileSearchResult = { name: string; path: string; isDirectory: boolean };
type RecentCommand = { id: string; usedAt: number };
type OrbitPreferences = { theme: "dark" | "light" | "system"; shortcut: string; launchAtStartup: boolean };
const PREFERENCES_KEY = "orbit.preferences.v1";
const DEFAULT_PREFERENCES: OrbitPreferences = { theme: "dark", shortcut: "CommandOrControl+Shift+Space", launchAtStartup: false };
function loadPreferences(): OrbitPreferences {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFERENCES;
    const value = parsed as Partial<OrbitPreferences>;
    return {
      theme: value.theme === "light" || value.theme === "system" ? value.theme : "dark",
      shortcut: typeof value.shortcut === "string" ? value.shortcut : DEFAULT_PREFERENCES.shortcut,
      launchAtStartup: value.launchAtStartup === true,
    };
  } catch { return DEFAULT_PREFERENCES; }
}

declare global {
  interface Window {
    orbit?: {
      platform: string;
      version: string;
      launchApp: (appId: string) => Promise<OperationResult>;
      openExternal: (url: string) => Promise<OperationResult>;
      searchFiles: (query: string) => Promise<FileSearchResult[]>;
      openFile: (filePath: string) => Promise<OperationResult>;
      setGlobalShortcut: (accelerator: string) => Promise<OperationResult>;
      setLaunchAtStartup: (enabled: boolean) => Promise<OperationResult>;
      getLaunchAtStartup: () => Promise<boolean>;
    };
  }
}

const RECENTS_KEY = "orbit.recentCommands.v1";
const MAX_RECENTS = 8;

const commandEngine = createCommandEngine(
  commands.map((command) => ({
    id: command.id,
    validateInput: (input: unknown): input is undefined => input === undefined,
    execute: (_input: undefined, context: { dispatch: (commandId: string) => Promise<CommandResult> | CommandResult }) =>
      context.dispatch(command.id),
  })),
);

function loadRecents(): RecentCommand[] {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentCommand =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as RecentCommand).id === "string" &&
        typeof (item as RecentCommand).usedAt === "number" &&
        commands.some((command) => command.id === (item as RecentCommand).id),
      )
      .sort((a, b) => b.usedAt - a.usedAt)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function App() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [fileResults, setFileResults] = useState<FileSearchResult[]>([]);
  const [fileSearchActive, setFileSearchActive] = useState(false);
  const [calculatorActive, setCalculatorActive] = useState(false);
  const [fileSearchLoading, setFileSearchLoading] = useState(false);
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>(loadRecents);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<OrbitPreferences>(loadPreferences);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const shellTheme = preferences.theme === "light" ? "theme-light" : "";
  const calculation = calculatorActive && query.trim() ? calculate(query) : null;

  const savePreferences = useCallback((next: OrbitPreferences) => {
    setPreferences(next);
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); } catch { /* Session remains usable if storage is unavailable. */ }
  }, []);

  useEffect(() => {
    if (window.orbit?.setGlobalShortcut) {
      void window.orbit.setGlobalShortcut(preferences.shortcut).catch(() => undefined);
    }
    if (window.orbit?.getLaunchAtStartup) {
      void window.orbit.getLaunchAtStartup().then((enabled) => {
        setPreferences((current) => ({ ...current, launchAtStartup: enabled }));
      }).catch(() => undefined);
    }
    // Apply the saved desktop preferences once when the Electron bridge is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeShortcut = useCallback(async (shortcut: string) => {
    setSettingsBusy(true);
    setSettingsMessage("");
    try {
      const result = await window.orbit?.setGlobalShortcut(shortcut);
      if (!result?.success) {
        setSettingsMessage(result?.error ?? "Global shortcut settings are unavailable in the browser preview.");
        return;
      }
      savePreferences({ ...preferences, shortcut });
      setSettingsMessage(`Global shortcut updated to ${shortcut.replace("CommandOrControl", "Ctrl")}.`);
    } catch {
      setSettingsMessage("Could not update the global shortcut.");
    } finally { setSettingsBusy(false); }
  }, [preferences, savePreferences]);

  const resetPreferences = useCallback(async () => {
    setSettingsBusy(true);
    setSettingsMessage("");
    try {
      const shortcutResult = await window.orbit?.setGlobalShortcut(DEFAULT_PREFERENCES.shortcut);
      const startupResult = await window.orbit?.setLaunchAtStartup(false);
      if (!shortcutResult?.success || !startupResult?.success) {
        setSettingsMessage(shortcutResult?.error ?? startupResult?.error ?? "Could not reset desktop preferences.");
        return;
      }
      savePreferences(DEFAULT_PREFERENCES);
      setSettingsMessage("Preferences reset to defaults.");
    } catch {
      setSettingsMessage("Could not reset preferences.");
    } finally { setSettingsBusy(false); }
  }, [savePreferences]);

  const changeStartup = useCallback(async (enabled: boolean) => {
    setSettingsBusy(true);
    setSettingsMessage("");
    try {
      const result = await window.orbit?.setLaunchAtStartup(enabled);
      if (!result?.success) {
        setSettingsMessage(result?.error ?? "Startup settings are unavailable in the browser preview.");
        return;
      }
      savePreferences({ ...preferences, launchAtStartup: enabled });
      setSettingsMessage(enabled ? "Orbit will launch when you sign in." : "Orbit will no longer launch at sign-in.");
    } catch {
      setSettingsMessage("Could not update the startup setting.");
    } finally { setSettingsBusy(false); }
  }, [preferences, savePreferences]);

  const recentCommandList = useMemo(
    () => recentCommands.map((recent) => commands.find((command) => command.id === recent.id)).filter((command): command is Command => Boolean(command)),
    [recentCommands],
  );

  const filteredCommands = useMemo(() => {
    return rankCommands(query);
  }, [query]);

  const recordCommand = useCallback((commandId: string) => {
    setRecentCommands((current) => {
      const next = [
        { id: commandId, usedAt: Date.now() },
        ...current.filter((item) => item.id !== commandId),
      ].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        // Keep the current session usable if storage is unavailable.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
    setMessage("");
  }, [query]);

  const searchFiles = useCallback(async (term: string) => {
    if (!window.orbit?.searchFiles) {
      setMessage("File search is unavailable. Check the Electron preload.");
      return;
    }
    if (term.trim().length < 2) {
      setFileResults([]);
      setMessage("Enter at least 2 characters to search files.");
      return;
    }
    setFileSearchLoading(true);
    setMessage("");
    try {
      const results = await window.orbit.searchFiles(term.trim());
      setFileResults(results);
      setSelectedIndex(0);
      setFileSearchActive(true);
      if (results.length === 0) setMessage("No matching files found in the supported folders.");
    } catch {
      setMessage("File search failed. Please try again.");
    } finally {
      setFileSearchLoading(false);
    }
  }, []);

  // Search automatically while typing in Files mode. This makes the mode feel
  // like a launcher search and avoids an invisible Enter-only interaction.
  useEffect(() => {
    if (!fileSearchActive) return;
    const term = query.trim();
    if (term.length < 2) {
      setFileResults([]);
      setFileSearchLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchFiles(term);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [fileSearchActive, query, searchFiles]);

  const openFile = useCallback(async (file: FileSearchResult) => {
    if (!window.orbit?.openFile) {
      setMessage("Opening files is unavailable. Check the Electron preload.");
      return;
    }
    try {
      const result = await window.orbit.openFile(file.path);
      setMessage(result.success ? `Opening ${file.name}...` : result.error ?? "Could not open this item.");
    } catch {
      setMessage("Could not open the selected item.");
    }
  }, []);

  const enterFileSearch = useCallback(() => {
    setFileSearchActive(true);
    setFileResults([]);
    setSelectedIndex(0);
    setQuery("");
    setMessage("Type at least 2 characters of a filename, then press Enter.");
  }, []);

  const runCommand = useCallback(async (command: Command) => {
    if (isBusy) return;
    recordCommand(command.id);

    const dispatch = async (commandId: string): Promise<CommandResult> => {
      if (commandId === "calculator") {
        setFileSearchActive(false);
        setCalculatorActive(true);
        setFileResults([]);
        setQuery("");
        return { success: true, message: "Type an arithmetic expression to calculate." };
      }
      if (commandId === "files") {
        setCalculatorActive(false);
        enterFileSearch();
        return { success: true, message: "Type at least 2 characters of a filename, then press Enter." };
      }
      if (commandId === "settings") {
        setFileSearchActive(false);
        setCalculatorActive(false);
        setSettingsOpen(true);
        setSettingsMessage("");
        return { success: true, message: "Settings opened." };
      }
      if (commandId === "browser" || commandId === "github") {
        setCalculatorActive(false);
        if (!window.orbit?.openExternal) return { success: false, error: "Website integration is unavailable." };
        const url = commandId === "browser" ? "https://www.google.com" : "https://github.com";
        const result = await window.orbit.openExternal(url);
        if (!result.success) return { success: false, error: result.error ?? "Could not open the website." };
        return { success: true, message: `Opening ${commandId === "browser" ? "Google" : "GitHub"}...` };
      }
      if (commandId === "notepad" || commandId === "windows-calculator") {
        setCalculatorActive(false);
        if (!window.orbit?.launchApp) return { success: false, error: "Native app launching is unavailable." };
        const appId = commandId === "notepad" ? "notepad" : "calculator";
        const result = await window.orbit.launchApp(appId);
        if (!result.success) return { success: false, error: result.error ?? "Could not launch the application." };
        return { success: true, message: `${command.name} started.` };
      }
      return { success: false, error: `No handler is registered for ${commandId}.` };
    };

    setIsBusy(true);
    try {
      const result = await commandEngine.execute(command.id, undefined, { dispatch });
      setMessage("error" in result ? result.error : result.message ?? "Command completed.");
    } finally {
      setIsBusy(false);
    }
  }, [enterFileSearch, isBusy, recordCommand]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (settingsOpen) { setSettingsOpen(false); setSettingsMessage(""); return; }
        if (calculatorActive) setCalculatorActive(false);
        if (fileSearchActive) {
          setFileSearchActive(false);
          setFileResults([]);
        }
        setQuery("");
        setMessage("");
        return;
      }

      if (calculatorActive) {
        if (event.key === "Enter") {
          event.preventDefault();
          setMessage(calculation !== null ? `Result: ${calculation}` : "Enter a valid arithmetic expression.");
          return;
        }
        return;
      }

      if (fileSearchActive) {
        if (event.key === "Enter") {
          event.preventDefault();
          // First Enter searches the current query. Once results exist, Enter opens the selected result.
          if (fileResults.length > 0 && fileResults[selectedIndex]) {
            void openFile(fileResults[selectedIndex]);
          } else {
            void searchFiles(query);
          }
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const count = fileResults.length;
          setSelectedIndex((current) => {
            if (!count) return 0;
            return event.key === "ArrowDown" ? (current + 1) % count : (current - 1 + count) % count;
          });
          return;
        }
      }

      if (!fileSearchActive && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const list = query.trim() ? filteredCommands : (recentCommandList.length ? recentCommandList : filteredCommands);
        const count = list.length;
        setSelectedIndex((current) => {
          if (!count) return 0;
          return event.key === "ArrowDown" ? (current + 1) % count : (current - 1 + count) % count;
        });
      }

      if (!fileSearchActive && event.key === "Enter") {
        event.preventDefault();
        const list = query.trim() ? filteredCommands : (recentCommandList.length ? recentCommandList : filteredCommands);
        const command = list[selectedIndex];
        if (command) void runCommand(command);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fileSearchActive, calculatorActive, settingsOpen, calculation, fileResults, filteredCommands, recentCommandList, selectedIndex, query, openFile, searchFiles, runCommand]);

  const visibleCommands = query.trim() ? filteredCommands : (recentCommandList.length ? recentCommandList : commands);
  const listTitle = query.trim() ? "FUZZY SEARCH" : (recentCommandList.length ? "RECENT COMMANDS" : "QUICK ACCESS");

  return (
    <main className={`orbit-shell ${shellTheme}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <span>orbit</span>
          <span className="version">v{window.orbit?.version ?? "0.9.0"}</span>
        </div>
        <div className="platform">
          <span className="status-dot" />
          {window.orbit?.platform === "win32" ? "Windows" : "Desktop"}
        </div>
      </header>

      <section className="palette">
        {settingsOpen ? (
          <div className="settings-view">
            <div className="settings-heading">
              <button className="settings-back" onClick={() => { setSettingsOpen(false); setSettingsMessage(""); }}>← Back</button>
              <div><h1>Settings</h1><p>Personalize how Orbit looks and behaves.</p></div>
              <span className="settings-version">v{window.orbit?.version ?? "0.9.0"}</span>
            </div>
            <div className="settings-group">
              <div className="settings-group-title">APPEARANCE</div>
              <label className="setting-row"><span><strong>Theme</strong><small>Choose the appearance of the launcher.</small></span>
                <select value={preferences.theme} onChange={(event) => savePreferences({ ...preferences, theme: event.target.value as OrbitPreferences["theme"] })}>
                  <option value="dark">Dark</option><option value="light">Light</option><option value="system">System (dark fallback)</option>
                </select>
              </label>
            </div>
            <div className="settings-group">
              <div className="settings-group-title">LAUNCHER</div>
              <label className="setting-row"><span><strong>Global keyboard shortcut</strong><small>Show or hide Orbit from anywhere.</small></span>
                <select disabled={settingsBusy} value={preferences.shortcut} onChange={(event) => void changeShortcut(event.target.value)}>
                  <option value="CommandOrControl+Shift+Space">Ctrl + Shift + Space</option>
                  <option value="CommandOrControl+Alt+Space">Ctrl + Alt + Space</option>
                  <option value="CommandOrControl+Shift+O">Ctrl + Shift + O</option>
                </select>
              </label>
              <label className="setting-row"><span><strong>Launch at sign-in</strong><small>Start Orbit automatically when you sign in to Windows.</small></span>
                <input className="setting-checkbox" type="checkbox" disabled={settingsBusy} checked={preferences.launchAtStartup} onChange={(event) => void changeStartup(event.target.checked)} />
              </label>
            </div>
            <div className="settings-group">
              <div className="settings-group-title">EXTENSIONS & COMMAND PACKS</div>
              <p className="extension-intro">Orbit loads commands from validated packs. Built-in packs are registered together at startup; each command declares its own ID, aliases, category, and description.</p>
              <div className="extension-list">
                {commandRegistry.getPacks().map((pack) => {
                  const packCommands = commands.filter((command) => command.packId === pack.id);
                  return <div className="extension-card" key={pack.id}>
                    <div className="extension-card-heading"><strong>{pack.name}</strong><span>v{pack.version}</span></div>
                    <p>{pack.description}</p>
                    <small>{packCommands.length} commands · {packCommands.map((command) => command.name).join(", ")}</small>
                    <span className="extension-enabled">Loaded</span>
                  </div>;
                })}
              </div>
            </div>
            {settingsMessage && <div className="settings-notice" role="status">{settingsMessage}</div>}
            <div className="settings-footer"><span>Preferences are saved on this device.</span><button disabled={settingsBusy} onClick={() => void resetPreferences()}>Reset preferences</button></div>
          </div>
        ) : (
          <>
        <div className="search-area">
          <span className="search-icon">⌕</span>
          <input
            autoFocus
            aria-label="Search commands or files"
            placeholder={fileSearchActive ? "Search files by name..." : calculatorActive ? "Enter an expression, e.g. (12 + 8) * 3" : "Search commands: Google, GitHub, Calculator, Notepad..."}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setMessage("");
              if (fileSearchActive) {
                setFileResults([]);
                setSelectedIndex(0);
              }
            }}
          />
          {fileSearchActive && <button className="mode-chip" onClick={() => { setFileSearchActive(false); setFileResults([]); setQuery(""); }}>FILES ×</button>}
          {calculatorActive && <button className="mode-chip" onClick={() => { setCalculatorActive(false); setQuery(""); setMessage(""); }}>CALC ×</button>}
          <kbd>ESC</kbd>
        </div>

{calculatorActive ? (
          <>
            <div className="section-heading"><span>CALCULATOR</span><span>LIVE RESULT</span></div>
            <div className="calculator-result" aria-live="polite">
              {query.trim() ? (calculation !== null ? <><small>RESULT</small><strong>{calculation}</strong></> : <><small>INVALID EXPRESSION</small><span>Use numbers, parentheses, +, −, ×, ÷, and %.</span></>) : <><small>READY</small><strong>Enter an expression above</strong></>}
            </div>
          </>
        ) : fileSearchActive ? (
          <>
            <div className="section-heading"><span>FILE SEARCH</span><span>{fileSearchLoading ? "SEARCHING..." : `${fileResults.length} RESULTS`}</span></div>
            <div className="command-list" role="listbox" aria-label="File results">
              {fileResults.map((file, index) => (
                <button key={file.path} className={`command-row ${index === selectedIndex ? "selected" : ""}`} role="option" aria-selected={index === selectedIndex} onMouseEnter={() => setSelectedIndex(index)} onClick={() => void openFile(file)}>
                  <span className="command-icon">{file.isDirectory ? "📁" : "📄"}</span>
                  <span className="command-copy"><span className="command-name">{file.name}</span><span className="command-description">{file.path}</span></span>
                  <span className="command-arrow">↵</span>
                </button>
              ))}
              {!fileSearchLoading && fileResults.length === 0 && <div className="empty-state"><span className="empty-icon">⌕</span><strong>{query.trim().length < 2 ? "Search your files" : "No matching files found"}</strong><span>{query.trim().length < 2 ? "Type at least 2 characters to search your user folders." : "Try a different filename or folder name."}</span></div>}
            </div>
          </>
        ) : (
          <>
            <div className="section-heading"><span>{listTitle}</span><span>{visibleCommands.length} COMMANDS</span></div>
            <div className="command-list" role="listbox" aria-label="Commands">
              {visibleCommands.length > 0 ? visibleCommands.map((command, index) => (
                <button key={command.id} className={`command-row ${index === selectedIndex ? "selected" : ""}`} role="option" aria-selected={index === selectedIndex} disabled={isBusy} onMouseEnter={() => setSelectedIndex(index)} onClick={() => void runCommand(command)}>
                  <span className="command-icon">{command.icon}</span>
                  <span className="command-copy"><span className="command-name">{command.name}</span><span className="command-description">{command.description}</span></span>
                  <span className="command-category">{command.category}</span>
                  <span className="command-arrow">↵</span>
                </button>
              )) : <div className="empty-state"><span className="empty-icon">⌕</span><strong>No commands found</strong><span>Try “google”, “github”, “calc”, “notepad”, “files”, or “settings”.</span></div>}
            </div>
          </>
        )}

        {message && <div className="feedback" role="status"><span className="status-dot" /><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}

        <footer className="palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> {fileSearchActive ? "Search / Open" : "Select"}</span>
          <span className="footer-brand">Command packs · Fuzzy search · Local files · Preferences ✦</span>
        </footer>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
