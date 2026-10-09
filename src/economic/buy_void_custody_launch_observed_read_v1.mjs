import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_V1 =
  "VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_V1";

export const VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_POLICY_V1 =
  Object.freeze({
    source_only_descriptor_reader: true,
    linux_procfs_dirfd_required: true,
    review_root_anchoring_required: true,
    caller_provided_root_authority: false,
    server_path_configuration_verified: false,
    same_uid_custody_private_high_water_required: true,
    cross_uid_permissions_qualified: false,
    source_gate_verified: false,
    receipt_signature_verified: false,
    cross_file_atomic_snapshot_verified: false,
    custody_high_water_writer_enabled: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    service_mounted: false,
    production_allocation_mutation_ready: false,
    presale_or_market_activation: false,
    funds_movement: false,
  });

const JOURNAL_NAME = "buy-void-coupled-live-generation-v1.jsonl";
const MAX_JOURNAL = 64 * 1024;
const MAX_RECEIPT = 64 * 1024;
const MAX_HIGH_WATER = 16 * 1024;

const sha256 = bytes =>
  "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
const identity = (a, b) =>
  a.dev === b.dev && a.ino === b.ino && a.mode === b.mode &&
  a.nlink === b.nlink && a.size === b.size &&
  a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

function hold(reason) {
  return Object.freeze({
    marker: VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_V1,
    version: 1,
    observed: false,
    reason,
    journal_bytes: null,
    activation_receipt_bytes: null,
    custody_high_water_bytes: null,
    source_gate_verified: false,
    receipt_signature_verified: false,
    cross_uid_permissions_qualified: false,
    cross_file_atomic_snapshot_verified: false,
    server_path_configuration_verified: false,
    custody_high_water_write_performed: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_movement: false,
  });
}

function assertSafeAbsolute(value, label) {
  if (typeof value !== "string" ||
      !path.isAbsolute(value) || value !== path.resolve(value) ||
      value === "/" || value.includes("\0") || value.includes("//")) {
    throw new Error(label + "_absolute_path_invalid");
  }
  const components = value.split("/").slice(1);
  if (components.some(part => !/^[A-Za-z0-9_.-]+$/u.test(part) ||
      part === "." || part === "..")) {
    throw new Error(label + "_components_invalid");
  }
  return value;
}

function readBoundLinuxFile(absolute, maxBytes, privateCustody = false) {
  if (process.platform !== "linux" ||
      !Number.isSafeInteger(maxBytes) || maxBytes < 1 ||
      maxBytes > 64 * 1024) {
    throw new Error("linux_or_read_limit_unqualified");
  }
  if (!Number.isInteger(fs.constants.O_NOFOLLOW) ||
      !Number.isInteger(fs.constants.O_DIRECTORY) ||
      fs.constants.O_NOFOLLOW <= 0) {
    throw new Error("dirfd_linux_flags_unavailable");
  }
  assertSafeAbsolute(absolute, "input");
  const directoryFlags =
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY |
    fs.constants.O_NOFOLLOW;
  const fileFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW;
  const components = absolute.split("/").slice(1);
  const basename = components.pop();
  const heldDirs = [];
  let leafFd;
  let walking = "/";
  try {
    const rootSeen = fs.lstatSync("/");
    const rootFd = fs.openSync("/", directoryFlags);
    const rootStat = fs.fstatSync(rootFd);
    heldDirs.push({ fd: rootFd, fullPath: "/", stat: rootStat });
    if (!rootSeen.isDirectory() || !identity(rootSeen, rootStat)) {
      throw new Error("filesystem_root_unbound");
    }
    for (const component of components) {
      const parent = heldDirs.at(-1);
      walking = path.join(walking, component);
      const visible = fs.lstatSync(walking);
      if (!visible.isDirectory() || visible.isSymbolicLink()) {
        throw new Error("untrusted_directory_ancestor");
      }
      const fd = fs.openSync(
        "/proc/self/fd/" + parent.fd + "/" + component,
        directoryFlags,
      );
      const stat = fs.fstatSync(fd);
      heldDirs.push({ fd, fullPath: walking, stat });
      if (!stat.isDirectory() || !identity(visible, stat)) {
        throw new Error("directory_ancestor_fd_mismatch");
      }
    }
    const parentDir = heldDirs.at(-1);
    if (privateCustody) {
      const uid = typeof process.getuid === "function"
        ? process.getuid() : null;
      if (uid === null || parentDir.stat.uid !== uid ||
          (parentDir.stat.mode & 0o077) !== 0) {
        throw new Error("custody_private_directory_unqualified");
      }
    }
    const expected = fs.lstatSync(absolute);
    if (!expected.isFile() || expected.isSymbolicLink() ||
        expected.nlink !== 1 || expected.size < 1 ||
        expected.size > maxBytes) {
      throw new Error("untrusted_observation_leaf");
    }
    leafFd = fs.openSync(
      "/proc/self/fd/" + parentDir.fd + "/" + basename,
      fileFlags,
    );
    const before = fs.fstatSync(leafFd);
    if (!before.isFile() || before.nlink !== 1 ||
        !identity(before, expected)) {
      throw new Error("leaf_descriptor_path_mismatch");
    }
    if (privateCustody) {
      const uid = process.getuid();
      if (before.uid !== uid || (before.mode & 0o077) !== 0) {
        throw new Error("custody_high_water_private_file_unqualified");
      }
    }
    const cap = before.size + 1;
    const bytes = Buffer.alloc(cap);
    let total = 0;
    while (total < cap) {
      const n = fs.readSync(leafFd, bytes, total, cap - total, total);
      if (n === 0) break;
      total += n;
    }
    if (total !== before.size) {
      throw new Error("bound_source_growth_or_truncation");
    }
    const after = fs.fstatSync(leafFd);
    const visibleAfter = fs.lstatSync(absolute);
    if (!identity(before, after) || !visibleAfter.isFile() ||
        visibleAfter.isSymbolicLink() ||
        !identity(visibleAfter, after)) {
      throw new Error("observation_leaf_changed");
    }
    for (const dir of heldDirs) {
      const current = fs.lstatSync(dir.fullPath);
      if (!current.isDirectory() || current.isSymbolicLink() ||
          !identity(current, dir.stat) ||
          !identity(fs.fstatSync(dir.fd), dir.stat)) {
        throw new Error("observation_ancestor_rebound");
      }
    }
    return bytes.subarray(0, total);
  } finally {
    if (leafFd !== undefined) fs.closeSync(leafFd);
    for (const dir of heldDirs.reverse()) fs.closeSync(dir.fd);
  }
}

