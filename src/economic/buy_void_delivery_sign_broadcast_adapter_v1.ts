import crypto from "node:crypto";
import {
  Interface,
  Transaction,
  getAddress,
} from "ethers";
import type {
  BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";

export const VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1 =
  "VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1";

export const VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1 =
  "buyVoidSignAndBroadcast";

export const VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1 = {
  disabled_by_default: true,
  explicit_confirmation_required: true,
  prepared_attempt_required: true,
  exact_signed_hash_required: true,
  durable_submission_guard_dependency_required: true,
  durable_submission_release_required_for_definitive_not_broadcast: true,
  broadcaster_exception_is_unknown: true,
  signer_dependency_injected: true,
  broadcaster_dependency_injected: true,
  private_key_input: false,
  mnemonic_input: false,
  environment_secret_read: false,
  rpc_url_input: false,
  filesystem_read: false,
  filesystem_write: false,
  runtime_route_mount: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  receipt_wait: false,
  erc20_transfer: true,
  fulfillment_unit_decimals: 6,
  token_atom_decimals: 18,
  integer_only_unit_conversion: true,
  rounding: false,
  signing: true,
  transaction_broadcast: true,
  money_movement: true,
} as const;

export const VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1 = {
  fulfillment_unit_decimals: 6,
  token_atom_decimals: 18,
  multiplier: "1000000000000",
} as const;

const ERC20_TOKEN_ATOM_MULTIPLIER_V1 = 1_000_000_000_000n;
const UINT256_MAX_V1 = (1n << 256n) - 1n;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const IDEMPOTENCY_KEY = /^[0-9a-f]{64}$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9._:@/-]{0,200}$/;
const MAX_RAW_TRANSACTION_BYTES = 131_072;

const FORBIDDEN_INPUT_KEYS = new Set([
  "private_key",
  "privatekey",
  "mnemonic",
  "seed",
  "seed_phrase",
  "raw_transaction",
  "raw_signed_transaction",
  "signed_transaction",
  "signedtransaction",
  "rpc_url",
  "rpcurl",
  "broadcast_url",
  "broadcasturl",
  "__proto__",
  "prototype",
  "constructor",
]);

const TRANSFER_INTERFACE = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
]);

export type BuyVoidDeliverySignBroadcastPolicyV1 = {
  enabled: boolean;
  chain_id: string | number;
  void_token_address: string;
  fulfillment_wallet_address: string;
  max_void_amount_units: string | number;
  max_gas_limit: string | number;
  max_fee_per_gas_wei: string | number;
  max_priority_fee_per_gas_wei: string | number;
};

export type BuyVoidDeliveryTransactionPlanV1 = {
  chain_id: string | number;
  nonce: string | number;
  gas_limit: string | number;
  max_fee_per_gas_wei: string | number;
  max_priority_fee_per_gas_wei: string | number;
};

export type BuyVoidDeliveryUnsignedTransactionV1 = {
  type: 2;
  chainId: bigint;
  nonce: number;
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  to: string;
  value: 0n;
  data: string;
};

export type BuyVoidDeliverySubmissionBindingV1 = {
  marker: typeof VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1;
  submission_idempotency_key: string;
  attempt_id: string;
  expected_transaction_hash: string;
  transaction_plan_fingerprint_sha256: string;
};

export type BuyVoidDeliverySubmissionGuardV1 = {
  claim_submission_once: (
    binding: Readonly<BuyVoidDeliverySubmissionBindingV1>,
  ) => Promise<
    | { claimed: true }
    | {
        claimed: false;
        reason?: string;
        existing_transaction_hash?: string;
      }
  >;
  release_submission_claim: (
    binding: Readonly<BuyVoidDeliverySubmissionBindingV1>,
    release_reason: string,
  ) => Promise<
    | { released: true }
    | {
        released: false;
        reason?: string;
      }
  >;
};

export type BuyVoidDeliverySignerV1 = {
  get_address: () => Promise<string>;
  sign_transaction: (
    transaction: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
  ) => Promise<string>;
};

