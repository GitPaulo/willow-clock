import { CursorTrail } from "./effects/cursor-trail.js";
import {
  MODE,
  MODES,
  getElements,
  toggleHoverStates,
  formatTime,
} from "./utils.js";
import {
  setMusicActive,
  triggerPet,
  initializeState,
  updateBaseStateFromTime,
} from "./state-machine.js";
import {
  playTextBeep,
  initTextSound,
  getAudioState,
} from "./audio/text-audio.js";
import { getCurrentWeather } from "./weather/weather.js";

let activeModeIndex = 0;
let stopwatchIntervalId = null;
let stopwatchElapsedTime = 0;
let timerIntervalId = null;
let timerRemainingTime = 0;
let focusIntervalId = null;
let focusElapsedTime = 0;
let cursorTrailInstance = null;
let backgroundMusic = null;
let isMuted = false;
let weatherData = null;
let lastWeatherUpdate = 0;
let previousWeatherCondition = null;

document.addEventListener("DOMContentLoaded", () => {
  setupLoadingScreen();
  setupModeSystem();
  setupStopwatch();
  setupTimer();
  setupFocus();
  setupCursorTrail();
  setupBackgroundMusic();
  setupAudioDetection();
  setupTestFunctions();
});

function setupLoadingScreen() {
  const loadingScreenElement = document.getElementById("loading-screen");
  const loadingTextElement = document.querySelector(".loading-text");
  if (!loadingScreenElement) return;

  console.log("[Loading] Screen setup started");

  // Initial text fade in
  if (loadingTextElement) {
    loadingTextElement.style.opacity = "0";
    setTimeout(() => {
      loadingTextElement.style.transition = "opacity 0.5s ease";
      loadingTextElement.style.opacity = "1";
    }, 100);
  }

  const DISPLAY_DURATION = 2500; // Show for 2.5s
  const FADE_DURATION = 600; // Slightly longer fade
  const FADE_STEPS = 30; // More steps for smoother fade
  const STEP_DELAY = FADE_DURATION / FADE_STEPS;

  setTimeout(() => {
    console.log("[Loading] Starting synchronized fade");

    // Start background music
    startBackgroundMusic();

    let currentOpacity = 1;
    const opacityStep = 1 / FADE_STEPS;

    const fadeInterval = setInterval(() => {
      currentOpacity -= opacityStep;

      if (currentOpacity <= 0) {
        console.log("[Loading] Fade complete, hiding screen");
        loadingScreenElement.style.opacity = "0";
        setTimeout(() => {
          loadingScreenElement.style.display = "none";
        }, 50); // Small delay to ensure opacity is fully applied
        clearInterval(fadeInterval);
      } else {
        // Fade both screen and text together
        loadingScreenElement.style.opacity = currentOpacity.toString();
        if (loadingTextElement) {
          loadingTextElement.style.opacity = currentOpacity.toString();
        }
      }
    }, STEP_DELAY);
  }, DISPLAY_DURATION);
}

async function startBackgroundMusic() {
  if (!backgroundMusic) return;

  try {
    // Set volume before playing to prevent crackling
    backgroundMusic.volume = 0.08;
    await backgroundMusic.play();
  } catch (error) {
    console.log("[App] Auto-play blocked:", error.message);
  }
}

function setupCursorTrail() {
  cursorTrailInstance = new CursorTrail();
  cursorTrailInstance.init();
  window.cursorTrail = cursorTrailInstance;
}

function setupBackgroundMusic() {
  const elements = getElements([
    "background-music",
    "audio-toggle",
    "volume-icon",
  ]);
  backgroundMusic = elements["background-music"];
  const { "audio-toggle": audioToggle, "volume-icon": volumeIcon } = elements;

  if (!backgroundMusic || !audioToggle || !volumeIcon) return;

  // Set audio properties to prevent crackling
  backgroundMusic.volume = 0.08;
  backgroundMusic.preload = "auto";

  // Additional audio optimizations
  try {
    // Set audio context sample rate if available (Electron/Chrome)
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      // Request optimal buffer size for smooth playback
      if (audioContext.sampleRate !== 44100) {
        console.log(
          `[Audio] Sample rate mismatch: ${audioContext.sampleRate}Hz vs 44100Hz`,
        );
      }
    }
  } catch (e) {
    console.log("[Audio] AudioContext optimization unavailable:", e.message);
  }

  backgroundMusic.addEventListener("error", (e) => {
    console.warn("[App] Audio loading error:", e.target.error);
  });

  audioToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    backgroundMusic.muted = isMuted;

    volumeIcon.className = isMuted ? "fas fa-volume-mute" : "fas fa-volume-up";
    audioToggle.title = `${isMuted ? "Unmute" : "Mute"} background music`;
  });
}

