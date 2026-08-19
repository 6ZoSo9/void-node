import crypto from "node:crypto";
import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nodeIdFromPubPEM } from "../chain/block.js";
import { loadKeypair } from "../crypto/keypair.js";
import {
  acquireWcProcessInstanceLockV1,
  releaseWcProcessInstanceLockV1,
  type WcProcessInstanceLockV1,
} from "./wc_process_instance_lock_v1.js";
import {
  prepareWcPublicClaimHistoryDecisionV1,
  primeWcPublicClaimHistoryAuthorityV1,
  publishWcPublicClaimHistoryMutationForFileV1,
  wcPublicClaimHistorySnapshotV1,
} from "./wc_public_claim_history_authority_v1.js";
import {
  appendWcPublicRemoteTruthJsonlExactOnceV1,
  prepareWcPublicRemoteTruthJsonlExactOnceV1,
} from "./wc_public_remote_truth_jsonl_index_v1.js";
import {
  acceptVerifiedReceiptOnce,
} from "./wc_verified_receipt_acceptance_v1.js";

export const VOID_WC_PUBLIC_EARNING_PILOT_MARKER =
  "VOID_WC_PUBLIC_EARNING_PILOT_V1";
export const VOID_WC_PUBLIC_EARNING_PILOT_TASK =
  "datanet_fetch_verify";
export const VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC = 3;
export const VOID_WC_PUBLIC_REMOTE_EVIDENCE_MAX_JSON_BYTES_V1 = 1024 * 1024;
const VOID_WC_PUBLIC_FETCH_MAX_JSON_BYTES_V1 = 8 * 1024 * 1024;
export const VOID_WC_PUBLIC_TICKET_CLAIM_MARKER =
  "VOID_WC_PUBLIC_TICKET_CLAIM_V1";

export type PilotTransportMode = "inbound_fetch" | "outbound_bundle";

export interface PublicTicketClaimRequest {
  domain: "void:mainnet-0:wc-public-ticket-claim-v1";
  marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1";
  version: 1;
  account: string;
  executor_node_id: string;
  executor_pubkey: string;
  claim_nonce: string;
  claim_ts_ms: number;
}

const OPERATOR_ISSUE_ROUTE =
  "/wc/public-earning-pilot-v1/operator/issue";
const LOCAL_EXECUTE_ROUTE =
  "/wc/public-earning-pilot-v1/execute-local";
const PUBLIC_SUBMIT_ROUTE =
  "/wc/public-earning-pilot-v1/submit-result";
const PUBLIC_STATUS_ROUTE =
  "/wc/public-earning-pilot-v1/status";
const PUBLIC_CLAIM_ROUTE =
  "/wc/public-earning-pilot-v1/claim-ticket";
const LOCAL_CLAIM_SIGN_ROUTE =
  "/wc/public-earning-pilot-v1/sign-claim";
const GLOBAL_MARK = "__void_wc_public_earning_pilot_v1";

type JsonObject = Record<string, any>;

function isJsonObject(raw: unknown): raw is JsonObject {
  return Boolean(raw) && typeof raw === "object" && !Array.isArray(raw);
}

function recordPilotBestEffortFailure(
  scope: string,
  error: unknown,
  meta: JsonObject = {},
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("VOID_WC_PUBLIC_EARNING_PILOT_BEST_EFFORT_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

export interface PilotTicketRecord {
  marker: string;
  version: 1;
  ticket_id: string;
  account: string;
  task_class: string;
  executor_node_id: string;
  executor_http_base: string;
  transport_mode?: PilotTransportMode;
  dataset_id: string;
  expected_input_hash: string;
  token_sha256: string;
  nonce: string;
  issued_at_ms: number;
  expires_at_ms: number;
  max_uses: 1;
  status: string;
  public_submit_route: string;
  local_execute_route: string;
  issuance_source?: "operator" | "public_claim";
  public_claim_id?: string;
}

export interface PilotResultEnvelope {
  domain: string;
  marker: string;
  version: 1;
  ticket_id: string;
  account: string;
  task_class: string;
  executor_node_id: string;
  executor_pubkey: string;
  executor_http_base: string;
  transport_mode: PilotTransportMode;
  dataset_id: string;
  expected_input_hash: string;
  job_id: string;
  receipt_id: string;
  input_hash: string;
  output_hash: string;
  fetched_input_hash: string;
  receipt_ts_ms: number;
}

function resolveDataDir(raw?: string): string {
  return path.resolve(
    raw ||
      process.env.DATA_DIR ||
      process.env.VOID_DATA_DIR ||
      "data_a",
  );
}

function rootDir(raw?: string): string {
  return path.join(
    resolveDataDir(raw),
    "wc_v1",
    "public-earning-pilot-v1",
  );
}

function issuedDir(raw?: string): string {
  return path.join(rootDir(raw), "issued");
}

function consumedDir(raw?: string): string {
  return path.join(rootDir(raw), "consumed");
}

function locksDir(raw?: string): string {
  return path.join(rootDir(raw), "locks");
}

function claimsDir(raw?: string): string {
  return path.join(rootDir(raw), "public-claims");
}

function resultTransactionsDir(raw?: string): string {
  return path.join(rootDir(raw), "result-transactions");
}

function resultTransactionFile(ticketId: string, raw?: string): string {
  return path.join(resultTransactionsDir(raw), `${ticketId}.json`);
}

function auditFile(raw?: string): string {
  return path.join(rootDir(raw), "audit.jsonl");
}

function fsyncDirectoryV1(dir: string): void {
  const dirFd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(dirFd);
  } finally {
    fs.closeSync(dirFd);
  }
}

type DurableDirectoryIdentityV1 = {
  dev: string;
  ino: string;
};

const durableDirectoryLinksV1 =
  new Map<string, DurableDirectoryIdentityV1>();

export type WcPublicEarningPilotDirectoryParentFsyncHookForProofV1 =
  ((
    phase: "before" | "after",
    parent: string,
    child: string,
  ) => void) | null;

let directoryParentFsyncHookForProofV1:
  WcPublicEarningPilotDirectoryParentFsyncHookForProofV1 =
    null;

export function setWcPublicEarningPilotDirectoryParentFsyncHookForProofV1(
  hook: WcPublicEarningPilotDirectoryParentFsyncHookForProofV1,
): void {
  directoryParentFsyncHookForProofV1 = hook;
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
      "wc_public_state_directory_not_directory",
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

  // Cache only after the containing directory has crossed a successful
  // fsync boundary. If the fsync or proof hook fails after mkdir became
  // visible, retry must re-establish the same parent link.
  durableDirectoryLinksV1.set(
    target,
    identity,
  );
}

function ensureDirs(raw?: string): void {
  const dataDir = resolveDataDir(raw);
  const wcDir = path.join(dataDir, "wc_v1");
  for (const dir of [
    dataDir,
    wcDir,
    rootDir(raw),
    issuedDir(raw),
    consumedDir(raw),
    locksDir(raw),
    claimsDir(raw),
    resultTransactionsDir(raw),
  ]) {
    ensureDurableDirectoryV1(dir);
  }
}

function atomicWriteJson(file: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  let fd: number | null = null;
  try {
    fd = fs.openSync(tmp, "wx", 0o600);
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n", {
      encoding: "utf8",
    });
    fs.fdatasyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    // Advance the O(1) cross-process mutation witness before a canonical
    // history pathname becomes authoritative. If witness publication fails,
    // the prepared temp remains unpublished and the request fails closed.
    publishWcPublicClaimHistoryMutationForFileV1(file);

    fs.renameSync(tmp, file);
    fsyncDirectoryV1(path.dirname(file));
  } catch (error) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (cleanupError) {
        recordPilotBestEffortFailure(
          "atomic-json-cleanup-close",
          cleanupError,
          { file, tmp },
        );
      }
    }
    try {
      fs.unlinkSync(tmp);
    } catch (cleanupError: any) {
      if (String(cleanupError?.code || "") !== "ENOENT") {
        recordPilotBestEffortFailure(
          "atomic-json-cleanup-unlink",
          cleanupError,
          { file, tmp },
        );
      }
    }
    throw error;
  }
}

function appendJsonl(file: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(file, "a", 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(value) + "\n");
    try {
      fs.fdatasyncSync(fd);
    } catch (error) {
      recordPilotBestEffortFailure("append-jsonl-fdatasync", error, { file });
    }
  } finally {
    fs.closeSync(fd);
  }
}

function appendAudit(event: JsonObject, raw?: string): void {
  appendJsonl(auditFile(raw), {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    at_ms: Date.now(),
    ...event,
  });
}

function appendAuditBestEffort(event: JsonObject, raw?: string): void {
  try {
    maybePilotTransactionFaultForProofV1("audit_after_commit");
    appendAudit(event, raw);
  } catch (error) {
    recordPilotBestEffortFailure("post-terminal-audit", error, {
      event: String(event?.event || ""),
      ticket_id: safeId(event?.ticket_id, 64),
    });
  }
}

function readJson(file: string): JsonObject | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    recordPilotBestEffortFailure("read-json", error, { file });
    return null;
  }
}

export const VOID_WC_PUBLIC_STATE_MAX_JSON_BYTES_V1 =
  256 * 1024;

type PublicStateRecordStampV1 = {
  dev: string;
  ino: string;
  size: string;
  mtime_ns: string;
  ctime_ns: string;
};

function publicStateRecordStampV1(
  stat: any,
): PublicStateRecordStampV1 {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: String(stat.size),
    mtime_ns: String(stat.mtimeNs),
    ctime_ns: String(stat.ctimeNs),
  };
}

function samePublicStateRecordStampV1(
  a: PublicStateRecordStampV1,
  b: PublicStateRecordStampV1,
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns
  );
}

export type WcPublicStateRecordReadHookForProofV1 =
  ((
    phase:
      | "after_lstat"
      | "after_precheck"
      | "after_read",
    file: string,
  ) => void) | null;

let publicStateRecordReadHookForProofV1:
  WcPublicStateRecordReadHookForProofV1 = null;
let publicStateRecordBytesReadTotalForProofV1 = 0;

export function setWcPublicStateRecordReadHookForProofV1(
  hook: WcPublicStateRecordReadHookForProofV1,
): void {
  publicStateRecordReadHookForProofV1 = hook;
}

export function resetWcPublicStateRecordReadMetricsForProofV1(): void {
  publicStateRecordBytesReadTotalForProofV1 = 0;
}

export function wcPublicStateRecordReadMetricsForProofV1(): {
  bytes_read_total: number;
} {
  return {
    bytes_read_total:
      publicStateRecordBytesReadTotalForProofV1,
  };
}

function readJsonStrict(
  file: string,
  label: string,
): JsonObject | null {
  let initialStat: any;
  try {
    initialStat = fs.lstatSync(
      file,
      { bigint: true } as any,
    );
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      return null;
    }
    throw new Error(`${label}_state_unavailable`);
  }

  if (!initialStat.isFile()) {
    throw new Error(`${label}_invalid_file_type`);
  }

  const initialSize = Number(initialStat.size);
  if (
    !Number.isSafeInteger(initialSize) ||
    initialSize < 0 ||
    initialSize >
      VOID_WC_PUBLIC_STATE_MAX_JSON_BYTES_V1
  ) {
    throw new Error(`${label}_too_large`);
  }
  const initialStamp =
    publicStateRecordStampV1(initialStat);

  publicStateRecordReadHookForProofV1?.(
    "after_lstat",
    file,
  );

  let fd: number | null = null;
  try {
    try {
      fd = fs.openSync(
        file,
        fs.constants.O_RDONLY |
          Number(fs.constants.O_NOFOLLOW || 0),
      );
    } catch (error: any) {
      const code = String(error?.code || "");
      if (code === "ENOENT") {
        throw new Error(`${label}_generation_changed`);
      }
      if (
        code === "ELOOP" ||
        code === "EISDIR" ||
        code === "ENXIO" ||
        code === "ENODEV"
      ) {
        throw new Error(`${label}_invalid_file_type`);
      }
      throw new Error(`${label}_state_unavailable`);
    }

    const beforeStat: any = fs.fstatSync(
      fd,
      { bigint: true } as any,
    );
    if (!beforeStat.isFile()) {
      throw new Error(`${label}_invalid_file_type`);
    }
    const beforeStamp =
      publicStateRecordStampV1(beforeStat);
    if (
      !samePublicStateRecordStampV1(
        initialStamp,
        beforeStamp,
      )
    ) {
      throw new Error(`${label}_generation_changed`);
    }

    const size = Number(beforeStat.size);
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size >
        VOID_WC_PUBLIC_STATE_MAX_JSON_BYTES_V1
    ) {
      throw new Error(`${label}_too_large`);
    }

    publicStateRecordReadHookForProofV1?.(
      "after_precheck",
      file,
    );

    const buffer = Buffer.alloc(
      Math.min(
        size + 1,
        VOID_WC_PUBLIC_STATE_MAX_JSON_BYTES_V1 + 1,
      ),
    );
    let offset = 0;
    while (offset < buffer.length) {
      const bytesRead = fs.readSync(
        fd,
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead <= 0) break;
      offset += bytesRead;
      publicStateRecordBytesReadTotalForProofV1 +=
        bytesRead;
    }

    if (offset !== size) {
      throw new Error(`${label}_generation_changed`);
    }

    publicStateRecordReadHookForProofV1?.(
      "after_read",
      file,
    );

    const afterStat: any = fs.fstatSync(
      fd,
      { bigint: true } as any,
    );
    if (!afterStat.isFile()) {
      throw new Error(`${label}_invalid_file_type`);
    }
    const afterStamp =
      publicStateRecordStampV1(afterStat);

    let pathStat: any;
    try {
      pathStat = fs.lstatSync(
        file,
        { bigint: true } as any,
      );
    } catch (error: any) {
      if (String(error?.code || "") === "ENOENT") {
        throw new Error(`${label}_generation_changed`);
      }
      throw new Error(`${label}_state_unavailable`);
    }
    if (!pathStat.isFile()) {
      throw new Error(`${label}_invalid_file_type`);
    }
    const pathStamp =
      publicStateRecordStampV1(pathStat);

    if (
      !samePublicStateRecordStampV1(
        beforeStamp,
        afterStamp,
      ) ||
      !samePublicStateRecordStampV1(
        afterStamp,
        pathStamp,
      )
    ) {
      throw new Error(`${label}_generation_changed`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(
        buffer.subarray(0, size).toString("utf8"),
      );
    } catch (error) {
      void error;
      throw new Error(`${label}_malformed`);
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(`${label}_not_object`);
    }
    return parsed as JsonObject;
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (error) {
        recordPilotBestEffortFailure(
          "strict-state-read-close",
          error,
          { label },
        );
      }
    }
  }
}

export function readWcPublicStateJsonStrictForProofV1(
  file: string,
  label = "proof_state",
): JsonObject | null {
  return readJsonStrict(file, label);
}

function ticketFile(dir: string, ticketId: string): string {
  return path.join(dir, `${ticketId}.json`);
}

function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const VOID_WC_PUBLIC_WORK_POSSESSION_DOMAIN_V1 =
  "VOID_WC_PUBLIC_DATASET_POSSESSION_HMAC_V1";
export const VOID_WC_PUBLIC_WORK_REFERENCE_MAX_BYTES_V1 =
  16 * 1024 * 1024;

export type WcPublicWorkReferenceReadHookForProofV1 =
  ((
    phase: "after_precheck" | "after_read",
    file: string,
  ) => void | Promise<void>) | null;

let publicWorkReferenceReadHookForProofV1:
  WcPublicWorkReferenceReadHookForProofV1 =
    null;
let publicWorkReferenceBytesReadTotalForProofV1 = 0;

export function setWcPublicWorkReferenceReadHookForProofV1(
  hook: WcPublicWorkReferenceReadHookForProofV1,
): void {
  publicWorkReferenceReadHookForProofV1 = hook;
}

export function resetWcPublicWorkReferenceReadMetricsForProofV1(): void {
  publicWorkReferenceBytesReadTotalForProofV1 = 0;
}

export function wcPublicWorkReferenceReadMetricsForProofV1(): {
  bytes_read_total: number;
} {
  return {
    bytes_read_total:
      publicWorkReferenceBytesReadTotalForProofV1,
  };
}

type PublicWorkReferenceStampV1 = {
  dev: string;
  ino: string;
  size: string;
  mtime_ns: string;
  ctime_ns: string;
};

function publicWorkReferenceStampV1(
  stat: any,
): PublicWorkReferenceStampV1 {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: String(stat.size),
    mtime_ns: String(stat.mtimeNs),
    ctime_ns: String(stat.ctimeNs),
  };
}

function samePublicWorkReferenceStampV1(
  a: PublicWorkReferenceStampV1,
  b: PublicWorkReferenceStampV1,
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns
  );
}

function publicWorkReferenceFileV1(
  record: PilotTicketRecord,
): string {
  const configured = String(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_FILE ||
      "",
  ).trim();
  if (configured) return path.resolve(configured);

  const datasetId = safeId(record.dataset_id, 160);
  if (!datasetId) {
    throw new Error("public_work_reference_unavailable");
  }

  const moduleDir = path.dirname(
    fileURLToPath(import.meta.url),
  );
  const repoRoot = path.resolve(
    moduleDir,
    "..",
    "..",
  );
  return path.join(
    repoRoot,
    "fixtures",
    "public-earning",
    `${datasetId}.json`,
  );
}

async function readPublicWorkReferenceBytesV1(
  record: PilotTicketRecord,
): Promise<Buffer> {
  const file = publicWorkReferenceFileV1(record);
  const flags =
    fs.constants.O_RDONLY |
    Number(fs.constants.O_NOFOLLOW || 0);

  let handle: Awaited<ReturnType<typeof fsp.open>>;
  try {
    handle = await fsp.open(file, flags);
  } catch (error) {
    void error;
    throw new Error("public_work_reference_unavailable");
  }

  try {
    const beforeStat: any = await handle.stat(
      { bigint: true } as any,
    );
    if (!beforeStat.isFile()) {
      throw new Error("public_work_reference_unavailable");
    }
    const before =
      publicWorkReferenceStampV1(beforeStat);
    const size = Number(beforeStat.size);
    if (
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      size > VOID_WC_PUBLIC_WORK_REFERENCE_MAX_BYTES_V1
    ) {
      throw new Error("public_work_reference_unavailable");
    }

    await publicWorkReferenceReadHookForProofV1?.(
      "after_precheck",
      file,
    );

    const bounded = Buffer.alloc(size + 1);
    let offset = 0;
    while (offset < bounded.length) {
      const { bytesRead } = await handle.read(
        bounded,
        offset,
        bounded.length - offset,
        offset,
      );
      if (bytesRead <= 0) break;
      offset += bytesRead;
      publicWorkReferenceBytesReadTotalForProofV1 +=
        bytesRead;
    }
    if (offset !== size) {
      throw new Error("public_work_reference_unstable");
    }
    const bytes = Buffer.from(
      bounded.subarray(0, size),
    );

    await publicWorkReferenceReadHookForProofV1?.(
      "after_read",
      file,
    );

    const afterStat: any = await handle.stat(
      { bigint: true } as any,
    );
    const after =
      publicWorkReferenceStampV1(afterStat);
    if (
      !afterStat.isFile() ||
      !samePublicWorkReferenceStampV1(
        before,
        after,
      )
    ) {
      throw new Error("public_work_reference_unstable");
    }

    let pathAfter: PublicWorkReferenceStampV1;
    try {
      const pathStat: any = await fsp.lstat(
        file,
        { bigint: true } as any,
      );
      if (!pathStat.isFile()) {
        throw new Error("public_work_reference_unavailable");
      }
      pathAfter =
        publicWorkReferenceStampV1(pathStat);
    } catch (error: any) {
      if (
        String(error?.message || "") ===
        "public_work_reference_unavailable"
      ) {
        throw error;
      }
      throw new Error("public_work_reference_unavailable");
    }

    if (
      !samePublicWorkReferenceStampV1(
        after,
        pathAfter,
      )
    ) {
      throw new Error("public_work_reference_unstable");
    }

    if (
      !safeHexEqual(
        sha256Hex(bytes),
        String(record.expected_input_hash || ""),
      )
    ) {
      throw new Error("public_work_reference_hash_mismatch");
    }

    return bytes;
  } finally {
    await handle.close();
  }
}

export function publicWorkPossessionProofV1(
  capabilityToken: string,
  ticketId: string,
  bytes: string | Buffer,
): string {
  const token = String(capabilityToken || "");
  const ticket = String(ticketId || "");
  if (!token || !/^[0-9a-f]{32}$/.test(ticket)) {
    throw new Error("useful_work_possession_invalid");
  }

  return crypto
    .createHmac(
      "sha256",
      Buffer.from(token, "utf8"),
    )
    .update(
      VOID_WC_PUBLIC_WORK_POSSESSION_DOMAIN_V1,
      "utf8",
    )
    .update(Buffer.from([0]))
    .update(ticket, "utf8")
    .update(Buffer.from([0]))
    .update(
      Buffer.isBuffer(bytes)
        ? bytes
        : Buffer.from(String(bytes), "utf8"),
    )
    .digest("hex");
}

export async function readWcPublicWorkReferenceBytesForProofV1(
  record: PilotTicketRecord,
): Promise<Buffer> {
  return readPublicWorkReferenceBytesV1(record);
}

async function verifyIndependentPublicWorkV1(
  record: PilotTicketRecord,
  envelope: PilotResultEnvelope,
  evidence: {
    transportMode: PilotTransportMode;
  },
  capabilityToken: string,
): Promise<{
  required: boolean;
  verified: boolean;
  mode: string;
  reference_bytes: number;
}> {
  // Public claims are the untrusted participant-facing earning surface.
  // Operator-issued pilot tickets keep their existing evidence contract.
  if (record.issuance_source !== "public_claim") {
    return {
      required: false,
      verified: false,
      mode: "not_required_for_non_public_claim",
      reference_bytes: 0,
    };
  }

  if (
    evidence.transportMode !== "outbound_bundle" ||
    envelope.transport_mode !== "outbound_bundle"
  ) {
    throw new Error("useful_work_transport_invalid");
  }

  const referenceBytes =
    await readPublicWorkReferenceBytesV1(record);
  const expected =
    publicWorkPossessionProofV1(
      capabilityToken,
      record.ticket_id,
      referenceBytes,
    );

  if (!safeHexEqual(expected, envelope.output_hash)) {
    throw new Error("useful_work_possession_invalid");
  }

  return {
    required: true,
    verified: true,
    mode:
      "capability_hmac_over_verified_dataset_bytes_v1",
    reference_bytes: referenceBytes.length,
  };
}


function canonicalJsonValueV1(value: any): any {
  if (Array.isArray(value)) return value.map((item) => canonicalJsonValueV1(item));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalJsonValueV1(value[key]);
    }
    return out;
  }
  return value;
}

function submissionDigestV1(
  envelope: PilotResultEnvelope,
  signature: JsonObject,
  proofBundle: JsonObject,
): string {
  return sha256Hex(
    JSON.stringify(
      canonicalJsonValueV1({
        envelope,
        signature,
        proof_bundle: proofBundle,
      }),
    ),
  );
}

let pilotTransactionFaultPhaseForProofV1 = "";

export function setPilotTransactionFaultForProofV1(phase: string): void {
  pilotTransactionFaultPhaseForProofV1 = String(phase || "");
}

function maybePilotTransactionFaultForProofV1(phase: string): void {
  if (pilotTransactionFaultPhaseForProofV1 === phase) {
    throw new Error(`VOID_WC_PILOT_PROOF_FAULT_${phase}`);
  }
}

function readPilotResultTransactionV1(
  ticketId: string,
  raw?: string,
): JsonObject | null {
  return readJsonStrict(
    resultTransactionFile(ticketId, raw),
    "pilot_result_transaction",
  );
}

function writePilotResultTransactionV1(
  ticketId: string,
  digest: string,
  phase: string,
  patch: JsonObject,
  raw?: string,
): JsonObject {
  const file = resultTransactionFile(ticketId, raw);
  const prior = readPilotResultTransactionV1(ticketId, raw);
  if (prior && String(prior.submission_sha256 || "") !== digest) {
    throw new Error("capability_result_conflict");
  }
  const next = {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    version: 1,
    ticket_id: ticketId,
    submission_sha256: digest,
    created_at_ms: Number(prior?.created_at_ms || Date.now()),
    ...prior,
    ...patch,
    phase,
    updated_at_ms: Date.now(),
  };
  atomicWriteJson(file, next);
  return next;
}

function safeHexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function safeAccount(raw: unknown): string {
  const value = String(raw || "").trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : "";
}

function safeId(raw: unknown, max = 180): string {
  const value = String(raw || "").trim();
  if (!value || value.length > max) return "";
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : "";
}

function safeNodeId(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(value) ? value : "";
}

function safeHex64(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(value) ? value : "";
}

function wcCompatProjectionV1(
  raw: unknown,
): number | null {
  return typeof raw === "number" && Number.isFinite(raw)
    ? raw
    : null;
}

function safeClaimNonce(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(value) ? value : "";
}

function hasExactKeys(raw: JsonObject, expected: string[]): boolean {
  const actual = Object.keys(raw).sort();
  const wanted = expected.slice().sort();
  return (
    actual.length === wanted.length &&
    actual.every((value, index) => value === wanted[index])
  );
}

function safeTransportMode(raw: unknown): PilotTransportMode | "" {
  const value = String(raw || "").trim();
  return value === "inbound_fetch" || value === "outbound_bundle"
    ? value
    : "";
}

function ticketTransportMode(
  record: Partial<PilotTicketRecord>,
): PilotTransportMode {
  const explicit = safeTransportMode(record.transport_mode);
  if (explicit) return explicit;
  return safeHttpBase(record.executor_http_base)
    ? "inbound_fetch"
    : "outbound_bundle";
}

function safeHttpBase(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value || value.length > 240) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return "";
    if (parsed.pathname && parsed.pathname !== "/") return "";
    return parsed.origin;
  } catch (error) {
    recordPilotBestEffortFailure("safe-http-base", error, { value });
    return "";
  }
}

function clampInt(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function coordinatorEnabled(): boolean {
  return String(process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED || "") === "1";
}

function executorEnabled(): boolean {
  return String(process.env.VOID_WC_PUBLIC_EARNING_EXECUTOR_ENABLED || "") === "1";
}

function publicClaimEnabled(): boolean {
  return String(process.env.VOID_WC_PUBLIC_TICKET_CLAIM_ENABLED || "") === "1";
}

function publicClaimDatasetId(): string {
  return safeId(process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID, 160);
}

function publicClaimExpectedInputHash(): string {
  return safeHex64(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH,
  );
}

function publicClaimTicketTtlMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS,
    15 * 60_000,
    60_000,
    60 * 60_000,
  );
}

function publicClaimClockSkewMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_CLOCK_SKEW_MS,
    5 * 60_000,
    30_000,
    15 * 60_000,
  );
}

function publicClaimCooldownMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS,
    15 * 60_000,
    60_000,
    24 * 60 * 60_000,
  );
}

function publicClaimMaxPer24h(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H,
    24,
    1,
    1_000,
  );
}

function publicClaimGlobalActiveCap(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP,
    10,
    1,
    1_000,
  );
}

function publicClaimGlobalMaxPer24h(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H,
    500,
    1,
    100_000,
  );
}

function defaultTtlMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_TTL_MS,
    15 * 60_000,
    60_000,
    60 * 60_000,
  );
}

function maxTtlMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_MAX_TTL_MS,
    60 * 60_000,
    60_000,
    24 * 60 * 60_000,
  );
}

function globalCap(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_GLOBAL_CAP,
    10,
    1,
    10_000,
  );
}

function perAccountCap(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_PER_ACCOUNT_CAP,
    1,
    1,
    100,
  );
}

function receiptTimestampSkewMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_RECEIPT_CLOCK_SKEW_MS,
    5 * 60_000,
    0,
    15 * 60_000,
  );
}

function loopbackOnly(req: any): boolean {
  const remote = String(
    req?.socket?.remoteAddress ||
      req?.connection?.remoteAddress ||
      req?.ip ||
      "",
  )
    .trim()
    .toLowerCase();
  return (
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1" ||
    remote === "localhost"
  );
}

function requireConfirmedLocalMutation(
  req: any,
  res: any,
  confirmation: string,
): boolean {
  if (!loopbackOnly(req)) {
    res.status(403).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "loopback_required",
    });
    return false;
  }
  const dry = String(req?.query?.dry || "");
  const confirm = String(req?.query?.confirm || "");
  if (dry !== "0" || confirm !== confirmation) {
    res.status(428).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "explicit_confirmation_required",
      required: confirmation,
    });
    return false;
  }
  return true;
}

function ticketCounts(now = Date.now(), raw?: string): {
  active: number;
  consumed: number;
  accountCounts: Record<string, number>;
  executorCounts: Record<string, number>;
  activeAccountCounts: Record<string, number>;
  activeExecutorCounts: Record<string, number>;
} {
  let active = 0;
  let consumed = 0;
  const accountCounts: Record<string, number> = {};
  const executorCounts: Record<string, number> = {};
  const activeAccountCounts: Record<string, number> = {};
  const activeExecutorCounts: Record<string, number> = {};

  for (const [dir, isConsumed] of [
    [issuedDir(raw), false],
    [consumedDir(raw), true],
  ] as const) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const record = readJson(path.join(dir, name));
      if (!record) continue;
      if (!isConsumed && Number(record.expires_at_ms || 0) <= now) continue;
      if (isConsumed) consumed += 1;
      else active += 1;
      const account = safeAccount(record.account);
      const executor = safeNodeId(record.executor_node_id);
      if (account) {
        accountCounts[account] = Number(accountCounts[account] || 0) + 1;
        if (!isConsumed) {
          activeAccountCounts[account] =
            Number(activeAccountCounts[account] || 0) + 1;
        }
      }
      if (executor) {
        executorCounts[executor] = Number(executorCounts[executor] || 0) + 1;
        if (!isConsumed) {
          activeExecutorCounts[executor] =
            Number(activeExecutorCounts[executor] || 0) + 1;
        }
      }
    }
  }

  return {
    active,
    consumed,
    accountCounts,
    executorCounts,
    activeAccountCounts,
    activeExecutorCounts,
  };
}

type IssueTicketOptions = {
  enforceLegacyCaps?: boolean;
  issuanceSource?: "operator" | "public_claim";
  publicClaimId?: string;
};

function issueTicket(
  input: JsonObject,
  raw?: string,
  options: IssueTicketOptions = {},
): JsonObject {
  ensureDirs(raw);
  const account = safeAccount(input.account);
  const executorNodeId = safeNodeId(input.executor_node_id);
  const transportMode = safeTransportMode(
    input.transport_mode || "inbound_fetch",
  );
  const executorHttpBase = safeHttpBase(input.executor_http_base);
  const executorHttpBaseRaw = String(input.executor_http_base || "").trim();
  const datasetId = safeId(input.dataset_id, 160);
  const expectedInputHash = safeHex64(input.expected_input_hash);
  const taskClass = String(
    input.task_class || VOID_WC_PUBLIC_EARNING_PILOT_TASK,
  ).trim();

  if (!account) throw new Error("invalid_account");
  if (!executorNodeId) throw new Error("invalid_executor_node_id");
  if (!transportMode) throw new Error("invalid_transport_mode");
  if (transportMode === "inbound_fetch" && !executorHttpBase) {
    throw new Error("invalid_executor_http_base");
  }
  if (transportMode === "outbound_bundle" && executorHttpBaseRaw) {
    throw new Error("outbound_executor_http_base_forbidden");
  }
  if (!datasetId) throw new Error("invalid_dataset_id");
  if (!expectedInputHash) throw new Error("invalid_expected_input_hash");
  if (taskClass !== VOID_WC_PUBLIC_EARNING_PILOT_TASK) {
    throw new Error("task_class_not_allowlisted");
  }

  const issuanceSource =
    options.issuanceSource === "public_claim" ? "public_claim" : "operator";
  const publicClaimId =
    issuanceSource === "public_claim"
      ? safeHex64(options.publicClaimId)
      : "";

  if (options.enforceLegacyCaps !== false) {
    const counts = ticketCounts(Date.now(), raw);
    if (counts.active + counts.consumed >= globalCap()) {
      throw new Error("global_cap_reached");
    }
    if (Number(counts.accountCounts[account] || 0) >= perAccountCap()) {
      throw new Error("account_cap_reached");
    }
    if (Number(counts.executorCounts[executorNodeId] || 0) >= perAccountCap()) {
      throw new Error("executor_cap_reached");
    }
  }

  const ttlMs = clampInt(input.ttl_ms, defaultTtlMs(), 60_000, maxTtlMs());
  const ticketId = crypto.randomBytes(16).toString("hex");
  const secret = crypto.randomBytes(32).toString("base64url");
  const token = `wcep1.${ticketId}.${secret}`;
  const now = Date.now();

  const record: PilotTicketRecord = {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    version: 1,
    ticket_id: ticketId,
    account,
    task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
    executor_node_id: executorNodeId,
    executor_http_base: transportMode === "inbound_fetch" ? executorHttpBase : "",
    transport_mode: transportMode,
    dataset_id: datasetId,
    expected_input_hash: expectedInputHash,
    token_sha256: sha256Hex(token),
    nonce: crypto.randomBytes(16).toString("hex"),
    issued_at_ms: now,
    expires_at_ms: now + ttlMs,
    max_uses: 1,
    status: "issued",
    public_submit_route: PUBLIC_SUBMIT_ROUTE,
    local_execute_route: LOCAL_EXECUTE_ROUTE,
    issuance_source: issuanceSource,
    ...(publicClaimId ? { public_claim_id: publicClaimId } : {}),
  };

  atomicWriteJson(
    ticketFile(issuedDir(raw), ticketId),
    record as unknown as JsonObject,
  );
  appendAuditBestEffort(
    {
      event:
        issuanceSource === "public_claim"
          ? "public_claim_ticket_issued"
          : "issued",
      issuance_source: issuanceSource,
      ...(publicClaimId ? { public_claim_id: publicClaimId } : {}),
      ticket_id: ticketId,
      account,
      executor_node_id: executorNodeId,
      executor_http_base: record.executor_http_base,
      transport_mode: transportMode,
      dataset_id: datasetId,
      expires_at_ms: record.expires_at_ms,
    },
    raw,
  );

  return {
    ...record,
    capability_token: token,
    capability_token_returned_once: true,
    operator_issued: issuanceSource === "operator",
    public_claim_issued: issuanceSource === "public_claim",
    fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    participant_selected_award: false,
    money_movement: false,
  };
}

