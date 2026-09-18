import crypto from "node:crypto";
import { Interface, getAddress } from "ethers";

import type {
  BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  bindBuyVoidSourceFinalityPaymentV1,
  type BuyVoidSourceFinalityExecutionPreflightReadyV1,
} from "./buy_void_source_finality_execution_preflight_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_AUTHORITY_V1 = {
  source_only_contract: true,
  source_finality_ready_binding_required: true,
  canonical_payment_key_required: true,
  legacy_local_payment_key_is_not_chain_authority: true,
  fulfillment_contract_call_only: true,
  chain_id: "2050",
  transaction_value_wei: "0",
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  inventory_funding: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const PAYMENT_ID =
  /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const TOKEN_ATOM_MULTIPLIER = 1_000_000_000_000n;
const UINT256_MAX = (1n << 256n) - 1n;
const MAX_PAYMENT_ID_CHARS = 192;
const MAX_UINT256_DECIMAL_DIGITS = 78;
const FULFILLMENT = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);

export type BuyVoidVerifiedSourceFinalityPaymentBindingV1 =
  BuyVoidSourceFinalityExecutionPreflightReadyV1;

export type BuyVoidPaymentKeyedFulfillmentCallPolicyV1 = {
  chain_id: "2050";
  fulfillment_contract_address: string;
  max_void_amount_units: string;
};

export type BuyVoidPaymentKeyedFulfillmentCallReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1;
  version: 1;
  attempt_id: string;
  canonical_payment_identity: string;
  source_chain: "base" | "ethereum";
  canonical_payment_key_sha256: string;
  legacy_local_payment_key_sha256: string;
  legacy_local_payment_key_chain_authority: false;
  delivery_address: string;
  void_amount_units: string;
  token_amount_atoms: string;
  fulfillment_contract_address: string;
  chain_id: "2050";
  value_wei: "0";
  calldata: string;
  calldata_sha256: string;
  call_fingerprint_sha256: string;
  source_finality_ready_verified: true;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedFulfillmentCallHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1;
  version: 1;
  reason: string;
  attempt_id: string | null;
  wallet_access_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
};

export type BuyVoidPaymentKeyedFulfillmentCallDecisionV1 =
  | BuyVoidPaymentKeyedFulfillmentCallReadyV1
  | BuyVoidPaymentKeyedFulfillmentCallHeldV1;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function address(value: unknown): string {
  const raw = text(value);
  if (!ADDRESS.test(raw.toLowerCase())) return "";
  try {
    return getAddress(raw).toLowerCase();
  } catch {
    return "";
  }
}

function held(
  reason: string,
  attemptId: string | null = null,
): BuyVoidPaymentKeyedFulfillmentCallHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
    version: 1,
    reason,
    attempt_id: attemptId,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

