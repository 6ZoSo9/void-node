import crypto from "node:crypto";

export const VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1 =
  "VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1";

export const VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1 = {
  parent_runtime_only: true,
  exact_loopback_http_only: true,
  saga_id_only_business_selector: true,
  dry_run_default: true,
  status_precheck_before_command: true,
  replan_before_apply: true,
  exact_operator_plan_fingerprint_required: true,
  exact_runtime_confirmation_required: true,
  exact_coordinator_confirmation_required: true,
  exact_policy_fingerprint_required: true,
  exact_saga_confirmation_required: true,
  exact_saga_action_confirmation_required: true,
  server_controlled_root_dir: true,
  server_controlled_broadcaster_socket: true,
  submit_once_runtime_adapter: false,
  inspect_submission_runtime_adapter: true,
  automatic_retry: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_output: false,
  terminal_closeout_authority: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

const PARENT_MARKER = "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1";
const CHILD_MARKER = "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1";
const ACTION = "run_saga_broadcast_reconciliation";
const RUNTIME_CONFIRMATION = "buyVoidRunSagaBroadcastReconciliationRuntimeV1";
const STATUS_PATH = "/__void/operator/buy-void-runtime-v1/status";
const COMMAND_PATH = "/__void/operator/buy-void-runtime-v1/command";
const PORT_ENV = "VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_PORT";
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,240}$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const TIMEOUT_MS = 10_000;

export type BuyVoidProductionBroadcastReconciliationOperatorArgsV1 = {
  saga_id: string;
  apply: boolean;
  expected_plan_fingerprint_sha256?: string;
  confirmation?: string;
  coordinator_confirmation?: string;
  policy_fingerprint_sha256?: string;
  saga_confirmation?: string;
  saga_action_confirmation?: string;
};

export type BuyVoidProductionBroadcastReconciliationHttpGetV1 = (
  input: Readonly<{ url: string }>,
) => Promise<{ status: number; json: unknown }>;

export type BuyVoidProductionBroadcastReconciliationHttpPostV1 = (
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
) => Promise<{ status: number; json: unknown }>;

export type BuyVoidProductionBroadcastReconciliationOperatorDecisionV1 =
  Record<string, any> & {
    marker: typeof VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1;
    version: 1;
    ok: boolean;
    status: "planned" | "reconciled" | "held" | "reconciliation_unknown";
  };

type ChildStatusV1 = {
  apply_enabled: boolean;
  broadcaster_socket_configured: boolean;
  broadcaster_socket_fingerprint_sha256: string | null;
};

type DryRuntimeV1 = {
  saga_id: string;
  attempt_id: string;
  next_action: "execute_prepared_transaction" | "reconcile_possible_broadcast";
  required_runtime_confirmation: string;
  required_coordinator_confirmation: string;
  required_policy_fingerprint_sha256: string;
  required_saga_confirmation: string;
  required_saga_action_confirmation: string;
  reconciliation_required: boolean;
};

const ZERO_AUTHORITY = {
  transaction_broadcast_performed: false,
  money_movement_performed: false,
  terminal_closeout_performed: false,
  automatic_retry_allowed: false,
  raw_signed_transaction_returned: false,
} as const;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function object(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function held(
  sagaId: string | null,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidProductionBroadcastReconciliationOperatorDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1,
    version: 1,
    ok: false,
    status: "held",
    saga_id: sagaId,
    reason,
    side_effect_state_known: true,
    reconciliation_required: false,
    ...(detail ? { detail } : {}),
    ...ZERO_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1,
  };
}

function transportUnknown(
  sagaId: string,
  reason: string,
  errorClass: string,
): BuyVoidProductionBroadcastReconciliationOperatorDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1,
    version: 1,
    ok: false,
    status: "reconciliation_unknown",
    saga_id: sagaId,
    reason,
    side_effect_state_known: false,
    reconciliation_required: true,
    error_class: /^[A-Za-z0-9._:-]{1,80}$/.test(errorClass)
      ? errorClass
      : "Error",
    ...ZERO_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1,
  };
}

