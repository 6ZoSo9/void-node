#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_PLAN_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_PLAN_V1";
export const VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_application: true,
    exact_runtime_binding_receipt_required: true,
    exact_runtime_binding_evidence_required: true,
    runtime_binding_reexecution_required: true,
    exact_promotion_receipt_required: true,
    promotion_reexecution_required: true,
    canonical_head_candidate_bytes_required: true,
    reviewed_repository_generation_required: true,
    exact_one_gate_source_delta: true,
    canonical_classifier_reexecution: true,
    reviewed_git_object_execution_required: true,
    reviewed_package_runtime_required: true,
    permission_fenced_execution_required: true,
    ancestor_package_resolution_forbidden: true,
    ambient_dynamic_loader_overrides_ignored: true,
    execution_child_process_limited_to_reviewed_git: true,
    execution_network_isolation_provided: false,
    reviewed_git_commit_required: true,
    canonical_main_application_required: true,
    canonical_remote_main_read_required: true,
    external_network_read: true,
    repository_source_write: false,
    filesystem_read: true,
    filesystem_write: true,
    private_temporary_filesystem_write: true,
    runtime_or_rpc_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    work_credit_mutation: false,
    validator_mutation: false,
    inventory_funding: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const TOOL_REL =
  "tools/void-participant-postpurchase-canonical-application-v1.mjs";
const PROMOTION_TOOL_REL =
  "tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs";
const CLASSIFIER_REL =
  "tools/void-coupled-economic-successor-gate-v1.mjs";
const RUNTIME_BINDING_TOOL_REL =
  "tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";
const FINALITY_IMPORT_TOOL_REL =
  "tools/void-participant-postpurchase-finality-import-v1.mjs";
const FINALITY_TOOL_REL =
  "tools/void-participant-postpurchase-finality-v1.mjs";
const REVIEWED_RUNTIME_TOOL_REL =
  "tools/void-reviewed-node-package-runtime-v1.mjs";
const REVIEWED_RUNTIME_PROFILE_REL =
  "ops/security/reviewed-node-package-runtime-ethers-v1.json";

const REVIEWED_EXECUTION_MODULE_RELS = Object.freeze([
  "tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs",
  "tools/void-participant-postpurchase-production-runtime-binding-v1.mjs",
  "tools/void-participant-postpurchase-finality-import-v1.mjs",
  "tools/void-participant-postpurchase-finality-v1.mjs",
  "tools/void-coupled-economic-successor-gate-v1.mjs",
  "tools/void-economic-evm-successor-migration-v1.mjs",
  "tools/void-economic-intent-ttl-caps-policy-v1.mjs",
  "tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs",
  "tools/void-shared-market-post-discovery-state-v2.mjs",
  "tools/void-wc-void-coupled-opening-v1.mjs",
  "tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs",
  "tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
  "tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs",
  "tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs",
  "tools/void-wc-void-reverse-settlement-v1.mjs",
  "tools/void-wc-void-public-quote-disclosure-v1.mjs",
]);

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const REVIEWED_RUNTIME_PROFILE_ID = /^voidrnpr1_[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const PLAN_ID = /^voidppca1_[0-9a-f]{64}$/u;
const PROMOTION_ID = /^voidppccp1_[0-9a-f]{64}$/u;
const APPLICATION_ID = /^voidppcaap1_[0-9a-f]{64}$/u;
const MISSING_GATE =
  "participant_post_purchase_voidtoken_control_required";
const PROMOTED_GATE =
  "participant_post_purchase_voidtoken_control_ready";
const INPUT_KEYS = Object.freeze([
  "finality_input_bytes",
  "finality_input_file_sha256",
  "status_result_bytes",
  "status_result_file_sha256",
  "delivery_receipt_result_bytes",
  "delivery_receipt_result_file_sha256",
  "control_receipt_result_bytes",
  "control_receipt_result_file_sha256",
  "runtime_binding_receipt_bytes",
  "runtime_binding_receipt_file_sha256",
  "promotion_receipt_bytes",
  "promotion_receipt_file_sha256",
]);

const PLAN_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "pair",
  "application_base_head_sha",
  "application_base_tree_sha",
  "application_tool_git_blob_sha1",
  "promotion_tool_git_blob_sha1",
  "classifier_git_blob_sha1",
  "runtime_binding_tool_git_blob_sha1",
  "finality_import_tool_git_blob_sha1",
  "finality_tool_git_blob_sha1",
  "reviewed_execution",
  "finality_input_file_sha256",
  "status_result_file_sha256",
  "delivery_receipt_result_file_sha256",
  "control_receipt_result_file_sha256",
  "runtime_binding_receipt_file_sha256",
  "runtime_binding_rederived_from_evidence",
  "promotion_receipt_file_sha256",
  "promotion_id",
  "runtime_binding_id",
  "coupled_candidate_path",
  "coupled_source_git_blob_sha1",
  "coupled_source_file_sha256",
  "coupled_target_git_blob_sha1",
  "coupled_target_file_sha256",
  "coupled_target_candidate",
  "successor_candidate_path",
  "successor_source_git_blob_sha1",
  "successor_source_file_sha256",
  "coupled_before",
  "coupled_after",
  "promoted_coupled_gates",
  "participant_post_purchase_voidtoken_control_ready",
  "coupled_status_remains_hold",
  "coupled_activation_ready",
  "reviewed_git_commit_required",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
  "application_plan_id",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactDataObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key))
  ) {
    fail(code);
  }
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
  }
  return value;
}

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!plain(value)) fail("PARTICIPANT_CANONICAL_JSON_VALUE_INVALID");
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(bytes) {
  return createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function sanitizedGitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
  };
}

const REVIEWED_GIT_CONFIG_ARGS = Object.freeze([
  "-c", "core.hooksPath=/dev/null",
  "-c", "core.attributesFile=/dev/null",
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.preloadIndex=false",
  "-c", "submodule.recurse=false",
]);

function gitRun(args, { allowFail = false, encoding = "utf8", cwd = ROOT } = {}) {
  const result = spawnSync(
    GIT,
    ["--no-replace-objects", ...REVIEWED_GIT_CONFIG_ARGS, "-C", cwd, ...args],
    {
      env: sanitizedGitEnv(),
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
      timeout: 30_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) {
    fail("PARTICIPANT_CANONICAL_GIT_FAILED:" + args.join("_"));
  }
  return result;
}

function gitText(args, code, { allowEmpty = false } = {}) {
  const text = String(gitRun(args).stdout || "").trim();
  if (!allowEmpty && !text) fail(code);
  return text;
}

function canonicalRemoteMainHead() {
  const env = {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
    GIT_NO_REPLACE_OBJECTS: "1",
  };
  const result = spawnSync(
    GIT,
    [
      "ls-remote",
      "https://github.com/6ZoSo9/void-node.git",
      "refs/heads/main",
    ],
    {
      cwd: "/",
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) {
    fail("PARTICIPANT_CANONICAL_REMOTE_MAIN_UNAVAILABLE");
  }
  const lines = String(result.stdout || "")
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean);
  if (lines.length !== 1) {
    fail("PARTICIPANT_CANONICAL_REMOTE_MAIN_INVALID");
  }
  const match = lines[0].match(/^([0-9a-f]{40})\trefs\/heads\/main$/u);
  if (!match) fail("PARTICIPANT_CANONICAL_REMOTE_MAIN_INVALID");
  return match[1];
}

function canonicalRemote(value) {
  const text = String(value || "").trim();
  if (
    ![
      "https://github.com/6ZoSo9/void-node",
      "https://github.com/6ZoSo9/void-node.git",
      "git@github.com:6ZoSo9/void-node.git",
      "ssh://git@github.com/6ZoSo9/void-node.git",
    ].includes(text)
  ) {
    fail("PARTICIPANT_CANONICAL_ORIGIN_REQUIRED");
  }
  return "https://github.com/6ZoSo9/void-node.git";
}

function repositoryIdentity() {
  const status = gitText(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "PARTICIPANT_CANONICAL_REPOSITORY_STATUS_UNAVAILABLE",
    { allowEmpty: true },
  );
  if (status !== "") fail("PARTICIPANT_CANONICAL_REPOSITORY_NOT_CLEAN");
  const head = gitText(
    ["rev-parse", "HEAD"],
    "PARTICIPANT_CANONICAL_REPOSITORY_HEAD_UNAVAILABLE",
  );
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "PARTICIPANT_CANONICAL_REPOSITORY_TREE_UNAVAILABLE",
  );
  const branch = gitText(
    ["branch", "--show-current"],
    "PARTICIPANT_CANONICAL_REPOSITORY_BRANCH_UNAVAILABLE",
    { allowEmpty: true },
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("PARTICIPANT_CANONICAL_REPOSITORY_IDENTITY_INVALID");
  }
  const origin = canonicalRemote(
    gitText(
      ["config", "--get", "remote.origin.url"],
      "PARTICIPANT_CANONICAL_ORIGIN_UNAVAILABLE",
    ),
  );
  return Object.freeze({ head, tree, branch, origin });
}

