import { CursorTrail } from "./effects/cursor-trail.js";
import {
  MODE,
  MODES,
  getElements,
  toggleHoverStates,
  formatTime,
  isNightTime,
  formatClockTime,
  flashElement,
} from "./util/utils.js";
import {
  updateDayNightState,
  initializeState,
  triggerPet,
  setMusicActive,
  getCurrentState,
  onStateChange,
} from "./render/state-machine.js";
import { getCurrentWeather } from "./weather/weather.js";
import {
  loadSettings,
  saveSettings,
  getSettings,
  getSetting,
  resetSettings,
  updateSettings,
} from "./settings.js";
import { setupTestFunctions } from "./util/test-functions.js";
import { initRenderer, onSpriteClick, updateFPS } from "./render/renderer.js";

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
let lastFocusTime = 0;
let focusCheckpoints = new Set();
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
  await initRenderer();
  onSpriteClick(handlePetAttempt);
  initializeApp();
  setupBackgroundMusic();
  setupCursorTrail();
  setupAudioDetection();
  setupShakeDetection();
  setupModeSystem();
  setupStopwatch();
  setupTimer();
  setupFocus();
  setupSettings();
  setupTestFunctions();
  applyDebugMode();
  setupVersionInfo();
});

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

    if (isMuted) {
      startAudioDetection();
    } else {
      stopAudioDetection();
      // Exit music state when app music is turned on
      setMusicActive(false);
    }
  });
}

async function startBackgroundMusic() {
  if (!backgroundMusic) return;

  const audioOnStart = getSetting("audioOnStart", true);

  if (!audioOnStart) {
    console.log("[App] Auto-play disabled by settings");
    isMuted = true;
    backgroundMusic.muted = true;
    startAudioDetection();
    return;
  }

  try {
    backgroundMusic.volume = 0.08;
    await backgroundMusic.play();
    stopAudioDetection();
  } catch (error) {
    console.log("[App] Auto-play blocked:", error.message);
    isMuted = true;
    backgroundMusic.muted = true;
    startAudioDetection();
  }
}

function setupAudioDetection() {
  if (typeof window.audioAPI === "undefined") return;

  window.audioAPI.onMusicStatusChanged((isPlaying) => {
    console.log("[App] Music status changed:", isPlaying);
    setMusicActive(isPlaying);
  });

  // Listen for state changes to manage audio detection during bedtime
  onStateChange((newState) => {
    if (newState === "night") {
      console.log("[App] Entering bedtime - stopping audio detection");
      stopAudioDetection();
    } else if (newState === "day" && isMuted) {
      console.log("[App] Exiting bedtime - starting audio detection");
      startAudioDetection();
    }
  });

  // Expose for speech system
  window.pauseAudioDetection = stopAudioDetection;
  window.resumeAudioDetection = () => {
    if (isMuted) startAudioDetection();
  };
}

async function startAudioDetection() {
  if (typeof window.audioAPI === "undefined") return;
  if (!getSetting("audioDetectionEnabled", false)) return;

  // Don't start audio detection during bedtime (night state)
  const currentState = getCurrentState();
  if (currentState === "night") {
    console.log("[App] Audio detection disabled during bedtime");
    return;
  }

  try {
    await window.audioAPI.startAudio();
    console.log("[App] Audio detection started");
  } catch (error) {
    console.warn("[App] Failed to start audio detection:", error);
  }
}

async function stopAudioDetection() {
  if (typeof window.audioAPI === "undefined") return;

  try {
    await window.audioAPI.stopAudio();
    console.log("[App] Audio detection stopped");
  } catch (error) {
    console.warn("[App] Failed to stop audio detection:", error);
  }
}

