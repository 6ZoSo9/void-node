import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_BUY_VOID_SOURCE_FINALITY_PACKAGED_COMPILED_ARTIFACT_ATTESTATION_V1";
const UPSTREAM_MARKER = "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V1";
const MANIFEST_PATH = "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v1.json";
const EXPECTED_MANIFEST_GIT_BLOB_SHA1 = "24ea833fbfacab1f38311e4e6d5f401625291882";
const ACCEPTED_1475_HEAD = "d4f6517968a0aaf8fd1fa0fe03aed9916dc553fd";
const ACCEPTED_1475_MERGE = "14036bdfd73cf439f492168c7fa0d67ed31cadf8";
const EXPECTED_COMPILED_ARTIFACT_SET_SHA256 =
  "98aaf70a7aa4e45a38e38ab5679a163f58be4211cb4fa81284e1596666ff00d3";
const EXPECTED_SOURCE_STACK_HEAD = "9202f3ce11664873f2316b08cbdbe2b98fd77fb4";
const EXPECTED_TYPESCRIPT_VERSION = "5.9.3";
const EXPECTED_ARTIFACT_PATHS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v4.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function fail(message) {
  throw new Error(`${MARKER}:${message}`);
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
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

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${code}:not_object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((entry, index) => entry !== wanted[index])) {
    fail(`${code}:shape_mismatch`);
  }
}

function readRegularFile(absolutePath, label, maxBytes = MAX_FILE_BYTES) {
  const stat = fs.lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`not_regular_file:${label}`);
  if (stat.size <= 0 || stat.size > maxBytes) fail(`invalid_file_size:${label}`);
  const bytes = fs.readFileSync(absolutePath);
  if (bytes.length !== stat.size) fail(`short_read:${label}`);
  return bytes;
}

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--packaged-root") {
    fail("usage:--packaged-root <extracted-stopped-container-root>");
  }
  const root = path.resolve(argv[1]);
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("packaged_root_not_directory");
  return root;
}

function verifyManifest() {
  const absolute = path.join(ROOT, MANIFEST_PATH);
  const bytes = readRegularFile(absolute, MANIFEST_PATH, 1024 * 1024);
  if (gitBlobSha1(bytes) !== EXPECTED_MANIFEST_GIT_BLOB_SHA1) {
    fail("upstream_manifest_git_blob_mismatch");
  }

  const manifest = JSON.parse(bytes.toString("utf8"));
  exactKeys(
    manifest,
    [
      "artifact_count",
      "artifacts",
      "build",
      "compiled_artifact_generation_verified",
      "compiled_artifact_set_sha256",
      "compiler",
      "deployed_artifact_generation_verified",
      "derivation_node_majors",
      "entry_artifact",
      "marker",
      "production_source_finality_authority_ready",
      "repository",
      "runtime_mount_authority",
      "schema",
      "source_stack_head",
      "version",
    ],
    "upstream_manifest",
  );

  if (
    manifest.schema !== "void_buy_void_source_finality_compiled_artifact_attestation_v1" ||
    manifest.marker !== UPSTREAM_MARKER ||
    manifest.version !== 1 ||
    manifest.repository !== "6ZoSo9/void-node" ||
    manifest.source_stack_head !== EXPECTED_SOURCE_STACK_HEAD ||
    manifest.compiler?.typescript_version !== EXPECTED_TYPESCRIPT_VERSION ||
    manifest.entry_artifact !== EXPECTED_ARTIFACT_PATHS[0] ||
    manifest.artifact_count !== EXPECTED_ARTIFACT_PATHS.length ||
    manifest.compiled_artifact_generation_verified !== true ||
    manifest.deployed_artifact_generation_verified !== false ||
    manifest.runtime_mount_authority !== false ||
    manifest.production_source_finality_authority_ready !== false
  ) {
    fail("upstream_manifest_semantic_mismatch");
  }

  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length !== EXPECTED_ARTIFACT_PATHS.length) {
    fail("upstream_manifest_artifact_count_mismatch");
  }

  const records = manifest.artifacts.map((artifact, index) => {
    exactKeys(artifact, ["bytes", "path", "sha256"], `artifact_${index}`);
    if (
      artifact.path !== EXPECTED_ARTIFACT_PATHS[index] ||
      !Number.isSafeInteger(artifact.bytes) ||
      artifact.bytes <= 0 ||
      artifact.bytes > MAX_FILE_BYTES ||
      typeof artifact.sha256 !== "string" ||
      !SHA256.test(artifact.sha256)
    ) {
      fail(`upstream_manifest_artifact_invalid:${index}`);
    }
    return Object.freeze({
      path: artifact.path,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
    });
  });

  const derivedSetSha256 = sha256(
    Buffer.from(
      canonical({
        marker: UPSTREAM_MARKER,
        source_stack_head: manifest.source_stack_head,
        typescript_version: manifest.compiler.typescript_version,
        artifacts: records,
      }),
      "utf8",
    ),
  );

  if (
    manifest.compiled_artifact_set_sha256 !== EXPECTED_COMPILED_ARTIFACT_SET_SHA256 ||
    derivedSetSha256 !== EXPECTED_COMPILED_ARTIFACT_SET_SHA256
  ) {
    fail("upstream_compiled_artifact_set_digest_mismatch");
  }

  return Object.freeze({ manifest, records, manifest_sha256: sha256(bytes) });
}

