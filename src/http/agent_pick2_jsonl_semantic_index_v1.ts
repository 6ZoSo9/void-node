// @ts-nocheck
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1 =
  "VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1";

export const VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1 = 1024 * 1024;
export const VOID_AGENT_PICK2_JSONL_MAX_TAIL_SCAN_BYTES_V1 = 32 * 1024 * 1024;
export const VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1 =
  16 * 1024 * 1024;
export const VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF_MS_V1 =
  30_000;

const VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_V1 =
  "VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_V1";
const VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_MAX_BYTES_V1 = 4096;

type JsonlEntryV1 = {
  raw: string;
  parsed: any | null;
};

type FileStampV1 = {
  dev: string;
  ino: string;
  size: number;
  mtimeNs: string;
  ctimeNs: string;
};

type CompletionStateV1 = FileStampV1 & {
  initialized: boolean;
  completed: Set<string>;
  endedWithNewline: boolean;
};

type TailStateV1 = FileStampV1 & {
  initialized: boolean;
  maxRaw: number;
  maxValid: number;
  rawTail: JsonlEntryV1[];
  validTail: any[];
  endedWithNewline: boolean;
};

type HeadStateV1 = FileStampV1 & {
  initialized: boolean;
  maxRaw: number;
  entries: JsonlEntryV1[];
  capped: boolean;
  endedWithNewline: boolean;
  latestById: Map<string, any>;
  latestRunnableById: Map<string, any>;
};

type IoMetricsV1 = {
  bytes_read_total: number;
  sync_bytes_read_total: number;
  async_bytes_read_total: number;
  rebuilds_total: number;
  incremental_reads_total: number;
  cache_hits_total: number;
  coherent_scan_retries_total: number;
  append_witness_misses_total: number;
  by_kind: Record<string, {
    bytes_read: number;
    rebuilds: number;
    incremental_reads: number;
    cache_hits: number;
  }>;
};

type AppendWitnessV1 = {
  before: FileStampV1;
  after: FileStampV1;
  endedWithNewline: boolean;
};

type TestHooksV1 = {
  afterReadChunk?: (ctx: {
    file: string;
    kind: string;
    start: number;
    bytes: number;
    chunkIndex: number;
  }) => void;
};

export type AgentPick2SemanticSnapshotV1 = {
  done: Set<string>;
  active: Set<string>;
  doneTruthHas: (id: string) => boolean;
  latestById: Map<string, any>;
  latestRunnableById: Map<string, any>;
  recentLeases: any[];
  io: IoMetricsV1;
};

const APPEND_WITNESS_LIMIT_V1 = 8192;
const appendWitnessesV1 = new Map<string, AppendWitnessV1[]>();

function fileKeyV1(file: string): string {
  return path.resolve(String(file || ""));
}

function stampFromStatsV1(st: any): FileStampV1 {
  const big = st && typeof st.dev === "bigint";
  const dev = big ? st.dev : BigInt(st?.dev || 0);
  const ino = big ? st.ino : BigInt(st?.ino || 0);
  const sizeBig = big ? st.size : BigInt(st?.size || 0);
  const mtimeNs =
    typeof st?.mtimeNs === "bigint"
      ? st.mtimeNs
      : BigInt(Math.round(Number(st?.mtimeMs || 0) * 1_000_000));
  const ctimeNs =
    typeof st?.ctimeNs === "bigint"
      ? st.ctimeNs
      : BigInt(Math.round(Number(st?.ctimeMs || 0) * 1_000_000));
  return {
    dev: String(dev),
    ino: String(ino),
    size: Number(sizeBig),
    mtimeNs: String(mtimeNs),
    ctimeNs: String(ctimeNs),
  };
}

function fstatV1(fd: number): FileStampV1 {
  const st = fs.fstatSync(fd, { bigint: true } as any);
  if (!st.isFile()) throw new Error("VOID_AGENT_PICK2_JSONL_NON_REGULAR_FILE");
  return stampFromStatsV1(st);
}

function statV1(file: string): FileStampV1 | null {
  try {
    const st = fs.statSync(file, { bigint: true } as any);
    if (!st.isFile()) return null;
    return stampFromStatsV1(st);
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

function emptyStampV1(): FileStampV1 {
  return {
    dev: "-1",
    ino: "-1",
    size: 0,
    mtimeNs: "-1",
    ctimeNs: "-1",
  };
}

function sameObjectV1(a: FileStampV1, b: FileStampV1): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function sameStampV1(a: FileStampV1, b: FileStampV1): boolean {
  return (
    sameObjectV1(a, b) &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}

function recordAppendWitnessV1(
  file: string,
  before: FileStampV1,
  after: FileStampV1,
  endedWithNewline: boolean,
) {
  const key = fileKeyV1(file);
  const list = appendWitnessesV1.get(key) || [];
  list.push({ before, after, endedWithNewline });
  if (list.length > APPEND_WITNESS_LIMIT_V1) {
    list.splice(0, list.length - APPEND_WITNESS_LIMIT_V1);
  }
  appendWitnessesV1.set(key, list);
}

function appendWitnessChainV1(
  file: string,
  prior: FileStampV1,
  current: FileStampV1,
): { ok: boolean; endedWithNewline: boolean } {
  if (sameStampV1(prior, current)) {
    return { ok: true, endedWithNewline: true };
  }
  if (
    !sameObjectV1(prior, current) ||
    current.size <= prior.size
  ) {
    return { ok: false, endedWithNewline: false };
  }

  const list = appendWitnessesV1.get(fileKeyV1(file)) || [];
  for (let i = 0; i < list.length; i++) {
    const first = list[i];
    if (!sameStampV1(first.before, prior)) continue;
    let cursor = first.after;
    let ended = first.endedWithNewline;
    if (sameStampV1(cursor, current)) {
      return { ok: true, endedWithNewline: ended };
    }
    for (let j = i + 1; j < list.length; j++) {
      const next = list[j];
      if (!sameStampV1(next.before, cursor)) break;
      cursor = next.after;
      ended = next.endedWithNewline;
      if (sameStampV1(cursor, current)) {
        return { ok: true, endedWithNewline: ended };
      }
    }
  }
  return { ok: false, endedWithNewline: false };
}

type CanonicalWriterStateV1 = {
  stamp: FileStampV1;
};
type AppendWriterTestHooksV1 = {
  afterTrustedBefore?: (ctx: {
    file: string;
    before: FileStampV1;
    trusted_generation: boolean;
  }) => void;
  afterIsolatedTrusted?: (ctx: {
    file: string;
    before: FileStampV1;
    isolated_path: string;
    pinned_path: string;
    trusted_generation: boolean;
  }) => void;
  afterAppendBeforeRestore?: (ctx: {
    file: string;
    before: FileStampV1;
    isolated_path: string;
    pinned_path: string;
    trusted_generation: boolean;
  }) => void;
  payloadWriteChunkBytes?: number;
  afterPayloadWriteProgress?: (ctx: {
    file: string;
    bytes_written: number;
    bytes_total: number;
  }) => void;
  afterPayloadBeforeFdatasync?: (ctx: {
    file: string;
    bytes_total: number;
  }) => void;
  afterLockClaimTempCreated?: (ctx: {
    file: string;
    claim_temp_path: string;
  }) => void;
  afterLockClaimWriteProgress?: (ctx: {
    file: string;
    claim_temp_path: string;
    bytes_written: number;
    bytes_total: number;
  }) => void;
  beforeLockClaimReleaseUnlink?: (ctx: {
    file: string;
    claim_path: string;
  }) => void;
  beforeLockClaimReleasePublish?: (ctx: {
    file: string;
    claim_path: string;
  }) => void;
  beforeIntentRetire?: (ctx: {
    file: string;
    intent_path: string;
  }) => void;
  afterRecoveryIsolatedValidated?: (ctx: {
    file: string;
    isolated_path: string;
    pinned_path: string;
    before: FileStampV1;
  }) => void;
  beforeFirstCanonicalCreateDirectorySync?: (ctx: { file: string }) => void;
  afterFirstCanonicalCreateDirectorySync?: (ctx: { file: string }) => void;
};

type CanonicalAppendLockV1 = {
  key: string;
  path: string;
  token: string;
  process_instance: string;
};

type AppendClaimV1 = {
  marker: string;
  version: 1;
  pid: number;
  process_instance: string;
  token: string;
  created_ms: number;
  path: string;
  stamp: FileStampV1;
};

type AppendClaimReleaseV1 = {
  marker: string;
  version: 1;
  pid: number;
  process_instance: string;
  token: string;
  claim_stamp: FileStampV1;
  path: string;
  stamp: FileStampV1;
};

type IsolationIntentV1 = {
  marker: string;
  version: 1;
  canonical_basename: string;
  isolated_basename: string;
  pin_basename: string;
  commit_basename: string;
  before: FileStampV1;
  append_bytes: number;
  append_sha256: string;
  path: string;
  isolated_path: string;
  pinned_path: string;
  commit_path: string;
};

type RecoveryOutcomeV1 = {
  kind: "none" | "absent" | "committed";
  intent: IsolationIntentV1 | null;
  after: FileStampV1 | null;
};

type TerminalAppendV1 = {
  marker: string;
  version: 1;
  before: FileStampV1;
  after: FileStampV1;
  append_bytes: number;
  append_sha256: string;
  path: string;
};

const VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_V1 =
  "VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_V1";
const VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_V1 =
  "VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_V1";
const VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_MAX_BYTES_V1 = 4096;
const VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_V1 =
  "VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_V1";
const VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_MAX_BYTES_V1 = 4096;
const VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_V1 =
  "VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_V1";
const canonicalWriterStatesV1 = new Map<string, CanonicalWriterStateV1>();
const activeCanonicalWritersV1 = new Set<string>();
let canonicalAppendNonceV1 = 0;
let currentProcessInstanceCacheV1 = "";

function seedCanonicalWriterStateV1(file: string, stamp: FileStampV1) {
  canonicalWriterStatesV1.set(fileKeyV1(file), { stamp });
}

function sameDataStampV1(a: FileStampV1, b: FileStampV1): boolean {
  return (
    sameObjectV1(a, b) &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs
  );
}

function uniqueRuntimeSiblingV1(file: string, label: string): string {
  const key = fileKeyV1(file);
  canonicalAppendNonceV1 += 1;
  return `${key}.void-pick2-${label}-${process.pid}-${canonicalAppendNonceV1}`;
}

function fsyncParentDirectoryV1(file: string) {
  const dir = path.dirname(fileKeyV1(file));
  const fd = fs.openSync(
    dir,
    fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0),
  );
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function recordBestEffortFailureV1(scope: string, err: unknown) {
  console.warn(`VOID_AGENT_PICK2_JSONL_BEST_EFFORT_FAILURE scope=${scope}`, err);
}

function exactKeysV1(value: any, expected: string[]): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, i) => key === wanted[i]);
}

function validStampValueV1(value: any): value is FileStampV1 {
  return exactKeysV1(value, ["dev", "ino", "size", "mtimeNs", "ctimeNs"]) &&
    typeof value.dev === "string" && /^\d+$/.test(value.dev) &&
    typeof value.ino === "string" && /^\d+$/.test(value.ino) &&
    Number.isSafeInteger(value.size) && value.size >= 0 &&
    typeof value.mtimeNs === "string" && /^\d+$/.test(value.mtimeNs) &&
    typeof value.ctimeNs === "string" && /^\d+$/.test(value.ctimeNs);
}

function pidAliveV1(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err?.code !== "ESRCH";
  }
}

function linuxProcessInstanceV1(pid: number): string | null {
  if (process.platform !== "linux" || !Number.isInteger(pid) || pid <= 0) {
    return null;
  }
  try {
    const boot = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
    const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const end = raw.lastIndexOf(")");
    if (!boot || end < 0) return null;
    const fields = raw.slice(end + 1).trim().split(/\s+/);
    const startTicks = String(fields[19] || "");
    if (!/^\d+$/.test(startTicks)) return null;
    return `linux:${boot}:${startTicks}`;
  } catch (_err) {
    return null;
  }
}

