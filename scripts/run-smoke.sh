#!/usr/bin/env bash
# quick smoke script to check backend health and a sample snapshot endpoint
set -e
BASE_URL=${BASE_URL:-http://localhost:8080}
echo "Checking health at ${BASE_URL}/actuator/health"
curl -fsS ${BASE_URL}/actuator/health || { echo "health check failed"; exit 2; }
echo
echo "Fetching example snapshot (token path may vary):"
curl -fsS ${BASE_URL}/api/v1/snapshots/token/NIFTY || echo "snapshot endpoint returned non-200"
echo
echo "Smoke checks done."
