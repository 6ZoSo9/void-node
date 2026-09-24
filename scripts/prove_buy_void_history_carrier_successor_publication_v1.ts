#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
  deriveBuyVoidHistoryCarrierTxIntentV1,
  type BuyVoidHistoryCarrierCommitPlanV1,
  type BuyVoidHistoryCarrierRootV1,
} from "../src/economic/buy_void_history_carrier_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1,
  runBuyVoidHistoryCarrierSuccessorPublicationV1,
  type BuyVoidHistoryCarrierSuccessorPublicationTransitionV1,
} from "../src/economic/buy_void_history_carrier_successor_publication_v1.js";

const POOL = "buy-void-presale-v1";
const CURRENT_PAYMENT = "4".repeat(64);
const NEXT_PAYMENT = "8".repeat(64);

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    assert.ok(Number.isSafeInteger(value));
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  assert.ok(value && typeof value === "object");
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          canonicalJson(record[key]),
      )
      .join(",") +
    "}"
  );
}

function makeRoot(
  core: Omit<BuyVoidHistoryCarrierRootV1, "carrier_root_sha256">,
): BuyVoidHistoryCarrierRootV1 {
  return {
    ...core,
    carrier_root_sha256: sha256(canonicalJson(core)),
  };
}

const currentRoot = makeRoot({
  v: 1,
  format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
  carrier_generation: 1,
  previous_carrier_root_sha256: null,
  pool_id: POOL,
  active_segmented_durable_root_sha256: "1".repeat(64),
  active_segmented_store_generation: 1,
  payment_history_fingerprint_sha256: "2".repeat(64),
  payment_index_root_sha256: "3".repeat(64),
  committed_void_units: "100",
  reservation_count: "1",
  obligation_count: "0",
  committing_record_kind: "reservation",
  committing_payment_key_sha256: CURRENT_PAYMENT,
  committing_record_void_units: "100",
});

const authoritySnapshot: any = {
  marker: "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1",
  version: 1,
  mode: "production",
  authority_id: "a".repeat(64),
  pool_id: POOL,
  carrier_generation: 1,
  current_carrier_root_sha256:
    currentRoot.carrier_root_sha256,
  current_payment_index_root_sha256:
    currentRoot.payment_index_root_sha256,
  current_generation_record_id: "b".repeat(64),
  current_root: currentRoot,
  page_publication_complete: true,
  missing_page_digests: [],
  verified_generation_count: 1,
  verified_page_reference_count: 1,
  runtime_activation_authorized: false,
  apply_activation_authorized: false,
  public_activation_authorized: false,
};

function planned(
  transition: BuyVoidHistoryCarrierSuccessorPublicationTransitionV1,
  overrides: Partial<{
    reservation_count: string;
    obligation_count: string;
    committed_void_units: string;
    committing_record_void_units: string;
  }> = {},
): BuyVoidHistoryCarrierCommitPlanV1 {
  const isReservation = transition === "reservation";
  const isObligation =
    transition === "paid_unreservable_obligation";
  const units =
    overrides.committing_record_void_units ??
    (transition === "history_refresh" ? "0" : "25");
  const next = makeRoot({
    v: 1,
    format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
    carrier_generation: 2,
    previous_carrier_root_sha256:
      currentRoot.carrier_root_sha256,
    pool_id: POOL,
    active_segmented_durable_root_sha256:
      transition === "history_refresh"
        ? currentRoot.active_segmented_durable_root_sha256
        : "5".repeat(64),
    active_segmented_store_generation:
      transition === "history_refresh" ? 1 : 2,
    payment_history_fingerprint_sha256: "6".repeat(64),
    payment_index_root_sha256: "7".repeat(64),
    committed_void_units:
      overrides.committed_void_units ??
      String(100 + (isReservation ? Number(units) : 0)),
    reservation_count:
      overrides.reservation_count ??
      String(1 + (isReservation ? 1 : 0)),
    obligation_count:
      overrides.obligation_count ??
      String(isObligation ? 1 : 0),
    committing_record_kind: transition,
    committing_payment_key_sha256:
      transition === "history_refresh"
        ? CURRENT_PAYMENT
        : NEXT_PAYMENT,
    committing_record_void_units: units,
  });
  const pageBytes = Buffer.from(
    "VOID_SUCCESSOR_PAGE_" + transition + "\n",
    "utf8",
  );
  const pageSha = sha256(pageBytes);
  const intent = deriveBuyVoidHistoryCarrierTxIntentV1({
    predecessor_carrier_root_sha256:
      currentRoot.carrier_root_sha256,
    pool_id: POOL,
    committing_record_kind: transition,
    committing_payment_key_sha256:
      next.committing_payment_key_sha256,
    committing_record_locator: {
      segmented_durable_root_sha256:
        next.active_segmented_durable_root_sha256,
      segment_id: 0xffff_ffff,
      segment_sha256: "9".repeat(64),
      byte_offset: "0",
      byte_length: 64,
      record_sha256: "c".repeat(64),
    },
    expected_segmented_durable_root_sha256:
      next.active_segmented_durable_root_sha256,
    expected_segmented_store_generation:
      next.active_segmented_store_generation,
    expected_payment_history_fingerprint_sha256:
      next.payment_history_fingerprint_sha256,
    expected_index_root_sha256:
      next.payment_index_root_sha256,
    expected_committed_void_units:
      next.committed_void_units,
    expected_reservation_count:
      next.reservation_count,
    expected_obligation_count:
      next.obligation_count,
    expected_carrier_root_sha256:
      next.carrier_root_sha256,
    new_page_digests: [pageSha],
  });
  return {
    status: "planned",
    index_root_sha256:
      next.payment_index_root_sha256,
    new_pages: [
      {
        sha256: pageSha,
        bytes: pageBytes,
      },
    ],
    carrier_root: next,
    tx_intent: intent,
  };
}