export function parseBuyVoidProductionBroadcastReconciliationOperatorArgsV1(
  argv: readonly string[],
): BuyVoidProductionBroadcastReconciliationOperatorArgsV1 {
  const result: BuyVoidProductionBroadcastReconciliationOperatorArgsV1 = {
    saga_id: "",
    apply: false,
  };
  const values: Record<
    string,
    keyof BuyVoidProductionBroadcastReconciliationOperatorArgsV1
  > = {
    "--saga-id": "saga_id",
    "--expected-plan-fingerprint-sha256": "expected_plan_fingerprint_sha256",
    "--confirm": "confirmation",
    "--coordinator-confirm": "coordinator_confirmation",
    "--policy-fingerprint-sha256": "policy_fingerprint_sha256",
    "--saga-confirm": "saga_confirmation",
    "--saga-action-confirm": "saga_action_confirmation",
  };
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (seen.has(option)) throw new Error(`duplicate_option:${option}`);
    seen.add(option);
    if (option === "--apply") {
      result.apply = true;
      continue;
    }
    const field = values[option];
    if (!field) throw new Error(`unexpected_option:${option}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${option}_value_required`);
    }
    (result as any)[field] = value;
    index += 1;
  }
  result.saga_id = text(result.saga_id).toLowerCase();
  if (!SAGA_ID.test(result.saga_id)) throw new Error("invalid_saga_id");
  if (
    !result.apply &&
    [
      result.expected_plan_fingerprint_sha256,
      result.confirmation,
      result.coordinator_confirmation,
      result.policy_fingerprint_sha256,
      result.saga_confirmation,
      result.saga_action_confirmation,
    ].some((value) => value !== undefined)
  ) {
    throw new Error("apply_confirmation_without_apply");
  }
  return result;
}

function operatorPort(env: NodeJS.ProcessEnv): number {
  const raw = text(env[PORT_ENV] || "4100");
  if (!/^[0-9]+$/.test(raw)) throw new Error("invalid_operator_port");
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("invalid_operator_port");
  }
  return port;
}

export function buyVoidProductionBroadcastReconciliationStatusEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}${STATUS_PATH}`;
}

export function buyVoidProductionBroadcastReconciliationCommandEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}${COMMAND_PATH}`;
}

function exactLoopbackEndpoint(value: string, expectedPath: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.pathname !== expectedPath ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("operator_endpoint_must_be_exact_parent_loopback_route");
  }
  return url.toString();
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("operator_response_too_large");
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("operator_response_not_json");
  }
}

export async function defaultBuyVoidProductionBroadcastReconciliationHttpGetV1(
  input: Readonly<{ url: string }>,
): Promise<{ status: number; json: unknown }> {
  const url = exactLoopbackEndpoint(input.url, STATUS_PATH);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
    });
    return { status: response.status, json: await readJsonResponse(response) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function defaultBuyVoidProductionBroadcastReconciliationHttpPostV1(
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
): Promise<{ status: number; json: unknown }> {
  const url = exactLoopbackEndpoint(input.url, COMMAND_PATH);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input.body),
      signal: controller.signal,
    });
    return { status: response.status, json: await readJsonResponse(response) };
  } finally {
    clearTimeout(timeout);
  }
}

function validChildAuthority(value: unknown): boolean {
  const authority = object(value);
  return Boolean(
    authority &&
    authority.operator_loopback_only === true &&
    authority.saga_id_only_selector === true &&
    authority.server_controlled_root_dir === true &&
    authority.server_controlled_broadcaster_socket === true &&
    authority.submit_once_runtime_adapter === false &&
    authority.inspect_submission_runtime_adapter === true &&
    authority.execute_prepared_transaction_mounted === false &&
    authority.transaction_broadcast === false &&
    authority.inventory_decrement === false &&
    authority.public_fulfilled_closeout === false &&
    authority.automatic_resubmission === false &&
    authority.money_movement === false
  );
}

