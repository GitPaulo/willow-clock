#!/bin/bash
set -e

echo "Building for Linux..."
rm -rf dist/
npm run prebuild
npx electron-builder --linux
echo "Build complete. Check dist/ folder for output."
