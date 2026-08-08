export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1 =
  "run_crash_consistent_saga_stage";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1 =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ROUTE_V1 =
  "/__void/operator/buy-void-runtime-v1/command";
export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PORT_ENV_V1 =
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT";

export const VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1 = {
  request_id_only_business_selector: true,
  loopback_http_only: true,
  parent_runtime_only: true,
  direct_journal_imports: false,
  already_claimed_request_required: true,
  allowed_apply_stages: ["reserve_inventory", "reserve_execution_attempt"],
  one_business_stage_per_invocation: true,
  replan_before_apply: true,
  prepare_transaction_apply_forbidden: true,
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
const RESERVATION_STAGES = new Set(["reserve_inventory", "reserve_execution_attempt"]);
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
export type BuyVoidProductionCanaryCandidateHttpPostV1 = (input: Readonly<{
  url: string;
  body: Readonly<Record<string, unknown>>;
}>) => Promise<{ status: number; json: unknown }>;
export type BuyVoidProductionCanaryCandidateDecisionV1 = Record<string, any> & {
  marker: typeof VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1;
  version: 1;
  ok: boolean;
  status: "planned" | "candidate_ready" | "applied" | "held";
};

type DryRun = {
  request_id: string;
  saga_id: string;
  next_action: string;
  required_runtime_confirmation: string;
  required_saga_confirmation: string;
  required_action_confirmation: string;
  required_delegated_confirmation: string | null;
  required_policy_fingerprint_sha256: string;
  derived_snapshot: Record<string, any>;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}
function object(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}
function held(requestId: string | null, reason: string, detail?: Record<string, unknown>): BuyVoidProductionCanaryCandidateDecisionV1 {
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
  const v = value as Record<string, unknown>;
  return `{${Object.keys(v).sort().map((key) => `${JSON.stringify(key)}:${canonical(v[key])}`).join(",")}}`;
}
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function parseBuyVoidProductionCanaryCandidateArgsV1(argv: readonly string[]): BuyVoidProductionCanaryCandidateCliArgsV1 {
  const result: BuyVoidProductionCanaryCandidateCliArgsV1 = { request_id: "", apply: false };
  const values: Record<string, keyof BuyVoidProductionCanaryCandidateCliArgsV1> = {
    "--request-id": "request_id",
    "--confirm": "confirmation",
    "--saga-confirm": "saga_confirmation",
    "--action-confirm": "action_confirmation",
    "--delegated-confirm": "delegated_confirmation",
    "--policy-fingerprint-sha256": "policy_fingerprint_sha256",
    "--expected-plan-fingerprint-sha256": "expected_plan_fingerprint_sha256",
  };
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    const option = argv[i];
    if (seen.has(option)) throw new Error(`duplicate_option:${option}`);
    seen.add(option);
    if (option === "--apply") {
      result.apply = true;
      continue;
    }
    const field = values[option];
    if (!field) throw new Error(`unexpected_option:${option}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`${option}_value_required`);
    (result as any)[field] = value;
    i += 1;
  }
  result.request_id = text(result.request_id);
  if (!REQUEST_ID.test(result.request_id)) throw new Error("invalid_request_id");
  if (!result.apply && [
    result.confirmation,
    result.saga_confirmation,
    result.action_confirmation,
    result.delegated_confirmation,
    result.policy_fingerprint_sha256,
    result.expected_plan_fingerprint_sha256,
  ].some((value) => value !== undefined)) {
    throw new Error("apply_confirmation_without_apply");
  }
  return result;
}

export function buyVoidProductionCanaryCandidateEndpointV1(env: NodeJS.ProcessEnv = process.env): string {
  const raw = text(env[VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PORT_ENV_V1] || "4100");
  if (!/^[0-9]+$/.test(raw)) throw new Error("invalid_operator_port");
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("invalid_operator_port");
  return `http://127.0.0.1:${port}${VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ROUTE_V1}`;
}
function loopbackEndpoint(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" || url.hostname !== "127.0.0.1" ||
    url.pathname !== VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ROUTE_V1 ||
    url.search || url.hash || url.username || url.password
  ) throw new Error("operator_endpoint_must_be_exact_loopback_runtime_route");
  return url.toString();
}
export async function defaultBuyVoidProductionCanaryCandidateHttpPostV1(input: Readonly<{
  url: string;
  body: Readonly<Record<string, unknown>>;
}>): Promise<{ status: number; json: unknown }> {
  const url = loopbackEndpoint(input.url);
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
    const raw = await response.text();
    if (new TextEncoder().encode(raw).byteLength > 1024 * 1024) throw new Error("operator_response_too_large");
    try {
      return { status: response.status, json: JSON.parse(raw) as unknown };
    } catch {
      throw new Error("operator_response_not_json");
    }
  } finally {
    clearTimeout(timeout);
  }
}

