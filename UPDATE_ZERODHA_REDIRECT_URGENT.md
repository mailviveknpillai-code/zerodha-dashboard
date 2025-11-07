# ⚠️ URGENT: Update Zerodha Redirect URI

## Current Issue
Zerodha is still redirecting to the **OLD expired tunnel URL**, but our backend is configured with the **NEW active tunnel URL**.

### Problem:
- **Zerodha is using:** `https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback` ❌ (EXPIRED)
- **Backend expects:** `https://rhode-theory-announcements-hood.trycloudflare.com/api/zerodha/callback` ✅ (ACTIVE)

## Solution: Update Zerodha App Settings

### Step 1: Login to Zerodha Developer Console
1. Open browser and go to: **https://kite.trade/apps**
2. Login with your Zerodha credentials

### Step 2: Find Your Application
- Look for application with **API Key: `hvgaaodyzyhzq57s`**
- Click on the application to view details

### Step 3: Edit Application Settings
1. Click **"Edit"** or **"Settings"** button
2. Find the **"Redirect URL"** or **"Redirect URI"** field

### Step 4: Update Redirect URI
**Current (OLD - needs to be changed):**
```
https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback
```

**New (UPDATE TO THIS - copy exactly):**
```
https://rhode-theory-announcements-hood.trycloudflare.com/api/zerodha/callback
```

### Step 5: Save Changes
1. Click **"Save"** or **"Update"** button
2. Wait for confirmation message
3. **Wait 2-3 minutes** for changes to propagate through Zerodha's system

### Step 6: Verify
1. Check that the Redirect URI field now shows the new URL
2. Try OAuth login again - it should now redirect to the new tunnel URL

## Important Notes

⚠️ **The redirect URI cannot be changed easily once set** - make sure it's correct before saving

⚠️ **Wait 2-3 minutes** after saving for changes to propagate

⚠️ **Old tunnel URL is expired** - OAuth will fail if not updated

✅ **Backend is already configured** with the new tunnel URL

✅ **New tunnel is active and reachable**

## After Update

Once Zerodha is updated:
1. Get OAuth URL: `Invoke-RestMethod http://localhost:9000/api/zerodha/auth-url`
2. Open the OAuth URL in browser
3. Complete login
4. You should be redirected to: `https://rhode-theory-announcements-hood.trycloudflare.com/api/zerodha/callback?status=success&request_token=...`
5. Token will be automatically updated

## Current Status

- ✅ Backend configured with new tunnel URL
- ✅ Backend running and ready
- ✅ New tunnel is active and reachable
- ✅ Token updated successfully
- ❌ **Zerodha still using old redirect URI (needs update)**

## Quick Reference

**Zerodha App Settings:** https://kite.trade/apps

**API Key:** hvgaaodyzyhzq57s

**New Redirect URI:**
```
https://rhode-theory-announcements-hood.trycloudflare.com/api/zerodha/callback
```

## Automation Script

If tunnel expires in the future, run:
```powershell
.\scripts\auto-update-tunnel.ps1
```

This will automatically:
- Capture new tunnel URL
- Update configuration files
- Restart backend
- Display new redirect URI for Zerodha

