import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  createPreparedTransactionCustodianServiceV1,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1,
} from "../tools/buy-void-prepared-transaction-custodian-service-v1.mjs";

const REQUEST_SCHEMA =
  "void_buy_void_prepared_transaction_custodian_ipc_request_v1";
const IDEMPOTENCY_DOMAIN = "void-buy-prepared-transaction-custody-v1";
const ROOT = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-custodian-read-confinement-v1-"),
);
const SOCKET_PATH = path.join(ROOT, "custodian.sock");
const STORE_DIR = path.join(ROOT, "store");
const TEST_PRIVATE_KEY = `0x${"31".repeat(32)}`;
const WALLET = new Wallet(TEST_PRIVATE_KEY);
const WALLET_ADDRESS = WALLET.address.toLowerCase();
const DELIVERY_ADDRESS = "0x2222222222222222222222222222222222222222";
const SIGNER_FINGERPRINT = sha256("fixture-custodian-read-confinement-v1");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildPrepareRequest() {
  const sagaId = `voidbvfsg1_${sha256("saga")}`;
  const attemptId = sha256("attempt");
  const reservationId = sha256("reservation");
  const planFingerprint = sha256("plan");
  const idempotencyKey = sha256(
    [
      IDEMPOTENCY_DOMAIN,
      sagaId,
      attemptId,
      reservationId,
      planFingerprint,
    ].join("\n"),
  );
  return {
    idempotency_key_sha256: idempotencyKey,
    saga_id: sagaId,
    attempt_id: attemptId,
    plan_reservation_id: reservationId,
    transaction_plan_fingerprint_sha256: planFingerprint,
    chain_id: "2050",
    wallet_address: WALLET_ADDRESS,
    nonce: 7,
    delivery_address: DELIVERY_ADDRESS,
    native_value_wei: "1000000000000000",
    gas_limit: "21000",
    max_fee_per_gas_wei: "3000000000",
    max_priority_fee_per_gas_wei: "1000000000",
  };
}

async function callService(method, request, requestSeed) {
  const requestId = sha256(requestSeed);
  const envelope = {
    schema: REQUEST_SCHEMA,
    marker: VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1,
    version: 1,
    request_id_sha256: requestId,
    method,
    request,
  };
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(SOCKET_PATH);
    socket.setEncoding("utf8");
    socket.setTimeout(5000);
    let input = "";
    socket.once("connect", () => {
      socket.write(`${JSON.stringify(envelope)}\n`);
    });
    socket.on("data", (chunk) => {
      input += chunk;
      const newline = input.indexOf("\n");
      if (newline < 0) return;
      try {
        resolve(JSON.parse(input.slice(0, newline)));
      } catch (error) {
        reject(error);
      } finally {
        socket.destroy();
      }
    });
    socket.once("timeout", () => {
      socket.destroy(new Error("custodian proof socket timeout"));
    });
    socket.once("error", reject);
  });
}

const prepareRequest = buildPrepareRequest();
let signerCalls = 0;
const signer = {
  async prepare_once(request) {
    signerCalls += 1;
    assert.deepEqual(request, prepareRequest);
    const raw = await WALLET.signTransaction({
      type: 2,
      chainId: 2050,
      nonce: request.nonce,
      to: request.delivery_address,
      value: BigInt(request.native_value_wei),
      gasLimit: BigInt(request.gas_limit),
      maxFeePerGas: BigInt(request.max_fee_per_gas_wei),
      maxPriorityFeePerGas: BigInt(request.max_priority_fee_per_gas_wei),
      data: "0x",
      accessList: [],
    });
    return {
      status: "prepared",
      raw_signed_transaction: raw,
      wallet_address: WALLET_ADDRESS,
      signer_fingerprint_sha256: SIGNER_FINGERPRINT,
      transaction_plan_fingerprint_sha256:
        request.transaction_plan_fingerprint_sha256,
    };
  },
};

const service = createPreparedTransactionCustodianServiceV1({
  socket_path: SOCKET_PATH,
  store_dir: STORE_DIR,
  signer,
  expected_signer_fingerprint_sha256: SIGNER_FINGERPRINT,
});

try {
  await service.start();

  const preparedEnvelope = await callService(
    "prepare_once",
    prepareRequest,
    "prepare-request",
  );
  assert.equal(preparedEnvelope.request_id_sha256, sha256("prepare-request"));
  assert.equal(preparedEnvelope.decision.ok, true);
  assert.equal(preparedEnvelope.decision.status, "prepared");
  assert.equal(signerCalls, 1);

  const recordsPath = path.join(STORE_DIR, "records");
  const outsideRecordsPath = path.join(ROOT, "outside-records");
  fs.renameSync(recordsPath, outsideRecordsPath);
  fs.symlinkSync(outsideRecordsPath, recordsPath, "dir");
  assert.equal(fs.lstatSync(recordsPath).isSymbolicLink(), true);

  const inspectEnvelope = await callService(
    "inspect_prepared",
    {
      idempotency_key_sha256: prepareRequest.idempotency_key_sha256,
      attempt_id: prepareRequest.attempt_id,
      custody_handle: preparedEnvelope.decision.custody_handle,
    },
    "inspect-request",
  );

  assert.equal(inspectEnvelope.request_id_sha256, sha256("inspect-request"));
  assert.equal(inspectEnvelope.decision.ok, false);
  assert.equal(inspectEnvelope.decision.status, "held");
  assert.equal(
    inspectEnvelope.decision.reason,
    "prepared_custodian_service_failed",
  );
  assert.equal(signerCalls, 1);

  console.log("post_start_record_directory_symlink_read_accepted=false");
  console.log("signer_reinvoked_during_rejected_inspection=false");
  console.log("production_signer_use=false");
  console.log("money_movement=false");
  console.log(
    "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_STORE_READ_CONFINEMENT_V1_PROOF_GREEN",
  );
} finally {
  try {
    await service.stop();
  } finally {
    fs.rmSync(ROOT, { recursive: true, force: true });
  }
}
