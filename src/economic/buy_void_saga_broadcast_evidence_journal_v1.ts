import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import type {
  BuyVoidPreparedTransactionBroadcasterReadyV1,
  BuyVoidPreparedTransactionBroadcastReceiptV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";

export const VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_V1 =
  "VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_V1";

export const VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_AUTHORITY_V1 = {
  source_only_contract: true,
  filesystem_read: true,
  filesystem_write: true,
  private_directories_required: true,
  append_only_hash_chain: true,
  crash_recoverable_bakery_lock: true,
  exact_saga_attempt_intent_binding: true,
  monotonic_submission_outcome: true,
  terminal_receipt_immutable: true,
  provider_submission_id_bounded: true,
  custody_handle_input: false,
  custody_handle_persistence: false,
  signed_payload_bytes_input: false,
  signed_payload_bytes_persistence: false,
  signed_payload_bytes_output: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const EVENT_SCHEMA =
  "void_buy_void_saga_broadcast_evidence_event_v1";
const EVENT_ID_PREFIX = "voidbvbe1_";
const EVENT_FILE = /^(\d{8})-(voidbvbe1_[0-9a-f]{64})\.json$/;
const EVENT_TEMP = /^\.\d{8}-voidbvbe1_[0-9a-f]{64}\.json\.tmp-[1-9][0-9]*-[0-9a-f]{16}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const INTENT_ID = /^voidbvbci1_[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{0,200}$/;
const MAX_EVENTS = 32;
const MAX_JSON_BYTES = 512 * 1024;

export type BuyVoidSagaBroadcastEvidenceOutcomeV1 =
  | "not_submitted"
  | "unknown"
  | "accepted"
  | "confirmed"
  | "reverted";

export type BuyVoidSagaBroadcastEvidenceEventV1 = {
  schema: typeof EVENT_SCHEMA;
  marker: typeof VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_V1;
  version: 1;
  event_id: string;
  sequence: number;
  previous_event_id: string | null;
  recorded_at_ms: number;
  saga_id: string;
  attempt_id: string;
  broadcast_intent_id: string;
  transaction_hash: string;
  outcome: BuyVoidSagaBroadcastEvidenceOutcomeV1;
  provider_submission_id: string;
  provider_submission_id_sha256: string;
  submission_call_performed: boolean;
  submission_may_have_occurred: boolean;
  receipt: BuyVoidPreparedTransactionBroadcastReceiptV1 | null;
  authority:
    typeof VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_AUTHORITY_V1;
};

export type BuyVoidSagaBroadcastEvidenceStateV1 = {
  saga_id: string;
  attempt_id: string;
  broadcast_intent_id: string;
  transaction_hash: string;
  events: BuyVoidSagaBroadcastEvidenceEventV1[];
  latest: BuyVoidSagaBroadcastEvidenceEventV1;
  terminal: boolean;
  reconciliation_required: boolean;
  automatic_retry_allowed: false;
};

export type RecordBuyVoidSagaBroadcastEvidenceInputV1 = {
  root_dir: string;
  saga_id: string;
  attempt_id: string;
  broadcast_intent_id: string;
  transaction_hash: string;
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1;
  now_ms?: number;
};

export type BuyVoidSagaBroadcastEvidenceDecisionV1 =
  | {
      ok: true;
      status: "recorded" | "duplicate";
      duplicate: boolean;
      mutation_performed: boolean;
      state: BuyVoidSagaBroadcastEvidenceStateV1;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
      state?: never;
    };

function held(
  reason: string,
  detail?: Record<string, unknown>,
): Extract<BuyVoidSagaBroadcastEvidenceDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    mutation_performed: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeHash(value: unknown): string {
  const hash = text(value).toLowerCase();
  return HASH.test(hash) ? hash : "";
}

function normalizeAddress(value: unknown): string {
  const address = text(value).toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function decimal(value: unknown, positive = false): string {
  const raw = text(value);
  if (!DECIMAL.test(raw)) return "";
  if (positive && BigInt(raw) <= 0n) return "";
  return raw;
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : Date.now();
}

function safeProviderId(value: unknown): string {
  const id = text(value).slice(0, 200);
  return SAFE_PROVIDER_ID.test(id) ? id : "";
}

function validateReceipt(
  receipt: unknown,
  transactionHash: string,
  expectedStatus: 0 | 1,
): BuyVoidPreparedTransactionBroadcastReceiptV1 {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new Error("broadcast_evidence_receipt_object_required");
  }
  const value = receipt as Record<string, unknown>;
  const chainId = text(value.chain_id);
  const hash = normalizeHash(value.transaction_hash);
  const status = Number(value.transaction_status);
  const blockNumber = decimal(value.block_number, true);
  const blockHash = normalizeHash(value.block_hash);
  const currentBlock = decimal(value.current_block_number, true);
  const confirmations = decimal(value.confirmation_count, true);
  const from = normalizeAddress(value.from_address);
  const to = normalizeAddress(value.to_address);
  const amount = decimal(value.amount_units, true);
  if (
    chainId !== "2050" ||
    hash !== transactionHash ||
    status !== expectedStatus ||
    !blockNumber ||
    !blockHash ||
    !currentBlock ||
    !confirmations ||
    !from ||
    !to ||
    !amount
  ) {
    throw new Error("broadcast_evidence_receipt_invalid");
  }
  const observed = BigInt(currentBlock) - BigInt(blockNumber) + 1n;
  if (observed <= 0n || observed.toString() !== confirmations) {
    throw new Error("broadcast_evidence_confirmation_count_invalid");
  }
  return {
    chain_id: "2050",
    transaction_hash: hash,
    transaction_status: expectedStatus,
    block_number: blockNumber,
    block_hash: blockHash,
    current_block_number: currentBlock,
    confirmation_count: confirmations,
    from_address: from,
    to_address: to,
    amount_units: amount,
  };
}

function normalizeOutcome(
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1,
  transactionHash: string,
): {
  outcome: BuyVoidSagaBroadcastEvidenceOutcomeV1;
  provider_submission_id: string;
  submission_call_performed: boolean;
  submission_may_have_occurred: boolean;
  receipt: BuyVoidPreparedTransactionBroadcastReceiptV1 | null;
} {
  if (!outcome || outcome.ok !== true) {
    throw new Error("broadcast_evidence_ready_outcome_required");
  }
  if (normalizeHash(outcome.transaction_hash) !== transactionHash) {
    throw new Error("broadcast_evidence_transaction_hash_mismatch");
  }
  const provider = safeProviderId(outcome.provider_submission_id);
  if (text(outcome.provider_submission_id) !== provider) {
    throw new Error("broadcast_evidence_provider_id_invalid");
  }
  if (outcome.status === "not_submitted") {
    if (
      outcome.definitive_not_submitted !== true ||
      outcome.submission_call_performed !== false ||
      outcome.submission_may_have_occurred !== false ||
      outcome.receipt !== null
    ) {
      throw new Error("broadcast_evidence_not_submitted_invalid");
    }
    return {
      outcome: "not_submitted",
      provider_submission_id: provider,
      submission_call_performed: false,
      submission_may_have_occurred: false,
      receipt: null,
    };
  }
  if (outcome.status === "unknown" || outcome.status === "accepted") {
    if (
      outcome.definitive_not_submitted !== false ||
      outcome.submission_call_performed !== true ||
      outcome.submission_may_have_occurred !== true ||
      outcome.receipt !== null
    ) {
      throw new Error("broadcast_evidence_submission_outcome_invalid");
    }
    return {
      outcome: outcome.status,
      provider_submission_id: provider,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: null,
    };
  }
  if (outcome.status === "confirmed" || outcome.status === "reverted") {
    if (
      outcome.definitive_not_submitted !== false ||
      outcome.submission_call_performed !== true ||
      outcome.submission_may_have_occurred !== true
    ) {
      throw new Error("broadcast_evidence_terminal_outcome_invalid");
    }
    return {
      outcome: outcome.status,
      provider_submission_id: provider,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: validateReceipt(
        outcome.receipt,
        transactionHash,
        outcome.status === "confirmed" ? 1 : 0,
      ),
    };
  }
  throw new Error("broadcast_evidence_outcome_unsupported");
}

function rootPath(rootDir: string): string {
  const raw = text(rootDir);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("broadcast_evidence_root_must_be_absolute");
  }
  return path.join(
    path.resolve(raw),
    "buy-void-saga-broadcast-evidence-v1",
  );
}

function ensurePrivateDirectory(directory: string): string {
  const resolved = path.resolve(directory);
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  fs.chmodSync(resolved, 0o700);
  const metadata = fs.lstatSync(resolved);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("broadcast_evidence_directory_must_be_direct");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("broadcast_evidence_directory_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("broadcast_evidence_directory_must_be_private");
  }
  return resolved;
}

function fsyncDirectory(directory: string): void {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function attemptDirectory(rootDir: string, attemptId: string): string {
  const root = ensurePrivateDirectory(rootPath(rootDir));
  const attempts = ensurePrivateDirectory(path.join(root, "attempts"));
  const attempt = ensurePrivateDirectory(path.join(attempts, attemptId));
  return attempt;
}

function eventDirectory(rootDir: string, attemptId: string): string {
  return ensurePrivateDirectory(
    path.join(attemptDirectory(rootDir, attemptId), "events"),
  );
}

function lockPath(rootDir: string, attemptId: string): string {
  return path.join(attemptDirectory(rootDir, attemptId), "append.lock");
}

function atomicWriteJson(file: string, value: unknown): void {
  const parent = ensurePrivateDirectory(path.dirname(file));
  const temporary = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, file);
  fsyncDirectory(parent);
}

function readJson(file: string): Record<string, unknown> {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("broadcast_evidence_event_must_be_direct_file");
  }
  if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
    throw new Error("broadcast_evidence_event_size_out_of_range");
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("broadcast_evidence_event_object_required");
  }
  return parsed as Record<string, unknown>;
}

