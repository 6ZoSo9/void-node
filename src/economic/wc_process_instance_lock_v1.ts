import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const VOID_WC_PROCESS_INSTANCE_LOCK_V1 =
  "VOID_WC_PROCESS_INSTANCE_LOCK_V1";

const LOCK_RECORD_MAX_BYTES_V1 = 4 * 1024;
const LOCK_NAMESPACE_MAX_ENTRIES_V1 = 128;
const LOCK_NAMESPACE_SHARD_HEX_V1 = 3;
const LOCK_PUBLICATION_TEMP_MAX_ENTRIES_V1 = 128;
const LOCAL_RELEASE_MAX_NAMESPACES_V1 = 256;
const ACQUIRE_MAX_RESCANS_V1 = 32;
const BOOT_ID_FILE_V1 = "/proc/sys/kernel/random/boot_id";

type OwnerTupleV1 = {
  pid: number;
  process_start_ticks: string;
  boot_id: string;
  owner_nonce: string;
};

type LockRecordV1 = OwnerTupleV1 & {
  marker: typeof VOID_WC_PROCESS_INSTANCE_LOCK_V1;
  version: 1;
  name: string;
  generation: number;
  created_at_ms: number;
};

type ReleaseRecordV1 = OwnerTupleV1 & {
  marker: typeof VOID_WC_PROCESS_INSTANCE_LOCK_V1;
  version: 1;
  name: string;
  generation: number;
  released_at_ms: number;
};

export interface WcProcessInstanceLockV1 extends LockRecordV1 {
  dir: string;
  namespace_dir: string;
  namespace_dev: string;
  namespace_ino: string;
  file: string;
  released_file: string;
}

export class WcProcessInstanceLockError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "WcProcessInstanceLockError";
    this.code = code;
  }
}

class WcProcessInstanceLockPublicationLinkedError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super("wc_process_lock_publication_linked_before_durability");
    this.name = "WcProcessInstanceLockPublicationLinkedError";
    this.cause = cause;
  }
}

type RecordStampV1 = {
  dev: string;
  ino: string;
  size: string;
  mtime_ns: string;
  ctime_ns: string;
};

type DirectoryIdentityV1 = {
  dev: string;
  ino: string;
  uid: string;
  mode: number;
};

type LocalReleaseV1 = {
  generation: number;
  owner: OwnerTupleV1;
  namespace_identity: DirectoryIdentityV1;
};

const localReleaseFallbacksV1 =
  new Map<string, LocalReleaseV1>();
let lastNamespaceEntriesScannedV1 = 0;

export type WcProcessInstanceLockBeforeRecordReadHookForProofV1 =
  ((file: string, label: string) => void | Promise<void>) | null;

let beforeRecordReadHookForProofV1:
  WcProcessInstanceLockBeforeRecordReadHookForProofV1 = null;
let releasePublicationFaultForProofV1 = false;
let lockPublicationSyncFailuresForProofV1 = 0;

export function setWcProcessInstanceLockBeforeRecordReadHookForProofV1(
  hook: WcProcessInstanceLockBeforeRecordReadHookForProofV1,
): void {
  beforeRecordReadHookForProofV1 = hook;
}

export function setWcProcessInstanceLockReleasePublicationFaultForProofV1(
  enabled: boolean,
): void {
  releasePublicationFaultForProofV1 = enabled === true;
}

export function setWcProcessInstanceLockPublicationSyncFailuresForProofV1(
  count: number,
): void {
  lockPublicationSyncFailuresForProofV1 =
    Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export function wcProcessInstanceLockMetricsForProofV1(): {
  local_release_namespaces: number;
  last_namespace_entries_scanned: number;
  namespace_entry_cap: number;
} {
  return {
    local_release_namespaces: localReleaseFallbacksV1.size,
    last_namespace_entries_scanned: lastNamespaceEntriesScannedV1,
    namespace_entry_cap: LOCK_NAMESPACE_MAX_ENTRIES_V1,
  };
}

function fail(code: string): never {
  throw new WcProcessInstanceLockError(code);
}

function exactObjectV1(raw: unknown): raw is Record<string, unknown> {
  return Boolean(raw) && typeof raw === "object" && !Array.isArray(raw);
}

function hasExactKeysV1(
  raw: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(raw).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((value, index) => value === wanted[index])
  );
}

function safeNameV1(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const value = raw.trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : "";
}

function safeTicksV1(raw: unknown): string {
  return typeof raw === "string" && /^[0-9]{1,32}$/.test(raw)
    ? raw
    : "";
}

