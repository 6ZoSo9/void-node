import { createHash } from "node:crypto";
import {
  Transaction,
  ZeroAddress,
  getAddress,
} from "ethers";

export const VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1 =
  "VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1";

export const VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1 =
  "applyNativeValueTransferStateTransitionV1";

export const VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_AUTHORITY_V1 = {
  expected_chain_id: 2050,
  required_transaction_type: 2,
  required_gas_limit: "21000",
  signed_transaction_decode: true,
  sender_recovery: true,
  nonce_validation: true,
  balance_validation: true,
  sender_debit: true,
  recipient_credit: true,
  bounded_fee_distribution: true,
  fee_burn_accounting: true,
  atomic_store_apply_once_required: true,
  prestate_fingerprint_required: true,
  poststate_fingerprint_required: true,
  exact_confirmation_required: true,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  private_key_input: false,
  mnemonic_input: false,
  wallet_access: false,
  transaction_signing: false,
  rpc_call: false,
  environment_read: false,
  filesystem_read: false,
  filesystem_write: false,
  runtime_route_mount: false,
  dependency_injection: false,
  automatic_retry: false,
  receipt_wait: false,
  state_mutation_when_store_applies: true,
  money_movement_when_store_applies: true,
} as const;

const EXPECTED_CHAIN_ID = 2050n;
const REQUIRED_TX_TYPE = 2;
const REQUIRED_GAS_LIMIT = 21_000n;
const RAW_SIGNED_TRANSACTION = /^0x[0-9a-fA-F]+$/;
const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._:@/-]{1,200}$/;
const MAX_RAW_TRANSACTION_BYTES_HARD = 131_072;
const ZERO_ADDRESS = ZeroAddress.toLowerCase();

export type VoidNativeValueTransferAccountStateV1 = {
  address: string;
  balance_wei: string | number | bigint;
  nonce: string | number | bigint;
};

export type VoidNativeValueTransferStateSnapshotV1 = {
  state_version: string;
  accounts: readonly VoidNativeValueTransferAccountStateV1[];
};

export type VoidNativeValueTransferFeeCreditV1 = {
  address: string;
  amount_wei: string | number | bigint;
};

export type VoidNativeValueTransferExecutionContextV1 = {
  block_hash: string;
  block_number: string | number | bigint;
  transaction_index: string | number | bigint;
  gas_used: string | number | bigint;
  effective_gas_price_wei: string | number | bigint;
  fee_credits: readonly VoidNativeValueTransferFeeCreditV1[];
  fee_policy_fingerprint_sha256: string;
};

export type VoidNativeValueTransferPolicyV1 = {
  expected_chain_id: string | number | bigint;
  required_transaction_type: string | number | bigint;
  required_gas_limit: string | number | bigint;
  max_raw_transaction_bytes: string | number | bigint;
  max_value_wei: string | number | bigint;
  max_fee_debit_wei: string | number | bigint;
  max_fee_credit_count: string | number | bigint;
  sender_allowlist: readonly string[];
  fee_credit_allowlist: readonly string[];
};

export type VoidNativeValueTransferAccountChangeV1 = {
  address: string;
  balance_before_wei: string;
  balance_after_wei: string;
  nonce_before: string;
  nonce_after: string;
};

export type VoidNativeValueTransferFeeCreditNormalizedV1 = {
  address: string;
  amount_wei: string;
};

