import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_MARKER_V1,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_SCHEMA_V1,
  fingerprintBuyVoidActivationCredentialV1,
  type BuyVoidActivationCredentialV1,
} from "./buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1 =
  "buyVoidIssueFreshCandidateAutoClaimCredentialOneShot";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_AUTHORITY_V1 = {
  one_credential_per_activation_plan: true,
  credential_ttl_max_ms: 900_000,
  explicit_issue_flag_required: true,
  exact_issuer_confirmation_required: true,
  credential_file_write_on_issue: true,
  credential_file_overwrite: false,
  credential_file_mode: 0o600,
  credential_directory_mode: 0o700,
  credential_content_printed: false,
  automatic_retry: false,
  systemd_change: false,
  service_restart: false,
  rpc_call: false,
  persistent_config_write: false,
  claim_write: false,
  request_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export type BuyVoidCredentialIssuerPlanV1 = {
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

export type BuyVoidCredentialIssuerAlertV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  request_id?: unknown;
  plan_fingerprint_sha256?: unknown;
  alert_fingerprint_sha256?: unknown;
};

export type BuyVoidCredentialIssuerDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      issued: false;
      mutation_performed: false;
      reason: "activation_plan_waiting";
      credential_created: false;
      credential_file_write: false;
    }
  | {
      ok: true;
      status: "ready";
      issued: false;
      mutation_performed: false;
      request_id: string;
      activation_plan_fingerprint_sha256: string;
      alert_fingerprint_sha256: string;
      required_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1;
      maximum_ttl_ms: 900_000;
      credential_created: false;
      credential_file_write: false;
    }
  | {
      ok: true;
      status: "issued";
      issued: true;
      mutation_performed: true;
      request_id: string;
      activation_plan_fingerprint_sha256: string;
      credential_fingerprint_sha256: string;
      credential: BuyVoidActivationCredentialV1;
      credential_created: true;
      credential_file_write: true;
      credential_file_overwrite: false;
      credential_content_printed: false;
    }
  | {
      ok: false;
      status: "held";
      issued: false;
      mutation_performed: false;
      reason: string;
      credential_created: false;
      credential_file_write: false;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const SAFE_COMMIT = /^[0-9a-f]{40}$/;
const MAX_TTL_MS = 900_000 as const;

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

function falseKeys(value: unknown, keys: string[]): string[] {
  const candidate = record(value) || {};
  return keys.filter((key) => candidate[key] !== false);
}

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidCredentialIssuerDecisionV1 {
  return {
    ok: false,
    status: "held",
    issued: false,
    mutation_performed: false,
    reason,
    credential_created: false,
    credential_file_write: false,
    ...(detail ? { detail } : {}),
  };
}

export function issueBuyVoidFreshCandidateAutoClaimActivationCredentialV1(
  input: {
    activation_plan: BuyVoidCredentialIssuerPlanV1;
    alert?: BuyVoidCredentialIssuerAlertV1 | null;
    persistent_config_sha256: unknown;
    executor_release_commit: unknown;
    now_ms?: number;
    ttl_ms?: number;
    issue?: boolean;
    confirmation?: unknown;
    credential_nonce_sha256?: unknown;
  },
): BuyVoidCredentialIssuerDecisionV1 {
  const plan = input?.activation_plan || {};
  const issue = input?.issue === true;

  if (
    normalized(plan.status) === "waiting"
    && plan.planned === false
  ) {
    return {
      ok: true,
      status: "waiting",
      issued: false,
      mutation_performed: false,
      reason: "activation_plan_waiting",
      credential_created: false,
      credential_file_write: false,
    };
  }

  const requestId = normalized(plan.request_id);
  const sourcePlanFingerprint = lower(
    plan.plan_fingerprint_sha256,
  );
  const activationPlanFingerprint = lower(
    plan.activation_plan_fingerprint_sha256,
  );

  if (
    normalized(plan.status) !== "planned"
    || plan.planned !== true
    || plan.one_shot !== true
    || Number(plan.maximum_claim_count) !== 1
    || !SAFE_REQUEST_ID.test(requestId)
    || !SAFE_SHA256.test(sourcePlanFingerprint)
    || !SAFE_SHA256.test(activationPlanFingerprint)
  ) {
    return held("valid_exact_one_activation_plan_required");
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
      "safe_permanent_authority_required",
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
      "exact_post_run_restore_contract_required",
      { failures: restoreFailures },
    );
  }

  const alert = input?.alert || {};
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
    || lower(alert.plan_fingerprint_sha256)
      !== sourcePlanFingerprint
    || !SAFE_SHA256.test(alertFingerprint)
  ) {
    return held("exact_alert_binding_required");
  }

  const configSha = lower(input.persistent_config_sha256);
  const executorCommit = lower(input.executor_release_commit);
  const nowMs = Number.isSafeInteger(input.now_ms)
    ? Number(input.now_ms)
    : Date.now();
  const ttlMs = integer(input.ttl_ms ?? MAX_TTL_MS);

  if (!SAFE_SHA256.test(configSha)) {
    return held("valid_persistent_config_sha256_required");
  }
  if (!SAFE_COMMIT.test(executorCommit)) {
    return held("valid_executor_release_commit_required");
  }
  if (
    ttlMs === null
    || ttlMs <= 0
    || ttlMs > MAX_TTL_MS
  ) {
    return held(
      "credential_ttl_out_of_bounds",
      {
        requested_ttl_ms: input.ttl_ms,
        maximum_ttl_ms: MAX_TTL_MS,
      },
    );
  }

  if (!issue) {
    return {
      ok: true,
      status: "ready",
      issued: false,
      mutation_performed: false,
      request_id: requestId,
      activation_plan_fingerprint_sha256:
        activationPlanFingerprint,
      alert_fingerprint_sha256: alertFingerprint,
      required_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
      maximum_ttl_ms: MAX_TTL_MS,
      credential_created: false,
      credential_file_write: false,
    };
  }

  if (
    normalized(input.confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1
  ) {
    return held(
      "explicit_credential_issuance_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
      },
    );
  }

  const nonce = lower(input.credential_nonce_sha256);
  if (!SAFE_SHA256.test(nonce)) {
    return held("valid_credential_nonce_sha256_required");
  }

  const credentialBase: BuyVoidActivationCredentialV1 = {
    schema:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_SCHEMA_V1,
    marker:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_MARKER_V1,
    version: 1,
    credential_nonce_sha256: nonce,
    request_id: requestId,
    activation_plan_fingerprint_sha256:
      activationPlanFingerprint,
    alert_fingerprint_sha256: alertFingerprint,
    executor_release_commit: executorCommit,
    persistent_config_sha256: configSha,
    issued_at_ms: nowMs,
    expires_at_ms: nowMs + ttlMs,
    maximum_executor_invocations: 1,
    required_executor_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1,
    authority: {
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
    },
  };

  const credentialFingerprint =
    fingerprintBuyVoidActivationCredentialV1(
      credentialBase,
    );

  const credential: BuyVoidActivationCredentialV1 = {
    ...credentialBase,
    credential_fingerprint_sha256:
      credentialFingerprint,
  };

  return {
    ok: true,
    status: "issued",
    issued: true,
    mutation_performed: true,
    request_id: requestId,
    activation_plan_fingerprint_sha256:
      activationPlanFingerprint,
    credential_fingerprint_sha256:
      credentialFingerprint,
    credential,
    credential_created: true,
    credential_file_write: true,
    credential_file_overwrite: false,
    credential_content_printed: false,
  };
}
