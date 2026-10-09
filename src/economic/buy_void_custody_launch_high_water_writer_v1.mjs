import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildBuyVoidCustodyLaunchHighWaterV2,
  classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2,
} from "./buy_void_custody_launch_authority_v2.mjs";

export const VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_V1 =
  "VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_V1";

export const VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_only_writer: true,
    startup_configured_paths: true,
    request_selected_paths: false,
    descriptor_bound_reads: true,
    fixed_high_water_filename: true,
    arbitrary_path_write: false,
    arbitrary_bytes_write: false,
    bootstrap_write_enabled: false,
    high_water_advance_write_enabled: true,
    inspect_temp_cleanup_enabled: false,
    unowned_temp_cleanup_enabled: false,
    cross_process_exclusive_writer_fence_verified: false,
    atomic_single_file_publication: true,
    directory_fsync: true,
    exact_postcheck: true,
    evidence_revalidated_before_replace: true,
    idempotent_current_generation: true,
    cross_root_atomicity_proven: false,
    post_admission_root_path_stability_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_mutation: false,
    presale_or_market_activation: false,
    funds_movement: false,
  });

const HIGH_WATER_NAME = "buy-void-custody-launch-high-water-v2.json";
const MAX_JOURNAL_BYTES = 64 * 1024;
const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
function fail(reason) {
  throw new Error("custody_launch_high_water_writer_" + reason);
}

function sha256Id(bytes) {
  return "sha256:" +
    crypto.createHash("sha256").update(bytes).digest("hex");
}

function absolutePath(value, reason) {
  if (typeof value !== "string") fail(reason);
  const raw = value.trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) fail(reason);
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) fail(reason);
  return resolved;
}

function normalizeOptions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("options_invalid");
  }
  const keys = Object.keys(raw).sort();
  const expected = [
    "activation_receipt_path",
    "custody_root",
    "generation_journal_path",
  ];
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    fail("options_invalid");
  }
  const generationJournalPath = absolutePath(
    raw.generation_journal_path,
    "generation_journal_path_invalid",
  );
  const activationReceiptPath = absolutePath(
    raw.activation_receipt_path,
    "activation_receipt_path_invalid",
  );
  const custodyRoot = absolutePath(
    raw.custody_root,
    "custody_root_invalid",
  );
  const highWaterPath = path.join(custodyRoot, HIGH_WATER_NAME);
  for (const observed of [generationJournalPath, activationReceiptPath]) {
    const relative = path.relative(custodyRoot, observed);
    if (
      relative === "" ||
      (!relative.startsWith(".." + path.sep) &&
        relative !== ".." &&
        !path.isAbsolute(relative))
    ) {
      fail("authority_path_inside_custody_root");
    }
  }
  if (generationJournalPath === activationReceiptPath) {
    fail("authority_paths_not_distinct");
  }
  return Object.freeze({
    generation_journal_path: generationJournalPath,
    activation_receipt_path: activationReceiptPath,
    custody_root: custodyRoot,
    high_water_path: highWaterPath,
  });
}

function requireDescriptorSafety() {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("descriptor_safety_unavailable");
  }
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function validateAncestor(stat, reason) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (
      (Number(stat.mode) & 0o022) !== 0 &&
      (Number(stat.mode) & 0o1000) === 0
    )
  ) {
    fail(reason);
  }
}

function validateReadDirectory(stat, reason) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (Number(stat.mode) & 0o022) !== 0
  ) {
    fail(reason);
  }
}

function validateCustodyDirectory(stat, reason) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    typeof process.getuid !== "function" ||
    stat.uid !== BigInt(process.getuid()) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(reason);
  }
}

function openPinnedDirectory(directoryPath, custody, reason) {
  requireDescriptorSafety();
  const resolved = absolutePath(directoryPath, reason + "_path_invalid");
  const visible = fs.lstatSync(resolved, { bigint: true });
  if (custody) validateCustodyDirectory(visible, reason + "_invalid");
  else validateReadDirectory(visible, reason + "_invalid");

  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  let fd = -1;
  try {
    fd = fs.openSync(
      parsed.root,
      fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
    );
    for (const part of parts) {
      validateAncestor(
        fs.fstatSync(fd, { bigint: true }),
        reason + "_ancestor_invalid",
      );
      if (!part || part === "." || part === "..") {
        fail(reason + "_ancestor_component_invalid");
      }
      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), part),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      fs.closeSync(fd);
      fd = next;
    }
    const opened = fs.fstatSync(fd, { bigint: true });
    if (custody) validateCustodyDirectory(opened, reason + "_invalid");
    else validateReadDirectory(opened, reason + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(reason + "_changed");
    }
    const result = Object.freeze({
      path: resolved,
      fd,
      proc_path: "/proc/self/fd/" + String(fd),
      stat: opened,
      custody,
    });
    fd = -1;
    return result;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("custody_launch_high_water_writer_")
    ) {
      throw error;
    }
    fail(reason + "_open_failed");
  } finally {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch {}
    }
  }
}

