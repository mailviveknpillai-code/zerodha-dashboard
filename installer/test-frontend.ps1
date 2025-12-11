# Comprehensive Frontend Test Script
# Tests all components and verifies fixes

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Frontend.exe Comprehensive Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$errors = @()
$warnings = @()
$success = @()

# Test 1: Check required files
Write-Host "[1/8] Checking required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "installer\bin\frontend.exe",
    "installer\bin\resources\app.asar",
    "installer\bin\icudtl.dat",
    "installer\bin\v8_context_snapshot.bin"
)
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
        $success += "File exists: $file"
    } else {
        Write-Host "  ❌ $file (MISSING)" -ForegroundColor Red
        $errors += "Missing file: $file"
    }
}

# Test 2: Verify app.asar contents
Write-Host "`n[2/8] Verifying app.asar..." -ForegroundColor Yellow
$tempExtract = "test-asar-extract"
if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force }
New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null
try {
    $extractJob = Start-Job -ScriptBlock { npx --yes asar extract $using:tempExtract\..\..\bin\resources\app.asar $using:tempExtract 2>&1 | Out-Null }
    $extractJob | Wait-Job -Timeout 3 | Out-Null
    if ($extractJob.State -eq "Running") {
        Write-Host "  ⚠️  Extraction taking too long, continuing..." -ForegroundColor Yellow
        Stop-Job $extractJob -ErrorAction SilentlyContinue
        Remove-Job $extractJob -ErrorAction SilentlyContinue
    } else {
        Receive-Job $extractJob | Out-Null
        Remove-Job $extractJob -ErrorAction SilentlyContinue
    }
    $hasMain = Test-Path "$tempExtract\main.js"
    $hasPreload = Test-Path "$tempExtract\preload.js"
    
    if ($hasMain) {
        Write-Host "  ✅ main.js present" -ForegroundColor Green
        $success += "main.js exists in app.asar"
        
        # Check for duplicate path
        $content = Get-Content "$tempExtract\main.js" -Raw
        $pathCount = ([regex]::Matches($content, "const path = require\('path'\)")).Count
        if ($pathCount -eq 1) {
            Write-Host "  ✅ Only 1 'const path' declaration (FIXED!)" -ForegroundColor Green
            $success += "JavaScript 'path' error fixed"
        } else {
            Write-Host "  ❌ Found $pathCount 'const path' declarations" -ForegroundColor Red
            $errors += "JavaScript 'path' error NOT fixed - found $pathCount declarations"
        }
    } else {
        Write-Host "  ❌ main.js MISSING" -ForegroundColor Red
        $errors += "main.js missing from app.asar"
    }
    
    if ($hasPreload) {
        Write-Host "  ✅ preload.js present" -ForegroundColor Green
        $success += "preload.js exists in app.asar"
    } else {
        Write-Host "  ❌ preload.js MISSING" -ForegroundColor Red
        $errors += "preload.js missing from app.asar"
    }
} catch {
    Write-Host "  ❌ Failed to extract app.asar: $_" -ForegroundColor Red
    $errors += "Failed to extract app.asar"
}

# Test 3: Check backend
Write-Host "`n[3/8] Checking backend..." -ForegroundColor Yellow
$backendPort = Get-NetTCPConnection -LocalPort 9000 -ErrorAction SilentlyContinue
if ($backendPort) {
    Write-Host "  ✅ Backend running on port 9000 (PID: $($backendPort.OwningProcess))" -ForegroundColor Green
    $success += "Backend is running"
} else {
    Write-Host "  ⚠️  Backend NOT running on port 9000" -ForegroundColor Yellow
    $warnings += "Backend not running - frontend may not work"
}

# Test 4: Check Electron DLLs
Write-Host "`n[4/8] Checking Electron DLLs..." -ForegroundColor Yellow
$dlls = @("ffmpeg.dll", "d3dcompiler_47.dll", "libEGL.dll", "libGLESv2.dll", "vk_swiftshader.dll")
foreach ($dll in $dlls) {
    $dllPath = "installer\bin\$dll"
    if (Test-Path $dllPath) {
        Write-Host "  ✅ $dll" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $dll (optional)" -ForegroundColor Yellow
        $warnings += "Optional DLL missing: $dll"
    }
}

