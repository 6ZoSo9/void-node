export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1 =
  "run_crash_consistent_saga_stage";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PARENT_RUNTIME_MARKER_V1 =
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1 =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1 =
  "/__void/operator/buy-void-runtime-v1/command";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1 =
  "/__void/operator/buy-void-runtime-v1/status";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PORT_ENV_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT";

export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1 = {
  request_id_only_business_selector: true,
  loopback_http_only: true,
  parent_runtime_only: true,
  direct_journal_imports: false,
  runtime_status_checked_before_command: true,
  transaction_preparation_gate_must_be_disabled: true,
  already_claimed_request_required: true,
  allowed_apply_stages: ["reserve_inventory", "reserve_execution_attempt"],
  candidate_ready_from_attempt_reservation_receipt: true,
  one_business_stage_per_invocation: true,
  replan_before_apply: true,
  prepare_transaction_invocation_forbidden: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  money_movement: false,
} as const;

const REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RESERVATION_STAGES = new Set([
  "reserve_inventory",
  "reserve_execution_attempt",
]);
const MAX_RESPONSE_BYTES = 1024 * 1024;
const ZERO_AUTHORITY = {
  transaction_preparation_performed: false,
  rpc_call_performed: false,
  credential_access_performed: false,
  signing_performed: false,
  transaction_broadcast_performed: false,
  inventory_decrement_performed: false,
  public_fulfilled_closeout_performed: false,
  money_movement_performed: false,
} as const;

export type BuyVoidProductionCanaryCandidateCliArgsV1 = {
  request_id: string;
  apply: boolean;
  confirmation?: string;
  saga_confirmation?: string;
  action_confirmation?: string;
  delegated_confirmation?: string;
  policy_fingerprint_sha256?: string;
  expected_plan_fingerprint_sha256?: string;
};
export type BuyVoidProductionCanaryCandidateHttpGetV1 = (
  input: Readonly<{ url: string }>,
) => Promise<{ status: number; json: unknown }>;
export type BuyVoidProductionCanaryCandidateHttpPostV1 = (
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
) => Promise<{ status: number; json: unknown }>;
export type BuyVoidProductionCanaryCandidateDecisionV1 = Record<string, any> & {
  marker: typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1;
  version: 1;
  ok: boolean;
  status: "planned" | "candidate_ready" | "applied" | "held";
};

type DryRun = {
  request_id: string;
  saga_id: string;
  next_action: "reserve_inventory" | "reserve_execution_attempt";
  required_runtime_confirmation: string;
  required_saga_confirmation: string;
  required_action_confirmation: string;
  required_delegated_confirmation: string | null;
  required_policy_fingerprint_sha256: string;
};
type AppliedRuntime = {
  state: Record<string, any>;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}
