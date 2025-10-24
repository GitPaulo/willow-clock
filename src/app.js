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
} from "./audio/text-audio.js";
import { getCurrentWeather } from "./weather/weather.js";
import {
  loadSettings,
  saveSettings,
  getSettings,
  getSetting,
  resetSettings,
} from "./settings.js";

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

document.addEventListener("DOMContentLoaded", async () => {
  // Load settings first
  await loadSettings();

  setupLoadingScreen();
  setupModeSystem();
  setupStopwatch();
  setupTimer();
  setupFocus();
  setupCursorTrail();
  setupBackgroundMusic();
  setupSettings();
  setupAudioDetection();
  setupTestFunctions();
  applyDebugMode();
});

function applyDebugMode() {
  const debugMode = getSetting("debugMode", false);
  const infoElement = document.getElementById("info");
  if (infoElement) {
    infoElement.style.display = debugMode ? "block" : "none";
  }
}

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

function setupSettings() {
  const settingsToggle = document.getElementById("settings-toggle");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsBtn = document.getElementById("close-settings");
  const settingsBackdrop = document.querySelector(".settings-backdrop");
  const saveBtn = document.getElementById("settings-save");
  const resetBtn = document.getElementById("settings-reset");

  // Get all setting inputs
  const audioOnStartCheckbox = document.getElementById(
    "setting-audio-on-start",
  );
  const timerAlarmCheckbox = document.getElementById("setting-timer-alarm");
  const cursorTrailCheckbox = document.getElementById("setting-cursor-trail");
  const debugModeCheckbox = document.getElementById("setting-debug-mode");
  const modeChangeSpeechCheckbox = document.getElementById(
    "setting-mode-change-speech",
  );
  const weatherFrequencyInput = document.getElementById(
    "setting-weather-frequency",
  );
  const temperatureUnitSelect = document.getElementById(
    "setting-temperature-unit",
  );
  const dayStartInput = document.getElementById("setting-day-start");
  const dayEndInput = document.getElementById("setting-day-end");
  const hardwareAccelerationCheckbox = document.getElementById(
    "setting-hardware-acceleration",
  );
  const fpsTargetInput = document.getElementById("setting-fps-target");

  if (!settingsToggle || !settingsModal) return;

  // Function to load settings into UI
  function loadSettingsUI() {
    const settings = getSettings();

    if (audioOnStartCheckbox)
      audioOnStartCheckbox.checked = settings.audioOnStart;
    if (timerAlarmCheckbox)
      timerAlarmCheckbox.checked = settings.timerAlarmSound;
    if (cursorTrailCheckbox)
      cursorTrailCheckbox.checked = settings.cursorTrailEnabled;
    if (debugModeCheckbox)
      debugModeCheckbox.checked = settings.debugMode;
    if (modeChangeSpeechCheckbox)
      modeChangeSpeechCheckbox.checked = settings.modeChangeSpeech;
    if (weatherFrequencyInput)
      weatherFrequencyInput.value = settings.weatherUpdateFrequency / 60000; // Convert ms to minutes
    if (temperatureUnitSelect)
      temperatureUnitSelect.value = settings.temperatureUnit;
    if (dayStartInput)
      dayStartInput.value = settings.dayNightTransitionHours.start;
    if (dayEndInput)
      dayEndInput.value = settings.dayNightTransitionHours.end;
    if (hardwareAccelerationCheckbox)
      hardwareAccelerationCheckbox.checked = settings.hardwareAcceleration;
    if (fpsTargetInput) fpsTargetInput.value = settings.fpsTarget;

    console.log("[Settings] Loaded settings into UI:", settings);
  }

  // Function to save settings from UI
  async function saveSettingsUI() {
    const oldSettings = getSettings();

    const newSettings = {
      audioOnStart: audioOnStartCheckbox?.checked ?? true,
      timerAlarmSound: timerAlarmCheckbox?.checked ?? true,
      cursorTrailEnabled: cursorTrailCheckbox?.checked ?? true,
      debugMode: debugModeCheckbox?.checked ?? false,
      modeChangeSpeech: modeChangeSpeechCheckbox?.checked ?? true,
      weatherUpdateFrequency:
        (parseInt(weatherFrequencyInput?.value) || 2) * 60000, // Convert minutes to ms
      temperatureUnit: temperatureUnitSelect?.value ?? "celsius",
      dayNightTransitionHours: {
        start: parseInt(dayStartInput?.value) || 6,
        end: parseInt(dayEndInput?.value) || 18,
      },
      hardwareAcceleration: hardwareAccelerationCheckbox?.checked ?? true,
      fpsTarget: parseInt(fpsTargetInput?.value) || 60,
    };

    const success = await saveSettings(newSettings);

    if (success) {
      console.log("[Settings] Settings saved successfully");
      applySettings(newSettings);

      // Check if restart-required settings changed
      const restartRequired =
        oldSettings.hardwareAcceleration !== newSettings.hardwareAcceleration ||
        oldSettings.fpsTarget !== newSettings.fpsTarget;

      if (restartRequired) {
        showSettingsNotification(
          "Settings saved! Restart the app for changes to take effect.",
        );
      } else {
        showSettingsNotification("Settings saved!");
      }
    } else {
      console.error("[Settings] Failed to save settings");
      showSettingsNotification("Failed to save settings", true);
    }
  }

  // Function to apply settings to the app
  function applySettings(settings) {
    // Apply cursor trail setting
    if (settings.cursorTrailEnabled && !cursorTrailInstance) {
      cursorTrailInstance = new CursorTrail();
      cursorTrailInstance.init();
      window.cursorTrail = cursorTrailInstance;
    } else if (!settings.cursorTrailEnabled && cursorTrailInstance) {
      cursorTrailInstance.destroy();
      cursorTrailInstance = null;
    }

    // Apply debug mode setting
    applyDebugMode();

    // Update day/night state with new transition times
    const { start, end } = settings.dayNightTransitionHours;
    updateBaseStateFromTime(start, end);

    // Weather display will update on next cycle
    // Timer alarm and audio settings apply on next use
    // Hardware acceleration and FPS target require restart

    console.log("[Settings] Applied settings:", settings);
  }

  // Function to show notification
  function showSettingsNotification(message, isError = false) {
    // Simple console notification for now
    if (isError) {
      console.error(`[Settings] ${message}`);
    } else {
      console.log(`[Settings] ${message}`);
    }

    // Optional: Could add a visual toast notification here
    // For now, user sees the message in console
  }

  // Open settings modal
  settingsToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("[Settings] Opening settings modal");
    loadSettingsUI(); // Load current settings
    settingsModal.classList.remove("hidden");
  });

  // Close settings modal via close button
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("[Settings] Closing settings modal");
      settingsModal.classList.add("hidden");
    });
  }

  // Close settings modal via backdrop click
  if (settingsBackdrop) {
    settingsBackdrop.addEventListener("click", () => {
      console.log("[Settings] Closing settings modal (backdrop click)");
      settingsModal.classList.add("hidden");
    });
  }

  // Close settings modal via ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !settingsModal.classList.contains("hidden")) {
      console.log("[Settings] Closing settings modal (ESC key)");
      settingsModal.classList.add("hidden");
    }
  });

  // Save button
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await saveSettingsUI();
      settingsModal.classList.add("hidden");
    });
  }

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to reset all settings to defaults?")) {
        await resetSettings();
        loadSettingsUI(); // Reload UI with defaults
        applySettings(getSettings());
        showSettingsNotification("Settings reset to defaults");
      }
    });
  }
}

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
  timerAlarmAudio.appendChild(source); if (!backgroundMusic || !audioToggle || !volumeIcon) return;

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

  // Trigger speech for mode change if enabled
  if (getSetting("modeChangeSpeech", true)) {
    triggerModeSpeech(nextModeName);
  }
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

        // Play alarm sound if enabled
        if (getSetting("timerAlarmSound", true) && timerAlarmAudio) {
          timerAlarmAudio.currentTime = 0;
          timerAlarmAudio.play().catch(err => console.log("[Timer] Alarm play failed:", err));
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

  window.testAudioStatus = async () => {
    const { getAudioState } = await import("./audio/text-audio.js");
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

function triggerWeatherSpeech(condition) {
  if (!window.SPEECH_MESSAGES || !window.startTypewriter || !window.speechBox) {
    console.log("[Weather] Speech system not available yet");
    return;
  }

  try {
    const weatherMessages = window.SPEECH_MESSAGES?.weather;

    if (!weatherMessages || typeof weatherMessages !== 'object') {
      console.log("[Weather] No weather messages available");
      return;
    }

    const conditionMessages = weatherMessages[condition];

    if (!conditionMessages || !Array.isArray(conditionMessages) || conditionMessages.length === 0) {
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

    if (!modeMessages || typeof modeMessages !== 'object') {
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
} function updateWeatherDisplay() {
  const weatherElement = document.getElementById("weather");
  if (!weatherElement || !weatherData) {
    if (weatherElement) weatherElement.textContent = "Loading weather...";
    return;
  }

  const { temperature, condition } = weatherData;
  const unit = getSetting("temperatureUnit", "celsius");

  let tempText = "Weather unavailable";
  if (temperature !== null) {
    const displayTemp = unit === "fahrenheit"
      ? Math.round(temperature * 9 / 5 + 32)
      : Math.round(temperature);
    const unitSymbol = unit === "fahrenheit" ? "°F" : "°C";
    tempText = `${displayTemp}${unitSymbol}`;
  }

  weatherElement.textContent = `${tempText}, ${condition}`;
}

export function handleClick() {
  triggerPet();
}

export function initializeApp() {
  initializeState();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(() => {
    const { start, end } = getSetting("dayNightTransitionHours", { start: 6, end: 18 });
    updateBaseStateFromTime(start, end);
  }, 60000);
}
