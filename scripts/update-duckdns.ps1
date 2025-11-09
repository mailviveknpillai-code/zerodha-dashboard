# DuckDNS Updater Script for Windows
# This script updates your DuckDNS domain with your current public IP

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$true)]
    [string]$Domain
)

# DuckDNS update URL
$updateUrl = "https://www.duckdns.org/update?domains=$Domain&token=$Token&ip="

try {
    Write-Host "Updating DuckDNS for domain: $Domain.duckdns.org" -ForegroundColor Cyan
    
    # Send update request
    $response = Invoke-RestMethod -Uri $updateUrl -Method Get
    
    if ($response -eq "OK") {
        Write-Host "✅ DuckDNS updated successfully!" -ForegroundColor Green
        Write-Host "Domain: $Domain.duckdns.org" -ForegroundColor White
    } else {
        Write-Host "❌ DuckDNS update failed: $response" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error updating DuckDNS: $($_.Exception.Message)" -ForegroundColor Red
”
}


