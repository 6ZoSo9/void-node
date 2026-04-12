#!/usr/bin/env bash
# Canonical broader two-box product gate.
# Runs canonical participant/DataNet proofs plus wallet/trade proofs on
# matched local/remote code for the current two-box product surface.
set -euo pipefail
set +H
set +o histexpand

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/two-box-post-ui-trade-gate-$TS"
mkdir -p "$OUT"

run_step() {
  local name="$1"
  local cmd="$2"
  local log="$OUT/$name.log"
  echo
  echo "=== [$name] begin ==="
  echo "[cmd] $cmd"
  bash -lc "$cmd" | tee "$log"
  local rc="${PIPESTATUS[0]}"
  if [ "$rc" -ne 0 ]; then
    echo "[fail] $name rc=$rc"
    echo "[log] $log"
    exit "$rc"
  fi
  echo "[ok] $name"
  echo "[log] $log"
}

echo "=== canonical gate baseline ==="
git branch --show-current
git rev-parse --short HEAD
git describe --tags --abbrev=0 2>/dev/null || true

echo
echo "=== local node preflight ==="
systemctl --user restart void-node.service
sleep 8
curl -fsS --max-time 20 http://127.0.0.1:4100/health > "$OUT/local.health.preflight.json"
cat "$OUT/local.health.preflight.json"

LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"
PUBLIC_LOCAL_NODE_BASE="${PUBLIC_LOCAL_NODE_BASE:-http://100.93.2.116:4100}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
REMOTE_BASE="${REMOTE_BASE:-http://100.122.79.39:4100}"

run_step "participant_datanet_e2e" "LOCAL_NODE_BASE='$LOCAL_NODE_BASE' PUBLIC_LOCAL_NODE_BASE='$PUBLIC_LOCAL_NODE_BASE' REMOTE_NODE_BASE='$REMOTE_NODE_BASE' bash ops/two-box-participant-datanet-e2e-proof.sh"
# canonical participant-facing DataNet journey proof
run_step "participant_share_open_e2e" "LOCAL_NODE_BASE='$LOCAL_NODE_BASE' PUBLIC_LOCAL_NODE_BASE='$PUBLIC_LOCAL_NODE_BASE' REMOTE_NODE_BASE='$REMOTE_NODE_BASE' REMOTE_BASE='$REMOTE_BASE' bash ops/two-box-participant-share-open-e2e-proof.sh"
run_step "consumer_fetch_product" "LOCAL_NODE_BASE='$LOCAL_NODE_BASE' PUBLIC_LOCAL_NODE_BASE='$PUBLIC_LOCAL_NODE_BASE' REMOTE_NODE_BASE='$REMOTE_NODE_BASE' bash ops/two-box-remote-consumer-fetch-product-proof.sh"
run_step "consume_view_product" "LOCAL_NODE_BASE='$LOCAL_NODE_BASE' PUBLIC_LOCAL_NODE_BASE='$PUBLIC_LOCAL_NODE_BASE' REMOTE_NODE_BASE='$REMOTE_NODE_BASE' bash ops/two-box-remote-consume-view-product-proof.sh"
# canonical wallet/trade participant flow-surface proof
run_step "wallet_trade_flow" "bash ops/two-box-wc-trade-runtime-proof.sh"
# supporting two-box WC/devnet truth parity proof
run_step "wallet_trade_state_parity" "bash ops/two-box-wc-state-parity-proof.sh"

echo
echo "=== canonical gate summary ==="
python3 - <<'PY' "$OUT"
import json, os, sys, glob
out = sys.argv[1]
logs = sorted(glob.glob(os.path.join(out, "*.log")))
summary = {
    "ok": True,
    "out_dir": out,
    "logs": logs,
    "steps": [os.path.basename(x) for x in logs],
}
print(json.dumps(summary, indent=2))
PY

echo "[ok] canonical two-box product gate green"
echo "out=$OUT"