function safeBootIdV1(raw: unknown): string {
  return typeof raw === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      raw,
    )
    ? raw
    : "";
}

function safeOwnerNonceV1(raw: unknown): string {
  return typeof raw === "string" && /^[0-9a-f]{64}$/.test(raw)
    ? raw
    : "";
}

function safePositiveIntV1(raw: unknown): number {
  return typeof raw === "number" &&
    Number.isSafeInteger(raw) &&
    raw > 0
    ? raw
    : 0;
}

function recordStampV1(stat: any): RecordStampV1 {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: String(stat.size),
    mtime_ns: String(stat.mtimeNs),
    ctime_ns: String(stat.ctimeNs),
  };
}

function sameRecordStampV1(
  a: RecordStampV1,
  b: RecordStampV1,
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns
  );
}

function currentUidV1(): string | null {
  return typeof process.getuid === "function"
    ? String(process.getuid())
    : null;
}

function directoryIdentityV1(dir: string): DirectoryIdentityV1 {
  let stat: any;
  try {
    stat = fs.lstatSync(dir, { bigint: true } as any);
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      fail("wc_process_lock_directory_missing");
    }
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail("wc_process_lock_directory_not_authoritative");
  }
  const mode = Number(stat.mode) & 0o777;
  const expectedUid = currentUidV1();
  if (
    (expectedUid !== null && String(stat.uid) !== expectedUid) ||
    (mode & 0o077) !== 0
  ) {
    fail("wc_process_lock_directory_not_private");
  }
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    uid: String(stat.uid),
    mode,
  };
}

function sameDirectoryIdentityV1(
  a: DirectoryIdentityV1,
  b: DirectoryIdentityV1,
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.uid === b.uid &&
    a.mode === b.mode
  );
}

