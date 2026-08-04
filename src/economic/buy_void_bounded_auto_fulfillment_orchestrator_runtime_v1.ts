import path from "node:path";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1,
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_V1,
  runBuyVoidBoundedAutoFulfillmentOrchestratorV1,
  type BuyVoidBoundedAutoFulfillmentDependenciesV1,
} from "./buy_void_bounded_auto_fulfillment_orchestrator_v1.js";
import {
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1,
  deriveBuyVoidBoundedOrchestratorServerSnapshotV1,
  type BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1,
} from "./buy_void_bounded_orchestrator_server_snapshot_v1.js";
import {
  buyVoidBoundedOrchestratorApplyActivationStatusV1,
  evaluateBuyVoidBoundedOrchestratorApplyActivationV1,
  type BuyVoidBoundedOrchestratorApplyActivationPolicyV1,
} from "./buy_void_bounded_orchestrator_apply_activation_gate_v1.js";

export const VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1 =
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1";

export const VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1 =
  "run_bounded_auto_fulfillment_stage";

export const VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  server_controlled_root_dir: true,
  server_controlled_request_dir: true,
  server_derived_snapshot: true,
  request_id_only_selector: true,
  client_supplied_snapshot_forbidden: true,
  apply_activation_gate_present: true,
  apply_activation_gate_disabled_by_default: true,
  apply_activation_enabled_stage_count: 0,
  runtime_apply_execution_mounted_v1: true,
  runtime_apply_non_money_only_v1: true,
  legacy_apply_hard_stop_error_v1: "runtime_apply_not_enabled_v1",
  max_requests_per_invocation: 1,
  one_stage_transition_per_invocation: true,
  dry_by_default: true,
  runtime_apply_enabled_v1: false,
  claim_or_reservation_state_write_possible: true,
  public_route: false,
  background_loop: false,
  startup_execution: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_SURFACE_V1 = {
  parent_status_route: "/__void/operator/buy-void-runtime-v1/status",
  parent_command_route: "/__void/operator/buy-void-runtime-v1/command",
  action:
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
} as const;

const ENABLE_ENV =
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ENABLED";
const MAX_REQUESTS_ENV =
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_MAX_REQUESTS_PER_RUN";
const REQUEST_DIR_ENV =
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_REQUEST_DIR";
const APPLY_ENABLED_ENV =
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ENABLED";
const APPLY_ALLOWED_STAGES_ENV =
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ALLOWED_STAGES";

const NON_MONEY_APPLY_STAGES = [
  "observe_and_claim",
  "reserve_inventory_and_attempt",
] as const;

type NonMoneyApplyStageV1 =
  typeof NON_MONEY_APPLY_STAGES[number];

function enabled(): boolean {
  return /^(1|true|yes|on)$/i.test(
    String(process.env[ENABLE_ENV] || "").trim(),
  );
}

function isNonMoneyApplyStage(
  value: string,
): value is NonMoneyApplyStageV1 {
  return (
    NON_MONEY_APPLY_STAGES as readonly string[]
  ).includes(value);
}

function serverApplyPolicy(): {
  policy: BuyVoidBoundedOrchestratorApplyActivationPolicyV1;
  requested_enabled: boolean;
  configured_tokens: string[];
  invalid_tokens: string[];
  valid: boolean;
  error: string | null;
} {
  const requestedEnabled = /^(1|true|yes|on)$/i.test(
    String(process.env[APPLY_ENABLED_ENV] || "").trim(),
  );
  const configuredTokens = Array.from(new Set(
    String(process.env[APPLY_ALLOWED_STAGES_ENV] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  )).sort();
  const invalidTokens = configuredTokens.filter(
    (value) => !isNonMoneyApplyStage(value),
  );
  const allowedStages = configuredTokens.filter(
    isNonMoneyApplyStage,
  );
  const error = invalidTokens.length > 0
    ? "invalid_server_apply_stage_allowlist"
    : requestedEnabled && allowedStages.length === 0
      ? "enabled_server_apply_policy_requires_stage"
      : null;
  const valid = error === null;

  return {
    policy: {
      enabled: requestedEnabled && valid,
      allowed_stages: valid ? allowedStages : [],
    },
    requested_enabled: requestedEnabled,
    configured_tokens: configuredTokens,
    invalid_tokens: invalidTokens,
    valid,
    error,
  };
}

function loopback(req: any): boolean {
  const address = String(
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    req?.ip ||
    "",
  ).trim().toLowerCase();
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1"
  );
}

