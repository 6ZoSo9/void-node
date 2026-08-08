import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_INSPECTION_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_INSPECTION_ACTIVATION_CONFIRMATION_V1,
  runBuyVoidPreparedTransactionBroadcasterInspectionActivationV1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_inspection_activation_v1.js";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function mkdirPrivate(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function ipcRequest(): Record<string, string> {
  const sagaId = `voidbvfsg1_${"a".repeat(64)}`;
  const attemptId = "b".repeat(64);
  const broadcastIntentId = `voidbvbci1_${"c".repeat(64)}`;
  const custodyKey = "d".repeat(64);
  const signedHash = `0x${"1".repeat(64)}`;
  const submissionKey = sha256(
    [
      "void-buy-prepared-transaction-broadcast-custody-v1",
      sagaId,
      attemptId,
      broadcastIntentId,
      custodyKey,
      signedHash,
    ].join("\n"),
  );
  return {
    submission_idempotency_key_sha256: submissionKey,
    saga_id: sagaId,
    attempt_id: attemptId,
    broadcast_intent_id: broadcastIntentId,
    custody_idempotency_key_sha256: custodyKey,
    custody_handle_fingerprint_sha256: "e".repeat(64),
    transaction_plan_fingerprint_sha256: "f".repeat(64),
    signed_transaction_hash: signedHash,
  };
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
          request_id_sha256: sha256(`request:${method}`),
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

const base = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-broadcaster-inspection-activation-v1-"),
);
const socketDir = path.join(base, "socket");
const custodyStore = path.join(base, "custody");
const stateDir = path.join(base, "state");
mkdirPrivate(socketDir);
mkdirPrivate(custodyStore);
mkdirPrivate(path.join(custodyStore, "records"));

const policy = {
  socket_path: path.join(socketDir, "broadcaster.sock"),
  custody_store_dir: custodyStore,
  state_dir: stateDir,
  expected_signer_fingerprint_sha256: "2".repeat(64),
  rpc: {
    rpc_url: "http://127.0.0.1:8545",
    expected_chain_id: 2050,
  },
};

let chainFactoryCalls = 0;
let serviceFactoryCalls = 0;
let serviceStartCalls = 0;
let serviceStopCalls = 0;
let observedSubmissionEnabled: unknown = null;

const syntheticTransport = {
  submit_once: async () => {
    assert.fail("inspection-only activation must not call submit transport");
  },
  inspect_submission: async () => ({
    ok: false,
    status: "held",
    reason: "synthetic_inspection_only",
  }),
};

const fakeDependencies = {
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
  load_service_module: async () => ({
    createPreparedTransactionBroadcasterServiceV1: (options: any) => {
      serviceFactoryCalls += 1;
      observedSubmissionEnabled = options.submission_enabled;
      assert.equal(options.transport, syntheticTransport);
      return {
        authority: {},
        start: async () => {
          serviceStartCalls += 1;
          return {
            socket_path: options.socket_path,
            custody_store_dir: options.custody_store_dir,
            state_dir: options.state_dir,
            raw_signed_transaction_ipc_output: false as const,
            direct_cli_activation: false as const,
          };
        },
        stop: async () => {
          serviceStopCalls += 1;
        },
      };
    },
  }),
};

const dry = await runBuyVoidPreparedTransactionBroadcasterInspectionActivationV1(
  { policy },
  fakeDependencies,
);
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
assert.equal(dry.service_started, false);
assert.equal(dry.submission_enabled, false);
assert.equal(dry.submit_once_allowed, false);
assert.equal(dry.transaction_broadcast_performed, false);
assert.equal(dry.money_movement_performed, false);
assert.equal(chainFactoryCalls, 1);
assert.equal(serviceFactoryCalls, 1);
assert.equal(serviceStartCalls, 0);
assert.equal(observedSubmissionEnabled, false);

chainFactoryCalls = 0;
serviceFactoryCalls = 0;
serviceStartCalls = 0;
observedSubmissionEnabled = null;

