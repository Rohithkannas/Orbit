# Orbit v2.6.0 — Voice & Capture

## New features
- **Voice input:** microphone control beside the command/search field uses the runtime's Web Speech API to transcribe a command into the field. The user reviews and submits the text; it does not execute spoken commands automatically. Requires microphone permission and Web Speech API support.
- **Quick Capture:** a top-bar Notes panel for saving short notes, reminders, links, and thoughts locally; notes can be loaded back into the command field or deleted.
- **Persistent focus-sprint counter:** completed focus sessions are counted and saved locally across app restarts.
- **Focus completion feedback:** Orbit reports when a sprint reaches zero.

## Privacy and limitations
- Notes and the sprint count use local browser storage for this Orbit profile.
- Voice transcription is handled by the browser/runtime's SpeechRecognition implementation; network behavior depends on the runtime/browser. Orbit does not claim offline speech recognition.
- Voice input only fills the command field. Press Enter or the relevant action to submit; no action is run solely because speech was recognized.
- Existing browser time analytics remain domain-level and do not track native Windows applications.
