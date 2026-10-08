import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V4";
const SOURCE_STACK_HEAD =
  "27efd7400d95abc9f533c6c0158e6538ee8e2027";
const EXPECTED_TYPESCRIPT_VERSION = "5.9.3";
const MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4.json";
const PREDECESSOR_MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v3.json";
const PREDECESSOR_MANIFEST_GIT_BLOB_SHA1 =
  "d6e97784c5d8be93713e733628c7d1ef746bb5c7";
const PREDECESSOR_COMPILED_ARTIFACT_GENERATION_SHA256 =
  "0d36d26176a58cc24c2841c4363382749ccdcb2a93563989c27de36060354add";
const EXPECTED_VERIFIER_SOURCE_GIT_BLOB_SHA1 =
  "32133e441ccb02bb4786d29e36932fb31399ec87";
// Derive-only evidence. Verifier artifact SHA-256/byte count cannot be
// declared accepted until cross-Node review and a locked successor manifest.
const COMPILED_ARTIFACT_ATTESTATION_ACCEPTED_V4 = false;
const EXPECTED_V6_SOURCE_GIT_BLOB_SHA1 =
  "7306efd9b3fd9850dfab8e691a2fe000948aba98";
const DERIVATION_NODE_MAJORS = Object.freeze([22, 24, 26]);
const EXPECTED_INPUT_BLOBS = Object.freeze({
  "package.json": "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  "package-lock.json": "b2671f0149f522b2489247016df0a5ec4bb72b8b",
  "tsconfig.build.json": "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
});
const ARTIFACT_PATHS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);
const REVIEWED_SOURCE_PATHS = Object.freeze([
  "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
  "src/economic/buy_void_verified_payment_v2.ts",
]);
const PREDECESSOR_UNCHANGED_PATHS = Object.freeze([
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
]);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_BYTES = 2 * 1024 * 1024;

