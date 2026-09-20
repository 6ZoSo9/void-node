import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  Interface,
  Transaction,
  getAddress,
  keccak256,
} from "ethers";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
  type BuyVoidPaymentKeyedCustodianPrepareRequestV1,
} from "./buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1,
  type BuyVoidPaymentKeyedCustodianSignerReadyV1,
} from "./buy_void_payment_keyed_custodian_signer_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_V1,
} from "./buy_void_payment_keyed_unsigned_transaction_v1.js";
import {
  inspectBuyVoidPaymentKeyedSignedTransactionV1,
} from "./buy_void_payment_keyed_chain2050_broadcaster_v1.js";
import {
  bindBuyVoidSourceFinalityPaymentV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";
import type {
  BuyVoidDeliveryBroadcasterV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import type {
  BuyVoidDeliverySubmissionBindingV1,
  BuyVoidDeliverySubmissionGuardV1,
} from "./buy_void_delivery_submission_guard_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1 =
  "buyVoidBroadcastPaymentKeyedCustodianTransactionV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_AUTHORITY_V1 = {
  disabled_by_default: true,
  explicit_confirmation_required: true,
  exact_signed_result_required: true,
  exact_request_binding_rederived: true,
  canonical_payment_key_rederived: true,
  exact_fulfill_calldata_rederived: true,
  canonical_unsigned_transaction_fingerprint_rederived: true,
  signed_transaction_fully_decoded_and_revalidated: true,
  durable_submission_guard_required: true,
  injected_broadcaster_only: true,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  rpc_access_by_this_module: false,
  credential_access: false,
  wallet_access: false,
  transaction_signing: false,
  runtime_route_mount: false,
  automatic_retry: false,
  transaction_broadcast_when_applied_and_confirmed: true,
  money_movement_when_broadcaster_accepts: true,
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_SUBMISSION_ADMISSION_TIMEOUT_MS_V1 = 5_000;

export type BuyVoidPaymentKeyedSubmissionAdmissionContextV1 = Readonly<{
  attempt_id: string;
  expected_transaction_hash: string;
  submission_idempotency_key: string;
  request_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
}>;

export type BuyVoidPaymentKeyedSubmissionAdmissionV1 = (
  context: BuyVoidPaymentKeyedSubmissionAdmissionContextV1,
) => boolean | Promise<boolean>;

export type BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1 = {
  submission_guard: BuyVoidDeliverySubmissionGuardV1;
  broadcaster: BuyVoidDeliveryBroadcasterV1;
  // Trusted composition seam, not a caller-supplied HTTP capability.
  // Existing callers omit it; dispatcher integration must supply its fixed fence.
  before_external_submission?: BuyVoidPaymentKeyedSubmissionAdmissionV1;
};

export type BuyVoidPaymentKeyedCustodianBroadcastInputV1 = {
  apply?: boolean;
  confirmation?: unknown;
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  signed: BuyVoidPaymentKeyedCustodianSignerReadyV1;
  dependencies?: BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1;
};

export type BuyVoidPaymentKeyedCustodianBroadcastReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1;
  version: 1;
  status: "dry_run" | "broadcast_accepted";
  applied: boolean;
  attempt_id: string;
  expected_transaction_hash: string;
  submission_idempotency_key: string;
  request_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  submission_guard_claimed: boolean;
  submission_guard_released: boolean;
  broadcast_call_performed: boolean;
  transaction_broadcast_accepted: boolean;
  reconciliation_required: false;
  retry_allowed: false;
  transaction_hash: string;
  provider_submission_id: string;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  automatic_retry_allowed: false;
};

export type BuyVoidPaymentKeyedCustodianBroadcastHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1;
  version: 1;
  status: "held" | "not_broadcast" | "broadcast_unknown";
  reason: string;
  attempt_id: string | null;
  expected_transaction_hash: string | null;
  submission_idempotency_key: string | null;
  request_fingerprint_sha256: string | null;
  unsigned_transaction_fingerprint_sha256: string | null;
  transaction_plan_fingerprint_sha256: string | null;
  submission_guard_claimed: boolean;
  submission_guard_released: boolean;
  broadcast_call_performed: boolean;
  reconciliation_required: boolean;
  retry_allowed: boolean;
  provider_submission_id: string;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  automatic_retry_allowed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidPaymentKeyedCustodianBroadcastDecisionV1 =
  | BuyVoidPaymentKeyedCustodianBroadcastReadyV1
  | BuyVoidPaymentKeyedCustodianBroadcastHeldV1;

type ValidatedV1 = {
  attempt_id: string;
  expected_transaction_hash: string;
  submission_idempotency_key: string;
  request_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  raw_signed_transaction: string;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{1,200}$/;
const MAX_RAW_BYTES = 256 * 1024;
const MAX_UINT256_DECIMAL_DIGITS = 78;
const UINT256_MAX = (1n << 256n) - 1n;
const TOKEN_ATOM_MULTIPLIER = 1_000_000_000_000n;
const REQUEST_IDEMPOTENCY_DOMAIN =
  "void-buy-payment-keyed-custodian-prepare-request-v1";
const SUBMISSION_IDEMPOTENCY_DOMAIN =
  "void-buy-payment-keyed-custodian-broadcast-v1";
const FULFILLMENT = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function address(value: unknown): string {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function parseNonNegative(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") {
      return value >= 0n && value <= UINT256_MAX ? value : null;
    }
    if (typeof value === "number") {
      return Number.isSafeInteger(value) && value >= 0
        ? BigInt(value)
        : null;
    }
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!DECIMAL.test(raw) || raw.length > MAX_UINT256_DECIMAL_DIGITS) {
      return null;
    }
    const parsed = BigInt(raw);
    return parsed <= UINT256_MAX ? parsed : null;
  } catch {
    return null;
  }
}