function currentProcessInstanceV1(): string {
  if (currentProcessInstanceCacheV1) return currentProcessInstanceCacheV1;
  const linux = linuxProcessInstanceV1(process.pid);
  currentProcessInstanceCacheV1 = linux ||
    `opaque:${process.pid}:${crypto.randomBytes(16).toString("hex")}`;
  return currentProcessInstanceCacheV1;
}

function appendClaimPrefixV1(file: string): string {
  return `${path.basename(fileKeyV1(file))}.void-pick2-append-claim-`;
}

function appendClaimPathV1(file: string, token: string): string {
  const key = fileKeyV1(file);
  return path.join(
    path.dirname(key),
    `${path.basename(key)}.void-pick2-append-claim-${token}.json`,
  );
}

function appendClaimTempPathV1(file: string, token: string): string {
  const key = fileKeyV1(file);
  return path.join(
    path.dirname(key),
    `${path.basename(key)}.void-pick2-append-claim-tmp-${process.pid}-${token}`,
  );
}

function appendClaimReleasePathV1(file: string, token: string): string {
  const claimPath = fileKeyV1(file);
  const claimSuffix = `.void-pick2-append-claim-${token}.json`;
  const claimBase = path.basename(claimPath);
  if (!claimBase.endsWith(claimSuffix)) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_PATH_INVALID");
  }
  const canonicalBase = claimBase.slice(0, -claimSuffix.length);
  return path.join(
    path.dirname(claimPath),
    `${canonicalBase}.void-pick2-append-release-${token}.json`,
  );
}

function appendClaimReleaseTempPathV1(file: string, token: string): string {
  const claimPath = fileKeyV1(file);
  const claimSuffix = `.void-pick2-append-claim-${token}.json`;
  const claimBase = path.basename(claimPath);
  if (!claimBase.endsWith(claimSuffix)) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_PATH_INVALID");
  }
  const canonicalBase = claimBase.slice(0, -claimSuffix.length);
  return path.join(
    path.dirname(claimPath),
    `${canonicalBase}.void-pick2-append-release-tmp-${process.pid}-${token}`,
  );
}

function listAppendClaimPathsV1(file: string): string[] {
  const key = fileKeyV1(file);
  const dir = path.dirname(key);
  const prefix = appendClaimPrefixV1(key);
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
  return names
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .sort()
    .map((name) => path.join(dir, name));
}

function readAppendClaimV1(claimPath: string): AppendClaimV1 {
  const lst = fs.lstatSync(claimPath, { bigint: true } as any);
  if (!lst.isFile() || lst.isSymbolicLink()) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_NON_REGULAR");
  }
  const size = Number(lst.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_MAX_BYTES_V1
  ) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_SIZE");
  }
  const fd = fs.openSync(
    claimPath,
    fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
  );
  let raw: Buffer;
  let opened: FileStampV1;
  try {
    opened = fstatV1(fd);
    const listed = stampFromStatsV1(lst);
    if (!sameStampV1(opened, listed)) {
      throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_UNSTABLE");
    }
    raw = Buffer.alloc(size);
    let off = 0;
    while (off < raw.length) {
      const n = fs.readSync(fd, raw, off, raw.length - off, off);
      if (n <= 0) break;
      off += n;
    }
    if (off !== raw.length) {
      throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_SHORT_READ");
    }
  } finally {
    fs.closeSync(fd);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch (_err) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_MALFORMED");
  }
  if (!exactKeysV1(parsed, [
    "marker",
    "version",
    "pid",
    "process_instance",
    "token",
    "created_ms",
  ])) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_SHAPE");
  }
  const token = String(parsed.token || "");
  if (
    parsed.marker !== VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_V1 ||
    parsed.version !== 1 ||
    !Number.isInteger(parsed.pid) ||
    parsed.pid <= 0 ||
    typeof parsed.process_instance !== "string" ||
    !parsed.process_instance ||
    !/^[a-f0-9]{32}$/.test(token) ||
    !Number.isSafeInteger(parsed.created_ms) ||
    parsed.created_ms < 0
  ) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_INVALID");
  }
  if (!path.basename(claimPath).endsWith(`-${token}.json`)) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_TOKEN_MISMATCH");
  }
  return {
    marker: parsed.marker,
    version: 1,
    pid: parsed.pid,
    process_instance: parsed.process_instance,
    token,
    created_ms: parsed.created_ms,
    path: claimPath,
    stamp: opened,
  };
}

function readAppendClaimReleaseV1(
  claim: AppendClaimV1,
): AppendClaimReleaseV1 | null {
  const releasePath = appendClaimReleasePathV1(claim.path, claim.token);
  let lst: any;
  try {
    lst = fs.lstatSync(releasePath, { bigint: true } as any);
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
  if (!lst.isFile() || lst.isSymbolicLink()) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_NON_REGULAR");
  }
  const size = Number(lst.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_MAX_BYTES_V1
  ) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_SIZE");
  }
  const fd = fs.openSync(
    releasePath,
    fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
  );
  let raw: Buffer;
  let opened: FileStampV1;
  try {
    opened = fstatV1(fd);
    if (!sameStampV1(opened, stampFromStatsV1(lst))) {
      throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_UNSTABLE");
    }
    raw = readExactFdV1(fd, 0, size);
  } finally {
    fs.closeSync(fd);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch (_err) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_MALFORMED");
  }
  if (!exactKeysV1(parsed, [
    "marker",
    "version",
    "pid",
    "process_instance",
    "token",
    "claim_stamp",
  ])) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_SHAPE");
  }
  if (
    parsed.marker !== VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_V1 ||
    parsed.version !== 1 ||
    parsed.pid !== claim.pid ||
    parsed.process_instance !== claim.process_instance ||
    parsed.token !== claim.token ||
    !validStampValueV1(parsed.claim_stamp) ||
    !sameStampV1(parsed.claim_stamp, claim.stamp)
  ) {
    throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_MISMATCH");
  }
  return {
    marker: parsed.marker,
    version: 1,
    pid: parsed.pid,
    process_instance: parsed.process_instance,
    token: parsed.token,
    claim_stamp: parsed.claim_stamp,
    path: releasePath,
    stamp: opened,
  };
}

function publishAppendClaimReleaseV1(claim: AppendClaimV1) {
  const releasePath = appendClaimReleasePathV1(claim.path, claim.token);
  const tempPath = appendClaimReleaseTempPathV1(claim.path, claim.token);
  const body = Buffer.from(
    JSON.stringify({
      marker: VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_V1,
      version: 1,
      pid: claim.pid,
      process_instance: claim.process_instance,
      token: claim.token,
      claim_stamp: claim.stamp,
    }) + "\n",
    "utf8",
  );
  let fd: number | null = null;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        ((fs.constants as any).O_NOFOLLOW || 0),
      0o600,
    );
    let off = 0;
    while (off < body.length) {
      const n = fs.writeSync(fd, body, off, body.length - off, null);
      if (n <= 0) {
        throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_SHORT_WRITE");
      }
      off += n;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    try {
      fs.linkSync(tempPath, releasePath);
      fsyncParentDirectoryV1(claim.path);
    } catch (err: any) {
      if (err?.code !== "EEXIST") throw err;
      const existing = readAppendClaimReleaseV1(claim);
      if (!existing) {
        throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_MISSING");
      }
    }
  } finally {
    if (fd !== null) fs.closeSync(fd);
    try {
      fs.unlinkSync(tempPath);
      fsyncParentDirectoryV1(claim.path);
    } catch (err: any) {
      if (err?.code !== "ENOENT") {
        recordBestEffortFailureV1("claim_release_temp_unlink", err);
      }
    }
  }
}

function removeObservedClaimReleaseV1(release: AppendClaimReleaseV1): boolean {
  let now: any;
  try {
    now = fs.lstatSync(release.path, { bigint: true } as any);
  } catch (err: any) {
    return err?.code === "ENOENT";
  }
  if (!now.isFile() || now.isSymbolicLink()) return false;
  if (!sameStampV1(stampFromStatsV1(now), release.stamp)) return false;
  try {
    fs.unlinkSync(release.path);
    fsyncParentDirectoryV1(release.path);
    return true;
  } catch (err: any) {
    return err?.code === "ENOENT";
  }
}

function removeObservedClaimV1(claim: AppendClaimV1): boolean {
  let now: any;
  try {
    now = fs.lstatSync(claim.path, { bigint: true } as any);
  } catch (err: any) {
    if (err?.code === "ENOENT") return true;
    return false;
  }
  if (!now.isFile() || now.isSymbolicLink()) return false;
  const stamp = stampFromStatsV1(now);
  if (!sameStampV1(stamp, claim.stamp)) return false;
  try {
    fs.unlinkSync(claim.path);
    try { fsyncParentDirectoryV1(claim.path); } catch (err) {
      recordBestEffortFailureV1("claim_parent_fsync", err);
    }
    return true;
  } catch (err: any) {
    return err?.code === "ENOENT";
  }
}

function claimStateV1(claim: AppendClaimV1): "live" | "stale" | "ambiguous" {
  if (!pidAliveV1(claim.pid)) return "stale";
  if (process.platform === "linux") {
    const actual = linuxProcessInstanceV1(claim.pid);
    if (!actual) return "ambiguous";
    return actual === claim.process_instance ? "live" : "stale";
  }
  if (
    claim.pid === process.pid &&
    claim.process_instance === currentProcessInstanceV1()
  ) {
    return "live";
  }
  return "live";
}

function publishAppendClaimV1(
  file: string,
  hooks?: AppendWriterTestHooksV1,
): CanonicalAppendLockV1 {
  const key = fileKeyV1(file);
  const token = crypto.randomBytes(16).toString("hex");
  const processInstance = currentProcessInstanceV1();
  const claimPath = appendClaimPathV1(key, token);
  const tempPath = appendClaimTempPathV1(key, token);
  const body = Buffer.from(
    JSON.stringify({
      marker: VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_V1,
      version: 1,
      pid: process.pid,
      process_instance: processInstance,
      token,
      created_ms: Date.now(),
    }) + "\n",
    "utf8",
  );
  let fd: number | null = null;
  let published = false;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        ((fs.constants as any).O_NOFOLLOW || 0),
      0o600,
    );
    hooks?.afterLockClaimTempCreated?.({ file: key, claim_temp_path: tempPath });
    let off = 0;
    while (off < body.length) {
      const cap = hooks?.afterLockClaimWriteProgress
        ? Math.min(16, body.length - off)
        : body.length - off;
      const n = fs.writeSync(fd, body, off, cap, null);
      if (n <= 0) {
        throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_SHORT_WRITE");
      }
      off += n;
      hooks?.afterLockClaimWriteProgress?.({
        file: key,
        claim_temp_path: tempPath,
        bytes_written: off,
        bytes_total: body.length,
      });
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.linkSync(tempPath, claimPath);
    published = true;
    fsyncParentDirectoryV1(key);
    fs.unlinkSync(tempPath);
    fsyncParentDirectoryV1(key);
    return {
      key,
      path: claimPath,
      token,
      process_instance: processInstance,
    };
  } catch (err) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (closeErr) {
        recordBestEffortFailureV1("claim_temp_close", closeErr);
      }
      fd = null;
    }
    try { fs.unlinkSync(tempPath); } catch (unlinkErr) {
      recordBestEffortFailureV1("claim_temp_unlink", unlinkErr);
    }
    if (published) {
      try {
        const own = readAppendClaimV1(claimPath);
        if (
          own.token === token &&
          own.pid === process.pid &&
          own.process_instance === processInstance
        ) {
          removeObservedClaimV1(own);
        }
      } catch (cleanupErr) {
        recordBestEffortFailureV1("published_claim_cleanup", cleanupErr);
      }
    }
    throw err;
  }
}

