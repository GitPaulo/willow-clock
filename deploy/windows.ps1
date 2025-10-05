$target = "$env:USERPROFILE\Desktop\willow-clock-build"
Write-Host "Copying to $target..." -ForegroundColor Yellow
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
robocopy . $target /E /XD node_modules dist .git deploy /NJH /NJS /NDL /NC /NS
Set-Location $target
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --loglevel=error
Write-Host "Building..." -ForegroundColor Yellow
Write-Host "Note: Symbolic link warnings for macOS libraries can be ignored on Windows" -ForegroundColor Gray
copy node_modules\pixi.js\dist\pixi.mjs public\pixi.js
xcopy /E /I /Q assets public\assets
Write-Host "Building unpacked version for testing..." -ForegroundColor Cyan
npx electron-builder --windows --dir
Write-Host "Building portable executable and installer..." -ForegroundColor Cyan
npx electron-builder --windows
Write-Host "`nBuild Results:" -ForegroundColor Yellow
if (Test-Path "dist\win-unpacked\Willow Clock.exe") {
    Write-Host "✅ Unpacked: $target\dist\win-unpacked\Willow Clock.exe" -ForegroundColor Green
}
if (Test-Path "dist\Willow Clock Setup*.exe") {
    $installer = Get-ChildItem "dist\Willow Clock Setup*.exe" | Select-Object -First 1
    Write-Host "✅ Installer: $target\dist\$($installer.Name)" -ForegroundColor Green
}
if (Test-Path "dist\Willow Clock*.exe") {
    $portable = Get-ChildItem "dist\Willow Clock*.exe" | Where-Object { $_.Name -notlike "*Setup*" } | Select-Object -First 1
    Write-Host "✅ Portable: $target\dist\$($portable.Name)" -ForegroundColor Green
}
if (!(Test-Path "dist\win-unpacked\Willow Clock.exe")) {
    Write-Host "❌ Build failed" -ForegroundColor Red
}
