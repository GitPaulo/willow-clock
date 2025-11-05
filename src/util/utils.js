// Internal modules
import { MODE, MODES } from "../render/constants.js";

export { MODE, MODES };

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

export function isNightTime(dayStart = 6, dayEnd = 18) {
  const hours = new Date().getHours();
  return hours < dayStart || hours >= dayEnd;
}

export function isDayTime(dayStart = 6, dayEnd = 18) {
  return !isNightTime(dayStart, dayEnd);
}

export function formatClockTime(date, is24Hour = true) {
  if (is24Hour) {
    // 24-hour format: HH:MM:SS
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  } else {
    // 12-hour format: H:MM:SS AM/PM
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? "PM" : "AM";

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${ampm}`;
  }
}

export function flashElement(element, duration = 6000) {
  if (!element) return;

  const originalStyle = {
    color: element.style.color || "",
    textShadow: element.style.textShadow || "",
    transition: element.style.transition || "",
  };

  // Soft orange flash color (matches app theme)
  const flashColor = "#ff9966";
  const flashInterval = 500; // Flash every 500ms (12 flashes over 6 seconds)

  element.style.transition = "all 0.2s ease";
  let flashCount = 0;
  const maxFlashes = Math.floor(duration / flashInterval);

  const timer = setInterval(() => {
    const isFlashOn = flashCount % 2 === 0;

    if (isFlashOn) {
      element.style.color = flashColor;
      element.style.textShadow = `0 0 15px ${flashColor}, 2px 2px 4px rgba(0, 0, 0, 0.3)`;
    } else {
      element.style.color = originalStyle.color;
      element.style.textShadow = originalStyle.textShadow;
    }

    flashCount++;
    if (flashCount >= maxFlashes) {
      clearInterval(timer);
      // Restore original styling
      Object.assign(element.style, originalStyle);
    }
  }, flashInterval);
}

export function parseYAML(yamlText) {
  const result = {};
  const lines = yamlText.split("\n");
  let currentCategory = null;
  let currentSubCategory = null;
  let currentSubSubCategory = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.search(/\S/);
    const isCategory = trimmed.endsWith(":") && !trimmed.startsWith("-");
    const isMessage = trimmed.startsWith('- "') && trimmed.endsWith('"');

    if (isCategory) {
      const key = trimmed.slice(0, -1);

      if (indent === 0) {
        // Top-level category (e.g., modes, weather)
        currentCategory = key;
        currentSubCategory = null;
        currentSubSubCategory = null;
        result[currentCategory] = {};
      } else if (indent === 2 && currentCategory) {
        // Second-level (e.g., clock, stopwatch)
        currentSubCategory = key;
        currentSubSubCategory = null;
        result[currentCategory][currentSubCategory] = {};
      } else if (indent === 4 && currentSubCategory) {
        // Third-level (e.g., switch, start, stop)
        currentSubSubCategory = key;
        result[currentCategory][currentSubCategory][currentSubSubCategory] = [];
      }
    } else if (isMessage) {
      const message = trimmed.slice(3, -1);

      if (currentSubSubCategory) {
        // Three-level nesting
        result[currentCategory][currentSubCategory][currentSubSubCategory].push(
          message,
        );
      } else if (currentSubCategory) {
        // Two-level nesting
        if (!Array.isArray(result[currentCategory][currentSubCategory])) {
          result[currentCategory][currentSubCategory] = [];
        }
        result[currentCategory][currentSubCategory].push(message);
      } else if (currentCategory) {
        // Top-level messages
        if (!Array.isArray(result[currentCategory])) {
          result[currentCategory] = [];
        }
        result[currentCategory].push(message);
      }
    }
  }

  return result;
}
