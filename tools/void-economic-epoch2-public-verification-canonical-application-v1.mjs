#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1";
export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_application: true,
    exact_upstream_evidence_required: true,
    exact_composition_receipt_required: true,
    exact_derived_candidate_required: true,
    composition_reexecution_required: true,
    applied_composition_reexecution_required: true,
    applied_exact_upstream_evidence_required: true,
    external_plan_not_semantic_authority: true,
    detached_base_git_view_required: true,
    composition_receipt_equality_required: true,
    derived_candidate_equality_required: true,
    canonical_head_candidate_bytes_required: true,
    reviewed_repository_generation_required: true,
    canonical_github_origin_required: true,
    reviewed_git_executable_required: true,
    ambient_git_overrides_ignored: true,
    git_replacement_objects_disabled: true,
    exact_composition_execution_from_reviewed_head: true,
    private_reviewed_source_materialization: true,
    exact_public_verification_source_delta: true,
    migration_classifier_reexecution: true,
    reviewed_git_commit_required: true,
    repository_source_write: false,
    filesystem_read: true,
    filesystem_write: false,
    runtime_mutation: false,
    service_mutation: false,
    production_rpc_contact: false,
    network_call: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    governance_mutation: false,
    work_credit_mutation: false,
    migration_activation: false,
    public_activation: false,
    token_movement: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const TOOL_REL =
  "tools/void-economic-epoch2-public-verification-canonical-application-v1.mjs";
const COMPOSITION_REL =
  "tools/void-economic-epoch2-public-verification-composition-v1.mjs";
const CLASSIFIER_REL =
  "tools/void-economic-evm-successor-migration-v1.mjs";
const SUCCESSOR_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const CANONICAL_REMOTE =
  "https://github.com/6ZoSo9/void-node.git";
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2pre1_[0-9a-f]{64}$/u;
const COMPOSITION_ID = /^voide2pvc1_[0-9a-f]{64}$/u;
const STATE_ROOT_PROMOTION_ID = /^voide2sraip1_[0-9a-f]{64}$/u;
const PLAN_ID = /^voide2pvca1_[0-9a-f]{64}$/u;
const APPLICATION_ID = /^voide2pvcaa1_[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_PUBLIC_READ_BYTES = 4 * 1024 * 1024;
const MAX_MEMBERSHIP_BYTES = 1024 * 1024;

const INPUT_KEYS = Object.freeze([
  "public_read_evidence_bytes",
  "public_read_evidence_file_sha256",
  "public_read_evidence_id",
  "evaluation_time_utc",
  "state_root_membership_bytes",
  "state_root_membership_file_sha256",
  "expected_registry_address",
  "expected_publisher_address",
  "review_confirmation",
  "composition_receipt_bytes",
  "composition_receipt_file_sha256",
  "derived_candidate_bytes",
  "derived_candidate_file_sha256",
]);

const APPLIED_VERIFY_KEYS = Object.freeze([
  "application_plan_bytes",
  "application_plan_file_sha256",
  "public_read_evidence_bytes",
  "public_read_evidence_file_sha256",
  "public_read_evidence_id",
  "evaluation_time_utc",
  "state_root_membership_bytes",
  "state_root_membership_file_sha256",
  "expected_registry_address",
  "expected_publisher_address",
  "review_confirmation",
]);

const SEMANTIC_REPLAY_KEYS = Object.freeze([
  "plan",
  "public_read_evidence_bytes",
  "public_read_evidence_file_sha256",
  "public_read_evidence_id",
  "evaluation_time_utc",
  "state_root_membership_bytes",
  "state_root_membership_file_sha256",
  "expected_registry_address",
  "expected_publisher_address",
  "review_confirmation",
]);

const PLAN_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "application_base_head_sha",
  "application_base_tree_sha",
  "canonical_remote_url",
  "application_tool_git_blob_sha1",
  "composition_tool_git_blob_sha1",
  "migration_classifier_git_blob_sha1",
  "source_candidate_path",
  "source_candidate_git_blob_sha1",
  "source_candidate_file_sha256",
  "target_candidate_git_blob_sha1",
  "target_candidate_file_sha256",
  "target_candidate",
  "composition_receipt_file_sha256",
  "composition_receipt",
  "composition_id",
  "composition_source_head_sha",
  "composition_source_tree_sha",
  "derived_candidate_file_sha256",
  "public_read_evidence_file_sha256",
  "public_read_evidence_id",
  "evaluation_time_utc",
  "state_root_membership_file_sha256",
  "expected_registry_address",
  "expected_publisher_address",
  "review_confirmation",
  "state_root_promotion_id",
  "promoted_public_verification_fields",
  "migration_before",
  "migration_after",
  "migration_source_ready",
  "reviewed_git_commit_required",
  "migration_authorized",
  "public_activation_authorized",
  "money_movement_authorized",
  "authority",
  "application_plan_id",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
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
  fail("PUBLIC_VERIFICATION_APPLICATION_CANONICAL_VALUE_INVALID");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function inspectGitExecutable() {
  let canonicalPath;
  let stat;
  let bytes;
  try {
    canonicalPath = fs.realpathSync.native(GIT);
    stat = fs.statSync(canonicalPath);
    bytes = fs.readFileSync(canonicalPath);
  } catch {
    fail("PUBLIC_VERIFICATION_APPLICATION_GIT_EXECUTABLE_UNAVAILABLE");
  }
  if (
    !path.isAbsolute(canonicalPath) ||
    !stat.isFile() ||
    (stat.mode & 0o111) === 0
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_GIT_EXECUTABLE_INVALID");
  }
  return Object.freeze({
    path: canonicalPath,
    sha256: sha256(bytes),
    filesystem_identity: [
      canonicalPath,
      String(stat.dev),
      String(stat.ino),
      String(stat.size),
      String(stat.mode & 0o7777),
    ].join("\0"),
  });
}

function sameGitExecutable(left, right) {
  return (
    left.path === right.path &&
    left.sha256 === right.sha256 &&
    left.filesystem_identity === right.filesystem_identity
  );
}

function sanitizedGitEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^GIT_/u.test(key) || key === "SSH_ASKPASS") delete env[key];
  }
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_TERMINAL_PROMPT = "0";
  env.GIT_NO_REPLACE_OBJECTS = "1";
  env.LANG = "C";
  env.LC_ALL = "C";
  env.PATH = "/usr/bin:/bin";
  return env;
}

function gitRun(args, code, { encoding = "utf8", allowFail = false } = {}) {
  const before = inspectGitExecutable();
  const result = spawnSync(
    before.path,
    ["--no-replace-objects", "-C", ROOT, ...args],
    {
      encoding,
      env: sanitizedGitEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: MAX_BYTES + 1024,
    },
  );
  const after = inspectGitExecutable();
  if (!sameGitExecutable(before, after)) {
    fail("PUBLIC_VERIFICATION_APPLICATION_GIT_EXECUTABLE_CHANGED");
  }
  if (result.error || (result.status !== 0 && !allowFail)) fail(code);
  return result;
}

