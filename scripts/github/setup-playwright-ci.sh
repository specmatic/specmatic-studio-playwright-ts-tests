#!/usr/bin/env bash
set -euo pipefail

npm ci
sudo apt-get update
sudo apt-get install -y libxml2-utils
npx playwright install chromium --with-deps
mkdir -p ~/.specmatic
printf '%s' "${SPECMATIC_LICENSE_KEY}" > ~/.specmatic/specmatic-license.txt
