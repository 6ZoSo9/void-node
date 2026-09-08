import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import {
  acquireWcProcessInstanceLockV1,
  releaseWcProcessInstanceLockV1,
  type WcProcessInstanceLockV1,
} from "./wc_process_instance_lock_v1.js";

export const VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_MARKER =
  "VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_V1";
export const VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK =
  "datanet_fetch_verify";
export const VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC = 3;
export const VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_MARKER =
  "VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_V1";

export type JsonObject = Record<string, any>;

export interface VerifiedReceiptAcceptanceOptions {
  dataDir?: string;
  expectedAccount?: string;
  expectedJobId?: string;
  expectedReceiptId?: string;
  capabilityTicketId?: string;
  source?: string;
}

export interface FailedCapabilityRecoveryOptions {
  dataDir?: string;
  ticketId: string;
  account: string;
  jobId: string;
  receiptId: string;
  apply: boolean;
  confirmation?: string;
}

export class VerifiedReceiptAcceptanceError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "VerifiedReceiptAcceptanceError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new VerifiedReceiptAcceptanceError(code);
}

function resolveDataDir(raw?: string): string {
  const selected = String(
    raw || process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a",
  );
  return path.isAbsolute(selected) ? selected : path.join(process.cwd(), selected);
}

function wcDir(raw?: string): string {
  return path.join(resolveDataDir(raw), "wc_v1");
}

function ledgerFile(raw?: string): string {
  return path.join(wcDir(raw), "ledger.jsonl");
}

function redeemedFile(raw?: string): string {
  return path.join(wcDir(raw), "redeemed.jsonl");
}

function receiptsFile(raw?: string): string {
  return path.join(resolveDataDir(raw), "agent_v1", "receipts.jsonl");
}

function jobStateFile(raw?: string): string {
  return path.join(resolveDataDir(raw), "agent_v1", "job_state.jsonl");
}

function jobFiles(raw?: string): string[] {
  const root = resolveDataDir(raw);
  return [
    path.join(root, "agent", "jobs.jsonl"),
    path.join(root, "jobs_v1", "jobs.jsonl"),
  ];
}

function capabilityRoot(raw?: string): string {
  return path.join(wcDir(raw), "public-capabilities-v1");
}

function capabilityConsumedFile(ticketId: string, raw?: string): string {
  return path.join(capabilityRoot(raw), "consumed", `${ticketId}.json`);
}

function capabilityIssuedFile(ticketId: string, raw?: string): string {
  return path.join(capabilityRoot(raw), "issued", `${ticketId}.json`);
}

function capabilityAuditFile(raw?: string): string {
  return path.join(capabilityRoot(raw), "audit.jsonl");
}

function safeAccount(value: unknown): string {
  if (typeof value !== "string") return "";
  const account = value.trim();
  return /^[A-Za-z0-9._:@-]{3,128}$/.test(account) ? account : "";
}

function safeId(value: unknown, max = 180): string {
  if (typeof value !== "string") return "";
  const id = value.trim();
  if (!id || id.length > max || !/^[A-Za-z0-9._:@-]+$/.test(id)) return "";
  return id;
}

