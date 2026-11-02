import type { CommandPack } from "./types";

const productivityPack: CommandPack = {
  id: "core",
  name: "Orbit Core",
  version: "0.7.0",
  description: "The two core Orbit features: reliable local file search and preferences.",
  commands: [
    { id: "files", name: "Search Files", description: "Search files and folders on this PC", category: "Core", icon: "📁", aliases: ["file", "find file", "documents", "downloads", "folder", "search"] },
    { id: "settings", name: "Orbit Settings", description: "Manage launcher preferences", category: "Core", icon: "⚙", aliases: ["settings", "preferences", "config", "options"] },
  ],
};

export default productivityPack;
