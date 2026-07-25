import crypto from "node:crypto";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1 =
  "buyVoidExecuteFreshCandidateAutoClaimOneShot";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_AUTHORITY_V1 = {
  one_plan_per_run: true,
  one_candidate_per_run: true,
  maximum_claimant_invocations: 1,
  disabled_persistent_config_required: true,
  ephemeral_enabled_config_only: true,
  original_config_write: false,
  ephemeral_config_write_on_apply: true,
  ephemeral_config_delete_required: true,
  exact_outer_confirmation_required: true,
  exact_claimant_confirmation_delegated: true,
  automatic_retry: false,
  systemd_change: false,
  service_restart: false,
  rpc_read_delegated_to_claimant: true,
  rpc_write: false,
  claim_journal_write_on_success: true,
  request_journal_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidOneShotActivationPlanV1 = {
  status?: unknown;
  planned?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  activation_plan_fingerprint_sha256?: unknown;
  required_confirmation?: unknown;
  one_shot?: unknown;
  maximum_claim_count?: unknown;
  permanent_authority?: unknown;
  required_post_run_restore?: unknown;
};

export type BuyVoidOneShotDisabledConfigV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  enabled?: unknown;
  worker_policy?: unknown;
  fulfillment_policy?: unknown;
  disabled_authority?: unknown;
};

export type BuyVoidOneShotAlertV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  alert_fingerprint_sha256?: unknown;
};

export type BuyVoidOneShotExecutorDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      applied: false;
      mutation_performed: false;
      reason: "activation_plan_waiting";
      claimant_invocation_count: 0;
      original_config_write: false;
      ephemeral_config_write: false;
      ephemeral_config_deleted: true;
    }
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      request_id: string;
      activation_plan_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1;
      delegated_claimant_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1;
      claimant_invocation_count: 0;
      original_config_write: false;
      ephemeral_config_write: false;
      ephemeral_config_deleted: true;
    }
  | {
      ok: true;
      status: "claimed" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      request_id: string;
      activation_plan_fingerprint_sha256: string;
      execution_receipt_id_sha256: string;
      claimant_status: "claimed" | "duplicate";
      claimant_invocation_count: 1;
      original_config_write: false;
      ephemeral_config_write: true;
      ephemeral_config_deleted: true;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      inventory_decrement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      mutation_performed: false;
      reason: string;
      claimant_invocation_count: 0 | 1;
      original_config_write: false;
      ephemeral_config_write: boolean;
      ephemeral_config_deleted: boolean;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function lower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value))
    .digest("hex");
}

function falseKeys(value: unknown, keys: string[]): string[] {
  const candidate = record(value) || {};
  return keys.filter((key) => candidate[key] !== false);
}

function unsafeTruePaths(
  value: unknown,
  prefix = "",
): string[] {
  const paths: string[] = [];

  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      paths.push(...unsafeTruePaths(child, `${prefix}[${index}]`));
    });
    return paths;
  }

  const candidate = record(value);
  if (!candidate) return paths;

  for (const [key, child] of Object.entries(candidate)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const lowered = key.toLowerCase();
    const unsafe =
      lowered.includes("wallet_access")
      || lowered.includes("signing")
      || lowered.includes("transaction_broadcast")
      || lowered.includes("money_movement")
      || lowered.includes("inventory_decrement")
      || lowered.includes("automatic_execution");

    if (unsafe && child === true) paths.push(path);
    paths.push(...unsafeTruePaths(child, path));
  }

  return paths;
}

function held(
  applied: boolean,
  reason: string,
  state: {
    claimant_invocation_count?: 0 | 1;
    ephemeral_config_write?: boolean;
    ephemeral_config_deleted?: boolean;
  } = {},
  detail?: Record<string, unknown>,
): BuyVoidOneShotExecutorDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied,
    mutation_performed: false,
    reason,
    claimant_invocation_count:
      state.claimant_invocation_count || 0,
    original_config_write: false,
    ephemeral_config_write:
      state.ephemeral_config_write === true,
    ephemeral_config_deleted:
      state.ephemeral_config_deleted !== false,
    ...(detail ? { detail } : {}),
  };
}

