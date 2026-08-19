import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { appendAgentPick2JsonlCanonicalV1 } from "../http/agent_pick2_jsonl_semantic_index_v1.js";

export const VOID_WC_PUBLIC_REMOTE_TRUTH_JSONL_INDEX_V1 =
  "VOID_WC_PUBLIC_REMOTE_TRUTH_JSONL_INDEX_V1";

const CHUNK_BYTES_V1 = 64 * 1024;
const MAX_RECORD_BYTES_V1 = 1024 * 1024;
const MAX_CATCH_UP_PASSES_V1 = 32;
const MAX_REPLACEMENT_REBUILDS_V1 = 2;

const CONFLICT_FIELDS_V1 = [
  "account",
  "job_id",
  "receipt_id",
  "dataset_id",
  "kind",
  "status",
  "input_hash",
  "output_hash",
] as const;

type JsonObject = Record<string, any>;

type FileStampV1 = {
  dev: string;
  ino: string;
  size: number;
  mtimeNs: string;
  ctimeNs: string;
};

type IndexedEntryV1 = {
  count: number;
  conflictSignature: string;
};

type IndexMetricsV1 = {
  bytes_read_total: number;
  full_scans_total: number;
  incremental_scans_total: number;
  rebuilds_total: number;
  cache_hits_total: number;
  malformed_lines_total: number;
  catch_up_passes_total: number;
  canonical_appends_total: number;
  canonical_witnessed_appends_total: number;
};

type ExactOnceIndexStateV1 = {
  file: string;
  idFields: string[];
  stamp: FileStampV1 | null;
  endedWithNewline: boolean;
  entries: Map<string, IndexedEntryV1>;
  metrics: IndexMetricsV1;
};

type AppendExactOnceOptionsV1 = {
  durable?: boolean;
  mode?: number;
  onMalformed?: (error: unknown, context: { file: string; line: string }) => void;
};

export type WcPublicRemoteTruthJsonlIndexMetricsV1 = IndexMetricsV1 & {
  file: string;
  id_fields: string[];
  indexed_size: number;
  indexed_entries: number;
};

const statesV1 = new Map<string, ExactOnceIndexStateV1>();
const tailsV1 = new Map<string, Promise<void>>();

function emptyMetricsV1(): IndexMetricsV1 {
  return {
    bytes_read_total: 0,
    full_scans_total: 0,
    incremental_scans_total: 0,
    rebuilds_total: 0,
    cache_hits_total: 0,
    malformed_lines_total: 0,
    catch_up_passes_total: 0,
    canonical_appends_total: 0,
    canonical_witnessed_appends_total: 0,
  };
}

function stampFromStatsV1(st: any): FileStampV1 {
  const dev = typeof st?.dev === "bigint" ? st.dev : BigInt(st?.dev || 0);
  const ino = typeof st?.ino === "bigint" ? st.ino : BigInt(st?.ino || 0);
  const size = typeof st?.size === "bigint" ? st.size : BigInt(st?.size || 0);
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
    size: Number(size),
    mtimeNs: String(mtimeNs),
    ctimeNs: String(ctimeNs),
  };
}

async function statPathV1(file: string): Promise<FileStampV1 | null> {
  try {
    const st = await fsp.lstat(file, { bigint: true } as any);
    if (!st.isFile()) {
      throw new Error(`VOID_WC_REMOTE_TRUTH_NON_REGULAR_FILE file=${file}`);
    }
    return stampFromStatsV1(st);
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") return null;
    throw error;
  }
}

function sameObjectV1(a: FileStampV1, b: FileStampV1): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function sameStampV1(a: FileStampV1, b: FileStampV1): boolean {
  return (
    sameObjectV1(a, b) &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs
  );
}

function indexKeyV1(file: string, idFields: string[]): string {
  return `${path.resolve(file)}\0${JSON.stringify(idFields)}`;
}

function rowKeyV1(value: JsonObject, idFields: string[]): string {
  return JSON.stringify(idFields.map((field) => String(value?.[field] || "")));
}

