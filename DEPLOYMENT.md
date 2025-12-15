# Deployment Guide

This guide explains how to deploy the Zerodha Trading Dashboard in a customer environment.

## Package Contents

The deployment package contains:
- **Backend JAR**: `backend/dashboard/target/dashboard-app-0.0.1-SNAPSHOT.jar`
- **Frontend Build**: `frontend/dashboard-ui/dist/` (static files)
- **Docker Compose**: `docker-compose.yml` (for containerized deployment)
- **Configuration**: `backend/dashboard/src/main/resources/application.properties`
- **Documentation**: `docs/` folder

## Prerequisites

- **Java 21+** (for running the JAR file)
- **Redis 7.2+** (for caching - can use Docker)
- **Node.js 18+** (optional - only if rebuilding frontend)
- **Docker & Docker Compose** (optional - for containerized deployment)

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Extract the package** to your deployment directory
2. **Configure environment variables**:
   - Edit `docker-compose.yml` or create a `.env` file
   - Set `ZERODHA_API_KEY` and `ZERODHA_API_SECRET`
   - Configure `PUBLIC_TUNNEL_URL` if using a tunnel
   - Set `REDIS_HOST` and `REDIS_PORT` if using external Redis

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Verify deployment**:
   ```bash
   curl http://localhost:9000/api/health
   ```

### Option 2: Standalone JAR Deployment

1. **Start Redis** (if not using Docker):
   ```bash
   redis-server
   ```

2. **Configure application.properties**:
   - Edit `backend/dashboard/src/main/resources/application.properties`
   - Set Zerodha API credentials
   - Configure Redis connection
   - Set server port and other settings

3. **Run the JAR**:
   ```bash
   java -jar backend/dashboard/target/dashboard-app-0.0.1-SNAPSHOT.jar
   ```

4. **Serve frontend** (using any web server):
   - Copy `frontend/dashboard-ui/dist/` to your web server
   - Configure web server to proxy `/api/*` requests to `http://localhost:9000`
   - Or use the built-in static file serving (frontend is included in JAR)

### Option 3: Manual Installation

1. **Extract package** to target directory
2. **Install dependencies**:
   - Install Java 21+
   - Install Redis 7.2+
   - (Optional) Install Node.js if rebuilding frontend

3. **Configure**:
   - Update `application.properties` with your settings
   - Set environment variables as needed

4. **Build** (if needed):
   ```bash
   # Backend
   cd backend/dashboard
   mvn clean package -DskipTests
   
   # Frontend (if rebuilding)
   cd frontend/dashboard-ui
   npm install
   npm run build
   ```

5. **Run**:
   ```bash
   # Start Redis
   redis-server
   
   # Start Backend
   java -jar backend/dashboard/target/dashboard-app-0.0.1-SNAPSHOT.jar
   ```

## Cloudflare Tunnel Setup

If you're using Cloudflare Tunnel for OAuth callbacks, see [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md) for detailed setup instructions.

Quick start:
1. Run `.\start-tunnel.ps1` to start a quick tunnel
2. Copy the tunnel URL
3. Set `PUBLIC_TUNNEL_URL` environment variable or update `docker-compose.yml`
4. Update Zerodha app redirect URI to match

## Configuration

### Essential Configuration

Edit `backend/dashboard/src/main/resources/application.properties`:

```properties
# Zerodha API Configuration
zerodha.enabled=true
zerodha.apikey=YOUR_API_KEY
zerodha.apisecret=YOUR_API_SECRET

# Redis Configuration
spring.data.redis.host=localhost
spring.data.redis.port=6379

# Server Port
server.port=9000

# CORS Configuration
app.cors.allowed-origins=http://localhost:5173
```

### Environment Variables

You can override properties using environment variables:

- `ZERODHA_ENABLED` - Enable/disable Zerodha API
- `ZERODHA_API_KEY` - Zerodha API key
- `ZERODHA_API_SECRET` - Zerodha API secret
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port
- `SERVER_PORT` - Backend server port
- `PUBLIC_TUNNEL_URL` - Public URL for OAuth callbacks
- `ALLOWED_ORIGINS` - CORS allowed origins

## Post-Deployment

1. **Access the dashboard**: Open `http://localhost:9000` (or your configured port)
2. **Login to Zerodha**: Click "Login to Zerodha" and complete OAuth flow
3. **Verify data**: Check that market data is loading correctly

## Troubleshooting

### Backend won't start
- Check Java version: `java -version` (must be 21+)
- Check Redis is running: `redis-cli ping`
- Check port 9000 is available
- Review logs in `backend/dashboard/logs/zerodha-dashboard.log`

### No data showing
- Verify Zerodha login completed successfully
- Check API credentials are correct
- Verify Redis is accessible
- Check backend logs for errors

### Frontend not loading
- Verify frontend files are in `backend/dashboard/src/main/resources/static/`
- Check browser console for errors
- Verify CORS settings allow your origin

## Support

For detailed documentation:
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment Configuration](docs/DEPLOYMENT_CONFIGURATION.md)
- [Security Guide](docs/SECURITY_GUIDE.md)

