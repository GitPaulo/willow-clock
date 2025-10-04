import { spawn } from "child_process";
import { platform } from "os";

let audioProcess = null;
let isAudioActive = false;
let mainWindow = null;
function initSystemAudio(window) {
  mainWindow = window;

  const os = platform();
  console.log(
    "[MainAudio] Initializing system audio detection for platform:",
    os,
  );

  try {
    if (os === "win32") {
      return startWindowsAudioDetection();
    } else if (os === "linux") {
      return startLinuxAudioDetection();
    } else {
      console.log("[MainAudio] System audio not supported on platform:", os);
      return false;
    }
  } catch (error) {
    console.log("[MainAudio] System audio detection failed:", error.message);
    return false;
  }
}

// Windows WASAPI detection
function startWindowsAudioDetection() {
  console.log("[MainAudio] Starting Windows audio detection...");

  // Use PowerShell to monitor system audio
  const script = `
    Add-Type -TypeDefinition @"
      using System;
      using System.Runtime.InteropServices;
      public class AudioDetector {
        [DllImport("winmm.dll")]
        public static extern int waveOutGetVolume(IntPtr hwo, out uint dwVolume);
        public static bool HasAudio() {
          uint volume;
          int result = waveOutGetVolume(IntPtr.Zero, out volume);
          return volume > 0;
        }
      }
    "@
    
    while($true) {
      $hasAudio = [AudioDetector]::HasAudio()
      Write-Output $hasAudio
      Start-Sleep -Milliseconds 500
    }
  `;

  audioProcess = spawn("powershell", ["-Command", script]);

  audioProcess.stdout.on("data", (data) => {
    const hasAudio = data.toString().trim() === "True";
    updateAudioState(hasAudio);
  });

  audioProcess.on("error", (error) => {
    console.log(
      "[MainAudio] ERROR: Windows audio detection failed:",
      error.message,
    );
  });

  return true;
}

// Linux PulseAudio detection
function startLinuxAudioDetection() {
  console.log("[MainAudio] Starting Linux audio detection...");

  // Use pactl to monitor audio
  audioProcess = spawn("bash", [
    "-c",
    `
    while true; do
      # Check if any sink is playing audio
      pactl list sinks | grep -q "State: RUNNING" && echo "true" || echo "false"
      sleep 0.5
    done
  `,
  ]);

  audioProcess.stdout.on("data", (data) => {
    const hasAudio = data.toString().trim() === "true";
    updateAudioState(hasAudio);
  });

  audioProcess.on("error", (error) => {
    console.log(
      "[MainAudio] ERROR: Linux audio detection failed:",
      error.message,
    );
    console.log(
      "[MainAudio] Install required package: sudo apt install pulseaudio-utils",
    );
  });

  return true;
}

// Update audio state and notify renderer
function updateAudioState(newState) {
  if (isAudioActive !== newState) {
    isAudioActive = newState;
    console.log(
      `[MainAudio] Audio state changed: ${newState ? "playing" : "stopped"}`,
    );

    // Send to renderer process
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("audio-state-changed", newState);
    }
  }
}

// Cleanup
function stopSystemAudio() {
  if (audioProcess) {
    audioProcess.kill();
    audioProcess = null;
  }
}

// Manual toggle for testing
function toggleSystemAudio() {
  updateAudioState(!isAudioActive);
  return isAudioActive;
}

export { initSystemAudio, stopSystemAudio, toggleSystemAudio };
