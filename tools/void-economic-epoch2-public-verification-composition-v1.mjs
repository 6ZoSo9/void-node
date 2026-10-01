#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_CONFIRMATION_V1 =
  "composeReviewedFreshPublicReadAndFinalizedStateRootV1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_only_composition: true,
    external_evidence_read: true,
    reviewed_source_filesystem_read: true,
    git_repository_identity_read: true,
    clean_worktree_required: true,
    public_read_promotion_rederived: true,
    state_root_admission_rederived: true,
    migration_classifier_rederived: true,
    candidate_copy_only: true,
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
const REVIEWED_MAIN = "1e9bdf0f3074d321bc6689530e0d999b3dcd8840";
const SHA256 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voide2pre1_[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const MAX_EXTERNAL_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

const LOOPBACK_REL =
  "ops/mainnet0/economic-epoch2-public-read-loopback-transport-v1.json";
const MIGRATION_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const ANCHOR_REL =
  "public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json";

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
    [ANCHOR_REL]:
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
  "stateRootMembershipBytes",
  "expectedStateRootMembershipSha256",
  "expectedRegistryAddress",
  "expectedPublisherAddress",
  "reviewConfirmation",
]);

function fail(reason) {
  throw new Error(reason);
}

function exactOwnData(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  let proto;
  let descriptors;
  try {
    proto = Object.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    fail(code);
  }
  if (proto !== Object.prototype && proto !== null) fail(code);
  const own = Reflect.ownKeys(descriptors);
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key))
  ) fail(code);
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) fail(code);
    out[key] = descriptor.value;
  }
  return out;
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonical(value[key]),
    ).join(",") +
    "}"
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function gitRead(args, code) {
  const result = spawnSync(
    "git",
    ["-C", ROOT, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    },
  );
  if (result.status !== 0) fail(code);
  return String(result.stdout || "").trim();
}

function requireCleanReviewedRepositoryV1() {
  if (
    gitRead(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "composition_repository_status_unavailable",
    ) !== ""
  ) {
    fail("composition_repository_worktree_not_clean");
  }
  const head = gitRead(["rev-parse", "HEAD"], "composition_repository_head_unavailable");
  const tree = gitRead(
    ["rev-parse", "HEAD^{tree}"],
    "composition_repository_tree_unavailable",
  );
  const ancestor = spawnSync(
    "git",
    ["-C", ROOT, "merge-base", "--is-ancestor", REVIEWED_MAIN, "HEAD"],
    {
      stdio: ["ignore", "ignore", "ignore"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    },
  );
  if (ancestor.status !== 0) {
    fail("composition_reviewed_main_not_ancestor_of_head");
  }

  for (const [relativePath, expectedBlob] of
    Object.entries(VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1)) {
    const reviewed = gitRead(
      ["rev-parse", `${REVIEWED_MAIN}:${relativePath}`],
      "composition_reviewed_source_blob_unavailable:" + relativePath,
    );
    const current = gitRead(
      ["rev-parse", `HEAD:${relativePath}`],
      "composition_head_source_blob_unavailable:" + relativePath,
    );
    if (reviewed !== expectedBlob || current !== expectedBlob) {
      fail("composition_reviewed_source_blob_mismatch:" + relativePath);
    }
  }

  return Object.freeze({
    repository_head_sha: head,
    repository_tree_sha: tree,
  });
}

function readReviewedSource(relativePath, maxBytes = MAX_SOURCE_BYTES) {
  const expected =
    VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1[
      relativePath
    ];
  if (!expected) fail("composition_unreviewed_source_path:" + relativePath);
  const file = path.resolve(ROOT, relativePath);
  let real;
  try {
    real = fs.realpathSync.native(file);
  } catch {
    fail("composition_source_path_unavailable:" + relativePath);
  }
  if (real !== file) fail("composition_source_path_alias_forbidden:" + relativePath);
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size < 2 || before.size > maxBytes) {
      fail("composition_source_file_invalid:" + relativePath);
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail("composition_source_short_read:" + relativePath);
      offset += count;
    }
    if (fs.readSync(fd, Buffer.alloc(1), 0, 1, bytes.length) !== 0) {
      fail("composition_source_grew_during_read:" + relativePath);
    }
    const after = fs.fstatSync(fd);
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs ||
      gitBlobSha1(bytes) !== expected
    ) {
      fail("composition_source_changed_or_mismatched:" + relativePath);
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function parseJsonBytes(bytes, code) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_EXTERNAL_BYTES) {
    fail(code + "_bytes_invalid");
  }
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail(code + "_json_invalid");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code + "_object_required");
  }
  return value;
}