function fsyncDirectoryV1(dir: string): void {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function ensurePrivateDirectoryV1(dirRaw: string): DirectoryIdentityV1 {
  const dir = path.resolve(dirRaw);
  const existed = fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const created = !existed;
  if (created) {
    const parent = path.dirname(dir);
    if (parent !== dir && fs.existsSync(parent)) fsyncDirectoryV1(parent);
  }
  return directoryIdentityV1(dir);
}

function ensurePrivateChildDirectoryV1(
  parent: string,
  child: string,
): DirectoryIdentityV1 {
  const parentBefore = directoryIdentityV1(parent);
  let created = false;
  try {
    fs.mkdirSync(child, { mode: 0o700 });
    created = true;
  } catch (error: any) {
    if (String(error?.code || "") !== "EEXIST") throw error;
  }
  if (created) fsyncDirectoryV1(parent);
  const parentAfter = directoryIdentityV1(parent);
  if (!sameDirectoryIdentityV1(parentBefore, parentAfter)) {
    fail("wc_process_lock_directory_generation_changed");
  }
  return directoryIdentityV1(child);
}

function shardDirV1(root: string, name: string): string {
  const shard = crypto
    .createHash("sha256")
    .update("VOID_WC_PROCESS_INSTANCE_LOCK_NAMESPACE_V1\0", "utf8")
    .update(name, "utf8")
    .digest("hex")
    .slice(0, LOCK_NAMESPACE_SHARD_HEX_V1);
  return path.join(root, `.wc-process-lock-v1-shard-${shard}`);
}

function namespaceDirV1(root: string, name: string): string {
  return path.join(shardDirV1(root, name), "state");
}

function publicationTempDirV1(namespace: string): string {
  return path.join(path.dirname(namespace), "tmp");
}

export function wcProcessInstanceLockNamespaceForProofV1(
  dirRaw: string,
  nameRaw: string,
): string {
  const name = safeNameV1(nameRaw);
  if (!name) fail("wc_process_lock_invalid_name");
  return namespaceDirV1(path.resolve(dirRaw), name);
}

function ensureNamespaceV1(
  rootRaw: string,
  name: string,
): {
  root: string;
  shard: string;
  namespace: string;
  temp_dir: string;
  identity: DirectoryIdentityV1;
} {
  const root = path.resolve(rootRaw);
  const rootBefore = ensurePrivateDirectoryV1(root);
  const shard = shardDirV1(root, name);
  ensurePrivateChildDirectoryV1(root, shard);
  const namespace = path.join(shard, "state");
  const tempDir = path.join(shard, "tmp");
  const identity = ensurePrivateChildDirectoryV1(shard, namespace);
  ensurePrivateChildDirectoryV1(shard, tempDir);
  const rootAfter = directoryIdentityV1(root);
  if (!sameDirectoryIdentityV1(rootBefore, rootAfter)) {
    fail("wc_process_lock_directory_generation_changed");
  }
  return {
    root,
    shard,
    namespace,
    temp_dir: tempDir,
    identity,
  };
}

function generationTextV1(generation: number): string {
  return String(generation).padStart(16, "0");
}

function lockFileV1(namespace: string, generation: number): string {
  return path.join(namespace, `${generationTextV1(generation)}.lock`);
}

function releaseFileV1(namespace: string, generation: number): string {
  return path.join(namespace, `${generationTextV1(generation)}.released`);
}

function generationFromNameV1(name: string): {
  generation: number;
  kind: "lock" | "released";
} | null {
  const match = /^([0-9]{16})\.(lock|released)$/.exec(name);
  if (!match) return null;
  const generation = Number(match[1]);
  if (!Number.isSafeInteger(generation) || generation <= 0) return null;
  return {
    generation,
    kind: match[2] as "lock" | "released",
  };
}

function readDirectoryBoundedV1(
  dir: string,
  maxEntries: number,
  overflowCode: string,
): fs.Dirent[] {
  const handle = fs.opendirSync(dir);
  const entries: fs.Dirent[] = [];
  try {
    for (;;) {
      const entry = handle.readSync();
      if (!entry) break;
      entries.push(entry);
      if (entries.length > maxEntries) fail(overflowCode);
    }
  } finally {
    handle.closeSync();
  }
  return entries;
}

function scanNamespaceV1(
  namespace: string,
  maxEntries = LOCK_NAMESPACE_MAX_ENTRIES_V1,
): {
  current: number;
  lockGenerations: Set<number>;
  releaseGenerations: Set<number>;
} {
  const before = directoryIdentityV1(namespace);
  const entries = readDirectoryBoundedV1(
    namespace,
    maxEntries,
    "wc_process_lock_namespace_overflow",
  );
  lastNamespaceEntriesScannedV1 = entries.length;
  const lockGenerations = new Set<number>();
  const releaseGenerations = new Set<number>();
  for (const entry of entries) {
    const parsed = generationFromNameV1(entry.name);
    if (!parsed || !entry.isFile()) {
      fail("wc_process_lock_ambiguous_generation");
    }
    (parsed.kind === "lock" ? lockGenerations : releaseGenerations).add(
      parsed.generation,
    );
  }
  for (const generation of releaseGenerations) {
    if (!lockGenerations.has(generation)) {
      fail("wc_process_lock_ambiguous_generation");
    }
  }
  const current = lockGenerations.size
    ? Math.max(...lockGenerations)
    : 0;
  const after = directoryIdentityV1(namespace);
  if (!sameDirectoryIdentityV1(before, after)) {
    fail("wc_process_lock_directory_generation_changed");
  }
  return { current, lockGenerations, releaseGenerations };
}

async function readStrictJsonV1(
  file: string,
  label: string,
): Promise<Record<string, unknown> | null> {
  await beforeRecordReadHookForProofV1?.(file, label);
  let initial: any;
  try {
    initial = await fsp.lstat(file, { bigint: true } as any);
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") return null;
    throw error;
  }
  if (!initial.isFile() || initial.isSymbolicLink()) {
    fail(`${label}_invalid_file_type`);
  }
  const initialStamp = recordStampV1(initial);
  const initialSize = Number(initial.size);
  if (
    !Number.isSafeInteger(initialSize) ||
    initialSize <= 0 ||
    initialSize > LOCK_RECORD_MAX_BYTES_V1
  ) {
    fail(`${label}_size_invalid`);
  }

  let handle: Awaited<ReturnType<typeof fsp.open>> | null = null;
  try {
    try {
      handle = await fsp.open(
        file,
        fs.constants.O_RDONLY |
          Number(fs.constants.O_NOFOLLOW || 0),
      );
    } catch (error: any) {
      const code = String(error?.code || "");
      if (code === "ENOENT") return null;
      if (code === "ELOOP" || code === "EISDIR" || code === "ENXIO") {
        fail(`${label}_invalid_file_type`);
      }
      throw error;
    }
    const before: any = await handle.stat({ bigint: true } as any);
    if (!before.isFile()) fail(`${label}_invalid_file_type`);
    const beforeStamp = recordStampV1(before);
    if (!sameRecordStampV1(initialStamp, beforeStamp)) {
      fail(`${label}_generation_changed`);
    }
    const size = Number(before.size);
    if (
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > LOCK_RECORD_MAX_BYTES_V1
    ) {
      fail(`${label}_size_invalid`);
    }
    const bytes = Buffer.alloc(size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (bytesRead <= 0) break;
      offset += bytesRead;
    }
    if (offset !== size) fail(`${label}_generation_changed`);
    const after: any = await handle.stat({ bigint: true } as any);
    const afterStamp = recordStampV1(after);
    let pathAfter: any;
    try {
      pathAfter = await fsp.lstat(file, { bigint: true } as any);
    } catch (error: any) {
      if (String(error?.code || "") === "ENOENT") return null;
      throw error;
    }
    if (!pathAfter.isFile() || pathAfter.isSymbolicLink()) {
      fail(`${label}_invalid_file_type`);
    }
    if (
      !sameRecordStampV1(beforeStamp, afterStamp) ||
      !sameRecordStampV1(afterStamp, recordStampV1(pathAfter))
    ) {
      fail(`${label}_generation_changed`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(bytes.subarray(0, size).toString("utf8"));
    } catch {
      fail(`${label}_malformed`);
    }
    if (!exactObjectV1(parsed)) fail(`${label}_not_object`);
    return parsed;
  } finally {
    if (handle) await handle.close();
  }
}

function validateOwnerTupleV1(raw: Record<string, unknown>): OwnerTupleV1 {
  const pid = safePositiveIntV1(raw.pid);
  const processStartTicks = safeTicksV1(raw.process_start_ticks);
  const bootId = safeBootIdV1(raw.boot_id);
  const ownerNonce = safeOwnerNonceV1(raw.owner_nonce);
  if (!pid || !processStartTicks || !bootId || !ownerNonce) {
    fail("wc_process_lock_record_schema_invalid");
  }
  return {
    pid,
    process_start_ticks: processStartTicks,
    boot_id: bootId,
    owner_nonce: ownerNonce,
  };
}

async function readLockRecordV1(
  file: string,
  expectedGeneration: number,
): Promise<LockRecordV1 | null> {
  const raw = await readStrictJsonV1(file, "wc_process_lock_record");
  if (!raw) return null;
  if (
    !hasExactKeysV1(raw, [
      "boot_id",
      "created_at_ms",
      "generation",
      "marker",
      "name",
      "owner_nonce",
      "pid",
      "process_start_ticks",
      "version",
    ]) ||
    raw.marker !== VOID_WC_PROCESS_INSTANCE_LOCK_V1 ||
    raw.version !== 1 ||
    safeNameV1(raw.name) !== raw.name ||
    raw.generation !== expectedGeneration ||
    !safePositiveIntV1(raw.created_at_ms)
  ) {
    fail("wc_process_lock_record_schema_invalid");
  }
  return {
    marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
    version: 1,
    name: raw.name as string,
    generation: expectedGeneration,
    ...validateOwnerTupleV1(raw),
    created_at_ms: raw.created_at_ms as number,
  };
}

async function readReleaseRecordV1(
  file: string,
  lock: LockRecordV1,
): Promise<ReleaseRecordV1 | null> {
  const raw = await readStrictJsonV1(file, "wc_process_lock_release");
  if (!raw) return null;
  if (
    !hasExactKeysV1(raw, [
      "boot_id",
      "generation",
      "marker",
      "name",
      "owner_nonce",
      "pid",
      "process_start_ticks",
      "released_at_ms",
      "version",
    ]) ||
    raw.marker !== VOID_WC_PROCESS_INSTANCE_LOCK_V1 ||
    raw.version !== 1 ||
    raw.name !== lock.name ||
    raw.generation !== lock.generation ||
    !safePositiveIntV1(raw.released_at_ms)
  ) {
    fail("wc_process_lock_release_schema_invalid");
  }
  const owner = validateOwnerTupleV1(raw);
  if (!sameOwnerTupleV1(owner, lock)) {
    fail("wc_process_lock_release_owner_mismatch");
  }
  return {
    marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
    version: 1,
    name: lock.name,
    generation: lock.generation,
    ...owner,
    released_at_ms: raw.released_at_ms as number,
  };
}

function sameOwnerTupleV1(
  a: OwnerTupleV1,
  b: OwnerTupleV1,
): boolean {
  return (
    a.pid === b.pid &&
    a.process_start_ticks === b.process_start_ticks &&
    a.boot_id === b.boot_id &&
    a.owner_nonce === b.owner_nonce
  );
}

function localReleaseKeyV1(namespace: string): string {
  return path.resolve(namespace);
}

function isLocallyReleasedV1(
  namespace: string,
  lock: LockRecordV1,
): boolean {
  const local = localReleaseFallbacksV1.get(
    localReleaseKeyV1(namespace),
  );
  return Boolean(
    local &&
      local.generation === lock.generation &&
      sameOwnerTupleV1(local.owner, lock) &&
      sameDirectoryIdentityV1(
        local.namespace_identity,
        directoryIdentityV1(namespace),
      ),
  );
}

function rememberLocalReleaseV1(
  namespace: string,
  lock: LockRecordV1,
): void {
  const key = localReleaseKeyV1(namespace);
  if (
    !localReleaseFallbacksV1.has(key) &&
    localReleaseFallbacksV1.size >= LOCAL_RELEASE_MAX_NAMESPACES_V1
  ) {
    fail("wc_process_lock_local_release_capacity_exhausted");
  }
  localReleaseFallbacksV1.set(key, {
    generation: lock.generation,
    owner: {
      pid: lock.pid,
      process_start_ticks: lock.process_start_ticks,
      boot_id: lock.boot_id,
      owner_nonce: lock.owner_nonce,
    },
    namespace_identity: directoryIdentityV1(namespace),
  });
}

function clearLocalReleaseV1(namespace: string): void {
  localReleaseFallbacksV1.delete(localReleaseKeyV1(namespace));
}

async function readBootIdV1(): Promise<string> {
  let handle: Awaited<ReturnType<typeof fsp.open>> | null = null;
  try {
    handle = await fsp.open(
      BOOT_ID_FILE_V1,
      fs.constants.O_RDONLY |
        Number(fs.constants.O_NOFOLLOW || 0),
    );
    const bytes = Buffer.alloc(64);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    const value = bytes.subarray(0, bytesRead).toString("utf8").trim();
    const parsed = safeBootIdV1(value);
    if (!parsed || bytesRead >= bytes.length) {
      fail("wc_process_lock_boot_id_unavailable");
    }
    return parsed;
  } catch (error: any) {
    if (error instanceof WcProcessInstanceLockError) {
      throw error;
    }
    throw new WcProcessInstanceLockError(
      "wc_process_lock_boot_id_unavailable",
    );
  } finally {
    if (handle) await handle.close();
  }
}

export function wcProcessStartTicksFromStatTextForProofV1(
  raw: string,
): string | null {
  const close = raw.lastIndexOf(")");
  if (close < 0 || close + 2 >= raw.length) return null;
  const fields = raw.slice(close + 2).trim().split(/\s+/);
  if (fields.length < 20) return null;
  const state = fields[0];
  if (state === "Z" || state === "X" || state === "x") return null;
  const ticks = fields[19];
  return /^[0-9]+$/.test(ticks) ? ticks : null;
}

async function processStartTicksV1(pid: number): Promise<string | null> {
  try {
    const raw = await fsp.readFile(`/proc/${pid}/stat`, "utf8");
    return wcProcessStartTicksFromStatTextForProofV1(raw);
  } catch (error: any) {
    const code = String(error?.code || "");
    if (code === "ENOENT" || code === "ESRCH") return null;
    throw error;
  }
}

export async function wcProcessStartTicksForProofV1(
  pid: number,
): Promise<string | null> {
  return processStartTicksV1(pid);
}

function processStartTicksSyncV1(pid: number): string | null {
  try {
    const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    return wcProcessStartTicksFromStatTextForProofV1(raw);
  } catch (error: any) {
    const code = String(error?.code || "");
    if (code === "ENOENT" || code === "ESRCH") return null;
    throw error;
  }
}

type PublicationTempOwnerV1 = {
  boot_id: string;
  pid: number;
  process_start_ticks: string;
};

function publicationTempOwnerFromNameV1(
  name: string,
): PublicationTempOwnerV1 | null {
  const match = /^(?:lock|release)\.([0-9a-f-]{36})\.([0-9]{1,10})\.([0-9]{1,32})\.[0-9a-f]{32}\.tmp$/.exec(
    name,
  );
  if (!match) return null;
  const bootId = safeBootIdV1(match[1]);
  const pid = Number(match[2]);
  const ticks = safeTicksV1(match[3]);
  if (!bootId || !safePositiveIntV1(pid) || !ticks) return null;
  return {
    boot_id: bootId,
    pid,
    process_start_ticks: ticks,
  };
}

function cleanupPublicationTempsV1(
  tempDir: string,
  currentBootId: string,
): void {
  const before = directoryIdentityV1(tempDir);
  const entries = readDirectoryBoundedV1(
    tempDir,
    LOCK_PUBLICATION_TEMP_MAX_ENTRIES_V1,
    "wc_process_lock_publication_temp_overflow",
  );
  let changed = false;
  for (const entry of entries) {
    const owner = publicationTempOwnerFromNameV1(entry.name);
    if (!entry.isFile() || !owner) {
      fail("wc_process_lock_publication_temp_ambiguous");
    }
    const liveTicks =
      owner.boot_id === currentBootId
        ? processStartTicksSyncV1(owner.pid)
        : null;
    if (liveTicks === owner.process_start_ticks) continue;
    try {
      fs.unlinkSync(path.join(tempDir, entry.name));
      changed = true;
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") throw error;
    }
  }
  if (changed) fsyncDirectoryV1(tempDir);
  const after = directoryIdentityV1(tempDir);
  if (!sameDirectoryIdentityV1(before, after)) {
    fail("wc_process_lock_directory_generation_changed");
  }
}

async function ownerStillLiveV1(
  lock: LockRecordV1,
  currentBootId: string,
): Promise<boolean> {
  if (lock.boot_id !== currentBootId) return false;
  const ticks = await processStartTicksV1(lock.pid);
  return ticks !== null && ticks === lock.process_start_ticks;
}

function encodeJsonV1(value: Record<string, unknown>): Buffer {
  const bytes = Buffer.from(JSON.stringify(value) + "\n", "utf8");
  if (bytes.length <= 0 || bytes.length > LOCK_RECORD_MAX_BYTES_V1) {
    fail("wc_process_lock_record_size_invalid");
  }
  return bytes;
}

async function durablePublishExclusiveV1(
  namespace: string,
  tempDir: string,
  file: string,
  value: Record<string, unknown>,
  kind: "lock" | "release",
): Promise<boolean> {
  const before = directoryIdentityV1(namespace);
  const tempBefore = directoryIdentityV1(tempDir);
  let linked = false;
  // Temps live in the shard's non-authoritative private tmp directory. A
  // scanner of state/ never mistakes partial bytes for a generation, while
  // dead-process temp cleanup remains bounded per shard. link(2) below is the
  // only authority edge.
  const owner = validateOwnerTupleV1(value);
  const tmp = path.join(
    tempDir,
    `${kind}.${owner.boot_id}.${owner.pid}.${owner.process_start_ticks}.${crypto
      .randomBytes(16)
      .toString("hex")}.tmp`,
  );
  let handle: Awaited<ReturnType<typeof fsp.open>> | null = null;
  try {
    handle = await fsp.open(
      tmp,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    const bytes = encodeJsonV1(value);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesWritten } = await handle.write(
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (bytesWritten <= 0) fail("wc_process_lock_short_write");
      offset += bytesWritten;
    }
    await handle.datasync();
    await handle.close();
    handle = null;
    try {
      await fsp.link(tmp, file);
      linked = true;
    } catch (error: any) {
      if (String(error?.code || "") === "EEXIST") return false;
      throw error;
    }
    await fsp.unlink(tmp);
    if (
      kind === "lock" &&
      lockPublicationSyncFailuresForProofV1 > 0
    ) {
      lockPublicationSyncFailuresForProofV1 -= 1;
      throw new Error(
        "VOID_WC_PROCESS_LOCK_PROOF_POST_LINK_SYNC_FAILURE",
      );
    }
    await fsp.open(namespace, "r").then(async (dirHandle) => {
      try {
        await dirHandle.sync();
      } finally {
        await dirHandle.close();
      }
    });
    const after = directoryIdentityV1(namespace);
    const tempAfter = directoryIdentityV1(tempDir);
    if (
      !sameDirectoryIdentityV1(before, after) ||
      !sameDirectoryIdentityV1(tempBefore, tempAfter)
    ) {
      fail("wc_process_lock_directory_generation_changed");
    }
    return true;
  } catch (error) {
    if (linked) {
      throw new WcProcessInstanceLockPublicationLinkedError(error);
    }
    throw error;
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // best effort only
      }
    }
    try {
      await fsp.unlink(tmp);
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") {
        // A non-authoritative temp may remain, but never becomes authority.
      }
    }
  }
}

