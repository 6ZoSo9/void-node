#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

import {
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_SOURCE_BLOBS_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1,
  verifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1,
} from "../tools/void-wc-void-market-vault-role-deployment-preflight-v1.mjs";

const CANDIDATE =
  "ops/mainnet0/wc-void-market-vault-role-deployment-preflight-v1.json";
const TOOL =
  "tools/void-wc-void-market-vault-role-deployment-preflight-v1.mjs";

const candidate = JSON.parse(fs.readFileSync(CANDIDATE, "utf8"));

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1,
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1",
);
assert.deepEqual(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_AUTHORITY_V1,
  {
    source_preflight_only: true,
    git_head_source_read: true,
    credential_read: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    deployment: false,
    inventory_funding: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  },
);
assert.deepEqual(
  candidate.reviewed_source_blobs,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_SOURCE_BLOBS_V1,
);

const decision =
  verifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1(candidate);
assert.equal(
  decision.status,
  "HOLD_LAUNCH_CONTROLLER_REQUALIFICATION_REQUIRED",
);
assert.equal(decision.current_launch_bound, true);
assert.equal(decision.current_compiled_identity_bound, true);
assert.equal(decision.settlement_executor_public_identity_requalified, true);
assert.equal(decision.closeout_controller_public_identity_requalified, true);
assert.equal(decision.known_role_separation_verified, true);
assert.equal(decision.launch_controller_current_identity_requalified, false);
assert.equal(decision.all_roles_requalified, false);
assert.equal(decision.constructor_arguments_ready, false);
assert.equal(decision.exact_creation_payload_ready, false);
assert.equal(decision.deployment_authorized, false);
assert.equal(decision.inventory_funding_authorized, false);
assert.equal(decision.market_activation_authorized, false);
assert.equal(decision.public_presale_activation_authorized, false);
assert.equal(decision.funds_movement_authorized, false);
assert.equal(
  decision.next_gate,
  "fresh_launch_controller_public_control_requalification",
);

function rejects(mutator, pattern) {
  const copy = structuredClone(candidate);
  mutator(copy);
  assert.throws(
    () =>
      verifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1(
        copy,
        { verifyRepository: false },
      ),
    pattern,
  );
}

rejects(
  (value) => {
    value.launch.coupled_launch_id =
      "sha256:" + "a".repeat(64);
  },
  /preflight_launch_invalid/u,
);

rejects(
  (value) => {
    value.vault.accepted_compiled_identity_id =
      "voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045";
  },
  /preflight_vault_identity_invalid/u,
);

rejects(
  (value) => {
    value.roles.launch_controller.address =
      "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";
  },
  /preflight_launch_controller_boundary_invalid/u,
);

rejects(
  (value) => {
    value.roles.launch_controller.current_identity_requalified = true;
    value.roles.launch_controller.role_binding_ready = true;
  },
  /preflight_launch_controller_boundary_invalid/u,
);

rejects(
  (value) => {
    value.roles.launch_controller.historical_reference.current_authority =
      true;
  },
  /preflight_launch_controller_boundary_invalid/u,
);

rejects(
  (value) => {
    value.roles.settlement_executor.role_binding_authorized_for_current_launch =
      true;
  },
  /preflight_settlement_executor_boundary_invalid/u,
);

rejects(
  (value) => {
    value.roles.closeout_controller.role_binding_authorized_for_current_launch =
      true;
  },
  /preflight_closeout_controller_boundary_invalid/u,
);

rejects(
  (value) => {
    value.deployment_preparation.constructor_arguments_ready = true;
  },
  /preflight_deployment_authority_invalid/u,
);

rejects(
  (value) => {
    value.deployment_preparation.deployment_authorized = true;
  },
  /preflight_deployment_authority_invalid/u,
);

rejects(
  (value) => {
    value.authority.transaction_construction = true;
  },
  /preflight_authority_mismatch/u,
);

let getterCalls = 0;
const accessorCandidate = structuredClone(candidate);
Object.defineProperty(accessorCandidate, "status", {
  enumerable: true,
  get() {
    getterCalls += 1;
    return "HOLD_LAUNCH_CONTROLLER_REQUALIFICATION_REQUIRED";
  },
});
assert.throws(
  () =>
    verifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1(
      accessorCandidate,
      { verifyRepository: false },
    ),
  /preflight_candidate_data_property_required:status/u,
);
assert.equal(getterCalls, 0);

