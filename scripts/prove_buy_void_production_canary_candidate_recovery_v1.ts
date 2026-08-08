import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1,
  parseBuyVoidProductionCanaryCandidateRecoveryArgsV1,
  recoverBuyVoidProductionCanaryCandidateV1,
} from "./buy_void_production_canary_candidate_recovery_v1.js";

const REQUEST_ID = "buy-prod-canary-request-001";
const ROOT = "/srv/void/private/data_a/buy_void_v1/runtime-integration-v1";
const ATTEMPT_ID = "1".repeat(64);
const PAYMENT_KEY = "2".repeat(64);
const REQUEST_KEY = "3".repeat(64);
const INTENT_FINGERPRINT = "4".repeat(64);
const POLICY_FINGERPRINT = "a".repeat(64);
const WALLET = "0x" + "b".repeat(40);
const RPC = "http://127.0.0.1:8545";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function configuredPolicy(options: {
  enabled?: boolean;
  root?: string;
  maxAttempts?: number;
  attemptJournalEnabled?: boolean;
  chainId?: string | number;
  allowlist?: string[];
  fingerprint?: string;
} = {}): any {
  return {
    configured: true,
    policy: {
      enabled: options.enabled ?? false,
      root_dir: options.root ?? ROOT,
      worker_policy: {
        enabled: true,
        asset_mode: "native_void",
        chain_id: "2050",
        pool_id: "buy-void-production-v1",
        fulfillment_wallet_address: WALLET,
        max_void_amount_units: "1000000000000000000",
        max_gas_limit: "21000",
        max_fee_per_gas_wei: "1000000000",
        max_priority_fee_per_gas_wei: "100000000",
      },
      execution_policy: {
        attempt_journal_enabled: options.attemptJournalEnabled ?? true,
        max_attempts_per_payment: options.maxAttempts ?? 1,
        chain_id: options.chainId ?? 2050,
        fulfillment_wallet_allowlist: options.allowlist ?? [WALLET],
      },
      planner_policy: {
        rpc_url: RPC,
        expected_chain_id: "2050",
        fulfillment_wallet_address: WALLET,
        gas_limit: "21000",
        max_gas_limit: "21000",
        max_fee_per_gas_wei: "1000000000",
        max_priority_fee_per_gas_wei: "100000000",
        fee_multiplier_bps: "10000",
      },
    },
    fingerprint_sha256: options.fingerprint ?? POLICY_FINGERPRINT,
    rpc_url_fingerprint_sha256: sha256(RPC),
  };
}

function candidate(options: {
  requestId?: string;
  attemptId?: string;
  attemptNumber?: number;
  maxAttempts?: number;
  status?: "reserved" | "prepared" | "broadcast" | "failed_retryable" | "failed_terminal" | "confirmed";
} = {}): any {
  const status = options.status ?? "reserved";
  const attemptId = options.attemptId ?? ATTEMPT_ID;
  return {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: "VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1",
      attempt_id: attemptId,
      attempt_number: options.attemptNumber ?? 1,
      reserved_at_ms: 1,
      payment_key_sha256: PAYMENT_KEY,
      request_key_sha256: REQUEST_KEY,
      canonical_payment_identity: "chain2050:payment:synthetic",
      request_id: options.requestId ?? REQUEST_ID,
      instruction_id: "instruction-001",
      intent_fingerprint: INTENT_FINGERPRINT,
      max_attempts_per_payment: options.maxAttempts ?? 1,
      unsigned_instruction: {},
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: status === "prepared" || status === "broadcast" || status === "confirmed"
      ? { attempt_id: attemptId }
      : null,
    broadcast: status === "broadcast" || status === "confirmed"
      ? { attempt_id: attemptId }
      : null,
    failure: status === "failed_retryable" || status === "failed_terminal"
      ? { attempt_id: attemptId }
      : null,
    postbroadcast_failure: null,
    confirmation: status === "confirmed" ? { attempt_id: attemptId } : null,
    status,
  };
}

function runWith(
  attempts: any[],
  policy: any = configuredPolicy(),
): { decision: ReturnType<typeof recoverBuyVoidProductionCanaryCandidateV1>; listCalls: number } {
  let listCalls = 0;
  const decision = recoverBuyVoidProductionCanaryCandidateV1(
    { request_id: REQUEST_ID },
    {
      resolve_policy: () => policy,
      list_attempts: (rootDir: string) => {
        listCalls += 1;
        assert.equal(rootDir, ROOT);
        return attempts;
      },
    },
  );
  return { decision, listCalls };
}

