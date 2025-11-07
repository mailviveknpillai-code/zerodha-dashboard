# Cloudflare Tunnel Status & Configuration

## ✅ Current Status: RUNNING

### Temporary Tunnel (Active)
- **Public URL**: `https://analyze-mud-alpine-lead.trycloudflare.com`
- **Local Backend**: `http://localhost:9000`
- **Status**: Connected and operational
- **Type**: Temporary (for testing)

### Tunnel Endpoints
- **Status**: `https://analyze-mud-alpine-lead.trycloudflare.com/api/zerodha/status`
- **Auth URL**: `https://analyze-mud-alpine-lead.trycloudflare.com/api/zerodha/auth-url`
- **Callback**: `https://analyze-mud-alpine-lead.trycloudflare.com/api/zerodha/callback`

## ⚠️ Important Notes

### Temporary Tunnel Limitations
1. **URL Changes**: The temporary tunnel URL changes each time you restart it
2. **Not for Production**: Use only for testing
3. **Uptime**: No guarantee of uptime

### For Production Use
You need to use your DuckDNS domain:
- **Production URL**: `https://zerodhadashboard.duckdns.org`
- **Redirect URI**: `https://zerodhadashboard.duckdns.org/api/zerodha/callback`

## Managing the Tunnel

### Start Tunnel
```powershell
.\scripts\configure-cloudflare-tunnel.ps1 -Action start
```

Or manually:
```powershell
.\cloudflared.exe tunnel --url http://localhost:9000
```

### Stop Tunnel
```powershell
.\scripts\configure-cloudflare-tunnel.ps1 -Action stop
```

Or manually:
```powershell
Get-Process -Name cloudflared | Stop-Process
```

### Check Status
```powershell
.\scripts\configure-cloudflare-tunnel.ps1 -Action status
```

### Restart Tunnel
```powershell
.\scripts\configure-cloudflare-tunnel.ps1 -Action restart
```

## Permanent Tunnel Setup

For production use with your DuckDNS domain, set up a permanent tunnel:

1. **Sign up for Cloudflare** (free):
   https://dash.cloudflare.com/sign-up

2. **Login**:
   ```powershell
   .\cloudflared.exe tunnel login
   ```

3. **Create named tunnel**:
   ```powershell
   .\cloudflared.exe tunnel create zerodha-dashboard
   ```

4. **Configure tunnel**:
   Create config file at: `$env:USERPROFILE\.cloudflared\config.yml`
   ```yaml
   tunnel: zerodha-dashboard
   credentials-file: C:\Users\vivek\.cloudflared\[tunnel-id].json
   
   ingress:
     - hostname: zerodhadashboard.duckdns.org
       service: http://localhost:9000
     - service: http_status:404
   ```

5. **Run permanent tunnel**:
   ```powershell
   .\cloudflared.exe tunnel run zerodha-dashboard
   ```

For detailed instructions:
```powershell
.\scripts\configure-cloudflare-tunnel.ps1 -Action setup-permanent
```

## Testing

### Test Local Backend
```powershell
Invoke-WebRequest http://localhost:9000/api/zerodha/status
```

### Test Public URL (Temporary)
```powershell
Invoke-WebRequest https://analyze-mud-alpine-lead.trycloudflare.com/api/zerodha/status
```

### Test Production URL (DuckDNS)
```powershell
Invoke-WebRequest https://zerodhadashboard.duckdns.org/api/zerodha/status
```

## Zerodha Configuration

Your Zerodha app should use this redirect URI:
```
https://zerodhadashboard.duckdns.org/api/zerodha/callback
```

⚠️ **This URI cannot be changed once set in Zerodha!**

## Troubleshooting

### Tunnel not starting
- Check if backend is running: `Invoke-WebRequest http://localhost:9000/api/zerodha/status`
- Check if cloudflared.exe exists in workspace root
- Check firewall settings

### Can't access public URL
- Wait a few seconds for tunnel to initialize
- Check if tunnel process is running: `Get-Process -Name cloudflared`
- Verify backend is accessible locally

### Need to change port
- Update `application.properties`: `server.port=9000`
- Restart backend
- Restart tunnel with new port

