#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "../src/economic/buy_void_prepared_transaction_plan_reservation_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  buildCoupledNativeGasPayerObservationV1,
  classifyCoupledNativeGasBuyVoidAdmissionV1,
  type CoupledNativeGasLiabilityRecordV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
  type CoupledNativeGasLiabilityReconciliationVerifiedV1,
} from "../src/economic/coupled_native_gas_liability_reconciliation_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1,
  classifyCoupledNativeGasEffectiveOpenCensusV1,
  type CoupledNativeGasEffectiveOpenCensusDecisionV1,
} from "../src/economic/coupled_native_gas_effective_open_census_v1.js";

const payer = "0x" + "1".repeat(40);
const otherPayer = "0x" + "2".repeat(40);
const delivery = "0x" + "3".repeat(40);

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error("noncanonical_value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256Text(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Canonical(value: unknown): string {
  return sha256Text(canonical(value));
}

function makePlan(input: {
  attempt?: string;
  nonce?: number;
  wallet?: string;
} = {}): BuyVoidPreparedTransactionPlanReservationV1 {
  const attempt = input.attempt ?? "a".repeat(64);
  const nonce = input.nonce ?? 7;
  const wallet = (input.wallet ?? payer).toLowerCase();
  const gasLimit = "21000";
  const maxFee = "10";
  const priorityFee = "1";
  const saga = "voidbvfsg1_" + "b".repeat(64);
  const economic = "c".repeat(64);
  const preparation = "d".repeat(64);
  const walletKey = sha256Text("void-buy-wallet-v1\n2050\n" + wallet);
  const template = sha256Canonical({
    saga_id: saga,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: wallet,
    delivery_address: delivery,
    native_value_wei: "1",
    gas_limit: gasLimit,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priorityFee,
    economic_policy_fingerprint_sha256: economic,
    preparation_policy_fingerprint_sha256: preparation,
  });
  const planFingerprint = sha256Canonical({
    transaction_template_fingerprint_sha256: template,
    nonce,
  });
  const reservationId = sha256Text(
    [
      "void-buy-prepared-transaction-plan-reservation-v1",
      walletKey,
      String(nonce),
      attempt,
      planFingerprint,
    ].join("\n"),
  );
  return {
    schema: "void_buy_void_prepared_transaction_plan_reservation_v1",
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
    version: 1,
    reservation_id: reservationId,
    reserved_at_ms: 1_800_000_000_000,
    saga_id: saga,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: wallet,
    wallet_key_sha256: walletKey,
    nonce,
    delivery_address: delivery,
    native_value_wei: "1",
    gas_limit: gasLimit,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priorityFee,
    economic_policy_fingerprint_sha256: economic,
    preparation_policy_fingerprint_sha256: preparation,
    transaction_template_fingerprint_sha256: template,
    transaction_plan_fingerprint_sha256: planFingerprint,
    reservation_status: "reserved",
    nonce_release_authorized: false,
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };
}

function observation(wallet = payer) {
  return buildCoupledNativeGasPayerObservationV1({
    payer_address: wallet,
    observed_native_balance_wei: "5000000",
    required_max_fee_per_gas_wei: "9",
    observed_at_ms: 1000,
    expires_at_ms: 2000,
    source_identity_sha256: "e".repeat(64),
  });
}

function liabilityFor(
  plan: BuyVoidPreparedTransactionPlanReservationV1,
  open: readonly CoupledNativeGasLiabilityRecordV1[] = [],
): CoupledNativeGasLiabilityRecordV1 {
  const decision = classifyCoupledNativeGasBuyVoidAdmissionV1({
    now_ms: 1500,
    buy_void_plan: plan,
    payer_observation: observation(plan.wallet_address),
    open_liabilities: open,
  });
  if (decision.ok !== true) throw new Error(decision.reason);
  return decision.liability;
}

function makeWcVoidLiability(): CoupledNativeGasLiabilityRecordV1 {
  const body = {
    schema: "void_coupled_native_gas_liability_v1",
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1,
    lane: "wc_void" as const,
    obligation_id: "4".repeat(64),
    payer_address: payer,
    nonce: 9,
    transaction_plan_fingerprint_sha256: "5".repeat(64),
    transaction_native_value_wei: "0",
    gas_limit: "30000",
    admitted_max_fee_per_gas_wei: "12",
    attempt_limit: 2 as const,
    maximum_reserved_wei: "720000",
    fee_observation_sha256: "6".repeat(64),
    source_evidence_kind:
      "wc_void_reviewed_settlement_plan" as const,
    source_evidence_id: "7".repeat(64),
    status: "open" as const,
  };
  return {
    ...body,
    liability_id: sha256Canonical(body),
  };
}