export async function runBuyVoidFreshCandidateAutoClaimOneShotExecutorV1(
  input: {
    activation_plan: BuyVoidOneShotActivationPlanV1;
    disabled_config: BuyVoidOneShotDisabledConfigV1;
    alert?: BuyVoidOneShotAlertV1 | null;
    apply?: boolean;
    confirmation?: unknown;
    create_ephemeral_enabled_config: (input: {
      request_id: string;
      activation_plan_fingerprint_sha256: string;
      disabled_config: BuyVoidOneShotDisabledConfigV1;
    }) => Promise<Record<string, unknown>> | Record<string, unknown>;
    run_claimant: (input: {
      request_id: string;
      claimant_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1;
      ephemeral_config: Record<string, unknown>;
    }) => Promise<Record<string, unknown>> | Record<string, unknown>;
    delete_ephemeral_config: (
      input: Record<string, unknown>,
    ) => Promise<boolean> | boolean;
    verify_original_config_unchanged: () =>
      Promise<boolean> | boolean;
  },
): Promise<BuyVoidOneShotExecutorDecisionV1> {
  const apply = input?.apply === true;
  const plan = input?.activation_plan || {};
  const config = input?.disabled_config || {};

  if (
    normalized(config.schema)
      !== "void_buy_void_fresh_candidate_auto_claim_config_v1"
    || normalized(config.marker)
      !== "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIG_V1"
    || Number(config.version) !== 1
  ) {
    return held(apply, "valid_disabled_config_required");
  }

  const worker = record(config.worker_policy) || {};
  const fulfillment = record(config.fulfillment_policy) || {};

  if (
    config.enabled !== false
    || worker.enabled !== false
    || fulfillment.automatic_fulfillment_enabled !== false
  ) {
    return held(apply, "persistent_config_must_remain_disabled");
  }

  if (
    normalized(plan.status) === "waiting"
    && plan.planned === false
  ) {
    return {
      ok: true,
      status: "waiting",
      applied: false,
      mutation_performed: false,
      reason: "activation_plan_waiting",
      claimant_invocation_count: 0,
      original_config_write: false,
      ephemeral_config_write: false,
      ephemeral_config_deleted: true,
    };
  }

  const requestId = normalized(plan.request_id);
  const planFingerprint = lower(
    plan.activation_plan_fingerprint_sha256,
  );

  if (
    normalized(plan.status) !== "planned"
    || plan.planned !== true
    || plan.one_shot !== true
    || Number(plan.maximum_claim_count) !== 1
    || !SAFE_REQUEST_ID.test(requestId)
    || !SAFE_SHA256.test(planFingerprint)
    || normalized(plan.required_confirmation)
      !== "buyVoidArmFreshCandidateAutoClaimOneShot"
  ) {
    return held(apply, "valid_exact_one_activation_plan_required");
  }

  const permanentFailures = falseKeys(
    plan.permanent_authority,
    [
      "wallet_access",
      "signing",
      "transaction_broadcast",
      "money_movement",
      "inventory_decrement",
    ],
  );
  if (permanentFailures.length > 0) {
    return held(
      apply,
      "safe_permanent_authority_required",
      {},
      { failures: permanentFailures },
    );
  }

  const restoreFailures = falseKeys(
    plan.required_post_run_restore,
    [
      "config_enabled",
      "worker_enabled",
      "automatic_fulfillment_enabled",
      "apply_requested",
      "confirmation_supplied",
      "network_access_authorized",
      "runtime_root_write_authorized",
    ],
  );
  if (restoreFailures.length > 0) {
    return held(
      apply,
      "exact_post_run_restore_contract_required",
      {},
      { failures: restoreFailures },
    );
  }

  const alert = input?.alert || {};
  if (
    normalized(alert.schema)
      !== "void_buy_void_observe_and_claim_candidate_alert_v1"
    || normalized(alert.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1"
    || Number(alert.version) !== 1
    || normalized(alert.request_id) !== requestId
    || lower(alert.plan_fingerprint_sha256)
      !== lower(plan.plan_fingerprint_sha256)
    || !SAFE_SHA256.test(lower(alert.alert_fingerprint_sha256))
  ) {
    return held(apply, "exact_alert_binding_required");
  }

  if (!apply) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      request_id: requestId,
      activation_plan_fingerprint_sha256: planFingerprint,
      required_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
      delegated_claimant_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
      claimant_invocation_count: 0,
      original_config_write: false,
      ephemeral_config_write: false,
      ephemeral_config_deleted: true,
    };
  }

  if (
    normalized(input.confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1
  ) {
    return held(
      true,
      "explicit_one_shot_executor_confirmation_required",
      {},
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
      },
    );
  }

  let ephemeral: Record<string, unknown> | null = null;
  let claimant: Record<string, unknown> | null = null;
  let executionError: unknown = null;
  let deleteError: unknown = null;
  let unchanged = false;

  try {
    ephemeral = await input.create_ephemeral_enabled_config({
      request_id: requestId,
      activation_plan_fingerprint_sha256: planFingerprint,
      disabled_config: config,
    });

    claimant = await input.run_claimant({
      request_id: requestId,
      claimant_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
      ephemeral_config: ephemeral,
    });
  } catch (error) {
    executionError = error;
  } finally {
    if (ephemeral) {
      try {
        const deleted = await input.delete_ephemeral_config(
          ephemeral,
        );
        if (deleted !== true) {
          deleteError = new Error(
            "ephemeral_config_delete_not_confirmed",
          );
        }
      } catch (error) {
        deleteError = error;
      }
    }

    try {
      unchanged =
        await input.verify_original_config_unchanged();
    } catch {
      unchanged = false;
    }
  }

  const state = {
    claimant_invocation_count:
      ephemeral && claimant ? 1 as const : 0 as const,
    ephemeral_config_write: ephemeral !== null,
    ephemeral_config_deleted:
      ephemeral === null || deleteError === null,
  };

  if (!unchanged) {
    return held(
      true,
      "original_config_changed",
      state,
    );
  }

  if (deleteError) {
    return held(
      true,
      "ephemeral_config_delete_failed",
      {
        ...state,
        ephemeral_config_deleted: false,
      },
    );
  }

  if (executionError || !claimant) {
    return held(
      true,
      "claimant_execution_failed",
      state,
      {
        error_class: normalized(
          (executionError as { name?: unknown })?.name
          || "Error",
        ).slice(0, 80),
      },
    );
  }

  const unsafePaths = unsafeTruePaths(claimant);
  if (unsafePaths.length > 0) {
    return held(
      true,
      "claimant_authority_violation",
      state,
      { unsafe_paths: unsafePaths.slice(0, 20) },
    );
  }

  if (claimant.ok !== true) {
    return held(
      true,
      "claimant_held",
      state,
      {
        claimant_status: normalized(claimant.status),
        claimant_reason: normalized(claimant.reason),
      },
    );
  }

  const claimantStatus = normalized(claimant.status);
  if (
    claimantStatus !== "claimed"
    && claimantStatus !== "duplicate"
  ) {
    return held(
      true,
      "claimant_terminal_status_required",
      state,
      { claimant_status: claimantStatus },
    );
  }

  const mutation = claimant.mutation_performed === true;
  if (
    (claimantStatus === "claimed" && !mutation)
    || (claimantStatus === "duplicate" && mutation)
  ) {
    return held(
      true,
      "claimant_mutation_status_mismatch",
      state,
    );
  }

  return {
    ok: true,
    status: claimantStatus,
    applied: true,
    mutation_performed: mutation,
    request_id: requestId,
    activation_plan_fingerprint_sha256: planFingerprint,
    execution_receipt_id_sha256: sha256({
      schema:
        "void_buy_void_fresh_candidate_auto_claim_one_shot_execution_receipt_v1",
      request_id: requestId,
      activation_plan_fingerprint_sha256: planFingerprint,
      claimant_status: claimantStatus,
      mutation_performed: mutation,
    }),
    claimant_status: claimantStatus,
    claimant_invocation_count: 1,
    original_config_write: false,
    ephemeral_config_write: true,
    ephemeral_config_deleted: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    inventory_decrement_performed: false,
  };
}
