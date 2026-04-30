#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MODE="${MODE:-create}"                  # create | claim
BASE="${BASE:-http://127.0.0.1:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
AMOUNT_USDC="${AMOUNT_USDC:-25}"
RPC_URL="${RPC_URL:-https://mainnet.base.org}"
TOKEN_ADDRESS="${TOKEN_ADDRESS:-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913}"
RECEIVER_ADDRESS="${RECEIVER_ADDRESS:-}"
OUT_JSON="${OUT_JSON:-/tmp/buy-void-base-claim-tx-real-proof.$(date +%Y%m%d-%H%M%S).json}"
WATCH_ID="${WATCH_ID:-}"
QUEUE_ID="${QUEUE_ID:-}"
REQUEST_ID="${REQUEST_ID:-}"
TX_HASH="${TX_HASH:-}"

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing command: $1"; exit 1; }; }
need_cmd curl
need_cmd python3

is_placeholder() {
  case "${1:-}" in
    ''|REPLACE_WITH_*|PASTE_REAL_*|REAL_TX_HASH_GOES_HERE|0xYOUR_REAL_BASE_TX_HASH|0xREAL_BASE_TX_HASH_HERE|0xPUT_THE_REAL_BASE_TX_HASH_HERE)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

require_real() {
  local name="$1"
  local value="$2"
  if is_placeholder "$value"; then
    echo "[ERR] ${name} is placeholder or empty"
    exit 1
  fi
}

require_evm_addr() {
  local name="$1"
  local value="$2"
  python3 - "$name" "$value" <<'PY'
import re, sys
name, value = sys.argv[1], sys.argv[2]
if not re.fullmatch(r"0x[a-fA-F0-9]{40}", value or ""):
    raise SystemExit(f"[ERR] {name} is not a valid EVM address: {value}")
print(f"[ok] {name} looks valid")
PY
}

require_tx_hash() {
  local value="$1"
  python3 - "$value" <<'PY'
import re, sys
value = sys.argv[1]
if not re.fullmatch(r"0x[a-fA-F0-9]{64}", value or ""):
    raise SystemExit(f"[ERR] TX_HASH is not a valid 32-byte tx hash: {value}")
print("[ok] TX_HASH looks valid")
PY
}

rpc_preflight() {
  echo "=== [rpc] Base RPC preflight ==="
  python3 - "$RPC_URL" <<'PY'
import json, sys, urllib.request
url = sys.argv[1]
body = json.dumps({"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}).encode()
req = urllib.request.Request(url, data=body, headers={"content-type":"application/json","user-agent":"void-mainnet0-proof/1.0"})
with urllib.request.urlopen(req, timeout=20) as r:
    j = json.loads(r.read().decode())
print(json.dumps(j, indent=2))
chain = str(j.get("result","")).lower()
assert chain == "0x2105", chain
print("[ok] Base chainId is 8453")
PY
}

write_out_json_create() {
  python3 - "$OUT_JSON" "$ACCOUNT" "$AMOUNT_USDC" "$RPC_URL" "$TOKEN_ADDRESS" "$RECEIVER_ADDRESS" "$WALLET" "$REQUEST_ID" "$QUEUE_ID" "$WATCH_ID" "$CREATE_JSON" "$QUEUE_JSON" "$WATCH_JSON" <<'PY'
import json, sys
(out_json, account, amount_usdc, rpc_url, token_address, receiver_address,
 wallet, request_id, queue_id, watch_id, create_json, queue_json, watch_json) = sys.argv[1:14]
obj = {
  "ok": True,
  "mode": "create",
  "base": {
    "account": account,
    "amount_usdc": amount_usdc,
    "rpc_url": rpc_url,
    "token_address": token_address,
    "receiver_address": receiver_address,
    "wallet": wallet,
  },
  "request_id": request_id,
  "queue_id": queue_id,
  "watch_id": watch_id,
  "create": json.loads(create_json),
  "queue": json.loads(queue_json),
  "watch": json.loads(watch_json),
}
open(out_json, "w").write(json.dumps(obj, indent=2) + "\n")
print(f"[ok] wrote {out_json}")
PY
}

write_out_json_claim() {
  python3 - "$OUT_JSON" "$TX_HASH" "$CLAIM_JSON" "$WATCH_STATUS_JSON" "$QUEUE_STATUS_JSON" <<'PY'
import json, sys, pathlib
out_json, tx_hash, claim_json, watch_status_json, queue_status_json = sys.argv[1:6]
p = pathlib.Path(out_json)
obj = {}
if p.exists():
    obj = json.loads(p.read_text())
obj["claim"] = json.loads(claim_json)
obj["watch_status_after_claim"] = json.loads(watch_status_json)
obj["queue_status_after_claim"] = json.loads(queue_status_json)
obj["tx_hash"] = tx_hash
obj["mode"] = "claim"
p.write_text(json.dumps(obj, indent=2) + "\n")
print(f"[ok] updated {out_json}")
PY
}

extract_from_out_json_if_needed() {
  if [ -n "${OUT_JSON:-}" ] && [ -f "$OUT_JSON" ]; then
    if [ -z "${WATCH_ID:-}" ]; then
      WATCH_ID="$(python3 - "$OUT_JSON" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j.get("watch_id",""))
PY
)"
    fi
    if [ -z "${QUEUE_ID:-}" ]; then
      QUEUE_ID="$(python3 - "$OUT_JSON" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j.get("queue_id",""))
PY
)"
    fi
    if [ -z "${REQUEST_ID:-}" ]; then
      REQUEST_ID="$(python3 - "$OUT_JSON" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j.get("request_id",""))
PY
)"
    fi
  fi
}

