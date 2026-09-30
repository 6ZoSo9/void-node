#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
} from "../tools/void-participant-postpurchase-finality-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
  buildVoidParticipantPostpurchaseProductionRuntimeBindingV1,
  collectVoidParticipantPostpurchaseProductionRuntimeBindingV1,
} from "../tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-participant-postpurchase-production-runtime-binding-v1.mjs",
);

const TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const DELIVERY_HASH = "0x" + "a".repeat(64);
const CONTROL_HASH = "0x" + "b".repeat(64);
const DELIVERY_BLOCK_HASH = "0x" + "c".repeat(64);
const CONTROL_BLOCK_HASH = "0x" + "d".repeat(64);
const PARTICIPANT =
  "0x1111111111111111111111111111111111111111";
const FULFILLMENT =
  "0x2222222222222222222222222222222222222222";
const RECIPIENT =
  "0x3333333333333333333333333333333333333333";
const DELIVERED = "100000000000000000000";
const CONTROLLED = "25000000000000000000";
const DELIVERY_BLOCK = "100";
const CONTROL_BLOCK = "110";
const DELIVERY_LOG_INDEX = "0";
const CONTROL_LOG_INDEX = "0";
const PUBLIC_BASE = "https://seed.nullfeed.org";
const STATUS_PATH =
  "/public-node/economic/epoch2/read-status-v1.json";
const RECEIPT_PATH =
  "/public-node/economic/epoch2/receipt-v1";
const RUNTIME_MARKER =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1";
const GENESIS_BLOCK_HASH =
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const GENESIS_STATE_ROOT =
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";

const PAYLOAD_KEYS = [
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
  if (
    typeof value === "number"
    && Number.isSafeInteger(value)
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  ) {
    return (
      "{"
      + Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key)
            + ":"
            + canonicalJson(value[key]),
        )
        .join(",")
      + "}"
    );
  }
  throw new Error("invalid_canonical_value");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function evidenceId(value) {
  const payload = {};
  for (const key of PAYLOAD_KEYS) {
    payload[key] = value[key];
  }
  return (
    "sha256:"
    + sha256(
      Buffer.from(
        canonicalJson(payload),
        "utf8",
      ),
    )
  );
}