function exactStringV1(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

type CanonicalAcceptanceCreditAuthorityV1 =
  | "not_acceptance"
  | "valid"
  | "invalid";

function ownsV1(value: JsonObject, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

// Balance and duplicate authority must classify acceptance credits through
// the same closed schema. Otherwise a wrong-typed lineage can count toward
// balance while disappearing from the exact-once projection.
function canonicalAcceptanceCreditAuthorityV1(
  entry: JsonObject,
): CanonicalAcceptanceCreditAuthorityV1 {
  const reason = exactStringV1(entry.reason);
  const source = exactStringV1(entry?.reward_meta?.source);
  const paidWorkCandidate =
    reason === "paid_work_entitlement_acceptance_v1" ||
    source === "void_agent_paid_work_intake_v1" ||
    (ownsV1(entry, "submission_id") &&
      ownsV1(entry, "entitlement_sha256") &&
      ownsV1(entry, "idempotency_key"));
  const verifiedReceiptCandidate =
    reason === "verified_receipt_acceptance_v1" ||
    source === "wc_verified_receipt_acceptance_v1" ||
    (ownsV1(entry, "receipt_id") &&
      ownsV1(entry, "job_id") &&
      ownsV1(entry, "receipt_kind"));

  if (!paidWorkCandidate && !verifiedReceiptCandidate) {
    return "not_acceptance";
  }
  if (paidWorkCandidate && verifiedReceiptCandidate) {
    return "invalid";
  }

  const commonValid =
    exactStringV1(entry.kind) === "credit" &&
    Boolean(exactStringV1(entry.account)) &&
    typeof entry.delta === "number" &&
    Number.isSafeInteger(entry.delta) &&
    entry.delta === VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC;
  if (!commonValid) return "invalid";

  if (paidWorkCandidate) {
    return reason === "paid_work_entitlement_acceptance_v1" &&
      Boolean(exactStringV1(entry.submission_id)) &&
      Boolean(exactStringV1(entry.entitlement_sha256)) &&
      Boolean(exactStringV1(entry.idempotency_key))
      ? "valid"
      : "invalid";
  }

  return reason === "verified_receipt_acceptance_v1" &&
    exactStringV1(entry.receipt_kind) ===
      VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK &&
    Boolean(exactStringV1(entry.receipt_id)) &&
    Boolean(exactStringV1(entry.job_id))
    ? "valid"
    : "invalid";
}

function hex64(value: unknown): string {
  if (typeof value !== "string") return "";
  const candidate = value.trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(candidate) ? candidate : "";
}

function jsonLine(value: JsonObject): string {
  return JSON.stringify(value) + "\n";
}


const VOID_WC_EXACT_DECIMALS_V1 = 9;
const VOID_WC_QUANTA_PER_WC_V1 = 1_000_000_000n;
const VOID_WC_AWARD_QUANTA_V1 =
  BigInt(VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC) *
  VOID_WC_QUANTA_PER_WC_V1;

function wcNumberToQuantaV1(value: unknown, code: string): bigint {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > Number.MAX_SAFE_INTEGER
  ) {
    fail(code);
  }

  const text = value.toString().toLowerCase();
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(text);
  if (!match) fail(code);

  const negative = match[1] === "-";
  const whole = match[2] || "0";
  const fraction = match[3] || "";
  const exponent = Number(match[4] || 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 400) {
    fail(code);
  }

  let digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
  let magnitude = BigInt(digits);
  const power =
    VOID_WC_EXACT_DECIMALS_V1 - fraction.length + exponent;

  if (power >= 0) {
    magnitude *= 10n ** BigInt(power);
  } else {
    const divisor = 10n ** BigInt(-power);
    if (magnitude % divisor !== 0n) {
      fail("wc_number_precision_exceeds_9dp");
    }
    magnitude /= divisor;
  }

  return negative ? -magnitude : magnitude;
}

function wcQuantaToDecimalV1(value: bigint): string {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const whole = magnitude / VOID_WC_QUANTA_PER_WC_V1;
  const fraction = magnitude % VOID_WC_QUANTA_PER_WC_V1;
  let out = whole.toString();
  if (fraction !== 0n) {
    const digits = fraction
      .toString()
      .padStart(VOID_WC_EXACT_DECIMALS_V1, "0")
      .replace(/0+$/, "");
    out += `.${digits}`;
  }
  return negative ? `-${out}` : out;
}

function wcQuantaToCompatNumberV1(
  value: bigint,
): number | null {
  const exact = wcQuantaToDecimalV1(value);
  const out = Number(exact);
  if (!Number.isFinite(out)) return null;

  try {
    const roundTrip = wcNumberToQuantaV1(
      out,
      "wc_compat_number_roundtrip_invalid",
    );
    return roundTrip === value ? out : null;
  } catch (error) {
    void error;
    return null;
  }
}

async function appendLedgerEntryDurable(
  file: string,
  value: JsonObject,
): Promise<void> {
  await fsp.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const handle = await fsp.open(file, "a", 0o600);
  try {
    await handle.writeFile(jsonLine(value), "utf8");
    await handle.datasync();
  } finally {
    await handle.close();
  }
}

async function scanJsonl(
  file: string,
  visit: (value: JsonObject) => void,
  ambiguousNeedles: string[] = [],
): Promise<{ lines: number; malformed: number; ambiguous_malformed: number }> {
  if (!fs.existsSync(file)) {
    return { lines: 0, malformed: 0, ambiguous_malformed: 0 };
  }

  const needles = ambiguousNeedles
    .map((value) => String(value || ""))
    .filter(Boolean);
  const input = fs.createReadStream(file, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let count = 0;
  let malformed = 0;
  let ambiguousMalformed = 0;

  const recordMalformed = (line: string): void => {
    malformed += 1;
    if (needles.some((needle) => line.includes(needle))) {
      ambiguousMalformed += 1;
    }
  };

  try {
    for await (const raw of lines) {
      const line = String(raw || "").trim();
      if (!line) continue;
      count += 1;
      let parsed: any;
      try {
        parsed = JSON.parse(line);
      } catch (_error) {
        recordMalformed(line);
        continue;
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        visit(parsed);
      } else {
        recordMalformed(line);
      }
    }
  } finally {
    lines.close();
    input.destroy();
  }

  return {
    lines: count,
    malformed,
    ambiguous_malformed: ambiguousMalformed,
  };
}

async function lastMatchingJson(
  file: string,
  predicate: (value: JsonObject) => boolean,
): Promise<{ value: JsonObject | null; malformed: number }> {
  let value: JsonObject | null = null;
  const scan = await scanJsonl(file, (candidate) => {
    if (predicate(candidate)) value = candidate;
  });
  return { value, malformed: scan.malformed };
}

async function persistedReceiptById(
  receiptId: string,
  raw?: string,
): Promise<JsonObject | null> {
  const found = await lastMatchingJson(
    receiptsFile(raw),
    (candidate) =>
      safeId(candidate?.receipt_id ?? candidate?.id, 180) === receiptId,
  );
  if (found.malformed > 0 && !found.value) fail("receipt_store_malformed");
  return found.value;
}

async function persistedCompletedState(
  jobId: string,
  raw?: string,
): Promise<JsonObject | null> {
  const found = await lastMatchingJson(
    jobStateFile(raw),
    (candidate) =>
      safeId(candidate?.job_id, 160) === jobId &&
      typeof candidate?.status === "string" &&
      candidate.status.trim().toLowerCase() === "completed",
  );
  if (found.malformed > 0 && !found.value) fail("job_state_store_malformed");
  return found.value;
}

async function persistedJob(jobId: string, raw?: string): Promise<JsonObject | null> {
  let found: JsonObject | null = null;
  let malformed = 0;

  for (const file of jobFiles(raw)) {
    const result = await lastMatchingJson(
      file,
      (candidate) =>
        safeId(candidate?.job_id ?? candidate?.id, 160) === jobId,
    );
    malformed += result.malformed;
    if (result.value) found = result.value;
  }

  if (malformed > 0 && !found) fail("job_store_malformed");
  return found;
}

function normalizeReceipt(receipt: JsonObject): JsonObject {
  const account = safeAccount(receipt?.account || receipt?.who || receipt?.owner);
  const jobId = safeId(receipt?.job_id, 160);
  const receiptId = safeId(receipt?.receipt_id || receipt?.id, 180);
  const datasetId = safeId(receipt?.dataset_id || receipt?.selected_dataset_id, 160);
  const kind = typeof receipt?.kind === "string" ? receipt.kind.trim() : "";
  const status =
    typeof receipt?.status === "string"
      ? receipt.status.trim().toLowerCase()
      : "";
  const inputHash = hex64(receipt?.input_hash);
  const outputHash = hex64(receipt?.output_hash);
  const fetchedInputHash = hex64(receipt?.output?.fetched_input_hash);
  const receiptTsMs = receipt?.ts_ms;

  if (!account) fail("receipt_account_invalid");
  if (!jobId) fail("receipt_job_id_invalid");
  if (!receiptId) fail("receipt_id_invalid");
  if (!datasetId) fail("receipt_dataset_id_invalid");
  if (kind !== VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK) {
    fail("receipt_task_class_not_allowlisted");
  }
  if (status !== "completed") fail("receipt_not_completed");
  if (!inputHash) fail("receipt_input_hash_invalid");
  if (!outputHash) fail("receipt_output_hash_invalid");
  if (receipt?.output?.verified !== true) fail("receipt_output_not_verified");
  if (!fetchedInputHash || fetchedInputHash !== inputHash) {
    fail("verified_input_hash_mismatch");
  }
  if (
    typeof receiptTsMs !== "number" ||
    !Number.isFinite(receiptTsMs) ||
    !Number.isSafeInteger(receiptTsMs) ||
    receiptTsMs <= 0
  ) {
    fail("receipt_ts_ms_not_exact_positive_safe_integer");
  }

  return {
    account,
    job_id: jobId,
    receipt_id: receiptId,
    dataset_id: datasetId,
    kind,
    status,
    input_hash: inputHash,
    output_hash: outputHash,
    fetched_input_hash: fetchedInputHash,
    ts_ms: receiptTsMs,
    output: receipt?.output || {},
  };
}

function assertExpected(
  normalized: JsonObject,
  options: VerifiedReceiptAcceptanceOptions,
): void {
  if (
    options.expectedAccount &&
    normalized.account !== safeAccount(options.expectedAccount)
  ) {
    fail("expected_account_mismatch");
  }
  if (
    options.expectedJobId &&
    normalized.job_id !== safeId(options.expectedJobId, 160)
  ) {
    fail("expected_job_id_mismatch");
  }
  if (
    options.expectedReceiptId &&
    normalized.receipt_id !== safeId(options.expectedReceiptId, 180)
  ) {
    fail("expected_receipt_id_mismatch");
  }
}

function assertReceiptMatch(incoming: JsonObject, persisted: JsonObject): void {
  const truth = normalizeReceipt(persisted);
  for (const field of [
    "account",
    "job_id",
    "receipt_id",
    "dataset_id",
    "kind",
    "status",
    "input_hash",
    "output_hash",
    "fetched_input_hash",
    "ts_ms",
  ]) {
    if (incoming[field] !== truth[field]) {
      fail(`persisted_receipt_${field}_mismatch`);
    }
  }
}

function assertJobTruth(
  normalized: JsonObject,
  job: JsonObject | null,
  completed: JsonObject | null,
): void {
  if (!job) fail("job_truth_missing");
  if (!completed) fail("job_completion_truth_missing");

  const jobAccount = safeAccount(job?.account || job?.who || job?.owner);
  const jobId = safeId(job?.job_id || job?.id, 160);
  const jobKind = typeof job?.kind === "string" ? job.kind.trim() : "";
  const jobDatasetId = safeId(job?.dataset_id || job?.selected_dataset_id, 160);

  if (jobId !== normalized.job_id) fail("job_id_mismatch");
  if (jobAccount !== normalized.account) fail("job_account_mismatch");
  if (jobKind !== VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK) {
    fail("job_task_class_mismatch");
  }
  if (jobDatasetId !== normalized.dataset_id) fail("job_dataset_mismatch");

  if (safeId(completed?.job_id, 160) !== normalized.job_id) {
    fail("completed_job_id_mismatch");
  }
  if (safeId(completed?.receipt_id, 180) !== normalized.receipt_id) {
    fail("completed_receipt_id_mismatch");
  }
  if (safeId(completed?.dataset_id, 160) !== normalized.dataset_id) {
    fail("completed_dataset_id_mismatch");
  }
  if (hex64(completed?.input_hash) !== normalized.input_hash) {
    fail("completed_input_hash_mismatch");
  }
  if (hex64(completed?.output_hash) !== normalized.output_hash) {
    fail("completed_output_hash_mismatch");
  }
  if (completed?.verified !== true) fail("completed_verified_truth_missing");
}

async function existingCredit(
  normalized: JsonObject,
  raw?: string,
  capabilityTicketIdRaw?: string,
): Promise<{ entry: JsonObject | null; malformed: number }> {
  let existing: JsonObject | null = null;
  let conflict = false;
  let matches = 0;
  const capabilityTicketId = safeId(capabilityTicketIdRaw, 64);
  const scan = await scanJsonl(
    ledgerFile(raw),
    (entry) => {
      if (exactStringV1(entry?.kind) !== "credit") return;

      const receiptMatch =
        exactStringV1(entry?.receipt_id) === normalized.receipt_id;
      const jobMatch =
        exactStringV1(entry?.job_id) === normalized.job_id;
      const entryTicketId = safeId(
        entry?.reward_meta?.capability_ticket_id,
        64,
      );
      const ticketMatch =
        Boolean(capabilityTicketId) && entryTicketId === capabilityTicketId;
      if (!receiptMatch && !jobMatch && !ticketMatch) return;

      matches += 1;
      const deltaQuanta = wcNumberToQuantaV1(
        entry?.delta,
        "credit_delta_not_exact_number",
      );
      const compatible =
        canonicalAcceptanceCreditAuthorityV1(entry) === "valid" &&
        deltaQuanta === VOID_WC_AWARD_QUANTA_V1 &&
        exactStringV1(entry?.account) === normalized.account &&
        exactStringV1(entry?.receipt_kind) ===
          VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK &&
        (!capabilityTicketId || entryTicketId === capabilityTicketId) &&
        (!ticketMatch ||
          (receiptMatch &&
            jobMatch &&
            exactStringV1(entry?.receipt_id) === normalized.receipt_id &&
            exactStringV1(entry?.job_id) === normalized.job_id));

      if (!compatible) conflict = true;
      if (!existing) existing = entry;
    },
    [
      normalized.account,
      normalized.job_id,
      normalized.receipt_id,
      capabilityTicketId,
    ],
  );

  if (scan.ambiguous_malformed > 0) {
    fail("ambiguous_malformed_ledger_line");
  }
  if (conflict) fail("duplicate_credit_conflict");
  if (matches > 1) fail("duplicate_credit_multiple_entries");
  return { entry: existing, malformed: scan.malformed };
}

async function verifiedTruth(
  receipt: JsonObject,
  options: VerifiedReceiptAcceptanceOptions,
): Promise<JsonObject> {
  const normalized = normalizeReceipt(receipt);
  assertExpected(normalized, options);

  const persisted = await persistedReceiptById(
    normalized.receipt_id,
    options.dataDir,
  );
  if (!persisted) fail("persisted_receipt_missing");
  assertReceiptMatch(normalized, persisted);

  const [job, completed] = await Promise.all([
    persistedJob(normalized.job_id, options.dataDir),
    persistedCompletedState(normalized.job_id, options.dataDir),
  ]);
  assertJobTruth(normalized, job, completed);

  return normalized;
}

function acceptanceEntry(
  normalized: JsonObject,
  options: VerifiedReceiptAcceptanceOptions,
): JsonObject {
  return {
    kind: "credit",
    account: normalized.account,
    delta: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
    ts_ms: normalized.ts_ms,
    reason: "verified_receipt_acceptance_v1",
    receipt_kind: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK,
    receipt_id: normalized.receipt_id,
    job_id: normalized.job_id,
    dataset_id: normalized.dataset_id,
    input_hash: normalized.input_hash,
    output_hash: normalized.output_hash,
    reward_meta: {
      source: "wc_verified_receipt_acceptance_v1",
      policy: "useful_verifiable_only",
      server_controlled_award: true,
      fixed_award_wc: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
      persisted_receipt_verified: true,
      persisted_job_verified: true,
      persisted_completion_verified: true,
      verified_input_hash_match: true,
      duplicate_guard: ["receipt_id", "job_id"],
      capability_ticket_id: safeId(options.capabilityTicketId, 64) || null,
      caller: safeId(options.source, 128) || "unspecified",
      accepted_at_ms: Date.now(),
    },
  };
}

async function acquireLock(raw?: string): Promise<WcProcessInstanceLockV1> {
  try {
    return await acquireWcProcessInstanceLockV1(
      path.join(wcDir(raw), "locks", "verified-receipt-acceptance-v1"),
      "acceptance",
    );
  } catch (error: any) {
    if (String(error?.code || "") === "wc_process_lock_busy") {
      fail("acceptance_busy");
    }
    throw error;
  }
}

async function releaseLock(lock: WcProcessInstanceLockV1): Promise<void> {
  await releaseWcProcessInstanceLockV1(lock);
}

export async function findVerifiedReceiptById(
  receiptIdRaw: string,
  dataDir?: string,
): Promise<JsonObject> {
  const receiptId = safeId(receiptIdRaw, 180);
  if (!receiptId) fail("receipt_id_invalid");
  const receipt = await persistedReceiptById(receiptId, dataDir);
  if (!receipt) fail("persisted_receipt_missing");
  return receipt;
}

export async function inspectVerifiedReceiptAcceptance(
  receipt: JsonObject,
  options: VerifiedReceiptAcceptanceOptions = {},
): Promise<JsonObject> {
  const normalized = await verifiedTruth(receipt, options);
  const existing = await existingCredit(
    normalized,
    options.dataDir,
    options.capabilityTicketId,
  );
  return {
    ok: true,
    marker: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_MARKER,
    eligible: true,
    duplicate: !!existing.entry,
    would_credit: !existing.entry,
    award_wc: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
    account: normalized.account,
    job_id: normalized.job_id,
    receipt_id: normalized.receipt_id,
    dataset_id: normalized.dataset_id,
    existing_entry: existing.entry,
    historical_malformed_ledger_lines: existing.malformed,
    money_movement: false,
    wc_to_void: false,
    wallet_send: false,
  };
}

export async function acceptVerifiedReceiptOnce(
  receipt: JsonObject,
  options: VerifiedReceiptAcceptanceOptions = {},
): Promise<JsonObject> {
  const lock = await acquireLock(options.dataDir);
  try {
    const normalized = await verifiedTruth(receipt, options);
    const existing = await existingCredit(
      normalized,
      options.dataDir,
      options.capabilityTicketId,
    );
    const before = await readCanonicalWcState(
      normalized.account,
      options.dataDir,
    );
    const beforeQuanta = BigInt(String(before.redeemable_quanta));

    if (existing.entry) {
      return {
        ok: true,
        marker: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_MARKER,
        credited: false,
        duplicate: true,
        award_wc: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
        accepted_delta_wc: 0,
        accepted_delta_quanta: "0",
        canonical_redeemable_before: before.redeemable,
        canonical_redeemable_before_exact: before.redeemable_exact,
        canonical_redeemable_before_quanta: before.redeemable_quanta,
        canonical_redeemable_after_local: before.redeemable,
        canonical_redeemable_after_local_exact: before.redeemable_exact,
        canonical_redeemable_after_local_quanta: before.redeemable_quanta,
        account: normalized.account,
        job_id: normalized.job_id,
        receipt_id: normalized.receipt_id,
        dataset_id: normalized.dataset_id,
        entry: existing.entry,
        historical_malformed_ledger_lines: existing.malformed,
      };
    }

    const entry = acceptanceEntry(normalized, options);
    await appendLedgerEntryDurable(ledgerFile(options.dataDir), entry);
    const projectedQuanta = beforeQuanta + VOID_WC_AWARD_QUANTA_V1;
    const projectedExact = wcQuantaToDecimalV1(projectedQuanta);

    return {
      ok: true,
      marker: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_MARKER,
      credited: true,
      duplicate: false,
      award_wc: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
      accepted_delta_wc: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
      accepted_delta_quanta: VOID_WC_AWARD_QUANTA_V1.toString(),
      canonical_redeemable_before: before.redeemable,
      canonical_redeemable_before_exact: before.redeemable_exact,
      canonical_redeemable_before_quanta: before.redeemable_quanta,
      canonical_redeemable_after_local:
        wcQuantaToCompatNumberV1(projectedQuanta),
      canonical_redeemable_after_local_exact: projectedExact,
      canonical_redeemable_after_local_quanta:
        projectedQuanta.toString(),
      account: normalized.account,
      job_id: normalized.job_id,
      receipt_id: normalized.receipt_id,
      dataset_id: normalized.dataset_id,
      entry,
      historical_malformed_ledger_lines: existing.malformed,
    };
  } finally {
    await releaseLock(lock);
  }
}

export async function readCanonicalWcState(
  accountRaw: string,
  dataDir?: string,
): Promise<JsonObject> {
  const account = safeAccount(accountRaw);
  if (!account) fail("account_invalid");

  let earnedQuanta = 0n;
  let debitedQuanta = 0n;
  let redeemedQuanta = 0n;

  const ledgerScan = await scanJsonl(
    ledgerFile(dataDir),
    (entry) => {
      if (exactStringV1(entry?.account) !== account) return;
      if (
        canonicalAcceptanceCreditAuthorityV1(entry) === "invalid"
      ) {
        return;
      }
      if (
        entry?.kind !== undefined &&
        typeof entry.kind !== "string"
      ) {
        fail("ledger_kind_not_exact_string");
      }
      const deltaQuanta =
        entry?.delta === undefined || entry?.delta === null
          ? 0n
          : wcNumberToQuantaV1(
              entry.delta,
              "ledger_delta_not_exact_number",
            );
      if (deltaQuanta > 0n) {
        earnedQuanta += deltaQuanta;
      }
      if (entry.kind === "debit") {
        const amountQuanta =
          entry?.amount === undefined || entry?.amount === null
            ? (deltaQuanta < 0n ? -deltaQuanta : deltaQuanta)
            : wcNumberToQuantaV1(
                entry.amount,
                "ledger_amount_not_exact_number",
              );
        if (amountQuanta < 0n) fail("ledger_amount_negative");
        debitedQuanta += amountQuanta;
      }
    },
    [account],
  );
  if (ledgerScan.ambiguous_malformed > 0) {
    fail("ambiguous_malformed_ledger_line");
  }

  const redeemedScan = await scanJsonl(
    redeemedFile(dataDir),
    (entry) => {
      if (exactStringV1(entry?.account) !== account) return;
      const amountQuanta =
        entry?.amount === undefined || entry?.amount === null
          ? 0n
          : wcNumberToQuantaV1(
              entry.amount,
              "redeemed_amount_not_exact_number",
            );
      if (amountQuanta < 0n) fail("redeemed_amount_negative");
      redeemedQuanta += amountQuanta;
    },
    [account],
  );
  if (redeemedScan.ambiguous_malformed > 0) {
    fail("ambiguous_malformed_redeemed_line");
  }

  const outflowsQuanta = debitedQuanta + redeemedQuanta;
  const netQuanta = earnedQuanta - outflowsQuanta;
  const redeemableQuanta = netQuanta > 0n ? netQuanta : 0n;

  return {
    account,
    earned: wcQuantaToCompatNumberV1(earnedQuanta),
    debited: wcQuantaToCompatNumberV1(debitedQuanta),
    redeemed: wcQuantaToCompatNumberV1(redeemedQuanta),
    redeemable: wcQuantaToCompatNumberV1(redeemableQuanta),
    earned_exact: wcQuantaToDecimalV1(earnedQuanta),
    debited_exact: wcQuantaToDecimalV1(debitedQuanta),
    redeemed_exact: wcQuantaToDecimalV1(redeemedQuanta),
    redeemable_exact: wcQuantaToDecimalV1(redeemableQuanta),
    earned_quanta: earnedQuanta.toString(),
    debited_quanta: debitedQuanta.toString(),
    redeemed_quanta: redeemedQuanta.toString(),
    redeemable_quanta: redeemableQuanta.toString(),
    exact_decimals: VOID_WC_EXACT_DECIMALS_V1,
    numeric_authority: "nano_wc_fixed_point_v1",
    historical_malformed_ledger_lines: ledgerScan.malformed,
    historical_malformed_redeemed_lines: redeemedScan.malformed,
  };
}

function atomicWriteJson(file: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temp, file);
}

function appendCapabilityAudit(dataDir: string | undefined, event: JsonObject): void {
  const file = capabilityAuditFile(dataDir);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.appendFileSync(
    file,
    JSON.stringify({
      marker: "VOID_WC_PUBLIC_CAPABILITY_V1",
      ts_ms: Date.now(),
      ...event,
    }) + "\n",
    { encoding: "utf8", mode: 0o600 },
  );
}

export async function recoverFailedCapabilityReceiptOnce(
  options: FailedCapabilityRecoveryOptions,
): Promise<JsonObject> {
  const ticketId = safeId(options.ticketId, 64);
  const account = safeAccount(options.account);
  const jobId = safeId(options.jobId, 160);
  const receiptId = safeId(options.receiptId, 180);

  if (!/^[0-9a-f]{32}$/.test(ticketId)) fail("ticket_id_invalid");
  if (!account) fail("account_invalid");
  if (!jobId) fail("job_id_invalid");
  if (!receiptId) fail("receipt_id_invalid");

  const consumedFile = capabilityConsumedFile(ticketId, options.dataDir);
  const issuedFile = capabilityIssuedFile(ticketId, options.dataDir);
  if (fs.existsSync(issuedFile)) fail("ticket_still_issued");
  if (!fs.existsSync(consumedFile)) fail("consumed_ticket_missing");

  const ticket = JSON.parse(fs.readFileSync(consumedFile, "utf8"));
  if (String(ticket?.account || "") !== account) fail("ticket_account_mismatch");
  if (
    String(ticket?.task_class || "") !==
    VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK
  ) {
    fail("ticket_task_class_mismatch");
  }
  const status = String(ticket?.status || "");
  if (status !== "failed" && status !== "recovered") {
    fail("ticket_status_not_recoverable");
  }

  const receipt = await findVerifiedReceiptById(receiptId, options.dataDir);
  const inspection = await inspectVerifiedReceiptAcceptance(receipt, {
    dataDir: options.dataDir,
    expectedAccount: account,
    expectedJobId: jobId,
    expectedReceiptId: receiptId,
    capabilityTicketId: ticketId,
    source: "wc_capability_failed_receipt_recovery_v1",
  });

  if (!options.apply) {
    return {
      ok: true,
      marker: VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_MARKER,
      dry: true,
      mutated: false,
      ticket_id: ticketId,
      ticket_status: status,
      inspection,
      exact_confirmation_required: "wcCapabilityFailedReceiptRecovery",
    };
  }

  if (options.confirmation !== "wcCapabilityFailedReceiptRecovery") {
    fail("explicit_confirmation_required");
  }

  if (status === "recovered") {
    if (!inspection.duplicate) fail("recovered_ticket_missing_credit");
    const wc = await readCanonicalWcState(account, options.dataDir);
    return {
      ok: true,
      marker: VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_MARKER,
      dry: false,
      mutated: false,
      idempotent: true,
      ticket_id: ticketId,
      ticket_status: "recovered",
      inspection,
      wc,
      consumed_file: consumedFile,
    };
  }

  const acceptance = await acceptVerifiedReceiptOnce(receipt, {
    dataDir: options.dataDir,
    expectedAccount: account,
    expectedJobId: jobId,
    expectedReceiptId: receiptId,
    capabilityTicketId: ticketId,
    source: "wc_capability_failed_receipt_recovery_v1",
  });
  const wc = await readCanonicalWcState(account, options.dataDir);

  const recovered = {
    ...ticket,
    status: "recovered",
    recovered_from_status: "failed",
    recovered_at_ms: Date.now(),
    recovery_marker: VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_MARKER,
    original_failure_reason:
      ticket?.original_failure_reason || ticket?.failure_reason || null,
    receipt_id: receiptId,
    job_id: jobId,
    dataset_id: String(acceptance?.dataset_id || receipt?.dataset_id || ""),
    wc_delta: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
    canonical_redeemable_after:
      typeof wc.redeemable === "number"
        ? wc.redeemable
        : null,
    canonical_redeemable_after_exact: String(
      wc.redeemable_exact || "0",
    ),
    canonical_redeemable_after_quanta: String(
      wc.redeemable_quanta || "0",
    ),
    numeric_authority: "nano_wc_fixed_point_v1",
  };
  atomicWriteJson(consumedFile, recovered);
  appendCapabilityAudit(options.dataDir, {
    event: "recovered",
    ticket_id: ticketId,
    account,
    receipt_id: receiptId,
    job_id: jobId,
    wc_delta: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
    acceptance_duplicate: acceptance?.duplicate === true,
  });

  return {
    ok: true,
    marker: VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_MARKER,
    dry: false,
    mutated: acceptance?.credited === true || status === "failed",
    ticket_id: ticketId,
    ticket_status: "recovered",
    acceptance,
    wc,
    consumed_file: consumedFile,
  };
}

// VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_V1
export const VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_MARKER =
  "VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_V1";
export const VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK =
  "void-public-agent-integration-evidence-v1";
export const VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_SECONDARY_TASK = "void-public-selector-independent-verification-v1";
export const VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASKS = Object.freeze([
  VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASK,
  VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_SECONDARY_TASK,
] as const);
export function isVoidWcPaidWorkEntitlementAcceptanceTask(taskRaw: unknown): boolean {
  const task = String(taskRaw ?? "").trim();
  return VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASKS.some((candidate) => candidate === task);
}
export const VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC = 3;
const VOID_WC_PAID_WORK_REVIEW_SCHEMA_V1 =
  "void-agent-paid-work-review-v1";
const VOID_WC_PAID_WORK_ENTITLEMENT_SCHEMA_V1 =
  "void-agent-paid-work-entitlement-v1";
export const VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_CONFIRMATION =
  "wcPaidWorkEntitlementAcceptance";

export interface PaidWorkEntitlementAuthorityV1 {
  reviewRaw: string;
  entitlementRaw: string;
  servicePublicKeyPem: string;
}

export interface PaidWorkEntitlementAcceptanceOptionsV1 {
  dataDir?: string;
  expectedSubmissionId?: string;
  expectedTaskId?: string;
  expectedAgentId?: string;
  expectedAgentKeyFingerprintSha256?: string;
  expectedReviewSha256?: string;
  expectedEntitlementSha256?: string;
  apply?: boolean;
  confirmation?: string;
  source?: string;
}

export class PaidWorkEntitlementAcceptanceError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message || code);
    this.name = "PaidWorkEntitlementAcceptanceError";
    this.code = code;
  }
}

