# Orbit v0.3 — Command Architecture

This version separates command metadata and fuzzy matching into `src/commandRegistry.ts`. The React UI consumes the registry through `rankCommands`, while command execution remains in the existing controlled dispatcher. This is an intentional first step toward an extension system: metadata/search are modularized before adding dynamic plugin loading or third-party code execution.

## Run

```powershell
npm install
npm run build
npm run desktop
```

## Add a command

Add a typed entry to the `commands` array in `src/commandRegistry.ts`, including a stable `id`, label, description, category, icon, and aliases. To make it executable, add a corresponding explicitly approved branch to the dispatcher in `src/App.tsx`. This two-step process is deliberate: registering metadata does not automatically grant operating-system permissions.

## Security model

- Do not execute arbitrary shell strings from command metadata.
- Native actions should go through narrow, allowlisted Electron IPC methods.
- Third-party plugins should not run in the privileged Electron main process.
