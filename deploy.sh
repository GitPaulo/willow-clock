#!/bin/bash
case "${1:-linux}" in
    "linux") ./deploy/linux.sh ;;
    "windows") ./deploy/windows.sh ;;
    "clean") rm -rf dist/ && echo "✅ Cleaned" ;;
    *) 
        echo "Usage: ./deploy.sh [linux|windows|clean]"
        echo ""
        echo "Windows users can also run:"
        echo "  deploy/windows.bat (Command Prompt)"
        echo "  deploy/windows.ps1 (PowerShell)"
        ;;
esac
