import crypto from "node:crypto";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_NOTIFICATION_BRIDGE_V1 =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_NOTIFICATION_BRIDGE_V1";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1 =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1";

export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_HEALTH_V1 =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_HEALTH_V1";

export type CandidateWatchAlertV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_alert_v1";
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1";
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
  authority: Record<string, unknown>;
  [key: string]: unknown;
};

export type CandidateWatchResultV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_watch_result_v1";
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1";
  version: 1;
  readiness_report_sha256: string;
  readiness_status: "none" | "exact_one" | "multiple";
  eligible_candidate_count: number;
  recommended_request_id: string | null;
  watch_status: "none" | "alert" | "duplicate" | "held";
  watch_reason: string;
  alert_required: boolean;
  alert_created: boolean;
  alert_path: string | null;
  alert: CandidateWatchAlertV1 | null;
  state_path: string;
  activation_performed: false;
  network_state_write: false;
  operator_local_state_write: boolean;
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
  [key: string]: unknown;
};

export type CandidateWatchAlertSourceV1 = {
  path: string;
  sha256: string;
  alert: CandidateWatchAlertV1;
};

export type CandidateWatchSystemdObservationV1 = {
  watch_service: {
    load_state: string;
    active_state: string;
    sub_state: string;
    result: string;
    exec_main_status: string;
  };
  watch_timer: {
    load_state: string;
    enabled_state: string;
    active_state: string;
    sub_state: string;
    last_trigger: string;
    next_elapse_monotonic: string;
  };
};

export type CandidateWatchNotificationBridgeStateV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_watch_notification_bridge_state_v1";
  version: 1;
  notified_alert_fingerprints_sha256: string[];
  last_watch_result_sha256: string | null;
  updated_at: string | null;
};

export type CandidateWatchNotificationReceiptV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_notification_v1";
  marker: typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1;
  version: 1;
  candidate_stage: "observe_and_claim";
  notification_id_sha256: string;
  alert_fingerprint_sha256: string;
  request_id: string;
  plan_fingerprint_sha256: string;
  readiness_report_sha256: string;
  required_orchestrator_confirmation: string;
  required_delegated_confirmation: string;
  required_stage_confirmation: string;
  required_canary_confirmation: "buyVoidArmExactObserveAndClaimCanary";
  operator_action: "review_exact_one_candidate_for_separate_arming_lane";
  source_alert_path: string;
  source_alert_sha256: string;
  created_at: string;
  authority: {
    operator_notification: true;
    operator_local_state_write: true;
    network_state_write: false;
    runtime_import_mounted: false;
    apply_requested: false;
    activation_performed: false;
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

export type CandidateWatchHealthReceiptV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_watch_health_v1";
  marker: typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_HEALTH_V1;
  version: 1;
  candidate_stage: "observe_and_claim";
  observed_at: string;
  health_receipt_sha256: string;
  healthy: boolean;
  health_status: "healthy" | "degraded" | "held";
  health_reasons: string[];
  watch_status: CandidateWatchResultV1["watch_status"];
  watch_reason: string;
  readiness_status: CandidateWatchResultV1["readiness_status"];
  eligible_candidate_count: number;
  recommended_request_id: string | null;
  watch_result_sha256: string;
  watch_state_sha256: string | null;
  alert_file_count: number;
  notification_receipt_count: number;
  new_notification_count: number;
  last_alert_fingerprint_sha256: string | null;
  systemd: CandidateWatchSystemdObservationV1;
  authority: {
    operator_notification: true;
    operator_local_state_write: true;
    network_state_write: false;
    runtime_import_mounted: false;
    apply_requested: false;
    activation_performed: false;
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

export type CandidateWatchNotificationBridgeDecisionV1 = {
  ok: boolean;
  status: "healthy" | "degraded" | "held";
  failures: string[];
  notifications: CandidateWatchNotificationReceiptV1[];
  next_state: CandidateWatchNotificationBridgeStateV1;
  health: CandidateWatchHealthReceiptV1;
};

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

function normalized(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  const rendered = JSON.stringify(value);
  return rendered === undefined ? "null" : rendered;
}

export function sha256Canonical(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value)).digest("hex");
}

