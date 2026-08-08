import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { Wallet, keccak256 } from "ethers";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
  runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function mkdirPrivate(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function writePrivateJson(file: string, value: unknown): void {
  mkdirPrivate(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

async function ipcCall(
  socketPath: string,
  method: "submit_once" | "inspect_submission",
  request: Record<string, string>,
): Promise<any> {
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let input = "";
    socket.setEncoding("utf8");
    socket.on("connect", () => {
      socket.write(
        `${JSON.stringify({
          schema:
            "void_buy_void_prepared_transaction_broadcaster_ipc_request_v1",
          marker:
            "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1",
          version: 1,
          request_id_sha256: sha256(`submission-activation:${method}`),
          method,
          request,
        })}\n`,
      );
    });
    socket.on("data", (chunk) => {
      input += chunk;
    });
    socket.on("end", () => {
      try {
        resolve(JSON.parse(input.trim()));
      } catch (error) {
        reject(error);
      }
    });
    socket.on("error", reject);
  });
}

async function buildCustodyFixture(
  custodyStore: string,
  signerFingerprint: string,
): Promise<{
  request: Record<string, string>;
  rawSignedTransaction: string;
}> {
  const wallet = new Wallet(`0x${"1".repeat(64)}`);
  const sagaId = `voidbvfsg1_${sha256("submission-activation:saga")}`;
  const attemptId = sha256("submission-activation:attempt");
  const broadcastIntentId =
    `voidbvbci1_${sha256("submission-activation:broadcast-intent")}`;
  const custodyKey = sha256("submission-activation:custody");
  const planFingerprint = sha256("submission-activation:plan");
  const custodyHandle = `custody:void-buy:submission-activation/${custodyKey}`;
  const deliveryAddress = `0x${"2".repeat(40)}`;
  const nativeValueWei = "1000000000000000";

  const rawSignedTransaction = await wallet.signTransaction({
    type: 2,
    chainId: 2050,
    nonce: 23,
    to: deliveryAddress,
    value: BigInt(nativeValueWei),
    gasLimit: 21000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 2n,
    data: "0x",
    accessList: [],
  });
  const signedHash = keccak256(rawSignedTransaction).toLowerCase();

  const request = {
    submission_idempotency_key_sha256: sha256(
      [
        "void-buy-prepared-transaction-broadcast-custody-v1",
        sagaId,
        attemptId,
        broadcastIntentId,
        custodyKey,
        signedHash,
      ].join("\n"),
    ),
    saga_id: sagaId,
    attempt_id: attemptId,
    broadcast_intent_id: broadcastIntentId,
    custody_idempotency_key_sha256: custodyKey,
    custody_handle_fingerprint_sha256: sha256(custodyHandle),
    transaction_plan_fingerprint_sha256: planFingerprint,
    signed_transaction_hash: signedHash,
  };

  writePrivateJson(
    path.join(custodyStore, "records", `${custodyKey}.json`),
    {
      schema:
        "void_buy_void_prepared_transaction_custodian_service_record_v1",
      marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1",
      version: 1,
      recorded_at_ms: Date.parse("2026-08-08T02:00:00.000Z"),
      idempotency_key_sha256: custodyKey,
      saga_id: sagaId,
      attempt_id: attemptId,
      plan_reservation_id: sha256("submission-activation:reservation"),
      transaction_plan_fingerprint_sha256: planFingerprint,
      chain_id: "2050",
      wallet_address: wallet.address.toLowerCase(),
      nonce: 23,
      delivery_address: deliveryAddress,
      native_value_wei: nativeValueWei,
      gas_limit: "21000",
      max_fee_per_gas_wei: "100",
      max_priority_fee_per_gas_wei: "2",
      custody_handle: custodyHandle,
      signed_transaction_hash: signedHash,
      signer_fingerprint_sha256: signerFingerprint,
      raw_signed_transaction: rawSignedTransaction,
      raw_signed_transaction_sha256: sha256(
        rawSignedTransaction.toLowerCase(),
      ),
      transaction_broadcast_authorized: false,
      money_movement_authorized: false,
    },
  );

  return { request, rawSignedTransaction };
}

const base = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-broadcaster-submission-activation-v1-"),
);
const socketDir = path.join(base, "socket");
const custodyStore = path.join(base, "custody");
const stateDir = path.join(base, "state");
const socketPath = path.join(socketDir, "broadcaster.sock");
const signerFingerprint = "2".repeat(64);

