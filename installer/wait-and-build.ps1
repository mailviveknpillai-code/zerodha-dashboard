# Wait for Inno Setup installation and build installer
param(
    [int]$MaxWaitMinutes = 10
)

Write-Host "`n=== Waiting for Inno Setup Installation ===" -ForegroundColor Cyan
Write-Host "Please complete the Inno Setup installation if it's still running." -ForegroundColor Yellow
Write-Host "This script will check every 5 seconds for up to $MaxWaitMinutes minutes.`n" -ForegroundColor Gray

$paths = @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
)

$found = $null
$startTime = Get-Date
$maxWait = $startTime.AddMinutes($MaxWaitMinutes)

while ($null -eq $found -and (Get-Date) -lt $maxWait) {
    foreach ($path in $paths) {
        if (Test-Path $path) {
            $found = $path
            break
        }
    }
    
    if ($null -eq $found) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        Write-Host "Waiting... ($([math]::Round($elapsed))s)" -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

if ($null -eq $found) {
    Write-Host "`n❌ Inno Setup not found after waiting." -ForegroundColor Red
    Write-Host "Please ensure Inno Setup 6 is installed, then run:" -ForegroundColor Yellow
    Write-Host "   .\installer\build-installer-v1.1.0.ps1" -ForegroundColor White
    exit 1
}

Write-Host "`n✅ Found Inno Setup at: $found" -ForegroundColor Green

# Build the installer
Write-Host "`n=== Building Installer ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$issPath = Join-Path $scriptDir "installer.iss"

if (-not (Test-Path $issPath)) {
    Write-Host "ERROR: installer.iss not found at: $issPath" -ForegroundColor Red
    exit 1
}

try {
    $process = Start-Process -FilePath $found -ArgumentList "`"$issPath`"" -Wait -NoNewWindow -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Host "`n✅ Installer built successfully!" -ForegroundColor Green
        
        $distDir = Join-Path $scriptDir "dist"
        $installerFile = Get-ChildItem -Path $distDir -Filter "ZerodhaDashboard-Setup-1.1.0.exe" -ErrorAction SilentlyContinue
        
        if ($installerFile) {
            $size = [math]::Round($installerFile.Length / 1MB, 2)
            Write-Host "`nInstaller Details:" -ForegroundColor Cyan
            Write-Host "   File: $($installerFile.FullName)" -ForegroundColor White
            Write-Host "   Size: $size MB" -ForegroundColor White
            Write-Host "   Version: 1.1.0" -ForegroundColor White
        }
    } else {
        Write-Host "`n❌ Build failed with exit code: $($process.ExitCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error building installer: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Done ===" -ForegroundColor Green





