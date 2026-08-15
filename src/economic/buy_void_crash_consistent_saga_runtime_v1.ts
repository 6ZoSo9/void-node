import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  deriveBuyVoidBoundedOrchestratorServerSnapshotV1,
  type BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1,
} from "./buy_void_bounded_orchestrator_server_snapshot_v1.js";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  listBuyVoidInventoryReservationsV1,
  reserveBuyVoidInventoryV1,
  type BuyVoidInventoryReservationV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  listBuyVoidExecutionAttemptsV1,
  type BuyVoidExecutionAttemptStateV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  runBuyVoidPipelineCommandV1,
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
  type BuyVoidCrashConsistentSagaServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  runBuyVoidSagaPreparedTransactionCoordinatorV1,
  type RunBuyVoidSagaPreparedTransactionInputV1,
} from "./buy_void_saga_prepared_transaction_coordinator_v1.js";
import {
  createBuyVoidPreparedTransactionCustodianIpcV1,
  type BuyVoidPreparedTransactionCustodianIpcOptionsV1,
} from "./buy_void_prepared_transaction_custodian_ipc_v1.js";

export const VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1 =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1";
export const VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1 =
  "run_crash_consistent_saga_stage";
export const VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONFIRMATION_V1 =
  "buyVoidRunCrashConsistentSagaRuntimeV1";

export const VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  server_controlled_root_dir: true,
  server_controlled_request_dir: true,
  server_derived_request_snapshot: true,
  server_controlled_verification_policy: true,
  server_controlled_fulfillment_policy: true,
  server_controlled_inventory_policy: true,
  server_controlled_execution_policy: true,
  separate_transaction_preparation_enable_gate: true,
  server_controlled_preparation_policy: true,
  server_controlled_custodian_ipc_socket: true,
  server_controlled_signer_fingerprint: true,
  caller_supplied_policy_forbidden: true,
  caller_supplied_binding_forbidden: true,
  caller_supplied_intent_forbidden: true,
  stable_policy_fingerprint_echo_required: true,
  stable_policy_fingerprint_bound_in_saga: true,
  one_request_per_invocation: true,
  one_business_stage_per_invocation: true,
  per_request_lease_required: true,
  monotonically_increasing_fencing_token_required: true,
  restart_reconciliation_before_retry: true,
  non_money_stage_count: 4,
  claim_write_possible: true,
  inventory_reservation_possible: true,
  execution_attempt_reservation_possible: true,
  transaction_preparation_mounted: true,
  read_only_rpc_planning_possible: true,
  external_custodian_signing_possible: true,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  background_loop: false,
  startup_execution: false,
  rpc_call: true,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

const ENABLE_ENV = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED";
const REQUEST_DIR_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_REQUEST_DIR";
const PREPARATION_ENABLE_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED";
const CUSTODIAN_SOCKET_ENV =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_SOCKET_PATH";
const CUSTODIAN_SIGNER_FINGERPRINT_ENV =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SIGNER_FINGERPRINT_SHA256";
const SOURCE_FLOOR_MAIN = "74f90863d738531a75eb3b4c886ad44543ae0419";
const LEASE_TTL_MS = 30_000;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_INPUT_NESTING_DEPTH = 16;
const INPUT_NESTING_DEPTH_SENTINEL = "__input_nesting_depth_exceeded__";
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/;

const CALLER_POLICY_KEYS = new Set([
  "policy",
  "verificationpolicy",
  "fulfillmentpolicy",
  "inventorypolicy",
  "executionpolicy",
  "preparationpolicy",
  "gaslimit",
  "maxgaslimit",
  "maxfeepergaswei",
  "maxpriorityfeepergaswei",
  "feemultiplierbps",
  "allowedchains",
  "minconfirmationsbychain",
  "usdccontractbychain",
  "receiveaddressbychain",
  "currentblocknumberbychain",
  "ratevoidunitsnumerator",
  "ratevoidunitsdenominator",
  "poolremainingvoidunits",
  "maxattemptsperpayment",
  "fulfillmentwalletallowlist",
]);

const CALLER_EXECUTION_KEYS = new Set([
  "binding",
  "intent",
  "request",
  "snapshot",
  "rootdir",
  "requestdir",
  "privatekey",
  "mnemonic",
  "seedphrase",
  "rawtransaction",
  "rawsignedtransaction",
  "signedtransaction",
  "walletsecret",
  "keystore",
  "rpcurl",
  "broadcasturl",
  "socketpath",
  "custodiansocketpath",
  "signerfingerprint",
  "signerfingerprintsha256",
  "expectedsignerfingerprintsha256",
  "custodian",
  "signer",
  "plannertransport",
  "transactionplan",
]);

export type BuyVoidCrashConsistentSagaBindingV1 = {
  request_id: string;
  canonical_payment_identity: string;
  request_key_sha256: string;
  payment_key_sha256: string;
  delivery_address: string;
  void_amount_units: string;
  chain_id: "2050";
  pool_id: string;
};

type SagaStoreV1 = {
  recover: (sagaId: string) => any | null;
};

type SagaModuleV1 = {
  ADVANCE_CONFIRMATION: string;
  ACTION_CONFIRMATIONS: Record<string, string>;
  validateSagaBindingV1: (
    binding: BuyVoidCrashConsistentSagaBindingV1,
  ) => BuyVoidCrashConsistentSagaBindingV1;
  computeSagaIdV1: (binding: BuyVoidCrashConsistentSagaBindingV1) => string;
  deriveSagaNextActionV1: (state: Record<string, unknown>) => {
    action: string | null;
    terminal: boolean;
    required_confirmation: string | null;
  };
  createFilesystemSagaStoreV1: (rootDir: string) => SagaStoreV1;
  runSagaSupervisorTickV1: (input: Record<string, unknown>) => Promise<any>;
};

