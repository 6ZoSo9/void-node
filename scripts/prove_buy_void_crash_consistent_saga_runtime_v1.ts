import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1,
  handleBuyVoidCrashConsistentSagaRuntimeCommandV1,
} from "../src/economic/buy_void_crash_consistent_saga_runtime_v1.js";
import {
  reserveBuyVoidInventoryV1,
  listBuyVoidInventoryReservationsV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  reserveBuyVoidExecutionAttemptV1,
  listBuyVoidExecutionAttemptsV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";

const MARKER = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1";
const REQUEST_ID = "buyvoid-saga-runtime-proof-v1";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const PAYMENT_TX = `0x${"5".repeat(64)}`;
const PAYMENT_ID = `voidpay1:ethereum:${PAYMENT_TX}:0`;
const VOID_UNITS = "2500000";
const POOL_ID = "void-fixed-price-pool-v1";

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function requestKey(): string {
  return digest(`void-buy-request-v1\n${REQUEST_ID}`);
}
function paymentKey(): string {
  return digest(`void-buy-payment-v1\n${PAYMENT_ID}`);
}
function durableJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const fd = fs.openSync(temp, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, file);
}
function intent(nowMs: number): Record<string, any> {
  const instructionId = `voidbuyinst1_${digest(REQUEST_ID)}`;
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: nowMs,
    payment_key_sha256: paymentKey(),
    request_key_sha256: requestKey(),
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: PAYMENT_ID,
      canonical_payment_identity_sha256: digest(PAYMENT_ID),
      request_id: REQUEST_ID,
      decision_fingerprint: digest(`${REQUEST_ID}\n${PAYMENT_ID}\n${instructionId}`),
      instruction_id: instructionId,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: instructionId,
        request_id: REQUEST_ID,
        canonical_payment_identity: PAYMENT_ID,
        source_chain: "ethereum",
        payment_transaction_hash: PAYMENT_TX,
        payment_log_index: "0",
        confirmed_block_number: "123456",
        confirmation_count: "20",
        payment_usdc_units: "1250000",
        delivery_address: DELIVERY,
        void_amount_units: VOID_UNITS,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      status: "claimed",
    },
    verification_binding: {
      source_chain: "ethereum",
      payment_transaction_hash: PAYMENT_TX,
      payment_log_index: "0",
      confirmed_block_number: "123456",
      confirmation_count_at_claim: "20",
      usdc_contract: "0x6666666666666666666666666666666666666666",
      payer_address: "0x7777777777777777777777777777777777777777",
      receive_address: "0x8888888888888888888888888888888888888888",
      delivery_address: DELIVERY,
      payment_usdc_units: "1250000",
      requested_usdc_units: "1250000",
      quoted_void_units: VOID_UNITS,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}
function readJson(file: string): any | null {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}
type Captured = { code: number; body: Record<string, any> };
async function invoke(input: {
  root: string;
  requestDir: string;
  body: Record<string, unknown>;
  dependencies: Record<string, any>;
  remote?: string;
}): Promise<Captured> {
  let code = 200;
  let body: Record<string, any> = {};
  const response = {
    status(value: number) { code = value; return this; },
    json(value: Record<string, any>) { body = value; return value; },
  };
  await handleBuyVoidCrashConsistentSagaRuntimeCommandV1(
    { socket: { remoteAddress: input.remote || "127.0.0.1" }, body: input.body },
    response,
    {
      root_dir: input.root,
      request_dir: input.requestDir,
      dependencies: input.dependencies,
    },
  );
  return { code, body };
}
function applyFrom(dry: Captured, stage?: Record<string, unknown>): Record<string, unknown> {
  return {
    action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
    request_id: REQUEST_ID,
    ...(stage ? { stage_command: stage } : {}),
    apply: true,
    confirmation: dry.body.required_runtime_confirmation,
    saga_confirmation: dry.body.required_saga_confirmation,
    action_confirmation: dry.body.required_action_confirmation,
    ...(dry.body.required_delegated_confirmation
      ? { delegated_confirmation: dry.body.required_delegated_confirmation }
      : {}),
  };
}
function assertNoMoney(body: Record<string, any>): void {
  for (const key of [
    "inventory_decrement_performed",
    "wallet_access_performed",
    "signing_performed",
    "transaction_broadcast_performed",
    "public_fulfilled_closeout_performed",
    "money_movement_performed",
  ]) assert.equal(body[key], false, key);
}

