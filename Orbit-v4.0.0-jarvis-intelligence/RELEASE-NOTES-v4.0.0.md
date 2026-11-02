# Orbit v4.0.0 — JARVIS Intelligence Release

This release preserves the v3.1.0 productivity suite and adds an integrated Intelligence Console. It combines the initial scope of personal memory/retrieval, bounded desktop project tools, and model/provider management/workflow history in one release.

## New
- **Orbit Intelligence Console**: a dedicated JARVIS entry point with task planning, selected-project context, retrieved evidence, tool selection, explicit confirmation, and visible outputs.
- **Bounded project actions**: project search plus the existing allowlisted Git status, diff summary, recent commits, and npm build actions. No model-generated shell command is executed.
- **Local memory**: explicitly save model findings and notes, search them locally, and forget individual items. Stored in the current Orbit browser profile/local storage; not an embedding database.
- **Project retrieval**: on-demand lexical search using the existing project-search engine. Results are shown with relative paths and excerpts and passed as untrusted evidence to the model when planning.
- **Model provider presets**: Ollama, OpenRouter, Gemini's OpenAI-compatible endpoint, Groq's OpenAI-compatible endpoint, and a custom OpenAI-compatible endpoint. Users supply their own API keys and model IDs.
- **Slash commands**: `/help`, `/model`, `/models`, `/provider`, `/memory search`, `/memory save`, `/memory forget`, `/index`, `/task status`, and `/workflow list`.
- **Execution history**: locally persisted task goals, statuses, and tool output summaries.

## Safety boundaries
- Model-generated plans do not execute automatically.
- Project actions require a selected project folder and a confirmation dialog.
- Only fixed, allowlisted project actions are available in this console; arbitrary shell execution and model-generated file edits are not implemented.
- Provider credentials are stored using Orbit's existing local AI-settings mechanism. Treat the user profile as sensitive; this release does not add OS keychain encryption.
- File excerpts and saved memories are treated as untrusted context in planning prompts.

## Important limitations
- Retrieval is lexical/on-demand, not full background indexing, vector search, embedding retrieval, or reranking.
- Memory is explicit local note storage, not automatic long-term memory consolidation.
- Computer use is limited to the existing Orbit file/project APIs and approved commands. General screen clicking, broad Windows UI Automation, and arbitrary cross-app execution are not implemented in this release.
- Model routing uses the existing configured provider and existing optional specialist routing settings. The provider preset UI changes the primary provider; it does not automatically benchmark models or select a winner.
- The console asks for approval before its selected tool batch, but the current bounded batch runner does not support mid-run cancellation.
- Hosted provider free quotas, model IDs, and service terms may change. Configure a provider/model that supports the OpenAI Chat Completions API.

## Run
```powershell
npm install
npm run build
npm run desktop
```

## Verification
The source archive was inspected and updated. Electron main/preload syntax checks pass. A full TypeScript/Vite build could not be verified in the build environment because `npm install` timed out and the required Vite type packages were unavailable. Run `npm install` and `npm run build` on the Windows development machine; if the build fails, share the complete terminal output.