function validateStatus(
  value: unknown,
  sagaId: string,
  forApply: boolean,
): BuyVoidProductionBroadcastReconciliationOperatorDecisionV1 | ChildStatusV1 {
  const parent = object(value);
  const child = object(parent?.saga_broadcast_reconciliation_runtime);
  const routes = object(parent?.routes);
  const supported = Array.isArray(parent?.supported_actions)
    ? parent.supported_actions.map(text)
    : [];
  if (
    !parent ||
    parent.marker !== PARENT_MARKER ||
    parent.version !== 1 ||
    parent.ok !== true ||
    parent.enabled !== true ||
    !routes ||
    routes.status !== STATUS_PATH ||
    routes.command !== COMMAND_PATH ||
    !supported.includes(ACTION) ||
    !child ||
    child.marker !== CHILD_MARKER ||
    child.version !== 1 ||
    child.action !== ACTION ||
    child.enabled !== true ||
    child.required_runtime_confirmation !== RUNTIME_CONFIRMATION ||
    child.supported_apply_action !== "reconcile_possible_broadcast" ||
    child.execute_prepared_transaction_mounted !== false ||
    !validChildAuthority(child.authority)
  ) {
    return held(sagaId, "operator_runtime_status_boundary_invalid");
  }
  const socketFpRaw = child.broadcaster_socket_fingerprint_sha256;
  const socketFp = socketFpRaw === null || socketFpRaw === undefined
    ? null
    : text(socketFpRaw).toLowerCase();
  if (socketFp !== null && !SHA256.test(socketFp)) {
    return held(sagaId, "operator_runtime_socket_fingerprint_invalid");
  }
  if (
    forApply &&
    (child.apply_enabled !== true ||
      child.broadcaster_socket_configured !== true ||
      socketFp === null)
  ) {
    return held(sagaId, "operator_runtime_not_apply_ready");
  }
  return {
    apply_enabled: child.apply_enabled === true,
    broadcaster_socket_configured: child.broadcaster_socket_configured === true,
    broadcaster_socket_fingerprint_sha256: socketFp,
  };
}

function parseDryRuntime(
  value: unknown,
  sagaId: string,
): DryRuntimeV1 | null {
  const response = object(value);
  const decision = object(response?.decision);
  if (
    !response ||
    response.marker !== CHILD_MARKER ||
    response.version !== 1 ||
    response.ok !== true ||
    response.status !== "dry_run" ||
    response.applied !== false ||
    text(response.saga_id).toLowerCase() !== sagaId ||
    response.execute_prepared_transaction_mounted !== false ||
    response.broadcaster_socket_required_for_dry_run !== false ||
    response.transaction_broadcast_performed !== false ||
    response.money_movement_performed !== false ||
    !validChildAuthority(response.authority) ||
    !decision ||
    decision.ok !== true ||
    decision.status !== "dry_run" ||
    decision.applied !== false ||
    decision.mutation_performed !== false ||
    decision.broadcaster_called !== false ||
    decision.submission_call_performed !== false ||
    decision.transaction_broadcast_performed !== false ||
    decision.automatic_retry_allowed !== false ||
    decision.signed_payload_bytes_persisted !== false ||
    decision.signed_payload_bytes_returned !== false ||
    decision.money_movement_performed !== false ||
    text(decision.saga_id).toLowerCase() !== sagaId
  ) {
    return null;
  }
  const next = text(response.next_action);
  if (![
    "execute_prepared_transaction",
    "reconcile_possible_broadcast",
  ].includes(next)) return null;
  if (text(decision.next_action) !== next) return null;
  const attemptId = text(decision.attempt_id).toLowerCase();
  const runtimeConfirmation = text(response.required_runtime_confirmation);
  const coordinatorConfirmation = text(response.required_coordinator_confirmation);
  const policyFp = text(response.required_policy_fingerprint_sha256).toLowerCase();
  const sagaConfirmation = text(response.required_saga_confirmation);
  const actionConfirmation = text(response.required_saga_action_confirmation);
  if (
    !SHA256.test(attemptId) ||
    runtimeConfirmation !== RUNTIME_CONFIRMATION ||
    !SAFE_TOKEN.test(coordinatorConfirmation) ||
    !SHA256.test(policyFp) ||
    !SAFE_TOKEN.test(sagaConfirmation) ||
    !SAFE_TOKEN.test(actionConfirmation) ||
    decision.required_confirmation !== coordinatorConfirmation ||
    text(decision.required_policy_fingerprint_sha256).toLowerCase() !== policyFp ||
    decision.required_saga_confirmation !== sagaConfirmation ||
    decision.required_saga_action_confirmation !== actionConfirmation
  ) {
    return null;
  }
  return {
    saga_id: sagaId,
    attempt_id: attemptId,
    next_action: next as DryRuntimeV1["next_action"],
    required_runtime_confirmation: runtimeConfirmation,
    required_coordinator_confirmation: coordinatorConfirmation,
    required_policy_fingerprint_sha256: policyFp,
    required_saga_confirmation: sagaConfirmation,
    required_saga_action_confirmation: actionConfirmation,
    reconciliation_required: decision.reconciliation_required === true,
  };
}

