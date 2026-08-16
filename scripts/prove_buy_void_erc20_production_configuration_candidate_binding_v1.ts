import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_AUTHORITY_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_RECORDED_PROVENANCE_V1,
  type BuyVoidErc20ProductionConfigurationCandidateProvenanceV1,
  verifyBuyVoidErc20ProductionConfigurationCandidateBindingV1,
  verifyBuyVoidErc20ProductionConfigurationCandidateProvenanceV1,
} from "../src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.js";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "../src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

const root = process.cwd();
const binding =
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1;
const candidate = binding.candidate;

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function ensureCommitAvailable(commitSha: string): void {
  try {
    git(["cat-file", "-e", `${commitSha}^{commit}`]);
    return;
  } catch {
    git(["fetch", "--no-tags", "--depth=1", "origin", commitSha]);
  }
  git(["cat-file", "-e", `${commitSha}^{commit}`]);
}

function readBytes(relativePath: string): Buffer {
  return fs.readFileSync(path.join(root, relativePath));
}

function readJson(bytes: Buffer): any {
  return JSON.parse(bytes.toString("utf8"));
}

function gitBlobSha1(bytes: Buffer): string {
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function treeBlobSha(treeish: string, relativePath: string): string {
  const listing = git(["ls-tree", treeish, "--", relativePath]);
  const match = listing.match(/^\d+\s+blob\s+([0-9a-f]{40})\t/);
  assert.ok(match, `missing Git blob for ${relativePath} in ${treeish}`);
  return match[1];
}

const currentPrBaseSha = String(process.env.BUY_VOID_PR_BASE_SHA || "").trim();
if (currentPrBaseSha) assert.match(currentPrBaseSha, /^[0-9a-f]{40}$/);

const observedBaseCommitSha = binding.reviewed_base_commit_sha;
assert.match(observedBaseCommitSha, /^[0-9a-f]{40}$/);
ensureCommitAvailable(observedBaseCommitSha);

const observedBaseTreeSha = git([
  "show",
  "-s",
  "--format=%T",
  observedBaseCommitSha,
]);
assert.match(observedBaseTreeSha, /^[0-9a-f]{40}$/);

const frozenBytes = readBytes(binding.evidence.frozen_mainnet0_deployment_path);
const premineBytes = readBytes(binding.evidence.premine_reconciliation_path);
const frozenBaseBlobSha = treeBlobSha(
  observedBaseCommitSha,
  binding.evidence.frozen_mainnet0_deployment_path,
);
const premineBaseBlobSha = treeBlobSha(
  observedBaseCommitSha,
  binding.evidence.premine_reconciliation_path,
);
assert.equal(
  gitBlobSha1(frozenBytes),
  frozenBaseBlobSha,
  "checked-out frozen deployment bytes must equal the reviewed-base Git blob",
);
assert.equal(
  gitBlobSha1(premineBytes),
  premineBaseBlobSha,
  "checked-out premine reconciliation bytes must equal the reviewed-base Git blob",
);

const observedProvenance: BuyVoidErc20ProductionConfigurationCandidateProvenanceV1 = {
  reviewed_base_commit_sha: observedBaseCommitSha,
  reviewed_base_tree_sha: observedBaseTreeSha,
  frozen_mainnet0_deployment_git_blob_sha: frozenBaseBlobSha,
  premine_reconciliation_git_blob_sha: premineBaseBlobSha,
};

const deployed = readJson(frozenBytes);
const premine = readJson(premineBytes);
const credential =
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1;
const activation =
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1;

assert.equal(binding.reviewed_base_commit_sha, "0d74919b31790a1f14025924343176c286ab5549");
assert.equal(binding.reviewed_base_tree_sha, "1a5693604212f48e1cc41889abce7fe2c9d7900b");
assert.deepEqual(
  observedProvenance,
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_RECORDED_PROVENANCE_V1,
);
assert.equal(binding.repository_candidate_binding_ready, true);
assert.equal(binding.production_configuration_applied, false);
assert.equal(binding.runtime_activation_authorized, false);
assert.equal(binding.dependency_injection_activation_authorized, false);
assert.equal(binding.inventory_funding_authorized, false);

assert.equal(deployed.chainId, 2050);
assert.equal(deployed.status, "live_frozen_post_bootstrap");
assert.equal(deployed.bootstrap_frozen, true);
assert.equal(deployed.source_of_truth_node, "Precision");
assert.equal(
  new URL(String(deployed.source_of_truth_rpc)).toString(),
  candidate.VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL,
);
assert.equal(
  String(deployed.contracts.VoidToken).toLowerCase(),
  binding.expected.normalized_void_token_address,
);

assert.equal(premine.chain_id, 2050);
assert.equal(premine.status, "reconciled");
assert.equal(premine.decimals, 18);
assert.equal(premine.total_supply_void, "333333333");
assert.equal(
  String(premine.void_token).toLowerCase(),
  binding.expected.normalized_void_token_address,
);
assert.equal(premine.invariants.current_canonical_supply_conservation_preserved, true);
assert.equal(premine.invariants.unreconciled_void, "0");
assert.equal(
  premine.operator_evidence_snapshot.effective_buy_void_fulfillment_wallet,
  binding.expected.normalized_fulfillment_wallet_address,
);

assert.equal(
  credential.expected_wallet_address,
  binding.expected.normalized_fulfillment_wallet_address,
);
assert.equal(credential.derived_wallet_address, credential.expected_wallet_address);
assert.equal(credential.exact_wallet_binding, true);
assert.equal(
  credential.evidence_id_sha256,
  candidate.VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID,
);

assert.equal(candidate.VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED, "0");
assert.equal(
  candidate.VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED,
  "0",
);
assert.equal(candidate.VOID_BUY_VOID_DELIVERY_CHAIN_ID, "2050");
assert.equal(candidate.VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS, "10000000000000");
assert.equal(candidate.VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS, "3");

const provenanceVerified =
  verifyBuyVoidErc20ProductionConfigurationCandidateProvenanceV1(
    VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_RECORDED_PROVENANCE_V1,
    observedProvenance,
  );
assert.equal(provenanceVerified.ok, true);

for (const [field, reason] of [
  ["reviewed_base_commit_sha", "candidate_binding_reviewed_base_commit_mismatch"],
  ["reviewed_base_tree_sha", "candidate_binding_reviewed_base_tree_mismatch"],
  [
    "frozen_mainnet0_deployment_git_blob_sha",
    "candidate_binding_frozen_deployment_blob_mismatch",
  ],
  [
    "premine_reconciliation_git_blob_sha",
    "candidate_binding_premine_reconciliation_blob_mismatch",
  ],
] as const) {
  const tampered = {
    ...VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_RECORDED_PROVENANCE_V1,
    [field]: "f".repeat(40),
  };
  const held = verifyBuyVoidErc20ProductionConfigurationCandidateProvenanceV1(
    tampered,
    observedProvenance,
  );
  assert.equal(held.ok, false, field);
  if (held.ok) throw new Error(`tampered provenance passed:${field}`);
  assert.equal(held.reason, reason, field);
}

const malformedProvenance =
  verifyBuyVoidErc20ProductionConfigurationCandidateProvenanceV1(
    {
      ...VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_RECORDED_PROVENANCE_V1,
      reviewed_base_commit_sha: "not-a-git-object-id",
    },
    observedProvenance,
  );
assert.equal(malformedProvenance.ok, false);
if (malformedProvenance.ok) throw new Error("malformed provenance unexpectedly passed");
assert.equal(
  malformedProvenance.reason,
  "candidate_binding_provenance_shape_invalid",
);

const verified =
  verifyBuyVoidErc20ProductionConfigurationCandidateBindingV1(observedProvenance);
assert.equal(verified.ok, true);
assert.equal(
  verified.status,
  "candidate_binding_verified_held_on_apply_and_activation",
);
assert.equal(
  verified.configuration_fingerprint_sha256,
  "9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992",
);
assert.equal(
  verified.planner_policy_fingerprint_sha256,
  "45902d888077b61b75d00164f5e98053ad5a32a0569d848ba680e72c03208846",
);
assert.equal(
  verified.rpc_url_fingerprint_sha256,
  "856a41e68ffe7136b6474cf092d3696a2619347734279f3e19c2047d8e986ba2",
);
assert.equal(
  verified.void_token_address,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(
  verified.fulfillment_wallet_address,
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
);
assert.equal(verified.reviewed_base_commit_sha, observedBaseCommitSha);
assert.equal(verified.reviewed_base_tree_sha, observedBaseTreeSha);
assert.equal(verified.frozen_mainnet0_deployment_git_blob_sha, frozenBaseBlobSha);
assert.equal(verified.premine_reconciliation_git_blob_sha, premineBaseBlobSha);

const repeated =
  verifyBuyVoidErc20ProductionConfigurationCandidateBindingV1(observedProvenance);
assert.equal(repeated.ok, true);
assert.equal(
  repeated.configuration_fingerprint_sha256,
  verified.configuration_fingerprint_sha256,
);

assert.equal(activation.production_configuration_values_verified, true);
assert.equal(activation.production_credential_binding_ready, true);
assert.equal(activation.production_broad_delivery_configuration_verified, true);
assert.equal(activation.production_configuration_applied, false);
assert.equal(activation.canonical_delivery_runtime_activation_ready, false);
assert.equal(
  activation.next_gate,
  "durable_history_creation_crash_recovery",
);
assert.equal(
  activation.presale_invariant_readiness
    .durable_history_creation_crash_recovery_ready,
  false,
);
assert.equal(
  activation.presale_invariant_readiness
    .durable_history_external_anti_rollback_anchor_ready,
  false,
);
assert.equal(
  activation.reviewed_production_configuration_binding.marker,
  binding.marker,
);
assert.equal(
  activation.reviewed_production_configuration_binding
    .configuration_fingerprint_sha256,
  binding.expected.configuration_fingerprint_sha256,
);
assert.equal(
  activation.reviewed_production_configuration_binding
    .repository_candidate_binding_ready,
  true,
);
assert.equal(
  activation.reviewed_production_configuration_binding
    .production_configuration_applied,
  false,
);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_AUTHORITY_V1,
)) {
  const expected = [
    "source_only_binding",
    "explicit_candidate_only",
    "explicit_provenance_input_required",
  ].includes(key);
  assert.equal(value, expected, `authority mismatch:${key}`);
}

