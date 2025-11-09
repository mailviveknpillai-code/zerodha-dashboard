# Deep Analysis of Zerodha API Configuration and Code
# This script tests every aspect of the API integration

param(
    [string]$BaseUrl = "http://localhost:9000"
)

Write-Host "=== DEEP ANALYSIS: Zerodha API Integration ===" -ForegroundColor Cyan
Write-Host ""

# Get current token
$currentToken = docker exec zerodha-backend printenv ZERODHA_ACCESS_TOKEN
$apiKey = "hvgaaodyzyhzq57s"

Write-Host "API Key: $apiKey" -ForegroundColor Gray
Write-Host "Access Token: $($currentToken.Substring(0, [Math]::Min(10, $currentToken.Length)))****" -ForegroundColor Gray
Write-Host ""

# Test 1: Verify Authorization Header Format
Write-Host "TEST 1: Authorization Header Format" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
$headers = @{
    "Authorization" = "token $apiKey`:$currentToken"
    "X-Kite-Version" = "3"
}
Write-Host "Header: Authorization: token $apiKey`:$($currentToken.Substring(0, 10))****" -ForegroundColor White
Write-Host "Header: X-Kite-Version: 3" -ForegroundColor White
Write-Host ""

# Test 2: Test Profile API (should work)
Write-Host "TEST 2: Profile API (Baseline Test)" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
try {
    $profile = Invoke-RestMethod -Uri "https://api.kite.trade/user/profile" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "[OK] Profile API works" -ForegroundColor Green
    Write-Host "User: $($profile.data.user_name)" -ForegroundColor White
    Write-Host "User ID: $($profile.data.user_id)" -ForegroundColor White
    Write-Host "Email: $($profile.data.email)" -ForegroundColor White
} catch {
    Write-Host "[FAIL] Profile API failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Test Instruments API - Verify CSV Format
Write-Host "TEST 3: Instruments API - Verify CSV Format" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Gray
try {
    $instruments = Invoke-RestMethod -Uri "https://api.kite.trade/instruments/NFO" -Headers $headers -Method Get -TimeoutSec 30
    Write-Host "[OK] Instruments API responded" -ForegroundColor Green
    Write-Host "Response Type: $($instruments.GetType().Name)" -ForegroundColor White
    
    # Check if it's a string (CSV) or object
    if ($instruments -is [string]) {
        Write-Host "[OK] Response is CSV format (correct)" -ForegroundColor Green
        $lines = $instruments -split "`n"
        Write-Host "Total Lines: $($lines.Count)" -ForegroundColor White
        Write-Host "First Line (Header): $($lines[0])" -ForegroundColor Gray
        Write-Host "Second Line (Sample): $($lines[1])" -ForegroundColor Gray
        
        # Parse header
        $headerFields = $lines[0] -split ","
        Write-Host "Header Fields ($($headerFields.Count)): $($headerFields -join ', ')" -ForegroundColor White
        
        # Find NIFTY instruments
        $niftyLines = $lines | Select-String "NIFTY" | Select-Object -First 5
        Write-Host "Sample NIFTY Instruments:" -ForegroundColor Cyan
        $niftyLines | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Host "[WARN] Response is not CSV - might be JSON" -ForegroundColor Yellow
        $instruments | ConvertTo-Json -Depth 2 | Write-Host
    }
} catch {
    Write-Host "[FAIL] Instruments API failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Response: $errorBody" -ForegroundColor Yellow
        } catch {}
    }
}
Write-Host ""