function conflictSignatureV1(value: JsonObject): string {
  return JSON.stringify(
    CONFLICT_FIELDS_V1.map((field) => String(value?.[field] || "")),
  );
}

function assertIdFieldsV1(idFields: string[]): void {
  if (!Array.isArray(idFields) || idFields.length === 0 || idFields.length > 4) {
    throw new Error("VOID_WC_REMOTE_TRUTH_INVALID_ID_FIELDS");
  }
  for (const field of idFields) {
    if (!/^[A-Za-z0-9_]{1,64}$/.test(String(field || ""))) {
      throw new Error("VOID_WC_REMOTE_TRUTH_INVALID_ID_FIELD");
    }
  }
}

function stateForV1(file: string, idFields: string[]): ExactOnceIndexStateV1 {
  const absolute = path.resolve(file);
  const key = indexKeyV1(absolute, idFields);
  let state = statesV1.get(key);
  if (!state) {
    state = {
      file: absolute,
      idFields: idFields.slice(),
      stamp: null,
      endedWithNewline: true,
      entries: new Map<string, IndexedEntryV1>(),
      metrics: emptyMetricsV1(),
    };
    statesV1.set(key, state);
  }
  return state;
}

async function withIndexLockV1<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prior = tailsV1.get(key) || Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = prior.catch(() => undefined).then(() => gate);
  tailsV1.set(key, tail);
  await prior.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (tailsV1.get(key) === tail) tailsV1.delete(key);
  }
}

function recordParsedLineV1(
  state: ExactOnceIndexStateV1,
  line: string,
  onMalformed?: AppendExactOnceOptionsV1["onMalformed"],
): void {
  if (!line.trim()) return;
  try {
    const value = JSON.parse(line);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("VOID_WC_REMOTE_TRUTH_JSONL_ROW_NOT_OBJECT");
    }
    const key = rowKeyV1(value, state.idFields);
    const prior = state.entries.get(key);
    if (prior) {
      prior.count += 1;
      return;
    }
    state.entries.set(key, {
      count: 1,
      conflictSignature: conflictSignatureV1(value),
    });
  } catch (error) {
    state.metrics.malformed_lines_total += 1;
    onMalformed?.(error, { file: state.file, line: line.slice(0, 1024) });
  }
}

async function scanRangeV1(
  state: ExactOnceIndexStateV1,
  start: number,
  endExclusive: number,
  kind: "full" | "incremental",
  onMalformed?: AppendExactOnceOptionsV1["onMalformed"],
): Promise<{
  opened: FileStampV1;
  after: FileStampV1;
  pathAfter: FileStampV1 | null;
  endedWithNewline: boolean;
}> {
  const flags = fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
  const handle = await fsp.open(state.file, flags);
  try {
    const opened = stampFromStatsV1(await handle.stat({ bigint: true } as any));
    if (endExclusive > opened.size) {
      throw new Error(
        `VOID_WC_REMOTE_TRUTH_SCAN_BEYOND_OPENED_SIZE file=${state.file} end=${endExclusive} opened=${opened.size}`,
      );
    }
    if (start < 0 || start > endExclusive) {
      throw new Error("VOID_WC_REMOTE_TRUTH_INVALID_SCAN_RANGE");
    }

    if (kind === "full") state.metrics.full_scans_total += 1;
    else state.metrics.incremental_scans_total += 1;

    const buf = Buffer.allocUnsafe(CHUNK_BYTES_V1);
    let position = start;
    let carry = Buffer.alloc(0);
    let lastByte = start === 0 ? 0x0a : -1;

    while (position < endExclusive) {
      const want = Math.min(buf.length, endExclusive - position);
      const result = await handle.read(buf, 0, want, position);
      const bytesRead = Number(result.bytesRead || 0);
      if (bytesRead <= 0) {
        throw new Error(
          `VOID_WC_REMOTE_TRUTH_SHORT_READ file=${state.file} position=${position} end=${endExclusive}`,
        );
      }
      position += bytesRead;
      state.metrics.bytes_read_total += bytesRead;
      const chunk = Buffer.from(buf.subarray(0, bytesRead));
      lastByte = chunk[chunk.length - 1];
      const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      let from = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] !== 0x0a) continue;
        const recordBytes = i - from;
        if (recordBytes > MAX_RECORD_BYTES_V1) {
          throw new Error(
            `VOID_WC_REMOTE_TRUTH_RECORD_TOO_LARGE file=${state.file} bytes=${recordBytes}`,
          );
        }
        if (recordBytes > 0) {
          recordParsedLineV1(
            state,
            data.subarray(from, i).toString("utf8").replace(/\r$/, ""),
            onMalformed,
          );
        }
        from = i + 1;
      }
      carry = Buffer.from(data.subarray(from));
      if (carry.length > MAX_RECORD_BYTES_V1) {
        throw new Error(
          `VOID_WC_REMOTE_TRUTH_RECORD_TOO_LARGE file=${state.file} bytes=${carry.length}`,
        );
      }
    }

    if (carry.length) {
      throw new Error(`VOID_WC_REMOTE_TRUTH_UNTERMINATED_JSONL file=${state.file}`);
    }

    const after = stampFromStatsV1(await handle.stat({ bigint: true } as any));
    const pathAfter = await statPathV1(state.file);
    return {
      opened,
      after,
      pathAfter,
      endedWithNewline: endExclusive === 0 || lastByte === 0x0a,
    };
  } finally {
    await handle.close();
  }
}

