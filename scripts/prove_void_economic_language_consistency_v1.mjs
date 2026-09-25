#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const files = {
  coupled:
    "docs/operators/coupled-presale-wc-void-native-gas-liability-v1.md",
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
  "wcReadiness",
  "wcOpening",
  "presaleActivation",
  "presaleConfig",
  "presaleGas",
  "separation",
  "distribution",
]) {
  assert.match(
    text[key],
    /native gas/i,
    key + " must distinguish native gas",
  );
}

assert.match(text.wcOpening, /canonical Chain-2050 `VoidToken`/);
assert.doesNotMatch(
  text.wcOpening,
  /base asset: native Chain-2050 `VOID`/,
);
assert.match(
  text.coupled,
  /one cross-lane native-gas reservation journal **and one cross-lanes+nonce scheduler**/m,
);
assert.match(
  text.coupled,
  /full 10,000,000-VOID sale can finish/i,
);
assert.match(
  text.coupled,
  /opening WC -> VoidToken settlement/i,
);
assert.match(
  text.coupled,
  /VOID -> WC reverse/i,
);
assert.match(
  text.coupled,
  /Source-chain customer refunds are a separate economic and fee domain/i,
);
assert.match(
  text.coupled,
  /terminal receipt.*finality/is,
);

for (const marker of [
  "coupled_native_nonce_scheduler_required",
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

assert.match(
  text.separation,
  /historical relayer's WC-retaineds+service fee and default-relayer gas mode are development history only/m,
);
assert.match(
  text.distribution,
  /retired fixed-rate WC settlement scripts and the dev WC relayer remains+historical/regression artifacts/m,
);
assert.match(
  text.fixedRateGuard,
  /VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY/,
);
assert.match(text.legacyRelayer, /Local WC redeemed/);

// Historical evidence may contain retired semantics, but current production
// classifiers may not import or execute those paths.
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
console.log("wc_void_opening_fee_scope_explicit=true");
console.log("wc_void_reverse_settlement_still_required=true");
