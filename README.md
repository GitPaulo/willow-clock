# willow-clock

Willow clock app :3

A simple desktop clock application built with Electron.js and PixiJS featuring an animated sprite.

## Features

- Real-time clock display with date
- Animated PixiJS sprite (rotating golden star)
- Beautiful gradient background
- Cross-platform desktop application

## Prerequisites

- Node.js (v20 or higher recommended)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/GitPaulo/willow-clock.git
cd willow-clock
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

To start the application:

```bash
npm start
```

## Project Structure

- `main.js` - Electron main process
- `preload.js` - Preload script for secure renderer communication
- `index.html` - Application UI
- `renderer.js` - Renderer process with clock logic and PixiJS animation
- `package.json` - Project configuration and dependencies

## Technologies Used

- [Electron.js](https://www.electronjs.org/) - Desktop application framework
- [PixiJS](https://pixijs.com/) - 2D rendering engine for the animated sprite

## License

Apache-2.0
