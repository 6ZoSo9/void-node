import fs from "node:fs";
import path from "node:path";

import {
  classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1,
  parseBuyVoidCustodyHighWaterTransitionFenceV1,
} from "./buy_void_custody_high_water_transition_fence_v1.mjs";

export const VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_V1 =
  "VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_V1";

export const VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_POLICY_V1 =
  Object.freeze({
    source_only_store: true,
    linux_procfs_directory_fd_required: true,
    server_selected_root_required: true,
    trusted_server_path_selection_verified: false,
    current_uid_private_root_required: true,
    create_only_record_publication: true,
    record_deletion_allowed: false,
    stale_record_automatic_reap: false,
    partial_create_automatic_cleanup: false,
    partial_create_requires_external_recovery: true,
    same_slot_competing_successor_must_hold: true,
    filesystem_write_limited_to_fence_record: true,
    high_water_write_performed: false,
    service_mounted: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_moved: false,
  });

const MAX_RECORD_BYTES = 64 * 1024;
const FILE_SUFFIX = ".json";

function fail(reason) {
  throw new Error("custody_hw_transition_fence_store_" + reason);
}

function directoryFlags() {
  if (
    process.platform !== "linux" ||
    !Number.isInteger(fs.constants.O_DIRECTORY) ||
    !Number.isInteger(fs.constants.O_NOFOLLOW) ||
    fs.constants.O_NOFOLLOW <= 0
  ) {
    fail("linux_dirfd_unavailable");
  }
  return fs.constants.O_RDONLY |
    fs.constants.O_DIRECTORY |
    fs.constants.O_NOFOLLOW;
}

function sameDirectoryIdentity(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.mode === b.mode &&
    a.uid === b.uid &&
    a.gid === b.gid
  );
}

function sameFileIdentity(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.mode === b.mode &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}

function canonicalRoot(value) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value ||
    value === "/" ||
    value.includes("//") ||
    value.includes("\0")
  ) {
    fail("root_invalid");
  }
  const components = value.split("/").slice(1);
  if (
    components.length < 1 ||
    components.some((component) =>
      !/^[A-Za-z0-9_.-]+$/u.test(component) ||
      component === "." ||
      component === "..")
  ) {
    fail("root_component_invalid");
  }
  return components;
}

function openBoundRoot(absoluteRoot) {
  const flags = directoryFlags();
  const components = canonicalRoot(absoluteRoot);
  const opened = [];
  let current = "/";
  const uid =
    typeof process.getuid === "function" ? process.getuid() : null;
  if (!Number.isSafeInteger(uid) || uid === 0) {
    fail("nonroot_uid_required");
  }

  try {
    const visibleRoot = fs.lstatSync("/");
    const rootFd = fs.openSync("/", flags);
    const heldRoot = fs.fstatSync(rootFd);
    opened.push({ fd: rootFd, path: "/", stat: heldRoot });
    if (
      !visibleRoot.isDirectory() ||
      visibleRoot.isSymbolicLink() ||
      !sameDirectoryIdentity(visibleRoot, heldRoot)
    ) {
      fail("filesystem_root_unbound");
    }

    for (const component of components) {
      const parent = opened.at(-1);
      current = path.join(current, component);
      const visible = fs.lstatSync(current);
      if (!visible.isDirectory() || visible.isSymbolicLink()) {
        fail("ancestor_not_direct_directory");
      }
      if (
        visible.uid !== uid &&
        visible.uid !== 0
      ) {
        fail("ancestor_owner_invalid");
      }
      const writableByOthers = (visible.mode & 0o022) !== 0;
      const sticky = (visible.mode & 0o1000) !== 0;
      if (writableByOthers && !(visible.uid === 0 && sticky)) {
        fail("ancestor_permissions_unsafe");
      }

      const fd = fs.openSync(
        "/proc/self/fd/" + parent.fd + "/" + component,
        flags,
      );
      const held = fs.fstatSync(fd);
      opened.push({ fd, path: current, stat: held });
      if (
        !held.isDirectory() ||
        !sameDirectoryIdentity(visible, held)
      ) {
        fail("ancestor_fd_mismatch");
      }
    }

    if (current !== absoluteRoot) {
      fail("root_resolution_mismatch");
    }
    const root = opened.at(-1);
    if (
      root.stat.uid !== uid ||
      (root.stat.mode & 0o7777) !== 0o700
    ) {
      fail("private_root_owner_mode_required");
    }
    return opened;
  } catch (error) {
    for (const entry of opened.reverse()) {
      try { fs.closeSync(entry.fd); } catch {}
    }
    throw error;
  }
}

