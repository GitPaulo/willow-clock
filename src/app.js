import { CursorTrail } from "./effects/cursor-trail.js";
import {
  MODE,
  MODES,
  getElements,
  toggleHoverStates,
  formatTime,
} from "./util/utils.js";
import {
  updateDayNightState,
  initializeState,
  triggerPet,
  setMusicActive,
} from "./render/state-machine.js";
import { getCurrentWeather } from "./weather/weather.js";
import {
  loadSettings,
  saveSettings,
  getSettings,
  getSetting,
  resetSettings,
} from "./settings.js";
import { setupTestFunctions } from "./util/test-functions.js";

// -------------------------------------------------------------------------------------
// App State
// -------------------------------------------------------------------------------------
let activeModeIndex = 0;
let stopwatchIntervalId = null;
let stopwatchElapsedTime = 0;
let timerIntervalId = null;
let timerRemainingTime = 0;
let focusIntervalId = null;
let focusElapsedTime = 0;
let cursorTrailInstance = null;
let backgroundMusic = null;
let timerAlarmAudio = null;
let isMuted = false;
let weatherData = null;
let lastWeatherUpdate = 0;
let previousWeatherCondition = null;

// -------------------------------------------------------------------------------------
// Bootstrap
// -------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();

  setupLoadingScreen();
  setupBackgroundMusic();
  setupCursorTrail();
  setupAudioDetection();
  setupModeSystem();
  setupStopwatch();
  setupTimer();
  setupFocus();
  setupSettings();
  setupTestFunctions();
  applyDebugMode();
});

// -------------------------------------------------------------------------------------
// Initialization & Utilities
// -------------------------------------------------------------------------------------
function applyDebugMode() {
  const debugMode = getSetting("debugMode", false);
  const infoElement = document.getElementById("info");
  if (infoElement) {
    infoElement.style.display = debugMode ? "block" : "none";
  }
}