function fail(message) { throw new Error(message); }
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      key => JSON.stringify(key) + ":" + canonical(value[key]),
    ).join(",") + "}";
  }
  fail("non_canonical_value");
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
    .update(bytes).digest("hex");
}
function read(relativePath, maxBytes = MAX_BYTES) {
  const absolute = path.join(ROOT, relativePath);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() ||
      stat.size <= 0 || stat.size > maxBytes) {
    fail("invalid_file:" + relativePath);
  }
  const bytes = fs.readFileSync(absolute);
  if (bytes.length !== stat.size) fail("short_read:" + relativePath);
  return bytes;
}
function assertSourceStack() {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", SOURCE_STACK_HEAD, "HEAD"], {
      cwd: ROOT, stdio: "ignore",
    });
    execFileSync("git", [
      "diff", "--quiet", SOURCE_STACK_HEAD, "HEAD", "--",
      ...REVIEWED_SOURCE_PATHS,
      "tsconfig.build.json",
      "scripts/copy_void_runtime_js_v1.mjs",
      "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
    ], { cwd: ROOT, stdio: "ignore" });
  } catch {
    fail("v4_reviewed_source_or_build_input_drift");
  }
}
function verifyBuildInputs() {
  assertSourceStack();
  for (const [relativePath, expected] of Object.entries(EXPECTED_INPUT_BLOBS)) {
    const actual = gitBlobSha1(read(relativePath, 16 * 1024 * 1024));
    if (actual !== expected) fail("build_input_blob_mismatch:" + relativePath);
  }
  const verifierBlob = gitBlobSha1(read(
    "src/economic/buy_void_verified_payment_v2.ts",
  ));
  if (verifierBlob !== EXPECTED_VERIFIER_SOURCE_GIT_BLOB_SHA1) {
    fail("verified_payment_v2_source_blob_mismatch");
  }
  const v6Blob = gitBlobSha1(read(
    "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
  ));
  if (v6Blob !== EXPECTED_V6_SOURCE_GIT_BLOB_SHA1) {
    fail("reviewed_source_finality_v6_source_blob_mismatch");
  }
  const lock = JSON.parse(read("package-lock.json", 16 * 1024 * 1024));
  if (lock?.packages?.["node_modules/typescript"]?.version !==
      EXPECTED_TYPESCRIPT_VERSION) {
    fail("typescript_lock_version_mismatch");
  }
}
function imports(relativePath, source) {
  const out = new Set();
  for (const pattern of [
    /from\s+["'](\.\/[^"']+\.js)["']/gu,
    /import\s*\(\s*["'](\.\/[^"']+\.js)["']\s*\)/gu,
    /import\s+["'](\.\/[^"']+\.js)["']/gu,
  ]) {
    for (const match of source.matchAll(pattern)) {
      out.add(path.posix.normalize(
        path.posix.join(path.posix.dirname(relativePath), match[1]),
      ));
    }
  }
  return [...out].sort();
}
function deriveArtifacts() {
  const expected = new Set(ARTIFACT_PATHS);
  const graph = new Map();
  const records = [];
  for (const relativePath of ARTIFACT_PATHS) {
    const bytes = read(relativePath);
    const deps = imports(relativePath, bytes.toString("utf8"));
    for (const dep of deps) {
      if (!expected.has(dep)) fail("runtime_closure_escape:" + relativePath + ":" + dep);
    }
    graph.set(relativePath, deps);
    records.push(Object.freeze({
      path: relativePath,
      bytes: bytes.length,
      sha256: sha256(bytes),
    }));
  }
  const reachable = new Set();
  const pending = [ARTIFACT_PATHS[0]];
  while (pending.length) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    pending.push(...(graph.get(current) || []));
  }
  if (reachable.size !== expected.size ||
      [...expected].some(item => !reachable.has(item))) {
    fail("runtime_closure_reachability_mismatch");
  }
  const verifier = records.find(
    x => x.path === "dist/economic/buy_void_verified_payment_v2.js",
  );
  if (!verifier ||
      !Number.isSafeInteger(verifier.bytes) ||
      verifier.bytes <= 0 ||
      !/^[0-9a-f]{64}$/u.test(verifier.sha256)) {
    fail("verified_payment_v2_artifact_candidate_invalid");
  }
  return records;
}
function verifyPredecessor(artifacts) {
  const bytes = read(PREDECESSOR_MANIFEST_PATH);
  if (gitBlobSha1(bytes) !== PREDECESSOR_MANIFEST_GIT_BLOB_SHA1) {
    fail("predecessor_manifest_blob_mismatch");
  }
  const predecessor = JSON.parse(bytes.toString("utf8"));
  if (predecessor?.compiled_artifact_generation_sha256 !==
      PREDECESSOR_COMPILED_ARTIFACT_GENERATION_SHA256) {
    fail("predecessor_generation_mismatch");
  }
  for (const relativePath of PREDECESSOR_UNCHANGED_PATHS) {
    const before = predecessor.artifacts.find(x => x.path === relativePath);
    const after = artifacts.find(x => x.path === relativePath);
    if (!before || !after ||
        before.bytes !== after.bytes ||
        before.sha256 !== after.sha256) {
      fail("unexpected_predecessor_artifact_drift:" + relativePath);
    }
  }
  return Object.freeze({
    marker: predecessor.marker,
    manifest_path: PREDECESSOR_MANIFEST_PATH,
    manifest_git_blob_sha1: PREDECESSOR_MANIFEST_GIT_BLOB_SHA1,
    compiled_artifact_generation_sha256:
      PREDECESSOR_COMPILED_ARTIFACT_GENERATION_SHA256,
  });
}
async function derive() {
  if (!DERIVATION_NODE_MAJORS.includes(Number(process.versions.node.split(".")[0]))) {
    fail("unsupported_node_major");
  }
  verifyBuildInputs();
  const artifacts = deriveArtifacts();
  const predecessor = verifyPredecessor(artifacts);
  const v6 = await import(
    "../dist/economic/buy_void_source_finality_generation_provenance_v6.js"
  );
  const reviewedSha =
    v6.VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V6;
  if (!/^[0-9a-f]{64}$/u.test(String(reviewedSha || ""))) {
    fail("reviewed_source_files_sha256_v6_invalid");
  }
  const generation = sha256(Buffer.from(canonical({
    marker: MARKER,
    source_stack_head: SOURCE_STACK_HEAD,
    typescript_version: EXPECTED_TYPESCRIPT_VERSION,
    reviewed_source_files_sha256_v6: reviewedSha,
    artifacts,
  }), "utf8"));
  return Object.freeze({
    schema: "void_buy_void_source_finality_compiled_artifact_attestation_v4",
    marker: MARKER,
    version: 4,
    repository: "6ZoSo9/void-node",
    source_stack_head: SOURCE_STACK_HEAD,
    predecessor,
    compiler: Object.freeze({
      typescript_version: EXPECTED_TYPESCRIPT_VERSION,
      package_lock_git_blob_sha1: EXPECTED_INPUT_BLOBS["package-lock.json"],
    }),
    build: Object.freeze({
      command: "npm run build",
      package_json_git_blob_sha1: EXPECTED_INPUT_BLOBS["package.json"],
      tsconfig_build_git_blob_sha1: EXPECTED_INPUT_BLOBS["tsconfig.build.json"],
      source_finality_sources_changed: true,
      change_reason:
        "native_usdc_checkout_token_binding_and_source_finality_v6",
      changed_source_paths: Object.freeze([
        "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
        "src/economic/buy_void_verified_payment_v2.ts",
      ]),
    }),
    reviewed_source_generation: Object.freeze({
      marker: "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V6",
      reviewed_source_files_sha256: reviewedSha,
      verified_source_file_count: 5,
    }),
    entry_artifact: ARTIFACT_PATHS[0],
    artifact_count: artifacts.length,
    artifacts,
    predecessor_unchanged_artifact_paths: PREDECESSOR_UNCHANGED_PATHS,
    changed_artifact_paths: Object.freeze([
      "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
      "dist/economic/buy_void_verified_payment_v2.js",
    ]),
    predecessor_common_artifact_bytes_match: true,
    verified_payment_v2_source_git_blob_sha1:
      EXPECTED_VERIFIER_SOURCE_GIT_BLOB_SHA1,
    verified_payment_v2_artifact_sha256: artifacts.find(
      x => x.path === "dist/economic/buy_void_verified_payment_v2.js",
    ).sha256,
    reviewed_source_finality_v6_source_git_blob_sha1:
      EXPECTED_V6_SOURCE_GIT_BLOB_SHA1,
    compiled_artifact_generation_sha256: generation,
    derivation_node_majors: DERIVATION_NODE_MAJORS,
    compiled_artifact_generation_verified:
      COMPILED_ARTIFACT_ATTESTATION_ACCEPTED_V4,
    deployed_artifact_generation_verified: false,
    runtime_mount_authority: false,
    production_source_finality_authority_ready: false,
  });
}

// Candidate derivation only: no accepted manifest or compiled authority.
const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== "--derive") {
  fail("v4_candidate_derivation_only_not_locked_or_production_authority");
}
const candidate = await derive();
assert.equal(candidate.compiled_artifact_generation_verified, false);
assert.equal(candidate.deployed_artifact_generation_verified, false);
assert.equal(candidate.production_source_finality_authority_ready, false);
process.stdout.write(JSON.stringify(candidate, null, 2) + "\n");
