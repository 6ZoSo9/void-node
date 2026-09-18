import crypto from "node:crypto";
import { Interface, getAddress } from "ethers";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
  type BuyVoidPaymentKeyedFulfillmentCallReadyV1,
} from "./buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  bindBuyVoidSourceFinalityPaymentV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";
import type {
  BuyVoidDeliveryTransactionPlanV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_AUTHORITY_V1 = {
  source_only_contract: true,
  exact_saga_id_required: true,
  exact_attempt_id_required: true,
  exact_plan_reservation_id_required: true,
  payment_keyed_fulfillment_call_required: true,
  canonical_payment_key_rederived: true,
  exact_fulfill_calldata_required: true,
  fulfillment_contract_target_required: true,
  transaction_value_wei: "0",
  bounded_nonce_and_fee_plan_required: true,
  explicit_calldata_bearing_custody_request: true,
  legacy_delivery_address_as_transaction_target: false,
  legacy_empty_calldata_authority: false,
  rpc_access: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1 =
  "void_buy_void_payment_keyed_custodian_prepare_request_v1";

export type BuyVoidPaymentKeyedCustodianPrepareRequestPolicyV1 = {
  chain_id: "2050";
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  max_void_amount_units: string | number | bigint;
  max_gas_limit: string | number | bigint;
  max_fee_per_gas_wei: string | number | bigint;
  max_priority_fee_per_gas_wei: string | number | bigint;
};

export type BuyVoidPaymentKeyedCustodianPrepareRequestV1 = {
  schema: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1;
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1;
  version: 1;
  idempotency_key_sha256: string;
  request_fingerprint_sha256: string;
  saga_id: string;
  attempt_id: string;
  plan_reservation_id: string;
  chain_id: "2050";
  wallet_address: string;
  nonce: number;
  transaction_to: string;
  transaction_value_wei: "0";
  transaction_calldata: string;
  transaction_calldata_sha256: string;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  canonical_payment_identity: string;
  canonical_payment_key_sha256: string;
  delivery_address: string;
  void_amount_units: string;
  token_amount_atoms: string;
  call_fingerprint_sha256: string;
  transaction_plan_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  credential_access_authorized: false;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  raw_signed_transaction_persisted: false;
  money_movement_authorized: false;
};

export type BuyVoidPaymentKeyedCustodianPrepareRequestReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1;
  version: 1;
  request: BuyVoidPaymentKeyedCustodianPrepareRequestV1;
  mutation_performed: false;
  credential_access_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedCustodianPrepareRequestHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1;
  version: 1;
  reason: string;
  attempt_id: string | null;
  mutation_performed: false;
  credential_access_performed: false;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedCustodianPrepareRequestDecisionV1 =
  | BuyVoidPaymentKeyedCustodianPrepareRequestReadyV1
  | BuyVoidPaymentKeyedCustodianPrepareRequestHeldV1;

type NormalizedPolicyV1 = {
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  max_void_amount_units: bigint;
  max_gas_limit: bigint;
  max_fee_per_gas_wei: bigint;
  max_priority_fee_per_gas_wei: bigint;
};

type ValidatedCallV1 = {
  attempt_id: string;
  canonical_payment_identity: string;
  canonical_payment_key_sha256: string;
  fulfillment_contract_address: string;
  delivery_address: string;
  void_amount_units: bigint;
  token_amount_atoms: bigint;
  calldata: string;
  calldata_sha256: string;
  call_fingerprint_sha256: string;
};

type NormalizedPlanV1 = {
  plan: BuyVoidDeliveryTransactionPlanV1;
  nonce: number;
  gas_limit: bigint;
  max_fee_per_gas_wei: bigint;
  max_priority_fee_per_gas_wei: bigint;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const MAX_PAYMENT_ID_CHARS = 192;
const MAX_UINT256_DECIMAL_DIGITS = 78;
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

function held(
  reason: string,
  attemptId: string | null = null,
): BuyVoidPaymentKeyedCustodianPrepareRequestHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
    version: 1,
    reason,
    attempt_id: attemptId,
    mutation_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

function normalizePolicy(
  input: BuyVoidPaymentKeyedCustodianPrepareRequestPolicyV1,
): NormalizedPolicyV1 | null {
  if (text(input?.chain_id) !== "2050") return null;
  const wallet = address(input?.fulfillment_wallet_address);
  const contract = address(input?.fulfillment_contract_address);
  const maxVoid = parsePositive(input?.max_void_amount_units);
  const maxGas = parsePositive(input?.max_gas_limit);
  const maxFee = parsePositive(input?.max_fee_per_gas_wei);
  const maxPriority = parseNonNegative(
    input?.max_priority_fee_per_gas_wei,
  );
  if (
    !wallet ||
    !contract ||
    wallet === contract ||
    maxVoid === null ||
    maxGas === null ||
    maxFee === null ||
    maxPriority === null ||
    maxPriority > maxFee
  ) {
    return null;
  }
  return {
    fulfillment_wallet_address: wallet,
    fulfillment_contract_address: contract,
    max_void_amount_units: maxVoid,
    max_gas_limit: maxGas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: maxPriority,
  };
}

function validateCall(
  call: BuyVoidPaymentKeyedFulfillmentCallReadyV1,
  expectedAttemptId: string,
  policy: Readonly<NormalizedPolicyV1>,
): ValidatedCallV1 | null {
  if (
    call?.ok !== true ||
    call.status !== "ready" ||
    call.marker !== VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1 ||
    call.version !== 1 ||
    call.chain_id !== "2050" ||
    call.value_wei !== "0" ||
    call.source_finality_ready_verified !== true ||
    call.legacy_local_payment_key_chain_authority !== false ||
    call.wallet_access_performed !== false ||
    call.signing_performed !== false ||
    call.transaction_broadcast_performed !== false ||
    call.money_movement_performed !== false
  ) {
    return null;
  }

  const attemptId = text(call.attempt_id).toLowerCase();
  const identity = text(call.canonical_payment_identity).toLowerCase();
  const key = text(call.canonical_payment_key_sha256).toLowerCase();
  const contract = address(call.fulfillment_contract_address);
  const delivery = address(call.delivery_address);
  const amountText = text(call.void_amount_units);
  const atomsText = text(call.token_amount_atoms);
  const calldata = text(call.calldata).toLowerCase();
  const calldataSha = text(call.calldata_sha256).toLowerCase();
  const callFingerprint = text(call.call_fingerprint_sha256).toLowerCase();

  if (
    !SHA256.test(attemptId) ||
    attemptId !== expectedAttemptId ||
    !identity ||
    identity.length > MAX_PAYMENT_ID_CHARS ||
    !PAYMENT_ID.test(identity) ||
    !SHA256.test(key) ||
    contract !== policy.fulfillment_contract_address ||
    !delivery ||
    !DECIMAL.test(amountText) ||
    amountText.length > MAX_UINT256_DECIMAL_DIGITS ||
    !DECIMAL.test(atomsText) ||
    atomsText.length > MAX_UINT256_DECIMAL_DIGITS ||
    !/^0x[0-9a-f]+$/.test(calldata) ||
    !SHA256.test(calldataSha) ||
    !SHA256.test(callFingerprint)
  ) {
    return null;
  }

  const identityMatch = PAYMENT_ID.exec(identity);
  if (!identityMatch || identityMatch[1] !== call.source_chain) return null;
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

  const amount = BigInt(amountText);
  const atoms = BigInt(atomsText);
  if (
    amount <= 0n ||
    amount > policy.max_void_amount_units ||
    atoms <= 0n ||
    atoms > UINT256_MAX ||
    atoms !== amount * TOKEN_ATOM_MULTIPLIER
  ) {
    return null;
  }

  const expectedCalldata = FULFILLMENT.encodeFunctionData("fulfill", [
    "0x" + key,
    delivery,
    atoms,
  ]).toLowerCase();
  if (calldata !== expectedCalldata || calldataSha !== sha256(calldata)) {
    return null;
  }

  const expectedCallFingerprint = sha256(
    JSON.stringify({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
      version: 1,
      chain_id: "2050",
      fulfillment_contract_address: contract,
      canonical_payment_identity: identity,
      canonical_payment_key_sha256: key,
      delivery_address: delivery,
      void_amount_units: amount.toString(),
      token_amount_atoms: atoms.toString(),
      value_wei: "0",
      calldata,
    }),
  );
  if (callFingerprint !== expectedCallFingerprint) return null;

  return {
    attempt_id: attemptId,
    canonical_payment_identity: identity,
    canonical_payment_key_sha256: key,
    fulfillment_contract_address: contract,
    delivery_address: delivery,
    void_amount_units: amount,
    token_amount_atoms: atoms,
    calldata,
    calldata_sha256: calldataSha,
    call_fingerprint_sha256: callFingerprint,
  };
}

function normalizePlan(
  input: BuyVoidDeliveryTransactionPlanV1,
  policy: Readonly<NormalizedPolicyV1>,
): NormalizedPlanV1 | null {
  const chainId = parseNonNegative(input?.chain_id);
  const nonceValue = parseNonNegative(input?.nonce);
  const gasLimit = parsePositive(input?.gas_limit);
  const maxFee = parsePositive(input?.max_fee_per_gas_wei);
  const priorityFee = parseNonNegative(
    input?.max_priority_fee_per_gas_wei,
  );

  if (
    chainId !== 2050n ||
    nonceValue === null ||
    nonceValue > BigInt(Number.MAX_SAFE_INTEGER) ||
    gasLimit === null ||
    gasLimit > policy.max_gas_limit ||
    maxFee === null ||
    maxFee > policy.max_fee_per_gas_wei ||
    priorityFee === null ||
    priorityFee > policy.max_priority_fee_per_gas_wei ||
    priorityFee > maxFee
  ) {
    return null;
  }

  const nonce = Number(nonceValue);
  if (!Number.isSafeInteger(nonce) || nonce < 0) return null;

  return {
    plan: {
      chain_id: "2050",
      nonce,
      gas_limit: gasLimit.toString(),
      max_fee_per_gas_wei: maxFee.toString(),
      max_priority_fee_per_gas_wei: priorityFee.toString(),
    },
    nonce,
    gas_limit: gasLimit,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priorityFee,
  };
}

export function buildBuyVoidPaymentKeyedCustodianPrepareRequestV1(input: {
  saga_id: string;
  attempt_id: string;
  plan_reservation_id: string;
  fulfillment_call: BuyVoidPaymentKeyedFulfillmentCallReadyV1;
  plan: BuyVoidDeliveryTransactionPlanV1;
  policy: BuyVoidPaymentKeyedCustodianPrepareRequestPolicyV1;
}): BuyVoidPaymentKeyedCustodianPrepareRequestDecisionV1 {
  if (
    !input ||
    !input.fulfillment_call ||
    !input.plan ||
    !input.policy
  ) {
    return held("payment_keyed_custodian_request_missing_input");
  }

  const sagaId = text(input.saga_id).toLowerCase();
  const attemptId = text(input.attempt_id).toLowerCase();
  const planReservationId = text(input.plan_reservation_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) {
    return held("payment_keyed_custodian_request_saga_id_invalid");
  }
  if (!SHA256.test(attemptId)) {
    return held("payment_keyed_custodian_request_attempt_id_invalid");
  }
  if (!SHA256.test(planReservationId)) {
    return held(
      "payment_keyed_custodian_request_plan_reservation_id_invalid",
      attemptId,
    );
  }

  const policy = normalizePolicy(input.policy);
  if (!policy) {
    return held("payment_keyed_custodian_request_policy_invalid", attemptId);
  }

  const call = validateCall(
    input.fulfillment_call,
    attemptId,
    policy,
  );
  if (!call) {
    return held(
      "payment_keyed_custodian_request_fulfillment_call_invalid",
      attemptId,
    );
  }

  const plan = normalizePlan(input.plan, policy);
  if (!plan) {
    return held(
      "payment_keyed_custodian_request_transaction_plan_invalid",
      attemptId,
    );
  }

  const transactionPlanFingerprint = sha256(
    [
      "chain_id=2050",
      "nonce=" + String(plan.nonce),
      "gas_limit=" + plan.gas_limit.toString(),
      "max_fee_per_gas_wei=" + plan.max_fee_per_gas_wei.toString(),
      "max_priority_fee_per_gas_wei=" +
        plan.max_priority_fee_per_gas_wei.toString(),
    ].join("\n"),
  );

  const unsignedTransactionFingerprint = sha256(
    [
      "chain_id=2050",
      "type=2",
      "nonce=" + String(plan.nonce),
      "gas_limit=" + plan.gas_limit.toString(),
      "max_fee_per_gas_wei=" + plan.max_fee_per_gas_wei.toString(),
      "max_priority_fee_per_gas_wei=" +
        plan.max_priority_fee_per_gas_wei.toString(),
      "to=" + call.fulfillment_contract_address,
      "value_wei=0",
      "data_sha256=" + call.calldata_sha256,
    ].join("\n"),
  );

  const requestFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
      "version=1",
      "saga_id=" + sagaId,
      "attempt_id=" + attemptId,
      "plan_reservation_id=" + planReservationId,
      "chain_id=2050",
      "wallet_address=" + policy.fulfillment_wallet_address,
      "canonical_payment_identity=" + call.canonical_payment_identity,
      "canonical_payment_key_sha256=" + call.canonical_payment_key_sha256,
      "delivery_address=" + call.delivery_address,
      "void_amount_units=" + call.void_amount_units.toString(),
      "token_amount_atoms=" + call.token_amount_atoms.toString(),
      "call_fingerprint_sha256=" + call.call_fingerprint_sha256,
      "transaction_plan_fingerprint_sha256=" + transactionPlanFingerprint,
      "unsigned_transaction_fingerprint_sha256=" +
        unsignedTransactionFingerprint,
      "transaction_to=" + call.fulfillment_contract_address,
      "transaction_value_wei=0",
      "transaction_calldata_sha256=" + call.calldata_sha256,
    ].join("\n"),
  );

  const idempotencyKey = sha256(
    [
      IDEMPOTENCY_DOMAIN,
      sagaId,
      attemptId,
      planReservationId,
      unsignedTransactionFingerprint,
      requestFingerprint,
    ].join("\n"),
  );

  const request: BuyVoidPaymentKeyedCustodianPrepareRequestV1 = {
    schema: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
    version: 1,
    idempotency_key_sha256: idempotencyKey,
    request_fingerprint_sha256: requestFingerprint,
    saga_id: sagaId,
    attempt_id: attemptId,
    plan_reservation_id: planReservationId,
    chain_id: "2050",
    wallet_address: policy.fulfillment_wallet_address,
    nonce: plan.nonce,
    transaction_to: call.fulfillment_contract_address,
    transaction_value_wei: "0",
    transaction_calldata: call.calldata,
    transaction_calldata_sha256: call.calldata_sha256,
    gas_limit: plan.gas_limit.toString(),
    max_fee_per_gas_wei: plan.max_fee_per_gas_wei.toString(),
    max_priority_fee_per_gas_wei:
      plan.max_priority_fee_per_gas_wei.toString(),
    canonical_payment_identity: call.canonical_payment_identity,
    canonical_payment_key_sha256: call.canonical_payment_key_sha256,
    delivery_address: call.delivery_address,
    void_amount_units: call.void_amount_units.toString(),
    token_amount_atoms: call.token_amount_atoms.toString(),
    call_fingerprint_sha256: call.call_fingerprint_sha256,
    transaction_plan_fingerprint_sha256: transactionPlanFingerprint,
    unsigned_transaction_fingerprint_sha256:
      unsignedTransactionFingerprint,
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
    version: 1,
    request,
    mutation_performed: false,
    credential_access_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
