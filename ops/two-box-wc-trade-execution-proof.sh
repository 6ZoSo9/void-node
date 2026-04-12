#!/usr/bin/env bash
# Canonical two-box wallet/trade execution proof.
# Runs a real remote WC->VOID execution flow on Alienware, then verifies the
# resulting participant/network/economic surfaces from Precision.
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
REMOTE_HELPER_BASE="${REMOTE_HELPER_BASE:-http://100.122.79.39:4312/workcredits/devnet}"
REMOTE_RELAYER_BASE="${REMOTE_RELAYER_BASE:-http://100.122.79.39:4313/api/wc-relayer/v1}"
ACCOUNT_BASE="${ACCOUNT_BASE:-two-box-wc-exec}"
WALLET="${WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
RUNS="${RUNS:-1}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-wc-trade-execution-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[fail] missing command: $1" >&2; exit 1; }; }
need curl
need python3
need ssh

jget() {
  local url="$1"
  local timeout="${2:-10}"
  curl -fsS --max-time "$timeout" "$url"
}

extract_summary_json() {
  local log="$1"
  local out="$2"
  python3 - "$log" "$out" <<'PY'
import json, pathlib, sys
log = pathlib.Path(sys.argv[1]).read_text()
out = pathlib.Path(sys.argv[2])

depth = 0
started = False
buf = ""
objs = []
for ch in log:
    if ch == "{":
        depth += 1
        started = True
    if started:
        buf += ch
    if ch == "}":
        depth -= 1
        if started and depth == 0:
            objs.append(buf)
            buf = ""
            started = False

picked = None
for raw in reversed(objs):
    try:
        obj = json.loads(raw)
    except Exception:
        continue
    if isinstance(obj, dict) and obj.get("ok") is True and obj.get("approve_tx_hash") and obj.get("swap_tx_hash"):
        picked = obj
        break

if not picked:
    raise SystemExit("[fail] could not extract execution summary json from run log")

out.write_text(json.dumps(picked, indent=2))
print(json.dumps(picked, indent=2))
PY
}

echo "=== [1] baseline remote truth ==="
REMOTE_READY_JSON="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 10)"
REMOTE_HEAD_TXT="$(jget "$REMOTE_NODE_BASE/head.txt" 10)"
REMOTE_RELAYER_JSON="$(jget "$REMOTE_RELAYER_BASE/health" 10)"
printf '%s\n' "$REMOTE_READY_JSON" | tee "$OUT_DIR/remote.ready.before.json"
printf '%s\n' "$REMOTE_HEAD_TXT" | tee "$OUT_DIR/remote.head.before.txt"
printf '%s\n' "$REMOTE_RELAYER_JSON" | tee "$OUT_DIR/remote.relayer.before.json"

python3 - "$OUT_DIR/remote.ready.before.json" "$OUT_DIR/remote.head.before.txt" "$OUT_DIR/remote.relayer.before.json" <<'PY'
import json, pathlib, sys
ready = json.loads(pathlib.Path(sys.argv[1]).read_text())
head = int(pathlib.Path(sys.argv[2]).read_text().strip())
relayer = json.loads(pathlib.Path(sys.argv[3]).read_text())
assert ready.get("ready") is True, "remote ready != true at baseline"
assert relayer.get("ok") is True, "remote relayer not ok at baseline"
assert relayer.get("can_quote") is True, "remote relayer can_quote false at baseline"
assert relayer.get("can_execute") is True, "remote relayer can_execute false at baseline"
assert head >= 0, "bad remote head at baseline"
print("[ok] remote baseline aligned")
PY

echo
echo "=== [2] run remote wallet/trade execution workload ==="
for i in $(seq 1 "$RUNS"); do
  TS_NOW="$(date +%Y%m%d-%H%M%S)"
  ACCOUNT="${ACCOUNT_BASE}-${i}-${TS_NOW}"
  PLAINTEXT="two-box wallet trade execution ${i} ${TS_NOW}"
  RUN_LOG="$OUT_DIR/run.${i}.log"
  RUN_SUMMARY="$OUT_DIR/run.${i}.summary.json"

  echo "--- run $i/$RUNS account=$ACCOUNT ---"
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "cd \"\$HOME/dev/void-node\" && ACCOUNT='$ACCOUNT' WALLET='$WALLET' PLAINTEXT='$PLAINTEXT' bash ops/wc-demo-e2e.sh" \
    > "$RUN_LOG"

  tail -n 60 "$RUN_LOG" || true

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

