#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
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
    exact_reviewed_worktree_bytes_required: true,
    index_manifest_rebound_after_worktree_census: true,
    reviewed_worktree_revalidated_after_clean_census: true,
    reviewed_package_tsconfig_context_bound: true,
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
      typeof row.worktree_git_blob_sha1 !== "string" ||
      !HEX40.test(row.worktree_git_blob_sha1) ||
      observed.has(row.path)
    ) {
      fail("source_binding_source_blob_record_invalid");
    }
    observed.set(
      row.path,
      Object.freeze({
        git_blob_sha1: row.git_blob_sha1,
        worktree_git_blob_sha1: row.worktree_git_blob_sha1,
      }),
    );
  }
  for (const row of expected) {
    const actual = observed.get(row.path);
    if (actual?.git_blob_sha1 !== row.git_blob_sha1) {
      fail("source_binding_reviewed_source_drift:" + row.path);
    }
    if (actual.worktree_git_blob_sha1 !== row.git_blob_sha1) {
      fail("source_binding_reviewed_source_worktree_drift:" + row.path);
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
    "-c", "core.ignoreStat=false",
    "-c", "core.trustctime=true",
    "-c", "core.checkStat=default",
    "-c", "core.filemode=true",
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

function pinnedObservationPlan(head) {
  if (!HEX40.test(head)) {
    fail("source_binding_repository_head_invalid");
  }
  return Object.freeze({
    head,
    tree_spec: head + "^{tree}",
    blob_spec: (relativePath) => head + ":" + relativePath,
    ancestry_head: head,
  });
}

export function testOnlyPinnedObservationPlanV1(head) {
  return pinnedObservationPlan(head);
}

function requireObservationHeadUnchangedV1(initialHead, finalHead) {
  if (!HEX40.test(initialHead) || !HEX40.test(finalHead)) {
    fail("source_binding_repository_identity_invalid");
  }
  if (initialHead !== finalHead) {
    fail("source_binding_repository_head_changed_during_observation");
  }
  return initialHead;
}

export function testOnlyRequireObservationHeadUnchangedV1(
  initialHead,
  finalHead,
) {
  return requireObservationHeadUnchangedV1(initialHead, finalHead);
}

function rejectConfigMatchesV1(args, reason) {
  const result = git(
    args,
    reason,
    { allowFail: true },
  );
  if (result.status === 0 && String(result.stdout || "").trim() !== "") {
    fail(reason);
  }
  if (result.status !== 0 && result.status !== 1) {
    fail(reason);
  }
}

function rejectRepositoryExecutionSettingsV1() {
  for (const [pattern, reason] of [
    [
      "^include",
      "source_binding_repository_include_config_forbidden",
    ],
    [
      "^filter\\.",
      "source_binding_repository_filter_config_forbidden",
    ],
  ]) {
    rejectConfigMatchesV1(
      [
        "config",
        "--local",
        "--no-includes",
        "--name-only",
        "--get-regexp",
        pattern,
      ],
      reason,
    );
  }

  const worktreeConfig = git(
    [
      "config",
      "--local",
      "--no-includes",
      "--bool",
      "--get",
      "extensions.worktreeConfig",
    ],
    "source_binding_repository_worktree_config_invalid",
    { allowFail: true },
  );
  if (
    worktreeConfig.status !== 0 &&
    worktreeConfig.status !== 1
  ) {
    fail("source_binding_repository_worktree_config_invalid");
  }
  const worktreeConfigEnabled =
    worktreeConfig.status === 0 &&
    String(worktreeConfig.stdout || "").trim() === "true";

  if (worktreeConfig.status === 0 && !worktreeConfigEnabled) {
    const raw = String(worktreeConfig.stdout || "").trim();
    if (raw !== "false") {
      fail("source_binding_repository_worktree_config_invalid");
    }
  }

  if (worktreeConfigEnabled) {
    for (const [pattern, reason] of [
      [
        "^include",
        "source_binding_repository_include_config_forbidden",
      ],
      [
        "^filter\\.",
        "source_binding_repository_filter_config_forbidden",
      ],
    ]) {
      rejectConfigMatchesV1(
        [
          "config",
          "--worktree",
          "--no-includes",
          "--name-only",
          "--get-regexp",
          pattern,
        ],
        reason,
      );
    }
  }
}

function rawSymlinkGitBlobSha1V1(relativePath) {
  const absolute = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, absolute);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("source_binding_worktree_path_invalid:" + relativePath);
  }
  const before = fs.lstatSync(absolute, { bigint: true });
  if (!before.isSymbolicLink()) {
    fail("source_binding_worktree_mode_invalid:" + relativePath);
  }
  const bytes = fs.readlinkSync(absolute, { encoding: "buffer" });
  const after = fs.lstatSync(absolute, { bigint: true });
  if (
    !after.isSymbolicLink() ||
    !stableFileCore(before, after) ||
    before.size !== after.size ||
    before.mtimeNs !== after.mtimeNs ||
    before.ctimeNs !== after.ctimeNs
  ) {
    fail("source_binding_worktree_file_changed:" + relativePath);
  }
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function trackedWorktreeGitBlobSha1V1(relativePath, indexMode) {
  const absolute = path.resolve(ROOT, relativePath);
  if (indexMode === "120000") {
    return rawSymlinkGitBlobSha1V1(relativePath);
  }
  if (indexMode !== "100644" && indexMode !== "100755") {
    fail("source_binding_repository_index_mode_unsupported:" + relativePath);
  }
  const listed = fs.lstatSync(absolute, { bigint: true });
  if (!listed.isFile() || listed.isSymbolicLink()) {
    fail("source_binding_worktree_mode_invalid:" + relativePath);
  }
  const executable = (listed.mode & 0o111n) !== 0n;
  if (
    (indexMode === "100755" && !executable) ||
    (indexMode === "100644" && executable)
  ) {
    fail("source_binding_worktree_mode_invalid:" + relativePath);
  }
  return worktreeGitBlobSha1(relativePath);
}

function repositoryCleanStateV1(
  head,
  {
    testOnlyAfterInitialIndexCheckBeforeManifest = null,
  } = {},
) {
  if (!HEX40.test(head)) {
    fail("source_binding_repository_head_invalid");
  }

  const indexFlags = String(
    git(
      ["ls-files", "-v", "-z"],
      "source_binding_repository_index_flags_unavailable",
    ).stdout || "",
  );
  for (const entry of indexFlags.split("\0")) {
    if (!entry) continue;
    if (!entry.startsWith("H ")) {
      fail("source_binding_repository_index_flags_forbidden");
    }
  }

  const staged = git(
    [
      "diff-index",
      "--cached",
      "--quiet",
      "--no-ext-diff",
      head,
      "--",
    ],
    "source_binding_repository_index_check_failed",
    { allowFail: true },
  );
  if (staged.status === 1) {
    fail("source_binding_repository_index_not_clean");
  }
  if (staged.status !== 0) {
    fail("source_binding_repository_index_check_failed");
  }

  if (testOnlyAfterInitialIndexCheckBeforeManifest !== null) {
    if (
      typeof testOnlyAfterInitialIndexCheckBeforeManifest !==
      "function"
    ) {
      fail("source_binding_test_hook_invalid");
    }
    testOnlyAfterInitialIndexCheckBeforeManifest();
  }

  const stageRowsText = String(
    git(
      ["ls-files", "--stage", "-z"],
      "source_binding_repository_index_manifest_unavailable",
    ).stdout || "",
  );
  const stageRows = stageRowsText.split("\0").filter(Boolean);

  for (const row of stageRows) {
    const match =
      /^(100644|100755|120000) ([0-9a-f]{40}) ([0-3])\t([\s\S]+)$/u.exec(row);
    if (!match || match[3] !== "0") {
      fail("source_binding_repository_index_record_invalid");
    }
    const indexMode = match[1];
    const indexBlob = match[2];
    const relativePath = match[4];
    let worktreeBlob;
    try {
      worktreeBlob =
        trackedWorktreeGitBlobSha1V1(relativePath, indexMode);
    } catch (error) {
      fail(
        "source_binding_repository_worktree_not_clean:" +
          relativePath +
          ":" +
          (error instanceof Error ? error.message : String(error)),
      );
    }
    if (worktreeBlob !== indexBlob) {
      fail("source_binding_repository_worktree_not_clean:" + relativePath);
    }
  }

  const untracked = String(
    git(
      [
        "ls-files",
        "--others",
        "--exclude-standard",
        "-z",
      ],
      "source_binding_repository_untracked_check_failed",
    ).stdout || "",
  );
  if (untracked !== "") {
    fail("source_binding_repository_worktree_not_clean");
  }

  const finalIndexFlags = String(
    git(
      ["ls-files", "-v", "-z"],
      "source_binding_repository_final_index_flags_unavailable",
    ).stdout || "",
  );
  if (finalIndexFlags !== indexFlags) {
    fail("source_binding_repository_index_changed_during_observation");
  }
  for (const entry of finalIndexFlags.split("\0")) {
    if (!entry) continue;
    if (!entry.startsWith("H ")) {
      fail("source_binding_repository_index_flags_forbidden");
    }
  }

  const finalStageRowsText = String(
    git(
      ["ls-files", "--stage", "-z"],
      "source_binding_repository_final_index_manifest_unavailable",
    ).stdout || "",
  );
  if (finalStageRowsText !== stageRowsText) {
    fail("source_binding_repository_index_changed_during_observation");
  }

  const finalStaged = git(
    [
      "diff-index",
      "--cached",
      "--quiet",
      "--no-ext-diff",
      head,
      "--",
    ],
    "source_binding_repository_final_index_check_failed",
    { allowFail: true },
  );
  if (finalStaged.status === 1) {
    fail("source_binding_repository_index_changed_during_observation");
  }
  if (finalStaged.status !== 0) {
    fail("source_binding_repository_final_index_check_failed");
  }

  return true;
}

export function testOnlyRepositoryCleanStateV1(
  head,
  options = {},
) {
  return repositoryCleanStateV1(head, options);
}

function rejectLegacyGraftsV1() {
  const commonDirRaw = gitText(
    ["rev-parse", "--git-common-dir"],
    "source_binding_git_common_dir_unavailable",
  );
  const commonDir = path.isAbsolute(commonDirRaw)
    ? path.resolve(commonDirRaw)
    : path.resolve(ROOT, commonDirRaw);
  const grafts = path.join(commonDir, "info", "grafts");
  try {
    fs.lstatSync(grafts);
    fail("source_binding_repository_grafts_forbidden");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function pinnedReviewedBaseIsAncestorV1(head) {
  rejectLegacyGraftsV1();
  return (
    git(
      ["merge-base", "--is-ancestor", REVIEWED_BASE_COMMIT, head],
      "source_binding_reviewed_base_check_failed",
      { allowFail: true },
    ).status === 0
  );
}

function stableFileCore(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink
  );
}

function worktreeGitBlobSha1(
  relativePath,
  {
    testOnlyAfterLstatBeforeOpen = null,
    testOnlyAfterOpenBeforeRead = null,
  } = {},
) {
  const absolute = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, absolute);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("source_binding_worktree_path_invalid:" + relativePath);
  }
  if (
    typeof fs.constants.O_NOFOLLOW !== "number" ||
    typeof fs.constants.O_NONBLOCK !== "number"
  ) {
    fail("source_binding_worktree_nofollow_nonblock_unavailable");
  }

  const before = fs.lstatSync(absolute, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink()) {
    fail("source_binding_worktree_file_invalid:" + relativePath);
  }
  if (before.size < 0n || before.size > 16n * 1024n * 1024n) {
    fail("source_binding_worktree_file_size_invalid:" + relativePath);
  }

  if (testOnlyAfterLstatBeforeOpen !== null) {
    if (typeof testOnlyAfterLstatBeforeOpen !== "function") {
      fail("source_binding_test_hook_invalid");
    }
    testOnlyAfterLstatBeforeOpen(absolute);
  }

  const fd = fs.openSync(
    absolute,
    fs.constants.O_RDONLY |
      fs.constants.O_NOFOLLOW |
      fs.constants.O_NONBLOCK,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (
      !opened.isFile() ||
      opened.isSymbolicLink() ||
      !stableFileCore(before, opened) ||
      opened.size !== before.size ||
      opened.mtimeNs !== before.mtimeNs ||
      opened.ctimeNs !== before.ctimeNs
    ) {
      fail("source_binding_worktree_file_changed:" + relativePath);
    }
    if (opened.size < 0n || opened.size > 16n * 1024n * 1024n) {
      fail("source_binding_worktree_file_size_invalid:" + relativePath);
    }

    if (testOnlyAfterOpenBeforeRead !== null) {
      if (typeof testOnlyAfterOpenBeforeRead !== "function") {
        fail("source_binding_test_hook_invalid");
      }
      testOnlyAfterOpenBeforeRead(absolute, fd);
    }

    const size = Number(opened.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        size - offset,
        offset,
      );
      if (count <= 0) {
        fail("source_binding_worktree_file_short_read:" + relativePath);
      }
      offset += count;
    }

    const growthProbe = Buffer.alloc(1);
    if (fs.readSync(fd, growthProbe, 0, 1, size) !== 0) {
      fail("source_binding_worktree_file_growth:" + relativePath);
    }

    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(absolute, { bigint: true });
    if (
      !stableFileCore(opened, after) ||
      !stableFileCore(after, visibleAfter) ||
      after.size !== opened.size ||
      after.mtimeNs !== opened.mtimeNs ||
      after.ctimeNs !== opened.ctimeNs ||
      visibleAfter.size !== after.size ||
      visibleAfter.mtimeNs !== after.mtimeNs ||
      visibleAfter.ctimeNs !== after.ctimeNs ||
      bytes.length !== Number(after.size)
    ) {
      fail("source_binding_worktree_file_changed:" + relativePath);
    }

    return crypto
      .createHash("sha1")
      .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
      .update(bytes)
      .digest("hex");
  } finally {
    fs.closeSync(fd);
  }
}