function receipt(
  plan: Extract<
    BuyVoidHistoryCarrierCommitPlanV1,
    { status: "planned" }
  >,
  status: "created" | "duplicate",
): any {
  return {
    marker: "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1",
    version: 1,
    status,
    mutation_performed: status === "created",
    carrier_generation:
      plan.carrier_root.carrier_generation,
    carrier_root_sha256:
      plan.carrier_root.carrier_root_sha256,
    generation_record_id: "d".repeat(64),
    snapshot: {
      ...authoritySnapshot,
      carrier_generation:
        plan.carrier_root.carrier_generation,
      current_carrier_root_sha256:
        plan.carrier_root.carrier_root_sha256,
      current_payment_index_root_sha256:
        plan.carrier_root.payment_index_root_sha256,
      current_generation_record_id: "d".repeat(64),
      current_root: plan.carrier_root,
      verified_generation_count: 2,
      verified_page_reference_count: 2,
    },
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    service_action: false,
    transaction_broadcast: false,
    chain2050_write: false,
    funds_movement: false,
  };
}

for (const transition of [
  "reservation",
  "paid_unreservable_obligation",
  "history_refresh",
] as const) {
  const plan = planned(transition);
  let publishes = 0;
  const deps = {
    read_authority_snapshot: () => authoritySnapshot,
    publish_successor: (input: any) => {
      publishes += 1;
      assert.equal(
        input.expected_current_carrier_root_sha256,
        currentRoot.carrier_root_sha256,
      );
      assert.equal(
        input.next_root.carrier_root_sha256,
        (plan as any).carrier_root.carrier_root_sha256,
      );
      assert.equal(
        input.tx_intent.tx_intent_sha256,
        (plan as any).tx_intent.tx_intent_sha256,
      );
      return receipt(plan as any, "created");
    },
  };

  const dry =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition,
      expected_current_carrier_root_sha256:
        currentRoot.carrier_root_sha256,
      plan,
      dependencies: deps as any,
    });
  assert.equal(dry.ok, true);
  if (!dry.ok) throw new Error("dry hold");
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.applied, false);
  assert.equal(dry.transition, transition);
  assert.equal(dry.mutation_performed, false);
  assert.equal(
    dry.required_confirmation,
    VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
  );
  assert.match(
    dry.publication_fingerprint_sha256,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(publishes, 0);

  const wrong =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition,
      expected_current_carrier_root_sha256:
        currentRoot.carrier_root_sha256,
      plan,
      apply: true,
      confirmation: "wrong",
      publication_fingerprint_sha256:
        dry.publication_fingerprint_sha256,
      dependencies: deps as any,
    });
  assert.equal(wrong.ok, false);
  if (wrong.ok) throw new Error("wrong confirmation accepted");
  assert.equal(wrong.stage, "confirmation");
  assert.equal(publishes, 0);

  const applied =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition,
      expected_current_carrier_root_sha256:
        currentRoot.carrier_root_sha256,
      plan,
      apply: true,
      confirmation:
        VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
      publication_fingerprint_sha256:
        dry.publication_fingerprint_sha256,
      dependencies: deps as any,
    });
  assert.equal(applied.ok, true);
  if (!applied.ok) throw new Error("apply hold");
  assert.equal(applied.status, "created");
  assert.equal(applied.mutation_performed, true);
  assert.equal(applied.runtime_activation_authorized, false);
  assert.equal(applied.apply_activation_authorized, false);
  assert.equal(applied.public_activation_authorized, false);
  assert.equal(applied.money_movement_performed, false);
  assert.equal(publishes, 1);

  const duplicateDeps = {
    ...deps,
    publish_successor: () => {
      publishes += 1;
      return receipt(plan as any, "duplicate");
    },
  };
  const duplicate =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition,
      expected_current_carrier_root_sha256:
        currentRoot.carrier_root_sha256,
      plan,
      apply: true,
      confirmation:
        VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
      publication_fingerprint_sha256:
        dry.publication_fingerprint_sha256,
      dependencies: duplicateDeps as any,
    });
  assert.equal(duplicate.ok, true);
  if (!duplicate.ok) throw new Error("duplicate hold");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.mutation_performed, false);
}

