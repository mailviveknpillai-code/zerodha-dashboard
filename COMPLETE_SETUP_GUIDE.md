# Complete Setup Guide - Zerodha API with Cloudflare Tunnel

## ✅ Current Status

### Configuration Complete
- ✅ Zerodha API enabled
- ✅ API Key: `hvgaaodyzyhzq57s`
- ✅ API Secret: `r6t8jx91k6xb1vrckgwrqi4owjd2u314`
- ✅ Redirect URI: `https://zerodhadashboard.duckdns.org/api/zerodha/callback`
- ✅ Port: 9000
- ✅ OAuth token exchange implemented
- ✅ X-Kite-Version header added

### What's Remaining
- ⏳ Cloudflare Tunnel setup (permanent tunnel)
- ⏳ Backend restart (if not running)
- ⏳ Test OAuth flow

## Step-by-Step Setup

### Part 1: Start Backend (if not running)

```powershell
cd backend\dashboard
mvn spring-boot:run
```

Wait for: `Tomcat started on port 9000`

### Part 2: Cloudflare Tunnel Setup

#### Step 1: Login to Cloudflare
```powershell
cd C:\vivek\freelance\zerodha-dashboard
.\cloudflared.exe tunnel login
```
- Browser opens for authentication
- Login with Cloudflare account (create free account if needed)
- Authorize the application

#### Step 2: Create Tunnel
```powershell
.\cloudflared.exe tunnel create zerodha-dashboard
```

#### Step 3: Get Tunnel ID
```powershell
.\cloudflared.exe tunnel list
```
Look for output like:
```
zerodha-dashboard  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
Copy the tunnel ID (the long hex string).

#### Step 4: Create Config File
Create file: `C:\Users\vivek\.cloudflared\config.yml`

Content (replace `<tunnel-id>` with your actual tunnel ID):
```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\vivek\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: zerodhadashboard.duckdns.org
    service: http://localhost:9000
  - service: http_status:404
```

#### Step 5: Route DNS
```powershell
.\cloudflared.exe tunnel route dns <tunnel-id> zerodhadashboard.duckdns.org
```

#### Step 6: Start Tunnel
```powershell
.\cloudflared.exe tunnel run <tunnel-id>
```

Or run in background:
```powershell
Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel","run","<tunnel-id>"
```

### Part 3: Verify Setup

```powershell
# Test local backend
Invoke-WebRequest http://localhost:9000/api/zerodha/status

# Test public URL (after tunnel is running)
Invoke-WebRequest https://zerodhadashboard.duckdns.org/api/zerodha/status
```

### Part 4: Test OAuth Flow

1. Get OAuth URL:
   ```powershell
   Invoke-WebRequest http://localhost:9000/api/zerodha/auth-url
   ```
   Copy the `auth_url` from response.

2. Visit the auth URL in browser and login with Zerodha credentials

3. After login, Zerodha will redirect to:
   `https://zerodhadashboard.duckdns.org/api/zerodha/callback?request_token=xxx&action=login&status=success`

4. The callback will:
   - Exchange request_token for access_token
   - Return access_token in response
   - Redirect to dashboard

## Troubleshooting

### "Invalid checksum" Error
- Request token may have expired (they expire in ~30 seconds)
- API secret must match exactly what's in Zerodha app settings
- Retry OAuth flow to get fresh token

### "Connection refused" on DuckDNS
- Cloudflare Tunnel not running
- Check: `Get-Process -Name cloudflared`
- Restart tunnel: `.\cloudflared.exe tunnel run <tunnel-id>`

### Backend not starting
- Check if port 9000 is in use: `netstat -ano | findstr :9000`
- Check Maven is installed: `mvn --version`
- Check Java is installed: `java -version`

## Files Modified

1. `backend/dashboard/src/main/resources/application.properties`
   - Zerodha enabled
   - API credentials added
   - Port set to 9000

2. `backend/dashboard/src/main/java/com/zerodha/dashboard/web/ZerodhaAuthController.java`
   - OAuth callback handler
   - Token exchange implementation
   - X-Kite-Version header added

3. `docker-compose.yml`
   - Port updated to 9000
   - Zerodha environment variables

## Quick Reference

**Your Zerodha Redirect URI:**
```
https://zerodhadashboard.duckdns.org/api/zerodha/callback
```

**API Credentials:**
- Key: `hvgaaodyzyhzq57s`
- Secret: `r6t8jx91k6xb1vrckgwrqi4owjd2u314`

**Local Backend:**
- URL: `http://localhost:9000`
- Status: `http://localhost:9000/api/zerodha/status`

**Public URL (after tunnel):**
- URL: `https://zerodhadashboard.duckdns.org`
- Status: `https://zerodhadashboard.duckdns.org/api/zerodha/status`

