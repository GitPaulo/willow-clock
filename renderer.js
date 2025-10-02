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

// PixiJS setup - let's just skip it and create a CSS animation instead
function initPixi() {
  console.log('PixiJS v8 has compatibility issues in this environment');
  console.log('Creating CSS-based animation instead...');

  // Create a simple CSS star animation instead
  const container = document.getElementById('pixi-container');
  if (container) {
    container.innerHTML = `
      <div style="
        width: 400px;
        height: 300px;
        background: rgba(26, 26, 46, 0.3);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div class="css-star" style="
          width: 60px;
          height: 60px;
          background: gold;
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          animation: rotateStar 3s linear infinite;
          margin-bottom: 20px;
        "></div>
        <div style="
          color: white;
          font-family: Arial, sans-serif;
          font-size: 18px;
          text-align: center;
        ">✨ Willow Clock ✨</div>
      </div>
    `;

    // Add the CSS animation keyframes
    if (!document.querySelector('#star-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'star-animation-styles';
      style.textContent = `
        @keyframes rotateStar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .css-star:hover {
          transform: scale(1.2);
          transition: transform 0.3s ease;
        }
      `;
      document.head.appendChild(style);
    }

    console.log('CSS animation created successfully');
  }
}

// Wait for DOM to be ready before initializing PixiJS
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPixi);
} else {
  initPixi();
}
