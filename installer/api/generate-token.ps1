# Generate Installation Token
# Usage: .\generate-token.ps1 -CustomerId "CUSTOMER_ID"

param(
    [Parameter(Mandatory=$true)]
    [string]$CustomerId,
    
    [Parameter(Mandatory=$false)]
    [int]$ExpiresIn = 86400,  # 24 hours in seconds
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "http://localhost:3000/api"
)

Write-Host "`n=== Generating Installation Token ===" -ForegroundColor Cyan
Write-Host "Customer ID: $CustomerId" -ForegroundColor White
Write-Host "Expires In: $ExpiresIn seconds ($([math]::Round($ExpiresIn/3600, 1)) hours)" -ForegroundColor White
Write-Host "API URL: $ApiUrl" -ForegroundColor White
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

if (-not $adminApiKey) {
    Write-Host "[WARN] ADMIN_API_KEY not found in .env file" -ForegroundColor Yellow
    Write-Host "The API will generate a key on first start. Check the API logs." -ForegroundColor Yellow
    Write-Host "Or set ADMIN_API_KEY in .env file manually." -ForegroundColor Yellow
    Write-Host ""
}

try {
    $body = @{
        customerId = $CustomerId
        expiresIn = $ExpiresIn
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    # Add admin API key to headers if available
    if ($adminApiKey) {
        $headers["x-admin-api-key"] = $adminApiKey
    }
    
    $response = Invoke-RestMethod -Uri "$ApiUrl/generate-token" `
        -Method Post `
        -Body $body `
        -Headers $headers `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "`n[SUCCESS] Token Generated Successfully!" -ForegroundColor Green
    Write-Host "`nToken: $($response.token)" -ForegroundColor Yellow
    Write-Host "Customer ID: $($response.customerId)" -ForegroundColor White
    Write-Host "Expires At: $($response.expiresAt)" -ForegroundColor White
    Write-Host "`nCopy this token and use it during installation." -ForegroundColor Cyan
    
    # Copy to clipboard if available
    try {
        $response.token | Set-Clipboard
        Write-Host "[OK] Token copied to clipboard!" -ForegroundColor Green
    } catch {
        # Clipboard not available, ignore
    }
    
} catch {
    Write-Host "`n[ERROR] Failed to generate token!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host "`n[ERROR] Authentication failed!" -ForegroundColor Red
            Write-Host "Make sure ADMIN_API_KEY is set in .env file." -ForegroundColor Yellow
            Write-Host "If the API just started, check the console output for the generated ADMIN_API_KEY." -ForegroundColor Yellow
        } elseif ($statusCode -eq 503 -or $statusCode -eq 0) {
            Write-Host "`n[WARN] The provisioning API might not be running." -ForegroundColor Yellow
            Write-Host "Start it with: .\start-api.ps1" -ForegroundColor White
        }
    }
    
    exit 1
}

