import type { CommandPack } from "./types";

const productivityPack: CommandPack = {
  id: "productivity",
  name: "Productivity Commands",
  version: "1.0.0",
  description: "Local productivity and launcher management actions.",
  commands: [
    { id: "notepad", name: "Open Notepad", description: "Launch Windows Notepad", category: "Productivity", icon: "📝", aliases: ["np", "note", "notes", "text editor", "editor"] },
    { id: "files", name: "Search Files", description: "Find files in Desktop, Documents, and Downloads", category: "System", icon: "📁", aliases: ["file", "find file", "documents", "downloads", "folder"] },
    { id: "settings", name: "Orbit Settings", description: "Manage launcher preferences", category: "Orbit", icon: "⚙", aliases: ["settings", "preferences", "config", "options"] },
  ],
};

export default productivityPack;
