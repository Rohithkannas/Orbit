import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { calculate } from "./calculator";

type Command = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  aliases: string[];
};

type OperationResult = { success: boolean; error?: string };
type FileSearchResult = { name: string; path: string; isDirectory: boolean };
type RecentCommand = { id: string; usedAt: number };

declare global {
  interface Window {
    orbit?: {
      platform: string;
      version: string;
      launchApp: (appId: string) => Promise<OperationResult>;
      openExternal: (url: string) => Promise<OperationResult>;
      searchFiles: (query: string) => Promise<FileSearchResult[]>;
      openFile: (filePath: string) => Promise<OperationResult>;
    };
  }
}

const RECENTS_KEY = "orbit.recentCommands.v1";
const MAX_RECENTS = 8;

const commands: Command[] = [
  { id: "browser", name: "Open Google", description: "Open Google in your browser", category: "Web", icon: "🌐", aliases: ["google", "web", "search", "browser", "www"] },
  { id: "github", name: "Open GitHub", description: "Open GitHub repositories", category: "Development", icon: "⌘", aliases: ["gh", "git hub", "repos", "repository", "repositories"] },
  { id: "calculator", name: "Calculator", description: "Calculate an arithmetic expression", category: "Utilities", icon: "∑", aliases: ["calc", "math", "compute", "equation"] },
  { id: "notepad", name: "Open Notepad", description: "Launch Windows Notepad", category: "Productivity", icon: "📝", aliases: ["np", "note", "notes", "text editor", "editor"] },
  { id: "windows-calculator", name: "Windows Calculator", description: "Launch the native Windows Calculator", category: "Utilities", icon: "⊞", aliases: ["win calc", "native calc", "system calculator"] },
  { id: "files", name: "Search Files", description: "Find files in Desktop, Documents, and Downloads", category: "System", icon: "📁", aliases: ["file", "find file", "documents", "downloads", "folder"] },
  { id: "settings", name: "Orbit Settings", description: "Manage launcher preferences", category: "Orbit", icon: "⚙", aliases: ["settings", "preferences", "config", "options"] },
];

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return previous[b.length];
}

function scoreText(candidate: string, query: string): number {
  const text = candidate.toLowerCase();
  const search = query.toLowerCase().trim();
  if (!search) return 0;
  if (text === search) return 1000;
  if (text.startsWith(search)) return 800 - (text.length - search.length);
  const wordStart = text.split(/[\s._-]+/).some((word) => word.startsWith(search));
  if (wordStart) return 650 - text.length * 0.1;
  const substring = text.indexOf(search);
  if (substring >= 0) return 500 - substring - text.length * 0.1;

  // Subsequence scoring lets short forms such as "gh" find "GitHub".
  let cursor = 0;
  let gaps = 0;
  for (const char of search) {
    const found = text.indexOf(char, cursor);
    if (found < 0) {
      cursor = -1;
      break;
    }
    gaps += found - cursor;
    cursor = found + 1;
  }
  if (cursor >= 0) return 300 - gaps - text.length * 0.1;

  // Typo tolerance is deliberately limited to short command labels.
  if (search.length >= 3 && text.length <= 32) {
    const distance = Math.min(...text.split(/[\s._-]+/).map((word) => editDistance(word, search)));
    if (distance <= Math.max(1, Math.floor(search.length * 0.25))) {
      return 200 - distance * 20 - Math.abs(text.length - search.length);
    }
  }
  return -1;
}

