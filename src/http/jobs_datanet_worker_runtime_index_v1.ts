// @ts-nocheck
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import { TextDecoder } from "node:util";
import {
  AgentPick2JsonlSemanticIndexV1,
  VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1,
} from "./agent_pick2_jsonl_semantic_index_v1.js";

export const VOID_JOBS_DATANET_WORKER_RUNTIME_INDEX_V1 =
  "VOID_JOBS_DATANET_WORKER_RUNTIME_INDEX_V1";

type ScanInputV1 = {
  jobsFile: string;
  receiptsFile: string;
  jobStateFile: string;
};

type ScanJobV1 = {
  jobId: string;
  job: any;
};

export type JobsDatanetWorkerRuntimeScanV1 = {
  ready: boolean;
  jobs: ScanJobV1[];
  doneTruthHas: (id: string) => boolean;
  holdReason: string | null;
  scanComplete: boolean;
  bytesReadThisTick: number;
  bytesReadTotal: number;
  completionIo: any;
  retainedState: {
    pendingIds: number;
    locallyDoneIds: number;
    carryBytes: number;
    pendingSourceBytes: number;
  };
};

type PendingJobV1 = {
  job: any;
};

const UTF8_FATAL_V1 = new TextDecoder("utf-8", { fatal: true });

type FileStampV1 = {
  dev: string;
  ino: string;
  size: number;
  mtimeNs: string;
  ctimeNs: string;
};

type CompletionStateV1 = FileStampV1 & {
  completed: Set<string>;
};

function fileStampV1(file: string): FileStampV1 | null {
  try {
    const stat = fs.statSync(file, { bigint: true } as any);
    if (!stat.isFile()) return null;
    return {
      dev: String(stat.dev),
      ino: String(stat.ino),
      size: Number(stat.size),
      mtimeNs: String((stat as any).mtimeNs),
      ctimeNs: String((stat as any).ctimeNs),
    };
  } catch {
    return null;
  }
}

