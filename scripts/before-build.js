/**
 * Pre-build hook for electron-builder
 * Removes platform-specific dependencies on non-matching platforms
 */

import { platform } from "os";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import { resolve } from "path";

export default async function beforeBuild() {
  const currentPlatform = platform();

  // Remove Windows-specific dependencies on non-Windows platforms
  if (currentPlatform !== "win32") {
    const windowsModulePath = resolve(
      "./node_modules/@nodert-win10-20h1/windows.media.control",
    );

    if (existsSync(windowsModulePath)) {
      console.log(
        "Removing Windows-specific module on non-Windows platform...",
      );
      await rm(windowsModulePath, { recursive: true, force: true });
      console.log("Windows module removed successfully.");
    }
  }

  console.log("Pre-build checks complete.");
}
