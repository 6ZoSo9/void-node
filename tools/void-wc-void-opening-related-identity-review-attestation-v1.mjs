#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1 =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIER_V1 =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIER_V1";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_DOMAIN_V1 =
  Object.freeze({
    name: "VOID WC/VOID Related Identity Review Attestation",
    version: "1",
    chainId: 2050,
    salt:
      "0xccbbbf6c8571cce06ca20935e6305c773788e03f629cfc6dca29c0f5d4808346",
  });

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_TYPES_V1 =
  Object.freeze({
    RelatedIdentityReview: Object.freeze([
      Object.freeze({ name: "reviewer_role_decision_id", type: "bytes32" }),
      Object.freeze({ name: "reviewer_address", type: "address" }),
      Object.freeze({ name: "control_evidence_id", type: "bytes32" }),
      Object.freeze({ name: "manifest_id", type: "bytes32" }),
      Object.freeze({ name: "coupled_launch_id", type: "bytes32" }),
      Object.freeze({ name: "concentration_policy_id", type: "bytes32" }),
      Object.freeze({ name: "opening_window_id", type: "bytes32" }),
      Object.freeze({ name: "eligible_cohort_root", type: "bytes32" }),
      Object.freeze({ name: "cluster_assignment_root", type: "bytes32" }),
      Object.freeze({ name: "evidence_manifest_root", type: "bytes32" }),
      Object.freeze({ name: "manifest_compiler_git_blob_sha1", type: "bytes20" }),
      Object.freeze({ name: "issued_at_unix", type: "uint64" }),
      Object.freeze({ name: "expires_at_unix", type: "uint64" }),
      Object.freeze({ name: "nonce", type: "bytes32" }),
    ]),
  });

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_AUTHORITY_V1 =
  Object.freeze({
    source_only_verifier: true,
    reviewer_signature_verification: true,
    fresh_launch_controller_control_evidence_required: true,
    manifest_review_attestation_only: true,
    reviewed_lineage_verifier_execution: true,
    mutable_worktree_lineage_execution: false,
    reviewed_package_runtime_required: true,
    reviewed_package_bytes_verified: true,
    ancestor_package_resolution_preempted: true,
    ambient_node_package_bytes_forbidden: true,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    signing_performed: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    runtime_or_service_mutation: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    liquidity_movement: false,
    treasury_movement: false,
    funds_movement: false,
  });

const MAX_TTL_SECONDS = 1800n;
const MIN_TTL_SECONDS = 60n;
export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1 =
  Object.freeze({
    max_participants: 65_536,
    max_clusters: 65_536,
    max_evidence_documents: 65_536,
    max_evidence_bytes_per_document: 8 * 1024 * 1024,
    max_total_evidence_bytes: 64 * 1024 * 1024,
    max_total_evidence_subject_references: 1_000_000,
  });
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/u;
const MANIFEST_ID = /^voidwcriem1_[0-9a-f]{64}$/u;
const ROLE_DECISION_ID = /^voidwcrirr1_[0-9a-f]{64}$/u;
const CONTROL_EVIDENCE_ID = /^voidwlcce1_[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const GIT_BLOB = /^[0-9a-f]{40}$/u;
const REVIEWED_MANIFEST_COMPILER_PATH =
  "tools/void-wc-void-opening-related-identity-evidence-manifest-v1.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const REVIEWED_MANIFEST_MARKER_V1 =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1";
const REVIEWED_MANIFEST_AUTHORITY_V1 = Object.freeze({
  source_only: true,
  explicit_input_only: true,
  eligible_cohort_reverified: true,
  content_addressed_evidence_required: true,
  exact_participant_cluster_bijection_required: true,
  ambiguous_evidence_holds: true,
  reviewer_role_decision_required: true,
  review_attestation_verified: false,
  related_identity_truth_verified: false,
  privacy_sensitive_attribute_inference: false,
  browsing_or_social_graph_deanonymization: false,
  ip_geolocation_or_device_fingerprinting: false,
  runtime_or_launch_evidence: false,
  wc_ledger_write: false,
  wc_balance_mutation: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});
export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1 =
  "7bb5c54fcd6a0d188b90c4c17d06145fe792ce66";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_LINEAGE_BLOBS_V1 =
  Object.freeze({
    "tools/void-wc-void-coupled-opening-v1.mjs":
      "886feaef71a228b1e6f49f1106ae8ec2b34c404e",
    "tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs":
      "fcc915b20df0d281646a2ffda60667e1aa6859de",
    "tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs":
      "db034d197a8b932d0b9eb1d134a6a4a7a0fb6b86",
    "tools/void-wc-void-opening-window-policy-v1.mjs":
      "0aaf83c1d404897d8836b969e5111c3bb0870bbe",
    "tools/void-wc-void-opening-concentration-sybil-policy-v1.mjs":
      "01c1e5b326255a7ee49f14fc7d0ff7c1fb0452bb",
    "tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs":
      "27c686c9bf95bbf9b56f09c692cb59ffba958d0d",
  });

const REVIEWED_REVIEWER_ROLE_PATH_V1 =
  "tools/void-wc-void-opening-related-identity-reviewer-role-v1.mjs";
const REVIEWED_REVIEWER_ROLE_BLOB_V1 =
  "406bb60f44024e0cde7b2737af17d592b2a65fe3";
const REVIEWED_REVIEWER_ADDRESS_V1 =
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";
const REVIEWED_REVIEWER_DECISION_ID_V1 =
  "voidwcrirr1_27edb03939335d6b6ede05da0b46f57680e86e3fa104f3e85cb2d1c06676d10a";
const REVIEWED_CONTROL_PATH_V1 =
  "tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
const REVIEWED_CONTROL_BLOB_V1 =
  "a17a6da5f85a740c5c38b0c4fb3377c7df05d270";
const REVIEWED_CONTROL_EVIDENCE_MARKER_V1 =
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1";
const REVIEWED_CONTROL_ROLE_LABEL_V1 =
  "VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1";
const REVIEWED_CONTROL_ROLE_ID_V1 =
  "0x498afbfb8fb314814638ccf5209cc7344582c21542a3f494834d141d197fb453";
const REVIEWED_RUNTIME_TOOL_PATH_V1 =
  "tools/void-reviewed-node-package-runtime-v1.mjs";
const REVIEWED_RUNTIME_TOOL_BLOB_V1 =
  "6475c3f18ffe566cf5f448ca1de4795391a6efde";
const REVIEWED_RUNTIME_PROFILE_PATH_V1 =
  "ops/security/reviewed-node-package-runtime-ethers-v1.json";
const REVIEWED_RUNTIME_PROFILE_BLOB_V1 =
  "87b650e28366acfea3d140ea7778f41f57e5b0c3";
const REVIEWED_RUNTIME_PROFILE_ID_V1 =
  "voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77";
const REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256_V1 =
  "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";
const REVIEWED_CONTROL_SOURCE_BLOBS_V1 = Object.freeze({
  [REVIEWED_CONTROL_PATH_V1]: REVIEWED_CONTROL_BLOB_V1,
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json":
    "d78bc88dd26c47921a54c081a79ceefc0d5abcee",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json":
    "c85b6bc59caac6bc765cb8e969cb980386161d12",
  "package.json": "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  "package-lock.json": "b2671f0149f522b2489247016df0a5ec4bb72b8b",
  [REVIEWED_RUNTIME_TOOL_PATH_V1]: REVIEWED_RUNTIME_TOOL_BLOB_V1,
  [REVIEWED_RUNTIME_PROFILE_PATH_V1]: REVIEWED_RUNTIME_PROFILE_BLOB_V1,
});

function fail(code) {
  throw new Error(code);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalReviewJsonV1(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function digestSha256IdV1(value) {
  return "sha256:" +
    sha256(Buffer.from(canonicalReviewJsonV1(value), "utf8"));
}

function reviewedManifestClusterIdV1(participantIds) {
  if (!Array.isArray(participantIds) || participantIds.length < 1) {
    fail("review_manifest_cluster_participants_invalid");
  }
  const canonical = participantIds.map((value) => {
    if (typeof value !== "string" || !SHA256_ID.test(value)) {
      fail("review_manifest_cluster_participant_invalid");
    }
    return value;
  }).sort(compareTextV1);
  for (let index = 1; index < canonical.length; index += 1) {
    if (canonical[index] === canonical[index - 1]) {
      fail("review_manifest_cluster_participant_duplicate");
    }
  }
  return digestSha256IdV1({
    schema: "void.wc-void-opening-related-identity-cluster.v1",
    participant_ids: canonical,
  });
}

function compareTextV1(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactKeysV1(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort(compareTextV1);
  const expected = [...keys].sort(compareTextV1);
  if (canonicalReviewJsonV1(actual) !== canonicalReviewJsonV1(expected)) {
    fail(code);
  }
  return value;
}

function currentManifestCompilerBlobV1() {
  let blob;
  try {
    blob = execFileSync(
      GIT,
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "core.preloadIndex=false",
        "-c", "submodule.recurse=false",
        "-C", ROOT,
        "rev-parse",
        "HEAD:" + REVIEWED_MANIFEST_COMPILER_PATH,
      ],
      {
        cwd: "/",
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH: "/usr/bin:/bin",
          HOME: "/nonexistent",
          XDG_CONFIG_HOME: "/nonexistent",
          LANG: "C",
          LC_ALL: "C",
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_SYSTEM: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_ATTR_NOSYSTEM: "1",
          GIT_OPTIONAL_LOCKS: "0",
          GIT_NO_REPLACE_OBJECTS: "1",
          GIT_TERMINAL_PROMPT: "0",
        },
      },
    ).trim();
  } catch {
    fail("review_manifest_compiler_blob_unavailable");
  }
  if (
    !GIT_BLOB.test(blob) ||
    blob !==
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1
  ) {
    fail("review_manifest_compiler_generation_mismatch");
  }
  return blob;
}

function reviewedGitEnvV1() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function reviewedHeadBlobV1(sourcePath) {
  try {
    return execFileSync(
      GIT,
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "core.preloadIndex=false",
        "-c", "submodule.recurse=false",
        "-C", ROOT,
        "rev-parse",
        "HEAD:" + sourcePath,
      ],
      {
        cwd: "/",
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: reviewedGitEnvV1(),
      },
    ).trim();
  } catch {
    fail("review_lineage_blob_unavailable");
  }
}

function reviewedWorktreeBlobV1(sourcePath) {
  try {
    return execFileSync(
      GIT,
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-C", ROOT,
        "hash-object",
        "--",
        sourcePath,
      ],
      {
        cwd: "/",
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: reviewedGitEnvV1(),
      },
    ).trim();
  } catch {
    fail("review_control_worktree_blob_unavailable");
  }
}

