// Pure utility functions only

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

export function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
