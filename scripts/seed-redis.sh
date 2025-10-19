#!/usr/bin/env bash
# seeds a few Redis keys for demo purposes (expects redis-cli available or redis container exposed on localhost:6379)
set -e
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

echo "Seeding Redis on ${REDIS_HOST}:${REDIS_PORT} ..."
# Example key shape — adapt to your app's expected JSON schema
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SET token:NIFTY:1 '{"instrumentToken":"NIFTY:1","timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'","lastPrice":10000}'
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SET token:NIFTY:2 '{"instrumentToken":"NIFTY:2","timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'","lastPrice":10010}'
echo "Seed complete."
