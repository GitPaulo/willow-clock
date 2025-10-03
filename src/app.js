// Main UI interaction handlers
document.addEventListener('DOMContentLoaded', () => {
  setupClockMode();
});

function setupClockMode() {
  const modeContainer = document.getElementById('mode');
  const clock = document.getElementById('clock');
  const date = document.getElementById('date');

  if (!modeContainer || !clock || !date) {
    console.log('[App] Clock mode elements not found');
    return;
  }

  // Hover state management
  modeContainer.addEventListener('mouseenter', () => {
    clock.classList.add('hover');
    date.classList.add('hover');
  });

  modeContainer.addEventListener('mouseleave', () => {
    clock.classList.remove('hover');
    date.classList.remove('hover');
  });

  // Click handler
  modeContainer.addEventListener('click', () => {
    console.log('[App] Clock mode clicked!');
    // TODO: Add clock mode functionality here
    // Example: Toggle time format, show world clocks, etc.
  });

  console.log('[App] Clock mode interactions initialized');
}
