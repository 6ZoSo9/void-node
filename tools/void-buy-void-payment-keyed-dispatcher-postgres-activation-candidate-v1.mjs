#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CANDIDATE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json",
);

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;

const REVIEWED_INHERITED_SOURCE_MAIN_COMMIT =
  "eef17f65a8bd495d581df3b91d9a411a5402cde8";
const REVIEWED_CANDIDATE_GENERATION_COMMIT =
  "5ad02d7f11b1176645f7eecceea9716e91dbb9aa";
const REVIEWED_CANDIDATE_GENERATION_TREE =
  "de4f0b67bf9255e27817fe7bbf8d423a65c94fa9";

const EXPECTED_INHERITED_SOURCE_BLOBS = Object.freeze({
  "src/economic/buy_void_runtime_integration_v1.ts":
    "00dad9a345dcbdc9d96bc0f61543f8d0db63e0ac",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "1c238ae8dff7e088421eabff93a98d97357d99e7",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts":
    "2db30a0d7f343c5c1264d89ec5c752ade609d843",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts":
    "f74cafa7665be4ac0ea4fd518ec02440d337fa27",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts":
    "27045345cf48cacd2a5f2bc9330812579d0761a4",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.ts":
    "1495c6dd21cfda1608ea29885d98617784a04bb0",
});

const EXPECTED_CANDIDATE_GENERATION_SOURCE_BLOBS = Object.freeze({
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts":
    "4e5d9a633b05d9254424c2132fc6620b94ff3692",
});

const EXPECTED_READINESS = Object.freeze({
  parent_enabled: true,
  root_dir: "/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1",
  policy_configured: true,
  signing_dependency_env_configured: true,
  full_runtime_policy_fingerprint_sha256:
    "b56c0abde0ea767711053a15975863ee012758c07907e729ca016f2a3190bd92",
  runtime_policy_fingerprint_sha256:
    "ba23302c2af292e78c07692d58d8bb03090ad695943cdbb15d6b9af394aa7c88",
  preparation_policy_fingerprint_sha256:
    "3f4361d0ac5dac407e4ab1ae3f47b86e497f5af3db481a586c2c3f92b8f85da5",
  receipt_policy_fingerprint_sha256:
    "23fac2c2de846eb99bc3647bfe54a83f704a5bc95a336eb1cc6edf54664390e4",
  history_carrier_authority_id:
    "d4c9e22f0d619e7377ec0388bb8cdc19ef8d3782138ec87c3fe5ef271040af81",
  history_carrier_generation: 1,
  history_carrier_activation_ready: true,
  history_carrier_activation_hold_reason: "",
  postgres_configuration_fingerprint_sha256:
    "8482aae40f7328749a168a2d64eef4afb67fee218b89425ea5c79d8cbbb52d40",
  postgres_schema_fingerprint_sha256:
    "89616f198b0c0a47eef264701ebfce23d3aae3f98474cf050584ea9e899d66f1",
});

const EXPECTED_GATE_STATE = Object.freeze({
  parent_runtime: "1",
  claimed_runtime: "0",
  full_runtime: "0",
  admitted_guarded_runtime: "0",
  full_runtime_apply: "0",
});

const EXPECTED_PHASE_ORDER = Object.freeze([
  "dormant",
  "claimed_exclusive",
  "full_preview",
  "admission_armed",
  "live_apply",
]);

const EXPECTED_TRANSITION_POLICY = Object.freeze({
  staged_adjacent_only: true,
  atomic_restart_dormant_to_live_apply_allowed: true,
  atomic_restart_live_apply_to_dormant_allowed: true,
  atomic_restart_single_config_generation_required: true,
  atomic_restart_configuration_digest_derived_from_gate_material: true,
  atomic_restart_generation_id_derived_from_configuration_digest: true,
  non_atomic_multi_gate_transition_forbidden: true,
  claimed_selector_required_when_apply_live: true,
  full_runtime_required_when_apply_live: true,
  admitted_runtime_required_when_apply_live: true,
  staged_rollback_clears_apply_first: true,
  automatic_retry: false,
});