function gitText(args, code, options = {}) {
  const result = gitRun(args, code, options);
  return String(result.stdout || "").trim();
}

function gitBytes(args, code) {
  const result = gitRun(args, code, { encoding: null });
  return Buffer.from(result.stdout || Buffer.alloc(0));
}

function canonicalRemote(value) {
  const text = String(value || "").trim();
  const accepted = new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  if (!accepted.has(text)) {
    fail("PUBLIC_VERIFICATION_APPLICATION_CANONICAL_ORIGIN_REQUIRED");
  }
  return CANONICAL_REMOTE;
}

function repositoryIdentity() {
  const status = gitText(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "PUBLIC_VERIFICATION_APPLICATION_REPOSITORY_STATUS_UNAVAILABLE",
  );
  if (status !== "") {
    fail("PUBLIC_VERIFICATION_APPLICATION_REPOSITORY_MUST_BE_CLEAN");
  }
  const head = gitText(
    ["rev-parse", "HEAD"],
    "PUBLIC_VERIFICATION_APPLICATION_HEAD_UNAVAILABLE",
  );
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "PUBLIC_VERIFICATION_APPLICATION_TREE_UNAVAILABLE",
  );
  const branch = gitText(
    ["branch", "--show-current"],
    "PUBLIC_VERIFICATION_APPLICATION_BRANCH_UNAVAILABLE",
  );
  const remote = canonicalRemote(
    gitText(
      ["config", "--get", "remote.origin.url"],
      "PUBLIC_VERIFICATION_APPLICATION_ORIGIN_UNAVAILABLE",
    ),
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REPOSITORY_IDENTITY_INVALID");
  }
  return Object.freeze({ head, tree, branch, remote });
}

function commitFile(commit, relativePath, label) {
  if (!HEX40.test(String(commit || ""))) {
    fail("PUBLIC_VERIFICATION_APPLICATION_" + label + "_COMMIT_INVALID");
  }
  const bytes = gitBytes(
    ["show", commit + ":" + relativePath],
    "PUBLIC_VERIFICATION_APPLICATION_" + label + "_BYTES_UNAVAILABLE",
  );
  if (bytes.length < 2 || bytes.length > MAX_BYTES) {
    fail("PUBLIC_VERIFICATION_APPLICATION_" + label + "_BYTES_INVALID");
  }
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("PUBLIC_VERIFICATION_APPLICATION_" + label + "_JSON_INVALID");
  }
  if (!plain(value)) {
    fail("PUBLIC_VERIFICATION_APPLICATION_" + label + "_OBJECT_REQUIRED");
  }
  const blob = gitText(
    ["rev-parse", commit + ":" + relativePath],
    "PUBLIC_VERIFICATION_APPLICATION_" + label + "_BLOB_UNAVAILABLE",
  );
  if (!HEX40.test(blob) || gitBlobSha1(bytes) !== blob) {
    fail("PUBLIC_VERIFICATION_APPLICATION_" + label + "_BLOB_MISMATCH");
  }
  return Object.freeze({
    bytes,
    value,
    sha256: sha256(bytes),
    blob_sha1: blob,
  });
}

function headFile(relativePath, label) {
  const head = gitText(
    ["rev-parse", "HEAD"],
    "PUBLIC_VERIFICATION_APPLICATION_" + label + "_HEAD_UNAVAILABLE",
  );
  return commitFile(head, relativePath, label);
}

function parseJsonBytes(bytes, expectedSha, label, maxBytes = MAX_BYTES) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 2 ||
    bytes.length > maxBytes
  ) {
    fail(label + "_BYTES_INVALID");
  }
  if (!HEX64.test(String(expectedSha || ""))) {
    fail(label + "_SHA256_INVALID");
  }
  if (sha256(bytes) !== expectedSha) fail(label + "_SHA256_MISMATCH");
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail(label + "_JSON_INVALID");
  }
  if (!plain(value)) fail(label + "_OBJECT_REQUIRED");
  return Object.freeze({
    bytes: Buffer.from(bytes),
    sha256: expectedSha,
    value,
  });
}

function canonicalAddress(value, code) {
  const text = String(value || "").toLowerCase();
  if (
    !ADDRESS.test(text) ||
    text === "0x0000000000000000000000000000000000000000"
  ) {
    fail(code);
  }
  return text;
}

function canonicalUtc(value) {
  const text = String(value || "");
  if (!UTC.test(text)) fail("PUBLIC_VERIFICATION_APPLICATION_EVALUATION_TIME_INVALID");
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    fail("PUBLIC_VERIFICATION_APPLICATION_EVALUATION_TIME_INVALID");
  }
  return text;
}

function summary(decision) {
  return Object.freeze({
    ok: decision?.ok === true,
    status: typeof decision?.status === "string" ? decision.status : "UNKNOWN",
    reason: typeof decision?.reason === "string" ? decision.reason : null,
    missing_gates: Object.freeze(
      Array.isArray(decision?.missing_gates)
        ? [...decision.missing_gates]
        : [],
    ),
  });
}

function assertClosedLaunchAuthority(candidate) {
  if (candidate?.launch_authority?.source_only !== true) {
    fail("PUBLIC_VERIFICATION_APPLICATION_SOURCE_ONLY_AUTHORITY_REQUIRED");
  }
  for (const [key, value] of Object.entries(candidate.launch_authority)) {
    if (key === "source_only") continue;
    if (value !== false) {
      fail("PUBLIC_VERIFICATION_APPLICATION_AUTHORITY_OPEN:" + key);
    }
  }
}

function assertTargetDelta(source, target) {
  if (
    source?.public_verification?.successor_state_root_public_void_anchor_ready !==
      false ||
    source?.public_verification?.public_balance_receipt_code_verification_ready !==
      false ||
    target?.public_verification?.successor_state_root_public_void_anchor_ready !==
      true ||
    target?.public_verification?.public_balance_receipt_code_verification_ready !==
      true ||
    typeof target?.public_verification
      ?.public_balance_receipt_code_verification_evidence !== "string" ||
    typeof target?.public_verification
      ?.public_balance_receipt_code_verification_promotion !== "string"
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_TARGET_DELTA_INVALID");
  }
  const reset = structuredClone(target);
  reset.public_verification.successor_state_root_public_void_anchor_ready = false;
  reset.public_verification.public_balance_receipt_code_verification_ready = false;
  delete reset.public_verification.public_balance_receipt_code_verification_evidence;
  delete reset.public_verification.public_balance_receipt_code_verification_promotion;
  if (canonicalJson(reset) !== canonicalJson(source)) {
    fail("PUBLIC_VERIFICATION_APPLICATION_TARGET_CHANGE_SCOPE_INVALID");
  }
  assertClosedLaunchAuthority(target);
}

