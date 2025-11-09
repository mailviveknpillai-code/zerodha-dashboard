# Setup Permanent Tunnel with DuckDNS Domain
# This creates a truly permanent URL using your existing DuckDNS domain

param(
    [string]$DuckDNSDomain = "zerodhadashboard.duckdns.org",
    [string]$TunnelName = "zerodha-dashboard-tunnel",
    [int]$LocalPort = 9000
)

Write-Host "=== Setting Up Permanent Tunnel with DuckDNS ===" -ForegroundColor Cyan
Write-Host ""

# Check if cloudflared is installed
if (-not (Test-Path ".\cloudflared.exe")) {
    Write-Host "[ERROR] cloudflared.exe not found in current directory" -ForegroundColor Red
    exit 1
}

# Step 1: Login to Cloudflare
Write-Host "1. Authenticating with Cloudflare..." -ForegroundColor Yellow
$authCheck = & .\cloudflared.exe tunnel list 2>&1
if ($LASTEXITCODE -ne 0 -or $authCheck -match "not authenticated" -or $authCheck -match "login") {
    Write-Host "   Opening browser for authentication..." -ForegroundColor Cyan
    & .\cloudflared.exe tunnel login 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Authenticated" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Authentication failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   [OK] Already authenticated" -ForegroundColor Green
}

# Step 2: Create named tunnel
Write-Host ""
Write-Host "2. Creating named tunnel: $TunnelName" -ForegroundColor Yellow
$tunnelExists = & .\cloudflared.exe tunnel list 2>&1 | Select-String $TunnelName
if ($tunnelExists) {
    Write-Host "   [INFO] Tunnel already exists" -ForegroundColor Yellow
    $tunnelId = ($tunnelExists -split '\s+')[0]
} else {
    Write-Host "   Creating new tunnel..." -ForegroundColor Gray
    $createOutput = & .\cloudflared.exe tunnel create $TunnelName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Tunnel created" -ForegroundColor Green
        $tunnelId = ($createOutput | Select-String -Pattern "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}").Matches.Value
    } else {
        Write-Host "   [ERROR] Failed to create tunnel" -ForegroundColor Red
        exit 1
    }
}

Write-Host "   Tunnel ID: $tunnelId" -ForegroundColor Gray

# Step 3: Create config file
Write-Host ""
Write-Host "3. Creating tunnel configuration..." -ForegroundColor Yellow
$configDir = "$env:USERPROFILE\.cloudflared"
$configFile = "$configDir\config.yml"

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: $DuckDNSDomain
    service: http://localhost:$LocalPort
  - service: http_status:404
"@

Set-Content -Path $configFile -Value $configContent
Write-Host "   [OK] Config file created: $configFile" -ForegroundColor Green

# Step 4: Route tunnel to DuckDNS domain
Write-Host ""
Write-Host "4. Routing tunnel to domain: $DuckDNSDomain" -ForegroundColor Yellow
Write-Host "   This creates a permanent URL that never changes" -ForegroundColor Gray

# Check if domain is already routed
$routeCheck = & .\cloudflared.exe tunnel route dns list $TunnelName 2>&1
if ($routeCheck -match $DuckDNSDomain) {
    Write-Host "   [INFO] Domain already routed" -ForegroundColor Yellow
} else {
    Write-Host "   Routing tunnel to domain..." -ForegroundColor Gray
    $routeOutput = & .\cloudflared.exe tunnel route dns $TunnelName $DuckDNSDomain 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Domain routed successfully" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] DNS routing may need manual setup" -ForegroundColor Yellow
        Write-Host "   Output: $routeOutput" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Manual DNS setup:" -ForegroundColor Yellow
        Write-Host "   1. Go to Cloudflare Dashboard" -ForegroundColor White
        Write-Host "   2. Add DNS record:" -ForegroundColor White
        Write-Host "      Type: CNAME" -ForegroundColor Gray
        Write-Host "      Name: $DuckDNSDomain" -ForegroundColor Gray
        Write-Host "      Target: $tunnelId.cfargotunnel.com" -ForegroundColor Gray
        Write-Host "      Proxy: Proxied (orange cloud)" -ForegroundColor Gray
    }
}

# Step 5: Stop existing tunnels
Write-Host ""
Write-Host "5. Stopping existing tunnel processes..." -ForegroundColor Yellow
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   [OK] Stopped" -ForegroundColor Green

# Step 6: Start tunnel
Write-Host ""
Write-Host "6. Starting tunnel..." -ForegroundColor Yellow
Write-Host "   Permanent URL: https://$DuckDNSDomain" -ForegroundColor Cyan
Write-Host ""

$tempLog = "$env:TEMP\cloudflared-tunnel.log"
Start-Process -FilePath ".\cloudflared.exe" `
    -ArgumentList "tunnel", "--config", $configFile, "run", $TunnelName `
    -NoNewWindow -PassThru `
    -RedirectStandardOutput $tempLog `
    -RedirectStandardError $tempLog

Start-Sleep -Seconds 5
Write-Host "   [OK] Tunnel started" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Permanent URL: https://$DuckDNSDomain" -ForegroundColor Cyan
Write-Host "Redirect URI: https://$DuckDNSDomain/api/zerodha/callback" -ForegroundColor Cyan
Write-Host ""
Write-Host "This URL will NEVER change!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update Zerodha redirect URI to:" -ForegroundColor White
Write-Host "   https://$DuckDNSDomain/api/zerodha/callback" -ForegroundColor Green
Write-Host ""
Write-Host "2. Update backend configuration:" -ForegroundColor White
Write-Host "   Run: .\scripts\update-config-with-permanent-url.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Set up as Windows service (auto-start):" -ForegroundColor White
Write-Host "   .\cloudflared.exe service install" -ForegroundColor Cyan
Write-Host "   .\cloudflared.exe service start" -ForegroundColor Cyan
Write-Host ""
Write-Host "Config file: $configFile" -ForegroundColor Gray
Write-Host "Tunnel ID: $tunnelId" -ForegroundColor Gray

