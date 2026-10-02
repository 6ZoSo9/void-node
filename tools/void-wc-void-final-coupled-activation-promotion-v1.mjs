#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "./void-economic-evm-successor-migration-v1.mjs";
import {
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "./void-wc-void-coupled-launch-readiness-v1.mjs";

export const VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1 =
  "VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1";
export const VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1 =
  "VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1";

const FINAL_COUPLED_VERIFIED_SOURCE_CAPABILITY = Symbol(
  "VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_VERIFIED_SOURCE_V1",
);
const VERIFIED_SOURCE_PROMOTIONS = new WeakSet();

export const VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_promotion_only: true,
    canonical_candidate_read: true,
    git_application_lineage_read: true,
    candidate_copy_derivation: true,
    create_only_private_output: true,
    git_config_isolated: true,
    git_loader_environment_isolated: true,
    canonical_remote_tls_verification_required: true,
    private_input_descriptor_bound: true,
    private_input_parent_identity_bound: true,
    private_output_parent_fd_bound: true,
    private_output_exact_directory_fsync: true,
    canonical_candidate_write: false,
    filesystem_write_outside_private_output: false,
    runtime_mutation: false,
    systemd_or_service_mutation: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    migration_activation: false,
    funds_movement: false,
  });

const VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PREVIEW_AUTHORITY_V1 =
  Object.freeze({
    ...VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_AUTHORITY_V1,
    source_promotion_only: false,
    canonical_candidate_read: false,
    git_application_lineage_read: false,
    create_only_private_output: false,
    git_config_isolated: false,
    git_loader_environment_isolated: false,
    canonical_remote_tls_verification_required: false,
    private_input_descriptor_bound: false,
    private_input_parent_identity_bound: false,
    private_output_parent_fd_bound: false,
    private_output_exact_directory_fsync: false,
  });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const PRODUCTION_REL =
  "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const CANONICAL_REMOTE =
  "https://github.com/6ZoSo9/void-node.git";

const APPLICATION_VERIFIERS = Object.freeze({
  bounded_canary: Object.freeze({
    module:
      "tools/void-wc-void-bounded-canary-canonical-application-v1.mjs",
    export_name:
      "verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1",
    expected_status:
      "CANONICAL_BOUNDED_CANARY_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    argument_style: "camel",
  }),
  economic_epoch2_public_verification: Object.freeze({
    module:
      "tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs",
    export_name:
      "verifyVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1",
    expected_status:
      "EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_VERIFIED_SOURCE_READY",
    argument_style: "snake",
  }),
  ledger_custody: Object.freeze({
    module:
      "tools/void-wc-void-ledger-custody-canonical-application-v1.mjs",
    export_name:
      "verifyVoidWcVoidLedgerCustodyCanonicalApplicationV1",
    expected_status:
      "LEDGER_CUSTODY_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    argument_style: "snake",
  }),
  market_vault: Object.freeze({
    module:
      "tools/void-wc-void-market-vault-canonical-application-v1.mjs",
    export_name:
      "verifyVoidWcVoidMarketVaultCanonicalApplicationV1",
    expected_status:
      "MARKET_VAULT_CANONICAL_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
    argument_style: "snake",
  }),
  opening_durable: Object.freeze({
    module:
      "tools/void-wc-void-opening-durable-evidence-canonical-application-v1.mjs",
    export_name:
      "verifyVoidWcVoidOpeningDurableEvidenceCanonicalApplicationV1",
    expected_status:
      "OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    argument_style: "snake",
  }),
  participant_postpurchase: Object.freeze({
    module:
      "tools/void-participant-postpurchase-canonical-application-v1.mjs",
    export_name:
      "verifyVoidParticipantPostpurchaseCanonicalApplicationV1",
    expected_status:
      "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    argument_style: "snake",
  }),
});
const LINEAGE_NAMES =
  Object.freeze(Object.keys(APPLICATION_VERIFIERS).sort());
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{8,240}$/u;
const MAX_PRIVATE_INPUT_BYTES = 16 * 1024 * 1024;
const GIT = "/usr/bin/git";
const REVIEWED_GIT_CONFIG_ARGS = Object.freeze([
  "-c", "core.hooksPath=/dev/null",
  "-c", "core.attributesFile=/dev/null",
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.preloadIndex=false",
  "-c", "submodule.recurse=false",
]);

function fail(code) {
  throw new Error(code);
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

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("FINAL_COUPLED_CANONICAL_VALUE_INVALID");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(value) {
  const header = Buffer.from("blob " + String(value.length) + "\0", "utf8");
  return crypto
    .createHash("sha1")
    .update(header)
    .update(value)
    .digest("hex");
}

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function exactStringArray(actual, expected, code) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    fail(code);
  }
}

