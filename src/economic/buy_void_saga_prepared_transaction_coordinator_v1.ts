import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  type BuyVoidInventoryReservationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  listBuyVoidExecutionAttemptsV1,
  readBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  readBuyVoidCrashConsistentSagaServerPolicyV1,
  type BuyVoidCrashConsistentSagaServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  planBuyVoidNativeExecutionNonceFeeV1,
  type BuyVoidNativeExecutionNonceFeePlanDecisionV1,
  type BuyVoidNativeExecutionNonceFeePlannerPolicyV1,
  type BuyVoidNativeExecutionPlannerTransportV1,
} from "./buy_void_native_execution_nonce_fee_planner_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  listBuyVoidPreparedTransactionPlanReservationsV1,
  reserveBuyVoidPreparedTransactionPlanV1,
  type BuyVoidPreparedTransactionPlanReservationV1,
} from "./buy_void_prepared_transaction_plan_reservation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
  prepareBuyVoidTransactionInCustodyV1,
  readBuyVoidPreparedTransactionCustodyV1,
  type BuyVoidPreparedTransactionCustodianV1,
  type BuyVoidPreparedTransactionCustodyPublicProjectionV1,
} from "./buy_void_prepared_transaction_custody_v1.js";

export const VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_COORDINATOR_V1 =
  "VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_COORDINATOR_V1";

export const VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1 =
  "buyVoidAdvanceSagaPreparedTransactionV1";

