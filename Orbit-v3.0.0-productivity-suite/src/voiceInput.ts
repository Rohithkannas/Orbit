import { pipeline, env } from "@xenova/transformers";

type SpeechResult = { text?: string };
type SpeechPipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<SpeechResult>;

// SpeechRecognition relies on browser-vendor services that are not reliably
// available in Electron. Whisper runs locally after its model is downloaded.
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriberPromise: Promise<SpeechPipeline> | null = null;

async function getTranscriber(): Promise<SpeechPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny") as unknown as Promise<SpeechPipeline>;
    transcriberPromise = transcriberPromise.catch((error) => {
      transcriberPromise = null;
      throw error;
    });
  }
  return transcriberPromise;
}

async function convertToMono16k(blob: Blob): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(bytes);
    const mono = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      const samples = decoded.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) mono[i] += samples[i] / decoded.numberOfChannels;
    }
    const outputLength = Math.max(1, Math.floor(mono.length * 16000 / decoded.sampleRate));
    const output = new Float32Array(outputLength);
    const ratio = decoded.sampleRate / 16000;
    for (let i = 0; i < outputLength; i++) {
      const sourcePosition = i * ratio;
      const left = Math.floor(sourcePosition);
      const right = Math.min(left + 1, mono.length - 1);
      const fraction = sourcePosition - left;
      output[i] = mono[left] * (1 - fraction) + mono[right] * fraction;
    }
    return output;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function transcribeLocalAudio(blob: Blob, onStatus: (message: string) => void): Promise<string> {
  if (!blob.size) throw new Error("No audio was recorded. Click Voice, speak, then click Stop.");
  onStatus("Preparing audio…");
  const audio = await convertToMono16k(blob);
  if (audio.length < 1600) throw new Error("The recording was too short. Hold Voice for a moment while speaking.");
  onStatus("Loading local speech model (first use downloads it once)…");
  const transcriber = await getTranscriber();
  // Transformers.js v2 expects a Float32Array waveform at the model's native
  // 16 kHz rate. Passing a Python-style { raw, sampling_rate } dictionary is
  // not part of the v2 browser pipeline input contract and can yield empty output.
  // Measure the waveform before inference so a silent/incorrect input is reported
  // as such instead of blaming microphone distance.
  let peak = 0;
  let sumSquares = 0;
  for (let i = 0; i < audio.length; i++) {
    const sample = audio[i];
    const absolute = Math.abs(sample);
    if (absolute > peak) peak = absolute;
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / audio.length);
  const durationSeconds = audio.length / 16000;
  if (peak < 0.002 || rms < 0.0005) {
    throw new Error(`The recording contains almost no audible signal (peak ${peak.toFixed(4)}, RMS ${rms.toFixed(4)}, ${durationSeconds.toFixed(1)}s). Check Orbit's selected microphone and make sure the input meter moves while recording.`);
  }
  // Bring quiet laptop microphones to a reasonable level without clipping.
  if (rms < 0.035) {
    const gain = Math.min(12, 0.08 / Math.max(rms, 0.0001));
    const scaledPeak = peak * gain;
    const safeGain = scaledPeak > 0.98 ? 0.98 / peak : gain;
    for (let i = 0; i < audio.length; i++) audio[i] *= safeGain;
  }
  onStatus(`Transcribing locally (${durationSeconds.toFixed(1)}s audio)…`);
  const result = await transcriber(audio, { chunk_length_s: 20, stride_length_s: 3 });
  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (!text) throw new Error(`The model returned no text for ${durationSeconds.toFixed(1)}s of audio (peak ${peak.toFixed(4)}, RMS ${rms.toFixed(4)}). Try a longer sentence or check the selected input device.`);
  return text;
}