function finalityAuthority() {
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

const DELIVERY_FINGERPRINT = sha256(
  Buffer.from(
    [
      "chain_id=2050",
      "transaction_hash=" + DELIVERY_HASH,
      "receipt_block_number=" + DELIVERY_BLOCK,
      "receipt_block_hash=" + DELIVERY_BLOCK_HASH,
      "void_token_address=" + TOKEN,
      "transfer_from=" + FULFILLMENT,
      "transfer_to=" + PARTICIPANT,
      "token_amount_atoms=" + DELIVERED,
      "transfer_log_index=" + DELIVERY_LOG_INDEX,
    ].join("\n"),
    "utf8",
  ),
);

function finalityEvidence() {
  const value = {
    marker: VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
    schema:
      "void.participant-postpurchase-finality-evidence.v1",
    chain_id: 2050,
    execution_epoch: 2,
    delivery_transaction_hash: DELIVERY_HASH,
    delivery_receipt_evidence_fingerprint_sha256:
      DELIVERY_FINGERPRINT,
    delivery_fulfillment_wallet: FULFILLMENT,
    delivered_token_amount_atoms: DELIVERED,
    delivery_transfer_log_index: DELIVERY_LOG_INDEX,
    delivery_receipt_block_number: DELIVERY_BLOCK,
    delivery_receipt_block_hash: DELIVERY_BLOCK_HASH,
    delivery_observed_confirmation_count: "6",
    delivery_current_confirmation_count: "21",
    transaction_hash: CONTROL_HASH,
    participant_address: PARTICIPANT,
    void_token: TOKEN,
    transfer_recipient: RECIPIENT,
    transfer_amount_atoms: CONTROLLED,
    transfer_log_index: CONTROL_LOG_INDEX,
    receipt_block_number: CONTROL_BLOCK,
    receipt_block_hash: CONTROL_BLOCK_HASH,
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
    participant_postpurchase_voidtoken_control_finality_source_ready:
      true,
    runtime_or_launch_evidence: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission_performed: false,
    transaction_broadcast_performed: false,
    authoritative_chain2050_write_performed: false,
    token_movement_performed_by_this_verifier: false,
    funds_movement_performed_by_this_verifier: false,
    authority: finalityAuthority(),
  };
  value.evidence_id = evidenceId(value);
  return value;
}

function expected() {
  return {
    delivery_transaction_hash: DELIVERY_HASH,
    delivery_receipt_evidence_fingerprint_sha256:
      DELIVERY_FINGERPRINT,
    participant_address: PARTICIPANT,
    delivered_token_amount_atoms: DELIVERED,
    control_transaction_hash: CONTROL_HASH,
    control_transfer_recipient: RECIPIENT,
    control_transfer_amount_atoms: CONTROLLED,
    control_receipt_block_number: CONTROL_BLOCK,
    control_receipt_block_hash: CONTROL_BLOCK_HASH,
    control_transfer_log_index: CONTROL_LOG_INDEX,
    minimum_delivery_confirmation_count: "12",
    minimum_control_confirmation_count: "6",
  };
}

function finalityInput() {
  return {
    expected: expected(),
    evidence: finalityEvidence(),
  };
}

function runtimeBoundary() {
  return {
    production_successor_rpc_endpoint_selected: true,
    exact_production_genesis_read_replica: true,
    p2p_enabled: false,
    discovery_enabled: false,
    raw_public_rpc_allowed: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  };
}

function transport(body, pathname) {
  const bytes = Buffer.from(
    JSON.stringify(body, null, 2) + "\n",
    "utf8",
  );
  return {
    url: new URL(pathname, PUBLIC_BASE).href,
    http_status: 200,
    body,
    artifact_sha256: sha256(bytes),
  };
}

function statusResult() {
  return transport(
    {
      ok: true,
      marker: RUNTIME_MARKER,
      status:
        "INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY",
      chain_id: 2050,
      execution_epoch: 2,
      block_number: "0x0",
      block_hash: GENESIS_BLOCK_HASH,
      state_root: GENESIS_STATE_ROOT,
      query_kinds: ["balance", "code", "receipt"],
      balance_code_block_fixed_to_genesis: true,
      live_receipt_lookup_transport_verified: true,
      successful_receipt_semantics_source_proven: true,
      live_balance_receipt_code_gateway_ready: true,
      runtime_route_active: true,
      public_gateway_active: false,
      ...runtimeBoundary(),
    },
    STATUS_PATH,
  );
}

function receiptResult({
  transactionHash,
  blockNumberHex,
  blockHash,
  stateRoot,
  from,
}) {
  const pathname =
    RECEIPT_PATH + "?tx=" + transactionHash;
  const coreEvidence = {
    query_kind: "receipt",
    chain_id: 2050,
    execution_epoch: 2,
    block_number: blockNumberHex,
    block_hash: blockHash,
    state_root: stateRoot,
    transaction_hash: transactionHash,
    receipt_status: "0x1",
    receipt_from: from,
    receipt_to: TOKEN,
  };
  return transport(
    {
      ok: true,
      marker: RUNTIME_MARKER,
      status: "LIVE_SUCCESSOR_RECEIPT_VERIFIED",
      receipt_found: true,
      source_evidence_id:
        "sha256:"
        + sha256(
          Buffer.from(
            canonicalJson(coreEvidence),
            "utf8",
          ),
        ),
      transaction_hash: transactionHash,
      block_number: blockNumberHex,
      block_hash: blockHash,
      state_root: stateRoot,
      receipt_status: "0x1",
      receipt_from: from,
      receipt_to: TOKEN,
      exact_receipt_identity_revalidated: true,
      exact_block_identity_revalidated: true,
      live_receipt_lookup_transport_verified: true,
      successful_receipt_semantics_source_proven: true,
      live_balance_receipt_code_gateway_ready: true,
      runtime_route_active: true,
      public_gateway_active: false,
      ...runtimeBoundary(),
    },
    pathname,
  );
}

function deliveryResult() {
  return receiptResult({
    transactionHash: DELIVERY_HASH,
    blockNumberHex: "0x64",
    blockHash: DELIVERY_BLOCK_HASH,
    stateRoot: "0x" + "1".repeat(64),
    from: FULFILLMENT,
  });
}

function controlResult() {
  return receiptResult({
    transactionHash: CONTROL_HASH,
    blockNumberHex: "0x6e",
    blockHash: CONTROL_BLOCK_HASH,
    stateRoot: "0x" + "2".repeat(64),
    from: PARTICIPANT,
  });
}

function build(overrides = {}) {
  return buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
    finalityInput: finalityInput(),
    statusResult: statusResult(),
    deliveryReceiptResult: deliveryResult(),
    controlReceiptResult: controlResult(),
    ...overrides,
  });
}

