# ============================================================================
# Complete Rebuild Script for Version 1.1.0
# ============================================================================
# This script rebuilds all necessary executables and creates the installer
# ============================================================================

param(
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$SkipInstaller,
    [switch]$SkipLaunch4j
)

$ErrorActionPreference = "Stop"

# Get project root directory (where this script is located, or current directory)
$scriptPath = $MyInvocation.MyCommand.Path
if ($scriptPath) {
    $projectRoot = Split-Path (Split-Path $scriptPath -Parent) -Parent
} else {
    $projectRoot = Get-Location
}
# If we're in installer subdirectory, go up one more level
if ((Split-Path $projectRoot -Leaf) -eq "installer") {
    $projectRoot = Split-Path $projectRoot -Parent
}
$projectRoot = [System.IO.Path]::GetFullPath($projectRoot)

$toolsPath = "C:\vivek\New folder"
$iscc = Join-Path $toolsPath "Inno Setup 6\ISCC.exe"
$launch4j = Join-Path $toolsPath "Launch4j\launch4jc.exe"
$nodePath = Join-Path $toolsPath "node.exe"
$npmPath = Join-Path $toolsPath "npm.cmd"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Complete Rebuild for Version 1.1.0" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verify tools exist
Write-Host "Checking build tools..." -ForegroundColor Yellow
if (-not (Test-Path $iscc)) {
    Write-Host "ERROR: Inno Setup not found at: $iscc" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $launch4j)) {
    Write-Host "ERROR: Launch4j not found at: $launch4j" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $nodePath)) {
    Write-Host "ERROR: Node.js not found at: $nodePath" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] All tools found" -ForegroundColor Green

# Create directories
$binDir = Join-Path $projectRoot "installer\bin"
$distDir = Join-Path $projectRoot "installer\dist"
$binDir = [System.IO.Path]::GetFullPath($binDir)
$distDir = [System.IO.Path]::GetFullPath($distDir)
if (-not (Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir -Force | Out-Null }
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir -Force | Out-Null }

