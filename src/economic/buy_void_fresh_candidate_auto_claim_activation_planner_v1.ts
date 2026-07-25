import crypto from "node:crypto";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ARM_CONFIRMATION_V1 =
  "buyVoidArmFreshCandidateAutoClaimOneShot";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_AUTHORITY_V1 = {
  read_only: true,
  one_candidate_required: true,
  exact_alert_binding_required: true,
  disabled_deployment_required: true,
  deterministic_plan_only: true,
  config_write: false,
  unit_file_write: false,
  service_change: false,
  apply_requested: false,
  confirmation_supplied: false,
  rpc_call: false,
  runtime_root_write: false,
  claim_write: false,
  request_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidFreshCandidateActivationPlannerConfigV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  enabled?: unknown;
  worker_policy?: unknown;
  fulfillment_policy?: unknown;
  disabled_authority?: unknown;
};

export type BuyVoidFreshCandidateActivationPlannerReadinessV1 = {
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

export type BuyVoidFreshCandidateActivationPlannerWatchV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  readiness_status?: unknown;
  eligible_candidate_count?: unknown;
  recommended_request_id?: unknown;
  watch_status?: unknown;
  alert_path?: unknown;
  alert?: unknown;
  activation_performed?: unknown;
  apply_requested?: unknown;
  wallet_access?: unknown;
  signing?: unknown;
  transaction_broadcast?: unknown;
  money_movement?: unknown;
};

export type BuyVoidFreshCandidateActivationPlannerHealthV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  status?: unknown;
  deployment_enabled?: unknown;
  apply_requested?: unknown;
  confirmation_supplied?: unknown;
  network_access_authorized?: unknown;
  runtime_root_write_authorized?: unknown;
  claim_changes?: unknown;
  request_changes?: unknown;
  inventory_changes?: unknown;
  wallet_access?: unknown;
  signing?: unknown;
  transaction_broadcast?: unknown;
  money_movement?: unknown;
};

