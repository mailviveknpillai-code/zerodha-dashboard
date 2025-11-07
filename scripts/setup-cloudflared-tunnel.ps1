# Cloudflared Tunnel Setup Script for Breeze API
# This bypasses the need for port forwarding completely

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloudflared Tunnel Setup for Breeze API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if cloudflared exists
$cloudflaredExe = Join-Path $PSScriptRoot "..\cloudflared.exe"
if (-not (Test-Path $cloudflaredExe)) {
    Write-Host "ERROR: cloudflared.exe not found in workspace root" -ForegroundColor Red
    Write-Host "Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    exit 1
}

# Check if backend is running on port 8080
Write-Host "Checking if backend is running on port 8080..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/breeze/status" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Backend is running on port 8080" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is NOT running on port 8080" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start your backend first:" -ForegroundColor Yellow
    Write-Host "  cd backend/dashboard && mvn spring-boot:run" -ForegroundColor White
    Write-Host "  OR" -ForegroundColor White
    Write-Host "  docker-compose up backend" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Starting Cloudflared tunnel to localhost:8080..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host ""

# Extract the public URL from cloudflared output
Write-Host "Waiting for tunnel URL..." -ForegroundColor Yellow
Write-Host ""

# Start cloudflared in background and capture output
$process = Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--url", "http://localhost:8080" -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\cloudflared-output.log" -RedirectStandardError "$env:TEMP\cloudflared-error.log"

# Wait for tunnel to establish
Start-Sleep -Seconds 8

# Read the output to find the URL
$output = Get-Content "$env:TEMP\cloudflared-output.log" -ErrorAction SilentlyContinue
$errorLog = Get-Content "$env:TEMP\cloudflared-error.log" -ErrorAction SilentlyContinue

$publicUrl = $null

# cloudflared outputs the URL to stderr, not stdout
if ($errorLog) {
    foreach ($line in $errorLog) {
        if ($line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $publicUrl = $matches[0]
            break
        }
    }
}

if (-not $publicUrl) {
    Write-Host "ERROR: Could not determine public URL from cloudflared output" -ForegroundColor Red
    Write-Host "Full output:" -ForegroundColor Yellow
    if ($errorLog) { $errorLog | ForEach-Object { Write-Host $_ } }
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# Display the configuration
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Tunnel Established Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Public URL: $publicUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update ICICI Direct Breeze App redirect URI to:" -ForegroundColor White
Write-Host "   $publicUrl/api/breeze/callback" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Test the callback:" -ForegroundColor White
Write-Host "   curl `"$publicUrl/api/breeze/status`"" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Run OAuth flow from ICICI Breeze API" -ForegroundColor White
Write-Host ""
Write-Host "Keep this window open while testing!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host ""

# Keep the process running
try {
    $process.WaitForExit()
} catch {
    Write-Host "Tunnel stopped" -ForegroundColor Yellow
}

