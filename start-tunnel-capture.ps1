# Start Cloudflare Tunnel and Capture URL
# This script starts a Cloudflare tunnel and captures the URL for easy configuration

param(
    [string]$Url = "http://localhost:9000"
)

Write-Host "Starting Cloudflare tunnel with URL capture..." -ForegroundColor Green
Write-Host "Target URL: $Url" -ForegroundColor Yellow

# Check if cloudflared.exe exists
if (-not (Test-Path "cloudflared.exe")) {
    Write-Host "ERROR: cloudflared.exe not found!" -ForegroundColor Red
    Write-Host "Please download cloudflared from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    exit 1
}

# Create log file
$logFile = "tunnel-url.log"
Write-Host "`nTunnel URL will be logged to: $logFile" -ForegroundColor Cyan
Write-Host "Starting tunnel...`n" -ForegroundColor Green

# Start tunnel and capture output
& .\cloudflared.exe tunnel --url $Url 2>&1 | Tee-Object -FilePath $logFile


