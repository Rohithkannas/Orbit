ORBIT v4.0.0 — JARVIS INTELLIGENCE RELEASE

This builds on Orbit v3.1.0 and adds the Orbit Intelligence Console, local explicit memory, on-demand project retrieval, approved project tools, provider presets, slash commands, and execution history.

SETUP (Windows PowerShell)
1. Extract this ZIP to a new folder.
2. Open PowerShell in the folder containing package.json.
3. Run:
   npm install
   npm run build
   npm run desktop

Open the ✦ JARVIS button in Orbit's top bar.

FIRST RUN
- Choose a project folder if you want project retrieval or project commands.
- Open Model providers and select Ollama, OpenRouter, Gemini, Groq, or a custom OpenAI-compatible endpoint.
- Enter a valid model ID and API key if required. Hosted providers need your own account/key; free quotas and availability vary.
- Type a goal and select Plan task. Planning does not execute actions.
- Select only the project tools you want and choose Review & run selected tools. Orbit asks for confirmation before running the fixed allowlisted actions.
- Save useful answers to local memory. Use /help for the command list.

SUPPORTED COMMANDS
/help
/model
/models
/provider
/memory search <query>
/memory save <title> | <content>
/memory forget <id>
/index <query>
/task status
/workflow list

SAFETY AND LIMITATIONS
- No arbitrary model-generated shell commands run from the Intelligence Console.
- Current project actions are project search, git status, git diff summary, recent git commits, and npm run build.
- Retrieval is on-demand lexical search, not vector RAG or full background indexing.
- Memory is explicit local notes/findings, not automatic memory consolidation.
- General-purpose screen clicking and arbitrary cross-app computer use are not implemented.
- API keys use Orbit's existing local settings storage; protect your Windows user profile and do not share configuration files.
- Existing v3.1.0 features are retained.

Windows installer (requires dependencies and internet access):
  npm run dist:win

VERIFICATION
Electron main/preload syntax checks pass. Full TypeScript/Vite build and Windows installer were not verified here because npm install timed out in the build environment. Run npm install and npm run build on your Windows machine.
