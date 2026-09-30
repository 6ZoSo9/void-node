#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { id } from "ethers";

import {
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_V1,
  validateVoidParticipantPostpurchaseProductionRuntimeTargetV1,
  verifyVoidParticipantPostpurchaseProductionRuntimeFinalityV1,
} from "../tools/void-participant-postpurchase-production-runtime-finality-v1.mjs";

const voidToken = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const participant = "0x1111111111111111111111111111111111111111";
const fulfillment = "0x2222222222222222222222222222222222222222";
const recipient = "0x3333333333333333333333333333333333333333";
const deliveryHash = "0x" + "a".repeat(64);
const controlHash = "0x" + "b".repeat(64);
const deliveryBlockHash = "0x" + "c".repeat(64);
const controlBlockHash = "0x" + "d".repeat(64);
const delivered = "100000000000000000000";
const controlled = "25000000000000000000";
const transferTopic = id("Transfer(address,address,uint256)").toLowerCase();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function addressTopic(address) {
  return "0x" + address.slice(2).padStart(64, "0");
}

function uintData(value) {
  return "0x" + BigInt(value).toString(16).padStart(64, "0");
}

const deliveryFingerprint = sha256([
  "chain_id=2050",
  `transaction_hash=${deliveryHash}`,
  "receipt_block_number=100",
  `receipt_block_hash=${deliveryBlockHash}`,
  `void_token_address=${voidToken}`,
  `transfer_from=${fulfillment}`,
  `transfer_to=${participant}`,
  `token_amount_atoms=${delivered}`,
  "transfer_log_index=0",
].join("\n"));

function targetAuthority() {
  return {
    source_only: true,
    rpc_call: false,
    filesystem_secret_read: false,
    credential_access: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_mutation: false,
    token_movement: false,
    funds_movement: false,
    market_activation: false,
    public_presale_activation: false,
  };
}

function activeTarget(rpcUrl) {
  return {
    marker: VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_V1,
    version: 1,
    status: "PRODUCTION_EPOCH2_RPC_TARGET_SELECTED",
    chain_id: 2050,
    execution_epoch: 2,
    network_identity: "mainnet0",
    hostname: "zoso-Precision-Tower-7810",
    rpc_url: rpcUrl,
    rpc_url_fingerprint_sha256: sha256(rpcUrl),
    production_rpc_target_selected: true,
    runtime_active_verified: true,
    exact_genesis_bound: true,
    production_validator_set_bound: true,
    migration_authorized: true,
    public_presale_activation_authorized: false,
    authority: targetAuthority(),
  };
}

function submission() {
  return {
    marker: "VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1",
    version: 1,
    status: "submission_accepted_finality_required",
    chain_id: "2050",
    participant_address: participant,
    void_token: voidToken,
    transfer_recipient: recipient,
    transfer_amount_atoms: controlled,
    transaction_hash: controlHash,
    delivery_transaction_hash: deliveryHash,
    delivery_receipt_block_number: "100",
    delivery_receipt_block_hash: deliveryBlockHash,
    delivery_transfer_log_index: "0",
    delivery_receipt_evidence_fingerprint_sha256: deliveryFingerprint,
    delivery_fulfillment_wallet: fulfillment,
    delivered_token_amount_atoms: delivered,
    delivery_observed_confirmation_count: "6",
    submission_may_have_occurred: true,
    automatic_retry: false,
    delivery_reconciliation_confirmed: true,
    participant_signature_recovered: true,
    delivery_recipient_equals_signer: true,
    canonical_voidtoken_transfer_verified: true,
    zero_native_value_verified: true,
    zero_gas_price_policy_bound: true,
    transaction_submission_performed: true,
    transaction_broadcast_performed: true,
    receipt_finality_verified: false,
    participant_postpurchase_voidtoken_control_ready: false,
  };
}

function expected() {
  return {
    delivery_transaction_hash: deliveryHash,
    delivery_receipt_evidence_fingerprint_sha256: deliveryFingerprint,
    participant_address: participant,
    delivered_token_amount_atoms: delivered,
    control_transaction_hash: controlHash,
    control_transfer_recipient: recipient,
    control_transfer_amount_atoms: controlled,
    control_receipt_block_number: "110",
    control_receipt_block_hash: controlBlockHash,
    control_transfer_log_index: "0",
    minimum_delivery_confirmation_count: "12",
    minimum_control_confirmation_count: "6",
  };
}

const deliveryReceipt = {
  transactionHash: deliveryHash,
  from: fulfillment,
  to: voidToken,
  status: "0x1",
  blockNumber: "0x64",
  blockHash: deliveryBlockHash,
  logs: [{
    address: voidToken,
    topics: [transferTopic, addressTopic(fulfillment), addressTopic(participant)],
    data: uintData(delivered),
    logIndex: "0x0",
    transactionHash: deliveryHash,
  }],
};
const controlReceipt = {
  transactionHash: controlHash,
  from: participant,
  to: voidToken,
  status: "0x1",
  blockNumber: "0x6e",
  blockHash: controlBlockHash,
  logs: [{
    address: voidToken,
    topics: [transferTopic, addressTopic(participant), addressTopic(recipient)],
    data: uintData(controlled),
    logIndex: "0x0",
    transactionHash: controlHash,
  }],
};

