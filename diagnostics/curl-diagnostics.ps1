# Breeze API Diagnostic Script for PowerShell
# This script performs comprehensive testing of the Breeze API using PowerShell

Write-Host "🔍 Breeze API Diagnostic Script (PowerShell)" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check required environment variables
$appKey = $env:APP_KEY
$breezeBase = $env:BREEZE_BASE
$appSecret = $env:APP_SECRET

if (-not $appKey) {
    Write-Error "❌ APP_KEY environment variable is required"
    Write-Host "Set it with: `$env:APP_KEY='<your_api_key>'" -ForegroundColor Yellow
    exit 1
}

if (-not $breezeBase) {
    $breezeBase = "https://api.icicidirect.com/breezeapi/api/v1"
    Write-Host "Using default base URL: $breezeBase" -ForegroundColor Yellow
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  APP_KEY: $($appKey.Substring(0, [Math]::Min(10, $appKey.Length)))..." -ForegroundColor White
Write-Host "  BREEZE_BASE: $breezeBase" -ForegroundColor White
Write-Host "  APP_SECRET: $($appSecret.Substring(0, [Math]::Min(10, $appSecret.Length)))..." -ForegroundColor White
Write-Host ""

# Create output directory
$outputDir = "diagnostics\output"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}
Set-Location $outputDir

# URL encode the API key for browser login
$encodedKey = [System.Web.HttpUtility]::UrlEncode($appKey)

Write-Host "1️⃣  MANUAL STEP: Get API Session Token" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Yellow
Write-Host "Open this URL in your browser to get API_SESSION:" -ForegroundColor White
Write-Host "https://api.icicidirect.com/apiuser/login?api_key=$encodedKey" -ForegroundColor Cyan
Write-Host ""
Write-Host "After login, you'll be redirected to a URL containing 'apisession='" -ForegroundColor White
Write-Host "Copy the value after 'apisession=' and set it as API_SESSION environment variable" -ForegroundColor White
Write-Host ""