export const VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_AUTHORITY_V1 = {
  source_only_contract: true,
  runtime_route_mount: false,
  background_loop: false,
  startup_execution: false,
  exact_attempt_selector: true,
  server_controlled_economic_policy: true,
  server_controlled_preparation_policy: true,
  read_only_nonce_fee_planning: true,
  durable_local_nonce_reservation: true,
  opaque_external_custody_required: true,
  application_private_key_access: false,
  application_wallet_access: false,
  application_signing: false,
  external_custodian_signing_when_applied: true,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  execution_attempt_preparation_write: true,
  saga_transaction_prepared_append: true,
  transaction_broadcast: false,
  receipt_wait: false,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  automatic_retry: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1 = {
  rpc_url: "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
  gas_limit: "VOID_BUY_VOID_NATIVE_EXECUTION_GAS_LIMIT",
  max_gas_limit: "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT",
  max_fee_per_gas_wei:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI",
  max_priority_fee_per_gas_wei:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
  fee_multiplier_bps:
    "VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS",
} as const;

const NATIVE_VALUE_MULTIPLIER = 1_000_000_000_000n;
const SHA256 = /^[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const SOURCE_FLOOR = "eea521d298ffb299ca8839d9171a1151f206d7c9";
const SAGA_ROOT = "buy-void-crash-consistent-saga-runtime-v1";
const LEASE_TTL_MS = 30_000;

export type BuyVoidSagaPreparedTransactionFaultStageV1 =
  | "after_plan_reservation"
  | "after_custody_record"
  | "after_execution_attempt_preparation";

export type BuyVoidSagaPreparedTransactionDependenciesV1 = {
  list_claims?: (rootDir: string) => unknown[];
  list_inventory?: (input: { root_dir: string; pool_id: string }) => unknown[];
  list_attempts?: (rootDir: string) => unknown[];
  read_attempt?: (input: { root_dir: string; attempt_id: string }) => unknown | null;
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  plan_nonce_fee?: typeof planBuyVoidNativeExecutionNonceFeeV1;
  planner_transport?: BuyVoidNativeExecutionPlannerTransportV1;
  custodian?: BuyVoidPreparedTransactionCustodianV1;
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
  fault_inject?: (
    stage: BuyVoidSagaPreparedTransactionFaultStageV1,
  ) => void | Promise<void>;
};

export type RunBuyVoidSagaPreparedTransactionInputV1 = {
  root_dir: string;
  attempt_id: string;
  apply?: boolean;
  confirmation?: unknown;
  economic_policy_fingerprint_sha256?: unknown;
  preparation_policy_fingerprint_sha256?: unknown;
  saga_confirmation?: unknown;
  saga_action_confirmation?: unknown;
  custody_confirmation?: unknown;
  pipeline_confirmation?: unknown;
  dependencies?: BuyVoidSagaPreparedTransactionDependenciesV1;
};

export type BuyVoidSagaPreparedTransactionDecisionV1 =
  | {
      ok: true;
      status: "dry_run";
      applied: false;
      mutation_performed: false;
      attempt_id: string;
      saga_id: string;
      required_confirmation:
        typeof VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1;
      required_economic_policy_fingerprint_sha256: string;
      required_preparation_policy_fingerprint_sha256: string;
      required_saga_confirmation: string;
      required_saga_action_confirmation: string;
      required_custody_confirmation:
        typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1;
      required_pipeline_confirmation: string;
      planner: BuyVoidNativeExecutionNonceFeePlanDecisionV1 & {
        ok: true;
        status: "planned";
      };
      existing_plan: BuyVoidPreparedTransactionPlanReservationV1 | null;
      existing_custody:
        BuyVoidPreparedTransactionCustodyPublicProjectionV1 | null;
      wallet_access_performed: false;
      external_signing_performed: false;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      money_movement_performed: false;
      reason?: never;
      detail?: never;
    }
  | {
      ok: true;
      status: "prepared" | "duplicate";
      applied: true;
      mutation_performed: boolean;
      attempt_id: string;
      saga_id: string;
      plan: BuyVoidPreparedTransactionPlanReservationV1;
      custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
      execution_attempt: BuyVoidExecutionAttemptStateV1;
      saga_state: Record<string, unknown>;
      wallet_access_performed: false;
      external_signing_performed: boolean;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      reason?: never;
      detail?: never;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      stage:
        | "input"
        | "server_policy"
        | "journal_reconstruction"
        | "saga_reconstruction"
        | "nonce_fee_planning"
        | "plan_reservation"
        | "custody"
        | "execution_attempt_preparation"
        | "saga_append";
      reason: string;
      detail?: Record<string, unknown>;
      mutation_performed: boolean;
      wallet_access_performed: false;
      external_signing_performed: boolean;
      transaction_broadcast_performed: false;
      raw_signed_transaction_persisted: false;
      raw_signed_transaction_returned: false;
      reconciliation_required: boolean;
      automatic_retry_allowed: false;
      money_movement_performed: false;
      plan?: never;
      custody?: never;
    };

type SagaStoreV1 = {
  recover: (sagaId: string) => any | null;
};

type SagaModuleV1 = {
  ADVANCE_CONFIRMATION: string;
  ACTION_CONFIRMATIONS: Record<string, string>;
  validateSagaBindingV1: (binding: Record<string, unknown>) => Record<string, any>;
  computeSagaIdV1: (binding: Record<string, unknown>) => string;
  deriveSagaNextActionV1: (state: Record<string, unknown>) => {
    action: string | null;
    terminal: boolean;
    required_confirmation: string | null;
  };
  createFilesystemSagaStoreV1: (rootDir: string) => SagaStoreV1;
  runSagaSupervisorTickV1: (input: Record<string, unknown>) => Promise<any>;
};

type PreparationPolicyV1 = {
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  gas_limit: string;
  max_gas_limit: string;
  max_fee_per_gas_wei: string;
  max_priority_fee_per_gas_wei: string;
  fee_multiplier_bps: string;
  fingerprint_sha256: string;
};

type PreparationPolicyDecisionV1 =
  | {
      ok: true;
      policy: PreparationPolicyV1;
      reason?: never;
      missing?: never;
    }
  | {
      ok: false;
      policy?: never;
      missing: string[];
      reason: string;
    };

type ReconstructedV1 = {
  intent: BuyVoidFulfillmentJournalIntentV1;
  inventory: BuyVoidInventoryReservationV1;
  attempt: BuyVoidExecutionAttemptStateV1;
  wallet_address: string;
  binding: Record<string, any>;
  saga_id: string;
  saga_store: SagaStoreV1;
  saga_record: any;
};

type HeldLikeV1 = {
  reason: string;
  detail?: Record<string, unknown>;
};

function hasReason(value: unknown): value is HeldLikeV1 {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { reason?: unknown }).reason === "string",
  );
}

