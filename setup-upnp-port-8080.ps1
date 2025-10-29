# UPnP Port Forwarding Setup for Port 8080
Write-Host "=== UPnP Port 8080 Configuration ===" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "1. Initializing UPnP..." -ForegroundColor Yellow
    $nat = New-Object -ComObject HNetCfg.NATUPnP
    
    Write-Host "2. Getting static port mapping collection..." -ForegroundColor Yellow
    $svc = $nat.StaticPortMappingCollection
    
    if ($null -eq $svc) {
        Write-Host "   ERROR: Router does not expose UPnP port mapping API" -ForegroundColor Red
        Write-Host "   Your router has UPnP enabled but doesn't support programmatic port mapping." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   This means you MUST contact your ISP to configure port forwarding." -ForegroundColor Yellow
        exit
    }
    
    Write-Host "3. Checking for existing rules on port 8080..." -ForegroundColor Yellow
    $existing = $svc | Where-Object { $_.ExternalPort -eq 8080 }
    
    if ($existing) {
        Write-Host "   Found existing rule. Removing it..." -ForegroundColor Yellow
        try {
            $svc.Remove(8080, "TCP")
            Write-Host "   Removed old rule." -ForegroundColor Green
        } catch {
            Write-Host "   Could not remove existing rule: $_" -ForegroundColor Yellow
        }
    }
    
    Write-Host "4. Creating new UPnP port mapping..." -ForegroundColor Yellow
    Write-Host "   External Port: 8080 (TCP)" -ForegroundColor Cyan
    Write-Host "   Internal IP: 192.168.1.6" -ForegroundColor Cyan
    Write-Host "   Internal Port: 8080" -ForegroundColor Cyan
    
    $svc.Add(8080, "TCP", 8080, "192.168.1.6", $true, "Zerodha-Backend-8080")
    
    Write-Host ""
    Write-Host "   SUCCESS! UPnP port mapping created!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "5. Verifying the rule..." -ForegroundColor Yellow
    $rule = $svc | Where-Object { $_.ExternalPort -eq 8080 }
    
    if ($rule) {
        Write-Host ""
        Write-Host "   Port Mapping Details:" -ForegroundColor Cyan
        $rule | Format-List Description, ExternalPort, InternalPort, InternalClient, Protocol, Enabled
        
        Write-Host ""
        Write-Host "6. Testing external access..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        try {
            $response = Invoke-WebRequest -Uri "http://122.167.184.90:8080/api/breeze/status" -TimeoutSec 10 -UseBasicParsing
            Write-Host "   SUCCESS! Port 8080 is now accessible externally!" -ForegroundColor Green
            Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "   External access still blocked (likely ISP blocking port 8080)" -ForegroundColor Red
            Write-Host "   UPnP rule created successfully, but ISP may be blocking the port." -ForegroundColor Yellow
        }
    } else {
        Write-Host "   Could not verify rule creation." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "1. Router's UPnP doesn't support static port mapping API" -ForegroundColor Yellow
    Write-Host "2. Windows UPnP service is not running" -ForegroundColor Yellow
    Write-Host "3. Network connectivity issue" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "RECOMMENDATION: Contact ISP to configure port forwarding on their side." -ForegroundColor Cyan
}

Write-Host ""
Read-Host "Press Enter to exit"