export type BuyVoidDeliveryBroadcastResultV1 = {
  accepted: boolean;
  transaction_hash?: unknown;
  provider_submission_id?: unknown;
  submission_may_have_occurred?: boolean;
};

export type BuyVoidDeliveryBroadcasterV1 = {
  broadcast_signed_transaction: (
    raw_signed_transaction: string,
  ) => Promise<BuyVoidDeliveryBroadcastResultV1>;
};

export type BuyVoidDeliverySignBroadcastDependenciesV1 = {
  submission_guard: BuyVoidDeliverySubmissionGuardV1;
  signer: BuyVoidDeliverySignerV1;
  broadcaster: BuyVoidDeliveryBroadcasterV1;
};

export type BuyVoidDeliverySignBroadcastInputV1 = {
  apply?: boolean;
  confirmation?: unknown;
  submission_idempotency_key?: unknown;
  attempt: BuyVoidExecutionAttemptStateV1;
  policy: BuyVoidDeliverySignBroadcastPolicyV1;
  plan: BuyVoidDeliveryTransactionPlanV1;
  dependencies?: BuyVoidDeliverySignBroadcastDependenciesV1;
};

export type BuyVoidDeliverySignBroadcastReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1;
  version: 1;
  status: "dry_run" | "broadcast_accepted";
  attempt_id: string;
  expected_transaction_hash: string;
  transaction_plan_fingerprint_sha256: string;
  transaction_plan: BuyVoidDeliveryUnsignedTransactionV1;
  submission_guard_claimed: boolean;
  submission_guard_released: boolean;
  signing_performed: boolean;
  broadcast_call_performed: boolean;
  transaction_broadcast_accepted: boolean;
  transaction_hash: string;
  provider_submission_id: string;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  automatic_retry_allowed: false;
};

export type BuyVoidDeliverySignBroadcastHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1;
  version: 1;
  status: "held" | "not_broadcast" | "broadcast_unknown";
  reason: string;
  attempt_id: string | null;
  expected_transaction_hash: string | null;
  transaction_plan_fingerprint_sha256: string | null;
  submission_guard_claimed: boolean;
  submission_guard_released: boolean;
  signing_performed: boolean;
  broadcast_call_performed: boolean;
  reconciliation_required: boolean;
  retry_allowed: boolean;
  provider_submission_id: string;
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  automatic_retry_allowed: false;
  detail?: Record<string, unknown>;
};

export type BuyVoidDeliverySignBroadcastDecisionV1 =
  | BuyVoidDeliverySignBroadcastReadyV1
  | BuyVoidDeliverySignBroadcastHeldV1;

type NormalizedV1 = {
  attempt_id: string;
  expected_transaction_hash: string;
  fulfillment_wallet_address: string;
  delivery_address: string;
  void_token_address: string;
  void_amount_units: bigint;
  token_amount_atoms: bigint;
  transaction_plan: BuyVoidDeliveryUnsignedTransactionV1;
  transaction_plan_fingerprint_sha256: string;
};

function normalizeAddress(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return null;
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeHash(value: unknown): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  return HASH.test(normalized) ? normalized : null;
}

function parseInteger(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value >= 0n ? value : null;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value < 0) return null;
      return BigInt(value);
    }
    const raw = String(value ?? "").trim();
    if (!/^(0|[1-9][0-9]*)$/.test(raw)) return null;
    return BigInt(raw);
  } catch {
    return null;
  }
}

function safeNumber(value: bigint): number | null {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(value);
}

function safeErrorClass(error: unknown): string {
  const name = String((error as Error)?.name || "Error")
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, 80);
  return name || "Error";
}

function safeProviderSubmissionId(value: unknown): string {
  const normalized = String(value || "").trim().slice(0, 200);
  return SAFE_PROVIDER_ID.test(normalized) ? normalized : "";
}

function stableFingerprint(value: Record<string, unknown>): string {
  const encoded = JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
  return crypto.createHash("sha256").update(encoded).digest("hex");
}

