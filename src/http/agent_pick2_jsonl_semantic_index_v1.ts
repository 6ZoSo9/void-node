// @ts-nocheck
import * as fs from "node:fs";

export const VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1 =
  "VOID_AGENT_PICK2_JSONL_SEMANTIC_INDEX_V1";

type JsonlEntryV1 = {
  raw: string;
  parsed: any | null;
};

type FileStampV1 = {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
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
  by_kind: Record<string, {
    bytes_read: number;
    rebuilds: number;
    incremental_reads: number;
    cache_hits: number;
  }>;
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

function emptyStampV1(): FileStampV1 {
  return { dev: -1, ino: -1, size: 0, mtimeMs: -1 };
}

function statV1(file: string): FileStampV1 | null {
  try {
    const st = fs.statSync(file);
    if (!st.isFile()) return null;
    return {
      dev: Number(st.dev),
      ino: Number(st.ino),
      size: Number(st.size),
      mtimeMs: Number(st.mtimeMs),
    };
  } catch {
    return null;
  }
}

function sameObjectV1(a: FileStampV1, b: FileStampV1): boolean {
  return a.dev === b.dev && a.ino === b.ino;
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
  private readonly completions = new Map<string, CompletionStateV1>();
  private readonly tails = new Map<string, TailStateV1>();
  private readonly heads = new Map<string, HeadStateV1>();
  private readonly metrics: IoMetricsV1 = {
    bytes_read_total: 0,
    rebuilds_total: 0,
    incremental_reads_total: 0,
    cache_hits_total: 0,
    by_kind: Object.create(null),
  };

  constructor(opts: { chunkBytes?: number } = {}) {
    const requested = Number(opts.chunkBytes || 64 * 1024);
    this.chunkBytes = Number.isFinite(requested)
      ? Math.max(4096, Math.min(1024 * 1024, Math.floor(requested)))
      : 64 * 1024;
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

  private readRange(
    file: string,
    start: number,
    length: number,
    kind: string,
  ): Buffer {
    if (length <= 0) return Buffer.alloc(0);
    const fd = fs.openSync(file, "r");
    try {
      const out = Buffer.allocUnsafe(length);
      let done = 0;
      while (done < length) {
        const n = fs.readSync(fd, out, done, length - done, start + done);
        if (n <= 0) break;
        done += n;
      }
      this.noteBytes(kind, done);
      return done === length ? out : out.subarray(0, done);
    } finally {
      fs.closeSync(fd);
    }
  }

  private scanRangeLines(
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

    while (pos < end) {
      const want = Math.min(this.chunkBytes, end - pos);
      const chunk = this.readRange(file, pos, want, kind);
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

  private rebuildCompletion(file: string, stamp: FileStampV1 | null) {
    const kind = "completion_full";
    this.noteRebuild(kind);
    const completed = new Set<string>();
    let endedWithNewline = true;
    if (stamp) {
      endedWithNewline = this.scanRangeLines(
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
    }
    const base = stamp || emptyStampV1();
    const state: CompletionStateV1 = {
      ...base,
      initialized: true,
      completed,
      endedWithNewline,
    };
    this.completions.set(file, state);
    return state;
  }

  private completionState(file: string): CompletionStateV1 {
    const stamp = statV1(file);
    const prior = this.completions.get(file);
    if (!prior?.initialized) return this.rebuildCompletion(file, stamp);

    if (!stamp) {
      if (prior.size === 0 && prior.dev === -1) {
        this.noteHit("completion_full");
        return prior;
      }
      return this.rebuildCompletion(file, null);
    }

    const appendSafe =
      sameObjectV1(prior, stamp) &&
      stamp.size >= prior.size &&
      (prior.endedWithNewline || stamp.size === prior.size);

    if (
      appendSafe &&
      stamp.size === prior.size &&
      stamp.mtimeMs === prior.mtimeMs
    ) {
      this.noteHit("completion_full");
      return prior;
    }

    if (appendSafe && stamp.size > prior.size) {
      this.noteIncremental("completion_append");
      const endedWithNewline = this.scanRangeLines(
        file,
        prior.size,
        stamp.size,
        "completion_append",
        (entry) => {
          const x = entry.parsed;
          if (!x || !isCompletedTruthV1(x)) return;
          const id = rowIdV1(x);
          if (id) prior.completed.add(id);
        },
      );
      Object.assign(prior, stamp, { endedWithNewline });
      return prior;
    }

    return this.rebuildCompletion(file, stamp);
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
    stamp: FileStampV1 | null,
    maxRaw: number,
    maxValid: number,
  ): TailStateV1 {
    const kind = "tail_rebuild";
    this.noteRebuild(kind);
    if (!stamp) {
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

    let start = stamp.size;
    let buffer = Buffer.alloc(0);
    let entries: JsonlEntryV1[] = [];

    while (start > 0) {
      const nextStart = Math.max(0, start - this.chunkBytes);
      const chunk = this.readRange(file, nextStart, start - nextStart, kind);
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

    const state: TailStateV1 = {
      ...stamp,
      initialized: true,
      maxRaw,
      maxValid,
      rawTail,
      validTail,
      endedWithNewline:
        stamp.size === 0 ||
        this.readRange(file, Math.max(0, stamp.size - 1), Math.min(1, stamp.size), kind)[0] === 0x0a,
    };
    this.tails.set(file, state);
    return state;
  }

  private tailState(
    file: string,
    maxRaw: number,
    maxValid: number,
  ): TailStateV1 {
    const stamp = statV1(file);
    const prior = this.tails.get(file);
    if (
      !prior?.initialized ||
      prior.maxRaw !== maxRaw ||
      prior.maxValid !== maxValid
    ) {
      return this.rebuildTail(file, stamp, maxRaw, maxValid);
    }

    if (!stamp) {
      if (prior.size === 0 && prior.dev === -1) {
        this.noteHit("tail_rebuild");
        return prior;
      }
      return this.rebuildTail(file, null, maxRaw, maxValid);
    }

    const appendSafe =
      sameObjectV1(prior, stamp) &&
      stamp.size >= prior.size &&
      (prior.endedWithNewline || stamp.size === prior.size);

    if (
      appendSafe &&
      stamp.size === prior.size &&
      stamp.mtimeMs === prior.mtimeMs
    ) {
      this.noteHit("tail_rebuild");
      return prior;
    }

    if (appendSafe && stamp.size > prior.size) {
      this.noteIncremental("tail_append");
      const appended: JsonlEntryV1[] = [];
      const endedWithNewline = this.scanRangeLines(
        file,
        prior.size,
        stamp.size,
        "tail_append",
        (entry) => appended.push(entry),
      );
      for (const entry of appended) {
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
      Object.assign(prior, stamp, { endedWithNewline });
      return prior;
    }

    return this.rebuildTail(file, stamp, maxRaw, maxValid);
  }

  private rebuildHead(
    file: string,
    stamp: FileStampV1 | null,
    maxRaw: number,
  ): HeadStateV1 {
    const kind = "jobs_head_rebuild";
    this.noteRebuild(kind);
    const entries: JsonlEntryV1[] = [];
    let endedWithNewline = true;

    if (stamp) {
      let pos = 0;
      let carry = Buffer.alloc(0);
      outer: while (pos < stamp.size && entries.length < maxRaw) {
        const want = Math.min(this.chunkBytes, stamp.size - pos);
        const chunk = this.readRange(file, pos, want, kind);
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
          this.readRange(
            file,
            stamp.size - 1,
            1,
            kind,
          )[0] === 0x0a;
      }
    }

    const latestById = new Map<string, any>();
    const latestRunnableById = new Map<string, any>();
    for (const entry of entries.slice(0, maxRaw)) {
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

    const base = stamp || emptyStampV1();
    const state: HeadStateV1 = {
      ...base,
      initialized: true,
      maxRaw,
      entries: entries.slice(0, maxRaw),
      capped: entries.length >= maxRaw,
      endedWithNewline,
      latestById,
      latestRunnableById,
    };
    this.heads.set(file, state);
    return state;
  }

  private headState(file: string, maxRaw: number): HeadStateV1 {
    const stamp = statV1(file);
    const prior = this.heads.get(file);
    if (!prior?.initialized || prior.maxRaw !== maxRaw) {
      return this.rebuildHead(file, stamp, maxRaw);
    }

    if (!stamp) {
      if (prior.size === 0 && prior.dev === -1) {
        this.noteHit("jobs_head_rebuild");
        return prior;
      }
      return this.rebuildHead(file, null, maxRaw);
    }

    const appendSafe =
      sameObjectV1(prior, stamp) &&
      stamp.size >= prior.size &&
      (prior.endedWithNewline || stamp.size === prior.size);

    if (
      appendSafe &&
      stamp.size === prior.size &&
      stamp.mtimeMs === prior.mtimeMs
    ) {
      this.noteHit("jobs_head_rebuild");
      return prior;
    }

    if (appendSafe && stamp.size > prior.size && prior.capped) {
      this.noteHit("jobs_head_rebuild");
      Object.assign(prior, stamp, { endedWithNewline: true });
      return prior;
    }

    if (appendSafe && stamp.size > prior.size && !prior.capped) {
      this.noteIncremental("jobs_head_append");
      const appended: JsonlEntryV1[] = [];
      const endedWithNewline = this.scanRangeLines(
        file,
        prior.size,
        stamp.size,
        "jobs_head_append",
        (entry) => appended.push(entry),
      );
      for (const entry of appended) {
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
      Object.assign(prior, stamp, { endedWithNewline });
      return prior;
    }

    return this.rebuildHead(file, stamp, maxRaw);
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
