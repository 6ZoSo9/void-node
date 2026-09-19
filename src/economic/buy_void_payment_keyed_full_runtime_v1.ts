import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import { getAddress } from "ethers";

import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedPreparationCoordinatorV1,
} from "./buy_void_payment_keyed_preparation_coordinator_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
} from "./buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedGuardedBroadcastV1,
} from "./buy_void_payment_keyed_guarded_broadcast_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedBroadcastReconciliationV1,
} from "./buy_void_payment_keyed_broadcast_reconciliation_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedReceiptReconciliationV1,
} from "./buy_void_payment_keyed_receipt_reconciliation_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  runBuyVoidPaymentKeyedTerminalCloseoutV1,
} from "./buy_void_payment_keyed_terminal_closeout_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
} from "./buy_void_payment_keyed_custodian_signer_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
} from "./buy_void_payment_keyed_custodian_broadcast_v1.js";
import {
  buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1,
  type BuyVoidPaymentKeyedRuntimeServerPolicyV1,
} from "./buy_void_payment_keyed_runtime_preflight_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
  type BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1,
} from "./buy_void_payment_keyed_fulfillment_receipt_v1.js";
import {
  createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1,
  type BuyVoidPaymentKeyedRuntimeDependenciesV1,
} from "./buy_void_payment_keyed_runtime_dependency_bootstrap_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1 =
  "run_payment_keyed_fulfillment";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1 =
  "buyVoidAdvancePaymentKeyedFulfillmentRuntimeV1";

export const VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ROUTES_V1 = {
  status:
    "/__void/operator/buy-void-payment-keyed-full-runtime-v1/status",
  command:
    "/__void/operator/buy-void-payment-keyed-full-runtime-v1/command",
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  apply_disabled_by_default: true,
  exact_outer_confirmation_required_for_apply: true,
  exactly_one_stage_per_explicit_command: true,
  stage_is_server_derived_from_durable_state: true,
  caller_stage_forbidden: true,
  caller_policy_forbidden: true,
  caller_rpc_url_forbidden: true,
  caller_signer_forbidden: true,
  caller_transaction_material_forbidden: true,
  server_controlled_root_dir: true,
  server_controlled_runtime_policy: true,
  server_controlled_receipt_policy: true,
  canonical_parent_dispatch: true,
  preparation_coordinator_reused: true,
  guarded_broadcast_reused: true,
  broadcast_reconciliation_reused: true,
  receipt_reconciliation_reused: true,
  payment_keyed_terminal_closeout_reused: true,
  command_scoped_dependency_bootstrap: true,
  credential_read_deferred_until_signing: true,
  dry_command_never_bootstraps_signing_dependencies: true,
  reconciliation_never_requires_signing_dependencies: true,
  receipt_reconciliation_never_requires_signing_dependencies: true,
  terminal_closeout_never_requires_signing_dependencies: true,
  automatic_retry: false,
  background_loop: false,
  startup_execution: false,
  service_restart: false,
  runtime_route_mount: true,
  signing_possible_only_on_explicit_preparation_or_broadcast_apply: true,
  transaction_broadcast_possible_only_on_explicit_guarded_broadcast_apply: true,
  inventory_public_closeout_possible_only_on_explicit_terminal_apply: true,
  money_movement_possible_only_when_explicit_guarded_broadcast_is_accepted: true,
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1 = {
  enabled:
    "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
  apply_enabled:
    "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
  root_dir:
    "VOID_BUY_VOID_RUNTIME_DIR",
  rpc_url:
    "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL",
  fulfillment_contract_address:
    "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS",
  gas_limit_multiplier_bps:
    "VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS",
  max_gas_limit:
    "VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT",
  fee_multiplier_bps:
    "VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS",
  max_fee_per_gas_wei:
    "VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI",
  max_priority_fee_per_gas_wei:
    "VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI",
  request_timeout_ms:
    "VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS",
  max_response_bytes:
    "VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES",
  void_token_address:
    "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  receipt_min_confirmations:
    "VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS",
  credentials_directory:
    "CREDENTIALS_DIRECTORY",
  credential_binding_evidence_id:
    "VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID",
} as const;

export type BuyVoidPaymentKeyedFullRuntimeStageV1 =
  | "preparation"
  | "preparation_recovery"
  | "guarded_broadcast"
  | "broadcast_reconciliation"
  | "receipt_reconciliation"
  | "terminal_closeout"
  | "complete"
  | "terminal_reverted";

export type BuyVoidPaymentKeyedFullRuntimePolicyStateV1 =
  | {
      configured: true;
      root_dir: string;
      server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
      receipt_policy: BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1;
      full_runtime_policy_fingerprint_sha256: string;
      runtime_policy_fingerprint_sha256: string;
      preparation_policy_fingerprint_sha256: string;
      receipt_policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      fulfillment_wallet_address: string;
      fulfillment_contract_address: string;
      void_token_address: string;
      max_token_amount_atoms: string;
    }
  | {
      configured: false;
      reason: string;
      missing_envs: string[];
      invalid_envs: string[];
    };

type SagaModuleV1 = {
  ADVANCE_CONFIRMATION: string;
  ACTION_CONFIRMATIONS: Record<string, string>;
  validateSagaBindingV1: (
    value: Record<string, unknown>,
  ) => Record<string, any>;
  computeSagaIdV1: (value: Record<string, unknown>) => string;
  createFilesystemSagaStoreV1: (rootDir: string) => {
    recover: (sagaId: string) => any | null;
  };
};

type StageSelectionV1 = {
  stage: BuyVoidPaymentKeyedFullRuntimeStageV1;
  attempt: BuyVoidExecutionAttemptStateV1;
  saga_id: string | null;
  saga_state: string | null;
  saga_module: SagaModuleV1 | null;
};

export type BuyVoidPaymentKeyedFullRuntimeOptionsV1 = {
  env?: NodeJS.ProcessEnv;
  read_attempt?: typeof readBuyVoidExecutionAttemptV1;
  list_intents?: typeof listBuyVoidFulfillmentJournalClaimsV1;
  load_saga_module?: () => Promise<SagaModuleV1>;
  policy_state?: () => BuyVoidPaymentKeyedFullRuntimePolicyStateV1;
  dependency_bootstrap?:
    typeof createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1;
  run_preparation?:
    typeof runBuyVoidPaymentKeyedPreparationCoordinatorV1;
  run_guarded_broadcast?:
    typeof runBuyVoidPaymentKeyedGuardedBroadcastV1;
  run_broadcast_reconciliation?:
    typeof runBuyVoidPaymentKeyedBroadcastReconciliationV1;
  run_receipt_reconciliation?:
    typeof runBuyVoidPaymentKeyedReceiptReconciliationV1;
  run_terminal_closeout?:
    typeof runBuyVoidPaymentKeyedTerminalCloseoutV1;
};

const GLOBAL_MARK =
  "__void_buy_void_payment_keyed_full_runtime_v1_mounted";
const JSON_LIMIT = "16kb";
const SHA256 = /^[0-9a-f]{64}$/;
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const TOKEN_ATOM_MULTIPLIER = 1_000_000_000_000n;
const UINT256_MAX = (1n << 256n) - 1n;
const SAGA_ROOT =
  "buy-void-crash-consistent-saga-runtime-v1";

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function address(value: unknown): string {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function enabled(
  env: NodeJS.ProcessEnv,
): boolean {
  return text(
    env[
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled
    ],
  ) === "1";
}

function applyEnabled(
  env: NodeJS.ProcessEnv,
): boolean {
  return text(
    env[
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
        .apply_enabled
    ],
  ) === "1";
}

function dataDir(env: NodeJS.ProcessEnv): string {
  const raw = text(
    env.VOID_DATA_DIR || env.DATA_DIR || "data_a",
  );
  return path.isAbsolute(raw)
    ? path.normalize(raw)
    : path.resolve(process.cwd(), raw);
}

export function buyVoidPaymentKeyedFullRuntimeRootDirV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = text(
    env[
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.root_dir
    ],
  );
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.resolve(process.cwd(), configured);
  }
  return path.join(
    dataDir(env),
    "buy_void_v1",
    "runtime-integration-v1",
  );
}

