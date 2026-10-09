import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { types as utilTypes } from "node:util";

// A READ-ONLY, preinstalled-custody-UID observation primitive.
// The caller-selected paths are never production authority by themselves.
export const VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1 =
  "VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1";
export const VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_AUTHORITY_V1 =
  Object.freeze({
    source_only_unmounted: true,
    linux_procfs_directory_fd_required: true,
    same_uid_private_roots_required: true,
    fixed_allocation_ledger_and_high_water_names: true,
    caller_selected_leaf_names: false,
    symlinks_and_multiple_links_rejected: true,
    file_growth_bounded: true,
    descriptor_and_visible_identity_revalidated: true,
    no_publication_intent_recovery: true,
    cross_root_atomic_snapshot_proven: false,
    allocation_writer_lock_held: false,
    installed_service_uid_verified: false,
    server_path_configuration_verified: false,
    cross_uid_ipc_authenticated: false,
    allocation_reserve_enabled: false,
    custody_recover_enabled: false,
    filesystem_write: false,
    production_allocation_mutation_ready: false,
    funds_moved: false,
  });

const LEDGER = "allocation-reservations-v1.jsonl";
const HIGH_WATER = "allocation-reservation-high-water-v1.json";
const LEDGER_MAX = 64 * 1024 * 1024;
const HIGH_WATER_MAX = 4096;
const DIR_FLAGS = fs.constants.O_RDONLY |
  fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW;
const FILE_FLAGS = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW;

function fail(code) {
  throw new Error("custody_allocation_observer_" + code);
}
function held(reason) {
  return Object.freeze({
    observed: false, status: "held",
    marker: VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1,
    reason, operation_performed: false,
    cross_root_atomic_snapshot_proven: false,
    installed_service_uid_verified: false,
    cross_uid_ipc_authenticated: false,
    filesystem_write: false,
    production_allocation_mutation_ready: false,
    funds_moved: false,
  });
}
function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino &&
    a.uid === b.uid && a.gid === b.gid &&
    a.mode === b.mode && a.nlink === b.nlink;
}
function sameFile(a, b) {
  return sameIdentity(a, b) && a.size === b.size &&
    a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}
function absolutePrivateRoot(value) {
  if (typeof value !== "string" || !path.isAbsolute(value) ||
      value === "/" || value !== path.resolve(value) ||
      value.includes("\0") || value.includes("//")) {
    fail("root_invalid");
  }
  const segments = value.slice(1).split("/");
  if (segments.some(part => !part || part === "." || part === ".." ||
      !/^[A-Za-z0-9._-]+$/u.test(part))) {
    fail("root_invalid");
  }
  return value;
}
function snapshotRoots(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      utilTypes.isProxy(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    fail("input_not_plain_data");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 2 || keys.some(k => typeof k !== "string" ||
      !["ledger_root", "high_water_root"].includes(k))) {
    fail("input_not_plain_data");
  }
  const o = Object.create(null);
  for (const key of ["ledger_root", "high_water_root"]) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !Object.hasOwn(desc, "value") ||
        !desc.enumerable || typeof desc.value !== "string") {
      fail("input_not_plain_data");
    }
    o[key] = absolutePrivateRoot(desc.value);
  }
  if (o.ledger_root === o.high_water_root ||
      path.relative(o.ledger_root, o.high_water_root) === "" ||
      path.relative(o.ledger_root, o.high_water_root)
        .split(path.sep)[0] !== ".." ||
      path.relative(o.high_water_root, o.ledger_root)
        .split(path.sep)[0] !== "..") {
    fail("separate_storage_roots_required");
  }
  return Object.freeze(o);
}
function openBoundRoot(absolute, owned) {
  const components = absolute.slice(1).split("/");
  const descriptors = [];
  try {
    let fd = fs.openSync("/", DIR_FLAGS);
    descriptors.push(fd);
    let visiblePath = "/";
    for (const component of components) {
      visiblePath = path.join(visiblePath, component);
      const visible = fs.lstatSync(visiblePath, { bigint: true });
      const next = fs.openSync(
        "/proc/self/fd/" + fd + "/" + component,
        DIR_FLAGS,
      );
      descriptors.push(next);
      const actual = fs.fstatSync(next, { bigint: true });
      if (!visible.isDirectory() || visible.isSymbolicLink() ||
          !sameIdentity(visible, actual)) fail("ancestor_not_bound");
      fd = next;
    }
    const stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isDirectory() || stat.uid !== BigInt(owned) ||
        (Number(stat.mode) & 0o777) !== 0o700) {
      fail("private_root_owner_or_mode_invalid");
    }
    return { absolute, descriptors, fd, stat };
  } catch (error) {
    for (const fd of descriptors.reverse()) {
      try { fs.closeSync(fd); } catch { /* return the primary HOLD */ }
    }
    throw error;
  }
}
function rootStillBound(root) {
  const fdStat = fs.fstatSync(root.fd, { bigint: true });
  const visible = fs.lstatSync(root.absolute, { bigint: true });
  if (!visible.isDirectory() || visible.isSymbolicLink() ||
      !sameIdentity(root.stat, fdStat) ||
      !sameIdentity(fdStat, visible)) {
    fail("root_rebound");
  }
}
function openBoundLeaf(root, name, max, minimum, owned) {
  rootStillBound(root);
  const file = path.join(root.absolute, name);
  const visible = fs.lstatSync(file, { bigint: true });
  const fd = fs.openSync(
    "/proc/self/fd/" + root.fd + "/" + name, FILE_FLAGS,
  );
  try {
    const stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n ||
        stat.uid !== BigInt(owned) ||
        (Number(stat.mode) & 0o777) !== 0o600 ||
        stat.size < BigInt(minimum) || stat.size > BigInt(max) ||
        !sameFile(stat, visible)) {
      fail("private_file_identity_or_bounds_invalid");
    }
    return { root, name, fd, stat, maximum: max };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}