# Test 5: Syntax check main.js
Write-Host "`n[5/8] Checking main.js syntax..." -ForegroundColor Yellow
if (Test-Path "$tempExtract\main.js") {
    $mainContent = Get-Content "$tempExtract\main.js" -Raw
    $syntaxIssues = @()
    
    # Check for common issues
    if ($mainContent -match "const\s+(\w+)\s*=.*const\s+\1\s*=") {
        $syntaxIssues += "Duplicate variable declarations"
    }
    if ($mainContent -notmatch "app\.whenReady") {
        $syntaxIssues += "Missing app.whenReady()"
    }
    if ($mainContent -notmatch "createWindow") {
        $syntaxIssues += "Missing createWindow function"
    }
    
    if ($syntaxIssues.Count -eq 0) {
        Write-Host "  ✅ No obvious syntax issues" -ForegroundColor Green
        $success += "main.js syntax looks good"
    } else {
        Write-Host "  ⚠️  Potential issues:" -ForegroundColor Yellow
        $syntaxIssues | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
        $warnings += "Potential syntax issues in main.js"
    }
}

# Test 6: Test frontend.exe execution
Write-Host "`n[6/8] Testing frontend.exe execution..." -ForegroundColor Yellow
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "installer\bin\frontend.exe"
$processInfo.WorkingDirectory = "installer\bin"
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardError = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.CreateNoWindow = $false

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo

try {
    $process.Start() | Out-Null
    $process.WaitForExit(3000) | Out-Null  # 3 second timeout
    
    if ($process.HasExited) {
        Write-Host "  ⚠️  Process exited with code: $($process.ExitCode)" -ForegroundColor Yellow
        $warnings += "Frontend.exe exits with code $($process.ExitCode)"
        
        $stderr = $process.StandardError.ReadToEnd()
        $stdout = $process.StandardOutput.ReadToEnd()
        
        if ($stderr) {
            Write-Host "  Error output:" -ForegroundColor Red
            Write-Host $stderr -ForegroundColor Yellow
            $warnings += "Error output: $($stderr.Substring(0, [Math]::Min(100, $stderr.Length)))"
        }
        if ($stdout) {
            Write-Host "  Standard output:" -ForegroundColor Cyan
            Write-Host $stdout -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✅ Process is running!" -ForegroundColor Green
        $success += "Frontend.exe started successfully"
        $process.Kill()
    }
} catch {
    Write-Host "  ❌ Failed to start: $_" -ForegroundColor Red
    $errors += "Failed to start frontend.exe: $_"
}

# Test 7: Check for error dialogs (manual check)
Write-Host "`n[7/8] Manual check needed..." -ForegroundColor Yellow
Write-Host "  Please run: .\installer\bin\frontend.exe" -ForegroundColor White
Write-Host "  Check if:" -ForegroundColor White
Write-Host "    - 'path' error dialog appears (should NOT)" -ForegroundColor $(if ($pathCount -eq 1) { "Green" } else { "Red" })
Write-Host "    - Dashboard window opens (should YES)" -ForegroundColor White
Write-Host "    - Any other error appears" -ForegroundColor White

# Test 8: Summary
Write-Host "`n[8/8] Test Summary" -ForegroundColor Yellow
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESULTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($success.Count -gt 0) {
    Write-Host "✅ SUCCESS ($($success.Count) items):" -ForegroundColor Green
    $success | ForEach-Object { Write-Host "  • $_" -ForegroundColor White }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️  WARNINGS ($($warnings.Count) items):" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  • $_" -ForegroundColor White }
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ ERRORS ($($errors.Count) items):" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  • $_" -ForegroundColor White }
    Write-Host "`n❌ TESTS FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ ALL CRITICAL TESTS PASSED" -ForegroundColor Green
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Some warnings - app may still work" -ForegroundColor Yellow
    } else {
        Write-Host "✅ No warnings - everything looks good!" -ForegroundColor Green
    }
}

# Cleanup
if (Test-Path $tempExtract) {
    Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`n========================================" -ForegroundColor Cyan

