import crypto from "node:crypto";
import {
  VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
} from "./buy_void_auto_claim_worker_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1 =
  "buyVoidApplyFreshCandidateAutoClaim";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_AUTHORITY_V1 = {
  one_alert_per_run: true,
  one_request_per_run: true,
  current_exact_one_readiness_required: true,
  exact_request_and_plan_binding: true,
  exact_outer_confirmation_required: true,
  exact_worker_confirmation_delegated: true,
  server_controlled_worker_input_required: true,
  duplicate_safe_receipt_required: true,
  request_journal_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
  automatic_retry: false,
  background_loop: false,
  startup_execution: false,
} as const;

export type BuyVoidFreshCandidateAutoClaimAlertV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  candidate_stage?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  readiness_report_sha256?: unknown;
  required_orchestrator_confirmation?: unknown;
  required_delegated_confirmation?: unknown;
  required_stage_confirmation?: unknown;
  required_canary_confirmation?: unknown;
  alert_fingerprint_sha256?: unknown;
  operator_action?: unknown;
  activation_performed?: unknown;
  authority?: unknown;
};

export type BuyVoidFreshCandidateAutoClaimReadinessV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  candidate_stage?: unknown;
  readiness_status?: unknown;
  eligible_candidate_count?: unknown;
  eligible_request_ids?: unknown;
  recommended_request_id?: unknown;
  recommended_plan_fingerprint_sha256?: unknown;
  recommended_orchestrator_confirmation?: unknown;
  recommended_delegated_confirmation?: unknown;
  recommended_stage_confirmation?: unknown;
  authority?: unknown;
};

export type BuyVoidFreshCandidateAutoClaimWorkerResultV1 =
  Record<string, unknown>;

export type BuyVoidFreshCandidateAutoClaimDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      request_id: string;
      alert_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1;
      delegated_worker_confirmation:
        typeof VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1;
    }
  | {
      ok: true;
      status: "claimed" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      request_id: string;
      alert_fingerprint_sha256: string;
      receipt_id_sha256: string;
      worker_status: "claimed" | "duplicate";
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      inventory_decrement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

const EXPECTED_ALERT_AUTHORITY: Record<string, unknown> = {
  network_state_write: false,
  operator_local_state_write: true,
  runtime_import_mounted: false,
  apply_requested: false,
  inventory_reservation: false,
  execution_attempt_reservation: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  rpc_mutation: false,
  money_movement: false,
  background_loop: false,
  startup_execution: false,
};

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value))
    .digest("hex");
}

function held(
  apply: boolean,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidFreshCandidateAutoClaimDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied: apply,
    mutation_performed: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function trueAuthorityPaths(
  value: unknown,
  prefix = "",
): string[] {
  const paths: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      paths.push(...trueAuthorityPaths(child, `${prefix}[${index}]`));
    });
    return paths;
  }
  const candidate = record(value);
  if (!candidate) return paths;

  for (const [key, child] of Object.entries(candidate)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const lowered = key.toLowerCase();
    const forbidden =
      lowered.includes("wallet_access")
      || lowered.includes("signing")
      || lowered.includes("transaction_broadcast")
      || lowered.includes("money_movement")
      || lowered.includes("inventory_decrement")
      || lowered.includes("automatic_execution");

    if (forbidden && child === true) paths.push(path);
    paths.push(...trueAuthorityPaths(child, path));
  }
  return paths;
}

function validateAlertAuthority(value: unknown): string[] {
  const candidate = record(value) || {};
  return Object.entries(EXPECTED_ALERT_AUTHORITY)
    .filter(([key, expected]) => candidate[key] !== expected)
    .map(([key]) => key);
}

