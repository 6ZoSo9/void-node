import { createHash } from "node:crypto";

import {
  deriveWcVoidCoupledOpeningStateV1,
  verifyWcVoidOpeningLedgerSettlementsV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_WC_VOID_OPENING_CLAIM_BINDING_V1 =
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_V1";

export const VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1 =
  "void.wc-void-opening-transfer-claim.v1";

export const VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1 =
  "void.wc-void-opening-refund-claim.v1";

export const VOID_WC_VOID_OPENING_CLAIM_BINDING_AUTHORITY_V1 = Object.freeze({
  source_only: true,
  explicit_input_only: true,
  cohort_atomic_outcome_required: true,
  ledger_write: false,
  wc_issuance: false,
  wc_balance_mutation: false,
  token_transfer: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SAFE_ACCOUNT = /^[A-Za-z0-9._:@-]{3,128}$/u;
const LOWER_EVM_ADDRESS = /^0x[0-9a-f]{40}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_SET_SIZE = 1_000_000;

const REQUEST_KEYS = Object.freeze([
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
  "mode",
  "dispositions",
]);

const TRANSFER_KEYS = Object.freeze([
  "schema",
  "disposition_id",
  "coupled_launch_id",
  "opening_state_id",
  "commitment_id",
  "settlement_id",
  "participant_id",
  "account",
  "void_recipient",
  "void_atoms",
]);

const REFUND_KEYS = Object.freeze([
  "schema",
  "disposition_id",
  "coupled_launch_id",
  "opening_state_id",
  "commitment_id",
  "settlement_id",
  "participant_id",
  "account",
  "wc_refund_units",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code);
  const actual = ownKeys.sort(compareText);
  const expected = [...keys].sort(compareText);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const snapshot = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function exactArray(value, code) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1 ||
    value.length > MAX_SET_SIZE
  ) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) fail(code);
  const out = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out.push(descriptor.value);
  }
  return out;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalAccount(value, code) {
  if (typeof value !== "string" || !SAFE_ACCOUNT.test(value)) fail(code);
  return value;
}

function canonicalAddress(value, code) {
  if (typeof value !== "string" || !LOWER_EVM_ADDRESS.test(value)) fail(code);
  if (value === "0x0000000000000000000000000000000000000000") fail(code);
  return value;
}

function positiveUintString(value, code) {
  if (typeof value !== "string" || !UINT.test(value) || BigInt(value) <= 0n) {
    fail(code);
  }
  return BigInt(value);
}

function transferPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    opening_state_id: value.opening_state_id,
    commitment_id: value.commitment_id,
    settlement_id: value.settlement_id,
    participant_id: value.participant_id,
    account: value.account,
    void_recipient: value.void_recipient,
    void_atoms: value.void_atoms,
  });
}

function refundPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    opening_state_id: value.opening_state_id,
    commitment_id: value.commitment_id,
    settlement_id: value.settlement_id,
    participant_id: value.participant_id,
    account: value.account,
    wc_refund_units: value.wc_refund_units,
  });
}

export function wcVoidOpeningTransferDispositionIdV1(value) {
  const disposition = exactObject(
    value,
    TRANSFER_KEYS,
    "INVALID_WC_VOID_OPENING_TRANSFER_CLAIM_SHAPE",
  );
  return digest(transferPayload(disposition));
}

export function wcVoidOpeningRefundDispositionIdV1(value) {
  const disposition = exactObject(
    value,
    REFUND_KEYS,
    "INVALID_WC_VOID_OPENING_REFUND_CLAIM_SHAPE",
  );
  return digest(refundPayload(disposition));
}