function readPinned(leaf) {
  const size = Number(leaf.stat.size);
  const dst = Buffer.alloc(size + 1);
  let read = 0;
  while (read < dst.length) {
    const bytes = fs.readSync(leaf.fd, dst, read, dst.length - read, read);
    if (bytes === 0) break;
    read += bytes;
  }
  if (read !== size) fail("size_changed_during_read");
  return Buffer.from(dst.subarray(0, size));
}
function leafStillBound(leaf) {
  const opened = fs.fstatSync(leaf.fd, { bigint: true });
  const visible = fs.lstatSync(
    path.join(leaf.root.absolute, leaf.name),
    { bigint: true },
  );
  if (!sameFile(leaf.stat, opened) || !sameFile(opened, visible)) {
    fail("file_rebound_or_modified");
  }
  rootStillBound(leaf.root);
}
function closeAllOrFail(fds) {
  let failed = false;
  for (const fd of fds) {
    try { fs.closeSync(fd); } catch { failed = true; }
  }
  if (failed) fail("descriptor_close_failed");
}
function ref(bytes) {
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}
export function observeBuyVoidCustodyAllocationRootsReadOnlyV1(rawOptions = {}) {
  let owned;
  const fds = [];
  let decision = null;
  let error = null;
  try {
    if (process.platform !== "linux" ||
        typeof process.getuid !== "function" ||
        process.getuid() <= 0 || !fs.existsSync("/proc/self/fd") ||
        !Number.isInteger(fs.constants.O_NOFOLLOW) ||
        !Number.isInteger(fs.constants.O_DIRECTORY)) {
      fail("unprivileged_linux_procfd_required");
    }
    owned = process.getuid();
    const options = snapshotRoots(rawOptions);
    const ledgerRoot = openBoundRoot(options.ledger_root, owned);
    fds.push(...ledgerRoot.descriptors);
    const highRoot = openBoundRoot(options.high_water_root, owned);
    fds.push(...highRoot.descriptors);
    const ledger = openBoundLeaf(ledgerRoot, LEDGER, LEDGER_MAX, 0, owned);
    fds.push(ledger.fd);
    const high = openBoundLeaf(highRoot, HIGH_WATER, HIGH_WATER_MAX, 1, owned);
    fds.push(high.fd);
    const ledgerBytes = readPinned(ledger);
    const highBytes = readPinned(high);
    leafStillBound(ledger);
    leafStillBound(high);
    rootStillBound(ledgerRoot);
    rootStillBound(highRoot);
    decision = Object.freeze({
      observed: true, status: "observed",
      marker: VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1,
      allocation_jsonl: Buffer.from(ledgerBytes),
      allocation_high_water_bytes: Buffer.from(highBytes),
      evidence: Object.freeze({
        allocation_ledger_sha256: ref(ledgerBytes),
        allocation_ledger_bytes: ledgerBytes.length,
        high_water_sha256: ref(highBytes),
        high_water_bytes: highBytes.length,
        separate_root_inodes_observed:
          !sameIdentity(ledgerRoot.stat, highRoot.stat),
        separate_storage_devices_observed:
          ledgerRoot.stat.dev !== highRoot.stat.dev,
      }),
      operation_performed: false,
      cross_root_atomic_snapshot_proven: false,
      installed_service_uid_verified: false,
      cross_uid_ipc_authenticated: false,
      filesystem_write: false,
      production_allocation_mutation_ready: false,
      funds_moved: false,
    });
  } catch (caught) {
    error = caught;
  } finally {
    try { closeAllOrFail(fds.reverse()); }
    catch (caught) { error = caught; }
  }
  if (error) {
    const reason = error instanceof Error &&
      error.message.startsWith("custody_allocation_observer_")
      ? error.message.slice("custody_allocation_observer_".length)
      : "evidence_unreadable_or_unqualified";
    return held(reason);
  }
  return decision;
}
