ORBIT v3.0.0 — Productivity Suite

Extract this ZIP into a new folder. Open PowerShell in the folder containing package.json, then run:
  npm install
  npm run build
  npm run desktop

Use the new ◈ Hub button to access the Productivity Control Center: local desktop/browser activity, workspace snapshots, approved multi-step workflows, snippets, one-time reminders, diagnostics, data export and workflow audit history. Existing launcher, AI, voice, focus analytics, project tools, command packs and settings are retained.

Windows installer build (requires package installation and internet access):
  npm run dist:win

Important limits:
- Native app tracking is best-effort, samples every 15 seconds and records process names only; it does not record window titles. Pause it any time from Hub → Activity.
- Reminders require Orbit to be running at the due time.
- Workflows only open HTTPS links, launch Notepad/Calculator or copy text. Arbitrary shell execution is not supported.
- Workspace snapshots restore the selected project folder and configured apps/links; they do not preserve unsaved app state or browser tab state.
- Automatic updates need a compatible published update feed configured through ORBIT_UPDATE_URL. This source archive does not include a signed release or a hosted update feed.
- Third-party dynamic extension loading is not implemented; ORBIT-EXTENSION-SDK.md documents the current command-pack contract.

Build verification status: source syntax checks were performed for the Electron main/preload files. Dependency installation timed out in the build environment, so a full TypeScript/Vite build and Windows installer were not verified here. Run npm run build on your Windows PC and share the full terminal error if it fails.
