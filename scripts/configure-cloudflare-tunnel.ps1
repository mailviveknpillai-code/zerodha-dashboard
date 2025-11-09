# Cloudflare Tunnel Configuration Script for Zerodha Dashboard
# This script helps configure and start Cloudflare Tunnel

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "status", "restart", "setup-permanent")]
    [string]$Action = "start"
)

$cloudflaredExe = Join-Path $PSScriptRoot "..\cloudflared.exe"

function Start-Tunnel {
    Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Yellow
    
    if (-not (Test-Path $cloudflaredExe)) {
        Write-Host "✗ cloudflared.exe not found" -ForegroundColor Red
        Write-Host "Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
        return $false
    }
    
    # Check if already running
    $existing = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "⚠️  Cloudflare Tunnel is already running (PID: $($existing.Id))" -ForegroundColor Yellow
        Write-Host "Use 'stop' action to stop it first, or 'restart' to restart" -ForegroundColor White
        return $false
    }
    
    # Check if backend is running
    Write-Host "Checking backend on port 9000..." -ForegroundColor White
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:9000/api/zerodha/status" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✓ Backend is running" -ForegroundColor Green
    } catch {
        Write-Host "✗ Backend is not running on port 9000" -ForegroundColor Red
        Write-Host "Please start your backend first" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "Starting tunnel to http://localhost:9000..." -ForegroundColor White
    Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel", "--url", "http://localhost:9000"
    
    Start-Sleep -Seconds 3
    
    $process = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "✓ Cloudflare Tunnel started successfully (PID: $($process.Id))" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Check the tunnel window for your public URL" -ForegroundColor Yellow
        Write-Host "  It will look like: https://xxxxx.trycloudflare.com" -ForegroundColor White
        Write-Host ""
        Write-Host "This URL can be used for testing, but for production use:" -ForegroundColor White
        Write-Host "  https://zerodhadashboard.duckdns.org" -ForegroundColor Cyan
        return $true
    } else {
        Write-Host "✗ Failed to start Cloudflare Tunnel" -ForegroundColor Red
        return $false
    }
}

function Stop-Tunnel {
    Write-Host "Stopping Cloudflare Tunnel..." -ForegroundColor Yellow
    
    $process = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Name "cloudflared" -Force
        Start-Sleep -Seconds 2
        Write-Host "✓ Cloudflare Tunnel stopped" -ForegroundColor Green
        return $true
    } else {
        Write-Host "⚠️  Cloudflare Tunnel is not running" -ForegroundColor Yellow
        return $false
    }
}

function Get-TunnelStatus {
    Write-Host "=== Cloudflare Tunnel Status ===" -ForegroundColor Cyan
    
    $process = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "✓ Status: Running" -ForegroundColor Green
        Write-Host "  PID: $($process.Id)" -ForegroundColor White
        Write-Host "  Started: $($process.StartTime)" -ForegroundColor White
        Write-Host "  Memory: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  Check the tunnel window for the public URL" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Status: Not Running" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Backend Status:" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9000/api/zerodha/status" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✓ Backend is accessible on port 9000" -ForegroundColor Green
    } catch {
        Write-Host "✗ Backend is not accessible on port 9000" -ForegroundColor Red
    }
}

function Show-PermanentSetup {
    Write-Host "=== Permanent Cloudflare Tunnel Setup ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "For production use with DuckDNS domain, follow these steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Sign up for Cloudflare account (free):" -ForegroundColor White
    Write-Host "   https://dash.cloudflare.com/sign-up" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Login to Cloudflare:" -ForegroundColor White
    Write-Host "   .\cloudflared.exe tunnel login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Create named tunnel:" -ForegroundColor White
    Write-Host "   .\cloudflared.exe tunnel create zerodha-dashboard" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Configure tunnel (create config.yml):" -ForegroundColor White
    Write-Host "   Location: $env:USERPROFILE\.cloudflared\config.yml" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Config content:" -ForegroundColor White
    Write-Host "   tunnel: zerodha-dashboard" -ForegroundColor Gray
    Write-Host "   credentials-file: $env:USERPROFILE\.cloudflared\[tunnel-id].json" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   ingress:" -ForegroundColor Gray
    Write-Host "     - hostname: zerodhadashboard.duckdns.org" -ForegroundColor Gray
    Write-Host "       service: http://localhost:9000" -ForegroundColor Gray
    Write-Host "     - service: http_status:404" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Route DNS (if using Cloudflare DNS):" -ForegroundColor White
    Write-Host "   .\cloudflared.exe tunnel route dns zerodha-dashboard zerodhadashboard.duckdns.org" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "6. Run tunnel:" -ForegroundColor White
    Write-Host "   .\cloudflared.exe tunnel run zerodha-dashboard" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "For detailed instructions, see:" -ForegroundColor White
    Write-Host "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/" -ForegroundColor Cyan
}

# Main execution
switch ($Action) {
    "start" {
        Start-Tunnel
    }
    "stop" {
        Stop-Tunnel
    }
    "status" {
        Get-TunnelStatus
    }
    "restart" {
        Stop-Tunnel
        Start-Sleep -Seconds 2
        Start-Tunnel
    }
    "setup-permanent" {
        Show-PermanentSetup
    }
    default {
        Write-Host "Usage: .\configure-cloudflare-tunnel.ps1 -Action [start|stop|status|restart|setup-permanent]" -ForegroundColor Yellow
    }
}