function paidWorkFail(code: string, message?: string): never {
  throw new PaidWorkEntitlementAcceptanceError(code, message);
}

function paidWorkSha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function paidWorkCanonicalValue(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => paidWorkCanonicalValue(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = paidWorkCanonicalValue(value[key]);
    }
    return out;
  }
  return value;
}

function paidWorkCanonicalBytes(value: any): Buffer {
  return Buffer.from(
    JSON.stringify(paidWorkCanonicalValue(value)),
    "utf8",
  );
}

function paidWorkStrictJson(raw: string, label: string): JsonObject {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      paidWorkFail(`${label}_not_object`);
    }
    return value as JsonObject;
  } catch (error: any) {
    if (error instanceof PaidWorkEntitlementAcceptanceError) throw error;
    paidWorkFail(`${label}_invalid_json`, String(error?.message || error));
  }
}

function paidWorkStrictBase64(value: unknown, label: string): Buffer {
  if (typeof value !== "string") {
    paidWorkFail(`${label}_invalid_base64`);
  }
  const text = value;
  if (!text || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) {
    paidWorkFail(`${label}_invalid_base64`);
  }
  const decoded = Buffer.from(text, "base64");
  if (decoded.length !== 64) {
    paidWorkFail(`${label}_invalid_signature_length`);
  }
  if (decoded.toString("base64") !== text) {
    paidWorkFail(`${label}_noncanonical_base64`);
  }
  return decoded;
}