export type VoidNativeValueTransferPreparedPlanV1 = {
  schema: "void_native_value_transfer_prepared_plan_v1";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1;
  version: 1;
  chain_id: "2050";
  transaction_type: 2;
  transaction_hash: string;
  sender: string;
  recipient: string;
  value_wei: string;
  transaction_nonce: string;
  gas_limit: "21000";
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  block_hash: string;
  block_number: string;
  transaction_index: string;
  gas_used: "21000";
  effective_gas_price_wei: string;
  fee_debit_wei: string;
  fee_credits: readonly VoidNativeValueTransferFeeCreditNormalizedV1[];
  fee_credit_total_wei: string;
  fee_burned_wei: string;
  fee_policy_fingerprint_sha256: string;
  state_version: string;
  prestate_fingerprint_sha256: string;
  poststate_fingerprint_sha256: string;
  account_changes: readonly VoidNativeValueTransferAccountChangeV1[];
  idempotency_key_sha256: string;
  plan_binding_sha256: string;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  signing_performed: false;
  rpc_call_performed: false;
  state_mutation_performed: false;
  money_movement_performed: false;
};

export type VoidNativeValueTransferPrepareReadyV1 = {
  ok: true;
  status: "prepared";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1;
  version: 1;
  plan: VoidNativeValueTransferPreparedPlanV1;
  authority: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_AUTHORITY_V1;
};

export type VoidNativeValueTransferHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1;
  version: 1;
  reason: string;
  retry_allowed: boolean;
  submission_may_have_occurred: boolean;
  state_mutation_performed: false;
  money_movement_performed: false;
  detail?: Record<string, unknown>;
  authority: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_AUTHORITY_V1;
};

export type VoidNativeValueTransferPrepareDecisionV1 =
  | VoidNativeValueTransferPrepareReadyV1
  | VoidNativeValueTransferHeldV1;

export type VoidNativeValueTransferStoreApplyRequestV1 = {
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1;
  version: 1;
  confirmation: typeof VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1;
  idempotency_key_sha256: string;
  transaction_hash: string;
  state_version: string;
  prestate_fingerprint_sha256: string;
  poststate_fingerprint_sha256: string;
  plan_binding_sha256: string;
  account_changes: readonly VoidNativeValueTransferAccountChangeV1[];
  fee_burned_wei: string;
  raw_signed_transaction_included: false;
};

export type VoidNativeValueTransferStoreApplyResultV1 =
  | {
      applied: true;
      commit_id: string;
      state_version: string;
      transaction_hash: string;
    }
  | {
      applied: false;
      reason?: string;
      existing_transaction_hash?: string;
      submission_may_have_occurred?: boolean;
    };

export type VoidNativeValueTransferStoreV1 = {
  apply_native_value_transfer_once: (
    input: Readonly<VoidNativeValueTransferStoreApplyRequestV1>,
  ) => Promise<VoidNativeValueTransferStoreApplyResultV1>;
};

export type VoidNativeValueTransferApplyReadyV1 = {
  ok: true;
  status: "applied";
  marker: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1;
  version: 1;
  transaction_hash: string;
  idempotency_key_sha256: string;
  commit_id: string;
  state_version: string;
  state_mutation_performed: true;
  money_movement_performed: true;
  automatic_retry_allowed: false;
  authority: typeof VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_AUTHORITY_V1;
};

export type VoidNativeValueTransferApplyDecisionV1 =
  | VoidNativeValueTransferApplyReadyV1
  | VoidNativeValueTransferHeldV1;

type NormalizedAccountV1 = {
  address: string;
  balance_wei: bigint;
  nonce: bigint;
};

type NormalizedPolicyV1 = {
  max_raw_transaction_bytes: number;
  max_value_wei: bigint;
  max_fee_debit_wei: bigint;
  max_fee_credit_count: number;
  sender_allowlist: Set<string>;
  fee_credit_allowlist: Set<string>;
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
): VoidNativeValueTransferHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
    version: 1,
    reason,
    retry_allowed: options.retry_allowed ?? false,
    submission_may_have_occurred:
      options.submission_may_have_occurred ?? false,
    state_mutation_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
    authority: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_AUTHORITY_V1,
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
  max: number,
): number {
  const parsed = parseUint(value, label);
  if (parsed > BigInt(max)) throw new Error(`${label}_too_large`);
  return Number(parsed);
}