export async function runBuyVoidFreshCandidateAutoClaimV1(input: {
  alert: BuyVoidFreshCandidateAutoClaimAlertV1;
  current_readiness: BuyVoidFreshCandidateAutoClaimReadinessV1;
  apply?: boolean;
  confirmation?: unknown;
  run_worker: (input: {
    request_id: string;
    worker_confirmation:
      typeof VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1;
  }) =>
    | BuyVoidFreshCandidateAutoClaimWorkerResultV1
    | Promise<BuyVoidFreshCandidateAutoClaimWorkerResultV1>;
}): Promise<BuyVoidFreshCandidateAutoClaimDecisionV1> {
  const apply = input?.apply === true;
  const alert = input?.alert || {};
  const readiness = input?.current_readiness || {};

  if (
    normalized(alert.schema)
      !== "void_buy_void_observe_and_claim_candidate_alert_v1"
    || normalized(alert.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1"
    || Number(alert.version) !== 1
    || normalized(alert.candidate_stage) !== "observe_and_claim"
    || normalized(alert.operator_action)
      !== "review_exact_one_candidate_for_separate_arming_lane"
    || normalized(alert.required_canary_confirmation)
      !== "buyVoidArmExactObserveAndClaimCanary"
    || alert.activation_performed !== false
  ) {
    return held(apply, "valid_fresh_candidate_alert_required");
  }

  const requestId = normalized(alert.request_id);
  const planFingerprint = normalizedLower(
    alert.plan_fingerprint_sha256,
  );
  const alertFingerprint = normalizedLower(
    alert.alert_fingerprint_sha256,
  );

  if (!SAFE_REQUEST_ID.test(requestId)) {
    return held(apply, "valid_alert_request_id_required");
  }
  if (!SAFE_SHA256.test(planFingerprint)) {
    return held(apply, "valid_alert_plan_fingerprint_required");
  }
  if (!SAFE_SHA256.test(alertFingerprint)) {
    return held(apply, "valid_alert_fingerprint_required");
  }

  const authorityFailures = validateAlertAuthority(alert.authority);
  if (authorityFailures.length > 0) {
    return held(apply, "read_only_alert_authority_required", {
      authority_failures: authorityFailures,
    });
  }

  if (
    normalized(readiness.schema)
      !== "void_buy_void_observe_and_claim_candidate_readiness_v1"
    || normalized(readiness.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1"
    || Number(readiness.version) !== 1
    || normalized(readiness.candidate_stage) !== "observe_and_claim"
    || normalized(readiness.readiness_status) !== "exact_one"
    || Number(readiness.eligible_candidate_count) !== 1
  ) {
    return held(apply, "current_exact_one_readiness_required");
  }

  const eligibleIds = Array.isArray(readiness.eligible_request_ids)
    ? readiness.eligible_request_ids.map(normalized).filter(Boolean)
    : [];

  if (
    eligibleIds.length !== 1
    || eligibleIds[0] !== requestId
    || normalized(readiness.recommended_request_id) !== requestId
  ) {
    return held(apply, "exact_current_request_binding_required");
  }

  if (
    normalizedLower(readiness.recommended_plan_fingerprint_sha256)
      !== planFingerprint
  ) {
    return held(apply, "exact_current_plan_binding_required");
  }

  const confirmationPairs: Array<[unknown, unknown, string]> = [
    [
      readiness.recommended_orchestrator_confirmation,
      alert.required_orchestrator_confirmation,
      "orchestrator",
    ],
    [
      readiness.recommended_delegated_confirmation,
      alert.required_delegated_confirmation,
      "delegated",
    ],
    [
      readiness.recommended_stage_confirmation,
      alert.required_stage_confirmation,
      "stage",
    ],
  ];

  for (const [current, alerted, label] of confirmationPairs) {
    if (!normalized(current) || normalized(current) !== normalized(alerted)) {
      return held(apply, "exact_current_confirmation_binding_required", {
        confirmation_kind: label,
      });
    }
  }

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      request_id: requestId,
      alert_fingerprint_sha256: alertFingerprint,
      required_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
      delegated_worker_confirmation:
        VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
    };
  }

  if (
    normalized(input.confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1
  ) {
    return held(true, "explicit_fresh_candidate_confirmation_required", {
      required_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    });
  }

  let workerResult: BuyVoidFreshCandidateAutoClaimWorkerResultV1;
  try {
    workerResult = await input.run_worker({
      request_id: requestId,
      worker_confirmation: VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1,
    });
  } catch (error) {
    return held(true, "auto_claim_worker_call_failed", {
      error_class: normalized(
        (error as { name?: unknown })?.name || "Error",
      ).slice(0, 80),
    });
  }

  const unsafePaths = trueAuthorityPaths(workerResult);
  if (unsafePaths.length > 0) {
    return held(true, "auto_claim_worker_authority_violation", {
      unsafe_paths: unsafePaths.slice(0, 20),
    });
  }

  if (workerResult.ok !== true) {
    return held(true, "auto_claim_worker_held", {
      worker_status: normalized(workerResult.status),
      worker_reason: normalized(workerResult.reason),
    });
  }

  const workerStatus = normalized(workerResult.status);
  if (workerStatus !== "claimed" && workerStatus !== "duplicate") {
    return held(true, "auto_claim_worker_terminal_status_required", {
      worker_status: workerStatus,
    });
  }

  const mutationPerformed = workerResult.mutation_performed === true;
  if (
    (workerStatus === "claimed" && !mutationPerformed)
    || (workerStatus === "duplicate" && mutationPerformed)
  ) {
    return held(true, "auto_claim_worker_mutation_status_mismatch");
  }

  return {
    ok: true,
    status: workerStatus,
    applied: true,
    mutation_performed: mutationPerformed,
    request_id: requestId,
    alert_fingerprint_sha256: alertFingerprint,
    receipt_id_sha256: sha256({
      schema: "void_buy_void_fresh_candidate_auto_claim_receipt_v1",
      request_id: requestId,
      alert_fingerprint_sha256: alertFingerprint,
      worker_status: workerStatus,
      mutation_performed: mutationPerformed,
    }),
    worker_status: workerStatus,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    inventory_decrement_performed: false,
  };
}
