# Deployment Configuration

This note captures the runtime variables you can tweak _without touching code_ before handing the build to a customer. All values live in environment variables (Docker Compose reads them from `.env`, but any host-specific secret manager works equally well).

## Core Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `PUBLIC_TUNNEL_URL` | Base URL exposed by Cloudflare (or any reverse proxy). Example: `https://my-tunnel.trycloudflare.com`. | No trailing slash required; the backend automatically adds `/api/zerodha/callback`. Update this whenever the tunnel hostname changes. |
| `ZERODHA_REDIRECT_URI` | Optional override for the callback URI registered with Zerodha. | Takes priority over `PUBLIC_TUNNEL_URL`. Leave empty to let the backend derive the callback from the tunnel URL. |
| `ZERODHA_API_KEY` / `ZERODHA_API_SECRET` | Zerodha Kite API credentials. | Required for production data. |
| `VITE_BACKEND_BASE_URL` | Frontend → Backend base URL. | For Docker, the default `http://backend:9000` is correct. For local dev, use `http://localhost:9000`. |

## Backend Behaviour

- `public.tunnel.url` (Spring property) binds to `PUBLIC_TUNNEL_URL`.  
- `zerodha.redirect.uri` binds to `ZERODHA_REDIRECT_URI`.  
- The login endpoint resolves the callback in this order: explicit redirect URI → tunnel base URL + `/api/zerodha/callback` → local fallback `http://localhost:9000/api/zerodha/callback`.
- `/api/zerodha/status` always reports the active callback so you can verify after a deploy.

## Docker Compose Quick Start

1. Copy `.env.example` to `.env`.
2. Populate the variables above, plus Redis/Alpha Vantage keys as needed.
3. Launch: `docker compose up -d redis backend frontend`.
4. Start a Cloudflare quick tunnel and set `PUBLIC_TUNNEL_URL` (and the same value inside Zerodha’s developer console).

That’s it—the customer only updates the `.env` file or host env vars; no source edits required. 