function bearerOrBodyToken(req: any): string {
  const header = String(req?.headers?.authorization || "");
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return String(match?.[1] || req?.body?.capability_token || "").trim();
}

function parseToken(raw: string): {
  token: string;
  ticketId: string;
} | null {
  const token = String(raw || "").trim();
  const match = /^wcep1\.([0-9a-f]{32})\.([A-Za-z0-9_-]{20,})$/.exec(token);
  if (!match) return null;
  return { token, ticketId: match[1] };
}

const PUBLIC_TICKET_CLAIM_RAW_FIELDS_V1 = [
  "account",
  "claim_nonce",
  "claim_ts_ms",
  "domain",
  "executor_node_id",
  "executor_pubkey",
  "marker",
  "version",
] as const;

function assertExactPublicTicketClaimRawSchemaV1(
  raw: unknown,
): void {
  if (
    !isJsonObject(raw) ||
    !hasExactKeys(
      raw,
      [...PUBLIC_TICKET_CLAIM_RAW_FIELDS_V1],
    )
  ) {
    throw new Error("invalid_claim_request_schema");
  }

  for (const field of [
    "domain",
    "marker",
    "account",
    "executor_node_id",
    "executor_pubkey",
    "claim_nonce",
  ] as const) {
    if (typeof raw[field] !== "string") {
      throw new Error("invalid_claim_request_schema");
    }
  }

  if (
    raw.domain !==
      "void:mainnet-0:wc-public-ticket-claim-v1" ||
    raw.marker !==
      VOID_WC_PUBLIC_TICKET_CLAIM_MARKER ||
    typeof raw.version !== "number" ||
    raw.version !== 1 ||
    typeof raw.claim_ts_ms !== "number" ||
    !Number.isFinite(raw.claim_ts_ms) ||
    !Number.isSafeInteger(raw.claim_ts_ms) ||
    raw.claim_ts_ms <= 0
  ) {
    throw new Error("invalid_claim_request_schema");
  }
}

function assertExactPublicTicketClaimSignatureSchemaV1(
  raw: unknown,
): void {
  if (
    !isJsonObject(raw) ||
    !hasExactKeys(raw, ["alg", "key_id", "sig"]) ||
    typeof raw.alg !== "string" ||
    typeof raw.key_id !== "string" ||
    typeof raw.sig !== "string"
  ) {
    throw new Error("invalid_claim_signature_schema");
  }
}

export function publicTicketClaimSigningObject(
  raw: Partial<PublicTicketClaimRequest>,
): PublicTicketClaimRequest {
  if (!isJsonObject(raw)) throw new Error("invalid_claim_request");
  if (
    !hasExactKeys(raw, [
      "account",
      "claim_nonce",
      "claim_ts_ms",
      "domain",
      "executor_node_id",
      "executor_pubkey",
      "marker",
      "version",
    ])
  ) {
    throw new Error("unexpected_claim_request_field");
  }

  const claim: PublicTicketClaimRequest = {
    domain: String(raw.domain || "") as PublicTicketClaimRequest["domain"],
    marker: String(raw.marker || "") as PublicTicketClaimRequest["marker"],
    version: Number(raw.version || 0) as 1,
    account: safeAccount(raw.account),
    executor_node_id: safeNodeId(raw.executor_node_id),
    executor_pubkey: String(raw.executor_pubkey || ""),
    claim_nonce: safeClaimNonce(raw.claim_nonce),
    claim_ts_ms: Math.trunc(Number(raw.claim_ts_ms || 0)),
  };

  if (claim.domain !== "void:mainnet-0:wc-public-ticket-claim-v1") {
    throw new Error("claim_domain_mismatch");
  }
  if (claim.marker !== VOID_WC_PUBLIC_TICKET_CLAIM_MARKER) {
    throw new Error("claim_marker_mismatch");
  }
  if (claim.version !== 1) throw new Error("claim_version_unsupported");
  if (!claim.account) throw new Error("invalid_account");
  if (!claim.executor_node_id) throw new Error("invalid_executor_node_id");
  if (
    claim.executor_pubkey.length < 80 ||
    claim.executor_pubkey.length > 2_048 ||
    !claim.executor_pubkey.includes("BEGIN PUBLIC KEY") ||
    !claim.executor_pubkey.includes("END PUBLIC KEY")
  ) {
    throw new Error("invalid_executor_pubkey");
  }
  if (!claim.claim_nonce) throw new Error("invalid_claim_nonce");
  if (!Number.isFinite(claim.claim_ts_ms) || claim.claim_ts_ms <= 0) {
    throw new Error("invalid_claim_timestamp");
  }
  if (nodeIdFromPubPEM(claim.executor_pubkey) !== claim.executor_node_id) {
    throw new Error("claim_executor_pubkey_node_id_mismatch");
  }

  return claim;
}

export function publicTicketClaimSigningBytes(
  raw: Partial<PublicTicketClaimRequest>,
): Buffer {
  return Buffer.from(
    JSON.stringify(publicTicketClaimSigningObject(raw)),
    "utf8",
  );
}

export function signPublicTicketClaim(
  raw: Partial<PublicTicketClaimRequest>,
  privateKey: crypto.KeyObject,
): { claim: PublicTicketClaimRequest; signature: JsonObject } {
  const claim = publicTicketClaimSigningObject(raw);
  const sig = crypto
    .sign(null, publicTicketClaimSigningBytes(claim), privateKey)
    .toString("hex");
  return {
    claim,
    signature: {
      alg: "ed25519",
      key_id: claim.executor_node_id,
      sig,
    },
  };
}

function verifyPublicTicketClaimSignatureV1(
  claimRaw: Partial<PublicTicketClaimRequest>,
  signatureRaw: JsonObject,
): PublicTicketClaimRequest {
  assertExactPublicTicketClaimRawSchemaV1(
    claimRaw,
  );
  assertExactPublicTicketClaimSignatureSchemaV1(
    signatureRaw,
  );

  const claim = publicTicketClaimSigningObject(claimRaw);
  if (String(signatureRaw.alg || "") !== "ed25519") {
    throw new Error("claim_signature_algorithm_not_allowed");
  }
  if (
    safeNodeId(signatureRaw.key_id) !==
    claim.executor_node_id
  ) {
    throw new Error("claim_signature_key_id_mismatch");
  }
  const sig = String(signatureRaw.sig || "")
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(sig)) {
    throw new Error("invalid_claim_signature_shape");
  }

  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey(
      claim.executor_pubkey,
    );
  } catch (error) {
    recordPilotBestEffortFailure(
      "claim-public-key-parse",
      error,
    );
    throw new Error("invalid_executor_pubkey");
  }

  const verified = crypto.verify(
    null,
    publicTicketClaimSigningBytes(claim),
    publicKey,
    Buffer.from(sig, "hex"),
  );
  if (!verified) {
    throw new Error("claim_executor_signature_invalid");
  }
  return claim;
}

function assertPublicTicketClaimFreshV1(
  claim: PublicTicketClaimRequest,
  now: number,
): void {
  const ageMs = Math.abs(now - claim.claim_ts_ms);
  if (ageMs > publicClaimClockSkewMs()) {
    throw new Error("claim_timestamp_outside_window");
  }
}

export function verifyPublicTicketClaim(
  claimRaw: Partial<PublicTicketClaimRequest>,
  signatureRaw: JsonObject,
  now = Date.now(),
): PublicTicketClaimRequest {
  const claim = verifyPublicTicketClaimSignatureV1(
    claimRaw,
    signatureRaw,
  );
  assertPublicTicketClaimFreshV1(claim, now);
  return claim;
}

function publicClaimId(claim: PublicTicketClaimRequest): string {
  return sha256Hex(publicTicketClaimSigningBytes(claim));
}

function publicClaimUsage(now = Date.now(), raw?: string): {
  global24h: number;
  account24h: Record<string, number>;
  executor24h: Record<string, number>;
  lastAccountAt: Record<string, number>;
  lastExecutorAt: Record<string, number>;
} {
  const cutoff = now - 24 * 60 * 60_000;
  const account24h: Record<string, number> = {};
  const executor24h: Record<string, number> = {};
  const lastAccountAt: Record<string, number> = {};
  const lastExecutorAt: Record<string, number> = {};
  let global24h = 0;

  if (!fs.existsSync(claimsDir(raw))) {
    return {
      global24h,
      account24h,
      executor24h,
      lastAccountAt,
      lastExecutorAt,
    };
  }

  for (const name of fs.readdirSync(claimsDir(raw))) {
    if (!name.endsWith(".json")) continue;
    const record = readJson(path.join(claimsDir(raw), name));
    if (!record || String(record.status || "") !== "issued") continue;
    const issuedAt = Math.trunc(Number(record.issued_at_ms || 0));
    const account = safeAccount(record.account);
    const executor = safeNodeId(record.executor_node_id);
    if (!issuedAt || !account || !executor) continue;

    lastAccountAt[account] = Math.max(
      Number(lastAccountAt[account] || 0),
      issuedAt,
    );
    lastExecutorAt[executor] = Math.max(
      Number(lastExecutorAt[executor] || 0),
      issuedAt,
    );

    if (issuedAt < cutoff || issuedAt > now + publicClaimClockSkewMs()) {
      continue;
    }
    global24h += 1;
    account24h[account] = Number(account24h[account] || 0) + 1;
    executor24h[executor] = Number(executor24h[executor] || 0) + 1;
  }

  return {
    global24h,
    account24h,
    executor24h,
    lastAccountAt,
    lastExecutorAt,
  };
}

export function publicTicketClaimPolicySnapshot(): JsonObject {
  const datasetId = publicClaimDatasetId();
  const expectedInputHash = publicClaimExpectedInputHash();
  const workAvailable = Boolean(datasetId && expectedInputHash);
  return {
    marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
    enabled: publicClaimEnabled(),
    available: coordinatorEnabled() && publicClaimEnabled() && workAvailable,
    public_route: PUBLIC_CLAIM_ROUTE,
    local_sign_route: LOCAL_CLAIM_SIGN_ROUTE,
    task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
    fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    transport_mode: "outbound_bundle",
    server_selected_work: true,
    proof_of_executor_key_possession_required: true,
    signed_claim_timestamp_required: true,
    claim_nonce_replay_protection: true,
    one_active_ticket_per_account: true,
    one_active_ticket_per_executor: true,
    ticket_ttl_ms: publicClaimTicketTtlMs(),
    cooldown_ms: publicClaimCooldownMs(),
    max_claims_per_account_24h: publicClaimMaxPer24h(),
    max_claims_per_executor_24h: publicClaimMaxPer24h(),
    global_active_cap: publicClaimGlobalActiveCap(),
    global_claims_per_24h: publicClaimGlobalMaxPer24h(),
    work_available: workAvailable,
    participant_selected_dataset: false,
    participant_selected_input_hash: false,
    participant_selected_award: false,
    operator_issue_route_exposed: false,
    generic_job_submit: false,
    wallet_send: false,
    wc_to_void: false,
    buy_void_fulfillment: false,
    money_movement: false,
  };
}

export type PublicClaimBeforeIssuanceLockHookForProofV1 =
  (() => void | Promise<void>) | null;

let publicClaimBeforeIssuanceLockHookForProofV1:
  PublicClaimBeforeIssuanceLockHookForProofV1 = null;

export function setPublicClaimBeforeIssuanceLockHookForProofV1(
  hook: PublicClaimBeforeIssuanceLockHookForProofV1,
): void {
  publicClaimBeforeIssuanceLockHookForProofV1 = hook;
}

export type PublicClaimRecoveryBeforeTicketLockHookForProofV1 =
  ((ticketId: string) => void | Promise<void>) | null;

let publicClaimRecoveryBeforeTicketLockHookForProofV1:
  PublicClaimRecoveryBeforeTicketLockHookForProofV1 = null;

export function setPublicClaimRecoveryBeforeTicketLockHookForProofV1(
  hook: PublicClaimRecoveryBeforeTicketLockHookForProofV1,
): void {
  publicClaimRecoveryBeforeTicketLockHookForProofV1 = hook;
}

async function acquirePublicClaimIssuanceLockV1(
  raw?: string,
): Promise<WcProcessInstanceLockV1> {
  ensureDirs(raw);
  const deadline = Date.now() + 2_000;
  for (;;) {
    try {
      return await acquireWcProcessInstanceLockV1(
        locksDir(raw),
        "public-claim-issuance",
      );
    } catch (error: any) {
      const code = String(
        error?.code || error?.message || error,
      );
      if (
        code !== "wc_process_lock_busy" &&
        code !==
          "wc_process_lock_contention_retry_exhausted"
      ) {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          "VOID_WC_PUBLIC_CLAIM_ISSUANCE_BUSY",
        );
      }
      await new Promise<void>((resolve) =>
        setTimeout(resolve, 10),
      );
    }
  }
}

async function releasePublicClaimIssuanceLockV1(
  lock: WcProcessInstanceLockV1,
): Promise<void> {
  await releaseWcProcessInstanceLockV1(lock);
}

type PublicClaimCapabilitySealV1 = {
  marker: "VOID_WC_PUBLIC_CLAIM_CAPABILITY_SEAL_V1";
  algorithm: "aes-256-gcm";
  iv_b64url: string;
  ciphertext_b64url: string;
  auth_tag_b64url: string;
};

type PreparedPublicClaimTicketV1 = {
  token: string;
  record: PilotTicketRecord;
};

function publicClaimCapabilityRecoveryKeyV1(
  claim: PublicTicketClaimRequest,
  signatureRaw: string,
): Buffer {
  return crypto
    .createHash("sha256")
    .update("VOID_WC_PUBLIC_CLAIM_CAPABILITY_RECOVERY_KEY_V1\0", "utf8")
    .update(publicTicketClaimSigningBytes(claim))
    .update("\0", "utf8")
    .update(signatureRaw, "utf8")
    .digest();
}

function sealPublicClaimCapabilityTokenV1(
  token: string,
  claim: PublicTicketClaimRequest,
  signatureRaw: string,
): PublicClaimCapabilitySealV1 {
  const iv = crypto.randomBytes(12);
  const key = publicClaimCapabilityRecoveryKeyV1(
    claim,
    signatureRaw,
  );
  const aad = publicTicketClaimSigningBytes(claim);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv,
  );
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    marker: "VOID_WC_PUBLIC_CLAIM_CAPABILITY_SEAL_V1",
    algorithm: "aes-256-gcm",
    iv_b64url: iv.toString("base64url"),
    ciphertext_b64url: ciphertext.toString("base64url"),
    auth_tag_b64url: authTag.toString("base64url"),
  };
}

