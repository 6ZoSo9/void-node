// @ts-nocheck
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import { createHash } from "node:crypto";
import * as os from "node:os";
import * as path from "node:path";
import { TextDecoder } from "node:util";
import {
  AgentPick2JsonlSemanticIndexV1,
  VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1,
} from "./agent_pick2_jsonl_semantic_index_v1.js";

export const VOID_JOBS_DATANET_WORKER_RUNTIME_INDEX_V1 =
  "VOID_JOBS_DATANET_WORKER_RUNTIME_INDEX_V1";
export const VOID_JOBS_DATANET_WORKER_COMPLETION_CAPACITY_CONTRACT_V1 =
  "VOID_JOBS_DATANET_WORKER_COMPLETION_CAPACITY_CONTRACT_V1";
export const VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_AUTHORITY_IDS_V1 =
  64 * 1024;
export const VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_AUTHORITY_ID_BYTES_V1 =
  64 * 1024 * 1024;
export const VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_SOURCE_BYTES_V1 =
  1024 * 1024 * 1024;

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
  completionAuthorityLease: string;
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
    completionResidentIds: number;
    completionAuthorities: number;
    completionAuthorityIds: number;
    completionAuthorityIdBytes: number;
    completionAuthorityObjects: number;
    completionAuthorityObjectUpperBound: number;
    completionStagedAuthorityIds: number;
    completionStagedAuthorityIdBytes: number;
    completionStagedAuthorityObjects: number;
    completionResidualAuthorityIds: number;
    completionResidualAuthorityIdBytes: number;
    completionResidualAuthorityObjects: number;
    completionQuarantinedAuthorities: number;
    completionAuthorityMaxIds: number;
    completionAuthorityMaxIdBytes: number;
    completionSourceMaxBytes: number;
  };
};

type PendingJobV1 = {
  job: any;
  sourceStamp: FileStampV1 | null;
};

const UTF8_FATAL_V1 = new TextDecoder("utf-8", { fatal: true });
const COMPLETION_AUTHORITY_ROOTS_V1 = new Set<string>();
let completionAuthorityExitHookV1 = false;

function registerCompletionAuthorityRootV1(root: string): void {
  COMPLETION_AUTHORITY_ROOTS_V1.add(root);
  if (completionAuthorityExitHookV1) return;
  completionAuthorityExitHookV1 = true;
  process.once("exit", () => {
    for (const active of COMPLETION_AUTHORITY_ROOTS_V1) {
      try {
        fs.rmSync(active, { recursive: true, force: true });
      } catch (error) {
        // Process exit cannot publish completion truth; cleanup is best-effort
        // and has no authority-bearing failure to surface to a caller.
        void error;
      }
    }
  });
}

type FileStampV1 = {
  dev: string;
  ino: string;
  size: number;
  mtimeNs: string;
  ctimeNs: string;
};

type CompletionStateV1 = FileStampV1 & {
  authority: CompletionAuthorityV1;
};

type CompletionAuthorityStoreV1 = {
  root: string;
  nextGeneration: number;
  leaseId: number;
  leaseEpoch: number;
  quarantined: boolean;
  residualIds: number;
  residualIdBytes: number;
  residualObjects: number;
};

type CompletionAuthorityV1 = {
  store: CompletionAuthorityStoreV1;
  leaseEpoch: number;
  generation: number;
  idsIndexed: number;
  idBytesIndexed: number;
  objectsIndexed: number;
};

type CompletionAuthorityDeltaV1 = {
  base: CompletionAuthorityV1;
  generation: number;
  idsIndexed: number;
  idBytesIndexed: number;
  objectsIndexed: number;
  createdFiles: string[];
  createdDirs: string[];
  settled: boolean;
};

