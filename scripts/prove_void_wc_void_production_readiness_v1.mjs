#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
  VOID_WC_VOID_PRODUCTION_READINESS_V1,
  classifyVoidWcVoidProductionReadinessV1,
} from "../tools/void-wc-void-production-readiness-v1.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const candidate = JSON.parse(
  read("ops/mainnet0/wc-void-production-candidate-v1.json"),
);

assert.equal(
  VOID_WC_VOID_PRODUCTION_READINESS_V1,
  "VOID_WC_VOID_PRODUCTION_READINESS_V1",
);
assert.equal(
  VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1.source_classification_only,
  true,
);
for (const [key, value] of Object.entries(
  VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
)) {
  if (key === "source_classification_only") continue;
  assert.equal(value, false, `authority.${key}`);
}

const held = classifyVoidWcVoidProductionReadinessV1(candidate);
assert.equal(held.ok, false);
assert.equal(held.status, "HOLD");
assert.equal(held.reason, "production_gates_incomplete");
assert.deepEqual(held.missing_gates, [
  "market_vault_deployer_observation_required",
  "market_vault_deployer_pending_nonce_required",
  "market_vault_predicted_contract_address_required",
  "market_vault_deployment_gas_estimate_required",
  "market_vault_proposed_deployment_gas_limit_required",
  "market_vault_deployer_balance_sufficiency_required",
  "market_vault_fee_caps_sufficiency_required",
  "market_vault_address_required",
  "market_vault_runtime_code_sha256_required",
  "market_vault_independent_verification_required",
  "inventory_funding_required",
  "inventory_lock_proof_required",
  "wc_settlement_adapter_independent_review_required",
  "wc_ledger_persistence_verification_required",
  "quote_reserve_custody_verification_required",
  "participant_opening_claim_policy_required",
  "duplicate_replay_protection_required",
  "bounded_canary_required",
  "coupled_activation_ready_required",
]);
assert.equal(held.authority.market_activation, false);
assert.equal(held.authority.public_presale_activation, false);
assert.equal(held.authority.funds_movement, false);

function clone() {
  return JSON.parse(JSON.stringify(candidate));
}