function parsePositive(value: unknown): bigint | null {
  const parsed = parseNonNegative(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function safeProviderSubmissionId(value: unknown): string {
  const candidate = text(value);
  return SAFE_PROVIDER_ID.test(candidate) ? candidate : "";
}

function held(
  reason: string,
  options: Partial<BuyVoidPaymentKeyedCustodianBroadcastHeldV1> = {},
): BuyVoidPaymentKeyedCustodianBroadcastHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1,
    version: 1,
    status: options.status || "held",
    reason,
    attempt_id: options.attempt_id || null,
    expected_transaction_hash: options.expected_transaction_hash || null,
    submission_idempotency_key: options.submission_idempotency_key || null,
    request_fingerprint_sha256:
      options.request_fingerprint_sha256 || null,
    unsigned_transaction_fingerprint_sha256:
      options.unsigned_transaction_fingerprint_sha256 || null,
    transaction_plan_fingerprint_sha256:
      options.transaction_plan_fingerprint_sha256 || null,
    submission_guard_claimed: options.submission_guard_claimed === true,
    submission_guard_released: options.submission_guard_released === true,
    broadcast_call_performed: options.broadcast_call_performed === true,
    reconciliation_required: options.reconciliation_required === true,
    retry_allowed: options.retry_allowed === true,
    provider_submission_id: options.provider_submission_id || "",
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function validateInput(
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1,
  signed: BuyVoidPaymentKeyedCustodianSignerReadyV1,
): ValidatedV1 | null {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    !signed ||
    typeof signed !== "object" ||
    Array.isArray(signed)
  ) {
    return null;
  }
  const requestPrototype = Object.getPrototypeOf(request);
  const signedPrototype = Object.getPrototypeOf(signed);
  if (
    (requestPrototype !== Object.prototype && requestPrototype !== null) ||
    (signedPrototype !== Object.prototype && signedPrototype !== null)
  ) {
    return null;
  }

  if (
    request.schema !== VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1 ||
    request.marker !== VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1 ||
    request.version !== 1 ||
    request.chain_id !== "2050" ||
    request.transaction_value_wei !== "0" ||
    request.credential_access_authorized !== false ||
    request.wallet_access_authorized !== false ||
    request.signing_authorized !== false ||
    request.transaction_broadcast_authorized !== false ||
    request.raw_signed_transaction_persisted !== false ||
    request.money_movement_authorized !== false
  ) {
    return null;
  }

  const sagaId = text(request.saga_id).toLowerCase();
  const attemptId = text(request.attempt_id).toLowerCase();
  const reservationId = text(request.plan_reservation_id).toLowerCase();
  const requestIdempotency = text(request.idempotency_key_sha256).toLowerCase();
  const requestFingerprint =
    text(request.request_fingerprint_sha256).toLowerCase();
  const planFingerprint =
    text(request.transaction_plan_fingerprint_sha256).toLowerCase();
  const unsignedFingerprint =
    text(request.unsigned_transaction_fingerprint_sha256).toLowerCase();
  const wallet = address(request.wallet_address);
  const target = address(request.transaction_to);
  const delivery = address(request.delivery_address);
  const identity = text(request.canonical_payment_identity).toLowerCase();
  const key = text(request.canonical_payment_key_sha256).toLowerCase();
  const calldata = text(request.transaction_calldata).toLowerCase();
  const calldataSha = text(request.transaction_calldata_sha256).toLowerCase();
  const callFingerprint = text(request.call_fingerprint_sha256).toLowerCase();

  if (
    !SAGA_ID.test(sagaId) ||
    !SHA256.test(attemptId) ||
    !SHA256.test(reservationId) ||
    !SHA256.test(requestIdempotency) ||
    !SHA256.test(requestFingerprint) ||
    !SHA256.test(planFingerprint) ||
    !SHA256.test(unsignedFingerprint) ||
    !wallet ||
    !target ||
    !delivery ||
    !PAYMENT_ID.test(identity) ||
    !SHA256.test(key) ||
    !/^0x[0-9a-f]+$/.test(calldata) ||
    !SHA256.test(calldataSha) ||
    !SHA256.test(callFingerprint)
  ) {
    return null;
  }

  const nonceValue = parseNonNegative(request.nonce);
  const gasLimit = parsePositive(request.gas_limit);
  const maxFee = parsePositive(request.max_fee_per_gas_wei);
  const priorityFee = parseNonNegative(
    request.max_priority_fee_per_gas_wei,
  );
  const voidAmount = parsePositive(request.void_amount_units);
  const tokenAtoms = parsePositive(request.token_amount_atoms);
  if (
    nonceValue === null ||
    nonceValue > BigInt(Number.MAX_SAFE_INTEGER) ||
    gasLimit === null ||
    maxFee === null ||
    priorityFee === null ||
    priorityFee > maxFee ||
    voidAmount === null ||
    tokenAtoms === null ||
    tokenAtoms !== voidAmount * TOKEN_ATOM_MULTIPLIER ||
    tokenAtoms > UINT256_MAX
  ) {
    return null;
  }
  const nonce = Number(nonceValue);

  const identityMatch = PAYMENT_ID.exec(identity);
  if (!identityMatch) return null;
  const paymentBinding = bindBuyVoidSourceFinalityPaymentV1({
    source_chain: identityMatch[1],
    transaction_hash: identityMatch[2],
    reservation_canonical_payment_identity: identity,
    observed_canonical_payment_identity: identity,
    observed_payment_key_sha256: key,
  });
  if (
    !paymentBinding ||
    paymentBinding.canonical_payment_identity !== identity ||
    paymentBinding.payment_key_sha256 !== key
  ) {
    return null;
  }

  const expectedCalldata = FULFILLMENT.encodeFunctionData("fulfill", [
    "0x" + key,
    delivery,
    tokenAtoms,
  ]).toLowerCase();
  if (
    calldata !== expectedCalldata ||
    calldataSha !== sha256(calldata)
  ) {
    return null;
  }

  const expectedCallFingerprint = sha256(
    JSON.stringify({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
      version: 1,
      chain_id: "2050",
      fulfillment_contract_address: target,
      canonical_payment_identity: identity,
      canonical_payment_key_sha256: key,
      delivery_address: delivery,
      void_amount_units: voidAmount.toString(),
      token_amount_atoms: tokenAtoms.toString(),
      value_wei: "0",
      calldata,
    }),
  );
  if (callFingerprint !== expectedCallFingerprint) return null;

  const expectedPlanFingerprint = sha256(
    [
      "chain_id=2050",
      "nonce=" + String(nonce),
      "gas_limit=" + gasLimit.toString(),
      "max_fee_per_gas_wei=" + maxFee.toString(),
      "max_priority_fee_per_gas_wei=" + priorityFee.toString(),
    ].join("\n"),
  );
  if (planFingerprint !== expectedPlanFingerprint) return null;

  const expectedUnsignedFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_V1,
      "version=1",
      "attempt_id=" + attemptId,
      "chain_id=2050",
      "fulfillment_wallet_address=" + wallet,
      "fulfillment_contract_address=" + target,
      "canonical_payment_identity=" + identity,
      "canonical_payment_key_sha256=" + key,
      "delivery_address=" + delivery,
      "void_amount_units=" + voidAmount.toString(),
      "token_amount_atoms=" + tokenAtoms.toString(),
      "call_fingerprint_sha256=" + callFingerprint,
      "transaction_plan_fingerprint_sha256=" + planFingerprint,
      "type=2",
      "nonce=" + String(nonce),
      "gas_limit=" + gasLimit.toString(),
      "max_fee_per_gas_wei=" + maxFee.toString(),
      "max_priority_fee_per_gas_wei=" + priorityFee.toString(),
      "to=" + target,
      "value_wei=0",
      "data_sha256=" + calldataSha,
    ].join("\n"),
  );
  if (unsignedFingerprint !== expectedUnsignedFingerprint) return null;

  const expectedRequestFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
      "version=1",
      "saga_id=" + sagaId,
      "attempt_id=" + attemptId,
      "plan_reservation_id=" + reservationId,
      "chain_id=2050",
      "wallet_address=" + wallet,
      "canonical_payment_identity=" + identity,
      "canonical_payment_key_sha256=" + key,
      "delivery_address=" + delivery,
      "void_amount_units=" + voidAmount.toString(),
      "token_amount_atoms=" + tokenAtoms.toString(),
      "call_fingerprint_sha256=" + callFingerprint,
      "transaction_plan_fingerprint_sha256=" + planFingerprint,
      "unsigned_transaction_fingerprint_sha256=" + unsignedFingerprint,
      "transaction_to=" + target,
      "transaction_value_wei=0",
      "transaction_calldata_sha256=" + calldataSha,
    ].join("\n"),
  );
  if (requestFingerprint !== expectedRequestFingerprint) return null;

  const expectedRequestIdempotency = sha256(
    [
      REQUEST_IDEMPOTENCY_DOMAIN,
      sagaId,
      attemptId,
      reservationId,
      unsignedFingerprint,
      requestFingerprint,
    ].join("\n"),
  );
  if (requestIdempotency !== expectedRequestIdempotency) return null;

  if (
    signed.ok !== true ||
    signed.status !== "signed" ||
    signed.marker !== VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1 ||
    signed.version !== 1 ||
    signed.applied !== true ||
    text(signed.attempt_id).toLowerCase() !== attemptId ||
    text(signed.saga_id).toLowerCase() !== sagaId ||
    text(signed.plan_reservation_id).toLowerCase() !== reservationId ||
    text(signed.idempotency_key_sha256).toLowerCase() !== requestIdempotency ||
    text(signed.request_fingerprint_sha256).toLowerCase() !==
      requestFingerprint ||
    address(signed.wallet_address) !== wallet ||
    address(signed.signer_address) !== wallet ||
    text(signed.transaction_plan_fingerprint_sha256).toLowerCase() !==
      planFingerprint ||
    text(signed.unsigned_transaction_fingerprint_sha256).toLowerCase() !==
      unsignedFingerprint ||
    signed.raw_signed_transaction_persisted !== false ||
    signed.mutation_performed !== false ||
    signed.credential_access_performed_by_this_module !== false ||
    signed.wallet_access_performed !== true ||
    signed.signing_performed !== true ||
    signed.transaction_broadcast_performed !== false ||
    signed.money_movement_performed !== false
  ) {
    return null;
  }

  const raw = text(signed.raw_signed_transaction);
  const signedHash = text(signed.signed_transaction_hash).toLowerCase();
  const rawSha = text(signed.raw_signed_transaction_sha256).toLowerCase();
  if (
    !RAW.test(raw) ||
    raw.length % 2 !== 0 ||
    (raw.length - 2) / 2 > MAX_RAW_BYTES ||
    !HASH.test(signedHash) ||
    !SHA256.test(rawSha) ||
    rawSha !== sha256(raw)
  ) {
    return null;
  }

  let transaction: Transaction;
  try {
    transaction = Transaction.from(raw);
  } catch {
    return null;
  }
  const transactionHash = text(transaction.hash).toLowerCase();
  const accessList = transaction.accessList || [];
  if (
    transactionHash !== signedHash ||
    keccak256(raw).toLowerCase() !== signedHash ||
    address(transaction.from) !== wallet ||
    address(transaction.to) !== target ||
    transaction.type !== 2 ||
    transaction.chainId !== 2050n ||
    transaction.nonce !== nonce ||
    transaction.gasLimit !== gasLimit ||
    transaction.maxFeePerGas !== maxFee ||
    transaction.maxPriorityFeePerGas !== priorityFee ||
    transaction.value !== 0n ||
    text(transaction.data).toLowerCase() !== calldata ||
    !Array.isArray(accessList) ||
    accessList.length !== 0
  ) {
    return null;
  }

  const inspection = inspectBuyVoidPaymentKeyedSignedTransactionV1({
    raw_signed_transaction: raw,
    fulfillment_contract_address: target,
    max_token_amount_atoms: tokenAtoms,
  });
  if (
    inspection.ok !== true ||
    inspection.status !== "valid" ||
    inspection.transaction_hash !== signedHash ||
    inspection.fulfillment_contract_address !== target ||
    inspection.payment_delivery_id !== "0x" + key ||
    inspection.recipient !== delivery ||
    inspection.amount_atoms !== tokenAtoms.toString() ||
    inspection.calldata !== calldata
  ) {
    return null;
  }

  const submissionIdempotency = sha256(
    [
      SUBMISSION_IDEMPOTENCY_DOMAIN,
      requestIdempotency,
      signedHash,
      unsignedFingerprint,
    ].join("\n"),
  );

  return {
    attempt_id: attemptId,
    expected_transaction_hash: signedHash,
    submission_idempotency_key: submissionIdempotency,
    request_fingerprint_sha256: requestFingerprint,
    unsigned_transaction_fingerprint_sha256: unsignedFingerprint,
    transaction_plan_fingerprint_sha256: planFingerprint,
    raw_signed_transaction: raw,
  };
}

