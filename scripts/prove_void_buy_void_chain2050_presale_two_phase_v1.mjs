#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTHORITY,
  PRESALE,
  BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1,
  canonicalPaymentIdentityV1,
  canonicalPaymentKeySha256V1,
  computeFulfillmentAnchorSha256V1,
  computeReservationAnchorSha256V1,
  computeStateSha256V1,
  createGenesisStateV1,
  replayTwoPhasePresaleEventsV1,
  validateFulfillmentV1,
  validateReservationV1,
  validateStateV1,
} from "./lib/void_buy_void_chain2050_presale_two_phase_v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const digest = (v) => createHash("sha256").update(String(v)).digest("hex");
const h32 = (v) => `0x${digest(v)}`;
function chainAnchorPaymentKey(identity) {
  const bytes = Buffer.from(identity, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length, 0);
  return createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
        length,
        bytes,
      ]),
    )
    .digest("hex");
}
const A = `0x${"a".repeat(40)}`;
const B = `0x${"b".repeat(40)}`;
const MAX = BigInt(PRESALE.initial_inventory_void_atoms);
let cases = 0;
function pass(name, fn) {
  try { fn(); cases += 1; }
  catch (e) { e.message = `${name}: ${e.message}`; throw e; }
}

function payment(id, { chain = "base", atoms = "1000000", address = A, patch = {} } = {}) {
  const canonicalChain = chain === "eth" ? "ethereum" : chain;
  const tx = h32(`pay:${id}`);
  const log = String(id % 97);
  const identity = canonicalPaymentIdentityV1({
    source_chain: chain,
    source_transaction_hash: tx,
    source_log_index: log,
  });
  const key = canonicalPaymentKeySha256V1({
    source_chain: chain,
    source_transaction_hash: tx,
    source_log_index: log,
  });
  return {
    schema: "void_buy_void_finalized_source_payment_v1",
    marker: "VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1",
    source_chain: chain,
    source_chain_id: canonicalChain === "base" ? "8453" : "1",
    source_transaction_hash: tx,
    source_log_index: log,
    canonical_payment_identity: identity,
    payment_key_sha256: key,
    payer_address: address,
    delivery_address: address,
    payment_usdc_atoms: String(atoms),
    source_policy_fingerprint_sha256: digest(`policy:${canonicalChain}`),
    source_finality_attestation_sha256: digest(`finality:${id}`),
    finality_status: "finalized",
    exact_payment_verified: true,
    ...patch,
  };
}
function delivery(id, { atoms = "2000000", address = A, patch = {} } = {}) {
  return {
    schema: "void_chain2050_finalized_delivery_v1",
    marker: "VOID_CHAIN2050_FINALIZED_DELIVERY_V1",
    chain_id: "2050",
    transaction_hash: h32(`delivery:${id}`),
    log_index: String(id % 89),
    block_height: String(1000 + id),
    block_hash: h32(`block:${id}`),
    recipient_address: address,
    void_amount_atoms: String(atoms),
    execution_status: "success",
    accepted_checkpoint_height: String(5000 + id),
    accepted_checkpoint_hash: h32(`checkpoint:${id}`),
    finality_policy_id: "mainnet0-checkpoint-finality-v1",
    finality_attestation_sha256: digest(`chain-finality:${id}`),
    ...patch,
  };
}
function confirmInput(m, id, options = {}) {
  return {
    expected_state_sha256: options.expected ?? m.state.state_sha256,
    source_payment: payment(id, options),
  };
}
function fulfillInput(m, reservation, id, options = {}) {
  return {
    expected_state_sha256: options.expected ?? m.state.state_sha256,
    payment_key_sha256: reservation.payment_key_sha256,
    chain2050_delivery: delivery(id, {
      atoms: options.atoms ?? reservation.reserved_void_atoms,
      address: options.address ?? reservation.delivery_address,
      patch: options.patch ?? {},
    }),
  };
}

