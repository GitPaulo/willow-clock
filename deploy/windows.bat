@echo off
set TARGET=%USERPROFILE%\Desktop\willow-clock-build
echo Copying to %TARGET%...
if exist "%TARGET%" rmdir /s /q "%TARGET%"
robocopy . "%TARGET%" /E /XD node_modules dist .git deploy /NJH /NJS /NDL
cd /d "%TARGET%"
echo Installing dependencies...
npm install --loglevel=error
echo Building...
copy node_modules\pixi.js\dist\pixi.mjs public\pixi.js >nul
xcopy /E /I /Q assets public\assets >nul
echo Building unpacked version for testing...
npx electron-builder --windows --dir
echo Building portable executable and installer...
npx electron-builder --windows
echo.
echo Build Results:
if exist "dist\win-unpacked\Willow Clock.exe" echo ✅ Unpacked: %TARGET%\dist\win-unpacked\Willow Clock.exe
if exist "dist\Willow Clock Setup*.exe" echo ✅ Installer: %TARGET%\dist\Willow Clock Setup [version].exe
if exist "dist\Willow Clock *.exe" echo ✅ Portable: %TARGET%\dist\Willow Clock [version].exe
if not exist "dist\win-unpacked\Willow Clock.exe" echo ❌ Build failed
