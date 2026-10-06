#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    git_repository_identity_read: true,
    subprocess_git_read: true,
    filesystem_read: true,
    filesystem_write: false,
    network_access: false,
    clean_worktree_required: true,
    reviewed_base_ancestry_required: true,
    exact_reviewed_git_blobs_required: true,
    reviewed_build_context_bound: true,
    writer_generation_binding_proven_on_success: true,
    qualification_generation_binding_proven_on_success: true,
    collector_generation_binding_proven_on_success: true,
    deployed_artifact_generation_verified: false,
    trusted_collector_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    live_host_qualification_performed: false,
    storage_bootstrap: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const CANONICAL_REMOTE = "https://github.com/6ZoSo9/void-node.git";
const REVIEWED_BASE_COMMIT =
  "70faa71371eed9a8a0de4ffeb6c20e2c737cbc66";
const HEX40 = /^[0-9a-f]{40}$/u;

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1 =
  Object.freeze([
    ["package-lock.json", "b2671f0149f522b2489247016df0a5ec4bb72b8b"],
    ["package.json", "f28c3e9446c7623ef203da36a9642d046e5f34ee"],
    ["src/economic/buy_void_auto_fulfillment_v1.ts", "1ac1ad6213be83f1aa8261a554caa91544fe5e09"],
    ["src/economic/buy_void_broadcast_outcome_journal_v1.ts", "de8765d306c9ba1153ade10f0e5db92823ef3e39"],
    ["src/economic/buy_void_execution_attempt_journal_v1.ts", "536b6f6970c3aaf48b1ae0dec3a0356ad7c3a7fe"],
    ["src/economic/buy_void_filesystem_bakery_lock_v1.ts", "03376ad9853c1ca37c5be4d7f36d9daccab25078"],
    ["src/economic/buy_void_fulfillment_confirmation_v1.ts", "31c8ce9b88c86d32e187ed2ca7d0a23344fbd113"],
    ["src/economic/buy_void_fulfillment_journal_v1.ts", "7c4b099d835b84f50867e873fca763767c80c015"],
    ["src/economic/buy_void_prepared_transaction_plan_reservation_v1.ts", "fe4cc6b42a93df79ffb260da1f5fcd6fe222754f"],
    ["src/economic/coupled_native_gas_effective_open_census_v1.ts", "9844dec00c917248067ca4cef1c9f28f83aa5802"],
    ["src/economic/coupled_native_gas_liability_reconciliation_v1.ts", "ee1c9c81a037a61d0f5053dfe3c6bd457a4daf9e"],
    ["src/economic/coupled_native_gas_liability_store_v1.ts", "cc45bf08b62099ac17b15df7a58e25a86150a79e"],
    ["src/economic/coupled_native_gas_liability_v1.ts", "510114f3e4eff8ec88b9d290fca4335e079f5ee7"],
    ["src/economic/coupled_native_gas_reconciliation_custody_qualification_v1.ts", "5360a55bed6fccbe8d0dc242273264f2de94bea1"],
    ["src/economic/coupled_native_gas_reconciliation_evidence_resolver_v1.ts", "5143267b7b7381e1b9e7f561d1832a63308f1fae"],
    ["src/economic/coupled_native_gas_reconciliation_storage_v1.ts", "08841a3db71e5dc31c1c628de72796cf825157a2"],
    ["src/economic/coupled_native_gas_reconciliation_writer_v1.ts", "d8f17a770ea79c6abc868737fc1d7e4f1850d6dc"],
    ["src/economic/coupled_native_gas_terminal_cost_evidence_v1.ts", "7fe177f0e5d2e26dc4d32c25077e3f00da609c97"],
    ["tools/void-buy-void-allocation-custody-preflight-v1.mjs", "eeefceb07f46ca4fda4249d87230d8a2874808f4"],
    ["tools/void-coupled-native-gas-reconciliation-custody-host-evidence-v1.mjs", "96700dfa3d4973e038aaafd91dbf3f6fa6667034"],
    ["tsconfig.build.json", "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"],
  ].map(([sourcePath, blobSha1]) =>
    Object.freeze({ path: sourcePath, git_blob_sha1: blobSha1 }),
  ));

function fail(code) {
  throw new Error(code);
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("source_binding_noncanonical_number");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("source_binding_noncanonical_value");
}

