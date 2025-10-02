import { initSystemAudio, toggleSystemAudio } from "./audio/system-audio.js";

export const animationState = {
  isAnimating: false,
  audioActive: false,
  isDaytime: true,
  clickEffect: false,
};

export async function setupAudioDetection() {
  console.log("Setting up system audio detection...");
  const success = await initSystemAudio((audioActive) => {
    console.log("System audio:", audioActive ? "playing" : "stopped");
    animationState.audioActive = audioActive;
  });

  if (success) {
    console.log("✅ System audio detection active");
  } else {
    console.log("❌ System audio not available - using T key for testing");
    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "t") {
        const newState = toggleSystemAudio();
        console.log("Manual audio toggle:", newState);
      }
    });
  }
  return success;
}

export function getCurrentTime() {
  const now = new Date();
  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
  };
}

export function formatTime(hours, minutes, seconds) {
  const h = hours.toString().padStart(2, "0");
  const m = minutes.toString().padStart(2, "0");
  const s = seconds.toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function updateClock() {
  const time = getCurrentTime();
  const timeString = formatTime(time.hours, time.minutes, time.seconds);
  document.getElementById("clock").textContent = timeString;

  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const dateString = now.toLocaleDateString("en-US", options);
  document.getElementById("date").textContent = dateString;
}

export function updateDayNightCycle() {
  const hours = new Date().getHours();
  const wasDaytime = animationState.isDaytime;
  animationState.isDaytime = hours >= 6 && hours < 18;

  if (wasDaytime !== animationState.isDaytime) {
    console.log("Day/Night cycle:", animationState.isDaytime ? "Day" : "Night");
  }
}

export function triggerClickEffect() {
  console.log("Star clicked!");
  animationState.clickEffect = true;
  setTimeout(() => {
    animationState.clickEffect = false;
  }, 300);
}

export function getAnimationConfig() {
  if (animationState.clickEffect) {
    return {
      speed: 0.08,
      color: 0x00ff88,
      bgColor: 0x253330,
      state: "click",
    };
  }

  if (animationState.audioActive) {
    return {
      speed: 0.04,
      color: 0xff6b6b,
      bgColor: 0x332828,
      state: "audio",
    };
  }

  if (!animationState.isDaytime) {
    return {
      speed: 0.008,
      color: 0x9370db,
      bgColor: 0x1f1f2a,
      state: "night",
    };
  }

  return {
    speed: 0.015,
    color: 0xffd700,
    bgColor: 0x2a2a3a,
    state: "day",
  };
}

export function setupTestFunctions() {
  window.testClick = () => triggerClickEffect();
  window.testAudio = () => toggleSystemAudio();
  window.showState = () => console.log("Animation state:", animationState);

  console.log("🧪 Test functions: testClick(), testAudio(), showState()");
  console.log("⌨️  T key = toggle audio for testing");
}
