/** Typed execution contracts shared by Orbit's command dispatch layer. */
export type CommandSuccess = {
  success: true;
  message?: string;
};

export type CommandFailure = {
  success: false;
  error: string;
};

export type CommandResult = CommandSuccess | CommandFailure;

export type ExecutableCommand<TContext> = {
  id: string;
  validateInput: (input: unknown) => input is undefined;
  execute: (input: undefined, context: TContext) => Promise<CommandResult> | CommandResult;
};

export function createCommandEngine<TContext>(definitions: readonly ExecutableCommand<TContext>[]) {
  const registry = new Map<string, ExecutableCommand<TContext>>();

  for (const definition of definitions) {
    if (!definition.id.trim()) throw new Error("Command IDs cannot be empty.");
    if (registry.has(definition.id)) throw new Error(`Duplicate command ID: ${definition.id}`);
    registry.set(definition.id, definition);
  }

  return {
    getCommandIds: () => [...registry.keys()],

    async execute(commandId: string, input: unknown, context: TContext, signal?: AbortSignal): Promise<CommandResult> {
      const definition = registry.get(commandId);
      if (!definition) return { success: false, error: `Unknown command: ${commandId}` };
      if (!definition.validateInput(input)) return { success: false, error: `Invalid input for command: ${commandId}` };
      if (signal?.aborted) return { success: false, error: "Command was cancelled." };

      try {
        const result = await definition.execute(input, context);
        if (!result || typeof result.success !== "boolean") {
          return { success: false, error: "The command returned an invalid result." };
        }
        return result;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown execution error";
        return { success: false, error: `Command failed: ${detail}` };
      }
    },
  };
}
