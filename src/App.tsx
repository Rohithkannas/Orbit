
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { calculate } from "./calculator";

type Command = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
};

type OperationResult = {
  success: boolean;
  error?: string;
};

type FileSearchResult = {
  name: string;
  path: string;
  isDirectory: boolean;
};

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

const commands: Command[] = [
  {
    id: "browser",
    name: "Open Google",
    description: "Open Google in your browser",
    category: "Web",
    icon: "🌐",
  },
  {
    id: "github",
    name: "Open GitHub",
    description: "Open GitHub repositories",
    category: "Development",
    icon: "⌘",
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Calculate an arithmetic expression",
    category: "Utilities",
    icon: "∑",
  },
  {
    id: "notepad",
    name: "Open Notepad",
    description: "Launch Windows Notepad",
    category: "Productivity",
    icon: "📝",
  },
  {
    id: "windows-calculator",
    name: "Windows Calculator",
    description: "Launch the native Windows Calculator",
    category: "Utilities",
    icon: "⊞",
  },
  {
    id: "files",
    name: "Search Files",
    description: "Find files in Desktop, Documents, and Downloads",
    category: "System",
    icon: "📁",
  },
  {
    id: "settings",
    name: "Orbit Settings",
    description: "Manage launcher preferences",
    category: "Orbit",
    icon: "⚙",
  },
];

