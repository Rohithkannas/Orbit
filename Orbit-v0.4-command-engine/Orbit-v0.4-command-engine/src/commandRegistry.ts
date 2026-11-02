/** Orbit command registry. Add new commands here; keep execution in the app's controlled dispatcher. */
type Command = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  aliases: string[];
};


export const commands: Command[] = [
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


export function rankCommands(query: string): Command[] {
  const search = query.trim();
  if (!search) return commands;
  return commands
    .map((command) => ({ command, score: commandScore(command, search) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.command.name.localeCompare(b.command.name))
    .map((item) => item.command);
}

export function getCommandById(id: string): Command | undefined {
  return commands.find((command) => command.id === id);
}

export type { Command };
