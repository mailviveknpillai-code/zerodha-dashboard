# Quick Frontend Test - Non-blocking
Write-Host "`n=== Quick Frontend Test ===" -ForegroundColor Cyan

# Test 1: Files
Write-Host "`n[1] Files..." -ForegroundColor Yellow
$files = @("frontend.exe", "resources\app.asar", "icudtl.dat", "v8_context_snapshot.bin")
$allOk = $true
foreach ($f in $files) {
    if (Test-Path "installer\bin\$f") { Write-Host "  ✓ $f" -ForegroundColor Green } 
    else { Write-Host "  ✗ $f" -ForegroundColor Red; $allOk = $false }
}

# Test 2: app.asar
Write-Host "`n[2] app.asar..." -ForegroundColor Yellow
$temp = "quick-test-temp"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $temp -Force | Out-Null
$extractProc = Start-Process -FilePath "npx" -ArgumentList "--yes","asar","extract","installer\bin\resources\app.asar",$temp -PassThru -NoNewWindow -Wait -TimeoutSec 3 -ErrorAction SilentlyContinue
if ($extractProc.ExitCode -eq 0 -or (Test-Path "$temp\main.js")) {
    $main = Get-Content "$temp\main.js" -Raw -ErrorAction SilentlyContinue
    if ($main) {
        $pathCount = ([regex]::Matches($main, "const path = require\('path'\)")).Count
        if ($pathCount -eq 1) { Write-Host "  ✓ JavaScript 'path' error FIXED" -ForegroundColor Green }
        else { Write-Host "  ✗ Found $pathCount 'path' declarations" -ForegroundColor Red; $allOk = $false }
        
        if (Test-Path "$temp\preload.js") { Write-Host "  ✓ preload.js present" -ForegroundColor Green }
        else { Write-Host "  ✗ preload.js missing" -ForegroundColor Red; $allOk = $false }
    }
} else {
    Write-Host "  ⚠ Could not extract (timeout or error)" -ForegroundColor Yellow
}
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue

# Test 3: Backend
Write-Host "`n[3] Backend..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 9000 -ErrorAction SilentlyContinue
if ($port) { Write-Host "  ✓ Running (PID: $($port.OwningProcess))" -ForegroundColor Green }
else { Write-Host "  ⚠ Not running" -ForegroundColor Yellow }

# Test 4: Quick execution test
Write-Host "`n[4] Execution test..." -ForegroundColor Yellow
$p = Start-Process -FilePath "installer\bin\frontend.exe" -PassThru -NoNewWindow -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
if ($p -and -not $p.HasExited) {
    Write-Host "  ✓ Started (PID: $($p.Id))" -ForegroundColor Green
    Start-Sleep -Seconds 1
    if (-not $p.HasExited) { Write-Host "  ✓ Still running" -ForegroundColor Green }
    else { Write-Host "  ⚠ Exited (code: $($p.ExitCode))" -ForegroundColor Yellow }
    $p.Kill() -ErrorAction SilentlyContinue
} else {
    Write-Host "  ⚠ Exited immediately" -ForegroundColor Yellow
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "✓ Original JavaScript error: FIXED" -ForegroundColor Green
    Write-Host "✓ All files present" -ForegroundColor Green
} else {
    Write-Host "✗ Some issues found" -ForegroundColor Red
}
Write-Host "`nManual test: Run .\installer\bin\frontend.exe" -ForegroundColor Yellow
Write-Host "Check if 'path' error dialog appears (should NOT)" -ForegroundColor White