export function defaultCandidateWatchNotificationBridgeStateV1():
  CandidateWatchNotificationBridgeStateV1 {
  return {
    schema:
      "void_buy_void_observe_and_claim_candidate_watch_notification_bridge_state_v1",
    version: 1,
    notified_alert_fingerprints_sha256: [],
    last_watch_result_sha256: null,
    updated_at: null,
  };
}

function normalizeState(
  value: Partial<CandidateWatchNotificationBridgeStateV1> | undefined,
): CandidateWatchNotificationBridgeStateV1 {
  const fingerprints = Array.isArray(
    value?.notified_alert_fingerprints_sha256,
  )
    ? value.notified_alert_fingerprints_sha256
        .map(normalizedLower)
        .filter((item) => SAFE_SHA256.test(item))
    : [];
  const watchResultSha = normalizedLower(value?.last_watch_result_sha256);
  return {
    schema:
      "void_buy_void_observe_and_claim_candidate_watch_notification_bridge_state_v1",
    version: 1,
    notified_alert_fingerprints_sha256: [...new Set(fingerprints)].sort(),
    last_watch_result_sha256: SAFE_SHA256.test(watchResultSha)
      ? watchResultSha
      : null,
    updated_at: normalized(value?.updated_at) || null,
  };
}

function watchAuthorityFailures(value: CandidateWatchResultV1): string[] {
  const expected: Record<string, unknown> = {
    activation_performed: false,
    network_state_write: false,
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
  return Object.entries(expected)
    .filter(([key, expectedValue]) => value[key] !== expectedValue)
    .map(([key]) => key);
}

function alertAuthorityFailures(
  authority: Record<string, unknown>,
): string[] {
  const expected: Record<string, unknown> = {
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
  return Object.entries(expected)
    .filter(([key, expectedValue]) => authority[key] !== expectedValue)
    .map(([key]) => key);
}

function validateAlert(source: CandidateWatchAlertSourceV1): string[] {
  const alert = source.alert;
  const failures: string[] = [];
  if (
    alert.schema !== "void_buy_void_observe_and_claim_candidate_alert_v1"
    || alert.marker !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1"
    || alert.version !== 1
    || alert.candidate_stage !== "observe_and_claim"
  ) failures.push("alert_identity");
  if (!SAFE_REQUEST_ID.test(normalized(alert.request_id))) {
    failures.push("alert_request_id");
  }
  for (const [key, value] of Object.entries({
    alert_fingerprint_sha256: alert.alert_fingerprint_sha256,
    plan_fingerprint_sha256: alert.plan_fingerprint_sha256,
    readiness_report_sha256: alert.readiness_report_sha256,
    source_alert_sha256: source.sha256,
  })) {
    if (!SAFE_SHA256.test(normalizedLower(value))) failures.push(key);
  }
  if (
    alert.required_canary_confirmation
      !== "buyVoidArmExactObserveAndClaimCanary"
  ) failures.push("alert_canary_confirmation");
  if (
    alert.operator_action
      !== "review_exact_one_candidate_for_separate_arming_lane"
  ) failures.push("alert_operator_action");
  if (alert.activation_performed !== false) {
    failures.push("alert_activation_performed");
  }
  failures.push(
    ...alertAuthorityFailures(alert.authority || {}).map(
      (key) => `alert_authority:${key}`,
    ),
  );
  return failures;
}

function isFiniteSchedule(value: string): boolean {
  const normalizedValue = normalizedLower(value);
  return Boolean(
    normalizedValue
    && normalizedValue !== "0"
    && normalizedValue !== "infinity"
    && normalizedValue !== "n/a",
  );
}

function systemdHealthFailures(
  observation: CandidateWatchSystemdObservationV1,
): string[] {
  const failures: string[] = [];
  const service = observation.watch_service;
  const timer = observation.watch_timer;

  if (service.load_state !== "loaded") failures.push("watch_service_load");
  if (service.result === "failed") failures.push("watch_service_result");
  if (service.exec_main_status && service.exec_main_status !== "0") {
    failures.push("watch_service_exec_status");
  }
  if (timer.load_state !== "loaded") failures.push("watch_timer_load");
  if (timer.enabled_state !== "enabled") failures.push("watch_timer_enabled");
  if (timer.active_state !== "active") failures.push("watch_timer_active");
  if (!new Set(["waiting", "running"]).has(timer.sub_state)) {
    failures.push("watch_timer_sub_state");
  }
  if (timer.sub_state === "waiting" && !isFiniteSchedule(
    timer.next_elapse_monotonic,
  )) {
    failures.push("watch_timer_next_elapse");
  }
  return failures;
}

function makeNotification(
  source: CandidateWatchAlertSourceV1,
  createdAt: string,
): CandidateWatchNotificationReceiptV1 {
  const alert = source.alert;
  const base = {
    schema:
      "void_buy_void_observe_and_claim_candidate_notification_v1" as const,
    marker:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1 as typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1,
    version: 1 as const,
    candidate_stage: "observe_and_claim" as const,
    alert_fingerprint_sha256:
      normalizedLower(alert.alert_fingerprint_sha256),
    request_id: normalized(alert.request_id),
    plan_fingerprint_sha256:
      normalizedLower(alert.plan_fingerprint_sha256),
    readiness_report_sha256:
      normalizedLower(alert.readiness_report_sha256),
    required_orchestrator_confirmation:
      normalized(alert.required_orchestrator_confirmation),
    required_delegated_confirmation:
      normalized(alert.required_delegated_confirmation),
    required_stage_confirmation:
      normalized(alert.required_stage_confirmation),
    required_canary_confirmation:
      "buyVoidArmExactObserveAndClaimCanary" as const,
    operator_action:
      "review_exact_one_candidate_for_separate_arming_lane" as const,
    source_alert_path: normalized(source.path),
    source_alert_sha256: normalizedLower(source.sha256),
    created_at: createdAt,
    authority: {
      operator_notification: true as const,
      operator_local_state_write: true as const,
      network_state_write: false as const,
      runtime_import_mounted: false as const,
      apply_requested: false as const,
      activation_performed: false as const,
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
  return {
    ...base,
    notification_id_sha256: sha256Canonical({
      marker: base.marker,
      alert_fingerprint_sha256: base.alert_fingerprint_sha256,
      request_id: base.request_id,
      plan_fingerprint_sha256: base.plan_fingerprint_sha256,
      source_alert_sha256: base.source_alert_sha256,
    }),
  };
}

export function evaluateCandidateWatchNotificationBridgeV1(input: {
  watch_result: CandidateWatchResultV1;
  watch_result_sha256: string;
  watch_state_sha256?: string | null;
  alert_sources: CandidateWatchAlertSourceV1[];
  previous_state?: Partial<CandidateWatchNotificationBridgeStateV1>;
  systemd: CandidateWatchSystemdObservationV1;
  existing_notification_receipt_count: number;
  observed_at?: string;
}): CandidateWatchNotificationBridgeDecisionV1 {
  const observedAt = normalized(input.observed_at) || new Date().toISOString();
  const previous = normalizeState(input.previous_state);
  const failures: string[] = [];
  const watchResult = input.watch_result;
  const watchResultSha = normalizedLower(input.watch_result_sha256);
  const watchStateSha = normalizedLower(input.watch_state_sha256);

  if (
    watchResult.schema
      !== "void_buy_void_observe_and_claim_candidate_watch_result_v1"
    || watchResult.marker
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_V1"
    || watchResult.version !== 1
  ) failures.push("watch_result_identity");
  if (!SAFE_SHA256.test(watchResultSha)) {
    failures.push("watch_result_sha256");
  }
  if (watchStateSha && !SAFE_SHA256.test(watchStateSha)) {
    failures.push("watch_state_sha256");
  }
  failures.push(
    ...watchAuthorityFailures(watchResult).map(
      (key) => `watch_authority:${key}`,
    ),
  );
  if (!Number.isSafeInteger(watchResult.eligible_candidate_count)
      || watchResult.eligible_candidate_count < 0) {
    failures.push("eligible_candidate_count");
  }
  if (!new Set(["none", "alert", "duplicate", "held"])
    .has(watchResult.watch_status)) {
    failures.push("watch_status");
  }

  const sortedSources = [...input.alert_sources].sort((a, b) =>
    normalizedLower(a.alert.alert_fingerprint_sha256)
      .localeCompare(normalizedLower(b.alert.alert_fingerprint_sha256)),
  );
  const validSources: CandidateWatchAlertSourceV1[] = [];
  for (const source of sortedSources) {
    const alertFailures = validateAlert(source);
    if (alertFailures.length > 0) {
      failures.push(...alertFailures.map((item) =>
        `${normalized(source.path) || "unknown_alert"}:${item}`,
      ));
      continue;
    }
    validSources.push(source);
  }

  if (
    (watchResult.watch_status === "alert"
      || watchResult.watch_status === "duplicate")
    && watchResult.alert
  ) {
    const expected = normalizedLower(
      watchResult.alert.alert_fingerprint_sha256,
    );
    if (!validSources.some((source) =>
      normalizedLower(source.alert.alert_fingerprint_sha256) === expected,
    )) failures.push("current_watch_alert_file_missing");
  }

  const notified = new Set(previous.notified_alert_fingerprints_sha256);
  const notifications = failures.length === 0
    ? validSources
        .filter((source) => !notified.has(
          normalizedLower(source.alert.alert_fingerprint_sha256),
        ))
        .map((source) => makeNotification(source, observedAt))
    : [];

  for (const notification of notifications) {
    notified.add(notification.alert_fingerprint_sha256);
  }

  const nextState: CandidateWatchNotificationBridgeStateV1 = {
    schema:
      "void_buy_void_observe_and_claim_candidate_watch_notification_bridge_state_v1",
    version: 1,
    notified_alert_fingerprints_sha256: [...notified].sort(),
    last_watch_result_sha256:
      SAFE_SHA256.test(watchResultSha)
        ? watchResultSha
        : previous.last_watch_result_sha256,
    updated_at: observedAt,
  };

  const healthReasons = [
    ...failures,
    ...systemdHealthFailures(input.systemd),
  ];
  if (watchResult.watch_status === "held") {
    healthReasons.push(`watch_held:${normalized(watchResult.watch_reason)}`);
  }
  const uniqueHealthReasons = [...new Set(healthReasons)].sort();
  const healthy = uniqueHealthReasons.length === 0;
  const status: CandidateWatchNotificationBridgeDecisionV1["status"] =
    failures.length > 0
      ? "held"
      : healthy
        ? "healthy"
        : "degraded";
  const lastAlertFingerprint = validSources.length > 0
    ? normalizedLower(
        validSources[validSources.length - 1]
          .alert.alert_fingerprint_sha256,
      )
    : null;
  const healthBase = {
    schema:
      "void_buy_void_observe_and_claim_candidate_watch_health_v1" as const,
    marker:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_HEALTH_V1 as typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_HEALTH_V1,
    version: 1 as const,
    candidate_stage: "observe_and_claim" as const,
    observed_at: observedAt,
    healthy,
    health_status: status,
    health_reasons: uniqueHealthReasons,
    watch_status: watchResult.watch_status,
    watch_reason: normalized(watchResult.watch_reason),
    readiness_status: watchResult.readiness_status,
    eligible_candidate_count: watchResult.eligible_candidate_count,
    recommended_request_id:
      normalized(watchResult.recommended_request_id) || null,
    watch_result_sha256: watchResultSha,
    watch_state_sha256:
      SAFE_SHA256.test(watchStateSha) ? watchStateSha : null,
    alert_file_count: validSources.length,
    notification_receipt_count:
      Math.max(0, Number(input.existing_notification_receipt_count) || 0)
      + notifications.length,
    new_notification_count: notifications.length,
    last_alert_fingerprint_sha256: lastAlertFingerprint,
    systemd: input.systemd,
    authority: {
      operator_notification: true as const,
      operator_local_state_write: true as const,
      network_state_write: false as const,
      runtime_import_mounted: false as const,
      apply_requested: false as const,
      activation_performed: false as const,
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
  const health: CandidateWatchHealthReceiptV1 = {
    ...healthBase,
    health_receipt_sha256: sha256Canonical(healthBase),
  };

  return {
    ok: failures.length === 0,
    status,
    failures: [...new Set(failures)].sort(),
    notifications,
    next_state: nextState,
    health,
  };
}
