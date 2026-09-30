#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
} from "../tools/void-participant-postpurchase-finality-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_V1,
  importVoidParticipantPostpurchaseFinalityV1,
} from "../tools/void-participant-postpurchase-finality-import-v1.mjs";

const canonicalVoidToken =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const deliveryHash = "0x" + "a".repeat(64);
const controlHash = "0x" + "b".repeat(64);
const deliveryBlockHash = "0x" + "c".repeat(64);
const controlBlockHash = "0x" + "d".repeat(64);
const participant =
  "0x1111111111111111111111111111111111111111";
const fulfillment =
  "0x2222222222222222222222222222222222222222";
const recipient =
  "0x3333333333333333333333333333333333333333";
const delivered = "100000000000000000000";
const controlled = "25000000000000000000";
const fingerprint = "e".repeat(64);

const payloadKeys = [
  "schema",
  "chain_id",
  "execution_epoch",
  "delivery_transaction_hash",
  "delivery_receipt_evidence_fingerprint_sha256",
  "delivery_fulfillment_wallet",
  "delivered_token_amount_atoms",
  "delivery_transfer_log_index",
  "delivery_receipt_block_number",
  "delivery_receipt_block_hash",
  "delivery_observed_confirmation_count",
  "delivery_current_confirmation_count",
  "transaction_hash",
  "participant_address",
  "void_token",
  "transfer_recipient",
  "transfer_amount_atoms",
  "transfer_log_index",
  "receipt_block_number",
  "receipt_block_hash",
  "observed_confirmation_count",
  "required_confirmation_count",
];

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  throw new Error("invalid_canonical_value");
}

