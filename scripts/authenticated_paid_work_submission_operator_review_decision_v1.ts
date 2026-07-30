import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path, { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const OPERATOR_REVIEW_DECISION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1" as const;
export const OPERATOR_REVIEW_INDEX_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_INDEX_V1" as const;
export const OPERATOR_REVIEW_RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_RESULT_V1" as const;

const QUEUE_ITEM_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_ITEM_V1";
const RECEIPT_INDEX_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_REVIEW_QUEUE_RECEIPT_INDEX_V1";

const SHA256 = /^[0-9a-f]{64}$/;
const QUEUE_ID = /^voidapwsrq1_[0-9a-f]{64}$/;
const DECISION_ID = /^voidapwod1_[0-9a-f]{64}$/;
const RECEIPT_ID = /^voidawsi1_[0-9a-f]{64}$/;
const WORK_ORDER_ID = /^voidawo1_[0-9a-f]{64}$/;
const MACHINE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const REASON_CODE = /^[a-z][a-z0-9_]{2,63}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

type JsonScalar = null | boolean | number | string;
type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

export type ReviewOutcome =
  | "approved_for_provider_selection"
  | "rejected_by_operator";

type QueueItem = {
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
  next_action:
    "operator_review_before_provider_selection_or_quote_creation";
};

type ReceiptIndex = {
  marker: typeof RECEIPT_INDEX_MARKER;
  version: 1;
  receipt_id: string;
  queue_item_id: string;
  queue_item_path: string;
  submission_id: string;
  work_order_id: string;
  request_payload_sha256: string;
  canonical_request_sha256: string;
};

export type OperatorReviewDecisionV1 = {
  marker: typeof OPERATOR_REVIEW_DECISION_MARKER;
  version: 1;
  review_decision_id: string;
  reviewed_at_utc: string;
  reviewer: {
    operator_id: string;
    authority_source: "explicit_local_operator_confirmation";
  };
  queue_item: {
    queue_item_id: string;
    receipt_id: string;
    submission_id: string;
    work_order_id: string;
    request_payload_sha256: string;
    canonical_request_sha256: string;
    capability_id: string;
    quote_asset: string;
    max_total: string;
  };
  outcome: ReviewOutcome;
  reason_codes: string[];
  provider_selection_eligible: boolean;
  status:
    | "approved_pending_provider_selection"
    | "rejected_terminal";
  next_action:
    | "provider_selection_may_be_attempted_but_not_performed"
    | "no_further_action_without_new_operator_review_contract";
  authority: {
    provider_selected: false;
    provider_selection_executed: false;
    quote_creation_granted: false;
    quote_created: false;
    requester_acceptance_granted: false;
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
};

export type OperatorReviewIndexV1 = {
  marker: typeof OPERATOR_REVIEW_INDEX_MARKER;
  version: 1;
  queue_item_id: string;
  review_decision_id: string;
  review_decision_path: string;
  receipt_id: string;
  submission_id: string;
  work_order_id: string;
  outcome: ReviewOutcome;
};

export type OperatorReviewResultV1 = {
  marker: typeof OPERATOR_REVIEW_RESULT_MARKER;
  version: 1;
  ok: true;
  duplicate: boolean;
  recovered_orphan_decision: boolean;
  decision: OperatorReviewDecisionV1;
  decision_path: string;
  index_path: string;
  authority: {
    provider_selected: false;
    quote_created: false;
    payment_executed: false;
    work_executed: false;
    work_dispatched: false;
    wc_ledger_written: false;
    void_settled: false;
  };
};

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern?: RegExp,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value.length > 0, `${label} must not be empty`);
  if (pattern) {
    assertCondition(pattern.test(value), `${label} format mismatch`);
  }
  return value;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, UTC);
  assertCondition(Number.isFinite(Date.parse(text)), `${label} is invalid UTC`);
  return text;
}

