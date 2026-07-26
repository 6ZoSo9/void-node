import crypto from "node:crypto";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1 =
  "buyVoidConsumeFreshCandidateAutoClaimActivationOperatorApprovalOneShot";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_AUTHORITY_V1 = {
  dry_by_default: true,
  exact_one_approval_required: true,
  exact_consumer_confirmation_required: true,
  consumption_intent_before_ceremony: true,
  maximum_ceremony_invocations: 1,
  maximum_issuer_invocations: 1,
  maximum_runner_invocations: 1,
  automatic_retry: false,
  persistent_config_write: false,
  request_journal_write: false,
  inventory_reservation: false,
  inventory_decrement: false,
  direct_rpc_call: false,
  direct_claim_write: false,
  direct_wallet_access: false,
  direct_signing: false,
  direct_transaction_broadcast: false,
  direct_money_movement: false,
} as const;

export type BuyVoidActivationOperatorApprovalEnvelopeV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  request_id?: unknown;
  admission_packet_sha256?: unknown;
  plan_fingerprint_sha256?: unknown;
  activation_plan_fingerprint_sha256?: unknown;
  alert_fingerprint_sha256?: unknown;
  persistent_config_sha256?: unknown;
  ceremony_release_commit?: unknown;
  issuer_release_commit?: unknown;
  runner_release_commit?: unknown;
  executor_release_commit?: unknown;
  issued_at_ms?: unknown;
  expires_at_ms?: unknown;
  maximum_approval_ttl_seconds?: unknown;
  maximum_ceremony_invocations?: unknown;
  maximum_issuer_invocations?: unknown;
  maximum_runner_invocations?: unknown;
  required_issuer_confirmation?: unknown;
  required_execution_confirmation?: unknown;
  operator_approved?: unknown;
  automatic_execution?: unknown;
  consumed?: unknown;
  approval_fingerprint_sha256?: unknown;
};

export type BuyVoidActivationApprovalConsumerDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      execute_authorized: false;
      reason: "no_operator_approval";
      mutation_performed: false;
    }
  | {
      ok: true;
      status: "ready";
      execute_authorized: false;
      mutation_performed: false;
      request_id: string;
      approval_fingerprint_sha256: string;
      required_consumer_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1;
    }
  | {
      ok: true;
      status: "authorized";
      execute_authorized: true;
      mutation_performed: false;
      request_id: string;
      approval_fingerprint_sha256: string;
      required_issuer_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1;
      required_execution_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1;
      maximum_ceremony_invocations: 1;
      maximum_issuer_invocations: 1;
      maximum_runner_invocations: 1;
    }
  | {
      ok: false;
      status: "held";
      execute_authorized: false;
      mutation_performed: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const SAFE_COMMIT = /^[0-9a-f]{40}$/;

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

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJson(object[key])}`,
    )
    .join(",")}}`;
}

