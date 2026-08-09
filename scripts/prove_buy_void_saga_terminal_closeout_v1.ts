import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  buildBuyVoidVerifiedPaymentEventV2,
  type BuyVoidTransactionReceiptV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import type {
  BuyVoidRequestV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  claimBuyVoidFulfillmentJournalV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  reserveBuyVoidInventoryV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  listBuyVoidExecutionAttemptsV1,
  prepareBuyVoidExecutionTransactionV1,
  recordBuyVoidExecutionBroadcastV1,
  recordBuyVoidExecutionConfirmedV1,
  reserveBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  confirmBuyVoidFulfillmentV1,
} from "../src/economic/buy_void_fulfillment_confirmation_v1.js";
import {
  buyVoidConfirmedStateJournalPathsV1,
  persistBuyVoidConfirmedStateV1,
} from "../src/economic/buy_void_confirmed_state_journal_v1.js";
import {
  listBuyVoidInventoryConsumptionsV1,
  planBuyVoidConfirmedCloseoutV1,
} from "../src/economic/buy_void_confirmed_closeout_v1.js";

function requireConfirmedCloseoutPlanner(input: any): any {
  return planBuyVoidConfirmedCloseoutV1(input);
}
import {
  readBuyVoidCrashConsistentSagaServerPolicyV1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_saga_terminal_closeout_server_policy_v1.js";
import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  runBuyVoidSagaTerminalCloseoutV1,
  type BuyVoidSagaTerminalCloseoutFaultStageV1,
  type RunBuyVoidSagaTerminalCloseoutInputV1,
} from "../src/economic/buy_void_saga_terminal_closeout_v1.js";

