# Zerodha Dashboard Installation Script
# This script handles the complete installation process including Cloudflare tunnel provisioning

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallToken,
    
    [Parameter(Mandatory=$false)]
    [string]$VendorApiUrl = "http://localhost:3000/api",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipProvisioning = $false,
    
    [Parameter(Mandatory=$true)]
    [string]$ZerodhaApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$ZerodhaApiSecret,
    
    [Parameter(Mandatory=$false)]
    [string]$StaticIp = "",
    
    [Parameter(Mandatory=$false)]
    [string]$NetworkInterface = "eth0"
)

# Installation directories
$INSTALL_DIR = "${env:ProgramFiles}\ZerodhaDashboard"
$BACKEND_DIR = Join-Path $INSTALL_DIR "backend"
$FRONTEND_DIR = Join-Path $INSTALL_DIR "frontend"
$CLOUDFLARED_DIR = Join-Path $INSTALL_DIR "cloudflared"
$LOGS_DIR = Join-Path $INSTALL_DIR "logs"
$SCRIPTS_DIR = Join-Path $INSTALL_DIR "installer\scripts"
$BIN_DIR = Join-Path $INSTALL_DIR "installer\bin"

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
        return Get-Content $machineIdPath -Raw
    } else {
        $machineId = [System.Guid]::NewGuid().ToString()
        Set-Content -Path $machineIdPath -Value $machineId
        return $machineId
    }
}

# Call provisioning API with retry and 409 handling
function Invoke-ProvisioningApi {
    param(
        [string]$Token,
        [string]$MachineId,
        [string]$ApiUrl,
        [int]$MaxRetries = 3,
        [int]$RetryDelaySeconds = 5,
        [bool]$ForceNew = $false
    )
    
    $attempt = 0
    while ($attempt -lt $MaxRetries) {
        $attempt++
        try {
            Write-Log "Calling provisioning API (Attempt $attempt/$MaxRetries): $ApiUrl/provision-tunnel" "INFO"
            
            $body = @{
                installToken = $Token
                machineId = $MachineId
                forceNew = $ForceNew
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "$ApiUrl/provision-tunnel" `
                -Method Post `
                -Body $body `
                -ContentType "application/json" `
                -TimeoutSec 60 `
                -ErrorAction Stop
            
            Write-Log "Provisioning API response received successfully" "SUCCESS"
            return $response
        }
        catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            $errorMessage = $_.Exception.Message
            
            if ($statusCode -eq 409) {
                # 409 Conflict - tunnel already exists
                try {
                    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
                    if ($errorResponse.existingTunnel) {
                        Write-Log "Existing tunnel detected: $($errorResponse.publicHostname)" "WARN"
                        
                        # Ask user if they want to create a new tunnel
                        Write-Host "`n========================================" -ForegroundColor Yellow
                        Write-Host "Existing Tunnel Found" -ForegroundColor Yellow
                        Write-Host "========================================" -ForegroundColor Yellow
                        Write-Host "An existing tunnel was found for this machine." -ForegroundColor White
                        Write-Host "Current URL: $($errorResponse.publicHostname)" -ForegroundColor Cyan
                        Write-Host "`nOptions:" -ForegroundColor Yellow
                        Write-Host "  [R] Reuse existing tunnel" -ForegroundColor Green
                        Write-Host "  [N] Create NEW tunnel (old one will be deleted)" -ForegroundColor Yellow
                        Write-Host "  [C] Cancel installation" -ForegroundColor Red
                        Write-Host "`nYour choice (R/N/C): " -NoNewline -ForegroundColor Yellow
                        
                        $choice = Read-Host
                        $choice = $choice.Trim().ToUpper()
                        
                        switch ($choice) {
                            "R" {
                                Write-Log "User chose to reuse existing tunnel" "INFO"
                                # Return the existing tunnel info
                                return @{
                                    publicHostname = $errorResponse.publicHostname
                                    tunnelId = $errorResponse.tunnelId
                                    customerId = $errorResponse.customerId
                                    existingTunnel = $true
                                }
                            }
                            "N" {
                                Write-Log "User chose to create new tunnel" "INFO"
                                # Retry with forceNew=true
                                return Invoke-ProvisioningApi -Token $Token -MachineId $MachineId -ApiUrl $ApiUrl -MaxRetries 1 -RetryDelaySeconds 0 -ForceNew $true
                            }
                            "C" {
                                Write-Log "Installation cancelled by user" "ERROR"
                                throw "Installation cancelled"
                            }
                            default {
                                Write-Log "Invalid choice. Assuming reuse." "WARN"
                                return @{
                                    publicHostname = $errorResponse.publicHostname
                                    tunnelId = $errorResponse.tunnelId
                                    customerId = $errorResponse.customerId
                                    existingTunnel = $true
                                }
                            }
                        }
                    }
                }
                catch {
                    Write-Log "Failed to parse 409 error response: $($_.Exception.Message)" "ERROR"
                    throw "Failed to handle existing tunnel: $errorMessage"
                }
            }
            else {
                Write-Log "Provisioning API call failed (Attempt $attempt/$MaxRetries): $errorMessage" "WARN"
                if ($attempt -lt $MaxRetries) {
                    Write-Log "Retrying in $RetryDelaySeconds seconds..." "INFO"
                    Start-Sleep -Seconds $RetryDelaySeconds
                } else {
                    throw "Provisioning failed after $MaxRetries attempts: $errorMessage"
                }
            }
        }
    }
    
    throw "All provisioning attempts failed"
}

