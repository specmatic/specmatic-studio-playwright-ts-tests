#!/usr/bin/env bash
set -euo pipefail

echo "127.0.0.1 order-bff order-api inventory-api studio" | sudo tee -a /etc/hosts
cat > /tmp/docker-compose.enterprise-jar.yml <<'EOF'
services:
  order-bff:
    environment:
      KAFKA_BOOTSTRAP_SERVERS: host.docker.internal:9092
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF
