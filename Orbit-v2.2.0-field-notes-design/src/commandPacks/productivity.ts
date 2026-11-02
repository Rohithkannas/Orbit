import type { CommandPack } from "./types";

const productivityPack: CommandPack = {
  id: "core",
  name: "Orbit Core",
  version: "1.0.0",
  description: "Core launcher features, file search, preferences, and native productivity apps.",
  commands: [
    { id: "files", name: "Search Files", description: "Search files and folders on this PC", category: "Core", icon: "📁", aliases: ["file", "find file", "documents", "downloads", "folder", "search"] },
    { id: "settings", name: "Orbit Settings", description: "Manage launcher preferences and extensions", category: "Core", icon: "⚙", aliases: ["settings", "preferences", "config", "options"] },
    { id: "notepad", name: "Notepad", description: "Launch Windows Notepad", category: "Productivity", icon: "📝", aliases: ["notes", "text editor", "editor"] },
    { id: "ai-assistant", name: "Orbit AI", description: "Ask a local or OpenAI-compatible AI model", category: "AI", icon: "✦", aliases: ["ai", "assistant", "ask ai", "llm", "ollama", "chat"] },
  ],
};

export default productivityPack;
