import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V3";
const SOURCE_STACK_HEAD =
  "2bd69ea3a29ed0adc195bd6f9a208e3276fde383";
const EXPECTED_TYPESCRIPT_VERSION = "5.9.3";
const MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v3.json";
const PREDECESSOR_MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v2.json";
const PREDECESSOR_MANIFEST_GIT_BLOB_SHA1 =
  "58883f0b48ec36fb8d5fc71df71000793928e9ed";
const PREDECESSOR_COMPILED_ARTIFACT_GENERATION_SHA256 =
  "420fdb1d2af44940db47bbba9873461337a6010002dc90b711e2753d808c2f9b";
const EXPECTED_VERIFIER_SOURCE_GIT_BLOB_SHA1 =
  "9ba679d52c74d5590558ccfdb5882597d79b9f31";
const EXPECTED_VERIFIER_ARTIFACT_BYTES = 8768;
const EXPECTED_VERIFIER_ARTIFACT_SHA256 =
  "babf9920062c0faec9ae525ea7c7557a77c2c5d9164c065fb1b3a31e395a8701";
const DERIVATION_NODE_MAJORS = Object.freeze([22, 24, 26]);
const EXPECTED_INPUT_BLOBS = Object.freeze({
  "package.json": "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  "package-lock.json": "b2671f0149f522b2489247016df0a5ec4bb72b8b",
  "tsconfig.build.json": "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
});
const ARTIFACT_PATHS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v5.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);
const REVIEWED_SOURCE_PATHS = Object.freeze([
  "src/economic/buy_void_source_finality_generation_provenance_v5.ts",
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
    fail("v3_reviewed_source_or_build_input_drift");
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
  if (
    verifier?.bytes !== EXPECTED_VERIFIER_ARTIFACT_BYTES ||
    verifier?.sha256 !== EXPECTED_VERIFIER_ARTIFACT_SHA256
  ) {
    fail("verified_payment_v2_artifact_identity_mismatch");
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
  const v5 = await import(
    "../dist/economic/buy_void_source_finality_generation_provenance_v5.js"
  );
  const reviewedSha =
    v5.VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_SOURCE_FILES_SHA256_V5;
  if (!/^[0-9a-f]{64}$/u.test(String(reviewedSha || ""))) {
    fail("reviewed_source_files_sha256_v5_invalid");
  }
  const generation = sha256(Buffer.from(canonical({
    marker: MARKER,
    source_stack_head: SOURCE_STACK_HEAD,
    typescript_version: EXPECTED_TYPESCRIPT_VERSION,
    reviewed_source_files_sha256_v5: reviewedSha,
    artifacts,
  }), "utf8"));
  return Object.freeze({
    schema: "void_buy_void_source_finality_compiled_artifact_attestation_v3",
    marker: MARKER,
    version: 3,
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
        "verified_payment_log_index_uint32_domain_and_reviewed_source_rollover_v5",
      changed_source_paths: Object.freeze([
        "src/economic/buy_void_source_finality_generation_provenance_v5.ts",
        "src/economic/buy_void_verified_payment_v2.ts",
      ]),
    }),
    reviewed_source_generation: Object.freeze({
      marker: "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V5",
      reviewed_source_files_sha256: reviewedSha,
      verified_source_file_count: 5,
    }),
    entry_artifact: ARTIFACT_PATHS[0],
    artifact_count: artifacts.length,
    artifacts,
    predecessor_unchanged_artifact_paths: PREDECESSOR_UNCHANGED_PATHS,
    changed_artifact_paths: Object.freeze([
      "dist/economic/buy_void_source_finality_generation_provenance_v5.js",
      "dist/economic/buy_void_verified_payment_v2.js",
    ]),
    predecessor_common_artifact_bytes_match: true,
    verified_payment_v2_source_git_blob_sha1:
      EXPECTED_VERIFIER_SOURCE_GIT_BLOB_SHA1,
    verified_payment_v2_artifact_sha256:
      EXPECTED_VERIFIER_ARTIFACT_SHA256,
    compiled_artifact_generation_sha256: generation,
    derivation_node_majors: DERIVATION_NODE_MAJORS,
    compiled_artifact_generation_verified: true,
    deployed_artifact_generation_verified: false,
    runtime_mount_authority: false,
    production_source_finality_authority_ready: false,
  });
}

const args = process.argv.slice(2);
const expected = await derive();
if (args.length === 1 && args[0] === "--derive") {
  process.stdout.write(JSON.stringify(expected, null, 2) + "\n");
} else {
  assert.equal(args.length, 0, "invalid arguments");
  const bytes = read(MANIFEST_PATH);
  const expectedBytes = Buffer.from(JSON.stringify(expected, null, 2) + "\n");
  if (!bytes.equals(expectedBytes)) {
    console.log(MARKER + "_DERIVATION_ONLY");
    console.log("candidate_manifest_json=" + JSON.stringify(expected));
    fail("compiled_artifact_attestation_v3_manifest_mismatch");
  }
  console.log(MARKER + "_LOCKED_GREEN");
  console.log("compiled_artifact_generation_sha256=" +
    expected.compiled_artifact_generation_sha256);
  console.log("reviewed_source_files_sha256_v5=" +
    expected.reviewed_source_generation.reviewed_source_files_sha256);
  console.log("verified_payment_v2_artifact_sha256=" +
    EXPECTED_VERIFIER_ARTIFACT_SHA256);
  console.log("production_source_finality_authority_ready=false");
}