export function buyVoidPaymentKeyedFullRuntimePolicyStateV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidPaymentKeyedFullRuntimePolicyStateV1 {
  const saga = readBuyVoidCanonicalPresaleServerPolicyV1(env);
  if (saga.ok === false) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_saga_policy_held:" +
        saga.reason,
      missing_envs: [...saga.missing_envs].sort(),
      invalid_envs: [],
    };
  }

  const names =
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
  const required = [
    names.rpc_url,
    names.fulfillment_contract_address,
    names.gas_limit_multiplier_bps,
    names.max_gas_limit,
    names.fee_multiplier_bps,
    names.max_fee_per_gas_wei,
    names.max_priority_fee_per_gas_wei,
    names.void_token_address,
    names.receipt_min_confirmations,
  ];
  const missing = required.filter(
    (name) => !text(env[name]),
  );
  if (missing.length) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_policy_not_configured",
      missing_envs: missing.sort(),
      invalid_envs: [],
    };
  }

  const wallets =
    saga.policy.execution_policy.fulfillment_wallet_allowlist
      .map((value) => address(value))
      .filter(Boolean);
  if (wallets.length !== 1) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_wallet_policy_invalid",
      missing_envs: [],
      invalid_envs: [],
    };
  }
  const wallet = wallets[0];
  const evidenceWallet = address(
    VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
      .derived_wallet_address,
  );
  if (!evidenceWallet || wallet !== evidenceWallet) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_wallet_evidence_mismatch",
      missing_envs: [],
      invalid_envs: [],
    };
  }

  const contract = address(
    env[names.fulfillment_contract_address],
  );
  const token = address(env[names.void_token_address]);
  if (
    !contract ||
    !token ||
    contract === wallet ||
    token === wallet ||
    token === contract
  ) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_contract_token_policy_invalid",
      missing_envs: [],
      invalid_envs: [
        names.fulfillment_contract_address,
        names.void_token_address,
      ],
    };
  }

  const maximum = text(
    saga.policy.inventory_policy
      .max_reservation_void_units,
  );
  let maxAtoms: bigint;
  try {
    maxAtoms = BigInt(maximum) *
      TOKEN_ATOM_MULTIPLIER;
  } catch {
    maxAtoms = 0n;
  }
  if (maxAtoms <= 0n || maxAtoms > UINT256_MAX) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_max_amount_invalid",
      missing_envs: [],
      invalid_envs: [],
    };
  }

  const timeout = text(env[names.request_timeout_ms]);
  const maxResponse = text(env[names.max_response_bytes]);
  const preparationPolicy:
    BuyVoidPaymentKeyedTransactionPreparationPolicyV1 = {
      enabled: true,
      chain_id: "2050",
      rpc_url: text(env[names.rpc_url]),
      fulfillment_wallet_address: wallet,
      fulfillment_contract_address: contract,
      max_void_amount_units: maximum,
      gas_limit_multiplier_bps:
        text(env[names.gas_limit_multiplier_bps]),
      max_gas_limit:
        text(env[names.max_gas_limit]),
      fee_multiplier_bps:
        text(env[names.fee_multiplier_bps]),
      max_fee_per_gas_wei:
        text(env[names.max_fee_per_gas_wei]),
      max_priority_fee_per_gas_wei:
        text(env[names.max_priority_fee_per_gas_wei]),
      ...(timeout
        ? { request_timeout_ms: timeout }
        : {}),
      ...(maxResponse
        ? { max_response_bytes: maxResponse }
        : {}),
    };
  const preparation =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
      preparationPolicy,
    );
  if (preparation.ok === false) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_preparation_policy_held:" +
        preparation.reason,
      missing_envs: [],
      invalid_envs: [],
    };
  }

  const serverPolicy:
    BuyVoidPaymentKeyedRuntimeServerPolicyV1 = {
      preparation_policy: preparationPolicy,
      fulfillment_contract_address: contract,
      max_void_amount_units: maximum,
      saga_policy: saga.policy,
    };
  const runtime =
    buyVoidPaymentKeyedRuntimeServerPolicyFingerprintV1(
      serverPolicy,
    );
  if (runtime.ok === false) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_server_policy_held:" +
        runtime.reason,
      missing_envs: [],
      invalid_envs: [],
    };
  }

  const receiptPolicy:
    BuyVoidPaymentKeyedFulfillmentReceiptPolicyV1 = {
      enabled: true,
      chain_id: "2050",
      rpc_url: preparationPolicy.rpc_url,
      fulfillment_wallet_address: wallet,
      fulfillment_contract_address: contract,
      void_token_address: token,
      min_confirmations:
        text(env[names.receipt_min_confirmations]),
      ...(timeout
        ? { request_timeout_ms: timeout }
        : {}),
      ...(maxResponse
        ? { max_response_bytes: maxResponse }
        : {}),
    };
  const receipt =
    validateBuyVoidPaymentKeyedFulfillmentReceiptPolicyV1(
      receiptPolicy,
    );
  if (receipt.ok === false) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_receipt_policy_held:" +
        receipt.reason,
      missing_envs: [],
      invalid_envs: [],
    };
  }
  if (
    receipt.rpc_url_fingerprint_sha256 !==
      preparation.rpc_url_fingerprint_sha256
  ) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_rpc_policy_mismatch",
      missing_envs: [],
      invalid_envs: [],
    };
  }

  const rootDir =
    buyVoidPaymentKeyedFullRuntimeRootDirV1(env);
  if (
    !path.isAbsolute(rootDir) ||
    rootDir === path.parse(rootDir).root ||
    rootDir.includes("\0")
  ) {
    return {
      configured: false,
      reason:
        "payment_keyed_full_runtime_root_invalid",
      missing_envs: [],
      invalid_envs: [names.root_dir],
    };
  }

  const fullFingerprint = sha256(
    [
      "marker=" +
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      "version=1",
      "root_dir_sha256=" + sha256(rootDir),
      "runtime_policy_fingerprint_sha256=" +
        runtime.fingerprint,
      "preparation_policy_fingerprint_sha256=" +
        preparation.policy_fingerprint_sha256,
      "receipt_policy_fingerprint_sha256=" +
        receipt.policy_fingerprint_sha256,
      "credential_binding_evidence_id=" +
        VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
      "void_token_address=" + token,
      "max_token_amount_atoms=" +
        maxAtoms.toString(),
    ].join("\n"),
  );

  return {
    configured: true,
    root_dir: rootDir,
    server_policy: serverPolicy,
    receipt_policy: receiptPolicy,
    full_runtime_policy_fingerprint_sha256:
      fullFingerprint,
    runtime_policy_fingerprint_sha256:
      runtime.fingerprint,
    preparation_policy_fingerprint_sha256:
      preparation.policy_fingerprint_sha256,
    receipt_policy_fingerprint_sha256:
      receipt.policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      preparation.rpc_url_fingerprint_sha256,
    fulfillment_wallet_address: wallet,
    fulfillment_contract_address: contract,
    void_token_address: token,
    max_token_amount_atoms: maxAtoms.toString(),
  };
}

