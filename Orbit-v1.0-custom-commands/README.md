# Orbit v1.0.0

Orbit is a Windows-first desktop launcher built with Electron, React, TypeScript, and Vite.

## What's included

- Raycast-inspired launcher with fuzzy command search and keyboard navigation
- Built-in command packs: Google, GitHub, Calculator, Windows Calculator, Search Files, Settings, and Notepad
- Local file/folder search and native file opening
- Settings for theme, global shortcut, and launch-at-sign-in
- Custom Commands: create a named launcher command, assign a search keyword, and open a secure HTTPS destination
- Custom commands persist in local app storage and can be removed from Settings
- Secure Electron boundary: renderer has no Node integration; app launches remain allowlisted; external links must use HTTPS and cannot contain URL credentials

## Requirements

- Node.js 20.19+ or 22.12+ recommended
- Windows for the full native desktop features

## Run

Open PowerShell in the folder that contains `package.json`, then run:

```powershell
npm install
npm run build
if ($LASTEXITCODE -eq 0) { npm run desktop }
```

The Vite development server uses port **5176** with strict-port mode to avoid silently connecting to a different Orbit instance. Close older Orbit development servers before launching this version.

## Create a custom command

1. Search for and open **Orbit Settings**.
2. Under **Custom Commands**, enter a command name, a search keyword, and an `https://` URL.
3. Select **Create command**.
4. Return to the launcher and type the keyword or command name; press Enter to open it.
5. Remove commands from Settings when no longer needed.

Custom commands open HTTPS destinations only. Arbitrary shell commands and third-party JavaScript extensions are deliberately not executed; those require a separate permission and signing model.

## Notes

This release is source-complete, but dependency installation and a full TypeScript/Vite build were not verified in the generation environment. Run the commands above from the project root; the first check is that `package.json` exists in the current directory.
