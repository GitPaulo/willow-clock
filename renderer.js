import * as PIXI from './node_modules/pixi.js/dist/pixi.mjs';

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

// PixiJS setup
const app = new PIXI.Application();

(async () => {
  await app.init({
    width: 400,
    height: 300,
    backgroundColor: 0x1a1a2e,
    backgroundAlpha: 0.3,
  });

  document.getElementById('pixi-container').appendChild(app.canvas);

  // Create a graphics object to draw with
  const graphics = new PIXI.Graphics();

  // Draw a star shape as the sprite
  const drawStar = (g, x, y, points, radius, innerRadius, rotation = 0) => {
    g.clear();
    g.fill({ color: 0xffd700 }); // Gold color
    g.moveTo(x, y + innerRadius);

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points + rotation;
      const r = i % 2 === 0 ? radius : innerRadius;
      const sx = x + Math.cos(angle) * r;
      const sy = y + Math.sin(angle) * r;
      g.lineTo(sx, sy);
    }

    g.closePath();
  };

  // Draw initial star
  drawStar(graphics, 200, 150, 5, 50, 25, 0);

  app.stage.addChild(graphics);

  // Animate the star
  let rotation = 0;
  app.ticker.add((time) => {
    rotation += 0.02 * time.deltaTime;
    drawStar(graphics, 200, 150, 5, 50, 25, rotation);
  });

  // Add text below the star
  const text = new PIXI.Text({
    text: 'Willow Clock ✨',
    style: {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
      align: 'center',
    },
  });

  text.anchor.set(0.5);
  text.x = 200;
  text.y = 250;

  app.stage.addChild(text);
})();
