#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-buy-void-clarity-proof.html"
CONFIG="/tmp/void-participant-buy-void-clarity-config.json"
STATUS="/tmp/void-participant-buy-void-clarity-status.json"
SALE="/tmp/void-participant-buy-void-clarity-sale.json"
RAIL_STATE="/tmp/void-participant-buy-void-clarity-rail-state.txt"

validate_participant_copy_for_rail_state() {
  local rail_state="$1"
  local html_file="$2"

  case "$rail_state" in
    hold)
      grep -Fqi 'Presale request intake is not activated' "$html_file" ||
        { echo "[fail] HOLD participant copy lacks explicit not-activated warning" >&2; return 1; }
      for forbidden in         'Base native USDC only now'         'Base USDC active'         'Base USDC · ETH pending'         'Base · ETH pending'         'Base request intake is OPEN'         'Base and Ethereum request intake are OPEN'
      do
        if grep -Fq "$forbidden" "$html_file"; then
          echo "[fail] HOLD participant copy still advertises active rail: $forbidden" >&2
          return 1
        fi
      done
      ;;
    base_open_ethereum_hold)
      grep -Fq 'Base request intake is OPEN' "$html_file" ||
        grep -Fq 'Base native USDC only now' "$html_file" ||
        { echo "[fail] Base-only participant copy lacks Base OPEN claim" >&2; return 1; }
      grep -Fq 'Ethereum native USDC is approved but NOT ACTIVE until OPEN' "$html_file" ||
        { echo "[fail] Base-only participant copy lost Ethereum HOLD warning" >&2; return 1; }
      if grep -Fq 'Base and Ethereum request intake are OPEN' "$html_file"; then
        echo "[fail] Base-only participant copy falsely claims dual-rail OPEN" >&2
        return 1
      fi
      ;;
    base_and_ethereum_open)
      grep -Fq 'Base and Ethereum request intake are OPEN' "$html_file" ||
        { echo "[fail] dual-rail participant copy lacks explicit dual OPEN claim" >&2; return 1; }
      for forbidden in         'Ethereum native USDC is approved but NOT ACTIVE until OPEN'         'Base native USDC only now'         'Base USDC active'         'Base USDC · ETH pending'         'Base · ETH pending'
      do
        if grep -Fq "$forbidden" "$html_file"; then
          echo "[fail] dual-rail participant copy retains stale single-rail claim: $forbidden" >&2
          return 1
        fi
      done
      ;;
    *)
      echo "[fail] unknown live rail state: $rail_state" >&2
      return 1
      ;;
  esac
}

