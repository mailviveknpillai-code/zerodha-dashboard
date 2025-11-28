# Create client-ready deployment package
$ErrorActionPreference = "Stop"

Write-Host "`n=== Creating Client Deployment Package ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$clientDir = Join-Path $scriptDir "client-package"

# Create client package directory
if (Test-Path $clientDir) {
    Write-Host "Cleaning existing client package..." -ForegroundColor Yellow
    Remove-Item $clientDir -Recurse -Force
}
New-Item -ItemType Directory -Path $clientDir -Force | Out-Null

# Copy essential files
$filesToCopy = @(
    @{Source = "dist\ZerodhaDashboard.exe"; Dest = "ZerodhaDashboard.exe"; Required = $true},
    @{Source = "lib\dashboard-app-*.jar"; Dest = ""; Required = $true},
    @{Source = "cloudflared.exe"; Dest = "cloudflared.exe"; Required = $false},
    @{Source = "configure-client.ps1"; Dest = "configure-client.ps1"; Required = $true}
)

foreach ($file in $filesToCopy) {
    if ($file.Source -like "*\*") {
        # Wildcard pattern
        $sourceFiles = Get-ChildItem (Join-Path $scriptDir $file.Source) -ErrorAction SilentlyContinue
        if ($sourceFiles) {
            foreach ($sourceFile in $sourceFiles) {
                $destName = if ($file.Dest) { $file.Dest } else { $sourceFile.Name }
                $destPath = Join-Path $clientDir $destName
                Copy-Item $sourceFile.FullName $destPath -Force
                Write-Host "Copied: $destName" -ForegroundColor Green
            }
        } elseif ($file.Required) {
            Write-Host "Required file not found: $($file.Source)" -ForegroundColor Red
        }
    } else {
        $sourcePath = Join-Path $scriptDir $file.Source
        if (Test-Path $sourcePath) {
            $destName = if ($file.Dest) { $file.Dest } else { Split-Path $file.Source -Leaf }
            $destPath = Join-Path $clientDir $destName
            Copy-Item $sourcePath $destPath -Force
            Write-Host "Copied: $destName" -ForegroundColor Green
        } elseif ($file.Required) {
            Write-Host "Required file not found: $($file.Source)" -ForegroundColor Red
        }
    }
}

# Check for cloudflared in common locations
$cloudflaredFound = $false
$cloudflaredPaths = @(
    "C:\vivek\New folder\cloudflared.exe",
    (Join-Path $scriptDir "cloudflared.exe"),
    (Join-Path (Split-Path $scriptDir -Parent) "cloudflared.exe")
)

foreach ($path in $cloudflaredPaths) {
    if (Test-Path $path) {
        Copy-Item $path (Join-Path $clientDir "cloudflared.exe") -Force
        Write-Host "Copied: cloudflared.exe" -ForegroundColor Green
        $cloudflaredFound = $true
        break
    }
}

if (-not $cloudflaredFound) {
    Write-Host "cloudflared.exe not found. Client will need to add it." -ForegroundColor Yellow
}

# Create client README
$readme = @"
ZERODHA DASHBOARD - CLIENT INSTALLATION GUIDE
=============================================

QUICK START:
1. Ensure Java 21 is installed (verify with: java -version)
2. Ensure Redis is running (port 6379)
3. Double-click ZerodhaDashboard.exe
4. Wait for browser to open automatically

FILES INCLUDED:
- ZerodhaDashboard.exe - Main application launcher
- dashboard-app-*.jar - Backend application
- cloudflared.exe - Network tunnel tool
- configure-client.ps1 - Configuration tool (if needed)

REQUIREMENTS:
- Java 21 (download from: https://adoptium.net/)
- Redis running (or use Docker: docker run -d -p 6379:6379 redis:7-alpine)
- Windows 10/11 (64-bit)
- Internet connection

CONFIGURATION:
If you need to update API credentials or network settings:
1. Stop the application (click Exit button)
2. Run: .\configure-client.ps1
3. Enter your credentials
4. Restart the application

TROUBLESHOOTING:
- Backend errors: Check backend.log file
- Tunnel issues: Ensure cloudflared.exe is in same folder
- Java errors: Verify Java 21 is installed and in PATH
- Redis errors: Ensure Redis is running on port 6379

SUPPORT:
For technical issues, check backend.log and contact support.
"@

Set-Content -Path (Join-Path $clientDir "INSTALLATION.txt") -Value $readme
Write-Host "Created: INSTALLATION.txt" -ForegroundColor Green

# Create ZIP package
Write-Host "`nCreating ZIP package..." -ForegroundColor Yellow
$zipPath = Join-Path $scriptDir "ZerodhaDashboard-Client-Package.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($clientDir, $zipPath)

Write-Host "`n=== Client Package Ready ===" -ForegroundColor Green
Write-Host "`nPackage Location:" -ForegroundColor Cyan
Write-Host "   Folder: $clientDir" -ForegroundColor White
Write-Host "   ZIP: $zipPath" -ForegroundColor White

Write-Host "`nFiles in Package:" -ForegroundColor Yellow
Get-ChildItem $clientDir | ForEach-Object {
    $size = if ($_.Length -gt 1MB) {
        "$([math]::Round($_.Length / 1MB, 2)) MB"
    } else {
        "$([math]::Round($_.Length / 1KB, 2)) KB"
    }
    Write-Host "   - $($_.Name) ($size)" -ForegroundColor Gray
}

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "`nZIP Size: $zipSize MB" -ForegroundColor Cyan

Write-Host "`nReady to share with client!" -ForegroundColor Green


