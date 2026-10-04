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

validate_participant_static_copy() {
  local html_file="$1"

  for required in \
    'Base or Ethereum native USDC by live request only' \
    'use only its returned rail' \
    'Base / Ethereum · activation-gated'
  do
    grep -Fq "$required" "$html_file" || {
      echo "[fail] participant static copy lost rail-neutral token: $required" >&2
      return 1
    }
  done

  for forbidden in \
    'Current checkout is Base native USDC' \
    'Base native USDC only now' \
    'Base native USDC now' \
    'Base USDC active' \
    'Base USDC preflight ready' \
    'Base USDC · ETH pending' \
    'Base · ETH pending' \
    'Base request intake is OPEN' \
    'Base and Ethereum request intake are OPEN' \
    'Ethereum native USDC is approved but NOT ACTIVE until OPEN' \
    'Presale request intake is not activated'
  do
    if grep -Fq "$forbidden" "$html_file"; then
      echo "[fail] participant static copy contains state-specific rail claim: $forbidden" >&2
      return 1
    fi
  done
}

if [[ "${VOID_PARTICIPANT_BUY_VOID_CLARITY_FIXTURE_MODE:-0}" == "1" ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  cat > "$tmp/neutral-good.html" <<'HTML'
Base or Ethereum native USDC by live request only
use only its returned rail
Base / Ethereum · activation-gated
HTML
  validate_participant_static_copy "$tmp/neutral-good.html"

  for stale_claim in \
    'Current checkout is Base native USDC' \
    'Base native USDC now' \
    'Base USDC · ETH pending' \
    'Base request intake is OPEN' \
    'Base and Ethereum request intake are OPEN' \
    'Ethereum native USDC is approved but NOT ACTIVE until OPEN' \
    'Presale request intake is not activated'
  do
    {
      cat "$tmp/neutral-good.html"
      printf '%s\n' "$stale_claim"
    } > "$tmp/neutral-bad.html"
    if validate_participant_static_copy "$tmp/neutral-bad.html"; then
      echo "[fail] state-specific participant fixture unexpectedly passed: $stale_claim" >&2
      exit 1
    fi
  done

  echo "VOID_PARTICIPANT_BUY_VOID_CLARITY_FIXTURE_V1_GREEN"
  echo "participant_static_copy_rail_neutral=true"
  echo "participant_state_specific_claim_adversary_green=true"

  python3 - "$PWD/src/index.ts" <<'PY'
from pathlib import Path
import sys

source=Path(sys.argv[1]).read_text(encoding="utf-8")
marker="VOID_BUY_PUBLIC_SAFETY_CLARITY_V1"
assert marker in source, "participant safety marker missing"

required=[
  "Base or Ethereum native USDC by live request only",
  'setText("buyRailStatus", "Activation-gated")',
  'setText("buyPlanRail", "Request-returned rail")',
  "Use only a live request's returned Base or Ethereum rail",
  "Checkout is activation-gated. Use only a live request's returned rail. Self-custody only.",
  'accepted_asset: "native_usdc"',
  'current_checkout_chain: "request_returned"',
  'ethereum_usdc_status: "activation_gated"',
]
for token in required:
    assert token in source, f"missing rail-neutral participant source: {token}"

for forbidden in [
  "Current checkout is Base native USDC",
  'accepted_asset: "base_native_usdc"',
  'current_checkout_chain: "base"',
  'ethereum_usdc_status: "approved_not_active"',
  "Base native USDC only now",
  "Base native USDC now",
  "Base USDC active",
  "Base USDC preflight ready",
  "Base USDC · ETH pending",
  "Base · ETH pending",
  "Base request intake is OPEN",
  "Base and Ethereum request intake are OPEN",
  "Ethereum native USDC is approved but NOT ACTIVE until OPEN",
]:
    assert forbidden not in source, f"stale participant rail claim: {forbidden}"

print("participant_actual_source_rail_neutral=true")
print("participant_handoff_payload_rail_neutral=true")
PY

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
grep -Fq 'Guided Base or Ethereum USDC request only' "$HTML"
grep -Fq 'Base or Ethereum native USDC by live request only' "$HTML"
grep -Fq 'request first' "$HTML"
grep -Fq 'self-custody only' "$HTML"
grep -Fq 'no exchange/custodial or blind deposits' "$HTML"
grep -Fq 'payment confirmation is not VOID fulfillment' "$HTML"

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
assert isinstance(config.get("receiver_binding_green"), bool), config
assert isinstance(status.get("request_intake_ready"), bool), status
assert isinstance(sale.get("sold_out"), bool), sale

if status["request_intake_ready"]:
    assert config["requests_enabled"] is True, (config, status)
    assert config["payment_ready"] is True, (config, status)
    assert config["receiver_binding_green"] is True, (config, status)

remaining = sale.get("remaining_void")
assert isinstance(remaining, (int, float)) and not isinstance(remaining, bool), sale
assert remaining >= 0, sale

open_now = (
    status["request_intake_ready"]
    and config["requests_enabled"]
    and config["payment_ready"]
    and config["receiver_binding_green"]
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
print(f"live_receiver_binding_green={str(config['receiver_binding_green']).lower()}")
with open(state_path, "w", encoding="utf-8") as handle:
    handle.write(rail_state + "\n")
PY

rail_state="$(cat "$RAIL_STATE")"
validate_participant_static_copy "$HTML"
echo "participant_live_rail_state=$rail_state"
echo "participant_static_copy_rail_neutral=true"
echo "participant_static_copy_state_claims_absent=true"

node scripts/prove_void_app_buy_presale_readonly_v1.mjs
echo "[ok] live rail state observed; static participant copy neutral; dynamic client states proven"

echo
echo "=== [5] status smoke stays green ==="
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Participant Buy VOID clarity proof passed"
