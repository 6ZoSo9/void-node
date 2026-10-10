import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { types as utilTypes } from "node:util";

export const VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1 =
  "VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1";

export const VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_AUTHORITY_V1 =
  Object.freeze({
    source_only_unmounted: true,
    linux_only: true,
    preprovisioned_shared_directory_required: true,
    shared_directory_mode_03770_required: true,
    shared_directory_owner_is_custody_uid: true,
    setgid_group_inheritance_required: true,
    sticky_delete_boundary_required: true,
    web_and_custody_uid_distinct: true,
    kernel_file_owner_binds_claim_role: true,
    kernel_file_gid_binds_shared_group: true,
    process_incarnation_bound: true,
    create_only_lock_link: true,
    callback_failure_retains_lock: true,
    stale_same_uid_cleanup_allowed: true,
    stale_foreign_cleanup_custody_owner_only: true,
    successful_release_parent_fsynced: true,
    release_fsync_failure_is_uncertain: true,
    fairness_or_starvation_bound_proven: false,
    caller_bearer_token_authority: false,
    payment_event_write: false,
    allocation_write: false,
    production_runtime_mounted: false,
    production_gate_ready: false,
    presale_activation: false,
    funds_movement: false,
  });

const CLAIM_SCHEMA = "void.buy.cross_uid_capacity_lock.claim.v1";
const LOCK_NAME = ".void-buy-void-cross-uid-capacity-exclusive-lock-v1.json";
const CLAIM_PREFIX = ".void-buy-void-cross-uid-capacity-claim-v1-";
const NONCE_RE = /^[0-9a-f]{32}$/u;
const STAGING_RE =
  /^\.void-buy-void-cross-uid-capacity-claim-v1-u([1-9][0-9]*)-p([1-9][0-9]*)-([0-9a-f]{32})\.json$/u;
const MAX_CLAIM_BYTES = 4096;
const CONFIG_FIELDS = Object.freeze([
  "shared_directory",
  "custody_uid",
  "web_uid",
  "shared_gid",
  "wait_timeout_ms",
  "poll_interval_ms",
]);

function fail(code, cause = undefined) {
  const error = new Error(code);
  if (cause !== undefined) error.cause = cause;
  throw error;
}

function plainDataObject(value, code) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    utilTypes.isProxy(value)
  ) {
    fail(code);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  return value;
}

function ownValue(value, key, code) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) fail(code);
  return descriptor.value;
}

function safeInteger(value, minimum, maximum, code) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(code);
  }
  return value;
}

function canonicalAbsoluteDirectory(value) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value ||
    value === "/" ||
    value.includes("//") ||
    value.includes("\0")
  ) {
    fail("cross_uid_capacity_lock_shared_directory_invalid");
  }
  const parts = value.split("/").slice(1);
  if (
    parts.length === 0 ||
    parts.some(
      (part) =>
        part === "." ||
        part === ".." ||
        !/^[A-Za-z0-9_.-]+$/u.test(part),
    )
  ) {
    fail("cross_uid_capacity_lock_shared_directory_component_invalid");
  }
  return Object.freeze(parts);
}