function blockOrReclaimOtherClaimsV1(
  file: string,
  ownPath = "",
): boolean {
  const selfInstance = currentProcessInstanceV1();
  let blocked = false;
  for (const claimPath of listAppendClaimPathsV1(file)) {
    if (ownPath && claimPath === ownPath) continue;
    let claim: AppendClaimV1;
    try {
      claim = readAppendClaimV1(claimPath);
    } catch (err) {
      recordBestEffortFailureV1("claim_read_blocks_reclamation", err);
      blocked = true;
      continue;
    }
    let release: AppendClaimReleaseV1 | null;
    try {
      release = readAppendClaimReleaseV1(claim);
    } catch (err) {
      recordBestEffortFailureV1("claim_release_read_blocks_reclamation", err);
      blocked = true;
      continue;
    }
    if (release) {
      if (!removeObservedClaimV1(claim)) {
        blocked = true;
        continue;
      }
      if (!removeObservedClaimReleaseV1(release)) {
        recordBestEffortFailureV1(
          "claim_release_witness_cleanup",
          new Error("release witness cleanup deferred"),
        );
      }
      continue;
    }
    const ownOrphan =
      claim.pid === process.pid && claim.process_instance === selfInstance;
    const state = ownOrphan ? "stale" : claimStateV1(claim);
    if (state === "stale") {
      if (!removeObservedClaimV1(claim)) blocked = true;
      continue;
    }
    blocked = true;
  }
  return blocked;
}

function acquireCanonicalAppendLockV1(
  file: string,
  hooks?: AppendWriterTestHooksV1,
): CanonicalAppendLockV1 {
  const key = fileKeyV1(file);
  if (activeCanonicalWritersV1.has(key)) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_REENTRANT file=${file}`,
    );
  }
  activeCanonicalWritersV1.add(key);
  let own: CanonicalAppendLockV1 | null = null;
  try {
    if (blockOrReclaimOtherClaimsV1(key)) {
      throw new Error("VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_LOCKED");
    }
    own = publishAppendClaimV1(key, hooks);
    if (blockOrReclaimOtherClaimsV1(key, own.path)) {
      try {
        const claim = readAppendClaimV1(own.path);
        removeObservedClaimV1(claim);
      } catch (cleanupErr) {
        recordBestEffortFailureV1("contended_claim_cleanup", cleanupErr);
      }
      own = null;
      throw new Error("VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_LOCKED");
    }
    return own;
  } catch (err: any) {
    activeCanonicalWritersV1.delete(key);
    if (/VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_/.test(String(err?.message || err))) {
      throw err;
    }
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_LOCKED file=${file} cause=${String(err?.code || err)}`,
    );
  }
}

function releaseCanonicalAppendLockV1(
  lock: CanonicalAppendLockV1,
  hooks?: AppendWriterTestHooksV1,
) {
  let claim: AppendClaimV1 | null = null;
  let release: AppendClaimReleaseV1 | null = null;
  let releasePublished = false;
  try {
    claim = readAppendClaimV1(lock.path);
    if (
      claim.token !== lock.token ||
      claim.pid !== process.pid ||
      claim.process_instance !== lock.process_instance
    ) {
      throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_OWNER_MISMATCH");
    }
    hooks?.beforeLockClaimReleasePublish?.({
      file: lock.key,
      claim_path: lock.path,
    });
    // The durable exact-claim release witness is the cross-process logical
    // unlock boundary. A foreign contender may retire this exact immutable
    // claim after the witness is visible, even if pathname cleanup fails while
    // the prior process remains alive.
    publishAppendClaimReleaseV1(claim);
    releasePublished = true;
    release = readAppendClaimReleaseV1(claim);
    if (!release) {
      throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_MISSING");
    }
    hooks?.beforeLockClaimReleaseUnlink?.({
      file: lock.key,
      claim_path: lock.path,
    });
    if (!removeObservedClaimV1(claim)) {
      throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_CLAIM_RELEASE_UNLINK_FAILED");
    }
    if (!removeObservedClaimReleaseV1(release)) {
      recordBestEffortFailureV1(
        "claim_release_witness_cleanup",
        new Error("release witness cleanup deferred"),
      );
    }
  } catch (err) {
    let claimRemoved = false;
    if (claim && !releasePublished) {
      // If witness publication itself fails, direct exact-generation cleanup
      // remains safe. Otherwise preserve the claim and its durable witness for
      // a foreign contender to retire.
      claimRemoved = removeObservedClaimV1(claim);
    }
    if (!claimRemoved) {
      recordBestEffortFailureV1("claim_release_deferred", err);
    }
  } finally {
    activeCanonicalWritersV1.delete(lock.key);
  }
}

function isolationIntentPathV1(file: string): string {
  return `${fileKeyV1(file)}.void-pick2-isolation-recovery-v1.json`;
}

function hasIsolationIntentV1(file: string): boolean {
  try {
    fs.lstatSync(isolationIntentPathV1(file));
    return true;
  } catch (err: any) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}

function readIsolationIntentV1(file: string): IsolationIntentV1 | null {
  const key = fileKeyV1(file);
  const intentPath = isolationIntentPathV1(key);
  let lst: any;
  try {
    lst = fs.lstatSync(intentPath, { bigint: true } as any);
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
  if (!lst.isFile() || lst.isSymbolicLink()) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_NON_REGULAR file=${file}`,
    );
  }
  const size = Number(lst.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_MAX_BYTES_V1
  ) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_SIZE file=${file} bytes=${size}`,
    );
  }

  const fd = fs.openSync(
    intentPath,
    fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
  );
  let raw: Buffer;
  try {
    const opened = fstatV1(fd);
    const listed = stampFromStatsV1(lst);
    if (!sameStampV1(opened, listed)) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_UNSTABLE file=${file}`,
      );
    }
    raw = Buffer.alloc(size);
    let off = 0;
    while (off < raw.length) {
      const n = fs.readSync(fd, raw, off, raw.length - off, off);
      if (n <= 0) break;
      off += n;
    }
    if (off !== raw.length) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_SHORT_READ file=${file}`,
      );
    }
  } finally {
    fs.closeSync(fd);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch (_err) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_MALFORMED file=${file}`,
    );
  }
  if (!exactKeysV1(parsed, [
    "marker",
    "version",
    "canonical_basename",
    "isolated_basename",
    "pin_basename",
    "commit_basename",
    "before",
    "append_bytes",
    "append_sha256",
  ])) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_SHAPE file=${file}`,
    );
  }
  const canonicalBase = path.basename(key);
  const isolatedBase = String(parsed.isolated_basename || "");
  const pinBase = String(parsed.pin_basename || "");
  const commitBase = String(parsed.commit_basename || "");
  if (
    parsed.marker !== VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_V1 ||
    parsed.version !== 1 ||
    parsed.canonical_basename !== canonicalBase ||
    path.basename(isolatedBase) !== isolatedBase ||
    !isolatedBase.startsWith(`${canonicalBase}.void-pick2-isolated-`) ||
    path.basename(pinBase) !== pinBase ||
    !pinBase.startsWith(`${canonicalBase}.void-pick2-recovery-pin-`) ||
    path.basename(commitBase) !== commitBase ||
    !commitBase.startsWith(`${canonicalBase}.void-pick2-append-commit-`) ||
    !validStampValueV1(parsed.before) ||
    !Number.isSafeInteger(parsed.append_bytes) ||
    parsed.append_bytes <= 0 ||
    parsed.append_bytes > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1 + 1 ||
    typeof parsed.append_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(parsed.append_sha256)
  ) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_INVALID file=${file}`,
    );
  }

  return {
    marker: parsed.marker,
    version: 1,
    canonical_basename: canonicalBase,
    isolated_basename: isolatedBase,
    pin_basename: pinBase,
    commit_basename: commitBase,
    before: parsed.before,
    append_bytes: parsed.append_bytes,
    append_sha256: parsed.append_sha256,
    path: intentPath,
    isolated_path: path.join(path.dirname(key), isolatedBase),
    pinned_path: path.join(path.dirname(key), pinBase),
    commit_path: path.join(path.dirname(key), commitBase),
  };
}

function writeIsolationIntentV1(
  file: string,
  isolatedPath: string,
  pinnedPath: string,
  commitPath: string,
  before: FileStampV1,
  appendBytes: number,
  appendSha256: string,
) {
  const key = fileKeyV1(file);
  const dir = path.dirname(key);
  const canonicalBase = path.basename(key);
  const isolatedBase = path.basename(isolatedPath);
  const pinBase = path.basename(pinnedPath);
  const commitBase = path.basename(commitPath);
  if (
    path.dirname(path.resolve(isolatedPath)) !== dir ||
    !isolatedBase.startsWith(`${canonicalBase}.void-pick2-isolated-`) ||
    path.dirname(path.resolve(pinnedPath)) !== dir ||
    !pinBase.startsWith(`${canonicalBase}.void-pick2-recovery-pin-`)
    || path.dirname(path.resolve(commitPath)) !== dir
    || !commitBase.startsWith(`${canonicalBase}.void-pick2-append-commit-`)
  ) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_TARGET_INVALID file=${file}`,
    );
  }
  if (
    !Number.isSafeInteger(appendBytes) ||
    appendBytes <= 0 ||
    appendBytes > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1 + 1 ||
    !/^[a-f0-9]{64}$/.test(appendSha256)
  ) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_APPEND_IDENTITY_INVALID file=${file}`,
    );
  }

  const intentPath = isolationIntentPathV1(key);
  if (hasIsolationIntentV1(key)) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_EXISTS file=${file}`,
    );
  }
  const body = Buffer.from(
    JSON.stringify({
      marker: VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_V1,
      version: 1,
      canonical_basename: canonicalBase,
      isolated_basename: isolatedBase,
      pin_basename: pinBase,
      commit_basename: commitBase,
      before,
      append_bytes: appendBytes,
      append_sha256: appendSha256,
    }) + "\n",
    "utf8",
  );
  if (body.length > VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_MAX_BYTES_V1) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_SIZE file=${file} bytes=${body.length}`,
    );
  }

  const tmp = uniqueRuntimeSiblingV1(key, "isolation-intent-tmp");
  let fd: number | null = null;
  let linked = false;
  try {
    fd = fs.openSync(
      tmp,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        ((fs.constants as any).O_NOFOLLOW || 0),
      0o600,
    );
    let off = 0;
    while (off < body.length) {
      const n = fs.writeSync(fd, body, off, body.length - off, null);
      if (n <= 0) {
        throw new Error("VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_SHORT_WRITE");
      }
      off += n;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.linkSync(tmp, intentPath);
    linked = true;
    fsyncParentDirectoryV1(key);
    fs.unlinkSync(tmp);
    fsyncParentDirectoryV1(key);
  } finally {
    if (fd !== null) fs.closeSync(fd);
    if (!linked) {
      try { fs.unlinkSync(tmp); } catch (cleanupErr) {
        recordBestEffortFailureV1("isolation_intent_temp_unlink", cleanupErr);
      }
    }
  }
}

function writeAppendCommitV1(intent: IsolationIntentV1) {
  const body = Buffer.from(
    JSON.stringify({
      marker: VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_V1,
      version: 1,
      append_bytes: intent.append_bytes,
      append_sha256: intent.append_sha256,
    }) + "\n",
    "utf8",
  );
  const tmp = uniqueRuntimeSiblingV1(intent.path, "append-commit-tmp");
  let fd: number | null = null;
  let linked = false;
  try {
    fd = fs.openSync(
      tmp,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        ((fs.constants as any).O_NOFOLLOW || 0),
      0o600,
    );
    let off = 0;
    while (off < body.length) {
      const n = fs.writeSync(fd, body, off, body.length - off, null);
      if (n <= 0) throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_SHORT_WRITE");
      off += n;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.linkSync(tmp, intent.commit_path);
    linked = true;
    fsyncParentDirectoryV1(intent.path);
  } finally {
    if (fd !== null) fs.closeSync(fd);
    try {
      fs.unlinkSync(tmp);
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
    if (linked) fsyncParentDirectoryV1(intent.path);
  }
}

type AppendCommitEvidenceV1 = "absent" | "valid" | "ambiguous";

function classifyAppendCommitEvidenceV1(
  intent: IsolationIntentV1,
): AppendCommitEvidenceV1 {
  let fd: number | null = null;
  let entryObserved = false;
  try {
    const listed = fs.lstatSync(intent.commit_path, { bigint: true } as any);
    entryObserved = true;
    if (!listed.isFile() || listed.isSymbolicLink()) return "ambiguous";
    const size = Number(listed.size);
    if (!Number.isSafeInteger(size) || size <= 0 || size > 4096) {
      return "ambiguous";
    }
    fd = fs.openSync(
      intent.commit_path,
      fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
    );
    if (!sameStampV1(fstatV1(fd), stampFromStatsV1(listed))) {
      return "ambiguous";
    }
    const raw = readExactFdV1(fd, 0, size);
    const parsed = JSON.parse(raw.toString("utf8"));
    return exactKeysV1(parsed, ["marker", "version", "append_bytes", "append_sha256"]) &&
      parsed.marker === VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_V1 &&
      parsed.version === 1 &&
      parsed.append_bytes === intent.append_bytes &&
      parsed.append_sha256 === intent.append_sha256
      ? "valid"
      : "ambiguous";
  } catch (err: any) {
    // Only an entry that was definitely absent at the initial no-follow
    // lookup can authorize rollback. Once any pathname generation was
    // observed, disappearance, replacement, parse failure, or I/O failure is
    // ambiguous commit evidence and must preserve the authoritative suffix.
    if (err?.code === "ENOENT" && !entryObserved) return "absent";
    return "ambiguous";
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function clearAppendCommitV1(intent: IsolationIntentV1) {
  try {
    fs.unlinkSync(intent.commit_path);
    fsyncParentDirectoryV1(intent.path);
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
}

function clearIsolationIntentV1(
  file: string,
  hooks?: AppendWriterTestHooksV1,
) {
  const intent = readIsolationIntentV1(file);
  const intentPath = isolationIntentPathV1(file);
  hooks?.beforeIntentRetire?.({ file: fileKeyV1(file), intent_path: intentPath });
  try {
    fs.unlinkSync(intentPath);
    fsyncParentDirectoryV1(file);
    if (intent) clearAppendCommitV1(intent);
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
}

function terminalAppendPathV1(
  file: string,
  appendBytes: number,
  appendSha256: string,
): string {
  return `${fileKeyV1(file)}.void-pick2-append-terminal-v1-${appendBytes}-${appendSha256}.json`;
}

function readTerminalAppendV1(
  file: string,
  appendBytes: number,
  appendSha256: string,
): TerminalAppendV1 | null {
  const terminalPath = terminalAppendPathV1(file, appendBytes, appendSha256);
  let lst: any;
  try {
    lst = fs.lstatSync(terminalPath, { bigint: true } as any);
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
  if (!lst.isFile() || lst.isSymbolicLink()) {
    throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_NON_REGULAR file=${file}`);
  }
  const size = Number(lst.size);
  if (
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_MAX_BYTES_V1
  ) {
    throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_SIZE file=${file}`);
  }
  const fd = fs.openSync(
    terminalPath,
    fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
  );
  let raw: Buffer;
  try {
    const opened = fstatV1(fd);
    const listed = stampFromStatsV1(lst);
    if (!sameStampV1(opened, listed)) {
      throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_UNSTABLE file=${file}`);
    }
    raw = Buffer.alloc(size);
    let off = 0;
    while (off < raw.length) {
      const n = fs.readSync(fd, raw, off, raw.length - off, off);
      if (n <= 0) break;
      off += n;
    }
    if (off !== raw.length) {
      throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_SHORT_READ file=${file}`);
    }
  } finally {
    fs.closeSync(fd);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch (_err) {
    throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_MALFORMED file=${file}`);
  }
  if (!exactKeysV1(parsed, [
    "marker",
    "version",
    "before",
    "after",
    "append_bytes",
    "append_sha256",
  ])) {
    throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_SHAPE file=${file}`);
  }
  if (
    parsed.marker !== VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_V1 ||
    parsed.version !== 1 ||
    !validStampValueV1(parsed.before) ||
    !validStampValueV1(parsed.after) ||
    !Number.isSafeInteger(parsed.append_bytes) ||
    parsed.append_bytes <= 0 ||
    parsed.append_bytes > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1 + 1 ||
    typeof parsed.append_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(parsed.append_sha256)
  ) {
    throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_INVALID file=${file}`);
  }
  return {
    marker: parsed.marker,
    version: 1,
    before: parsed.before,
    after: parsed.after,
    append_bytes: parsed.append_bytes,
    append_sha256: parsed.append_sha256,
    path: terminalPath,
  };
}