function sagaBinding(
  intent: BuyVoidFulfillmentJournalIntentV1,
  poolId: string,
): Record<string, unknown> {
  return {
    request_id: intent.claim.request_id,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    request_key_sha256: intent.request_key_sha256,
    payment_key_sha256: intent.payment_key_sha256,
    delivery_address:
      text(
        intent.claim.unsigned_instruction
          .delivery_address,
      ).toLowerCase(),
    void_amount_units:
      text(
        intent.claim.unsigned_instruction
          .void_amount_units,
      ),
    chain_id: "2050",
    pool_id: poolId,
  };
}

function exactIntent(
  values: BuyVoidFulfillmentJournalIntentV1[],
  attempt: BuyVoidExecutionAttemptStateV1,
): BuyVoidFulfillmentJournalIntentV1 {
  const reservation = attempt.reservation;
  const matches = values.filter(
    (value) =>
      value.claim?.request_id ===
        reservation.request_id &&
      value.claim?.canonical_payment_identity ===
        reservation.canonical_payment_identity &&
      value.claim?.instruction_id ===
        reservation.instruction_id &&
      value.request_key_sha256 ===
        reservation.request_key_sha256 &&
      value.payment_key_sha256 ===
        reservation.payment_key_sha256,
  );
  if (matches.length !== 1) {
    throw new Error(
      "payment_keyed_full_runtime_intent_count_invalid:" +
        String(matches.length),
    );
  }
  return matches[0];
}

