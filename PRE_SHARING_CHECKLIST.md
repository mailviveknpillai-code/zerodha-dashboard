# Pre-Sharing Checklist - Customer Deployment

## ⚠️ IMPORTANT: Complete These Steps BEFORE Sharing

---

## STEP 1: Configure Client-Specific Settings

### 1.1 Navigate to Client Package Directory
```powershell
cd launcher\client-package
```

### 1.2 Run Configuration Tool
```powershell
.\configure-client.ps1
```

### 1.3 Enter Client Information
You'll be prompted for:
- **Zerodha API Key** - Client's Zerodha API key
- **Zerodha API Secret** - Client's Zerodha API secret
- **Static IP Address** (if required) - Client's static IP
- **Network Interface** (default: eth0) - Network interface name

**Example:**
```
Enter Zerodha API Credentials:
Zerodha API Key: abc123xyz456
Zerodha API Secret: secret789key012
Enter Network Configuration:
Static IP Address: 192.168.1.100
Network Interface (default: eth0): eth0
```

### 1.4 Verify Configuration Applied
- Check that backup JAR was created: `dashboard-app-*.jar.backup`
- Verify new JAR has updated timestamp
- Configuration is now embedded in the JAR

---

## STEP 2: Verify Package Contents

### 2.1 Check All Files Are Present
```powershell
cd launcher\client-package
Get-ChildItem
```

**Required Files:**
- ✅ `ZerodhaDashboard.exe` (72 KB)
- ✅ `dashboard-app-0.0.1-SNAPSHOT.jar` (35 MB)
- ✅ `cloudflared.exe` (65 MB)
- ✅ `configure-client.ps1` (4 KB)
- ✅ `INSTALLATION.txt` (1 KB)

### 2.2 Verify File Sizes
```powershell
Get-ChildItem | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

**Expected Sizes:**
- ZerodhaDashboard.exe: ~0.07 MB
- dashboard-app-*.jar: ~35 MB
- cloudflared.exe: ~65 MB
- Total: ~100 MB

---

## STEP 3: Test the Package Locally (Recommended)

### 3.1 Test Run
```powershell
cd launcher\client-package
.\ZerodhaDashboard.exe
```

### 3.2 Verify:
- ✅ GUI window appears
- ✅ Backend starts (check backend.log)
- ✅ Tunnel connects (URL appears in GUI)
- ✅ Browser opens automatically
- ✅ Frontend loads correctly
- ✅ Exit button shuts down cleanly

### 3.3 Check Logs
```powershell
Get-Content backend.log -Tail 20
```

Look for:
- No critical errors
- Backend started successfully
- Redis connection successful

---

## STEP 4: Create Final ZIP Package

### 4.1 Ensure Latest Package
```powershell
cd launcher
.\create-client-package-fixed.ps1
```

### 4.2 Verify ZIP Location
```powershell
Get-Item "ZerodhaDashboard-Client-Package.zip"
```

**Location:** `launcher\ZerodhaDashboard-Client-Package.zip`
**Size:** ~50 MB (compressed)

---

## STEP 5: Prepare Customer Instructions

### 5.1 Create Customer Email/Message Template

**Subject:** Zerodha Dashboard - Installation Package

**Message Template:**
```
Dear [Customer Name],

Please find attached the Zerodha Dashboard installation package.

INSTALLATION REQUIREMENTS:
1. Java 21 installed (download from: https://adoptium.net/)
2. Redis running on port 6379
3. Windows 10/11 (64-bit)
4. Internet connection

INSTALLATION STEPS:
1. Extract the ZIP file to a folder (e.g., C:\ZerodhaDashboard)
2. Install Java 21 if not already installed
3. Start Redis (see instructions in INSTALLATION.txt)
4. Double-click ZerodhaDashboard.exe
5. Wait for browser to open automatically
6. Login with your Zerodha credentials

DETAILED INSTRUCTIONS:
Please refer to INSTALLATION.txt file included in the package.

SUPPORT:
If you encounter any issues, please check backend.log file and contact support.

Best regards,
[Your Name]
```

---

## STEP 6: Security Check

### 6.1 Verify No Sensitive Data in Package
- ✅ No hardcoded credentials in files
- ✅ No personal information
- ✅ Configuration tool included for updates

### 6.2 Check File Permissions
```powershell
Get-ChildItem launcher\client-package | Get-Acl
```

---

## STEP 7: Final Verification

### 7.1 Package Integrity Check
```powershell
# Verify ZIP can be extracted
$tempExtract = "$env:TEMP\zerodha-verify-$(Get-Random)"
Expand-Archive -Path "launcher\ZerodhaDashboard-Client-Package.zip" -DestinationPath $tempExtract -Force
Get-ChildItem $tempExtract
Remove-Item $tempExtract -Recurse -Force
```

### 7.2 File Count Verification
```powershell
$zip = [System.IO.Compression.ZipFile]::OpenRead("launcher\ZerodhaDashboard-Client-Package.zip")
Write-Host "Files in ZIP: $($zip.Entries.Count)"
$zip.Dispose()
```

**Expected:** 5 files (EXE, JAR, cloudflared, configure script, README)

---

## STEP 8: Share the Package

### 8.1 Choose Sharing Method
- **Email:** Attach ZIP file (if under size limit)
- **Cloud Storage:** Upload to Google Drive/Dropbox/OneDrive
- **File Transfer:** Use WeTransfer or similar service
- **FTP/SFTP:** If customer has server access

### 8.2 Include Instructions
- Attach or link to `INSTALLATION.txt`
- Provide support contact information
- Include troubleshooting guide

---

## STEP 9: Post-Sharing Follow-up

### 9.1 Send Confirmation
- Confirm package received
- Ask if they need assistance with installation
- Provide support contact details

### 9.2 Prepare for Support
- Keep backup of configured package
- Document customer-specific settings
- Be ready to assist with installation

---

## QUICK REFERENCE CHECKLIST

Before sharing, ensure:

- [ ] Client credentials configured in JAR
- [ ] All 5 files present in package
- [ ] Package tested locally (optional but recommended)
- [ ] ZIP file created and verified
- [ ] Customer instructions prepared
- [ ] Security check completed
- [ ] Package integrity verified
- [ ] Sharing method chosen
- [ ] Support contact information ready

---

## EMERGENCY: If Customer Needs to Update Settings Later

If customer needs to change credentials after deployment:

1. Customer stops application (click Exit)
2. Customer runs: `.\configure-client.ps1`
3. Customer enters new credentials
4. Customer restarts application

The configuration tool is included in the package for this purpose.

---

## TROUBLESHOOTING COMMON ISSUES

### Issue: Customer says package is corrupted
**Solution:** Re-create ZIP and verify extraction works

### Issue: Customer can't find Java
**Solution:** Provide direct download link: https://adoptium.net/

### Issue: Customer can't start Redis
**Solution:** Provide Docker command or Redis installation guide

### Issue: Application won't start
**Solution:** Ask customer to check backend.log and share error

---

## FINAL REMINDER

✅ **DO NOT** share package without configuring client credentials first
✅ **DO** test the package if possible
✅ **DO** provide clear installation instructions
✅ **DO** be available for support after sharing





