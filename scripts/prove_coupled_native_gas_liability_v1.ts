#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  buildCoupledNativeGasPayerObservationV1,
  classifyCoupledNativeGasBuyVoidAdmissionV1,
  classifyCoupledNativeGasWcVoidAdmissionV1,
  type CoupledNativeGasLiabilityDecisionV1,
  type CoupledNativeGasLiabilityRecordV1,
} from "../src/economic/coupled_native_gas_liability_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "../src/economic/buy_void_prepared_transaction_plan_reservation_v1.js";

const wallet = "0x" + "1".repeat(40);
const otherWallet = "0x" + "2".repeat(40);
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

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function fingerprint(value: unknown): string {
  return sha256(canonical(value));
}

function makePlan(input: {
  attempt?: string;
  nonce?: number;
  gas_limit?: string;
  max_fee_per_gas_wei?: string;
  max_priority_fee_per_gas_wei?: string;
  wallet_address?: string;
} = {}): BuyVoidPreparedTransactionPlanReservationV1 {
  const attempt = input.attempt ?? "a".repeat(64);
  const nonce = input.nonce ?? 7;
  const payer = (input.wallet_address ?? wallet).toLowerCase();
  const gas = input.gas_limit ?? "21000";
  const maxFee = input.max_fee_per_gas_wei ?? "10";
  const priority = input.max_priority_fee_per_gas_wei ?? "1";
  const saga = "voidbvfsg1_" + "b".repeat(64);
  const economic = "c".repeat(64);
  const preparation = "d".repeat(64);
  const walletKey = sha256("void-buy-wallet-v1\n2050\n" + payer);
  const template = fingerprint({
    saga_id: saga,
    attempt_id: attempt,
    chain_id: "2050",
    wallet_address: payer,
    delivery_address: delivery,
    native_value_wei: "1",
    gas_limit: gas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
    economic_policy_fingerprint_sha256: economic,
    preparation_policy_fingerprint_sha256: preparation,
  });
  const planFingerprint = fingerprint({
    transaction_template_fingerprint_sha256: template,
    nonce,
  });
  const reservationId = sha256(
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
    wallet_address: payer,
    wallet_key_sha256: walletKey,
    nonce,
    delivery_address: delivery,
    native_value_wei: "1",
    gas_limit: gas,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priority,
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

function observation(input: {
  payer?: string;
  balance?: string;
  fee?: string;
  observed_at_ms?: number;
  expires_at_ms?: number;
  source?: string;
} = {}) {
  return buildCoupledNativeGasPayerObservationV1({
    payer_address: input.payer ?? wallet,
    observed_native_balance_wei: input.balance ?? "1000000",
    required_max_fee_per_gas_wei: input.fee ?? "9",
    observed_at_ms: input.observed_at_ms ?? 1000,
    expires_at_ms: input.expires_at_ms ?? 2000,
    source_identity_sha256: input.source ?? "e".repeat(64),
  });
}

function requireOk(
  value: CoupledNativeGasLiabilityDecisionV1,
): Extract<CoupledNativeGasLiabilityDecisionV1, { ok: true }> {
  if (value.ok !== true) throw new Error(value.reason);
  return value;
}

function requireHeld(
  value: CoupledNativeGasLiabilityDecisionV1,
  reason: string,
): Extract<CoupledNativeGasLiabilityDecisionV1, { ok: false }> {
  if (value.ok !== false) {
    throw new Error("expected coupled native gas HOLD");
  }
  assert.equal(value.reason, reason);
  return value;
}

function classify(input: {
  plan?: BuyVoidPreparedTransactionPlanReservationV1;
  obs?: ReturnType<typeof observation>;
  now?: number;
  open?: readonly CoupledNativeGasLiabilityRecordV1[];
} = {}) {
  return classifyCoupledNativeGasBuyVoidAdmissionV1({
    now_ms: input.now ?? 1500,
    buy_void_plan: input.plan ?? makePlan(),
    payer_observation: input.obs ?? observation(),
    open_liabilities: input.open ?? [],
  });
}

const first = requireOk(classify());
assert.equal(first.status, "admitted");
assert.equal(first.duplicate, false);
assert.equal(first.payer_address, wallet);
assert.equal(first.requested_max_liability_wei, "210001");
assert.equal(first.reserved_before_wei, "0");
assert.equal(first.reserved_after_wei, "210001");
assert.equal(first.unreserved_after_wei, "789999");
assert.equal(first.liability.lane, "presale");
assert.equal(first.liability.attempt_limit, 1);
assert.equal(first.liability.maximum_reserved_wei, "210001");
assert.equal(
  first.liability.source_evidence_kind,
  "buy_void_prepared_plan_v1",
);
assert.equal(first.mutation_performed, false);

const replay = requireOk(classify({ open: [first.liability] }));
assert.equal(replay.status, "idempotent");
assert.equal(replay.duplicate, true);
assert.equal(replay.reserved_before_wei, "210001");
assert.equal(replay.reserved_after_wei, "210001");
assert.equal(replay.liability.liability_id, first.liability.liability_id);

requireHeld(
  classify({
    obs: observation({ balance: "209999" }),
  }),
  "coupled_native_gas_insufficient_unreserved_native_balance",
);

const secondPlan = makePlan({
  attempt: "f".repeat(64),
  nonce: 8,
});
requireHeld(
  classify({
    plan: secondPlan,
    obs: observation({ balance: "400000" }),
    open: [first.liability],
  }),
  "coupled_native_gas_insufficient_unreserved_native_balance",
);

const sameNoncePlan = makePlan({
  attempt: "1".repeat(64),
  nonce: 7,
});
requireHeld(
  classify({
    plan: sameNoncePlan,
    open: [first.liability],
  }),
  "coupled_native_gas_nonce_conflict",
);

const changedObservation = observation({
  observed_at_ms: 1100,
  expires_at_ms: 2100,
  source: "f".repeat(64),
});
const freshReplay = requireOk(
  classify({
    obs: changedObservation,
    open: [first.liability],
  }),
);
assert.equal(freshReplay.status, "idempotent");
assert.equal(freshReplay.duplicate, true);
assert.equal(
  freshReplay.liability.liability_id,
  first.liability.liability_id,
  "fresh fee evidence must not mint a second liability for one plan",
);

const alteredBody = {
  schema: first.liability.schema,
  marker: first.liability.marker,
  version: first.liability.version,
  lane: first.liability.lane,
  obligation_id: first.liability.obligation_id,
  payer_address: first.liability.payer_address,
  nonce: first.liability.nonce,
  transaction_plan_fingerprint_sha256:
    first.liability.transaction_plan_fingerprint_sha256,
  transaction_native_value_wei:
    first.liability.transaction_native_value_wei,
  gas_limit: "21001",
  admitted_max_fee_per_gas_wei:
    first.liability.admitted_max_fee_per_gas_wei,
  attempt_limit: first.liability.attempt_limit,
  maximum_reserved_wei: "210011",
  fee_observation_sha256:
    first.liability.fee_observation_sha256,
  source_evidence_kind: first.liability.source_evidence_kind,
  source_evidence_id: first.liability.source_evidence_id,
  status: first.liability.status,
};
const alteredSameObligation: CoupledNativeGasLiabilityRecordV1 = {
  ...alteredBody,
  liability_id: sha256(canonical(alteredBody)),
};
requireHeld(
  classify({
    open: [alteredSameObligation],
  }),
  "coupled_native_gas_obligation_conflict",
);

requireHeld(
  classify({
    obs: observation({ observed_at_ms: 1000, expires_at_ms: 1200 }),
    now: 1201,
  }),
  "coupled_native_gas_fee_observation_stale",
);

requireHeld(
  classify({
    obs: observation({ observed_at_ms: 1600, expires_at_ms: 2000 }),
    now: 1500,
  }),
  "coupled_native_gas_fee_observation_stale",
);

requireHeld(
  classify({
    obs: observation({ payer: otherWallet }),
  }),
  "coupled_native_gas_payer_mismatch",
);

requireHeld(
  classify({
    obs: observation({ fee: "11" }),
  }),
  "coupled_native_gas_reserved_fee_below_fresh_requirement",
);

const tamperedPlan = {
  ...makePlan(),
  transaction_plan_fingerprint_sha256: "9".repeat(64),
};
requireHeld(
  classify({
    plan: tamperedPlan as BuyVoidPreparedTransactionPlanReservationV1,
  }),
  "coupled_native_gas_buy_void_plan_fingerprint_mismatch",
);

requireHeld(
  classify({
    open: [first.liability, first.liability],
  }),
  "coupled_native_gas_liability_census_duplicate_id",
);

function wcLiabilityFrom(
  record: CoupledNativeGasLiabilityRecordV1,
): CoupledNativeGasLiabilityRecordV1 {
  const body = {
    schema: "void_coupled_native_gas_liability_v1",
    marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
    version: 1,
    lane: "wc_void" as const,
    obligation_id: "8".repeat(64),
    payer_address: record.payer_address,
    nonce: 99,
    transaction_plan_fingerprint_sha256: "7".repeat(64),
    transaction_native_value_wei: "0",
    gas_limit: "10000",
    admitted_max_fee_per_gas_wei: "10",
    attempt_limit: 2 as const,
    maximum_reserved_wei: "200000",
    fee_observation_sha256: record.fee_observation_sha256,
    source_evidence_kind: "wc_void_reviewed_settlement_plan" as const,
    source_evidence_id: "6".repeat(64),
    status: "open" as const,
  };
  return {
    ...body,
    liability_id: sha256(canonical(body)),
  };
}

const twoAttemptNativeBody = {
  schema: "void_coupled_native_gas_liability_v1",
  marker: VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  version: 1,
  lane: "wc_void" as const,
  obligation_id: "4".repeat(64),
  payer_address: first.liability.payer_address,
  nonce: 98,
  transaction_plan_fingerprint_sha256: "5".repeat(64),
  transaction_native_value_wei: "5",
  gas_limit: "10",
  admitted_max_fee_per_gas_wei: "10",
  attempt_limit: 2 as const,
  maximum_reserved_wei: "210",
  fee_observation_sha256: first.liability.fee_observation_sha256,
  source_evidence_kind: "wc_void_reviewed_settlement_plan" as const,
  source_evidence_id: "3".repeat(64),
  status: "open" as const,
};
const twoAttemptNative: CoupledNativeGasLiabilityRecordV1 = {
  ...twoAttemptNativeBody,
  liability_id: sha256(canonical(twoAttemptNativeBody)),
};
const twoAttemptCounted = requireOk(
  classify({
    obs: observation({ balance: "210211" }),
    open: [twoAttemptNative],
  }),
);
assert.equal(twoAttemptCounted.reserved_before_wei, "210");
assert.equal(twoAttemptCounted.reserved_after_wei, "210211");
assert.equal(twoAttemptCounted.unreserved_after_wei, "0");

const wcExisting = wcLiabilityFrom(first.liability);
requireHeld(
  classify({
    obs: observation({ balance: "410000" }),
    open: [wcExisting],
  }),
  "coupled_native_gas_insufficient_unreserved_native_balance",
);

const withCrossLaneCapacity = requireOk(
  classify({
    obs: observation({ balance: "410001" }),
    open: [wcExisting],
  }),
);
assert.equal(withCrossLaneCapacity.reserved_before_wei, "200000");
assert.equal(withCrossLaneCapacity.reserved_after_wei, "410001");
assert.equal(withCrossLaneCapacity.unreserved_after_wei, "0");

requireHeld(
  classifyCoupledNativeGasWcVoidAdmissionV1(),
  "coupled_native_gas_wc_void_settlement_plan_not_reviewed",
);

const overflowPlan = makePlan({
  attempt: "2".repeat(64),
  nonce: 10,
  gas_limit:
    "115792089237316195423570985008687907853269984665640564039457584007913129639935",
  max_fee_per_gas_wei: "2",
});
requireHeld(
  classify({
    plan: overflowPlan,
    obs: observation({
      balance:
        "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      fee: "1",
    }),
  }),
  "coupled_native_gas_candidate_liability_out_of_range",
);

assert.deepEqual(
  VOID_COUPLED_NATIVE_GAS_LIABILITY_AUTHORITY_V1,
  {
    source_contract: true,
    pure_admission_classifier: true,
    deterministic_liability_identity: true,
    buy_void_prepared_plan_reused: true,
    transaction_native_value_bound: true,
    payer_scoped_balance_accounting: true,
    fee_observation_expiry_recomputed: true,
    trusted_fee_freshness_policy_proven: false,
    nonce_collision_detection: true,
    exact_replay_idempotent: true,
    altered_obligation_conflict_hold: true,
    cross_lane_record_accounting: true,
    wc_void_candidate_admission: false,
    durable_journal_read: false,
    durable_journal_write: false,
    live_balance_observation: false,
    live_fee_observation: false,
    trusted_time_source_proven: false,
    terminal_receipt_reconciliation: false,
    manual_recovery_allowance_bound: false,
    full_presale_lifetime_capacity_proven: false,
    ongoing_wc_void_native_gas_model_proven: false,
    hidden_purchase_or_trade_minimum: false,
    runtime_integration: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  },
);

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "economic",
    "coupled_native_gas_liability_v1.ts",
  ),
  "utf8",
);
assert.match(
  source,
  /VOID_BUY_VOID_PREPARED_TRANSACTION_PLAN_RESERVATION_V1/u,
);
assert.doesNotMatch(source, /node:fs|eth_send|eth_call|systemctl/u);
assert.doesNotMatch(
  source,
  /minimum_purchase|minimum_trade|hidden_minimum/u,
);

