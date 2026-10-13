import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V5";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-v5-candidate-evidence-v1.json";
const MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v5.json";
const PREDECESSOR_MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4.json";
const CANDIDATE_SCRIPT =
  "scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v5_candidate.mjs";
const EXPECTED_EVIDENCE_BYTES = 4101;
const EXPECTED_EVIDENCE_SHA256 =
  "6c59717f5121ab5545b9d2f3995ca31d7ca2a493c779a2c501ca15b7b9fa0544";
const EXPECTED_EVIDENCE_GIT_BLOB_SHA1 =
  "b96ab0dea91151f590300f3a43331273820ec1e4";
const EXPECTED_LOCKED_BYTES = 4100;
const EXPECTED_LOCKED_SHA256 =
  "6d3181b16d55a21410ba22b1722f91866e0f8610c3a0208b600c444593ff69a0";
const EXPECTED_LOCKED_GIT_BLOB_SHA1 =
  "44dc5c187adeb35b6a41038a044165f1c6799c74";
const EXPECTED_CANDIDATE_SCRIPT_GIT_BLOB_SHA1 =
  "d63a2a2db2b4a80b200f065f6dbf973db31f3f2e";
const EXPECTED_COMPILED_GENERATION_SHA256 =
  "18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c";
const EXPECTED_REVIEWED_SOURCE_SHA256 =
  "35691ec1fe0c19f08e9d1c256ce160c1f47139877832b97c0686d93ab42560f8";
const EXPECTED_SOURCE_STACK_HEAD =
  "22a30e3ffad6047a472488104c769140bd050878";
const EXPECTED_PREDECESSOR_BLOB =
  "a07f2e9b03958a58280c4d940fe49097a9413af5";
const EXPECTED_PREDECESSOR_GENERATION =
  "7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06";
const EXPECTED_ARTIFACTS = Object.freeze([
  Object.freeze({
    path: "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
    bytes: 15937,
    sha256: "1994ebb8ca3b6152a44fc5527f120f418c48f6c262911e4f0e9c9d54aee87fec",
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
    bytes: 15167,
    sha256: "9f4f5ee85972777e639dea89abf0c8337576525335ed982be3eb1bfe86c93db3",
  }),
  Object.freeze({
    path: "dist/economic/buy_void_verified_payment_v2.js",
    bytes: 19594,
    sha256: "619177302a195bacd424c9e49f93b15108946fa52cc5b1b4c15829ac32f5c2e6",
  }),
]);
const EXPECTED_SOURCE_AND_BUILD_BLOBS = Object.freeze({
  "src/economic/buy_void_source_finality_generation_provenance_v6.ts":
    "d371b1b08d2afc383d5e4ad831464752843791a3",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts":
    "a3dbe4d0fed3034d3ca2c0b3704a758d7c776090",
  "src/economic/buy_void_source_finality_authority_v2.ts":
    "64953050d74bc0bc6d1e6948ae992d6143edca99",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts":
    "419054e00f4d96015cd066be81e8719ee71ac00c",
  "src/economic/buy_void_payment_rpc_observer_v1.ts":
    "0073818ad6f6418e895bf794024c9d678b3bef86",
  "src/economic/buy_void_verified_payment_v2.ts":
    "550ede02fc0b7d6874c324af58b5ef9c5591b311",
  "package.json": "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  "package-lock.json": "b2671f0149f522b2489247016df0a5ec4bb72b8b",
  "tsconfig.build.json": "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
  "scripts/copy_void_runtime_js_v1.mjs":
    "d1c4b3735ca2d3a9aa392ec1173cf7b123e0f9d9",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs":
    "3786dbc03de4be29b6e42059e46dbe1b95d8aa04",
});
const PREDECESSOR_UNCHANGED = Object.freeze([
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
]);
const CHANGED_ARTIFACTS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);
const MAX_FILE_BYTES = 16 * 1024 * 1024;