function commitBytes(commit, relativePath, label) {
  const blob = gitText(
    ["rev-parse", commit + ":" + relativePath],
    label + "_BLOB_UNAVAILABLE",
  );
  if (!HEX40.test(blob)) fail(label + "_BLOB_INVALID");
  const result = gitRun(["show", commit + ":" + relativePath], {
    encoding: null,
  });
  const bytes = Buffer.from(result.stdout || Buffer.alloc(0));
  if (bytes.length < 1 || gitBlobSha1(bytes) !== blob) {
    fail(label + "_GIT_OBJECT_INVALID");
  }
  return Object.freeze({
    blob_sha1: blob,
    sha256: sha256(bytes),
    bytes,
  });
}

function commitFile(commit, relativePath, label) {
  const source = commitBytes(commit, relativePath, label);
  let value;
  try {
    value = JSON.parse(source.bytes.toString("utf8"));
  } catch {
    fail(label + "_JSON_INVALID");
  }
  return Object.freeze({
    ...source,
    value,
  });
}

function headFile(relativePath, label) {
  return commitFile(
    gitText(
      ["rev-parse", "HEAD"],
      "PARTICIPANT_CANONICAL_HEAD_UNAVAILABLE",
    ),
    relativePath,
    label,
  );
}

function assertWorktreeBlob(relativePath, expectedBlob, code) {
  const file = path.resolve(ROOT, relativePath);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 1) fail(code);
  if (gitBlobSha1(fs.readFileSync(file)) !== expectedBlob) fail(code);
}


function reviewedExecutionMetadata(repo) {
  const moduleGitBlobs = Object.create(null);
  for (const relativePath of REVIEWED_EXECUTION_MODULE_RELS) {
    moduleGitBlobs[relativePath] = gitText(
      ["rev-parse", repo.head + ":" + relativePath],
      "PARTICIPANT_CANONICAL_REVIEWED_MODULE_BLOB_UNAVAILABLE:" + relativePath,
    );
    if (!HEX40.test(moduleGitBlobs[relativePath])) {
      fail("PARTICIPANT_CANONICAL_REVIEWED_MODULE_BLOB_INVALID:" + relativePath);
    }
  }
  const runtimeTool = commitBytes(
    repo.head,
    REVIEWED_RUNTIME_TOOL_REL,
    "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_TOOL",
  );
  const profileSource = commitFile(
    repo.head,
    REVIEWED_RUNTIME_PROFILE_REL,
    "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_PROFILE",
  );
  const profile = profileSource.value;
  if (
    typeof profile?.profile_id !== "string" ||
    !REVIEWED_RUNTIME_PROFILE_ID.test(profile.profile_id) ||
    typeof profile?.packages_aggregate_sha256 !== "string" ||
    !HEX64.test(profile.packages_aggregate_sha256)
  ) {
    fail("PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_PROFILE_INVALID");
  }
  const material = Object.freeze({
    reviewed_runtime_tool_path: REVIEWED_RUNTIME_TOOL_REL,
    reviewed_runtime_tool_git_blob_sha1: runtimeTool.blob_sha1,
    reviewed_runtime_profile_path: REVIEWED_RUNTIME_PROFILE_REL,
    reviewed_runtime_profile_git_blob_sha1: profileSource.blob_sha1,
    reviewed_runtime_profile_id: profile.profile_id,
    reviewed_runtime_packages_aggregate_sha256:
      profile.packages_aggregate_sha256,
    reviewed_module_git_blobs: Object.freeze({ ...moduleGitBlobs }),
    permission_fenced_execution: true,
    child_process_required_for_reviewed_git: true,
    ancestor_package_resolution_allowed: false,
    ambient_dynamic_loader_overrides_ignored: true,
    execution_network_isolation_provided: false,
  });
  return Object.freeze({
    ...material,
    reviewed_execution_bundle_id:
      "sha256:" + sha256(Buffer.from(canonicalJson(material), "utf8")),
    profile: Object.freeze(profile),
    runtime_tool_bytes: runtimeTool.bytes,
    profile_bytes: profileSource.bytes,
  });
}

function validateReviewedExecution(value) {
  const keys = [
    "reviewed_runtime_tool_path",
    "reviewed_runtime_tool_git_blob_sha1",
    "reviewed_runtime_profile_path",
    "reviewed_runtime_profile_git_blob_sha1",
    "reviewed_runtime_profile_id",
    "reviewed_runtime_packages_aggregate_sha256",
    "reviewed_module_git_blobs",
    "permission_fenced_execution",
    "child_process_required_for_reviewed_git",
    "ancestor_package_resolution_allowed",
    "ambient_dynamic_loader_overrides_ignored",
    "execution_network_isolation_provided",
    "reviewed_execution_bundle_id",
  ];
  exactDataObject(
    value,
    keys,
    "PARTICIPANT_CANONICAL_REVIEWED_EXECUTION_SHAPE_INVALID",
  );
  if (
    value.reviewed_runtime_tool_path !== REVIEWED_RUNTIME_TOOL_REL ||
    !HEX40.test(String(value.reviewed_runtime_tool_git_blob_sha1 || "")) ||
    value.reviewed_runtime_profile_path !== REVIEWED_RUNTIME_PROFILE_REL ||
    !HEX40.test(String(value.reviewed_runtime_profile_git_blob_sha1 || "")) ||
    !REVIEWED_RUNTIME_PROFILE_ID.test(
      String(value.reviewed_runtime_profile_id || ""),
    ) ||
    !HEX64.test(
      String(value.reviewed_runtime_packages_aggregate_sha256 || ""),
    ) ||
    value.permission_fenced_execution !== true ||
    value.child_process_required_for_reviewed_git !== true ||
    value.ancestor_package_resolution_allowed !== false ||
    value.ambient_dynamic_loader_overrides_ignored !== true ||
    value.execution_network_isolation_provided !== false ||
    !SHA256_ID.test(String(value.reviewed_execution_bundle_id || ""))
  ) {
    fail("PARTICIPANT_CANONICAL_REVIEWED_EXECUTION_INVALID");
  }
  const blobs = exactDataObject(
    value.reviewed_module_git_blobs,
    REVIEWED_EXECUTION_MODULE_RELS,
    "PARTICIPANT_CANONICAL_REVIEWED_MODULE_BLOBS_SHAPE_INVALID",
  );
  for (const relativePath of REVIEWED_EXECUTION_MODULE_RELS) {
    if (!HEX40.test(String(blobs[relativePath] || ""))) {
      fail(
        "PARTICIPANT_CANONICAL_REVIEWED_MODULE_BLOB_INVALID:" + relativePath,
      );
    }
  }
  const material = {
    reviewed_runtime_tool_path: value.reviewed_runtime_tool_path,
    reviewed_runtime_tool_git_blob_sha1:
      value.reviewed_runtime_tool_git_blob_sha1,
    reviewed_runtime_profile_path: value.reviewed_runtime_profile_path,
    reviewed_runtime_profile_git_blob_sha1:
      value.reviewed_runtime_profile_git_blob_sha1,
    reviewed_runtime_profile_id: value.reviewed_runtime_profile_id,
    reviewed_runtime_packages_aggregate_sha256:
      value.reviewed_runtime_packages_aggregate_sha256,
    reviewed_module_git_blobs: blobs,
    permission_fenced_execution: true,
    child_process_required_for_reviewed_git: true,
    ancestor_package_resolution_allowed: false,
    ambient_dynamic_loader_overrides_ignored: true,
    execution_network_isolation_provided: false,
  };
  if (
    value.reviewed_execution_bundle_id !==
      "sha256:" + sha256(Buffer.from(canonicalJson(material), "utf8"))
  ) {
    fail("PARTICIPANT_CANONICAL_REVIEWED_EXECUTION_ID_MISMATCH");
  }
  return value;
}