function repositoryGitDir() {
  const raw = gitText(
    ["rev-parse", "--git-dir"],
    "PUBLIC_VERIFICATION_APPLICATION_GIT_DIR_UNAVAILABLE",
  );
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail("PUBLIC_VERIFICATION_APPLICATION_GIT_DIR_INVALID");
  }
  return fs.realpathSync.native(resolved);
}

function checkedSpawn(command, args, {
  cwd = "/",
  env = sanitizedGitEnv(),
  code = "PUBLIC_VERIFICATION_APPLICATION_COMMAND_FAILED",
} = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_BYTES + 1024,
  });
  if (result.error || result.status !== 0) fail(code);
  return result;
}

function materializedBlob(treeRoot, relativePath, expectedBlob) {
  const file = path.resolve(treeRoot, relativePath);
  const relative = path.relative(treeRoot, file);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_MATERIALIZED_PATH_ESCAPE");
  }
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail("PUBLIC_VERIFICATION_APPLICATION_MATERIALIZED_FILE_INVALID");
  }
  const bytes = fs.readFileSync(file);
  if (gitBlobSha1(bytes) !== expectedBlob) {
    fail("PUBLIC_VERIFICATION_APPLICATION_MATERIALIZED_BLOB_MISMATCH");
  }
  return bytes;
}

function repositoryObjectDirectory() {
  const raw = gitText(
    ["rev-parse", "--git-path", "objects"],
    "PUBLIC_VERIFICATION_APPLICATION_OBJECT_DIR_UNAVAILABLE",
  );
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail("PUBLIC_VERIFICATION_APPLICATION_OBJECT_DIR_INVALID");
  }
  return fs.realpathSync.native(resolved);
}

function privateGitText(treeRoot, args, code) {
  const result = checkedSpawn(
    GIT,
    ["--no-replace-objects", "-C", treeRoot, ...args],
    { code },
  );
  const value = String(result.stdout || "").trim();
  if (!value) fail(code);
  return value;
}

function installDetachedReviewedGitView(treeRoot, repo) {
  const gitDir = path.join(treeRoot, ".git");
  const objectInfo = path.join(gitDir, "objects", "info");
  fs.mkdirSync(objectInfo, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(gitDir, "refs"), { recursive: true, mode: 0o700 });

  const config = [
    "[core]",
    "\trepositoryformatversion = 0",
    "\tfilemode = true",
    "\tbare = false",
    "\tlogallrefupdates = false",
    "[remote \"origin\"]",
    "\turl = " + CANONICAL_REMOTE,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(gitDir, "config"), config, {
    encoding: "utf8",
    mode: 0o400,
    flag: "wx",
  });
  fs.writeFileSync(path.join(gitDir, "HEAD"), repo.head + "\n", {
    encoding: "utf8",
    mode: 0o400,
    flag: "wx",
  });
  fs.writeFileSync(
    path.join(objectInfo, "alternates"),
    repositoryObjectDirectory() + "\n",
    { encoding: "utf8", mode: 0o400, flag: "wx" },
  );

  checkedSpawn(
    GIT,
    ["--no-replace-objects", "-C", treeRoot, "read-tree", repo.head],
    { code: "PUBLIC_VERIFICATION_APPLICATION_PRIVATE_INDEX_FAILED" },
  );

  if (
    privateGitText(
      treeRoot,
      ["rev-parse", "HEAD"],
      "PUBLIC_VERIFICATION_APPLICATION_PRIVATE_HEAD_UNAVAILABLE",
    ) !== repo.head ||
    privateGitText(
      treeRoot,
      ["rev-parse", "HEAD^{tree}"],
      "PUBLIC_VERIFICATION_APPLICATION_PRIVATE_TREE_UNAVAILABLE",
    ) !== repo.tree ||
    canonicalRemote(
      privateGitText(
        treeRoot,
        ["config", "--get", "remote.origin.url"],
        "PUBLIC_VERIFICATION_APPLICATION_PRIVATE_ORIGIN_UNAVAILABLE",
      ),
    ) !== repo.remote
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PRIVATE_REPOSITORY_IDENTITY_MISMATCH");
  }

  const clean = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      "-C",
      treeRoot,
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ],
    {
      env: sanitizedGitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  if (
    clean.error ||
    clean.status !== 0 ||
    String(clean.stdout || "").trim() !== ""
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PRIVATE_REPOSITORY_NOT_CLEAN");
  }
}

