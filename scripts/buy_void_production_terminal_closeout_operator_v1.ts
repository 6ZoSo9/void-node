import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export const VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1 =
  "VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1";

export const VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1 = {
  parent_runtime_only: true,
  exact_loopback_http_only: true,
  saga_id_only_business_selector: true,
  dry_run_default: true,
  status_precheck_before_command: true,
  replan_before_apply: true,
  exact_operator_plan_fingerprint_required: true,
  exact_runtime_confirmation_required: true,
  exact_terminal_closeout_confirmation_required: true,
  exact_policy_fingerprint_required: true,
  runtime_validates_exact_terminal_plan_fingerprint_before_mutation: true,
  exact_saga_confirmation_required: true,
  exact_saga_action_confirmation_required: true,
  server_controlled_root_dir: true,
  server_controlled_pool_id: true,
  server_controlled_request_dir: true,
  canonical_confirmed_state_server_derived: true,
  duplicate_terminal_truth_preserved: true,
  partial_mutation_truth_preserved: true,
  applied_transport_ambiguity_is_unknown: true,
  automatic_retry: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

const PARENT_MARKER = "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1";
const CHILD_MARKER = "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1";
const TERMINAL_MARKER = "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1";
const ACTION = "run_saga_terminal_closeout";
const RUNTIME_CONFIRMATION = "buyVoidRunSagaTerminalCloseoutRuntimeV1";
const TERMINAL_CONFIRMATION = "buyVoidAdvanceSagaTerminalCloseoutV1";
const STATUS_PATH = "/__void/operator/buy-void-runtime-v1/status";
const COMMAND_PATH = "/__void/operator/buy-void-runtime-v1/command";
const PORT_ENV = "VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_PORT";
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,240}$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const TIMEOUT_MS = 10_000;

export type BuyVoidProductionTerminalCloseoutOperatorArgsV1 = {
  saga_id: string;
  apply: boolean;
  expected_plan_fingerprint_sha256?: string;
  confirmation?: string;
  terminal_closeout_confirmation?: string;
  policy_fingerprint_sha256?: string;
  saga_confirmation?: string;
  saga_action_confirmation?: string;
};

export type BuyVoidProductionTerminalCloseoutHttpGetV1 = (
  input: Readonly<{ url: string }>,
) => Promise<{ status: number; json: unknown }>;

export type BuyVoidProductionTerminalCloseoutHttpPostV1 = (
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
) => Promise<{ status: number; json: unknown }>;

export type BuyVoidProductionTerminalCloseoutOperatorDecisionV1 =
  Record<string, any> & {
    marker: typeof VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1;
    version: 1;
    ok: boolean;
    status: "planned" | "closed" | "duplicate" | "held" | "closeout_unknown";
  };

type StatusSnapshotV1 = {
  apply_enabled: boolean;
  policy_fingerprint_sha256: string;
};

type DryPlanV1 = {
  saga_id: string;
  attempt_id: string;
  closeout_id: string;
  transaction_hash: string;
  canonical_confirmed_state_id: string;
  canonical_confirmed_state_fingerprint: string;
  terminal_plan_fingerprint_sha256: string;
  required_runtime_confirmation: string;
  required_terminal_closeout_confirmation: string;
  required_policy_fingerprint_sha256: string;
  required_saga_confirmation: string;
  required_saga_action_confirmation: string;
};

const NO_FINANCIAL_AUTHORITY = {
  automatic_retry_allowed: false,
  rpc_call_performed: false,
  credential_access_performed: false,
  signing_performed: false,
  transaction_broadcast_performed: false,
  money_movement_performed: false,
} as const;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function exact(value: unknown, expected: string): boolean {
  return typeof value === "string" && value === expected;
}

function object(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return null;
  return value as Record<string, any>;
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

function cleanHeld(
  sagaId: string | null,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidProductionTerminalCloseoutOperatorDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
    version: 1,
    ok: false,
    status: "held",
    saga_id: sagaId,
    reason,
    side_effect_state_known: true,
    recovery_required: false,
    mutation_performed: false,
    inventory_consumption_performed: false,
    public_request_fulfilled: false,
    saga_closeout_appended: false,
    ...(detail ? { detail } : {}),
    ...NO_FINANCIAL_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
  };
}

