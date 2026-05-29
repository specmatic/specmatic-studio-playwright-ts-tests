#!/usr/bin/env bash
set -euo pipefail

npm ci
sudo apt-get update
sudo apt-get install -y libxml2-utils
# CI runs headless Chromium only, so avoid downloading the full headed browser.
env DEBUG="${DEBUG:-pw:install}" npx playwright install --with-deps --only-shell chromium
mkdir -p ~/.specmatic
printf '%s' "${SPECMATIC_LICENSE_KEY}" > ~/.specmatic/specmatic-license.txt
