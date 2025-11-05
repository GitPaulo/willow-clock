import { IPC_CHANNELS, SHAKE_CONFIG } from "../constants.js";

export function setupShakeDetection(win) {
  const positionHistory = [];
  let lastShakeTime = 0;

  win.on("move", () => {
    const bounds = win.getBounds();
    const now = Date.now();

    positionHistory.push({ x: bounds.x, y: bounds.y, time: now });
    if (positionHistory.length > SHAKE_CONFIG.HISTORY_SIZE) {
      positionHistory.shift();
    }

    // Need at least a few positions to detect shake
    if (positionHistory.length < 5) return;

    // Check if we're in cooldown
    if (now - lastShakeTime < SHAKE_CONFIG.COOLDOWN_MS) return;

    // Calculate velocities and direction changes
    let totalSpeed = 0;
    let directionChanges = 0;
    let prevDx = 0;
    let prevDy = 0;

    for (let i = 1; i < positionHistory.length; i++) {
      const curr = positionHistory[i];
      const prev = positionHistory[i - 1];
      const dt = (curr.time - prev.time) / 1000; // seconds

      if (dt === 0) continue;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = distance / dt;

      totalSpeed += speed;

      // Count direction changes
      if (i > 1) {
        if ((dx > 0 && prevDx < 0) || (dx < 0 && prevDx > 0))
          directionChanges++;
        if ((dy > 0 && prevDy < 0) || (dy < 0 && prevDy > 0))
          directionChanges++;
      }

      prevDx = dx;
      prevDy = dy;
    }

    const avgSpeed = totalSpeed / (positionHistory.length - 1);

    // Detect shake: high speed + multiple direction changes
    if (
      avgSpeed > SHAKE_CONFIG.THRESHOLD &&
      directionChanges >= SHAKE_CONFIG.DIRECTION_CHANGES
    ) {
      lastShakeTime = now;
      positionHistory.length = 0; // Clear history on trigger
      win.webContents.send(IPC_CHANNELS.WINDOW_SHAKE);
    }
  });
}