function eventId(
  value: Omit<BuyVoidSagaBroadcastEvidenceEventV1, "event_id">,
): string {
  return `${EVENT_ID_PREFIX}${sha256(canonical(value))}`;
}

function validateEvent(
  value: Record<string, unknown>,
): BuyVoidSagaBroadcastEvidenceEventV1 {
  const event = value as unknown as BuyVoidSagaBroadcastEvidenceEventV1;
  const keys = Object.keys(value).sort();
  const expected = [
    "attempt_id",
    "authority",
    "broadcast_intent_id",
    "event_id",
    "marker",
    "outcome",
    "previous_event_id",
    "provider_submission_id",
    "provider_submission_id_sha256",
    "receipt",
    "recorded_at_ms",
    "saga_id",
    "schema",
    "sequence",
    "submission_call_performed",
    "submission_may_have_occurred",
    "transaction_hash",
    "version",
  ].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error("broadcast_evidence_event_keys_invalid");
  }
  if (
    event.schema !== EVENT_SCHEMA ||
    event.marker !== VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_V1 ||
    event.version !== 1 ||
    !/^voidbvbe1_[0-9a-f]{64}$/.test(event.event_id) ||
    !Number.isSafeInteger(event.sequence) ||
    event.sequence < 0 ||
    event.sequence >= MAX_EVENTS ||
    (event.previous_event_id !== null &&
      !/^voidbvbe1_[0-9a-f]{64}$/.test(event.previous_event_id)) ||
    !Number.isSafeInteger(event.recorded_at_ms) ||
    event.recorded_at_ms <= 0 ||
    !SAGA_ID.test(event.saga_id) ||
    !SHA256.test(event.attempt_id) ||
    !INTENT_ID.test(event.broadcast_intent_id) ||
    !HASH.test(event.transaction_hash) ||
    ![
      "not_submitted",
      "unknown",
      "accepted",
      "confirmed",
      "reverted",
    ].includes(event.outcome) ||
    safeProviderId(event.provider_submission_id) !==
      event.provider_submission_id ||
    event.provider_submission_id_sha256 !==
      sha256(event.provider_submission_id) ||
    typeof event.submission_call_performed !== "boolean" ||
    typeof event.submission_may_have_occurred !== "boolean" ||
    canonical(event.authority) !==
      canonical(
        VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_AUTHORITY_V1,
      )
  ) {
    throw new Error("broadcast_evidence_event_invalid");
  }
  if (event.outcome === "not_submitted") {
    if (
      event.submission_call_performed !== false ||
      event.submission_may_have_occurred !== false ||
      event.receipt !== null
    ) {
      throw new Error("broadcast_evidence_not_submitted_event_invalid");
    }
  } else if (event.outcome === "unknown" || event.outcome === "accepted") {
    if (
      event.submission_call_performed !== true ||
      event.submission_may_have_occurred !== true ||
      event.receipt !== null
    ) {
      throw new Error("broadcast_evidence_nonterminal_event_invalid");
    }
  } else {
    event.receipt = validateReceipt(
      event.receipt,
      event.transaction_hash,
      event.outcome === "confirmed" ? 1 : 0,
    );
  }
  const { event_id: ignored, ...body } = event;
  void ignored;
  if (event.event_id !== eventId(body)) {
    throw new Error("broadcast_evidence_event_id_mismatch");
  }
  return structuredClone(event);
}

