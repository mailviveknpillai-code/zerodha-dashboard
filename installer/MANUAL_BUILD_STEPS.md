# Manual Build Steps for Zerodha Dashboard Installer

## Quick Build (Recommended)

### Step 1: Prepare Environment
1. Close **ALL** File Explorer windows
2. Close Cursor/VS Code if they have installer files open
3. Wait 5-10 seconds for file locks to release

### Step 2: Kill Locking Processes (Optional)
Run in PowerShell:
```powershell
Get-Process | Where-Object { $_.ProcessName -like '*Zerodha*' -or $_.ProcessName -like '*Setup*' -or $_.ProcessName -like '*Inno*' } | Stop-Process -Force
```

### Step 3: Navigate to Project Root
```powershell
cd C:\vivek\freelance\zerodha-dashboard
```

### Step 4: Run Build Script
**Quick build (skips Launch4j - use if backend.exe already exists):**
```powershell
.\installer\rebuild-all-v1.1.0.ps1 -SkipLaunch4j
```

**Full build (builds everything including backend.exe):**
```powershell
.\installer\rebuild-all-v1.1.0.ps1
```

### Step 5: Find Your Installer
The installer will be created at:
```
installer\dist\ZerodhaDashboard-Setup-1.1.0.exe
```

**Note:** If the file was locked, the script will automatically create a timestamped version:
```
installer\dist\ZerodhaDashboard-Setup-1.1.0-20251122-234255.exe
```

---

## Troubleshooting

### Error: "File is locked"
**Solution:**
1. Close all File Explorer windows
2. Close any programs that might have the file open
3. Wait 10 seconds
4. Run the build again - it will use a timestamped name automatically

### Error: "Missing required files"
**Solution:**
Check that these files exist in `installer\bin\`:
- `dashboard-backend.exe`
- `frontend.exe`
- `cloudflared.exe`
- `nssm.exe`
- `Redis.msi`

### Error: "Launch4j build failed"
**Solution:**
Use the `-SkipLaunch4j` flag if `dashboard-backend.exe` already exists:
```powershell
.\installer\rebuild-all-v1.1.0.ps1 -SkipLaunch4j
```

---

## What the Build Script Does

1. **Builds Backend JAR** (unless skipped)
2. **Creates Backend EXE** using Launch4j (unless `-SkipLaunch4j` is used)
3. **Builds Frontend** React app
4. **Copies Required Files** to `installer\bin\`
5. **Builds Installer** using Inno Setup

---

## Build Time
- Quick build (`-SkipLaunch4j`): ~2-3 minutes
- Full build: ~5-10 minutes

---

## After Build

1. Test the installer by running it
2. The installer will:
   - Ask for Zerodha API credentials
   - Automatically provision a Cloudflare tunnel
   - Complete installation automatically

---

## Notes

- The build script automatically handles locked files by using timestamped names
- All simplified changes (no token required) are already in the code
- The API must be running on `http://localhost:3000` for provisioning to work