const parsed = parseBuyVoidProductionCanaryCandidateRecoveryArgsV1([
  "--request-id",
  REQUEST_ID,
]);
assert.deepEqual(parsed, { request_id: REQUEST_ID });
assert.throws(
  () => parseBuyVoidProductionCanaryCandidateRecoveryArgsV1([]),
  /invalid_request_id/,
);
assert.throws(
  () => parseBuyVoidProductionCanaryCandidateRecoveryArgsV1([
    "--request-id",
    REQUEST_ID,
    "--runtime-root",
    ROOT,
  ]),
  /unexpected_option:--runtime-root/,
);
assert.throws(
  () => parseBuyVoidProductionCanaryCandidateRecoveryArgsV1([
    "--request-id",
    REQUEST_ID,
    "--request-id",
    REQUEST_ID,
  ]),
  /duplicate_option:--request-id/,
);

let listCalls = 0;
const missingPolicy = recoverBuyVoidProductionCanaryCandidateV1(
  { request_id: REQUEST_ID },
  {
    resolve_policy: () => ({
      configured: false,
      missing_envs: ["VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL"],
    }) as any,
    list_attempts: () => {
      listCalls += 1;
      return [];
    },
  },
);
assert.equal(missingPolicy.ok, false);
assert.equal(missingPolicy.reason, "candidate_recovery_runtime_policy_not_configured");
assert.equal(listCalls, 0);

const enabledRuntime = runWith([], configuredPolicy({ enabled: true }));
assert.equal(enabledRuntime.decision.ok, false);
assert.equal(
  enabledRuntime.decision.reason,
  "candidate_recovery_native_runtime_must_remain_disabled",
);
assert.equal(enabledRuntime.listCalls, 0);

const invalidExecutionPolicy = runWith([], configuredPolicy({ maxAttempts: 2 }));
assert.equal(invalidExecutionPolicy.decision.ok, false);
assert.equal(
  invalidExecutionPolicy.decision.reason,
  "candidate_recovery_execution_policy_invalid",
);
assert.equal(invalidExecutionPolicy.listCalls, 0);

const invalidRoot = runWith([], configuredPolicy({ root: "/" }));
assert.equal(invalidRoot.decision.ok, false);
assert.equal(invalidRoot.decision.reason, "candidate_recovery_runtime_root_invalid");
assert.equal(invalidRoot.listCalls, 0);

const invalidFingerprint = runWith([], configuredPolicy({ fingerprint: "bad" }));
assert.equal(invalidFingerprint.decision.ok, false);
assert.equal(
  invalidFingerprint.decision.reason,
  "candidate_recovery_runtime_policy_fingerprint_invalid",
);
assert.equal(invalidFingerprint.listCalls, 0);

const readFailure = recoverBuyVoidProductionCanaryCandidateV1(
  { request_id: REQUEST_ID },
  {
    resolve_policy: () => configuredPolicy(),
    list_attempts: () => {
      throw new Error("synthetic journal read failure");
    },
  },
);
assert.equal(readFailure.ok, false);
assert.equal(readFailure.reason, "candidate_recovery_attempt_journal_read_failed");
assert.equal(readFailure.journal_read_performed, true);

const noMatch = runWith([candidate({ requestId: "different-request" })]);
assert.equal(noMatch.decision.ok, false);
assert.equal(noMatch.decision.reason, "candidate_recovery_attempt_not_found");
assert.equal(noMatch.decision.matching_attempt_count, 0);
assert.equal(noMatch.listCalls, 1);

const ambiguous = runWith([
  candidate(),
  candidate({ attemptId: "5".repeat(64) }),
]);
assert.equal(ambiguous.decision.ok, false);
assert.equal(ambiguous.decision.reason, "candidate_recovery_attempt_ambiguous");
assert.equal(ambiguous.decision.matching_attempt_count, 2);

for (const status of [
  "broadcast",
  "failed_retryable",
  "failed_terminal",
  "confirmed",
] as const) {
  const dirty = runWith([candidate({ status })]);
  assert.equal(dirty.decision.ok, false, status);
  assert.equal(dirty.decision.reason, "candidate_recovery_attempt_not_clean", status);
}