pass("authority is source-only", () => {
  assert.equal(Object.values(AUTHORITY).filter(Boolean).length, 1);
  assert.equal(AUTHORITY.source_only_reference_machine, true);
  for (const k of [
    "chain_state_mutation","source_chain_rpc_call","chain2050_rpc_call","filesystem_read",
    "filesystem_write","credential_access","wallet_access","signer_access","transaction_construction",
    "transaction_signing","transaction_broadcast","inventory_funding","public_presale_activation","money_movement",
  ]) assert.equal(AUTHORITY[k], false, k);
});
pass("canonical economics and separation", () => {
  assert.equal(PRESALE.initial_inventory_void_atoms, "10000000000000");
  assert.equal(PRESALE.rate_void_atoms_numerator, "2");
  assert.equal(PRESALE.rate_void_atoms_denominator, "1");
  assert.equal(PRESALE.payment_confirmation_separate_from_fulfillment, true);
  assert.equal(PRESALE.no_hidden_minimum, true);
  assert.equal(PRESALE.no_per_buyer_throttle_below_remaining_inventory, true);
});
pass("genesis conservation", () => {
  const s = createGenesisStateV1();
  assert.deepEqual(validateStateV1(s), s);
  assert.equal(
    BigInt(s.available_inventory_void_atoms) +
      BigInt(s.reserved_inventory_void_atoms) +
      BigInt(s.fulfilled_inventory_void_atoms),
    MAX,
  );
});

pass("payment key is byte-exact with #1463 chain-anchor contract", () => {
  for (const [id, chain] of [[3, "base"], [4, "ethereum"], [5, "eth"]]) {
    const p = payment(id, { chain });
    assert.equal(
      p.payment_key_sha256,
      chainAnchorPaymentKey(p.canonical_payment_identity),
      chain,
    );
  }
});

for (const [i, chain] of ["base","ethereum","eth"].entries()) {
  pass(`${chain} confirmation reserves before fulfillment`, () => {
    const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
    const c = m.confirmPayment(confirmInput(m, 10+i, { chain }));
    assert.equal(c.ok, true);
    assert.equal(c.status, "confirmed_reserved");
    assert.equal(m.getPurchaseStatus(c.reservation.payment_key_sha256), "CONFIRMED_RESERVED");
    assert.equal(c.state.fulfilled_inventory_void_atoms, "0");
    assert.equal(c.state.reserved_inventory_void_atoms, "2000000");
    assert.equal(c.state.available_inventory_void_atoms, (MAX - 2_000_000n).toString());
  });
}

pass("one USDC atom has no hidden minimum", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 20, { atoms: "1" }));
  assert.equal(c.ok, true);
  assert.equal(c.reservation.reserved_void_atoms, "2");
});
pass("full pool can be reserved by one payment", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 21, { atoms: (MAX/2n).toString() }));
  assert.equal(c.ok, true);
  assert.equal(c.state.available_inventory_void_atoms, "0");
  assert.equal(c.state.reserved_inventory_void_atoms, MAX.toString());
});
pass("oversubscription fails before fulfillment", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const first = m.confirmPayment(confirmInput(m, 22, { atoms: (MAX/2n).toString() }));
  assert.equal(first.ok, true);
  const before = m.state;
  const second = m.confirmPayment(confirmInput(m, 23, { atoms: "1" }));
  assert.equal(second.ok, false);
  assert.equal(second.status, "capacity_rejected");
  assert.equal(second.reason, "PRESALE_INVENTORY_INSUFFICIENT_BEFORE_FULFILLMENT");
  assert.deepEqual(m.state, before);
  assert.equal(m.eventCount, 1);
});
pass("confirm preview is non-mutating", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const before = m.state;
  const c = m.previewConfirmPayment(confirmInput(m, 24));
  assert.equal(c.status, "would_confirm_reserved");
  assert.deepEqual(m.state, before);
});
pass("confirmation exact duplicate is idempotent", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const input = confirmInput(m, 25);
  const first = m.confirmPayment(input);
  const again = m.confirmPayment({ ...input, expected_state_sha256: m.state.state_sha256 });
  assert.equal(again.status, "duplicate_confirmed_reserved");
  assert.deepEqual(first.reservation, again.reservation);
  assert.equal(m.eventCount, 1);
});
pass("same payment identity with changed source facts conflicts", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const firstInput = confirmInput(m, 26);
  const first = m.confirmPayment(firstInput);
  const changed = structuredClone(firstInput.source_payment);
  changed.payment_usdc_atoms = "2000000";
  const result = m.confirmPayment({ expected_state_sha256: m.state.state_sha256, source_payment: changed });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "PAYMENT_ALREADY_CONFIRMED_CONFLICT");
  assert.equal(m.eventCount, 1);
});
pass("unfinalized payment cannot reserve inventory", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const before = m.state;
  const x = confirmInput(m, 27);
  x.source_payment.finality_status = "confirmed";
  const r = m.confirmPayment(x);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "SOURCE_PAYMENT_NOT_FINALIZED");
  assert.deepEqual(m.state, before);
});
pass("stale confirmation state holds", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const stale = m.state.state_sha256;
  assert.equal(m.confirmPayment(confirmInput(m, 28)).ok, true);
  const r = m.confirmPayment(confirmInput(m, 29, { expected: stale }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "STALE_PRESALE_STATE_PRECONDITION");
});

