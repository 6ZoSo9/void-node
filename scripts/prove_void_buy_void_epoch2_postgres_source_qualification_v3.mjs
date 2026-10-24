#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  CURRENT_SOURCE_BLOBS,
  HISTORICAL_V2_BLOBS,
  HISTORICAL_V2_CARRIER,
  MARKER,
  STATUS,
  classifyCurrentActivationCandidateV3,
  verifyCurrentEpoch2ClaimSourceV3,
} from "../tools/void-buy-void-epoch2-postgres-source-qualification-v3.mjs";

const activationPath =
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json";
const activation = JSON.parse(fs.readFileSync(activationPath, "utf8"));

assert.equal(
  HISTORICAL_V2_CARRIER,
  "6905658c3e7312771c3c7d0b77c5d609e7d08080",
);
assert.equal(Object.keys(HISTORICAL_V2_BLOBS).length, 6);
assert.equal(Object.keys(CURRENT_SOURCE_BLOBS).length, 28);
assert.equal(
  CURRENT_SOURCE_BLOBS[
    "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs"
  ],
  "f8281ffc9cfbfd2b810a11a10f8cb3ff8473fa95",
);
assert.equal(
  CURRENT_SOURCE_BLOBS[activationPath],
  "a03f6fd4d0f86024aa276aa3be9c1eb00fb4cef2",
);
assert.equal(
  CURRENT_SOURCE_BLOBS[
    "scripts/prove_buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts"
  ],
  "674de094c6750a1f7498fa06efa6f7571edb3151",
);

const accepted = classifyCurrentActivationCandidateV3(activation);
assert.equal(accepted.ok, true);
assert.equal(accepted.status, STATUS);
assert.equal(accepted.activation_authorized, false);
assert.equal(accepted.runtime_gate_mutation, false);
assert.equal(accepted.service_mutation, false);
assert.equal(accepted.transaction_broadcast, false);
assert.equal(accepted.funds_movement, false);

for (const [name, mutate, expected] of [
  [
    "enable_full_runtime",
    value => {
      value.observed_gate_state.full_runtime = "1";
    },
    "activation_candidate_not_dormant",
  ],
  [
    "enable_apply",
    value => {
      value.observed_gate_state.full_runtime_apply = "1";
    },
    "activation_candidate_not_dormant",
  ],
  [
    "authorize_activation",
    value => {
      value.authority.activation_authorized = true;
    },
    "activation_candidate_authority_expanded",
  ],
  [
    "authorize_service_mutation",
    value => {
      value.authority.service_mutation = true;
    },
    "activation_candidate_authority_expanded",
  ],
  [
    "authorize_broadcast",
    value => {
      value.authority.transaction_broadcast = true;
    },
    "activation_candidate_authority_expanded",
  ],
  [
    "authorize_funds",
    value => {
      value.authority.funds_movement = true;
    },
    "activation_candidate_authority_expanded",
  ],
  [
    "unknown_field",
    value => {
      value.unreviewed = true;
    },
    "activation_candidate_schema_changed",
  ],
]) {
  const changed = structuredClone(activation);
  mutate(changed);
  const result = classifyCurrentActivationCandidateV3(changed);
  assert.equal(result.ok, false, name);
  assert.equal(result.status, "HOLD", name);
  assert.equal(result.reason, expected, name);
  assert.equal(result.activation_authorized, false, name);
  assert.equal(result.runtime_gate_mutation, false, name);
  assert.equal(result.service_mutation, false, name);
  assert.equal(result.transaction_broadcast, false, name);
  assert.equal(result.funds_movement, false, name);
}

const source = fs.readFileSync(
  "tools/void-buy-void-epoch2-postgres-source-qualification-v3.mjs",
  "utf8",
);
for (const required of [
  'const GIT = "/usr/bin/git"',
  '"--no-replace-objects"',
  '"--no-includes"',
  'fs.constants.O_NOFOLLOW ?? 0',
  '"merge-base", "--is-ancestor", HISTORICAL_V2_CARRIER, "HEAD"',
  'HISTORICAL_V2_CARRIER + ":" + relative',
  "historical_v2_carrier_blob_mismatch",
  "current_source_blob_mismatch",
  "current_head_blob_mismatch",
  "historical_v2_signer_control_state_changed",
]) {
  assert(source.includes(required), required);
}
for (const forbidden of [
  "verifyCurrentEpoch2ClaimSourceV1",
  "verifyCurrentEpoch2ClaimSourceV2",
  "eth_sendRawTransaction",
  "sign_transaction",
  "sendTransaction(",
  "systemctl",
  "sudo ",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

const live = verifyCurrentEpoch2ClaimSourceV3();
assert.equal(live.ok, true);
assert.equal(live.status, STATUS);
assert.equal(live.historical_v1_source_qualification_preserved, true);
assert.equal(live.historical_v2_signer_control_evidence_preserved, true);
assert.equal(live.current_activation_candidate_source_requalified, true);
assert.equal(live.current_source_blob_count, 28);
assert.equal(live.signer_offchain_control_proven, true);
assert.equal(live.systemd_credential_identity_proven, false);
assert.equal(live.credential_binding_established, false);
assert.equal(live.runtime_or_payment_activation_authorized, false);
assert.equal(live.activation_authorized, false);
assert.equal(live.runtime_gate_mutation, false);
assert.equal(live.service_mutation, false);
assert.equal(live.transaction_broadcast, false);
assert.equal(live.public_presale_activation, false);
assert.equal(live.funds_movement, false);

console.log(MARKER + "_PROOF_GREEN");
console.log("historical_v1_source_qualification_preserved=true");
console.log("historical_v2_signer_control_evidence_preserved=true");
console.log("historical_v1_live_verifier_reexecuted=false");
console.log("historical_v2_live_verifier_reexecuted=false");
console.log("current_activation_candidate_source_requalified=true");
console.log("current_source_blob_count=28");
console.log("dormant_gate_adversaries_held=2");
console.log("authority_expansion_adversaries_held=4");
console.log("schema_adversaries_held=1");
console.log("activation_authorized=false");
console.log("runtime_gate_mutation=false");
console.log("service_mutation=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