function object(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}
function held(
  requestId: string | null,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidProductionCanaryCandidateDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
    version: 1,
    ok: false,
    status: "held",
    applied: false,
    request_id: requestId,
    reason,
    ...(detail ? { detail } : {}),
    stage_transition_count: 0,
    one_business_stage_per_invocation: true,
    ...ZERO_AUTHORITY,
  };
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
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function parseBuyVoidProductionCanaryCandidateArgsV1(
  argv: readonly string[],
): BuyVoidProductionCanaryCandidateCliArgsV1 {
  const result: BuyVoidProductionCanaryCandidateCliArgsV1 = {
    request_id: "",
    apply: false,
  };
  const values: Record<
    string,
    keyof BuyVoidProductionCanaryCandidateCliArgsV1
  > = {
    "--request-id": "request_id",
    "--confirm": "confirmation",
    "--saga-confirm": "saga_confirmation",
    "--action-confirm": "action_confirmation",
    "--delegated-confirm": "delegated_confirmation",
    "--policy-fingerprint-sha256": "policy_fingerprint_sha256",
    "--expected-plan-fingerprint-sha256":
      "expected_plan_fingerprint_sha256",
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
  result.request_id = text(result.request_id);
  if (!REQUEST_ID.test(result.request_id)) throw new Error("invalid_request_id");
  if (
    !result.apply &&
    [
      result.confirmation,
      result.saga_confirmation,
      result.action_confirmation,
      result.delegated_confirmation,
      result.policy_fingerprint_sha256,
      result.expected_plan_fingerprint_sha256,
    ].some((value) => value !== undefined)
  ) {
    throw new Error("apply_confirmation_without_apply");
  }
  return result;
}

function operatorPort(env: NodeJS.ProcessEnv): number {
  const raw = text(
    env[VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PORT_ENV_V1] || "4100",
  );
  if (!/^[0-9]+$/.test(raw)) throw new Error("invalid_operator_port");
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("invalid_operator_port");
  }
  return port;
}
export function buyVoidProductionCanaryCandidateCommandEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}` +
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1;
}
export function buyVoidProductionCanaryCandidateStatusEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}` +
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1;
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
    throw new Error("operator_endpoint_must_be_exact_loopback_runtime_route");
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
export async function defaultBuyVoidProductionCanaryCandidateHttpGetV1(
  input: Readonly<{ url: string }>,
): Promise<{ status: number; json: unknown }> {
  const url = exactLoopbackEndpoint(
    input.url,
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
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
export async function defaultBuyVoidProductionCanaryCandidateHttpPostV1(
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
): Promise<{ status: number; json: unknown }> {
  const url = exactLoopbackEndpoint(
    input.url,
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
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

function runtimeStatusHold(
  value: unknown,
  requestId: string,
): BuyVoidProductionCanaryCandidateDecisionV1 | null {
  const parent = object(value);
  const saga = object(parent?.crash_consistent_saga_runtime);
  if (
    !parent ||
    parent.marker !==
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PARENT_RUNTIME_MARKER_V1 ||
    parent.ok !== true ||
    !saga ||
    saga.marker !== VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1
  ) {
    return held(requestId, "operator_runtime_status_invalid");
  }
  if (parent.enabled !== true) {
    return held(requestId, "parent_buy_void_runtime_disabled");
  }
  if (saga.enabled !== true) {
    return held(requestId, "crash_consistent_saga_runtime_disabled");
  }
  if (saga.preparation_enabled !== false) {
    return held(
      requestId,
      "transaction_preparation_must_remain_disabled_for_candidate_reservation",
    );
  }
  return null;
}

function parseDry(value: unknown, requestId: string): DryRun | null {
  const response = object(value);
  if (
    !response ||
    response.marker !== VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1 ||
    response.ok !== true ||
    response.status !== "dry_run" ||
    response.applied !== false ||
    text(response.request_id) !== requestId
  ) {
    return null;
  }
  const nextAction = text(response.next_action);
  if (!RESERVATION_STAGES.has(nextAction)) return null;
  const delegatedRaw = response.required_delegated_confirmation;
  const delegated = delegatedRaw === undefined || delegatedRaw === null
    ? null
    : text(delegatedRaw);
  const dry: DryRun = {
    request_id: requestId,
    saga_id: text(response.saga_id),
    next_action: nextAction as DryRun["next_action"],
    required_runtime_confirmation: text(response.required_runtime_confirmation),
    required_saga_confirmation: text(response.required_saga_confirmation),
    required_action_confirmation: text(response.required_action_confirmation),
    required_delegated_confirmation: delegated,
    required_policy_fingerprint_sha256: text(
      response.required_policy_fingerprint_sha256,
    ).toLowerCase(),
  };
  if (
    !dry.saga_id ||
    !dry.required_runtime_confirmation ||
    !dry.required_saga_confirmation ||
    !dry.required_action_confirmation ||
    (delegatedRaw !== undefined && delegatedRaw !== null && !delegated) ||
    !SHA256.test(dry.required_policy_fingerprint_sha256)
  ) {
    return null;
  }
  return dry;
}

async function dryPlan(
  dry: DryRun,
): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  const material = {
    request_id: dry.request_id,
    saga_id: dry.saga_id,
    next_action: dry.next_action,
    required_runtime_confirmation: dry.required_runtime_confirmation,
    required_saga_confirmation: dry.required_saga_confirmation,
    required_action_confirmation: dry.required_action_confirmation,
    required_delegated_confirmation: dry.required_delegated_confirmation,
    required_policy_fingerprint_sha256: dry.required_policy_fingerprint_sha256,
  };
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
    version: 1,
    ok: true,
    status: "planned",
    applied: false,
    ...material,
    plan_fingerprint_sha256: await sha256(canonical(material)),
    apply_allowed: true,
    runtime_preparation_enabled: false,
    one_business_stage_per_invocation: true,
    ...ZERO_AUTHORITY,
  };
}

export async function planBuyVoidProductionCanaryCandidateReservationV1(input: {
  request_id: string;
  command_endpoint?: string;
  status_endpoint?: string;
  http_get?: BuyVoidProductionCanaryCandidateHttpGetV1;
  http_post?: BuyVoidProductionCanaryCandidateHttpPostV1;
}): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  const requestId = text(input.request_id);
  if (!REQUEST_ID.test(requestId)) return held(null, "invalid_request_id");
  let commandEndpoint: string;
  let statusEndpoint: string;
  try {
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint || buyVoidProductionCanaryCandidateCommandEndpointV1(),
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1,
    );
    statusEndpoint = exactLoopbackEndpoint(
      input.status_endpoint || buyVoidProductionCanaryCandidateStatusEndpointV1(),
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1,
    );
  } catch {
    return held(requestId, "operator_endpoint_must_be_exact_loopback_runtime_route");
  }
  const get = input.http_get || defaultBuyVoidProductionCanaryCandidateHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionCanaryCandidateHttpPostV1;
  let statusResponse: { status: number; json: unknown };
  try {
    statusResponse = await get({ url: statusEndpoint });
  } catch (error) {
    return held(requestId, "operator_runtime_status_request_failed", {
      error_class: text((error as { name?: unknown })?.name || "Error").slice(0, 80),
    });
  }
  if (statusResponse.status !== 200) {
    return held(requestId, "operator_runtime_status_invalid", {
      http_status: statusResponse.status,
    });
  }
  const statusHold = runtimeStatusHold(statusResponse.json, requestId);
  if (statusHold) return statusHold;

  let response: { status: number; json: unknown };
  try {
    response = await post({
      url: commandEndpoint,
      body: {
        action: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
        request_id: requestId,
        apply: false,
      },
    });
  } catch (error) {
    return held(requestId, "operator_runtime_request_failed", {
      error_class: text((error as { name?: unknown })?.name || "Error").slice(0, 80),
    });
  }
  const dry = parseDry(response.json, requestId);
  if (!dry) {
    const runtime = object(response.json);
    const runtimeReason = text(runtime?.reason || runtime?.error);
    return held(
      requestId,
      runtimeReason.includes("claim_stage_command_required") ||
        runtimeReason.includes("claim_receipt_required")
        ? "candidate_requires_existing_claim"
        : runtimeReason.includes("transaction_preparation_disabled")
          ? "candidate_already_reserved_use_prior_candidate_receipt"
          : "operator_runtime_dry_run_invalid",
      { http_status: response.status, runtime_reason: runtimeReason || null },
    );
  }
  return dryPlan(dry);
}