function commandScore(command: Command, query: string): number {
  return Math.max(
    scoreText(command.name, query),
    scoreText(command.id, query),
    scoreText(command.description, query) - 80,
    scoreText(command.category, query) - 40,
    ...command.aliases.map((alias) => scoreText(alias, query) + 30),
  );
}

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
  const [fileSearchLoading, setFileSearchLoading] = useState(false);
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>(loadRecents);

  const calculation = useMemo(() => calculate(query), [query]);
  const isCalculation = calculation !== null;

  const recentCommandList = useMemo(
    () => recentCommands.map((recent) => commands.find((command) => command.id === recent.id)).filter((command): command is Command => Boolean(command)),
    [recentCommands],
  );

  const filteredCommands = useMemo(() => {
    const search = query.trim();
    if (!search || isCalculation) return commands;
    return commands
      .map((command) => ({ command, score: commandScore(command, search) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.command.name.localeCompare(b.command.name))
      .map((item) => item.command);
  }, [query, isCalculation]);

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

  const copyCalculation = useCallback(async () => {
    if (calculation === null) return;
    try {
      await navigator.clipboard.writeText(String(calculation));
      setMessage(`Copied result: ${calculation}`);
    } catch {
      setMessage(`Result: ${calculation}`);
    }
  }, [calculation]);

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

    if (command.id === "calculator") {
      setFileSearchActive(false);
      setQuery("");
      setMessage("Type an arithmetic expression to calculate.");
      return;
    }
    if (command.id === "files") {
      enterFileSearch();
      return;
    }
    if (command.id === "settings") {
      setMessage("Orbit Settings are coming in a future update.");
      return;
    }

    setIsBusy(true);
    try {
      if (command.id === "browser" || command.id === "github") {
        const url = command.id === "browser" ? "https://www.google.com" : "https://github.com";
        if (!window.orbit?.openExternal) {
          setMessage("Website integration is unavailable.");
          return;
        }
        const result = await window.orbit.openExternal(url);
        setMessage(result.success ? `Opening ${command.id === "browser" ? "Google" : "GitHub"}...` : result.error ?? "Could not open the website.");
        return;
      }
      if (command.id === "notepad" || command.id === "windows-calculator") {
        if (!window.orbit?.launchApp) {
          setMessage("Native app launching is unavailable.");
          return;
        }
        const appId = command.id === "notepad" ? "notepad" : "calculator";
        const result = await window.orbit.launchApp(appId);
        setMessage(result.success ? `${command.name} started.` : result.error ?? "Could not launch the application.");
      }
    } catch {
      setMessage("The operation failed. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }, [enterFileSearch, isBusy, recordCommand]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (fileSearchActive) {
          setFileSearchActive(false);
          setFileResults([]);
        }
        setQuery("");
        setMessage("");
        return;
      }

      if (fileSearchActive && !isCalculation) {
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

      if (isCalculation && event.key === "Enter") {
        event.preventDefault();
        void copyCalculation();
        return;
      }

      if (!isCalculation && !fileSearchActive && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const list = query.trim() ? filteredCommands : (recentCommandList.length ? recentCommandList : filteredCommands);
        const count = list.length;
        setSelectedIndex((current) => {
          if (!count) return 0;
          return event.key === "ArrowDown" ? (current + 1) % count : (current - 1 + count) % count;
        });
      }

      if (!isCalculation && !fileSearchActive && event.key === "Enter") {
        event.preventDefault();
        const list = query.trim() ? filteredCommands : (recentCommandList.length ? recentCommandList : filteredCommands);
        const command = list[selectedIndex];
        if (command) void runCommand(command);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCalculation, fileSearchActive, fileResults, filteredCommands, recentCommandList, selectedIndex, query, copyCalculation, openFile, searchFiles, runCommand]);

  const visibleCommands = query.trim() ? filteredCommands : (recentCommandList.length ? recentCommandList : commands);
  const listTitle = query.trim() ? "FUZZY SEARCH" : (recentCommandList.length ? "RECENT COMMANDS" : "QUICK ACCESS");

  return (
    <main className="orbit-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <span>orbit</span>
          <span className="version">v{window.orbit?.version ?? "0.2.0"}</span>
        </div>
        <div className="platform">
          <span className="status-dot" />
          {window.orbit?.platform === "win32" ? "Windows" : "Desktop"}
        </div>
      </header>

      <section className="palette">
        <div className="search-area">
          <span className="search-icon">⌕</span>
          <input
            autoFocus
            aria-label="Search commands, files, or calculate"
            placeholder={fileSearchActive ? "Enter a filename and press Enter..." : "Search commands or type a calculation..."}
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
          <kbd>ESC</kbd>
        </div>

        {isCalculation ? (
          <>
            <div className="section-heading"><span>CALCULATION</span><span>PRESS ENTER TO COPY</span></div>
            <button className="calculation-result" onClick={() => void copyCalculation()} title="Copy calculation result">
              <span className="calculation-expression">{query}</span>
              <strong>{calculation}</strong>
              <span className="calculation-hint">↵ Copy result</span>
            </button>
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
              {!fileSearchLoading && fileResults.length === 0 && <div className="empty-state"><span className="empty-icon">⌕</span><strong>No file results yet</strong><span>Type a filename and press Enter to search.</span></div>}
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
              )) : <div className="empty-state"><span className="empty-icon">⌕</span><strong>No commands found</strong><span>Try an alias like calc, gh, or np—or check the spelling.</span></div>}
            </div>
          </>
        )}

        {message && <div className="feedback" role="status"><span className="status-dot" /><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}

        <footer className="palette-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> {isCalculation ? "Copy result" : fileSearchActive ? "Search / Open" : "Select"}</span>
          <span className="footer-brand">Aliases · Fuzzy search · Recents ✦</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
