Write-Host "=== Port 8080 Diagnostic Test ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check if backend is listening on port 8080
Write-Host "1. Checking if port 8080 is listening..." -ForegroundColor Yellow
$listenCheck = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($listenCheck) {
    Write-Host "   ✓ Port 8080 is listening" -ForegroundColor Green
    $listenCheck | Format-Table LocalAddress, LocalPort, State, OwningProcess
} else {
    Write-Host "   ✗ Port 8080 is NOT listening!" -ForegroundColor Red
    Write-Host "   Action: Restart Docker containers" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Checking backend container status..." -ForegroundColor Yellow
docker compose ps backend

Write-Host ""
Write-Host "3. Checking firewall rules for port 8080..." -ForegroundColor Yellow
netsh advfirewall firewall show rule name=all | Select-String "8080" -Context 2,2

Write-Host ""
Write-Host "4. Testing local access..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/breeze/status" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✓ Local access working" -ForegroundColor Green
    Write-Host "   Response: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Local access failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Checking Docker port mapping..." -ForegroundColor Yellow
docker ps --filter "name=zerodha-backend" --format "table {{.Names}}\t{{.Ports}}"

Write-Host ""
Write-Hinished -ExecutionPolicy Bypass -Command "Completed diagnosis. Review output above."