// -------------------------------------------------------------------------------------
// Loading Screen
// -------------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------------
// Audio Setup (Background Music & Timer Alarm)
// -------------------------------------------------------------------------------------
function setupBackgroundMusic() {
  const elements = getElements([
    "background-music",
    "audio-toggle",
    "volume-icon",
  ]);
  backgroundMusic = elements["background-music"];
  const { "audio-toggle": audioToggle, "volume-icon": volumeIcon } = elements;

  // Setup timer alarm audio
  timerAlarmAudio = new Audio();
  timerAlarmAudio.volume = 0.5;
  timerAlarmAudio.preload = "auto";

  // Create source element with explicit MIME type
  const source = document.createElement("source");
  source.src = "./assets/audio/timer-end.mp3";
  source.type = "audio/mpeg";
  timerAlarmAudio.appendChild(source);
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

async function startBackgroundMusic() {
  if (!backgroundMusic) return;

  // Check if audio should auto-play based on settings
  const audioOnStart = getSetting("audioOnStart", true);

  if (!audioOnStart) {
    console.log("[App] Auto-play disabled by settings");
    isMuted = true;
    backgroundMusic.muted = true;
    return;
  }

  try {
    // Set volume before playing to prevent crackling
    backgroundMusic.volume = 0.08;
    await backgroundMusic.play();
  } catch (error) {
    console.log("[App] Auto-play blocked:", error.message);
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

// -------------------------------------------------------------------------------------
// Visual Effects
// -------------------------------------------------------------------------------------
function setupCursorTrail() {
  cursorTrailInstance = new CursorTrail();
  cursorTrailInstance.init();
  window.cursorTrail = cursorTrailInstance;

  // Apply cursor trail setting
  const cursorTrailEnabled = getSetting("cursorTrailEnabled", true);
  if (!cursorTrailEnabled && cursorTrailInstance) {
    cursorTrailInstance.destroy();
    cursorTrailInstance = null;
  }
}

// -------------------------------------------------------------------------------------
// Mode System (Clock, Stopwatch, Timer, Focus)
// -------------------------------------------------------------------------------------
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

  // Trigger speech for mode change if enabled
  if (getSetting("modeChangeSpeech", true)) {
    triggerModeSpeech(nextModeName);
  }
}

// -------------------------------------------------------------------------------------
// Stopwatch
// -------------------------------------------------------------------------------------
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
    const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
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

// -------------------------------------------------------------------------------------
// Timer
// -------------------------------------------------------------------------------------
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
    lockToggleButton.title = `Click to ${isTimerLocked ? "unlock" : "lock"} timer ${
      isTimerLocked ? "for editing" : ""
    }`;

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

        // Play alarm sound if enabled
        if (getSetting("timerAlarmSound", true) && timerAlarmAudio) {
          timerAlarmAudio.currentTime = 0;
          timerAlarmAudio
            .play()
            .catch((err) => console.log("[Timer] Alarm play failed:", err));
        }
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

// -------------------------------------------------------------------------------------
// Focus
// -------------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------------
// Settings Modal
// -------------------------------------------------------------------------------------
function setupSettings() {
  const elements = getElements([
    "settings-toggle",
    "settings-modal",
    "close-settings",
    "settings-save",
    "settings-reset",
    "setting-audio-on-start",
    "setting-timer-alarm",
    "setting-cursor-trail",
    "setting-debug-mode",
    "setting-mode-change-speech",
    "setting-weather-frequency",
    "setting-temperature-unit",
    "setting-day-start",
    "setting-day-end",
    "setting-hardware-acceleration",
    "setting-fps-target",
  ]);

  const {
    "settings-toggle": toggleBtn,
    "settings-modal": modal,
    "close-settings": closeBtn,
    "settings-save": saveBtn,
    "settings-reset": resetBtn,
  } = elements;

  if (!toggleBtn || !modal) return;

  const backdrop = document.querySelector(".settings-backdrop");

  // Load settings into UI
  function loadSettingsUI() {
    const settings = getSettings();
    if (elements["setting-audio-on-start"])
      elements["setting-audio-on-start"].checked = settings.audioOnStart;
    if (elements["setting-timer-alarm"])
      elements["setting-timer-alarm"].checked = settings.timerAlarmSound;
    if (elements["setting-cursor-trail"])
      elements["setting-cursor-trail"].checked = settings.cursorTrailEnabled;
    if (elements["setting-debug-mode"])
      elements["setting-debug-mode"].checked = settings.debugMode;
    if (elements["setting-mode-change-speech"])
      elements["setting-mode-change-speech"].checked =
        settings.modeChangeSpeech;
    if (elements["setting-weather-frequency"])
      elements["setting-weather-frequency"].value =
        settings.weatherUpdateFrequency / 60000;
    if (elements["setting-temperature-unit"])
      elements["setting-temperature-unit"].value = settings.temperatureUnit;
    if (elements["setting-day-start"])
      elements["setting-day-start"].value =
        settings.dayNightTransitionHours.start;
    if (elements["setting-day-end"])
      elements["setting-day-end"].value = settings.dayNightTransitionHours.end;
    if (elements["setting-hardware-acceleration"])
      elements["setting-hardware-acceleration"].checked =
        settings.hardwareAcceleration;
    if (elements["setting-fps-target"])
      elements["setting-fps-target"].value = settings.fpsTarget;
  }

  // Save settings from UI
  async function saveSettingsUI() {
    const oldSettings = getSettings();
    const newSettings = {
      audioOnStart: elements["setting-audio-on-start"]?.checked ?? true,
      timerAlarmSound: elements["setting-timer-alarm"]?.checked ?? true,
      cursorTrailEnabled: elements["setting-cursor-trail"]?.checked ?? true,
      debugMode: elements["setting-debug-mode"]?.checked ?? false,
      modeChangeSpeech: elements["setting-mode-change-speech"]?.checked ?? true,
      weatherUpdateFrequency:
        (parseInt(elements["setting-weather-frequency"]?.value) || 2) * 60000,
      temperatureUnit: elements["setting-temperature-unit"]?.value ?? "celsius",
      dayNightTransitionHours: {
        start: parseInt(elements["setting-day-start"]?.value) || 6,
        end: parseInt(elements["setting-day-end"]?.value) || 18,
      },
      hardwareAcceleration:
        elements["setting-hardware-acceleration"]?.checked ?? true,
      fpsTarget: parseInt(elements["setting-fps-target"]?.value) || 60,
    };

    const success = await saveSettings(newSettings);
    if (success) {
      applySettings(newSettings);
      const restartRequired =
        oldSettings.hardwareAcceleration !== newSettings.hardwareAcceleration ||
        oldSettings.fpsTarget !== newSettings.fpsTarget;
      console.log(
        restartRequired
          ? "[Settings] Saved! Restart app for hardware/FPS changes."
          : "[Settings] Saved successfully!",
      );
    } else {
      console.error("[Settings] Failed to save");
    }
  }

  // Apply settings to running app
  function applySettings(settings) {
    // Cursor trail
    if (settings.cursorTrailEnabled && !cursorTrailInstance) {
      cursorTrailInstance = new CursorTrail();
      cursorTrailInstance.init();
      window.cursorTrail = cursorTrailInstance;
    } else if (!settings.cursorTrailEnabled && cursorTrailInstance) {
      cursorTrailInstance.destroy();
      cursorTrailInstance = null;
    }
    // Debug mode
    applyDebugMode();
    // Day/night transition
    const { start, end } = settings.dayNightTransitionHours;
    updateDayNightState(start, end);
  }

  // Event handlers
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    loadSettingsUI();
    modal.classList.remove("hidden");
  });

  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    modal.classList.add("hidden");
  });

  backdrop?.addEventListener("click", () => modal.classList.add("hidden"));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
    }
  });

  saveBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await saveSettingsUI();
    modal.classList.add("hidden");
  });

  resetBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (confirm("Reset all settings to defaults?")) {
      await resetSettings();
      loadSettingsUI();
      applySettings(getSettings());
      console.log("[Settings] Reset to defaults");
    }
  });
}

