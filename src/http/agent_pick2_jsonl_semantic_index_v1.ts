// @ts-nocheck
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";

export const VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1 =
  "VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1";

export const VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1 = 1024 * 1024;
export const VOID_AGENT_PICK2_JSONL_MAX_TAIL_SCAN_BYTES_V1 = 32 * 1024 * 1024;
export const VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1 =
  16 * 1024 * 1024;
export const VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF_MS_V1 =
  30_000;

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
  } catch {
    return null;
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
    trusted_generation: boolean;
  }) => void;
};

type CanonicalAppendLockV1 = {
  key: string;
  path: string;
  fd: number;
};

const canonicalWriterStatesV1 = new Map<string, CanonicalWriterStateV1>();
const activeCanonicalWritersV1 = new Set<string>();

function seedCanonicalWriterStateV1(file: string, stamp: FileStampV1) {
  canonicalWriterStatesV1.set(fileKeyV1(file), { stamp });
}

function pidAliveV1(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err?.code !== "ESRCH";
  }
}

function staleCanonicalAppendLockV1(lockPath: string): boolean {
  try {
    const raw = fs.readFileSync(lockPath, "utf8");
    const parsed = JSON.parse(raw);
    return !pidAliveV1(Number(parsed?.pid || 0));
  } catch {
    return false;
  }
}

function acquireCanonicalAppendLockV1(file: string): CanonicalAppendLockV1 {
  const key = fileKeyV1(file);
  if (activeCanonicalWritersV1.has(key)) {
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_REENTRANT file=${file}`,
    );
  }
  activeCanonicalWritersV1.add(key);

  const lockPath = `${key}.void-pick2-append.lock`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(
        lockPath,
        fs.constants.O_WRONLY |
          fs.constants.O_CREAT |
          fs.constants.O_EXCL |
          ((fs.constants as any).O_NOFOLLOW || 0),
        0o600,
      );
      const body = Buffer.from(
        JSON.stringify({ pid: process.pid, ts_ms: Date.now() }) + "\n",
        "utf8",
      );
      fs.writeSync(fd, body, 0, body.length, null);
      return { key, path: lockPath, fd };
    } catch (err: any) {
      if (
        err?.code === "EEXIST" &&
        attempt === 0 &&
        staleCanonicalAppendLockV1(lockPath)
      ) {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // Retry through O_EXCL and fail closed if ownership stays ambiguous.
        }
        continue;
      }
      activeCanonicalWritersV1.delete(key);
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_LOCKED file=${file} cause=${String(err?.code || err)}`,
      );
    }
  }

  activeCanonicalWritersV1.delete(key);
  throw new Error(
    `VOID_AGENT_PICK2_JSONL_CANONICAL_APPEND_LOCKED file=${file}`,
  );
}

function releaseCanonicalAppendLockV1(lock: CanonicalAppendLockV1) {
  try {
    fs.closeSync(lock.fd);
  } finally {
    try {
      fs.unlinkSync(lock.path);
    } finally {
      activeCanonicalWritersV1.delete(lock.key);
    }
  }
}

let canonicalAppendNonceV1 = 0;

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

  const key = fileKeyV1(file);
  const lock = acquireCanonicalAppendLockV1(file);
  let fd: number | null = null;
  let isolatedPath = "";
  let canonicalRestored = true;
  let trustedGeneration = false;
  let before = emptyStampV1();

  const restoreIsolated = () => {
    if (!isolatedPath || canonicalRestored) return;
    const conflict = statV1(file);
    if (conflict) {
      const quarantine = uniqueRuntimeSiblingV1(file, "noncanonical-quarantine");
      fs.renameSync(file, quarantine);
      canonicalWriterStatesV1.delete(key);
      trustedGeneration = false;
    }
    fs.renameSync(isolatedPath, file);
    canonicalRestored = true;
  };

  try {
    fd = fs.openSync(
      file,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_APPEND |
        ((fs.constants as any).O_NOFOLLOW || 0),
      opts.mode ?? 0o666,
    );

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
      !sameStampV1(before, immediatelyBeforeIsolation) ||
      !pathImmediatelyBeforeIsolation ||
      !sameStampV1(immediatelyBeforeIsolation, pathImmediatelyBeforeIsolation)
    ) {
      trustedGeneration = false;
      canonicalWriterStatesV1.delete(key);
    }

    if (trustedGeneration) {
      isolatedPath = uniqueRuntimeSiblingV1(file, "isolated");
      fs.renameSync(file, isolatedPath);
      canonicalRestored = false;

      const isolatedFdStamp = fstatV1(fd);
      const isolatedPathStamp = statV1(isolatedPath);
      if (
        !isolatedPathStamp ||
        !sameStampV1(isolatedFdStamp, isolatedPathStamp) ||
        !sameDataStampV1(immediatelyBeforeIsolation, isolatedFdStamp)
      ) {
        trustedGeneration = false;
        canonicalWriterStatesV1.delete(key);
      }

      const finalPrewriteFd = fstatV1(fd);
      const finalPrewritePath = statV1(isolatedPath);
      if (
        !finalPrewritePath ||
        !sameStampV1(finalPrewriteFd, finalPrewritePath)
      ) {
        trustedGeneration = false;
        canonicalWriterStatesV1.delete(key);
      }

      opts.testHooks?.afterIsolatedTrusted?.({
        file,
        before,
        isolated_path: isolatedPath,
        trusted_generation: trustedGeneration,
      });
    }

    const writeBase = fstatV1(fd);
    let off = 0;
    while (off < bytes.length) {
      const n = fs.writeSync(fd, bytes, off, bytes.length - off, null);
      if (n <= 0) throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_SHORT_WRITE");
      off += n;
    }
    if (opts.durable) fs.fdatasyncSync(fd);

    if (isolatedPath) restoreIsolated();

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
      restoreIsolated();
    } finally {
      if (fd !== null) fs.closeSync(fd);
      releaseCanonicalAppendLockV1(lock);
    }
  }
}

function parseEntryV1(raw: string): JsonlEntryV1 {
  const line = String(raw || "").replace(/\r$/, "");
  if (!line.trim()) return { raw: line, parsed: null };
  try {
    return { raw: line, parsed: JSON.parse(line) };
  } catch {
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

  completionTruthSnapshotV1(files: string[]): {
    ready: boolean;
    doneTruthHas: (id: string) => boolean;
    io: any;
    holdReason: string | null;
  } {
    try {
      const states = (files || []).map((file) => this.completionState(file));
      return {
        ready: true,
        doneTruthHas: (id: string) => {
          const key = String(id || "").trim();
          if (!key) return false;
          return states.some((state) => state.completed.has(key));
        },
        io: cloneMetricsV1(this.metrics),
        holdReason: null,
      };
    } catch (err: any) {
      const message = String(err?.message || err || "");
      const hold =
        message.startsWith("VOID_AGENT_PICK2_JSONL_COMPLETION_WARMING_HOLD") ||
        message.startsWith("VOID_AGENT_PICK2_JSONL_COMPLETION_REBUILD_BACKOFF") ||
        message.startsWith("VOID_AGENT_PICK2_JSONL_UNWITNESSED_COMPLETION_GROWTH_HOLD");
      if (!hold) throw err;
      return {
        ready: false,
        doneTruthHas: (_id: string) => false,
        io: cloneMetricsV1(this.metrics),
        holdReason: message,
      };
    }
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
      if (prior.size === 0 && prior.dev === "-1") {
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
      if (prior.size === 0 && prior.dev === "-1") {
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
      if (prior.size === 0 && prior.dev === "-1") {
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
