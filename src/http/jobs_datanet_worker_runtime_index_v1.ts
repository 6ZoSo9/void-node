// @ts-nocheck
import * as fs from "node:fs";
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
};

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

  private jobsDev = "";
  private jobsIno = "";
  private jobsOffset = 0;
  private jobsCarry = "";
  private jobsSeen = new Set<string>();
  private pending = new Map<string, any>();
  private locallyDone = new Set<string>();
  private bytesReadTotal = 0;

  constructor(opts: {
    maxScanBytesPerTick?: number;
    maxJobsPerTick?: number;
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
    this.completionIndex = new AgentPick2JsonlSemanticIndexV1({
      maxSyncCompletionRebuildBytes: opts.maxSyncCompletionRebuildBytes,
      completionRebuildBackoffMs: opts.completionRebuildBackoffMs,
    });
  }

  private resetJobsGenerationV1(): void {
    this.jobsDev = "";
    this.jobsIno = "";
    this.jobsOffset = 0;
    this.jobsCarry = "";
    this.jobsSeen.clear();
    this.pending.clear();
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
      };
    }

    for (const id of Array.from(this.pending.keys())) {
      if (this.locallyDone.has(id) || completion.doneTruthHas(id)) {
        this.pending.delete(id);
        this.locallyDone.add(id);
      }
    }

    if (!fs.existsSync(input.jobsFile)) {
      return {
        ready: true,
        jobs: [],
        doneTruthHas: completion.doneTruthHas,
        holdReason: null,
        scanComplete: true,
        bytesReadThisTick: 0,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
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

    if (
      (this.jobsDev && (this.jobsDev !== dev || this.jobsIno !== ino)) ||
      size < this.jobsOffset
    ) {
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

      const text =
        this.jobsCarry +
        buffer.subarray(0, done).toString("utf8");
      const lines = text.split(/\r?\n/);
      this.jobsCarry = lines.pop() || "";

      if (
        Buffer.byteLength(this.jobsCarry, "utf8") >
        VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1
      ) {
        throw new Error(
          `VOID_JOBS_DATANET_WORKER_RECORD_TOO_LARGE file=${input.jobsFile}`,
        );
      }

      for (const raw of lines) {
        const line = String(raw || "").trim();
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
        if (!jobId || this.jobsSeen.has(jobId)) continue;
        this.jobsSeen.add(jobId);
        if (String(job?.status || "") !== "queued") continue;
        if (
          this.locallyDone.has(jobId) ||
          completion.doneTruthHas(jobId)
        ) {
          this.locallyDone.add(jobId);
          continue;
        }
        this.pending.set(jobId, job);
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
      };
    }

    const jobs: ScanJobV1[] = [];
    for (const [jobId, job] of this.pending) {
      if (
        this.locallyDone.has(jobId) ||
        completion.doneTruthHas(jobId)
      ) {
        this.pending.delete(jobId);
        this.locallyDone.add(jobId);
        continue;
      }
      jobs.push({ jobId, job });
      if (jobs.length >= this.maxJobsPerTick) break;
    }

    return {
      ready: true,
      jobs,
      doneTruthHas: completion.doneTruthHas,
      holdReason: null,
      scanComplete:
        Number(pathAfter.size) === this.jobsOffset &&
        this.jobsCarry.length === 0,
      bytesReadThisTick,
      bytesReadTotal: this.bytesReadTotal,
      completionIo: completion.io,
    };
  }

  markDone(jobId: string): void {
    const id = String(jobId || "").trim();
    if (!id) return;
    this.pending.delete(id);
    this.locallyDone.add(id);
  }
}
