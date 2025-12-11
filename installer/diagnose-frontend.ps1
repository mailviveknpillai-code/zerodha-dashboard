# Diagnostic script for frontend.exe
Write-Host "`n=== Frontend.exe Diagnostic ===" -ForegroundColor Cyan

$installPath = "C:\Program Files\ZerodhaDashboard"
$frontendExe = Join-Path $installPath "installer\bin\frontend.exe"
$appAsar = Join-Path $installPath "installer\bin\resources\app.asar"

Write-Host "`n1. Checking if frontend.exe exists..." -ForegroundColor Yellow
if (Test-Path $frontendExe) {
    Write-Host "   ✅ frontend.exe found" -ForegroundColor Green
    $exeInfo = Get-Item $frontendExe
    Write-Host "   Size: $($exeInfo.Length) bytes" -ForegroundColor White
    Write-Host "   Modified: $($exeInfo.LastWriteTime)" -ForegroundColor White
} else {
    Write-Host "   ❌ frontend.exe NOT FOUND at: $frontendExe" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Checking if app.asar exists..." -ForegroundColor Yellow
if (Test-Path $appAsar) {
    Write-Host "   ✅ app.asar found" -ForegroundColor Green
    $asarInfo = Get-Item $appAsar
    Write-Host "   Size: $($asarInfo.Length) bytes" -ForegroundColor White
    
    # Extract and check contents
    Write-Host "`n3. Extracting app.asar to check contents..." -ForegroundColor Yellow
    $tempDir = Join-Path $env:TEMP "frontend-diagnostic-$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    try {
        $extract = Start-Process -FilePath "npx" -ArgumentList "--yes","asar","extract","`"$appAsar`"","`"$tempDir`"" -PassThru -NoNewWindow -Wait -ErrorAction Stop
        
        if (Test-Path "$tempDir\main.js") {
            Write-Host "   ✅ main.js found in app.asar" -ForegroundColor Green
            $mainContent = Get-Content "$tempDir\main.js" -Raw
            $pathCount = ([regex]::Matches($mainContent, "const path = require\('path'\)")).Count
            Write-Host "   'const path' declarations: $pathCount (should be 1)" -ForegroundColor $(if ($pathCount -eq 1) { "Green" } else { "Red" })
        } else {
            Write-Host "   ❌ main.js NOT FOUND in app.asar" -ForegroundColor Red
        }
        
        if (Test-Path "$tempDir\preload.js") {
            Write-Host "   ✅ preload.js found in app.asar" -ForegroundColor Green
        } else {
            Write-Host "   ❌ preload.js NOT FOUND in app.asar" -ForegroundColor Red
        }
        
        Write-Host "`n   Files in app.asar:" -ForegroundColor Yellow
        Get-ChildItem $tempDir -File | ForEach-Object {
            Write-Host "   - $($_.Name)" -ForegroundColor White
        }
        
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "   ⚠ Could not extract app.asar: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ app.asar NOT FOUND at: $appAsar" -ForegroundColor Red
}

Write-Host "`n4. Checking required DLLs..." -ForegroundColor Yellow
$requiredDlls = @(
    "ffmpeg.dll",
    "d3dcompiler_47.dll",
    "libEGL.dll",
    "libGLESv2.dll",
    "vk_swiftshader.dll"
)
$binDir = Join-Path $installPath "installer\bin"
foreach ($dll in $requiredDlls) {
    $dllPath = Join-Path $binDir $dll
    if (Test-Path $dllPath) {
        Write-Host "   ✅ $dll" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ $dll (optional)" -ForegroundColor Yellow
    }
}

Write-Host "`n5. Attempting to run frontend.exe with error capture..." -ForegroundColor Yellow
$logFile = Join-Path $env:TEMP "frontend-error-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$process = Start-Process -FilePath $frontendExe -ArgumentList "--enable-logging" -PassThru -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $logFile -ErrorAction SilentlyContinue

Start-Sleep -Seconds 3

if (-not $process.HasExited) {
    Write-Host "   ✅ frontend.exe is running (PID: $($process.Id))" -ForegroundColor Green
    Write-Host "   Stopping process..." -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "   ❌ frontend.exe exited immediately (Exit Code: $($process.ExitCode))" -ForegroundColor Red
    if (Test-Path $logFile) {
        Write-Host "`n   Error output:" -ForegroundColor Yellow
        Get-Content $logFile -Tail 20 | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
}

Write-Host "`n=== Diagnostic Complete ===" -ForegroundColor Cyan





