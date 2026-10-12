import crypto from "node:crypto";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_SCHEMA_V1 =
  "void_buy_void_fresh_candidate_auto_claim_activation_credential_v1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_MARKER_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_AUTHORITY_V1 = {
  one_credential_per_run: true,
  one_executor_invocation_per_run: true,
  maximum_executor_invocations: 1,
  credential_ttl_max_ms: 900_000,
  credential_one_use: true,
  consumption_intent_before_execution: true,
  automatic_retry: false,
  persistent_config_write: false,
  ephemeral_config_write_delegated_to_executor: true,
  rpc_read_delegated_to_claimant: true,
  rpc_write: false,
  claim_journal_write_delegated: true,
  request_journal_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  systemd_change: false,
  service_restart: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidActivationCredentialV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  credential_nonce_sha256?: unknown;
  credential_fingerprint_sha256?: unknown;
  request_id?: unknown;
  activation_plan_fingerprint_sha256?: unknown;
  alert_fingerprint_sha256?: unknown;
  executor_release_commit?: unknown;
  persistent_config_sha256?: unknown;
  issued_at_ms?: unknown;
  expires_at_ms?: unknown;
  maximum_executor_invocations?: unknown;
  required_executor_confirmation?: unknown;
  authority?: unknown;
};

export type BuyVoidActivationCredentialPlanV1 = {
  status?: unknown;
  planned?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  activation_plan_fingerprint_sha256?: unknown;
  one_shot?: unknown;
  maximum_claim_count?: unknown;
  permanent_authority?: unknown;
  required_post_run_restore?: unknown;
};

export type BuyVoidActivationCredentialAlertV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  alert_fingerprint_sha256?: unknown;
};

export type BuyVoidActivationCredentialRunnerDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      executed: false;
      mutation_performed: false;
      reason: "activation_plan_waiting";
      executor_invocation_count: 0;
      credential_consumed: false;
      consumption_intent_written: false;
    }
  | {
      ok: true;
      status: "ready";
      executed: false;
      mutation_performed: false;
      request_id: string;
      credential_fingerprint_sha256: string;
      required_execute_flag: true;
      executor_invocation_count: 0;
      credential_consumed: false;
      consumption_intent_written: false;
    }
  | {
      ok: true;
      status: "claimed" | "duplicate";
      executed: true;
      mutation_performed: boolean;
      request_id: string;
      credential_fingerprint_sha256: string;
      execution_receipt_id_sha256: string;
      executor_status: "claimed" | "duplicate";
      executor_invocation_count: 1;
      credential_consumed: true;
      consumption_intent_written: true;
      consumption_finalized: true;
      wallet_access_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      inventory_decrement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      executed: boolean;
      mutation_performed: false;
      reason: string;
      executor_invocation_count: 0 | 1;
      credential_consumed: boolean;
      consumption_intent_written: boolean;
      consumption_finalized?: boolean;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const SAFE_COMMIT = /^[0-9a-f]{40}$/;
const MAX_CREDENTIAL_TTL_MS = 15 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 30 * 1000;

const EXPECTED_CREDENTIAL_AUTHORITY: Record<string, unknown> = {
  apply_authorized: true,
  claim_journal_write_authorized: true,
  rpc_read_authorized: true,
  persistent_config_write_authorized: false,
  request_journal_write_authorized: false,
  inventory_reservation_authorized: false,
  inventory_decrement_authorized: false,
  automatic_retry_authorized: false,
  systemd_change_authorized: false,
  service_restart_authorized: false,
  wallet_access_authorized: false,
  signing_authorized: false,
  transaction_broadcast_authorized: false,
  money_movement_authorized: false,
};

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

function integer(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
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
  const rendered = JSON.stringify(value);
  return rendered === undefined ? "null" : rendered;
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

function authorityFailures(value: unknown): string[] {
  const candidate = record(value) || {};
  return Object.entries(EXPECTED_CREDENTIAL_AUTHORITY)
    .filter(([key, expected]) => candidate[key] !== expected)
    .map(([key]) => key);
}

function held(
  executed: boolean,
  reason: string,
  state: {
    executor_invocation_count?: 0 | 1;
    credential_consumed?: boolean;
    consumption_intent_written?: boolean;
    consumption_finalized?: boolean;
  } = {},
  detail?: Record<string, unknown>,
): BuyVoidActivationCredentialRunnerDecisionV1 {
  return {
    ok: false,
    status: "held",
    executed,
    mutation_performed: false,
    reason,
    executor_invocation_count:
      state.executor_invocation_count || 0,
    credential_consumed:
      state.credential_consumed === true,
    consumption_intent_written:
      state.consumption_intent_written === true,
    ...(state.consumption_finalized !== undefined
      ? {
          consumption_finalized:
            state.consumption_finalized,
        }
      : {}),
    ...(detail ? { detail } : {}),
  };
}

function credentialFingerprintBase(
  credential: BuyVoidActivationCredentialV1,
): Record<string, unknown> {
  return {
    schema: credential.schema,
    marker: credential.marker,
    version: credential.version,
    credential_nonce_sha256:
      lower(credential.credential_nonce_sha256),
    request_id: normalized(credential.request_id),
    activation_plan_fingerprint_sha256:
      lower(credential.activation_plan_fingerprint_sha256),
    alert_fingerprint_sha256:
      lower(credential.alert_fingerprint_sha256),
    executor_release_commit:
      lower(credential.executor_release_commit),
    persistent_config_sha256:
      lower(credential.persistent_config_sha256),
    issued_at_ms: integer(credential.issued_at_ms),
    expires_at_ms: integer(credential.expires_at_ms),
    maximum_executor_invocations:
      integer(credential.maximum_executor_invocations),
    required_executor_confirmation:
      normalized(credential.required_executor_confirmation),
    authority: credential.authority,
  };
}

export function fingerprintBuyVoidActivationCredentialV1(
  credential: BuyVoidActivationCredentialV1,
): string {
  return sha256(credentialFingerprintBase(credential));
}

export async function runBuyVoidFreshCandidateAutoClaimActivationCredentialRunnerV1(
  input: {
    activation_plan: BuyVoidActivationCredentialPlanV1;
    alert?: BuyVoidActivationCredentialAlertV1 | null;
    credential?: BuyVoidActivationCredentialV1 | null;
    persistent_config_sha256: unknown;
    executor_release_commit: unknown;
    now_ms?: number;
    execute?: boolean;
    write_consumption_intent: (input: {
      credential_fingerprint_sha256: string;
      request_id: string;
      activation_plan_fingerprint_sha256: string;
    }) => Promise<boolean> | boolean;
    run_executor: (input: {
      request_id: string;
      executor_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1;
      credential_fingerprint_sha256: string;
    }) => Promise<Record<string, unknown>> | Record<string, unknown>;
    finalize_consumption: (input: {
      credential_fingerprint_sha256: string;
      request_id: string;
      outcome: "claimed" | "duplicate" | "held";
      executor_result: Record<string, unknown>;
    }) => Promise<boolean> | boolean;
  },
): Promise<BuyVoidActivationCredentialRunnerDecisionV1> {
  const plan = input?.activation_plan || {};
  const execute = input?.execute === true;

  if (
    normalized(plan.status) === "waiting"
    && plan.planned === false
  ) {
    return {
      ok: true,
      status: "waiting",
      executed: false,
      mutation_performed: false,
      reason: "activation_plan_waiting",
      executor_invocation_count: 0,
      credential_consumed: false,
      consumption_intent_written: false,
    };
  }

  const requestId = normalized(plan.request_id);
  const activationPlanFingerprint = lower(
    plan.activation_plan_fingerprint_sha256,
  );

  if (
    normalized(plan.status) !== "planned"
    || plan.planned !== true
    || plan.one_shot !== true
    || Number(plan.maximum_claim_count) !== 1
    || !SAFE_REQUEST_ID.test(requestId)
    || !SAFE_SHA256.test(activationPlanFingerprint)
  ) {
    return held(
      execute,
      "valid_exact_one_activation_plan_required",
    );
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
      execute,
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
      execute,
      "exact_post_run_restore_contract_required",
      {},
      { failures: restoreFailures },
    );
  }

  const alert = input?.alert || {};
  const alertPlanFingerprint = lower(
    alert.plan_fingerprint_sha256,
  );
  const alertFingerprint = lower(
    alert.alert_fingerprint_sha256,
  );

  if (
    normalized(alert.schema)
      !== "void_buy_void_observe_and_claim_candidate_alert_v1"
    || normalized(alert.marker)
      !== "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1"
    || Number(alert.version) !== 1
    || normalized(alert.request_id) !== requestId
    || alertPlanFingerprint
      !== lower(plan.plan_fingerprint_sha256)
    || !SAFE_SHA256.test(alertFingerprint)
  ) {
    return held(execute, "exact_alert_binding_required");
  }

  const credential = input?.credential || {};
  const credentialFingerprint = lower(
    credential.credential_fingerprint_sha256,
  );

  if (
    normalized(credential.schema)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_SCHEMA_V1
    || normalized(credential.marker)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_MARKER_V1
    || Number(credential.version) !== 1
  ) {
    return held(execute, "valid_activation_credential_required");
  }

  const nonce = lower(credential.credential_nonce_sha256);
  const credentialRequest = normalized(credential.request_id);
  const credentialPlan = lower(
    credential.activation_plan_fingerprint_sha256,
  );
  const credentialAlert = lower(
    credential.alert_fingerprint_sha256,
  );
  const credentialCommit = lower(
    credential.executor_release_commit,
  );
  const credentialConfig = lower(
    credential.persistent_config_sha256,
  );
  const issuedAt = integer(credential.issued_at_ms);
  const expiresAt = integer(credential.expires_at_ms);
  const nowMs = Number.isSafeInteger(input.now_ms)
    ? Number(input.now_ms)
    : Date.now();

  if (
    !SAFE_SHA256.test(nonce)
    || !SAFE_SHA256.test(credentialFingerprint)
    || !SAFE_COMMIT.test(credentialCommit)
    || !SAFE_SHA256.test(credentialConfig)
    || issuedAt === null
    || expiresAt === null
  ) {
    return held(execute, "valid_activation_credential_shape_required");
  }

  if (
    credentialFingerprint
      !== fingerprintBuyVoidActivationCredentialV1(credential)
  ) {
    return held(
      execute,
      "activation_credential_fingerprint_mismatch",
    );
  }

  if (
    credentialRequest !== requestId
    || credentialPlan !== activationPlanFingerprint
    || credentialAlert !== alertFingerprint
    || credentialCommit
      !== lower(input.executor_release_commit)
    || credentialConfig
      !== lower(input.persistent_config_sha256)
  ) {
    return held(
      execute,
      "activation_credential_binding_mismatch",
    );
  }

  if (
    Number(credential.maximum_executor_invocations) !== 1
    || normalized(credential.required_executor_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1
  ) {
    return held(
      execute,
      "one_shot_executor_authority_required",
    );
  }

  const credentialAuthorityFailures = authorityFailures(
    credential.authority,
  );
  if (credentialAuthorityFailures.length > 0) {
    return held(
      execute,
      "exact_activation_credential_authority_required",
      {},
      { failures: credentialAuthorityFailures },
    );
  }

  if (
    issuedAt > nowMs + MAX_CLOCK_SKEW_MS
    || expiresAt < nowMs
    || expiresAt <= issuedAt
    || expiresAt - issuedAt > MAX_CREDENTIAL_TTL_MS
  ) {
    return held(
      execute,
      "activation_credential_not_current",
      {},
      {
        now_ms: nowMs,
        issued_at_ms: issuedAt,
        expires_at_ms: expiresAt,
        maximum_ttl_ms: MAX_CREDENTIAL_TTL_MS,
      },
    );
  }

  if (!execute) {
    return {
      ok: true,
      status: "ready",
      executed: false,
      mutation_performed: false,
      request_id: requestId,
      credential_fingerprint_sha256: credentialFingerprint,
      required_execute_flag: true,
      executor_invocation_count: 0,
      credential_consumed: false,
      consumption_intent_written: false,
    };
  }

  let intentWritten = false;
  try {
    intentWritten =
      await input.write_consumption_intent({
        credential_fingerprint_sha256: credentialFingerprint,
        request_id: requestId,
        activation_plan_fingerprint_sha256:
          activationPlanFingerprint,
      });
  } catch {
    intentWritten = false;
  }

  if (!intentWritten) {
    return held(
      true,
      "activation_credential_already_consumed_or_inflight",
    );
  }

  let executorResult: Record<string, unknown>;
  try {
    executorResult = await input.run_executor({
      request_id: requestId,
      executor_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
      credential_fingerprint_sha256: credentialFingerprint,
    });
  } catch (error) {
    executorResult = {
      ok: false,
      status: "held",
      reason: "executor_call_failed",
      error_class: normalized(
        (error as { name?: unknown })?.name || "Error",
      ).slice(0, 80),
    };
  }

  const executorStatus = normalized(executorResult.status);
  const executorOk = executorResult.ok === true;
  const outcome =
    executorOk
    && (executorStatus === "claimed" || executorStatus === "duplicate")
      ? executorStatus as "claimed" | "duplicate"
      : "held";

  let finalized = false;
  try {
    finalized = await input.finalize_consumption({
      credential_fingerprint_sha256: credentialFingerprint,
      request_id: requestId,
      outcome,
      executor_result: executorResult,
    });
  } catch {
    finalized = false;
  }

  const state = {
    executor_invocation_count: 1 as const,
    credential_consumed: true,
    consumption_intent_written: true,
    consumption_finalized: finalized,
  };

  if (!finalized) {
    return held(
      true,
      "activation_credential_consumption_finalize_failed",
      state,
    );
  }

  if (!executorOk) {
    return held(
      true,
      "one_shot_executor_held",
      state,
      {
        executor_status: executorStatus,
        executor_reason: normalized(executorResult.reason),
      },
    );
  }

  if (
    executorStatus !== "claimed"
    && executorStatus !== "duplicate"
  ) {
    return held(
      true,
      "one_shot_executor_terminal_status_required",
      state,
      { executor_status: executorStatus },
    );
  }

  const mutation = executorResult.mutation_performed === true;
  if (
    (executorStatus === "claimed" && !mutation)
    || (executorStatus === "duplicate" && mutation)
  ) {
    return held(
      true,
      "one_shot_executor_mutation_status_mismatch",
      state,
    );
  }

  return {
    ok: true,
    status: executorStatus,
    executed: true,
    mutation_performed: mutation,
    request_id: requestId,
    credential_fingerprint_sha256: credentialFingerprint,
    execution_receipt_id_sha256: sha256({
      schema:
        "void_buy_void_fresh_candidate_auto_claim_activation_credential_execution_receipt_v1",
      request_id: requestId,
      credential_fingerprint_sha256: credentialFingerprint,
      executor_status: executorStatus,
      mutation_performed: mutation,
    }),
    executor_status: executorStatus,
    executor_invocation_count: 1,
    credential_consumed: true,
    consumption_intent_written: true,
    consumption_finalized: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    inventory_decrement_performed: false,
  };
}
