# Client Deployment Guide

## Files to Share with Client

### Required Files (in `deployment` folder):
1. **ZerodhaDashboard.exe** - Main launcher application
2. **dashboard-app-*.jar** - Backend application (with embedded frontend)
3. **cloudflared.exe** - Cloudflare tunnel tool
4. **configure-client.ps1** - Configuration tool (for setting client credentials)
5. **README.txt** - User instructions

### Optional Files:
- **CLIENT_DEPLOYMENT_GUIDE.md** - This guide (for technical setup)

---

## Pre-Deployment: Configure Client Settings

### Step 1: Update Client-Specific Data

Before sharing with client, run the configuration tool:

```powershell
cd deployment
.\configure-client.ps1
```

**You'll be prompted for:**
- Zerodha API Key
- Zerodha API Secret
- Static IP Address (if required)
- Network Interface (default: eth0)

**Or run with parameters:**
```powershell
.\configure-client.ps1 `
    -ZerodhaApiKey "client-api-key" `
    -ZerodhaApiSecret "client-api-secret" `
    -StaticIp "192.168.1.100" `
    -NetworkInterface "eth0"
```

This updates the backend JAR with client-specific settings.

---

## Client Installation Steps

### Prerequisites (Client Must Have):

1. **Java 21** installed
   - Download from: https://adoptium.net/
   - Verify: Open command prompt, type `java -version`
   - Should show: `openjdk version "21"`

2. **Redis** running (or configure backend for embedded Redis)
   - Windows: Install Redis for Windows
   - Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`

3. **Windows 10/11** (64-bit)

### Installation Steps:

#### Step 1: Receive Files
Client receives the `deployment` folder with all files.

#### Step 2: Extract/Copy Files
- Extract the deployment package to a folder (e.g., `C:\ZerodhaDashboard`)
- Ensure all files are in the same folder

#### Step 3: Verify Java Installation
```powershell
java -version
```
Should show Java 21.

#### Step 4: Start Redis (if not already running)
```powershell
# If using Redis for Windows
redis-server

# Or if using Docker
docker start redis-container
```

#### Step 5: Run Application
- Double-click `ZerodhaDashboard.exe`
- Wait for GUI to show "✓ All services running"
- Browser will open automatically

#### Step 6: Access Dashboard
- Browser opens to Cloudflare tunnel URL
- Login with Zerodha credentials
- Dashboard loads automatically

---

## File Structure (Client Side)

```
C:\ZerodhaDashboard\
├── ZerodhaDashboard.exe          (72 KB)
├── dashboard-app-0.0.1-SNAPSHOT.jar  (35 MB)
├── cloudflared.exe               (65 MB)
├── configure-client.ps1          (Configuration tool)
├── README.txt                    (User instructions)
└── backend.log                   (Created automatically)
```

---

## Configuration Updates (After Deployment)

If client needs to update credentials later:

1. Stop the application (click "Exit" button)
2. Run: `.\configure-client.ps1`
3. Enter new credentials
4. Restart application

---

## Troubleshooting

### Backend Won't Start
- Check `backend.log` file
- Verify Java 21 is installed
- Check if port 9000 is available

### Tunnel Won't Connect
- Ensure `cloudflared.exe` is in same directory
- Check internet connection
- Verify firewall allows cloudflared

### Browser Doesn't Open
- Click "Open Dashboard" button manually
- Check tunnel URL in GUI

### Redis Connection Error
- Verify Redis is running: `redis-cli ping` (should return PONG)
- Check Redis host/port in application.properties

---

## Security Notes

- API credentials are embedded in JAR (encrypted in production)
- Tunnel URL is temporary (changes on restart)
- All communication is HTTPS via Cloudflare tunnel
- No data stored locally (uses Redis)

---

## Support

For issues:
1. Check `backend.log` for errors
2. Verify all prerequisites are met
3. Ensure all files are in same directory
4. Contact support with error messages