function closePinned(directory) {
  try { fs.closeSync(directory.fd); } catch {}
}

function assertPinnedVisible(directory, reason) {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  if (directory.custody) {
    validateCustodyDirectory(opened, reason + "_invalid");
    validateCustodyDirectory(visible, reason + "_invalid");
  } else {
    validateReadDirectory(opened, reason + "_invalid");
    validateReadDirectory(visible, reason + "_invalid");
  }
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(reason + "_changed");
  }
}

function validateReadFile(stat, maximum, reason, custody) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1n ||
    stat.size < 1n ||
    stat.size > BigInt(maximum) ||
    (Number(stat.mode) & 0o022) !== 0
  ) {
    fail(reason);
  }
  if (
    custody &&
    (
      typeof process.getuid !== "function" ||
      stat.uid !== BigInt(process.getuid()) ||
      (Number(stat.mode) & 0o077) !== 0
    )
  ) {
    fail(reason);
  }
}

function readPinnedNamedFile(directory, name, maximum, reason, custody) {
  if (!name || name.includes("/") || name === "." || name === "..") {
    fail(reason + "_name_invalid");
  }
  assertPinnedVisible(directory, reason + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
  validateReadFile(visibleBefore, maximum, reason + "_invalid", custody);
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateReadFile(opened, maximum, reason + "_invalid", custody);
    if (!sameFileIdentity(visibleBefore, opened)) {
      fail(reason + "_path_not_bound");
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size) || size < 1 || size > maximum) {
      fail(reason + "_size_invalid");
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        size - offset,
        offset,
      );
      if (count <= 0) fail(reason + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validateReadFile(after, maximum, reason + "_invalid", custody);
    validateReadFile(
      visibleAfter,
      maximum,
      reason + "_invalid",
      custody,
    );
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(reason + "_changed_during_read");
    }
    assertPinnedVisible(directory, reason + "_directory");
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function readOptionalCustodyHighWater(directory) {
  assertPinnedVisible(directory, "custody_root");
  const visible = path.join(directory.path, HIGH_WATER_NAME);
  const pinned = path.join(directory.proc_path, HIGH_WATER_NAME);
  let visibleMissing = false;
  let pinnedMissing = false;
  try { fs.lstatSync(visible, { bigint: true }); }
  catch (error) {
    if (error?.code !== "ENOENT") throw error;
    visibleMissing = true;
  }
  try { fs.lstatSync(pinned, { bigint: true }); }
  catch (error) {
    if (error?.code !== "ENOENT") throw error;
    pinnedMissing = true;
  }
  if (visibleMissing || pinnedMissing) {
    if (visibleMissing !== pinnedMissing) {
      fail("high_water_presence_mismatch");
    }
    assertPinnedVisible(directory, "custody_root");
    return null;
  }
  return readPinnedNamedFile(
    directory,
    HIGH_WATER_NAME,
    MAX_HIGH_WATER_BYTES,
    "high_water",
    true,
  );
}

function openEvidence(options) {
  const journalDirectory = openPinnedDirectory(
    path.dirname(options.generation_journal_path),
    false,
    "generation_journal_directory",
  );
  let receiptDirectory = null;
  let custodyDirectory = null;
  try {
    receiptDirectory = openPinnedDirectory(
      path.dirname(options.activation_receipt_path),
      false,
      "activation_receipt_directory",
    );
    custodyDirectory = openPinnedDirectory(
      options.custody_root,
      true,
      "custody_root",
    );
    return Object.freeze({
      journalDirectory,
      receiptDirectory,
      custodyDirectory,
      journalName: path.basename(options.generation_journal_path),
      receiptName: path.basename(options.activation_receipt_path),
    });
  } catch (error) {
    if (receiptDirectory) closePinned(receiptDirectory);
    closePinned(journalDirectory);
    throw error;
  }
}

function closeEvidence(evidence) {
  closePinned(evidence.custodyDirectory);
  closePinned(evidence.receiptDirectory);
  closePinned(evidence.journalDirectory);
}

function observedBytes(evidence) {
  return Object.freeze({
    generation_journal_bytes: readPinnedNamedFile(
      evidence.journalDirectory,
      evidence.journalName,
      MAX_JOURNAL_BYTES,
      "generation_journal",
      false,
    ),
    activation_receipt_bytes: readPinnedNamedFile(
      evidence.receiptDirectory,
      evidence.receiptName,
      MAX_RECEIPT_BYTES,
      "activation_receipt",
      false,
    ),
    custody_high_water_bytes:
      readOptionalCustodyHighWater(evidence.custodyDirectory),
  });
}

function sameOptionalBytes(left, right) {
  if (left === null || right === null) return left === right;
  return left.equals(right);
}

function sameObservation(left, right) {
  return (
    left.generation_journal_bytes.equals(
      right.generation_journal_bytes,
    ) &&
    left.activation_receipt_bytes.equals(
      right.activation_receipt_bytes,
    ) &&
    sameOptionalBytes(
      left.custody_high_water_bytes,
      right.custody_high_water_bytes,
    )
  );
}

function canonicalCandidate(decision) {
  if (
    !decision ||
    typeof decision !== "object" ||
    decision.ready !== false ||
    decision.reason !== "custody_launch_high_water_advance_required" ||
    typeof decision.candidate_high_water_json !== "string" ||
    !SHA256_ID.test(String(decision.candidate_high_water_sha256 || ""))
  ) {
    fail("advance_candidate_invalid");
  }
  const bytes = Buffer.from(decision.candidate_high_water_json, "utf8");
  if (bytes.length < 1 || bytes.length > MAX_HIGH_WATER_BYTES) {
    fail("advance_candidate_size_invalid");
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("advance_candidate_json_invalid");
  }
  const actualKeys = Object.keys(parsed).sort();
  const expectedKeys = [
    "generation",
    "journal_prefix_sha256",
    "marker",
    "sequence",
    "source_composition_id",
    "state",
    "tip_sha256",
    "version",
  ].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    fail("advance_candidate_shape_invalid");
  }
  const canonical = buildBuyVoidCustodyLaunchHighWaterV2(parsed);
  if (!canonical.equals(bytes)) fail("advance_candidate_noncanonical");
  if (sha256Id(bytes) !== decision.candidate_high_water_sha256) {
    fail("advance_candidate_digest_invalid");
  }
  return bytes;
}

