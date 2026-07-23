export const VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1 =
  "VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1";

export const VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1 =
  "prepareNativeBlockExecutionPrecommitV1";

export const VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1 =
  "VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1";

export const VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1 = {
  runtime_reachable: true,
  disabled_by_default: true,
  exact_confirmation_required_when_enabled: true,
  prepare_dependency_injection_required_when_enabled: true,
  preparation_only: true,
  early_rejection_boundary: true,
  candidate_transaction_order_preserved: true,
  candidate_transaction_mutation: false,
  executor_apply_authority: false,
  account_store_creation_authority: false,
  account_store_initialization_authority: false,
  account_store_injection_authority: false,
  block_store_apply_authority: false,
  canonical_block_commit_authority: false,
  canonical_head_mutation_authority: false,
  mempool_mutation_authority: false,
  filesystem_read: false,
  filesystem_write: false,
  environment_read: false,
  network_call: false,
  rpc_call: false,
  wallet_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  state_mutation: false,
  money_movement: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;

export type VoidNativeBlockExecutionPrecommitPolicyV1 = {
  enabled: boolean;
  confirmation:
    | typeof VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1
    | null;
};

export type VoidNativeBlockExecutionPrecommitPrepareInputV1 = {
  candidate_transaction_count: number;
  candidate_transactions: readonly unknown[];
};

export type VoidNativeBlockExecutionPrecommitPrepareDecisionV1 =
  | {
      ok: true;
      status: "prepared";
      marker:
        typeof VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1;
      version: 1;
      transaction_count: number;
      plan_binding_sha256: string;
      state_mutation_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker:
        typeof VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1;
      version: 1;
      reason: string;
      retry_allowed: false;
      submission_may_have_occurred: false;
      state_mutation_performed: false;
      money_movement_performed: false;
    };

export type VoidNativeBlockExecutionPrecommitPrepareDependencyV1 = (
  input: Readonly<VoidNativeBlockExecutionPrecommitPrepareInputV1>,
) => Promise<VoidNativeBlockExecutionPrecommitPrepareDecisionV1>;

export type VoidNativeBlockExecutionPrecommitRunInputV1 = {
  policy: Readonly<VoidNativeBlockExecutionPrecommitPolicyV1>;
  candidate_transaction_count: number;
  candidate_transactions: readonly unknown[];
  prepare_dependency:
    | VoidNativeBlockExecutionPrecommitPrepareDependencyV1
    | null;
};

export type VoidNativeBlockExecutionPrecommitDisabledV1 = {
  ok: true;
  status: "disabled";
  marker:
    typeof VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1;
  version: 1;
  enabled: false;
  dependency_invoked: false;
  candidate_transactions_read: false;
  state_mutation_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1;
};

export type VoidNativeBlockExecutionPrecommitPreparedV1 = {
  ok: true;
  status: "prepared";
  marker:
    typeof VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1;
  version: 1;
  enabled: true;
  transaction_count: number;
  plan_binding_sha256: string;
  dependency_invoked: true;
  state_mutation_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1;
};

export type VoidNativeBlockExecutionPrecommitDecisionV1 =
  | VoidNativeBlockExecutionPrecommitDisabledV1
  | VoidNativeBlockExecutionPrecommitPreparedV1;

export class VoidNativeBlockExecutionPrecommitHeldErrorV1
  extends Error {
  readonly marker =
    VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1;

  readonly version = 1 as const;

  readonly reason: string;

  readonly retry_allowed = false as const;

  readonly submission_may_have_occurred = false as const;

  readonly state_mutation_performed = false as const;

  readonly money_movement_performed = false as const;

  constructor(reason: string) {
    super(reason);
    this.name = "VoidNativeBlockExecutionPrecommitHeldErrorV1";
    this.reason = reason;
  }
}

function hold(reason: string): never {
  throw new VoidNativeBlockExecutionPrecommitHeldErrorV1(
    reason,
  );
}

function parseCandidateTransactionCount(value: unknown): number {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < 0
  ) {
    hold("candidate_transaction_count_invalid");
  }
  return value;
}

export async function runVoidNativeBlockExecutionPrecommitIntegrationV1(
  input: Readonly<VoidNativeBlockExecutionPrecommitRunInputV1>,
): Promise<VoidNativeBlockExecutionPrecommitDecisionV1> {
  if (!input || typeof input !== "object") {
    hold("precommit_input_invalid");
  }

  const policy = input.policy;
  if (
    !policy
    || typeof policy !== "object"
    || typeof policy.enabled !== "boolean"
  ) {
    hold("precommit_policy_invalid");
  }

  if (!policy.enabled) {
    return {
      ok: true,
      status: "disabled",
      marker:
        VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1,
      version: 1,
      enabled: false,
      dependency_invoked: false,
      candidate_transactions_read: false,
      state_mutation_performed: false,
      money_movement_performed: false,
      authority:
        VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1,
    };
  }

  if (
    policy.confirmation
    !== VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_CONFIRMATION_V1
  ) {
    hold("precommit_confirmation_required");
  }

  const transactionCount = parseCandidateTransactionCount(
    input.candidate_transaction_count,
  );
  const candidateTransactions = input.candidate_transactions;
  if (!Array.isArray(candidateTransactions)) {
    hold("candidate_transactions_invalid");
  }
  if (candidateTransactions.length !== transactionCount) {
    hold("candidate_transaction_count_mismatch");
  }

  const dependency = input.prepare_dependency;
  if (typeof dependency !== "function") {
    hold("prepare_dependency_required");
  }

  let prepared:
    VoidNativeBlockExecutionPrecommitPrepareDecisionV1;
  try {
    prepared = await dependency({
      candidate_transaction_count: transactionCount,
      candidate_transactions: candidateTransactions,
    });
  } catch {
    hold("prepare_dependency_failed");
  }

  if (
    !prepared
    || typeof prepared !== "object"
    || prepared.marker
      !== VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_PREPARE_DECISION_V1
    || prepared.version !== 1
  ) {
    hold("prepare_dependency_decision_invalid");
  }

  if (!prepared.ok || prepared.status !== "prepared") {
    hold(
      prepared.ok === false && typeof prepared.reason === "string"
        ? prepared.reason
        : "prepare_dependency_held",
    );
  }

  if (
    prepared.transaction_count !== transactionCount
    || !SHA256.test(prepared.plan_binding_sha256)
    || prepared.state_mutation_performed !== false
    || prepared.money_movement_performed !== false
  ) {
    hold("prepared_plan_binding_invalid");
  }

  return {
    ok: true,
    status: "prepared",
    marker:
      VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1,
    version: 1,
    enabled: true,
    transaction_count: transactionCount,
    plan_binding_sha256: prepared.plan_binding_sha256,
    dependency_invoked: true,
    state_mutation_performed: false,
    money_movement_performed: false,
    authority:
      VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_AUTHORITY_V1,
  };
}