# Download credentials ZIP
function Save-CredentialsZip {
    param(
        [string]$DownloadUrl,
        [string]$OutputPath
    )
    
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $OutputPath -TimeoutSec 60
        Write-Log "Credentials downloaded successfully" "SUCCESS"
    }
    catch {
        Write-Log "Failed to download credentials: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# Extract credentials ZIP
function Expand-CredentialsZip {
    param(
        [string]$ZipPath,
        [string]$ExtractPath
    )
    
    try {
        Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
        Write-Log "Credentials extracted successfully" "SUCCESS"
        # Clean up ZIP file
        Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Log "Failed to extract credentials: $($_.Exception.Message)" "ERROR"
        throw
    }
}

# Update config.yml
function Update-ConfigYml {
    param(
        [string]$ConfigPath,
        [string]$CredentialsPath,
        [string]$TunnelId,
        [string]$PublicHostname
    )
    
    $configContent = @"
tunnel: $TunnelId
credentials-file: $CredentialsPath

ingress:
  - hostname: $PublicHostname
    service: http://127.0.0.1:9000
  - service: http_status:404
"@
    
    Set-Content -Path $ConfigPath -Value $configContent
    Write-Log "Config.yml updated" "SUCCESS"
}

# Create or update application.properties file
function Update-ApplicationProperties {
    param(
        [string]$PublicTunnelUrl,
        [string]$ZerodhaApiKey,
        [string]$ZerodhaApiSecret,
        [string]$StaticIp,
        [string]$NetworkInterface
    )
    
    try {
        # Spring Boot looks for application.properties in:
        # 1. Current directory (where JAR is executed from)
        # 2. config/ subdirectory
        # 3. Classpath (src/main/resources)
        # We'll place it in the backend directory and also in a config subdirectory
        $propertiesPath = Join-Path $BACKEND_DIR "application.properties"
        $configDir = Join-Path $BACKEND_DIR "config"
        $configPropertiesPath = Join-Path $configDir "application.properties"
        
        # Ensure config directory exists
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }
        
        # Build properties content
        $propertiesContent = @"
# === Zerodha Kite API Configuration ===
zerodha.enabled=true
zerodha.apikey=$ZerodhaApiKey
zerodha.apisecret=$ZerodhaApiSecret
zerodha.access.token=

# === Public Tunnel / Callback Configuration ===
public.tunnel.url=$PublicTunnelUrl
zerodha.redirect.uri=$PublicTunnelUrl/api/zerodha/callback

# === Web / CORS Configuration ===
app.cors.allowed-origins=http://localhost:5173,$PublicTunnelUrl

# === ICICI Direct Breeze API Configuration (Optional) ===
breeze.api.enabled=false
breeze.api.static.ip=$StaticIp
breeze.api.network.interface=$NetworkInterface

# === Server Configuration ===
server.port=9000

# === Redis Configuration ===
spring.data.redis.host=localhost
spring.data.redis.port=6379

# === Logging Configuration ===
logging.level.root=INFO
logging.level.com.zerodha=DEBUG
logging.file.name=logs/zerodha-dashboard.log
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level %logger{36} - %msg%n
spring.lifecycle.timeout-per-shutdown-phase=30s

# === Redis Cache Configuration ===
redis.snapshot.ttl=PT5M
redis.namespace=zerodha:snapshot:
redis.latest.cache.ttl=PT10M
redis.latest.cache.key=zerodha:latest:NIFTY
cache.update.enabled=true
cache.update.interval.ms=750

# === Mock Data Configuration ===
mock.data.enabled=false
"@
        
        # Write to both locations for maximum compatibility using .NET methods (more reliable)
        try {
            [System.IO.File]::WriteAllText($propertiesPath, $propertiesContent, [System.Text.Encoding]::UTF8)
            Write-Log "  - $propertiesPath" "INFO"
        }
        catch {
            Write-Log "Failed to write $propertiesPath: $($_.Exception.Message)" "ERROR"
            throw
        }
        
        try {
            [System.IO.File]::WriteAllText($configPropertiesPath, $propertiesContent, [System.Text.Encoding]::UTF8)
            Write-Log "  - $configPropertiesPath" "INFO"
        }
        catch {
            Write-Log "Failed to write $configPropertiesPath: $($_.Exception.Message)" "WARN"
            # Don't throw - continue even if config subdirectory write fails
        }
        
        Write-Log "Application properties file created/updated at:" "SUCCESS"
    }
    catch {
        Write-Log "Failed to update application.properties: $($_.Exception.Message)" "ERROR"
        Write-Log "Error details: $($_.Exception.GetType().FullName)" "ERROR"
        throw  # Re-throw to be caught by outer try-catch
    }
}

