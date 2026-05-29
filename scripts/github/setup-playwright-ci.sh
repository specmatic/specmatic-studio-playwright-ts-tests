#!/usr/bin/env bash
set -euo pipefail

npm ci
sudo apt-get update
sudo apt-get install -y libxml2-utils
# CI uses the runner's preinstalled Chrome channel to avoid Playwright browser extraction stalls.
env DEBUG="${DEBUG:-pw:install}" npx playwright install ffmpeg
mkdir -p ~/.specmatic
printf '%s' "${SPECMATIC_LICENSE_KEY}" > ~/.specmatic/specmatic-license.txt