function privateNodeEnv() {
  const env = {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_COUNT: "6",
  };
  const pairs = [
    ["core.fsmonitor", "false"],
    ["core.hooksPath", "/dev/null"],
    ["core.attributesFile", "/dev/null"],
    ["core.untrackedCache", "false"],
    ["core.preloadIndex", "false"],
    ["submodule.recurse", "false"],
  ];
  pairs.forEach(([key, value], index) => {
    env["GIT_CONFIG_KEY_" + index] = key;
    env["GIT_CONFIG_VALUE_" + index] = value;
  });
  return env;
}

function writePrivateSource(file, bytes, mode = 0o400) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    mode,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, mode);
  } finally {
    fs.closeSync(fd);
  }
}

function gitRunPrivate(cwd, args, code, { allowFail = false } = {}) {
  const result = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      ...REVIEWED_GIT_CONFIG_ARGS,
      "-c", "protocol.file.allow=always",
      "-C", cwd,
      ...args,
    ],
    {
      env: sanitizedGitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
      timeout: 60_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) fail(code);
  return result;
}

function makeExecutionTreeReadOnly(root) {
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        fs.chmodSync(file, 0o500);
      } else {
        fs.chmodSync(file, 0o400);
      }
    }
  }
  walk(root);
  fs.chmodSync(root, 0o500);
}

function makeExecutionTreeRemovable(root) {
  if (!fs.existsSync(root)) return;
  function walk(dir) {
    fs.chmodSync(dir, 0o700);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else fs.chmodSync(file, 0o600);
    }
  }
  walk(root);
}

let reviewedExecutionCache = null;

function cleanupReviewedExecutionCache() {
  if (!reviewedExecutionCache) return;
  const parent = reviewedExecutionCache.parent;
  try {
    makeExecutionTreeRemovable(parent);
    fs.rmSync(parent, { recursive: true, force: true });
  } finally {
    reviewedExecutionCache = null;
  }
}

process.once("exit", cleanupReviewedExecutionCache);

function buildReviewedExecutionRoot(repo, reviewedExecution) {
  validateReviewedExecution(reviewedExecution);
  if (
    reviewedExecutionCache &&
    reviewedExecutionCache.head === repo.head &&
    reviewedExecutionCache.bundle_id ===
      reviewedExecution.reviewed_execution_bundle_id
  ) {
    return reviewedExecutionCache;
  }
  cleanupReviewedExecutionCache();

  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-participant-canonical-reviewed-"),
  );
  fs.chmodSync(parent, 0o700);
  try {
    const bootstrapDir = path.join(parent, "bootstrap");
    fs.mkdirSync(bootstrapDir, { mode: 0o700 });
    const runtimeToolFile = path.join(
      bootstrapDir,
      "void-reviewed-node-package-runtime-v1.mjs",
    );
    writePrivateSource(
      runtimeToolFile,
      commitBytes(
        repo.head,
        REVIEWED_RUNTIME_TOOL_REL,
        "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_TOOL",
      ).bytes,
    );
    const profileFile = path.join(bootstrapDir, "profile.json");
    writePrivateSource(
      profileFile,
      commitBytes(
        repo.head,
        REVIEWED_RUNTIME_PROFILE_REL,
        "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_PROFILE",
      ).bytes,
    );
    const executionRoot = path.join(parent, "execution");
    const bootstrapFile = path.join(bootstrapDir, "bootstrap.mjs");
    const bootstrapSource = [
      'import fs from "node:fs";',
      'import { materializeReviewedNodePackageRuntimeV1, verifyMaterializedReviewedNodePackageRuntimeV1 } from "./void-reviewed-node-package-runtime-v1.mjs";',
      'const request=JSON.parse(fs.readFileSync(0,"utf8"));',
      'const profile=JSON.parse(fs.readFileSync(request.profile_file,"utf8"));',
      'const result=request.action==="materialize"',
      '  ? materializeReviewedNodePackageRuntimeV1({profile,repoRoot:request.repo_root,destinationRoot:request.destination_root})',
      '  : verifyMaterializedReviewedNodePackageRuntimeV1({profile,repoRoot:request.repo_root,destinationRoot:request.destination_root});',
      'process.stdout.write(JSON.stringify(result));',
      '',
    ].join("\n");
    writePrivateSource(
      bootstrapFile,
      Buffer.from(bootstrapSource, "utf8"),
    );
    const bootstrap = spawnSync(
      process.execPath,
      [bootstrapFile],
      {
        cwd: bootstrapDir,
        env: privateNodeEnv(),
        input: JSON.stringify({
          action: "materialize",
          profile_file: profileFile,
          repo_root: ROOT,
          destination_root: executionRoot,
        }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
        timeout: 120_000,
      },
    );
    if (bootstrap.error || bootstrap.status !== 0) {
      fail("PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_MATERIALIZATION_FAILED");
    }

    gitRunPrivate(
      executionRoot,
      ["init", "--quiet"],
      "PARTICIPANT_CANONICAL_PRIVATE_GIT_INIT_FAILED",
    );
    gitRunPrivate(
      executionRoot,
      ["fetch", "--quiet", "--no-tags", "--depth=1", ROOT, repo.head],
      "PARTICIPANT_CANONICAL_PRIVATE_GIT_FETCH_FAILED",
    );
    gitRunPrivate(
      executionRoot,
      ["checkout", "--quiet", "--detach", "FETCH_HEAD"],
      "PARTICIPANT_CANONICAL_PRIVATE_GIT_CHECKOUT_FAILED",
    );
    const privateHead = String(
      gitRunPrivate(
        executionRoot,
        ["rev-parse", "HEAD"],
        "PARTICIPANT_CANONICAL_PRIVATE_GIT_HEAD_UNAVAILABLE",
      ).stdout || "",
    ).trim();
    const privateTree = String(
      gitRunPrivate(
        executionRoot,
        ["rev-parse", "HEAD^{tree}"],
        "PARTICIPANT_CANONICAL_PRIVATE_GIT_TREE_UNAVAILABLE",
      ).stdout || "",
    ).trim();
    if (privateHead !== repo.head || privateTree !== repo.tree) {
      fail("PARTICIPANT_CANONICAL_PRIVATE_GIT_IDENTITY_MISMATCH");
    }

    for (const [relativePath, expectedBlob] of Object.entries(
      reviewedExecution.reviewed_module_git_blobs,
    )) {
      const blob = String(
        gitRunPrivate(
          executionRoot,
          ["rev-parse", "HEAD:" + relativePath],
          "PARTICIPANT_CANONICAL_PRIVATE_MODULE_BLOB_UNAVAILABLE",
        ).stdout || "",
      ).trim();
      if (blob !== expectedBlob) {
        fail("PARTICIPANT_CANONICAL_PRIVATE_MODULE_BLOB_MISMATCH:" + relativePath);
      }
    }

    const runnerDir = path.join(executionRoot, ".runtime");
    fs.mkdirSync(runnerDir, { mode: 0o700 });
    const runnerFile = path.join(
      runnerDir,
      "participant-canonical-reviewed-runner-v1.mjs",
    );
    const runnerSource = [
      'import fs from "node:fs";',
      'import { buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1, VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1 } from "../tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs";',
      'import { buildVoidParticipantPostpurchaseProductionRuntimeBindingV1 } from "../tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";',
      'import { classifyVoidCoupledEconomicSuccessorGateV1 } from "../tools/void-coupled-economic-successor-gate-v1.mjs";',
      'const request=JSON.parse(fs.readFileSync(0,"utf8"));',
      'let result;',
      'if(request.operation==="prepare"){',
      '  const runtime_binding=buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({finalityInput:request.finality_input,statusResult:request.status_result,deliveryReceiptResult:request.delivery_result,controlReceiptResult:request.control_result});',
      '  const promotion=buildVoidParticipantPostpurchaseCoupledCandidatePromotionV1({candidate:request.coupled,successorMigrationCandidate:request.successor,runtimeBindingReceipt:runtime_binding,runtimeBindingFileSha256:request.runtime_binding_file_sha256,candidateFileSha256:request.coupled_file_sha256,successorCandidateFileSha256:request.successor_file_sha256,repositoryHeadSha:request.repository_head_sha,repositoryTreeSha:request.repository_tree_sha,candidateGitBlobSha1:request.coupled_git_blob_sha1,successorCandidateGitBlobSha1:request.successor_git_blob_sha1,classifierGitBlobSha1:request.classifier_git_blob_sha1,promotionToolGitBlobSha1:request.promotion_tool_git_blob_sha1});',
      '  const before=classifyVoidCoupledEconomicSuccessorGateV1(request.coupled,request.successor);',
      '  const after=classifyVoidCoupledEconomicSuccessorGateV1(promotion.promoted_candidate,request.successor);',
      '  result={runtime_binding,promotion,promotion_authority:VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1,before,after};',
      '}else if(request.operation==="classify"){',
      '  result={decision:classifyVoidCoupledEconomicSuccessorGateV1(request.coupled,request.successor)};',
      '}else{throw new Error("participant_reviewed_operation_invalid");}',
      'process.stdout.write(JSON.stringify(result));',
      '',
    ].join("\n");
    writePrivateSource(runnerFile, Buffer.from(runnerSource, "utf8"));

    makeExecutionTreeReadOnly(executionRoot);
    reviewedExecutionCache = Object.freeze({
      head: repo.head,
      bundle_id: reviewedExecution.reviewed_execution_bundle_id,
      parent,
      execution_root: executionRoot,
      runner_file: runnerFile,
      bootstrap_file: bootstrapFile,
      profile_file: profileFile,
    });
    return reviewedExecutionCache;
  } catch (error) {
    try {
      makeExecutionTreeRemovable(parent);
      fs.rmSync(parent, { recursive: true, force: true });
    } catch {}
    throw error;
  }
}

