#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GITHUB_RUN_ID:-}" ]]; then
  echo "GITHUB_RUN_ID is required" >&2
  exit 1
fi

echo "prepared_jar_artifact_name=enterprise-jar-${GITHUB_RUN_ID}" >> "${GITHUB_OUTPUT}"
