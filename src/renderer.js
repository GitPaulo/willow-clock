import { Application, Assets, Texture, Rectangle, AnimatedSprite, Text } from "../public/pixi.js";
import {
  initializeApp,
  setupAudioDetection,
  handleClick,
  setupTestFunctions,
} from "./utils.js";
import { onStateChange, getCurrentState } from "./state-machine.js";

// Sprite sheet configuration - add new sprites here
// Each sprite sheet should be a horizontal strip of frames (128px height)
// speed: animation speed (0.05 = very slow, 0.3 = fast)
// loop: true (continuous) or false (play once and hold last frame)
// scale: sprite size multiplier (0.5 = half, 1.0 = original, 2.0 = double)
const SPRITE_CONFIG = {
  day: {
    path: "../assets/animations/sprite_day.png",
    frames: 10,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.08,
    loop: true,
    scale: 2.5
  },
  night: {
    path: "../assets/animations/sprite_night.png",
    frames: 3,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.08,
    loop: true,
    scale: 2.5
  },
  music: {
    path: "../assets/animations/sprite_music.png",
    frames: 10,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.18,
    loop: true,
    scale: 2.5
  },
  pet: {
    path: "../assets/animations/sprite_pet.png",
    frames: 6,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.12,
    loop: false,
    scale: 2.5
  },
};

initializeApp();
setupAudioDetection();
setupTestFunctions();

async function loadSpriteAssets() {
  console.log("[Renderer] Loading sprite sheets...");

  const assetsToLoad = Object.entries(SPRITE_CONFIG).map(([state, config]) => ({
    alias: state,
    src: config.path
  }));

  await Assets.load(assetsToLoad);
  console.log("[Renderer] Sprite sheets loaded successfully");
} function createFramesFromSpriteSheet(state, config) {
  const baseTexture = Assets.get(state);
  const frames = [];

  for (let i = 0; i < config.frames; i++) {
    const frame = new Rectangle(
      i * config.frameWidth,
      0,
      config.frameWidth,
      config.frameHeight
    );
    frames.push(new Texture({ source: baseTexture.source, frame }));
  }

  return frames;
}

function createAnimatedSpriteAt(state, config, x, y) {
  const frames = createFramesFromSpriteSheet(state, config);
  const sprite = new AnimatedSprite(frames);

  sprite.anchor.set(0.5);
  sprite.x = x;
  sprite.y = y;
  sprite.animationSpeed = config.speed;
  sprite.loop = config.loop ?? true;
  sprite.scale.set(config.scale ?? 1.0);
  sprite.visible = false;
  sprite.play();

  return sprite;
}

function createSprites(app, centerX, centerY) {
  const sprites = {};

  for (const [state, config] of Object.entries(SPRITE_CONFIG)) {
    sprites[state] = createAnimatedSpriteAt(state, config, centerX, centerY);
    app.stage.addChild(sprites[state]);
    console.log(`[Renderer] Created sprite '${state}': ${config.frames} frames, speed=${config.speed}, loop=${config.loop}`);
  }

  return sprites;
}

function switchToSprite(sprites, state) {
  Object.values(sprites).forEach(s => s.visible = false);
  if (sprites[state]) sprites[state].visible = true;
}

function repositionSprites(sprites, centerX, centerY) {
  Object.values(sprites).forEach(sprite => {
    sprite.x = centerX;
    sprite.y = centerY;
  });
}

function createTitle(x, y) {
  const text = new Text({
    text: "Test speech!",
    style: {
      fontFamily: "PencilFont, Arial",
      fontSize: 20,
      fill: 0xffffff,
      align: "center",
    },
  });
  text.anchor.set(0.5);
  text.x = x;
  text.y = y;
  return text;
}

function updateStateInfo(state) {
  const element = document.getElementById("state-info");
  if (element) element.innerText = state;
}

async function initPixi() {
  console.log("[Renderer] Initializing PIXI.js...");
  try {
    const container = document.getElementById("pixi-container");
    const width = Math.floor(container.getBoundingClientRect().width) || 320;
    const height = Math.floor(container.getBoundingClientRect().height) || 240;

    const app = new Application();
    await app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: container,
    });

    container.appendChild(app.canvas);
    container.style.background = "rgba(255, 255, 255, 0.15)";
    app.canvas.style.cursor = "pointer";
    app.canvas.addEventListener("click", handleClick);

    let centerX = width / 2;
    let centerY = height / 2;

    await loadSpriteAssets();
    const sprites = createSprites(app, centerX, centerY);
    switchToSprite(sprites, getCurrentState());

    const title = createTitle(centerX, centerY + height * 0.25);
    app.stage.addChild(title);

    app.renderer.on("resize", () => {
      centerX = app.screen.width / 2;
      centerY = app.screen.height / 2;
      title.x = centerX;
      title.y = centerY + app.screen.height * 0.25;
      repositionSprites(sprites, centerX, centerY);
    });

    onStateChange((newState) => {
      console.log(`[Renderer] State changed to: ${newState}`);
      switchToSprite(sprites, newState);
      updateStateInfo(newState);
    });

    updateStateInfo(getCurrentState());
    console.log("[Renderer] PIXI.js initialization complete");
  } catch (error) {
    console.error("[Renderer] ERROR: PIXI.js initialization failed:", error);
    createFallbackAnimation();
  }
}

function createFallbackAnimation() {
  document.getElementById("pixi-container").innerHTML = `
    <div style="width: 100%; height: 100%; background: rgba(167, 167, 167, 0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px;">
      <div style="width: 60px; height: 60px; background: gold; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); animation: spin 3s linear infinite;"></div>
      <p style="color: white; margin-top: 20px;">Willow fallback</p>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", initPixi)
  : initPixi();
