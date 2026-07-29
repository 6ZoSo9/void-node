import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

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
  const account = String(value || "").trim();
  return /^[A-Za-z0-9._:@-]{3,128}$/.test(account) ? account : "";
}

function safeId(value: unknown, max = 180): string {
  const id = String(value || "").trim();
  if (!id || id.length > max || !/^[A-Za-z0-9._:@-]+$/.test(id)) return "";
  return id;
}

function hex64(value: unknown): string {
  const candidate = String(value || "").trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(candidate) ? candidate : "";
}

function jsonLine(value: JsonObject): string {
  return JSON.stringify(value) + "\n";
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
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object") visit(parsed);
        else recordMalformed(line);
      } catch (_error) {
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
    (candidate) => String(candidate?.receipt_id || candidate?.id || "") === receiptId,
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
      String(candidate?.job_id || "") === jobId &&
      String(candidate?.status || "").toLowerCase() === "completed",
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
      (candidate) => String(candidate?.job_id || candidate?.id || "") === jobId,
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
  const kind = String(receipt?.kind || "").trim();
  const status = String(receipt?.status || "").trim().toLowerCase();
  const inputHash = hex64(receipt?.input_hash);
  const outputHash = hex64(receipt?.output_hash);
  const fetchedInputHash = hex64(receipt?.output?.fetched_input_hash);

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
    ts_ms: Number(receipt?.ts_ms || Date.now()),
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
  ]) {
    if (String(incoming[field] || "") !== String(truth[field] || "")) {
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
  const jobKind = String(job?.kind || "").trim();
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
): Promise<{ entry: JsonObject | null; malformed: number }> {
  let existing: JsonObject | null = null;
  let conflict = false;
  const scan = await scanJsonl(
    ledgerFile(raw),
    (entry) => {
      if (String(entry?.kind || "") !== "credit") return;

      const receiptMatch =
        String(entry?.receipt_id || "") === normalized.receipt_id;
      const jobMatch = String(entry?.job_id || "") === normalized.job_id;
      if (!receiptMatch && !jobMatch) return;

      const compatible =
        String(entry?.account || "") === normalized.account &&
        Number(entry?.delta) === VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC &&
        String(entry?.receipt_kind || "") ===
          VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK;

      if (!compatible) conflict = true;
      if (!existing) existing = entry;
    },
    [normalized.account, normalized.job_id, normalized.receipt_id],
  );

  if (scan.ambiguous_malformed > 0) {
    fail("ambiguous_malformed_ledger_line");
  }
  if (conflict) fail("duplicate_credit_conflict");
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
    ts_ms: Number(normalized.ts_ms || Date.now()),
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

async function acquireLock(raw?: string): Promise<{
  file: string;
  handle: fsp.FileHandle;
}> {
  const dir = wcDir(raw);
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, ".verified-receipt-acceptance-v1.lock");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await fsp.open(file, "wx", 0o600);
      await handle.writeFile(
        JSON.stringify({
          marker: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_MARKER,
          pid: process.pid,
          created_at_ms: Date.now(),
        }) + "\n",
        "utf8",
      );
      return { file, handle };
    } catch (error: any) {
      if (String(error?.code || "") !== "EEXIST") throw error;
      let stale = false;
      try {
        const stat = await fsp.stat(file);
        stale = Date.now() - Number(stat.mtimeMs || 0) > 5 * 60 * 1000;
      } catch (statError: any) {
        if (String(statError?.code || "") !== "ENOENT") throw statError;
        stale = true;
      }
      if (!stale) fail("acceptance_busy");
      try {
        await fsp.unlink(file);
      } catch (unlinkError: any) {
        if (String(unlinkError?.code || "") !== "ENOENT") throw unlinkError;
      }
    }
  }

  fail("acceptance_lock_failed");
}