export function computeBuyVoidActivationOperatorApprovalFingerprintV1(
  approval: BuyVoidActivationOperatorApprovalEnvelopeV1,
): string {
  const clone = {
    ...(approval as Record<string, unknown>),
  };
  delete clone.approval_fingerprint_sha256;

  return crypto
    .createHash("sha256")
    .update(canonicalJson(clone))
    .digest("hex");
}

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidActivationApprovalConsumerDecisionV1 {
  return {
    ok: false,
    status: "held",
    execute_authorized: false,
    mutation_performed: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

export function authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalConsumerV1(
  input: {
    approval?: BuyVoidActivationOperatorApprovalEnvelopeV1 | null;
    now_ms: number;
    current_admission_packet_sha256: unknown;
    current_plan_fingerprint_sha256: unknown;
    current_activation_plan_fingerprint_sha256: unknown;
    current_alert_fingerprint_sha256: unknown;
    current_persistent_config_sha256: unknown;
    ceremony_release_commit: unknown;
    issuer_release_commit: unknown;
    runner_release_commit: unknown;
    executor_release_commit: unknown;
    execute?: boolean;
    confirmation?: unknown;
  },
): BuyVoidActivationApprovalConsumerDecisionV1 {
  if (!input?.approval) {
    return {
      ok: true,
      status: "waiting",
      execute_authorized: false,
      reason: "no_operator_approval",
      mutation_performed: false,
    };
  }

  const approval = input.approval;
  const approvalRecord = record(approval);
  if (!approvalRecord) {
    return held("operator_approval_object_required");
  }

  if (
    normalized(approval.schema)
      !== "void_buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1"
    || normalized(approval.marker)
      !== "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1"
    || Number(approval.version) !== 1
  ) {
    return held("operator_approval_identity_mismatch");
  }

  const requestId = normalized(approval.request_id);
  const approvalFingerprint = lower(
    approval.approval_fingerprint_sha256,
  );
  const computedFingerprint =
    computeBuyVoidActivationOperatorApprovalFingerprintV1(
      approval,
    );

  if (
    !SAFE_REQUEST_ID.test(requestId)
    || !SAFE_SHA256.test(approvalFingerprint)
    || approvalFingerprint !== computedFingerprint
  ) {
    return held("operator_approval_fingerprint_mismatch");
  }

  const issuedAtMs = Number(approval.issued_at_ms);
  const expiresAtMs = Number(approval.expires_at_ms);
  const nowMs = Number(input.now_ms);

  if (
    !Number.isSafeInteger(nowMs)
    || !Number.isSafeInteger(issuedAtMs)
    || !Number.isSafeInteger(expiresAtMs)
    || expiresAtMs <= issuedAtMs
    || expiresAtMs - issuedAtMs > 900_000
    || nowMs < issuedAtMs
    || nowMs >= expiresAtMs
  ) {
    return held("operator_approval_expired_or_invalid");
  }

  if (
    Number(approval.maximum_approval_ttl_seconds) > 900
    || Number(approval.maximum_approval_ttl_seconds) <= 0
    || Number(approval.maximum_ceremony_invocations) !== 1
    || Number(approval.maximum_issuer_invocations) !== 1
    || Number(approval.maximum_runner_invocations) !== 1
    || approval.operator_approved !== true
    || approval.automatic_execution !== false
    || approval.consumed !== false
    || normalized(approval.required_issuer_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1
    || normalized(approval.required_execution_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1
  ) {
    return held("exact_operator_approval_contract_required");
  }

  const exactBindings = [
    [
      lower(approval.admission_packet_sha256),
      lower(input.current_admission_packet_sha256),
      "admission_packet",
      SAFE_SHA256,
    ],
    [
      lower(approval.plan_fingerprint_sha256),
      lower(input.current_plan_fingerprint_sha256),
      "plan_fingerprint",
      SAFE_SHA256,
    ],
    [
      lower(approval.activation_plan_fingerprint_sha256),
      lower(input.current_activation_plan_fingerprint_sha256),
      "activation_plan_fingerprint",
      SAFE_SHA256,
    ],
    [
      lower(approval.alert_fingerprint_sha256),
      lower(input.current_alert_fingerprint_sha256),
      "alert_fingerprint",
      SAFE_SHA256,
    ],
    [
      lower(approval.persistent_config_sha256),
      lower(input.current_persistent_config_sha256),
      "persistent_config",
      SAFE_SHA256,
    ],
    [
      lower(approval.ceremony_release_commit),
      lower(input.ceremony_release_commit),
      "ceremony_release",
      SAFE_COMMIT,
    ],
    [
      lower(approval.issuer_release_commit),
      lower(input.issuer_release_commit),
      "issuer_release",
      SAFE_COMMIT,
    ],
    [
      lower(approval.runner_release_commit),
      lower(input.runner_release_commit),
      "runner_release",
      SAFE_COMMIT,
    ],
    [
      lower(approval.executor_release_commit),
      lower(input.executor_release_commit),
      "executor_release",
      SAFE_COMMIT,
    ],
  ] as const;

  for (const [actual, expected, label, pattern] of exactBindings) {
    if (
      !pattern.test(actual)
      || !pattern.test(expected)
      || actual !== expected
    ) {
      return held(
        `exact_${label}_binding_required`,
      );
    }
  }

  if (input.execute !== true) {
    return {
      ok: true,
      status: "ready",
      execute_authorized: false,
      mutation_performed: false,
      request_id: requestId,
      approval_fingerprint_sha256:
        approvalFingerprint,
      required_consumer_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
    };
  }

  if (
    normalized(input.confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1
  ) {
    return held(
      "exact_consumer_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_CONFIRMATION_V1,
      },
    );
  }

  return {
    ok: true,
    status: "authorized",
    execute_authorized: true,
    mutation_performed: false,
    request_id: requestId,
    approval_fingerprint_sha256:
      approvalFingerprint,
    required_issuer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
    required_execution_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
    maximum_ceremony_invocations: 1,
    maximum_issuer_invocations: 1,
    maximum_runner_invocations: 1,
  };
}
