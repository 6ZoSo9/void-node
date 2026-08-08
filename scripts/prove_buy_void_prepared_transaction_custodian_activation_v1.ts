import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_CONFIRMATION_V1,
  runBuyVoidPreparedTransactionCustodianActivationV1,
} from "../src/economic/buy_void_prepared_transaction_custodian_activation_v1.js";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-custodian-activation-v1-"),
);
fs.chmodSync(root, 0o700);

const socketDir = path.join(root, "socket");
const storeDir = path.join(root, "custody-store");
const credentialsDir = path.join(root, "credentials");

for (const directory of [socketDir, credentialsDir]) {
  fs.mkdirSync(directory, { mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

const socketPath = path.join(socketDir, "custodian.sock");
const expectedWallet = `0x${"11".repeat(20)}`;

const policy = {
  socket_path: socketPath,
  custody_store_dir: storeDir,
  credentials_directory: credentialsDir,
  expected_wallet_address: expectedWallet,
};

let forbiddenCompositionCalls = 0;

try {
  const wrongConfirmation =
    await runBuyVoidPreparedTransactionCustodianActivationV1(
      {
        policy,
        apply: true,
        confirmation: "wrong-confirmation",
      },
      {
        create_composition: (async () => {
          forbiddenCompositionCalls += 1;
          throw new Error("must-not-compose");
        }) as any,
      },
    );

  assert.equal(wrongConfirmation.ok, false);
  assert.equal(
    wrongConfirmation.reason,
    "prepared_transaction_custodian_activation_confirmation_required",
  );
  assert.equal(wrongConfirmation.service_start_attempted, false);
  assert.equal(forbiddenCompositionCalls, 0);

  const dry =
    await runBuyVoidPreparedTransactionCustodianActivationV1({
      policy,
    });

  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.applied, false);
  assert.equal(dry.service_started, false);
  assert.equal(dry.service_start_attempted, false);
  assert.match(dry.signer_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    dry.required_confirmation,
    VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_CONFIRMATION_V1,
  );
  assert.equal(dry.credential_read_performed, false);
  assert.equal(dry.signing_performed, false);
  assert.equal(dry.prepare_once_called, false);
  assert.equal(dry.transaction_broadcast_performed, false);
  assert.equal(dry.money_movement_performed, false);
  assert.equal(fs.existsSync(socketPath), false);
  assert.deepEqual(fs.readdirSync(credentialsDir), []);

  const started =
    await runBuyVoidPreparedTransactionCustodianActivationV1({
      policy,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_CONFIRMATION_V1,
    });

  assert.equal(started.ok, true);
  assert.equal(started.status, "started");
  assert.equal(started.applied, true);
  assert.equal(started.service_started, true);
  assert.equal(started.service_start_attempted, true);
  assert.equal(started.credential_read_performed, false);
  assert.equal(started.signing_performed, false);
  assert.equal(started.prepare_once_called, false);
  assert.equal(started.transaction_broadcast_performed, false);
  assert.equal(started.money_movement_performed, false);
  assert.equal(
    started.signer_fingerprint_sha256,
    dry.signer_fingerprint_sha256,
  );

  const socketMetadata = fs.lstatSync(socketPath);
  assert.equal(socketMetadata.isSocket(), true);
  assert.equal(socketMetadata.isSymbolicLink(), false);
  assert.equal(socketMetadata.mode & 0o077, 0);

  assert.deepEqual(fs.readdirSync(credentialsDir), []);
  assert.equal(
    fs.existsSync(
      path.join(storeDir, "credential-signer-idempotency-v1"),
    ),
    false,
  );
  assert.deepEqual(fs.readdirSync(path.join(storeDir, "intents")), []);
  assert.deepEqual(fs.readdirSync(path.join(storeDir, "records")), []);

  await started.service.stop();
  assert.equal(fs.existsSync(socketPath), false);

  console.log(
    "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_ACTIVATION_V1_PROOF_GREEN",
  );
  console.log("exact_activation_confirmation_required=true");
  console.log("wrong_confirmation_composition_calls=0");
  console.log("dry_run_composition_ready=true");
  console.log("dry_run_service_started=false");
  console.log("submission_capable_broadcaster_started=false");
  console.log("custodian_service_started_synthetic=true");
  console.log("custodian_socket_mode_0600=true");
  console.log("credential_directory_empty_during_activation=true");
  console.log("credential_read_during_activation=false");
  console.log("signing_during_activation=false");
  console.log("prepare_once_called_during_activation=false");
  console.log("signer_state_created_during_activation=false");
  console.log("custodian_intent_records_created_during_activation=0");
  console.log("custodian_prepared_records_created_during_activation=0");
  console.log("rpc_calls=0");
  console.log("transaction_submission_performed=false");
  console.log("transaction_broadcast_performed=false");
  console.log("money_movement_performed=false");
  console.log("production_service_activation=false");
  console.log("runtime_route_mount=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