function normalizeConfig(raw) {
  const value = plainDataObject(
    raw,
    "cross_uid_capacity_lock_config_invalid",
  );
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== CONFIG_FIELDS.length ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !CONFIG_FIELDS.includes(key),
    )
  ) {
    fail("cross_uid_capacity_lock_config_keys_invalid");
  }

  const sharedDirectory = ownValue(
    value,
    "shared_directory",
    "cross_uid_capacity_lock_shared_directory_missing",
  );
  const parts = canonicalAbsoluteDirectory(sharedDirectory);
  const custodyUid = safeInteger(
    ownValue(value, "custody_uid", "cross_uid_capacity_lock_custody_uid_missing"),
    1,
    0x7fffffff,
    "cross_uid_capacity_lock_custody_uid_invalid",
  );
  const webUid = safeInteger(
    ownValue(value, "web_uid", "cross_uid_capacity_lock_web_uid_missing"),
    1,
    0x7fffffff,
    "cross_uid_capacity_lock_web_uid_invalid",
  );
  if (custodyUid === webUid) fail("cross_uid_capacity_lock_uids_must_be_distinct");
  const sharedGid = safeInteger(
    ownValue(value, "shared_gid", "cross_uid_capacity_lock_shared_gid_missing"),
    1,
    0x7fffffff,
    "cross_uid_capacity_lock_shared_gid_invalid",
  );
  const waitTimeoutMs = safeInteger(
    ownValue(
      value,
      "wait_timeout_ms",
      "cross_uid_capacity_lock_wait_timeout_missing",
    ),
    50,
    120000,
    "cross_uid_capacity_lock_wait_timeout_invalid",
  );
  const pollIntervalMs = safeInteger(
    ownValue(
      value,
      "poll_interval_ms",
      "cross_uid_capacity_lock_poll_interval_missing",
    ),
    5,
    1000,
    "cross_uid_capacity_lock_poll_interval_invalid",
  );
  if (pollIntervalMs >= waitTimeoutMs) {
    fail("cross_uid_capacity_lock_poll_interval_not_bounded");
  }

  return Object.freeze({
    shared_directory: sharedDirectory,
    parts,
    custody_uid: custodyUid,
    web_uid: webUid,
    shared_gid: sharedGid,
    wait_timeout_ms: waitTimeoutMs,
    poll_interval_ms: pollIntervalMs,
  });
}

function currentUid() {
  if (process.platform !== "linux" || typeof process.getuid !== "function") {
    fail("cross_uid_capacity_lock_linux_uid_required");
  }
  return safeInteger(
    process.getuid(),
    1,
    0x7fffffff,
    "cross_uid_capacity_lock_nonroot_uid_required",
  );
}

function currentGroups() {
  if (typeof process.getgid !== "function" || typeof process.getgroups !== "function") {
    fail("cross_uid_capacity_lock_linux_groups_required");
  }
  const groups = new Set(process.getgroups());
  groups.add(process.getgid());
  return groups;
}

function requireParticipant(config) {
  const uid = currentUid();
  if (uid !== config.custody_uid && uid !== config.web_uid) {
    fail("cross_uid_capacity_lock_caller_uid_not_participant");
  }
  if (!currentGroups().has(config.shared_gid)) {
    fail("cross_uid_capacity_lock_caller_missing_shared_gid");
  }
  return Object.freeze({
    uid,
    role: uid === config.custody_uid ? "custody" : "web",
  });
}

function directoryFlags() {
  const needed = [
    fs.constants.O_RDONLY,
    fs.constants.O_DIRECTORY,
    fs.constants.O_NOFOLLOW,
  ];
  if (needed.some((value) => !Number.isInteger(value)) || fs.constants.O_NOFOLLOW <= 0) {
    fail("cross_uid_capacity_lock_linux_dirfd_unavailable");
  }
  return fs.constants.O_RDONLY |
    fs.constants.O_DIRECTORY |
    fs.constants.O_NOFOLLOW;
}

function fileReadFlags() {
  if (!Number.isInteger(fs.constants.O_NOFOLLOW) || fs.constants.O_NOFOLLOW <= 0) {
    fail("cross_uid_capacity_lock_nofollow_unavailable");
  }
  return fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW;
}

function fileCreateFlags() {
  const needed = [
    fs.constants.O_WRONLY,
    fs.constants.O_CREAT,
    fs.constants.O_EXCL,
    fs.constants.O_NOFOLLOW,
  ];
  if (needed.some((value) => !Number.isInteger(value))) {
    fail("cross_uid_capacity_lock_create_flags_unavailable");
  }
  return fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    fs.constants.O_NOFOLLOW;
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid
  );
}

function sameFileIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid
  );
}