async function withReviewedComposition(repo, fn) {
  if (
    !repo ||
    !HEX40.test(String(repo.head || "")) ||
    !HEX40.test(String(repo.tree || "")) ||
    canonicalRemote(repo.remote) !== CANONICAL_REMOTE
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REVIEWED_REPOSITORY_INVALID");
  }
  const actualTree = gitText(
    ["rev-parse", repo.head + "^{tree}"],
    "PUBLIC_VERIFICATION_APPLICATION_REVIEWED_TREE_UNAVAILABLE",
  );
  if (actualTree !== repo.tree) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REVIEWED_TREE_MISMATCH");
  }

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-epoch2-public-application-reviewed-"),
  );
  fs.chmodSync(tempRoot, 0o700);
  const treeRoot = path.join(tempRoot, "tree");
  const archive = path.join(tempRoot, "source.tar");
  fs.mkdirSync(treeRoot, { mode: 0o700 });
  try {
    checkedSpawn(
      GIT,
      [
        "--no-replace-objects",
        "-C",
        ROOT,
        "archive",
        "--format=tar",
        "--output=" + archive,
        repo.head,
      ],
      { code: "PUBLIC_VERIFICATION_APPLICATION_ARCHIVE_FAILED" },
    );
    checkedSpawn(
      "/usr/bin/tar",
      ["-xf", archive, "-C", treeRoot],
      { code: "PUBLIC_VERIFICATION_APPLICATION_ARCHIVE_EXTRACT_FAILED" },
    );
    fs.unlinkSync(archive);

    const compositionBlob = gitText(
      ["rev-parse", repo.head + ":" + COMPOSITION_REL],
      "PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_BLOB_UNAVAILABLE",
    );
    const classifierBlob = gitText(
      ["rev-parse", repo.head + ":" + CLASSIFIER_REL],
      "PUBLIC_VERIFICATION_APPLICATION_CLASSIFIER_BLOB_UNAVAILABLE",
    );
    materializedBlob(treeRoot, COMPOSITION_REL, compositionBlob);
    materializedBlob(treeRoot, CLASSIFIER_REL, classifierBlob);

    installDetachedReviewedGitView(treeRoot, repo);
    checkedSpawn(
      "/usr/bin/chmod",
      ["-R", "a-w", treeRoot],
      { code: "PUBLIC_VERIFICATION_APPLICATION_READONLY_LOCK_FAILED" },
    );

    const hadOptionalLocks =
      Object.prototype.hasOwnProperty.call(process.env, "GIT_OPTIONAL_LOCKS");
    const priorOptionalLocks = process.env.GIT_OPTIONAL_LOCKS;
    process.env.GIT_OPTIONAL_LOCKS = "0";
    try {
      const compositionModule = await import(
        pathToFileURL(path.join(treeRoot, COMPOSITION_REL)).href +
          "?reviewed_head=" + repo.head
      );
      const classifierModule = await import(
        pathToFileURL(path.join(treeRoot, CLASSIFIER_REL)).href +
          "?reviewed_head=" + repo.head
      );
      if (
        typeof compositionModule.composeVoidEconomicEpoch2PublicVerificationV1 !==
          "function" ||
        typeof classifierModule.classifyVoidEconomicEvmSuccessorMigrationV1 !==
          "function"
      ) {
        fail("PUBLIC_VERIFICATION_APPLICATION_REVIEWED_EXPORTS_INVALID");
      }
      return await fn({
        compose:
          compositionModule.composeVoidEconomicEpoch2PublicVerificationV1,
        compositionMarker:
          compositionModule.VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1,
        compositionConfirmation:
          compositionModule
            .VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1,
        classify:
          classifierModule.classifyVoidEconomicEvmSuccessorMigrationV1,
        compositionBlob,
        classifierBlob,
      });
    } finally {
      if (hadOptionalLocks) process.env.GIT_OPTIONAL_LOCKS = priorOptionalLocks;
      else delete process.env.GIT_OPTIONAL_LOCKS;
    }
  } finally {
    if (fs.existsSync(treeRoot)) {
      spawnSync("/usr/bin/chmod", ["-R", "u+w", treeRoot], {
        env: { PATH: "/usr/bin:/bin" },
        stdio: "ignore",
      });
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function planBody(plan) {
  const out = {};
  for (const key of PLAN_KEYS) {
    if (key !== "application_plan_id") out[key] = plan[key];
  }
  return out;
}

function exactAuthority(value) {
  exactObject(
    value,
    Object.keys(
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_AUTHORITY_V1,
    ),
    "PUBLIC_VERIFICATION_APPLICATION_AUTHORITY_SHAPE_INVALID",
  );
  if (
    canonicalJson(value) !==
    canonicalJson(
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_AUTHORITY_V1,
    )
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_AUTHORITY_MISMATCH");
  }
}

function validatePlan(plan) {
  exactObject(
    plan,
    PLAN_KEYS,
    "PUBLIC_VERIFICATION_APPLICATION_PLAN_SHAPE_INVALID",
  );
  if (
    plan.marker !==
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1 ||
    plan.version !== 1 ||
    plan.status !==
      "EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PREPARED" ||
    plan.chain_id !== 2050 ||
    plan.execution_epoch !== 2 ||
    plan.canonical_remote_url !== CANONICAL_REMOTE ||
    plan.source_candidate_path !== SUCCESSOR_REL ||
    !COMPOSITION_ID.test(String(plan.composition_id || "")) ||
    !STATE_ROOT_PROMOTION_ID.test(String(plan.state_root_promotion_id || "")) ||
    !EVIDENCE_ID.test(String(plan.public_read_evidence_id || "")) ||
    !PLAN_ID.test(String(plan.application_plan_id || "")) ||
    plan.migration_source_ready !== true ||
    plan.reviewed_git_commit_required !== true ||
    plan.composition_source_head_sha !== plan.application_base_head_sha ||
    plan.composition_source_tree_sha !== plan.application_base_tree_sha ||
    plan.composition_receipt?.status !==
      "EPOCH2_PUBLIC_VERIFICATION_COMPOSED_SOURCE_READY" ||
    plan.composition_receipt?.composition_id !== plan.composition_id ||
    plan.composition_receipt?.source_binding?.source_head_sha !==
      plan.application_base_head_sha ||
    plan.composition_receipt?.source_binding?.source_tree_sha !==
      plan.application_base_tree_sha ||
    canonicalAddress(
      plan.expected_registry_address,
      "PUBLIC_VERIFICATION_APPLICATION_PLAN_REGISTRY_INVALID",
    ) !== plan.expected_registry_address ||
    canonicalAddress(
      plan.expected_publisher_address,
      "PUBLIC_VERIFICATION_APPLICATION_PLAN_PUBLISHER_INVALID",
    ) !== plan.expected_publisher_address ||
    typeof plan.review_confirmation !== "string" ||
    plan.review_confirmation.length < 1 ||
    plan.target_candidate?.public_verification
      ?.public_balance_receipt_code_verification_evidence !==
      "ops/mainnet0/economic-epoch2-public-read-runtime-evidence-v1.json" ||
    plan.target_candidate?.public_verification
      ?.public_balance_receipt_code_verification_promotion !==
      "ops/mainnet0/economic-epoch2-public-read-runtime-promotion-v1.json" ||
    plan.migration_authorized !== false ||
    plan.public_activation_authorized !== false ||
    plan.money_movement_authorized !== false
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_INVALID");
  }
  for (const key of [
    "application_base_head_sha",
    "application_base_tree_sha",
    "application_tool_git_blob_sha1",
    "composition_tool_git_blob_sha1",
    "migration_classifier_git_blob_sha1",
    "source_candidate_git_blob_sha1",
    "target_candidate_git_blob_sha1",
    "composition_source_head_sha",
    "composition_source_tree_sha",
  ]) {
    if (!HEX40.test(String(plan[key] || ""))) {
      fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_GIT_ID_INVALID:" + key);
    }
  }
  for (const key of [
    "source_candidate_file_sha256",
    "target_candidate_file_sha256",
    "composition_receipt_file_sha256",
    "derived_candidate_file_sha256",
    "public_read_evidence_file_sha256",
    "state_root_membership_file_sha256",
  ]) {
    if (!HEX64.test(String(plan[key] || ""))) {
      fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_DIGEST_INVALID:" + key);
    }
  }
  canonicalUtc(plan.evaluation_time_utc);
  exactAuthority(plan.authority);
  if (
    canonicalJson(plan.promoted_public_verification_fields) !==
    canonicalJson([
      "public_balance_receipt_code_verification_evidence",
      "public_balance_receipt_code_verification_promotion",
      "public_balance_receipt_code_verification_ready",
      "successor_state_root_public_void_anchor_ready",
    ])
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_PROMOTED_FIELDS_INVALID");
  }
  const expectedId =
    "voide2pvca1_" +
    sha256(Buffer.from(canonicalJson(planBody(plan)), "utf8"));
  if (expectedId !== plan.application_plan_id) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_ID_MISMATCH");
  }

  const baseTree = gitText(
    ["rev-parse", plan.application_base_head_sha + "^{tree}"],
    "PUBLIC_VERIFICATION_APPLICATION_PLAN_BASE_TREE_UNAVAILABLE",
  );
  if (baseTree !== plan.application_base_tree_sha) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_BASE_TREE_MISMATCH");
  }

  for (const [relativePath, expectedBlob, code] of [
    [
      TOOL_REL,
      plan.application_tool_git_blob_sha1,
      "PUBLIC_VERIFICATION_APPLICATION_PLAN_APPLICATION_TOOL_BLOB_MISMATCH",
    ],
    [
      COMPOSITION_REL,
      plan.composition_tool_git_blob_sha1,
      "PUBLIC_VERIFICATION_APPLICATION_PLAN_COMPOSITION_TOOL_BLOB_MISMATCH",
    ],
    [
      CLASSIFIER_REL,
      plan.migration_classifier_git_blob_sha1,
      "PUBLIC_VERIFICATION_APPLICATION_PLAN_CLASSIFIER_BLOB_MISMATCH",
    ],
  ]) {
    const actual = gitText(
      ["rev-parse", plan.application_base_head_sha + ":" + relativePath],
      code + "_UNAVAILABLE",
    );
    if (actual !== expectedBlob) fail(code);
  }

  const source = commitFile(
    plan.application_base_head_sha,
    SUCCESSOR_REL,
    "PLAN_BASE_SUCCESSOR",
  );
  if (
    source.blob_sha1 !== plan.source_candidate_git_blob_sha1 ||
    source.sha256 !== plan.source_candidate_file_sha256
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_SOURCE_MISMATCH");
  }

  assertTargetDelta(source.value, plan.target_candidate);
  const targetBytes = prettyBytes(plan.target_candidate);
  if (
    gitBlobSha1(targetBytes) !== plan.target_candidate_git_blob_sha1 ||
    sha256(targetBytes) !== plan.target_candidate_file_sha256
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PLAN_TARGET_IDENTITY_MISMATCH");
  }

  return plan;
}

