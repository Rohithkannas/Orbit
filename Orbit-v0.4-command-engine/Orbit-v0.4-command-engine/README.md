# Orbit v0.4 — Typed Command Engine

Orbit is a Windows-first desktop command launcher built with Electron, React, TypeScript, and Vite.

## What's included

- Typed command execution contracts in `src/commandEngine.ts`.
- Centralized command dispatch with duplicate-ID detection, input validation, unknown-command handling, cancellation checks, and normalized error results.
- Command registry and fuzzy search, aliases, and recent commands.
- Calculator, allowlisted web links, Windows Notepad/Calculator launch, and file search in Desktop, Documents, and Downloads.
- Electron context isolation, sandboxed renderer, explicit native-app and external-URL allowlists, plus input bounds on file search/open IPC.
- Complete TypeScript project references, including `tsconfig.node.json`.

## Requirements

- Windows 10 or later
- Node.js 22 or later (Node 24 recommended)
- npm

## Install and run

Open PowerShell in this extracted folder and run:

```powershell
npm install
npm run build
npm run desktop
```

The desktop launcher uses **Ctrl+Shift+Space** to show or hide the window. In the development version, Vite runs on `127.0.0.1:5173`.

## Build checks

`npm run build` runs TypeScript project checks and creates the production renderer bundle. `npm run desktop` runs the development UI and Electron shell together.
