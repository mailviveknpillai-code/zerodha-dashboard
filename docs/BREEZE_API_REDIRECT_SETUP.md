# Breeze API Redirect URI Setup Guide

## Problem
The Breeze API redirect URI must be publicly accessible. ICICI's servers need to reach your callback endpoint from the internet.

## ⚠️ IMPORTANT: Port Forwarding is NOT Required!
**New users**: Skip Option 1 and 2 if your ISP blocks ports. Use **Option 3 (Cloud Tunneling)** instead - it's easier and works behind any firewall. See `BREEZE_NO_PORT_FORWARDING_ALTERNATIVES.md` for complete guide.

## Solution Options

### Option 1: Use Your Public IP (Temporary)
If you have a static public IP:

1. Register redirect URI: `http://122.167.184.90:8080/api/breeze/callback`
2. **IMPORTANT**: Ensure port 8080 is open in your firewall
3. **WARNING**: If your IP changes, you'll need to update the redirect URI again

### Option 2: Use a Domain Name (Recommended)
Best for permanent setup:

1. Get a free domain from providers like:
   - Freenom (.tk, .ml, .ga)
   - DuckDNS (oftn.ml, etc.)
   - No-IP
   - Cloudflare

2. Point DNS A record to your public IP (122.167.184.90)

3. Register redirect URI: `https://your-domain.com/api/breeze/callback`

4. Set up port forwarding in your router:
   - External port 8080 → Internal IP port 8080

5. Use HTTPS with Let's Encrypt certificate (optional but recommended)

### Option 3: Use a Cloud Tunneling Service (RECOMMENDED - Easiest for Testing)
**Bypasses ISP firewalls, CGNAT, and port forwarding completely!**

#### A. Cloudflared (Already Installed!)
```powershell
# Run the setup script
.\scripts\setup-cloudflared-tunnel.ps1

# Or manually
.\cloudflared.exe tunnel --url http://localhost:8080

# Use the provided URL: https://your-random.trycloudflare.com
```

Register redirect URI: `https://your-random.trycloudflare.com/api/breeze/callback`

#### B. ngrok (Alternative)
```bash
# Install ngrok
# Windows: Download from https://ngrok.com/download

# Start tunnel
ngrok http 8080

# Use the provided URL: https://your-id.ngrok-free.app
```

Register redirect URI: `https://your-id.ngrok-free.app/api/breeze/callback`

**For production with permanent URLs**, see `BREEZE_NO_PORT_FORWARDING_ALTERNATIVES.md`

## Current Configuration

- Public IP: 122.167.184.90
- Callback endpoint: `/api/breeze/callback`
- Full URL (option 1): `http://122.167.184.90:8080/api/breeze/callback`

## Steps to Update Redirect URI

1. Log into ICICI Direct Breeze API dashboard
2. Find your registered app
3. Edit the redirect/callback URL
4. Save changes

## Testing

After updating redirect URI, test the callback:
```bash
curl "http://YOUR_PUBLIC_URL/api/breeze/callback?apisession=YOUR_SESSION"
```

## Security Considerations

- Use HTTPS if possible
- Keep your API credentials secure
- Don't expose sensitive information in logs
- Consider using environment variables for credentials