export function buildBuyVoidPaymentKeyedFulfillmentCallV1(input: {
  attempt: BuyVoidExecutionAttemptStateV1;
  source_finality: BuyVoidVerifiedSourceFinalityPaymentBindingV1;
  policy: BuyVoidPaymentKeyedFulfillmentCallPolicyV1;
}): BuyVoidPaymentKeyedFulfillmentCallDecisionV1 {
  const reservation = input?.attempt?.reservation;
  const attemptId = text(reservation?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return held("payment_keyed_fulfillment_attempt_invalid");
  }

  const finality = input?.source_finality;
  if (
    finality?.ok !== true ||
    finality.marker !==
      VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1 ||
    finality.version !== 1 ||
    finality.status !== "ready" ||
    finality.process_source_identity_verified !== true ||
    finality.reviewed_source_files_verified !== true ||
    finality.authenticated_transport_identity_verified !== true ||
    finality.total_operation_deadline_verified !== true ||
    finality.source_generation_verified !== true ||
    finality.deployed_artifact_generation_verified !== true ||
    finality.ancestry_verified !== true ||
    finality.provider_quorum_verified !== true ||
    finality.production_source_finality_authority_ready !== true ||
    finality.wallet_access_performed !== false ||
    finality.signing_performed !== false ||
    finality.transaction_broadcast_performed !== false ||
    finality.money_movement_performed !== false
  ) {
    return held("payment_keyed_fulfillment_source_finality_not_ready", attemptId);
  }

  const finalityAttemptId = text(finality.attempt_id).toLowerCase();
  if (finalityAttemptId !== attemptId) {
    return held(
      "payment_keyed_fulfillment_source_finality_attempt_mismatch",
      attemptId,
    );
  }

  const canonicalIdentity = text(finality.canonical_payment_identity).toLowerCase();
  if (!canonicalIdentity || canonicalIdentity.length > MAX_PAYMENT_ID_CHARS) {
    return held(
      "payment_keyed_fulfillment_canonical_identity_invalid",
      attemptId,
    );
  }
  const identityMatch = PAYMENT_ID.exec(canonicalIdentity);
  if (!identityMatch) {
    return held(
      "payment_keyed_fulfillment_canonical_identity_invalid",
      attemptId,
    );
  }
  const sourceChain = identityMatch[1] as "base" | "ethereum";
  const canonicalTransactionHash = identityMatch[2]!.toLowerCase();
  const canonicalLogIndex = identityMatch[3]!;
  const instruction = reservation.unsigned_instruction;
  if (
    sourceChain !== finality.source_chain ||
    sourceChain !== text(instruction?.source_chain).toLowerCase() ||
    canonicalTransactionHash !==
      text(instruction?.payment_transaction_hash).toLowerCase() ||
    canonicalLogIndex !== text(instruction?.payment_log_index) ||
    canonicalIdentity !==
      text(reservation.canonical_payment_identity).toLowerCase()
  ) {
    return held(
      "payment_keyed_fulfillment_canonical_identity_mismatch",
      attemptId,
    );
  }

  const canonicalPaymentKey = text(finality.payment_key_sha256).toLowerCase();
  const legacyLocalPaymentKey = text(reservation.payment_key_sha256).toLowerCase();
  if (
    !SHA256.test(canonicalPaymentKey) ||
    !SHA256.test(legacyLocalPaymentKey)
  ) {
    return held("payment_keyed_fulfillment_payment_key_invalid", attemptId);
  }
  const verifiedPaymentBinding = bindBuyVoidSourceFinalityPaymentV1({
    source_chain: instruction?.source_chain,
    transaction_hash: instruction?.payment_transaction_hash,
    reservation_canonical_payment_identity:
      reservation.canonical_payment_identity,
    observed_canonical_payment_identity:
      finality.canonical_payment_identity,
    observed_payment_key_sha256: finality.payment_key_sha256,
  });
  if (
    !verifiedPaymentBinding ||
    verifiedPaymentBinding.canonical_payment_identity !== canonicalIdentity ||
    verifiedPaymentBinding.payment_key_sha256 !== canonicalPaymentKey
  ) {
    return held("payment_keyed_fulfillment_payment_key_invalid", attemptId);
  }

  if (text(input.policy?.chain_id) !== "2050") {
    return held("payment_keyed_fulfillment_chain_id_invalid", attemptId);
  }
  const fulfillmentContract = address(input.policy?.fulfillment_contract_address);
  const deliveryAddress = address(instruction?.delivery_address);
  if (!fulfillmentContract || !deliveryAddress) {
    return held("payment_keyed_fulfillment_address_invalid", attemptId);
  }

  const amountText = text(instruction?.void_amount_units);
  const maximumText = text(input.policy?.max_void_amount_units);
  if (
    amountText.length > MAX_UINT256_DECIMAL_DIGITS ||
    maximumText.length > MAX_UINT256_DECIMAL_DIGITS ||
    !UINT.test(amountText) ||
    !UINT.test(maximumText)
  ) {
    return held("payment_keyed_fulfillment_amount_invalid", attemptId);
  }
  const amountUnits = BigInt(amountText);
  const maximumUnits = BigInt(maximumText);
  if (
    amountUnits <= 0n ||
    maximumUnits <= 0n ||
    amountUnits > maximumUnits
  ) {
    return held("payment_keyed_fulfillment_amount_out_of_policy", attemptId);
  }
  const amountAtoms = amountUnits * TOKEN_ATOM_MULTIPLIER;
  if (amountAtoms <= 0n || amountAtoms > UINT256_MAX) {
    return held("payment_keyed_fulfillment_token_amount_out_of_range", attemptId);
  }

  const calldata = FULFILLMENT.encodeFunctionData("fulfill", [
    `0x${canonicalPaymentKey}`,
    deliveryAddress,
    amountAtoms,
  ]).toLowerCase();
  const callMaterial = JSON.stringify({
    marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
    version: 1,
    chain_id: "2050",
    fulfillment_contract_address: fulfillmentContract,
    canonical_payment_identity: canonicalIdentity,
    canonical_payment_key_sha256: canonicalPaymentKey,
    delivery_address: deliveryAddress,
    void_amount_units: amountUnits.toString(),
    token_amount_atoms: amountAtoms.toString(),
    value_wei: "0",
    calldata,
  });

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CALL_V1,
    version: 1,
    attempt_id: attemptId,
    canonical_payment_identity: canonicalIdentity,
    source_chain: sourceChain,
    canonical_payment_key_sha256: canonicalPaymentKey,
    legacy_local_payment_key_sha256: legacyLocalPaymentKey,
    legacy_local_payment_key_chain_authority: false,
    delivery_address: deliveryAddress,
    void_amount_units: amountUnits.toString(),
    token_amount_atoms: amountAtoms.toString(),
    fulfillment_contract_address: fulfillmentContract,
    chain_id: "2050",
    value_wei: "0",
    calldata,
    calldata_sha256: sha256(calldata),
    call_fingerprint_sha256: sha256(callMaterial),
    source_finality_ready_verified: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}