const result = build();
assert.equal(
  result.marker,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1,
);
assert.equal(
  result.status,
  "PRODUCTION_RUNTIME_FINALITY_BINDING_VERIFIED_SOURCE_PROMOTION_HOLD",
);
assert.match(
  result.runtime_binding_id,
  /^voidpprtb1_[0-9a-f]{64}$/u,
);
assert.equal(result.production_runtime_binding_verified, true);
assert.equal(
  result.participant_control_finality_evidence_imported,
  true,
);
assert.equal(
  result
    .participant_postpurchase_voidtoken_control_runtime_binding_source_ready,
  true,
);
assert.equal(
  result.participant_post_purchase_voidtoken_control_ready,
  false,
);
assert.equal(result.coupled_candidate_updated, false);
assert.equal(result.candidate_promotion_required, true);
assert.equal(result.runtime.chain_id, 2050);
assert.equal(result.runtime.execution_epoch, 2);
assert.equal(result.runtime.raw_public_rpc_used, false);
assert.equal(
  result.runtime.delivery.receipt_from,
  FULFILLMENT,
);
assert.equal(
  result.runtime.delivery.receipt_to,
  TOKEN,
);
assert.equal(
  result.runtime.control.receipt_from,
  PARTICIPANT,
);
assert.equal(
  result.runtime.control.receipt_to,
  TOKEN,
);
assert.equal(
  result.runtime.delivery.block_number,
  DELIVERY_BLOCK,
);
assert.equal(
  result.runtime.control.block_number,
  CONTROL_BLOCK,
);

for (const [key, value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_AUTHORITY_V1,
)) {
  const expectedValue = [
    "read_only_external_runtime_verification",
    "finality_reimport_required",
    "exact_public_origin_required",
    "exact_public_read_status_required",
    "exact_delivery_receipt_revalidation_required",
    "exact_control_receipt_revalidation_required",
    "filesystem_input_read",
    "create_only_evidence_output",
  ].includes(key);
  assert.equal(value, expectedValue, key);
}

{
  const calls = [];
  const byPath = new Map([
    [STATUS_PATH, statusResult()],
    [
      RECEIPT_PATH + "?tx=" + DELIVERY_HASH,
      deliveryResult(),
    ],
    [
      RECEIPT_PATH + "?tx=" + CONTROL_HASH,
      controlResult(),
    ],
  ]);
  const collected =
    await collectVoidParticipantPostpurchaseProductionRuntimeBindingV1({
      finalityInput: finalityInput(),
      fetchJson: async (pathname) => {
        calls.push(pathname);
        assert.equal(byPath.has(pathname), true);
        return structuredClone(byPath.get(pathname));
      },
    });
  assert.deepEqual(calls, [
    STATUS_PATH,
    RECEIPT_PATH + "?tx=" + DELIVERY_HASH,
    RECEIPT_PATH + "?tx=" + CONTROL_HASH,
  ]);
  assert.equal(
    collected.runtime_binding_id,
    result.runtime_binding_id,
  );
}

{
  const bad = statusResult();
  bad.body.chain_id = 1;
  assert.throws(
    () => build({
      statusResult: bad,
    }),
    /PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_STATUS_IDENTITY_INVALID/u,
  );
}

{
  const bad = deliveryResult();
  bad.body.block_hash = "0x" + "9".repeat(64);
  assert.throws(
    () => build({
      deliveryReceiptResult: bad,
    }),
    /PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_DELIVERY_RECEIPT_IDENTITY_INVALID/u,
  );
}

{
  const bad = deliveryResult();
  bad.body.receipt_from =
    "0x9999999999999999999999999999999999999999";
  assert.throws(
    () => build({
      deliveryReceiptResult: bad,
    }),
    /PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_DELIVERY_RECEIPT_IDENTITY_INVALID/u,
  );
}

