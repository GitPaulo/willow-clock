import {
  Application,
  Assets,
  Texture,
  Rectangle,
  AnimatedSprite,
  Text,
  Graphics,
  Container,
} from "../public/pixi.js";
import { initializeApp, handleClick } from "./app.js";
import { onStateChange, getCurrentState } from "./state-machine.js";
import { initTextSound, playTextBeepSoft } from "./audio/text-audio.js";
import { getSetting } from "./settings.js";

// Sprite sheet configuration - add new sprites here
// Each sprite sheet should be a horizontal strip of frames (128px height)
// speed: animation speed (0.05 = very slow, 0.3 = fast)
// loop: true (continuous) or false (play once and hold last frame)
// scale: sprite size multiplier (0.5 = half, 1.0 = original, 2.0 = double)
const SPRITE_CONFIG = {
  day: {
    path: "./assets/animations/sprite_day.png",
    frames: 10,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.08,
    loop: true,
    scale: 2.5,
  },
  night: {
    path: "./assets/animations/sprite_night.png",
    frames: 3,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.08,
    loop: true,
    scale: 2.5,
  },
  music: {
    path: "./assets/animations/sprite_music.png",
    frames: 10,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.18,
    loop: true,
    scale: 2.5,
  },
  pet: {
    path: "./assets/animations/sprite_pet.png",
    frames: 6,
    frameWidth: 128,
    frameHeight: 128,
    speed: 0.12,
    loop: false,
    scale: 2.5,
  },
};

// Speech box configuration
const SPEECH_CONFIG = {
  width: 320, // Wider and more rectangular
  backgroundColor: 0x2c2a2f, // Dark grey matching titlebar
  borderColor: 0xffffff,
  borderAlpha: 0.2,
  borderWidth: 1,
  cornerRadius: 6, // Less rounded for more rectangular look
  padding: 12,
  bottomMargin: 20, // Margin from bottom edge
  textStyle: {
    fontFamily: "PencilFont, Arial",
    fontSize: 14,
    fill: 0xffffff,
    align: "left",
    wordWrap: true,
    wordWrapWidth: 296, // width - (padding * 2)
    lineHeight: 18,
  },
  typewriterSpeed: 50, // milliseconds per character
  soundEnabled: true, // Enable typewriter sound effects
  get height() {
    return this.textStyle.lineHeight + this.padding * 2; // Height based on line height + padding
  },
};

// Speech messages loaded from YAML
let SPEECH_MESSAGES = {};

// Load speech messages from YAML file
async function loadSpeechMessages() {
  try {
    const response = await fetch("./speech-messages.yml");
    const yamlText = await response.text();

    // Parse YAML - simple manual parsing for basic structure
    SPEECH_MESSAGES = parseSimpleYAML(yamlText);
    console.log("[Renderer] Speech messages loaded from YAML");
  } catch (error) {
    console.error("[Renderer] Failed to load speech messages:", error);
    // Fallback messages
    SPEECH_MESSAGES = {
      greeting: ["Hello there!"],
      pet: ["That tickles!"],
      music: ["I can hear the music too!"],
      time: ["Time keeps flowing..."],
    };
  }
}

// Simple YAML parser for our basic structure
function parseSimpleYAML(yamlText) {
  const messages = {};
  const lines = yamlText.split("\n");
  let currentCategory = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.endsWith(":") && !trimmed.startsWith("-")) {
      // Category line
      currentCategory = trimmed.slice(0, -1);
      messages[currentCategory] = [];
    } else if (trimmed.startsWith('- "') && trimmed.endsWith('"')) {
      // Message line
      if (currentCategory) {
        const message = trimmed.slice(3, -1); // Remove '- "' and '"'
        messages[currentCategory].push(message);
      }
    }
  }

  return messages;
}

initializeApp();
loadSpeechMessages();