function canonicalUtcNow() {
  const ms = Date.now();
  if (!Number.isSafeInteger(ms) || ms < 0) fail("composition_clock_invalid");
  return new Date(Math.floor(ms / 1000) * 1000)
    .toISOString()
    .replace(".000Z", "Z");
}

function address(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!ADDRESS.test(lower) || lower === "0x" + "0".repeat(40)) fail(code);
  return lower;
}

function assertAuthorityClosed(candidate) {
  if (candidate?.launch_authority?.source_only !== true) {
    fail("composition_migration_source_only_authority_required");
  }
  for (const [key, value] of Object.entries(candidate.launch_authority)) {
    if (key === "source_only") continue;
    if (value !== false) fail("composition_migration_authority_open:" + key);
  }
}

function exactDeltaOnlyStateRoot(before, after) {
  const reset = structuredClone(after);
  reset.public_verification.successor_state_root_public_void_anchor_ready = false;
  if (canonical(reset) !== canonical(before)) {
    fail("composition_state_root_delta_scope_invalid");
  }
}

async function loadReviewedModulesV1() {
  const publicRead = await import(
    new URL(
      "./void-economic-epoch2-public-read-runtime-promotion-v1.mjs?reviewed=" +
        VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1[
          "tools/void-economic-epoch2-public-read-runtime-promotion-v1.mjs"
        ],
      import.meta.url,
    ).href
  );
  const stateRootAdmission = await import(
    new URL(
      "./void-economic-epoch2-public-state-root-anchor-admission-v1.mjs?reviewed=" +
        VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1[
          "tools/void-economic-epoch2-public-state-root-anchor-admission-v1.mjs"
        ],
      import.meta.url,
    ).href
  );
  const classifier = await import(
    new URL(
      "./void-economic-evm-successor-migration-v1.mjs?reviewed=" +
        VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1[
          "tools/void-economic-evm-successor-migration-v1.mjs"
        ],
      import.meta.url,
    ).href
  );
  if (
    typeof publicRead.promoteVoidEconomicEpoch2PublicReadRuntimeV1 !== "function" ||
    typeof stateRootAdmission
      .verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1 !== "function" ||
    typeof classifier.classifyVoidEconomicEvmSuccessorMigrationV1 !== "function"
  ) {
    fail("composition_reviewed_module_exports_invalid");
  }
  return Object.freeze({
    promotePublicRead: publicRead.promoteVoidEconomicEpoch2PublicReadRuntimeV1,
    verifyStateRoot:
      stateRootAdmission.verifyEconomicEpoch2PublicStateRootAnchorAdmissionCandidateV1,
    classifyMigration: classifier.classifyVoidEconomicEvmSuccessorMigrationV1,
  });
}