for (const [label, mutate, reason] of [
  [
    "fixed conversion",
    (v) => {
      v.fixed_conversion = true;
    },
    "fixed_wc_void_price_authority_forbidden",
  ],
  [
    "fixed opening price",
    (v) => {
      v.fixed_opening_price = true;
    },
    "fixed_wc_void_price_authority_forbidden",
  ],
  [
    "nonzero protocol WC seed",
    (v) => {
      v.protocol_wc_seed_units = "1";
    },
    "protocol_wc_seed_must_be_zero",
  ],
  [
    "wrong VOID inventory",
    (v) => {
      v.protocol_void_inventory_atoms = "9999999999999999999999999";
    },
    "protocol_void_inventory_mismatch",
  ],
  [
    "wrong opening price source",
    (v) => {
      v.opening_price_source = "one_sided_market_discovery";
    },
    "opening_price_source_mismatch",
  ],
  [
    "wrong WC source",
    (v) => {
      v.wc_source_profile.source_domain = "erc20";
    },
    "wc_source_profile_mismatch",
  ],
  [
    "wrong market vault contract",
    (v) => {
      v.market_vault_contract_name = "WCVoidMarketVaultV1";
    },
    "market_vault_source_identity_mismatch",
  ],
  [
    "wrong market vault source path",
    (v) => {
      v.market_vault_source_path = "contracts/mainnet/WCVoidMarketVaultV1.sol";
    },
    "market_vault_source_identity_mismatch",
  ],
  [
    "market vault source missing",
    (v) => {
      v.market_vault_source_implemented = false;
    },
    "market_vault_source_implementation_missing",
  ],
  [
    "market vault lock semantics unproven",
    (v) => {
      v.market_vault_lock_semantics_proven = false;
    },
    "market_vault_lock_semantics_not_proven",
  ],
  [
    "market vault recovery path disabled",
    (v) => {
      v.market_vault_recovery_path_ready = false;
    },
    "market_vault_recovery_path_not_ready",
  ],
  [
    "market vault compiler profile unlocked",
    (v) => {
      v.market_vault_compiler_profile_locked = false;
    },
    "market_vault_compiler_profile_not_locked",
  ],
  [
    "market vault dual compiler gate missing",
    (v) => {
      v.market_vault_dual_compiler_gate_implemented = false;
    },
    "market_vault_dual_compiler_gate_missing",
  ],
  [
    "deployment preparation missing",
    (v) => {
      v.market_vault_deployment_preparation_implemented = false;
    },
    "market_vault_deployment_preparation_missing",
  ],
  [
    "deployer observer missing",
    (v) => {
      v.market_vault_deployer_observer_implemented = false;
    },
    "market_vault_deployer_observer_missing",
  ],
  [
    "deployer evidence path mismatch",
    (v) => {
      v.market_vault_deployer_generation_evidence_path =
        "ops/mainnet0/wrong-deployer-evidence.json";
    },
    "market_vault_deployer_generation_binding_mismatch",
  ],
  [
    "deployer public identity hash mismatch",
    (v) => {
      v.market_vault_deployer_public_identity_sha256 = "0".repeat(64);
    },
    "market_vault_deployer_generation_binding_mismatch",
  ],
  [
    "deployer address mismatch",
    (v) => {
      v.market_vault_deployer_address =
        "0x4444444444444444444444444444444444444444";
    },
    "market_vault_deployer_generation_binding_mismatch",
  ],
  [
    "coupled launch commitment missing",
    (v) => {
      v.market_vault_coupled_launch_commitment_committed = false;
    },
    "market_vault_coupled_launch_commitment_missing",
  ],
  [
    "role proposal missing",
    (v) => {
      v.market_vault_role_binding_proposal_implemented = false;
    },
    "market_vault_role_binding_proposal_missing",
  ],
  [
    "role proposal path mismatch",
    (v) => {
      v.market_vault_role_binding_proposal_path = "ops/mainnet0/wrong.json";
    },
    "market_vault_role_binding_proposal_path_mismatch",
  ],
  [
    "role authorization missing",
    (v) => {
      v.market_vault_role_binding_authorization_committed = false;
    },
    "market_vault_role_binding_authorization_missing",
  ],
  [
    "role authorization id mismatch",
    (v) => {
      v.market_vault_role_binding_authorization_id =
        "voidwcvra1_" + "0".repeat(64);
    },
    "market_vault_role_binding_authorization_mismatch",
  ],
  [
    "role authorization path mismatch",
    (v) => {
      v.market_vault_role_binding_authorization_path =
        "ops/mainnet0/wrong-role-authorization.json";
    },
    "market_vault_role_binding_authorization_mismatch",
  ],
  [
    "launch controller mismatch",
    (v) => {
      v.market_vault_launch_controller =
        "0x1111111111111111111111111111111111111111";
    },
    "market_vault_final_role_binding_mismatch",
  ],
  [
    "settlement executor mismatch",
    (v) => {
      v.market_vault_settlement_executor =
        "0x2222222222222222222222222222222222222222";
    },
    "market_vault_final_role_binding_mismatch",
  ],
  [
    "closeout controller mismatch",
    (v) => {
      v.market_vault_closeout_controller =
        "0x3333333333333333333333333333333333333333";
    },
    "market_vault_final_role_binding_mismatch",
  ],
  [
    "wrong coupled launch id",
    (v) => {
      v.market_vault_coupled_launch_id = "0x" + "1".repeat(64);
    },
    "market_vault_coupled_launch_id_mismatch",
  ],
  [
    "zero coupled launch id",
    (v) => {
      v.market_vault_coupled_launch_id = "0x" + "0".repeat(64);
    },
    "market_vault_coupled_launch_id_mismatch",
  ],
  [
    "compiled identity id mismatch",
    (v) => {
      v.market_vault_compiled_identity_id = "voidwcvci1_" + "0".repeat(64);
    },
    "market_vault_compiled_identity_binding_mismatch",
  ],
  [
    "compiled identity runtime template mismatch",
    (v) => {
      v.market_vault_runtime_template_sha256 = "0".repeat(64);
    },
    "market_vault_compiled_identity_binding_mismatch",
  ],
  [
    "devnet relayer reuse",
    (v) => {
      v.legacy_devnet_relayer_reused = true;
    },
    "devnet_or_default_secret_path_forbidden",
  ],
  [
    "default private key",
    (v) => {
      v.default_private_key_allowed = true;
    },
    "devnet_or_default_secret_path_forbidden",
  ],
  [
    "default wallet",
    (v) => {
      v.default_wallet_allowed = true;
    },
    "devnet_or_default_secret_path_forbidden",
  ],
]) {
  const value = clone();
  mutate(value);
  const decision = classifyVoidWcVoidProductionReadinessV1(value);
  assert.equal(decision.ok, false, label);
  assert.equal(decision.reason, reason, label);
}

