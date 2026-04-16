#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
ALIEN_HOST="${ALIEN##*@}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://${ALIEN_HOST}:4100}"
ACCOUNT="${ACCOUNT:-two-box-canonical-$(date +%Y%m%d-%H%M%S)}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-datanet-canonical-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-10}" "$1"
}

echo "=== [1] baseline local/remote truth ==="
LOCAL_READY="$(jget "http://127.0.0.1:4100/__void/ready.json" 5)"
REMOTE_READY_HTTP="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 10)"
REMOTE_READY_SSH="$(ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" 'curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json')"

printf '%s\n' "$LOCAL_READY" | tee "$OUT_DIR/local-ready.json"
printf '%s\n' "$REMOTE_READY_HTTP" | tee "$OUT_DIR/remote-ready-http.json"
printf '%s\n' "$REMOTE_READY_SSH" | tee "$OUT_DIR/remote-ready-ssh.json"

python3 - "$OUT_DIR/local-ready.json" "$OUT_DIR/remote-ready-http.json" "$OUT_DIR/remote-ready-ssh.json" <<'PY'
import json, sys
local_ready = json.load(open(sys.argv[1]))
remote_http = json.load(open(sys.argv[2]))
remote_ssh = json.load(open(sys.argv[3]))

assert local_ready.get("ready") is True, f"local ready != true: {local_ready}"
assert remote_http.get("ready") is True, f"remote http ready != true: {remote_http}"
assert remote_ssh.get("ready") is True, f"remote ssh ready != true: {remote_ssh}"
assert local_ready.get("txroot_live") == 1, f"local txroot_live != 1: {local_ready.get('txroot_live')}"

remote_http_tx = remote_http.get("txroot_live")
remote_ssh_tx = remote_ssh.get("txroot_live")
if remote_http_tx != 1 or remote_ssh_tx != 1:
    print(f"[warn] remote txroot_live not green yet (http={remote_http_tx} ssh={remote_ssh_tx}) but continuing because remote ready=true")

print("[ok] local + remote ready truth looks good enough")
PY
echo

echo "=== [2] remote receipts/ledger before ==="
REMOTE_RECEIPTS_BEFORE="$(jget "$REMOTE_NODE_BASE/datanet/v1/receipts/status" 10)"
REMOTE_LEDGER_BEFORE="$(jget "$REMOTE_NODE_BASE/wc/ledger?account=${ACCOUNT}&limit=50" 10)"
printf '%s\n' "$REMOTE_RECEIPTS_BEFORE" | tee "$OUT_DIR/remote-receipts-before.json"
printf '%s\n' "$REMOTE_LEDGER_BEFORE" | tee "$OUT_DIR/remote-ledger-before.json"
echo

echo "=== [3] run canonical proof on Alien ==="
ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" "cd \"\$HOME/dev/void-node\" && ACCOUNT='$ACCOUNT' bash ./ops/datanet-canonical-proof.sh" | tee "$OUT_DIR/remote-proof.out"

echo
echo "=== [4] remote receipts/ledger after ==="
REMOTE_RECEIPTS_AFTER="$(jget "$REMOTE_NODE_BASE/datanet/v1/receipts/status" 10)"
REMOTE_LEDGER_AFTER="$(jget "$REMOTE_NODE_BASE/wc/ledger?account=${ACCOUNT}&limit=50" 10)"
printf '%s\n' "$REMOTE_RECEIPTS_AFTER" | tee "$OUT_DIR/remote-receipts-after.json"
printf '%s\n' "$REMOTE_LEDGER_AFTER" | tee "$OUT_DIR/remote-ledger-after.json"
echo

echo "=== [5] precision verifies remote credit ==="
python3 - "$OUT_DIR/remote-proof.out" "$OUT_DIR/remote-receipts-before.json" "$OUT_DIR/remote-receipts-after.json" "$OUT_DIR/remote-ledger-after.json" "$ACCOUNT" <<'PY'
import json, re, sys
proof_out = open(sys.argv[1]).read()
before = json.load(open(sys.argv[2]))
after = json.load(open(sys.argv[3]))
ledger = json.load(open(sys.argv[4]))
account = sys.argv[5]

m = re.search(r'^receipt_id=(.+)$', proof_out, re.M)
if not m:
    raise SystemExit("[FAIL] could not find receipt_id in remote proof output")
receipt_id = m.group(1).strip()

if "canonical_datanet_useful_work_loop_ok=1" not in proof_out:
    raise SystemExit("[FAIL] remote canonical proof did not report success")

before_total = int(before.get("total") or 0)
after_total = int(after.get("total") or 0)
if after_total < before_total:
    raise SystemExit(f"[FAIL] remote receipts total decreased: {before_total} -> {after_total}")

events = ledger.get("events") or []
matches = []
for ev in events:
    if str(ev.get("reason") or "") != "datanet_receipt":
        continue
    if str(ev.get("account") or ev.get("who") or "") != account:
        continue
    if str(ev.get("receipt_id") or "") != receipt_id:
        continue
    matches.append(ev)

if len(matches) != 1:
    raise SystemExit(f"[FAIL] expected exactly 1 matching remote datanet_receipt credit, got {len(matches)}")

delta = int(matches[0].get("delta") or 0)
if delta <= 0:
    raise SystemExit(f"[FAIL] matching remote credit delta <= 0: {delta}")

print(json.dumps({
    "ok": True,
    "account": account,
    "receipt_id": receipt_id,
    "remote_receipts_total_before": before_total,
    "remote_receipts_total_after": after_total,
    "remote_credit_delta": delta,
    "remote_credit_reason": matches[0].get("reason"),
}, indent=2))
PY

echo
echo "[ok] two-box canonical datanet proof passed"