async function defaultSagaModule(): Promise<SagaModuleV1> {
  return await import(
    new URL(
      "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  ) as unknown as SagaModuleV1;
}

async function selectStage(
  attemptId: string,
  policy: Extract<
    BuyVoidPaymentKeyedFullRuntimePolicyStateV1,
    { configured: true }
  >,
  options: BuyVoidPaymentKeyedFullRuntimeOptionsV1,
): Promise<StageSelectionV1> {
  const readAttempt =
    options.read_attempt ||
    readBuyVoidExecutionAttemptV1;
  const attempt = readAttempt({
    root_dir: policy.root_dir,
    attempt_id: attemptId,
  });
  if (!attempt) {
    throw new Error(
      "payment_keyed_full_runtime_attempt_not_found",
    );
  }

  if (attempt.status === "reserved") {
    return {
      stage: "preparation",
      attempt,
      saga_id: null,
      saga_state: null,
      saga_module: null,
    };
  }

  const listIntents =
    options.list_intents ||
    listBuyVoidFulfillmentJournalClaimsV1;
  const intent = exactIntent(
    listIntents(policy.root_dir),
    attempt,
  );
  const saga =
    await (
      options.load_saga_module ||
      defaultSagaModule
    )();
  const binding = saga.validateSagaBindingV1(
    sagaBinding(
      intent,
      policy.server_policy.saga_policy
        .inventory_policy.pool_id,
    ),
  );
  const sagaId =
    text(saga.computeSagaIdV1(binding)).toLowerCase();
  if (!SAGA_ID.test(sagaId)) {
    throw new Error(
      "payment_keyed_full_runtime_saga_id_invalid",
    );
  }
  const store = saga.createFilesystemSagaStoreV1(
    path.join(policy.root_dir, SAGA_ROOT),
  );
  const record = store.recover(sagaId);
  if (!record) {
    throw new Error(
      "payment_keyed_full_runtime_saga_missing",
    );
  }
  const sagaState = text(record.state?.state);

  if (
    attempt.status === "prepared" &&
    sagaState === "attempt_reserved"
  ) {
    return {
      stage: "preparation_recovery",
      attempt,
      saga_id: sagaId,
      saga_state: sagaState,
      saga_module: saga,
    };
  }
  if (
    attempt.status === "prepared" &&
    (
      sagaState === "transaction_prepared" ||
      sagaState === "broadcast_not_attempted"
    )
  ) {
    return {
      stage: "guarded_broadcast",
      attempt,
      saga_id: sagaId,
      saga_state: sagaState,
      saga_module: saga,
    };
  }
  if (
    sagaState === "broadcast_intent_committed" ||
    sagaState === "broadcast_unknown" ||
    (
      sagaState === "broadcast_accepted" &&
      attempt.status !== "broadcast" &&
      attempt.status !== "confirmed" &&
      attempt.status !== "failed_retryable"
    )
  ) {
    return {
      stage: "broadcast_reconciliation",
      attempt,
      saga_id: sagaId,
      saga_state: sagaState,
      saga_module: saga,
    };
  }
  if (
    sagaState === "broadcast_accepted" &&
    (
      attempt.status === "broadcast" ||
      attempt.status === "confirmed" ||
      attempt.status === "failed_retryable"
    )
  ) {
    return {
      stage: "receipt_reconciliation",
      attempt,
      saga_id: sagaId,
      saga_state: sagaState,
      saga_module: saga,
    };
  }
  if (sagaState === "receipt_confirmed") {
    return {
      stage: "terminal_closeout",
      attempt,
      saga_id: sagaId,
      saga_state: sagaState,
      saga_module: saga,
    };
  }
  if (sagaState === "receipt_reverted") {
    return {
      stage: "terminal_reverted",
      attempt,
      saga_id: sagaId,
      saga_state: sagaState,
      saga_module: saga,
    };
  }
  if (sagaState === "closed") {
    return {
      stage: "complete",
      attempt,
      saga_id: sagaId,
      saga_state: sagaState,
      saga_module: saga,
    };
  }

  throw new Error(
    "payment_keyed_full_runtime_state_unhandled:" +
      attempt.status +
      ":" +
      sagaState,
  );
}

function preparationRecoveryPreview(
  selection: StageSelectionV1,
  policy: Extract<
    BuyVoidPaymentKeyedFullRuntimePolicyStateV1,
    { configured: true }
  >,
): Record<string, unknown> {
  const saga = selection.saga_module;
  if (!saga || !selection.saga_id) {
    throw new Error(
      "payment_keyed_full_runtime_preparation_recovery_saga_missing",
    );
  }
  return {
    ok: true,
    status: "dry_run_recovery",
    attempt_id:
      selection.attempt.reservation.attempt_id,
    saga_id: selection.saga_id,
    required_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_CONFIRMATION_V1,
    required_runtime_policy_fingerprint_sha256:
      policy.runtime_policy_fingerprint_sha256,
    required_preparation_policy_fingerprint_sha256:
      policy.preparation_policy_fingerprint_sha256,
    required_saga_confirmation:
      saga.ADVANCE_CONFIRMATION,
    required_saga_action_confirmation:
      saga.ACTION_CONFIRMATIONS.prepare_transaction,
    required_custody_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_CONFIRMATION_V1,
    required_pipeline_confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
    signer_required: false,
    rpc_required: false,
  };
}

async function previewStage(
  selection: StageSelectionV1,
  policy: Extract<
    BuyVoidPaymentKeyedFullRuntimePolicyStateV1,
    { configured: true }
  >,
  env: NodeJS.ProcessEnv,
  options: BuyVoidPaymentKeyedFullRuntimeOptionsV1,
): Promise<any> {
  const attemptId =
    selection.attempt.reservation.attempt_id;
  if (selection.stage === "preparation") {
    return await (
      options.run_preparation ||
      runBuyVoidPaymentKeyedPreparationCoordinatorV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      env,
      apply: false,
    });
  }
  if (selection.stage === "preparation_recovery") {
    return preparationRecoveryPreview(
      selection,
      policy,
    );
  }
  if (selection.stage === "guarded_broadcast") {
    return await (
      options.run_guarded_broadcast ||
      runBuyVoidPaymentKeyedGuardedBroadcastV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      apply: false,
    });
  }
  if (selection.stage === "broadcast_reconciliation") {
    return await (
      options.run_broadcast_reconciliation ||
      runBuyVoidPaymentKeyedBroadcastReconciliationV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      apply: false,
    });
  }
  if (selection.stage === "receipt_reconciliation") {
    return await (
      options.run_receipt_reconciliation ||
      runBuyVoidPaymentKeyedReceiptReconciliationV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      receipt_policy: policy.receipt_policy,
      apply: false,
    });
  }
  if (selection.stage === "terminal_closeout") {
    if (!selection.saga_id) {
      throw new Error(
        "payment_keyed_full_runtime_terminal_saga_missing",
      );
    }
    return await (
      options.run_terminal_closeout ||
      runBuyVoidPaymentKeyedTerminalCloseoutV1
    )({
      root_dir: policy.root_dir,
      saga_id: selection.saga_id,
      apply: false,
    });
  }
  return {
    ok: true,
    status: selection.stage,
    applied: false,
    attempt_id: attemptId,
    saga_id: selection.saga_id,
    saga_state: selection.saga_state,
    terminal: true,
    mutation_performed: false,
  };
}

