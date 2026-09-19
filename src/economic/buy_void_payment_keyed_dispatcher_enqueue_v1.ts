import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
  readBuyVoidPaymentKeyedPreparationCustodyPublicV1,
  type BuyVoidPaymentKeyedPreparationCustodyPublicV1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  submitBuyVoidPaymentKeyedDispatchV1,
  type BuyVoidPaymentKeyedDispatcherPublicJobV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
} from "./buy_void_payment_keyed_dispatcher_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_AUTHORITY_V1 = {
  source_only_contract: true,
  durable_preparation_custody_required: true,
  exact_attempt_binding_required: true,
  request_fingerprint_from_custody_only: true,
  caller_request_fingerprint_authority: false,
  dispatcher_submit_only: true,
  dispatcher_claim: false,
  dispatcher_renew: false,
  dispatcher_publish: false,
  lease_capability_issue: false,
  worker_execution: false,
  runtime_route_mount: false,
  production_connection_factory: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedDispatcherEnqueueDependenciesV1 = {
  read_custody?: typeof readBuyVoidPaymentKeyedPreparationCustodyPublicV1;
  submit_dispatch?: typeof submitBuyVoidPaymentKeyedDispatchV1;
};

export type BuyVoidPaymentKeyedDispatcherEnqueueInputV1 = {
  root_dir: string;
  attempt_id: unknown;
  client_id: unknown;
  store: BuyVoidPaymentKeyedDispatcherStoreV1;
  dependencies?: BuyVoidPaymentKeyedDispatcherEnqueueDependenciesV1;
};

export type BuyVoidPaymentKeyedDispatcherEnqueueDecisionV1 =
  | {
      ok: true;
      status: "submitted" | "idempotent";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1;
      attempt_id: string;
      request_fingerprint_sha256: string;
      custody_fingerprint_sha256: string;
      dispatcher_job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
      dispatcher_submission_attempted: true;
      dispatcher_claim_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1;
      attempt_id: string;
      reason:
        | "preparation_custody_missing"
        | "preparation_custody_invalid";
      dispatcher_submission_attempted: false;
      dispatcher_claim_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      detail?: Record<string, string>;
    }
  | {
      ok: false;
      status: "conflict";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1;
      attempt_id: string;
      request_fingerprint_sha256: string;
      custody_fingerprint_sha256: string;
      reason: "dispatcher_request_fingerprint_mismatch";
      dispatcher_job: BuyVoidPaymentKeyedDispatcherPublicJobV1;
      dispatcher_submission_attempted: true;
      dispatcher_claim_performed: false;
      dispatcher_renew_performed: false;
      dispatcher_publish_performed: false;
      signer_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    };

const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function requireAttemptId(value: unknown): string {
  const attemptId = text(value).toLowerCase();
  if (!SHA256.test(attemptId)) {
    throw new Error("payment_keyed_dispatcher_enqueue_attempt_id_invalid");
  }
  return attemptId;
}

function requireRootDir(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("payment_keyed_dispatcher_enqueue_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("payment_keyed_dispatcher_enqueue_root_is_filesystem_root");
  }
  return resolved;
}

function validateCustody(
  custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1,
  attemptId: string,
): BuyVoidPaymentKeyedPreparationCustodyPublicV1 {
  if (
    custody?.marker !== VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1 ||
    custody.version !== 1 ||
    custody.attempt_id !== attemptId ||
    !SHA256.test(String(custody.request_fingerprint_sha256 || "")) ||
    !SHA256.test(String(custody.request_idempotency_key_sha256 || "")) ||
    !SHA256.test(String(custody.custody_fingerprint_sha256 || "")) ||
    !HASH.test(String(custody.signed_transaction_hash || "")) ||
    custody.deterministic_signing_verified !== true ||
    custody.raw_signed_transaction_persisted !== false ||
    custody.raw_signed_transaction_returned !== false ||
    custody.transaction_broadcast_authorized !== false ||
    custody.money_movement_authorized !== false
  ) {
    throw new Error("payment_keyed_dispatcher_enqueue_custody_invalid");
  }
  return custody;
}

function held(
  attemptId: string,
  reason: Extract<
    BuyVoidPaymentKeyedDispatcherEnqueueDecisionV1,
    { status: "held" }
  >["reason"],
  detail?: Record<string, string>,
): Extract<
  BuyVoidPaymentKeyedDispatcherEnqueueDecisionV1,
  { status: "held" }
> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1,
    attempt_id: attemptId,
    reason,
    dispatcher_submission_attempted: false,
    dispatcher_claim_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(detail ? { detail } : {}),
  };
}

export async function enqueueBuyVoidPaymentKeyedPreparedAttemptV1(
  input: BuyVoidPaymentKeyedDispatcherEnqueueInputV1,
): Promise<BuyVoidPaymentKeyedDispatcherEnqueueDecisionV1> {
  const rootDir = requireRootDir(input.root_dir);
  const attemptId = requireAttemptId(input.attempt_id);
  const readCustody =
    input.dependencies?.read_custody ||
    readBuyVoidPaymentKeyedPreparationCustodyPublicV1;
  const submitDispatch =
    input.dependencies?.submit_dispatch ||
    submitBuyVoidPaymentKeyedDispatchV1;

  let custody: BuyVoidPaymentKeyedPreparationCustodyPublicV1 | null;
  try {
    custody = readCustody({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
  } catch (error) {
    return held(attemptId, "preparation_custody_invalid", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }

  if (!custody) {
    return held(attemptId, "preparation_custody_missing");
  }

  try {
    custody = validateCustody(custody, attemptId);
  } catch (error) {
    return held(attemptId, "preparation_custody_invalid", {
      message: text((error as Error)?.message || error).slice(0, 240),
    });
  }

  const dispatch = await submitDispatch({
    attempt_id: custody.attempt_id,
    request_fingerprint_sha256: custody.request_fingerprint_sha256,
    client_id: input.client_id,
    store: input.store,
  });

  if (dispatch.ok === false) {
    return {
      ok: false,
      status: "conflict",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1,
      attempt_id: attemptId,
      request_fingerprint_sha256: custody.request_fingerprint_sha256,
      custody_fingerprint_sha256: custody.custody_fingerprint_sha256,
      reason: "dispatcher_request_fingerprint_mismatch",
      dispatcher_job: dispatch.job,
      dispatcher_submission_attempted: true,
      dispatcher_claim_performed: false,
      dispatcher_renew_performed: false,
      dispatcher_publish_performed: false,
      signer_access_performed: false,
      signing_performed: false;
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };
  }

  return {
    ok: true,
    status: dispatch.status,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1,
    attempt_id: attemptId,
    request_fingerprint_sha256: custody.request_fingerprint_sha256,
    custody_fingerprint_sha256: custody.custody_fingerprint_sha256,
    dispatcher_job: dispatch.job,
    dispatcher_submission_attempted: true,
    dispatcher_claim_performed: false,
    dispatcher_renew_performed: false,
    dispatcher_publish_performed: false,
    signer_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
