# Update installed app.asar with fixed version
# This script requires administrator privileges

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`n⚠ This script requires administrator privileges!" -ForegroundColor Yellow
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host "`nOr run this command:" -ForegroundColor Cyan
    Write-Host "   Start-Process powershell -Verb RunAs -ArgumentList '-ExecutionPolicy Bypass -File `"$PSCommandPath`"'" -ForegroundColor White
    exit 1
}

$installPath = "C:\Program Files\ZerodhaDashboard"
$fixedAsar = Join-Path $PSScriptRoot "bin\resources\app.asar"
$installedAsar = Join-Path $installPath "installer\bin\resources\app.asar"

Write-Host "`n=== Updating Installed app.asar ===" -ForegroundColor Cyan

# Check if fixed asar exists
if (-not (Test-Path $fixedAsar)) {
    Write-Host "ERROR: Fixed app.asar not found at: $fixedAsar" -ForegroundColor Red
    Write-Host "Please run rebuild-app-asar.ps1 first!" -ForegroundColor Yellow
    exit 1
}

# Check if installed location exists
if (-not (Test-Path $installedAsar)) {
    Write-Host "ERROR: Installed app.asar not found at: $installedAsar" -ForegroundColor Red
    Write-Host "The application may not be installed yet." -ForegroundColor Yellow
    exit 1
}

try {
    # Backup existing
    $backup = "$installedAsar.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $installedAsar $backup -Force
    Write-Host "✅ Backed up existing app.asar" -ForegroundColor Green
    Write-Host "   Backup: $backup" -ForegroundColor Gray
    
    # Copy fixed version
    Copy-Item $fixedAsar $installedAsar -Force
    Write-Host "✅ Updated installed app.asar with fixed version" -ForegroundColor Green
    
    $fixedSize = (Get-Item $fixedAsar).Length / 1KB
    Write-Host "   Size: $([math]::Round($fixedSize, 2)) KB" -ForegroundColor Gray
    
    Write-Host "`n✅ Update complete! You can now test frontend.exe" -ForegroundColor Green
    Write-Host "   Location: $installPath\installer\bin\frontend.exe" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ Error updating app.asar: $_" -ForegroundColor Red
    exit 1
}