function App() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [fileResults, setFileResults] = useState<FileSearchResult[]>([]);
  const [fileSearchActive, setFileSearchActive] = useState(false);
  const [fileSearchLoading, setFileSearchLoading] = useState(false);

  const calculation = useMemo(() => calculate(query), [query]);
  const isCalculation = calculation !== null;

  const filteredCommands = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search || isCalculation) return commands;

    return commands.filter((command) =>
      `${command.name} ${command.description} ${command.category}`
        .toLowerCase()
        .includes(search),
    );
  }, [query, isCalculation]);

  useEffect(() => {
    setSelectedIndex(0);
    setMessage("");
    setFileResults([]);
    setFileSearchActive(false);
    setFileSearchLoading(false);
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
      setFileSearchActive(true);

      if (results.length === 0) {
        setMessage("No matching files found in the supported folders.");
      }
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
      setMessage(
        result.success
          ? `Opening ${file.name}...`
          : result.error ?? "Could not open this item.",
      );
    } catch {
      setMessage("Could not open the selected item.");
    }
  }, []);

  const runCommand = useCallback(
    async (command: Command) => {
      if (isBusy) return;

      if (command.id === "calculator") {
        setQuery("");
        setMessage("Type an arithmetic expression to calculate.");
        return;
      }

      if (command.id === "files") {
        setFileSearchActive(true);
        setFileResults([]);
        setMessage("Type a filename in the search box, then press Enter.");
        return;
      }

      if (command.id === "settings") {
        setMessage("Orbit Settings are coming in a future update.");
        return;
      }

      setIsBusy(true);

      try {
        if (command.id === "browser" || command.id === "github") {
          const url =
            command.id === "browser"
              ? "https://www.google.com"
              : "https://github.com";

          if (!window.orbit?.openExternal) {
            setMessage("Website integration is unavailable.");
            return;
          }

          const result = await window.orbit.openExternal(url);
          setMessage(
            result.success
              ? `Opening ${command.id === "browser" ? "Google" : "GitHub"}...`
              : result.error ?? "Could not open the website.",
          );
          return;
        }

        if (
          command.id === "notepad" ||
          command.id === "windows-calculator"
        ) {
          if (!window.orbit?.launchApp) {
            setMessage("Native app launching is unavailable.");
            return;
          }

          const appId =
            command.id === "notepad" ? "notepad" : "calculator";

          const result = await window.orbit.launchApp(appId);

          setMessage(
            result.success
              ? `${command.name} started.`
              : result.error ?? "Could not launch the application.",
          );
        }
      } catch {
        setMessage("The operation failed. Please try again.");
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuery("");
        setMessage("");
        setFileSearchActive(false);
        setFileResults([]);
        return;
      }

      if (isCalculation && event.key === "Enter") {
        event.preventDefault();
        void copyCalculation();
        return;
      }

      if (fileSearchActive && event.key === "Enter") {
        event.preventDefault();

        if (fileResults[selectedIndex]) {
          void openFile(fileResults[selectedIndex]);
        } else if (query.trim().length >= 2) {
          void searchFiles(query);
        }

        return;
      }

      if (!isCalculation && event.key === "ArrowDown") {
        event.preventDefault();

        const count = fileSearchActive
          ? fileResults.length
          : filteredCommands.length;

        setSelectedIndex((current) =>
          count ? (current + 1) % count : 0,
        );
      }

      if (!isCalculation && event.key === "ArrowUp") {
        event.preventDefault();

        const count = fileSearchActive
          ? fileResults.length
          : filteredCommands.length;

        setSelectedIndex((current) =>
          count ? (current - 1 + count) % count : 0,
        );
      }

      if (!isCalculation && !fileSearchActive && event.key === "Enter") {
        event.preventDefault();

        const command = filteredCommands[selectedIndex];

        if (command) {
          if (command.id === "files") {
            void searchFiles(query);
          } else {
            void runCommand(command);
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCalculation,
    fileSearchActive,
    fileResults,
    filteredCommands,
    selectedIndex,
    query,
    copyCalculation,
    openFile,
    searchFiles,
    runCommand,
  ]);

  return (
    <main className="orbit-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <span>orbit</span>
          <span className="version">
            v{window.orbit?.version ?? "0.1.0"}
          </span>
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
            placeholder={
              fileSearchActive
                ? "Enter a filename and press Enter..."
                : "What do you want to do?"
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <kbd>ESC</kbd>
        </div>

        {isCalculation ? (
          <>
            <div className="section-heading">
              <span>CALCULATION</span>
              <span>PRESS ENTER TO COPY</span>
            </div>

            <button
              className="calculation-result"
              onClick={() => void copyCalculation()}
              title="Copy calculation result"
            >
              <span className="calculation-expression">{query}</span>
              <strong>{calculation}</strong>
              <span className="calculation-hint">↵ Copy result</span>
            </button>
          </>
        ) : fileSearchActive ? (
          <>
            <div className="section-heading">
              <span>FILE SEARCH</span>
              <span>
                {fileSearchLoading
                  ? "SEARCHING..."
                  : `${fileResults.length} RESULTS`}
              </span>
            </div>

            <div className="command-list" role="listbox" aria-label="File results">
              {fileResults.map((file, index) => (
                <button
                  key={file.path}
                  className={`command-row ${
                    index === selectedIndex ? "selected" : ""
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => void openFile(file)}
                >
                  <span className="command-icon">
                    {file.isDirectory ? "📁" : "📄"}
                  </span>

                  <span className="command-copy">
                    <span className="command-name">{file.name}</span>
                    <span className="command-description">{file.path}</span>
                  </span>

                  <span className="command-arrow">↵</span>
                </button>
              ))}

              {!fileSearchLoading && fileResults.length === 0 && (
                <div className="empty-state">
                  <span className="empty-icon">⌕</span>
                  <strong>No file results yet</strong>
                  <span>Enter a filename and press Enter to search.</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="section-heading">
              <span>{query.trim() ? "SEARCH RESULTS" : "QUICK ACCESS"}</span>
              <span>{filteredCommands.length} COMMANDS</span>
            </div>

            <div className="command-list" role="listbox" aria-label="Commands">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    className={`command-row ${
                      index === selectedIndex ? "selected" : ""
                    }`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    disabled={isBusy}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() =>
                      command.id === "files"
                        ? (setFileSearchActive(true),
                          setMessage("Enter a filename and press Enter to search."))
                        : void runCommand(command)
                    }
                  >
                    <span className="command-icon">{command.icon}</span>

                    <span className="command-copy">
                      <span className="command-name">{command.name}</span>
                      <span className="command-description">
                        {command.description}
                      </span>
                    </span>

                    <span className="command-category">
                      {command.category}
                    </span>

                    <span className="command-arrow">↵</span>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-icon">⌕</span>
                  <strong>No commands found</strong>
                  <span>Try a different search term.</span>
                </div>
              )}
            </div>
          </>
        )}

        {message && (
          <div className="feedback" role="status">
            <span className="status-dot" />
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <footer className="palette-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>↵</kbd>{" "}
            {isCalculation
              ? "Copy result"
              : fileSearchActive
                ? "Search / Open"
                : "Select"}
          </span>
          <span className="footer-brand">Built for your flow ✦</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
