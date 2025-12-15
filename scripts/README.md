# Scripts

This folder contains utility scripts for deployment and testing.

## Available Scripts

### `run-smoke.sh`
Quick smoke test script to verify backend health and basic functionality.

**Usage:**
```bash
BASE_URL=http://localhost:9000 ./run-smoke.sh
```

### `seed-redis.sh`
Seeds Redis with sample data for testing/demo purposes.

**Usage:**
```bash
REDIS_HOST=localhost REDIS_PORT=6379 ./seed-redis.sh
```

## Notes

- These scripts are optional and mainly for development/testing
- For production deployment, use the deployment guide in `DEPLOYMENT.md`
- Scripts require bash (Linux/Mac) or Git Bash (Windows)