function writeTerminalAppendV1(
  file: string,
  intent: IsolationIntentV1,
  after: FileStampV1,
) {
  const terminalPath = terminalAppendPathV1(
    file,
    intent.append_bytes,
    intent.append_sha256,
  );
  const body = Buffer.from(
    JSON.stringify({
      marker: VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_V1,
      version: 1,
      before: intent.before,
      after,
      append_bytes: intent.append_bytes,
      append_sha256: intent.append_sha256,
    }) + "\n",
    "utf8",
  );
  if (body.length > VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_MAX_BYTES_V1) {
    throw new Error(`VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_SIZE file=${file}`);
  }
  const tmp = uniqueRuntimeSiblingV1(file, "append-terminal-tmp");
  let fd: number | null = null;
  let published = false;
  try {
    fd = fs.openSync(
      tmp,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        ((fs.constants as any).O_NOFOLLOW || 0),
      0o600,
    );
    let off = 0;
    while (off < body.length) {
      const n = fs.writeSync(fd, body, off, body.length - off, null);
      if (n <= 0) throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_SHORT_WRITE");
      off += n;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    try {
      fs.linkSync(tmp, terminalPath);
      published = true;
    } catch (err: any) {
      if (err?.code !== "EEXIST") throw err;
      const existing = readTerminalAppendV1(
        file,
        intent.append_bytes,
        intent.append_sha256,
      );
      if (!existing) throw err;
      published = true;
    }
    fsyncParentDirectoryV1(file);
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (err) {
        console.warn("VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_CLOSE_FAILED", err);
      }
    }
    try { fs.unlinkSync(tmp); } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
    if (!published && !fs.existsSync(terminalPath)) {
      // Intent remains authoritative if terminal publication did not complete.
    }
  }
}

