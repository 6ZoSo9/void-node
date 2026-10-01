#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1 =
  "composeReviewedFreshPublicReadAndFinalizedStateRootV1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_only_composition: true,
    canonical_git_source_binding_required: true,
    exact_dependency_git_blobs_required: true,
    public_read_promotion_reexecuted: true,
    canonical_state_root_import_promotion_reexecuted: true,
    migration_classifier_reexecuted: true,
    exact_scoped_candidate_merge_required: true,
    create_only_private_output: true,
    canonical_candidate_mutation: false,
    service_mutation: false,
    production_rpc_contact: false,
    network_call: false,
    credential_content_access: false,
    wallet_access: false,
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
const TOOL_REL = "tools/void-economic-epoch2-public-verification-composition-v1.mjs";
const REVIEWED_MAIN_ANCHOR =
  "2dcf6544f373f828347434fd0c6d434334af1658";
const GIT = "/usr/bin/git";
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2pre1_[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const MAX_PUBLIC_READ_BYTES = 4 * 1024 * 1024;
const MAX_MEMBERSHIP_BYTES = 1024 * 1024;

const LOOPBACK_REL =
  "ops/mainnet0/economic-epoch2-public-read-loopback-transport-v1.json";
const MIGRATION_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1 =
  Object.freeze({
    "tools/void-economic-epoch2-public-read-runtime-promotion-v1.mjs":
      "fe7849f9612cf8b17e307c1eb115a58457e5af4a",
    "tools/void-economic-epoch2-public-state-root-anchor-import-promotion-v1.mjs":
      "5f96e32291085af9072d74805acd34a17609b564",
    [LOOPBACK_REL]:
      "7482f36f97049b79072953e6ea0af7dbfb8968c8",
    [MIGRATION_REL]:
      "1457b8a0b060c4c515bf2232320af19f4e70dd35",
    "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json":
      "cd15adcccbc1620656df72ec75808cc4510e3fe1",
    "tools/void-economic-epoch2-public-state-root-anchor-admission-v1.mjs":
      "0e35fb0c8cdf3083d5be99ad98b7eb0c94f0ddaa",
    "tools/void-economic-evm-successor-migration-v1.mjs":
      "9f51b193da687669700c898ed587edf9040f6264",
    "tools/void-economic-epoch2-public-void-state-root-anchor-v1.mjs":
      "3f42b09a8d0861cc2c34056b85b410065ac43892",
    "tools/datanet-content-commitment-canonical-truth-admission-v1.mjs":
      "ee92747e3109e3b8940c1d8657d51c9a14fc961e",
    "tools/datanet-content-commitment-compiler-profile-v1.mjs":
      "d02d94a11f7f8df89c3e9886866dd4929147f2a1",
  });

const INPUT_KEYS = Object.freeze([
  "publicReadEvidenceBytes",
  "expectedPublicReadEvidenceSha256",
  "expectedPublicReadEvidenceId",
  "evaluationTimeUtc",
  "stateRootMembershipBytes",
  "expectedStateRootMembershipSha256",
  "expectedRegistryAddress",
  "expectedPublisherAddress",
  "reviewConfirmation",
]);

const GIT_ENV_BLOCKLIST = Object.freeze([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_REPLACE_REF_BASE",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_KEY_0",
  "GIT_CONFIG_VALUE_0",
]);

function fail(reason) {
  throw new Error(reason);
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
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

function sanitizedGitEnv() {
  const env = { ...process.env };
  for (const key of GIT_ENV_BLOCKLIST) delete env[key];
  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(key)) delete env[key];
  }
  return env;
}

function git(args, { allowFail = false } = {}) {
  const result = spawnSync(GIT, ["-C", ROOT, ...args], {
    env: sanitizedGitEnv(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) {
    fail("git_failed:" + args.join("_"));
  }
  return result;
}

function gitText(args, code, { allowEmpty = false } = {}) {
  const result = git(args);
  const text = String(result.stdout || "").trim();
  if (!allowEmpty && !text) fail(code);
  return text;
}

function canonicalRemote(value) {
  const text = String(value || "").trim();
  const accepted = new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]);
  if (!accepted.has(text)) fail("canonical_origin_required");
  return "https://github.com/6ZoSo9/void-node.git";
}

function readHeadBytes(relativePath) {
  const result = git(["show", "HEAD:" + relativePath]);
  return Buffer.from(result.stdout, "utf8");
}

function parseJsonBytes(bytes, label) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(label + "_json_invalid");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_object_required");
  }
  return value;
}

