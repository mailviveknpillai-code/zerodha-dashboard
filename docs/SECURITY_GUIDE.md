# Security Guide

This document complements the architecture overview and captures the decisions introduced during the hardening phase. Use it as a deployment checklist before exposing the dashboard outside a trusted network.

## 1. Secrets & Environment Variables

Backend (`backend/dashboard`):
- `ZERODHA_APIKEY`, `ZERODHA_APISECRET` – Kite API credentials. Store in a secret manager or CI/CD variable store. Never commit to git.
- `ZERODHA_ACCESS_TOKEN` – short-lived session token issued after OAuth. Inject via environment or Redis bootstrap script.
- `BREEZE_API_ENABLED`, `ZERODHA_ENABLED`, `MOCK_DATA_ENABLED` – toggle data sources explicitly per environment.
- `APP_CORS_ALLOWED_ORIGINS`, `APP_CORS_ALLOWED_METHODS`, `APP_CORS_ALLOWED_HEADERS`, `APP_CORS_ALLOW_CREDENTIALS`, `APP_CORS_MAX_AGE` – restrict CORS at the edge. For production set origins to the canonical HTTPS host.

Frontend (`frontend/dashboard-ui`):
- `VITE_API_BASE_URL` – point to the HTTPS endpoint exposed by the tunnel / reverse proxy.
- `VITE_PUBLIC_TUNNEL_NAME` – used for UI labels; ensure it matches the issued tunnel or leave blank to hide the badge.

Recommended storage pattern:
1. Maintain `.env.example` files (sanitised) describing required keys.
2. Load real values via `.env.local`, Docker secrets, or platform-specific secret stores (AWS Parameter Store, Azure Key Vault, 1Password, etc.).
3. Grant read access on a least-privilege basis (backend service account only needs API tokens and Redis credentials).

## 2. HTTPS & Tunnel Configuration

The dashboard defaults to running behind a tunnel or reverse proxy. Follow these guardrails:

### Cloudflare Tunnel (reference implementation)
1. Authenticate `cloudflared` with your Cloudflare account.
2. Create a named tunnel **per environment** (e.g., `dash-prod`, `dash-staging`). Store the tunnel credentials file outside of source control.
3. Map the tunnel to the local backend port (`http://localhost:8080`).
4. Set `PUBLIC_TUNNEL_URL=https://dash-prod.example.com` so both backend and frontend display the correct endpoint.
5. Enable Cloudflare features: Always Use HTTPS, HTTP/2, TLS 1.2+, and WAF rules blocking origins outside your deployment region.

### Self-managed reverse proxy
- Terminate TLS at Nginx/Traefik using certificates from Let’s Encrypt or your internal PKI.
- Whitelist the frontend origin via the new CORS settings.
- Forward only the `/api/**` prefix to the backend; serve static assets separately to minimise attack surface.

## 3. Input Validation & Rate Limits

- Public controllers now validate `underlying` and `segment` parameters. Do not bypass these helpers when adding new endpoints—reuse the sanitizer methods to keep constraints consistent.
- Configure upstream rate limiting (Cloudflare WAF, Nginx `limit_req`, API gateway) to mitigate credential stuffing and token brute-force attacks.

## 4. Deployment Checklist

| Task | Status | Notes |
| --- | --- | --- |
| Secrets stored in encrypted manager | □ | Verify rotation policy; audit access logs quarterly. |
| `.env` committed to git ignored | □ | Ensure `.gitignore` covers `.env*`, tunnel credential files. |
| TLS terminates at tunnel/reverse proxy | □ | Confirm A+ on SSL Labs or internal scanner. |
| CORS restricted to production origin | □ | Set `APP_CORS_ALLOWED_ORIGINS` and test with curl from disallowed host. |
| Backend reachable only via proxy/tunnel | □ | Block direct ingress at firewall / security group. |
| Monitoring & alerts configured | □ | Capture 5xx responses, Zerodha token refresh failures, tunnel disconnect events. |

Keep this checklist with your runbooks and update it whenever a new integration or deployment pattern is introduced.