export function deriveWcVoidOpeningClaimBindingV1(input) {
  const request = exactObject(
    input,
    REQUEST_KEYS,
    "INVALID_WC_VOID_OPENING_CLAIM_BINDING_REQUEST_SHAPE",
  );

  const launchId = canonicalSha(
    request.coupled_launch_id,
    "INVALID_COUPLED_LAUNCH_ID",
  );
  if (request.mode !== "finalize" && request.mode !== "abort") {
    fail("INVALID_WC_VOID_OPENING_CLAIM_BINDING_MODE");
  }

  const openingState = deriveWcVoidCoupledOpeningStateV1({
    coupled_launch_id: launchId,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
  });
  const settlementSet = verifyWcVoidOpeningLedgerSettlementsV1(
    launchId,
    request.commitments,
    request.ledger_debits,
  );
  const dispositions = exactArray(
    request.dispositions,
    "INVALID_WC_VOID_OPENING_DISPOSITION_SET",
  );

  if (dispositions.length !== openingState.participant_commitment_count) {
    fail("WC_VOID_OPENING_DISPOSITION_COUNT_MISMATCH");
  }

  const allocationsByCommitment = new Map(
    openingState.participant_allocations.map((value) => [
      value.commitment_id,
      value,
    ]),
  );
  const settlementsByCommitment = new Map(
    settlementSet.settlements.map((value) => [
      value.commitment_id,
      value,
    ]),
  );

  const seenDispositionIds = new Set();
  const seenCommitments = new Set();
  let transferredVoidAtoms = 0n;
  let refundedWcUnits = 0n;

  const canonical = dispositions.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      fail("INVALID_WC_VOID_OPENING_DISPOSITION_SHAPE");
    }

    const isTransfer =
      raw.schema === VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1;
    const isRefund =
      raw.schema === VOID_WC_VOID_OPENING_REFUND_CLAIM_SCHEMA_V1;

    if (!isTransfer && !isRefund) {
      fail("INVALID_WC_VOID_OPENING_DISPOSITION_SCHEMA");
    }
    if (
      (request.mode === "finalize" && !isTransfer) ||
      (request.mode === "abort" && !isRefund)
    ) {
      fail("WC_VOID_OPENING_COHORT_ATOMICITY_VIOLATION");
    }

    const value = exactObject(
      raw,
      isTransfer ? TRANSFER_KEYS : REFUND_KEYS,
      isTransfer
        ? "INVALID_WC_VOID_OPENING_TRANSFER_CLAIM_SHAPE"
        : "INVALID_WC_VOID_OPENING_REFUND_CLAIM_SHAPE",
    );

    canonicalSha(value.disposition_id, "INVALID_WC_VOID_OPENING_DISPOSITION_ID");
    canonicalSha(value.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
    canonicalSha(value.opening_state_id, "INVALID_WC_VOID_OPENING_STATE_ID");
    canonicalSha(value.commitment_id, "INVALID_WC_VOID_OPENING_COMMITMENT_ID");
    canonicalSha(value.settlement_id, "INVALID_WC_VOID_OPENING_SETTLEMENT_ID");
    canonicalSha(value.participant_id, "INVALID_WC_VOID_OPENING_PARTICIPANT_ID");
    canonicalAccount(value.account, "INVALID_WC_VOID_OPENING_ACCOUNT");

    if (value.coupled_launch_id !== launchId) {
      fail("WC_VOID_OPENING_DISPOSITION_LAUNCH_MISMATCH");
    }
    if (value.opening_state_id !== openingState.opening_state_id) {
      fail("WC_VOID_OPENING_DISPOSITION_STATE_MISMATCH");
    }

    const allocation = allocationsByCommitment.get(value.commitment_id);
    const settlement = settlementsByCommitment.get(value.commitment_id);
    if (!allocation || !settlement) {
      fail("UNKNOWN_WC_VOID_OPENING_DISPOSITION_COMMITMENT");
    }
    if (
      allocation.participant_id !== value.participant_id ||
      allocation.account !== value.account ||
      settlement.account !== value.account ||
      settlement.settlement_id !== value.settlement_id
    ) {
      fail("WC_VOID_OPENING_DISPOSITION_BINDING_MISMATCH");
    }

    if (seenDispositionIds.has(value.disposition_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_DISPOSITION_ID");
    }
    if (seenCommitments.has(value.commitment_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_DISPOSITION_COMMITMENT");
    }

    let canonicalValue;
    if (isTransfer) {
      canonicalAddress(
        value.void_recipient,
        "INVALID_WC_VOID_OPENING_VOID_RECIPIENT",
      );
      const atoms = positiveUintString(
        value.void_atoms,
        "INVALID_WC_VOID_OPENING_VOID_ATOMS",
      );
      if (atoms !== BigInt(allocation.void_atoms)) {
        fail("WC_VOID_OPENING_TRANSFER_ALLOCATION_MISMATCH");
      }
      if (
        wcVoidOpeningTransferDispositionIdV1(value) !== value.disposition_id
      ) {
        fail("WC_VOID_OPENING_TRANSFER_CLAIM_DIGEST_MISMATCH");
      }
      transferredVoidAtoms += atoms;
      canonicalValue = Object.freeze({
        schema: value.schema,
        disposition_id: value.disposition_id,
        commitment_id: value.commitment_id,
        settlement_id: value.settlement_id,
        participant_id: value.participant_id,
        account: value.account,
        void_recipient: value.void_recipient,
        void_atoms: value.void_atoms,
      });
    } else {
      const refundUnits = positiveUintString(
        value.wc_refund_units,
        "INVALID_WC_VOID_OPENING_REFUND_UNITS",
      );
      if (refundUnits !== BigInt(settlement.amount_wc)) {
        fail("WC_VOID_OPENING_REFUND_AMOUNT_MISMATCH");
      }
      if (
        wcVoidOpeningRefundDispositionIdV1(value) !== value.disposition_id
      ) {
        fail("WC_VOID_OPENING_REFUND_CLAIM_DIGEST_MISMATCH");
      }
      refundedWcUnits += refundUnits;
      canonicalValue = Object.freeze({
        schema: value.schema,
        disposition_id: value.disposition_id,
        commitment_id: value.commitment_id,
        settlement_id: value.settlement_id,
        participant_id: value.participant_id,
        account: value.account,
        wc_refund_units: value.wc_refund_units,
      });
    }

    seenDispositionIds.add(value.disposition_id);
    seenCommitments.add(value.commitment_id);
    return canonicalValue;
  });

  if (seenCommitments.size !== openingState.participant_commitment_count) {
    fail("MISSING_WC_VOID_OPENING_DISPOSITION");
  }

  if (request.mode === "finalize") {
    if (
      transferredVoidAtoms !== BigInt(openingState.opening_allocated_void_atoms) ||
      refundedWcUnits !== 0n
    ) {
      fail("WC_VOID_OPENING_FINALIZE_CONSERVATION_FAILURE");
    }
  } else if (
    transferredVoidAtoms !== 0n ||
    refundedWcUnits !== BigInt(openingState.settled_wc_reserve_units)
  ) {
    fail("WC_VOID_OPENING_ABORT_REFUND_CONSERVATION_FAILURE");
  }

  canonical.sort((left, right) =>
    compareText(left.disposition_id, right.disposition_id)
  );

  const bindingPayload = Object.freeze({
    schema: "void.wc-void-opening-claim-binding.v1",
    coupled_launch_id: launchId,
    opening_state_id: openingState.opening_state_id,
    mode: request.mode,
    disposition_count: canonical.length,
    dispositions: canonical,
  });

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_CLAIM_BINDING_V1,
    coupled_launch_id: launchId,
    opening_state_id: openingState.opening_state_id,
    mode: request.mode,
    binding_id: digest(bindingPayload),
    disposition_count: canonical.length,
    dispositions: Object.freeze(canonical),
    transferred_void_atoms: transferredVoidAtoms.toString(),
    refunded_wc_units: refundedWcUnits.toString(),
    opening_claim_transfer_or_refund_binding_source_ready: true,
    cohort_atomic_outcome_required: true,
    mixed_transfer_refund_forbidden: true,
    partial_refund_forbidden: true,
    finalize_requires_exact_tranche_transfer_claims: true,
    abort_requires_exact_full_wc_refund_claims: true,
    opening_state_accepted: request.mode === "finalize",
    runtime_execution_ready: false,
    binding_persistence_verified: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    token_transfer_performed: false,
    refund_write_performed: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority: VOID_WC_VOID_OPENING_CLAIM_BINDING_AUTHORITY_V1,
  });
}
