#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BuyVoidChain2050PresaleReferenceMachineV1,
  canonicalBuyVoidPaymentIdentityV1,
  canonicalBuyVoidPaymentKeySha256V1,
  canonicalChain2050DeliveryEventKeySha256V1,
  classifyUnanchoredBuyVoidLocalClaimV1,
  computeBuyVoidChain2050FulfillmentAnchorSha256V1,
  createBuyVoidChain2050PresaleGenesisV1,
  reconcileBuyVoidLocalFulfillmentProjectionV1,
  replayBuyVoidChain2050PresaleEventsV1,
  validateBuyVoidChain2050FulfillmentRecordV1,
  validateBuyVoidChain2050PresaleStateV1,
  VOID_BUY_VOID_CHAIN2050_PRESALE_AUTHORITY_V1 as AUTHORITY,
  VOID_BUY_VOID_CHAIN2050_PRESALE_CONSTANTS_V1 as CONSTANTS,
  VOID_BUY_VOID_CHAIN2050_PRESALE_SETTLEMENT_V1 as MARKER,
} from "./lib/void_buy_void_chain2050_presale_settlement_v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");
const digest = (value) => createHash("sha256").update(String(value)).digest("hex");
const hash = (value) => `0x${digest(value)}`;
const A = `0x${"a".repeat(40)}`;
const B = `0x${"b".repeat(40)}`;
const MAX = BigInt(CONSTANTS.initial_inventory_void_atoms);
let cases = 0;
function pass(name, fn) {
  try { fn(); cases += 1; }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
}
function payment(id, { chain = "base", atoms = "1000000", address = A, patch = {} } = {}) {
  const canonicalChain = chain === "eth" ? "ethereum" : chain;
  const tx = hash(`source:${id}`);
  const log = String(id % 97);
  const identity = canonicalBuyVoidPaymentIdentityV1({
    source_chain: chain, source_transaction_hash: tx, source_log_index: log,
  });
  return {
    schema: "void_buy_void_finalized_source_payment_v1",
    marker: "VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1",
    source_chain: chain,
    source_chain_id: canonicalChain === "base" ? "8453" : "1",
    source_transaction_hash: tx,
    source_log_index: log,
    canonical_payment_identity: identity,
    payment_key_sha256: digest(identity),
    payer_address: address,
    delivery_address: address,
    payment_usdc_atoms: String(atoms),
    source_policy_fingerprint_sha256: digest(`policy:${canonicalChain}`),
    source_finality_attestation_sha256: digest(`source-finality:${id}`),
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
    transaction_hash: hash(`delivery:${id}`),
    log_index: String(id % 89),
    block_height: String(1000 + id),
    block_hash: hash(`block:${id}`),
    recipient_address: address,
    void_amount_atoms: String(atoms),
    execution_status: "success",
    accepted_checkpoint_height: String(2000 + id),
    accepted_checkpoint_hash: hash(`checkpoint:${id}`),
    finality_policy_id: "mainnet0-checkpoint-finality-v1",
    finality_attestation_sha256: digest(`chain-finality:${id}`),
    ...patch,
  };
}
function input(machine, options = {}) {
  const id = options.id ?? 1;
  const paid = String(options.paid ?? "1000000");
  return {
    expected_state_sha256: options.expected ?? machine.state.state_sha256,
    source_payment: payment(id, {
      chain: options.chain, atoms: paid, address: options.address,
      patch: options.paymentPatch,
    }),
    chain2050_delivery: delivery(id, {
      atoms: String(options.delivered ?? BigInt(paid) * 2n),
      address: options.address,
      patch: options.deliveryPatch,
    }),
  };
}
function hold(machine, candidate, reason) {
  const result = machine.apply(candidate);
  assert.equal(result.ok, false);
  assert.equal(result.status, "held");
  assert.equal(result.reason, reason);
  assert.equal(result.mutation_applied, false);
  assert.equal(result.transaction_authority_granted, false);
}