function bindingFor(
  validated: ValidatedV1,
): BuyVoidDeliverySubmissionBindingV1 {
  return {
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1,
    submission_idempotency_key: validated.submission_idempotency_key,
    attempt_id: validated.attempt_id,
    expected_transaction_hash: validated.expected_transaction_hash,
    transaction_plan_fingerprint_sha256:
      validated.transaction_plan_fingerprint_sha256,
  };
}

async function releaseDefinitiveNoSubmission(
  validated: ValidatedV1,
  dependencies: BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1,
  reason: string,
  providerSubmissionId: string,
): Promise<BuyVoidPaymentKeyedCustodianBroadcastHeldV1> {
  const binding = bindingFor(validated);
  try {
    const released = await dependencies.submission_guard.release_submission_claim(
      binding,
      reason,
    );
    if (released.released !== true) {
      return held("payment_keyed_submission_guard_release_failed", {
        attempt_id: validated.attempt_id,
        expected_transaction_hash: validated.expected_transaction_hash,
        submission_idempotency_key:
          validated.submission_idempotency_key,
        request_fingerprint_sha256:
          validated.request_fingerprint_sha256,
        unsigned_transaction_fingerprint_sha256:
          validated.unsigned_transaction_fingerprint_sha256,
        transaction_plan_fingerprint_sha256:
          validated.transaction_plan_fingerprint_sha256,
        submission_guard_claimed: true,
        broadcast_call_performed: true,
        reconciliation_required: true,
        retry_allowed: false,
        provider_submission_id: providerSubmissionId,
        detail: {
          release_reason:
            text((released as { reason?: unknown }).reason) ||
            "release_refused",
        },
      });
    }
  } catch (error) {
    return held("payment_keyed_submission_guard_release_failed", {
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: true,
      broadcast_call_performed: true,
      reconciliation_required: true,
      retry_allowed: false,
      provider_submission_id: providerSubmissionId,
      detail: {
        error_class: text((error as Error)?.name) || "Error",
      },
    });
  }

  return held("payment_keyed_broadcast_definitively_not_submitted", {
    status: "not_broadcast",
    attempt_id: validated.attempt_id,
    expected_transaction_hash: validated.expected_transaction_hash,
    submission_idempotency_key:
      validated.submission_idempotency_key,
    request_fingerprint_sha256:
      validated.request_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      validated.unsigned_transaction_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      validated.transaction_plan_fingerprint_sha256,
    submission_guard_claimed: true,
    submission_guard_released: true,
    broadcast_call_performed: true,
    reconciliation_required: false,
    retry_allowed: true,
    provider_submission_id: providerSubmissionId,
  });
}