const source = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.ts",
  ),
  "utf8",
);
for (const forbidden of ["process.env", "fetch(", "http.request", "https.request"]) {
  assert.equal(source.includes(forbidden), false, `forbidden source capability:${forbidden}`);
}

console.log("VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1_PROOF_GREEN");
if (currentPrBaseSha) console.log(`current_pr_base_sha=${currentPrBaseSha}`);
console.log(`reviewed_base_commit_sha=${observedBaseCommitSha}`);
console.log(`reviewed_base_tree_sha=${observedBaseTreeSha}`);
console.log(`frozen_mainnet0_deployment_git_blob_sha=${frozenBaseBlobSha}`);
console.log(`premine_reconciliation_git_blob_sha=${premineBaseBlobSha}`);
console.log("provenance_fields_executably_bound=1");
console.log("provenance_tamper_cases_held=4");
console.log("chain_id=2050");
console.log("void_token_address=0x470075b85352eb86f7d089fb9ba88945f12aad94");
console.log("fulfillment_wallet_address=0xc884f631c3881b8b672bfcbf019c856146cd7f73");
console.log("rpc_url_fingerprint_sha256=856a41e68ffe7136b6474cf092d3696a2619347734279f3e19c2047d8e986ba2");
console.log("planner_policy_fingerprint_sha256=45902d888077b61b75d00164f5e98053ad5a32a0569d848ba680e72c03208846");
console.log("configuration_fingerprint_sha256=9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992");
console.log("repository_candidate_binding_ready=1");
console.log("parent_configuration_truth_promoted=1");
console.log("runtime_remains_disabled=1");
console.log("dependency_injection_remains_disabled=1");
console.log("production_configuration_applied=0");
console.log("runtime_activation_authorized=0");
console.log("inventory_funding_authorized=0");
console.log("credential_read_performed=0");
console.log("rpc_call_performed=0");
console.log("signing_performed=0");
console.log("transaction_broadcast_performed=0");
console.log("money_movement_performed=0");