const canonicalHold = JSON.parse(fs.readFileSync(
  "ops/mainnet0/participant-postpurchase-production-runtime-target-v1.json",
  "utf8",
));
const hold = validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(
  canonicalHold,
  { requireActive: false },
);
assert.equal(hold.status, "HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED");
assert.equal(hold.target_id, null);
assert.throws(
  () => validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(canonicalHold),
  /PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_NOT_READY/,
);

const calls = [];
const server = http.createServer((request, response) => {
  let raw = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => { raw += chunk; });
  request.on("end", () => {
    const body = JSON.parse(raw);
    calls.push({ method: body.method, params: body.params });
    let result;
    if (body.method === "eth_chainId") result = "0x802";
    else if (body.method === "eth_blockNumber") result = "0x78";
    else if (body.method === "eth_getTransactionReceipt") {
      if (body.params?.[0] === deliveryHash) result = deliveryReceipt;
      else if (body.params?.[0] === controlHash) result = controlReceipt;
      else result = null;
    } else {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32601, message: "method not found" },
      }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const rpcUrl = `http://127.0.0.1:${address.port}/`;
  const target = activeTarget(rpcUrl);
  const normalizedTarget =
    validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(target);
  assert.match(normalizedTarget.target_id, /^voidppprt1_[0-9a-f]{64}$/);

  const result =
    await verifyVoidParticipantPostpurchaseProductionRuntimeFinalityV1({
      submission: submission(),
      expected: expected(),
      min_confirmations: "6",
      runtime_target: target,
      request_timeout_ms: 2_000,
    });
  assert.equal(result.ok, true);
  assert.equal(
    result.marker,
    VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1,
  );
  assert.equal(result.status, "VERIFIED_PRODUCTION_RUNTIME_FINALITY");
  assert.match(result.runtime_finality_id, /^voidpppprf1_[0-9a-f]{64}$/);
  assert.equal(result.runtime_target_id, normalizedTarget.target_id);
  assert.equal(result.source_binding_id.startsWith("voidppfrb1_"), true);
  assert.equal(result.participant_control_finality_evidence_imported, true);
  assert.equal(result.participant_post_purchase_voidtoken_control_ready, true);
  assert.equal(result.production_runtime_binding_required, false);
  assert.equal(result.coupled_candidate_updated, false);
  assert.equal(result.market_activation_authorized, false);
  assert.equal(result.public_presale_activation_authorized, false);
  assert.equal(result.funds_movement_authorized, false);
  assert.deepEqual(calls.map((entry) => entry.method), [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
    "eth_getTransactionReceipt",
    "eth_getTransactionReceipt",
  ]);

  const badFingerprint = structuredClone(target);
  badFingerprint.rpc_url_fingerprint_sha256 = "f".repeat(64);
  assert.throws(
    () => validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(badFingerprint),
    /PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_FINGERPRINT_MISMATCH/,
  );

  const publicRpc = structuredClone(target);
  publicRpc.rpc_url = "https://example.com/";
  publicRpc.rpc_url_fingerprint_sha256 = sha256(publicRpc.rpc_url);
  assert.throws(
    () => validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(publicRpc),
    /PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_RPC_URL_INVALID/,
  );

  const inactive = structuredClone(target);
  inactive.runtime_active_verified = false;
  assert.throws(
    () => validateVoidParticipantPostpurchaseProductionRuntimeTargetV1(inactive),
    /PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_TARGET_NOT_READY/,
  );
} finally {
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
}

for (const [key, value] of Object.entries(
  VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_AUTHORITY_V1,
)) {
  if ([
    "source_validation",
    "read_only_rpc",
    "built_in_loopback_transport",
    "filesystem_read",
    "create_only_receipt_write",
  ].includes(key)) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-participant-postpurchase-production-runtime-finality-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  ".signTransaction(",
  "privateKey",
  "child_process",
  "systemctl",
  "sudo ",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1%õ$ôôeôu$TTâ"À¢°¦6öç6öÆRæÆör&6æöæ6Å÷'VçFÖU÷F&vWE÷6VÆV7FVCÖfÇ6R"°¦6öç6öÆRæÆör&6æöæ6Å÷'VçFÖU÷F&vWEööÆC×G'VR"°¦6öç6öÆRæÆör&Æö÷&6µ÷'5ööæÇ×G'VR"°¦6öç6öÆRæÆör'&VEööæÇ÷'5öÖWFöG5ööæÇ×G'VR"°¦6öç6öÆRæÆör'&öGV7Föå÷'VçFÖUö&æFæu÷6÷W&6U÷&VG×G'VR"°¦6öç6öÆRæÆör''F6çE÷÷7E÷W&66U÷föGFö¶Våö6öçG&öÅ÷&VG÷6÷W&6U÷F×G'VR"°¦6öç6öÆRæÆör&6÷WÆVEö6æFFFU÷WFFVCÖfÇ6R"°¦6öç6öÆRæÆör&Ö&¶WEö7FfFöãÖfÇ6R"°¦6öç6öÆRæÆör'V&Æ5÷&W6ÆUö7FfFöãÖfÇ6R"°¦6öç6öÆRæÆör&gVæG5öÖ÷fVÖVçCÖfÇ6R"° 