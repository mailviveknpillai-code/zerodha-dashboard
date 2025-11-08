$publicIP = (Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content
Write-Host "Your Public IP: $publicIP"

if ($publicIP -match '^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.)') {
    Write-Host 'CGNAT Detected: Your ISP is using Carrier-Grade NAT. Port forwarding will NOT work.' -ForegroundColor Red
    Write-Host 'You need to contact your ISP to get a public IP address.' -ForegroundColor Yellow
} elseif ($publicIP -eq '122.167.184.90') {
    Write-Host 'Public IP matches! Port forwarding should work.' -ForegroundColor Green
    Write-Host 'Configure the router port forwarding manually in the web UI.' -ForegroundColor Cyan
} else {
    Write-Host "Public IP differs from 122.167.184.90." -ForegroundColor Yellow
    Write-Host "Current IP: $publicIP" -ForegroundColor Yellow
    Write-Host "Expected IP: 122.167.184.90" -ForegroundColor Yellow
    Write-Host "Your IP may have changed. Update Breeze API if needed." -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"





