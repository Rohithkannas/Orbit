# Orbit v0.6.2 — Settings Screen Fix

This version includes an actual Settings view (not the v0.5 placeholder) and uses Vite port 5174 to avoid colliding with older Orbit dev servers on 5173.

## Run on Windows

1. Close all Orbit windows and stop old Orbit development terminals.
2. Extract this ZIP into a new folder named `Orbit-v0.6.2-settings-verified`.
3. Open PowerShell in that exact folder. Confirm with `Get-Location`.
4. Run:

```powershell
npm install
npm run build
npm run desktop
```

The title header should show `v0.6.2`. Search for `Settings`, press Enter, and the Settings page should replace the command list. If the header still shows `v0.1.0`, this folder is not the source currently being launched.

## Included settings
- Dark/light theme preference stored locally
- Global shortcut selection with Electron registration
- Launch-at-sign-in toggle
- Reset preferences

## Verification note
The source was inspected for the actual Settings view and command handler. A full build could not be verified in this environment because Vite and its type definitions were unavailable locally. Run `npm run build` after `npm install` on Windows.