function openSharedDirectory(config) {
  const flags = directoryFlags();
  const opened = [];
  let current = "/";
  try {
    const rootVisible = fs.lstatSync("/");
    const rootFd = fs.openSync("/", flags);
    const rootStat = fs.fstatSync(rootFd);
    opened.push(Object.freeze({ path: "/", fd: rootFd, stat: rootStat }));
    if (!rootVisible.isDirectory() || !sameDirectoryIdentity(rootVisible, rootStat)) {
      fail("cross_uid_capacity_lock_filesystem_root_unbound");
    }

    for (const component of config.parts) {
      const parent = opened.at(-1);
      current = path.join(current, component);
      const visible = fs.lstatSync(current);
      if (!visible.isDirectory() || visible.isSymbolicLink()) {
        fail("cross_uid_capacity_lock_ancestor_symlink_or_non_directory");
      }
      const fd = fs.openSync(
        `/proc/self/fd/${parent.fd}/${component}`,
        flags,
      );
      const stat = fs.fstatSync(fd);
      opened.push(Object.freeze({ path: current, fd, stat }));
      if (!sameDirectoryIdentity(visible, stat)) {
        fail("cross_uid_capacity_lock_ancestor_fd_mismatch");
      }
    }

    if (current !== config.shared_directory) {
      fail("cross_uid_capacity_lock_shared_directory_resolution_mismatch");
    }
    const shared = opened.at(-1);
    if (
      shared.stat.uid !== config.custody_uid ||
      shared.stat.gid !== config.shared_gid ||
      (shared.stat.mode & 0o7777) !== 0o3770
    ) {
      fail("cross_uid_capacity_lock_shared_directory_owner_group_mode_invalid");
    }
    return opened;
  } catch (error) {
    for (const entry of opened.reverse()) {
      try { fs.closeSync(entry.fd); } catch {}
    }
    throw error;
  }
}

function assertSharedDirectoryStillBound(config, opened) {
  for (const entry of opened) {
    const visible = fs.lstatSync(entry.path);
    const descriptor = fs.fstatSync(entry.fd);
    if (
      !visible.isDirectory() ||
      visible.isSymbolicLink() ||
      !sameDirectoryIdentity(entry.stat, descriptor) ||
      !sameDirectoryIdentity(entry.stat, visible)
    ) {
      fail("cross_uid_capacity_lock_directory_rebound");
    }
  }
  const shared = opened.at(-1).stat;
  if (
    shared.uid !== config.custody_uid ||
    shared.gid !== config.shared_gid ||
    (shared.mode & 0o7777) !== 0o3770
  ) {
    fail("cross_uid_capacity_lock_shared_directory_policy_drift");
  }
}

function procStartTicks(pid) {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(") ");
    if (close < 0) fail("cross_uid_capacity_lock_proc_stat_invalid");
    const fields = stat.slice(close + 2).trim().split(/\s+/u);
    const ticks = fields[19] || "";
    if (!/^[1-9][0-9]*$/u.test(ticks)) {
      fail("cross_uid_capacity_lock_proc_start_ticks_invalid");
    }
    return ticks;
  } catch (error) {
    const code = error?.code;
    if (code === "ENOENT" || code === "ESRCH") return null;
    if (code === "EACCES" || code === "EPERM") {
      fail("cross_uid_capacity_lock_process_incarnation_unverifiable", error);
    }
    throw error;
  }
}

function currentProcessStartTicks() {
  const ticks = procStartTicks(process.pid);
  if (ticks === null) fail("cross_uid_capacity_lock_current_process_missing");
  return ticks;
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}

function claimIncarnationCurrent(claim) {
  if (!processAlive(claim.pid)) return false;
  const observed = procStartTicks(claim.pid);
  if (observed === null) return false;
  return observed === claim.process_start_ticks;
}

function canonicalUtc(value) {
  if (typeof value !== "string") {
    fail("cross_uid_capacity_lock_created_at_invalid");
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail("cross_uid_capacity_lock_created_at_invalid");
  }
  return value;
}

function stagingName(uid, pid, nonce) {
  return `${CLAIM_PREFIX}u${uid}-p${pid}-${nonce}.json`;
}

