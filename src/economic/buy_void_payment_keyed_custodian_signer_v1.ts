import crypto from "node:crypto";
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
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  bindBuyVoidSourceFinalityPaymentV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_UNSIGNED_TRANSACTION_V1,
} from "./buy_void_payment_keyed_unsigned_transaction_v1.js";
import type {
  BuyVoidDeliverySignerV1,
  BuyVoidDeliveryUnsignedTransactionV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1 =
  "buyVoidSignPaymentKeyedCustodianTransactionV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_AUTHORITY_V1 = {
  source_only_contract: true,
  explicit_confirmation_required: true,
  exact_custodian_request_schema_required: true,
  request_fingerprint_rederived: true,
  idempotency_key_rederived: true,
  canonical_payment_key_rederived: true,
  exact_fulfill_calldata_rederived: true,
  transaction_plan_fingerprint_rederived: true,
  canonical_unsigned_transaction_fingerprint_rederived: true,
  unsigned_transaction_fingerprint_rederived: true,
  injected_signer_only: true,
  signer_address_must_match_request_wallet: true,
  returned_signature_fully_decoded_and_revalidated: true,
  raw_signed_transaction_persistence: false,
  rpc_access: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access_by_this_module: false,
  wallet_access_through_injected_signer_when_applied: true,
  signing_when_applied_and_confirmed: true,
  transaction_broadcast: false,
  runtime_route_mount: false,
  automatic_retry: false,
  money_movement: false,
} as const;

export type BuyVoidPaymentKeyedCustodianSignerInputV1 = {
  apply?: boolean;
  confirmation?: unknown;
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  signer?: BuyVoidDeliverySignerV1;
};

export type BuyVoidPaymentKeyedCustodianSignerReadyV1 = {
  ok: true;
  status: "dry_run" | "signed";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1;
  version: 1;
  applied: boolean;
  attempt_id: string;
  saga_id: string;
  plan_reservation_id: string;
  idempotency_key_sha256: string;
  request_fingerprint_sha256: string;
  wallet_address: string;
  signer_address: string | null;
  transaction_plan_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  signed_transaction_hash: string | null;
  raw_signed_transaction: string | null;
  raw_signed_transaction_sha256: string | null;
  raw_signed_transaction_persisted: false;
  mutation_performed: false;
  credential_access_performed_by_this_module: false;
  wallet_access_performed: boolean;
  signing_performed: boolean;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedCustodianSignerHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1;
  version: 1;
  reason: string;
  attempt_id: string | null;
  saga_id: string | null;
  plan_reservation_id: string | null;
  wallet_access_performed: boolean;
  signing_performed: boolean;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidPaymentKeyedCustodianSignerDecisionV1 =
  | BuyVoidPaymentKeyedCustodianSignerReadyV1
  | BuyVoidPaymentKeyedCustodianSignerHeldV1;

type ValidatedRequestV1 = {
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  unsigned_transaction: BuyVoidDeliveryUnsignedTransactionV1;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/;
const RAW = /^0x[0-9a-fA-F]+$/;
const MAX_RAW_BYTES = 256 * 1024;
const TOKEN_ATOM_MULTIPLIER = 1_000_000_000_000n;
const UINT256_MAX = (1n << 256n) - 1n;
const IDEMPOTENCY_DOMAIN =
  "void-buy-payment-keyed-custodian-prepare-request-v1";
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

function decimal(value: unknown, positive: boolean): bigint | null {
  try {
    if (typeof value === "bigint") {
      if (value < 0n || value > UINT256_MAX) return null;
      return positive && value === 0n ? null : value;
    }
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value < 0) return null;
      const parsed = BigInt(value);
      return positive && parsed === 0n ? null : parsed;
    }
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!/^(0|[1-9][0-9]{0,77})$/.test(raw)) return null;
    const parsed = BigInt(raw);
    if (parsed > UINT256_MAX) return null;
    return positive && parsed === 0n ? null : parsed;
  } catch {
    return null;
  }
}