export async function prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_INPUT_SHAPE",
  );

  const publicRead = parseJsonBytes(
    request.public_read_evidence_bytes,
    request.public_read_evidence_file_sha256,
    "PUBLIC_VERIFICATION_APPLICATION_PUBLIC_READ_EVIDENCE",
    MAX_PUBLIC_READ_BYTES,
  );
  if (!EVIDENCE_ID.test(String(request.public_read_evidence_id || ""))) {
    fail("PUBLIC_VERIFICATION_APPLICATION_PUBLIC_READ_EVIDENCE_ID_INVALID");
  }
  const evaluationTime = canonicalUtc(request.evaluation_time_utc);

  const membership = parseJsonBytes(
    request.state_root_membership_bytes,
    request.state_root_membership_file_sha256,
    "PUBLIC_VERIFICATION_APPLICATION_STATE_ROOT_MEMBERSHIP",
    MAX_MEMBERSHIP_BYTES,
  );
  const registry = canonicalAddress(
    request.expected_registry_address,
    "PUBLIC_VERIFICATION_APPLICATION_REGISTRY_INVALID",
  );
  const publisher = canonicalAddress(
    request.expected_publisher_address,
    "PUBLIC_VERIFICATION_APPLICATION_PUBLISHER_INVALID",
  );
  const receipt = parseJsonBytes(
    request.composition_receipt_bytes,
    request.composition_receipt_file_sha256,
    "PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_RECEIPT",
  );
  const derived = parseJsonBytes(
    request.derived_candidate_bytes,
    request.derived_candidate_file_sha256,
    "PUBLIC_VERIFICATION_APPLICATION_DERIVED_CANDIDATE",
  );

  void publicRead;
  void membership;

  const repo = repositoryIdentity();
  const source = headFile(SUCCESSOR_REL, "SUCCESSOR_SOURCE");

  const result = await withReviewedComposition(repo, async ({
    compose,
    compositionMarker,
    compositionConfirmation,
    classify,
    compositionBlob,
    classifierBlob,
  }) => {
    if (request.review_confirmation !== compositionConfirmation) {
      fail("PUBLIC_VERIFICATION_APPLICATION_REVIEW_CONFIRMATION_INVALID");
    }

    const reexecuted = await compose({
      publicReadEvidenceBytes: request.public_read_evidence_bytes,
      expectedPublicReadEvidenceSha256:
        request.public_read_evidence_file_sha256,
      expectedPublicReadEvidenceId: request.public_read_evidence_id,
      evaluationTimeUtc: evaluationTime,
      stateRootMembershipBytes: request.state_root_membership_bytes,
      expectedStateRootMembershipSha256:
        request.state_root_membership_file_sha256,
      expectedRegistryAddress: registry,
      expectedPublisherAddress: publisher,
      reviewConfirmation: request.review_confirmation,
    });

    if (
      reexecuted?.receipt?.marker !== compositionMarker ||
      reexecuted?.receipt?.status !==
        "EPOCH2_PUBLIC_VERIFICATION_COMPOSED_SOURCE_READY" ||
      !COMPOSITION_ID.test(String(reexecuted?.receipt?.composition_id || "")) ||
      reexecuted?.receipt?.final_migration_classifier_status !==
        "SOURCE_READY" ||
      canonicalJson(reexecuted?.receipt?.remaining_migration_gates) !== "[]" ||
      reexecuted?.receipt?.authority?.migration_activation !== false ||
      reexecuted?.receipt?.authority?.public_activation !== false ||
      reexecuted?.receipt?.authority?.funds_movement !== false
    ) {
      fail("PUBLIC_VERIFICATION_APPLICATION_REEXECUTED_COMPOSITION_INVALID");
    }

    if (canonicalJson(reexecuted.receipt) !== canonicalJson(receipt.value)) {
      fail("PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_RECEIPT_MISMATCH");
    }
    if (
      canonicalJson(reexecuted.final_migration_candidate) !==
      canonicalJson(derived.value)
    ) {
      fail("PUBLIC_VERIFICATION_APPLICATION_DERIVED_CANDIDATE_MISMATCH");
    }

    if (
      reexecuted.receipt.source_binding?.source_head_sha !== repo.head ||
      reexecuted.receipt.source_binding?.source_tree_sha !== repo.tree ||
      reexecuted.receipt.source_binding?.canonical_remote_url !== repo.remote
    ) {
      fail("PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_SOURCE_BINDING_MISMATCH");
    }

    if (
      source.value?.public_verification
        ?.successor_state_root_public_void_anchor_ready !== false ||
      source.value?.public_verification
        ?.public_balance_receipt_code_verification_ready !== false
    ) {
      fail("PUBLIC_VERIFICATION_APPLICATION_SOURCE_PRESTATE_INVALID");
    }
    assertClosedLaunchAuthority(source.value);
    assertTargetDelta(source.value, derived.value);

    const before = classify(source.value);
    const after = classify(derived.value);
    if (
      before?.status !== "HOLD" ||
      before?.reason !== "migration_gates_incomplete" ||
      canonicalJson(before.missing_gates) !==
        canonicalJson([
          "successor_state_root_public_void_anchor_required",
          "public_economic_verification_path_required",
        ]) ||
      after?.ok !== true ||
      after?.status !== "SOURCE_READY" ||
      after?.migration_authorized !== false ||
      after?.public_activation_authorized !== false ||
      after?.money_movement_authorized !== false
    ) {
      fail("PUBLIC_VERIFICATION_APPLICATION_CLASSIFIER_LINEAGE_INVALID");
    }

    const targetBytes = prettyBytes(derived.value);
    const material = Object.freeze({
      marker:
        VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1,
      version: 1,
      status: "EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PREPARED",
      chain_id: 2050,
      execution_epoch: 2,
      application_base_head_sha: repo.head,
      application_base_tree_sha: repo.tree,
      canonical_remote_url: repo.remote,
      application_tool_git_blob_sha1: gitText(
        ["rev-parse", "HEAD:" + TOOL_REL],
        "PUBLIC_VERIFICATION_APPLICATION_TOOL_BLOB_UNAVAILABLE",
      ),
      composition_tool_git_blob_sha1: compositionBlob,
      migration_classifier_git_blob_sha1: classifierBlob,
      source_candidate_path: SUCCESSOR_REL,
      source_candidate_git_blob_sha1: source.blob_sha1,
      source_candidate_file_sha256: source.sha256,
      target_candidate_git_blob_sha1: gitBlobSha1(targetBytes),
      target_candidate_file_sha256: sha256(targetBytes),
      target_candidate: deepFreeze(structuredClone(derived.value)),
      composition_receipt_file_sha256: receipt.sha256,
      composition_receipt:
        deepFreeze(structuredClone(reexecuted.receipt)),
      composition_id: reexecuted.receipt.composition_id,
      composition_source_head_sha:
        reexecuted.receipt.source_binding.source_head_sha,
      composition_source_tree_sha:
        reexecuted.receipt.source_binding.source_tree_sha,
      derived_candidate_file_sha256: derived.sha256,
      public_read_evidence_file_sha256:
        request.public_read_evidence_file_sha256,
      public_read_evidence_id: request.public_read_evidence_id,
      evaluation_time_utc: evaluationTime,
      state_root_membership_file_sha256:
        request.state_root_membership_file_sha256,
      expected_registry_address: registry,
      expected_publisher_address: publisher,
      review_confirmation: request.review_confirmation,
      state_root_promotion_id:
        reexecuted.receipt.state_root.promotion_id,
      promoted_public_verification_fields: Object.freeze([
        "public_balance_receipt_code_verification_evidence",
        "public_balance_receipt_code_verification_promotion",
        "public_balance_receipt_code_verification_ready",
        "successor_state_root_public_void_anchor_ready",
      ]),
      migration_before: summary(before),
      migration_after: summary(after),
      migration_source_ready: true,
      reviewed_git_commit_required: true,
      migration_authorized: false,
      public_activation_authorized: false,
      money_movement_authorized: false,
      authority:
        VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_AUTHORITY_V1,
    });
    return Object.freeze({
      ...material,
      application_plan_id:
        "voide2pvca1_" +
        sha256(Buffer.from(canonicalJson(material), "utf8")),
    });
  });

  validatePlan(result);
  const afterRepo = repositoryIdentity();
  if (afterRepo.head !== repo.head || afterRepo.tree !== repo.tree) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REPOSITORY_CHANGED_DURING_PREPARE");
  }
  return result;
}

