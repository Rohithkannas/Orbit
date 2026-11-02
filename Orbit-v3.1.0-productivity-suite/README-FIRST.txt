ORBIT v3.1.0 — Productivity Suite & Context-Aware Extensions

Extract this ZIP into a new folder. Open PowerShell in the folder containing package.json, then run:
  npm install
  npm run build
  npm run desktop

Use the ◈ Hub button to access the Productivity Control Center: local desktop/browser activity, workspace snapshots, approved multi-step workflows, snippets, one-time reminders, diagnostics, data export, workflow audit history, context-aware shortcuts, and the declarative Extensions manager. Import a JSON command pack under Hub → Extensions. Existing launcher, AI, voice, focus analytics, project tools, command packs and settings are retained.

Windows installer build (requires dependencies and internet access):
  npm run dist:win

Important limits:
- Native app tracking is best-effort, samples every 15 seconds and records process names only; it does not record window titles. Pause it any time from Hub → Activity.
- Context-aware process lookup is Windows-only and best-effort.
- Reminders require Orbit to be running at the due time.
- Workflows/extensions only open HTTPS links, launch Notepad/Calculator or copy text. Arbitrary shell execution is not supported.
- Workspace snapshots restore the selected project folder and configured apps/links; they do not preserve unsaved app state or browser tab state.
- Automatic updates need a compatible published update feed configured through ORBIT_UPDATE_URL. This source archive does not include a signed release or a hosted update feed.
- Extension packs are declarative JSON; arbitrary JavaScript plugins are intentionally not supported.

Verification status: Electron main/preload syntax and TypeScript/JSX syntax transpilation passed. Dependency installation timed out in the build environment, so the full TypeScript/Vite build and Windows installer were not verified here. Run npm run build on your Windows PC; if it fails, share the full terminal output.