function paidWorkServiceKeyFingerprint(publicKeyPem: string): string {
  try {
    const key = crypto.createPublicKey(publicKeyPem);
    const der = key.export({ type: "spki", format: "der" }) as Buffer;
    return paidWorkSha256Hex(der);
  } catch (error: any) {
    paidWorkFail(
      "service_public_key_invalid",
      String(error?.message || error),
    );
  }
}

function paidWorkSignedCore(record: JsonObject): JsonObject {
  const core: JsonObject = {};
  for (const [key, value] of Object.entries(record)) {
    if (
      key === "service_signature_base64" ||
      key === "service_key_fingerprint_sha256"
    ) {
      continue;
    }
    core[key] = value;
  }
  return core;
}

function verifyPaidWorkServiceRecord(
  record: JsonObject,
  publicKeyPem: string,
  expectedFingerprint: string,
  label: string,
): void {
  const recordFingerprint =
    record.service_key_fingerprint_sha256;
  if (
    typeof recordFingerprint !== "string" ||
    recordFingerprint !== expectedFingerprint
  ) {
    paidWorkFail(`${label}_service_key_fingerprint_mismatch`);
  }

  const signature = paidWorkStrictBase64(
    record.service_signature_base64,
    `${label}_service_signature`,
  );
  const payload = paidWorkCanonicalBytes(paidWorkSignedCore(record));

  let verified = false;
  try {
    verified = crypto.verify(
      null,
      payload,
      crypto.createPublicKey(publicKeyPem),
      signature,
    );
  } catch (error: any) {
    paidWorkFail(
      `${label}_service_signature_verification_failed`,
      String(error?.message || error),
    );
  }
  if (!verified) {
    paidWorkFail(`${label}_service_signature_invalid`);
  }
}