function assertBuffer(bytes, expectedSha, maxBytes, label) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 2 ||
    bytes.length > maxBytes
  ) {
    fail(label + "_bytes_invalid");
  }
  if (!HEX64.test(String(expectedSha || ""))) fail(label + "_sha256_invalid");
  if (sha256(bytes) !== expectedSha) fail(label + "_sha256_mismatch");
}

function canonicalAddress(value, label) {
  const text = String(value || "").toLowerCase();
  if (
    !ADDRESS.test(text) ||
    text === "0x0000000000000000000000000000000000000000"
  ) {
    fail(label + "_invalid");
  }
  return text;
}

function canonicalUtc(value) {
  const text = String(value || "");
  if (!UTC.test(text)) fail("evaluation_time_invalid");
  const ms = Date.parse(text);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== text.replace("Z", ".000Z")
  ) {
    fail("evaluation_time_invalid");
  }
  return text;
}

function assertClosedLaunchAuthority(candidate) {
  if (candidate?.launch_authority?.source_only !== true) {
    fail("migration_source_only_authority_required");
  }
  for (const [key, value] of Object.entries(candidate.launch_authority)) {
    if (key === "source_only") continue;
    if (value !== false) fail("migration_authority_open:" + key);
  }
}

function repositoryBindingV1() {
  if (fs.realpathSync.native(ROOT) !== ROOT) fail("repository_root_alias_forbidden");
  const status = gitText(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "repository_status_unavailable",
    { allowEmpty: true },
  );
  if (status !== "") fail("repository_not_clean");

  const head = gitText(["rev-parse", "HEAD"], "repository_head_unavailable");
  const tree = gitText(["rev-parse", "HEAD^{tree}"], "repository_tree_unavailable");
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("repository_identity_invalid");
  }
  const ancestry = git(
    ["merge-base", "--is-ancestor", REVIEWED_MAIN_ANCHOR, head],
    { allowFail: true },
  );
  if (ancestry.status !== 0) fail("reviewed_main_anchor_not_ancestor");

  const remote = canonicalRemote(
    gitText(["config", "--get", "remote.origin.url"], "origin_url_unavailable"),
  );

  const dependencies = {};
  for (const [relativePath, expectedBlob] of Object.entries(
    VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1,
  )) {
    const blob = gitText(
      ["rev-parse", "HEAD:" + relativePath],
      "dependency_blob_unavailable:" + relativePath,
    );
    if (blob !== expectedBlob) fail("dependency_blob_mismatch:" + relativePath);
    dependencies[relativePath] = blob;
  }

  const compositionToolBlob = gitText(
    ["rev-parse", "HEAD:" + TOOL_REL],
    "composition_tool_blob_unavailable",
  );
  if (!HEX40.test(compositionToolBlob)) fail("composition_tool_blob_invalid");

  const migrationBytes = readHeadBytes(MIGRATION_REL);
  const loopbackBytes = readHeadBytes(LOOPBACK_REL);

  return Object.freeze({
    source_head_sha: head,
    source_tree_sha: tree,
    canonical_remote_url: remote,
    reviewed_main_anchor: REVIEWED_MAIN_ANCHOR,
    composition_tool_git_blob_sha1: compositionToolBlob,
    dependency_git_blobs: Object.freeze({ ...dependencies }),
    canonical_migration_candidate_file_sha256: sha256(migrationBytes),
    canonical_loopback_policy_file_sha256: sha256(loopbackBytes),
    migration_bytes: migrationBytes,
    loopback_bytes: loopbackBytes,
  });
}

function publicReadResetToCanonical(candidate) {
  const reset = structuredClone(candidate);
  const verification = reset.public_verification;
  verification.public_balance_receipt_code_verification_ready = false;
  delete verification.public_balance_receipt_code_verification_evidence;
  delete verification.public_balance_receipt_code_verification_promotion;
  return reset;
}