{
  const bad = controlResult();
  bad.body.transaction_hash =
    "0x" + "9".repeat(64);
  assert.throws(
    () => build({
      controlReceiptResult: bad,
    }),
    /PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_RECEIPT_IDENTITY_INVALID/u,
  );
}

{
  const bad = controlResult();
  bad.body.source_evidence_id =
    "sha256:" + "9".repeat(64);
  assert.throws(
    () => build({
      controlReceiptResult: bad,
    }),
    /PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_SOURCE_EVIDENCE_ID_MISMATCH/u,
  );
}

{
  const bad = controlResult();
  bad.body.transaction_submission = true;
  assert.throws(
    () => build({
      controlReceiptResult: bad,
    }),
    /PARTICIPANT_POSTPURCHASE_RUNTIME_BINDING_CONTROL_AUTHORITY_INVALID/u,
  );
}

{
  const bad = finalityInput();
  bad.expected.participant_address =
    "0x9999999999999999999999999999999999999999";
  assert.throws(
    () =>
      buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
        finalityInput: bad,
        statusResult: statusResult(),
        deliveryReceiptResult: deliveryResult(),
        controlReceiptResult: controlResult(),
      }),
    /PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_BINDING_MISMATCH/u,
  );
}

const work = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-postpurchase-runtime-binding-v1-",
  ),
);
try {
  const inputFile = path.join(work, "finality-input.json");
  fs.writeFileSync(
    inputFile,
    JSON.stringify(finalityInput(), null, 2) + "\n",
    { mode: 0o600 },
  );

  const relativeInput = spawnSync(
    process.execPath,
    [
      TOOL,
      "collect",
      "--finality-input",
      "relative-input.json",
      "--output",
      path.join(work, "relative-input-output.json"),
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(relativeInput.status, 0);
  assert.match(
    relativeInput.stderr,
    /finality_input_path_must_be_absolute/u,
  );

  const relativeOutput = spawnSync(
    process.execPath,
    [
      TOOL,
      "collect",
      "--finality-input",
      inputFile,
      "--output",
      "relative-output.json",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.notEqual(relativeOutput.status, 0);
  assert.match(
    relativeOutput.stderr,
    /output_path_must_be_absolute_canonical/u,
  );
} finally {
  fs.rmSync(
    work,
    { recursive: true, force: true },
  );
}

const source = fs.readFileSync(TOOL, "utf8");
for (const required of [
  'VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_PUBLIC_ORIGIN_V1 =\n  "https://seed.nullfeed.org"',
  "https.request(",
  "agent: false",
  "production_runtime_connect_timeout",
  "production_runtime_inactivity_timeout",
  "production_runtime_total_timeout",
  'response.on("close"',
  "production_runtime_response_incomplete",
  "importVoidParticipantPostpurchaseFinalityV1",
  "receipt_from",
  "receipt_to",
]) {
  assert.equal(
    source.includes(required),
    true,
    "missing source marker: " + required,
  );
}
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "eth_getTransactionReceipt",
  "http://seed.nullfeed.org",
  "systemctl",
  "--rpc",
  "--origin",
  "--transaction-hash",
  "--wallet",
  "--key-file",
  "privateKey",
  "process.env",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    "forbidden source marker: " + forbidden,
  );
}

console.log(
  "VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1_PROOF_GREEN",
);
console.log("finality_reimported=true");
console.log("production_public_origin_fixed=true");
console.log("status_route_bound=true");
console.log("delivery_receipt_route_bound=true");
console.log("control_receipt_route_bound=true");
console.log("delivery_receipt_actor_binding=true");
console.log("control_receipt_actor_binding=true");
console.log("receipt_block_identity_bound=true");
console.log("separate_connect_inactivity_total_deadlines=true");
console.log("raw_public_rpc_used=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("private_key_access=false");
console.log("wallet_access=false");
console.log("token_movement=false");
console.log("funds_movement=false");
console.log(
  "participant_postpurchase_voidtoken_control_runtime_binding_source_ready=true",
);
console.log(
  "participant_post_purchase_voidtoken_control_ready=false",
);
console.log("candidate_promotion_required=true");
