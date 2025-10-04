// Pure JavaScript cursor trail with paw prints
// Converted from p5.js example to native DOM implementation

class CursorTrail {
  constructor() {
    this.paws = [];
    this.prevPawLeft = false;
    this.mouse = { prev: { x: 0, y: 0 }, dist: 0 };
    this.isActive = false;
    this.container = null;
  }

  init() {
    // Create container for paw prints
    this.container = document.createElement("div");
    this.container.className = "cursor-trail-container";
    document.body.appendChild(this.container);

    // Bind event listeners
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.update = this.update.bind(this);

    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });

    this.isActive = true;
    this.startUpdateLoop();

    console.log("[CursorTrail] Initialized");
  }

  handleMouseMove(event) {
    this.pawDraw(event.clientX, event.clientY);
  }

  handleTouchMove(event) {
    if (event.touches.length > 0) {
      event.preventDefault();
      const touch = event.touches[0];
      this.pawDraw(touch.clientX, touch.clientY);
    }
  }

  pawDraw(mouseX, mouseY) {
    const prevX = this.mouse.prev.x;
    const prevY = this.mouse.prev.y;

    if (prevX === 0 && prevY === 0) {
      this.mouse.prev = { x: mouseX, y: mouseY };
      return;
    }

    const dx = Math.abs(mouseX - prevX);
    const dy = Math.abs(mouseY - prevY);

    if (this.mouse.dist > 25) {
      this.prevPawLeft = !this.prevPawLeft;
      const angle = Math.atan2(mouseY - prevY, mouseX - prevX);
      this.paws.push(
        new Paw(mouseX, mouseY, (angle * 180) / Math.PI, this.prevPawLeft),
      );
      this.mouse.dist = 0;
      this.mouse.prev = { x: mouseX, y: mouseY };
    } else {
      this.mouse.dist += dx + dy;
    }
  }

  update() {
    // Update all paws
    for (let i = this.paws.length - 1; i >= 0; i--) {
      const paw = this.paws[i];
      paw.update();

      if (paw.alpha <= 0) {
        // Remove paw element from DOM
        if (paw.element && paw.element.parentNode) {
          paw.element.parentNode.removeChild(paw.element);
        }
        this.paws.splice(i, 1);
      }
    }
  }

  startUpdateLoop() {
    const animate = () => {
      if (this.isActive) {
        this.update();
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  destroy() {
    this.isActive = false;

    // Remove event listeners
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("touchmove", this.handleTouchMove);

    // Remove all paw elements
    this.paws.forEach((paw) => {
      if (paw.element && paw.element.parentNode) {
        paw.element.parentNode.removeChild(paw.element);
      }
    });
    this.paws = [];

    // Remove container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    console.log("[CursorTrail] Destroyed");
  }
}

class Paw {
  constructor(x, y, angle, left) {
    this.x = x;
    this.y = y;
    this.alpha = 255;
    this.size = 5;
    this.left = left;
    this.angle = angle + 90;
    this.element = null;
    this.createDOMElement();
  }

  createDOMElement() {
    this.element = document.createElement("div");
    this.element.className = "cursor-trail-paw";

    // Create realistic paw shape structure
    const pawHTML = `
      <div class="paw-main-pad">
        <div class="paw-pad-detail"></div>
      </div>
      <div class="paw-toes">
        <div class="paw-toe paw-toe-outer-left"></div>
        <div class="paw-toe paw-toe-inner-left"></div>
        <div class="paw-toe paw-toe-inner-right"></div>
        <div class="paw-toe paw-toe-outer-right"></div>
      </div>
    `;
    this.element.innerHTML = pawHTML;

    // Position and rotate the paw
    const offset = this.left ? this.size * 0.8 : -this.size * 0.8;
    this.element.style.cssText = `
      position: absolute;
      left: ${this.x - this.size * 1.5}px;
      top: ${this.y - this.size * 1.5}px;
      width: ${this.size * 3}px;
      height: ${this.size * 3}px;
      transform: rotate(${this.angle}deg) translateX(${offset}px);
      opacity: 1;
      pointer-events: none;
      transition: opacity 0.1s ease-out;
    `;

    // Add to container
    const container = document.querySelector(".cursor-trail-container");
    if (container) {
      container.appendChild(this.element);
    }
  }

  update() {
    this.alpha -= 4;

    if (this.element) {
      this.element.style.opacity = Math.max(0, this.alpha / 255);
    }
  }
}

// Export for use
export { CursorTrail };