function bootstrapDependencies(
  policy: Extract<
    BuyVoidPaymentKeyedFullRuntimePolicyStateV1,
    { configured: true }
  >,
  env: NodeJS.ProcessEnv,
  options: BuyVoidPaymentKeyedFullRuntimeOptionsV1,
):
  | {
      ok: true;
      dependencies:
        BuyVoidPaymentKeyedRuntimeDependenciesV1;
    }
  | {
      ok: false;
      reason: string;
    } {
  const names =
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
  const credentials = text(
    env[names.credentials_directory],
  );
  const evidenceId = text(
    env[names.credential_binding_evidence_id],
  );
  if (!credentials || !evidenceId) {
    return {
      ok: false,
      reason:
        "payment_keyed_full_runtime_signing_dependencies_not_configured",
    };
  }
  const bootstrap =
    (
      options.dependency_bootstrap ||
      createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1
    )({
      enabled: true,
      credential_binding_evidence_id: evidenceId,
      credentials_directory: credentials,
      fulfillment_wallet_address:
        policy.fulfillment_wallet_address,
      fulfillment_contract_address:
        policy.fulfillment_contract_address,
      max_token_amount_atoms:
        policy.max_token_amount_atoms,
      submission_guard_root_dir:
        policy.root_dir,
      rpc_url:
        policy.server_policy.preparation_policy
          .rpc_url,
      request_timeout_ms:
        policy.server_policy.preparation_policy
          .request_timeout_ms,
      max_response_bytes:
        policy.server_policy.preparation_policy
          .max_response_bytes,
    });
  if (bootstrap.ok === false) {
    return {
      ok: false,
      reason:
        "payment_keyed_full_runtime_dependency_bootstrap_held:" +
        bootstrap.reason,
    };
  }
  return {
    ok: true,
    dependencies: bootstrap.dependencies,
  };
}

