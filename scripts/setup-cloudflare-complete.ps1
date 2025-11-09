# Complete Cloudflare Tunnel Setup for Zerodha Dashboard
# This script sets up permanent Cloudflare Tunnel with DuckDNS domain

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cloudflare Tunnel Complete Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$cloudflaredExe = ".\cloudflared.exe"
if (-not (Test-Path $cloudflaredExe)) {
    Write-Host "✗ cloudflared.exe not found" -ForegroundColor Red
    Write-Host "Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    exit 1
}

# Check backend
Write-Host "Checking backend..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "http://localhost:9000/api/zerodha/status" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ Backend is running on port 9000" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend not running on port 9000" -ForegroundColor Red
    Write-Host "Please start backend first: cd backend\dashboard; mvn spring-boot:run" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Login to Cloudflare" -ForegroundColor Cyan
Write-Host "This will open a browser window..." -ForegroundColor White
& $cloudflaredExe tunnel login
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Login failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Login successful" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Create Tunnel" -ForegroundColor Cyan
$tunnelName = "zerodha-dashboard"
& $cloudflaredExe tunnel create $tunnelName
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Tunnel may already exist, continuing..." -ForegroundColor Yellow
}
Write-Host "✓ Tunnel created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Get Tunnel ID" -ForegroundColor Cyan
$tunnelList = & $cloudflaredExe tunnel list 2>&1
$tunnelId = $null
foreach ($line in $tunnelList) {
    if ($line -match "$tunnelName\s+([a-f0-9-]+)") {
        $tunnelId = $matches[1]
        break
    }
}

if (-not $tunnelId) {
    Write-Host "✗ Could not find tunnel ID" -ForegroundColor Red
    Write-Host "Tunnel list output:" -ForegroundColor Yellow
    $tunnelList | Write-Host
    exit 1
}

Write-Host "✓ Found tunnel ID: $tunnelId" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Create Config File" -ForegroundColor Cyan
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
Write-Host "✓ Config created: $configFile" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Route DNS" -ForegroundColor Cyan
& $cloudflaredExe tunnel route dns $tunnelId zerodhadashboard.duckdns.org
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ DNS routed" -ForegroundColor Green
} else {
    Write-Host "⚠️  DNS routing may need manual configuration" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 6: Starting Tunnel" -ForegroundColor Cyan
Write-Host "Starting tunnel in background..." -ForegroundColor White
Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel","run",$tunnelId -WindowStyle Minimized

Start-Sleep -Seconds 5

$tunnel = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($tunnel) {
    Write-Host "✓ Tunnel started (PID: $($tunnel.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  Tunnel process not found - may need manual start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test your setup:" -ForegroundColor Yellow
Write-Host "  https://zerodhadashboard.duckdns.org/api/zerodha/status" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run tunnel manually:" -ForegroundColor Yellow
Write-Host "  .\cloudflared.exe tunnel run $tunnelId" -ForegroundColor Cyan
Write-Host ""

