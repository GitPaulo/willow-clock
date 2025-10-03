// State machine for Willow Clock
// Base states (Day/Night) driven by time, overlay states (Music/Pet) are temporary

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
  current: STATES.DAY,
  stateStack: [],
  listeners: [],
};

const isBaseState = (s) => s === STATES.DAY || s === STATES.NIGHT;
const isOverlayState = (s) => s === STATES.MUSIC || s === STATES.PET;

export function getCurrentState() {
  return state.current;
}

export function getStateConfig() {
  return STATE_CONFIGS[state.current];
}

export function onStateChange(callback) {
  state.listeners.push(callback);
}

function transitionTo(newState) {
  if (state.current === newState) return;
  const oldState = state.current;
  state.current = newState;
  console.log(`[StateMachine] Transition: ${oldState} -> ${newState}`);
  state.listeners.forEach((callback) => callback(newState));
}

function transitionToBaseState(baseState) {
  if (!isBaseState(baseState)) return;

  // Update stack base if in overlay state
  if (isOverlayState(state.current) && state.stateStack.length > 0) {
    state.stateStack[0] = baseState;
    return;
  }

  transitionTo(baseState);
}

function transitionToOverlayState(overlayState) {
  if (!isOverlayState(overlayState)) return;
  state.stateStack.push(state.current);
  transitionTo(overlayState);
}

function exitOverlayState() {
  if (!isOverlayState(state.current)) return;
  const previousState = state.stateStack.pop() || STATES.DAY;
  transitionTo(previousState);
}

export function updateBaseStateFromTime() {
  const hours = new Date().getHours();
  const baseState = hours >= 6 && hours < 18 ? STATES.DAY : STATES.NIGHT;
  transitionToBaseState(baseState);
}

export function triggerPet() {
  transitionToOverlayState(STATES.PET);
  setTimeout(() => {
    if (state.current === STATES.PET) exitOverlayState();
  }, 300);
}

export function setMusicActive(isActive) {
  if (isActive && state.current !== STATES.MUSIC) {
    transitionToOverlayState(STATES.MUSIC);
  } else if (!isActive && state.current === STATES.MUSIC) {
    exitOverlayState();
  }
}

export function initializeState() {
  updateBaseStateFromTime();
}