function verifyReviewedRuntimeTree(bundle) {
  const result = spawnSync(
    process.execPath,
    [bundle.bootstrap_file],
    {
      cwd: path.dirname(bundle.bootstrap_file),
      env: privateNodeEnv(),
      input: JSON.stringify({
        action: "verify",
        profile_file: bundle.profile_file,
        repo_root: ROOT,
        destination_root: bundle.execution_root,
      }),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
      timeout: 120_000,
    },
  );
  if (result.error || result.status !== 0) {
    fail("PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_REVERIFY_FAILED");
  }
}

function runReviewedAuthority(repo, reviewedExecution, request) {
  const bundle = buildReviewedExecutionRoot(repo, reviewedExecution);
  verifyReviewedRuntimeTree(bundle);
  const node = fs.realpathSync.native(process.execPath);
  const result = spawnSync(
    node,
    [
      "--permission",
      "--allow-fs-read=" + bundle.execution_root,
      "--allow-child-process",
      bundle.runner_file,
    ],
    {
      cwd: bundle.execution_root,
      env: privateNodeEnv(),
      input: JSON.stringify(request),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120_000,
    },
  );
  if (result.error || result.status !== 0) {
    fail("PARTICIPANT_CANONICAL_REVIEWED_AUTHORITY_EXECUTION_FAILED");
  }
  let value;
  try {
    value = JSON.parse(String(result.stdout || ""));
  } catch {
    fail("PARTICIPANT_CANONICAL_REVIEWED_AUTHORITY_OUTPUT_INVALID");
  }
  return value;
}

function parseJsonBytes(bytes, expectedSha, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > 4 * 1024 * 1024) {
    fail(label + "_BYTES_INVALID");
  }
  if (typeof expectedSha !== "string" || !HEX64.test(expectedSha)) {
    fail(label + "_SHA256_INVALID");
  }
  if (sha256(bytes) !== expectedSha) fail(label + "_SHA256_MISMATCH");
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(label + "_JSON_INVALID");
  }
  if (!plain(value)) fail(label + "_OBJECT_REQUIRED");
  if (!bytes.equals(prettyBytes(value))) fail(label + "_SERIALIZATION_INVALID");
  return Object.freeze({ value, bytes, sha256: expectedSha });
}

function summarize(decision) {
  return Object.freeze({
    ok: decision?.ok === true,
    status: String(decision?.status || ""),
    reason: String(decision?.reason || ""),
    missing_gates: Object.freeze(
      Array.isArray(decision?.missing_gates)
        ? [...decision.missing_gates]
        : [],
    ),
    market_activation_authorized:
      decision?.market_activation_authorized === true,
    public_presale_activation_authorized:
      decision?.public_presale_activation_authorized === true,
    funds_movement_authorized:
      decision?.funds_movement_authorized === true,
  });
}

function sameStrings(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}

function minusOne(values, gate) {
  return values.filter((value) => value !== gate);
}

function exactAuthority(value) {
  exactDataObject(
    value,
    Object.keys(
      VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_AUTHORITY_V1,
    ),
    "PARTICIPANT_CANONICAL_AUTHORITY_SHAPE_INVALID",
  );
  if (
    canonicalJson(value) !==
    canonicalJson(
      VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_AUTHORITY_V1,
    )
  ) {
    fail("PARTICIPANT_CANONICAL_AUTHORITY_MISMATCH");
  }
}

function assertTargetDelta(source, target) {
  if (
    source?.status !== "HOLD" ||
    source?.gates?.[PROMOTED_GATE] !== false ||
    source?.gates?.coupled_activation_ready !== false ||
    target?.status !== "HOLD" ||
    target?.gates?.[PROMOTED_GATE] !== true ||
    target?.gates?.coupled_activation_ready !== false
  ) {
    fail("PARTICIPANT_CANONICAL_TARGET_PREPOST_INVALID");
  }
  const reset = structuredClone(target);
  reset.gates[PROMOTED_GATE] = false;
  if (canonicalJson(reset) !== canonicalJson(source)) {
    fail("PARTICIPANT_CANONICAL_TARGET_DELTA_SCOPE_INVALID");
  }
}

function planWithoutId(plan) {
  const body = structuredClone(plan);
  delete body.application_plan_id;
  return body;
}

