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
  type BuyVoidInventoryReservationPolicyV1,
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
  server_controlled_inventory_policy: true,
  caller_supplied_binding_forbidden: true,
  caller_supplied_intent_forbidden: true,
  one_request_per_invocation: true,
  one_business_stage_per_invocation: true,
  per_request_lease_required: true,
  monotonically_increasing_fencing_token_required: true,
  restart_reconciliation_before_retry: true,
  non_money_stage_count: 3,
  claim_write_possible: true,
  inventory_reservation_possible: true,
  execution_attempt_reservation_possible: true,
  transaction_preparation_mounted: false,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  background_loop: false,
  startup_execution: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

const ENABLE_ENV = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED";
const REQUEST_DIR_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_REQUEST_DIR";
const INVENTORY_POLICY_VERSION_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION";
const POOL_CAPACITY_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS";
const MAX_RESERVATION_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS";
const SOURCE_FLOOR_MAIN = "74f90863d738531a75eb3b4c886ad44543ae0419";
const POLICY_ID = "void-buy-void-saga-runtime-non-money-v1";
const POOL_ID = "void-fixed-price-pool-v1";
const LEASE_TTL_MS = 30_000;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;
const SAFE_ID = /^[A-Za-z0-9._:-]{3,200}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const OWNER_ID = `void-buy-saga-${process.pid}-${crypto
  .randomBytes(8)
  .toString("hex")}`;

export type BuyVoidCrashConsistentSagaBindingV1 = {
  request_id: string;
  canonical_payment_identity: string;
  request_key_sha256: string;
  payment_key_sha256: string;
  delivery_address: string;
  void_amount_units: string;
  chain_id: "2050";
  pool_id: typeof POOL_ID;
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
  load_saga_module?: () => Promise<SagaModuleV1>;
  now_ms?: () => number;
};

type RuntimeOptionsV1 = {
  root_dir: string;
  request_dir?: string;
  snapshot_dependencies?: BuyVoidBoundedOrchestratorServerSnapshotDependenciesV1;
  dependencies?: BuyVoidCrashConsistentSagaRuntimeDependenciesV1;
};