function normalizeLineages(raw) {
  if (!Array.isArray(raw)) fail("FINAL_COUPLED_LINEAGES_NOT_ARRAY");
  if (raw.length !== LINEAGE_NAMES.length) {
    fail("FINAL_COUPLED_LINEAGE_COUNT_INVALID");
  }
  const byName = new Map();
  for (const entry of raw) {
    if (!plain(entry)) fail("FINAL_COUPLED_LINEAGE_ENTRY_INVALID");
    const keys = Object.keys(entry).sort();
    const expected = [
      "application_plan_file_sha256",
      "application_plan_id",
      "lane",
      "verification_status",
      "verified_applied",
    ].sort();
    exactStringArray(keys, expected, "FINAL_COUPLED_LINEAGE_KEYS_INVALID");
    if (
      typeof entry.lane !== "string" ||
      !LINEAGE_NAMES.includes(entry.lane) ||
      byName.has(entry.lane)
    ) {
      fail("FINAL_COUPLED_LINEAGE_NAME_INVALID");
    }
    if (entry.verified_applied !== true) {
      fail("FINAL_COUPLED_LINEAGE_NOT_VERIFIED_APPLIED:" + entry.lane);
    }
    if (
      typeof entry.application_plan_id !== "string" ||
      !SAFE_ID.test(entry.application_plan_id)
    ) {
      fail("FINAL_COUPLED_LINEAGE_PLAN_ID_INVALID:" + entry.lane);
    }
    if (
      typeof entry.application_plan_file_sha256 !== "string" ||
      !HEX64.test(entry.application_plan_file_sha256)
    ) {
      fail("FINAL_COUPLED_LINEAGE_PLAN_SHA256_INVALID:" + entry.lane);
    }
    const expectedStatus =
      APPLICATION_VERIFIERS[entry.lane].expected_status;
    if (entry.verification_status !== expectedStatus) {
      fail("FINAL_COUPLED_LINEAGE_STATUS_INVALID:" + entry.lane);
    }
    byName.set(
      entry.lane,
      Object.freeze({
        lane: entry.lane,
        application_plan_id: entry.application_plan_id,
        application_plan_file_sha256:
          entry.application_plan_file_sha256,
        verification_status: entry.verification_status,
        verified_applied: true,
      }),
    );
  }
  return Object.freeze(
    LINEAGE_NAMES.map((name) => byName.get(name)),
  );
}

function authorityFalse(decision, keys, code) {
  for (const key of keys) {
    if (decision?.[key] !== false) fail(code + ":" + key);
  }
}

function normalizeRepositoryBinding(value) {
  if (!plain(value)) fail("FINAL_COUPLED_REPOSITORY_BINDING_INVALID");
  const keys = Object.keys(value).sort();
  const expected = [
    "branch",
    "head",
    "origin",
    "remote_head",
    "tree",
  ].sort();
  exactStringArray(
    keys,
    expected,
    "FINAL_COUPLED_REPOSITORY_BINDING_KEYS_INVALID",
  );
  if (
    value.branch !== "main" ||
    value.origin !== CANONICAL_REMOTE ||
    typeof value.head !== "string" ||
    !HEX40.test(value.head) ||
    typeof value.tree !== "string" ||
    !HEX40.test(value.tree) ||
    value.remote_head !== value.head
  ) {
    fail("FINAL_COUPLED_REPOSITORY_BINDING_MISMATCH");
  }
  return Object.freeze({
    branch: "main",
    head: value.head,
    origin: CANONICAL_REMOTE,
    remote_head: value.remote_head,
    tree: value.tree,
  });
}