function reviewedBlobBytesV1(blob) {
  try {
    return execFileSync(
      GIT,
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-C", ROOT,
        "cat-file",
        "blob",
        blob,
      ],
      {
        cwd: "/",
        encoding: null,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
        env: reviewedGitEnvV1(),
      },
    );
  } catch {
    fail("review_lineage_blob_materialization_failed");
  }
}

async function loadReviewedLineageVerifiersV1() {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-review-lineage-v1-"),
  );
  try {
    for (const [sourcePath, expectedBlob] of Object.entries(
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_LINEAGE_BLOBS_V1,
    )) {
      const currentBlob = reviewedHeadBlobV1(sourcePath);
      if (currentBlob !== expectedBlob || !GIT_BLOB.test(currentBlob)) {
        fail("review_lineage_generation_mismatch");
      }
      const destination = path.join(temp, path.basename(sourcePath));
      fs.writeFileSync(
        destination,
        reviewedBlobBytesV1(expectedBlob),
        { flag: "wx", mode: 0o600 },
      );
    }

    const [
      windowPolicy,
      concentrationPolicy,
      eligibilityPolicy,
      concentrationContract,
    ] = await Promise.all([
      import(
        pathToFileURL(
          path.join(temp, "void-wc-void-opening-window-policy-v1.mjs"),
        ).href
      ),
      import(
        pathToFileURL(
          path.join(temp, "void-wc-void-opening-concentration-sybil-policy-v1.mjs"),
        ).href
      ),
      import(
        pathToFileURL(
          path.join(
            temp,
            "void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
          ),
        ).href
      ),
      import(
        pathToFileURL(
          path.join(
            temp,
            "void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs",
          ),
        ).href
      ),
    ]);

    return Object.freeze({
      windowPolicy,
      concentrationPolicy,
      eligibilityPolicy,
      concentrationContract,
    });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function reviewedReviewerRoleV1() {
  if (
    reviewedHeadBlobV1(REVIEWED_REVIEWER_ROLE_PATH_V1) !==
    REVIEWED_REVIEWER_ROLE_BLOB_V1
  ) {
    fail("review_reviewer_role_generation_mismatch");
  }
  const authority = Object.freeze({
    source_only_role_decision: true,
    related_identity_manifest_review_attestation_role: true,
    fresh_control_evidence_required: true,
    manifest_signing_performed: false,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    runtime_or_service_mutation: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    liquidity_movement: false,
    treasury_movement: false,
    funds_movement: false,
  });
  const material = Object.freeze({
    marker: "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ROLE_V1",
    version: 1,
    chain_id: 2050,
    pair: "WC_VOID",
    reviewer_role: "related_identity_manifest_reviewer",
    reviewer_address: canonicalAddress(
      REVIEWED_REVIEWER_ADDRESS_V1,
      "review_reviewer_address_invalid",
    ),
    launch_controller_role_label: REVIEWED_CONTROL_ROLE_LABEL_V1,
    authorization_basis: "sovereign_explicit_reviewer_role_selection_v1",
    attestation_scope: Object.freeze([
      "manifest_id",
      "coupled_launch_id",
      "concentration_policy_id",
      "opening_window_id",
      "eligible_cohort_root",
      "cluster_assignment_root",
      "evidence_manifest_root",
      "manifest_compiler_git_blob_sha1",
    ]),
    fresh_control_evidence_required: true,
    control_evidence_marker: REVIEWED_CONTROL_EVIDENCE_MARKER_V1,
    reviewer_role_selected: true,
    review_attestation_verified: false,
    related_identity_truth_verified: false,
    opening_concentration_and_sybil_limits_ready: false,
    opening_price_acceptance_allowed: false,
    authority,
  });
  const decisionId =
    "voidwcrirr1_" +
    sha256(Buffer.from(canonicalReviewJsonV1(material), "utf8"));
  if (decisionId !== REVIEWED_REVIEWER_DECISION_ID_V1) {
    fail("reviewer_role_decision_id_mismatch");
  }
  return Object.freeze({
    ...material,
    decision_id: decisionId,
    reviewer_role_git_blob_sha1: REVIEWED_REVIEWER_ROLE_BLOB_V1,
  });
}

function gitBlobSha1V1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function writePrivateSourceV1(file, bytes, mode = 0o400) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    mode,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fchmodSync(fd, mode);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function makePrivateTreeRemovableV1(root) {
  if (!fs.existsSync(root)) return;
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink()) return;
  if (stat.isDirectory()) {
    fs.chmodSync(root, 0o700);
    for (const entry of fs.readdirSync(root)) {
      makePrivateTreeRemovableV1(path.join(root, entry));
    }
  } else if (stat.isFile()) {
    fs.chmodSync(root, 0o600);
  }
}

