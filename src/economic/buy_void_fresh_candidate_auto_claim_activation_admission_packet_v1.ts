import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_AUTHORITY_V1 = {
  read_only: true,
  operator_approval_required: true,
  automatic_execution: false,
  exact_one_planned_request_required: true,
  exact_alert_binding_required: true,
  persistent_config_disabled_required: true,
  maximum_credential_ttl_seconds: 900,
  maximum_issuer_invocations: 1,
  maximum_runner_invocations: 1,
  process_spawn: false,
  credential_created: false,
  credential_consumed: false,
  credential_content_printed: false,
  sensitive_values_printed: false,
  automatic_retry: false,
  systemd_change: false,
  service_restart: false,
  persistent_config_write: false,
  claim_write: false,
  request_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidActivationAdmissionPlanV1 = {
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

export type BuyVoidActivationAdmissionAlertV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  alert_fingerprint_sha256?: unknown;
};

export type BuyVoidActivationAdmissionPacketDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      admitted: false;
      reason: "activation_plan_waiting";
      mutation_performed: false;
    }
  | {
      ok: true;
      status: "admitted";
      admitted: true;
      mutation_performed: false;
      request_id: string;
      plan_fingerprint_sha256: string;
      activation_plan_fingerprint_sha256: string;
      alert_fingerprint_sha256: string;
      persistent_config_sha256: string;
      ceremony_release_commit: string;
      issuer_release_commit: string;
      runner_release_commit: string;
      executor_release_commit: string;
      maximum_credential_ttl_seconds: 900;
      maximum_issuer_invocations: 1;
      maximum_runner_invocations: 1;
      required_issuer_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1;
      required_execution_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1;
      operator_approval_required: true;
      automatic_execution: false;
    }
  | {
      ok: false;
      status: "held";
      admitted: false;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const SAFE_COMMIT = /^[0-9a-f]{40}$/;

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
): BuyVoidActivationAdmissionPacketDecisionV1 {
  return {
    ok: false,
    status: "held",
    admitted: false,
    mutation_performed: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

export function buildBuyVoidFreshCandidateAutoClaimActivationAdmissionPacketV1(
  input: {
    activation_plan: BuyVoidActivationAdmissionPlanV1;
    alert?: BuyVoidActivationAdmissionAlertV1 | null;
    persistent_config_sha256: unknown;
    persistent_config_disabled: boolean;
    ceremony_release_commit: unknown;
    issuer_release_commit: unknown;
    runner_release_commit: unknown;
    executor_release_commit: unknown;
  },
): BuyVoidActivationAdmissionPacketDecisionV1 {
  const plan = input?.activation_plan || {};

  if (
    normalized(plan.status) === "waiting"
    && plan.planned === false
  ) {
    return {
      ok: true,
      status: "waiting",
      admitted: false,
      reason: "activation_plan_waiting",
      mutation_performed: false,
    };
  }

  const requestId = normalized(plan.request_id);
  const planFingerprint = lower(
    plan.plan_fingerprint_sha256,
  );
  const activationFingerprint = lower(
    plan.activation_plan_fingerprint_sha256,
  );

  if (
    normalized(plan.status) !== "planned"
    || plan.planned !== true
    || plan.one_shot !== true
    || Number(plan.maximum_claim_count) !== 1
    || !SAFE_REQUEST_ID.test(requestId)
    || !SAFE_SHA256.test(planFingerprint)
    || !SAFE_SHA256.test(activationFingerprint)
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
      !== planFingerprint
    || !SAFE_SHA256.test(alertFingerprint)
  ) {
    return held("exact_alert_binding_required");
  }

  const persistentConfigSha = lower(
    input.persistent_config_sha256,
  );
  const ceremonyCommit = lower(
    input.ceremony_release_commit,
  );
  const issuerCommit = lower(
    input.issuer_release_commit,
  );
  const runnerCommit = lower(
    input.runner_release_commit,
  );
  const executorCommit = lower(
    input.executor_release_commit,
  );

  if (input.persistent_config_disabled !== true) {
    return held("persistent_config_must_remain_disabled");
  }
  if (!SAFE_SHA256.test(persistentConfigSha)) {
    return held("valid_persistent_config_sha256_required");
  }

  for (const [label, value] of [
    ["ceremony", ceremonyCommit],
    ["issuer", issuerCommit],
    ["runner", runnerCommit],
    ["executor", executorCommit],
  ] as const) {
    if (!SAFE_COMMIT.test(value)) {
      return held(
        `valid_${label}_release_commit_required`,
      );
    }
  }

  return {
    ok: true,
    status: "admitted",
    admitted: true,
    mutation_performed: false,
    request_id: requestId,
    plan_fingerprint_sha256: planFingerprint,
    activation_plan_fingerprint_sha256:
      activationFingerprint,
    alert_fingerprint_sha256: alertFingerprint,
    persistent_config_sha256: persistentConfigSha,
    ceremony_release_commit: ceremonyCommit,
    issuer_release_commit: issuerCommit,
    runner_release_commit: runnerCommit,
    executor_release_commit: executorCommit,
    maximum_credential_ttl_seconds: 900,
    maximum_issuer_invocations: 1,
    maximum_runner_invocations: 1,
    required_issuer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
    required_execution_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
    operator_approval_required: true,
    automatic_execution: false,
  };
}
