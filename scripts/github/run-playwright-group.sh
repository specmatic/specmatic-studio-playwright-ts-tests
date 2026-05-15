#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PLAYWRIGHT_TEST_PATH:-}" ]]; then
  echo "PLAYWRIGHT_TEST_PATH is required" >&2
  exit 1
fi

mkdir -p playwright-report
npx playwright test "${PLAYWRIGHT_TEST_PATH}"
