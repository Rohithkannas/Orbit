import type { CommandPack } from "./types";

const webPack: CommandPack = {
  id: "web",
  name: "Web Commands",
  version: "1.0.0",
  description: "Open frequently used websites and developer resources.",
  commands: [
    { id: "browser", name: "Open Google", description: "Open Google in your browser", category: "Web", icon: "🌐", aliases: ["google", "web", "search", "browser", "www"] },
    { id: "github", name: "Open GitHub", description: "Open GitHub repositories", category: "Development", icon: "⌘", aliases: ["gh", "git hub", "repos", "repository", "repositories"] },
  ],
};

export default webPack;