function held(
  stage: Extract<BuyVoidSagaPreparedTransactionDecisionV1, { ok: false }>["stage"],
  applied: boolean,
  reason: string,
  options: {
    mutation_performed?: boolean;
    external_signing_performed?: boolean;
    reconciliation_required?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): Extract<BuyVoidSagaPreparedTransactionDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    applied,
    stage,
    reason,
    ...(options.detail ? { detail: options.detail } : {}),
    mutation_performed: options.mutation_performed === true,
    wallet_access_performed: false,
    external_signing_performed:
      options.external_signing_performed === true,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    reconciliation_required:
      options.reconciliation_required === true,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
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

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeAddress(value: unknown): string {
  const address = text(value).toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function parsePositive(value: unknown): bigint | null {
  const raw = text(value);
  if (!DECIMAL.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch (error) {
    void error;
    return null;
  }
}

function absoluteRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("prepared_transaction_root_must_be_absolute");
  }
  return path.resolve(raw);
}

function policyValues(): PreparationPolicyDecisionV1 {
  const values = Object.fromEntries(
    Object.entries(VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1)
      .map(([key, name]) => [key, text(process.env[name])]),
  ) as Record<
    keyof typeof VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1,
    string
  >;
  const missing = Object.entries(
    VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1,
  )
    .filter(([key]) => !values[
      key as keyof typeof VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1
    ])
    .map(([, name]) => name)
    .sort();
  if (missing.length) {
    return { ok: false, missing, reason: "preparation_policy_not_configured" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(values.rpc_url);
  } catch (error) {
    void error;
    return { ok: false, missing: [], reason: "preparation_rpc_url_invalid" };
  }
  if (
    parsedUrl.protocol !== "http:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.hash ||
    !["127.0.0.1", "::1", "localhost"].includes(
      parsedUrl.hostname.toLowerCase(),
    )
  ) {
    return { ok: false, missing: [], reason: "preparation_rpc_must_be_loopback" };
  }

  const gasLimit = parsePositive(values.gas_limit);
  const gasCap = parsePositive(values.max_gas_limit);
  const maxFee = parsePositive(values.max_fee_per_gas_wei);
  const priority = parsePositive(values.max_priority_fee_per_gas_wei);
  const multiplier = parsePositive(values.fee_multiplier_bps);
  if (
    gasLimit === null ||
    gasCap === null ||
    gasLimit > gasCap ||
    maxFee === null ||
    priority === null ||
    priority > maxFee ||
    multiplier === null ||
    multiplier < 10_000n ||
    multiplier > 50_000n
  ) {
    return { ok: false, missing: [], reason: "preparation_policy_invalid" };
  }

  parsedUrl.pathname = parsedUrl.pathname || "/";
  const normalizedUrl = parsedUrl.toString();
  const stable = {
    rpc_url_fingerprint_sha256: sha256(normalizedUrl),
    gas_limit: gasLimit.toString(),
    max_gas_limit: gasCap.toString(),
    max_fee_per_gas_wei: maxFee.toString(),
    max_priority_fee_per_gas_wei: priority.toString(),
    fee_multiplier_bps: multiplier.toString(),
  };
  return {
    ok: true,
    policy: {
      rpc_url: normalizedUrl,
      ...stable,
      fingerprint_sha256: fingerprint(stable),
    },
  };
}

function dependencies(
  supplied?: BuyVoidSagaPreparedTransactionDependenciesV1,
): Required<Omit<
  BuyVoidSagaPreparedTransactionDependenciesV1,
  "planner_transport" | "custodian"
>> & Pick<
  BuyVoidSagaPreparedTransactionDependenciesV1,
  "planner_transport" | "custodian"
> {
  return {
    list_claims: listBuyVoidFulfillmentJournalClaimsV1,
    list_inventory: listBuyVoidInventoryReservationsV1,
    list_attempts: listBuyVoidExecutionAttemptsV1,
    read_attempt: readBuyVoidExecutionAttemptV1,
    run_pipeline_command: runBuyVoidPipelineCommandV1 as any,
    plan_nonce_fee: planBuyVoidNativeExecutionNonceFeeV1,
    planner_transport: undefined,
    custodian: undefined,
    load_saga_module: async () => {
      const dynamicImport = new Function(
        "specifier",
        "return import(specifier)",
      ) as (specifier: string) => Promise<SagaModuleV1>;
      return dynamicImport(
        "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      );
    },
    now_ms: Date.now,
    fault_inject: async () => undefined,
    ...(supplied || {}),
  };
}

function matchesIdentity(
  value: Record<string, any>,
  reservation: Record<string, any>,
): boolean {
  return (
    text(value.request_id) === text(reservation.request_id) ||
    text(value.canonical_payment_identity) ===
      text(reservation.canonical_payment_identity) ||
    text(value.request_key_sha256) === text(reservation.request_key_sha256) ||
    text(value.payment_key_sha256) === text(reservation.payment_key_sha256)
  );
}

function one<T>(values: T[], label: string): T {
  if (values.length !== 1) {
    throw new Error(`${label}_count_must_be_one:${values.length}`);
  }
  return values[0];
}

function bindingFromIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
): Record<string, unknown> {
  return {
    request_id: text(intent.claim?.request_id),
    canonical_payment_identity:
      text(intent.claim?.canonical_payment_identity),
    request_key_sha256: text(intent.request_key_sha256),
    payment_key_sha256: text(intent.payment_key_sha256),
    delivery_address:
      normalizeAddress(intent.claim?.unsigned_instruction?.delivery_address),
    void_amount_units:
      text(intent.claim?.unsigned_instruction?.void_amount_units),
    chain_id: "2050",
    pool_id: "void-fixed-price-pool-v1",
  };
}

function existingSagaStore(
  saga: SagaModuleV1,
  rootDir: string,
  sagaId: string,
): SagaStoreV1 {
  const root = path.join(rootDir, SAGA_ROOT);
  const sagaDirectory = path.join(root, "sagas", sagaId);
  const eventsDirectory = path.join(sagaDirectory, "events");
  for (const directory of [root, path.join(root, "sagas"), sagaDirectory, eventsDirectory]) {
    const metadata = fs.lstatSync(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error("prepared_transaction_saga_directory_invalid");
    }
  }
  return saga.createFilesystemSagaStoreV1(root);
}

async function reconstruct(input: {
  root_dir: string;
  attempt_id: string;
  server_policy: BuyVoidCrashConsistentSagaServerPolicyV1;
  saga: SagaModuleV1;
  deps: ReturnType<typeof dependencies>;
}): Promise<ReconstructedV1> {
  const attempt = one(
    input.deps.list_attempts(input.root_dir)
      .map((value) => value as BuyVoidExecutionAttemptStateV1)
      .filter((value) =>
        text(value?.reservation?.attempt_id).toLowerCase() === input.attempt_id
      ),
    "prepared_transaction_attempt",
  );
  if (!["reserved", "prepared"].includes(attempt.status)) {
    throw new Error(`prepared_transaction_attempt_status_invalid:${attempt.status}`);
  }
  if (
    attempt.broadcast ||
    attempt.failure ||
    attempt.postbroadcast_failure ||
    attempt.confirmation
  ) {
    throw new Error("prepared_transaction_attempt_not_clean");
  }
  const reservation = attempt.reservation;
  const claims = input.deps.list_claims(input.root_dir)
    .map((value) => value as BuyVoidFulfillmentJournalIntentV1)
    .filter((value) => matchesIdentity({
      request_id: value.claim?.request_id,
      canonical_payment_identity: value.claim?.canonical_payment_identity,
      request_key_sha256: value.request_key_sha256,
      payment_key_sha256: value.payment_key_sha256,
    }, reservation));
  const intent = one(claims, "prepared_transaction_claim");
  const inventories = input.deps.list_inventory({
    root_dir: input.root_dir,
    pool_id: "void-fixed-price-pool-v1",
  })
    .map((value) => value as BuyVoidInventoryReservationV1)
    .filter((value) => matchesIdentity(value as any, reservation));
  const inventory = one(inventories, "prepared_transaction_inventory");

  const walletAllowlist = input.server_policy.execution_policy
    .fulfillment_wallet_allowlist
    .map(normalizeAddress)
    .filter(Boolean);
  if (walletAllowlist.length !== 1) {
    throw new Error("prepared_transaction_wallet_allowlist_must_have_one");
  }
  const wallet = walletAllowlist[0];
  const binding = input.saga.validateSagaBindingV1(
    bindingFromIntent(intent),
  );
  const sagaId = input.saga.computeSagaIdV1(binding);
  const store = existingSagaStore(input.saga, input.root_dir, sagaId);
  const record = store.recover(sagaId);
  if (!record) throw new Error("prepared_transaction_saga_missing");
  if (
    record.events?.[0]?.payload?.policy_id !==
      input.server_policy.saga_policy_id
  ) {
    throw new Error("prepared_transaction_saga_policy_conflict");
  }
  if (
    record.state?.attempt_id !== reservation.attempt_id ||
    !["attempt_reserved", "transaction_prepared"].includes(
      text(record.state?.state),
    )
  ) {
    throw new Error("prepared_transaction_saga_state_invalid");
  }
  if (
    inventory.reservation_id !== record.state?.reservation_id ||
    inventory.request_id !== reservation.request_id ||
    inventory.canonical_payment_identity !==
      reservation.canonical_payment_identity ||
    inventory.delivery_address !==
      normalizeAddress(intent.claim.unsigned_instruction.delivery_address) ||
    inventory.reserved_void_units !==
      text(intent.claim.unsigned_instruction.void_amount_units)
  ) {
    throw new Error("prepared_transaction_inventory_binding_conflict");
  }

  return {
    intent,
    inventory,
    attempt,
    wallet_address: wallet,
    binding,
    saga_id: sagaId,
    saga_store: store,
    saga_record: record,
  };
}

function existingPlanForAttempt(
  rootDir: string,
  wallet: string,
  attemptId: string,
): BuyVoidPreparedTransactionPlanReservationV1 | null {
  const matches = listBuyVoidPreparedTransactionPlanReservationsV1({
    root_dir: rootDir,
    wallet_address: wallet,
  }).filter((record) => record.attempt_id === attemptId);
  if (matches.length > 1) {
    throw new Error("prepared_transaction_multiple_local_plans");
  }
  return matches[0] || null;
}

async function runPlanner(input: {
  reconstructed: ReconstructedV1;
  preparation_policy: PreparationPolicyV1;
  deps: ReturnType<typeof dependencies>;
}): Promise<BuyVoidNativeExecutionNonceFeePlanDecisionV1> {
  const voidUnits = parsePositive(
    input.reconstructed.intent.claim.unsigned_instruction.void_amount_units,
  );
  if (voidUnits === null) throw new Error("prepared_transaction_void_amount_invalid");
  const nativeValue = voidUnits * NATIVE_VALUE_MULTIPLIER;
  const policy: BuyVoidNativeExecutionNonceFeePlannerPolicyV1 = {
    rpc_url: input.preparation_policy.rpc_url,
    expected_chain_id: "2050",
    fulfillment_wallet_address:
      input.reconstructed.wallet_address,
    native_value_wei: nativeValue,
    gas_limit: input.preparation_policy.gas_limit,
    max_gas_limit: input.preparation_policy.max_gas_limit,
    max_fee_per_gas_wei:
      input.preparation_policy.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      input.preparation_policy.max_priority_fee_per_gas_wei,
    fee_multiplier_bps:
      input.preparation_policy.fee_multiplier_bps,
  };
  return input.deps.planner_transport
    ? await input.deps.plan_nonce_fee(
        policy,
        input.deps.planner_transport,
      )
    : await input.deps.plan_nonce_fee(policy);
}

function validatePreparedAttempt(input: {
  attempt: BuyVoidExecutionAttemptStateV1;
  plan: BuyVoidPreparedTransactionPlanReservationV1;
  custody: BuyVoidPreparedTransactionCustodyPublicProjectionV1;
  intent: BuyVoidFulfillmentJournalIntentV1;
}): void {
  if (
    input.attempt.status !== "prepared" ||
    !input.attempt.prepared ||
    input.attempt.prepared.attempt_id !== input.plan.attempt_id ||
    input.attempt.prepared.chain_id !== "2050" ||
    input.attempt.prepared.void_delivery_tx_hash !==
      input.custody.signed_transaction_hash ||
    input.attempt.prepared.fulfillment_wallet !==
      input.plan.wallet_address ||
    input.attempt.prepared.delivery_address !==
      input.plan.delivery_address ||
    input.attempt.prepared.void_amount_units !==
      text(input.intent.claim.unsigned_instruction.void_amount_units) ||
    input.attempt.prepared.signed_transaction_persisted !== false ||
    input.attempt.prepared.raw_transaction_persisted !== false
  ) {
    throw new Error("prepared_transaction_execution_attempt_binding_conflict");
  }
}

function confirmations(saga: SagaModuleV1): {
  saga_confirmation: string;
  saga_action_confirmation: string;
} {
  const action = saga.ACTION_CONFIRMATIONS.prepare_transaction;
  if (!action) throw new Error("prepared_transaction_saga_confirmation_missing");
  return {
    saga_confirmation: saga.ADVANCE_CONFIRMATION,
    saga_action_confirmation: action,
  };
}

export async function runBuyVoidSagaPreparedTransactionCoordinatorV1(
  input: RunBuyVoidSagaPreparedTransactionInputV1,
): Promise<BuyVoidSagaPreparedTransactionDecisionV1> {
  const applied = input?.apply === true;
  let rootDir = "";
  const attemptId = text(input?.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return held("input", applied, "prepared_transaction_attempt_id_invalid");
  }
  try {
    rootDir = absoluteRoot(input?.root_dir);
  } catch (error) {
    return held("input", applied, String((error as Error)?.message || error));
  }

  const serverPolicyDecision = readBuyVoidCrashConsistentSagaServerPolicyV1();
  if (hasReason(serverPolicyDecision)) {
    return held("server_policy", applied, serverPolicyDecision.reason, {
      detail: { missing_envs: serverPolicyDecision.missing_envs || [] },
    });
  }
  const preparationPolicyDecision = policyValues();
  if (hasReason(preparationPolicyDecision)) {
    return held(
      "server_policy",
      applied,
      preparationPolicyDecision.reason,
      { detail: { missing_envs: preparationPolicyDecision.missing || [] } },
    );
  }
  const serverPolicy = serverPolicyDecision.policy;
  const preparationPolicy = preparationPolicyDecision.policy!;
  const deps = dependencies(input?.dependencies);
  let saga: SagaModuleV1;
  try {
    saga = await deps.load_saga_module();
  } catch (error) {
    return held("saga_reconstruction", applied, "prepared_transaction_saga_module_failed", {
      detail: { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
    });
  }

  let reconstructed: ReconstructedV1;
  try {
    reconstructed = await reconstruct({
      root_dir: rootDir,
      attempt_id: attemptId,
      server_policy: serverPolicy,
      saga,
      deps,
    });
  } catch (error) {
    return held(
      "journal_reconstruction",
      applied,
      String((error as Error)?.message || error).slice(0, 240),
    );
  }

  const required = confirmations(saga);
  let existingPlan: BuyVoidPreparedTransactionPlanReservationV1 | null;
  let existingCustody: BuyVoidPreparedTransactionCustodyPublicProjectionV1 | null;
  try {
    existingPlan = existingPlanForAttempt(
      rootDir,
      reconstructed.wallet_address,
      attemptId,
    );
    existingCustody = readBuyVoidPreparedTransactionCustodyV1({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
  } catch (error) {
    return held(
      "journal_reconstruction",
      applied,
      String((error as Error)?.message || error).slice(0, 240),
    );
  }

  let planner: BuyVoidNativeExecutionNonceFeePlanDecisionV1;
  if (existingPlan) {
    planner = {
      ok: true,
      marker: "VOID_BUY_VOID_NATIVE_EXECUTION_NONCE_FEE_PLANNER_V1",
      version: 1,
      status: "planned",
      chain_id: "2050",
      wallet_address: existingPlan.wallet_address,
      wallet_address_fingerprint_sha256:
        sha256(existingPlan.wallet_address),
      rpc_url_fingerprint_sha256:
        preparationPolicy.rpc_url_fingerprint_sha256,
      transaction_plan: {
        chain_id: "2050",
        nonce: existingPlan.nonce,
        gas_limit: existingPlan.gas_limit,
        max_fee_per_gas_wei: existingPlan.max_fee_per_gas_wei,
        max_priority_fee_per_gas_wei:
          existingPlan.max_priority_fee_per_gas_wei,
      },
      pending_nonce: existingPlan.nonce,
      observed_gas_price_wei: "0",
      computed_max_fee_per_gas_wei:
        existingPlan.max_fee_per_gas_wei,
      configured_priority_fee_per_gas_wei:
        existingPlan.max_priority_fee_per_gas_wei,
      estimated_max_transaction_cost_wei: "0",
      observed_wallet_balance_wei: "0",
      sufficient_balance: true,
      rpc_methods_used: [],
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
    };
  } else {
    try {
      planner = await runPlanner({
        reconstructed,
        preparation_policy: preparationPolicy,
        deps,
      });
    } catch (error) {
      return held("nonce_fee_planning", applied, "prepared_transaction_planner_exception", {
        detail: { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
      });
    }
    if (hasReason(planner)) {
      return held("nonce_fee_planning", applied, planner.reason, {
        detail: planner.detail,
      });
    }
  }

  if (!applied) {
    return {
      ok: true,
      status: "dry_run",
      applied: false,
      mutation_performed: false,
      attempt_id: attemptId,
      saga_id: reconstructed.saga_id,
      required_confirmation:
        VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1,
      required_economic_policy_fingerprint_sha256:
        serverPolicy.fingerprints.combined_policy_sha256,
      required_preparation_policy_fingerprint_sha256:
        preparationPolicy.fingerprint_sha256,
      required_saga_confirmation: required.saga_confirmation,
      required_saga_action_confirmation:
        required.saga_action_confirmation,
      required_custody_confirmation:
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
      required_pipeline_confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
      planner: planner as Extract<typeof planner, { ok: true }>,
      existing_plan: existingPlan,
      existing_custody: existingCustody,
      wallet_access_performed: false,
      external_signing_performed: false,
      transaction_broadcast_performed: false,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      money_movement_performed: false,
    };
  }

  if (
    text(input.confirmation) !==
      VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1 ||
    text(input.economic_policy_fingerprint_sha256) !==
      serverPolicy.fingerprints.combined_policy_sha256 ||
    text(input.preparation_policy_fingerprint_sha256) !==
      preparationPolicy.fingerprint_sha256 ||
    text(input.saga_confirmation) !== required.saga_confirmation ||
    text(input.saga_action_confirmation) !==
      required.saga_action_confirmation ||
    text(input.custody_confirmation) !==
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1 ||
    text(input.pipeline_confirmation) !==
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution
  ) {
    return held("input", true, "prepared_transaction_exact_confirmations_required");
  }
  if (!deps.custodian) {
    return held("custody", true, "prepared_transaction_custodian_required");
  }

  const nowMs = deps.now_ms();
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    return held("input", true, "prepared_transaction_server_clock_invalid");
  }
  const voidUnits = parsePositive(
    reconstructed.intent.claim.unsigned_instruction.void_amount_units,
  );
  if (voidUnits === null) {
    return held("journal_reconstruction", true, "prepared_transaction_void_amount_invalid");
  }
  const transactionPlan = (planner as Extract<typeof planner, { ok: true }>).transaction_plan;
  const planDecision = reserveBuyVoidPreparedTransactionPlanV1({
    root_dir: rootDir,
    saga_id: reconstructed.saga_id,
    attempt_id: attemptId,
    chain_id: "2050",
    wallet_address: reconstructed.wallet_address,
    observed_pending_nonce: transactionPlan.nonce,
    delivery_address:
      reconstructed.intent.claim.unsigned_instruction.delivery_address,
    native_value_wei: voidUnits * NATIVE_VALUE_MULTIPLIER,
    gas_limit: transactionPlan.gas_limit,
    max_fee_per_gas_wei: transactionPlan.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      transactionPlan.max_priority_fee_per_gas_wei,
    economic_policy_fingerprint_sha256:
      serverPolicy.fingerprints.combined_policy_sha256,
    preparation_policy_fingerprint_sha256:
      preparationPolicy.fingerprint_sha256,
    now_ms: nowMs,
  });
  if (hasReason(planDecision)) {
    return held("plan_reservation", true, planDecision.reason, {
      detail: planDecision.detail,
    });
  }
  const plan = planDecision.reservation;
  try {
    await deps.fault_inject("after_plan_reservation");
  } catch (error) {
    return held("plan_reservation", true, "injected_after_plan_reservation", {
      mutation_performed: true,
      reconciliation_required: true,
      detail: { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
    });
  }

  const custodyDecision = await prepareBuyVoidTransactionInCustodyV1({
    root_dir: rootDir,
    plan,
    custodian: deps.custodian,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
    now_ms: nowMs,
  });
  if (hasReason(custodyDecision)) {
    return held("custody", true, custodyDecision.reason, {
      mutation_performed: planDecision.mutation_performed,
      external_signing_performed:
        custodyDecision.external_signing_performed,
      reconciliation_required:
        custodyDecision.custodian_called,
      detail: custodyDecision.detail,
    });
  }
  if (!custodyDecision.custody) {
    return held("custody", true, "prepared_transaction_custody_projection_missing", {
      mutation_performed: planDecision.mutation_performed,
      reconciliation_required: true,
    });
  }
  const custody = custodyDecision.custody;
  try {
    await deps.fault_inject("after_custody_record");
  } catch (error) {
    return held("custody", true, "injected_after_custody_record", {
      mutation_performed: true,
      external_signing_performed:
        custodyDecision.external_signing_performed,
      reconciliation_required: true,
      detail: { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
    });
  }

  let attempt = deps.read_attempt({
    root_dir: rootDir,
    attempt_id: attemptId,
  }) as BuyVoidExecutionAttemptStateV1 | null;
  if (!attempt) {
    return held("execution_attempt_preparation", true, "prepared_transaction_attempt_reread_missing", {
      mutation_performed: true,
      external_signing_performed:
        custodyDecision.external_signing_performed,
      reconciliation_required: true,
    });
  }
  if (attempt.status === "reserved") {
    const pipeline = await deps.run_pipeline_command({
      action: "prepare_execution",
      root_dir: rootDir,
      attempt_id: attemptId,
      intent: reconstructed.intent,
      execution_policy: serverPolicy.execution_policy,
      transaction: {
        chain_id: "2050",
        transaction_hash: custody.signed_transaction_hash,
        from_address: reconstructed.wallet_address,
        to_address: plan.delivery_address,
        amount_units:
          reconstructed.intent.claim.unsigned_instruction.void_amount_units,
      },
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
      now_ms: nowMs,
    });
    const pipelineObject = pipeline as Record<string, any>;
    if (!pipelineObject || pipelineObject.ok !== true || pipelineObject.status !== "applied") {
      return held(
        "execution_attempt_preparation",
        true,
        `prepared_transaction_pipeline_held:${text(pipelineObject?.reason) || "unknown"}`,
        {
          mutation_performed: true,
          external_signing_performed:
            custodyDecision.external_signing_performed,
          reconciliation_required: true,
        },
      );
    }
    attempt = deps.read_attempt({
      root_dir: rootDir,
      attempt_id: attemptId,
    }) as BuyVoidExecutionAttemptStateV1 | null;
  }
  if (!attempt) {
    return held("execution_attempt_preparation", true, "prepared_transaction_attempt_unreadable", {
      mutation_performed: true,
      external_signing_performed:
        custodyDecision.external_signing_performed,
      reconciliation_required: true,
    });
  }
  try {
    validatePreparedAttempt({
      attempt,
      plan,
      custody,
      intent: reconstructed.intent,
    });
  } catch (error) {
    return held(
      "execution_attempt_preparation",
      true,
      String((error as Error)?.message || error),
      {
        mutation_performed: true,
        external_signing_performed:
          custodyDecision.external_signing_performed,
        reconciliation_required: true,
      },
    );
  }
  try {
    await deps.fault_inject("after_execution_attempt_preparation");
  } catch (error) {
    return held(
      "execution_attempt_preparation",
      true,
      "injected_after_execution_attempt_preparation",
      {
        mutation_performed: true,
        external_signing_performed:
          custodyDecision.external_signing_performed,
        reconciliation_required: true,
        detail: { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
      },
    );
  }

  let sagaResult: Record<string, any>;
  const currentSaga = reconstructed.saga_store.recover(reconstructed.saga_id);
  if (text(currentSaga?.state?.state) === "transaction_prepared") {
    if (
      currentSaga.state.attempt_id !== attemptId ||
      currentSaga.state.transaction_hash !== custody.signed_transaction_hash ||
      currentSaga.state.nonce !== plan.nonce
    ) {
      return held("saga_append", true, "prepared_transaction_existing_saga_conflict", {
        mutation_performed: true,
        reconciliation_required: true,
      });
    }
    sagaResult = {
      ok: true,
      status: "duplicate",
      state: currentSaga.state,
    };
  } else {
    try {
      const result = await saga.runSagaSupervisorTickV1({
        store: reconstructed.saga_store,
        binding: reconstructed.binding,
        owner_id: `void-buy-prepare-${process.pid}-${crypto.randomBytes(16).toString("hex")}`,
        now_ms: nowMs,
        lease_ttl_ms: LEASE_TTL_MS,
        recorded_at_utc: new Date(nowMs).toISOString(),
        source_floor_main: SOURCE_FLOOR,
        policy_id: serverPolicy.saga_policy_id,
        apply: true,
        confirmation: required.saga_confirmation,
        action_confirmation: required.saga_action_confirmation,
        adapters: {
          prepare_transaction: async () => ({
            payload: {
              attempt_id: attemptId,
              transaction_hash: custody.signed_transaction_hash,
              nonce: plan.nonce,
              fulfillment_wallet_fingerprint_sha256:
                sha256(reconstructed.wallet_address),
              gas_limit: plan.gas_limit,
              max_fee_per_gas_wei: plan.max_fee_per_gas_wei,
              max_priority_fee_per_gas_wei:
                plan.max_priority_fee_per_gas_wei,
            },
          }),
        },
      });
      sagaResult = result as Record<string, any>;
    } catch (error) {
      return held("saga_append", true, "prepared_transaction_saga_append_failed", {
        mutation_performed: true,
        external_signing_performed:
          custodyDecision.external_signing_performed,
        reconciliation_required: true,
        detail: { error_class: String((error as Error)?.name || "Error").slice(0, 80) },
      });
    }
    if (!sagaResult || sagaResult.ok !== true || sagaResult.status !== "applied") {
      return held(
        "saga_append",
        true,
        `prepared_transaction_saga_held:${text(sagaResult?.reason) || text(sagaResult?.status) || "unknown"}`,
        {
          mutation_performed: true,
          external_signing_performed:
            custodyDecision.external_signing_performed,
          reconciliation_required: true,
        },
      );
    }
  }

  return {
    ok: true,
    status: sagaResult.status === "duplicate" ? "duplicate" : "prepared",
    applied: true,
    mutation_performed:
      planDecision.mutation_performed ||
      custodyDecision.mutation_performed ||
      sagaResult.status === "applied",
    attempt_id: attemptId,
    saga_id: reconstructed.saga_id,
    plan,
    custody,
    execution_attempt: attempt,
    saga_state: sagaResult.state || {},
    wallet_access_performed: false,
    external_signing_performed:
      custodyDecision.external_signing_performed,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
  };
}