async function rebuildStateV1(
  state: ExactOnceIndexStateV1,
  onMalformed?: AppendExactOnceOptionsV1["onMalformed"],
): Promise<void> {
  for (
    let replacementAttempt = 0;
    replacementAttempt < MAX_REPLACEMENT_REBUILDS_V1;
    replacementAttempt++
  ) {
    const current = await statPathV1(state.file);
    state.entries.clear();
    state.stamp = null;
    state.endedWithNewline = true;
    state.metrics.rebuilds_total += 1;
    if (!current) return;

    const scanned = await scanRangeV1(
      state,
      0,
      current.size,
      "full",
      onMalformed,
    );
    if (
      scanned.pathAfter &&
      sameObjectV1(scanned.opened, scanned.pathAfter) &&
      sameObjectV1(scanned.opened, scanned.after) &&
      scanned.after.size >= current.size
    ) {
      state.stamp = {
        ...scanned.after,
        size: current.size,
        mtimeNs: current.mtimeNs,
        ctimeNs: current.ctimeNs,
      };
      state.endedWithNewline = scanned.endedWithNewline;
      await catchUpStateV1(state, onMalformed);
      return;
    }
  }
  throw new Error(`VOID_WC_REMOTE_TRUTH_REPLACEMENT_CHURN file=${state.file}`);
}

async function catchUpStateV1(
  state: ExactOnceIndexStateV1,
  onMalformed?: AppendExactOnceOptionsV1["onMalformed"],
): Promise<void> {
  for (let pass = 0; pass < MAX_CATCH_UP_PASSES_V1; pass++) {
    state.metrics.catch_up_passes_total += 1;
    const current = await statPathV1(state.file);

    if (!current) {
      if (state.stamp === null) {
        state.metrics.cache_hits_total += 1;
        return;
      }
      await rebuildStateV1(state, onMalformed);
      return;
    }

    if (!state.stamp) {
      await rebuildStateV1(state, onMalformed);
      return;
    }

    if (!sameObjectV1(state.stamp, current) || current.size < state.stamp.size) {
      await rebuildStateV1(state, onMalformed);
      return;
    }

    if (current.size === state.stamp.size) {
      if (!sameStampV1(state.stamp, current)) {
        throw new Error(
          `VOID_WC_REMOTE_TRUTH_NON_APPEND_MUTATION file=${state.file} size=${current.size}`,
        );
      }
      state.metrics.cache_hits_total += 1;
      return;
    }

    if (!state.endedWithNewline) {
      throw new Error(
        `VOID_WC_REMOTE_TRUTH_PRIOR_UNTERMINATED_JSONL file=${state.file}`,
      );
    }

    const start = state.stamp.size;
    const scanned = await scanRangeV1(
      state,
      start,
      current.size,
      "incremental",
      onMalformed,
    );
    if (
      !scanned.pathAfter ||
      !sameObjectV1(scanned.opened, scanned.pathAfter) ||
      !sameObjectV1(scanned.opened, scanned.after)
    ) {
      await rebuildStateV1(state, onMalformed);
      return;
    }
    state.stamp = {
      ...scanned.after,
      size: current.size,
      mtimeNs: current.mtimeNs,
      ctimeNs: current.ctimeNs,
    };
    state.endedWithNewline = scanned.endedWithNewline;
  }

  throw new Error(`VOID_WC_REMOTE_TRUTH_INDEX_UNSTABLE file=${state.file}`);
}

