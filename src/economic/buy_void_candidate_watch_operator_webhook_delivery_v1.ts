import crypto from "node:crypto";

export const VOID_BUY_VOID_CANDIDATE_WATCH_OPERATOR_WEBHOOK_DELIVERY_V1 =
  "VOID_BUY_VOID_CANDIDATE_WATCH_OPERATOR_WEBHOOK_DELIVERY_V1";

export const VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_RECEIPT_V1 =
  "VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_RECEIPT_V1";

export const VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_HEALTH_V1 =
  "VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_HEALTH_V1";

export type CandidateNotificationV1 = {
  schema: "void_buy_void_observe_and_claim_candidate_notification_v1";
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1";
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
  required_canary_confirmation:
    "buyVoidArmExactObserveAndClaimCanary";
  operator_action:
    "review_exact_one_candidate_for_separate_arming_lane";
  source_alert_path: string;
  source_alert_sha256: string;
  created_at: string;
  authority: Record<string, unknown>;
};

export type CandidateNotificationSourceV1 = {
  path: string;
  sha256: string;
  notification: CandidateNotificationV1;
};

export type OperatorWebhookDeliveryConfigV1 = {
  schema: "void_buy_void_candidate_operator_webhook_delivery_config_v1";
  marker: "VOID_BUY_VOID_CANDIDATE_OPERATOR_WEBHOOK_DELIVERY_CONFIG_V1";
  version: 1;
  enabled: boolean;
  endpoint_url: string;
  allowed_host: string;
  bearer_token_file: string | null;
  request_timeout_ms: number;
  maximum_payload_bytes: number;
};

export type OperatorWebhookDeliveryAttemptV1 = {
  delivery_id_sha256: string;
  notification_id_sha256: string;
  endpoint_fingerprint_sha256: string;
  outcome:
    | "delivered"
    | "http_rejected"
    | "possible_delivery"
    | "transport_failed";
  attempted_at: string;
};

export type OperatorWebhookDeliveryStateV1 = {
  schema: "void_buy_void_candidate_operator_webhook_delivery_state_v1";
  version: 1;
  attempts: OperatorWebhookDeliveryAttemptV1[];
  updated_at: string | null;
};

export type OperatorWebhookDeliveryPayloadV1 = {
  schema: "void_buy_void_candidate_operator_webhook_payload_v1";
  marker: "VOID_BUY_VOID_CANDIDATE_OPERATOR_WEBHOOK_PAYLOAD_V1";
  version: 1;
  candidate_stage: "observe_and_claim";
  notification_id_sha256: string;
  request_id: string;
  alert_fingerprint_sha256: string;
  plan_fingerprint_sha256: string;
  readiness_report_sha256: string;
  required_orchestrator_confirmation: string;
  required_delegated_confirmation: string;
  required_stage_confirmation: string;
  required_canary_confirmation:
    "buyVoidArmExactObserveAndClaimCanary";
  operator_action:
    "review_exact_one_candidate_for_separate_arming_lane";
  source_notification_sha256: string;
  created_at: string;
  authority: {
    operator_notification_delivery: true;
    external_network_request: true;
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
    automatic_retry: false;
    background_loop: false;
    startup_execution: false;
  };
};

export type OperatorWebhookDeliveryPlanV1 = {
  ok: boolean;
  status:
    | "idle"
    | "dry_run"
    | "ready"
    | "held";
  failures: string[];
  endpoint_fingerprint_sha256: string | null;
  pending_notification_count: number;
  selected_notification:
    CandidateNotificationSourceV1 | null;
  delivery_id_sha256: string | null;
  payload: OperatorWebhookDeliveryPayloadV1 | null;
  payload_sha256: string | null;
};

export type OperatorWebhookTransportOutcomeV1 = {
  outcome:
    | "delivered"
    | "http_rejected"
    | "possible_delivery"
    | "transport_failed";
  http_status: number | null;
  response_body_sha256: string | null;
  response_body_bytes: number;
  request_bytes_submitted: boolean;
  failure_class: string | null;
};

export type OperatorWebhookDeliveryReceiptV1 = {
  schema: "void_buy_void_candidate_operator_delivery_receipt_v1";
  marker:
    typeof VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_RECEIPT_V1;
  version: 1;
  candidate_stage: "observe_and_claim";
  delivery_id_sha256: string;
  notification_id_sha256: string;
  request_id: string;
  endpoint_fingerprint_sha256: string;
  payload_sha256: string;
  outcome: OperatorWebhookTransportOutcomeV1["outcome"];
  http_status: number | null;
  response_body_sha256: string | null;
  response_body_bytes: number;
  request_bytes_submitted: boolean;
  failure_class: string | null;
  attempted_at: string;
  automatic_retry: false;
  operator_action:
    "review_delivery_receipt_before_any_manual_retry";
  authority: OperatorWebhookDeliveryPayloadV1["authority"];
};