const symbolCandidate = {
  ...structuredClone(candidate),
  [Symbol("extra")]: true,
};
assert.throws(
  () =>
    verifyVoidWcVoidMarketVaultRoleDeploymentPreflightV1(
      symbolCandidate,
      { verifyRepository: false },
    ),
  /preflight_candidate_keys_mismatch/u,
);

const cli = spawnSync(
  process.execPath,
  [TOOL],
  { encoding: "utf8" },
);
assert.equal(cli.status, 0, cli.stderr || cli.stdout);
for (const marker of [
  "status=HOLD_LAUNCH_CONTROLLER_REQUALIFICATION_REQUIRED",
  "current_launch_bound=true",
  "current_compiled_identity_bound=true",
  "settlement_executor_public_identity_requalified=true",
  "closeout_controller_public_identity_requalified=true",
  "known_role_separation_verified=true",
  "launch_controller_current_identity_requalified=false",
  "all_roles_requalified=false",
  "constructor_arguments_ready=false",
  "exact_creation_payload_ready=false",
  "deployment_authorized=false",
  "inventory_funding_authorized=false",
  "market_activation_authorized=false",
  "public_presale_activation_authorized=false",
  "funds_movement_authorized=false",
  "next_gate=fresh_launch_controller_public_control_requalification",
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1_GREEN",
]) {
  assert(cli.stdout.includes(marker), marker);
}

const workflow = fs.readFileSync(
  ".github/workflows/void-wc-void-market-vault-role-deployment-preflight-v1.yml",
  "utf8",
);
const workflowDependencies = [
  ".github/workflows/void-wc-void-market-vault-role-deployment-preflight-v1.yml",
  "docs/operators/wc-void-market-vault-role-deployment-preflight-v1.md",
  "ops/mainnet0/wc-void-market-vault-role-deployment-preflight-v1.json",
  "scripts/prove_void_wc_void_market_vault_role_deployment_preflight_v1.mjs",
  "tools/void-wc-void-market-vault-role-deployment-preflight-v1.mjs",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json",
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts",
  "contracts/mainnet/WCVoidMarketVaultV2.sol",
  "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs",
];
const prStart = workflow.indexOf("  pull_request:\n");
const pushStart = workflow.indexOf("  push:\n");
const permissionsStart = workflow.indexOf("\npermissions:\n");
assert(prStart >= 0 && pushStart > prStart && permissionsStart > pushStart);
const prBlock = workflow.slice(prStart, pushStart);
const pushBlock = workflow.slice(pushStart, permissionsStart);
for (const dependency of workflowDependencies) {
  const token = '- "' + dependency + '"';
  assert.equal(
    prBlock.split(token).length - 1,
    1,
    "PR trigger mismatch: " + dependency,
  );
  assert.equal(
    pushBlock.split(token).length - 1,
    1,
    "push trigger mismatch: " + dependency,
  );
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
  "node --check tools/void-wc-void-market-vault-role-deployment-preflight-v1.mjs",
  "node --check scripts/prove_void_wc_void_market_vault_role_deployment_preflight_v1.mjs",
  "node tools/void-wc-void-market-vault-role-deployment-preflight-v1.mjs",
  "node scripts/prove_void_wc_void_market_vault_role_deployment_preflight_v1.mjs",
]) {
  assert(workflow.includes(required), required);
}

const source = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "signTransaction(",
  "systemctl",
  "sudo ",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("current_launch_identity_bound=true");
console.log("current_compiled_identity_bound=true");
console.log("current_settlement_executor_identity_bound=true");
console.log("current_sovereign_closeout_identity_bound=true");\nconsole.log("focused_workflow_self_enforcement_green=true");
console.log("historical_launch_controller_authority=false");
console.log("historical_launch_identity_rejected_green=true");
console.log("historical_compiled_identity_rejected_green=true");
console.log("launch_controller_requalification_required=true");
console.log("constructor_arguments_ready=false");
console.log("exact_creation_payload_ready=false");
console.log("deployment_authorized=false");
console.log("inventory_funding_authorized=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
