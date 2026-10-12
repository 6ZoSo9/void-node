import crypto from "node:crypto";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1 =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1 =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1";

export type BuyVoidObserveAndClaimReadinessReportV1 = {
  schema: string;
  marker: string;
  version: number;
  candidate_stage: string;
  readiness_status: "none" | "exact_one" | "multiple";
  eligible_candidate_count: number;
  eligible_request_ids: string[];
  recommended_request_id: string | null;
  recommended_plan_fingerprint_sha256: string | null;
  recommended_orchestrator_confirmation: string | null;
  recommended_delegated_confirmation: string | null;
  recommended_stage_confirmation: string | null;
  authority: Record<string, unknown>;
};

export type BuyVoidObserveAndClaimCandidateWatchStateV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_watch_state_v1";
  version: 1;
  last_alert_fingerprint_sha256: string | null;
  last_request_id: string | null;
  last_plan_fingerprint_sha256: string | null;
  last_readiness_report_sha256: string | null;
  updated_at: string | null;
};

export type BuyVoidObserveAndClaimCandidateAlertV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_alert_v1";
  marker:
    typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1;
  version: 1;
  candidate_stage: "observe_and_claim";
  request_id: string;
  plan_fingerprint_sha256: string;
  readiness_report_sha256: string;
  required_orchestrator_confirmation: string;
  required_delegated_confirmation: string;
  required_stage_confirmation: string;
  required_canary_confirmation: "buyVoidArmExactObserveAndClaimCanary";
  alert_fingerprint_sha256: string;
  operator_action: "review_exact_one_candidate_for_separate_arming_lane";
  activation_performed: false;
  authority: {
    network_state_write: false;
    operator_local_state_write: true;
    runtime_import_mounted: false;
    apply_requested: false;
    inventory_reservation: false;
    execution_attempt_reservation: false;
    wallet_access: false;
    signing: false;
    transaction_broadcast: false;
    rpc_mutation: false;
    money_movement: false;
    background_loop: false;
    startup_execution: false;
  };
};

