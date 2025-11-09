# Manual Cloudflare Tunnel Setup Guide
# This script provides step-by-step instructions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloudflare Tunnel Manual Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Login to Cloudflare" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
Write-Host "  .\cloudflared.exe tunnel login" -ForegroundColor Cyan
Write-Host ""
$step1 = Read-Host "Press Enter after you've logged in"

Write-Host ""
Write-Host "Step 2: Create Named Tunnel" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
Write-Host "  .\cloudflared.exe tunnel create zerodha-dashboard" -ForegroundColor Cyan
Write-Host ""
$step2 = Read-Host "Press Enter after creating the tunnel"

Write-Host ""
Write-Host "Step 3: List Tunnels to Get Tunnel ID" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
Write-Host "  .\cloudflared.exe tunnel list" -ForegroundColor Cyan
Write-Host ""
$tunnelId = Read-Host "Enter the Tunnel ID (the long hex string) for zerodha-dashboard"

Write-Host ""
Write-Host "Step 4: Create Config File" -ForegroundColor Yellow
$configDir = "$env:USERPROFILE\.cloudflared"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$configFile = Join-Path $configDir "config.yml"
$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: zerodhadashboard.duckdns.org
    service: http://localhost:9000
  - service: http_status:404
"@

Set-Content -Path $configFile -Value $configContent
Write-Host "✓ Config file created: $configFile" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Route DNS" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
Write-Host "  .\cloudflared.exe tunnel route dns $tunnelId zerodhadashboard.duckdns.org" -ForegroundColor Cyan
Write-Host ""
$step5 = Read-Host "Press Enter after routing DNS"

Write-Host ""
Write-Host "Step 6: Start Tunnel" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor White
Write-Host "  .\cloudflared.exe tunnel run $tunnelId" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or run it in background:" -ForegroundColor White
Write-Host "  Start-Process -FilePath '.\cloudflared.exe' -ArgumentList 'tunnel','run','$tunnelId'" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Setup instructions complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test your setup:" -ForegroundColor Yellow
Write-Host "  https://zerodhadashboard.duckdns.org/api/zerodha/status" -ForegroundColor Cyan

