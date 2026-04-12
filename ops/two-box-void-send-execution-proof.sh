#!/usr/bin/env bash
# Canonical two-box VOID send execution proof.
# Sends onchain VOID (ERC20 transfer) on Alienware's devnet, then verifies
# before/after balances and remote participant wallet surfaces from Precision.
set -euo pipefail
set +H
set +o histexpand

REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
REMOTE_RELAYER_BASE="${REMOTE_RELAYER_BASE:-http://100.122.79.39:4313/api/wc-relayer/v1}"
ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_RPC="${REMOTE_RPC:-http://127.0.0.1:8545}"

# Standard anvil funded accounts.
FROM_ADDR="${FROM_ADDR:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
TO_ADDR="${TO_ADDR:-0x70997970c51812dc3a010c7d01b50e0d17dc79c8}"
SEND_VOID="${SEND_VOID:-1}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-void-send-execution-proof-$(date +%Y%m%d-%H%M%S)}"
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

remote_rpc() {
  local method="$1"
  local params="$2"
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$ALIEN" \
    "curl -fsS --max-time 15 -H 'content-type: application/json' --data '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":$params}' '$REMOTE_RPC'"
}

parse_units_18() {
  python3 - "$1" <<'PY'
import sys
s = str(sys.argv[1]).strip()
parts = s.split(".", 1)
whole = int(parts[0] or "0")
frac = (parts[1] if len(parts) > 1 else "")
frac = (frac + "0"*18)[:18]
print(whole * (10**18) + int(frac or "0"))
PY
}

balance_of_call() {
  local token="$1"
  local addr="$2"
  python3 - "$token" "$addr" -c 'import json, sys; token=sys.argv[1]; addr=sys.argv[2].lower().replace("0x",""); selector="70a08231"; data="0x"+selector+addr.rjust(64,"0"); print(json.dumps([{"to": token, "data": data}, "latest"], separators=(",", ":")))' 
}

transfer_data() {
  local to="$1"
  local units="$2"
  python3 - "$to" "$units" <<'PY'
import sys
to = sys.argv[1].lower().replace("0x","")
units = int(sys.argv[2])
selector = "a9059cbb"
data = "0x" + selector + to.rjust(64, "0") + format(units, "x").rjust(64, "0")
print(data)
PY
}

hex_to_dec() {
  python3 - "$1" <<'PY'
import sys
print(int(str(sys.argv[1]).strip(), 16))
PY
}

echo "=== [1] baseline remote truth ==="
jget "$REMOTE_NODE_BASE/__void/ready.json" 10 | tee "$OUT_DIR/ready.before.json"
echo
jget "$REMOTE_RELAYER_BASE/health" 10 | tee "$OUT_DIR/relayer.before.json"
echo
jget "$REMOTE_NODE_BASE/participant?account=$FROM_ADDR#wallet" 10 > "$OUT_DIR/from.participant.html"
jget "$REMOTE_NODE_BASE/participant?account=$TO_ADDR#wallet" 10 > "$OUT_DIR/to.participant.html"

VOID_TOKEN="$(python3 - "$OUT_DIR/relayer.before.json" <<'PY'
import json, pathlib, sys
obj = json.loads(pathlib.Path(sys.argv[1]).read_text())
vt = str(obj.get("void_token") or "").strip()
assert obj.get("ok") is True, "relayer health not ok"
assert vt.startswith("0x") and len(vt) == 42, "bad void_token"
print(vt)
PY
)"
echo "void_token=$VOID_TOKEN" | tee "$OUT_DIR/void_token.txt"

echo
echo "=== [2] transfer payload ==="
SEND_UNITS="$(parse_units_18 "$SEND_VOID")"
TX_DATA="$(transfer_data "$TO_ADDR" "$SEND_UNITS")"

printf '%s\n' "$SEND_UNITS" | tee "$OUT_DIR/send.units.txt"
printf '%s\n' "$TX_DATA" | tee "$OUT_DIR/transfer.data.txt"

echo
echo "=== [3] submit onchain VOID transfer ==="
remote_rpc eth_sendTransaction "[{\"from\":\"$FROM_ADDR\",\"to\":\"$VOID_TOKEN\",\"data\":\"$TX_DATA\"}]" | tee "$OUT_DIR/send.tx.json"

TX_HASH="$(python3 - "$OUT_DIR/send.tx.json" <<'PY'
import json, pathlib, sys
obj = json.loads(pathlib.Path(sys.argv[1]).read_text())
h = str(obj.get("result") or "").strip()
assert h.startswith("0x") and len(h) == 66, f"bad tx hash: {h}"
print(h)
PY
)"
echo "tx_hash=$TX_HASH" | tee "$OUT_DIR/tx_hash.txt"

