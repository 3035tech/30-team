#!/usr/bin/env bash
# OWASP ZAP baseline scan against a running 30Team instance (staging recommended).
# Requires Docker. Does NOT mutate data — read-only spider + passive rules.
#
# Usage:
#   BASE_URL=https://staging.example.com ./scripts/security-zap-baseline.sh
#   BASE_URL=http://127.0.0.1:3010 ./scripts/security-zap-baseline.sh
#
# Reports: test/security/zap-report.html (gitignored if present)

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3010}"
REPORT_DIR="$(cd "$(dirname "$0")/.." && pwd)/test/security"
REPORT_FILE="${REPORT_DIR}/zap-report.html"

mkdir -p "$REPORT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker required for OWASP ZAP baseline scan." >&2
  exit 1
fi

echo "ZAP baseline → ${BASE_URL}"
echo "Report → ${REPORT_FILE}"

docker run --rm \
  -v "${REPORT_DIR}:/zap/wrk:rw" \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t "${BASE_URL}" \
  -r zap-report.html \
  -I

echo "Done. Open ${REPORT_FILE}"