function verifyAppliedTargetStateV1({
  plan,
  successorCandidate,
  classifyMigration,
}) {
  if (canonicalJson(successorCandidate) !== canonicalJson(plan.target_candidate)) {
    fail("PUBLIC_VERIFICATION_APPLICATION_TARGET_NOT_APPLIED");
  }
  assertTargetDelta(
    commitFile(
      plan.application_base_head_sha,
      SUCCESSOR_REL,
      "STATE_BASE_SUCCESSOR",
    ).value,
    successorCandidate,
  );
  if (typeof classifyMigration !== "function") {
    fail("PUBLIC_VERIFICATION_APPLICATION_CLASSIFIER_REQUIRED");
  }
  const decision = classifyMigration(successorCandidate);
  if (
    decision?.ok !== true ||
    decision?.status !== "SOURCE_READY" ||
    decision?.migration_authorized !== false ||
    decision?.public_activation_authorized !== false ||
    decision?.money_movement_authorized !== false
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_APPLIED_CLASSIFIER_INVALID");
  }
  return Object.freeze({
    ok: true,
    status:
      "EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_STATE_VERIFIED",
    application_plan_id: plan.application_plan_id,
    successor_source_ready: true,
    migration_authorized: false,
    public_activation_authorized: false,
    money_movement_authorized: false,
  });
}

export async function reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1(input) {
  const request = exactObject(
    input,
    SEMANTIC_REPLAY_KEYS,
    "INVALID_PUBLIC_VERIFICATION_APPLICATION_SEMANTIC_REPLAY_INPUT_SHAPE",
  );
  const plan = validatePlan(request.plan);

  parseJsonBytes(
    request.public_read_evidence_bytes,
    request.public_read_evidence_file_sha256,
    "PUBLIC_VERIFICATION_APPLICATION_REPLAY_PUBLIC_READ_EVIDENCE",
    MAX_PUBLIC_READ_BYTES,
  );
  if (
    !EVIDENCE_ID.test(String(request.public_read_evidence_id || "")) ||
    request.public_read_evidence_id !== plan.public_read_evidence_id ||
    request.public_read_evidence_file_sha256 !==
      plan.public_read_evidence_file_sha256
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REPLAY_PUBLIC_READ_BINDING_MISMATCH");
  }

  parseJsonBytes(
    request.state_root_membership_bytes,
    request.state_root_membership_file_sha256,
    "PUBLIC_VERIFICATION_APPLICATION_REPLAY_STATE_ROOT_MEMBERSHIP",
    MAX_MEMBERSHIP_BYTES,
  );
  if (
    request.state_root_membership_file_sha256 !==
      plan.state_root_membership_file_sha256
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REPLAY_MEMBERSHIP_BINDING_MISMATCH");
  }

  const evaluationTime = canonicalUtc(request.evaluation_time_utc);
  if (evaluationTime !== plan.evaluation_time_utc) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REPLAY_EVALUATION_TIME_MISMATCH");
  }
  const registry = canonicalAddress(
    request.expected_registry_address,
    "PUBLIC_VERIFICATION_APPLICATION_REPLAY_REGISTRY_INVALID",
  );
  const publisher = canonicalAddress(
    request.expected_publisher_address,
    "PUBLIC_VERIFICATION_APPLICATION_REPLAY_PUBLISHER_INVALID",
  );
  if (
    registry !== plan.expected_registry_address ||
    publisher !== plan.expected_publisher_address ||
    request.review_confirmation !== plan.review_confirmation
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_REPLAY_REVIEW_INPUT_MISMATCH");
  }

  const reviewedRepo = Object.freeze({
    head: plan.application_base_head_sha,
    tree: plan.application_base_tree_sha,
    remote: plan.canonical_remote_url,
  });

  return await withReviewedComposition(reviewedRepo, async ({
    compose,
    compositionMarker,
    compositionConfirmation,
    classify,
    compositionBlob,
    classifierBlob,
  }) => {
    if (
      compositionBlob !== plan.composition_tool_git_blob_sha1 ||
      classifierBlob !== plan.migration_classifier_git_blob_sha1 ||
      request.review_confirmation !== compositionConfirmation
    ) {
      fail("PUBLIC_VERIFICATION_APPLICATION_REPLAY_SOURCE_LINEAGE_MISMATCH");
    }

    const reexecuted = await compose({
      publicReadEvidenceBytes: request.public_read_evidence_bytes,
      expectedPublicReadEvidenceSha256:
        request.public_read_evidence_file_sha256,
      expectedPublicReadEvidenceId: request.public_read_evidence_id,
      evaluationTimeUtc: evaluationTime,
      stateRootMembershipBytes: request.state_root_membership_bytes,
      expectedStateRootMembershipSha256:
        request.state_root_membership_file_sha256,
      expectedRegistryAddress: registry,
      expectedPublisherAddress: publisher,
      reviewConfirmation: request.review_confirmation,
    });

    if (
      reexecuted?.receipt?.marker !== compositionMarker ||
      reexecuted?.receipt?.status !==
        "EPOCH2_PUBLIC_VERIFICATION_COMPOSED_SOURCE_READY" ||
      reexecuted?.receipt?.composition_id !== plan.composition_id ||
      reexecuted?.receipt?.state_root?.promotion_id !==
        plan.state_root_promotion_id ||
      reexecuted?.receipt?.source_binding?.source_head_sha !==
        plan.application_base_head_sha ||
      reexecuted?.receipt?.source_binding?.source_tree_sha !==
        plan.application_base_tree_sha ||
      canonicalJson(reexecuted.receipt) !==
        canonicalJson(plan.composition_receipt) ||
      canonicalJson(reexecuted.final_migration_candidate) !==
        canonicalJson(plan.target_candidate)
    ) {
      fail("PUBLIC_VERIFICATION_APPLICATION_REPLAY_COMPOSITION_MISMATCH");
    }

    const state = verifyAppliedTargetStateV1({
      plan,
      successorCandidate: reexecuted.final_migration_candidate,
      classifyMigration: classify,
    });
    return Object.freeze({
      ok: true,
      status:
        "EPOCH2_PUBLIC_VERIFICATION_APPLICATION_PLAN_SEMANTICS_REVERIFIED",
      application_plan_id: plan.application_plan_id,
      composition_id: reexecuted.receipt.composition_id,
      state_root_promotion_id: reexecuted.receipt.state_root.promotion_id,
      public_read_evidence_id: plan.public_read_evidence_id,
      exact_upstream_evidence_replayed: true,
      exact_base_generation_replayed: true,
      target_candidate_rederived: true,
      successor_source_ready: true,
      migration_authorized: false,
      public_activation_authorized: false,
      money_movement_authorized: false,
      state,
    });
  });
}

