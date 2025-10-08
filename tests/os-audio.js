import os from "os";
import { execFile } from "child_process";
import path from "path";

const POLL_INTERVAL = 3000; // ms
const ROOT = path.resolve("./src/audio/lib");

// platform-specific targets
const WINDOWS_MEDIA_STATE = path.resolve("./bin/MediaState.exe");
const LINUX_MEDIA_STATE = path.join(ROOT, "linux", "media-state.js");

async function getMediaStateWindows() {
  return new Promise((resolve) => {
    console.debug("[win] Starting media state check...");

    const timeout = setTimeout(() => {
      console.error("[win] timeout after 10 seconds");
      resolve({ playing: false, sources: [] });
    }, 10000); // 10 second timeout

    // Check if we're dealing with UNC path (WSL from Windows)
    const isUNCPath = WINDOWS_MEDIA_STATE.includes("\\\\wsl.localhost");

    if (isUNCPath) {
      // Use PowerShell to run the executable from UNC path
      const psCommand = `& '${WINDOWS_MEDIA_STATE}'`;
      console.debug("[win] Using PowerShell for UNC path");

      execFile("powershell", ["-Command", psCommand], (err, stdout, stderr) => {
        clearTimeout(timeout);

        if (err) {
          console.error("[win] error:", err.message);
          resolve({ playing: false, sources: [] });
          return;
        }
        if (stderr) console.error("[win] stderr:", stderr.trim());
        try {
          const result = JSON.parse(stdout);
          console.debug("[win] success:", result);
          resolve(result);
        } catch (e) {
          console.error("[win] parse error:", e.message);
          resolve({ playing: false, sources: [] });
        }
      });
    } else {
      // Regular local path execution
      execFile(WINDOWS_MEDIA_STATE, (err, stdout, stderr) => {
        clearTimeout(timeout);

        if (err) {
          console.error("[win] error:", err.message);
          resolve({ playing: false, sources: [] });
          return;
        }
        if (stderr) console.error("[win] stderr:", stderr.trim());
        try {
          const result = JSON.parse(stdout);
          console.debug("[win] success:", result);
          resolve(result);
        } catch (e) {
          console.error("[win] parse error:", e.message);
          resolve({ playing: false, sources: [] });
        }
      });
    }
  });
}

async function getMediaStateLinux() {
  return new Promise((resolve) => {
    console.debug("[linux] Starting media state check...");

    const timeout = setTimeout(() => {
      console.error("[linux] timeout after 10 seconds");
      resolve({ playing: false, sources: [] });
    }, 10000); // 10 second timeout

    execFile("node", [LINUX_MEDIA_STATE], (err, stdout, stderr) => {
      clearTimeout(timeout);

      if (err) {
        console.error("[linux] error:", err.message);
        resolve({ playing: false, sources: [] });
        return;
      }
      if (stderr) console.error("[linux] stderr:", stderr.trim());
      try {
        const result = JSON.parse(stdout);
        console.debug("[linux] success:", result);
        resolve(result);
      } catch (e) {
        console.error("[linux] parse error:", e.message);
        resolve({ playing: false, sources: [] });
      }
    });
  });
}

async function getMediaState() {
  const platform = os.platform();
  if (platform === "win32") return await getMediaStateWindows();
  if (platform === "linux") return await getMediaStateLinux();
  throw new Error("Unsupported platform: " + platform);
}

async function main() {
  console.log("Starting cross-platform media detection. Press Ctrl+C to exit.");

  while (true) {
    const start = Date.now();
    try {
      const state = await getMediaState();
      console.log(
        `Media playing: ${state.playing} | Sources: [${state.sources.join(", ")}]`,
      );
    } catch (err) {
      console.error("[main] error:", err.message);
    }

    const took = Date.now() - start;
    console.debug(`[sys] cycle took ${took}ms`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
}

main().catch((err) => console.error("[fatal]", err));
