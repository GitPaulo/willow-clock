# Willow Clock

Clock app with Electron and PixiJS.

```bash
npm start           # Run
npm run linux       # Build Linux
npm run windows     # Build Windows (WSL)
npm run clean       # Clean
```

---

# Original README

:3

## Prerequisites

- Node.js 18 or higher

## Installation

```bash
git clone https://github.com/GitPaulo/willow-clock.git
cd willow-clock
npm install
```

## Development

Start the application in development mode:

```bash
npm start
```

For headless environments (GitHub Codespaces):

```bash
npm run start:codespace
```

## Building

### Development Build (Testing)

Create an unpacked build for testing:

```bash
npm run pack
```

This creates `dist/linux-unpacked/` with the executable for immediate testing.

### Production Builds

Create distributable packages:

```bash
npm run build          # Current platform only
npm run build:all      # Windows, macOS, and Linux
```

### Platform-Specific Builds

```bash
# Linux AppImage
electron-builder --linux

# Windows installer
electron-builder --win

# macOS app (requires macOS)
electron-builder --mac
```
