# Orbit v0.6.1 — Settings & Preferences

Orbit is a Windows-first desktop productivity launcher built with React, TypeScript, Vite, and Electron.

## v0.6.1 highlights
- Settings screen available from the Settings command.
- Dark and light themes, with a system option that currently uses the dark fallback.
- Configurable global shortcut: Ctrl+Shift+Space, Ctrl+Alt+Space, or Ctrl+Shift+O.
- Optional launch-at-sign-in setting through Electron's login-item API.
- UI preferences saved locally; native preferences are applied through validated Electron IPC handlers.
- Retains fuzzy command search, aliases, recent commands, calculator, file search, and existing command packs.

## Run on Windows
```powershell
npm install
npm run build
npm run desktop
```

Open the Settings command inside Orbit to change preferences. If a global shortcut is already claimed by another application, Orbit reports the conflict and keeps the existing shortcut. Launch-at-sign-in behavior may differ between development and packaged builds; use a packaged build for normal startup use.