function setupModeSystem() {
  const elementIds = [
    "mode",
    "clock",
    "date",
    "weather",
    "stopwatch-time",
    "timer-input",
    "focus-title",
    "focus-time",
  ];
  const allElements = getElements(elementIds);
  const {
    mode: modeContainer,
    "timer-input": timerInputElement,
    ...hoverableElements
  } = allElements;

  if (!modeContainer) return;

  const hoverableTargets = Object.values(hoverableElements).filter(Boolean);
  const interactiveElements = [
    ...modeContainer.querySelectorAll("button"),
    ...modeContainer.querySelectorAll("input"),
    ...modeContainer.querySelectorAll(".mode-controls"),
  ];

  const allHoverTargets = [...hoverableTargets, timerInputElement];

  modeContainer.addEventListener("mouseenter", () => {
    toggleHoverStates(allHoverTargets, "add");
  });

  modeContainer.addEventListener("mouseleave", () => {
    toggleHoverStates(allHoverTargets, "remove");
  });

  interactiveElements.forEach((interactiveElement) => {
    interactiveElement.addEventListener("mouseenter", (event) => {
      event.stopPropagation();
      const shouldKeepTimerHover = event.target === timerInputElement;
      const elementsToUnhover = shouldKeepTimerHover
        ? hoverableTargets
        : allHoverTargets;
      toggleHoverStates(elementsToUnhover, "remove");
    });

    interactiveElement.addEventListener("mouseleave", () => {
      const isStillHoveringMode = modeContainer.matches(":hover");
      if (isStillHoveringMode) {
        toggleHoverStates(allHoverTargets, "add");
      }
    });
  });

  modeContainer.addEventListener("click", (event) => {
    const clickedOnInteractiveElement = hasInteractiveAncestor(
      event.target,
      modeContainer,
    );
    if (!clickedOnInteractiveElement) {
      switchMode();
    }
  });
}

function hasInteractiveAncestor(element, container) {
  const isInteractive = (el) =>
    ["INPUT", "BUTTON"].includes(el.tagName) ||
    el.classList.contains("mode-controls") ||
    el.hasAttribute("contenteditable");

  for (
    let current = element;
    current && current !== container;
    current = current.parentElement
  ) {
    if (isInteractive(current)) return true;
  }
  return false;
}

function switchMode() {
  const currentModeName = MODES[activeModeIndex];

  if (currentModeName === MODE.FOCUS) stopFocusTimer();

  document.getElementById(currentModeName)?.classList.remove("active");

  activeModeIndex = (activeModeIndex + 1) % MODES.length;
  const nextModeName = MODES[activeModeIndex];

  document.getElementById(nextModeName)?.classList.add("active");

  if (nextModeName === MODE.FOCUS) startFocusTimer();
}
function setupStopwatch() {
  const stopwatchElements = getElements([
    "stopwatch-start",
    "stopwatch-reset",
    "stopwatch-time",
  ]);
  const {
    "stopwatch-start": startButton,
    "stopwatch-reset": resetButton,
    "stopwatch-time": timeDisplayElement,
  } = stopwatchElements;

  if (!startButton || !resetButton || !timeDisplayElement) return;

  const updateStopwatchDisplay = () => {
    const centiseconds = Math.floor((stopwatchElapsedTime % 1000) / 10);
    const seconds = Math.floor(stopwatchElapsedTime / 1000) % 60;
    const minutes = Math.floor(stopwatchElapsedTime / 60000) % 60;
    const hours = Math.floor(stopwatchElapsedTime / 3600000);
    const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
    timeDisplayElement.textContent = formattedTime;
  };

  const isStopwatchRunning = () => stopwatchIntervalId !== null;

  startButton.addEventListener("click", () => {
    if (isStopwatchRunning()) {
      pauseStopwatch();
    } else {
      startStopwatch();
    }
  });

  resetButton.addEventListener("click", () => {
    resetStopwatch();
  });

  function startStopwatch() {
    const UPDATE_INTERVAL = 10;
    stopwatchIntervalId = setInterval(() => {
      stopwatchElapsedTime += UPDATE_INTERVAL;
      updateStopwatchDisplay();
    }, UPDATE_INTERVAL);
    startButton.textContent = "Pause";
  }

  function pauseStopwatch() {
    clearInterval(stopwatchIntervalId);
    stopwatchIntervalId = null;
    startButton.textContent = "Start";
  }

  function resetStopwatch() {
    stopwatchElapsedTime = 0;
    updateStopwatchDisplay();
    if (isStopwatchRunning()) {
      pauseStopwatch();
    }
  }
}

