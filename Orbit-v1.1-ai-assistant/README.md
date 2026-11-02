# Orbit v1.1 — AI Assistant

Orbit is a Windows-first desktop command launcher built with Electron, React, TypeScript, and Vite. v1.1 adds an AI assistant that can connect to a local Ollama model or an OpenAI-compatible chat-completions endpoint.

## Features
- Fuzzy command search and recent commands
- Google and GitHub launchers
- Calculator, Windows Calculator, Notepad, and local file search
- Preferences, global shortcut, launch-at-sign-in, and custom HTTPS commands
- **Orbit AI**: ask questions, explain code, draft content, brainstorm, and summarize pasted text
- AI provider settings and connection test

## AI setup
1. Install and start [Ollama](https://ollama.com/) on your PC if you want local inference.
2. Pull a model, for example `ollama pull qwen3:8b`.
3. Open Orbit Settings → AI Assistant. Defaults are `http://localhost:11434` and `qwen3:8b`.
4. Click **Test AI connection**, then return to the launcher and search `AI` or `Orbit AI`.
5. Type a prompt and press Enter (Shift+Enter is reserved for a future multiline prompt editor; current input is single-line).

For an OpenAI-compatible provider, choose that provider and enter a base URL ending in `/v1`, a model name, and an API key if required. Remote providers must use HTTPS. Plain HTTP is accepted only for localhost.

## Privacy and security
- Local Ollama prompts are sent to the configured local provider.
- If you configure a remote provider, prompts and the supplied API key are sent to that provider.
- AI settings are stored in the app's local browser storage, including the API key. Use a trusted OS account and do not use this prototype for secrets or sensitive data.
- AI calls run in Electron's main process via a narrow preload bridge; renderer Node integration remains disabled. Requests time out after 90 seconds.
- AI output is informational. Orbit does not execute model-generated shell commands or perform computer-control actions.

## Run on Windows
Use Node.js 20.19+ or 22.12+ (newer supported versions should also work). Extract this ZIP so `package.json` is at the folder root, then run PowerShell in that folder:

```powershell
npm install
npm run build
if ($LASTEXITCODE -eq 0) { npm run desktop }
```

Dev server uses port `5176`. Close older Orbit dev servers first to avoid opening a stale instance.

## Limitations
This is a developer-run Electron project, not a signed installer. The UI currently accepts a single-line prompt; large pasted content is limited to 12,000 characters. The full build should be run on the target Windows machine after `npm install`.
