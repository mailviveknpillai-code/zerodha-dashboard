# Zerodha Dashboard - Tunnel Provisioning Only (SIMPLIFIED - No token required)
# This script automatically provisions a tunnel without user interaction

param(
    [Parameter(Mandatory=$false)]
    [string]$VendorApiUrl = "http://localhost:3000/api"
)

# Installation directories
$INSTALL_DIR = "${env:ProgramFiles}\ZerodhaDashboard"
$CLOUDFLARED_DIR = Join-Path $INSTALL_DIR "cloudflared"
$LOGS_DIR = Join-Path $INSTALL_DIR "logs"

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logFile = Join-Path $LOGS_DIR "install.log"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Ensure logs directory exists
    if (-not (Test-Path $LOGS_DIR)) {
        New-Item -ItemType Directory -Path $LOGS_DIR -Force | Out-Null
    }
    
    Add-Content -Path $logFile -Value $logMessage -ErrorAction SilentlyContinue
    
    # Also write to console with colors
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage -ForegroundColor White }
    }
}

# Generate machine ID
function Get-MachineId {
    $machineIdPath = Join-Path $INSTALL_DIR "machine-id.txt"
    if (Test-Path $machineIdPath) {
        # Use [System.IO.File]::ReadAllText to get clean string content
        $content = [System.IO.File]::ReadAllText($machineIdPath)
        # Remove any whitespace/newlines
        return $content.Trim()
    }
    $machineId = [System.Guid]::NewGuid().ToString()
    if (-not (Test-Path $INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
    }
    # Use [System.IO.File]::WriteAllText for clean write
    [System.IO.File]::WriteAllText($machineIdPath, $machineId)
    return $machineId
}

# Provision tunnel (simplified version)
try {
    Write-Log "========================================" "INFO"
    Write-Log "Tunnel Provisioning Started" "INFO"
    Write-Log "========================================" "INFO"
    
    $machineId = Get-MachineId
    # Ensure machineId is a clean string (remove any whitespace/newlines)
    $machineId = $machineId.Trim()
    Write-Log "Machine ID: $machineId" "INFO"
    
    # Call provisioning API (SIMPLIFIED - No token, auto-create new tunnel)
    Write-Log "Calling provisioning API..." "INFO"
    $body = @{
        machineId = $machineId
        forceNew = $true  # Always create new tunnel
    } | ConvertTo-Json -Compress
    
    try {
        Write-Log "Request body: $body" "INFO"
        Write-Log "API URL: $VendorApiUrl/provision-tunnel" "INFO"
        
        $response = Invoke-RestMethod -Uri "$VendorApiUrl/provision-tunnel" `
            -Method Post `
            -Body $body `
            -ContentType "application/json" `
            -TimeoutSec 60 `
            -ErrorAction Stop
        
        Write-Log "Provisioning successful!" "SUCCESS"
        Write-Log "Tunnel ID: $($response.tunnelId)" "INFO"
        Write-Log "Public Hostname: $($response.publicHostname)" "INFO"
        
        # Save tunnel info to file for completion script
        # Save to both temp and install dir (temp for during wizard, install dir for after)
        $tempDir = $env:TEMP
        $tempTunnelInfoPath = Join-Path $tempDir "tunnel-info.json"
        $tunnelInfoPath = Join-Path $INSTALL_DIR "tunnel-info.json"
        $tunnelInfo = @{
            publicHostname = $response.publicHostname
            tunnelId = $response.tunnelId
            customerId = $response.customerId
            machineId = $machineId
        } | ConvertTo-Json
        
        # Write to temp directory (accessible during wizard)
        [System.IO.File]::WriteAllText($tempTunnelInfoPath, $tunnelInfo, [System.Text.Encoding]::UTF8)
        # Also write to install directory if it exists
        if (Test-Path $INSTALL_DIR) {
            [System.IO.File]::WriteAllText($tunnelInfoPath, $tunnelInfo, [System.Text.Encoding]::UTF8)
        }
        Write-Log "Tunnel info saved" "SUCCESS"
        
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "Tunnel Provisioning Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Public URL: $($response.publicHostname)" -ForegroundColor Cyan
        Write-Host "`nPlease click 'Continue' in the installer to complete installation." -ForegroundColor Yellow
        Write-Host "`nPress any key to close this window..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    catch {
        $errorDetails = $_.Exception
        Write-Log "Provisioning failed: $($errorDetails.Message)" "ERROR"
        
        # Try to get more details from the response
        if ($errorDetails.Response) {
            $statusCode = $errorDetails.Response.StatusCode.value__
            Write-Log "HTTP Status Code: $statusCode" "ERROR"
            
            try {
                $errorStream = $errorDetails.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd()
                $reader.Close()
                $errorStream.Close()
                
                Write-Log "Error response body: $errorBody" "ERROR"
                
                # Try to parse as JSON
                try {
                    $errorJson = $errorBody | ConvertFrom-Json
                    if ($errorJson.message) {
                        Write-Host "`nError: $($errorJson.message)" -ForegroundColor Red
                    }
                    if ($errorJson.details) {
                        Write-Host "Details: $($errorJson.details | ConvertTo-Json -Compress)" -ForegroundColor Yellow
                    }
                }
                catch {
                    Write-Host "`nError response: $errorBody" -ForegroundColor Red
                }
            }
            catch {
                Write-Log "Could not read error response: $($_.Exception.Message)" "ERROR"
            }
        }
        
        Write-Host "`nPress any key to close..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}
catch {
    Write-Log "Fatal error: $($_.Exception.Message)" "ERROR"
    Write-Host "`nPress any key to close..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

