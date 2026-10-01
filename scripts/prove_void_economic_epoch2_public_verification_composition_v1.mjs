#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildVoidEconomicEpoch2PublicReadRuntimeEvidenceV1,
} from "../tools/void-economic-epoch2-public-read-runtime-evidence-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";
import {
  ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1,
  ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
} from "../tools/void-economic-epoch2-public-void-state-root-anchor-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1,
  composeVoidEconomicEpoch2PublicVerificationV1,
} from "../tools/void-economic-epoch2-public-verification-composition-v1.mjs";

const BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const ABSENT_TX =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const REGISTRY =
  "0x1111111111111111111111111111111111111111";
const PUBLISHER =
  "0x2222222222222222222222222222222222222222";

const publicState = JSON.parse(
  fs.readFileSync(
    "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
    "utf8",
  ),
);
const token = publicState.accounts.find(
  (row) => String(row.address).toLowerCase() === TOKEN,
);
assert.ok(token);
const tokenCode = String(token.runtime_code_hex).toLowerCase();
const tokenCodeSha = crypto
  .createHash("sha256")
  .update(Buffer.from(tokenCode.slice(2), "hex"))
  .digest("hex");

function facts() {
  return {
    marker: "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_FACTS_V1",
    version: 1,
    hostname: "zoso-Precision-Tower-7810",
    source_commit: "1".repeat(40),
    replica_service_identity:
      "void-economic-epoch2-successor-read-replica-v1.service",
    replica_service_active: true,
    replica_main_pid: 111,
    read_service_identity:
      "void-economic-epoch2-public-read-runtime-v1.service",
    read_service_active: true,
    read_main_pid: 222,
    composition_service_identity:
      "void-public-app-composition-gateway-v1.service",
    composition_service_active: true,
    composition_main_pid: 333,
    replica_unit_sha256: "2".repeat(64),
    read_unit_sha256: "3".repeat(64),
    composition_dropin_sha256: "4".repeat(64),
    genesis_file_sha256:
      "6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941",
    rpc_endpoint: "http://127.0.0.1:18552/",
    read_base: "http://127.0.0.1:4124",
    composition_base: "http://127.0.0.1:8082",
    public_base: "https://seed.nullfeed.org",
    block_number: "0x0",
    block_hash: BLOCK_HASH,
    state_root: STATE_ROOT,
    token_address: TOKEN,
    live_balance_result: "0x0",
    live_balance_read_verified: true,
    live_code_sha256: tokenCodeSha,
    live_code_nonempty: true,
    live_code_read_verified: true,
    absent_receipt_transaction_hash: ABSENT_TX,
    live_receipt_lookup_transport_verified: true,
    live_receipt_found: false,
    successful_receipt_semantics_source_proven: true,
    local_status_route_accepted: true,
    local_balance_route_accepted: true,
    local_code_route_accepted: true,
    local_receipt_route_accepted: true,
    composition_status_route_accepted: true,
    composition_balance_route_accepted: true,
    composition_code_route_accepted: true,
    composition_receipt_route_accepted: true,
    external_status_route_accepted: true,
    external_balance_route_accepted: true,
    external_code_route_accepted: true,
    external_receipt_route_accepted: true,
    external_receipt_http_status: 404,
    voidchain_org_cors_verified: true,
    raw_public_rpc_allowed: false,
    production_successor_rpc_endpoint_selected: true,
    live_balance_receipt_code_gateway_ready: true,
    runtime_route_active: true,
    public_gateway_active: true,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  };
}

const payload = JSON.parse(
  fs.readFileSync(
    "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json",
    "utf8",
  ),
);

