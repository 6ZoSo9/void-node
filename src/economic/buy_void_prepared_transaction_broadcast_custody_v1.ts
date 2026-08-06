import crypto from "node:crypto";
import type {
  BuyVoidPreparedTransactionCustodyPublicProjectionV1,
} from "./buy_void_prepared_transaction_custody_v1.js";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CUSTODY_V1 =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CUSTODY_V1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1 =
  "buyVoidSubmitPreparedTransactionFromOpaqueCustodyV1";

export const VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CUSTODY_AUTHORITY_V1 = {
  source_only_contract: true,
  opaque_custody_lookup_only: true,
  custody_handle_input: false,
  custody_handle_output: false,
  signed_payload_bytes_input: false,
  signed_payload_bytes_persistence: false,
  signed_payload_bytes_output: false,
  submit_once_required: true,
  inspect_only_reconciliation_required: true,
  exact_broadcast_intent_binding_required: true,
  exact_prepared_transaction_hash_required: true,
  provider_submission_id_bounded: true,
  automatic_resubmission: false,
  application_private_material_access: false,
  application_wallet_access: false,
  application_signing: false,
  external_transaction_submission_when_applied: true,
  external_receipt_observation_possible: true,
  filesystem_read: false,
  filesystem_write: false,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  money_movement_when_applied: true,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const BROADCAST_INTENT_ID = /^voidbvbci1_[0-9a-f]{64}$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{0,200}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const MAX_RESULT_DEPTH = 16;

const FORBIDDEN_RESULT_KEYS = new Set([
  ["private", "key"].join(""),
  ["seed", "phrase"].join(""),
  ["raw", "transaction"].join(""),
  ["raw", "signed", "transaction"].join(""),
  ["signed", "transaction"].join(""),
  ["signed", "payload"].join(""),
  ["custody", "handle"].join(""),
  "mnemonic",
  "keystore",
  "secret",
  "password",
]);

export type BuyVoidPreparedTransactionBroadcastRequestV1 = {
  submission_idempotency_key_sha256: string;
  saga_id: string;
  attempt_id: string;
  broadcast_intent_id: string;
  custody_idempotency_key_sha256: string;
  custody_handle_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  signed_transaction_hash: string;
};

export type BuyVoidPreparedTransactionBroadcastReceiptV1 = {
  chain_id: "2050";
  transaction_hash: string;
  transaction_status: 0 | 1;
  block_number: string;
  block_hash: string;
  current_block_number: string;
  confirmation_count: string;
  from_address: string;
  to_address: string;
  amount_units: string;
};

export type BuyVoidPreparedTransactionBroadcasterReadyV1 =
  | {
      ok: true;
      status: "not_submitted";
      transaction_hash: string;
      provider_submission_id: string;
      definitive_not_submitted: true;
      submission_call_performed: false;
      submission_may_have_occurred: false;
      receipt: null;
    }
  | {
      ok: true;
      status: "unknown";
      transaction_hash: string;
      provider_submission_id: string;
      definitive_not_submitted: false;
      submission_call_performed: true;
      submission_may_have_occurred: true;
      receipt: null;
    }
  | {
      ok: true;
      status: "accepted";
      transaction_hash: string;
      provider_submission_id: string;
      definitive_not_submitted: false;
      submission_call_performed: true;
      submission_may_have_occurred: true;
      receipt: null;
    }
  | {
      ok: true;
      status: "confirmed" | "reverted";
      transaction_hash: string;
      provider_submission_id: string;
      definitive_not_submitted: false;
      submission_call_performed: true;
      submission_may_have_occurred: true;
      receipt: BuyVoidPreparedTransactionBroadcastReceiptV1;
    };

export type BuyVoidPreparedTransactionBroadcasterHeldV1 = {
  ok: false;
  status: "held";
  reason: string;
  transaction_hash?: never;
  provider_submission_id?: never;
  definitive_not_submitted?: never;
  submission_call_performed?: never;
  submission_may_have_occurred?: never;
  receipt?: never;
};

export type BuyVoidPreparedTransactionBroadcasterDecisionV1 =
  | BuyVoidPreparedTransactionBroadcasterReadyV1
  | BuyVoidPreparedTransactionBroadcasterHeldV1;

export type BuyVoidPreparedTransactionBroadcasterV1 = {
  submit_once: (
    request: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
  ) => Promise<BuyVoidPreparedTransactionBroadcasterDecisionV1>;
  inspect_submission: (
    request: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
  ) => Promise<BuyVoidPreparedTransactionBroadcasterDecisionV1>;
};

export type BuyVoidPreparedTransactionBroadcastCustodyDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      submission_idempotency_key_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1;
      outcome: null;
      broadcaster_called: false;
      submission_call_performed: false;
      transaction_broadcast_performed: false;
      reconciliation_required: false;
      automatic_retry_allowed: false;
      signed_payload_bytes_persisted: false;
      signed_payload_bytes_returned: false;
      money_movement_performed: false;
    }
  | {
      ok: true;
      status:
        | "not_submitted"
        | "unknown"
        | "accepted"
        | "confirmed"
        | "reverted";
      applied: boolean;
      mutation_performed: boolean;
      submission_idempotency_key_sha256: string;
      outcome: BuyVoidPreparedTransactionBroadcasterReadyV1;
      broadcaster_called: true;
      submission_call_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      signed_payload_bytes_persisted: false;
      signed_payload_bytes_returned: false;
      money_movement_performed: boolean;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: false;
      submission_idempotency_key_sha256: string | null;
      reason: string;
      detail?: Record<string, unknown>;
      outcome?: never;
      broadcaster_called: boolean;
      submission_call_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      signed_payload_bytes_persisted: false;
      signed_payload_bytes_returned: false;
      money_movement_performed: boolean;
    };