function exact(actual: unknown, expected: string): boolean {
  return typeof actual === "string" && actual === expected;
}
function parseAppliedRuntime(
  value: unknown,
  requestId: string,
  sagaId: string,
  policy: string,
  stage: "reserve_inventory" | "reserve_execution_attempt",
): AppliedRuntime | null {
  const response = object(value);
  const result = object(response?.result);
  const state = object(result?.state);
  if (
    !response ||
    response.marker !== VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1 ||
    response.ok !== true ||
    response.status !== "applied" ||
    response.applied !== true ||
    text(response.request_id) !== requestId ||
    text(response.saga_id) !== sagaId ||
    text(response.server_policy_fingerprint_sha256).toLowerCase() !== policy ||
    response.inventory_decrement_performed !== false ||
    response.wallet_access_performed !== false ||
    response.signing_performed !== false ||
    response.transaction_broadcast_performed !== false ||
    response.public_fulfilled_closeout_performed !== false ||
    response.money_movement_performed !== false ||
    !result ||
    text(result.action) !== stage ||
    !state
  ) {
    return null;
  }
  if (stage === "reserve_inventory") {
    return text(state.state) === "inventory_reserved" ? { state } : null;
  }
  const attemptId = text(state.attempt_id).toLowerCase();
  if (
    text(state.state) !== "attempt_reserved" ||
    text(state.next_action) !== "prepare_transaction" ||
    !SHA256.test(attemptId) ||
    Number(state.attempt_number) !== 1
  ) {
    return null;
  }
  return { state };
}

