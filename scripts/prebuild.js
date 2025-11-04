/**
 * Cross-platform prebuild script
 * Copies dependencies (PixiJS and FontAwesome) to public directory
 */

import { existsSync, mkdirSync, copyFileSync } from "fs";
import { cp } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function prebuild() {
  console.log("Running prebuild tasks...\n");

  // 1. Copy PixiJS
  const pixiSrc = resolve(__dirname, "../node_modules/pixi.js/dist/pixi.mjs");
  const pixiDest = resolve(__dirname, "../public/pixi.js");

  if (!existsSync(pixiSrc)) {
    console.error("Error: PixiJS not found in node_modules!");
    process.exit(1);
  }

  console.log("Copying PixiJS...");
  copyFileSync(pixiSrc, pixiDest);
  console.log("✓ PixiJS copied to public/pixi.js\n");

  // 2. Copy FontAwesome
  const fontawesomeSrc = resolve(
    __dirname,
    "../node_modules/@fortawesome/fontawesome-free",
  );
  const fontawesomeDest = resolve(__dirname, "../public/fontawesome");

  if (!existsSync(fontawesomeSrc)) {
    console.error("Error: FontAwesome not found in node_modules!");
    process.exit(1);
  }

  console.log("Copying FontAwesome assets...");

  // Create destination directory if it doesn't exist
  if (!existsSync(fontawesomeDest)) {
    mkdirSync(fontawesomeDest, { recursive: true });
  }

  try {
    // Copy CSS and webfonts directories
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

    console.log("✓ FontAwesome assets copied to public/fontawesome\n");
  } catch (error) {
    console.error("Error copying FontAwesome:", error);
    process.exit(1);
  }

  console.log("Prebuild tasks completed successfully!");
}

prebuild();