function planDecision(dry: DryRuntimeV1): BuyVoidProductionBroadcastReconciliationOperatorDecisionV1 {
  const material = {
    saga_id: dry.saga_id,
    attempt_id: dry.attempt_id,
    next_action: dry.next_action,
    required_runtime_confirmation: dry.required_runtime_confirmation,
    required_coordinator_confirmation: dry.required_coordinator_confirmation,
    required_policy_fingerprint_sha256: dry.required_policy_fingerprint_sha256,
    required_saga_confirmation: dry.required_saga_confirmation,
    required_saga_action_confirmation: dry.required_saga_action_confirmation,
    submit_once_runtime_adapter: false,
    inspect_submission_runtime_adapter: true,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
  return {
    marker: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1,
    version: 1,
    ok: true,
    status: "planned",
    applied: false,
    ...material,
    plan_fingerprint_sha256: sha256(canonical(material)),
    reconciliation_required: dry.reconciliation_required,
    reconcile_possible_broadcast_apply_supported:
      dry.next_action === "reconcile_possible_broadcast",
    side_effect_state_known: true,
    ...ZERO_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1,
  };
}

async function fetchStatus(input: {
  saga_id: string;
  status_endpoint: string;
  for_apply: boolean;
  http_get: BuyVoidProductionBroadcastReconciliationHttpGetV1;
}): Promise<BuyVoidProductionBroadcastReconciliationOperatorDecisionV1 | ChildStatusV1> {
  let response: { status: number; json: unknown };
  try {
    response = await input.http_get({ url: input.status_endpoint });
  } catch (error) {
    return held(input.saga_id, "operator_runtime_status_request_failed", {
      error_class: text((error as Error)?.name || "Error").slice(0, 80),
    });
  }
  if (response.status !== 200) {
    return held(input.saga_id, "operator_runtime_status_http_invalid", {
      http_status: response.status,
    });
  }
  return validateStatus(response.json, input.saga_id, input.for_apply);
}

async function runDry(input: {
  saga_id: string;
  command_endpoint: string;
  http_post: BuyVoidProductionBroadcastReconciliationHttpPostV1;
}): Promise<BuyVoidProductionBroadcastReconciliationOperatorDecisionV1> {
  let response: { status: number; json: unknown };
  try {
    response = await input.http_post({
      url: input.command_endpoint,
      body: { action: ACTION, saga_id: input.saga_id, apply: false },
    });
  } catch (error) {
    return held(input.saga_id, "operator_runtime_dry_run_request_failed", {
      error_class: text((error as Error)?.name || "Error").slice(0, 80),
    });
  }
  const dry = parseDryRuntime(response.json, input.saga_id);
  if (!dry) {
    const body = object(response.json);
    return held(input.saga_id, "operator_runtime_dry_run_boundary_invalid", {
      http_status: response.status,
      runtime_reason: text(body?.error || body?.reason) || null,
    });
  }
  return planDecision(dry);
}

export async function planBuyVoidProductionBroadcastReconciliationV1(input: {
  saga_id: string;
  status_endpoint?: string;
  command_endpoint?: string;
  http_get?: BuyVoidProductionBroadcastReconciliationHttpGetV1;
  http_post?: BuyVoidProductionBroadcastReconciliationHttpPostV1;
  env?: NodeJS.ProcessEnv;
}): Promise<BuyVoidProductionBroadcastReconciliationOperatorDecisionV1> {
  const sagaId = text(input.saga_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) return held(null, "invalid_saga_id");
  let statusEndpoint: string;
  let commandEndpoint: string;
  try {
    statusEndpoint = exactLoopbackEndpoint(
      input.status_endpoint ||
        buyVoidProductionBroadcastReconciliationStatusEndpointV1(input.env),
      STATUS_PATH,
    );
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint ||
        buyVoidProductionBroadcastReconciliationCommandEndpointV1(input.env),
      COMMAND_PATH,
    );
  } catch {
    return held(sagaId, "operator_endpoint_must_be_exact_parent_loopback_route");
  }
  const get = input.http_get || defaultBuyVoidProductionBroadcastReconciliationHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionBroadcastReconciliationHttpPostV1;
  const status = await fetchStatus({
    saga_id: sagaId,
    status_endpoint: statusEndpoint,
    for_apply: false,
    http_get: get,
  });
  if ("reason" in status) return status;
  return runDry({ saga_id: sagaId, command_endpoint: commandEndpoint, http_post: post });
}

function exact(actual: unknown, expected: string): boolean {
  return typeof actual === "string" && actual === expected;
}

