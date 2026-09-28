#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1";
export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_CONFIRMATION_V1 =
  "publishExactVoidEpoch2StateManifest";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_AUTHORITY_V1 =
  Object.freeze({
    local_source_read: true,
    public_artifact_write_only_when_explicitly_requested: true,
    network_call: false,
    rpc_call: false,
    process_start: false,
    service_action: false,
    credential_content_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation: false,
  });

const MAX_BYTES = 16 * 1024 * 1024;

const PRODUCTION_PROFILE = Object.freeze({
  expected_filename:
    "void_economic_epoch2_client_neutral_state_manifest_v1_20260926T211912Z.json",
  expected_file_sha256:
    "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9",
  expected_material_sha256:
    "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f",
  target_relative:
    "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
});

export class VoidEconomicEpoch2PublicStateManifestPublisherHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2PublicStateManifestPublisherHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2PublicStateManifestPublisherHoldV1(
    reason,
    detail,
  );
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function assertProfile(profile) {
  if (
    !profile ||
    typeof profile !== "object" ||
    Array.isArray(profile) ||
    typeof profile.expected_filename !== "string" ||
    path.basename(profile.expected_filename) !== profile.expected_filename ||
    !/^[0-9a-f]{64}$/.test(profile.expected_file_sha256) ||
    !/^[0-9a-f]{64}$/.test(profile.expected_material_sha256) ||
    typeof profile.target_relative !== "string" ||
    profile.target_relative.startsWith("/") ||
    profile.target_relative.includes("..")
  ) {
    hold("publisher_profile_invalid");
  }
  return profile;
}

function openSourceManifestBoundToAncestors(sourcePath) {
  if (
    process.platform !== "linux" ||
    typeof fs.constants.O_NOFOLLOW !== "number" ||
    typeof fs.constants.O_DIRECTORY !== "number" ||
    typeof fs.constants.O_NONBLOCK !== "number"
  ) {
    hold("source_manifest_descriptor_walk_unavailable");
  }

  const resolved = path.resolve(sourcePath);
  const parsed = path.parse(resolved);
  const segments = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  if (parsed.root !== path.sep || segments.length === 0) {
    hold("source_manifest_path_invalid");
  }

  let directoryFd = null;
  try {
    try {
      directoryFd = fs.openSync(
        parsed.root,
        fs.constants.O_RDONLY |
          fs.constants.O_DIRECTORY |
          fs.constants.O_NOFOLLOW,
      );
    } catch {
      hold("source_manifest_path_root_open_failed");
    }

    for (const segment of segments.slice(0, -1)) {
      const anchored = `/proc/self/fd/${directoryFd}/${segment}`;
      let nextFd = null;
      try {
        nextFd = fs.openSync(
          anchored,
          fs.constants.O_RDONLY |
            fs.constants.O_DIRECTORY |
            fs.constants.O_NOFOLLOW,
        );
        if (!fs.fstatSync(nextFd).isDirectory()) {
          hold("source_manifest_path_component_not_directory", { segment });
        }
      } catch (error) {
        if (nextFd !== null) {
          try {
            fs.closeSync(nextFd);
          } catch (closeError) {
            void closeError;
          }
        }
        if (error instanceof VoidEconomicEpoch2PublicStateManifestPublisherHoldV1) {
          throw error;
        }
        hold("source_manifest_path_component_invalid", {
          segment,
          code: error?.code ?? null,
        });
      }

      try {
        fs.closeSync(directoryFd);
      } catch (closeError) {
        void closeError;
      }
      directoryFd = nextFd;
    }

    const basename = segments.at(-1);
    const anchoredFile = `/proc/self/fd/${directoryFd}/${basename}`;
    try {
      return fs.openSync(
        anchoredFile,
        fs.constants.O_RDONLY |
          fs.constants.O_NOFOLLOW |
          fs.constants.O_NONBLOCK,
      );
    } catch (error) {
      hold("source_manifest_open_failed", {
        code: error?.code ?? null,
      });
    }
  } finally {
    if (directoryFd !== null) {
      try {
        fs.closeSync(directoryFd);
      } catch (closeError) {
        void closeError;
      }
    }
  }
}

