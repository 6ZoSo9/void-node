import { createHash } from "node:crypto";
import { Transaction } from "ethers";
import type {
  VoidNativeAccountStateSnapshotV1,
} from "./native_account_state_store_v1.js";
import {
  VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
  prepareVoidNativeValueTransferStateTransitionV1,
  type VoidNativeValueTransferFeeCreditV1,
  type VoidNativeValueTransferPolicyV1,
  type VoidNativeValueTransferPreparedPlanV1,
  type VoidNativeValueTransferAccountChangeV1,
} from "./native_value_transfer_state_transition_v1.js";

export const VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1 =
  "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1";

export const VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1 =
  "applyNativeValueTransferBlockV1";

export const VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_AUTHORITY_V1 = {
  canonical_transaction_order_required: true,
  all_transactions_prepared_before_apply: true,
  projected_nonce_and_balance_chaining: true,
  per_transaction_minimal_snapshot_selection_required: true,
  snapshot_selection_validation_authority: false,
  duplicate_transaction_hash_rejection: true,
  block_atomic_store_apply_once_required: true,
  block_idempotency_required: true,
  parent_snapshot_binding_required: true,
  final_accounts_fingerprint_required: true,
  rejection_propagation_required: true,
  exact_confirmation_required: true,
  per_transaction_store_apply: false,
  partial_block_commit: false,
  automatic_retry: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_store_boundary: false,
  filesystem_read: false,
  filesystem_write: false,
  environment_read: false,
  network_call: false,
  rpc_call: false,
  wallet_access: false,
  transaction_signing: false,
  runtime_route_mount: false,
  state_store_injection: false,
  dependency_injection: false,
  state_mutation_when_block_store_applies: true,
  money_movement_when_block_store_applies: true,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._:@/-]{1,200}$/;
const RAW_SIGNED_TRANSACTION = /^0x[0-9a-fA-F]+$/;
const MAX_RAW_TRANSACTION_BYTES_HARD = 131_072;
const EXPECTED_ACCOUNT_STORE_MARKER =
  "VOID_NATIVE_ACCOUNT_STATE_STORE_V1";

export type VoidNativeValueTransferBlockPolicyV1 = {
  max_transactions_per_block: string | number | bigint;
  max_total_raw_transaction_bytes: string | number | bigint;
  max_total_value_wei: string | number | bigint;
  max_total_fee_debit_wei: string | number | bigint;
  max_total_fee_burned_wei: string | number | bigint;
};

export type VoidNativeValueTransferBlockTransactionV1 = {
  raw_signed_transaction: string;
  transfer_policy: Readonly<VoidNativeValueTransferPolicyV1>;
  effective_gas_price_wei: string | number | bigint;
  fee_credits: readonly VoidNativeValueTransferFeeCreditV1[];
  fee_policy_fingerprint_sha256: string;
};

export type VoidNativeValueTransferBlockAccountChangeV1 = {
  address: string;
  balance_before_wei: string;
  balance_after_wei: string;
  nonce_before: string;
  nonce_after: string;
};

export type VoidNativeValueTransferBlockPreparedPlanV1 = {
  schema: "void_native_value_transfer_block_prepared_plan_v1";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1;
  version: 1;
  block_hash: string;
  block_number: string;
  transaction_count: number;
  parent_state_version: string;
  parent_snapshot_fingerprint_sha256: string;
  final_state_version: string;
  final_accounts_fingerprint_sha256: string;
  ordered_transaction_hashes: readonly string[];
  transaction_plans:
    readonly VoidNativeValueTransferPreparedPlanV1[];
  aggregate_account_changes:
    readonly VoidNativeValueTransferBlockAccountChangeV1[];
  total_value_wei: string;
  total_fee_debit_wei: string;
  total_fee_credit_wei: string;
  total_fee_burned_wei: string;
  block_idempotency_key_sha256: string;
  block_binding_sha256: string;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  per_transaction_store_apply_performed: false;
  block_store_apply_performed: false;
  state_mutation_performed: false;
  money_movement_performed: false;
};

