# Create New Permanent Tunnel
# Usage: .\create-new-tunnel.ps1 -InstallToken "TOKEN" -CustomerId "CUSTOMER_ID"

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallToken,
    
    [Parameter(Mandatory=$false)]
    [string]$CustomerId = "customer-001",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "http://localhost:3000/api"
)

Write-Host "`n=== Creating New Permanent Tunnel ===" -ForegroundColor Cyan
Write-Host "Install Token: $($InstallToken.Substring(0, [Math]::Min(20, $InstallToken.Length)))..." -ForegroundColor White
Write-Host "Customer ID: $CustomerId" -ForegroundColor White
Write-Host "API URL: $ApiUrl" -ForegroundColor White
Write-Host ""

# Generate machine ID
$machineId = [System.Guid]::NewGuid().ToString()
Write-Host "Machine ID: $machineId" -ForegroundColor Gray
Write-Host ""

# Read admin API key from .env file
$envPath = Join-Path $PSScriptRoot ".env"
$adminApiKey = $null

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "^ADMIN_API_KEY=(.+)$") {
            $adminApiKey = $matches[1].Trim()
            break
        }
    }
}

try {
    Write-Host "[1/2] Deleting existing tunnel (if any)..." -ForegroundColor Yellow
    
    $body = @{
        installToken = $InstallToken
        machineId = $machineId
        forceNew = $true  # Force creation of new tunnel
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($adminApiKey) {
        $headers["x-admin-api-key"] = $adminApiKey
    }
    
    Write-Host "[2/2] Creating new tunnel..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$ApiUrl/provision-tunnel" `
        -Method Post `
        -Body $body `
        -Headers $headers `
        -TimeoutSec 60 `
        -ErrorAction Stop
    
    Write-Host "`n[SUCCESS] New tunnel created successfully!" -ForegroundColor Green
    Write-Host "`n=== New Tunnel Details ===" -ForegroundColor Cyan
    Write-Host "Public URL: $($response.publicHostname)" -ForegroundColor Yellow
    Write-Host "Tunnel ID: $($response.tunnelId)" -ForegroundColor White
    Write-Host "Customer ID: $($response.customerId)" -ForegroundColor White
    Write-Host "Redirect URI: $($response.publicHostname)/api/zerodha/callback" -ForegroundColor Yellow
    Write-Host "`nCredentials download URL: $($response.downloadUrl)" -ForegroundColor Gray
    Write-Host "`n[IMPORTANT] Save this information:" -ForegroundColor Red
    Write-Host "  Public URL: $($response.publicHostname)" -ForegroundColor White
    Write-Host "  Redirect URI: $($response.publicHostname)/api/zerodha/callback" -ForegroundColor White
    
    # Copy to clipboard if available
    try {
        $response.publicHostname | Set-Clipboard
        Write-Host "`n[OK] Public URL copied to clipboard!" -ForegroundColor Green
    } catch {
        # Clipboard not available, ignore
    }
    
} catch {
    Write-Host "`n[ERROR] Failed to create new tunnel!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error Details: $($errorResponse.message)" -ForegroundColor Yellow
            if ($errorResponse.details) {
                Write-Host "Details: $($errorResponse.details | ConvertTo-Json -Compress)" -ForegroundColor Gray
            }
        } catch {
            # Could not parse error response
        }
        
        if ($statusCode -eq 401) {
            Write-Host "`n[ERROR] Authentication failed!" -ForegroundColor Red
            Write-Host "Make sure ADMIN_API_KEY is set in .env file." -ForegroundColor Yellow
        } elseif ($statusCode -eq 503 -or $statusCode -eq 0) {
            Write-Host "`n[WARN] The provisioning API might not be running." -ForegroundColor Yellow
            Write-Host "Start it with: .\start-api.ps1" -ForegroundColor White
        }
    }
    
    exit 1
}







