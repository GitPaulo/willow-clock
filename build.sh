#!/bin/bash

# Willow Clock Build Script
set -e

echo "Building Willow Clock Electron App..."

# Create clean build directory
rm -rf build/
mkdir -p build

# Copy application files
echo "Copying application files..."
cp -r public src main.js package.json build/

# Copy node_modules if needed for standalone build
if [ "$1" = "--standalone" ]; then
    echo "Creating standalone build with dependencies..."
    cp -r node_modules build/
fi

echo "Build completed successfully."
echo ""
echo "To run the built app:"
echo "  cd build && npm install && npm start"
echo ""
echo "To create distributable packages:"
echo "  npm run build"