function deriveVoidWcVoidFinalCoupledActivationPromotionCoreV1({
  production_candidate,
  coupled_candidate,
  successor_migration_candidate,
  applied_lineages,
  repository_identity,
}, verifiedSourceCapability = null) {
  const authorityBearing =
    verifiedSourceCapability === FINAL_COUPLED_VERIFIED_SOURCE_CAPABILITY;
  if (
    !plain(production_candidate) ||
    !plain(coupled_candidate) ||
    !plain(successor_migration_candidate)
  ) {
    fail("FINAL_COUPLED_CANDIDATE_INPUT_INVALID");
  }
  const lineages = normalizeLineages(applied_lineages);
  const repository = normalizeRepositoryBinding(repository_identity);

  if (
    production_candidate.status !== "hold" ||
    production_candidate.coupled_activation_ready !== false
  ) {
    fail("FINAL_COUPLED_PRODUCTION_PRESTATE_INVALID");
  }
  if (
    coupled_candidate.status !== "HOLD" ||
    coupled_candidate?.gates?.coupled_activation_ready !== false
  ) {
    fail("FINAL_COUPLED_ECONOMIC_PRESTATE_INVALID");
  }

  const successorBefore =
    classifyVoidEconomicEvmSuccessorMigrationV1(successor_migration_candidate);
  if (
    successorBefore?.ok !== true ||
    successorBefore.status !== "SOURCE_READY"
  ) {
    fail("FINAL_COUPLED_SUCCESSOR_NOT_SOURCE_READY");
  }
  authorityFalse(
    successorBefore,
    [
      "migration_authorized",
      "public_activation_authorized",
      "money_movement_authorized",
    ],
    "FINAL_COUPLED_SUCCESSOR_AUTHORITY_INVALID",
  );

  const productionBefore =
    classifyVoidWcVoidProductionReadinessV1(production_candidate);
  if (
    productionBefore?.ok !== false ||
    productionBefore.status !== "HOLD" ||
    productionBefore.reason !== "production_gates_incomplete"
  ) {
    fail("FINAL_COUPLED_PRODUCTION_BEFORE_CLASSIFICATION_INVALID");
  }
  exactStringArray(
    productionBefore.missing_gates,
    ["coupled_activation_ready_required"],
    "FINAL_COUPLED_PRODUCTION_NONFINAL_GATES_REMAIN",
  );

  const coupledBefore =
    classifyVoidCoupledEconomicSuccessorGateV1(
      coupled_candidate,
      successor_migration_candidate,
    );
  if (
    coupledBefore?.ok !== false ||
    coupledBefore.status !== "HOLD" ||
    coupledBefore.reason !== "coupled_economic_gates_incomplete"
  ) {
    fail("FINAL_COUPLED_ECONOMIC_BEFORE_CLASSIFICATION_INVALID");
  }
  exactStringArray(
    coupledBefore.missing_gates,
    ["coupled_activation_ready_required"],
    "FINAL_COUPLED_ECONOMIC_NONFINAL_GATES_REMAIN",
  );

  const productionTarget = clone(production_candidate);
  productionTarget.status = "source_ready";
  productionTarget.coupled_activation_ready = true;

  const coupledTarget = clone(coupled_candidate);
  coupledTarget.status = "SOURCE_READY";
  coupledTarget.gates.coupled_activation_ready = true;

  const productionReverted = clone(productionTarget);
  productionReverted.status = "hold";
  productionReverted.coupled_activation_ready = false;
  if (!same(productionReverted, production_candidate)) {
    fail("FINAL_COUPLED_PRODUCTION_CHANGE_SCOPE_INVALID");
  }

  const coupledReverted = clone(coupledTarget);
  coupledReverted.status = "HOLD";
  coupledReverted.gates.coupled_activation_ready = false;
  if (!same(coupledReverted, coupled_candidate)) {
    fail("FINAL_COUPLED_ECONOMIC_CHANGE_SCOPE_INVALID");
  }

  const productionAfter =
    classifyVoidWcVoidProductionReadinessV1(productionTarget);
  if (productionAfter?.ok !== true || productionAfter.status !== "SOURCE_READY") {
    fail("FINAL_COUPLED_PRODUCTION_TARGET_NOT_SOURCE_READY");
  }
  authorityFalse(
    productionAfter,
    ["activation_authority", "funding_authority"],
    "FINAL_COUPLED_PRODUCTION_AUTHORITY_INVALID",
  );

  const coupledAfter =
    classifyVoidCoupledEconomicSuccessorGateV1(
      coupledTarget,
      successor_migration_candidate,
    );
  if (coupledAfter?.ok !== true || coupledAfter.status !== "SOURCE_READY") {
    fail("FINAL_COUPLED_ECONOMIC_TARGET_NOT_SOURCE_READY");
  }
  authorityFalse(
    coupledAfter,
    [
      "market_activation_authorized",
      "public_presale_activation_authorized",
      "funds_movement_authorized",
    ],
    "FINAL_COUPLED_ECONOMIC_AUTHORITY_INVALID",
  );

  const composed =
    classifyVoidWcVoidCoupledLaunchReadinessV1({
      production_candidate: productionTarget,
      coupled_candidate: coupledTarget,
      successor_migration_candidate,
    });
  if (composed?.ok !== true || composed.status !== "SOURCE_READY") {
    fail("FINAL_COUPLED_COMPOSITION_NOT_SOURCE_READY");
  }
  authorityFalse(
    composed,
    [
      "activation_authority",
      "funding_authority",
      "market_activation_authorized",
      "public_presale_activation_authorized",
      "funds_movement_authorized",
    ],
    "FINAL_COUPLED_COMPOSITION_AUTHORITY_INVALID",
  );

  const productionSourceBytes = prettyBytes(production_candidate);
  const coupledSourceBytes = prettyBytes(coupled_candidate);
  const successorSourceBytes = prettyBytes(successor_migration_candidate);
  const productionTargetBytes = prettyBytes(productionTarget);
  const coupledTargetBytes = prettyBytes(coupledTarget);

  const material = Object.freeze({
    marker: authorityBearing
      ? VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1
      : VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_PREVIEW_V1,
    version: 1,
    status: authorityBearing
      ? "FINAL_COUPLED_ACTIVATION_PROMOTION_READY_NOT_ACTIVATED"
      : "FINAL_COUPLED_STRUCTURAL_PREVIEW_NOT_SOURCE_VERIFIED",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    repository_head_sha: repository.head,
    repository_tree_sha: repository.tree,
    canonical_remote_url: repository.origin,
    remote_main_sha: repository.remote_head,
    applied_lineages: lineages,
    production_source_sha256: sha256Text(canonicalJson(production_candidate)),
    coupled_source_sha256: sha256Text(canonicalJson(coupled_candidate)),
    successor_source_sha256:
      sha256Text(canonicalJson(successor_migration_candidate)),
    production_source_file_sha256: sha256Bytes(productionSourceBytes),
    production_source_git_blob_sha1: gitBlobSha1(productionSourceBytes),
    coupled_source_file_sha256: sha256Bytes(coupledSourceBytes),
    coupled_source_git_blob_sha1: gitBlobSha1(coupledSourceBytes),
    successor_source_file_sha256: sha256Bytes(successorSourceBytes),
    successor_source_git_blob_sha1: gitBlobSha1(successorSourceBytes),
    production_target_file_sha256: sha256Bytes(productionTargetBytes),
    production_target_git_blob_sha1: gitBlobSha1(productionTargetBytes),
    coupled_target_file_sha256: sha256Bytes(coupledTargetBytes),
    coupled_target_git_blob_sha1: gitBlobSha1(coupledTargetBytes),
    production_target_candidate: deepFreeze(productionTarget),
    coupled_target_candidate: deepFreeze(coupledTarget),
    successor_migration_candidate:
      deepFreeze(clone(successor_migration_candidate)),
    production_before: Object.freeze({
      status: productionBefore.status,
      reason: productionBefore.reason,
      missing_gates: Object.freeze([...productionBefore.missing_gates]),
    }),
    coupled_before: Object.freeze({
      status: coupledBefore.status,
      reason: coupledBefore.reason,
      missing_gates: Object.freeze([...coupledBefore.missing_gates]),
    }),
    production_after_status: productionAfter.status,
    coupled_after_status: coupledAfter.status,
    composition_id: composed.composition_id,
    final_production_fields: Object.freeze([
      "coupled_activation_ready",
      "status",
    ]),
    final_coupled_fields: Object.freeze([
      "gates.coupled_activation_ready",
      "status",
    ]),
    canonical_candidate_files_updated: false,
    runtime_activation_authorized: false,
    buy_void_process_gates_enabled: false,
    public_intake_enabled: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: authorityBearing
      ? VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_AUTHORITY_V1
      : VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PREVIEW_AUTHORITY_V1,
  });

  const result = authorityBearing
    ? deepFreeze({
        ...material,
        promotion_id:
          "voidwcfcap1_" + sha256Text(canonicalJson(material)),
      })
    : deepFreeze({
        ...material,
        preview_id:
          "voidwcfcappreview1_" + sha256Text(canonicalJson(material)),
      });
  if (authorityBearing) VERIFIED_SOURCE_PROMOTIONS.add(result);
  return result;
}

