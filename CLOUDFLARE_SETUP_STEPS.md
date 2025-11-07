# Cloudflare Tunnel Setup - Step by Step

## Prerequisites
- Backend running on port 9000
- Cloudflare account (free) - Sign up at https://dash.cloudflare.com/sign-up

## Setup Steps

### Step 1: Login to Cloudflare
```powershell
.\cloudflared.exe tunnel login
```
- Opens browser for authentication
- Authorize the application

### Step 2: Create Named Tunnel
```powershell
.\cloudflared.exe tunnel create zerodha-dashboard
```
- Creates permanent tunnel
- Note the tunnel ID displayed

### Step 3: Get Tunnel ID
```powershell
.\cloudflared.exe tunnel list
```
- Find the tunnel ID for "zerodha-dashboard"
- Copy the full tunnel ID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

### Step 4: Create Config File
Create: `C:\Users\vivek\.cloudflared\config.yml`

Replace `<tunnel-id>` with your actual tunnel ID:

```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\vivek\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: zerodhadashboard.duckdns.org
    service: http://localhost:9000
  - service: http_status:404
```

### Step 5: Route DNS
```powershell
.\cloudflared.exe tunnel route dns <tunnel-id> zerodhadashboard.duckdns.org
```

### Step 6: Start Tunnel
```powershell
.\cloudflared.exe tunnel run <tunnel-id>
```

Or in background:
```powershell
Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel","run","<tunnel-id>"
```

### Step 7: Verify
```powershell
Invoke-WebRequest https://zerodhadashboard.duckdns.org/api/zerodha/status
```

## Quick Commands Reference

```powershell
# Login
.\cloudflared.exe tunnel login

# Create tunnel
.\cloudflared.exe tunnel create zerodha-dashboard

# List tunnels (get ID)
.\cloudflared.exe tunnel list

# Route DNS (replace <tunnel-id>)
.\cloudflared.exe tunnel route dns <tunnel-id> zerodhadashboard.duckdns.org

# Run tunnel (replace <tunnel-id>)
.\cloudflared.exe tunnel run <tunnel-id>
```

## After Setup

Once tunnel is running:
1. Test: `https://zerodhadashboard.duckdns.org/api/zerodha/status`
2. Retry OAuth flow from Zerodha
3. Complete authentication

