# Orbit v2.7.1 — Local Voice Transcription Reliability Fix

## Fixed
- Passes the resampled 16 kHz waveform in the input format documented for Transformers.js v2, instead of a Python-style audio dictionary.
- Switches from the English-only Whisper checkpoint to multilingual Whisper tiny for better language coverage.
- Measures recorded signal level, reports silence/near-silence with diagnostics, and safely boosts very quiet recordings before inference.
- Updates the visible app version to 2.7.1.
- Replaced Electron's unreliable `SpeechRecognition` path with microphone recording plus local Whisper transcription.
- Added explicit Electron audio permission handlers scoped to Orbit's own window.
- Voice button now starts/stops recording and shows model-loading/transcription status.
- Added specific errors for denied microphone permission, missing microphone, too-short recordings, model download failures, and empty transcription.
- Recognized text is placed in the command field for user review; it is not automatically executed.

## First-use behavior
The `Xenova/whisper-tiny` model downloads from Hugging Face on first use. This requires internet access for the initial download. After the model is cached, transcription runs locally; audio is not sent to a remote speech-recognition service. Model download may be blocked by web filtering or network policy.

## Verification
Source-level edits completed. Build/runtime validation must be performed with `npm install`, `npm run build`, and `npm run desktop` on the target Windows machine. Do not treat this note as a claim that runtime transcription has already been tested on that machine.