function inside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" ||
    (rel !== ".." && !rel.startsWith("../") && !path.isAbsolute(rel));
}

// This is an observation utility ONLY: the three paths are not authorized
// simply by being arguments. A privileged server-side policy must eventually
// bind these paths and UID credentials before any use in reserve/recover.
export function observeBuyVoidCustodyLaunchFilesReadOnlyV1({
  shared_data_dir,
  activation_receipt_absolute_path,
  custody_high_water_absolute_path,
} = {}) {
  try {
    const shared = assertSafeAbsolute(shared_data_dir, "shared_data_dir");
    const receipt = assertSafeAbsolute(
      activation_receipt_absolute_path, "activation_receipt");
    const highWater = assertSafeAbsolute(
      custody_high_water_absolute_path, "custody_high_water");
    const journal = path.join(shared, "economic", JOURNAL_NAME);
    if (receipt === journal || highWater === journal ||
        receipt === highWater || inside(shared, highWater)) {
      throw new Error("custody_high_water_domain_not_separated");
    }
    const journalBytes = readBoundLinuxFile(journal, MAX_JOURNAL);
    const receiptBytes = readBoundLinuxFile(receipt, MAX_RECEIPT);
    const highWaterBytes = readBoundLinuxFile(highWater, MAX_HIGH_WATER, true);
    return Object.freeze({
      marker: VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_V1,
      version: 1,
      observed: true,
      reason: null,
      journal_bytes: Buffer.from(journalBytes),
      activation_receipt_bytes: Buffer.from(receiptBytes),
      custody_high_water_bytes: Buffer.from(highWaterBytes),
      evidence: Object.freeze({
        journal: Object.freeze({ bytes: journalBytes.length,
          sha256: sha256(journalBytes) }),
        receipt: Object.freeze({ bytes: receiptBytes.length,
          sha256: sha256(receiptBytes) }),
        high_water: Object.freeze({ bytes: highWaterBytes.length,
          sha256: sha256(highWaterBytes) }),
      }),
      source_gate_verified: false,
      receipt_signature_verified: false,
      cross_uid_permissions_qualified: false,
      cross_file_atomic_snapshot_verified: false,
      server_path_configuration_verified: false,
      custody_high_water_write_performed: false,
      custody_reserve_method_enabled: false,
      custody_recover_method_enabled: false,
      production_allocation_mutation_ready: false,
      funds_movement: false,
    });
  } catch (error) {
    const code = error?.code === "ENOENT"
      ? "evidence_missing_or_unreadable"
      : "evidence_descriptor_or_path_unqualified";
    return hold(code);
  }
}

export const testOnlyReadBoundLinuxCustodyEvidenceFileV1 = readBoundLinuxFile;