function makeClaim(config, participant, nonce) {
  const record = Object.create(null);
  record.schema = CLAIM_SCHEMA;
  record.uid = participant.uid;
  record.role = participant.role;
  record.pid = process.pid;
  record.process_start_ticks = currentProcessStartTicks();
  record.nonce = nonce;
  record.staging_name = stagingName(participant.uid, process.pid, nonce);
  record.created_at_utc = new Date().toISOString();
  record.custody_uid = config.custody_uid;
  record.web_uid = config.web_uid;
  record.shared_gid = config.shared_gid;
  return Object.freeze(record);
}

function encodeClaim(claim) {
  const encoded = Buffer.from(JSON.stringify(claim) + "\n", "utf8");
  if (encoded.length < 2 || encoded.length > MAX_CLAIM_BYTES) {
    fail("cross_uid_capacity_lock_claim_size_out_of_range");
  }
  return encoded;
}

function parseClaim(bytes, config, metadata) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_CLAIM_BYTES) {
    fail("cross_uid_capacity_lock_claim_size_out_of_range");
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("cross_uid_capacity_lock_claim_json_invalid", error);
  }
  const value = plainDataObject(
    parsed,
    "cross_uid_capacity_lock_claim_object_invalid",
  );
  const expected = [
    "schema",
    "uid",
    "role",
    "pid",
    "process_start_ticks",
    "nonce",
    "staging_name",
    "created_at_utc",
    "custody_uid",
    "web_uid",
    "shared_gid",
  ].sort();
  const keys = Object.keys(value).sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    fail("cross_uid_capacity_lock_claim_keys_invalid");
  }
  if (ownValue(value, "schema", "cross_uid_capacity_lock_claim_schema_missing") !== CLAIM_SCHEMA) {
    fail("cross_uid_capacity_lock_claim_schema_invalid");
  }
  const uid = safeInteger(
    ownValue(value, "uid", "cross_uid_capacity_lock_claim_uid_missing"),
    1,
    0x7fffffff,
    "cross_uid_capacity_lock_claim_uid_invalid",
  );
  const role = ownValue(value, "role", "cross_uid_capacity_lock_claim_role_missing");
  const expectedRole =
    uid === config.custody_uid ? "custody" :
      uid === config.web_uid ? "web" : null;
  if (role !== expectedRole || expectedRole === null) {
    fail("cross_uid_capacity_lock_claim_role_invalid");
  }
  if (metadata.uid !== uid) {
    fail("cross_uid_capacity_lock_claim_kernel_uid_mismatch");
  }
  if (metadata.gid !== config.shared_gid) {
    fail("cross_uid_capacity_lock_claim_kernel_gid_mismatch");
  }
  const pid = safeInteger(
    ownValue(value, "pid", "cross_uid_capacity_lock_claim_pid_missing"),
    1,
    0x7fffffff,
    "cross_uid_capacity_lock_claim_pid_invalid",
  );
  const processStartTicks = ownValue(
    value,
    "process_start_ticks",
    "cross_uid_capacity_lock_claim_process_start_missing",
  );
  if (
    typeof processStartTicks !== "string" ||
    !/^[1-9][0-9]*$/u.test(processStartTicks)
  ) {
    fail("cross_uid_capacity_lock_claim_process_start_invalid");
  }
  const nonce = ownValue(value, "nonce", "cross_uid_capacity_lock_claim_nonce_missing");
  if (typeof nonce !== "string" || !NONCE_RE.test(nonce)) {
    fail("cross_uid_capacity_lock_claim_nonce_invalid");
  }
  const expectedStaging = stagingName(uid, pid, nonce);
  const staging = ownValue(
    value,
    "staging_name",
    "cross_uid_capacity_lock_claim_staging_missing",
  );
  if (
    staging !== expectedStaging ||
    !STAGING_RE.test(staging)
  ) {
    fail("cross_uid_capacity_lock_claim_staging_invalid");
  }
  const custodyUid = ownValue(
    value,
    "custody_uid",
    "cross_uid_capacity_lock_claim_custody_uid_missing",
  );
  const webUid = ownValue(
    value,
    "web_uid",
    "cross_uid_capacity_lock_claim_web_uid_missing",
  );
  const sharedGid = ownValue(
    value,
    "shared_gid",
    "cross_uid_capacity_lock_claim_shared_gid_missing",
  );
  if (
    custodyUid !== config.custody_uid ||
    webUid !== config.web_uid ||
    sharedGid !== config.shared_gid
  ) {
    fail("cross_uid_capacity_lock_claim_config_binding_mismatch");
  }
  return Object.freeze({
    schema: CLAIM_SCHEMA,
    uid,
    role,
    pid,
    process_start_ticks: processStartTicks,
    nonce,
    staging_name: staging,
    created_at_utc: canonicalUtc(
      ownValue(
        value,
        "created_at_utc",
        "cross_uid_capacity_lock_claim_created_at_missing",
      ),
    ),
    custody_uid: custodyUid,
    web_uid: webUid,
    shared_gid: sharedGid,
  });
}

