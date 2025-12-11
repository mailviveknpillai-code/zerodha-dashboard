# Start Provisioning API in Background
# Usage: .\start-api-background.ps1

Write-Host "`n=== Starting Provisioning API in Background ===" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiScript = Join-Path $scriptDir "provisioning-api-redis.js"

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
        Write-Host "Install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "[OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
$envPath = Join-Path $scriptDir ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[ERROR] .env file not found at: $envPath" -ForegroundColor Red
    Write-Host "Please create .env file with Cloudflare credentials!" -ForegroundColor Yellow
    exit 1
}

# Check if port 3000 is already in use
try {
    $port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host "[WARN] Port 3000 is already in use!" -ForegroundColor Yellow
        Write-Host "Process ID: $($port.OwningProcess)" -ForegroundColor White
        $response = Read-Host "Stop existing process and start new one? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        } else {
            Write-Host "[INFO] Keeping existing process. Exiting." -ForegroundColor Yellow
            exit 0
        }
    }
} catch {
    # Port is available
}

# Start the API in a new window that stays open
Write-Host "`n[INFO] Starting Provisioning API in new window..." -ForegroundColor Cyan
Write-Host "The window will stay open and show API logs." -ForegroundColor Gray
Write-Host "Close the window to stop the API.`n" -ForegroundColor Gray

# Change to API directory and start
Set-Location $scriptDir
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Write-Host '=== Provisioning API Running ===' -ForegroundColor Green; Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow; Write-Host ''; node provisioning-api-redis.js"
)

Start-Sleep -Seconds 2

# Check if it started successfully
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "[SUCCESS] Provisioning API is running!" -ForegroundColor Green
    Write-Host "  Status: $($response.status)" -ForegroundColor White
    Write-Host "  Health check: http://localhost:3000/api/health" -ForegroundColor Gray
} catch {
    Write-Host "[INFO] API is starting... (may take a few seconds)" -ForegroundColor Yellow
    Write-Host "  Check status with: .\check-api-status.ps1" -ForegroundColor Gray
}

Write-Host ""