function unsealPublicClaimCapabilityTokenV1(
  sealRaw: unknown,
  claim: PublicTicketClaimRequest,
  signatureRaw: string,
): string {
  if (!isJsonObject(sealRaw)) {
    throw new Error("public_claim_recovery_seal_invalid");
  }
  const seal = sealRaw as JsonObject;
  if (
    seal.marker !==
      "VOID_WC_PUBLIC_CLAIM_CAPABILITY_SEAL_V1" ||
    seal.algorithm !== "aes-256-gcm"
  ) {
    throw new Error("public_claim_recovery_seal_invalid");
  }
  const ivText = String(seal.iv_b64url || "");
  const ciphertextText = String(
    seal.ciphertext_b64url || "",
  );
  const authTagText = String(seal.auth_tag_b64url || "");
  for (const value of [
    ivText,
    ciphertextText,
    authTagText,
  ]) {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error("public_claim_recovery_seal_invalid");
    }
  }
  const iv = Buffer.from(ivText, "base64url");
  const ciphertext = Buffer.from(
    ciphertextText,
    "base64url",
  );
  const authTag = Buffer.from(
    authTagText,
    "base64url",
  );
  if (
    iv.length !== 12 ||
    authTag.length !== 16 ||
    ciphertext.length <= 0 ||
    ciphertext.length > 512
  ) {
    throw new Error("public_claim_recovery_seal_invalid");
  }

  const key = publicClaimCapabilityRecoveryKeyV1(
    claim,
    signatureRaw,
  );
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    iv,
  );
  decipher.setAAD(publicTicketClaimSigningBytes(claim));
  decipher.setAuthTag(authTag);
  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    void error;
    throw new Error("public_claim_recovery_seal_invalid");
  }
}

function preparePublicClaimTicketV1(
  claim: PublicTicketClaimRequest,
  claimId: string,
  datasetId: string,
  expectedInputHash: string,
  issuedAtMs: number,
  expiresAtMs: number,
): PreparedPublicClaimTicketV1 {
  if (
    !Number.isSafeInteger(issuedAtMs) ||
    !Number.isSafeInteger(expiresAtMs) ||
    issuedAtMs <= 0 ||
    expiresAtMs <= issuedAtMs
  ) {
    throw new Error("public_claim_recovery_expiry_invalid");
  }
  const ticketId = crypto
    .randomBytes(16)
    .toString("hex");
  const secret = crypto
    .randomBytes(32)
    .toString("base64url");
  const token = `wcep1.${ticketId}.${secret}`;
  const record: PilotTicketRecord = {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    version: 1,
    ticket_id: ticketId,
    account: claim.account,
    task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
    executor_node_id: claim.executor_node_id,
    executor_http_base: "",
    transport_mode: "outbound_bundle",
    dataset_id: datasetId,
    expected_input_hash: expectedInputHash,
    token_sha256: sha256Hex(token),
    nonce: crypto.randomBytes(16).toString("hex"),
    issued_at_ms: issuedAtMs,
    expires_at_ms: expiresAtMs,
    max_uses: 1,
    status: "issued",
    public_submit_route: PUBLIC_SUBMIT_ROUTE,
    local_execute_route: LOCAL_EXECUTE_ROUTE,
    issuance_source: "public_claim",
    public_claim_id: claimId,
  };
  return { token, record };
}

function publicClaimTicketResponseV1(
  record: PilotTicketRecord,
): JsonObject {
  return {
    ...record,
    capability_token_returned_once: true,
    fixed_award_wc:
      VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    participant_selected_award: false,
    money_movement: false,
  };
}

function publicClaimSuccessResponseV1(
  claimId: string,
  prepared: PreparedPublicClaimTicketV1,
  recoveredClaimReplay: boolean,
): JsonObject {
  return {
    ok: true,
    marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
    claim_id: claimId,
    claim_request_verified: true,
    executor_key_possession_verified: true,
    server_selected_work: true,
    recovered_claim_replay: recoveredClaimReplay,
    ticket: publicClaimTicketResponseV1(
      prepared.record,
    ),
    capability_token: prepared.token,
    capability_token_returned_once: true,
    fixed_award_wc:
      VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    participant_selected_dataset: false,
    participant_selected_input_hash: false,
    participant_selected_award: false,
    generic_job_submit: false,
    wallet_send: false,
    wc_to_void: false,
    buy_void_fulfillment: false,
    money_movement: false,
  };
}

function publicClaimIdentityRecordV1(
  claim: PublicTicketClaimRequest,
  input: JsonObject,
  claimId: string,
  datasetId: string,
  expectedInputHash: string,
): JsonObject {
  return {
    marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
    version: 1,
    claim_id: claimId,
    account: claim.account,
    executor_node_id: claim.executor_node_id,
    executor_pubkey_sha256: sha256Hex(
      claim.executor_pubkey,
    ),
    claim_nonce_sha256: sha256Hex(
      claim.claim_nonce,
    ),
    claim_signature_sha256: sha256Hex(
      String(input?.signature?.sig || ""),
    ),
    dataset_id: datasetId,
    expected_input_hash: expectedInputHash,
    fixed_award_wc:
      VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    money_movement: false,
  };
}

function assertPublicClaimRecordIdentityV1(
  record: JsonObject,
  claim: PublicTicketClaimRequest,
  input: JsonObject,
  claimId: string,
  datasetId: string,
  expectedInputHash: string,
): void {
  const expected =
    publicClaimIdentityRecordV1(
      claim,
      input,
      claimId,
      datasetId,
      expectedInputHash,
    );
  for (const field of [
    "marker",
    "version",
    "claim_id",
    "account",
    "executor_node_id",
    "executor_pubkey_sha256",
    "claim_nonce_sha256",
    "claim_signature_sha256",
    "dataset_id",
    "expected_input_hash",
    "fixed_award_wc",
  ]) {
    if (
      String(record?.[field] ?? "") !==
      String(expected?.[field] ?? "")
    ) {
      throw new Error(
        "public_claim_recovery_identity_invalid",
      );
    }
  }
}

function assertPublicClaimHistoryEligibleV1(
  history: ReturnType<
    typeof wcPublicClaimHistorySnapshotV1
  >,
  now: number,
): void {
  if (
    history.active >= publicClaimGlobalActiveCap()
  ) {
    throw new Error(
      "public_claim_global_active_cap_reached",
    );
  }
  if (history.active_account >= 1) {
    throw new Error("public_claim_account_active");
  }
  if (history.active_executor >= 1) {
    throw new Error("public_claim_executor_active");
  }
  if (
    history.global_24h >=
    publicClaimGlobalMaxPer24h()
  ) {
    throw new Error(
      "public_claim_global_daily_cap_reached",
    );
  }
  if (
    history.account_24h >= publicClaimMaxPer24h()
  ) {
    throw new Error(
      "public_claim_account_daily_cap_reached",
    );
  }
  if (
    history.executor_24h >= publicClaimMaxPer24h()
  ) {
    throw new Error(
      "public_claim_executor_daily_cap_reached",
    );
  }
  if (
    history.last_account_at > 0 &&
    now - history.last_account_at <
      publicClaimCooldownMs()
  ) {
    throw new Error("public_claim_account_cooldown");
  }
  if (
    history.last_executor_at > 0 &&
    now - history.last_executor_at <
      publicClaimCooldownMs()
  ) {
    throw new Error(
      "public_claim_executor_cooldown",
    );
  }
}

function assertPublicClaimRecoveryCapacityV1(
  claim: PublicTicketClaimRequest,
  preparedRecord: PilotTicketRecord | null,
  now: number,
  raw?: string,
): void {
  const history = wcPublicClaimHistorySnapshotV1(
    raw,
    now,
    claim.account,
    claim.executor_node_id,
    publicClaimClockSkewMs(),
  );

  let ownActive = 0;
  if (preparedRecord) {
    const own = readJsonStrict(
      ticketFile(
        issuedDir(raw),
        preparedRecord.ticket_id,
      ),
      "public_claim_recovery_own_ticket",
    );
    if (own) {
      assertPublishedPublicClaimTicketV1(
        own,
        preparedRecord,
      );
      if (preparedRecord.expires_at_ms > now) {
        ownActive = 1;
      }
    }
  }

  // Preserve the stable recovery-specific terminal for live capacity
  // conflicts. Exclude only this exact recovery ticket when it is already
  // published and live.
  const otherActive = Math.max(
    0,
    history.active - ownActive,
  );
  const otherAccountActive = Math.max(
    0,
    history.active_account - ownActive,
  );
  const otherExecutorActive = Math.max(
    0,
    history.active_executor - ownActive,
  );

  if (
    otherActive >= publicClaimGlobalActiveCap() ||
    otherAccountActive >= 1 ||
    otherExecutorActive >= 1
  ) {
    throw new Error(
      "public_claim_recovery_capacity_conflict",
    );
  }

  // If recovery does not already own a live published ticket, continuing
  // would consume a fresh issuance slot. Revalidate all non-signature
  // current policy too: daily quota and cooldown. Journal identity bypasses
  // claim-signature freshness only; it does not reserve future policy quota
  // indefinitely.
  if (ownActive === 0) {
    assertPublicClaimHistoryEligibleV1(
      history,
      now,
    );
  }
}

function validatePreparedPublicClaimTicketV1(
  recordRaw: unknown,
  claim: PublicTicketClaimRequest,
  claimId: string,
  datasetId: string,
  expectedInputHash: string,
): PilotTicketRecord {
  if (!isJsonObject(recordRaw)) {
    throw new Error(
      "public_claim_recovery_ticket_invalid",
    );
  }
  const record = recordRaw as PilotTicketRecord;
  if (
    record.marker !==
      VOID_WC_PUBLIC_EARNING_PILOT_MARKER ||
    record.version !== 1 ||
    !/^[0-9a-f]{32}$/.test(
      String(record.ticket_id || ""),
    ) ||
    record.account !== claim.account ||
    record.task_class !==
      VOID_WC_PUBLIC_EARNING_PILOT_TASK ||
    record.executor_node_id !==
      claim.executor_node_id ||
    record.executor_http_base !== "" ||
    record.transport_mode !== "outbound_bundle" ||
    record.dataset_id !== datasetId ||
    record.expected_input_hash !==
      expectedInputHash ||
    !/^[0-9a-f]{64}$/.test(
      String(record.token_sha256 || ""),
    ) ||
    record.status !== "issued" ||
    record.max_uses !== 1 ||
    record.issuance_source !==
      "public_claim" ||
    record.public_claim_id !== claimId
  ) {
    throw new Error(
      "public_claim_recovery_ticket_invalid",
    );
  }
  return record;
}

function assertPublishedPublicClaimTicketV1(
  actual: JsonObject,
  expected: PilotTicketRecord,
): void {
  for (const field of [
    "marker",
    "version",
    "ticket_id",
    "account",
    "task_class",
    "executor_node_id",
    "executor_http_base",
    "transport_mode",
    "dataset_id",
    "expected_input_hash",
    "token_sha256",
    "nonce",
    "issued_at_ms",
    "expires_at_ms",
    "max_uses",
    "status",
    "public_submit_route",
    "local_execute_route",
    "issuance_source",
    "public_claim_id",
  ]) {
    if (
      String(actual?.[field] ?? "") !==
      String((expected as any)?.[field] ?? "")
    ) {
      throw new Error(
        "public_claim_recovery_ticket_mismatch",
      );
    }
  }
}

function publishPreparedPublicClaimTicketV1(
  prepared: PreparedPublicClaimTicketV1,
  raw?: string,
): void {
  const file = ticketFile(
    issuedDir(raw),
    prepared.record.ticket_id,
  );
  const existing = readJsonStrict(
    file,
    "public_claim_issued_ticket",
  );
  if (existing) {
    assertPublishedPublicClaimTicketV1(
      existing,
      prepared.record,
    );
    // A prior publication may have failed after rename but before
    // parent-directory fsync. Exact retry re-establishes durability.
    fsyncDirectoryV1(path.dirname(file));
    return;
  }
  atomicWriteJson(
    file,
    prepared.record as unknown as JsonObject,
  );
  appendAuditBestEffort(
    {
      event: "public_claim_ticket_issued",
      issuance_source: "public_claim",
      public_claim_id:
        prepared.record.public_claim_id,
      ticket_id: prepared.record.ticket_id,
      account: prepared.record.account,
      executor_node_id:
        prepared.record.executor_node_id,
      executor_http_base: "",
      transport_mode: "outbound_bundle",
      dataset_id: prepared.record.dataset_id,
      expected_input_hash:
        prepared.record.expected_input_hash,
      expires_at_ms:
        prepared.record.expires_at_ms,
    },
    raw,
  );
}

async function recoverPublicClaimReplayV1(
  existingClaim: JsonObject,
  claim: PublicTicketClaimRequest,
  input: JsonObject,
  claimId: string,
  datasetId: string,
  expectedInputHash: string,
  now: number,
  raw?: string,
): Promise<JsonObject | null> {
  assertPublicClaimRecordIdentityV1(
    existingClaim,
    claim,
    input,
    claimId,
    datasetId,
    expectedInputHash,
  );
  const status = String(
    existingClaim.status || "",
  );
  if (status === "reserving") {
    return null;
  }
  if (
    status !== "publishing" &&
    status !== "issued"
  ) {
    throw new Error(
      "public_claim_recovery_state_invalid",
    );
  }

  const preparedRecord =
    validatePreparedPublicClaimTicketV1(
      existingClaim.ticket_record,
      claim,
      claimId,
      datasetId,
      expectedInputHash,
    );
  if (
    Number(preparedRecord.expires_at_ms || 0) <=
    now
  ) {
    throw new Error("public_claim_replay");
  }

  const signatureRaw = String(
    input?.signature?.sig || "",
  );
  const token =
    unsealPublicClaimCapabilityTokenV1(
      existingClaim.capability_token_seal_v1,
      claim,
      signatureRaw,
    );
  const tokenMatch =
    /^wcep1\.([0-9a-f]{32})\.([A-Za-z0-9_-]{20,})$/.exec(
      token,
    );
  if (
    !tokenMatch ||
    tokenMatch[1] !== preparedRecord.ticket_id ||
    !safeHexEqual(
      sha256Hex(token),
      preparedRecord.token_sha256,
    )
  ) {
    throw new Error(
      "public_claim_recovery_token_invalid",
    );
  }

  await publicClaimRecoveryBeforeTicketLockHookForProofV1?.(
    preparedRecord.ticket_id,
  );

  let ticketLock: WcProcessInstanceLockV1 | null = null;
  try {
    ticketLock = await acquirePilotTicketLock(
      preparedRecord.ticket_id,
      raw,
    );

    const consumedPath = ticketFile(
      consumedDir(raw),
      preparedRecord.ticket_id,
    );
    if (
      readJsonStrict(
        consumedPath,
        "public_claim_consumed_ticket",
      )
    ) {
      throw new Error(
        "public_claim_capability_consumed",
      );
    }

    // Recovery owns both claim issuance and ticket single-use authority.
    // Re-check all other active capacity before returning/publishing.
    await prepareWcPublicClaimHistoryDecisionV1(raw);
    assertPublicClaimRecoveryCapacityV1(
      claim,
      preparedRecord,
      now,
      raw,
    );

    const issuedPath = ticketFile(
      issuedDir(raw),
      preparedRecord.ticket_id,
    );
    const published = readJsonStrict(
      issuedPath,
      "public_claim_issued_ticket",
    );
    if (published) {
      assertPublishedPublicClaimTicketV1(
        published,
        preparedRecord,
      );
      fsyncDirectoryV1(issuedDir(raw));
    } else if (status === "publishing") {
      publishPreparedPublicClaimTicketV1(
        {
          token,
          record: preparedRecord,
        },
        raw,
      );
    } else {
      throw new Error(
        "public_claim_recovery_ambiguous",
      );
    }

    if (status === "publishing") {
      const issuedState = {
        ...existingClaim,
        status: "issued",
        issued_at_ms: Number(
          existingClaim.issued_at_ms ||
            existingClaim.reserved_at_ms ||
            preparedRecord.issued_at_ms,
        ),
        recovery_completed_at_ms: now,
      };
      atomicWriteJson(
        path.join(claimsDir(raw), `${claimId}.json`),
        issuedState,
      );
      primeWcPublicClaimHistoryAuthorityV1(raw);
    }

    return publicClaimSuccessResponseV1(
      claimId,
      {
        token,
        record: preparedRecord,
      },
      true,
    );
  } finally {
    if (ticketLock) {
      await releasePilotTicketLock(ticketLock);
    }
  }
}

