ORBIT v1.9.0 - PROMPT LIBRARY + SEARCHABLE HISTORY

IMPORTANT: This is the project source, not a prebuilt installer.

START CLEANLY ON WINDOWS
1. Close every old Orbit window.
2. Close old Orbit terminal windows/dev servers (especially old Vite servers).
3. Extract this ZIP into a NEW folder, for example C:\Orbit-v1.9.0.
4. Confirm package.json is directly inside that folder. Do not run an older folder.
5. Double-click RUN-ORBIT-WINDOWS.bat.
6. Keep the terminal open while using Orbit.

The window should show v1.9.0. If it shows v0.1.0, you launched an old copy or old process.

AI ASSISTANT
- Install/start Ollama and pull a model, e.g. `ollama pull qwen3:8b`.
- In Orbit Settings -> AI Assistant, use http://localhost:11434 and qwen3:8b.
- Test the connection, then search for AI / Orbit AI.
- Conversation history is stored locally in this app's browser storage.
- File-grounded prompts can search and read supported text/source files within configured roots.
- AI answers can be saved as drafts after you review and click Save answer as file.

INCLUDED FEATURES
- Command launcher and recent commands
- Google, GitHub, calculator, Windows Calculator, Notepad
- Local file search
- Settings, global shortcut, launch at sign-in, custom HTTPS commands
- Extension/command pack architecture
- Orbit AI with Ollama or OpenAI-compatible endpoint
- Conversation history, AI connection test, save-answer-as-draft
- Bounded file retrieval for file-grounded prompts

TECH STACK
Electron, React, TypeScript, Vite, Node.js, Ollama/OpenAI-compatible chat API.

If setup fails, send the complete terminal error. Do not copy individual files into an older Orbit folder.


NEW IN v1.5.0
- Rich Markdown rendering for AI answers: headings, lists, bold, inline code, links, quotes, and tables.
- Code blocks with lightweight syntax highlighting and a Copy code action.
- Copy answer action and expanded AI response area.
- Existing local Ollama, chat history, file retrieval, settings, launcher and save-answer workflow retained.


NEW IN v1.6.0 — FAST AI INFERENCE
- Short factual questions use a small response-token budget to avoid slow, overlong answers.
- Complex/code/file requests retain a larger response budget.
- Shortened conversation context reduces prompt processing time on local models.
- Ollama model keep-alive is 30 minutes to reduce repeated model reloads.
- Qwen3 thinking is disabled in the Ollama request.

IMPORTANT PERFORMANCE LIMIT
Local inference speed depends on model size, RAM/VRAM, GPU support, and Ollama configuration. These changes reduce avoidable latency but cannot make a local 8B model as fast or as capable as a hosted frontier model on every machine. For consistently fast, high-quality answers, configure a reliable hosted API in AI Settings.

NEW IN v1.7.0 — STREAMING AI
- AI output is rendered progressively as tokens arrive instead of waiting for the full answer.
- Stop button cancels an in-progress request.
- Supports Ollama streaming responses and OpenAI-compatible SSE streaming.
- Conversation history is saved after a completed response.


NEW IN v1.8.0 — AI RESPONSE CONTROL + EXPORT
- Choose Quick, Balanced, or Deep response mode in the AI panel. The selected mode is saved locally and controls answer style and response-token budget.
- Export the saved conversation as a Markdown file using Export chat. The file is saved through Orbit’s existing draft-save flow to Documents\Orbit AI Drafts.
- Includes v1.7 streaming and Stop support.



NEW IN v1.9.0 — PROMPT LIBRARY + SEARCHABLE HISTORY
- Four reusable starter templates: explain a concept, review code, summarize text, and debug an error. Selecting a template fills the prompt field; it does not send anything automatically.
- Search past user prompts from saved AI history and load a prior prompt into the input to edit or run again.
- Prior history remains local in this app's browser storage. This is prompt retrieval, not a separate multi-conversation database.
