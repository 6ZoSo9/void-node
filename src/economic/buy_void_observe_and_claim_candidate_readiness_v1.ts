export const VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1 =
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1";

export type BuyVoidObserveAndClaimCandidateRecordV1 = {
  request_id: string;
  public_status: string | null;
  claim_status: string | null;
  attempt_status: string | null;
  broadcast_status: string | null;
  orchestrator_status: string;
  orchestrator_reason: string | null;
  selected_stage: string | null;
  activation_status: string;
  activation_reason: string | null;
  plan_fingerprint_sha256: string | null;
  required_orchestrator_confirmation: string | null;
  required_delegated_confirmation: string | null;
  required_stage_confirmation: string | null;
  eligible_observe_and_claim: boolean;
  wallet_access_authorized: boolean;
  signing_authorized: boolean;
  transaction_broadcast_authorized: boolean;
  money_movement_authorized: boolean;
};

export type BuyVoidObserveAndClaimCandidateReadinessSummaryV1 = {
  schema:
    "void_buy_void_observe_and_claim_candidate_readiness_v1";
  marker:
    typeof VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1;
  version: 1;
  candidate_stage: "observe_and_claim";
  readiness_status: "none" | "exact_one" | "multiple";
  request_record_count: number;
  eligible_candidate_count: number;
  eligible_request_ids: string[];
  recommended_request_id: string | null;
  recommended_plan_fingerprint_sha256: string | null;
  recommended_orchestrator_confirmation: string | null;
  recommended_delegated_confirmation: string | null;
  recommended_stage_confirmation: string | null;
  records: BuyVoidObserveAndClaimCandidateRecordV1[];
  authority: {
    read_only: true;
    server_derived_snapshot_required: true;
    exact_request_id_only: true;
    runtime_import_mounted: false;
    apply_requested: false;
    filesystem_write_to_network_state: false;
    inventory_reservation: false;
    execution_attempt_reservation: false;
    wallet_access: false;
    signing: false;
    transaction_broadcast: false;
    rpc_mutation: false;
    money_movement: false;
    background_loop: false;
    startup_execution: false;
  };
};

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_SHA256 = /^[0-9a-f]{64}$/;

function normalized(value: unknown): string {
  return String(value || "").trim();
}

function normalizedLower(value: unknown): string {
  return normalized(value).toLowerCase();
}

function nullable(value: unknown): string | null {
  const result = normalized(value);
  return result || null;
}

function bool(value: unknown): boolean {
  return value === true;
}

export function normalizeBuyVoidObserveAndClaimCandidateRecordV1(
  input: Partial<BuyVoidObserveAndClaimCandidateRecordV1>,
): BuyVoidObserveAndClaimCandidateRecordV1 {
  const requestId = normalized(input.request_id);
  const fingerprint = normalizedLower(
    input.plan_fingerprint_sha256,
  );
  const selectedStage = nullable(input.selected_stage);
  const publicStatus = nullable(input.public_status);
  const orchestratorStatus = normalized(
    input.orchestrator_status,
  );
  const activationStatus = normalized(
    input.activation_status,
  );
  const walletAccess = bool(input.wallet_access_authorized);
  const signing = bool(input.signing_authorized);
  const broadcast = bool(
    input.transaction_broadcast_authorized,
  );
  const moneyMovement = bool(
    input.money_movement_authorized,
  );

  const eligible =
    SAFE_REQUEST_ID.test(requestId)
    && publicStatus === "payment_verified"
    && orchestratorStatus === "dry_run"
    && selectedStage === "observe_and_claim"
    && activationStatus === "planned"
    && SAFE_SHA256.test(fingerprint)
    && walletAccess === false
    && signing === false
    && broadcast === false
    && moneyMovement === false
    && input.eligible_observe_and_claim === true;

  return {
    request_id: requestId,
    public_status: publicStatus,
    claim_status: nullable(input.claim_status),
    attempt_status: nullable(input.attempt_status),
    broadcast_status: nullable(input.broadcast_status),
    orchestrator_status: orchestratorStatus,
    orchestrator_reason: nullable(input.orchestrator_reason),
    selected_stage: selectedStage,
    activation_status: activationStatus,
    activation_reason: nullable(input.activation_reason),
    plan_fingerprint_sha256:
      SAFE_SHA256.test(fingerprint) ? fingerprint : null,
    required_orchestrator_confirmation:
      nullable(input.required_orchestrator_confirmation),
    required_delegated_confirmation:
      nullable(input.required_delegated_confirmation),
    required_stage_confirmation:
      nullable(input.required_stage_confirmation),
    eligible_observe_and_claim: eligible,
    wallet_access_authorized: walletAccess,
    signing_authorized: signing,
    transaction_broadcast_authorized: broadcast,
    money_movement_authorized: moneyMovement,
  };
}

export function summarizeBuyVoidObserveAndClaimCandidateReadinessV1(
  recordsInput: Array<
    Partial<BuyVoidObserveAndClaimCandidateRecordV1>
  >,
): BuyVoidObserveAndClaimCandidateReadinessSummaryV1 {
  const records = recordsInput
    .map(normalizeBuyVoidObserveAndClaimCandidateRecordV1)
    .sort((left, right) =>
      left.request_id.localeCompare(right.request_id),
    );

  const eligible = records.filter(
    (record) => record.eligible_observe_and_claim,
  );
  const readinessStatus =
    eligible.length === 0
      ? "none"
      : eligible.length === 1
        ? "exact_one"
        : "multiple";
  const recommended =
    eligible.length === 1 ? eligible[0] : null;

  return {
    schema:
      "void_buy_void_observe_and_claim_candidate_readiness_v1",
    marker:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1,
    version: 1,
    candidate_stage: "observe_and_claim",
    readiness_status: readinessStatus,
    request_record_count: records.length,
    eligible_candidate_count: eligible.length,
    eligible_request_ids:
      eligible.map((record) => record.request_id),
    recommended_request_id:
      recommended?.request_id || null,
    recommended_plan_fingerprint_sha256:
      recommended?.plan_fingerprint_sha256 || null,
    recommended_orchestrator_confirmation:
      recommended?.required_orchestrator_confirmation || null,
    recommended_delegated_confirmation:
      recommended?.required_delegated_confirmation || null,
    recommended_stage_confirmation:
      recommended?.required_stage_confirmation || null,
    records,
    authority: {
      read_only: true,
      server_derived_snapshot_required: true,
      exact_request_id_only: true,
      runtime_import_mounted: false,
      apply_requested: false,
      filesystem_write_to_network_state: false,
      inventory_reservation: false,
      execution_attempt_reservation: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      rpc_mutation: false,
      money_movement: false,
      background_loop: false,
      startup_execution: false,
    },
  };
}