function forbiddenExecutionKey(value: unknown): string {
  const forbidden = new Set([
    "private_key",
    "privatekey",
    "mnemonic",
    "seed_phrase",
    "seedphrase",
    "raw_signed_transaction",
    "signed_transaction",
    "wallet_secret",
    "keystore",
  ]);
  const seen = new Set<object>();

  function visit(candidate: unknown): string {
    if (!candidate || typeof candidate !== "object") return "";
    if (seen.has(candidate as object)) return "";
    seen.add(candidate as object);
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const nested = visit(item);
        if (nested) return nested;
      }
      return "";
    }
    for (const [key, child] of Object.entries(
      candidate as Record<string, unknown>,
    )) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (forbidden.has(normalized)) return key;
      const nested = visit(child);
      if (nested) return nested;
    }
    return "";
  }
  return visit(value);
}

function responseStatus(decision: any): number {
  if (decision?.ok === true) return 200;
  if (decision?.reason === "request_already_fulfilled") return 409;
  return 422;
}

export function buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1():
  Record<string, unknown> {
  const configuredMax = Number(
    String(process.env[MAX_REQUESTS_ENV] || "1"),
  );
  const applyPolicy = serverApplyPolicy();
  return {
    marker:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    max_requests_env: MAX_REQUESTS_ENV,
    configured_max_requests_per_run:
      Number.isSafeInteger(configuredMax) ? configuredMax : null,
    effective_max_requests_per_run: 1,
    request_dir_env: REQUEST_DIR_ENV,
    apply_enabled_env: APPLY_ENABLED_ENV,
    apply_allowed_stages_env: APPLY_ALLOWED_STAGES_ENV,
    apply_policy_requested_enabled:
      applyPolicy.requested_enabled,
    apply_policy_valid: applyPolicy.valid,
    apply_policy_error: applyPolicy.error,
    apply_policy_configured_tokens:
      applyPolicy.configured_tokens,
    apply_policy_invalid_tokens:
      applyPolicy.invalid_tokens,
    snapshot_source: "server_derived_request_id_only",
    client_supplied_snapshot_forbidden: true,
    request_id_only_selector: true,
    server_snapshot_authority:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_AUTHORITY_V1,
    apply_activation_gate:
      buyVoidBoundedOrchestratorApplyActivationStatusV1(
        applyPolicy.policy,
      ),
    runtime_surface:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_SURFACE_V1,
    required_confirmation:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
    orchestrator_marker:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_V1,
    orchestrator_authority:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1,
    runtime_authority:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1,
  };
}