function validatePlan(value) {
  const plan = exactDataObject(
    value,
    PLAN_KEYS,
    "PARTICIPANT_CANONICAL_APPLICATION_PLAN_SHAPE_INVALID",
  );
  if (
    plan.marker !==
      VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_PLAN_V1 ||
    plan.version !== 1 ||
    plan.status !== "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_PREPARED" ||
    plan.chain_id !== 2050 ||
    plan.execution_epoch !== 2 ||
    plan.pair !== "WC_VOID" ||
    !PLAN_ID.test(String(plan.application_plan_id || "")) ||
    !PROMOTION_ID.test(String(plan.promotion_id || "")) ||
    plan.coupled_candidate_path !== COUPLED_REL ||
    plan.successor_candidate_path !== SUCCESSOR_REL ||
    plan.participant_post_purchase_voidtoken_control_ready !== true ||
    plan.coupled_status_remains_hold !== true ||
    plan.coupled_activation_ready !== false ||
    plan.reviewed_git_commit_required !== true ||
    plan.runtime_binding_rederived_from_evidence !== true ||
    plan.market_activation_authorized !== false ||
    plan.public_presale_activation_authorized !== false ||
    plan.funds_movement_authorized !== false
  ) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_PLAN_INVALID");
  }
  for (const key of [
    "application_base_head_sha",
    "application_base_tree_sha",
    "application_tool_git_blob_sha1",
    "promotion_tool_git_blob_sha1",
    "classifier_git_blob_sha1",
    "runtime_binding_tool_git_blob_sha1",
    "finality_import_tool_git_blob_sha1",
    "finality_tool_git_blob_sha1",
    "coupled_source_git_blob_sha1",
    "coupled_target_git_blob_sha1",
    "successor_source_git_blob_sha1",
  ]) {
    if (!HEX40.test(String(plan[key] || ""))) {
      fail("PARTICIPANT_CANONICAL_APPLICATION_PLAN_GIT_ID_INVALID:" + key);
    }
  }
  for (const key of [
    "finality_input_file_sha256",
    "status_result_file_sha256",
    "delivery_receipt_result_file_sha256",
    "control_receipt_result_file_sha256",
    "runtime_binding_receipt_file_sha256",
    "promotion_receipt_file_sha256",
    "coupled_source_file_sha256",
    "coupled_target_file_sha256",
    "successor_source_file_sha256",
  ]) {
    if (!HEX64.test(String(plan[key] || ""))) {
      fail("PARTICIPANT_CANONICAL_APPLICATION_PLAN_DIGEST_INVALID:" + key);
    }
  }
  if (
    canonicalJson(plan.promoted_coupled_gates) !==
    canonicalJson([PROMOTED_GATE])
  ) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_PLAN_GATE_SCOPE_INVALID");
  }
  exactAuthority(plan.authority);
  const reviewedExecution = validateReviewedExecution(plan.reviewed_execution);
  if (
    "voidppca1_" +
      sha256(Buffer.from(canonicalJson(planWithoutId(plan)), "utf8")) !==
    plan.application_plan_id
  ) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_PLAN_ID_MISMATCH");
  }

  const baseTree = gitText(
    ["rev-parse", plan.application_base_head_sha + "^{tree}"],
    "PARTICIPANT_CANONICAL_APPLICATION_BASE_TREE_UNAVAILABLE",
  );
  if (baseTree !== plan.application_base_tree_sha) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_BASE_TREE_MISMATCH");
  }

  for (const [relativePath, expected, code] of [
    [
      TOOL_REL,
      plan.application_tool_git_blob_sha1,
      "PARTICIPANT_CANONICAL_APPLICATION_TOOL_BLOB_MISMATCH",
    ],
    [
      PROMOTION_TOOL_REL,
      plan.promotion_tool_git_blob_sha1,
      "PARTICIPANT_CANONICAL_PROMOTION_TOOL_BLOB_MISMATCH",
    ],
    [
      CLASSIFIER_REL,
      plan.classifier_git_blob_sha1,
      "PARTICIPANT_CANONICAL_CLASSIFIER_BLOB_MISMATCH",
    ],
    [
      RUNTIME_BINDING_TOOL_REL,
      plan.runtime_binding_tool_git_blob_sha1,
      "PARTICIPANT_CANONICAL_RUNTIME_BINDING_TOOL_BLOB_MISMATCH",
    ],
    [
      FINALITY_IMPORT_TOOL_REL,
      plan.finality_import_tool_git_blob_sha1,
      "PARTICIPANT_CANONICAL_FINALITY_IMPORT_TOOL_BLOB_MISMATCH",
    ],
    [
      FINALITY_TOOL_REL,
      plan.finality_tool_git_blob_sha1,
      "PARTICIPANT_CANONICAL_FINALITY_TOOL_BLOB_MISMATCH",
    ],
  ]) {
    const actual = gitText(
      ["rev-parse", plan.application_base_head_sha + ":" + relativePath],
      code + "_UNAVAILABLE",
    );
    if (actual !== expected) fail(code);
  }

  for (const [relativePath, expected] of Object.entries(
    reviewedExecution.reviewed_module_git_blobs,
  )) {
    const actual = gitText(
      ["rev-parse", plan.application_base_head_sha + ":" + relativePath],
      "PARTICIPANT_CANONICAL_REVIEWED_MODULE_BASE_BLOB_UNAVAILABLE",
    );
    if (actual !== expected) {
      fail("PARTICIPANT_CANONICAL_REVIEWED_MODULE_BASE_BLOB_MISMATCH:" + relativePath);
    }
  }
  for (const [relativePath, expected, code] of [
    [
      REVIEWED_RUNTIME_TOOL_REL,
      reviewedExecution.reviewed_runtime_tool_git_blob_sha1,
      "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_TOOL_BASE_BLOB_MISMATCH",
    ],
    [
      REVIEWED_RUNTIME_PROFILE_REL,
      reviewedExecution.reviewed_runtime_profile_git_blob_sha1,
      "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_PROFILE_BASE_BLOB_MISMATCH",
    ],
  ]) {
    const actual = gitText(
      ["rev-parse", plan.application_base_head_sha + ":" + relativePath],
      code + "_UNAVAILABLE",
    );
    if (actual !== expected) fail(code);
  }

  const baseCoupled = commitFile(
    plan.application_base_head_sha,
    COUPLED_REL,
    "PARTICIPANT_CANONICAL_BASE_COUPLED",
  );
  const baseSuccessor = commitFile(
    plan.application_base_head_sha,
    SUCCESSOR_REL,
    "PARTICIPANT_CANONICAL_BASE_SUCCESSOR",
  );
  if (
    baseCoupled.blob_sha1 !== plan.coupled_source_git_blob_sha1 ||
    baseCoupled.sha256 !== plan.coupled_source_file_sha256 ||
    baseSuccessor.blob_sha1 !== plan.successor_source_git_blob_sha1 ||
    baseSuccessor.sha256 !== plan.successor_source_file_sha256
  ) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_BASE_SOURCE_MISMATCH");
  }

  assertTargetDelta(baseCoupled.value, plan.coupled_target_candidate);
  const baseRepo = Object.freeze({
    head: plan.application_base_head_sha,
    tree: plan.application_base_tree_sha,
  });
  const before = runReviewedAuthority(
    baseRepo,
    reviewedExecution,
    {
      operation: "classify",
      coupled: baseCoupled.value,
      successor: baseSuccessor.value,
    },
  ).decision;
  const after = runReviewedAuthority(
    baseRepo,
    reviewedExecution,
    {
      operation: "classify",
      coupled: plan.coupled_target_candidate,
      successor: baseSuccessor.value,
    },
  ).decision;
  if (
    canonicalJson(summarize(before)) !== canonicalJson(plan.coupled_before) ||
    canonicalJson(summarize(after)) !== canonicalJson(plan.coupled_after) ||
    before?.status !== "HOLD" ||
    after?.status !== "HOLD" ||
    !before?.missing_gates?.includes(MISSING_GATE) ||
    !sameStrings(after.missing_gates, minusOne(before.missing_gates, MISSING_GATE))
  ) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_CLASSIFIER_LINEAGE_MISMATCH");
  }

  const targetBytes = prettyBytes(plan.coupled_target_candidate);
  if (
    sha256(targetBytes) !== plan.coupled_target_file_sha256 ||
    gitBlobSha1(targetBytes) !== plan.coupled_target_git_blob_sha1
  ) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_TARGET_IDENTITY_MISMATCH");
  }
  return plan;
}

