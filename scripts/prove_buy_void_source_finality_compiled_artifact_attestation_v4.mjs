import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V4";
const MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4.json";
const CANDIDATE_SCRIPT =
  "scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v4_candidate.mjs";
const EXPECTED_CANDIDATE_SCRIPT_GIT_BLOB_SHA1 =
  "7cd1a31d9fb02ebdf4ceb96b38d890bb66474f8c";
const EXPECTED_CANDIDATE_JSON_SHA256 =
  "27279497f9a3bc2b93da59facb6a44d01ba7ba74342d6db6b0521867f1aa8128";
const EXPECTED_COMPILED_GENERATION_SHA256 =
  "45bb17e864579bb59f3b31f63260ce43b1cf85b8e3143d1fa31760e7122f9a87";
const EXPECTED_REVIEWED_SOURCE_SHA256 =
  "95cf8959cfef04accc4715cb310f9b975f1011d27bf9ef0b0d7aefaaeb17a426";
const EXPECTED_SOURCE_STACK_HEAD =
  "47cbb1d4c7fb667a7accdf1089edb11072f3e631";
const EXPECTED_V6_SOURCE_GIT_BLOB_SHA1 =
  "7266c03d8874207ed3fda0f814d0a7a53d429c25";
const EXPECTED_V2_SOURCE_GIT_BLOB_SHA1 =
  "c77bb6144b27eb8fdaff168200cea24d9c0ee9ac";
const EXPECTED_ARTIFACTS = Object.freeze([
  Object.freeze({
    path: "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
    bytes: 15937,
    sha256: "2f4af845031530ca3bad0fa3c17512cf659219b32aa0137f58c48d242bf84b5a",
  }),
  Object.freeze({
    path: "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
    bytes: 18892,
    sha256: "0d023868f4a4ab95fe1276c8d1a7e891dd5c419844e0ed2aac8d3bce15b72f42",
  }),
  Object.freeze({
    path: "dist/economic/buy_void_source_finality_authority_v2.js",
    bytes: 19002,
    sha256: "239bfb3a8c0d2fa986986e961512660c6212818aa5769753d90f592490502c4b",
  }),
  Object.freeze({
    path: "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
    bytes: 19804,
    sha256: "3c5bb3d9952d1b5a537e74ebb759320d1c134c6a9b49dd242edb41c23cab7fe2",
  }),
  Object.freeze({
    path: "dist/economic/buy_void_payment_rpc_observer_v1.js",
    bytes: 12270,
    sha256: "d8ed50dc2f68947f2a9c0758e0f4fa2ab3b4bb368f4f5f851d3b0984c3012b89",
  }),
  Object.freeze({
    path: "dist/economic/buy_void_verified_payment_v2.js",
    bytes: 12161,
    sha256: "7d419bafa54c5a004416e224ee03131455a073600ca2c8d423d9fa40ab431ef2",
  }),
]);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_FILE_BYTES = 64 * 1024;

function fail(message) {
  throw new Error(message);
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes)
    .digest("hex");
}
function sameFileIdentity(a, b) {
  return a.dev === b.dev &&
    a.ino === b.ino &&
    a.mode === b.mode &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs;
}
function readPinned(relativePath, maxBytes = MAX_FILE_BYTES) {
  const absolute = path.join(ROOT, relativePath);
  const noFollow = fs.constants.O_NOFOLLOW;
  if (typeof noFollow !== "number" || noFollow <= 0) {
    fail("locked_v4_nofollow_unavailable:" + relativePath);
  }
  let fd = null;
  try {
    const visibleBefore = fs.lstatSync(absolute);
    if (!visibleBefore.isFile() || visibleBefore.isSymbolicLink() ||
        visibleBefore.nlink !== 1 || visibleBefore.size <= 0 ||
        visibleBefore.size > maxBytes) {
      fail("locked_v4_file_invalid:" + relativePath);
    }
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 ||
        before.size <= 0 || before.size > maxBytes ||
        !sameFileIdentity(visibleBefore, before)) {
      fail("locked_v4_path_fd_mismatch:" + relativePath);
    }
    const buffer = Buffer.alloc(before.size + 1);
    let total = 0;
    while (total < buffer.length) {
      const n = fs.readSync(fd, buffer, total, buffer.length - total, total);
      if (n === 0) break;
      total += n;
    }
    if (total > before.size) fail("locked_v4_growth_detected:" + relativePath);
    if (total !== before.size) fail("locked_v4_short_read:" + relativePath);
    const after = fs.fstatSync(fd);
    const visibleAfter = fs.lstatSync(absolute);
    if (!sameFileIdentity(before, after) ||
        !visibleAfter.isFile() || visibleAfter.isSymbolicLink() ||
        !sameFileIdentity(visibleAfter, after)) {
      fail("locked_v4_file_changed:" + relativePath);
    }
    return buffer.subarray(0, total);
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}
// These bytes have already been bound by the pinned fd and Git blob check.
// NEVER use the candidate path as the child process entrypoint: a new inode
// could replace it after verification, execute side effects, and still print
// the expected candidate JSON. The evaluated entry IS the captured bytes.
function executeReviewedCandidateBytesV4(candidateScriptBytes, candidatePath) {
  const exactPath = path.resolve(candidatePath);
  const prelude =
    "import.meta.url = " + JSON.stringify(pathToFileURL(exactPath).href) + ";\n" +
    "process.argv = [process.execPath, " + JSON.stringify(exactPath) +
    ', "--derive"];\n';
  // Node [eval1] resolves relative ESM imports from cwd, not from an
  // overwritten import.meta.url. The verified candidate's only static
  // imports are Node builtins. Its relative V6 dynamic import is resolved
  // from the scripts directory, not from an arbitrary caller directory.
  return execFileSync(
    process.execPath,
    ["--input-type=module", "--eval",
      prelude + candidateScriptBytes.toString("utf8")],
    {
      cwd: path.dirname(exactPath),
      // Allowlist every child setting: ambient NODE_OPTIONS, NODE_PATH,
      // preload hooks and user-supplied Git or shell configuration must not
      // get propagated into a new source-attestation execution context.
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/nonexistent",
        LANG: "C",
        LC_ALL: "C",
        TZ: "UTC",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_OPTIONAL_LOCKS: "0",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
      maxBuffer: 64 * 1024,
    },
  );
}