export type BuyVoidCrashConsistentSagaRuntimeDependenciesV1 = {
  derive_snapshot?: typeof deriveBuyVoidBoundedOrchestratorServerSnapshotV1;
  list_claims?: (rootDir: string) => unknown[];
  list_inventory?: (input: { root_dir: string; pool_id: string }) => unknown[];
  list_attempts?: (rootDir: string) => unknown[];
  reserve_inventory?: (input: Record<string, unknown>) => unknown | Promise<unknown>;
  run_pipeline_command?: (
    command: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  run_prepared_transaction_coordinator?:
    typeof runBuyVoidSagaPreparedTransactionCoordinatorV1;
  create_prepared_transaction_custodian?:
    typeof createBuyVoidPreparedTransactionCustodianIpcV1;
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
};

type RuntimeOptionsV1 = {
  root_dir: string;
  request_dir?: string;
  snapshot_dependencies?: BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1;
  dependencies?: BuyVoidCrashConsistentSagaRuntimeDependenciesV1;
};

type ForbiddenDecisionV1 =
  | { kind: "none" }
  | { kind: "depth"; key: typeof INPUT_NESTING_DEPTH_SENTINEL }
  | { kind: "policy"; key: string }
  | { kind: "execution"; key: string };

function enabled(): boolean {
  return /^(1|true|yes|on)$/i.test(String(process.env[ENABLE_ENV] || "").trim());
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function preparationEnabled(): boolean {
  return /^(1|true|yes|on)$/i.test(
    String(process.env[PREPARATION_ENABLE_ENV] || "").trim(),
  );
}

type PreparationCustodianConfigurationV1 =
  | {
      ok: true;
      socket_path: string;
      signer_fingerprint_sha256: string;
      missing_envs: string[];
    }
  | {
      ok: false;
      reason: string;
      missing_envs: string[];
    };

function preparationCustodianConfiguration():
  PreparationCustodianConfigurationV1 {
  const socketPath = text(process.env[CUSTODIAN_SOCKET_ENV]);
  const signerFingerprint = text(
    process.env[CUSTODIAN_SIGNER_FINGERPRINT_ENV],
  ).toLowerCase();
  const missing = [
    ...(socketPath ? [] : [CUSTODIAN_SOCKET_ENV]),
    ...(signerFingerprint ? [] : [CUSTODIAN_SIGNER_FINGERPRINT_ENV]),
  ].sort();
  if (missing.length) {
    return {
      ok: false,
      reason: "prepared_transaction_custodian_not_configured",
      missing_envs: missing,
    };
  }
  if (
    !path.isAbsolute(socketPath) ||
    socketPath.includes("\0") ||
    !SHA256.test(signerFingerprint)
  ) {
    return {
      ok: false,
      reason: "prepared_transaction_custodian_not_configured",
      missing_envs: [],
    };
  }
  return {
    ok: true,
    socket_path: path.resolve(socketPath),
    signer_fingerprint_sha256: signerFingerprint,
    missing_envs: [],
  };
}

function objectValue(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
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

function same(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

function invocationOwnerId(): string {
  return `void-buy-saga-${process.pid}-${crypto.randomBytes(16).toString("hex")}`;
}

function loopback(req: any): boolean {
  const address = text(
    req?.socket?.remoteAddress || req?.connection?.remoteAddress || req?.ip || "",
  ).toLowerCase();
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
}

function normalizedKey(value: unknown): string {
  return text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function forbiddenDecision(value: unknown, depth = 0): ForbiddenDecisionV1 {
  if (!value || typeof value !== "object") return { kind: "none" };
  if (depth > MAX_INPUT_NESTING_DEPTH) {
    return { kind: "depth", key: INPUT_NESTING_DEPTH_SENTINEL };
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = forbiddenDecision(item, depth + 1);
      if (nested.kind !== "none") return nested;
    }
    return { kind: "none" };
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizedKey(key);
    if (CALLER_POLICY_KEYS.has(normalized)) return { kind: "policy", key };
    if (CALLER_EXECUTION_KEYS.has(normalized)) {
      return { kind: "execution", key };
    }
    const nested = forbiddenDecision(child, depth + 1);
    if (nested.kind !== "none") return nested;
  }
  return { kind: "none" };
}

function absolute(value: unknown, label: string): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error(`${label}_required`);
  }
  return path.resolve(raw);
}

function requestDirectory(options: RuntimeOptionsV1): string {
  return absolute(
    options.request_dir ||
      process.env[REQUEST_DIR_ENV] ||
      path.join(process.cwd(), ".runtime", "public-buy-void-requests-v1"),
    "server_controlled_request_dir",
  );
}

function readRequest(directory: string, requestId: string): Record<string, any> {
  const file = path.join(directory, `${requestId}.json`);
  const relative = path.relative(directory, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("request_path_escape");
  }
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("request_direct_regular_file_required");
  }
  if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
    throw new Error("request_size_out_of_range");
  }
  const request = objectValue(JSON.parse(fs.readFileSync(file, "utf8")));
  if (!request || text(request.request_id) !== requestId) {
    throw new Error("request_identity_mismatch");
  }
  return request;
}

function claimReceipt(stageCommand: Record<string, unknown> | null): unknown {
  if (!stageCommand) throw new Error("claim_stage_command_required");
  const keys = Object.keys(stageCommand).sort();
  if (keys.length !== 1 || keys[0] !== "receipt") {
    throw new Error("claim_stage_command_receipt_only");
  }
  const receipt = objectValue(stageCommand.receipt);
  if (!receipt) throw new Error("claim_receipt_object_required");
  return receipt;
}

function sagaRoot(rootDir: string): string {
  return path.join(rootDir, "buy-void-crash-consistent-saga-runtime-v1");
}

async function defaultSagaModule(): Promise<SagaModuleV1> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<SagaModuleV1>;
  return dynamicImport("../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs");
}

function dependencies(
  supplied?: BuyVoidCrashConsistentSagaRuntimeDependenciesV1,
): Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1> {
  return {
    derive_snapshot: deriveBuyVoidBoundedOrchestratorServerSnapshotV1,
    list_claims: listBuyVoidFulfillmentJournalClaimsV1,
    list_inventory: listBuyVoidInventoryReservationsV1,
    list_attempts: listBuyVoidExecutionAttemptsV1,
    reserve_inventory: reserveBuyVoidInventoryV1 as any,
    run_pipeline_command: runBuyVoidPipelineCommandV1 as any,
    run_prepared_transaction_coordinator:
      runBuyVoidSagaPreparedTransactionCoordinatorV1,
    create_prepared_transaction_custodian:
      createBuyVoidPreparedTransactionCustodianIpcV1,
    load_saga_module: defaultSagaModule,
    now_ms: Date.now,
    ...(supplied || {}),
  };
}