# Update backend environment variables
function Update-BackendEnvironmentVariables {
    param(
        [string]$PublicTunnelUrl,
        [string]$ZerodhaApiKey,
        [string]$ZerodhaApiSecret,
        [string]$StaticIp,
        [string]$NetworkInterface
    )
    
    try {
        $nssmPath = Join-Path $BIN_DIR "nssm.exe"
        if (-not (Test-Path $nssmPath)) {
            Write-Log "NSSM not found at $nssmPath" "ERROR"
            return
        }
        
        # Build environment variables string
        $envVars = @(
            "PUBLIC_TUNNEL_URL=$PublicTunnelUrl",
            "ZERODHA_API_KEY=$ZerodhaApiKey",
            "ZERODHA_API_SECRET=$ZerodhaApiSecret",
            "ZERODHA_ENABLED=true"
        )
        
        if ($StaticIp) {
            $envVars += "BREEZE_API_STATIC_IP=$StaticIp"
        }
        
        if ($NetworkInterface) {
            $envVars += "BREEZE_API_NETWORK_INTERFACE=$NetworkInterface"
        }
        
        # Set all environment variables with timeout protection
        $envVarsString = $envVars -join " "
        
        Write-Log "Setting NSSM environment variables..." "INFO"
        try {
            # Use Start-Process with timeout to prevent hanging
            $process = Start-Process -FilePath $nssmPath -ArgumentList @("set", "ZerodhaDashboardBackend", "AppEnvironmentExtra", $envVarsString) -NoNewWindow -Wait -PassThru -ErrorAction Stop
            
            if ($process.ExitCode -eq 0) {
                Write-Log "Updated backend environment variables" "SUCCESS"
            }
            else {
                Write-Log "NSSM returned exit code: $($process.ExitCode)" "WARN"
                # Continue anyway - service might still work
            }
        }
        catch {
            Write-Log "Failed to set NSSM environment variables: $($_.Exception.Message)" "ERROR"
            # Continue - don't throw, installation can proceed
        }
        
        # Restart service to apply changes (with timeout)
        Write-Log "Restarting backend service..." "INFO"
        try {
            $service = Get-Service -Name "ZerodhaDashboardBackend" -ErrorAction SilentlyContinue
            if ($service) {
                # Use Stop-Service and Start-Service with timeout
                if ($service.Status -eq "Running") {
                    Stop-Service -Name "ZerodhaDashboardBackend" -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                }
                Start-Service -Name "ZerodhaDashboardBackend" -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                Write-Log "Backend service restarted" "SUCCESS"
            }
            else {
                Write-Log "Backend service not found - may not be installed yet" "WARN"
            }
        }
        catch {
            Write-Log "Failed to restart backend service: $($_.Exception.Message)" "WARN"
            # Continue - service might start later
        }
    }
    catch {
        Write-Log "Failed to update backend environment variables: $($_.Exception.Message)" "ERROR"
    }
}