# Check if API_SESSION is provided
$apiSession = $env:API_SESSION
if (-not $apiSession -or $apiSession -eq "<PASTE_API_SESSION_HERE>") {
    Write-Error "❌ API_SESSION not provided. Please set it and run again:"
    Write-Host '$env:API_SESSION=<your_session_token>' -ForegroundColor Yellow
    Write-Host ".\curl-diagnostics.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Using API_SESSION: $($apiSession.Substring(0, [Math]::Min(10, $apiSession.Length)))..." -ForegroundColor Green
Write-Host ""

# Test 1: Exchange API_SESSION for session token
Write-Host "2️⃣  Testing Session Exchange" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
$exchangeUrl = "$breezeBase/customerDetails"
Write-Host "Calling: $exchangeUrl" -ForegroundColor White

$exchangeBody = @{
    SessionToken = $apiSession
} | ConvertTo-Json

try {
    $exchangeResponse = Invoke-RestMethod -Uri $exchangeUrl -Method POST -Body $exchangeBody -ContentType "application/json" -ErrorAction Stop
    $exchangeResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "resp-body-exchange.json" -Encoding UTF8
    
    Write-Host "✅ Exchange successful" -ForegroundColor Green
    Write-Host "Response saved to resp-body-exchange.json" -ForegroundColor White
    
    # Extract session token
    $sessionToken = $null
    if ($exchangeResponse.session_token) {
        $sessionToken = $exchangeResponse.session_token
    } elseif ($exchangeResponse.data.session_token) {
        $sessionToken = $exchangeResponse.data.session_token
    } elseif ($exchangeResponse.SessionToken) {
        $sessionToken = $exchangeResponse.SessionToken
    }
    
    if ($sessionToken) {
        Write-Host "✅ Extracted SESSION_TOKEN: $($sessionToken.Substring(0, [Math]::Min(20, $sessionToken.Length)))..." -ForegroundColor Green
    } else {
        Write-Error "❌ No session token found in exchange response"
        Write-Host "Response body:" -ForegroundColor Yellow
        $exchangeResponse | ConvertTo-Json -Depth 10
        exit 1
    }
} catch {
    Write-Error "❌ Exchange failed: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Test quotes endpoint with SessionToken header
Write-Host "3️⃣  Testing Quotes Endpoint (SessionToken header)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
$quotesUrl = "$breezeBase/quotes?exchange_code=NSE&stock_code=NIFTY"
Write-Host "Calling: $quotesUrl" -ForegroundColor White

try {
    $quotesHeaders = @{
        "Content-Type" = "application/json"
        "SessionToken" = $sessionToken
    }
    
    $quotesResponse = Invoke-RestMethod -Uri $quotesUrl -Method GET -Headers $quotesHeaders -ErrorAction Stop
    $quotesResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "resp-body-quotes.json" -Encoding UTF8
    
    Write-Host "✅ Quotes request successful" -ForegroundColor Green
    Write-Host "Response saved to resp-body-quotes.json" -ForegroundColor White
    Write-Host "Response preview: $($quotesResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
} catch {
    Write-Error "❌ Quotes request failed: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Test quotes endpoint with Authorization header
Write-Host "4️⃣  Testing Quotes Endpoint (Authorization header)" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "Calling: $quotesUrl" -ForegroundColor White

try {
    $quotesAuthHeaders = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $sessionToken"
    }
    
    $quotesAuthResponse = Invoke-RestMethod -Uri $quotesUrl -Method GET -Headers $quotesAuthHeaders -ErrorAction Stop
    $quotesAuthResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "resp-body-quotes-auth.json" -Encoding UTF8
    
    Write-Host "✅ Quotes (Auth) request successful" -ForegroundColor Green
    Write-Host "Response saved to resp-body-quotes-auth.json" -ForegroundColor White
    Write-Host "Response preview: $($quotesAuthResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
} catch {
    Write-Error "❌ Quotes (Auth) request failed: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Test market data endpoint
Write-Host "5️⃣  Testing Market Data Endpoint" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
$marketDataUrl = "$breezeBase/marketdata?exchange_code=NSE&product=cash&stock_code=NIFTY&interval=1minute"
Write-Host "Calling: $marketDataUrl" -ForegroundColor White

try {
    $marketDataHeaders = @{
        "Content-Type" = "application/json"
        "SessionToken" = $sessionToken
    }
    
    $marketDataResponse = Invoke-RestMethod -Uri $marketDataUrl -Method GET -Headers $marketDataHeaders -ErrorAction Stop
    $marketDataResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "resp-body-market.json" -Encoding UTF8
    
    Write-Host "✅ Market data request successful" -ForegroundColor Green
    Write-Host "Response saved to resp-body-market.json" -ForegroundColor White
    Write-Host "Response preview: $($marketDataResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
} catch {
    Write-Error "❌ Market data request failed: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Test option chain endpoint
Write-Host "6️⃣  Testing Option Chain Endpoint" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
$optionChainUrl = "$breezeBase/optionchain?exchange_code=NSE&product=options&expiry_date=2024-12-26&right=&strike_price=&interval=1minute"
Write-Host "Calling: $optionChainUrl" -ForegroundColor White

try {
    $optionChainHeaders = @{
        "Content-Type" = "application/json"
        "SessionToken" = $sessionToken
    }
    
    $optionChainResponse = Invoke-RestMethod -Uri $optionChainUrl -Method GET -Headers $optionChainHeaders -ErrorAction Stop
    $optionChainResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "resp-body-optionchain.json" -Encoding UTF8
    
    Write-Host "✅ Option chain request successful" -ForegroundColor Green
    Write-Host "Response saved to resp-body-optionchain.json" -ForegroundColor White
    Write-Host "Response preview: $($optionChainResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
} catch {
    Write-Error "❌ Option chain request failed: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Test with different symbols
Write-Host "7️⃣  Testing with Different Symbols" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow
$symbols = @("BANKNIFTY", "RELIANCE", "TCS")

foreach ($symbol in $symbols) {
    Write-Host "Testing symbol: $symbol" -ForegroundColor White
    $symbolUrl = "$breezeBase/quotes?exchange_code=NSE&stock_code=$symbol"
    
    try {
        $symbolHeaders = @{
            "Content-Type" = "application/json"
            "SessionToken" = $sessionToken
        }
        
        $symbolResponse = Invoke-RestMethod -Uri $symbolUrl -Method GET -Headers $symbolHeaders -ErrorAction Stop
        $symbolResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "resp-body-$($symbol.ToLower()).json" -Encoding UTF8
        
        Write-Host "  ✅ $symbol: Success" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ $symbol`: Failed - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Summary
Write-Host "8️⃣  Diagnostic Summary" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow
Write-Host "Files generated in diagnostics\output\:" -ForegroundColor White
Write-Host "  📄 Response files: resp-*.json" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔍 Key Findings:" -ForegroundColor Cyan
Write-Host "  Session Token: $($sessionToken.Substring(0, [Math]::Min(20, $sessionToken.Length)))..." -ForegroundColor White
Write-Host "  Base URL: $breezeBase" -ForegroundColor White
Write-Host "  API Key: $($appKey.Substring(0, [Math]::Min(10, $appKey.Length)))..." -ForegroundColor White
Write-Host ""

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review the response files for actual data" -ForegroundColor White
Write-Host "  2. Compare with your Java application behavior" -ForegroundColor White
Write-Host "  3. If issues persist, attach these files to support request" -ForegroundColor White
Write-Host ""

Write-Host "✅ Diagnostic complete! Check diagnostics\output\ for detailed results." -ForegroundColor Green