function enabled(): boolean {
  return /^(1|true|yes|on)$/i.test(String(process.env[ENABLE_ENV] || "").trim());
}
function text(value: unknown): string {
  return String(value ?? "").trim();
}
function objectValue(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}
function hash(value: string): string {
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
function same(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}
function loopback(req: any): boolean {
  const address = text(
    req?.socket?.remoteAddress || req?.connection?.remoteAddress || req?.ip || "",
  ).toLowerCase();
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
}
function forbiddenKey(value: unknown, depth = 0): string {
  if (!value || typeof value !== "object" || depth > 16) return "";
  const forbidden = new Set([
    "binding", "intent", "request", "snapshot", "rootdir", "requestdir",
    "privatekey", "mnemonic", "seedphrase", "rawtransaction",
    "rawsignedtransaction", "signedtransaction", "walletsecret", "keystore",
    "rpcurl", "broadcasturl",
  ]);
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = forbiddenKey(item, depth + 1);
      if (nested) return nested;
    }
    return "";
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (forbidden.has(normalized)) return key;
    const nested = forbiddenKey(child, depth + 1);
    if (nested) return nested;
  }
  return "";
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
function positiveEnv(name: string): string {
  const value = text(process.env[name]);
  if (!DECIMAL.test(value) || BigInt(value) <= 0n) {
    throw new Error(`${name.toLowerCase()}_required`);
  }
  return value;
}
function inventoryPolicy(): BuyVoidInventoryReservationPolicyV1 {
  const version = text(process.env[INVENTORY_POLICY_VERSION_ENV]);
  if (!SAFE_ID.test(version)) throw new Error("inventory_policy_version_required");
  const capacity = positiveEnv(POOL_CAPACITY_ENV);
  const maximum = positiveEnv(MAX_RESERVATION_ENV);
  if (BigInt(maximum) > BigInt(capacity)) {
    throw new Error("inventory_reservation_cap_exceeds_capacity");
  }
  return {
    inventory_reservation_enabled: true,
    pool_id: POOL_ID,
    inventory_policy_version: version,
    pool_capacity_void_units: capacity,
    max_reservation_void_units: maximum,
  };
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
): BuyVoidInventoryReservationV1[] {
  return deps
    .list_inventory({ root_dir: rootDir, pool_id: POOL_ID })
    .map(objectValue)
    .filter((value): value is Record<string, any> => Boolean(value))
    .filter((value) => text(value.request_id) === requestId) as
    BuyVoidInventoryReservationV1[];
}
function exactlyOneOrNull<T>(values: T[], label: string): T | null {
  if (values.length > 1) throw new Error(`multiple_${label}_records`);
  return values[0] || null;
}
function bindingFromIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
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
    pool_id: POOL_ID,
  };
}
function bindingFromClaim(claim: Record<string, any>): BuyVoidCrashConsistentSagaBindingV1 {
  const instruction = claim.unsigned_instruction;
  const requestId = text(claim.request_id);
  const paymentIdentity = text(claim.canonical_payment_identity);
  return {
    request_id: requestId,
    canonical_payment_identity: paymentIdentity,
    request_key_sha256: hash(`void-buy-request-v1\n${requestId}`),
    payment_key_sha256: hash(`void-buy-payment-v1\n${paymentIdentity}`),
    delivery_address: text(instruction?.delivery_address).toLowerCase(),
    void_amount_units: text(instruction?.void_amount_units),
    chain_id: "2050",
    pool_id: POOL_ID,
  };
}
async function deriveBinding(input: {
  deps: Required<BuyVoidCrashConsistentSagaRuntimeDependenciesV1>;
  root_dir: string;
  request: Record<string, any>;
  request_id: string;
  stage_command: Record<string, unknown> | null;
}): Promise<BuyVoidCrashConsistentSagaBindingV1> {
  const intent = exactlyOneOrNull(
    intentsFor(input.deps, input.root_dir, input.request_id),
    "claim",
  );
  if (intent) return bindingFromIntent(intent);
  if (!input.stage_command) throw new Error("claim_stage_command_required");
  const preview = objectValue(await input.deps.run_pipeline_command({
    ...input.stage_command,
    action: "verify_and_claim",
    root_dir: input.root_dir,
    request: input.request,
    apply: false,
  }));
  const claim = objectValue(preview?.preview?.decision?.claim);
  if (!preview || preview.ok !== true || preview.status !== "dry_run" || !claim) {
    throw new Error(`claim_preview_held:${text(preview?.reason) || "unknown"}`);
  }
  return bindingFromClaim(claim);
}
function assertProjection(input: {
  binding: BuyVoidCrashConsistentSagaBindingV1;
  record: any | null;
  intent: BuyVoidFulfillmentJournalIntentV1 | null;
  reservation: BuyVoidInventoryReservationV1 | null;
  attempt: BuyVoidExecutionAttemptStateV1 | null;
}): void {
  const { binding, record, intent, reservation, attempt } = input;
  if (intent && !same(bindingFromIntent(intent), binding)) {
    throw new Error("claim_binding_conflict");
  }
  if (!intent && (reservation || attempt)) throw new Error("projection_without_claim");
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
      r.attempt_number !== 1
    ) throw new Error("attempt_binding_conflict");
  }
  if (!record) return;
  if (!same(record.binding, binding)) throw new Error("saga_binding_conflict");
  const state = text(record.state?.state);
  if (["claimed", "inventory_reserved", "attempt_reserved"].includes(state) && !intent) {
    throw new Error("saga_claim_projection_missing");
  }
  if (["inventory_reserved", "attempt_reserved"].includes(state) && !reservation) {
    throw new Error("saga_inventory_projection_missing");
  }
  if (state === "attempt_reserved" && !attempt) {
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
    return VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim;
  }
  if (action === "reserve_execution_attempt") {
    return VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution;
  }
  return null;
}
function responseStatus(reason: string): number {
  if (reason.includes("confirmation_required")) return 428;
  if (reason.includes("conflict") || reason.includes("multiple_")) return 409;
  if (reason.includes("disabled") || reason.includes("required")) return 503;
  return 422;
}