type RuntimeIndexTestHooksV1 = {
  afterSourceObserved?: (ctx: {
    file: string;
    observed: FileStampV1;
    attempt: number;
  }) => void;
  beforeCompletionDeltaLeafWrite?: (ctx: {
    file: string;
    id: string;
    stagedIds: number;
  }) => void;
  beforeAsyncCompletionDeltaCommit?: (ctx: {
    file: string;
    stagedIds: number;
    stagedIdBytes: number;
  }) => void | Promise<void>;
  beforeCompletionDeltaRollbackUnlink?: (ctx: {
    file: string;
    generation: number;
    path: string;
  }) => void;
  beforeCompletionAcceptedMarkerLookup?: (ctx: {
    generation: number;
    path: string;
  }) => void;
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
  private readonly maxCompletionAuthorityIds: number;
  private readonly maxCompletionAuthorityIdBytes: number;
  private readonly maxCompletionSourceBytes: number;
  private readonly completionRebuildBackoffMs: number;
  private readonly testHooks: RuntimeIndexTestHooksV1;

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
  private completionAuthorityLeaseSequence = 0;
  private readonly completions = new Map<string, CompletionStateV1>();
  private readonly completionWarmTasks = new Map<string, Promise<void>>();
  private readonly completionWarmAuthorities = new Map<
    string,
    CompletionAuthorityV1
  >();
  private readonly completionWarmDeltas = new Map<
    string,
    CompletionAuthorityDeltaV1
  >();
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
    async_full_history_starts_total: 0,
    async_incremental_starts_total: 0,
    authority_records_indexed_total: 0,
    authority_ids_high_water: 0,
    authority_id_bytes_high_water: 0,
    authority_objects_high_water: 1,
    authority_object_upper_bound_high_water: 1,
    authority_staged_ids_high_water: 0,
    authority_staged_id_bytes_high_water: 0,
    authority_staged_objects_high_water: 0,
    authority_capacity_holds_total: 0,
    completion_source_bytes_high_water: 0,
    completion_source_capacity_holds_total: 0,
    authority_lookup_bytes_max: 0,
    authority_lookup_versions_max: 0,
    authority_cleanup_failures_total: 0,
  };

  constructor(opts: {
    maxScanBytesPerTick?: number;
    maxJobsPerTick?: number;
    maxLocallyDoneIds?: number;
    maxSyncCompletionRebuildBytes?: number;
    maxCompletionAuthorityIds?: number;
    maxCompletionAuthorityIdBytes?: number;
    maxCompletionSourceBytes?: number;
    completionRebuildBackoffMs?: number;
    testHooks?: RuntimeIndexTestHooksV1;
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
    this.maxCompletionAuthorityIds = boundedIntV1(
      opts.maxCompletionAuthorityIds ??
        process.env.VOID_JOBS_WORKER_MAX_COMPLETION_AUTHORITY_IDS,
      VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_AUTHORITY_IDS_V1,
      1,
      VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_AUTHORITY_IDS_V1,
    );
    this.maxCompletionAuthorityIdBytes = boundedIntV1(
      opts.maxCompletionAuthorityIdBytes ??
        process.env.VOID_JOBS_WORKER_MAX_COMPLETION_AUTHORITY_ID_BYTES,
      VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_AUTHORITY_ID_BYTES_V1,
      1,
      VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_AUTHORITY_ID_BYTES_V1,
    );
    this.maxCompletionSourceBytes = boundedIntV1(
      opts.maxCompletionSourceBytes ??
        process.env.VOID_JOBS_WORKER_MAX_COMPLETION_SOURCE_BYTES,
      VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_SOURCE_BYTES_V1,
      1,
      VOID_JOBS_DATANET_WORKER_MAX_COMPLETION_SOURCE_BYTES_V1,
    );
    this.completionRebuildBackoffMs = boundedIntV1(
      opts.completionRebuildBackoffMs,
      30_000,
      1,
      60 * 60 * 1000,
    );
    this.testHooks = opts.testHooks || {};
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
    const authorities = new Map<string, CompletionAuthorityV1>();
    for (const state of this.completions.values()) {
      const root = state.authority.store.root;
      if (root) {
        const prior = authorities.get(root);
        if (!prior || state.authority.generation > prior.generation) {
          authorities.set(root, state.authority);
        }
      }
    }
    for (const authority of this.completionWarmAuthorities.values()) {
      const root = authority.store.root;
      if (root && !authorities.has(root)) authorities.set(root, authority);
    }
    let completionAuthorityIds = 0;
    let completionAuthorityIdBytes = 0;
    let completionAuthorityObjects = 0;
    let completionResidualAuthorityIds = 0;
    let completionResidualAuthorityIdBytes = 0;
    let completionResidualAuthorityObjects = 0;
    let completionQuarantinedAuthorities = 0;
    for (const authority of authorities.values()) {
      completionAuthorityIds += authority.idsIndexed;
      completionAuthorityIdBytes += authority.idBytesIndexed;
      completionAuthorityObjects += authority.objectsIndexed;
      completionResidualAuthorityIds += authority.store.residualIds;
      completionResidualAuthorityIdBytes += authority.store.residualIdBytes;
      completionResidualAuthorityObjects += authority.store.residualObjects;
      completionQuarantinedAuthorities += authority.store.quarantined ? 1 : 0;
    }
    let completionStagedAuthorityIds = 0;
    let completionStagedAuthorityIdBytes = 0;
    let completionStagedAuthorityObjects = 0;
    for (const delta of this.completionWarmDeltas.values()) {
      if (delta.settled) continue;
      completionStagedAuthorityIds += delta.idsIndexed;
      completionStagedAuthorityIdBytes += delta.idBytesIndexed;
      completionStagedAuthorityObjects += delta.objectsIndexed;
    }
    return {
      pendingIds: this.pending.size,
      locallyDoneIds: this.locallyDone.size,
      carryBytes: this.jobsCarry.length,
      pendingSourceBytes: this.pendingSource.length,
      // Exact completion identity authority lives in a private disk-backed
      // cache. Only these fixed-size handles remain resident as H grows.
      completionResidentIds: 0,
      completionAuthorities: authorities.size,
      completionAuthorityIds,
      completionAuthorityIdBytes,
      completionAuthorityObjects:
        completionAuthorityObjects +
        completionStagedAuthorityObjects +
        completionResidualAuthorityObjects,
      completionStagedAuthorityIds,
      completionStagedAuthorityIdBytes,
      completionStagedAuthorityObjects,
      completionResidualAuthorityIds,
      completionResidualAuthorityIdBytes,
      completionResidualAuthorityObjects,
      completionQuarantinedAuthorities,
      // Each store owns its root, accepted-generation directory, initial
      // generation marker, and at most five published objects per ID. Staged
      // objects are reported exactly until accepted or rolled back.
      completionAuthorityObjectUpperBound:
        authorities.size * 3 +
        completionAuthorityIds * 5 +
        completionStagedAuthorityObjects +
        completionResidualAuthorityObjects,
      completionAuthorityMaxIds: this.maxCompletionAuthorityIds,
      completionAuthorityMaxIdBytes: this.maxCompletionAuthorityIdBytes,
      completionSourceMaxBytes: this.maxCompletionSourceBytes,
    };
  }

  private createCompletionAuthorityV1(): CompletionAuthorityV1 {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-jobs-completion-authority-"),
    );
    fs.chmodSync(root, 0o700);
    const accepted = path.join(root, "accepted");
    fs.mkdirSync(accepted, { mode: 0o700 });
    fs.writeFileSync(path.join(accepted, "1"), "cold\n", {
      flag: "wx",
      mode: 0o600,
    });
    registerCompletionAuthorityRootV1(root);
    this.completionMetrics.authority_objects_high_water = Math.max(
      this.completionMetrics.authority_objects_high_water,
      3,
    );
    this.completionMetrics.authority_object_upper_bound_high_water = Math.max(
      this.completionMetrics.authority_object_upper_bound_high_water,
      3,
    );
    return {
      store: {
        root,
        nextGeneration: 2,
        leaseId: ++this.completionAuthorityLeaseSequence,
        leaseEpoch: 1,
        quarantined: false,
        residualIds: 0,
        residualIdBytes: 0,
        residualObjects: 0,
      },
      leaseEpoch: 1,
      generation: 1,
      idsIndexed: 0,
      idBytesIndexed: 0,
      objectsIndexed: 3,
    };
  }

  private assertCompletionSourceCapacityV1(
    file: string,
    target: FileStampV1,
  ): void {
    this.completionMetrics.completion_source_bytes_high_water = Math.max(
      this.completionMetrics.completion_source_bytes_high_water,
      Math.min(target.size, this.maxCompletionSourceBytes),
    );
    if (target.size <= this.maxCompletionSourceBytes) return;
    this.completionMetrics.completion_source_capacity_holds_total += 1;
    throw new Error(
      `VOID_JOBS_DATANET_WORKER_COMPLETION_SOURCE_CAPACITY_HOLD file=${file} bytes=${target.size} max_bytes=${this.maxCompletionSourceBytes}`,
    );
  }

  private retireCompletionAuthorityV1(
    authority: CompletionAuthorityV1 | null | undefined,
  ): void {
    if (!authority?.store.root) return;
    const root = authority.store.root;
    authority.store.leaseEpoch += 1;
    authority.store.root = "";
    COMPLETION_AUTHORITY_ROOTS_V1.delete(root);
    void fsp.rm(root, { recursive: true, force: true }).catch(() => {
      this.completionMetrics.authority_cleanup_failures_total += 1;
      COMPLETION_AUTHORITY_ROOTS_V1.add(root);
    });
  }

  private createCompletionAuthorityDirV1(
    dir: string,
    delta: CompletionAuthorityDeltaV1 | null,
    authority: CompletionAuthorityV1,
  ): void {
    try {
      fs.mkdirSync(dir, { mode: 0o700 });
      if (delta) {
        delta.createdDirs.push(dir);
        delta.objectsIndexed += 1;
      } else {
        authority.objectsIndexed += 1;
      }
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      const stat = fs.lstatSync(dir);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error(
          "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_INVALID_DIRECTORY",
        );
      }
    }
  }

  private completionAuthorityVersionPathV1(
    authority: CompletionAuthorityV1,
    id: string,
    generation: number,
    createShards: boolean,
    delta: CompletionAuthorityDeltaV1 | null = null,
  ): { file: string; versions: string; bytes: Buffer } {
    if (authority.leaseEpoch !== authority.store.leaseEpoch) {
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_SNAPSHOT_EXPIRED " +
          `lease_id=${authority.store.leaseId} ` +
          `expected_epoch=${authority.leaseEpoch} ` +
          `current_epoch=${authority.store.leaseEpoch}`,
      );
    }
    const root = authority.store.root;
    if (!root) {
      throw new Error("VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_RETIRED");
    }
    const bytes = Buffer.from(id, "utf8");
    if (
      bytes.length === 0 ||
      bytes.length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1
    ) {
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_ID_OUT_OF_RANGE",
      );
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    const first = path.join(root, digest.slice(0, 2));
    const second = path.join(first, digest.slice(2, 4));
    const versions = path.join(second, digest.slice(4));
    if (createShards) {
      this.createCompletionAuthorityDirV1(first, delta, authority);
      this.createCompletionAuthorityDirV1(second, delta, authority);
      this.createCompletionAuthorityDirV1(versions, delta, authority);
    }
    return { file: path.join(versions, String(generation)), versions, bytes };
  }

  private completionGenerationAcceptedV1(
    authority: CompletionAuthorityV1,
    generation: number,
  ): boolean {
    if (generation > authority.generation || generation < 1) return false;
    const marker = path.join(
      authority.store.root,
      "accepted",
      String(generation),
    );
    try {
      this.testHooks.beforeCompletionAcceptedMarkerLookup?.({
        generation,
        path: marker,
      });
      const stat = fs.lstatSync(marker);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error("VOID_COMPLETION_ACCEPTED_MARKER_WRONG_TYPE");
      }
      return true;
    } catch (error: any) {
      const cause = String(error?.code || error?.message || "UNKNOWN").replace(
        /\s+/g,
        "_",
      );
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_INTEGRITY_HOLD " +
          `lease_id=${authority.store.leaseId} ` +
          `generation=${generation} cause=${cause}`,
      );
    }
  }

  private addCompletionAuthorityIdV1(
    authority: CompletionAuthorityV1,
    id: string,
  ): void {
    // Resolve and validate duplicates before creating shard directories. A
    // capacity HOLD therefore cannot consume another inode or publish a
    // provisional leaf outside the reviewed aggregate contract.
    if (this.completionAuthorityHasV1(authority, id)) return;
    const entry = this.completionAuthorityVersionPathV1(
      authority,
      id,
      authority.generation,
      false,
    );

    const nextIds = authority.idsIndexed + 1;
    const nextIdBytes = authority.idBytesIndexed + entry.bytes.length;
    if (
      nextIds > this.maxCompletionAuthorityIds ||
      nextIdBytes > this.maxCompletionAuthorityIdBytes
    ) {
      this.completionMetrics.authority_capacity_holds_total += 1;
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_CAPACITY_HOLD " +
          `ids=${nextIds} max_ids=${this.maxCompletionAuthorityIds} ` +
          `id_bytes=${nextIdBytes} max_id_bytes=${this.maxCompletionAuthorityIdBytes}`,
      );
    }

    this.completionAuthorityVersionPathV1(
      authority,
      id,
      authority.generation,
      true,
    );
    try {
      fs.writeFileSync(entry.file, entry.bytes, {
        flag: "wx",
        mode: 0o600,
      });
      authority.idsIndexed = nextIds;
      authority.idBytesIndexed = nextIdBytes;
      authority.objectsIndexed += 1;
      this.completionMetrics.authority_records_indexed_total += 1;
      this.completionMetrics.authority_ids_high_water = Math.max(
        this.completionMetrics.authority_ids_high_water,
        authority.idsIndexed,
      );
      this.completionMetrics.authority_id_bytes_high_water = Math.max(
        this.completionMetrics.authority_id_bytes_high_water,
        authority.idBytesIndexed,
      );
      this.completionMetrics.authority_objects_high_water = Math.max(
        this.completionMetrics.authority_objects_high_water,
        authority.objectsIndexed,
      );
      this.completionMetrics.authority_object_upper_bound_high_water = Math.max(
        this.completionMetrics.authority_object_upper_bound_high_water,
        3 + authority.idsIndexed * 5,
      );
      return;
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
    }
    const present = this.readCompletionAuthorityEntryV1(entry.file);
    if (!present) {
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_DISAPPEARED",
      );
    }
    this.completionMetrics.authority_lookup_bytes_max = Math.max(
      this.completionMetrics.authority_lookup_bytes_max,
      present.length,
    );
    if (!present.equals(entry.bytes)) {
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_IDENTITY_COLLISION",
      );
    }
  }

  private stageCompletionAuthorityIdV1(
    file: string,
    authority: CompletionAuthorityV1,
    delta: CompletionAuthorityDeltaV1,
    id: string,
  ): void {
    if (this.completionAuthorityHasV1(authority, id)) return;
    const entry = this.completionAuthorityVersionPathV1(
      authority,
      id,
      delta.generation,
      false,
    );
    const staged = this.readCompletionAuthorityEntryV1(entry.file);
    if (staged) {
      if (!staged.equals(entry.bytes)) {
        throw new Error(
          "VOID_JOBS_DATANET_WORKER_COMPLETION_IDENTITY_COLLISION",
        );
      }
      return;
    }
    const nextIds = authority.idsIndexed + delta.idsIndexed + 1;
    const nextIdBytes =
      authority.idBytesIndexed + delta.idBytesIndexed + entry.bytes.length;
    if (
      nextIds > this.maxCompletionAuthorityIds ||
      nextIdBytes > this.maxCompletionAuthorityIdBytes
    ) {
      this.completionMetrics.authority_capacity_holds_total += 1;
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_CAPACITY_HOLD " +
          `ids=${nextIds} max_ids=${this.maxCompletionAuthorityIds} ` +
          `id_bytes=${nextIdBytes} max_id_bytes=${this.maxCompletionAuthorityIdBytes}`,
      );
    }
    this.testHooks.beforeCompletionDeltaLeafWrite?.({
      file,
      id,
      stagedIds: delta.idsIndexed,
    });
    this.completionAuthorityVersionPathV1(
      authority,
      id,
      delta.generation,
      true,
      delta,
    );
    fs.writeFileSync(entry.file, entry.bytes, { flag: "wx", mode: 0o600 });
    delta.createdFiles.push(entry.file);
    delta.idsIndexed += 1;
    delta.idBytesIndexed += entry.bytes.length;
    delta.objectsIndexed += 1;
    this.completionMetrics.authority_staged_ids_high_water = Math.max(
      this.completionMetrics.authority_staged_ids_high_water,
      delta.idsIndexed,
    );
    this.completionMetrics.authority_staged_id_bytes_high_water = Math.max(
      this.completionMetrics.authority_staged_id_bytes_high_water,
      delta.idBytesIndexed,
    );
    this.completionMetrics.authority_staged_objects_high_water = Math.max(
      this.completionMetrics.authority_staged_objects_high_water,
      delta.objectsIndexed,
    );
  }

  private createCompletionAuthorityDeltaV1(
    authority: CompletionAuthorityV1,
  ): CompletionAuthorityDeltaV1 {
    if (authority.store.quarantined) {
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_QUARANTINED " +
          `lease_id=${authority.store.leaseId} ` +
          `residual_ids=${authority.store.residualIds} ` +
          `residual_id_bytes=${authority.store.residualIdBytes} ` +
          `residual_objects=${authority.store.residualObjects}`,
      );
    }
    return {
      base: authority,
      generation: authority.store.nextGeneration++,
      idsIndexed: 0,
      idBytesIndexed: 0,
      objectsIndexed: 0,
      createdFiles: [],
      createdDirs: [],
      settled: false,
    };
  }

  private commitCompletionAuthorityDeltaV1(
    authority: CompletionAuthorityV1,
    delta: CompletionAuthorityDeltaV1,
  ): CompletionAuthorityV1 {
    if (delta.settled) {
      throw new Error("VOID_JOBS_DATANET_WORKER_COMPLETION_DELTA_SETTLED");
    }
    if (
      authority.idsIndexed + delta.idsIndexed >
        this.maxCompletionAuthorityIds ||
      authority.idBytesIndexed + delta.idBytesIndexed >
        this.maxCompletionAuthorityIdBytes
    ) {
      throw new Error(
        "VOID_JOBS_DATANET_WORKER_COMPLETION_DELTA_ADMISSION_LOST",
      );
    }
    if (delta.idsIndexed === 0) {
      delta.settled = true;
      return authority;
    }
    const published: CompletionAuthorityV1 = {
      store: authority.store,
      leaseEpoch: authority.leaseEpoch,
      generation: delta.generation,
      idsIndexed: authority.idsIndexed + delta.idsIndexed,
      idBytesIndexed: authority.idBytesIndexed + delta.idBytesIndexed,
      objectsIndexed: authority.objectsIndexed + delta.objectsIndexed + 1,
    };
    // This marker is the sole publication point. Provisional leaves are exact
    // but invisible to every authority generation until the marker exists.
    const acceptedDir = path.join(authority.store.root, "accepted");
    const marker = path.join(acceptedDir, String(delta.generation));
    const markerTemp = path.join(
      acceptedDir,
      `.${delta.generation}.${process.pid}.tmp`,
    );
    try {
      fs.writeFileSync(
        markerTemp,
        `${delta.idsIndexed} ${delta.idBytesIndexed}\n`,
        { flag: "wx", mode: 0o600 },
      );
      fs.renameSync(markerTemp, marker);
    } catch (error) {
      try {
        fs.unlinkSync(markerTemp);
      } catch (cleanupError: any) {
        if (cleanupError?.code !== "ENOENT") {
          this.completionMetrics.authority_cleanup_failures_total += 1;
        }
      }
      throw error;
    }
    delta.settled = true;
    this.completionMetrics.authority_records_indexed_total += delta.idsIndexed;
    this.completionMetrics.authority_ids_high_water = Math.max(
      this.completionMetrics.authority_ids_high_water,
      published.idsIndexed,
    );
    this.completionMetrics.authority_id_bytes_high_water = Math.max(
      this.completionMetrics.authority_id_bytes_high_water,
      published.idBytesIndexed,
    );
    this.completionMetrics.authority_objects_high_water = Math.max(
      this.completionMetrics.authority_objects_high_water,
      published.objectsIndexed,
    );
    this.completionMetrics.authority_object_upper_bound_high_water = Math.max(
      this.completionMetrics.authority_object_upper_bound_high_water,
      3 + published.idsIndexed * 5,
    );
    return published;
  }

  private rollbackCompletionAuthorityDeltaV1(
    file: string,
    delta: CompletionAuthorityDeltaV1 | null,
  ): void {
    if (!delta || delta.settled) return;
    let failed = false;
    for (const createdFile of [...delta.createdFiles].reverse()) {
      try {
        this.testHooks.beforeCompletionDeltaRollbackUnlink?.({
          file,
          generation: delta.generation,
          path: createdFile,
        });
        fs.unlinkSync(createdFile);
      } catch (error: any) {
        if (error?.code !== "ENOENT") failed = true;
      }
    }
    for (const dir of [...delta.createdDirs].reverse()) {
      try {
        fs.rmdirSync(dir);
      } catch (error: any) {
        if (error?.code !== "ENOENT") failed = true;
      }
    }
    const survivingFiles = delta.createdFiles.filter((createdFile) => {
      try {
        fs.lstatSync(createdFile);
        return true;
      } catch (error: any) {
        if (error?.code !== "ENOENT") failed = true;
        return false;
      }
    });
    const survivingDirs = delta.createdDirs.filter((createdDir) => {
      try {
        fs.lstatSync(createdDir);
        return true;
      } catch (error: any) {
        if (error?.code !== "ENOENT") failed = true;
        return false;
      }
    });
    let survivingIdBytes = 0;
    for (const survivingFile of survivingFiles) {
      try {
        survivingIdBytes += Number(fs.lstatSync(survivingFile).size);
      } catch (error: any) {
        if (error?.code !== "ENOENT") failed = true;
      }
    }
    if (failed || survivingFiles.length > 0 || survivingDirs.length > 0) {
      // Cleanup uncertainty permanently quarantines this store. Retain a
      // conservative scalar residual-debt bound in operator state and prohibit
      // every later delta, so repeated retries cannot accumulate unaccepted
      // generations or grow per-lookup version enumeration outside the
      // declared bound.
      delta.base.store.quarantined = true;
      delta.base.store.residualIds += Math.max(
        survivingFiles.length,
        failed ? delta.idsIndexed : 0,
      );
      delta.base.store.residualIdBytes += Math.max(
        survivingIdBytes,
        failed ? delta.idBytesIndexed : 0,
      );
      delta.base.store.residualObjects += Math.max(
        survivingFiles.length + survivingDirs.length,
        failed ? delta.objectsIndexed : 0,
      );
      this.completionMetrics.authority_cleanup_failures_total += 1;
    }
    delta.createdFiles.length = 0;
    delta.createdDirs.length = 0;
    delta.idsIndexed = 0;
    delta.idBytesIndexed = 0;
    delta.objectsIndexed = 0;
    delta.settled = true;
  }

  private completionAuthorityHasV1(
    authority: CompletionAuthorityV1,
    id: string,
  ): boolean {
    const entry = this.completionAuthorityVersionPathV1(
      authority,
      id,
      authority.generation,
      false,
    );
    let versions: string[];
    try {
      versions = fs.readdirSync(entry.versions);
    } catch (error: any) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
    this.completionMetrics.authority_lookup_versions_max = Math.max(
      this.completionMetrics.authority_lookup_versions_max,
      versions.length,
    );
    for (const name of versions) {
      if (!/^\d+$/.test(name)) continue;
      const generation = Number(name);
      if (!this.completionGenerationAcceptedV1(authority, generation)) continue;
      const present = this.readCompletionAuthorityEntryV1(
        path.join(entry.versions, name),
      );
      if (!present) continue;
      this.completionMetrics.authority_lookup_bytes_max = Math.max(
        this.completionMetrics.authority_lookup_bytes_max,
        present.length,
      );
      if (!present.equals(entry.bytes)) {
        throw new Error(
          "VOID_JOBS_DATANET_WORKER_COMPLETION_IDENTITY_COLLISION",
        );
      }
      return true;
    }
    return false;
  }

  private readCompletionAuthorityEntryV1(file: string): Buffer | null {
    const flags = fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
    let fd: number;
    try {
      fd = fs.openSync(file, flags);
    } catch (error: any) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    try {
      const before = fs.fstatSync(fd, { bigint: true } as any);
      const length = Number(before.size);
      if (
        !before.isFile() ||
        length <= 0 ||
        length > VOID_AGENT_PICK2_JSONL_MAX_RECORD_BYTES_V1
      ) {
        throw new Error(
          "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_INVALID",
        );
      }
      const bytes = Buffer.allocUnsafe(length);
      let done = 0;
      while (done < length) {
        const read = fs.readSync(fd, bytes, done, length - done, done);
        if (read <= 0) {
          throw new Error(
            "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_SHORT_READ",
          );
        }
        done += read;
      }
      const after = fs.fstatSync(fd, { bigint: true } as any);
      if (
        !after.isFile() ||
        String(after.dev) !== String(before.dev) ||
        String(after.ino) !== String(before.ino) ||
        Number(after.size) !== length ||
        String((after as any).mtimeNs) !== String((before as any).mtimeNs) ||
        String((after as any).ctimeNs) !== String((before as any).ctimeNs)
      ) {
        throw new Error(
          "VOID_JOBS_DATANET_WORKER_COMPLETION_AUTHORITY_CHANGED",
        );
      }
      return bytes;
    } finally {
      fs.closeSync(fd);
    }
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

  private pendingUseAuthorityV1(
    file: string,
    jobId: string,
    expected: FileStampV1 | null,
  ): void {
    const observed = fileStampV1(file);
    const admitted = observed ? this.admitSourceV1(file) : null;
    const current = fileStampV1(file);
    const valid =
      !!expected &&
      !!observed &&
      !!admitted?.ok &&
      !!admitted.stamp &&
      !!current &&
      sameStampV1(expected, observed) &&
      sameStampV1(expected, admitted.stamp) &&
      sameStampV1(expected, current) &&
      this.pendingWitnessesMatchV1(file, expected.dev, expected.ino);
    if (valid) return;

    this.resetJobsGenerationV1();
    throw new Error(
      `VOID_JOBS_DATANET_WORKER_COMPLETION_HOLD VOID_JOBS_DATANET_WORKER_PENDING_USE_AUTHORITY_CHANGED job_id=${jobId} file=${file}`,
    );
  }

  private pendingJobForUseV1(
    file: string,
    jobId: string,
    entry: PendingJobV1,
  ): any {
    const validate = () =>
      this.pendingUseAuthorityV1(file, jobId, entry.sourceStamp);
    return new Proxy(entry.job, {
      get: (target, property, receiver) => {
        // processJob consumes the cached payload through property reads. Bind
        // every such use to the exact canonical mutation generation admitted
        // by scan(), including the final status/meta reads before its first
        // state publication.
        validate();
        return Reflect.get(target, property, receiver);
      },
      has: (target, property) => {
        validate();
        return Reflect.has(target, property);
      },
      ownKeys: (target) => {
        validate();
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor: (target, property) => {
        validate();
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
  }

  private canonicalAppendActiveV1(file: string): boolean {
    return fs.existsSync(
      `${path.resolve(String(file || ""))}.void-pick2-append.lock`,
    );
  }

  private async openCompletionReadHandleV1(
    file: string,
    flags: number,
  ): Promise<any> {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      try {
        return await fsp.open(file, flags);
      } catch (error: any) {
        if (
          error?.code !== "ENOENT" ||
          (!this.canonicalAppendActiveV1(file) && !fileStampV1(file))
        ) {
          throw error;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 1));
      }
    }
    throw new Error(
      `VOID_JOBS_DATANET_WORKER_COMPLETION_CANONICAL_OPEN_TIMEOUT file=${file}`,
    );
  }

  private admitSourceV1(file: string): {
    ok: boolean;
    stamp: FileStampV1 | null;
  } {
    // VOID_JOBS_DATANET_WORKER_APPEND_CONTINUITY_AUTHORITY_V1
    // Reuse the canonical writer's exact before/after witness chain. A fixed
    // suffix cannot authorize an older-prefix mutation followed by growth.
    const prior = this.admittedStamps.get(file);
    const missesAtAdmissionStart = this.authorityWitnessMisses;
    let lastCurrent: FileStampV1 | null = null;

    // A canonical append may land between the outer stamp sample and the
    // semantic authority snapshot. Retry that observation window so the final
    // admitted generation is itself sampled stably and the authority index has
    // verified the complete prior -> current witness chain. Keep one miss
    // baseline for the whole admission: a hostile/unwitnessed transition on an
    // earlier attempt must not be forgotten merely because a later sample is
    // stable.
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const observed = fileStampV1(file);
      if (!observed) {
        this.admittedStamps.delete(file);
        return { ok: true, stamp: null };
      }

      this.testHooks.afterSourceObserved?.({
        file,
        observed: { ...observed },
        attempt,
      });

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
      lastCurrent = current;
      if (!current || !sameStampV1(observed, current)) continue;

      const exactAppend =
        !!prior &&
        sameObjectV1(prior, current) &&
        current.size > prior.size &&
        missesAfter === missesAtAdmissionStart;
      const ok = !prior || sameStampV1(prior, current) || exactAppend;
      if (!ok) {
        // A rejected observation is not a new admission baseline. Otherwise a
        // stable hostile generation can present as B -> B after backoff and
        // self-authorize an incremental read from the still-live G authority.
        this.rejectedSources.add(file);
      } else {
        this.admittedStamps.set(file, current);
      }
      return { ok, stamp: current };
    }

    this.rejectedSources.add(file);
    return { ok: false, stamp: lastCurrent };
  }

  private addCompletionBytesV1(
    file: string,
    authority: CompletionAuthorityV1,
    priorCarry: Buffer,
    chunk: Buffer,
    delta: CompletionAuthorityDeltaV1 | null = null,
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
      if (id) {
        if (delta) this.stageCompletionAuthorityIdV1(file, authority, delta, id);
        else this.addCompletionAuthorityIdV1(authority, id);
      }
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
    authority: CompletionAuthorityV1,
    delta: CompletionAuthorityDeltaV1 | null,
  ): CompletionStateV1 {
    this.assertCompletionSourceCapacityV1(file, target);
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
        authority,
        Buffer.alloc(0),
        bytes,
        delta,
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
      const published = delta
        ? this.commitCompletionAuthorityDeltaV1(authority, delta)
        : authority;
      return { ...target, authority: published };
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
    this.assertCompletionSourceCapacityV1(file, initialTarget);
    this.completionMetrics.rebuilds_total += base ? 0 : 1;
    this.completionMetrics.incremental_reads_total += base ? 1 : 0;
    this.completionMetrics.async_warms_total += 1;
    const initialPosition = Number(base?.size || 0);
    if (initialPosition === 0 && initialTarget.size > 0) {
      this.completionMetrics.async_full_history_starts_total += 1;
    } else {
      this.completionMetrics.async_incremental_starts_total += 1;
    }

    // Append updates stage only their bounded delta until the complete source
    // generation is witnessed. Cold rebuilds get a fresh private authority.
    // Neither path copies or enumerates H IDs.
    const authority = base?.authority || this.createCompletionAuthorityV1();
    const delta: CompletionAuthorityDeltaV1 | null = base
      ? this.createCompletionAuthorityDeltaV1(authority)
      : null;
    this.completionWarmAuthorities.set(file, authority);
    if (delta) this.completionWarmDeltas.set(file, delta);

    const task = (async () => {
      let position = initialPosition;
      let target = initialTarget;

      for (;;) {
        this.assertCompletionSourceCapacityV1(file, target);
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
          this.assertCompletionSourceCapacityV1(file, target);
        }
        const flags = fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
        const handle: any = await this.openCompletionReadHandleV1(file, flags);
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
              this.assertCompletionSourceCapacityV1(file, target);
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
              authority,
              carry,
              Buffer.from(buffer.subarray(0, bytesRead)),
              delta,
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
          if (delta) {
            await this.testHooks.beforeAsyncCompletionDeltaCommit?.({
              file,
              stagedIds: delta.idsIndexed,
              stagedIdBytes: delta.idBytesIndexed,
            });
          }
          const afterBarrier = fileStampV1(file);
          if (!afterBarrier || !sameStampV1(afterBarrier, target)) {
            const advanced = this.admitSourceV1(file);
            if (
              !advanced.ok ||
              !advanced.stamp ||
              !sameObjectV1(target, advanced.stamp) ||
              advanced.stamp.size <= target.size
            ) {
              throw new Error(
                `VOID_JOBS_DATANET_WORKER_COMPLETION_UNWITNESSED_CHANGE file=${file}`,
              );
            }
            target = advanced.stamp;
            continue;
          }
          const published = delta
            ? this.commitCompletionAuthorityDeltaV1(authority, delta)
            : authority;
          this.completions.set(file, { ...target, authority: published });
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
        this.assertCompletionSourceCapacityV1(file, target);
      }
    })();

    this.completionWarmTasks.set(file, task);
    task.then(
      () => {
        if (this.completionWarmTasks.get(file) === task) {
          this.completionWarmTasks.delete(file);
          this.completionWarmAuthorities.delete(file);
          this.completionWarmDeltas.delete(file);
        }
      },
      () => {
        this.rollbackCompletionAuthorityDeltaV1(file, delta);
        if (base) {
          this.completions.set(file, base);
        } else {
          this.completions.delete(file);
          this.retireCompletionAuthorityV1(authority);
          this.rejectedSources.add(file);
        }
        this.completionHoldUntil.set(
          file,
          Date.now() + this.completionRebuildBackoffMs,
        );
        if (this.completionWarmTasks.get(file) === task) {
          this.completionWarmTasks.delete(file);
          this.completionWarmAuthorities.delete(file);
          this.completionWarmDeltas.delete(file);
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
      this.retireCompletionAuthorityV1(prior?.authority);
      const empty: CompletionStateV1 = {
        dev: "-1",
        ino: "-1",
        size: 0,
        mtimeNs: "-1",
        ctimeNs: "-1",
        authority: this.createCompletionAuthorityV1(),
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
      this.retireCompletionAuthorityV1(prior?.authority);
      this.completions.delete(file);
      prior = undefined;
      // Recovery from a rejected lineage is an explicit byte-zero generation
      // rebuild. Clear both the rejected stamp and its prior comparison point;
      // never let a rejected B become G's incremental successor via B -> B.
      this.admittedStamps.delete(file);
      this.rejectedSources.delete(file);
    }

    const admitted = this.admitSourceV1(file);
    const append =
      !!prior &&
      admitted.ok &&
      !!admitted.stamp &&
      sameObjectV1(prior, admitted.stamp) &&
      admitted.stamp.size > prior.size;
    if (prior && !sameStampV1(prior, current) && !append) {
      this.retireCompletionAuthorityV1(prior.authority);
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
    this.assertCompletionSourceCapacityV1(file, admitted.stamp);

    const start = append ? prior!.size : 0;
    const bytes = admitted.stamp.size - start;
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
    const authority = append
      ? prior!.authority
      : this.createCompletionAuthorityV1();
    const delta: CompletionAuthorityDeltaV1 | null = append
      ? this.createCompletionAuthorityDeltaV1(authority)
      : null;
    this.completionMetrics.rebuilds_total += append ? 0 : 1;
    this.completionMetrics.incremental_reads_total += append ? 1 : 0;
    let state: CompletionStateV1;
    try {
      state = this.readCompletionRangeSyncV1(
        file,
        start,
        admitted.stamp,
        authority,
        delta,
      );
    } catch (error) {
      this.rollbackCompletionAuthorityDeltaV1(file, delta);
      if (append) {
        this.completions.set(file, prior!);
      } else {
        this.completions.delete(file);
        this.retireCompletionAuthorityV1(authority);
      }
      throw error;
    }
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
      const lease = states
        .map(
          (state) =>
            `${state.authority.store.leaseId}:${state.authority.leaseEpoch}`,
        )
        .join("|");
      return {
        ready: true,
        doneTruthHas: (id: string) => {
          const key = String(id || "").trim();
          return (
            !!key &&
            states.some((state) =>
              this.completionAuthorityHasV1(state.authority, key),
            )
          );
        },
        io: { ...this.completionMetrics },
        lease,
        holdReason: null,
      };
    } catch (error: any) {
      const holdReason = String(error?.message || error || "");
      return {
        ready: false,
        doneTruthHas: (_id: string) => false,
        io: { ...this.completionMetrics },
        lease: "",
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
    const key = String(id || "").trim();
    const entry = this.pending.get(key);
    if (entry) {
      this.pendingUseAuthorityV1(input.jobsFile, key, entry.sourceStamp);
    }
    return snapshot.doneTruthHas(key);
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
        completionAuthorityLease: completion.lease,
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
        completionAuthorityLease: completion.lease,
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
          sourceStamp: null,
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
        completionAuthorityLease: completion.lease,
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
        completionAuthorityLease: completion.lease,
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
        completionAuthorityLease: completion.lease,
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
        completionAuthorityLease: completion.lease,
        holdReason: "jobs_source_witness_changed",
        scanComplete: false,
        bytesReadThisTick,
        bytesReadTotal: this.bytesReadTotal,
        completionIo: completion.io,
        retainedState: this.retainedStateV1(),
      };
    }
    for (const entry of this.pending.values()) {
      if (!entry.sourceStamp) {
        entry.sourceStamp = admittedAfterRead.stamp
          ? { ...admittedAfterRead.stamp }
          : null;
      }
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
      jobs.push({
        jobId,
        job: this.pendingJobForUseV1(input.jobsFile, jobId, entry),
      });
      if (jobs.length >= this.maxJobsPerTick) break;
    }

    return {
      ready: true,
      jobs,
      doneTruthHas: completion.doneTruthHas,
      completionAuthorityLease: completion.lease,
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
