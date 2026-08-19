import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const VOID_WC_PUBLIC_CLAIM_HISTORY_AUTHORITY_V1 =
  "VOID_WC_PUBLIC_CLAIM_HISTORY_AUTHORITY_V1";
export const VOID_WC_PUBLIC_CLAIM_HISTORY_MAX_RECORD_BYTES_V1 =
  256 * 1024;

const WARM_YIELD_EVERY_V1 = 32;
const DAY_MS_V1 = 24 * 60 * 60_000;
const MAX_CLAIM_SKEW_MS_V1 = 15 * 60_000;

type JsonObject = Record<string, any>;

type DirStampV1 = {
  exists: boolean;
  ino: string;
  mtime_ns: string;
  ctime_ns: string;
};

type RecordStampV1 = {
  dev: string;
  ino: string;
  size: string;
  mtime_ns: string;
  ctime_ns: string;
};

type HistoryWatchStateV1 = {
  generation: number;
  healthy: boolean;
  watchers: Array<ReturnType<typeof fs.watch>>;
};

type HistoryStampsV1 = {
  issued: DirStampV1;
  consumed: DirStampV1;
  claims: DirStampV1;
};

type ActiveTicketV1 = {
  ticket_id: string;
  account: string;
  executor_node_id: string;
  expires_at_ms: number;
};

type HistoryStateV1 = {
  data_dir: string;
  stamps: HistoryStampsV1;
  consumed: number;
  consumed_account_counts: Map<string, number>;
  consumed_executor_counts: Map<string, number>;
  issued_tickets: Map<string, ActiveTicketV1>;
  global_claim_times: number[];
  account_claim_times: Map<string, number[]>;
  executor_claim_times: Map<string, number[]>;
  last_account_at: Map<string, number>;
  last_executor_at: Map<string, number>;
  scanned_files: number;
  watch_generation: number;
  record_generations: Map<string, RecordStampV1>;
};

type WarmFailureV1 = {
  stamps: HistoryStampsV1;
  watch_generation: number;
  message: string;
};

export type WcPublicClaimHistorySnapshotV1 = {
  marker: typeof VOID_WC_PUBLIC_CLAIM_HISTORY_AUTHORITY_V1;
  active: number;
  consumed: number;
  account_total: number | null;
  executor_total: number | null;
  active_account: number;
  active_executor: number;
  global_24h: number;
  account_24h: number;
  executor_24h: number;
  last_account_at: number;
  last_executor_at: number;
  scanned_files_at_warm: number;
  synchronous_history_files_read: 0;
};

const statesV1 = new Map<string, HistoryStateV1>();
const warmTasksV1 = new Map<string, Promise<void>>();
const warmFailuresV1 = new Map<string, WarmFailureV1>();
const watchStatesV1 = new Map<string, HistoryWatchStateV1>();

export type WcPublicClaimHistoryBeforeRecordOpenHookForProofV1 =
  ((file: string, label: string) => void | Promise<void>) | null;

let beforeRecordOpenHookForProofV1:
  WcPublicClaimHistoryBeforeRecordOpenHookForProofV1 = null;

export function setWcPublicClaimHistoryBeforeRecordOpenHookForProofV1(
  hook: WcPublicClaimHistoryBeforeRecordOpenHookForProofV1,
): void {
  beforeRecordOpenHookForProofV1 = hook;
}

export type WcPublicClaimHistoryBeforeRecordReadHookForProofV1 =
  ((file: string, label: string) => void | Promise<void>) | null;

let beforeRecordReadHookForProofV1:
  WcPublicClaimHistoryBeforeRecordReadHookForProofV1 = null;

export function setWcPublicClaimHistoryBeforeRecordReadHookForProofV1(
  hook: WcPublicClaimHistoryBeforeRecordReadHookForProofV1,
): void {
  beforeRecordReadHookForProofV1 = hook;
}

function dataDirV1(raw?: string): string {
  return path.resolve(
    raw ||
      process.env.DATA_DIR ||
      process.env.VOID_DATA_DIR ||
      "data_a",
  );
}

