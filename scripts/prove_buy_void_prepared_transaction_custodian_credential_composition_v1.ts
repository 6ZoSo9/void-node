import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import {
  createBuyVoidPreparedTransactionCustodianIpcV1,
} from "../src/economic/buy_void_prepared_transaction_custodian_ipc_v1.js";
import type {
  BuyVoidPreparedTransactionCustodianPrepareRequestV1,
} from "../src/economic/buy_void_prepared_transaction_custody_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1,
  createBuyVoidPreparedTransactionCredentialSignerV1,
} from "../src/economic/buy_void_prepared_transaction_credential_signer_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1,
  createBuyVoidPreparedTransactionCustodianCredentialCompositionV1,
} from "../src/economic/buy_void_prepared_transaction_custodian_credential_composition_v1.js";

const MARKER =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_V1_PROOF_GREEN";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function mkdirPrivate(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function writeCredential(
  directory: string,
  privateKey: string,
): void {
  mkdirPrivate(directory);
  const file = path.join(
    directory,
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  );
  fs.writeFileSync(file, `${privateKey}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

async function expectReject(
  action: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let error: unknown = null;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof Error);
  assert.match(String((error as Error).message), pattern);
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-buy-custodian-credential-composition-proof-",
    ),
  );

  const socketDir = path.join(root, "socket");
  const socketPath = path.join(socketDir, "custodian.sock");
  const custodyStore = path.join(root, "custody-store");
  const credentialsDirectory = path.join(root, "credentials");
  mkdirPrivate(socketDir);
  mkdirPrivate(custodyStore);
  mkdirPrivate(credentialsDirectory);

  const privateKey = `0x${"1".repeat(64)}`;
  const wallet = new Wallet(privateKey);
  const expectedWallet = wallet.address.toLowerCase();
  writeCredential(credentialsDirectory, privateKey);

  let credentialFactoryCalls = 0;
  let credentialSignCalls = 0;
  const observedSignedPayloads: string[] = [];

  const countedCredentialFactory: typeof createBuyVoidNativeFulfillmentWalletCredentialSignerV1 =
    ((input: any) => {
      credentialFactoryCalls += 1;
      const decision =
        createBuyVoidNativeFulfillmentWalletCredentialSignerV1(input);
      if ("reason" in decision) return decision;
      const signer = decision.signer;
      return {
        ...decision,
        signer: {
          get_address: signer.get_address,
          async sign_transaction(transaction: any): Promise<string> {
            credentialSignCalls += 1;
            const raw = await signer.sign_transaction(transaction);
            observedSignedPayloads.push(raw);
            return raw;
          },
        },
      };
    }) as typeof createBuyVoidNativeFulfillmentWalletCredentialSignerV1;

  const composition =
    await createBuyVoidPreparedTransactionCustodianCredentialCompositionV1(
      {
        socket_path: socketPath,
        custody_store_dir: custodyStore,
        credentials_directory: credentialsDirectory,
        expected_wallet_address: expectedWallet,
      },
      {
        credential_signer: {
          create_credential_signer: countedCredentialFactory,
        },
      },
    );

  assert.equal(composition.ok, true);
  if (!composition.ok) {
    throw new Error("custodian_credential_composition_should_be_ready");
  }
  assert.equal(composition.service_started, false);
  assert.equal(composition.credential_read_performed, false);
  assert.equal(composition.signing_performed, false);
  assert.equal(composition.transaction_broadcast_performed, false);
  assert.equal(composition.money_movement_performed, false);
  assert.equal(credentialFactoryCalls, 0);
  assert.equal(credentialSignCalls, 0);

  const started = await composition.service.start();
  assert.equal(started.transaction_broadcast_interface, false);
  assert.equal(
    (composition.service.authority as any).raw_signed_transaction_ipc_output,
    false,
  );
  assert.equal(
    (composition.service.authority as any).cli_activation,
    false,
  );
  assert.equal(credentialFactoryCalls, 0);
  assert.equal(credentialSignCalls, 0);

  const sagaId = `voidbvfsg1_${"a".repeat(64)}`;
  const attemptId = "b".repeat(64);
  const planReservationId = "c".repeat(64);
  const planFingerprint = "d".repeat(64);
  const idempotencyKey = sha256(
    [
      "void-buy-prepared-transaction-custody-v1",
      sagaId,
      attemptId,
      planReservationId,
      planFingerprint,
    ].join("\n"),
  );

  const request: BuyVoidPreparedTransactionCustodianPrepareRequestV1 = {
    idempotency_key_sha256: idempotencyKey,
    saga_id: sagaId,
    attempt_id: attemptId,
    plan_reservation_id: planReservationId,
    transaction_plan_fingerprint_sha256: planFingerprint,
    chain_id: "2050",
    wallet_address: expectedWallet,
    nonce: 7,
    delivery_address: `0x${"2".repeat(40)}`,
    native_value_wei: (
      2_500_000n * 1_000_000_000_000n
    ).toString(),
    gas_limit: "21000",
    max_fee_per_gas_wei: "100",
    max_priority_fee_per_gas_wei: "2",
  };

  const custodian =
    createBuyVoidPreparedTransactionCustodianIpcV1({
      socket_path: socketPath,
      expected_signer_fingerprint_sha256:
        composition.signer_fingerprint_sha256,
    });

  const prepared = await custodian.prepare_once(request);
  assert.equal(prepared.ok, true);
  if (!prepared.ok) throw new Error("prepared_result_expected");
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.wallet_address, expectedWallet);
  assert.equal(
    prepared.signer_fingerprint_sha256,
    composition.signer_fingerprint_sha256,
  );
  assert.equal(
    prepared.transaction_plan_fingerprint_sha256,
    planFingerprint,
  );
  assert.equal(credentialFactoryCalls, 1);
  assert.equal(credentialSignCalls, 1);
  assert.equal(observedSignedPayloads.length, 1);
  assert.equal(
    JSON.stringify(prepared).includes("raw_signed_transaction"),
    false,
  );
  assert.equal(
    JSON.stringify(prepared).includes(observedSignedPayloads[0]),
    false,
  );

  const duplicate = await custodian.prepare_once(request);
  assert.equal(duplicate.ok, true);
  if (!duplicate.ok) throw new Error("duplicate_result_expected");
  assert.equal(duplicate.status, "duplicate");
  assert.equal(
    duplicate.signed_transaction_hash,
    prepared.signed_transaction_hash,
  );
  assert.equal(credentialFactoryCalls, 1);
  assert.equal(credentialSignCalls, 1);

  const inspected = await custodian.inspect_prepared({
    idempotency_key_sha256: idempotencyKey,
    attempt_id: attemptId,
    custody_handle: prepared.custody_handle,
  });
  assert.equal(inspected.ok, true);
  if (!inspected.ok) throw new Error("inspection_expected");
  assert.equal(
    inspected.signed_transaction_hash,
    prepared.signed_transaction_hash,
  );
  assert.equal(credentialFactoryCalls, 1);
  assert.equal(credentialSignCalls, 1);

  const signerState = path.join(
    custodyStore,
    "credential-signer-idempotency-v1",
  );
  const signerRecord = path.join(
    signerState,
    "records",
    `${idempotencyKey}.json`,
  );
  const recordStat = fs.lstatSync(signerRecord);
  assert.equal(recordStat.isFile(), true);
  assert.equal(recordStat.isSymbolicLink(), false);
  assert.equal(recordStat.mode & 0o077, 0);
  const storedSignerRecord = JSON.parse(
    fs.readFileSync(signerRecord, "utf8"),
  );
  assert.equal(
    storedSignerRecord.raw_signed_transaction,
    observedSignedPayloads[0],
  );
  assert.equal(
    path.resolve(signerRecord).startsWith(
      `${path.resolve(custodyStore)}${path.sep}`,
    ),
    true,
  );

  await composition.service.stop();
  assert.equal(fs.existsSync(socketPath), false);

  // Fresh signer instance: exact cached bytes, no credential access.
  const credentialFile = path.join(
    credentialsDirectory,
    VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  );
  fs.unlinkSync(credentialFile);
  let forbiddenCredentialFactoryCalls = 0;
  const restartSigner =
    createBuyVoidPreparedTransactionCredentialSignerV1(
      {
        credentials_directory: credentialsDirectory,
        expected_wallet_address: expectedWallet,
        idempotency_state_dir: signerState,
      },
      {
        create_credential_signer: ((_: any) => {
          forbiddenCredentialFactoryCalls += 1;
          throw new Error("credential_factory_must_not_run_on_duplicate");
        }) as any,
      },
    );
  const recovered = await restartSigner.prepare_once(request);
  assert.equal(recovered.status, "duplicate");
  assert.equal(
    recovered.raw_signed_transaction,
    observedSignedPayloads[0],
  );
  assert.equal(forbiddenCredentialFactoryCalls, 0);

  // Inject the after-sign/before-cache crash. The fixed ethers Wallet signer
  // must reproduce byte-identical output for the exact same transaction.
  const crashCredentials = path.join(root, "crash-credentials");
  const crashStore = path.join(root, "crash-custody-store");
  const crashState = path.join(
    crashStore,
    "credential-signer-idempotency-v1",
  );
  mkdirPrivate(crashStore);
  writeCredential(crashCredentials, privateKey);

  let crashSignCalls = 0;
  const crashSigned: string[] = [];
  const crashFactory: typeof createBuyVoidNativeFulfillmentWalletCredentialSignerV1 =
    ((input: any) => {
      const decision =
        createBuyVoidNativeFulfillmentWalletCredentialSignerV1(input);
      if ("reason" in decision) return decision;
      const signer = decision.signer;
      return {
        ...decision,
        signer: {
          get_address: signer.get_address,
          async sign_transaction(transaction: any): Promise<string> {
            crashSignCalls += 1;
            const raw = await signer.sign_transaction(transaction);
            crashSigned.push(raw);
            return raw;
          },
        },
      };
    }) as typeof createBuyVoidNativeFulfillmentWalletCredentialSignerV1;

  let faultOnce = true;
  const crashSigner =
    createBuyVoidPreparedTransactionCredentialSignerV1(
      {
        credentials_directory: crashCredentials,
        expected_wallet_address: expectedWallet,
        idempotency_state_dir: crashState,
      },
      {
        create_credential_signer: crashFactory,
        fault_inject(stage) {
          if (
            faultOnce &&
            stage === "after_credential_sign_before_cache_record"
          ) {
            faultOnce = false;
            throw new Error("synthetic_after_sign_crash");
          }
        },
      },
    );

  await expectReject(
    () => crashSigner.prepare_once(request),
    /synthetic_after_sign_crash/,
  );
  assert.equal(crashSignCalls, 1);

  const recoveredCrashSigner =
    createBuyVoidPreparedTransactionCredentialSignerV1(
      {
        credentials_directory: crashCredentials,
        expected_wallet_address: expectedWallet,
        idempotency_state_dir: crashState,
      },
      {
        create_credential_signer: crashFactory,
      },
    );
  const recoveredAfterCrash =
    await recoveredCrashSigner.prepare_once(request);
  assert.equal(recoveredAfterCrash.status, "prepared");
  assert.equal(crashSignCalls, 2);
  assert.equal(crashSigned.length, 2);
  assert.equal(crashSigned[0], crashSigned[1]);

  fs.unlinkSync(
    path.join(
      crashCredentials,
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    ),
  );
  let postCrashCredentialCalls = 0;
  const cachedAfterCrashSigner =
    createBuyVoidPreparedTransactionCredentialSignerV1(
      {
        credentials_directory: crashCredentials,
        expected_wallet_address: expectedWallet,
        idempotency_state_dir: crashState,
      },
      {
        create_credential_signer: ((_: any) => {
          postCrashCredentialCalls += 1;
          throw new Error("credential_must_not_run_after_cache");
        }) as any,
      },
    );
  const cachedAfterCrash =
    await cachedAfterCrashSigner.prepare_once(request);
  assert.equal(cachedAfterCrash.status, "duplicate");
  assert.equal(
    cachedAfterCrash.raw_signed_transaction,
    crashSigned[0],
  );
  assert.equal(postCrashCredentialCalls, 0);

  const invalidRequest = {
    ...request,
    idempotency_key_sha256: "e".repeat(64),
  };
  let invalidCredentialCalls = 0;
  const invalidSigner =
    createBuyVoidPreparedTransactionCredentialSignerV1(
      {
        credentials_directory: crashCredentials,
        expected_wallet_address: expectedWallet,
        idempotency_state_dir: path.join(root, "invalid-state"),
      },
      {
        create_credential_signer: ((_: any) => {
          invalidCredentialCalls += 1;
          throw new Error("invalid_request_must_not_read_credential");
        }) as any,
      },
    );
  await expectReject(
    () => invalidSigner.prepare_once(invalidRequest),
    /idempotency_key_mismatch/,
  );
  assert.equal(invalidCredentialCalls, 0);

  assert.equal(
    VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PREPARED_TRANSACTION_CREDENTIAL_SIGNER_AUTHORITY_V1
      .money_movement,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1
      .service_start,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_COMPOSITION_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );

  fs.rmSync(root, { recursive: true, force: true });

  console.log(MARKER);
  console.log("fixed_systemd_credential_signer_reused=true");
  console.log("credential_read_at_composition=false");
  console.log("credential_signing_at_composition=false");
  console.log("custodian_service_created=true");
  console.log("custodian_service_started_by_composition=false");
  console.log("synthetic_custodian_service_start=true");
  console.log("deterministic_prepare_once_contract=true");
  console.log("duplicate_prepare_credential_read=false");
  console.log("restart_duplicate_credential_read=false");
  console.log("after_sign_crash_resign_bytes_identical=true");
  console.log("signer_cache_inside_custody_private_store=true");
  console.log("signer_record_mode_0600=true");
  console.log("raw_signed_transaction_application_visibility=false");
  console.log("raw_signed_transaction_ipc_output=false");
  console.log("production_credential_access=false");
  console.log("synthetic_test_signing=true");
  console.log("real_rpc_calls=0");
  console.log("real_transaction_broadcast=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
  console.log("production_service_activation=false");
  console.log("runtime_route_mount=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