function materializedBlobV1(treeRoot, relativePath, expectedBlob) {
  const file = path.resolve(treeRoot, relativePath);
  const relative = path.relative(treeRoot, file);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("review_control_materialized_path_escape");
  }
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail("review_control_materialized_file_invalid");
  }
  const bytes = fs.readFileSync(file);
  if (gitBlobSha1V1(bytes) !== expectedBlob) {
    fail("review_control_materialized_blob_mismatch");
  }
  return bytes;
}

function repositoryGitDirV1() {
  let raw;
  try {
    raw = execFileSync(
      GIT,
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-C", ROOT,
        "rev-parse",
        "--git-dir",
      ],
      {
        cwd: "/",
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: reviewedGitEnvV1(),
      },
    ).trim();
  } catch {
    fail("review_control_git_dir_unavailable");
  }
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(ROOT, raw);
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    fail("review_control_git_dir_invalid");
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail("review_control_git_dir_invalid");
  }
  return fs.realpathSync.native(resolved);
}

function reviewedControlEnvV1(treeRoot, gitDir) {
  return {
    ...reviewedGitEnvV1(),
    GIT_DIR: gitDir,
    GIT_WORK_TREE: treeRoot,
  };
}

function restoreEnvironmentV1(saved, keys) {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

async function withReviewedEthersPackageRootV1(fn) {
  for (const [sourcePath, expectedBlob] of [
    [REVIEWED_RUNTIME_TOOL_PATH_V1, REVIEWED_RUNTIME_TOOL_BLOB_V1],
    [REVIEWED_RUNTIME_PROFILE_PATH_V1, REVIEWED_RUNTIME_PROFILE_BLOB_V1],
  ]) {
    if (
      reviewedHeadBlobV1(sourcePath) !== expectedBlob ||
      reviewedWorktreeBlobV1(sourcePath) !== expectedBlob
    ) {
      fail("review_package_runtime_generation_mismatch");
    }
  }

  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-related-identity-reviewed-ethers-"),
  );
  fs.chmodSync(tempRoot, 0o700);
  try {
    const runtimeToolFile = path.join(tempRoot, "reviewed-node-runtime.mjs");
    writePrivateSourceV1(
      runtimeToolFile,
      reviewedBlobBytesV1(REVIEWED_RUNTIME_TOOL_BLOB_V1),
      0o400,
    );
    const runtimeTool = await import(
      pathToFileURL(runtimeToolFile).href +
        "?blob=" +
        REVIEWED_RUNTIME_TOOL_BLOB_V1
    );
    for (const name of [
      "verifyReviewedNodePackageRuntimeV1",
      "materializeReviewedNodePackageRuntimeV1",
      "verifyMaterializedReviewedNodePackageRuntimeV1",
    ]) {
      if (typeof runtimeTool[name] !== "function") {
        fail("review_package_runtime_export_missing");
      }
    }

    let profile;
    try {
      profile = JSON.parse(
        reviewedBlobBytesV1(REVIEWED_RUNTIME_PROFILE_BLOB_V1).toString("utf8"),
      );
    } catch {
      fail("review_package_runtime_profile_invalid");
    }
    if (
      profile?.marker !== "VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1" ||
      profile?.status !== "REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE" ||
      profile?.version !== 1 ||
      profile?.profile_id !== REVIEWED_RUNTIME_PROFILE_ID_V1 ||
      profile?.packages_aggregate_sha256 !==
        REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256_V1 ||
      canonicalReviewJsonV1(profile?.root_packages) !==
        canonicalReviewJsonV1(["ethers"])
    ) {
      fail("review_package_runtime_profile_invalid");
    }

    const verified = runtimeTool.verifyReviewedNodePackageRuntimeV1({
      profile,
      repoRoot: ROOT,
    });
    if (
      verified?.ok !== true ||
      verified.status !== "REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED" ||
      verified.profile_id !== REVIEWED_RUNTIME_PROFILE_ID_V1 ||
      verified.packages_aggregate_sha256 !==
        REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256_V1
    ) {
      fail("review_package_runtime_profile_not_verified");
    }

    const runtimeRoot = path.join(tempRoot, "runtime");
    const materialized = runtimeTool.materializeReviewedNodePackageRuntimeV1({
      profile,
      repoRoot: ROOT,
      destinationRoot: runtimeRoot,
    });
    if (
      materialized?.ok !== true ||
      materialized.status !==
        "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED" ||
      materialized.profile_id !== REVIEWED_RUNTIME_PROFILE_ID_V1 ||
      materialized.packages_aggregate_sha256 !==
        REVIEWED_RUNTIME_PACKAGES_AGGREGATE_SHA256_V1 ||
      materialized.read_only_materialization !== true
    ) {
      fail("review_package_runtime_materialization_invalid");
    }

    const reverified =
      runtimeTool.verifyMaterializedReviewedNodePackageRuntimeV1({
        profile,
        repoRoot: ROOT,
        destinationRoot: runtimeRoot,
      });
    if (
      reverified?.ok !== true ||
      reverified.status !==
        "PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED"
    ) {
      fail("review_package_runtime_materialization_reverification_failed");
    }

    return await fn(Object.freeze({ runtimeRoot, profile }));
  } finally {
    makePrivateTreeRemovableV1(tempRoot);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function withReviewedEip712BridgeV1(fn) {
  return await withReviewedEthersPackageRootV1(
    async ({ runtimeRoot, profile }) => {
      const sourceRoot = path.join(runtimeRoot, "source");
      fs.mkdirSync(sourceRoot, { recursive: true, mode: 0o700 });
      const bridgeFile = path.join(
        sourceRoot,
        "void-related-identity-reviewed-eip712-bridge.mjs",
      );
      const bridgeSource = [
        'import { TypedDataEncoder, verifyTypedData } from "ethers";',
        'export { TypedDataEncoder, verifyTypedData };',
        "",
      ].join("\n");
      const bridgeBytes = Buffer.from(bridgeSource, "utf8");
      writePrivateSourceV1(bridgeFile, bridgeBytes, 0o400);
      const bridgeModule = await import(
        pathToFileURL(bridgeFile).href +
          "?sha256=" +
          sha256(bridgeBytes)
      );
      if (
        typeof bridgeModule.TypedDataEncoder?.hash !== "function" ||
        typeof bridgeModule.verifyTypedData !== "function"
      ) {
        fail("review_eip712_bridge_exports_mismatch");
      }
      return await fn(Object.freeze({
        TypedDataEncoder: bridgeModule.TypedDataEncoder,
        verifyTypedData: bridgeModule.verifyTypedData,
        runtime_profile_id: profile.profile_id,
        packages_aggregate_sha256: profile.packages_aggregate_sha256,
      }));
    },
  );
}

async function withReviewedControlVerifierV1(fn) {
  for (const [sourcePath, expectedBlob] of Object.entries(
    REVIEWED_CONTROL_SOURCE_BLOBS_V1,
  )) {
    if (
      reviewedHeadBlobV1(sourcePath) !== expectedBlob ||
      reviewedWorktreeBlobV1(sourcePath) !== expectedBlob
    ) {
      fail("review_control_worktree_blob_mismatch");
    }
  }

  return await withReviewedEthersPackageRootV1(
    async ({ runtimeRoot, profile }) => {
      const treeRoot = path.join(runtimeRoot, "source");
      const archive = path.join(runtimeRoot, "source.tar");
      fs.mkdirSync(treeRoot, { mode: 0o700 });
      try {
        execFileSync(
          GIT,
          [
            "--no-replace-objects",
            "-c", "core.hooksPath=/dev/null",
            "-c", "core.attributesFile=/dev/null",
            "-c", "core.fsmonitor=false",
            "-c", "core.untrackedCache=false",
            "-c", "core.preloadIndex=false",
            "-c", "submodule.recurse=false",
            "-C", ROOT,
            "archive",
            "--format=tar",
            "--output=" + archive,
            "HEAD",
          ],
          {
            cwd: "/",
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            env: reviewedGitEnvV1(),
          },
        );
        execFileSync(
          "/usr/bin/tar",
          ["-xf", archive, "-C", treeRoot],
          {
            cwd: "/",
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            env: reviewedGitEnvV1(),
          },
        );
        fs.unlinkSync(archive);

        for (const [relativePath, expectedBlob] of Object.entries(
          REVIEWED_CONTROL_SOURCE_BLOBS_V1,
        )) {
          materializedBlobV1(treeRoot, relativePath, expectedBlob);
        }
        execFileSync(
          "/usr/bin/chmod",
          ["-R", "a-w", treeRoot],
          {
            cwd: "/",
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            env: reviewedGitEnvV1(),
          },
        );

        const gitDir = repositoryGitDirV1();
        const env = reviewedControlEnvV1(treeRoot, gitDir);
        const keys = Object.keys(env);
        const saved = Object.fromEntries(
          keys.map((key) => [key, process.env[key]]),
        );
        Object.assign(process.env, env);
        try {
          const status = execFileSync(
            GIT,
            [
              "--no-replace-objects",
              "-c", "core.hooksPath=/dev/null",
              "-c", "core.attributesFile=/dev/null",
              "-c", "core.fsmonitor=false",
              "-c", "core.untrackedCache=false",
              "-c", "core.preloadIndex=false",
              "-c", "submodule.recurse=false",
              "-C", treeRoot,
              "status",
              "--porcelain=v1",
              "--untracked-files=all",
            ],
            {
              cwd: "/",
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"],
              env,
            },
          ).trim();
          if (status !== "") {
            fail("review_control_materialized_repository_not_clean");
          }

          const module = await import(
            pathToFileURL(
              path.join(treeRoot, REVIEWED_CONTROL_PATH_V1),
            ).href +
              "?reviewed_blob=" +
              REVIEWED_CONTROL_BLOB_V1
          );
          if (
            module.VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1 !==
              REVIEWED_CONTROL_EVIDENCE_MARKER_V1 ||
            module.VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1 !==
              REVIEWED_CONTROL_ROLE_ID_V1 ||
            typeof module.reverifyVoidWcVoidLaunchControllerControlEvidenceV1 !==
              "function"
          ) {
            fail("review_control_verifier_exports_mismatch");
          }

          const ethersRow = profile.packages.find(
            (row) =>
              row?.name === "ethers" &&
              row?.lock_key === "node_modules/ethers",
          );
          if (!ethersRow || typeof ethersRow.version !== "string") {
            fail("review_package_runtime_ethers_identity_missing");
          }

          return await fn(Object.freeze({
            module,
            ethers_version: ethersRow.version,
            runtime_profile_id: profile.profile_id,
            packages_aggregate_sha256: profile.packages_aggregate_sha256,
          }));
        } finally {
          restoreEnvironmentV1(saved, keys);
        }
      } finally {
        makePrivateTreeRemovableV1(treeRoot);
      }
    },
  );
}

export async function reviewedControlVerifierGenerationV1() {
  return await withReviewedControlVerifierV1(
    async ({
      ethers_version,
      runtime_profile_id,
      packages_aggregate_sha256,
    }) => Object.freeze({
      control_verifier_git_blob_sha1: REVIEWED_CONTROL_BLOB_V1,
      ethers_version,
      reviewed_package_runtime_profile_id: runtime_profile_id,
      reviewed_packages_aggregate_sha256: packages_aggregate_sha256,
      reviewed_package_bytes_verified: true,
      ancestor_package_resolution_preempted: true,
      ambient_node_package_bytes_forbidden: true,
      mutable_worktree_execution: false,
    }),
  );
}

async function reverifyReviewedControlEvidenceV1(input) {
  return await withReviewedControlVerifierV1(
    async ({ module }) =>
      module.reverifyVoidWcVoidLaunchControllerControlEvidenceV1(input),
  );
}

function canonicalAddress(value, code) {
  if (typeof value !== "string" || !ADDRESS.test(value)) fail(code);
  const address = value.toLowerCase();
  if (address === "0x" + "0".repeat(40)) fail(code);
  return address;
}

function decimal(value, code) {
  if (
    (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") ||
    !/^(0|[1-9][0-9]*)$/u.test(String(value))
  ) {
    fail(code);
  }
  const parsed = BigInt(String(value));
  if (parsed < 0n || parsed > (1n << 64n) - 1n) fail(code);
  return parsed;
}

function prefixedIdBytes32(value, pattern, prefix, code) {
  if (typeof value !== "string" || !pattern.test(value)) fail(code);
  const hex = value.slice(prefix.length);
  const bytes32 = "0x" + hex;
  if (!BYTES32.test(bytes32)) fail(code);
  return bytes32;
}

function sha256IdBytes32(value, code) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) fail(code);
  return "0x" + value.slice("sha256:".length);
}

function gitBlobBytes20(value, code) {
  if (typeof value !== "string" || !GIT_BLOB.test(value)) fail(code);
  return "0x" + value;
}

export function relatedIdentityManifestIdV1(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("review_manifest_not_object");
  }
  const material = { ...manifest };
  delete material.manifest_id;
  return "voidwcriem1_" +
    sha256(Buffer.from(canonicalReviewJsonV1(material), "utf8"));
}