function membership(overrides = {}) {
  const material = {
    marker: "VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_EVENT_MEMBERSHIP_V1",
    version: 1,
    status:
      "finalized_content_committed_event_membership_verified_canonical_truth_pending",
    chain_id: "2050",
    finalized_receipt_admission_id: "voiddccfra1_" + "4".repeat(64),
    finality_verification_id: "voiddccrfv1_" + "5".repeat(64),
    checkpoint_attestation_id: "voiddccfca1_" + "6".repeat(64),
    signed_transaction_hash: "0x" + "1".repeat(64),
    registry_address: REGISTRY,
    publisher_address: PUBLISHER,
    object_id: payload.object_id,
    commitment: {
      object_id_sha256:
        ECONOMIC_EPOCH2_STATE_ROOT_OBJECT_ID_SHA256_V1,
      content_sha256:
        ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_SHA256_V1,
      byte_length:
        String(ECONOMIC_EPOCH2_STATE_ROOT_PAYLOAD_BYTES_V1),
      function_signature: "commit(bytes32,bytes32,uint64)",
      calldata_sha256: "8".repeat(64),
    },
    finalized_receipt: {
      block_number: "100",
      block_hash: "0x" + "2".repeat(64),
      accepted_checkpoint_height: "111",
      accepted_checkpoint_hash: "0x" + "3".repeat(64),
      finality_policy_id: "mainnet0-checkpoint-finality-v1",
      finality_kind: "operator_recognized_accepted_checkpoint",
      protocol_consensus_finality_claimed: false,
    },
    event_receipt: {
      log_index: "7",
      receipt_fingerprint_sha256: "9".repeat(64),
      receipt_revalidation_verified: true,
      canonical_block_hash_verified: true,
      event_receipt_membership_verified: true,
    },
    verification: {
      finalized_receipt_admission_id_rederived: true,
      commitment_receipt_verifier_invoked: true,
      exact_transaction_hash_bound: true,
      exact_registry_bound: true,
      exact_finalized_block_number_bound: true,
      exact_finalized_block_hash_bound: true,
      exact_object_digest_bound: true,
      exact_content_digest_bound: true,
      exact_byte_length_bound: true,
      event_receipt_membership_verified: true,
      canonical_commitment_truth_admitted: false,
    },
    authority: {
      source_only_membership_binding: true,
      transaction_submission_authorized: false,
      automatic_retry_authorized: false,
      filesystem_mutation_performed: false,
      sovereign_private_key_access_performed: false,
      wallet_access_performed: false,
      transaction_signing_performed: false,
      direct_rpc_call_performed: false,
      direct_network_call_performed: false,
      chain2050_write_direct_performed: false,
      validator_mutation_authorized: false,
      governance_mutation_authorized: false,
      work_credit_mutation_authorized: false,
      funds_action_authorized: false,
    },
    next_gate:
      "datanet_content_commitment_canonical_commitment_truth_admission_v1",
    ...overrides,
  };
  const eventId = "voiddccfem1_" + sha256(canonicalJson(material));
  return {
    ok: true,
    ...material,
    finalized_event_membership_id: eventId,
    event_receipt_membership_verified: true,
    canonical_commitment_truth_admitted: false,
    protocol_consensus_finality_claimed: false,
    filesystem_mutation_performed: false,
    sovereign_private_key_access_performed: false,
    wallet_access_performed: false,
    transaction_signing_performed: false,
    transaction_submission_performed: false,
    direct_rpc_call_performed: false,
    direct_network_call_performed: false,
    chain2050_write_direct_performed: false,
    authority_contract: {
      source_only_membership_binding: true,
      finalized_admission_required: true,
      admission_id_rederived: true,
      commitment_receipt_verifier_invoked: true,
      exact_transaction_binding_required: true,
      exact_registry_binding_required: true,
      exact_finalized_block_binding_required: true,
      exact_object_digest_binding_required: true,
      exact_content_digest_binding_required: true,
      exact_byte_length_binding_required: true,
      event_receipt_membership_verified: true,
      canonical_commitment_truth_admitted: false,
      protocol_consensus_finality_claimed: false,
      filesystem_read: false,
      filesystem_mutation: false,
      sovereign_private_key_access: false,
      wallet_access: false,
      transaction_signing: false,
      transaction_submission: false,
      direct_rpc_transport: false,
      direct_network_transport: false,
      chain2050_write_direct: false,
      validator_mutation: false,
      governance_mutation: false,
      work_credit_mutation: false,
      funds_action: false,
      automatic_retry: false,
    },
  };
}


function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function evidenceAt(observedAtUtc, validUntilUtc) {
  const evidence =
    buildVoidEconomicEpoch2PublicReadRuntimeEvidenceV1({
      facts: facts(),
      observedAtUtc,
      validUntilUtc,
      hostName: "zoso-Precision-Tower-7810",
    });
  const bytes = prettyBytes(evidence);
  return { evidence, bytes, sha256: digest(bytes) };
}

function compositionInput(
  evidence,
  membershipValue = membership(),
  evaluationTimeUtc = "2030-01-01T00:10:00Z",
) {
  const membershipBytes = prettyBytes(membershipValue);
  return {
    publicReadEvidenceBytes: evidence.bytes,
    expectedPublicReadEvidenceSha256: evidence.sha256,
    expectedPublicReadEvidenceId: evidence.evidence.evidence_id,
    evaluationTimeUtc,
    stateRootMembershipBytes: membershipBytes,
    expectedStateRootMembershipSha256: digest(membershipBytes),
    expectedRegistryAddress: REGISTRY,
    expectedPublisherAddress: PUBLISHER,
    reviewConfirmation:
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
  };
}

