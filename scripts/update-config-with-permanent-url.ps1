# Update Configuration Files with Permanent URL
# Run this after setting up permanent tunnel

param(
    [string]$PermanentUrl = "https://zerodhadashboard.duckdns.org"
)

Write-Host "=== Updating Configuration with Permanent URL ===" -ForegroundColor Cyan
Write-Host ""

$redirectUri = "$PermanentUrl/api/zerodha/callback"

# Update application.properties
Write-Host "1. Updating application.properties..." -ForegroundColor Yellow
$propsFile = "backend\dashboard\src\main\resources\application.properties"
if (Test-Path $propsFile) {
    $content = Get-Content $propsFile -Raw
    $content = $content -replace '(zerodha\.redirect\.uri=)(.*)', "`$1`${ZERODHA_REDIRECT_URI:$redirectUri}"
    Set-Content -Path $propsFile -Value $content -NoNewline
    Write-Host "   [OK] Updated" -ForegroundColor Green
} else {
    Write-Host "   [WARN] File not found" -ForegroundColor Yellow
}

# Update docker-compose.yml
Write-Host ""
Write-Host "2. Updating docker-compose.yml..." -ForegroundColor Yellow
$composeFile = "docker-compose.yml"
if (Test-Path $composeFile) {
    $content = Get-Content $composeFile -Raw
    $content = $content -replace '(ZERODHA_REDIRECT_URI:\s*"`${ZERODHA_REDIRECT_URI:-)([^"]+)("})', "`$1$redirectUri`$3"
    Set-Content -Path $composeFile -Value $content -NoNewline
    Write-Host "   [OK] Updated" -ForegroundColor Green
} else {
    Write-Host "   [WARN] File not found" -ForegroundColor Yellow
}

# Restart backend
Write-Host ""
Write-Host "3. Restarting backend..." -ForegroundColor Yellow
docker compose restart backend 2>&1 | Out-Null
Start-Sleep -Seconds 5
Write-Host "   [OK] Backend restarted" -ForegroundColor Green

# Verify
Write-Host ""
Write-Host "4. Verifying..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $status = Invoke-RestMethod -Uri "http://localhost:9000/api/zerodha/status" -TimeoutSec 5 -ErrorAction Stop
    if ($status.callback_endpoint -eq $redirectUri) {
        Write-Host "   [OK] Configuration verified!" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Expected: $redirectUri" -ForegroundColor Yellow
        Write-Host "          Got: $($status.callback_endpoint)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARN] Could not verify: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Update Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Permanent Redirect URI: $redirectUri" -ForegroundColor Cyan
Write-Host ""
Write-Host "Update Zerodha app settings with this URL (one-time setup)!" -ForegroundColor Yellow

