# Configuration Analysis & Setup Guide

## What Was Deleted

Based on the codebase analysis and git history:

1. **`backend/dashboard/src/main/resources/application.properties`** - This file was deleted (likely contained API keys and was removed for security)
2. **`docker-compose.yml`** - The original version was deleted and replaced with a new one

## Current Configuration Approach

The application now uses **environment variables** with `@Value` annotations that have defaults. This is a more secure approach as it avoids committing sensitive data.

## Required Environment Variables

### Backend Configuration

The application uses the following environment variables (all have defaults, so the app can start without them):

#### Zerodha API Configuration
- `ZERODHA_ENABLED` (default: `false`) - Enable/disable Zerodha API integration
- `ZERODHA_API_KEY` (default: empty) - Zerodha API key
- `ZERODHA_API_SECRET` (default: empty) - Zerodha API secret
- `ZERODHA_REDIRECT_URI` (default: empty) - OAuth redirect URI
- `ZERODHA_ACCESS_TOKEN` (default: empty) - Access token (if already obtained)

#### Server Configuration
- `SERVER_PORT` (default: Spring Boot default `8080`) - Backend server port
- `SPRING_DATA_REDIS_HOST` (default: `localhost`) - Redis host
- `SPRING_DATA_REDIS_PORT` (default: `6379`) - Redis port

#### CORS Configuration
- `APP_CORS_ALLOWED_ORIGINS` (default: `http://localhost:5173`) - Allowed CORS origins (comma-separated)
- `APP_CORS_ALLOWED_METHODS` (default: `GET,POST,PUT,OPTIONS`)
- `APP_CORS_ALLOWED_HEADERS` (default: `Content-Type,Authorization`)
- `APP_CORS_ALLOW_CREDENTIALS` (default: `false`)
- `APP_CORS_MAX_AGE` (default: `3600`)

#### Cache Configuration
- `CACHE_UPDATE_ENABLED` (default: `true`) - Enable cache updates
- `CACHE_UPDATE_INTERVAL_MS` (default: `1000`) - Cache update interval in milliseconds
- `REDIS_SNAPSHOT_TTL` (default: `PT5M`) - Redis snapshot TTL (ISO-8601 duration)
- `REDIS_NAMESPACE` (default: `zerodha:snapshot:`) - Redis key namespace

#### Logging Configuration
- `APP_LOGGING_ENABLED` (default: `true`) - Enable application logging
- `APP_LOGGING_DIRECTORY` (default: `logs`) - Log directory

#### Mock Data Configuration (for testing)
- `MOCK_DATA_ENABLED` (default: `false`) - Enable mock data
- `MOCK_DATA_SPOT_PRICE` (default: `25000`) - Mock spot price
- `MOCK_DATA_UNDERLYING` (default: `NIFTY`) - Mock underlying symbol

#### Tunnel/Public URL
- `PUBLIC_TUNNEL_URL` (default: empty) - Public tunnel URL for OAuth callbacks

## Docker Compose Configuration

The **original** `docker-compose.yml` (now restored) includes:
- **Redis service** - Port 6379, static IP 172.20.0.10
- **Backend service** - Port 9000, static IP 172.20.0.20, builds from `./backend` with `dashboard/Dockerfile`
- **Frontend service** - Port 5173 (mapped to container port 80), static IP 172.20.0.30
- **Frontend Dev service** - Port 5174, static IP 172.20.0.40 (hot reload for development)
- **Cloudflare Tunnel service** - For remote access
- **Backend Test service** - For running tests, static IP 172.20.0.50

### Key Features of Original docker-compose.yml

1. **Custom Network with Static IPs**: Uses subnet 172.20.0.0/16 with static IP addresses for each service
2. **Multiple Services**: Includes development and testing services
3. **Breeze API Support**: Includes Breeze API configuration (disabled by default, using Zerodha instead)
4. **Environment Variables**: Uses `REDIS_HOST` and `REDIS_PORT` (in addition to Spring Boot properties)

### Environment Variables in Docker Compose

The docker-compose.yml uses environment variable substitution:
```yaml
environment:
  # Redis Configuration
  REDIS_HOST: redis
  REDIS_PORT: 6379
  SERVER_PORT: 9000
  
  # Breeze API (DISABLED - Using Zerodha instead)
  BREEZE_API_ENABLED: "${BREEZE_API_ENABLED:-false}"
  BREEZE_API_APPKEY: "${BREEZE_API_APPKEY:-...}"
  BREEZE_API_SECRETKEY: "${BREEZE_API_SECRETKEY:-...}"
  BREEZE_API_SESSIONTOKEN: "${BREEZE_API_SESSIONTOKEN:-...}"
  BREEZE_API_STATIC_IP: "122.167.184.90"
  BREEZE_API_NETWORK_INTERFACE: "eth0"
  
  # Zerodha Kite API (ENABLED - Primary API)
  ZERODHA_ENABLED: "${ZERODHA_ENABLED:-true}"
  ZERODHA_API_KEY: "${ZERODHA_API_KEY:-...}"
  ZERODHA_API_SECRET: "${ZERODHA_API_SECRET:-...}"
  PUBLIC_TUNNEL_URL: "${PUBLIC_TUNNEL_URL:-...}"
  ZERODHA_REDIRECT_URI: "${ZERODHA_REDIRECT_URI:-...}"
  
  # CORS Configuration
  ALLOWED_ORIGINS: "${ALLOWED_ORIGINS:-http://localhost:5173,...}"
  
  # Mock Data Configuration
  MOCK_DATA_ENABLED: "${MOCK_DATA_ENABLED:-false}"
  MOCK_SPOT_PRICE: "${MOCK_SPOT_PRICE:-25000}"
  MOCK_UNDERLYING: "${MOCK_UNDERLYING:-NIFTY}"
```