function normalizeAddress(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label}_invalid`);
  const normalized = getAddress(value).toLowerCase();
  if (normalized === ZERO_ADDRESS) throw new Error(`${label}_zero`);
  return normalized;
}

function normalizeAddressSet(
  values: readonly string[],
  label: string,
): Set<string> {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${label}_empty`);
  }
  const normalized = new Set<string>();
  for (const value of values) {
    const address = normalizeAddress(value, label);
    if (normalized.has(address)) throw new Error(`${label}_duplicate`);
    normalized.add(address);
  }
  return normalized;
}

function normalizePolicy(
  policy: Readonly<VoidNativeValueTransferPolicyV1>,
): NormalizedPolicyV1 {
  if (parseUint(policy.expected_chain_id, "expected_chain_id") !== EXPECTED_CHAIN_ID) {
    throw new Error("policy_chain_id_mismatch");
  }
  if (
    parseUint(policy.required_transaction_type, "required_transaction_type")
    !== BigInt(REQUIRED_TX_TYPE)
  ) {
    throw new Error("policy_transaction_type_mismatch");
  }
  if (
    parseUint(policy.required_gas_limit, "required_gas_limit")
    !== REQUIRED_GAS_LIMIT
  ) {
    throw new Error("policy_gas_limit_mismatch");
  }
  const maxRaw = parseBoundedNumber(
    policy.max_raw_transaction_bytes,
    "max_raw_transaction_bytes",
    MAX_RAW_TRANSACTION_BYTES_HARD,
  );
  if (maxRaw < 100) throw new Error("max_raw_transaction_bytes_too_small");

  const maxValue = parseUint(policy.max_value_wei, "max_value_wei");
  if (maxValue <= 0n) throw new Error("max_value_wei_zero");

  const maxFee = parseUint(
    policy.max_fee_debit_wei,
    "max_fee_debit_wei",
  );
  const maxFeeCredits = parseBoundedNumber(
    policy.max_fee_credit_count,
    "max_fee_credit_count",
    16,
  );

  return {
    max_raw_transaction_bytes: maxRaw,
    max_value_wei: maxValue,
    max_fee_debit_wei: maxFee,
    max_fee_credit_count: maxFeeCredits,
    sender_allowlist: normalizeAddressSet(
      policy.sender_allowlist,
      "sender_allowlist",
    ),
    fee_credit_allowlist: normalizeAddressSet(
      policy.fee_credit_allowlist,
      "fee_credit_allowlist",
    ),
  };
}

function normalizeSnapshot(
  snapshot: Readonly<VoidNativeValueTransferStateSnapshotV1>,
): {
  state_version: string;
  accounts: Map<string, NormalizedAccountV1>;
} {
  const stateVersion = String(snapshot.state_version || "").trim();
  if (!SAFE_ID.test(stateVersion)) throw new Error("state_version_invalid");
  if (!Array.isArray(snapshot.accounts) || snapshot.accounts.length === 0) {
    throw new Error("state_accounts_empty");
  }

  const accounts = new Map<string, NormalizedAccountV1>();
  for (const item of snapshot.accounts) {
    const address = normalizeAddress(item.address, "account_address");
    if (accounts.has(address)) throw new Error("duplicate_account_state");
    accounts.set(address, {
      address,
      balance_wei: parseUint(item.balance_wei, "account_balance_wei"),
      nonce: parseUint(item.nonce, "account_nonce"),
    });
  }
  return { state_version: stateVersion, accounts };
}

function accountFingerprint(
  stateVersion: string,
  accounts: readonly VoidNativeValueTransferAccountChangeV1[],
  side: "before" | "after",
): string {
  return sha256({
    state_version: stateVersion,
    accounts: accounts
      .map((item) => ({
        address: item.address,
        balance_wei:
          side === "before"
            ? item.balance_before_wei
            : item.balance_after_wei,
        nonce:
          side === "before"
            ? item.nonce_before
            : item.nonce_after,
      }))
      .sort((a, b) => a.address.localeCompare(b.address)),
  });
}

