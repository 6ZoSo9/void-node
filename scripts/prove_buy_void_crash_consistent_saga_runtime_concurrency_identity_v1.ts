import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
  handleBuyVoidCrashConsistentSagaRuntimeCommandV1,
} from "../src/economic/buy_void_crash_consistent_saga_runtime_v1.js";
import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

const MARKER =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONCURRENCY_IDENTITY_V1";
const ENABLE_ENV = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED";
const REQUEST_ID = "buyvoid-saga-concurrency-v1";
const OTHER_REQUEST_ID = "buyvoid-saga-concurrency-other-v1";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const USDC = "0x6666666666666666666666666666666666666666";
const PAYER = "0x7777777777777777777777777777777777777777";
const RECEIVE = "0x8888888888888888888888888888888888888888";
const PAYMENT_TX = `0x${"5".repeat(64)}`;
const PAYMENT_ID = `voidpay1:ethereum:${PAYMENT_TX}:0`;
const VOID_UNITS = "2500000";
const POOL_ID = "buy-void-presale-v1";
const RECEIPT = { proof: "concurrency-identity-v1" };

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function requestKey(requestId: string): string {
  return digest(`void-buy-request-v1\n${requestId}`);
}

function paymentKey(paymentIdentity = PAYMENT_ID): string {
  return digest(`void-buy-payment-v1\n${paymentIdentity}`);
}