function readEvents(
  rootDir: string,
  attemptId: string,
): BuyVoidSagaBroadcastEvidenceEventV1[] {
  const directory = eventDirectory(rootDir, attemptId);
  const files: Array<{ name: string; sequence: number; id: string }> = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.includes(".tmp-")) {
      if (!EVENT_TEMP.test(entry.name) || !entry.isFile() || entry.isSymbolicLink()) {
        throw new Error("broadcast_evidence_temporary_entry_invalid");
      }
      continue;
    }
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error("broadcast_evidence_non_file_entry");
    }
    const match = EVENT_FILE.exec(entry.name);
    if (!match) throw new Error("broadcast_evidence_filename_invalid");
    files.push({
      name: entry.name,
      sequence: Number(match[1]),
      id: match[2],
    });
  }
  files.sort((left, right) =>
    left.sequence - right.sequence || left.name.localeCompare(right.name),
  );
  if (files.length > MAX_EVENTS) {
    throw new Error("broadcast_evidence_event_count_exceeded");
  }
  return files.map((file, index) => {
    if (file.sequence !== index) {
      throw new Error("broadcast_evidence_sequence_gap");
    }
    const event = validateEvent(
      readJson(path.join(directory, file.name)),
    );
    if (event.sequence !== index || event.event_id !== file.id) {
      throw new Error("broadcast_evidence_filename_binding_invalid");
    }
    const expectedPrevious = index === 0
      ? null
      : files[index - 1].id;
    if (event.previous_event_id !== expectedPrevious) {
      throw new Error("broadcast_evidence_hash_chain_invalid");
    }
    return event;
  });
}