pass("authority is exactly source-only", () => {
  assert.deepEqual(AUTHORITY, {
    source_only_reference_machine: true, chain_state_mutation: false,
    rpc_call: false, filesystem_read: false, filesystem_write: false,
    wallet_access: false, signer_access: false, transaction_construction: false,
    transaction_signing: false, transaction_broadcast: false,
    inventory_funding: false, public_presale_activation: false,
    money_movement: false,
  });
});
pass("canonical economics", () => {
  assert.equal(CONSTANTS.initial_inventory_void_atoms, "10000000000000");
  assert.equal(CONSTANTS.rate_void_atoms_numerator, "2");
  assert.equal(CONSTANTS.rate_void_atoms_denominator, "1");
  assert.equal(CONSTANTS.no_hidden_minimum, true);
  assert.equal(CONSTANTS.no_per_buyer_throttle_below_remaining_inventory, true);
});
pass("genesis conservation", () => {
  const genesis = createBuyVoidChain2050PresaleGenesisV1();
  assert.deepEqual(validateBuyVoidChain2050PresaleStateV1(genesis), genesis);
  assert.equal(BigInt(genesis.remaining_inventory_void_atoms) + BigInt(genesis.fulfilled_void_atoms), MAX);
});
pass("cross-rail identity domains differ", () => {
  const tx = hash("same-source");
  const base = canonicalBuyVoidPaymentKeySha256V1({ source_chain: "base", source_transaction_hash: tx, source_log_index: "0" });
  const eth = canonicalBuyVoidPaymentKeySha256V1({ source_chain: "ethereum", source_transaction_hash: tx, source_log_index: "0" });
  assert.notEqual(base, eth);
});
for (const [index, chain] of ["base", "ethereum", "eth"].entries()) {
  pass(`${chain} happy path`, () => {
    const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
    const result = machine.apply(input(machine, { id: 10 + index, chain }));
    assert.equal(result.ok, true);
    assert.equal(result.fulfillment.source_chain, chain === "eth" ? "ethereum" : chain);
    assert.equal(result.state.remaining_inventory_void_atoms, (MAX - 2_000_000n).toString());
  });
}
pass("one USDC atom has no hidden minimum", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  assert.equal(machine.apply(input(machine, { id: 20, paid: "1", delivered: "2" })).ok, true);
});
pass("one buyer may consume the exact pool", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const result = machine.apply(input(machine, { id: 21, paid: (MAX / 2n).toString(), delivered: MAX.toString() }));
  assert.equal(result.ok, true);
  assert.equal(result.state.remaining_inventory_void_atoms, "0");
  hold(machine, input(machine, { id: 22, paid: "1", delivered: "2" }), "PRESALE_INVENTORY_EXHAUSTED");
});
pass("preview is non-mutating", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const before = machine.state;
  const result = machine.preview(input(machine, { id: 23 }));
  assert.equal(result.status, "would_apply");
  assert.deepEqual(machine.state, before);
});
pass("exact duplicate is idempotent", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const candidate = input(machine, { id: 24 });
  const first = machine.apply(candidate);
  const duplicate = machine.apply({ ...candidate, expected_state_sha256: machine.state.state_sha256 });
  assert.equal(duplicate.status, "duplicate_exact");
  assert.deepEqual(duplicate.fulfillment, first.fulfillment);
  assert.equal(machine.fulfillmentCount, 1);
});
pass("same payment with another delivery holds", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const first = input(machine, { id: 25 });
  assert.equal(machine.apply(first).ok, true);
  const conflict = { ...first, expected_state_sha256: machine.state.state_sha256,
    chain2050_delivery: delivery(2500) };
  hold(machine, conflict, "PAYMENT_ALREADY_FULFILLED_CONFLICT");
});
pass("one delivery event cannot serve two payments", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const first = input(machine, { id: 26 });
  assert.equal(machine.apply(first).ok, true);
  hold(machine, { expected_state_sha256: machine.state.state_sha256,
    source_payment: payment(2600), chain2050_delivery: first.chain2050_delivery },
    "DELIVERY_EVENT_ALREADY_BOUND_TO_PAYMENT");
});
pass("payment and delivery indexes return the same fulfillment", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const result = machine.apply(input(machine, { id: 261 }));
  assert.deepEqual(machine.getFulfillmentByPaymentKey(result.fulfillment.payment_key_sha256), result.fulfillment);
  assert.deepEqual(machine.getFulfillmentByDeliveryEventKey(result.fulfillment.delivery_event_key_sha256), result.fulfillment);
});
pass("event export enforces its bound", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  machine.apply(input(machine, { id: 262 }));
  assert.equal(machine.exportFulfillmentEvents({ offset: 0, limit: 1 }).length, 1);
  assert.throws(() => machine.exportFulfillmentEvents({ offset: 0, limit: 4097 }), (e) => e.code === "INVALID_EVENT_LIMIT");
});
pass("stale state holds", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const stale = machine.state.state_sha256;
  assert.equal(machine.apply(input(machine, { id: 27 })).ok, true);
  hold(machine, input(machine, { id: 28, expected: stale }), "STALE_PRESALE_STATE_PRECONDITION");
});
pass("rate mismatch holds", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  hold(machine, input(machine, { id: 29, paid: "10", delivered: "19" }), "PRESALE_RATE_MISMATCH");
});