if [[ "${VOID_PARTICIPANT_BUY_VOID_CLARITY_FIXTURE_MODE:-0}" == "1" ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  printf '%s\n'     'Presale request intake is not activated. Do not send funds.'     > "$tmp/hold-good.html"
  validate_participant_copy_for_rail_state hold "$tmp/hold-good.html"

  printf '%s\n'     'Presale request intake is not activated. Base USDC active.'     > "$tmp/hold-bad.html"
  if validate_participant_copy_for_rail_state hold "$tmp/hold-bad.html"; then
    echo "[fail] HOLD contradiction fixture unexpectedly passed" >&2
    exit 1
  fi

  printf '%s\n'     'Base request intake is OPEN.'     'Ethereum native USDC is approved but NOT ACTIVE until OPEN.'     > "$tmp/base-good.html"
  validate_participant_copy_for_rail_state     base_open_ethereum_hold "$tmp/base-good.html"

  printf '%s\n'     'Base and Ethereum request intake are OPEN.'     > "$tmp/dual-good.html"
  validate_participant_copy_for_rail_state     base_and_ethereum_open "$tmp/dual-good.html"

  printf '%s\n'     'Base and Ethereum request intake are OPEN.'     'Base USDC · ETH pending'     > "$tmp/dual-bad.html"
  if validate_participant_copy_for_rail_state     base_and_ethereum_open "$tmp/dual-bad.html"; then
    echo "[fail] dual-rail contradiction fixture unexpectedly passed" >&2
    exit 1
  fi

  echo "VOID_PARTICIPANT_BUY_VOID_CLARITY_FIXTURE_V1_GREEN"
  echo "hold_copy_case_green=true"
  echo "hold_active_claim_adversary_green=true"
  echo "base_open_ethereum_hold_case_green=true"
  echo "dual_rail_open_case_green=true"
  echo "dual_rail_pending_adversary_green=true"
  exit 0
fi

echo "=== Participant Buy VOID clarity proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] restart node to serve current source ==="
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-participant-buy-void-clarity-ready.json; then
    READY_OK=1
    break
  fi
  sleep 1
done
test "$READY_OK" = "1"

cat /tmp/void-participant-buy-void-clarity-ready.json
echo

python3 - /tmp/void-participant-buy-void-clarity-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] rendered Buy VOID safety copy ==="
curl -fsS "$BASE/participant" > "$HTML"

grep -q 'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1' "$HTML"
grep -q 'Guided Base or Ethereum USDC request only' "$HTML"
grep -q 'create a Buy VOID request first' "$HTML"
grep -q 'use a self-custody wallet' "$HTML"
grep -q 'exchange/custodial sends and blind direct deposits are not supported' "$HTML"
grep -q 'payment confirmation is not VOID fulfillment' "$HTML"

echo "[ok] Buy VOID public safety copy rendered"

echo
echo "=== [4] live rail state matches the checkout contract ==="
curl -fsS "$BASE/__void/buy-void/config.json" > "$CONFIG"
curl -fsS "$BASE/__void/buy-void/status.json" > "$STATUS"
curl -fsS "$BASE/__void/buy-void/sale-state.json" > "$SALE"

python3 - "$CONFIG" "$STATUS" "$SALE" "$RAIL_STATE" <<'PY'
import json, sys

config=json.load(open(sys.argv[1]))
status=json.load(open(sys.argv[2]))
sale=json.load(open(sys.argv[3]))
state_path=sys.argv[4]

assert config.get("marker") == "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1", config
assert config.get("schema") == "void_public_buy_void_config_v1", config
assert status.get("schema") == "void_public_buy_void_status_v1", status
assert status.get("ok") is True, status
assert sale.get("schema") == "void_buy_void_sale_state_v1", sale
assert sale.get("ok") is True, sale
assert isinstance(config.get("requests_enabled"), bool), config
assert isinstance(config.get("ethereum_requests_enabled"), bool), config
assert isinstance(config.get("payment_ready"), bool), config
assert isinstance(status.get("request_intake_ready"), bool), status
assert isinstance(sale.get("sold_out"), bool), sale

if status["request_intake_ready"]:
    assert config["requests_enabled"] is True, (config, status)
    assert config["payment_ready"] is True, (config, status)

remaining = sale.get("remaining_void")
assert isinstance(remaining, (int, float)) and not isinstance(remaining, bool), sale
assert remaining >= 0, sale

open_now = (
    status["request_intake_ready"]
    and not sale["sold_out"]
    and remaining > 0
)
if not open_now:
    rail_state = "hold"
elif config["ethereum_requests_enabled"]:
    rail_state = "base_and_ethereum_open"
else:
    rail_state = "base_open_ethereum_hold"

print(f"live_buy_rail_state={rail_state}")
print(f"live_requests_enabled={str(config['requests_enabled']).lower()}")
print(f"live_ethereum_requests_enabled={str(config['ethereum_requests_enabled']).lower()}")
print(f"live_request_intake_ready={str(status['request_intake_ready']).lower()}")
with open(state_path, "w", encoding="utf-8") as handle:
    handle.write(rail_state + "\n")
PY

rail_state="$(cat "$RAIL_STATE")"
validate_participant_copy_for_rail_state "$rail_state" "$HTML"
echo "participant_copy_live_rail_state_bound=true"
echo "participant_hold_copy_bound=true"
echo "participant_dual_rail_contradiction_rejected=true"

node scripts/prove_void_app_buy_presale_readonly_v1.mjs
echo "[ok] live rail state + participant rendering contract"

echo
echo "=== [5] status smoke stays green ==="
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Participant Buy VOID clarity proof passed"
