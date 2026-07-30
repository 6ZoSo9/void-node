import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  lstatSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path, { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const HANDOFF_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_HANDOFF_V1" as const;
export const QUEUE_ITEM_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_ITEM_V1" as const;
export const RECEIPT_INDEX_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_RECEIPT_INDEX_V1" as const;
export const QUEUE_ITEM_ID_PREFIX = "voidapwsrq1_" as const;

const RECEIPT_MARKER = "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1";
const ADMISSION_MARKER = "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1";
const SHA = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export type ReviewQueueItemV1 = {
  marker: typeof QUEUE_ITEM_MARKER;
  version: 1;
  queue_item_id: string;
  status: "received_pending_operator_review";
  queued_at_utc: string;
  receipt: {
    receipt_id: string;
    submission_id: string;
    work_order_id: string;
    request_payload_sha256: string;
    canonical_request_sha256: string;
    admission_id: string;
    received_at_utc: string;
  };
  authentication: {
    mode: "credential_registry";
    registry_id: string;
    credential_id: string;
    agent_id: string;
    scope: "agent_paid_work_submit";
    authorization_verified: true;
  };
  admission: {
    policy_id: string;
    decision: "accepted_for_review";
    reason_codes: [];
    capability_id: string;
    quote_asset: string;
    max_total: string;
    max_runtime_seconds: number;
    max_output_bytes: number;
    input_ref_count: number;
    expected_output_count: number;
    callback_scheme: string;
    callback_host: string;
    ttl_seconds: number;
  };
  review_boundary: {
    operator_review_required: true;
    provider_selection_granted: false;
    quote_creation_granted: false;
    payment_authorization_granted: false;
    payment_execution_granted: false;
    work_execution_authorization_granted: false;
    work_dispatch_granted: false;
    wc_award_granted: false;
    wc_ledger_write_granted: false;
    void_settlement_granted: false;
    wallet_or_signer_access_granted: false;
    signing_granted: false;
    transaction_broadcast_granted: false;
    buy_void_fulfillment_granted: false;
  };
  next_action: "operator_review_before_provider_selection_or_quote_creation";
};

type Receipt = Record<string, any>;
type Draft = Omit<ReviewQueueItemV1, "queue_item_id">;

function fail(message: string): never { throw new Error(message); }
function ok(value: unknown, message: string): asserts value {
  if (!value) fail(message);
}
function record(value: unknown, label: string): Record<string, any> {
  ok(typeof value === "object" && value !== null && !Array.isArray(value), `${label} must be an object`);
  return value as Record<string, any>;
}
function text(value: unknown, label: string, pattern?: RegExp): string {
  ok(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  if (pattern) ok(pattern.test(value as string), `${label} format mismatch`);
  return value as string;
}
function integer(value: unknown, label: string, minimum: number): number {
  ok(typeof value === "number" && Number.isSafeInteger(value) && value >= minimum, `${label} invalid`);
  return value as number;
}
function utc(value: unknown, label: string): string {
  const result = text(value, label, UTC);
  ok(Number.isFinite(Date.parse(result)), `${label} is not UTC`);
  return result;
}
function allFalse(value: unknown, label: string): void {
  const item = record(value, label);
  ok(Object.keys(item).length > 0, `${label} must not be empty`);
  for (const [key, candidate] of Object.entries(item)) {
    ok(candidate === false, `${label}.${key} must be false`);
  }
}
function canonicalize(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function parseAcceptedIntakeReceiptV1(value: unknown): Receipt {
  const receipt = record(value, "receipt");
  ok(receipt.marker === RECEIPT_MARKER, "receipt marker mismatch");
  ok(receipt.version === 1, "receipt version mismatch");
  text(receipt.submission_id, "submission_id", ID);
  text(receipt.work_order_id, "work_order_id", /^voidawo1_[0-9a-f]{64}$/);
  text(receipt.receipt_id, "receipt_id", /^voidawsi1_[0-9a-f]{64}$/);
  text(receipt.request_payload_sha256, "request_payload_sha256", SHA);
  text(receipt.canonical_request_sha256, "canonical_request_sha256", SHA);
  text(receipt.admission_id, "admission_id", /^voidawsa1_[0-9a-f]{64}$/);
  utc(receipt.received_at_utc, "received_at_utc");
  ok(receipt.authorization_verified === true, "authorization_verified must be true");
  ok(receipt.loopback_source === true, "loopback_source must be true");
  ok(receipt.duplicate === false, "duplicate must be false");
  allFalse(receipt.authority, "receipt authority");

  const authentication = record(receipt.authentication, "authentication");
  ok(authentication.mode === "credential_registry", "authentication mode must be credential_registry");
  text(authentication.registry_id, "registry_id", /^voidapwcr1_[0-9a-f]{64}$/);
  text(authentication.credential_id, "credential_id", /^voidapwc1_[0-9a-f]{64}$/);
  text(authentication.agent_id, "agent_id", ID);
  ok(authentication.scope === "agent_paid_work_submit", "authentication scope mismatch");

  const admission = record(receipt.admission, "admission");
  ok(admission.marker === ADMISSION_MARKER, "admission marker mismatch");
  ok(admission.version === 1, "admission version mismatch");
  ok(admission.admission_id === receipt.admission_id, "admission ID mismatch");
  ok(admission.work_order_id === receipt.work_order_id, "admission work-order mismatch");
  text(admission.policy_id, "policy_id", ID);
  utc(admission.evaluated_at_utc, "evaluated_at_utc");
  ok(admission.decision === "accepted_for_review", "admission decision must be accepted_for_review");
  ok(Array.isArray(admission.reason_codes) && admission.reason_codes.length === 0, "admission reasons must be empty");
  allFalse(admission.authority, "admission authority");
  const normalized = record(admission.normalized, "admission.normalized");
  text(normalized.capability_id, "capability_id", ID);
  text(normalized.quote_asset, "quote_asset", ID);
  text(normalized.max_total, "max_total");
  integer(normalized.max_runtime_seconds, "max_runtime_seconds", 1);
  integer(normalized.max_output_bytes, "max_output_bytes", 1);
  integer(normalized.input_ref_count, "input_ref_count", 0);
  integer(normalized.expected_output_count, "expected_output_count", 1);
  text(normalized.callback_scheme, "callback_scheme");
  text(normalized.callback_host, "callback_host");
  integer(normalized.ttl_seconds, "ttl_seconds", 1);
  return receipt;
}

function buildDraft(receipt: Receipt, queuedAt: string): Draft {
  const admission = receipt.admission;
  const normalized = admission.normalized;
  const authentication = receipt.authentication;
  return {
    marker: QUEUE_ITEM_MARKER,
    version: 1,
    status: "received_pending_operator_review",
    queued_at_utc: queuedAt,
    receipt: {
      receipt_id: receipt.receipt_id,
      submission_id: receipt.submission_id,
      work_order_id: receipt.work_order_id,
      request_payload_sha256: receipt.request_payload_sha256,
      canonical_request_sha256: receipt.canonical_request_sha256,
      admission_id: receipt.admission_id,
      received_at_utc: receipt.received_at_utc,
    },
    authentication: {
      mode: "credential_registry",
      registry_id: authentication.registry_id,
      credential_id: authentication.credential_id,
      agent_id: authentication.agent_id,
      scope: "agent_paid_work_submit",
      authorization_verified: true,
    },
    admission: {
      policy_id: admission.policy_id,
      decision: "accepted_for_review",
      reason_codes: [],
      capability_id: normalized.capability_id,
      quote_asset: normalized.quote_asset,
      max_total: normalized.max_total,
      max_runtime_seconds: normalized.max_runtime_seconds,
      max_output_bytes: normalized.max_output_bytes,
      input_ref_count: normalized.input_ref_count,
      expected_output_count: normalized.expected_output_count,
      callback_scheme: normalized.callback_scheme,
      callback_host: normalized.callback_host,
      ttl_seconds: normalized.ttl_seconds,
    },
    review_boundary: {
      operator_review_required: true,
      provider_selection_granted: false,
      quote_creation_granted: false,
      payment_authorization_granted: false,
      payment_execution_granted: false,
      work_execution_authorization_granted: false,
      work_dispatch_granted: false,
      wc_award_granted: false,
      wc_ledger_write_granted: false,
      void_settlement_granted: false,
      wallet_or_signer_access_granted: false,
      signing_granted: false,
      transaction_broadcast_granted: false,
      buy_void_fulfillment_granted: false,
    },
    next_action: "operator_review_before_provider_selection_or_quote_creation",
  };
}

function stableQueueIdentity(receipt: Receipt): Record<string, unknown> {
  return {
    receipt_id: receipt.receipt_id,
    submission_id: receipt.submission_id,
    work_order_id: receipt.work_order_id,
    request_payload_sha256: receipt.request_payload_sha256,
    canonical_request_sha256: receipt.canonical_request_sha256,
    admission_id: receipt.admission_id,
    registry_id: receipt.authentication.registry_id,
    credential_id: receipt.authentication.credential_id,
    agent_id: receipt.authentication.agent_id,
  };
}

export function materializeReviewQueueItemV1(receiptValue: unknown, queuedAtValue: unknown): ReviewQueueItemV1 {
  const receipt = parseAcceptedIntakeReceiptV1(receiptValue);
  const queuedAt = utc(queuedAtValue, "queued_at_utc");
  const draft = buildDraft(receipt, queuedAt);
  return {
    ...draft,
    queue_item_id: `${QUEUE_ITEM_ID_PREFIX}${digest(stableQueueIdentity(receipt))}`,
  };
}

export function validateReviewQueueItemV1(value: unknown, receiptValue: unknown): asserts value is ReviewQueueItemV1 {
  const item = record(value, "queue item");
  const expected = materializeReviewQueueItemV1(receiptValue, item.queued_at_utc);
  ok(canonicalJson(item) === canonicalJson(expected), "queue item deterministic binding mismatch");
  text(item.queue_item_id, "queue_item_id", /^voidapwsrq1_[0-9a-f]{64}$/);
}

function privateDirectory(directory: string): string {
  const absolute = resolve(directory);
  mkdirSync(absolute, { recursive: true, mode: 0o700 });
  const metadata = lstatSync(absolute);
  ok(metadata.isDirectory() && !metadata.isSymbolicLink(), "queue path must be a non-symlink directory");
  ok((metadata.mode & 0o077) === 0, "queue path must be owner-private");
  return absolute;
}
function writeExclusive(filePath: string, value: unknown): void {
  const descriptor = openSync(filePath, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}
function readJson(filePath: string): unknown { return JSON.parse(readFileSync(filePath, "utf8")); }
function authorityFalse() {
  return {
    provider_selection: false,
    quote_creation: false,
    payment_authorization: false,
    payment_execution: false,
    work_execution_authorization: false,
    work_dispatch: false,
    wc_award: false,
    wc_ledger_write: false,
    void_settlement: false,
    wallet_or_signer_access: false,
    signing: false,
    transaction_broadcast: false,
    buy_void_fulfillment: false,
  } as const;
}

export function enqueueReviewQueueItemV1(receiptValue: unknown, queuedAtValue: unknown, queueDirectory: string) {
  const receipt = parseAcceptedIntakeReceiptV1(receiptValue);
  const root = privateDirectory(queueDirectory);
  const items = privateDirectory(path.join(root, "items"));
  const indexes = privateDirectory(path.join(root, "receipt-indexes"));
  const locks = privateDirectory(path.join(root, "locks"));
  const indexPath = path.join(indexes, `${receipt.receipt_id}.json`);
  const lockPath = path.join(locks, `${receipt.receipt_id}.lock`);
  try { mkdirSync(lockPath, { mode: 0o700 }); } catch { fail(`receipt enqueue lock already held: ${receipt.receipt_id}`); }
  try {
    if (existsSync(indexPath)) {
      const index = record(readJson(indexPath), "stored receipt index");
      const itemPath = text(index.queue_item_path, "queue_item_path");
      const item = readJson(itemPath);
      validateReviewQueueItemV1(item, receipt);
      ok(index.marker === RECEIPT_INDEX_MARKER, "stored index marker mismatch");
      ok(index.receipt_id === receipt.receipt_id, "stored index receipt mismatch");
      ok(index.queue_item_id === (item as ReviewQueueItemV1).queue_item_id, "stored index item mismatch");
      ok(index.submission_id === receipt.submission_id, "stored index submission mismatch");
      ok(index.work_order_id === receipt.work_order_id, "stored index work-order mismatch");
      ok(index.request_payload_sha256 === receipt.request_payload_sha256, "stored index payload mismatch");
      ok(index.canonical_request_sha256 === receipt.canonical_request_sha256, "stored index canonical hash mismatch");
      return { marker: HANDOFF_MARKER, version: 1, ok: true, duplicate: true, recovered_orphan_item: false, queue_item: item, queue_item_path: itemPath, receipt_index_path: indexPath, authority: authorityFalse() };
    }
    let item = materializeReviewQueueItemV1(receipt, queuedAtValue);
    const itemPath = path.join(items, `${item.queue_item_id}.json`);
    let recovered = false;
    if (existsSync(itemPath)) {
      const existing = readJson(itemPath);
      validateReviewQueueItemV1(existing, receipt);
      item = existing;
      recovered = true;
    } else {
      writeExclusive(itemPath, item);
    }
    const index = {
      marker: RECEIPT_INDEX_MARKER,
      version: 1,
      receipt_id: receipt.receipt_id,
      queue_item_id: item.queue_item_id,
      queue_item_path: itemPath,
      submission_id: receipt.submission_id,
      work_order_id: receipt.work_order_id,
      request_payload_sha256: receipt.request_payload_sha256,
      canonical_request_sha256: receipt.canonical_request_sha256,
    };
    writeExclusive(indexPath, index);
    return { marker: HANDOFF_MARKER, version: 1, ok: true, duplicate: false, recovered_orphan_item: recovered, queue_item: item, queue_item_path: itemPath, receipt_index_path: indexPath, authority: authorityFalse() };
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts materialize <receipt.json> <queued-at-utc> <item.json>",
    "  tsx scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts verify <receipt.json> <item.json>",
    "  tsx scripts/authenticated_paid_work_submission_review_queue_handoff_v1.ts enqueue <receipt.json> <queued-at-utc> <queue-dir> <response.json>",
  ].join("\n"));
}
function main(): void {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "materialize" && args.length === 3) {
    const item = materializeReviewQueueItemV1(readJson(args[0]), args[1]);
    writeExclusive(resolve(args[2]), item);
    console.log(`queue_item_id=${item.queue_item_id}`);
    console.log("queue_mutation=false");
    console.log("VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_HANDOFF_V1_MATERIALIZED");
    return;
  }
  if (mode === "verify" && args.length === 2) {
    validateReviewQueueItemV1(readJson(args[1]), readJson(args[0]));
    console.log("queue_item_verified=true");
    console.log("VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_HANDOFF_V1_VERIFIED");
    return;
  }
  if (mode === "enqueue" && args.length === 4) {
    const result = enqueueReviewQueueItemV1(readJson(args[0]), args[1], args[2]);
    writeExclusive(resolve(args[3]), result);
    console.log(`queue_item_id=${result.queue_item.queue_item_id}`);
    console.log(`duplicate=${result.duplicate}`);
    console.log(`recovered_orphan_item=${result.recovered_orphan_item}`);
    console.log(`queue_item_path=${result.queue_item_path}`);
    console.log(`receipt_index_path=${result.receipt_index_path}`);
    console.log("provider_selection=false");
    console.log("quote_creation=false");
    console.log("payment_execution=false");
    console.log("paid_work_execution=false");
    console.log("wc_ledger_write=false");
    console.log("void_settlement=false");
    console.log("VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_HANDOFF_V1_ENQUEUED");
    return;
  }
  usage();
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