export async function runBuyVoidProductionCanaryCandidateReservationV1(input: {
  args: BuyVoidProductionCanaryCandidateCliArgsV1;
  command_endpoint?: string;
  status_endpoint?: string;
  http_get?: BuyVoidProductionCanaryCandidateHttpGetV1;
  http_post?: BuyVoidProductionCanaryCandidateHttpPostV1;
}): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  const requestId = text(input.args.request_id);
  const get = input.http_get || defaultBuyVoidProductionCanaryCandidateHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionCanaryCandidateHttpPostV1;
  const plan = await planBuyVoidProductionCanaryCandidateReservationV1({
    request_id: requestId,
    command_endpoint: input.command_endpoint,
    status_endpoint: input.status_endpoint,
    http_get: get,
    http_post: post,
  });
  if (!input.args.apply || !plan.ok) return plan;
  if (
    plan.status !== "planned" ||
    (plan.next_action !== "reserve_inventory" &&
      plan.next_action !== "reserve_execution_attempt")
  ) {
    return held(requestId, "candidate_apply_stage_not_authorized");
  }
  const stage = plan.next_action as
    | "reserve_inventory"
    | "reserve_execution_attempt";
  if (
    !exact(
      input.args.expected_plan_fingerprint_sha256,
      plan.plan_fingerprint_sha256,
    )
  ) {
    return held(requestId, "exact_plan_fingerprint_required", {
      required_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    });
  }
  if (!exact(input.args.confirmation, plan.required_runtime_confirmation)) {
    return held(requestId, "exact_runtime_confirmation_required");
  }
  if (!exact(input.args.saga_confirmation, plan.required_saga_confirmation)) {
    return held(requestId, "exact_saga_confirmation_required");
  }
  if (!exact(input.args.action_confirmation, plan.required_action_confirmation)) {
    return held(requestId, "exact_action_confirmation_required");
  }
  if (
    !exact(
      input.args.policy_fingerprint_sha256,
      plan.required_policy_fingerprint_sha256,
    )
  ) {
    return held(requestId, "exact_policy_fingerprint_required");
  }
  if (
    plan.required_delegated_confirmation !== null &&
    !exact(
      input.args.delegated_confirmation,
      plan.required_delegated_confirmation,
    )
  ) {
    return held(requestId, "exact_delegated_confirmation_required");
  }
  if (
    plan.required_delegated_confirmation === null &&
    input.args.delegated_confirmation !== undefined
  ) {
    return held(requestId, "unexpected_delegated_confirmation");
  }
  let commandEndpoint: string;
  try {
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint || buyVoidProductionCanaryCandidateCommandEndpointV1(),
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1,
    );
  } catch {
    return held(requestId, "operator_endpoint_must_be_exact_loopback_runtime_route");
  }
  const body: Record<string, unknown> = {
    action: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
    request_id: requestId,
    apply: true,
    confirmation: plan.required_runtime_confirmation,
    saga_confirmation: plan.required_saga_confirmation,
    action_confirmation: plan.required_action_confirmation,
    policy_fingerprint_sha256: plan.required_policy_fingerprint_sha256,
  };
  if (plan.required_delegated_confirmation !== null) {
    body.delegated_confirmation = plan.required_delegated_confirmation;
  }
  let response: { status: number; json: unknown };
  try {
    response = await post({ url: commandEndpoint, body });
  } catch (error) {
    return held(requestId, "operator_runtime_apply_request_failed", {
      error_class: text((error as { name?: unknown })?.name || "Error").slice(0, 80),
    });
  }
  const applied = parseAppliedRuntime(
    response.json,
    requestId,
    plan.saga_id,
    plan.required_policy_fingerprint_sha256,
    stage,
  );
  if (!applied) {
    const runtime = object(response.json);
    return held(requestId, "operator_runtime_apply_result_invalid", {
      http_status: response.status,
      runtime_reason: text(runtime?.reason || runtime?.error) || null,
    });
  }
  if (stage === "reserve_execution_attempt") {
    return {
      marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
      version: 1,
      ok: true,
      status: "candidate_ready",
      applied: true,
      request_id: requestId,
      saga_id: plan.saga_id,
      applied_stage: stage,
      candidate_attempt_id: text(applied.state.attempt_id).toLowerCase(),
      candidate_handoff: "production_live_canary_preflight",
      plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      stage_transition_count: 1,
      runtime_preparation_enabled: false,
      one_business_stage_per_invocation: true,
      ...ZERO_AUTHORITY,
    };
  }
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
    version: 1,
    ok: true,
    status: "applied",
    applied: true,
    request_id: requestId,
    saga_id: plan.saga_id,
    applied_stage: stage,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    stage_transition_count: 1,
    runtime_preparation_enabled: false,
    one_business_stage_per_invocation: true,
    ...ZERO_AUTHORITY,
  };
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_canary_candidate_reservation_v1.ts --request-id <id>",
    "  npx tsx scripts/buy_void_production_canary_candidate_reservation_v1.ts --request-id <id> --apply \\",
    "    --expected-plan-fingerprint-sha256 <sha256> --confirm <exact> \\",
    "    --saga-confirm <exact> --action-confirm <exact> \\",
    "    --policy-fingerprint-sha256 <sha256> [--delegated-confirm <exact>]",
  ].join("\n");
}
async function main(): Promise<void> {
  try {
    const args = parseBuyVoidProductionCanaryCandidateArgsV1(
      process.argv.slice(2),
    );
    const decision = await runBuyVoidProductionCanaryCandidateReservationV1({
      args,
    });
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
  /(?:^|[\\/])buy_void_production_canary_candidate_reservation_v1\.ts$/.test(
    process.argv[1],
  )
) {
  void main();
}
