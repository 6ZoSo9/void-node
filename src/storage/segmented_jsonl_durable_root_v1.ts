// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { TextDecoder } from "node:util";

import {
  verifySegmentedJsonlCheckpointAnchorV1,
  verifySegmentedJsonlCheckpointIncrementalV1,
  verifySegmentedJsonlSnapshotAuthorityObjectV1,
  type SegmentedJsonlCheckpointAnchorV1,
  type SegmentedJsonlCheckpointV1,
  type SegmentedJsonlSnapshotAuthorityV1,
} from "./segmented_jsonl_snapshot_authority_v1.js";
import {
  verifySegmentedJsonlMaterializedAuthorityAtUseV1,
  verifySegmentedJsonlMaterializedAuthorityObjectV1,
  type SegmentedJsonlMaterializedAuthorityV1,
  type SegmentedJsonlMaterializedUseReaderV1,
} from "./segmented_jsonl_materialized_authority_v1.js";
import {
  verifySegmentedJsonlCheckpointAppendOnlyBoundedV1,
  type SegmentedJsonlAppendOnlyCheckpointWitnessV1,
} from "./segmented_jsonl_checkpoint_materialized_authority_v1.js";

export const VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 = "VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1";
export const VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1 = "VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1";
export const VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1 = 8192;

const SLOT_NAMES = ["durable-root-slot-0.v1.json", "durable-root-slot-1.v1.json"] as const;
const PUBLISH_LOCK_NAME = ".durable-root-publish-v1.lock";
const PUBLISH_LOCK_OWNER_NAME = "owner.v1.json";
const PUBLISH_LOCK_RECLAIM_NAME = "reclaim.v1";
const PUBLISH_STAGE_INTENT_RE = /^slot-stage-([01])-([0-9a-f]{32})-([0-9a-f]{64})\.v1$/;
const FATAL_UTF8 = new TextDecoder("utf-8", { fatal: true });

export type SegmentedJsonlDurableRootV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1;
  store_generation: number;
  checkpoint_sha256: string;
  snapshot_sha256: string;
  manifest_sha256: string;
  materialized_authority_sha256: string;
  materialized_sha256: string;
  append_only_witness_sha256: string | null;
  previous_root_sha256: string | null;
  total_bytes: number;
  total_records: number;
  root_sha256: string;
};

export type SegmentedJsonlDurableRootSlotV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1;
  slot_index: 0 | 1;
  slot_dev: string;
  slot_ino: string;
  peer_slot_dev: string | null;
  peer_slot_ino: string | null;
  root: SegmentedJsonlDurableRootV1;
  slot_sha256: string;
};

export type SegmentedJsonlDurableRootPublishInputV1 = {
  checkpoint: SegmentedJsonlCheckpointV1;
  snapshot: SegmentedJsonlSnapshotAuthorityV1;
  materialized: SegmentedJsonlMaterializedAuthorityV1;
  previousAnchor?: SegmentedJsonlCheckpointAnchorV1 | null;
  previousMaterialized?: SegmentedJsonlMaterializedAuthorityV1 | null;
  appendOnlyWitness?: SegmentedJsonlAppendOnlyCheckpointWitnessV1 | null;
  trustedAppendOnlyWitnessSha256?: string | null;
};

type DirectoryAuthorityV1 = {
  fd: number;
  publicPath: string;
  stablePath: string;
  dev: string;
  ino: string;
};

