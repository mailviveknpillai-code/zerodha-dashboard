# Quick Cloudflare Tunnel Setup - Public Hostname Method

## Problem
The `cloudflared tunnel login` command requires selecting a Cloudflare zone, but you don't have any zones. This is blocking the setup.

## Solution: Use Public Hostname
Cloudflare Tunnel can create a public hostname automatically without needing:
- Zone selection
- DNS configuration
- Domain management

## Quick Setup Steps

### Step 1: Create Quick Tunnel (No Login Needed)
```powershell
.\cloudflared.exe tunnel --url http://localhost:9000
```

This will:
- Create a temporary tunnel
- Display a public URL like: `https://random-words-1234.cfargotunnel.com`
- Work immediately without any login

### Step 2: Note the Public URL
The command will output something like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-1234.cfargotunnel.com                                                |
+--------------------------------------------------------------------------------------------+
```

### Step 3: Update Zerodha Redirect URI
Update your Zerodha app settings to use:
```
https://YOUR-TUNNEL-URL.cfargotunnel.com/api/zerodha/callback
```

### Step 4: Update application.properties
```properties
zerodha.redirect.uri=https://YOUR-TUNNEL-URL.cfargotunnel.com/api/zerodha/callback
```

## Permanent Tunnel Setup (Later)

If you want a permanent tunnel later:
1. Set up a Cloudflare zone (add DuckDNS domain)
2. Complete the login process
3. Create named tunnel
4. Use your custom domain

## For Now: Use Quick Tunnel

The quick tunnel method works perfectly for:
- ✅ OAuth callbacks
- ✅ Development/testing
- ✅ Immediate use

Just run the command and use the URL it provides!

