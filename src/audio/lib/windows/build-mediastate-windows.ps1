#requires -Version 5.1
<#
.SYNOPSIS
    Builds MediaState.exe as a self-contained single file on Windows.

.DESCRIPTION
    - Copies the project from \\wsl.localhost\ path to a Windows temp folder.
    - Runs `dotnet publish` with self-contained + single-file options.
    - Copies the resulting standalone MediaState.exe back into /bin inside WSL.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [string]$WSLPath = "\\wsl.localhost\Ubuntu\home\paulo\willow-clock"
)

Write-Host "=== Building self-contained MediaState.exe from Windows host ===" -ForegroundColor Cyan

$tempDir      = Join-Path $env:TEMP "willow-mediastate-build"
$sourceDir    = Join-Path $WSLPath "src\audio\lib\windows"
$outputWSLDir = Join-Path $WSLPath "bin"

try {
    if (Test-Path $tempDir) {
        Write-Host "Cleaning existing temp directory..." -ForegroundColor DarkGray
        Remove-Item $tempDir -Recurse -Force
    }

    Write-Host "Copying source from: $sourceDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    Copy-Item "$sourceDir\*" $tempDir -Recurse -Force

    Write-Host "Running dotnet publish (self-contained single file)..." -ForegroundColor Yellow
    Push-Location $tempDir

    dotnet publish "MediaState.csproj" `
        -r win-x64 `
        -c Release `
        --self-contained true `
        -p:PublishSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -p:PublishTrimmed=false `
        -p:DebugType=None `
        -p:DebugSymbols=false `
        -o "bin"

    $buildExit = $LASTEXITCODE
    Pop-Location

    if ($buildExit -ne 0) {
        throw "dotnet publish failed with exit code $buildExit"
    }

    $builtExe = Join-Path $tempDir "bin\MediaState.exe"
    if (!(Test-Path $builtExe)) {
        throw "Build succeeded but MediaState.exe not found in $tempDir\bin"
    }

    if (!(Test-Path $outputWSLDir)) {
        Write-Host "Creating output directory: $outputWSLDir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $outputWSLDir -Force | Out-Null
    }

    Write-Host "Copying MediaState.exe to WSL project bin directory..." -ForegroundColor Yellow
    Copy-Item $builtExe $outputWSLDir -Force

    $finalExe = Join-Path $outputWSLDir "MediaState.exe"
    if (Test-Path $finalExe) {
        Write-Host ("{0} Self-contained MediaState.exe built and copied to {1}" -f ([char]0x2713), $outputWSLDir) -ForegroundColor Green
    } else {
        throw "Copy operation failed - file not found at destination."
    }

}
catch {
    Write-Host ("{0} Error: {1}" -f ([char]0x2717), $_.Exception.Message) -ForegroundColor Red
    exit 1
}
finally {
    if (Test-Path $tempDir) {
        Write-Host "Cleaning up temporary build directory..." -ForegroundColor DarkGray
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
