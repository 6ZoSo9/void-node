#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
RUNS="${RUNS:-3}"
ACCOUNT_BASE="${ACCOUNT_BASE:-remote-user-peerproof}"
REMOTE_NODE_BASE="http://${ALIEN##*@}:4100"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"

jget() {
  curl -fsS --max-time "${2:-8}" "$1"
}

echo "=== [1] baseline truth ==="
echo "--- local ready ---"
LOCAL_READY="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
printf '%s\n' "$LOCAL_READY"
echo "--- remote ready ---"
REMOTE_READY="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
printf '%s\n' "$REMOTE_READY"
echo "--- local head ---"
LOCAL_HEAD="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
printf '%s\n' "$LOCAL_HEAD"
echo "--- remote head ---"
REMOTE_HEAD="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"
printf '%s\n' "$REMOTE_HEAD"
echo

python3 - "$LOCAL_READY" "$REMOTE_READY" "$LOCAL_HEAD" "$REMOTE_HEAD" <<'PY'
import json, sys
local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_head = int(sys.argv[3].strip())
remote_head = int(sys.argv[4].strip())
assert local_ready["ready"] is True, "local not ready at baseline"
assert remote_ready["ready"] is True, "remote not ready at baseline"
assert local_head == remote_head, f"baseline head mismatch: {local_head} vs {remote_head}"
print("[ok] baseline ready/head aligned")
PY

echo
echo "=== [2] run repeated remote product workload ==="
for i in $(seq 1 "$RUNS"); do
  TS_NOW="$(date +%Y%m%d-%H%M%S)"
  ACCOUNT="${ACCOUNT_BASE}-${i}"
  PLAINTEXT="peer workload proof run ${i} ${TS_NOW}"
  echo "--- run $i/$RUNS account=$ACCOUNT ---"
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "cd '$HOME/dev/void-node' && ACCOUNT='$ACCOUNT' PLAINTEXT='$PLAINTEXT' bash ops/wc-demo-e2e.sh" >/tmp/two-box-peer-workload-proof.run.$$.log
  tail -n 20 /tmp/two-box-peer-workload-proof.run.$$.log || true
  echo
done

echo "=== [3] post-work truth ==="
echo "--- local ready ---"
LOCAL_READY_AFTER="$(jget "$LOCAL_NODE_BASE/__void/ready.json" 5)"
printf '%s\n' "$LOCAL_READY_AFTER"
echo "--- remote ready ---"
REMOTE_READY_AFTER="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 8)"
printf '%s\n' "$REMOTE_READY_AFTER"
echo "--- local head ---"
LOCAL_HEAD_AFTER="$(jget "$LOCAL_NODE_BASE/head.txt" 5)"
printf '%s\n' "$LOCAL_HEAD_AFTER"
echo "--- remote head ---"
REMOTE_HEAD_AFTER="$(jget "$REMOTE_NODE_BASE/head.txt" 8)"
printf '%s\n' "$REMOTE_HEAD_AFTER"
echo "--- remote relayer health ---"
REMOTE_RELAYER="$(jget "http://${ALIEN##*@}:4313/api/wc-relayer/v1/health" 8)"
printf '%s\n' "$REMOTE_RELAYER"
echo

python3 - "$LOCAL_READY_AFTER" "$REMOTE_READY_AFTER" "$LOCAL_HEAD_AFTER" "$REMOTE_HEAD_AFTER" "$REMOTE_RELAYER" <<'PY'
import json, sys
local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_head = int(sys.argv[3].strip())
remote_head = int(sys.argv[4].strip())
relayer = json.loads(sys.argv[5])

assert local_ready["ready"] is True, "local not ready after workload"
assert remote_ready["ready"] is True, "remote not ready after workload"
assert abs(local_head - remote_head) == 0, f"post-work head mismatch: {local_head} vs {remote_head}"
assert relayer["ok"] is True, "remote relayer not ok after workload"
assert relayer["can_quote"] is True, "remote relayer quote false after workload"
print("[ok] post-work ready/head/relayer aligned")
print(json.dumps({
    "ok": True,
    "local_head_after": local_head,
    "remote_head_after": remote_head,
    "local_ready_after": local_ready["ready"],
    "remote_ready_after": remote_ready["ready"],
    "remote_gap_after": remote_ready.get("gap"),
    "remote_txroot_live_after": remote_ready.get("txroot_live"),
    "remote_relayer_ok": relayer.get("ok"),
    "remote_relayer_can_quote": relayer.get("can_quote"),
}, indent=2))
PY

echo
echo "=== [4] success ==="
echo "[ok] two-box peer workload proof green"
