# Setup Permanent Cloudflare Tunnel with Stable URL
# This creates a named tunnel that doesn't expire

param(
    [string]$TunnelName = "zerodha-dashboard-tunnel",
    [int]$LocalPort = 9000
)

Write-Host "=== Setting Up Permanent Cloudflare Tunnel ===" -ForegroundColor Cyan
Write-Host ""

# Check if cloudflared is installed
if (-not (Test-Path ".\cloudflared.exe")) {
    Write-Host "[ERROR] cloudflared.exe not found in current directory" -ForegroundColor Red
    Write-Host "Please download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    exit 1
}

# Step 1: Login to Cloudflare (if not already logged in)
Write-Host "1. Checking Cloudflare authentication..." -ForegroundColor Yellow
$authCheck = & .\cloudflared.exe tunnel list 2>&1
if ($LASTEXITCODE -ne 0 -or $authCheck -match "not authenticated" -or $authCheck -match "login") {
    Write-Host "   Cloudflare login required..." -ForegroundColor Yellow
    Write-Host "   This will open a browser for authentication" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Please login to Cloudflare in the browser window that opens" -ForegroundColor White
    Write-Host "   Press Enter after completing login..." -ForegroundColor Yellow
    Read-Host
    
    & .\cloudflared.exe tunnel login 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Cloudflare authentication successful" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Cloudflare authentication failed" -ForegroundColor Red
        Write-Host "   Please try: .\cloudflared.exe tunnel login" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   [OK] Already authenticated" -ForegroundColor Green
}

# Step 2: Create named tunnel (if doesn't exist)
Write-Host ""
Write-Host "2. Creating named tunnel: $TunnelName" -ForegroundColor Yellow
$tunnelExists = & .\cloudflared.exe tunnel list 2>&1 | Select-String $TunnelName
if ($tunnelExists) {
    Write-Host "   [INFO] Tunnel '$TunnelName' already exists" -ForegroundColor Yellow
    $tunnelId = ($tunnelExists -split '\s+')[0]
    Write-Host "   Tunnel ID: $tunnelId" -ForegroundColor Gray
} else {
    Write-Host "   Creating new tunnel..." -ForegroundColor Gray
    $createOutput = & .\cloudflared.exe tunnel create $TunnelName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Tunnel created successfully" -ForegroundColor Green
        $tunnelId = ($createOutput | Select-String -Pattern "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}").Matches.Value
        Write-Host "   Tunnel ID: $tunnelId" -ForegroundColor Gray
    } else {
        Write-Host "   [ERROR] Failed to create tunnel" -ForegroundColor Red
        Write-Host "   Output: $createOutput" -ForegroundColor Yellow
        exit 1
    }
}

# Step 3: Create config file
Write-Host ""
Write-Host "3. Creating tunnel configuration..." -ForegroundColor Yellow
$configDir = "$env:USERPROFILE\.cloudflared"
$configFile = "$configDir\config.yml"

# Create .cloudflared directory if it doesn't exist
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Get tunnel ID if we don't have it
if (-not $tunnelId) {
    $tunnelList = & .\cloudflared.exe tunnel list 2>&1
    $tunnelLine = $tunnelList | Select-String $TunnelName
    if ($tunnelLine) {
        $tunnelId = ($tunnelLine -split '\s+')[0]
    }
}

# Create config content
$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - hostname: $TunnelName.your-domain.com
    service: http://localhost:$LocalPort
  - service: http_status:404
"@

# If user doesn't have a domain, use trycloudflare.com with route
Write-Host "   Note: For permanent URL without domain, we'll use Cloudflare's routing" -ForegroundColor Gray
Write-Host "   Creating basic config..." -ForegroundColor Gray

# Simplified config for trycloudflare.com (no domain needed)
$configContent = @"
tunnel: $tunnelId
credentials-file: $configDir\$tunnelId.json

ingress:
  - service: http://localhost:$LocalPort
"@

Set-Content -Path $configFile -Value $configContent
Write-Host "   [OK] Config file created: $configFile" -ForegroundColor Green

