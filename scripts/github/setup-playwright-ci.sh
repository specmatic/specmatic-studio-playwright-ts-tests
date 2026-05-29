#!/usr/bin/env bash
set -euo pipefail

export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-1}"
export CHROME_EXECUTABLE_PATH="${CHROME_EXECUTABLE_PATH:-/usr/bin/google-chrome}"

npm ci
sudo apt-get update
sudo apt-get install -y libxml2-utils
# Install only Linux deps; browser binary comes from the runner image.
npx playwright install-deps chromium
mkdir -p ~/.specmatic
printf '%s' "${SPECMATIC_LICENSE_KEY}" > ~/.specmatic/specmatic-license.txt
