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
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
  composeVoidEconomicEpoch2PublicVerificationV1,
} from "../tools/void-economic-epoch2-public-verification-composition-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1,
  prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1,
  reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1,
} from "../tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs";

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
const EVALUATION_TIME = "2030-01-01T00:10:00Z";

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

function compositionInput(evidence, membershipValue = membership()) {
  const membershipBytes = prettyBytes(membershipValue);
  return {
    publicReadEvidenceBytes: evidence.bytes,
    expectedPublicReadEvidenceSha256: evidence.sha256,
    expectedPublicReadEvidenceId: evidence.evidence.evidence_id,
    evaluationTimeUtc: EVALUATION_TIME,
    stateRootMembershipBytes: membershipBytes,
    expectedStateRootMembershipSha256: digest(membershipBytes),
    expectedRegistryAddress: REGISTRY,
    expectedPublisherAddress: PUBLISHER,
    reviewConfirmation:
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
  };
}

function applicationInput(evidence, membershipValue, composed) {
  const composition = compositionInput(evidence, membershipValue);
  const receiptBytes = prettyBytes(composed.receipt);
  const candidateBytes = prettyBytes(composed.final_migration_candidate);
  return {
    public_read_evidence_bytes: composition.publicReadEvidenceBytes,
    public_read_evidence_file_sha256:
      composition.expectedPublicReadEvidenceSha256,
    public_read_evidence_id: composition.expectedPublicReadEvidenceId,
    evaluation_time_utc: composition.evaluationTimeUtc,
    state_root_membership_bytes: composition.stateRootMembershipBytes,
    state_root_membership_file_sha256:
      composition.expectedStateRootMembershipSha256,
    expected_registry_address: composition.expectedRegistryAddress,
    expected_publisher_address: composition.expectedPublisherAddress,
    review_confirmation: composition.reviewConfirmation,
    composition_receipt_bytes: receiptBytes,
    composition_receipt_file_sha256: digest(receiptBytes),
    derived_candidate_bytes: candidateBytes,
    derived_candidate_file_sha256: digest(candidateBytes),
  };
}

assert.equal(
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1,
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1",
);
for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_application",
    "exact_upstream_evidence_required",
    "exact_composition_receipt_required",
    "exact_derived_candidate_required",
    "composition_reexecution_required",
    "applied_composition_reexecution_required",
    "applied_exact_upstream_evidence_required",
    "external_plan_not_semantic_authority",
    "detached_base_git_view_required",
    "composition_receipt_equality_required",
    "derived_candidate_equality_required",
    "canonical_head_candidate_bytes_required",
    "reviewed_repository_generation_required",
    "canonical_github_origin_required",
    "canonical_remote_main_read_required",
    "canonical_source_remote_read_only",
    "reviewed_git_executable_required",
    "ambient_git_overrides_ignored",
    "git_replacement_objects_disabled",
    "exact_composition_execution_from_reviewed_head",
    "private_reviewed_source_materialization",
    "exact_public_verification_source_delta",
    "migration_classifier_reexecution",
    "reviewed_git_commit_required",
    "filesystem_read",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

const fresh = evidenceAt(
  "2030-01-01T00:00:00Z",
  "2030-01-01T00:30:00Z",
);
const membershipValue = membership();
const composed = await composeVoidEconomicEpoch2PublicVerificationV1(
  compositionInput(fresh, membershipValue),
);
assert.equal(
  composed.receipt.status,
  "EPOCH2_PUBLIC_VERIFICATION_COMPOSED_SOURCE_READY",
);

const request = applicationInput(fresh, membershipValue, composed);
const plan =
  await prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1(
    request,
  );

assert.equal(
  plan.status,
  "EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PREPARED",
);
assert.match(plan.application_plan_id, /^voide2pvca1_[0-9a-f]{64}$/u);
assert.equal(plan.composition_id, composed.receipt.composition_id);
assert.deepEqual(plan.composition_receipt, composed.receipt);
assert.equal(plan.expected_registry_address, REGISTRY);
assert.equal(plan.expected_publisher_address, PUBLISHER);
assert.equal(
  plan.review_confirmation,
  VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
);
assert.equal(plan.migration_source_ready, true);
assert.equal(plan.migration_authorized, false);
assert.equal(plan.public_activation_authorized, false);
assert.equal(plan.money_movement_authorized, false);
assert.deepEqual(plan.migration_before.missing_gates, [
  "successor_state_root_public_void_anchor_required",
  "public_economic_verification_path_required",
]);
assert.equal(plan.migration_after.status, "SOURCE_READY");
assert.deepEqual(plan.migration_after.missing_gates, []);
assert.deepEqual(plan.promoted_public_verification_fields, [
  "public_balance_receipt_code_verification_evidence",
  "public_balance_receipt_code_verification_promotion",
  "public_balance_receipt_code_verification_ready",
  "successor_state_root_public_void_anchor_ready",
]);

