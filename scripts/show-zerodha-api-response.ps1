# Quick script to show Zerodha API responses
# This script demonstrates the actual API responses we're receiving

param(
    [string]$ApiKey = $env:KITE_API_KEY,
    [string]$AccessToken = $env:KITE_ACCESS_TOKEN,
    [string]$CallbackUrl = $env:KITE_CALLBACK_HEALTH_URL
)

Write-Host "=== Zerodha API Response Viewer ===" -ForegroundColor Cyan
Write-Host ""

if (-not $ApiKey -or -not $AccessToken) {
    Write-Host "ERROR: KITE_API_KEY and KITE_ACCESS_TOKEN must be set" -ForegroundColor Red
    Write-Host "Set them with:" -ForegroundColor Yellow
    Write-Host "  `$env:KITE_API_KEY='your_key'" -ForegroundColor Gray
    Write-Host "  `$env:KITE_ACCESS_TOKEN='your_token'" -ForegroundColor Gray
    exit 1
}

$headers = @{
    "Authorization" = "token ${ApiKey}:${AccessToken}"
    "X-Kite-Version" = "3"
}

# 1. Profile API Response
Write-Host "1. PROFILE API RESPONSE" -ForegroundColor Yellow
Write-Host "URL: https://api.kite.trade/user/profile" -ForegroundColor Gray
try {
    $profile = Invoke-RestMethod -Uri "https://api.kite.trade/user/profile" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "Status: SUCCESS" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    $profile | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Status: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. Instruments CSV Response (first few lines)
Write-Host "2. INSTRUMENTS CSV RESPONSE" -ForegroundColor Yellow
Write-Host "URL: https://api.kite.trade/instruments/NFO" -ForegroundColor Gray
try {
    $csvContent = Invoke-WebRequest -Uri "https://api.kite.trade/instruments/NFO" -Headers $headers -TimeoutSec 30 -UseBasicParsing
    Write-Host "Status: SUCCESS" -ForegroundColor Green
    Write-Host "Response Size: $($csvContent.Content.Length) bytes" -ForegroundColor White
    Write-Host "First 500 characters:" -ForegroundColor White
    $csvContent.Content.Substring(0, [Math]::Min(500, $csvContent.Content.Length)) | Write-Host
    Write-Host "..."
} catch {
    Write-Host "Status: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Spot Price Quote Response (NIFTY Index)
Write-Host "3. SPOT PRICE QUOTE RESPONSE (NIFTY Index)" -ForegroundColor Yellow
Write-Host "URL: https://api.kite.trade/quote?i=NSE:256265" -ForegroundColor Gray
try {
    $spotQuote = Invoke-RestMethod -Uri "https://api.kite.trade/quote?i=NSE:256265" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "Status: SUCCESS" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    $spotQuote | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Status: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# 4. Single Instrument Quote Response (NIFTY Future)
Write-Host "4. SINGLE INSTRUMENT QUOTE RESPONSE (NIFTY Future)" -ForegroundColor Yellow
Write-Host "URL: https://api.kite.trade/quote?i=NFO:9485826" -ForegroundColor Gray
try {
    $futureQuote = Invoke-RestMethod -Uri "https://api.kite.trade/quote?i=NFO:9485826" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "Status: SUCCESS" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    $futureQuote | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Status: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Multi-Instrument Quote Response
Write-Host "5. MULTI-INSTRUMENT QUOTE RESPONSE" -ForegroundColor Yellow
Write-Host "URL: https://api.kite.trade/quote?i=NFO:9485826&i=NFO:9807874" -ForegroundColor Gray
try {
    $multiQuote = Invoke-RestMethod -Uri "https://api.kite.trade/quote?i=NFO:9485826&i=NFO:9807874" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "Status: SUCCESS" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    $multiQuote | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Status: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "All API responses shown above. Check the 'data' field in each response." -ForegroundColor White
Write-Host "Empty 'data: {}' indicates market is closed or token issue." -ForegroundColor Yellow