function deriveLockedManifest() {
  const candidateScriptBytes = readPinned(CANDIDATE_SCRIPT, 256 * 1024);
  if (gitBlobSha1(candidateScriptBytes) !==
      EXPECTED_CANDIDATE_SCRIPT_GIT_BLOB_SHA1) {
    fail("locked_v4_candidate_script_blob_mismatch");
  }

  const stdout = executeReviewedCandidateBytesV4(
    candidateScriptBytes,
    path.join(ROOT, CANDIDATE_SCRIPT),
  );
  const candidateBytes = Buffer.from(stdout, "utf8");
  if (sha256(candidateBytes) !== EXPECTED_CANDIDATE_JSON_SHA256) {
    fail("locked_v4_candidate_json_mismatch");
  }

  const candidate = JSON.parse(stdout);
  assert.equal(candidate.schema,
    "void_buy_void_source_finality_compiled_artifact_attestation_v4");
  assert.equal(candidate.marker, MARKER);
  assert.equal(candidate.version, 4);
  assert.equal(candidate.source_stack_head, EXPECTED_SOURCE_STACK_HEAD);
  assert.equal(candidate.compiled_artifact_generation_sha256,
    EXPECTED_COMPILED_GENERATION_SHA256);
  assert.equal(candidate.reviewed_source_generation?.reviewed_source_files_sha256,
    EXPECTED_REVIEWED_SOURCE_SHA256);
  assert.equal(candidate.reviewed_source_finality_v6_source_git_blob_sha1,
    EXPECTED_V6_SOURCE_GIT_BLOB_SHA1);
  assert.equal(candidate.verified_payment_v2_source_git_blob_sha1,
    EXPECTED_V2_SOURCE_GIT_BLOB_SHA1);
  assert.deepEqual(candidate.artifacts, EXPECTED_ARTIFACTS);
  assert.equal(candidate.compiled_artifact_generation_verified, false);
  assert.equal(candidate.deployed_artifact_generation_verified, false);
  assert.equal(candidate.runtime_mount_authority, false);
  assert.equal(candidate.production_source_finality_authority_ready, false);

  return Object.freeze({
    ...candidate,
    compiled_artifact_generation_verified: true,
  });
}

const args = process.argv.slice(2);
const expected = deriveLockedManifest();
if (args.length === 1 && args[0] === "--derive") {
  process.stdout.write(JSON.stringify(expected, null, 2) + "\n");
} else {
  assert.equal(args.length, 0, "invalid arguments");
  const committed = readPinned(MANIFEST_PATH);
  const expectedBytes = Buffer.from(JSON.stringify(expected, null, 2) + "\n");
  if (!committed.equals(expectedBytes)) {
    console.log(MARKER + "_DERIVATION_ONLY");
    fail("compiled_artifact_attestation_v4_manifest_mismatch");
  }
  console.log(MARKER + "_LOCKED_GREEN");
  console.log("candidate_evidence_sha256=" + EXPECTED_CANDIDATE_JSON_SHA256);
  console.log("compiled_artifact_generation_sha256=" +
    EXPECTED_COMPILED_GENERATION_SHA256);
  console.log("reviewed_source_files_sha256_v6=" +
    EXPECTED_REVIEWED_SOURCE_SHA256);
  console.log("compiled_artifact_generation_verified=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("production_source_finality_authority_ready=false");
}