async function releaseLock(lock: {
  file: string;
  handle: fsp.FileHandle;
}): Promise<void> {
  try {
    await lock.handle.close();
  } finally {
    try {
      await fsp.unlink(lock.file);
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") throw error;
    }
  }
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
  const existing = await existingCredit(normalized, options.dataDir);
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
    const existing = await existingCredit(normalized, options.dataDir);

    if (existing.entry) {
      return {
        ok: true,
        marker: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_MARKER,
        credited: false,
        duplicate: true,
        award_wc: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
        account: normalized.account,
        job_id: normalized.job_id,
        receipt_id: normalized.receipt_id,
        dataset_id: normalized.dataset_id,
        entry: existing.entry,
        historical_malformed_ledger_lines: existing.malformed,
      };
    }

    const entry = acceptanceEntry(normalized, options);
    await fsp.mkdir(wcDir(options.dataDir), { recursive: true, mode: 0o700 });
    await fsp.appendFile(ledgerFile(options.dataDir), jsonLine(entry), {
      encoding: "utf8",
      mode: 0o600,
      flag: "a",
    });

    return {
      ok: true,
      marker: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_MARKER,
      credited: true,
      duplicate: false,
      award_wc: VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
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

  let earned = 0;
  let debited = 0;
  let redeemed = 0;

  const ledgerScan = await scanJsonl(
    ledgerFile(dataDir),
    (entry) => {
      if (String(entry?.account || "") !== account) return;
      const delta = Number(entry?.delta || 0);
      if (Number.isFinite(delta) && delta > 0) earned += delta;
      if (String(entry?.kind || "") === "debit") {
        const amount = Number(entry?.amount ?? Math.abs(delta));
        if (Number.isFinite(amount) && amount > 0) debited += amount;
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
      if (String(entry?.account || "") !== account) return;
      const amount = Number(entry?.amount || 0);
      if (Number.isFinite(amount) && amount > 0) redeemed += amount;
    },
    [account],
  );
  if (redeemedScan.ambiguous_malformed > 0) {
    fail("ambiguous_malformed_redeemed_line");
  }

  const round = (value: number) => Math.round(value * 1e9) / 1e9;
  earned = round(earned);
  debited = round(debited);
  redeemed = round(redeemed);

  return {
    account,
    earned,
    debited,
    redeemed,
    redeemable: round(Math.max(0, earned - debited - redeemed)),
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
    canonical_redeemable_after: Number(wc.redeemable || 0),
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
  const text = String(value || "");
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
  const recordFingerprint = String(
    record.service_key_fingerprint_sha256 || "",
  );
  if (recordFingerprint !== expectedFingerprint) {
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
  actual: unknown,
  expected: string | undefined,
  code: string,
): void {
  if (expected !== undefined && String(actual || "") !== expected) {
    paidWorkFail(code);
  }
}

function paidWorkFalse(value: unknown, code: string): void {
  if (value !== false) paidWorkFail(code);
}

function normalizePaidWorkAuthority(
  authority: PaidWorkEntitlementAuthorityV1,
  options: PaidWorkEntitlementAcceptanceOptionsV1,
): JsonObject {
  if (!authority || typeof authority !== "object") {
    paidWorkFail("authority_required");
  }
  const reviewRaw = String(authority.reviewRaw || "");
  const entitlementRaw = String(authority.entitlementRaw || "");
  const servicePublicKeyPem = String(authority.servicePublicKeyPem || "");

  if (!reviewRaw) paidWorkFail("review_raw_required");
  if (!entitlementRaw) paidWorkFail("entitlement_raw_required");
  if (!servicePublicKeyPem) paidWorkFail("service_public_key_required");

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

  const submissionId = String(review.submission_id || "");
  const taskId = String(review.task_id || "");
  const agentId = String(
    review.agent_id || entitlement.agent_id || "",
  );
  const agentFingerprint = String(
    review.agent_key_fingerprint_sha256 || "",
  );

  if (!submissionId) paidWorkFail("submission_id_required");
  if (!isVoidWcPaidWorkEntitlementAcceptanceTask(taskId)) {
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

  if (String(review.decision || "") !== "approve") {
    paidWorkFail("review_decision_not_approve");
  }
  if (
    String(review.status || "") !==
    "approved_pilot_wc_entitlement_issued"
  ) {
    paidWorkFail("review_status_invalid");
  }
  if (String(review.award_type || "") !== "pilot_wc_entitlement") {
    paidWorkFail("review_award_type_invalid");
  }
  if (
    Number(review.award_wc) !==
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

  if (String(entitlement.submission_id || "") !== submissionId) {
    paidWorkFail("entitlement_submission_id_mismatch");
  }
  if (String(entitlement.task_id || "") !== taskId) {
    paidWorkFail("entitlement_task_id_mismatch");
  }
  if (
    entitlement.agent_id !== undefined &&
    String(entitlement.agent_id || "") !== agentId
  ) {
    paidWorkFail("entitlement_agent_id_mismatch");
  }
  if (
    String(entitlement.agent_key_fingerprint_sha256 || "") !==
    agentFingerprint
  ) {
    paidWorkFail("entitlement_agent_key_fingerprint_mismatch");
  }
  if (
    String(entitlement.status || "") !==
    "pilot_wc_entitlement_issued"
  ) {
    paidWorkFail("entitlement_status_invalid");
  }
  if (
    entitlement.award_type !== undefined &&
    String(entitlement.award_type || "") !== "pilot_wc_entitlement"
  ) {
    paidWorkFail("entitlement_award_type_invalid");
  }
  if (
    Number(entitlement.award_wc) !==
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
      String(entry.submission_id || "") === normalized.submission_id;
    const sameEntitlement =
      String(entry.entitlement_sha256 || "") ===
      normalized.entitlement_sha256;
    const sameIdempotency =
      String(entry.idempotency_key || "") === normalized.idempotency_key;

    if (!sameSubmission && !sameEntitlement && !sameIdempotency) {
      continue;
    }

    const exactMatch =
      sameSubmission &&
      sameEntitlement &&
      sameIdempotency &&
      String(entry.account || "") === normalized.account &&
      Number(entry.delta) ===
        VOID_WC_PAID_WORK_ENTITLEMENT_ACCEPTANCE_AWARD_WC &&
      String(entry.reason || "") ===
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