export function validateReviewableRelatedIdentityManifestV1(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("review_manifest_not_object");
  }
  if (
    !Number.isSafeInteger(manifest.participant_count) ||
    !Number.isSafeInteger(manifest.cluster_count) ||
    !Number.isSafeInteger(manifest.evidence_document_count)
  ) {
    fail("review_manifest_not_ready");
  }
  const limits =
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1;
  if (
    manifest.participant_count < 1 ||
    manifest.participant_count > limits.max_participants ||
    manifest.cluster_count < 1 ||
    manifest.cluster_count > manifest.participant_count ||
    manifest.cluster_count > limits.max_clusters ||
    manifest.evidence_document_count < 1 ||
    manifest.evidence_document_count > limits.max_evidence_documents
  ) {
    fail("review_manifest_resource_limit_exceeded");
  }
  if (
    manifest.marker !==
      REVIEWED_MANIFEST_MARKER_V1 ||
    manifest.version !== 1 ||
    manifest.status !==
      "RELATED_IDENTITY_EVIDENCE_MANIFEST_READY_REVIEW_ATTESTATION_HOLD" ||
    manifest.chain_id !== 2050 ||
    manifest.pair !== "WC_VOID" ||
    manifest.ready_for_review_attestation !== true ||
    manifest.reviewer_role_decision_required !== true ||
    manifest.review_attestation_verified !== false ||
    manifest.related_identity_truth_verified !== false ||
    manifest.opening_concentration_and_sybil_limits_ready !== false ||
    manifest.opening_price_acceptance_allowed !== false ||
    manifest.opening_price_acceptance_hold !==
      "related_identity_review_attestation_required" ||
    manifest.all_eligible_participants_covered !== true ||
    manifest.exact_participant_cluster_bijection !== true ||
    manifest.ambiguous_participant_count !== 0 ||
    manifest.evidence_bytes_content_addressed !== true ||
    manifest.privacy_class !== "void_control_evidence_non_personal_v1" ||
    canonicalReviewJsonV1(manifest.authority) !==
      canonicalReviewJsonV1(
        REVIEWED_MANIFEST_AUTHORITY_V1,
      ) ||
    !Number.isSafeInteger(manifest.participant_count) ||
    manifest.participant_count < 1 ||
    !Number.isSafeInteger(manifest.cluster_count) ||
    manifest.cluster_count < 1 ||
    !Number.isSafeInteger(manifest.evidence_document_count) ||
    manifest.evidence_document_count < 1 ||
    !Array.isArray(manifest.cluster_assignments) ||
    manifest.cluster_assignments.length !== manifest.participant_count ||
    !Array.isArray(manifest.evidence_documents) ||
    manifest.evidence_documents.length !== manifest.evidence_document_count
  ) {
    fail("review_manifest_not_ready");
  }

  for (const [key, value] of [
    ["coupled_launch_id", manifest.coupled_launch_id],
    ["concentration_policy_contract_id", manifest.concentration_policy_contract_id],
    ["concentration_policy_id", manifest.concentration_policy_id],
    ["opening_window_id", manifest.opening_window_id],
    ["participant_provenance_policy_id", manifest.participant_provenance_policy_id],
    ["eligible_cohort_root", manifest.eligible_cohort_root],
    ["cluster_assignment_root", manifest.cluster_assignment_root],
    ["evidence_manifest_root", manifest.evidence_manifest_root],
  ]) {
    sha256IdBytes32(value, "review_manifest_invalid_" + key);
  }

  const evidenceById = new Map();
  const evidenceSubjectsById = new Map();
  const evidenceByCluster = new Map();
  const canonicalEvidence = [];
  let totalEvidenceBytes = 0;
  let totalEvidenceSubjectReferences = 0;
  for (const raw of manifest.evidence_documents) {
    const evidence = exactKeysV1(
      raw,
      [
        "schema",
        "cluster_id",
        "evidence_kind",
        "decision_basis",
        "subject_participant_ids",
        "evidence_file_sha256",
        "evidence_bytes",
        "privacy_class",
        "evidence_id",
      ],
      "review_manifest_evidence_shape_invalid",
    );
    sha256IdBytes32(
      evidence.cluster_id,
      "review_manifest_evidence_cluster_invalid",
    );
    sha256IdBytes32(
      evidence.evidence_id,
      "review_manifest_evidence_id_invalid",
    );
    if (
      evidence.schema !==
        "void.wc-void-opening-related-identity-evidence-document.v1" ||
      (
        evidence.evidence_kind !== "void_key_control_linkage_v1" &&
        evidence.evidence_kind !== "void_credential_control_linkage_v1" &&
        evidence.evidence_kind !== "participant_opt_in_linkage_v1" &&
        evidence.evidence_kind !== "reviewed_cluster_boundary_evidence_v1"
      ) ||
      (
        evidence.decision_basis !== "common_control" &&
        evidence.decision_basis !== "distinct_cluster_boundary"
      ) ||
      (
        evidence.decision_basis === "distinct_cluster_boundary" &&
        evidence.evidence_kind !== "reviewed_cluster_boundary_evidence_v1"
      ) ||
      (
        evidence.decision_basis === "common_control" &&
        evidence.evidence_kind === "reviewed_cluster_boundary_evidence_v1"
      ) ||
      !Array.isArray(evidence.subject_participant_ids) ||
      evidence.subject_participant_ids.length < 1 ||
      typeof evidence.evidence_file_sha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(evidence.evidence_file_sha256) ||
      !Number.isSafeInteger(evidence.evidence_bytes) ||
      evidence.evidence_bytes < 1 ||
      evidence.privacy_class !== "void_control_evidence_non_personal_v1"
    ) {
      fail("review_manifest_evidence_semantics_invalid");
    }
    const subjects = [...evidence.subject_participant_ids];
    totalEvidenceBytes += evidence.evidence_bytes;
    totalEvidenceSubjectReferences += subjects.length;
    if (
      evidence.evidence_bytes >
        VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1
          .max_evidence_bytes_per_document ||
      subjects.length > manifest.participant_count ||
      totalEvidenceBytes >
        VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1
          .max_total_evidence_bytes ||
      totalEvidenceSubjectReferences >
        VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1
          .max_total_evidence_subject_references
    ) {
      fail("review_manifest_resource_limit_exceeded");
    }
    for (const participantId of subjects) {
      sha256IdBytes32(
        participantId,
        "review_manifest_evidence_subject_invalid",
      );
    }
    const sortedSubjects = [...subjects].sort(compareTextV1);
    if (
      new Set(sortedSubjects).size !== sortedSubjects.length ||
      canonicalReviewJsonV1(subjects) !== canonicalReviewJsonV1(sortedSubjects)
    ) {
      fail("review_manifest_evidence_subject_order_invalid");
    }
    const evidenceMaterial = {
      schema: evidence.schema,
      cluster_id: evidence.cluster_id,
      evidence_kind: evidence.evidence_kind,
      decision_basis: evidence.decision_basis,
      subject_participant_ids: subjects,
      evidence_file_sha256: evidence.evidence_file_sha256,
      evidence_bytes: evidence.evidence_bytes,
      privacy_class: evidence.privacy_class,
    };
    if (digestSha256IdV1(evidenceMaterial) !== evidence.evidence_id) {
      fail("review_manifest_evidence_id_mismatch");
    }
    if (evidenceById.has(evidence.evidence_id)) {
      fail("review_manifest_duplicate_evidence_id");
    }
    const normalized = Object.freeze({ ...evidenceMaterial, evidence_id: evidence.evidence_id });
    evidenceById.set(evidence.evidence_id, normalized);
    evidenceSubjectsById.set(evidence.evidence_id, new Set(subjects));
    const clusterEvidence = evidenceByCluster.get(evidence.cluster_id) || [];
    clusterEvidence.push(normalized);
    evidenceByCluster.set(evidence.cluster_id, clusterEvidence);
    canonicalEvidence.push(normalized);
  }

  const seenCommitments = new Set();
  const seenParticipants = new Set();
  const referencedEvidence = new Set();
  const participantCluster = new Map();
  const clusterParticipants = new Map();
  const canonicalAssignments = [];

  for (const raw of manifest.cluster_assignments) {
    const assignment = exactKeysV1(
      raw,
      [
        "commitment_id",
        "participant_id",
        "cluster_id",
        "evidence_id",
        "ambiguous",
      ],
      "review_manifest_assignment_shape_invalid",
    );
    for (const [key, value] of [
      ["commitment_id", assignment.commitment_id],
      ["participant_id", assignment.participant_id],
      ["cluster_id", assignment.cluster_id],
      ["evidence_id", assignment.evidence_id],
    ]) {
      sha256IdBytes32(
        value,
        "review_manifest_assignment_invalid_" + key,
      );
    }
    if (
      assignment.ambiguous !== false ||
      seenCommitments.has(assignment.commitment_id) ||
      seenParticipants.has(assignment.participant_id)
    ) {
      fail("review_manifest_assignment_bijection_invalid");
    }
    const evidence = evidenceById.get(assignment.evidence_id);
    const evidenceSubjects = evidenceSubjectsById.get(assignment.evidence_id);
    if (
      !evidence ||
      !evidenceSubjects ||
      evidence.cluster_id !== assignment.cluster_id ||
      !evidenceSubjects.has(assignment.participant_id)
    ) {
      fail("review_manifest_assignment_evidence_mismatch");
    }
    seenCommitments.add(assignment.commitment_id);
    seenParticipants.add(assignment.participant_id);
    referencedEvidence.add(assignment.evidence_id);
    participantCluster.set(assignment.participant_id, assignment.cluster_id);
    const members = clusterParticipants.get(assignment.cluster_id) || [];
    members.push(assignment.participant_id);
    clusterParticipants.set(assignment.cluster_id, members);
    canonicalAssignments.push(Object.freeze({
      commitment_id: assignment.commitment_id,
      participant_id: assignment.participant_id,
      cluster_id: assignment.cluster_id,
      evidence_id: assignment.evidence_id,
      ambiguous: false,
    }));
  }

  if (
    seenCommitments.size !== manifest.participant_count ||
    seenParticipants.size !== manifest.participant_count ||
    clusterParticipants.size !== manifest.cluster_count ||
    evidenceById.size !== manifest.evidence_document_count
  ) {
    fail("review_manifest_count_mismatch");
  }

  for (const evidence of canonicalEvidence) {
    if (!referencedEvidence.has(evidence.evidence_id)) {
      fail("review_manifest_unreferenced_evidence");
    }
    for (const participantId of evidence.subject_participant_ids) {
      if (participantCluster.get(participantId) !== evidence.cluster_id) {
        fail("review_manifest_evidence_cluster_assignment_mismatch");
      }
    }
  }

  for (const [clusterId, memberList] of clusterParticipants) {
    const members = [...memberList].sort(compareTextV1);
    if (reviewedManifestClusterIdV1(members) !== clusterId) {
      fail("review_manifest_cluster_id_mismatch");
    }
    const clusterEvidence = evidenceByCluster.get(clusterId) || [];
    if (members.length > 1) {
      if (!clusterEvidence.some((evidence) =>
        evidence.decision_basis === "common_control" &&
        canonicalReviewJsonV1(evidence.subject_participant_ids) ===
          canonicalReviewJsonV1(members)
      )) {
        fail("review_manifest_common_control_evidence_incomplete");
      }
    } else if (!clusterEvidence.some((evidence) =>
      evidence.decision_basis === "distinct_cluster_boundary" &&
      canonicalReviewJsonV1(evidence.subject_participant_ids) ===
        canonicalReviewJsonV1(members)
    )) {
      fail("review_manifest_singleton_boundary_evidence_incomplete");
    }
  }

  canonicalAssignments.sort((left, right) =>
    compareTextV1(left.commitment_id, right.commitment_id)
  );
  canonicalEvidence.sort((left, right) =>
    compareTextV1(left.evidence_id, right.evidence_id)
  );
  if (
    canonicalReviewJsonV1(manifest.cluster_assignments) !==
      canonicalReviewJsonV1(canonicalAssignments) ||
    canonicalReviewJsonV1(manifest.evidence_documents) !==
      canonicalReviewJsonV1(canonicalEvidence)
  ) {
    fail("review_manifest_canonical_order_mismatch");
  }

  const assignmentRoot = digestSha256IdV1({
    schema:
      "void.wc-void-opening-related-identity-cluster-assignment-root.v1",
    coupled_launch_id: manifest.coupled_launch_id,
    assignments: canonicalAssignments,
  });
  const evidenceRoot = digestSha256IdV1({
    schema: "void.wc-void-opening-related-identity-evidence-root.v1",
    coupled_launch_id: manifest.coupled_launch_id,
    evidence: canonicalEvidence,
  });
  if (
    assignmentRoot !== manifest.cluster_assignment_root ||
    evidenceRoot !== manifest.evidence_manifest_root
  ) {
    fail("review_manifest_root_mismatch");
  }

  if (
    typeof manifest.manifest_id !== "string" ||
    !MANIFEST_ID.test(manifest.manifest_id) ||
    relatedIdentityManifestIdV1(manifest) !== manifest.manifest_id
  ) {
    fail("review_manifest_id_mismatch");
  }
  return Object.freeze({ ...manifest });
}
export async function verifyReviewManifestLineageV1(
  manifest,
  lineage,
) {
  const reviewed = validateReviewableRelatedIdentityManifestV1(manifest);
  const input = exactKeysV1(
    lineage,
    [
      "opening_window",
      "opening_admissions",
      "concentration_policy",
      "commitments",
      "production_wc_provenance_records",
      "eligibility_records",
    ],
    "review_manifest_lineage_shape_invalid",
  );
  const {
    windowPolicy,
    concentrationPolicy,
    eligibilityPolicy,
    concentrationContract,
  } = await loadReviewedLineageVerifiersV1();

  const windowState = windowPolicy.verifyWcVoidOpeningWindowPolicyV1({
    coupled_launch_id: reviewed.coupled_launch_id,
    window: input.opening_window,
    commitments: input.commitments,
    admissions: input.opening_admissions,
  });
  if (
    windowState.coupled_launch_id !== reviewed.coupled_launch_id ||
    windowState.window_id !== reviewed.opening_window_id ||
    windowState.opening_commitment_window_policy_ready !== true
  ) {
    fail("review_manifest_window_lineage_mismatch");
  }

  const concentration =
    concentrationPolicy.verifyWcVoidOpeningConcentrationSybilPolicyDefinitionV1(
      input.concentration_policy,
      input.opening_window,
    );
  const contract =
    concentrationContract.VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT;
  if (
    concentration.coupled_launch_id !== reviewed.coupled_launch_id ||
    concentration.opening_window_id !== reviewed.opening_window_id ||
    concentration.policy_id !== reviewed.concentration_policy_id ||
    contract.policy_contract_id !== reviewed.concentration_policy_contract_id ||
    concentration.failure_action !== contract.failure_action
  ) {
    fail("review_manifest_concentration_lineage_mismatch");
  }

  const eligibility =
    eligibilityPolicy.verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      reviewed.coupled_launch_id,
      input.commitments,
      input.production_wc_provenance_records,
      input.eligibility_records,
    );
  const eligibleCohortRoot = digestSha256IdV1({
    schema: "void.wc-void-opening-eligible-cohort-root.v1",
    coupled_launch_id: reviewed.coupled_launch_id,
    participant_provenance_policy_id: eligibility.policy_id,
    records: eligibility.records,
  });

  const manifestPairs = reviewed.cluster_assignments
    .map((value) => Object.freeze({
      commitment_id: value.commitment_id,
      participant_id: value.participant_id,
    }))
    .sort((left, right) =>
      compareTextV1(left.commitment_id, right.commitment_id) ||
      compareTextV1(left.participant_id, right.participant_id)
    );
  const eligibilityPairs = eligibility.records
    .map((value) => Object.freeze({
      commitment_id: value.commitment_id,
      participant_id: value.participant_id,
    }))
    .sort((left, right) =>
      compareTextV1(left.commitment_id, right.commitment_id) ||
      compareTextV1(left.participant_id, right.participant_id)
    );
  if (
    canonicalReviewJsonV1(manifestPairs) !==
    canonicalReviewJsonV1(eligibilityPairs)
  ) {
    fail("review_manifest_assignment_eligibility_bijection_mismatch");
  }

  const admissionsByCommitment = new Map(
    windowState.admissions.map((value) => [value.commitment_id, value]),
  );
  for (const record of eligibility.records) {
    const admission = admissionsByCommitment.get(record.commitment_id);
    const admissionAtMs = Date.parse(record.admission_at);
    if (
      !admission ||
      admission.participant_id !== record.participant_id ||
      admission.account !== record.account
    ) {
      fail("review_manifest_opening_admission_identity_mismatch");
    }
    if (
      !Number.isSafeInteger(admissionAtMs) ||
      admissionAtMs !== admission.admitted_at_ms
    ) {
      fail("review_manifest_eligibility_admission_time_mismatch");
    }
  }
  if (
    eligibility.coupled_launch_id !== reviewed.coupled_launch_id ||
    eligibility.participant_provenance_and_eligibility_verified !== true ||
    eligibility.policy_id !== reviewed.participant_provenance_policy_id ||
    contract.participant_provenance_policy_id !== eligibility.policy_id ||
    eligibility.eligible_participant_count !== reviewed.participant_count ||
    eligibleCohortRoot !== reviewed.eligible_cohort_root ||
    windowState.admission_count !== eligibility.commitment_count
  ) {
    fail("review_manifest_eligible_cohort_lineage_mismatch");
  }

  return Object.freeze({
    coupled_launch_id: reviewed.coupled_launch_id,
    opening_window_id: windowState.window_id,
    concentration_policy_contract_id: contract.policy_contract_id,
    concentration_policy_id: concentration.policy_id,
    participant_provenance_policy_id: eligibility.policy_id,
    eligible_cohort_root: eligibleCohortRoot,
    participant_count: eligibility.eligible_participant_count,
    assignment_eligibility_bijection_verified: true,
    eligibility_admission_times_match_opening: true,
    reviewed_lineage_blobs:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_LINEAGE_BLOBS_V1,
    mutable_worktree_lineage_execution: false,
  });
}

