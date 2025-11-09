# Test NSE Integration Script
# This script tests the real NSE data integration

Write-Host "🚀 Testing NSE Integration..." -ForegroundColor Green

# Test real derivatives endpoint
Write-Host "`n📊 Testing Real Derivatives Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/real-derivatives?underlying=NIFTY" -Method GET
    Write-Host "✅ Real derivatives endpoint working!" -ForegroundColor Green
    Write-Host "   - Underlying: $($response.underlying)" -ForegroundColor Cyan
    Write-Host "   - Spot Price: ₹$($response.spotPrice)" -ForegroundColor Cyan
    Write-Host "   - Data Source: $($response.dataSource)" -ForegroundColor Cyan
    Write-Host "   - Futures Count: $($response.futures.Count)" -ForegroundColor Cyan
    Write-Host "   - Call Options Count: $($response.callOptions.Count)" -ForegroundColor Cyan
    Write-Host "   - Put Options Count: $($response.putOptions.Count)" -ForegroundColor Cyan
    Write-Host "   - Total Contracts: $($response.totalContracts)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Real derivatives endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test real derivatives by segment
Write-Host "`n📈 Testing Real Derivatives by Segment..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/real-derivatives/segment?segment=FUTURES&underlying=NIFTY" -Method GET
    Write-Host "✅ Futures segment working! Count: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Futures segment failed: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/real-derivatives/segment?segment=CALL_OPTIONS&underlying=NIFTY" -Method GET
    Write-Host "✅ Call options segment working! Count: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Call options segment failed: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/real-derivatives/segment?segment=PUT_OPTIONS&underlying=NIFTY" -Method GET
    Write-Host "✅ Put options segment working! Count: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Put options segment failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test real strike monitoring
Write-Host "`n🎯 Testing Real Strike Price Monitoring..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/real-strike-monitoring?underlying=NIFTY" -Method GET
    Write-Host "✅ Real strike monitoring working!" -ForegroundColor Green
    Write-Host "   - Spot Price: ₹$($response.spotPrice)" -ForegroundColor Cyan
    Write-Host "   - Daily Strike: ₹$($response.dailyStrikePrice)" -ForegroundColor Cyan
    Write-Host "   - Call Options Count: $($response.callOptions.Count)" -ForegroundColor Cyan
    Write-Host "   - Put Options Count: $($response.putOptions.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Real strike monitoring failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 NSE Integration Test Complete!" -ForegroundColor Green
Write-Host "If all tests pass, your dashboard is now using real NSE data!" -ForegroundColor Cyan

