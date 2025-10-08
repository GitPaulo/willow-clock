#!/bin/bash
set -e

echo "Building for Linux..."
rm -rf dist/
npx electron-builder --linux
echo "Build complete. Check dist/ folder for output."
