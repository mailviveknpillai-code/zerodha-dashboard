# Zerodha API Login Steps - Starting a New Session

## Overview
Zerodha access tokens expire daily. When you need to start a new session or refresh your token, follow these steps.

## Prerequisites
- Backend is running on `http://localhost:9000`
- Cloudflare tunnel is running (if accessing from outside)
- Zerodha API credentials configured in `application.properties`

---

## Step-by-Step Login Process

### Step 1: Start Backend and Cloudflare Tunnel (if needed)

**Start Backend:**
```powershell
# Option A: Using Docker
docker-compose up -d backend

# Option B: Using Maven
cd backend/dashboard
mvn spring-boot:run
```

**Start Cloudflare Tunnel (for external access):**
```powershell
.\cloudflared.exe tunnel --url http://localhost:9000
```
Note: Copy the public URL (e.g., `https://aka-xxxx.trycloudflare.com`)

---

### Step 2: Get OAuth Login URL

**From your browser or PowerShell:**
```powershell
# Get the OAuth URL
Invoke-WebRequest http://localhost:9000/api/zerodha/auth-url | ConvertFrom-Json | Select-Object -ExpandProperty auth_url
```

**Or visit directly in browser:**
```
http://localhost:9000/api/zerodha/auth-url
```

**Expected Response:**
```json
{
  "success": true,
  "auth_url": "https://kite.zerodha.com/connect/login?api_key=hvgaaodyzyhzq57s&v=3",
  "redirect_uri": "https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback",
  "api_key": "hvgaaodyzyhzq57s",
  "message": "Use this URL to initiate OAuth flow..."
}
```

---

### Step 3: Complete Zerodha Login

1. **Copy the `auth_url`** from Step 2
2. **Open the URL in your browser**
3. **Login to Zerodha** with your credentials
4. **Authorize the application** when prompted
5. **Wait for redirect** - You will be automatically redirected to the callback URL

**Important:** Complete the login immediately after getting the URL. Request tokens expire in 30-60 seconds!

---

### Step 4: Capture the Access Token

After successful login, Zerodha will redirect to:
```
https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback?action=login&status=success&request_token=XXXXX
```

**The backend will automatically:**
1. Receive the `request_token`
2. Exchange it for an `access_token`
3. Return the access token in the response

**Expected Response:**
```json
{
  "success": true,
  "message": "OAuth authentication successful",
  "access_token": "jQFoDt6fJTmrJBKAy3QQg6G200vpg3AR",
  "status": "success",
  "redirect_url": "/dashboard?success=oauth_success&access_token=jQFoDt6fJTmrJBKAy3QQg6G200vpg3AR"
}
```

---

### Step 5: Update Configuration with New Access Token

**Option A: Update application.properties manually**
```properties
zerodha.access.token=jQFoDt6fJTmrJBKAy3QQg6G200vpg3AR
```

**Option B: Update docker-compose.yml**
```yaml
ZERODHA_ACCESS_TOKEN: "jQFoDt6fJTmrJBKAy3QQg6G200vpg3AR"
```

**Option C: Use environment variable (recommended for production)**
```powershell
$env:ZERODHA_ACCESS_TOKEN = "jQFoDt6fJTmrJBKAy3QQg6G200vpg3AR"
```

---

### Step 6: Restart Backend (if config changed)

**If you updated application.properties or docker-compose.yml:**
```powershell
# Docker
docker-compose restart backend

# Maven
# Stop current process (Ctrl+C) and restart
mvn spring-boot:run
```

**Wait 30 seconds for backend to fully start, then verify:**
```powershell
Invoke-WebRequest http://localhost:9000/api/zerodha/status | ConvertFrom-Json
```

---

### Step 7: Verify Token is Working

**Test the access token:**
```powershell
# Check profile (should return user info)
$headers = @{
    "Authorization" = "token hvgaaodyzyhzq57s:YOUR_ACCESS_TOKEN"
    "X-Kite-Version" = "3"
}
Invoke-RestMethod -Uri "https://api.kite.trade/user/profile" -Headers $headers
```

**Or use the diagnostic script:**
```powershell
.\scripts\show-zerodha-api-response.ps1
```

---

## Quick Login Script

Save this as `scripts/quick-zerodha-login.ps1`:

```powershell
# Quick Zerodha Login Helper
Write-Host "=== Zerodha OAuth Login Helper ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get OAuth URL
Write-Host "Step 1: Getting OAuth URL..." -ForegroundColor Yellow
try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:9000/api/zerodha/auth-url"
    $authUrl = $authResponse.auth_url
    
    Write-Host "✓ OAuth URL obtained" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 2: Opening browser for login..." -ForegroundColor Yellow
    Write-Host "URL: $authUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT:" -ForegroundColor Red
    Write-Host "  - Complete login IMMEDIATELY (token expires in 30-60 seconds)" -ForegroundColor Yellow
    Write-Host "  - After login, you'll be redirected to the callback URL" -ForegroundColor Yellow
    Write-Host "  - Copy the access_token from the response" -ForegroundColor Yellow
    Write-Host ""
    
    # Open browser
    Start-Process $authUrl
    
    Write-Host "Browser opened. After login, check the callback URL for the access_token." -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 3: After login, update the token:" -ForegroundColor Yellow
    Write-Host "  1. Copy the access_token from the callback response" -ForegroundColor White
    Write-Host "  2. Update application.properties:" -ForegroundColor White
    Write-Host "     zerodha.access.token=YOUR_NEW_TOKEN" -ForegroundColor Gray
    Write-Host "  3. Restart backend: docker-compose restart backend" -ForegroundColor White
    
} catch {
    Write-Host "✗ Failed to get OAuth URL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  - Backend is running on http://localhost:9000" -ForegroundColor White
    Write-Host "  - Zerodha API key is configured" -ForegroundColor White
}
```

---

## Troubleshooting

### Issue: "Invalid checksum" error
**Solution:**
- Verify API secret matches exactly (no typos)
- Check `application.properties` has correct `zerodha.apisecret`
- Make sure there are no extra spaces

### Issue: "Token is invalid or has expired"
**Solution:**
- Request tokens expire in 30-60 seconds
- Get a fresh OAuth URL and complete login immediately
- Don't wait between getting URL and logging in

### Issue: Callback URL not reachable
**Solution:**
- Make sure Cloudflare tunnel is running
- Verify the tunnel URL matches the redirect URI in Zerodha app settings
- Test the callback URL manually: `Invoke-WebRequest https://your-tunnel-url/api/zerodha/callback`

### Issue: Empty quote data
**Solution:**
- This is normal when market is closed
- Test during market hours (9:15 AM - 3:30 PM IST)
- Verify token is valid using profile API

---

## Daily Token Refresh

**Access tokens expire daily.** To refresh:

1. Run Step 2-4 above (get OAuth URL, login, capture token)
2. Update configuration with new token
3. Restart backend

**Automation tip:** Consider scheduling a daily reminder to refresh the token before market opens.

---

## Current Configuration

**API Key:** `hvgaaodyzyhzq57s`  
**Redirect URI:** `https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback`  
**Current Access Token:** `jQFoDt6fJTmrJBKAy3QQg6G200vpg3AR` (valid until next day)

**Last Updated:** 2025-11-06