function makeClaim(
  requestId = REQUEST_ID,
  paymentIdentity = PAYMENT_ID,
): Record<string, any> {
  const instructionId = `voidbuyinst1_${digest(requestId)}`;
  return {
    schema: "void_buy_void_fulfillment_claim_v1",
    marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
    canonical_payment_identity: paymentIdentity,
    canonical_payment_identity_sha256: digest(paymentIdentity),
    request_id: requestId,
    decision_fingerprint: digest(
      `${requestId}\n${paymentIdentity}\n${instructionId}`,
    ),
    instruction_id: instructionId,
    unsigned_instruction: {
      schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      instruction_id: instructionId,
      request_id: requestId,
      canonical_payment_identity: paymentIdentity,
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
  };
}

function makeIntent(
  requestId = REQUEST_ID,
  paymentIdentity = PAYMENT_ID,
): Record<string, any> {
  const claim = makeClaim(requestId, paymentIdentity);
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: Date.parse("2026-08-06T09:45:00.000Z"),
    payment_key_sha256: paymentKey(paymentIdentity),
    request_key_sha256: requestKey(requestId),
    claim,
    verification_binding: {
      source_chain: "ethereum",
      payment_transaction_hash: PAYMENT_TX,
      payment_log_index: "0",
      confirmed_block_number: "123456",
      confirmation_count_at_claim: "20",
      usdc_contract: USDC,
      payer_address: PAYER,
      receive_address: RECEIVE,
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

function makeInventory(
  requestId = REQUEST_ID,
  paymentIdentity = PAYMENT_ID,
): Record<string, any> {
  return {
    request_id: requestId,
    canonical_payment_identity: paymentIdentity,
    request_key_sha256: requestKey(requestId),
    payment_key_sha256: paymentKey(paymentIdentity),
    reservation_id: digest(`reservation:${requestId}`),
    delivery_address: DELIVERY,
    reserved_void_units: VOID_UNITS,
    pool_id: POOL_ID,
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "10000000000000",
  };
}

function makeAttempt(
  requestId = REQUEST_ID,
  paymentIdentity = PAYMENT_ID,
): Record<string, any> {
  const claim = makeClaim(requestId, paymentIdentity);
  return {
    reservation: {
      request_id: requestId,
      canonical_payment_identity: paymentIdentity,
      request_key_sha256: requestKey(requestId),
      payment_key_sha256: paymentKey(paymentIdentity),
      attempt_id: digest(`attempt:${requestId}`),
      attempt_number: 1,
      max_attempts_per_payment: 1,
      unsigned_instruction: claim.unsigned_instruction,
    },
  };
}

type Captured = { code: number; body: Record<string, any> };

async function invoke(input: {
  root: string;
  requestDir: string;
  body: Record<string, unknown>;
  dependencies: Record<string, any>;
}): Promise<Captured> {
  let code = 200;
  let body: Record<string, any> = {};
  const response = {
    status(value: number) {
      code = value;
      return this;
    },
    json(value: Record<string, any>) {
      body = value;
      return value;
    },
  };
  await handleBuyVoidCrashConsistentSagaRuntimeCommandV1(
    { socket: { remoteAddress: "127.0.0.1" }, body: input.body },
    response,
    {
      root_dir: input.root,
      request_dir: input.requestDir,
      dependencies: input.dependencies,
    },
  );
  return { code, body };
}

function writeRequest(requestDir: string, requestId = REQUEST_ID): void {
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(requestDir, `${requestId}.json`),
    `${JSON.stringify({ request_id: requestId })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

function applyFrom(dry: Captured): Record<string, unknown> {
  return {
    action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
    request_id: REQUEST_ID,
    stage_command: { receipt: RECEIPT },
    apply: true,
    confirmation: dry.body.required_runtime_confirmation,
    saga_confirmation: dry.body.required_saga_confirmation,
    action_confirmation: dry.body.required_action_confirmation,
    delegated_confirmation: dry.body.required_delegated_confirmation,
    policy_fingerprint_sha256:
      dry.body.required_policy_fingerprint_sha256,
  };
}

function policyValues(): Record<string, string> {
  return {
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_chain]:
      "ethereum",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_usdc_contract]:
      USDC,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_receive_address]:
      RECEIVE,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_current_block_number]:
      "123475",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_min_confirmations]:
      "12",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_numerator]:
      "2",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_denominator]:
      "1",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.inventory_policy_version]:
      "presale-v1",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_id]:
      POOL_ID,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_capacity_void_units]:
      "10000000000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.max_reservation_void_units]:
      "10000000000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.fulfillment_wallet_address]:
      WALLET,
  };
}

function baseDependencies(input: {
  claims?: Record<string, any>[];
  inventory?: Record<string, any>[];
  attempts?: Record<string, any>[];
  sagaModule?: Record<string, any>;
} = {}): Record<string, any> {
  const claim = makeClaim();
  return {
    derive_snapshot: () => ({
      status: "ready",
      snapshot: { request_id: REQUEST_ID, status: "payment_verified" },
      evidence: { source: "direct_request_file" },
    }),
    list_claims: () => input.claims || [],
    list_inventory: () => input.inventory || [],
    list_attempts: () => input.attempts || [],
    run_pipeline_command: async (command: Record<string, any>) => {
      assert.equal(command.action, "verify_reserve_and_claim");
      assert.equal(command.apply, false);
      return {
        ok: true,
        status: "dry_run",
        preview: { decision: { ok: true, claim } },
      };
    },
    load_saga_module: input.sagaModule
      ? async () => input.sagaModule
      : async () => import(
          new URL(
            "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
            import.meta.url,
          ).href
        ),
    now_ms: () => Date.parse("2026-08-06T09:46:00.000Z"),
  };
}

async function proveConcurrency(base: string): Promise<void> {
  const root = path.join(base, "concurrency-root");
  const requestDir = path.join(base, "concurrency-requests");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  writeRequest(requestDir);

  const claims: Record<string, any>[] = [];
  const claim = makeIntent();
  let applyCalls = 0;
  let enteredResolve: (() => void) | null = null;
  const entered = new Promise<void>((resolve) => {
    enteredResolve = resolve;
  });
  let releaseResolve: (() => void) | null = null;
  const release = new Promise<void>((resolve) => {
    releaseResolve = resolve;
  });

  const deps = baseDependencies({ claims });
  deps.list_claims = () => claims;
  deps.run_pipeline_command = async (command: Record<string, any>) => {
    if (command.apply !== true) {
      return {
        ok: true,
        status: "dry_run",
        preview: { decision: { ok: true, claim: claim.claim } },
      };
    }
    applyCalls += 1;
    if (applyCalls > 1) throw new Error("concurrent_adapter_entered");
    enteredResolve?.();
    await release;
    claims.push(claim);
    return { ok: true, status: "applied" };
  };

  const dry = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
      stage_command: { receipt: RECEIPT },
    },
    dependencies: deps,
  });
  assert.equal(dry.code, 200);
  const apply = applyFrom(dry);

  const firstPromise = invoke({ root, requestDir, body: apply, dependencies: deps });
  await entered;
  const second = await invoke({
    root,
    requestDir,
    body: apply,
    dependencies: deps,
  });
  assert.equal(second.code, 409);
  assert.equal(second.body.ok, false);
  assert.match(second.body.reason, /lease_held_by_another_owner/);
  assert.equal(applyCalls, 1);

  releaseResolve?.();
  const first = await firstPromise;
  assert.equal(first.code, 200);
  assert.equal(first.body.status, "applied");
  assert.equal(applyCalls, 1);

  const saga: any = await import(
    new URL(
      "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  );
  const binding = saga.validateSagaBindingV1({
    request_id: REQUEST_ID,
    canonical_payment_identity: PAYMENT_ID,
    request_key_sha256: requestKey(REQUEST_ID),
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
    ["saga_initialized", "claim_committed"],
  );
}

async function proveCrossIdentityConflicts(base: string): Promise<void> {
  const cases = [
    {
      label: "claim",
      claims: [makeIntent(), makeIntent(OTHER_REQUEST_ID)],
      inventory: [],
      attempts: [],
      reason: /multiple_claim_records/,
    },
    {
      label: "inventory",
      claims: [makeIntent()],
      inventory: [makeInventory(), makeInventory(OTHER_REQUEST_ID)],
      attempts: [],
      reason: /multiple_inventory_records/,
    },
    {
      label: "attempt",
      claims: [makeIntent()],
      inventory: [makeInventory()],
      attempts: [makeAttempt(), makeAttempt(OTHER_REQUEST_ID)],
      reason: /multiple_attempt_records/,
    },
  ];

  for (const test of cases) {
    const root = path.join(base, `${test.label}-root`);
    const requestDir = path.join(base, `${test.label}-requests`);
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    writeRequest(requestDir);
    const held = await invoke({
      root,
      requestDir,
      body: {
        action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
        request_id: REQUEST_ID,
      },
      dependencies: baseDependencies(test),
    });
    assert.equal(held.code, 409, test.label);
    assert.match(held.body.reason, test.reason, test.label);
    assert.equal(
      fs.existsSync(
        path.join(root, "buy-void-crash-consistent-saga-runtime-v1"),
      ),
      false,
      `${test.label}_zero_saga_writes`,
    );
  }
}

async function proveSupervisorHoldPropagation(base: string): Promise<void> {
  const root = path.join(base, "held-root");
  const requestDir = path.join(base, "held-requests");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  writeRequest(requestDir);

  const real: any = await import(
    new URL(
      "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  );
  const heldSaga = {
    ...real,
    createFilesystemSagaStoreV1: () => ({ recover: () => null }),
    runSagaSupervisorTickV1: async () => ({
      ok: false,
      status: "held",
      reason: "lease_held_by_another_owner",
    }),
  };
  const deps = baseDependencies({ sagaModule: heldSaga });
  const dry = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
      stage_command: { receipt: RECEIPT },
    },
    dependencies: deps,
  });
  assert.equal(dry.code, 200);
  const held = await invoke({
    root,
    requestDir,
    body: applyFrom(dry),
    dependencies: deps,
  });
  assert.equal(held.code, 409);
  assert.equal(held.body.ok, false);
  assert.equal(held.body.error, "crash_consistent_saga_runtime_held");
  assert.match(held.body.reason, /saga_supervisor_held:lease_held_by_another_owner/);
}

async function main(): Promise<void> {
  const saved = new Map<string, string | undefined>();
  const envValues = { [ENABLE_ENV]: "1", ...policyValues() };
  for (const [name, value] of Object.entries(envValues)) {
    saved.set(name, process.env[name]);
    process.env[name] = value;
  }

  const base = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-saga-concurrency-identity-"),
  );
  try {
    await proveConcurrency(base);
    await proveCrossIdentityConflicts(base);
    await proveSupervisorHoldPropagation(base);
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    fs.rmSync(base, { recursive: true, force: true });
  }

  console.log(`${MARKER}_PROOF_GREEN`);
  console.log("same_process_concurrent_adapter_entries=1");
  console.log("cross_request_same_payment_claim_conflict=held");
  console.log("cross_request_same_payment_inventory_conflict=held");
  console.log("cross_request_same_payment_attempt_conflict=held");
  console.log("supervisor_hold_reported_as_applied=false");
  console.log("wallet_signing_broadcast_money=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