const secondAttempt = runWith([candidate({ attemptNumber: 2 })]);
assert.equal(secondAttempt.decision.ok, false);
assert.equal(secondAttempt.decision.reason, "candidate_recovery_attempt_policy_invalid");

const widenedAttemptPolicy = runWith([candidate({ maxAttempts: 2 })]);
assert.equal(widenedAttemptPolicy.decision.ok, false);
assert.equal(
  widenedAttemptPolicy.decision.reason,
  "candidate_recovery_attempt_policy_invalid",
);

const malformedAttempt = runWith([candidate({ attemptId: "not-a-sha" })]);
assert.equal(malformedAttempt.decision.ok, false);
assert.equal(
  malformedAttempt.decision.reason,
  "candidate_recovery_reservation_boundary_invalid",
);

const reserved = runWith([candidate()]);
assert.equal(reserved.listCalls, 1);
assert.equal(reserved.decision.ok, true);
if (!reserved.decision.ok) throw new Error(reserved.decision.reason);
assert.equal(reserved.decision.marker, VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1);
assert.equal(reserved.decision.status, "candidate_recovered");
assert.equal(reserved.decision.request_id, REQUEST_ID);
assert.equal(reserved.decision.candidate_attempt_id, ATTEMPT_ID);
assert.equal(reserved.decision.attempt_status, "reserved");
assert.equal(reserved.decision.candidate_handoff, "production_live_canary_preflight");
assert.equal(reserved.decision.matching_attempt_count, 1);
assert.equal(reserved.decision.journal_read_performed, true);
assert.equal(reserved.decision.runtime_policy_fingerprint_sha256, POLICY_FINGERPRINT);
assert.equal(reserved.decision.runtime_root_fingerprint_sha256, sha256(ROOT));
assert.match(reserved.decision.candidate_binding_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(reserved.decision.recovery_evidence_id_sha256, /^[0-9a-f]{64}$/);
assert.equal(reserved.decision.mutation_performed, false);
assert.equal(reserved.decision.rpc_call_performed, false);
assert.equal(reserved.decision.credential_access_performed, false);
assert.equal(reserved.decision.wallet_access_performed, false);
assert.equal(reserved.decision.signing_performed, false);
assert.equal(reserved.decision.transaction_broadcast_performed, false);
assert.equal(reserved.decision.money_movement_performed, false);

const prepared = runWith([candidate({ status: "prepared" })]);
assert.equal(prepared.decision.ok, true);
if (!prepared.decision.ok) throw new Error(prepared.decision.reason);
assert.equal(prepared.decision.candidate_attempt_id, ATTEMPT_ID);
assert.equal(prepared.decision.attempt_status, "prepared");

const serialized = JSON.stringify(reserved.decision);
assert.equal(serialized.includes(ROOT), false);
assert.equal(serialized.includes(WALLET), false);
assert.equal(serialized.includes(RPC), false);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1.runtime_root_returned,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1.execution_attempt_journal_write,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1.automatic_preflight_invocation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1.money_movement,
  false,
);

const source = fs.readFileSync(
  new URL("./buy_void_production_canary_candidate_recovery_v1.ts", import.meta.url),
  "utf8",
);
assert.match(source, /buyVoidNativeExecutionRuntimePolicyStateV1/);
assert.match(source, /listBuyVoidExecutionAttemptsV1/);
assert.doesNotMatch(source, /--runtime-root/);
assert.doesNotMatch(source, /reserveBuyVoidExecutionAttemptV1/);
assert.doesNotMatch(source, /prepareBuyVoidExecutionTransactionV1/);
assert.doesNotMatch(source, /runBuyVoidProductionPreflightOperatorV1/);
assert.doesNotMatch(source, /eth_sendRawTransaction/);

process.stdout.write(
  `${JSON.stringify({
    marker: "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1_PROOF_GREEN",
    reserved_candidate_recovered: true,
    prepared_candidate_recovered: true,
    missing_receipt_recovery_supported: true,
    exact_request_binding_required: true,
    ambiguity_fails_closed: true,
    dirty_attempts_fail_closed: true,
    canonical_runtime_root_policy_reused: true,
    runtime_root_disclosed: false,
    journal_write: false,
    rpc_call: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  }, null, 2)}\n`,
);
