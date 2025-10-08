param([switch]$SkipDeps)

$currentPath = Get-Location
if ($currentPath.Path -match "^\\\\wsl") {
    Write-Host "Error: Cannot build from WSL path ($currentPath)"
    Write-Host ""
    Write-Host "Please clone the repository to a Windows directory first!"
    Write-Host ""
    exit 1
}

Write-Host "Building Windows packages..."
npx electron-builder --win

Write-Host "Build complete. Check dist/ folder for output."