export function buyVoidCrashConsistentSagaRuntimeStatusV1(): Record<string, unknown> {
  let policy: Record<string, unknown> | null = null;
  let policyError: string | null = null;
  try {
    policy = inventoryPolicy() as unknown as Record<string, unknown>;
  } catch (error) {
    policyError = text((error as Error)?.message || error);
  }
  return {
    marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
    version: 1,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    request_dir_env: REQUEST_DIR_ENV,
    action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
    required_confirmation:
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_CONFIRMATION_V1,
    supported_business_stages: [
      "claim_payment",
      "reserve_inventory",
      "reserve_execution_attempt",
    ],
    server_inventory_policy: policy,
    server_inventory_policy_error: policyError,
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
  const forbidden = forbiddenKey(body);
  if (forbidden) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      ok: false,
      error: "caller_supplied_execution_material_forbidden",
      forbidden_key: forbidden,
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
    const policy = inventoryPolicy();
    const saga = await deps.load_saga_module();
    const binding = saga.validateSagaBindingV1(await deriveBinding({
      deps,
      root_dir: rootDir,
      request,
      request_id: requestId,
      stage_command: stageCommand,
    }));
    const sagaId = saga.computeSagaIdV1(binding);
    const recovered = recoverWithoutCreate(saga, rootDir, sagaId);
    const intent = exactlyOneOrNull(intentsFor(deps, rootDir, requestId), "claim");
    const reservation = exactlyOneOrNull(inventoryFor(deps, rootDir, requestId), "inventory");
    const attempt = exactlyOneOrNull(attemptsFor(deps, rootDir, requestId), "attempt");
    assertProjection({ binding, record: recovered.record, intent, reservation, attempt });
    const next = recovered.record
      ? saga.deriveSagaNextActionV1(recovered.record.state)
      : {
          action: "claim_payment",
          terminal: false,
          required_confirmation: saga.ACTION_CONFIRMATIONS.claim_payment,
        };
    if (next.terminal || !next.action) throw new Error("saga_terminal");
    if (!["claim_payment", "reserve_inventory", "reserve_execution_attempt"].includes(next.action)) {
      throw new Error("next_stage_outside_non_money_runtime_boundary");
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
        derived_snapshot: derived.snapshot,
        snapshot_evidence: derived.evidence,
        server_inventory_policy: policy,
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
    if (["claim_payment", "reserve_execution_attempt"].includes(next.action) && !stageCommand) {
      throw new Error("stage_command_required");
    }

    const nowMs = deps.now_ms();
    if (!Number.isSafeInteger(nowMs) || nowMs <= 0) throw new Error("server_clock_invalid");
    const adapters: Record<string, () => Promise<Record<string, unknown>>> = {
      claim_payment: async () => {
        let selected = exactlyOneOrNull(intentsFor(deps, rootDir, requestId), "claim");
        if (!selected) {
          const applied = objectValue(await deps.run_pipeline_command({
            ...(stageCommand || {}),
            action: "verify_and_claim",
            root_dir: rootDir,
            request,
            apply: true,
            confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
            now_ms: nowMs,
          }));
          if (!applied || applied.ok !== true || applied.status !== "applied") {
            throw new Error(`delegated_claim_held:${text(applied?.reason) || "unknown"}`);
          }
          selected = exactlyOneOrNull(intentsFor(deps, rootDir, requestId), "claim");
        }
        if (!selected || !same(bindingFromIntent(selected), binding)) {
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
        const selectedIntent = exactlyOneOrNull(intentsFor(deps, rootDir, requestId), "claim");
        if (!selectedIntent) throw new Error("inventory_requires_claim");
        let selected = exactlyOneOrNull(inventoryFor(deps, rootDir, requestId), "inventory");
        if (!selected) {
          const applied = objectValue(await deps.reserve_inventory({
            root_dir: rootDir,
            intent: selectedIntent,
            policy,
            apply: true,
            now_ms: nowMs,
          }));
          if (!applied || applied.ok !== true || applied.applied !== true) {
            throw new Error(`delegated_inventory_held:${text(applied?.reason) || "unknown"}`);
          }
          selected = exactlyOneOrNull(inventoryFor(deps, rootDir, requestId), "inventory");
        }
        if (!selected) throw new Error("inventory_projection_missing_after_apply");
        return { payload: { reservation_id: selected.reservation_id } };
      },
      reserve_execution_attempt: async () => {
        const selectedIntent = exactlyOneOrNull(intentsFor(deps, rootDir, requestId), "claim");
        const selectedInventory = exactlyOneOrNull(inventoryFor(deps, rootDir, requestId), "inventory");
        if (!selectedIntent || !selectedInventory) {
          throw new Error("attempt_requires_claim_and_inventory");
        }
        let selected = exactlyOneOrNull(attemptsFor(deps, rootDir, requestId), "attempt");
        if (!selected) {
          const applied = objectValue(await deps.run_pipeline_command({
            ...(stageCommand || {}),
            action: "reserve_execution",
            root_dir: rootDir,
            intent: selectedIntent,
            apply: true,
            confirmation: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.reserve_execution,
            now_ms: nowMs,
          }));
          if (!applied || applied.ok !== true || applied.status !== "applied") {
            throw new Error(`delegated_attempt_held:${text(applied?.reason) || "unknown"}`);
          }
          selected = exactlyOneOrNull(attemptsFor(deps, rootDir, requestId), "attempt");
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
    const result = await saga.runSagaSupervisorTickV1({
      store,
      binding,
      owner_id: OWNER_ID,
      now_ms: nowMs,
      lease_ttl_ms: LEASE_TTL_MS,
      recorded_at_utc: new Date(nowMs).toISOString(),
      source_floor_main: SOURCE_FLOOR_MAIN,
      policy_id: POLICY_ID,
      apply: true,
      confirmation: body.saga_confirmation,
      action_confirmation: body.action_confirmation,
      adapters,
    });
    return res.status(200).json({
      marker: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1,
      version: 1,
      ok: true,
      status: "applied",
      applied: true,
      request_id: requestId,
      saga_id: sagaId,
      result,
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
