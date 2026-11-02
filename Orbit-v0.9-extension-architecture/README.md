# Orbit v0.9.0 — Extension Architecture

Orbit is a Windows-first Electron + React command launcher. This release retains the core command packs and adds an Extensions & Command Packs section in Settings so loaded packs and their commands are visible.

## Included
- Web commands: Google and GitHub
- Utilities: calculator and Windows Calculator
- Core/productivity: file search, settings, and Notepad
- Fuzzy command search, aliases, and recent commands
- Typed command execution and Electron IPC allowlists
- Theme, global shortcut, and launch-at-sign-in preferences
- Settings view listing registered command packs and their commands

## Run on Windows
Extract the ZIP into a new folder, open PowerShell in the folder containing `package.json`, then run:

```powershell
npm install
npm run build
if ($LASTEXITCODE -eq 0) { npm run desktop }
```

Development server uses port 5176. Close older Orbit dev servers before launching.

## Extension architecture note
Built-in command packs are validated and registered at startup. This release exposes their metadata in Settings; it does not yet load arbitrary third-party JavaScript plugins. External plugin execution requires a separate sandbox and permission model and is intentionally not enabled by simply importing user code.