function parseAppliedEnvelope(
  value: unknown,
  sagaId: string,
): BuyVoidProductionBroadcastReconciliationOperatorDecisionV1 | null {
  const response = object(value);
  const decision = object(response?.decision);
  if (
    !response ||
    response.marker !== CHILD_MARKER ||
    response.version !== 1 ||
    response.applied !== true ||
    text(response.saga_id).toLowerCase() !== sagaId ||
    response.execute_prepared_transaction_mounted !== false ||
    response.submit_once_runtime_adapter !== false ||
    response.inspect_submission_runtime_adapter !== true ||
    response.transaction_broadcast_performed !== false ||
    response.money_movement_performed !== false ||
    !validChildAuthority(response.authority) ||
    !decision ||
    decision.automatic_retry_allowed !== false ||
    decision.signed_payload_bytes_persisted !== false ||
    decision.signed_payload_bytes_returned !== false
  ) return null;

  if (
    decision.submission_call_performed === true ||
    decision.transaction_broadcast_performed === true ||
    decision.money_movement_performed === true
  ) {
    return {
      ...held(sagaId, "operator_reconciliation_authority_boundary_violation"),
      side_effect_state_known: false,
      reconciliation_required: true,
    };
  }

  if (decision.ok === true) {
    const status = text(decision.status);
    if (!["not_submitted", "unknown", "accepted", "confirmed", "reverted"].includes(status)) {
      return null;
    }
    if (
      decision.applied !== true ||
      text(decision.saga_id).toLowerCase() !== sagaId ||
      text(decision.action) !== "reconcile_possible_broadcast" ||
      !SHA256.test(text(decision.attempt_id).toLowerCase())
    ) return null;
    return {
      marker: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1,
      version: 1,
      ok: true,
      status: "reconciled",
      applied: true,
      saga_id: sagaId,
      attempt_id: text(decision.attempt_id).toLowerCase(),
      reconciliation_outcome: status,
      mutation_performed: decision.mutation_performed === true,
      broadcaster_inspection_performed: decision.broadcaster_called === true,
      reconciliation_required: decision.reconciliation_required === true,
      side_effect_state_known: true,
      ...ZERO_AUTHORITY,
      authority: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1,
    };
  }

  if (decision.ok === false && decision.status === "held") {
    return {
      marker: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1,
      version: 1,
      ok: false,
      status: "held",
      applied: true,
      saga_id: sagaId,
      reason: SAFE_TOKEN.test(text(decision.reason)) ? text(decision.reason) : "runtime_reconciliation_held",
      mutation_performed: decision.mutation_performed === true,
      broadcaster_inspection_performed: decision.broadcaster_called === true,
      reconciliation_required: decision.reconciliation_required === true,
      side_effect_state_known: true,
      ...ZERO_AUTHORITY,
      authority: VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_AUTHORITY_V1,
    };
  }
  return null;
}