function requireSha(value: unknown, label: string): string {
  return requireString(value, label, SHA256);
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
): number {
  assertCondition(
    typeof value === "number" && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(value >= minimum, `${label} is below minimum`);
  return value;
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, JsonValue>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value as JsonValue));
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

function assertAllFalse(value: unknown, label: string): void {
  assertCondition(isRecord(value), `${label} must be an object`);
  for (const [key, candidate] of Object.entries(value)) {
    assertCondition(candidate === false, `${label}.${key} must be false`);
  }
}

function parseReasonCodes(value: unknown): string[] {
  assertCondition(Array.isArray(value), "reason_codes must be an array");
  assertCondition(
    value.length >= 1 && value.length <= 8,
    "reason_codes length must be 1..8",
  );
  const parsed = value.map((item, index) =>
    requireString(item, `reason_codes[${index}]`, REASON_CODE),
  );
  assertCondition(
    new Set(parsed).size === parsed.length,
    "reason_codes must be unique",
  );
  return [...parsed].sort();
}

export function parseQueueItemV1(value: unknown): QueueItem {
  assertCondition(isRecord(value), "queue item must be an object");
  assertCondition(value.marker === QUEUE_ITEM_MARKER, "queue marker mismatch");
  assertCondition(value.version === 1, "queue version mismatch");
  const queueItemId = requireString(
    value.queue_item_id,
    "queue_item_id",
    QUEUE_ID,
  );
  assertCondition(
    value.status === "received_pending_operator_review",
    "queue item is not pending operator review",
  );
  const queuedAt = requireUtc(value.queued_at_utc, "queued_at_utc");

  assertCondition(isRecord(value.receipt), "queue receipt binding missing");
  const receipt = value.receipt;
  const receiptId = requireString(receipt.receipt_id, "receipt_id", RECEIPT_ID);
  const submissionId = requireString(
    receipt.submission_id,
    "submission_id",
    MACHINE_ID,
  );
  const workOrderId = requireString(
    receipt.work_order_id,
    "work_order_id",
    WORK_ORDER_ID,
  );

  assertCondition(
    isRecord(value.authentication),
    "queue authentication binding missing",
  );
  const authentication = value.authentication;
  assertCondition(
    authentication.mode === "credential_registry",
    "queue authentication mode mismatch",
  );
  assertCondition(
    authentication.scope === "agent_paid_work_submit",
    "queue authentication scope mismatch",
  );
  assertCondition(
    authentication.authorization_verified === true,
    "queue authorization is not verified",
  );

  assertCondition(isRecord(value.admission), "queue admission binding missing");
  const admission = value.admission;
  assertCondition(
    admission.decision === "accepted_for_review",
    "queue admission is not accepted_for_review",
  );
  assertCondition(
    Array.isArray(admission.reason_codes) &&
      admission.reason_codes.length === 0,
    "queue admission reason_codes must be empty",
  );

  assertCondition(
    isRecord(value.review_boundary),
    "queue review boundary missing",
  );
  const boundary = value.review_boundary;
  assertCondition(
    boundary.operator_review_required === true,
    "operator review is not required",
  );
  for (const [key, candidate] of Object.entries(boundary)) {
    if (key === "operator_review_required") continue;
    assertCondition(candidate === false, `queue boundary ${key} must be false`);
  }

  assertCondition(
    value.next_action ===
      "operator_review_before_provider_selection_or_quote_creation",
    "queue next_action mismatch",
  );

  return {
    marker: QUEUE_ITEM_MARKER,
    version: 1,
    queue_item_id: queueItemId,
    status: "received_pending_operator_review",
    queued_at_utc: queuedAt,
    receipt: {
      receipt_id: receiptId,
      submission_id: submissionId,
      work_order_id: workOrderId,
      request_payload_sha256: requireSha(
        receipt.request_payload_sha256,
        "request_payload_sha256",
      ),
      canonical_request_sha256: requireSha(
        receipt.canonical_request_sha256,
        "canonical_request_sha256",
      ),
      admission_id: requireString(
        receipt.admission_id,
        "admission_id",
      ),
      received_at_utc: requireUtc(
        receipt.received_at_utc,
        "received_at_utc",
      ),
    },
    authentication: {
      mode: "credential_registry",
      registry_id: requireString(
        authentication.registry_id,
        "registry_id",
      ),
      credential_id: requireString(
        authentication.credential_id,
        "credential_id",
      ),
      agent_id: requireString(
        authentication.agent_id,
        "agent_id",
        MACHINE_ID,
      ),
      scope: "agent_paid_work_submit",
      authorization_verified: true,
    },
    admission: {
      policy_id: requireString(admission.policy_id, "policy_id"),
      decision: "accepted_for_review",
      reason_codes: [],
      capability_id: requireString(
        admission.capability_id,
        "capability_id",
        MACHINE_ID,
      ),
      quote_asset: requireString(
        admission.quote_asset,
        "quote_asset",
        MACHINE_ID,
      ),
      max_total: requireString(admission.max_total, "max_total"),
      max_runtime_seconds: requireInteger(
        admission.max_runtime_seconds,
        "max_runtime_seconds",
        1,
      ),
      max_output_bytes: requireInteger(
        admission.max_output_bytes,
        "max_output_bytes",
        1,
      ),
      input_ref_count: requireInteger(
        admission.input_ref_count,
        "input_ref_count",
        0,
      ),
      expected_output_count: requireInteger(
        admission.expected_output_count,
        "expected_output_count",
        1,
      ),
      callback_scheme: requireString(
        admission.callback_scheme,
        "callback_scheme",
      ),
      callback_host: requireString(
        admission.callback_host,
        "callback_host",
      ),
      ttl_seconds: requireInteger(
        admission.ttl_seconds,
        "ttl_seconds",
        1,
      ),
    },
    review_boundary: boundary as QueueItem["review_boundary"],
    next_action:
      "operator_review_before_provider_selection_or_quote_creation",
  };
}

