#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ENTERPRISE_ARTIFACT_URL:-}" ]]; then
  echo "ENTERPRISE_ARTIFACT_URL is required" >&2
  exit 1
fi

mkdir -p temp
jar_file_name="$(basename "${ENTERPRISE_ARTIFACT_URL%%\?*}")"

if [[ -z "${jar_file_name}" || "${jar_file_name}" != *.jar ]]; then
  echo "Could not derive jar filename from ${ENTERPRISE_ARTIFACT_URL}" >&2
  exit 1
fi

curl -L --fail --retry 3 --retry-delay 2 \
  "${ENTERPRISE_ARTIFACT_URL}" \
  -o "temp/${jar_file_name}"
