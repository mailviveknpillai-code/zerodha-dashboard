# Start Cloudflare Tunnel
# This script starts a Cloudflare tunnel to expose the local application

param(
    [string]$Url = "http://localhost:9000",
    [string]$Protocol = "http"
)

Write-Host "Starting Cloudflare tunnel..." -ForegroundColor Green
Write-Host "Target URL: $Url" -ForegroundColor Yellow

# Check if cloudflared.exe exists
if (-not (Test-Path "cloudflared.exe")) {
    Write-Host "ERROR: cloudflared.exe not found!" -ForegroundColor Red
    Write-Host "Please download cloudflared from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    exit 1
}

# Start tunnel
Write-Host "`nTunnel starting... The URL will be displayed below." -ForegroundColor Cyan
Write-Host "Copy the URL and update PUBLIC_TUNNEL_URL in docker-compose.yml or .env file`n" -ForegroundColor Yellow

& .\cloudflared.exe tunnel --url $Url


