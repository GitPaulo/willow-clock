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

// Current sprite state
const state = {
  current: STATES.DAY,
  previousState: STATES.DAY,
  listeners: [],
};

// Temporary states that return to previous state (music/pet)
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

function changeState(newState) {
  if (state.current === newState) return;

  const oldState = state.current;
  state.previousState = oldState;
  state.current = newState;

  console.log(`[StateMachine] Transition: ${oldState} -> ${newState}`);
  state.listeners.forEach((callback) => callback(newState));
}

// Update day/night based on current time
export function updateDayNightState(dayStart = 6, dayEnd = 18) {
  const newState = isDayTime(dayStart, dayEnd) ? STATES.DAY : STATES.NIGHT;

  // If in temporary state (music/pet), update the previous state instead
  if (isTemporaryState(state.current)) {
    state.previousState = newState;
    return;
  }

  changeState(newState);
}

// Trigger pet animation (temporary state)
export function triggerPet() {
  // Save current state to return to later
  if (!isTemporaryState(state.current)) {
    state.previousState = state.current;
  }
  changeState(STATES.PET);
}

// Exit temporary state back to previous state
export function exitTemporaryState() {
  if (!isTemporaryState(state.current)) return;
  changeState(state.previousState);
}

// Set music state active/inactive
export function setMusicActive(isActive) {
  if (isActive) {
    // Save current state to return to later
    if (!isTemporaryState(state.current)) {
      state.previousState = state.current;
    }
    changeState(STATES.MUSIC);
  } else if (state.current === STATES.MUSIC) {
    exitTemporaryState();
  }
}

// Initialize state machine
export function initializeState() {
  updateDayNightState();
}
