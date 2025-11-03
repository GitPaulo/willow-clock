#!/bin/bash
set -e

echo "Building for macOS..."
echo ""

# Copy PixiJS dependency
echo "Preparing dependencies..."
npm run prebuild

# Compile Swift audio detection binary
echo "Compiling Swift audio detection binary..."
cd src/audio/lib/macos
swiftc is-playing-audio.swift -o is-playing-audio
cd ../../../..
echo "Swift binary compiled successfully."
echo ""

# Build for macOS
echo "Building macOS packages (x64 and arm64)..."
npx electron-builder --mac

echo ""
echo "Build complete. Check dist/ folder for output."
echo ""
echo "Output files:"
echo "  - Willow Clock-*.dmg (Universal installer)"
echo ""
