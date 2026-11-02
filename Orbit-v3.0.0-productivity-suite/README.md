# Orbit v2.1.0 — Bounded Agent Task Runner

Windows-first desktop launcher and personal AI workspace built with Electron, React, TypeScript, and Vite.

## Run locally

```powershell
npm install
npm run build
npm run desktop
```

## What's included

- Existing launcher commands, custom HTTPS commands, global hotkey, themes, file search, calculator, AI streaming, response modes, prompt templates, prompt history, and Markdown export.
- Optional task-aware routing to separately configured quick, coding, and deep-analysis model endpoints. Blank routes use the primary model.
- Locally persisted named conversation snapshots and a latest-session autosave.
- Explicit project-folder selection and bounded text-file retrieval with relative paths and matching line excerpts. Retrieved project text is treated as untrusted data.
- Confirmation-gated, allowlisted project actions: Git status, Git diff summary, recent commits, and npm build. Arbitrary shell commands are not exposed.
- Manually captured clipboard text history stored locally, with delete controls. Clipboard capture is not continuous.

## Important limits

- Model routing requires provider endpoints and models that you configure; it does not provide free API access or automatically create provider credentials.
- Project retrieval uses bounded keyword matching and excerpts, not embeddings or a semantic vector database.
- Safe actions are a fixed allowlist; arbitrary agent-generated shell commands are intentionally unsupported.
- Clipboard history only captures text after you press the capture button.
- API keys remain in local app storage inherited from the existing settings implementation; use only on a trusted Windows account.

## Security

Project indexing skips common dependency/build directories and filenames that look like environment files, secrets, credentials, or private-key files. Treat all project content as untrusted. Review each approved action before confirming it.


## v2.1.0 Agent Task Runner

In the AI workspace, use **Agent Task Runner** to describe a goal and generate an AI-assisted plan. Planning does not execute commands. Review the plan, choose the fixed allowlisted checks, then confirm the project folder and selected actions. Orbit runs them sequentially and displays actual stdout/stderr with per-step status. The last 20 task records are stored locally and can be restored without re-running them.

This is a bounded task runner, not an autonomous coding agent: it does not edit source files or execute arbitrary model-generated shell commands. It can run Git status, Git diff summary, recent Git commits, and `npm run build` in the project folder selected through Orbit.

## Run

```powershell
npm install
npm run build
npm run desktop
```

The full TypeScript build should be run on the target Windows machine after dependencies install. See `RELEASE-NOTES-v2.1.0.md` for verification scope and safety boundaries.


## v2.1.1 task planning reliability

If the configured AI provider cannot generate a plan, Orbit now creates a clearly labeled local fallback plan and reports the provider error instead of leaving the task panel empty. The plan can be copied or exported as a Markdown task report from the Agent Task Runner.

See `RELEASE-NOTES-v2.1.1.md` for details.


## Orbit v2.4.0 — Focus Intelligence

This release adds an optional, local-first website-time dashboard. See [`README-FOCUS-INTELLIGENCE.md`](README-FOCUS-INTELLIGENCE.md) for setup. The optional Chromium extension records active domain durations only; it does not collect page text or send browsing data to a cloud service.


## Orbit v2.5.0 — Focus Analytics
See `RELEASE-NOTES-v2.5.0.md` for the Focus Intelligence analytics, local daily goal, focus sprint timer, and CSV export additions.

## v2.6.0 — Voice & Capture
See `RELEASE-NOTES-v2.6.0.md` for voice input, local Quick Capture notes, and focus-sprint continuity. Voice support depends on Web Speech API availability and microphone permissions.

## v3.0.0 — Productivity Suite

Orbit's new **Control Center** adds local snippets, one-time reminders, workspace snapshots, approved multi-step workflows, an execution audit, JSON data export, an extension SDK guide, and a native Windows foreground-application activity view. Native app tracking samples every 15 seconds and stores process names and approximate durations only; it does not store window titles. See `RELEASE-NOTES-v3.0.0.md` for scope and limitations.

### Windows installer

Run `npm run dist:win` after installing dependencies. This creates an NSIS installer under `release/`. The build configuration is present, but code signing and publishing must be configured by the maintainer.

### Automatic updates

Update-check integration expects `ORBIT_UPDATE_URL` to point to a compatible published generic update feed in packaged builds. Without a configured feed, Orbit reports that updates are unavailable rather than pretending an update check succeeded.

### Important product boundaries

- Reminders are delivered while Orbit is running; there is no Windows background service in this release.
- Workflows are restricted to HTTPS navigation, Notepad/Calculator launches, and clipboard writes. No arbitrary scripts or model-generated shell commands run.
- Workspace snapshots restore the project folder and selected allowed apps/links; they do not capture every open app's unsaved state or browser tab session.
- Third-party dynamic extension loading and an extension sandbox remain future work; the SDK guide documents the existing command-pack contract.
