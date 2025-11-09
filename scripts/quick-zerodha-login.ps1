# Quick Zerodha OAuth Login Helper
# This script helps you quickly start a new Zerodha API session

Write-Host "=== Zerodha OAuth Login Helper ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend is running..." -ForegroundColor Yellow
try {
    $status = Invoke-WebRequest -Uri "http://localhost:9000/api/zerodha/status" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Backend is running" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Backend is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the backend first:" -ForegroundColor Yellow
    Write-Host "  docker-compose up -d backend" -ForegroundColor White
    Write-Host "  OR" -ForegroundColor White
    Write-Host "  cd backend/dashboard; mvn spring-boot:run" -ForegroundColor White
    exit 1
}

Write-Host ""

# Step 1: Get OAuth URL
Write-Host "Step 1: Getting OAuth URL..." -ForegroundColor Yellow
try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:9000/api/zerodha/auth-url" -ErrorAction Stop
    $authUrl = $authResponse.auth_url
    $redirectUri = $authResponse.redirect_uri
    
    Write-Host "[OK] OAuth URL obtained" -ForegroundColor Green
    Write-Host ""
    Write-Host "OAuth Login URL:" -ForegroundColor Cyan
    Write-Host "  $authUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "Redirect URI:" -ForegroundColor Cyan
    Write-Host "  $redirectUri" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "[FAIL] Failed to get OAuth URL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  - Backend is running on http://localhost:9000" -ForegroundColor White
    Write-Host "  - Zerodha API key is configured in application.properties" -ForegroundColor White
    exit 1
}

# Step 2: Instructions
Write-Host "=== INSTRUCTIONS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 2: Complete Zerodha Login" -ForegroundColor Yellow
Write-Host "  1. The OAuth URL will open in your browser" -ForegroundColor White
Write-Host "  2. Login to Zerodha with your credentials" -ForegroundColor White
Write-Host "  3. Authorize the application" -ForegroundColor White
Write-Host "  4. You'll be redirected to the callback URL" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Red
Write-Host "  - Complete login IMMEDIATELY (request tokens expire in 30-60 seconds)" -ForegroundColor Yellow
Write-Host "  - Do NOT wait between getting the URL and logging in" -ForegroundColor Yellow
Write-Host ""
Write-Host "Step 3: After Login" -ForegroundColor Yellow
Write-Host "  - The callback will return an access_token" -ForegroundColor White
Write-Host "  - Copy the access_token from the response" -ForegroundColor White
Write-Host "  - Update application.properties or docker-compose.yml" -ForegroundColor White
Write-Host "  - Restart backend" -ForegroundColor White
Write-Host ""

# Ask if user wants to open browser
$openBrowser = Read-Host "Open browser now? (Y/N)"
if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
    Write-Host ""
    Write-Host "Opening browser..." -ForegroundColor Green
    Start-Process $authUrl
    Write-Host ""
    Write-Host "Browser opened. Complete the login and check the callback URL for the access_token." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Copy this URL and open it in your browser:" -ForegroundColor Yellow
    Write-Host $authUrl -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== After Login ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Once you have the access_token, update it:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update application.properties:" -ForegroundColor White
Write-Host "   zerodha.access.token=YOUR_NEW_ACCESS_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update docker-compose.yml (if using Docker):" -ForegroundColor White
Write-Host "   ZERODHA_ACCESS_TOKEN: `"YOUR_NEW_ACCESS_TOKEN`"" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Restart backend:" -ForegroundColor White
Write-Host "   docker-compose restart backend" -ForegroundColor Gray
Write-Host "   OR" -ForegroundColor Gray
Write-Host "   Stop and restart Maven process" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verify token works:" -ForegroundColor White
Write-Host "   .\scripts\show-zerodha-api-response.ps1" -ForegroundColor Gray
Write-Host ""

