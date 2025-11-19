# Quick Cloudflare Tunnel Setup
Write-Host "Starting Cloudflare tunnel to frontend (port 5173)..." -ForegroundColor Cyan
Write-Host ""

# Check if frontend is accessible
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Frontend is running on port 5173" -ForegroundColor Green
} catch {
    Write-Host "⚠ Frontend might not be ready yet, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting tunnel... This will generate a random URL." -ForegroundColor Yellow
Write-Host "The frontend will proxy API calls to the backend automatically." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start cloudflared tunnel pointing to frontend
# Use 127.0.0.1 instead of localhost to force IPv4 (cloudflared has issues with IPv6)
& .\cloudflared.exe tunnel --url http://127.0.0.1:5173