const paymentAdversaries = [
  ["source_chain_id", "1", "SOURCE_CHAIN_ID_MISMATCH"],
  ["finality_status", "confirmed", "SOURCE_PAYMENT_NOT_FINALIZED"],
  ["exact_payment_verified", false, "SOURCE_EXACT_PAYMENT_NOT_VERIFIED"],
  ["payment_key_sha256", "0".repeat(64), "PAYMENT_KEY_MISMATCH"],
  ["canonical_payment_identity", "voidpay1:base:bad:0", "CANONICAL_PAYMENT_IDENTITY_MISMATCH"],
  ["source_transaction_hash", "0x12", "INVALID_SOURCE_TRANSACTION_HASH"],
  ["source_log_index", "01", "INVALID_SOURCE_LOG_INDEX"],
  ["payment_usdc_atoms", "0", "INVALID_PAYMENT_USDC_ATOMS"],
  ["payer_address", B, "PAYER_DELIVERY_ADDRESS_MISMATCH"],
  ["source_policy_fingerprint_sha256", "x", "INVALID_SOURCE_POLICY_FINGERPRINT"],
  ["source_finality_attestation_sha256", "x", "INVALID_SOURCE_FINALITY_ATTESTATION"],
];
for (const [index, [field, value, reason]] of paymentAdversaries.entries()) {
  pass(`payment adversary ${field}`, () => {
    const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
    const candidate = input(machine, { id: 100 + index });
    candidate.source_payment[field] = value;
    hold(machine, candidate, reason);
  });
}
const deliveryAdversaries = [
  ["chain_id", "1", "INVALID_DELIVERY_CHAIN_ID"],
  ["transaction_hash", "0x12", "INVALID_DELIVERY_TRANSACTION_HASH"],
  ["log_index", "01", "INVALID_DELIVERY_LOG_INDEX"],
  ["block_height", "0", "INVALID_DELIVERY_BLOCK_HEIGHT"],
  ["block_hash", "0x12", "INVALID_DELIVERY_BLOCK_HASH"],
  ["recipient_address", B, "DELIVERY_RECIPIENT_MISMATCH"],
  ["void_amount_atoms", "0", "INVALID_DELIVERY_VOID_ATOMS"],
  ["execution_status", "reverted", "DELIVERY_EXECUTION_NOT_SUCCESS"],
  ["accepted_checkpoint_height", "1", "DELIVERY_NOT_BEHIND_ACCEPTED_CHECKPOINT"],
  ["accepted_checkpoint_hash", "0x12", "INVALID_ACCEPTED_CHECKPOINT_HASH"],
  ["finality_policy_id", "", "INVALID_FINALITY_POLICY_ID"],
  ["finality_attestation_sha256", "x", "INVALID_CHAIN2050_FINALITY_ATTESTATION"],
];
for (const [index, [field, value, reason]] of deliveryAdversaries.entries()) {
  pass(`delivery adversary ${field}`, () => {
    const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
    const candidate = input(machine, { id: 200 + index });
    candidate.chain2050_delivery[field] = value;
    hold(machine, candidate, reason);
  });
}
for (const target of ["source_payment", "chain2050_delivery", "settlement"]) {
  pass(`${target} unknown field rejected`, () => {
    const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
    const candidate = input(machine, { id: 300 + cases });
    if (target === "settlement") candidate.extra = true;
    else candidate[target].extra = true;
    hold(machine, candidate, target === "source_payment" ? "SOURCE_PAYMENT_SHAPE" :
      target === "chain2050_delivery" ? "CHAIN2050_DELIVERY_SHAPE" : "SETTLEMENT_INPUT_SHAPE");
  });
}
pass("state and fulfillment hashes reject tamper", () => {
  const genesis = structuredClone(createBuyVoidChain2050PresaleGenesisV1());
  genesis.state_sha256 = "0".repeat(64);
  assert.throws(() => validateBuyVoidChain2050PresaleStateV1(genesis), (e) => e.code === "PRESALE_STATE_SHA256_MISMATCH");
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const record = structuredClone(machine.apply(input(machine, { id: 400 })).fulfillment);
  record.fulfillment_anchor_sha256 = "0".repeat(64);
  assert.throws(() => validateBuyVoidChain2050FulfillmentRecordV1(record), (e) => e.code === "FULFILLMENT_ANCHOR_MISMATCH");
});
pass("chain fulfillment rebuilds missing local projection", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const record = machine.apply(input(machine, { id: 401 })).fulfillment;
  const result = reconcileBuyVoidLocalFulfillmentProjectionV1({ chain_fulfillment: record, local_fulfillment: null });
  assert.equal(result.status, "rebuild_local_projection_from_chain");
  assert.equal(result.automatic_delivery_authorized, false);
});
pass("unanchored local claim cannot authorize delivery", () => {
  const result = classifyUnanchoredBuyVoidLocalClaimV1({ status: "fulfilled" });
  assert.equal(result.status, "hold_local_claim_not_present_on_chain");
  assert.equal(result.automatic_delivery_authorized, false);
});
pass("event replay reconstructs exact state without echoing a partial stream", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  for (let i = 0; i < 8; i += 1) machine.apply(input(machine, { id: 500 + i, chain: i % 2 ? "ethereum" : "base" }));
  const events = machine.exportFulfillmentEvents({ limit: 100 });
  const replay = replayBuyVoidChain2050PresaleEventsV1(events, { maxEvents: 100 });
  assert.deepEqual(replay.state, machine.state);
  assert.equal(Object.hasOwn(replay, "events"), false);
});
pass("replay rejects validly rehashed sequence drift", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const record = structuredClone(machine.apply(input(machine, { id: 510 })).fulfillment);
  record.state_sequence = "2";
  record.fulfillment_anchor_sha256 = computeBuyVoidChain2050FulfillmentAnchorSha256V1(record);
  assert.throws(() => replayBuyVoidChain2050PresaleEventsV1([record]), (e) => e.code === "EVENT_REPLAY_SEQUENCE_MISMATCH");
});