function canonicalMatchesTerminalV1(file: string, terminal: TerminalAppendV1): boolean {
  let fd: number | null = null;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
    );
    const opened = fstatV1(fd);
    if (
      !sameObjectV1(opened, terminal.after) ||
      opened.size < terminal.before.size + terminal.append_bytes
    ) return false;
    const payload = readExactFdV1(
      fd,
      terminal.before.size,
      terminal.append_bytes,
    );
    return sha256V1(payload) === terminal.append_sha256;
  } catch (err) {
    console.warn("VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_VERIFY_FAILED", err);
    return false;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function lstatEntryV1(file: string): {
  stamp: FileStampV1;
  regular: boolean;
  symlink: boolean;
} | null {
  try {
    const st = fs.lstatSync(file, { bigint: true } as any);
    return {
      stamp: stampFromStatsV1(st),
      regular: st.isFile(),
      symlink: st.isSymbolicLink(),
    };
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

function ensureRecoveryPinV1(
  intent: IsolationIntentV1,
): { fd: number; stamp: FileStampV1 } {
  const openFlags =
    fs.constants.O_RDWR | ((fs.constants as any).O_NOFOLLOW || 0);

  const openAndValidate = (candidate: string) => {
    const listed = lstatEntryV1(candidate);
    if (!listed || !listed.regular || listed.symlink) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_GENERATION_NON_REGULAR file=${intent.path}`,
      );
    }
    const fd = fs.openSync(candidate, openFlags);
    try {
      const opened = fstatV1(fd);
      if (
        !sameStampV1(opened, listed.stamp) ||
        !sameObjectV1(opened, intent.before)
      ) {
        throw new Error(
          `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_GENERATION_MISMATCH file=${intent.path}`,
        );
      }
      return { fd, stamp: opened };
    } catch (err) {
      fs.closeSync(fd);
      throw err;
    }
  };

  if (lstatEntryV1(intent.pinned_path)) {
    return openAndValidate(intent.pinned_path);
  }

  const isolated = openAndValidate(intent.isolated_path);
  try {
    try {
      fs.linkSync(intent.isolated_path, intent.pinned_path);
      fsyncParentDirectoryV1(intent.path);
    } catch (err: any) {
      if (err?.code !== "EEXIST") throw err;
    }
    const pin = lstatEntryV1(intent.pinned_path);
    if (
      !pin || !pin.regular || pin.symlink ||
      !sameObjectV1(pin.stamp, fstatV1(isolated.fd))
    ) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_PIN_MISMATCH file=${intent.path}`,
      );
    }
    return isolated;
  } catch (err) {
    fs.closeSync(isolated.fd);
    throw err;
  }
}

function ensureWriterPinV1(
  file: string,
  sourcePath: string,
  pinnedPath: string,
  fd: number,
) {
  const opened = fstatV1(fd);
  try {
    fs.linkSync(sourcePath, pinnedPath);
    fsyncParentDirectoryV1(file);
  } catch (err: any) {
    if (err?.code !== "EEXIST") throw err;
  }
  const pin = lstatEntryV1(pinnedPath);
  if (!pin || !pin.regular || pin.symlink || !sameObjectV1(pin.stamp, opened)) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_PIN_MISMATCH file=${file}`,
    );
  }
}

function readExactFdV1(fd: number, start: number, length: number): Buffer {
  const out = Buffer.alloc(length);
  let off = 0;
  while (off < length) {
    const n = fs.readSync(fd, out, off, length - off, start + off);
    if (n <= 0) break;
    off += n;
  }
  if (off !== length) {
    throw new Error("VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_SHORT_READ");
  }
  return out;
}

function sha256V1(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function classifyRecoveryGenerationV1(
  intent: IsolationIntentV1,
  fd: number,
): "absent" | "committed" {
  let current = fstatV1(fd);
  if (!sameObjectV1(current, intent.before) || current.size < intent.before.size) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_GENERATION_MISMATCH file=${intent.path}`,
    );
  }
  const expectedSize = intent.before.size + intent.append_bytes;
  const commitEvidence = classifyAppendCommitEvidenceV1(intent);
  const requireDefinitelyAbsentCommitV1 = () => {
    if (commitEvidence !== "absent") {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_AMBIGUOUS file=${intent.path}`,
      );
    }
  };
  if (current.size === intent.before.size) {
    requireDefinitelyAbsentCommitV1();
    return "absent";
  }
  if (current.size > intent.before.size && current.size < expectedSize) {
    requireDefinitelyAbsentCommitV1();
    fs.ftruncateSync(fd, intent.before.size);
    fs.fdatasyncSync(fd);
    current = fstatV1(fd);
    if (current.size !== intent.before.size) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_ROLLBACK_FAILED file=${intent.path}`,
      );
    }
    return "absent";
  }
  if (current.size !== expectedSize) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_SUFFIX_SIZE file=${intent.path}`,
    );
  }
  const suffix = readExactFdV1(fd, intent.before.size, intent.append_bytes);
  if (sha256V1(suffix) !== intent.append_sha256) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_SUFFIX_DIGEST file=${intent.path}`,
    );
  }
  if (commitEvidence === "ambiguous") {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_APPEND_COMMIT_AMBIGUOUS file=${intent.path}`,
    );
  }
  if (commitEvidence === "absent") {
    fs.ftruncateSync(fd, intent.before.size);
    fs.fdatasyncSync(fd);
    return "absent";
  }
  return "committed";
}

function cleanupOriginalIsolationEntryV1(
  file: string,
  intent: IsolationIntentV1,
  authoritative: FileStampV1,
) {
  const entry = lstatEntryV1(intent.isolated_path);
  if (!entry) return;
  if (entry.regular && !entry.symlink && sameObjectV1(entry.stamp, authoritative)) {
    fs.unlinkSync(intent.isolated_path);
    fsyncParentDirectoryV1(file);
    return;
  }
  const quarantine = uniqueRuntimeSiblingV1(file, "recovery-path-quarantine");
  fs.renameSync(intent.isolated_path, quarantine);
  fsyncParentDirectoryV1(file);
}

function publishPinnedGenerationV1(
  file: string,
  intent: IsolationIntentV1,
  fd: number,
): FileStampV1 {
  const key = fileKeyV1(file);
  const opened = fstatV1(fd);
  const pin = lstatEntryV1(intent.pinned_path);
  if (!pin || !pin.regular || pin.symlink || !sameObjectV1(pin.stamp, opened)) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_PIN_MISMATCH file=${file}`,
    );
  }

  const canonicalEntry = lstatEntryV1(key);
  let canonicalAlreadyAuthoritative = false;
  if (canonicalEntry) {
    canonicalAlreadyAuthoritative =
      canonicalEntry.regular &&
      !canonicalEntry.symlink &&
      sameObjectV1(canonicalEntry.stamp, opened);
    if (!canonicalAlreadyAuthoritative) {
      const quarantine = uniqueRuntimeSiblingV1(key, "noncanonical-quarantine");
      fs.renameSync(key, quarantine);
      fsyncParentDirectoryV1(key);
    }
  }

  if (!canonicalAlreadyAuthoritative) {
    fs.renameSync(intent.pinned_path, key);
    fsyncParentDirectoryV1(key);
  } else {
    try {
      fs.unlinkSync(intent.pinned_path);
      fsyncParentDirectoryV1(key);
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }
  }

  const canonicalFd = fs.openSync(
    key,
    fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0),
  );
  let canonical: FileStampV1;
  try {
    canonical = fstatV1(canonicalFd);
    if (!sameObjectV1(canonical, opened) || canonical.size !== opened.size) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_CANONICAL_IDENTITY file=${file}`,
      );
    }
  } finally {
    fs.closeSync(canonicalFd);
  }

  cleanupOriginalIsolationEntryV1(key, intent, canonical);
  return canonical;
}

function recoverCanonicalAppendIsolationUnderLockV1(
  file: string,
  hooks?: AppendWriterTestHooksV1,
): RecoveryOutcomeV1 {
  const key = fileKeyV1(file);
  const intent = readIsolationIntentV1(key);
  if (!intent) return { kind: "none", intent: null, after: null };

  canonicalWriterStatesV1.delete(key);
  appendWitnessesV1.delete(key);

  const pinEntry = lstatEntryV1(intent.pinned_path);
  const isolatedEntry = lstatEntryV1(intent.isolated_path);
  if (pinEntry || isolatedEntry) {
    const pinned = ensureRecoveryPinV1(intent);
    try {
      const kind = classifyRecoveryGenerationV1(intent, pinned.fd);
      const pinnedStamp = fstatV1(pinned.fd);
      hooks?.afterRecoveryIsolatedValidated?.({
        file: key,
        isolated_path: intent.isolated_path,
        pinned_path: intent.pinned_path,
        before: intent.before,
      });
      const pinAfterHook = lstatEntryV1(intent.pinned_path);
      if (
        !pinAfterHook || !pinAfterHook.regular || pinAfterHook.symlink ||
        !sameObjectV1(pinAfterHook.stamp, pinnedStamp)
      ) {
        throw new Error(
          `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_PIN_CHANGED file=${file}`,
        );
      }
      const after = publishPinnedGenerationV1(key, intent, pinned.fd);
      if (kind === "absent") {
        clearIsolationIntentV1(key);
      }
      return { kind, intent, after };
    } finally {
      fs.closeSync(pinned.fd);
    }
  }

  const canonicalEntry = lstatEntryV1(key);
  if (!canonicalEntry || !canonicalEntry.regular || canonicalEntry.symlink) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_HISTORY_MISSING file=${file}`,
    );
  }
  const fd = fs.openSync(
    key,
    fs.constants.O_RDWR | ((fs.constants as any).O_NOFOLLOW || 0),
  );
  try {
    const opened = fstatV1(fd);
    if (!sameObjectV1(opened, intent.before)) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_RECOVERY_CANONICAL_MISMATCH file=${file}`,
      );
    }
    const kind = classifyRecoveryGenerationV1(intent, fd);
    const after = fstatV1(fd);
    if (kind === "absent") {
      clearIsolationIntentV1(key);
    }
    return { kind, intent, after };
  } finally {
    fs.closeSync(fd);
  }
}

function recoverCanonicalAppendIsolationV1(file: string): boolean {
  if (!hasIsolationIntentV1(file)) return false;
  const lock = acquireCanonicalAppendLockV1(file);
  try {
    const outcome = recoverCanonicalAppendIsolationUnderLockV1(file);
    if (outcome.kind === "committed" && outcome.intent && outcome.after) {
      try {
        writeTerminalAppendV1(file, outcome.intent, outcome.after);
        clearIsolationIntentV1(file);
      } catch (err) {
        recordBestEffortFailureV1("terminal_seal_deferred", err);
        // Keep the durable intent as the retry witness if terminal sealing fails.
      }
    }
    return outcome.kind !== "none";
  } finally {
    releaseCanonicalAppendLockV1(lock);
  }
}

function recordTooLargeV1(file: string, kind: string, bytes: number): never {
  throw new Error(
    `VOID_AGENT_PICK2_JSONL_RECORD_TOO_LARGE file=${file} kind=${kind} bytes=${bytes} max=${VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1}`,
  );
}

function unterminatedRecordV1(file: string, kind: string): never {
  throw new Error(
    `VOID_AGENT_PICK2_JSONL_UNTERMINATED_RECORD file=${file} kind=${kind}`,
  );
}

function tailScanWindowExceededV1(file: string, kind: string, bytes: number): never {
  throw new Error(
    `VOID_AGENT_PICK2_JSONL_TAIL_SCAN_WINDOW_EXCEEDED file=${file} kind=${kind} bytes=${bytes} max=${VOID_AGENT_PICK2_JSONL_MAX_TAIL_SCAN_BYTES_V1}`,
  );
}

function assertCanonicalRecordBytesV1(file: string, bytes: Buffer) {
  if (bytes.length === 0 || bytes[bytes.length - 1] !== 0x0a) {
    unterminatedRecordV1(file, "canonical_append");
  }
  if (bytes.length - 1 > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
    recordTooLargeV1(file, "canonical_append", bytes.length - 1);
  }
}

export function appendAgentPick2JsonlCanonicalV1(
  file: string,
  data: string | Buffer,
  opts: {
    durable?: boolean;
    mode?: number;
    testHooks?: AppendWriterTestHooksV1;
  } = {},
): { witnessed: boolean; before: FileStampV1; after: FileStampV1 } {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
  assertCanonicalRecordBytesV1(file, bytes);
  if (opts.durable === false) {
    throw new Error(`VOID_AGENT_PICK2_JSONL_DURABLE_APPEND_REQUIRED file=${file}`);
  }
  const appendSha256 = sha256V1(bytes);

  const key = fileKeyV1(file);
  const lock = acquireCanonicalAppendLockV1(file, opts.testHooks);
  let fd: number | null = null;
  let isolatedPath = "";
  let pinnedPath = "";
  let commitPath = "";
  let canonicalRestored = true;
  let trustedGeneration = false;
  let before = emptyStampV1();
  let writeBase = emptyStampV1();
  let payloadWritten = 0;
  let appendCommitted = false;
  let intentWritten = false;

  const retireIntentKnownCommitted = () => {
    try {
      clearIsolationIntentV1(file, opts.testHooks);
    } catch (err) {
      recordBestEffortFailureV1("committed_intent_retire_deferred", err);
      // The committed row remains terminal truth. Retaining the intent keeps a
      // restart/retry witness instead of reporting a false append failure.
    }
  };

  const restoreIsolated = (committed: boolean) => {
    if (!isolatedPath || canonicalRestored) return;
    if (fd === null) {
      throw new Error(`VOID_AGENT_PICK2_JSONL_ISOLATION_FD_MISSING file=${file}`);
    }
    if (!committed) {
      const current = fstatV1(fd);
      if (!sameObjectV1(current, before) || current.size < before.size) {
        throw new Error(
          `VOID_AGENT_PICK2_JSONL_ISOLATION_ROLLBACK_IDENTITY file=${file}`,
        );
      }
      if (current.size !== before.size) {
        fs.ftruncateSync(fd, before.size);
        fs.fdatasyncSync(fd);
      }
    }
    const intent = readIsolationIntentV1(file);
    if (!intent) {
      throw new Error(`VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_MISSING file=${file}`);
    }
    ensureWriterPinV1(file, isolatedPath, pinnedPath, fd);
    const canonicalConflict = lstatEntryV1(file);
    if (
      canonicalConflict &&
      (
        !canonicalConflict.regular ||
        canonicalConflict.symlink ||
        !sameObjectV1(canonicalConflict.stamp, fstatV1(fd))
      )
    ) {
      canonicalWriterStatesV1.delete(key);
      trustedGeneration = false;
    }
    // publishPinnedGenerationV1 performs noncanonical-quarantine before the
    // exact pinned generation is restored to the canonical pathname.
    publishPinnedGenerationV1(file, intent, fd);
    canonicalRestored = true;
    if (committed) {
      retireIntentKnownCommitted();
    } else {
      try { clearIsolationIntentV1(file); } catch (clearErr) {
        recordBestEffortFailureV1("absent_intent_retire", clearErr);
      }
    }
  };

  try {
    const recovered = recoverCanonicalAppendIsolationUnderLockV1(file, opts.testHooks);
    if (recovered.kind === "committed" && recovered.intent && recovered.after) {
      writeTerminalAppendV1(file, recovered.intent, recovered.after);
      const sameRetry =
        recovered.intent.append_bytes === bytes.length &&
        recovered.intent.append_sha256 === appendSha256;
      if (sameRetry) {
        retireIntentKnownCommitted();
        seedCanonicalWriterStateV1(file, recovered.after);
        return {
          witnessed: false,
          before: recovered.intent.before,
          after: recovered.after,
        };
      }
      clearIsolationIntentV1(file);
    }

    const terminal = readTerminalAppendV1(file, bytes.length, appendSha256);
    if (terminal) {
      if (!canonicalMatchesTerminalV1(file, terminal)) {
        throw new Error(
          `VOID_AGENT_PICK2_JSONL_APPEND_TERMINAL_CANONICAL_MISMATCH file=${file}`,
        );
      }
      seedCanonicalWriterStateV1(file, terminal.after);
      return {
        witnessed: false,
        before: terminal.before,
        after: terminal.after,
      };
    }

    const canonicalExistedBeforeOpen = !!lstatEntryV1(file);
    fd = fs.openSync(
      file,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_APPEND |
        ((fs.constants as any).O_NOFOLLOW || 0),
      opts.mode ?? 0o666,
    );
    if (!canonicalExistedBeforeOpen) {
      opts.testHooks?.beforeFirstCanonicalCreateDirectorySync?.({ file: key });
      fsyncParentDirectoryV1(file);
      opts.testHooks?.afterFirstCanonicalCreateDirectorySync?.({ file: key });
    }

    before = fstatV1(fd);
    const pathBefore = statV1(file);
    if (!pathBefore || !sameStampV1(before, pathBefore)) {
      canonicalWriterStatesV1.delete(key);
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_UNSTABLE_BEFORE_APPEND file=${file}`,
      );
    }

    const trusted = canonicalWriterStatesV1.get(key);
    trustedGeneration = !!trusted && sameStampV1(trusted.stamp, before);

    opts.testHooks?.afterTrustedBefore?.({
      file,
      before,
      trusted_generation: trustedGeneration,
    });

    const immediatelyBeforeIsolation = fstatV1(fd);
    const pathImmediatelyBeforeIsolation = statV1(file);
    if (
      !pathImmediatelyBeforeIsolation ||
      !sameStampV1(immediatelyBeforeIsolation, pathImmediatelyBeforeIsolation)
    ) {
      canonicalWriterStatesV1.delete(key);
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_UNSTABLE_BEFORE_ISOLATION file=${file}`,
      );
    }
    if (!sameStampV1(before, immediatelyBeforeIsolation)) {
      // A same-inode rewrite after the cached generation check is real current
      // history, but it invalidates the incremental witness. Rebase the crash
      // recovery boundary to the exact current generation without rereading it.
      trustedGeneration = false;
      canonicalWriterStatesV1.delete(key);
      before = immediatelyBeforeIsolation;
    }

    // Crash isolation is required even when no in-memory semantic generation is
    // trusted (for example the first canonical append after process restart).
    // `trustedGeneration` controls witness minting only, not durability.
    isolatedPath = uniqueRuntimeSiblingV1(file, "isolated");
    pinnedPath = uniqueRuntimeSiblingV1(file, "recovery-pin");
    commitPath = uniqueRuntimeSiblingV1(file, "append-commit");
    writeIsolationIntentV1(file, isolatedPath, pinnedPath, commitPath,
      immediatelyBeforeIsolation,
      bytes.length,
      appendSha256,
    );
    intentWritten = true;
    // Pin the exact validated inode before removing the canonical directory
    // entry. Recovery therefore retains an immutable authoritative link even
    // if another same-directory actor later swaps the isolated pathname.
    ensureWriterPinV1(file, file, pinnedPath, fd);
    fs.renameSync(file, isolatedPath);
    fsyncParentDirectoryV1(file);
    canonicalRestored = false;

    const isolatedFdStamp = fstatV1(fd);
    const isolatedPathStamp = statV1(isolatedPath);
    if (
      !isolatedPathStamp ||
      !sameObjectV1(isolatedFdStamp, isolatedPathStamp) ||
      !sameDataStampV1(immediatelyBeforeIsolation, isolatedFdStamp)
    ) {
      trustedGeneration = false;
      canonicalWriterStatesV1.delete(key);
    }

    const finalPrewriteFd = fstatV1(fd);
    const pinStamp = statV1(pinnedPath);
    if (!pinStamp || !sameObjectV1(finalPrewriteFd, pinStamp)) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_ISOLATION_PIN_CHANGED file=${file}`,
      );
    }

    opts.testHooks?.afterIsolatedTrusted?.({
      file,
      before,
      isolated_path: isolatedPath,
      pinned_path: pinnedPath,
      trusted_generation: trustedGeneration,
    });

    writeBase = fstatV1(fd);
    let off = 0;
    while (off < bytes.length) {
      const requestedChunk = Number(opts.testHooks?.payloadWriteChunkBytes || 0);
      const cap = requestedChunk > 0
        ? Math.min(bytes.length - off, Math.max(1, Math.floor(requestedChunk)))
        : bytes.length - off;
      const n = fs.writeSync(fd, bytes, off, cap, null);
      if (n <= 0) throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_SHORT_WRITE");
      off += n;
      payloadWritten = off;
      opts.testHooks?.afterPayloadWriteProgress?.({
        file,
        bytes_written: off,
        bytes_total: bytes.length,
      });
    }
    opts.testHooks?.afterPayloadBeforeFdatasync?.({
      file,
      bytes_total: bytes.length,
    });
    fs.fdatasyncSync(fd);
    const durableIntent = readIsolationIntentV1(file);
    if (!durableIntent || durableIntent.commit_path !== commitPath) {
      throw new Error(`VOID_AGENT_PICK2_JSONL_ISOLATION_INTENT_CHANGED file=${file}`);
    }
    writeAppendCommitV1(durableIntent);
    appendCommitted = true;

    if (isolatedPath) {
      opts.testHooks?.afterAppendBeforeRestore?.({
        file,
        before,
        isolated_path: isolatedPath,
        pinned_path: pinnedPath,
        trusted_generation: trustedGeneration,
      });
      restoreIsolated(true);
    }

    const after = fstatV1(fd);
    const pathAfter = statV1(file);
    const stableAfter =
      sameObjectV1(writeBase, after) &&
      after.size === writeBase.size + bytes.length &&
      !!pathAfter &&
      sameStampV1(after, pathAfter);

    if (stableAfter) {
      seedCanonicalWriterStateV1(file, after);
    } else {
      canonicalWriterStatesV1.delete(key);
      trustedGeneration = false;
    }

    const witnessed = trustedGeneration && stableAfter;
    if (witnessed) {
      recordAppendWitnessV1(
        file,
        before,
        after,
        bytes.length === 0 || bytes[bytes.length - 1] === 0x0a,
      );
    }

    return { witnessed, before, after };
  } finally {
    try {
      if (isolatedPath && !canonicalRestored) {
        restoreIsolated(appendCommitted);
      } else if (
        fd !== null &&
        !isolatedPath &&
        !appendCommitted &&
        payloadWritten > 0
      ) {
        const current = fstatV1(fd);
        const pathCurrent = statV1(file);
        if (
          sameObjectV1(current, writeBase) &&
          pathCurrent && sameObjectV1(pathCurrent, current) &&
          current.size >= writeBase.size
        ) {
          fs.ftruncateSync(fd, writeBase.size);
          fs.fdatasyncSync(fd);
        }
      } else if (intentWritten && canonicalRestored && !appendCommitted) {
        try { clearIsolationIntentV1(file); } catch (clearErr) {
          recordBestEffortFailureV1("failed_append_intent_retire", clearErr);
        }
      }
    } finally {
      if (fd !== null) fs.closeSync(fd);
      releaseCanonicalAppendLockV1(lock, opts.testHooks);
    }
  }
}
function parseEntryV1(raw: string): JsonlEntryV1 {
  const line = String(raw || "").replace(/\r$/, "");
  if (!line.trim()) return { raw: line, parsed: null };
  try {
    return { raw: line, parsed: JSON.parse(line) };
  } catch (_err) {
    return { raw: line, parsed: null };
  }
}