function verifyPackagedArtifacts(packagedRoot, upstream) {
  const packagedRecords = [];
  for (const expected of upstream.records) {
    const absolute = path.join(packagedRoot, ...expected.path.split("/"));
    const relative = path.relative(packagedRoot, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) fail(`artifact_path_escape:${expected.path}`);

    const bytes = readRegularFile(absolute, expected.path);
    const record = Object.freeze({
      path: expected.path,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
    if (record.bytes !== expected.bytes || record.sha256 !== expected.sha256) {
      fail(`packaged_artifact_identity_mismatch:${expected.path}`);
    }
    packagedRecords.push(record);
  }

  const packagedSetSha256 = sha256(
    Buffer.from(
      canonical({
        marker: UPSTREAM_MARKER,
        source_stack_head: upstream.manifest.source_stack_head,
        typescript_version: upstream.manifest.compiler.typescript_version,
        artifacts: packagedRecords,
      }),
      "utf8",
    ),
  );
  if (packagedSetSha256 !== EXPECTED_COMPILED_ARTIFACT_SET_SHA256) {
    fail("packaged_compiled_artifact_set_digest_mismatch");
  }
  return Object.freeze({ packagedRecords, packagedSetSha256 });
}

const packagedRoot = parseArgs(process.argv.slice(2));
const upstream = verifyManifest();
const packaged = verifyPackagedArtifacts(packagedRoot, upstream);

console.log(`${MARKER}_GREEN`);
console.log(`accepted_pr_1475_head=${ACCEPTED_1475_HEAD}`);
console.log(`accepted_pr_1475_merge=${ACCEPTED_1475_MERGE}`);
console.log(`upstream_manifest_git_blob_sha1=${EXPECTED_MANIFEST_GIT_BLOB_SHA1}`);
console.log(`upstream_manifest_sha256=${upstream.manifest_sha256}`);
console.log(`artifact_count=${packaged.packagedRecords.length}`);
for (const artifact of packaged.packagedRecords) {
  console.log(`artifact=${artifact.path};bytes=${artifact.bytes};sha256=${artifact.sha256}`);
}
console.log(`compiled_artifact_set_sha256=${packaged.packagedSetSha256}`);
console.log("compiled_artifact_generation_verified=true");
console.log("packaged_compiled_artifact_generation_verified=true");
console.log("container_started=false");
console.log("deployed_artifact_generation_verified=false");
console.log("runtime_mount_authority=false");
console.log("live_rpc_activation_authority=false");
console.log("production_source_finality_authority_ready=false");
console.log("chain2050_mutation_authority=false");
console.log("inventory_mutation_authority=false");
console.log("transaction_authority=false");
console.log("money_movement_authority=false");