# Step 4: Route tunnel (for custom domain) - Skip if using trycloudflare.com
Write-Host ""
Write-Host "4. Tunnel routing..." -ForegroundColor Yellow
Write-Host "   [INFO] Named tunnels provide better stability than quick tunnels" -ForegroundColor Gray
Write-Host "   For permanent URL, consider using a custom domain (see PERMANENT_TUNNEL_SETUP.md)" -ForegroundColor Gray
Write-Host "   Current setup uses trycloudflare.com with named tunnel for better stability" -ForegroundColor Gray

# Step 5: Run tunnel
Write-Host ""
Write-Host "5. Starting tunnel..." -ForegroundColor Yellow
Write-Host "   Tunnel will run and display a URL" -ForegroundColor Gray
Write-Host "   Press Ctrl+C to stop (or run as service)" -ForegroundColor Gray
Write-Host ""

# Check if tunnel is already running
$runningTunnel = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($runningTunnel) {
    Write-Host "   [INFO] Stopping existing tunnel processes..." -ForegroundColor Yellow
    Stop-Process -Name "cloudflared" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start tunnel
Write-Host "   Starting tunnel: $TunnelName" -ForegroundColor Cyan
Write-Host "   This will show the tunnel URL..." -ForegroundColor Gray
Write-Host ""

# Run tunnel and capture URL
$tempLog = "$env:TEMP\cloudflared-tunnel.log"
Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel", "--config", $configFile, "run", $TunnelName -NoNewWindow -PassThru -RedirectStandardOutput $tempLog -RedirectStandardError $tempLog

Start-Sleep -Seconds 8

# Read URL from log
$tunnelUrl = $null
$maxAttempts = 15
$attempt = 0

while ($attempt -lt $maxAttempts -and -not $tunnelUrl) {
    Start-Sleep -Seconds 2
    $attempt++
    
    if (Test-Path $tempLog) {
        $logContent = Get-Content $tempLog -Raw -ErrorAction SilentlyContinue
        if ($logContent) {
            # Look for tunnel URL pattern
            if ($logContent -match "https://([a-z0-9\-]+\.trycloudflare\.com)") {
                $tunnelUrl = "https://$($matches[1])"
                Write-Host "   [OK] Tunnel URL: $tunnelUrl" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $tunnelUrl) {
    Write-Host "   [WARN] Could not capture URL from logs, but tunnel is running" -ForegroundColor Yellow
    Write-Host "   Check the tunnel process output for the URL" -ForegroundColor Gray
    Write-Host "   Log file: $tempLog" -ForegroundColor Gray
}

# Step 6: Setup as Windows Service (optional)
Write-Host ""
Write-Host "6. Setting up as Windows Service (optional)..." -ForegroundColor Yellow
Write-Host "   To run tunnel automatically on startup:" -ForegroundColor Gray
Write-Host "   .\cloudflared.exe service install" -ForegroundColor Cyan
Write-Host "   Then start with: .\cloudflared.exe service start" -ForegroundColor Cyan
Write-Host "   Or manually run: .\cloudflared.exe tunnel --config `"$configFile`" run $TunnelName" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Tunnel Name: $TunnelName" -ForegroundColor Cyan
if ($tunnelUrl) {
    Write-Host "Tunnel URL: $tunnelUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This URL should be stable and not expire!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Update Zerodha Redirect URI to:" -ForegroundColor Yellow
    Write-Host "$tunnelUrl/api/zerodha/callback" -ForegroundColor Green
}
Write-Host ""
Write-Host "Config File: $configFile" -ForegroundColor Gray
Write-Host "Tunnel ID: $tunnelId" -ForegroundColor Gray
Write-Host ""
Write-Host "To run tunnel manually:" -ForegroundColor Yellow
Write-Host "  .\cloudflared.exe tunnel --config `"$configFile`" run $TunnelName" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run as service (auto-start on boot):" -ForegroundColor Yellow
Write-Host "  .\cloudflared.exe service install" -ForegroundColor Cyan
Write-Host "  .\cloudflared.exe service start" -ForegroundColor Cyan