export function testOnlyWorktreeGitBlobSha1V1(
  relativePath,
  options = {},
) {
  return worktreeGitBlobSha1(relativePath, options);
}

export function inspectCoupledNativeGasReconciliationCustodySourceBindingV1() {
  try {
    const head = gitText(
      ["rev-parse", "HEAD"],
      "source_binding_repository_head_unavailable",
    );
    const plan = pinnedObservationPlan(head);

    rejectRepositoryExecutionSettingsV1();

    const tree = gitText(
      ["rev-parse", plan.tree_spec],
      "source_binding_repository_tree_unavailable",
    );
    const origin = gitText(
      ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
      "source_binding_repository_origin_unavailable",
    );
    const ancestor = pinnedReviewedBaseIsAncestorV1(
      plan.ancestry_head,
    );
    const sourceBlobs =
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1
        .map((row) =>
          Object.freeze({
            path: row.path,
            git_blob_sha1: gitText(
              ["rev-parse", plan.blob_spec(row.path)],
              "source_binding_blob_unavailable:" + row.path,
            ),
            worktree_git_blob_sha1: worktreeGitBlobSha1(row.path),
          }),
        );

    const worktreeClean =
      repositoryCleanStateV1(plan.head);

    for (const observed of sourceBlobs) {
      const finalWorktreeBlob =
        worktreeGitBlobSha1(observed.path);
      if (
        finalWorktreeBlob !==
        observed.worktree_git_blob_sha1
      ) {
        fail(
          "source_binding_reviewed_source_changed_during_observation:" +
            observed.path,
        );
      }
    }

    rejectRepositoryExecutionSettingsV1();

    const finalOrigin = gitText(
      ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
      "source_binding_repository_final_origin_unavailable",
    );
    if (finalOrigin !== origin) {
      fail("source_binding_repository_origin_changed_during_observation");
    }

    const finalAncestor = pinnedReviewedBaseIsAncestorV1(
      plan.ancestry_head,
    );
    if (finalAncestor !== ancestor) {
      fail("source_binding_repository_ancestry_changed_during_observation");
    }

    const finalHead = gitText(
      ["rev-parse", "HEAD"],
      "source_binding_repository_final_head_unavailable",
    );
    requireObservationHeadUnchangedV1(
      plan.head,
      finalHead,
    );

    return testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1({
      repository_head_sha: plan.head,
      repository_tree_sha: tree,
      repository_origin: origin,
      worktree_clean: worktreeClean,
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
