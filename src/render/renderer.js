import {
  Application,
  Assets,
  Texture,
  Rectangle,
  AnimatedSprite,
  Text,
  Graphics,
  Container,
} from "../../public/pixi.js";
import { onStateChange, getCurrentState } from "./state-machine.js";
import { parseYAML } from "../util/utils.js";
import { initTextSound, scheduleTypewriterBeeps } from "../audio/text-audio.js";
import { getSetting } from "../settings.js";

// Sprite sheet configuration
// speed: animation speed (0.05 = very slow, 0.3 = fast)
// loop: true (continuous) or false (play once and hold last frame)
// scale: sprite size multiplier (0.5 = half, 1.0 = original, 2.0 = double)
const SPRITE_CONFIG = {
  day: {
    path: "./assets/animations/sprite_day.png",
    frames: 25,
    frameWidth: 110,
    frameHeight: 120,
    speed: 0.15,
    loop: true,
    scale: 2.2,
  },
  night: {
    path: "./assets/animations/sprite_night.png",
    frames: 15,
    frameWidth: 126,
    frameHeight: 120,
    speed: 0.15,
    loop: true,
    scale: 1.6,
  },
  music: {
    path: "./assets/animations/sprite_music.png",
    frames: 22,
    frameWidth: 181,
    frameHeight: 125,
    speed: 0.15,
    loop: true,
    scale: 1.6,
  },
  pet: {
    path: "./assets/animations/sprite_pet.png",
    frames: 45,
    frameWidth: 110,
    frameHeight: 120,
    speed: 0.18,
    loop: false,
    scale: 2.2,
  },
};

// Renderer constants
const DEFAULT_CONTAINER_WIDTH = 340;
const DEFAULT_CONTAINER_HEIGHT = 220;
const READING_TIME_BASE_MS = 2000;
const READING_TIME_PER_WORD_MS = 550;
const FPS_UPDATE_INTERVAL_MS = 1000;

