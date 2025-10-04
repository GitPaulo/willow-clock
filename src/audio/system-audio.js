let isAudioActive = false;
let onAudioChangeCallback = null;
export async function initSystemAudio(callback) {
  onAudioChangeCallback = callback;

  if (!window.audioAPI) {
    console.log(
      "[SystemAudio] ERROR: AudioAPI not available - preload script failed",
    );
    console.log("[SystemAudio] Using T key for testing instead");
    return false;
  }
  window.audioAPI.onAudioStateChanged((audioActive) => {
    isAudioActive = audioActive;
    if (onAudioChangeCallback) {
      onAudioChangeCallback(audioActive);
    }
  });

  const success = await window.audioAPI.startAudio();

  if (success) {
    console.log("[SystemAudio] System audio detection active");
  } else {
    console.log(
      "[SystemAudio] System audio not available - using T key for testing",
    );
  }

  return success;
}

// Manual toggle for testing
export function toggleSystemAudio() {
  if (window.audioAPI) {
    window.audioAPI.toggleAudio();
    return !isAudioActive; // Optimistic update
  } else {
    // Fallback - directly update state
    isAudioActive = !isAudioActive;
    if (onAudioChangeCallback) {
      onAudioChangeCallback(isAudioActive);
    }
    return isAudioActive;
  }
}

// Get current state
export function getSystemAudioState() {
  return isAudioActive;
}

// Cleanup
export function stopSystemAudio() {
  if (window.audioAPI) {
    window.audioAPI.stopAudio();
  }
}
