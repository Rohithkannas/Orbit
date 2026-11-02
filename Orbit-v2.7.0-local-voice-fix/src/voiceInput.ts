import { pipeline, env } from "@xenova/transformers";

type SpeechResult = { text?: string };
type SpeechPipeline = (audio: { raw: Float32Array; sampling_rate: number }, options?: Record<string, unknown>) => Promise<SpeechResult>;

// SpeechRecognition relies on browser-vendor services that are not reliably
// available in Electron. Whisper runs locally after its model is downloaded.
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

let transcriberPromise: Promise<SpeechPipeline> | null = null;

async function getTranscriber(): Promise<SpeechPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en") as unknown as Promise<SpeechPipeline>;
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
  onStatus("Transcribing locally…");
  const result = await transcriber({ raw: audio, sampling_rate: 16000 }, { chunk_length_s: 20, stride_length_s: 3 });
  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (!text) throw new Error("No words were recognized. Try speaking closer to the microphone.");
  return text;
}