mkdirPrivate(socketDir);
mkdirPrivate(custodyStore);
mkdirPrivate(path.join(custodyStore, "records"));

const policy = {
  socket_path: socketPath,
  custody_store_dir: custodyStore,
  state_dir: stateDir,
  expected_signer_fingerprint_sha256: signerFingerprint,
  rpc: {
    rpc_url: "http://127.0.0.1:8545",
    expected_chain_id: 2050,
  },
};

const fixture = await buildCustodyFixture(
  custodyStore,
  signerFingerprint,
);

let chainFactoryCalls = 0;
let syntheticSubmitCalls = 0;
let syntheticInspectCalls = 0;
let durableIntentVisibleBeforeSubmit = false;
let rawSignedTransactionReachedPrivateTransport = false;

function acceptedDecision(request: Record<string, unknown>) {
  return {
    ok: true,
    status: "accepted",
    transaction_hash: String(request.signed_transaction_hash).toLowerCase(),
    provider_submission_id: "synthetic-provider-submission-v1",
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt: null,
  };
}

const syntheticTransport = {
  submit_once: async (request: Record<string, unknown>) => {
    syntheticSubmitCalls += 1;
    const intentFile = path.join(
      stateDir,
      "intents",
      `${String(request.submission_idempotency_key_sha256)}.json`,
    );
    durableIntentVisibleBeforeSubmit = fs.existsSync(intentFile);
    rawSignedTransactionReachedPrivateTransport =
      typeof request.raw_signed_transaction === "string" &&
      request.raw_signed_transaction === fixture.rawSignedTransaction;
    assert.equal(
      keccak256(String(request.raw_signed_transaction)).toLowerCase(),
      fixture.request.signed_transaction_hash,
    );
    return acceptedDecision(request);
  },
  inspect_submission: async (request: Record<string, unknown>) => {
    syntheticInspectCalls += 1;
    assert.equal("raw_signed_transaction" in request, false);
    return acceptedDecision(request);
  },
};

const serviceModule: any = await import(
  new URL(
    "../tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",
    import.meta.url,
  ).href,
);

const dependencies = {
  create_chain_transport: async () => {
    chainFactoryCalls += 1;
    return {
      ok: true,
      status: "ready",
      marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1",
      version: 1,
      chain_id: "2050",
      rpc_url_fingerprint_sha256: sha256("http://127.0.0.1:8545"),
      transport: syntheticTransport,
      authority: {},
    } as any;
  },
  load_service_module: async () => serviceModule,
};

const dry =
  await runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1(
    { policy },
    dependencies,
  );
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
assert.equal(dry.service_started, false);
assert.equal(dry.submission_enabled, true);
assert.equal(dry.submit_once_allowed, false);
assert.equal(dry.transaction_broadcast_performed, false);
assert.equal(dry.money_movement_performed, false);
assert.equal(chainFactoryCalls, 1);
assert.equal(syntheticSubmitCalls, 0);
assert.equal(syntheticInspectCalls, 0);

chainFactoryCalls = 0;
const wrongConfirmation =
  await runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1(
    {
      policy,
      apply: true,
      confirmation: "wrong",
    },
    dependencies,
  );
assert.equal(wrongConfirmation.ok, false);
assert.equal(
  wrongConfirmation.reason,
  "broadcaster_submission_activation_confirmation_required",
);
assert.equal(chainFactoryCalls, 0);
assert.equal(syntheticSubmitCalls, 0);

const started =
  await runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1(
    {
      policy,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
    },
    dependencies,
  );
