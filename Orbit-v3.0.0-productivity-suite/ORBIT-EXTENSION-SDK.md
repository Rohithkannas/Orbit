# Orbit Extension SDK — Draft v1

Orbit currently uses declarative command packs registered in source. This guide documents the shape of the contract; it is not a third-party dynamic plugin loader or a security sandbox.

```ts
export type OrbitCommand = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  description: string;
  keywords?: string[];
};

export type OrbitCommandPack = {
  id: string;
  name: string;
  version: string;
  description: string;
  commands: OrbitCommand[];
};
```

## Security expectations

- Use stable, namespaced command IDs.
- Validate every argument at the command boundary.
- Prefer declarative actions and explicit allowlists.
- Never evaluate arbitrary code or execute model-generated shell commands.
- Treat file contents and model output as untrusted input.
- A production plugin system still needs manifest validation, permission prompts, lifecycle controls, API versioning, and process isolation before loading third-party code.
