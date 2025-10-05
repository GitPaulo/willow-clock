#!/bin/bash
set -e
cd "$(dirname "$0")/.."
rm -rf dist/win-unpacked 2>/dev/null || true
npm run prebuild
npx electron-builder --win --dir 2>/dev/null || true
if [ -f "dist/win-unpacked/Willow Clock.exe" ]; then
    echo "✅ Windows exe built ($(du -h "dist/win-unpacked/Willow Clock.exe" | cut -f1))"
    WIN_USER=$(powershell.exe '$env:USERNAME' 2>/dev/null | tr -d '\r\n' || echo "")
    if [ -n "$WIN_USER" ] && [ -d "/mnt/c/Users" ]; then
        cp -r "dist/win-unpacked" "/mnt/c/Users/$WIN_USER/Desktop/WillowClock" 2>/dev/null && echo "📁 Copied to Windows desktop"
    fi
else
    echo "❌ Build failed"
    exit 1
fi