export function prepareVoidParticipantPostpurchaseCanonicalApplicationV1(input) {
  const request = exactDataObject(
    input,
    INPUT_KEYS,
    "INVALID_PARTICIPANT_CANONICAL_APPLICATION_INPUT_SHAPE",
  );
  const finalitySource = parseJsonBytes(
    request.finality_input_bytes,
    request.finality_input_file_sha256,
    "PARTICIPANT_CANONICAL_FINALITY_INPUT",
  );
  const statusSource = parseJsonBytes(
    request.status_result_bytes,
    request.status_result_file_sha256,
    "PARTICIPANT_CANONICAL_STATUS_RESULT",
  );
  const deliverySource = parseJsonBytes(
    request.delivery_receipt_result_bytes,
    request.delivery_receipt_result_file_sha256,
    "PARTICIPANT_CANONICAL_DELIVERY_RECEIPT_RESULT",
  );
  const controlSource = parseJsonBytes(
    request.control_receipt_result_bytes,
    request.control_receipt_result_file_sha256,
    "PARTICIPANT_CANONICAL_CONTROL_RECEIPT_RESULT",
  );
  const runtimeSource = parseJsonBytes(
    request.runtime_binding_receipt_bytes,
    request.runtime_binding_receipt_file_sha256,
    "PARTICIPANT_CANONICAL_RUNTIME_BINDING_RECEIPT",
  );
  const promotionSource = parseJsonBytes(
    request.promotion_receipt_bytes,
    request.promotion_receipt_file_sha256,
    "PARTICIPANT_CANONICAL_PROMOTION_RECEIPT",
  );

  const repo = repositoryIdentity();
  const coupled = headFile(COUPLED_REL, "PARTICIPANT_CANONICAL_COUPLED_SOURCE");
  const successor = headFile(
    SUCCESSOR_REL,
    "PARTICIPANT_CANONICAL_SUCCESSOR_SOURCE",
  );
  const toolBlobs = Object.freeze({
    application: gitText(
      ["rev-parse", "HEAD:" + TOOL_REL],
      "PARTICIPANT_CANONICAL_APPLICATION_TOOL_BLOB_UNAVAILABLE",
    ),
    promotion: gitText(
      ["rev-parse", "HEAD:" + PROMOTION_TOOL_REL],
      "PARTICIPANT_CANONICAL_PROMOTION_TOOL_BLOB_UNAVAILABLE",
    ),
    classifier: gitText(
      ["rev-parse", "HEAD:" + CLASSIFIER_REL],
      "PARTICIPANT_CANONICAL_CLASSIFIER_BLOB_UNAVAILABLE",
    ),
    runtime_binding: gitText(
      ["rev-parse", "HEAD:" + RUNTIME_BINDING_TOOL_REL],
      "PARTICIPANT_CANONICAL_RUNTIME_BINDING_TOOL_BLOB_UNAVAILABLE",
    ),
    finality_import: gitText(
      ["rev-parse", "HEAD:" + FINALITY_IMPORT_TOOL_REL],
      "PARTICIPANT_CANONICAL_FINALITY_IMPORT_TOOL_BLOB_UNAVAILABLE",
    ),
    finality: gitText(
      ["rev-parse", "HEAD:" + FINALITY_TOOL_REL],
      "PARTICIPANT_CANONICAL_FINALITY_TOOL_BLOB_UNAVAILABLE",
    ),
  });
  const reviewedExecutionFull = reviewedExecutionMetadata(repo);
  const reviewedExecution = Object.freeze({
    reviewed_runtime_tool_path:
      reviewedExecutionFull.reviewed_runtime_tool_path,
    reviewed_runtime_tool_git_blob_sha1:
      reviewedExecutionFull.reviewed_runtime_tool_git_blob_sha1,
    reviewed_runtime_profile_path:
      reviewedExecutionFull.reviewed_runtime_profile_path,
    reviewed_runtime_profile_git_blob_sha1:
      reviewedExecutionFull.reviewed_runtime_profile_git_blob_sha1,
    reviewed_runtime_profile_id:
      reviewedExecutionFull.reviewed_runtime_profile_id,
    reviewed_runtime_packages_aggregate_sha256:
      reviewedExecutionFull.reviewed_runtime_packages_aggregate_sha256,
    reviewed_module_git_blobs:
      reviewedExecutionFull.reviewed_module_git_blobs,
    permission_fenced_execution: true,
    child_process_required_for_reviewed_git: true,
    ancestor_package_resolution_allowed: false,
    ambient_dynamic_loader_overrides_ignored: true,
    execution_network_isolation_provided: false,
    reviewed_execution_bundle_id:
      reviewedExecutionFull.reviewed_execution_bundle_id,
  });
  for (const [relativePath, expected, code] of [
    [TOOL_REL, toolBlobs.application, "PARTICIPANT_CANONICAL_APPLICATION_WORKTREE_DRIFT"],
    [PROMOTION_TOOL_REL, toolBlobs.promotion, "PARTICIPANT_CANONICAL_PROMOTION_WORKTREE_DRIFT"],
    [CLASSIFIER_REL, toolBlobs.classifier, "PARTICIPANT_CANONICAL_CLASSIFIER_WORKTREE_DRIFT"],
    [RUNTIME_BINDING_TOOL_REL, toolBlobs.runtime_binding, "PARTICIPANT_CANONICAL_RUNTIME_BINDING_WORKTREE_DRIFT"],
    [FINALITY_IMPORT_TOOL_REL, toolBlobs.finality_import, "PARTICIPANT_CANONICAL_FINALITY_IMPORT_WORKTREE_DRIFT"],
    [FINALITY_TOOL_REL, toolBlobs.finality, "PARTICIPANT_CANONICAL_FINALITY_WORKTREE_DRIFT"],
  ]) {
    assertWorktreeBlob(relativePath, expected, code);
  }

  const reviewedResult = runReviewedAuthority(
    repo,
    reviewedExecution,
    {
      operation: "prepare",
      finality_input: finalitySource.value,
      status_result: statusSource.value,
      delivery_result: deliverySource.value,
      control_result: controlSource.value,
      coupled: coupled.value,
      successor: successor.value,
      runtime_binding_file_sha256: runtimeSource.sha256,
      coupled_file_sha256: coupled.sha256,
      successor_file_sha256: successor.sha256,
      repository_head_sha: repo.head,
      repository_tree_sha: repo.tree,
      coupled_git_blob_sha1: coupled.blob_sha1,
      successor_git_blob_sha1: successor.blob_sha1,
      classifier_git_blob_sha1: toolBlobs.classifier,
      promotion_tool_git_blob_sha1: toolBlobs.promotion,
    },
  );
  const rederivedRuntime = reviewedResult.runtime_binding;
  const rederivedRuntimeBytes = prettyBytes(rederivedRuntime);
  if (!rederivedRuntimeBytes.equals(runtimeSource.bytes)) {
    fail("PARTICIPANT_CANONICAL_RUNTIME_BINDING_REDERIVATION_MISMATCH");
  }

  const reexecuted = reviewedResult.promotion;
  if (canonicalJson(reexecuted) !== canonicalJson(promotionSource.value)) {
    fail("PARTICIPANT_CANONICAL_REVIEWED_PROMOTION_RECEIPT_MISMATCH");
  }
  if (
    reexecuted.marker !==
      "VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1" ||
    reexecuted.canonical_candidate_file_updated !== false ||
    reexecuted.candidate_promotion_application_required !== true ||
    reexecuted.coupled_activation_ready !== false ||
    canonicalJson(reexecuted.authority) !==
      canonicalJson(reviewedResult.promotion_authority)
  ) {
    fail("PARTICIPANT_CANONICAL_PROMOTION_CONTRACT_INVALID");
  }

  const before = reviewedResult.before;
  const target = structuredClone(reexecuted.promoted_candidate);
  assertTargetDelta(coupled.value, target);
  const after = reviewedResult.after;
  if (
    before?.status !== "HOLD" ||
    after?.status !== "HOLD" ||
    !before?.missing_gates?.includes(MISSING_GATE) ||
    !sameStrings(after.missing_gates, minusOne(before.missing_gates, MISSING_GATE)) ||
    after.market_activation_authorized !== false ||
    after.public_presale_activation_authorized !== false ||
    after.funds_movement_authorized !== false
  ) {
    fail("PARTICIPANT_CANONICAL_POSTSTATE_INVALID");
  }

  const targetBytes = prettyBytes(target);
  const material = Object.freeze({
    marker: VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_PLAN_V1,
    version: 1,
    status: "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_PREPARED",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    application_base_head_sha: repo.head,
    application_base_tree_sha: repo.tree,
    application_tool_git_blob_sha1: toolBlobs.application,
    promotion_tool_git_blob_sha1: toolBlobs.promotion,
    classifier_git_blob_sha1: toolBlobs.classifier,
    runtime_binding_tool_git_blob_sha1: toolBlobs.runtime_binding,
    finality_import_tool_git_blob_sha1: toolBlobs.finality_import,
    finality_tool_git_blob_sha1: toolBlobs.finality,
    reviewed_execution: reviewedExecution,
    finality_input_file_sha256: finalitySource.sha256,
    status_result_file_sha256: statusSource.sha256,
    delivery_receipt_result_file_sha256: deliverySource.sha256,
    control_receipt_result_file_sha256: controlSource.sha256,
    runtime_binding_receipt_file_sha256: runtimeSource.sha256,
    runtime_binding_rederived_from_evidence: true,
    promotion_receipt_file_sha256: promotionSource.sha256,
    promotion_id: reexecuted.promotion_id,
    runtime_binding_id: reexecuted.runtime_binding_id,
    coupled_candidate_path: COUPLED_REL,
    coupled_source_git_blob_sha1: coupled.blob_sha1,
    coupled_source_file_sha256: coupled.sha256,
    coupled_target_git_blob_sha1: gitBlobSha1(targetBytes),
    coupled_target_file_sha256: sha256(targetBytes),
    coupled_target_candidate: structuredClone(target),
    successor_candidate_path: SUCCESSOR_REL,
    successor_source_git_blob_sha1: successor.blob_sha1,
    successor_source_file_sha256: successor.sha256,
    coupled_before: summarize(before),
    coupled_after: summarize(after),
    promoted_coupled_gates: Object.freeze([PROMOTED_GATE]),
    participant_post_purchase_voidtoken_control_ready: true,
    coupled_status_remains_hold: true,
    coupled_activation_ready: false,
    reviewed_git_commit_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  const plan = Object.freeze({
    ...material,
    application_plan_id:
      "voidppca1_" +
      sha256(Buffer.from(canonicalJson(material), "utf8")),
  });
  validatePlan(plan);

  const afterRepo = repositoryIdentity();
  if (afterRepo.head !== repo.head || afterRepo.tree !== repo.tree) {
    fail("PARTICIPANT_CANONICAL_REPOSITORY_CHANGED_DURING_PREPARE");
  }
  return plan;
}

export function verifyVoidParticipantPostpurchaseCanonicalApplicationStateV1({
  plan,
  coupledCandidate,
  successorCandidate,
} = {}) {
  const reviewed = validatePlan(plan);
  if (
    canonicalJson(coupledCandidate) !==
    canonicalJson(reviewed.coupled_target_candidate)
  ) {
    fail("PARTICIPANT_CANONICAL_COUPLED_TARGET_NOT_APPLIED");
  }
  const successorBytes = prettyBytes(successorCandidate);
  if (
    sha256(successorBytes) !== reviewed.successor_source_file_sha256 ||
    gitBlobSha1(successorBytes) !== reviewed.successor_source_git_blob_sha1
  ) {
    fail("PARTICIPANT_CANONICAL_SUCCESSOR_SOURCE_DRIFT");
  }
  const decision = runReviewedAuthority(
    Object.freeze({
      head: reviewed.application_base_head_sha,
      tree: reviewed.application_base_tree_sha,
    }),
    reviewed.reviewed_execution,
    {
      operation: "classify",
      coupled: coupledCandidate,
      successor: successorCandidate,
    },
  ).decision;
  if (
    canonicalJson(summarize(decision)) !==
    canonicalJson(reviewed.coupled_after)
  ) {
    fail("PARTICIPANT_CANONICAL_CLASSIFIER_STATE_MISMATCH");
  }
  return Object.freeze({
    ok: true,
    status:
      "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_STATE_VERIFIED_FINAL_ACTIVATION_HOLD",
    application_plan_id: reviewed.application_plan_id,
    participant_post_purchase_voidtoken_control_ready: true,
    coupled_activation_ready: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
  });
}

export function verifyVoidParticipantPostpurchaseCanonicalApplicationV1({
  application_plan_bytes,
  application_plan_file_sha256,
} = {}) {
  const source = parseJsonBytes(
    application_plan_bytes,
    application_plan_file_sha256,
    "PARTICIPANT_CANONICAL_APPLICATION_PLAN_FILE",
  );
  const plan = validatePlan(source.value);
  const repo = repositoryIdentity();
  if (repo.branch !== "main") {
    fail("PARTICIPANT_CANONICAL_APPLIED_BRANCH_NOT_MAIN");
  }
  const ancestry = gitRun(
    [
      "merge-base",
      "--is-ancestor",
      plan.application_base_head_sha,
      repo.head,
    ],
    { allowFail: true },
  );
  if (ancestry.status !== 0) {
    fail("PARTICIPANT_CANONICAL_BASE_NOT_ANCESTOR");
  }
  const remoteMain = canonicalRemoteMainHead();
  if (remoteMain !== repo.head) {
    fail("PARTICIPANT_CANONICAL_APPLIED_HEAD_NOT_REMOTE_MAIN");
  }

  const coupled = headFile(COUPLED_REL, "PARTICIPANT_CANONICAL_APPLIED_COUPLED");
  const successor = headFile(
    SUCCESSOR_REL,
    "PARTICIPANT_CANONICAL_APPLIED_SUCCESSOR",
  );
  if (
    coupled.blob_sha1 !== plan.coupled_target_git_blob_sha1 ||
    coupled.sha256 !== plan.coupled_target_file_sha256
  ) {
    fail("PARTICIPANT_CANONICAL_COUPLED_BLOB_NOT_APPLIED");
  }
  if (
    successor.blob_sha1 !== plan.successor_source_git_blob_sha1 ||
    successor.sha256 !== plan.successor_source_file_sha256
  ) {
    fail("PARTICIPANT_CANONICAL_SUCCESSOR_BLOB_DRIFT");
  }

  const currentTools = Object.freeze({
    application: gitText(
      ["rev-parse", "HEAD:" + TOOL_REL],
      "PARTICIPANT_CANONICAL_CURRENT_APPLICATION_TOOL_BLOB_UNAVAILABLE",
    ),
    promotion: gitText(
      ["rev-parse", "HEAD:" + PROMOTION_TOOL_REL],
      "PARTICIPANT_CANONICAL_CURRENT_PROMOTION_TOOL_BLOB_UNAVAILABLE",
    ),
    classifier: gitText(
      ["rev-parse", "HEAD:" + CLASSIFIER_REL],
      "PARTICIPANT_CANONICAL_CURRENT_CLASSIFIER_BLOB_UNAVAILABLE",
    ),
    runtime_binding: gitText(
      ["rev-parse", "HEAD:" + RUNTIME_BINDING_TOOL_REL],
      "PARTICIPANT_CANONICAL_CURRENT_RUNTIME_BINDING_TOOL_BLOB_UNAVAILABLE",
    ),
    finality_import: gitText(
      ["rev-parse", "HEAD:" + FINALITY_IMPORT_TOOL_REL],
      "PARTICIPANT_CANONICAL_CURRENT_FINALITY_IMPORT_TOOL_BLOB_UNAVAILABLE",
    ),
    finality: gitText(
      ["rev-parse", "HEAD:" + FINALITY_TOOL_REL],
      "PARTICIPANT_CANONICAL_CURRENT_FINALITY_TOOL_BLOB_UNAVAILABLE",
    ),
  });
  if (
    currentTools.application !== plan.application_tool_git_blob_sha1 ||
    currentTools.promotion !== plan.promotion_tool_git_blob_sha1 ||
    currentTools.classifier !== plan.classifier_git_blob_sha1 ||
    currentTools.runtime_binding !== plan.runtime_binding_tool_git_blob_sha1 ||
    currentTools.finality_import !== plan.finality_import_tool_git_blob_sha1 ||
    currentTools.finality !== plan.finality_tool_git_blob_sha1
  ) {
    fail("PARTICIPANT_CANONICAL_TOOL_LINEAGE_DRIFT");
  }

  const reviewedExecution = validateReviewedExecution(plan.reviewed_execution);
  for (const [relativePath, expected] of Object.entries(
    reviewedExecution.reviewed_module_git_blobs,
  )) {
    const actual = gitText(
      ["rev-parse", "HEAD:" + relativePath],
      "PARTICIPANT_CANONICAL_CURRENT_REVIEWED_MODULE_BLOB_UNAVAILABLE",
    );
    if (actual !== expected) {
      fail("PARTICIPANT_CANONICAL_REVIEWED_MODULE_LINEAGE_DRIFT:" + relativePath);
    }
  }
  for (const [relativePath, expected, code] of [
    [
      REVIEWED_RUNTIME_TOOL_REL,
      reviewedExecution.reviewed_runtime_tool_git_blob_sha1,
      "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_TOOL_LINEAGE_DRIFT",
    ],
    [
      REVIEWED_RUNTIME_PROFILE_REL,
      reviewedExecution.reviewed_runtime_profile_git_blob_sha1,
      "PARTICIPANT_CANONICAL_REVIEWED_RUNTIME_PROFILE_LINEAGE_DRIFT",
    ],
  ]) {
    const actual = gitText(
      ["rev-parse", "HEAD:" + relativePath],
      code + "_UNAVAILABLE",
    );
    if (actual !== expected) fail(code);
  }

  const state = verifyVoidParticipantPostpurchaseCanonicalApplicationStateV1({
    plan,
    coupledCandidate: coupled.value,
    successorCandidate: successor.value,
  });
  const material = Object.freeze({
    marker: VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_V1,
    version: 1,
    status:
      "PARTICIPANT_CONTROL_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    application_plan_id: plan.application_plan_id,
    application_plan_file_sha256: source.sha256,
    application_base_head_sha: plan.application_base_head_sha,
    applied_head_sha: repo.head,
    applied_tree_sha: repo.tree,
    canonical_origin_url: repo.origin,
    canonical_remote_main_sha: remoteMain,
    coupled_candidate_git_blob_sha1: coupled.blob_sha1,
    successor_candidate_git_blob_sha1: successor.blob_sha1,
    exact_one_gate_source_application_verified: true,
    participant_post_purchase_voidtoken_control_ready: true,
    coupled_activation_ready: false,
    final_coupled_activation_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  const application = Object.freeze({
    ...material,
    application_id:
      "voidppcaap1_" +
      sha256(Buffer.from(canonicalJson(material), "utf8")),
    state,
  });
  if (!APPLICATION_ID.test(application.application_id)) {
    fail("PARTICIPANT_CANONICAL_APPLICATION_ID_INVALID");
  }
  return application;
}

function isInsideRepo(file) {
  const relative = path.relative(ROOT, file);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  );
}

function readExternalJson(file, expectedSha, label) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) {
    fail(label + "_PATH_INVALID");
  }
  if (isInsideRepo(file)) fail(label + "_MUST_BE_OUTSIDE_REPOSITORY");
  const real = fs.realpathSync.native(file);
  if (real !== file) fail(label + "_PATH_ALIAS_FORBIDDEN");
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size < 2) {
    fail(label + "_FILE_INVALID");
  }
  return parseJsonBytes(fs.readFileSync(file), expectedSha, label);
}