function paidWorkExpected(
  actual: string,
  expected: string | undefined,
  code: string,
): void {
  if (expected !== undefined && actual !== expected) {
    paidWorkFail(code);
  }
}

function paidWorkFalse(value: unknown, code: string): void {
  if (value !== false) paidWorkFail(code);
}

function paidWorkRequiredString(
  value: unknown,
  code: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    paidWorkFail(code);
  }
  return value;
}

function paidWorkOptionalString(
  value: unknown,
  code: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") paidWorkFail(code);
  return value;
}

function normalizePaidWorkAuthority(
  authority: PaidWorkEntitlementAuthorityV1,
  options: PaidWorkEntitlementAcceptanceOptionsV1,
): JsonObject {
  if (
    !authority ||
    typeof authority !== "object" ||
    Array.isArray(authority)
  ) {
    paidWorkFail("authority_required");
  }
  const reviewRaw = paidWorkRequiredString(
    authority.reviewRaw,
    "review_raw_required",
  );
  const entitlementRaw = paidWorkRequiredString(
    authority.entitlementRaw,
    "entitlement_raw_required",
  );
  const servicePublicKeyPem = paidWorkRequiredString(
    authority.servicePublicKeyPem,
    "service_public_key_required",
  );

  const reviewSha256 = paidWorkSha256Hex(reviewRaw);
  const entitlementSha256 = paidWorkSha256Hex(entitlementRaw);

  paidWorkExpected(
    reviewSha256,
    options.expectedReviewSha256,
    "review_sha256_mismatch",
  );
  paidWorkExpected(
    entitlementSha256,
    options.expectedEntitlementSha256,
    "entitlement_sha256_mismatch",
  );

  const review = paidWorkStrictJson(reviewRaw, "review");
  const entitlement = paidWorkStrictJson(
    entitlementRaw,
    "entitlement",
  );

  if (review.schema !== VOID_WC_PAID_WORK_REVIEW_SCHEMA_V1) {
    paidWorkFail("review_schema_invalid");
  }
  if (
    entitlement.schema !==
    VOID_WC_PAID_WORK_ENTITLEMENT_SCHEMA_V1
  ) {
    paidWorkFail("entitlement_schema_invalid");
  }

  const serviceFingerprint = paidWorkServiceKeyFingerprint(
    servicePublicKeyPem,
  );
  verifyPaidWorkServiceRecord(
    review,
    servicePublicKeyPem,
    serviceFingerprint,
    "review",
  );
  verifyPaidWorkServiceRecord(
    entitlement,
    servicePublicKeyPem,
    serviceFingerprint,
    "entitlement",
  );

  const submissionId = paidWorkRequiredString(
    review.submission_id,
    "submission_id_required",
  );
  const taskId = paidWorkRequiredString(
    review.task_id,
    "paid_work_task_mismatch",
  );
  const reviewAgentId = paidWorkOptionalString(
    review.agent_id,
    "agent_id_required",
  );
  const entitlementAgentId = paidWorkOptionalString(
    entitlement.agent_id,
    "entitlement_agent_id_mismatch",
  );
  const agentId = reviewAgentId || entitlementAgentId || "";
  const agentFingerprint = paidWorkRequiredString(
    review.agent_key_fingerprint_sha256,
    "agent_key_fingerprint_invalid",
  );
  const entitlementSubmissionId = paidWorkRequiredString(
    entitlement.submission_id,
    "entitlement_submission_id_mismatch",
  );
  const entitlementTaskId = paidWorkRequiredString(
    entitlement.task_id,
    "entitlement_task_id_mismatch",
  );
  const entitlementFingerprint = paidWorkRequiredString(
    entitlement.agent_key_fingerprint_sha256,
    "entitlement_agent_key_fingerprint_mismatch",
  );

  if (
    !VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_TASKS.some(
      (candidate) => candidate === taskId,
    )
  ) {
    paidWorkFail("paid_work_task_mismatch");
  }
  if (!agentId) paidWorkFail("agent_id_required");
  if (!/^[a-f0-9]{64}$/.test(agentFingerprint)) {
    paidWorkFail("agent_key_fingerprint_invalid");
  }

  paidWorkExpected(
    submissionId,
    options.expectedSubmissionId,
    "expected_submission_id_mismatch",
  );
  paidWorkExpected(
    taskId,
    options.expectedTaskId,
    "expected_task_id_mismatch",
  );
  paidWorkExpected(
    agentId,
    options.expectedAgentId,
    "expected_agent_id_mismatch",
  );
  paidWorkExpected(
    agentFingerprint,
    options.expectedAgentKeyFingerprintSha256,
    "expected_agent_key_fingerprint_mismatch",
  );

  if (review.decision !== "approve") {
    paidWorkFail("review_decision_not_approve");
  }
  if (
    review.status !==
    "approved_pilot_wc_entitlement_issued"
  ) {
    paidWorkFail("review_status_invalid");
  }
  if (review.award_type !== "pilot_wc_entitlement") {
    paidWorkFail("review_award_type_invalid");
  }
  if (
    typeof review.award_wc !== "number" ||
    !Number.isSafeInteger(review.award_wc) ||
    review.award_wc !==
      VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC
  ) {
    paidWorkFail("review_award_wc_mismatch");
  }
  paidWorkFalse(
    review.canonical_wc_ledger_credit_performed,
    "review_canonical_credit_already_performed",
  );
  paidWorkFalse(
    review.void_settlement_performed,
    "review_void_settlement_performed",
  );

  if (entitlementSubmissionId !== submissionId) {
    paidWorkFail("entitlement_submission_id_mismatch");
  }
  if (entitlementTaskId !== taskId) {
    paidWorkFail("entitlement_task_id_mismatch");
  }
  if (
    entitlementAgentId !== undefined &&
    entitlementAgentId !== agentId
  ) {
    paidWorkFail("entitlement_agent_id_mismatch");
  }
  if (entitlementFingerprint !== agentFingerprint) {
    paidWorkFail("entitlement_agent_key_fingerprint_mismatch");
  }
  if (entitlement.status !== "pilot_wc_entitlement_issued") {
    paidWorkFail("entitlement_status_invalid");
  }
  if (
    entitlement.award_type !== undefined &&
    entitlement.award_type !== "pilot_wc_entitlement"
  ) {
    paidWorkFail("entitlement_award_type_invalid");
  }
  if (
    typeof entitlement.award_wc !== "number" ||
    !Number.isSafeInteger(entitlement.award_wc) ||
    entitlement.award_wc !==
      VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC
  ) {
    paidWorkFail("entitlement_award_wc_mismatch");
  }
  paidWorkFalse(
    entitlement.canonical_wc_ledger_credit_performed,
    "entitlement_canonical_credit_already_performed",
  );
  paidWorkFalse(
    entitlement.void_settlement_performed,
    "entitlement_void_settlement_performed",
  );

  const idempotencyKey =
    `paid-work-entitlement:${submissionId}:` +
    `${entitlementSha256}:award-` +
    `${VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC}`;

  return {
    review,
    entitlement,
    review_sha256: reviewSha256,
    entitlement_sha256: entitlementSha256,
    service_key_fingerprint_sha256: serviceFingerprint,
    submission_id: submissionId,
    task_id: taskId,
    account: agentId,
    agent_key_fingerprint_sha256: agentFingerprint,
    idempotency_key: idempotencyKey,
  };
}