pass("fulfillment requires prior chain-canonical reservation", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const fakeKey = digest("fake");
  const r = m.recordFulfillment({
    expected_state_sha256: m.state.state_sha256,
    payment_key_sha256: fakeKey,
    chain2050_delivery: delivery(30),
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "PAYMENT_NOT_CONFIRMED_RESERVED");
});
pass("fulfillment consumes reserved not available inventory", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 31));
  const availableAfterConfirm = m.state.available_inventory_void_atoms;
  const f = m.recordFulfillment(fulfillInput(m, c.reservation, 31));
  assert.equal(f.ok, true);
  assert.equal(f.status, "fulfilled");
  assert.equal(f.state.available_inventory_void_atoms, availableAfterConfirm);
  assert.equal(f.state.reserved_inventory_void_atoms, "0");
  assert.equal(f.state.fulfilled_inventory_void_atoms, "2000000");
  assert.equal(m.getPurchaseStatus(c.reservation.payment_key_sha256), "FULFILLED");
});
pass("fulfillment preview is non-mutating", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 32));
  const before = m.state;
  const f = m.previewRecordFulfillment(fulfillInput(m, c.reservation, 32));
  assert.equal(f.status, "would_fulfill");
  assert.deepEqual(m.state, before);
});
pass("wrong delivery amount holds without releasing reservation", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 33));
  const before = m.state;
  const f = m.recordFulfillment(fulfillInput(m, c.reservation, 33, { atoms: "1999999" }));
  assert.equal(f.ok, false);
  assert.equal(f.reason, "DELIVERY_AMOUNT_MISMATCH");
  assert.deepEqual(m.state, before);
  assert.equal(m.getPurchaseStatus(c.reservation.payment_key_sha256), "CONFIRMED_RESERVED");
});
pass("wrong delivery recipient holds", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 34));
  const f = m.recordFulfillment(fulfillInput(m, c.reservation, 34, { address: B }));
  assert.equal(f.ok, false);
  assert.equal(f.reason, "DELIVERY_RECIPIENT_MISMATCH");
});
pass("delivery checkpoint must cover block", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 35));
  const f = m.recordFulfillment(fulfillInput(m, c.reservation, 35, {
    patch: { accepted_checkpoint_height: "1" },
  }));
  assert.equal(f.ok, false);
  assert.equal(f.reason, "DELIVERY_NOT_BEHIND_ACCEPTED_CHECKPOINT");
});
pass("exact fulfillment duplicate is idempotent", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 36));
  const d = fulfillInput(m, c.reservation, 36);
  const first = m.recordFulfillment(d);
  const again = m.recordFulfillment({ ...d, expected_state_sha256: m.state.state_sha256 });
  assert.equal(again.status, "duplicate_fulfilled");
  assert.deepEqual(again.fulfillment, first.fulfillment);
  assert.equal(m.eventCount, 2);
});
pass("same payment with different finalized delivery conflicts", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 37));
  assert.equal(m.recordFulfillment(fulfillInput(m, c.reservation, 37)).ok, true);
  const changed = m.recordFulfillment(fulfillInput(m, c.reservation, 3700));
  assert.equal(changed.ok, false);
  assert.equal(changed.reason, "PAYMENT_ALREADY_FULFILLED_CONFLICT");
});
pass("one delivery event cannot fulfill two reservations", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c1 = m.confirmPayment(confirmInput(m, 38));
  const c2 = m.confirmPayment(confirmInput(m, 39));
  const d = delivery(38);
  assert.equal(m.recordFulfillment({
    expected_state_sha256: m.state.state_sha256,
    payment_key_sha256: c1.reservation.payment_key_sha256,
    chain2050_delivery: d,
  }).ok, true);
  const r = m.recordFulfillment({
    expected_state_sha256: m.state.state_sha256,
    payment_key_sha256: c2.reservation.payment_key_sha256,
    chain2050_delivery: { ...d, recipient_address: c2.reservation.delivery_address, void_amount_atoms: c2.reservation.reserved_void_atoms },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "DELIVERY_EVENT_ALREADY_BOUND_TO_PAYMENT");
});