export async function composeVoidEconomicEpoch2PublicVerificationV1(input) {
  const request = exactOwnData(
    input,
    INPUT_KEYS,
    "composition_input_shape_invalid",
  );

  if (
    !Buffer.isBuffer(request.publicReadEvidenceBytes) ||
    !Buffer.isBuffer(request.stateRootMembershipBytes) ||
    typeof request.expectedPublicReadEvidenceSha256 !== "string" ||
    !SHA256.test(request.expectedPublicReadEvidenceSha256) ||
    typeof request.expectedPublicReadEvidenceId !== "string" ||
    !EVIDENCE_ID.test(request.expectedPublicReadEvidenceId) ||
    typeof request.expectedStateRootMembershipSha256 !== "string" ||
    !SHA256.test(request.expectedStateRootMembershipSha256) ||
    request.reviewConfirmation !==
      "importReviewedRealFinalizedStateRootMembershipV1"
  ) {
    fail("composition_external_evidence_metadata_invalid");
  }

  const registry = address(
    request.expectedRegistryAddress,
    "composition_registry_address_invalid",
  );
  const publisher = address(
    request.expectedPublisherAddress,
    "composition_publisher_address_invalid",
  );

  if (sha256(request.publicReadEvidenceBytes) !==
      request.expectedPublicReadEvidenceSha256) {
    fail("composition_public_read_evidence_sha256_mismatch");
  }
  if (sha256(request.stateRootMembershipBytes) !==
      request.expectedStateRootMembershipSha256) {
    fail("composition_state_root_membership_sha256_mismatch");
  }

  const repositoryBefore = requireCleanReviewedRepositoryV1();

  const loopbackBytes = readReviewedSource(LOOPBACK_REL);
  const migrationBytes = readReviewedSource(MIGRATION_REL);
  const anchorBytes = readReviewedSource(ANCHOR_REL);
  const loopback = parseJsonBytes(loopbackBytes, "composition_loopback_policy");
  const migration = parseJsonBytes(migrationBytes, "composition_migration_candidate");
  const membership = parseJsonBytes(
    request.stateRootMembershipBytes,
    "composition_state_root_membership",
  );
  assertAuthorityClosed(migration);

  const modules = await loadReviewedModulesV1();
  const evaluationTimeUtc = canonicalUtcNow();

  const publicRead = modules.promotePublicRead({
    evidenceBytes: request.publicReadEvidenceBytes,
    expectedFileSha256: request.expectedPublicReadEvidenceSha256,
    expectedEvidenceId: request.expectedPublicReadEvidenceId,
    evaluationTimeUtc,
    loopbackPolicy: loopback,
    migrationCandidate: migration,
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
    publicRead?.promotion?.authority?.funds_movement !== false
  ) {
    fail("composition_public_read_promotion_invalid");
  }

  const publicReadCandidate = publicRead.updated_migration_candidate;
  assertAuthorityClosed(publicReadCandidate);
  const publicReadClassified = modules.classifyMigration(publicReadCandidate);
  if (
    publicReadClassified?.status !== "HOLD" ||
    JSON.stringify(publicReadClassified?.missing_gates) !==
      JSON.stringify(["successor_state_root_public_void_anchor_required"])
  ) {
    fail("composition_public_read_candidate_classification_invalid");
  }

  const admission = modules.verifyStateRoot({
    payload_bytes: anchorBytes,
    finalized_event_membership: membership,
    expected_registry_address: registry,
    expected_publisher_address: publisher,
  });
  if (
    admission?.ok !== true ||
    admission.status !== "CANONICAL_TRUTH_CANDIDATE_VALID_REAL_IMPORT_REQUIRED" ||
    admission.successor_state_root_public_void_anchor_candidate_ready !== true ||
    admission.anchor_payload_exact_bytes_verified !== true ||
    admission.canonical_truth_admission_input_verified !== true ||
    admission.canonical_commitment_reference_matches_anchor !== true ||
    admission.exact_registry_address_bound !== true ||
    admission.exact_publisher_address_bound !== true ||
    admission.real_finalized_membership_import_verified !== false ||
    admission.successor_state_root_public_void_anchor_ready !== false ||
    admission.public_balance_receipt_code_verification_ready !== false ||
    admission.chain2050_write_performed !== false
  ) {
    fail("composition_state_root_admission_invalid");
  }
  if (
    admission.registry_address !== registry ||
    admission.publisher_address !== publisher ||
    admission.finalized_event_membership_id !==
      membership.finalized_event_membership_id
  ) {
    fail("composition_state_root_membership_binding_mismatch");
  }

  const finalCandidate = structuredClone(publicReadCandidate);
  if (
    finalCandidate.public_verification
      .successor_state_root_public_void_anchor_ready !== false
  ) {
    fail("composition_state_root_start_state_invalid");
  }
  finalCandidate.public_verification
    .successor_state_root_public_void_anchor_ready = true;
  exactDeltaOnlyStateRoot(publicReadCandidate, finalCandidate);
  assertAuthorityClosed(finalCandidate);

  const finalClassification = modules.classifyMigration(finalCandidate);
  if (
    finalClassification?.status !== "SOURCE_READY" ||
    finalClassification?.migration_authorized !== false ||
    finalClassification?.public_activation_authorized !== false ||
    finalClassification?.money_movement_authorized !== false
  ) {
    fail("composition_final_migration_not_source_ready");
  }

  const repositoryAfter = requireCleanReviewedRepositoryV1();
  if (
    repositoryAfter.repository_head_sha !== repositoryBefore.repository_head_sha ||
    repositoryAfter.repository_tree_sha !== repositoryBefore.repository_tree_sha
  ) {
    fail("composition_repository_changed_during_verification");
  }

  const material = Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1,
    version: 1,
    status: "EPOCH2_PUBLIC_VERIFICATION_COMPOSED_SOURCE_READY",
    chain_id: 2050,
    execution_epoch: 2,
    repository_head_sha: repositoryAfter.repository_head_sha,
    repository_tree_sha: repositoryAfter.repository_tree_sha,
    reviewed_main_commit: REVIEWED_MAIN,
    evaluation_time_utc: evaluationTimeUtc,
    source_blobs:
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_SOURCE_BLOBS_V1,
    public_read: Object.freeze({
      evidence_file_sha256: request.expectedPublicReadEvidenceSha256,
      evidence_id: request.expectedPublicReadEvidenceId,
      promotion_sha256: sha256(Buffer.from(canonical(publicRead.promotion), "utf8")),
      public_balance_receipt_code_verification_ready: true,
      successor_state_root_public_void_anchor_ready: false,
    }),
    state_root: Object.freeze({
      membership_file_sha256: request.expectedStateRootMembershipSha256,
      finalized_event_membership_id: admission.finalized_event_membership_id,
      canonical_commitment_truth_admission_id:
        admission.canonical_commitment_truth_admission_id,
      admission_candidate_id: admission.admission_candidate_id,
      registry_address: registry,
      publisher_address: publisher,
      successor_state_root_public_void_anchor_ready: true,
    }),
    final_migration_candidate_sha256:
      sha256(Buffer.from(canonical(finalCandidate), "utf8")),
    final_migration_classifier_status: "SOURCE_READY",
    remaining_migration_gates: Object.freeze([]),
    canonical_candidate_mutated: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_AUTHORITY_V1,
  });

  return Object.freeze({
    ...material,
    composition_id:
      "voide2pvc1_" + sha256(Buffer.from(canonical(material), "utf8")),
    derived_migration_candidate: Object.freeze(finalCandidate),
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

function stableReadExternal(file, expectedSha256, label) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    isInsideRepo(file)
  ) fail(label + "_path_invalid");
  const real = fs.realpathSync.native(file);
  if (real !== file) fail(label + "_path_alias_forbidden");
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size < 2 || before.size > MAX_EXTERNAL_BYTES) {
      fail(label + "_file_invalid");
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) fail(label + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd);
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs ||
      sha256(bytes) !== expectedSha256
    ) fail(label + "_changed_or_sha256_mismatch");
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function privateOutputDir(dir) {
  if (
    typeof dir !== "string" ||
    !path.isAbsolute(dir) ||
    path.resolve(dir) !== dir ||
    isInsideRepo(dir)
  ) fail("composition_output_dir_invalid");
  if (fs.existsSync(dir)) fail("composition_output_dir_already_exists");
  const parent = path.dirname(dir);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("composition_output_parent_alias_forbidden");
  }
}