async function existingPaidWorkEntitlementCredit(
  normalized: JsonObject,
  raw?: string,
): Promise<{
  entry: JsonObject | null;
  malformed: number;
}> {
  let text = "";
  try {
    text = await fsp.readFile(ledgerFile(raw), "utf8");
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      return { entry: null, malformed: 0 };
    }
    throw error;
  }

  let malformed = 0;
  let exact: JsonObject | null = null;
  for (const sourceLine of text.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line) continue;

    let entry: JsonObject;
    try {
      const parsed = JSON.parse(line);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        malformed += 1;
        continue;
      }
      entry = parsed as JsonObject;
    } catch {
      malformed += 1;
      continue;
    }

    const sameSubmission =
      exactStringV1(entry.submission_id) === normalized.submission_id;
    const sameEntitlement =
      exactStringV1(entry.entitlement_sha256) ===
      normalized.entitlement_sha256;
    const sameIdempotency =
      exactStringV1(entry.idempotency_key) === normalized.idempotency_key;

    if (!sameSubmission && !sameEntitlement && !sameIdempotency) {
      continue;
    }

    const exactMatch =
      canonicalAcceptanceCreditAuthorityV1(entry) === "valid" &&
      sameSubmission &&
      sameEntitlement &&
      sameIdempotency &&
      exactStringV1(entry.account) === normalized.account &&
      typeof entry.delta === "number" &&
      Number.isSafeInteger(entry.delta) &&
      entry.delta ===
        VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC &&
      exactStringV1(entry.reason) ===
        "paid_work_entitlement_acceptance_v1";

    if (!exactMatch) {
      paidWorkFail("duplicate_credit_conflict");
    }
    exact = entry;
  }

  return { entry: exact, malformed };
}

