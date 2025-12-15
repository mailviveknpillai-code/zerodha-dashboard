# Cloudflare Tunnel Setup

This application uses Cloudflare Tunnel for OAuth callbacks with Zerodha API. This document explains how to set up and manage the tunnel.

## Prerequisites

- `cloudflared.exe` - Cloudflare tunnel executable (should be in project root)
- Cloudflare account (optional - for permanent tunnels)

## Quick Start

### Option 1: Quick Tunnel (Temporary)

1. **Start the tunnel**:
   ```powershell
   .\start-tunnel.ps1
   ```

2. **Copy the tunnel URL** (e.g., `https://xxxxx.trycloudflare.com`)

3. **Update configuration**:
   - Set `PUBLIC_TUNNEL_URL` environment variable
   - Or update `docker-compose.yml`:
     ```yaml
     PUBLIC_TUNNEL_URL: "https://xxxxx.trycloudflare.com"
     ```

4. **Update Zerodha App Settings**:
   - Go to Zerodha Developer Console
   - Update redirect URI to: `https://xxxxx.trycloudflare.com/api/zerodha/callback`

### Option 2: Permanent Tunnel

For production use, set up a permanent Cloudflare tunnel:

1. **Authenticate with Cloudflare**:
   ```powershell
   .\cloudflared.exe tunnel login
   ```

2. **Create a named tunnel**:
   ```powershell
   .\cloudflared.exe tunnel create zerodha-dashboard
   ```

3. **Configure tunnel** (create `config.yml`):
   ```yaml
   tunnel: zerodha-dashboard
   credentials-file: C:\path\to\credentials.json
   
   ingress:
     - hostname: your-domain.example.com
       service: http://localhost:9000
     - service: http_status:404
   ```

4. **Run tunnel**:
   ```powershell
   .\cloudflared.exe tunnel run zerodha-dashboard
   ```

## Configuration

The tunnel URL must be configured in:

1. **Environment Variable**: `PUBLIC_TUNNEL_URL`
2. **Docker Compose**: `PUBLIC_TUNNEL_URL` in `docker-compose.yml`
3. **Application Properties**: `public.tunnel.url` in `application.properties`

## Important Notes

- **Quick tunnels** are temporary and change on restart
- **Permanent tunnels** require Cloudflare account and domain
- The tunnel URL must match the redirect URI in Zerodha app settings
- CORS settings must include the tunnel URL in `ALLOWED_ORIGINS`

## Troubleshooting

### Tunnel won't start
- Verify `cloudflared.exe` exists and is executable
- Check if port 9000 is accessible
- Ensure no firewall is blocking the connection

### OAuth callback fails
- Verify `PUBLIC_TUNNEL_URL` matches the actual tunnel URL
- Check Zerodha app settings have correct redirect URI
- Ensure CORS allows the tunnel origin

### URL changes on restart
- Use a permanent tunnel instead of quick tunnel
- Or update `PUBLIC_TUNNEL_URL` each time you restart

## Scripts

- `start-tunnel.ps1` - Start quick tunnel
- `start-tunnel-capture.ps1` - Start tunnel and log URL to file


