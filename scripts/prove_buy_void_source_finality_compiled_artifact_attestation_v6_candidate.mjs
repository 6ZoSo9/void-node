import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V6";
const SOURCE_STACK_HEAD =
  "22a30e3ffad6047a472488104c769140bd050878";
const EXPECTED_TYPESCRIPT_VERSION = "5.9.3";
const MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v6.json";
const PREDECESSOR_MANIFEST_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4.json";
const PREDECESSOR_MANIFEST_GIT_BLOB_SHA1 =
  "a07f2e9b03958a58280c4d940fe49097a9413af5";
const PREDECESSOR_COMPILED_ARTIFACT_GENERATION_SHA256 =
  "7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06";
const EXPECTED_VERIFIER_SOURCE_GIT_BLOB_SHA1 =
  "550ede02fc0b7d6874c324af58b5ef9c5591b311";
// Derive-only evidence. Verifier artifact SHA-256/byte count cannot be
// declared accepted until cross-Node review and a locked successor manifest.
const COMPILED_ARTIFACT_ATTESTATION_ACCEPTED_V6 = false;
const EXPECTED_V6_SOURCE_GIT_BLOB_SHA1 =
  "d371b1b08d2afc383d5e4ad831464752843791a3";
const DERIVATION_NODE_MAJORS = Object.freeze([22, 24, 26]);
const EXPECTED_INPUT_BLOBS = Object.freeze({
  "package.json": "14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
  "package-lock.json": "15b5c82ea36f13079a2f9e8863722f654eb3f201",
  "tsconfig.build.json": "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
});
const HISTORICAL_V5_CANDIDATE_SCRIPT =
  "scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v5_candidate.mjs";
const HISTORICAL_V5_CANDIDATE_SCRIPT_GIT_BLOB_SHA1 =
  "d63a2a2db2b4a80b200f065f6dbf973db31f3f2e";
const HISTORICAL_V5_PACKAGE_JSON_GIT_BLOB_SHA1 =
  "f28c3e9446c7623ef203da36a9642d046e5f34ee";
const HISTORICAL_V5_PACKAGE_LOCK_GIT_BLOB_SHA1 =
  "b2671f0149f522b2489247016df0a5ec4bb72b8b";
const HISTORICAL_V5_CANDIDATE_GENERATION_SHA256 =
  "18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c";
const REVIEWED_PACKAGE_PROFILE_PATH =
  "ops/security/reviewed-node-package-runtime-ethers-v2.json";
const REVIEWED_PACKAGE_PROFILE_GIT_BLOB_SHA1 =
  "a09f47596fdf66afef64e82200f23966664a7d2c";
const REVIEWED_PACKAGE_PROFILE_ID =
  "voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451";
const REVIEWED_PACKAGE_AGGREGATE_SHA256 =
  "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";
const DEPENDENCY_EQUIVALENCE_PROOF_PATH =
  "scripts/prove_buy_void_source_finality_dependency_build_equivalence_v1.mjs";
const DEPENDENCY_EQUIVALENCE_PROOF_GIT_BLOB_SHA1 =
  "d8dcdd6c4b363f25e539b2d7dd9967f05c6dd183";
const REVIEWED_PACKAGE_V2_PROOF_PATH =
  "scripts/prove_void_reviewed_node_package_runtime_v2.mjs";
const REVIEWED_PACKAGE_V2_PROOF_GIT_BLOB_SHA1 =
  "534939ec04a02ad612079dc7f5f0aad5f9355956";
const DEPENDENCY_EQUIVALENCE_RECEIPT_SHA256 =
  "3e3714b3b5674d9dbf1356f523de9e969d50bfb1065a719435733f25336c6b56";
