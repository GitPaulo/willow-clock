import { CursorTrail } from "./effects/cursor-trail.js";

const MODES = ["clock-mode", "stopwatch", "timer", "focus"];

let currentModeIndex = 0;
let stopwatchInterval = null;
let stopwatchTime = 0;
let timerInterval = null;
let timerRemaining = 0;
let focusInterval = null;
let focusTime = 0;
let cursorTrail = null;

document.addEventListener("DOMContentLoaded", () => {
  setupModeSystem();
  setupStopwatch();
  setupTimer();
  setupFocus();
  setupCursorTrail();
});

function setupCursorTrail() {
  cursorTrail = new CursorTrail();
  cursorTrail.init();
  window.cursorTrail = cursorTrail;
  console.log("[App] Cursor trail initialized");
}

function setupModeSystem() {
  const modeContainer = document.getElementById("mode");
  const clock = document.getElementById("clock");
  const date = document.getElementById("date");

  if (!modeContainer) {
    console.log("[App] Mode container not found");
    return;
  }

  // Hover state management - add to all mode elements
  const stopwatchTime = document.getElementById("stopwatch-time");
  const timerInput = document.getElementById("timer-input");
  const focusTitle = document.getElementById("focus-title");
  const focusTime = document.getElementById("focus-time");

  modeContainer.addEventListener("mouseenter", () => {
    if (clock) clock.classList.add("hover");
    if (date) date.classList.add("hover");
    if (stopwatchTime) stopwatchTime.classList.add("hover");
    if (timerInput) timerInput.classList.add("hover");
    if (focusTitle) focusTitle.classList.add("hover");
    if (focusTime) focusTime.classList.add("hover");
  });

  modeContainer.addEventListener("mouseleave", () => {
    if (clock) clock.classList.remove("hover");
    if (date) date.classList.remove("hover");
    if (stopwatchTime) stopwatchTime.classList.remove("hover");
    if (timerInput) timerInput.classList.remove("hover");
    if (focusTitle) focusTitle.classList.remove("hover");
    if (focusTime) focusTime.classList.remove("hover");
  });

  // Prevent mode hover effects when hovering over interactive elements
  const interactiveElements = [
    ...modeContainer.querySelectorAll("button"),
    ...modeContainer.querySelectorAll("input"),
    ...modeContainer.querySelectorAll(".mode-controls"),
  ];

  interactiveElements.forEach((element) => {
    element.addEventListener("mouseenter", (_e) => {
      _e.stopPropagation();
      // Remove hover effects from mode elements
      if (clock) clock.classList.remove("hover");
      if (date) date.classList.remove("hover");
      if (stopwatchTime) stopwatchTime.classList.remove("hover");
      if (timerInput && _e.target !== timerInput)
        timerInput.classList.remove("hover");
      if (focusTitle) focusTitle.classList.remove("hover");
      if (focusTime) focusTime.classList.remove("hover");
    });

    element.addEventListener("mouseleave", (_e) => {
      // Re-add hover effects if still hovering over mode container
      if (modeContainer.matches(":hover")) {
        if (clock) clock.classList.add("hover");
        if (date) date.classList.add("hover");
        if (stopwatchTime) stopwatchTime.classList.add("hover");
        if (timerInput) timerInput.classList.add("hover");
        if (focusTitle) focusTitle.classList.add("hover");
        if (focusTime) focusTime.classList.add("hover");
      }
    });
  });

  // Click handler - switch modes (but not when clicking interactive elements)
  modeContainer.addEventListener("click", (e) => {
    // Check if the clicked element or any of its parents are interactive
    let target = e.target;
    while (target && target !== modeContainer) {
      // Don't switch mode if clicking on interactive elements
      if (
        target.tagName === "INPUT" ||
        target.tagName === "BUTTON" ||
        target.classList.contains("mode-controls") ||
        target.hasAttribute("contenteditable")
      ) {
        return;
      }
      target = target.parentElement;
    }

    switchMode();
  });

  console.log("[App] Mode system initialized");
}

function switchMode() {
  const previousMode = MODES[currentModeIndex];

  // Stop focus timer if leaving focus mode
  if (previousMode === "focus") {
    stopFocusTimer();
  }

  // Hide current mode
  const currentMode = document.getElementById(MODES[currentModeIndex]);
  if (currentMode) currentMode.classList.remove("active");

  // Move to next mode
  currentModeIndex = (currentModeIndex + 1) % MODES.length;
  const newModeName = MODES[currentModeIndex];

  // Show new mode
  const newMode = document.getElementById(newModeName);
  if (newMode) newMode.classList.add("active");

  // Auto-start focus timer if entering focus mode
  if (newModeName === "focus") {
    startFocusTimer();
  }

  console.log(`[App] Switched to mode: ${newModeName}`);
}

