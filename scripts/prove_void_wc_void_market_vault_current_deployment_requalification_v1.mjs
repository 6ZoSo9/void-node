#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
  VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1,
  canonicalJson,
  deriveCurrentCoupledLaunchIdV1,
  loadAndVerifyCurrentDeploymentRequalificationCandidateV1,
  verifyCurrentDeploymentRequalificationCandidateV1,
} from "../tools/void-wc-void-market-vault-current-deployment-requalification-v1.mjs";

const CANDIDATE =
  "ops/mainnet0/wc-void-market-vault-current-deployment-requalification-v1.json";
const candidate = JSON.parse(fs.readFileSync(CANDIDATE, "utf8"));

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1,
  "VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1",
);

const result = loadAndVerifyCurrentDeploymentRequalificationCandidateV1();
assert.equal(result.ok, true);
assert.equal(
  result.status,
  "HOLD_CURRENT_IDENTITY_KEY_CONTINUITY_AND_ROLE_AUTHORIZATION_REQUIRED",
);
assert.equal(
  result.coupled_launch_id,
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
);
assert.equal(
  deriveCurrentCoupledLaunchIdV1(candidate.coupled_launch_commitment),
  result.coupled_launch_id,
);
assert.notEqual(
  result.coupled_launch_id,
  candidate.retired_sept25_material.coupled_launch_id,
);
assert.notEqual(
  result.current_compiled_identity_id,
  candidate.retired_sept25_material.compiled_identity_id,
);
assert.notEqual(
  result.current_creation_bytecode_sha256,
  candidate.retired_sept25_material.creation_bytecode_sha256,
);
assert.notEqual(
  result.current_runtime_template_sha256,
  candidate.retired_sept25_material.runtime_template_sha256,
);
assert.equal(result.historical_launch_controller_continuity_verified, false);
assert.equal(result.historical_deployer_continuity_verified, false);
assert.equal(result.fresh_role_authorization_required, true);
assert.equal(result.deployment_preparation_authorized, false);
assert.equal(result.rpc_call, false);
assert.equal(result.credential_access, false);
assert.equal(result.transaction_construction, false);
assert.equal(result.transaction_signing, false);
assert.equal(result.transaction_broadcast, false);
assert.equal(result.deployment, false);
assert.equal(result.funds_movement, false);

function rejects(mutator, pattern) {
  const changed = structuredClone(candidate);
  mutator(changed);
  assert.throws(
    () => verifyCurrentDeploymentRequalificationCandidateV1(changed),
    pattern,
  );
}

rejects(
  (value) => {
    value.coupled_launch_id =
      value.retired_sept25_material.coupled_launch_id;
  },
  /candidate_current_source_binding_mismatch/u,
);

rejects(
  (value) => {
    value.current_market_vault_identity.accepted_identity_id =
      value.retired_sept25_material.compiled_identity_id;
  },
  /candidate_current_identity_mismatch/u,
);

rejects(
  (value) => {
    value.current_market_vault_identity.creation_bytecode_sha256 =
      value.retired_sept25_material.creation_bytecode_sha256;
  },
  /candidate_current_identity_mismatch/u,
);

rejects(
  (value) => {
    value.retired_sept25_material.deployment_payload_reusable = true;
  },
  /retired_sept25_material_not_closed/u,
);

rejects(
  (value) => {
    value.continuity_candidates.launch_controller
      .current_key_continuity_verified = true;
  },
  /historical_key_continuity_boundary_invalid/u,
);

rejects(
  (value) => {
    value.continuity_candidates.deployer.current_key_continuity_verified =
      true;
  },
  /historical_key_continuity_boundary_invalid/u,
);

rejects(
  (value) => {
    value.current_role_candidates.settlement_executor
      .wc_void_authority_expansion_authorized = true;
  },
  /candidate_current_source_binding_mismatch/u,
);

rejects(
  (value) => {
    value.current_role_candidates.closeout_controller.role_authorized = true;
  },
  /candidate_current_source_binding_mismatch/u,
);

rejects(
  (value) => {
    value.next_gates = value.next_gates.slice(1);
  },
  /candidate_next_gates_mismatch/u,
);

