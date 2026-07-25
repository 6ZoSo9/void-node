import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1 =
  "buyVoidExecuteFreshCandidateAutoClaimActivationCeremonyOneShot";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_AUTHORITY_V1 = {
  dry_by_default: true,
  exact_one_planned_request_required: true,
  exact_alert_binding_required: true,
  separate_issuance_confirmation_required: true,
  separate_execution_confirmation_required: true,
  maximum_issuer_invocations: 1,
  maximum_runner_invocations: 1,
  maximum_credential_ttl_seconds: 900,
  credential_content_printed: false,
  sensitive_values_printed: false,
  automatic_retry: false,
  systemd_change: false,
  service_restart: false,
  persistent_config_write: false,
  request_journal_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidActivationCeremonyPlanV1 = {
  status?: unknown;
  planned?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  activation_plan_fingerprint_sha256?: unknown;
  one_shot?: unknown;
  maximum_claim_count?: unknown;
  permanent_authority?: unknown;
  required_post_run_restore?: unknown;
};

export type BuyVoidActivationCeremonyAlertV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  alert_fingerprint_sha256?: unknown;
};

export type BuyVoidActivationCeremonyDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      approved: false;
      mutation_performed: false;
      reason: "activation_plan_waiting";
      issuer_invocation_count: 0;
      runner_invocation_count: 0;
      credential_created: false;
      credential_consumed: false;
    }
  | {
      ok: true;
      status: "ready";
      approved: false;
      mutation_performed: false;
      request_id: string;
      activation_plan_fingerprint_sha256: string;
      alert_fingerprint_sha256: string;
      required_issuer_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1;
      required_execution_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1;
      issuer_invocation_count: 0;
      runner_invocation_count: 0;
      credential_created: false;
      credential_consumed: false;
    }
  | {
      ok: true;
      status: "approved";
      approved: true;
      mutation_performed: false;
      request_id: string;
      activation_plan_fingerprint_sha256: string;
      alert_fingerprint_sha256: string;
      persistent_config_sha256: string;
      issuer_release_commit: string;
      runner_release_commit: string;
      executor_release_commit: string;
      maximum_issuer_invocations: 1;
      maximum_runner_invocations: 1;
      credential_ttl_seconds: number;
      issuer_invocation_count: 0;
      runner_invocation_count: 0;
      credential_created: false;
      credential_consumed: false;
    }
  | {
      ok: false;
      status: "held";
      approved: false;
      mutation_performed: false;
      reason: string;
      issuer_invocation_count: 0;
      runner_invocation_count: 0;
      credential_created: false;
      credential_consumed: false;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const SAFE_COMMIT = /^[0-9a-f]{40}$/;
const MAX_TTL_SECONDS = 900;

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function lower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function falseKeys(value: unknown, keys: string[]): string[] {
  const candidate = record(value) || {};
  return keys.filter((key) => candidate[key] !== false);
}

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidActivationCeremonyDecisionV1 {
  return {
    ok: false,
    status: "held",
    approved: false,
    mutation_performed: false,
    reason,
    issuer_invocation_count: 0,
    runner_invocation_count: 0,
    credential_created: false,
    credential_consumed: false,
    ...(detail ? { detail } : {}),
  };
}

export function authorizeBuyVoidFreshCandidateAutoClaimActivationCeremonyV1(
  input: {
    activation_plan: BuyVoidActivationCeremonyPlanV1;
    alert?: BuyVoidActivationCeremonyAlertV1 | null;
    persistent_config_sha256: unknown;
    issuer_release_commit: unknown;
    runner_release_commit: unknown;
    executor_release_commit: unknown;
    credential_ttl_seconds?: number;
    activate?: boolean;
    issuer_confirmation?: unknown;
    execution_confirmation?: unknown;
  },
): BuyVoidActivationCeremonyDecisionV1 {
  const plan = input?.activation_plan || {};

  if (
    normalized(plan.status) === "waiting"
    && plan.planned === false
  ) {
    return {
      ok: true,
      status: "waiting",
      approved: false,
      mutation_performed: false,
      reason: "activation_plan_waiting",
      issuer_invocation_count: 0,
      runner_invocation_count: 0,
      credential_created: false,
      credential_consumed: false,
    };
  }

  const requestId = normalized(plan.request_id);
  const sourcePlanFingerprint = lower(
    plan.plan_fingerprint_sha256,
  );
  const activationPlanFingerprint = lower(
    plan.activation_plan_fingerprint_sha256,
  );

  if (
    normalized(plan.status) !== "planned"
    || plan.planned !== true
    || plan.one_shot !== true
    || Number(plan.maximum_claim_count) !== 1
    || !SAFE_REQUEST_ID.test(requestId)
    || !SAFE_SHA256.test(sourcePlanFingerprint)
    || !SAFE_SHA256.test(activationPlanFingerprint)
  ) {
    return held("valid_exact_one_activation_plan_required");
  }

  const permanentFailures = falseKeys(
    plan.permanent_authority,
    [
      "wallet_access",
      "signing",
      "transaction_broadcast",
      "money_movement",
      "inventory_decrement",
    ],
  );
  if (permanentFailures.length > 0) {
    return held(
      "safe_permanent_authority_required",
      { failures: permanentFailures },
    );
  }

  const restoreFailures = falseKeys(
    plan.required_post_run_restore,
    [
      "config_enabled",
      "worker_enabled",
      "automatic_fulfillment_enabled",
      "apply_requested",
      "confirmation_supplied",
      "network_access_authorized",
      "runtime_root_write_authorized",
    ],
  );
  if (restoreFailures.length > 0) {
    return held(
      "exact_post_run_restore_contract_required",
      { failures: restoreFailures },
    );
  }

  const alert = input?.alert || {};
  const alertFingerprint = lower(
    alert.alert_fingerprint_sha256,
  );

  if (
    normalized(alert.schema)
      !== "void_buy_void_observe_and_claim_candidate_alert_v1"
    || normalized(alert.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1"
    || Number(alert.version) !== 1
    || normalized(alert.request_id) !== requestId
    || lower(alert.plan_fingerprint_sha256)
      !== sourcePlanFingerprint
    || !SAFE_SHA256.test(alertFingerprint)
  ) {
    return held("exact_alert_binding_required");
  }

  const persistentConfigSha = lower(
    input.persistent_config_sha256,
  );
  const issuerReleaseCommit = lower(
    input.issuer_release_commit,
  );
  const runnerReleaseCommit = lower(
    input.runner_release_commit,
  );
  const executorReleaseCommit = lower(
    input.executor_release_commit,
  );
  const ttlSeconds = Number(
    input.credential_ttl_seconds ?? MAX_TTL_SECONDS,
  );

  if (!SAFE_SHA256.test(persistentConfigSha)) {
    return held("valid_persistent_config_sha256_required");
  }
  if (!SAFE_COMMIT.test(issuerReleaseCommit)) {
    return held("valid_issuer_release_commit_required");
  }
  if (!SAFE_COMMIT.test(runnerReleaseCommit)) {
    return held("valid_runner_release_commit_required");
  }
  if (!SAFE_COMMIT.test(executorReleaseCommit)) {
    return held("valid_executor_release_commit_required");
  }
  if (
    !Number.isSafeInteger(ttlSeconds)
    || ttlSeconds <= 0
    || ttlSeconds > MAX_TTL_SECONDS
  ) {
    return held(
      "credential_ttl_seconds_out_of_bounds",
      {
        requested_ttl_seconds:
          input.credential_ttl_seconds,
        maximum_ttl_seconds: MAX_TTL_SECONDS,
      },
    );
  }

  if (input.activate !== true) {
    return {
      ok: true,
      status: "ready",
      approved: false,
      mutation_performed: false,
      request_id: requestId,
      activation_plan_fingerprint_sha256:
        activationPlanFingerprint,
      alert_fingerprint_sha256: alertFingerprint,
      required_issuer_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
      required_execution_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
      issuer_invocation_count: 0,
      runner_invocation_count: 0,
      credential_created: false,
      credential_consumed: false,
    };
  }

  if (
    normalized(input.issuer_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1
  ) {
    return held(
      "exact_issuer_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
      },
    );
  }

  if (
    normalized(input.execution_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1
  ) {
    return held(
      "exact_execution_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
      },
    );
  }

  return {
    ok: true,
    status: "approved",
    approved: true,
    mutation_performed: false,
    request_id: requestId,
    activation_plan_fingerprint_sha256:
      activationPlanFingerprint,
    alert_fingerprint_sha256: alertFingerprint,
    persistent_config_sha256: persistentConfigSha,
    issuer_release_commit: issuerReleaseCommit,
    runner_release_commit: runnerReleaseCommit,
    executor_release_commit: executorReleaseCommit,
    maximum_issuer_invocations: 1,
    maximum_runner_invocations: 1,
    credential_ttl_seconds: ttlSeconds,
    issuer_invocation_count: 0,
    runner_invocation_count: 0,
    credential_created: false,
    credential_consumed: false,
  };
}