pass("reservation and fulfillment anchors reject tamper", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 40));
  const r = structuredClone(c.reservation);
  r.reserved_void_atoms = "2";
  r.reservation_anchor_sha256 = computeReservationAnchorSha256V1(r);
  assert.throws(() => validateReservationV1(r), (e) => e.code === "RESERVATION_RATE_MISMATCH");
  const f = m.recordFulfillment(fulfillInput(m, c.reservation, 40)).fulfillment;
  const changed = structuredClone(f);
  changed.chain2050_block_hash = h32("tamper");
  assert.throws(() => validateFulfillmentV1(changed), (e) => e.code === "FULFILLMENT_ANCHOR_MISMATCH");
});
pass("standalone fulfillment rejects payment-key identity substitution", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 41));
  const f = m.recordFulfillment(fulfillInput(m, c.reservation, 41)).fulfillment;
  const changed = structuredClone(f);
  changed.payment_key_sha256 = "0".repeat(64);
  changed.fulfillment_anchor_sha256 = computeFulfillmentAnchorSha256V1(changed);
  assert.throws(
    () => validateFulfillmentV1(changed),
    (e) => e.code === "FULFILLMENT_PAYMENT_KEY_MISMATCH",
  );
});

pass("replay binds fulfillment reservation anchor to the prior reservation", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  const c = m.confirmPayment(confirmInput(m, 42));
  m.recordFulfillment(fulfillInput(m, c.reservation, 42));
  const events = m.exportEvents({ limit: 10 });
  events[1].record.reservation_anchor_sha256 = digest("foreign-reservation");
  events[1].record.fulfillment_anchor_sha256 =
    computeFulfillmentAnchorSha256V1(events[1].record);
  assert.throws(
    () => replayTwoPhasePresaleEventsV1(events),
    (e) => e.code === "EVENT_REPLAY_FULFILLMENT_MISMATCH",
  );
});

pass("state hash and conservation reject tamper", () => {
  const s = structuredClone(createGenesisStateV1());
  s.available_inventory_void_atoms = (MAX - 1n).toString();
  s.state_sha256 = computeStateSha256V1(s);
  assert.throws(() => validateStateV1(s), (e) => e.code === "INVENTORY_CONSERVATION_FAILURE");
});

pass("two-phase replay reconstructs exact state", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  for (let i = 0; i < 8; i++) {
    const c = m.confirmPayment(confirmInput(m, 50+i, { chain: i%2 ? "ethereum" : "base", address: i%2 ? B : A }));
    if (i % 2 === 0) m.recordFulfillment(fulfillInput(m, c.reservation, 50+i));
  }
  const events = m.exportEvents({ limit: 100 });
  const replay = replayTwoPhasePresaleEventsV1(events, { maxEvents: 100 });
  assert.deepEqual(replay.state, m.state);
});
pass("replay rejects resulting-state substitution", () => {
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  m.confirmPayment(confirmInput(m, 60));
  const events = m.exportEvents({ limit: 10 });
  events[0].resulting_state_sha256 = digest("wrong");
  assert.throws(() => replayTwoPhasePresaleEventsV1(events), (e) => e.code === "EVENT_REPLAY_RESULTING_STATE_MISMATCH");
});

