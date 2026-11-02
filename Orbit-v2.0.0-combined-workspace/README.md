# Orbit v2.0.0

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