export function deriveVoidWcVoidFinalCoupledActivationPromotionV1(input) {
  return deriveVoidWcVoidFinalCoupledActivationPromotionCoreV1(input);
}

function deriveVerifiedVoidWcVoidFinalCoupledActivationPromotionV1(input) {
  return deriveVoidWcVoidFinalCoupledActivationPromotionCoreV1(
    input,
    FINAL_COUPLED_VERIFIED_SOURCE_CAPABILITY,
  );
}

function gitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
  };
}

function git(args, code) {
  const result = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      ...REVIEWED_GIT_CONFIG_ARGS,
      "-C", REPO_ROOT,
      ...args,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: gitEnv(),
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) fail(code);
  return String(result.stdout || "").trim();
}

function canonicalOrigin(value) {
  const accepted = new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  const origin = String(value || "").trim();
  if (!accepted.has(origin)) {
    fail("FINAL_COUPLED_CANONICAL_REMOTE_MISMATCH");
  }
  return CANONICAL_REMOTE;
}

export function testOnlyVoidWcVoidFinalCoupledGitIdentityV1() {
  return Object.freeze({
    head: git(["rev-parse", "HEAD"], "FINAL_COUPLED_TEST_HEAD_UNAVAILABLE"),
    tree: git(
      ["rev-parse", "HEAD^{tree}"],
      "FINAL_COUPLED_TEST_TREE_UNAVAILABLE",
    ),
    status: git(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "FINAL_COUPLED_TEST_STATUS_UNAVAILABLE",
    ),
  });
}