export async function verifyVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1(input) {
  const request = exactObject(
    input,
    APPLIED_VERIFY_KEYS,
    "INVALID_PUBLIC_VERIFICATION_APPLICATION_VERIFY_INPUT_SHAPE",
  );
  const source = parseJsonBytes(
    request.application_plan_bytes,
    request.application_plan_file_sha256,
    "PUBLIC_VERIFICATION_APPLICATION_PLAN_FILE",
  );
  const plan = validatePlan(source.value);
  const semanticReplay =
    await reverifyVoidEconomicEpoch2PublicVerificationPlanSemanticsV1({
      plan,
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
    });
  if (
    semanticReplay?.ok !== true ||
    semanticReplay?.status !==
      "EPOCH2_PUBLIC_VERIFICATION_APPLICATION_PLAN_SEMANTICS_REVERIFIED" ||
    semanticReplay.application_plan_id !== plan.application_plan_id
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_SEMANTIC_REPLAY_INVALID");
  }

  const repo = repositoryIdentity();
  if (repo.branch !== "main") {
    fail("PUBLIC_VERIFICATION_APPLICATION_APPLIED_BRANCH_NOT_MAIN");
  }
  const ancestry = gitRun(
    [
      "merge-base",
      "--is-ancestor",
      plan.application_base_head_sha,
      repo.head,
    ],
    "PUBLIC_VERIFICATION_APPLICATION_BASE_NOT_ANCESTOR",
    { allowFail: true },
  );
  if (ancestry.status !== 0) {
    fail("PUBLIC_VERIFICATION_APPLICATION_BASE_NOT_ANCESTOR");
  }

  const successor = headFile(SUCCESSOR_REL, "APPLIED_SUCCESSOR");
  if (
    successor.blob_sha1 !== plan.target_candidate_git_blob_sha1 ||
    successor.sha256 !== plan.target_candidate_file_sha256
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_TARGET_BLOB_NOT_APPLIED");
  }

  for (const [relativePath, expectedBlob, code] of [
    [
      TOOL_REL,
      plan.application_tool_git_blob_sha1,
      "PUBLIC_VERIFICATION_APPLICATION_TOOL_LINEAGE_DRIFT",
    ],
    [
      COMPOSITION_REL,
      plan.composition_tool_git_blob_sha1,
      "PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_LINEAGE_DRIFT",
    ],
    [
      CLASSIFIER_REL,
      plan.migration_classifier_git_blob_sha1,
      "PUBLIC_VERIFICATION_APPLICATION_CLASSIFIER_LINEAGE_DRIFT",
    ],
  ]) {
    const current = gitText(
      ["rev-parse", "HEAD:" + relativePath],
      code + "_UNAVAILABLE",
    );
    if (current !== expectedBlob) fail(code);
  }

  const material = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_V1,
    version: 1,
    status:
      "EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_VERIFIED_SOURCE_READY",
    application_plan_id: plan.application_plan_id,
    application_plan_file_sha256: source.sha256,
    application_base_head_sha: plan.application_base_head_sha,
    applied_head_sha: repo.head,
    applied_tree_sha: repo.tree,
    successor_candidate_git_blob_sha1: successor.blob_sha1,
    exact_upstream_semantic_replay_verified: true,
    exact_base_generation_replayed: true,
    exact_public_verification_source_application_verified: true,
    successor_source_ready: true,
    migration_authorized: false,
    public_activation_authorized: false,
    money_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  return Object.freeze({
    ...material,
    application_id:
      "voide2pvcaa1_" +
      sha256(Buffer.from(canonicalJson(material), "utf8")),
    semantic_replay: semanticReplay,
  });
}

function isInsideRepo(file) {
  const relative = path.relative(ROOT, file);
  return (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    )
  );
}