const EXPECTED_AUTHORITY = Object.freeze({
  source_candidate_only: true,
  activation_authorized: false,
  host_mutation: false,
  service_mutation: false,
  runtime_gate_mutation: false,
  credential_read: false,
  database_mutation: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

function fail(reason) {
  throw new Error(reason);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function exactObject(value, expected, label) {
  if (!plain(value)) fail(label + "_not_object");
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail(label + "_keys_mismatch");
  }
  for (const key of expectedKeys) {
    if (value[key] !== expected[key]) {
      fail(label + "_value_mismatch:" + key);
    }
  }
}

function gitRevParse(spec, code) {
  try {
    const value = execFileSync(
      "git",
      ["-C", ROOT, "rev-parse", spec],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_OPTIONAL_LOCKS: "0",
        },
      },
    ).trim();
    if (!HEX40.test(value)) fail(code);
    return value;
  } catch {
    fail(code);
  }
}

function gitBlobAt(ref, relativePath) {
  return gitRevParse(
    `${ref}:${relativePath}`,
    "source_blob_identity_failed:" + relativePath,
  );
}

function requireCleanRepositoryIdentity() {
  let status;
  try {
    status = execFileSync(
      "git",
      [
        "-C",
        ROOT,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_OPTIONAL_LOCKS: "0",
        },
      },
    );
  } catch {
    fail("repository_status_unavailable");
  }
  if (status !== "") fail("repository_worktree_not_clean");
  return Object.freeze({
    repository_head_sha: gitRevParse(
      "HEAD",
      "repository_head_unavailable",
    ),
    repository_tree_sha: gitRevParse(
      "HEAD^{tree}",
      "repository_tree_unavailable",
    ),
  });
}

function requireReviewedCommitAncestor(reviewedCommit) {
  const result = spawnSync(
    "git",
    ["-C", ROOT, "merge-base", "--is-ancestor", reviewedCommit, "HEAD"],
    {
      stdio: ["ignore", "ignore", "ignore"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
      },
    },
  );
  if (result.status !== 0) {
    fail("reviewed_source_main_not_ancestor_of_head");
  }
}

