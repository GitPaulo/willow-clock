import { isDayTime } from "../util/utils.js";

const STATES = {
  DAY: "day",
  NIGHT: "night",
  MUSIC: "music",
  PET: "pet",
};

const STATE_CONFIGS = {
  [STATES.DAY]: { speed: 0.015, color: 0xffd700 },
  [STATES.NIGHT]: { speed: 0.008, color: 0x9370db },
  [STATES.MUSIC]: { speed: 0.04, color: 0xff6b6b },
  [STATES.PET]: { speed: 0.08, color: 0x00ff88 },
};

const state = {
  current: null, // Will be set during initialization
  previousState: null,
  listeners: [],
};

const isTemporaryState = (s) => s === STATES.MUSIC || s === STATES.PET;

export function getCurrentState() {
  return state.current;
}

export function getStateConfig() {
  return STATE_CONFIGS[state.current];
}

export function onStateChange(callback) {
  state.listeners.push(callback);
}

function notifyStateChange(newState, oldState) {
  console.log(
    `[StateMachine] ${oldState ? `${oldState} ->` : "Init:"} ${newState}`,
  );
  state.listeners.forEach((callback) => callback(newState));
}

function changeState(newState, force = false) {
  if (!force && state.current === newState) return;

  const oldState = state.current;
  state.previousState = oldState;
  state.current = newState;

  notifyStateChange(newState, oldState);
}

// Initialize state machine with settings
export function initializeState(dayStart = 6, dayEnd = 18) {
  const initialState = isDayTime(dayStart, dayEnd) ? STATES.DAY : STATES.NIGHT;
  changeState(initialState, true); // Force initial state change
}

// Update day/night based on current time and settings
export function updateDayNightState(dayStart = 6, dayEnd = 18) {
  const desiredState = isDayTime(dayStart, dayEnd) ? STATES.DAY : STATES.NIGHT;

  // If in temporary state, update the previous state instead
  if (isTemporaryState(state.current)) {
    state.previousState = desiredState;
    return;
  }

  changeState(desiredState);
}

// Trigger pet animation
export function triggerPet() {
  if (!isTemporaryState(state.current)) {
    state.previousState = state.current;
  }
  changeState(STATES.PET);
}

// Exit temporary state
export function exitTemporaryState() {
  if (!isTemporaryState(state.current)) return;
  changeState(state.previousState);
}

// Set music state
export function setMusicActive(isActive) {
  if (isActive) {
    if (!isTemporaryState(state.current)) {
      state.previousState = state.current;
    }
    changeState(STATES.MUSIC);
  } else if (state.current === STATES.MUSIC) {
    exitTemporaryState();
  }
}