function rewriteLiability(
  liability: CoupledNativeGasLiabilityRecordV1,
  changes: Partial<
    Pick<
      CoupledNativeGasLiabilityRecordV1,
      | "obligation_id"
      | "nonce"
      | "transaction_plan_fingerprint_sha256"
    >
  >,
): CoupledNativeGasLiabilityRecordV1 {
  const body = {
    schema: liability.schema,
    marker: liability.marker,
    version: liability.version,
    lane: liability.lane,
    obligation_id:
      changes.obligation_id ?? liability.obligation_id,
    payer_address: liability.payer_address,
    nonce: changes.nonce ?? liability.nonce,
    transaction_plan_fingerprint_sha256:
      changes.transaction_plan_fingerprint_sha256 ??
      liability.transaction_plan_fingerprint_sha256,
    transaction_native_value_wei:
      liability.transaction_native_value_wei,
    gas_limit: liability.gas_limit,
    admitted_max_fee_per_gas_wei:
      liability.admitted_max_fee_per_gas_wei,
    attempt_limit: liability.attempt_limit,
    maximum_reserved_wei: liability.maximum_reserved_wei,
    fee_observation_sha256: liability.fee_observation_sha256,
    source_evidence_kind: liability.source_evidence_kind,
    source_evidence_id: liability.source_evidence_id,
    status: liability.status,
  };
  return {
    ...body,
    liability_id: sha256Canonical(body),
  };
}

function makeReconciliation(
  liability: CoupledNativeGasLiabilityRecordV1,
  input: {
    terminal_cost_evidence_id?: string;
    actual_consumed_wei?: string;
  } = {},
): CoupledNativeGasLiabilityReconciliationVerifiedV1 {
  const maximum = BigInt(liability.maximum_reserved_wei);
  const actual = BigInt(input.actual_consumed_wei ?? "105001");
  if (actual > maximum) throw new Error("fixture_actual_exceeds_maximum");
  const unused = maximum - actual;
  const oneAttempt =
    BigInt(liability.transaction_native_value_wei) +
    BigInt(liability.gas_limit) *
      BigInt(liability.admitted_max_fee_per_gas_wei);
  const body = {
    schema: "void_coupled_native_gas_liability_reconciliation_v1",
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_V1,
    version: 1,
    lane: "presale" as const,
    liability_id: liability.liability_id,
    obligation_id: liability.obligation_id,
    payer_address: liability.payer_address,
    nonce: liability.nonce,
    transaction_plan_fingerprint_sha256:
      liability.transaction_plan_fingerprint_sha256,
    terminal_cost_evidence_id:
      input.terminal_cost_evidence_id ?? "8".repeat(64),
    outcome: "confirmed" as const,
    attempt_limit: 1 as const,
    completed_attempt_count: 1 as const,
    remaining_attempt_allowance: 0 as const,
    one_attempt_maximum_wei: oneAttempt.toString(),
    maximum_reserved_wei: maximum.toString(),
    actual_consumed_wei: actual.toString(),
    unconsumed_before_reconciliation_wei: unused.toString(),
    consumed_reserve_retirement_candidate_wei: actual.toString(),
    retained_future_attempt_reserve_wei: "0",
    unused_reserve_release_candidate_wei: unused.toString(),
    next_open_reserved_wei: "0",
    retry_allowance_reserved: false,
    additional_attempt_requires_new_liability: true,
    terminal_close_candidate: true,
  };
  return {
    ok: true,
    status: "reconciliation_classified",
    ...body,
    reconciliation_id: sha256Canonical(body),
    liability_release_authorized: false,
    liability_store_mutation: false,
    retry_execution_authorized: false,
    funds_movement_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_LIABILITY_RECONCILIATION_AUTHORITY_V1,
  };
}

function requireOk(
  decision: CoupledNativeGasEffectiveOpenCensusDecisionV1,
) {
  if (decision.ok !== true) throw new Error(decision.reason);
  return decision;
}

