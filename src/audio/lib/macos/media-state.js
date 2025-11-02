#!/usr/bin/env node
// macOS media state detection using CoreAudio API via Swift
// Outputs JSON: {"playing":true,"sources":[]}

import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SWIFT_TIMEOUT_MS = 3000; // 3 second timeout for Swift execution

async function getMediaState() {
  const result = { playing: false, sources: [] };

  try {
    // Path to the compiled Swift executable
    const executablePath = join(__dirname, "is-playing-audio");

    // Execute Swift binary with timeout
    const { stdout } = await execFileAsync(executablePath, [], {
      timeout: SWIFT_TIMEOUT_MS,
      encoding: "utf8",
    });

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