function assertStillBound(opened) {
  for (const entry of opened) {
    const visible = fs.lstatSync(entry.path);
    const held = fs.fstatSync(entry.fd);
    if (
      !visible.isDirectory() ||
      visible.isSymbolicLink() ||
      !sameDirectoryIdentity(entry.stat, held) ||
      !sameDirectoryIdentity(entry.stat, visible)
    ) {
      fail("ancestor_rebound");
    }
  }
}

function readRecordRelative(rootFd, fileName) {
  const filePath =
    "/proc/self/fd/" + rootFd + "/" + fileName;
  const visible = fs.lstatSync(filePath, { bigint: true });
  const uid =
    typeof process.getuid === "function"
      ? BigInt(process.getuid())
      : null;
  if (
    uid === null ||
    !visible.isFile() ||
    visible.isSymbolicLink() ||
    visible.uid !== uid ||
    visible.nlink !== 1n ||
    (visible.mode & 0o777n) !== 0o600n ||
    visible.size < 1n ||
    visible.size > BigInt(MAX_RECORD_BYTES)
  ) {
    fail("existing_record_shape_invalid");
  }

  const fd = fs.openSync(
    filePath,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!sameFileIdentity(visible, before)) {
      fail("existing_record_identity_changed");
    }

    const size = Number(before.size);
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
      if (count <= 0) {
        fail("existing_record_short_read");
      }
      offset += count;
    }

    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(filePath, { bigint: true });
    if (
      !sameFileIdentity(before, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail("existing_record_changed_during_read");
    }
    parseBuyVoidCustodyHighWaterTransitionFenceV1(bytes);
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.writeSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      offset,
    );
    if (count <= 0) {
      fail("record_short_write");
    }
    offset += count;
  }
}

export function createOrReadBuyVoidCustodyHighWaterTransitionFenceRecordV1(
  {
    fence_root,
    expected_record_bytes,
  } = {},
) {
  if (
    !Buffer.isBuffer(expected_record_bytes) ||
    expected_record_bytes.length < 1 ||
    expected_record_bytes.length > MAX_RECORD_BYTES
  ) {
    fail("expected_record_size_invalid");
  }
  const expected =
    parseBuyVoidCustodyHighWaterTransitionFenceV1(
      expected_record_bytes,
    );
  const slotId = expected.record.transition_slot_id;
  const fileName = slotId + FILE_SUFFIX;
  if (!/^voidchwf1_[0-9a-f]{64}[.]json$/u.test(fileName)) {
    fail("slot_filename_invalid");
  }

  const opened = openBoundRoot(fence_root);
  const root = opened.at(-1);
  const recordPath =
    "/proc/self/fd/" + root.fd + "/" + fileName;
  let fd = -1;

  try {
    assertStillBound(opened);

    try {
      fd = fs.openSync(
        recordPath,
        fs.constants.O_WRONLY |
          fs.constants.O_CREAT |
          fs.constants.O_EXCL |
          fs.constants.O_NOFOLLOW,
        0o600,
      );
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;

      const observed = readRecordRelative(root.fd, fileName);
      classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
        expected_record_bytes,
        observed_record_bytes: observed,
      });
      assertStillBound(opened);
      return Object.freeze({
        marker:
          VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_V1,
        status: "exists_same_transition",
        transition_slot_id: slotId,
        operation_performed: false,
        record_deletion_allowed: false,
        partial_create_automatic_cleanup: false,
        high_water_write_performed: false,
        custody_reserve_method_enabled: false,
        production_allocation_mutation_ready: false,
        funds_moved: false,
      });
    }

    writeAll(fd, expected_record_bytes);
    fs.fsyncSync(fd);

    const created = fs.fstatSync(fd, { bigint: true });
    const uid =
      typeof process.getuid === "function"
        ? BigInt(process.getuid())
        : null;
    if (
      uid === null ||
      !created.isFile() ||
      created.uid !== uid ||
      created.nlink !== 1n ||
      (created.mode & 0o777n) !== 0o600n ||
      created.size !== BigInt(expected_record_bytes.length)
    ) {
      fail("created_record_shape_invalid");
    }

    fs.closeSync(fd);
    fd = -1;
    fs.fsyncSync(root.fd);
    assertStillBound(opened);

    const rebound = readRecordRelative(root.fd, fileName);
    classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
      expected_record_bytes,
      observed_record_bytes: rebound,
    });

    return Object.freeze({
      marker:
        VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_STORE_V1,
      status: "created",
      transition_slot_id: slotId,
      operation_performed: true,
      record_deletion_allowed: false,
      partial_create_automatic_cleanup: false,
      high_water_write_performed: false,
      custody_reserve_method_enabled: false,
      production_allocation_mutation_ready: false,
      funds_moved: false,
    });
  } finally {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch {}
    }
    for (const entry of opened.reverse()) {
      try { fs.closeSync(entry.fd); } catch {}
    }
  }
}