echo
echo "=== [4] wait for receipt ==="
python3 - "$ALIEN" "$REMOTE_RPC" "$TX_HASH" "$OUT_DIR/tx.receipt.json" <<'PY'
import json, pathlib, subprocess, sys, time

alien = sys.argv[1]
rpc = sys.argv[2]
txh = sys.argv[3]
out = sys.argv[4]

def remote_rpc(method, params):
    payload = json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params})
    cmd = [
        "ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", alien,
        f"curl -fsS --max-time 15 -H 'content-type: application/json' --data '{payload}' '{rpc}'"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(res.stdout)

receipt = None
for _ in range(20):
    obj = remote_rpc("eth_getTransactionReceipt", [txh])
    receipt = obj.get("result")
    if receipt:
        break
    time.sleep(1)

if not receipt:
    raise SystemExit("[fail] tx receipt not found")

pathlib.Path(out).write_text(json.dumps(receipt, indent=2))
status = receipt.get("status")
if str(status).lower() not in ("0x1", "1"):
    raise SystemExit(f"[fail] tx failed with status={status}")

print(json.dumps(receipt, indent=2))
print("[ok] tx receipt confirmed")
PY

echo
echo "=== [5] verify transfer receipt contents ==="
python3 - "$OUT_DIR/tx.receipt.json" "$FROM_ADDR" "$TO_ADDR" "$VOID_TOKEN" "$SEND_UNITS" <<'PY'
import json, pathlib, sys

receipt = json.loads(pathlib.Path(sys.argv[1]).read_text())
from_addr = sys.argv[2].lower()
to_addr = sys.argv[3].lower()
token = sys.argv[4].lower()
send_units = int(sys.argv[5])

logs = receipt.get("logs") or []
assert logs, "no logs in receipt"

transfer_sig = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
hit = None
for log in logs:
    if str(log.get("address") or "").lower() != token:
        continue
    topics = log.get("topics") or []
    if len(topics) < 3:
        continue
    if str(topics[0]).lower() != transfer_sig:
        continue
    topic_from = "0x" + str(topics[1])[-40:].lower()
    topic_to = "0x" + str(topics[2])[-40:].lower()
    amount = int(str(log.get("data") or "0x0"), 16)
    if topic_from == from_addr and topic_to == to_addr and amount == send_units:
        hit = {
            "token": str(log.get("address") or "").lower(),
            "from": topic_from,
            "to": topic_to,
            "amount": amount,
            "tx_hash": receipt.get("transactionHash"),
            "block_number": receipt.get("blockNumber"),
        }
        break

assert hit, "matching ERC20 Transfer log not found in receipt"

print("[ok] ERC20 VOID transfer receipt validated")
print(json.dumps(hit, indent=2))
PY

echo
echo "=== [6] verify remote wallet surfaces render ==="
python3 - "$OUT_DIR/from.participant.html" "$OUT_DIR/to.participant.html" "$FROM_ADDR" "$TO_ADDR" <<'PY'
import json, pathlib, sys
from_html = pathlib.Path(sys.argv[1]).read_text()
to_html = pathlib.Path(sys.argv[2]).read_text()
from_addr = sys.argv[3]
to_addr = sys.argv[4]

assert "<title>VOID Participant</title>" in from_html, "from participant title missing"
assert "<title>VOID Participant</title>" in to_html, "to participant title missing"
assert ('window.__void_participant_account_qs=' + json.dumps(from_addr)) in from_html, "from bootstrap account missing"
assert ('window.__void_participant_account_qs=' + json.dumps(to_addr)) in to_html, "to bootstrap account missing"
assert 'id="voidSendBtn"' in from_html, "from voidSendBtn missing"
assert 'id="voidSendBtn"' in to_html, "to voidSendBtn missing"
assert "Send VOID" in from_html, "from Send VOID copy missing"
assert "Send VOID" in to_html, "to Send VOID copy missing"
print("[ok] participant VOID send surfaces render")
PY

echo
echo "=== [7] final remote truth ==="
jget "$REMOTE_NODE_BASE/__void/ready.json" 10 | tee "$OUT_DIR/ready.after.json"
echo
jget "$REMOTE_RELAYER_BASE/health" 10 | tee "$OUT_DIR/relayer.after.json"

python3 - "$OUT_DIR/ready.after.json" "$OUT_DIR/relayer.after.json" <<'PY'
import json, pathlib, sys
ready = json.loads(pathlib.Path(sys.argv[1]).read_text())
rel = json.loads(pathlib.Path(sys.argv[2]).read_text())
assert ready.get("ready") is True, "remote ready != true after void send proof"
assert rel.get("ok") is True, "relayer health not ok after void send proof"
print("[ok] remote final truth clean")
PY

echo
echo "[ok] two-box VOID send execution proof green"
echo "out=$OUT_DIR"