function readBoundedSourceManifest(sourcePath) {
  let fd = null;
  try {
    fd = openSourceManifestBoundToAncestors(sourcePath);
    const before = fs.fstatSync(fd);
    if (!before.isFile()) {
      hold("source_manifest_not_direct_regular_file");
    }
    if (before.size < 2 || before.size > MAX_BYTES) {
      hold("source_manifest_size_out_of_bounds", { size_bytes: before.size });
    }

    const buffer = Buffer.allocUnsafe(before.size);
    let total = 0;
    while (total < buffer.length) {
      const count = fs.readSync(
        fd,
        buffer,
        total,
        buffer.length - total,
        total,
      );
      if (count === 0) break;
      total += count;
    }
    if (total !== before.size) {
      hold("source_manifest_changed_during_read");
    }

    const after = fs.fstatSync(fd);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs
    ) {
      hold("source_manifest_changed_during_read");
    }

    return Buffer.from(buffer.subarray(0, total));
  } catch (error) {
    if (error instanceof VoidEconomicEpoch2PublicStateManifestPublisherHoldV1) {
      throw error;
    }
    hold("source_manifest_content_read_failed");
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
        void closeError;
      }
    }
  }
}

function validateManifest(raw, sourcePath, rawProfile) {
  const profile = assertProfile(rawProfile);
  if (path.basename(sourcePath) !== profile.expected_filename) {
    hold("source_manifest_filename_mismatch");
  }
  if (sha256(raw) !== profile.expected_file_sha256) {
    hold("source_manifest_file_sha256_mismatch");
  }

  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    hold("source_manifest_json_invalid");
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.marker !== "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1" ||
    value.version !== 1 ||
    value.status !== "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN" ||
    value.manifest_material_sha256 !== profile.expected_material_sha256 ||
    value.chain_id !== 2050 ||
    value.execution_epoch !== 2 ||
    !Array.isArray(value.accounts) ||
    value.accounts.length !== 4
  ) {
    hold("source_manifest_identity_mismatch");
  }

  if (
    value.migration_authorized !== false ||
    value.public_activation_authorized !== false
  ) {
    hold("source_manifest_authority_boundary_mismatch");
  }

  return Object.freeze({
    marker: value.marker,
    version: value.version,
    status: value.status,
    chain_id: value.chain_id,
    execution_epoch: value.execution_epoch,
    manifest_material_sha256: value.manifest_material_sha256,
    account_count: value.accounts.length,
  });
}

function ensureParentDirectory(repoRoot, targetRelative) {
  const parent = path.join(repoRoot, path.dirname(targetRelative));
  let stat;
  try {
    stat = fs.lstatSync(parent);
  } catch {
    hold("public_evidence_parent_missing");
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    hold("public_evidence_parent_invalid");
  }
  if (fs.realpathSync(parent) !== parent) {
    hold("public_evidence_parent_realpath_mismatch");
  }
  return parent;
}

function openValidatedPublicEvidenceDirectory(parent) {
  if (
    process.platform !== "linux" ||
    typeof fs.constants.O_DIRECTORY !== "number" ||
    typeof fs.constants.O_NOFOLLOW !== "number"
  ) {
    hold("public_evidence_directory_open_flags_unavailable");
  }
  let fd = null;
  try {
    fd = fs.openSync(
      parent,
      fs.constants.O_RDONLY |
        fs.constants.O_DIRECTORY |
        fs.constants.O_NOFOLLOW,
    );
    const stat = fs.fstatSync(fd);
    if (!stat.isDirectory()) {
      hold("public_evidence_parent_invalid");
    }
    const fdPath = `/proc/self/fd/${fd}`;
    if (!fs.existsSync(fdPath)) {
      hold("public_evidence_descriptor_path_unavailable");
    }
    const canonical = fs.realpathSync(fdPath);
    if (canonical !== parent) {
      hold("public_evidence_parent_realpath_mismatch");
    }
    return Object.freeze({ fd, fdPath, dev: stat.dev, ino: stat.ino });
  } catch (error) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (closeError) { void closeError; }
    }
    if (error instanceof VoidEconomicEpoch2PublicStateManifestPublisherHoldV1) {
      throw error;
    }
    hold("public_evidence_parent_descriptor_open_failed");
  }
}

