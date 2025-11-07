# Update Zerodha Redirect URI - Step by Step Guide

## Current Configuration
- **Backend Callback URL**: `https://mlb-ranger-printing-aspect.trycloudflare.com/api/zerodha/callback`
- **API Key**: `hvgaaodyzyhzq57s`
- **Status**: Backend is ready and waiting

## Steps to Update Zerodha Redirect URI

### 1. Login to Zerodha Developer Console
- Open browser: https://kite.trade/apps
- Login with your Zerodha credentials

### 2. Find Your Application
- Look for application with API Key: `hvgaaodyzyhzq57s`
- Click on the application to view details

### 3. Edit Application Settings
- Click the **"Edit"** button
- Find the **"Redirect URL"** or **"Redirect URI"** field

### 4. Update Redirect URI
**Current (OLD - needs to be changed):**
```
https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback
```

**New (UPDATE TO THIS):**
```
https://mlb-ranger-printing-aspect.trycloudflare.com/api/zerodha/callback
```

### 5. Save Changes
- Click **"Save"** button
- Wait for confirmation message
- Wait 2-3 minutes for changes to propagate through Zerodha's system

### 6. Verify Update
- Check that the Redirect URI field now shows the new URL
- The old URL (`aka-steps-blah-speakers`) should be replaced

## Testing After Update

After updating the redirect URI:

1. Get OAuth URL:
   ```powershell
   Invoke-RestMethod http://localhost:9000/api/zerodha/auth-url
   ```

2. Open the OAuth URL in browser

3. Complete login - you should be redirected to:
   ```
   https://mlb-ranger-printing-aspect.trycloudflare.com/api/zerodha/callback?status=success&request_token=...
   ```

4. Copy the callback URL and share it, or extract the `access_token` from the response

5. Update token (if new):
   ```powershell
   .\scripts\update-zerodha-token.ps1 -AccessToken 'NEW_TOKEN'
   ```

## Important Notes

- ⚠️ **The redirect URI cannot be changed easily once set** - make sure it's correct
- ⚠️ **Wait 2-3 minutes** after saving for changes to propagate
- ⚠️ **Old tunnel URL is expired** - OAuth will fail if not updated
- ✅ **Backend is already configured** with the new tunnel URL
- ✅ **Tunnel should be running** - check with: `Get-Process cloudflared`

## Troubleshooting

### If OAuth still redirects to old URL:
- Wait a few more minutes (up to 5 minutes)
- Clear browser cache
- Try incognito/private browsing mode
- Verify the URL was saved correctly in Zerodha

### If tunnel is not reachable:
- Start tunnel: `.\cloudflared.exe tunnel --url http://localhost:9000`
- Note the new URL if it changed
- Update both Zerodha and backend configuration

### If backend is not running:
```powershell
docker compose up -d backend
```

## Current Status
- ✅ Backend configured with new tunnel URL
- ✅ Backend running on port 9000
- ✅ API key configured
- ⏳ **Waiting for Zerodha redirect URI update**