async function publishReleaseV1(
  namespace: string,
  lock: LockRecordV1,
): Promise<void> {
  if (releasePublicationFaultForProofV1) {
    throw new Error("VOID_WC_PROCESS_LOCK_PROOF_RELEASE_PUBLICATION_FAILURE");
  }
  const file = releaseFileV1(namespace, lock.generation);
  const release: ReleaseRecordV1 = {
    marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
    version: 1,
    name: lock.name,
    generation: lock.generation,
    pid: lock.pid,
    process_start_ticks: lock.process_start_ticks,
    boot_id: lock.boot_id,
    owner_nonce: lock.owner_nonce,
    released_at_ms: Date.now(),
  };
  const published = await durablePublishExclusiveV1(
    namespace,
    publicationTempDirV1(namespace),
    file,
    release as unknown as Record<string, unknown>,
    "release",
  );
  if (!published) {
    const existing = await readReleaseRecordV1(file, lock);
    if (!existing) fail("wc_process_lock_release_generation_changed");
  }
}

async function cleanupOlderV1(
  namespace: string,
  keepGeneration: number,
): Promise<void> {
  const entries = readDirectoryBoundedV1(
    namespace,
    LOCK_NAMESPACE_MAX_ENTRIES_V1 + 1,
    "wc_process_lock_namespace_overflow",
  );
  for (const entry of entries) {
    const parsed = generationFromNameV1(entry.name);
    if (!parsed || parsed.generation >= keepGeneration) continue;
    if (!entry.isFile()) fail("wc_process_lock_ambiguous_generation");
    try {
      await fsp.unlink(path.join(namespace, entry.name));
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") throw error;
    }
  }
  fsyncDirectoryV1(namespace);
}