function held(
  reason: string,
  request?: Partial<BuyVoidPaymentKeyedCustodianPrepareRequestV1> | null,
  options: {
    wallet_access_performed?: boolean;
    signing_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidPaymentKeyedCustodianSignerHeldV1 {
  const attempt = text(request?.attempt_id).toLowerCase();
  const saga = text(request?.saga_id).toLowerCase();
  const reservation = text(request?.plan_reservation_id).toLowerCase();
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1,
    version: 1,
    reason,
    attempt_id: SHA256.test(attempt) ? attempt : null,
    saga_id: SAGA_ID.test(saga) ? saga : null,
    plan_reservation_id: SHA256.test(reservation) ? reservation : null,
    wallet_access_performed: options.wallet_access_performed === true,
    signing_performed: options.signing_performed === true,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function validateRequest(
  input: BuyVoidPaymentKeyedCustodianPrepareRequestV1,
): ValidatedRequestV1 | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;

  if (
    input.schema !== VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1 ||
    input.marker !== VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1 ||
    input.version !== 1 ||
    input.chain_id !== "2050" ||
    input.transaction_value_wei !== "0" ||
    input.credential_access_authorized !== false ||
    input.wallet_access_authorized !== false ||
    input.signing_authorized !== false ||
    input.transaction_broadcast_authorized !== false ||
    input.raw_signed_transaction_persisted !== false ||
    input.money_movement_authorized !== false
  ) {
    return null;
  }

  const sagaId = text(input.saga_id).toLowerCase();
  const attemptId = text(input.attempt_id).toLowerCase();
  const reservationId = text(input.plan_reservation_id).toLowerCase();
  const idempotencyKey = text(input.idempotency_key_sha256).toLowerCase();
  const requestFingerprint = text(input.request_fingerprint_sha256).toLowerCase();
  const wallet = address(input.wallet_address);
  const target = address(input.transaction_to);
  const calldata = text(input.transaction_calldata).toLowerCase();
  const calldataSha = text(input.transaction_calldata_sha256).toLowerCase();
  const identity = text(input.canonical_payment_identity).toLowerCase();
  const key = text(input.canonical_payment_key_sha256).toLowerCase();
  const delivery = address(input.delivery_address);
  const callFingerprint = text(input.call_fingerprint_sha256).toLowerCase();
  const planFingerprint =
    text(input.transaction_plan_fingerprint_sha256).toLowerCase();
  const unsignedFingerprint =
    text(input.unsigned_transaction_fingerprint_sha256).toLowerCase();

  if (
    !SAGA_ID.test(sagaId) ||
    !SHA256.test(attemptId) ||
    !SHA256.test(reservationId) ||
    !SHA256.test(idempotencyKey) ||
    !SHA256.test(requestFingerprint) ||
    !wallet ||
    !target ||
    !/^0x[0-9a-f]+$/.test(calldata) ||
    !SHA256.test(calldataSha) ||
    !identity ||
    identity.length > 192 ||
    !PAYMENT_ID.test(identity) ||
    !SHA256.test(key) ||
    !delivery ||
    !SHA256.test(callFingerprint) ||
    !SHA256.test(planFingerprint) ||
    !SHA256.test(unsignedFingerprint)
  ) {
    return null;
  }

  const nonceBig = decimal(input.nonce, false);
  const gasLimit = decimal(input.gas_limit, true);
  const maxFee = decimal(input.max_fee_per_gas_wei, true);
  const priorityFee = decimal(input.max_priority_fee_per_gas_wei, false);
  const voidAmount = decimal(input.void_amount_units, true);
  const tokenAtoms = decimal(input.token_amount_atoms, true);
  if (
    nonceBig === null ||
    nonceBig > BigInt(Number.MAX_SAFE_INTEGER) ||
    gasLimit === null ||
    maxFee === null ||
    priorityFee === null ||
    priorityFee > maxFee ||
    voidAmount === null ||
    tokenAtoms === null ||
    tokenAtoms !== voidAmount * TOKEN_ATOM_MULTIPLIER
  ) {
    return null;
  }
  const nonce = Number(nonceBig);
  if (!Number.isSafeInteger(nonce) || nonce < 0) return null;

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
  if (calldata !== expectedCalldata || calldataSha !== sha256(calldata)) {
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

  const expectedIdempotency = sha256(
    [
      IDEMPOTENCY_DOMAIN,
      sagaId,
      attemptId,
      reservationId,
      unsignedFingerprint,
      requestFingerprint,
    ].join("\n"),
  );
  if (idempotencyKey !== expectedIdempotency) return null;

  return {
    request: {
      ...input,
      saga_id: sagaId,
      attempt_id: attemptId,
      plan_reservation_id: reservationId,
      idempotency_key_sha256: idempotencyKey,
      request_fingerprint_sha256: requestFingerprint,
      wallet_address: wallet,
      nonce,
      transaction_to: target,
      transaction_calldata: calldata,
      transaction_calldata_sha256: calldataSha,
      canonical_payment_identity: identity,
      canonical_payment_key_sha256: key,
      delivery_address: delivery,
      void_amount_units: voidAmount.toString(),
      token_amount_atoms: tokenAtoms.toString(),
      call_fingerprint_sha256: callFingerprint,
      transaction_plan_fingerprint_sha256: planFingerprint,
      unsigned_transaction_fingerprint_sha256: unsignedFingerprint,
      gas_limit: gasLimit.toString(),
      max_fee_per_gas_wei: maxFee.toString(),
      max_priority_fee_per_gas_wei: priorityFee.toString(),
    },
    unsigned_transaction: {
      type: 2,
      chainId: 2050n,
      nonce,
      gasLimit,
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: priorityFee,
      to: target,
      value: 0n,
      data: calldata,
    },
  };
}

function validateSignedTransaction(
  rawValue: unknown,
  expectedWallet: string,
  expected: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
): { raw: string; hash: string } | null {
  const raw = text(rawValue);
  if (
    !RAW.test(raw) ||
    raw.length % 2 !== 0 ||
    (raw.length - 2) / 2 > MAX_RAW_BYTES
  ) {
    return null;
  }

  let transaction: Transaction;
  try {
    transaction = Transaction.from(raw);
  } catch {
    return null;
  }
  const from = address(transaction.from);
  const to = address(transaction.to);
  const transactionHash = text(transaction.hash).toLowerCase();
  const computedHash = keccak256(raw).toLowerCase();
  const accessList = transaction.accessList || [];
  if (
    from !== expectedWallet ||
    to !== expected.to ||
    transaction.type !== 2 ||
    transaction.chainId !== expected.chainId ||
    transaction.nonce !== expected.nonce ||
    transaction.gasLimit !== expected.gasLimit ||
    transaction.maxFeePerGas !== expected.maxFeePerGas ||
    transaction.maxPriorityFeePerGas !== expected.maxPriorityFeePerGas ||
    transaction.value !== 0n ||
    text(transaction.data).toLowerCase() !== expected.data.toLowerCase() ||
    !Array.isArray(accessList) ||
    accessList.length !== 0 ||
    !/^0x[0-9a-f]{64}$/.test(transactionHash) ||
    transactionHash !== computedHash
  ) {
    return null;
  }
  return { raw, hash: transactionHash };
}

export async function runBuyVoidPaymentKeyedCustodianSignerV1(
  input: BuyVoidPaymentKeyedCustodianSignerInputV1,
): Promise<BuyVoidPaymentKeyedCustodianSignerDecisionV1> {
  if (!input || !input.request) {
    return held("payment_keyed_custodian_signer_missing_input");
  }
  const validated = validateRequest(input.request);
  if (!validated) {
    return held(
      "payment_keyed_custodian_signer_request_invalid",
      input.request,
    );
  }
  const request = validated.request;

  if (input.apply !== true) {
    return {
      ok: true,
      status: "dry_run",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1,
      version: 1,
      applied: false,
      attempt_id: request.attempt_id,
      saga_id: request.saga_id,
      plan_reservation_id: request.plan_reservation_id,
      idempotency_key_sha256: request.idempotency_key_sha256,
      request_fingerprint_sha256: request.request_fingerprint_sha256,
      wallet_address: request.wallet_address,
      signer_address: null,
      transaction_plan_fingerprint_sha256:
        request.transaction_plan_fingerprint_sha256,
      unsigned_transaction_fingerprint_sha256:
        request.unsigned_transaction_fingerprint_sha256,
      signed_transaction_hash: null,
      raw_signed_transaction: null,
      raw_signed_transaction_sha256: null,
      raw_signed_transaction_persisted: false,
      mutation_performed: false,
      credential_access_performed_by_this_module: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    };
  }

  if (
    text(input.confirmation) !==
    VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1
  ) {
    return held(
      "payment_keyed_custodian_signer_confirmation_required",
      request,
    );
  }
  if (
    !input.signer ||
    typeof input.signer.get_address !== "function" ||
    typeof input.signer.sign_transaction !== "function"
  ) {
    return held(
      "payment_keyed_custodian_signer_dependency_required",
      request,
    );
  }

  let signerAddress = "";
  try {
    signerAddress = address(await input.signer.get_address());
  } catch (error) {
    return held(
      "payment_keyed_custodian_signer_address_read_failed",
      request,
      {
        wallet_access_performed: true,
        detail: {
          error_class: text((error as Error)?.name) || "Error",
        },
      },
    );
  }
  if (!signerAddress || signerAddress !== request.wallet_address) {
    return held(
      "payment_keyed_custodian_signer_wallet_mismatch",
      request,
      { wallet_access_performed: true },
    );
  }

  let rawSigned: string;
  try {
    rawSigned = await input.signer.sign_transaction(
      validated.unsigned_transaction,
    );
  } catch (error) {
    return held(
      "payment_keyed_custodian_signer_sign_failed",
      request,
      {
        wallet_access_performed: true,
        signing_performed: true,
        detail: {
          error_class: text((error as Error)?.name) || "Error",
        },
      },
    );
  }

  const signed = validateSignedTransaction(
    rawSigned,
    signerAddress,
    validated.unsigned_transaction,
  );
  if (!signed) {
    return held(
      "payment_keyed_custodian_signer_signed_transaction_invalid",
      request,
      {
        wallet_access_performed: true,
        signing_performed: true,
      },
    );
  }

  return {
    ok: true,
    status: "signed",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_V1,
    version: 1,
    applied: true,
    attempt_id: request.attempt_id,
    saga_id: request.saga_id,
    plan_reservation_id: request.plan_reservation_id,
    idempotency_key_sha256: request.idempotency_key_sha256,
    request_fingerprint_sha256: request.request_fingerprint_sha256,
    wallet_address: request.wallet_address,
    signer_address: signerAddress,
    transaction_plan_fingerprint_sha256:
      request.transaction_plan_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      request.unsigned_transaction_fingerprint_sha256,
    signed_transaction_hash: signed.hash,
    raw_signed_transaction: signed.raw,
    raw_signed_transaction_sha256: sha256(signed.raw),
    raw_signed_transaction_persisted: false,
    mutation_performed: false,
    credential_access_performed_by_this_module: false,
    wallet_access_performed: true,
    signing_performed: true,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