export async function issuePublicTicketClaim(
  input: JsonObject,
  raw?: string,
  now = Date.now(),
): Promise<JsonObject> {
  if (!coordinatorEnabled()) {
    throw new Error("coordinator_lane_disabled");
  }
  if (!publicClaimEnabled()) {
    throw new Error("public_ticket_claim_disabled");
  }
  if (!isJsonObject(input)) {
    throw new Error("invalid_claim_request_body");
  }
  if (!hasExactKeys(input, ["claim", "signature"])) {
    throw new Error(
      "unexpected_claim_request_body_field",
    );
  }

  const datasetId = publicClaimDatasetId();
  const expectedInputHash =
    publicClaimExpectedInputHash();
  if (!datasetId || !expectedInputHash) {
    throw new Error(
      "public_claim_work_unavailable",
    );
  }

  const claim = verifyPublicTicketClaimSignatureV1(
    input.claim || {},
    input.signature || {},
  );
  const claimId = publicClaimId(claim);
  const signatureRaw = String(
    input?.signature?.sig || "",
  );

  ensureDirs(raw);

  await publicClaimBeforeIssuanceLockHookForProofV1?.();
  const issuanceLock =
    await acquirePublicClaimIssuanceLockV1(raw);

  try {
    const claimFile = path.join(
      claimsDir(raw),
      `${claimId}.json`,
    );
    const existingClaim = readJsonStrict(
      claimFile,
      "public_claim",
    );

    if (existingClaim) {
      const replay = await recoverPublicClaimReplayV1(
        existingClaim,
        claim,
        input,
        claimId,
        datasetId,
        expectedInputHash,
        now,
        raw,
      );
      if (replay) {
        appendAuditBestEffort(
          {
            event: "public_claim_recovered_replay",
            claim_id: claimId,
            ticket_id: String(
              replay?.ticket?.ticket_id || "",
            ),
            account: claim.account,
            executor_node_id:
              claim.executor_node_id,
          },
          raw,
        );
        return replay;
      }

      // A reserving journal already owns recovery intent. It may survive the
      // original signature-skew window, but it may not resurrect capacity
      // now owned by another live ticket.
      await prepareWcPublicClaimHistoryDecisionV1(raw);
      assertPublicClaimRecoveryCapacityV1(
        claim,
        null,
        now,
        raw,
      );
    } else {
      assertPublicTicketClaimFreshV1(claim, now);
      await prepareWcPublicClaimHistoryDecisionV1(raw);
      const history = wcPublicClaimHistorySnapshotV1(
        raw,
        now,
        claim.account,
        claim.executor_node_id,
        publicClaimClockSkewMs(),
      );
      assertPublicClaimHistoryEligibleV1(
        history,
        now,
      );
    }

    const claimStartedAt = existingClaim
      ? Number(
          existingClaim.reserved_at_ms || now,
        )
      : now;
    const claimExpiresAt = existingClaim
      ? Number(
          existingClaim.claim_expires_at_ms ||
            claimStartedAt +
              publicClaimTicketTtlMs(),
        )
      : now + publicClaimTicketTtlMs();

    if (
      !Number.isSafeInteger(claimStartedAt) ||
      !Number.isSafeInteger(claimExpiresAt) ||
      claimStartedAt <= 0 ||
      claimExpiresAt <= now
    ) {
      throw new Error("public_claim_replay");
    }

    const identity =
      publicClaimIdentityRecordV1(
        claim,
        input,
        claimId,
        datasetId,
        expectedInputHash,
      );

    if (!existingClaim) {
      const reservation = {
        ...identity,
        status: "reserving",
        reserved_at_ms: claimStartedAt,
        claim_expires_at_ms: claimExpiresAt,
      };
      atomicWriteJson(claimFile, reservation);
      maybePilotTransactionFaultForProofV1(
        "public_claim_after_reservation",
      );
    }

    const prepared = preparePublicClaimTicketV1(
      claim,
      claimId,
      datasetId,
      expectedInputHash,
      now,
      claimExpiresAt,
    );
    const seal =
      sealPublicClaimCapabilityTokenV1(
        prepared.token,
        claim,
        signatureRaw,
      );

    const publishing = {
      ...identity,
      status: "publishing",
      reserved_at_ms: claimStartedAt,
      issued_at_ms: claimStartedAt,
      claim_expires_at_ms: claimExpiresAt,
      ticket_id: prepared.record.ticket_id,
      token_sha256:
        prepared.record.token_sha256,
      expires_at_ms:
        prepared.record.expires_at_ms,
      ticket_record: prepared.record,
      capability_token_seal_v1: seal,
    };
    atomicWriteJson(claimFile, publishing);
    maybePilotTransactionFaultForProofV1(
      "public_claim_after_publishing_journal",
    );

    publishPreparedPublicClaimTicketV1(
      prepared,
      raw,
    );
    maybePilotTransactionFaultForProofV1(
      "public_claim_after_ticket_published",
    );

    const issuedState = {
      ...publishing,
      status: "issued",
      issued_at_ms: claimStartedAt,
      issuance_completed_at_ms: now,
    };
    atomicWriteJson(claimFile, issuedState);
    primeWcPublicClaimHistoryAuthorityV1(raw);

    maybePilotTransactionFaultForProofV1(
      "public_claim_after_claim_issued_before_return",
    );

    appendAuditBestEffort(
      {
        event: "public_claim_accepted",
        claim_id: claimId,
        ticket_id: prepared.record.ticket_id,
        account: claim.account,
        executor_node_id: claim.executor_node_id,
        dataset_id: datasetId,
        expires_at_ms:
          prepared.record.expires_at_ms,
      },
      raw,
    );

    return publicClaimSuccessResponseV1(
      claimId,
      prepared,
      Boolean(existingClaim),
    );
  } finally {
    await releasePublicClaimIssuanceLockV1(
      issuanceLock,
    );
  }
}


const PILOT_RESULT_RAW_FIELDS_V1 = [
  "account",
  "dataset_id",
  "domain",
  "executor_http_base",
  "executor_node_id",
  "executor_pubkey",
  "expected_input_hash",
  "fetched_input_hash",
  "input_hash",
  "job_id",
  "marker",
  "output_hash",
  "receipt_id",
  "receipt_ts_ms",
  "task_class",
  "ticket_id",
  "transport_mode",
  "version",
] as const;

function assertExactPilotResultRawSchemaV1(
  raw: unknown,
): void {
  if (
    !isJsonObject(raw) ||
    !hasExactKeys(
      raw,
      [...PILOT_RESULT_RAW_FIELDS_V1],
    )
  ) {
    throw new Error("invalid_result_envelope_schema");
  }

  for (const field of [
    "account",
    "dataset_id",
    "domain",
    "executor_http_base",
    "executor_node_id",
    "executor_pubkey",
    "expected_input_hash",
    "fetched_input_hash",
    "input_hash",
    "job_id",
    "marker",
    "output_hash",
    "receipt_id",
    "task_class",
    "ticket_id",
    "transport_mode",
  ] as const) {
    if (typeof raw[field] !== "string") {
      throw new Error("invalid_result_envelope_schema");
    }
  }

  if (
    raw.domain !==
      "void:mainnet-0:wc-public-earning-pilot-v1" ||
    raw.marker !==
      VOID_WC_PUBLIC_EARNING_PILOT_MARKER ||
    typeof raw.version !== "number" ||
    raw.version !== 1 ||
    typeof raw.receipt_ts_ms !== "number" ||
    !Number.isFinite(raw.receipt_ts_ms) ||
    !Number.isSafeInteger(raw.receipt_ts_ms) ||
    raw.receipt_ts_ms <= 0
  ) {
    throw new Error("invalid_result_envelope_schema");
  }
}

function assertExactPilotResultSignatureSchemaV1(
  raw: unknown,
): void {
  if (
    !isJsonObject(raw) ||
    !hasExactKeys(raw, ["alg", "key_id", "sig"]) ||
    typeof raw.alg !== "string" ||
    typeof raw.key_id !== "string" ||
    typeof raw.sig !== "string"
  ) {
    throw new Error("invalid_result_signature_schema");
  }
}

export function pilotResultSigningObject(
  raw: Partial<PilotResultEnvelope>,
): PilotResultEnvelope {
  const executorHttpBase = safeHttpBase(raw.executor_http_base);
  const transportMode = safeTransportMode(
    raw.transport_mode ||
      (executorHttpBase ? "inbound_fetch" : "outbound_bundle"),
  );
  const envelope: PilotResultEnvelope = {
    domain: "void:mainnet-0:wc-public-earning-pilot-v1",
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    version: 1,
    ticket_id: safeId(raw.ticket_id, 64),
    account: safeAccount(raw.account),
    task_class: String(raw.task_class || "").trim(),
    executor_node_id: safeNodeId(raw.executor_node_id),
    executor_pubkey: String(raw.executor_pubkey || ""),
    executor_http_base: executorHttpBase,
    transport_mode: transportMode as PilotTransportMode,
    dataset_id: safeId(raw.dataset_id, 160),
    expected_input_hash: safeHex64(raw.expected_input_hash),
    job_id: safeId(raw.job_id, 160),
    receipt_id: safeId(raw.receipt_id, 180),
    input_hash: safeHex64(raw.input_hash),
    output_hash: safeHex64(raw.output_hash),
    fetched_input_hash: safeHex64(raw.fetched_input_hash),
    receipt_ts_ms: Math.trunc(Number(raw.receipt_ts_ms || 0)),
  };

  if (!/^[0-9a-f]{32}$/.test(envelope.ticket_id)) {
    throw new Error("invalid_ticket_id");
  }
  if (!envelope.account) throw new Error("invalid_account");
  if (envelope.task_class !== VOID_WC_PUBLIC_EARNING_PILOT_TASK) {
    throw new Error("task_class_not_allowlisted");
  }
  if (!envelope.executor_node_id) throw new Error("invalid_executor_node_id");
  if (!envelope.executor_pubkey.includes("BEGIN PUBLIC KEY")) {
    throw new Error("invalid_executor_pubkey");
  }
  if (!envelope.transport_mode) throw new Error("invalid_transport_mode");
  if (
    envelope.transport_mode === "inbound_fetch" &&
    !envelope.executor_http_base
  ) {
    throw new Error("invalid_executor_http_base");
  }
  if (
    envelope.transport_mode === "outbound_bundle" &&
    envelope.executor_http_base
  ) {
    throw new Error("outbound_executor_http_base_forbidden");
  }
  if (!envelope.dataset_id) throw new Error("invalid_dataset_id");
  if (!envelope.expected_input_hash) throw new Error("invalid_expected_input_hash");
  if (!envelope.job_id) throw new Error("invalid_job_id");
  if (!envelope.receipt_id) throw new Error("invalid_receipt_id");
  if (!envelope.input_hash) throw new Error("invalid_input_hash");
  if (!envelope.output_hash) throw new Error("invalid_output_hash");
  if (!envelope.fetched_input_hash) throw new Error("invalid_fetched_input_hash");
  if (!Number.isFinite(envelope.receipt_ts_ms) || envelope.receipt_ts_ms <= 0) {
    throw new Error("invalid_receipt_timestamp");
  }
  return envelope;
}

export function pilotResultSigningBytes(
  raw: Partial<PilotResultEnvelope>,
): Buffer {
  return Buffer.from(JSON.stringify(pilotResultSigningObject(raw)), "utf8");
}

export function signPilotResultEnvelope(
  raw: Partial<PilotResultEnvelope>,
  privateKey: crypto.KeyObject,
): { envelope: PilotResultEnvelope; signature: JsonObject } {
  const envelope = pilotResultSigningObject(raw);
  const sig = crypto
    .sign(null, pilotResultSigningBytes(envelope), privateKey)
    .toString("hex");
  return {
    envelope,
    signature: {
      alg: "ed25519",
      key_id: envelope.executor_node_id,
      sig,
    },
  };
}

export function verifyPilotResultEnvelope(
  raw: Partial<PilotResultEnvelope>,
  signatureRaw: JsonObject,
): PilotResultEnvelope {
  assertExactPilotResultRawSchemaV1(raw);
  assertExactPilotResultSignatureSchemaV1(
    signatureRaw,
  );
  const envelope = pilotResultSigningObject(raw);
  if (String(signatureRaw?.alg || "") !== "ed25519") {
    throw new Error("signature_algorithm_not_allowed");
  }
  if (safeNodeId(signatureRaw?.key_id) !== envelope.executor_node_id) {
    throw new Error("signature_key_id_mismatch");
  }
  const sig = String(signatureRaw?.sig || "").trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(sig)) {
    throw new Error("invalid_signature_shape");
  }
  if (nodeIdFromPubPEM(envelope.executor_pubkey) !== envelope.executor_node_id) {
    throw new Error("executor_pubkey_node_id_mismatch");
  }
  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey(envelope.executor_pubkey);
  } catch (error) {
    recordPilotBestEffortFailure("executor-public-key-parse", error);
    throw new Error("invalid_executor_pubkey");
  }
  const ok = crypto.verify(
    null,
    pilotResultSigningBytes(envelope),
    publicKey,
    Buffer.from(sig, "hex"),
  );
  if (!ok) throw new Error("executor_signature_invalid");
  return envelope;
}

async function cancelReadableBestEffortV1(
  readable: any,
  scope: string,
): Promise<void> {
  if (!readable || typeof readable.cancel !== "function") return;
  try {
    await readable.cancel("void_json_body_bound_v1");
  } catch (error) {
    recordPilotBestEffortFailure(scope, error);
  }
}