export function parseReceiptIndexV1(
  value: unknown,
  queue: QueueItem,
): ReceiptIndex {
  assertCondition(isRecord(value), "receipt index must be an object");
  assertCondition(
    value.marker === RECEIPT_INDEX_MARKER,
    "receipt index marker mismatch",
  );
  assertCondition(value.version === 1, "receipt index version mismatch");
  assertCondition(
    value.receipt_id === queue.receipt.receipt_id,
    "receipt index receipt binding mismatch",
  );
  assertCondition(
    value.queue_item_id === queue.queue_item_id,
    "receipt index queue binding mismatch",
  );
  assertCondition(
    value.submission_id === queue.receipt.submission_id,
    "receipt index submission binding mismatch",
  );
  assertCondition(
    value.work_order_id === queue.receipt.work_order_id,
    "receipt index work-order binding mismatch",
  );
  assertCondition(
    value.request_payload_sha256 ===
      queue.receipt.request_payload_sha256,
    "receipt index payload binding mismatch",
  );
  assertCondition(
    value.canonical_request_sha256 ===
      queue.receipt.canonical_request_sha256,
    "receipt index canonical binding mismatch",
  );

  return {
    marker: RECEIPT_INDEX_MARKER,
    version: 1,
    receipt_id: queue.receipt.receipt_id,
    queue_item_id: queue.queue_item_id,
    queue_item_path: requireString(
      value.queue_item_path,
      "queue_item_path",
    ),
    submission_id: queue.receipt.submission_id,
    work_order_id: queue.receipt.work_order_id,
    request_payload_sha256: queue.receipt.request_payload_sha256,
    canonical_request_sha256: queue.receipt.canonical_request_sha256,
  };
}

