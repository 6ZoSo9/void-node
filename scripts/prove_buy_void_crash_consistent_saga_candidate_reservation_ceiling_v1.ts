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
  readBuyVoidCrashConsistentSagaServerPolicyV1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

const MARKER = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_CANDIDATE_RESERVATION_CEILING_V1";
const REQUEST_ID = "buyvoid-candidate-ceiling-proof-v1";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const USDC = "0x6666666666666666666666666666666666666666";
const RECEIVE = "0x8888888888888888888888888888888888888888";
const PAYMENT_TX = `0x${"5".repeat(64)}`;
const PAYMENT_ID = `voidpay1:ethereum:${PAYMENT_TX}:0`;
const VOID_UNITS = "2500000";
const POOL_ID = "void-fixed-price-pool-v1";
const ATTEMPT_ID = "a".repeat(64);
const SAGA_ID = "b".repeat(64);
const RUNTIME_ENABLE_ENV = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED";
const PREPARATION_ENABLE_ENV = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED";

function digestText(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function digest(value: unknown): string {
  return digestText(canonical(value));
}

function requestKey(): string {
  return digestText(`void-buy-request-v1\n${REQUEST_ID}`);
}

function paymentKey(): string {
  return digestText(`void-buy-payment-v1\n${PAYMENT_ID}`);
}

function intent(): Record<string, any> {
  return {
    payment_key_sha256: paymentKey(),
    request_key_sha256: requestKey(),
    claim: {
      canonical_payment_identity: PAYMENT_ID,
      request_id: REQUEST_ID,
      decision_fingerprint: digestText("claim-decision"),
      instruction_id: "proof-instruction-v1",
      unsigned_instruction: {
        delivery_address: DELIVERY,
        void_amount_units: VOID_UNITS,
      },
    },
    verification_binding: {
      source_chain: "ethereum",
      usdc_contract: USDC,
      receive_address: RECEIVE,
      confirmation_count_at_claim: "20",
      payment_usdc_units: "1250000",
    },
  };
}

function reservation(): Record<string, any> {
  return {
    reservation_id: digestText("inventory-reservation"),
    request_id: REQUEST_ID,
    canonical_payment_identity: PAYMENT_ID,
    request_key_sha256: requestKey(),
    payment_key_sha256: paymentKey(),
    delivery_address: DELIVERY,
    reserved_void_units: VOID_UNITS,
    pool_id: POOL_ID,
    inventory_policy_version: "proof-policy-v1",
    pool_capacity_void_units: "10000000",
  };
}

function attempt(): Record<string, any> {
  return {
    status: "reserved",
    reservation: {
      attempt_id: ATTEMPT_ID,
      attempt_number: 1,
      max_attempts_per_payment: 1,
      request_id: REQUEST_ID,
      canonical_payment_identity: PAYMENT_ID,
      request_key_sha256: requestKey(),
      payment_key_sha256: paymentKey(),
      unsigned_instruction: {
        delivery_address: DELIVERY,
        void_amount_units: VOID_UNITS,
      },
    },
  };
}

function snapshot(): Record<string, any> {
  return {
    request_id: REQUEST_ID,
    canonical_payment_identity: PAYMENT_ID,
    public_status: "payment_verified",
    claim_status: "claimed",
    attempt_id: ATTEMPT_ID,
    attempt_status: "reserved",
    broadcast_status: "none",
  };
}

function evidence(): Record<string, any> {
  return {
    request_file: `/proof/${REQUEST_ID}.json`,
    operator_event_files: [],
    operator_event_count: 0,
    fulfilled_event_count: 0,
    claim_count: 1,
    attempt_count: 1,
    confirmed_state_count: 0,
    selected_attempt_number: 1,
    confirmed_state_present: false,
    public_status_source: "request_base",
  };
}

function policyEnvValues(): Record<string, string> {
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
      "proof-policy-v1",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_capacity_void_units]:
      "10000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.max_reservation_void_units]:
      "5000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.fulfillment_wallet_address]:
      WALLET,
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
    status(value: number) { code = value; return this; },
    json(value: Record<string, any>) { body = value; return value; },
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

async function main(): Promise<void> {
  const source = fs.readFileSync(
    "src/economic/buy_void_crash_consistent_saga_runtime_v1.ts",
    "utf8",
  );
  assert.ok(source.includes("candidate_reservation_only"));
  assert.ok(source.includes("candidate_reservation_ceiling_supported"));
  assert.ok(source.includes("preparation_invoked: false"));
  assert.ok(source.includes("rpc_call_performed: false"));
  assert.ok(
    source.indexOf("candidateReservationOnly &&\n      next.action === \"prepare_transaction\"") <
      source.indexOf("!preparationEnabled()"),
    "candidate ceiling must precede preparation enable gate",
  );

  const envNames = [
    RUNTIME_ENABLE_ENV,
    PREPARATION_ENABLE_ENV,
    ...Object.keys(policyEnvValues()),
  ];
  const saved = new Map<string, string | undefined>();
  for (const name of envNames) {
    saved.set(name, process.env[name]);
    delete process.env[name];
  }

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-candidate-ceiling-"));
  const root = path.join(base, "root");
  const requestDir = path.join(base, "requests");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    path.join(requestDir, `${REQUEST_ID}.json`),
    `${JSON.stringify({ request_id: REQUEST_ID, status: "payment_verified" })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  try {
    process.env[RUNTIME_ENABLE_ENV] = "1";
    for (const [name, value] of Object.entries(policyEnvValues())) {
      process.env[name] = value;
    }
    delete process.env[PREPARATION_ENABLE_ENV];

    const policyDecision = readBuyVoidCrashConsistentSagaServerPolicyV1();
    assert.equal(policyDecision.ok, true);
    if (!policyDecision.ok) throw new Error(policyDecision.reason);
    const policyId = policyDecision.policy.saga_policy_id;

    let preparationCoordinatorCalls = 0;
    let custodianCalls = 0;
    let supervisorCalls = 0;
    const binding = {
      request_id: REQUEST_ID,
      canonical_payment_identity: PAYMENT_ID,
      request_key_sha256: requestKey(),
      payment_key_sha256: paymentKey(),
      delivery_address: DELIVERY,
      void_amount_units: VOID_UNITS,
      chain_id: "2050",
      pool_id: POOL_ID,
    };
    const claim = intent();
    const inventory = reservation();
    const executionAttempt = attempt();
    const serverSnapshot = snapshot();
    const serverEvidence = evidence();

    const sagaDir = path.join(
      root,
      "buy-void-crash-consistent-saga-runtime-v1",
      "sagas",
      SAGA_ID,
    );
    fs.mkdirSync(path.join(sagaDir, "events"), { recursive: true, mode: 0o700 });
    const record = {
      binding,
      events: [{
        event_type: "saga_initialized",
        payload: { policy_id: policyId },
      }],
      state: {
        state: "attempt_reserved",
        claim_id: claim.claim.decision_fingerprint,
        reservation_id: inventory.reservation_id,
        attempt_id: ATTEMPT_ID,
      },
    };

    const dependencies = {
      derive_snapshot: () => ({
        ok: true,
        status: "derived",
        snapshot: serverSnapshot,
        evidence: serverEvidence,
      }),
      list_claims: () => [claim],
      list_inventory: () => [inventory],
      list_attempts: () => [executionAttempt],
      reserve_inventory: async () => {
        throw new Error("candidate ceiling must not reserve inventory");
      },
      run_pipeline_command: async () => {
        throw new Error("candidate ceiling must not call pipeline");
      },
      run_prepared_transaction_coordinator: async () => {
        preparationCoordinatorCalls += 1;
        throw new Error("candidate ceiling must not invoke preparation coordinator");
      },
      create_prepared_transaction_custodian: () => {
        custodianCalls += 1;
        throw new Error("candidate ceiling must not construct custodian");
      },
      load_saga_module: async () => ({
        ADVANCE_CONFIRMATION: "advanceSagaV1",
        ACTION_CONFIRMATIONS: {
          claim_payment: "claimPaymentV1",
          reserve_inventory: "reserveInventoryV1",
          reserve_execution_attempt: "reserveExecutionAttemptV1",
          prepare_transaction: "prepareTransactionV1",
        },
        validateSagaBindingV1: (value: Record<string, unknown>) => value,
        computeSagaIdV1: () => SAGA_ID,
        deriveSagaNextActionV1: () => ({
          action: "prepare_transaction",
          terminal: false,
          required_confirmation: "prepareTransactionV1",
        }),
        createFilesystemSagaStoreV1: () => ({ recover: () => record }),
        runSagaSupervisorTickV1: async () => {
          supervisorCalls += 1;
          throw new Error("candidate ceiling must not run saga supervisor");
        },
      }),
      now_ms: () => {
        throw new Error("candidate prepare ceiling must return before apply clock");
      },
    };

    const dry = await invoke({
      root,
      requestDir,
      body: {
        action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
        request_id: REQUEST_ID,
        candidate_reservation_only: true,
        apply: false,
      },
      dependencies,
    });
    assert.equal(dry.code, 200);
    assert.equal(dry.body.ok, true);
    assert.equal(dry.body.status, "dry_run");
    assert.equal(dry.body.applied, false);
    assert.equal(dry.body.next_action, "prepare_transaction");
    assert.equal(dry.body.candidate_reservation_only, true);
    assert.equal(dry.body.candidate_reservation_ceiling_reached, true);
    assert.equal(dry.body.preparation_invoked, false);
    assert.equal(dry.body.rpc_call_performed, false);
    assert.equal(dry.body.credential_access_performed, false);
    assert.equal(dry.body.signing_performed, false);
    assert.equal(dry.body.transaction_broadcast_performed, false);
    assert.equal(dry.body.money_movement_performed, false);
    assert.deepEqual(dry.body.derived_snapshot, serverSnapshot);
    assert.deepEqual(dry.body.snapshot_evidence, serverEvidence);
    assert.equal(dry.body.derived_snapshot_sha256, digest(serverSnapshot));
    assert.equal(dry.body.snapshot_evidence_sha256, digest(serverEvidence));
    assert.equal(preparationCoordinatorCalls, 0);
    assert.equal(custodianCalls, 0);
    assert.equal(supervisorCalls, 0);

    const maliciousApply = await invoke({
      root,
      requestDir,
      body: {
        action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
        request_id: REQUEST_ID,
        candidate_reservation_only: true,
        apply: true,
        confirmation: "anything",
        saga_confirmation: "anything",
        action_confirmation: "anything",
        policy_fingerprint_sha256: "f".repeat(64),
      },
      dependencies,
    });
    assert.equal(maliciousApply.code, 200);
    assert.equal(maliciousApply.body.status, "dry_run");
    assert.equal(maliciousApply.body.applied, false);
    assert.equal(maliciousApply.body.candidate_reservation_ceiling_reached, true);
    assert.equal(preparationCoordinatorCalls, 0);
    assert.equal(custodianCalls, 0);
    assert.equal(supervisorCalls, 0);

    const missingSnapshot = {
      request_id: REQUEST_ID,
      public_status: "payment_verified",
      claim_status: "missing",
      attempt_status: "missing",
      broadcast_status: "none",
    };
    const missingEvidence = {
      ...serverEvidence,
      claim_count: 0,
      attempt_count: 0,
      selected_attempt_number: null,
    };
    const missingClaim = await invoke({
      root,
      requestDir,
      body: {
        action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
        request_id: REQUEST_ID,
        candidate_reservation_only: true,
        apply: false,
      },
      dependencies: {
        ...dependencies,
        derive_snapshot: () => ({
          ok: true,
          status: "derived",
          snapshot: missingSnapshot,
          evidence: missingEvidence,
        }),
        list_claims: () => [],
        load_saga_module: async () => {
          throw new Error("missing-claim candidate inspection must stop before saga load");
        },
      },
    });
    assert.equal(missingClaim.code, 200);
    assert.equal(missingClaim.body.ok, true);
    assert.equal(missingClaim.body.status, "dry_run");
    assert.equal(missingClaim.body.next_action, "claim_payment");
    assert.equal(missingClaim.body.applied, false);
    assert.equal(missingClaim.body.candidate_reservation_only, true);
    assert.equal(missingClaim.body.preparation_invoked, false);
    assert.equal(missingClaim.body.rpc_call_performed, false);
    assert.equal(preparationCoordinatorCalls, 0);

    console.log(`${MARKER}_PROOF_GREEN`);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