function fdStampV1(fd: number): FileStampV1 {
  const stat = fs.fstatSync(fd, { bigint: true } as any);
  if (!stat.isFile()) {
    throw new Error("VOID_JOBS_DATANET_WORKER_NON_REGULAR_FILE");
  }
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: Number(stat.size),
    mtimeNs: String((stat as any).mtimeNs),
    ctimeNs: String((stat as any).ctimeNs),
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

function completionIdV1(line: Buffer, file: string): string {
  let parsed: any;
  try {
    parsed = JSON.parse(UTF8_FATAL_V1.decode(line));
  } catch (error: any) {
    if (error instanceof TypeError) {
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_COMPLETION_INVALID_UTF8 file=${file}`,
      );
    }
    return "";
  }
  const status = String(parsed?.status || "").trim().toLowerCase();
  if (status !== "completed" && status !== "ok" && status !== "done") {
    return "";
  }
  return String(parsed?.job_id || parsed?.id || "").trim();
}

function boundedIntV1(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export class JobsDatanetWorkerRuntimeIndexV1 {
  private readonly authorityIndex = new AgentPick2JsonlSemanticIndexV1();
  private readonly maxScanBytesPerTick: number;
  private readonly maxJobsPerTick: number;
  private readonly maxLocallyDoneIds: number;
  private readonly maxSyncCompletionRebuildBytes: number;
  private readonly completionRebuildBackoffMs: number;

  private jobsDev = "";
  private jobsIno = "";
  private jobsOffset = 0;
  private jobsCarry = Buffer.alloc(0);
  private jobsObservedSize = 0;
  private jobsMtimeNs = "";
  private jobsCtimeNs = "";
  private pendingSourceOffset = 0;
  private pendingSource = Buffer.alloc(0);
  private pending = new Map<string, PendingJobV1>();
  private locallyDone = new Set<string>();
  private bytesReadTotal = 0;
  private readonly admittedStamps = new Map<string, FileStampV1>();
  private readonly rejectedSources = new Set<string>();
  private authorityWitnessMisses = 0;
  private readonly completions = new Map<string, CompletionStateV1>();
  private readonly completionWarmTasks = new Map<string, Promise<void>>();
  private readonly completionHoldUntil = new Map<string, number>();
  private readonly completionMetrics = {
    bytes_read_total: 0,
    sync_bytes_read_total: 0,
    async_bytes_read_total: 0,
    rebuilds_total: 0,
    incremental_reads_total: 0,
    cache_hits_total: 0,
    coherent_scan_retries_total: 0,
    append_witness_misses_total: 0,
    async_warms_total: 0,
  };

  constructor(opts: {
    maxScanBytesPerTick?: number;
    maxJobsPerTick?: number;
    maxLocallyDoneIds?: number;
    maxSyncCompletionRebuildBytes?: number;
    completionRebuildBackoffMs?: number;
  } = {}) {
    this.maxScanBytesPerTick = boundedIntV1(
      opts.maxScanBytesPerTick ??
        process.env.VOID_JOBS_WORKER_SCAN_BYTES_PER_TICK,
      1024 * 1024,
      4096,
      4 * 1024 * 1024,
    );
    this.maxJobsPerTick = boundedIntV1(
      opts.maxJobsPerTick ?? process.env.VOID_JOBS_WORKER_MAX_JOBS_PER_TICK,
      8,
      1,
      64,
    );
    this.maxLocallyDoneIds = boundedIntV1(
      opts.maxLocallyDoneIds ??
        process.env.VOID_JOBS_WORKER_MAX_LOCALLY_DONE_IDS,
      16 * 1024,
      64,
      64 * 1024,
    );
    this.maxSyncCompletionRebuildBytes = boundedIntV1(
      opts.maxSyncCompletionRebuildBytes,
      16 * 1024 * 1024,
      4096,
      1024 * 1024 * 1024,
    );
    this.completionRebuildBackoffMs = boundedIntV1(
      opts.completionRebuildBackoffMs,
      30_000,
      1,
      60 * 60 * 1000,
    );
  }

  private resetJobsGenerationV1(): void {
    this.jobsDev = "";
    this.jobsIno = "";
    this.jobsOffset = 0;
    this.jobsCarry = Buffer.alloc(0);
    this.jobsObservedSize = 0;
    this.jobsMtimeNs = "";
    this.jobsCtimeNs = "";
    this.pendingSourceOffset = 0;
    this.pendingSource = Buffer.alloc(0);
    this.pending.clear();
  }

  private retainedStateV1() {
    return {
      pendingIds: this.pending.size,
      locallyDoneIds: this.locallyDone.size,
      carryBytes: this.jobsCarry.length,
      pendingSourceBytes: this.pendingSource.length,
    };
  }

  private readExactGenerationRangeV1(
    file: string,
    dev: string,
    ino: string,
    offset: number,
    length: number,
  ): Buffer | null {
    if (length <= 0) return Buffer.alloc(0);
    const flags = fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
    const fd = fs.openSync(file, flags);
    try {
      const opened = fs.fstatSync(fd, { bigint: true } as any);
      if (
        !opened.isFile() ||
        String(opened.dev) !== dev ||
        String(opened.ino) !== ino
      ) return null;
      const out = Buffer.allocUnsafe(length);
      let done = 0;
      while (done < length) {
        const n = fs.readSync(fd, out, done, length - done, offset + done);
        if (n <= 0) return null;
        done += n;
      }
      const after = fs.fstatSync(fd, { bigint: true } as any);
      if (
        !after.isFile() ||
        String(after.dev) !== dev ||
        String(after.ino) !== ino
      ) return null;
      return out;
    } finally {
      fs.closeSync(fd);
    }
  }

  private pendingWitnessesMatchV1(
    file: string,
    dev: string,
    ino: string,
  ): boolean {
    if (!this.pending.size) return true;
    if (!this.pendingSource.length) return false;
    const actual = this.readExactGenerationRangeV1(
      file,
      dev,
      ino,
      this.pendingSourceOffset,
      this.pendingSource.length,
    );
    return !!actual && actual.equals(this.pendingSource);
  }

  private admitSourceV1(file: string): {
    ok: boolean;
    stamp: FileStampV1 | null;
  } {
    const observed = fileStampV1(file);
    if (!observed) {
      this.admittedStamps.delete(file);
      return { ok: true, stamp: null };
    }

    // VOID_JOBS_DATANET_WORKER_APPEND_CONTINUITY_AUTHORITY_V1
    // Reuse the canonical writer's exact before/after witness chain. A fixed
    // suffix cannot authorize an older-prefix mutation followed by growth.
    const missesBefore = this.authorityWitnessMisses;
    const authority = this.authorityIndex.snapshot({
      jobsFile: file,
      resultsFile: "",
      leasesFile: "",
      completionFiles: [],
      scanMax: 1,
      leaseMs: 1,
      nowMs: Date.now(),
    });
    const missesAfter = Number(
      authority.io?.append_witness_misses_total || 0,
    );
    this.authorityWitnessMisses = missesAfter;
    const current = fileStampV1(file);
    const prior = this.admittedStamps.get(file);
    const stable = !!current && sameStampV1(observed, current);
    const exactAppend =
      !!prior &&
      !!current &&
      sameObjectV1(prior, current) &&
      current.size > prior.size &&
      missesAfter === missesBefore;
    const ok =
      stable &&
      (!prior || sameStampV1(prior, current!) || exactAppend);
    if (!ok) this.rejectedSources.add(file);
    if (current) this.admittedStamps.set(file, current);
    return { ok, stamp: current };
  }

  private addCompletionBytesV1(
    file: string,
    completed: Set<string>,
    priorCarry: Buffer,
    chunk: Buffer,
  ): Buffer {
    const data = priorCarry.length
      ? Buffer.concat([priorCarry, chunk])
      : chunk;
    let from = 0;
    for (let i = 0; i < data.length; i += 1) {
      if (data[i] !== 0x0a) continue;
      const line = data.subarray(from, i);
      if (line.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
        throw new Error(
          `VOID_JOBS_DATANET_WORKER_COMPLETION_RECORD_TOO_LARGE file=${file}`,
        );
      }
      const id = completionIdV1(
        line.length && line[line.length - 1] === 0x0d
          ? line.subarray(0, line.length - 1)
          : line,
        file,
      );
      if (id) completed.add(id);
      from = i + 1;
    }
    const carry = Buffer.from(data.subarray(from));
    if (carry.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_COMPLETION_RECORD_TOO_LARGE file=${file}`,
      );
    }
    return carry;
  }

  private readCompletionRangeSyncV1(
    file: string,
    start: number,
    target: FileStampV1,
    completed: Set<string>,
  ): CompletionStateV1 {
    const flags = fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
    const fd = fs.openSync(file, flags);
    try {
      if (!sameStampV1(fdStampV1(fd), target)) {
        throw new Error(
          `VOID_JOBS_DATANET_WORKER_COMPLETION_SOURCE_CHANGED file=${file}`,
        );
      }
      const length = target.size - start;
      const bytes = Buffer.allocUnsafe(length);
      let done = 0;
      while (done < length) {
        const read = fs.readSync(fd, bytes, done, length - done, start + done);
        if (read <= 0) break;
        done += read;
      }
      if (done !== length) {
        throw new Error(
          `VOID_JOBS_DATANET_WORKER_COMPLETION_SHORT_READ file=${file}`,
        );
      }
      this.completionMetrics.bytes_read_total += done;
      this.completionMetrics.sync_bytes_read_total += done;
      const carry = this.addCompletionBytesV1(
        file,
        completed,
        Buffer.alloc(0),
        bytes,
      );
      if (carry.length) {
        throw new Error(
          `VOID_JOBS_DATANET_WORKER_COMPLETION_UNTERMINATED file=${file}`,
        );
      }
      const after = fileStampV1(file);
      if (!sameStampV1(fdStampV1(fd), target) || !after || !sameStampV1(after, target)) {
        throw new Error(
          `VOID_JOBS_DATANET_WORKER_COMPLETION_SOURCE_CHANGED file=${file}`,
        );
      }
      return { ...target, completed };
    } finally {
      fs.closeSync(fd);
    }
  }

  private startCompletionWarmV1(
    file: string,
    base: CompletionStateV1 | null,
    initialTarget: FileStampV1,
  ): void {
    if (this.completionWarmTasks.has(file)) return;
    this.completionMetrics.rebuilds_total += base ? 0 : 1;
    this.completionMetrics.incremental_reads_total += base ? 1 : 0;
    this.completionMetrics.async_warms_total += 1;

    const task = (async () => {
      const completed = new Set<string>(base?.completed || []);
      let position = Number(base?.size || 0);
      let target = initialTarget;

      for (;;) {
        const beforeOpen = fileStampV1(file);
        if (!beforeOpen || !sameStampV1(beforeOpen, target)) {
          const advanced = this.admitSourceV1(file);
          if (
            !advanced.ok ||
            !advanced.stamp ||
            !sameObjectV1(target, advanced.stamp) ||
            advanced.stamp.size <= target.size
          ) {
            this.completionMetrics.append_witness_misses_total += 1;
            throw new Error(
              `VOID_JOBS_DATANET_WORKER_COMPLETION_UNWITNESSED_CHANGE file=${file}`,
            );
          }
          target = advanced.stamp;
        }
        const flags = fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
        const handle: any = await fsp.open(file, flags);
        let carry = Buffer.alloc(0);
        try {
          const opened = fdStampV1(handle.fd);
          if (!sameStampV1(opened, target)) {
            const advanced = this.admitSourceV1(file);
            if (
              advanced.ok &&
              advanced.stamp &&
              sameObjectV1(target, advanced.stamp) &&
              advanced.stamp.size > target.size
            ) {
              target = advanced.stamp;
              continue;
            }
            throw new Error(
              `VOID_JOBS_DATANET_WORKER_COMPLETION_SOURCE_CHANGED file=${file}`,
            );
          }
          if (position > target.size) {
            throw new Error(
              `VOID_JOBS_DATANET_WORKER_COMPLETION_SOURCE_CHANGED file=${file}`,
            );
          }
          const buffer = Buffer.allocUnsafe(
            Math.min(64 * 1024, Math.max(4096, this.maxScanBytesPerTick)),
          );
          while (position < target.size) {
            const want = Math.min(buffer.length, target.size - position);
            const result = await handle.read(buffer, 0, want, position);
            const bytesRead = Number(result?.bytesRead || 0);
            if (bytesRead <= 0) {
              throw new Error(
                `VOID_JOBS_DATANET_WORKER_COMPLETION_SHORT_READ file=${file}`,
              );
            }
            position += bytesRead;
            this.completionMetrics.bytes_read_total += bytesRead;
            this.completionMetrics.async_bytes_read_total += bytesRead;
            carry = this.addCompletionBytesV1(
              file,
              completed,
              carry,
              Buffer.from(buffer.subarray(0, bytesRead)),
            );
          }
          if (carry.length) {
            throw new Error(
              `VOID_JOBS_DATANET_WORKER_COMPLETION_UNTERMINATED file=${file}`,
            );
          }
        } finally {
          await handle.close();
        }

        const current = fileStampV1(file);
        if (current && sameStampV1(current, target)) {
          this.completions.set(file, { ...target, completed });
          this.rejectedSources.delete(file);
          this.completionHoldUntil.delete(file);
          return;
        }
        const admitted = this.admitSourceV1(file);
        if (
          !admitted.ok ||
          !admitted.stamp ||
          !sameObjectV1(target, admitted.stamp) ||
          admitted.stamp.size <= target.size
        ) {
          this.completionMetrics.append_witness_misses_total += 1;
          throw new Error(
            `VOID_JOBS_DATANET_WORKER_COMPLETION_UNWITNESSED_CHANGE file=${file}`,
          );
        }
        target = admitted.stamp;
      }
    })();

    this.completionWarmTasks.set(file, task);
    task.then(
      () => {
        if (this.completionWarmTasks.get(file) === task) {
          this.completionWarmTasks.delete(file);
        }
      },
      () => {
        this.completions.delete(file);
        this.rejectedSources.add(file);
        this.completionHoldUntil.set(
          file,
          Date.now() + this.completionRebuildBackoffMs,
        );
        if (this.completionWarmTasks.get(file) === task) {
          this.completionWarmTasks.delete(file);
        }
      },
    );
    void task.catch(() => undefined);
  }

  private completionStateV1(file: string): CompletionStateV1 {
    const current = fileStampV1(file);
    let prior = this.completions.get(file);
    if (!current) {
      if (prior && prior.dev === "-1") {
        this.completionMetrics.cache_hits_total += 1;
        return prior;
      }
      const empty: CompletionStateV1 = {
        dev: "-1",
        ino: "-1",
        size: 0,
        mtimeNs: "-1",
        ctimeNs: "-1",
        completed: new Set<string>(),
      };
      this.completions.set(file, empty);
      return empty;
    }
    if (prior && sameStampV1(prior, current)) {
      this.completionMetrics.cache_hits_total += 1;
      return prior;
    }
    if (this.completionWarmTasks.has(file)) {
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_COMPLETION_WARMING_HOLD file=${file}`,
      );
    }
    const holdUntil = Number(this.completionHoldUntil.get(file) || 0);
    if (holdUntil > Date.now()) {
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_COMPLETION_REBUILD_BACKOFF file=${file} until_ms=${holdUntil}`,
      );
    }

    if (this.rejectedSources.has(file)) {
      this.completions.delete(file);
      prior = undefined;
    }

    const admitted = this.admitSourceV1(file);
    const append =
      !!prior &&
      admitted.ok &&
      !!admitted.stamp &&
      sameObjectV1(prior, admitted.stamp) &&
      admitted.stamp.size > prior.size;
    if (prior && !sameStampV1(prior, current) && !append) {
      this.completions.delete(file);
      this.completionMetrics.append_witness_misses_total += 1;
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_COMPLETION_UNWITNESSED_CHANGE file=${file}`,
      );
    }
    if (!admitted.ok || !admitted.stamp) {
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_COMPLETION_UNSTABLE file=${file}`,
      );
    }

    const start = append ? prior!.size : 0;
    const bytes = admitted.stamp.size - start;
    const completed = new Set<string>(append ? prior!.completed : []);
    if (bytes > this.maxSyncCompletionRebuildBytes) {
      this.startCompletionWarmV1(
        file,
        append ? prior! : null,
        admitted.stamp,
      );
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_COMPLETION_WARMING_HOLD file=${file} bytes=${bytes}`,
      );
    }
    this.completionMetrics.rebuilds_total += append ? 0 : 1;
    this.completionMetrics.incremental_reads_total += append ? 1 : 0;
    const state = this.readCompletionRangeSyncV1(
      file,
      start,
      admitted.stamp,
      completed,
    );
    this.completions.set(file, state);
    this.rejectedSources.delete(file);
    return state;
  }

  private completionSnapshotV1(input: ScanInputV1): any {
    try {
      const states = [
        input.receiptsFile,
        input.jobStateFile,
        input.jobsFile,
      ].map((file) => this.completionStateV1(file));
      return {
        ready: true,
        doneTruthHas: (id: string) => {
          const key = String(id || "").trim();
          return !!key && states.some((state) => state.completed.has(key));
        },
        io: { ...this.completionMetrics },
        holdReason: null,
      };
    } catch (error: any) {
      const holdReason = String(error?.message || error || "");
      return {
        ready: false,
        doneTruthHas: (_id: string) => false,
        io: { ...this.completionMetrics },
        holdReason,
      };
    }
  }

  completionHasV1(input: ScanInputV1, id: string): boolean {
    const snapshot = this.completionSnapshotV1(input);
    if (!snapshot.ready) {
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_HOLD " +
          String(snapshot.holdReason || "completion_truth_not_ready"),
      );
    }
    return snapshot.doneTruthHas(String(id || ""));
  }

  scan(input: ScanInputV1): JobsDatanetWorkerRuntimeScanV1 {
    const completion = this.completionSnapshotV1(input);
    if (!completion.ready) {
      if (
        String(completion.holdReason || "").includes(
          "COMPLETION_UNWITNESSED_CHANGE",
        ) &&
        String(completion.holdReason || "").includes(input.jobsFile)
      ) {
        this.resetJobsGenerationV1();
      }
      return {
        ready: false,
        jobs: [],
        doneTruthHas: completion.doneTruthHas,
        holdReason: String(
          completion.holdReason || "completion_truth_not_ready",
        ),
        scanComplete: false,
        bytesReadThisTick: 0,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
        retainedState: this.retainedStateV1(),
      };
    }

    for (const id of Array.from(this.locallyDone)) {
      if (completion.doneTruthHas(id)) this.locallyDone.delete(id);
    }
    for (const id of Array.from(this.pending.keys())) {
      if (this.locallyDone.has(id)) {
        this.pending.delete(id);
      } else if (completion.doneTruthHas(id)) {
        this.pending.delete(id);
        this.locallyDone.delete(id);
      }
    }
    if (this.pending.size === 0) {
      this.pendingSourceOffset = 0;
      this.pendingSource = Buffer.alloc(0);
    }

    if (!fs.existsSync(input.jobsFile)) {
      this.resetJobsGenerationV1();
      return {
        ready: true,
        jobs: [],
        doneTruthHas: completion.doneTruthHas,
        holdReason: null,
        scanComplete: true,
        bytesReadThisTick: 0,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
        retainedState: this.retainedStateV1(),
      };
    }

    const stat = fs.statSync(input.jobsFile, { bigint: true } as any);
    if (!stat.isFile()) {
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_JOBS_NON_REGULAR file=${input.jobsFile}`,
      );
    }

    const dev = String(stat.dev);
    const ino = String(stat.ino);
    const size = Number(stat.size);
    const mtimeNs = String((stat as any).mtimeNs);
    const ctimeNs = String((stat as any).ctimeNs);

    let generationChanged =
      (this.jobsDev && (this.jobsDev !== dev || this.jobsIno !== ino)) ||
      size < this.jobsOffset ||
      (this.jobsObservedSize > 0 && size < this.jobsObservedSize);
    const metadataChanged =
      !!this.jobsDev &&
      (this.jobsMtimeNs !== mtimeNs || this.jobsCtimeNs !== ctimeNs);
    if (
      !generationChanged &&
      metadataChanged &&
      size === this.jobsObservedSize
    ) {
      // VOID_JOBS_DATANET_WORKER_EQUAL_SIZE_REWRITE_RESET_V1
      generationChanged = true;
    }
    if (
      !generationChanged &&
      this.pending.size > 0 &&
      !this.pendingWitnessesMatchV1(input.jobsFile, dev, ino)
    ) {
      // VOID_JOBS_DATANET_WORKER_PENDING_SOURCE_WITNESS_V1
      generationChanged = true;
    }
    if (generationChanged) {
      this.resetJobsGenerationV1();
    }
    if (!this.jobsDev) {
      this.jobsDev = dev;
      this.jobsIno = ino;
    }

    let bytesReadThisTick = 0;
    // VOID_JOBS_DATANET_WORKER_PENDING_BACKPRESSURE_V1
    // Drain the already-bounded queued-job chunk before advancing the ledger
    // cursor again. This prevents pending job objects from accumulating across
    // history chunks faster than maxJobsPerTick can process them.
    const canAdvanceHistory = this.pending.size === 0;
    const remaining = canAdvanceHistory
      ? Math.max(0, size - this.jobsOffset)
      : 0;
    if (remaining > 0) {
      const want = Math.min(this.maxScanBytesPerTick, remaining);
      const buffer = Buffer.allocUnsafe(want);
      const flags =
        fs.constants.O_RDONLY |
        ((fs.constants as any).O_NOFOLLOW || 0);
      const fd = fs.openSync(input.jobsFile, flags);
      let done = 0;
      try {
        const opened = fs.fstatSync(fd, { bigint: true } as any);
        if (
          !opened.isFile() ||
          String(opened.dev) !== this.jobsDev ||
          String(opened.ino) !== this.jobsIno
        ) {
          this.resetJobsGenerationV1();
          throw new Error(
            `VOID_JOBS_DATANET_WORKER_JOBS_GENERATION_CHANGED file=${input.jobsFile}`,
          );
        }
        while (done < want) {
          const n = fs.readSync(
            fd,
            buffer,
            done,
            want - done,
            this.jobsOffset + done,
          );
          if (n <= 0) break;
          done += n;
        }
      } finally {
        fs.closeSync(fd);
      }

      this.jobsOffset += done;
      bytesReadThisTick = done;
      this.bytesReadTotal += done;

      const priorCarry = this.jobsCarry;
      const dataStart = this.jobsOffset - done - priorCarry.length;
      const data = priorCarry.length
        ? Buffer.concat([priorCarry, buffer.subarray(0, done)])
        : buffer.subarray(0, done);
      let from = 0;
      const chunkSeen = new Set<string>();
      for (let i = 0; i < data.length; i += 1) {
        if (data[i] !== 0x0a) continue;
        const recordBytes = data.subarray(from, i);
        if (recordBytes.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
          this.resetJobsGenerationV1();
          throw new Error(
            `VOID_JOBS_DATANET_WORKER_RECORD_TOO_LARGE file=${input.jobsFile}`,
          );
        }
        const decodeBytes =
          recordBytes.length > 0 && recordBytes[recordBytes.length - 1] === 0x0d
            ? recordBytes.subarray(0, recordBytes.length - 1)
            : recordBytes;
        let line = "";
        try {
          line = UTF8_FATAL_V1.decode(decodeBytes).trim();
        } catch {
          this.resetJobsGenerationV1();
          throw new Error(
            `VOID_JOBS_DATANET_WORKER_INVALID_UTF8 file=${input.jobsFile}`,
          );
        }
        from = i + 1;
        if (!line) continue;
        let job: any;
        try {
          job = JSON.parse(line);
        } catch {
          // VOID_JOBS_DATANET_WORKER_MALFORMED_ROW_SKIP_V1
          // Preserve legacy fail-soft semantics: one malformed JSONL row must
          // not discard valid jobs later in the same already-consumed chunk.
          continue;
        }
        const jobId = String(job?.job_id || job?.id || "").trim();
        if (!jobId || chunkSeen.has(jobId)) continue;
        chunkSeen.add(jobId);
        if (String(job?.status || "") !== "queued") continue;
        if (
          this.locallyDone.has(jobId) ||
          completion.doneTruthHas(jobId)
        ) {
          continue;
        }
        this.pending.set(jobId, {
          job,
        });
      }
      this.jobsCarry = Buffer.from(data.subarray(from));
      if (this.pending.size > 0) {
        // One bounded exact source range avoids per-job reopen/read work even
        // when a scan chunk contains many small queued rows.
        this.pendingSourceOffset = dataStart;
        this.pendingSource = Buffer.from(data);
      }
      if (this.jobsCarry.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1) {
        this.resetJobsGenerationV1();
        throw new Error(
          `VOID_JOBS_DATANET_WORKER_RECORD_TOO_LARGE file=${input.jobsFile}`,
        );
      }
    }

    const pathAfter = fs.statSync(
      input.jobsFile,
      { bigint: true } as any,
    );
    if (
      !pathAfter.isFile() ||
      String(pathAfter.dev) !== this.jobsDev ||
      String(pathAfter.ino) !== this.jobsIno ||
      Number(pathAfter.size) < this.jobsOffset
    ) {
      this.resetJobsGenerationV1();
      return {
        ready: false,
        jobs: [],
        doneTruthHas: completion.doneTruthHas,
        holdReason: "jobs_generation_changed",
        scanComplete: false,
        bytesReadThisTick,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
        retainedState: this.retainedStateV1(),
      };
    }

    const pathAfterSize = Number(pathAfter.size);
    const pathAfterMtimeNs = String((pathAfter as any).mtimeNs);
    const pathAfterCtimeNs = String((pathAfter as any).ctimeNs);
    if (
      pathAfterSize === size &&
      (pathAfterMtimeNs !== mtimeNs || pathAfterCtimeNs !== ctimeNs)
    ) {
      this.resetJobsGenerationV1();
      return {
        ready: false,
        jobs: [],
        doneTruthHas: completion.doneTruthHas,
        holdReason: "jobs_generation_changed",
        scanComplete: false,
        bytesReadThisTick,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
        retainedState: this.retainedStateV1(),
      };
    }
    const admittedAfterRead = this.admitSourceV1(input.jobsFile);
    if (!admittedAfterRead.ok) {
      this.resetJobsGenerationV1();
      return {
        ready: false,
        jobs: [],
        doneTruthHas: completion.doneTruthHas,
        holdReason: "jobs_unwitnessed_source_change",
        scanComplete: false,
        bytesReadThisTick,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
        retainedState: this.retainedStateV1(),
      };
    }
    if (!this.pendingWitnessesMatchV1(input.jobsFile, dev, ino)) {
      this.resetJobsGenerationV1();
      return {
        ready: false,
        jobs: [],
        doneTruthHas: completion.doneTruthHas,
        holdReason: "jobs_source_witness_changed",
        scanComplete: false,
        bytesReadThisTick,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
        retainedState: this.retainedStateV1(),
      };
    }
    this.jobsObservedSize = pathAfterSize;
    this.jobsMtimeNs = pathAfterMtimeNs;
    this.jobsCtimeNs = pathAfterCtimeNs;

    const jobs: ScanJobV1[] = [];
    for (const [jobId, entry] of this.pending) {
      if (
        this.locallyDone.has(jobId) ||
        completion.doneTruthHas(jobId)
      ) {
        this.pending.delete(jobId);
        if (completion.doneTruthHas(jobId)) this.locallyDone.delete(jobId);
        continue;
      }
      jobs.push({ jobId, job: entry.job });
      if (jobs.length >= this.maxJobsPerTick) break;
    }

    return {
      ready: true,
      jobs,
      doneTruthHas: completion.doneTruthHas,
      holdReason: null,
      scanComplete:
        pathAfterSize === this.jobsOffset &&
        this.jobsCarry.length === 0,
      bytesReadThisTick,
      bytesReadTotal: this.bytesReadTotal,
      completionIo: completion.io,
      retainedState: this.retainedStateV1(),
    };
  }

  markDone(jobId: string): void {
    const id = String(jobId || "").trim();
    if (!id) return;
    this.pending.delete(id);
    if (this.pending.size === 0) {
      this.pendingSourceOffset = 0;
      this.pendingSource = Buffer.alloc(0);
    }
    if (
      !this.locallyDone.has(id) &&
      this.locallyDone.size >= this.maxLocallyDoneIds
    ) {
      throw new Error(
        `VOID_JOBS_DATANET_WORKER_LOCAL_DONE_LIMIT max=${this.maxLocallyDoneIds}`,
      );
    }
    this.locallyDone.add(id);
  }
}
