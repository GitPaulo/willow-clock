// Text sound utility using Web Audio API
// Provides typewriter-style sound effects for character-by-character text display

let audioCtx = null;
let isInitialized = false;

/**
 * Initialize the audio context for text sounds
 * Must be called after a user gesture (click, etc.) due to browser autoplay policy
 */
export function initTextSound() {
  if (isInitialized) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    isInitialized = true;
    console.log("[TextAudio] AudioContext initialized");
  } catch (error) {
    console.warn("[TextAudio] Failed to initialize AudioContext:", error);
  }
}

/**
 * Play a short beep sound for text typing effect
 * Includes slight frequency variation to avoid monotony
 */
export function playTextBeep() {
  if (!audioCtx || !isInitialized) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Small frequency variation (250-310 Hz) to avoid monotony
    osc.frequency.value = 250 + Math.random() * 60;
    osc.type = "square";

    // Very short blip with exponential decay
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    // Connect and play
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (error) {
    console.warn("[TextAudio] Error playing text beep:", error);
  }
}

/**
 * Play a softer, more digital RPG-style beep
 * Alternative sound for different contexts
 */
export function playTextBeepSoft() {
  if (!audioCtx || !isInitialized) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Higher frequency range for softer sound
    osc.frequency.value = 400 + Math.random() * 100;
    osc.type = "sine";

    // Softer volume and quicker decay
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (error) {
    console.warn("[TextAudio] Error playing soft text beep:", error);
  }
}

/**
 * Check if text audio is ready to use
 */
export function isTextAudioReady() {
  return isInitialized && audioCtx && audioCtx.state === "running";
}

/**
 * Get audio context state for debugging
 */
export function getAudioState() {
  return {
    initialized: isInitialized,
    contextState: audioCtx ? audioCtx.state : "null",
    ready: isTextAudioReady(),
  };
}