function rootDirV1(raw?: string): string {
  return path.join(
    dataDirV1(raw),
    "wc_v1",
    "public-earning-pilot-v1",
  );
}

function issuedDirV1(raw?: string): string {
  return path.join(rootDirV1(raw), "issued");
}

function consumedDirV1(raw?: string): string {
  return path.join(rootDirV1(raw), "consumed");
}

function claimsDirV1(raw?: string): string {
  return path.join(rootDirV1(raw), "public-claims");
}

type DurableDirectoryIdentityV1 = {
  dev: string;
  ino: string;
};

const durableDirectoryLinksV1 =
  new Map<string, DurableDirectoryIdentityV1>();

export type WcPublicClaimHistoryDirectoryParentFsyncHookForProofV1 =
  ((
    phase: "before" | "after",
    parent: string,
    child: string,
  ) => void) | null;

let directoryParentFsyncHookForProofV1:
  WcPublicClaimHistoryDirectoryParentFsyncHookForProofV1 =
    null;

export function setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1(
  hook: WcPublicClaimHistoryDirectoryParentFsyncHookForProofV1,
): void {
  directoryParentFsyncHookForProofV1 = hook;
}

function fsyncDirectoryV1(dir: string): void {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function directoryIdentityV1(
  dir: string,
): DurableDirectoryIdentityV1 {
  const stat: any = fs.statSync(
    dir,
    { bigint: true } as any,
  );
  if (!stat.isDirectory()) {
    throw new Error(
      "wc_public_claim_history_directory_not_directory",
    );
  }
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
  };
}

function sameDirectoryIdentityV1(
  a: DurableDirectoryIdentityV1,
  b: DurableDirectoryIdentityV1,
): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function ensureDurableDirectoryV1(
  dir: string,
): void {
  const target = path.resolve(dir);
  const parent = path.dirname(target);
  if (target === parent) return;

  if (!fs.existsSync(parent)) {
    ensureDurableDirectoryV1(parent);
  }

  let identity: DurableDirectoryIdentityV1;
  try {
    identity = directoryIdentityV1(target);
  } catch (error: any) {
    if (String(error?.code || "") !== "ENOENT") {
      throw error;
    }
    try {
      fs.mkdirSync(target, { mode: 0o700 });
    } catch (mkdirError: any) {
      if (String(mkdirError?.code || "") !== "EEXIST") {
        throw mkdirError;
      }
    }
    identity = directoryIdentityV1(target);
  }

  const cached = durableDirectoryLinksV1.get(target);
  if (
    cached &&
    sameDirectoryIdentityV1(cached, identity)
  ) {
    return;
  }

  directoryParentFsyncHookForProofV1?.(
    "before",
    parent,
    target,
  );
  fsyncDirectoryV1(parent);
  directoryParentFsyncHookForProofV1?.(
    "after",
    parent,
    target,
  );
  durableDirectoryLinksV1.set(
    target,
    identity,
  );
}

function ensureDirsV1(raw?: string): void {
  const dataDir = dataDirV1(raw);
  const wcDir = path.join(dataDir, "wc_v1");
  for (const dir of [
    dataDir,
    wcDir,
    rootDirV1(raw),
    issuedDirV1(raw),
    consumedDirV1(raw),
    claimsDirV1(raw),
  ]) {
    ensureDurableDirectoryV1(dir);
  }
}

function exactTrimmedStringV1(
  raw: unknown,
): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function safeAccountV1(raw: unknown): string {
  const value = exactTrimmedStringV1(raw);
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : "";
}

function safeNodeIdV1(raw: unknown): string {
  const value = exactTrimmedStringV1(raw).toLowerCase();
  return /^[0-9a-f]{32}$/.test(value) ? value : "";
}

function safeTicketIdV1(raw: unknown): string {
  const value = exactTrimmedStringV1(raw).toLowerCase();
  return /^[0-9a-f]{32}$/.test(value) ? value : "";
}