async function applyStage(
  selection: StageSelectionV1,
  preview: any,
  policy: Extract<
    BuyVoidPaymentKeyedFullRuntimePolicyStateV1,
    { configured: true }
  >,
  env: NodeJS.ProcessEnv,
  options: BuyVoidPaymentKeyedFullRuntimeOptionsV1,
): Promise<any> {
  const attemptId =
    selection.attempt.reservation.attempt_id;

  if (
    selection.stage === "complete" ||
    selection.stage === "terminal_reverted"
  ) {
    return {
      ok: true,
      status: selection.stage,
      applied: true,
      mutation_performed: false,
      attempt_id: attemptId,
      saga_id: selection.saga_id,
      saga_state: selection.saga_state,
      automatic_retry_allowed: false,
    };
  }

  if (
    selection.stage === "preparation" ||
    selection.stage === "preparation_recovery"
  ) {
    let dependencies:
      | BuyVoidPaymentKeyedRuntimeDependenciesV1
      | undefined;
    if (selection.stage === "preparation") {
      const bootstrap = bootstrapDependencies(
        policy,
        env,
        options,
      );
      if (bootstrap.ok === false) {
        return {
          ok: false,
          status: "held",
          reason: bootstrap.reason,
          mutation_performed: false,
        };
      }
      dependencies = bootstrap.dependencies;
    }
    return await (
      options.run_preparation ||
      runBuyVoidPaymentKeyedPreparationCoordinatorV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      env,
      apply: true,
      confirmation:
        preview.required_confirmation,
      runtime_policy_fingerprint_sha256:
        preview.required_runtime_policy_fingerprint_sha256,
      preparation_policy_fingerprint_sha256:
        preview.required_preparation_policy_fingerprint_sha256,
      saga_confirmation:
        preview.required_saga_confirmation,
      saga_action_confirmation:
        preview.required_saga_action_confirmation,
      custody_confirmation:
        preview.required_custody_confirmation,
      pipeline_confirmation:
        preview.required_pipeline_confirmation,
      ...(dependencies
        ? {
            dependencies: {
              signer: dependencies.signer,
            },
          }
        : {}),
    });
  }

  if (selection.stage === "guarded_broadcast") {
    const bootstrap = bootstrapDependencies(
      policy,
      env,
      options,
    );
    if (bootstrap.ok === false) {
      return {
        ok: false,
        status: "held",
        reason: bootstrap.reason,
        mutation_performed: false,
      };
    }
    return await (
      options.run_guarded_broadcast ||
      runBuyVoidPaymentKeyedGuardedBroadcastV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      apply: true,
      confirmation:
        preview.required_confirmation ||
        VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_CONFIRMATION_V1,
      runtime_policy_fingerprint_sha256:
        preview.required_runtime_policy_fingerprint_sha256,
      preparation_policy_fingerprint_sha256:
        preview.required_preparation_policy_fingerprint_sha256,
      saga_confirmation:
        preview.required_saga_confirmation,
      saga_action_confirmation:
        preview.required_saga_action_confirmation,
      signer_confirmation:
        preview.required_signer_confirmation ||
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
      broadcast_confirmation:
        preview.required_broadcast_confirmation ||
        VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1,
      dependencies: bootstrap.dependencies,
    });
  }

  if (
    selection.stage === "broadcast_reconciliation"
  ) {
    return await (
      options.run_broadcast_reconciliation ||
      runBuyVoidPaymentKeyedBroadcastReconciliationV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      apply: true,
      confirmation:
        preview.required_confirmation ||
        VOID_BUY_VOID_PAYMENT_KEYED_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
      runtime_policy_fingerprint_sha256:
        preview.required_runtime_policy_fingerprint_sha256,
      preparation_policy_fingerprint_sha256:
        preview.required_preparation_policy_fingerprint_sha256,
      saga_confirmation:
        preview.required_saga_confirmation,
      saga_action_confirmation:
        preview.required_saga_action_confirmation,
    });
  }

  if (selection.stage === "receipt_reconciliation") {
    return await (
      options.run_receipt_reconciliation ||
      runBuyVoidPaymentKeyedReceiptReconciliationV1
    )({
      root_dir: policy.root_dir,
      attempt_id: attemptId,
      server_policy: policy.server_policy,
      receipt_policy: policy.receipt_policy,
      apply: true,
      confirmation:
        preview.required_confirmation ||
        VOID_BUY_VOID_PAYMENT_KEYED_RECEIPT_RECONCILIATION_CONFIRMATION_V1,
      runtime_policy_fingerprint_sha256:
        preview.required_runtime_policy_fingerprint_sha256,
      preparation_policy_fingerprint_sha256:
        preview.required_preparation_policy_fingerprint_sha256,
      receipt_policy_fingerprint_sha256:
        preview.required_receipt_policy_fingerprint_sha256,
      saga_confirmation:
        preview.required_saga_confirmation,
      saga_action_confirmation:
        preview.required_saga_action_confirmation,
    });
  }

  if (selection.stage === "terminal_closeout") {
    if (!selection.saga_id) {
      return {
        ok: false,
        status: "held",
        reason:
          "payment_keyed_full_runtime_terminal_saga_missing",
        mutation_performed: false,
      };
    }
    return await (
      options.run_terminal_closeout ||
      runBuyVoidPaymentKeyedTerminalCloseoutV1
    )({
      root_dir: policy.root_dir,
      saga_id: selection.saga_id,
      apply: true,
      confirmation:
        preview.required_confirmation ||
        VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      receipt_policy_fingerprint_sha256:
        preview.required_receipt_policy_fingerprint_sha256,
    });
  }

  return {
    ok: false,
    status: "held",
    reason:
      "payment_keyed_full_runtime_stage_apply_unhandled",
    mutation_performed: false,
  };
}