export type VoidNativeValueTransferBlockPrepareReadyV1 = {
  ok: true;
  status: "prepared";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1;
  version: 1;
  plan: VoidNativeValueTransferBlockPreparedPlanV1;
  authority:
    typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_AUTHORITY_V1;
};

export type VoidNativeValueTransferBlockHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1;
  version: 1;
  reason: string;
  retry_allowed: boolean;
  submission_may_have_occurred: boolean;
  state_mutation_performed: false;
  money_movement_performed: false;
  detail?: Record<string, unknown>;
  authority:
    typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_AUTHORITY_V1;
};

export type VoidNativeValueTransferBlockPrepareDecisionV1 =
  | VoidNativeValueTransferBlockPrepareReadyV1
  | VoidNativeValueTransferBlockHeldV1;

export type VoidNativeValueTransferBlockStoreApplyRequestV1 = {
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1;
  version: 1;
  confirmation:
    typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1;
  block_idempotency_key_sha256: string;
  block_hash: string;
  block_number: string;
  transaction_count: number;
  parent_state_version: string;
  parent_snapshot_fingerprint_sha256: string;
  final_state_version: string;
  final_accounts_fingerprint_sha256: string;
  ordered_transaction_hashes: readonly string[];
  transaction_plan_bindings_sha256: readonly string[];
  aggregate_account_changes:
    readonly VoidNativeValueTransferBlockAccountChangeV1[];
  total_fee_burned_wei: string;
  block_binding_sha256: string;
  raw_signed_transactions_included: false;
};

export type VoidNativeValueTransferBlockStoreApplyResultV1 =
  | {
      applied: true;
      commit_id: string;
      block_hash: string;
      block_number: string;
      state_version: string;
      transaction_count: number;
    }
  | {
      applied: false;
      reason?: string;
      existing_block_hash?: string;
      submission_may_have_occurred?: boolean;
    };

export type VoidNativeValueTransferBlockStoreV1 = {
  apply_native_value_transfer_block_once: (
    input:
      Readonly<VoidNativeValueTransferBlockStoreApplyRequestV1>,
  ) => Promise<VoidNativeValueTransferBlockStoreApplyResultV1>;
};

export type VoidNativeValueTransferBlockApplyReadyV1 = {
  ok: true;
  status: "applied";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1;
  version: 1;
  block_hash: string;
  block_number: string;
  transaction_count: number;
  final_state_version: string;
  block_idempotency_key_sha256: string;
  commit_id: string;
  state_mutation_performed: true;
  money_movement_performed: true;
  automatic_retry_allowed: false;
  authority:
    typeof VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_AUTHORITY_V1;
};

export type VoidNativeValueTransferBlockApplyDecisionV1 =
  | VoidNativeValueTransferBlockApplyReadyV1
  | VoidNativeValueTransferBlockHeldV1;

type NormalizedBlockPolicyV1 = {
  max_transactions_per_block: number;
  max_total_raw_transaction_bytes: number;
  max_total_value_wei: bigint;
  max_total_fee_debit_wei: bigint;
  max_total_fee_burned_wei: bigint;
};

type ProjectedAccountV1 = {
  address: string;
  balance_wei: string;
  nonce: string;
};

function stableValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, stableValue(record[key])]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function held(
  reason: string,
  options: {
    retry_allowed?: boolean;
    submission_may_have_occurred?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): VoidNativeValueTransferBlockHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1,
    version: 1,
    reason,
    retry_allowed: options.retry_allowed ?? false,
    submission_may_have_occurred:
      options.submission_may_have_occurred ?? false,
    state_mutation_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
    authority:
      VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_AUTHORITY_V1,
  };
}