function safeClaimIdV1(raw: unknown): string {
  const value = exactTrimmedStringV1(raw).toLowerCase();
  return /^[0-9a-f]{64}$/.test(value) ? value : "";
}

function statDirV1(dir: string): DirStampV1 {
  try {
    const st: any = fs.statSync(dir, { bigint: true } as any);
    return {
      exists: true,
      ino: String(st.ino),
      mtime_ns: String(st.mtimeNs),
      ctime_ns: String(st.ctimeNs),
    };
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      return {
        exists: false,
        ino: "0",
        mtime_ns: "0",
        ctime_ns: "0",
      };
    }
    throw error;
  }
}

function stampsV1(raw?: string): HistoryStampsV1 {
  return {
    issued: statDirV1(issuedDirV1(raw)),
    consumed: statDirV1(consumedDirV1(raw)),
    claims: statDirV1(claimsDirV1(raw)),
  };
}

function sameStampV1(a: DirStampV1, b: DirStampV1): boolean {
  return (
    a.exists === b.exists &&
    a.ino === b.ino &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns
  );
}

function sameStampsV1(
  a: HistoryStampsV1,
  b: HistoryStampsV1,
): boolean {
  return (
    sameStampV1(a.issued, b.issued) &&
    sameStampV1(a.consumed, b.consumed) &&
    sameStampV1(a.claims, b.claims)
  );
}

function keyV1(raw?: string): string {
  return dataDirV1(raw);
}

function closeWatchStateV1(state: HistoryWatchStateV1): void {
  state.healthy = false;
  for (const watcher of state.watchers) {
    try {
      watcher.close();
    } catch (error) {
      void error;
    }
  }
  state.watchers.length = 0;
}

function ensureWatchStateV1(raw?: string): HistoryWatchStateV1 {
  ensureDirsV1(raw);
  const key = keyV1(raw);
  const existing = watchStatesV1.get(key);
  if (existing?.healthy) return existing;
  if (existing) {
    closeWatchStateV1(existing);
    watchStatesV1.delete(key);
  }

  const state: HistoryWatchStateV1 = {
    generation: 1,
    healthy: true,
    watchers: [],
  };
  watchStatesV1.set(key, state);

  for (const dir of [
    issuedDirV1(raw),
    consumedDirV1(raw),
    claimsDirV1(raw),
  ]) {
    const watcher = fs.watch(
      dir,
      { persistent: false },
      () => {
        if (!state.healthy) return;
        state.generation += 1;
        statesV1.delete(key);
        warmFailuresV1.delete(key);
      },
    );
    watcher.on("error", (error) => {
      state.healthy = false;
      state.generation += 1;
      statesV1.delete(key);
      warmFailuresV1.set(key, {
        stamps: stampsV1(raw),
        watch_generation: state.generation,
        message: `watch_error:${String(
          (error as any)?.message || error,
        )}`,
      });
    });
    watcher.unref();
    state.watchers.push(watcher);
  }
  return state;
}

export function wcPublicClaimHistoryWatchGenerationForProofV1(
  raw?: string,
): number {
  return ensureWatchStateV1(raw).generation;
}

export async function waitForWcPublicClaimHistoryWatchAdvanceForProofV1(
  raw: string | undefined,
  previousGeneration: number,
  timeoutMs = 2_000,
): Promise<number> {
  const deadline = Date.now() + Math.max(1, timeoutMs);
  for (;;) {
    const generation =
      ensureWatchStateV1(raw).generation;
    if (generation > previousGeneration) {
      return generation;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        "VOID_WC_PUBLIC_CLAIM_HISTORY_WATCH_TIMEOUT",
      );
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, 5),
    );
  }
}

