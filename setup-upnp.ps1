# UPnP Port Forwarding Setup for Zerodha Backend
Write-Host "Setting up UPnP port forwarding..." -ForegroundColor Green

try {
    $nat = New-Object -ComObject HNetCfg.NATUPnP
    $svc = $nat.StaticPortMappingCollection
    
    Write-Host "Checking for existing rule on port 8080..." -ForegroundColor Yellow
    
    # Check if rule already exists
    $existing = $svc | Where-Object { $_.ExternalPort -eq 8080 }
    if ($existing) {
        Write-Host "Existing rule found. Removing it..." -ForegroundColor Yellow
        $svc.Remove(8080, "TCP")
    }
    
    # Add new rule
    Write-Host "Creating port forwarding rule..." -ForegroundColor Yellow
    $svc.Add(8080, "TCP", 8080, "192.168.1.8", $true, "Zerodha-8080")
    
    Write-Host "Port forwarding rule created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying rule:" -ForegroundColor Cyan
    $rule = $svc | Where-Object { $_.Description -eq "Zerodha-8080" }
    $rule | Format-List
    
    Write-Host ""
    Write-Host "You can now access your backend at: http://122.167.184.90:8080" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible solutions:" -ForegroundColor Yellow
    Write-Host "1. Make sure you're running PowerShell as Administrator" -ForegroundColor Yellow
    Write-Host "2. Ensure UPnP is enabled in your router settings" -ForegroundColor Yellow
    Write-Host "3. Try restarting your router" -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
