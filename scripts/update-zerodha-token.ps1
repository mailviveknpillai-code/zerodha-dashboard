# Update Zerodha Access Token
# Use this script after getting a new access token from OAuth callback

param(
    [Parameter(Mandatory=$true)]
    [string]$AccessToken
)

Write-Host "=== Updating Zerodha Access Token ===" -ForegroundColor Cyan
Write-Host ""

# Validate token format (should be alphanumeric, around 30-40 chars)
if ($AccessToken.Length -lt 20 -or $AccessToken.Length -gt 50) {
    Write-Host "[WARN] Token length seems unusual. Continuing anyway..." -ForegroundColor Yellow
}

Write-Host "New Access Token: $($AccessToken.Substring(0, [Math]::Min(8, $AccessToken.Length)))****" -ForegroundColor Gray
Write-Host ""

# 1. Update application.properties
$appPropsPath = "backend\dashboard\src\main\resources\application.properties"
if (Test-Path $appPropsPath) {
    Write-Host "1. Updating application.properties..." -ForegroundColor Yellow
    $content = Get-Content $appPropsPath -Raw
    
    # Update or add zerodha.access.token
    if ($content -match "zerodha\.access\.token\s*=") {
        $content = $content -replace "zerodha\.access\.token\s*=.*", "zerodha.access.token=${AccessToken}"
        Write-Host "   [OK] Updated existing token" -ForegroundColor Green
    } else {
        # Add after zerodha.enabled if it exists, or at the end
        if ($content -match "(zerodha\.enabled\s*=.*)") {
            $content = $content -replace "($matches[1])", "`$1`nzerodha.access.token=${AccessToken}"
        } else {
            $content += "`nzerodha.access.token=${AccessToken}`n"
        }
        Write-Host "   [OK] Added new token" -ForegroundColor Green
    }
    
    Set-Content -Path $appPropsPath -Value $content -NoNewline
    Write-Host "   [OK] application.properties updated" -ForegroundColor Green
} else {
    Write-Host "   [WARN] application.properties not found at $appPropsPath" -ForegroundColor Yellow
}

Write-Host ""

# 2. Update docker-compose.yml
$dockerComposePath = "docker-compose.yml"
if (Test-Path $dockerComposePath) {
    Write-Host "2. Updating docker-compose.yml..." -ForegroundColor Yellow
    $content = Get-Content $dockerComposePath -Raw
    
    # Update ZERODHA_ACCESS_TOKEN environment variable
    if ($content -match "ZERODHA_ACCESS_TOKEN:\s*[""']?[^""'\n\r]+[""']?") {
        $content = $content -replace "ZERODHA_ACCESS_TOKEN:\s*[""']?[^""'\n\r]+[""']?", "ZERODHA_ACCESS_TOKEN: `"${AccessToken}`""
        Write-Host "   [OK] Updated existing token" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] ZERODHA_ACCESS_TOKEN not found in docker-compose.yml" -ForegroundColor Yellow
        Write-Host "   [INFO] Please add it manually under backend environment variables" -ForegroundColor Gray
    }
    
    Set-Content -Path $dockerComposePath -Value $content -NoNewline
    Write-Host "   [OK] docker-compose.yml updated" -ForegroundColor Green
} else {
    Write-Host "   [WARN] docker-compose.yml not found" -ForegroundColor Yellow
}

Write-Host ""

# 3. Restart backend
Write-Host "3. Restarting backend..." -ForegroundColor Yellow
try {
    docker-compose restart backend
    Write-Host "   [OK] Backend restarted" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting 10 seconds for backend to start..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Verify backend is running
    Write-Host ""
    Write-Host "4. Verifying token..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "token hvgaaodyzyhzq57s:${AccessToken}"
        "X-Kite-Version" = "3"
    }
    
    try {
        $profile = Invoke-RestMethod -Uri "https://api.kite.trade/user/profile" -Headers $headers -Method Get -TimeoutSec 10
        if ($profile.data.user_id) {
            Write-Host "   [OK] Token is valid! User: $($profile.data.user_name)" -ForegroundColor Green
        } else {
            Write-Host "   [WARN] Token test returned unexpected response" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   [FAIL] Token validation failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   [INFO] The token might need a few more seconds to activate" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "   [FAIL] Failed to restart backend: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   [INFO] Please restart manually: docker-compose restart backend" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Token Update Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test the API: Invoke-WebRequest http://localhost:9000/api/real-derivatives?underlying=NIFTY" -ForegroundColor White
Write-Host "  2. Check frontend: http://localhost:5174" -ForegroundColor White
Write-Host ""

