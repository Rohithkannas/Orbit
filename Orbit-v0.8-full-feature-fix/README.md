# Orbit v0.8.0 — Full Feature Integration

This build restores all built-in command packs and connects every advertised built-in command to a handler.

## Included and connected features

- **Command launcher:** quick access, fuzzy search, aliases, keyboard navigation, and recent commands.
- **Web commands:** open Google and GitHub in the system browser.
- **Calculator:** safe arithmetic parser with live results and Enter feedback.
- **Windows apps:** launch Notepad and Windows Calculator through an allowlist in Electron.
- **File search:** automatic search after typing at least two characters; prioritizes the current project and searches Orbit, Desktop, Documents, and Downloads; skips heavyweight/system directories; open selected files/folders.
- **Settings:** dark/light theme, global shortcut selection, launch at sign-in, and reset preferences.
- **Command packs:** Web, Utilities, and Productivity packs are all registered together.
- **Electron safety:** context isolation, no renderer Node integration, validated app IDs, and allowlisted external URLs.

## Windows setup

Extract the ZIP into a new folder. The ZIP is packaged so `package.json` is directly inside the extracted folder. Close older Orbit windows and terminals before starting the new version.

```powershell
if (-not (Test-Path .\package.json)) { throw 'Wrong folder: package.json is missing.' }
$version = (Get-Content .\package.json -Raw | ConvertFrom-Json).version
if ($version -ne '0.8.0') { throw "Wrong project version: $version" }
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed; not starting Orbit.' }
npm run desktop
```

The dev server uses port 5176 to avoid earlier Orbit instances on 5173–5175.