function stableDecisionId(queue: QueueItem): string {
  return `voidapwod1_${digest({
    queue_item_id: queue.queue_item_id,
    receipt_id: queue.receipt.receipt_id,
    submission_id: queue.receipt.submission_id,
    work_order_id: queue.receipt.work_order_id,
    request_payload_sha256: queue.receipt.request_payload_sha256,
    canonical_request_sha256: queue.receipt.canonical_request_sha256,
  })}`;
}

export function materializeOperatorReviewDecisionV1(
  queueValue: unknown,
  receiptIndexValue: unknown,
  reviewedAtValue: unknown,
  operatorIdValue: unknown,
  outcomeValue: unknown,
  reasonCodesValue: unknown,
): OperatorReviewDecisionV1 {
  const queue = parseQueueItemV1(queueValue);
  parseReceiptIndexV1(receiptIndexValue, queue);
  const reviewedAt = requireUtc(reviewedAtValue, "reviewed_at_utc");
  const operatorId = requireString(
    operatorIdValue,
    "operator_id",
    MACHINE_ID,
  );
  assertCondition(
    outcomeValue === "approved_for_provider_selection" ||
      outcomeValue === "rejected_by_operator",
    "outcome mismatch",
  );
  const outcome = outcomeValue as ReviewOutcome;
  const reasonCodes = parseReasonCodes(reasonCodesValue);
  const approved = outcome === "approved_for_provider_selection";

  return {
    marker: OPERATOR_REVIEW_DECISION_MARKER,
    version: 1,
    review_decision_id: stableDecisionId(queue),
    reviewed_at_utc: reviewedAt,
    reviewer: {
      operator_id: operatorId,
      authority_source: "explicit_local_operator_confirmation",
    },
    queue_item: {
      queue_item_id: queue.queue_item_id,
      receipt_id: queue.receipt.receipt_id,
      submission_id: queue.receipt.submission_id,
      work_order_id: queue.receipt.work_order_id,
      request_payload_sha256: queue.receipt.request_payload_sha256,
      canonical_request_sha256: queue.receipt.canonical_request_sha256,
      capability_id: queue.admission.capability_id,
      quote_asset: queue.admission.quote_asset,
      max_total: queue.admission.max_total,
    },
    outcome,
    reason_codes: reasonCodes,
    provider_selection_eligible: approved,
    status: approved
      ? "approved_pending_provider_selection"
      : "rejected_terminal",
    next_action: approved
      ? "provider_selection_may_be_attempted_but_not_performed"
      : "no_further_action_without_new_operator_review_contract",
    authority: {
      provider_selected: false,
      provider_selection_executed: false,
      quote_creation_granted: false,
      quote_created: false,
      requester_acceptance_granted: false,
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
  };
}

export function validateOperatorReviewDecisionV1(
  value: unknown,
  queueValue: unknown,
  receiptIndexValue: unknown,
): asserts value is OperatorReviewDecisionV1 {
  assertCondition(isRecord(value), "review decision must be an object");
  const expected = materializeOperatorReviewDecisionV1(
    queueValue,
    receiptIndexValue,
    value.reviewed_at_utc,
    isRecord(value.reviewer) ? value.reviewer.operator_id : undefined,
    value.outcome,
    value.reason_codes,
  );
  assertCondition(
    canonicalJson(value) === canonicalJson(expected),
    "review decision does not match deterministic materialization",
  );
  requireString(
    value.review_decision_id,
    "review_decision_id",
    DECISION_ID,
  );
  assertAllFalse(value.authority, "review decision authority");
}

function sameSemanticRequest(
  decision: OperatorReviewDecisionV1,
  operatorId: string,
  outcome: ReviewOutcome,
  reasonCodes: string[],
): boolean {
  return (
    decision.reviewer.operator_id === operatorId &&
    decision.outcome === outcome &&
    canonicalJson(decision.reason_codes) === canonicalJson(reasonCodes)
  );
}

function privateDirectory(directory: string): string {
  const absolute = resolve(directory);
  mkdirSync(absolute, { recursive: true, mode: 0o700 });
  const metadata = lstatSync(absolute);
  assertCondition(metadata.isDirectory(), "decision directory is not a directory");
  assertCondition(!metadata.isSymbolicLink(), "decision directory is a symlink");
  assertCondition(
    (metadata.mode & 0o077) === 0,
    "decision directory is not owner-private",
  );
  return absolute;
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function writeExclusiveJson(filePath: string, value: unknown): void {
  const descriptor = openSync(filePath, "wx", 0o600);
  try {
    writeFileSync(
      descriptor,
      `${JSON.stringify(value, null, 2)}\n`,
      { encoding: "utf8" },
    );
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function falseAuthority(): OperatorReviewResultV1["authority"] {
  return {
    provider_selected: false,
    quote_created: false,
    payment_executed: false,
    work_executed: false,
    work_dispatched: false,
    wc_ledger_written: false,
    void_settled: false,
  };
}

function expectedIndex(
  decision: OperatorReviewDecisionV1,
  decisionPath: string,
): OperatorReviewIndexV1 {
  return {
    marker: OPERATOR_REVIEW_INDEX_MARKER,
    version: 1,
    queue_item_id: decision.queue_item.queue_item_id,
    review_decision_id: decision.review_decision_id,
    review_decision_path: decisionPath,
    receipt_id: decision.queue_item.receipt_id,
    submission_id: decision.queue_item.submission_id,
    work_order_id: decision.queue_item.work_order_id,
    outcome: decision.outcome,
  };
}

export function decideOperatorReviewV1(
  queueValue: unknown,
  receiptIndexValue: unknown,
  reviewedAtValue: unknown,
  operatorIdValue: unknown,
  outcomeValue: unknown,
  reasonCodesValue: unknown,
  decisionDirectory: string,
): OperatorReviewResultV1 {
  const queue = parseQueueItemV1(queueValue);
  parseReceiptIndexV1(receiptIndexValue, queue);
  const operatorId = requireString(
    operatorIdValue,
    "operator_id",
    MACHINE_ID,
  );
  assertCondition(
    outcomeValue === "approved_for_provider_selection" ||
      outcomeValue === "rejected_by_operator",
    "outcome mismatch",
  );
  const outcome = outcomeValue as ReviewOutcome;
  const reasonCodes = parseReasonCodes(reasonCodesValue);

  const root = privateDirectory(decisionDirectory);
  const decisions = privateDirectory(path.join(root, "decisions"));
  const indexes = privateDirectory(path.join(root, "queue-item-indexes"));
  const locks = privateDirectory(path.join(root, "locks"));

  const decisionId = stableDecisionId(queue);
  const decisionPath = path.join(decisions, `${decisionId}.json`);
  const indexPath = path.join(indexes, `${queue.queue_item_id}.json`);
  const lockPath = path.join(locks, `${queue.queue_item_id}.lock`);

  try {
    mkdirSync(lockPath, { mode: 0o700 });
  } catch {
    fail(`operator review lock already held: ${queue.queue_item_id}`);
  }

  try {
    if (existsSync(indexPath)) {
      const index = readJson(indexPath);
      assertCondition(isRecord(index), "stored review index invalid");
      const storedPath = requireString(
        index.review_decision_path,
        "stored review_decision_path",
      );
      const stored = readJson(storedPath);
      validateOperatorReviewDecisionV1(
        stored,
        queue,
        receiptIndexValue,
      );
      assertCondition(
        canonicalJson(index) === canonicalJson(expectedIndex(stored, storedPath)),
        "stored review index binding mismatch",
      );
      assertCondition(
        sameSemanticRequest(stored, operatorId, outcome, reasonCodes),
        "conflicting operator review already exists",
      );
      return {
        marker: OPERATOR_REVIEW_RESULT_MARKER,
        version: 1,
        ok: true,
        duplicate: true,
        recovered_orphan_decision: false,
        decision: stored,
        decision_path: storedPath,
        index_path: indexPath,
        authority: falseAuthority(),
      };
    }

    let decision = materializeOperatorReviewDecisionV1(
      queue,
      receiptIndexValue,
      reviewedAtValue,
      operatorId,
      outcome,
      reasonCodes,
    );
    let recovered = false;

    if (existsSync(decisionPath)) {
      const stored = readJson(decisionPath);
      validateOperatorReviewDecisionV1(
        stored,
        queue,
        receiptIndexValue,
      );
      assertCondition(
        sameSemanticRequest(stored, operatorId, outcome, reasonCodes),
        "conflicting orphan operator review exists",
      );
      decision = stored;
      recovered = true;
    } else {
      writeExclusiveJson(decisionPath, decision);
    }

    writeExclusiveJson(indexPath, expectedIndex(decision, decisionPath));

    return {
      marker: OPERATOR_REVIEW_RESULT_MARKER,
      version: 1,
      ok: true,
      duplicate: false,
      recovered_orphan_decision: recovered,
      decision,
      decision_path: decisionPath,
      index_path: indexPath,
      authority: falseAuthority(),
    };
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/authenticated_paid_work_submission_operator_review_decision_v1.ts materialize <queue-item.json> <receipt-index.json> <reviewed-at-utc> <operator-id> <outcome> <reason-codes-json> <decision.json>",
      "  tsx scripts/authenticated_paid_work_submission_operator_review_decision_v1.ts verify <queue-item.json> <receipt-index.json> <decision.json>",
      "  tsx scripts/authenticated_paid_work_submission_operator_review_decision_v1.ts decide <queue-item.json> <receipt-index.json> <reviewed-at-utc> <operator-id> <outcome> <reason-codes-json> <private-decision-root> <response.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, ...args] = process.argv.slice(2);

  if (mode === "materialize") {
    assertCondition(args.length === 7, "materialize requires seven arguments");
    const [
      queuePath,
      receiptIndexPath,
      reviewedAt,
      operatorId,
      outcome,
      reasonsJson,
      outputPath,
    ] = args;
    const decision = materializeOperatorReviewDecisionV1(
      readJson(queuePath),
      readJson(receiptIndexPath),
      reviewedAt,
      operatorId,
      outcome,
      JSON.parse(reasonsJson),
    );
    writeExclusiveJson(resolve(outputPath), decision);
    console.log(`review_decision_id=${decision.review_decision_id}`);
    console.log(`outcome=${decision.outcome}`);
    console.log("decision_store_mutation=false");
    console.log(
      "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(args.length === 3, "verify requires three arguments");
    validateOperatorReviewDecisionV1(
      readJson(args[2]),
      readJson(args[0]),
      readJson(args[1]),
    );
    console.log("operator_review_decision_verified=true");
    console.log(
      "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1_VERIFIED",
    );
    return;
  }

  if (mode === "decide") {
    assertCondition(args.length === 8, "decide requires eight arguments");
    const result = decideOperatorReviewV1(
      readJson(args[0]),
      readJson(args[1]),
      args[2],
      args[3],
      args[4],
      JSON.parse(args[5]),
      args[6],
    );
    writeExclusiveJson(resolve(args[7]), result);
    console.log(`review_decision_id=${result.decision.review_decision_id}`);
    console.log(`outcome=${result.decision.outcome}`);
    console.log(`duplicate=${result.duplicate}`);
    console.log(
      `recovered_orphan_decision=${result.recovered_orphan_decision}`,
    );
    console.log(
      `provider_selection_eligible=${result.decision.provider_selection_eligible}`,
    );
    console.log("provider_selected=false");
    console.log("quote_created=false");
    console.log("payment_executed=false");
    console.log("work_executed=false");
    console.log("wc_ledger_written=false");
    console.log("void_settled=false");
    console.log(
      "VOID_AUTHENTICATED_PAID_WORK_SUBMISSION_OPERATOR_REVIEW_DECISION_V1_DECIDED",
    );
    return;
  }

  usage();
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main();
}