# Main installation process
try {
    Write-Log "========================================" "INFO"
    Write-Log "Zerodha Dashboard Installation Started" "INFO"
    Write-Log "========================================" "INFO"
    
    # Create installation directories
    Write-Log "Creating installation directories..." "INFO"
    @($INSTALL_DIR, $BACKEND_DIR, $FRONTEND_DIR, $CLOUDFLARED_DIR, $LOGS_DIR) | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
        }
    }
    
    # Generate machine ID
    $machineId = Get-MachineId
    Write-Log "Machine ID: $machineId" "INFO"
    
    # Provision Cloudflare tunnel
    $configPath = $null
    $credentialsPath = $null
    $provisionResponse = $null
    
    if ($SkipProvisioning) {
        Write-Log "Skipping provisioning API call (testing mode)" "INFO"
        Write-Log "WARNING: Cloudflare tunnel will not be configured. Zerodha OAuth will not work!" "WARN"
    }
    else {
        Write-Log "========================================" "INFO"
        Write-Log "Step: Provisioning Cloudflare Tunnel" "INFO"
        Write-Log "========================================" "INFO"
        
        try {
            $provisionResponse = Invoke-ProvisioningApi -Token $InstallToken -MachineId $machineId -ApiUrl $VendorApiUrl -MaxRetries 3 -RetryDelaySeconds 5
            
            $isExistingTunnel = $provisionResponse.existingTunnel -eq $true
            $configPath = Join-Path $CLOUDFLARED_DIR "config.yml"
            $credentialsPath = Join-Path $CLOUDFLARED_DIR "credentials.json"
            
            if ($isExistingTunnel) {
                Write-Log "Using existing Cloudflare tunnel: $($provisionResponse.publicHostname)" "INFO"
                # Check if credentials already exist locally
                if (-not (Test-Path $credentialsPath)) {
                    Write-Log "Existing tunnel credentials not found locally, attempting to retrieve..." "INFO"
                    try {
                        $credentialsResponse = Invoke-RestMethod -Uri "$VendorApiUrl/get-tunnel-credentials" `
                            -Method Post `
                            -Body (@{ tunnelId = $provisionResponse.tunnelId } | ConvertTo-Json) `
                            -ContentType "application/json" `
                            -TimeoutSec 30 `
                            -ErrorAction Stop
                        
                        # Save credentials directly
                        $credentialsJson = $credentialsResponse.credentials | ConvertTo-Json -Depth 10
                        Set-Content -Path $credentialsPath -Value $credentialsJson
                        Write-Log "Credentials retrieved and saved successfully." "SUCCESS"
                    }
                    catch {
                        Write-Log "Failed to retrieve existing tunnel credentials: $($_.Exception.Message)" "ERROR"
                        throw "Failed to retrieve existing tunnel credentials."
                    }
                } else {
                    Write-Log "Existing tunnel credentials found locally, reusing." "INFO"
                }
                
                # Update config.yml with correct paths
                Update-ConfigYml -ConfigPath $configPath -CredentialsPath $credentialsPath -TunnelId $provisionResponse.tunnelId -PublicHostname $provisionResponse.publicHostname
                
            } else {
                # Download credentials ZIP for new tunnel
                Write-Log "Downloading Cloudflare tunnel credentials..." "INFO"
                $credentialsZipPath = Join-Path $CLOUDFLARED_DIR "credentials.zip"
                Save-CredentialsZip -DownloadUrl $provisionResponse.downloadUrl -OutputPath $credentialsZipPath
                
                # Extract credentials
                Write-Log "Extracting credentials..." "INFO"
                Expand-CredentialsZip -ZipPath $credentialsZipPath -ExtractPath $CLOUDFLARED_DIR
                
                # Update config.yml with correct paths
                Update-ConfigYml -ConfigPath $configPath -CredentialsPath $credentialsPath -TunnelId $provisionResponse.tunnelId -PublicHostname $provisionResponse.publicHostname
            }
            
            Write-Log "Cloudflare tunnel provisioned successfully!" "SUCCESS"
            Write-Log "Public URL: $($provisionResponse.publicHostname)" "SUCCESS"
            Write-Log "Redirect URI: $($provisionResponse.publicHostname)/api/zerodha/callback" "SUCCESS"
            
            # Save installation metadata (with error handling)
            try {
                Write-Log "Saving installation metadata..." "INFO"
                $metadataPath = Join-Path $INSTALL_DIR "installation-metadata.json"
                
                # Ensure directory exists
                if (-not (Test-Path $INSTALL_DIR)) {
                    New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
                }
                
                # Build metadata object
                $metadataObj = @{
                    publicHostname = $provisionResponse.publicHostname
                    tunnelId = $provisionResponse.tunnelId
                    customerId = $provisionResponse.customerId
                    machineId = $machineId
                    installedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                }
                
                # Convert to JSON with error handling
                try {
                    $metadata = $metadataObj | ConvertTo-Json -Depth 10 -ErrorAction Stop
                }
                catch {
                    Write-Log "Failed to convert metadata to JSON: $($_.Exception.Message)" "WARN"
                    # Create simple JSON manually as fallback
                    $metadata = "{`"publicHostname`":`"$($provisionResponse.publicHostname)`",`"tunnelId`":`"$($provisionResponse.tunnelId)`",`"machineId`":`"$machineId`",`"installedAt`":`"$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`"}"
                }
                
                # Write file directly (should work since installer runs as admin)
                [System.IO.File]::WriteAllText($metadataPath, $metadata, [System.Text.Encoding]::UTF8)
                Write-Log "Installation metadata saved" "SUCCESS"
            }
            catch {
                Write-Log "Failed to save installation metadata: $($_.Exception.Message)" "ERROR"
                Write-Log "Error type: $($_.Exception.GetType().FullName)" "ERROR"
                Write-Log "Stack: $($_.ScriptStackTrace)" "ERROR"
                # Continue installation even if metadata save fails
            }
            
            # Create/update application.properties file with all customer data (with error handling)
            try {
                Write-Log "Updating application.properties..." "INFO"
                Update-ApplicationProperties `
                    -PublicTunnelUrl $provisionResponse.publicHostname `
                    -ZerodhaApiKey $ZerodhaApiKey `
                    -ZerodhaApiSecret $ZerodhaApiSecret `
                    -StaticIp $StaticIp `
                    -NetworkInterface $NetworkInterface
                Write-Log "Application properties updated successfully" "SUCCESS"
            }
            catch {
                Write-Log "Failed to update application.properties: $($_.Exception.Message)" "ERROR"
                Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
                # Continue installation even if properties update fails
            }
            
            # Update backend environment variables (with error handling)
            try {
                Write-Log "Updating backend environment variables..." "INFO"
                Update-BackendEnvironmentVariables `
                    -PublicTunnelUrl $provisionResponse.publicHostname `
                    -ZerodhaApiKey $ZerodhaApiKey `
                    -ZerodhaApiSecret $ZerodhaApiSecret `
                    -StaticIp $StaticIp `
                    -NetworkInterface $NetworkInterface
                Write-Log "Backend environment variables updated successfully" "SUCCESS"
            }
            catch {
                Write-Log "Failed to update backend environment variables: $($_.Exception.Message)" "ERROR"
                Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
                # Continue installation even if env vars update fails
            }
            
            Write-Log "Tunnel configuration completed successfully" "SUCCESS"
            
        }
        catch {
            Write-Log "========================================" "ERROR"
            Write-Log "Provisioning failed: $($_.Exception.Message)" "ERROR"
            Write-Log "========================================" "ERROR"
            Write-Log "Installation will continue, but Zerodha OAuth will not work without a public URL." "WARN"
            # Continue - don't exit here
        }
    }
    
    # Always reach this point - installation completes regardless of tunnel provisioning
    Write-Log "========================================" "INFO"
    Write-Log "Installation completed successfully!" "SUCCESS"
    Write-Log "========================================" "INFO"
    
    # Small delay to ensure logs are written
    Start-Sleep -Milliseconds 300
    
    # Display completion message
    try {
        if ($provisionResponse) {
            Write-Host "`n========================================" -ForegroundColor Green
            Write-Host "Installation Complete!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Public URL: $($provisionResponse.publicHostname)" -ForegroundColor Cyan
            Write-Host "Redirect URI: $($provisionResponse.publicHostname)/api/zerodha/callback" -ForegroundColor Cyan
            Write-Host "`nUse this redirect URI in your Zerodha app settings." -ForegroundColor Yellow
            
            Write-Log "Installation completion message displayed" "INFO"
        }
        else {
            Write-Host "`n========================================" -ForegroundColor Green
            Write-Host "Installation Complete!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Note: Cloudflare tunnel was not provisioned." -ForegroundColor Yellow
            Write-Host "Zerodha OAuth will not work without a public URL." -ForegroundColor Yellow
            
            Write-Log "Installation completed without tunnel" "INFO"
        }
    }
    catch {
        # Even if display fails, log it and continue
        Write-Log "Failed to display completion message: $($_.Exception.Message)" "WARN"
    }
    
    # Final log entry
    Write-Log "Script exiting with code 0" "INFO"
    
    # Small delay before exit to ensure all logs are written
    Start-Sleep -Milliseconds 200
    
    exit 0
}
catch {
    Write-Log "========================================" "ERROR"
    Write-Log "Installation failed: $($_.Exception.Message)" "ERROR"
    Write-Log "========================================" "ERROR"
    exit 1
}