function recordStampFromStatV1(stat: any): RecordStampV1 {
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

async function statRecordPathV1(
  file: string,
): Promise<RecordStampV1 | null> {
  try {
    const stat: any = await fsp.lstat(
      file,
      { bigint: true } as any,
    );
    if (!stat.isFile()) return null;
    return recordStampFromStatV1(stat);
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function emptyStateV1(
  raw: string | undefined,
  stamps: HistoryStampsV1,
  watchGeneration: number,
): HistoryStateV1 {
  return {
    data_dir: dataDirV1(raw),
    stamps,
    consumed: 0,
    consumed_account_counts: new Map(),
    consumed_executor_counts: new Map(),
    issued_tickets: new Map(),
    global_claim_times: [],
    account_claim_times: new Map(),
    executor_claim_times: new Map(),
    last_account_at: new Map(),
    last_executor_at: new Map(),
    scanned_files: 0,
    watch_generation: watchGeneration,
    record_generations: new Map(),
  };
}

function incMapV1(map: Map<string, number>, key: string): void {
  map.set(key, Number(map.get(key) || 0) + 1);
}

function pushTimeV1(
  map: Map<string, number[]>,
  key: string,
  value: number,
): void {
  const values = map.get(key) || [];
  values.push(value);
  map.set(key, values);
}

function sortTimeMapsV1(map: Map<string, number[]>): void {
  for (const values of map.values()) {
    values.sort((a, b) => a - b);
  }
}

async function readJsonStrictV1(
  file: string,
  label: string,
): Promise<{
  record: JsonObject;
  stamp: RecordStampV1;
}> {
  const flags =
    fs.constants.O_RDONLY |
    Number(fs.constants.O_NOFOLLOW || 0);

  await beforeRecordOpenHookForProofV1?.(
    file,
    label,
  );

  let handle: Awaited<ReturnType<typeof fsp.open>>;
  try {
    handle = await fsp.open(file, flags);
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      // The directory snapshot raced a normal remove/consume transition.
      // Treat this as generation churn so rebuildHistoryV1 retries from a
      // fresh directory generation instead of poisoning the authority.
      throw new Error(
        `${label}_generation_changed`,
      );
    }
    throw error;
  }

  try {
    const before: any = await handle.stat(
      { bigint: true } as any,
    );
    if (!before.isFile()) {
      throw new Error(`${label}_not_regular_file`);
    }
    const beforeStamp =
      recordStampFromStatV1(before);
    const size = Number(before.size);
    if (
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size >
        VOID_WC_PUBLIC_CLAIM_HISTORY_MAX_RECORD_BYTES_V1
    ) {
      throw new Error(`${label}_size_invalid`);
    }

    await beforeRecordReadHookForProofV1?.(
      file,
      label,
    );

    const text = await handle.readFile("utf8");
    const after: any = await handle.stat(
      { bigint: true } as any,
    );
    const afterStamp =
      recordStampFromStatV1(after);
    if (
      !after.isFile() ||
      !sameRecordStampV1(
        beforeStamp,
        afterStamp,
      )
    ) {
      throw new Error(
        `${label}_generation_changed`,
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (error: any) {
      throw new Error(
        `${label}_malformed:${String(
          error?.message || error,
        )}`,
      );
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(`${label}_not_object`);
    }
    return {
      record: parsed,
      stamp: afterStamp,
    };
  } finally {
    await handle.close();
  }
}

function validateTicketV1(
  record: JsonObject,
  expectedName: string,
  expectedStatus: "issued" | "completed",
): ActiveTicketV1 {
  const ticketId = safeTicketIdV1(record.ticket_id);
  const expectedId = safeTicketIdV1(
    expectedName.replace(/\.json$/, ""),
  );
  const account = safeAccountV1(record.account);
  const executor = safeNodeIdV1(record.executor_node_id);
  const expiresAt = record.expires_at_ms;

  if (
    record.marker !==
      "VOID_WC_PUBLIC_EARNING_PILOT_V1" ||
    record.version !== 1 ||
    record.status !== expectedStatus ||
    !ticketId ||
    ticketId !== expectedId ||
    !account ||
    !executor ||
    typeof expiresAt !== "number" ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= 0
  ) {
    throw new Error("ticket_history_semantic_invalid");
  }

  return {
    ticket_id: ticketId,
    account,
    executor_node_id: executor,
    expires_at_ms: expiresAt,
  };
}

function validateClaimV1(
  record: JsonObject,
  expectedName: string,
): {
  status: string;
  account: string;
  executor_node_id: string;
  issued_at_ms: number;
} {
  const claimId = safeClaimIdV1(record.claim_id);
  const expectedId = safeClaimIdV1(
    expectedName.replace(/\.json$/, ""),
  );
  const status =
    typeof record.status === "string"
      ? record.status
      : "";

  if (
    record.marker !==
      "VOID_WC_PUBLIC_TICKET_CLAIM_V1" ||
    record.version !== 1 ||
    !claimId ||
    claimId !== expectedId ||
    !["reserving", "publishing", "rotating", "issued"].includes(
      status,
    )
  ) {
    throw new Error("claim_history_semantic_invalid");
  }

  if (status !== "issued") {
    return {
      status,
      account: "",
      executor_node_id: "",
      issued_at_ms: 0,
    };
  }

  const account = safeAccountV1(record.account);
  const executor = safeNodeIdV1(record.executor_node_id);
  const issuedAt = record.issued_at_ms;

  if (
    !account ||
    !executor ||
    typeof issuedAt !== "number" ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt <= 0
  ) {
    throw new Error(
      "claim_history_issued_semantic_invalid",
    );
  }

  return {
    status,
    account,
    executor_node_id: executor,
    issued_at_ms: issuedAt,
  };
}

async function maybeYieldV1(count: number): Promise<void> {
  if (
    count > 0 &&
    count % WARM_YIELD_EVERY_V1 === 0
  ) {
    await new Promise<void>((resolve) =>
      setImmediate(resolve),
    );
  }
}

async function scanHistoryV1(
  raw: string | undefined,
  before: HistoryStampsV1,
  watchGeneration: number,
): Promise<HistoryStateV1> {
  const state = emptyStateV1(
    raw,
    before,
    watchGeneration,
  );
  const warmNow = Date.now();
  const recentCutoff =
    warmNow - DAY_MS_V1 - MAX_CLAIM_SKEW_MS_V1;

  const issuedEntries = (
    await fsp.readdir(issuedDirV1(raw), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of issuedEntries) {
    if (!entry.isFile()) {
      throw new Error(
        "issued_ticket_history_not_regular_file",
      );
    }
    const file = path.join(
      issuedDirV1(raw),
      entry.name,
    );
    const { record, stamp } =
      await readJsonStrictV1(
        file,
        "issued_ticket_history",
      );
    state.record_generations.set(file, stamp);
    const ticket = validateTicketV1(
      record,
      entry.name,
      "issued",
    );
    state.scanned_files += 1;
    if (ticket.expires_at_ms > warmNow) {
      state.issued_tickets.set(
        ticket.ticket_id,
        ticket,
      );
    }
    await maybeYieldV1(state.scanned_files);
  }

  const consumedEntries = (
    await fsp.readdir(consumedDirV1(raw), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of consumedEntries) {
    if (!entry.isFile()) {
      throw new Error(
        "consumed_ticket_history_not_regular_file",
      );
    }
    const file = path.join(
      consumedDirV1(raw),
      entry.name,
    );
    const { record, stamp } =
      await readJsonStrictV1(
        file,
        "consumed_ticket_history",
      );
    state.record_generations.set(file, stamp);
    const ticket = validateTicketV1(
      record,
      entry.name,
      "completed",
    );
    state.scanned_files += 1;

    // Consumed truth is terminal for single-use authority. If best-effort
    // cleanup left the same ticket under issued/, that residue must not
    // consume active global/account/executor claim capacity.
    state.issued_tickets.delete(ticket.ticket_id);

    state.consumed += 1;
    incMapV1(
      state.consumed_account_counts,
      ticket.account,
    );
    incMapV1(
      state.consumed_executor_counts,
      ticket.executor_node_id,
    );
    await maybeYieldV1(state.scanned_files);
  }

  const claimEntries = (
    await fsp.readdir(claimsDirV1(raw), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of claimEntries) {
    if (!entry.isFile()) {
      throw new Error(
        "public_claim_history_not_regular_file",
      );
    }
    const file = path.join(
      claimsDirV1(raw),
      entry.name,
    );
    const { record, stamp } =
      await readJsonStrictV1(
        file,
        "public_claim_history",
      );
    state.record_generations.set(file, stamp);
    const claim = validateClaimV1(record, entry.name);
    state.scanned_files += 1;

    if (claim.status === "issued") {
      state.last_account_at.set(
        claim.account,
        Math.max(
          Number(
            state.last_account_at.get(claim.account) || 0,
          ),
          claim.issued_at_ms,
        ),
      );
      state.last_executor_at.set(
        claim.executor_node_id,
        Math.max(
          Number(
            state.last_executor_at.get(
              claim.executor_node_id,
            ) || 0,
          ),
          claim.issued_at_ms,
        ),
      );

      if (claim.issued_at_ms >= recentCutoff) {
        state.global_claim_times.push(
          claim.issued_at_ms,
        );
        pushTimeV1(
          state.account_claim_times,
          claim.account,
          claim.issued_at_ms,
        );
        pushTimeV1(
          state.executor_claim_times,
          claim.executor_node_id,
          claim.issued_at_ms,
        );
      }
    }

    await maybeYieldV1(state.scanned_files);
  }

  state.global_claim_times.sort((a, b) => a - b);
  sortTimeMapsV1(state.account_claim_times);
  sortTimeMapsV1(state.executor_claim_times);
  return state;
}

async function revalidateRecordGenerationsV1(
  state: HistoryStateV1,
): Promise<boolean> {
  let checked = 0;
  for (const [file, expected] of
    state.record_generations.entries()) {
    const current = await statRecordPathV1(file);
    if (
      !current ||
      !sameRecordStampV1(expected, current)
    ) {
      return false;
    }
    checked += 1;
    await maybeYieldV1(checked);
  }
  return true;
}

async function rebuildHistoryV1(
  raw?: string,
): Promise<void> {
  ensureDirsV1(raw);
  const key = keyV1(raw);
  const watch = ensureWatchStateV1(raw);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!watch.healthy) {
      throw new Error(
        "VOID_WC_PUBLIC_CLAIM_HISTORY_WATCH_INVALID",
      );
    }

    const before = stampsV1(raw);
    const watchBefore = watch.generation;
    let state: HistoryStateV1;
    try {
      state = await scanHistoryV1(
        raw,
        before,
        watchBefore,
      );
    } catch (error: any) {
      if (
        String(error?.message || error).includes(
          "_generation_changed",
        )
      ) {
        await new Promise<void>((resolve) =>
          setImmediate(resolve),
        );
        continue;
      }
      throw error;
    }

    const recordsStable =
      await revalidateRecordGenerationsV1(state);
    const after = stampsV1(raw);
    const watchAfter = watch.generation;

    if (
      recordsStable &&
      watch.healthy &&
      watchBefore === watchAfter &&
      sameStampsV1(before, after)
    ) {
      state.stamps = after;
      state.watch_generation = watchAfter;
      statesV1.set(key, state);
      warmFailuresV1.delete(key);
      return;
    }

    await new Promise<void>((resolve) =>
      setImmediate(resolve),
    );
  }

  throw new Error(
    "VOID_WC_PUBLIC_CLAIM_HISTORY_AUTHORITY_UNSTABLE",
  );
}

function startWarmV1(raw?: string): void {
  const key = keyV1(raw);
  if (warmTasksV1.has(key)) return;

  const watch = ensureWatchStateV1(raw);
  if (!watch.healthy) {
    warmFailuresV1.set(key, {
      stamps: stampsV1(raw),
      watch_generation: watch.generation,
      message:
        "VOID_WC_PUBLIC_CLAIM_HISTORY_WATCH_INVALID",
    });
    return;
  }

  const task = (async () => {
    try {
      await rebuildHistoryV1(raw);
    } catch (error: any) {
      const currentWatch =
        ensureWatchStateV1(raw);
      warmFailuresV1.set(key, {
        stamps: stampsV1(raw),
        watch_generation:
          currentWatch.generation,
        message: String(
          error?.message || error,
        ),
      });
    } finally {
      warmTasksV1.delete(key);
    }
  })();

  warmTasksV1.set(key, task);
}


export function suppressWcPublicClaimHistoryWatchForProofV1(
  raw?: string,
): void {
  const state = ensureWatchStateV1(raw);
  for (const watcher of state.watchers) {
    try {
      watcher.close();
    } catch (error) {
      void error;
    }
  }
  state.watchers.length = 0;
  // Proof-only simulation of a missed/unavailable advisory notification:
  // keep the watch state nominally healthy so correctness cannot depend on
  // an error callback or generation increment.
  state.healthy = true;
}

export async function prepareWcPublicClaimHistoryDecisionV1(
  raw?: string,
): Promise<void> {
  const state = readyStateV1(raw);
  const key = keyV1(raw);
  const watch = ensureWatchStateV1(raw);
  const before = stampsV1(raw);
  const watchBefore = watch.generation;

  // fs.watch is a wakeup/performance hint only. Revalidate the exact
  // per-record generations captured by the published warm state before a
  // participant-facing status/claim decision may consume that authority.
  // This is asynchronous metadata work; it never restores synchronous
  // retained-history file reads to the Node request/event-loop path.
  const generationsCurrent =
    await revalidateRecordGenerationsV1(state);

  const after = stampsV1(raw);
  const watchAfter = watch.generation;
  const stillPublished = statesV1.get(key) === state;

  if (
    !generationsCurrent ||
    !watch.healthy ||
    !stillPublished ||
    watchBefore !== watchAfter ||
    state.watch_generation !== watchAfter ||
    !sameStampsV1(before, after) ||
    !sameStampsV1(state.stamps, after)
  ) {
    statesV1.delete(key);
    warmFailuresV1.delete(key);
    startWarmV1(raw);
    throw new Error(
      "VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING",
    );
  }
}

function readyStateV1(raw?: string): HistoryStateV1 {
  ensureDirsV1(raw);
  const key = keyV1(raw);
  const watch = ensureWatchStateV1(raw);
  const current = stampsV1(raw);
  const failure = warmFailuresV1.get(key);

  if (!watch.healthy) {
    throw new Error(
      "VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID",
    );
  }

  if (failure) {
    if (
      failure.watch_generation ===
        watch.generation &&
      sameStampsV1(failure.stamps, current)
    ) {
      throw new Error(
        "VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID",
      );
    }
    warmFailuresV1.delete(key);
  }

  if (warmTasksV1.has(key)) {
    throw new Error(
      "VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING",
    );
  }

  const state = statesV1.get(key);
  if (
    !state ||
    state.watch_generation !==
      watch.generation ||
    !sameStampsV1(state.stamps, current)
  ) {
    startWarmV1(raw);
    throw new Error(
      "VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING",
    );
  }

  return state;
}

function lowerBoundV1(
  values: number[],
  target: number,
): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBoundV1(
  values: number[],
  target: number,
): number {
  let lo = 0;
  let hi = values.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (values[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function countWindowV1(
  values: number[] | undefined,
  lower: number,
  upper: number,
): number {
  if (!values?.length) return 0;
  return (
    upperBoundV1(values, upper) -
    lowerBoundV1(values, lower)
  );
}

export function wcPublicClaimHistorySnapshotV1(
  raw?: string,
  now = Date.now(),
  accountRaw: unknown = "",
  executorRaw: unknown = "",
  clockSkewMs = 5 * 60_000,
): WcPublicClaimHistorySnapshotV1 {
  const state = readyStateV1(raw);
  const account = safeAccountV1(accountRaw);
  const executor = safeNodeIdV1(executorRaw);

  let active = 0;
  let activeAccount = 0;
  let activeExecutor = 0;

  for (const ticket of state.issued_tickets.values()) {
    if (ticket.expires_at_ms <= now) continue;
    active += 1;
    if (account && ticket.account === account) {
      activeAccount += 1;
    }
    if (
      executor &&
      ticket.executor_node_id === executor
    ) {
      activeExecutor += 1;
    }
  }

  const cutoff = now - DAY_MS_V1;
  const upper =
    now + Math.max(0, Math.trunc(clockSkewMs));

  const global24h = countWindowV1(
    state.global_claim_times,
    cutoff,
    upper,
  );
  const account24h = account
    ? countWindowV1(
        state.account_claim_times.get(account),
        cutoff,
        upper,
      )
    : 0;
  const executor24h = executor
    ? countWindowV1(
        state.executor_claim_times.get(executor),
        cutoff,
        upper,
      )
    : 0;

  return {
    marker: VOID_WC_PUBLIC_CLAIM_HISTORY_AUTHORITY_V1,
    active,
    consumed: state.consumed,
    account_total: account
      ? Number(
          state.consumed_account_counts.get(account) || 0,
        ) + activeAccount
      : null,
    executor_total: executor
      ? Number(
          state.consumed_executor_counts.get(executor) ||
            0,
        ) + activeExecutor
      : null,
    active_account: activeAccount,
    active_executor: activeExecutor,
    global_24h: global24h,
    account_24h: account24h,
    executor_24h: executor24h,
    last_account_at: account
      ? Number(state.last_account_at.get(account) || 0)
      : 0,
    last_executor_at: executor
      ? Number(
          state.last_executor_at.get(executor) || 0,
        )
      : 0,
    scanned_files_at_warm: state.scanned_files,
    synchronous_history_files_read: 0,
  };
}

export function primeWcPublicClaimHistoryAuthorityV1(
  raw?: string,
): void {
  ensureDirsV1(raw);
  const key = keyV1(raw);
  const watch = ensureWatchStateV1(raw);
  const current = stampsV1(raw);
  const state = statesV1.get(key);
  const failure = warmFailuresV1.get(key);

  if (!watch.healthy) return;

  if (
    failure &&
    failure.watch_generation ===
      watch.generation &&
    sameStampsV1(failure.stamps, current)
  ) {
    return;
  }

  if (
    state &&
    state.watch_generation ===
      watch.generation &&
    sameStampsV1(state.stamps, current) &&
    !failure
  ) {
    return;
  }

  startWarmV1(raw);
}

export async function waitForWcPublicClaimHistoryWarmForProofV1(
  raw?: string,
): Promise<void> {
  const key = keyV1(raw);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    primeWcPublicClaimHistoryAuthorityV1(raw);
    const task = warmTasksV1.get(key);
    if (task) await task;

    const watch = ensureWatchStateV1(raw);
    const current = stampsV1(raw);
    const failure = warmFailuresV1.get(key);

    if (
      failure &&
      failure.watch_generation ===
        watch.generation &&
      sameStampsV1(failure.stamps, current)
    ) {
      throw new Error(
        `VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID:${failure.message}`,
      );
    }

    const state = statesV1.get(key);
    if (
      watch.healthy &&
      state &&
      state.watch_generation ===
        watch.generation &&
      sameStampsV1(state.stamps, current)
    ) {
      return;
    }

    await new Promise<void>((resolve) =>
      setImmediate(resolve),
    );
  }

  throw new Error(
    "VOID_WC_PUBLIC_CLAIM_HISTORY_NOT_READY",
  );
}

export function resetWcPublicClaimHistoryAuthorityForProofV1(
  raw?: string,
): void {
  const key = keyV1(raw);
  if (warmTasksV1.has(key)) {
    throw new Error(
      "VOID_WC_PUBLIC_CLAIM_HISTORY_RESET_WHILE_WARMING",
    );
  }
  statesV1.delete(key);
  warmFailuresV1.delete(key);
  const watch = watchStatesV1.get(key);
  if (watch) {
    closeWatchStateV1(watch);
    watchStatesV1.delete(key);
  }
}