function rowIdV1(x: any): string {
  return String(x?.job_id || x?.id || "").trim();
}

function rowTsV1(x: any): number {
  const n = Number(
    x?.ts_ms ??
    x?.created_at_ms ??
    x?.started_at_ms ??
    x?.ts ??
    0,
  );
  return Number.isFinite(n) ? n : 0;
}

function rowIsRunnableV1(x: any): boolean {
  const st = String(x?.status || "").trim().toLowerCase();
  if (!st) return true;
  return st === "queued" || st === "ready" || st === "pending";
}

function isCompletedTruthV1(x: any): boolean {
  const st = String(x?.status || "").trim().toLowerCase();
  return st === "completed" || st === "ok" || st === "done";
}

function cloneMetricsV1(metrics: IoMetricsV1): IoMetricsV1 {
  return JSON.parse(JSON.stringify(metrics));
}

export class AgentPick2JsonlSemanticIndexV1 {
  private readonly chunkBytes: number;
  private readonly testHooks: TestHooksV1;
  private readonly maxSyncCompletionRebuildBytes: number;
  private readonly completionRebuildBackoffMs: number;
  private readonly completionRebuildHoldUntil = new Map<string, number>();
  private readonly completionWarmTasks = new Map<string, Promise<void>>();
  private readonly completions = new Map<string, CompletionStateV1>();
  private readonly tails = new Map<string, TailStateV1>();
  private readonly heads = new Map<string, HeadStateV1>();
  private readonly metrics: IoMetricsV1 = {
    bytes_read_total: 0,
    sync_bytes_read_total: 0,
    async_bytes_read_total: 0,
    rebuilds_total: 0,
    incremental_reads_total: 0,
    cache_hits_total: 0,
    coherent_scan_retries_total: 0,
    append_witness_misses_total: 0,
    by_kind: Object.create(null),
  };

  constructor(opts: {
    chunkBytes?: number;
    testHooks?: TestHooksV1;
    maxSyncCompletionRebuildBytes?: number;
    completionRebuildBackoffMs?: number;
  } = {}) {
    const requested = Number(opts.chunkBytes || 64 * 1024);
    this.chunkBytes = Number.isFinite(requested)
      ? Math.max(4096, Math.min(1024 * 1024, Math.floor(requested)))
      : 64 * 1024;
    const requestedCompletionBudget = Number(
      opts.maxSyncCompletionRebuildBytes ??
        VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1,
    );
    this.maxSyncCompletionRebuildBytes =
      Number.isFinite(requestedCompletionBudget)
        ? Math.max(4096, Math.floor(requestedCompletionBudget))
        : VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1;
    const requestedBackoff = Number(
      opts.completionRebuildBackoffMs ??
        VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF_MS_V1,
    );
    this.completionRebuildBackoffMs = Number.isFinite(requestedBackoff)
      ? Math.max(1, Math.floor(requestedBackoff))
      : VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF_MS_V1;
    this.testHooks = opts.testHooks || {};
  }

  private metricKind(kind: string) {
    return (
      this.metrics.by_kind[kind] ||
      (this.metrics.by_kind[kind] = {
        bytes_read: 0,
        rebuilds: 0,
        incremental_reads: 0,
        cache_hits: 0,
      })
    );
  }

  private noteBytes(kind: string, bytes: number) {
    const n = Math.max(0, Number(bytes) || 0);
    this.metrics.bytes_read_total += n;
    this.metrics.sync_bytes_read_total += n;
    this.metricKind(kind).bytes_read += n;
  }

  private noteAsyncBytes(kind: string, bytes: number) {
    const n = Math.max(0, Number(bytes) || 0);
    this.metrics.bytes_read_total += n;
    this.metrics.async_bytes_read_total += n;
    this.metricKind(kind).bytes_read += n;
  }

  private noteRebuild(kind: string) {
    this.metrics.rebuilds_total += 1;
    this.metricKind(kind).rebuilds += 1;
  }

  private noteIncremental(kind: string) {
    this.metrics.incremental_reads_total += 1;
    this.metricKind(kind).incremental_reads += 1;
  }

  private noteHit(kind: string) {
    this.metrics.cache_hits_total += 1;
    this.metricKind(kind).cache_hits += 1;
  }

  private readRangeFd(
    fd: number,
    file: string,
    start: number,
    length: number,
    kind: string,
    chunkIndex: number,
  ): Buffer {
    if (length <= 0) return Buffer.alloc(0);
    const out = Buffer.allocUnsafe(length);
    let done = 0;
    while (done < length) {
      const n = fs.readSync(fd, out, done, length - done, start + done);
      if (n <= 0) break;
      done += n;
    }
    this.noteBytes(kind, done);
    if (this.testHooks.afterReadChunk) {
      this.testHooks.afterReadChunk({
        file,
        kind,
        start,
        bytes: done,
        chunkIndex,
      });
    }
    return done === length ? out : out.subarray(0, done);
  }

  private stableRead<T>(
    file: string,
    kind: string,
    reader: (fd: number, stamp: FileStampV1) => T,
    maxAttempts = 4,
  ): { stamp: FileStampV1; value: T } | null {
    recoverCanonicalAppendIsolationV1(file);

    const openFlags =
      fs.constants.O_RDONLY |
      ((fs.constants as any).O_NOFOLLOW || 0);
    const attempts = Math.max(
      1,
      Math.min(4, Math.floor(Number(maxAttempts) || 1)),
    );

    for (let attempt = 0; attempt < attempts; attempt++) {
      let fd: number | null = null;
      try {
        try {
          fd = fs.openSync(file, openFlags);
        } catch (err: any) {
          if (err?.code === "ENOENT") {
            if (hasIsolationIntentV1(file)) {
              recoverCanonicalAppendIsolationV1(file);
              this.metrics.coherent_scan_retries_total += 1;
              continue;
            }
            if (!statV1(file)) return null;
            this.metrics.coherent_scan_retries_total += 1;
            continue;
          }
          throw err;
        }

        const before = fstatV1(fd);
        const value = reader(fd, before);
        const after = fstatV1(fd);
        const pathAfter = statV1(file);

        if (
          sameStampV1(before, after) &&
          pathAfter &&
          sameStampV1(after, pathAfter)
        ) {
          seedCanonicalWriterStateV1(file, after);
          return { stamp: after, value };
        }

        this.metrics.coherent_scan_retries_total += 1;
      } finally {
        if (fd !== null) fs.closeSync(fd);
      }
    }

    throw new Error(
      `VOID_AGENT_PICK2_JSONL_UNSTABLE_SCAN file=${file} kind=${kind}`,
    );
  }

