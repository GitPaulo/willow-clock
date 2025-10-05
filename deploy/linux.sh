#!/bin/bash
# Simple Linux deployment build

set -e
cd "$(dirname "$0")/.."

echo "🐧 Building Linux binaries..."

rm -rf dist/
npm run prebuild
npm run build:linux

echo "✅ Done! Built:"
ls -1 dist/ | grep -E '\.(AppImage|deb|tar\.gz)$'