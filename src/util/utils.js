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

export function parseYAML(yamlText) {
  const result = {};
  const lines = yamlText.split("\n");
  let currentCategory = null;
  let currentSubCategory = null;
  let baseIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.search(/\S/);
    const isCategory = trimmed.endsWith(":") && !trimmed.startsWith("-");
    const isMessage = trimmed.startsWith('- "') && trimmed.endsWith('"');

    if (isCategory) {
      const key = trimmed.slice(0, -1);

      if (indent === 0) {
        // Top-level category
        currentCategory = key;
        currentSubCategory = null;
        result[currentCategory] = [];
        baseIndent = indent;
      } else if (indent > baseIndent && currentCategory) {
        // Subcategory
        currentSubCategory = key;
        if (Array.isArray(result[currentCategory])) {
          result[currentCategory] = {};
        }
        result[currentCategory][currentSubCategory] = [];
      }
    } else if (isMessage && currentCategory) {
      const message = trimmed.slice(3, -1);

      if (currentSubCategory) {
        result[currentCategory][currentSubCategory].push(message);
      } else if (Array.isArray(result[currentCategory])) {
        result[currentCategory].push(message);
      }
    }
  }

  return result;
}
