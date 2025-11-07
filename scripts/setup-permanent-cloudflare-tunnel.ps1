# Permanent Cloudflare Tunnel Setup Script for Zerodha Dashboard
# This configures Cloudflare Tunnel to route zerodhadashboard.duckdns.org to localhost:9000

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "zerodhadashboard"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Permanent Cloudflare Tunnel Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$cloudflaredExe = ".\cloudflared.exe"
if (-not (Test-Path $cloudflaredExe)) {
    Write-Host "✗ cloudflared.exe not found in workspace root" -ForegroundColor Red
    Write-Host "Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    exit 1
}

# Check if backend is running
Write-Host "Checking backend status..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "http://localhost:9000/api/zerodha/status" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✓ Backend is running on port 9000" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is NOT running on port 9000" -ForegroundColor Red
    Write-Host "Please start your backend first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Setting up permanent Cloudflare Tunnel..." -ForegroundColor Yellow
Write-Host ""

# Step 1: Login to Cloudflare
Write-Host "Step 1: Login to Cloudflare" -ForegroundColor Cyan
Write-Host "This will open a browser window for authentication..." -ForegroundColor White
$login = Read-Host "Have you already logged in? (y/n)"
if ($login -ne "y") {
    Write-Host "Running: .\cloudflared.exe tunnel login" -ForegroundColor White
    & $cloudflaredExe tunnel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Cloudflare login failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Cloudflare login successful" -ForegroundColor Green
} else {
    Write-Host "✓ Using existing Cloudflare login" -ForegroundColor Green
}

Write-Host ""

# Step 2: Create named tunnel
Write-Host "Step 2: Create named tunnel" -ForegroundColor Cyan
$tunnelName = "zerodha-dashboard"
Write-Host "Creating tunnel: $tunnelName" -ForegroundColor White
& $cloudflaredExe tunnel create $tunnelName
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Tunnel creation failed or tunnel already exists" -ForegroundColor Yellow
    Write-Host "Continuing with existing tunnel..." -ForegroundColor White
} else {
    Write-Host "✓ Tunnel created successfully" -ForegroundColor Green
}

Write-Host ""

# Step 3: Create config file
Write-Host "Step 3: Create configuration file" -ForegroundColor Cyan
$configDir = "$env:USERPROFILE\.cloudflared"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$configFile = Join-Path $configDir "config.yml"

# Find tunnel ID
Write-Host "Finding tunnel ID..." -ForegroundColor White
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
    Write-Host "Please run: .\cloudflared.exe tunnel list" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found tunnel ID: $tunnelId" -ForegroundColor Green

# Create config content
$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: $Domain.duckdns.org
    service: http://localhost:9000
  - service: http_status:404
"@

Set-Content -Path $configFile -Value $configContent
Write-Host "✓ Configuration file created: $configFile" -ForegroundColor Green

Write-Host ""

# Step 4: Route DNS
Write-Host "Step 4: Route DNS to Cloudflare" -ForegroundColor Cyan
Write-Host "This will configure DNS routing for $Domain.duckdns.org" -ForegroundColor White
Write-Host "Note: This may require Cloudflare to manage DNS for your domain" -ForegroundColor Yellow
Write-Host ""
$routeDns = Read-Host "Route DNS through Cloudflare? (y/n)"
if ($routeDns -eq "y") {
    & $cloudflaredExe tunnel route dns $tunnelId "$Domain.duckdns.org"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ DNS routing configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  DNS routing may have failed" -ForegroundColor Yellow
        Write-Host "You may need to configure DNS manually" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  Skipping DNS routing" -ForegroundColor Yellow
    Write-Host "You'll need to configure DNS manually or use Cloudflare DNS" -ForegroundColor White
}

Write-Host ""

# Step 5: Start tunnel
Write-Host "Step 5: Start Cloudflare Tunnel" -ForegroundColor Cyan
Write-Host "Starting tunnel in background..." -ForegroundColor White
Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "run", $tunnelId -WindowStyle Minimized

Start-Sleep -Seconds 5

$tunnelProcess = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($tunnelProcess) {
    Write-Host "✓ Cloudflare Tunnel started (PID: $($tunnelProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  Tunnel process not found - check if it started manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test your setup:" -ForegroundColor Yellow
Write-Host "  https://$Domain.duckdns.org/api/zerodha/status" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run tunnel manually:" -ForegroundColor Yellow
Write-Host "  .\cloudflared.exe tunnel run $tunnelId" -ForegroundColor Cyan
Write-Host ""