export type BuyVoidFreshCandidateActivationPlanDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      planned: false;
      reason: "no_eligible_candidate";
      mutation_performed: false;
    }
  | {
      ok: true;
      status: "planned";
      planned: true;
      mutation_performed: false;
      request_id: string;
      plan_fingerprint_sha256: string;
      activation_plan_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ARM_CONFIRMATION_V1;
      one_shot: true;
      maximum_claim_count: 1;
      preconditions: {
        current_exact_one_readiness: true;
        exact_alert_binding: true;
        disabled_config: true;
        disabled_service_authority: true;
      };
      temporary_authority_delta: {
        config_enabled: true;
        worker_enabled: true;
        automatic_fulfillment_enabled: true;
        apply_requested: true;
        exact_confirmation_supplied: true;
        base_rpc_read_only: true;
        runtime_root_claim_write: true;
      };
      permanent_authority: {
        wallet_access: false;
        signing: false;
        transaction_broadcast: false;
        money_movement: false;
        inventory_decrement: false;
      };
      required_post_run_restore: {
        config_enabled: false;
        worker_enabled: false;
        automatic_fulfillment_enabled: false;
        apply_requested: false;
        confirmation_supplied: false;
        network_access_authorized: false;
        runtime_root_write_authorized: false;
      };
    }
  | {
      ok: false;
      status: "held";
      planned: false;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

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
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidFreshCandidateActivationPlanDecisionV1 {
  return {
    ok: false,
    status: "held",
    planned: false,
    mutation_performed: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function falseKeys(
  value: unknown,
  keys: string[],
): string[] {
  const candidate = record(value) || {};
  return keys.filter((key) => candidate[key] !== false);
}

export function planBuyVoidFreshCandidateAutoClaimActivationV1(input: {
  config: BuyVoidFreshCandidateActivationPlannerConfigV1;
  readiness: BuyVoidFreshCandidateActivationPlannerReadinessV1;
  watch: BuyVoidFreshCandidateActivationPlannerWatchV1;
  health: BuyVoidFreshCandidateActivationPlannerHealthV1;
}): BuyVoidFreshCandidateActivationPlanDecisionV1 {
  const config = input?.config || {};
  const readiness = input?.readiness || {};
  const watch = input?.watch || {};
  const health = input?.health || {};

  if (
    normalized(config.schema)
      !== "void_buy_void_fresh_candidate_auto_claim_config_v1"
    || normalized(config.marker)
      !== "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIG_V1"
    || Number(config.version) !== 1
  ) {
    return held("valid_disabled_config_required");
  }

  const workerPolicy = record(config.worker_policy) || {};
  const fulfillmentPolicy = record(config.fulfillment_policy) || {};
  const disabledAuthority = record(config.disabled_authority) || {};

  if (
    config.enabled !== false
    || workerPolicy.enabled !== false
    || fulfillmentPolicy.automatic_fulfillment_enabled !== false
  ) {
    return held("all_disabled_config_gates_required");
  }

  const disabledAuthorityFailures = falseKeys(
    disabledAuthority,
    [
      "top_level_enabled",
      "worker_enabled",
      "automatic_fulfillment_enabled",
      "systemd_exec_apply",
      "systemd_exec_confirmation",
      "systemd_network_access",
      "runtime_root_write_access",
      "wallet_access",
      "signing",
      "transaction_broadcast",
      "money_movement",
    ],
  );
  if (disabledAuthorityFailures.length > 0) {
    return held("disabled_config_authority_required", {
      failures: disabledAuthorityFailures,
    });
  }

  const healthFailures = falseKeys(
    health,
    [
      "deployment_enabled",
      "apply_requested",
      "confirmation_supplied",
      "network_access_authorized",
      "runtime_root_write_authorized",
      "claim_changes",
      "request_changes",
      "inventory_changes",
      "wallet_access",
      "signing",
      "transaction_broadcast",
      "money_movement",
    ],
  );
  if (healthFailures.length > 0) {
    return held("disabled_runtime_health_required", {
      failures: healthFailures,
    });
  }

  if (
    normalized(readiness.schema)
      !== "void_buy_void_observe_and_claim_candidate_readiness_v1"
    || normalized(readiness.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1"
    || Number(readiness.version) !== 1
    || normalized(readiness.candidate_stage) !== "observe_and_claim"
  ) {
    return held("valid_current_readiness_required");
  }

  const readinessStatus = normalized(readiness.readiness_status);
  const candidateCount = Number(readiness.eligible_candidate_count);

  if (readinessStatus === "none" && candidateCount === 0) {
    return {
      ok: true,
      status: "waiting",
      planned: false,
      reason: "no_eligible_candidate",
      mutation_performed: false,
    };
  }

  if (readinessStatus === "multiple" || candidateCount > 1) {
    return held("multiple_candidates_require_operator_selection");
  }

  if (readinessStatus !== "exact_one" || candidateCount !== 1) {
    return held("current_exact_one_readiness_required");
  }

  const eligibleIds = Array.isArray(readiness.eligible_request_ids)
    ? readiness.eligible_request_ids.map(normalized).filter(Boolean)
    : [];

  const requestId = normalized(readiness.recommended_request_id);
  const planFingerprint = lower(
    readiness.recommended_plan_fingerprint_sha256,
  );

  if (
    eligibleIds.length !== 1
    || eligibleIds[0] !== requestId
    || !SAFE_REQUEST_ID.test(requestId)
  ) {
    return held("exact_current_request_binding_required");
  }

  if (!SAFE_SHA256.test(planFingerprint)) {
    return held("exact_current_plan_fingerprint_required");
  }

  if (
    normalized(watch.schema)
      !== "void_buy_void_observe_and_claim_candidate_watch_result_v1"
    || normalized(watch.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1"
    || Number(watch.version) !== 1
    || !["alert", "duplicate"].includes(normalized(watch.watch_status))
    || normalized(watch.recommended_request_id) !== requestId
    || watch.activation_performed !== false
    || watch.apply_requested !== false
    || watch.wallet_access !== false
    || watch.signing !== false
    || watch.transaction_broadcast !== false
    || watch.money_movement !== false
  ) {
    return held("exact_candidate_watch_binding_required");
  }

  const alert = record(watch.alert);
  if (!alert) return held("candidate_alert_required");

  if (
    normalized(alert.schema)
      !== "void_buy_void_observe_and_claim_candidate_alert_v1"
    || normalized(alert.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1"
    || normalized(alert.request_id) !== requestId
    || lower(alert.plan_fingerprint_sha256) !== planFingerprint
    || !SAFE_SHA256.test(lower(alert.alert_fingerprint_sha256))
  ) {
    return held("exact_alert_identity_required");
  }

  return {
    ok: true,
    status: "planned",
    planned: true,
    mutation_performed: false,
    request_id: requestId,
    plan_fingerprint_sha256: planFingerprint,
    activation_plan_fingerprint_sha256: sha256({
      schema:
        "void_buy_void_fresh_candidate_auto_claim_activation_plan_v1",
      request_id: requestId,
      plan_fingerprint_sha256: planFingerprint,
      alert_fingerprint_sha256:
        lower(alert.alert_fingerprint_sha256),
      required_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ARM_CONFIRMATION_V1,
      maximum_claim_count: 1,
    }),
    required_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ARM_CONFIRMATION_V1,
    one_shot: true,
    maximum_claim_count: 1,
    preconditions: {
      current_exact_one_readiness: true,
      exact_alert_binding: true,
      disabled_config: true,
      disabled_service_authority: true,
    },
    temporary_authority_delta: {
      config_enabled: true,
      worker_enabled: true,
      automatic_fulfillment_enabled: true,
      apply_requested: true,
      exact_confirmation_supplied: true,
      base_rpc_read_only: true,
      runtime_root_claim_write: true,
    },
    permanent_authority: {
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      money_movement: false,
      inventory_decrement: false,
    },
    required_post_run_restore: {
      config_enabled: false,
      worker_enabled: false,
      automatic_fulfillment_enabled: false,
      apply_requested: false,
      confirmation_supplied: false,
      network_access_authorized: false,
      runtime_root_write_authorized: false,
    },
  };
}