assert.equal(started.ok, true);
assert.equal(started.status, "started");
assert.equal(started.service_started, true);
assert.equal(started.submission_enabled, true);
assert.equal(started.submit_once_allowed, true);
assert.equal(started.transaction_broadcast_performed, false);
assert.equal(started.money_movement_performed, false);
assert.equal(chainFactoryCalls, 1);
assert.equal(syntheticSubmitCalls, 0);
assert.equal(syntheticInspectCalls, 0);

assert.ok(started.ok && started.status === "started");

const submitted = await ipcCall(
  socketPath,
  "submit_once",
  fixture.request,
);
assert.equal(submitted.decision.ok, true);
assert.equal(submitted.decision.status, "accepted");
assert.equal(
  submitted.decision.transaction_hash,
  fixture.request.signed_transaction_hash,
);
assert.equal(submitted.decision.submission_call_performed, true);
assert.equal(submitted.decision.submission_may_have_occurred, true);
assert.equal(syntheticSubmitCalls, 1);
assert.equal(syntheticInspectCalls, 0);
assert.equal(durableIntentVisibleBeforeSubmit, true);
assert.equal(rawSignedTransactionReachedPrivateTransport, true);
assert.equal(
  JSON.stringify(submitted).includes(fixture.rawSignedTransaction),
  false,
);

const duplicateSubmit = await ipcCall(
  socketPath,
  "submit_once",
  fixture.request,
);
assert.equal(duplicateSubmit.decision.ok, false);
assert.equal(duplicateSubmit.decision.status, "held");
assert.equal(
  duplicateSubmit.decision.reason,
  "prepared_broadcaster_submit_reentry_requires_inspection",
);
assert.equal(syntheticSubmitCalls, 1);
assert.equal(syntheticInspectCalls, 0);

const inspected = await ipcCall(
  socketPath,
  "inspect_submission",
  fixture.request,
);
assert.equal(inspected.decision.ok, true);
assert.equal(inspected.decision.status, "accepted");
assert.equal(syntheticSubmitCalls, 1);
assert.equal(syntheticInspectCalls, 1);
assert.equal(
  JSON.stringify(inspected).includes(fixture.rawSignedTransaction),
  false,
);

const intentFile = path.join(
  stateDir,
  "intents",
  `${fixture.request.submission_idempotency_key_sha256}.json`,
);
const outcomeFile = path.join(
  stateDir,
  "outcomes",
  `${fixture.request.submission_idempotency_key_sha256}.json`,
);
assert.equal(fs.existsSync(intentFile), true);
assert.equal(fs.existsSync(outcomeFile), true);
assert.equal(fs.statSync(intentFile).mode & 0o077, 0);
assert.equal(fs.statSync(outcomeFile).mode & 0o077, 0);

await started.service.stop();

assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1
    .service_submission_enabled,
  true,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1
    .transaction_broadcast_during_activation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1
    .transaction_broadcast_possible_when_submit_once_invoked,
  true,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1
    .production_activation_performed_by_source_merge,
  false,
);

console.log(
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_V1_PROOF_GREEN",
);
console.log("exact_activation_confirmation_required=true");
console.log("wrong_confirmation_chain_factory_calls=0");
console.log("dry_run_service_started=false");
console.log("submission_enabled_service_started_synthetic=true");
console.log("activation_itself_submit_calls=0");
console.log("durable_submission_intent_before_transport=true");
console.log("synthetic_submit_transport_calls=1");
console.log("duplicate_submit_transport_calls=0");
console.log("duplicate_submit_requires_inspection=true");
console.log("synthetic_inspection_transport_calls=1");
console.log("raw_signed_transaction_private_transport_only=true");
console.log("raw_signed_transaction_ipc_output=false");
console.log("production_credential_access=false");
console.log("production_signing=false");
console.log("real_rpc_calls=0");
console.log("real_transaction_broadcast=false");
console.log("real_money_movement=false");
console.log("production_service_activation=false");
console.log("runtime_route_mount=false");
