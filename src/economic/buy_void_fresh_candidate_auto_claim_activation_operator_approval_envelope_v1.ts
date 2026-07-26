import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.js";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
} from "./buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.js";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1 =
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1 =
  "buyVoidApproveFreshCandidateAutoClaimActivationOneShot";

export const VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_AUTHORITY_V1 = {
  dry_by_default: true,
  exact_admitted_packet_required: true,
  exact_operator_confirmation_required: true,
  maximum_approval_ttl_seconds: 900,
  maximum_ceremony_invocations: 1,
  maximum_issuer_invocations: 1,
  maximum_runner_invocations: 1,
  approval_file_overwrite: false,
  process_spawn: false,
  ceremony_invocation: false,
  credential_created: false,
  credential_consumed: false,
  credential_content_printed: false,
  sensitive_values_printed: false,
  automatic_retry: false,
  systemd_change: false,
  service_restart: false,
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

export type BuyVoidActivationAdmissionPacketEnvelopeV1 = {
  schema?: unknown;
  marker?: unknown;
  version?: unknown;
  decision?: unknown;
  operator_approval_required?: unknown;
  automatic_execution?: unknown;
  process_spawn?: unknown;
  issuer_invocation_count?: unknown;
  runner_invocation_count?: unknown;
  credential_created?: unknown;
  credential_consumed?: unknown;
  credential_content_printed?: unknown;
  sensitive_values_printed?: unknown;
  automatic_retry?: unknown;
  systemd_change?: unknown;
  service_restart?: unknown;
  persistent_config_write?: unknown;
  claim_write?: unknown;
  request_write?: unknown;
  inventory_reservation?: unknown;
  inventory_decrement?: unknown;
  wallet_access?: unknown;
  signing?: unknown;
  transaction_broadcast?: unknown;
  money_movement?: unknown;
};

export type BuyVoidActivationOperatorApprovalDecisionV1 =
  | {
      ok: true;
      status: "waiting";
      approved: false;
      mutation_performed: false;
      reason: "activation_admission_packet_waiting";
      approval_file_write_authorized: false;
    }
  | {
      ok: true;
      status: "ready";
      approved: false;
      mutation_performed: false;
      request_id: string;
      admission_packet_sha256: string;
      required_operator_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1;
      approval_file_write_authorized: false;
    }
  | {
      ok: true;
      status: "approved";
      approved: true;
      mutation_performed: false;
      request_id: string;
      admission_packet_sha256: string;
      plan_fingerprint_sha256: string;
      activation_plan_fingerprint_sha256: string;
      alert_fingerprint_sha256: string;
      persistent_config_sha256: string;
      ceremony_release_commit: string;
      issuer_release_commit: string;
      runner_release_commit: string;
      executor_release_commit: string;
      maximum_approval_ttl_seconds: number;
      maximum_ceremony_invocations: 1;
      maximum_issuer_invocations: 1;
      maximum_runner_invocations: 1;
      required_issuer_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1;
      required_execution_confirmation:
        typeof VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1;
      approval_file_write_authorized: true;
      automatic_execution: false;
    }
  | {
      ok: false;
      status: "held";
      approved: false;
      mutation_performed: false;
      reason: string;
      approval_file_write_authorized: false;
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

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidActivationOperatorApprovalDecisionV1 {
  return {
    ok: false,
    status: "held",
    approved: false,
    mutation_performed: false,
    reason,
    approval_file_write_authorized: false,
    ...(detail ? { detail } : {}),
  };
}

function requiresFalse(
  value: Record<string, unknown>,
  keys: string[],
): string[] {
  return keys.filter((key) => value[key] !== false);
}

export function authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1(
  input: {
    admission_packet:
      BuyVoidActivationAdmissionPacketEnvelopeV1;
    admission_packet_sha256: unknown;
    approve?: boolean;
    confirmation?: unknown;
    approval_ttl_seconds?: number;
  },
): BuyVoidActivationOperatorApprovalDecisionV1 {
  const packet = record(input?.admission_packet);
  if (!packet) {
    return held("activation_admission_packet_object_required");
  }

  if (
    normalized(packet.schema)
      !== "void_buy_void_fresh_candidate_auto_claim_activation_admission_packet_result_v1"
    || normalized(packet.marker)
      !== "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_V1"
    || Number(packet.version) !== 1
  ) {
    return held("activation_admission_packet_identity_mismatch");
  }

  const decision = record(packet.decision);
  if (!decision) {
    return held("activation_admission_packet_decision_required");
  }

  if (
    normalized(decision.status) === "waiting"
    && decision.admitted === false
    && decision.mutation_performed === false
  ) {
    return {
      ok: true,
      status: "waiting",
      approved: false,
      mutation_performed: false,
      reason: "activation_admission_packet_waiting",
      approval_file_write_authorized: false,
    };
  }

  const outerFalseFailures = requiresFalse(
    packet,
    [
      "automatic_execution",
      "process_spawn",
      "credential_created",
      "credential_consumed",
      "credential_content_printed",
      "sensitive_values_printed",
      "automatic_retry",
      "systemd_change",
      "service_restart",
      "persistent_config_write",
      "claim_write",
      "request_write",
      "inventory_reservation",
      "inventory_decrement",
      "wallet_access",
      "signing",
      "transaction_broadcast",
      "money_movement",
    ],
  );
  if (outerFalseFailures.length > 0) {
    return held(
      "safe_activation_admission_packet_authority_required",
      { failures: outerFalseFailures },
    );
  }

  if (
    Number(packet.issuer_invocation_count) !== 0
    || Number(packet.runner_invocation_count) !== 0
  ) {
    return held(
      "activation_admission_packet_invocation_counts_must_be_zero",
    );
  }

  const requestId = normalized(decision.request_id);
  const packetSha = lower(input.admission_packet_sha256);
  const planFingerprint = lower(
    decision.plan_fingerprint_sha256,
  );
  const activationFingerprint = lower(
    decision.activation_plan_fingerprint_sha256,
  );
  const alertFingerprint = lower(
    decision.alert_fingerprint_sha256,
  );
  const configSha = lower(
    decision.persistent_config_sha256,
  );
  const ceremonyCommit = lower(
    decision.ceremony_release_commit,
  );
  const issuerCommit = lower(
    decision.issuer_release_commit,
  );
  const runnerCommit = lower(
    decision.runner_release_commit,
  );
  const executorCommit = lower(
    decision.executor_release_commit,
  );

  if (
    decision.ok !== true
    || normalized(decision.status) !== "admitted"
    || decision.admitted !== true
    || decision.mutation_performed !== false
    || packet.operator_approval_required !== true
    || decision.operator_approval_required !== true
    || decision.automatic_execution !== false
    || !SAFE_REQUEST_ID.test(requestId)
    || !SAFE_SHA256.test(packetSha)
    || !SAFE_SHA256.test(planFingerprint)
    || !SAFE_SHA256.test(activationFingerprint)
    || !SAFE_SHA256.test(alertFingerprint)
    || !SAFE_SHA256.test(configSha)
  ) {
    return held("exact_admitted_activation_packet_required");
  }

  for (const [label, value] of [
    ["ceremony", ceremonyCommit],
    ["issuer", issuerCommit],
    ["runner", runnerCommit],
    ["executor", executorCommit],
  ] as const) {
    if (!SAFE_COMMIT.test(value)) {
      return held(`valid_${label}_release_commit_required`);
    }
  }

  if (
    Number(decision.maximum_credential_ttl_seconds) !== 900
    || Number(decision.maximum_issuer_invocations) !== 1
    || Number(decision.maximum_runner_invocations) !== 1
    || normalized(decision.required_issuer_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1
    || normalized(decision.required_execution_confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1
  ) {
    return held("exact_downstream_activation_contract_required");
  }

  const ttlSeconds = Number(
    input.approval_ttl_seconds ?? 900,
  );
  if (
    !Number.isSafeInteger(ttlSeconds)
    || ttlSeconds <= 0
    || ttlSeconds > 900
  ) {
    return held(
      "approval_ttl_seconds_out_of_bounds",
      {
        requested_ttl_seconds:
          input.approval_ttl_seconds,
        maximum_ttl_seconds: 900,
      },
    );
  }

  if (input.approve !== true) {
    return {
      ok: true,
      status: "ready",
      approved: false,
      mutation_performed: false,
      request_id: requestId,
      admission_packet_sha256: packetSha,
      required_operator_confirmation:
        VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
      approval_file_write_authorized: false,
    };
  }

  if (
    normalized(input.confirmation)
      !== VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1
  ) {
    return held(
      "exact_operator_approval_confirmation_required",
      {
        required_confirmation:
          VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
      },
    );
  }

  return {
    ok: true,
    status: "approved",
    approved: true,
    mutation_performed: false,
    request_id: requestId,
    admission_packet_sha256: packetSha,
    plan_fingerprint_sha256: planFingerprint,
    activation_plan_fingerprint_sha256:
      activationFingerprint,
    alert_fingerprint_sha256: alertFingerprint,
    persistent_config_sha256: configSha,
    ceremony_release_commit: ceremonyCommit,
    issuer_release_commit: issuerCommit,
    runner_release_commit: runnerCommit,
    executor_release_commit: executorCommit,
    maximum_approval_ttl_seconds: ttlSeconds,
    maximum_ceremony_invocations: 1,
    maximum_issuer_invocations: 1,
    maximum_runner_invocations: 1,
    required_issuer_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1,
    required_execution_confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1,
    approval_file_write_authorized: true,
    automatic_execution: false,
  };
}