export function reviewAttestationTypedValueV1(material) {
  return Object.freeze({
    reviewer_role_decision_id: prefixedIdBytes32(
      material.reviewer_role_decision_id,
      ROLE_DECISION_ID,
      "voidwcrirr1_",
      "review_role_decision_id_invalid",
    ),
    reviewer_address: canonicalAddress(
      material.reviewer_address,
      "review_reviewer_address_invalid",
    ),
    control_evidence_id: prefixedIdBytes32(
      material.control_evidence_id,
      CONTROL_EVIDENCE_ID,
      "voidwlcce1_",
      "review_control_evidence_id_invalid",
    ),
    manifest_id: prefixedIdBytes32(
      material.manifest_id,
      MANIFEST_ID,
      "voidwcriem1_",
      "review_manifest_id_invalid",
    ),
    coupled_launch_id: sha256IdBytes32(
      material.coupled_launch_id,
      "review_coupled_launch_id_invalid",
    ),
    concentration_policy_id: sha256IdBytes32(
      material.concentration_policy_id,
      "review_concentration_policy_id_invalid",
    ),
    opening_window_id: sha256IdBytes32(
      material.opening_window_id,
      "review_opening_window_id_invalid",
    ),
    eligible_cohort_root: sha256IdBytes32(
      material.eligible_cohort_root,
      "review_eligible_cohort_root_invalid",
    ),
    cluster_assignment_root: sha256IdBytes32(
      material.cluster_assignment_root,
      "review_cluster_assignment_root_invalid",
    ),
    evidence_manifest_root: sha256IdBytes32(
      material.evidence_manifest_root,
      "review_evidence_manifest_root_invalid",
    ),
    manifest_compiler_git_blob_sha1: gitBlobBytes20(
      material.manifest_compiler_git_blob_sha1,
      "review_manifest_compiler_blob_invalid",
    ),
    issued_at_unix: decimal(
      material.issued_at_unix,
      "review_issued_at_invalid",
    ).toString(),
    expires_at_unix: decimal(
      material.expires_at_unix,
      "review_expires_at_invalid",
    ).toString(),
    nonce: String(material.nonce || ""),
  });
}

