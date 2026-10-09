import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_CUSTODY_HIGH_WATER_EXCLUSIVE_LOCK_V1 =
  "VOID_BUY_VOID_CUSTODY_HIGH_WATER_EXCLUSIVE_LOCK_V1";
export const VOID_BUY_VOID_CUSTODY_HIGH_WATER_EXCLUSIVE_LOCK_POLICY_V1 =
  Object.freeze({
    linux_procfs_directory_fd_required: true,
    same_uid_private_directory_required: true,
    atomic_lock_creation_required: true,
    lock_directory_mode_0700: true,
    parent_fsync_before_callback_required: true,
    stale_lock_automatic_takeover: false,
    failed_transaction_lock_release: false,
    callback_must_be_synchronous: true,
    trusted_server_path_selection_verified: false,
    installed_custody_service_uid_qualified: false,
    cross_uid_ipc_authenticated: false,
    custody_high_water_writer_implemented: false,
    source_only_unmounted: true,
    reserve_enabled: false,
    recover_enabled: false,
    production_allocation_mutation_ready: false,
    wallet_access: false,
    signer_access: false,
    funds_moved: false,
  });

const LOCK_NAME = ".void-buy-custody-high-water-exclusive-v1.lock";
const directoryFlags = () => {
  if (process.platform !== "linux" ||
      !Number.isInteger(fs.constants.O_DIRECTORY) ||
      !Number.isInteger(fs.constants.O_NOFOLLOW) ||
      fs.constants.O_NOFOLLOW <= 0) {
    throw new Error("custody_hw_exclusive_linux_dirfd_unavailable");
  }
  return fs.constants.O_RDONLY |
    fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW;
};
// A lock directory creation/removal legitimately changes the parent's
// mtime/ctime, size and nlink. Those are not stable directory identity.
const identity = (a, b) =>
  a.dev === b.dev && a.ino === b.ino && a.mode === b.mode &&
  a.uid === b.uid && a.gid === b.gid;

function canonicalPrivateDirectory(value) {
  if (typeof value !== "string" || !path.isAbsolute(value) ||
      path.resolve(value) !== value || value === "/" ||
      value.includes("//") || value.includes("\0")) {
    throw new Error("custody_hw_exclusive_root_invalid");
  }
  const components = value.split("/").slice(1);
  if (components.some(x => !/^[A-Za-z0-9_.-]+$/u.test(x) ||
      x === "." || x === "..")) {
    throw new Error("custody_hw_exclusive_root_component_invalid");
  }
  return components;
}
function openBoundDirectories(absolute, components, flags) {
  const opened = [];
  let current = "/";
  try {
    const rootSeen = fs.lstatSync("/");
    const rootFd = fs.openSync("/", flags);
    const rootStat = fs.fstatSync(rootFd);
    opened.push({ fd: rootFd, path: "/", stat: rootStat });
    if (!rootSeen.isDirectory() || !identity(rootSeen, rootStat)) {
      throw new Error("custody_hw_exclusive_filesystem_root_unbound");
    }
    for (const component of components) {
      const parentFd = opened.at(-1).fd;
      current = path.join(current, component);
      const visible = fs.lstatSync(current);
      if (!visible.isDirectory() || visible.isSymbolicLink()) {
        throw new Error("custody_hw_exclusive_ancestor_symlink");
      }
      const fd = fs.openSync(
        "/proc/self/fd/" + parentFd + "/" + component,
        flags,
      );
      const stat = fs.fstatSync(fd);
      opened.push({ fd, path: current, stat });
      if (!stat.isDirectory() || !identity(visible, stat)) {
        throw new Error("custody_hw_exclusive_ancestor_fd_mismatch");
      }
    }
    if (current !== absolute) {
      throw new Error("custody_hw_exclusive_resolved_root_mismatch");
    }
    const privateDir = opened.at(-1);
    const uid = typeof process.getuid === "function" ? process.getuid() : null;
    if (!Number.isSafeInteger(uid) || uid === 0 ||
        privateDir.stat.uid !== uid ||
        (privateDir.stat.mode & 0o7777) !== 0o700) {
      throw new Error("custody_hw_exclusive_private_owner_mode_required");
    }
    return opened;
  } catch (error) {
    for (const entry of opened.reverse()) fs.closeSync(entry.fd);
    throw error;
  }
}
function assertDirectoriesStillBound(opened) {
  for (const entry of opened) {
    const visible = fs.lstatSync(entry.path);
    const fdStat = fs.fstatSync(entry.fd);
    if (!visible.isDirectory() || visible.isSymbolicLink() ||
        !identity(entry.stat, fdStat) || !identity(entry.stat, visible)) {
      throw new Error("custody_hw_exclusive_ancestor_rebound");
    }
  }
}

