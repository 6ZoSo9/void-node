import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import path from "node:path";
import { Transaction } from "ethers";
import {
  runBuyVoidErc20TransactionPreparationPlannerV1,
  validateBuyVoidErc20TransactionPreparationPlannerPolicyV1,
  type BuyVoidErc20TransactionPreparationPlannerPolicyV1,
  type BuyVoidErc20TransactionPreparationPlannerTransportV1,
  type BuyVoidErc20TransactionPreparationPlanReadyV1,
} from "./buy_void_erc20_transaction_preparation_planner_v1.js";
import {
  runBuyVoidErc20DeliveryReceiptReconcilerV1,
  type BuyVoidErc20DeliveryReceiptReconcilerPolicyV1,
  type BuyVoidErc20DeliveryReceiptRpcTransportV1,
} from "./buy_void_erc20_delivery_receipt_reconciler_v1.js";
import {
  runBuyVoidDeliverySignBroadcastV1,
  VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1,
  type BuyVoidDeliveryBroadcasterV1,
  type BuyVoidDeliverySignerV1,
  type BuyVoidDeliveryTransactionPlanV1,
  type BuyVoidDeliveryUnsignedTransactionV1,
  type BuyVoidDeliverySignBroadcastDecisionV1,
  type BuyVoidDeliverySignBroadcastPolicyV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import {
  createBuyVoidDeliverySubmissionGuardV1,
} from "./buy_void_delivery_submission_guard_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  type BuyVoidInventoryReservationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
  type BuyVoidPipelineCoordinatorDecisionV1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
  type BuyVoidCrashConsistentSagaServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";

export const VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1 =
  "VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1";

export const VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1 =
  "buyVoidAdvanceErc20ExecutionCompositionV1";

export const VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_AUTHORITY_V1 = {
  source_only_contract: true,
  one_business_stage_per_invocation: true,
  server_derived_transaction_plan: true,
  caller_transaction_plan: false,
  coherent_pending_planner_reused: true,
  exact_pending_nonce_reservation: true,
  wallet_scoped_nonce_lock: true,
  overlapping_unbroadcast_nonce_fails_closed: true,
  live_pre_sign_revalidation: true,
  signed_hash_custody_persisted_before_broadcast: true,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  crash_recovery_from_persisted_preparation: true,
  write_ahead_saga_broadcast_intent: true,
  no_rebroadcast_after_ambiguous_submission: true,
  erc20_receipt_reconciler_reused: true,
  canonical_record_confirmed_reused: true,
  existing_saga_terminal_closeout_reused: true,
  automatic_retry: false,
  background_loop: false,
  runtime_route_mount: false,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  signing_when_prepare_applied: true,
  transaction_broadcast_when_broadcast_stage_applied: true,
  rpc_call_when_planning_or_reconciling: true,
  money_movement_when_broadcast_submission_occurs: true,
} as const;

export const VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_POLICY_ENVS_V1 = {
  rpc_url: "VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL",
  gas_limit_multiplier_bps:
    "VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS",
  fee_multiplier_bps:
    "VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS",
  min_confirmations:
    "VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS",
  request_timeout_ms:
    "VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS",
  max_response_bytes:
    "VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES",
} as const;

const DELIVERY_POLICY_ENVS = {
  chain_id: "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
  void_token_address: "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  fulfillment_wallet_address: "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
  max_void_amount_units: "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
  max_gas_limit: "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
  max_fee_per_gas_wei: "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
  max_priority_fee_per_gas_wei:
    "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
} as const;

const SOURCE_FLOOR_MAIN = "ddb50ddfd74f048bb98a17ef2cdf554963dc4a5c";
const COMPOSITION_ROOT = "buy-void-erc20-execution-composition-v1";
const NONCE_SCHEMA = "void_buy_void_erc20_nonce_reservation_v1";
const NONCE_INDEX_SCHEMA = "void_buy_void_erc20_nonce_attempt_index_v1";
const PREPARATION_SCHEMA = "void_buy_void_erc20_preparation_custody_v1";
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const MAX_JSON_BYTES = 512 * 1024;
const LEASE_TTL_MS = 30_000;
const MAX_SAGA_CONFIRMATIONS = 1_000_000n;
const UINT256_MAX = (1n << 256n) - 1n;

export type BuyVoidErc20ExecutionCompositionPolicyV1 = {
  planner_policy: BuyVoidErc20TransactionPreparationPlannerPolicyV1;
  receipt_policy: BuyVoidErc20DeliveryReceiptReconcilerPolicyV1;
  sign_broadcast_policy: BuyVoidDeliverySignBroadcastPolicyV1;
  saga_policy: BuyVoidCrashConsistentSagaServerPolicyV1;
  policy_fingerprint_sha256: string;
};

export type BuyVoidErc20ExecutionCompositionPolicyDecisionV1 =
  | {
      ok: true;
      status: "configured";
      policy: BuyVoidErc20ExecutionCompositionPolicyV1;
      missing_envs: [];
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      missing_envs: string[];
      detail?: Record<string, unknown>;
    };

export type BuyVoidErc20ExecutionCompositionDependenciesV1 = {
  signer?: BuyVoidDeliverySignerV1;
  broadcaster?: BuyVoidDeliveryBroadcasterV1;
  planner_transport?: BuyVoidErc20TransactionPreparationPlannerTransportV1;
  receipt_transport?: BuyVoidErc20DeliveryReceiptRpcTransportV1;
  load_saga_module?: () => Promise<any>;
  now_ms?: () => number;
  fault_inject?: (stage:
    | "after_preparation_custody_before_attempt_projection"
    | "after_external_outcome_before_projection"
  ) => void | Promise<void>;
};

export type BuyVoidErc20NonceReservationV1 = {
  schema: typeof NONCE_SCHEMA;
  marker: typeof VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1;
  version: 1;
  reserved_at_ms: number;
  attempt_id: string;
  wallet_address: string;
  wallet_key_sha256: string;
  nonce: number;
  reservation_status: "reserved";
  automatic_release: false;
};

export type BuyVoidErc20PreparationCustodyV1 = {
  schema: typeof PREPARATION_SCHEMA;
  marker: typeof VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1;
  version: 1;
  recorded_at_ms: number;
  attempt_id: string;
  chain_id: "2050";
  fulfillment_wallet_address: string;
  wallet_key_sha256: string;
  void_token_address: string;
  delivery_address: string;
  void_amount_units: string;
  token_amount_atoms: string;
  transfer_calldata: string;
  transfer_calldata_sha256: string;
  nonce: number;
  gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  transaction_plan: BuyVoidDeliveryTransactionPlanV1;
  preparation_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  unsigned_transaction_fingerprint_sha256: string;
  signed_transaction_hash: string;
  signed_hash_custody_status: "prepared";
  raw_signed_transaction_persisted: false;
  raw_signed_transaction_returned: false;
  automatic_retry_allowed: false;
};

export type BuyVoidErc20ExecutionCompositionDecisionV1 =
  | {
      ok: true;
      status:
        | "dry_run"
        | "prepared"
        | "broadcast_accepted"
        | "reconciled_confirmed"
        | "ready_for_terminal_closeout"
        | "duplicate";
      stage: "prepare" | "broadcast" | "reconcile" | "terminal";
      applied: boolean;
      attempt_id: string;
      saga_id: string | null;
      next_stage: "prepare" | "broadcast" | "reconcile" | "terminal_closeout" | null;
      required_confirmation:
        typeof VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1;
      preparation?: BuyVoidErc20PreparationCustodyV1;
      receipt_evidence?: Record<string, unknown>;
      mutation_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      money_movement_performed: boolean;
      reason?: never;
    }
  | {
      ok: false;
      status: "held";
      stage: "input" | "policy" | "prepare" | "broadcast" | "reconcile" | "saga";
      applied: boolean;
      reason: string;
      attempt_id: string | null;
      saga_id: string | null;
      mutation_performed: boolean;
      signing_performed: boolean;
      transaction_broadcast_performed: boolean;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      money_movement_performed: boolean;
      detail?: Record<string, unknown>;
    };

function held(
  stage: Extract<BuyVoidErc20ExecutionCompositionDecisionV1, { ok: false }>["stage"],
  applied: boolean,
  reason: string,
  options: {
    attempt_id?: string | null;
    saga_id?: string | null;
    mutation_performed?: boolean;
    signing_performed?: boolean;
    transaction_broadcast_performed?: boolean;
    reconciliation_required?: boolean;
    money_movement_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<BuyVoidErc20ExecutionCompositionDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    stage,
    applied,
    reason,
    attempt_id: options.attempt_id ?? null,
    saga_id: options.saga_id ?? null,
    mutation_performed: options.mutation_performed === true,
    signing_performed: options.signing_performed === true,
    transaction_broadcast_performed:
      options.transaction_broadcast_performed === true,
    reconciliation_required: options.reconciliation_required === true,
    automatic_retry_allowed: false,
    money_movement_performed: options.money_movement_performed === true,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function fingerprint(value: unknown): string {
  return sha256(canonical(value));
}

function normalizeAddress(value: unknown): string {
  const address = text(value).toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function normalizeHash(value: unknown): string {
  const hash = text(value).toLowerCase();
  return HASH.test(hash) ? hash : "";
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function directObject(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_object_required`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label}_prototype_invalid`);
  }
  return value as Record<string, any>;
}

function positiveDecimal(value: unknown): string {
  const raw = text(value);
  if (!DECIMAL.test(raw)) return "";
  try {
    return BigInt(raw) > 0n ? raw : "";
  } catch {
    return "";
  }
}

function optionalPositiveInteger(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  return positiveDecimal(raw) ? raw : "__invalid__";
}

function policyHeld(
  reason: string,
  missing: string[] = [],
  detail?: Record<string, unknown>,
): BuyVoidErc20ExecutionCompositionPolicyDecisionV1 {
  return {
    ok: false,
    status: "held",
    reason,
    missing_envs: [...missing].sort(),
    ...(detail ? { detail } : {}),
  };
}

export function readBuyVoidErc20ExecutionCompositionPolicyV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidErc20ExecutionCompositionPolicyDecisionV1 {
  const required = {
    ...DELIVERY_POLICY_ENVS,
    rpc_url: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_POLICY_ENVS_V1.rpc_url,
    gas_limit_multiplier_bps:
      VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_POLICY_ENVS_V1
        .gas_limit_multiplier_bps,
    fee_multiplier_bps:
      VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_POLICY_ENVS_V1
        .fee_multiplier_bps,
    min_confirmations:
      VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_POLICY_ENVS_V1.min_confirmations,
  } as const;
  const values = Object.fromEntries(
    Object.entries(required).map(([key, name]) => [key, text(env[name])]),
  ) as Record<keyof typeof required, string>;
  const missing = Object.entries(required)
    .filter(([key]) => !values[key as keyof typeof required])
    .map(([, name]) => name);
  if (missing.length) return policyHeld("erc20_execution_policy_not_configured", missing);
  if (values.chain_id !== "2050") return policyHeld("erc20_execution_chain_id_mismatch");

  const saga = readBuyVoidCanonicalPresaleServerPolicyV1(env);
  if (saga.ok === false) {
    return policyHeld(
      `erc20_execution_saga_policy_held:${saga.reason}`,
      saga.missing_envs,
      saga.detail,
    );
  }
  const wallet = normalizeAddress(values.fulfillment_wallet_address);
  const token = normalizeAddress(values.void_token_address);
  const sagaWallets = saga.policy.execution_policy.fulfillment_wallet_allowlist
    .map((value) => normalizeAddress(value));
  if (!wallet || !token || token === wallet) {
    return policyHeld("erc20_execution_address_policy_invalid");
  }
  if (sagaWallets.length !== 1 || sagaWallets[0] !== wallet) {
    return policyHeld("erc20_execution_saga_wallet_policy_mismatch");
  }

  const timeout = optionalPositiveInteger(
    env[VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_POLICY_ENVS_V1.request_timeout_ms],
  );
  const maxResponse = optionalPositiveInteger(
    env[VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_POLICY_ENVS_V1.max_response_bytes],
  );
  if (timeout === "__invalid__" || maxResponse === "__invalid__") {
    return policyHeld("erc20_execution_transport_bounds_invalid");
  }

  const plannerPolicy: BuyVoidErc20TransactionPreparationPlannerPolicyV1 = {
    enabled: true,
    chain_id: "2050",
    rpc_url: values.rpc_url,
    fulfillment_wallet_address: wallet,
    void_token_address: token,
    max_void_amount_units: values.max_void_amount_units,
    gas_limit_multiplier_bps: values.gas_limit_multiplier_bps,
    max_gas_limit: values.max_gas_limit,
    fee_multiplier_bps: values.fee_multiplier_bps,
    max_fee_per_gas_wei: values.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei: values.max_priority_fee_per_gas_wei,
    ...(timeout ? { request_timeout_ms: timeout } : {}),
    ...(maxResponse ? { max_response_bytes: maxResponse } : {}),
  };
  const plannerValidation =
    validateBuyVoidErc20TransactionPreparationPlannerPolicyV1(
      plannerPolicy,
    );
  if (plannerValidation.ok === false) {
    return policyHeld(
      `erc20_execution_planner_policy_held:${plannerValidation.reason}`,
      [],
      {
        planner_validation_reason: plannerValidation.reason,
      },
    );
  }

  const deliveryMinConfirmations = positiveDecimal(
    values.min_confirmations,
  );
  if (
    !deliveryMinConfirmations ||
    BigInt(deliveryMinConfirmations) > 1_000n
  ) {
    return policyHeld(
      "erc20_execution_receipt_min_confirmations_invalid",
      [],
      {
        min_confirmations: values.min_confirmations,
        maximum: "1000",
      },
    );
  }

  const maxDeliveryUnits = BigInt(values.max_void_amount_units);
  const sagaPoolCapacity = BigInt(
    saga.policy.inventory_policy.pool_capacity_void_units,
  );
  const sagaMaxReservation = BigInt(
    saga.policy.inventory_policy.max_reservation_void_units,
  );
  const tokenAtomMultiplier = BigInt(
    VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.multiplier,
  );
  const publicDeliveryEnabled =
    String(
      env.VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED || "",
    ) === "1";
  if (
    publicDeliveryEnabled &&
    maxDeliveryUnits !== sagaPoolCapacity
  ) {
    return policyHeld(
      "erc20_execution_public_delivery_amount_cap_must_equal_presale_capacity",
      [],
      {
        max_amount_unit_domain: "fulfillment_units_6_decimal",
        configured_delivery_max_void_units:
          maxDeliveryUnits.toString(),
        canonical_presale_capacity_void_units:
          sagaPoolCapacity.toString(),
        public_purchase_throttle_allowed: false,
        disabled_canary_delivery_cap_separate: true,
      },
    );
  }
  if (
    maxDeliveryUnits > sagaPoolCapacity ||
    maxDeliveryUnits > sagaMaxReservation
  ) {
    return policyHeld(
      "erc20_execution_max_amount_exceeds_saga_fulfillment_unit_cap",
      [],
      {
        max_amount_unit_domain: "fulfillment_units_6_decimal",
        fulfillment_unit_decimals:
          VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1
            .fulfillment_unit_decimals,
        token_atom_decimals:
          VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1
            .token_atom_decimals,
        token_atom_multiplier:
          VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.multiplier,
        max_void_amount_units: maxDeliveryUnits.toString(),
        saga_max_reservation_void_units:
          sagaMaxReservation.toString(),
        saga_pool_capacity_void_units:
          sagaPoolCapacity.toString(),
      },
    );
  }
  if (maxDeliveryUnits * tokenAtomMultiplier > UINT256_MAX) {
    return policyHeld(
      "erc20_execution_max_amount_token_atom_overflow",
      [],
      {
        max_amount_unit_domain: "fulfillment_units_6_decimal",
        token_atom_multiplier:
          VOID_BUY_VOID_ERC20_DELIVERY_UNIT_SCALE_V1.multiplier,
      },
    );
  }

  const receiptPolicy: BuyVoidErc20DeliveryReceiptReconcilerPolicyV1 = {
    enabled: true,
    chain_id: "2050",
    rpc_url: values.rpc_url,
    void_token_address: token,
    min_confirmations: deliveryMinConfirmations,
    fulfillment_wallet_allowlist: [wallet],
    ...(timeout ? { request_timeout_ms: timeout } : {}),
    ...(maxResponse ? { max_response_bytes: maxResponse } : {}),
  };
  const signPolicy: BuyVoidDeliverySignBroadcastPolicyV1 = {
    enabled: true,
    chain_id: "2050",
    void_token_address: token,
    fulfillment_wallet_address: wallet,
    max_void_amount_units: values.max_void_amount_units,
    max_gas_limit: values.max_gas_limit,
    max_fee_per_gas_wei: values.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei: values.max_priority_fee_per_gas_wei,
  };
  const policy = {
    planner_policy: plannerPolicy,
    receipt_policy: receiptPolicy,
    sign_broadcast_policy: signPolicy,
    saga_policy: saga.policy,
    policy_fingerprint_sha256: "",
  } as BuyVoidErc20ExecutionCompositionPolicyV1;
  policy.policy_fingerprint_sha256 = fingerprint({
    planner_policy: plannerPolicy,
    planner_policy_fingerprint_sha256:
      plannerValidation.policy_fingerprint_sha256,
    receipt_policy: receiptPolicy,
    sign_broadcast_policy: signPolicy,
    saga_policy_fingerprint: saga.policy.fingerprints.combined_policy_sha256,
  });
  return { ok: true, status: "configured", policy, missing_envs: [] };
}

function safeRoot(rootDir: string): string {
  const raw = text(rootDir);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("erc20_execution_root_must_be_absolute");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("erc20_execution_root_must_not_be_filesystem_root");
  }
  return resolved;
}

function ensurePrivateDirectory(directory: string): string {
  const resolved = path.resolve(directory);
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  fs.chmodSync(resolved, 0o700);
  const meta = fs.lstatSync(resolved);
  if (!meta.isDirectory() || meta.isSymbolicLink()) {
    throw new Error("erc20_execution_directory_must_be_direct_directory");
  }
  if (typeof process.getuid === "function" && meta.uid !== process.getuid()) {
    throw new Error("erc20_execution_directory_owner_mismatch");
  }
  if ((meta.mode & 0o077) !== 0) {
    throw new Error("erc20_execution_directory_must_be_private");
  }
  return resolved;
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function atomicCreateJson(file: string, value: unknown): "created" | "exists" {
  const parent = ensurePrivateDirectory(path.dirname(file));
  const temp = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const fd = fs.openSync(temp, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    try {
      fs.linkSync(temp, file);
      fsyncDirectory(parent);
      return "created";
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return "exists";
      throw error;
    }
  } finally {
    try {
      fs.unlinkSync(temp);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
}

function readJson(file: string, label: string): Record<string, any> | null {
  try {
    const meta = fs.lstatSync(file);
    if (!meta.isFile() || meta.isSymbolicLink()) {
      throw new Error(`${label}_must_be_direct_file`);
    }
    if ((meta.mode & 0o077) !== 0 || meta.size < 2 || meta.size > MAX_JSON_BYTES) {
      throw new Error(`${label}_metadata_invalid`);
    }
    return directObject(JSON.parse(fs.readFileSync(file, "utf8")), label);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
}

function compositionPaths(rootDir: string, walletAddress: string, attemptId: string) {
  const root = path.join(safeRoot(rootDir), COMPOSITION_ROOT);
  const walletKey = sha256(`void-buy-erc20-wallet-v1\n2050\n${walletAddress}`);
  const wallet = path.join(root, "wallets", walletKey);
  return {
    root,
    wallet_key: walletKey,
    wallet,
    nonces: path.join(wallet, "nonces"),
    attempts: path.join(wallet, "attempts"),
    allocation_lock: path.join(wallet, "nonce-allocation"),
    preparation: path.join(root, "preparations", `${attemptId}.json`),
  };
}

function nonceFile(directory: string, nonce: number): string {
  return path.join(directory, `${String(nonce).padStart(16, "0")}.json`);
}

function validateNonceRecord(
  value: Record<string, any>,
): BuyVoidErc20NonceReservationV1 {
  if (
    value.schema !== NONCE_SCHEMA ||
    value.marker !== VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1 ||
    value.version !== 1 ||
    !SHA256.test(text(value.attempt_id).toLowerCase()) ||
    !normalizeAddress(value.wallet_address) ||
    !SHA256.test(text(value.wallet_key_sha256).toLowerCase()) ||
    !Number.isSafeInteger(value.nonce) ||
    value.nonce < 0 ||
    value.reservation_status !== "reserved" ||
    value.automatic_release !== false
  ) {
    throw new Error("erc20_nonce_reservation_invalid");
  }
  return value as BuyVoidErc20NonceReservationV1;
}

function readAttemptNonceReservation(
  rootDir: string,
  walletAddress: string,
  attemptId: string,
): BuyVoidErc20NonceReservationV1 | null {
  const paths = compositionPaths(rootDir, walletAddress, attemptId);
  const indexFile = path.join(paths.attempts, `${attemptId}.json`);
  const index = readJson(indexFile, "erc20_nonce_attempt_index");
  if (index) {
    if (
      index.schema !== NONCE_INDEX_SCHEMA ||
      index.marker !== VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1 ||
      index.version !== 1 ||
      text(index.attempt_id).toLowerCase() !== attemptId ||
      index.wallet_key_sha256 !== paths.wallet_key ||
      !Number.isSafeInteger(index.nonce) ||
      index.nonce < 0
    ) {
      throw new Error("erc20_nonce_attempt_index_invalid");
    }
    const record = readJson(nonceFile(paths.nonces, index.nonce), "erc20_nonce_record");
    if (!record) throw new Error("erc20_nonce_index_target_missing");
    const validated = validateNonceRecord(record);
    if (validated.attempt_id !== attemptId || validated.nonce !== index.nonce) {
      throw new Error("erc20_nonce_index_binding_mismatch");
    }
    return validated;
  }

  let recovered: BuyVoidErc20NonceReservationV1 | null = null;
  try {
    for (const entry of fs.readdirSync(paths.nonces, { withFileTypes: true })) {
      if (!entry.isFile() || entry.isSymbolicLink() || !/^\d{16}\.json$/.test(entry.name)) {
        throw new Error("erc20_nonce_directory_entry_invalid");
      }
      const raw = readJson(path.join(paths.nonces, entry.name), "erc20_nonce_record");
      if (!raw) continue;
      const record = validateNonceRecord(raw);
      if (record.attempt_id !== attemptId) continue;
      if (recovered) throw new Error("erc20_nonce_attempt_ambiguous");
      recovered = record;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
  if (recovered) {
    ensurePrivateDirectory(paths.attempts);
    atomicCreateJson(indexFile, {
      schema: NONCE_INDEX_SCHEMA,
      marker: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1,
      version: 1,
      attempt_id: attemptId,
      wallet_key_sha256: paths.wallet_key,
      nonce: recovered.nonce,
    });
  }
  return recovered;
}

function reserveExactNonce(input: {
  root_dir: string;
  attempt_id: string;
  wallet_address: string;
  nonce: number;
  now_ms: number;
}): BuyVoidErc20NonceReservationV1 {
  const wallet = normalizeAddress(input.wallet_address);
  const attemptId = text(input.attempt_id).toLowerCase();
  if (!wallet || !SHA256.test(attemptId) || !Number.isSafeInteger(input.nonce) || input.nonce < 0) {
    throw new Error("erc20_nonce_reservation_input_invalid");
  }
  const paths = compositionPaths(input.root_dir, wallet, attemptId);
  ensurePrivateDirectory(paths.nonces);
  ensurePrivateDirectory(paths.attempts);
  return withBuyVoidFilesystemBakeryLockV1(paths.allocation_lock, () => {
    const existingAttempt = readAttemptNonceReservation(
      input.root_dir,
      wallet,
      attemptId,
    );
    if (existingAttempt) {
      if (existingAttempt.nonce !== input.nonce) {
        throw new Error("erc20_reserved_nonce_drift");
      }
      return existingAttempt;
    }
    const target = nonceFile(paths.nonces, input.nonce);
    const existingNonce = readJson(target, "erc20_nonce_record");
    if (existingNonce) {
      const record = validateNonceRecord(existingNonce);
      if (record.attempt_id !== attemptId) {
        throw new Error("erc20_pending_nonce_reserved_by_other_attempt");
      }
      return record;
    }
    const record: BuyVoidErc20NonceReservationV1 = {
      schema: NONCE_SCHEMA,
      marker: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1,
      version: 1,
      reserved_at_ms: input.now_ms,
      attempt_id: attemptId,
      wallet_address: wallet,
      wallet_key_sha256: paths.wallet_key,
      nonce: input.nonce,
      reservation_status: "reserved",
      automatic_release: false,
    };
    const created = atomicCreateJson(target, record);
    if (created !== "created") throw new Error("erc20_nonce_reservation_race");
    const indexFile = path.join(paths.attempts, `${attemptId}.json`);
    const indexCreated = atomicCreateJson(indexFile, {
      schema: NONCE_INDEX_SCHEMA,
      marker: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1,
      version: 1,
      attempt_id: attemptId,
      wallet_key_sha256: paths.wallet_key,
      nonce: input.nonce,
    });
    if (indexCreated !== "created") {
      const recovered = readAttemptNonceReservation(input.root_dir, wallet, attemptId);
      if (!recovered || recovered.nonce !== input.nonce) {
        throw new Error("erc20_nonce_attempt_index_race");
      }
    }
    return record;
  });
}

function unsignedFromPlan(
  plan: BuyVoidErc20TransactionPreparationPlanReadyV1,
): BuyVoidDeliveryUnsignedTransactionV1 {
  return {
    type: 2,
    chainId: 2050n,
    nonce: plan.pending_nonce,
    gasLimit: BigInt(plan.computed_gas_limit),
    maxFeePerGas: BigInt(plan.computed_max_fee_per_gas_wei),
    maxPriorityFeePerGas: BigInt(plan.configured_priority_fee_per_gas_wei),
    to: plan.void_token_address,
    value: 0n,
    data: plan.transfer_calldata,
  };
}

function unsignedFingerprint(transaction: BuyVoidDeliveryUnsignedTransactionV1): string {
  return fingerprint({
    type: transaction.type,
    chain_id: transaction.chainId.toString(),
    nonce: transaction.nonce,
    gas_limit: transaction.gasLimit.toString(),
    max_fee_per_gas_wei: transaction.maxFeePerGas.toString(),
    max_priority_fee_per_gas_wei: transaction.maxPriorityFeePerGas.toString(),
    to: transaction.to.toLowerCase(),
    value: transaction.value.toString(),
    data: transaction.data.toLowerCase(),
  });
}

function validateSignedTransaction(
  raw: string,
  unsigned: BuyVoidDeliveryUnsignedTransactionV1,
  expectedWallet: string,
): string {
  if (!/^0x[0-9a-fA-F]+$/.test(raw) || raw.length % 2 !== 0) {
    throw new Error("erc20_signed_transaction_invalid");
  }
  const parsed = Transaction.from(raw);
  const hash = normalizeHash(parsed.hash);
  if (
    !hash ||
    normalizeAddress(parsed.from) !== expectedWallet ||
    normalizeAddress(parsed.to) !== normalizeAddress(unsigned.to) ||
    parsed.type !== unsigned.type ||
    parsed.chainId !== unsigned.chainId ||
    parsed.nonce !== unsigned.nonce ||
    parsed.gasLimit !== unsigned.gasLimit ||
    parsed.maxFeePerGas !== unsigned.maxFeePerGas ||
    parsed.maxPriorityFeePerGas !== unsigned.maxPriorityFeePerGas ||
    parsed.value !== 0n ||
    text(parsed.data).toLowerCase() !== unsigned.data.toLowerCase()
  ) {
    throw new Error("erc20_signed_transaction_binding_mismatch");
  }
  return hash;
}

function validatePreparationRecord(
  value: Record<string, any>,
): BuyVoidErc20PreparationCustodyV1 {
  if (
    value.schema !== PREPARATION_SCHEMA ||
    value.marker !== VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1 ||
    value.version !== 1 ||
    !SHA256.test(text(value.attempt_id).toLowerCase()) ||
    value.chain_id !== "2050" ||
    !normalizeAddress(value.fulfillment_wallet_address) ||
    !SHA256.test(text(value.wallet_key_sha256).toLowerCase()) ||
    !normalizeAddress(value.void_token_address) ||
    !normalizeAddress(value.delivery_address) ||
    !positiveDecimal(value.void_amount_units) ||
    !positiveDecimal(value.token_amount_atoms) ||
    !/^0x[0-9a-f]+$/i.test(text(value.transfer_calldata)) ||
    !SHA256.test(text(value.transfer_calldata_sha256).toLowerCase()) ||
    !Number.isSafeInteger(value.nonce) ||
    value.nonce < 0 ||
    !positiveDecimal(value.gas_limit) ||
    !positiveDecimal(value.max_fee_per_gas_wei) ||
    !DECIMAL.test(text(value.max_priority_fee_per_gas_wei)) ||
    !SHA256.test(text(value.preparation_fingerprint_sha256).toLowerCase()) ||
    !SHA256.test(text(value.rpc_url_fingerprint_sha256).toLowerCase()) ||
    !SHA256.test(text(value.unsigned_transaction_fingerprint_sha256).toLowerCase()) ||
    !normalizeHash(value.signed_transaction_hash) ||
    value.signed_hash_custody_status !== "prepared" ||
    value.raw_signed_transaction_persisted !== false ||
    value.raw_signed_transaction_returned !== false ||
    value.automatic_retry_allowed !== false
  ) {
    throw new Error("erc20_preparation_custody_record_invalid");
  }
  const plan = directObject(value.transaction_plan, "erc20_preparation_transaction_plan");
  const planChain = text(plan.chain_id);
  const planNonce = Number(plan.nonce);
  if (
    planChain !== "2050" ||
    !Number.isSafeInteger(planNonce) ||
    planNonce !== value.nonce ||
    text(plan.gas_limit) !== text(value.gas_limit) ||
    text(plan.max_fee_per_gas_wei) !== text(value.max_fee_per_gas_wei) ||
    text(plan.max_priority_fee_per_gas_wei) !== text(value.max_priority_fee_per_gas_wei) ||
    text(value.transfer_calldata_sha256).toLowerCase() !==
      sha256(text(value.transfer_calldata)) ||
    text(value.wallet_key_sha256).toLowerCase() !==
      sha256(`void-buy-erc20-wallet-v1\n2050\n${normalizeAddress(value.fulfillment_wallet_address)}`)
  ) {
    throw new Error("erc20_preparation_custody_binding_invalid");
  }
  const unsigned: BuyVoidDeliveryUnsignedTransactionV1 = {
    type: 2,
    chainId: 2050n,
    nonce: value.nonce,
    gasLimit: BigInt(value.gas_limit),
    maxFeePerGas: BigInt(value.max_fee_per_gas_wei),
    maxPriorityFeePerGas: BigInt(value.max_priority_fee_per_gas_wei),
    to: normalizeAddress(value.void_token_address),
    value: 0n,
    data: text(value.transfer_calldata).toLowerCase(),
  };
  if (
    text(value.unsigned_transaction_fingerprint_sha256).toLowerCase() !==
      unsignedFingerprint(unsigned)
  ) {
    throw new Error("erc20_preparation_unsigned_fingerprint_invalid");
  }
  return value as BuyVoidErc20PreparationCustodyV1;
}

export function readBuyVoidErc20PreparationCustodyV1(input: {
  root_dir: string;
  attempt_id: string;
}): BuyVoidErc20PreparationCustodyV1 | null {
  const attemptId = text(input.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) return null;
  const file = path.join(safeRoot(input.root_dir), COMPOSITION_ROOT, "preparations", `${attemptId}.json`);
  const value = readJson(file, "erc20_preparation_custody");
  return value ? validatePreparationRecord(value) : null;
}

function preparationFromPlan(input: {
  root_dir: string;
  plan: BuyVoidErc20TransactionPreparationPlanReadyV1;
  signed_transaction_hash: string;
  unsigned_transaction_fingerprint_sha256: string;
  now_ms: number;
}): BuyVoidErc20PreparationCustodyV1 {
  const paths = compositionPaths(
    input.root_dir,
    input.plan.fulfillment_wallet_address,
    input.plan.attempt_id,
  );
  return {
    schema: PREPARATION_SCHEMA,
    marker: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1,
    version: 1,
    recorded_at_ms: input.now_ms,
    attempt_id: input.plan.attempt_id,
    chain_id: "2050",
    fulfillment_wallet_address: input.plan.fulfillment_wallet_address,
    wallet_key_sha256: paths.wallet_key,
    void_token_address: input.plan.void_token_address,
    delivery_address: input.plan.delivery_address,
    void_amount_units: input.plan.void_amount_units,
    token_amount_atoms: input.plan.token_amount_atoms,
    transfer_calldata: input.plan.transfer_calldata,
    transfer_calldata_sha256: input.plan.transfer_calldata_sha256,
    nonce: input.plan.pending_nonce,
    gas_limit: input.plan.computed_gas_limit,
    max_fee_per_gas_wei: input.plan.computed_max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      input.plan.configured_priority_fee_per_gas_wei,
    transaction_plan: input.plan.transaction_plan,
    preparation_fingerprint_sha256: input.plan.preparation_fingerprint_sha256,
    rpc_url_fingerprint_sha256: input.plan.rpc_url_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256:
      input.unsigned_transaction_fingerprint_sha256,
    signed_transaction_hash: input.signed_transaction_hash,
    signed_hash_custody_status: "prepared",
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
  };
}

function persistPreparation(
  rootDir: string,
  record: BuyVoidErc20PreparationCustodyV1,
): BuyVoidErc20PreparationCustodyV1 {
  const file = compositionPaths(
    rootDir,
    record.fulfillment_wallet_address,
    record.attempt_id,
  ).preparation;
  const created = atomicCreateJson(file, record);
  if (created === "created") return record;
  const existing = readBuyVoidErc20PreparationCustodyV1({
    root_dir: rootDir,
    attempt_id: record.attempt_id,
  });
  if (!existing || canonical(existing) !== canonical(record)) {
    throw new Error("erc20_preparation_custody_conflict");
  }
  return existing;
}

function findIntent(
  rootDir: string,
  attempt: BuyVoidExecutionAttemptStateV1,
): BuyVoidFulfillmentJournalIntentV1 {
  const reservation = attempt.reservation;
  const matches = listBuyVoidFulfillmentJournalClaimsV1(rootDir).filter((value) =>
    value.claim?.request_id === reservation.request_id &&
    value.claim?.canonical_payment_identity === reservation.canonical_payment_identity &&
    value.claim?.instruction_id === reservation.instruction_id &&
    value.request_key_sha256 === reservation.request_key_sha256 &&
    value.payment_key_sha256 === reservation.payment_key_sha256,
  );
  if (matches.length !== 1) {
    throw new Error(matches.length ? "erc20_fulfillment_intent_ambiguous" : "erc20_fulfillment_intent_missing");
  }
  return matches[0];
}

function findInventory(
  rootDir: string,
  intent: BuyVoidFulfillmentJournalIntentV1,
  sagaPolicy: BuyVoidCrashConsistentSagaServerPolicyV1,
): BuyVoidInventoryReservationV1 {
  const matches = listBuyVoidInventoryReservationsV1({
    root_dir: rootDir,
    pool_id: sagaPolicy.inventory_policy.pool_id,
  }).filter((value) =>
    value.request_id === intent.claim.request_id &&
    value.canonical_payment_identity === intent.claim.canonical_payment_identity &&
    value.request_key_sha256 === intent.request_key_sha256 &&
    value.payment_key_sha256 === intent.payment_key_sha256 &&
    normalizeAddress(value.delivery_address) ===
      normalizeAddress(intent.claim.unsigned_instruction.delivery_address) &&
    text(value.reserved_void_units) ===
      text(intent.claim.unsigned_instruction.void_amount_units),
  );
  if (matches.length !== 1) {
    throw new Error(matches.length ? "erc20_inventory_reservation_ambiguous" : "erc20_inventory_reservation_missing");
  }
  return matches[0];
}

async function defaultSagaModule(): Promise<any> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as
    (specifier: string) => Promise<any>;
  return dynamicImport("../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs");
}

function assertSagaProjectionPolicy(input: {
  intent: BuyVoidFulfillmentJournalIntentV1;
  inventory: BuyVoidInventoryReservationV1;
  attempt: BuyVoidExecutionAttemptStateV1;
  policy: BuyVoidCrashConsistentSagaServerPolicyV1;
}): void {
  const { intent, inventory, attempt, policy } = input;
  const chain = text(intent.verification_binding?.source_chain).toLowerCase();
  const verification = policy.verification_policy;
  const fulfillment = policy.fulfillment_policy;
  if (!verification.allowed_chains.includes(chain)) {
    throw new Error("erc20_claim_server_payment_chain_conflict");
  }
  if (
    text(intent.verification_binding?.usdc_contract).toLowerCase() !==
      text(verification.usdc_contract_by_chain[chain]).toLowerCase() ||
    text(intent.verification_binding?.receive_address).toLowerCase() !==
      text(verification.receive_address_by_chain[chain]).toLowerCase()
  ) {
    throw new Error("erc20_claim_server_payment_binding_conflict");
  }
  const observedConfirmations = positiveDecimal(
    intent.verification_binding?.confirmation_count_at_claim,
  );
  const requiredConfirmations = BigInt(
    fulfillment.min_confirmations_by_chain[chain] || 0,
  );
  if (!observedConfirmations || BigInt(observedConfirmations) < requiredConfirmations) {
    throw new Error("erc20_claim_server_confirmation_policy_conflict");
  }
  const paidUnits = positiveDecimal(intent.verification_binding?.payment_usdc_units);
  const voidUnits = positiveDecimal(intent.claim?.unsigned_instruction?.void_amount_units);
  const rateNumerator = positiveDecimal(fulfillment.rate_void_units_numerator);
  const rateDenominator = positiveDecimal(fulfillment.rate_void_units_denominator);
  if (
    !paidUnits || !voidUnits || !rateNumerator || !rateDenominator ||
    BigInt(paidUnits) * BigInt(rateNumerator) !==
      BigInt(voidUnits) * BigInt(rateDenominator)
  ) {
    throw new Error("erc20_claim_server_rate_policy_conflict");
  }
  if (
    inventory.pool_id !== policy.inventory_policy.pool_id ||
    inventory.inventory_policy_version !== policy.inventory_policy.inventory_policy_version ||
    text(inventory.pool_capacity_void_units) !==
      text(policy.inventory_policy.pool_capacity_void_units) ||
    BigInt(inventory.reserved_void_units) >
      BigInt(text(policy.inventory_policy.max_reservation_void_units))
  ) {
    throw new Error("erc20_inventory_server_policy_conflict");
  }
  const reservation = attempt.reservation;
  const wallets = policy.execution_policy.fulfillment_wallet_allowlist
    .map((value) => normalizeAddress(value));
  if (
    text(policy.execution_policy.chain_id) !== "2050" ||
    Number(policy.execution_policy.max_attempts_per_payment) !== 1 ||
    reservation.attempt_number !== 1 ||
    reservation.max_attempts_per_payment !== 1 ||
    wallets.length !== 1 ||
    reservation.request_id !== intent.claim.request_id ||
    reservation.canonical_payment_identity !== intent.claim.canonical_payment_identity ||
    reservation.request_key_sha256 !== intent.request_key_sha256 ||
    reservation.payment_key_sha256 !== intent.payment_key_sha256
  ) {
    throw new Error("erc20_execution_server_policy_conflict");
  }
}

function sagaBinding(
  intent: BuyVoidFulfillmentJournalIntentV1,
  sagaPolicy: BuyVoidCrashConsistentSagaServerPolicyV1,
) {
  return {
    request_id: intent.claim.request_id,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    request_key_sha256: intent.request_key_sha256,
    payment_key_sha256: intent.payment_key_sha256,
    delivery_address: normalizeAddress(intent.claim.unsigned_instruction.delivery_address),
    void_amount_units: text(intent.claim.unsigned_instruction.void_amount_units),
    chain_id: "2050",
    pool_id: sagaPolicy.inventory_policy.pool_id,
  };
}

function sagaOwner(): string {
  return `void-buy-erc20-${process.pid}-${crypto.randomBytes(12).toString("hex")}`;
}

async function reconcileSagaToPrepared(input: {
  root_dir: string;
  attempt: BuyVoidExecutionAttemptStateV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
  inventory: BuyVoidInventoryReservationV1;
  preparation: BuyVoidErc20PreparationCustodyV1;
  policy: BuyVoidErc20ExecutionCompositionPolicyV1;
  dependencies: BuyVoidErc20ExecutionCompositionDependenciesV1;
}): Promise<{ saga: any; store: any; saga_id: string; record: any }> {
  const saga = await (input.dependencies.load_saga_module || defaultSagaModule)();
  const binding = saga.validateSagaBindingV1(sagaBinding(input.intent, input.policy.saga_policy));
  const sagaId = saga.computeSagaIdV1(binding);
  const store = saga.createFilesystemSagaStoreV1(
    path.join(safeRoot(input.root_dir), "buy-void-crash-consistent-saga-runtime-v1"),
  );
  assertSagaProjectionPolicy({
    intent: input.intent,
    inventory: input.inventory,
    attempt: input.attempt,
    policy: input.policy.saga_policy,
  });
  const payloads: Record<string, () => Record<string, unknown>> = {
    claim_payment: () => ({
      claim_id: input.intent.claim.decision_fingerprint,
      instruction_id: input.intent.claim.instruction_id,
    }),
    reserve_inventory: () => ({ reservation_id: input.inventory.reservation_id }),
    reserve_execution_attempt: () => ({
      attempt_id: input.attempt.reservation.attempt_id,
      attempt_number: input.attempt.reservation.attempt_number,
    }),
    prepare_transaction: () => ({
      attempt_id: input.attempt.reservation.attempt_id,
      transaction_hash: input.preparation.signed_transaction_hash,
      nonce: input.preparation.nonce,
      fulfillment_wallet_fingerprint_sha256:
        sha256(input.preparation.fulfillment_wallet_address),
      gas_limit: input.preparation.gas_limit,
      max_fee_per_gas_wei: input.preparation.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei:
        input.preparation.max_priority_fee_per_gas_wei,
    }),
  };

  for (let count = 0; count < 5; count += 1) {
    const current = store.recover(sagaId);
    if (current) {
      const state = text(current.state?.state);
      if ([
        "transaction_prepared",
        "broadcast_intent_committed",
        "broadcast_not_attempted",
        "broadcast_unknown",
        "broadcast_accepted",
        "receipt_confirmed",
        "closed",
      ].includes(state)) {
        if (
          current.state.attempt_id !== input.attempt.reservation.attempt_id ||
          normalizeHash(current.state.transaction_hash) !== input.preparation.signed_transaction_hash ||
          current.state.nonce !== input.preparation.nonce
        ) {
          throw new Error("erc20_saga_preparation_binding_conflict");
        }
        return { saga, store, saga_id: sagaId, record: current };
      }
    }
    const next = current
      ? saga.deriveSagaNextActionV1(current.state)
      : { action: "claim_payment", terminal: false };
    if (next.terminal || !next.action || !payloads[next.action]) {
      throw new Error("erc20_saga_preparation_boundary_invalid");
    }
    const nowMs = safeNow(input.dependencies.now_ms?.());
    const result = await saga.runSagaSupervisorTickV1({
      store,
      binding,
      owner_id: sagaOwner(),
      now_ms: nowMs,
      lease_ttl_ms: LEASE_TTL_MS,
      recorded_at_utc: new Date(nowMs).toISOString(),
      source_floor_main: SOURCE_FLOOR_MAIN,
      policy_id: input.policy.saga_policy.saga_policy_id,
      apply: true,
      confirmation: saga.ADVANCE_CONFIRMATION,
      action_confirmation: saga.ACTION_CONFIRMATIONS[next.action],
      adapters: {
        [next.action]: async () => ({ payload: payloads[next.action]() }),
      },
    });
    if (!result || result.ok !== true || result.status !== "applied") {
      throw new Error(`erc20_saga_reconciliation_held:${text(result?.reason || result?.status)}`);
    }
  }
  throw new Error("erc20_saga_preparation_reconciliation_exhausted");
}

function pipelineApplied(decision: BuyVoidPipelineCoordinatorDecisionV1, label: string): void {
  if ("reason" in decision || decision.status !== "applied") {
    throw new Error(`${label}:${"reason" in decision ? decision.reason : decision.status}`);
  }
}

function prepareProjection(
  rootDir: string,
  attempt: BuyVoidExecutionAttemptStateV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
  preparation: BuyVoidErc20PreparationCustodyV1,
  policy: BuyVoidErc20ExecutionCompositionPolicyV1,
  nowMs: number,
): BuyVoidExecutionAttemptStateV1 {
  const current = readBuyVoidExecutionAttemptV1({
    root_dir: rootDir,
    attempt_id: attempt.reservation.attempt_id,
  });
  if (!current) throw new Error("erc20_execution_attempt_missing_before_prepare_projection");
  if (current.status !== "reserved") {
    if (
      current.prepared?.void_delivery_tx_hash === preparation.signed_transaction_hash &&
      current.prepared?.fulfillment_wallet === preparation.fulfillment_wallet_address &&
      current.prepared?.delivery_address === preparation.delivery_address &&
      current.prepared?.void_amount_units === preparation.void_amount_units
    ) {
      return current;
    }
    throw new Error("erc20_execution_attempt_preparation_conflict");
  }
  const decision = runBuyVoidPipelineCommandV1({
    action: "prepare_execution",
    root_dir: rootDir,
    attempt_id: attempt.reservation.attempt_id,
    intent,
    execution_policy: policy.saga_policy.execution_policy,
    transaction: {
      chain_id: "2050",
      transaction_hash: preparation.signed_transaction_hash,
      from_address: preparation.fulfillment_wallet_address,
      to_address: preparation.delivery_address,
      amount_units: preparation.void_amount_units,
    },
    apply: true,
    confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
    now_ms: nowMs,
  });
  pipelineApplied(decision, "erc20_prepare_projection_held");
  const updated = readBuyVoidExecutionAttemptV1({
    root_dir: rootDir,
    attempt_id: attempt.reservation.attempt_id,
  });
  if (!updated?.prepared) throw new Error("erc20_prepare_projection_missing_after_apply");
  return updated;
}

function reservedPlannerView(attempt: BuyVoidExecutionAttemptStateV1): BuyVoidExecutionAttemptStateV1 {
  return {
    reservation: attempt.reservation,
    prepared: null,
    broadcast: null,
    failure: null,
    postbroadcast_failure: null,
    confirmation: null,
    status: "reserved",
  };
}

function exactPreparationBinding(
  attempt: BuyVoidExecutionAttemptStateV1,
  preparation: BuyVoidErc20PreparationCustodyV1,
): void {
  if (
    attempt.reservation.attempt_id !== preparation.attempt_id ||
    !attempt.prepared ||
    attempt.prepared.void_delivery_tx_hash !== preparation.signed_transaction_hash ||
    normalizeAddress(attempt.prepared.fulfillment_wallet) !== preparation.fulfillment_wallet_address ||
    normalizeAddress(attempt.prepared.delivery_address) !== preparation.delivery_address ||
    text(attempt.prepared.void_amount_units) !== preparation.void_amount_units
  ) {
    throw new Error("erc20_prepared_attempt_custody_binding_conflict");
  }
}

async function prepareStage(input: {
  root_dir: string;
  attempt: BuyVoidExecutionAttemptStateV1;
  apply: boolean;
  policy: BuyVoidErc20ExecutionCompositionPolicyV1;
  dependencies: BuyVoidErc20ExecutionCompositionDependenciesV1;
}): Promise<BuyVoidErc20ExecutionCompositionDecisionV1> {
  const attemptId = input.attempt.reservation.attempt_id;
  let existing = readBuyVoidErc20PreparationCustodyV1({
    root_dir: input.root_dir,
    attempt_id: attemptId,
  });
  const intent = findIntent(input.root_dir, input.attempt);
  const inventory = findInventory(input.root_dir, intent, input.policy.saga_policy);

  if (existing) {
    const updated = input.apply
      ? prepareProjection(
          input.root_dir,
          input.attempt,
          intent,
          existing,
          input.policy,
          safeNow(input.dependencies.now_ms?.()),
        )
      : input.attempt;
    const sagaResult = input.apply && updated.prepared
      ? await reconcileSagaToPrepared({
          root_dir: input.root_dir,
          attempt: updated,
          intent,
          inventory,
          preparation: existing,
          policy: input.policy,
          dependencies: input.dependencies,
        })
      : null;
    return {
      ok: true,
      status: input.apply ? "prepared" : "dry_run",
      stage: "prepare",
      applied: input.apply,
      attempt_id: attemptId,
      saga_id: sagaResult?.saga_id || null,
      next_stage: "broadcast",
      required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
      preparation: existing,
      mutation_performed: input.apply,
      signing_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  if (input.attempt.status !== "reserved") {
    return held("prepare", input.apply, "erc20_preparation_custody_missing_for_nonreserved_attempt", {
      attempt_id: attemptId,
      reconciliation_required: true,
    });
  }

  const priorNonce = readAttemptNonceReservation(
    input.root_dir,
    input.policy.planner_policy.fulfillment_wallet_address,
    attemptId,
  );
  const firstPlan = await runBuyVoidErc20TransactionPreparationPlannerV1({
    attempt: input.attempt,
    policy: input.policy.planner_policy,
    ...(input.dependencies.planner_transport
      ? { transport: input.dependencies.planner_transport }
      : {}),
  });
  if (firstPlan.ok === false) {
    return held("prepare", input.apply, firstPlan.reason, {
      attempt_id: attemptId,
      detail: firstPlan.detail,
    });
  }
  if (priorNonce && priorNonce.nonce !== firstPlan.pending_nonce) {
    return held("prepare", input.apply, "erc20_reserved_nonce_drift", {
      attempt_id: attemptId,
      reconciliation_required: true,
      detail: {
        reserved_nonce: priorNonce.nonce,
        observed_pending_nonce: firstPlan.pending_nonce,
      },
    });
  }
  if (!input.apply) {
    return {
      ok: true,
      status: "dry_run",
      stage: "prepare",
      applied: false,
      attempt_id: attemptId,
      saga_id: null,
      next_stage: "prepare",
      required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }
  if (!input.dependencies.signer) {
    return held("prepare", true, "erc20_signer_dependency_required", {
      attempt_id: attemptId,
    });
  }

  const nonceReservation = priorNonce || reserveExactNonce({
    root_dir: input.root_dir,
    attempt_id: attemptId,
    wallet_address: firstPlan.fulfillment_wallet_address,
    nonce: firstPlan.pending_nonce,
    now_ms: safeNow(input.dependencies.now_ms?.()),
  });

  const revalidated = await runBuyVoidErc20TransactionPreparationPlannerV1({
    attempt: input.attempt,
    policy: input.policy.planner_policy,
    ...(input.dependencies.planner_transport
      ? { transport: input.dependencies.planner_transport }
      : {}),
  });
  if (revalidated.ok === false) {
    return held("prepare", true, `erc20_pre_sign_revalidation_held:${revalidated.reason}`, {
      attempt_id: attemptId,
      mutation_performed: true,
      reconciliation_required: true,
      detail: revalidated.detail,
    });
  }
  if (revalidated.pending_nonce !== nonceReservation.nonce) {
    return held("prepare", true, "erc20_pre_sign_nonce_drift", {
      attempt_id: attemptId,
      mutation_performed: true,
      reconciliation_required: true,
      detail: {
        reserved_nonce: nonceReservation.nonce,
        observed_pending_nonce: revalidated.pending_nonce,
      },
    });
  }

  const signerAddress = normalizeAddress(await input.dependencies.signer.get_address());
  if (signerAddress !== revalidated.fulfillment_wallet_address) {
    return held("prepare", true, "erc20_signer_wallet_mismatch", {
      attempt_id: attemptId,
      mutation_performed: true,
      reconciliation_required: true,
    });
  }
  const unsigned = unsignedFromPlan(revalidated);
  const unsignedFp = unsignedFingerprint(unsigned);
  let rawSigned = "";
  let signedHash = "";
  try {
    rawSigned = await input.dependencies.signer.sign_transaction(unsigned);
    signedHash = validateSignedTransaction(rawSigned, unsigned, signerAddress);
  } catch (error) {
    return held("prepare", true, "erc20_preparation_signing_failed", {
      attempt_id: attemptId,
      mutation_performed: true,
      signing_performed: true,
      reconciliation_required: true,
      detail: { error_class: text((error as Error)?.name || "Error") },
    });
  } finally {
    rawSigned = "";
  }

  existing = persistPreparation(
    input.root_dir,
    preparationFromPlan({
      root_dir: input.root_dir,
      plan: revalidated,
      signed_transaction_hash: signedHash,
      unsigned_transaction_fingerprint_sha256: unsignedFp,
      now_ms: safeNow(input.dependencies.now_ms?.()),
    }),
  );
  await input.dependencies.fault_inject?.(
    "after_preparation_custody_before_attempt_projection",
  );
  const preparedAttempt = prepareProjection(
    input.root_dir,
    input.attempt,
    intent,
    existing,
    input.policy,
    safeNow(input.dependencies.now_ms?.()),
  );
  const sagaResult = await reconcileSagaToPrepared({
    root_dir: input.root_dir,
    attempt: preparedAttempt,
    intent,
    inventory,
    preparation: existing,
    policy: input.policy,
    dependencies: input.dependencies,
  });
  return {
    ok: true,
    status: "prepared",
    stage: "prepare",
    applied: true,
    attempt_id: attemptId,
    saga_id: sagaResult.saga_id,
    next_stage: "broadcast",
    required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
    preparation: existing,
    mutation_performed: true,
    signing_performed: true,
    transaction_broadcast_performed: false,
    reconciliation_required: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}

function submissionKey(preparation: BuyVoidErc20PreparationCustodyV1): string {
  return sha256([
    "void-buy-erc20-submission-v1",
    preparation.attempt_id,
    preparation.signed_transaction_hash,
    preparation.preparation_fingerprint_sha256,
  ].join("\n"));
}

function pipelineOutcomeCommand(
  rootDir: string,
  decision: BuyVoidDeliverySignBroadcastDecisionV1,
): Record<string, unknown> | null {
  if (!("reason" in decision)) {
    if (decision.status !== "broadcast_accepted") return null;
    return {
      action: "record_broadcast_accepted",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash: decision.transaction_hash,
      provider_submission_id: decision.provider_submission_id,
      apply: true,
      confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_accepted,
    };
  }
  if (decision.status === "not_broadcast") {
    return {
      action: "record_not_broadcast",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash: decision.expected_transaction_hash,
      reason_code: decision.reason,
      provider_submission_id: decision.provider_submission_id,
      detail: decision.detail || {},
      apply: true,
      confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_not_broadcast,
    };
  }
  if (decision.status === "broadcast_unknown") {
    return {
      action: "record_broadcast_unknown",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash: decision.expected_transaction_hash,
      reason_code: decision.reason,
      provider_submission_id: decision.provider_submission_id,
      apply: true,
      confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_unknown,
    };
  }
  return null;
}

type BroadcastDecisionBoxV1 = {
  value: BuyVoidDeliverySignBroadcastDecisionV1 | null;
};

function readBroadcastDecision(
  box: BroadcastDecisionBoxV1,
): BuyVoidDeliverySignBroadcastDecisionV1 | null {
  return box.value;
}

function sagaBroadcastResult(
  decision: BuyVoidDeliverySignBroadcastDecisionV1,
  attemptId: string,
  transactionHash: string,
) {
  if (!("reason" in decision)) {
    return {
      outcome: "broadcast_accepted",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: "external_submission_accepted",
        broadcast_call_performed: true,
        provider_submission_id_sha256: sha256(decision.provider_submission_id),
      },
    };
  }
  if (decision.status === "not_broadcast") {
    return {
      outcome: "broadcast_not_attempted",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: decision.reason,
        broadcast_call_performed: false,
      },
    };
  }
  if (decision.status === "broadcast_unknown") {
    return {
      outcome: "broadcast_unknown",
      payload: {
        attempt_id: attemptId,
        transaction_hash: transactionHash,
        reason_code: decision.reason,
        broadcast_call_performed: true,
        provider_submission_id_sha256: sha256(decision.provider_submission_id),
      },
    };
  }
  throw new Error(`erc20_broadcast_decision_held:${decision.reason}`);
}

async function broadcastStage(input: {
  root_dir: string;
  attempt: BuyVoidExecutionAttemptStateV1;
  preparation: BuyVoidErc20PreparationCustodyV1;
  apply: boolean;
  policy: BuyVoidErc20ExecutionCompositionPolicyV1;
  dependencies: BuyVoidErc20ExecutionCompositionDependenciesV1;
}): Promise<BuyVoidErc20ExecutionCompositionDecisionV1> {
  const attemptId = input.attempt.reservation.attempt_id;
  exactPreparationBinding(input.attempt, input.preparation);
  const intent = findIntent(input.root_dir, input.attempt);
  const inventory = findInventory(input.root_dir, intent, input.policy.saga_policy);
  const sagaResult = await reconcileSagaToPrepared({
    root_dir: input.root_dir,
    attempt: input.attempt,
    intent,
    inventory,
    preparation: input.preparation,
    policy: input.policy,
    dependencies: input.dependencies,
  });
  const state = text(sagaResult.record.state?.state);
  if (!["transaction_prepared", "broadcast_not_attempted"].includes(state)) {
    return held("broadcast", input.apply, "erc20_broadcast_stage_requires_prepared_saga", {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      reconciliation_required: true,
      detail: { saga_state: state },
    });
  }
  if (!input.apply) {
    return {
      ok: true,
      status: "dry_run",
      stage: "broadcast",
      applied: false,
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      next_stage: "broadcast",
      required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
      preparation: input.preparation,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }
  if (!input.dependencies.signer || !input.dependencies.broadcaster) {
    return held("broadcast", true, "erc20_delivery_dependencies_required", {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
    });
  }

  const revalidated = await runBuyVoidErc20TransactionPreparationPlannerV1({
    attempt: reservedPlannerView(input.attempt),
    policy: input.policy.planner_policy,
    ...(input.dependencies.planner_transport
      ? { transport: input.dependencies.planner_transport }
      : {}),
  });
  if (revalidated.ok === false) {
    return held("broadcast", true, `erc20_pre_sign_revalidation_held:${revalidated.reason}`, {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      reconciliation_required: true,
      detail: revalidated.detail,
    });
  }
  if (revalidated.pending_nonce !== input.preparation.nonce) {
    return held("broadcast", true, "erc20_pre_sign_nonce_drift", {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      reconciliation_required: true,
      detail: {
        reserved_nonce: input.preparation.nonce,
        observed_pending_nonce: revalidated.pending_nonce,
      },
    });
  }

  const decisionBox: BroadcastDecisionBoxV1 = {
    value: null,
  };
  let moneyMovement = false;
  try {
    const nowMs = safeNow(input.dependencies.now_ms?.());
    const result = await sagaResult.saga.runSagaSupervisorTickV1({
      store: sagaResult.store,
      binding: sagaResult.record.binding,
      owner_id: sagaOwner(),
      now_ms: nowMs,
      lease_ttl_ms: LEASE_TTL_MS,
      recorded_at_utc: new Date(nowMs).toISOString(),
      source_floor_main: SOURCE_FLOOR_MAIN,
      policy_id: input.policy.saga_policy.saga_policy_id,
      apply: true,
      confirmation: sagaResult.saga.ADVANCE_CONFIRMATION,
      action_confirmation:
        sagaResult.saga.ACTION_CONFIRMATIONS.execute_prepared_transaction,
      adapters: {
        execute_prepared_transaction: async () => {
          const decision = await runBuyVoidDeliverySignBroadcastV1({
            apply: true,
            confirmation: "buyVoidSignAndBroadcast",
            submission_idempotency_key: submissionKey(input.preparation),
            attempt: input.attempt,
            policy: input.policy.sign_broadcast_policy,
            plan: input.preparation.transaction_plan,
            dependencies: {
              submission_guard: createBuyVoidDeliverySubmissionGuardV1(input.root_dir),
              signer: input.dependencies.signer!,
              broadcaster: input.dependencies.broadcaster!,
            },
          });
          decisionBox.value = decision;
          moneyMovement =
            decision.ok === true &&
            decision.status === "broadcast_accepted";
          await input.dependencies.fault_inject?.(
            "after_external_outcome_before_projection",
          );
          const command = pipelineOutcomeCommand(input.root_dir, decision);
          if (command) {
            const projection = runBuyVoidPipelineCommandV1(command as any);
            pipelineApplied(projection, "erc20_broadcast_projection_held");
          }
          return sagaBroadcastResult(
            decision,
            attemptId,
            input.preparation.signed_transaction_hash,
          );
        },
      },
    });
    if (!result || result.ok !== true || result.status !== "applied") {
      throw new Error(`erc20_broadcast_saga_held:${text(result?.reason || result?.status)}`);
    }
  } catch (error) {
    return held("broadcast", true, text((error as Error)?.message || error), {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      mutation_performed: true,
      signing_performed:
        readBroadcastDecision(decisionBox) !== null,
      transaction_broadcast_performed: moneyMovement,
      money_movement_performed: moneyMovement,
      reconciliation_required: moneyMovement || text(sagaResult.store.recover(sagaResult.saga_id)?.state?.state) === "broadcast_intent_committed",
    });
  }

  const decision = readBroadcastDecision(decisionBox);
  if (!decision) {
    return held("broadcast", true, "erc20_broadcast_decision_missing", {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      reconciliation_required: true,
    });
  }
  if (decision.ok === false) {
    return held("broadcast", true, decision.reason, {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      mutation_performed: true,
      signing_performed: decision.signing_performed,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      reconciliation_required: decision.reconciliation_required,
      detail: decision.detail,
    });
  }
  return {
    ok: true,
    status: "broadcast_accepted",
    stage: "broadcast",
    applied: true,
    attempt_id: attemptId,
    saga_id: sagaResult.saga_id,
    next_stage: "reconcile",
    required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
    preparation: input.preparation,
    mutation_performed: true,
    signing_performed: true,
    transaction_broadcast_performed: true,
    reconciliation_required: true,
    automatic_retry_allowed: false,
    money_movement_performed: true,
  };
}

type ReceiptPresenceProbeV1 =
  | { found: true; receipt_fingerprint_sha256: string; reason?: never }
  | { found: false; receipt_fingerprint_sha256?: never; reason: string };

function createReceiptPresenceTransport(
  policy: BuyVoidErc20DeliveryReceiptReconcilerPolicyV1,
): BuyVoidErc20DeliveryReceiptRpcTransportV1 {
  const timeout = Number(policy.request_timeout_ms || 5_000);
  const maximum = Number(policy.max_response_bytes || 65_536);
  return async (call) => {
    if (call.method !== "eth_getTransactionReceipt") {
      throw new Error("erc20_receipt_presence_method_forbidden");
    }
    const url = new URL(text(policy.rpc_url));
    const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "::1", "localhost"].includes(host) ||
      url.username || url.password || url.hash
    ) {
      throw new Error("erc20_receipt_presence_rpc_url_invalid");
    }
    if (
      !Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 30_000 ||
      !Number.isSafeInteger(maximum) || maximum <= 0 || maximum > 1_048_576
    ) {
      throw new Error("erc20_receipt_presence_transport_bounds_invalid");
    }
    const requestId = 1;
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: call.method,
      params: call.params,
    });
    return await new Promise((resolve, reject) => {
      let settled = false;
      let totalDeadline: ReturnType<typeof setTimeout> | null = null;
      const finish = (error: Error | null, value?: unknown) => {
        if (settled) return;
        settled = true;
        if (totalDeadline !== null) clearTimeout(totalDeadline);
        if (error) reject(error);
        else resolve(value);
      };
      const request = http.request({
        protocol: "http:",
        hostname: url.hostname,
        port: url.port || "80",
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(body, "utf8")),
          "user-agent": "void-buy-void-erc20-receipt-presence-v1",
        },
      }, (response) => {
        if (Number(response.statusCode || 0) !== 200) {
          response.destroy();
          finish(new Error("erc20_receipt_presence_http_status_not_ok"));
          return;
        }
        const contentType = String(response.headers["content-type"] || "")
          .toLowerCase().split(";", 1)[0]?.trim() || "";
        if (contentType !== "application/json") {
          response.destroy();
          finish(new Error("erc20_receipt_presence_response_not_json"));
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        response.on("aborted", () => finish(new Error("erc20_receipt_presence_response_aborted")));
        response.on("error", () => finish(new Error("erc20_receipt_presence_response_error")));
        response.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maximum) {
            response.destroy();
            finish(new Error("erc20_receipt_presence_response_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          let payload: any;
          try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
          catch { finish(new Error("erc20_receipt_presence_response_json_invalid")); return; }
          if (!payload || payload.jsonrpc !== "2.0" || payload.id !== requestId || payload.error ||
              !Object.prototype.hasOwnProperty.call(payload, "result")) {
            finish(new Error("erc20_receipt_presence_rpc_envelope_invalid"));
            return;
          }
          finish(null, payload.result);
        });
      });
      request.on("error", (error) => finish(error));
      request.setTimeout(timeout, () => request.destroy(new Error("erc20_receipt_presence_timeout")));
      totalDeadline = setTimeout(
        () => request.destroy(new Error("erc20_receipt_presence_total_deadline_exceeded")),
        timeout,
      );
      request.end(body);
    });
  };
}

async function probeReceiptPresence(input: {
  transaction_hash: string;
  policy: BuyVoidErc20DeliveryReceiptReconcilerPolicyV1;
  transport?: BuyVoidErc20DeliveryReceiptRpcTransportV1;
}): Promise<ReceiptPresenceProbeV1> {
  const transactionHash = normalizeHash(input.transaction_hash);
  if (!transactionHash) return { found: false, reason: "erc20_receipt_presence_hash_invalid" };
  try {
    const transport = input.transport || createReceiptPresenceTransport(input.policy);
    const value = await transport({
      method: "eth_getTransactionReceipt",
      params: [transactionHash],
    });
    if (value === null) return { found: false, reason: "delivery_receipt_not_found" };
    const receipt = directObject(value, "erc20_receipt_presence");
    if (normalizeHash(receipt.transactionHash) !== transactionHash) {
      return { found: false, reason: "erc20_receipt_presence_hash_mismatch" };
    }
    return {
      found: true,
      receipt_fingerprint_sha256: fingerprint(receipt),
    };
  } catch (error) {
    return {
      found: false,
      reason: `erc20_receipt_presence_probe_failed:${text((error as Error)?.name || "Error")}`,
    };
  }
}

function appendBroadcastAcceptedSagaProjection(input: {
  saga: any;
  store: any;
  record: any;
  policy: BuyVoidErc20ExecutionCompositionPolicyV1;
  attempt_id: string;
  transaction_hash: string;
  provider_submission_id: string;
  now_ms: number;
}): Promise<any> {
  return input.saga.runSagaSupervisorTickV1({
    store: input.store,
    binding: input.record.binding,
    owner_id: sagaOwner(),
    now_ms: input.now_ms,
    lease_ttl_ms: LEASE_TTL_MS,
    recorded_at_utc: new Date(input.now_ms).toISOString(),
    source_floor_main: SOURCE_FLOOR_MAIN,
    policy_id: input.policy.saga_policy.saga_policy_id,
    apply: true,
    confirmation: input.saga.ADVANCE_CONFIRMATION,
    action_confirmation:
      input.saga.ACTION_CONFIRMATIONS.reconcile_possible_broadcast,
    adapters: {
      reconcile_possible_broadcast: async () => ({
        outcome: "broadcast_accepted",
        payload: {
          attempt_id: input.attempt_id,
          transaction_hash: input.transaction_hash,
          reason_code: "canonical_broadcast_projection_reconciled",
          broadcast_call_performed: true,
          provider_submission_id_sha256: sha256(input.provider_submission_id),
        },
      }),
    },
  });
}

async function reconcileStage(input: {
  root_dir: string;
  attempt: BuyVoidExecutionAttemptStateV1;
  preparation: BuyVoidErc20PreparationCustodyV1;
  apply: boolean;
  policy: BuyVoidErc20ExecutionCompositionPolicyV1;
  dependencies: BuyVoidErc20ExecutionCompositionDependenciesV1;
}): Promise<BuyVoidErc20ExecutionCompositionDecisionV1> {
  const attemptId = input.attempt.reservation.attempt_id;
  exactPreparationBinding(input.attempt, input.preparation);
  const intent = findIntent(input.root_dir, input.attempt);
  const inventory = findInventory(input.root_dir, intent, input.policy.saga_policy);
  let sagaResult = await reconcileSagaToPrepared({
    root_dir: input.root_dir,
    attempt: input.attempt,
    intent,
    inventory,
    preparation: input.preparation,
    policy: input.policy,
    dependencies: input.dependencies,
  });
  let state = text(sagaResult.record.state?.state);
  if (state === "receipt_confirmed" || state === "closed") {
    return {
      ok: true,
      status: state === "closed" ? "duplicate" : "ready_for_terminal_closeout",
      stage: "terminal",
      applied: false,
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      next_stage: state === "closed" ? null : "terminal_closeout",
      required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
      preparation: input.preparation,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }
  if (!["broadcast_intent_committed", "broadcast_unknown", "broadcast_accepted"].includes(state)) {
    return held("reconcile", input.apply, "erc20_reconciliation_saga_state_invalid", {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      reconciliation_required: true,
      detail: { saga_state: state },
    });
  }

  let canonicalBroadcastProjectionMutated = false;
  let currentAttempt = readBuyVoidExecutionAttemptV1({
    root_dir: input.root_dir,
    attempt_id: attemptId,
  });
  if (!currentAttempt) {
    return held("reconcile", input.apply, "erc20_reconciliation_attempt_missing", {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      reconciliation_required: true,
    });
  }
  if (!currentAttempt.broadcast) {
    const probe = await probeReceiptPresence({
      transaction_hash: input.preparation.signed_transaction_hash,
      policy: input.policy.receipt_policy,
      transport: input.dependencies.receipt_transport,
    });
    if (!probe.found) {
      return held("reconcile", input.apply, probe.reason, {
        attempt_id: attemptId,
        saga_id: sagaResult.saga_id,
        reconciliation_required: true,
      });
    }
    if (!input.apply) {
      return {
        ok: true,
        status: "dry_run",
        stage: "reconcile",
        applied: false,
        attempt_id: attemptId,
        saga_id: sagaResult.saga_id,
        next_stage: "reconcile",
        required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
        preparation: input.preparation,
        mutation_performed: false,
        signing_performed: false,
        transaction_broadcast_performed: false,
        reconciliation_required: true,
        automatic_retry_allowed: false,
        money_movement_performed: false,
      };
    }
    const accepted = runBuyVoidPipelineCommandV1({
      action: "record_broadcast_accepted",
      root_dir: input.root_dir,
      attempt_id: attemptId,
      transaction_hash: input.preparation.signed_transaction_hash,
      provider_submission_id:
        `receipt-presence-${probe.receipt_fingerprint_sha256.slice(0, 24)}`,
      apply: true,
      confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_broadcast_accepted,
      now_ms: safeNow(input.dependencies.now_ms?.()),
    });
    pipelineApplied(
      accepted,
      "erc20_receipt_presence_broadcast_projection_held",
    );
    canonicalBroadcastProjectionMutated = true;
    currentAttempt = readBuyVoidExecutionAttemptV1({
      root_dir: input.root_dir,
      attempt_id: attemptId,
    });
    if (!currentAttempt?.broadcast) {
      throw new Error("erc20_receipt_presence_broadcast_projection_missing");
    }
  }

  const receipt = await runBuyVoidErc20DeliveryReceiptReconcilerV1({
    attempt: currentAttempt,
    intent,
    policy: input.policy.receipt_policy,
    ...(input.dependencies.receipt_transport
      ? { transport: input.dependencies.receipt_transport }
      : {}),
  });

  if (receipt.ok === false) {
    if (currentAttempt.broadcast && state !== "broadcast_accepted" && input.apply) {
      const providerId = currentAttempt.broadcast.provider_submission_id || "canonical-broadcast-projection";
      const advanced = await appendBroadcastAcceptedSagaProjection({
        saga: sagaResult.saga,
        store: sagaResult.store,
        record: sagaResult.record,
        policy: input.policy,
        attempt_id: attemptId,
        transaction_hash: input.preparation.signed_transaction_hash,
        provider_submission_id: providerId,
        now_ms: safeNow(input.dependencies.now_ms?.()),
      });
      if (!advanced || advanced.ok !== true) {
        return held("reconcile", true, "erc20_broadcast_saga_projection_repair_failed", {
          attempt_id: attemptId,
          saga_id: sagaResult.saga_id,
          mutation_performed: true,
          reconciliation_required: true,
        });
      }
    }
    return held("reconcile", input.apply, receipt.reason, {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      mutation_performed: Boolean(currentAttempt.broadcast && state !== "broadcast_accepted" && input.apply),
      reconciliation_required: true,
      detail: receipt.detail,
    });
  }

  let observedConfirmations: bigint;
  try {
    observedConfirmations = BigInt(
      receipt.observed_confirmation_count,
    );
  } catch {
    return held(
      "reconcile",
      input.apply,
      "erc20_receipt_confirmation_count_invalid",
      {
        attempt_id: attemptId,
        saga_id: sagaResult.saga_id,
        mutation_performed:
          canonicalBroadcastProjectionMutated,
        reconciliation_required: true,
      },
    );
  }
  if (
    observedConfirmations < 1n ||
    observedConfirmations > MAX_SAGA_CONFIRMATIONS
  ) {
    return held(
      "reconcile",
      input.apply,
      "erc20_receipt_confirmation_count_out_of_saga_range",
      {
        attempt_id: attemptId,
        saga_id: sagaResult.saga_id,
        mutation_performed:
          canonicalBroadcastProjectionMutated,
        reconciliation_required: true,
        detail: {
          observed_confirmation_count:
            receipt.observed_confirmation_count,
          maximum_saga_confirmations:
            MAX_SAGA_CONFIRMATIONS.toString(),
          canonical_record_confirmed_performed: false,
          saga_receipt_confirmed_performed: false,
        },
      },
    );
  }
  const observedConfirmationsNumber =
    Number(observedConfirmations);

  if (!input.apply) {
    return {
      ok: true,
      status: "dry_run",
      stage: "reconcile",
      applied: false,
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      next_stage: "reconcile",
      required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
      preparation: input.preparation,
      receipt_evidence: receipt as unknown as Record<string, unknown>,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: true,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  sagaResult = {
    ...sagaResult,
    record: sagaResult.store.recover(sagaResult.saga_id),
  };
  state = text(sagaResult.record.state?.state);
  if (state !== "broadcast_accepted") {
    const advanced = await appendBroadcastAcceptedSagaProjection({
      saga: sagaResult.saga,
      store: sagaResult.store,
      record: sagaResult.record,
      policy: input.policy,
      attempt_id: attemptId,
      transaction_hash: receipt.transaction_hash,
      provider_submission_id:
        currentAttempt.broadcast.provider_submission_id || "canonical-broadcast-projection",
      now_ms: safeNow(input.dependencies.now_ms?.()),
    });
    if (!advanced || advanced.ok !== true || advanced.status !== "applied") {
      throw new Error("erc20_broadcast_saga_projection_repair_failed");
    }
    sagaResult = {
      ...sagaResult,
      record: sagaResult.store.recover(sagaResult.saga_id),
    };
  }

  const currentBlock = (
    BigInt(receipt.receipt_block_number) +
    BigInt(receipt.observed_confirmation_count) -
    1n
  ).toString();
  const confirmed = runBuyVoidPipelineCommandV1({
    action: "record_confirmed",
    root_dir: input.root_dir,
    attempt_id: attemptId,
    intent,
    observation: {
      chain_id: "2050",
      transaction_hash: receipt.transaction_hash,
      transaction_status: "1",
      block_number: receipt.receipt_block_number,
      block_hash: receipt.receipt_block_hash,
      current_block_number: currentBlock,
      from_address: receipt.fulfillment_wallet,
      to_address: receipt.delivery_address,
      amount_units: receipt.void_amount_units,
    },
    confirmation_policy: {
      chain_id: "2050",
      min_confirmations: input.policy.receipt_policy.min_confirmations,
      fulfillment_wallet_allowlist:
        input.policy.receipt_policy.fulfillment_wallet_allowlist,
    },
    apply: true,
    confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.record_confirmed,
    now_ms: safeNow(input.dependencies.now_ms?.()),
  });
  pipelineApplied(confirmed, "erc20_record_confirmed_projection_held");

  const nowMs = safeNow(input.dependencies.now_ms?.());
  const sagaAdvance = await sagaResult.saga.runSagaSupervisorTickV1({
    store: sagaResult.store,
    binding: sagaResult.record.binding,
    owner_id: sagaOwner(),
    now_ms: nowMs,
    lease_ttl_ms: LEASE_TTL_MS,
    recorded_at_utc: new Date(nowMs).toISOString(),
    source_floor_main: SOURCE_FLOOR_MAIN,
    policy_id: input.policy.saga_policy.saga_policy_id,
    apply: true,
    confirmation: sagaResult.saga.ADVANCE_CONFIRMATION,
    action_confirmation:
      sagaResult.saga.ACTION_CONFIRMATIONS.reconcile_possible_broadcast,
    adapters: {
      reconcile_possible_broadcast: async () => ({
        outcome: "receipt_confirmed",
        payload: {
          attempt_id: attemptId,
          transaction_hash: receipt.transaction_hash,
          block_number: receipt.receipt_block_number,
          block_hash: receipt.receipt_block_hash,
          confirmations: observedConfirmationsNumber,
          receipt_status: 1,
        },
      }),
    },
  });
  if (!sagaAdvance || sagaAdvance.ok !== true || sagaAdvance.status !== "applied") {
    return held("saga", true, "erc20_receipt_confirmed_saga_append_failed", {
      attempt_id: attemptId,
      saga_id: sagaResult.saga_id,
      mutation_performed: true,
      reconciliation_required: true,
    });
  }
  return {
    ok: true,
    status: "reconciled_confirmed",
    stage: "reconcile",
    applied: true,
    attempt_id: attemptId,
    saga_id: sagaResult.saga_id,
    next_stage: "terminal_closeout",
    required_confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
    preparation: input.preparation,
    receipt_evidence: receipt as unknown as Record<string, unknown>,
    mutation_performed: true,
    signing_performed: false,
    transaction_broadcast_performed: false,
    reconciliation_required: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}

export async function runBuyVoidErc20ExecutionCompositionV1(input: {
  root_dir: string;
  attempt_id: string;
  apply?: boolean;
  confirmation?: unknown;
  policy: BuyVoidErc20ExecutionCompositionPolicyV1;
  dependencies?: BuyVoidErc20ExecutionCompositionDependenciesV1;
}): Promise<BuyVoidErc20ExecutionCompositionDecisionV1> {
  let rootDir: string;
  try {
    rootDir = safeRoot(input?.root_dir);
  } catch (error) {
    return held("input", input?.apply === true, text((error as Error)?.message || error));
  }
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return held("input", input?.apply === true, "erc20_execution_attempt_id_invalid");
  }
  if (!input?.policy) {
    return held("policy", input?.apply === true, "erc20_execution_policy_required", {
      attempt_id: attemptId,
    });
  }
  if (
    input.apply === true &&
    text(input.confirmation) !==
      VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1
  ) {
    return held("input", true, "erc20_execution_explicit_confirmation_required", {
      attempt_id: attemptId,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
      },
    });
  }
  const dependencies = input.dependencies || {};
  const attempt = readBuyVoidExecutionAttemptV1({ root_dir: rootDir, attempt_id: attemptId });
  if (!attempt) {
    return held("input", input.apply === true, "erc20_execution_attempt_not_found", {
      attempt_id: attemptId,
    });
  }
  const preparation = readBuyVoidErc20PreparationCustodyV1({
    root_dir: rootDir,
    attempt_id: attemptId,
  });

  try {
    if (attempt.status === "reserved" || (!attempt.prepared && preparation)) {
      return await prepareStage({
        root_dir: rootDir,
        attempt,
        apply: input.apply === true,
        policy: input.policy,
        dependencies,
      });
    }
    if (!preparation) {
      return held("prepare", input.apply === true, "erc20_preparation_custody_missing", {
        attempt_id: attemptId,
        reconciliation_required: true,
      });
    }
    exactPreparationBinding(attempt, preparation);
    if (attempt.status === "prepared") {
      const intent = findIntent(rootDir, attempt);
      const inventory = findInventory(rootDir, intent, input.policy.saga_policy);
      const saga = await reconcileSagaToPrepared({
        root_dir: rootDir,
        attempt,
        intent,
        inventory,
        preparation,
        policy: input.policy,
        dependencies,
      });
      const state = text(saga.record.state?.state);
      if (["broadcast_intent_committed", "broadcast_unknown", "broadcast_accepted"].includes(state)) {
        return await reconcileStage({
          root_dir: rootDir,
          attempt,
          preparation,
          apply: input.apply === true,
          policy: input.policy,
          dependencies,
        });
      }
      return await broadcastStage({
        root_dir: rootDir,
        attempt,
        preparation,
        apply: input.apply === true,
        policy: input.policy,
        dependencies,
      });
    }
    if (attempt.status === "broadcast" || attempt.status === "confirmed") {
      return await reconcileStage({
        root_dir: rootDir,
        attempt,
        preparation,
        apply: input.apply === true,
        policy: input.policy,
        dependencies,
      });
    }
    return held("input", input.apply === true, "erc20_execution_attempt_state_not_supported", {
      attempt_id: attemptId,
      reconciliation_required: true,
      detail: { attempt_status: attempt.status },
    });
  } catch (error) {
    return held("input", input.apply === true, text((error as Error)?.message || error).slice(0, 240), {
      attempt_id: attemptId,
      reconciliation_required: true,
    });
  }
}

export function listBuyVoidErc20PreparationCustodiesV1(rootDir: string):
  BuyVoidErc20PreparationCustodyV1[] {
  const directory = path.join(safeRoot(rootDir), COMPOSITION_ROOT, "preparations");
  const results: BuyVoidErc20PreparationCustodyV1[] = [];
  try {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || entry.isSymbolicLink() || !/^[0-9a-f]{64}\.json$/.test(entry.name)) {
        throw new Error("erc20_preparation_directory_entry_invalid");
      }
      const value = readJson(path.join(directory, entry.name), "erc20_preparation_custody");
      if (!value) continue;
      results.push(validatePreparationRecord(value));
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw error;
  }
  return results.sort((a, b) => a.attempt_id.localeCompare(b.attempt_id));
}

// Keep this source import live as a compile-time guard: the composition is intentionally
// anchored to the canonical execution-attempt journal rather than a parallel attempt store.
