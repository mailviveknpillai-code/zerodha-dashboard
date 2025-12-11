# How to Run the Application

## Important: Two Different Approaches

### Approach 1: JAR-Based Launcher (Current - No Installation)
The `ZerodhaDashboard.exe` we just created is a **launcher**, not an installer. It runs the application directly without installation.

### Approach 2: Installer-Based (Original - With Installation)
The original Inno Setup installer (`ZerodhaDashboard-Setup-1.1.0.exe`) installs the application first, then you run it.

---

## Scenario A: JAR-Based Launcher (Current Setup)

### Prerequisites (One-Time Setup)
1. **Install Java 21**
   - Download: https://adoptium.net/
   - Verify: Open command prompt, type `java -version`
   - Should show: `openjdk version "21"`

2. **Install and Start Redis**
   ```powershell
   # Option 1: Redis for Windows
   # Download and install Redis for Windows
   # Then run:
   redis-server
   
   # Option 2: Docker (Recommended)
   docker run -d -p 6379:6379 --name zerodha-redis redis:7-alpine
   ```

### Running the Application (Every Time)

**Step 1: Navigate to Application Folder**
```powershell
cd C:\ZerodhaDashboard
# (or wherever you extracted the client package)
```

**Step 2: Double-Click EXE**
- Double-click `ZerodhaDashboard.exe`
- A GUI window will appear

**Step 3: Wait for Services to Start**
The GUI will show:
- "Starting backend..." (yellow)
- "Backend ready. Starting tunnel..." (yellow)
- "✓ All services running" (green)
- Tunnel URL displayed (blue)

**Step 4: Browser Opens Automatically**
- Browser opens to the Cloudflare tunnel URL after 2 seconds
- Frontend loads automatically
- Login with Zerodha credentials

**Step 5: Use the Application**
- Dashboard is now accessible
- Click "Exit" button in GUI to shut down everything

---

## Scenario B: Installer-Based (Original Setup)

### Installation (One-Time)

**Step 1: Run Installer**
- Double-click `ZerodhaDashboard-Setup-1.1.0.exe`
- Follow installation wizard:
  - Accept license
  - Choose installation directory (default: `C:\Program Files\ZerodhaDashboard`)
  - Enter Zerodha API credentials
  - Enter static IP (if needed)
  - Wait for provisioning
  - Paste tunnel URL when prompted
  - Complete installation

**Step 2: Installation Completes**
- Application is installed to: `C:\Program Files\ZerodhaDashboard`
- Backend service is installed as Windows service
- Shortcut created on desktop/start menu

### Running the Application (Every Time)

**Option 1: Desktop Shortcut**
- Double-click "Zerodha Dashboard" shortcut on desktop
- `frontend.exe` launches automatically

**Option 2: Start Menu**
- Click Start → Zerodha Dashboard → Zerodha Dashboard

**Option 3: Direct Execution**
```powershell
cd "C:\Program Files\ZerodhaDashboard\installer\bin"
.\frontend.exe
```

**What Happens:**
1. Electron window opens
2. Backend service starts (if not running)
3. Cloudflare tunnel connects
4. Dashboard loads in Electron window

---

## Quick Comparison

| Aspect | JAR-Based Launcher | Installer-Based |
|--------|-------------------|-----------------|
| Installation | None (just extract) | Full installer wizard |
| Prerequisites | Java 21 + Redis | Everything bundled |
| Running | Double-click EXE | Desktop shortcut |
| Services | Started by launcher | Windows service |
| Updates | Replace JAR files | Reinstall |

---

## Troubleshooting

### JAR-Based Launcher Issues

**Backend Won't Start:**
- Check `backend.log` file in application folder
- Verify Java 21 is installed: `java -version`
- Check if port 9000 is available

**Tunnel Won't Connect:**
- Ensure `cloudflared.exe` is in same folder
- Check internet connection
- Verify firewall allows cloudflared

**Browser Doesn't Open:**
- Click "Open Dashboard" button manually
- Check tunnel URL in GUI window

**Redis Connection Error:**
- Verify Redis is running: `redis-cli ping` (should return PONG)
- Check Redis is on port 6379

### Installer-Based Issues

**Frontend.exe Won't Start:**
- Check backend service: `Get-Service ZerodhaDashboardBackend`
- Restart service: `Restart-Service ZerodhaDashboardBackend`
- Check logs: `C:\Program Files\ZerodhaDashboard\logs\`

**Service Won't Start:**
- Check NSSM: `C:\Program Files\ZerodhaDashboard\installer\bin\nssm.exe status ZerodhaDashboardBackend`
- Check application.properties for errors

---

## Recommended Approach

**For Development/Testing:** Use JAR-based launcher (current setup)
- Faster iteration
- Easier debugging
- No installation needed

**For Production/Client Deployment:** Use installer-based
- Professional installation
- Windows service management
- Better user experience