function readBoundedRegularThroughHeldDirectory(
  opened,
  basename,
  {
    openFailureReason,
    typeFailureReason,
    sizeFailureReason,
    changedFailureReason,
  },
) {
  if (
    typeof fs.constants.O_NOFOLLOW !== "number" ||
    typeof fs.constants.O_NONBLOCK !== "number"
  ) {
    hold("public_target_open_flags_unavailable");
  }

  const anchoredTarget = path.join(opened.fdPath, basename);
  let fd = null;
  try {
    try {
      fd = fs.openSync(
        anchoredTarget,
        fs.constants.O_RDONLY |
          fs.constants.O_NOFOLLOW |
          fs.constants.O_NONBLOCK,
      );
    } catch {
      hold(openFailureReason);
    }

    const before = fs.fstatSync(fd);
    if (!before.isFile()) {
      hold(typeFailureReason);
    }
    if (before.size < 2 || before.size > MAX_BYTES) {
      hold(sizeFailureReason, { size_bytes: before.size });
    }

    const buffer = Buffer.allocUnsafe(before.size);
    let total = 0;
    while (total < buffer.length) {
      const count = fs.readSync(
        fd,
        buffer,
        total,
        buffer.length - total,
        total,
      );
      if (count === 0) break;
      total += count;
    }
    if (total !== before.size) {
      hold(changedFailureReason);
    }

    const after = fs.fstatSync(fd);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs
    ) {
      hold(changedFailureReason);
    }

    return Buffer.from(buffer.subarray(0, total));
  } catch (error) {
    if (error instanceof VoidEconomicEpoch2PublicStateManifestPublisherHoldV1) {
      throw error;
    }
    hold(openFailureReason);
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
        void closeError;
      }
    }
  }
}

function atomicCreateExact(
  target,
  raw,
  rawProfile,
  { afterParentOpen = null } = {},
) {
  const profile = assertProfile(rawProfile);
  const parent = path.dirname(target);
  const basename = path.basename(target);
  const opened = openValidatedPublicEvidenceDirectory(parent);
  const temporaryName =
    "." + basename + ".tmp-" + process.pid + "-" +
    crypto.randomBytes(8).toString("hex");
  const temporary = path.join(opened.fdPath, temporaryName);
  const anchoredTarget = path.join(opened.fdPath, basename);

  let tempFd = null;
  let outcome = null;
  let targetContentFsyncConfirmed = false;
  let directoryFsyncConfirmed = false;
  let parentIdentityStableAfterWrite = true;
  try {
    if (afterParentOpen !== null) {
      if (typeof afterParentOpen !== "function") {
        hold("publisher_after_parent_open_hook_invalid");
      }
      afterParentOpen();
    }

    if (fs.realpathSync(opened.fdPath) !== parent) {
      hold("public_evidence_parent_changed_before_write");
    }

    tempFd = fs.openSync(temporary, "wx", 0o644);
    try {
      fs.writeFileSync(tempFd, raw);
      fs.fsyncSync(tempFd);
    } finally {
      fs.closeSync(tempFd);
      tempFd = null;
    }

    try {
      fs.linkSync(temporary, anchoredTarget);
      outcome = "created";
      targetContentFsyncConfirmed = true;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;

      const existing = readBoundedRegularThroughHeldDirectory(
        opened,
        basename,
        {
          openFailureReason: "public_target_existing_metadata_unreadable",
          typeFailureReason: "public_target_existing_not_direct_regular_file",
          sizeFailureReason: "public_target_existing_size_out_of_bounds",
          changedFailureReason: "public_target_existing_changed_during_read",
        },
      );
      if (sha256(existing) !== profile.expected_file_sha256) {
        hold("public_target_exists_with_different_bytes");
      }
      outcome = "already_exact";
    }

    try {
      fs.fsyncSync(opened.fd);
      directoryFsyncConfirmed = true;
    } catch (fsyncError) {
      void fsyncError;
      directoryFsyncConfirmed = false;
    }

    const published = readBoundedRegularThroughHeldDirectory(
      opened,
      basename,
      {
        openFailureReason: "published_manifest_read_failed",
        typeFailureReason: "published_manifest_not_direct_regular_file",
        sizeFailureReason: "published_manifest_size_out_of_bounds",
        changedFailureReason: "published_manifest_changed_during_read",
      },
    );
    const publishedSha256 = sha256(published);
    if (publishedSha256 !== profile.expected_file_sha256) {
      hold("published_manifest_sha256_mismatch");
    }

    try {
      parentIdentityStableAfterWrite =
        fs.realpathSync(opened.fdPath) === parent;
    } catch {
      parentIdentityStableAfterWrite = false;
    }

    return Object.freeze({
      outcome,
      published_sha256: publishedSha256,
      target_content_fsync_confirmed: targetContentFsyncConfirmed,
      directory_fsync_confirmed: directoryFsyncConfirmed,
      parent_identity_stable_after_write: parentIdentityStableAfterWrite,
    });
  } finally {
    if (tempFd !== null) {
      try { fs.closeSync(tempFd); } catch (closeError) { void closeError; }
    }
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        // Cleanup failure cannot erase or upgrade an already published artifact.
      }
    }
    try { fs.closeSync(opened.fd); } catch (closeError) { void closeError; }
  }
}

