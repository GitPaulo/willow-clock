class CursorTrail {
  constructor() {
    this.paws = [];
    this.prevPawLeft = false;
    this.mouse = { prev: { x: 0, y: 0 }, dist: 0 };
    this.isActive = false;
    this.container = null;

    // keep bound refs so we can remove them
    this.handleMouseMove = null;
    this.handleTouchMove = null;
    this._rafId = null;
  }

  init() {
    if (this.isActive) {
      return;
    }

    // Create container for paw prints
    this.container = document.createElement("div");
    this.container.className = "cursor-trail-container";
    document.body.appendChild(this.container);

    // Bind event listeners
    this.handleMouseMove = this.handleMouseMoveImpl.bind(this);
    this.handleTouchMove = this.handleTouchMoveImpl.bind(this);

    document.addEventListener("mousemove", this.handleMouseMove);
    // must remove with the same options
    document.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });

    this.isActive = true;
    this.startUpdateLoop();

    console.log("[CursorTrail] Initialized");
  }

  handleMouseMoveImpl(event) {
    this.pawDraw(event.clientX, event.clientY);
  }

  handleTouchMoveImpl(event) {
    if (event.touches.length > 0) {
      event.preventDefault(); // in Electron this is usually ok
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

    // If you want true distance: const d = Math.hypot(mouseX - prevX, mouseY - prevY);
    if (this.mouse.dist > 25) {
      this.prevPawLeft = !this.prevPawLeft;
      const angle = Math.atan2(mouseY - prevY, mouseX - prevX);
      this.paws.push(
        new Paw(
          mouseX,
          mouseY,
          (angle * 180) / Math.PI,
          this.prevPawLeft,
          this.container,
        ),
      );
      this.mouse.dist = 0;
      this.mouse.prev = { x: mouseX, y: mouseY };
    } else {
      this.mouse.dist += dx + dy;
    }
  }

  update() {
    for (let i = this.paws.length - 1; i >= 0; i--) {
      const paw = this.paws[i];
      paw.update();

      if (paw.alpha <= 0) {
        paw.remove();
        this.paws.splice(i, 1);
      }
    }
  }

  startUpdateLoop() {
    const animate = () => {
      if (!this.isActive) {
        return;
      }
      this.update();
      this._rafId = requestAnimationFrame(animate);
    };
    this._rafId = requestAnimationFrame(animate);
  }

  destroy() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Remove event listeners
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });

    // Remove all paw elements
    this.paws.forEach((paw) => paw.remove());
    this.paws = [];

    // Remove container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;

    console.log("[CursorTrail] Destroyed");
  }
}

class Paw {
  constructor(x, y, angle, left, container) {
    this.x = x;
    this.y = y;
    this.alpha = 255;
    this.size = 5;
    this.left = left;
    this.angle = angle + 90;
    this.element = null;
    this.container = container;
    this.createDOMElement();
  }

  createDOMElement() {
    const el = document.createElement("div");
    el.className = "cursor-trail-paw";

    el.innerHTML = `
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

    const offset = this.left ? this.size * 0.8 : -this.size * 0.8;

    el.style.position = "absolute";
    el.style.left = `${this.x - this.size * 1.5}px`;
    el.style.top = `${this.y - this.size * 1.5}px`;
    el.style.width = `${this.size * 3}px`;
    el.style.height = `${this.size * 3}px`;
    el.style.transform = `rotate(${this.angle}deg) translateX(${offset}px)`;
    el.style.opacity = "1";
    el.style.pointerEvents = "none";
    el.style.transition = "opacity 0.1s ease-out";

    if (this.container) {
      this.container.appendChild(el);
    } else {
      // fallback
      document.body.appendChild(el);
    }

    this.element = el;
  }

  update() {
    this.alpha -= 4;
    if (this.element) {
      const nextOpacity = Math.max(0, this.alpha / 255);
      this.element.style.opacity = String(nextOpacity);
    }
  }

  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

export { CursorTrail };