function paidWorkEntitlementEntry(
  normalized: JsonObject,
  options: PaidWorkEntitlementAcceptanceOptionsV1,
): JsonObject {
  return {
    kind: "credit",
    account: normalized.account,
    delta: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC,
    ts_ms: Date.now(),
    reason: "paid_work_entitlement_acceptance_v1",
    submission_id: normalized.submission_id,
    task_id: normalized.task_id,
    agent_key_fingerprint_sha256:
      normalized.agent_key_fingerprint_sha256,
    entitlement_sha256: normalized.entitlement_sha256,
    review_sha256: normalized.review_sha256,
    idempotency_key: normalized.idempotency_key,
    reward_meta: {
      source: "void_agent_paid_work_intake_v1",
      policy: "approved_signed_pilot_entitlement_only",
      server_controlled_award: true,
      fixed_award_wc:
        VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC,
      duplicate_guard: [
        "submission_id",
        "entitlement_sha256",
        "idempotency_key",
      ],
      operator_approval_verified: true,
      review_service_signature_verified: true,
      entitlement_service_signature_verified: true,
      service_key_fingerprint_sha256:
        normalized.service_key_fingerprint_sha256,
      canonical_wc_ledger_credit_automatic: false,
      void_settlement_performed: false,
      wallet_transaction_payment_performed: false,
      caller: safeId(options.source, 128) || "unspecified",
      accepted_at_ms: Date.now(),
    },
  };
}

