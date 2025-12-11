# Create deployment package with all required files
$ErrorActionPreference = "Stop"

Write-Host "`n=== Creating Deployment Package ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployDir = Join-Path $scriptDir "deployment"

# Create deployment directory
if (Test-Path $deployDir) {
    Write-Host "Cleaning existing deployment directory..." -ForegroundColor Yellow
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# Copy EXE
$exeSource = Join-Path $scriptDir "dist\ZerodhaDashboard.exe"
if (Test-Path $exeSource) {
    Copy-Item $exeSource $deployDir -Force
    Write-Host "✅ Copied: ZerodhaDashboard.exe" -ForegroundColor Green
} else {
    Write-Host "❌ EXE not found: $exeSource" -ForegroundColor Red
    exit 1
}

# Copy backend JAR
$jarSource = Get-ChildItem (Join-Path $scriptDir "lib\dashboard-app-*.jar") -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jarSource) {
    Copy-Item $jarSource.FullName $deployDir -Force
    Write-Host "✅ Copied: $($jarSource.Name)" -ForegroundColor Green
} else {
    Write-Host "⚠ Backend JAR not found in lib/" -ForegroundColor Yellow
    Write-Host "  Please ensure backend JAR is in launcher/lib/" -ForegroundColor Yellow
}

# Check for cloudflared
$cloudflaredPaths = @(
    "C:\vivek\New folder\cloudflared.exe",
    (Join-Path $scriptDir "cloudflared.exe"),
    (Join-Path (Split-Path $scriptDir -Parent) "cloudflared.exe")
)

$cloudflaredFound = $false
foreach ($path in $cloudflaredPaths) {
    if (Test-Path $path) {
        Copy-Item $path $deployDir -Force
        Write-Host "✅ Copied: cloudflared.exe" -ForegroundColor Green
        $cloudflaredFound = $true
        break
    }
}

if (-not $cloudflaredFound) {
    Write-Host "⚠ cloudflared.exe not found. Please add it manually." -ForegroundColor Yellow
    Write-Host "  The launcher will look for it in:" -ForegroundColor Gray
    Write-Host "    - Same directory as EXE" -ForegroundColor Gray
    Write-Host "    - System PATH" -ForegroundColor Gray
}

# Create README
$readme = @"
# Zerodha Dashboard - Deployment Package

## Files Included
- ZerodhaDashboard.exe - Main launcher
- dashboard-app-*.jar - Backend application (with embedded frontend)
- cloudflared.exe - Cloudflare tunnel tool

## Requirements
- Java 21 installed and in PATH
- Redis running (or configure backend to use embedded Redis)

## Usage
1. Double-click ZerodhaDashboard.exe
2. Wait for services to start (GUI will show status)
3. Browser will open automatically to the dashboard
4. Click "Exit" to shut down all services

## Troubleshooting
- If backend fails: Check backend.log in this directory
- If tunnel fails: Ensure cloudflared.exe is accessible
- If browser doesn't open: Click "Open Dashboard" button manually

## Notes
- All processes run in background (no terminal windows)
- Frontend is embedded in backend JAR
- Tunnel URL is extracted automatically
"@

Set-Content -Path (Join-Path $deployDir "README.txt") -Value $readme
Write-Host "✅ Created: README.txt" -ForegroundColor Green

Write-Host "`n=== Deployment Package Ready ===" -ForegroundColor Green
Write-Host "`nLocation: $deployDir" -ForegroundColor Cyan
Write-Host "`nFiles:" -ForegroundColor Yellow
Get-ChildItem $deployDir | ForEach-Object {
    $size = if ($_.Length -gt 1MB) {
        "$([math]::Round($_.Length / 1MB, 2)) MB"
    } else {
        "$([math]::Round($_.Length / 1KB, 2)) KB"
    }
    Write-Host "  - $($_.Name) ($size)" -ForegroundColor White
}

Write-Host "`n✅ Ready to deploy!" -ForegroundColor Green
Write-Host "`nYou can now:" -ForegroundColor Cyan
Write-Host "  1. Copy the entire 'deployment' folder to any location" -ForegroundColor White
Write-Host "  2. Double-click ZerodhaDashboard.exe to start" -ForegroundColor White





