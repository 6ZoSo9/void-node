#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const AUTH_PATH =
  "ops/mainnet0/wc-void-market-vault-role-binding-authorization-v1.json";
const PROPOSAL_PATH =
  "ops/mainnet0/wc-void-coupled-launch-role-proposal-v1.json";
const LAUNCH_EVIDENCE_PATH =
  "ops/mainnet0/wc-void-launch-controller-offline-generation-evidence-v1.json";
const DEPLOYMENT_PREP_PATH =
  "ops/mainnet0/wc-void-market-vault-deployment-preparation-v1.json";

const EXPECTED_AUTH_ID =
  "voidwcvra1_8bd7a5dbb1f27b61fd236ee0588c1271cb86e719a7de8db0465a6070831b8b36";
const EXPECTED_LAUNCH =
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";
const EXPECTED_SETTLEMENT =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const EXPECTED_CLOSEOUT =
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";
const EXPECTED_VOID =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const EXPECTED_LAUNCH_ID =
  "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83";

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
const proposal = JSON.parse(fs.readFileSync(PROPOSAL_PATH, "utf8"));
const launchEvidence = JSON.parse(
  fs.readFileSync(LAUNCH_EVIDENCE_PATH, "utf8"),
);
const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PREP_PATH, "utf8"));

assert.equal(
  auth.marker,
  "VOID_WC_VOID_MARKET_VAULT_ROLE_BINDING_AUTHORIZATION_V1",
);
assert.equal(auth.version, 1);
assert.equal(auth.status, "authorized_exact_role_bindings_only");
assert.equal(auth.authorization_source, "interactive_sovereign_authorization");
assert.equal(
  auth.proposal_source_head,
  "61b4057094bc181378656146e9c55753bb375c88",
);
assert.equal(auth.chain_id, 2050);
assert.equal(auth.coupled_launch_id, EXPECTED_LAUNCH_ID);

const identityBody = structuredClone(auth);
delete identityBody.authorization_id;
assert.equal(
  auth.authorization_id,
  "voidwcvra1_" + sha256(canonicalJson(identityBody)),
);
assert.equal(auth.authorization_id, EXPECTED_AUTH_ID);

assert.equal(auth.bindings.void_token, EXPECTED_VOID);
assert.equal(auth.bindings.launch_controller, EXPECTED_LAUNCH);
assert.equal(auth.bindings.settlement_executor, EXPECTED_SETTLEMENT);
assert.equal(auth.bindings.closeout_controller, EXPECTED_CLOSEOUT);

assert.deepEqual(
  new Set(Object.values(auth.bindings)).size,
  4,
);
assert.equal(auth.separation.all_role_addresses_distinct, true);
assert.equal(
  auth.separation.settlement_executor_distinct_from_closeout_controller,
  true,
);
assert.equal(auth.separation.no_role_equals_void_token, true);

assert.equal(auth.evidence.role_proposal_path, PROPOSAL_PATH);
assert.equal(
  auth.evidence.launch_controller_generation_path,
  LAUNCH_EVIDENCE_PATH,
);
assert.equal(
  auth.evidence.launch_controller_public_identity_sha256,
  "7ca273a6b188e64e7099d57e7705345559fe7156c12406cde5097ce47350f431",
);

assert.equal(
  proposal.role_candidates.launch_controller.address.toLowerCase(),
  EXPECTED_LAUNCH,
);
assert.equal(
  proposal.role_candidates.settlement_executor.address.toLowerCase(),
  EXPECTED_SETTLEMENT,
);
assert.equal(
  proposal.role_candidates.closeout_controller.address.toLowerCase(),
  EXPECTED_CLOSEOUT,
);
assert.equal(proposal.coupled_launch_id, EXPECTED_LAUNCH_ID);
assert.equal(proposal.approval.sovereign_approved, false);
assert.equal(proposal.approval.role_binding_authorized, false);

assert.equal(
  launchEvidence.launch_controller_address.toLowerCase(),
  EXPECTED_LAUNCH,
);
assert.equal(launchEvidence.generation.network_offline_proven, true);
assert.equal(
  launchEvidence.control_path.key_availability_verified_at_generation,
  true,
);
assert.equal(launchEvidence.approval.role_authority_approved, false);

const settlementEvidence = fs.readFileSync(
  auth.evidence.settlement_executor_credential_path,
  "utf8",
);
assert.match(
  settlementEvidence,
  /expected_wallet_address:\s*"0xc884f631c3881b8b672bfcbf019c856146cd7f73"/,
);

const sovereignEvidence = JSON.parse(
  fs.readFileSync(auth.evidence.closeout_controller_sovereign_path, "utf8"),
);
assert.equal(
  sovereignEvidence.owner_address.toLowerCase(),
  EXPECTED_CLOSEOUT,
);
assert.equal(sovereignEvidence.candidate.identity_id, "sovereign.zoso");
assert.equal(sovereignEvidence.candidate.role, "SOVEREIGN");

assert.equal(deployment.status, "source_ready_held_on_deployer_observation");
assert.equal(deployment.role_binding_authorization_id, EXPECTED_AUTH_ID);
assert.equal(deployment.role_binding_authorization_path, AUTH_PATH);
assert.equal(deployment.role_binding_authorized, true);
assert.equal(deployment.bindings.void_token.toLowerCase(), EXPECTED_VOID);
assert.equal(
  deployment.bindings.launch_controller.toLowerCase(),
  EXPECTED_LAUNCH,
);
assert.equal(
  deployment.bindings.settlement_executor.toLowerCase(),
  EXPECTED_SETTLEMENT,
);
assert.equal(
  deployment.bindings.closeout_controller.toLowerCase(),
  EXPECTED_CLOSEOUT,
);
assert.equal(deployment.bindings.coupled_launch_id, EXPECTED_LAUNCH_ID);

for (const key of [
  "role_binding_authorized",
  "launch_controller_role_authorized",
  "settlement_executor_wc_void_authority_expansion_authorized",
  "closeout_controller_wc_void_authority_expansion_authorized",
]) {
  assert.equal(auth.scope[key], true, key);
}
for (const key of [
  "deployment_authorized",
  "deployer_selection_authorized",
  "nonce_or_fee_observation_authorized",
  "unsigned_transaction_construction_authorized",
  "transaction_signing_authorized",
  "transaction_broadcast_authorized",
  "chain2050_write_authorized",
  "inventory_funding_authorized",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
]) {
  assert.equal(auth.scope[key], false, key);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_ROLE_BINDING_AUTHORIZATION_V1_PROOF_GREEN",
);
console.log("authorization_id=" + auth.authorization_id);
console.log("launch_controller=" + EXPECTED_LAUNCH);
console.log("settlement_executor=" + EXPECTED_SETTLEMENT);
console.log("closeout_controller=" + EXPECTED_CLOSEOUT);
console.log("coupled_launch_id=" + EXPECTED_LAUNCH_ID);
console.log("role_binding_authorized=true");
console.log("deployment_authorized=false");
console.log("nonce_or_fee_observation_authorized=false");
console.log("transaction_construction_authorized=false");
console.log("transaction_signing_authorized=false");
console.log("transaction_broadcast_authorized=false");
console.log("inventory_funding_authorized=false");
console.log("market_activation_authorized=false");
console.log("public_presale_activation_authorized=false");
console.log("funds_movement_authorized=false");
