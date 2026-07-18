import crypto from "node:crypto";
import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";

export const VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1 =
  "VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1";

export const VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_AUTHORITY_V1 = {
  rpc_call: false,
  filesystem_read: false,
  filesystem_write: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  money_movement: false,
  fulfillment_truth_decision: true,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_32 = /^0x[0-9a-f]{64}$/;

export type BuyVoidDeliveryObservationV1 = {
  chain_id?: unknown;
  transaction_hash?: unknown;
  transaction_status?: unknown;
  block_number?: unknown;
  current_block_number?: unknown;
  from_address?: unknown;
  to_address?: unknown;
  amount_units?: unknown;
};

export type BuyVoidFulfillmentConfirmationPolicyV1 = {
  chain_id: string | number;
  min_confirmations: string | number;
  fulfillment_wallet_allowlist: string[];
};

export type BuyVoidConfirmedFulfillmentRecordV1 = {
  schema: "void_buy_void_confirmed_fulfillment_record_v1";
  marker: typeof VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1;
  status: "fulfilled_confirmed";
  canonical_payment_identity: string;
  canonical_payment_identity_sha256: string;
  request_id: string;
  instruction_id: string;
  source_payment_chain: string;
  payment_transaction_hash: string;
  payment_log_index: string;
  delivery_chain_id: string;
  void_delivery_tx_hash: string;
  delivery_block_number: string;
  delivery_confirmation_count: string;
  fulfillment_wallet: string;
  delivery_address: string;
  void_amount_units: string;
  delivery_binding_fingerprint: string;
  buyer_fulfilled: true;
  automatic_fulfillment_completed: true;
  payment_claim_persisted: true;
  delivery_confirmation_observed: true;
  signing_authorized_by_this_module: false;
  transaction_broadcast_authorized_by_this_module: false;
  money_movement_authorized_by_this_module: false;
};

export type BuyVoidFulfillmentConfirmationDecisionV1 =
  | {
      ok: true;
      status: "confirmed";
      duplicate: false;
      new_confirmation: true;
      record: BuyVoidConfirmedFulfillmentRecordV1;
      observed_confirmation_count: string;
    }
  | {
      ok: true;
      status: "duplicate";
      duplicate: true;
      new_confirmation: false;
      record: BuyVoidConfirmedFulfillmentRecordV1;
      observed_confirmation_count: string;
    }
  | {
      ok: false;
      status: "held";
      duplicate: false;
      new_confirmation: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type ConfirmBuyVoidFulfillmentInputV1 = {
  intent: BuyVoidFulfillmentJournalIntentV1;
  observation: BuyVoidDeliveryObservationV1;
  policy: BuyVoidFulfillmentConfirmationPolicyV1;
  prior_results?: BuyVoidConfirmedFulfillmentRecordV1[];
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidFulfillmentConfirmationDecisionV1 {
  return {
    ok: false,
    status: "held",
    duplicate: false,
    new_confirmation: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    if (/^0x[0-9a-f]+$/.test(raw) || /^[0-9]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
  } catch {
    return null;
  }
  return null;
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256Hex(
    Object.keys(parts)
      .sort()
      .map((key) => `${key}=${parts[key]}`)
      .join("\n"),
  );
}

function validIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
): { ok: true } | { ok: false; reason: string } {
  if (!intent || typeof intent !== "object") {
    return { ok: false, reason: "missing_fulfillment_intent" };
  }
  if (
    intent.schema !== "void_buy_void_fulfillment_journal_intent_v1" ||
    intent.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1
  ) {
    return { ok: false, reason: "invalid_fulfillment_intent_marker" };
  }
  if (
    intent.signing_authorized !== false ||
    intent.transaction_broadcast_authorized !== false ||
    intent.money_movement_authorized !== false
  ) {
    return { ok: false, reason: "intent_authority_boundary_violation" };
  }

  const claim = intent.claim;
  const instruction = claim?.unsigned_instruction;
  if (
    claim?.schema !== "void_buy_void_fulfillment_claim_v1" ||
    claim?.status !== "claimed" ||
    !instruction ||
    instruction.schema !== "void_buy_void_unsigned_fulfillment_instruction_v1"
  ) {
    return { ok: false, reason: "invalid_claim_shape" };
  }
  if (
    instruction.signing_authorized !== false ||
    instruction.transaction_broadcast_authorized !== false ||
    instruction.automatic_execution_authorized !== false
  ) {
    return { ok: false, reason: "instruction_authority_boundary_violation" };
  }
  if (
    claim.canonical_payment_identity !== instruction.canonical_payment_identity ||
    claim.request_id !== instruction.request_id ||
    claim.instruction_id !== instruction.instruction_id
  ) {
    return { ok: false, reason: "claim_instruction_binding_mismatch" };
  }

  const binding = intent.verification_binding;
  if (
    binding.source_chain !== instruction.source_chain ||
    binding.payment_transaction_hash !== instruction.payment_transaction_hash ||
    binding.payment_log_index !== instruction.payment_log_index ||
    binding.delivery_address !== instruction.delivery_address ||
    binding.quoted_void_units !== instruction.void_amount_units
  ) {
    return { ok: false, reason: "verification_instruction_binding_mismatch" };
  }

  return { ok: true };
}

function successStatus(value: unknown): boolean {
  return parseNonNegativeInteger(value) === 1n;
}

export function confirmBuyVoidFulfillmentV1(
  input: ConfirmBuyVoidFulfillmentInputV1,
): BuyVoidFulfillmentConfirmationDecisionV1 {
  const intent = input?.intent;
  const observation = input?.observation;
  const policy = input?.policy;
  if (!intent || !observation || !policy) return held("missing_input");

  const intentCheck = validIntent(intent);
  if ("reason" in intentCheck) return held(intentCheck.reason);

  const expectedChainId = parseNonNegativeInteger(policy.chain_id);
  const observedChainId = parseNonNegativeInteger(observation.chain_id);
  if (expectedChainId === null || expectedChainId <= 0n) {
    return held("invalid_delivery_chain_policy");
  }
  if (observedChainId === null || observedChainId !== expectedChainId) {
    return held("delivery_chain_mismatch", {
      expected_chain_id: expectedChainId.toString(),
      observed_chain_id:
        observedChainId === null ? "invalid" : observedChainId.toString(),
    });
  }

  const minConfirmations = parseNonNegativeInteger(policy.min_confirmations);
  if (minConfirmations === null || minConfirmations <= 0n) {
    return held("invalid_confirmation_policy");
  }

  const walletAllowlist = new Set(
    (policy.fulfillment_wallet_allowlist || [])
      .map(normalizeAddress)
      .filter(Boolean),
  );
  if (walletAllowlist.size === 0) return held("empty_fulfillment_wallet_allowlist");

  const transactionHash = normalizeHash(observation.transaction_hash);
  const paymentTransactionHash = normalizeHash(
    intent.verification_binding.payment_transaction_hash,
  );
  if (!transactionHash) return held("invalid_void_delivery_tx_hash");
  if (!paymentTransactionHash) return held("invalid_payment_transaction_hash");
  if (transactionHash === paymentTransactionHash) {
    return held("delivery_tx_matches_payment_tx");
  }

  if (!successStatus(observation.transaction_status)) {
    return held("void_delivery_tx_failed");
  }

  const deliveryBlockNumber = parseNonNegativeInteger(observation.block_number);
  const currentBlockNumber = parseNonNegativeInteger(
    observation.current_block_number,
  );
  if (deliveryBlockNumber === null || deliveryBlockNumber <= 0n) {
    return held("missing_delivery_block_number");
  }
  if (currentBlockNumber === null || currentBlockNumber < deliveryBlockNumber) {
    return held("invalid_delivery_current_block_number");
  }

  const confirmations = currentBlockNumber - deliveryBlockNumber + 1n;
  if (confirmations < minConfirmations) {
    return held("insufficient_delivery_confirmations", {
      observed_confirmations: confirmations.toString(),
      required_confirmations: minConfirmations.toString(),
    });
  }

  const fulfillmentWallet = normalizeAddress(observation.from_address);
  if (!fulfillmentWallet || !walletAllowlist.has(fulfillmentWallet)) {
    return held("fulfillment_wallet_not_allowlisted");
  }

  const deliveryAddress = normalizeAddress(observation.to_address);
  const expectedDeliveryAddress = normalizeAddress(
    intent.claim.unsigned_instruction.delivery_address,
  );
  if (!deliveryAddress || deliveryAddress !== expectedDeliveryAddress) {
    return held("delivery_address_mismatch");
  }

  const amountUnits = parseNonNegativeInteger(observation.amount_units);
  const expectedAmountUnits = parseNonNegativeInteger(
    intent.claim.unsigned_instruction.void_amount_units,
  );
  if (
    amountUnits === null ||
    amountUnits <= 0n ||
    expectedAmountUnits === null ||
    expectedAmountUnits <= 0n
  ) {
    return held("invalid_void_delivery_amount");
  }
  if (amountUnits !== expectedAmountUnits) {
    return held("void_delivery_amount_mismatch", {
      expected_void_amount_units: expectedAmountUnits.toString(),
      observed_void_amount_units: amountUnits.toString(),
    });
  }

  const instruction = intent.claim.unsigned_instruction;
  const record: BuyVoidConfirmedFulfillmentRecordV1 = {
    schema: "void_buy_void_confirmed_fulfillment_record_v1",
    marker: VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1,
    status: "fulfilled_confirmed",
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    canonical_payment_identity_sha256:
      intent.claim.canonical_payment_identity_sha256,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    source_payment_chain: instruction.source_chain,
    payment_transaction_hash: instruction.payment_transaction_hash,
    payment_log_index: instruction.payment_log_index,
    delivery_chain_id: expectedChainId.toString(),
    void_delivery_tx_hash: transactionHash,
    delivery_block_number: deliveryBlockNumber.toString(),
    delivery_confirmation_count: confirmations.toString(),
    fulfillment_wallet: fulfillmentWallet,
    delivery_address: deliveryAddress,
    void_amount_units: amountUnits.toString(),
    delivery_binding_fingerprint: stableFingerprint({
      canonical_payment_identity: intent.claim.canonical_payment_identity,
      request_id: intent.claim.request_id,
      instruction_id: intent.claim.instruction_id,
      delivery_chain_id: expectedChainId.toString(),
      void_delivery_tx_hash: transactionHash,
      delivery_block_number: deliveryBlockNumber.toString(),
      fulfillment_wallet: fulfillmentWallet,
      delivery_address: deliveryAddress,
      void_amount_units: amountUnits.toString(),
    }),
    buyer_fulfilled: true,
    automatic_fulfillment_completed: true,
    payment_claim_persisted: true,
    delivery_confirmation_observed: true,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };

  const priorResults = Array.isArray(input.prior_results)
    ? input.prior_results
    : [];
  for (const prior of priorResults) {
    const priorTxHash = normalizeHash(prior?.void_delivery_tx_hash);
    if (!priorTxHash) return held("malformed_prior_fulfillment_result");

    if (priorTxHash === transactionHash) {
      if (
        prior.canonical_payment_identity !== record.canonical_payment_identity ||
        prior.request_id !== record.request_id ||
        prior.instruction_id !== record.instruction_id ||
        prior.delivery_binding_fingerprint !== record.delivery_binding_fingerprint
      ) {
        return held("delivery_tx_replay_conflict", {
          void_delivery_tx_hash: transactionHash,
          prior_request_id: prior.request_id,
          attempted_request_id: record.request_id,
        });
      }

      const priorConfirmations = parseNonNegativeInteger(
        prior.delivery_confirmation_count,
      );
      if (priorConfirmations === null) {
        return held("malformed_prior_confirmation_count");
      }
      if (confirmations < priorConfirmations) {
        return held("delivery_confirmation_count_regression", {
          prior_confirmation_count: priorConfirmations.toString(),
          attempted_confirmation_count: confirmations.toString(),
        });
      }

      return {
        ok: true,
        status: "duplicate",
        duplicate: true,
        new_confirmation: false,
        record: prior,
        observed_confirmation_count: confirmations.toString(),
      };
    }

    if (
      prior.canonical_payment_identity === record.canonical_payment_identity ||
      prior.request_id === record.request_id ||
      prior.instruction_id === record.instruction_id
    ) {
      return held("fulfillment_instruction_already_confirmed", {
        prior_void_delivery_tx_hash: priorTxHash,
        attempted_void_delivery_tx_hash: transactionHash,
      });
    }
  }

  return {
    ok: true,
    status: "confirmed",
    duplicate: false,
    new_confirmation: true,
    record,
    observed_confirmation_count: confirmations.toString(),
  };
}