export type SubmitBuyVoidPreparedTransactionFromCustodyInputV1 = {
  saga_id: string;
  broadcast_intent_id: string;
  custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
  broadcaster?: BuyVoidPreparedTransactionBroadcasterV1;
  apply?: boolean;
  confirmation?: unknown;
};

export type InspectBuyVoidPreparedTransactionSubmissionInputV1 = {
  saga_id: string;
  broadcast_intent_id: string;
  custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
  broadcaster?: BuyVoidPreparedTransactionBroadcasterV1;
};

type NormalizedV1 = {
  request: BuyVoidPreparedTransactionBroadcastRequestV1;
  custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
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

function providerId(value: unknown): string {
  const id = text(value).slice(0, 200);
  return SAFE_PROVIDER_ID.test(id) ? id : "";
}

function forbiddenResultKey(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object") return null;
  if (depth > MAX_RESULT_DEPTH) return "__broadcast_result_depth_exceeded__";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = forbiddenResultKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (FORBIDDEN_RESULT_KEYS.has(normalized)) return key;
    const found = forbiddenResultKey(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function held(
  applied: boolean,
  reason: string,
  options: {
    submission_idempotency_key_sha256?: string | null;
    broadcaster_called?: boolean;
    submission_call_performed?: boolean;
    transaction_broadcast_performed?: boolean;
    reconciliation_required?: boolean;
    money_movement_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<BuyVoidPreparedTransactionBroadcastCustodyDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: false,
    submission_idempotency_key_sha256:
      options.submission_idempotency_key_sha256 ?? null,
    reason,
    ...(options.detail ? { detail: options.detail } : {}),
    broadcaster_called: options.broadcaster_called === true,
    submission_call_performed:
      options.submission_call_performed === true,
    transaction_broadcast_performed:
      options.transaction_broadcast_performed === true,
    reconciliation_required:
      options.reconciliation_required === true,
    automatic_retry_allowed: false,
    signed_payload_bytes_persisted: false,
    signed_payload_bytes_returned: false,
    money_movement_performed:
      options.money_movement_performed === true,
  };
}

function normalize(input: {
  saga_id: string;
  broadcast_intent_id: string;
  custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
}): NormalizedV1 | Extract<BuyVoidPreparedTransactionBroadcastCustodyDecisionV1, { ok: false }> {
  const sagaId = text(input?.saga_id).toLowerCase();
  const intentId = text(input?.broadcast_intent_id).toLowerCase();
  const custody = input?.custody;
  if (!SAGA_ID.test(sagaId)) {
    return held(false, "broadcast_custody_saga_id_invalid");
  }
  if (!BROADCAST_INTENT_ID.test(intentId)) {
    return held(false, "broadcast_custody_intent_id_invalid");
  }
  if (
    !custody ||
    custody.schema !== "void_buy_void_prepared_transaction_custody_record_v1" ||
    custody.marker !== "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_V1" ||
    custody.version !== 1 ||
    custody.custody_status !== "prepared" ||
    custody.custody_handle_private !== true ||
    Object.prototype.hasOwnProperty.call(custody, "custody_handle") ||
    custody.saga_id !== sagaId ||
    !SHA256.test(text(custody.attempt_id)) ||
    !SHA256.test(text(custody.idempotency_key_sha256)) ||
    !SHA256.test(text(custody.custody_handle_fingerprint_sha256)) ||
    !SHA256.test(text(custody.transaction_plan_fingerprint_sha256)) ||
    !normalizeHash(custody.signed_transaction_hash)
  ) {
    return held(false, "broadcast_custody_projection_invalid");
  }

  const signedHash = normalizeHash(custody.signed_transaction_hash);
  const attemptId = text(custody.attempt_id).toLowerCase();
  const submissionKey = sha256([
    "void-buy-prepared-transaction-broadcast-custody-v1",
    sagaId,
    attemptId,
    intentId,
    custody.idempotency_key_sha256,
    signedHash,
  ].join("\n"));

  return {
    custody,
    request: {
      submission_idempotency_key_sha256: submissionKey,
      saga_id: sagaId,
      attempt_id: attemptId,
      broadcast_intent_id: intentId,
      custody_idempotency_key_sha256:
        text(custody.idempotency_key_sha256).toLowerCase(),
      custody_handle_fingerprint_sha256:
        text(custody.custody_handle_fingerprint_sha256).toLowerCase(),
      transaction_plan_fingerprint_sha256:
        text(custody.transaction_plan_fingerprint_sha256).toLowerCase(),
      signed_transaction_hash: signedHash,
    },
  };
}

function validateReceipt(
  receipt: unknown,
  normalized: NormalizedV1,
  expectedStatus: 0 | 1,
): BuyVoidPreparedTransactionBroadcastReceiptV1 {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new Error("broadcast_receipt_object_required");
  }
  const value = receipt as Record<string, unknown>;
  const chainId = text(value.chain_id);
  const transactionHash = normalizeHash(value.transaction_hash);
  const status = Number(value.transaction_status);
  const blockNumber = decimal(value.block_number, true);
  const blockHash = normalizeHash(value.block_hash);
  const currentBlock = decimal(value.current_block_number, true);
  const confirmationCount = decimal(value.confirmation_count, true);
  const fromAddress = normalizeAddress(value.from_address);
  const toAddress = normalizeAddress(value.to_address);
  const amountUnits = decimal(value.amount_units, true);
  if (
    chainId !== "2050" ||
    transactionHash !== normalized.request.signed_transaction_hash ||
    status !== expectedStatus ||
    !blockNumber ||
    !blockHash ||
    !currentBlock ||
    !confirmationCount ||
    !fromAddress ||
    !toAddress ||
    !amountUnits
  ) {
    throw new Error("broadcast_receipt_binding_invalid");
  }
  const observed = BigInt(currentBlock) - BigInt(blockNumber) + 1n;
  if (observed <= 0n || observed.toString() !== confirmationCount) {
    throw new Error("broadcast_receipt_confirmation_count_invalid");
  }
  return {
    chain_id: "2050",
    transaction_hash: transactionHash,
    transaction_status: expectedStatus,
    block_number: blockNumber,
    block_hash: blockHash,
    current_block_number: currentBlock,
    confirmation_count: confirmationCount,
    from_address: fromAddress,
    to_address: toAddress,
    amount_units: amountUnits,
  };
}

function validateBroadcasterDecision(
  decision: BuyVoidPreparedTransactionBroadcasterDecisionV1,
  normalized: NormalizedV1,
): BuyVoidPreparedTransactionBroadcasterReadyV1 {
  const forbidden = forbiddenResultKey(decision);
  if (forbidden) {
    throw new Error(`broadcast_result_forbidden_key:${forbidden}`);
  }
  if ("reason" in decision) {
    throw new Error(`prepared_broadcaster_held:${text(decision.reason) || "unknown"}`);
  }
  const transactionHash = normalizeHash(decision.transaction_hash);
  const providerSubmissionId = providerId(decision.provider_submission_id);
  if (
    transactionHash !== normalized.request.signed_transaction_hash ||
    text(decision.provider_submission_id) !== providerSubmissionId
  ) {
    throw new Error("broadcast_result_identity_invalid");
  }
  if (decision.status === "not_submitted") {
    if (
      decision.definitive_not_submitted !== true ||
      decision.submission_call_performed !== false ||
      decision.submission_may_have_occurred !== false ||
      decision.receipt !== null
    ) {
      throw new Error("broadcast_not_submitted_contract_invalid");
    }
    return {
      ...decision,
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
    };
  }
  if (decision.status === "unknown") {
    if (
      decision.definitive_not_submitted !== false ||
      decision.submission_call_performed !== true ||
      decision.submission_may_have_occurred !== true ||
      decision.receipt !== null
    ) {
      throw new Error("broadcast_unknown_contract_invalid");
    }
    return {
      ...decision,
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
    };
  }
  if (decision.status === "accepted") {
    if (
      decision.definitive_not_submitted !== false ||
      decision.submission_call_performed !== true ||
      decision.submission_may_have_occurred !== true ||
      decision.receipt !== null
    ) {
      throw new Error("broadcast_accepted_contract_invalid");
    }
    return {
      ...decision,
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
    };
  }
  if (decision.status === "confirmed" || decision.status === "reverted") {
    if (
      decision.definitive_not_submitted !== false ||
      decision.submission_call_performed !== true ||
      decision.submission_may_have_occurred !== true
    ) {
      throw new Error("broadcast_receipt_contract_invalid");
    }
    const receipt = validateReceipt(
      decision.receipt,
      normalized,
      decision.status === "confirmed" ? 1 : 0,
    );
    return {
      ...decision,
      transaction_hash: transactionHash,
      provider_submission_id: providerSubmissionId,
      receipt,
    };
  }
  throw new Error("broadcast_result_status_invalid");
}

function ready(
  normalized: NormalizedV1,
  outcome: BuyVoidPreparedTransactionBroadcasterReadyV1,
  applied: boolean,
): Extract<BuyVoidPreparedTransactionBroadcastCustodyDecisionV1, { ok: true; outcome: BuyVoidPreparedTransactionBroadcasterReadyV1 }> {
  const submissionPerformed = outcome.submission_call_performed === true;
  return {
    ok: true,
    status: outcome.status,
    applied,
    mutation_performed: applied && submissionPerformed,
    submission_idempotency_key_sha256:
      normalized.request.submission_idempotency_key_sha256,
    outcome,
    broadcaster_called: true,
    submission_call_performed: submissionPerformed,
    transaction_broadcast_performed: submissionPerformed,
    reconciliation_required:
      ["unknown", "accepted"].includes(outcome.status),
    automatic_retry_allowed: false,
    signed_payload_bytes_persisted: false,
    signed_payload_bytes_returned: false,
    money_movement_performed: submissionPerformed,
  };
}

export async function submitBuyVoidPreparedTransactionFromCustodyV1(
  input: SubmitBuyVoidPreparedTransactionFromCustodyInputV1,
): Promise<BuyVoidPreparedTransactionBroadcastCustodyDecisionV1> {
  const normalized = normalize(input);
  if ("reason" in normalized) {
    return { ...normalized, applied: input?.apply === true };
  }
  const submissionKey =
    normalized.request.submission_idempotency_key_sha256;
  if (input?.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      submission_idempotency_key_sha256: submissionKey,
      required_confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
      outcome: null,
      broadcaster_called: false,
      submission_call_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      signed_payload_bytes_persisted: false,
      signed_payload_bytes_returned: false,
      money_movement_performed: false,
    };
  }
  if (
    text(input?.confirmation) !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1
  ) {
    return held(true, "prepared_broadcast_confirmation_required", {
      submission_idempotency_key_sha256: submissionKey,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
      },
    });
  }
  const broadcaster = input?.broadcaster;
  if (
    !broadcaster ||
    typeof broadcaster.submit_once !== "function" ||
    typeof broadcaster.inspect_submission !== "function"
  ) {
    return held(true, "prepared_broadcaster_dependency_required", {
      submission_idempotency_key_sha256: submissionKey,
    });
  }
  try {
    const outcome = validateBroadcasterDecision(
      await broadcaster.submit_once(normalized.request),
      normalized,
    );
    return ready(normalized, outcome, true);
  } catch (error) {
    return held(true, "prepared_broadcast_submit_failed", {
      submission_idempotency_key_sha256: submissionKey,
      broadcaster_called: true,
      submission_call_performed: true,
      transaction_broadcast_performed: true,
      reconciliation_required: true,
      money_movement_performed: true,
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }
}

export async function inspectBuyVoidPreparedTransactionSubmissionV1(
  input: InspectBuyVoidPreparedTransactionSubmissionInputV1,
): Promise<BuyVoidPreparedTransactionBroadcastCustodyDecisionV1> {
  const normalized = normalize(input);
  if ("reason" in normalized) return normalized;
  const submissionKey =
    normalized.request.submission_idempotency_key_sha256;
  const broadcaster = input?.broadcaster;
  if (
    !broadcaster ||
    typeof broadcaster.submit_once !== "function" ||
    typeof broadcaster.inspect_submission !== "function"
  ) {
    return held(false, "prepared_broadcaster_dependency_required", {
      submission_idempotency_key_sha256: submissionKey,
    });
  }
  try {
    const outcome = validateBroadcasterDecision(
      await broadcaster.inspect_submission(normalized.request),
      normalized,
    );
    return ready(normalized, outcome, false);
  } catch (error) {
    return held(false, "prepared_broadcast_inspection_failed", {
      submission_idempotency_key_sha256: submissionKey,
      broadcaster_called: true,
      reconciliation_required: true,
      detail: {
        message: text((error as Error)?.message || error).slice(0, 240),
      },
    });
  }
}
