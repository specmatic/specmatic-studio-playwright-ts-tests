#!/usr/bin/env bash
set -euo pipefail

for url in \
  "http://127.0.0.1:8095/health" \
  "http://127.0.0.1:8090/products" \
  "http://127.0.0.1:8080/health"; do
  echo "Waiting for ${url}"
  for i in $(seq 1 30); do
    if curl -sf "${url}" > /dev/null 2>&1; then
      echo "${url} is up"
      break
    fi
    sleep 4
    if [[ "${i}" -eq 30 ]]; then
      echo "Timed out waiting for ${url}" >&2
      exit 1
    fi
  done
done