if [ "$MODE" = "create" ]; then
  echo "=== [0] create mode preflight ==="
  require_real "RPC_URL" "$RPC_URL"
  require_real "TOKEN_ADDRESS" "$TOKEN_ADDRESS"
  require_real "RECEIVER_ADDRESS" "$RECEIVER_ADDRESS"
  require_evm_addr "TOKEN_ADDRESS" "$TOKEN_ADDRESS"
  require_evm_addr "RECEIVER_ADDRESS" "$RECEIVER_ADDRESS"
  rpc_preflight
  echo

  echo "=== [1] set real Base watcher config ==="
  CFG_JSON="$(curl -fsS -H 'content-type: application/json' \
    -d "$(python3 - <<PY
import json
print(json.dumps({
  "enabled": True,
  "mode": "artifact_worker",
  "chain": "base",
  "asset": "base_native_usdc",
  "receiver_address": "${RECEIVER_ADDRESS}",
  "rpc_url": "${RPC_URL}",
  "token_address": "${TOKEN_ADDRESS}",
  "token_decimals": 6,
  "confirmations_required": 1
}))
PY
)" \
    "${BASE}/__void/operator/buy-void/base-watcher/config")"
  printf '%s\n' "$CFG_JSON" | python3 -m json.tool
  echo

  echo "=== [2] participant wallet ==="
  WALLET_JSON="$(curl -fsS "${BASE}/__void/participant/wallet/status?account=${ACCOUNT}")"
  VOID_JSON_IN="$WALLET_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
assert j.get("ok") is True, j
assert j.get("has_wallet") is True, j
assert j.get("address"), j
PY
  WALLET="$(printf '%s\n' "$WALLET_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("address",""))')"
  echo "wallet=$WALLET"
  echo

  echo "=== [3] create fresh request ==="
  CREATE_JSON="$(curl -fsS -H 'content-type: application/json' \
    -d "{\"account\":\"${ACCOUNT}\",\"delivery_wallet\":\"${WALLET}\",\"requested_amount_usdc\":\"${AMOUNT_USDC}\"}" \
    "${BASE}/__void/participant/buy-void/request")"
  VOID_JSON_IN="$CREATE_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
assert j.get("ok") is True, j
req=j.get("request") or {}
assert req.get("request_id"), req
assert str(req.get("status","")) == "draft_ready", req
PY
  REQUEST_ID="$(printf '%s\n' "$CREATE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("request") or {}).get("request_id",""))')"
  echo "request_id=$REQUEST_ID"
  echo

  echo "=== [4] queue fresh request ==="
  QUEUE_JSON="$(curl -fsS -H 'content-type: application/json' \
    -d "{\"request_id\":\"${REQUEST_ID}\",\"operator_note\":\"queued for real Base claim proof\"}" \
    "${BASE}/__void/operator/buy-void/queue")"
  VOID_JSON_IN="$QUEUE_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
assert j.get("ok") is True, j
q=j.get("queued") or {}
assert q.get("queue_id"), q
assert str(q.get("operator_status","")) == "queued", q
PY
  QUEUE_ID="$(printf '%s\n' "$QUEUE_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("queued") or {}).get("queue_id",""))')"
  echo "queue_id=$QUEUE_ID"
  echo

  echo "=== [5] create fresh watch target ==="
  WATCH_JSON="$(curl -fsS -H 'content-type: application/json' \
    -d "{\"queue_id\":\"${QUEUE_ID}\",\"operator_note\":\"fresh watch target for real Base claim proof\"}" \
    "${BASE}/__void/operator/buy-void/watch-targets")"
  VOID_JSON_IN="$WATCH_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