// A temp may belong to another writer between fsync and fixed-name rename.
// Inspections and advances NEVER unlink unknown temps by name. Only the
// owner of an O_EXCL-created temp may remove that exact temp on failure.
// Recovery/reclamation needs a separately reviewed exclusive custody fence.
function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      null,
    );
    if (written <= 0) fail("temp_short_write");
    offset += written;
  }
}

function atomicAdvance(
  evidence,
  expectedCurrent,
  nextBytes,
  beforeReplaceHook,
  expectedObservation,
  onRenamed,
) {
  if (!Buffer.isBuffer(expectedCurrent)) fail("current_high_water_missing");
  const tempName =
    "." + HIGH_WATER_NAME + ".tmp-" + String(process.pid) + "-" +
    crypto.randomBytes(8).toString("hex");
  const tempPath = path.join(evidence.custodyDirectory.proc_path, tempName);
  const finalPath = path.join(
    evidence.custodyDirectory.proc_path,
    HIGH_WATER_NAME,
  );
  let fd = -1;
  let renamed = false;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    writeAll(fd, nextBytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;

    if (typeof beforeReplaceHook === "function") beforeReplaceHook();

    const reobserved = observedBytes(evidence);
    if (!sameObservation(expectedObservation, reobserved)) {
      fail("authority_changed_before_replace");
    }
    if (
      reobserved.custody_high_water_bytes === null ||
      !reobserved.custody_high_water_bytes.equals(expectedCurrent)
    ) {
      fail("high_water_changed_before_replace");
    }
    assertPinnedVisible(evidence.custodyDirectory, "custody_root");
    fs.renameSync(tempPath, finalPath);
    renamed = true;
    if (typeof onRenamed === "function") onRenamed();
    fs.fsyncSync(evidence.custodyDirectory.fd);
    assertPinnedVisible(evidence.custodyDirectory, "custody_root");
    const published = readPinnedNamedFile(
      evidence.custodyDirectory,
      HIGH_WATER_NAME,
      MAX_HIGH_WATER_BYTES,
      "high_water",
      true,
    );
    if (!published.equals(nextBytes)) fail("postcheck_failed");
    return published;
  } finally {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch {}
    }
    if (!renamed) {
      try {
        fs.unlinkSync(tempPath);
        fs.fsyncSync(evidence.custodyDirectory.fd);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          // A temp name is never authority; leave recovery to next call.
        }
      }
    }
  }
}

function held(reason, operationPerformed = false) {
  const raw = String(reason || "held");
  const prefix = "custody_launch_high_water_writer_";
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_V1,
    version: 1,
    reason: raw.startsWith(prefix) ? raw.slice(prefix.length) : raw,
    operation_performed: operationPerformed,
    bootstrap_write_performed: false,
    high_water_advance_performed: operationPerformed,
    runtime_integration: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1,
  });
}

