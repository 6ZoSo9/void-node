#!/usr/bin/env bash
# Canonical two-box WC send execution proof.
# Creates fresh remote sender WC, sends WC to a fresh recipient on Alienware,
# then verifies the resulting economic and participant surfaces from Precision.
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
REMOTE_HELPER_BASE="${REMOTE_HELPER_BASE:-http://100.122.79.39:4312/workcredits/devnet}"
SENDER_BASE="${SENDER_BASE:-two-box-wc-send-from}"
RECIP_BASE="${RECIP_BASE:-two-box-wc-send-to}"
SEND_WC="${SEND_WC:-3}"
JOB_WAIT_LOOPS="${JOB_WAIT_LOOPS:-20}"
JOB_WAIT_SECS="${JOB_WAIT_SECS:-2}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-wc-send-execution-proof-$(date +%Y%m%d-%H%M%S)}"
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

jpost() {
  local url="$1"
  local body="$2"
  local timeout="${3:-15}"
  curl -fsS --max-time "$timeout" -H 'content-type: application/json' -d "$body" "$url"
}

echo "=== [1] baseline remote truth ==="
REMOTE_READY_JSON="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 10)"
REMOTE_HEAD_TXT="$(jget "$REMOTE_NODE_BASE/head.txt" 10)"
printf '%s\n' "$REMOTE_READY_JSON" | tee "$OUT_DIR/remote.ready.before.json"
printf '%s\n' "$REMOTE_HEAD_TXT" | tee "$OUT_DIR/remote.head.before.txt"

python3 - "$OUT_DIR/remote.ready.before.json" "$OUT_DIR/remote.head.before.txt" <<'PY'
import json, pathlib, sys
ready = json.loads(pathlib.Path(sys.argv[1]).read_text())
head = int(pathlib.Path(sys.argv[2]).read_text().strip())
assert ready.get("ready") is True, "remote ready != true at baseline"
assert head >= 0, "bad remote head at baseline"
print("[ok] remote baseline aligned")
PY

echo
echo "=== [2] create fresh sender + recipient accounts ==="
TS_NOW="$(date +%Y%m%d-%H%M%S)"
SENDER="${SENDER_BASE}-${TS_NOW}"
RECIP="${RECIP_BASE}-${TS_NOW}"
PLAINTEXT="two-box wc send execution $TS_NOW"
printf '%s\n' "$SENDER" | tee "$OUT_DIR/sender.txt"
printf '%s\n' "$RECIP" | tee "$OUT_DIR/recipient.txt"

echo
echo "=== [3] submit remote work for sender ==="
ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
  "cd \"\$HOME/dev/void-node\" && ACCOUNT='$SENDER' PLAINTEXT='$PLAINTEXT' bash ops/wc-demo-e2e.sh" \
  > "$OUT_DIR/remote.demo.log"

tail -n 60 "$OUT_DIR/remote.demo.log" || true

echo
echo "=== [4] extract sender summary ==="
python3 - "$OUT_DIR/remote.demo.log" "$OUT_DIR/remote.demo.summary.json" <<'PY'
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
    raise SystemExit("[fail] could not extract remote demo summary")

out.write_text(json.dumps(picked, indent=2))
print(json.dumps(picked, indent=2))
PY

echo
echo "=== [5] verify sender has redeemable WC before send ==="
jget "$REMOTE_NODE_BASE/wc/redeemable?account=$SENDER" 10 | tee "$OUT_DIR/sender.redeemable.before-send.json"
jget "$REMOTE_NODE_BASE/wc/redeemable?account=$RECIP" 10 | tee "$OUT_DIR/recipient.redeemable.before-send.json"

python3 - "$OUT_DIR/sender.redeemable.before-send.json" "$OUT_DIR/recipient.redeemable.before-send.json" "$SEND_WC" <<'PY'
import json, pathlib, sys
sender = json.loads(pathlib.Path(sys.argv[1]).read_text())
recipient = json.loads(pathlib.Path(sys.argv[2]).read_text())
send_wc = float(sys.argv[3])

sender_red = float(sender.get("redeemable") or 0)
recipient_red = float(recipient.get("redeemable") or 0)

assert sender_red >= send_wc, f"sender redeemable too small: {sender_red} < {send_wc}"
assert abs(recipient_red - 0.0) <= 1e-9, f"recipient redeemable_before != 0: {recipient_red}"
print("[ok] sender/recipient baseline for send is valid")
PY

echo
echo "=== [6] execute remote WC send ==="
jpost "$REMOTE_NODE_BASE/wc/send" "{\"from\":\"$SENDER\",\"to\":\"$RECIP\",\"amount\":$SEND_WC}" 15 | tee "$OUT_DIR/send.execute.json"

echo
echo "=== [7] verify send result + post-send states ==="
jget "$REMOTE_NODE_BASE/wc/redeemable?account=$SENDER" 10 | tee "$OUT_DIR/sender.redeemable.after-send.json"
jget "$REMOTE_NODE_BASE/wc/redeemable?account=$RECIP" 10 | tee "$OUT_DIR/recipient.redeemable.after-send.json"
jget "$REMOTE_NODE_BASE/wc/balance?account=$SENDER" 10 | tee "$OUT_DIR/sender.balance.after-send.json"
jget "$REMOTE_NODE_BASE/wc/balance?account=$RECIP" 10 | tee "$OUT_DIR/recipient.balance.after-send.json"

