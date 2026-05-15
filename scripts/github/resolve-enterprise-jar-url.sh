#!/usr/bin/env bash
set -euo pipefail

resolved_url="$(node utils/specmatic-studio-runtime.js resolved-url | tail -n 1)"
echo "Resolved Enterprise JAR URL: ${resolved_url}"
echo "resolved_artifact_url=${resolved_url}" >> "${GITHUB_OUTPUT}"