function success(status, decision, operationPerformed) {
  return Object.freeze({
    ok: true,
    status,
    marker: VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_V1,
    version: 1,
    operation_performed: operationPerformed,
    bootstrap_write_performed: false,
    high_water_advance_performed: operationPerformed,
    sequence: decision.sequence ?? null,
    generation: decision.generation ?? null,
    tip_sha256: decision.tip_sha256 ?? null,
    candidate_high_water_sha256:
      decision.candidate_high_water_sha256 ?? null,
    runtime_integration: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1,
  });
}

function runWriter(options, classifier, mutate, beforeReplaceHook = null) {
  let mutation = false;
  let evidence = null;
  try {
    evidence = openEvidence(options);
    const before = observedBytes(evidence);
    const decision = classifier(before);
    if (
      decision?.ready === true &&
      decision?.high_water_matches_current === true &&
      decision?.high_water_advance_required === false
    ) {
      return success("current", decision, false);
    }
    if (
      decision?.reason ===
      "custody_launch_high_water_bootstrap_required"
    ) {
      return held("bootstrap_requires_separate_qualification", false);
    }
    if (
      !mutate ||
      decision?.reason !==
        "custody_launch_high_water_advance_required"
    ) {
      return held(
        String(decision?.reason || "authority_not_ready"),
        false,
      );
    }
    if (before.custody_high_water_bytes === null) {
      return held("bootstrap_requires_separate_qualification", false);
    }
    const nextBytes = canonicalCandidate(decision);
    atomicAdvance(
      evidence,
      before.custody_high_water_bytes,
      nextBytes,
      beforeReplaceHook,
      before,
      () => { mutation = true; },
    );
    const after = observedBytes(evidence);
    const post = classifier(after);
    if (
      post?.ready !== true ||
      post?.high_water_matches_current !== true ||
      post?.high_water_advance_required !== false
    ) {
      return held("post_advance_authority_not_ready", true);
    }
    return success("advanced", post, true);
  } catch (error) {
    return held(
      error instanceof Error ? error.message : "writer_failed",
      mutation,
    );
  } finally {
    if (evidence) closeEvidence(evidence);
  }
}

export function createBuyVoidCustodyLaunchHighWaterWriterV1(rawOptions) {
  const options = normalizeOptions(rawOptions);
  return Object.freeze({
    inspect() {
      return runWriter(
        options,
        classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2,
        false,
      );
    },
    advance() {
      return runWriter(
        options,
        classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2,
        true,
      );
    },
    authority:
      VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_AUTHORITY_V1,
  });
}

export function createBuyVoidCustodyLaunchHighWaterWriterFromEnvV1(
  env = process.env,
) {
  const dataDir = absolutePath(
    String(env.DATA_DIR || env.VOID_DATA_DIR || ""),
    "data_dir_invalid",
  );
  const receiptPath = absolutePath(
    String(env.VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH || ""),
    "activation_receipt_path_invalid",
  );
  const custodyRoot = absolutePath(
    String(env.VOID_BUY_VOID_CUSTODY_LAUNCH_ROOT_V1 || ""),
    "custody_root_invalid",
  );
  return createBuyVoidCustodyLaunchHighWaterWriterV1({
    generation_journal_path: path.join(
      dataDir,
      "economic",
      "buy-void-coupled-live-generation-v1.jsonl",
    ),
    activation_receipt_path: receiptPath,
    custody_root: custodyRoot,
  });
}

export function testOnlyCreateBuyVoidCustodyLaunchHighWaterWriterV1(
  rawOptions,
  classifier,
  beforeReplaceHook = null,
) {
  const options = normalizeOptions(rawOptions);
  if (typeof classifier !== "function") fail("test_classifier_required");
  return Object.freeze({
    inspect() {
      return runWriter(options, classifier, false);
    },
    advance() {
      return runWriter(
        options,
        classifier,
        true,
        beforeReplaceHook,
      );
    },
  });
}

export const VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_CONTRACT_V1 =
  Object.freeze({
    marker: VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_WRITER_V1,
    version: 1,
    high_water_filename: HIGH_WATER_NAME,
    bootstrap_write_enabled: false,
    high_water_advance_write_enabled: true,
    inspect_temp_cleanup_enabled: false,
    unowned_temp_cleanup_enabled: false,
    cross_process_exclusive_writer_fence_verified: false,
    startup_configured_paths: true,
    request_selected_paths: false,
    arbitrary_path_write: false,
    arbitrary_bytes_write: false,
    runtime_integration: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_movement: false,
  });
