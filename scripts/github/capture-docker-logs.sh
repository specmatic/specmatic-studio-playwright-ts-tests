#!/usr/bin/env bash
set -euo pipefail

mkdir -p docker-logs-workdir
for cname in studio order-bff order-api inventory-api; do
  if docker ps -a -q -f name="^/${cname}$" | grep .; then
    docker logs "${cname}" > "docker-logs-workdir/${cname}.log" 2>&1 || true
  fi
done