{
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  let expectedAvailable = MAX;
  let expectedReserved = 0n;
  let expectedFulfilled = 0n;
  for (let i = 0; i < 120; i++) {
    pass(`mixed two-phase conservation ${i}`, () => {
      const paid = BigInt((i % 17) + 1) * 1000n;
      const amount = paid * 2n;
      const c = m.confirmPayment(confirmInput(m, 1000+i, {
        chain: i % 2 ? "ethereum" : "base",
        atoms: paid.toString(),
        address: i % 3 ? A : B,
      }));
      assert.equal(c.ok, true);
      expectedAvailable -= amount;
      expectedReserved += amount;
      if (i % 3 !== 0) {
        const f = m.recordFulfillment(fulfillInput(m, c.reservation, 1000+i));
        assert.equal(f.ok, true);
        expectedReserved -= amount;
        expectedFulfilled += amount;
      }
      const s = m.state;
      assert.equal(BigInt(s.available_inventory_void_atoms), expectedAvailable);
      assert.equal(BigInt(s.reserved_inventory_void_atoms), expectedReserved);
      assert.equal(BigInt(s.fulfilled_inventory_void_atoms), expectedFulfilled);
      assert.equal(expectedAvailable + expectedReserved + expectedFulfilled, MAX);
    });
  }
}

pass("schema, fixture, docs, workflow are bound", () => {
  const schema = JSON.parse(read("schemas/buy-void-chain2050-presale-two-phase-v1.schema.json"));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.additionalProperties, false);
  const fixture = JSON.parse(read("fixtures/economic/buy-void-chain2050-presale-two-phase-v1.example.json"));
  assert.deepEqual(fixture.constants, PRESALE);
  assert.deepEqual(fixture.authority, AUTHORITY);
  const doc = read("docs/architecture/buy-void-chain2050-presale-two-phase-v1.md");
  for (const needle of [
    "payment confirmation remains separate from fulfillment",
    "available + reserved + fulfilled",
    "oversubscription",
    "current Chain-2050 delivery remains a plain ERC-20 transfer",
  ]) assert.ok(doc.includes(needle), needle);
  const workflow = read(".github/workflows/void-buy-void-chain2050-presale-two-phase-v1.yml");
  for (const needle of ["node: [22, 24, 26]", "persist-credentials: false", "git diff --check"]) {
    assert.ok(workflow.includes(needle), needle);
  }
});
pass("module has zero operational imports", () => {
  const source = read("scripts/lib/void_buy_void_chain2050_presale_two_phase_v1.mjs");
  for (const forbidden of ["node:fs","node:http","node:https","node:net","node:child_process","process.env","fetch("]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

assert.ok(cases >= 152, `expected >=152 cases, observed ${cases}`);
console.log(`${"VOID_BUY_VOID_CHAIN2050_PRESALE_TWO_PHASE_V1"}_GREEN`);
console.log("payment_confirmation_separate_from_fulfillment=true");
console.log("inventory_reserved_before_fulfillment=true");
console.log("oversubscription_rejected_before_delivery=true");
console.log("available_reserved_fulfilled_conservation=true");
console.log("base_usdc=true");
console.log("ethereum_usdc=true");
console.log("one_payment_one_reservation=true");
console.log("one_payment_one_fulfillment=true");
console.log("one_delivery_event_one_payment=true");
console.log("chain_anchor_payment_key_exact=true");
console.log("fulfillment_payment_key_self_validating=true");
console.log("reservation_anchor_replay_bound=true");
console.log("rpc_wallet_signer_broadcast_money=false");
console.log(`cases=${cases}`);