const wrongConfirmation =
  await runBuyVoidPreparedTransactionBroadcasterInspectionActivationV1(
    {
      policy,
      apply: true,
      confirmation: "wrong",
    },
    fakeDependencies,
  );
assert.equal(wrongConfirmation.ok, false);
assert.equal(
  wrongConfirmation.reason,
  "broadcaster_inspection_activation_confirmation_required",
);
assert.equal(chainFactoryCalls, 0);
assert.equal(serviceFactoryCalls, 0);
assert.equal(serviceStartCalls, 0);

const started =
  await runBuyVoidPreparedTransactionBroadcasterInspectionActivationV1(
    {
      policy,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_INSPECTION_ACTIVATION_CONFIRMATION_V1,
    },
    fakeDependencies,
  );
assert.equal(started.ok, true);
assert.equal(started.status, "started");
assert.equal(started.service_started, true);
assert.equal(started.submission_enabled, false);
assert.equal(started.submit_once_allowed, false);
assert.equal(started.transaction_broadcast_performed, false);
assert.equal(started.money_movement_performed, false);
assert.equal(chainFactoryCalls, 1);
assert.equal(serviceFactoryCalls, 1);
assert.equal(serviceStartCalls, 1);
assert.equal(observedSubmissionEnabled, false);
if (started.ok && started.status === "started") {
  await started.service.stop();
}
assert.equal(serviceStopCalls, 1);

const serviceModule: any = await import(
  new URL(
    "../tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",
    import.meta.url,
  ).href,
);

let realServiceTransportSubmitCalls = 0;
let realServiceTransportInspectCalls = 0;
const realServiceState = path.join(base, "real-service-state");
const realServiceSocket = path.join(socketDir, "inspection-only.sock");

const inspectionOnlyService =
  serviceModule.createPreparedTransactionBroadcasterServiceV1({
    socket_path: realServiceSocket,
    custody_store_dir: custodyStore,
    state_dir: realServiceState,
    expected_signer_fingerprint_sha256: "2".repeat(64),
    submission_enabled: false,
    transport: {
      submit_once: async () => {
        realServiceTransportSubmitCalls += 1;
        assert.fail("disabled service must not reach submit transport");
      },
      inspect_submission: async () => {
        realServiceTransportInspectCalls += 1;
        return {
          ok: false,
          status: "held",
          reason: "synthetic_inspection_only",
        };
      },
    },
  });

await inspectionOnlyService.start();

const request = ipcRequest();
const blockedSubmit = await ipcCall(
  realServiceSocket,
  "submit_once",
  request,
);

assert.equal(blockedSubmit.decision.ok, false);
assert.equal(blockedSubmit.decision.status, "held");
assert.equal(
  blockedSubmit.decision.reason,
  "prepared_broadcaster_service_submission_disabled",
);
assert.equal(realServiceTransportSubmitCalls, 0);
assert.equal(realServiceTransportInspectCalls, 0);

const intentsDir = path.join(realServiceState, "intents");
assert.equal(fs.existsSync(intentsDir), true);
assert.deepEqual(fs.readdirSync(intentsDir), []);

await inspectionOnlyService.stop();

assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_INSPECTION_ACTIVATION_AUTHORITY_V1
    .transaction_broadcast_possible,
  false,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_INSPECTION_ACTIVATION_AUTHORITY_V1
    .money_movement_possible,
  false,
);

console.log(
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_INSPECTION_ACTIVATION_V1_PROOF_GREEN",
);
console.log("service_submission_gate_supported=true");
console.log("submit_rejected_before_custody_lookup=true");
console.log("submit_rejected_before_durable_intent=true");
console.log("disabled_submit_transport_calls=0");
console.log("disabled_submit_intent_files=0");
console.log("wrong_confirmation_chain_rpc_factory_calls=0");
console.log("inspection_only_service_start_synthetic=true");
console.log("real_production_service_start=false");
console.log("real_rpc_calls=0");
console.log("real_transaction_broadcast=false");
console.log("real_money_movement=false");
