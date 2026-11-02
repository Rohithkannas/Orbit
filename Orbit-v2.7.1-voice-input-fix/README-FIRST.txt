ORBIT v2.7.1 — local voice transcription fix

Extract this ZIP into a new folder. Open PowerShell in the folder containing package.json, then run:
  npm install
  npm run build
  npm run desktop

Voice input no longer relies on the browser SpeechRecognition service that commonly fails in Electron. Click Voice to start recording, speak, then click Stop & transcribe. Whisper tiny.en transcribes on-device after its model is downloaded on first use. The model download requires internet access once; subsequent inference is local and does not send recorded audio to a speech-recognition service. Orbit explicitly grants audio capture only to its own Electron window. Voice results are inserted into the command field for review and are not automatically executed. Existing launcher, focus analytics, quick capture, task planning, AI chat, project tools, and settings are retained.

Security notes: project retrieval is limited to the folder you explicitly choose, skips common dependency/build folders and sensitive filename patterns, and reads text-like files only. Approved actions are a fixed allowlist, require a confirmation dialog, and run in the selected project folder. Clipboard history is captured only when you press Capture clipboard and is stored locally in app storage.

Build verification status is documented separately; do not assume this ZIP was tested on your specific Windows machine.

Voice model note: first use downloads the Whisper tiny.en model from Hugging Face. If K7 Web Protection blocks model downloads, Orbit will show a model-download error. The microphone recording and transcription are separate steps so failures can be diagnosed accurately.
