import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Transaction, Wallet } from "ethers";

import {
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import {
  createBuyVoidPreparedTransactionCustodianIpcV1,
} from "../src/economic/buy_void_prepared_transaction_custodian_ipc_v1.js";
import {
  createBuyVoidPreparedTransactionCustodianCredentialCompositionV1,
} from "../src/economic/buy_void_prepared_transaction_custodian_credential_composition_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
  runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_broadcast_custody_v1.js";
import {
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1,
  handleBuyVoidSagaExecutePreparedTransactionRuntimeCommandV1,
} from "../src/economic/buy_void_saga_execute_prepared_transaction_runtime_v1.js";
import {
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1,
  handleBuyVoidSagaBroadcastReconciliationRuntimeCommandV1,
} from "../src/economic/buy_void_saga_broadcast_reconciliation_runtime_v1.js";
import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
  handleBuyVoidSagaTerminalCloseoutRuntimeCommandV1,
} from "../src/economic/buy_void_saga_terminal_closeout_runtime_v1.js";
import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
} from "../src/economic/buy_void_saga_terminal_closeout_v1.js";

const MARKER =
  "VOID_BUY_VOID_SYNTHETIC_END_TO_END_FULFILLMENT_REHEARSAL_V1_GREEN";

const EXECUTE_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ENABLED";
const EXECUTE_APPLY_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_APPLY_ENABLED";
const EXECUTE_SUBMISSION_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_SUBMISSION_ENABLED";
const BROADCASTER_SOCKET_ENV =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SOCKET";
const RECONCILIATION_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ENABLED";
const RECONCILIATION_APPLY_ENV =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_APPLY_ENABLED";
const CLOSEOUT_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ENABLED";
const CLOSEOUT_APPLY_ENV =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_APPLY_ENABLED";

const MANAGED_ENVS = [
  EXECUTE_ENABLE_ENV,
  EXECUTE_APPLY_ENV,
  EXECUTE_SUBMISSION_ENV,
  BROADCASTER_SOCKET_ENV,
  RECONCILIATION_ENABLE_ENV,
  RECONCILIATION_APPLY_ENV,
  CLOSEOUT_ENABLE_ENV,
  CLOSEOUT_APPLY_ENV,
] as const;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function mkdirPrivate(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function writeCredential(directory: string, privateKey: string): void {
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

function responseHarness() {
  let sent: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      sent = { status: this.statusCode, body };
      return this;
    },
  };
  return { res, read: () => sent };
}

async function callExecute(
  body: Record<string, unknown>,
  options: Record<string, unknown>,
): Promise<{ status: number; body: any }> {
  const harness = responseHarness();
  await handleBuyVoidSagaExecutePreparedTransactionRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body,
    },
    harness.res,
    options as any,
  );
  const sent = harness.read();
  assert.ok(sent);
  return sent!;
}

async function callReconciliation(
  body: Record<string, unknown>,
  options: Record<string, unknown>,
): Promise<{ status: number; body: any }> {
  const harness = responseHarness();
  await handleBuyVoidSagaBroadcastReconciliationRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body,
    },
    harness.res,
    options as any,
  );
  const sent = harness.read();
  assert.ok(sent);
  return sent!;
}

