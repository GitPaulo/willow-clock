import { Application, Graphics, Text } from '../public/pixi.js';

// Clock functionality
function updateClock() {
  const now = new Date();

  // Update time
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;
  document.getElementById('clock').textContent = timeString;

  // Update date
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = now.toLocaleDateString('en-US', options);
  document.getElementById('date').textContent = dateString;
}

// Initialize clock
updateClock();
setInterval(updateClock, 1000);

// PixiJS setup using v8 API
async function initPixi() {
  console.log('Initializing PixiJS v8 from node_modules...');

  try {
    // Create application using new v8 syntax
    const app = new Application();

    // Initialize the application
    await app.init({
      width: 400,
      height: 300,
      backgroundColor: 0x1a1a2e,
      backgroundAlpha: 0.3,
      antialias: true
    });

    console.log('PixiJS application created successfully');

    // Add to DOM
    const container = document.getElementById('pixi-container');
    container.appendChild(app.canvas);

    // Create animated star using Graphics
    const star = new Graphics();

    function drawStar(graphics, x, y, points, radius, innerRadius, rotation = 0) {
      graphics.clear();
      graphics.beginFill(0xffd700); // Gold color

      const step = Math.PI / points;
      graphics.moveTo(x, y - radius);

      for (let i = 0; i <= points * 2; i++) {
        const r = (i % 2 === 0) ? radius : innerRadius;
        const angle = i * step + rotation;
        const px = x + Math.cos(angle - Math.PI / 2) * r;
        const py = y + Math.sin(angle - Math.PI / 2) * r;
        graphics.lineTo(px, py);
      }

      graphics.endFill();
    }

    // Position star in center
    const centerX = 200;
    const centerY = 120;

    // Draw initial star
    drawStar(star, centerX, centerY, 5, 40, 20, 0);
    app.stage.addChild(star);

    // Add text
    const text = new Text({
      text: '✨ Willow Clock ✨',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xffffff,
        align: 'center'
      }
    });

    text.anchor.set(0.5);
    text.x = centerX;
    text.y = centerY + 80;
    app.stage.addChild(text);

    // Animation
    let rotation = 0;
    app.ticker.add((time) => {
      rotation += 0.01 * time.deltaTime;
      drawStar(star, centerX, centerY, 5, 40, 20, rotation);
    });

    console.log('PixiJS setup complete with animations');

  } catch (error) {
    console.error('PixiJS initialization failed:', error);

    // Fallback to CSS animation
    const container = document.getElementById('pixi-container');
    container.innerHTML = `
      <div style="
        width: 400px; height: 300px;
        background: rgba(26, 26, 46, 0.3);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        border-radius: 10px;
      ">
        <div style="
          width: 60px; height: 60px;
          background: gold;
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          animation: spin 3s linear infinite;
        "></div>
        <p style="color: white; margin-top: 20px;">✨ Willow Clock ✨</p>
      </div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
}

// Wait for DOM to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPixi);
} else {
  initPixi();
}