function planBindingMaterial(
  plan: Omit<VoidNativeValueTransferPreparedPlanV1, "plan_binding_sha256">,
): unknown {
  return plan;
}

function validatePlan(
  plan: Readonly<VoidNativeValueTransferPreparedPlanV1>,
): string | null {
  if (
    plan.schema !== "void_native_value_transfer_prepared_plan_v1"
    || plan.marker !== VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1
    || plan.version !== 1
    || plan.chain_id !== "2050"
    || plan.transaction_type !== 2
    || plan.gas_limit !== "21000"
    || plan.gas_used !== "21000"
  ) {
    return "prepared_plan_identity_mismatch";
  }
  if (!TRANSACTION_HASH.test(plan.transaction_hash)) {
    return "prepared_plan_transaction_hash_invalid";
  }
  if (!SHA256.test(plan.prestate_fingerprint_sha256)
    || !SHA256.test(plan.poststate_fingerprint_sha256)
    || !SHA256.test(plan.idempotency_key_sha256)
    || !SHA256.test(plan.plan_binding_sha256)
    || !SHA256.test(plan.fee_policy_fingerprint_sha256)
  ) {
    return "prepared_plan_fingerprint_invalid";
  }
  if (!Array.isArray(plan.account_changes) || plan.account_changes.length === 0) {
    return "prepared_plan_account_changes_empty";
  }
  if (
    accountFingerprint(
      plan.state_version,
      plan.account_changes,
      "before",
    ) !== plan.prestate_fingerprint_sha256
  ) {
    return "prepared_plan_prestate_fingerprint_mismatch";
  }
  if (
    accountFingerprint(
      plan.state_version,
      plan.account_changes,
      "after",
    ) !== plan.poststate_fingerprint_sha256
  ) {
    return "prepared_plan_poststate_fingerprint_mismatch";
  }

  const { plan_binding_sha256: _binding, ...withoutBinding } = plan;
  if (
    sha256(planBindingMaterial(withoutBinding))
    !== plan.plan_binding_sha256
  ) {
    return "prepared_plan_binding_mismatch";
  }
  return null;
}