function parseDry(value: unknown, requestId: string): DryRun | null {
  const v = object(value);
  if (
    !v || v.marker !== VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1 ||
    v.ok !== true || v.status !== "dry_run" || v.applied !== false || text(v.request_id) !== requestId
  ) return null;
  const delegated = v.required_delegated_confirmation === null
    ? null
    : text(v.required_delegated_confirmation);
  const dry: DryRun = {
    request_id: requestId,
    saga_id: text(v.saga_id),
    next_action: text(v.next_action),
    required_runtime_confirmation: text(v.required_runtime_confirmation),
    required_saga_confirmation: text(v.required_saga_confirmation),
    required_action_confirmation: text(v.required_action_confirmation),
    required_delegated_confirmation: delegated,
    required_policy_fingerprint_sha256: text(v.required_policy_fingerprint_sha256).toLowerCase(),
    derived_snapshot: object(v.derived_snapshot) || {},
  };
  if (
    !dry.saga_id || !dry.next_action || !dry.required_runtime_confirmation ||
    !dry.required_saga_confirmation || !dry.required_action_confirmation ||
    (v.required_delegated_confirmation !== null && !delegated) ||
    !SHA256.test(dry.required_policy_fingerprint_sha256) ||
    Object.keys(dry.derived_snapshot).length === 0
  ) return null;
  return dry;
}

async function dryPlan(dry: DryRun): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  if (dry.next_action === "claim_payment") return held(dry.request_id, "candidate_requires_existing_claim");
  if (!RESERVATION_STAGES.has(dry.next_action) && dry.next_action !== "prepare_transaction") {
    return held(dry.request_id, "candidate_stage_outside_operator_boundary", { next_action: dry.next_action });
  }
  let attemptId: string | null = null;
  let attemptStatus: string | null = null;
  if (dry.next_action === "prepare_transaction") {
    attemptId = text(dry.derived_snapshot.attempt_id).toLowerCase();
    attemptStatus = text(dry.derived_snapshot.attempt_status).toLowerCase();
    if (!SHA256.test(attemptId) || !["reserved", "prepared"].includes(attemptStatus)) {
      return held(dry.request_id, "candidate_ready_snapshot_invalid", { attempt_status: attemptStatus || null });
    }
  }
  const material = {
    request_id: dry.request_id,
    saga_id: dry.saga_id,
    next_action: dry.next_action,
    required_runtime_confirmation: dry.required_runtime_confirmation,
    required_saga_confirmation: dry.required_saga_confirmation,
    required_action_confirmation: dry.required_action_confirmation,
    required_delegated_confirmation: dry.required_delegated_confirmation,
    required_policy_fingerprint_sha256: dry.required_policy_fingerprint_sha256,
    candidate_attempt_id: attemptId,
    candidate_attempt_status: attemptStatus,
  };
  const ready = dry.next_action === "prepare_transaction";
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
    version: 1,
    ok: true,
    status: ready ? "candidate_ready" : "planned",
    applied: false,
    ...material,
    plan_fingerprint_sha256: await sha256(canonical(material)),
    apply_allowed: !ready,
    one_business_stage_per_invocation: true,
    ...ZERO_AUTHORITY,
  };
}

export async function planBuyVoidProductionCanaryCandidateReservationV1(input: {
  request_id: string;
  endpoint?: string;
  http_post?: BuyVoidProductionCanaryCandidateHttpPostV1;
}): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  const requestId = text(input.request_id);
  if (!REQUEST_ID.test(requestId)) return held(null, "invalid_request_id");
  let endpoint: string;
  try {
    endpoint = loopbackEndpoint(input.endpoint || buyVoidProductionCanaryCandidateEndpointV1());
  } catch {
    return held(requestId, "operator_endpoint_must_be_exact_loopback_runtime_route");
  }
  const post = input.http_post || defaultBuyVoidProductionCanaryCandidateHttpPostV1;
  let response: { status: number; json: unknown };
  try {
    response = await post({
      url: endpoint,
      body: { action: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1, request_id: requestId, apply: false },
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
      runtimeReason.includes("claim_stage_command_required") || runtimeReason.includes("claim_receipt_required")
        ? "candidate_requires_existing_claim"
        : "operator_runtime_dry_run_invalid",
      { http_status: response.status, runtime_reason: runtimeReason || null },
    );
  }
  return dryPlan(dry);
}

