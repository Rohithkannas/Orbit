# Orbit v2.3.0 — Project Restore & Planner Reliability

## Fixed
- Restore the saved project folder into Electron's process-local project authorization when Orbit starts. Previously, the renderer could remember a path while the main process had no active selected project, causing project search and approved actions to reject it until the folder was reselected.
- Validate the saved folder on startup; clear stale paths and ask the user to select the folder again when it is no longer available.
- Shorten the task-planning prompt and limit retrieved excerpts to reduce unnecessary prompt size for local models.

## Verification
- `node --check electron/main.cjs` passed.
- `node --check electron/preload.cjs` passed.
- `package.json` parsed successfully.
- Full TypeScript/Vite build was not verified because `npm install --no-audit --no-fund` did not finish within the available execution window.

## Known behavior
- The AI connection test proves that the provider can answer a short prompt; it does not guarantee that longer planning requests will succeed. The task runner retains a clearly labeled deterministic fallback when AI planning fails.
- A project folder must be selected at least once. On later launches Orbit attempts to restore and validate the saved folder automatically.
