# Deploy Scripts

## Quick Commands

```bash
./deploy.sh linux     # Build Linux binaries
./deploy.sh windows   # Set up Windows build (WSL)
./deploy.sh clean     # Remove dist folder
```

## Outputs

**Linux:** AppImage (portable), .deb (Ubuntu/Debian), .tar.gz  
**Windows:** .exe installer, portable executable (via WSL helper)

## WSL Windows Building

The `windows` command copies your project to `C:\Users\[You]\Desktop\willow-clock-deploy` and creates a `BUILD.bat` file. Run that on Windows to build native binaries.

Wine doesn't work in WSL, so this is the simplest solution.