// Speech config
const SPEECH_CONFIG = {
  width: 320,
  backgroundColor: 0x2c2a2f,
  borderColor: 0xffffff,
  borderAlpha: 0.2,
  borderWidth: 1,
  cornerRadius: 6,
  padding: 12,
  bottomMargin: 20,
  textStyle: {
    fontFamily: "PencilFont, Arial",
    fontSize: 18,
    fill: 0xffffff,
    align: "left",
    wordWrap: true,
    wordWrapWidth: 296,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  typewriterSpeed: 50,
  get height() {
    return this.textStyle.lineHeight + this.padding * 2;
  },
};

// Speech data
let SPEECH_MESSAGES = {};

async function loadSpeechMessages() {
  try {
    const res = await fetch("./speech-messages.yml");
    SPEECH_MESSAGES = parseYAML(await res.text());
  } catch {
    SPEECH_MESSAGES = {
      pet: ["I think something went wrong... oh no!"],
      music: ["I think something went wrong... oh no!"],
      time: ["I think something went wrong... oh no!"],
    };
  }
}

loadSpeechMessages();

// Sprite click callback
let onSpriteClickCallback = null;
export function onSpriteClick(callback) {
  onSpriteClickCallback = callback;
}

// Store app reference for dynamic updates
let pixiApp = null;

export function updateFPS(fps) {
  if (pixiApp && pixiApp.ticker) {
    pixiApp.ticker.maxFPS = fps;
    pixiApp.ticker.minFPS = fps;
    console.log(`[Renderer] FPS target updated to: ${fps}`);
  }
}

// Asset loading
async function loadSpriteAssets() {
  const list = Object.entries(SPRITE_CONFIG).map(([state, cfg]) => ({
    alias: state,
    src: cfg.path,
  }));
  await Assets.load(list);
}

function makeFrames(alias, cfg) {
  const tex = Assets.get(alias);
  const frames = new Array(cfg.frames);
  for (let i = 0; i < cfg.frames; i++) {
    frames[i] = new Texture({
      source: tex.source,
      frame: new Rectangle(
        i * cfg.frameWidth,
        0,
        cfg.frameWidth,
        cfg.frameHeight,
      ),
    });
  }
  return frames;
}

function makeSprite(alias, cfg, x, y) {
  const s = new AnimatedSprite(makeFrames(alias, cfg));
  s.anchor.set(0.5);
  s.position.set(x, y);
  s.animationSpeed = cfg.speed;
  s.loop = cfg.loop ?? true;
  s.scale.set(cfg.scale ?? 1);
  s.visible = false;
  s.play();
  return s;
}

function createSprites(app, x, y) {
  const sprites = {};
  for (const [state, cfg] of Object.entries(SPRITE_CONFIG)) {
    const s = makeSprite(state, cfg, x, y);
    app.stage.addChild(s);
    sprites[state] = s;
  }
  return sprites;
}

function showSprite(sprites, state) {
  for (const s of Object.values(sprites)) s.visible = false;
  if (sprites[state]) sprites[state].visible = true;
}

function repositionSprites(sprites, x, y) {
  for (const s of Object.values(sprites)) s.position.set(x, y);
}

function createSpeechBox(x, y) {
  const box = new Container();
  const bg = new Graphics()
    .rect(0, 0, SPEECH_CONFIG.width, SPEECH_CONFIG.height)
    .fill({ color: SPEECH_CONFIG.backgroundColor })
    .stroke({
      color: SPEECH_CONFIG.borderColor,
      alpha: SPEECH_CONFIG.borderAlpha,
      width: SPEECH_CONFIG.borderWidth,
    });

  const txt = new Text({ text: "", style: SPEECH_CONFIG.textStyle });
  txt.position.set(SPEECH_CONFIG.padding, SPEECH_CONFIG.padding);

  box.addChild(bg, txt);
  box.position.set(x - SPEECH_CONFIG.width / 2, y);
  box.visible = false;

  box.typeData = {
    full: "",
    idx: 0,
    obj: txt,
    active: false,
    interval: null,
    audioController: null, // For stopping scheduled audio
  };

  return box;
}

function getRandomSpeech(category) {
  const list = SPEECH_MESSAGES[category];
  if (!list || list.length === 0) return `No messages for ${category}`;
  return list[(Math.random() * list.length) | 0];
}

function startTypewriter(box, text) {
  const data = box.typeData;

  // Clean up existing session
  stopTypewriter(data);

  // Initialize new session
  data.full = text;
  data.idx = 0;
  data.obj.text = "";
  data.active = true;
  box.visible = true;

  // Pause audio detection during speech
  if (window.pauseAudioDetection) window.pauseAudioDetection();

  // Schedule audio beeps for typing effect
  scheduleTypingAudio(data, text);

  // Start animation loop
  const startTime = performance.now();
  const intervalMs = SPEECH_CONFIG.typewriterSpeed;

  function typeNextChar(currentTime) {
    if (!data.active) return;

    // Calculate how many characters should be displayed by now
    const elapsed = currentTime - startTime;
    const targetIdx = Math.floor(elapsed / intervalMs);

    // Add characters that should be visible (handles frame drops)
    while (data.idx <= targetIdx && data.idx < data.full.length) {
      data.obj.text += data.full[data.idx++];
    }

    // Continue animating if not complete
    if (data.idx < data.full.length) {
      data.interval = requestAnimationFrame(typeNextChar);
      return;
    }

    // Typing complete - schedule hide after reading time
    completeTypewriter(box, data, data.full);
  }

  data.interval = requestAnimationFrame(typeNextChar);
}

function stopTypewriter(data) {
  if (!data.active) return;

  if (data.interval) cancelAnimationFrame(data.interval);
  if (data.audioController) data.audioController.stop();

  data.active = false;
  data.interval = null;
}

function scheduleTypingAudio(data, text) {
  if (!getSetting("textSoundEnabled", true)) return;

  initTextSound();
  const soundableChars = text
    .split("")
    .filter((ch) => ch !== " " && ch !== "\n").length;

  if (soundableChars > 0) {
    data.audioController = scheduleTypewriterBeeps(
      soundableChars,
      SPEECH_CONFIG.typewriterSpeed,
    );
  }
}

function completeTypewriter(box, data, completedText) {
  data.active = false;
  data.interval = null;

  // Calculate reading time based on word count
  const words = Math.max(2, completedText.trim().split(/\s+/).length);
  const readingTime = Math.max(
    READING_TIME_BASE_MS,
    words * READING_TIME_PER_WORD_MS,
  );

  // Hide message after reading time (only if not replaced by new message)
  setTimeout(() => {
    if (data.full === completedText && !data.active) {
      box.visible = false;
      if (window.resumeAudioDetection) window.resumeAudioDetection();
    }
  }, readingTime);
}

function updateStateInfo(s) {
  const el = document.getElementById("state-info");
  if (el) el.innerText = s;
}

function updateFPSInfo(f) {
  const el = document.getElementById("fps-info");
  if (el) el.innerText = f;
}

async function initPixi() {
  const container = document.getElementById("pixi-container");
  if (!container) return createFallbackAnimation();

  const rect = container.getBoundingClientRect();
  const width = Math.floor(rect.width) || DEFAULT_CONTAINER_WIDTH;
  const height = Math.floor(rect.height) || DEFAULT_CONTAINER_HEIGHT;

  const app = new Application();
  await app.init({
    width,
    height,
    backgroundAlpha: 0,
    antialias: true,
    resizeTo: container,
  });

  pixiApp = app; // Store reference for dynamic updates

  const fpsTarget = getSetting("fpsTarget", 60);
  if (app.ticker) {
    app.ticker.maxFPS = fpsTarget;
    app.ticker.minFPS = fpsTarget;
    console.log(`[Renderer] FPS target set to: ${fpsTarget}`);
  }

  container.appendChild(app.canvas);
  app.canvas.style.cursor = "pointer";

  app.canvas.onclick = (e) => {
    initTextSound();
    if (onSpriteClickCallback) onSpriteClickCallback(e);
  };

  let cx = app.screen.width / 2;
  let cy = app.screen.height / 2;

  await loadSpriteAssets();
  const sprites = createSprites(app, cx, cy);
  showSprite(sprites, getCurrentState());

  const speechBox = createSpeechBox(
    cx,
    app.screen.height - SPEECH_CONFIG.height - SPEECH_CONFIG.bottomMargin,
  );
  app.stage.addChild(speechBox);

  // Globals unchanged
  window.sprites = sprites;
  window.speechBox = speechBox;
  window.startTypewriter = startTypewriter;
  window.getRandomSpeech = getRandomSpeech;
  window.SPEECH_MESSAGES = SPEECH_MESSAGES;

  app.renderer.on("resize", () => {
    cx = app.screen.width / 2;
    cy = app.screen.height / 2;
    repositionSprites(sprites, cx, cy);
    speechBox.position.set(
      cx - SPEECH_CONFIG.width / 2,
      app.screen.height - SPEECH_CONFIG.height - SPEECH_CONFIG.bottomMargin,
    );
  });

  onStateChange((newState) => {
    if (sprites[newState]) sprites[newState].gotoAndPlay(0);
    showSprite(sprites, newState);
    updateStateInfo(newState);

    if (newState === "pet") startTypewriter(speechBox, getRandomSpeech("pet"));
    if (newState === "music")
      startTypewriter(speechBox, getRandomSpeech("music"));
  });

  let last = performance.now();
  let frames = 0;
  app.ticker.add(() => {
    if (getCurrentState() === "pet" && sprites.pet) {
      const lastFrame = sprites.pet.totalFrames - 1;
      if (sprites.pet.currentFrame >= lastFrame && !sprites.pet.playing) {
        if (window.exitPetState) window.exitPetState();
      }
    }

    frames++;
    const now = performance.now();
    if (now >= last + FPS_UPDATE_INTERVAL_MS) {
      updateFPSInfo(
        Math.round((frames * FPS_UPDATE_INTERVAL_MS) / (now - last)),
      );
      frames = 0;
      last = now;
    }
  });

  updateStateInfo(getCurrentState());
}

function createFallbackAnimation() {
  document.getElementById("pixi-container").innerHTML = `
    <div style="width:100%;height:100%;background:rgba(167,167,167,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;">
      <div style="width:60px;height:60px;background:gold;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);animation:spin 3s linear infinite;"></div>
      <p style="color:white;margin-top:20px;">Willow fallback</p>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
}

export { initPixi as initRenderer };