function headJson(relativePath) {
  const file = path.join(REPO_ROOT, relativePath);
  const bytes = fs.readFileSync(file);
  const expectedBlob = git(
    ["rev-parse", "HEAD:" + relativePath],
    "FINAL_COUPLED_HEAD_BLOB_UNAVAILABLE:" + relativePath,
  );
  if (!HEX40.test(expectedBlob) || gitBlobSha1(bytes) !== expectedBlob) {
    fail("FINAL_COUPLED_WORKTREE_BLOB_DRIFT:" + relativePath);
  }
  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail("FINAL_COUPLED_CANONICAL_JSON_INVALID:" + relativePath);
  }
  if (!bytes.equals(prettyBytes(value))) {
    fail("FINAL_COUPLED_CANONICAL_JSON_BYTES_NOT_PRETTY:" + relativePath);
  }
  return value;
}

function currentRepositoryIdentity() {
  const head = git(["rev-parse", "HEAD"], "FINAL_COUPLED_HEAD_UNAVAILABLE");
  const tree = git(
    ["rev-parse", "HEAD^{tree}"],
    "FINAL_COUPLED_TREE_UNAVAILABLE",
  );
  const branch = git(
    ["branch", "--show-current"],
    "FINAL_COUPLED_BRANCH_UNAVAILABLE",
  );
  const origin = canonicalOrigin(
    git(
      ["remote", "get-url", "origin"],
      "FINAL_COUPLED_ORIGIN_UNAVAILABLE",
    ),
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("FINAL_COUPLED_REPOSITORY_IDENTITY_INVALID");
  }
  if (branch !== "main") fail("FINAL_COUPLED_BRANCH_NOT_MAIN");
  if (
    git(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "FINAL_COUPLED_STATUS_UNAVAILABLE",
    ) !== ""
  ) {
    fail("FINAL_COUPLED_WORKTREE_MUST_BE_CLEAN");
  }
  const remote = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      "-c", "http.sslVerify=true",
      ...REVIEWED_GIT_CONFIG_ARGS,
      "ls-remote",
      CANONICAL_REMOTE,
      "refs/heads/main",
    ],
    {
      cwd: "/",
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: gitEnv(),
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    },
  );
  if (remote.status !== 0) {
    fail("FINAL_COUPLED_REMOTE_MAIN_UNAVAILABLE");
  }
  const remoteHead = String(remote.stdout || "")
    .trim()
    .split(/\s+/u)[0];
  if (!HEX40.test(remoteHead) || remoteHead !== head) {
    fail("FINAL_COUPLED_HEAD_NOT_REMOTE_MAIN");
  }
  return Object.freeze({ head, tree, branch, origin, remote_head: remoteHead });
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode
  );
}

function openPrivateParent(file, label) {
  if (
    process.platform !== "linux" ||
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail(label + "_PATH_INVALID");
  }
  const parent = path.dirname(file);
  const basename = path.basename(file);
  if (
    basename === "" ||
    basename === "." ||
    basename === ".." ||
    basename.includes("/") ||
    basename.includes("\\")
  ) {
    fail(label + "_BASENAME_INVALID");
  }
  let parentReal;
  try {
    parentReal = fs.realpathSync.native(parent);
  } catch {
    fail(label + "_PARENT_UNAVAILABLE");
  }
  if (parentReal !== parent) {
    fail(label + "_PARENT_ALIAS_FORBIDDEN");
  }
  const parentPathStat = fs.lstatSync(parent);
  if (
    !parentPathStat.isDirectory() ||
    parentPathStat.isSymbolicLink() ||
    (typeof process.getuid === "function" &&
      parentPathStat.uid !== process.getuid()) ||
    (parentPathStat.mode & 0o022) !== 0
  ) {
    fail(label + "_PARENT_UNSAFE");
  }
  const parentFd = fs.openSync(
    parent,
    fs.constants.O_RDONLY |
      Number(fs.constants.O_DIRECTORY || 0) |
      Number(fs.constants.O_NOFOLLOW || 0),
  );
  const parentFdStat = fs.fstatSync(parentFd);
  if (!sameDirectoryIdentity(parentFdStat, parentPathStat)) {
    fs.closeSync(parentFd);
    fail(label + "_PARENT_DESCRIPTOR_MISMATCH");
  }
  return Object.freeze({
    parent,
    basename,
    parent_fd: parentFd,
    parent_stat: parentFdStat,
    proc_file: path.join("/proc/self/fd/" + String(parentFd), basename),
  });
}

