#!/usr/bin/env bash
set -euo pipefail

SAFE_URL="${SAFE_URL:-http://127.0.0.1:4104}"

echo "[safeboot-health-v2] SAFE_URL=${SAFE_URL}"
echo

# Helper: pretty-print a curl or mark failure
probe() {
  local label="$1"
  local url="$2"

  echo ">>> ${label} (${url})"
  if ! out=$(curl -fsS "${url}" 2>/dev/null); then
    echo "  (FAIL: curl error)"
    echo
    return 1
  fi

  case "${label}" in
    head.txt)
      echo "  ${out}"
      ;;
    metrics_head)
      echo "  $(printf '%s\n' "${out}" | grep -E '^(#|void_head_number)' || true)"
      ;;
    header3_prom)
      echo "  $(printf '%s\n' "${out}" | grep -E '^(#|void_header3_(match|last_number|last_mismatch))' || true)"
      ;;
    txroot_health_prom)
      echo "  $(printf '%s\n' "${out}" | grep -E '^(#|void_txroot_health)' || true)"
      ;;
    *)
      echo "  ${out}"
      ;;
  esac

  echo
}

fail=0

# 1) head.txt
if ! probe "head.txt" "${SAFE_URL}/head.txt"; then
  fail=1
fi

# 2) metrics/void/head
if ! probe "metrics_head" "${SAFE_URL}/metrics/void/head"; then
  fail=1
fi

# 3) header3 exporter (if present on this build)
if ! probe "header3_prom" "${SAFE_URL}/__void/metrics/header3.prom"; then
  echo "  (note: header3 exporter may not be wired in this safeboot node yet)"
  echo
fi

# 4) txroot health prom text (if present on this build)
if ! probe "txroot_health_prom" "${SAFE_URL}/health/txroot3?format=prom"; then
  echo "  (note: txroot health prom exporter may not be wired in this safeboot node yet)"
  echo
fi

echo "[safeboot-health-v2] RESULT:"
if [ "${fail}" -ne 0 ]; then
  echo "  BAD (one or more core probes failed)"
  exit 1
else
  echo "  OK (head + metrics/void/head reachable on safeboot)"
fi