const MARKER = "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1_PROOF_GREEN";
const SOURCE_FLOOR = "2a768edd618653c07e37bb0cf6f500dff41d8457";
const RECEIVE = "0x2222222222222222222222222222222222222222";
const USDC = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const POOL_ID = "void-presale-mainnet0-v1";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function topic(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function writeJsonLines(file: string, rows: unknown[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    file,
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    { encoding: "utf8", mode: 0o600 },
  );
}

function readJsonLines(file: string): any[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function configuredEnv(requestDir: string): Record<string, string> {
  const economic = VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
  const terminal = VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1;
  return {
    [economic.payment_chain]: "base",
    [economic.payment_usdc_contract]: USDC,
    [economic.payment_receive_address]: RECEIVE,
    [economic.payment_current_block_number]: "105",
    [economic.payment_min_confirmations]: "3",
    [economic.rate_void_units_numerator]: "2",
    [economic.rate_void_units_denominator]: "1",
    [economic.inventory_policy_version]: "terminal-proof-policy-v1",
    [economic.pool_id]: POOL_ID,
    [economic.pool_capacity_void_units]: "1000000000",
    [economic.max_reservation_void_units]: "100000000",
    [economic.fulfillment_wallet_address]: WALLET,
    [terminal.enabled]: "1",
    [terminal.request_dir]: requestDir,
  };
}

type Fixture = {
  base: string;
  root: string;
  request_dir: string;
  saga_id: string;
  attempt_id: string;
  reservation_id: string;
  confirmed_state_id: string;
  request_id: string;
  transaction_hash: string;
  saga: any;
};

async function initializeSaga(input: {
  root: string;
  binding: Record<string, unknown>;
  claim_id: string;
  instruction_id: string;
  reservation_id: string;
  attempt_id: string;
  transaction_hash: string;
  policy_id: string;
}): Promise<{ saga: any; saga_id: string }> {
  const saga: any = await import(
    new URL(
      "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  );
  const binding = saga.validateSagaBindingV1(input.binding);
  const sagaId = saga.computeSagaIdV1(binding);
  const store = saga.createFilesystemSagaStoreV1(
    path.join(input.root, "buy-void-crash-consistent-saga-runtime-v1"),
  );
  const owner = `terminal-proof-${crypto.randomBytes(8).toString("hex")}`;
  const now = Date.parse("2026-08-06T12:15:00.000Z");
  const lease = store.acquireLease({
    saga_id: sagaId,
    owner_id: owner,
    now_ms: now,
    ttl_ms: 30_000,
  });
  assert.equal(lease.ok, true);
  if (!lease.ok) throw new Error("terminal proof saga lease missing");
  const broadcastIntentId = saga.computeBroadcastIntentIdV1({
    saga_id: sagaId,
    attempt_id: input.attempt_id,
    transaction_hash: input.transaction_hash,
  });
  const eventInputs = [
    {
      event_type: "saga_initialized",
      payload: {
        source_floor_main: SOURCE_FLOOR,
        policy_id: input.policy_id,
        max_attempts: 1,
      },
    },
    {
      event_type: "claim_committed",
      payload: {
        claim_id: input.claim_id,
        instruction_id: input.instruction_id,
      },
    },
    {
      event_type: "inventory_reserved",
      payload: { reservation_id: input.reservation_id },
    },
    {
      event_type: "attempt_reserved",
      payload: { attempt_id: input.attempt_id, attempt_number: 1 },
    },
    {
      event_type: "transaction_prepared",
      payload: {
        attempt_id: input.attempt_id,
        transaction_hash: input.transaction_hash,
        nonce: 7,
        fulfillment_wallet_fingerprint_sha256: digest(WALLET),
        gas_limit: "21000",
        max_fee_per_gas_wei: "1100000000",
        max_priority_fee_per_gas_wei: "100000000",
      },
    },
    {
      event_type: "broadcast_intent_committed",
      payload: {
        attempt_id: input.attempt_id,
        transaction_hash: input.transaction_hash,
        broadcast_intent_id: broadcastIntentId,
      },
    },
    {
      event_type: "broadcast_accepted",
      payload: {
        attempt_id: input.attempt_id,
        transaction_hash: input.transaction_hash,
        reason_code: "terminal_proof_provider_accepted",
        broadcast_call_performed: true,
        provider_submission_id_sha256: digest("terminal-proof-provider"),
      },
    },
    {
      event_type: "receipt_confirmed",
      payload: {
        attempt_id: input.attempt_id,
        transaction_hash: input.transaction_hash,
        block_number: "500",
        block_hash: `0x${"9".repeat(64)}`,
        confirmations: 6,
        receipt_status: 1,
      },
    },
  ];
  for (let index = 0; index < eventInputs.length; index += 1) {
    const current = store.recover(sagaId);
    const event = saga.buildSagaEventV1({
      binding,
      sequence: current?.state?.event_count || 0,
      previous_event_id: current?.state?.last_event_id || null,
      recorded_at_utc: new Date(now + index * 1000).toISOString(),
      event_type: eventInputs[index].event_type,
      fencing_token: lease.lease.fencing_token,
      payload: eventInputs[index].payload,
    });
    store.appendEvent({
      event,
      owner_id: owner,
      fencing_token: lease.lease.fencing_token,
      now_ms: now + index * 1000,
    });
  }
  store.releaseLease({
    saga_id: sagaId,
    owner_id: owner,
    fencing_token: lease.lease.fencing_token,
    now_ms: now + 9000,
  });
  assert.equal(store.recover(sagaId).state.state, "receipt_confirmed");
  return { saga, saga_id: sagaId };
}

async function createFixture(
  label: string,
  sharedRequestDir?: string,
): Promise<Fixture> {
  const base = fs.mkdtempSync(
    path.join(os.tmpdir(), `void-terminal-closeout-${label}-`),
  );
  const root = path.join(base, "root");
  const requestDir = sharedRequestDir
    ? path.resolve(sharedRequestDir)
    : path.join(base, "requests");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });

  const requestId = `buyvoid_terminal_${label}_v1`;
  const delivery = `0x${label === "concurrent" ? "5" : "1".repeat(40)}`;
  const deliveryAddress = label === "concurrent"
    ? `0x${"5".repeat(40)}`
    : `0x${"1".repeat(40)}`;
  const paymentTx = `0x${label === "concurrent" ? "6" : "a".repeat(64)}`;
  const normalizedPaymentTx = label === "concurrent"
    ? `0x${"6".repeat(64)}`
    : `0x${"a".repeat(64)}`;
  const deliveryTx = label === "concurrent"
    ? `0x${"7".repeat(64)}`
    : `0x${"b".repeat(64)}`;
  void delivery;
  void paymentTx;

  for (const [name, value] of Object.entries(configuredEnv(requestDir))) {
    process.env[name] = value;
  }
  const parent = readBuyVoidCrashConsistentSagaServerPolicyV1();
  if (parent.ok !== true) throw new Error(parent.reason);

  const request: BuyVoidRequestV1 = {
    request_id: requestId,
    source_chain: "base",
    tx_hash: normalizedPaymentTx,
    delivery_address: deliveryAddress,
    receive_address: RECEIVE,
    usdc_amount: "25",
    quoted_void: "50",
  };
  const receipt: BuyVoidTransactionReceiptV2 = {
    status: 1,
    transactionHash: normalizedPaymentTx,
    blockNumber: 100,
    logs: [
      {
        address: USDC,
        topics: [TRANSFER_TOPIC, topic(deliveryAddress), topic(RECEIVE)],
        data: "0x17d7840",
        logIndex: 7,
        transactionHash: normalizedPaymentTx,
        blockNumber: 100,
        removed: false,
      },
    ],
  };
  const verified = buildBuyVoidVerifiedPaymentEventV2({
    request,
    receipt,
    policy: parent.policy.verification_policy,
  });
  if ("reason" in verified) throw new Error(verified.reason);
  const claimed = claimBuyVoidFulfillmentJournalV1({
    root_dir: root,
    request,
    verified_payment_event: verified.event,
    policy: parent.policy.fulfillment_policy,
    now_ms: Date.parse("2026-08-06T12:10:00.000Z"),
  });
  if ("reason" in claimed) throw new Error(claimed.reason);

  const inventory = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: claimed.intent,
    policy: parent.policy.inventory_policy,
    apply: true,
    now_ms: Date.parse("2026-08-06T12:10:01.000Z"),
  });
  if ("reason" in inventory) throw new Error(inventory.reason);

  const attempt = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: claimed.intent,
    policy: parent.policy.execution_policy,
    now_ms: Date.parse("2026-08-06T12:10:02.000Z"),
  });
  if ("reason" in attempt) throw new Error(attempt.reason);
  const attemptId = attempt.attempt.reservation.attempt_id;
  const amount = claimed.intent.claim.unsigned_instruction.void_amount_units;

  const prepared = prepareBuyVoidExecutionTransactionV1({
    root_dir: root,
    attempt_id: attemptId,
    intent: claimed.intent,
    policy: parent.policy.execution_policy,
    transaction: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      from_address: WALLET,
      to_address: deliveryAddress,
      amount_units: amount,
    },
    now_ms: Date.parse("2026-08-06T12:10:03.000Z"),
  });
  if ("reason" in prepared) throw new Error(prepared.reason);

  const broadcast = recordBuyVoidExecutionBroadcastV1({
    root_dir: root,
    attempt_id: attemptId,
    transaction_hash: deliveryTx,
    provider_submission_id: "terminal-proof-provider",
    now_ms: Date.parse("2026-08-06T12:10:04.000Z"),
  });
  if ("reason" in broadcast) throw new Error(broadcast.reason);

  const confirmation = confirmBuyVoidFulfillmentV1({
    intent: claimed.intent,
    observation: {
      chain_id: 2050,
      transaction_hash: deliveryTx,
      transaction_status: 1,
      block_number: 500,
      current_block_number: 505,
      from_address: WALLET,
      to_address: deliveryAddress,
      amount_units: amount,
    },
    policy: {
      chain_id: 2050,
      min_confirmations: 3,
      fulfillment_wallet_allowlist: [WALLET],
    },
  });
  if ("reason" in confirmation) throw new Error(confirmation.reason);
  const confirmedAttempt = recordBuyVoidExecutionConfirmedV1({
    root_dir: root,
    attempt_id: attemptId,
    confirmed_record: confirmation.record,
    now_ms: Date.parse("2026-08-06T12:10:05.000Z"),
  });
  if ("reason" in confirmedAttempt) throw new Error(confirmedAttempt.reason);

  const confirmedState = persistBuyVoidConfirmedStateV1({
    root_dir: root,
    intent: claimed.intent,
    confirmed_record: confirmation.record,
    now_ms: Date.parse("2026-08-06T12:10:06.000Z"),
  });
  if ("reason" in confirmedState) throw new Error(confirmedState.reason);

  writeJson(path.join(requestDir, `${requestId}.json`), {
    ...request,
    status: "payment_submitted_pending_manual_review",
  });
  const operatorJournal = path.join(
    requestDir,
    "operator-events.jsonl",
  );
  const initialOperatorEvent = {
    schema: "void_buy_void_operator_mark_v1",
    request_id: requestId,
    operator_status: "payment_verified",
    marked_at_ms: Date.parse("2026-08-06T12:10:07.000Z"),
    tx_hash: normalizedPaymentTx,
  };
  writeJsonLines(
    operatorJournal,
    [
      ...(sharedRequestDir ? readJsonLines(operatorJournal) : []),
      initialOperatorEvent,
    ],
  );

  const initialized = await initializeSaga({
    root,
    binding: {
      request_id: requestId,
      canonical_payment_identity:
        claimed.intent.claim.canonical_payment_identity,
      request_key_sha256: claimed.intent.request_key_sha256,
      payment_key_sha256: claimed.intent.payment_key_sha256,
      delivery_address: deliveryAddress,
      void_amount_units: amount,
      chain_id: "2050",
      pool_id: parent.policy.inventory_policy.pool_id,
    },
    claim_id: claimed.intent.claim.decision_fingerprint,
    instruction_id: claimed.intent.claim.instruction_id,
    reservation_id: inventory.reservation.reservation_id,
    attempt_id: attemptId,
    transaction_hash: deliveryTx,
    policy_id: parent.policy.saga_policy_id,
  });

  return {
    base,
    root,
    request_dir: requestDir,
    saga_id: initialized.saga_id,
    attempt_id: attemptId,
    reservation_id: inventory.reservation.reservation_id,
    confirmed_state_id: confirmedState.state.state_id,
    request_id: requestId,
    transaction_hash: deliveryTx,
    saga: initialized.saga,
  };
}