python3 - \
  "$OUT_DIR/send.execute.json" \
  "$OUT_DIR/sender.redeemable.before-send.json" \
  "$OUT_DIR/recipient.redeemable.before-send.json" \
  "$OUT_DIR/sender.redeemable.after-send.json" \
  "$OUT_DIR/recipient.redeemable.after-send.json" \
  "$SEND_WC" <<'PY'
import json, pathlib, sys

send = json.loads(pathlib.Path(sys.argv[1]).read_text())
sb = json.loads(pathlib.Path(sys.argv[2]).read_text())
rb = json.loads(pathlib.Path(sys.argv[3]).read_text())
sa = json.loads(pathlib.Path(sys.argv[4]).read_text())
ra = json.loads(pathlib.Path(sys.argv[5]).read_text())
send_wc = float(sys.argv[6])

assert send.get("ok") is True, "send ok != true"
ref = send.get("ref")
assert ref, "missing ref"

debit = send.get("debit_event") or {}
credit = send.get("credit_event") or {}
assert debit.get("ref") == ref, "debit ref mismatch"
assert credit.get("ref") == ref, "credit ref mismatch"

sender_before = float(sb.get("redeemable") or 0)
recipient_before = float(rb.get("redeemable") or 0)
sender_after = float(sa.get("redeemable") or 0)
recipient_after = float(ra.get("redeemable") or 0)

assert abs((sender_before - sender_after) - send_wc) <= 1e-9, f"sender redeemable delta mismatch: {sender_before} -> {sender_after}"
assert abs((recipient_after - recipient_before) - send_wc) <= 1e-9, f"recipient redeemable delta mismatch: {recipient_before} -> {recipient_after}"

from_state = send.get("from_state") or {}
to_state = send.get("to_state") or {}
assert abs(float(from_state.get("redeemable") or -1) - sender_after) <= 1e-9, "from_state redeemable mismatch"
assert abs(float(to_state.get("redeemable") or -1) - recipient_after) <= 1e-9, "to_state redeemable mismatch"

print("[ok] send economic state validated")
PY

echo
echo "=== [8] verify remote participant surfaces for both accounts ==="
SENDER_Q="$(python3 - "$SENDER" <<'PY'
import urllib.parse, sys
print(urllib.parse.quote(sys.argv[1]))
PY
)"
RECIP_Q="$(python3 - "$RECIP" <<'PY'
import urllib.parse, sys
print(urllib.parse.quote(sys.argv[1]))
PY
)"
jget "$REMOTE_NODE_BASE/participant?account=$SENDER_Q#wallet" 10 > "$OUT_DIR/sender.participant.html"
jget "$REMOTE_NODE_BASE/participant?account=$RECIP_Q#wallet" 10 > "$OUT_DIR/recipient.participant.html"

python3 - "$OUT_DIR/sender.participant.html" "$OUT_DIR/recipient.participant.html" "$SENDER" "$RECIP" <<'PY'
import json, pathlib, sys
sender_html = pathlib.Path(sys.argv[1]).read_text()
recipient_html = pathlib.Path(sys.argv[2]).read_text()
sender = sys.argv[3]
recipient = sys.argv[4]

assert "<title>VOID Participant</title>" in sender_html, "sender participant title missing"
assert "<title>VOID Participant</title>" in recipient_html, "recipient participant title missing"
assert ('window.__void_participant_account_qs=' + json.dumps(sender)) in sender_html, "sender bootstrap account missing"
assert ('window.__void_participant_account_qs=' + json.dumps(recipient)) in recipient_html, "recipient bootstrap account missing"
assert 'id="sendWcBtn"' in sender_html, "sender send button missing"
assert 'id="sendWcBtn"' in recipient_html, "recipient send button missing"
print("[ok] participant send surfaces render for sender and recipient")
PY

echo
echo "=== [9] final remote truth ==="
REMOTE_READY_AFTER="$(jget "$REMOTE_NODE_BASE/__void/ready.json" 10)"
REMOTE_HEAD_AFTER="$(jget "$REMOTE_NODE_BASE/head.txt" 10)"
printf '%s\n' "$REMOTE_READY_AFTER" | tee "$OUT_DIR/remote.ready.after.json"
printf '%s\n' "$REMOTE_HEAD_AFTER" | tee "$OUT_DIR/remote.head.after.txt"

python3 - "$OUT_DIR/remote.ready.after.json" "$OUT_DIR/remote.head.after.txt" <<'PY'
import json, pathlib, sys
ready = json.loads(pathlib.Path(sys.argv[1]).read_text())
head = int(pathlib.Path(sys.argv[2]).read_text().strip())
assert ready.get("ready") is True, "remote ready != true after send proof"
assert head >= 0, "bad remote head after send proof"
print("[ok] remote final truth clean")
PY

echo
echo "[ok] two-box wc send execution proof green"
echo "out=$OUT_DIR"
