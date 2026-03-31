#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
RUNS="${RUNS:-5}"
ACCOUNT_BASE="${ACCOUNT_BASE:-remote-user-mixed-$(date +%Y%m%d-%H%M%S)}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
REMOTE_NODE_BASE="http://${ALIEN##*@}:4100"
REMOTE_HELPER_BASE="http://${ALIEN##*@}:4312/workcredits/devnet"
REMOTE_RELAYER_BASE="http://${ALIEN##*@}:4313/api/wc-relayer/v1"
LOCAL_NODE_BASE="${LOCAL_NODE_BASE:-http://127.0.0.1:4100}"

OUT_DIR="${OUT_DIR:-/tmp/two-box-peer-workload-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-8}" "$1"
}

extract_summary_json() {
  local in_file="$1"
  local out_file="$2"
  python3 - "$in_file" "$out_file" <<'PY'
import json, pathlib, sys
src = pathlib.Path(sys.argv[1]).read_text()
dst = pathlib.Path(sys.argv[2])
start = src.rfind('{\n  "ok": true,')
if start == -1:
    raise SystemExit("[fail] summary json block not found in output")
tail = src[start:]
depth = 0
end = None
for i, ch in enumerate(tail):
    if ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break
if end is None:
    raise SystemExit("[fail] could not close summary json block")
obj = json.loads(tail[:end])
dst.write_text(json.dumps(obj, indent=2) + "\n")
print(json.dumps(obj, indent=2))
PY
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
echo "--- remote helper pool ---"
REMOTE_POOL="$(jget "$REMOTE_HELPER_BASE/pool.json" 8)"
printf '%s\n' "$REMOTE_POOL"
echo "--- remote relayer health ---"
REMOTE_RELAYER_BEFORE="$(jget "$REMOTE_RELAYER_BASE/health" 8)"
printf '%s\n' "$REMOTE_RELAYER_BEFORE"
echo

python3 - "$LOCAL_READY" "$REMOTE_READY" "$LOCAL_HEAD" "$REMOTE_HEAD" "$REMOTE_RELAYER_BEFORE" <<'PY'
import json, sys
local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_head = int(sys.argv[3].strip())
remote_head = int(sys.argv[4].strip())
relayer = json.loads(sys.argv[5])

assert local_ready["ready"] is True, "local not ready at baseline"
assert remote_ready["ready"] is True, "remote not ready at baseline"
assert local_head == remote_head, f"baseline head mismatch: {local_head} vs {remote_head}"
assert relayer["ok"] is True, "remote relayer not ok at baseline"
assert relayer["can_quote"] is True, "remote relayer quote false at baseline"
assert relayer["can_execute"] is True, "remote relayer execute false at baseline"
print("[ok] baseline ready/head/relayer aligned")
PY

echo
echo "=== [2] run repeated remote mixed product workload ==="
for i in $(seq 1 "$RUNS"); do
  TS_NOW="$(date +%Y%m%d-%H%M%S)"
  ACCOUNT="${ACCOUNT_BASE}-${i}"
  PLAINTEXT="mixed remote workload run ${i} ${TS_NOW}"
  RUN_LOG="$OUT_DIR/run.${i}.log"
  RUN_SUMMARY="$OUT_DIR/run.${i}.summary.json"

  echo "--- run $i/$RUNS account=$ACCOUNT ---"
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "cd '$HOME/dev/void-node' && ACCOUNT='$ACCOUNT' WALLET='$WALLET' PLAINTEXT='$PLAINTEXT' bash ops/wc-demo-e2e.sh" \
    > "$RUN_LOG"

  tail -n 40 "$RUN_LOG" || true
  echo "--- extracted summary $i/$RUNS ---"
  extract_summary_json "$RUN_LOG" "$RUN_SUMMARY"

  python3 - "$RUN_SUMMARY" <<'PY'
import json, sys
obj = json.load(open(sys.argv[1]))
assert obj.get("ok") is True, "summary ok != true"
assert obj.get("approve_tx_hash"), "missing approve_tx_hash"
assert obj.get("swap_tx_hash"), "missing swap_tx_hash"

before_redeemable = float(obj.get("participant_redeemable_before", -1))
after_credit_redeemable = float(obj.get("participant_redeemable_after_credit", -1))
after_execute_redeemable = float(obj.get("participant_redeemable_after_execute", -1))
trade_wc = float(obj.get("trade_wc", -1))

before_balance = float(obj.get("participant_balance_before", -1))
after_credit_balance = float(obj.get("participant_balance_after_credit", -1))
after_execute_balance = float(obj.get("participant_balance_after_execute", -1))

assert abs(before_redeemable - 0.0) <= 1e-9, f"fresh-account redeemable_before != 0: {before_redeemable}"
assert abs(after_credit_redeemable - 10.0) <= 1e-9, f"redeemable_after_credit != 10: {after_credit_redeemable}"
assert abs(trade_wc - 1.0) <= 1e-9, f"trade_wc != 1: {trade_wc}"
assert abs(after_execute_redeemable - 9.0) <= 1e-9, f"redeemable_after_execute != 9: {after_execute_redeemable}"

assert abs(before_balance - 0.0) <= 1e-9, f"fresh-account balance_before != 0: {before_balance}"
assert abs(after_credit_balance - 10.0) <= 1e-9, f"balance_after_credit != 10: {after_credit_balance}"
assert abs(after_execute_balance - 10.0) <= 1e-9, f"balance_after_execute != 10: {after_execute_balance}"

print("[ok] run summary validated")
print(json.dumps({
    "ok": True,
    "approve_tx_hash": obj.get("approve_tx_hash"),
    "swap_tx_hash": obj.get("swap_tx_hash"),
    "participant_redeemable_before": before_redeemable,
    "participant_redeemable_after_credit": after_credit_redeemable,
    "participant_redeemable_after_execute": after_execute_redeemable,
    "participant_balance_before": before_balance,
    "participant_balance_after_credit": after_credit_balance,
    "participant_balance_after_execute": after_execute_balance,
    "trade_wc": trade_wc,
    "before_void": obj.get("before_void"),
    "after_void": obj.get("after_void"),
    "artifacts_dir": obj.get("artifacts_dir"),
}, indent=2))
PY
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
echo "--- remote datanet status ---"
REMOTE_DATANET_AFTER="$(jget "$REMOTE_NODE_BASE/datanet/v1/status" 8)"
printf '%s\n' "$REMOTE_DATANET_AFTER"
echo "--- remote relayer health ---"
REMOTE_RELAYER_AFTER="$(jget "$REMOTE_RELAYER_BASE/health" 8)"
printf '%s\n' "$REMOTE_RELAYER_AFTER"
echo

python3 - "$LOCAL_READY_AFTER" "$REMOTE_READY_AFTER" "$LOCAL_HEAD_AFTER" "$REMOTE_HEAD_AFTER" "$REMOTE_RELAYER_AFTER" "$RUNS" "$OUT_DIR" <<'PY'
import json, pathlib, sys
local_ready = json.loads(sys.argv[1])
remote_ready = json.loads(sys.argv[2])
local_head = int(sys.argv[3].strip())
remote_head = int(sys.argv[4].strip())
relayer = json.loads(sys.argv[5])
runs = int(sys.argv[6])
out_dir = pathlib.Path(sys.argv[7])

assert local_ready["ready"] is True, "local not ready after workload"
assert remote_ready["ready"] is True, "remote not ready after workload"
assert abs(local_head - remote_head) == 0, f"post-work head mismatch: {local_head} vs {remote_head}"
assert remote_ready.get("gap") == 0, f"remote gap not zero after workload: {remote_ready.get('gap')}"
assert remote_ready.get("txroot_live") == 1, f"remote txroot_live not 1 after workload: {remote_ready.get('txroot_live')}"
assert relayer["ok"] is True, "remote relayer not ok after workload"
assert relayer["can_quote"] is True, "remote relayer quote false after workload"
assert relayer["can_execute"] is True, "remote relayer execute false after workload"

summaries = []
for i in range(1, runs + 1):
    p = out_dir / f"run.{i}.summary.json"
    if not p.exists():
        raise SystemExit(f"[fail] missing run summary: {p}")
    summaries.append(json.load(open(p)))

print("[ok] post-work ready/head/relayer aligned")
print(json.dumps({
    "ok": True,
    "runs": runs,
    "local_head_after": local_head,
    "remote_head_after": remote_head,
    "local_ready_after": local_ready["ready"],
    "remote_ready_after": remote_ready["ready"],
    "remote_gap_after": remote_ready.get("gap"),
    "remote_txroot_live_after": remote_ready.get("txroot_live"),
    "remote_relayer_ok": relayer.get("ok"),
    "remote_relayer_can_quote": relayer.get("can_quote"),
    "remote_relayer_can_execute": relayer.get("can_execute"),
    "run_accounts_validated": len(summaries),
    "artifacts_dir": str(out_dir),
}, indent=2))
PY

echo
echo "=== [4] success ==="
echo "[ok] two-box mixed remote workload proof green"