function intentsFor(
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>,
  rootDir: string,
  requestId: string,
): BuyVoidFulfillmentJournalIntentV1[] {
  return deps
    .list_claims(rootDir)
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((value) => text(value.claim?.request_id) === requestId) as
    BuyVoidFulfillmentJournalIntentV1[];
}

function attemptsFor(
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>,
  rootDir: string,
  requestId: string,
): BuyVoidExecutionAttemptStateV1[] {
  return deps
    .list_attempts(rootDir)
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((value) => text(value.reservation?.request_id) === requestId) as
    BuyVoidExecutionAttemptStateV1[];
}

function inventoryFor(
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>,
  rootDir: string,
  requestId: string,
  poolId: string,
): BuyVoidInventoryReservationV1[] {
  return deps
    .list_inventory({ root_dir: rootDir, pool_id: poolId })
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((value) => text(value.request_id) === requestId) as
    BuyVoidInventoryReservationV1[];
}

function projectionMatchesBinding(
  value: {
    request_id?: unknown;
    canonical_payment_identity?: unknown;
    request_key_sha256?: unknown;
    payment_key_sha256?: unknown;
  },
  binding: BuyVoidCrashConsistentSagaBindingV1,
): boolean {
  return (
    text(value.request_id) === binding.request_id ||
    text(value.canonical_payment_identity) === binding.canonical_payment_identity ||
    text(value.request_key_sha256) === binding.request_key_sha256 ||
    text(value.payment_key_sha256) === binding.payment_key_sha256
  );
}

function intentsForBinding(
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>,
  rootDir: string,
  binding: BuyVoidCrashConsistentSagaBindingV1,
): BuyVoidFulfillmentJournalIntentV1[] {
  return deps
    .list_claims(rootDir)
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((value) => projectionMatchesBinding({
      request_id: value.claim?.request_id,
      canonical_payment_identity: value.claim?.canonical_payment_identity,
      request_key_sha256: value.request_key_sha256,
      payment_key_sha256: value.payment_key_sha256,
    }, binding)) as BuyVoidFulfillmentJournalIntentV1[];
}

function inventoryForBinding(
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>,
  rootDir: string,
  binding: BuyVoidCrashConsistentSagaBindingV1,
): BuyVoidInventoryReservationV1[] {
  return deps
    .list_inventory({ root_dir: rootDir, pool_id: binding.pool_id })
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((value) => projectionMatchesBinding(value, binding)) as
    BuyVoidInventoryReservationV1[];
}

function attemptsForBinding(
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>,
  rootDir: string,
  binding: BuyVoidCrashConsistentSagaBindingV1,
): BuyVoidExecutionAttemptStateV1[] {
  return deps
    .list_attempts(rootDir)
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((value) => projectionMatchesBinding(value.reservation || {}, binding)) as
    BuyVoidExecutionAttemptStateV1[];
}

function exactlyOneOrNull<T>(values: T[], label: string): T | null {
  if (values.length > 1) throw new Error(`multiple_${label}_records`);
  return values[0] || null;
}

function bindingFromIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
  poolId: string,
): BuyVoidCrashConsistentSagaBindingV1 {
  const instruction = intent.claim?.unsigned_instruction;
  return {
    request_id: text(intent.claim?.request_id),
    canonical_payment_identity: text(intent.claim?.canonical_payment_identity),
    request_key_sha256: text(intent.request_key_sha256),
    payment_key_sha256: text(intent.payment_key_sha256),
    delivery_address: text(instruction?.delivery_address).toLowerCase(),
    void_amount_units: text(instruction?.void_amount_units),
    chain_id: "2050",
    pool_id: poolId,
  };
}

function bindingFromClaim(
  claim: Record<string, any>,
  poolId: string,
): BuyVoidCrashConsistentSagaBindingV1 {
  const instruction = claim.unsigned_instruction;
  const requestId = text(claim.request_id);
  const paymentIdentity = text(claim.canonical_payment_identity);
  const hash = (value: string): string => crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
  return {
    request_id: requestId,
    canonical_payment_identity: paymentIdentity,
    request_key_sha256: hash(`void-buy-request-v1\n${requestId}`),
    payment_key_sha256: hash(`void-buy-payment-v1\n${paymentIdentity}`),
    delivery_address: text(instruction?.delivery_address).toLowerCase(),
    void_amount_units: text(instruction?.void_amount_units),
    chain_id: "2050",
    pool_id: poolId,
  };
}