  private scanRangeLinesFd(
    fd: number,
    file: string,
    start: number,
    endExclusive: number,
    kind: string,
    onLine: (entry: JsonlEntryV1) => void,
  ): boolean {
    let pos = Math.max(0, start);
    const end = Math.max(pos, endExclusive);
    let carry = Buffer.alloc(0);
    let chunkIndex = 0;

    while (pos < end) {
      const want = Math.min(this.chunkBytes, end - pos);
      const chunk = this.readRangeFd(
        fd,
        file,
        pos,
        want,
        kind,
        chunkIndex++,
      );
      if (!chunk.length) break;
      pos += chunk.length;

      const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      let from = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0x0a) continue;
        const lineBytes = i - from;
        if (lineBytes > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
          recordTooLargeV1(file, kind, lineBytes);
        }
        if (lineBytes > 0) {
          const raw = data.subarray(from, i).toString("utf8");
          if (raw.trim()) onLine(parseEntryV1(raw));
        }
        from = i + 1;
      }
      carry = data.subarray(from);
      if (carry.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
        recordTooLargeV1(file, kind, carry.length);
      }
    }

    if (carry.length) unterminatedRecordV1(file, kind);
    return true;
  }

  private completionWarmKey(file: string): string {
    return fileKeyV1(file);
  }

  private completionWarmInProgress(file: string): boolean {
    return this.completionWarmTasks.has(this.completionWarmKey(file));
  }

  private startCompletionWarm(file: string): Promise<void> {
    const key = this.completionWarmKey(file);
    const existing = this.completionWarmTasks.get(key);
    if (existing) return existing;

    const task = (async () => {
      const kind = "completion_async_warm";
      const flags =
        fs.constants.O_RDONLY |
        ((fs.constants as any).O_NOFOLLOW || 0);
      let handle: any = null;
      this.noteRebuild(kind);
      try {
        try {
          handle = await fsp.open(file, flags);
        } catch (err: any) {
          if (err?.code === "ENOENT") {
            this.completions.set(file, {
              ...emptyStampV1(),
              initialized: true,
              completed: new Set<string>(),
              endedWithNewline: true,
            });
            this.completionRebuildHoldUntil.delete(file);
            return;
          }
          throw err;
        }

        const before = stampFromStatsV1(
          await handle.stat({ bigint: true } as any),
        );
        const pathBefore = statV1(file);
        if (!pathBefore || !sameStampV1(before, pathBefore)) {
          throw new Error(
            `VOID_AGENT_PICK2_JSONL_ASYNC_WARM_UNSTABLE file=${file}`,
          );
        }

        const completed = new Set<string>();
        const buf = Buffer.allocUnsafe(this.chunkBytes);
        let position = 0;
        let carry = Buffer.alloc(0);

        while (position < before.size) {
          const want = Math.min(buf.length, before.size - position);
          const result = await handle.read(buf, 0, want, position);
          const bytesRead = Number(result?.bytesRead || 0);
          if (bytesRead <= 0) {
            throw new Error(
              `VOID_AGENT_PICK2_JSONL_ASYNC_WARM_SHORT_READ file=${file} position=${position}`,
            );
          }
          position += bytesRead;
          this.noteAsyncBytes(kind, bytesRead);
          const chunk = Buffer.from(buf.subarray(0, bytesRead));
          const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
          let from = 0;
          for (let i = 0; i < data.length; i++) {
            if (data[i] !== 0x0a) continue;
            const lineBytes = i - from;
            if (lineBytes > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
              recordTooLargeV1(file, kind, lineBytes);
            }
            if (lineBytes > 0) {
              const raw = data.subarray(from, i).toString("utf8");
              const entry = parseEntryV1(raw);
              const x = entry.parsed;
              if (x && isCompletedTruthV1(x)) {
                const id = rowIdV1(x);
                if (id) completed.add(id);
              }
            }
            from = i + 1;
          }
          carry = Buffer.from(data.subarray(from));
          if (carry.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
            recordTooLargeV1(file, kind, carry.length);
          }
        }

        if (carry.length) unterminatedRecordV1(file, kind);

        const after = stampFromStatsV1(
          await handle.stat({ bigint: true } as any),
        );
        const pathAfter = statV1(file);
        if (
          !sameStampV1(before, after) ||
          !pathAfter ||
          !sameStampV1(after, pathAfter)
        ) {
          throw new Error(
            `VOID_AGENT_PICK2_JSONL_ASYNC_WARM_UNSTABLE file=${file}`,
          );
        }

        this.completions.set(file, {
          ...after,
          initialized: true,
          completed,
          endedWithNewline: true,
        });
        seedCanonicalWriterStateV1(file, after);
        this.completionRebuildHoldUntil.delete(file);
      } catch (err) {
        this.completionRebuildHoldUntil.set(
          file,
          Date.now() + this.completionRebuildBackoffMs,
        );
        throw err;
      } finally {
        if (handle) await handle.close();
      }
    })();

    this.completionWarmTasks.set(key, task);
    task.then(
      () => {
        if (this.completionWarmTasks.get(key) === task) {
          this.completionWarmTasks.delete(key);
        }
      },
      () => {
        if (this.completionWarmTasks.get(key) === task) {
          this.completionWarmTasks.delete(key);
        }
      },
    );
    void task.catch(() => undefined);
    return task;
  }

  async waitForCompletionWarmForProofV1(file: string): Promise<void> {
    const task = this.completionWarmTasks.get(this.completionWarmKey(file));
    if (task) await task;
  }

  private rebuildCompletion(file: string) {
    const kind = "completion_full";
    const observed = statV1(file);
    if (observed && observed.size > this.maxSyncCompletionRebuildBytes) {
      if (this.completionWarmInProgress(file)) {
        throw new Error(
          `VOID_AGENT_PICK2_JSONL_COMPLETION_WARMING_HOLD file=${file} bytes=${observed.size}`,
        );
      }
      const now = Date.now();
      const holdUntil = Number(this.completionRebuildHoldUntil.get(file) || 0);
      if (holdUntil > now) {
        throw new Error(
          `VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF file=${file} ` +
            `bytes=${observed.size} until_ms=${holdUntil}`,
        );
      }
      this.startCompletionWarm(file);
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_COMPLETION_WARMING_HOLD file=${file} ` +
          `bytes=${observed.size} sync_budget=${this.maxSyncCompletionRebuildBytes}`,
      );
    }

    this.noteRebuild(kind);
    const stable = this.stableRead(file, kind, (fd, stamp) => {
      const completed = new Set<string>();
      const endedWithNewline = this.scanRangeLinesFd(
        fd,
        file,
        0,
        stamp.size,
        kind,
        (entry) => {
          const x = entry.parsed;
          if (!x || !isCompletedTruthV1(x)) return;
          const id = rowIdV1(x);
          if (id) completed.add(id);
        },
      );
      return { completed, endedWithNewline };
    });

    if (!stable) {
      const state: CompletionStateV1 = {
        ...emptyStampV1(),
        initialized: true,
        completed: new Set<string>(),
        endedWithNewline: true,
      };
      this.completions.set(file, state);
      return state;
    }

    const state: CompletionStateV1 = {
      ...stable.stamp,
      initialized: true,
      completed: stable.value.completed,
      endedWithNewline: stable.value.endedWithNewline,
    };
    this.completions.set(file, state);
    return state;
  }

  private completionState(file: string): CompletionStateV1 {
    const current = statV1(file);
    const prior = this.completions.get(file);
    if (!prior?.initialized) return this.rebuildCompletion(file);

    if (!current) {
      if (prior.size === 0 && prior.dev === "-1" && !hasIsolationIntentV1(file)) {
        this.noteHit("completion_full");
        return prior;
      }
      return this.rebuildCompletion(file);
    }

    if (sameStampV1(prior, current)) {
      this.noteHit("completion_full");
      return prior;
    }

    const chain =
      prior.endedWithNewline &&
      appendWitnessChainV1(file, prior, current);

    if (chain && chain.ok && current.size > prior.size) {
      this.noteIncremental("completion_append");
      const stable = this.stableRead(file, "completion_append", (fd, opened) => {
        const openedChain = appendWitnessChainV1(file, prior, opened);
        if (!openedChain.ok) {
          throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_WITNESS_DRIFT");
        }
        const additions = new Set<string>();
        const endedWithNewline = this.scanRangeLinesFd(
          fd,
          file,
          prior.size,
          opened.size,
          "completion_append",
          (entry) => {
            const x = entry.parsed;
            if (!x || !isCompletedTruthV1(x)) return;
            const id = rowIdV1(x);
            if (id) additions.add(id);
          },
        );
        return { additions, endedWithNewline };
      });

      if (!stable) return this.rebuildCompletion(file);
      for (const id of stable.value.additions) prior.completed.add(id);
      Object.assign(prior, stable.stamp, {
        endedWithNewline: stable.value.endedWithNewline,
      });
      return prior;
    }

    if (current.size > prior.size && sameObjectV1(prior, current)) {
      this.metrics.append_witness_misses_total += 1;
      if (current.size > this.maxSyncCompletionRebuildBytes) {
        if (this.completionWarmInProgress(file)) {
          throw new Error(
            `VOID_AGENT_PICK2_JSONL_COMPLETION_WARMING_HOLD file=${file} bytes=${current.size}`,
          );
        }
        const now = Date.now();
        const holdUntil = Number(
          this.completionRebuildHoldUntil.get(file) || 0,
        );
        if (holdUntil > now) {
          throw new Error(
            `VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF file=${file} ` +
              `bytes=${current.size} until_ms=${holdUntil}`,
          );
        }
        this.startCompletionWarm(file);
        throw new Error(
          `VOID_AGENT_PICK2_JSONL_UNWITNESSED_COMPLETION_GROWTH_HOLD ` +
            `file=${file} prior_bytes=${prior.size} current_bytes=${current.size} ` +
            `async_warm_started=true`,
        );
      }
    }
    return this.rebuildCompletion(file);
  }

  private rebuildTail(
    file: string,
    maxRaw: number,
    maxValid: number,
  ): TailStateV1 {
    const kind = "tail_rebuild";
    this.noteRebuild(kind);

    const stable = this.stableRead(file, kind, (fd, stamp) => {
      if (stamp.size === 0) {
        return {
          rawTail: [] as JsonlEntryV1[],
          validTail: [] as any[],
          endedWithNewline: true,
        };
      }

      const last = this.readRangeFd(
        fd,
        file,
        stamp.size - 1,
        1,
        kind,
        0,
      );
      if (last.length !== 1 || last[0] !== 0x0a) {
        unterminatedRecordV1(file, kind);
      }

      let pos = stamp.size;
      let suffix = Buffer.alloc(0);
      const reverseEntries: JsonlEntryV1[] = [];
      let validCount = 0;
      let bytesScanned = 0;
      let chunkIndex = 1;
      const requiredValid = Math.min(maxValid, maxRaw);
      const enough = () =>
        reverseEntries.length >= maxRaw && validCount >= requiredValid;

      while (pos > 0 && !enough()) {
        const budget = VOID_AGENT_PICK2_JSONL_MAX_TAIL_SCAN_BYTES_V1 - bytesScanned;
        if (budget <= 0) {
          tailScanWindowExceededV1(file, kind, bytesScanned);
        }
        const want = Math.min(this.chunkBytes, pos, budget);
        const nextStart = pos - want;
        const chunk = this.readRangeFd(
          fd,
          file,
          nextStart,
          want,
          kind,
          chunkIndex++,
        );
        bytesScanned += chunk.length;
        const data = suffix.length ? Buffer.concat([chunk, suffix]) : chunk;
        let end = data.length;

        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i] !== 0x0a) continue;
          const lineStart = i + 1;
          const lineBytes = end - lineStart;
          if (lineBytes > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
            recordTooLargeV1(file, kind, lineBytes);
          }
          if (lineBytes > 0) {
            const raw = data.subarray(lineStart, end).toString("utf8");
            if (raw.trim()) {
              const entry = parseEntryV1(raw);
              reverseEntries.push(entry);
              if (entry.parsed) validCount += 1;
              if (enough()) break;
            }
          }
          end = i;
        }

        suffix = data.subarray(0, end);
        if (suffix.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
          recordTooLargeV1(file, kind, suffix.length);
        }
        pos = nextStart;
      }

      if (pos === 0 && suffix.length && !enough()) {
        if (suffix.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
          recordTooLargeV1(file, kind, suffix.length);
        }
        const raw = suffix.toString("utf8");
        if (raw.trim()) {
          const entry = parseEntryV1(raw);
          reverseEntries.push(entry);
          if (entry.parsed) validCount += 1;
        }
      }

      if (!enough() && pos > 0) {
        tailScanWindowExceededV1(file, kind, bytesScanned);
      }

      const entries = reverseEntries.reverse();
      const rawTail = entries.slice(-maxRaw);
      const validTail = maxValid > 0
        ? entries
            .map((entry) => entry.parsed)
            .filter(Boolean)
            .slice(-maxValid)
        : [];

      return { rawTail, validTail, endedWithNewline: true };
    });

    if (!stable) {
      const state: TailStateV1 = {
        ...emptyStampV1(),
        initialized: true,
        maxRaw,
        maxValid,
        rawTail: [],
        validTail: [],
        endedWithNewline: true,
      };
      this.tails.set(file, state);
      return state;
    }

    const state: TailStateV1 = {
      ...stable.stamp,
      initialized: true,
      maxRaw,
      maxValid,
      rawTail: stable.value.rawTail,
      validTail: stable.value.validTail,
      endedWithNewline: stable.value.endedWithNewline,
    };
    this.tails.set(file, state);
    return state;
  }

  private tailState(
    file: string,
    maxRaw: number,
    maxValid: number,
  ): TailStateV1 {
    const current = statV1(file);
    const prior = this.tails.get(file);
    if (
      !prior?.initialized ||
      prior.maxRaw !== maxRaw ||
      prior.maxValid !== maxValid
    ) {
      return this.rebuildTail(file, maxRaw, maxValid);
    }

    if (!current) {
      if (prior.size === 0 && prior.dev === "-1" && !hasIsolationIntentV1(file)) {
        this.noteHit("tail_rebuild");
        return prior;
      }
      return this.rebuildTail(file, maxRaw, maxValid);
    }

    if (sameStampV1(prior, current)) {
      this.noteHit("tail_rebuild");
      return prior;
    }

    const chain =
      prior.endedWithNewline &&
      appendWitnessChainV1(file, prior, current);

    if (chain && chain.ok && current.size > prior.size) {
      this.noteIncremental("tail_append");
      const stable = this.stableRead(file, "tail_append", (fd, opened) => {
        const openedChain = appendWitnessChainV1(file, prior, opened);
        if (!openedChain.ok) {
          throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_WITNESS_DRIFT");
        }
        const appended: JsonlEntryV1[] = [];
        const endedWithNewline = this.scanRangeLinesFd(
          fd,
          file,
          prior.size,
          opened.size,
          "tail_append",
          (entry) => appended.push(entry),
        );
        return { appended, endedWithNewline };
      });

      if (!stable) return this.rebuildTail(file, maxRaw, maxValid);
      for (const entry of stable.value.appended) {
        prior.rawTail.push(entry);
        if (maxValid > 0 && entry.parsed) prior.validTail.push(entry.parsed);
      }
      if (prior.rawTail.length > maxRaw) {
        prior.rawTail = prior.rawTail.slice(-maxRaw);
      }
      if (maxValid > 0 && prior.validTail.length > maxValid) {
        prior.validTail = prior.validTail.slice(-maxValid);
      } else if (maxValid === 0) {
        prior.validTail = [];
      }
      Object.assign(prior, stable.stamp, {
        endedWithNewline: stable.value.endedWithNewline,
      });
      return prior;
    }

    if (current.size > prior.size && sameObjectV1(prior, current)) {
      this.metrics.append_witness_misses_total += 1;
    }
    return this.rebuildTail(file, maxRaw, maxValid);
  }

  private rebuildHead(
    file: string,
    maxRaw: number,
  ): HeadStateV1 {
    const kind = "jobs_head_rebuild";
    this.noteRebuild(kind);

    const stable = this.stableRead(file, kind, (fd, stamp) => {
      const entries: JsonlEntryV1[] = [];
      let pos = 0;
      let carry = Buffer.alloc(0);
      let chunkIndex = 0;

      if (stamp.size > 0) {
        const last = this.readRangeFd(
          fd,
          file,
          stamp.size - 1,
          1,
          kind,
          chunkIndex++,
        );
        if (last.length !== 1 || last[0] !== 0x0a) {
          unterminatedRecordV1(file, kind);
        }
      }

      outer: while (pos < stamp.size && entries.length < maxRaw) {
        const want = Math.min(this.chunkBytes, stamp.size - pos);
        const chunk = this.readRangeFd(
          fd,
          file,
          pos,
          want,
          kind,
          chunkIndex++,
        );
        if (!chunk.length) break;
        pos += chunk.length;
        const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
        let from = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i] !== 0x0a) continue;
          const lineBytes = i - from;
          if (lineBytes > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
            recordTooLargeV1(file, kind, lineBytes);
          }
          if (lineBytes > 0) {
            const raw = data.subarray(from, i).toString("utf8");
            if (raw.trim()) entries.push(parseEntryV1(raw));
          }
          from = i + 1;
          if (entries.length >= maxRaw) {
            carry = Buffer.alloc(0);
            break outer;
          }
        }
        carry = data.subarray(from);
        if (carry.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
          recordTooLargeV1(file, kind, carry.length);
        }
      }

      if (entries.length < maxRaw && pos >= stamp.size && carry.length) {
        unterminatedRecordV1(file, kind);
      }

      return { entries, endedWithNewline: true };
    });

    if (!stable) {
      const state: HeadStateV1 = {
        ...emptyStampV1(),
        initialized: true,
        maxRaw,
        entries: [],
        capped: false,
        endedWithNewline: true,
        latestById: new Map(),
        latestRunnableById: new Map(),
      };
      this.heads.set(file, state);
      return state;
    }

    const latestById = new Map<string, any>();
    const latestRunnableById = new Map<string, any>();
    for (const entry of stable.value.entries.slice(0, maxRaw)) {
      const x = entry.parsed;
      if (!x) continue;
      const id = rowIdV1(x);
      if (!id) continue;
      const prev = latestById.get(id);
      if (!prev || rowTsV1(x) >= rowTsV1(prev)) latestById.set(id, x);
      if (rowIsRunnableV1(x)) {
        const prevRun = latestRunnableById.get(id);
        if (!prevRun || rowTsV1(x) >= rowTsV1(prevRun)) {
          latestRunnableById.set(id, x);
        }
      }
    }

    const state: HeadStateV1 = {
      ...stable.stamp,
      initialized: true,
      maxRaw,
      entries: stable.value.entries.slice(0, maxRaw),
      capped: stable.value.entries.length >= maxRaw,
      endedWithNewline: stable.value.endedWithNewline,
      latestById,
      latestRunnableById,
    };
    this.heads.set(file, state);
    return state;
  }

  private headState(file: string, maxRaw: number): HeadStateV1 {
    const current = statV1(file);
    const prior = this.heads.get(file);
    if (!prior?.initialized || prior.maxRaw !== maxRaw) {
      return this.rebuildHead(file, maxRaw);
    }

    if (!current) {
      if (prior.size === 0 && prior.dev === "-1" && !hasIsolationIntentV1(file)) {
        this.noteHit("jobs_head_rebuild");
        return prior;
      }
      return this.rebuildHead(file, maxRaw);
    }

    if (sameStampV1(prior, current)) {
      this.noteHit("jobs_head_rebuild");
      return prior;
    }

    const chain =
      prior.endedWithNewline &&
      appendWitnessChainV1(file, prior, current);

    if (chain && chain.ok && current.size > prior.size && prior.capped) {
      this.noteHit("jobs_head_rebuild");
      Object.assign(prior, current, {
        endedWithNewline: chain.endedWithNewline,
      });
      return prior;
    }

    if (chain && chain.ok && current.size > prior.size && !prior.capped) {
      this.noteIncremental("jobs_head_append");
      const stable = this.stableRead(file, "jobs_head_append", (fd, opened) => {
        const openedChain = appendWitnessChainV1(file, prior, opened);
        if (!openedChain.ok) {
          throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_WITNESS_DRIFT");
        }
        const appended: JsonlEntryV1[] = [];
        const endedWithNewline = this.scanRangeLinesFd(
          fd,
          file,
          prior.size,
          opened.size,
          "jobs_head_append",
          (entry) => appended.push(entry),
        );
        return { appended, endedWithNewline };
      });

      if (!stable) return this.rebuildHead(file, maxRaw);
      for (const entry of stable.value.appended) {
        if (prior.entries.length >= maxRaw) break;
        prior.entries.push(entry);
        const x = entry.parsed;
        if (!x) continue;
        const id = rowIdV1(x);
        if (!id) continue;
        const prev = prior.latestById.get(id);
        if (!prev || rowTsV1(x) >= rowTsV1(prev)) {
          prior.latestById.set(id, x);
        }
        if (rowIsRunnableV1(x)) {
          const prevRun = prior.latestRunnableById.get(id);
          if (!prevRun || rowTsV1(x) >= rowTsV1(prevRun)) {
            prior.latestRunnableById.set(id, x);
          }
        }
      }
      prior.capped = prior.entries.length >= maxRaw;
      Object.assign(prior, stable.stamp, {
        endedWithNewline: stable.value.endedWithNewline,
      });
      return prior;
    }

    if (current.size > prior.size && sameObjectV1(prior, current)) {
      this.metrics.append_witness_misses_total += 1;
    }
    return this.rebuildHead(file, maxRaw);
  }

  snapshot(input: {
    jobsFile: string;
    resultsFile: string;
    leasesFile: string;
    completionFiles: string[];
    scanMax: number;
    leaseMs: number;
    nowMs: number;
  }): AgentPick2SemanticSnapshotV1 {
    const scanMax = Math.max(1, Math.floor(Number(input.scanMax) || 1));
    const leaseMs = Math.max(1, Math.floor(Number(input.leaseMs) || 1));
    const nowMs = Number(input.nowMs) || Date.now();

    const completionStates = (input.completionFiles || []).map((file) =>
      this.completionState(file)
    );
    const results = this.tailState(input.resultsFile, scanMax, 0);
    const leases = this.tailState(input.leasesFile, scanMax, 40);
    const jobs = this.headState(input.jobsFile, scanMax);

    const done = new Set<string>();
    for (const entry of results.rawTail) {
      const id = rowIdV1(entry.parsed);
      if (id) done.add(id);
    }

    const active = new Set<string>();
    const cutoff = nowMs - leaseMs;
    for (const entry of leases.rawTail) {
      const x = entry.parsed;
      const id = String(x?.id || "").trim();
      const ts = Number(x?.ts || 0);
      if (id && Number.isFinite(ts) && ts >= cutoff) active.add(id);
    }

    return {
      done,
      active,
      doneTruthHas: (id: string) => {
        const key = String(id || "").trim();
        if (!key) return false;
        return completionStates.some((state) => state.completed.has(key));
      },
      latestById: jobs.latestById,
      latestRunnableById: jobs.latestRunnableById,
      recentLeases: leases.validTail.slice(-40),
      io: cloneMetricsV1(this.metrics),
    };
  }
}