export async function runBuyVoidProductionBroadcastReconciliationV1(input: {
  args: BuyVoidProductionBroadcastReconciliationOperatorArgsV1;
  status_endpoint?: string;
  command_endpoint?: string;
  http_get?: BuyVoidProductionBroadcastReconciliationHttpGetV1;
  http_post?: BuyVoidProductionBroadcastReconciliationHttpPostV1;
  env?: NodeJS.ProcessEnv;
}): Promise<BuyVoidProductionBroadcastReconciliationOperatorDecisionV1> {
  const sagaId = text(input.args.saga_id).toLowerCase();
  const get = input.http_get || defaultBuyVoidProductionBroadcastReconciliationHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionBroadcastReconciliationHttpPostV1;
  const firstPlan = await planBuyVoidProductionBroadcastReconciliationV1({
    saga_id: sagaId,
    status_endpoint: input.status_endpoint,
    command_endpoint: input.command_endpoint,
    http_get: get,
    http_post: post,
    env: input.env,
  });
  if (!input.args.apply || !firstPlan.ok) return firstPlan;
  if (
    firstPlan.status !== "planned" ||
    firstPlan.next_action !== "reconcile_possible_broadcast"
  ) {
    return held(sagaId, "reconciliation_apply_action_not_authorized");
  }
  if (!SHA256.test(text(input.args.expected_plan_fingerprint_sha256).toLowerCase()) ||
      !exact(input.args.expected_plan_fingerprint_sha256, firstPlan.plan_fingerprint_sha256)) {
    return held(sagaId, "exact_plan_fingerprint_required", {
      required_plan_fingerprint_sha256: firstPlan.plan_fingerprint_sha256,
    });
  }
  if (!exact(input.args.confirmation, firstPlan.required_runtime_confirmation)) {
    return held(sagaId, "exact_runtime_confirmation_required");
  }
  if (!exact(input.args.coordinator_confirmation, firstPlan.required_coordinator_confirmation)) {
    return held(sagaId, "exact_coordinator_confirmation_required");
  }
  if (!exact(input.args.policy_fingerprint_sha256, firstPlan.required_policy_fingerprint_sha256)) {
    return held(sagaId, "exact_policy_fingerprint_required");
  }
  if (!exact(input.args.saga_confirmation, firstPlan.required_saga_confirmation)) {
    return held(sagaId, "exact_saga_confirmation_required");
  }
  if (!exact(input.args.saga_action_confirmation, firstPlan.required_saga_action_confirmation)) {
    return held(sagaId, "exact_saga_action_confirmation_required");
  }

  let statusEndpoint: string;
  let commandEndpoint: string;
  try {
    statusEndpoint = exactLoopbackEndpoint(
      input.status_endpoint ||
        buyVoidProductionBroadcastReconciliationStatusEndpointV1(input.env),
      STATUS_PATH,
    );
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint ||
        buyVoidProductionBroadcastReconciliationCommandEndpointV1(input.env),
      COMMAND_PATH,
    );
  } catch {
    return held(sagaId, "operator_endpoint_must_be_exact_parent_loopback_route");
  }

  const applyStatus = await fetchStatus({
    saga_id: sagaId,
    status_endpoint: statusEndpoint,
    for_apply: true,
    http_get: get,
  });
  if ("reason" in applyStatus) return applyStatus;

  const replanned = await runDry({ saga_id: sagaId, command_endpoint: commandEndpoint, http_post: post });
  if (!replanned.ok || replanned.status !== "planned") return replanned;
  if (replanned.plan_fingerprint_sha256 !== firstPlan.plan_fingerprint_sha256) {
    return held(sagaId, "operator_reconciliation_plan_changed", {
      prior_plan_fingerprint_sha256: firstPlan.plan_fingerprint_sha256,
      current_plan_fingerprint_sha256: replanned.plan_fingerprint_sha256,
    });
  }

  const body = {
    action: ACTION,
    saga_id: sagaId,
    apply: true,
    confirmation: firstPlan.required_runtime_confirmation,
    coordinator_confirmation: firstPlan.required_coordinator_confirmation,
    policy_fingerprint_sha256: firstPlan.required_policy_fingerprint_sha256,
    saga_confirmation: firstPlan.required_saga_confirmation,
    saga_action_confirmation: firstPlan.required_saga_action_confirmation,
  } as const;

  let response: { status: number; json: unknown };
  try {
    response = await post({ url: commandEndpoint, body });
  } catch (error) {
    return transportUnknown(
      sagaId,
      "operator_reconciliation_apply_transport_unknown",
      text((error as Error)?.name || "Error"),
    );
  }
  const parsed = parseAppliedEnvelope(response.json, sagaId);
  if (!parsed) {
    return transportUnknown(
      sagaId,
      "operator_reconciliation_apply_result_unknown",
      "BoundaryError",
    );
  }
  return parsed;
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_broadcast_reconciliation_operator_v1.ts --saga-id <voidbvfsg1_...>",
    "  npx tsx scripts/buy_void_production_broadcast_reconciliation_operator_v1.ts --saga-id <voidbvfsg1_...> --apply \\",
    "    --expected-plan-fingerprint-sha256 <sha256> --confirm <exact> \\",
    "    --coordinator-confirm <exact> --policy-fingerprint-sha256 <sha256> \\",
    "    --saga-confirm <exact> --saga-action-confirm <exact>",
  ].join("\n");
}

async function main(): Promise<void> {
  try {
    const args = parseBuyVoidProductionBroadcastReconciliationOperatorArgsV1(
      process.argv.slice(2),
    );
    const decision = await runBuyVoidProductionBroadcastReconciliationV1({ args });
    process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    if (!decision.ok) process.exitCode = decision.status === "reconciliation_unknown" ? 3 : 2;
  } catch (error) {
    process.stderr.write(`${usage()}\n${text((error as Error)?.message || error)}\n`);
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  /(?:^|[\\/])buy_void_production_broadcast_reconciliation_operator_v1\.ts$/.test(
    process.argv[1],
  )
) {
  void main();
}