function validateProgression(
  previous: BuyVoidSagaBroadcastEvidenceOutcomeV1 | null,
  next: BuyVoidSagaBroadcastEvidenceOutcomeV1,
): void {
  if (!previous) return;
  if (previous === "confirmed" || previous === "reverted") {
    if (next !== previous) {
      throw new Error("broadcast_evidence_terminal_transition_forbidden");
    }
    return;
  }
  const allowed: Record<
    Exclude<BuyVoidSagaBroadcastEvidenceOutcomeV1, "confirmed" | "reverted">,
    BuyVoidSagaBroadcastEvidenceOutcomeV1[]
  > = {
    not_submitted: [
      "not_submitted",
      "unknown",
      "accepted",
      "confirmed",
      "reverted",
    ],
    unknown: ["unknown", "accepted", "confirmed", "reverted"],
    accepted: ["accepted", "confirmed", "reverted"],
  };
  if (!allowed[previous].includes(next)) {
    throw new Error("broadcast_evidence_transition_forbidden");
  }
}

function semanticFingerprint(
  event: Pick<
    BuyVoidSagaBroadcastEvidenceEventV1,
    | "saga_id"
    | "attempt_id"
    | "broadcast_intent_id"
    | "transaction_hash"
    | "outcome"
    | "provider_submission_id"
    | "submission_call_performed"
    | "submission_may_have_occurred"
    | "receipt"
  >,
): string {
  return sha256(canonical(event));
}

function stateFromEvents(
  events: BuyVoidSagaBroadcastEvidenceEventV1[],
): BuyVoidSagaBroadcastEvidenceStateV1 | null {
  if (events.length === 0) return null;
  const first = events[0];
  for (const event of events) {
    if (
      event.saga_id !== first.saga_id ||
      event.attempt_id !== first.attempt_id ||
      event.broadcast_intent_id !== first.broadcast_intent_id ||
      event.transaction_hash !== first.transaction_hash
    ) {
      throw new Error("broadcast_evidence_binding_changed");
    }
  }
  const latest = events[events.length - 1];
  return {
    saga_id: first.saga_id,
    attempt_id: first.attempt_id,
    broadcast_intent_id: first.broadcast_intent_id,
    transaction_hash: first.transaction_hash,
    events,
    latest,
    terminal:
      latest.outcome === "confirmed" || latest.outcome === "reverted",
    reconciliation_required:
      latest.outcome === "unknown" || latest.outcome === "accepted",
    automatic_retry_allowed: false,
  };
}