function setupTimer() {
  const timerElements = getElements([
    "timer-input",
    "timer-edit",
    "timer-start",
    "timer-stop",
  ]);
  const {
    "timer-input": timerInputElement,
    "timer-edit": lockToggleButton,
    "timer-start": startButton,
    "timer-stop": stopButton,
  } = timerElements;

  if (!timerInputElement || !lockToggleButton || !startButton || !stopButton)
    return;

  let isTimerLocked = true;
  timerInputElement.readOnly = true;
  startButton.disabled = false;
  stopButton.disabled = false;

  // Set initial button state
  lockToggleButton.textContent = "Unlock";
  lockToggleButton.title = "Click to unlock timer for editing";

  const updateTimerDisplay = () => {
    timerInputElement.value = formatTime(timerRemainingTime);
  };

  lockToggleButton.addEventListener("click", () => {
    isTimerLocked = !isTimerLocked;
    timerInputElement.readOnly = isTimerLocked;
    lockToggleButton.textContent = isTimerLocked ? "Unlock" : "Lock";
    lockToggleButton.title = `Click to ${isTimerLocked ? "unlock" : "lock"} timer ${isTimerLocked ? "for editing" : ""}`;

    startButton.disabled = !isTimerLocked;
    stopButton.disabled = !isTimerLocked;

    if (!isTimerLocked) setTimeout(() => timerInputElement.focus(), 100);
  });

  startButton.addEventListener("click", () => {
    if (timerIntervalId || !isTimerLocked) return;

    const timeParts = timerInputElement.value
      .split(":")
      .map((part) => parseInt(part) || 0);
    timerRemainingTime =
      (timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]) * 1000;

    if (timerRemainingTime <= 0) return;

    const wasLocked = isTimerLocked;
    isTimerLocked = true;
    timerInputElement.readOnly = true;
    lockToggleButton.textContent = "Lock";
    lockToggleButton.disabled = true;

    timerIntervalId = setInterval(() => {
      timerRemainingTime -= 1000;

      if (timerRemainingTime <= 0) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        isTimerLocked = wasLocked;
        timerInputElement.readOnly = isTimerLocked;
        lockToggleButton.textContent = isTimerLocked ? "Unlock" : "Lock";
        lockToggleButton.disabled = false;
      }
      updateTimerDisplay();
    }, 1000);
  });

  stopButton.addEventListener("click", () => {
    if (!isTimerLocked || !timerIntervalId) return;
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    lockToggleButton.disabled = false;
  });
}

function setupFocus() {
  // Focus mode is auto-controlled by switchMode - no buttons needed
}

function startFocusTimer() {
  focusElapsedTime = 0;
  updateFocusDisplay();

  const FOCUS_UPDATE_INTERVAL = 1000;
  focusIntervalId = setInterval(() => {
    focusElapsedTime += FOCUS_UPDATE_INTERVAL;
    updateFocusDisplay();
  }, FOCUS_UPDATE_INTERVAL);
}

function stopFocusTimer() {
  if (focusIntervalId) {
    clearInterval(focusIntervalId);
    focusIntervalId = null;
  }
}