const ARTIFACT_PATHS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);
const EXPECTED_EQUIVALENT_ARTIFACTS = Object.freeze([
  Object.freeze({path:"dist/economic/buy_void_source_finality_generation_provenance_v6.js",bytes:15937,sha256:"1994ebb8ca3b6152a44fc5527f120f418c48f6c262911e4f0e9c9d54aee87fec"}),
  Object.freeze({path:"dist/economic/buy_void_source_finality_authenticated_composition_v3.js",bytes:18892,sha256:"0d023868f4a4ab95fe1276c8d1a7e891dd5c419844e0ed2aac8d3bce15b72f42"}),
  Object.freeze({path:"dist/economic/buy_void_source_finality_authority_v2.js",bytes:19002,sha256:"239bfb3a8c0d2fa986986e961512660c6212818aa5769753d90f592490502c4b"}),
  Object.freeze({path:"dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",bytes:19804,sha256:"3c5bb3d9952d1b5a537e74ebb759320d1c134c6a9b49dd242edb41c23cab7fe2"}),
  Object.freeze({path:"dist/economic/buy_void_payment_rpc_observer_v1.js",bytes:15167,sha256:"9f4f5ee85972777e639dea89abf0c8337576525335ed982be3eb1bfe86c93db3"}),
  Object.freeze({path:"dist/economic/buy_void_verified_payment_v2.js",bytes:19594,sha256:"619177302a195bacd424c9e49f93b15108946fa52cc5b1b4c15829ac32f5c2e6"}),
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
// This candidate reader is a source-/artifact-identity boundary: it must
// not accept a different same-size inode or buffer unbounded concurrent growth.
function sameFileIdentity(a, b) {
  return a.dev === b.dev &&
    a.ino === b.ino &&
    a.mode === b.mode &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs;
}
function readPinnedFile(absolute, relativePath, maxBytes = MAX_BYTES) {
  if (!Number.isSafeInteger(maxBytes) ||
      maxBytes < 1 || maxBytes > 16 * 1024 * 1024) {
    fail("invalid_read_limit:" + relativePath);
  }
  const noFollow = fs.constants.O_NOFOLLOW;
  if (typeof noFollow !== "number" || noFollow <= 0) {
    fail("source_nofollow_unavailable:" + relativePath);
  }
  let fd = null;
  try {
    const visibleBefore = fs.lstatSync(absolute);
    if (!visibleBefore.isFile() || visibleBefore.isSymbolicLink() ||
        visibleBefore.nlink !== 1 || visibleBefore.size <= 0 ||
        visibleBefore.size > maxBytes) {
      fail("invalid_file:" + relativePath);
    }
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 ||
        before.size <= 0 || before.size > maxBytes) {
      fail("invalid_descriptor:" + relativePath);
    }
    if (!sameFileIdentity(visibleBefore, before)) {
      fail("path_fd_mismatch_before_read:" + relativePath);
    }
    // One extra sentinel byte detects file growth after the pinned fstat.
    // An expected 6-byte file can never force a 3-MiB read allocation.
    const cap = before.size + 1;
    const buffer = Buffer.alloc(cap);
    let total = 0;
    while (total < cap) {
      const n = fs.readSync(fd, buffer, total, cap - total, total);
      if (n === 0) break;
      total += n;
    }
    if (total > before.size) {
      fail("file_read_exceeds_pinned_bound:" + relativePath);
    }
    if (total !== before.size) {
      fail("short_read:" + relativePath);
    }
    const after = fs.fstatSync(fd);
    if (!sameFileIdentity(before, after)) {
      fail("descriptor_changed_after_read:" + relativePath);
    }
    const visibleAfter = fs.lstatSync(absolute);
    if (!visibleAfter.isFile() || visibleAfter.isSymbolicLink() ||
        !sameFileIdentity(visibleAfter, after)) {
      fail("visible_path_changed_after_read:" + relativePath);
    }
    return buffer.subarray(0, total);
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}
function read(relativePath, maxBytes = MAX_BYTES) {
  return readPinnedFile(path.join(ROOT, relativePath), relativePath, maxBytes);
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
    fail("v6_reviewed_source_or_build_input_drift");
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

  const historicalV5Bytes = read(HISTORICAL_V5_CANDIDATE_SCRIPT, 256 * 1024);
  if (gitBlobSha1(historicalV5Bytes) !==
      HISTORICAL_V5_CANDIDATE_SCRIPT_GIT_BLOB_SHA1) {
    fail("historical_v5_candidate_script_blob_mismatch");
  }
  const equivalenceProofBytes = read(DEPENDENCY_EQUIVALENCE_PROOF_PATH, 256 * 1024);
  if (gitBlobSha1(equivalenceProofBytes) !==
      DEPENDENCY_EQUIVALENCE_PROOF_GIT_BLOB_SHA1) {
    fail("dependency_equivalence_proof_blob_mismatch");
  }
  const packageV2ProofBytes = read(REVIEWED_PACKAGE_V2_PROOF_PATH, 256 * 1024);
  if (gitBlobSha1(packageV2ProofBytes) !== REVIEWED_PACKAGE_V2_PROOF_GIT_BLOB_SHA1) {
    fail("reviewed_package_v2_proof_blob_mismatch");
  }
  const profileBytes = read(REVIEWED_PACKAGE_PROFILE_PATH, 2 * 1024 * 1024);
  if (gitBlobSha1(profileBytes) !== REVIEWED_PACKAGE_PROFILE_GIT_BLOB_SHA1) {
    fail("reviewed_package_profile_blob_mismatch");
  }
  const profile = JSON.parse(profileBytes.toString("utf8"));
  if (profile?.status !== "REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE" ||
      profile?.profile_id !== REVIEWED_PACKAGE_PROFILE_ID ||
      profile?.packages_aggregate_sha256 !== REVIEWED_PACKAGE_AGGREGATE_SHA256 ||
      profile?.package_json_source?.git_blob_sha1 !== EXPECTED_INPUT_BLOBS["package.json"] ||
      profile?.package_lock_source?.git_blob_sha1 !== EXPECTED_INPUT_BLOBS["package-lock.json"] ||
      profile?.package_count !== 9 ||
      JSON.stringify(profile?.root_packages) !== JSON.stringify(["ethers"])) {
    fail("reviewed_package_profile_identity_mismatch");
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
  assert.deepEqual(
    artifacts,
    EXPECTED_EQUIVALENT_ARTIFACTS,
    "audited_dependency_compiled_artifact_drift",
  );
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
    package_json_git_blob_sha1: EXPECTED_INPUT_BLOBS["package.json"],
    package_lock_git_blob_sha1: EXPECTED_INPUT_BLOBS["package-lock.json"],
    reviewed_package_profile_id: REVIEWED_PACKAGE_PROFILE_ID,
    reviewed_package_packages_aggregate_sha256: REVIEWED_PACKAGE_AGGREGATE_SHA256,
    artifacts,
  }), "utf8"));
  return Object.freeze({
    schema: "void_buy_void_source_finality_compiled_artifact_attestation_v6",
    marker: MARKER,
    version: 6,
    repository: "6ZoSo9/void-node",
    source_stack_head: SOURCE_STACK_HEAD,
    predecessor,
    historical_unaccepted_v5_candidate: Object.freeze({
      candidate_script_path: HISTORICAL_V5_CANDIDATE_SCRIPT,
      candidate_script_git_blob_sha1: HISTORICAL_V5_CANDIDATE_SCRIPT_GIT_BLOB_SHA1,
      package_json_git_blob_sha1: HISTORICAL_V5_PACKAGE_JSON_GIT_BLOB_SHA1,
      package_lock_git_blob_sha1: HISTORICAL_V5_PACKAGE_LOCK_GIT_BLOB_SHA1,
      candidate_generation_sha256: HISTORICAL_V5_CANDIDATE_GENERATION_SHA256,
      candidate_accepted: false,
    }),
    reviewed_package_runtime: Object.freeze({
      profile_path: REVIEWED_PACKAGE_PROFILE_PATH,
      profile_git_blob_sha1: REVIEWED_PACKAGE_PROFILE_GIT_BLOB_SHA1,
      profile_id: REVIEWED_PACKAGE_PROFILE_ID,
      packages_aggregate_sha256: REVIEWED_PACKAGE_AGGREGATE_SHA256,
      dependency_equivalence_proof_path: DEPENDENCY_EQUIVALENCE_PROOF_PATH,
      dependency_equivalence_proof_git_blob_sha1:
        DEPENDENCY_EQUIVALENCE_PROOF_GIT_BLOB_SHA1,
      dependency_equivalence_receipt_sha256:
        DEPENDENCY_EQUIVALENCE_RECEIPT_SHA256,
    }),
    compiler: Object.freeze({
      typescript_version: EXPECTED_TYPESCRIPT_VERSION,
      package_lock_git_blob_sha1: EXPECTED_INPUT_BLOBS["package-lock.json"],
    }),
    build: Object.freeze({
      command: "npm run build",
      package_json_git_blob_sha1: EXPECTED_INPUT_BLOBS["package.json"],
      tsconfig_build_git_blob_sha1: EXPECTED_INPUT_BLOBS["tsconfig.build.json"],
      source_finality_sources_changed: true,
      dependency_generation_changed: true,
      compiled_artifact_bytes_match_dependency_equivalence_receipt: true,
      change_reason:
        "audited_dependency_generation_with_compiled_byte_equivalence",
      changed_source_paths: Object.freeze([
        "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
        "src/economic/buy_void_payment_rpc_observer_v1.ts",
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
      "dist/economic/buy_void_payment_rpc_observer_v1.js",
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
      COMPILED_ARTIFACT_ATTESTATION_ACCEPTED_V6,
    deployed_artifact_generation_verified: false,
    runtime_mount_authority: false,
    production_source_finality_authority_ready: false,
  });
}

// Synthetic input files live exclusively in OS temporary storage. The
// production checkout, V3 manifest, private data and runtime are never changed.
function provePinnedReaderAdversaries() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "void-v4-read-fault-"));
  const file = path.join(dir, "fixture.bin");
  const displaced = path.join(dir, "displaced.bin");
  const expected = Buffer.from("SAFE!!");
  const mutated = Buffer.from("EVIL!!");
  const clean = () => {
    fs.rmSync(file, { force: true });
    fs.rmSync(displaced, { force: true });
    fs.writeFileSync(file, expected, { mode: 0o600 });
  };
  try {
    clean();
    assert.equal(readPinnedFile(file, "synthetic", 64).toString(), "SAFE!!");
    // Substitute a different same-sized inode *between* first lstat and open.
    const originalOpen = fs.openSync;
    try {
      let swapped = false;
      fs.openSync = (...args) => {
        if (args[0] === file && !swapped) {
          swapped = true;
          fs.renameSync(file, displaced);
          fs.writeFileSync(file, mutated, { mode: 0o600 });
        }
        return originalOpen(...args);
      };
      assert.throws(
        () => readPinnedFile(file, "synthetic", 64),
        /path_fd_mismatch_before_read:synthetic/u,
      );
      assert.equal(swapped, true);
    } finally {
      fs.openSync = originalOpen;
    }

    clean();
    // Keep a correct old fd but replace the pathname just before postread
    // lstat, which must not validate the digest of a stale opened inode.
    const originalLstat = fs.lstatSync;
    try {
      let visits = 0;
      fs.lstatSync = (...args) => {
        if (args[0] === file && ++visits === 2) {
          fs.renameSync(file, displaced);
          fs.writeFileSync(file, mutated, { mode: 0o600 });
        }
        return originalLstat(...args);
      };
      assert.throws(
        () => readPinnedFile(file, "synthetic", 64),
        /visible_path_changed_after_read:synthetic/u,
      );
      assert.equal(visits, 2);
    } finally {
      fs.lstatSync = originalLstat;
    }

    clean();
    // Grow the file by 3 MiB when the first retained-fd read is attempted.
    // The six-byte preflight admits at most seven bytes into memory.
    const originalRead = fs.readSync;
    try {
      let totalRead = 0;
      let maxBuffer = 0;
      let grew = false;
      fs.readSync = (fd, buffer, offset, length, position) => {
        if (!grew) {
          grew = true;
          fs.appendFileSync(file, Buffer.alloc(3 * 1024 * 1024, 0x61));
        }
        maxBuffer = Math.max(maxBuffer, buffer.length);
        const n = originalRead(fd, buffer, offset, length, position);
        totalRead += n;
        return n;
      };
      assert.throws(
        () => readPinnedFile(file, "synthetic", 64),
        /file_read_exceeds_pinned_bound:synthetic/u,
      );
      assert.equal(grew, true);
      assert.equal(totalRead, expected.length + 1);
      assert.equal(maxBuffer, expected.length + 1);
    } finally {
      fs.readSync = originalRead;
    }

    clean();
    assert.equal(readPinnedFile(file, "synthetic", 64).toString(), "SAFE!!");
    console.log("V6_CANDIDATE_DESCRIPTOR_BINDING_AND_BOUNDED_READ_GREEN");
    console.log("same_size_path_replacement_rejected=true");
    console.log("postread_visible_path_replacement_rejected=true");
    console.log("concurrent_growth_read_bytes_at_most_pinned_plus_one=true");
    console.log("restored_source_accepted=true");
    console.log("production_artifact_acceptance=false");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Candidate derivation only: no accepted manifest or compiled authority.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--self-test") {
  provePinnedReaderAdversaries();
  process.exit(0);
}
if (args.length !== 1 || args[0] !== "--derive") {
  fail("v6_candidate_derivation_only_not_locked_or_production_authority");
}
const candidate = await derive();
assert.equal(candidate.compiled_artifact_generation_verified, false);
assert.equal(candidate.deployed_artifact_generation_verified, false);
assert.equal(candidate.production_source_finality_authority_ready, false);
process.stdout.write(JSON.stringify(candidate, null, 2) + "\n");
