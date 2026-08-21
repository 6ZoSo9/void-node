// @ts-nocheck
import * as fs from "node:fs";
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

const JOBS_ANCHOR_BYTES_V1 = 4096;
const UTF8_FATAL_V1 = new TextDecoder("utf-8", { fatal: true });

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
  private readonly completionIndex: AgentPick2JsonlSemanticIndexV1;
  private readonly maxScanBytesPerTick: number;
  private readonly maxJobsPerTick: number;
  private readonly maxLocallyDoneIds: number;

  private jobsDev = "";
  private jobsIno = "";
  private jobsOffset = 0;
  private jobsCarry = Buffer.alloc(0);
  private jobsObservedSize = 0;
  private jobsMtimeNs = "";
  private jobsCtimeNs = "";
  private jobsAnchorOffset = 0;
  private jobsAnchor = Buffer.alloc(0);
  private pendingSourceOffset = 0;
  private pendingSource = Buffer.alloc(0);
  private pending = new Map<string, PendingJobV1>();
  private locallyDone = new Set<string>();
  private bytesReadTotal = 0;

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
    this.completionIndex = new AgentPick2JsonlSemanticIndexV1({
      maxSyncCompletionRebuildBytes: opts.maxSyncCompletionRebuildBytes,
      completionRebuildBackoffMs: opts.completionRebuildBackoffMs,
    });
  }

  private resetJobsGenerationV1(): void {
    this.jobsDev = "";
    this.jobsIno = "";
    this.jobsOffset = 0;
    this.jobsCarry = Buffer.alloc(0);
    this.jobsObservedSize = 0;
    this.jobsMtimeNs = "";
    this.jobsCtimeNs = "";
    this.jobsAnchorOffset = 0;
    this.jobsAnchor = Buffer.alloc(0);
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

  private anchorMatchesV1(file: string, dev: string, ino: string): boolean {
    if (this.jobsAnchor.length) {
      const actual = this.readExactGenerationRangeV1(
        file,
        dev,
        ino,
        this.jobsAnchorOffset,
        this.jobsAnchor.length,
      );
      if (!actual || !actual.equals(this.jobsAnchor)) return false;
    }
    if (this.jobsCarry.length) {
      // VOID_JOBS_DATANET_WORKER_CARRY_SOURCE_WITNESS_V1
      const carryOffset = this.jobsOffset - this.jobsCarry.length;
      const actualCarry = this.readExactGenerationRangeV1(
        file,
        dev,
        ino,
        carryOffset,
        this.jobsCarry.length,
      );
      if (!actualCarry || !actualCarry.equals(this.jobsCarry)) return false;
    }
    return true;
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

  private refreshAnchorV1(file: string, dev: string, ino: string): boolean {
    const length = Math.min(JOBS_ANCHOR_BYTES_V1, this.jobsOffset);
    const offset = this.jobsOffset - length;
    const anchor = this.readExactGenerationRangeV1(
      file,
      dev,
      ino,
      offset,
      length,
    );
    if (!anchor) return false;
    this.jobsAnchorOffset = offset;
    this.jobsAnchor = anchor;
    return true;
  }

  private completionSnapshotV1(input: ScanInputV1): any {
    return this.completionIndex.completionTruthSnapshotV1([
      input.receiptsFile,
      input.jobStateFile,
      input.jobsFile,
    ]);
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
      metadataChanged &&
      size > this.jobsObservedSize &&
      !this.anchorMatchesV1(input.jobsFile, dev, ino)
    ) {
      // Growth is admissible only while the consumed-prefix tail remains exact.
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
    if (!this.refreshAnchorV1(input.jobsFile, dev, ino)) {
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
