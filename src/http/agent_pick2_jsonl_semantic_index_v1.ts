// @ts-nocheck
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import path from "node:path";

export const VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1 =
  "VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1";

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

type AppendContinuityDigestV1 = {
  stamp: FileStampV1;
  digest: string;
};

type AppendWriterTestHooksV1 = {
  afterBeforeDigest?: (ctx: {
    file: string;
    before: FileStampV1;
    prefixDigest: string;
  }) => void;
};

const APPEND_HASH_CHUNK_BYTES_V1 = 1024 * 1024;
const appendContinuityDigestsV1 = new Map<string, AppendContinuityDigestV1>();

function hashFileAndPrefixFdV1(
  fd: number,
  totalSize: number,
  prefixSize: number,
): { wholeDigest: string; prefixDigest: string } {
  const total = Math.max(0, Math.floor(Number(totalSize) || 0));
  const prefix = Math.max(0, Math.min(total, Math.floor(Number(prefixSize) || 0)));
  const wholeHash = crypto.createHash("sha256");
  const prefixHash = crypto.createHash("sha256");

  let pos = 0;
  while (pos < total) {
    const want = Math.min(APPEND_HASH_CHUNK_BYTES_V1, total - pos);
    const buffer = Buffer.allocUnsafe(want);
    let done = 0;
    while (done < want) {
      const n = fs.readSync(fd, buffer, done, want - done, pos + done);
      if (n <= 0) break;
      done += n;
    }
    if (done !== want) {
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_APPEND_HASH_SHORT_READ expected=${want} actual=${done}`,
      );
    }
    const view = buffer.subarray(0, done);
    wholeHash.update(view);

    const prefixRemaining = prefix - pos;
    if (prefixRemaining > 0) {
      prefixHash.update(view.subarray(0, Math.min(done, prefixRemaining)));
    }
    pos += done;
  }

  return {
    wholeDigest: wholeHash.digest("hex"),
    prefixDigest: prefixHash.digest("hex"),
  };
}

function expectedAppendPrefixDigestV1(
  fd: number,
  file: string,
  before: FileStampV1,
): string {
  const key = fileKeyV1(file);
  const cached = appendContinuityDigestsV1.get(key);
  if (cached && sameStampV1(cached.stamp, before)) return cached.digest;

  const hashed = hashFileAndPrefixFdV1(fd, before.size, before.size);
  const afterHash = fstatV1(fd);
  const pathAfterHash = statV1(file);
  if (
    !sameStampV1(before, afterHash) ||
    !pathAfterHash ||
    !sameStampV1(afterHash, pathAfterHash)
  ) {
    appendContinuityDigestsV1.delete(key);
    throw new Error(
      `VOID_AGENT_PICK2_JSONL_UNSTABLE_BEFORE_APPEND file=${file}`,
    );
  }

  appendContinuityDigestsV1.set(key, {
    stamp: before,
    digest: hashed.wholeDigest,
  });
  return hashed.wholeDigest;
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
  const key = fileKeyV1(file);
  const fd = fs.openSync(
    file,
    fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_APPEND,
    opts.mode ?? 0o666,
  );

  try {
    const before = fstatV1(fd);
    const expectedPrefixDigest = expectedAppendPrefixDigestV1(fd, file, before);

    const immediatelyBeforeWrite = fstatV1(fd);
    const pathImmediatelyBeforeWrite = statV1(file);
    if (
      !sameStampV1(before, immediatelyBeforeWrite) ||
      !pathImmediatelyBeforeWrite ||
      !sameStampV1(immediatelyBeforeWrite, pathImmediatelyBeforeWrite)
    ) {
      appendContinuityDigestsV1.delete(key);
      throw new Error(
        `VOID_AGENT_PICK2_JSONL_UNSTABLE_BEFORE_WRITE file=${file}`,
      );
    }

    opts.testHooks?.afterBeforeDigest?.({
      file,
      before,
      prefixDigest: expectedPrefixDigest,
    });

    let off = 0;
    while (off < bytes.length) {
      const n = fs.writeSync(fd, bytes, off, bytes.length - off, null);
      if (n <= 0) throw new Error("VOID_AGENT_PICK2_JSONL_APPEND_SHORT_WRITE");
      off += n;
    }
    if (opts.durable) fs.fdatasyncSync(fd);

    const afterWrite = fstatV1(fd);
    const expectedSize = before.size + bytes.length;
    if (
      !sameObjectV1(before, afterWrite) ||
      afterWrite.size !== expectedSize
    ) {
      appendContinuityDigestsV1.delete(key);
      return { witnessed: false, before, after: afterWrite };
    }

    const hashedAfter = hashFileAndPrefixFdV1(
      fd,
      afterWrite.size,
      before.size,
    );
    const afterHash = fstatV1(fd);
    const pathAfterHash = statV1(file);
    const stableAfter =
      sameStampV1(afterWrite, afterHash) &&
      !!pathAfterHash &&
      sameStampV1(afterHash, pathAfterHash);

    const witnessed =
      stableAfter &&
      hashedAfter.prefixDigest === expectedPrefixDigest;

    if (!witnessed) {
      appendContinuityDigestsV1.delete(key);
      return { witnessed: false, before, after: afterHash };
    }

    appendContinuityDigestsV1.set(key, {
      stamp: afterHash,
      digest: hashedAfter.wholeDigest,
    });
    recordAppendWitnessV1(
      file,
      before,
      afterHash,
      bytes.length === 0 || bytes[bytes.length - 1] === 0x0a,
    );
    return { witnessed: true, before, after: afterHash };
  } finally {
    fs.closeSync(fd);
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
  private readonly completions = new Map<string, CompletionStateV1>();
  private readonly tails = new Map<string, TailStateV1>();
  private readonly heads = new Map<string, HeadStateV1>();
  private readonly metrics: IoMetricsV1 = {
    bytes_read_total: 0,
    rebuilds_total: 0,
    incremental_reads_total: 0,
    cache_hits_total: 0,
    coherent_scan_retries_total: 0,
    append_witness_misses_total: 0,
    by_kind: Object.create(null),
  };

  constructor(opts: { chunkBytes?: number; testHooks?: TestHooksV1 } = {}) {
    const requested = Number(opts.chunkBytes || 64 * 1024);
    this.chunkBytes = Number.isFinite(requested)
      ? Math.max(4096, Math.min(1024 * 1024, Math.floor(requested)))
      : 64 * 1024;
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
  ): { stamp: FileStampV1; value: T } | null {
    const openFlags =
      fs.constants.O_RDONLY |
      ((fs.constants as any).O_NOFOLLOW || 0);

    for (let attempt = 0; attempt < 4; attempt++) {
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
    let endedWithNewline = true;
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
        const raw = data.subarray(from, i).toString("utf8");
        if (raw.trim()) onLine(parseEntryV1(raw));
        from = i + 1;
      }
      carry = data.subarray(from);
    }

    if (carry.length) {
      const raw = carry.toString("utf8");
      if (raw.trim()) onLine(parseEntryV1(raw));
      endedWithNewline = false;
    }
    return endedWithNewline;
  }

  private rebuildCompletion(file: string) {
    const kind = "completion_full";
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
    }
    return this.rebuildCompletion(file);
  }

  private decodeTailBuffer(
    buffer: Buffer,
    startsAtZero: boolean,
  ): JsonlEntryV1[] {
    let text = buffer.toString("utf8");
    if (!startsAtZero) {
      const firstLf = text.indexOf("\n");
      if (firstLf < 0) return [];
      text = text.slice(firstLf + 1);
    }
    return text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map(parseEntryV1);
  }

  private rebuildTail(
    file: string,
    maxRaw: number,
    maxValid: number,
  ): TailStateV1 {
    const kind = "tail_rebuild";
    this.noteRebuild(kind);

    const stable = this.stableRead(file, kind, (fd, stamp) => {
      let start = stamp.size;
      let buffer = Buffer.alloc(0);
      let entries: JsonlEntryV1[] = [];
      let chunkIndex = 0;

      while (start > 0) {
        const nextStart = Math.max(0, start - this.chunkBytes);
        const chunk = this.readRangeFd(
          fd,
          file,
          nextStart,
          start - nextStart,
          kind,
          chunkIndex++,
        );
        buffer = buffer.length ? Buffer.concat([chunk, buffer]) : chunk;
        start = nextStart;
        entries = this.decodeTailBuffer(buffer, start === 0);
        const validCount = entries.reduce(
          (n, entry) => n + (entry.parsed ? 1 : 0),
          0,
        );
        if (
          entries.length >= maxRaw &&
          validCount >= Math.min(maxValid, maxRaw)
        ) break;
      }

      const rawTail = entries.slice(-maxRaw);
      const validTail = maxValid > 0
        ? entries
            .map((entry) => entry.parsed)
            .filter(Boolean)
            .slice(-maxValid)
        : [];

      let endedWithNewline = true;
      if (stamp.size > 0) {
        endedWithNewline =
          this.readRangeFd(
            fd,
            file,
            stamp.size - 1,
            1,
            kind,
            chunkIndex,
          )[0] === 0x0a;
      }
      return { rawTail, validTail, endedWithNewline };
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
      let endedWithNewline = true;
      let pos = 0;
      let carry = Buffer.alloc(0);
      let chunkIndex = 0;

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
          const raw = data.subarray(from, i).toString("utf8");
          if (raw.trim()) entries.push(parseEntryV1(raw));
          from = i + 1;
          if (entries.length >= maxRaw) {
            carry = Buffer.alloc(0);
            break outer;
          }
        }
        carry = data.subarray(from);
      }

      if (entries.length < maxRaw && carry.length) {
        const raw = carry.toString("utf8");
        if (raw.trim()) entries.push(parseEntryV1(raw));
        endedWithNewline = false;
      } else if (stamp.size > 0 && entries.length < maxRaw) {
        endedWithNewline =
          this.readRangeFd(
            fd,
            file,
            stamp.size - 1,
            1,
            kind,
            chunkIndex,
          )[0] === 0x0a;
      }

      return { entries, endedWithNewline };
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
