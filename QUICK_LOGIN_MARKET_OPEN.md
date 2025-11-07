# Quick Zerodha Login Steps (Market Open)

## ⚡ Fast Login Process

### Step 1: Get OAuth URL
```powershell
Invoke-RestMethod http://localhost:9000/api/zerodha/auth-url | Select-Object -ExpandProperty auth_url
```

**OR use the helper script:**
```powershell
.\scripts\quick-zerodha-login.ps1
```

### Step 2: Login IMMEDIATELY ⚠
- **Open the OAuth URL in browser**
- **Login to Zerodha RIGHT AWAY** (token expires in 30-60 seconds)
- **Authorize the application**
- **Wait for redirect to callback URL**

### Step 3: Copy Access Token
After login, you'll see a JSON response like:
```json
{
  "success": true,
  "access_token": "YOUR_NEW_TOKEN_HERE",
  "message": "OAuth authentication successful"
}
```

**Copy the `access_token` value.**

### Step 4: Update Token
```powershell
.\scripts\update-zerodha-token.ps1 -AccessToken 'YOUR_NEW_TOKEN_HERE'
```

This will:
- ✅ Update `application.properties`
- ✅ Update `docker-compose.yml`
- ✅ Restart backend
- ✅ Verify token works

### Step 5: Verify & Test
```powershell
# Test API
Invoke-WebRequest http://localhost:9000/api/real-derivatives?underlying=NIFTY | Select-Object -ExpandProperty Content

# Access Frontend
Start-Process http://localhost:5174
```

---

## 🚨 Critical Timing

**Request tokens expire in 30-60 seconds!**

1. ✅ Get OAuth URL
2. ✅ **Login IMMEDIATELY** (within 30 seconds)
3. ✅ Complete authorization
4. ✅ Copy token and update

**Don't wait between steps!**

---

## 📋 Current Configuration

- **API Key**: `hvgaaodyzyhzq57s`
- **Redirect URI**: `https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback`
- **Backend**: `http://localhost:9000`
- **Frontend Dev**: `http://localhost:5174`
- **Frontend Prod**: `http://localhost:5173`

---

## 🕐 Market Hours (IST)

- **Regular Trading**: 9:15 AM - 3:30 PM
- **Pre-Market**: 9:00 AM - 9:15 AM
- **Post-Market**: 3:30 PM - 4:00 PM

**Real-time data is available during these hours.**

---

## 🔄 Daily Token Refresh

Zerodha access tokens expire daily. Refresh before market opens:

1. Get fresh OAuth URL
2. Login and get new token
3. Update configuration
4. Start trading!

---

## 📞 Quick Commands

```powershell
# Get OAuth URL
Invoke-RestMethod http://localhost:9000/api/zerodha/auth-url

# Check backend status
Invoke-RestMethod http://localhost:9000/api/zerodha/status

# Update token
.\scripts\update-zerodha-token.ps1 -AccessToken 'TOKEN'

# Test API
Invoke-WebRequest http://localhost:9000/api/real-derivatives?underlying=NIFTY

# View frontend
Start-Process http://localhost:5174
```

---

## ✅ Success Indicators

After login, you should see:
- ✅ Token exchange successful
- ✅ Backend restarted
- ✅ Token verified
- ✅ API returns data (during market hours)

**Happy Trading! 📈**