function stateRootResetToCanonical(candidate) {
  const reset = structuredClone(candidate);
  reset.public_verification.successor_state_root_public_void_anchor_ready = false;
  return reset;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export async function composeVoidEconomicEpoch2PublicVerificationV1(input) {
  exactObject(input, INPUT_KEYS, "composition_input_keys_invalid");

  assertBuffer(
    input.publicReadEvidenceBytes,
    input.expectedPublicReadEvidenceSha256,
    MAX_PUBLIC_READ_BYTES,
    "public_read_evidence",
  );
  if (!EVIDENCE_ID.test(String(input.expectedPublicReadEvidenceId || ""))) {
    fail("public_read_evidence_id_invalid");
  }
  const evaluationTimeUtc = canonicalUtc(input.evaluationTimeUtc);

  assertBuffer(
    input.stateRootMembershipBytes,
    input.expectedStateRootMembershipSha256,
    MAX_MEMBERSHIP_BYTES,
    "state_root_membership",
  );
  const registry = canonicalAddress(
    input.expectedRegistryAddress,
    "registry_address",
  );
  const publisher = canonicalAddress(
    input.expectedPublisherAddress,
    "publisher_address",
  );

  const source = repositoryBindingV1();
  const canonicalMigration = parseJsonBytes(
    source.migration_bytes,
    "canonical_migration_candidate",
  );
  const canonicalLoopback = parseJsonBytes(
    source.loopback_bytes,
    "canonical_loopback_policy",
  );
  assertClosedLaunchAuthority(canonicalMigration);

  const publicReadModule = await import(
    pathToFileURL(
      path.join(ROOT, "tools/void-economic-epoch2-public-read-runtime-promotion-v1.mjs"),
    ).href + "?blob=" +
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1[
        "tools/void-economic-epoch2-public-read-runtime-promotion-v1.mjs"
      ]
  );
  const stateRootModule = await import(
    pathToFileURL(
      path.join(ROOT, "tools/void-economic-epoch2-public-state-root-anchor-import-promotion-v1.mjs"),
    ).href + "?blob=" +
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1[
        "tools/void-economic-epoch2-public-state-root-anchor-import-promotion-v1.mjs"
      ]
  );
  const classifierModule = await import(
    pathToFileURL(
      path.join(ROOT, "tools/void-economic-evm-successor-migration-v1.mjs"),
    ).href + "?blob=" +
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1[
        "tools/void-economic-evm-successor-migration-v1.mjs"
      ]
  );

  if (
    typeof publicReadModule.promoteVoidEconomicEpoch2PublicReadRuntimeV1 !==
      "function" ||
    typeof stateRootModule.promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1 !==
      "function" ||
    typeof classifierModule.classifyVoidEconomicEvmSuccessorMigrationV1 !==
      "function"
  ) {
    fail("reviewed_execution_exports_invalid");
  }

  if (
    input.reviewConfirmation !==
    stateRootModule
      .VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_IMPORT_CONFIRMATION_V1
  ) {
    fail("state_root_review_confirmation_invalid");
  }

  const publicRead =
    publicReadModule.promoteVoidEconomicEpoch2PublicReadRuntimeV1({
      evidenceBytes: input.publicReadEvidenceBytes,
      expectedFileSha256: input.expectedPublicReadEvidenceSha256,
      expectedEvidenceId: input.expectedPublicReadEvidenceId,
      evaluationTimeUtc,
      loopbackPolicy: canonicalLoopback,
      migrationCandidate: canonicalMigration,
    });

  if (
    publicRead?.promotion?.status !==
      "PUBLIC_ECONOMIC_READ_PATH_PROMOTED_STATE_ROOT_ANCHOR_HOLD" ||
    publicRead?.promotion?.gates
      ?.public_balance_receipt_code_verification_ready !== true ||
    publicRead?.promotion?.gates
      ?.successor_state_root_public_void_anchor_ready !== false ||
    publicRead?.promotion?.authority?.source_promotion_only !== true ||
    publicRead?.promotion?.authority?.migration_authorized !== false ||
    publicRead?.promotion?.authority?.public_activation_authorized !== false ||
    publicRead?.promotion?.authority?.funds_movement_authorized !== false
  ) {
    fail("public_read_promotion_invalid");
  }

  const publicReadCandidate = publicRead.updated_migration_candidate;
  if (
    canonicalJson(publicReadResetToCanonical(publicReadCandidate)) !==
    canonicalJson(canonicalMigration)
  ) {
    fail("public_read_candidate_delta_scope_invalid");
  }
  const publicReadClassification =
    classifierModule.classifyVoidEconomicEvmSuccessorMigrationV1(
      publicReadCandidate,
    );
  if (
    publicReadClassification?.status !== "HOLD" ||
    publicReadClassification?.reason !== "migration_gates_incomplete" ||
    canonicalJson(publicReadClassification.missing_gates) !==
      canonicalJson(["successor_state_root_public_void_anchor_required"])
  ) {
    fail("public_read_candidate_classifier_invalid");
  }

  const stateRoot =
    await stateRootModule.promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1({
      membershipBytes: input.stateRootMembershipBytes,
      expectedMembershipSha256: input.expectedStateRootMembershipSha256,
      expectedRegistryAddress: registry,
      expectedPublisherAddress: publisher,
      reviewConfirmation: input.reviewConfirmation,
    });

  if (
    stateRoot?.promotion?.verification
      ?.real_finalized_membership_import_verified !== true ||
    stateRoot?.promotion?.verification
      ?.successor_state_root_public_void_anchor_ready !== true ||
    stateRoot?.promotion?.verification?.migration_classifier_status !== "HOLD" ||
    canonicalJson(
      stateRoot?.promotion?.verification?.remaining_migration_gates,
    ) !== canonicalJson(["public_economic_verification_path_required"]) ||
    stateRoot?.promotion?.authority?.repository_mutation_authorized !== false ||
    stateRoot?.promotion?.authority?.migration_authorized !== false ||
    stateRoot?.promotion?.authority?.public_activation_authorized !== false ||
    stateRoot?.promotion?.authority?.funds_movement !== false
  ) {
    fail("state_root_import_promotion_invalid");
  }

  const stateRootCandidate = stateRoot.updated_migration_candidate;
  if (
    canonicalJson(stateRootResetToCanonical(stateRootCandidate)) !==
    canonicalJson(canonicalMigration)
  ) {
    fail("state_root_candidate_delta_scope_invalid");
  }

  const combined = structuredClone(publicReadCandidate);
  combined.public_verification.successor_state_root_public_void_anchor_ready =
    true;
  assertClosedLaunchAuthority(combined);

  const combinedFromStateRoot = structuredClone(stateRootCandidate);
  combinedFromStateRoot.public_verification
    .public_balance_receipt_code_verification_ready = true;
  combinedFromStateRoot.public_verification
    .public_balance_receipt_code_verification_evidence =
      publicReadCandidate.public_verification
        .public_balance_receipt_code_verification_evidence;
  combinedFromStateRoot.public_verification
    .public_balance_receipt_code_verification_promotion =
      publicReadCandidate.public_verification
        .public_balance_receipt_code_verification_promotion;

  if (
    canonicalJson(combinedFromStateRoot) !== canonicalJson(combined)
  ) {
    fail("independent_promotion_composition_mismatch");
  }

  const finalClassification =
    classifierModule.classifyVoidEconomicEvmSuccessorMigrationV1(combined);
  if (
    finalClassification?.ok !== true ||
    finalClassification?.status !== "SOURCE_READY" ||
    finalClassification?.migration_authorized !== false ||
    finalClassification?.public_activation_authorized !== false ||
    finalClassification?.money_movement_authorized !== false
  ) {
    fail("final_migration_classifier_not_source_ready");
  }

  const sourceAfter = repositoryBindingV1();
  const sourceBeforeComparable = structuredClone(source);
  const sourceAfterComparable = structuredClone(sourceAfter);
  delete sourceBeforeComparable.migration_bytes;
  delete sourceBeforeComparable.loopback_bytes;
  delete sourceAfterComparable.migration_bytes;
  delete sourceAfterComparable.loopback_bytes;
  if (
    canonicalJson(sourceBeforeComparable) !==
    canonicalJson(sourceAfterComparable)
  ) {
    fail("repository_source_changed_during_composition");
  }

  const sourceBinding = Object.freeze({
    source_head_sha: source.source_head_sha,
    source_tree_sha: source.source_tree_sha,
    canonical_remote_url: source.canonical_remote_url,
    reviewed_main_anchor: source.reviewed_main_anchor,
    composition_tool_git_blob_sha1: source.composition_tool_git_blob_sha1,
    dependency_git_blobs: source.dependency_git_blobs,
    canonical_migration_candidate_file_sha256:
      source.canonical_migration_candidate_file_sha256,
    canonical_loopback_policy_file_sha256:
      source.canonical_loopback_policy_file_sha256,
  });

  const combinedBytes = Buffer.from(canonicalJson(combined), "utf8");
  const material = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1,
    version: 1,
    status: "EPOCH2_PUBLIC_VERIFICATION_COMPOSED_SOURCE_READY",
    chain_id: 2050,
    execution_epoch: 2,
    source_binding: sourceBinding,
    public_read: Object.freeze({
      evidence_file_sha256: input.expectedPublicReadEvidenceSha256,
      evidence_id: input.expectedPublicReadEvidenceId,
      evaluation_time_utc: evaluationTimeUtc,
      promotion_status: publicRead.promotion.status,
      public_balance_receipt_code_verification_ready: true,
    }),
    state_root: Object.freeze({
      membership_file_sha256: input.expectedStateRootMembershipSha256,
      promotion_id: stateRoot.promotion.promotion_id,
      finalized_event_membership_id:
        stateRoot.promotion.reviewed_membership.finalized_event_membership_id,
      registry_address: registry,
      publisher_address: publisher,
      real_finalized_membership_import_verified: true,
      successor_state_root_public_void_anchor_ready: true,
    }),
    final_migration_candidate_sha256: sha256(combinedBytes),
    final_migration_classifier_status: "SOURCE_READY",
    remaining_migration_gates: Object.freeze([]),
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_AUTHORITY_V1,
  });

  const receipt = Object.freeze({
    ...material,
    composition_id:
      "voide2pvc1_" + sha256(Buffer.from(canonicalJson(material), "utf8")),
  });

  return Object.freeze({
    receipt,
    final_migration_candidate: deepFreeze(combined),
  });
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readExternalFile(file, maxBytes, label) {
  if (!file || !path.isAbsolute(file) || path.resolve(file) !== file) {
    fail(label + "_path_invalid");
  }
  const relative = path.relative(ROOT, file);
  if (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  ) {
    fail(label + "_must_be_outside_repository");
  }
  const real = fs.realpathSync.native(file);
  if (real !== file) fail(label + "_path_alias_forbidden");
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(label + "_file_invalid");
  if (stat.size < 2 || stat.size > maxBytes) fail(label + "_size_invalid");
  return fs.readFileSync(file);
}

