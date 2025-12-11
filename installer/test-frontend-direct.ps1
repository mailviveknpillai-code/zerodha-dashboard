# Direct test of frontend.exe with error capture
$installPath = "C:\Program Files\ZerodhaDashboard"
$frontendExe = Join-Path $installPath "installer\bin\frontend.exe"

if (-not (Test-Path $frontendExe)) {
    Write-Host "ERROR: frontend.exe not found at: $frontendExe" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Testing frontend.exe ===" -ForegroundColor Cyan
Write-Host "Executable: $frontendExe" -ForegroundColor White

# Create log file
$logFile = Join-Path $env:TEMP "frontend-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

Write-Host "`nStarting frontend.exe..." -ForegroundColor Yellow
Write-Host "Log file: $logFile" -ForegroundColor Gray

# Try to run with Electron's debug flags
$process = Start-Process -FilePath $frontendExe `
    -ArgumentList "--enable-logging", "--log-level=0" `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $logFile `
    -ErrorAction SilentlyContinue

if ($process) {
    Write-Host "Process started (PID: $($process.Id))" -ForegroundColor Green
    
    # Wait a few seconds
    Start-Sleep -Seconds 5
    
    if (-not $process.HasExited) {
        Write-Host "Process is still running" -ForegroundColor Green
        Write-Host "Stopping process..." -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Process exited with code: $($process.ExitCode)" -ForegroundColor $(if ($process.ExitCode -eq 0) { "Green" } else { "Red" })
    }
    
    # Show log output
    if (Test-Path $logFile) {
        $logContent = Get-Content $logFile -ErrorAction SilentlyContinue
        if ($logContent) {
            Write-Host "`n=== Log Output ===" -ForegroundColor Cyan
            $logContent | ForEach-Object { Write-Host $_ -ForegroundColor White }
        } else {
            Write-Host "`nNo log output captured" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Failed to start process" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan





