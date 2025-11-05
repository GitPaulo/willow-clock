import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: ["dist", "build", "public/pixi.js"],
  },
  js.configs.recommended,
  prettier,
  {
    // Main Electron process (Node.js environment)
    files: [
      "main.js",
      "src/audio/**/*.js",
      "src/settings/settings-manager.js",
      "src/ipc-handlers.js",
      "src/window/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        Buffer: "readonly",
        global: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "no-console": "off", // Electron apps often need console for debugging
    },
  },
  {
    // Preload script (ES Module, Node + DOM APIs)
    files: ["src/preload.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        Buffer: "readonly",
        global: "readonly",
        // DOM globals for preload
        document: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    // Renderer process (Browser environment)
    files: [
      "src/app.js",
      "src/settings/settings.js",
      "src/browser.js",
      "src/audio/system-audio.js",
      "src/audio/text-audio.js",
      "src/effects/**/*.js",
      "src/weather/**/*.js",
      "src/render/**/*.js",
      "src/util/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Standard browser globals
        document: "readonly",
        window: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        performance: "readonly",
        confirm: "readonly",
        Audio: "readonly",
        // Electron renderer globals (exposed via contextBridge)
        audioAPI: "readonly",
        windowControls: "readonly",
        settingsAPI: "readonly",
        // PIXI.js globals (if used)
        PIXI: "readonly",
      },
    },
    rules: {
      "no-console": "off", // Allow console in development
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Test files (Node.js environment)
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    // Build scripts (Node.js environment)
    files: ["scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];