function fail(message) { throw new Error(message); }
function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function gitBlobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes).digest("hex");
}
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    assert.ok(Number.isSafeInteger(value), "canonical_number_not_safe_integer");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  assert.ok(value && typeof value === "object", "canonical_value_invalid");
  return `{${Object.keys(value).sort().map(
    key => `${JSON.stringify(key)}:${canonical(value[key])}`,
  ).join(",")}}`;
}
function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), label + "_object");
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), label + "_keys");
}
function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.mode === b.mode &&
    a.nlink === b.nlink && a.size === b.size &&
    a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
}
function readPinned(relativePath, maxBytes = MAX_FILE_BYTES) {
  assert.ok(!path.isAbsolute(relativePath) && !relativePath.split("/").includes(".."),
    "path_outside_root:" + relativePath);
  const absolute = path.join(ROOT, relativePath);
  const noFollow = fs.constants.O_NOFOLLOW;
  assert.ok(typeof noFollow === "number" && noFollow > 0, "nofollow_unavailable");
  let fd;
  try {
    const visibleBefore = fs.lstatSync(absolute);
    assert.ok(visibleBefore.isFile() && !visibleBefore.isSymbolicLink() &&
      visibleBefore.nlink === 1 && visibleBefore.size > 0 && visibleBefore.size <= maxBytes,
      "visible_file_invalid:" + relativePath);
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const before = fs.fstatSync(fd);
    assert.ok(before.isFile() && before.nlink === 1 && before.size > 0 &&
      before.size <= maxBytes && sameIdentity(visibleBefore, before),
      "descriptor_identity_invalid:" + relativePath);
    const buffer = Buffer.alloc(before.size + 1);
    let total = 0;
    while (total < buffer.length) {
      const n = fs.readSync(fd, buffer, total, buffer.length - total, total);
      if (n === 0) break;
      total += n;
    }
    assert.equal(total, before.size, "file_growth_or_short_read:" + relativePath);
    const after = fs.fstatSync(fd);
    const visibleAfter = fs.lstatSync(absolute);
    assert.ok(sameIdentity(before, after) && visibleAfter.isFile() &&
      !visibleAfter.isSymbolicLink() && sameIdentity(visibleAfter, after),
      "file_changed_after_read:" + relativePath);
    return buffer.subarray(0, total);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
function reviewedGit(args) {
  const git = "/usr/bin/git";
  const st = fs.lstatSync(git);
  assert.ok(st.isFile() && !st.isSymbolicLink() && st.uid === 0 &&
    (st.mode & 0o022) === 0, "reviewed_git_binary_invalid");
  return execFileSync(git, args, {
    cwd: ROOT,
    env: {
      PATH: "/usr/bin:/bin",
      HOME: "/nonexistent",
      LANG: "C",
      LC_ALL: "C",
      TZ: "UTC",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_NO_REPLACE_OBJECTS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
}
function validateCandidate(value, accepted) {
  exactKeys(value, [
    "schema", "marker", "version", "repository", "source_stack_head",
    "predecessor", "compiler", "build", "reviewed_source_generation",
    "entry_artifact", "artifact_count", "artifacts",
    "predecessor_unchanged_artifact_paths", "changed_artifact_paths",
    "predecessor_common_artifact_bytes_match",
    "verified_payment_v2_source_git_blob_sha1",
    "verified_payment_v2_artifact_sha256",
    "reviewed_source_finality_v6_source_git_blob_sha1",
    "compiled_artifact_generation_sha256", "derivation_node_majors",
    "compiled_artifact_generation_verified",
    "deployed_artifact_generation_verified", "runtime_mount_authority",
    "production_source_finality_authority_ready",
  ], "candidate");
  assert.equal(value.schema,
    "void_buy_void_source_finality_compiled_artifact_attestation_v5");
  assert.equal(value.marker, MARKER);
  assert.equal(value.version, 5);
  assert.equal(value.repository, "6ZoSo9/void-node");
  assert.equal(value.source_stack_head, EXPECTED_SOURCE_STACK_HEAD);

  exactKeys(value.predecessor, [
    "marker", "manifest_path", "manifest_git_blob_sha1",
    "compiled_artifact_generation_sha256",
  ], "predecessor");
  assert.equal(value.predecessor.marker,
    "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V4");
  assert.equal(value.predecessor.manifest_path, PREDECESSOR_MANIFEST_PATH);
  assert.equal(value.predecessor.manifest_git_blob_sha1, EXPECTED_PREDECESSOR_BLOB);
  assert.equal(value.predecessor.compiled_artifact_generation_sha256,
    EXPECTED_PREDECESSOR_GENERATION);

  exactKeys(value.compiler, ["typescript_version", "package_lock_git_blob_sha1"],
    "compiler");
  assert.equal(value.compiler.typescript_version, "5.9.3");
  assert.equal(value.compiler.package_lock_git_blob_sha1,
    EXPECTED_SOURCE_AND_BUILD_BLOBS["package-lock.json"]);

  exactKeys(value.build, [
    "command", "package_json_git_blob_sha1", "tsconfig_build_git_blob_sha1",
    "source_finality_sources_changed", "change_reason", "changed_source_paths",
  ], "build");
  assert.equal(value.build.command, "npm run build");
  assert.equal(value.build.package_json_git_blob_sha1,
    EXPECTED_SOURCE_AND_BUILD_BLOBS["package.json"]);
  assert.equal(value.build.tsconfig_build_git_blob_sha1,
    EXPECTED_SOURCE_AND_BUILD_BLOBS["tsconfig.build.json"]);
  assert.equal(value.build.source_finality_sources_changed, true);
  assert.equal(value.build.change_reason,
    "payment_rpc_deadline_and_verified_payment_plain_data_source_identity");
  assert.deepEqual(value.build.changed_source_paths, [
    "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
    "src/economic/buy_void_payment_rpc_observer_v1.ts",
    "src/economic/buy_void_verified_payment_v2.ts",
  ]);

  exactKeys(value.reviewed_source_generation,
    ["marker", "reviewed_source_files_sha256", "verified_source_file_count"],
    "reviewed_source_generation");
  assert.equal(value.reviewed_source_generation.marker,
    "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6");
  assert.equal(value.reviewed_source_generation.reviewed_source_files_sha256,
    EXPECTED_REVIEWED_SOURCE_SHA256);
  assert.equal(value.reviewed_source_generation.verified_source_file_count, 5);

  assert.equal(value.entry_artifact, EXPECTED_ARTIFACTS[0].path);
  assert.equal(value.artifact_count, 6);
  assert.deepEqual(value.artifacts, EXPECTED_ARTIFACTS);
  assert.deepEqual(value.predecessor_unchanged_artifact_paths, PREDECESSOR_UNCHANGED);
  assert.deepEqual(value.changed_artifact_paths, CHANGED_ARTIFACTS);
  assert.equal(value.predecessor_common_artifact_bytes_match, true);
  assert.equal(value.verified_payment_v2_source_git_blob_sha1,
    EXPECTED_SOURCE_AND_BUILD_BLOBS[
      "src/economic/buy_void_verified_payment_v2.ts"]);
  assert.equal(value.verified_payment_v2_artifact_sha256,
    EXPECTED_ARTIFACTS[5].sha256);
  assert.equal(value.reviewed_source_finality_v6_source_git_blob_sha1,
    EXPECTED_SOURCE_AND_BUILD_BLOBS[
      "src/economic/buy_void_source_finality_generation_provenance_v6.ts"]);
  assert.equal(value.compiled_artifact_generation_sha256,
    EXPECTED_COMPILED_GENERATION_SHA256);
  assert.deepEqual(value.derivation_node_majors, [22, 24, 26]);
  assert.equal(value.compiled_artifact_generation_verified, accepted);
  assert.equal(value.deployed_artifact_generation_verified, false);
  assert.equal(value.runtime_mount_authority, false);
  assert.equal(value.production_source_finality_authority_ready, false);

  const generation = sha256(Buffer.from(canonical({
    marker: value.marker,
    source_stack_head: value.source_stack_head,
    typescript_version: value.compiler.typescript_version,
    reviewed_source_files_sha256_v6:
      value.reviewed_source_generation.reviewed_source_files_sha256,
    artifacts: value.artifacts,
  }), "utf8"));
  assert.equal(generation, EXPECTED_COMPILED_GENERATION_SHA256,
    "compiled_generation_digest_mismatch");
}

const evidenceBytes = readPinned(EVIDENCE_PATH, 64 * 1024);
assert.equal(evidenceBytes.length, EXPECTED_EVIDENCE_BYTES);
assert.equal(sha256(evidenceBytes), EXPECTED_EVIDENCE_SHA256);
assert.equal(gitBlobSha1(evidenceBytes), EXPECTED_EVIDENCE_GIT_BLOB_SHA1);
const evidence = JSON.parse(evidenceBytes.toString("utf8"));
assert.equal(Buffer.from(JSON.stringify(evidence, null, 2) + "\n").equals(evidenceBytes),
  true, "candidate_evidence_not_canonical_json");
validateCandidate(evidence, false);

const candidateScriptBytes = readPinned(CANDIDATE_SCRIPT, 256 * 1024);
assert.equal(gitBlobSha1(candidateScriptBytes), EXPECTED_CANDIDATE_SCRIPT_GIT_BLOB_SHA1,
  "candidate_derivation_script_blob_drift");

for (const [relativePath, expectedBlob] of
  Object.entries(EXPECTED_SOURCE_AND_BUILD_BLOBS)) {
  const max = relativePath === "package-lock.json" ? MAX_FILE_BYTES : 2 * 1024 * 1024;
  assert.equal(gitBlobSha1(readPinned(relativePath, max)), expectedBlob,
    "source_or_build_blob_drift:" + relativePath);
}

reviewedGit(["merge-base", "--is-ancestor", EXPECTED_SOURCE_STACK_HEAD, "HEAD"]);
reviewedGit(["diff", "--quiet", EXPECTED_SOURCE_STACK_HEAD, "HEAD", "--",
  ...Object.keys(EXPECTED_SOURCE_AND_BUILD_BLOBS),
]);

const predecessorBytes = readPinned(PREDECESSOR_MANIFEST_PATH, 64 * 1024);
assert.equal(gitBlobSha1(predecessorBytes), EXPECTED_PREDECESSOR_BLOB,
  "predecessor_manifest_blob_drift");
const predecessor = JSON.parse(predecessorBytes.toString("utf8"));
assert.equal(predecessor.compiled_artifact_generation_sha256,
  EXPECTED_PREDECESSOR_GENERATION);
assert.equal(predecessor.compiled_artifact_generation_verified, true);
assert.equal(predecessor.deployed_artifact_generation_verified, false);
assert.equal(predecessor.production_source_finality_authority_ready, false);
for (const artifactPath of PREDECESSOR_UNCHANGED) {
  const expected = EXPECTED_ARTIFACTS.find(row => row.path === artifactPath);
  assert.deepEqual(predecessor.artifacts.find(row => row.path === artifactPath), expected,
    "predecessor_common_artifact_drift:" + artifactPath);
}

for (const artifact of EXPECTED_ARTIFACTS) {
  const bytes = readPinned(artifact.path, 2 * 1024 * 1024);
  assert.equal(bytes.length, artifact.bytes, "artifact_bytes_drift:" + artifact.path);
  assert.equal(sha256(bytes), artifact.sha256, "artifact_sha256_drift:" + artifact.path);
}

const expectedLocked = structuredClone(evidence);
expectedLocked.compiled_artifact_generation_verified = true;
validateCandidate(expectedLocked, true);
const expectedLockedBytes = Buffer.from(JSON.stringify(expectedLocked, null, 2) + "\n");
assert.equal(expectedLockedBytes.length, EXPECTED_LOCKED_BYTES);
assert.equal(sha256(expectedLockedBytes), EXPECTED_LOCKED_SHA256);
assert.equal(gitBlobSha1(expectedLockedBytes), EXPECTED_LOCKED_GIT_BLOB_SHA1);

const manifestBytes = readPinned(MANIFEST_PATH, 64 * 1024);
assert.equal(manifestBytes.equals(expectedLockedBytes), true,
  "locked_v5_manifest_not_exact_one_bit_promotion");
const manifest = JSON.parse(manifestBytes.toString("utf8"));
validateCandidate(manifest, true);

const mutant = (edit, label, accepted = false) => {
  const copy = structuredClone(evidence);
  edit(copy);
  assert.throws(() => validateCandidate(copy, accepted), undefined, label);
};
mutant(v => { v.compiled_artifact_generation_verified = true; },
  "candidate_cannot_self_promote");
mutant(v => { v.deployed_artifact_generation_verified = true; },
  "candidate_cannot_claim_deployment");
mutant(v => { v.runtime_mount_authority = true; },
  "candidate_cannot_claim_runtime_mount");
mutant(v => { v.production_source_finality_authority_ready = true; },
  "candidate_cannot_claim_production_authority");
mutant(v => { v.artifacts[0].sha256 = "0".repeat(64); },
  "artifact_hash_mutation_rejected");
mutant(v => { v.reviewed_source_finality_v6_source_git_blob_sha1 = "0".repeat(40); },
  "source_identity_mutation_rejected");
mutant(v => { v.compiler.package_lock_git_blob_sha1 = "0".repeat(40); },
  "build_identity_mutation_rejected");
mutant(v => { v.artifacts.push(structuredClone(v.artifacts[0])); },
  "extra_artifact_rejected");

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--derive") {
  process.stdout.write(expectedLockedBytes);
} else {
  assert.equal(args.length, 0, "usage: proof [--derive]");
  console.log(MARKER + "_LOCKED_GREEN");
  console.log("candidate_evidence_sha256=" + EXPECTED_EVIDENCE_SHA256);
  console.log("candidate_evidence_git_blob_sha1=" + EXPECTED_EVIDENCE_GIT_BLOB_SHA1);
  console.log("compiled_artifact_generation_sha256=" +
    EXPECTED_COMPILED_GENERATION_SHA256);
  console.log("reviewed_source_files_sha256_v6=" + EXPECTED_REVIEWED_SOURCE_SHA256);
  console.log("reviewed_artifact_count=6");
  console.log("candidate_acceptance=false");
  console.log("compiled_artifact_generation_verified=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
}