function applyInput(
  dry: any,
  fixture: Fixture,
): RunBuyVoidSagaTerminalCloseoutInputV1 {
  return {
    root_dir: fixture.root,
    saga_id: fixture.saga_id,
    apply: true,
    confirmation: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    policy_fingerprint_sha256:
      dry.required_policy_fingerprint_sha256,
    expected_plan_fingerprint_sha256:
      dry.required_plan_fingerprint_sha256,
    saga_confirmation: dry.required_saga_confirmation,
    saga_action_confirmation:
      dry.required_saga_action_confirmation,
  };
}

async function runChild(inputFile: string): Promise<void> {
  const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  const result = await runBuyVoidSagaTerminalCloseoutV1(input);
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    status: result.status,
    stage: "stage" in result ? result.stage : null,
    reason: "reason" in result ? result.reason : null,
  }));
}

function spawnChild(inputFile: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        fileURLToPath(import.meta.url),
        "--child",
        inputFile,
      ],
      { env: process.env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(`terminal child failed:${code}:${stderr}`));
        return;
      }
      resolve(JSON.parse(stdout));
    });
  });
}

async function main(): Promise<void> {
  if (process.argv[2] === "--child") {
    await runChild(process.argv[3]);
    return;
  }


  const artifactSource = fs.readFileSync(
    new URL(
      "../src/economic/buy_void_saga_terminal_closeout_artifacts_v1.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal(
    artifactSource.includes("function atomicReplaceJsonLines("),
    false,
  );
  assert.equal(
    artifactSource.includes(
      "function appendTerminalPublicJsonLineDurable(",
    ),
    true,
  );

  const fixture = await createFixture("crash");
  for (const [name, value] of Object.entries(configuredEnv(fixture.request_dir))) {
    process.env[name] = value;
  }
  let clock = Date.parse("2026-08-06T12:20:00.000Z");
  let fault: BuyVoidSagaTerminalCloseoutFaultStageV1 | null = null;
  const dependencies = {
    now_ms: () => (clock += 1000),
    fault_inject: (stage: BuyVoidSagaTerminalCloseoutFaultStageV1) => {
      if (fault === stage) {
        fault = null;
        throw new Error(`fault:${stage}`);
      }
    },
  };

  const dry = await runBuyVoidSagaTerminalCloseoutV1({
    root_dir: fixture.root,
    saga_id: fixture.saga_id,
    dependencies,
  });
  assert.equal(dry.ok, true);
  if (dry.ok !== true || dry.status !== "dry_run") {
    throw new Error("terminal closeout dry run failed");
  }
  assert.equal(dry.plan.canonical_confirmed_state_id, fixture.confirmed_state_id);
  assert.equal(
    dry.plan.public_closeout_event.canonical_confirmed_state_id,
    fixture.confirmed_state_id,
  );
  assert.equal(
    dry.plan.inventory_consumption.canonical_confirmed_state_id,
    fixture.confirmed_state_id,
  );
  assert.equal(
    dry.required_plan_fingerprint_sha256,
    dry.plan.plan_fingerprint_sha256,
  );

  const wrongPlanBinding = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(dry, fixture),
    expected_plan_fingerprint_sha256: "0".repeat(64),
    dependencies,
  });
  assert.equal(wrongPlanBinding.ok, false);
  if (wrongPlanBinding.ok !== false) {
    throw new Error("expected terminal plan fingerprint hold");
  }
  assert.equal(wrongPlanBinding.stage, "closeout_plan");
  assert.equal(
    wrongPlanBinding.reason,
    "terminal_closeout_plan_fingerprint_mismatch",
  );
  assert.equal(wrongPlanBinding.mutation_performed, false);
  assert.equal(wrongPlanBinding.inventory_consumption_performed, false);
  assert.equal(wrongPlanBinding.public_request_fulfilled, false);
  assert.equal(wrongPlanBinding.saga_closeout_appended, false);
  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 0);

  let innerPlanCalls = 0;
  const innerPlanDrift = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(dry, fixture),
    dependencies: {
      ...dependencies,
      plan_closeout: (input: any) => {
        innerPlanCalls += 1;
        const planner = requireConfirmedCloseoutPlanner(input);
        if (
          planner.ok === true &&
          innerPlanCalls >= 2
        ) {
          return {
            ...planner,
            plan: {
              ...planner.plan,
              terminal_plan_binding_drift_probe: "inner-reconstruction",
            },
          };
        }
        return planner;
      },
    },
  });
  assert.equal(innerPlanDrift.ok, false);
  if (innerPlanDrift.ok !== false) {
    throw new Error("expected inner terminal plan drift hold");
  }
  assert.equal(innerPlanDrift.stage, "closeout_plan");
  assert.equal(
    innerPlanDrift.reason,
    "terminal_closeout_plan_changed_during_apply",
  );
  assert.equal(innerPlanDrift.mutation_performed, false);
  assert.equal(innerPlanDrift.inventory_consumption_performed, false);
  assert.equal(innerPlanDrift.public_request_fulfilled, false);
  assert.equal(innerPlanDrift.saga_closeout_appended, false);
  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 0);
  assert.equal(
    readJsonLines(path.join(fixture.request_dir, "operator-events.jsonl"))
      .filter((row) => row.operator_status === "fulfilled").length,
    0,
  );

  const confirmedPaths = buyVoidConfirmedStateJournalPathsV1(fixture.root);
  const completion = path.join(
    confirmedPaths.complete_dir,
    `${fixture.confirmed_state_id}.json`,
  );
  const hiddenCompletion = `${completion}.hidden`;
  fs.renameSync(completion, hiddenCompletion);
  const withoutCompletion = await runBuyVoidSagaTerminalCloseoutV1({
    root_dir: fixture.root,
    saga_id: fixture.saga_id,
    dependencies,
  });
  assert.equal(withoutCompletion.ok, false);
  fs.renameSync(hiddenCompletion, completion);

  fault = "after_plan_before_inventory";
  const afterPlan = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(dry, fixture),
    dependencies,
  });
  assert.equal(afterPlan.ok, false);
  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 0);
  assert.equal(
    readJsonLines(path.join(fixture.request_dir, "operator-events.jsonl"))
      .filter((row) => row.operator_status === "fulfilled").length,
    0,
  );

  fault = "after_inventory_before_public";
  const afterInventory = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(dry, fixture),
    dependencies,
  });
  assert.equal(afterInventory.ok, false);
  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 1);
  assert.equal(
    readJsonLines(path.join(fixture.request_dir, "operator-events.jsonl"))
      .filter((row) => row.operator_status === "fulfilled").length,
    0,
  );

  fault = "after_public_before_saga";
  const afterPublic = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(dry, fixture),
    dependencies,
  });
  assert.equal(afterPublic.ok, false);
  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 1);
  let fulfilledRows = readJsonLines(
    path.join(fixture.request_dir, "operator-events.jsonl"),
  ).filter((row) => row.operator_status === "fulfilled");
  assert.equal(fulfilledRows.length, 1);
  assert.equal(
    fulfilledRows[0].canonical_confirmed_state_id,
    fixture.confirmed_state_id,
  );
  assert.equal(
    fixture.saga
      .createFilesystemSagaStoreV1(
        path.join(
          fixture.root,
          "buy-void-crash-consistent-saga-runtime-v1",
        ),
      )
      .recover(fixture.saga_id)
      .state.state,
    "receipt_confirmed",
  );

  const completed = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(dry, fixture),
    dependencies,
  });
  assert.equal(completed.ok, true);
  if (completed.ok !== true) {
    throw new Error("terminal closeout completion held");
  }
  assert.equal(completed.status, "recovered_partial");
  assert.equal(completed.saga_state.state, "closed");
  assert.equal(completed.saga_state.closeout_id, dry.closeout_id);
  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 1);
  fulfilledRows = readJsonLines(
    path.join(fixture.request_dir, "operator-events.jsonl"),
  ).filter((row) => row.operator_status === "fulfilled");
  assert.equal(fulfilledRows.length, 1);

  const consumption = listBuyVoidInventoryConsumptionsV1(fixture.root)[0] as any;
  assert.equal(consumption.canonical_confirmed_state_id, fixture.confirmed_state_id);
  assert.equal(consumption.closeout_id, dry.closeout_id);
  assert.equal(
    fulfilledRows[0].canonical_confirmed_state_fingerprint,
    dry.plan.canonical_confirmed_state_fingerprint,
  );
  assert.equal(fulfilledRows[0].closeout_id, dry.closeout_id);

  const replay = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(dry, fixture),
    dependencies,
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.status, "duplicate");
  assert.equal(listBuyVoidInventoryConsumptionsV1(fixture.root).length, 1);
  assert.equal(
    readJsonLines(path.join(fixture.request_dir, "operator-events.jsonl"))
      .filter((row) => row.operator_status === "fulfilled").length,
    1,
  );

  const postAppend = await createFixture("post_append_mismatch");
  for (const [name, value] of Object.entries(
    configuredEnv(postAppend.request_dir),
  )) {
    process.env[name] = value;
  }
  const postAppendDry = await runBuyVoidSagaTerminalCloseoutV1({
    root_dir: postAppend.root,
    saga_id: postAppend.saga_id,
  });
  assert.equal(postAppendDry.ok, true);
  if (
    postAppendDry.ok !== true ||
    postAppendDry.status !== "dry_run"
  ) {
    throw new Error("post-append mismatch dry run failed");
  }
  let closeoutAppendObserved = false;
  const realSaga = postAppend.saga;
  const wrappedSaga: any = {
    ...realSaga,
    createFilesystemSagaStoreV1(rootDir: string) {
      const store = realSaga.createFilesystemSagaStoreV1(rootDir);
      return {
        ...store,
        appendEvent(input: any) {
          const updated = store.appendEvent(input);
          if (input?.event?.event_type === "closeout_committed") {
            closeoutAppendObserved = true;
          }
          return updated;
        },
        recover(sagaId: string) {
          const record = store.recover(sagaId);
          if (
            closeoutAppendObserved &&
            record?.state?.state === "closed"
          ) {
            return {
              ...record,
              state: {
                ...record.state,
                closeout_id: "f".repeat(64),
              },
            };
          }
          return record;
        },
      };
    },
  };
  const postAppendMismatch = await runBuyVoidSagaTerminalCloseoutV1({
    ...applyInput(postAppendDry, postAppend),
    dependencies: {
      load_saga_module: async () => wrappedSaga,
    },
  });
  assert.equal(postAppendMismatch.ok, false);
  if (postAppendMismatch.ok !== false) {
    throw new Error("expected post-append verification hold");
  }
  assert.equal(postAppendMismatch.stage, "saga_append");
  assert.equal(
    postAppendMismatch.reason,
    "terminal_closeout_final_saga_mismatch",
  );
  assert.equal(postAppendMismatch.mutation_performed, true);
  assert.equal(postAppendMismatch.inventory_consumption_performed, true);
  assert.equal(postAppendMismatch.public_request_fulfilled, true);
  assert.equal(postAppendMismatch.saga_closeout_appended, true);
  assert.equal(postAppendMismatch.automatic_retry_allowed, false);
  assert.equal(closeoutAppendObserved, true);
  const durablePostAppend = realSaga
    .createFilesystemSagaStoreV1(
      path.join(
        postAppend.root,
        "buy-void-crash-consistent-saga-runtime-v1",
      ),
    )
    .recover(postAppend.saga_id);
  assert.equal(durablePostAppend.state.state, "closed");
  assert.equal(
    durablePostAppend.state.closeout_id,
    postAppendDry.closeout_id,
  );
  assert.equal(
    durablePostAppend.events.filter(
      (event: any) => event.event_type === "closeout_committed",
    ).length,
    1,
  );

  const concurrent = await createFixture("concurrent");
  for (const [name, value] of Object.entries(configuredEnv(concurrent.request_dir))) {
    process.env[name] = value;
  }
  const concurrentDry = await runBuyVoidSagaTerminalCloseoutV1({
    root_dir: concurrent.root,
    saga_id: concurrent.saga_id,
  });
  assert.equal(concurrentDry.ok, true);
  if (concurrentDry.ok !== true || concurrentDry.status !== "dry_run") {
    throw new Error("concurrent terminal closeout dry run failed");
  }
  const childInput = path.join(concurrent.base, "apply.json");
  writeJson(childInput, applyInput(concurrentDry, concurrent));
  const childResults = await Promise.all([
    spawnChild(childInput),
    spawnChild(childInput),
  ]);
  assert.equal(
    childResults.some((result) => result.ok === true),
    true,
  );
  assert.equal(listBuyVoidInventoryConsumptionsV1(concurrent.root).length, 1);
  assert.equal(
    readJsonLines(path.join(concurrent.request_dir, "operator-events.jsonl"))
      .filter((row) => row.operator_status === "fulfilled").length,
    1,
  );
  const concurrentSaga = concurrent.saga
    .createFilesystemSagaStoreV1(
      path.join(
        concurrent.root,
        "buy-void-crash-consistent-saga-runtime-v1",
      ),
    )
    .recover(concurrent.saga_id);
  assert.equal(concurrentSaga.state.state, "closed");
  assert.equal(
    concurrentSaga.events.filter(
      (event: any) => event.event_type === "closeout_committed",
    ).length,
    1,
  );


  const crossBase = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-terminal-closeout-cross-request-"),
  );
  const sharedRequestDir = path.join(crossBase, "requests");
  fs.mkdirSync(sharedRequestDir, {
    recursive: true,
    mode: 0o700,
  });
  const crossA = await createFixture("cross_a", sharedRequestDir);
  const crossB = await createFixture("cross_b", sharedRequestDir);
  for (const [name, value] of Object.entries(
    configuredEnv(sharedRequestDir),
  )) {
    process.env[name] = value;
  }
  const crossDryA = await runBuyVoidSagaTerminalCloseoutV1({
    root_dir: crossA.root,
    saga_id: crossA.saga_id,
  });
  const crossDryB = await runBuyVoidSagaTerminalCloseoutV1({
    root_dir: crossB.root,
    saga_id: crossB.saga_id,
  });
  assert.equal(crossDryA.ok, true);
  assert.equal(crossDryB.ok, true);
  if (
    crossDryA.ok !== true ||
    crossDryA.status !== "dry_run" ||
    crossDryB.ok !== true ||
    crossDryB.status !== "dry_run"
  ) {
    throw new Error("cross-request terminal closeout dry run failed");
  }
  const crossInputA = path.join(crossBase, "apply-a.json");
  const crossInputB = path.join(crossBase, "apply-b.json");
  writeJson(crossInputA, applyInput(crossDryA, crossA));
  writeJson(crossInputB, applyInput(crossDryB, crossB));
  const crossResults = await Promise.all([
    spawnChild(crossInputA),
    spawnChild(crossInputB),
  ]);
  assert.equal(
    crossResults.every((result) => result.ok === true),
    true,
  );
  const crossFulfilled = readJsonLines(
    path.join(sharedRequestDir, "operator-events.jsonl"),
  ).filter((row) => row.operator_status === "fulfilled");
  assert.equal(crossFulfilled.length, 2);
  assert.deepEqual(
    crossFulfilled
      .map((row) => String(row.request_id))
      .sort(),
    [crossA.request_id, crossB.request_id].sort(),
  );
  assert.equal(
    listBuyVoidInventoryConsumptionsV1(crossA.root).length,
    1,
  );
  assert.equal(
    listBuyVoidInventoryConsumptionsV1(crossB.root).length,
    1,
  );
  for (const value of [crossA, crossB]) {
    const closed = value.saga
      .createFilesystemSagaStoreV1(
        path.join(
          value.root,
          "buy-void-crash-consistent-saga-runtime-v1",
        ),
      )
      .recover(value.saga_id);
    assert.equal(closed.state.state, "closed");
    assert.equal(
      closed.events.filter(
        (event: any) => event.event_type === "closeout_committed",
      ).length,
      1,
    );
  }

  assert.equal(listBuyVoidExecutionAttemptsV1(fixture.root).length, 1);
  fs.rmSync(fixture.base, { recursive: true, force: true });
  fs.rmSync(postAppend.base, { recursive: true, force: true });
  fs.rmSync(concurrent.base, { recursive: true, force: true });
  fs.rmSync(crossA.base, { recursive: true, force: true });
  fs.rmSync(crossB.base, { recursive: true, force: true });
  fs.rmSync(crossBase, { recursive: true, force: true });

  process.stdout.write(`${MARKER}\n`);
  process.stdout.write("canonical_confirmed_state_required=true\n");
  process.stdout.write("canonical_state_id_bound_to_inventory=true\n");
  process.stdout.write("canonical_state_id_bound_to_public_event=true\n");
  process.stdout.write("crash_after_plan_recovered=true\n");
  process.stdout.write("crash_after_inventory_recovered=true\n");
  process.stdout.write("crash_after_public_recovered=true\n");
  process.stdout.write("inventory_consumption_count=1\n");
  process.stdout.write("public_fulfilled_event_count=1\n");
  process.stdout.write("saga_closeout_event_count=1\n");
  process.stdout.write("terminal_plan_fingerprint_bound_before_mutation=true\n");
  process.stdout.write("terminal_plan_inner_reconstruction_drift_blocked=true\n");
  process.stdout.write("post_append_verification_mismatch_saga_append_truth=true\n");
  process.stdout.write("post_append_verification_mismatch_automatic_retry=false\n");
  process.stdout.write("concurrent_process_closeout_unique=true\n");
  process.stdout.write("public_operator_event_append_only=true\n");
  process.stdout.write("shared_operator_journal_atomic_replace=false\n");
  process.stdout.write("cross_request_concurrent_closeout_preserved=2\n");
  process.stdout.write("public_request_base_record_mutation=false\n");
  process.stdout.write("reservation_base_record_mutation=false\n");
  process.stdout.write("wallet_access=false\n");
  process.stdout.write("signing=false\n");
  process.stdout.write("transaction_broadcast=false\n");
  process.stdout.write("money_movement=false\n");
}

main().catch((error) => {
  process.stderr.write(`${String((error as Error)?.stack || error)}\n`);
  process.exitCode = 1;
});
