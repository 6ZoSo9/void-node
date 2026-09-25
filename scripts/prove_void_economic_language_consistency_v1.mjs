#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const flat = (value) => value.replace(/\s+/g, " ").trim();
const has = (source, literal, label) =>
  assert.ok(flat(source).includes(flat(literal)), label);

const files = {
  coupled:
    "docs/operators/coupled-presale-wc-void-native-gas-liability-v1.md",
  identity:
    "docs/operators/coupled-economic-execution-layer-identity-v1.md",
  wcReadiness:
    "docs/operators/wc-void-production-readiness-v1.md",
  wcOpening:
    "docs/operators/wc-void-coupled-opening-v1.md",
  presaleActivation:
    "docs/operators/buy-void-production-activation-evidence-v1.md",
  presaleConfig:
    "docs/operators/buy-void-payment-keyed-production-configuration-v1.md",
  presaleGas:
    "docs/operators/buy-void-presale-fulfillment-production-gas-attestation-v1.md",
  separation:
    "docs/architecture/void-presale-market-separation-audit-v1.md",
  distribution:
    "docs/architecture/void-market-distribution-policy-v1.md",
  wcClassifier:
    "tools/void-wc-void-production-readiness-v1.mjs",
  presaleContract:
    "src/economic/buy_void_payment_keyed_runtime_activation_configuration_contract_v1.ts",
  gasPolicy:
    "tools/void-coupled-native-gas-liability-v1.mjs",
  fixedRateGuard:
    "ops/private/wc-to-void-fixed-rate-v1-historical-replay-guard.sh",
  legacyRelayer:
    "ops/wc-relayer-v1.cjs",
};

const text = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

for (const key of [
  "coupled",
  "identity",
  "wcReadiness",
  "wcOpening",
  "presaleActivation",
  "presaleConfig",
  "presaleGas",
  "separation",
  "distribution",
]) {
  assert.match(text[key], /native[ -]gas/i, key + " must discuss native gas");
}

has(
  text.wcOpening,
  "canonical Chain-2050 `VoidToken`",
  "WC/VOID opening must identify canonical VoidToken",
);
assert.doesNotMatch(
  text.wcOpening,
  /base asset: native Chain-2050 `VOID`/i,
);

has(
  text.coupled,
  "one cross-lane native-gas reservation journal **and one cross-lane nonce scheduler**",
  "coupled policy must require one gas journal and nonce scheduler",
);
has(
  text.coupled,
  "full 10,000,000-VOID sale can finish",
  "coupled policy must distinguish per-obligation from lifetime gas capacity",
);
has(
  text.coupled,
  "opening WC -> VoidToken settlement",
  "coupled policy must scope opening settlement direction",
);
has(
  text.coupled,
  "VOID -> WC reverse",
  "coupled policy must retain reverse-settlement gate",
);
has(
  text.coupled,
  "Source-chain customer refunds are a separate economic and fee domain",
  "refund fees must stay separate",
);
has(
  text.coupled,
  "terminal receipt finality",
  "gas reservation release must be finality-bound",
);
has(
  text.coupled,
  "microscopic purchases",
  "presale micro-purchase gas-grief boundary must be explicit",
);
has(
  text.coupled,
  "micro-trade protection",
  "WC/VOID micro-trade gas-grief boundary must be explicit",
);
has(
  text.coupled,
  "economic execution-layer identity and public-verification model are resolved",
  "final presale blocker checklist must include execution-layer identity",
);
has(
  text.coupled,
  "participants can independently verify, control, and later transfer/use delivered `VoidToken`",
  "final presale blocker checklist must include participant token control",
);

for (const marker of [
  "coupled_native_nonce_scheduler_required",
  "economic_execution_layer_identity_resolution_required",
  "economic_execution_layer_public_verification_required",
  "native_gas_currency_supply_accounting_required",
  "participant_post_purchase_voidtoken_control_required",
  "participant_voidtoken_transfer_submission_path_required",
  "participant_native_gas_access_or_paymaster_model_required",
  "presale_micro_purchase_gas_grief_protection_required",
  "wc_void_microtrade_gas_grief_protection_required",
  "fresh_fee_admission_guard_required",
  "gas_reservation_terminal_receipt_finality_release_guard_required",
  "presale_native_gas_lifetime_capacity_or_replenishment_required",
  "wc_void_native_gas_replenishment_or_user_paid_model_required",
  "wc_void_reverse_settlement_adapter_required",
]) {
  assert.ok(text.wcClassifier.includes(marker), marker);
}