function findForbiddenInputKey(
  value: unknown,
  seen = new Set<unknown>(),
): string | null {
  if (!value || typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenInputKey(item, seen);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_INPUT_KEYS.has(key.toLowerCase())) return key;
    if (key !== "dependencies") {
      const found = findForbiddenInputKey(nested, seen);
      if (found) return found;
    }
  }
  return null;
}

function held(
  reason: string,
  options: Partial<BuyVoidDeliverySignBroadcastHeldV1> = {},
): BuyVoidDeliverySignBroadcastHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
    version: 1,
    status: options.status || "held",
    reason,
    attempt_id: options.attempt_id || null,
    expected_transaction_hash: options.expected_transaction_hash || null,
    transaction_plan_fingerprint_sha256:
      options.transaction_plan_fingerprint_sha256 || null,
    submission_guard_claimed: options.submission_guard_claimed === true,
    submission_guard_released: options.submission_guard_released === true,
    signing_performed: options.signing_performed === true,
    broadcast_call_performed: options.broadcast_call_performed === true,
    reconciliation_required: options.reconciliation_required === true,
    retry_allowed: options.retry_allowed === true,
    provider_submission_id: String(options.provider_submission_id || ""),
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function normalizeInput(
  input: BuyVoidDeliverySignBroadcastInputV1,
): NormalizedV1 | BuyVoidDeliverySignBroadcastHeldV1 {
  const forbiddenKey = findForbiddenInputKey(input);
  if (forbiddenKey) {
    return held("forbidden_execution_material", {
      detail: { forbidden_key: forbiddenKey },
    });
  }

  const attempt = input?.attempt;
  if (!attempt || attempt.status !== "prepared" || !attempt.prepared) {
    return held("prepared_execution_attempt_required");
  }
  if (
    attempt.broadcast ||
    attempt.failure ||
    (attempt as any).postbroadcast_failure ||
    attempt.confirmation
  ) {
    return held("prepared_execution_attempt_not_clean", {
      attempt_id: attempt.reservation?.attempt_id || null,
    });
  }

  const prepared = attempt.prepared;
  const reservation = attempt.reservation;
  if (!reservation || reservation.attempt_id !== prepared.attempt_id) {
    return held("execution_attempt_identity_mismatch");
  }
  if (
    prepared.signed_transaction_persisted !== false ||
    prepared.raw_transaction_persisted !== false ||
    prepared.transaction_broadcast_performed_by_this_module !== false
  ) {
    return held("prepared_execution_authority_mismatch", {
      attempt_id: reservation.attempt_id,
    });
  }

  const attemptId = String(reservation.attempt_id || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(attemptId)) {
    return held("invalid_execution_attempt_id");
  }
  const expectedHash = normalizeHash(prepared.void_delivery_tx_hash);
  if (!expectedHash) {
    return held("invalid_expected_delivery_transaction_hash", {
      attempt_id: attemptId,
    });
  }

  if (input?.policy?.enabled !== true) {
    return held("delivery_sign_broadcast_disabled", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }

  const chainId = parseInteger(input.policy.chain_id);
  const preparedChainId = parseInteger(prepared.chain_id);
  const planChainId = parseInteger(input?.plan?.chain_id);
  if (
    chainId === null ||
    chainId <= 0n ||
    preparedChainId !== chainId ||
    planChainId !== chainId
  ) {
    return held("delivery_chain_mismatch", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }
  const chainIdNumber = safeNumber(chainId);
  if (chainIdNumber === null) {
    return held("delivery_chain_id_out_of_range", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }

  const policyWallet = normalizeAddress(
    input.policy.fulfillment_wallet_address,
  );
  const preparedWallet = normalizeAddress(prepared.fulfillment_wallet);
  if (!policyWallet || preparedWallet !== policyWallet) {
    return held("fulfillment_wallet_mismatch", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }

  const tokenAddress = normalizeAddress(input.policy.void_token_address);
  const deliveryAddress = normalizeAddress(prepared.delivery_address);
  if (!tokenAddress || !deliveryAddress || tokenAddress === deliveryAddress) {
    return held("invalid_delivery_address_binding", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }

  const amount = parseInteger(prepared.void_amount_units);
  const maxAmount = parseInteger(input.policy.max_void_amount_units);
  if (
    amount === null ||
    amount <= 0n ||
    maxAmount === null ||
    maxAmount <= 0n ||
    amount > maxAmount
  ) {
    return held("void_delivery_amount_out_of_policy", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }

  const tokenAmountAtoms = amount * ERC20_TOKEN_ATOM_MULTIPLIER_V1;
  if (tokenAmountAtoms <= 0n || tokenAmountAtoms > UINT256_MAX_V1) {
    return held("void_delivery_token_amount_atoms_out_of_range", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }

  const nonceValue = parseInteger(input?.plan?.nonce);
  const nonce = nonceValue === null ? null : safeNumber(nonceValue);
  const gasLimit = parseInteger(input?.plan?.gas_limit);
  const maxGasLimit = parseInteger(input.policy.max_gas_limit);
  const maxFee = parseInteger(input?.plan?.max_fee_per_gas_wei);
  const feeCap = parseInteger(input.policy.max_fee_per_gas_wei);
  const priorityFee = parseInteger(
    input?.plan?.max_priority_fee_per_gas_wei,
  );
  const priorityCap = parseInteger(
    input.policy.max_priority_fee_per_gas_wei,
  );
  if (nonce === null) {
    return held("invalid_delivery_nonce", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }
  if (
    gasLimit === null ||
    gasLimit <= 0n ||
    maxGasLimit === null ||
    maxGasLimit <= 0n ||
    gasLimit > maxGasLimit
  ) {
    return held("delivery_gas_limit_out_of_policy", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }
  if (
    maxFee === null ||
    maxFee <= 0n ||
    feeCap === null ||
    feeCap <= 0n ||
    maxFee > feeCap
  ) {
    return held("delivery_max_fee_out_of_policy", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }
  if (
    priorityFee === null ||
    priorityFee < 0n ||
    priorityCap === null ||
    priorityCap < 0n ||
    priorityFee > priorityCap ||
    priorityFee > maxFee
  ) {
    return held("delivery_priority_fee_out_of_policy", {
      attempt_id: attemptId,
      expected_transaction_hash: expectedHash,
    });
  }

  const data = TRANSFER_INTERFACE.encodeFunctionData("transfer", [
    deliveryAddress,
    tokenAmountAtoms,
  ]);
  const transactionPlan: BuyVoidDeliveryUnsignedTransactionV1 = {
    type: 2,
    chainId,
    nonce,
    gasLimit,
    maxFeePerGas: maxFee,
    maxPriorityFeePerGas: priorityFee,
    to: tokenAddress,
    value: 0n,
    data,
  };
  const fingerprint = stableFingerprint({
    attempt_id: attemptId,
    expected_transaction_hash: expectedHash,
    type: "2",
    chain_id: chainId.toString(),
    nonce: String(nonce),
    gas_limit: gasLimit.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priorityFee.toString(),
    token_address: tokenAddress,
    delivery_address: deliveryAddress,
    void_amount_units: amount.toString(),
    token_amount_atoms: tokenAmountAtoms.toString(),
    unit_scale_multiplier:
      VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.multiplier,
    calldata: data,
  });

  return {
    attempt_id: attemptId,
    expected_transaction_hash: expectedHash,
    fulfillment_wallet_address: policyWallet,
    delivery_address: deliveryAddress,
    void_token_address: tokenAddress,
    void_amount_units: amount,
    token_amount_atoms: tokenAmountAtoms,
    transaction_plan: transactionPlan,
    transaction_plan_fingerprint_sha256: fingerprint,
  };
}

type SignedTransactionValidationFailureV1 = {
  reason: string;
  detail?: Record<string, unknown>;
};

function validateSignedTransaction(
  rawSignedTransaction: string,
  normalized: NormalizedV1,
): SignedTransactionValidationFailureV1 | null {
  if (
    !/^0x[0-9a-fA-F]+$/.test(rawSignedTransaction) ||
    rawSignedTransaction.length % 2 !== 0 ||
    (rawSignedTransaction.length - 2) / 2 > MAX_RAW_TRANSACTION_BYTES
  ) {
    return { reason: "invalid_raw_signed_transaction_from_signer" };
  }

  let parsed: Transaction;
  try {
    parsed = Transaction.from(rawSignedTransaction);
  } catch (error) {
    return {
      reason: "signed_transaction_parse_failed",
      detail: {
        error_class: safeErrorClass(error),
      },
    };
  }

  const parsedHash = normalizeHash(parsed.hash);
  const parsedFrom = normalizeAddress(parsed.from);
  const parsedTo = normalizeAddress(parsed.to);
  const plan = normalized.transaction_plan;
  if (!parsedHash || parsedHash !== normalized.expected_transaction_hash) {
    return {
      reason: "signed_transaction_hash_mismatch",
      detail: { parsed_transaction_hash: parsedHash || "" },
    };
  }
  if (
    parsedFrom !== normalized.fulfillment_wallet_address ||
    parsedTo !== normalized.void_token_address ||
    parsed.type !== plan.type ||
    parsed.chainId !== plan.chainId ||
    parsed.nonce !== plan.nonce ||
    parsed.gasLimit !== plan.gasLimit ||
    parsed.maxFeePerGas !== plan.maxFeePerGas ||
    parsed.maxPriorityFeePerGas !== plan.maxPriorityFeePerGas ||
    parsed.value !== 0n ||
    String(parsed.data || "").toLowerCase() !== plan.data.toLowerCase()
  ) {
    return { reason: "signed_transaction_binding_mismatch" };
  }
  return null;
}

async function releaseClaimForDefinitiveNotBroadcast(
  reason: string,
  normalized: NormalizedV1,
  dependencies: BuyVoidDeliverySignBroadcastDependenciesV1,
  binding: BuyVoidDeliverySubmissionBindingV1,
  options: Partial<BuyVoidDeliverySignBroadcastHeldV1> = {},
): Promise<BuyVoidDeliverySignBroadcastHeldV1> {
  let release:
    | { released: true }
    | { released: false; reason?: string };
  try {
    release = await dependencies.submission_guard.release_submission_claim(
      binding,
      reason,
    );
  } catch (error) {
    return held("submission_guard_release_failed", {
      status: "held",
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: true,
      submission_guard_released: false,
      signing_performed: options.signing_performed === true,
      broadcast_call_performed:
        options.broadcast_call_performed === true,
      reconciliation_required: true,
      retry_allowed: false,
      provider_submission_id: options.provider_submission_id || "",
      detail: {
        original_reason: reason,
        error_class: safeErrorClass(error),
      },
    });
  }

  if (release.released !== true) {
    return held("submission_guard_release_failed", {
      status: "held",
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
      submission_guard_claimed: true,
      submission_guard_released: false,
      signing_performed: options.signing_performed === true,
      broadcast_call_performed:
        options.broadcast_call_performed === true,
      reconciliation_required: true,
      retry_allowed: false,
      provider_submission_id: options.provider_submission_id || "",
      detail: {
        original_reason: reason,
        release_reason: String(release.reason || "release_refused"),
      },
    });
  }

  return held(reason, {
    status: "not_broadcast",
    attempt_id: normalized.attempt_id,
    expected_transaction_hash: normalized.expected_transaction_hash,
    transaction_plan_fingerprint_sha256:
      normalized.transaction_plan_fingerprint_sha256,
    submission_guard_claimed: true,
    submission_guard_released: true,
    signing_performed: options.signing_performed === true,
    broadcast_call_performed:
      options.broadcast_call_performed === true,
    reconciliation_required: false,
    retry_allowed: true,
    provider_submission_id: options.provider_submission_id || "",
    ...(options.detail ? { detail: options.detail } : {}),
  });
}

export async function runBuyVoidDeliverySignBroadcastV1(
  input: BuyVoidDeliverySignBroadcastInputV1,
): Promise<BuyVoidDeliverySignBroadcastDecisionV1> {
  const normalized = normalizeInput(input);
  if ("reason" in normalized) return normalized;

  if (input.apply !== true) {
    return {
      ok: true,
      marker: VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
      version: 1,
      status: "dry_run",
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
      transaction_plan: normalized.transaction_plan,
      submission_guard_claimed: false,
      submission_guard_released: false,
      signing_performed: false,
      broadcast_call_performed: false,
      transaction_broadcast_accepted: false,
      transaction_hash: normalized.expected_transaction_hash,
      provider_submission_id: "",
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      automatic_retry_allowed: false,
    };
  }

  if (
    String(input.confirmation || "") !==
    VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1
  ) {
    return held("explicit_confirmation_required", {
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_CONFIRMATION_V1,
      },
    });
  }

  const idempotencyKey = String(
    input.submission_idempotency_key || "",
  ).trim().toLowerCase();
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return held("invalid_submission_idempotency_key", {
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
    });
  }

  const dependencies = input.dependencies;
  if (
    !dependencies ||
    typeof dependencies.submission_guard?.claim_submission_once !== "function" ||
    typeof dependencies.submission_guard?.release_submission_claim !==
      "function" ||
    typeof dependencies.signer?.get_address !== "function" ||
    typeof dependencies.signer?.sign_transaction !== "function" ||
    typeof dependencies.broadcaster?.broadcast_signed_transaction !== "function"
  ) {
    return held("sign_broadcast_dependencies_required", {
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
    });
  }

  const binding: BuyVoidDeliverySubmissionBindingV1 = {
    marker: VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
    submission_idempotency_key: idempotencyKey,
    attempt_id: normalized.attempt_id,
    expected_transaction_hash: normalized.expected_transaction_hash,
    transaction_plan_fingerprint_sha256:
      normalized.transaction_plan_fingerprint_sha256,
  };

  let claim: Awaited<
    ReturnType<BuyVoidDeliverySubmissionGuardV1["claim_submission_once"]>
  >;
  try {
    claim = await dependencies.submission_guard.claim_submission_once(binding);
  } catch (error) {
    return held("submission_guard_failed", {
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
      detail: {
        error_class: safeErrorClass(error),
      },
    });
  }
  if (claim.claimed !== true) {
    return held("submission_guard_already_claimed", {
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
      detail: {
        reason: String(claim.reason || "already_claimed"),
        existing_transaction_hash: String(
          claim.existing_transaction_hash || "",
        ),
      },
    });
  }

  let signerAddress = "";
  try {
    signerAddress = normalizeAddress(
      await dependencies.signer.get_address(),
    ) || "";
  } catch (error) {
    return releaseClaimForDefinitiveNotBroadcast(
      "signer_address_read_failed",
      normalized,
      dependencies,
      binding,
      {
        detail: {
          error_class: safeErrorClass(error),
        },
      },
    );
  }
  if (signerAddress !== normalized.fulfillment_wallet_address) {
    return releaseClaimForDefinitiveNotBroadcast(
      "signer_address_mismatch",
      normalized,
      dependencies,
      binding,
      {
        detail: { signer_address: signerAddress },
      },
    );
  }

  let rawSignedTransaction = "";
  try {
    try {
      rawSignedTransaction = await dependencies.signer.sign_transaction(
        normalized.transaction_plan,
      );
    } catch (error) {
      return releaseClaimForDefinitiveNotBroadcast(
        "transaction_signing_failed",
        normalized,
        dependencies,
        binding,
        {
          detail: {
            error_class: safeErrorClass(error),
          },
        },
      );
    }

    const signedFailure = validateSignedTransaction(
      rawSignedTransaction,
      normalized,
    );
    if (signedFailure) {
      return releaseClaimForDefinitiveNotBroadcast(
        signedFailure.reason,
        normalized,
        dependencies,
        binding,
        {
          signing_performed: true,
          ...(signedFailure.detail
            ? { detail: signedFailure.detail }
            : {}),
        },
      );
    }

    let broadcast: BuyVoidDeliveryBroadcastResultV1;
    try {
      broadcast = await dependencies.broadcaster.broadcast_signed_transaction(
        rawSignedTransaction,
      );
    } catch (error) {
      return held("broadcast_submission_exception_unknown", {
        status: "broadcast_unknown",
        attempt_id: normalized.attempt_id,
        expected_transaction_hash: normalized.expected_transaction_hash,
        transaction_plan_fingerprint_sha256:
          normalized.transaction_plan_fingerprint_sha256,
        submission_guard_claimed: true,
        submission_guard_released: false,
        signing_performed: true,
        broadcast_call_performed: true,
        reconciliation_required: true,
        retry_allowed: false,
        provider_submission_id: safeProviderSubmissionId(
          (error as any)?.provider_submission_id,
        ),
        detail: {
          error_class: safeErrorClass(error),
        },
      });
    }

    const rawProviderSubmissionId = String(
      broadcast.provider_submission_id || "",
    ).trim();
    const providerSubmissionId = safeProviderSubmissionId(
      rawProviderSubmissionId,
    );
    const maybeSubmitted =
      broadcast.submission_may_have_occurred === true;

    if (rawProviderSubmissionId && !providerSubmissionId) {
      if (broadcast.accepted !== true && !maybeSubmitted) {
        return releaseClaimForDefinitiveNotBroadcast(
          "invalid_provider_submission_id",
          normalized,
          dependencies,
          binding,
          {
            signing_performed: true,
            broadcast_call_performed: true,
          },
        );
      }
      return held("invalid_provider_submission_id", {
        status: "broadcast_unknown",
        attempt_id: normalized.attempt_id,
        expected_transaction_hash: normalized.expected_transaction_hash,
        transaction_plan_fingerprint_sha256:
          normalized.transaction_plan_fingerprint_sha256,
        submission_guard_claimed: true,
        submission_guard_released: false,
        signing_performed: true,
        broadcast_call_performed: true,
        reconciliation_required: true,
        retry_allowed: false,
      });
    }

    const returnedHash = normalizeHash(broadcast.transaction_hash);
    if (broadcast.accepted !== true) {
      if (maybeSubmitted) {
        return held("broadcast_submission_outcome_unknown", {
          status: "broadcast_unknown",
          attempt_id: normalized.attempt_id,
          expected_transaction_hash: normalized.expected_transaction_hash,
          transaction_plan_fingerprint_sha256:
            normalized.transaction_plan_fingerprint_sha256,
          submission_guard_claimed: true,
          submission_guard_released: false,
          signing_performed: true,
          broadcast_call_performed: true,
          reconciliation_required: true,
          retry_allowed: false,
          provider_submission_id: providerSubmissionId,
        });
      }
      return releaseClaimForDefinitiveNotBroadcast(
        "broadcast_definitively_not_submitted",
        normalized,
        dependencies,
        binding,
        {
          signing_performed: true,
          broadcast_call_performed: true,
          provider_submission_id: providerSubmissionId,
        },
      );
    }

    if (returnedHash !== normalized.expected_transaction_hash) {
      return held("broadcast_accepted_hash_mismatch", {
        status: "broadcast_unknown",
        attempt_id: normalized.attempt_id,
        expected_transaction_hash: normalized.expected_transaction_hash,
        transaction_plan_fingerprint_sha256:
          normalized.transaction_plan_fingerprint_sha256,
        submission_guard_claimed: true,
        submission_guard_released: false,
        signing_performed: true,
        broadcast_call_performed: true,
        reconciliation_required: true,
        retry_allowed: false,
        provider_submission_id: providerSubmissionId,
        detail: { returned_transaction_hash: returnedHash || "" },
      });
    }

    return {
      ok: true,
      marker: VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
      version: 1,
      status: "broadcast_accepted",
      attempt_id: normalized.attempt_id,
      expected_transaction_hash: normalized.expected_transaction_hash,
      transaction_plan_fingerprint_sha256:
        normalized.transaction_plan_fingerprint_sha256,
      transaction_plan: normalized.transaction_plan,
      submission_guard_claimed: true,
      submission_guard_released: false,
      signing_performed: true,
      broadcast_call_performed: true,
      transaction_broadcast_accepted: true,
      transaction_hash: normalized.expected_transaction_hash,
      provider_submission_id: providerSubmissionId,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      automatic_retry_allowed: false,
    };
  } finally {
    rawSignedTransaction = "";
  }
}
