import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1,
  buyVoidProductionCandidateReservationRuntimeEndpointV1,
  parseBuyVoidProductionCandidateReservationOperatorArgsV1,
  runBuyVoidProductionCandidateReservationOperatorV1,
  type BuyVoidProductionCandidateReservationRuntimeResponseV1,
} from "../src/economic/buy_void_production_candidate_reservation_operator_v1.js";

const REQUEST_ID = "buyvoid-candidate-reservation-proof-v1";
const SAGA_ID = "saga-proof-v1";
const POLICY = "1".repeat(64);
const ATTEMPT_ID = "a".repeat(64);
const RUNTIME_CONFIRM = "buyVoidRunCrashConsistentSagaRuntimeV1";
const SAGA_CONFIRM = "advanceSagaV1";
const INVENTORY_CONFIRM = "reserveInventoryV1";
const ATTEMPT_CONFIRM = "reserveExecutionAttemptV1";
const DELEGATED_CONFIRM = "reserveBuyVoidExecutionV1";

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
  return crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");
}

function baseSnapshot(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    request_id: REQUEST_ID,
    canonical_payment_identity: "voidpay1:ethereum:proof:0",
    public_status: "payment_verified",
    claim_status: "claimed",
    attempt_status: "missing",
    broadcast_status: "none",
    ...overrides,
  };
}

function baseEvidence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    request_file: `/proof/${REQUEST_ID}.json`,
    operator_event_files: [],
    operator_event_count: 0,
    fulfilled_event_count: 0,
    claim_count: 1,
    attempt_count: 0,
    confirmed_state_count: 0,
    selected_attempt_number: null,
    confirmed_state_present: false,
    public_status_source: "request_base",
    ...overrides,
  };
}

function dryResponse(input: {
  next_action: string;
  action_confirmation: string;
  delegated_confirmation?: string | null;
  snapshot?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
}): BuyVoidProductionCandidateReservationRuntimeResponseV1 {
  const snapshot = input.snapshot || baseSnapshot();
  const evidence = input.evidence || baseEvidence();
  return {
    status_code: 200,
    body: {
      marker: "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1",
      version: 1,
      ok: true,
      status: "dry_run",
      applied: false,
      request_id: REQUEST_ID,
      saga_id: SAGA_ID,
      saga_exists: true,
      next_action: input.next_action,
      candidate_reservation_only: true,
      preparation_invoked: false,
      rpc_call_performed: false,
      required_runtime_confirmation: RUNTIME_CONFIRM,
      required_saga_confirmation: SAGA_CONFIRM,
      required_action_confirmation: input.action_confirmation,
      required_delegated_confirmation: input.delegated_confirmation ?? null,
      required_policy_fingerprint_sha256: POLICY,
      derived_snapshot_sha256: digest(snapshot),
      snapshot_evidence_sha256: digest(evidence),
      derived_snapshot: snapshot,
      snapshot_evidence: evidence,
      credential_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    },
  };
}

function appliedResponse(): BuyVoidProductionCandidateReservationRuntimeResponseV1 {
  return {
    status_code: 200,
    body: {
      marker: "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1",
      version: 1,
      ok: true,
      status: "applied",
      applied: true,
      request_id: REQUEST_ID,
      saga_id: SAGA_ID,
      candidate_reservation_only: true,
      preparation_invoked: false,
      rpc_call_performed: false,
      inventory_decrement_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      public_fulfilled_closeout_performed: false,
      money_movement_performed: false,
    },
  };
}

function applyArgs(input: {
  actionConfirmation: string;
  delegatedConfirmation?: string;
}): ReturnType<typeof parseBuyVoidProductionCandidateReservationOperatorArgsV1> {
  return parseBuyVoidProductionCandidateReservationOperatorArgsV1([
    "--request-id", REQUEST_ID,
    "--apply",
    "--saga-id", SAGA_ID,
    "--runtime-confirm", RUNTIME_CONFIRM,
    "--saga-confirm", SAGA_CONFIRM,
    "--action-confirm", input.actionConfirmation,
    "--policy-fingerprint-sha256", POLICY,
    ...(input.delegatedConfirmation
      ? ["--delegated-confirm", input.delegatedConfirmation]
      : []),
  ]);
}

