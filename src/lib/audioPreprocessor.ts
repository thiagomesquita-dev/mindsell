/**
 * Audio Preprocessor for CobraMind
 * 
 * Uses Web Audio API to:
 * - Decode any audio format to raw PCM
 * - Downmix stereo → mono
 * - Resample to 16kHz
 * - Apply light volume normalization
 * - ALWAYS preserve the first 3-5 seconds (no aggressive VAD)
 * - Generate debug metadata
 */

export interface AudioDebugInfo {
  originalDurationSec: number;
  originalSampleRate: number;
  originalChannels: number;
  rmsInitial: number;        // RMS of first 3 seconds
  rmsOverall: number;        // RMS of entire file
  peakAmplitude: number;
  outputSampleRate: number;
  outputDurationSec: number;
  outputSizeBytes: number;
  preprocessedAt: string;    // ISO timestamp
}

export interface PreprocessedAudio {
  blob: Blob;
  debugInfo: AudioDebugInfo;
}

const TARGET_SAMPLE_RATE = 16000;
const PRESERVE_SECONDS = 5; // Always preserve first N seconds

/**
 * Calculate RMS (Root Mean Square) of an audio segment
 */
function calculateRMS(samples: Float32Array, start = 0, end?: number): number {
  const e = end ?? samples.length;
  if (e <= start) return 0;
  let sum = 0;
  for (let i = start; i < e; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / (e - start));
}

/**
 * Calculate peak amplitude
 */
function calculatePeak(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
}

/**
 * Downmix multi-channel audio to mono by averaging channels
 */
function downmixToMono(buffer: AudioBuffer): Float32Array {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const mono = new Float32Array(length);

  if (numChannels === 1) {
    buffer.copyFromChannel(mono, 0);
    return mono;
  }

  // Average all channels
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] / numChannels;
    }
  }

  return mono;
}

/**
 * Apply light normalization: target peak at -3dB (0.707)
 * Does NOT remove silence. Preserves dynamics.
 */
function normalizeAudio(samples: Float32Array): Float32Array {
  const peak = calculatePeak(samples);
  if (peak === 0 || peak >= 0.7) return samples;

  const targetPeak = 0.707; // -3dB
  const gain = targetPeak / peak;
  // Cap gain to avoid amplifying noise too much
  const safeGain = Math.min(gain, 4.0);

  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    normalized[i] = Math.max(-1, Math.min(1, samples[i] * safeGain));
  }
  return normalized;
}

/**
 * Resample from source rate to target rate using linear interpolation
 */
function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return samples;

  const ratio = fromRate / toRate;
  const newLength = Math.round(samples.length / ratio);
  const resampled = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, samples.length - 1);
    const frac = srcIndex - srcFloor;
    resampled[i] = samples[srcFloor] * (1 - frac) + samples[srcCeil] * frac;
  }

  return resampled;
}

/**
 * Encode Float32Array PCM samples as WAV (16-bit PCM mono)
 */
function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bitsPerSample = 16;
  const numChannels = 1;
  const dataLength = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);              // subchunk1 size
  view.setUint16(20, 1, true);               // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Main preprocessing function.
 * Takes an audio File (MP3 or other format) and returns:
 * - WAV blob (mono, 16kHz, normalized)
 * - Debug metadata
 */
export async function preprocessAudio(file: File): Promise<PreprocessedAudio> {
  const preprocessedAt = new Date().toISOString();

  // Decode audio using Web Audio API
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }

  const originalDuration = decoded.duration;
  const originalSampleRate = decoded.sampleRate;
  const originalChannels = decoded.numberOfChannels;

  // Step 1: Downmix to mono
  const mono = downmixToMono(decoded);

  // Step 2: Calculate RMS of first PRESERVE_SECONDS
  const preserveSamples = Math.min(
    Math.round(PRESERVE_SECONDS * originalSampleRate),
    mono.length
  );
  const rmsInitial = calculateRMS(mono, 0, preserveSamples);
  const rmsOverall = calculateRMS(mono);
  const peakAmplitude = calculatePeak(mono);

  // Step 3: Light normalization (preserves all audio, just adjusts volume)
  const normalized = normalizeAudio(mono);

  // Step 4: Resample to 16kHz
  const resampled = resample(normalized, originalSampleRate, TARGET_SAMPLE_RATE);

  // Step 5: Encode as WAV
  const wavBuffer = encodeWAV(resampled, TARGET_SAMPLE_RATE);
  const blob = new Blob([wavBuffer], { type: "audio/wav" });

  const debugInfo: AudioDebugInfo = {
    originalDurationSec: Math.round(originalDuration * 100) / 100,
    originalSampleRate,
    originalChannels,
    rmsInitial: Math.round(rmsInitial * 10000) / 10000,
    rmsOverall: Math.round(rmsOverall * 10000) / 10000,
    peakAmplitude: Math.round(peakAmplitude * 10000) / 10000,
    outputSampleRate: TARGET_SAMPLE_RATE,
    outputDurationSec: Math.round((resampled.length / TARGET_SAMPLE_RATE) * 100) / 100,
    outputSizeBytes: wavBuffer.byteLength,
    preprocessedAt,
  };

  console.log("[AudioPreprocessor]", debugInfo);

  return { blob, debugInfo };
}
