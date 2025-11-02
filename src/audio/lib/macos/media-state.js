#!/usr/bin/env node
// macOS media state detection using JXA (JavaScript for Automation)
// Outputs JSON: {"playing":true,"sources":["Music","Spotify"]}

import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JXA_TIMEOUT_MS = 3000; // 3 second timeout for JXA execution

async function getMediaState() {
  const result = { playing: false, sources: [] };

  try {
    // Path to the JXA (JavaScript for Automation) script file
    const scriptPath = join(__dirname, "media-check.js");

    // Execute JXA script with timeout
    const { stdout } = await execFileAsync(
      "osascript",
      ["-l", "JavaScript", scriptPath],
      {
        timeout: JXA_TIMEOUT_MS,
        encoding: "utf8",
      },
    );

    // Parse JSON output
    const parsed = JSON.parse(stdout.trim());
    result.playing = Boolean(parsed.playing);
    result.sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  } catch {
    // Fail silently, return default state
  }

  return result;
}

// Execute and output JSON
(async () => {
  const state = await getMediaState();
  console.log(JSON.stringify(state));
})();
