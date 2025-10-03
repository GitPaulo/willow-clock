import { Application, Graphics, Text } from "../public/pixi.js";
import {
  initializeApp,
  setupAudioDetection,
  handleClick,
  setupTestFunctions,
} from "./utils.js";
import { getStateConfig, onStateChange, getCurrentState } from "./state-machine.js";

initializeApp();
setupAudioDetection();
setupTestFunctions();

function drawStar(graphics, x, y, points, radius, innerRadius, rotation, color) {
  graphics.clear();
  const step = (Math.PI * 2) / points;
  const vertices = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = (i * step) / 2 + rotation;
    const px = x + Math.cos(angle - Math.PI / 2) * r;
    const py = y + Math.sin(angle - Math.PI / 2) * r;
    vertices.push(px, py);
  }
  graphics.poly(vertices);
  graphics.fill(color);
}

async function initPixi() {
  console.log("🎨 Initializing PIXI.js...");
  try {
    const container = document.getElementById("pixi-container");
    const containerRect = container.getBoundingClientRect();
    const width = Math.floor(containerRect.width) || 320;
    const height = Math.floor(containerRect.height) || 240;

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

    const star = new Graphics();
    let centerX = width / 2;
    let centerY = height / 2;
    let starRadius = Math.min(width, height) * 0.15;
    let starInnerRadius = starRadius * 0.5;

    drawStar(star, centerX, centerY, 5, starRadius, starInnerRadius, 0, getStateConfig().color);
    app.stage.addChild(star);

    const text = new Text({
      text: "✨ Willow Clock ✨",
      style: {
        fontFamily: "Arial",
        fontSize: 20,
        fill: 0xffffff,
        align: "center",
      },
    });

    text.anchor.set(0.5);
    text.x = centerX;
    text.y = centerY + height * 0.25;
    app.stage.addChild(text);

    function updateLayout() {
      const newWidth = app.screen.width;
      const newHeight = app.screen.height;
      centerX = newWidth / 2;
      centerY = newHeight / 2;
      starRadius = Math.min(newWidth, newHeight) * 0.15;
      starInnerRadius = starRadius * 0.5;
      text.x = centerX;
      text.y = centerY + newHeight * 0.25;
    }

    app.renderer.on("resize", updateLayout);

    let rotation = 0;

    // Update state display function
    const updateStateDisplay = (state) => {
      const element = document.getElementById("state-info");
      if (element) element.innerText = state;
    };

    onStateChange((newState) => {
      console.log(`🌟 ${newState}`);
      updateStateDisplay(newState);
    });

    // Set initial state display
    updateStateDisplay(getCurrentState());

    app.ticker.add((time) => {
      const config = getStateConfig();
      rotation += config.speed * time.deltaTime;
      drawStar(star, centerX, centerY, 5, starRadius, starInnerRadius, rotation, config.color);
    });

    console.log("✅ PIXI.js setup complete");
  } catch (error) {
    console.error("❌ PIXI.js failed:", error);
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
