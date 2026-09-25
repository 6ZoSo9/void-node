#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED_COUPLED_LAUNCH_ID,
  verifyCoupledLaunchRoleProposalV1,
} from "../tools/void-wc-void-coupled-launch-role-proposal-v1.mjs";

const proposalPath =
  "ops/mainnet0/wc-void-coupled-launch-role-proposal-v1.json";
const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));

const result = verifyCoupledLaunchRoleProposalV1(proposal);

assert.equal(result.ok, true);
assert.equal(result.status, "PROPOSAL_VERIFIED_NOT_AUTHORIZED");
assert.equal(result.coupled_launch_id, EXPECTED_COUPLED_LAUNCH_ID);
assert.equal(
  result.launch_controller_candidate,
  "0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a",
);
assert.equal(
  result.settlement_executor_candidate,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(
  result.closeout_controller_candidate,
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
);
assert.equal(result.role_binding_authorized, false);
assert.equal(result.market_activation_authorized, false);
assert.equal(result.public_presale_activation_authorized, false);
assert.equal(result.funds_movement_authorized, false);

const ceremony = fs.readFileSync(
  "ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md",
  "utf8",
);
assert.match(
  ceremony,
  /launch_operator_signer_public_address:\s*0x0F0B8Aa14e1c9764fa8E4FA8b38fd3D3b8C2498A/,
);
assert.equal(
  proposal.role_candidates.launch_controller.key_availability_verified,
  false,
);
assert.equal(
  proposal.role_candidates.launch_controller.evidence_class,
  "historical_public_address_record",
);

const credentialEvidence = fs.readFileSync(
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts",
  "utf8",
);
assert.match(
  credentialEvidence,
  /expected_wallet_address:\s*"0xc884f631c3881b8b672bfcbf019c856146cd7f73"/,
);
assert.match(
  credentialEvidence,
  /credential_id:\s*"buy-void-native-fulfillment-wallet-v1"/,
);
assert.equal(
  proposal.role_candidates.settlement_executor.key_availability_verified,
  true,
);
assert.equal(
  proposal.role_candidates.settlement_executor
    .authority_expansion_from_presale_to_wc_void_market_approved,
  false,
);

const sovereignEvidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json",
    "utf8",
  ),
);
assert.equal(sovereignEvidence.chain_id, "2050");
assert.equal(
  sovereignEvidence.owner_address.toLowerCase(),
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b",
);
assert.equal(sovereignEvidence.candidate.identity_id, "sovereign.zoso");
assert.equal(sovereignEvidence.candidate.role, "SOVEREIGN");
assert.equal(
  proposal.role_candidates.closeout_controller.key_availability_verified,
  true,
);
assert.equal(
  proposal.role_candidates.closeout_controller
    .authority_expansion_to_wc_void_closeout_approved,
  false,
);

const marketPolicy = JSON.parse(
  fs.readFileSync(
    "fixtures/economic/void-market-distribution-policy-v1.json",
    "utf8",
  ),
);
assert.equal(
  marketPolicy.launch_order.presale_wc_void_simultaneous_launch,
  true,
);
assert.equal(
  marketPolicy.launch_order.presale_launch_requires_wc_void_activation_ready,
  true,
);
assert.equal(
  marketPolicy.launch_order.wc_void_launch_requires_presale_activation_ready,
  true,
);
assert.equal(marketPolicy.wc_void.protocol_seed_void, "10000000");
assert.equal(marketPolicy.wc_void.protocol_seed_wc, "0");
assert.equal(marketPolicy.wc_void.fixed_conversion, false);
assert.equal(marketPolicy.wc_void.fixed_opening_price, false);

const presalePolicy = fs.readFileSync(
  "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
  "utf8",
);
for (const required of [
  'pool_id: "buy-void-presale-v1"',
  'inventory_policy_version: "presale-v1"',
  'canonical_presale_max_void: "10000000"',
  'rate_void_units_numerator: "2"',
  'rate_void_units_denominator: "1"',
]) {
  assert.ok(presalePolicy.includes(required), required);
}

const compiledIdentity = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json",
    "utf8",
  ),
);
assert.equal(
  compiledIdentity.identity_id,
  proposal.coupled_launch_commitment.market_vault.compiled_identity_id,
);
assert.equal(
  compiledIdentity.artifacts.creation_bytecode_sha256,
  proposal.coupled_launch_commitment.market_vault.creation_bytecode_sha256,
);
assert.equal(
  compiledIdentity.artifacts.runtime_template_sha256,
  proposal.coupled_launch_commitment.market_vault.runtime_template_sha256,
);
assert.equal(
  compiledIdentity.artifacts.immutable_layout_sha256,
  proposal.coupled_launch_commitment.market_vault.immutable_layout_sha256,
);

for (const role of [
  "launch_controller",
  "settlement_executor",
  "closeout_controller",
]) {
  assert.equal(
    proposal.role_candidates[role].role_authority_approved,
    false,
    role,
  );
}

assert.equal(proposal.approval.sovereign_approved, false);
assert.equal(proposal.approval.role_binding_authorized, false);
assert.equal(proposal.authority.proposal_only, true);
for (const [key, value] of Object.entries(proposal.authority)) {
  if (key === "proposal_only") continue;
  assert.equal(value, false, key);
}

console.log("VOID_WC_VOID_COUPLED_LAUNCH_ROLE_PROPOSAL_V1_PROOF_GREEN");
console.log("coupled_launch_id=" + result.coupled_launch_id);
console.log("launch_controller_candidate=" + result.launch_controller_candidate);
console.log("launch_controller_key_freshness_verified=false");
console.log("settlement_executor_candidate=" + result.settlement_executor_candidate);
console.log("closeout_controller_candidate=" + result.closeout_controller_candidate);
console.log("all_role_addresses_distinct=true");
console.log("candidate_is_authority=false");
console.log("sovereign_approved=false");
console.log("role_binding_authorized=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("inventory_funding=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