function privateRegularFileBytes(
  file,
  label,
  { testOnlyAfterParentOpen = null } = {},
) {
  const opened = openPrivateParent(file, label);
  let fd;
  try {
    if (testOnlyAfterParentOpen !== null) {
      if (typeof testOnlyAfterParentOpen !== "function") {
        fail(label + "_TEST_HOOK_INVALID");
      }
      testOnlyAfterParentOpen();
    }
    fd = fs.openSync(
      opened.proc_file,
      fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
    );
    const before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.size < 2 ||
      before.size > MAX_PRIVATE_INPUT_BYTES ||
      (typeof process.getuid === "function" &&
        before.uid !== process.getuid()) ||
      (before.mode & 0o077) !== 0
    ) {
      fail(label + "_NOT_DIRECT_BOUNDED_PRIVATE_REGULAR");
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) fail(label + "_SHORT_READ");
      offset += count;
    }
    const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) {
      if (before[key] !== after[key]) fail(label + "_CHANGED_DURING_READ");
    }

    let parentAfter;
    let fileAfter;
    try {
      parentAfter = fs.lstatSync(opened.parent);
      fileAfter = fs.lstatSync(file);
    } catch (_error) {
      fail(label + "_PATH_CHANGED_DURING_READ");
    }
    if (
      !sameDirectoryIdentity(parentAfter, opened.parent_stat) ||
      !fileAfter.isFile() ||
      fileAfter.isSymbolicLink() ||
      fileAfter.dev !== before.dev ||
      fileAfter.ino !== before.ino ||
      fileAfter.nlink !== before.nlink ||
      fileAfter.size !== before.size
    ) {
      fail(label + "_PATH_CHANGED_DURING_READ");
    }
    return bytes;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    fs.closeSync(opened.parent_fd);
  }
}

