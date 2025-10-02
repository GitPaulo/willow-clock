# Willow Clock

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

### Testing Built Applications

**Linux (after `npm run pack`):**
```bash
./dist/linux-unpacked/willow-clock
```

**Windows (after building .exe):**
- Run the installer from `dist/` directory
- Or execute the portable version directly

**Automated Testing:**
```bash
# Build and test in one command
npm run pack && ./dist/linux-unpacked/willow-clock
```

## Project Structure

```
├── main.js           # Electron main process
├── src/
│   ├── preload.js    # Secure preload script
│   └── renderer.js   # Clock logic and PixiJS animation
├── public/
│   ├── index.html    # Application UI
│   └── pixi.js       # Local PixiJS module
└── package.json      # Project configuration
```

## License

Apache-2.0