export type BuyVoidObserveAndClaimCandidateWatchDecisionV1 =
  | {
      ok: true;
      status: "none";
      alert_required: false;
      reason: "no_eligible_candidate";
      alert: null;
      next_state: BuyVoidObserveAndClaimCandidateWatchStateV1;
    }
  | {
      ok: true;
      status: "duplicate";
      alert_required: false;
      reason: "exact_one_candidate_already_alerted";
      alert: BuyVoidObserveAndClaimCandidateAlertV1;
      next_state: BuyVoidObserveAndClaimCandidateWatchStateV1;
    }
  | {
      ok: true;
      status: "alert";
      alert_required: true;
      reason: "new_exact_one_candidate";
      alert: BuyVoidObserveAndClaimCandidateAlertV1;
      next_state: BuyVoidObserveAndClaimCandidateWatchStateV1;
    }
  | {
      ok: false;
      status: "held";
      alert_required: false;
      reason: string;
      alert: null;
      next_state: BuyVoidObserveAndClaimCandidateWatchStateV1;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function safeText(value: unknown): string | null {
  const text = normalized(value);
  return text || null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) =>
        `${JSON.stringify(key)}:${canonical(record[key])}`,
      )
      .join(",")}}`;
  }
  const rendered = JSON.stringify(value);
  return rendered === undefined ? "null" : rendered;
}

function sha256(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value))
    .digest("hex");
}

export function defaultBuyVoidObserveAndClaimCandidateWatchStateV1():
  BuyVoidObserveAndClaimCandidateWatchStateV1 {
  return {
    schema:
      "void_buy_void_observe_and_claim_candidate_watch_state_v1",
    version: 1,
    last_alert_fingerprint_sha256: null,
    last_request_id: null,
    last_plan_fingerprint_sha256: null,
    last_readiness_report_sha256: null,
    updated_at: null,
  };
}

function normalizeState(
  value:
    | Partial<BuyVoidObserveAndClaimCandidateWatchStateV1>
    | undefined,
): BuyVoidObserveAndClaimCandidateWatchStateV1 {
  const fallback =
    defaultBuyVoidObserveAndClaimCandidateWatchStateV1();
  const alertFingerprint = normalizedLower(
    value?.last_alert_fingerprint_sha256,
  );
  const requestId = normalized(value?.last_request_id);
  const planFingerprint = normalizedLower(
    value?.last_plan_fingerprint_sha256,
  );
  const reportFingerprint = normalizedLower(
    value?.last_readiness_report_sha256,
  );

  return {
    ...fallback,
    last_alert_fingerprint_sha256:
      SAFE_SHA256.test(alertFingerprint)
        ? alertFingerprint
        : null,
    last_request_id:
      SAFE_REQUEST_ID.test(requestId)
        ? requestId
        : null,
    last_plan_fingerprint_sha256:
      SAFE_SHA256.test(planFingerprint)
        ? planFingerprint
        : null,
    last_readiness_report_sha256:
      SAFE_SHA256.test(reportFingerprint)
        ? reportFingerprint
        : null,
    updated_at: safeText(value?.updated_at),
  };
}

function held(
  reason: string,
  state: BuyVoidObserveAndClaimCandidateWatchStateV1,
  detail?: Record<string, unknown>,
): BuyVoidObserveAndClaimCandidateWatchDecisionV1 {
  return {
    ok: false,
    status: "held",
    alert_required: false,
    reason,
    alert: null,
    next_state: state,
    ...(detail ? { detail } : {}),
  };
}

function authorityFailures(
  authority: Record<string, unknown>,
): string[] {
  const expected: Record<string, unknown> = {
    read_only: true,
    server_derived_snapshot_required: true,
    exact_request_id_only: true,
    runtime_import_mounted: false,
    apply_requested: false,
    filesystem_write_to_network_state: false,
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
  return Object.entries(expected)
    .filter(([key, value]) => authority[key] !== value)
    .map(([key]) => key);
}

export function evaluateBuyVoidObserveAndClaimCandidateWatchV1(
  input: {
    readiness_report: BuyVoidObserveAndClaimReadinessReportV1;
    readiness_report_sha256: string;
    previous_state?:
      Partial<BuyVoidObserveAndClaimCandidateWatchStateV1>;
    observed_at?: string;
  },
): BuyVoidObserveAndClaimCandidateWatchDecisionV1 {
  const report = input.readiness_report;
  const state = normalizeState(input.previous_state);
  const reportSha = normalizedLower(
    input.readiness_report_sha256,
  );
  const observedAt =
    safeText(input.observed_at) || new Date().toISOString();

  if (!SAFE_SHA256.test(reportSha)) {
    return held("valid_readiness_report_sha256_required", state);
  }
  if (
    report.schema
      !== "void_buy_void_observe_and_claim_candidate_readiness_v1"
    || report.marker
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1"
    || report.version !== 1
    || report.candidate_stage !== "observe_and_claim"
  ) {
    return held("valid_candidate_readiness_report_required", state);
  }

  const failures = authorityFailures(report.authority || {});
  if (failures.length > 0) {
    return held(
      "read_only_authority_required",
      state,
      { authority_failures: failures },
    );
  }

  const eligibleIds = Array.isArray(report.eligible_request_ids)
    ? report.eligible_request_ids
        .map((value) => normalized(value))
        .filter((value) => SAFE_REQUEST_ID.test(value))
        .sort()
    : [];
  const eligibleCount = Number(
    report.eligible_candidate_count,
  );

  if (
    !Number.isSafeInteger(eligibleCount)
    || eligibleCount < 0
    || eligibleCount !== eligibleIds.length
  ) {
    return held(
      "eligible_candidate_count_mismatch",
      state,
      {
        eligible_candidate_count: eligibleCount,
        eligible_request_id_count: eligibleIds.length,
      },
    );
  }

  if (report.readiness_status === "none") {
    if (eligibleCount !== 0) {
      return held("none_state_requires_zero_candidates", state);
    }
    return {
      ok: true,
      status: "none",
      alert_required: false,
      reason: "no_eligible_candidate",
      alert: null,
      next_state: {
        ...state,
        last_readiness_report_sha256: reportSha,
        updated_at: observedAt,
      },
    };
  }

  if (report.readiness_status === "multiple") {
    if (eligibleCount < 2) {
      return held(
        "multiple_state_requires_multiple_candidates",
        state,
      );
    }
    return held(
      "multiple_eligible_candidates_require_operator_selection",
      {
        ...state,
        last_readiness_report_sha256: reportSha,
        updated_at: observedAt,
      },
      { eligible_request_ids: eligibleIds },
    );
  }

  if (report.readiness_status !== "exact_one") {
    return held("supported_readiness_status_required", state);
  }
  if (eligibleCount !== 1) {
    return held("exact_one_state_requires_one_candidate", state);
  }

  const requestId = normalized(
    report.recommended_request_id,
  );
  const planFingerprint = normalizedLower(
    report.recommended_plan_fingerprint_sha256,
  );
  const orchestratorConfirmation = normalized(
    report.recommended_orchestrator_confirmation,
  );
  const delegatedConfirmation = normalized(
    report.recommended_delegated_confirmation,
  );
  const stageConfirmation = normalized(
    report.recommended_stage_confirmation,
  );

  if (
    !SAFE_REQUEST_ID.test(requestId)
    || requestId !== eligibleIds[0]
  ) {
    return held("exact_recommended_request_id_required", state);
  }
  if (!SAFE_SHA256.test(planFingerprint)) {
    return held("exact_plan_fingerprint_required", state);
  }
  if (
    !orchestratorConfirmation
    || !delegatedConfirmation
    || !stageConfirmation
  ) {
    return held("all_required_confirmations_required", state);
  }

  const alertBase = {
    schema:
      "void_buy_void_observe_and_claim_candidate_alert_v1" as const,
    marker:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1 as typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1,
    version: 1 as const,
    candidate_stage: "observe_and_claim" as const,
    request_id: requestId,
    plan_fingerprint_sha256: planFingerprint,
    readiness_report_sha256: reportSha,
    required_orchestrator_confirmation:
      orchestratorConfirmation,
    required_delegated_confirmation:
      delegatedConfirmation,
    required_stage_confirmation:
      stageConfirmation,
    required_canary_confirmation:
      "buyVoidArmExactObserveAndClaimCanary" as const,
    operator_action:
      "review_exact_one_candidate_for_separate_arming_lane" as const,
    activation_performed: false as const,
    authority: {
      network_state_write: false as const,
      operator_local_state_write: true as const,
      runtime_import_mounted: false as const,
      apply_requested: false as const,
      inventory_reservation: false as const,
      execution_attempt_reservation: false as const,
      wallet_access: false as const,
      signing: false as const,
      transaction_broadcast: false as const,
      rpc_mutation: false as const,
      money_movement: false as const,
      background_loop: false as const,
      startup_execution: false as const,
    },
  };
  const alertFingerprint = sha256({
    schema: alertBase.schema,
    marker: alertBase.marker,
    version: alertBase.version,
    candidate_stage: alertBase.candidate_stage,
    request_id: alertBase.request_id,
    plan_fingerprint_sha256:
      alertBase.plan_fingerprint_sha256,
    required_orchestrator_confirmation:
      alertBase.required_orchestrator_confirmation,
    required_delegated_confirmation:
      alertBase.required_delegated_confirmation,
    required_stage_confirmation:
      alertBase.required_stage_confirmation,
    required_canary_confirmation:
      alertBase.required_canary_confirmation,
    operator_action: alertBase.operator_action,
  });
  const alert: BuyVoidObserveAndClaimCandidateAlertV1 = {
    ...alertBase,
    alert_fingerprint_sha256: alertFingerprint,
  };
  const nextState: BuyVoidObserveAndClaimCandidateWatchStateV1 = {
    schema:
      "void_buy_void_observe_and_claim_candidate_watch_state_v1",
    version: 1,
    last_alert_fingerprint_sha256: alertFingerprint,
    last_request_id: requestId,
    last_plan_fingerprint_sha256: planFingerprint,
    last_readiness_report_sha256: reportSha,
    updated_at: observedAt,
  };

  if (
    state.last_alert_fingerprint_sha256
      === alertFingerprint
  ) {
    return {
      ok: true,
      status: "duplicate",
      alert_required: false,
      reason: "exact_one_candidate_already_alerted",
      alert,
      next_state: nextState,
    };
  }

  return {
    ok: true,
    status: "alert",
    alert_required: true,
    reason: "new_exact_one_candidate",
    alert,
    next_state: nextState,
  };
}