export function voidWcVoidRelatedIdentityReviewTypedDataV1(material) {
  const value = reviewAttestationTypedValueV1(material);
  if (!BYTES32.test(value.nonce)) fail("review_nonce_invalid");
  return Object.freeze({
    domain: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_DOMAIN_V1,
    types: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_TYPES_V1,
    value,
  });
}

export async function voidWcVoidRelatedIdentityReviewDigestV1(material) {
  const data = voidWcVoidRelatedIdentityReviewTypedDataV1(material);
  return await withReviewedEip712BridgeV1(
    async ({ TypedDataEncoder }) =>
      TypedDataEncoder.hash(data.domain, data.types, data.value),
  );
}

export async function verifyReviewSignatureForAddressV1({
  material,
  signature,
  expectedReviewerAddress,
}) {
  if (typeof signature !== "string" || !SIGNATURE.test(signature)) {
    fail("review_signature_invalid");
  }
  const expected = canonicalAddress(
    expectedReviewerAddress,
    "review_expected_address_invalid",
  );
  const data = voidWcVoidRelatedIdentityReviewTypedDataV1(material);
  const recovered = await withReviewedEip712BridgeV1(
    async ({ verifyTypedData }) =>
      verifyTypedData(
        data.domain,
        data.types,
        data.value,
        signature,
      ).toLowerCase(),
  );
  if (recovered !== expected) fail("review_signature_reviewer_mismatch");
  return recovered;
}

