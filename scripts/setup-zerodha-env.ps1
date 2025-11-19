# Setup Zerodha Environment Variables for Diagnostics
# Run this script to set up the required environment variables

param(
    [string]$ApiKey,
    [string]$AccessToken,
    [string]$ApiSecret,
    [string]$RedirectUrl = "https://eternal-into-provided-dynamic.trycloudflare.com/api/zerodha/callback",
    [string]$InstrumentsUrl = "https://api.kite.trade/instruments/NFO"
)

Write-Host "=== Setting Up Zerodha Environment Variables ===" -ForegroundColor Cyan
Write-Host ""

if (-not $ApiKey) {
    $ApiKey = Read-Host "Enter KITE_API_KEY"
}

if (-not $AccessToken) {
    $AccessToken = Read-Host "Enter KITE_ACCESS_TOKEN"
}

if (-not $ApiSecret) {
    $ApiSecret = Read-Host "Enter KITE_API_SECRET (optional, press Enter to skip)" -AsSecureString
    if ($ApiSecret) {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($ApiSecret)
        $ApiSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    }
}

# Set environment variables for current session
$env:KITE_API_KEY = $ApiKey
$env:KITE_ACCESS_TOKEN = $AccessToken
if ($ApiSecret) {
    $env:KITE_API_SECRET = $ApiSecret
}
$env:KITE_REDIRECT_URL = $RedirectUrl
$env:KITE_CALLBACK_HEALTH_URL = $RedirectUrl
$env:INSTRUMENTS_CSV_URL = $InstrumentsUrl
$env:DIAGNOSTIC_OUTPUT_PATH = ".\diagnostics"

Write-Host ""
Write-Host "Environment variables set for current session:" -ForegroundColor Green
Write-Host "  KITE_API_KEY: $($ApiKey.Substring(0, [Math]::Min(4, $ApiKey.Length)))****" -ForegroundColor Gray
Write-Host "  KITE_ACCESS_TOKEN: $($AccessToken.Substring(0, [Math]::Min(4, $AccessToken.Length)))****" -ForegroundColor Gray
Write-Host "  KITE_CALLBACK_HEALTH_URL: $RedirectUrl" -ForegroundColor Gray
Write-Host "  INSTRUMENTS_CSV_URL: $InstrumentsUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "To make these permanent, run:" -ForegroundColor Yellow
Write-Host "  [Environment]::SetEnvironmentVariable('KITE_API_KEY', '$ApiKey', 'User')" -ForegroundColor Gray
Write-Host "  [Environment]::SetEnvironmentVariable('KITE_ACCESS_TOKEN', '$AccessToken', 'User')" -ForegroundColor Gray
Write-Host ""
Write-Host "Now run the diagnostic script:" -ForegroundColor Cyan
Write-Host "  .\scripts\zerodha-diagnostics.ps1" -ForegroundColor White