async function loadSpriteAssets() {
  console.log("[Renderer] Loading sprite sheets...");

  const assetsToLoad = Object.entries(SPRITE_CONFIG).map(([state, config]) => ({
    alias: state,
    src: config.path,
  }));

  await Assets.load(assetsToLoad);
  console.log("[Renderer] Sprite sheets loaded successfully");
}
function createFramesFromSpriteSheet(state, config) {
  const baseTexture = Assets.get(state);
  const frames = [];

  for (let i = 0; i < config.frames; i++) {
    const frame = new Rectangle(
      i * config.frameWidth,
      0,
      config.frameWidth,
      config.frameHeight,
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
    console.log(
      `[Renderer] Created sprite '${state}': ${config.frames} frames, speed=${config.speed}, loop=${config.loop}`,
    );
  }

  return sprites;
}

function switchToSprite(sprites, state) {
  Object.values(sprites).forEach((s) => (s.visible = false));
  if (sprites[state]) sprites[state].visible = true;
}

function repositionSprites(sprites, centerX, centerY) {
  Object.values(sprites).forEach((sprite) => {
    sprite.x = centerX;
    sprite.y = centerY;
  });
}

function createSpeechBox(x, y) {
  const container = new Container();

  // Create background with rounded rectangle
  const background = new Graphics();
  background
    .rect(0, 0, SPEECH_CONFIG.width, SPEECH_CONFIG.height)
    .fill({ color: SPEECH_CONFIG.backgroundColor })
    .stroke({
      color: SPEECH_CONFIG.borderColor,
      alpha: SPEECH_CONFIG.borderAlpha,
      width: SPEECH_CONFIG.borderWidth,
    });

  // Create text object
  const textObj = new Text({
    text: "",
    style: SPEECH_CONFIG.textStyle,
  });
  textObj.x = SPEECH_CONFIG.padding;
  textObj.y = SPEECH_CONFIG.padding;

  // Add to container
  container.addChild(background);
  container.addChild(textObj);

  // Position container
  container.x = x - SPEECH_CONFIG.width / 2;
  container.y = y;
  container.visible = false;

  // Add typewriter functionality
  container.typewriterData = {
    fullText: "",
    currentText: "",
    currentIndex: 0,
    isTyping: false,
    textObj: textObj,
  };

  return container;
}

function getRandomSpeech(category) {
  const messages = SPEECH_MESSAGES[category];
  if (!messages || messages.length === 0) return `No messages for ${category}`;
  return messages[Math.floor(Math.random() * messages.length)];
}

function startTypewriter(speechBox, text) {
  const data = speechBox.typewriterData;

  // Reset if already typing
  if (data.isTyping) {
    clearInterval(data.typewriterInterval);
  }

  data.fullText = text;
  data.currentText = "";
  data.currentIndex = 0;
  data.isTyping = true;
  data.textObj.text = "";
  speechBox.visible = true;

  data.typewriterInterval = setInterval(() => {
    if (data.currentIndex < data.fullText.length) {
      const char = data.fullText[data.currentIndex];
      data.currentText += char;
      data.textObj.text = data.currentText;
      data.currentIndex++;

      // Play sound effect for visible characters (not spaces)
      if (SPEECH_CONFIG.soundEnabled && char !== " " && char !== "\n") {
        playTextBeepSoft();
      }
    } else {
      clearInterval(data.typewriterInterval);
      data.isTyping = false;

      // Auto-hide based on word count (min 2 seconds, +0.5s per word)
      const wordCount = data.fullText.trim().split(/\s+/).length;
      const fadeDelay = Math.max(2000, wordCount * 500); // 500ms per word, min 2s

      setTimeout(() => {
        if (!data.isTyping) {
          speechBox.visible = false;
        }
      }, fadeDelay);
    }
  }, SPEECH_CONFIG.typewriterSpeed);
}

function updateStateInfo(state) {
  const element = document.getElementById("state-info");
  if (element) element.innerText = state;
}

function updateFPSInfo(fps) {
  const element = document.getElementById("fps-info");
  if (element) element.innerText = fps;
}

async function initPixi() {
  console.log("[Renderer] Initializing PIXI.js...");
  try {
    const container = document.getElementById("pixi-container");
    const width = Math.max(
      Math.floor(container.getBoundingClientRect().width) || 340,
      340,
    );
    const height = Math.max(
      Math.floor(container.getBoundingClientRect().height) || 220,
      220,
    );

    const app = new Application();
    await app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: container,
    });

    // Apply FPS target from settings
    const fpsTarget = getSetting("fpsTarget", 60);
    if (app.ticker) {
      app.ticker.maxFPS = fpsTarget;
      console.log(`[Renderer] FPS target set to: ${fpsTarget}`);
    }

    container.appendChild(app.canvas);
    container.style.background = "rgba(255, 255, 255, 0.15)";
    app.canvas.style.cursor = "pointer";
    app.canvas.addEventListener("click", (event) => {
      // Initialize text audio on first click (required for browser autoplay policy)
      initTextSound();
      handleClick(event);
    });

    let centerX = width / 2;
    let centerY = height / 2;

    await loadSpriteAssets();
    const sprites = createSprites(app, centerX, centerY);
    switchToSprite(sprites, getCurrentState());

    const speechBox = createSpeechBox(
      centerX,
      height - SPEECH_CONFIG.height - SPEECH_CONFIG.bottomMargin,
    );
    app.stage.addChild(speechBox);

    // Expose globally for testing and external use
    window.speechBox = speechBox;
    window.startTypewriter = startTypewriter;
    window.getRandomSpeech = getRandomSpeech;

    app.renderer.on("resize", () => {
      centerX = app.screen.width / 2;
      centerY = app.screen.height / 2;
      repositionSprites(sprites, centerX, centerY);
      speechBox.x = centerX - SPEECH_CONFIG.width / 2;
      speechBox.y =
        app.screen.height - SPEECH_CONFIG.height - SPEECH_CONFIG.bottomMargin;
    });

    onStateChange((newState) => {
      console.log(`[Renderer] State changed to: ${newState}`);
      switchToSprite(sprites, newState);
      updateStateInfo(newState);

      // Trigger speech for certain state changes
      if (newState === "pet") {
        startTypewriter(speechBox, getRandomSpeech("pet"));
      } else if (newState === "music") {
        startTypewriter(speechBox, getRandomSpeech("music"));
      }
    });

    // Track and display FPS
    let lastTime = performance.now();
    let frameCount = 0;
    app.ticker.add(() => {
      frameCount++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        updateFPSInfo(fps);
        frameCount = 0;
        lastTime = now;
      }
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
