# Start Permanent Named Tunnel
# This script starts the named tunnel that was configured

param(
    [string]$TunnelName = "zerodha-dashboard-tunnel",
    [string]$ConfigFile = "$env:USERPROFILE\.cloudflared\config.yml"
)

Write-Host "=== Starting Permanent Tunnel ===" -ForegroundColor Cyan
Write-Host ""

# Check if config file exists
if (-not (Test-Path $ConfigFile)) {
    Write-Host "[ERROR] Config file not found: $ConfigFile" -ForegroundColor Red
    Write-Host "Please run setup-permanent-tunnel.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Check if cloudflared is installed
if (-not (Test-Path ".\cloudflared.exe")) {
    Write-Host "[ERROR] cloudflared.exe not found in current directory" -ForegroundColor Red
    exit 1
}

# Stop existing tunnel processes
Write-Host "Stopping existing tunnel processes..." -ForegroundColor Yellow
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start tunnel
Write-Host "Starting tunnel: $TunnelName" -ForegroundColor Yellow
Write-Host "Config file: $ConfigFile" -ForegroundColor Gray
Write-Host ""

# Start tunnel and capture output
$tempLog = "$env:TEMP\cloudflared-tunnel.log"
$tunnelProcess = Start-Process -FilePath ".\cloudflared.exe" `
    -ArgumentList "tunnel", "--config", $ConfigFile, "run", $TunnelName `
    -NoNewWindow -PassThru `
    -RedirectStandardOutput $tempLog `
    -RedirectStandardError $tempLog

Start-Sleep -Seconds 8

# Try to extract URL from log
$tunnelUrl = $null
if (Test-Path $tempLog) {
    $logContent = Get-Content $tempLog -Raw -ErrorAction SilentlyContinue
    if ($logContent -match "https://([a-z0-9\-]+\.trycloudflare\.com)") {
        $tunnelUrl = "https://$($matches[1])"
    }
}

Write-Host "[OK] Tunnel started (PID: $($tunnelProcess.Id))" -ForegroundColor Green
if ($tunnelUrl) {
    Write-Host "Tunnel URL: $tunnelUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Redirect URI: $tunnelUrl/api/zerodha/callback" -ForegroundColor Cyan
} else {
    Write-Host "Check log file for URL: $tempLog" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Tunnel is running. Press Ctrl+C to stop." -ForegroundColor Yellow