export async function acquireWcProcessInstanceLockV1(
  dirRaw: string,
  nameRaw: string,
): Promise<WcProcessInstanceLockV1> {
  const name = safeNameV1(nameRaw);
  if (!name) fail("wc_process_lock_invalid_name");
  const bootId = await readBootIdV1();
  const ownTicks = await processStartTicksV1(process.pid);
  if (!ownTicks) fail("wc_process_lock_process_identity_unavailable");

  for (let attempt = 0; attempt < ACQUIRE_MAX_RESCANS_V1; attempt += 1) {
    const ensured = ensureNamespaceV1(dirRaw, name);
    cleanupPublicationTempsV1(ensured.temp_dir, bootId);
    let snapshot = scanNamespaceV1(
      ensured.namespace,
      LOCK_NAMESPACE_MAX_ENTRIES_V1 + 1,
    );

    // The fixed shard count bounds lifetime disk namespaces. Old generations
    // can never regain authority once a higher immutable
    // generation exists. Retire them before publishing another owner so a
    // prior cleanup failure cannot make history grow without bound.
    if (
      [...snapshot.lockGenerations].some(
        (generation) => generation < snapshot.current,
      )
    ) {
      await cleanupOlderV1(ensured.namespace, snapshot.current);
      snapshot = scanNamespaceV1(ensured.namespace);
    }

    if (snapshot.current > 0) {
      const currentFile = lockFileV1(
        ensured.namespace,
        snapshot.current,
      );
      let current: LockRecordV1 | null;
      try {
        current = await readLockRecordV1(
          currentFile,
          snapshot.current,
        );
      } catch (error: any) {
        if (
          error instanceof WcProcessInstanceLockError &&
          error.code.endsWith("_generation_changed")
        ) {
          continue;
        }
        throw error;
      }
      if (!current) continue;
      let released = false;
      if (snapshot.releaseGenerations.has(snapshot.current)) {
        let release: ReleaseRecordV1 | null;
        try {
          release = await readReleaseRecordV1(
            releaseFileV1(ensured.namespace, snapshot.current),
            current,
          );
        } catch (error: any) {
          if (
            error instanceof WcProcessInstanceLockError &&
            error.code.endsWith("_generation_changed")
          ) {
            continue;
          }
          throw error;
        }
        if (!release) continue;
        released = true;
      } else if (isLocallyReleasedV1(ensured.namespace, current)) {
        released = true;
      }
      if (!released && (await ownerStillLiveV1(current, bootId))) {
        fail("wc_process_lock_busy");
      }
    }

    const generation = snapshot.current + 1;
    if (!Number.isSafeInteger(generation) || generation <= 0) {
      fail("wc_process_lock_generation_exhausted");
    }
    const ownerNonce = crypto.randomBytes(32).toString("hex");
    const record: LockRecordV1 = {
      marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
      version: 1,
      name,
      generation,
      pid: process.pid,
      process_start_ticks: ownTicks,
      boot_id: bootId,
      owner_nonce: ownerNonce,
      created_at_ms: Date.now(),
    };
    const file = lockFileV1(ensured.namespace, generation);
    let published: boolean;
    try {
      published = await durablePublishExclusiveV1(
        ensured.namespace,
        ensured.temp_dir,
        file,
        record as unknown as Record<string, unknown>,
        "lock",
      );
    } catch (error) {
      if (error instanceof WcProcessInstanceLockPublicationLinkedError) {
        // The generation pathname became visible but its directory fsync did
        // not complete. Treat only this process's exact generation as locally
        // released, then advance. A later successful namespace fsync commits
        // both directory mutations; foreign processes still see a live owner.
        rememberLocalReleaseV1(ensured.namespace, record);
        continue;
      }
      throw error;
    }
    if (!published) continue;

    const after = scanNamespaceV1(
      ensured.namespace,
      LOCK_NAMESPACE_MAX_ENTRIES_V1 + 1,
    );
    if (after.current !== generation) {
      try {
        await publishReleaseV1(ensured.namespace, record);
      } catch {
        rememberLocalReleaseV1(ensured.namespace, record);
      }
      continue;
    }
    clearLocalReleaseV1(ensured.namespace);

    // Cleanup cannot revoke the already-durable current owner. Keep the
    // request terminal truthful and let the next acquisition retry bounded
    // stale-history cleanup before it can publish another generation.
    try {
      await cleanupOlderV1(ensured.namespace, generation);
    } catch (error) {
      console.warn("VOID_WC_PROCESS_INSTANCE_LOCK_CLEANUP_HOLD_V1", {
        name,
        generation,
        error: String((error as any)?.message || error),
      });
    }
    return {
      ...record,
      dir: ensured.root,
      namespace_dir: ensured.namespace,
      namespace_dev: ensured.identity.dev,
      namespace_ino: ensured.identity.ino,
      file,
      released_file: releaseFileV1(ensured.namespace, generation),
    };
  }
  fail("wc_process_lock_contention_retry_exhausted");
}