async function responseTextBoundedV1(
  response: Response,
  maxBodyBytesRaw: number,
): Promise<string> {
  const maxBodyBytes = Number.isSafeInteger(maxBodyBytesRaw)
    ? Math.max(1, maxBodyBytesRaw)
    : VOID_WC_PUBLIC_FETCH_MAX_JSON_BYTES_V1;
  const declaredRaw = String(
    response.headers.get("content-length") || "",
  ).trim();
  if (/^[0-9]+$/.test(declaredRaw)) {
    const declared = Number(declaredRaw);
    if (!Number.isSafeInteger(declared) || declared > maxBodyBytes) {
      await cancelReadableBestEffortV1(
        response.body,
        "fetch-json-declared-oversize-cancel",
      );
      throw new Error("remote_evidence_body_too_large");
    }
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      const bytes = Number(part.value?.byteLength || 0);
      if (total + bytes > maxBodyBytes) {
        await cancelReadableBestEffortV1(
          reader,
          "fetch-json-streamed-oversize-cancel",
        );
        throw new Error("remote_evidence_body_too_large");
      }
      if (bytes > 0) {
        chunks.push(Buffer.from(part.value));
        total += bytes;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      recordPilotBestEffortFailure("fetch-json-reader-release", error);
    }
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

async function fetchJson(
  url: string,
  init?: RequestInit,
  timeoutMs = 30_000,
  maxBodyBytes = VOID_WC_PUBLIC_FETCH_MAX_JSON_BYTES_V1,
): Promise<JsonObject> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...(init || {}),
      signal: controller.signal,
    });
    const text = await responseTextBoundedV1(response, maxBodyBytes);
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch (error) {
      recordPilotBestEffortFailure("fetch-json-parse", error, { url });
      body = {
        ok: false,
        error: "non_json_response",
        raw: text.slice(0, 500),
      };
    }
    if (!response.ok) {
      const error: any = new Error(String(body?.error || `http_${response.status}`));
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function findObject(
  value: any,
  predicate: (candidate: JsonObject) => boolean,
  depth = 0,
): JsonObject | null {
  if (!value || depth > 12) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    if (predicate(value)) return value;
    for (const child of Object.values(value)) {
      const found = findObject(child, predicate, depth + 1);
      if (found) return found;
    }
  } else if (Array.isArray(value)) {
    for (const child of value) {
      const found = findObject(child, predicate, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findJobId(value: any): string {
  const object = findObject(value, (candidate) => {
    const id = safeId(candidate.job_id || candidate.id, 160);
    if (!id) return false;
    if (candidate.receipt_id && !candidate.job_id) return false;
    return true;
  });
  return safeId(object?.job_id || object?.id, 160);
}

function findVerifiedReceipt(
  value: any,
  expectedReceiptId = "",
): JsonObject | null {
  return findObject(value, (candidate) => {
    const receiptId = safeId(candidate.receipt_id || candidate.id, 180);
    if (!receiptId) return false;
    if (expectedReceiptId && receiptId !== expectedReceiptId) return false;
    return (
      String(candidate.kind || "") === VOID_WC_PUBLIC_EARNING_PILOT_TASK &&
      String(candidate.status || "").toLowerCase() === "completed" &&
      candidate?.output?.verified === true
    );
  });
}

function normalizedRemoteJob(
  value: any,
  expectedJobId: string,
): JsonObject | null {
  let best: JsonObject | null = null;
  let bestScore = -1;

  const walk = (candidate: any, depth = 0): void => {
    if (!candidate || depth > 12) return;
    if (Array.isArray(candidate)) {
      for (const child of candidate) walk(child, depth + 1);
      return;
    }
    if (typeof candidate !== "object") return;

    const id = safeId(candidate.job_id || candidate.id, 160);
    if (id === expectedJobId) {
      let score = 0;
      if (candidate.account || candidate.who) score += 3;
      if (candidate.kind) score += 3;
      if (candidate.dataset_id || candidate.selected_dataset_id) score += 3;
      if (candidate.input && typeof candidate.input === "object") score += 2;
      if (candidate.meta && typeof candidate.meta === "object") score += 1;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    for (const child of Object.values(candidate)) {
      walk(child, depth + 1);
    }
  };

  walk(value);
  return best;
}

export function assertPilotTicketEnvelopeMatch(
  record: PilotTicketRecord,
  envelope: PilotResultEnvelope,
): void {
  const checks: Array<[string, string, string]> = [
    ["ticket_id", envelope.ticket_id, record.ticket_id],
    ["account", envelope.account, record.account],
    ["task_class", envelope.task_class, record.task_class],
    ["executor_node_id", envelope.executor_node_id, record.executor_node_id],
    ["executor_http_base", envelope.executor_http_base, record.executor_http_base],
    ["transport_mode", envelope.transport_mode, ticketTransportMode(record)],
    ["dataset_id", envelope.dataset_id, record.dataset_id],
    ["expected_input_hash", envelope.expected_input_hash, record.expected_input_hash],
  ];
  for (const [field, actual, expected] of checks) {
    if (actual !== expected) throw new Error(`ticket_${field}_mismatch`);
  }
  if (
    envelope.input_hash !== record.expected_input_hash ||
    envelope.fetched_input_hash !== record.expected_input_hash
  ) {
    throw new Error("verified_input_hash_mismatch");
  }

  const skewMs = receiptTimestampSkewMs();
  const now = Date.now();
  const earliestAllowed = Number(record.issued_at_ms || 0) - skewMs;
  const latestAllowed = Math.min(
    Number(record.expires_at_ms || 0) + skewMs,
    now + skewMs,
  );
  if (envelope.receipt_ts_ms < earliestAllowed) {
    throw new Error("receipt_timestamp_before_ticket");
  }
  if (envelope.receipt_ts_ms > latestAllowed) {
    throw new Error("receipt_timestamp_after_ticket");
  }
}

function parsedJobPlaintext(job: JsonObject): JsonObject {
  const raw = String(
    job.plaintext ||
      job?.input?.plaintext ||
      job?.input?.input?.plaintext ||
      "",
  ).trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    recordPilotBestEffortFailure("remote-job-plaintext-parse", error, {
      job_id: safeId(job.job_id || job.id, 160),
    });
    return {};
  }
}

export function assertRemoteJobTruth(
  raw: JsonObject,
  envelope: PilotResultEnvelope,
): void {
  const job = normalizedRemoteJob(raw, envelope.job_id);
  if (!job) throw new Error("remote_job_missing");
  const plaintext = parsedJobPlaintext(job);
  const account = safeAccount(
    job.account ||
      job.who ||
      job?.input?.account ||
      job?.input?.who ||
      job?.input?.input?.account ||
      job?.input?.input?.who,
  );
  const kind = String(
    job.kind ||
      job?.input?.kind ||
      job?.input?.input?.kind ||
      "",
  ).trim();
  const meta =
    (job?.meta && typeof job.meta === "object" ? job.meta : null) ||
    (job?.input?.meta && typeof job.input.meta === "object"
      ? job.input.meta
      : null) ||
    (job?.input?.input?.meta && typeof job.input.input.meta === "object"
      ? job.input.input.meta
      : null) ||
    {};
  const datasetId = safeId(
    job.dataset_id ||
      job.selected_dataset_id ||
      job?.input?.dataset_id ||
      job?.input?.input?.dataset_id ||
      meta.selected_dataset_id ||
      plaintext.dataset_id,
    160,
  );
  const expectedInputHash = safeHex64(
    plaintext.expected_input_hash ||
      job.expected_input_hash ||
      job?.input?.expected_input_hash ||
      job?.input?.input?.expected_input_hash,
  );
  const capabilityTicketId = safeId(
    plaintext.capability_ticket_id ||
      meta.capability_ticket_id ||
      job.capability_ticket_id ||
      job?.input?.capability_ticket_id ||
      job?.input?.input?.capability_ticket_id,
    64,
  );
  const executorNodeId = safeNodeId(
    plaintext.executor_node_id ||
      meta.executor_node_id ||
      job.executor_node_id ||
      job?.input?.executor_node_id ||
      job?.input?.input?.executor_node_id,
  );
  if (account !== envelope.account) throw new Error("remote_job_account_mismatch");
  if (kind !== envelope.task_class) throw new Error("remote_job_task_mismatch");
  if (datasetId !== envelope.dataset_id) {
    throw new Error("remote_job_dataset_mismatch");
  }
  if (expectedInputHash !== envelope.expected_input_hash) {
    throw new Error("remote_job_expected_input_hash_mismatch");
  }
  if (capabilityTicketId !== envelope.ticket_id) {
    throw new Error("remote_job_capability_ticket_mismatch");
  }
  if (executorNodeId !== envelope.executor_node_id) {
    throw new Error("remote_job_executor_node_mismatch");
  }
}

export function assertRemoteReceiptTruth(
  receipt: JsonObject,
  envelope: PilotResultEnvelope,
): void {
  const account = safeAccount(receipt.account || receipt.who || receipt.owner);
  const jobId = safeId(receipt.job_id, 160);
  const receiptId = safeId(receipt.receipt_id || receipt.id, 180);
  const datasetId = safeId(receipt.dataset_id || receipt.selected_dataset_id, 160);
  const kind = String(receipt.kind || "").trim();
  const status = String(receipt.status || "").trim().toLowerCase();
  const inputHash = safeHex64(receipt.input_hash);
  const outputHash = safeHex64(receipt.output_hash);
  const fetchedInputHash = safeHex64(receipt?.output?.fetched_input_hash);
  const receiptTsMs = Math.trunc(Number(receipt?.ts_ms || 0));
  if (!Number.isFinite(receiptTsMs) || receiptTsMs <= 0) {
    throw new Error("remote_receipt_timestamp_invalid");
  }

  const checks: Array<[string, string, string]> = [
    ["account", account, envelope.account],
    ["job_id", jobId, envelope.job_id],
    ["receipt_id", receiptId, envelope.receipt_id],
    ["dataset_id", datasetId, envelope.dataset_id],
    ["kind", kind, envelope.task_class],
    ["status", status, "completed"],
    ["input_hash", inputHash, envelope.input_hash],
    ["output_hash", outputHash, envelope.output_hash],
    ["fetched_input_hash", fetchedInputHash, envelope.fetched_input_hash],
  ];
  for (const [field, actual, expected] of checks) {
    if (actual !== expected) throw new Error(`remote_receipt_${field}_mismatch`);
  }
  if (receiptTsMs !== envelope.receipt_ts_ms) {
    throw new Error("remote_receipt_timestamp_mismatch");
  }
  if (receipt?.output?.verified !== true) {
    throw new Error("remote_receipt_not_verified");
  }
}

async function prepareImportedRemoteTruthIndexes(
  dataDir: string,
): Promise<{
  receiptFile: string;
  jobFile: string;
  completedFile: string;
}> {
  const receiptFile = path.join(dataDir, "agent_v1", "receipts.jsonl");
  const jobFile = path.join(dataDir, "agent", "jobs.jsonl");
  const completedFile = path.join(dataDir, "agent_v1", "job_state.jsonl");
  const specs = [
    { file: receiptFile, ids: ["receipt_id"] },
    { file: jobFile, ids: ["job_id"] },
    { file: completedFile, ids: ["job_id", "receipt_id"] },
  ];
  const prepared = await Promise.allSettled(
    specs.map(({ file, ids }) =>
      prepareWcPublicRemoteTruthJsonlExactOnceV1(
        file,
        ids,
        {
          durable: true,
          mode: 0o600,
          onMalformed: (error) => {
            recordPilotBestEffortFailure("read-jsonl-line", error, { file });
          },
        },
      ),
    ),
  );
  const failures = prepared.filter(
    (result): result is PromiseRejectedResult =>
      result.status === "rejected",
  );
  if (failures.length) {
    const messages = failures.map((result) =>
      String(result.reason?.message || result.reason),
    );
    const hard = messages.find(
      (message) =>
        !message.includes("VOID_WC_REMOTE_TRUTH_INDEX_WARMING"),
    );
    if (hard) throw new Error(hard);
    throw new Error("VOID_WC_REMOTE_TRUTH_INDEX_WARMING");
  }
  return { receiptFile, jobFile, completedFile };
}

async function appendExactOnce(
  file: string,
  value: JsonObject,
  idFields: string[],
): Promise<{ appended: boolean; existing: JsonObject | null }> {
  const result = await appendWcPublicRemoteTruthJsonlExactOnceV1(
    file,
    value,
    idFields,
    {
      durable: true,
      mode: 0o600,
      onMalformed: (error) => {
        recordPilotBestEffortFailure("read-jsonl-line", error, { file });
      },
    },
  );
  return { appended: result.appended, existing: result.existing };
}

let importedRemoteTruthSerialTailV1: Promise<void> = Promise.resolve();

async function serializeImportedRemoteTruthV1<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const previous = importedRemoteTruthSerialTailV1;
  let release!: () => void;
  importedRemoteTruthSerialTailV1 = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function persistImportedRemoteTruthOnce(
  envelopeRaw: Partial<PilotResultEnvelope>,
  signatureRaw: JsonObject,
  raw?: string,
): Promise<JsonObject> {
  const envelope = verifyPilotResultEnvelope(envelopeRaw, signatureRaw);
  const dataDir = resolveDataDir(raw);
  const {
    receiptFile,
    jobFile,
    completedFile,
  } = await prepareImportedRemoteTruthIndexes(dataDir);
  return serializeImportedRemoteTruthV1(async () => {
  const importedAt = Date.now();
  const provenance = {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    capability_ticket_id: envelope.ticket_id,
    executor_node_id: envelope.executor_node_id,
    executor_http_base: envelope.executor_http_base,
    transport_mode: envelope.transport_mode,
    coordinator_inbound_fetch: envelope.transport_mode === "inbound_fetch",
    participant_outbound_bundle: envelope.transport_mode === "outbound_bundle",
    executor_signature_sha256: sha256Hex(String(signatureRaw?.sig || "")),
    verified_remote_health: true,
    verified_remote_job: true,
    verified_remote_receipt: true,
    imported_at_ms: importedAt,
  };

  const receipt: JsonObject = {
    receipt_id: envelope.receipt_id,
    job_id: envelope.job_id,
    account: envelope.account,
    kind: envelope.task_class,
    status: "completed",
    dataset_id: envelope.dataset_id,
    input_hash: envelope.input_hash,
    output_hash: envelope.output_hash,
    output: {
      verified: true,
      fetched_input_hash: envelope.fetched_input_hash,
    },
    ts_ms: envelope.receipt_ts_ms,
    remote_executor_provenance: provenance,
  };

  const job: JsonObject = {
    id: envelope.job_id,
    job_id: envelope.job_id,
    account: envelope.account,
    kind: envelope.task_class,
    status: "queued",
    dataset_id: envelope.dataset_id,
    selected_dataset_id: envelope.dataset_id,
    meta: {
      selection_reason: "wc_public_earning_pilot_v1",
      capability_ticket_id: envelope.ticket_id,
      executor_node_id: envelope.executor_node_id,
    },
    remote_executor_provenance: provenance,
  };

  const completed: JsonObject = {
    job_id: envelope.job_id,
    status: "completed",
    receipt_id: envelope.receipt_id,
    dataset_id: envelope.dataset_id,
    input_hash: envelope.input_hash,
    output_hash: envelope.output_hash,
    verified: true,
    completed_at_ms: envelope.receipt_ts_ms,
    remote_executor_provenance: provenance,
  };

  const receiptResult = await appendExactOnce(
    receiptFile,
    receipt,
    ["receipt_id"],
  );
  const jobResult = await appendExactOnce(
    jobFile,
    job,
    ["job_id"],
  );
  const completedResult = await appendExactOnce(
    completedFile,
    completed,
    ["job_id", "receipt_id"],
  );

  return {
    envelope,
    receipt,
    job,
    completed,
    appended: {
      receipt: receiptResult.appended,
      job: jobResult.appended,
      completed: completedResult.appended,
    },
  };
  }); // VOID_WC_IMPORTED_REMOTE_TRUTH_SERIAL_V1
}

export async function verifyPilotSubmissionEvidence(
  record: PilotTicketRecord,
  envelope: PilotResultEnvelope,
  proofBundleRaw?: JsonObject,
): Promise<{
  transportMode: PilotTransportMode;
  health: JsonObject;
  job: JsonObject;
  receipt: JsonObject;
  coordinatorInboundFetch: boolean;
  participantOutboundBundle: boolean;
}> {
  const transportMode = ticketTransportMode(record);

  if (transportMode === "outbound_bundle") {
    const proofBundle = isJsonObject(proofBundleRaw)
      ? proofBundleRaw
      : {};
    if (
      proofBundle.marker !== VOID_WC_PUBLIC_EARNING_PILOT_MARKER ||
      Number(proofBundle.version || 0) !== 1 ||
      safeTransportMode(proofBundle.transport_mode) !== "outbound_bundle" ||
      safeId(proofBundle.ticket_id, 64) !== envelope.ticket_id ||
      safeNodeId(proofBundle.executor_node_id) !==
        envelope.executor_node_id ||
      safeId(proofBundle.job_id, 160) !== envelope.job_id ||
      safeId(proofBundle.receipt_id, 180) !== envelope.receipt_id
    ) {
      throw new Error("outbound_proof_bundle_invalid");
    }

    const health = isJsonObject(proofBundle.health)
      ? proofBundle.health
      : {};
    const job = isJsonObject(proofBundle.job)
      ? proofBundle.job
      : {};
    const receiptCandidate = isJsonObject(proofBundle.receipt)
      ? proofBundle.receipt
      : {};

    if (health?.ok !== true) {
      throw new Error("outbound_health_not_ok");
    }
    if (safeNodeId(health?.nodeId) !== record.executor_node_id) {
      throw new Error("outbound_health_node_id_mismatch");
    }
    assertRemoteJobTruth(job, envelope);
    const receipt = findVerifiedReceipt(
      receiptCandidate,
      envelope.receipt_id,
    );
    if (!receipt) throw new Error("outbound_receipt_missing");
    assertRemoteReceiptTruth(receipt, envelope);

    return {
      transportMode,
      health,
      job,
      receipt,
      coordinatorInboundFetch: false,
      participantOutboundBundle: true,
    };
  }

  const health = await fetchJson(
    `${record.executor_http_base}/health`,
    undefined,
    10_000,
    VOID_WC_PUBLIC_REMOTE_EVIDENCE_MAX_JSON_BYTES_V1,
  );
  if (safeNodeId(health?.nodeId) !== record.executor_node_id) {
    throw new Error("remote_health_node_id_mismatch");
  }

  const job = await fetchJson(
    `${record.executor_http_base}/jobs/${encodeURIComponent(envelope.job_id)}`,
    undefined,
    15_000,
    VOID_WC_PUBLIC_REMOTE_EVIDENCE_MAX_JSON_BYTES_V1,
  );
  assertRemoteJobTruth(job, envelope);

  const remoteReceipts = await fetchJson(
    `${record.executor_http_base}/receipts` +
      `?account=${encodeURIComponent(record.account)}&limit=50`,
    undefined,
    15_000,
    VOID_WC_PUBLIC_REMOTE_EVIDENCE_MAX_JSON_BYTES_V1,
  );
  const receipt = findVerifiedReceipt(
    remoteReceipts,
    envelope.receipt_id,
  );
  if (!receipt) throw new Error("remote_receipt_missing");
  assertRemoteReceiptTruth(receipt, envelope);

  return {
    transportMode,
    health,
    job,
    receipt,
    coordinatorInboundFetch: true,
    participantOutboundBundle: false,
  };
}

export async function acquirePilotTicketLock(
  ticketIdRaw: string,
  raw?: string,
): Promise<WcProcessInstanceLockV1> {
  const ticketId = safeId(ticketIdRaw, 64);
  if (!/^[0-9a-f]{32}$/.test(ticketId)) {
    throw new Error("invalid_ticket_id");
  }
  ensureDirs(raw);
  try {
    return await acquireWcProcessInstanceLockV1(
      locksDir(raw),
      `ticket-${ticketId}`,
    );
  } catch (error: any) {
    if (String(error?.code || "") === "wc_process_lock_busy") {
      throw new Error("ticket_inflight");
    }
    throw error;
  }
}

export async function releasePilotTicketLock(
  lock: WcProcessInstanceLockV1,
): Promise<void> {
  await releaseWcProcessInstanceLockV1(lock);
}

function completeTicket(
  record: PilotTicketRecord,
  patch: JsonObject,
  raw?: string,
): JsonObject {
  const completed = {
    ...record,
    ...patch,
    status: "completed",
    completed_at_ms: Date.now(),
  };
  const consumedPath = ticketFile(consumedDir(raw), record.ticket_id);
  atomicWriteJson(consumedPath, completed);
  try {
    fs.unlinkSync(ticketFile(issuedDir(raw), record.ticket_id));
  } catch (error) {
    recordPilotBestEffortFailure("complete-ticket-issued-cleanup", error, {
      ticket_id: record.ticket_id,
    });
  }
  return completed;
}

function loadLocalExecutorClaimSigner(): {
  nodeId: string;
  keypair: ReturnType<typeof loadKeypair>;
} {
  const node: any =
    (globalThis as any).__void_node ||
    (globalThis as any).node ||
    (globalThis as any).VOID_NODE;
  const liveNodeId = safeNodeId(node?.id);
  if (!liveNodeId) throw new Error("executor_node_identity_unavailable");

  const keyPathRaw = String(
    process.env.NODE_PRIVKEY_PATH ||
      process.env.KEY_FILE ||
      process.env.VOID_NODE_KEY_A ||
      "",
  ).trim();
  if (!keyPathRaw) throw new Error("executor_key_unavailable");
  const keyPath = path.resolve(keyPathRaw);
  if (!fs.existsSync(keyPath)) throw new Error("executor_key_unavailable");

  const keypair = loadKeypair(keyPath);
  if (keypair.nodeId !== liveNodeId) {
    throw new Error("executor_key_node_binding_mismatch");
  }
  return { nodeId: liveNodeId, keypair };
}

function signLocalPublicTicketClaim(req: any, res: any): any {
  if (!executorEnabled()) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
      error: "executor_lane_disabled",
    });
  }
  if (
    !requireConfirmedLocalMutation(
      req,
      res,
      "wcPublicTicketClaimSign",
    )
  ) {
    return;
  }

  try {
    if (!isJsonObject(req?.body)) {
      throw new Error("invalid_claim_sign_request");
    }
    if (!hasExactKeys(req.body, ["account"])) {
      throw new Error("unexpected_claim_sign_request_field");
    }
    const account = safeAccount(req.body.account);
    if (!account) throw new Error("invalid_account");

    const signer = loadLocalExecutorClaimSigner();
    const signed = signPublicTicketClaim(
      {
        domain: "void:mainnet-0:wc-public-ticket-claim-v1",
        marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
        version: 1,
        account,
        executor_node_id: signer.nodeId,
        executor_pubkey: signer.keypair.pubPEM,
        claim_nonce: crypto.randomBytes(16).toString("hex"),
        claim_ts_ms: Date.now(),
      },
      signer.keypair.privateKey,
    );

    return res.status(200).json({
      ok: true,
      marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
      local_node_id: signer.nodeId,
      ...signed,
      signature_operation: "local_executor_claim_only",
      ticket_issued: false,
      wc_written: false,
      money_movement: false,
    });
  } catch (error: any) {
    const message = String(error?.message || error);
    const status =
      message.includes("unavailable")
        ? 503
        : message.includes("binding_mismatch")
          ? 403
          : 400;
    return res.status(status).json({
      ok: false,
      marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
      error: message,
      ticket_issued: false,
      wc_written: false,
      money_movement: false,
    });
  }
}

async function executeLocalWork(req: any, res: any): Promise<any> {
  if (!executorEnabled()) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_lane_disabled",
    });
  }
  if (
    !requireConfirmedLocalMutation(
      req,
      res,
      "wcPublicEarningPilotExecuteLocal",
    )
  ) {
    return;
  }

  const ticket = req?.body?.ticket || {};
  const token = bearerOrBodyToken(req);
  const coordinatorBase = safeHttpBase(req?.body?.coordinator_base);
  const account = safeAccount(ticket.account);
  const executorNodeId = safeNodeId(ticket.executor_node_id);
  const datasetId = safeId(ticket.dataset_id, 160);
  const expectedInputHash = safeHex64(ticket.expected_input_hash);
  const ticketId = safeId(ticket.ticket_id, 64);
  const transportMode = ticketTransportMode(ticket);
  const expiresAt = Number(ticket.expires_at_ms || 0);

  const parsedToken = parseToken(token);
  if (!parsedToken || parsedToken.ticketId !== ticketId) {
    return res.status(401).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_capability",
    });
  }
  if (!coordinatorBase) {
    return res.status(400).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_coordinator_base",
    });
  }
  if (
    !account ||
    !executorNodeId ||
    !datasetId ||
    !expectedInputHash ||
    !/^[0-9a-f]{32}$/.test(ticketId)
  ) {
    return res.status(400).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_ticket",
    });
  }
  if (expiresAt <= Date.now()) {
    return res.status(410).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "capability_expired",
    });
  }

  const node: any =
    (globalThis as any).__void_node ||
    (globalThis as any).node ||
    (globalThis as any).VOID_NODE;
  const liveNodeId = safeNodeId(node?.id);
  if (!liveNodeId || liveNodeId !== executorNodeId) {
    return res.status(403).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_node_binding_mismatch",
      local_node_id: liveNodeId || null,
    });
  }

  const keyPathRaw = String(
    process.env.NODE_PRIVKEY_PATH ||
      process.env.KEY_FILE ||
      process.env.VOID_NODE_KEY_A ||
      "",
  ).trim();
  if (!keyPathRaw) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_key_unavailable",
    });
  }
  const keyPath = path.resolve(keyPathRaw);
  if (!fs.existsSync(keyPath)) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_key_unavailable",
    });
  }
  const kp = loadKeypair(keyPath);
  if (kp.nodeId !== executorNodeId) {
    return res.status(403).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_key_node_binding_mismatch",
    });
  }

  const port = String(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100");
  const localBase = `http://127.0.0.1:${port}`;
  const plaintext = JSON.stringify({
    dataset_id: datasetId,
    expected_input_hash: expectedInputHash,
    stale_for_ms: 600_000,
    difficulty_bucket: "high",
    network_need_score: 1,
    capability_ticket_id: ticketId,
    executor_node_id: executorNodeId,
  });

  const submitted = await fetchJson(
    `${localBase}/jobs/submit?dry=0&confirm=jobsSubmit`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account,
        kind: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
        plaintext,
        meta: {
          selection_reason: "wc_public_earning_pilot_v1",
          selected_task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
          selected_dataset_id: datasetId,
          selected_difficulty_bucket: "high",
          selected_network_need_score: 1,
          selected_stale_for_ms: 600_000,
          safe_mode: true,
          capability_ticket_id: ticketId,
          executor_node_id: executorNodeId,
        },
      }),
    },
    15_000,
  );

  const jobId = findJobId(submitted);
  if (!jobId) throw new Error("local_job_submit_missing_job_id");

  const worked = await fetchJson(
    `${localBase}/__void/jobs-and-datanet-worker/run-once` +
      `?account=${encodeURIComponent(account)}` +
      `&job_id=${encodeURIComponent(jobId)}` +
      `&dry=0&confirm=jobsWorkerRunOnce`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account, job_id: jobId }),
    },
    60_000,
  );

  const receipt = findVerifiedReceipt(worked);
  if (!receipt) throw new Error("local_verified_receipt_missing");
  const receiptId = safeId(receipt.receipt_id || receipt.id, 180);
  const receiptJobId = safeId(receipt.job_id, 160);
  const receiptAccount = safeAccount(receipt.account || receipt.who || receipt.owner);
  const receiptDatasetId = safeId(
    receipt.dataset_id || receipt.selected_dataset_id,
    160,
  );
  const inputHash = safeHex64(receipt.input_hash);
  const outputHash = safeHex64(receipt.output_hash);
  const fetchedInputHash = safeHex64(receipt?.output?.fetched_input_hash);
  const receiptTs = Math.trunc(Number(receipt.ts_ms || 0));
  if (!Number.isFinite(receiptTs) || receiptTs <= 0) {
    throw new Error("local_receipt_timestamp_invalid");
  }

  if (receiptJobId !== jobId) throw new Error("local_receipt_job_mismatch");
  if (receiptAccount !== account) throw new Error("local_receipt_account_mismatch");
  if (receiptDatasetId !== datasetId) throw new Error("local_receipt_dataset_mismatch");
  if (
    inputHash !== expectedInputHash ||
    fetchedInputHash !== expectedInputHash
  ) {
    throw new Error("local_receipt_input_hash_mismatch");
  }
  if (!outputHash) throw new Error("local_receipt_output_hash_invalid");

  const executorHttpBase = safeHttpBase(ticket.executor_http_base);
  if (transportMode === "inbound_fetch" && !executorHttpBase) {
    throw new Error("invalid_executor_http_base");
  }
  if (transportMode === "outbound_bundle" && executorHttpBase) {
    throw new Error("outbound_executor_http_base_forbidden");
  }

  const signed = signPilotResultEnvelope(
    {
      ticket_id: ticketId,
      account,
      task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
      executor_node_id: executorNodeId,
      executor_pubkey: kp.pubPEM,
      executor_http_base: executorHttpBase,
      transport_mode: transportMode,
      dataset_id: datasetId,
      expected_input_hash: expectedInputHash,
      job_id: jobId,
      receipt_id: receiptId,
      input_hash: inputHash,
      output_hash: outputHash,
      fetched_input_hash: fetchedInputHash,
      receipt_ts_ms: receiptTs,
    },
    kp.privateKey,
  );

  let proofBundle: JsonObject | undefined;
  if (transportMode === "outbound_bundle") {
    const localHealth = await fetchJson(`${localBase}/health`, undefined, 10_000);
    if (localHealth?.ok !== true || safeNodeId(localHealth?.nodeId) !== executorNodeId) {
      throw new Error("local_outbound_health_invalid");
    }
    const localJob = await fetchJson(
      `${localBase}/jobs/${encodeURIComponent(jobId)}`,
      undefined,
      15_000,
    );
    assertRemoteJobTruth(localJob, signed.envelope);
    const localReceipts = await fetchJson(
      `${localBase}/receipts` +
        `?account=${encodeURIComponent(account)}&limit=50`,
      undefined,
      15_000,
    );
    const persistedReceipt = findVerifiedReceipt(localReceipts, receiptId);
    if (!persistedReceipt) throw new Error("local_outbound_receipt_missing");
    assertRemoteReceiptTruth(persistedReceipt, signed.envelope);
    proofBundle = {
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      version: 1,
      transport_mode: "outbound_bundle",
      ticket_id: ticketId,
      executor_node_id: executorNodeId,
      job_id: jobId,
      receipt_id: receiptId,
      health: localHealth,
      job: localJob,
      receipt: persistedReceipt,
    };
  }

  const coordinator = await fetchJson(
    `${coordinatorBase}${PUBLIC_SUBMIT_ROUTE}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...signed,
        ...(proofBundle ? { proof_bundle: proofBundle } : {}),
      }),
    },
    45_000,
  );

  return res.status(200).json({
    ok: true,
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    remote_executor: true,
    local_node_id: executorNodeId,
    transport_mode: transportMode,
    coordinator_inbound_fetch: transportMode === "inbound_fetch",
    participant_outbound_bundle: transportMode === "outbound_bundle",
    ticket_id: ticketId,
    job_id: jobId,
    receipt_id: receiptId,
    dataset_id: datasetId,
    coordinator,
    participant_selected_award: false,
    automatic_background_loop: false,
    money_movement: false,
  });
}


function publicSubmitErrorV1(error: unknown): {
  status: number;
  error: string;
} {
  const message = String((error as any)?.message || error || "");

  if (
    message === "ticket_inflight" ||
    message === "acceptance_busy" ||
    message === "wc_process_lock_contention_retry_exhausted" ||
    message === "capability_result_conflict"
  ) {
    return { status: 409, error: message };
  }
  if (message === "capability_expired") {
    return { status: 410, error: message };
  }
  if (message === "invalid_capability") {
    return { status: 401, error: message };
  }
  if (message === "remote_evidence_body_too_large") {
    return { status: 413, error: "remote_evidence_body_too_large" };
  }
  if (
    message === "public_work_reference_unavailable" ||
    message === "public_work_reference_unstable" ||
    message === "public_work_reference_hash_mismatch"
  ) {
    return {
      status: 503,
      error: "useful_work_verifier_unavailable",
    };
  }
  if (
    message === "useful_work_possession_invalid" ||
    message === "useful_work_transport_invalid"
  ) {
    return {
      status: 422,
      error: "useful_work_possession_invalid",
    };
  }

  if (
    message === "VOID_WC_REMOTE_TRUTH_INDEX_WARMING" ||
    message.includes("VOID_WC_REMOTE_TRUTH_INDEX_WARMING")
  ) {
    return { status: 503, error: "remote_truth_warming" };
  }
  if (message.includes("VOID_WC_REMOTE_TRUTH_MALFORMED_HISTORY")) {
    return { status: 503, error: "remote_truth_history_invalid" };
  }
  if (message === "VOID_WC_REMOTE_TRUTH_AUTHORITY_BUSY") {
    return { status: 503, error: "remote_truth_busy" };
  }
  if (message.startsWith("VOID_WC_REMOTE_TRUTH_")) {
    return { status: 503, error: "remote_truth_unavailable" };
  }

  return { status: 422, error: message };
}

export async function submitRemoteResult(req: any, res: any): Promise<any> {
  if (!coordinatorEnabled()) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "coordinator_lane_disabled",
    });
  }

  const parsed = parseToken(bearerOrBodyToken(req));
  if (!parsed) {
    return res.status(401).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_capability",
    });
  }

  let lock: WcProcessInstanceLockV1 | null = null;
  try {
    lock = await acquirePilotTicketLock(parsed.ticketId);

    const signature = isJsonObject(req?.body?.signature)
      ? req.body.signature
      : {};
    const proofBundle = isJsonObject(req?.body?.proof_bundle)
      ? req.body.proof_bundle
      : {};
    const envelope = verifyPilotResultEnvelope(
      req?.body?.envelope || {},
      signature,
    );
    const digest = submissionDigestV1(envelope, signature, proofBundle);

    const consumedPath = ticketFile(consumedDir(), parsed.ticketId);
    const issuedPath = ticketFile(issuedDir(), parsed.ticketId);
    let consumed = readJsonStrict(consumedPath, "consumed_ticket");
    let transaction = readPilotResultTransactionV1(parsed.ticketId);

    if (transaction && String(transaction.submission_sha256 || "") !== digest) {
      throw new Error("capability_result_conflict");
    }

    if (
      !consumed &&
      transaction?.phase === "completed" &&
      isJsonObject(transaction.completed_ticket)
    ) {
      atomicWriteJson(consumedPath, transaction.completed_ticket);
      try {
        fs.unlinkSync(issuedPath);
      } catch (error: any) {
        if (String(error?.code || "") !== "ENOENT") throw error;
      }
      consumed = transaction.completed_ticket;
    }

    if (consumed) {
      if (
        !safeHexEqual(
          String(consumed.token_sha256 || ""),
          sha256Hex(parsed.token),
        )
      ) {
        throw new Error("invalid_capability");
      }
      assertPilotTicketEnvelopeMatch(
        consumed as PilotTicketRecord,
        envelope,
      );
      const consumedDigest = String(
        consumed.submission_sha256 ||
          transaction?.submission_sha256 ||
          "",
      );
      if (consumedDigest !== digest) {
        throw new Error("capability_result_conflict");
      }
      transaction = writePilotResultTransactionV1(
        parsed.ticketId,
        digest,
        "completed",
        { completed_ticket: consumed },
      );
      try {
        fs.unlinkSync(issuedPath);
      } catch (error: any) {
        if (String(error?.code || "") !== "ENOENT") {
          recordPilotBestEffortFailure(
            "idempotent-issued-cleanup",
            error,
            { ticket_id: parsed.ticketId },
          );
        }
      }
      appendAuditBestEffort({
        event: "completed_idempotent_retry",
        ticket_id: parsed.ticketId,
        submission_sha256: digest,
      });
      return res.status(200).json({
        ok: true,
        marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
        idempotent: true,
        recovered_terminal: true,
        capability_consumed: true,
        independent_useful_work_verified:
          consumed.independent_useful_work_verified === true,
        useful_work_proof_mode: String(
          consumed.useful_work_proof_mode || "",
        ),
        ticket_id: parsed.ticketId,
        account: String(consumed.account || ""),
        job_id: String(consumed.job_id || ""),
        receipt_id: String(consumed.receipt_id || ""),
        dataset_id: String(consumed.dataset_id || ""),
        wc: {
          delta: 0,
          original_delta: Number(consumed.wc_delta || 0),
          fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
          canonical_redeemable_after_local:
            wcCompatProjectionV1(
              consumed.canonical_redeemable_after_local,
            ),
          canonical_redeemable_after_local_exact: String(
            consumed.canonical_redeemable_after_local_exact || "0",
          ),
          canonical_redeemable_after_local_quanta: String(
            consumed.canonical_redeemable_after_local_quanta || "0",
          ),
          numeric_authority: "nano_wc_fixed_point_v1",
        },
        completed_ticket_status: String(
          consumed.status || "completed",
        ),
        transaction_phase: transaction.phase,
        money_movement: false,
      });
    }

    const record = readJsonStrict(
      issuedPath,
      "issued_ticket",
    ) as PilotTicketRecord | null;
    if (!record) throw new Error("invalid_capability");
    if (!safeHexEqual(record.token_sha256, sha256Hex(parsed.token))) {
      throw new Error("invalid_capability");
    }
    if (Number(record.expires_at_ms || 0) <= Date.now()) {
      throw new Error("capability_expired");
    }
    assertPilotTicketEnvelopeMatch(record, envelope);

    const evidence = await verifyPilotSubmissionEvidence(
      record,
      envelope,
      proofBundle,
    );
    const independentWork =
      await verifyIndependentPublicWorkV1(
        record,
        envelope,
        evidence,
        parsed.token,
      );

    if (!transaction) {
      transaction = writePilotResultTransactionV1(
        record.ticket_id,
        digest,
        "prepared",
        {
          account: record.account,
          executor_node_id: record.executor_node_id,
          job_id: envelope.job_id,
          receipt_id: envelope.receipt_id,
          dataset_id: envelope.dataset_id,
        },
      );
    }
    maybePilotTransactionFaultForProofV1("after_intent_prepared");

    const imported = await persistImportedRemoteTruthOnce(
      envelope,
      signature,
    );
    transaction = writePilotResultTransactionV1(
      record.ticket_id,
      digest,
      "truth_imported",
      { imported_truth: imported.appended },
    );
    maybePilotTransactionFaultForProofV1("after_truth_imported");

    const acceptance = await acceptVerifiedReceiptOnce(
      imported.receipt,
      {
        expectedAccount: record.account,
        expectedJobId: envelope.job_id,
        expectedReceiptId: envelope.receipt_id,
        capabilityTicketId: record.ticket_id,
        source: "wc_public_earning_pilot_v1",
      },
    );

    const sameTicketDuplicate =
      acceptance?.duplicate === true &&
      String(
        acceptance?.entry?.reward_meta?.capability_ticket_id || "",
      ) === record.ticket_id;
    const acceptedDelta = Number(acceptance?.accepted_delta_wc);

    if (
      Number(acceptance?.award_wc || 0) !==
        VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC ||
      !Number.isSafeInteger(acceptedDelta) ||
      !(
        (acceptance?.credited === true &&
          acceptance?.duplicate !== true &&
          acceptedDelta === VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC) ||
        (sameTicketDuplicate && acceptedDelta === 0)
      )
    ) {
      throw new Error("verified_receipt_acceptance_failed");
    }

    const terminalAwardWc = sameTicketDuplicate
      ? VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC
      : acceptedDelta;
    maybePilotTransactionFaultForProofV1(
      "after_acceptance_before_journal",
    );

    transaction = writePilotResultTransactionV1(
      record.ticket_id,
      digest,
      "credited",
      {
        accepted_delta_wc: acceptedDelta,
        terminal_award_wc: terminalAwardWc,
        canonical_redeemable_before_exact: String(
          acceptance?.canonical_redeemable_before_exact || "0",
        ),
        canonical_redeemable_before_quanta: String(
          acceptance?.canonical_redeemable_before_quanta || "0",
        ),
        canonical_redeemable_after_local_exact: String(
          acceptance?.canonical_redeemable_after_local_exact || "0",
        ),
        canonical_redeemable_after_local_quanta: String(
          acceptance?.canonical_redeemable_after_local_quanta || "0",
        ),
      },
    );
    maybePilotTransactionFaultForProofV1("after_credit");

    const completed = completeTicket(record, {
      submission_sha256: digest,
      independent_useful_work_verified:
        independentWork.verified,
      useful_work_proof_mode:
        independentWork.mode,
      useful_work_reference_bytes:
        independentWork.reference_bytes,
      executor_signature_sha256: sha256Hex(
        String(signature?.sig || ""),
      ),
      executor_pubkey_sha256: sha256Hex(envelope.executor_pubkey),
      transport_mode: evidence.transportMode,
      coordinator_inbound_fetch: evidence.coordinatorInboundFetch,
      participant_outbound_bundle: evidence.participantOutboundBundle,
      outbound_proof_bundle_sha256:
        evidence.participantOutboundBundle
          ? sha256Hex(
              JSON.stringify(canonicalJsonValueV1(proofBundle)),
            )
          : null,
      job_id: envelope.job_id,
      receipt_id: envelope.receipt_id,
      dataset_id: envelope.dataset_id,
      wc_delta: terminalAwardWc,
      credit_delta_this_attempt: acceptedDelta,
      canonical_redeemable_after_local:
        wcCompatProjectionV1(
          acceptance?.canonical_redeemable_after_local,
        ),
      canonical_redeemable_after_local_exact: String(
        acceptance?.canonical_redeemable_after_local_exact || "0",
      ),
      canonical_redeemable_after_local_quanta: String(
        acceptance?.canonical_redeemable_after_local_quanta || "0",
      ),
      recovered_after_acceptance: sameTicketDuplicate,
    });
    maybePilotTransactionFaultForProofV1(
      "after_consumed_projection",
    );

    transaction = writePilotResultTransactionV1(
      record.ticket_id,
      digest,
      "completed",
      { completed_ticket: completed },
    );

    appendAuditBestEffort({
      event: sameTicketDuplicate
        ? "completed_recovery"
        : "credited",
      ticket_id: record.ticket_id,
      account: record.account,
      executor_node_id: record.executor_node_id,
      transport_mode: evidence.transportMode,
      coordinator_inbound_fetch: evidence.coordinatorInboundFetch,
      participant_outbound_bundle: evidence.participantOutboundBundle,
      job_id: envelope.job_id,
      receipt_id: envelope.receipt_id,
      dataset_id: envelope.dataset_id,
      wc_delta: terminalAwardWc,
      credit_delta_this_attempt: acceptedDelta,
      canonical_redeemable_after_local:
        wcCompatProjectionV1(
          acceptance?.canonical_redeemable_after_local,
        ),
      canonical_redeemable_after_local_exact: String(
        acceptance?.canonical_redeemable_after_local_exact || "0",
      ),
      canonical_redeemable_after_local_quanta: String(
        acceptance?.canonical_redeemable_after_local_quanta || "0",
      ),
      submission_sha256: digest,
    });

    return res.status(200).json({
      ok: true,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      remote_executor: true,
      executor_node_id: record.executor_node_id,
      transport_mode: evidence.transportMode,
      coordinator_inbound_fetch: evidence.coordinatorInboundFetch,
      participant_outbound_bundle: evidence.participantOutboundBundle,
      independent_useful_work_verified:
        independentWork.verified,
      useful_work_proof_mode:
        independentWork.mode,
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      imported_truth: imported.appended,
      capability_consumed: true,
      ticket_id: record.ticket_id,
      account: record.account,
      task_class: record.task_class,
      job_id: envelope.job_id,
      receipt_id: envelope.receipt_id,
      dataset_id: envelope.dataset_id,
      wc: {
        before: wcCompatProjectionV1(
          acceptance?.canonical_redeemable_before,
        ),
        before_exact: String(
          acceptance?.canonical_redeemable_before_exact || "0",
        ),
        before_quanta: String(
          acceptance?.canonical_redeemable_before_quanta || "0",
        ),
        after_local: wcCompatProjectionV1(
          acceptance?.canonical_redeemable_after_local,
        ),
        after_local_exact: String(
          acceptance?.canonical_redeemable_after_local_exact || "0",
        ),
        after_local_quanta: String(
          acceptance?.canonical_redeemable_after_local_quanta || "0",
        ),
        delta: acceptedDelta,
        terminal_award_wc: terminalAwardWc,
        fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
        acceptance_local_delta: true,
        numeric_authority: "nano_wc_fixed_point_v1",
      },
      acceptance: {
        credited: acceptance?.credited === true,
        duplicate: acceptance?.duplicate === true,
        recovered_after_acceptance: sameTicketDuplicate,
      },
      completed_ticket_status: completed.status,
      transaction_phase: transaction.phase,
      participant_selected_award: false,
      automatic_background_loop: false,
      generic_credit_route: false,
      wc_to_void: false,
      wallet_send: false,
      buy_void_fulfillment: false,
      money_movement: false,
    });
  } catch (error: any) {
    appendAuditBestEffort({
      event: "submit_rejected",
      ticket_id: parsed.ticketId,
      error: String(error?.message || error),
    });
    const participantError = publicSubmitErrorV1(error);
    return res.status(participantError.status).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: participantError.error,
    });
  } finally {
    if (lock) await releasePilotTicketLock(lock);
  }
}

export function publicStatusForProofV1(
  accountRaw: unknown,
  raw?: string,
): JsonObject {
  const account = safeAccount(accountRaw);
  const history = wcPublicClaimHistorySnapshotV1(
    raw,
    Date.now(),
    account,
    "",
    publicClaimClockSkewMs(),
  );
  return {
    ok: true,
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    coordinator_enabled: coordinatorEnabled(),
    executor_enabled: executorEnabled(),
    task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
    fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    routes: {
      operator_issue: OPERATOR_ISSUE_ROUTE,
      local_execute: LOCAL_EXECUTE_ROUTE,
      public_submit: PUBLIC_SUBMIT_ROUTE,
      public_claim: PUBLIC_CLAIM_ROUTE,
      local_claim_sign: LOCAL_CLAIM_SIGN_ROUTE,
      status: PUBLIC_STATUS_ROUTE,
    },
    capability: {
      account_bound: true,
      executor_node_bound: true,
      executor_http_bound_for_inbound_fetch: true,
      outbound_only_supported: true,
      inbound_executor_reachability_required_for_outbound: false,
      transport_modes: ["inbound_fetch", "outbound_bundle"],
      dataset_bound: true,
      input_hash_bound: true,
      expiring: true,
      single_use: true,
      token_stored_as_sha256_only: true,
      ed25519_executor_signature_required: true,
      remote_health_required: true,
      remote_persisted_job_required: true,
      remote_persisted_receipt_required: true,
      outbound_health_evidence_required: true,
      outbound_persisted_job_bundle_required: true,
      outbound_persisted_receipt_bundle_required: true,
      outbound_evidence_bound_to_signed_envelope: true,
      receipt_timestamp_bound_to_ticket_window: true,
      process_instance_ticket_lock: true,
      age_based_lock_reclaim: false,
      durable_result_transaction: true,
      public_claim_executor_key_possession_required: true,
      public_claim_replay_protected: true,
      public_claim_history_request_scan: false,
      participant_selected_award: false,
    },
    public_claim: publicTicketClaimPolicySnapshot(),
    caps: {
      per_account: perAccountCap(),
      global: globalCap(),
      active_issued: history.active,
      consumed: history.consumed,
      account_total: history.account_total,
      bounded_history_authority: true,
      synchronous_history_files_read:
        history.synchronous_history_files_read,
    },
    canonical_pipeline: {
      participant_jobs_submit: "/jobs/submit",
      participant_worker_run_once:
        "/__void/jobs-and-datanet-worker/run-once",
      coordinator_receipt_import:
        "signed_remote_truth_import_v1",
      receipt_acceptance:
        "in_process_verified_receipt_acceptance_v1",
      balance: "/wc/redeemable",
    },
    automatic_background_loop: false,
    generic_credit_route: false,
    wc_to_void: false,
    wallet_send: false,
    buy_void_fulfillment: false,
    money_movement: false,
  };
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any = globalState.__void_http_app || globalState.app;
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    const timer = setTimeout(mount, 400);
    (timer as any).unref?.();
    return;
  }
  if (app[GLOBAL_MARK]) return;
  app[GLOBAL_MARK] = true;
  primeWcPublicClaimHistoryAuthorityV1();

  app.get(PUBLIC_STATUS_ROUTE, async (req: any, res: any) => {
    try {
      await prepareWcPublicClaimHistoryDecisionV1();
      return res.json(
        publicStatusForProofV1(req?.query?.account),
      );
    } catch (error: any) {
      const message = String(error?.message || error);
      const publicError =
        message.includes(
          "VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING",
        )
          ? "public_claim_history_warming"
          : message.includes(
                "VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID",
              )
            ? "public_claim_history_invalid"
            : "public_claim_history_unavailable";
      return res.status(503).json({
        ok: false,
        marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
        error: publicError,
      });
    }
  });

  app.post(
    LOCAL_CLAIM_SIGN_ROUTE,
    express.json({ limit: "64kb" }),
    (req: any, res: any) => signLocalPublicTicketClaim(req, res),
  );

  app.post(
    PUBLIC_CLAIM_ROUTE,
    express.json({ limit: "64kb" }),
    async (req: any, res: any) => {
      try {
        return res.status(201).json(
          await issuePublicTicketClaim(req?.body || {}),
        );
      } catch (error: any) {
        const message = String(error?.message || error);
        const publicMessage =
          message === "ticket_inflight"
            ? "public_claim_recovery_busy"
            : message.includes(
                "VOID_WC_PUBLIC_CLAIM_ISSUANCE_BUSY",
              )
              ? "public_claim_busy"
              : message.includes(
                  "VOID_WC_PUBLIC_CLAIM_HISTORY_WARMING",
                )
                ? "public_claim_history_warming"
                : message.includes(
                    "VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID",
                  )
                  ? "public_claim_history_invalid"
                  : message;
        const status =
          publicMessage === "coordinator_lane_disabled" ||
          publicMessage === "public_ticket_claim_disabled" ||
          publicMessage === "public_claim_work_unavailable" ||
          publicMessage === "public_claim_history_warming" ||
          publicMessage === "public_claim_history_invalid"
            ? 503
            : publicMessage === "public_claim_replay" ||
                publicMessage === "public_claim_busy" ||
                publicMessage === "public_claim_recovery_busy" ||
                publicMessage ===
                  "public_claim_recovery_capacity_conflict" ||
                publicMessage ===
                  "public_claim_capability_consumed"
              ? 409
              : publicMessage.includes("_cooldown") ||
                  publicMessage.includes("_daily_cap_reached")
                ? 429
                : publicMessage.includes("_active") ||
                    publicMessage.includes("_active_cap_reached")
                  ? 409
                  : publicMessage.includes("signature") ||
                      publicMessage.includes("pubkey_node_id_mismatch")
                    ? 401
                    : 400;
        return res.status(status).json({
          ok: false,
          marker: VOID_WC_PUBLIC_TICKET_CLAIM_MARKER,
          error: publicMessage,
          fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
          participant_selected_award: false,
          buy_void_fulfillment: false,
          money_movement: false,
        });
      }
    },
  );

  app.post(
    OPERATOR_ISSUE_ROUTE,
    express.json({ limit: "256kb" }),
    (req: any, res: any) => {
      if (!coordinatorEnabled()) {
        return res.status(503).json({
          ok: false,
          marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
          error: "coordinator_lane_disabled",
        });
      }
      if (
        !requireConfirmedLocalMutation(
          req,
          res,
          "wcPublicEarningPilotIssue",
        )
      ) {
        return;
      }
      try {
        return res.status(201).json(issueTicket(req?.body || {}));
      } catch (error: any) {
        return res.status(409).json({
          ok: false,
          marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
          error: String(error?.message || error),
        });
      }
    },
  );

  app.post(
    LOCAL_EXECUTE_ROUTE,
    express.json({ limit: "1mb" }),
    (req: any, res: any) => {
      executeLocalWork(req, res).catch((error: any) => {
        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
            error: String(error?.message || error),
          });
        }
      });
    },
  );

  app.post(
    PUBLIC_SUBMIT_ROUTE,
    express.json({ limit: "1mb" }),
    (req: any, res: any) => {
      submitRemoteResult(req, res).catch((error: any) => {
        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
            error: String(error?.message || error),
          });
        }
      });
    },
  );

  console.log(
    `[wc-public-earning-pilot-v1] mounted coordinator=${coordinatorEnabled()} executor=${executorEnabled()}`,
  );
}

mount();