# Step 1: Build Backend JAR
if (-not $SkipBackend) {
    Write-Host "`n[1/4] Building Backend JAR..." -ForegroundColor Cyan
    $backendDir = Join-Path $projectRoot "backend\dashboard"
    Push-Location $backendDir
    try {
        $mvnw = if (Test-Path "..\mvnw.cmd") { "..\mvnw.cmd" } else { "mvn" }
        & $mvnw clean package -DskipTests
        if ($LASTEXITCODE -ne 0) {
            throw "Maven build failed"
        }
        
        $jarFile = Get-ChildItem -Path "target" -Filter "*.jar" | Where-Object { $_.Name -notlike "*-sources.jar" -and $_.Name -notlike "*-javadoc.jar" } | Select-Object -First 1
        if (-not $jarFile) {
            throw "JAR file not found in target directory"
        }
        Write-Host "  [OK] JAR created: $($jarFile.Name)" -ForegroundColor Green
    } finally {
        Pop-Location
    }
    
    # Step 2: Create Backend EXE with Launch4j
    if ($SkipLaunch4j) {
        Write-Host "`n[2/4] Skipping Launch4j build (use -SkipLaunch4j to build manually)" -ForegroundColor Yellow
        Write-Host "  [INFO] Please build dashboard-backend.exe manually using Launch4j GUI" -ForegroundColor Gray
        Write-Host "  [INFO] Launch4j location: $launch4j" -ForegroundColor Gray
        Write-Host "  [INFO] JAR location: $backendDir\target\$($jarFile.Name)" -ForegroundColor Gray
        Write-Host "  [INFO] Output should be: $binDir\dashboard-backend.exe" -ForegroundColor Gray
    } else {
        Write-Host "`n[2/4] Creating Backend EXE with Launch4j..." -ForegroundColor Cyan
    
    $launch4jConfig = Join-Path $projectRoot "installer\launch4j\launch4j-config.xml"
    $launch4jConfig = [System.IO.Path]::GetFullPath($launch4jConfig)
    
    # Check for existing working config in New folder
    $workingConfig = Join-Path $toolsPath "ZerodhaDashboard\installer\launch4j\launch4j-config.xml"
    if (Test-Path $workingConfig) {
        Write-Host "  [INFO] Found working config, copying..." -ForegroundColor Gray
        $configDir = Split-Path $launch4jConfig -Parent
        if (-not (Test-Path $configDir)) { 
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null 
        }
        Copy-Item $workingConfig -Destination $launch4jConfig -Force
        Write-Host "  [OK] Copied working Launch4j config" -ForegroundColor Green
    } elseif (-not (Test-Path $launch4jConfig)) {
        Write-Host "  [WARN] Launch4j config not found, creating minimal config..." -ForegroundColor Yellow
        # Create a minimal config without errTitle to avoid resource compilation issues
        $configContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<launch4jConfig>
  <dontWrapJar>false</dontWrapJar>
  <headerType>gui</headerType>
  <jar>..\..\backend\dashboard\target\$($jarFile.Name)</jar>
  <outfile>..\bin\dashboard-backend.exe</outfile>
  <cmdLine></cmdLine>
  <chdir>.</chdir>
  <priority>normal</priority>
  <downloadUrl>http://java.com/download</downloadUrl>
  <stayAlive>false</stayAlive>
  <restartOnCrash>false</restartOnCrash>
  <jre>
    <path></path>
    <bundledJre64Bit>false</bundledJre64Bit>
    <bundledJreAsFallback>false</bundledJreAsFallback>
    <minVersion>21</minVersion>
    <jdkPreference>preferJre</jdkPreference>
    <runtimeBits>64</runtimeBits>
  </jre>
</launch4jConfig>
"@
        $configDir = Split-Path $launch4jConfig -Parent
        if (-not (Test-Path $configDir)) { 
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null 
        }
        Set-Content -Path $launch4jConfig -Value $configContent -ErrorAction Stop
        Write-Host "  [OK] Created minimal Launch4j config at: $launch4jConfig" -ForegroundColor Green
    }
    
    # Update JAR path in config
    $configContent = Get-Content $launch4jConfig -Raw
    $configXml = [xml]$configContent
    $configXml.launch4jConfig.jar = "..\..\backend\dashboard\target\$($jarFile.Name)"
    $configXml.launch4jConfig.outfile = "..\bin\dashboard-backend.exe"
    
    # Remove empty optional nodes if they exist
    $nodesToRemove = @("manifest", "icon", "maxVersion", "errTitle", "supportUrl")
    foreach ($nodeName in $nodesToRemove) {
        $node = $configXml.launch4jConfig.SelectSingleNode("jre/$nodeName")
        if (-not $node) {
            $node = $configXml.launch4jConfig.SelectSingleNode($nodeName)
        }
        if ($node) {
            if ([string]::IsNullOrWhiteSpace($node.InnerText)) {
                $node.ParentNode.RemoveChild($node) | Out-Null
                Write-Host "  [INFO] Removed empty $nodeName tag" -ForegroundColor Gray
            }
        }
    }
    
    $configXml.Save($launch4jConfig)
    
        $launch4jDir = Split-Path $launch4jConfig -Parent
        Push-Location $launch4jDir
        try {
            $configFileName = Split-Path $launch4jConfig -Leaf
            & $launch4j $configFileName
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  [ERROR] Launch4j build failed" -ForegroundColor Red
                Write-Host "  [INFO] You can build manually using Launch4j GUI:" -ForegroundColor Yellow
                Write-Host "    1. Open: $($launch4j -replace 'launch4jc.exe', 'launch4j.exe')" -ForegroundColor Gray
                Write-Host "    2. Load config: $launch4jConfig" -ForegroundColor Gray
                Write-Host "    3. Click 'Build wrapper'" -ForegroundColor Gray
                Write-Host "    4. Then run this script with -SkipLaunch4j flag" -ForegroundColor Gray
                throw "Launch4j build failed - build manually or use -SkipLaunch4j flag"
            }
            Write-Host "  [OK] Backend EXE created" -ForegroundColor Green
        } finally {
            Pop-Location
        }
    }
} else {
    Write-Host "`n[1-2/4] Skipping Backend build" -ForegroundColor Yellow
}