function validateReturnedLockV1(
  raw: WcProcessInstanceLockV1,
): LockRecordV1 {
  if (
    !raw ||
    raw.marker !== VOID_WC_PROCESS_INSTANCE_LOCK_V1 ||
    raw.version !== 1 ||
    !safeNameV1(raw.name) ||
    !safePositiveIntV1(raw.generation) ||
    !safePositiveIntV1(raw.pid) ||
    !safeTicksV1(raw.process_start_ticks) ||
    !safeBootIdV1(raw.boot_id) ||
    !safeOwnerNonceV1(raw.owner_nonce) ||
    !safePositiveIntV1(raw.created_at_ms)
  ) {
    fail("wc_process_lock_returned_schema_invalid");
  }
  return {
    marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
    version: 1,
    name: raw.name,
    generation: raw.generation,
    pid: raw.pid,
    process_start_ticks: raw.process_start_ticks,
    boot_id: raw.boot_id,
    owner_nonce: raw.owner_nonce,
    created_at_ms: raw.created_at_ms,
  };
}

export async function releaseWcProcessInstanceLockV1(
  lockRaw: WcProcessInstanceLockV1,
): Promise<void> {
  const lock = validateReturnedLockV1(lockRaw);
  const namespace = path.resolve(
    String(lockRaw.namespace_dir || lockRaw.dir || ""),
  );
  const namespaceIdentity = directoryIdentityV1(namespace);
  if (
    String(lockRaw.namespace_dev || "") !== namespaceIdentity.dev ||
    String(lockRaw.namespace_ino || "") !== namespaceIdentity.ino
  ) {
    fail("wc_process_lock_returned_namespace_changed");
  }
  const expectedFile = lockFileV1(namespace, lock.generation);
  if (path.resolve(lockRaw.file) !== expectedFile) {
    fail("wc_process_lock_returned_path_invalid");
  }

  let current: LockRecordV1 | null;
  try {
    current = await readLockRecordV1(
      expectedFile,
      lock.generation,
    );
  } catch (error: any) {
    if (
      error instanceof WcProcessInstanceLockError &&
      error.code.endsWith("_generation_changed")
    ) {
      const snapshot = scanNamespaceV1(namespace);
      if (snapshot.current > lock.generation) return;
    }
    throw error;
  }
  if (!current) {
    const snapshot = scanNamespaceV1(namespace);
    if (snapshot.current > lock.generation) return;
    if (isLocallyReleasedV1(namespace, lock)) return;
    fail("wc_process_lock_release_generation_changed");
  }
  if (!sameOwnerTupleV1(current, lock)) {
    fail("wc_process_lock_release_owner_mismatch");
  }

  try {
    await publishReleaseV1(namespace, current);
    clearLocalReleaseV1(namespace);
  } catch (error) {
    rememberLocalReleaseV1(namespace, current);
    console.warn("VOID_WC_PROCESS_INSTANCE_LOCK_RELEASE_FALLBACK_V1", {
      name: current.name,
      generation: current.generation,
      error: String((error as any)?.message || error),
    });
  }
}
