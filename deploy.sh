#!/bin/bash
case "${1:-linux}" in
    "linux") ./deploy/linux.sh ;;
    "windows") 
        echo "For Windows deployment, run the PowerShell script from Windows:"
        echo "  .\deploy\windows.ps1"
        ;;
    "clean") rm -rf dist/ && echo "✅ Cleaned" ;;
    *) 
        echo "Usage: ./deploy.sh [linux|windows|clean]"
        echo ""
        echo "Windows users should run:"
        echo "  .\deploy\windows.ps1 (PowerShell)"
        ;;
esac