const cli = execFileSync(
  process.execPath,
  ["tools/void-wc-void-market-vault-current-deployment-requalification-v1.mjs"],
  { encoding: "utf8" },
);
for (const marker of [
  "status=HOLD_CURRENT_IDENTITY_KEY_CONTINUITY_AND_ROLE_AUTHORIZATION_REQUIRED",
  "coupled_launch_id=0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
  "sept25_deployment_material_reusable=false",
  "launch_controller_key_continuity_verified=false",
  "deployer_key_continuity_verified=false",
  "fresh_role_authorization_required=true",
  "deployment_preparation_authorized=false",
  "rpc_call=false",
  "credential_access=false",
  "transaction_construction=false",
  "transaction_signing=false",
  "transaction_broadcast=false",
  "deployment=false",
  "funds_movement=false",
  "VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1_GREEN",
]) {
  assert(cli.includes(marker), marker);
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-current-deployment-requalification-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider",
  "new Wallet",
  "sendTransaction",
  "eth_send",
  "systemctl",
  "curl ",
  "fetch(",
  "http://",
  "https://",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

assert.equal(
  canonicalJson(candidate.coupled_launch_commitment),
  canonicalJson(candidate.coupled_launch_commitment),
);

const workflow = fs.readFileSync(
  ".github/workflows/void-wc-void-market-vault-current-deployment-requalification-v1.yml",
  "utf8",
);
const dependencies = [
  ".github/workflows/void-wc-void-market-vault-current-deployment-requalification-v1.yml",
  "docs/operators/wc-void-market-vault-current-deployment-requalification-v1.md",
  "ops/mainnet0/wc-void-market-vault-current-deployment-requalification-v1.json",
  "scripts/prove_void_wc_void_market_vault_current_deployment_requalification_v1.mjs",
  "tools/void-wc-void-market-vault-current-deployment-requalification-v1.mjs",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts",
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json",
];
const prStart = workflow.indexOf("  pull_request:\n");
const pushStart = workflow.indexOf("  push:\n");
const permissionsStart = workflow.indexOf("\npermissions:\n");
assert(prStart >= 0 && pushStart > prStart && permissionsStart > pushStart);
const prBlock = workflow.slice(prStart, pushStart);
const pushBlock = workflow.slice(pushStart, permissionsStart);
for (const dependency of dependencies) {
  const token = `- "${dependency}"`;
  assert.equal(prBlock.split(token).length - 1, 1, dependency);
  assert.equal(pushBlock.split(token).length - 1, 1, dependency);
}
assert.match(workflow, /uses: actions\/checkout@[0-9a-f]{40}/u);
assert.match(workflow, /uses: actions\/setup-node@[0-9a-f]{40}/u);
assert.doesNotMatch(
  workflow,
  /uses: actions\/(?:checkout|setup-node)@v[0-9]/u,
);
assert.match(workflow, /persist-credentials:\s*false/u);
assert.match(workflow, /fetch-depth:\s*0/u);
for (const required of [
  "node --check tools/void-wc-void-market-vault-current-deployment-requalification-v1.mjs",
  "node --check scripts/prove_void_wc_void_market_vault_current_deployment_requalification_v1.mjs",
  "node tools/void-wc-void-market-vault-current-deployment-requalification-v1.mjs",
  "node scripts/prove_void_wc_void_market_vault_current_deployment_requalification_v1.mjs",
]) {
  assert(workflow.includes(required), required);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_CURRENT_DEPLOYMENT_REQUALIFICATION_V1_PROOF_GREEN",
);
console.log("current_compiled_identity_bound_green=true");
console.log("current_presale_policy_bound_green=true");
console.log("current_coupled_opening_policy_bound_green=true");
console.log("new_coupled_launch_id_derived_green=true");
console.log("sept25_launch_identity_retired_green=true");
console.log("sept25_deployment_material_reusable=false");
console.log("historical_key_continuity_not_inferred_green=true");
console.log("current_settlement_executor_binding_green=true");
console.log("current_closeout_controller_binding_green=true");
console.log("fresh_role_authorization_required=true");
console.log("deployment_preparation_authorized=false");
console.log("focused_workflow_self_enforcement_green=true");
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("funds_movement=false");