export async function runBuyVoidPaymentKeyedFullRuntimeV1(input: {
  attempt_id: string;
  apply?: boolean;
  confirmation?: unknown;
}, options: BuyVoidPaymentKeyedFullRuntimeOptionsV1 = {}): Promise<Record<string, any>> {
  const env = options.env || process.env;
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: false,
      status: "held",
      reason:
        "payment_keyed_full_runtime_attempt_id_invalid",
      applied: input?.apply === true,
      mutation_performed: false,
    };
  }

  const policy = options.policy_state
    ? options.policy_state()
    : buyVoidPaymentKeyedFullRuntimePolicyStateV1(env);
  if (policy.configured === false) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: false,
      status: "held",
      reason: policy.reason,
      applied: input?.apply === true,
      mutation_performed: false,
      missing_policy_envs: policy.missing_envs,
      invalid_policy_envs: policy.invalid_envs,
    };
  }

  let selection: StageSelectionV1;
  try {
    selection = await selectStage(
      attemptId,
      policy,
      options,
    );
  } catch (error) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: false,
      status: "held",
      reason: text((error as Error)?.message || error),
      applied: input?.apply === true,
      mutation_performed: false,
    };
  }

  if (input?.apply === true && !applyEnabled(env)) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: false,
      status: "held",
      stage: selection.stage,
      reason:
        "payment_keyed_full_runtime_apply_disabled",
      applied: true,
      mutation_performed: false,
      apply_enable_env:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled,
    };
  }
  if (
    input?.apply === true &&
    text(input.confirmation) !==
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1
  ) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: false,
      status: "held",
      stage: selection.stage,
      reason:
        "payment_keyed_full_runtime_explicit_confirmation_required",
      applied: true,
      mutation_performed: false,
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1,
    };
  }

  let preview: any;
  try {
    preview = await previewStage(
      selection,
      policy,
      env,
      options,
    );
  } catch (error) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: false,
      status: "held",
      stage: selection.stage,
      reason:
        "payment_keyed_full_runtime_preview_failed:" +
        text((error as Error)?.message || error),
      applied: input?.apply === true,
      mutation_performed: false,
    };
  }

  if (input?.apply !== true) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: preview?.ok !== false,
      status:
        preview?.ok === false
          ? "held"
          : "dry_run",
      applied: false,
      stage: selection.stage,
      attempt_id: attemptId,
      saga_id: selection.saga_id,
      saga_state: selection.saga_state,
      required_confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1,
      full_runtime_policy_fingerprint_sha256:
        policy.full_runtime_policy_fingerprint_sha256,
      inner_preview: preview,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      inventory_mutation_performed: false,
      public_fulfilled_closeout_performed: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  }

  if (preview?.ok === false) {
    return {
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      version: 1,
      ok: false,
      status: "held",
      stage: selection.stage,
      reason:
        "payment_keyed_full_runtime_inner_preview_held:" +
        text(preview.reason || preview.status || "unknown"),
      applied: true,
      mutation_performed: false,
      inner_preview: preview,
    };
  }

  const decision = await applyStage(
    selection,
    preview,
    policy,
    env,
    options,
  );
  return {
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
    version: 1,
    ok: decision?.ok === true,
    status:
      decision?.ok === true
        ? "stage_applied"
        : "held",
    applied: true,
    stage: selection.stage,
    attempt_id: attemptId,
    saga_id: selection.saga_id,
    saga_state_before: selection.saga_state,
    full_runtime_policy_fingerprint_sha256:
      policy.full_runtime_policy_fingerprint_sha256,
    decision,
    automatic_retry_allowed: false,
  };
}

function remoteAddress(req: any): string {
  return text(
    req?.socket?.remoteAddress ??
      req?.connection?.remoteAddress ??
      req?.ip ??
      "",
  ).toLowerCase();
}

function loopbackOnly(req: any, res: any): boolean {
  const remote = remoteAddress(req);
  if (
    [
      "127.0.0.1",
      "::1",
      "::ffff:127.0.0.1",
    ].includes(remote)
  ) {
    return true;
  }
  res.status(403).json({
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
    ok: false,
    error: "operator_loopback_only",
  });
  return false;
}

function directObject(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }
  const proto = Object.getPrototypeOf(value);
  if (
    proto !== Object.prototype &&
    proto !== null
  ) {
    return null;
  }
  return value as Record<string, unknown>;
}

const ALLOWED_INPUT_KEYS = new Set([
  "action",
  "attempt_id",
  "apply",
  "confirmation",
]);

function invalidKey(
  body: Record<string, unknown>,
): string | null {
  for (const key of Object.keys(body)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return key;
  }
  return null;
}