async function callCloseout(
  body: Record<string, unknown>,
  options: Record<string, unknown>,
): Promise<{ status: number; body: any }> {
  const harness = responseHarness();
  await handleBuyVoidSagaTerminalCloseoutRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body,
    },
    harness.res,
    options as any,
  );
  const sent = harness.read();
  assert.ok(sent);
  return sent!;
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-e2e-rehearsal-v1-"),
  );
  fs.chmodSync(root, 0o700);

  const originalEnv = new Map<string, string | undefined>();
  for (const name of MANAGED_ENVS) originalEnv.set(name, process.env[name]);

  const runtimeRoot = path.join(root, "runtime-root");
  const custodyStore = path.join(root, "custody-store");
  const credentialsDir = path.join(root, "credentials");
  const custodianSocketDir = path.join(root, "custodian-socket");
  const custodianSocket = path.join(custodianSocketDir, "custodian.sock");
  const broadcasterSocketDir = path.join(root, "broadcaster-socket");
  const broadcasterSocket = path.join(
    broadcasterSocketDir,
    "broadcaster.sock",
  );
  const broadcasterState = path.join(root, "broadcaster-state");

  mkdirPrivate(runtimeRoot);
  mkdirPrivate(custodyStore);
  mkdirPrivate(credentialsDir);
  mkdirPrivate(custodianSocketDir);
  mkdirPrivate(broadcasterSocketDir);

  let custodianService: any = null;
  let broadcasterService: any = null;
  const cleanupErrors: string[] = [];

  try {
    const privateKey = `0x${"1".repeat(64)}`;
    const wallet = new Wallet(privateKey);
    const expectedWallet = wallet.address.toLowerCase();
    const deliveryAddress = `0x${"2".repeat(40)}`;
    const amountUnits = "2500000";
    const nativeValueWei = (
      BigInt(amountUnits) * 1_000_000_000_000n
    ).toString();

    writeCredential(credentialsDir, privateKey);

    let credentialFactoryCalls = 0;
    let credentialSignCalls = 0;
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
              return signer.sign_transaction(transaction);
            },
          },
        };
      }) as typeof createBuyVoidNativeFulfillmentWalletCredentialSignerV1;

    const custodianComposition =
      await createBuyVoidPreparedTransactionCustodianCredentialCompositionV1(
        {
          socket_path: custodianSocket,
          custody_store_dir: custodyStore,
          credentials_directory: credentialsDir,
          expected_wallet_address: expectedWallet,
        },
        {
          credential_signer: {
            create_credential_signer: countedCredentialFactory,
          },
        },
      );

    assert.equal(custodianComposition.ok, true);
    if (!custodianComposition.ok) {
      throw new Error("synthetic_custodian_composition_not_ready");
    }
    assert.equal(custodianComposition.service_started, false);
    assert.equal(custodianComposition.credential_read_performed, false);
    assert.equal(custodianComposition.signing_performed, false);

    custodianService = custodianComposition.service;
    const custodianStarted = await custodianService.start();
    assert.equal(custodianStarted.transaction_broadcast_interface, false);

    const sagaId = `voidbvfsg1_${sha256("e2e-rehearsal:saga")}`;
    const attemptId = sha256("e2e-rehearsal:attempt");
    const planReservationId = sha256("e2e-rehearsal:reservation");
    const planFingerprint = sha256("e2e-rehearsal:plan");
    const custodyIdempotencyKey = sha256(
      [
        "void-buy-prepared-transaction-custody-v1",
        sagaId,
        attemptId,
        planReservationId,
        planFingerprint,
      ].join("\n"),
    );

    const custodian = createBuyVoidPreparedTransactionCustodianIpcV1({
      socket_path: custodianSocket,
      expected_signer_fingerprint_sha256:
        custodianComposition.signer_fingerprint_sha256,
    });

    const prepared = await custodian.prepare_once({
      idempotency_key_sha256: custodyIdempotencyKey,
      saga_id: sagaId,
      attempt_id: attemptId,
      plan_reservation_id: planReservationId,
      transaction_plan_fingerprint_sha256: planFingerprint,
      chain_id: "2050",
      wallet_address: expectedWallet,
      nonce: 31,
      delivery_address: deliveryAddress,
      native_value_wei: nativeValueWei,
      gas_limit: "21000",
      max_fee_per_gas_wei: "100",
      max_priority_fee_per_gas_wei: "2",
    } as any);

    assert.equal(prepared.ok, true);
    if (!prepared.ok) throw new Error("synthetic_prepare_not_ready");
    assert.equal(prepared.status, "prepared");
    assert.equal(credentialFactoryCalls, 1);
    assert.equal(credentialSignCalls, 1);
    assert.equal(
      JSON.stringify(prepared).includes("raw_signed_transaction"),
      false,
    );

    const broadcastIntentId =
      `voidbvbci1_${sha256("e2e-rehearsal:broadcast-intent")}`;
    const submissionIdempotencyKey = sha256(
      [
        "void-buy-prepared-transaction-broadcast-custody-v1",
        sagaId,
        attemptId,
        broadcastIntentId,
        custodyIdempotencyKey,
        prepared.signed_transaction_hash,
      ].join("\n"),
    );

    const broadcastRequest = {
      submission_idempotency_key_sha256: submissionIdempotencyKey,
      saga_id: sagaId,
      attempt_id: attemptId,
      broadcast_intent_id: broadcastIntentId,
      custody_idempotency_key_sha256: custodyIdempotencyKey,
      custody_handle_fingerprint_sha256: sha256(prepared.custody_handle),
      transaction_plan_fingerprint_sha256: planFingerprint,
      signed_transaction_hash: prepared.signed_transaction_hash,
    };

    let syntheticSubmitCalls = 0;
    let syntheticInspectCalls = 0;
    let durableIntentVisibleBeforeSubmit = false;
    let rawSignedTransactionReachedPrivateTransport = false;

    const providerSubmissionId = "synthetic-e2e-provider-v1";
    const syntheticTransport = {
      submit_once: async (request: Record<string, unknown>) => {
        syntheticSubmitCalls += 1;
        const raw = String(request.raw_signed_transaction || "");
        assert.match(raw, /^0x[0-9a-fA-F]+$/);
        const parsed = Transaction.from(raw);
        assert.equal(
          String(parsed.hash).toLowerCase(),
          broadcastRequest.signed_transaction_hash,
        );
        assert.equal(String(parsed.from).toLowerCase(), expectedWallet);
        assert.equal(String(parsed.to).toLowerCase(), deliveryAddress);
        assert.equal(String(parsed.value), nativeValueWei);
        const intentFile = path.join(
          broadcasterState,
          "intents",
          `${submissionIdempotencyKey}.json`,
        );
        durableIntentVisibleBeforeSubmit = fs.existsSync(intentFile);
        rawSignedTransactionReachedPrivateTransport = true;
        return {
          ok: true,
          status: "accepted",
          transaction_hash: broadcastRequest.signed_transaction_hash,
          provider_submission_id: providerSubmissionId,
          definitive_not_submitted: false,
          submission_call_performed: true,
          submission_may_have_occurred: true,
          receipt: null,
        };
      },
      inspect_submission: async (request: Record<string, unknown>) => {
        syntheticInspectCalls += 1;
        assert.equal("raw_signed_transaction" in request, false);
        assert.equal(request.saga_id, sagaId);
        assert.equal(request.attempt_id, attemptId);
        assert.equal(
          request.signed_transaction_hash,
          broadcastRequest.signed_transaction_hash,
        );
        return {
          ok: true,
          status: "confirmed",
          transaction_hash: broadcastRequest.signed_transaction_hash,
          provider_submission_id: providerSubmissionId,
          definitive_not_submitted: false,
          submission_call_performed: true,
          submission_may_have_occurred: true,
          receipt: {
            chain_id: "2050",
            transaction_hash: broadcastRequest.signed_transaction_hash,
            transaction_status: 1,
            block_number: "100",
            block_hash: `0x${"b".repeat(64)}`,
            current_block_number: "111",
            confirmation_count: "12",
            from_address: expectedWallet,
            to_address: deliveryAddress,
            amount_units: amountUnits,
          },
        };
      },
    };

    const broadcasterActivation =
      await runBuyVoidPreparedTransactionBroadcasterSubmissionActivationV1(
        {
          policy: {
            socket_path: broadcasterSocket,
            custody_store_dir: custodyStore,
            state_dir: broadcasterState,
            expected_signer_fingerprint_sha256:
              custodianComposition.signer_fingerprint_sha256,
            rpc: {
              rpc_url: "http://127.0.0.1:8545",
              expected_chain_id: 2050,
            },
          },
          apply: true,
          confirmation:
            VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
        },
        {
          create_chain_transport: async () => ({
            ok: true,
            status: "ready",
            marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CHAIN2050_TRANSPORT_V1",
            version: 1,
            chain_id: "2050",
            rpc_url_fingerprint_sha256: sha256(
              "http://127.0.0.1:8545",
            ),
            transport: syntheticTransport,
            authority: {},
          } as any),
        },
      );

    assert.equal(broadcasterActivation.ok, true);
    if (!broadcasterActivation.ok || broadcasterActivation.status !== "started") {
      throw new Error("synthetic_broadcaster_activation_not_started");
    }
    broadcasterService = broadcasterActivation.service;
    assert.equal(broadcasterActivation.submission_enabled, true);
    assert.equal(broadcasterActivation.transaction_broadcast_performed, false);
    assert.equal(broadcasterActivation.money_movement_performed, false);
    assert.equal(syntheticSubmitCalls, 0);
    assert.equal(syntheticInspectCalls, 0);

    process.env[EXECUTE_ENABLE_ENV] = "1";
    process.env[EXECUTE_APPLY_ENV] = "1";
    process.env[EXECUTE_SUBMISSION_ENV] = "1";
    process.env[BROADCASTER_SOCKET_ENV] = broadcasterSocket;
    process.env[RECONCILIATION_ENABLE_ENV] = "1";
    process.env[RECONCILIATION_APPLY_ENV] = "1";
    process.env[CLOSEOUT_ENABLE_ENV] = "1";
    process.env[CLOSEOUT_APPLY_ENV] = "1";

    const executeDryDecision = {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      saga_id: sagaId,
      attempt_id: attemptId,
      next_action: "execute_prepared_transaction",
      required_confirmation: "e2eExecuteCoordinatorConfirmationV1",
      required_policy_fingerprint_sha256: sha256("e2e:execute-policy"),
      required_saga_confirmation: "e2e-execute-saga-confirmation-v1",
      required_saga_action_confirmation:
        "e2e-execute-action-confirmation-v1",
      required_broadcast_confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
      existing_evidence: null,
      existing_outcome: null,
      policy_public_summary: {},
      broadcaster_called: false,
      submission_call_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      signed_payload_bytes_persisted: false,
      signed_payload_bytes_returned: false,
      money_movement_performed: false,
    } as const;

    const runExecution = async (input: any) => {
      if (input.apply !== true) return executeDryDecision as any;
      assert.equal(input.saga_id, sagaId);
      assert.equal(
        input.confirmation,
        executeDryDecision.required_confirmation,
      );
      assert.ok(input.dependencies?.broadcaster);
      const submission = await input.dependencies.broadcaster.submit_once(
        broadcastRequest as any,
      );
      assert.equal(submission.ok, true);
      assert.equal(submission.status, "accepted");
      return {
        ok: true,
        status: "accepted",
        applied: true,
        mutation_performed: true,
        saga_id: sagaId,
        attempt_id: attemptId,
        action: "execute_prepared_transaction",
        evidence: {},
        execution_attempt: {},
        broadcast_outcome: submission,
        saga_state: { state: "broadcast_possible" },
        broadcaster_called: true,
        submission_call_performed: true,
        transaction_broadcast_performed: true,
        reconciliation_required: true,
        automatic_retry_allowed: false,
        signed_payload_bytes_persisted: false,
        signed_payload_bytes_returned: false,
        money_movement_performed: true,
      } as any;
    };

    const executeDry = await callExecute(
      {
        action:
          VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
        saga_id: sagaId,
      },
      {
        root_dir: runtimeRoot,
        dependencies: { run_execution: runExecution },
      },
    );
    assert.equal(executeDry.status, 200);
    assert.equal(executeDry.body.status, "dry_run");
    assert.equal(syntheticSubmitCalls, 0);

    const executeApplied = await callExecute(
      {
        action:
          VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
        saga_id: sagaId,
        apply: true,
        confirmation:
          VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1,
        coordinator_confirmation:
          executeDry.body.required_coordinator_confirmation,
        policy_fingerprint_sha256:
          executeDry.body.required_policy_fingerprint_sha256,
        saga_confirmation: executeDry.body.required_saga_confirmation,
        saga_action_confirmation:
          executeDry.body.required_saga_action_confirmation,
        broadcast_confirmation:
          executeDry.body.required_broadcast_confirmation,
      },
      {
        root_dir: runtimeRoot,
        dependencies: { run_execution: runExecution },
      },
    );
    assert.equal(executeApplied.status, 200);
    assert.equal(executeApplied.body.ok, true);
    assert.equal(executeApplied.body.decision.status, "accepted");
    assert.equal(executeApplied.body.transaction_broadcast_performed, true);
    assert.equal(syntheticSubmitCalls, 1);
    assert.equal(syntheticInspectCalls, 0);
    assert.equal(durableIntentVisibleBeforeSubmit, true);
    assert.equal(rawSignedTransactionReachedPrivateTransport, true);

    const reconciliationDryDecision = {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      saga_id: sagaId,
      attempt_id: attemptId,
      next_action: "reconcile_possible_broadcast",
      required_confirmation: "e2eReconciliationCoordinatorConfirmationV1",
      required_policy_fingerprint_sha256: sha256(
        "e2e:reconciliation-policy",
      ),
      required_saga_confirmation:
        "e2e-reconciliation-saga-confirmation-v1",
      required_saga_action_confirmation:
        "e2e-reconciliation-action-confirmation-v1",
      broadcaster_called: false,
      inspection_call_performed: false,
      submission_call_performed: false,
      transaction_broadcast_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    } as const;

    let confirmedReceipt: any = null;
    const runReconciliation = async (input: any) => {
      if (input.apply !== true) return reconciliationDryDecision as any;
      assert.equal(input.saga_id, sagaId);
      assert.equal(
        input.confirmation,
        reconciliationDryDecision.required_confirmation,
      );
      assert.ok(input.dependencies?.broadcaster);
      const inspected = await input.dependencies.broadcaster.inspect_submission(
        broadcastRequest as any,
      );
      assert.equal(inspected.ok, true);
      assert.equal(inspected.status, "confirmed");
      confirmedReceipt = inspected.receipt;
      return {
        ok: true,
        status: "confirmed",
        applied: true,
        mutation_performed: true,
        saga_id: sagaId,
        attempt_id: attemptId,
        action: "reconcile_possible_broadcast",
        broadcast_outcome: inspected,
        receipt_confirmed: true,
        saga_state: { state: "receipt_confirmed" },
        broadcaster_called: true,
        inspection_call_performed: true,
        submission_call_performed: false,
        transaction_broadcast_performed: false,
        reconciliation_required: false,
        automatic_retry_allowed: false,
        money_movement_performed: false,
      } as any;
    };

    const reconciliationDry = await callReconciliation(
      {
        action:
          VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
        saga_id: sagaId,
      },
      {
        root_dir: runtimeRoot,
        dependencies: { run_reconciliation: runReconciliation },
      },
    );
    assert.equal(reconciliationDry.status, 200);
    assert.equal(reconciliationDry.body.status, "dry_run");
    assert.equal(syntheticSubmitCalls, 1);
    assert.equal(syntheticInspectCalls, 0);

    const reconciliationApplied = await callReconciliation(
      {
        action:
          VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
        saga_id: sagaId,
        apply: true,
        confirmation:
          VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1,
        coordinator_confirmation:
          reconciliationDry.body.required_coordinator_confirmation,
        policy_fingerprint_sha256:
          reconciliationDry.body.required_policy_fingerprint_sha256,
        saga_confirmation:
          reconciliationDry.body.required_saga_confirmation,
        saga_action_confirmation:
          reconciliationDry.body.required_saga_action_confirmation,
      },
      {
        root_dir: runtimeRoot,
        dependencies: { run_reconciliation: runReconciliation },
      },
    );
    assert.equal(reconciliationApplied.status, 200);
    assert.equal(reconciliationApplied.body.ok, true);
    assert.equal(reconciliationApplied.body.decision.status, "confirmed");
    assert.equal(
      reconciliationApplied.body.transaction_broadcast_performed,
      false,
    );
    assert.equal(syntheticSubmitCalls, 1);
    assert.equal(syntheticInspectCalls, 1);
    assert.ok(confirmedReceipt);
    assert.equal(confirmedReceipt.chain_id, "2050");
    assert.equal(
      confirmedReceipt.transaction_hash,
      broadcastRequest.signed_transaction_hash,
    );
    assert.equal(confirmedReceipt.from_address, expectedWallet);
    assert.equal(confirmedReceipt.to_address, deliveryAddress);
    assert.equal(confirmedReceipt.amount_units, amountUnits);

    const closeoutPlanFingerprint = sha256("e2e:closeout-plan");
    const closeoutDryDecision = {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      saga_id: sagaId,
      attempt_id: attemptId,
      closeout_id: sha256("e2e-rehearsal:closeout"),
      plan: { plan_fingerprint_sha256: closeoutPlanFingerprint },
      required_confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      required_policy_fingerprint_sha256: sha256("e2e:closeout-policy"),
      required_plan_fingerprint_sha256: closeoutPlanFingerprint,
      required_saga_confirmation: "e2e-closeout-saga-confirmation-v1",
      required_saga_action_confirmation:
        "e2e-closeout-action-confirmation-v1",
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    } as const;

    let closeoutApplyCalls = 0;
    const runCloseout = async (input: any) => {
      if (input.apply !== true) return closeoutDryDecision as any;
      closeoutApplyCalls += 1;
      assert.ok(confirmedReceipt);
      assert.equal(input.saga_id, sagaId);
      assert.equal(
        input.confirmation,
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      );
      assert.equal(
        input.expected_plan_fingerprint_sha256,
        closeoutPlanFingerprint,
      );
      return {
        ok: true,
        status: "closed",
        applied: true,
        mutation_performed: true,
        saga_id: sagaId,
        attempt_id: attemptId,
        closeout_id: closeoutDryDecision.closeout_id,
        plan: {},
        saga_state: { state: "closed" },
        inventory_consumption_performed: true,
        public_request_fulfilled: true,
        saga_closeout_appended: true,
        automatic_retry_allowed: false,
        money_movement_performed: false,
      } as any;
    };

    const closeoutDry = await callCloseout(
      {
        action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
        saga_id: sagaId,
      },
      {
        root_dir: runtimeRoot,
        dependencies: { run_closeout: runCloseout },
      },
    );
    assert.equal(closeoutDry.status, 200);
    assert.equal(closeoutDry.body.status, "dry_run");
    assert.equal(
      closeoutDry.body.required_terminal_plan_fingerprint_sha256,
      closeoutPlanFingerprint,
    );

    const closeoutApplied = await callCloseout(
      {
        action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
        saga_id: sagaId,
        apply: true,
        confirmation:
          VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
        terminal_closeout_confirmation:
          closeoutDry.body.required_terminal_closeout_confirmation,
        policy_fingerprint_sha256:
          closeoutDry.body.required_policy_fingerprint_sha256,
        terminal_plan_fingerprint_sha256:
          closeoutDry.body.required_terminal_plan_fingerprint_sha256,
        saga_confirmation: closeoutDry.body.required_saga_confirmation,
        saga_action_confirmation:
          closeoutDry.body.required_saga_action_confirmation,
      },
      {
        root_dir: runtimeRoot,
        dependencies: { run_closeout: runCloseout },
      },
    );

    assert.equal(closeoutApplied.status, 200);
    assert.equal(closeoutApplied.body.status, "closed");
    assert.equal(closeoutApplied.body.inventory_consumption_performed, true);
    assert.equal(closeoutApplied.body.public_request_fulfilled, true);
    assert.equal(closeoutApplied.body.saga_closeout_appended, true);
    assert.equal(closeoutApplied.body.money_movement_performed, false);
    assert.equal(closeoutApplyCalls, 1);
    assert.equal(syntheticSubmitCalls, 1);
    assert.equal(syntheticInspectCalls, 1);
    assert.equal(credentialFactoryCalls, 1);
    assert.equal(credentialSignCalls, 1);

    const duplicatePrepared = await custodian.prepare_once({
      idempotency_key_sha256: custodyIdempotencyKey,
      saga_id: sagaId,
      attempt_id: attemptId,
      plan_reservation_id: planReservationId,
      transaction_plan_fingerprint_sha256: planFingerprint,
      chain_id: "2050",
      wallet_address: expectedWallet,
      nonce: 31,
      delivery_address: deliveryAddress,
      native_value_wei: nativeValueWei,
      gas_limit: "21000",
      max_fee_per_gas_wei: "100",
      max_priority_fee_per_gas_wei: "2",
    } as any);
    assert.equal(duplicatePrepared.ok, true);
    assert.equal(duplicatePrepared.status, "duplicate");
    assert.equal(credentialFactoryCalls, 1);
    assert.equal(credentialSignCalls, 1);

    await broadcasterService.stop();
    broadcasterService = null;
    await custodianService.stop();
    custodianService = null;

    console.log(MARKER);
    console.log(`saga_id=${sagaId}`);
    console.log("generated_test_credential_only=true");
    console.log("production_credential_access=false");
    console.log("credential_sign_calls=1");
    console.log("duplicate_prepare_additional_sign_calls=0");
    console.log("custodian_private_ipc_used=true");
    console.log("raw_signed_transaction_application_visibility=false");
    console.log("submission_capable_broadcaster_started_synthetic=true");
    console.log("broadcaster_activation_submit_calls=0");
    console.log("durable_submission_intent_before_transport=true");
    console.log("synthetic_submit_calls=1");
    console.log("automatic_resubmission=false");
    console.log("reconciliation_inspection_calls=1");
    console.log("reconciliation_submit_calls=0");
    console.log("confirmed_receipt_chain_id=2050");
    console.log("confirmed_receipt_matches_synthetic_purchase=true");
    console.log("synthetic_terminal_closeout=true");
    console.log("synthetic_inventory_consumption=true");
    console.log("synthetic_public_fulfilled_projection=true");
    console.log("synthetic_saga_closed=true");
    console.log("real_rpc_calls=0");
    console.log("real_transaction_broadcast=false");
    console.log("real_inventory_mutation=false");
    console.log("real_public_fulfilled_closeout=false");
    console.log("real_money_movement=false");
    console.log("production_service_activation=false");
  } finally {
    if (broadcasterService) {
      try {
        await broadcasterService.stop();
      } catch (error) {
        cleanupErrors.push(
          `broadcaster_stop:${String((error as Error)?.message || error)}`,
        );
      }
    }
    if (custodianService) {
      try {
        await custodianService.stop();
      } catch (error) {
        cleanupErrors.push(
          `custodian_stop:${String((error as Error)?.message || error)}`,
        );
      }
    }
    for (const name of MANAGED_ENVS) {
      const previous = originalEnv.get(name);
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    }
    fs.rmSync(root, { recursive: true, force: true });
    if (cleanupErrors.length > 0) {
      console.error(`cleanup_errors=${cleanupErrors.join("|")}`);
    }
  }
}

await main();