function sha256Canonical(value) {
  return crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1 =
  sha256Canonical({
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
    version: 1,
    reviewed_base_commit_sha: REVIEWED_BASE_COMMIT,
    reviewed_sources:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1,
  });

function exactOrigin(value) {
  const accepted = new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  const raw = String(value ?? "").trim();
  if (!accepted.has(raw)) fail("source_binding_repository_origin_invalid");
  return CANONICAL_REMOTE;
}

function normalizeObserved(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("source_binding_observation_invalid");
  }
  const head = String(input.repository_head_sha ?? "").trim();
  const tree = String(input.repository_tree_sha ?? "").trim();
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("source_binding_repository_identity_invalid");
  }
  if (input.worktree_clean !== true) {
    fail("source_binding_worktree_not_clean");
  }
  if (input.reviewed_base_is_ancestor !== true) {
    fail("source_binding_reviewed_base_not_ancestor");
  }
  const origin = exactOrigin(input.repository_origin);
  if (!Array.isArray(input.source_blobs)) {
    fail("source_binding_source_blobs_invalid");
  }
  const expected =
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1;
  if (input.source_blobs.length !== expected.length) {
    fail("source_binding_source_blob_count_mismatch");
  }
  const observed = new Map();
  for (const row of input.source_blobs) {
    if (
      !row ||
      typeof row !== "object" ||
      Array.isArray(row) ||
      typeof row.path !== "string" ||
      typeof row.git_blob_sha1 !== "string" ||
      !HEX40.test(row.git_blob_sha1) ||
      observed.has(row.path)
    ) {
      fail("source_binding_source_blob_record_invalid");
    }
    observed.set(row.path, row.git_blob_sha1);
  }
  for (const row of expected) {
    if (observed.get(row.path) !== row.git_blob_sha1) {
      fail("source_binding_reviewed_source_drift:" + row.path);
    }
  }
  return Object.freeze({ head, tree, origin });
}

export function testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(
  input,
) {
  try {
    const observed = normalizeObserved(input);
    const material = Object.freeze({
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
      version: 1,
      status: "SOURCE_GENERATION_BOUND_NOT_TRUSTED",
      repository: "6ZoSo9/void-node",
      repository_origin: observed.origin,
      repository_head_sha: observed.head,
      repository_tree_sha: observed.tree,
      reviewed_base_commit_sha: REVIEWED_BASE_COMMIT,
      reviewed_source_count:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.length,
      reviewed_source_manifest_sha256:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
      source_generation_id:
        "voidngrcsg1_" +
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
      writer_source_git_blob_sha1:
        "d8f17a770ea79c6abc868737fc1d7e4f1850d6dc",
      qualification_source_git_blob_sha1:
        "5360a55bed6fccbe8d0dc242273264f2de94bea1",
      collector_source_git_blob_sha1:
        "96700dfa3d4973e038aaafd91dbf3f6fa6667034",
      writer_generation_binding_proven: true,
      qualification_generation_binding_proven: true,
      collector_generation_binding_proven: true,
      deployed_artifact_generation_verified: false,
      trusted_collector_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
    });
    return Object.freeze({
      ok: true,
      ...material,
      source_binding_id:
        "voidngrcsb1_" + sha256Canonical(material),
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
      version: 1,
      reason: error instanceof Error ? error.message : String(error),
      writer_generation_binding_proven: false,
      qualification_generation_binding_proven: false,
      collector_generation_binding_proven: false,
      deployed_artifact_generation_verified: false,
      trusted_collector_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
    });
  }
}

function gitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
  };
}

function gitSafetyArgs() {
  return [
    "-c", "core.worktree=" + ROOT,
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "core.attributesFile=/dev/null",
    "-c", "core.untrackedCache=false",
    "-c", "core.preloadIndex=false",
    "-c", "submodule.recurse=false",
  ];
}

function git(args, code, { allowFail = false } = {}) {
  const result = spawnSync(
    GIT,
    ["--no-replace-objects", ...gitSafetyArgs(), "-C", ROOT, ...args],
    {
      env: gitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
      timeout: 30_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) fail(code);
  return result;
}

function gitText(args, code) {
  return String(git(args, code).stdout || "").trim();
}

export function inspectCoupledNativeGasReconciliationCustodySourceBindingV1() {
  try {
    const head = gitText(
      ["rev-parse", "HEAD"],
      "source_binding_repository_head_unavailable",
    );
    const tree = gitText(
      ["rev-parse", "HEAD^{tree}"],
      "source_binding_repository_tree_unavailable",
    );
    const status = gitText(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "source_binding_repository_status_unavailable",
    );
    const origin = gitText(
      ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
      "source_binding_repository_origin_unavailable",
    );
    const ancestor =
      git(
        ["merge-base", "--is-ancestor", REVIEWED_BASE_COMMIT, "HEAD"],
        "source_binding_reviewed_base_check_failed",
        { allowFail: true },
      ).status === 0;
    const sourceBlobs =
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1
        .map((row) =>
          Object.freeze({
            path: row.path,
            git_blob_sha1: gitText(
              ["rev-parse", "HEAD:" + row.path],
              "source_binding_blob_unavailable:" + row.path,
            ),
          }),
        );
    return testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1({
      repository_head_sha: head,
      repository_tree_sha: tree,
      repository_origin: origin,
      worktree_clean: status === "",
      reviewed_base_is_ancestor: ancestor,
      source_blobs: sourceBlobs,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
      version: 1,
      reason: error instanceof Error ? error.message : String(error),
      writer_generation_binding_proven: false,
      qualification_generation_binding_proven: false,
      collector_generation_binding_proven: false,
      deployed_artifact_generation_verified: false,
      trusted_collector_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
    });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  process.stdout.write(
    JSON.stringify(
      inspectCoupledNativeGasReconciliationCustodySourceBindingV1(),
      null,
      2,
    ) + "\n",
  );
}
