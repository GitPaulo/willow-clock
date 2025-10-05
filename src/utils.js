import { initSystemAudio } from "./audio/system-audio.js";
import {
  initializeState,
  updateBaseStateFromTime,
  setMusicActive,
  triggerPet,
} from "./state-machine.js";

export async function setupAudioDetection() {
  await initSystemAudio(setMusicActive);

  if (!window.audioAPI) {
    console.log("[Utils] Audio API unavailable - press T key to test");
    return;
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
  window.testPet = () => triggerPet();
  window.testMusic = () => setMusicActive(true);
  console.log(
    "[Utils] Test functions available: testPet(), testMusic(), T key for audio toggle",
  );
}

export function initializeApp() {
  initializeState();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateBaseStateFromTime, 60000);
}

// Mode enum
export const MODE = {
  CLOCK: "clock-mode",
  STOPWATCH: "stopwatch",
  TIMER: "timer",
  FOCUS: "focus",
};
export const MODES = Object.values(MODE);

export function getElements(ids) {
  return ids.reduce(
    (acc, id) => ({ ...acc, [id]: document.getElementById(id) }),
    {},
  );
}

export function toggleHoverStates(elements, action) {
  const method = action === "add" ? "add" : "remove";
  elements.forEach((el) => el?.classList[method]("hover"));
}

export function fadeVolume(audioElement, targetVolume, duration = 250) {
  if (!audioElement) return;

  audioElement.volume = 0;
  const steps = 25;
  const volumeStep = targetVolume / steps;
  const timeStep = duration / steps;

  let currentStep = 0;
  const fadeInterval = setInterval(() => {
    if (currentStep >= steps) {
      clearInterval(fadeInterval);
      audioElement.volume = targetVolume;
      return;
    }
    audioElement.volume = volumeStep * currentStep++;
  }, timeStep);
}

export function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