export async function inspectPaidWorkEntitlementAcceptance(
  authority: PaidWorkEntitlementAuthorityV1,
  options: PaidWorkEntitlementAcceptanceOptionsV1 = {},
): Promise<JsonObject> {
  const normalized = normalizePaidWorkAuthority(authority, options);
  const lock = await acquireLock(options.dataDir);
  try {
    const existing = await existingPaidWorkEntitlementCredit(
      normalized,
      options.dataDir,
    );
    const wc = await readCanonicalWcState(
      normalized.account,
      options.dataDir,
    );
    return {
      ok: true,
      marker: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_MARKER,
      eligible: existing.entry === null,
      duplicate: existing.entry !== null,
      would_credit: existing.entry === null,
      award_wc:
        VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC,
      account: normalized.account,
      submission_id: normalized.submission_id,
      task_id: normalized.task_id,
      entitlement_sha256: normalized.entitlement_sha256,
      idempotency_key: normalized.idempotency_key,
      entry: existing.entry,
      wc,
      historical_malformed_ledger_lines: existing.malformed,
      mutated: false,
      canonical_wc_ledger_credit_automatic: false,
      void_settlement_performed: false,
      wallet_transaction_payment_performed: false,
    };
  } finally {
    await releaseLock(lock);
  }
}

export async function acceptPaidWorkEntitlementOnce(
  authority: PaidWorkEntitlementAuthorityV1,
  options: PaidWorkEntitlementAcceptanceOptionsV1 = {},
): Promise<JsonObject> {
  const normalized = normalizePaidWorkAuthority(authority, options);

  if (options.apply !== true) {
    return inspectPaidWorkEntitlementAcceptance(authority, options);
  }
  if (
    options.confirmation !==
    VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_CONFIRMATION
  ) {
    paidWorkFail("explicit_confirmation_required");
  }

  const lock = await acquireLock(options.dataDir);
  try {
    const existing = await existingPaidWorkEntitlementCredit(
      normalized,
      options.dataDir,
    );
    if (existing.entry) {
      const wc = await readCanonicalWcState(
        normalized.account,
        options.dataDir,
      );
      return {
        ok: true,
        marker: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_MARKER,
        credited: false,
        duplicate: true,
        mutated: false,
        award_wc:
          VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC,
        account: normalized.account,
        submission_id: normalized.submission_id,
        task_id: normalized.task_id,
        entitlement_sha256: normalized.entitlement_sha256,
        idempotency_key: normalized.idempotency_key,
        entry: existing.entry,
        wc,
        historical_malformed_ledger_lines: existing.malformed,
        canonical_wc_ledger_credit_automatic: false,
        void_settlement_performed: false,
        wallet_transaction_payment_performed: false,
      };
    }

    const entry = paidWorkEntitlementEntry(normalized, options);
    await fsp.mkdir(wcDir(options.dataDir), {
      recursive: true,
      mode: 0o700,
    });
    await fsp.appendFile(
      ledgerFile(options.dataDir),
      jsonLine(entry),
      {
        encoding: "utf8",
        mode: 0o600,
        flag: "a",
      },
    );

    const wc = await readCanonicalWcState(
      normalized.account,
      options.dataDir,
    );
    return {
      ok: true,
      marker: VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_MARKER,
      credited: true,
      duplicate: false,
      mutated: true,
      award_wc:
        VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC,
      account: normalized.account,
      submission_id: normalized.submission_id,
      task_id: normalized.task_id,
      entitlement_sha256: normalized.entitlement_sha256,
      idempotency_key: normalized.idempotency_key,
      entry,
      wc,
      historical_malformed_ledger_lines: existing.malformed,
      canonical_wc_ledger_credit_automatic: false,
      void_settlement_performed: false,
      wallet_transaction_payment_performed: false,
    };
  } finally {
    await releaseLock(lock);
  }
}
