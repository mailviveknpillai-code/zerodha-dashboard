# Check Provisioning API Status
# Usage: .\check-api-status.ps1

Write-Host "`n=== Provisioning API Status Check ===" -ForegroundColor Cyan
Write-Host ""

$apiRunning = $false
$nodeInstalled = $false
$redisRunning = $false
$portInUse = $false

# Check 1: Health endpoint
Write-Host "[1/4] Checking API health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  [OK] API is RUNNING!" -ForegroundColor Green
    Write-Host "    Status: $($response.status)" -ForegroundColor White
    Write-Host "    Redis: $($response.redis)" -ForegroundColor White
    Write-Host "    Timestamp: $($response.timestamp)" -ForegroundColor Gray
    $apiRunning = $true
} catch {
    Write-Host "  [FAIL] API is NOT running" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $apiRunning = $false
}

# Check 2: Node.js installation
Write-Host "`n[2/4] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  [OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
        $nodeInstalled = $true
    } else {
        Write-Host "  [FAIL] Node.js is NOT installed" -ForegroundColor Red
        $nodeInstalled = $false
    }
} catch {
    Write-Host "  [FAIL] Node.js is NOT installed" -ForegroundColor Red
    Write-Host "    Install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    $nodeInstalled = $false
}

# Check 3: Redis service
Write-Host "`n[3/4] Checking Redis service..." -ForegroundColor Yellow
try {
    $redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
    if ($redisService) {
        if ($redisService.Status -eq "Running") {
            Write-Host "  [OK] Redis service is RUNNING" -ForegroundColor Green
            $redisRunning = $true
        } else {
            Write-Host "  [WARN] Redis service exists but is NOT running" -ForegroundColor Yellow
            Write-Host "    Status: $($redisService.Status)" -ForegroundColor White
            Write-Host "    Start it with: Start-Service -Name Redis" -ForegroundColor Gray
            $redisRunning = $false
        }
    } else {
        Write-Host "  [WARN] Redis service not found" -ForegroundColor Yellow
        Write-Host "    Redis might not be installed or service name is different" -ForegroundColor Gray
        $redisRunning = $false
    }
} catch {
    Write-Host "  [WARN] Could not check Redis service" -ForegroundColor Yellow
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    $redisRunning = $false
}

# Check 4: Port 3000 usage
Write-Host "`n[4/4] Checking port 3000..." -ForegroundColor Yellow
try {
    $port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host "  [OK] Port 3000 is in use" -ForegroundColor Green
        Write-Host "    Process: $($port.OwningProcess)" -ForegroundColor White
        $portInUse = $true
    } else {
        Write-Host "  [WARN] Port 3000 is NOT in use" -ForegroundColor Yellow
        Write-Host "    API might not be running" -ForegroundColor Gray
        $portInUse = $false
    }
} catch {
    Write-Host "  [WARN] Could not check port 3000" -ForegroundColor Yellow
    $portInUse = $false
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($apiRunning) {
    Write-Host "[OK] Provisioning API is RUNNING and ready!" -ForegroundColor Green
    Write-Host "`nYou can now:" -ForegroundColor Yellow
    Write-Host "  • Generate tokens: .\generate-token.ps1 -CustomerId `"customer-001`"" -ForegroundColor White
    Write-Host "  • Test provisioning: Use the token during installation" -ForegroundColor White
} else {
    Write-Host "[FAIL] Provisioning API is NOT running" -ForegroundColor Red
    Write-Host "`nTo start the API:" -ForegroundColor Yellow
    Write-Host "  1. Navigate to: installer\api" -ForegroundColor White
    Write-Host "  2. Run: .\start-api.ps1" -ForegroundColor White
    Write-Host "`nOr manually:" -ForegroundColor Yellow
    Write-Host "  cd installer\api" -ForegroundColor White
    Write-Host "  node provisioning-api-redis.js" -ForegroundColor White
}

Write-Host ""