assert j.get("ok") is True, j
w=j.get("watch") or {}
assert w.get("watch_id"), w
assert str(w.get("watch_status","")) == "watch_target_created", w
PY
  WATCH_ID="$(printf '%s\n' "$WATCH_JSON" | python3 -c 'import sys,json; j=json.load(sys.stdin); print((j.get("watch") or {}).get("watch_id",""))')"
  echo "watch_id=$WATCH_ID"
  echo

  echo "=== [6] verify fresh watch captured real receiver ==="
  WATCH_STATUS_JSON="$(curl -fsS "${BASE}/__void/operator/buy-void/watch-targets/status?watch_id=${WATCH_ID}")"
  VOID_JSON_IN="$WATCH_STATUS_JSON" python3 - "$RECEIVER_ADDRESS" <<'PY'
import json, os, sys
receiver = sys.argv[1]
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
w=j.get("watch") or {}
assert w.get("watch_id"), w
assert w.get("watch_status") == "watch_target_created", w
assert w.get("receiver_address") == receiver, w
print("[ok] fresh watch captured real receiver")
PY
  echo

  write_out_json_create
  echo
  echo "=== [7] summary ==="
  echo "OUT_JSON=$OUT_JSON"
  echo "REQUEST_ID=$REQUEST_ID"
  echo "QUEUE_ID=$QUEUE_ID"
  echo "WATCH_ID=$WATCH_ID"
  echo
  echo "Next step after payment:"
  echo "MODE=claim OUT_JSON='$OUT_JSON' TX_HASH='0x...real hash...' bash ops/mainnet/buy-void-base-claim-tx-real-proof.sh"

elif [ "$MODE" = "claim" ]; then
  echo "=== [0] claim mode preflight ==="
  extract_from_out_json_if_needed
  require_real "WATCH_ID" "${WATCH_ID:-}"
  require_real "QUEUE_ID" "${QUEUE_ID:-}"
  require_real "TX_HASH" "${TX_HASH:-}"
  require_tx_hash "$TX_HASH"
  echo "WATCH_ID=$WATCH_ID"
  echo "QUEUE_ID=$QUEUE_ID"
  echo "OUT_JSON=$OUT_JSON"
  echo

  echo "=== [1] claim real Base tx ==="
  CLAIM_JSON="$(curl -sS -X POST -H 'content-type: application/json' \
    -d "{\"watch_id\":\"${WATCH_ID}\",\"payment_ref\":\"${TX_HASH}\",\"operator_note\":\"real base usdc verification proof\"}" \
    "${BASE}/__void/operator/buy-void/base-watcher/claim-tx")"
  VOID_JSON_IN="$CLAIM_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
assert j.get("ok") is True, j
w = j.get("watch") or {}
assert w.get("watch_id"), w
assert w.get("watch_status") == "payment_confirmed_recorded", w
qus = j.get("queue_updates") or []
assert qus and qus[-1].get("operator_status") == "payment_confirmed", qus
print("[ok] claim response looks good")
PY
  echo

  echo "=== [2] verify final watch truth ==="
  WATCH_STATUS_JSON="$(curl -sS "${BASE}/__void/operator/buy-void/watch-targets/status?watch_id=${WATCH_ID}")"
  VOID_JSON_IN="$WATCH_STATUS_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
w=j.get("watch") or {}
assert j.get("ok") is True, j
assert w.get("watch_status") == "payment_confirmed_recorded", w
print("[ok] final watch truth ok")
PY
  echo

  echo "=== [3] verify final queue truth ==="
  QUEUE_STATUS_JSON="$(curl -sS "${BASE}/__void/operator/buy-void/queue/status?queue_id=${QUEUE_ID}")"
  VOID_JSON_IN="$QUEUE_STATUS_JSON" python3 - <<'PY'
import json, os, sys
j=json.loads(os.environ["VOID_JSON_IN"])
print(json.dumps(j, indent=2))
q=j.get("queued") or {}
assert j.get("ok") is True, j
assert q.get("operator_status") == "payment_confirmed", q
print("[ok] final queue truth ok")
PY
  echo

  write_out_json_claim
  echo
  echo "[ok] real Base claim proof passed"
  echo "Suggested tag command:"
  echo "TAG=\"ckpt-buy-void-base-claim-tx-real-proof-green-\$(date +%Y%m%d-%H%M%S)\" && git tag \"\$TAG\" && git push origin \"\$TAG\" && echo \"tag=\$TAG\""
else
  echo "[ERR] MODE must be create or claim"
  exit 1
fi