function updateFocusDisplay() {
  const focusTimeDisplayElement = document.getElementById("focus-time");
  if (focusTimeDisplayElement) {
    focusTimeDisplayElement.textContent = formatTime(focusElapsedTime);
  }
}

function setupAudioDetection() {
  console.log("[App] Setting up audio detection...");

  // Check if audioAPI is available (in Electron environment)
  if (typeof window.audioAPI !== "undefined") {
    // Start audio detection in main process
    window.audioAPI
      .startAudio()
      .then(() => {
        console.log("[App] Audio detection started");
      })
      .catch((error) => {
        console.warn("[App] Failed to start audio detection:", error);
      });

    // Listen for music status changes from main process
    window.audioAPI.onMusicStatusChanged((isPlaying) => {
      console.log("[App] Music status changed:", isPlaying);
      setMusicActive(isPlaying);
    });
  } else {
    console.warn("[App] audioAPI not available - running in browser mode");
  }
}

function setupTestFunctions() {
  window.testPet = () => triggerPet();

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

  window.testAudioStatus = () => {
    console.log("[App] TextAudio Status:", getAudioState());
    return getAudioState();
  };

  window.testWeatherChange = (condition) => {
    console.log(`[App] Testing weather change to: ${condition}`);
    if (condition) {
      triggerWeatherSpeech(condition);
    } else {
      console.log(
        "[App] Available weather conditions:",
        "Clear, MostlyClear, PartlyCloudy, Overcast, Fog, Rain, Snow, Thunderstorm, etc.",
      );
    }
  };

  console.log(
    "[App] Test functions available: testPet(), testMusic(), testSpeech('message'), testTextBeep(), testAudioStatus(), testWeatherChange('condition')",
  );
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

  // Update weather every 10 seconds for testing
  const currentTime = Date.now();
  if (!weatherData || currentTime - lastWeatherUpdate > 10000) {
    updateWeather();
  }

  // Display current weather data
  updateWeatherDisplay();
}

async function updateWeather() {
  try {
    const newWeatherData = await getCurrentWeather();
    const newCondition = newWeatherData.condition;

    // Announce weather changes
    if (previousWeatherCondition && previousWeatherCondition !== newCondition) {
      console.log(
        `[Weather] Condition changed: ${previousWeatherCondition} -> ${newCondition}`,
      );
      triggerWeatherSpeech(newCondition);
    }

    previousWeatherCondition = newCondition;
    weatherData = newWeatherData;
    lastWeatherUpdate = Date.now();
    console.log("[Weather] Updated:", weatherData);
  } catch (error) {
    console.error("[Weather] Update failed:", error);
    weatherData = {
      location: "Unknown",
      temperature: null,
      condition: "Unknown",
    };
  }
}

function triggerWeatherSpeech(condition) {
  if (!window.getRandomSpeech || !window.startTypewriter || !window.speechBox) {
    console.log("[Weather] Speech system not available yet");
    return;
  }

  try {
    const weatherMessages = window.getRandomSpeech("weather");
    const conditionMessages = weatherMessages?.[condition];

    if (!conditionMessages?.length) {
      console.log(
        `[Weather] No speech messages found for condition: ${condition}`,
      );
      return;
    }

    const randomMessage =
      conditionMessages[Math.floor(Math.random() * conditionMessages.length)];
    console.log(
      `[Weather] Triggering speech for ${condition}: "${randomMessage}"`,
    );
    window.startTypewriter(window.speechBox, randomMessage);
  } catch (error) {
    console.error("[Weather] Failed to trigger speech:", error);
  }
}

function updateWeatherDisplay() {
  const weatherElement = document.getElementById("weather");
  if (!weatherElement || !weatherData) {
    if (weatherElement) weatherElement.textContent = "Loading weather...";
    return;
  }

  const { temperature, condition } = weatherData;
  const tempText =
    temperature !== null
      ? `${Math.round(temperature)}°C`
      : "Weather unavailable";
  weatherElement.textContent = `${tempText}, ${condition}`;
}

export function handleClick() {
  triggerPet();
}

export function initializeApp() {
  initializeState();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateBaseStateFromTime, 60000);
}
