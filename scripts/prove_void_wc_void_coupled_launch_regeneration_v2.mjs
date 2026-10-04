#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_AUTHORITY_V2,
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2,
  deriveVoidWcVoidCoupledLaunchRegenerationV2,
} from "../tools/void-wc-void-coupled-launch-regeneration-v2.mjs";

const first = deriveVoidWcVoidCoupledLaunchRegenerationV2();
const second = deriveVoidWcVoidCoupledLaunchRegenerationV2();

assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2,
  "VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2",
);
assert.equal(
  first.status,
  "CORRECTED_COUPLED_LAUNCH_GENERATION_DERIVED_NOT_APPLIED",
);
assert.equal(first.regeneration_id, second.regeneration_id);
assert.deepEqual(first, second);

assert.equal(
  first.superseded_generation.coupled_launch_id,
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
);
assert.equal(
  first.corrected_generation.coupled_launch_id,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(
  first.corrected_generation.vault_bytes32_id,
  "0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.match(
  first.corrected_generation.wc_opening_state_id,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.match(
  first.corrected_generation.reconciliation_id,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.notEqual(
  first.corrected_generation.wc_opening_state_id,
  first.superseded_generation.wc_opening_state_id,
);
assert.notEqual(
  first.corrected_generation.reconciliation_id,
  first.superseded_generation.reconciliation_id,
);

assert.equal(
  first.corrected_market_vault_identity.creation_bytecode_sha256,
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
);
assert.equal(
  first.corrected_market_vault_identity.runtime_template_sha256,
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
);
assert.equal(first.candidate_application.application_performed, false);
assert.equal(first.candidate_application.classifier_update_performed, false);
assert.equal(first.candidate_application.signer_domain_update_performed, false);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_AUTHORITY_V2,
)) {
  const allowed = new Set([
    "source_regeneration_plan_only",
    "canonical_source_read",
  ]);
  assert.equal(value, allowed.has(key), key);
}

console.log(
  "VOID_WC_VOID_COUPLED_LAUNCH_REGENERATION_V2_PROOF_GREEN",
);
console.log("regeneration_id=" + first.regeneration_id);
console.log(
  "corrected_coupled_launch_id=" +
    first.corrected_generation.coupled_launch_id,
);
console.log(
  "corrected_vault_bytes32_id=" +
    first.corrected_generation.vault_bytes32_id,
);
console.log(
  "corrected_wc_opening_state_id=" +
    first.corrected_generation.wc_opening_state_id,
);
console.log(
  "corrected_reconciliation_id=" +
    first.corrected_generation.reconciliation_id,
);
console.log("candidate_application_performed=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("funds_movement=false");
