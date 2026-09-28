import { Interface, Transaction, getAddress } from "ethers";

import {
  runBuyVoidErc20DeliveryReceiptReconcilerV1,
  type BuyVoidErc20DeliveryReceiptReconcilerInputV1,
  type BuyVoidErc20DeliveryReceiptRpcTransportV1,
} from "./buy_void_erc20_delivery_receipt_reconciler_v1.js";
import {
  createBuyVoidNativeChain2050BroadcasterV1,
  type BuyVoidNativeChain2050BroadcasterPolicyV1,
  type BuyVoidNativeChain2050JsonRpcTransportV1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";

export const VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_CONFIRMATION_V1 =
  "submitApprovedParticipantPostpurchaseVoidTokenTransfer";

export const VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1 = {
  source_only: true,
  explicit_apply_confirmation_required: true,
  injected_delivery_read_transport_required: true,
  injected_broadcast_transport_required: true,
  built_in_network_transport: false,
  delivery_receipt_reconciliation: true,
  participant_signature_recovery: true,
  wallet_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  automatic_retry: false,
  receipt_wait: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  runtime_route_active: false,
  public_submission_open: false,
  transaction_submission_when_apply: true,
  transaction_broadcast_when_apply: true,
  token_movement_may_occur_when_apply: true,
  funds_movement_may_occur_when_apply: true,
} as const;

const EXPECTED_CHAIN_ID = 2050n;
const EXPECTED_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const MAX_GAS_LIMIT = 3_000_000n;
const MAX_RAW_TRANSACTION_BYTES = 131_072;
const RAW_TRANSACTION = /^0x[0-9a-fA-F]+$/;
const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/;

const TOKEN_INTERFACE = new Interface([
  "function transfer(address to,uint256 amount) returns (bool)",
]);

type DeliveryInputWithTransportV1 =
  Omit<BuyVoidErc20DeliveryReceiptReconcilerInputV1, "transport"> & {
    transport: BuyVoidErc20DeliveryReceiptRpcTransportV1;
  };

export type VoidParticipantPostpurchaseRawSubmissionInputV1 = {
  delivery_reconciliation: DeliveryInputWithTransportV1;
  raw_signed_transaction: string;
  broadcast_policy: BuyVoidNativeChain2050BroadcasterPolicyV1;
  broadcast_transport: BuyVoidNativeChain2050JsonRpcTransportV1;
  apply: boolean;
  confirmation: string;
};

type HeldV1 = {
  ok: false;
  marker: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1;
  version: 1;
  status: "held";
  reason: string;
  transaction_hash: string | null;
  provider_submission_id: string;
  submission_may_have_occurred: boolean;
  automatic_retry: false;
  receipt_finality_verified: false;
  participant_postpurchase_voidtoken_control_ready: false;
  transaction_submission_performed: boolean;
  transaction_broadcast_performed: false;
  authoritative_chain2050_write_verified: false;
  token_movement_confirmed: false;
  funds_movement_confirmed: false;
  authority: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1;
  detail?: Record<string, unknown>;
};

type PlanV1 = {
  ok: true;
  marker: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1;
  version: 1;
  status: "plan_ready";
  required_confirmation:
    typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_CONFIRMATION_V1;
  live_transport_called: false;
  transaction_submission_performed: false;
  transaction_broadcast_performed: false;
  receipt_finality_verified: false;
  participant_postpurchase_voidtoken_control_ready: false;
  authority: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1;
};

type SubmittedV1 = {
  ok: true;
  marker: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1;
  version: 1;
  status: "submission_accepted_finality_required";
  chain_id: "2050";
  participant_address: string;
  void_token: string;
  transfer_recipient: string;
  transfer_amount_atoms: string;
  transaction_hash: string;
  provider_submission_id: string;
  submission_may_have_occurred: true;
  automatic_retry: false;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_output: false;
  participant_private_key_accessed: false;
  delivery_reconciliation_confirmed: true;
  participant_signature_recovered: true;
  delivery_recipient_equals_signer: true;
  canonical_voidtoken_transfer_verified: true;
  zero_native_value_verified: true;
  zero_gas_price_policy_bound: true;
  transaction_submission_performed: true;
  transaction_broadcast_performed: true;
  receipt_finality_verified: false;
  participant_postpurchase_voidtoken_control_ready: false;
  authoritative_chain2050_write_verified: false;
  token_movement_confirmed: false;
  funds_movement_confirmed: false;
  authority: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1;
};

type AmbiguousV1 = {
  ok: false;
  marker: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1;
  version: 1;
  status: "ambiguous_reconciliation_required";
  reason: "submission_outcome_ambiguous";
  transaction_hash: string;
  provider_submission_id: string;
  submission_may_have_occurred: true;
  automatic_retry: false;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_output: false;
  participant_private_key_accessed: false;
  transaction_submission_performed: true;
  transaction_broadcast_performed: false;
  receipt_finality_verified: false;
  participant_postpurchase_voidtoken_control_ready: false;
  authoritative_chain2050_write_verified: false;
  token_movement_confirmed: false;
  funds_movement_confirmed: false;
  authority: typeof VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1;
};

export type VoidParticipantPostpurchaseRawSubmissionDecisionV1 =
  | HeldV1
  | PlanV1
  | SubmittedV1
  | AmbiguousV1;

function held(
  reason: string,
  options: {
    transactionHash?: string | null;
    providerSubmissionId?: string;
    submissionMayHaveOccurred?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): HeldV1 {
  return {
    ok: false,
    marker: VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1,
    version: 1,
    status: "held",
    reason,
    transaction_hash: options.transactionHash ?? null,
    provider_submission_id: options.providerSubmissionId ?? "",
    submission_may_have_occurred:
      options.submissionMayHaveOccurred === true,
    automatic_retry: false,
    receipt_finality_verified: false,
    participant_postpurchase_voidtoken_control_ready: false,
    transaction_submission_performed:
      options.submissionMayHaveOccurred === true,
    transaction_broadcast_performed: false,
    authoritative_chain2050_write_verified: false,
    token_movement_confirmed: false,
    funds_movement_confirmed: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizeAddress(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return null;
  try {
    const normalized = getAddress(raw).toLowerCase();
    return normalized ===
        "0x0000000000000000000000000000000000000000"
      ? null
      : normalized;
  } catch {
    return null;
  }
}

function normalizeHash(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return TRANSACTION_HASH.test(raw) ? raw : null;
}

function normalizeProviderSubmissionId(value: unknown): string {
  const raw = String(value ?? "").trim();
  return /^[A-Za-z0-9._:@/-]{0,200}$/.test(raw) ? raw : "";
}

function inspectParticipantTransfer(
  rawSignedTransaction: string,
  delivery: {
    delivery_address: string;
    void_token_address: string;
    token_amount_atoms: string;
  },
):
  | {
      ok: true;
      transaction_hash: string;
      signer: string;
      token: string;
      recipient: string;
      amount_atoms: string;
    }
  | { ok: false; reason: string } {
  const raw = String(rawSignedTransaction ?? "").trim();
  if (
    !RAW_TRANSACTION.test(raw) ||
    raw.length % 2 !== 0 ||
    (raw.length - 2) / 2 > MAX_RAW_TRANSACTION_BYTES
  ) {
    return { ok: false, reason: "raw_transaction_invalid" };
  }

  let tx: Transaction;
  try {
    tx = Transaction.from(raw);
  } catch {
    return { ok: false, reason: "raw_transaction_decode_failed" };
  }
  if (!tx.isSigned()) {
    return { ok: false, reason: "raw_transaction_signature_required" };
  }

  const signer = normalizeAddress(tx.from);
  const deliveryAddress = normalizeAddress(delivery.delivery_address);
  if (!signer || !deliveryAddress || signer !== deliveryAddress) {
    return {
      ok: false,
      reason: "raw_transaction_signer_not_delivery_recipient",
    };
  }

  if (BigInt(tx.chainId) !== EXPECTED_CHAIN_ID) {
    return { ok: false, reason: "raw_transaction_chain_id_mismatch" };
  }
  if (tx.type !== 2) {
    return { ok: false, reason: "raw_transaction_type_mismatch" };
  }

  const token = normalizeAddress(tx.to);
  const deliveryToken = normalizeAddress(delivery.void_token_address);
  if (
    !token ||
    !deliveryToken ||
    token !== EXPECTED_VOID_TOKEN ||
    deliveryToken !== EXPECTED_VOID_TOKEN
  ) {
    return { ok: false, reason: "raw_transaction_voidtoken_mismatch" };
  }

  if (BigInt(tx.value) !== 0n) {
    return { ok: false, reason: "raw_transaction_native_value_forbidden" };
  }
  if (tx.maxFeePerGas === null || BigInt(tx.maxFeePerGas) !== 0n) {
    return { ok: false, reason: "raw_transaction_max_fee_mismatch" };
  }
  if (
    tx.maxPriorityFeePerGas === null ||
    BigInt(tx.maxPriorityFeePerGas) !== 0n
  ) {
    return {
      ok: false,
      reason: "raw_transaction_priority_fee_mismatch",
    };
  }

  const gasLimit = BigInt(tx.gasLimit);
  if (gasLimit < 21_000n || gasLimit > MAX_GAS_LIMIT) {
    return { ok: false, reason: "raw_transaction_gas_limit_invalid" };
  }
  if (!Number.isSafeInteger(tx.nonce) || tx.nonce < 0) {
    return { ok: false, reason: "raw_transaction_nonce_invalid" };
  }

  let decoded;
  try {
    decoded = TOKEN_INTERFACE.decodeFunctionData("transfer", tx.data);
  } catch {
    return {
      ok: false,
      reason: "raw_transaction_not_voidtoken_transfer",
    };
  }

  const recipient = normalizeAddress(String(decoded[0]));
  if (!recipient) {
    return { ok: false, reason: "raw_transaction_recipient_invalid" };
  }
  const amount = BigInt(decoded[1]);
  if (amount <= 0n) {
    return { ok: false, reason: "raw_transaction_amount_invalid" };
  }

  let deliveredAtoms: bigint;
  try {
    if (
      !/^(0|[1-9][0-9]*)$/.test(delivery.token_amount_atoms)
    ) {
      return { ok: false, reason: "delivery_amount_invalid" };
    }
    deliveredAtoms = BigInt(delivery.token_amount_atoms);
  } catch {
    return { ok: false, reason: "delivery_amount_invalid" };
  }
  if (deliveredAtoms <= 0n) {
    return { ok: false, reason: "delivery_amount_invalid" };
  }
  if (amount > deliveredAtoms) {
    return {
      ok: false,
      reason: "raw_transaction_amount_exceeds_delivered_lot",
    };
  }

  const transactionHash = normalizeHash(tx.hash);
  if (!transactionHash) {
    return { ok: false, reason: "raw_transaction_hash_invalid" };
  }

  return {
    ok: true,
    transaction_hash: transactionHash,
    signer,
    token,
    recipient,
    amount_atoms: amount.toString(),
  };
}

function hasInjectedDeliveryTransport(
  input: BuyVoidErc20DeliveryReceiptReconcilerInputV1,
): input is DeliveryInputWithTransportV1 {
  return typeof input?.transport === "function";
}

function hasInjectedBroadcastTransport(
  value: BuyVoidNativeChain2050JsonRpcTransportV1,
): boolean {
  return Boolean(value && typeof value.call === "function");
}

export async function runVoidParticipantPostpurchaseRawSubmissionV1(
  input: Readonly<VoidParticipantPostpurchaseRawSubmissionInputV1>,
): Promise<VoidParticipantPostpurchaseRawSubmissionDecisionV1> {
  if (input?.apply !== true) {
    return {
      ok: true,
      marker: VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1,
      version: 1,
      status: "plan_ready",
      required_confirmation:
        VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_CONFIRMATION_V1,
      live_transport_called: false,
      transaction_submission_performed: false,
      transaction_broadcast_performed: false,
      receipt_finality_verified: false,
      participant_postpurchase_voidtoken_control_ready: false,
      authority:
        VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1,
    };
  }

  if (
    input.confirmation !==
    VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_CONFIRMATION_V1
  ) {
    return held("explicit_confirmation_required");
  }
  if (!hasInjectedDeliveryTransport(input.delivery_reconciliation)) {
    return held("injected_delivery_transport_required");
  }
  if (!hasInjectedBroadcastTransport(input.broadcast_transport)) {
    return held("injected_broadcast_transport_required");
  }

  const delivery = await runBuyVoidErc20DeliveryReceiptReconcilerV1(
    input.delivery_reconciliation,
  );
  if (!delivery.ok || delivery.status !== "confirmed") {
    return held("delivery_reconciliation_required", {
      transactionHash: delivery.transaction_hash,
      detail: "reason" in delivery
        ? { delivery_reason: delivery.reason }
        : undefined,
    });
  }

  const inspected = inspectParticipantTransfer(
    input.raw_signed_transaction,
    delivery,
  );
  if (inspected.ok === false) {
    return held(inspected.reason);
  }

  const broadcasterDecision =
    await createBuyVoidNativeChain2050BroadcasterV1(
      input.broadcast_policy,
      input.broadcast_transport,
    );
  if (broadcasterDecision.ok === false) {
    return held("chain2050_broadcaster_not_ready", {
      providerSubmissionId:
        broadcasterDecision.provider_submission_id,
      detail: {
        broadcaster_reason: broadcasterDecision.reason,
      },
    });
  }

  const result =
    await broadcasterDecision.broadcaster.broadcast_signed_transaction(
      input.raw_signed_transaction,
    );
  const providerSubmissionId =
    normalizeProviderSubmissionId(result.provider_submission_id);

  if (!result.accepted) {
    const returnedHash =
      normalizeHash(result.transaction_hash) ??
      inspected.transaction_hash;
    if (result.submission_may_have_occurred) {
      return {
        ok: false,
        marker: VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1,
        version: 1,
        status: "ambiguous_reconciliation_required",
        reason: "submission_outcome_ambiguous",
        transaction_hash: returnedHash,
        provider_submission_id: providerSubmissionId,
        submission_may_have_occurred: true,
        automatic_retry: false,
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_output: false,
        participant_private_key_accessed: false,
        transaction_submission_performed: true,
        transaction_broadcast_performed: false,
        receipt_finality_verified: false,
        participant_postpurchase_voidtoken_control_ready: false,
        authoritative_chain2050_write_verified: false,
        token_movement_confirmed: false,
        funds_movement_confirmed: false,
        authority:
          VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1,
      };
    }
    return held("transaction_submission_not_accepted", {
      transactionHash: returnedHash,
      providerSubmissionId,
    });
  }

  const acceptedHash = normalizeHash(result.transaction_hash);
  if (acceptedHash !== inspected.transaction_hash) {
    return {
      ok: false,
      marker: VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1,
      version: 1,
      status: "ambiguous_reconciliation_required",
      reason: "submission_outcome_ambiguous",
      transaction_hash:
        acceptedHash ?? inspected.transaction_hash,
      provider_submission_id: providerSubmissionId,
      submission_may_have_occurred: true,
      automatic_retry: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_output: false,
      participant_private_key_accessed: false,
      transaction_submission_performed: true,
      transaction_broadcast_performed: false,
      receipt_finality_verified: false,
      participant_postpurchase_voidtoken_control_ready: false,
      authoritative_chain2050_write_verified: false,
      token_movement_confirmed: false,
      funds_movement_confirmed: false,
      authority:
        VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1,
    };
  }

  return {
    ok: true,
    marker: VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1,
    version: 1,
    status: "submission_accepted_finality_required",
    chain_id: "2050",
    participant_address: inspected.signer,
    void_token: inspected.token,
    transfer_recipient: inspected.recipient,
    transfer_amount_atoms: inspected.amount_atoms,
    transaction_hash: inspected.transaction_hash,
    provider_submission_id: providerSubmissionId,
    submission_may_have_occurred: true,
    automatic_retry: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_output: false,
    participant_private_key_accessed: false,
    delivery_reconciliation_confirmed: true,
    participant_signature_recovered: true,
    delivery_recipient_equals_signer: true,
    canonical_voidtoken_transfer_verified: true,
    zero_native_value_verified: true,
    zero_gas_price_policy_bound: true,
    transaction_submission_performed: true,
    transaction_broadcast_performed: true,
    receipt_finality_verified: false,
    participant_postpurchase_voidtoken_control_ready: false,
    authoritative_chain2050_write_verified: false,
    token_movement_confirmed: false,
    funds_movement_confirmed: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_AUTHORITY_V1,
  };
}