function parsePositive(value: unknown): bigint | null {
  const raw = text(value);
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function assertIntentServerPolicy(
  intent: BuyVoidFulfillmentJournalIntentV1,
  serverPolicy: BuyVoidCrashConsistentSagaServerPolicyV1,
): void {
  const chain = text(intent.verification_binding?.source_chain).toLowerCase();
  const verification = serverPolicy.verification_policy;
  const fulfillment = serverPolicy.fulfillment_policy;
  if (!verification.allowed_chains.includes(chain)) {
    throw new Error("claim_server_payment_chain_conflict");
  }
  if (
    text(intent.verification_binding?.usdc_contract).toLowerCase() !==
      text(verification.usdc_contract_by_chain[chain]).toLowerCase()
  ) {
    throw new Error("claim_server_usdc_contract_conflict");
  }
  if (
    text(intent.verification_binding?.receive_address).toLowerCase() !==
      text(verification.receive_address_by_chain[chain]).toLowerCase()
  ) {
    throw new Error("claim_server_receive_address_conflict");
  }
  const observedConfirmations = parsePositive(
    intent.verification_binding?.confirmation_count_at_claim,
  );
  const requiredConfirmations = BigInt(
    fulfillment.min_confirmations_by_chain[chain] || 0,
  );
  if (
    observedConfirmations === null ||
    observedConfirmations < requiredConfirmations
  ) {
    throw new Error("claim_server_confirmation_policy_conflict");
  }
  const paidUnits = parsePositive(
    intent.verification_binding?.payment_usdc_units,
  );
  const voidUnits = parsePositive(
    intent.claim?.unsigned_instruction?.void_amount_units,
  );
  const rateNumerator = parsePositive(
    fulfillment.rate_void_units_numerator,
  );
  const rateDenominator = parsePositive(
    fulfillment.rate_void_units_denominator,
  );
  if (
    paidUnits === null ||
    voidUnits === null ||
    rateNumerator === null ||
    rateDenominator === null ||
    paidUnits * rateNumerator !== voidUnits * rateDenominator
  ) {
    throw new Error("claim_server_rate_policy_conflict");
  }
  const poolCapacity = parsePositive(
    serverPolicy.inventory_policy.pool_capacity_void_units,
  );
  if (poolCapacity === null || voidUnits > poolCapacity) {
    throw new Error("claim_server_inventory_policy_conflict");
  }
}

async function deriveBinding(input: {
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>;
  root_dir: string;
  request: Record<string, any>;
  request_id: string;
  receipt: unknown | null;
  server_policy: BuyVoidCrashConsistentSagaServerPolicyV1;
}): Promise<BuyVoidCrashConsistentSagaBindingV1> {
  const intent = exactlyOneOrNull(
    intentsFor(input.deps, input.root_dir, input.request_id),
    "claim",
  );
  if (intent) {
    assertIntentServerPolicy(intent, input.server_policy);
    return bindingFromIntent(
      intent,
      input.server_policy.inventory_policy.pool_id,
    );
  }
  if (!input.receipt) throw new Error("claim_receipt_required");
  const preview = objectValue(await input.deps.run_pipeline_command({
    action: "verify_reserve_and_claim",
    root_dir: input.root_dir,
    request: input.request,
    receipt: input.receipt,
    verification_policy: input.server_policy.verification_policy,
    fulfillment_policy: input.server_policy.fulfillment_policy,
    inventory_policy: input.server_policy.inventory_policy,
    apply: false,
  }));
  const claim = objectValue(preview?.preview?.decision?.claim);
  if (!preview || preview.ok !== true || preview.status !== "dry_run" || !claim) {
    throw new Error(`claim_preview_held:${text(preview?.reason) || "unknown"}`);
  }
  return bindingFromClaim(
    claim,
    input.server_policy.inventory_policy.pool_id,
  );
}

function assertProjection(input: {
  binding: BuyVoidCrashConsistentSagaBindingV1;
  record: any | null;
  intent: BuyVoidFulfillmentJournalIntentV1 | null;
  reservation: BuyVoidInventoryReservationV1 | null;
  attempt: BuyVoidExecutionAttemptStateV1 | null;
  server_policy: BuyVoidCrashConsistentSagaServerPolicyV1;
}): void {
  const { binding, record, intent, reservation, attempt, server_policy } = input;
  if (attempt && !record) {
    throw new Error("execution_attempt_without_saga_policy_anchor");
  }
  if (intent) {
    assertIntentServerPolicy(intent, server_policy);
    if (!same(
      bindingFromIntent(intent, server_policy.inventory_policy.pool_id),
      binding,
    )) {
      throw new Error("claim_binding_conflict");
    }
  }
  if (!intent && attempt) {
    throw new Error("projection_without_claim");
  }
  if (!intent && reservation && record) {
    throw new Error("reservation_without_claim_has_saga_anchor");
  }
  if (reservation) {
    const projected = {
      request_id: reservation.request_id,
      canonical_payment_identity: reservation.canonical_payment_identity,
      request_key_sha256: reservation.request_key_sha256,
      payment_key_sha256: reservation.payment_key_sha256,
      delivery_address: reservation.delivery_address,
      void_amount_units: reservation.reserved_void_units,
      chain_id: "2050",
      pool_id: reservation.pool_id,
    };
    if (!same(projected, binding)) throw new Error("inventory_binding_conflict");
    const reservedVoidUnits = parsePositive(reservation.reserved_void_units);
    const maximumReservation = parsePositive(
      server_policy.inventory_policy.max_reservation_void_units,
    );
    if (
      reservedVoidUnits === null ||
      maximumReservation === null ||
      reservedVoidUnits > maximumReservation
    ) {
      throw new Error("inventory_server_max_reservation_conflict");
    }
    if (
      reservation.inventory_policy_version !==
        server_policy.inventory_policy.inventory_policy_version ||
      reservation.pool_capacity_void_units !==
        text(server_policy.inventory_policy.pool_capacity_void_units)
    ) {
      throw new Error("inventory_server_policy_conflict");
    }
  }
  if (attempt) {
    if (!reservation) throw new Error("attempt_without_inventory_reservation");
    const r = attempt.reservation;
    if (
      r.request_id !== binding.request_id ||
      r.canonical_payment_identity !== binding.canonical_payment_identity ||
      r.request_key_sha256 !== binding.request_key_sha256 ||
      r.payment_key_sha256 !== binding.payment_key_sha256 ||
      r.unsigned_instruction?.delivery_address !== binding.delivery_address ||
      r.unsigned_instruction?.void_amount_units !== binding.void_amount_units ||
      r.attempt_number !== 1 ||
      r.max_attempts_per_payment !== 1
    ) throw new Error("attempt_binding_conflict");
  }
  if (!record) return;
  if (!same(record.binding, binding)) throw new Error("saga_binding_conflict");
  const initialization = record.events?.[0];
  if (
    initialization?.event_type !== "saga_initialized" ||
    initialization?.payload?.policy_id !== server_policy.saga_policy_id
  ) {
    throw new Error("saga_server_policy_fingerprint_conflict");
  }
  const state = text(record.state?.state);
  if (
    ["claimed", "inventory_reserved", "attempt_reserved", "transaction_prepared"]
      .includes(state) &&
    !intent
  ) {
    throw new Error("saga_claim_projection_missing");
  }
  if (
    ["inventory_reserved", "attempt_reserved", "transaction_prepared"]
      .includes(state) &&
    !reservation
  ) {
    throw new Error("saga_inventory_projection_missing");
  }
  if (
    ["attempt_reserved", "transaction_prepared"].includes(state) &&
    !attempt
  ) {
    throw new Error("saga_attempt_projection_missing");
  }
  if (record.state?.claim_id && record.state.claim_id !== intent?.claim?.decision_fingerprint) {
    throw new Error("saga_claim_id_conflict");
  }
  if (record.state?.reservation_id && record.state.reservation_id !== reservation?.reservation_id) {
    throw new Error("saga_inventory_id_conflict");
  }
  if (record.state?.attempt_id && record.state.attempt_id !== attempt?.reservation?.attempt_id) {
    throw new Error("saga_attempt_id_conflict");
  }
}

function recoverWithoutCreate(
  saga: SagaModuleV1,
  rootDir: string,
  sagaId: string,
): { store: SagaStoreV1 | null; record: any | null } {
  const root = sagaRoot(rootDir);
  const sagaDir = path.join(root, "sagas", sagaId);
  if (!fs.existsSync(sagaDir)) return { store: null, record: null };
  for (const dir of [root, path.join(root, "sagas"), sagaDir, path.join(sagaDir, "events")]) {
    const metadata = fs.lstatSync(dir);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error("unsafe_partial_saga_store");
    }
  }
  const store = saga.createFilesystemSagaStoreV1(root);
  return { store, record: store.recover(sagaId) };
}