function writePrivateFile(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
  } finally {
    fs.closeSync(fd);
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const publicReadFile = path.resolve(String(arg("--public-read-evidence") || ""));
    const publicReadSha = String(arg("--public-read-sha256") || "");
    const publicReadId = String(arg("--public-read-evidence-id") || "");
    const membershipFile = path.resolve(String(arg("--state-root-membership") || ""));
    const membershipSha = String(arg("--state-root-membership-sha256") || "");
    const registry = String(arg("--registry") || "");
    const publisher = String(arg("--publisher") || "");
    const confirmation = String(arg("--confirmation") || "");
    const outputDir = path.resolve(String(arg("--output-dir") || ""));

    if (!SHA256.test(publicReadSha) || !SHA256.test(membershipSha)) {
      fail("composition_cli_sha256_invalid");
    }
    privateOutputDir(outputDir);

    const result = await composeVoidEconomicEpoch2PublicVerificationV1({
      publicReadEvidenceBytes:
        stableReadExternal(publicReadFile, publicReadSha, "public_read_evidence"),
      expectedPublicReadEvidenceSha256: publicReadSha,
      expectedPublicReadEvidenceId: publicReadId,
      stateRootMembershipBytes:
        stableReadExternal(membershipFile, membershipSha, "state_root_membership"),
      expectedStateRootMembershipSha256: membershipSha,
      expectedRegistryAddress: registry,
      expectedPublisherAddress: publisher,
      reviewConfirmation: confirmation,
    });

    fs.mkdirSync(outputDir, { mode: 0o700, recursive: false });
    writePrivateFile(
      path.join(outputDir, "economic-epoch2-public-verification-composition-v1.json"),
      Object.fromEntries(
        Object.entries(result).filter(([key]) => key !== "derived_migration_candidate"),
      ),
    );
    writePrivateFile(
      path.join(outputDir, "economic-evm-successor-migration-candidate-v1.json"),
      result.derived_migration_candidate,
    );

    console.log(VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1);
    console.log("status=" + result.status);
    console.log("composition_id=" + result.composition_id);
    console.log("evaluation_time_utc=" + result.evaluation_time_utc);
    console.log("public_balance_receipt_code_verification_ready=true");
    console.log("successor_state_root_public_void_anchor_ready=true");
    console.log("migration_classifier_status=SOURCE_READY");
    console.log("remaining_migration_gate_count=0");
    console.log("canonical_candidate_mutated=false");
    console.log("migration_authorized=false");
    console.log("public_activation_authorized=false");
    console.log("funds_movement=false");
    console.log("output_dir=" + outputDir);
  } catch (error) {
    console.error(VOID_ECONOMIC_EPOCH2_PUBLIC_VERIFICATION_COMPOSITION_V1 + "_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