const ready = clone();
Object.assign(ready, {
  status: "source_ready",
  market_vault_address: "0x1111111111111111111111111111111111111111",
  market_vault_runtime_code_sha256: "a".repeat(64),
  market_vault_recovery_path_ready: true,
  market_vault_compiler_profile_locked: true,
  market_vault_dual_compiler_gate_implemented: true,
  market_vault_compiled_identity_committed: true,
  market_vault_deployment_preparation_implemented: true,
  market_vault_deployer_observer_implemented: true,
  market_vault_deployer_generation_evidence_committed: true,
  market_vault_deployer_generation_evidence_path:
    "ops/mainnet0/wc-void-market-vault-deployer-offline-generation-evidence-v1.json",
  market_vault_deployer_public_identity_sha256:
    "7e0522e971060ae1bbe1011b01c2d64bb84234c0f7069701a4459f351ee113ac",
  market_vault_deployer_address:
    "0x907ea7d0D57F5631219674BDF666A7e929613074",
  market_vault_deployer_observation_verified: true,
  market_vault_deployer_pending_nonce: "0",
  market_vault_predicted_contract_address: "0x5555555555555555555555555555555555555555",
  market_vault_deployment_gas_estimate: "2000000",
  market_vault_proposed_deployment_gas_limit: "2400000",
  market_vault_deployer_balance_sufficient: true,
  market_vault_fee_caps_sufficient: true,
  market_vault_coupled_launch_commitment_committed: true,
  market_vault_role_binding_proposal_implemented: true,
  market_vault_role_binding_proposal_path:
    "ops/mainnet0/wc-void-coupled-launch-role-proposal-v1.json",
  market_vault_final_role_bindings_attested: true,
  market_vault_coupled_launch_id:
    "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83",
  market_vault_independently_verified: true,
  inventory_funded: true,
  inventory_lock_proven: true,
  opening_discovery_implemented: true,
  wc_settlement_adapter_id: "void-wc-ledger-opening-settlement-v1",
  wc_settlement_adapter_implemented: true,
  wc_settlement_adapter_independently_reviewed: true,
  wc_ledger_persistence_verifier_implemented: true,
  wc_ledger_persistence_verified: true,
  quote_reserve_custody_verified: true,
  participant_opening_claim_policy_ready: true,
  duplicate_replay_protection_proven: true,
  bounded_canary_green: true,
  coupled_activation_ready: true,
});
const readyDecision = classifyVoidWcVoidProductionReadinessV1(ready);
assert.equal(readyDecision.ok, true);
assert.equal(readyDecision.status, "SOURCE_READY");
assert.equal(readyDecision.protocol_void_inventory_atoms, "10000000000000000000000000");
assert.equal(readyDecision.protocol_wc_seed_units, "0");
assert.equal(readyDecision.opening_price_source, "settled_wc_reserve_ratio");
assert.equal(readyDecision.activation_authority, false);
assert.equal(readyDecision.funding_authority, false);
assert.equal(readyDecision.authority.market_activation, false);
assert.equal(readyDecision.authority.public_presale_activation, false);
assert.equal(readyDecision.authority.funds_movement, false);