function closeoutUnknown(
  sagaId: string,
  reason: string,
  errorClass: string,
): BuyVoidProductionTerminalCloseoutOperatorDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
    version: 1,
    ok: false,
    status: "closeout_unknown",
    saga_id: sagaId,
    reason,
    side_effect_state_known: false,
    recovery_required: true,
    mutation_performed: null,
    inventory_consumption_performed: null,
    public_request_fulfilled: null,
    saga_closeout_appended: null,
    error_class: /^[A-Za-z0-9._:-]{1,80}$/.test(errorClass)
      ? errorClass
      : "Error",
    ...NO_FINANCIAL_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
  };
}

export function parseBuyVoidProductionTerminalCloseoutOperatorArgsV1(
  argv: readonly string[],
): BuyVoidProductionTerminalCloseoutOperatorArgsV1 {
  const result: BuyVoidProductionTerminalCloseoutOperatorArgsV1 = {
    saga_id: "",
    apply: false,
  };
  const values: Record<
    string,
    keyof BuyVoidProductionTerminalCloseoutOperatorArgsV1
  > = {
    "--saga-id": "saga_id",
    "--expected-plan-fingerprint-sha256": "expected_plan_fingerprint_sha256",
    "--confirm": "confirmation",
    "--terminal-closeout-confirm": "terminal_closeout_confirmation",
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
      result.terminal_closeout_confirmation,
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

export function buyVoidProductionTerminalCloseoutStatusEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}${STATUS_PATH}`;
}

export function buyVoidProductionTerminalCloseoutCommandEndpointV1(
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

export async function defaultBuyVoidProductionTerminalCloseoutHttpGetV1(
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

export async function defaultBuyVoidProductionTerminalCloseoutHttpPostV1(
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

function validRuntimeAuthority(value: unknown): boolean {
  const authority = object(value);
  return Boolean(
    authority &&
    authority.operator_loopback_only === true &&
    authority.server_controlled_root_dir === true &&
    authority.server_controlled_terminal_policy === true &&
    authority.saga_id_only_selector === true &&
    authority.exact_runtime_confirmation_required === true &&
    authority.exact_terminal_closeout_confirmation_required === true &&
    authority.exact_policy_fingerprint_echo_required === true &&
    authority.exact_terminal_plan_fingerprint_echo_required === true &&
    authority.exact_saga_confirmation_required === true &&
    authority.exact_saga_action_confirmation_required === true &&
    authority.inventory_consumption_possible_when_explicitly_applied === true &&
    authority.public_fulfilled_projection_possible_when_explicitly_applied === true &&
    authority.saga_closeout_possible_when_explicitly_applied === true &&
    authority.public_request_base_record_mutation === false &&
    authority.reservation_base_record_mutation === false &&
    authority.rpc_call === false &&
    authority.credential_access === false &&
    authority.wallet_access === false &&
    authority.signing === false &&
    authority.transaction_broadcast === false &&
    authority.automatic_retry === false &&
    authority.money_movement === false
  );
}

function validTerminalAuthority(value: unknown): boolean {
  const authority = object(value);
  return Boolean(
    authority &&
    authority.exact_saga_selector === true &&
    authority.exact_confirmed_state_completion_required === true &&
    authority.exact_confirmed_state_request_index_required === true &&
    authority.canonical_confirmed_state_id_binding === true &&
    authority.canonical_confirmed_state_fingerprint_binding === true &&
    authority.request_scoped_crash_recoverable_lock === true &&
    authority.deterministic_closeout_plan_persistence === true &&
    authority.exact_terminal_plan_fingerprint_required_before_mutation === true &&
    authority.append_only_inventory_consumption === true &&
    authority.atomic_public_operator_journal_projection === true &&
    authority.saga_closeout_committed_append === true &&
    authority.public_request_base_record_mutation === false &&
    authority.reservation_base_record_mutation === false &&
    authority.rpc_call === false &&
    authority.credential_access === false &&
    authority.wallet_access === false &&
    authority.signing === false &&
    authority.transaction_broadcast === false &&
    authority.automatic_retry === false &&
    authority.money_movement === false
  );
}

function validateStatus(
  value: unknown,
  sagaId: string,
  forApply: boolean,
): StatusSnapshotV1 | BuyVoidProductionTerminalCloseoutOperatorDecisionV1 {
  const parent = object(value);
  const routes = object(parent?.routes);
  const child = object(parent?.saga_terminal_closeout_runtime);
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
    child.required_terminal_closeout_confirmation !== TERMINAL_CONFIRMATION ||
    child.terminal_policy_configured !== true ||
    !validRuntimeAuthority(child.authority) ||
    !validTerminalAuthority(child.terminal_closeout_authority)
  ) {
    return cleanHeld(sagaId, "operator_runtime_status_boundary_invalid");
  }
  const policyFp = child.terminal_policy_fingerprint_sha256;
  if (typeof policyFp !== "string" || !SHA256.test(policyFp)) {
    return cleanHeld(sagaId, "operator_terminal_policy_fingerprint_invalid");
  }
  if (forApply && child.apply_enabled !== true) {
    return cleanHeld(sagaId, "operator_terminal_runtime_not_apply_ready");
  }
  return {
    apply_enabled: child.apply_enabled === true,
    policy_fingerprint_sha256: policyFp,
  };
}

function safePlan(
  value: unknown,
  sagaId: string,
  attemptId: string,
  closeoutId: string,
  policyFp: string,
): Omit<
  DryPlanV1,
  | "required_runtime_confirmation"
  | "required_terminal_closeout_confirmation"
  | "required_policy_fingerprint_sha256"
  | "required_saga_confirmation"
  | "required_saga_action_confirmation"
> | null {
  const plan = object(value);
  if (
    !plan ||
    plan.schema !== "void_buy_void_saga_terminal_closeout_plan_v1" ||
    plan.marker !== TERMINAL_MARKER ||
    plan.version !== 1 ||
    plan.saga_id !== sagaId ||
    plan.attempt_id !== attemptId ||
    plan.closeout_id !== closeoutId ||
    plan.server_policy_fingerprint_sha256 !== policyFp ||
    plan.inventory_decrement_required !== true ||
    plan.public_request_fulfilled_required !== true ||
    plan.public_request_base_record_mutation_authorized !== false ||
    plan.reservation_base_record_mutation_authorized !== false ||
    plan.credential_access_authorized !== false ||
    plan.wallet_access_authorized !== false ||
    plan.signing_authorized !== false ||
    plan.transaction_broadcast_authorized !== false ||
    plan.money_movement_authorized !== false
  ) return null;

  const transactionHash =
    typeof plan.transaction_hash === "string" ? plan.transaction_hash : "";
  const canonicalId =
    typeof plan.canonical_confirmed_state_id === "string"
      ? plan.canonical_confirmed_state_id
      : "";
  const canonicalFp =
    typeof plan.canonical_confirmed_state_fingerprint === "string"
      ? plan.canonical_confirmed_state_fingerprint
      : "";
  const planFp =
    typeof plan.plan_fingerprint_sha256 === "string"
      ? plan.plan_fingerprint_sha256
      : "";
  if (
    !TX_HASH.test(transactionHash) ||
    !SHA256.test(canonicalId) ||
    !SHA256.test(canonicalFp) ||
    !SHA256.test(planFp)
  ) return null;

  return {
    saga_id: sagaId,
    attempt_id: attemptId,
    closeout_id: closeoutId,
    transaction_hash: transactionHash,
    canonical_confirmed_state_id: canonicalId,
    canonical_confirmed_state_fingerprint: canonicalFp,
    terminal_plan_fingerprint_sha256: planFp,
  };
}

function parseDuplicate(
  value: unknown,
  sagaId: string,
  policyFp: string,
): BuyVoidProductionTerminalCloseoutOperatorDecisionV1 | null {
  const response = object(value);
  const decision = object(response?.decision);
  if (
    !response ||
    response.marker !== CHILD_MARKER ||
    response.version !== 1 ||
    response.ok !== true ||
    response.status !== "duplicate" ||
    response.applied !== true ||
    response.already_closed !== true ||
    response.saga_id !== sagaId ||
    response.inventory_consumption_performed !== false ||
    response.public_request_fulfilled !== true ||
    response.saga_closeout_appended !== false ||
    response.money_movement_performed !== false ||
    !validRuntimeAuthority(response.authority) ||
    !decision ||
    decision.ok !== true ||
    decision.status !== "duplicate" ||
    decision.applied !== true ||
    decision.mutation_performed !== false ||
    decision.inventory_consumption_performed !== false ||
    decision.public_request_fulfilled !== true ||
    decision.saga_closeout_appended !== false ||
    decision.automatic_retry_allowed !== false ||
    decision.money_movement_performed !== false ||
    decision.saga_id !== sagaId
  ) return null;

  const attemptId =
    typeof decision.attempt_id === "string" ? decision.attempt_id : "";
  const closeoutId =
    typeof decision.closeout_id === "string" ? decision.closeout_id : "";
  if (!SHA256.test(attemptId) || !SHA256.test(closeoutId)) return null;
  const plan = safePlan(decision.plan, sagaId, attemptId, closeoutId, policyFp);
  if (!plan) return null;

  return {
    marker: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
    version: 1,
    ok: true,
    status: "duplicate",
    applied: true,
    already_closed: true,
    ...plan,
    side_effect_state_known: true,
    recovery_required: false,
    mutation_performed: false,
    inventory_consumption_performed: false,
    public_request_fulfilled: true,
    saga_closeout_appended: false,
    ...NO_FINANCIAL_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
  };
}

function parseDry(
  value: unknown,
  sagaId: string,
  statusPolicyFp: string,
): DryPlanV1 | BuyVoidProductionTerminalCloseoutOperatorDecisionV1 | null {
  const duplicate = parseDuplicate(value, sagaId, statusPolicyFp);
  if (duplicate) return duplicate;

  const response = object(value);
  const decision = object(response?.decision);
  if (
    !response ||
    response.marker !== CHILD_MARKER ||
    response.version !== 1 ||
    response.ok !== true ||
    response.status !== "dry_run" ||
    response.applied !== false ||
    response.saga_id !== sagaId ||
    response.inventory_consumption_performed !== false ||
    response.public_request_fulfilled !== false ||
    response.saga_closeout_appended !== false ||
    response.money_movement_performed !== false ||
    !validRuntimeAuthority(response.authority) ||
    !decision ||
    decision.ok !== true ||
    decision.status !== "dry_run" ||
    decision.applied !== false ||
    decision.mutation_performed !== false ||
    decision.inventory_consumption_performed !== false ||
    decision.public_request_fulfilled !== false ||
    decision.saga_closeout_appended !== false ||
    decision.automatic_retry_allowed !== false ||
    decision.money_movement_performed !== false ||
    decision.saga_id !== sagaId
  ) return null;

  const attemptId =
    typeof decision.attempt_id === "string" ? decision.attempt_id : "";
  const closeoutId =
    typeof decision.closeout_id === "string" ? decision.closeout_id : "";
  const runtimeConfirmation =
    typeof response.required_runtime_confirmation === "string"
      ? response.required_runtime_confirmation
      : "";
  const terminalConfirmation =
    typeof response.required_terminal_closeout_confirmation === "string"
      ? response.required_terminal_closeout_confirmation
      : "";
  const policyFp =
    typeof response.required_policy_fingerprint_sha256 === "string"
      ? response.required_policy_fingerprint_sha256
      : "";
  const sagaConfirmation =
    typeof response.required_saga_confirmation === "string"
      ? response.required_saga_confirmation
      : "";
  const actionConfirmation =
    typeof response.required_saga_action_confirmation === "string"
      ? response.required_saga_action_confirmation
      : "";
  if (
    !SHA256.test(attemptId) ||
    !SHA256.test(closeoutId) ||
    runtimeConfirmation !== RUNTIME_CONFIRMATION ||
    terminalConfirmation !== TERMINAL_CONFIRMATION ||
    policyFp !== statusPolicyFp ||
    !SAFE_TOKEN.test(sagaConfirmation) ||
    !SAFE_TOKEN.test(actionConfirmation) ||
    decision.required_confirmation !== terminalConfirmation ||
    decision.required_policy_fingerprint_sha256 !== policyFp ||
    decision.required_saga_confirmation !== sagaConfirmation ||
    decision.required_saga_action_confirmation !== actionConfirmation
  ) return null;

  const plan = safePlan(decision.plan, sagaId, attemptId, closeoutId, policyFp);
  if (!plan) return null;
  const requiredTerminalPlanFingerprint = text(
    response.required_terminal_plan_fingerprint_sha256,
  ).toLowerCase();
  if (
    !SHA256.test(requiredTerminalPlanFingerprint) ||
    requiredTerminalPlanFingerprint !== plan.terminal_plan_fingerprint_sha256 ||
    text(decision.required_plan_fingerprint_sha256).toLowerCase() !==
      requiredTerminalPlanFingerprint
  ) return null;
  return {
    ...plan,
    required_runtime_confirmation: runtimeConfirmation,
    required_terminal_closeout_confirmation: terminalConfirmation,
    required_policy_fingerprint_sha256: policyFp,
    required_saga_confirmation: sagaConfirmation,
    required_saga_action_confirmation: actionConfirmation,
  };
}

function planDecision(dry: DryPlanV1): BuyVoidProductionTerminalCloseoutOperatorDecisionV1 {
  const material = {
    saga_id: dry.saga_id,
    attempt_id: dry.attempt_id,
    closeout_id: dry.closeout_id,
    transaction_hash: dry.transaction_hash,
    canonical_confirmed_state_id: dry.canonical_confirmed_state_id,
    canonical_confirmed_state_fingerprint: dry.canonical_confirmed_state_fingerprint,
    terminal_plan_fingerprint_sha256: dry.terminal_plan_fingerprint_sha256,
    required_runtime_confirmation: dry.required_runtime_confirmation,
    required_terminal_closeout_confirmation: dry.required_terminal_closeout_confirmation,
    required_policy_fingerprint_sha256: dry.required_policy_fingerprint_sha256,
    required_saga_confirmation: dry.required_saga_confirmation,
    required_saga_action_confirmation: dry.required_saga_action_confirmation,
    inventory_decrement_required: true,
    public_request_fulfilled_required: true,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
  return {
    marker: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
    version: 1,
    ok: true,
    status: "planned",
    applied: false,
    ...material,
    plan_fingerprint_sha256: sha256(canonical(material)),
    side_effect_state_known: true,
    recovery_required: false,
    mutation_performed: false,
    inventory_consumption_performed: false,
    public_request_fulfilled: false,
    saga_closeout_appended: false,
    ...NO_FINANCIAL_AUTHORITY,
    authority: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
  };
}

async function fetchStatus(input: {
  saga_id: string;
  status_endpoint: string;
  for_apply: boolean;
  http_get: BuyVoidProductionTerminalCloseoutHttpGetV1;
}): Promise<StatusSnapshotV1 | BuyVoidProductionTerminalCloseoutOperatorDecisionV1> {
  let response: { status: number; json: unknown };
  try {
    response = await input.http_get({ url: input.status_endpoint });
  } catch (error) {
    return cleanHeld(input.saga_id, "operator_runtime_status_request_failed", {
      error_class: text((error as Error)?.name || "Error").slice(0, 80),
    });
  }
  if (response.status !== 200) {
    return cleanHeld(input.saga_id, "operator_runtime_status_http_invalid", {
      http_status: response.status,
    });
  }
  return validateStatus(response.json, input.saga_id, input.for_apply);
}

async function runDry(input: {
  saga_id: string;
  command_endpoint: string;
  policy_fingerprint_sha256: string;
  http_post: BuyVoidProductionTerminalCloseoutHttpPostV1;
}): Promise<BuyVoidProductionTerminalCloseoutOperatorDecisionV1> {
  let response: { status: number; json: unknown };
  try {
    response = await input.http_post({
      url: input.command_endpoint,
      body: { action: ACTION, saga_id: input.saga_id, apply: false },
    });
  } catch (error) {
    return cleanHeld(input.saga_id, "operator_runtime_dry_run_request_failed", {
      error_class: text((error as Error)?.name || "Error").slice(0, 80),
    });
  }
  if (response.status !== 200) {
    return cleanHeld(input.saga_id, "operator_runtime_dry_run_http_invalid", {
      http_status: response.status,
    });
  }
  const parsed = parseDry(
    response.json,
    input.saga_id,
    input.policy_fingerprint_sha256,
  );
  if (!parsed) {
    const body = object(response.json);
    return cleanHeld(input.saga_id, "operator_runtime_dry_run_boundary_invalid", {
      http_status: response.status,
      runtime_reason: text(body?.error || body?.reason) || null,
    });
  }
  if ("status" in parsed) return parsed;
  return planDecision(parsed);
}

export async function planBuyVoidProductionTerminalCloseoutV1(input: {
  saga_id: string;
  status_endpoint?: string;
  command_endpoint?: string;
  http_get?: BuyVoidProductionTerminalCloseoutHttpGetV1;
  http_post?: BuyVoidProductionTerminalCloseoutHttpPostV1;
  env?: NodeJS.ProcessEnv;
}): Promise<BuyVoidProductionTerminalCloseoutOperatorDecisionV1> {
  const sagaId = text(input.saga_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) return cleanHeld(null, "invalid_saga_id");
  let statusEndpoint: string;
  let commandEndpoint: string;
  try {
    statusEndpoint = exactLoopbackEndpoint(
      input.status_endpoint || buyVoidProductionTerminalCloseoutStatusEndpointV1(input.env),
      STATUS_PATH,
    );
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint || buyVoidProductionTerminalCloseoutCommandEndpointV1(input.env),
      COMMAND_PATH,
    );
  } catch {
    return cleanHeld(sagaId, "operator_endpoint_must_be_exact_parent_loopback_route");
  }
  const get = input.http_get || defaultBuyVoidProductionTerminalCloseoutHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionTerminalCloseoutHttpPostV1;
  const status = await fetchStatus({
    saga_id: sagaId,
    status_endpoint: statusEndpoint,
    for_apply: false,
    http_get: get,
  });
  if ("reason" in status) return status;
  return runDry({
    saga_id: sagaId,
    command_endpoint: commandEndpoint,
    policy_fingerprint_sha256: status.policy_fingerprint_sha256,
    http_post: post,
  });
}

function parseAppliedEnvelope(
  value: unknown,
  sagaId: string,
): BuyVoidProductionTerminalCloseoutOperatorDecisionV1 | null {
  const response = object(value);
  const decision = object(response?.decision);
  if (
    !response ||
    response.marker !== CHILD_MARKER ||
    response.version !== 1 ||
    !decision ||
    typeof response.ok !== "boolean" ||
    response.ok !== decision.ok ||
    response.status !== decision.status ||
    response.applied !== decision.applied ||
    response.saga_id !== sagaId ||
    response.mutation_performed !== decision.mutation_performed ||
    response.inventory_consumption_performed !== decision.inventory_consumption_performed ||
    response.public_request_fulfilled !== decision.public_request_fulfilled ||
    response.saga_closeout_appended !== decision.saga_closeout_appended ||
    response.automatic_retry_allowed !== false ||
    decision.automatic_retry_allowed !== false ||
    response.money_movement_performed !== false ||
    decision.money_movement_performed !== false ||
    !validRuntimeAuthority(response.authority)
  ) return null;

  if (decision.ok === true) {
    const outcome = text(decision.status);
    if (!["closed", "recovered_partial", "duplicate"].includes(outcome)) return null;
    if (decision.saga_id !== sagaId) return null;
    const attemptId =
      typeof decision.attempt_id === "string" ? decision.attempt_id : "";
    const closeoutId =
      typeof decision.closeout_id === "string" ? decision.closeout_id : "";
    if (!SHA256.test(attemptId) || !SHA256.test(closeoutId)) return null;
    if (outcome === "duplicate") {
      if (
        decision.mutation_performed !== false ||
        decision.inventory_consumption_performed !== false ||
        decision.public_request_fulfilled !== true ||
        decision.saga_closeout_appended !== false
      ) return null;
      return {
        marker: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
        version: 1,
        ok: true,
        status: "duplicate",
        applied: true,
        saga_id: sagaId,
        attempt_id: attemptId,
        closeout_id: closeoutId,
        already_closed: true,
        side_effect_state_known: true,
        recovery_required: false,
        mutation_performed: false,
        inventory_consumption_performed: false,
        public_request_fulfilled: true,
        saga_closeout_appended: false,
        closeout_outcome: outcome,
        ...NO_FINANCIAL_AUTHORITY,
        authority: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
      };
    }
    if (
      decision.applied !== true ||
      decision.mutation_performed !== true ||
      decision.inventory_consumption_performed !== true ||
      decision.public_request_fulfilled !== true ||
      decision.saga_closeout_appended !== true
    ) return null;
    return {
      marker: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
      version: 1,
      ok: true,
      status: "closed",
      applied: true,
      saga_id: sagaId,
      attempt_id: attemptId,
      closeout_id: closeoutId,
      closeout_outcome: outcome,
      side_effect_state_known: true,
      recovery_required: false,
      mutation_performed: true,
      inventory_consumption_performed: true,
      public_request_fulfilled: true,
      saga_closeout_appended: true,
      ...NO_FINANCIAL_AUTHORITY,
      authority: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
    };
  }

  if (decision.ok === false && decision.status === "held") {
    const mutation = decision.mutation_performed === true;
    const inventory = decision.inventory_consumption_performed === true;
    const publicFulfilled = decision.public_request_fulfilled === true;
    const sagaAppended = decision.saga_closeout_appended === true;
    const recovery = mutation || inventory || publicFulfilled || sagaAppended;
    return {
      marker: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1,
      version: 1,
      ok: false,
      status: "held",
      applied: decision.applied === true,
      saga_id: sagaId,
      reason: text(decision.reason).slice(0, 240) || "terminal_closeout_held",
      stage: SAFE_TOKEN.test(text(decision.stage)) ? text(decision.stage) : "unknown",
      side_effect_state_known: true,
      recovery_required: recovery,
      mutation_performed: mutation,
      inventory_consumption_performed: inventory,
      public_request_fulfilled: publicFulfilled,
      saga_closeout_appended: sagaAppended,
      ...NO_FINANCIAL_AUTHORITY,
      authority: VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_AUTHORITY_V1,
    };
  }
  return null;
}

export async function runBuyVoidProductionTerminalCloseoutV1(input: {
  args: BuyVoidProductionTerminalCloseoutOperatorArgsV1;
  status_endpoint?: string;
  command_endpoint?: string;
  http_get?: BuyVoidProductionTerminalCloseoutHttpGetV1;
  http_post?: BuyVoidProductionTerminalCloseoutHttpPostV1;
  env?: NodeJS.ProcessEnv;
}): Promise<BuyVoidProductionTerminalCloseoutOperatorDecisionV1> {
  const sagaId = text(input.args.saga_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) return cleanHeld(null, "invalid_saga_id");
  const get = input.http_get || defaultBuyVoidProductionTerminalCloseoutHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionTerminalCloseoutHttpPostV1;
  let statusEndpoint: string;
  let commandEndpoint: string;
  try {
    statusEndpoint = exactLoopbackEndpoint(
      input.status_endpoint || buyVoidProductionTerminalCloseoutStatusEndpointV1(input.env),
      STATUS_PATH,
    );
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint || buyVoidProductionTerminalCloseoutCommandEndpointV1(input.env),
      COMMAND_PATH,
    );
  } catch {
    return cleanHeld(sagaId, "operator_endpoint_must_be_exact_parent_loopback_route");
  }

  const firstStatus = await fetchStatus({
    saga_id: sagaId,
    status_endpoint: statusEndpoint,
    for_apply: false,
    http_get: get,
  });
  if ("reason" in firstStatus) return firstStatus;
  const firstPlan = await runDry({
    saga_id: sagaId,
    command_endpoint: commandEndpoint,
    policy_fingerprint_sha256: firstStatus.policy_fingerprint_sha256,
    http_post: post,
  });
  if (!input.args.apply || firstPlan.status === "duplicate") return firstPlan;
  if (firstPlan.ok !== true || firstPlan.status !== "planned") return firstPlan;

  const expectedPlan = input.args.expected_plan_fingerprint_sha256;
  if (
    typeof expectedPlan !== "string" ||
    !SHA256.test(expectedPlan) ||
    expectedPlan !== firstPlan.plan_fingerprint_sha256
  ) {
    return cleanHeld(sagaId, "exact_plan_fingerprint_required");
  }
  const suppliedPolicyFingerprint = input.args.policy_fingerprint_sha256;
  if (
    !exact(input.args.confirmation, firstPlan.required_runtime_confirmation) ||
    !exact(
      input.args.terminal_closeout_confirmation,
      firstPlan.required_terminal_closeout_confirmation,
    ) ||
    typeof suppliedPolicyFingerprint !== "string" ||
    !SHA256.test(suppliedPolicyFingerprint) ||
    suppliedPolicyFingerprint !== firstPlan.required_policy_fingerprint_sha256 ||
    !exact(input.args.saga_confirmation, firstPlan.required_saga_confirmation) ||
    !exact(
      input.args.saga_action_confirmation,
      firstPlan.required_saga_action_confirmation,
    )
  ) {
    return cleanHeld(sagaId, "exact_closeout_confirmations_required");
  }

  const applyStatus = await fetchStatus({
    saga_id: sagaId,
    status_endpoint: statusEndpoint,
    for_apply: true,
    http_get: get,
  });
  if ("reason" in applyStatus) return applyStatus;
  if (
    applyStatus.policy_fingerprint_sha256 !==
    firstPlan.required_policy_fingerprint_sha256
  ) {
    return cleanHeld(sagaId, "terminal_policy_changed_before_apply");
  }

  const freshPlan = await runDry({
    saga_id: sagaId,
    command_endpoint: commandEndpoint,
    policy_fingerprint_sha256: applyStatus.policy_fingerprint_sha256,
    http_post: post,
  });
  if (freshPlan.status === "duplicate") return freshPlan;
  if (
    freshPlan.ok !== true ||
    freshPlan.status !== "planned" ||
    freshPlan.plan_fingerprint_sha256 !== expectedPlan
  ) {
    return cleanHeld(sagaId, "operator_terminal_closeout_plan_changed");
  }

  const body = {
    action: ACTION,
    saga_id: sagaId,
    apply: true,
    confirmation: input.args.confirmation,
    terminal_closeout_confirmation: input.args.terminal_closeout_confirmation,
    policy_fingerprint_sha256: input.args.policy_fingerprint_sha256,
    terminal_plan_fingerprint_sha256:
      freshPlan.terminal_plan_fingerprint_sha256,
    saga_confirmation: input.args.saga_confirmation,
    saga_action_confirmation: input.args.saga_action_confirmation,
  } as const;

  let response: { status: number; json: unknown };
  try {
    response = await post({ url: commandEndpoint, body });
  } catch (error) {
    return closeoutUnknown(
      sagaId,
      "applied_closeout_transport_unknown",
      text((error as Error)?.name || "Error"),
    );
  }
  const parsed = parseAppliedEnvelope(response.json, sagaId);
  if (response.status === 200 && parsed?.ok === true) return parsed;
  if (
    response.status === 500 &&
    parsed?.ok === false &&
    parsed.status === "held" &&
    parsed.mutation_performed === true
  ) {
    return parsed;
  }
  return closeoutUnknown(
    sagaId,
    response.status === 200
      ? "applied_closeout_response_boundary_unknown"
      : "applied_closeout_http_unknown",
    response.status === 200 ? "InvalidRuntimeEnvelope" : `HTTP${response.status}`,
  );
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_terminal_closeout_operator_v1.ts --saga-id <id>",
    "",
    "Apply requires all dry-run echoes:",
    "  --apply",
    "  --expected-plan-fingerprint-sha256 <sha256>",
    `  --confirm ${RUNTIME_CONFIRMATION}`,
    `  --terminal-closeout-confirm ${TERMINAL_CONFIRMATION}`,
    "  --policy-fingerprint-sha256 <sha256>",
    "  --saga-confirm <exact>",
    "  --saga-action-confirm <exact>",
  ].join("\n");
}

async function main(): Promise<void> {
  let args: BuyVoidProductionTerminalCloseoutOperatorArgsV1;
  try {
    if (process.argv.includes("--help") || process.argv.includes("-h")) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    args = parseBuyVoidProductionTerminalCloseoutOperatorArgsV1(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${JSON.stringify(cleanHeld(
      null,
      "cli_argument_error",
      { message: text((error as Error)?.message || error).slice(0, 160) },
    ), null, 2)}\n`);
    process.exitCode = 2;
    return;
  }
  const decision = await runBuyVoidProductionTerminalCloseoutV1({ args });
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  process.exitCode = decision.ok ? 0 : 1;
}

const invoked = Boolean(
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
);
if (invoked) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify(cleanHeld(
      null,
      "operator_unhandled_exception",
      { message: text((error as Error)?.message || error).slice(0, 160) },
    ), null, 2)}\n`);
    process.exitCode = 1;
  });
}
