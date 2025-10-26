param([switch]$SkipDeps)

$path = (Get-Location).Path
if ($path -match "^\\\\wsl") {
    Write-Host "Error: Cannot build from WSL path ($path)"
    exit 1
}

function Test-VCTools {
    # cl.exe exists only when VC++ toolset is installed
    $cl = Get-Command "cl.exe" -ErrorAction SilentlyContinue
    return $null -ne $cl
}

if (-not $SkipDeps) {
    if (-not (Test-VCTools)) {
        Write-Host "Installing Visual Studio Build Tools with C++..."
        winget install Microsoft.VisualStudio.2022.BuildTools `
          --override "--passive --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
        npm config set msvs_version 2022
    }
}

Write-Host "Building Windows packages..."
npx electron-builder --win

Write-Host "Done. Check dist/."
