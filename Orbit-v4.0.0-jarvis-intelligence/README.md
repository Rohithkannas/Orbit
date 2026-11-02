# Orbit v4.0.0 — JARVIS Intelligence Release

Orbit is a keyboard-first Windows desktop command center built with Electron, React, and TypeScript. v4.0.0 adds a JARVIS-style Intelligence Console to the existing v3.1.0 productivity suite.

## Run on Windows

```powershell
npm install
npm run build
npm run desktop
```

Use **✦ JARVIS** in the top bar to open the new Intelligence Console.

## Included in v4.0.0

- Task planning through the configured AI provider.
- Selected-project lexical retrieval with visible file paths and excerpts.
- Fixed, allowlisted project tools with confirmation before execution.
- Explicit local memories and searchable execution history.
- Model/provider presets for Ollama, OpenRouter, Gemini OpenAI-compatible API, Groq OpenAI-compatible API, and custom OpenAI-compatible endpoints.
- Slash commands: `/help`, `/model`, `/models`, `/provider`, `/memory search`, `/memory save`, `/memory forget`, `/index`, `/task status`, and `/workflow list`.
- Existing Orbit launcher, productivity hub, focus analytics, browser tracker, voice input, notes, project tools, workflows, and extension packs retained.

## Model configuration

The provider manager uses Orbit's existing OpenAI Chat Completions-compatible client. Select a provider preset, enter a valid model ID, enter an API key when required, test the connection, and save. Hosted model free tiers and available model IDs vary over time. Do not send confidential project context to a hosted provider unless permitted by your data policy.

## Safety boundaries and limitations

- Generated plans are proposals; they do not execute automatically.
- The Intelligence Console runs only project search and the existing allowlisted Git status, Git diff summary, recent commits, and npm build actions. Arbitrary shell execution and AI-generated file edits are not supported.
- Retrieval is on-demand lexical search, not vector search or a background index. Memory is explicitly saved local notes/findings, not automatic memory consolidation.
- General-purpose screen clicking and unrestricted cross-app computer use are not implemented.
- API keys are stored in Orbit's existing local settings storage, not a new OS keychain integration.
- See `RELEASE-NOTES-v4.0.0.md` for full scope and verification status.