function qualifyCore({ repoRoot, sourcePath, profile }) {
  assertProfile(profile);
  if (
    typeof repoRoot !== "string" ||
    !path.isAbsolute(repoRoot) ||
    typeof sourcePath !== "string" ||
    !path.isAbsolute(sourcePath)
  ) {
    hold("absolute_paths_required");
  }
  const canonicalRepo = fs.realpathSync(repoRoot);
  if (canonicalRepo !== path.resolve(repoRoot)) {
    hold("repo_root_realpath_mismatch");
  }
  const repoStat = fs.lstatSync(canonicalRepo);
  if (!repoStat.isDirectory() || repoStat.isSymbolicLink()) {
    hold("repo_root_invalid");
  }

  const raw = readBoundedSourceManifest(sourcePath);
  const identity = validateManifest(raw, sourcePath, profile);
  const parent = ensureParentDirectory(canonicalRepo, profile.target_relative);
  const target = path.join(canonicalRepo, profile.target_relative);
  if (path.dirname(target) !== parent) {
    hold("public_target_parent_mismatch");
  }

  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1,
    status: "QUALIFIED_EXACT_PUBLICATION_ARTIFACT_NOT_WRITTEN",
    source_path: sourcePath,
    source_filename: path.basename(sourcePath),
    source_file_sha256: profile.expected_file_sha256,
    source_material_sha256: profile.expected_material_sha256,
    public_target_relative_path: profile.target_relative,
    public_target_absolute_path: target,
    identity,
    successor_genesis_or_state_manifest_public_evidence_ready: false,
    filesystem_write_performed: false,
    migration_authorized: false,
    public_activation_authorized: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_AUTHORITY_V1,
  });
}

function publishCore({
  repoRoot,
  sourcePath,
  explicitPublish,
  profile,
  afterQualification = null,
  afterParentOpen = null,
}) {
  if (explicitPublish !== true) {
    hold("explicit_publish_confirmation_required");
  }
  const qualified = qualifyCore({
    repoRoot,
    sourcePath,
    profile,
  });

  if (afterQualification !== null) {
    if (typeof afterQualification !== "function") {
      hold("publisher_after_qualification_hook_invalid");
    }
    afterQualification();
  }

  // Re-open and fully re-validate the exact bytes immediately before the
  // create-once publication step. Qualification is review evidence, not a
  // lease on mutable source bytes.
  const raw = readBoundedSourceManifest(sourcePath);
  validateManifest(raw, sourcePath, profile);

  const publication = atomicCreateExact(
    qualified.public_target_absolute_path,
    raw,
    profile,
    { afterParentOpen },
  );

  const stablePublication =
    publication.target_content_fsync_confirmed === true &&
    publication.directory_fsync_confirmed === true &&
    publication.parent_identity_stable_after_write === true;

  return Object.freeze({
    ...qualified,
    status: stablePublication
      ? "EXACT_PUBLICATION_ARTIFACT_WRITTEN_REVIEW_REQUIRED"
      : "EXACT_PUBLICATION_ARTIFACT_WRITTEN_FILESYSTEM_REVIEW_REQUIRED",
    publication_outcome: publication.outcome,
    published_sha256: publication.published_sha256,
    target_content_fsync_confirmed:
      publication.target_content_fsync_confirmed,
    directory_fsync_confirmed: publication.directory_fsync_confirmed,
    parent_identity_stable_after_write:
      publication.parent_identity_stable_after_write,
    filesystem_write_performed: publication.outcome === "created",
    successor_genesis_or_state_manifest_public_evidence_ready: false,
    next_gate: stablePublication
      ? "commit_exact_public_artifact_then_verify_public_route_before_gate_promotion"
      : "review_local_publication_filesystem_state_before_any_followup",
  });
}

