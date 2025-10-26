import {
  triggerPet,
  setMusicActive,
  exitTemporaryState,
} from "../render/state-machine.js";
import {
  playTextBeep,
  initTextSound,
  getAudioState,
} from "../audio/text-audio.js";

export function setupTestFunctions() {
  window.testPet = () => triggerPet();
  window.exitPetState = exitTemporaryState;

  window.testMusic = () => {
    console.log(`[App] Testing music - forcing music state to true`);
    setMusicActive(true);
  };

  window.testSpeech = (text) => {
    if (window.speechBox && window.startTypewriter) {
      window.startTypewriter(
        window.speechBox,
        text || "Hello! This is a test message with typewriter animation.",
      );
    }
  };

  window.testSpeechCategory = (category) => {
    if (window.speechBox && window.startTypewriter && window.getRandomSpeech) {
      const message =
        window.getRandomSpeech(category) ||
        `No messages for category: ${category}`;
      window.startTypewriter(window.speechBox, message);
    }
  };

  window.testTextBeep = () => {
    initTextSound(); // Ensure audio is initialized
    playTextBeep();
  };

  window.testAudioStatus = async () => {
    console.log("[App] TextAudio Status:", getAudioState());
    return getAudioState();
  };

  window.testWeatherChange = (condition) => {
    console.log(`[App] Testing weather change to: ${condition}`);
    if (condition && window.triggerWeatherSpeech) {
      window.triggerWeatherSpeech(condition);
    } else {
      console.log(
        "[App] Available weather conditions:",
        "Clear, MostlyClear, PartlyCloudy, Overcast, Fog, Rain, Snow, Thunderstorm, etc.",
      );
    }
  };

  window.testAudioDetection = async () => {
    console.log("[Test] Testing audio detection system...");
    console.log(
      "[Test] AudioAPI available:",
      typeof window.audioAPI !== "undefined",
    );
    if (typeof window.audioAPI !== "undefined") {
      try {
        await window.audioAPI.startAudio();
        console.log("[Test] Audio detection started successfully");
        console.log(
          "[Test] Listening for music status changes (play some music to test)...",
        );
      } catch (error) {
        console.error("[Test] Failed to start audio detection:", error);
      }
    } else {
      console.warn("[Test] audioAPI not available - running in browser mode");
    }
  };

  console.log(
    "[App] Test functions available: testPet(), testMusic(), testSpeech('message'), testTextBeep(), testAudioStatus(), testWeatherChange('condition'), testAudioDetection()",
  );
}