for (const marker of [
  "coupled_native_nonce_scheduler_not_ready",
  "economic_execution_layer_identity_not_resolved",
  "economic_execution_layer_public_verification_not_ready",
  "native_gas_currency_supply_accounting_not_ready",
  "participant_post_purchase_voidtoken_control_not_ready",
  "participant_voidtoken_transfer_submission_path_not_ready",
  "participant_native_gas_access_or_paymaster_model_not_ready",
  "presale_micro_purchase_gas_grief_protection_not_ready",
  "fresh_fee_admission_guard_not_ready",
  "gas_reservation_terminal_receipt_finality_release_guard_not_ready",
  "presale_native_gas_lifetime_capacity_or_replenishment_not_ready",
  "paid_unreservable_customer_resolution_policy_not_ready",
]) {
  assert.ok(text.presaleContract.includes(marker), marker);
}

for (const marker of [
  "shared_payer_requires_single_cross_lane_nonce_scheduler",
  "fresh_fee_observation_required_before_admission",
  "gas_reservation_release_requires_terminal_receipt_finality",
  "presale_lifetime_capacity_or_replenishment_must_be_proven_before_activation",
  "ongoing_wc_void_requires_native_gas_replenishment_or_user_paid_model",
  "full_two_sided_wc_void_settlement_not_yet_proven",
]) {
  assert.ok(text.gasPolicy.includes(marker), marker);
}

for (const marker of [
  "economic_execution_layer_identity_resolved=false",
  "economic_execution_layer_public_verification_ready=false",
  "native_gas_currency_supply_accounting_ready=false",
  "participant_post_purchase_voidtoken_control_ready=false",
  "participant_voidtoken_transfer_submission_path_ready=false",
  "participant_native_gas_access_or_paymaster_model_ready=false",
]) {
  assert.ok(text.identity.includes(marker), marker);
}

has(
  text.separation,
  "historical relayer's WC-retained service fee and default-relayer gas mode are development history only",
  "legacy relayer semantics must be classified as history",
);
has(
  text.distribution,
  "retired fixed-rate WC settlement scripts and the dev WC relayer remain historical/regression artifacts",
  "fixed-rate/dev-relayer artifacts must be classified as history",
);
assert.match(
  text.fixedRateGuard,
  /VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY/,
);
assert.match(text.legacyRelayer, /Local WC redeemed/);

for (const currentPath of [
  "tools/void-wc-void-production-readiness-v1.mjs",
  "tools/void-wc-void-coupled-opening-v1.mjs",
  "src/economic/buy_void_payment_keyed_runtime_activation_configuration_contract_v1.ts",
  "tools/void-coupled-native-gas-liability-v1.mjs",
]) {
  const current = read(currentPath);
  assert.doesNotMatch(current, /ops\/wc-relayer-v1\.cjs/);
  assert.doesNotMatch(
    current,
    /ops\/private\/wc-to-void-settlement-preview-v1\.sh/,
  );
  assert.doesNotMatch(current, /100\s*WC\s*=\s*1\s*VOID/i);
}

console.log("VOID_ECONOMIC_LANGUAGE_CONSISTENCY_V1_PROOF_GREEN");
console.log("voidtoken_native_gas_separation_explicit=true");
console.log("historical_fixed_rate_artifacts_preserved=true");
console.log("historical_relayer_semantics_nonproduction=true");
console.log("cross_lane_nonce_scheduler_required=true");
console.log("fresh_fee_admission_required=true");
console.log("terminal_receipt_finality_release_required=true");
console.log("presale_lifetime_gas_capacity_claim_not_implied=true");
console.log("economic_execution_layer_identity_gate_required=true");
console.log("participant_post_purchase_token_control_required=true");
console.log("micro_obligation_gas_grief_protection_required=true");
console.log("wc_void_opening_fee_scope_explicit=true");
console.log("wc_void_reverse_settlement_still_required=true");