function requireHeld(
  decision: CoupledNativeGasEffectiveOpenCensusDecisionV1,
  reason: string,
): void {
  if (decision.ok !== false) {
    throw new Error("expected effective-open census HOLD");
  }
  assert.equal(decision.reason, reason);
}

const first = liabilityFor(makePlan());
const second = liabilityFor(
  makePlan({ attempt: "f".repeat(64), nonce: 8 }),
  [first],
);
const wcVoid = makeWcVoidLiability();
const firstReconciliation = makeReconciliation(first);

const empty = requireOk(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [],
    reconciliations: [],
  }),
);
assert.equal(empty.historical_liability_count, 0);
assert.equal(empty.reconciled_liability_count, 0);
assert.equal(empty.effective_open_liability_count, 0);
assert.equal(empty.historical_maximum_reserved_wei, "0");
assert.equal(empty.effective_open_reserved_wei, "0");

const baseline = requireOk(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first, second, wcVoid],
    reconciliations: [firstReconciliation],
  }),
);
assert.equal(baseline.marker, VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1);
assert.equal(baseline.historical_liability_count, 3);
assert.equal(baseline.reconciled_liability_count, 1);
assert.equal(baseline.effective_open_liability_count, 2);
assert.equal(baseline.wc_void_effective_open_liability_count, 1);
assert.equal(baseline.historical_maximum_reserved_wei, "1140002");
assert.equal(baseline.reconciled_maximum_reserved_wei, "210001");
assert.equal(baseline.reconciled_actual_consumed_wei, "105001");
assert.equal(
  baseline.reconciled_unused_release_candidate_wei,
  "105000",
);
assert.equal(baseline.effective_open_reserved_wei, "930001");
assert.deepEqual(
  baseline.historical_liability_ids,
  [first.liability_id, second.liability_id, wcVoid.liability_id].sort(),
);
assert.deepEqual(
  baseline.reconciled_liability_ids,
  [first.liability_id],
);
assert.deepEqual(
  baseline.effective_open_liability_ids,
  [second.liability_id, wcVoid.liability_id].sort(),
);
assert.deepEqual(
  baseline.reconciliation_ids,
  [firstReconciliation.reconciliation_id],
);
assert.equal(baseline.terminal_evidence_provenance_verified, false);
assert.equal(baseline.liability_release_authorized, false);
assert.equal(baseline.mutation_performed, false);
assert.equal(baseline.funds_movement_performed, false);

const permuted = requireOk(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [wcVoid, first, second],
    reconciliations: [firstReconciliation],
  }),
);
assert.equal(permuted.census_id, baseline.census_id);
assert.deepEqual(permuted, baseline);

const allOpen = requireOk(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first, second, wcVoid],
    reconciliations: [],
  }),
);
assert.equal(allOpen.effective_open_liability_count, 3);
assert.equal(allOpen.effective_open_reserved_wei, "1140002");
assert.equal(allOpen.wc_void_effective_open_liability_count, 1);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first, first],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_duplicate_liability",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [
      first,
      rewriteLiability(second, {
        obligation_id: first.obligation_id,
      }),
    ],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_historical_obligation_conflict",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [
      first,
      rewriteLiability(second, {
        transaction_plan_fingerprint_sha256:
          first.transaction_plan_fingerprint_sha256,
      }),
    ],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_historical_transaction_plan_conflict",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [
      first,
      rewriteLiability(second, {
        nonce: first.nonce,
      }),
    ],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_historical_nonce_conflict",
);

const otherPayerBody = {
  schema: first.schema,
  marker: first.marker,
  version: first.version,
  lane: first.lane,
  obligation_id: first.obligation_id,
  payer_address: otherPayer,
  nonce: first.nonce,
  transaction_plan_fingerprint_sha256:
    first.transaction_plan_fingerprint_sha256,
  transaction_native_value_wei: first.transaction_native_value_wei,
  gas_limit: first.gas_limit,
  admitted_max_fee_per_gas_wei:
    first.admitted_max_fee_per_gas_wei,
  attempt_limit: first.attempt_limit,
  maximum_reserved_wei: first.maximum_reserved_wei,
  fee_observation_sha256: first.fee_observation_sha256,
  source_evidence_kind: first.source_evidence_kind,
  source_evidence_id: first.source_evidence_id,
  status: first.status,
};
const otherPayerLiability: CoupledNativeGasLiabilityRecordV1 = {
  ...otherPayerBody,
  liability_id: sha256Canonical(otherPayerBody),
};
requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [otherPayerLiability],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_liability_payer_mismatch",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first],
    reconciliations: [makeReconciliation(second)],
  }),
  "coupled_native_gas_effective_open_orphan_reconciliation",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first],
    reconciliations: [firstReconciliation, firstReconciliation],
  }),
  "coupled_native_gas_effective_open_duplicate_reconciliation",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first],
    reconciliations: [
      firstReconciliation,
      makeReconciliation(first, {
        terminal_cost_evidence_id: "9".repeat(64),
      }),
    ],
  }),
  "coupled_native_gas_effective_open_conflicting_reconciliation",
);