async function main(): Promise<void> {
  const parent = fs.readFileSync("src/economic/buy_void_runtime_integration_v1.ts", "utf8");
  const source = fs.readFileSync(
    "src/economic/buy_void_crash_consistent_saga_runtime_v1.ts",
    "utf8",
  );
  for (const marker of [
    "handleBuyVoidCrashConsistentSagaRuntimeCommandV1",
    "buyVoidCrashConsistentSagaRuntimeStatusV1",
    "crash_consistent_saga_runtime",
  ]) assert.ok(parent.includes(marker), marker);
  for (const marker of [
    "createFilesystemSagaStoreV1",
    "runSagaSupervisorTickV1",
    "restart_reconciliation_before_retry",
    "attempt_without_inventory_reservation",
    "next_stage_outside_non_money_runtime_boundary",
  ]) assert.ok(source.includes(marker), marker);
  for (const forbidden of [
    "prepare_transaction:",
    "execute_prepared_transaction:",
    "reconcile_possible_broadcast:",
    "closeout_confirmed_delivery:",
  ]) assert.equal(source.includes(forbidden), false, forbidden);

  const saved = new Map<string, string | undefined>();
  const env = [
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED",
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION",
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS",
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS",
  ];
  for (const name of env) { saved.set(name, process.env[name]); delete process.env[name]; }

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-saga-runtime-"));
  const root = path.join(base, "root");
  const requestDir = path.join(base, "requests");
  const claimFile = path.join(base, "claim.json");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  durableJson(path.join(requestDir, `${REQUEST_ID}.json`), {
    request_id: REQUEST_ID,
    status: "payment_verified",
    source_chain: "ethereum",
    tx_hash: PAYMENT_TX,
    delivery_address: DELIVERY,
    receive_address: "0x8888888888888888888888888888888888888888",
    usdc_amount: "1.25",
    quoted_void: "2.5",
  });

  let clock = Date.parse("2026-08-06T06:42:00.000Z");
  let claimCalls = 0;
  let inventoryCalls = 0;
  let attemptCalls = 0;
  let failClaim = true;
  let failInventory = true;
  let failAttempt = true;
  let duplicateClaims = false;
  let conflictingAttempt = false;
  const executionPolicy = {
    attempt_journal_enabled: true,
    max_attempts_per_payment: 1,
    chain_id: "2050",
    fulfillment_wallet_allowlist: [WALLET],
  };
  const preview = intent(clock);

  const deps = {
    derive_snapshot: () => ({
      status: "ready",
      snapshot: { request_id: REQUEST_ID, status: "payment_verified" },
      evidence: { source: "real_direct_request_file" },
    }),
    list_claims: () => {
      const current = readJson(claimFile);
      if (!current) return [];
      if (!duplicateClaims) return [current];
      const conflict = structuredClone(current);
      conflict.claim.instruction_id += "-conflict";
      return [current, conflict];
    },
    list_inventory: (input: any) => listBuyVoidInventoryReservationsV1(input),
    list_attempts: () => {
      const values = listBuyVoidExecutionAttemptsV1(root);
      if (!conflictingAttempt || values.length === 0) return values;
      const conflict = structuredClone(values[0]);
      conflict.reservation.payment_key_sha256 = "9".repeat(64);
      return [conflict];
    },
    reserve_inventory: async (input: any) => {
      inventoryCalls += 1;
      const result = reserveBuyVoidInventoryV1(input);
      assert.equal(result.ok, true);
      if (failInventory) { failInventory = false; throw new Error("injected_after_inventory_write"); }
      return result;
    },
    run_pipeline_command: async (command: Record<string, any>) => {
      if (command.action === "verify_and_claim" && command.apply !== true) {
        return {
          ok: true,
          status: "dry_run",
          preview: { decision: { ok: true, claim: preview.claim } },
        };
      }
      if (command.action === "verify_and_claim") {
        claimCalls += 1;
        durableJson(claimFile, intent(command.now_ms));
        if (failClaim) { failClaim = false; throw new Error("injected_after_claim_write"); }
        return { ok: true, status: "applied" };
      }
      if (command.action === "reserve_execution") {
        attemptCalls += 1;
        const result = reserveBuyVoidExecutionAttemptV1({
          root_dir: root,
          intent: command.intent,
          policy: command.execution_policy,
          now_ms: command.now_ms,
        });
        assert.equal(result.ok, true);
        if (failAttempt) { failAttempt = false; throw new Error("injected_after_attempt_write"); }
        return { ok: true, status: "applied" };
      }
      throw new Error(`unexpected_pipeline_action:${command.action}`);
    },
    now_ms: () => (clock += 1000),
  };

  const disabled = await invoke({
    root,
    requestDir,
    body: { action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1, request_id: REQUEST_ID },
    dependencies: deps,
  });
  assert.equal(disabled.code, 503);

  process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED = "1";
  process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION = "proof-policy-v1";
  process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS = "10000000";
  process.env.VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS = "5000000";

  const remote = await invoke({
    root,
    requestDir,
    remote: "203.0.113.7",
    body: { action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1, request_id: REQUEST_ID },
    dependencies: deps,
  });
  assert.equal(remote.code, 403);
  const secret = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
      private_key: "forbidden",
    },
    dependencies: deps,
  });
  assert.equal(secret.code, 400);
  assert.equal(secret.body.error, "caller_supplied_execution_material_forbidden");

  const claimStage = {
    receipt: { proof: "bounded" },
    verification_policy: { proof: "bounded" },
    fulfillment_policy: { proof: "bounded" },
  };
  const dryClaim = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
      stage_command: claimStage,
    },
    dependencies: deps,
  });
  assert.equal(dryClaim.body.next_action, "claim_payment");
  assert.equal(fs.existsSync(path.join(root, "buy-void-crash-consistent-saga-runtime-v1")), false);
  const failedClaim = await invoke({
    root,
    requestDir,
    body: applyFrom(dryClaim, claimStage),
    dependencies: deps,
  });
  assert.match(failedClaim.body.reason, /injected_after_claim_write/);
  assert.equal(claimCalls, 1);
  const recoveredClaim = await invoke({
    root,
    requestDir,
    body: applyFrom(dryClaim, claimStage),
    dependencies: deps,
  });
  assert.equal(recoveredClaim.code, 200);
  assert.equal(claimCalls, 1);
  assertNoMoney(recoveredClaim.body);

  const dryInventory = await invoke({
    root,
    requestDir,
    body: { action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1, request_id: REQUEST_ID },
    dependencies: deps,
  });
  assert.equal(dryInventory.body.next_action, "reserve_inventory");
  const failedInventory = await invoke({
    root,
    requestDir,
    body: applyFrom(dryInventory),
    dependencies: deps,
  });
  assert.match(failedInventory.body.reason, /injected_after_inventory_write/);
  assert.equal(inventoryCalls, 1);
  const recoveredInventory = await invoke({
    root,
    requestDir,
    body: applyFrom(dryInventory),
    dependencies: deps,
  });
  assert.equal(recoveredInventory.code, 200);
  assert.equal(inventoryCalls, 1);
  assertNoMoney(recoveredInventory.body);

  const attemptStage = { execution_policy: executionPolicy };
  const dryAttempt = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
      stage_command: attemptStage,
    },
    dependencies: deps,
  });
  assert.equal(dryAttempt.body.next_action, "reserve_execution_attempt");
  const failedAttempt = await invoke({
    root,
    requestDir,
    body: applyFrom(dryAttempt, attemptStage),
    dependencies: deps,
  });
  assert.match(failedAttempt.body.reason, /injected_after_attempt_write/);
  assert.equal(attemptCalls, 1);
  const recoveredAttempt = await invoke({
    root,
    requestDir,
    body: applyFrom(dryAttempt, attemptStage),
    dependencies: deps,
  });
  assert.equal(recoveredAttempt.code, 200);
  assert.equal(attemptCalls, 1);
  assertNoMoney(recoveredAttempt.body);

  const saga: any = await import(
    new URL("../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs", import.meta.url).href,
  );
  const binding = saga.validateSagaBindingV1({
    request_id: REQUEST_ID,
    canonical_payment_identity: PAYMENT_ID,
    request_key_sha256: requestKey(),
    payment_key_sha256: paymentKey(),
    delivery_address: DELIVERY,
    void_amount_units: VOID_UNITS,
    chain_id: "2050",
    pool_id: POOL_ID,
  });
  const sagaId = saga.computeSagaIdV1(binding);
  const store = saga.createFilesystemSagaStoreV1(
    path.join(root, "buy-void-crash-consistent-saga-runtime-v1"),
  );
  const record = store.recover(sagaId);
  assert.deepEqual(
    record.events.map((event: any) => event.event_type),
    ["saga_initialized", "claim_committed", "inventory_reserved", "attempt_reserved"],
  );
  for (let index = 1; index < record.events.length; index += 1) {
    assert.ok(record.events[index].fencing_token > record.events[index - 1].fencing_token);
  }
  const count = record.state.event_count;

  duplicateClaims = true;
  const claimConflict = await invoke({
    root,
    requestDir,
    body: { action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1, request_id: REQUEST_ID },
    dependencies: deps,
  });
  assert.equal(claimConflict.code, 409);
  assert.match(claimConflict.body.reason, /multiple_claim_records/);
  duplicateClaims = false;
  conflictingAttempt = true;
  const attemptConflict = await invoke({
    root,
    requestDir,
    body: { action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1, request_id: REQUEST_ID },
    dependencies: deps,
  });
  assert.equal(attemptConflict.code, 409);
  assert.match(attemptConflict.body.reason, /attempt_binding_conflict/);
  conflictingAttempt = false;
  assert.equal(store.recover(sagaId).state.event_count, count);

  const requestFile = path.join(requestDir, `${REQUEST_ID}.json`);
  const backup = fs.readFileSync(requestFile);
  fs.rmSync(requestFile);
  fs.symlinkSync(path.join(base, "outside.json"), requestFile);
  const symlinked = await invoke({
    root,
    requestDir,
    body: { action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1, request_id: REQUEST_ID },
    dependencies: deps,
  });
  assert.equal(symlinked.code, 503);
  assert.match(symlinked.body.reason, /request_direct_regular_file_required/);
  fs.rmSync(requestFile);
  fs.writeFileSync(requestFile, Buffer.alloc(4 * 1024 * 1024 + 1, 0x20));
  const oversized = await invoke({
    root,
    requestDir,
    body: { action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1, request_id: REQUEST_ID },
    dependencies: deps,
  });
  assert.equal(oversized.code, 422);
  assert.match(oversized.body.reason, /request_size_out_of_range/);
  fs.writeFileSync(requestFile, backup);
  assert.equal(store.recover(sagaId).state.event_count, count);

  assert.deepEqual(VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1, {
    operator_loopback_only: true,
    disabled_by_default: true,
    server_controlled_root_dir: true,
    server_controlled_request_dir: true,
    server_derived_request_snapshot: true,
    server_controlled_inventory_policy: true,
    caller_supplied_binding_forbidden: true,
    caller_supplied_intent_forbidden: true,
    one_request_per_invocation: true,
    one_business_stage_per_invocation: true,
    per_request_lease_required: true,
    monotonically_increasing_fencing_token_required: true,
    restart_reconciliation_before_retry: true,
    non_money_stage_count: 3,
    claim_write_possible: true,
    inventory_reservation_possible: true,
    execution_attempt_reservation_possible: true,
    transaction_preparation_mounted: false,
    inventory_decrement: false,
    public_fulfilled_closeout: false,
    background_loop: false,
    startup_execution: false,
    rpc_call: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  });

  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  fs.rmSync(base, { recursive: true, force: true });
  console.log(`${MARKER}_PROOF_GREEN`);
  console.log("claim_restart_duplicate_write=0");
  console.log("inventory_restart_duplicate_write=0");
  console.log("attempt_restart_duplicate_write=0");
  console.log("wallet_signing_broadcast_money=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