function readStableExternalFile(file, maxBytes, label) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    isInsideRepo(file)
  ) {
    fail(label + "_PATH_INVALID");
  }
  const real = fs.realpathSync.native(file);
  if (real !== file) fail(label + "_PATH_ALIAS_FORBIDDEN");
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size < 2 || before.size > maxBytes) {
      fail(label + "_SIZE_INVALID");
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
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      fail(label + "_CHANGED_DURING_READ");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function writePrivateJson(file, value) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    isInsideRepo(file)
  ) {
    fail("PUBLIC_VERIFICATION_APPLICATION_OUTPUT_PATH_INVALID");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("PUBLIC_VERIFICATION_APPLICATION_OUTPUT_PARENT_ALIAS_FORBIDDEN");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    fs.writeFileSync(fd, prettyBytes(value));
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({
      bytes: prettyBytes(value).length,
      sha256: sha256(prettyBytes(value)),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function usage() {
  console.log(
    "prepare --public-read-evidence /abs/file --public-read-sha256 64hex " +
      "--public-read-evidence-id voide2pre1_... --evaluation-time-utc ... " +
      "--state-root-membership /abs/file --membership-sha256 64hex " +
      "--registry 0x... --publisher 0x... --confirmation ... " +
      "--composition-receipt /abs/file --composition-receipt-sha256 64hex " +
      "--derived-candidate /abs/file --derived-candidate-sha256 64hex " +
      "--output /abs/plan.json",
  );
  console.log(
    "verify-applied --plan /abs/plan.json --plan-sha256 64hex " +
      "--public-read-evidence /abs/file --public-read-sha256 64hex " +
      "--public-read-evidence-id voide2pre1_... --evaluation-time-utc ... " +
      "--state-root-membership /abs/file --membership-sha256 64hex " +
      "--registry 0x... --publisher 0x... --confirmation ...",
  );
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "public-read-evidence": { type: "string" },
      "public-read-sha256": { type: "string" },
      "public-read-evidence-id": { type: "string" },
      "evaluation-time-utc": { type: "string" },
      "state-root-membership": { type: "string" },
      "membership-sha256": { type: "string" },
      registry: { type: "string" },
      publisher: { type: "string" },
      confirmation: { type: "string" },
      "composition-receipt": { type: "string" },
      "composition-receipt-sha256": { type: "string" },
      "derived-candidate": { type: "string" },
      "derived-candidate-sha256": { type: "string" },
      output: { type: "string" },
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
    const required = [
      "public-read-evidence",
      "public-read-sha256",
      "public-read-evidence-id",
      "evaluation-time-utc",
      "state-root-membership",
      "membership-sha256",
      "registry",
      "publisher",
      "confirmation",
      "composition-receipt",
      "composition-receipt-sha256",
      "derived-candidate",
      "derived-candidate-sha256",
      "output",
    ];
    for (const key of required) {
      if (!values[key]) fail("PUBLIC_VERIFICATION_APPLICATION_PREPARE_ARGUMENT_MISSING:" + key);
    }
    const plan = await prepareVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1({
      public_read_evidence_bytes: readStableExternalFile(
        path.resolve(values["public-read-evidence"]),
        MAX_PUBLIC_READ_BYTES,
        "PUBLIC_VERIFICATION_APPLICATION_PUBLIC_READ_FILE",
      ),
      public_read_evidence_file_sha256: values["public-read-sha256"],
      public_read_evidence_id: values["public-read-evidence-id"],
      evaluation_time_utc: values["evaluation-time-utc"],
      state_root_membership_bytes: readStableExternalFile(
        path.resolve(values["state-root-membership"]),
        MAX_MEMBERSHIP_BYTES,
        "PUBLIC_VERIFICATION_APPLICATION_MEMBERSHIP_FILE",
      ),
      state_root_membership_file_sha256: values["membership-sha256"],
      expected_registry_address: values.registry,
      expected_publisher_address: values.publisher,
      review_confirmation: values.confirmation,
      composition_receipt_bytes: readStableExternalFile(
        path.resolve(values["composition-receipt"]),
        MAX_BYTES,
        "PUBLIC_VERIFICATION_APPLICATION_COMPOSITION_RECEIPT_FILE",
      ),
      composition_receipt_file_sha256: values["composition-receipt-sha256"],
      derived_candidate_bytes: readStableExternalFile(
        path.resolve(values["derived-candidate"]),
        MAX_BYTES,
        "PUBLIC_VERIFICATION_APPLICATION_DERIVED_CANDIDATE_FILE",
      ),
      derived_candidate_file_sha256: values["derived-candidate-sha256"],
    });
    const written = writePrivateJson(path.resolve(values.output), plan);
    console.log(
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_PLAN_V1,
    );
    console.log("status=" + plan.status);
    console.log("application_plan_id=" + plan.application_plan_id);
    console.log("target_candidate_file_sha256=" + plan.target_candidate_file_sha256);
    console.log("plan_sha256=" + written.sha256);
    console.log("repository_source_write=false");
    console.log("migration_activation=false");
    console.log("public_activation=false");
    console.log("funds_movement=false");
    return;
  }

  if (command === "verify-applied") {
    const required = [
      "plan",
      "plan-sha256",
      "public-read-evidence",
      "public-read-sha256",
      "public-read-evidence-id",
      "evaluation-time-utc",
      "state-root-membership",
      "membership-sha256",
      "registry",
      "publisher",
      "confirmation",
    ];
    for (const key of required) {
      if (!values[key]) {
        fail("PUBLIC_VERIFICATION_APPLICATION_VERIFY_ARGUMENT_MISSING:" + key);
      }
    }
    const result =
      await verifyVoidEconomicEpoch2PublicVerificationCanonicalApplicationV1({
        application_plan_bytes: readStableExternalFile(
          path.resolve(values.plan),
          MAX_BYTES,
          "PUBLIC_VERIFICATION_APPLICATION_PLAN_INPUT",
        ),
        application_plan_file_sha256: values["plan-sha256"],
        public_read_evidence_bytes: readStableExternalFile(
          path.resolve(values["public-read-evidence"]),
          MAX_PUBLIC_READ_BYTES,
          "PUBLIC_VERIFICATION_APPLICATION_VERIFY_PUBLIC_READ_FILE",
        ),
        public_read_evidence_file_sha256: values["public-read-sha256"],
        public_read_evidence_id: values["public-read-evidence-id"],
        evaluation_time_utc: values["evaluation-time-utc"],
        state_root_membership_bytes: readStableExternalFile(
          path.resolve(values["state-root-membership"]),
          MAX_MEMBERSHIP_BYTES,
          "PUBLIC_VERIFICATION_APPLICATION_VERIFY_MEMBERSHIP_FILE",
        ),
        state_root_membership_file_sha256: values["membership-sha256"],
        expected_registry_address: values.registry,
        expected_publisher_address: values.publisher,
        review_confirmation: values.confirmation,
      });
    console.log(VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_V1);
    console.log("status=" + result.status);
    console.log("application_id=" + result.application_id);
    console.log("exact_upstream_semantic_replay_verified=true");
    console.log("exact_base_generation_replayed=true");
    console.log("successor_source_ready=true");
    console.log("migration_authorized=false");
    console.log("public_activation_authorized=false");
    console.log("money_movement_authorized=false");
    return;
  }

  usage();
  fail("PUBLIC_VERIFICATION_APPLICATION_COMMAND_INVALID");
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(
      "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_CANONICAL_APPLICATION_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

export const _internal = Object.freeze({
  canonicalJson,
  sha256,
  gitBlobSha1,
  prettyBytes,
});
