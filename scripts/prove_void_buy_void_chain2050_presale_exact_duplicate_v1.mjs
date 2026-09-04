#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BuyVoidChain2050PresaleReferenceMachineV1,
  canonicalBuyVoidPaymentIdentityV1,
  computeBuyVoidChain2050FulfillmentAnchorSha256V1,
  validateBuyVoidChain2050FulfillmentRecordV1,
} from "./lib/void_buy_void_chain2050_presale_settlement_v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = (value) => createHash("sha256").update(String(value)).digest("hex");
const hash = (value) => `0x${digest(value)}`;
const ADDRESS = `0x${"6".repeat(40)}`;
const OTHER = `0x${"7".repeat(40)}`;
let cases = 0;

function payment() {
  const sourceTransactionHash = hash("exact-duplicate-source-payment");
  const canonicalPaymentIdentity = canonicalBuyVoidPaymentIdentityV1({
    source_chain: "base",
    source_transaction_hash: sourceTransactionHash,
    source_log_index: "7",
  });
  return {
    schema: "void_buy_void_finalized_source_payment_v1",
    marker: "VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1",
    source_chain: "base",
    source_chain_id: "8453",
    source_transaction_hash: sourceTransactionHash,
    source_log_index: "7",
    canonical_payment_identity: canonicalPaymentIdentity,
    payment_key_sha256: digest(canonicalPaymentIdentity),
    payer_address: ADDRESS,
    delivery_address: ADDRESS,
    payment_usdc_atoms: "1000000",
    source_policy_fingerprint_sha256: digest("base-policy"),
    source_finality_attestation_sha256: digest("base-finality"),
    finality_status: "finalized",
    exact_payment_verified: true,
  };
}

function delivery(patch = {}) {
  return {
    schema: "void_chain2050_finalized_delivery_v1",
    marker: "VOID_CHAIN2050_FINALIZED_DELIVERY_V1",
    chain_id: "2050",
    transaction_hash: hash("exact-duplicate-chain2050-delivery"),
    log_index: "3",
    block_height: "1951060",
    block_hash: hash("exact-duplicate-block"),
    recipient_address: ADDRESS,
    void_amount_atoms: "2000000",
    execution_status: "success",
    accepted_checkpoint_height: "1951100",
    accepted_checkpoint_hash: hash("exact-duplicate-checkpoint"),
    finality_policy_id: "mainnet0-checkpoint-finality-v1",
    finality_attestation_sha256: digest("chain2050-finality"),
    ...patch,
  };
}

function candidate(machine, chain2050Delivery = delivery()) {
  return {
    expected_state_sha256: machine.state.state_sha256,
    source_payment: payment(),
    chain2050_delivery: chain2050Delivery,
  };
}

function pass(name, body) {
  try {
    body();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function conflict(name, patch, reason = "PAYMENT_ALREADY_FULFILLED_CONFLICT") {
  pass(name, () => {
    const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
    assert.equal(machine.apply(candidate(machine)).status, "applied");
    const result = machine.apply(candidate(machine, delivery(patch)));
    assert.equal(result.ok, false);
    assert.equal(result.status, "held");
    assert.equal(result.reason, reason);
    assert.equal(result.mutation_applied, false);
    assert.equal(result.transaction_authority_granted, false);
    assert.equal(machine.fulfillmentCount, 1);
  });
}

pass("exact immutable duplicate converges", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const first = machine.apply(candidate(machine));
  assert.equal(first.status, "applied");
  const duplicate = machine.apply(candidate(machine));
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "duplicate_exact");
  assert.equal(duplicate.mutation_applied, false);
  assert.deepEqual(duplicate.fulfillment, first.fulfillment);
  assert.deepEqual(duplicate.state, first.state);
  assert.equal(machine.fulfillmentCount, 1);
});

conflict(
  "recipient drift is never an exact duplicate",
  { recipient_address: OTHER },
  "DELIVERY_RECIPIENT_MISMATCH",
);
conflict("accepted checkpoint height drift conflicts", {
  accepted_checkpoint_height: "1951200",
});
conflict("accepted checkpoint hash drift conflicts", {
  accepted_checkpoint_hash: hash("foreign-checkpoint"),
});
conflict("finality policy drift conflicts", {
  finality_policy_id: "mainnet0-checkpoint-finality-v2",
});
conflict("finality attestation drift conflicts", {
  finality_attestation_sha256: digest("foreign-finality"),
});
conflict("containing block height drift conflicts", {
  block_height: "1951061",
});
conflict("containing block hash drift conflicts", {
  block_hash: hash("foreign-block"),
});

pass("fulfillment anchor retains complete finality tuple", () => {
  const machine = new BuyVoidChain2050PresaleReferenceMachineV1();
  const result = machine.apply(candidate(machine));
  const record = result.fulfillment;
  assert.equal(record.chain2050_accepted_checkpoint_height, "1951100");
  assert.equal(
    record.chain2050_accepted_checkpoint_hash,
    hash("exact-duplicate-checkpoint"),
  );
  assert.equal(
    record.chain2050_finality_policy_id,
    "mainnet0-checkpoint-finality-v1",
  );
  assert.equal(
    record.fulfillment_anchor_sha256,
    computeBuyVoidChain2050FulfillmentAnchorSha256V1(record),
  );

  for (const [field, value] of [
    ["chain2050_accepted_checkpoint_height", "1951200"],
    ["chain2050_accepted_checkpoint_hash", hash("tampered-checkpoint")],
    ["chain2050_finality_policy_id", "mainnet0-checkpoint-finality-v2"],
  ]) {
    const changed = structuredClone(record);
    changed[field] = value;
    assert.throws(
      () => validateBuyVoidChain2050FulfillmentRecordV1(changed),
      (error) => error.code === "FULFILLMENT_ANCHOR_MISMATCH",
      field,
    );
  }
});

pass("closed schema requires the complete finality tuple", () => {
  const schema = JSON.parse(
    readFileSync(
      resolve(
        ROOT,
        "schemas/buy-void-chain2050-presale-settlement-v1.schema.json",
      ),
      "utf8",
    ),
  );
  const required = new Set(schema.$defs.fulfillment.required);
  for (const field of [
    "chain2050_accepted_checkpoint_height",
    "chain2050_accepted_checkpoint_hash",
    "chain2050_finality_policy_id",
  ]) {
    assert.equal(required.has(field), true, field);
    assert.ok(schema.$defs.fulfillment.properties[field], field);
  }
});

assert.equal(cases, 10);
console.log("VOID_BUY_VOID_CHAIN2050_PRESALE_EXACT_DUPLICATE_V1_GREEN");
console.log("complete_chain2050_finality_tuple_bound=true");
console.log("recipient_drift_rejected=true");
console.log("checkpoint_drift_rejected=true");
console.log("finality_policy_drift_rejected=true");
console.log("exact_duplicate_idempotent=true");
console.log(`cases=${cases}`);