// -------------------------------------------------------------------------------------
// Clock & Weather
// -------------------------------------------------------------------------------------
function updateClock() {
  const clockEl = document.getElementById("clock");
  const dateEl = document.getElementById("date");
  if (!clockEl || !dateEl) return;

  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  clockEl.textContent = time;

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  dateEl.textContent = date;

  // Update weather based on settings frequency
  const currentTime = Date.now();
  const weatherUpdateFrequency = getSetting("weatherUpdateFrequency", 1800000); // Default 30 minutes

  if (
    !weatherData ||
    currentTime - lastWeatherUpdate > weatherUpdateFrequency
  ) {
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

function updateWeatherDisplay() {
  const weatherElement = document.getElementById("weather");
  if (!weatherElement) return;

  if (!weatherData) {
    weatherElement.textContent = "Loading weather...";
    return;
  }

  const { temperature, condition } = weatherData;
  const unit = getSetting("temperatureUnit", "celsius");

  let tempText = "Weather unavailable";
  if (temperature !== null) {
    const displayTemp =
      unit === "fahrenheit"
        ? Math.round((temperature * 9) / 5 + 32)
        : Math.round(temperature);
    const unitSymbol = unit === "fahrenheit" ? "°F" : "°C";
    tempText = `${displayTemp}${unitSymbol}`;
  }

  weatherElement.textContent = `${tempText}, ${condition}`;
}

// -------------------------------------------------------------------------------------
// Speech triggers
// -------------------------------------------------------------------------------------
function triggerWeatherSpeech(condition) {
  if (!window.SPEECH_MESSAGES || !window.startTypewriter || !window.speechBox) {
    console.log("[Weather] Speech system not available yet");
    return;
  }

  try {
    const weatherMessages = window.SPEECH_MESSAGES?.weather;

    if (!weatherMessages || typeof weatherMessages !== "object") {
      console.log("[Weather] No weather messages available");
      return;
    }

    const conditionMessages = weatherMessages[condition];

    if (
      !conditionMessages ||
      !Array.isArray(conditionMessages) ||
      conditionMessages.length === 0
    ) {
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

function triggerModeSpeech(modeName) {
  if (!window.SPEECH_MESSAGES || !window.startTypewriter || !window.speechBox) {
    console.log("[Mode] Speech system not available yet");
    return;
  }

  try {
    const modeMessages = window.SPEECH_MESSAGES?.modes;

    if (!modeMessages || typeof modeMessages !== "object") {
      console.log("[Mode] No mode messages available");
      return;
    }

    // Map MODE enum values to message keys
    // "clock-mode" -> "clock", "stopwatch" -> "stopwatch", etc.
    const modeKey = modeName === "clock-mode" ? "clock" : modeName;
    const messages = modeMessages[modeKey];

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log(`[Mode] No speech messages found for mode: ${modeKey}`);
      return;
    }

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    console.log(`[Mode] Triggering speech for ${modeKey}: "${randomMessage}"`);
    window.startTypewriter(window.speechBox, randomMessage);
  } catch (error) {
    console.error("[Mode] Failed to trigger speech:", error);
  }
}

// -------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------
export function handleClick() {
  triggerPet();
}

export function initializeApp() {
  // Expose triggerWeatherSpeech globally for test functions
  window.triggerWeatherSpeech = triggerWeatherSpeech;

  initializeState();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(() => {
    const { start, end } = getSetting("dayNightTransitionHours", {
      start: 6,
      end: 18,
    });
    updateDayNightState(start, end);
  }, 60000);
}