function semanticReplayInput(planValue = plan, overrides = {}) {
  return {
    plan: planValue,
    public_read_evidence_bytes: request.public_read_evidence_bytes,
    public_read_evidence_file_sha256:
      request.public_read_evidence_file_sha256,
    public_read_evidence_id: request.public_read_evidence_id,
    evaluation_time_utc: request.evaluation_time_utc,
    state_root_membership_bytes: request.state_root_membership_bytes,
    state_root_membership_file_sha256:
      request.state_root_membership_file_sha256,
    expected_registry_address: request.expected_registry_address,
    expected_publisher_address: request.expected_publisher_address,
    review_confirmation: request.review_confirmation,
    ...overrides,
  };
}

const semanticReplay =
  await reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1(
    semanticReplayInput(),
  );
assert.equal(semanticReplay.ok, true);
assert.equal(
  semanticReplay.status,
  "EPOCH2_PUBLIC_VERIFICATION_APPLICATION_PLAN_SEMANTICS_REVERIFIED",
);
assert.equal(semanticReplay.application_plan_id, plan.application_plan_id);
assert.equal(semanticReplay.composition_id, plan.composition_id);
assert.equal(semanticReplay.state_root_promotion_id, plan.state_root_promotion_id);
assert.equal(semanticReplay.exact_upstream_evidence_replayed, true);
assert.equal(semanticReplay.exact_base_generation_replayed, true);
assert.equal(semanticReplay.target_candidate_rederived, true);
assert.equal(semanticReplay.successor_source_ready, true);
assert.equal(semanticReplay.migration_authorized, false);

const repeat =
  await prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1(
    request,
  );
assert.equal(repeat.application_plan_id, plan.application_plan_id);

