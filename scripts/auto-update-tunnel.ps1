# Automated Cloudflare Tunnel URL Update Script
# This script captures the tunnel URL and updates all configurations

param(
    [int]$WaitTime = 10
)

Write-Host "=== Automated Tunnel URL Update ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop old tunnel processes
Write-Host "1. Stopping old tunnel processes..." -ForegroundColor Yellow
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   [OK] Old processes stopped" -ForegroundColor Green

# Step 2: Start tunnel and capture URL
Write-Host ""
Write-Host "2. Starting new tunnel and capturing URL..." -ForegroundColor Yellow

$tempLogOut = "$env:TEMP\cloudflared-output.log"
$tempLogErr = "$env:TEMP\cloudflared-error.log"

# Start tunnel in background
$tunnelProcess = Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:9000" -NoNewWindow -PassThru -RedirectStandardOutput $tempLogOut -RedirectStandardError $tempLogErr

# Wait for tunnel to start
Start-Sleep -Seconds $WaitTime

# Read the log files to extract URL
$tunnelUrl = $null
$maxAttempts = 15
$attempt = 0

while ($attempt -lt $maxAttempts -and -not $tunnelUrl) {
    Start-Sleep -Seconds 2
    $attempt++
    
    # Check both log files
    foreach ($logFile in @($tempLogOut, $tempLogErr)) {
        if (Test-Path $logFile) {
            $logContent = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
            if ($logContent) {
                # Look for tunnel URL pattern
                if ($logContent -match "https://([a-z0-9\-]+\.trycloudflare\.com)") {
                    $tunnelUrl = "https://$($matches[1])"
                    Write-Host "   [OK] Tunnel URL captured: $tunnelUrl" -ForegroundColor Green
                    break
                }
            }
        }
    }
    
    if ($tunnelUrl) { break }
}

if (-not $tunnelUrl) {
    Write-Host "   [ERROR] Could not capture tunnel URL from logs" -ForegroundColor Red
    Write-Host "   Please check cloudflared window manually and share the URL" -ForegroundColor Yellow
    Write-Host "   Log file: $tempLog" -ForegroundColor Gray
    exit 1
}

# Step 3: Update application.properties
Write-Host ""
Write-Host "3. Updating application.properties..." -ForegroundColor Yellow
$propsFile = "backend\dashboard\src\main\resources\application.properties"
$newRedirectUri = "$tunnelUrl/api/zerodha/callback"

if (Test-Path $propsFile) {
    $content = Get-Content $propsFile -Raw
    $content = $content -replace '(zerodha\.redirect\.uri=)(.*)', "`$1`${ZERODHA_REDIRECT_URI:$newRedirectUri}"
    Set-Content -Path $propsFile -Value $content -NoNewline
    Write-Host "   [OK] application.properties updated" -ForegroundColor Green
    Write-Host "       New URI: $newRedirectUri" -ForegroundColor Gray
} else {
    Write-Host "   [WARN] application.properties not found" -ForegroundColor Yellow
}

# Step 4: Update docker-compose.yml
Write-Host ""
Write-Host "4. Updating docker-compose.yml..." -ForegroundColor Yellow
$composeFile = "docker-compose.yml"

if (Test-Path $composeFile) {
    $content = Get-Content $composeFile -Raw
    $content = $content -replace '(ZERODHA_REDIRECT_URI:\s*"`${ZERODHA_REDIRECT_URI:-)([^"]+)("})', "`$1$newRedirectUri`$3"
    Set-Content -Path $composeFile -Value $content -NoNewline
    Write-Host "   [OK] docker-compose.yml updated" -ForegroundColor Green
} else {
    Write-Host "   [WARN] docker-compose.yml not found" -ForegroundColor Yellow
}

# Step 5: Restart backend to apply changes
Write-Host ""
Write-Host "5. Restarting backend to apply changes..." -ForegroundColor Yellow
try {
    docker compose restart backend 2>&1 | Out-Null
    Start-Sleep -Seconds 5
    Write-Host "   [OK] Backend restarted" -ForegroundColor Green
} catch {
    Write-Host "   [WARN] Backend restart failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 6: Verify configuration
Write-Host ""
Write-Host "6. Verifying configuration..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $status = Invoke-RestMethod -Uri "http://localhost:9000/api/zerodha/status" -TimeoutSec 5 -ErrorAction Stop
    if ($status.callback_endpoint -eq $newRedirectUri) {
        Write-Host "   [OK] Backend verified with new redirect URI" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Backend callback endpoint: $($status.callback_endpoint)" -ForegroundColor Yellow
        Write-Host "          Expected: $newRedirectUri" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARN] Could not verify backend: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== Update Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "New Tunnel URL: $tunnelUrl" -ForegroundColor Cyan
Write-Host "New Redirect URI: $newRedirectUri" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update Zerodha app settings:" -ForegroundColor White
Write-Host "   Go to: https://kite.trade/apps" -ForegroundColor Gray
Write-Host "   Edit app (API Key: hvgaaodyzyhzq57s)" -ForegroundColor Gray
Write-Host "   Set Redirect URI to: $newRedirectUri" -ForegroundColor Green
Write-Host "   Save and wait 2-3 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test OAuth:" -ForegroundColor White
Write-Host "   Invoke-RestMethod http://localhost:9000/api/zerodha/auth-url" -ForegroundColor Gray
Write-Host "   Open the OAuth URL and complete login" -ForegroundColor Gray
Write-Host ""
Write-Host "Tunnel is running in background (PID: $($tunnelProcess.Id))" -ForegroundColor Gray

