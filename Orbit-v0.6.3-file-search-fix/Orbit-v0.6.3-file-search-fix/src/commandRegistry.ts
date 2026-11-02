/** Orbit's extensible command catalogue. Command packs are independently registered manifests. */
import { commandPacks } from "./commandPacks";

export type Command = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  aliases: string[];
  packId: string;
};

export type CommandPack = {
  id: string;
  name: string;
  version: string;
  description: string;
  commands: Omit<Command, "packId">[];
};

export class CommandRegistry {
  private readonly packs = new Map<string, CommandPack>();
  private readonly commandsById = new Map<string, Command>();

  registerPack(pack: CommandPack): void {
    if (!/^[a-z][a-z0-9-]*$/.test(pack.id)) {
      throw new Error(`Invalid command pack ID: ${pack.id}`);
    }
    if (this.packs.has(pack.id)) throw new Error(`Duplicate command pack: ${pack.id}`);
    if (!pack.name.trim() || !pack.version.trim()) throw new Error(`Command pack ${pack.id} requires a name and version.`);

    const incoming = pack.commands.map((command) => ({ ...command, packId: pack.id }));
    const localIds = new Set<string>();
    for (const command of incoming) {
      if (!/^[a-z][a-z0-9-]*$/.test(command.id)) throw new Error(`Invalid command ID: ${command.id}`);
      if (this.commandsById.has(command.id) || localIds.has(command.id)) throw new Error(`Duplicate command ID: ${command.id}`);
      if (!command.name.trim() || !command.description.trim()) throw new Error(`Command ${command.id} requires a name and description.`);
      localIds.add(command.id);
    }

    this.packs.set(pack.id, pack);
    for (const command of incoming) this.commandsById.set(command.id, command);
  }

  getAll(): Command[] { return [...this.commandsById.values()]; }
  getById(id: string): Command | undefined { return this.commandsById.get(id); }
  getPacks(): Omit<CommandPack, "commands">[] {
    return [...this.packs.values()].map((pack) => ({
      id: pack.id,
      name: pack.name,
      version: pack.version,
      description: pack.description,
    }));
  }
}

export const commandRegistry = new CommandRegistry();
for (const pack of commandPacks) commandRegistry.registerPack(pack);
export const commands: Command[] = commandRegistry.getAll();

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
  return commandRegistry.getById(id);
}
