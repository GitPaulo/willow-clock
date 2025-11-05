// Pre-build hook for electron-builder
// Removes platform-specific dependencies on non-matching platforms
// Copies required assets (PixiJS and FontAwesome) to public directory

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { cp, rm } from "fs/promises";
import { platform } from "os";
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

  // Copy PixiJS
  const pixiSrc = resolve("./node_modules/pixi.js/dist/pixi.mjs");
  const pixiDest = resolve("./public/pixi.js");

  if (existsSync(pixiSrc) && !existsSync(pixiDest)) {
    console.log("Copying PixiJS...");
    copyFileSync(pixiSrc, pixiDest);
    console.log("✓ PixiJS copied to public/pixi.js");
  }

  // Copy FontAwesome
  const fontawesomeSrc = resolve(
    "./node_modules/@fortawesome/fontawesome-free",
  );
  const fontawesomeDest = resolve("./public/fontawesome");

  if (existsSync(fontawesomeSrc) && !existsSync(fontawesomeDest)) {
    console.log("Copying FontAwesome assets...");

    mkdirSync(fontawesomeDest, { recursive: true });

    await cp(resolve(fontawesomeSrc, "css"), resolve(fontawesomeDest, "css"), {
      recursive: true,
      force: true,
    });
    await cp(
      resolve(fontawesomeSrc, "webfonts"),
      resolve(fontawesomeDest, "webfonts"),
      {
        recursive: true,
        force: true,
      },
    );

    console.log("✓ FontAwesome assets copied to public/fontawesome");
  }

  console.log("Pre-build checks complete.");
}
