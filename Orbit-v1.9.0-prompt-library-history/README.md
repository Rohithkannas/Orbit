# Orbit v1.3 — AI Actions

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


## v1.2 AI conversation improvements

- Sends recent user/assistant turns to the configured model for multi-turn context.
- Saves conversation history locally and restores it when Orbit is reopened. Use **New chat** to clear the saved conversation.
- Ollama requests disable Qwen3 thinking mode, keep the model warm for 10 minutes, and use bounded context/output settings to improve latency.
- AI system instructions explicitly support follow-up questions and complete code answers.

For best speed, keep Ollama running and use a model that fits available RAM/VRAM. First inference can still be slower while the model loads.

## v1.3 AI Actions

- **Read local text/source files for summaries:** prompts such as “Find my README and summarize it” trigger a bounded search and read of a matching text/source file. Supported formats include Markdown, text, JSON, JavaScript/TypeScript, Python, Java, CSS, HTML, YAML, TOML, SQL, and logs. Files larger than 120 KB are rejected; at most 50 KB of content is passed to the model.
- **Save AI answers as drafts:** review the generated answer and filename in the AI panel, then explicitly click **Save answer as file**. Orbit writes into `Documents\Orbit AI Drafts`; existing filenames are preserved and a timestamped name is used for the new draft.
- **Security boundaries:** Orbit does not execute shell commands or model-generated code. File reads are restricted to Orbit's configured searchable roots and approved text extensions. Draft creation requires a direct user click.

Example prompts:
- `Find my README.md and summarize the setup instructions.`
- `Read README.md and explain the architecture.`
- `Write a Java binary search implementation with tests.` Then review the answer, name it `binary-search.md`, and click **Save answer as file**.

The local file search is best-effort and bounded; when multiple matching files exist, it chooses the first matching readable result. Verify the displayed source path before relying on a summary.


## v1.4 AI reliability improvements

- File-grounded requests search multiple candidate names, deduplicate results, rank likely matches, and attempt to read several supported candidates rather than trusting the first search result.
- If Orbit cannot retrieve a readable file, it stops and reports the limitation instead of sending an ungrounded summary request to the model.
- Retrieved file answers display the exact source path. The model is instructed to base file-specific claims on the retrieved content and treat file contents as untrusted data.
- This is still a local-model assistant, not a guarantee of perfect answers. Model quality, available context, filesystem permissions, and hardware determine capability and latency.


## v1.5 Rich AI responses
- Renders common Markdown structures safely as React elements (without injecting model output as HTML).
- Code blocks include a language label, lightweight token coloring, and a Copy code action.
- Added Copy answer alongside Save answer as file.
- Existing project features are retained.


## v1.6.0 — Fast AI responses
- Concise default behavior for simple factual questions.
- Adaptive token budgets: smaller for general questions, larger for coding and complex requests.
- Shorter retained conversation context to reduce local inference latency.
- Ollama keep-alive increased to reduce cold-start model reloads.
- Ollama thinking disabled in request payload.

Performance still depends on local hardware and model. For ChatGPT-like speed and reliability, use a reputable hosted model API in AI Settings; a local 8B model cannot be guaranteed to match a hosted frontier model.


## v1.7.0 — Streaming AI + Stop
- AI answers stream progressively through Electron IPC for Ollama NDJSON and OpenAI-compatible SSE responses.
- A Stop action aborts the active request.
- Completed responses continue to be saved to local conversation history; the existing rich Markdown renderer updates as text arrives.
- Streaming improves perceived responsiveness; actual token generation speed remains dependent on model and hardware.


## v1.8.0 — AI response modes and chat export

- **Quick / Balanced / Deep** response modes let you choose concise answers or more thorough structured output. The selection persists in local app storage.
- **Export chat** saves the completed conversation history as a Markdown transcript through the existing Orbit draft-save flow.
- Retains streaming output and cancellation from v1.7.


## v1.9.0 — Prompt templates and searchable prompt history

- Added four one-click prompt starters for concept explanations, code reviews, text summaries, and debugging. Templates fill the input only; Orbit never sends them without an explicit user action.
- Added a searchable list of previous user prompts from the locally saved AI history. Selecting one loads it into the input for editing or reuse.
- This feature searches the current saved message history; it does not claim to provide a multi-chat archive or semantic search.
