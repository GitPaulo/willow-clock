#!/bin/bash
set -e

echo "Building for Linux..."
npx electron-builder --linux
echo "Build complete. Check dist/ folder for output."
