#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_BASE="${LOCAL_BASE:-}"
REMOTE_BASE="${REMOTE_BASE:-}"
WHO="${WHO:-zoso}"

cd "$HOME/dev/void-node"

pick_local_base() {
  if [ -n "${LOCAL_BASE:-}" ]; then
    printf '%s\n' "$LOCAL_BASE"
    return 0
  fi

  if [ -n "${PUBLIC_HTTP_BASE:-}" ]; then
    if curl -fsS --max-time 3 "${PUBLIC_HTTP_BASE}/health" >/dev/null 2>&1; then
      printf '%s\n' "$PUBLIC_HTTP_BASE"
      return 0
    fi
  fi

  if command -v systemctl >/dev/null 2>&1; then
    ENV_LINE="$(systemctl --user show void-node.service --property=Environment --no-pager 2>/dev/null || true)"
    PUB="$(printf '%s\n' "$ENV_LINE" | sed -n 's/.*PUBLIC_HTTP_BASE=\([^ ]*\).*/\1/p' | head -n 1)"
    if [ -n "$PUB" ]; then
      if curl -fsS --max-time 3 "${PUB}/health" >/dev/null 2>&1; then
        printf '%s\n' "$PUB"
        return 0
      fi
    fi
  fi

  if command -v tailscale >/dev/null 2>&1; then
    TS_IP="$(tailscale ip -4 2>/dev/null | head -n 1 || true)"
    if [ -n "$TS_IP" ]; then
      TS_BASE="http://${TS_IP}:4100"
      if curl -fsS --max-time 3 "${TS_BASE}/health" >/dev/null 2>&1; then
        printf '%s\n' "$TS_BASE"
        return 0
      fi
    fi
  fi

  for base in "http://127.0.0.1:4100" "http://localhost:4100"; do
    if curl -fsS --max-time 3 "${base}/health" >/dev/null 2>&1; then
      printf '%s\n' "$base"
      return 0
    fi
  done

  printf '%s\n' "http://127.0.0.1:4100"
}

LOCAL_BASE="$(pick_local_base)"
echo "[info] LOCAL_BASE=${LOCAL_BASE}"

pick_remote_base() {
  if [ -n "${REMOTE_BASE:-}" ]; then
    printf '%s\n' "$REMOTE_BASE"
    return 0
  fi

  local guessed=""
  guessed="$(ssh "$ALIEN" 'TS_IP_REMOTE="$(tailscale ip -4 | head -n 1 || true)"; if [ -n "$TS_IP_REMOTE" ]; then printf "http://%s:4100\n" "$TS_IP_REMOTE"; fi' 2>/dev/null || true)"
  if [ -n "$guessed" ]; then
    printf '%s\n' "$guessed"
    return 0
  fi

  printf '%s\n' "http://127.0.0.1:4100"
}

REMOTE_BASE="$(pick_remote_base)"
echo "[info] REMOTE_BASE=${REMOTE_BASE}"

DATASET_ID="${DATASET_ID:-}"
if [ -z "$DATASET_ID" ]; then
  DATASET_ID="$(find data_a/datanet_v1/local_jobs -maxdepth 1 -name 'ds_*.txt' | sed 's#.*/##; s#\.txt$##' | sort | tail -n 1)"
fi
test -n "$DATASET_ID"

LOCAL_FILE="data_a/datanet_v1/local_jobs/${DATASET_ID}.txt"
test -f "$LOCAL_FILE"

LOCAL_SHA="$(sha256sum "$LOCAL_FILE" | awk '{print $1}')"
NOW_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"
JOB_ID="job_remote_fetch_verify_proof_${NOW_MS}"

JOB_JSON="$(python3 - <<PY
import json
job = {
  "job_id": "${JOB_ID}",
  "account": "two-box-fetch-verify-proof",
  "kind": "datanet_fetch_verify",
  "status": "queued",
  "input": {
    "plaintext": json.dumps({
      "dataset_id": "${DATASET_ID}",
      "expected_input_hash": "${LOCAL_SHA}",
      "stale_for_ms": 600000,
      "difficulty_bucket": "high",
      "network_need_score": 0.9
    }, separators=(",", ":"))
  },
  "selection_reason": "two_box_peer_fetch_repair_proof",
  "selected_task_class": "datanet_fetch_verify",
  "selected_dataset_id": "${DATASET_ID}",
  "selected_difficulty_bucket": "high",
  "selected_network_need_score": 0.9,
  "selected_stale_for_ms": 600000,
  "safe_mode": False,
  "created_at_ms": ${NOW_MS},
  "id": "${JOB_ID}"
}
print(json.dumps(job, separators=(",", ":")))
PY
)"

echo "=== [1] local truth ==="
echo "dataset_id=$DATASET_ID"
echo "job_id=$JOB_ID"
echo "local_sha=$LOCAL_SHA"
curl -fsS "${LOCAL_BASE}/datanet/v1/local-job/${DATASET_ID}?who=${WHO}" | jq .

echo
echo "=== [2] remote remove dataset and queue proof job ==="
ssh "$ALIEN" "
set -euo pipefail
cd \$HOME/dev/void-node
REMOTE_FILE=\$HOME/dev/void-node/data_a/datanet_v1/local_jobs/${DATASET_ID}.txt
rm -f \"\$REMOTE_FILE\"
test ! -f \"\$REMOTE_FILE\"
printf '%s\n' '$JOB_JSON' >> data_a/jobs_v1/jobs.jsonl
echo '[ok] queued proof job and removed remote dataset'
tail -n 1 data_a/jobs_v1/jobs.jsonl
"

echo
echo "=== [3] wait for remote worker ==="
sleep "${WAIT_SECS:-10}"

echo
echo "=== [4] remote job_state proof ==="
ssh "$ALIEN" "
set -euo pipefail
cd \$HOME/dev/void-node
grep -n '${JOB_ID}' data_a/agent_v1/job_state.jsonl || true
"

echo
echo "=== [5] remote receipt proof ==="
ssh "$ALIEN" "
set -euo pipefail
cd \$HOME/dev/void-node
grep -n '${JOB_ID}' data_a/agent_v1/receipts.jsonl || true
"

echo
echo "=== [6] remote repaired file hash ==="
REMOTE_HASH="$(
ssh "$ALIEN" "
set -euo pipefail
REMOTE_FILE=\$HOME/dev/void-node/data_a/datanet_v1/local_jobs/${DATASET_ID}.txt
test -f \"\$REMOTE_FILE\"
sha256sum \"\$REMOTE_FILE\" | awk '{print \$1}'
"
)"
echo "remote_sha=${REMOTE_HASH}"

echo
echo "=== [7] local hash again ==="
echo "local_sha=${LOCAL_SHA}"

echo
echo "=== [8] remote worker diag ==="
ssh "$ALIEN" "
set -euo pipefail
curl -fsS ${REMOTE_BASE}/__void/diag/jobs-and-datanet-worker-v1.json | jq .
"

echo
echo "=== [9] assert hash match ==="
test "$REMOTE_HASH" = "$LOCAL_SHA"
echo "[ok] peer fetch repair proof passed"