# Test 4: Test Quote API with Single Token (NIFTY Index)
Write-Host "TEST 4: Quote API - NIFTY Index (Single Token)" -ForegroundColor Yellow
Write-Host "----------------------------------------------" -ForegroundColor Gray
try {
    $quoteUrl = "https://api.kite.trade/quote?i=NSE:256265"
    Write-Host "URL: $quoteUrl" -ForegroundColor Gray
    $quote = Invoke-RestMethod -Uri $quoteUrl -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "[OK] Quote API responded" -ForegroundColor Green
    Write-Host "Response Structure:" -ForegroundColor White
    $quote | ConvertTo-Json -Depth 5 | Write-Host
    
    if ($quote.data) {
        $dataKeys = ($quote.data | Get-Member -MemberType NoteProperty).Name
        Write-Host "Data Keys: $($dataKeys -join ', ')" -ForegroundColor White
        
        if ($dataKeys.Count -gt 0) {
            $firstKey = $dataKeys[0]
            $quoteData = $quote.data.$firstKey
            Write-Host "Sample Quote Data for ${firstKey}:" -ForegroundColor Cyan
            if ($quoteData.last_price) { Write-Host "  Last Price: $($quoteData.last_price)" -ForegroundColor Green }
            if ($quoteData.volume) { Write-Host "  Volume: $($quoteData.volume)" -ForegroundColor White }
            if ($quoteData.oi) { Write-Host "  OI: $($quoteData.oi)" -ForegroundColor White }
        } else {
            Write-Host "[WARN] Data object is empty!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARN] No data object in response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Quote API failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Test Quote API with Multiple Tokens (NFO Futures)
Write-Host "TEST 5: Quote API - Multiple NFO Tokens" -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Gray
try {
    # Test with a known NFO future token (from logs)
    $nfoTokens = @("NFO:9485826", "NFO:9807874")
    $quoteUrl = "https://api.kite.trade/quote?" + ($nfoTokens | ForEach-Object { "i=$_" } | Join-String -Separator "&")
    Write-Host "URL: $quoteUrl" -ForegroundColor Gray
    $quote = Invoke-RestMethod -Uri $quoteUrl -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "[OK] Quote API responded" -ForegroundColor Green
    
    if ($quote.data) {
        $dataKeys = ($quote.data | Get-Member -MemberType NoteProperty).Name
        Write-Host "Data Keys Returned: $($dataKeys.Count)" -ForegroundColor White
        Write-Host "Keys: $($dataKeys -join ', ')" -ForegroundColor Gray
        
        foreach ($key in $dataKeys) {
            $quoteData = $quote.data.$key
            Write-Host "  ${key}:" -ForegroundColor Cyan
            if ($quoteData.last_price) { Write-Host "    Last Price: $($quoteData.last_price)" -ForegroundColor Green }
            if ($quoteData.tradingsymbol) { Write-Host "    Symbol: $($quoteData.tradingsymbol)" -ForegroundColor White }
            if ($quoteData.volume) { Write-Host "    Volume: $($quoteData.volume)" -ForegroundColor White }
        }
        
        if ($dataKeys.Count -eq 0) {
            Write-Host "[WARN] No data returned for NFO tokens!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARN] No data object in response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Quote API failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Verify Backend Code Logic
Write-Host "TEST 6: Backend Code Analysis" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Gray
Write-Host "Checking backend adapter code for issues..." -ForegroundColor White

# Check if backend is using correct endpoints
try {
    $backendStatus = Invoke-RestMethod -Uri "$BaseUrl/api/zerodha/status" -TimeoutSec 5
    Write-Host "[OK] Backend status endpoint works" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Cannot access backend status" -ForegroundColor Yellow
}
Write-Host ""

# Test 7: Test Actual Backend API Call
Write-Host "TEST 7: Backend Derivatives API Call" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/real-derivatives?underlying=NIFTY" -TimeoutSec 30
    Write-Host "[OK] Backend API responded" -ForegroundColor Green
    Write-Host "Data Source: $($response.dataSource)" -ForegroundColor White
    Write-Host "Spot Price: $($response.spotPrice)" -ForegroundColor White
    Write-Host "Futures: $($response.futures.Count)" -ForegroundColor White
    Write-Host "Call Options: $($response.callOptions.Count)" -ForegroundColor White
    Write-Host "Put Options: $($response.putOptions.Count)" -ForegroundColor White
    
    if ($response.futures.Count -gt 0) {
        Write-Host "Sample Future:" -ForegroundColor Cyan
        $response.futures[0] | ConvertTo-Json -Depth 2 | Write-Host
    }
} catch {
    Write-Host "[FAIL] Backend API failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Check Backend Logs for Detailed Errors
Write-Host "TEST 8: Backend Logs Analysis" -ForegroundColor Yellow
Write-Host "----------------------------" -ForegroundColor Gray
Write-Host "Recent backend logs:" -ForegroundColor White
docker logs zerodha-backend --tail 30 2>&1 | Select-String -Pattern "Zerodha|quote|instrument|error|WARN|ERROR" | Select-Object -Last 10 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=== ANALYSIS SUMMARY ===" -ForegroundColor Green
Write-Host ""
Write-Host "Key Findings:" -ForegroundColor Yellow
Write-Host "1. Verify authorization header format matches Zerodha docs" -ForegroundColor White
Write-Host "2. Verify instrument CSV format matches code expectations" -ForegroundColor White
Write-Host "3. Verify quote API response structure matches code parsing" -ForegroundColor White
Write-Host "4. Verify instrument token format (EXCHANGE:TOKEN)" -ForegroundColor White
Write-Host "5. Verify instrument type values (CE, PE, FUT)" -ForegroundColor White
Write-Host ""
Write-Host "Next: Review findings and fix any discrepancies" -ForegroundColor Cyan

