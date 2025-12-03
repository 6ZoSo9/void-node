#!/usr/bin/env bash
set -euo pipefail

HTTP_BASE="${HTTP_BASE:-http://127.0.0.1:4100}"

echo "=== [agent-http-smoke] VOID agent HTTP smoke ==="
echo "[cfg] HTTP_BASE = ${HTTP_BASE}"
echo

# ---------- Step 1: submit a test job ----------
echo "=== [step 1] POST /agent/v0/jobs ==="

JOB_PAYLOAD="$(cat <<'JSON'
{
  "type": "http-smoke-test",
  "payload": {
    "ping": "agent-http-smoke"
  }
}
JSON
)"

JOB_RESP="$(printf '%s\n' "${JOB_PAYLOAD}" | curl -sS -X POST "${HTTP_BASE}/agent/v0/jobs" \
  -H 'Content-Type: application/json' \
  -d @-)"

echo "[jobs] raw response:"
echo "${JOB_RESP}" | jq . 2>/dev/null || echo "${JOB_RESP}"
echo

JOB_OK="$(echo "${JOB_RESP}" | jq -r '.ok // empty' 2>/dev/null || true)"
JOB_ID="$(echo "${JOB_RESP}" | jq -r '.jobId // .id // empty' 2>/dev/null || true)"

if [[ "${JOB_OK}" != "true" || -z "${JOB_ID}" ]]; then
  echo "[jobs] ERROR: job submission did not return ok=true + jobId/id"
  exit 1
fi

echo "[jobs] ok=true, jobId=${JOB_ID}"
echo

# ---------- Step 2: submit a test receipt ----------
echo "=== [step 2] POST /agent/v0/receipt ==="

RECEIPT_ID="http-smoke-${JOB_ID}"
RECEIPT_PAYLOAD="$(cat <<JSON
{
  "id": "${RECEIPT_ID}",
  "status": "ok",
  "outputRef": "local://agent-http-smoke/${JOB_ID}"
}
JSON
)"

RECEIPT_RESP="$(printf '%s\n' "${RECEIPT_PAYLOAD}" | curl -sS -X POST "${HTTP_BASE}/agent/v0/receipt" \
  -H 'Content-Type: application/json' \
  -d @-)"

echo "[receipt] raw response:"
echo "${RECEIPT_RESP}" | jq . 2>/dev/null || echo "${RECEIPT_RESP}"
echo

REC_OK="$(echo "${RECEIPT_RESP}" | jq -r '.ok // empty' 2>/dev/null || true)"
REC_ID="$(echo "${RECEIPT_RESP}" | jq -r '.id // empty' 2>/dev/null || true)"

if [[ "${REC_OK}" != "true" || -z "${REC_ID}" ]]; then
  echo "[receipt] ERROR: receipt submission did not return ok=true + id"
  exit 1
fi

echo "[receipt] ok=true, id=${REC_ID}"
echo
echo "=== [agent-http-smoke] DONE (HTTP surface looks healthy) ==="