function createPrivateOutputDir(outputDir) {
  if (
    !outputDir ||
    !path.isAbsolute(outputDir) ||
    path.resolve(outputDir) !== outputDir
  ) {
    fail("output_dir_invalid");
  }
  const relative = path.relative(ROOT, outputDir);
  if (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  ) {
    fail("output_dir_must_be_outside_repository");
  }
  const parent = path.dirname(outputDir);
  if (fs.realpathSync.native(parent) !== parent) fail("output_parent_alias_forbidden");
  if (fs.existsSync(outputDir)) fail("output_dir_exists");
  fs.mkdirSync(outputDir, { mode: 0o700 });
}

function writePrivateJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n");
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
  } finally {
    fs.closeSync(fd);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const publicReadPath = path.resolve(String(arg("--public-read-evidence") || ""));
    const membershipPath = path.resolve(String(arg("--state-root-membership") || ""));
    const outputDir = path.resolve(String(arg("--output-dir") || ""));
    const result = await composeVoidEconomicEpoch2PublicVerificationV1({
      publicReadEvidenceBytes: readExternalFile(
        publicReadPath,
        MAX_PUBLIC_READ_BYTES,
        "public_read_evidence",
      ),
      expectedPublicReadEvidenceSha256: String(
        arg("--expected-public-read-sha256") || "",
      ),
      expectedPublicReadEvidenceId: String(
        arg("--expected-public-read-evidence-id") || "",
      ),
      evaluationTimeUtc: String(arg("--evaluation-time-utc") || ""),
      stateRootMembershipBytes: readExternalFile(
        membershipPath,
        MAX_MEMBERSHIP_BYTES,
        "state_root_membership",
      ),
      expectedStateRootMembershipSha256: String(
        arg("--expected-membership-sha256") || "",
      ),
      expectedRegistryAddress: String(arg("--expected-registry-address") || ""),
      expectedPublisherAddress: String(arg("--expected-publisher-address") || ""),
      reviewConfirmation: String(arg("--confirmation") || ""),
    });
    createPrivateOutputDir(outputDir);
    writePrivateJson(
      path.join(outputDir, "economic-epoch2-public-verification-composition-v1.json"),
      result.receipt,
    );
    writePrivateJson(
      path.join(outputDir, "economic-evm-successor-migration-candidate-v1.json"),
      result.final_migration_candidate,
    );
    console.log(VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1);
    console.log("status=" + result.receipt.status);
    console.log("composition_id=" + result.receipt.composition_id);
    console.log("final_migration_classifier_status=SOURCE_READY");
    console.log("canonical_candidate_mutation=false");
    console.log("migration_activation=false");
    console.log("public_activation=false");
    console.log("funds_movement=false");
    console.log("output_dir=" + outputDir);
  } catch (error) {
    console.error(
      "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
