import { initSystemAudio, toggleSystemAudio } from "./audio/system-audio.js";
import {
  initializeState,
  updateBaseStateFromTime,
  setMusicActive,
  triggerPet,
} from "./state-machine.js";

export async function setupAudioDetection() {
  const success = await initSystemAudio(setMusicActive);

  if (!success) {
    console.log("❌ Audio unavailable - press T to test");
    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "t") toggleSystemAudio();
    });
  }
}

function updateClock() {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  document.getElementById("clock").textContent = time;

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  document.getElementById("date").textContent = date;
}

export function handleClick() {
  triggerPet();
}

export function setupTestFunctions() {
  window.testPet = triggerPet;
  window.testMusic = toggleSystemAudio;
  console.log("🧪 testPet() | testMusic() | T key");
}

export function initializeApp() {
  initializeState();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateBaseStateFromTime, 60000);
}
