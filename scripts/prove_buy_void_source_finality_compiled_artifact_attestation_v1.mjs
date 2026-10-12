import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V1";
const SOURCE_STACK_HEAD = "9202f3ce11664873f2316b08cbdbe2b98fd77fb4";
const EXPECTED_TYPESCRIPT_VERSION = "5.9.3";
const MANIFEST_PATH = "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v1.json";
const DERIVATION_NODE_MAJORS = Object.freeze([22, 24, 26]);
const EXPECTED_INPUT_BLOBS = Object.freeze({
  "package.json": "f1887071e7cea9769fed4cf5090812bb4b782a0c",
  "package-lock.json": "b57e9018e9aee19340b4fe43d2282208116ec2f8",
  "tsconfig.build.json": "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
});

const ARTIFACT_PATHS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v4.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);

const REVIEWED_SOURCE_PATHS = Object.freeze([
  "src/economic/buy_void_source_finality_generation_provenance_v4.ts",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
  "src/economic/buy_void_verified_payment_v2.ts",
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

function fail(message) {
  throw new Error(message);
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  fail("non_canonical_value");
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function readRegularFile(relativePath, maxBytes = MAX_ARTIFACT_BYTES) {
  const absolute = path.join(ROOT, relativePath);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`not_regular_file:${relativePath}`);
  if (stat.size <= 0 || stat.size > maxBytes) fail(`invalid_file_size:${relativePath}`);
  const bytes = fs.readFileSync(absolute);
  if (bytes.length !== stat.size) fail(`short_read:${relativePath}`);
  return bytes;
}

function assertAttestedSourceClosureUnchanged() {
  if (REVIEWED_SOURCE_PATHS.length !== ARTIFACT_PATHS.length) {
    fail("reviewed_source_artifact_path_cardinality_mismatch");
  }
  for (let index = 0; index < ARTIFACT_PATHS.length; index += 1) {
    const expectedSourcePath = ARTIFACT_PATHS[index]
      .replace(/^dist\//, "src/")
      .replace(/\.js$/, ".ts");
    if (REVIEWED_SOURCE_PATHS[index] !== expectedSourcePath) {
      fail("reviewed_source_artifact_path_mapping_mismatch");
    }
  }

  try {
    execFileSync("git", ["merge-base", "--is-ancestor", SOURCE_STACK_HEAD, "HEAD"], {
      cwd: ROOT,
      stdio: "ignore",
    });
  } catch {
    fail("source_stack_head_not_ancestor");
  }

  const watched = [
    ...REVIEWED_SOURCE_PATHS,
    "package.json",
    "package-lock.json",
    "tsconfig.build.json",
    "scripts/copy_void_runtime_js_v1.mjs",
    "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
  ];
  try {
    execFileSync("git", ["diff", "--quiet", SOURCE_STACK_HEAD, "HEAD", "--", ...watched], {
      cwd: ROOT,
      stdio: "ignore",
    });
  } catch {
    fail("compiled_attested_source_closure_or_build_input_drift_from_reviewed_v4_head");
  }
}

function verifyBuildInputs() {
  assertAttestedSourceClosureUnchanged();

  for (const [relativePath, expectedBlob] of Object.entries(EXPECTED_INPUT_BLOBS)) {
    if (!SHA1.test(expectedBlob)) fail(`invalid_expected_blob:${relativePath}`);
    const bytes = readRegularFile(relativePath, 16 * 1024 * 1024);
    const actualBlob = gitBlobSha1(bytes);
    if (actualBlob !== expectedBlob) fail(`build_input_blob_mismatch:${relativePath}`);
  }

  const packageLock = JSON.parse(readRegularFile("package-lock.json", 16 * 1024 * 1024).toString("utf8"));
  const lockedTypeScript = packageLock?.packages?.["node_modules/typescript"]?.version;
  if (lockedTypeScript !== EXPECTED_TYPESCRIPT_VERSION) fail("typescript_lock_version_mismatch");

  const packageJson = JSON.parse(readRegularFile("package.json", 1024 * 1024).toString("utf8"));
  if (packageJson?.scripts?.build !== "tsc -p tsconfig.build.json && node scripts/copy_void_runtime_js_v1.mjs && node scripts/retire_saveblock_periodic_rewriters_v1.mjs") {
    fail("repository_build_command_mismatch");
  }

  return lockedTypeScript;
}

function relativeRuntimeImports(relativePath, source) {
  const imports = new Set();
  const patterns = [
    /from\s+["'](\.\/[^"']+\.js)["']/g,
    /import\s*\(\s*["'](\.\/[^"']+\.js)["']\s*\)/g,
    /import\s+["'](\.\/[^"']+\.js)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      imports.add(path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), match[1])));
    }
  }
  return [...imports].sort();
}

function deriveArtifactSet() {
  const expected = new Set(ARTIFACT_PATHS);
  const graph = new Map();
  const records = [];

  for (const relativePath of ARTIFACT_PATHS) {
    const bytes = readRegularFile(relativePath);
    const digest = sha256(bytes);
    if (!SHA256.test(digest)) fail(`invalid_sha256:${relativePath}`);
    const source = bytes.toString("utf8");
    const imports = relativeRuntimeImports(relativePath, source);
    for (const imported of imports) {
      if (!expected.has(imported)) fail(`runtime_closure_escape:${relativePath}:${imported}`);
    }
    graph.set(relativePath, imports);
    records.push(Object.freeze({
      path: relativePath,
      bytes: bytes.length,
      sha256: digest,
    }));
  }

  const entry = ARTIFACT_PATHS[0];
  const reachable = new Set();
  const pending = [entry];
  while (pending.length > 0) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const imported of graph.get(current) ?? []) pending.push(imported);
  }

  if (reachable.size !== expected.size || [...expected].some((item) => !reachable.has(item))) {
    fail("runtime_closure_cardinality_or_reachability_mismatch");
  }

  return records;
}

function expectedManifest(lockedTypeScript, artifacts, artifactSetSha256) {
  return Object.freeze({
    schema: "void_buy_void_source_finality_compiled_artifact_attestation_v1",
    marker: MARKER,
    version: 1,
    repository: "6ZoSo9/void-node",
    source_stack_head: SOURCE_STACK_HEAD,
    compiler: Object.freeze({
      typescript_version: lockedTypeScript,
      package_lock_git_blob_sha1: EXPECTED_INPUT_BLOBS["package-lock.json"],
    }),
    build: Object.freeze({
      command: "npm run build",
      package_json_git_blob_sha1: EXPECTED_INPUT_BLOBS["package.json"],
      tsconfig_build_git_blob_sha1: EXPECTED_INPUT_BLOBS["tsconfig.build.json"],
    }),
    entry_artifact: ARTIFACT_PATHS[0],
    artifact_count: artifacts.length,
    artifacts,
    compiled_artifact_set_sha256: artifactSetSha256,
    derivation_node_majors: DERIVATION_NODE_MAJORS,
    compiled_artifact_generation_verified: true,
    deployed_artifact_generation_verified: false,
    runtime_mount_authority: false,
    production_source_finality_authority_ready: false,
  });
}

function verifyManifest(expected) {
  const bytes = readRegularFile(MANIFEST_PATH, 1024 * 1024);
  const expectedBytes = Buffer.from(`${JSON.stringify(expected, null, 2)}\n`, "utf8");
  if (!bytes.equals(expectedBytes)) {
    console.log(`${MARKER}_DERIVATION_ONLY`);
    console.log(`node_major=${process.versions.node.split(".")[0]}`);
    console.log(`compiled_artifact_generation_verified=false`);
    console.log(`deployed_artifact_generation_verified=false`);
    console.log(`candidate_manifest_json=${JSON.stringify(expected)}`);
    fail("compiled_artifact_attestation_manifest_mismatch");
  }
  const parsed = JSON.parse(bytes.toString("utf8"));
  if (canonical(parsed) !== canonical(expected)) fail("compiled_artifact_attestation_manifest_noncanonical");
  return Object.freeze({ manifest: parsed, sha256: sha256(bytes) });
}

const lockedTypeScript = verifyBuildInputs();
const artifacts = deriveArtifactSet();
const artifactSetSha256 = sha256(Buffer.from(canonical({
  marker: MARKER,
  source_stack_head: SOURCE_STACK_HEAD,
  typescript_version: lockedTypeScript,
  artifacts,
}), "utf8"));
const expected = expectedManifest(lockedTypeScript, artifacts, artifactSetSha256);
const attestation = verifyManifest(expected);

console.log(`${MARKER}_LOCKED_GREEN`);
console.log(`node_major=${process.versions.node.split(".")[0]}`);
console.log(`typescript_version=${lockedTypeScript}`);
console.log(`artifact_count=${artifacts.length}`);
for (const artifact of artifacts) {
  console.log(`artifact=${artifact.path};bytes=${artifact.bytes};sha256=${artifact.sha256}`);
}
console.log(`compiled_artifact_set_sha256=${artifactSetSha256}`);
console.log(`manifest_path=${MANIFEST_PATH}`);
console.log(`manifest_sha256=${attestation.sha256}`);
console.log(`derivation_node_majors=${DERIVATION_NODE_MAJORS.join(",")}`);
console.log(`compiled_artifact_generation_verified=true`);
console.log(`deployed_artifact_generation_verified=false`);
console.log(`runtime_mount_authority=false`);
console.log(`production_source_finality_authority_ready=false`);
console.log(`artifact_manifest_json=${JSON.stringify(attestation.manifest)}`);
