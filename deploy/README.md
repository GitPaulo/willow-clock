# Deploy Scripts

## Quick Commands

```bash
./deploy.sh linux         # Build Linux binaries  
./deploy.sh windows-cross # Cross-compile Windows .exe (WSL)
./deploy.sh windows       # Copy to Windows for native build
./deploy.sh clean         # Remove dist folder
```

## Outputs

**Linux:** AppImage (portable), .deb (Ubuntu/Debian), .tar.gz  
**Windows:** Standalone .exe with all dependencies

## WSL Windows Building (NEW!)

### Cross-compile (Recommended)
`./deploy.sh windows-cross` - Builds Windows .exe directly in WSL and copies to Windows desktop. **No Wine required!**

### Native Windows build  
`./deploy.sh windows` - Copies project to Windows and creates BUILD.bat for native building.

The cross-compile option works by ignoring Wine metadata errors - the .exe builds successfully without version info.