async function checkSubmissionAdmission(
  admission: BuyVoidPaymentKeyedSubmissionAdmissionV1,
  validated: ValidatedV1,
): Promise<"allowed" | "held" | "error" | "timeout"> {
  // Explicit allowlist: never hand raw signed bytes or mutable request objects
  // to an admission checker. The checker can only veto this submission.
  const context: BuyVoidPaymentKeyedSubmissionAdmissionContextV1 = Object.freeze({
    attempt_id: validated.attempt_id,
    expected_transaction_hash: validated.expected_transaction_hash,
    submission_idempotency_key: validated.submission_idempotency_key,
    request_fingerprint_sha256: validated.request_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      validated.unsigned_transaction_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      validated.transaction_plan_fingerprint_sha256,
  });
  const deadline = performance.now() +
    VOID_BUY_VOID_PAYMENT_KEYED_SUBMISSION_ADMISSION_TIMEOUT_MS_V1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(
        () => resolve("timeout"),
        VOID_BUY_VOID_PAYMENT_KEYED_SUBMISSION_ADMISSION_TIMEOUT_MS_V1,
      );
    });
    const decision = Promise.resolve().then(() => admission(context)).then(
      (value): "allowed" | "held" => value === true ? "allowed" : "held",
      (): "error" => "error",
    );
    const result = await Promise.race([decision, timeout]);
    // A delayed timer must not admit a late true result. This bounds async
    // waiting; it cannot preempt a trusted checker blocking the event loop.
    return performance.now() >= deadline ? "timeout" : result;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function runBuyVoidPaymentKeyedCustodianBroadcastV1(
  input: BuyVoidPaymentKeyedCustodianBroadcastInputV1,
): Promise<BuyVoidPaymentKeyedCustodianBroadcastDecisionV1> {
  if (!input || !input.request || !input.signed) {
    return held("payment_keyed_custodian_broadcast_missing_input");
  }
  const validated = validateInput(input.request, input.signed);
  if (!validated) {
    return held("payment_keyed_custodian_broadcast_binding_invalid");
  }

  if (input.apply !== true) {
    return {
      ok: true,
      marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1,
      version: 1,
      status: "dry_run",
      applied: false,
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: false,
      submission_guard_released: false,
      broadcast_call_performed: false,
      transaction_broadcast_accepted: false,
      reconciliation_required: false,
      retry_allowed: false,
      transaction_hash: validated.expected_transaction_hash,
      provider_submission_id: "",
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      automatic_retry_allowed: false,
    };
  }

  if (
    text(input.confirmation) !==
    VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1
  ) {
    return held("payment_keyed_custodian_broadcast_confirmation_required", {
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
    });
  }

  const dependencies = input.dependencies;
  if (
    !dependencies ||
    typeof dependencies.submission_guard?.claim_submission_once !== "function" ||
    typeof dependencies.submission_guard?.release_submission_claim !==
      "function" ||
    typeof dependencies.broadcaster?.broadcast_signed_transaction !==
      "function"
  ) {
    return held("payment_keyed_custodian_broadcast_dependencies_required", {
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
    });
  }

  // Capture once, before the awaited guard claim. Removing/replacing the
  // dependency while that claim is pending cannot bypass the selected fence.
  let admission: BuyVoidPaymentKeyedSubmissionAdmissionV1 | undefined;
  try {
    admission = dependencies.before_external_submission;
    if (admission !== undefined && typeof admission !== "function") {
      return held("payment_keyed_submission_admission_invalid");
    }
  } catch {
    return held("payment_keyed_submission_admission_invalid");
  }

  const binding = bindingFor(validated);
  let claim;
  try {
    claim = await dependencies.submission_guard.claim_submission_once(binding);
  } catch (error) {
    return held("payment_keyed_submission_guard_claim_failed", {
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      reconciliation_required: true,
      retry_allowed: false,
      detail: {
        error_class: text((error as Error)?.name) || "Error",
      },
    });
  }
  if (claim.claimed !== true) {
    return held("payment_keyed_submission_guard_already_claimed", {
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      reconciliation_required: true,
      retry_allowed: false,
      detail: {
        guard_reason:
          text((claim as { reason?: unknown }).reason) || "claim_refused",
        existing_transaction_hash:
          text(
            (claim as { existing_transaction_hash?: unknown })
              .existing_transaction_hash,
          ).toLowerCase(),
      },
    });
  }

  if (admission !== undefined) {
    const decision = await checkSubmissionAdmission(admission, validated);
    if (decision !== "allowed") {
      // The guard claim is durable, but no external call has been made.
      // Do not invent provider no-submission evidence or release the claim.
      return held("payment_keyed_submission_admission_" + decision, {
        attempt_id: validated.attempt_id,
        expected_transaction_hash: validated.expected_transaction_hash,
        submission_idempotency_key: validated.submission_idempotency_key,
        request_fingerprint_sha256: validated.request_fingerprint_sha256,
        unsigned_transaction_fingerprint_sha256:
          validated.unsigned_transaction_fingerprint_sha256,
        transaction_plan_fingerprint_sha256:
          validated.transaction_plan_fingerprint_sha256,
        submission_guard_claimed: true,
        broadcast_call_performed: false,
        reconciliation_required: true,
        retry_allowed: false,
      });
    }
  }

  let result;
  try {
    result = await dependencies.broadcaster.broadcast_signed_transaction(
      validated.raw_signed_transaction,
    );
  } catch (error) {
    return held("payment_keyed_broadcast_submission_exception_unknown", {
      status: "broadcast_unknown",
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: true,
      broadcast_call_performed: true,
      reconciliation_required: true,
      retry_allowed: false,
      detail: {
        error_class: text((error as Error)?.name) || "Error",
      },
    });
  }

  const providerSubmissionId = safeProviderSubmissionId(
    result?.provider_submission_id,
  );
  const returnedHash = text(result?.transaction_hash).toLowerCase();
  const definitiveNoSubmission =
    result?.accepted === false &&
    result?.submission_may_have_occurred === false;

  if (!providerSubmissionId) {
    if (definitiveNoSubmission) {
      return await releaseDefinitiveNoSubmission(
        validated,
        dependencies,
        "invalid_provider_submission_id",
        "",
      );
    }
    return held("payment_keyed_broadcast_provider_submission_id_invalid", {
      status: "broadcast_unknown",
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: true,
      broadcast_call_performed: true,
      reconciliation_required: true,
      retry_allowed: false,
    });
  }

  if (result?.accepted !== true) {
    if (definitiveNoSubmission) {
      return await releaseDefinitiveNoSubmission(
        validated,
        dependencies,
        "broadcast_definitively_not_submitted",
        providerSubmissionId,
      );
    }
    return held("payment_keyed_broadcast_submission_unknown", {
      status: "broadcast_unknown",
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: true,
      broadcast_call_performed: true,
      reconciliation_required: true,
      retry_allowed: false,
      provider_submission_id: providerSubmissionId,
    });
  }

  if (!HASH.test(returnedHash) ||
      returnedHash !== validated.expected_transaction_hash) {
    return held("payment_keyed_broadcast_accepted_hash_mismatch", {
      status: "broadcast_unknown",
      attempt_id: validated.attempt_id,
      expected_transaction_hash: validated.expected_transaction_hash,
      submission_idempotency_key:
        validated.submission_idempotency_key,
      request_fingerprint_sha256:
        validated.request_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        validated.unsigned_transaction_fingerprint_sha256,
      transaction_plan_fingerprint_sha256:
        validated.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: true,
      broadcast_call_performed: true,
      reconciliation_required: true,
      retry_allowed: false,
      provider_submission_id: providerSubmissionId,
      detail: { returned_transaction_hash: returnedHash },
    });
  }

  return {
    ok: true,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1,
    version: 1,
    status: "broadcast_accepted",
    applied: true,
    attempt_id: validated.attempt_id,
    expected_transaction_hash: validated.expected_transaction_hash,
    submission_idempotency_key:
      validated.submission_idempotency_key,
    request_fingerprint_sha256:
      validated.request_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      validated.unsigned_transaction_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      validated.transaction_plan_fingerprint_sha256,
    submission_guard_claimed: true,
    submission_guard_released: false,
    broadcast_call_performed: true,
    transaction_broadcast_accepted: true,
    reconciliation_required: false,
    retry_allowed: false,
    transaction_hash: validated.expected_transaction_hash,
    provider_submission_id: providerSubmissionId,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
  };
}