const badAuthority = {
  ...firstReconciliation,
  authority: {},
};
requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first],
    reconciliations: [badAuthority],
  }),
  "coupled_native_gas_effective_open_reconciliation_authority_mismatch",
);

const badAccounting = {
  ...firstReconciliation,
  unused_reserve_release_candidate_wei: "110001",
};
requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first],
    reconciliations: [badAccounting],
  }),
  "coupled_native_gas_effective_open_reconciliation_accounting_invalid",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first],
    reconciliations: [
      makeReconciliation(first, {
        actual_consumed_wei: "100001",
      }),
    ],
  }),
  "coupled_native_gas_effective_open_reconciliation_accounting_invalid",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [wcVoid],
    reconciliations: [
      makeReconciliation(wcVoid, { actual_consumed_wei: "100000" }),
    ],
  }),
  "coupled_native_gas_effective_open_wc_void_reconciliation_not_supported",
);

const badLiability = {
  ...first,
  maximum_reserved_wei: "210002",
};
requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [badLiability],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_liability_economic_binding_invalid",
);

const noncanonicalLiabilityNonce = {
  ...first,
  nonce: String(first.nonce),
};
requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [noncanonicalLiabilityNonce],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_liability_invalid",
);

const noncanonicalReconciliationAmount = {
  ...firstReconciliation,
  actual_consumed_wei: Number(
    firstReconciliation.actual_consumed_wei,
  ),
};
requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: [first],
    reconciliations: [noncanonicalReconciliationAmount],
  }),
  "coupled_native_gas_effective_open_reconciliation_invalid",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: "not-an-address",
    liabilities: [],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_payer_address_invalid",
);

requireHeld(
  classifyCoupledNativeGasEffectiveOpenCensusV1({
    payer_address: payer,
    liabilities: null as unknown as readonly unknown[],
    reconciliations: [],
  }),
  "coupled_native_gas_effective_open_liabilities_array_required",
);

const trueAuthority = new Set([
  "source_contract",
  "pure_census_classifier",
  "payer_scoped",
  "immutable_liability_history",
  "immutable_reconciliation_history",
  "exact_liability_identity_rederived",
  "exact_reconciliation_identity_rederived",
  "reconciliation_liability_binding_required",
  "one_reconciliation_per_liability",
  "orphan_reconciliation_rejected",
  "duplicate_reconciliation_rejected",
  "historical_obligation_uniqueness_checked",
  "historical_transaction_plan_uniqueness_checked",
  "historical_nonce_uniqueness_checked",
  "effective_open_set_derived",
  "reserve_conservation_rederived",
  "content_addressed_census",
  "presale_reconciliation_supported",
  "wc_void_liabilities_remain_open",
]);
for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_AUTHORITY_V1,
)) {
  assert.equal(value, trueAuthority.has(key), key);
}

console.log("VOID_COUPLED_NATIVE_GAS_EFFECTIVE_OPEN_CENSUS_V1_GREEN");
console.log("deterministic_sorted_census=true");
console.log("reserve_conservation_rederived=true");
console.log("partial_gas_use_reconciliation_supported=true");
console.log("immutable_liability_history=true");
console.log("immutable_reconciliation_history=true");
console.log("orphan_reconciliation_hold=true");
console.log("duplicate_reconciliation_hold=true");
console.log("conflicting_reconciliation_hold=true");
console.log("wc_void_liabilities_remain_open=true");
console.log("terminal_evidence_provenance_verified=false");
console.log("liability_release_authorized=false");
console.log("filesystem_read=false");
console.log("filesystem_write=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