## How to Start the Application

### Option 1: Using Docker Compose (Recommended)

1. **Set environment variables** (create a `.env` file in the root directory):
```bash
ZERODHA_ENABLED=true
ZERODHA_API_KEY=your_api_key_here
ZERODHA_API_SECRET=your_api_secret_here
ZERODHA_REDIRECT_URI=https://your-tunnel-url.com/api/zerodha/callback
PUBLIC_TUNNEL_URL=https://your-tunnel-url.com
ALLOWED_ORIGINS=http://localhost:5173,https://your-tunnel-url.com

# Optional: Breeze API (disabled by default)
BREEZE_API_ENABLED=false

# Optional: Mock Data (disabled when Zerodha is enabled)
MOCK_DATA_ENABLED=false
```

2. **Start services**:
```bash
# Start all services
docker compose up -d

# Or start specific services
docker compose up -d redis backend frontend

# For development with hot reload
docker compose up -d redis backend frontend-dev

# For testing
docker compose up -d redis backend-test
```

3. **Check health**:
```bash
# Backend health
curl http://localhost:9000/api/zerodha/status

# Frontend (production)
curl http://localhost:5173/

# Frontend (development)
curl http://localhost:5174/
```

4. **Access the application**:
- **Production Frontend**: http://localhost:5173
- **Development Frontend**: http://localhost:5174 (with hot reload)
- **Backend API**: http://localhost:9000

### Option 2: Local Development (Without Docker)

1. **Start Redis** (if not using Docker):
```bash
redis-server
# or
docker run -d -p 6379:6379 redis:7.2.5-alpine
```

2. **Set environment variables** (PowerShell):
```powershell
$env:SPRING_DATA_REDIS_HOST="localhost"
$env:SPRING_DATA_REDIS_PORT="6379"
$env:SERVER_PORT="9000"
$env:ZERODHA_ENABLED="false"
$env:APP_CORS_ALLOWED_ORIGINS="http://localhost:5173"
```

3. **Build and run backend**:
```bash
cd backend
mvn clean package -DskipTests
java -jar dashboard/target/*.jar
```

4. **Run frontend** (separate terminal):
```bash
cd frontend/dashboard-ui
npm install
npm run dev
```

## Configuration Mapping

### Spring Boot Property → Environment Variable

| Spring Property | Environment Variable | Default Value |
|----------------|---------------------|---------------|
| `zerodha.enabled` | `ZERODHA_ENABLED` | `false` |
| `zerodha.apikey` | `ZERODHA_API_KEY` | (empty) |
| `zerodha.apisecret` | `ZERODHA_API_SECRET` | (empty) |
| `zerodha.redirect.uri` | `ZERODHA_REDIRECT_URI` | (empty) |
| `zerodha.access.token` | `ZERODHA_ACCESS_TOKEN` | (empty) |
| `server.port` | `SERVER_PORT` | `8080` |
| `spring.data.redis.host` | `SPRING_DATA_REDIS_HOST` | `localhost` |
| `spring.data.redis.port` | `SPRING_DATA_REDIS_PORT` | `6379` |
| `app.cors.allowed-origins` | `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:5173` |
| `cache.update.enabled` | `CACHE_UPDATE_ENABLED` | `true` |
| `cache.update.interval.ms` | `CACHE_UPDATE_INTERVAL_MS` | `1000` |
| `redis.snapshot.ttl` | `REDIS_SNAPSHOT_TTL` | `PT5M` |
| `redis.namespace` | `REDIS_NAMESPACE` | `zerodha:snapshot:` |
| `app.logging.enabled` | `APP_LOGGING_ENABLED` | `true` |
| `app.logging.directory` | `APP_LOGGING_DIRECTORY` | `logs` |
| `mock.data.enabled` | `MOCK_DATA_ENABLED` | `false` |
| `public.tunnel.url` | `PUBLIC_TUNNEL_URL` | (empty) |

## Notes

1. **No application.properties needed**: The application can run entirely on environment variables with sensible defaults.

2. **Security**: Never commit API keys or secrets. Use environment variables or `.env` files (which should be in `.gitignore`).

3. **Redis is required**: The application requires Redis to be running. It's used for caching derivatives data.

4. **Port configuration**: 
   - Backend default: `8080` (but docker-compose uses `9000`)
   - Frontend: `80` (in docker) or `5173` (dev server)
   - Redis: `6379`

5. **CORS**: Make sure `APP_CORS_ALLOWED_ORIGINS` includes your frontend URL.

## Troubleshooting

### Backend won't start
- Check if Redis is running: `redis-cli ping` should return `PONG`
- Check if port 9000 (or 8080) is available
- Check logs: `backend/dashboard/logs/zerodha-dashboard.log`

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` in frontend build matches backend URL
- Check CORS configuration includes frontend origin
- Verify backend is running and accessible

### Redis connection errors
- Verify Redis is running: `docker ps` or `redis-cli ping`
- Check `SPRING_DATA_REDIS_HOST` and `SPRING_DATA_REDIS_PORT` environment variables
- For Docker, use service name `redis` as hostname