function setupStopwatch() {
  const startBtn = document.getElementById("stopwatch-start");
  const resetBtn = document.getElementById("stopwatch-reset");
  const timeDisplay = document.getElementById("stopwatch-time");

  if (!startBtn || !resetBtn || !timeDisplay) return;

  startBtn.addEventListener("click", () => {
    if (stopwatchInterval) {
      // Pause
      clearInterval(stopwatchInterval);
      stopwatchInterval = null;
      startBtn.textContent = "Start";
    } else {
      // Start
      stopwatchInterval = setInterval(() => {
        stopwatchTime += 10;
        updateStopwatchDisplay();
      }, 10);
      startBtn.textContent = "Pause";
    }
  });

  resetBtn.addEventListener("click", () => {
    stopwatchTime = 0;
    updateStopwatchDisplay();
    if (stopwatchInterval) {
      clearInterval(stopwatchInterval);
      stopwatchInterval = null;
      startBtn.textContent = "Start";
    }
  });

  function updateStopwatchDisplay() {
    const ms = Math.floor((stopwatchTime % 1000) / 10);
    const seconds = Math.floor(stopwatchTime / 1000) % 60;
    const minutes = Math.floor(stopwatchTime / 60000) % 60;
    const hours = Math.floor(stopwatchTime / 3600000);

    timeDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  }
}

function setupTimer() {
  const timerInput = document.getElementById("timer-input");
  const editBtn = document.getElementById("timer-edit");
  const startBtn = document.getElementById("timer-start");
  const stopBtn = document.getElementById("timer-stop");

  if (!timerInput || !editBtn || !startBtn || !stopBtn) return;

  // Timer starts locked by default
  let isTimerLocked = true;
  timerInput.readOnly = true;

  // Lock/unlock functionality
  editBtn.addEventListener("click", () => {
    isTimerLocked = !isTimerLocked;
    timerInput.readOnly = isTimerLocked;
    editBtn.textContent = isTimerLocked ? "🔒" : "🔓";
    editBtn.title = isTimerLocked
      ? "Click to unlock timer for editing"
      : "Click to lock timer";

    if (!isTimerLocked) {
      // Focus input when unlocked
      setTimeout(() => timerInput.focus(), 100);
    }

    console.log(`[App] Timer ${isTimerLocked ? "locked" : "unlocked"}`);
  });

  startBtn.addEventListener("click", () => {
    if (timerInterval) return; // Already running

    // Parse input (HH:MM:SS)
    const parts = timerInput.value.split(":").map((p) => parseInt(p) || 0);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;

    timerRemaining = (hours * 3600 + minutes * 60 + seconds) * 1000;

    if (timerRemaining <= 0) return;

    // Lock the timer and disable editing during countdown
    const wasLocked = isTimerLocked;
    isTimerLocked = true;
    timerInput.readOnly = true;
    editBtn.textContent = "🔒";
    editBtn.disabled = true;

    timerInterval = setInterval(() => {
      timerRemaining -= 1000;

      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        // Restore previous lock state
        isTimerLocked = wasLocked;
        timerInput.readOnly = isTimerLocked;
        editBtn.textContent = isTimerLocked ? "🔒" : "🔓";
        editBtn.disabled = false;
        console.log("[App] Timer finished!");
        // TODO: Play sound or notification
      }

      updateTimerDisplay();
    }, 1000);
  });

  stopBtn.addEventListener("click", () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      // Re-enable edit button
      editBtn.disabled = false;
    }
  });

  function updateTimerDisplay() {
    const totalSeconds = Math.floor(timerRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    timerInput.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}

function setupFocus() {
  // Focus mode is auto-controlled by switchMode
  // No buttons needed - starts automatically when mode is entered
}

function startFocusTimer() {
  // Reset timer
  focusTime = 0;
  updateFocusDisplay();

  // Start counting
  focusInterval = setInterval(() => {
    focusTime += 1000;
    updateFocusDisplay();
  }, 1000);

  console.log("[App] Focus timer started");
}

function stopFocusTimer() {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
    console.log(`[App] Focus session ended: ${formatFocusTime()}`);
  }
}

function updateFocusDisplay() {
  const focusTimeElement = document.getElementById("focus-time");
  if (focusTimeElement) {
    focusTimeElement.textContent = formatFocusTime();
  }
}

function formatFocusTime() {
  const totalSeconds = Math.floor(focusTime / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
