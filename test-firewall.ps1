# Test if Windows Firewall is blocking port 8080
Write-Host "=== Testing Port 8080 Connectivity ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check current firewall state
Write-Host "1. Current Firewall State:" -ForegroundColor Yellow
netsh advfirewall show privateprofile state

Write-Host ""
Write-Host "2. Testing local IP access WITH firewall enabled..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.6:8080/api/breeze/status" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   SUCCESS: Port 8080 is accessible!" -ForegroundColor Green
    Write-Host "   Firewall is NOT blocking. The issue is elsewhere." -ForegroundColor Green
    exit
} catch {
    Write-Host "   BLOCKED: Cannot reach 192.168.1.6:8080" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Temporarily disabling Private profile firewall..." -ForegroundColor Yellow
netsh advfirewall set privateprofile state off

Write-Host ""
Write-Host "4. Testing local IP access WITHOUT firewall..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.6:8080/api/breeze/status" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   SUCCESS: Port 8080 works with firewall OFF!" -ForegroundColor Green
    Write-Host "   Confirmed: Windows Firewall is blocking port 8080" -ForegroundColor Yellow
} catch {
    Write-Host "   STILL BLOCKED: Issue is NOT the firewall" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Re-enabling firewall..." -ForegroundColor Yellow
netsh advfirewall set privateprofile state on

Write-Host ""
Write-Host "6. Recreating firewall rule..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Zerodha8080"
netsh advfirewall firewall add rule name="Zerodha8080" dir=in action=allow protocol=TCP localport=8080 profile=any

Write-Host ""
Write-Host "7. Final test after recreating rule..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.6:8080/api/breeze/status" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   SUCCESS: Port 8080 works after recreating rule!" -ForegroundColor Green
} catch {
    Write-Host "   STILL BLOCKED: Manual firewall configuration needed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Cyan
Read-Host "Press Enter to exit"




