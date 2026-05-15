#!/usr/bin/env bash
set -euo pipefail

for cname in order-bff order-api inventory-api; do
  if docker ps -a -q -f name="^/${cname}$" | grep .; then
    docker rm -f "${cname}"
  fi
done

docker compose \
  -p specmatic-studio-playwright \
  -f specmatic-studio-demo/docker-compose.yaml \
  -f /tmp/docker-compose.enterprise-jar.yml \
  up -d order-bff order-api inventory-api