assert.equal(
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1,
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1",
);
const trueAuthorityKeys = new Set([
  "source_only_composition",
  "canonical_git_source_binding_required",
  "exact_dependency_git_blobs_required",
  "public_read_promotion_reexecuted",
  "canonical_state_root_import_promotion_reexecuted",
  "migration_classifier_reexecuted",
  "exact_scoped_candidate_merge_required",
  "create_only_private_output",
]);
for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_AUTHORITY_V1,
)) {
  assert.equal(value, trueAuthorityKeys.has(key), key);
}
assert.equal(
  Object.keys(
    VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1,
  ).length,
  10,
);

const fresh = evidenceAt(
  "2030-01-01T00:00:00Z",
  "2030-01-01T00:30:00Z",
);
const result = await composeVoidEconomicEpoch2PublicVerificationV1(
  compositionInput(fresh),
);

assert.equal(
  result.receipt.status,
  "EPOCH2_PUBLIC_VERIFICATION_COMPOSED_SOURCE_READY",
);
assert.match(result.receipt.composition_id, /^voide2pvc1_[0-9a-f]{64}$/u);
assert.equal(
  result.receipt.public_read.evaluation_time_utc,
  "2030-01-01T00:10:00Z",
);
assert.equal(
  result.receipt.public_read.public_balance_receipt_code_verification_ready,
  true,
);
assert.equal(
  result.receipt.state_root.real_finalized_membership_import_verified,
  true,
);
assert.equal(
  result.receipt.state_root.successor_state_root_public_void_anchor_ready,
  true,
);
assert.equal(result.receipt.final_migration_classifier_status, "SOURCE_READY");
assert.deepEqual(result.receipt.remaining_migration_gates, []);
assert.equal(
  result.final_migration_candidate.public_verification
    .public_balance_receipt_code_verification_ready,
  true,
);
assert.equal(
  result.final_migration_candidate.public_verification
    .successor_state_root_public_void_anchor_ready,
  true,
);
for (const [key, value] of Object.entries(
  result.final_migration_candidate.launch_authority,
)) {
  assert.equal(key === "source_only" ? value : value === false, true, key);
}

const repeat = await composeVoidEconomicEpoch2PublicVerificationV1(
  compositionInput(fresh),
);
assert.equal(repeat.receipt.composition_id, result.receipt.composition_id);
assert.equal(
  repeat.receipt.final_migration_candidate_sha256,
  result.receipt.final_migration_candidate_sha256,
);

await assert.rejects(
  () =>
    composeVoidEconomicEpoch2PublicVerificationV1({
      ...compositionInput(fresh),
      expectedPublicReadEvidenceSha256: "0".repeat(64),
    }),
  /public_read_evidence_sha256_mismatch/u,
);

await assert.rejects(
  () =>
    composeVoidEconomicEpoch2PublicVerificationV1({
      ...compositionInput(fresh),
      expectedStateRootMembershipSha256: "0".repeat(64),
    }),
  /state_root_membership_sha256_mismatch/u,
);

await assert.rejects(
  () =>
    composeVoidEconomicEpoch2PublicVerificationV1({
      ...compositionInput(fresh),
      reviewConfirmation: "wrong",
    }),
  /state_root_review_confirmation_invalid/u,
);

await assert.rejects(
  () =>
    composeVoidEconomicEpoch2PublicVerificationV1(
      compositionInput(
        fresh,
        membership(),
        "2030-01-01T00:31:00Z",
      ),
    ),
  /public_read_runtime_evidence_not_current/u,
);

await assert.rejects(
  () =>
    composeVoidEconomicEpoch2PublicVerificationV1({
      ...compositionInput(fresh),
      expectedRegistryAddress:
        "0x3333333333333333333333333333333333333333",
    }),
  /state_root_anchor_reviewed_membership_binding_mismatch|canonical_truth/u,
);

await assert.rejects(
  () =>
    composeVoidEconomicEpoch2PublicVerificationV1({
      ...compositionInput(fresh),
      migrationCandidate: {},
    }),
  /composition_input_keys_invalid/u,
);

{
  const oversized = Buffer.alloc(1024 * 1024 + 1, 0x20);
  await assert.rejects(
    () =>
      composeVoidEconomicEpoch2PublicVerificationV1({
        ...compositionInput(fresh),
        stateRootMembershipBytes: oversized,
        expectedStateRootMembershipSha256: digest(oversized),
      }),
    /state_root_membership_bytes_invalid/u,
  );
}

