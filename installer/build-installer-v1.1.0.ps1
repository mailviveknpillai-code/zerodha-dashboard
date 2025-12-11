# ============================================================================
# Build Installer for Version 1.1.0
# ============================================================================
# This script builds the Zerodha Dashboard installer for version 1.1.0
# It preserves the existing 1.0.0 installer
# ============================================================================

param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Building Zerodha Dashboard Installer v1.1.0" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Find Inno Setup compiler
$innoSetupPaths = @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
)

$iscc = $null
foreach ($path in $innoSetupPaths) {
    if (Test-Path $path) {
        $iscc = $path
        break
    }
}

if (-not $iscc) {
    Write-Host "ERROR: Inno Setup compiler (ISCC.exe) not found!" -ForegroundColor Red
    Write-Host "Please install Inno Setup 6 from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host "`nSearched locations:" -ForegroundColor Yellow
    foreach ($path in $innoSetupPaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    exit 1
}

Write-Host "Found Inno Setup: $iscc" -ForegroundColor Green

# Check for existing 1.0.0 installer and preserve it
$oldInstaller = Get-ChildItem -Path "installer\dist" -Filter "ZerodhaDashboard-Setup-1.0.0.exe" -ErrorAction SilentlyContinue
if ($oldInstaller) {
    Write-Host "`nFound existing installer v1.0.0: $($oldInstaller.FullName)" -ForegroundColor Yellow
    Write-Host "Size: $([math]::Round($oldInstaller.Length/1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "This will be preserved." -ForegroundColor Green
}

# Create dist directory if it doesn't exist
$distDir = "installer\dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    Write-Host "Created directory: $distDir" -ForegroundColor Green
}

# Verify required files exist
Write-Host "`nChecking required files..." -ForegroundColor Cyan
$requiredFiles = @(
    "installer\bin\dashboard-backend.exe",
    "installer\bin\frontend.exe",
    "installer\bin\cloudflared.exe",
    "installer\bin\nssm.exe",
    "installer\bin\Redis.msi"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length / 1MB
        Write-Host "  [OK] $file ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`nERROR: Missing required files for installer!" -ForegroundColor Red
    Write-Host "Please build the backend and frontend executables first." -ForegroundColor Yellow
    exit 1
}

# Check installer script
if (-not (Test-Path "installer\installer.iss")) {
    Write-Host "ERROR: installer.iss not found!" -ForegroundColor Red
    exit 1
}

# Verify version in installer.iss
$issContent = Get-Content "installer\installer.iss" -Raw
if ($issContent -notmatch 'MyAppVersion\s+"1\.1\.0"') {
    Write-Host "WARNING: installer.iss version may not be 1.1.0" -ForegroundColor Yellow
    Write-Host "Expected: #define MyAppVersion `"1.1.0`"" -ForegroundColor Gray
}

# Build the installer
Write-Host "`nBuilding installer..." -ForegroundColor Cyan
Write-Host "Output will be: installer\dist\ZerodhaDashboard-Setup-1.1.0.exe`n" -ForegroundColor Gray

$issPath = Resolve-Path "installer\installer.iss"
$buildArgs = "`"$issPath`""

try {
    $process = Start-Process -FilePath $iscc -ArgumentList $buildArgs -Wait -NoNewWindow -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "Build Successful!" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
        
        $newInstaller = Get-ChildItem -Path $distDir -Filter "ZerodhaDashboard-Setup-1.1.0.exe" -ErrorAction SilentlyContinue
        if ($newInstaller) {
            $size = [math]::Round($newInstaller.Length / 1MB, 2)
            Write-Host "Installer created: $($newInstaller.FullName)" -ForegroundColor Green
            Write-Host "Size: $size MB" -ForegroundColor Gray
            Write-Host "Version: 1.1.0" -ForegroundColor Cyan
            
            if ($oldInstaller) {
                Write-Host "`nOld installer (v1.0.0) preserved at:" -ForegroundColor Yellow
                Write-Host "  $($oldInstaller.FullName)" -ForegroundColor Gray
            }
        } else {
            Write-Host "WARNING: Installer file not found after build!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`nERROR: Build failed with exit code $($process.ExitCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`nERROR: Failed to build installer" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "`nDone!`n" -ForegroundColor Green







