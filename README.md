# Zerodha Trading Dashboard

A real-time derivatives trading dashboard that integrates with Zerodha Kite API to display live market data, options chains, and trading metrics.

## Features

- **Real-time Market Data**: Live derivatives chain data from Zerodha Kite API
- **Options Chain Display**: Comprehensive view of futures, call options, and put options
- **Advanced Metrics**: 
  - Eaten Delta tracking
  - LTP Movement analysis
  - Trend Score calculations
  - Spot LTP Trend monitoring
- **Interactive UI**: Modern React-based dashboard with real-time updates
- **Redis Caching**: Efficient data caching for optimal performance

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Deployment

### Prerequisites

- Java 21 or higher
- Node.js 18+ and npm (for frontend build)
- Redis 7.2+ (for caching)
- Maven 3.8+ (for backend build)

### Quick Start

1. **Build Backend**:
   ```bash
   cd backend/dashboard
   mvn clean package -DskipTests
   ```

2. **Build Frontend**:
   ```bash
   cd frontend/dashboard-ui
   npm install
   npm run build
   ```

3. **Configure Environment**:
   - Copy `backend/dashboard/src/main/resources/application.properties` and update with your Zerodha API credentials
   - Set environment variables as needed (see [docs/DEPLOYMENT_CONFIGURATION.md](docs/DEPLOYMENT_CONFIGURATION.md))

4. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### Customer Deployment

For customer deployment, the application is packaged as:
- **Backend**: JAR file (`dashboard-app-0.0.1-SNAPSHOT.jar`)
- **Frontend**: Static files in `frontend/dashboard-ui/dist/`
- **Configuration**: `application.properties` and `docker-compose.yml`

The customer can:
1. Extract the provided ZIP file
2. Configure environment variables
3. Run the startup scripts provided

## Configuration

See [docs/DEPLOYMENT_CONFIGURATION.md](docs/DEPLOYMENT_CONFIGURATION.md) for detailed configuration options.

### Cloudflare Tunnel

If using Cloudflare Tunnel for OAuth callbacks, see [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md) for setup instructions.

## Security

See [docs/SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md) for security best practices and deployment checklist.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design
- [Deployment Configuration](docs/DEPLOYMENT_CONFIGURATION.md) - Configuration guide
- [Security Guide](docs/SECURITY_GUIDE.md) - Security practices
- [Feature Documentation](docs/) - Detailed feature documentation

## Feature Documentation

- [Eaten Delta Window Fix](docs/EATEN_DELTA_WINDOW_FIX.md)
- [LTP Movement Calculation](docs/LTP_MOVEMENT_CALCULATION_EXAMPLE.md)
- [LTP Movement Tracker Logic](docs/LTP_MOVEMENT_TRACKER_LOGIC.md)
- [Trend Score Calculation](docs/TREND_SCORE_CALCULATION_LOGIC.md)
- [Price Tracking Implementation](docs/PRICE_TRACKING_IMPLEMENTATION.md)
- [Mock Data Testing](docs/MOCK_DATA_TESTING.md)
- [Independent Microservices Architecture](docs/INDEPENDENT_MICROSERVICES_ARCHITECTURE.md)

## License

Proprietary - All rights reserved

