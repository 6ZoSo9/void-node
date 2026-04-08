#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "$HOME/dev/void-node"

ALIEN="${ALIEN:-zoso@100.122.79.39}"
WHO="${WHO:-zoso}"
QUICK_MODE="${QUICK_MODE:-0}"
JSON_MODE="${JSON_MODE:-0}"

START_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"

OUT_DIR="${OUT_DIR:-/tmp/void-two-box-proof-suite}"
mkdir -p "$OUT_DIR"

PEER_LOG="$OUT_DIR/peer-fetch-repair.log"
REDUND_LOG="$OUT_DIR/redundancy-check.log"

pick_dataset_id() {
  if [ -n "${DATASET_ID:-}" ]; then
    printf '%s\n' "$DATASET_ID"
    return 0
  fi
  find data_a/datanet_v1/local_jobs -maxdepth 1 -name 'ds_*.txt' | sed 's#.*/##; s#\.txt$##' | sort | tail -n 1
}

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

json_line() {
  python3 - <<'PY'
import json, os
payload = {
  "ok": os.environ.get("JSON_OK", ""),
  "quick_mode": os.environ.get("JSON_QUICK_MODE", ""),
  "start_ts": os.environ.get("JSON_START_TS", ""),
  "end_ts": os.environ.get("JSON_END_TS", ""),
  "elapsed_ms": os.environ.get("JSON_ELAPSED_MS", ""),
  "dataset_id": os.environ.get("JSON_DATASET_ID", ""),
  "local_base": os.environ.get("JSON_LOCAL_BASE", ""),
  "remote_base": os.environ.get("JSON_REMOTE_BASE", ""),
  "peer_log": os.environ.get("JSON_PEER_LOG", ""),
  "redundancy_log": os.environ.get("JSON_REDUND_LOG", ""),
}
print(json.dumps(payload, sort_keys=True))
PY
}

DATASET_ID="$(pick_dataset_id)"
test -n "$DATASET_ID"

LOCAL_BASE="$(pick_local_base)"
REMOTE_BASE="$(pick_remote_base)"

echo "=== VOID two-box proof suite ==="
echo "start_ts=$START_TS"
echo "out_dir=$OUT_DIR"
echo "dataset_id=$DATASET_ID"
echo "local_base=$LOCAL_BASE"
echo "remote_base=$REMOTE_BASE"
echo "quick_mode=$QUICK_MODE"
echo "json_mode=$JSON_MODE"
echo

echo "=== preflight: local health ==="
curl -fsS "${LOCAL_BASE}/health" | jq .
echo
echo "=== preflight: local registry ==="
curl -fsS "${LOCAL_BASE}/peers/registry" | jq .
echo
echo "=== preflight: remote health ==="
ssh "$ALIEN" "set -euo pipefail; curl -fsS '${REMOTE_BASE}/health' | jq ."
echo
echo "=== preflight: remote registry ==="
ssh "$ALIEN" "set -euo pipefail; curl -fsS '${REMOTE_BASE}/peers/registry' | jq ."
echo
echo "=== preflight: remote fetch local dataset ==="
ssh "$ALIEN" "set -euo pipefail; curl -fsS '${LOCAL_BASE}/datanet/v1/local-job/${DATASET_ID}?who=${WHO}' | jq ."
echo

if [ "$QUICK_MODE" = "1" ]; then
  END_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  END_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"
  echo "=== quick summary ==="
  echo "ok=true"
  echo "quick_mode=1"
  echo "start_ts=$START_TS"
  echo "end_ts=$END_TS"
  echo "elapsed_ms=$((END_MS - START_MS))"
  echo "dataset_id=$DATASET_ID"
  echo "local_base=$LOCAL_BASE"
  echo "remote_base=$REMOTE_BASE"
  if [ "$JSON_MODE" = "1" ]; then
    JSON_OK="true" \
    JSON_QUICK_MODE="1" \
    JSON_START_TS="$START_TS" \
    JSON_END_TS="$END_TS" \
    JSON_ELAPSED_MS="$((END_MS - START_MS))" \
    JSON_DATASET_ID="$DATASET_ID" \
    JSON_LOCAL_BASE="$LOCAL_BASE" \
    JSON_REMOTE_BASE="$REMOTE_BASE" \
    JSON_PEER_LOG="" \
    JSON_REDUND_LOG="" \
    json_line
  fi
  exit 0
fi

run_step() {
  local name="$1"
  local script="$2"
  local log="$3"

  echo "=== running: $name ==="
  if DATASET_ID="$DATASET_ID" LOCAL_BASE="$LOCAL_BASE" REMOTE_BASE="$REMOTE_BASE" WHO="$WHO" bash "$script" | tee "$log"; then
    echo "[ok] $name"
  else
    echo "[fail] $name"
    return 1
  fi
  echo
}

run_step "peer-fetch-repair" "ops/two-box-peer-fetch-repair-proof.sh" "$PEER_LOG"
run_step "redundancy-check" "ops/two-box-redundancy-check-proof.sh" "$REDUND_LOG"

END_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
END_MS="$(python3 - <<'PY'
import time
print(int(time.time()*1000))
PY
)"

echo "=== suite summary ==="
echo "ok=true"
echo "start_ts=$START_TS"
echo "end_ts=$END_TS"
echo "elapsed_ms=$((END_MS - START_MS))"
echo "dataset_id=$DATASET_ID"
echo "local_base=$LOCAL_BASE"
echo "remote_base=$REMOTE_BASE"
echo "peer_log=$PEER_LOG"
echo "redundancy_log=$REDUND_LOG"

if [ "$JSON_MODE" = "1" ]; then
  JSON_OK="true" \
  JSON_QUICK_MODE="$QUICK_MODE" \
  JSON_START_TS="$START_TS" \
  JSON_END_TS="$END_TS" \
  JSON_ELAPSED_MS="$((END_MS - START_MS))" \
  JSON_DATASET_ID="$DATASET_ID" \
  JSON_LOCAL_BASE="$LOCAL_BASE" \
  JSON_REMOTE_BASE="$REMOTE_BASE" \
  JSON_PEER_LOG="$PEER_LOG" \
  JSON_REDUND_LOG="$REDUND_LOG" \
  json_line
fi