export function testOnlyExerciseVoidWcVoidFinalCoupledInputParentReplacementV1() {
  const root = fs.mkdtempSync(
    path.join(
      process.env.TMPDIR || "/tmp",
      "void-final-coupled-input-race-",
    ),
  );
  fs.chmodSync(root, 0o700);
  const parent = path.join(root, "input");
  const replacement = path.join(root, "replacement");
  const moved = path.join(root, "moved-original");
  fs.mkdirSync(parent, { mode: 0o700 });
  fs.mkdirSync(replacement, { mode: 0o700 });
  const file = path.join(parent, "lineages.json");
  fs.writeFileSync(file, "{}\n", { mode: 0o600 });
  fs.writeFileSync(
    path.join(replacement, "lineages.json"),
    "{\"replacement\":true}\n",
    { mode: 0o600 },
  );
  let reason = null;
  try {
    try {
      privateRegularFileBytes(
        file,
        "FINAL_COUPLED_INPUT_PARENT_RACE_TEST_ONLY",
        {
          testOnlyAfterParentOpen() {
            fs.renameSync(parent, moved);
            fs.renameSync(replacement, parent);
          },
        },
      );
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    return Object.freeze({ reason });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function readPrivateLineagePlanManifest(file) {
  const bytes =
    privateRegularFileBytes(file, "FINAL_COUPLED_LINEAGE_MANIFEST");
  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail("FINAL_COUPLED_LINEAGE_MANIFEST_JSON_INVALID");
  }
  if (!Array.isArray(value) || value.length !== LINEAGE_NAMES.length) {
    fail("FINAL_COUPLED_LINEAGE_MANIFEST_COUNT_INVALID");
  }
  const byName = new Map();
  for (const entry of value) {
    if (!plain(entry)) {
      fail("FINAL_COUPLED_LINEAGE_MANIFEST_ENTRY_INVALID");
    }
    const keys = Object.keys(entry).sort();
    const expected = [
      "application_plan_file_sha256",
      "application_plan_path",
      "lane",
    ].sort();
    exactStringArray(
      keys,
      expected,
      "FINAL_COUPLED_LINEAGE_MANIFEST_KEYS_INVALID",
    );
    if (
      typeof entry.lane !== "string" ||
      !LINEAGE_NAMES.includes(entry.lane) ||
      byName.has(entry.lane)
    ) {
      fail("FINAL_COUPLED_LINEAGE_MANIFEST_LANE_INVALID");
    }
    if (
      typeof entry.application_plan_file_sha256 !== "string" ||
      !HEX64.test(entry.application_plan_file_sha256)
    ) {
      fail(
        "FINAL_COUPLED_LINEAGE_MANIFEST_PLAN_SHA256_INVALID:" +
          entry.lane,
      );
    }
    byName.set(entry.lane, Object.freeze({ ...entry }));
  }
  return Object.freeze(
    LINEAGE_NAMES.map((name) => byName.get(name)),
  );
}

async function verifyAppliedLineagePlans(manifest) {
  const verified = [];
  for (const entry of manifest) {
    const spec = APPLICATION_VERIFIERS[entry.lane];
    const planBytes = privateRegularFileBytes(
      entry.application_plan_path,
      "FINAL_COUPLED_APPLICATION_PLAN:" + entry.lane,
    );
    const actualSha = sha256Bytes(planBytes);
    if (actualSha !== entry.application_plan_file_sha256) {
      fail("FINAL_COUPLED_APPLICATION_PLAN_SHA256_MISMATCH:" + entry.lane);
    }
    let plan;
    try {
      plan = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(planBytes),
      );
    } catch {
      fail("FINAL_COUPLED_APPLICATION_PLAN_JSON_INVALID:" + entry.lane);
    }
    if (
      !plain(plan) ||
      typeof plan.application_plan_id !== "string" ||
      !SAFE_ID.test(plan.application_plan_id)
    ) {
      fail("FINAL_COUPLED_APPLICATION_PLAN_ID_INVALID:" + entry.lane);
    }

    const modulePath = path.join(REPO_ROOT, spec.module);
    if (!fs.existsSync(modulePath)) {
      fail("FINAL_COUPLED_APPLICATION_VERIFIER_MISSING:" + entry.lane);
    }
    const module = await import(pathToFileURL(modulePath).href);
    const verifier = module[spec.export_name];
    if (typeof verifier !== "function") {
      fail("FINAL_COUPLED_APPLICATION_VERIFIER_EXPORT_MISSING:" + entry.lane);
    }
    const args =
      spec.argument_style === "camel"
        ? {
            applicationPlanBytes: planBytes,
            applicationPlanFileSha256:
              entry.application_plan_file_sha256,
          }
        : {
            application_plan_bytes: planBytes,
            application_plan_file_sha256:
              entry.application_plan_file_sha256,
          };
    const result = await verifier(args);
    if (
      result?.ok !== true ||
      result.status !== spec.expected_status ||
      result.application_plan_id !== plan.application_plan_id
    ) {
      fail("FINAL_COUPLED_APPLICATION_VERIFY_RESULT_INVALID:" + entry.lane);
    }
    verified.push(
      Object.freeze({
        lane: entry.lane,
        application_plan_id: plan.application_plan_id,
        application_plan_file_sha256:
          entry.application_plan_file_sha256,
        verification_status: result.status,
        verified_applied: true,
      }),
    );
  }
  return normalizeLineages(verified);
}

function outsideRepository(file) {
  const relative = path.relative(REPO_ROOT, file);
  return (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  );
}

function createPrivateOutputBoundV1(
  file,
  bytes,
  { testOnlyAfterParentRevalidationBeforeCreate = null } = {},
) {
  const opened = openPrivateParent(file, "FINAL_COUPLED_OUTPUT");
  let fileFd;
  let created = false;
  try {
    const parentBefore = fs.lstatSync(opened.parent);
    if (!sameDirectoryIdentity(parentBefore, opened.parent_stat)) {
      fail("FINAL_COUPLED_OUTPUT_PARENT_CHANGED_BEFORE_CREATE");
    }
    if (testOnlyAfterParentRevalidationBeforeCreate !== null) {
      if (typeof testOnlyAfterParentRevalidationBeforeCreate !== "function") {
        fail("FINAL_COUPLED_OUTPUT_TEST_HOOK_INVALID");
      }
      testOnlyAfterParentRevalidationBeforeCreate();
    }
    fileFd = fs.openSync(
      opened.proc_file,
      fs.constants.O_RDWR |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    created = true;
    fs.writeFileSync(fileFd, bytes);
    fs.fchmodSync(fileFd, 0o600);
    fs.fsyncSync(fileFd);

    const createdStat = fs.fstatSync(fileFd);
    if (
      !createdStat.isFile() ||
      createdStat.nlink !== 1 ||
      createdStat.size !== bytes.length ||
      (createdStat.mode & 0o077) !== 0 ||
      (typeof process.getuid === "function" &&
        createdStat.uid !== process.getuid())
    ) {
      fail("FINAL_COUPLED_OUTPUT_IDENTITY_INVALID");
    }

    const rebound = Buffer.alloc(createdStat.size);
    let offset = 0;
    while (offset < rebound.length) {
      const count = fs.readSync(
        fileFd,
        rebound,
        offset,
        rebound.length - offset,
        offset,
      );
      if (count <= 0) fail("FINAL_COUPLED_OUTPUT_SHORT_READ");
      offset += count;
    }
    if (!rebound.equals(bytes)) {
      fail("FINAL_COUPLED_OUTPUT_BYTES_MISMATCH");
    }

    fs.fsyncSync(opened.parent_fd);

    let parentAfter;
    let outputAfter;
    try {
      parentAfter = fs.lstatSync(opened.parent);
      outputAfter = fs.lstatSync(file);
    } catch (_error) {
      fail("FINAL_COUPLED_OUTPUT_POSTWRITE_IDENTITY_INVALID");
    }
    if (
      !sameDirectoryIdentity(parentAfter, opened.parent_stat) ||
      !outputAfter.isFile() ||
      outputAfter.isSymbolicLink() ||
      outputAfter.dev !== createdStat.dev ||
      outputAfter.ino !== createdStat.ino ||
      outputAfter.nlink !== 1 ||
      outputAfter.size !== createdStat.size
    ) {
      fail("FINAL_COUPLED_OUTPUT_POSTWRITE_IDENTITY_INVALID");
    }

    return Object.freeze({
      output_path: file,
      output_sha256: sha256Bytes(bytes),
      output_bytes: bytes.length,
    });
  } catch (primary) {
    let cleanup = null;
    try {
      if (created && fs.existsSync(opened.proc_file)) {
        fs.unlinkSync(opened.proc_file);
        fs.fsyncSync(opened.parent_fd);
        created = false;
      }
    } catch (error) {
      cleanup = error;
    }
    if (cleanup !== null) {
      throw new AggregateError(
        [primary, cleanup],
        "final_coupled_output_cleanup_failed",
      );
    }
    throw primary;
  } finally {
    if (fileFd !== undefined) fs.closeSync(fileFd);
    fs.closeSync(opened.parent_fd);
  }
}

export function testOnlyExerciseVoidWcVoidFinalCoupledOutputParentReplacementV1() {
  const root = fs.mkdtempSync(
    path.join(
      process.env.TMPDIR || "/tmp",
      "void-final-coupled-output-race-",
    ),
  );
  fs.chmodSync(root, 0o700);
  const parent = path.join(root, "output");
  const replacement = path.join(root, "replacement");
  const moved = path.join(root, "moved-original");
  const file = path.join(parent, "promotion.json");
  fs.mkdirSync(parent, { mode: 0o700 });
  fs.mkdirSync(replacement, { mode: 0o700 });
  let reason = null;
  try {
    try {
      createPrivateOutputBoundV1(
        file,
        Buffer.from("{\"marker\":\"TEST_ONLY\"}\n", "utf8"),
        {
          testOnlyAfterParentRevalidationBeforeCreate() {
            fs.renameSync(parent, moved);
            fs.renameSync(replacement, parent);
          },
        },
      );
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    return Object.freeze({
      reason,
      replacement_output_exists:
        fs.existsSync(path.join(parent, "promotion.json")),
      original_output_exists:
        fs.existsSync(path.join(moved, "promotion.json")),
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export function writeVoidWcVoidFinalCoupledActivationPromotionV1(
  file,
  promotion,
) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail("FINAL_COUPLED_OUTPUT_PATH_INVALID");
  }
  if (
    !plain(promotion) ||
    promotion.marker !==
      VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1 ||
    !VERIFIED_SOURCE_PROMOTIONS.has(promotion)
  ) {
    fail("FINAL_COUPLED_OUTPUT_PROMOTION_INVALID");
  }
  return createPrivateOutputBoundV1(file, prettyBytes(promotion));
}


const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (direct) {
  try {
    const { values } = parseArgs({
      options: {
        lineages: { type: "string" },
        output: { type: "string" },
      },
      strict: true,
    });
    if (!values.lineages || !values.output) {
      fail(
        "usage: --lineages /absolute/private/applied-lineages.json " +
        "--output /absolute/private/final-coupled-promotion.json",
      );
    }
    const repository = currentRepositoryIdentity();
    const lineageManifest =
      readPrivateLineagePlanManifest(values.lineages);
    const lineages =
      await verifyAppliedLineagePlans(lineageManifest);

    const result =
      deriveVerifiedVoidWcVoidFinalCoupledActivationPromotionV1({
        production_candidate: headJson(PRODUCTION_REL),
        coupled_candidate: headJson(COUPLED_REL),
        successor_migration_candidate: headJson(SUCCESSOR_REL),
        applied_lineages: lineages,
        repository_identity: repository,
      });

    const persisted =
      writeVoidWcVoidFinalCoupledActivationPromotionV1(
        values.output,
        result,
      );

    console.log(VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1);
    console.log("status=" + result.status);
    console.log("repository_head_sha=" + repository.head);
    console.log("repository_tree_sha=" + repository.tree);
    console.log("promotion_id=" + result.promotion_id);
    console.log("composition_id=" + result.composition_id);
    console.log(
      "production_target_file_sha256=" +
        result.production_target_file_sha256,
    );
    console.log(
      "production_target_git_blob_sha1=" +
        result.production_target_git_blob_sha1,
    );
    console.log(
      "coupled_target_file_sha256=" +
        result.coupled_target_file_sha256,
    );
    console.log(
      "coupled_target_git_blob_sha1=" +
        result.coupled_target_git_blob_sha1,
    );
    console.log("output_path=" + persisted.output_path);
    console.log("output_sha256=" + persisted.output_sha256);
    console.log("output_bytes=" + String(persisted.output_bytes));
    console.log("upstream_applied_lineage_count=" + String(lineages.length));
    console.log("production_target_status=source_ready");
    console.log("coupled_target_status=SOURCE_READY");
    console.log("coupled_activation_ready=true");
    console.log("canonical_candidate_files_updated=false");
    console.log("runtime_activation_authorized=false");
    console.log("buy_void_process_gates_enabled=false");
    console.log("public_intake_enabled=false");
    console.log("market_activation_authorized=false");
    console.log("public_presale_activation_authorized=false");
    console.log("funds_movement_authorized=false");
    console.log(
      "VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1_GREEN",
    );
  } catch (error) {
    console.error(
      "VOID_WC_VOID_FINAL_COUPLED_ACTIVATION_PROMOTION_V1_HOLD",
    );
    console.error(
      "reason=" +
        (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
