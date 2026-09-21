import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
  buyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeSelectedV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1,
} from "./buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1,
  runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1,
} from "./buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_AUTHORITY_V1 =
  Object.freeze({
    source_only_parent_adapter: true,
    standalone_route_mount: false,
    parent_loopback_gate_required: true,
    parent_enable_gate_required: true,
    exact_action_required: true,
    exact_attempt_id_required: true,
    exact_apply_true_required: true,
    exact_confirmation_required: true,
    only_action_attempt_apply_confirmation_allowed: true,
    caller_root_dir_authority: false,
    caller_client_id_authority: false,
    caller_worker_id_authority: false,
    caller_lease_authority: false,
    caller_lease_ttl_authority: false,
    caller_postgres_authority: false,
    caller_pool_authority: false,
    caller_factory_authority: false,
    caller_signer_authority: false,
    caller_broadcaster_authority: false,
    caller_rpc_url_authority: false,
    child_function_fixed: true,
    child_claimed_runtime_required: true,
    automatic_retry: false,
    background_loop: false,
    service_mutation: false,
  } as const);

const ALLOWED_INPUT_KEYS = new Set([
  "action",
  "attempt_id",
  "apply",
  "confirmation",
]);

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function flag(env: NodeJS.ProcessEnv, name: string): boolean {
  return text(env[name]) === "1";
}

function directObject(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  let proto: object | null;
  try {
    proto = Object.getPrototypeOf(value);
  } catch {
    return null;
  }
  if (proto !== Object.prototype && proto !== null) return null;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        return null;
      }
    }
  } catch {
    return null;
  }
  return value as Record<string, unknown>;
}

function invalidKey(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return key;
  }
  return null;
}

function responseStatus(decision: Record<string, any>): number {
  if (decision.ok === true) return 200;
  if (decision.status === "reconciliation_required") return 409;
  if (decision.stage === "input") return 428;
  const reason = text(decision.reason);
  if (
    reason.includes("conflict") ||
    reason.includes("reconciliation") ||
    reason.includes("already_") ||
    reason.includes("published")
  ) {
    return 409;
  }
  if (
    decision.stage === "disabled" ||
    decision.stage === "runtime_gate" ||
    decision.stage === "runtime_policy" ||
    decision.stage === "postgres_factory" ||
    decision.stage === "schema_admission"
  ) {
    return 503;
  }
  return 400;
}

export function buyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeParentStatusV1(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, unknown> {
  const admittedEnvs =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1;
  return {
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1,
    child_marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1,
    version: 1,
    ok: true,
    parent_action:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
    required_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
    claimed_runtime_enabled:
      buyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeSelectedV1(env),
    admitted_runtime_enabled: flag(env, admittedEnvs.enabled),
    full_runtime_enabled: flag(
      env,
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled,
    ),
    full_runtime_apply_enabled: flag(
      env,
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled,
    ),
    automatic_retry_allowed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_AUTHORITY_V1,
    child_authority:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_AUTHORITY_V1,
  };
}

export async function handleBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeParentCommandV1(
  req: any,
  res: any,
): Promise<unknown> {
  const body = directObject(req?.body);
  if (!body) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1,
      ok: false,
      error: "invalid_json_body",
      automatic_retry_allowed: false,
    });
  }

  const bad = invalidKey(body);
  if (bad) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1,
      ok: false,
      error: "caller_supplied_claimed_runtime_material_forbidden",
      forbidden_key: bad,
      allowed_keys: Array.from(ALLOWED_INPUT_KEYS).sort(),
      automatic_retry_allowed: false,
    });
  }

  if (
    text(body.action) !==
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1
  ) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1,
      ok: false,
      error: "invalid_claimed_runtime_parent_action",
      supported_action:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
      automatic_retry_allowed: false,
    });
  }

  const decision =
    await runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1({
      attempt_id: body.attempt_id,
      apply: body.apply,
      confirmation: body.confirmation,
    });

  return res.status(
    responseStatus(decision as Record<string, any>),
  ).json(decision);
}
