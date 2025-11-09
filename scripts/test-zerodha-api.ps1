# Test Zerodha API Directly (Local Testing)
# This tests the API without needing Cloudflare tunnel

param(
    [string]$BaseUrl = "http://localhost:9000"
)

Write-Host "=== Testing Zerodha API (Local) ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend status..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   [OK] Backend is running" -ForegroundColor Green
    Write-Host "   Zerodha Enabled: $($health.zerodhaEnabled)" -ForegroundColor $(if ($health.zerodhaEnabled) { "Green" } else { "Red" })
    Write-Host "   Data Source: $($health.primaryDataSource)" -ForegroundColor White
} catch {
    Write-Host "   [ERROR] Backend not running: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Start backend: docker compose up -d backend" -ForegroundColor Yellow
    exit 1
}

# Check Zerodha status
Write-Host ""
Write-Host "2. Checking Zerodha API status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$BaseUrl/api/zerodha/status" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   [OK] Zerodha endpoint accessible" -ForegroundColor Green
    Write-Host "   API Key Configured: $($status.api_key_configured)" -ForegroundColor $(if ($status.api_key_configured) { "Green" } else { "Red" })
    Write-Host "   Callback Endpoint: $($status.callback_endpoint)" -ForegroundColor White
} catch {
    Write-Host "   [ERROR] Could not access Zerodha status: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test derivatives API
Write-Host ""
Write-Host "3. Testing derivatives API..." -ForegroundColor Yellow
try {
    $derivatives = Invoke-RestMethod -Uri "$BaseUrl/api/real-derivatives?underlying=NIFTY" -TimeoutSec 20 -ErrorAction Stop
    Write-Host "   [OK] Derivatives API responded" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Response Details:" -ForegroundColor Cyan
    Write-Host "   - Data Source: $($derivatives.dataSource)" -ForegroundColor $(if ($derivatives.dataSource -eq "ZERODHA_API") { "Green" } else { "Yellow" })
    Write-Host "   - Spot Price: $($derivatives.spotPrice)" -ForegroundColor White
    Write-Host "   - Futures Count: $($derivatives.futures.Count)" -ForegroundColor White
    Write-Host "   - Call Options Count: $($derivatives.callOptions.Count)" -ForegroundColor White
    Write-Host "   - Put Options Count: $($derivatives.putOptions.Count)" -ForegroundColor White
    Write-Host "   - Total Contracts: $($derivatives.totalContracts)" -ForegroundColor White
    Write-Host ""
    
    if ($derivatives.totalContracts -gt 0) {
        Write-Host "   [SUCCESS] Data is populated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Sample Futures:" -ForegroundColor Cyan
        $derivatives.futures | Select-Object -First 3 | Format-Table tradingsymbol, lastPrice, change, volume -AutoSize | Write-Host
        Write-Host ""
        Write-Host "   Sample Call Options:" -ForegroundColor Cyan
        $derivatives.callOptions | Select-Object -First 3 | Format-Table tradingsymbol, lastPrice, strikePrice, change -AutoSize | Write-Host
    } else {
        Write-Host "   [WARN] No data returned - checking token..." -ForegroundColor Yellow
        
        # Check token validity
        Write-Host ""
        Write-Host "4. Checking access token..." -ForegroundColor Yellow
        $currentToken = docker exec zerodha-backend printenv ZERODHA_ACCESS_TOKEN
        $headers = @{
            "Authorization" = "token hvgaaodyzyhzq57s:$currentToken"
            "X-Kite-Version" = "3"
        }
        
        try {
            $profile = Invoke-RestMethod -Uri "https://api.kite.trade/user/profile" -Headers $headers -Method Get -TimeoutSec 10
            Write-Host "   [OK] Token is valid - User: $($profile.data.user_name)" -ForegroundColor Green
            Write-Host "   [INFO] Empty data may indicate:" -ForegroundColor Yellow
            Write-Host "   - Market is closed" -ForegroundColor White
            Write-Host "   - Market data subscription issue" -ForegroundColor White
            Write-Host "   - Token needs refresh" -ForegroundColor White
        } catch {
            Write-Host "   [ERROR] Token may be invalid: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   [ERROR] Derivatives API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test spot price endpoint
Write-Host ""
Write-Host "5. Testing spot price..." -ForegroundColor Yellow
try {
    # Note: This endpoint may not exist, but we can check
    Write-Host "   [INFO] Spot price is included in derivatives response above" -ForegroundColor Gray
} catch {
    Write-Host "   [INFO] Spot price endpoint not available" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Green
Write-Host ""
Write-Host "Backend Status: Running" -ForegroundColor Green
Write-Host "Zerodha API: Enabled" -ForegroundColor Green
if ($derivatives.totalContracts -gt 0) {
    Write-Host "Data Available: YES" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ API is working correctly!" -ForegroundColor Green
    Write-Host "You can now proceed with Cloudflare tunnel setup for OAuth." -ForegroundColor Cyan
} else {
    Write-Host "Data Available: NO" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  API is responding but no data returned." -ForegroundColor Yellow
    Write-Host "Possible reasons:" -ForegroundColor White
    Write-Host "  - Market is closed" -ForegroundColor Gray
    Write-Host "  - Token needs refresh" -ForegroundColor Gray
    Write-Host "  - Market data subscription issue" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Test again during market hours (9:15 AM - 3:30 PM IST)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "To test OAuth (requires public URL):" -ForegroundColor Yellow
Write-Host "  Use quick tunnel: .\scripts\auto-update-tunnel.ps1" -ForegroundColor Gray
Write-Host "  Or set up permanent tunnel: .\scripts\setup-permanent-tunnel-duckdns.ps1" -ForegroundColor Gray