function attestationMaterialV1({
  manifest,
  controlEvidenceId,
  nowUnix,
  ttlSeconds,
  nonce,
}) {
  const reviewed = validateReviewableRelatedIdentityManifestV1(manifest);
  const role = reviewedReviewerRoleV1();

  const issued = decimal(nowUnix, "review_now_invalid");
  const ttl = decimal(ttlSeconds, "review_ttl_invalid");
  if (ttl < MIN_TTL_SECONDS || ttl > MAX_TTL_SECONDS) {
    fail("review_ttl_out_of_range");
  }
  const expires = issued + ttl;
  if (expires > (1n << 64n) - 1n) fail("review_expiry_invalid");
  if (typeof nonce !== "string" || !BYTES32.test(nonce)) {
    fail("review_nonce_invalid");
  }

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1,
    version: 1,
    reviewer_role_decision_id: role.decision_id,
    reviewer_address: role.reviewer_address,
    control_evidence_id: controlEvidenceId,
    manifest_id: reviewed.manifest_id,
    coupled_launch_id: reviewed.coupled_launch_id,
    concentration_policy_id: reviewed.concentration_policy_id,
    opening_window_id: reviewed.opening_window_id,
    eligible_cohort_root: reviewed.eligible_cohort_root,
    cluster_assignment_root: reviewed.cluster_assignment_root,
    evidence_manifest_root: reviewed.evidence_manifest_root,
    manifest_compiler_git_blob_sha1: currentManifestCompilerBlobV1(),
    issued_at_unix: issued.toString(),
    expires_at_unix: expires.toString(),
    nonce,
  });
}