export async function handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
  req: any,
  res: any,
  options: {
    root_dir: string;
    request_dir?: string;
    dependencies?: BuyVoidBoundedAutoFulfillmentDependenciesV1;
    snapshot_dependencies?:
      BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1;
  },
): Promise<unknown> {
  if (!loopback(req)) {
    return res.status(403).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "operator_loopback_only",
    });
  }
  if (!enabled()) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "bounded_auto_fulfillment_orchestrator_disabled",
      enabled: false,
      enable_env: ENABLE_ENV,
    });
  }

  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }
  if (
    String(body.action || "") !==
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1
  ) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "invalid_orchestrator_action",
      expected_action:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
    });
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "root_dir") ||
    Object.prototype.hasOwnProperty.call(body, "request_dir")
  ) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "runtime_paths_are_server_controlled",
    });
  }

  const forbiddenKey = forbiddenExecutionKey(body);
  if (forbiddenKey) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "forbidden_execution_material",
      forbidden_key: forbiddenKey,
    });
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "activation_policy") ||
    Object.prototype.hasOwnProperty.call(body, "allowed_stages") ||
    Object.prototype.hasOwnProperty.call(body, "enabled_stages")
  ) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "runtime_activation_policy_is_server_controlled",
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "snapshot")
  ) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "client_supplied_snapshot_forbidden",
      snapshot_source: "server_derived_request_id_only",
    });
  }

  const requestId = String(body.request_id || "").trim();
  if (!requestId) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "request_id_required",
    });
  }
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(requestId)) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "invalid_request_id",
    });
  }

  const configuredMax = Number(
    String(process.env[MAX_REQUESTS_ENV] || "1"),
  );
  if (Number.isFinite(configuredMax) && configuredMax !== 1) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "hard_request_cap_mismatch",
      required_max_requests_per_run: 1,
    });
  }

  const requestDir = String(
    options.request_dir ||
    process.env[REQUEST_DIR_ENV] ||
    path.join(
      process.cwd(),
      ".runtime",
      "public-buy-void-requests-v1",
    ),
  ).trim();

  const derived =
    deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
      root_dir: options.root_dir,
      request_dir: requestDir,
      request_id: requestId,
      dependencies: options.snapshot_dependencies,
    });

  if (derived.status === "held") {
    return res.status(422).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      ok: false,
      error: "server_snapshot_derivation_held",
      reason: derived.reason,
      ...(derived.detail ? { detail: derived.detail } : {}),
    });
  }

  const stageCommand =
    body.stage_command &&
    typeof body.stage_command === "object" &&
    !Array.isArray(body.stage_command)
      ? body.stage_command as Record<string, unknown>
      : undefined;

  const decision =
    await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
      root_dir: options.root_dir,
      request_dir: requestDir,
      snapshot: derived.snapshot,
      stage_command: stageCommand,
      apply: false,
      dependencies: options.dependencies,
    });

  const serverPolicy = serverApplyPolicy();
  const applyActivation =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy: serverPolicy.policy,
      request_id: requestId,
      derived_snapshot: derived.snapshot,
      snapshot_evidence: derived.evidence,
      dry_run_decision: decision,
      stage_command: stageCommand,
      apply: body.apply === true,
      plan_fingerprint: body.plan_fingerprint,
      confirmation: body.confirmation,
      delegated_confirmation: body.delegated_confirmation,
      stage_confirmation: body.stage_confirmation,
    });

  if (body.apply === true) {
    if (!serverPolicy.valid) {
      return res.status(503).json({
        marker:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
        ok: false,
        error: "server_apply_policy_invalid",
        server_apply_policy: serverPolicy,
        apply_activation: applyActivation,
        runtime_apply_execution_mounted_v1: true,
        money_moving_runtimes_remain_separately_gated: true,
      });
    }

    if (applyActivation.status !== "authorized") {
      const disabled =
        applyActivation.status === "held" &&
        applyActivation.reason === "apply_activation_gate_disabled";
      return res.status(disabled ? 503 : 422).json({
        marker:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
        ok: false,
        error: disabled
          ? "runtime_apply_not_enabled_v1"
          : applyActivation.status === "held"
            ? applyActivation.reason
            : "runtime_apply_authorization_required",
        ...(disabled
          ? {
              activation_error: applyActivation.reason,
              legacy_apply_hard_stop: true,
            }
          : {}),
        server_apply_policy: serverPolicy,
        apply_activation: applyActivation,
        runtime_apply_execution_mounted_v1: true,
        money_moving_runtimes_remain_separately_gated: true,
      });
    }

    const appliedDecision =
      await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
        root_dir: options.root_dir,
        request_dir: requestDir,
        snapshot: derived.snapshot,
        stage_command: stageCommand,
        apply: true,
        confirmation: body.confirmation,
        delegated_confirmation: body.delegated_confirmation,
        dependencies: options.dependencies,
      });

    if (
      appliedDecision.wallet_access_performed ||
      appliedDecision.signing_performed ||
      appliedDecision.transaction_broadcast_performed ||
      appliedDecision.money_movement_performed
    ) {
      return res.status(500).json({
        marker:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
        ok: false,
        error: "non_money_runtime_reported_forbidden_authority",
        apply_activation: applyActivation,
        decision: appliedDecision,
      });
    }

    return res.status(responseStatus(appliedDecision)).json({
      marker:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
      version: 1,
      ok: appliedDecision.ok,
      enabled: true,
      dry_run_only: false,
      apply_executed: appliedDecision.ok === true,
      root_dir_server_controlled: true,
      request_dir_server_controlled: true,
      effective_max_requests_per_run: 1,
      action:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
      snapshot_source: "server_derived_request_id_only",
      derived_snapshot: derived.snapshot,
      snapshot_evidence: derived.evidence,
      server_apply_policy: serverPolicy,
      apply_activation: applyActivation,
      runtime_apply_execution_mounted_v1: true,
      money_moving_runtimes_remain_separately_gated: true,
      decision: appliedDecision,
    });
  }

  return res.status(responseStatus(decision)).json({
    marker:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1,
    version: 1,
    ok: decision.ok,
    enabled: true,
    dry_run_only: true,
    root_dir_server_controlled: true,
    request_dir_server_controlled: true,
    effective_max_requests_per_run: 1,
    action:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
    snapshot_source: "server_derived_request_id_only",
    derived_snapshot: derived.snapshot,
    snapshot_evidence: derived.evidence,
    apply_activation: applyActivation,
    decision,
  });
}
