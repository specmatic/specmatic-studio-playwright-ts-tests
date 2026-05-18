#!/usr/bin/env bash
set -euo pipefail

raw_url="${ENTERPRISE_ARTIFACT_URL:-}"

if [[ -z "${raw_url}" ]]; then
  echo "ENTERPRISE_ARTIFACT_URL is required" >&2
  exit 1
fi

if [[ "${raw_url}" == "LATEST" || "${raw_url}" == "LATEST_SNAPSHOT" || "${raw_url}" == "LATEST_RELEASE" ]]; then
  resolved_url="$(node utils/specmatic-studio-runtime.js resolved-url | tail -n 1)"
else
  resolved_url="${raw_url}"
fi

echo "Resolved Enterprise JAR URL: ${resolved_url}"
echo "resolved_artifact_url=${resolved_url}" >> "${GITHUB_OUTPUT}"
