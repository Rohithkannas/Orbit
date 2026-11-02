import type { CommandPack } from "./types";

const utilitiesPack: CommandPack = {
  id: "utilities",
  name: "Utilities",
  version: "1.0.0",
  description: "Fast calculations and native productivity utilities.",
  commands: [
    { id: "calculator", name: "Calculator", description: "Calculate an arithmetic expression", category: "Utilities", icon: "∑", aliases: ["calc", "math", "compute", "equation"] },
    { id: "windows-calculator", name: "Windows Calculator", description: "Launch the native Windows Calculator", category: "Utilities", icon: "⊞", aliases: ["win calc", "native calc", "system calculator"] },
  ],
};

export default utilitiesPack;
