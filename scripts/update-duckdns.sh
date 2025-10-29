#!/bin/bash
# DuckDNS Updater Script for Linux/Mac
# This script updates your DuckDNS domain with your current public IP

DOMAIN="YOUR_DOMAIN_NAME"
TOKEN="YOUR_DUCKDNS_TOKEN"

UPDATE_URL="https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="

echo "Updating DuckDNS for domain: $DOMAIN.duckdns.org"

response=$(curl -s "$UPDATE_URL")

if [ "$response" = "OK" ]; then
    echo "✅ DuckDNS updated successfully!"
    echo "Domain: $DOMAIN.duckdns.org"
else
    echo "❌ DuckDNS update failed: $response"
fi