function procPath(directoryFd, name) {
  if (
    typeof name !== "string" ||
    name.includes("/") ||
    name.includes("\0") ||
    name === "." ||
    name === ".."
  ) {
    fail("cross_uid_capacity_lock_leaf_name_invalid");
  }
  return `/proc/self/fd/${directoryFd}/${name}`;
}

function verifyClaimFileMetadata(metadata, config) {
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.gid !== config.shared_gid ||
    (metadata.mode & 0o7777) !== 0o640 ||
    metadata.nlink < 1 ||
    metadata.nlink > 2 ||
    (metadata.uid !== config.custody_uid && metadata.uid !== config.web_uid) ||
    metadata.size < 2 ||
    metadata.size > MAX_CLAIM_BYTES
  ) {
    fail("cross_uid_capacity_lock_claim_metadata_invalid");
  }
}

function openAndReadLock(config, sharedFd) {
  const lockPath = procPath(sharedFd, LOCK_NAME);
  let fd;
  try {
    fd = fs.openSync(lockPath, fileReadFlags());
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  try {
    const before = fs.fstatSync(fd);
    const visibleBefore = fs.lstatSync(lockPath);
    verifyClaimFileMetadata(before, config);
    if (!sameFileIdentity(before, visibleBefore)) {
      fail("cross_uid_capacity_lock_lock_path_fd_mismatch");
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    const visibleAfter = fs.lstatSync(lockPath);
    if (
      !sameFileIdentity(before, after) ||
      !sameFileIdentity(before, visibleAfter) ||
      before.size !== after.size ||
      before.size !== visibleAfter.size
    ) {
      fail("cross_uid_capacity_lock_claim_changed_during_read");
    }
    const claim = parseClaim(bytes, config, before);
    return Object.freeze({ fd, stat: before, claim });
  } catch (error) {
    try { fs.closeSync(fd); } catch {}
    throw error;
  }
}

function verifyHeldLock(config, sharedFd, held) {
  const lockPath = procPath(sharedFd, LOCK_NAME);
  const descriptor = fs.fstatSync(held.fd);
  const visible = fs.lstatSync(lockPath);
  verifyClaimFileMetadata(descriptor, config);
  if (
    !sameFileIdentity(held.stat, descriptor) ||
    !sameFileIdentity(held.stat, visible) ||
    visible.uid !== held.claim.uid
  ) {
    fail("cross_uid_capacity_lock_held_inode_replaced");
  }
}

function writeStagingClaim(config, sharedFd, claim) {
  const stagingPath = procPath(sharedFd, claim.staging_name);
  let fd;
  try {
    fd = fs.openSync(stagingPath, fileCreateFlags(), 0o640);
    fs.fchmodSync(fd, 0o640);
    const metadata = fs.fstatSync(fd);
    if (
      !metadata.isFile() ||
      metadata.uid !== claim.uid ||
      metadata.gid !== config.shared_gid ||
      (metadata.mode & 0o7777) !== 0o640 ||
      metadata.nlink !== 1
    ) {
      fail("cross_uid_capacity_lock_staging_metadata_invalid");
    }
    fs.writeFileSync(fd, encodeClaim(claim));
    fs.fsyncSync(fd);
    const after = fs.fstatSync(fd);
    const visible = fs.lstatSync(stagingPath);
    if (
      after.size < 2 ||
      after.size > MAX_CLAIM_BYTES ||
      !sameFileIdentity(after, visible) ||
      after.nlink !== 1
    ) {
      fail("cross_uid_capacity_lock_staging_write_unqualified");
    }
    fs.fsyncSync(sharedFd);
    return Object.freeze({ fd, stat: after, path: stagingPath });
  } catch (error) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
    throw error;
  }
}

function removeStaging(config, sharedFd, staging, allowMissing = false) {
  try {
    const visible = fs.lstatSync(staging.path);
    const descriptor = fs.fstatSync(staging.fd);
    if (
      !sameFileIdentity(staging.stat, descriptor) ||
      !sameFileIdentity(staging.stat, visible) ||
      visible.gid !== config.shared_gid
    ) {
      fail("cross_uid_capacity_lock_staging_replaced");
    }
    fs.unlinkSync(staging.path);
    fs.fsyncSync(sharedFd);
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return;
    throw error;
  }
}

function tryCreateLock(config, participant, sharedFd) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const claim = makeClaim(config, participant, nonce);
  const staging = writeStagingClaim(config, sharedFd, claim);
  const lockPath = procPath(sharedFd, LOCK_NAME);
  let linked = false;
  let heldFd;
  try {
    try {
      fs.linkSync(staging.path, lockPath);
      linked = true;
      fs.fsyncSync(sharedFd);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      removeStaging(config, sharedFd, staging);
      fs.closeSync(staging.fd);
      return null;
    }

    heldFd = fs.openSync(lockPath, fileReadFlags());
    const lockStat = fs.fstatSync(heldFd);
    const visible = fs.lstatSync(lockPath);
    const stagingStat = fs.fstatSync(staging.fd);
    if (
      !sameFileIdentity(stagingStat, lockStat) ||
      !sameFileIdentity(lockStat, visible) ||
      lockStat.uid !== participant.uid ||
      lockStat.gid !== config.shared_gid ||
      (lockStat.mode & 0o7777) !== 0o640 ||
      lockStat.nlink !== 2
    ) {
      fail("cross_uid_capacity_lock_link_identity_invalid");
    }

    removeStaging(config, sharedFd, staging);
    fs.closeSync(staging.fd);
    const after = fs.fstatSync(heldFd);
    const visibleAfter = fs.lstatSync(lockPath);
    if (
      !sameFileIdentity(lockStat, after) ||
      !sameFileIdentity(lockStat, visibleAfter) ||
      after.nlink !== 1 ||
      visibleAfter.nlink !== 1
    ) {
      fail("cross_uid_capacity_lock_staging_release_unqualified");
    }
    return Object.freeze({ fd: heldFd, stat: after, claim });
  } catch (error) {
    try { fs.closeSync(staging.fd); } catch {}
    if (heldFd !== undefined) {
      try { fs.closeSync(heldFd); } catch {}
    }
    if (linked) {
      fail("cross_uid_capacity_lock_acquire_failed_lock_retained", error);
    }
    throw error;
  }
}