function parseUint(
  value: string | number | bigint,
  label: string,
): bigint {
  let parsed: bigint;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${label}_not_safe_integer`);
    }
    parsed = BigInt(value);
  } else if (/^(0|[1-9][0-9]*)$/.test(value)) {
    parsed = BigInt(value);
  } else {
    throw new Error(`${label}_invalid`);
  }
  if (parsed < 0n) throw new Error(`${label}_negative`);
  return parsed;
}

function parseBoundedNumber(
  value: string | number | bigint,
  label: string,
  min: number,
  max: number,
): number {
  const parsed = parseUint(value, label);
  if (parsed < BigInt(min)) throw new Error(`${label}_too_small`);
  if (parsed > BigInt(max)) throw new Error(`${label}_too_large`);
  return Number(parsed);
}

function normalizeBlockPolicy(
  policy: Readonly<VoidNativeValueTransferBlockPolicyV1>,
): NormalizedBlockPolicyV1 {
  return {
    max_transactions_per_block: parseBoundedNumber(
      policy.max_transactions_per_block,
      "max_transactions_per_block",
      1,
      100_000,
    ),
    max_total_raw_transaction_bytes: parseBoundedNumber(
      policy.max_total_raw_transaction_bytes,
      "max_total_raw_transaction_bytes",
      100,
      MAX_RAW_TRANSACTION_BYTES_HARD * 100_000,
    ),
    max_total_value_wei: parseUint(
      policy.max_total_value_wei,
      "max_total_value_wei",
    ),
    max_total_fee_debit_wei: parseUint(
      policy.max_total_fee_debit_wei,
      "max_total_fee_debit_wei",
    ),
    max_total_fee_burned_wei: parseUint(
      policy.max_total_fee_burned_wei,
      "max_total_fee_burned_wei",
    ),
  };
}

function validateSnapshot(
  snapshot: Readonly<VoidNativeAccountStateSnapshotV1>,
): VoidNativeAccountStateSnapshotV1 {
  if (
    snapshot.schema !== "void_native_account_state_snapshot_v1"
    || snapshot.marker !== EXPECTED_ACCOUNT_STORE_MARKER
    || snapshot.version !== 1
    || !SAFE_ID.test(String(snapshot.state_version || ""))
    || !SHA256.test(
      String(snapshot.snapshot_fingerprint_sha256 || ""),
    )
    || !Array.isArray(snapshot.accounts)
    || snapshot.accounts.length === 0
    || !Array.isArray(snapshot.applied_transactions)
  ) {
    throw new Error("account_snapshot_identity_invalid");
  }

  const {
    snapshot_fingerprint_sha256: _fingerprint,
    ...withoutFingerprint
  } = snapshot;
  if (
    sha256(withoutFingerprint)
    !== snapshot.snapshot_fingerprint_sha256
  ) {
    throw new Error("account_snapshot_fingerprint_mismatch");
  }

  const addresses = new Set<string>();
  let previous = "";
  for (const account of snapshot.accounts) {
    const address = String(account.address || "").toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(address)) {
      throw new Error("account_snapshot_address_invalid");
    }
    if (addresses.has(address)) {
      throw new Error("account_snapshot_duplicate_address");
    }
    if (previous && address.localeCompare(previous) <= 0) {
      throw new Error("account_snapshot_accounts_not_sorted");
    }
    parseUint(account.balance_wei, "account_snapshot_balance_wei");
    parseUint(account.nonce, "account_snapshot_nonce");
    addresses.add(address);
    previous = address;
  }
  return snapshot;
}

function projectedAccountsFingerprint(
  stateVersion: string,
  accounts: readonly ProjectedAccountV1[],
): string {
  return sha256({
    state_version: stateVersion,
    accounts: [...accounts].sort(
      (a, b) => a.address.localeCompare(b.address),
    ),
  });
}

function blockPlanBindingMaterial(
  plan:
    Omit<
      VoidNativeValueTransferBlockPreparedPlanV1,
      "block_binding_sha256"
    >,
): unknown {
  return plan;
}

function validateBlockPlan(
  plan: Readonly<VoidNativeValueTransferBlockPreparedPlanV1>,
): string | null {
  if (
    plan.schema
      !== "void_native_value_transfer_block_prepared_plan_v1"
    || plan.marker !== VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1
    || plan.version !== 1
    || !TRANSACTION_HASH.test(plan.block_hash)
    || !/^(0|[1-9][0-9]*)$/.test(plan.block_number)
    || !SAFE_ID.test(plan.parent_state_version)
    || !SAFE_ID.test(plan.final_state_version)
    || !SHA256.test(plan.parent_snapshot_fingerprint_sha256)
    || !SHA256.test(plan.final_accounts_fingerprint_sha256)
    || !SHA256.test(plan.block_idempotency_key_sha256)
    || !SHA256.test(plan.block_binding_sha256)
  ) {
    return "block_plan_identity_invalid";
  }
  if (
    !Array.isArray(plan.transaction_plans)
    || !Array.isArray(plan.ordered_transaction_hashes)
    || plan.transaction_count <= 0
    || plan.transaction_count !== plan.transaction_plans.length
    || plan.transaction_count
      !== plan.ordered_transaction_hashes.length
  ) {
    return "block_plan_transaction_count_mismatch";
  }

  const seen = new Set<string>();
  for (let index = 0; index < plan.transaction_count; index += 1) {
    const transactionPlan = plan.transaction_plans[index];
    const transactionHash = plan.ordered_transaction_hashes[index];
    if (
      transactionPlan.marker
        !== VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1
      || transactionPlan.transaction_hash !== transactionHash
      || transactionPlan.block_hash !== plan.block_hash
      || transactionPlan.block_number !== plan.block_number
      || transactionPlan.transaction_index !== String(index)
      || !SHA256.test(transactionPlan.plan_binding_sha256)
      || seen.has(transactionHash)
    ) {
      return "block_plan_transaction_binding_invalid";
    }
    seen.add(transactionHash);
  }

  if (
    sha256({
      marker: VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1,
      block_hash: plan.block_hash,
      block_number: plan.block_number,
    }) !== plan.block_idempotency_key_sha256
  ) {
    return "block_plan_idempotency_key_mismatch";
  }

  const {
    block_binding_sha256: _binding,
    ...withoutBinding
  } = plan;
  if (
    sha256(blockPlanBindingMaterial(withoutBinding))
    !== plan.block_binding_sha256
  ) {
    return "block_plan_binding_mismatch";
  }
  return null;
}

export function prepareVoidNativeValueTransferBlockExecutionV1(
  input: {
    block_hash: string;
    block_number: string | number | bigint;
    snapshot: Readonly<VoidNativeAccountStateSnapshotV1>;
    block_policy: Readonly<VoidNativeValueTransferBlockPolicyV1>;
    transactions:
      readonly VoidNativeValueTransferBlockTransactionV1[];
  },
): VoidNativeValueTransferBlockPrepareDecisionV1 {
  try {
    const blockHash = String(input.block_hash || "").toLowerCase();
    if (!TRANSACTION_HASH.test(blockHash)) {
      return held("block_hash_invalid");
    }
    const blockNumber = parseUint(
      input.block_number,
      "block_number",
    );
    const snapshot = validateSnapshot(input.snapshot);
    const policy = normalizeBlockPolicy(input.block_policy);

    if (
      !Array.isArray(input.transactions)
      || input.transactions.length === 0
      || input.transactions.length
        > policy.max_transactions_per_block
    ) {
      return held("block_transaction_count_invalid");
    }

    let totalRawBytes = 0;
    const projected = new Map<string, ProjectedAccountV1>(
      snapshot.accounts.map((account) => [
        account.address,
        {
          address: account.address,
          balance_wei: account.balance_wei,
          nonce: account.nonce,
        },
      ]),
    );
    const initial = new Map<string, ProjectedAccountV1>(
      [...projected.entries()].map(([address, account]) => [
        address,
        { ...account },
      ]),
    );

    const transactionPlans:
      VoidNativeValueTransferPreparedPlanV1[] = [];
    const orderedTransactionHashes: string[] = [];
    const seenTransactionHashes = new Set<string>();

    let projectedStateVersion = snapshot.state_version;
    let totalValue = 0n;
    let totalFeeDebit = 0n;
    let totalFeeCredit = 0n;
    let totalFeeBurned = 0n;

    for (
      let transactionIndex = 0;
      transactionIndex < input.transactions.length;
      transactionIndex += 1
    ) {
      const transactionInput = input.transactions[transactionIndex];
      const raw = String(
        transactionInput.raw_signed_transaction || "",
      ).trim();
      if (
        !RAW_SIGNED_TRANSACTION.test(raw)
        || raw.length % 2 !== 0
      ) {
        return held("block_raw_signed_transaction_invalid", {
          detail: { transaction_index: transactionIndex },
        });
      }
      totalRawBytes += (raw.length - 2) / 2;
      if (
        totalRawBytes > policy.max_total_raw_transaction_bytes
      ) {
        return held("block_raw_transaction_bytes_exceed_policy");
      }

      let selectionTransaction: Transaction;
      try {
        selectionTransaction = Transaction.from(raw);
      } catch (_error) {
        return held("block_transaction_prepare_failed", {
          detail: {
            transaction_index: transactionIndex,
            transaction_reason: "signed_transaction_decode_failed",
          },
        });
      }

      const requiredProjectedAddresses = new Set<string>();
      try {
        if (selectionTransaction.from) {
          requiredProjectedAddresses.add(
            selectionTransaction.from.toLowerCase(),
          );
        }
        if (selectionTransaction.to) {
          requiredProjectedAddresses.add(
            selectionTransaction.to.toLowerCase(),
          );
        }
      } catch (_error) {
        return held("block_transaction_prepare_failed", {
          detail: {
            transaction_index: transactionIndex,
            transaction_reason: "signed_transaction_decode_failed",
          },
        });
      }
      for (const feeCredit of transactionInput.fee_credits) {
        const candidate = String(
          feeCredit.address || "",
        ).trim().toLowerCase();
        if (/^0x[0-9a-f]{40}$/.test(candidate)) {
          requiredProjectedAddresses.add(candidate);
        }
      }

      const transactionSnapshotAccounts =
        [...requiredProjectedAddresses]
          .sort()
          .flatMap((address) => {
            const account = projected.get(address);
            return account ? [{ ...account }] : [];
          });

      const prepared =
        prepareVoidNativeValueTransferStateTransitionV1({
          raw_signed_transaction: raw,
          policy: transactionInput.transfer_policy,
          snapshot: {
            state_version: projectedStateVersion,
            accounts: transactionSnapshotAccounts,
          },
          execution_context: {
            block_hash: blockHash,
            block_number: blockNumber,
            transaction_index: transactionIndex,
            gas_used: 21_000,
            effective_gas_price_wei:
              transactionInput.effective_gas_price_wei,
            fee_credits: transactionInput.fee_credits,
            fee_policy_fingerprint_sha256:
              transactionInput.fee_policy_fingerprint_sha256,
          },
        });

      if ("reason" in prepared) {
        return held("block_transaction_prepare_failed", {
          detail: {
            transaction_index: transactionIndex,
            transaction_reason: prepared.reason,
          },
        });
      }

      const plan = prepared.plan;
      if (
        plan.block_hash !== blockHash
        || plan.block_number !== blockNumber.toString()
        || plan.transaction_index !== String(transactionIndex)
      ) {
        return held("block_transaction_execution_context_mismatch", {
          detail: { transaction_index: transactionIndex },
        });
      }
      if (seenTransactionHashes.has(plan.transaction_hash)) {
        return held("block_duplicate_transaction_hash", {
          detail: { transaction_index: transactionIndex },
        });
      }
      seenTransactionHashes.add(plan.transaction_hash);

      for (const change of plan.account_changes) {
        const current = projected.get(change.address);
        if (
          !current
          || current.balance_wei !== change.balance_before_wei
          || current.nonce !== change.nonce_before
        ) {
          return held("block_projected_prestate_mismatch", {
            detail: {
              transaction_index: transactionIndex,
              address_sha256: sha256(change.address),
            },
          });
        }
      }
      for (const change of plan.account_changes) {
        projected.set(change.address, {
          address: change.address,
          balance_wei: change.balance_after_wei,
          nonce: change.nonce_after,
        });
      }

      totalValue += BigInt(plan.value_wei);
      totalFeeDebit += BigInt(plan.fee_debit_wei);
      totalFeeCredit += BigInt(plan.fee_credit_total_wei);
      totalFeeBurned += BigInt(plan.fee_burned_wei);

      if (totalValue > policy.max_total_value_wei) {
        return held("block_total_value_exceeds_policy");
      }
      if (totalFeeDebit > policy.max_total_fee_debit_wei) {
        return held("block_total_fee_debit_exceeds_policy");
      }
      if (
        totalFeeBurned > policy.max_total_fee_burned_wei
      ) {
        return held("block_total_fee_burned_exceeds_policy");
      }

      transactionPlans.push(plan);
      orderedTransactionHashes.push(plan.transaction_hash);
      projectedStateVersion = `bsv1-${sha256({
        previous_state_version: projectedStateVersion,
        transaction_index: transactionIndex,
        transaction_hash: plan.transaction_hash,
        poststate_fingerprint_sha256:
          plan.poststate_fingerprint_sha256,
      })}`;
    }

    const aggregateChanges:
      VoidNativeValueTransferBlockAccountChangeV1[] = [];
    for (const address of [...projected.keys()].sort()) {
      const before = initial.get(address);
      const after = projected.get(address);
      if (!before || !after) {
        return held("block_projected_account_missing");
      }
      if (
        before.balance_wei !== after.balance_wei
        || before.nonce !== after.nonce
      ) {
        aggregateChanges.push({
          address,
          balance_before_wei: before.balance_wei,
          balance_after_wei: after.balance_wei,
          nonce_before: before.nonce,
          nonce_after: after.nonce,
        });
      }
    }
    if (aggregateChanges.length === 0) {
      return held("block_aggregate_changes_empty");
    }

    const finalAccounts = [...projected.values()].sort(
      (a, b) => a.address.localeCompare(b.address),
    );
    const finalAccountsFingerprint =
      projectedAccountsFingerprint(
        projectedStateVersion,
        finalAccounts,
      );
    const blockIdempotencyKey = sha256({
      marker: VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1,
      block_hash: blockHash,
      block_number: blockNumber.toString(),
    });

    const withoutBinding:
      Omit<
        VoidNativeValueTransferBlockPreparedPlanV1,
        "block_binding_sha256"
      > = {
        schema:
          "void_native_value_transfer_block_prepared_plan_v1",
        marker: VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1,
        version: 1,
        block_hash: blockHash,
        block_number: blockNumber.toString(),
        transaction_count: transactionPlans.length,
        parent_state_version: snapshot.state_version,
        parent_snapshot_fingerprint_sha256:
          snapshot.snapshot_fingerprint_sha256,
        final_state_version: projectedStateVersion,
        final_accounts_fingerprint_sha256:
          finalAccountsFingerprint,
        ordered_transaction_hashes: orderedTransactionHashes,
        transaction_plans: transactionPlans,
        aggregate_account_changes: aggregateChanges,
        total_value_wei: totalValue.toString(),
        total_fee_debit_wei: totalFeeDebit.toString(),
        total_fee_credit_wei: totalFeeCredit.toString(),
        total_fee_burned_wei: totalFeeBurned.toString(),
        block_idempotency_key_sha256: blockIdempotencyKey,
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_returned: false,
        per_transaction_store_apply_performed: false,
        block_store_apply_performed: false,
        state_mutation_performed: false,
        money_movement_performed: false,
      };

    const plan:
      VoidNativeValueTransferBlockPreparedPlanV1 = {
        ...withoutBinding,
        block_binding_sha256: sha256(
          blockPlanBindingMaterial(withoutBinding),
        ),
      };

    return {
      ok: true,
      status: "prepared",
      marker: VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1,
      version: 1,
      plan,
      authority:
        VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_AUTHORITY_V1,
    };
  } catch (error) {
    return held("native_value_transfer_block_prepare_error", {
      detail: {
        error_code:
          error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}

export async function applyVoidNativeValueTransferBlockExecutionV1(
  input: {
    plan:
      Readonly<VoidNativeValueTransferBlockPreparedPlanV1>;
    confirmation: string;
    store?: VoidNativeValueTransferBlockStoreV1;
  },
): Promise<VoidNativeValueTransferBlockApplyDecisionV1> {
  if (
    input.confirmation
    !== VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1
  ) {
    return held("exact_block_confirmation_required");
  }
  if (
    !input.store
    || typeof input.store.apply_native_value_transfer_block_once
      !== "function"
  ) {
    return held("native_value_transfer_block_store_not_configured");
  }

  const planFailure = validateBlockPlan(input.plan);
  if (planFailure) return held(planFailure);

  const request: VoidNativeValueTransferBlockStoreApplyRequestV1 = {
    marker: VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1,
    version: 1,
    confirmation:
      VOID_NATIVE_VALUE_TRANSFER_BLOCK_CONFIRMATION_V1,
    block_idempotency_key_sha256:
      input.plan.block_idempotency_key_sha256,
    block_hash: input.plan.block_hash,
    block_number: input.plan.block_number,
    transaction_count: input.plan.transaction_count,
    parent_state_version: input.plan.parent_state_version,
    parent_snapshot_fingerprint_sha256:
      input.plan.parent_snapshot_fingerprint_sha256,
    final_state_version: input.plan.final_state_version,
    final_accounts_fingerprint_sha256:
      input.plan.final_accounts_fingerprint_sha256,
    ordered_transaction_hashes:
      input.plan.ordered_transaction_hashes,
    transaction_plan_bindings_sha256:
      input.plan.transaction_plans.map(
        (plan) => plan.plan_binding_sha256,
      ),
    aggregate_account_changes:
      input.plan.aggregate_account_changes,
    total_fee_burned_wei:
      input.plan.total_fee_burned_wei,
    block_binding_sha256:
      input.plan.block_binding_sha256,
    raw_signed_transactions_included: false,
  };

  let result: VoidNativeValueTransferBlockStoreApplyResultV1;
  try {
    result =
      await input.store.apply_native_value_transfer_block_once(
        request,
      );
  } catch (error) {
    return held("native_value_transfer_block_store_error", {
      retry_allowed: false,
      submission_may_have_occurred: true,
      detail: {
        error_class:
          error instanceof Error
            ? error.constructor.name
            : "UnknownError",
      },
    });
  }

  if (!("commit_id" in result)) {
    return held(
      String(
        result.reason
        || "native_value_transfer_block_not_applied",
      ),
      {
        retry_allowed: false,
        submission_may_have_occurred:
          result.submission_may_have_occurred ?? false,
        detail: {
          existing_block_hash:
            typeof result.existing_block_hash === "string"
              ? result.existing_block_hash
              : null,
        },
      },
    );
  }

  const commitId = String(result.commit_id || "").trim();
  const stateVersion = String(result.state_version || "").trim();
  const blockHash = String(result.block_hash || "").toLowerCase();
  const blockNumber = String(result.block_number || "");
  if (
    !SAFE_ID.test(commitId)
    || stateVersion !== input.plan.final_state_version
    || blockHash !== input.plan.block_hash
    || blockNumber !== input.plan.block_number
    || result.transaction_count !== input.plan.transaction_count
  ) {
    return held("native_value_transfer_block_store_receipt_invalid", {
      submission_may_have_occurred: true,
    });
  }

  return {
    ok: true,
    status: "applied",
    marker: VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1,
    version: 1,
    block_hash: blockHash,
    block_number: blockNumber,
    transaction_count: result.transaction_count,
    final_state_version: stateVersion,
    block_idempotency_key_sha256:
      input.plan.block_idempotency_key_sha256,
    commit_id: commitId,
    state_mutation_performed: true,
    money_movement_performed: true,
    automatic_retry_allowed: false,
    authority:
      VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_AUTHORITY_V1,
  };
}