export async function prepareWcVoidOpeningRelatedIdentityReviewAttestationV1({
  manifest,
  lineage,
  controlEvidence,
  nowUnix = Math.floor(Date.now() / 1000),
  ttlSeconds = 900,
  nonce = null,
} = {}) {
  const role = reviewedReviewerRoleV1();
  await verifyReviewManifestLineageV1(manifest, lineage);

  const fresh =
    await reverifyReviewedControlEvidenceV1({
      evidence: controlEvidence,
      nowUnix,
    });
  if (
    fresh.evidence_reverified !== true ||
    fresh.candidate_address.toLowerCase() !== role.reviewer_address
  ) {
    fail("review_control_evidence_reviewer_mismatch");
  }

  const nonceValue = nonce === null
    ? "0x" + crypto.randomBytes(32).toString("hex")
    : String(nonce);

  const material = attestationMaterialV1({
    manifest,
    controlEvidenceId: fresh.evidence_id,
    nowUnix,
    ttlSeconds,
    nonce: nonceValue,
  });
  const typedData = voidWcVoidRelatedIdentityReviewTypedDataV1(material);
  const typedDataDigest =
    await voidWcVoidRelatedIdentityReviewDigestV1(material);
  return Object.freeze({
    material,
    typed_data: typedData,
    typed_data_digest: typedDataDigest,
    signing_performed: false,
    review_attestation_verified: false,
    related_identity_truth_verified: false,
  });
}

export async function verifyWcVoidOpeningRelatedIdentityReviewAttestationV1({
  manifest,
  lineage,
  controlEvidence,
  material,
  signature,
  nowUnix = Math.floor(Date.now() / 1000),
} = {}) {
  const role = reviewedReviewerRoleV1();
  const reviewed = validateReviewableRelatedIdentityManifestV1(manifest);
  await verifyReviewManifestLineageV1(reviewed, lineage);

  const fresh =
    await reverifyReviewedControlEvidenceV1({
      evidence: controlEvidence,
      nowUnix,
    });
  if (
    fresh.evidence_reverified !== true ||
    fresh.candidate_address.toLowerCase() !== role.reviewer_address ||
    fresh.evidence_id !== material?.control_evidence_id
  ) {
    fail("review_control_evidence_reviewer_mismatch");
  }

  const expected = attestationMaterialV1({
    manifest: reviewed,
    controlEvidenceId: fresh.evidence_id,
    nowUnix: material?.issued_at_unix,
    ttlSeconds:
      decimal(material?.expires_at_unix, "review_expires_at_invalid") -
      decimal(material?.issued_at_unix, "review_issued_at_invalid"),
    nonce: material?.nonce,
  });
  if (
    canonicalReviewJsonV1(material) !==
    canonicalReviewJsonV1(expected)
  ) {
    fail("review_attestation_material_mismatch");
  }

  const now = decimal(nowUnix, "review_now_invalid");
  const issued = decimal(material.issued_at_unix, "review_issued_at_invalid");
  const expires = decimal(material.expires_at_unix, "review_expires_at_invalid");
  if (now < issued || now >= expires) fail("review_attestation_expired");

  const recovered = await verifyReviewSignatureForAddressV1({
    material,
    signature,
    expectedReviewerAddress: role.reviewer_address,
  });

  const resultMaterial = Object.freeze({
    marker:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIER_V1,
    version: 1,
    status: "RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIED",
    reviewer_role_decision_id: role.decision_id,
    reviewer_address: recovered,
    control_evidence_id: fresh.evidence_id,
    manifest_id: reviewed.manifest_id,
    coupled_launch_id: reviewed.coupled_launch_id,
    concentration_policy_id: reviewed.concentration_policy_id,
    opening_window_id: reviewed.opening_window_id,
    eligible_cohort_root: reviewed.eligible_cohort_root,
    cluster_assignment_root: reviewed.cluster_assignment_root,
    evidence_manifest_root: reviewed.evidence_manifest_root,
    manifest_compiler_git_blob_sha1:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1,
    review_attestation_verified: true,
    related_identity_truth_verified: true,
    opening_concentration_and_sybil_limits_ready: false,
    opening_price_acceptance_allowed: false,
    opening_price_acceptance_hold:
      "concentration_arithmetic_recheck_required",
    authority:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_AUTHORITY_V1,
  });

  return Object.freeze({
    ...resultMaterial,
    attestation_id:
      "voidwcria1_" +
      sha256(Buffer.from(canonicalReviewJsonV1(resultMaterial), "utf8")),
  });
}