export function readBuyVoidSagaBroadcastEvidenceStateV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidSagaBroadcastEvidenceStateV1 | null {
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    throw new Error("broadcast_evidence_attempt_id_invalid");
  }
  return stateFromEvents(readEvents(input.root_dir, attemptId));
}

export function recordBuyVoidSagaBroadcastEvidenceV1(
  input: RecordBuyVoidSagaBroadcastEvidenceInputV1,
): BuyVoidSagaBroadcastEvidenceDecisionV1 {
  const sagaId = text(input?.saga_id).toLowerCase();
  const attemptId = text(input?.attempt_id).toLowerCase();
  const intentId = text(input?.broadcast_intent_id).toLowerCase();
  const transactionHash = normalizeHash(input?.transaction_hash);
  if (
    !SAGA_ID.test(sagaId) ||
    !SHA256.test(attemptId) ||
    !INTENT_ID.test(intentId) ||
    !transactionHash
  ) {
    return held("broadcast_evidence_selector_invalid");
  }
  let normalized: ReturnType<typeof normalizeOutcome>;
  try {
    normalized = normalizeOutcome(input.outcome, transactionHash);
  } catch (error) {
    return held("broadcast_evidence_outcome_invalid", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }

  try {
    return withBuyVoidFilesystemBakeryLockV1(
      lockPath(input.root_dir, attemptId),
      () => {
        const currentEvents = readEvents(input.root_dir, attemptId);
        const current = stateFromEvents(currentEvents);
        if (
          current &&
          (
            current.saga_id !== sagaId ||
            current.broadcast_intent_id !== intentId ||
            current.transaction_hash !== transactionHash
          )
        ) {
          return held("broadcast_evidence_binding_conflict");
        }
        validateProgression(
          current?.latest.outcome || null,
          normalized.outcome,
        );
        const semantic = {
          saga_id: sagaId,
          attempt_id: attemptId,
          broadcast_intent_id: intentId,
          transaction_hash: transactionHash,
          outcome: normalized.outcome,
          provider_submission_id:
            normalized.provider_submission_id,
          submission_call_performed:
            normalized.submission_call_performed,
          submission_may_have_occurred:
            normalized.submission_may_have_occurred,
          receipt: normalized.receipt,
        };
        if (
          current &&
          semanticFingerprint(current.latest) ===
            semanticFingerprint(semantic)
        ) {
          return {
            ok: true,
            status: "duplicate",
            duplicate: true,
            mutation_performed: false,
            state: current,
          };
        }
        const sequence = currentEvents.length;
        if (sequence >= MAX_EVENTS) {
          return held("broadcast_evidence_event_limit_reached");
        }
        const body: Omit<
          BuyVoidSagaBroadcastEvidenceEventV1,
          "event_id"
        > = {
          schema: EVENT_SCHEMA,
          marker:
            VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_V1,
          version: 1,
          sequence,
          previous_event_id: current?.latest.event_id || null,
          recorded_at_ms: safeNow(input?.now_ms),
          ...semantic,
          provider_submission_id_sha256:
            sha256(normalized.provider_submission_id),
          authority:
            VOID_BUY_VOID_SAGA_BROADCAST_EVIDENCE_JOURNAL_AUTHORITY_V1,
        };
        const event: BuyVoidSagaBroadcastEvidenceEventV1 = {
          ...body,
          event_id: eventId(body),
        };
        validateEvent(event as unknown as Record<string, unknown>);
        const file = path.join(
          eventDirectory(input.root_dir, attemptId),
          `${String(sequence).padStart(8, "0")}-${event.event_id}.json`,
        );
        if (fs.existsSync(file)) {
          return held("broadcast_evidence_event_file_exists");
        }
        atomicWriteJson(file, event);
        const state = stateFromEvents(
          readEvents(input.root_dir, attemptId),
        );
        if (!state) {
          return held("broadcast_evidence_state_missing_after_write");
        }
        return {
          ok: true,
          status: "recorded",
          duplicate: false,
          mutation_performed: true,
          state,
        };
      },
    );
  } catch (error) {
    return held("broadcast_evidence_record_failed", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }
}