{
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  let fulfilled = 0n;
  for (let i = 0; i < 160; i += 1) {
    pass(`mixed-rail conservation transition ${i}`, () => {
      const paid = BigInt((i % 13) + 1) * 1000n;
      const result = machine.apply(input(machine, { id: 1000 + i,
        chain: i % 2 ? "ethereum" : "base", paid: paid.toString(), delivered: (paid * 2n).toString(),
        address: i % 2 ? A : B }));
      assert.equal(result.ok, true);
      fulfilled += paid * 2n;
      assert.equal(result.state.fulfilled_void_atoms, fulfilled.toString());
      assert.equal(BigInt(result.state.remaining_inventory_void_atoms) + fulfilled, MAX);
      assert.equal(machine.hasPaymentKey(result.fulfillment.payment_key_sha256), true);
      assert.equal(machine.hasDeliveryEventKey(result.fulfillment.delivery_event_key_sha256), true);
    });
  }
}
for (const [index, invalid] of ["", "+1", "-1", "01", "1.0", "1e3", "0x1", "NaN"].entries()) {
  pass(`canonical amount rejects ${JSON.stringify(invalid)}`, () => {
    const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
    const candidate = input(machine, { id: 2000 + index });
    candidate.source_payment.payment_usdc_atoms = invalid;
    hold(machine, candidate, "INVALID_PAYMENT_USDC_ATOMS");
  });
}
pass("fixture executes exactly", () => {
  const fixture = JSON.parse(read("fixtures/economic/buy-void-chain2050-presale-settlement-v1.example.json"));
  assert.deepEqual(fixture.constants, CONSTANTS);
  assert.deepEqual(fixture.authority, AUTHORITY);
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1({ genesis: fixture.genesis_state });
  const result = machine.apply({ expected_state_sha256: fixture.genesis_state.state_sha256,
    source_payment: fixture.source_payment, chain2050_delivery: fixture.chain2050_delivery });
  assert.deepEqual(result.fulfillment, fixture.fulfillment);
  assert.deepEqual(result.state, fixture.next_state);
});
pass("closed schema binds rails economics and authority", () => {
  const schema = JSON.parse(read("schemas/buy-void-chain2050-presale-settlement-v1.schema.json"));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.$defs.sourcePayment.properties.source_chain.enum, ["base", "ethereum"]);
  assert.equal(schema.$defs.constants.properties.initial_inventory_void_atoms.const, "10000000000000");
  assert.equal(schema.$defs.constants.properties.rate_void_atoms_numerator.const, "2");
  assert.equal(schema.$defs.authority.properties.money_movement.const, false);
});
pass("docs and workflow preserve exact boundary", () => {
  const doc = read("docs/architecture/buy-void-chain2050-presale-settlement-v1.md");
  for (const value of [MARKER, "10,000,000 VOID", "2 VOID per 1 USDC", "Base mainnet", "Ethereum mainnet",
    "finalized chain truth wins", "does not assert that the"]) assert.ok(doc.includes(value), value);
  const workflow = read(".github/workflows/void-buy-void-chain2050-presale-settlement-v1.yml");
  for (const value of ["node: [22, 24, 26]", "permissions:\n  contents: read", "persist-credentials: false",
    "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38", "git diff --check"]) assert.ok(workflow.includes(value), value);
});
pass("all source modules have zero operational imports", () => {
  const paths = [
    "scripts/lib/void_buy_void_chain2050_presale_identity_v1.mjs",
    "scripts/lib/void_buy_void_chain2050_presale_state_v1.mjs",
    "scripts/lib/void_buy_void_chain2050_presale_machine_v1.mjs",
    "scripts/lib/void_buy_void_chain2050_presale_settlement_v1.mjs",
  ];
  for (const path of paths) {
    const source = read(path);
    for (const forbidden of ["node:fs", "node:http", "node:https", "node:net", "node:child_process", "process.env", "fetch("])
      assert.equal(source.includes(forbidden), false, `${path}:${forbidden}`);
  }
});

assert.ok(cases >= 220, `expected at least 220 cases, observed ${cases}`);
console.log(`${MARKER}_GREEN`);
console.log("base_usdc=true");
console.log("ethereum_usdc=true");
console.log("chain2050_payment_keyed_fulfillment=true");
console.log("finite_inventory_10000000_void=true");
console.log("rate_2_void_per_1_usdc=true");
console.log("one_payment_one_fulfillment=true");
console.log("one_delivery_event_one_payment=true");
console.log("chain_truth_overrides_local_projection=true");
console.log("rpc_wallet_signer_broadcast_money=false");
console.log(`cases=${cases}`);