function existingResultV1(
  state: ExactOnceIndexStateV1,
  value: JsonObject,
): { appended: false; existing: JsonObject } | null {
  const key = rowKeyV1(value, state.idFields);
  const indexed = state.entries.get(key);
  if (!indexed) return null;
  if (indexed.count > 1) {
    throw new Error("remote_truth_duplicate_conflict");
  }
  const existingValues = JSON.parse(indexed.conflictSignature) as string[];
  const existing: JsonObject = {};
  for (let i = 0; i < CONFLICT_FIELDS_V1.length; i++) {
    const field = CONFLICT_FIELDS_V1[i];
    const actual = String(existingValues[i] || "");
    if (actual) existing[field] = actual;
    if (value[field] !== undefined && actual !== String(value?.[field] || "")) {
      throw new Error(`remote_truth_${field}_conflict`);
    }
  }
  for (const field of state.idFields) {
    if (existing[field] === undefined && value[field] !== undefined) {
      existing[field] = value[field];
    }
  }
  return { appended: false, existing };
}

export async function appendWcPublicRemoteTruthJsonlExactOnceV1(
  file: string,
  value: JsonObject,
  idFields: string[],
  options: AppendExactOnceOptionsV1 = {},
): Promise<{
  appended: boolean;
  existing: JsonObject | null;
  witnessed: boolean;
}> {
  assertIdFieldsV1(idFields);
  const absolute = path.resolve(file);
  const key = indexKeyV1(absolute, idFields);

  return withIndexLockV1(key, async () => {
    const state = stateForV1(absolute, idFields);
    await catchUpStateV1(state, options.onMalformed);

    const existing = existingResultV1(state, value);
    if (existing) return { ...existing, witnessed: false };

    await fsp.mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
    const line = Buffer.from(JSON.stringify(value) + "\n", "utf8");
    const append = appendAgentPick2JsonlCanonicalV1(absolute, line, {
      durable: options.durable !== false,
      mode: options.mode ?? 0o600,
    });
    state.metrics.canonical_appends_total += 1;
    if (append.witnessed) {
      state.metrics.canonical_witnessed_appends_total += 1;
    }

    await catchUpStateV1(state, options.onMalformed);
    const after = state.entries.get(rowKeyV1(value, idFields));
    if (!after || after.count !== 1) {
      throw new Error("remote_truth_duplicate_conflict");
    }
    return { appended: true, existing: null, witnessed: append.witnessed };
  });
}

export function wcPublicRemoteTruthJsonlIndexMetricsV1(): WcPublicRemoteTruthJsonlIndexMetricsV1[] {
  return Array.from(statesV1.values()).map((state) => ({
    file: state.file,
    id_fields: state.idFields.slice(),
    indexed_size: Number(state.stamp?.size || 0),
    indexed_entries: state.entries.size,
    ...state.metrics,
  }));
}

export function resetWcPublicRemoteTruthJsonlIndexForProofV1(): void {
  if (tailsV1.size) {
    throw new Error("VOID_WC_REMOTE_TRUTH_INDEX_RESET_WHILE_BUSY");
  }
  statesV1.clear();
}