export type OperatorWebhookDeliveryHealthV1 = {
  schema: "void_buy_void_candidate_operator_delivery_health_v1";
  marker:
    typeof VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_HEALTH_V1;
  version: 1;
  observed_at: string;
  health_receipt_sha256: string;
  healthy: boolean;
  health_status: "healthy" | "degraded" | "held";
  health_reasons: string[];
  config_enabled: boolean;
  endpoint_fingerprint_sha256: string | null;
  notification_file_count: number;
  attempted_notification_count: number;
  pending_notification_count: number;
  selected_notification_id_sha256: string | null;
  last_delivery_outcome:
    OperatorWebhookTransportOutcomeV1["outcome"] | null;
  automatic_retry: false;
  authority: OperatorWebhookDeliveryPayloadV1["authority"];
};

const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_HOST = /^[A-Za-z0-9.-]{1,253}$/;

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
  return crypto
    .createHash("sha256")
    .update(canonical(value))
    .digest("hex");
}

function normalized(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

export function defaultOperatorWebhookDeliveryStateV1():
  OperatorWebhookDeliveryStateV1 {
  return {
    schema:
      "void_buy_void_candidate_operator_webhook_delivery_state_v1",
    version: 1,
    attempts: [],
    updated_at: null,
  };
}

export function notificationAuthorityFailuresV1(
  notification: CandidateNotificationV1,
): string[] {
  const failures: string[] = [];
  const authority = notification.authority ?? {};
  const expected: Record<string, unknown> = {
    operator_notification: true,
    operator_local_state_write: true,
    network_state_write: false,
    runtime_import_mounted: false,
    apply_requested: false,
    activation_performed: false,
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
  for (const [key, value] of Object.entries(expected)) {
    if (authority[key] !== value) {
      failures.push(`notification_authority_${key}`);
    }
  }
  return failures;
}

export function validateOperatorWebhookDeliveryConfigV1(
  config: OperatorWebhookDeliveryConfigV1,
): {
  failures: string[];
  endpoint_fingerprint_sha256: string | null;
} {
  const failures: string[] = [];

  if (
    config.schema !==
    "void_buy_void_candidate_operator_webhook_delivery_config_v1"
  ) {
    failures.push("config_schema");
  }
  if (
    config.marker !==
    "VOID_BUY_VOID_CANDIDATE_OPERATOR_WEBHOOK_DELIVERY_CONFIG_V1"
  ) {
    failures.push("config_marker");
  }
  if (config.version !== 1) failures.push("config_version");
  if (typeof config.enabled !== "boolean") {
    failures.push("config_enabled");
  }

  const allowedHost = normalizedLower(config.allowed_host);
  if (!SAFE_HOST.test(allowedHost)) {
    failures.push("config_allowed_host");
  }

  let endpointFingerprint: string | null = null;
  try {
    const endpoint = new URL(config.endpoint_url);
    if (endpoint.protocol !== "https:") {
      failures.push("config_endpoint_https");
    }
    if (endpoint.hostname.toLowerCase() !== allowedHost) {
      failures.push("config_endpoint_host_allowlist");
    }
    if (endpoint.username || endpoint.password) {
      failures.push("config_endpoint_userinfo");
    }
    if (endpoint.hash) {
      failures.push("config_endpoint_fragment");
    }
    if (!endpoint.pathname.startsWith("/")) {
      failures.push("config_endpoint_path");
    }
    if (
      endpoint.hostname === "localhost" ||
      endpoint.hostname.endsWith(".localhost")
    ) {
      failures.push("config_endpoint_localhost");
    }
    if (
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(endpoint.hostname) ||
      endpoint.hostname.includes(":")
    ) {
      failures.push("config_endpoint_ip_literal");
    }
    endpointFingerprint = sha256Canonical({
      protocol: endpoint.protocol,
      hostname: endpoint.hostname.toLowerCase(),
      port: endpoint.port || "443",
      pathname: endpoint.pathname,
      search: endpoint.search,
    });
  } catch {
    failures.push("config_endpoint_url");
  }

  if (
    !Number.isInteger(config.request_timeout_ms) ||
    config.request_timeout_ms < 1_000 ||
    config.request_timeout_ms > 60_000
  ) {
    failures.push("config_request_timeout");
  }

  if (
    !Number.isInteger(config.maximum_payload_bytes) ||
    config.maximum_payload_bytes < 1_024 ||
    config.maximum_payload_bytes > 65_536
  ) {
    failures.push("config_maximum_payload");
  }

  const tokenFile = config.bearer_token_file;
  if (
    tokenFile !== null &&
    (typeof tokenFile !== "string" ||
      !tokenFile.startsWith("/") ||
      tokenFile.length > 4096)
  ) {
    failures.push("config_bearer_token_file");
  }

  return {
    failures,
    endpoint_fingerprint_sha256:
      failures.length === 0 ? endpointFingerprint : null,
  };
}

function notificationFailures(
  source: CandidateNotificationSourceV1,
): string[] {
  const notification = source.notification;
  const failures = notificationAuthorityFailuresV1(notification);

  if (
    notification.schema !==
    "void_buy_void_observe_and_claim_candidate_notification_v1"
  ) {
    failures.push("notification_schema");
  }
  if (
    notification.marker !==
    "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_NOTIFICATION_V1"
  ) {
    failures.push("notification_marker");
  }
  if (notification.version !== 1) failures.push("notification_version");
  if (notification.candidate_stage !== "observe_and_claim") {
    failures.push("notification_stage");
  }
  if (!SAFE_SHA256.test(notification.notification_id_sha256)) {
    failures.push("notification_id");
  }
  if (!SAFE_SHA256.test(notification.alert_fingerprint_sha256)) {
    failures.push("notification_alert_fingerprint");
  }
  if (!SAFE_SHA256.test(notification.plan_fingerprint_sha256)) {
    failures.push("notification_plan_fingerprint");
  }
  if (!SAFE_SHA256.test(notification.readiness_report_sha256)) {
    failures.push("notification_readiness_sha");
  }
  if (!SAFE_SHA256.test(notification.source_alert_sha256)) {
    failures.push("notification_source_alert_sha");
  }
  if (!SAFE_SHA256.test(source.sha256)) {
    failures.push("notification_source_sha");
  }
  if (!SAFE_REQUEST_ID.test(notification.request_id)) {
    failures.push("notification_request_id");
  }
  if (
    notification.required_canary_confirmation !==
    "buyVoidArmExactObserveAndClaimCanary"
  ) {
    failures.push("notification_canary_confirmation");
  }
  if (
    notification.operator_action !==
    "review_exact_one_candidate_for_separate_arming_lane"
  ) {
    failures.push("notification_operator_action");
  }
  return failures;
}

function deliveryAuthority():
  OperatorWebhookDeliveryPayloadV1["authority"] {
  return {
    operator_notification_delivery: true,
    external_network_request: true,
    operator_local_state_write: true,
    network_state_write: false,
    runtime_import_mounted: false,
    apply_requested: false,
    activation_performed: false,
    inventory_reservation: false,
    execution_attempt_reservation: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    rpc_mutation: false,
    money_movement: false,
    automatic_retry: false,
    background_loop: false,
    startup_execution: false,
  };
}

function normalizedState(
  value: Partial<OperatorWebhookDeliveryStateV1> | undefined,
): OperatorWebhookDeliveryStateV1 {
  const attempts = Array.isArray(value?.attempts)
    ? value.attempts
        .filter((item) =>
          SAFE_SHA256.test(normalizedLower(item.delivery_id_sha256)) &&
          SAFE_SHA256.test(
            normalizedLower(item.notification_id_sha256),
          ) &&
          SAFE_SHA256.test(
            normalizedLower(item.endpoint_fingerprint_sha256),
          ),
        )
        .map((item) => ({
          delivery_id_sha256:
            normalizedLower(item.delivery_id_sha256),
          notification_id_sha256:
            normalizedLower(item.notification_id_sha256),
          endpoint_fingerprint_sha256:
            normalizedLower(item.endpoint_fingerprint_sha256),
          outcome: item.outcome,
          attempted_at: normalized(item.attempted_at),
        }))
    : [];

  const unique = new Map<string, OperatorWebhookDeliveryAttemptV1>();
  for (const attempt of attempts) {
    unique.set(attempt.delivery_id_sha256, attempt);
  }

  return {
    schema:
      "void_buy_void_candidate_operator_webhook_delivery_state_v1",
    version: 1,
    attempts: [...unique.values()].sort((a, b) =>
      a.delivery_id_sha256.localeCompare(b.delivery_id_sha256),
    ),
    updated_at: normalized(value?.updated_at) || null,
  };
}

export function planOperatorWebhookDeliveryV1(input: {
  config: OperatorWebhookDeliveryConfigV1;
  notifications: CandidateNotificationSourceV1[];
  previous_state?: Partial<OperatorWebhookDeliveryStateV1>;
  mode: "dry_run" | "apply";
  exact_confirmation?: string | null;
  observed_at: string;
}): OperatorWebhookDeliveryPlanV1 {
  const configValidation =
    validateOperatorWebhookDeliveryConfigV1(input.config);
  const failures = [...configValidation.failures];

  if (
    input.mode === "apply" &&
    input.exact_confirmation !==
      "sendBuyVoidCandidateOperatorNotification"
  ) {
    failures.push("exact_apply_confirmation");
  }

  if (input.mode === "apply" && input.config.enabled !== true) {
    failures.push("config_disabled");
  }

  const state = normalizedState(input.previous_state);
  const attemptedIds = new Set(
    state.attempts.map((attempt) => attempt.notification_id_sha256),
  );

  const validNotifications: CandidateNotificationSourceV1[] = [];
  for (const source of input.notifications) {
    const sourceFailures = notificationFailures(source);
    if (sourceFailures.length === 0) {
      validNotifications.push(source);
    } else {
      failures.push(
        ...sourceFailures.map((failure) =>
          `${source.notification.notification_id_sha256}:${failure}`,
        ),
      );
    }
  }

  validNotifications.sort((a, b) => {
    const created = a.notification.created_at.localeCompare(
      b.notification.created_at,
    );
    if (created !== 0) return created;
    return a.notification.notification_id_sha256.localeCompare(
      b.notification.notification_id_sha256,
    );
  });

  const pending = validNotifications.filter(
    (source) =>
      !attemptedIds.has(source.notification.notification_id_sha256),
  );

  if (failures.length > 0) {
    return {
      ok: false,
      status: "held",
      failures: [...new Set(failures)].sort(),
      endpoint_fingerprint_sha256:
        configValidation.endpoint_fingerprint_sha256,
      pending_notification_count: pending.length,
      selected_notification: null,
      delivery_id_sha256: null,
      payload: null,
      payload_sha256: null,
    };
  }

  const selected = pending[0] ?? null;
  if (!selected) {
    return {
      ok: true,
      status: "idle",
      failures: [],
      endpoint_fingerprint_sha256:
        configValidation.endpoint_fingerprint_sha256,
      pending_notification_count: 0,
      selected_notification: null,
      delivery_id_sha256: null,
      payload: null,
      payload_sha256: null,
    };
  }

  const endpointFingerprint =
    configValidation.endpoint_fingerprint_sha256 as string;
  const notification = selected.notification;
  const payload: OperatorWebhookDeliveryPayloadV1 = {
    schema:
      "void_buy_void_candidate_operator_webhook_payload_v1",
    marker:
      "VOID_BUY_VOID_CANDIDATE_OPERATOR_WEBHOOK_PAYLOAD_V1",
    version: 1,
    candidate_stage: "observe_and_claim",
    notification_id_sha256: notification.notification_id_sha256,
    request_id: notification.request_id,
    alert_fingerprint_sha256:
      notification.alert_fingerprint_sha256,
    plan_fingerprint_sha256:
      notification.plan_fingerprint_sha256,
    readiness_report_sha256:
      notification.readiness_report_sha256,
    required_orchestrator_confirmation:
      notification.required_orchestrator_confirmation,
    required_delegated_confirmation:
      notification.required_delegated_confirmation,
    required_stage_confirmation:
      notification.required_stage_confirmation,
    required_canary_confirmation:
      "buyVoidArmExactObserveAndClaimCanary",
    operator_action:
      "review_exact_one_candidate_for_separate_arming_lane",
    source_notification_sha256: selected.sha256,
    created_at: input.observed_at,
    authority: deliveryAuthority(),
  };

  const payloadSha = sha256Canonical(payload);
  const deliveryId = sha256Canonical({
    notification_id_sha256: notification.notification_id_sha256,
    endpoint_fingerprint_sha256: endpointFingerprint,
    payload_sha256: payloadSha,
  });

  return {
    ok: true,
    status: input.mode === "dry_run" ? "dry_run" : "ready",
    failures: [],
    endpoint_fingerprint_sha256: endpointFingerprint,
    pending_notification_count: pending.length,
    selected_notification: selected,
    delivery_id_sha256: deliveryId,
    payload,
    payload_sha256: payloadSha,
  };
}

export function recordOperatorWebhookDeliveryOutcomeV1(input: {
  plan: OperatorWebhookDeliveryPlanV1;
  previous_state?: Partial<OperatorWebhookDeliveryStateV1>;
  transport: OperatorWebhookTransportOutcomeV1;
  attempted_at: string;
}): {
  receipt: OperatorWebhookDeliveryReceiptV1;
  next_state: OperatorWebhookDeliveryStateV1;
} {
  if (
    !input.plan.ok ||
    input.plan.status !== "ready" ||
    !input.plan.selected_notification ||
    !input.plan.delivery_id_sha256 ||
    !input.plan.endpoint_fingerprint_sha256 ||
    !input.plan.payload_sha256
  ) {
    throw new Error("delivery plan is not ready");
  }

  const previous = normalizedState(input.previous_state);
  const notification =
    input.plan.selected_notification.notification;

  const receipt: OperatorWebhookDeliveryReceiptV1 = {
    schema:
      "void_buy_void_candidate_operator_delivery_receipt_v1",
    marker:
      VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_RECEIPT_V1,
    version: 1,
    candidate_stage: "observe_and_claim",
    delivery_id_sha256: input.plan.delivery_id_sha256,
    notification_id_sha256: notification.notification_id_sha256,
    request_id: notification.request_id,
    endpoint_fingerprint_sha256:
      input.plan.endpoint_fingerprint_sha256,
    payload_sha256: input.plan.payload_sha256,
    outcome: input.transport.outcome,
    http_status: input.transport.http_status,
    response_body_sha256: input.transport.response_body_sha256,
    response_body_bytes: input.transport.response_body_bytes,
    request_bytes_submitted:
      input.transport.request_bytes_submitted,
    failure_class: input.transport.failure_class,
    attempted_at: input.attempted_at,
    automatic_retry: false,
    operator_action:
      "review_delivery_receipt_before_any_manual_retry",
    authority: deliveryAuthority(),
  };

  const attempt: OperatorWebhookDeliveryAttemptV1 = {
    delivery_id_sha256: receipt.delivery_id_sha256,
    notification_id_sha256: receipt.notification_id_sha256,
    endpoint_fingerprint_sha256:
      receipt.endpoint_fingerprint_sha256,
    outcome: receipt.outcome,
    attempted_at: receipt.attempted_at,
  };

  const attempts = [
    ...previous.attempts.filter(
      (item) =>
        item.delivery_id_sha256 !== attempt.delivery_id_sha256,
    ),
    attempt,
  ].sort((a, b) =>
    a.delivery_id_sha256.localeCompare(b.delivery_id_sha256),
  );

  return {
    receipt,
    next_state: {
      schema:
        "void_buy_void_candidate_operator_webhook_delivery_state_v1",
      version: 1,
      attempts,
      updated_at: input.attempted_at,
    },
  };
}

export function buildOperatorWebhookDeliveryHealthV1(input: {
  config: OperatorWebhookDeliveryConfigV1;
  notifications: CandidateNotificationSourceV1[];
  state?: Partial<OperatorWebhookDeliveryStateV1>;
  plan: OperatorWebhookDeliveryPlanV1;
  last_outcome?: OperatorWebhookTransportOutcomeV1["outcome"] | null;
  observed_at: string;
}): OperatorWebhookDeliveryHealthV1 {
  const state = normalizedState(input.state);
  const reasons = [...input.plan.failures];
  const status: OperatorWebhookDeliveryHealthV1["health_status"] =
    reasons.length > 0 ? "held" : "healthy";

  const attempted = new Set(
    state.attempts.map((item) => item.notification_id_sha256),
  );
  const pending = input.notifications.filter(
    (item) =>
      !attempted.has(item.notification.notification_id_sha256),
  ).length;

  const withoutSha = {
    schema:
      "void_buy_void_candidate_operator_delivery_health_v1" as const,
    marker:
      VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_HEALTH_V1 as
        typeof VOID_BUY_VOID_CANDIDATE_OPERATOR_DELIVERY_HEALTH_V1,
    version: 1 as const,
    observed_at: input.observed_at,
    healthy: reasons.length === 0,
    health_status: status,
    health_reasons: [...new Set(reasons)].sort(),
    config_enabled: input.config.enabled,
    endpoint_fingerprint_sha256:
      input.plan.endpoint_fingerprint_sha256,
    notification_file_count: input.notifications.length,
    attempted_notification_count: attempted.size,
    pending_notification_count: pending,
    selected_notification_id_sha256:
      input.plan.selected_notification?.notification
        .notification_id_sha256 ?? null,
    last_delivery_outcome: input.last_outcome ?? null,
    automatic_retry: false as const,
    authority: deliveryAuthority(),
  };

  return {
    ...withoutSha,
    health_receipt_sha256: sha256Canonical(withoutSha),
  };
}
