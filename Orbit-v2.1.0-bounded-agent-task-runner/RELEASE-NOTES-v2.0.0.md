# Orbit v2.0.0 — Combined workspace release

This release combines the planned v1.10–v1.14 feature groups into one integrated update.

## Included
- Task-aware routing to optional quick, coding, and deep-analysis model configurations.
- One configured failover provider, attempted only when the selected provider fails before producing any output.
- Saved named conversation snapshots and a rolling latest-session autosave.
- User-selected project-folder keyword retrieval with matching line excerpts.
- Confirmation-gated fixed project actions: Git status, Git diff summary, recent commits, and npm build.
- Manually captured text clipboard history, stored locally and removable item by item.
- Existing launcher, global shortcut, custom commands, file search, calculator, streaming AI, prompt templates, response modes, and Markdown export retained.

## Boundaries
- Project retrieval is keyword/excerpt based; no embedding model or vector database is included.
- Project files are retrieved as untrusted context; Orbit does not silently modify project files.
- Project actions are fixed allowlisted commands, not arbitrary AI-generated shell execution.
- Clipboard history is not a background monitor; capture requires a button press.
- Model routing and fallback require provider/model endpoints configured by the user.

## Verification performed in this build environment
- Electron main/preload JavaScript syntax checks passed.
- TypeScript/JSX transpilation syntax check passed.
- ZIP integrity test passed and project files are at ZIP root.
- Full `npm run build` was not verified because dependency installation timed out in the build environment.