# Step 3: Build Frontend
if (-not $SkipFrontend) {
    Write-Host "`n[3/4] Building Frontend..." -ForegroundColor Cyan
    
    # Build React app
    $frontendDir = Join-Path $projectRoot "frontend\dashboard-ui"
    Push-Location $frontendDir
    try {
        & $npmPath run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed"
        }
        Write-Host "  [OK] React app built" -ForegroundColor Green
    } finally {
        Pop-Location
    }
    
    # Build Electron app or use existing frontend.exe
    $sourceBin = Join-Path $toolsPath "ZerodhaDashboard\installer\bin"
    $existingFrontend = Join-Path $sourceBin "frontend.exe"
    $frontendExeDest = Join-Path $binDir "frontend.exe"
    
    if (Test-Path $existingFrontend) {
        Write-Host "  [INFO] Using existing frontend.exe from source folder" -ForegroundColor Gray
        Copy-Item $existingFrontend -Destination $frontendExeDest -Force
        Write-Host "  [OK] Frontend EXE copied to bin" -ForegroundColor Green
    } else {
        # Try to build Electron app if package.json exists
        $electronDir = Join-Path $projectRoot "installer\electron-launcher"
        $electronPackageJson = Join-Path $electronDir "package.json"
        
        if (Test-Path $electronPackageJson) {
            Push-Location $electronDir
            try {
                & $npmPath run build
                if ($LASTEXITCODE -ne 0) {
                    throw "Electron build failed"
                }
                
                # Copy frontend.exe to bin directory
                $electronExe = Get-ChildItem -Path "dist\win-unpacked" -Filter "*.exe" -Recurse | Select-Object -First 1
                if ($electronExe) {
                    Copy-Item $electronExe.FullName -Destination $frontendExeDest -Force
                    Write-Host "  [OK] Frontend EXE copied to bin" -ForegroundColor Green
                }
            } finally {
                Pop-Location
            }
        } else {
            Write-Host "  [WARN] Electron launcher package.json not found" -ForegroundColor Yellow
            Write-Host "  [WARN] frontend.exe not found in source folder either" -ForegroundColor Yellow
            Write-Host "  [INFO] Skipping Electron build - you may need to provide frontend.exe manually" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "`n[3/4] Skipping Frontend build" -ForegroundColor Yellow
}

# Step 4: Copy supporting files from New folder
Write-Host "`n[4/5] Copying supporting files..." -ForegroundColor Cyan
$sourceBin = Join-Path $toolsPath "ZerodhaDashboard\installer\bin"
if (Test-Path $sourceBin) {
    # Copy frontend.exe if it exists and we're not rebuilding
    if ($SkipFrontend -and (Test-Path (Join-Path $sourceBin "frontend.exe"))) {
        Copy-Item (Join-Path $sourceBin "frontend.exe") -Destination $binDir -Force
        Write-Host "  [OK] Copied frontend.exe from source" -ForegroundColor Green
    }
    
    # Copy supporting files
    $filesToCopy = @("nssm.exe", "cloudflared.exe")
    foreach ($file in $filesToCopy) {
        $sourceFile = Join-Path $sourceBin $file
        if (Test-Path $sourceFile) {
            Copy-Item $sourceFile -Destination $binDir -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Copied $file" -ForegroundColor Green
        }
    }
    
    # Copy Redis.msi - check multiple locations
    $redisLocations = @(
        (Join-Path $sourceBin "Redis.msi"),
        (Join-Path $toolsPath "Redis.msi"),
        (Get-ChildItem -Path $toolsPath -Filter "Redis*.msi" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1)
    )
    $redisFound = $false
    foreach ($redisPath in $redisLocations) {
        if ($redisPath -and (Test-Path $redisPath)) {
            Copy-Item $redisPath -Destination (Join-Path $binDir "Redis.msi") -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Copied Redis.msi from: $redisPath" -ForegroundColor Green
            $redisFound = $true
            break
        }
    }
    if (-not $redisFound) {
        Write-Host "  [WARN] Redis.msi not found - you may need to download it manually" -ForegroundColor Yellow
        Write-Host "  [INFO] Download from: https://github.com/tporadowski/redis/releases" -ForegroundColor Gray
    }
    
    # Copy DLLs
    $dlls = Get-ChildItem -Path $sourceBin -Filter "*.dll" -ErrorAction SilentlyContinue
    foreach ($dll in $dlls) {
        Copy-Item $dll.FullName -Destination $binDir -Force -ErrorAction SilentlyContinue
    }
    if ($dlls) {
        Write-Host "  [OK] Copied DLLs" -ForegroundColor Green
    }
    
    # Copy Electron resources if needed
    $sourceResources = Join-Path $sourceBin "resources"
    if (Test-Path $sourceResources) {
        $destResources = Join-Path $binDir "resources"
        if (-not (Test-Path $destResources)) { New-Item -ItemType Directory -Path $destResources -Force | Out-Null }
        Copy-Item (Join-Path $sourceResources "*") -Destination $destResources -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Copied Electron resources" -ForegroundColor Green
    }
    
    # Copy other Electron files
    $electronFiles = @("icudtl.dat", "v8_context_snapshot.bin", "snapshot_blob.bin")
    foreach ($file in $electronFiles) {
        $sourceFile = Join-Path $sourceBin $file
        if (Test-Path $sourceFile) {
            Copy-Item $sourceFile -Destination $binDir -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host "  [WARN] Source bin directory not found: $sourceBin" -ForegroundColor Yellow
}

# Copy Electron DLLs from build if we built frontend
if (-not $SkipFrontend) {
    $electronDist = "installer\electron-launcher\dist\win-unpacked"
    if (Test-Path $electronDist) {
        $dlls = Get-ChildItem -Path $electronDist -Filter "*.dll" -ErrorAction SilentlyContinue
        foreach ($dll in $dlls) {
            Copy-Item $dll.FullName -Destination $binDir -Force -ErrorAction SilentlyContinue
        }
        if ($dlls) {
            Write-Host "  [OK] Copied Electron DLLs from build" -ForegroundColor Green
        }
    }
}

# Step 5: Build Installer
if (-not $SkipInstaller) {
    Write-Host "`n[5/5] Building Installer..." -ForegroundColor Cyan
    
    # Check if existing installer is locked and handle it
    $distDir = Join-Path $projectRoot "installer\dist"
    if (-not (Test-Path $distDir)) {
        New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    }
    
    $existingInstaller = Join-Path $distDir "ZerodhaDashboard-Setup-1.1.0.exe"
    if (Test-Path $existingInstaller) {
        Write-Host "  [INFO] Existing installer found, checking if it's locked..." -ForegroundColor Yellow
        try {
            # Try to rename it first (this will fail if locked)
            $backupName = "ZerodhaDashboard-Setup-1.1.0.exe.backup"
            $backupPath = Join-Path $distDir $backupName
            if (Test-Path $backupPath) {
                Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
            }
            Rename-Item -Path $existingInstaller -NewName $backupName -Force
            Write-Host "  [OK] Renamed existing installer to backup" -ForegroundColor Green
        }
        catch {
            Write-Host "  [WARN] Cannot rename existing installer (file may be locked)" -ForegroundColor Yellow
            Write-Host "  [INFO] Attempting to delete it..." -ForegroundColor Yellow
            try {
                # Try to delete it
                Remove-Item $existingInstaller -Force -ErrorAction Stop
                Write-Host "  [OK] Deleted existing installer" -ForegroundColor Green
            }
            catch {
                Write-Host "  [ERROR] Cannot delete existing installer: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "  [SOLUTION] Please:" -ForegroundColor Yellow
                Write-Host "    1. Close any file explorer windows showing the installer" -ForegroundColor White
                Write-Host "    2. Close Cursor or any other program that might have it open" -ForegroundColor White
                Write-Host "    3. Stop any antivirus scanning" -ForegroundColor White
                Write-Host "    4. Or manually delete: $existingInstaller" -ForegroundColor White
                Write-Host "`n  [INFO] Waiting 3 seconds before retry..." -ForegroundColor Cyan
                Start-Sleep -Seconds 3
                try {
                    Remove-Item $existingInstaller -Force -ErrorAction Stop
                    Write-Host "  [OK] Successfully deleted after retry" -ForegroundColor Green
                }
                catch {
                    Write-Host "  [WARN] Still cannot delete. Will build with timestamped name..." -ForegroundColor Yellow
                    # Set flag to use timestamped name
                    $script:useTimestampedName = $true
                }
            }
        }
    }
    
    # Verify required files
    $requiredFiles = @(
        @{Path = (Join-Path $binDir "dashboard-backend.exe"); Name = "dashboard-backend.exe"; Required = $true},
        @{Path = (Join-Path $binDir "frontend.exe"); Name = "frontend.exe"; Required = $true},
        @{Path = (Join-Path $binDir "cloudflared.exe"); Name = "cloudflared.exe"; Required = $true},
        @{Path = (Join-Path $binDir "nssm.exe"); Name = "nssm.exe"; Required = $true},
        @{Path = (Join-Path $binDir "Redis.msi"); Name = "Redis.msi"; Required = $true}
    )
    
    $missing = @()
    $warnings = @()
    foreach ($fileInfo in $requiredFiles) {
        if (-not (Test-Path $fileInfo.Path)) {
            if ($fileInfo.Required) {
                $missing += $fileInfo.Path
            } else {
                $warnings += $fileInfo.Name
            }
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "  [WARN] Optional files missing (will continue):" -ForegroundColor Yellow
        foreach ($warn in $warnings) {
            Write-Host "    - $warn" -ForegroundColor Yellow
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "  [ERROR] Missing required files:" -ForegroundColor Red
        foreach ($file in $missing) {
            Write-Host "    - $file" -ForegroundColor Red
        }
        Write-Host "`n  [INFO] For Redis.msi, download from:" -ForegroundColor Yellow
        Write-Host "    https://github.com/tporadowski/redis/releases" -ForegroundColor Gray
        Write-Host "    Place it in: $binDir" -ForegroundColor Gray
        exit 1
    }
    
    # Build installer
    $issPath = Join-Path $projectRoot "installer\installer.iss"
    
    # If file was locked, use timestamped name
    if ($script:useTimestampedName) {
        Write-Host "  [INFO] Creating temporary ISS file with timestamped name..." -ForegroundColor Cyan
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $issContent = Get-Content $issPath -Raw
        $originalOutput = "OutputBaseFilename=ZerodhaDashboard-Setup-{#MyAppVersion}"
        $newOutput = "OutputBaseFilename=ZerodhaDashboard-Setup-{#MyAppVersion}-$timestamp"
        $issContent = $issContent -replace [regex]::Escape($originalOutput), $newOutput
        $tempIssPath = Join-Path $projectRoot "installer\installer-temp.iss"
        Set-Content -Path $tempIssPath -Value $issContent
        $issPath = $tempIssPath
        Write-Host "  [INFO] Will build as: ZerodhaDashboard-Setup-1.1.0-$timestamp.exe" -ForegroundColor Cyan
    }
    
    $issPath = [System.IO.Path]::GetFullPath($issPath)
    Push-Location (Split-Path $issPath -Parent)
    try {
        $issFileName = Split-Path $issPath -Leaf
        & $iscc "`"$issFileName`""
        
        # Clean up temp ISS file if we created one
        if ($issFileName -eq "installer-temp.iss") {
            Remove-Item $issPath -Force -ErrorAction SilentlyContinue
        }
    } finally {
        Pop-Location
    }
    
    if ($LASTEXITCODE -eq 0) {
        $installer = Get-ChildItem -Path $distDir -Filter "ZerodhaDashboard-Setup-1.1.0.exe" -ErrorAction SilentlyContinue
        if ($installer) {
            $size = [math]::Round($installer.Length / 1MB, 2)
            Write-Host "`n========================================" -ForegroundColor Green
            Write-Host "Build Complete!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Installer: $($installer.FullName)" -ForegroundColor Cyan
            Write-Host "Size: $size MB" -ForegroundColor Cyan
            Write-Host "Version: 1.1.0" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  [ERROR] Installer build failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[5/5] Skipping Installer build" -ForegroundColor Yellow
}

Write-Host "`nDone!`n" -ForegroundColor Green

