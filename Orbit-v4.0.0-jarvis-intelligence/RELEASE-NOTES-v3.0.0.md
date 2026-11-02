# Orbit v3.0.0 — Productivity Suite

## New in this release

- **Productivity Control Center** with Overview, Activity, Workspaces, Automations, Snippets, Reminders, and System & Audit sections.
- **Native Windows foreground-app activity** sampled every 15 seconds. It stores process names and approximate durations only; it does not store window titles or document contents. Idle sessions over 60 seconds and Orbit itself are excluded. Sampling is approximate, not a forensic activity log.
- **Unified activity surface** combines the new native-app activity view with the existing Chromium domain-time Focus Intelligence dashboard. Browser domain timing remains collected by the optional extension.
- **Workspace snapshots** save the selected project folder, a list of HTTPS links, and allowed app launches (Notepad and Calculator). Restore asks before launching apps or websites.
- **Reusable snippets** stored locally with one-click clipboard copy.
- **One-time reminders** with desktop notifications when supported. Orbit must be running at the due time; this release does not run a background service after Orbit exits.
- **Multi-step workflows** that can open HTTPS URLs, launch Notepad/Calculator, and copy text. Each workflow requires explicit confirmation and writes an outcome audit record. Arbitrary shell commands are not supported.
- **Data export and deletion** for the new hub's local records.
- **Extension SDK guide export** describing the current declarative command-pack shape and documenting the limitation that third-party dynamic loading and a plugin sandbox are not yet implemented.
- **Windows NSIS installer configuration** via `npm run dist:win`.
- **Update-check integration scaffold** using `ORBIT_UPDATE_URL`. A real published feed/release pipeline must be configured by the maintainer before automatic updates can function.

## Existing features retained

Launcher search, built-in commands, calculator, AI assistant/streaming, provider configuration and routing, saved conversations, prompt library/history, Markdown export, bounded AI task runner, project folder retrieval, allowlisted project checks, clipboard capture/history, custom HTTPS commands, theme settings, global shortcut, startup preference, voice input, Quick Capture, Focus Intelligence, browser tracking extension, focus analytics, goals, sprint timer and CSV export.

## Run from source

```powershell
npm install
npm run build
npm run desktop
```

## Build Windows installer

```powershell
npm install
npm run build
npm run dist:win
```

The installer is emitted to `release/`. Code signing and publishing are not configured by this source archive. For update checks, set `ORBIT_UPDATE_URL` to a valid generic update feed when launching a packaged build; the feed must contain metadata and artifacts produced by a compatible Electron Builder release process.

## Verification limits

Native foreground tracking depends on PowerShell and Windows user32 APIs and is best-effort. Reminders are in-app-process timers. The extension guide is documentation, not a dynamic plugin loader. AI provider availability, local Whisper model download/runtime, Windows installer generation, and auto-update delivery must be tested on the target Windows machine with network access and the required release configuration.
