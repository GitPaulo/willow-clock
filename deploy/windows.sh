#!/bin/bash
# Windows build helper for WSL

set -e

# Check WSL
if ! grep -q microsoft /proc/version 2>/dev/null; then
    echo "❌ WSL only"
    exit 1
fi

WIN_USER=$(powershell.exe '$env:USERNAME' 2>/dev/null | tr -d '\r\n')
TARGET="/mnt/c/Users/$WIN_USER/Desktop/willow-clock-deploy"

echo "📁 Copying to Windows: C:\\Users\\$WIN_USER\\Desktop\\willow-clock-deploy"

rm -rf "$TARGET"
mkdir -p "$TARGET"
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='deploy' "$(dirname "$0")/../" "$TARGET/"

# Create Windows build script
cat > "$TARGET/BUILD.bat" << 'EOF'
@echo off
echo Building Willow Clock for Windows...
npm install && npm run build:windows
echo Done! Check dist folder.
pause
EOF

echo "✅ Ready! Open Windows Explorer and run BUILD.bat"