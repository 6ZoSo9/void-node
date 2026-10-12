#!/usr/bin/env bash
set -euo pipefail

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1"
doc="docs/private/usdc-void-buy-pool-automatic-payment-live-path-terminal-readiness-rollup-hold-v1.md"
fixture="fixtures/private/usdc-void-buy-pool-automatic-payment-live-path-terminal-readiness-rollup-hold-v1.json"

echo "${marker}_PROOF_BEGIN"

test -f "$doc"
test -f "$fixture"

grep -Fq "$marker" "$doc"
grep -Fq "$marker" "$fixture"

echo "automatic_payment_live_path_terminal_readiness_rollup_hold_doc_green=true"
echo "automatic_payment_live_path_terminal_readiness_rollup_hold_fixture_green=true"

public_refs="$(git grep -l -F "$marker" -- src docs/public fixtures/public || true)"

unexpected_public_refs="$(
  printf '%s\n' "$public_refs" | awk '
    NF &&
    $0 != "src/index.ts" &&
    $0 != "docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-v1.md" &&
    $0 != "docs/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-discovery-v1.md" &&
    $0 != "fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-discovery-v1.json" &&
    $0 != "fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-status-card-v1.json" {
      print
    }
  '
)"

if [ -n "$unexpected_public_refs" ]; then
  echo "automatic_payment_live_path_terminal_readiness_rollup_hold_public_leak=false"
  printf '%s\n' "$unexpected_public_refs"
  exit 1
fi

echo "automatic_payment_live_path_terminal_readiness_rollup_hold_public_status_card_reference_allowed=true"
echo "automatic_payment_live_path_terminal_readiness_rollup_hold_public_discovery_reference_allowed=true"
echo "automatic_payment_live_path_terminal_readiness_rollup_hold_private_only_green=true"

node - "$fixture" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const j = JSON.parse(fs.readFileSync(file, "utf8"));

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

assert(j.marker === "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1", "bad marker");
assert(j.status === "terminal_rollup_hold_only", "bad status");
assert(j.visibility === "private", "bad visibility");
assert(j.public_safe === false, "public_safe must be false");
assert(j.private_only === true, "private_only must be true");

assert(j.authority && typeof j.authority === "object", "missing authority object");
for (const [k, v] of Object.entries(j.authority)) {
  assert(v === false, `authority ${k} must be false`);
}

assert(j.terminal_rollup.activation_enabled === false, "activation must remain disabled");
assert(j.terminal_rollup.runtime_enabled === false, "runtime must remain disabled");
assert(j.terminal_rollup.wallet_values_exposed === false, "wallet values must remain withheld");
assert(j.terminal_rollup.signer_values_exposed === false, "signer values must remain withheld");
assert(j.terminal_rollup.receiver_values_exposed === false, "receiver values must remain withheld");
assert(j.terminal_rollup.buyer_execution_enabled === false, "buyer execution must remain disabled");
assert(j.terminal_rollup.public_mutation_enabled === false, "public mutation must remain disabled");

assert(Array.isArray(j.required_prerequisite_markers), "missing prerequisite markers");
assert(j.required_prerequisite_markers.length === 14, "expected 14 prerequisite markers");
assert(Array.isArray(j.required_prerequisite_proofs), "missing prerequisite proofs");
assert(j.required_prerequisite_proofs.length === 14, "expected 14 prerequisite proofs");

assert(Array.isArray(j.reject_states), "missing reject states");
for (const state of [
  "auto_enable_without_operator_activation_packet",
  "auto_enable_without_signer_authorization",
  "auto_enable_without_wallet_policy",
  "auto_enable_without_receiver_allowlist_confirmation",
  "auto_enable_without_duplicate_payment_guard",
  "auto_enable_without_amount_rate_policy",
  "auto_enable_without_inventory_underflow_guard",
  "auto_enable_with_public_mutation",
  "auto_enable_with_buyer_execution",
  "auto_enable_with_secret_values_exposed"
]) {
  assert(j.reject_states.includes(state), `missing reject state ${state}`);
}

for (const [k, v] of Object.entries(j.activation_blockers)) {
  assert(v === true, `activation blocker ${k} must be true`);
}
NODE

echo "automatic_payment_live_path_terminal_readiness_rollup_hold_json_semantics_green=true"
echo "automatic_payment_live_path_terminal_readiness_rollup_hold_authority_false_green=true"
echo "automatic_payment_live_path_terminal_readiness_rollup_hold_activation_blockers_green=true"

required_markers=(
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_VERIFIED_RECEIPT_PARSER_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_DUPLICATE_PAYMENT_GUARD_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_AMOUNT_RATE_POLICY_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_INVENTORY_RESERVE_DECREMENT_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ALLOCATION_CLAIM_CREATION_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_RECORD_CREATION_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_EXECUTION_AUTHORIZATION_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_TRANSFER_INSTRUCTION_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_SIGNER_AUTHORIZATION_LIVE_PATH_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_FULFILLMENT_WALLET_POLICY_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_RECEIVER_ALLOWLIST_CONFIRMATION_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_OPERATOR_ACTIVATION_PACKET_HOLD_V1"
  "VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1"
  "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1"
)

for m in "${required_markers[@]}"; do
  grep -Fq "$m" "$doc"
  grep -Fq "$m" "$fixture"
done

echo "automatic_payment_live_path_terminal_readiness_rollup_hold_prerequisite_markers_green=true"

required_proofs=(
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-verified-receipt-parser-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-duplicate-payment-guard-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-amount-rate-policy-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-inventory-reserve-decrement-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-allocation-claim-creation-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-record-creation-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-execution-authorization-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-transfer-instruction-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-signer-authorization-live-path-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-fulfillment-wallet-policy-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-receiver-allowlist-confirmation-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-operator-activation-packet-hold-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-dual-chain-usdc-acceptance-allowlist-v1-proof.sh"
  "ops/mainnet0/usdc-void-buy-pool-automatic-payment-enablement-preflight-closeout-v1-proof.sh"
)

for p in "${required_proofs[@]}"; do
  test -x "$p"
  grep -Fq "$p" "$fixture"
done

echo "automatic_payment_live_path_terminal_readiness_rollup_hold_prerequisite_proofs_green=true"

echo "${marker}_GREEN"