{
  const dirtyPath =
    "docs/operators/economic-epoch2-public-verification-composition-v1.md";
  const original = fs.readFileSync(dirtyPath);
  try {
    fs.appendFileSync(dirtyPath, "\n");
    await assert.rejects(
      () =>
        composeVoidEconomicEpoch2PublicVerificationV1(
          compositionInput(fresh),
        ),
      /repository_not_clean/u,
    );
  } finally {
    fs.writeFileSync(dirtyPath, original);
  }
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-public-verification-composition-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const nowMs = Date.now();
  const observed =
    new Date(Math.floor((nowMs - 5_000) / 1000) * 1000)
      .toISOString().replace(".000Z", "Z");
  const evaluation =
    new Date(Math.floor(nowMs / 1000) * 1000)
      .toISOString().replace(".000Z", "Z");
  const valid =
    new Date(Math.floor((nowMs + 25 * 60_000) / 1000) * 1000)
      .toISOString().replace(".000Z", "Z");
  const cliEvidence = evidenceAt(observed, valid);
  const membershipValue = membership();
  const membershipBytes = prettyBytes(membershipValue);
  const publicReadPath = path.join(temp, "public-read.json");
  const membershipPath = path.join(temp, "membership.json");
  const outputDir = path.join(temp, "out");
  fs.writeFileSync(publicReadPath, cliEvidence.bytes, { mode: 0o600 });
  fs.writeFileSync(membershipPath, membershipBytes, { mode: 0o600 });

  const cli = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-public-verification-composition-v1.mjs",
      "--public-read-evidence", publicReadPath,
      "--expected-public-read-sha256", cliEvidence.sha256,
      "--expected-public-read-evidence-id", cliEvidence.evidence.evidence_id,
      "--evaluation-time-utc", evaluation,
      "--state-root-membership", membershipPath,
      "--expected-membership-sha256", digest(membershipBytes),
      "--expected-registry-address", REGISTRY,
      "--expected-publisher-address", PUBLISHER,
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
      "--output-dir", outputDir,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(cli.stdout, /final_migration_classifier_status=SOURCE_READY/u);
  assert.match(cli.stdout, /canonical_candidate_mutation=false/u);
  assert.match(cli.stdout, /migration_activation=false/u);
  assert.equal(fs.statSync(outputDir).mode & 0o077, 0);
  for (const name of [
    "economic-epoch2-public-verification-composition-v1.json",
    "economic-evm-successor-migration-candidate-v1.json",
  ]) {
    assert.equal(fs.statSync(path.join(outputDir, name)).mode & 0o077, 0);
  }

  const second = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-public-verification-composition-v1.mjs",
      "--public-read-evidence", publicReadPath,
      "--expected-public-read-sha256", cliEvidence.sha256,
      "--expected-public-read-evidence-id", cliEvidence.evidence.evidence_id,
      "--evaluation-time-utc", evaluation,
      "--state-root-membership", membershipPath,
      "--expected-membership-sha256", digest(membershipBytes),
      "--expected-registry-address", REGISTRY,
      "--expected-publisher-address", PUBLISHER,
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
      "--output-dir", outputDir,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /output_dir_exists/u);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-public-verification-composition-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
  "fetch(",
  "verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "promoteVoidEconomicEpoch2PublicReadRuntimeV1",
  "promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1",
  "classifyVoidEconomicEvmSuccessorMigrationV1",
  "MAX_MEMBERSHIP_BYTES = 1024 * 1024",
  "merge-base",
  "--is-ancestor",
  "HEAD:",
  "canonical_origin_required",
  "dependency_worktree_blob_mismatch",
  "composition_tool_file_sha256",
  "independent_promotion_composition_mismatch",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1_PROOF_GREEN",
);
console.log("canonical_public_read_promotion_reexecuted=true");
console.log("canonical_state_root_import_promotion_reexecuted=true");
console.log("canonical_importer_1mib_membership_ceiling_inherited=true");
console.log("independent_promotion_scoped_merge_verified=true");
console.log("final_migration_classifier_status=SOURCE_READY");
console.log("remaining_migration_gate_count=0");
console.log("dirty_worktree_held=true");
console.log("oversized_membership_held=true");
console.log("create_only_private_output_green=true");
console.log("canonical_candidate_mutation=false");
console.log("migration_activation=false");
console.log("public_activation=false");
console.log("funds_movement=false");