function delegatedConfirmation(action: string): string | null {
  if (action === "claim_payment") {
    return VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_reserve_and_claim;
  }
  if (action === "reserve_execution_attempt") {
    return VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution;
  }
  return null;
}

type PreparedTransactionRequirementsV1 = {
  prepared_transaction_confirmation: string;
  economic_policy_fingerprint_sha256: string;
  preparation_policy_fingerprint_sha256: string;
  saga_confirmation: string;
  saga_action_confirmation: string;
  custody_confirmation: string;
  execution_journal_preparation_confirmation: string;
};

function preparedTransactionDryRequirements(input: {
  decision: Record<string, any>;
  attempt_id: string;
  saga_id: string;
  economic_policy_fingerprint_sha256: string;
  saga_confirmation: string;
  saga_action_confirmation: string;
}): PreparedTransactionRequirementsV1 {
  const decision = input.decision;
  const preparationFingerprint = text(
    decision.required_preparation_policy_fingerprint_sha256,
  ).toLowerCase();
  const preparedConfirmation = text(decision.required_confirmation);
  const sagaConfirmation = text(decision.required_saga_confirmation);
  const sagaActionConfirmation = text(
    decision.required_saga_action_confirmation,
  );
  const custodyConfirmation = text(
    decision.required_custody_confirmation,
  );
  const pipelineConfirmation = text(
    decision.required_pipeline_confirmation,
  );
  if (
    decision.ok !== true ||
    decision.status !== "dry_run" ||
    decision.applied !== false ||
    decision.mutation_performed !== false ||
    text(decision.attempt_id).toLowerCase() !== input.attempt_id ||
    text(decision.saga_id) !== input.saga_id ||
    text(decision.required_economic_policy_fingerprint_sha256) !==
      input.economic_policy_fingerprint_sha256 ||
    !SHA256.test(preparationFingerprint) ||
    !preparedConfirmation ||
    sagaConfirmation !== input.saga_confirmation ||
    sagaActionConfirmation !== input.saga_action_confirmation ||
    !custodyConfirmation ||
    !pipelineConfirmation ||
    decision.wallet_access_performed !== false ||
    decision.external_signing_performed !== false ||
    decision.transaction_broadcast_performed !== false ||
    decision.raw_signed_transaction_persisted !== false ||
    decision.raw_signed_transaction_returned !== false ||
    decision.money_movement_performed !== false
  ) {
    throw new Error("prepared_transaction_dry_binding_conflict");
  }
  return {
    prepared_transaction_confirmation: preparedConfirmation,
    economic_policy_fingerprint_sha256:
      input.economic_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256: preparationFingerprint,
    saga_confirmation: sagaConfirmation,
    saga_action_confirmation: sagaActionConfirmation,
    custody_confirmation: custodyConfirmation,
    execution_journal_preparation_confirmation: pipelineConfirmation,
  };
}

function responseStatus(reason: string): number {
  if (reason.includes("confirmation_required")) return 428;
  if (
    reason.includes("conflict") ||
    reason.includes("policy_anchor") ||
    reason.includes("multiple_") ||
    reason.includes("lease_held")
  ) return 409;
  if (reason.includes("disabled") || reason.includes("not_configured")) return 503;
  return 422;
}

export function buyVoidCrashConsistentSagaRuntimeStatusV1(): Record<string, unknown> {
  const serverPolicy = readBuyVoidCanonicalPresaleServerPolicyV1();
  const preparationCustodian = preparationCustodianConfiguration();
  return {
    marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
    version: 1,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    request_dir_env: REQUEST_DIR_ENV,
    preparation_enabled: preparationEnabled(),
    preparation_enable_env: PREPARATION_ENABLE_ENV,
    custodian_ipc_configured: preparationCustodian.ok,
    custodian_ipc_missing_envs: preparationCustodian.missing_envs,
    custodian_ipc_socket_env: CUSTODIAN_SOCKET_ENV,
    custodian_signer_fingerprint_env:
      CUSTODIAN_SIGNER_FINGERPRINT_ENV,
    server_policy_envs:
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
    action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
    required_confirmation:
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONFIRMATION_V1,
    supported_business_stages: [
      "claim_payment",
      "reserve_inventory",
      "reserve_execution_attempt",
      "prepare_transaction",
    ],
    server_policy_configured: serverPolicy.ok,
    server_policy_missing_envs:
      serverPolicy.ok ? [] : serverPolicy.missing_envs,
    server_policy_fingerprints:
      serverPolicy.ok ? serverPolicy.policy.fingerprints : null,
    server_policy_public_summary:
      serverPolicy.ok ? serverPolicy.policy.public_summary : null,
    server_policy_authority:
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_AUTHORITY_V1,
    authority: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1,
  };
}

