import crypto from "node:crypto";
import path from "node:path";

import {
  buyVoidNativeExecutionRuntimePolicyStateV1,
} from "../src/economic/buy_void_native_execution_runtime_v1.js";
import {
  listBuyVoidExecutionAttemptsV1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";

export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1";

export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1 = {
  request_id_only_business_selector: true,
  canonical_native_runtime_policy_parser_reused: true,
  duplicate_runtime_root_parser: false,
  server_controlled_runtime_root: true,
  runtime_root_returned: false,
  filesystem_read: true,
  execution_attempt_journal_read: true,
  execution_attempt_journal_write: false,
  execution_attempt_reservation: false,
  transaction_preparation: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_submission: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  service_start: false,
  service_restart: false,
  automatic_preflight_invocation: false,
  money_movement: false,
} as const;

const REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;

export type BuyVoidProductionCanaryCandidateRecoveryArgsV1 = {
  request_id: string;
};

export type BuyVoidProductionCanaryCandidateRecoveryDecisionV1 =
  | {
      ok: true;
      status: "candidate_recovered";
      marker: typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1;
      version: 1;
      request_id: string;
      candidate_attempt_id: string;
      attempt_status: "reserved" | "prepared";
      candidate_handoff: "production_live_canary_preflight";
      runtime_policy_fingerprint_sha256: string;
      runtime_root_fingerprint_sha256: string;
      candidate_binding_fingerprint_sha256: string;
      recovery_evidence_id_sha256: string;
      matching_attempt_count: 1;
      journal_read_performed: true;
      mutation_performed: false;
      rpc_call_performed: false;
      credential_access_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1;
      version: 1;
      request_id: string | null;
      reason: string;
      matching_attempt_count?: number;
      journal_read_performed: boolean;
      mutation_performed: false;
      rpc_call_performed: false;
      credential_access_performed: false;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1;
    };

export type BuyVoidProductionCanaryCandidateRecoveryDependenciesV1 = {
  resolve_policy?: typeof buyVoidNativeExecutionRuntimePolicyStateV1;
  list_attempts?: typeof listBuyVoidExecutionAttemptsV1;
};

const ZERO_AUTHORITY = {
  mutation_performed: false,
  rpc_call_performed: false,
  credential_access_performed: false,
  wallet_access_performed: false,
  signing_performed: false,
  transaction_broadcast_performed: false,
  money_movement_performed: false,
} as const;

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function held(
  requestId: string | null,
  reason: string,
  journalReadPerformed: boolean,
  matchingAttemptCount?: number,
): Extract<BuyVoidProductionCanaryCandidateRecoveryDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1,
    version: 1,
    request_id: requestId,
    reason,
    ...(matchingAttemptCount === undefined
      ? {}
      : { matching_attempt_count: matchingAttemptCount }),
    journal_read_performed: journalReadPerformed,
    ...ZERO_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1,
  };
}

function exactProductionExecutionPolicy(
  state: ReturnType<typeof buyVoidNativeExecutionRuntimePolicyStateV1>,
): boolean {
  if (state.configured !== true) return false;
  const execution = state.policy.execution_policy;
  return execution.attempt_journal_enabled === true &&
    Number(execution.max_attempts_per_payment) === 1 &&
    String(execution.chain_id) === "2050" &&
    Array.isArray(execution.fulfillment_wallet_allowlist) &&
    execution.fulfillment_wallet_allowlist.length === 1;
}

function cleanCandidateReason(
  attempt: BuyVoidExecutionAttemptStateV1,
  requestId: string,
): string | null {
  const reservation = attempt?.reservation;
  if (!reservation || reservation.request_id !== requestId) {
    return "candidate_recovery_request_binding_invalid";
  }
  if (
    !SHA256.test(String(reservation.attempt_id || "")) ||
    !SHA256.test(String(reservation.payment_key_sha256 || "")) ||
    !SHA256.test(String(reservation.request_key_sha256 || "")) ||
    !SHA256.test(String(reservation.intent_fingerprint || "")) ||
    !SAFE_CODE.test(String(reservation.instruction_id || ""))
  ) {
    return "candidate_recovery_reservation_boundary_invalid";
  }
  if (
    Number(reservation.attempt_number) !== 1 ||
    Number(reservation.max_attempts_per_payment) !== 1
  ) {
    return "candidate_recovery_attempt_policy_invalid";
  }
  if (attempt.status !== "reserved" && attempt.status !== "prepared") {
    return "candidate_recovery_attempt_not_clean";
  }
  if (
    attempt.broadcast !== null ||
    attempt.failure !== null ||
    attempt.postbroadcast_failure !== null ||
    attempt.confirmation !== null
  ) {
    return "candidate_recovery_attempt_not_clean";
  }
  if (attempt.status === "reserved" && attempt.prepared !== null) {
    return "candidate_recovery_attempt_state_invalid";
  }
  if (
    attempt.status === "prepared" &&
    (!attempt.prepared || attempt.prepared.attempt_id !== reservation.attempt_id)
  ) {
    return "candidate_recovery_attempt_state_invalid";
  }
  return null;
}

export function parseBuyVoidProductionCanaryCandidateRecoveryArgsV1(
  argv: readonly string[],
): BuyVoidProductionCanaryCandidateRecoveryArgsV1 {
  let requestId = "";
  let seenRequestId = false;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option !== "--request-id") {
      throw new Error(`unexpected_option:${option}`);
    }
    if (seenRequestId) throw new Error("duplicate_option:--request-id");
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("--request-id_value_required");
    }
    requestId = text(value);
    seenRequestId = true;
    index += 1;
  }
  if (!REQUEST_ID.test(requestId)) throw new Error("invalid_request_id");
  return { request_id: requestId };
}