export function qualifyVoidEconomicEpoch2PublicStateManifestV1({
  repoRoot,
  sourcePath,
}) {
  return qualifyCore({
    repoRoot,
    sourcePath,
    profile: PRODUCTION_PROFILE,
  });
}

export function publishVoidEconomicEpoch2PublicStateManifestV1({
  repoRoot,
  sourcePath,
  explicitPublish,
}) {
  return publishCore({
    repoRoot,
    sourcePath,
    explicitPublish,
    profile: PRODUCTION_PROFILE,
  });
}

export function runVoidEconomicEpoch2PublicStateManifestPublisherSelfTestV1() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-epoch2-state-publisher-selftest-"),
  );
  try {
    const repoA = path.join(root, "repo-a");
    const repoB = path.join(root, "repo-b");
    const sourceDir = path.join(root, "source");
    const targetRelative =
      "public/public-node/evidence/proof-epoch2-state-manifest.json";
    const targetDirRelative = path.dirname(targetRelative);

    for (const repoRoot of [repoA, repoB]) {
      fs.mkdirSync(path.join(repoRoot, targetDirRelative), {
        recursive: true,
        mode: 0o755,
      });
    }
    fs.mkdirSync(sourceDir, { recursive: true, mode: 0o700 });

    const materialSha = "a".repeat(64);
    const fixture = Object.freeze({
      marker: "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1",
      version: 1,
      status: "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN",
      manifest_material_sha256: materialSha,
      chain_id: 2050,
      execution_epoch: 2,
      accounts: [{}, {}, {}, {}],
      migration_authorized: false,
      public_activation_authorized: false,
    });
    const raw = Buffer.from(JSON.stringify(fixture) + "\n", "utf8");
    const filename = "void-proof-epoch2-state-manifest.json";
    const sourcePath = path.join(sourceDir, filename);
    fs.writeFileSync(sourcePath, raw, { mode: 0o600 });

    const profile = Object.freeze({
      expected_filename: filename,
      expected_file_sha256: sha256(raw),
      expected_material_sha256: materialSha,
      target_relative: targetRelative,
    });

    const sourceAncestorAlias = path.join(root, "source-ancestor-alias");
    fs.symlinkSync(sourceDir, sourceAncestorAlias, "dir");
    let sourceAncestorSymlinkReason = null;
    try {
      qualifyCore({
        repoRoot: repoA,
        sourcePath: path.join(sourceAncestorAlias, filename),
        profile,
      });
    } catch (error) {
      if (
        error instanceof
          VoidEconomicEpoch2PublicStateManifestPublisherHoldV1
      ) {
        sourceAncestorSymlinkReason = error.reason;
      } else {
        throw error;
      }
    }

    const sourceFinalLinkDir = path.join(root, "source-final-link");
    fs.mkdirSync(sourceFinalLinkDir, { recursive: true, mode: 0o700 });
    const sourceFinalLink = path.join(sourceFinalLinkDir, filename);
    fs.symlinkSync(sourcePath, sourceFinalLink);
    let sourceFinalSymlinkReason = null;
    try {
      qualifyCore({
        repoRoot: repoA,
        sourcePath: sourceFinalLink,
        profile,
      });
    } catch (error) {
      if (
        error instanceof
          VoidEconomicEpoch2PublicStateManifestPublisherHoldV1
      ) {
        sourceFinalSymlinkReason = error.reason;
      } else {
        throw error;
      }
    }

    const qualified = qualifyCore({
      repoRoot: repoA,
      sourcePath,
      profile,
    });
    const first = publishCore({
      repoRoot: repoA,
      sourcePath,
      explicitPublish: true,
      profile,
    });
    const repeat = publishCore({
      repoRoot: repoA,
      sourcePath,
      explicitPublish: true,
      profile,
    });

    const conflictTarget = path.join(repoB, targetRelative);
    fs.writeFileSync(conflictTarget, "different-bytes\n", { mode: 0o644 });
    let conflictReason = null;
    try {
      publishCore({
        repoRoot: repoB,
        sourcePath,
        explicitPublish: true,
        profile,
      });
    } catch (error) {
      if (
        error instanceof
          VoidEconomicEpoch2PublicStateManifestPublisherHoldV1
      ) {
        conflictReason = error.reason;
      } else {
        throw error;
      }
    }

    const repoC = path.join(root, "repo-c");
    fs.mkdirSync(path.join(repoC, targetDirRelative), {
      recursive: true,
      mode: 0o755,
    });
    let mutationReason = null;
    try {
      publishCore({
        repoRoot: repoC,
        sourcePath,
        explicitPublish: true,
        profile,
        afterQualification: () => {
          fs.writeFileSync(
            sourcePath,
            Buffer.from(JSON.stringify({ ...fixture, status: "MUTATED" }) + "\n"),
            { mode: 0o600 },
          );
        },
      });
    } catch (error) {
      if (
        error instanceof
          VoidEconomicEpoch2PublicStateManifestPublisherHoldV1
      ) {
        mutationReason = error.reason;
      } else {
        throw error;
      }
    } finally {
      fs.writeFileSync(sourcePath, raw, { mode: 0o600 });
    }
    const mutationTargetExists = fs.existsSync(
      path.join(repoC, targetRelative),
    );

    const repoE = path.join(root, "repo-e");
    const repoEParent = path.join(repoE, targetDirRelative);
    const externalExact = path.join(root, "external-exact.json");
    fs.mkdirSync(repoEParent, { recursive: true, mode: 0o755 });
    fs.writeFileSync(externalExact, raw, { mode: 0o644 });
    fs.symlinkSync(
      externalExact,
      path.join(repoE, targetRelative),
    );
    let existingSymlinkReason = null;
    try {
      publishCore({
        repoRoot: repoE,
        sourcePath,
        explicitPublish: true,
        profile,
      });
    } catch (error) {
      if (
        error instanceof
          VoidEconomicEpoch2PublicStateManifestPublisherHoldV1
      ) {
        existingSymlinkReason = error.reason;
      } else {
        throw error;
      }
    }
    const externalExactUnchanged =
      Buffer.compare(fs.readFileSync(externalExact), raw) === 0;

    const repoD = path.join(root, "repo-d");
    const repoDParent = path.join(repoD, targetDirRelative);
    const heldParent = path.join(repoD, "public", "public-node", "evidence-held");
    const replacementOutside = path.join(root, "replacement-outside");
    fs.mkdirSync(repoDParent, { recursive: true, mode: 0o755 });
    fs.mkdirSync(replacementOutside, { recursive: true, mode: 0o755 });

    let parentRaceReason = null;
    try {
      publishCore({
        repoRoot: repoD,
        sourcePath,
        explicitPublish: true,
        profile,
        afterParentOpen: () => {
          fs.renameSync(repoDParent, heldParent);
          fs.symlinkSync(replacementOutside, repoDParent, "dir");
        },
      });
    } catch (error) {
      if (
        error instanceof
          VoidEconomicEpoch2PublicStateManifestPublisherHoldV1
      ) {
        parentRaceReason = error.reason;
      } else {
        throw error;
      }
    }
    const heldParentTargetCreated = fs.existsSync(
      path.join(heldParent, path.basename(targetRelative)),
    );
    const replacementOutsideTargetCreated = fs.existsSync(
      path.join(replacementOutside, path.basename(targetRelative)),
    );

    const published = fs.readFileSync(
      path.join(repoA, targetRelative),
    );

    return Object.freeze({
      marker:
        "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_SELF_TEST_V1",
      qualified_status: qualified.status,
      source_ancestor_symlink_reason: sourceAncestorSymlinkReason,
      source_final_symlink_reason: sourceFinalSymlinkReason,
      first_publication_outcome: first.publication_outcome,
      first_filesystem_write_performed: first.filesystem_write_performed,
      repeat_publication_outcome: repeat.publication_outcome,
      repeat_filesystem_write_performed: repeat.filesystem_write_performed,
      conflict_reason: conflictReason,
      source_mutation_after_qualification_reason: mutationReason,
      source_mutation_target_created: mutationTargetExists,
      existing_symlink_target_reason: existingSymlinkReason,
      existing_symlink_external_bytes_unchanged: externalExactUnchanged,
      parent_replacement_race_reason: parentRaceReason,
      parent_replacement_held_target_created: heldParentTargetCreated,
      parent_replacement_outside_target_created: replacementOutsideTargetCreated,
      first_target_content_fsync_confirmed:
        first.target_content_fsync_confirmed,
      repeat_target_content_fsync_confirmed:
        repeat.target_content_fsync_confirmed,
      first_directory_fsync_confirmed: first.directory_fsync_confirmed,
      repeat_directory_fsync_confirmed: repeat.directory_fsync_confirmed,
      repeat_status: repeat.status,
      repeat_next_gate: repeat.next_gate,
      first_parent_identity_stable_after_write:
        first.parent_identity_stable_after_write,
      published_bytes_exact: Buffer.compare(published, raw) === 0,
      published_sha256: sha256(published),
      expected_sha256: profile.expected_file_sha256,
      successor_genesis_or_state_manifest_public_evidence_ready:
        first.successor_genesis_or_state_manifest_public_evidence_ready,
      migration_authorized: first.migration_authorized,
      public_activation_authorized: first.public_activation_authorized,
      funds_movement: first.funds_movement,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function parseCliArgs(argv) {
  const out = {
    repoRoot: "",
    sourcePath: "",
    publish: false,
    confirmation: "",
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--repo-root") {
      if (!argv[index + 1]) hold("repo_root_value_missing");
      out.repoRoot = argv[++index];
    } else if (key === "--source") {
      if (!argv[index + 1]) hold("source_path_value_missing");
      out.sourcePath = argv[++index];
    } else if (key === "--publish") {
      out.publish = true;
    } else if (key === "--confirmation") {
      if (!argv[index + 1]) hold("confirmation_value_missing");
      out.confirmation = argv[++index];
    } else if (key === "--help") {
      out.help = true;
    } else {
      hold("unknown_argument", { key });
    }
  }
  return out;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      JSON.stringify(
        {
          marker: VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1,
          status: "PLAN_READY",
          mode_default: "qualify_only",
          publish_flag: "--publish",
          required_confirmation:
            VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_CONFIRMATION_V1,
          target_relative: PRODUCTION_PROFILE.target_relative,
          successor_genesis_or_state_manifest_public_evidence_ready: false,
          authority:
            VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_AUTHORITY_V1,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (!args.repoRoot) hold("repo_root_required");
  if (!args.sourcePath) hold("source_path_required");

  let result;
  if (args.publish) {
    if (
      args.confirmation !==
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_CONFIRMATION_V1
    ) {
      hold("explicit_publish_confirmation_required");
    }
    result = publishVoidEconomicEpoch2PublicStateManifestV1({
      repoRoot: args.repoRoot,
      sourcePath: args.sourcePath,
      explicitPublish: true,
    });
  } else {
    if (args.confirmation) {
      hold("confirmation_without_publish_rejected");
    }
    result = qualifyVoidEconomicEpoch2PublicStateManifestV1({
      repoRoot: args.repoRoot,
      sourcePath: args.sourcePath,
    });
  }

  process.stdout.write(
    JSON.stringify(
      {
        marker: result.marker,
        status: result.status,
        publication_outcome: result.publication_outcome ?? null,
        filesystem_write_performed: result.filesystem_write_performed,
        published_sha256: result.published_sha256 ?? null,
        target_content_fsync_confirmed:
          result.target_content_fsync_confirmed ?? null,
        directory_fsync_confirmed: result.directory_fsync_confirmed ?? null,
        parent_identity_stable_after_write:
          result.parent_identity_stable_after_write ?? null,
        next_gate: result.next_gate ?? null,
        source_file_sha256: result.source_file_sha256,
        public_target_relative_path: result.public_target_relative_path,
        successor_genesis_or_state_manifest_public_evidence_ready:
          result.successor_genesis_or_state_manifest_public_evidence_ready,
        migration_authorized: result.migration_authorized,
        public_activation_authorized: result.public_activation_authorized,
        funds_movement: result.funds_movement,
        authority: result.authority,
      },
      null,
      2,
    ) + "\n",
  );
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (invoked) {
  main().catch((error) => {
    const reason =
      error instanceof VoidEconomicEpoch2PublicStateManifestPublisherHoldV1
        ? error.reason
        : String(error?.message || error);
    const detail =
      error instanceof VoidEconomicEpoch2PublicStateManifestPublisherHoldV1 &&
      error.detail !== null
        ? " detail=" + JSON.stringify(error.detail)
        : "";
    process.stderr.write(
      VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1 +
        "_HOLD reason=" + reason + detail + "\n",
    );
    process.exitCode = 2;
  });
}
