import crypto from "node:crypto";

export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1 =
  "VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1";
export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1 =
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1";
export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_WORKER_MARKER_V1 =
  "VOID_BUY_VOID_NATIVE_EXECUTION_WORKER_V1";
export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_PLANNER_MARKER_V1 =
  "VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1";
export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1 =
  "buyVoidNativeExecuteReservedPlan";
export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1 =
  "/__void/operator/buy-void-native-execution-v1/status";
export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1 =
  "/__void/operator/buy-void-native-execution-v1/command";
export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_PORT_ENV_V1 =
  "VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_PORT";

export const VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1 = {
  runtime_route_reused: true,
  duplicate_execution_engine: false,
  duplicate_runtime_policy_parser: false,
  duplicate_nonce_fee_planner: false,
  attempt_id_only_business_selector: true,
  exact_loopback_http_only: true,
  arbitrary_endpoint_override: false,
  server_controlled_root_dir: true,
  server_controlled_policy: true,
  server_controlled_rpc_url: true,
  server_controlled_wallet_signer: true,
  dry_run_default: true,
  dry_run_allowed_while_runtime_disabled: true,
  status_precheck_before_command: true,
  replan_before_apply: true,
  exact_plan_fingerprint_required: true,
  exact_policy_fingerprint_required: true,
  runtime_validates_exact_plan_fingerprint_before_signing: true,
  runtime_validates_exact_policy_fingerprint_before_apply_planning: true,
  exact_execution_confirmation_required: true,
  submission_idempotency_key_caller_supplied: true,
  submission_idempotency_key_synthesized: false,
  apply_ready_status_required: true,
  apply_transport_ambiguity_is_reconciliation_required: true,
  automatic_retry: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  production_operation_performed_by_source_merge: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const HTTP_TIMEOUT_MS = 10_000;
const EXPECTED_RPC_METHODS = [
  "eth_chainId",
  "eth_getTransactionCount",
  "eth_gasPrice",
  "eth_getBalance",
] as const;

const FORBIDDEN_RUNTIME_MATERIAL_KEYS = new Set([
  "privatekey",
  "mnemonic",
  "seed",
  "seedphrase",
  "rawtransaction",
  "rawsignedtransaction",
  "signedtransaction",
  "signingkey",
]);

export type BuyVoidProductionNativeExecutionOperatorArgsV1 = {
  attempt_id: string;
  apply: boolean;
  expected_plan_fingerprint_sha256?: string;
  policy_fingerprint_sha256?: string;
  confirmation?: string;
  submission_idempotency_key?: string;
};

export type BuyVoidProductionNativeExecutionOperatorHttpGetV1 = (
  input: Readonly<{ url: string }>,
) => Promise<{ status: number; json: unknown }>;
export type BuyVoidProductionNativeExecutionOperatorHttpPostV1 = (
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
) => Promise<{ status: number; json: unknown }>;

export type BuyVoidProductionNativeExecutionOperatorDecisionV1 =
  Record<string, any> & {
    marker: typeof VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1;
    version: 1;
    ok: boolean;
    status:
      | "planned"
      | "broadcast_accepted"
      | "not_broadcast"
      | "broadcast_unknown"
      | "operator_transport_unknown"
      | "held";
  };

type RuntimeStatusV1 = {
  enabled: boolean;
  signer_configured: boolean;
  broadcaster_configured: boolean;
  apply_ready: boolean;
  policy_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
};

type DryRuntimeV1 = {
  plan_fingerprint_sha256: string;
  public_plan: Record<string, unknown>;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}
function object(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : null;
}
function bool(value: unknown): value is boolean {
  return value === true || value === false;
}
function decimal(value: unknown, positive = false): string | null {
  const raw = text(value);
  if (!DECIMAL.test(raw)) return null;
  if (positive && raw === "0") return null;
  return raw;
}
function safeInteger(value: unknown): number | null {
  const raw = Number(value);
  return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}
function sha256Hex(value: string): string {
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
function normalizeMaterialKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function findForbiddenRuntimeMaterial(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 14) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenRuntimeMaterial(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RUNTIME_MATERIAL_KEYS.has(normalizeMaterialKey(key))) return key;
    const found = findForbiddenRuntimeMaterial(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

function zeroAuthority() {
  return {
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    submission_may_have_occurred: false,
    reconciliation_required: false,
    automatic_retry_allowed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
  } as const;
}

function held(
  attemptId: string | null,
  stage: string,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidProductionNativeExecutionOperatorDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
    version: 1,
    ok: false,
    status: "held",
    applied: false,
    attempt_id: attemptId,
    stage,
    reason,
    ...(detail ? { detail } : {}),
    ...zeroAuthority(),
    authority: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
  };
}

function ambiguousApply(
  attemptId: string,
  planFingerprint: string,
  policyFingerprint: string,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidProductionNativeExecutionOperatorDecisionV1 {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
    version: 1,
    ok: false,
    status: "operator_transport_unknown",
    applied: true,
    attempt_id: attemptId,
    stage: "apply_transport",
    reason,
    plan_fingerprint_sha256: planFingerprint,
    policy_fingerprint_sha256: policyFingerprint,
    mutation_performed: null,
    signing_performed: null,
    transaction_broadcast_performed: null,
    side_effect_state_known: false,
    submission_may_have_occurred: true,
    reconciliation_required: true,
    automatic_retry_allowed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    ...(detail ? { detail } : {}),
    authority: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
  };
}

export function parseBuyVoidProductionNativeExecutionOperatorArgsV1(
  argv: readonly string[],
): BuyVoidProductionNativeExecutionOperatorArgsV1 {
  const result: BuyVoidProductionNativeExecutionOperatorArgsV1 = {
    attempt_id: "",
    apply: false,
  };
  const valueOptions: Record<
    string,
    keyof BuyVoidProductionNativeExecutionOperatorArgsV1
  > = {
    "--attempt-id": "attempt_id",
    "--expected-plan-fingerprint-sha256": "expected_plan_fingerprint_sha256",
    "--policy-fingerprint-sha256": "policy_fingerprint_sha256",
    "--confirm": "confirmation",
    "--submission-idempotency-key": "submission_idempotency_key",
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
    const field = valueOptions[option];
    if (!field) throw new Error(`unexpected_option:${option}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${option}_value_required`);
    }
    (result as any)[field] = value;
    index += 1;
  }
  result.attempt_id = text(result.attempt_id);
  if (!SHA256.test(result.attempt_id)) throw new Error("invalid_attempt_id");
  if (
    !result.apply &&
    [
      result.expected_plan_fingerprint_sha256,
      result.policy_fingerprint_sha256,
      result.confirmation,
      result.submission_idempotency_key,
    ].some((value) => value !== undefined)
  ) {
    throw new Error("apply_authority_without_apply");
  }
  return result;
}

function operatorPort(env: NodeJS.ProcessEnv): number {
  const raw = text(
    env[VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_PORT_ENV_V1] || "4100",
  );
  if (!/^[0-9]+$/.test(raw)) throw new Error("invalid_operator_port");
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("invalid_operator_port");
  }
  return port;
}

export function buyVoidProductionNativeExecutionStatusEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}` +
    VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1;
}
export function buyVoidProductionNativeExecutionCommandEndpointV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return `http://127.0.0.1:${operatorPort(env)}` +
    VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1;
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

export async function defaultBuyVoidProductionNativeExecutionHttpGetV1(
  input: Readonly<{ url: string }>,
): Promise<{ status: number; json: unknown }> {
  const url = exactLoopbackEndpoint(
    input.url,
    VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
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

export async function defaultBuyVoidProductionNativeExecutionHttpPostV1(
  input: Readonly<{
    url: string;
    body: Readonly<Record<string, unknown>>;
  }>,
): Promise<{ status: number; json: unknown }> {
  const url = exactLoopbackEndpoint(
    input.url,
    VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
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

function parseRuntimeStatus(value: unknown): RuntimeStatusV1 | null {
  const status = object(value);
  const routes = object(status?.routes);
  const authority = object(status?.authority);
  if (
    !status ||
    status.marker !== VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1 ||
    status.version !== 1 ||
    status.ok !== true ||
    !routes ||
    routes.status !== VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1 ||
    routes.command !== VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1 ||
    status.operator_loopback_only !== true ||
    status.one_request_per_command !== true ||
    status.policy_configured !== true ||
    !SHA256.test(text(status.policy_fingerprint_sha256)) ||
    !SHA256.test(text(status.rpc_url_fingerprint_sha256)) ||
    status.required_confirmation !==
      VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1 ||
    !bool(status.enabled) ||
    !bool(status.signer_configured) ||
    !bool(status.broadcaster_configured) ||
    !bool(status.apply_ready) ||
    !authority ||
    authority.operator_loopback_only !== true ||
    authority.disabled_by_default !== true ||
    authority.dry_run_allowed_while_disabled !== true ||
    authority.apply_allowed_while_disabled !== false ||
    authority.one_request_per_command !== true ||
    authority.server_controlled_root_dir !== true ||
    authority.server_controlled_policy !== true ||
    authority.server_controlled_rpc_url !== true ||
    authority.attempt_id_only_selector !== true ||
    authority.exact_confirmation_required_before_apply_io !== true ||
    authority.exact_policy_fingerprint_required_before_apply_planning !== true ||
    authority.exact_plan_fingerprint_required_before_signing !== true ||
    authority.injected_dependencies_required_before_apply_io !== true ||
    authority.raw_signed_transaction_input !== false ||
    authority.raw_signed_transaction_persistence !== false ||
    authority.raw_signed_transaction_output !== false ||
    authority.automatic_retry !== false ||
    authority.receipt_wait !== false ||
    authority.background_loop !== false ||
    authority.startup_execution !== false
  ) {
    return null;
  }
  const enabled = status.enabled === true;
  const signer = status.signer_configured === true;
  const broadcaster = status.broadcaster_configured === true;
  const ready = status.apply_ready === true;
  if (ready !== (enabled && signer && broadcaster)) return null;
  return {
    enabled,
    signer_configured: signer,
    broadcaster_configured: broadcaster,
    apply_ready: ready,
    policy_fingerprint_sha256: text(status.policy_fingerprint_sha256),
    rpc_url_fingerprint_sha256: text(status.rpc_url_fingerprint_sha256),
  };
}

function parseDryRuntime(
  value: unknown,
  attemptId: string,
  status: RuntimeStatusV1,
): DryRuntimeV1 | null {
  if (findForbiddenRuntimeMaterial(value)) return null;
  const runtime = object(value);
  const planner = object(runtime?.planner);
  const worker = object(runtime?.worker);
  const preview = object(worker?.preview);
  const transactionPlan = object(planner?.transaction_plan);
  if (
    !runtime ||
    runtime.marker !== VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1 ||
    runtime.version !== 1 ||
    runtime.ok !== true ||
    runtime.status !== "dry_run" ||
    text(runtime.attempt_id) !== attemptId ||
    runtime.reconstructed_from_server_journals !== true ||
    runtime.mutation_performed !== false ||
    runtime.signing_performed !== false ||
    runtime.transaction_broadcast_performed !== false ||
    runtime.raw_signed_transaction_persisted !== false ||
    runtime.raw_signed_transaction_returned !== false ||
    !SHA256.test(text(runtime.plan_fingerprint_sha256)) ||
    !SHA256.test(text(runtime.runtime_policy_fingerprint_sha256)) ||
    text(runtime.runtime_policy_fingerprint_sha256) !==
      status.policy_fingerprint_sha256 ||
    !planner ||
    planner.ok !== true ||
    planner.marker !== VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_PLANNER_MARKER_V1 ||
    planner.version !== 1 ||
    planner.status !== "planned" ||
    text(planner.chain_id) !== "2050" ||
    !SHA256.test(text(planner.wallet_address_fingerprint_sha256)) ||
    text(planner.rpc_url_fingerprint_sha256) !== status.rpc_url_fingerprint_sha256 ||
    planner.sufficient_balance !== true ||
    planner.mutation_performed !== false ||
    planner.signing_performed !== false ||
    planner.transaction_broadcast_performed !== false ||
    !Array.isArray(planner.rpc_methods_used) ||
    JSON.stringify(planner.rpc_methods_used) !== JSON.stringify(EXPECTED_RPC_METHODS) ||
    !transactionPlan ||
    !worker ||
    worker.ok !== true ||
    worker.status !== "dry_run" ||
    worker.applied !== false ||
    worker.mutation_performed !== false ||
    worker.signing_performed !== false ||
    worker.transaction_broadcast_performed !== false ||
    worker.raw_signed_transaction_persisted !== false ||
    worker.raw_signed_transaction_returned !== false ||
    worker.required_confirmation !==
      VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1 ||
    !preview ||
    preview.schema !== "void_buy_void_native_execution_preview_v1" ||
    preview.marker !== VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_WORKER_MARKER_V1 ||
    text(preview.attempt_id) !== attemptId ||
    text(preview.chain_id) !== "2050" ||
    !SAFE_ID.test(text(preview.inventory_reservation_id)) ||
    !SHA256.test(text(preview.plan_id)) ||
    !ADDRESS.test(text(preview.fulfillment_wallet_address)) ||
    !ADDRESS.test(text(preview.delivery_address)) ||
    !decimal(preview.void_amount_units, true) ||
    !decimal(preview.native_value_wei, true) ||
    safeInteger(preview.nonce) === null ||
    !decimal(preview.gas_limit, true) ||
    !decimal(preview.max_fee_per_gas_wei, true) ||
    decimal(preview.max_priority_fee_per_gas_wei) === null ||
    preview.public_request_journal_write_authorized !== false ||
    preview.inventory_decrement_authorized !== false ||
    preview.inventory_release_authorized !== false ||
    preview.wallet_access_authorized !== false ||
    preview.signing_authorized !== false ||
    preview.transaction_broadcast_authorized !== false ||
    preview.money_movement_authorized !== false
  ) {
    return null;
  }

  const nonce = safeInteger(preview.nonce)!;
  const gasLimit = decimal(preview.gas_limit, true)!;
  const maxFee = decimal(preview.max_fee_per_gas_wei, true)!;
  const priorityFee = decimal(preview.max_priority_fee_per_gas_wei)!;
  if (
    text(transactionPlan.chain_id) !== "2050" ||
    safeInteger(transactionPlan.nonce) !== nonce ||
    decimal(transactionPlan.gas_limit, true) !== gasLimit ||
    decimal(transactionPlan.max_fee_per_gas_wei, true) !== maxFee ||
    decimal(transactionPlan.max_priority_fee_per_gas_wei) !== priorityFee ||
    safeInteger(planner.pending_nonce) !== nonce ||
    decimal(planner.computed_max_fee_per_gas_wei, true) !== maxFee ||
    decimal(planner.configured_priority_fee_per_gas_wei) !== priorityFee ||
    !decimal(planner.observed_gas_price_wei, true) ||
    !decimal(planner.estimated_max_transaction_cost_wei, true) ||
    decimal(planner.observed_wallet_balance_wei) === null
  ) {
    return null;
  }

  const walletFingerprint = text(planner.wallet_address_fingerprint_sha256);
  if (sha256Hex(text(preview.fulfillment_wallet_address)) !== walletFingerprint) {
    return null;
  }

  const publicPlan = {
    attempt_id: attemptId,
    inventory_reservation_id: text(preview.inventory_reservation_id),
    bounded_execution_plan_id_sha256: text(preview.plan_id),
    chain_id: "2050",
    delivery_address: text(preview.delivery_address),
    void_amount_units: decimal(preview.void_amount_units, true)!,
    native_value_wei: decimal(preview.native_value_wei, true)!,
    nonce,
    gas_limit: gasLimit,
    max_fee_per_gas_wei: maxFee,
    max_priority_fee_per_gas_wei: priorityFee,
    wallet_address_fingerprint_sha256: walletFingerprint,
    rpc_url_fingerprint_sha256: status.rpc_url_fingerprint_sha256,
    observed_gas_price_wei: decimal(planner.observed_gas_price_wei, true)!,
    estimated_max_transaction_cost_wei:
      decimal(planner.estimated_max_transaction_cost_wei, true)!,
    observed_wallet_balance_wei: decimal(planner.observed_wallet_balance_wei)!,
    rpc_methods_used: [...EXPECTED_RPC_METHODS],
  };
  return {
    plan_fingerprint_sha256: text(runtime.plan_fingerprint_sha256),
    public_plan: publicPlan,
  };
}

export async function planBuyVoidProductionNativeExecutionV1(input: {
  attempt_id: string;
  status_endpoint?: string;
  command_endpoint?: string;
  http_get?: BuyVoidProductionNativeExecutionOperatorHttpGetV1;
  http_post?: BuyVoidProductionNativeExecutionOperatorHttpPostV1;
}): Promise<BuyVoidProductionNativeExecutionOperatorDecisionV1> {
  const attemptId = text(input.attempt_id);
  if (!SHA256.test(attemptId)) return held(null, "operator_input", "invalid_attempt_id");
  let statusEndpoint: string;
  let commandEndpoint: string;
  try {
    statusEndpoint = exactLoopbackEndpoint(
      input.status_endpoint || buyVoidProductionNativeExecutionStatusEndpointV1(),
      VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_STATUS_ROUTE_V1,
    );
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint || buyVoidProductionNativeExecutionCommandEndpointV1(),
      VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1,
    );
  } catch {
    return held(
      attemptId,
      "operator_input",
      "operator_endpoint_must_be_exact_loopback_runtime_route",
    );
  }
  const get = input.http_get || defaultBuyVoidProductionNativeExecutionHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionNativeExecutionHttpPostV1;
  let statusResponse: { status: number; json: unknown };
  try {
    statusResponse = await get({ url: statusEndpoint });
  } catch (error) {
    return held(attemptId, "runtime_status", "runtime_status_request_failed", {
      error_class: text((error as { name?: unknown })?.name || "Error").slice(0, 80),
    });
  }
  if (statusResponse.status !== 200) {
    return held(attemptId, "runtime_status", "runtime_status_http_invalid", {
      http_status: statusResponse.status,
    });
  }
  const status = parseRuntimeStatus(statusResponse.json);
  if (!status) return held(attemptId, "runtime_status", "runtime_status_boundary_invalid");

  let dryResponse: { status: number; json: unknown };
  try {
    dryResponse = await post({
      url: commandEndpoint,
      body: { attempt_id: attemptId, apply: false },
    });
  } catch (error) {
    return held(attemptId, "dry_run", "runtime_dry_run_request_failed", {
      error_class: text((error as { name?: unknown })?.name || "Error").slice(0, 80),
    });
  }
  if (dryResponse.status !== 200) {
    const runtime = object(dryResponse.json);
    return held(attemptId, "dry_run", "runtime_dry_run_held", {
      http_status: dryResponse.status,
      runtime_reason: text(runtime?.reason || runtime?.error) || null,
    });
  }
  const dry = parseDryRuntime(dryResponse.json, attemptId, status);
  if (!dry) return held(attemptId, "dry_run", "runtime_dry_run_boundary_invalid");
  const planFingerprint = dry.plan_fingerprint_sha256;
  return {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
    version: 1,
    ok: true,
    status: "planned",
    applied: false,
    attempt_id: attemptId,
    runtime_enabled: status.enabled,
    signer_configured: status.signer_configured,
    broadcaster_configured: status.broadcaster_configured,
    apply_ready: status.apply_ready,
    runtime_policy_fingerprint_sha256: status.policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256: status.rpc_url_fingerprint_sha256,
    required_confirmation: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1,
    plan_fingerprint_sha256: planFingerprint,
    execution_preview: dry.public_plan,
    ...zeroAuthority(),
    authority: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
  };
}

function parseValidAppliedRuntime(
  value: unknown,
  httpStatus: number,
  attemptId: string,
): {
  kind: "broadcast_accepted" | "not_broadcast" | "broadcast_unknown" | "held";
  mutation_performed: boolean;
  signing_performed: boolean;
  transaction_broadcast_performed: boolean;
  reconciliation_required: boolean;
  expected_transaction_hash: string | null;
  transaction_hash: string | null;
  provider_submission_id: string | null;
  reason: string | null;
} | null {
  if (findForbiddenRuntimeMaterial(value)) return null;
  const runtime = object(value);
  const worker = object(runtime?.worker);
  if (
    !runtime ||
    runtime.marker !== VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_RUNTIME_MARKER_V1 ||
    runtime.version !== 1 ||
    text(runtime.attempt_id) !== attemptId ||
    runtime.raw_signed_transaction_persisted !== false ||
    runtime.raw_signed_transaction_returned !== false ||
    !bool(runtime.mutation_performed) ||
    !bool(runtime.signing_performed) ||
    !bool(runtime.transaction_broadcast_performed)
  ) {
    return null;
  }

  if (runtime.ok === true && runtime.status === "broadcast_accepted") {
    const adapter = object(worker?.adapter_decision);
    if (
      httpStatus !== 200 ||
      runtime.reconstructed_from_server_journals !== true ||
      runtime.mutation_performed !== true ||
      runtime.signing_performed !== true ||
      runtime.transaction_broadcast_performed !== true ||
      !worker ||
      worker.ok !== true ||
      worker.status !== "broadcast_accepted" ||
      worker.applied !== true ||
      worker.mutation_performed !== true ||
      worker.signing_performed !== true ||
      worker.transaction_broadcast_performed !== true ||
      worker.raw_signed_transaction_persisted !== false ||
      worker.raw_signed_transaction_returned !== false ||
      worker.automatic_retry_allowed !== false ||
      !adapter
    ) {
      return null;
    }
    const expectedHash = text(adapter.expected_transaction_hash).toLowerCase();
    const txHash = text(adapter.transaction_hash).toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(expectedHash) || txHash !== expectedHash) return null;
    const provider = text(adapter.provider_submission_id);
    if (!/^[A-Za-z0-9._:@/-]{0,200}$/.test(provider)) return null;
    return {
      kind: "broadcast_accepted",
      mutation_performed: true,
      signing_performed: true,
      transaction_broadcast_performed: true,
      reconciliation_required: false,
      expected_transaction_hash: expectedHash,
      transaction_hash: txHash,
      provider_submission_id: provider,
      reason: null,
    };
  }

  if (runtime.ok !== false || !worker || worker.ok !== false) return null;
  if (worker.automatic_retry_allowed !== false || runtime.automatic_retry_allowed !== false) {
    return null;
  }
  const kind = text(runtime.status);
  if (kind !== text(worker.status)) return null;
  const reason = text(runtime.reason);
  const workerReason = text(worker.reason);
  if (!reason || !workerReason || reason !== workerReason) return null;
  const expectedHashRaw = text(worker.expected_transaction_hash).toLowerCase();
  const expectedHash = /^0x[0-9a-f]{64}$/.test(expectedHashRaw)
    ? expectedHashRaw
    : null;

  if (kind === "not_broadcast") {
    if (
      httpStatus !== 409 ||
      runtime.reconciliation_required !== false ||
      worker.reconciliation_required !== false ||
      runtime.transaction_broadcast_performed !== false ||
      worker.transaction_broadcast_performed !== false
    ) {
      return null;
    }
    return {
      kind,
      mutation_performed: runtime.mutation_performed === true,
      signing_performed: runtime.signing_performed === true,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      expected_transaction_hash: expectedHash,
      transaction_hash: null,
      provider_submission_id: null,
      reason,
    };
  }
  if (kind === "broadcast_unknown") {
    if (
      httpStatus !== 409 ||
      runtime.reconciliation_required !== true ||
      worker.reconciliation_required !== true
    ) {
      return null;
    }
    return {
      kind,
      mutation_performed: runtime.mutation_performed === true,
      signing_performed: runtime.signing_performed === true,
      transaction_broadcast_performed: runtime.transaction_broadcast_performed === true,
      reconciliation_required: true,
      expected_transaction_hash: expectedHash,
      transaction_hash: null,
      provider_submission_id: null,
      reason,
    };
  }
  if (kind === "held") {
    if (![400, 409, 428, 503].includes(httpStatus)) return null;
    return {
      kind,
      mutation_performed: runtime.mutation_performed === true,
      signing_performed: runtime.signing_performed === true,
      transaction_broadcast_performed: runtime.transaction_broadcast_performed === true,
      reconciliation_required: runtime.reconciliation_required === true,
      expected_transaction_hash: expectedHash,
      transaction_hash: null,
      provider_submission_id: null,
      reason,
    };
  }
  return null;
}

export async function runBuyVoidProductionNativeExecutionOperatorV1(input: {
  args: BuyVoidProductionNativeExecutionOperatorArgsV1;
  status_endpoint?: string;
  command_endpoint?: string;
  http_get?: BuyVoidProductionNativeExecutionOperatorHttpGetV1;
  http_post?: BuyVoidProductionNativeExecutionOperatorHttpPostV1;
}): Promise<BuyVoidProductionNativeExecutionOperatorDecisionV1> {
  const attemptId = text(input.args.attempt_id);
  const get = input.http_get || defaultBuyVoidProductionNativeExecutionHttpGetV1;
  const post = input.http_post || defaultBuyVoidProductionNativeExecutionHttpPostV1;
  const plan = await planBuyVoidProductionNativeExecutionV1({
    attempt_id: attemptId,
    status_endpoint: input.status_endpoint,
    command_endpoint: input.command_endpoint,
    http_get: get,
    http_post: post,
  });
  if (!input.args.apply || !plan.ok) return plan;
  if (plan.status !== "planned") return held(attemptId, "apply_precheck", "plan_required");
  if (plan.apply_ready !== true) {
    return held(attemptId, "apply_precheck", "runtime_not_apply_ready");
  }
  if (
    input.args.expected_plan_fingerprint_sha256 !== plan.plan_fingerprint_sha256
  ) {
    return held(attemptId, "apply_precheck", "exact_plan_fingerprint_required", {
      required_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    });
  }
  if (
    input.args.policy_fingerprint_sha256 !==
      plan.runtime_policy_fingerprint_sha256
  ) {
    return held(attemptId, "apply_precheck", "exact_policy_fingerprint_required", {
      required_policy_fingerprint_sha256:
        plan.runtime_policy_fingerprint_sha256,
    });
  }
  if (
    input.args.confirmation !==
      VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_CONFIRMATION_V1
  ) {
    return held(attemptId, "apply_precheck", "exact_execution_confirmation_required");
  }
  if (!SHA256.test(text(input.args.submission_idempotency_key))) {
    return held(attemptId, "apply_precheck", "exact_submission_idempotency_key_required");
  }

  let commandEndpoint: string;
  try {
    commandEndpoint = exactLoopbackEndpoint(
      input.command_endpoint || buyVoidProductionNativeExecutionCommandEndpointV1(),
      VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_COMMAND_ROUTE_V1,
    );
  } catch {
    return held(
      attemptId,
      "apply_precheck",
      "operator_endpoint_must_be_exact_loopback_runtime_route",
    );
  }

  const applyBody = {
    attempt_id: attemptId,
    apply: true,
    confirmation: input.args.confirmation,
    submission_idempotency_key: input.args.submission_idempotency_key,
    expected_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    policy_fingerprint_sha256: plan.runtime_policy_fingerprint_sha256,
  } as const;
  let response: { status: number; json: unknown };
  try {
    response = await post({ url: commandEndpoint, body: applyBody });
  } catch (error) {
    return ambiguousApply(
      attemptId,
      plan.plan_fingerprint_sha256,
      plan.runtime_policy_fingerprint_sha256,
      "apply_transport_failed_after_submission_attempt",
      {
        error_class: text((error as { name?: unknown })?.name || "Error").slice(0, 80),
      },
    );
  }

  const parsed = parseValidAppliedRuntime(response.json, response.status, attemptId);
  if (!parsed) {
    return ambiguousApply(
      attemptId,
      plan.plan_fingerprint_sha256,
      plan.runtime_policy_fingerprint_sha256,
      "apply_result_boundary_invalid_after_submission_attempt",
      { http_status: response.status },
    );
  }

  if (parsed.kind === "broadcast_accepted") {
    return {
      marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
      version: 1,
      ok: true,
      status: "broadcast_accepted",
      applied: true,
      attempt_id: attemptId,
      plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      runtime_policy_fingerprint_sha256: plan.runtime_policy_fingerprint_sha256,
      expected_transaction_hash: parsed.expected_transaction_hash,
      transaction_hash: parsed.transaction_hash,
      provider_submission_id: parsed.provider_submission_id,
      mutation_performed: true,
      signing_performed: true,
      transaction_broadcast_performed: true,
      submission_may_have_occurred: true,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      authority: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
    };
  }

  if (parsed.kind === "not_broadcast") {
    return {
      marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
      version: 1,
      ok: false,
      status: "not_broadcast",
      applied: true,
      attempt_id: attemptId,
      stage: "native_execution",
      reason: parsed.reason,
      plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      runtime_policy_fingerprint_sha256: plan.runtime_policy_fingerprint_sha256,
      expected_transaction_hash: parsed.expected_transaction_hash,
      mutation_performed: parsed.mutation_performed,
      signing_performed: parsed.signing_performed,
      transaction_broadcast_performed: false,
      submission_may_have_occurred: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      authority: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
    };
  }

  if (parsed.kind === "broadcast_unknown") {
    return {
      marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
      version: 1,
      ok: false,
      status: "broadcast_unknown",
      applied: true,
      attempt_id: attemptId,
      stage: "native_execution",
      reason: parsed.reason,
      plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      runtime_policy_fingerprint_sha256: plan.runtime_policy_fingerprint_sha256,
      expected_transaction_hash: parsed.expected_transaction_hash,
      mutation_performed: parsed.mutation_performed,
      signing_performed: parsed.signing_performed,
      transaction_broadcast_performed: parsed.transaction_broadcast_performed,
      submission_may_have_occurred: true,
      reconciliation_required: true,
      automatic_retry_allowed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      authority: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
    };
  }

  return {
    marker: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_V1,
    version: 1,
    ok: false,
    status: "held",
    applied: true,
    attempt_id: attemptId,
    stage: "native_execution",
    reason: parsed.reason,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    runtime_policy_fingerprint_sha256: plan.runtime_policy_fingerprint_sha256,
    expected_transaction_hash: parsed.expected_transaction_hash,
    mutation_performed: parsed.mutation_performed,
    signing_performed: parsed.signing_performed,
    transaction_broadcast_performed: parsed.transaction_broadcast_performed,
    submission_may_have_occurred:
      parsed.reconciliation_required || parsed.transaction_broadcast_performed,
    reconciliation_required: parsed.reconciliation_required,
    automatic_retry_allowed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    authority: VOID_BUY_VOID_PRODUCTION_NATIVE_EXECUTION_OPERATOR_AUTHORITY_V1,
  };
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_native_execution_operator_v1.ts --attempt-id <64hex>",
    "  npx tsx scripts/buy_void_production_native_execution_operator_v1.ts --attempt-id <64hex> --apply \\",
    "    --expected-plan-fingerprint-sha256 <64hex> --policy-fingerprint-sha256 <64hex> \\",
    "    --confirm buyVoidNativeExecuteReservedPlan --submission-idempotency-key <64hex>",
    "",
    "Dry-run is the default. Apply is value-bearing and is never retried automatically.",
  ].join("\n");
}

async function main(): Promise<void> {
  if (process.argv.slice(2).includes("--help") || process.argv.slice(2).includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  try {
    const args = parseBuyVoidProductionNativeExecutionOperatorArgsV1(
      process.argv.slice(2),
    );
    const decision = await runBuyVoidProductionNativeExecutionOperatorV1({ args });
    process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
    if (!decision.ok) process.exitCode = decision.reconciliation_required ? 3 : 2;
  } catch (error) {
    process.stderr.write(`${usage()}\n${text((error as Error)?.message || error)}\n`);
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  /(?:^|[\\/])buy_void_production_native_execution_operator_v1\.ts$/.test(
    process.argv[1],
  )
) {
  void main();
}