export function recoverBuyVoidProductionCanaryCandidateV1(
  input: Readonly<{ request_id: unknown }>,
  dependencies: BuyVoidProductionCanaryCandidateRecoveryDependenciesV1 = {},
): BuyVoidProductionCanaryCandidateRecoveryDecisionV1 {
  const requestId = text(input?.request_id);
  if (!REQUEST_ID.test(requestId)) {
    return held(null, "candidate_recovery_exact_request_id_required", false);
  }

  const resolvePolicy =
    dependencies.resolve_policy || buyVoidNativeExecutionRuntimePolicyStateV1;
  let policyState: ReturnType<typeof buyVoidNativeExecutionRuntimePolicyStateV1>;
  try {
    policyState = resolvePolicy();
  } catch {
    return held(requestId, "candidate_recovery_runtime_policy_resolution_failed", false);
  }
  if (policyState.configured === false) {
    return held(requestId, "candidate_recovery_runtime_policy_not_configured", false);
  }
  if (policyState.policy.enabled !== false) {
    return held(requestId, "candidate_recovery_native_runtime_must_remain_disabled", false);
  }
  if (!exactProductionExecutionPolicy(policyState)) {
    return held(requestId, "candidate_recovery_execution_policy_invalid", false);
  }

  const rootDir = path.normalize(String(policyState.policy.root_dir || ""));
  if (!path.isAbsolute(rootDir) || rootDir === path.parse(rootDir).root) {
    return held(requestId, "candidate_recovery_runtime_root_invalid", false);
  }
  if (!SHA256.test(policyState.fingerprint_sha256)) {
    return held(requestId, "candidate_recovery_runtime_policy_fingerprint_invalid", false);
  }

  const listAttempts = dependencies.list_attempts || listBuyVoidExecutionAttemptsV1;
  let attempts: BuyVoidExecutionAttemptStateV1[];
  try {
    attempts = listAttempts(rootDir);
  } catch {
    return held(requestId, "candidate_recovery_attempt_journal_read_failed", true);
  }

  const matching = attempts.filter(
    (attempt) => attempt?.reservation?.request_id === requestId,
  );
  if (matching.length === 0) {
    return held(requestId, "candidate_recovery_attempt_not_found", true, 0);
  }
  if (matching.length !== 1) {
    return held(
      requestId,
      "candidate_recovery_attempt_ambiguous",
      true,
      matching.length,
    );
  }

  const candidate = matching[0];
  const candidateReason = cleanCandidateReason(candidate, requestId);
  if (candidateReason) {
    return held(requestId, candidateReason, true, 1);
  }

  const reservation = candidate.reservation;
  const attemptStatus = candidate.status as "reserved" | "prepared";
  const runtimeRootFingerprint = sha256Hex(rootDir);
  const candidateBindingFingerprint = sha256Hex([
    "void-buy-production-canary-candidate-binding-v1",
    `request_id=${requestId}`,
    `attempt_id=${reservation.attempt_id}`,
    `attempt_number=${reservation.attempt_number}`,
    `payment_key_sha256=${reservation.payment_key_sha256}`,
    `request_key_sha256=${reservation.request_key_sha256}`,
    `instruction_id=${reservation.instruction_id}`,
    `intent_fingerprint=${reservation.intent_fingerprint}`,
  ].join("\n"));
  const recoveryEvidenceId = sha256Hex([
    "void-buy-production-canary-candidate-recovery-v1",
    `request_id=${requestId}`,
    `candidate_attempt_id=${reservation.attempt_id}`,
    `attempt_status=${attemptStatus}`,
    `runtime_policy_fingerprint_sha256=${policyState.fingerprint_sha256}`,
    `runtime_root_fingerprint_sha256=${runtimeRootFingerprint}`,
    `candidate_binding_fingerprint_sha256=${candidateBindingFingerprint}`,
  ].join("\n"));

  return {
    ok: true,
    status: "candidate_recovered",
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_V1,
    version: 1,
    request_id: requestId,
    candidate_attempt_id: reservation.attempt_id,
    attempt_status: attemptStatus,
    candidate_handoff: "production_live_canary_preflight",
    runtime_policy_fingerprint_sha256: policyState.fingerprint_sha256,
    runtime_root_fingerprint_sha256: runtimeRootFingerprint,
    candidate_binding_fingerprint_sha256: candidateBindingFingerprint,
    recovery_evidence_id_sha256: recoveryEvidenceId,
    matching_attempt_count: 1,
    journal_read_performed: true,
    ...ZERO_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RECOVERY_AUTHORITY_V1,
  };
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_canary_candidate_recovery_v1.ts --request-id <request-id>",
    "",
    "Read-only recovery. The runtime root comes only from the canonical server-owned",
    "native-execution policy; there is no runtime-root, wallet, RPC, signer, or apply override.",
  ].join("\n");
}

function main(): void {
  try {
    const args = parseBuyVoidProductionCanaryCandidateRecoveryArgsV1(
      process.argv.slice(2),
    );
    const decision = recoverBuyVoidProductionCanaryCandidateV1(args);
    process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    if (!decision.ok) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(
      `${usage()}\n${text((error as Error)?.message || error)}\n`,
    );
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  /(?:^|[\\/])buy_void_production_canary_candidate_recovery_v1\.ts$/.test(
    process.argv[1],
  )
) {
  main();
}