type SlotIdentityV1 = { dev: string; ino: string };
type PublishLockOwnerV1 = {
  v: 1;
  boot_id: string;
  pid: number;
  start_ticks: string;
  token: string;
  state: "held" | "released";
};
type PublishLockFileV1 = {
  identity: SlotIdentityV1;
  owner: PublishLockOwnerV1 | null;
  links: number;
};
type PublishLockV1 = DirectoryAuthorityV1 & { owner: PublishLockOwnerV1 };
type SlotReadV1 = {
  index: 0 | 1;
  path: string;
  exists: boolean;
  identity: SlotIdentityV1 | null;
  value: SegmentedJsonlDurableRootSlotV1 | null;
};
type StageIntentV1 = {
  name: string;
  index: 0 | 1;
  publisherToken: string;
  intentSha256: string;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1}:${code}:${detail}`);
}

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function requireExactKeys(value: object, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, actual.join(","));
  }
}

function currentUid(): bigint {
  if (typeof process.getuid !== "function") fail("UID_UNAVAILABLE", "process.getuid");
  return BigInt(process.getuid());
}

function directoryFlags(): number {
  return fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0) | ((fs.constants as any).O_NOFOLLOW || 0);
}

function assertPrivateDirectory(st: any, label: string): void {
  const mode = Number(st.mode) & 0o777;
  if (!st.isDirectory() || st.uid !== currentUid() || (mode & 0o022) !== 0 || (mode & 0o300) !== 0o300) {
    fail("DURABLE_ROOT_DIRECTORY_AUTHORITY_MISMATCH", `${label}:uid=${String(st.uid)}:mode=${mode.toString(8)}`);
  }
}

function openDirectoryAuthority(dirInput: string): DirectoryAuthorityV1 {
  const publicPath = path.resolve(String(dirInput || ""));
  if (!publicPath || publicPath === path.parse(publicPath).root) fail("INVALID_DURABLE_ROOT_DIRECTORY", publicPath || "empty");
  const parsed = path.parse(publicPath);
  let fd = fs.openSync(parsed.root, directoryFlags());
  let visible = parsed.root;
  try {
    for (const component of publicPath.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
      const stableChild = path.join(`/proc/self/fd/${fd}`, component);
      const nextFd = fs.openSync(stableChild, directoryFlags());
      try {
        const opened = fs.fstatSync(nextFd, { bigint: true } as any);
        visible = path.join(visible, component);
        const current = fs.lstatSync(visible, { bigint: true } as any);
        if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino) {
          fail("DURABLE_ROOT_DIRECTORY_NAMESPACE_MISMATCH", visible);
        }
      } catch (error) {
        fs.closeSync(nextFd);
        throw error;
      }
      fs.closeSync(fd);
      fd = nextFd;
    }
    const opened = fs.fstatSync(fd, { bigint: true } as any);
    const current = fs.lstatSync(publicPath, { bigint: true } as any);
    if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino) {
      fail("DURABLE_ROOT_DIRECTORY_NAMESPACE_MISMATCH", publicPath);
    }
    assertPrivateDirectory(opened, publicPath);
    assertPrivateDirectory(current, publicPath);
    return { fd, publicPath, stablePath: `/proc/self/fd/${fd}`, dev: String(opened.dev), ino: String(opened.ino) };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertDirectoryAuthority(authority: DirectoryAuthorityV1): void {
  const opened = fs.fstatSync(authority.fd, { bigint: true } as any);
  const current = fs.lstatSync(authority.publicPath, { bigint: true } as any);
  if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || String(opened.dev) !== authority.dev || String(opened.ino) !== authority.ino || opened.dev !== current.dev || opened.ino !== current.ino) {
    fail("DURABLE_ROOT_DIRECTORY_CHANGED", authority.publicPath);
  }
  assertPrivateDirectory(opened, authority.publicPath);
  assertPrivateDirectory(current, authority.publicPath);
}

function slotIdentityFromStat(st: any, label: string): SlotIdentityV1 {
  const mode = Number(st.mode) & 0o777;
  if (!st.isFile() || st.uid !== currentUid() || mode !== 0o600 || Number(st.nlink) !== 1) {
    fail("DURABLE_ROOT_SLOT_AUTHORITY_MISMATCH", `${label}:uid=${String(st.uid)}:mode=${mode.toString(8)}:nlink=${String(st.nlink)}`);
  }
  return { dev: String(st.dev), ino: String(st.ino) };
}

function sameIdentity(a: SlotIdentityV1, b: SlotIdentityV1): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function slotIdentityFromStatAllowLinks(st: any, label: string, allowedLinks: readonly number[]): SlotIdentityV1 {
  const mode = Number(st.mode) & 0o777;
  if (!st.isFile() || st.uid !== currentUid() || mode !== 0o600 || !allowedLinks.includes(Number(st.nlink))) {
    fail("DURABLE_ROOT_SLOT_AUTHORITY_MISMATCH", `${label}:uid=${String(st.uid)}:mode=${mode.toString(8)}:nlink=${String(st.nlink)}`);
  }
  return { dev: String(st.dev), ino: String(st.ino) };
}

function processBootId(): string {
  let bootId: string;
  try { bootId = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim().toLowerCase(); }
  catch (error: any) {
    fail("DURABLE_ROOT_LOCK_BOOT_ID_UNAVAILABLE", String(error?.code || "read"));
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(bootId)) {
    fail("DURABLE_ROOT_LOCK_BOOT_ID_INVALID", bootId || "empty");
  }
  return bootId;
}

function processStartTicks(pid: number): string | null {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  let stat: string;
  try { stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8"); }
  catch (error: any) {
    if (error?.code === "ENOENT" || error?.code === "ESRCH") return null;
    fail("DURABLE_ROOT_LOCK_PROCESS_IDENTITY_UNAVAILABLE", `${pid}:${String(error?.code || "read")}`);
  }
  const close = stat.lastIndexOf(")");
  if (close < 0) fail("DURABLE_ROOT_LOCK_PROCESS_IDENTITY_INVALID", String(pid));
  const fields = stat.slice(close + 1).trim().split(/\s+/);
  const startTicks = fields[19];
  if (!startTicks || !/^[0-9]+$/.test(startTicks)) fail("DURABLE_ROOT_LOCK_PROCESS_IDENTITY_INVALID", String(pid));
  return startTicks;
}

function parsePublishLockOwner(text: string): PublishLockOwnerV1 | null {
  let value: any;
  try { value = JSON.parse(text); } catch { return null; }
  if (!value || typeof value !== "object") return null;
  const keys = Object.keys(value).sort().join(",");
  if (keys !== ["boot_id", "pid", "start_ticks", "state", "token", "v"].sort().join(",")) return null;
  if (
    value.v !== 1 || typeof value.boot_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.boot_id) ||
    !Number.isSafeInteger(value.pid) || value.pid <= 0 ||
    typeof value.start_ticks !== "string" || !/^[0-9]+$/.test(value.start_ticks) ||
    typeof value.token !== "string" || !/^[0-9a-f]{32}$/.test(value.token) ||
    (value.state !== "held" && value.state !== "released")
  ) return null;
  return value as PublishLockOwnerV1;
}

function readPublishLockFile(lock: DirectoryAuthorityV1, name: string): PublishLockFileV1 | null {
  const stablePath = path.join(lock.stablePath, name);
  let fd = -1;
  try {
    try { fd = fs.openSync(stablePath, fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0)); }
    catch (error: any) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    const before = fs.fstatSync(fd, { bigint: true } as any);
    const links = Number(before.nlink);
    const identity = slotIdentityFromStatAllowLinks(before, stablePath, [1, 2]);
    if (Number(before.size) <= 0 || Number(before.size) > 2048) {
      return { identity, owner: null, links };
    }
    const body = Buffer.alloc(Number(before.size));
    let off = 0;
    while (off < body.length) {
      const n = fs.readSync(fd, body, off, body.length - off, off);
      if (n <= 0) return { identity, owner: null, links };
      off += n;
    }
    const after = fs.fstatSync(fd, { bigint: true } as any);
    const afterIdentity = slotIdentityFromStatAllowLinks(after, stablePath, [1, 2]);
    if (!sameIdentity(identity, afterIdentity) || before.size !== after.size || links !== Number(after.nlink)) {
      fail("DURABLE_ROOT_PUBLISH_LOCK_FILE_CHANGED_DURING_READ", name);
    }
    return { identity, owner: parsePublishLockOwner(body.toString("utf8")), links };
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function readPublishLockOwner(lock: DirectoryAuthorityV1): PublishLockOwnerV1 | null {
  return readPublishLockFile(lock, PUBLISH_LOCK_OWNER_NAME)?.owner ?? null;
}

function writeExactFile(fd: number, body: Buffer, label: string): void {
  fs.ftruncateSync(fd, 0);
  let off = 0;
  while (off < body.length) {
    const n = fs.writeSync(fd, body, off, body.length - off, off);
    if (n <= 0) fail("DURABLE_ROOT_SHORT_WRITE", `${label}:${off}`);
    off += n;
  }
}

function writeNewPublishLockOwner(lock: DirectoryAuthorityV1, owner: PublishLockOwnerV1): void {
  const stablePath = path.join(lock.stablePath, PUBLISH_LOCK_OWNER_NAME);
  const body = Buffer.from(canonicalJson(owner) + "\n", "utf8");
  let fd = -1;
  try {
    fd = fs.openSync(stablePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | ((fs.constants as any).O_NOFOLLOW || 0), 0o600);
    writeExactFile(fd, body, stablePath);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
  } finally { if (fd >= 0) fs.closeSync(fd); }
  fs.fsyncSync(lock.fd);
}

function rewritePublishLockOwner(lock: PublishLockV1, state: "held" | "released"): void {
  const stablePath = path.join(lock.stablePath, PUBLISH_LOCK_OWNER_NAME);
  const body = Buffer.from(canonicalJson({ ...lock.owner, state }) + "\n", "utf8");
  let fd = -1;
  try {
    fd = fs.openSync(stablePath, fs.constants.O_RDWR | ((fs.constants as any).O_NOFOLLOW || 0));
    const current = readPublishLockOwner(lock);
    if (!current || current.token !== lock.owner.token) fail("DURABLE_ROOT_PUBLISH_LOCK_OWNER_CHANGED", stablePath);
    writeExactFile(fd, body, stablePath);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
  } finally { if (fd >= 0) fs.closeSync(fd); }
  fs.fsyncSync(lock.fd);
  lock.owner = { ...lock.owner, state };
}

function publishLockOwnerIsLive(owner: PublishLockOwnerV1 | null): boolean {
  if (!owner || owner.state !== "held") return false;
  if (owner.boot_id !== processBootId()) return false;
  return processStartTicks(owner.pid) === owner.start_ticks;
}

function openPublishLockDirectory(authority: DirectoryAuthorityV1): DirectoryAuthorityV1 {
  const publicPath = path.join(authority.publicPath, PUBLISH_LOCK_NAME);
  const stablePath = path.join(authority.stablePath, PUBLISH_LOCK_NAME);
  const fd = fs.openSync(stablePath, directoryFlags());
  try {
    const opened = fs.fstatSync(fd, { bigint: true } as any);
    const visible = fs.lstatSync(publicPath, { bigint: true } as any);
    if (!opened.isDirectory() || !visible.isDirectory() || visible.isSymbolicLink() || opened.dev !== visible.dev || opened.ino !== visible.ino) {
      fail("DURABLE_ROOT_PUBLISH_LOCK_NAMESPACE_MISMATCH", publicPath);
    }
    assertPrivateDirectory(opened, publicPath);
    assertPrivateDirectory(visible, publicPath);
    return { fd, publicPath, stablePath: `/proc/self/fd/${fd}`, dev: String(opened.dev), ino: String(opened.ino) };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function removeExactLockName(lock: DirectoryAuthorityV1, name: string, expected: SlotIdentityV1): void {
  const stablePath = path.join(lock.stablePath, name);
  const current = fs.lstatSync(stablePath, { bigint: true } as any);
  const currentIdentity = slotIdentityFromStatAllowLinks(current, stablePath, [1, 2]);
  if (!sameIdentity(currentIdentity, expected)) fail("DURABLE_ROOT_PUBLISH_LOCK_NAME_CHANGED", name);
  fs.unlinkSync(stablePath);
}

function claimStalePublishOwner(lock: DirectoryAuthorityV1): PublishLockFileV1 | null {
  const ownerPath = path.join(lock.stablePath, PUBLISH_LOCK_OWNER_NAME);
  const reclaimPath = path.join(lock.stablePath, PUBLISH_LOCK_RECLAIM_NAME);

  for (;;) {
    const ownerFile = readPublishLockFile(lock, PUBLISH_LOCK_OWNER_NAME);
    if (ownerFile?.owner && publishLockOwnerIsLive(ownerFile.owner)) {
      fail("DURABLE_ROOT_PUBLISH_BUSY", lock.publicPath);
    }
    const reclaimFile = readPublishLockFile(lock, PUBLISH_LOCK_RECLAIM_NAME);

    if (reclaimFile) {
      if (ownerFile && sameIdentity(ownerFile.identity, reclaimFile.identity)) {
        if (reclaimFile.owner && publishLockOwnerIsLive(reclaimFile.owner)) {
          fail("DURABLE_ROOT_PUBLISH_BUSY", lock.publicPath);
        }
        return reclaimFile;
      }
      if (!ownerFile) {
        if (reclaimFile.owner && publishLockOwnerIsLive(reclaimFile.owner)) {
          fail("DURABLE_ROOT_PUBLISH_BUSY", lock.publicPath);
        }
        return reclaimFile;
      }
      if (ownerFile.owner && publishLockOwnerIsLive(ownerFile.owner)) {
        fail("DURABLE_ROOT_PUBLISH_BUSY", lock.publicPath);
      }
      if (reclaimFile.owner && publishLockOwnerIsLive(reclaimFile.owner)) {
        fail("DURABLE_ROOT_PUBLISH_LOCK_RECLAIM_CONFLICT", lock.publicPath);
      }
      removeExactLockName(lock, PUBLISH_LOCK_RECLAIM_NAME, reclaimFile.identity);
      fs.fsyncSync(lock.fd);
      continue;
    }

    if (!ownerFile) return null;
    try {
      fs.linkSync(ownerPath, reclaimPath);
    } catch (error: any) {
      if (error?.code === "EEXIST") continue;
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    fs.fsyncSync(lock.fd);
    const ownerAfter = readPublishLockFile(lock, PUBLISH_LOCK_OWNER_NAME);
    const reclaimAfter = readPublishLockFile(lock, PUBLISH_LOCK_RECLAIM_NAME);
    if (!ownerAfter || !reclaimAfter || !sameIdentity(ownerFile.identity, ownerAfter.identity) || !sameIdentity(ownerAfter.identity, reclaimAfter.identity)) {
      if (reclaimAfter && sameIdentity(reclaimAfter.identity, ownerFile.identity)) {
        removeExactLockName(lock, PUBLISH_LOCK_RECLAIM_NAME, reclaimAfter.identity);
        fs.fsyncSync(lock.fd);
      }
      fail("DURABLE_ROOT_PUBLISH_LOCK_RECLAIM_OWNER_CHANGED", lock.publicPath);
    }
    return reclaimAfter;
  }
}

function acquirePublishLock(authority: DirectoryAuthorityV1): PublishLockV1 {
  assertDirectoryAuthority(authority);
  const stableLockPath = path.join(authority.stablePath, PUBLISH_LOCK_NAME);
  let created = false;
  try {
    fs.mkdirSync(stableLockPath, { mode: 0o700 });
    created = true;
    fs.fsyncSync(authority.fd);
  } catch (error: any) {
    if (error?.code !== "EEXIST") throw error;
  }

  const lock = openPublishLockDirectory(authority);
  try {
    const owner: PublishLockOwnerV1 = {
      v: 1,
      boot_id: processBootId(),
      pid: process.pid,
      start_ticks: processStartTicks(process.pid) || fail("DURABLE_ROOT_LOCK_PROCESS_IDENTITY_INVALID", String(process.pid)),
      token: crypto.randomBytes(16).toString("hex"),
      state: "held",
    };

    if (created) {
      writeNewPublishLockOwner(lock, owner);
      assertDirectoryAuthority(lock);
      return { ...lock, owner };
    }

    const claim = claimStalePublishOwner(lock);
    if (claim) {
      const currentOwner = readPublishLockFile(lock, PUBLISH_LOCK_OWNER_NAME);
      if (currentOwner) {
        if (!sameIdentity(currentOwner.identity, claim.identity)) {
          fail("DURABLE_ROOT_PUBLISH_LOCK_RECLAIM_OWNER_CHANGED", lock.publicPath);
        }
        if (currentOwner.owner && publishLockOwnerIsLive(currentOwner.owner)) {
          fail("DURABLE_ROOT_PUBLISH_BUSY", lock.publicPath);
        }
        removeExactLockName(lock, PUBLISH_LOCK_OWNER_NAME, claim.identity);
        fs.fsyncSync(lock.fd);
      }
    }

    try {
      writeNewPublishLockOwner(lock, owner);
    } catch (error: any) {
      if (error?.code === "EEXIST") fail("DURABLE_ROOT_PUBLISH_BUSY", lock.publicPath);
      throw error;
    }

    const reclaimAfterOwner = readPublishLockFile(lock, PUBLISH_LOCK_RECLAIM_NAME);
    if (reclaimAfterOwner) {
      if (!claim || !sameIdentity(reclaimAfterOwner.identity, claim.identity)) {
        fail("DURABLE_ROOT_PUBLISH_LOCK_RECLAIM_CHANGED", lock.publicPath);
      }
      removeExactLockName(lock, PUBLISH_LOCK_RECLAIM_NAME, claim.identity);
      fs.fsyncSync(lock.fd);
    }
    assertDirectoryAuthority(lock);
    const observed = readPublishLockOwner(lock);
    if (!observed || observed.token !== owner.token || observed.state !== "held" || observed.boot_id !== owner.boot_id) {
      fail("DURABLE_ROOT_PUBLISH_LOCK_OWNER_CHANGED", lock.publicPath);
    }
    return { ...lock, owner };
  } catch (error) {
    fs.closeSync(lock.fd);
    throw error;
  }
}

function releasePublishLock(_authority: DirectoryAuthorityV1, lock: PublishLockV1): void {
  const observed = readPublishLockOwner(lock);
  if (!observed || observed.token !== lock.owner.token || observed.state !== "held" || observed.boot_id !== lock.owner.boot_id) {
    fail("DURABLE_ROOT_PUBLISH_LOCK_OWNER_CHANGED", lock.publicPath);
  }
  // Release by removing only our exact owner record. The private lock
  // directory is intentionally retained as one lifetime-bounded coordination
  // object. A crash before the directory fsync may resurrect this held owner,
  // but boot-id/PID/start-tick stale reclamation then recovers it safely. The
  // reclaim marker, when present, is an exact hard-link witness to the stale
  // owner generation rather than a separately writable process claim.
  const ownerFile = readPublishLockFile(lock, PUBLISH_LOCK_OWNER_NAME);
  if (!ownerFile || !ownerFile.owner || ownerFile.owner.token !== lock.owner.token) {
    fail("DURABLE_ROOT_PUBLISH_LOCK_OWNER_CHANGED", lock.publicPath);
  }
  removeExactLockName(lock, PUBLISH_LOCK_OWNER_NAME, ownerFile.identity);
  try { fs.fsyncSync(lock.fd); } catch (error) { void error; /* stale-owner recovery is authoritative */ }
  fs.closeSync(lock.fd);
}

function verifyRootObject(rootInput: SegmentedJsonlDurableRootV1): SegmentedJsonlDurableRootV1 {
  const root = rootInput as SegmentedJsonlDurableRootV1;
  if (!root || typeof root !== "object") fail("INVALID_DURABLE_ROOT", "not-object");
  requireExactKeys(root, [
    "v", "format", "store_generation", "checkpoint_sha256", "snapshot_sha256",
    "manifest_sha256", "materialized_authority_sha256", "materialized_sha256",
    "append_only_witness_sha256", "previous_root_sha256", "total_bytes", "total_records", "root_sha256",
  ], "INVALID_DURABLE_ROOT_KEYS");
  if (
    root.v !== 1 || root.format !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 ||
    !Number.isSafeInteger(root.store_generation) || root.store_generation <= 0 ||
    !isHex64(root.checkpoint_sha256) || !isHex64(root.snapshot_sha256) || !isHex64(root.manifest_sha256) ||
    !isHex64(root.materialized_authority_sha256) || !isHex64(root.materialized_sha256) ||
    !(root.append_only_witness_sha256 === null || isHex64(root.append_only_witness_sha256)) ||
    !(root.previous_root_sha256 === null || isHex64(root.previous_root_sha256)) ||
    !Number.isSafeInteger(root.total_bytes) || root.total_bytes < 0 ||
    !Number.isSafeInteger(root.total_records) || root.total_records < 0 || !isHex64(root.root_sha256)
  ) fail("INVALID_DURABLE_ROOT", "shape");
  if (root.store_generation === 1) {
    if (root.previous_root_sha256 !== null || root.append_only_witness_sha256 !== null) fail("DURABLE_ROOT_GENESIS_PREDECESSOR", root.root_sha256);
  } else if (root.previous_root_sha256 === null || root.append_only_witness_sha256 === null) {
    fail("DURABLE_ROOT_PREDECESSOR_REQUIRED", root.root_sha256);
  }
  const { root_sha256: _digest, ...core } = root;
  if (sha256(canonicalJson(core)) !== root.root_sha256) fail("DURABLE_ROOT_DIGEST_MISMATCH", root.root_sha256);
  return root;
}

function verifySlotObject(slotInput: SegmentedJsonlDurableRootSlotV1): SegmentedJsonlDurableRootSlotV1 {
  const slot = slotInput as SegmentedJsonlDurableRootSlotV1;
  if (!slot || typeof slot !== "object") fail("INVALID_DURABLE_ROOT_SLOT", "not-object");
  requireExactKeys(slot, [
    "v", "format", "slot_index", "slot_dev", "slot_ino", "peer_slot_dev", "peer_slot_ino", "root", "slot_sha256",
  ], "INVALID_DURABLE_ROOT_SLOT_KEYS");
  if (
    slot.v !== 1 || slot.format !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1 ||
    (slot.slot_index !== 0 && slot.slot_index !== 1) ||
    typeof slot.slot_dev !== "string" || !/^[0-9]+$/.test(slot.slot_dev) ||
    typeof slot.slot_ino !== "string" || !/^[0-9]+$/.test(slot.slot_ino) ||
    !((slot.peer_slot_dev === null && slot.peer_slot_ino === null) ||
      (typeof slot.peer_slot_dev === "string" && /^[0-9]+$/.test(slot.peer_slot_dev) && typeof slot.peer_slot_ino === "string" && /^[0-9]+$/.test(slot.peer_slot_ino))) ||
    !isHex64(slot.slot_sha256)
  ) fail("INVALID_DURABLE_ROOT_SLOT", "shape");
  const root = verifyRootObject(slot.root);
  if ((root.store_generation - 1) % 2 !== slot.slot_index) fail("DURABLE_ROOT_SLOT_PARITY_MISMATCH", String(root.store_generation));
  const { slot_sha256: _digest, ...core } = slot;
  if (sha256(canonicalJson(core)) !== slot.slot_sha256) fail("DURABLE_ROOT_SLOT_DIGEST_MISMATCH", slot.slot_sha256);
  return { ...slot, root };
}

function encodeSlot(slot: SegmentedJsonlDurableRootSlotV1): Buffer {
  const json = Buffer.from(canonicalJson(slot), "utf8");
  if (json.length + 1 > VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1) fail("DURABLE_ROOT_SLOT_TOO_LARGE", String(json.length));
  const body = Buffer.alloc(VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1, 0x20);
  json.copy(body, 0);
  body[json.length] = 0x0a;
  return body;
}

function decodeSlot(body: Buffer): SegmentedJsonlDurableRootSlotV1 {
  let end = body.indexOf(0x0a);
  if (end < 0) fail("INVALID_DURABLE_ROOT_SLOT_ENCODING", "newline");
  for (let i = end + 1; i < body.length; i += 1) if (body[i] !== 0x20) fail("INVALID_DURABLE_ROOT_SLOT_ENCODING", `padding=${i}`);
  let text: string;
  try { text = FATAL_UTF8.decode(body.subarray(0, end)); }
  catch { fail("INVALID_DURABLE_ROOT_SLOT_UTF8", "decode"); }
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { fail("INVALID_DURABLE_ROOT_SLOT_JSON", "parse"); }
  return verifySlotObject(parsed as SegmentedJsonlDurableRootSlotV1);
}

function readSlot(authority: DirectoryAuthorityV1, index: 0 | 1): SlotReadV1 {
  assertDirectoryAuthority(authority);
  const publicPath = path.join(authority.publicPath, SLOT_NAMES[index]);
  const stablePath = path.join(authority.stablePath, SLOT_NAMES[index]);
  let fd = -1;
  try {
    try { fd = fs.openSync(stablePath, fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0)); }
    catch (error: any) {
      if (error?.code === "ENOENT") return { index, path: publicPath, exists: false, identity: null, value: null };
      throw error;
    }
    const beforeStat = fs.fstatSync(fd, { bigint: true } as any);
    const identity = slotIdentityFromStat(beforeStat, publicPath);
    const visible = fs.lstatSync(publicPath, { bigint: true } as any);
    const visibleIdentity = slotIdentityFromStat(visible, publicPath);
    if (!sameIdentity(identity, visibleIdentity)) fail("DURABLE_ROOT_SLOT_PATH_MISMATCH", publicPath);
    if (Number(beforeStat.size) !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1) {
      return { index, path: publicPath, exists: true, identity, value: null };
    }
    const body = Buffer.alloc(VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1);
    let off = 0;
    while (off < body.length) {
      const n = fs.readSync(fd, body, off, body.length - off, null);
      if (n <= 0) return { index, path: publicPath, exists: true, identity, value: null };
      off += n;
    }
    const afterStat = fs.fstatSync(fd, { bigint: true } as any);
    const afterIdentity = slotIdentityFromStat(afterStat, publicPath);
    const visibleAfter = slotIdentityFromStat(fs.lstatSync(publicPath, { bigint: true } as any), publicPath);
    if (!sameIdentity(identity, afterIdentity) || !sameIdentity(afterIdentity, visibleAfter)) fail("DURABLE_ROOT_SLOT_CHANGED_DURING_READ", publicPath);
    let value: SegmentedJsonlDurableRootSlotV1 | null = null;
    try { value = decodeSlot(body); } catch { value = null; }
    if (value && (value.slot_dev !== identity.dev || value.slot_ino !== identity.ino || value.slot_index !== index)) {
      value = null;
    }
    return { index, path: publicPath, exists: true, identity, value };
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function selectCurrent(slots: [SlotReadV1, SlotReadV1]): SlotReadV1 | null {
  const valid = slots.filter(slot => slot.value !== null) as Array<SlotReadV1 & { value: SegmentedJsonlDurableRootSlotV1 }>;
  if (valid.length === 0) return null;
  valid.sort((a, b) => a.value.root.store_generation - b.value.root.store_generation);
  if (valid.length === 2) {
    const older = valid[0], newer = valid[1];
    if (newer.value.root.store_generation !== older.value.root.store_generation + 1 || newer.value.root.previous_root_sha256 !== older.value.root.root_sha256) {
      fail("DURABLE_ROOT_SLOT_CHAIN_MISMATCH", `${older.value.root.store_generation}:${newer.value.root.store_generation}`);
    }
    if (
      !older.identity || !newer.identity ||
      newer.value.peer_slot_dev !== older.identity.dev || newer.value.peer_slot_ino !== older.identity.ino ||
      (older.value.root.store_generation !== 1 &&
        (older.value.peer_slot_dev !== newer.identity.dev || older.value.peer_slot_ino !== newer.identity.ino))
    ) fail("DURABLE_ROOT_SLOT_PEER_IDENTITY_MISMATCH", `${older.index}:${newer.index}`);
  }
  return valid[valid.length - 1];
}

function assertMaterializedSnapshotBinding(snapshot: SegmentedJsonlSnapshotAuthorityV1, materialized: SegmentedJsonlMaterializedAuthorityV1): void {
  if (
    materialized.snapshot_sha256 !== snapshot.snapshot_sha256 || materialized.manifest_sha256 !== snapshot.manifest_sha256 ||
    materialized.store_generation !== snapshot.generation || materialized.total_bytes !== snapshot.total_bytes || materialized.total_records !== snapshot.total_records
  ) fail("DURABLE_ROOT_MATERIALIZED_BINDING_MISMATCH", snapshot.snapshot_sha256);
}

function deriveRoot(input: SegmentedJsonlDurableRootPublishInputV1, current: SegmentedJsonlDurableRootV1 | null): SegmentedJsonlDurableRootV1 {
  const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(input.snapshot);
  const materialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(input.materialized);
  assertMaterializedSnapshotBinding(snapshot, materialized);
  const previousAnchor = input.previousAnchor ? verifySegmentedJsonlCheckpointAnchorV1(input.previousAnchor) : null;
  const checkpoint = verifySegmentedJsonlCheckpointIncrementalV1(input.checkpoint, snapshot, previousAnchor);
  let witnessSha: string | null = null;
  let previousRootSha: string | null = null;

  if (current === null) {
    if (snapshot.generation !== 1 || previousAnchor || input.previousMaterialized || input.appendOnlyWitness || input.trustedAppendOnlyWitnessSha256) {
      fail("DURABLE_ROOT_GENESIS_INPUT_MISMATCH", String(snapshot.generation));
    }
  } else {
    if (snapshot.generation !== current.store_generation + 1 || !previousAnchor || !input.previousMaterialized || !input.appendOnlyWitness || !isHex64(input.trustedAppendOnlyWitnessSha256)) {
      fail("DURABLE_ROOT_SUCCESSOR_INPUT_MISMATCH", `${current.store_generation}:${snapshot.generation}`);
    }
    const previousMaterialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(input.previousMaterialized);
    if (
      current.checkpoint_sha256 !== previousAnchor.checkpoint.checkpoint_sha256 ||
      current.snapshot_sha256 !== previousAnchor.snapshot.snapshot_sha256 ||
      current.materialized_authority_sha256 !== previousMaterialized.authority_sha256 ||
      current.materialized_sha256 !== previousMaterialized.materialized_sha256
    ) fail("DURABLE_ROOT_PREDECESSOR_BINDING_MISMATCH", current.root_sha256);
    const witness = verifySegmentedJsonlCheckpointAppendOnlyBoundedV1(
      checkpoint, snapshot, previousAnchor, previousMaterialized, materialized,
      input.appendOnlyWitness, current.materialized_authority_sha256, input.trustedAppendOnlyWitnessSha256,
    );
    witnessSha = witness.witness_sha256;
    previousRootSha = current.root_sha256;
  }

  const core = {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 as typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
    store_generation: snapshot.generation,
    checkpoint_sha256: checkpoint.checkpoint_sha256,
    snapshot_sha256: snapshot.snapshot_sha256,
    manifest_sha256: snapshot.manifest_sha256,
    materialized_authority_sha256: materialized.authority_sha256,
    materialized_sha256: materialized.materialized_sha256,
    append_only_witness_sha256: witnessSha,
    previous_root_sha256: previousRootSha,
    total_bytes: snapshot.total_bytes,
    total_records: snapshot.total_records,
  };
  return verifyRootObject({ ...core, root_sha256: sha256(canonicalJson(core)) });
}

function buildSlotValue(index: 0 | 1, identity: SlotIdentityV1, peer: SlotIdentityV1 | null, root: SegmentedJsonlDurableRootV1): SegmentedJsonlDurableRootSlotV1 {
  const core = {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1 as typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1,
    slot_index: index,
    slot_dev: identity.dev,
    slot_ino: identity.ino,
    peer_slot_dev: peer?.dev ?? null,
    peer_slot_ino: peer?.ino ?? null,
    root,
  };
  return verifySlotObject({ ...core, slot_sha256: sha256(canonicalJson(core)) });
}

function readSlotValueFromFd(fd: number, identity: SlotIdentityV1, index: 0 | 1): SegmentedJsonlDurableRootSlotV1 | null {
  const stat = fs.fstatSync(fd, { bigint: true } as any);
  if (Number(stat.size) !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1) return null;
  const body = Buffer.alloc(VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1);
  let off = 0;
  while (off < body.length) {
    const n = fs.readSync(fd, body, off, body.length - off, off);
    if (n <= 0) return null;
    off += n;
  }
  let value: SegmentedJsonlDurableRootSlotV1;
  try { value = decodeSlot(body); } catch { return null; }
  if (value.slot_dev !== identity.dev || value.slot_ino !== identity.ino || value.slot_index !== index) return null;
  return value;
}

function stageIntentDigest(
  index: 0 | 1,
  publisherToken: string,
  identity: SlotIdentityV1,
  value: SegmentedJsonlDurableRootSlotV1,
): string {
  return sha256(canonicalJson({
    v: 1,
    target_slot: index,
    publisher_token: publisherToken,
    predecessor_root_sha256: value.root.previous_root_sha256,
    candidate_root_sha256: value.root.root_sha256,
    stage_dev: identity.dev,
    stage_ino: identity.ino,
    slot_sha256: value.slot_sha256,
  }));
}

function stageIntentName(index: 0 | 1, publisherToken: string, intentSha256: string): string {
  return `slot-stage-${index}-${publisherToken}-${intentSha256}.v1`;
}

function preStageName(index: 0 | 1, publisherToken: string): string {
  return `slot-prestage-${index}-${publisherToken}.v1`;
}

function parseStageIntentName(name: string): StageIntentV1 | null {
  const match = PUBLISH_STAGE_INTENT_RE.exec(name);
  if (!match) return null;
  return {
    name,
    index: Number(match[1]) as 0 | 1,
    publisherToken: match[2],
    intentSha256: match[3],
  };
}

function assertStagePredecessor(
  authority: DirectoryAuthorityV1,
  index: 0 | 1,
  value: SegmentedJsonlDurableRootSlotV1,
): void {
  if (value.root.store_generation === 1) {
    if (
      index !== 0 || value.root.previous_root_sha256 !== null ||
      value.peer_slot_dev !== null || value.peer_slot_ino !== null
    ) fail("DURABLE_ROOT_STAGE_INTENT_PREDECESSOR_MISMATCH", `${index}:genesis`);
    const peer = readSlot(authority, 1);
    if (peer.exists) fail("DURABLE_ROOT_STAGE_INTENT_PREDECESSOR_MISMATCH", `${index}:genesis-peer-present`);
    return;
  }

  if (value.root.store_generation !== 2 || index !== 1) {
    fail("DURABLE_ROOT_STAGE_INTENT_GENERATION_UNSUPPORTED", `${index}:${value.root.store_generation}`);
  }
  const predecessor = readSlot(authority, 0);
  if (
    !predecessor.value || !predecessor.identity || predecessor.value.root.store_generation !== 1 ||
    value.root.previous_root_sha256 !== predecessor.value.root.root_sha256 ||
    value.peer_slot_dev !== predecessor.identity.dev || value.peer_slot_ino !== predecessor.identity.ino
  ) {
    fail("DURABLE_ROOT_STAGE_INTENT_PREDECESSOR_MISMATCH", `${index}:${value.root.root_sha256}`);
  }
}

function recoverLinkedStages(authority: DirectoryAuthorityV1, lock: PublishLockV1): void {
  assertDirectoryAuthority(lock);
  const intents = fs.readdirSync(lock.stablePath)
    .map(parseStageIntentName)
    .filter((value): value is StageIntentV1 => value !== null);
  if (intents.length > 1) {
    fail("DURABLE_ROOT_STAGE_INTENT_AMBIGUOUS", intents.map(intent => intent.name).sort().join(","));
  }
  if (intents.length === 0) return;

  const intent = intents[0];
  const stagePath = path.join(lock.stablePath, intent.name);
  const targetPath = path.join(authority.stablePath, SLOT_NAMES[intent.index]);
  const prePath = path.join(lock.stablePath, preStageName(intent.index, intent.publisherToken));
  let fd = -1;
  try {
    fd = fs.openSync(stagePath, fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0));
    let stageStat = fs.fstatSync(fd, { bigint: true } as any);
    let stageLinks = Number(stageStat.nlink);
    let identity = slotIdentityFromStatAllowLinks(stageStat, stagePath, [1, 2]);
    const value = readSlotValueFromFd(fd, identity, intent.index);
    if (!value) fail("DURABLE_ROOT_STAGE_INTENT_TORN", intent.name);
    if (stageIntentDigest(intent.index, intent.publisherToken, identity, value) !== intent.intentSha256) {
      fail("DURABLE_ROOT_STAGE_INTENT_HASH_MISMATCH", intent.name);
    }
    assertStagePredecessor(authority, intent.index, value);

    let targetIdentity: SlotIdentityV1 | null = null;
    try {
      targetIdentity = slotIdentityFromStatAllowLinks(fs.lstatSync(targetPath, { bigint: true } as any), targetPath, [2]);
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }

    if (!targetIdentity && stageLinks === 2) {
      let preIdentity: SlotIdentityV1 | null = null;
      try {
        preIdentity = slotIdentityFromStatAllowLinks(fs.lstatSync(prePath, { bigint: true } as any), prePath, [2]);
      } catch (error: any) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (!preIdentity || !sameIdentity(identity, preIdentity)) {
        fail("DURABLE_ROOT_STAGE_INTENT_UNOWNED_LINK", intent.name);
      }
      fs.unlinkSync(prePath);
      fs.fsyncSync(lock.fd);
      stageStat = fs.fstatSync(fd, { bigint: true } as any);
      stageLinks = Number(stageStat.nlink);
      identity = slotIdentityFromStatAllowLinks(stageStat, stagePath, [1]);
    }

    if (targetIdentity) {
      if (stageLinks !== 2 || !sameIdentity(identity, targetIdentity)) {
        fail("DURABLE_ROOT_STAGED_LINK_IDENTITY_MISMATCH", SLOT_NAMES[intent.index]);
      }
    } else {
      if (stageLinks !== 1) fail("DURABLE_ROOT_STAGE_INTENT_LINK_COUNT", `${intent.name}:${stageLinks}`);
      try { fs.linkSync(stagePath, targetPath); }
      catch (error: any) {
        if (error?.code !== "EEXIST") throw error;
      }
      const stageAfterLink = slotIdentityFromStatAllowLinks(fs.fstatSync(fd, { bigint: true } as any), stagePath, [2]);
      const targetAfterLink = slotIdentityFromStatAllowLinks(fs.lstatSync(targetPath, { bigint: true } as any), targetPath, [2]);
      if (!sameIdentity(identity, stageAfterLink) || !sameIdentity(identity, targetAfterLink)) {
        fail("DURABLE_ROOT_TARGET_FOREIGN", SLOT_NAMES[intent.index]);
      }
      fs.fsyncSync(authority.fd);
      assertDirectoryAuthority(authority);
      targetIdentity = targetAfterLink;
    }

    assertStagePredecessor(authority, intent.index, value);
    const stageBeforeUnlink = slotIdentityFromStatAllowLinks(fs.lstatSync(stagePath, { bigint: true } as any), stagePath, [2]);
    const targetBeforeUnlink = slotIdentityFromStatAllowLinks(fs.lstatSync(targetPath, { bigint: true } as any), targetPath, [2]);
    if (!sameIdentity(identity, stageBeforeUnlink) || !sameIdentity(identity, targetBeforeUnlink)) {
      fail("DURABLE_ROOT_STAGED_LINK_CHANGED", SLOT_NAMES[intent.index]);
    }
    fs.unlinkSync(stagePath);
    fs.fsyncSync(lock.fd);
    fs.fsyncSync(fd);
    fs.fsyncSync(authority.fd);
    const finalTarget = slotIdentityFromStat(fs.lstatSync(targetPath, { bigint: true } as any), targetPath);
    if (!sameIdentity(identity, finalTarget)) fail("DURABLE_ROOT_STAGED_LINK_FINAL_MISMATCH", SLOT_NAMES[intent.index]);
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function publishNewSlotFromStage(
  authority: DirectoryAuthorityV1,
  lock: PublishLockV1,
  index: 0 | 1,
  peer: SlotIdentityV1 | null,
  root: SegmentedJsonlDurableRootV1,
): void {
  const publisherToken = lock.owner.token;
  const preName = preStageName(index, publisherToken);
  const prePath = path.join(lock.stablePath, preName);
  const targetPath = path.join(authority.stablePath, SLOT_NAMES[index]);
  let fd = -1;
  let identity: SlotIdentityV1 | null = null;
  let intentName: string | null = null;
  try {
    fd = fs.openSync(
      prePath,
      fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | ((fs.constants as any).O_NOFOLLOW || 0),
      0o600,
    );
    identity = slotIdentityFromStat(fs.fstatSync(fd, { bigint: true } as any), prePath);
    let targetExists = false;
    try { fs.lstatSync(targetPath); targetExists = true; }
    catch (error: any) { if (error?.code !== "ENOENT") throw error; }
    if (targetExists) fail("DURABLE_ROOT_TARGET_FOREIGN", SLOT_NAMES[index]);

    const expected = buildSlotValue(index, identity, peer, root);
    writeExactFile(fd, encodeSlot(expected), prePath);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
    const written = slotIdentityFromStat(fs.fstatSync(fd, { bigint: true } as any), prePath);
    if (!sameIdentity(identity, written)) fail("DURABLE_ROOT_STAGE_CHANGED_DURING_WRITE", SLOT_NAMES[index]);
    const verified = readSlotValueFromFd(fd, identity, index);
    if (!verified || verified.slot_sha256 !== expected.slot_sha256) fail("DURABLE_ROOT_STAGE_VERIFY_FAILED", SLOT_NAMES[index]);

    const intentSha = stageIntentDigest(index, publisherToken, identity, expected);
    intentName = stageIntentName(index, publisherToken, intentSha);
    const intentPath = path.join(lock.stablePath, intentName);
    try { fs.linkSync(prePath, intentPath); }
    catch (error: any) {
      if (error?.code === "EEXIST") fail("DURABLE_ROOT_STAGE_INTENT_FOREIGN", intentName);
      throw error;
    }
    fs.fsyncSync(lock.fd);
    const preLinked = slotIdentityFromStatAllowLinks(fs.lstatSync(prePath, { bigint: true } as any), prePath, [2]);
    const intentLinked = slotIdentityFromStatAllowLinks(fs.lstatSync(intentPath, { bigint: true } as any), intentPath, [2]);
    if (!sameIdentity(identity, preLinked) || !sameIdentity(identity, intentLinked)) {
      fail("DURABLE_ROOT_STAGE_INTENT_LINK_MISMATCH", intentName);
    }
    fs.unlinkSync(prePath);
    fs.fsyncSync(lock.fd);
    const intentOnly = slotIdentityFromStat(fs.lstatSync(intentPath, { bigint: true } as any), intentPath);
    if (!sameIdentity(identity, intentOnly)) fail("DURABLE_ROOT_STAGE_INTENT_CHANGED", intentName);
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }

  recoverLinkedStages(authority, lock);
  const published = readSlot(authority, index);
  if (!published.value || published.value.root.root_sha256 !== root.root_sha256) {
    fail("DURABLE_ROOT_PUBLICATION_NOT_CURRENT", root.root_sha256);
  }
}

function publishInputMatchesCurrentRoot(input: SegmentedJsonlDurableRootPublishInputV1, root: SegmentedJsonlDurableRootV1): boolean {
  try {
    const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(input.snapshot);
    const materialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(input.materialized);
    assertMaterializedSnapshotBinding(snapshot, materialized);
    const previousAnchor = input.previousAnchor ? verifySegmentedJsonlCheckpointAnchorV1(input.previousAnchor) : null;
    const checkpoint = verifySegmentedJsonlCheckpointIncrementalV1(input.checkpoint, snapshot, previousAnchor);
    if (
      snapshot.generation !== root.store_generation || checkpoint.checkpoint_sha256 !== root.checkpoint_sha256 ||
      snapshot.snapshot_sha256 !== root.snapshot_sha256 || snapshot.manifest_sha256 !== root.manifest_sha256 ||
      materialized.authority_sha256 !== root.materialized_authority_sha256 || materialized.materialized_sha256 !== root.materialized_sha256 ||
      snapshot.total_bytes !== root.total_bytes || snapshot.total_records !== root.total_records
    ) return false;
    if (root.store_generation === 1) {
      return !previousAnchor && !input.previousMaterialized && !input.appendOnlyWitness && !input.trustedAppendOnlyWitnessSha256 &&
        root.previous_root_sha256 === null && root.append_only_witness_sha256 === null;
    }
    if (!previousAnchor || !input.previousMaterialized || !input.appendOnlyWitness || !isHex64(input.trustedAppendOnlyWitnessSha256)) return false;
    const previousMaterialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(input.previousMaterialized);
    const witness = verifySegmentedJsonlCheckpointAppendOnlyBoundedV1(
      checkpoint, snapshot, previousAnchor, previousMaterialized, materialized,
      input.appendOnlyWitness, previousMaterialized.authority_sha256, input.trustedAppendOnlyWitnessSha256,
    );
    return witness.witness_sha256 === root.append_only_witness_sha256;
  } catch {
    return false;
  }
}

export function readSegmentedJsonlDurableRootV1(directoryInput: string): SegmentedJsonlDurableRootV1 | null {
  const authority = openDirectoryAuthority(directoryInput);
  try {
    const slots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
    const current = selectCurrent(slots);
    if (!current) {
      if (slots.some(slot => slot.exists)) fail("DURABLE_ROOT_NO_VALID_SLOT", authority.publicPath);
      return null;
    }
    const validCount = slots.filter(slot => slot.value !== null).length;
    if (
      validCount !== 2 &&
      (
        current.value!.root.store_generation !== 1 ||
        current.value!.peer_slot_dev !== null ||
        current.value!.peer_slot_ino !== null ||
        slots.some(slot => slot.exists && slot.value === null)
      )
    ) {
      fail(
        "DURABLE_ROOT_DEGRADED_SLOT_REQUIRES_RECOVERY",
        `${current.value!.root.store_generation}:${slots.map(slot => `${slot.index}:${slot.exists ? (slot.value ? "valid" : "invalid") : "missing"}`).join(",")}`,
      );
    }
    return current.value!.root;
  } finally { fs.closeSync(authority.fd); }
}

export function verifySegmentedJsonlDurableRootMaterializedAtUseV1<T>(
  directoryInput: string,
  storeRoot: string,
  materializedFile: string,
  materializedAuthorityInput: SegmentedJsonlMaterializedAuthorityV1,
  trustedRootSha256: string,
  consumer: (reader: SegmentedJsonlMaterializedUseReaderV1) => T,
): T {
  if (!isHex64(trustedRootSha256)) {
    fail("DURABLE_ROOT_INVALID_TRUST_ROOT", String(trustedRootSha256));
  }
  const durableRoot = readSegmentedJsonlDurableRootV1(directoryInput);
  if (!durableRoot) fail("DURABLE_ROOT_REQUIRED", directoryInput);
  if (durableRoot.root_sha256 !== trustedRootSha256) {
    fail("DURABLE_ROOT_TRUST_ROOT_MISMATCH", `${durableRoot.root_sha256}:${trustedRootSha256}`);
  }

  const materialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(
    materializedAuthorityInput,
  );
  if (
    durableRoot.materialized_authority_sha256 !== materialized.authority_sha256 ||
    durableRoot.materialized_sha256 !== materialized.materialized_sha256 ||
    durableRoot.snapshot_sha256 !== materialized.snapshot_sha256 ||
    durableRoot.manifest_sha256 !== materialized.manifest_sha256 ||
    durableRoot.store_generation !== materialized.store_generation ||
    durableRoot.total_bytes !== materialized.total_bytes ||
    durableRoot.total_records !== materialized.total_records
  ) {
    fail(
      "DURABLE_ROOT_MATERIALIZED_AUTHORITY_MISMATCH",
      `${durableRoot.root_sha256}:${materialized.authority_sha256}`,
    );
  }

  return verifySegmentedJsonlMaterializedAuthorityAtUseV1(
    storeRoot,
    materializedFile,
    materialized,
    consumer,
  );
}

export function publishSegmentedJsonlDurableRootV1(
  directoryInput: string,
  input: SegmentedJsonlDurableRootPublishInputV1,
): SegmentedJsonlDurableRootV1 {
  const authority = openDirectoryAuthority(directoryInput);
  let lock: PublishLockV1 | null = null;
  let result: SegmentedJsonlDurableRootV1 | null = null;
  let primaryError: unknown = null;
  try {
    assertDirectoryAuthority(authority);
    lock = acquirePublishLock(authority);
    recoverLinkedStages(authority, lock);
    assertDirectoryAuthority(authority);

    const slots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
    const currentSlot = selectCurrent(slots);
    if (!currentSlot && slots.some(slot => slot.exists)) fail("DURABLE_ROOT_NO_VALID_SLOT", authority.publicPath);
    const currentRoot = currentSlot?.value?.root ?? null;

    if (currentRoot && input.snapshot?.generation === currentRoot.store_generation) {
      if (!publishInputMatchesCurrentRoot(input, currentRoot)) {
        fail("DURABLE_ROOT_IDEMPOTENT_INPUT_MISMATCH", `${currentRoot.store_generation}:${currentRoot.root_sha256}`);
      }
      fs.fsyncSync(authority.fd);
      assertDirectoryAuthority(authority);
      const idempotentSlots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
      const idempotentCurrent = selectCurrent(idempotentSlots);
      if (!idempotentCurrent?.value || idempotentCurrent.value.root.root_sha256 !== currentRoot.root_sha256) {
        fail("DURABLE_ROOT_IDEMPOTENT_READBACK_MISMATCH", currentRoot.root_sha256);
      }
      result = idempotentCurrent.value.root;
    } else {
      const nextRoot = deriveRoot(input, currentRoot);
      const targetIndex = ((nextRoot.store_generation - 1) % 2) as 0 | 1;
      const target = slots[targetIndex];
      const peer = currentSlot?.identity ?? null;
      if (currentSlot && currentSlot.index === targetIndex) fail("DURABLE_ROOT_TARGET_IS_CURRENT", String(targetIndex));

      if (!target.exists) {
        publishNewSlotFromStage(authority, lock, targetIndex, peer, nextRoot);
      } else {
        if (!target.identity) fail("DURABLE_ROOT_TARGET_IDENTITY_UNAVAILABLE", target.path);
        if (!currentSlot?.value || currentSlot.value.peer_slot_dev === null || currentSlot.value.peer_slot_ino === null) {
          fail("DURABLE_ROOT_TARGET_NOT_EXPECTED", target.path);
        }
        if (currentSlot.value.peer_slot_dev !== target.identity.dev || currentSlot.value.peer_slot_ino !== target.identity.ino) {
          fail("DURABLE_ROOT_TARGET_IDENTITY_MISMATCH", `${target.path}:${target.identity.dev}:${target.identity.ino}`);
        }

        const beforeWriteSlots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
        const beforeWriteCurrent = selectCurrent(beforeWriteSlots);
        if (!beforeWriteCurrent?.value || !currentRoot || beforeWriteCurrent.value.root.root_sha256 !== currentRoot.root_sha256) {
          fail("DURABLE_ROOT_PREDECESSOR_CHANGED_BEFORE_WRITE", currentRoot?.root_sha256 || "none");
        }
        const beforeWriteTarget = beforeWriteSlots[targetIndex];
        if (!beforeWriteTarget.identity || !sameIdentity(beforeWriteTarget.identity, target.identity)) {
          fail("DURABLE_ROOT_TARGET_IDENTITY_MISMATCH", target.path);
        }

        const stablePath = path.join(authority.stablePath, SLOT_NAMES[targetIndex]);
        let fd = -1;
        try {
          fd = fs.openSync(stablePath, fs.constants.O_RDWR | ((fs.constants as any).O_NOFOLLOW || 0));
          const opened = fs.fstatSync(fd, { bigint: true } as any);
          const identity = slotIdentityFromStat(opened, target.path);
          const visibleIdentity = slotIdentityFromStat(fs.lstatSync(target.path, { bigint: true } as any), target.path);
          if (!sameIdentity(identity, visibleIdentity) || !sameIdentity(identity, target.identity)) {
            fail("DURABLE_ROOT_TARGET_PATH_MISMATCH", target.path);
          }
          const slotValue = buildSlotValue(targetIndex, identity, peer, nextRoot);
          const body = encodeSlot(slotValue);
          writeExactFile(fd, body, target.path);
          fs.fchmodSync(fd, 0o600);
          fs.fsyncSync(fd);
          const after = slotIdentityFromStat(fs.fstatSync(fd, { bigint: true } as any), target.path);
          const visibleAfter = slotIdentityFromStat(fs.lstatSync(target.path, { bigint: true } as any), target.path);
          if (!sameIdentity(identity, after) || !sameIdentity(after, visibleAfter)) {
            fail("DURABLE_ROOT_TARGET_CHANGED_DURING_WRITE", target.path);
          }
          fs.fsyncSync(authority.fd);
          assertDirectoryAuthority(authority);
        } finally { if (fd >= 0) fs.closeSync(fd); }
      }

      const finalSlots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
      const finalCurrent = selectCurrent(finalSlots);
      if (!finalCurrent?.value || finalCurrent.value.root.root_sha256 !== nextRoot.root_sha256) {
        fail("DURABLE_ROOT_PUBLICATION_NOT_CURRENT", nextRoot.root_sha256);
      }
      result = finalCurrent.value.root;
    }
  } catch (error) {
    primaryError = error;
  } finally {
    if (lock) {
      try { releasePublishLock(authority, lock); }
      catch (releaseError) { if (!primaryError) primaryError = releaseError; }
    }
    fs.closeSync(authority.fd);
  }
  if (primaryError) throw primaryError;
  if (!result) fail("DURABLE_ROOT_PUBLICATION_NO_RESULT", directoryInput);
  return result;
}
