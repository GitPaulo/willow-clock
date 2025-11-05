// Text sound utility using Web Audio API
let audioCtx = null;
let isInitialized = false;
let clickBuffer = null;
let softClickBuffer = null;

// Create a pre-built click sound buffer
function createClickBuffer(frequency, duration, volume, waveType = "square") {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.ceil(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate waveform with exponential decay envelope
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t / (duration / 3)); // Exponential decay
    const phase = (2 * Math.PI * frequency * t) % (2 * Math.PI);

    let sample;
    if (waveType === "square") {
      sample = phase < Math.PI ? 1 : -1;
    } else {
      // sine wave
      sample = Math.sin(phase);
    }

    data[i] = sample * envelope * volume;
  }

  return buffer;
}

// Initialize the audio context for text sounds
// Must be called after a user gesture due to browser autoplay policy
export function initTextSound() {
  if (isInitialized) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Pre-build click buffers with slight frequency variation
    // We'll add randomness when playing by selecting from variations
    clickBuffer = createClickBuffer(280, 0.05, 0.12, "square");
    softClickBuffer = createClickBuffer(450, 0.03, 0.08, "sine");

    isInitialized = true;
    console.log("[TextAudio] AudioContext initialized with pre-built buffers");
  } catch (error) {
    console.warn("[TextAudio] Failed to initialize AudioContext:", error);
  }
}

// Play a beep sound
function playBeep(buffer) {
  if (!audioCtx || !isInitialized || !buffer) return;

  try {
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();

    source.buffer = buffer;
    source.playbackRate.value = 0.95 + Math.random() * 0.1;
    gain.gain.value = 0.9 + Math.random() * 0.2;

    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(audioCtx.currentTime);
  } catch (error) {
    console.warn("[TextAudio] Error playing beep:", error);
  }
}

// Play a short beep sound for text typing effect
export function playTextBeep() {
  playBeep(clickBuffer);
}

// Play a softer, more digital RPG-style beep
export function playTextBeepSoft() {
  playBeep(softClickBuffer);
}

// Schedule a sequence of beeps for typewriter effect
// Uses AudioContext timeline scheduling to avoid drift
export function scheduleTypewriterBeeps(count, intervalMs) {
  if (!audioCtx || !isInitialized) return { stop: () => {} };

  const intervalSec = intervalMs / 1000;
  const startTime = audioCtx.currentTime + 0.01;
  const sources = [];

  for (let i = 0; i < count; i++) {
    try {
      const source = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();

      source.buffer = softClickBuffer;
      source.playbackRate.value = 0.95 + Math.random() * 0.1;
      gain.gain.value = 0.9 + Math.random() * 0.2;

      source.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(startTime + i * intervalSec);
      sources.push(source);
    } catch (error) {
      console.warn("[TextAudio] Error scheduling beep:", error);
    }
  }

  return {
    stop: () => {
      sources.forEach((source) => {
        try {
          source.stop();
          source.disconnect();
        } catch {
          // Already stopped
        }
      });
    },
  };
}

// Check if text audio is ready to use
export function isTextAudioReady() {
  return isInitialized && audioCtx && audioCtx.state === "running";
}

// Get audio context state for debugging
export function getAudioState() {
  return {
    initialized: isInitialized,
    contextState: audioCtx ? audioCtx.state : "null",
    ready: isTextAudioReady(),
  };
}
