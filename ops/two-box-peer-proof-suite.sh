#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "$HOME/dev/void-node"

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

DATASET_ID="$(pick_dataset_id)"
test -n "$DATASET_ID"

echo "=== VOID two-box proof suite ==="
echo "start_ts=$START_TS"
echo "out_dir=$OUT_DIR"
echo "dataset_id=$DATASET_ID"
echo

run_step() {
  local name="$1"
  local script="$2"
  local log="$3"

  echo "=== running: $name ==="
  if DATASET_ID="$DATASET_ID" bash "$script" | tee "$log"; then
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
echo "peer_log=$PEER_LOG"
echo "redundancy_log=$REDUND_LOG"