export function prepareVoidNativeValueTransferStateTransitionV1(
  input: {
    raw_signed_transaction: string;
    policy: Readonly<VoidNativeValueTransferPolicyV1>;
    snapshot: Readonly<VoidNativeValueTransferStateSnapshotV1>;
    execution_context:
      Readonly<VoidNativeValueTransferExecutionContextV1>;
  },
): VoidNativeValueTransferPrepareDecisionV1 {
  try {
    const policy = normalizePolicy(input.policy);
    const snapshot = normalizeSnapshot(input.snapshot);
    const raw = String(input.raw_signed_transaction || "").trim();

    if (
      !RAW_SIGNED_TRANSACTION.test(raw)
      || raw.length % 2 !== 0
      || (raw.length - 2) / 2 > policy.max_raw_transaction_bytes
    ) {
      return held("raw_signed_transaction_invalid");
    }

    let transaction: Transaction;
    try {
      transaction = Transaction.from(raw);
    } catch (error) {
      return held("signed_transaction_decode_failed", {
        detail: {
          error_class:
            error instanceof Error ? error.constructor.name : "UnknownError",
        },
      });
    }

    const transactionHash = String(transaction.hash || "").toLowerCase();
    const sender = transaction.from
      ? normalizeAddress(transaction.from, "transaction_sender")
      : "";
    const recipient = transaction.to
      ? normalizeAddress(transaction.to, "transaction_recipient")
      : "";

    if (!TRANSACTION_HASH.test(transactionHash)) {
      return held("signed_transaction_hash_invalid");
    }
    if (!transaction.signature || !sender) {
      return held("signed_transaction_signature_missing");
    }
    if (!recipient) return held("contract_creation_forbidden");
    if (transaction.type !== REQUIRED_TX_TYPE) {
      return held("transaction_type_mismatch");
    }
    if (transaction.chainId !== EXPECTED_CHAIN_ID) {
      return held("transaction_chain_id_mismatch");
    }
    if (transaction.gasLimit !== REQUIRED_GAS_LIMIT) {
      return held("transaction_gas_limit_mismatch");
    }
    if (transaction.data !== "0x") {
      return held("transaction_data_forbidden");
    }
    if (
      Array.isArray(transaction.accessList)
      && transaction.accessList.length > 0
    ) {
      return held("transaction_access_list_forbidden");
    }
    if (!policy.sender_allowlist.has(sender)) {
      return held("transaction_sender_not_allowed");
    }

    const value = transaction.value;
    if (value <= 0n) return held("transaction_value_zero");
    if (value > policy.max_value_wei) {
      return held("transaction_value_exceeds_policy");
    }

    const maxFeePerGas = transaction.maxFeePerGas;
    const maxPriorityFeePerGas = transaction.maxPriorityFeePerGas;
    if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
      return held("transaction_fee_fields_missing");
    }
    if (maxPriorityFeePerGas > maxFeePerGas) {
      return held("transaction_priority_fee_exceeds_max_fee");
    }

    const blockHash = String(
      input.execution_context.block_hash || "",
    ).toLowerCase();
    if (!TRANSACTION_HASH.test(blockHash)) {
      return held("execution_block_hash_invalid");
    }
    const blockNumber = parseUint(
      input.execution_context.block_number,
      "execution_block_number",
    );
    const transactionIndex = parseUint(
      input.execution_context.transaction_index,
      "execution_transaction_index",
    );
    const gasUsed = parseUint(
      input.execution_context.gas_used,
      "execution_gas_used",
    );
    if (gasUsed !== REQUIRED_GAS_LIMIT) {
      return held("execution_gas_used_mismatch");
    }

    const effectiveGasPrice = parseUint(
      input.execution_context.effective_gas_price_wei,
      "effective_gas_price_wei",
    );
    if (effectiveGasPrice > maxFeePerGas) {
      return held("effective_gas_price_exceeds_transaction_max");
    }

    const feeDebit = gasUsed * effectiveGasPrice;
    if (feeDebit > policy.max_fee_debit_wei) {
      return held("fee_debit_exceeds_policy");
    }

    const feePolicyFingerprint = String(
      input.execution_context.fee_policy_fingerprint_sha256 || "",
    ).toLowerCase();
    if (!SHA256.test(feePolicyFingerprint)) {
      return held("fee_policy_fingerprint_invalid");
    }

    if (!Array.isArray(input.execution_context.fee_credits)) {
      return held("fee_credits_invalid");
    }
    if (
      input.execution_context.fee_credits.length
      > policy.max_fee_credit_count
    ) {
      return held("fee_credit_count_exceeds_policy");
    }

    const feeCredits:
      VoidNativeValueTransferFeeCreditNormalizedV1[] = [];
    let feeCreditTotal = 0n;
    const feeCreditAddresses = new Set<string>();
    for (const item of input.execution_context.fee_credits) {
      const address = normalizeAddress(
        item.address,
        "fee_credit_address",
      );
      if (!policy.fee_credit_allowlist.has(address)) {
        return held("fee_credit_address_not_allowed");
      }
      if (feeCreditAddresses.has(address)) {
        return held("fee_credit_address_duplicate");
      }
      feeCreditAddresses.add(address);
      const amount = parseUint(item.amount_wei, "fee_credit_amount_wei");
      if (amount <= 0n) return held("fee_credit_amount_zero");
      feeCreditTotal += amount;
      feeCredits.push({
        address,
        amount_wei: amount.toString(),
      });
    }
    if (feeCreditTotal > feeDebit) {
      return held("fee_credit_total_exceeds_fee_debit");
    }
    feeCredits.sort((a, b) => a.address.localeCompare(b.address));
    const feeBurned = feeDebit - feeCreditTotal;

    const requiredAddresses = new Set<string>([
      sender,
      recipient,
      ...feeCredits.map((item) => item.address),
    ]);
    if (snapshot.accounts.size !== requiredAddresses.size) {
      return held("state_snapshot_address_set_mismatch");
    }
    for (const address of requiredAddresses) {
      if (!snapshot.accounts.has(address)) {
        return held("state_snapshot_required_account_missing", {
          detail: { missing_address_sha256: sha256(address) },
        });
      }
    }

    const senderState = snapshot.accounts.get(sender);
    if (!senderState) return held("sender_state_missing");
    if (senderState.nonce !== BigInt(transaction.nonce)) {
      return held("transaction_nonce_mismatch");
    }

    const totalDebit = value + feeDebit;
    if (senderState.balance_wei < totalDebit) {
      return held("sender_balance_insufficient");
    }

    const balanceDeltas = new Map<string, bigint>();
    const addDelta = (address: string, delta: bigint): void => {
      balanceDeltas.set(
        address,
        (balanceDeltas.get(address) || 0n) + delta,
      );
    };
    addDelta(sender, -totalDebit);
    addDelta(recipient, value);
    for (const credit of feeCredits) {
      addDelta(credit.address, BigInt(credit.amount_wei));
    }

    const changes: VoidNativeValueTransferAccountChangeV1[] = [];
    for (const address of [...requiredAddresses].sort()) {
      const before = snapshot.accounts.get(address);
      if (!before) return held("state_snapshot_required_account_missing");
      const afterBalance =
        before.balance_wei + (balanceDeltas.get(address) || 0n);
      if (afterBalance < 0n) {
        return held("poststate_balance_negative");
      }
      const afterNonce =
        address === sender ? before.nonce + 1n : before.nonce;
      changes.push({
        address,
        balance_before_wei: before.balance_wei.toString(),
        balance_after_wei: afterBalance.toString(),
        nonce_before: before.nonce.toString(),
        nonce_after: afterNonce.toString(),
      });
    }

    const prestateFingerprint = accountFingerprint(
      snapshot.state_version,
      changes,
      "before",
    );
    const poststateFingerprint = accountFingerprint(
      snapshot.state_version,
      changes,
      "after",
    );
    const idempotencyKey = sha256({
      marker: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
      chain_id: "2050",
      transaction_hash: transactionHash,
    });

    const withoutBinding:
      Omit<VoidNativeValueTransferPreparedPlanV1, "plan_binding_sha256"> = {
        schema: "void_native_value_transfer_prepared_plan_v1",
        marker: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
        version: 1,
        chain_id: "2050",
        transaction_type: 2,
        transaction_hash: transactionHash,
        sender,
        recipient,
        value_wei: value.toString(),
        transaction_nonce: transaction.nonce.toString(),
        gas_limit: "21000",
        max_fee_per_gas_wei: maxFeePerGas.toString(),
        max_priority_fee_per_gas_wei:
          maxPriorityFeePerGas.toString(),
        block_hash: blockHash,
        block_number: blockNumber.toString(),
        transaction_index: transactionIndex.toString(),
        gas_used: "21000",
        effective_gas_price_wei: effectiveGasPrice.toString(),
        fee_debit_wei: feeDebit.toString(),
        fee_credits: feeCredits,
        fee_credit_total_wei: feeCreditTotal.toString(),
        fee_burned_wei: feeBurned.toString(),
        fee_policy_fingerprint_sha256: feePolicyFingerprint,
        state_version: snapshot.state_version,
        prestate_fingerprint_sha256: prestateFingerprint,
        poststate_fingerprint_sha256: poststateFingerprint,
        account_changes: changes,
        idempotency_key_sha256: idempotencyKey,
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_returned: false,
        signing_performed: false,
        rpc_call_performed: false,
        state_mutation_performed: false,
        money_movement_performed: false,
      };

    const plan: VoidNativeValueTransferPreparedPlanV1 = {
      ...withoutBinding,
      plan_binding_sha256: sha256(
        planBindingMaterial(withoutBinding),
      ),
    };

    return {
      ok: true,
      status: "prepared",
      marker: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
      version: 1,
      plan,
      authority: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_AUTHORITY_V1,
    };
  } catch (error) {
    return held("native_value_transfer_prepare_error", {
      detail: {
        error_code:
          error instanceof Error ? error.message : "unknown_error",
      },
    });
  }
}