function exact(actual: unknown, expected: string): boolean {
  return typeof actual === "string" && actual === expected;
}
function appliedRuntimeValid(value: unknown, requestId: string, sagaId: string, policy: string): boolean {
  const v = object(value);
  return Boolean(
    v && v.marker === VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1 &&
    v.ok === true && v.status === "applied" && v.applied === true &&
    text(v.request_id) === requestId && text(v.saga_id) === sagaId &&
    text(v.server_policy_fingerprint_sha256).toLowerCase() === policy &&
    v.inventory_decrement_performed === false && v.wallet_access_performed === false &&
    v.signing_performed === false && v.transaction_broadcast_performed === false &&
    v.public_fulfilled_closeout_performed === false && v.money_movement_performed === false
  );
}

export async function runBuyVoidProductionCanaryCandidateReservationV1(input: {
  args: BuyVoidProductionCanaryCandidateCliArgsV1;
  endpoint?: string;
  http_post?: BuyVoidProductionCanaryCandidateHttpPostV1;
}): Promise<BuyVoidProductionCanaryCandidateDecisionV1> {
  const requestId = text(input.args.request_id);
  let endpoint: string;
  try {
    endpoint = loopbackEndpoint(input.endpoint || buyVoidProductionCanaryCandidateEndpointV1());
  } catch {
    return held(requestId || null, "operator_endpoint_must_be_exact_loopback_runtime_route");
  }
  const post = input.http_post || defaultBuyVoidProductionCanaryCandidateHttpPostV1;
  const plan = await planBuyVoidProductionCanaryCandidateReservationV1({ request_id: requestId, endpoint, http_post: post });
  if (!input.args.apply || !plan.ok) return plan;
  if (plan.status === "candidate_ready") return held(requestId, "candidate_ready_apply_forbidden", { attempt_id: plan.candidate_attempt_id });
  if (
    plan.status !== "planned" ||
    (plan.next_action !== "reserve_inventory" && plan.next_action !== "reserve_execution_attempt")
  ) return held(requestId, "candidate_apply_stage_not_authorized");
  const stage = plan.next_action as "reserve_inventory" | "reserve_execution_attempt";
  if (!exact(input.args.expected_plan_fingerprint_sha256, plan.plan_fingerprint_sha256)) {
    return held(requestId, "exact_plan_fingerprint_required", { required_plan_fingerprint_sha256: plan.plan_fingerprint_sha256 });
  }
  if (!exact(input.args.confirmation, plan.required_runtime_confirmation)) return held(requestId, "exact_runtime_confirmation_required");
  if (!exact(input.args.saga_confirmation, plan.required_saga_confirmation)) return held(requestId, "exact_saga_confirmation_required");
  if (!exact(input.args.action_confirmation, plan.required_action_confirmation)) return held(requestId, "exact_action_confirmation_required");
  if (!exact(input.args.policy_fingerprint_sha256, plan.required_policy_fingerprint_sha256)) return held(requestId, "exact_policy_fingerprint_required");
  if (plan.required_delegated_confirmation !== null && !exact(input.args.delegated_confirmation, plan.required_delegated_confirmation)) {
    return held(requestId, "exact_delegated_confirmation_required");
  }
  if (plan.required_delegated_confirmation === null && input.args.delegated_confirmation !== undefined) {
    return held(requestId, "unexpected_delegated_confirmation");
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
  if (plan.required_delegated_confirmation !== null) body.delegated_confirmation = plan.required_delegated_confirmation;
  let response: { status: number; json: unknown };
  try {
    response = await post({ url: endpoint, body });
  } catch (error) {
    return held(requestId, "operator_runtime_apply_request_failed", {
      error_class: text((error as { name?: unknown })?.name || "Error").slice(0, 80),
    });
  }
  if (!appliedRuntimeValid(response.json, requestId, plan.saga_id, plan.required_policy_fingerprint_sha256)) {
    const runtime = object(response.json);
    return held(requestId, "operator_runtime_apply_result_invalid", {
      http_status: response.status,
      runtime_reason: text(runtime?.reason || runtime?.error) || null,
    });
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
    const args = parseBuyVoidProductionCanaryCandidateArgsV1(process.argv.slice(2));
    const decision = await runBuyVoidProductionCanaryCandidateReservationV1({ args });
    process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    if (!decision.ok) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`${usage()}\n${text((error as Error)?.message || error)}\n`);
    process.exitCode = 2;
  }
}
if (
  process.argv[1] &&
  /(?:^|[\\/])buy_void_production_canary_candidate_reservation_v1\.ts$/.test(process.argv[1])
) void main();