export async function handleBuyVoidCrashConsistentSagaRuntimeCommandV1(
  req: any,
  res: any,
  options: RuntimeOptionsV1,
): Promise<unknown> {
  if (!loopback(req)) {
    return res.status(403).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      ok: false,
      error: "operator_loopback_only",
    });
  }
  if (!enabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      ok: false,
      error: "crash_consistent_saga_runtime_disabled",
      enable_env: ENABLE_ENV,
    });
  }
  const body = objectValue(req?.body);
  if (!body || text(body.action) !== VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      ok: false,
      error: "invalid_saga_runtime_command",
    });
  }
  const forbidden = forbiddenDecision(body);
  if (forbidden.kind !== "none") {
    const error = forbidden.kind === "policy"
      ? "caller_supplied_policy_forbidden"
      : forbidden.kind === "depth"
        ? "input_nesting_depth_exceeded"
        : "caller_supplied_execution_material_forbidden";
    return res.status(400).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      ok: false,
      error,
      forbidden_key: forbidden.key,
      max_input_nesting_depth: MAX_INPUT_NESTING_DEPTH,
    });
  }
  const requestId = text(body.request_id);
  if (!SAFE_REQUEST_ID.test(requestId)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      ok: false,
      error: "invalid_request_id",
    });
  }
  const stageCommand = objectValue(body.stage_command);
  const deps = dependencies(options.dependencies);

  try {
    const policyDecision = readBuyVoidCanonicalPresaleServerPolicyV1();
    if (!policyDecision.ok) {
      throw new Error(`server_policy_not_configured:${policyDecision.reason}`);
    }
    const serverPolicy = policyDecision.policy;
    const rootDir = absolute(options.root_dir, "server_controlled_root_dir");
    const requests = requestDirectory(options);
    const derived = deps.derive_snapshot({
      root_dir: rootDir,
      request_dir: requests,
      request_id: requestId,
      dependencies: options.snapshot_dependencies,
    });
    if (derived.status === "held") {
      throw new Error(`snapshot_held:${derived.reason}`);
    }
    const request = readRequest(requests, requestId);
    const saga = await deps.load_saga_module();
    const existingIntent = exactlyOneOrNull(
      intentsFor(deps, rootDir, requestId),
      "claim",
    );
    const receipt = existingIntent ? null : claimReceipt(stageCommand);
    const binding = saga.validateSagaBindingV1(await deriveBinding({
      deps,
      root_dir: rootDir,
      request,
      request_id: requestId,
      receipt,
      server_policy: serverPolicy,
    }));
    const sagaId = saga.computeSagaIdV1(binding);
    const recovered = recoverWithoutCreate(saga, rootDir, sagaId);
    const intent = exactlyOneOrNull(
      intentsForBinding(deps, rootDir, binding),
      "claim",
    );
    const reservation = exactlyOneOrNull(
      inventoryForBinding(deps, rootDir, binding),
      "inventory",
    );
    const attempt = exactlyOneOrNull(
      attemptsForBinding(deps, rootDir, binding),
      "attempt",
    );
    assertProjection({
      binding,
      record: recovered.record,
      intent,
      reservation,
      attempt,
      server_policy: serverPolicy,
    });
    const next = recovered.record
      ? saga.deriveSagaNextActionV1(recovered.record.state)
      : {
          action: "claim_payment",
          terminal: false,
          required_confirmation: saga.ACTION_CONFIRMATIONS.claim_payment,
        };
    if (next.terminal || !next.action) throw new Error("saga_terminal");
    if (
      ![
        "claim_payment",
        "reserve_inventory",
        "reserve_execution_attempt",
        "prepare_transaction",
      ].includes(next.action)
    ) {
      throw new Error(
        "next_stage_outside_prepared_transaction_runtime_boundary",
      );
    }
    if (
      next.action === "prepare_transaction" &&
      !preparationEnabled()
    ) {
      throw new Error("transaction_preparation_disabled");
    }
    if (next.action !== "claim_payment" && stageCommand) {
      throw new Error("stage_command_not_allowed_for_server_policy_stage");
    }

    if (next.action === "prepare_transaction") {
      const attemptId = text(attempt?.reservation?.attempt_id).toLowerCase();
      if (!SHA256.test(attemptId)) {
        throw new Error("prepared_transaction_attempt_id_invalid");
      }

      const dryDecision = objectValue(
        await deps.run_prepared_transaction_coordinator({
          root_dir: rootDir,
          attempt_id: attemptId,
          apply: false,
        } as RunBuyVoidSagaPreparedTransactionInputV1),
      );
      if (!dryDecision) {
        throw new Error("prepared_transaction_dry_decision_missing");
      }
      const requirements = preparedTransactionDryRequirements({
        decision: dryDecision,
        attempt_id: attemptId,
        saga_id: sagaId,
        economic_policy_fingerprint_sha256:
          serverPolicy.fingerprints.combined_policy_sha256,
        saga_confirmation: saga.ADVANCE_CONFIRMATION,
        saga_action_confirmation: text(next.required_confirmation),
      });

      if (body.apply !== true) {
        const custodianConfiguration =
          preparationCustodianConfiguration();
        return res.status(200).json({
          marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
          version: 1,
          ok: true,
          status: "dry_run",
          applied: false,
          request_id: requestId,
          saga_id: sagaId,
          saga_exists: Boolean(recovered.record),
          next_action: next.action,
          required_runtime_confirmation:
            VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONFIRMATION_V1,
          required_saga_confirmation:
            requirements.saga_confirmation,
          required_action_confirmation:
            requirements.saga_action_confirmation,
          required_prepared_transaction_confirmation:
            requirements.prepared_transaction_confirmation,
          required_policy_fingerprint_sha256:
            requirements.economic_policy_fingerprint_sha256,
          required_preparation_policy_fingerprint_sha256:
            requirements.preparation_policy_fingerprint_sha256,
          required_custody_confirmation:
            requirements.custody_confirmation,
          required_execution_journal_preparation_confirmation:
            requirements.execution_journal_preparation_confirmation,
          server_policy_fingerprints: serverPolicy.fingerprints,
          server_policy_public_summary: serverPolicy.public_summary,
          derived_snapshot: derived.snapshot,
          snapshot_evidence: derived.evidence,
          preparation_enabled: true,
          custodian_ipc_configured:
            custodianConfiguration.ok,
          application_signing_performed: false,
          external_custodian_signing_performed: false,
          transaction_broadcast_performed: false,
          money_movement_performed: false,
          authority:
            VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1,
        });
      }

      if (
        text(body.confirmation) !==
          VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONFIRMATION_V1 ||
        text(body.saga_confirmation) !==
          requirements.saga_confirmation ||
        text(body.action_confirmation) !==
          requirements.saga_action_confirmation ||
        text(body.policy_fingerprint_sha256) !==
          requirements.economic_policy_fingerprint_sha256 ||
        text(body.prepared_transaction_confirmation) !==
          requirements.prepared_transaction_confirmation ||
        text(body.preparation_policy_fingerprint_sha256) !==
          requirements.preparation_policy_fingerprint_sha256 ||
        text(body.custody_confirmation) !==
          requirements.custody_confirmation ||
        text(body.execution_journal_preparation_confirmation) !==
          requirements.execution_journal_preparation_confirmation
      ) {
        throw new Error("prepared_transaction_confirmation_required");
      }

      const custodianConfiguration =
        preparationCustodianConfiguration();
      if ("reason" in custodianConfiguration) {
        throw new Error(
          `${custodianConfiguration.reason}:${
            custodianConfiguration.missing_envs.join(",")
          }`,
        );
      }

      let custodian;
      try {
        const options:
          BuyVoidPreparedTransactionCustodianIpcOptionsV1 = {
            socket_path: custodianConfiguration.socket_path,
            expected_signer_fingerprint_sha256:
              custodianConfiguration.signer_fingerprint_sha256,
          };
        custodian =
          deps.create_prepared_transaction_custodian(options);
      } catch (error) {
        throw new Error(
          `prepared_transaction_custodian_not_configured:${
            text((error as Error)?.message || error).slice(0, 160)
          }`,
        );
      }

      const appliedDecision = objectValue(
        await deps.run_prepared_transaction_coordinator({
          root_dir: rootDir,
          attempt_id: attemptId,
          apply: true,
          confirmation:
            body.prepared_transaction_confirmation,
          economic_policy_fingerprint_sha256:
            body.policy_fingerprint_sha256,
          preparation_policy_fingerprint_sha256:
            body.preparation_policy_fingerprint_sha256,
          saga_confirmation: body.saga_confirmation,
          saga_action_confirmation:
            body.action_confirmation,
          custody_confirmation: body.custody_confirmation,
          pipeline_confirmation:
            body.execution_journal_preparation_confirmation,
          dependencies: { custodian },
        } as RunBuyVoidSagaPreparedTransactionInputV1),
      );
      if (!appliedDecision) {
        throw new Error("prepared_transaction_apply_decision_missing");
      }
      if (appliedDecision.ok !== true) {
        const delegatedReason =
          `delegated_prepared_transaction_held:${
            text(appliedDecision.reason) || "unknown"
          }`;
        return res.status(responseStatus(delegatedReason)).json({
          marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
          version: 1,
          ok: false,
          error: "crash_consistent_saga_runtime_held",
          reason: delegatedReason,
          request_id: requestId,
          saga_id: sagaId,
          attempt_id: attemptId,
          mutation_performed:
            appliedDecision.mutation_performed === true,
          external_custodian_signing_performed:
            appliedDecision.external_signing_performed === true,
          reconciliation_required:
            appliedDecision.reconciliation_required === true,
          automatic_retry: false,
          transaction_broadcast_performed: false,
          money_movement_performed: false,
          zero_money_authority: true,
        });
      }
      if (
        appliedDecision.applied !== true ||
        !["prepared", "duplicate"].includes(
          text(appliedDecision.status),
        )
      ) {
        throw new Error("prepared_transaction_apply_binding_conflict");
      }
      if (
        text(appliedDecision.attempt_id).toLowerCase() !==
          attemptId ||
        text(appliedDecision.saga_id) !== sagaId ||
        appliedDecision.wallet_access_performed !== false ||
        appliedDecision.transaction_broadcast_performed !==
          false ||
        appliedDecision.raw_signed_transaction_persisted !==
          false ||
        appliedDecision.raw_signed_transaction_returned !==
          false ||
        appliedDecision.money_movement_performed !== false
      ) {
        throw new Error(
          "prepared_transaction_apply_binding_conflict",
        );
      }
      const custody = objectValue(appliedDecision.custody);
      const plan = objectValue(appliedDecision.plan);
      const transactionHash = text(
        custody?.signed_transaction_hash,
      ).toLowerCase();
      const reservedNonce = text(plan?.nonce);
      if (
        !custody ||
        !plan ||
        !TRANSACTION_HASH.test(transactionHash) ||
        !/^(0|[1-9][0-9]*)$/.test(reservedNonce)
      ) {
        throw new Error(
          "prepared_transaction_public_projection_invalid",
        );
      }

      return res.status(200).json({
        marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
        version: 1,
        ok: true,
        status: text(appliedDecision.status),
        applied: true,
        request_id: requestId,
        saga_id: sagaId,
        attempt_id: attemptId,
        signed_transaction_hash: transactionHash,
        reserved_nonce: reservedNonce,
        server_policy_fingerprint_sha256:
          serverPolicy.fingerprints.combined_policy_sha256,
        preparation_policy_fingerprint_sha256:
          requirements.preparation_policy_fingerprint_sha256,
        restart_reconciliation_before_retry: true,
        automatic_retry: false,
        preparation_enabled: true,
        application_private_key_access_performed: false,
        application_wallet_access_performed: false,
        application_signing_performed: false,
        external_custodian_signing_performed:
          appliedDecision.external_signing_performed === true,
        inventory_decrement_performed: false,
        wallet_access_performed: false,
        signing_performed: false,
        transaction_broadcast_performed: false,
        public_fulfilled_closeout_performed: false,
        money_movement_performed: false,
        authority:
          VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1,
      });
    }

    const delegated = delegatedConfirmation(next.action);

    if (body.apply !== true) {
      return res.status(200).json({
        marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
        version: 1,
        ok: true,
        status: "dry_run",
        applied: false,
        request_id: requestId,
        saga_id: sagaId,
        saga_exists: Boolean(recovered.record),
        next_action: next.action,
        required_runtime_confirmation:
          VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONFIRMATION_V1,
        required_saga_confirmation: saga.ADVANCE_CONFIRMATION,
        required_action_confirmation: next.required_confirmation,
        required_delegated_confirmation: delegated,
        required_policy_fingerprint_sha256:
          serverPolicy.fingerprints.combined_policy_sha256,
        server_policy_fingerprints: serverPolicy.fingerprints,
        server_policy_public_summary: serverPolicy.public_summary,
        derived_snapshot: derived.snapshot,
        snapshot_evidence: derived.evidence,
        authority: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1,
      });
    }
    if (text(body.confirmation) !== VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONFIRMATION_V1) {
      throw new Error("exact_runtime_confirmation_required");
    }
    if (text(body.saga_confirmation) !== saga.ADVANCE_CONFIRMATION) {
      throw new Error("exact_saga_confirmation_required");
    }
    if (text(body.action_confirmation) !== text(next.required_confirmation)) {
      throw new Error("exact_saga_action_confirmation_required");
    }
    if (delegated && text(body.delegated_confirmation) !== delegated) {
      throw new Error("exact_delegated_confirmation_required");
    }
    if (
      text(body.policy_fingerprint_sha256) !==
        serverPolicy.fingerprints.combined_policy_sha256
    ) {
      throw new Error("exact_server_policy_fingerprint_required");
    }

    const nowMs = deps.now_ms();
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
      throw new Error("server_clock_invalid");
    }
    const adapters: Record<string, () => Promise<Record<string, unknown>>> = {
      claim_payment: async () => {
        let selected = exactlyOneOrNull(
          intentsForBinding(deps, rootDir, binding),
          "claim",
        );
        if (!selected) {
          const applied = objectValue(await deps.run_pipeline_command({
            action: "verify_reserve_and_claim",
            root_dir: rootDir,
            request,
            receipt,
            verification_policy: serverPolicy.verification_policy,
            fulfillment_policy: serverPolicy.fulfillment_policy,
            inventory_policy: serverPolicy.inventory_policy,
            apply: true,
            confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
            now_ms: nowMs,
          }));
          if (!applied || applied.ok !== true || applied.status !== "applied") {
            throw new Error(`delegated_claim_held:${text(applied?.reason) || "unknown"}`);
          }
          selected = exactlyOneOrNull(
            intentsForBinding(deps, rootDir, binding),
            "claim",
          );
        }
        if (!selected) throw new Error("claim_projection_missing_after_apply");
        assertIntentServerPolicy(selected, serverPolicy);
        if (!same(
          bindingFromIntent(selected, serverPolicy.inventory_policy.pool_id),
          binding,
        )) {
          throw new Error("claim_projection_missing_or_changed");
        }
        return {
          payload: {
            claim_id: selected.claim.decision_fingerprint,
            instruction_id: selected.claim.instruction_id,
          },
        };
      },
      reserve_inventory: async () => {
        const selectedIntent = exactlyOneOrNull(
          intentsForBinding(deps, rootDir, binding),
          "claim",
        );
        if (!selectedIntent) throw new Error("inventory_requires_claim");
        let selected = exactlyOneOrNull(
          inventoryForBinding(deps, rootDir, binding),
          "inventory",
        );
        if (!selected) {
          const applied = objectValue(await deps.reserve_inventory({
            root_dir: rootDir,
            intent: selectedIntent,
            policy: serverPolicy.inventory_policy,
            apply: true,
            now_ms: nowMs,
          }));
          if (!applied || applied.ok !== true || applied.applied !== true) {
            throw new Error(`delegated_inventory_held:${text(applied?.reason) || "unknown"}`);
          }
          selected = exactlyOneOrNull(
            inventoryForBinding(deps, rootDir, binding),
            "inventory",
          );
        }
        if (!selected) throw new Error("inventory_projection_missing_after_apply");
        return { payload: { reservation_id: selected.reservation_id } };
      },
      reserve_execution_attempt: async () => {
        const selectedIntent = exactlyOneOrNull(
          intentsForBinding(deps, rootDir, binding),
          "claim",
        );
        const selectedInventory = exactlyOneOrNull(
          inventoryForBinding(deps, rootDir, binding),
          "inventory",
        );
        if (!selectedIntent || !selectedInventory) {
          throw new Error("attempt_requires_claim_and_inventory");
        }
        let selected = exactlyOneOrNull(
          attemptsForBinding(deps, rootDir, binding),
          "attempt",
        );
        if (!selected) {
          const applied = objectValue(await deps.run_pipeline_command({
            action: "reserve_execution",
            root_dir: rootDir,
            intent: selectedIntent,
            execution_policy: serverPolicy.execution_policy,
            apply: true,
            confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
            now_ms: nowMs,
          }));
          if (!applied || applied.ok !== true || applied.status !== "applied") {
            throw new Error(`delegated_attempt_held:${text(applied?.reason) || "unknown"}`);
          }
          selected = exactlyOneOrNull(
            attemptsForBinding(deps, rootDir, binding),
            "attempt",
          );
        }
        if (!selected) throw new Error("attempt_projection_missing_after_apply");
        return {
          payload: {
            attempt_id: selected.reservation.attempt_id,
            attempt_number: selected.reservation.attempt_number,
          },
        };
      },
    };

    const store = recovered.store || saga.createFilesystemSagaStoreV1(sagaRoot(rootDir));
    const result = objectValue(await saga.runSagaSupervisorTickV1({
      store,
      binding,
      owner_id: invocationOwnerId(),
      now_ms: nowMs,
      lease_ttl_ms: LEASE_TTL_MS,
      recorded_at_utc: new Date(nowMs).toISOString(),
      source_floor_main: SOURCE_FLOOR_MAIN,
      policy_id: serverPolicy.saga_policy_id,
      apply: true,
      confirmation: body.saga_confirmation,
      action_confirmation: body.action_confirmation,
      adapters,
    }));
    if (!result || result.ok !== true || result.status !== "applied") {
      throw new Error(
        `saga_supervisor_held:${text(result?.reason) || text(result?.status) || "unknown"}`,
      );
    }
    return res.status(200).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      version: 1,
      ok: true,
      status: "applied",
      applied: true,
      request_id: requestId,
      saga_id: sagaId,
      result,
      server_policy_fingerprint_sha256:
        serverPolicy.fingerprints.combined_policy_sha256,
      restart_reconciliation_before_retry: true,
      automatic_retry: false,
      inventory_decrement_performed: false,
      wallet_access_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      public_fulfilled_closeout_performed: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1,
    });
  } catch (error) {
    const reason = text((error as Error)?.message || error).slice(0, 240);
    return res.status(responseStatus(reason)).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      ok: false,
      error: "crash_consistent_saga_runtime_held",
      reason,
      zero_money_authority: true,
    });
  }
}
