#!/bin/bash
set -e
cd "$(dirname "$0")/.."
rm -rf dist/
npm run prebuild
npm run build:linux
echo "✅ Linux: $(ls -1 dist/ | grep -E '\.(AppImage|deb|tar\.gz)$' | wc -l) files built"