function responseStatus(decision: Record<string, any>): number {
  if (decision.ok === true) return 200;
  const reason = text(
    decision.reason ||
      decision.decision?.reason,
  );
  if (
    reason.includes("confirmation") ||
    reason.includes("apply_disabled")
  ) {
    return 428;
  }
  if (
    reason.includes("not_found") ||
    reason.includes("missing")
  ) {
    return 404;
  }
  if (
    reason.includes("conflict") ||
    reason.includes("reconciliation") ||
    reason.includes("unknown") ||
    reason.includes("state_unhandled")
  ) {
    return 409;
  }
  if (
    reason.includes("not_configured") ||
    reason.includes("disabled") ||
    reason.includes("dependency")
  ) {
    return 503;
  }
  return 400;
}

export function buyVoidPaymentKeyedFullRuntimeStatusV1(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, unknown> {
  const policy =
    buyVoidPaymentKeyedFullRuntimePolicyStateV1(env);
  return {
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
    version: 1,
    ok: true,
    enabled: enabled(env),
    apply_enabled: applyEnabled(env),
    enable_env:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled,
    apply_enable_env:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
        .apply_enabled,
    routes:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ROUTES_V1,
    parent_action:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
    required_confirmation:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1,
    stage_selection: "server_derived",
    exactly_one_stage_per_command: true,
    automatic_retry_allowed: false,
    policy_configured: policy.configured,
    dependency_bootstrap_marker:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1,
    credential_binding_evidence_id:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    ...(policy.configured === true
      ? {
          full_runtime_policy_fingerprint_sha256:
            policy.full_runtime_policy_fingerprint_sha256,
          runtime_policy_fingerprint_sha256:
            policy.runtime_policy_fingerprint_sha256,
          preparation_policy_fingerprint_sha256:
            policy.preparation_policy_fingerprint_sha256,
          receipt_policy_fingerprint_sha256:
            policy.receipt_policy_fingerprint_sha256,
          rpc_url_fingerprint_sha256:
            policy.rpc_url_fingerprint_sha256,
          fulfillment_wallet_fingerprint_sha256:
            sha256(policy.fulfillment_wallet_address),
          fulfillment_contract_fingerprint_sha256:
            sha256(policy.fulfillment_contract_address),
          void_token_address_fingerprint_sha256:
            sha256(policy.void_token_address),
          root_dir_fingerprint_sha256:
            sha256(policy.root_dir),
        }
      : {
          policy_reason: policy.reason,
          missing_policy_envs:
            policy.missing_envs,
          invalid_policy_envs:
            policy.invalid_envs,
        }),
    signing_dependency_env_configured:
      Boolean(
        text(
          env[
            VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
              .credentials_directory
          ],
        ),
      ) &&
      text(
        env[
          VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
            .credential_binding_evidence_id
        ],
      ) ===
        VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1,
  };
}

export async function handleBuyVoidPaymentKeyedFullRuntimeCommandV1(
  req: any,
  res: any,
  options: BuyVoidPaymentKeyedFullRuntimeOptionsV1 = {},
): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;
  const env = options.env || process.env;
  if (!enabled(env)) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      ok: false,
      error:
        "payment_keyed_full_runtime_disabled",
      enable_env:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled,
    });
  }

  const body = directObject(req?.body);
  if (!body) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }
  const bad = invalidKey(body);
  if (bad) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      ok: false,
      error:
        "caller_supplied_runtime_material_forbidden",
      forbidden_key: bad,
      allowed_keys:
        Array.from(ALLOWED_INPUT_KEYS).sort(),
    });
  }
  if (
    body.action !== undefined &&
    text(body.action) !==
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1
  ) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      ok: false,
      error: "invalid_payment_keyed_runtime_action",
      supported_action:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
    });
  }

  const decision =
    await runBuyVoidPaymentKeyedFullRuntimeV1(
      {
        attempt_id: text(body.attempt_id),
        apply: body.apply === true,
        confirmation: body.confirmation,
      },
      options,
    );
  return res.status(
    responseStatus(decision),
  ).json(decision);
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any =
    globalState.__void_http_app ||
    globalState.app;
  if (
    !app ||
    typeof app.get !== "function" ||
    typeof app.post !== "function"
  ) {
    setTimeout(mount, 250).unref?.();
    return;
  }
  if (globalState[GLOBAL_MARK]) return;
  globalState[GLOBAL_MARK] = true;

  app.get(
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.setHeader?.("Cache-Control", "no-store");
      res.status(200).json(
        buyVoidPaymentKeyedFullRuntimeStatusV1(),
      );
    },
  );

  app.post(
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ROUTES_V1.command,
    express.json({ limit: JSON_LIMIT }),
    (req: any, res: any) => {
      void handleBuyVoidPaymentKeyedFullRuntimeCommandV1(
        req,
        res,
      ).catch((error: any) => {
        if (!res.headersSent) {
          res.status(500).json({
            marker:
              VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
            ok: false,
            error:
              "payment_keyed_full_runtime_internal_error",
            error_class:
              text(error?.name || "Error").slice(0, 80),
            automatic_retry_allowed: false,
          });
        }
      });
    },
  );
}

setTimeout(mount, 250).unref?.();