print("[ok] execution summary validated")
PY

  echo "--- precision verifies remote participant/network/economic surfaces $i/$RUNS ---"
  REMOTE_PARTICIPANT_HTML="$OUT_DIR/run.${i}.participant.html"
  REMOTE_NETWORK_JSON="$OUT_DIR/run.${i}.network.json"
  REMOTE_POOL_JSON="$OUT_DIR/run.${i}.pool.json"
  REMOTE_RELAYER_JSON="$OUT_DIR/run.${i}.relayer.json"
  REMOTE_BALANCE_JSON="$OUT_DIR/run.${i}.balance.json"
  REMOTE_REDEEMABLE_JSON="$OUT_DIR/run.${i}.redeemable.json"
  REMOTE_RECEIPTS_JSON="$OUT_DIR/run.${i}.receipts.json"

  ENCODED_ACCOUNT="$(python3 - "$ACCOUNT" <<'PY'
import urllib.parse, sys
print(urllib.parse.quote(sys.argv[1]))
PY
)"
  jget "$REMOTE_NODE_BASE/participant?account=$ENCODED_ACCOUNT" 10 > "$REMOTE_PARTICIPANT_HTML"
  jget "$REMOTE_NODE_BASE/network/value-summary.json?limit=20" 10 > "$REMOTE_NETWORK_JSON"
  jget "$REMOTE_HELPER_BASE/pool.json" 10 > "$REMOTE_POOL_JSON"
  jget "$REMOTE_RELAYER_BASE/health" 10 > "$REMOTE_RELAYER_JSON"
  jget "$REMOTE_NODE_BASE/wc/balance?account=$ACCOUNT" 10 > "$REMOTE_BALANCE_JSON"
  jget "$REMOTE_NODE_BASE/wc/redeemable?account=$ACCOUNT" 10 > "$REMOTE_REDEEMABLE_JSON"
  jget "$REMOTE_NODE_BASE/receipts?account=$ACCOUNT" 10 > "$REMOTE_RECEIPTS_JSON"

  python3 - "$ACCOUNT" "$REMOTE_PARTICIPANT_HTML" "$REMOTE_NETWORK_JSON" "$REMOTE_POOL_JSON" "$REMOTE_RELAYER_JSON" "$REMOTE_BALANCE_JSON" "$REMOTE_REDEEMABLE_JSON" "$REMOTE_RECEIPTS_JSON" <<'PY'
import json, pathlib, sys

account = sys.argv[1]
participant_html = pathlib.Path(sys.argv[2]).read_text()
network = json.load(open(sys.argv[3]))
pool = json.load(open(sys.argv[4]))
relayer = json.load(open(sys.argv[5]))
balance = json.load(open(sys.argv[6]))
redeemable = json.load(open(sys.argv[7]))
receipts_view = json.load(open(sys.argv[8]))

assert "<title>VOID Participant</title>" in participant_html, "participant page title missing"
assert ('window.__void_participant_account_qs=' + json.dumps(account)) in participant_html, "participant bootstrap account missing"

assert network.get("ok") is True, "network value summary not ok"
assert int(network.get("recent_runner_activity_count") or 0) > 0, "recent_runner_activity_count <= 0"

recent = network.get("recent_runner_activity") or []
assert any(str(x.get("task_class") or "") == "publish" for x in recent), "publish missing from remote recent_runner_activity"

counts = network.get("counts") or {}
assert int(counts.get("publish") or 0) > 0, "remote publish count <= 0"
assert int(counts.get("verify") or 0) > 0, "remote verify count <= 0"
assert int(counts.get("redundancy") or 0) > 0, "remote redundancy count <= 0"

assert ((pool.get("pool") or {}).get("address")), "remote pool address missing"
assert relayer.get("ok") is True, "remote relayer not ok after execute"
assert relayer.get("can_execute") is True, "remote relayer can_execute false after execute"

assert float(balance.get("balance") or -1) == 10.0, f"remote wc balance != 10: {balance}"
assert float(redeemable.get("redeemable") or -1) == 9.0, f"remote redeemable != 9: {redeemable}"

receipts = receipts_view.get("receipts") or []
assert len(receipts) > 0, "remote receipts empty for account"

print("[ok] remote participant/network/economic surfaces validated")
PY
done

echo
echo "=== [3] final remote truth ==="
REMOTE_READY_AFTER="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 10)"
REMOTE_HEAD_AFTER="$(jget "$REMOTE_NODE_BASE/head.txt" 10)"
printf '%s\n' "$REMOTE_READY_AFTER" | tee "$OUT_DIR/remote.ready.after.json"
printf '%s\n' "$REMOTE_HEAD_AFTER" | tee "$OUT_DIR/remote.head.after.txt"

python3 - "$OUT_DIR/remote.ready.after.json" "$OUT_DIR/remote.head.after.txt" <<'PY'
import json, pathlib, sys
ready = json.loads(pathlib.Path(sys.argv[1]).read_text())
head = int(pathlib.Path(sys.argv[2]).read_text().strip())
assert ready.get("ready") is True, "remote ready != true after execution proof"
assert head >= 0, "bad remote head after execution proof"
print("[ok] remote final truth clean")
PY

echo
echo "[ok] two-box wallet/trade execution proof green"
echo "out=$OUT_DIR"
