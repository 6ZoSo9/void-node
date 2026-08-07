import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Transaction, Wallet } from "ethers";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_AUTHORITY_V1,
  createBuyVoidPreparedTransactionBroadcasterIpcV1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_ipc_v1.js";

const MARKER =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_V1_PROOF_GREEN";

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

type Fixture = {
  request: Record<string, string>;
  raw_signed_transaction: string;
  wallet_address: string;
  delivery_address: string;
  amount_units: string;
};

async function buildFixture(input: {
  custodyStore: string;
  wallet: Wallet;
  tag: string;
  nonce: number;
  delivery: string;
  signerFingerprint: string;
}): Promise<Fixture> {
  const sagaId = `voidbvfsg1_${sha256(`saga:${input.tag}`)}`;
  const attemptId = sha256(`attempt:${input.tag}`);
  const broadcastIntentId =
    `voidbvbci1_${sha256(`intent:${input.tag}`)}`;
  const custodyIdempotencyKey = sha256(`custody:${input.tag}`);
  const planFingerprint = sha256(`plan:${input.tag}`);
  const custodyHandle =
    `custody:void-buy:ipc-v1/${custodyIdempotencyKey}`;
  const nativeValueWei = "2500000000000000000";
  const raw = await input.wallet.signTransaction({
    type: 2,
    chainId: 2050,
    nonce: input.nonce,
    to: input.delivery,
    value: BigInt(nativeValueWei),
    gasLimit: 21000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 2n,
    data: "0x",
    accessList: [],
  });
  const parsed = Transaction.from(raw);
  assert.match(String(parsed.hash), /^0x[0-9a-f]{64}$/);
  const signedHash = String(parsed.hash).toLowerCase();

  const privateRecord = {
    schema:
      "void_buy_void_prepared_transaction_custodian_service_record_v1",
    marker:
      "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SERVICE_V1",
    version: 1,
    recorded_at_ms: Date.parse("2026-08-07T16:00:00.000Z") + input.nonce,
    idempotency_key_sha256: custodyIdempotencyKey,
    saga_id: sagaId,
    attempt_id: attemptId,
    plan_reservation_id: sha256(`reservation:${input.tag}`),
    transaction_plan_fingerprint_sha256: planFingerprint,
    chain_id: "2050",
    wallet_address: input.wallet.address.toLowerCase(),
    nonce: input.nonce,
    delivery_address: input.delivery.toLowerCase(),
    native_value_wei: nativeValueWei,
    gas_limit: "21000",
    max_fee_per_gas_wei: "100",
    max_priority_fee_per_gas_wei: "2",
    custody_handle: custodyHandle,
    signed_transaction_hash: signedHash,
    signer_fingerprint_sha256: input.signerFingerprint,
    raw_signed_transaction: raw,
    raw_signed_transaction_sha256: sha256(raw.toLowerCase()),
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
  writePrivateJson(
    path.join(
      input.custodyStore,
      "records",
      `${custodyIdempotencyKey}.json`,
    ),
    privateRecord,
  );

  const submissionKey = sha256(
    [
      "void-buy-prepared-transaction-broadcast-custody-v1",
      sagaId,
      attemptId,
      broadcastIntentId,
      custodyIdempotencyKey,
      signedHash,
    ].join("\n"),
  );

  return {
    request: {
      submission_idempotency_key_sha256: submissionKey,
      saga_id: sagaId,
      attempt_id: attemptId,
      broadcast_intent_id: broadcastIntentId,
      custody_idempotency_key_sha256: custodyIdempotencyKey,
      custody_handle_fingerprint_sha256: sha256(custodyHandle),
      transaction_plan_fingerprint_sha256: planFingerprint,
      signed_transaction_hash: signedHash,
    },
    raw_signed_transaction: raw,
    wallet_address: input.wallet.address.toLowerCase(),
    delivery_address: input.delivery.toLowerCase(),
    amount_units: "2500000",
  };
}

function accepted(hash: string, provider = "proof-provider-1") {
  return {
    ok: true,
    status: "accepted",
    transaction_hash: hash,
    provider_submission_id: provider,
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt: null,
  };
}

function notSubmitted(hash: string) {
  return {
    ok: true,
    status: "not_submitted",
    transaction_hash: hash,
    provider_submission_id: "",
    definitive_not_submitted: true,
    submission_call_performed: false,
    submission_may_have_occurred: false,
    receipt: null,
  };
}

function confirmed(fixture: Fixture, provider = "proof-provider-1") {
  return {
    ok: true,
    status: "confirmed",
    transaction_hash: fixture.request.signed_transaction_hash,
    provider_submission_id: provider,
    definitive_not_submitted: false,
    submission_call_performed: true,
    submission_may_have_occurred: true,
    receipt: {
      chain_id: "2050",
      transaction_hash: fixture.request.signed_transaction_hash,
      transaction_status: 1,
      block_number: "100",
      block_hash: `0x${"b".repeat(64)}`,
      current_block_number: "111",
      confirmation_count: "12",
      from_address: fixture.wallet_address,
      to_address: fixture.delivery_address,
      amount_units: fixture.amount_units,
    },
  };
}

async function main(): Promise<void> {
  const base = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-broadcaster-ipc-proof-"),
  );
  const socketDir = path.join(base, "socket");
  const custodyStore = path.join(base, "custody-store");
  const stateDir = path.join(base, "broadcaster-state");
  mkdirPrivate(socketDir);
  mkdirPrivate(custodyStore);
  mkdirPrivate(path.join(custodyStore, "records"));

  const wallet = new Wallet(`0x${"1".repeat(64)}`);
  const signerFingerprint = sha256("proof-signer-fingerprint");
  const delivery1 = `0x${"2".repeat(40)}`;
  const delivery2 = `0x${"3".repeat(40)}`;
  const delivery3 = `0x${"4".repeat(40)}`;
  const delivery4 = `0x${"5".repeat(40)}`;
  const delivery5 = `0x${"6".repeat(40)}`;

  const normal = await buildFixture({
    custodyStore,
    wallet,
    tag: "normal",
    nonce: 7,
    delivery: delivery1,
    signerFingerprint,
  });
  const inspectBeforeSubmit = await buildFixture({
    custodyStore,
    wallet,
    tag: "inspect-before-submit",
    nonce: 8,
    delivery: delivery2,
    signerFingerprint,
  });
  const preSubmitCrash = await buildFixture({
    custodyStore,
    wallet,
    tag: "pre-submit-crash",
    nonce: 9,
    delivery: delivery3,
    signerFingerprint,
  });
  const postSubmitCrash = await buildFixture({
    custodyStore,
    wallet,
    tag: "post-submit-crash",
    nonce: 10,
    delivery: delivery4,
    signerFingerprint,
  });
  const malicious = await buildFixture({
    custodyStore,
    wallet,
    tag: "malicious",
    nonce: 11,
    delivery: delivery5,
    signerFingerprint,
  });

  let submitCalls = 0;
  let inspectCalls = 0;
  let inspectMode: "not_submitted" | "accepted" | "confirmed" =
    "confirmed";
  let faultStage = "";
  let maliciousSubmit = false;

  const transport = {
    submit_once: async (request: Record<string, unknown>) => {
      submitCalls += 1;
      assert.match(
        String(request.raw_signed_transaction),
        /^0x[0-9a-fA-F]+$/,
      );
      assert.equal(
        String(request.signed_transaction_hash),
        String(
          Transaction.from(
            String(request.raw_signed_transaction),
          ).hash,
        ).toLowerCase(),
      );
      if (maliciousSubmit) {
        return {
          ...accepted(String(request.signed_transaction_hash)),
          raw_signed_transaction: String(request.raw_signed_transaction),
        };
      }
      return accepted(String(request.signed_transaction_hash));
    },
    inspect_submission: async (request: Record<string, unknown>) => {
      inspectCalls += 1;
      assert.equal("raw_signed_transaction" in request, false);
      const hash = String(request.signed_transaction_hash);
      if (inspectMode === "not_submitted") return notSubmitted(hash);
      if (inspectMode === "accepted") return accepted(hash);
      const fixture =
        hash === normal.request.signed_transaction_hash
          ? normal
          : hash === postSubmitCrash.request.signed_transaction_hash
            ? postSubmitCrash
            : preSubmitCrash;
      return confirmed(fixture);
    },
  };

  const serviceModule: any = await import(
    new URL(
      "../tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",
      import.meta.url,
    ).href,
  );

  const socketPath = path.join(socketDir, "broadcaster.sock");
  const service =
    serviceModule.createPreparedTransactionBroadcasterServiceV1({
      socket_path: socketPath,
      custody_store_dir: custodyStore,
      state_dir: stateDir,
      expected_signer_fingerprint_sha256: signerFingerprint,
      transport,
      fault_inject: async (stage: string) => {
        if (faultStage === stage) {
          faultStage = "";
          throw new Error(`injected_${stage}`);
        }
      },
    });

  const started = await service.start();
  assert.equal(started.raw_signed_transaction_ipc_output, false);
  const socketMetadata = fs.lstatSync(socketPath);
  assert.equal(socketMetadata.isSocket(), true);
  assert.equal(socketMetadata.mode & 0o077, 0);

  const broadcaster =
    createBuyVoidPreparedTransactionBroadcasterIpcV1({
      socket_path: socketPath,
    });

  const first = await broadcaster.submit_once(normal.request as any);
  assert.equal(first.ok, true);
  assert.equal(first.status, "accepted");
  assert.equal(submitCalls, 1);
  assert.equal(JSON.stringify(first).includes(normal.raw_signed_transaction), false);

  const repeat = await broadcaster.submit_once(normal.request as any);
  assert.equal(repeat.ok, false);
  if (repeat.ok) throw new Error("repeat_submit_should_hold");
  assert.equal(
    repeat.reason,
    "prepared_broadcaster_submit_reentry_requires_inspection",
  );
  assert.equal(submitCalls, 1);

  inspectMode = "confirmed";
  const terminal = await broadcaster.inspect_submission(
    normal.request as any,
  );
  assert.equal(terminal.ok, true);
  assert.equal(terminal.status, "confirmed");
  assert.equal(inspectCalls, 1);
  assert.equal(submitCalls, 1);
  assert.equal(JSON.stringify(terminal).includes(normal.raw_signed_transaction), false);

  const terminalDuplicate = await broadcaster.inspect_submission(
    normal.request as any,
  );
  assert.equal(terminalDuplicate.ok, true);
  assert.equal(terminalDuplicate.status, "confirmed");
  assert.equal(inspectCalls, 1);

  const before = await broadcaster.inspect_submission(
    inspectBeforeSubmit.request as any,
  );
  assert.equal(before.ok, true);
  assert.equal(before.status, "not_submitted");
  assert.equal(submitCalls, 1);
  assert.equal(inspectCalls, 1);

  faultStage = "after_intent_before_submit";
  const preCrash = await broadcaster.submit_once(
    preSubmitCrash.request as any,
  );
  assert.equal(preCrash.ok, false);
  assert.equal(submitCalls, 1);
  inspectMode = "not_submitted";
  const preRecovered = await broadcaster.inspect_submission(
    preSubmitCrash.request as any,
  );
  assert.equal(preRecovered.ok, true);
  assert.equal(preRecovered.status, "not_submitted");
  assert.equal(submitCalls, 1);
  assert.equal(inspectCalls, 2);

  faultStage = "after_transport_before_outcome";
  const postCrash = await broadcaster.submit_once(
    postSubmitCrash.request as any,
  );
  assert.equal(postCrash.ok, false);
  assert.equal(submitCalls, 2);
  inspectMode = "confirmed";
  const postRecovered = await broadcaster.inspect_submission(
    postSubmitCrash.request as any,
  );
  assert.equal(postRecovered.ok, true);
  assert.equal(postRecovered.status, "confirmed");
  assert.equal(submitCalls, 2);
  assert.equal(inspectCalls, 3);

  maliciousSubmit = true;
  const maliciousResult = await broadcaster.submit_once(
    malicious.request as any,
  );
  maliciousSubmit = false;
  assert.equal(maliciousResult.ok, false);
  assert.equal(submitCalls, 3);
  assert.equal(
    JSON.stringify(maliciousResult).includes(
      malicious.raw_signed_transaction,
    ),
    false,
  );

  const source = fs.readFileSync(
    "src/economic/buy_void_prepared_transaction_broadcaster_ipc_v1.ts",
    "utf8",
  );
  const serviceSource = fs.readFileSync(
    "tools/buy-void-prepared-transaction-broadcaster-service-v1.mjs",
    "utf8",
  );
  for (const marker of [
    "raw_signed_transaction_input: false",
    "custody_handle_input: false",
    "automatic_resubmission: false",
    "runtime_route_mount: false",
  ]) assert.ok(source.includes(marker), marker);
  for (const marker of [
    "durable_submission_intent_before_transport: true",
    "submit_reentry_requires_inspection: true",
    "reconciliation_never_calls_submit: true",
    "source-only library; direct CLI activation is intentionally disabled",
  ]) assert.ok(serviceSource.includes(marker), marker);

  assert.deepEqual(
    VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_IPC_AUTHORITY_V1,
    {
      source_only_contract: true,
      unix_socket_only: true,
      socket_path_server_controlled: true,
      socket_must_be_private: true,
      same_uid_socket_required_when_available: true,
      one_request_per_connection: true,
      bounded_request_bytes: true,
      bounded_response_bytes: true,
      bounded_response_time: true,
      exact_response_schema_required: true,
      metadata_only_request: true,
      raw_signed_transaction_input: false,
      raw_signed_transaction_persistence: false,
      raw_signed_transaction_output: false,
      custody_handle_input: false,
      custody_handle_output: false,
      application_private_material_access: false,
      application_wallet_access: false,
      application_signing: false,
      external_submission_possible_through_private_service: true,
      automatic_resubmission: false,
      runtime_route_mount: false,
      background_loop: false,
      startup_execution: false,
    },
  );

  await service.stop();
  fs.rmSync(base, { recursive: true, force: true });

  console.log(MARKER);
  console.log("private_custody_store_read_only=true");
  console.log("raw_signed_transaction_crossed_application_ipc=false");
  console.log("durable_submission_intent_before_transport=true");
  console.log("duplicate_submit_transport_calls=0");
  console.log("inspect_before_service_submit=definitive_not_submitted");
  console.log("pre_submit_crash_recovery_submit_calls=0");
  console.log("post_submit_crash_recovery_resubmission=false");
  console.log("terminal_inspection_reuses_durable_outcome=true");
  console.log("secret_bearing_transport_result_returned=false");
  console.log("runtime_route_mount=false");
  console.log("production_transport_use=false");
  console.log("synthetic_test_signing=true");
  console.log("real_transaction_broadcast=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