console.log("VOID_COUPLED_NATIVE_GAS_LIABILITY_V1_PROOF_GREEN");
console.log("buy_void_plan_identity_rederived=true");
console.log("single_obligation_admission=true");
console.log("transaction_native_value_bound=true");
console.log("exact_replay_idempotent=true");
console.log("fresh_observation_existing_liability_idempotent=true");
console.log("altered_same_obligation_conflict_hold=true");
console.log("finite_native_balance_enforced=true");
console.log("nonce_collision_hold=true");
console.log("fresh_fee_requirement_bound=true");
console.log("fee_observation_expiry_recomputed=true");
console.log("trusted_fee_freshness_policy_proven=false");
console.log("stale_or_future_fee_observation_hold=true");
console.log("cross_lane_open_liability_counted=true");
console.log("full_native_envelope_reserved_per_attempt=true");
console.log("wc_void_candidate_admission=false");
console.log("durable_journal_write=false");
console.log("live_balance_observation=false");
console.log("live_fee_observation=false");
console.log("trusted_time_source_proven=false");
console.log("terminal_receipt_reconciliation=false");
console.log("full_presale_lifetime_capacity_proven=false");
console.log("ongoing_wc_void_native_gas_model_proven=false");
console.log("hidden_purchase_or_trade_minimum=false");
console.log("runtime_integration=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