export async function applyVoidNativeValueTransferStateTransitionV1(
  input: {
    plan: Readonly<VoidNativeValueTransferPreparedPlanV1>;
    confirmation: string;
    store?: VoidNativeValueTransferStoreV1;
  },
): Promise<VoidNativeValueTransferApplyDecisionV1> {
  if (
    input.confirmation
    !== VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1
  ) {
    return held("exact_confirmation_required");
  }
  if (
    !input.store
    || typeof input.store.apply_native_value_transfer_once !== "function"
  ) {
    return held("native_value_transfer_store_not_configured");
  }

  const planFailure = validatePlan(input.plan);
  if (planFailure) return held(planFailure);

  const request: VoidNativeValueTransferStoreApplyRequestV1 = {
    marker: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
    version: 1,
    confirmation: VOID_NATIVE_VALUE_TRANSFER_CONFIRMATION_V1,
    idempotency_key_sha256: input.plan.idempotency_key_sha256,
    transaction_hash: input.plan.transaction_hash,
    state_version: input.plan.state_version,
    prestate_fingerprint_sha256:
      input.plan.prestate_fingerprint_sha256,
    poststate_fingerprint_sha256:
      input.plan.poststate_fingerprint_sha256,
    plan_binding_sha256: input.plan.plan_binding_sha256,
    account_changes: input.plan.account_changes,
    fee_burned_wei: input.plan.fee_burned_wei,
    raw_signed_transaction_included: false,
  };

  let result: VoidNativeValueTransferStoreApplyResultV1;
  try {
    result = await input.store.apply_native_value_transfer_once(
      request,
    );
  } catch (error) {
    return held("native_value_transfer_store_error", {
      retry_allowed: false,
      submission_may_have_occurred: true,
      detail: {
        error_class:
          error instanceof Error ? error.constructor.name : "UnknownError",
      },
    });
  }

  if (!("commit_id" in result)) {
    return held(
      String(result.reason || "native_value_transfer_not_applied"),
      {
        retry_allowed: false,
        submission_may_have_occurred:
          result.submission_may_have_occurred ?? false,
        detail: {
          existing_transaction_hash:
            typeof result.existing_transaction_hash === "string"
              ? result.existing_transaction_hash
              : null,
        },
      },
    );
  }

  const commitId = String(result.commit_id || "").trim();
  const stateVersion = String(result.state_version || "").trim();
  const transactionHash = String(
    result.transaction_hash || "",
  ).toLowerCase();

  if (!SAFE_ID.test(commitId) || !SAFE_ID.test(stateVersion)) {
    return held("native_value_transfer_store_receipt_invalid", {
      submission_may_have_occurred: true,
    });
  }
  if (transactionHash !== input.plan.transaction_hash) {
    return held("native_value_transfer_store_hash_mismatch", {
      submission_may_have_occurred: true,
    });
  }

  return {
    ok: true,
    status: "applied",
    marker: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1,
    version: 1,
    transaction_hash: transactionHash,
    idempotency_key_sha256: input.plan.idempotency_key_sha256,
    commit_id: commitId,
    state_version: stateVersion,
    state_mutation_performed: true,
    money_movement_performed: true,
    automatic_retry_allowed: false,
    authority: VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_AUTHORITY_V1,
  };
}