function removeStaleLock(config, participant, sharedFd, held) {
  if (
    participant.uid !== held.claim.uid &&
    participant.uid !== config.custody_uid
  ) {
    fail("cross_uid_capacity_lock_foreign_stale_claim_requires_custody_recovery");
  }

  verifyHeldLock(config, sharedFd, held);
  const stagingPath = procPath(sharedFd, held.claim.staging_name);
  try {
    const stagingVisible = fs.lstatSync(stagingPath);
    if (!sameFileIdentity(held.stat, stagingVisible)) {
      fail("cross_uid_capacity_lock_stale_staging_inode_mismatch");
    }
    fs.unlinkSync(stagingPath);
    fs.fsyncSync(sharedFd);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  verifyHeldLock(config, sharedFd, held);
  fs.unlinkSync(procPath(sharedFd, LOCK_NAME));
  fs.fsyncSync(sharedFd);
}

async function acquire(config, participant, opened) {
  const sharedFd = opened.at(-1).fd;
  const deadline = Date.now() + config.wait_timeout_ms;

  while (true) {
    assertSharedDirectoryStillBound(config, opened);
    let observed = openAndReadLock(config, sharedFd);
    if (observed === null) {
      const created = tryCreateLock(config, participant, sharedFd);
      if (created !== null) {
        assertSharedDirectoryStillBound(config, opened);
        return created;
      }
      observed = openAndReadLock(config, sharedFd);
      if (observed === null) continue;
    }

    try {
      if (!claimIncarnationCurrent(observed.claim)) {
        removeStaleLock(config, participant, sharedFd, observed);
        fs.closeSync(observed.fd);
        continue;
      }
    } catch (error) {
      try { fs.closeSync(observed.fd); } catch {}
      throw error;
    }

    fs.closeSync(observed.fd);
    if (Date.now() >= deadline) {
      fail("cross_uid_capacity_lock_wait_timeout");
    }
    await sleep(config.poll_interval_ms);
  }
}

function releaseHeld(config, opened, held) {
  const sharedFd = opened.at(-1).fd;
  assertSharedDirectoryStillBound(config, opened);
  verifyHeldLock(config, sharedFd, held);
  let unlinked = false;
  try {
    fs.unlinkSync(procPath(sharedFd, LOCK_NAME));
    unlinked = true;
    fs.fsyncSync(sharedFd);
    assertSharedDirectoryStillBound(config, opened);
  } catch (error) {
    if (unlinked) {
      fail("cross_uid_capacity_lock_release_uncertain", error);
    }
    fail("cross_uid_capacity_lock_release_failed_lock_retained", error);
  }
}

function closeOpened(opened) {
  for (const entry of opened.reverse()) {
    try { fs.closeSync(entry.fd); } catch {}
  }
}

export async function withBuyVoidCrossUidCapacityExclusiveLockV1(
  rawConfig,
  criticalSection,
) {
  const config = normalizeConfig(rawConfig);
  if (typeof criticalSection !== "function") {
    fail("cross_uid_capacity_lock_critical_section_required");
  }
  const participant = requireParticipant(config);
  const opened = openSharedDirectory(config);
  let held;
  try {
    held = await acquire(config, participant, opened);
    verifyHeldLock(config, opened.at(-1).fd, held);

    let result;
    try {
      result = await criticalSection();
    } catch (error) {
      try { fs.closeSync(held.fd); } catch {}
      held = null;
      fail("cross_uid_capacity_lock_callback_failed_lock_retained", error);
    }

    releaseHeld(config, opened, held);
    fs.closeSync(held.fd);
    held = null;
    return Object.freeze({
      marker: VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
      ok: true,
      status: "completed",
      participant_role: participant.role,
      participant_uid: participant.uid,
      custody_uid: config.custody_uid,
      web_uid: config.web_uid,
      shared_gid: config.shared_gid,
      exclusive_critical_section_completed: true,
      lock_release_fsynced: true,
      callback_failure_retains_lock: true,
      cross_uid_serialization_source_proven: true,
      payment_event_write: false,
      allocation_write: false,
      production_runtime_mounted: false,
      production_gate_ready: false,
      presale_activation: false,
      funds_movement: false,
      result,
    });
  } finally {
    if (held) {
      try { fs.closeSync(held.fd); } catch {}
    }
    closeOpened(opened);
  }
}

export const VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_CONTRACT_V1 =
  Object.freeze({
    marker: VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
    authority: VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_AUTHORITY_V1,
    lock_name: LOCK_NAME,
    claim_schema: CLAIM_SCHEMA,
    shared_directory_mode: "03770",
    claim_file_mode: "0640",
    configuration_is_trusted_startup_input: true,
    shared_directory_is_preprovisioned: true,
    callback_may_be_async: true,
    callback_failure_recovery_requires_process_exit_or_separate_review: true,
    live_uid_gid_path_qualification: false,
    custody_service_composition: false,
    payment_capacity_runtime_mounted: false,
    reserve_recover_enabled: false,
  });
