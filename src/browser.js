/* eslint-env browser */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("min-btn").addEventListener("click", () => {
    window.windowControls.minimize();
  });

  document.getElementById("max-btn").addEventListener("click", () => {
    window.windowControls.maximize();
  });

  document.getElementById("close-btn").addEventListener("click", () => {
    window.windowControls.close();
  });

  // Double-click title bar to maximize
  document.getElementById("titlebar").addEventListener("dblclick", () => {
    window.windowControls.maximize();
  });
});