async function main(): Promise<void> {
  const cliSource = fs.readFileSync(
    "scripts/buy_void_production_candidate_reservation_operator_v1.ts",
    "utf8",
  );
  const operatorSource = fs.readFileSync(
    "src/economic/buy_void_production_candidate_reservation_operator_v1.ts",
    "utf8",
  );

  assert.ok(operatorSource.includes("run_crash_consistent_saga_stage") === false);
  assert.ok(operatorSource.includes("VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1"));
  for (const forbiddenImport of [
    "inventory_reservation_journal",
    "execution_attempt_journal",
    "fulfillment_journal",
    "pipeline_coordinator",
    "prepared_transaction_coordinator",
    "native_execution_runtime",
  ]) {
    assert.equal(operatorSource.includes(forbiddenImport), false, forbiddenImport);
  }
  for (const forbiddenFlag of [
    "--root-dir",
    "--request-dir",
    "--payment-policy",
    "--inventory-policy",
    "--execution-policy",
    "--wallet",
    "--rpc-url",
    "--signer",
    "--broadcaster",
    "--socket-path",
    "--receipt",
    "--payment-observation",
    "--raw-transaction",
    "--attempt-id",
  ]) {
    assert.throws(
      () => parseBuyVoidProductionCandidateReservationOperatorArgsV1([
        "--request-id", REQUEST_ID, forbiddenFlag, "forbidden",
      ]),
      /unknown argument/,
      forbiddenFlag,
    );
    assert.equal(cliSource.includes(`${forbiddenFlag} `), false, forbiddenFlag);
  }

  const parsed = parseBuyVoidProductionCandidateReservationOperatorArgsV1([
    "--request-id", REQUEST_ID,
  ]);
  assert.equal(parsed.request_id, REQUEST_ID);
  assert.equal(parsed.apply, false);
  assert.throws(
    () => parseBuyVoidProductionCandidateReservationOperatorArgsV1([
      "--request-id", REQUEST_ID,
      "--request-id", `${REQUEST_ID}-other`,
    ]),
    /only once/,
  );
  assert.equal(
    buyVoidProductionCandidateReservationRuntimeEndpointV1({ HTTP_PORT: "4999" }),
    "http://127.0.0.1:4999/__void/operator/buy-void-runtime-v1/command",
  );
  assert.throws(
    () => buyVoidProductionCandidateReservationRuntimeEndpointV1({ HTTP_PORT: "not-a-port" }),
    /HTTP_PORT is invalid/,
  );

  let calls: Array<Record<string, unknown>> = [];
  const claimHeld = await runBuyVoidProductionCandidateReservationOperatorV1(
    parsed,
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        return dryResponse({
          next_action: "claim_payment",
          action_confirmation: "claimPaymentV1",
          delegated_confirmation: "verifyAndClaimV1",
          snapshot: baseSnapshot({ claim_status: "missing" }),
          evidence: baseEvidence({ claim_count: 0 }),
        });
      },
    },
  );
  assert.equal(claimHeld.ok, false);
  if (claimHeld.ok) throw new Error("claim hold expected");
  assert.equal(claimHeld.reason, "candidate_reservation_requires_existing_claim");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    action: "run_crash_consistent_saga_stage",
    request_id: REQUEST_ID,
    candidate_reservation_only: true,
    apply: false,
  });

  calls = [];
  const inventoryDry = dryResponse({
    next_action: "reserve_inventory",
    action_confirmation: INVENTORY_CONFIRM,
    delegated_confirmation: null,
  });
  const inventoryPlan = await runBuyVoidProductionCandidateReservationOperatorV1(
    parsed,
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        return inventoryDry;
      },
    },
  );
  assert.equal(inventoryPlan.ok, true);
  if (!inventoryPlan.ok) throw new Error("inventory plan expected");
  assert.equal(inventoryPlan.status, "planned");
  assert.equal(inventoryPlan.next_action, "reserve_inventory");
  assert.equal(inventoryPlan.required_runtime_confirmation, RUNTIME_CONFIRM);
  assert.equal(inventoryPlan.required_saga_confirmation, SAGA_CONFIRM);
  assert.equal(inventoryPlan.required_action_confirmation, INVENTORY_CONFIRM);
  assert.equal(inventoryPlan.required_policy_fingerprint_sha256, POLICY);
  assert.equal(inventoryPlan.runtime_request_count, 1);
  assert.equal(calls.length, 1);

  calls = [];
  const stalePolicyArgs = applyArgs({ actionConfirmation: INVENTORY_CONFIRM });
  stalePolicyArgs.policy_fingerprint_sha256 = "2".repeat(64);
  const stalePolicy = await runBuyVoidProductionCandidateReservationOperatorV1(
    stalePolicyArgs,
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        return inventoryDry;
      },
    },
  );
  assert.equal(stalePolicy.ok, false);
  if (stalePolicy.ok) throw new Error("stale policy hold expected");
  assert.equal(
    stalePolicy.reason,
    "candidate_reservation_exact_server_policy_fingerprint_required",
  );
  assert.equal(calls.length, 1);

  calls = [];
  const staleSagaArgs = applyArgs({ actionConfirmation: INVENTORY_CONFIRM });
  staleSagaArgs.saga_id = "different-saga";
  const staleSaga = await runBuyVoidProductionCandidateReservationOperatorV1(
    staleSagaArgs,
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        return inventoryDry;
      },
    },
  );
  assert.equal(staleSaga.ok, false);
  if (staleSaga.ok) throw new Error("stale saga hold expected");
  assert.equal(staleSaga.reason, "candidate_reservation_exact_saga_id_required");
  assert.equal(calls.length, 1);

  calls = [];
  const inventoryApply = await runBuyVoidProductionCandidateReservationOperatorV1(
    applyArgs({ actionConfirmation: INVENTORY_CONFIRM }),
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        if (calls.length === 1) return inventoryDry;
        assert.deepEqual(body, {
          action: "run_crash_consistent_saga_stage",
          request_id: REQUEST_ID,
          candidate_reservation_only: true,
          apply: true,
          confirmation: RUNTIME_CONFIRM,
          saga_confirmation: SAGA_CONFIRM,
          action_confirmation: INVENTORY_CONFIRM,
          policy_fingerprint_sha256: POLICY,
        });
        return appliedResponse();
      },
    },
  );
  assert.equal(inventoryApply.ok, true);
  if (!inventoryApply.ok) throw new Error("inventory apply expected");
  assert.equal(inventoryApply.status, "applied_one_stage");
  assert.equal(inventoryApply.applied_action, "reserve_inventory");
  assert.equal(inventoryApply.rerun_required, true);
  assert.equal(inventoryApply.runtime_request_count, 2);
  assert.equal(calls.length, 2, "must not auto-plan or apply next stage");

  calls = [];
  const attemptDry = dryResponse({
    next_action: "reserve_execution_attempt",
    action_confirmation: ATTEMPT_CONFIRM,
    delegated_confirmation: DELEGATED_CONFIRM,
    evidence: baseEvidence({ attempt_count: 0 }),
  });
  const attemptPlan = await runBuyVoidProductionCandidateReservationOperatorV1(
    parsed,
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        return attemptDry;
      },
    },
  );
  assert.equal(attemptPlan.ok, true);
  if (!attemptPlan.ok) throw new Error("attempt plan expected");
  assert.equal(attemptPlan.status, "planned");
  assert.equal(attemptPlan.next_action, "reserve_execution_attempt");
  assert.equal(attemptPlan.required_delegated_confirmation, DELEGATED_CONFIRM);
  assert.equal(calls.length, 1);

  calls = [];
  const attemptApply = await runBuyVoidProductionCandidateReservationOperatorV1(
    applyArgs({
      actionConfirmation: ATTEMPT_CONFIRM,
      delegatedConfirmation: DELEGATED_CONFIRM,
    }),
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        if (calls.length === 1) return attemptDry;
        assert.equal(body.delegated_confirmation, DELEGATED_CONFIRM);
        return appliedResponse();
      },
    },
  );
  assert.equal(attemptApply.ok, true);
  if (!attemptApply.ok) throw new Error("attempt apply expected");
  assert.equal(attemptApply.status, "applied_one_stage");
  assert.equal(attemptApply.applied_action, "reserve_execution_attempt");
  assert.equal(calls.length, 2, "attempt apply must remain one stage");

  calls = [];
  const candidateSnapshot = baseSnapshot({
    attempt_id: ATTEMPT_ID,
    attempt_status: "reserved",
  });
  const candidateEvidence = baseEvidence({
    attempt_count: 1,
    selected_attempt_number: 1,
  });
  const candidateDry = dryResponse({
    next_action: "prepare_transaction",
    action_confirmation: "prepareTransactionV1",
    delegated_confirmation: null,
    snapshot: candidateSnapshot,
    evidence: candidateEvidence,
  });
  const candidate = await runBuyVoidProductionCandidateReservationOperatorV1(
    parsed,
    {
      post_runtime: async (body) => {
        calls.push({ ...body });
        return candidateDry;
      },
    },
  );
  assert.equal(candidate.ok, true);
  if (!candidate.ok) throw new Error("candidate ready expected");
  assert.equal(candidate.status, "candidate_ready");
  assert.equal(candidate.execution_attempt_id, ATTEMPT_ID);
  assert.match(candidate.candidate_evidence_id_sha256, /^[0-9a-f]{64}$/);
  assert.equal(candidate.preparation_invoked, false);
  assert.equal(candidate.rpc_call_performed, false);
  assert.equal(candidate.mutation_performed, false);
  assert.equal(candidate.signing_performed, false);
  assert.equal(candidate.transaction_broadcast_performed, false);
  assert.equal(candidate.money_movement_performed, false);
  assert.equal(calls.length, 1, "candidate ready must never apply preparation");

  const dirtyCandidate = await runBuyVoidProductionCandidateReservationOperatorV1(
    parsed,
    {
      post_runtime: async () => dryResponse({
        next_action: "prepare_transaction",
        action_confirmation: "prepareTransactionV1",
        snapshot: candidateSnapshot,
        evidence: baseEvidence({
          attempt_count: 2,
          selected_attempt_number: 2,
        }),
      }),
    },
  );
  assert.equal(dirtyCandidate.ok, false);
  if (dirtyCandidate.ok) throw new Error("dirty candidate hold expected");
  assert.equal(dirtyCandidate.reason, "candidate_reservation_candidate_snapshot_not_clean");

  assert.equal(
    VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1
      .request_id_only_business_selector,
    true,
  );
  for (const key of [
    "direct_journal_mutation",
    "rpc_call",
    "credential_access",
    "signing",
    "transaction_broadcast",
    "inventory_decrement",
    "public_fulfilled_closeout",
    "money_movement",
  ] as const) {
    assert.equal(
      VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_AUTHORITY_V1[key],
      false,
      key,
    );
  }

  console.log(`${VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1}_PROOF_GREEN`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
