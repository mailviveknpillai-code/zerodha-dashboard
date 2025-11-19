# Cloudflare Tunnel Setup with URL Capture
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Cloudflare Tunnel to Port 5173" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if frontend is accessible
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Frontend is running on port 5173" -ForegroundColor Green
} catch {
    Write-Host "✗ Frontend is NOT accessible on port 5173" -ForegroundColor Red
    Write-Host "Please ensure Docker containers are running: docker compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting tunnel... Waiting for URL..." -ForegroundColor Yellow
Write-Host ""

# Create temp files for output
$outputFile = "$env:TEMP\cloudflared-output-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$errorFile = "$env:TEMP\cloudflared-error-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Start cloudflared and capture output
$process = Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:5173" -NoNewWindow -PassThru -RedirectStandardOutput $outputFile -RedirectStandardError $errorFile

# Wait for tunnel to establish
Write-Host "Waiting for tunnel to establish (this may take 10-15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# Read the error log (cloudflared outputs URL to stderr)
$tunnelUrl = $null
if (Test-Path $errorFile) {
    $errorLog = Get-Content $errorFile -ErrorAction SilentlyContinue
    foreach ($line in $errorLog) {
        if ($line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $tunnelUrl = $matches[0]
            break
        }
    }
}

if ($tunnelUrl) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Tunnel Established Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tunnel URL: $tunnelUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Update docker-compose.yml with this URL:" -ForegroundColor White
    Write-Host "   PUBLIC_TUNNEL_URL: $tunnelUrl" -ForegroundColor Cyan
    Write-Host "   ZERODHA_REDIRECT_URI: $tunnelUrl/api/zerodha/callback" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Update Zerodha app settings with callback URL:" -ForegroundColor White
    Write-Host "   $tunnelUrl/api/zerodha/callback" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Restart containers: docker compose restart backend" -ForegroundColor White
    Write-Host ""
    Write-Host "Keep this window open while using the tunnel!" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    # Keep process running
    try {
        $process.WaitForExit()
    } catch {
        Write-Host "Tunnel stopped" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Could not determine tunnel URL" -ForegroundColor Red
    Write-Host "Check the output files:" -ForegroundColor Yellow
    Write-Host "  Output: $outputFile" -ForegroundColor White
    Write-Host "  Error: $errorFile" -ForegroundColor White
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    exit 1
}




