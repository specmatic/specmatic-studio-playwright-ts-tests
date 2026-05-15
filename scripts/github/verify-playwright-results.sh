#!/usr/bin/env bash
set -euo pipefail

REPORT_PATH="playwright-report/junit-report.xml"
PLAYWRIGHT_OUTCOME="${PLAYWRIGHT_OUTCOME:-}"

if [[ ! -f "${REPORT_PATH}" ]]; then
  echo "JUnit report not found at ${REPORT_PATH}" >&2
  exit 1
fi

TOTAL="$(xmllint --xpath 'string(sum(//testsuite/@tests))' "${REPORT_PATH}")"
FAILURES="$(xmllint --xpath 'string(sum(//testsuite/@failures))' "${REPORT_PATH}")"
ERRORS="$(xmllint --xpath 'string(sum(//testsuite/@errors))' "${REPORT_PATH}")"

if [[ "${PLAYWRIGHT_OUTCOME}" != "success" && "${FAILURES}" == "0" && "${ERRORS}" == "0" ]]; then
  echo "Playwright step failed before recording test failures. This usually means setup/global setup failed." >&2
  exit 1
fi

if [[ "${TOTAL}" == "0" ]]; then
  echo "No tests were recorded in ${REPORT_PATH}. Treating this as a setup failure." >&2
  exit 1
fi

if [[ "${FAILURES}" != "0" || "${ERRORS}" != "0" ]]; then
  echo "Test failures or errors detected across all suites: failures=${FAILURES}, errors=${ERRORS}" >&2
  exit 1
fi

echo "No test failures or errors detected. tests=${TOTAL}"
