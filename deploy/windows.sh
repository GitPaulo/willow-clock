#!/bin/bash
set -e
cd "$(dirname "$0")/.."

# Cross-compile approach (ignores Wine errors)
echo "Building Windows exe (cross-compile)..."
npm run prebuild
npx electron-builder --win --dir 2>/dev/null || true

if [ -f "dist/win-unpacked/Willow Clock.exe" ]; then
    echo "✅ Windows exe built ($(du -h "dist/win-unpacked/Willow Clock.exe" | cut -f1))"
    
    # Copy to Windows desktop
    WIN_USER=$(powershell.exe '$env:USERNAME' 2>/dev/null | tr -d '\r\n' || echo "")
    if [ -n "$WIN_USER" ] && [ -d "/mnt/c/Users" ]; then
        TARGET="/mnt/c/Users/$WIN_USER/Desktop/WillowClock"
        cp -r "dist/win-unpacked" "$TARGET" 2>/dev/null && echo "📁 Copied exe to Windows desktop: $TARGET"
        
        # Also copy full project for native building
        PROJECT_TARGET="/mnt/c/Users/$WIN_USER/Desktop/willow-clock-build" 
        rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' . "$PROJECT_TARGET/" 2>/dev/null
        echo "📁 Also copied project to: C:\\Users\\$WIN_USER\\Desktop\\willow-clock-build"
        echo "   For native Windows builds, run: deploy\\windows.bat"
    fi
else
    echo "❌ Build failed"
    exit 1
fi