function usage() {
  console.log(
    "prepare --finality-input /abs/finality.json --finality-input-sha256 <64hex> " +
      "--status-result /abs/status.json --status-result-sha256 <64hex> " +
      "--delivery-result /abs/delivery.json --delivery-result-sha256 <64hex> " +
      "--control-result /abs/control.json --control-result-sha256 <64hex> " +
      "--runtime-binding /abs/runtime.json --runtime-binding-sha256 <64hex> " +
      "--promotion /abs/promotion.json --promotion-sha256 <64hex>",
  );
  console.log(
    "verify-applied --plan /abs/application-plan.json --plan-sha256 <64hex>",
  );
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "finality-input": { type: "string" },
      "finality-input-sha256": { type: "string" },
      "status-result": { type: "string" },
      "status-result-sha256": { type: "string" },
      "delivery-result": { type: "string" },
      "delivery-result-sha256": { type: "string" },
      "control-result": { type: "string" },
      "control-result-sha256": { type: "string" },
      "runtime-binding": { type: "string" },
      "runtime-binding-sha256": { type: "string" },
      promotion: { type: "string" },
      "promotion-sha256": { type: "string" },
      plan: { type: "string" },
      "plan-sha256": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });
  const command = positionals[0] || "";
  if (values.help || command === "help") {
    usage();
    return;
  }
  if (command === "prepare") {
    if (
      !values["finality-input"] ||
      !values["finality-input-sha256"] ||
      !values["status-result"] ||
      !values["status-result-sha256"] ||
      !values["delivery-result"] ||
      !values["delivery-result-sha256"] ||
      !values["control-result"] ||
      !values["control-result-sha256"] ||
      !values["runtime-binding"] ||
      !values["runtime-binding-sha256"] ||
      !values.promotion ||
      !values["promotion-sha256"]
    ) {
      fail("PARTICIPANT_CANONICAL_PREPARE_ARGUMENTS_MISSING");
    }
    const finality = readExternalJson(
      path.resolve(values["finality-input"]),
      values["finality-input-sha256"],
      "PARTICIPANT_CANONICAL_FINALITY_INPUT",
    );
    const status = readExternalJson(
      path.resolve(values["status-result"]),
      values["status-result-sha256"],
      "PARTICIPANT_CANONICAL_STATUS_RESULT",
    );
    const delivery = readExternalJson(
      path.resolve(values["delivery-result"]),
      values["delivery-result-sha256"],
      "PARTICIPANT_CANONICAL_DELIVERY_RESULT",
    );
    const control = readExternalJson(
      path.resolve(values["control-result"]),
      values["control-result-sha256"],
      "PARTICIPANT_CANONICAL_CONTROL_RESULT",
    );
    const runtime = readExternalJson(
      path.resolve(values["runtime-binding"]),
      values["runtime-binding-sha256"],
      "PARTICIPANT_CANONICAL_RUNTIME_BINDING_INPUT",
    );
    const promotion = readExternalJson(
      path.resolve(values.promotion),
      values["promotion-sha256"],
      "PARTICIPANT_CANONICAL_PROMOTION_INPUT",
    );
    const plan = prepareVoidParticipantPostpurchaseCanonicalApplicationV1({
      finality_input_bytes: finality.bytes,
      finality_input_file_sha256: finality.sha256,
      status_result_bytes: status.bytes,
      status_result_file_sha256: status.sha256,
      delivery_receipt_result_bytes: delivery.bytes,
      delivery_receipt_result_file_sha256: delivery.sha256,
      control_receipt_result_bytes: control.bytes,
      control_receipt_result_file_sha256: control.sha256,
      runtime_binding_receipt_bytes: runtime.bytes,
      runtime_binding_receipt_file_sha256: runtime.sha256,
      promotion_receipt_bytes: promotion.bytes,
      promotion_receipt_file_sha256: promotion.sha256,
    });
    process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    return;
  }
  if (command === "verify-applied") {
    if (!values.plan || !values["plan-sha256"]) {
      fail("PARTICIPANT_CANONICAL_VERIFY_ARGUMENTS_MISSING");
    }
    const plan = readExternalJson(
      path.resolve(values.plan),
      values["plan-sha256"],
      "PARTICIPANT_CANONICAL_PLAN_INPUT",
    );
    const receipt = verifyVoidParticipantPostpurchaseCanonicalApplicationV1({
      application_plan_bytes: plan.bytes,
      application_plan_file_sha256: plan.sha256,
    });
    process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
    return;
  }
  usage();
  fail("PARTICIPANT_CANONICAL_COMMAND_INVALID");
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error("VOID_PARTICIPANT_POSTPURCHASE_CANONICAL_APPLICATION_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

export const _internal = Object.freeze({
  canonicalJson,
  prettyBytes,
  sha256,
  gitBlobSha1,
});