const stillHeld = clone();
Object.assign(stillHeld, ready, { status: "hold" });
const statusHeld = classifyVoidWcVoidProductionReadinessV1(stillHeld);
assert.equal(statusHeld.ok, false);
assert.equal(statusHeld.reason, "source_ready_status_required");

const toolSource = read("tools/void-wc-void-production-readiness-v1.mjs");
assert.doesNotMatch(toolSource, /ANVIL_PK/);
assert.doesNotMatch(toolSource, /0xac0974bec39a17d36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80/i);
assert.doesNotMatch(toolSource, /100\s*WC\s*=\s*1\s*VOID/i);

const legacyRelayer = read("ops/wc-relayer-v1.cjs");
assert.match(legacyRelayer, /ANVIL_PK/);
assert.equal(candidate.legacy_devnet_relayer_reused, false);
assert.equal(candidate.default_private_key_allowed, false);
assert.equal(candidate.default_wallet_allowed, false);

console.log("VOID_WC_VOID_PRODUCTION_READINESS_V1_PROOF_GREEN");
console.log("candidate_status=HOLD");
console.log("market_vault_contract_name=WCVoidMarketVaultV2");
console.log("market_vault_source_implemented=true");
console.log("market_vault_lock_semantics_proven=true");
console.log("market_vault_recovery_path_ready=true");
console.log("market_vault_compiler_profile_locked=true");
console.log("market_vault_dual_compiler_gate_implemented=true");
console.log("market_vault_compiled_identity_committed=true");
console.log("market_vault_deployment_preparation_implemented=true");
console.log("market_vault_deployer_observer_implemented=true");
console.log("market_vault_deployer_generation_evidence_committed=true");
console.log("market_vault_deployer_generation_evidence_path=" + candidate.market_vault_deployer_generation_evidence_path);
console.log("market_vault_deployer_public_identity_sha256=" + candidate.market_vault_deployer_public_identity_sha256);
console.log("market_vault_deployer_address=" + candidate.market_vault_deployer_address.toLowerCase());
console.log("market_vault_deployer_observation_verified=false");
console.log("market_vault_coupled_launch_commitment_committed=true");
console.log("market_vault_role_binding_proposal_implemented=true");
console.log("market_vault_role_binding_proposal_path=ops/mainnet0/wc-void-coupled-launch-role-proposal-v1.json");
console.log("market_vault_role_binding_authorization_committed=true");
console.log("market_vault_role_binding_authorization_id=" + candidate.market_vault_role_binding_authorization_id);
console.log("market_vault_launch_controller=" + candidate.market_vault_launch_controller.toLowerCase());
console.log("market_vault_settlement_executor=" + candidate.market_vault_settlement_executor.toLowerCase());
console.log("market_vault_closeout_controller=" + candidate.market_vault_closeout_controller.toLowerCase());
console.log("market_vault_final_role_bindings_attested=true");
console.log("market_vault_coupled_launch_id=0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83");
console.log("market_vault_compiled_identity_id=" + candidate.market_vault_compiled_identity_id);
console.log("market_vault_creation_bytecode_sha256=" + candidate.market_vault_creation_bytecode_sha256);
console.log("market_vault_runtime_template_sha256=" + candidate.market_vault_runtime_template_sha256);
console.log("market_vault_immutable_layout_sha256=" + candidate.market_vault_immutable_layout_sha256);
console.log("market_vault_address_present=false");
console.log("inventory_funded=false");
console.log("opening_discovery_implemented=true");
console.log("wc_settlement_adapter_id=void-wc-ledger-opening-settlement-v1");
console.log("wc_settlement_adapter_implemented=true");
console.log("wc_settlement_adapter_independently_reviewed=false");
console.log("wc_ledger_persistence_verifier_implemented=true");
console.log("wc_ledger_persistence_verified=false");
console.log("quote_reserve_custody_verified=false");
console.log("participant_opening_claim_policy_ready=false");
console.log("legacy_devnet_relayer_reused=false");
console.log("fixed_wc_void_redemption=false");
console.log("protocol_wc_seed_units=0");
console.log("source_ready_classifier_proven=true");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
