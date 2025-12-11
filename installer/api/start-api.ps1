# Start Provisioning API
# Usage: .\start-api.ps1

Write-Host "`n=== Starting Provisioning API ===" -ForegroundColor Cyan
Write-Host ""

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
    Write-Host "Install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "[WARN] .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from template..." -ForegroundColor Yellow
    
    $templatePath = Join-Path $PSScriptRoot ".env.template"
    if (Test-Path $templatePath) {
        Copy-Item $templatePath $envPath
        Write-Host "[OK] Created .env file from template" -ForegroundColor Green
        Write-Host "[IMPORTANT] Please edit .env file and add your Cloudflare credentials!" -ForegroundColor Red
        Write-Host "  - CLOUDFLARE_ACCOUNT_ID" -ForegroundColor White
        Write-Host "  - CLOUDFLARE_API_TOKEN" -ForegroundColor White
        Write-Host ""
        Write-Host "Press any key to continue after updating .env file..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host "[ERROR] .env.template not found!" -ForegroundColor Red
        exit 1
    }
}

# Check if node_modules exists
$nodeModulesPath = Join-Path $PSScriptRoot "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "[WARN] node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
}

# Check if Redis is running
try {
    $redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
    if ($redisService -and $redisService.Status -eq "Running") {
        Write-Host "[OK] Redis service is running" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Redis service is not running" -ForegroundColor Yellow
        Write-Host "Start it with: Start-Service -Name Redis" -ForegroundColor White
    }
} catch {
    Write-Host "[WARN] Could not check Redis service" -ForegroundColor Yellow
}

# Check if port 3000 is available
try {
    $port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host "[WARN] Port 3000 is already in use!" -ForegroundColor Yellow
        Write-Host "Process ID: $($port.OwningProcess)" -ForegroundColor White
        Write-Host "You may need to stop the existing process first." -ForegroundColor Yellow
        $response = Read-Host "Continue anyway? (y/n)"
        if ($response -ne "y" -and $response -ne "Y") {
            exit 0
        }
    }
} catch {
    # Port is available
}

# Start the API
Write-Host "`n[INFO] Starting Provisioning API..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

Set-Location $PSScriptRoot
node provisioning-api-redis.js