// Source-only lock primitive. A future custody-owned SERVICE must choose the
// private directory itself, authenticate its caller and independently qualify
// launch signatures, protected high-water bytes and the writer/recovery order.
// This function does not publish or accept ANY high-water record.
export function withBuyVoidCustodyHighWaterExclusiveLockV1(
  { private_directory } = {},
  criticalSection,
) {
  const flags = directoryFlags();
  const parts = canonicalPrivateDirectory(private_directory);
  if (typeof criticalSection !== "function") {
    throw new Error("custody_hw_exclusive_critical_section_required");
  }
  const opened = openBoundDirectories(private_directory, parts, flags);
  const heldParent = opened.at(-1);
  const privatePath = "/proc/self/fd/" + heldParent.fd + "/" + LOCK_NAME;
  let heldLockFd;
  let lockCreated = false;
  try {
    assertDirectoriesStillBound(opened);
    try {
      fs.mkdirSync(privatePath, { mode: 0o700 });
      lockCreated = true;
    } catch (error) {
      if (error?.code === "EEXIST") {
        throw new Error("custody_hw_exclusive_lock_already_exists");
      }
      throw error;
    }
    heldLockFd = fs.openSync(privatePath, flags);
    const lockStat = fs.fstatSync(heldLockFd);
    const seenLock = fs.lstatSync(privatePath);
    if (!lockStat.isDirectory() || lockStat.uid !== process.getuid() ||
        (lockStat.mode & 0o7777) !== 0o700 ||
        !identity(lockStat, seenLock)) {
      throw new Error("custody_hw_exclusive_lock_inode_or_mode_invalid");
    }
    // A process crash AFTER this directory is created conservatively leaves
    // a durable lock that must be separately reconciled, NEVER stolen by PID.
    fs.fsyncSync(heldParent.fd);
    assertDirectoriesStillBound(opened);
    let result;
    try {
      result = criticalSection();
      if (result && typeof result.then === "function") {
        throw new Error("custody_hw_exclusive_async_callback_forbidden");
      }
    } catch (error) {
      const held = new Error("custody_hw_exclusive_operation_failed_lock_retained");
      held.cause = error;
      throw held;
    }
    assertDirectoriesStillBound(opened);
    const beforeRelease = fs.lstatSync(privatePath);
    if (!identity(beforeRelease, fs.fstatSync(heldLockFd))) {
      throw new Error("custody_hw_exclusive_lock_replaced_before_release");
    }
    fs.rmdirSync(privatePath);
    // Do not report a clean exclusive session unless release is durable.
    fs.fsyncSync(heldParent.fd);
    lockCreated = false;
    return Object.freeze({
      marker: VOID_BUY_VOID_CUSTODY_HIGH_WATER_EXCLUSIVE_LOCK_V1,
      exclusive_critical_section_completed: true,
      lock_release_fsynced: true,
      source_only_lock_testable: true,
      custody_high_water_writer_implemented: false,
      installed_custody_service_uid_qualified: false,
      production_allocation_mutation_ready: false,
      funds_moved: false,
      result,
    });
  } finally {
    // On failure LEAVE the lock in place. Automatic stale lock reaping,
    // even after a callback exception, could let a new process race an
    // uncommitted high-water rename. Manual recovery is a separate authority.
    if (heldLockFd !== undefined) fs.closeSync(heldLockFd);
    for (const entry of opened.reverse()) fs.closeSync(entry.fd);
    void lockCreated;
  }
}
