import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createBuyVoidPreparedTransactionCustodianCredentialCompositionV1,
} from "../src/economic/buy_void_prepared_transaction_custodian_credential_composition_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
  runBuyVoidPreparedTransactionCustodianCredentialActivationV1,
} from "../src/economic/buy_void_prepared_transaction_custodian_credential_activation_v1.js";

const policy = {
  socket_path: "/tmp/void-buy-custodian-activation-v1/custodian.sock",
  custody_store_dir: "/tmp/void-buy-custodian-activation-v1/custody",
  credentials_directory: "/run/credentials/void-buy-custodian-activation-v1",
  expected_wallet_address: `0x${"1".repeat(40)}`,
};

let compositionCalls = 0;
let serviceStartCalls = 0;
let serviceStopCalls = 0;

const fakeDependencies = {
  create_composition: async () => {
    compositionCalls += 1;
    return {
      ok: true,
      status: "ready",
      marker:
        "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1",
      version: 1,
      service: {
        authority: {},
        start: async () => {
          serviceStartCalls += 1;
          return {
            socket_path: policy.socket_path,
            store_dir: policy.custody_store_dir,
            transaction_broadcast_interface: false as const,
          };
        },
        stop: async () => {
          serviceStopCalls += 1;
        },
      },
      service_started: false,
      signer_fingerprint_sha256: "a".repeat(64),
      signer_state_relative_path:
        "credential-signer-idempotency-v1" as const,
      credential_read_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      signer_authority: {},
      authority: {},
    } as any;
  },
};

const dry =
  await runBuyVoidPreparedTransactionCustodianCredentialActivationV1(
    { policy },
    fakeDependencies,
  );
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
assert.equal(dry.applied, false);
assert.equal(dry.service_started, false);
assert.equal(dry.private_prepare_signing_capability_started, false);
assert.equal(dry.credential_read_performed, false);
assert.equal(dry.signing_performed, false);
assert.equal(dry.transaction_broadcast_performed, false);
assert.equal(dry.money_movement_performed, false);
assert.equal(compositionCalls, 1);
assert.equal(serviceStartCalls, 0);

compositionCalls = 0;
serviceStartCalls = 0;

const wrongConfirmation =
  await runBuyVoidPreparedTransactionCustodianCredentialActivationV1(
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
  "custodian_credential_activation_confirmation_required",
);
assert.equal(compositionCalls, 0);
assert.equal(serviceStartCalls, 0);

const started =
  await runBuyVoidPreparedTransactionCustodianCredentialActivationV1(
    {
      policy,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
    },
    fakeDependencies,
  );
assert.equal(started.ok, true);
assert.equal(started.status, "started");
assert.equal(started.applied, true);
assert.equal(started.service_started, true);
assert.equal(started.private_prepare_signing_capability_started, true);
assert.equal(started.credential_read_performed, false);
assert.equal(started.signing_performed, false);
assert.equal(started.rpc_call_performed, false);
assert.equal(started.transaction_broadcast_performed, false);
assert.equal(started.money_movement_performed, false);
assert.equal(compositionCalls, 1);
assert.equal(serviceStartCalls, 1);
if (started.ok && started.status === "started") {
  await started.service.stop();
}
assert.equal(serviceStopCalls, 1);

const base = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-buy-custodian-credential-activation-v1-",
  ),
);
fs.chmodSync(base, 0o700);
const socketDir = path.join(base, "socket");
const custodyStore = path.join(base, "custody");
const credentialsDirectory = path.join(base, "credentials");
fs.mkdirSync(socketDir, { mode: 0o700 });
fs.mkdirSync(credentialsDirectory, { mode: 0o700 });

const realPolicy = {
  socket_path: path.join(socketDir, "custodian.sock"),
  custody_store_dir: custodyStore,
  credentials_directory: credentialsDirectory,
  expected_wallet_address: `0x${"2".repeat(40)}`,
};

let credentialFactoryCalls = 0;
const createComposition = async (compositionPolicy: any) =>
  await createBuyVoidPreparedTransactionCustodianCredentialCompositionV1(
    compositionPolicy,
    {
      credential_signer: {
        create_credential_signer: () => {
          credentialFactoryCalls += 1;
          throw new Error(
            "activation proof must never read or construct the real credential signer",
          );
        },
      },
    },
  );

const realDry =
  await runBuyVoidPreparedTransactionCustodianCredentialActivationV1(
    { policy: realPolicy },
    { create_composition: createComposition as any },
  );
assert.equal(realDry.ok, true);
assert.equal(realDry.status, "dry_run");
assert.equal(realDry.service_started, false);
assert.equal(realDry.private_prepare_signing_capability_started, false);
assert.equal(credentialFactoryCalls, 0);
assert.equal(fs.existsSync(realPolicy.socket_path), false);
assert.equal(
  fs.existsSync(
    path.join(custodyStore, "credential-signer-idempotency-v1"),
  ),
  false,
);

const realStarted =
  await runBuyVoidPreparedTransactionCustodianCredentialActivationV1(
    {
      policy: realPolicy,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
    },
    { create_composition: createComposition as any },
  );
assert.equal(realStarted.ok, true);
assert.equal(realStarted.status, "started");
assert.equal(realStarted.service_started, true);
assert.equal(
  realStarted.private_prepare_signing_capability_started,
  true,
);
assert.equal(realStarted.credential_read_performed, false);
assert.equal(realStarted.signing_performed, false);
assert.equal(realStarted.rpc_call_performed, false);
assert.equal(realStarted.transaction_broadcast_performed, false);
assert.equal(realStarted.money_movement_performed, false);
assert.equal(credentialFactoryCalls, 0);

const socketStat = fs.lstatSync(realPolicy.socket_path);
assert.equal(socketStat.isSocket(), true);
assert.equal(socketStat.mode & 0o077, 0);
assert.equal(
  fs.existsSync(
    path.join(custodyStore, "credential-signer-idempotency-v1"),
  ),
  false,
);

if (realStarted.ok && realStarted.status === "started") {
  await realStarted.service.stop();
}
assert.equal(credentialFactoryCalls, 0);

assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1
    .credential_read_at_activation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1
    .signing_at_activation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1
    .private_prepare_signing_capability_after_start,
  true,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1
    .credential_read_possible_only_on_later_prepare_once,
  true,
);
assert.equal(
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1
    .transaction_broadcast_interface,
  false,
);

console.log(
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_V1_PROOF_GREEN",
);
console.log("exact_activation_confirmation_required=true");
console.log("wrong_confirmation_composition_calls=0");
console.log("wrong_confirmation_service_start_calls=0");
console.log("dry_run_service_start=false");
console.log("real_source_custodian_service_started_synthetic=true");
console.log("private_prepare_signing_capability_after_start=true");
console.log("credential_factory_calls_during_activation=0");
console.log("credential_read_during_activation=false");
console.log("signing_during_activation=false");
console.log("rpc_calls_during_activation=0");
console.log("transaction_broadcast_during_activation=false");
console.log("money_movement_during_activation=false");
console.log("production_credential_access=false");
console.log("production_service_start=false");
console.log("runtime_route_mount=false");
console.log("deployment=false");