{
  const plan = planned("reservation");
  const stale =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition: "reservation",
      expected_current_carrier_root_sha256:
        "0".repeat(64),
      plan,
      dependencies: {
        read_authority_snapshot: () => authoritySnapshot,
      } as any,
    });
  assert.equal(stale.ok, false);
  if (stale.ok) throw new Error("stale predecessor accepted");
  assert.equal(stale.stage, "authority");
  assert.equal(
    stale.reason,
    "history_carrier_successor_current_root_changed",
  );
}

{
  const plan = planned("reservation");
  const mismatch =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition: "history_refresh",
      expected_current_carrier_root_sha256:
        currentRoot.carrier_root_sha256,
      plan,
      dependencies: {
        read_authority_snapshot: () => authoritySnapshot,
      } as any,
    });
  assert.equal(mismatch.ok, false);
  if (mismatch.ok) throw new Error("transition mismatch accepted");
  assert.equal(mismatch.stage, "plan");
}

{
  const plan = planned("reservation", {
    reservation_count: "1",
  });
  const tampered =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition: "reservation",
      expected_current_carrier_root_sha256:
        currentRoot.carrier_root_sha256,
      plan,
      dependencies: {
        read_authority_snapshot: () => authoritySnapshot,
      } as any,
    });
  assert.equal(tampered.ok, false);
  if (tampered.ok) throw new Error("counter tamper accepted");
  assert.equal(tampered.stage, "plan");
  assert.equal(
    tampered.reason,
    "history_carrier_successor_plan_verification_failed",
  );
}

{
  const plan = planned("paid_unreservable_obligation");
  if (plan.status !== "planned") throw new Error("plan missing");
  const altered: BuyVoidHistoryCarrierCommitPlanV1 = {
    ...plan,
    new_pages: [
      {
        sha256: "f".repeat(64),
        bytes: Buffer.from("foreign\n"),
      },
    ],
  };
  const badPages =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: "/proof/authority",
      transition: "paid_unreservable_obligation",
      expected_current_carrier_root_sha256:
        currentRoot.carrier_root_sha256,
      plan: altered,
      dependencies: {
        read_authority_snapshot: () => authoritySnapshot,
      } as any,
    });
  assert.equal(badPages.ok, false);
  if (badPages.ok) throw new Error("page mismatch accepted");
  assert.equal(
    badPages.reason,
    "history_carrier_successor_page_set_invalid",
  );
}

for (const [key, expected] of Object.entries({
  source_only_gate: true,
  production_authority_required: true,
  exact_predecessor_required: true,
  exact_transition_kind_required: true,
  exact_page_set_required: true,
  tx_intent_binding_revalidated: true,
  carrier_root_revalidated: true,
  dry_run_required_before_apply: true,
  exact_confirmation_required: true,
  publication_fingerprint_required: true,
  default_publisher_reuses_durable_carrier_authority: true,
  duplicate_publication_idempotent: true,
  reservation_transition_supported: true,
  paid_unreservable_obligation_transition_supported: true,
  history_refresh_transition_supported: true,
  segmented_successor_witness_producer_mounted: false,
  reservation_lifecycle_mount: false,
  paid_unreservable_obligation_lifecycle_mount: false,
  terminal_closeout_refresh_mount: false,
  runtime_activation_ready: false,
  runtime_enablement: false,
  apply_enablement: false,
  public_activation: false,
  service_action: false,
  credential_content_read: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_mutation: false,
  treasury_or_liquidity_action: false,
  funds_movement: false,
  automatic_retry: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  "src/economic/buy_void_history_carrier_successor_publication_v1.ts",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "signTransaction(",
  "privateKey",
  "mnemonic",
  "systemctl",
  "process.env",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    "forbidden source token: " + forbidden,
  );
}

assert.equal(
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1,
  "VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1",
);

console.log(
  "VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1_PROOF_GREEN",
);
console.log("reservation_transition_proven=true");
console.log("paid_unreservable_obligation_transition_proven=true");
console.log("history_refresh_transition_proven=true");
console.log("full_successor_transition_revalidated=true");
console.log("stale_predecessor_rejected=true");
console.log("counter_tamper_rejected=true");
console.log("page_set_mismatch_rejected=true");
console.log("exact_confirmation_required=true");
console.log("publication_fingerprint_required=true");
console.log("duplicate_publication_idempotent=true");
console.log("segmented_successor_witness_producer_mounted=false");
console.log("lifecycle_mount=false");
console.log("runtime_activation_ready=false");
console.log("runtime_enablement=false");
console.log("apply_enablement=false");
console.log("public_activation=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