function evidenceId(value) {
  const payload = {};
  for (const key of payloadKeys) payload[key] = value[key];
  return "sha256:" +
    createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function authority() {
  return {
    source_only: true,
    explicit_input_only: true,
    injected_read_transport_required: true,
    read_only_rpc: true,
    built_in_network_transport: false,
    transaction_submission: false,
    transaction_broadcast: false,
    automatic_retry: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    market_activation: false,
    public_presale_activation: false,
  };
}

function evidenceFixture() {
  const value = {
    marker: VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
    schema: "void.participant-postpurchase-finality-evidence.v1",
    chain_id: 2050,
    execution_epoch: 2,
    delivery_transaction_hash: deliveryHash,
    delivery_receipt_evidence_fingerprint_sha256: fingerprint,
    delivery_fulfillment_wallet: fulfillment,
    delivered_token_amount_atoms: delivered,
    delivery_transfer_log_index: "0",
    delivery_receipt_block_number: "100",
    delivery_receipt_block_hash: deliveryBlockHash,
    delivery_observed_confirmation_count: "6",
    delivery_current_confirmation_count: "21",
    transaction_hash: controlHash,
    participant_address: participant,
    void_token: canonicalVoidToken,
    transfer_recipient: recipient,
    transfer_amount_atoms: controlled,
    transfer_log_index: "0",
    receipt_block_number: "110",
    receipt_block_hash: controlBlockHash,
    observed_confirmation_count: "11",
    required_confirmation_count: "3",
    evidence_id: "sha256:" + "0".repeat(64),
    rpc_methods_used: [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
      "eth_getTransactionReceipt",
      "eth_getTransactionReceipt",
    ],
    exact_delivery_receipt_binding_verified: true,
    stable_delivery_receipt_revalidation_verified: true,
    delivery_to_control_participant_binding_verified: true,
    exact_submission_receipt_binding_verified: true,
    exact_voidtoken_transfer_finality_verified: true,
    stable_receipt_revalidation_verified: true,
    participant_postpurchase_voidtoken_control_finality_source_ready: true,
    runtime_or_launch_evidence: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission_performed: false,
    transaction_broadcast_performed: false,
    authoritative_chain2050_write_performed: false,
    token_movement_performed_by_this_verifier: false,
    funds_movement_performed_by_this_verifier: false,
    authority: authority(),
  };
  value.evidence_id = evidenceId(value);
  return value;
}

function expectedFixture(overrides = {}) {
  return {
    delivery_transaction_hash: deliveryHash,
    delivery_receipt_evidence_fingerprint_sha256: fingerprint,
    participant_address: participant,
    delivered_token_amount_atoms: delivered,
    control_transaction_hash: controlHash,
    control_transfer_recipient: recipient,
    control_transfer_amount_atoms: controlled,
    minimum_delivery_confirmation_count: "12",
    minimum_control_confirmation_count: "6",
    ...overrides,
  };
}

function verify(evidence = evidenceFixture(), expected = expectedFixture()) {
  return importVoidParticipantPostpurchaseFinalityV1({
    expected,
    evidence,
  });
}

function rejects(mutator, code, expectedMutator = null, repin = true) {
  const evidence = evidenceFixture();
  const expected = expectedFixture();
  if (mutator) {
    mutator(evidence);
    if (repin) evidence.evidence_id = evidenceId(evidence);
  }
  if (expectedMutator) expectedMutator(expected);
  assert.throws(
    () => verify(evidence, expected),
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const result = verify();
assert.equal(result.ok, true);
assert.equal(result.status, "VERIFIED_FINALITY_EVIDENCE_IMPORT");
assert.equal(
  result.marker,
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_V1,
);
assert.match(result.import_id, /^voidppfri1_[0-9a-f]{64}$/);
assert.match(result.binding_id, /^voidppfrb1_[0-9a-f]{64}$/);
assert.equal(result.source_evidence_id, evidenceFixture().evidence_id);
assert.equal(result.delivery_transaction_hash, deliveryHash);
assert.equal(
  result.delivery_receipt_evidence_fingerprint_sha256,
  fingerprint,
);
assert.equal(result.participant_address, participant);
assert.equal(result.delivered_token_amount_atoms, delivered);
assert.equal(result.control_transaction_hash, controlHash);
assert.equal(result.control_transfer_recipient, recipient);
assert.equal(result.control_transfer_amount_atoms, controlled);
assert.equal(result.observed_delivery_confirmation_count, "21");
assert.equal(result.observed_control_confirmation_count, "11");
assert.equal(result.participant_control_finality_evidence_imported, true);
assert.equal(result.participant_post_purchase_voidtoken_control_ready, false);
assert.equal(result.production_runtime_binding_required, true);
assert.equal(result.coupled_candidate_updated, false);
assert.equal(result.market_activation_authorized, false);
assert.equal(result.public_presale_activation_authorized, false);
assert.equal(result.funds_movement_authorized, false);

assert.equal(verify().import_id, result.import_id);

rejects(
  null,
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_BINDING_MISMATCH",
  (expected) => {
    expected.participant_address =
      "0x9999999999999999999999999999999999999999";
  },
);
rejects(
  null,
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_FINALITY_HOLD",
  (expected) => {
    expected.minimum_delivery_confirmation_count = "22";
  },
);
rejects(
  null,
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_FINALITY_HOLD",
  (expected) => {
    expected.minimum_control_confirmation_count = "12";
  },
);
rejects(
  (evidence) => {
    evidence.delivery_current_confirmation_count = "5";
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_CONFIRMATION_REGRESSION",
);
rejects(
  (evidence) => {
    evidence.observed_confirmation_count = "2";
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_CONFIRMATION_CONTRACT_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.receipt_block_number = "99";
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_BEFORE_DELIVERY",
);
rejects(
  (evidence) => {
    evidence.transfer_amount_atoms =
      (BigInt(delivered) + 1n).toString();
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_BINDING_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.void_token =
      "0x9999999999999999999999999999999999999999";
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CANONICAL_TOKEN_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.exact_delivery_receipt_binding_verified = false;
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_REQUIRED_PROOF_MISSING",
);
rejects(
  (evidence) => {
    evidence.runtime_or_launch_evidence = true;
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_RUNTIME_OR_AUTHORITY_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.authority.private_key_access = true;
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_AUTHORITY_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.rpc_methods_used.push("eth_sendRawTransaction");
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_RPC_METHOD_FORBIDDEN",
);
rejects(
  (evidence) => {
    evidence.evidence_id = "sha256:" + "f".repeat(64);
  },
  "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EVIDENCE_ID_MISMATCH",
  null,
  false,
);

for (const [key, value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_AUTHORITY_V1,
)) {
  if (
    key === "source_evidence_validation_only" ||
    key === "coupled_gate_binding_derivation"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-participant-postpurchase-finality-import-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_V1_PROOF_GREEN");
console.log("reviewed_expected_purchase_and_control_binding_required=true");
console.log("finality_evidence_id_recomputed=true");
console.log("minimum_delivery_finality_bound=true");
console.log("minimum_control_finality_bound=true");
console.log("canonical_voidtoken_required=true");
console.log("delivery_to_control_binding_imported=true");
console.log("participant_control_finality_evidence_imported=true");
console.log("participant_post_purchase_voidtoken_control_ready=false");
console.log("production_runtime_binding_required=true");
console.log("coupled_candidate_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
