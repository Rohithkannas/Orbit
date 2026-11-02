# Orbit v0.5 — Extension-Style Command Architecture

Orbit is a Windows-first desktop launcher built with Electron, React, TypeScript, and Vite.

## What's new in v0.5

- **Command packs:** built-in commands are separated into independent manifests under `src/commandPacks/` (`web`, `utilities`, and `productivity`).
- **CommandRegistry:** central registry validates pack IDs, command IDs, duplicate registrations, and required metadata.
- **Pack metadata:** each pack declares an ID, name, version, description, and commands.
- **Backward-compatible search:** fuzzy matching, aliases, recents, calculator, file search, and command execution continue to use the registered catalogue.
- **Version bump:** Orbit reports version `0.5.0`.

## Run on Windows

Install a current Node.js LTS release, extract the project, and open PowerShell in this folder:

```powershell
npm install
npm run build
npm run desktop
```

`npm run build` performs the TypeScript project build and Vite production build. `npm run desktop` starts the Vite development server and Electron shell.

## Add a built-in command pack

1. Create a new file in `src/commandPacks/`, exporting a `CommandPack` manifest.
2. Give the pack a unique lowercase ID and each command a unique lowercase ID.
3. Register the pack in `src/commandPacks/index.ts`.
4. For commands that need behavior, add a handler to the controlled dispatcher in `src/App.tsx`. The registry intentionally owns metadata and discovery; execution remains behind the app's trusted command engine and Electron IPC allowlists.

## Architecture note

This is an **internal extension-style architecture**, not a public third-party plugin loader. It deliberately avoids executing arbitrary downloaded code. A future plugin API should include explicit permissions, schema-validated inputs, version compatibility checks, and a sandbox boundary before allowing external extensions.