function setupShakeDetection() {
  if (typeof window.windowControls === "undefined") return;
  if (typeof window.windowControls.onShake !== "function") return;

  window.windowControls.onShake(() => {
    console.log("[App] Window shake detected!");
    if (window.getRandomSpeech && window.startTypewriter && window.speechBox) {
      const message = window.getRandomSpeech("shake");
      window.startTypewriter(window.speechBox, message);
    }
  });
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
// Modes
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
    "focus-last",
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

  triggerModeSpeech(nextModeName, "switch");
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
    if (getSetting("modeChangeSpeech", true)) {
      triggerModeSpeech("stopwatch", "start");
    }
  }

  function pauseStopwatch() {
    clearInterval(stopwatchIntervalId);
    stopwatchIntervalId = null;
    startButton.textContent = "Start";
    if (getSetting("modeChangeSpeech", true)) {
      triggerModeSpeech("stopwatch", "pause");
    }
  }

  function resetStopwatch() {
    stopwatchElapsedTime = 0;
    updateStopwatchDisplay();
    if (isStopwatchRunning()) {
      pauseStopwatch();
    }
    if (getSetting("modeChangeSpeech", true)) {
      triggerModeSpeech("stopwatch", "reset");
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

  const updateLockState = (locked) => {
    isTimerLocked = locked;
    timerInputElement.readOnly = locked;
    lockToggleButton.textContent = locked ? "Unlock" : "Lock";
    lockToggleButton.title = locked
      ? "Click to unlock timer for editing"
      : "Click to lock timer";
    startButton.disabled = !locked;
    stopButton.disabled = !locked;
  };

  lockToggleButton.addEventListener("click", () => {
    updateLockState(!isTimerLocked);
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
    updateLockState(true);
    lockToggleButton.disabled = true;
    timerInputElement.classList.add("running");

    triggerModeSpeech("timer", "start");

    timerIntervalId = setInterval(() => {
      timerRemainingTime -= 1000;

      if (timerRemainingTime <= 0) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        updateLockState(wasLocked);
        lockToggleButton.disabled = false;
        timerInputElement.classList.remove("running");

        triggerModeSpeech("timer", "complete");

        // Flash the timer display (synced with audio duration)
        flashElement(timerInputElement, 6000);

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
    timerInputElement.classList.remove("running");
    triggerModeSpeech("timer", "stop");
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
  focusCheckpoints.clear();
  updateFocusDisplay();

  triggerModeSpeech("focus", "start");

  const FOCUS_UPDATE_INTERVAL = 1000;
  focusIntervalId = setInterval(() => {
    focusElapsedTime += FOCUS_UPDATE_INTERVAL;
    updateFocusDisplay();
    checkFocusCheckpoints();
  }, FOCUS_UPDATE_INTERVAL);
}

function checkFocusCheckpoints() {
  const minutes = Math.floor(focusElapsedTime / 60000);
  const checkpoints = [
    { time: 1, key: "checkpoint_1min" },
    { time: 5, key: "checkpoint_5min" },
    { time: 15, key: "checkpoint_15min" },
    { time: 30, key: "checkpoint_30min" },
    { time: 60, key: "checkpoint_1h" },
  ];

  for (const checkpoint of checkpoints) {
    if (minutes === checkpoint.time && !focusCheckpoints.has(checkpoint.key)) {
      focusCheckpoints.add(checkpoint.key);
      triggerModeSpeech("focus", checkpoint.key);
      break;
    }
  }
}

function stopFocusTimer() {
  if (focusIntervalId) {
    clearInterval(focusIntervalId);
    focusIntervalId = null;
    lastFocusTime = focusElapsedTime;
    updateLastFocusDisplay();
    triggerModeSpeech("focus", "stop");
  }
}

function updateFocusDisplay() {
  const focusTimeDisplayElement = document.getElementById("focus-time");
  if (focusTimeDisplayElement) {
    focusTimeDisplayElement.textContent = formatTime(focusElapsedTime);
  }
}

function updateLastFocusDisplay() {
  const lastFocusElement = document.getElementById("focus-last");
  if (!lastFocusElement) return;

  if (lastFocusTime === 0) {
    lastFocusElement.textContent = "Last focus: -";
    return;
  }

  const totalSeconds = Math.floor(lastFocusTime / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let timeStr;
  if (hours > 0) {
    timeStr = `${hours}h`;
  } else if (minutes > 0) {
    timeStr = `${minutes}min`;
  } else {
    timeStr = `${seconds}s`;
  }

  lastFocusElement.textContent = `Last focus: ${timeStr}`;
}

// -------------------------------------------------------------------------------------
// Settings Modal
// -------------------------------------------------------------------------------------

function applyDebugMode() {
  const debugMode = getSetting("debugMode", false);
  const infoElement = document.getElementById("info");
  if (infoElement) {
    infoElement.style.display = debugMode ? "block" : "none";
  }
}

function setupVersionInfo() {
  if (typeof window.versions !== "undefined") {
    const electronEl = document.getElementById("electron-version");
    const nodeEl = document.getElementById("node-version");
    const chromeEl = document.getElementById("chrome-version");

    if (electronEl) electronEl.textContent = window.versions.electron();
    if (nodeEl) nodeEl.textContent = window.versions.node();
    if (chromeEl) chromeEl.textContent = window.versions.chrome();
  }
}

function setupSettings() {
  const elements = getElements([
    "settings-toggle",
    "settings-modal",
    "close-settings",
    "settings-save",
    "settings-reset",
    "settings-credits",
    "setting-audio-on-start",
    "setting-audio-detection",
    "setting-timer-alarm",
    "setting-text-sound",
    "setting-cursor-trail",
    "setting-debug-mode",
    "setting-mode-change-speech",
    "setting-weather-frequency",
    "setting-temperature-unit",
    "setting-day-start",
    "setting-day-end",
    "setting-hardware-acceleration",
    "setting-fps-target",
    "setting-clock-format",
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

    // Helper to safely set element values
    const setElement = (id, value, property = "checked") => {
      if (elements[id]) elements[id][property] = value;
    };

    setElement("setting-audio-on-start", settings.audioOnStart);
    setElement("setting-audio-detection", settings.audioDetectionEnabled);
    setElement("setting-timer-alarm", settings.timerAlarmSound);
    setElement("setting-text-sound", settings.textSoundEnabled);
    setElement("setting-cursor-trail", settings.cursorTrailEnabled);
    setElement("setting-debug-mode", settings.debugMode);
    setElement("setting-mode-change-speech", settings.modeChangeSpeech);
    setElement(
      "setting-weather-frequency",
      settings.weatherUpdateFrequency / 60000,
      "value",
    );
    setElement("setting-temperature-unit", settings.temperatureUnit, "value");
    setElement(
      "setting-day-start",
      settings.dayNightTransitionHours.start,
      "value",
    );
    setElement(
      "setting-day-end",
      settings.dayNightTransitionHours.end,
      "value",
    );
    setElement("setting-hardware-acceleration", settings.hardwareAcceleration);
    setElement("setting-fps-target", settings.fpsTarget, "value");
    setElement(
      "setting-clock-format",
      settings.clockFormat24Hour ? "24" : "12",
      "value",
    );
  }

  // Save settings from UI
  async function saveSettingsUI() {
    const oldSettings = getSettings();
    const newSettings = {
      ...oldSettings, // Preserve settings not in UI (like petCount)
      audioOnStart: elements["setting-audio-on-start"]?.checked ?? true,
      audioDetectionEnabled:
        elements["setting-audio-detection"]?.checked ?? false,
      timerAlarmSound: elements["setting-timer-alarm"]?.checked ?? true,
      textSoundEnabled: elements["setting-text-sound"]?.checked ?? true,
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
      clockFormat24Hour: elements["setting-clock-format"]?.value === "24",
    };

    const success = await saveSettings(newSettings);
    if (success) {
      applySettings(newSettings);
      const restartRequired =
        oldSettings.hardwareAcceleration !== newSettings.hardwareAcceleration;
      console.log(
        restartRequired
          ? "[Settings] Saved! Restart app for hardware acceleration changes."
          : "[Settings] Saved successfully!",
      );
    } else {
      console.error("[Settings] Failed to save");
    }
  }

  // Apply settings to running app
  function applySettings(settings) {
    // Toggle cursor trail
    if (settings.cursorTrailEnabled && !cursorTrailInstance) {
      cursorTrailInstance = new CursorTrail();
      cursorTrailInstance.init();
      window.cursorTrail = cursorTrailInstance;
    } else if (!settings.cursorTrailEnabled && cursorTrailInstance) {
      cursorTrailInstance.destroy();
      cursorTrailInstance = null;
    }

    // Apply other settings
    applyDebugMode();
    updateFPS(settings.fpsTarget);

    // Update day/night state based on new transition hours
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

  const creditsBtn = elements["settings-credits"];
  creditsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openCreditsModal();
  });
}

function openCreditsModal() {
  const creditsModal = document.getElementById("credits-modal");
  const closeCreditsBtn = document.getElementById("close-credits");
  const creditsBackdrop = document.querySelector(".credits-backdrop");

  if (!creditsModal) return;

  creditsModal.classList.remove("hidden");

  closeCreditsBtn?.addEventListener("click", () => {
    creditsModal.classList.add("hidden");
  });

  creditsBackdrop?.addEventListener("click", () => {
    creditsModal.classList.add("hidden");
  });

  document.addEventListener("keydown", function handleEscape(e) {
    if (e.key === "Escape" && !creditsModal.classList.contains("hidden")) {
      creditsModal.classList.add("hidden");
      document.removeEventListener("keydown", handleEscape);
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
  const is24Hour = getSetting("clockFormat24Hour", true);
  const time = formatClockTime(now, is24Hour);
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
// Petting Logic
// -------------------------------------------------------------------------------------
function handlePetAttempt() {
  const { start, end } = getSetting("dayNightTransitionHours", {
    start: 6,
    end: 18,
  });

  if (isNightTime(start, end)) {
    console.log("[App] Petting blocked - it's night time");
    triggerBlockedPettingSpeech();
    return;
  }

  // Block petting during music state
  const currentState = getCurrentState();
  if (currentState === "music") {
    console.log("[App] Petting blocked - music is playing");
    return;
  }

  triggerPet();
  incrementPetCount();
}

async function incrementPetCount() {
  const currentCount = getSetting("petCount", 0);
  const newCount = currentCount + 1;

  await updateSettings({ petCount: newCount });
  console.log(`[App] Pet count: ${newCount}`);

  // Check for milestones
  const milestones = [10, 100, 1000, 10000];
  if (milestones.includes(newCount)) {
    triggerPetMilestone(newCount);
  }
}

function triggerPetMilestone(count) {
  if (!window.getRandomSpeech || !window.startTypewriter || !window.speechBox) {
    return;
  }

  const milestone = `pet_milestone_${count}`;
  const message = window.getRandomSpeech(milestone);
  if (message) {
    console.log(`[App] Pet milestone reached: ${count}`);
    window.startTypewriter(window.speechBox, message);
  }
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

function triggerModeSpeech(modeName, event = "switch") {
  // Early return if speech is disabled or system is not ready
  if (!getSetting("modeChangeSpeech", true)) return;
  if (getCurrentState() === "night") {
    console.log("[Mode] Speech blocked - night state");
    return;
  }
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

    const modeKey = modeName === "clock-mode" ? "clock" : modeName;
    const messages = modeMessages[modeKey]?.[event];

    if (!Array.isArray(messages) || messages.length === 0) {
      console.log(`[Mode] No speech messages found for ${modeKey}.${event}`);
      return;
    }

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    console.log(
      `[Mode] Triggering speech for ${modeKey}.${event}: "${randomMessage}"`,
    );
    window.startTypewriter(window.speechBox, randomMessage);
  } catch (error) {
    console.error("[Mode] Failed to trigger speech:", error);
  }
}

function triggerBlockedPettingSpeech() {
  if (!window.SPEECH_MESSAGES || !window.startTypewriter || !window.speechBox) {
    console.log("[App] Speech system not available yet");
    return;
  }

  try {
    const blockedMessages = window.SPEECH_MESSAGES?.pet_blocked_night;

    if (
      !blockedMessages ||
      !Array.isArray(blockedMessages) ||
      blockedMessages.length === 0
    ) {
      console.log("[App] No blocked petting messages available");
      return;
    }

    const randomMessage =
      blockedMessages[Math.floor(Math.random() * blockedMessages.length)];
    console.log(`[App] Triggering blocked petting speech: "${randomMessage}"`);
    window.startTypewriter(window.speechBox, randomMessage);
  } catch (error) {
    console.error("[App] Failed to trigger blocked petting speech:", error);
  }
}

// -------------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------------
export function initializeApp() {
  window.triggerWeatherSpeech = triggerWeatherSpeech;

  // Initialize state machine with settings
  const { start, end } = getSetting("dayNightTransitionHours", {
    start: 6,
    end: 18,
  });
  initializeState(start, end);

  // Update clock every second
  updateClock();
  setInterval(updateClock, 1000);

  // Check day/night state every minute
  setInterval(() => {
    const { start, end } = getSetting("dayNightTransitionHours", {
      start: 6,
      end: 18,
    });
    updateDayNightState(start, end);
  }, 60000);
}