export function verifyVoidBuyVoidPostgresActivationCandidateV1(
  value,
  { verifyFilesystem = true } = {},
) {
  if (!plain(value)) fail("candidate_not_object");
  const topKeys = [
    "marker",
    "version",
    "status",
    "reviewed_inherited_source_main_commit",
    "reviewed_inherited_source_blobs",
    "reviewed_candidate_generation_commit",
    "reviewed_candidate_generation_tree",
    "reviewed_candidate_generation_source_blobs",
    "observed_readiness",
    "observed_gate_state",
    "activation_phase_order",
    "transition_policy",
    "authority",
  ].sort();
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(topKeys)) {
    fail("candidate_top_level_keys_mismatch");
  }

  if (
    value.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1 ||
    value.version !== 1 ||
    value.status !==
      "source_candidate_activation_contract_only_no_gate_change_authorized"
  ) {
    fail("candidate_identity_mismatch");
  }

  if (
    value.reviewed_inherited_source_main_commit
      !== REVIEWED_INHERITED_SOURCE_MAIN_COMMIT
  ) {
    fail("reviewed_inherited_source_main_commit_invalid");
  }
  if (
    value.reviewed_candidate_generation_commit
      !== REVIEWED_CANDIDATE_GENERATION_COMMIT ||
    value.reviewed_candidate_generation_tree
      !== REVIEWED_CANDIDATE_GENERATION_TREE
  ) {
    fail("reviewed_candidate_generation_identity_invalid");
  }

  exactObject(
    value.reviewed_inherited_source_blobs,
    EXPECTED_INHERITED_SOURCE_BLOBS,
    "reviewed_inherited_source_blobs",
  );
  exactObject(
    value.reviewed_candidate_generation_source_blobs,
    EXPECTED_CANDIDATE_GENERATION_SOURCE_BLOBS,
    "reviewed_candidate_generation_source_blobs",
  );

  let repositoryIdentity = null;
  if (verifyFilesystem) {
    repositoryIdentity = requireCleanRepositoryIdentity();
    requireReviewedCommitAncestor(
      value.reviewed_inherited_source_main_commit,
    );
    requireReviewedCommitAncestor(
      value.reviewed_candidate_generation_commit,
    );
    if (
      gitRevParse(
        value.reviewed_candidate_generation_commit + "^{tree}",
        "reviewed_candidate_generation_tree_unavailable",
      ) !== value.reviewed_candidate_generation_tree
    ) {
      fail("reviewed_candidate_generation_tree_mismatch");
    }

    for (const [relativePath, expectedBlob] of
      Object.entries(EXPECTED_INHERITED_SOURCE_BLOBS)) {
      if (
        gitBlobAt(
          value.reviewed_inherited_source_main_commit,
          relativePath,
        ) !== expectedBlob
      ) {
        fail("reviewed_inherited_source_blob_mismatch:" + relativePath);
      }
      if (gitBlobAt("HEAD", relativePath) !== expectedBlob) {
        fail("head_inherited_source_blob_mismatch:" + relativePath);
      }
    }

    for (const [relativePath, expectedBlob] of
      Object.entries(EXPECTED_CANDIDATE_GENERATION_SOURCE_BLOBS)) {
      if (
        gitBlobAt(
          value.reviewed_candidate_generation_commit,
          relativePath,
        ) !== expectedBlob
      ) {
        fail(
          "reviewed_candidate_generation_source_blob_mismatch:"
            + relativePath,
        );
      }
      if (gitBlobAt("HEAD", relativePath) !== expectedBlob) {
        fail("head_candidate_generation_source_blob_mismatch:" + relativePath);
      }
    }
  }

  exactObject(
    value.observed_readiness,
    EXPECTED_READINESS,
    "observed_readiness",
  );
  for (const [key, val] of Object.entries(value.observed_readiness)) {
    if (
      key.endsWith("_sha256") &&
      (typeof val !== "string" || !HEX64.test(val))
    ) {
      fail("readiness_sha256_invalid:" + key);
    }
  }
  if (
    typeof value.observed_readiness.history_carrier_authority_id !== "string" ||
    !HEX64.test(value.observed_readiness.history_carrier_authority_id)
  ) {
    fail("history_carrier_authority_id_invalid");
  }

  exactObject(
    value.observed_gate_state,
    EXPECTED_GATE_STATE,
    "observed_gate_state",
  );

  if (
    !Array.isArray(value.activation_phase_order) ||
    JSON.stringify(value.activation_phase_order) !==
      JSON.stringify(EXPECTED_PHASE_ORDER)
  ) {
    fail("activation_phase_order_mismatch");
  }

  exactObject(
    value.transition_policy,
    EXPECTED_TRANSITION_POLICY,
    "transition_policy",
  );
  exactObject(value.authority, EXPECTED_AUTHORITY, "authority");

  return Object.freeze({
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1,
    version: 1,
    status: "candidate_verified_activation_not_authorized",
    current_phase: "dormant",
    readiness_bound: true,
    source_blobs_bound: true,
    reviewed_inherited_source_main_commit:
      value.reviewed_inherited_source_main_commit,
    reviewed_candidate_generation_commit:
      value.reviewed_candidate_generation_commit,
    reviewed_candidate_generation_tree:
      value.reviewed_candidate_generation_tree,
    repository_head_sha:
      repositoryIdentity?.repository_head_sha ?? null,
    repository_tree_sha:
      repositoryIdentity?.repository_tree_sha ?? null,
    activation_authorized: false,
    runtime_gate_mutation: false,
    service_mutation: false,
    credential_read: false,
    database_mutation: false,
    transaction_broadcast: false,
    funds_movement: false,
  });
}

export function loadAndVerifyVoidBuyVoidPostgresActivationCandidateV1() {
  const value = JSON.parse(fs.readFileSync(CANDIDATE, "utf8"));
  return verifyVoidBuyVoidPostgresActivationCandidateV1(value);
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (direct) {
  try {
    const result = loadAndVerifyVoidBuyVoidPostgresActivationCandidateV1();
    console.log(
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1,
    );
    console.log("status=" + result.status);
    console.log("current_phase=" + result.current_phase);
    console.log("readiness_bound=true");
    console.log("source_blobs_bound=true");
    console.log(
      "reviewed_candidate_generation_commit="
        + result.reviewed_candidate_generation_commit,
    );
    console.log(
      "reviewed_candidate_generation_tree="
        + result.reviewed_candidate_generation_tree,
    );
    console.log("repository_head_sha=" + result.repository_head_sha);
    console.log("repository_tree_sha=" + result.repository_tree_sha);
    console.log("activation_authorized=false");
    console.log("runtime_gate_mutation=false");
    console.log("service_mutation=false");
    console.log("credential_read=false");
    console.log("database_mutation=false");
    console.log("transaction_broadcast=false");
    console.log("funds_movement=false");
    console.log(
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1_GREEN",
    );
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1_HOLD",
    );
    console.error(
      "reason=" + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