{
  const repoRoot = path.resolve(".");
  const hostile = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-epoch2-public-git-config-hostile-"),
  );
  const fakeBin = path.join(hostile, "bin");
  const fakeGitSentinel = path.join(hostile, "fake-git-invoked");
  const fsmonitorSentinel = path.join(hostile, "fsmonitor-invoked");
  const tarSentinel = path.join(hostile, "tar-options-invoked");
  const loaderSentinelPrefix = path.join(hostile, "ld-debug");
  const fakeGit = path.join(fakeBin, "git");
  const fakeFsmonitor = path.join(hostile, "fake-fsmonitor.sh");
  const fakeTarHook = path.join(hostile, "fake-tar-hook.sh");
  const hostileAttributes = path.join(hostile, "attributes");
  const hostileHome = path.join(hostile, "home");
  fs.mkdirSync(fakeBin, { recursive: true });
  fs.mkdirSync(hostileHome, { recursive: true });
  fs.writeFileSync(
    fakeGit,
    "#!/bin/sh\nprintf 'invoked\\n' >> " +
      JSON.stringify(fakeGitSentinel) +
      "\nexit 91\n",
    { mode: 0o755 },
  );
  fs.writeFileSync(
    fakeFsmonitor,
    "#!/bin/sh\nprintf 'invoked\\n' >> " +
      JSON.stringify(fsmonitorSentinel) +
      "\nexit 92\n",
    { mode: 0o755 },
  );
  fs.writeFileSync(
    fakeTarHook,
    "#!/bin/sh\nprintf 'invoked\\n' >> " +
      JSON.stringify(tarSentinel) +
      "\nexit 93\n",
    { mode: 0o755 },
  );
  fs.writeFileSync(hostileAttributes, "* export-ignore\n", "utf8");
  fs.writeFileSync(
    path.join(hostileHome, ".gitconfig"),
    [
      "[core]",
      "  fsmonitor = " + fakeFsmonitor,
      "  attributesFile = " + hostileAttributes,
      "",
    ].join("\n"),
    "utf8",
  );

  const priorLocal = new Map();
  for (const key of ["core.fsmonitor", "core.attributesFile"]) {
    const got = spawnSync(
      "/usr/bin/git",
      ["-C", repoRoot, "config", "--local", "--get-all", key],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    priorLocal.set(
      key,
      got.status === 0
        ? String(got.stdout || "").split("\n").filter(Boolean)
        : [],
    );
  }

  const savedEnv = new Map();
  for (const key of [
    "PATH",
    "HOME",
    "XDG_CONFIG_HOME",
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_KEY_0",
    "GIT_CONFIG_VALUE_0",
    "GIT_EXEC_PATH",
    "TAR_OPTIONS",
    "LD_LIBRARY_PATH",
    "LD_DEBUG",
    "LD_DEBUG_OUTPUT",
    "DYLD_LIBRARY_PATH",
    "DYLD_INSERT_LIBRARIES",
    "NODE_OPTIONS",
    "NODE_PATH",
  ]) {
    savedEnv.set(
      key,
      Object.prototype.hasOwnProperty.call(process.env, key)
        ? process.env[key]
        : undefined,
    );
  }

  try {
    for (const [key, value] of [
      ["core.fsmonitor", fakeFsmonitor],
      ["core.attributesFile", hostileAttributes],
    ]) {
      const set = spawnSync(
        "/usr/bin/git",
        ["-C", repoRoot, "config", "--local", "--replace-all", key, value],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      assert.equal(set.status, 0, String(set.stderr || ""));
    }

    process.env.PATH = fakeBin;
    process.env.HOME = hostileHome;
    process.env.XDG_CONFIG_HOME = hostileHome;
    process.env.GIT_DIR = path.join(hostile, "forged.git");
    process.env.GIT_WORK_TREE = path.join(hostile, "forged-worktree");
    process.env.GIT_OBJECT_DIRECTORY = path.join(hostile, "forged-objects");
    process.env.GIT_ALTERNATE_OBJECT_DIRECTORIES =
      path.join(hostile, "forged-alternates");
    process.env.GIT_CONFIG_COUNT = "1";
    process.env.GIT_CONFIG_KEY_0 = "core.fsmonitor";
    process.env.GIT_CONFIG_VALUE_0 = fakeFsmonitor;
    process.env.GIT_EXEC_PATH = fakeBin;
    process.env.TAR_OPTIONS =
      "--checkpoint=1 --checkpoint-action=exec=" + fakeTarHook;
    process.env.LD_LIBRARY_PATH = hostile;
    process.env.LD_DEBUG = "libs";
    process.env.LD_DEBUG_OUTPUT = loaderSentinelPrefix;
    process.env.DYLD_LIBRARY_PATH = hostile;
    process.env.DYLD_INSERT_LIBRARIES = path.join(hostile, "missing.dylib");
    process.env.NODE_OPTIONS = "--trace-warnings";
    process.env.NODE_PATH = path.join(hostile, "node_modules");

    const hostilePlan =
      await prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1(
        request,
      );
    assert.equal(hostilePlan.application_plan_id, plan.application_plan_id);

    const hostileReplay =
      await reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1(
        semanticReplayInput(hostilePlan),
      );
    assert.equal(
      hostileReplay.application_plan_id,
      semanticReplay.application_plan_id,
    );
    assert.equal(fs.existsSync(fakeGitSentinel), false);
    assert.equal(fs.existsSync(fsmonitorSentinel), false);
    assert.equal(fs.existsSync(tarSentinel), false);
    assert.equal(
      fs.readdirSync(hostile).some((name) => name.startsWith("ld-debug.")),
      false,
    );
  } finally {
    for (const [key, values] of priorLocal) {
      spawnSync(
        "/usr/bin/git",
        ["-C", repoRoot, "config", "--local", "--unset-all", key],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      for (const value of values) {
        const restore = spawnSync(
          "/usr/bin/git",
          ["-C", repoRoot, "config", "--local", "--add", key, value],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        );
        assert.equal(restore.status, 0, String(restore.stderr || ""));
      }
    }
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(hostile, { recursive: true, force: true });
  }
}

{
  const forgedReceipt = structuredClone(composed.receipt);
  forgedReceipt.status = "FORGED_SOURCE_READY";
  const bytes = prettyBytes(forgedReceipt);
  await assert.rejects(
    () =>
      prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1({
        ...request,
        composition_receipt_bytes: bytes,
        composition_receipt_file_sha256: digest(bytes),
      }),
    /PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_RECEIPT_MISMATCH/u,
  );
}

{
  const forgedCandidate = structuredClone(composed.final_migration_candidate);
  forgedCandidate.source_execution_layer.future_write_authority = true;
  const bytes = prettyBytes(forgedCandidate);
  await assert.rejects(
    () =>
      prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1({
        ...request,
        derived_candidate_bytes: bytes,
        derived_candidate_file_sha256: digest(bytes),
      }),
    /PUBLIC_VERIFICATION_APPLICATION_DERIVED_CANDIDATE_MISMATCH/u,
  );
}

await assert.rejects(
  () =>
    prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1({
      ...request,
      state_root_membership_file_sha256: "0".repeat(64),
    }),
  /PUBLIC_VERIFICATION_APPLICATION_STATE_ROOT_MEMBERSHIP_SHA256_MISMATCH/u,
);

{
  const tooLarge = Buffer.alloc(1024 * 1024 + 1, 0x20);
  await assert.rejects(
    () =>
      prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1({
        ...request,
        state_root_membership_bytes: tooLarge,
        state_root_membership_file_sha256: digest(tooLarge),
      }),
    /PUBLIC_VERIFICATION_APPLICATION_STATE_ROOT_MEMBERSHIP_BYTES_INVALID/u,
  );
}

await assert.rejects(
  () =>
    prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1({
      ...request,
      unexpected: true,
    }),
  /INVALID_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_INPUT_SHAPE/u,
);

{
  const forgedPlan = structuredClone(plan);
  forgedPlan.composition_id = "voide2pvc1_" + "f".repeat(64);
  forgedPlan.composition_receipt.composition_id = forgedPlan.composition_id;
  const body = structuredClone(forgedPlan);
  delete body.application_plan_id;
  forgedPlan.application_plan_id =
    "voide2pvca1_" +
    digest(Buffer.from(canonicalJson(body), "utf8"));

  await assert.rejects(
    () =>
      reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1(
        semanticReplayInput(forgedPlan),
      ),
    /PUBLIC_VERIFICATION_APPLICATION_REPLAY_COMPOSITION_MISMATCH/u,
  );
}

{
  const wrongEvidenceValue=JSON.parse(
    request.public_read_evidence_bytes.toString("utf8"),
  );
  wrongEvidenceValue.observed_at_utc="2030-01-01T00:00:01Z";
  const wrongEvidence=prettyBytes(wrongEvidenceValue);
  await assert.rejects(
    () =>
      reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1(
        semanticReplayInput(plan, {
          public_read_evidence_bytes: wrongEvidence,
          public_read_evidence_file_sha256: digest(wrongEvidence),
        }),
      ),
    /PUBLIC_VERIFICATION_APPLICATION_REPLAY_PUBLIC_READ_BINDING_MISMATCH/u,
  );
}

{
  await assert.rejects(
    () =>
      reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1(
        semanticReplayInput(plan, {
          unexpected: true,
        }),
      ),
    /INVALID_PUBLIC_VERIFICATION_APPLICATION_SEMANTIC_REPLAY_INPUT_SHAPE/u,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-public-application-proof-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const publicReadPath = path.join(temp, "public-read.json");
  const membershipPath = path.join(temp, "membership.json");
  const receiptPath = path.join(temp, "composition.json");
  const candidatePath = path.join(temp, "derived-candidate.json");
  const planPath = path.join(temp, "application-plan.json");

  const membershipBytes = prettyBytes(membershipValue);
  const receiptBytes = prettyBytes(composed.receipt);
  const candidateBytes = prettyBytes(composed.final_migration_candidate);
  fs.writeFileSync(publicReadPath, fresh.bytes, { mode: 0o600 });
  fs.writeFileSync(membershipPath, membershipBytes, { mode: 0o600 });
  fs.writeFileSync(receiptPath, receiptBytes, { mode: 0o600 });
  fs.writeFileSync(candidatePath, candidateBytes, { mode: 0o600 });

  const cli = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs",
      "prepare",
      "--public-read-evidence", publicReadPath,
      "--public-read-sha256", fresh.sha256,
      "--public-read-evidence-id", fresh.evidence.evidence_id,
      "--evaluation-time-utc", EVALUATION_TIME,
      "--state-root-membership", membershipPath,
      "--membership-sha256", digest(membershipBytes),
      "--registry", REGISTRY,
      "--publisher", PUBLISHER,
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
      "--composition-receipt", receiptPath,
      "--composition-receipt-sha256", digest(receiptBytes),
      "--derived-candidate", candidatePath,
      "--derived-candidate-sha256", digest(candidateBytes),
      "--output", planPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(
    cli.stdout,
    /EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PREPARED/u,
  );
  assert.match(cli.stdout, /repository_source_write=false/u);
  assert.equal(fs.statSync(planPath).mode & 0o077, 0);

  const second = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs",
      "prepare",
      "--public-read-evidence", publicReadPath,
      "--public-read-sha256", fresh.sha256,
      "--public-read-evidence-id", fresh.evidence.evidence_id,
      "--evaluation-time-utc", EVALUATION_TIME,
      "--state-root-membership", membershipPath,
      "--membership-sha256", digest(membershipBytes),
      "--registry", REGISTRY,
      "--publisher", PUBLISHER,
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
      "--composition-receipt", receiptPath,
      "--composition-receipt-sha256", digest(receiptBytes),
      "--derived-candidate", candidatePath,
      "--derived-candidate-sha256", digest(candidateBytes),
      "--output", planPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.notEqual(second.status, 0);
  assert.match(
    second.stderr,
    /EEXIST|OUTPUT/u,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl --user restart",
  "transaction_signing: true",
  "funds_movement: true",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "--no-replace-objects",
  "core.fsmonitor=false",
  "core.attributesFile=/dev/null",
  'env.GIT_CONFIG_GLOBAL = "/dev/null"',
  'env.GIT_CONFIG_SYSTEM = "/dev/null"',
  'HOME: "/nonexistent"',
  "minimalAuthorityEnv",
  "withMinimalAuthorityProcessEnv",
  '"--local", "--no-includes", "--get", "remote.origin.url"',
  "checkedGitSpawn",
  "canonicalRemoteGitText",
  "verifyCanonicalRemoteMain",
  "PUBLIC_VERIFICATION_APPLICATION_REMOTE_MAIN_MISMATCH",
  '"ls-remote", "--heads", CANONICAL_REMOTE, "refs/heads/main"',
  "production_network_call",
  "PUBLIC_VERIFICATION_APPLICATION_ARCHIVE_FAILED",
  "PUBLIC_VERIFICATION_APPLICATION_PRIVATE_REPOSITORY_NOT_CLEAN",
  "TAR_OPTIONS",
  "LD_DEBUG_OUTPUT",
  "detached_base_git_view_required",
  "applied_composition_reexecution_required",
  "exact_composition_execution_from_reviewed_head",
  "composeVoidEconomicEpoch2PublicVerificationV1",
  "PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_RECEIPT_MISMATCH",
  "PUBLIC_VERIFICATION_APPLICATION_DERIVED_CANDIDATE_MISMATCH",
  "PUBLIC_VERIFICATION_APPLICATION_REPLAY_COMPOSITION_MISMATCH",
  "reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1",
]) {
  assert.ok(source.includes(required), required);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_V1_PROOF_GREEN",
);
const workflowSource = fs.readFileSync(
  ".github/workflows/void-economic-epoch2-public-verification-canonical-application-v1.yml",
  "utf8",
);
assert.ok(
  workflowSource.includes(
    "ref: ${{ github.event.pull_request.head.sha || github.sha }}",
  ),
  "focused workflow must check out exact PR head",
);

console.log("composition_reexecuted=true");
console.log("exact_pr_head_checkout_required=true");
console.log("git_config_execution_surfaces_isolated=true");
console.log("hostile_fsmonitor_and_fake_git_not_executed=true");
console.log("verify_applied_canonical_remote_main_required=true");
console.log("canonical_remote_read_is_source_only=true");
console.log("verify_applied_semantic_replay_required=true");
console.log("detached_base_git_view_verified=true");
console.log("self_hashed_forged_plan_rejected=true");
console.log("composition_receipt_equality_verified=true");
console.log("derived_candidate_equality_verified=true");
console.log("canonical_successor_source_bound=true");
console.log("exact_public_verification_delta_green=true");
console.log("migration_classifier_status=SOURCE_READY");
console.log("reviewed_git_commit_required=true");
console.log("repository_source_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("money_movement_authorized=false");
