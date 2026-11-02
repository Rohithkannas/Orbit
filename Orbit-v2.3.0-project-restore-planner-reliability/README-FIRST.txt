ORBIT v2.1.1 — task planning reliability fix

Extract this ZIP into a new folder. Open PowerShell in the folder containing package.json, then run:
  npm install
  npm run build
  npm run desktop

New: AI-assisted task planning, plan review before execution, sequential allowlisted project checks, real command output, and locally saved task-run history. Existing launcher, routing, named conversations, selected-project retrieval, approved actions, clipboard history, prompt templates, streaming, export, settings, and file search are retained.

Security notes: project retrieval is limited to the folder you explicitly choose, skips common dependency/build folders and sensitive filename patterns, and reads text-like files only. Approved actions are a fixed allowlist, require a confirmation dialog, and run in the selected project folder. Clipboard history is captured only when you press Capture clipboard and is stored locally in app storage.

Build verification status is documented separately; do not assume this ZIP was tested on your specific Windows machine.
