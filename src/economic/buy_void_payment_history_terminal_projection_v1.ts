import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

import {
  lookupBuyVoidHistoryIndexV1,
  verifyBuyVoidHistoryCarrierRootV1,
  type BuyVoidHistoryCarrierRootV1,
} from "./buy_void_history_carrier_v1.js";
import {
  projectBuyVoidPaymentHistoryV1,
} from "./buy_void_payment_history_projection_v1.js";
import {
  readTerminalCloseoutPlanV1,
} from "./buy_void_saga_terminal_closeout_artifacts_v1.js";
import {
  TERMINAL_CLOSEOUT_ADDRESS,
  TERMINAL_CLOSEOUT_ROOT,
  TERMINAL_CLOSEOUT_SAFE_ID,
  TERMINAL_CLOSEOUT_SAGA_ID,
  TERMINAL_CLOSEOUT_SAGA_ROOT,
  TERMINAL_CLOSEOUT_SHA256,
  TERMINAL_CLOSEOUT_TX_HASH,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
  terminalCanonical,
  terminalFingerprint,
  terminalText,
  type BuyVoidSagaTerminalCloseoutPlanV1,
} from "./buy_void_saga_terminal_closeout_model_v1.js";

export const VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1 =
  "VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1";

export const VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_EVENTS_V1 = 64;
export const VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_EVENT_BYTES_V1 =
  1024 * 1024;
export const VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_BYTES_V1 =
  8 * 1024 * 1024;
export const VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SIDECAR_BYTES_V1 =
  1024 * 1024;

export const VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_AUTHORITY_V1 = {
  source_only_projection: true,
  carrier_membership_required: true,
  current_carrier_lifecycle_fingerprint_required: true,
  inventory_consumed_required: true,
  deterministic_terminal_plan_required: true,
  terminal_plan_fingerprint_recomputed: true,
  terminal_inventory_fingerprint_recomputed: true,
  terminal_closeout_id_recomputed: true,
  public_event_fingerprint_recomputed: true,
  deterministic_public_sidecar_required: true,
  shared_operator_event_journal_scan_required: false,
  bounded_saga_event_count_pre_admission: true,
  maximum_saga_events:
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_EVENTS_V1,
  bounded_saga_event_file_bytes: true,
  bounded_saga_total_bytes: true,
  saga_event_hash_chain_revalidated: true,
  saga_closed_state_required: true,
  closeout_committed_last_event_required: true,
  public_fulfilled_terminal_closed_projection: true,
  carrier_root_mutation: false,
  history_carrier_successor_created: false,
  caller_request_dir_mount_authority: false,
  caller_read_page_content_authority: false,
  full_history_scan: false,
  filesystem_read: true,
  filesystem_write: false,
  saga_mutation: false,
  public_request_mutation: false,
  runtime_activation: false,
  automatic_retry: false,
  credential_access: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  inventory_funding: false,
  treasury_or_liquidity_action: false,
  money_movement: false,
} as const;

const FATAL_UTF8 = new TextDecoder("utf-8", { fatal: true });
const EVENT_FILE =
  /^(\d{8})-(voidbvfsge1_[0-9a-f]{64})\.json$/u;
const EVENT_TEMP_FILE =
  /^(\d{8})-(voidbvfsge1_[0-9a-f]{64})\.json\.tmp-[0-9]+-[0-9a-f]{16}$/u;

type SagaModuleV1 = {
  validateSagaEventV1: (value: unknown) => Record<string, any>;
  foldSagaEventsV1: (events: unknown[]) => Record<string, any>;
};

type StableReadV1 = {
  value: Record<string, any>;
  bytes: Buffer;
  sha256: string;
};

export type BuyVoidPaymentHistoryTerminalProjectionV1 = {
  marker: typeof VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1;
  version: 1;
  pool_id: string;
  payment_key_sha256: string;
  carrier_root_sha256: string;
  carrier_index_root_sha256: string;
  carrier_payment_history_fingerprint_sha256: string;
  payment_history_fingerprint_sha256: string;
  primary_record_fingerprint_sha256: string;
  lifecycle_state: "public_fulfilled_terminal_closed";
  request_id: string;
  instruction_id: string;
  canonical_payment_identity: string;
  delivery_address: string;
  void_amount_units: string;
  reservation_id: string;
  execution_attempt_id: string;
  void_delivery_tx_hash: string;
  inventory_consumption_id: string;
  inventory_consumption_fingerprint_sha256: string;
  closeout_record_sha256: string;
  saga_id: string;
  closeout_id: string;
  terminal_plan_fingerprint_sha256: string;
  terminal_inventory_fingerprint_sha256: string;
  public_event_fingerprint_sha256: string;
  public_sidecar_sha256: string;
  canonical_confirmed_state_id: string;
  canonical_confirmed_state_fingerprint: string;
  saga_event_count: number;
  saga_last_event_id: string;
  carrier_root_mutation_performed: false;
  filesystem_write_performed: false;
  saga_mutation_performed: false;
  public_request_mutation_performed: false;
  automatic_retry_allowed: false;
  money_movement_performed: false;
  authority: typeof VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_AUTHORITY_V1;
};

function fail(code: string, detail: string): never {
  throw new Error(
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1 +
      ":" +
      code +
      ":" +
      detail,
  );
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeRoot(value: unknown, code: string): string {
  const raw = terminalText(value);
  if (
    !raw ||
    raw.includes("\0") ||
    !path.isAbsolute(raw)
  ) {
    fail(code, raw || "empty");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    fail(code, resolved);
  }
  return resolved;
}

function assertNoSymlinkPathComponents(
  target: string,
  label: string,
): string {
  const resolved = path.resolve(target);
  const filesystemRoot = path.parse(resolved).root;
  const relative = path.relative(filesystemRoot, resolved);
  let current = filesystemRoot;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let metadata: fs.Stats;
    try {
      metadata = fs.lstatSync(current);
    } catch (error) {
      fail(
        label + "_PATH_COMPONENT_MISSING",
        current +
          ":" +
          terminalText((error as Error)?.message || error).slice(0, 160),
      );
    }
    if (metadata.isSymbolicLink()) {
      fail(label + "_SYMLINK_COMPONENT_FORBIDDEN", current);
    }
  }
  return resolved;
}

function assertDirectory(
  directory: string,
  label: string,
  privateDirectory: boolean,
): string {
  const resolved = assertNoSymlinkPathComponents(directory, label);
  let metadata: fs.Stats;
  try {
    metadata = fs.lstatSync(resolved);
  } catch (error) {
    fail(
      label + "_DIRECTORY_MISSING",
      terminalText((error as Error)?.message || error).slice(0, 160),
    );
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail(label + "_DIRECTORY_INVALID", resolved);
  }
  if (
    privateDirectory &&
    (
      (
        typeof process.getuid === "function" &&
        metadata.uid !== process.getuid()
      ) ||
      (metadata.mode & 0o077) !== 0
    )
  ) {
    fail(label + "_DIRECTORY_AUTHORITY_MISMATCH", resolved);
  }
  return resolved;
}

function readStableJson(
  file: string,
  label: string,
  maximumBytes: number,
): StableReadV1 {
  let fd: number | null = null;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_RDONLY |
        ((fs.constants as any).O_NOFOLLOW || 0),
    );
  } catch (error) {
    fail(
      label + "_OPEN_FAILED",
      terminalText((error as Error)?.message || error).slice(0, 160),
    );
  }
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      before.size <= 0n ||
      before.size > BigInt(maximumBytes)
    ) {
      fail(label + "_FILE_SHAPE_INVALID", String(before.size));
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      BigInt(bytes.length) !== before.size
    ) {
      fail(label + "_FILE_CHANGED_DURING_READ", file);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(FATAL_UTF8.decode(bytes));
    } catch {
      fail(label + "_JSON_INVALID", file);
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      fail(label + "_OBJECT_REQUIRED", file);
    }
    return {
      value: parsed as Record<string, any>,
      bytes,
      sha256: sha256(bytes),
    };
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

async function defaultSagaModule(): Promise<SagaModuleV1> {
  return await import(
    new URL(
      "../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  ) as unknown as SagaModuleV1;
}

async function readClosedSaga(input: {
  root_dir: string;
  saga_id: string;
  plan: BuyVoidSagaTerminalCloseoutPlanV1;
  expected_binding: {
    request_id: string;
    canonical_payment_identity: string;
    request_key_sha256: string;
    payment_key_sha256: string;
    delivery_address: string;
    void_amount_units: string;
    pool_id: string;
  };
  load_saga_module?: () => Promise<SagaModuleV1>;
}): Promise<{
  event_count: number;
  last_event_id: string;
}> {
  const sagaId = terminalText(input.saga_id).toLowerCase();
  if (!TERMINAL_CLOSEOUT_SAGA_ID.test(sagaId)) {
    fail("SAGA_ID_INVALID", sagaId || "empty");
  }

  const sagaRoot = assertDirectory(
    path.join(input.root_dir, TERMINAL_CLOSEOUT_SAGA_ROOT),
    "SAGA_ROOT",
    true,
  );
  const sagasRoot = assertDirectory(
    path.join(sagaRoot, "sagas"),
    "SAGAS_ROOT",
    true,
  );
  const selectedSaga = assertDirectory(
    path.join(sagasRoot, sagaId),
    "SAGA_DIRECTORY",
    true,
  );
  const eventsDir = assertDirectory(
    path.join(selectedSaga, "events"),
    "SAGA_EVENTS_DIRECTORY",
    true,
  );

  const entries = fs.readdirSync(eventsDir, { withFileTypes: true });
  const files: Array<{
    name: string;
    sequence: number;
    event_id: string;
    size: number;
  }> = [];

  for (const entry of entries) {
    if (EVENT_TEMP_FILE.test(entry.name)) {
      if (!entry.isFile() || entry.isSymbolicLink()) {
        fail("SAGA_TEMP_EVENT_INVALID", entry.name);
      }
      continue;
    }
    const match = EVENT_FILE.exec(entry.name);
    if (
      !match ||
      !entry.isFile() ||
      entry.isSymbolicLink()
    ) {
      fail("SAGA_EVENT_DIRECTORY_ENTRY_INVALID", entry.name);
    }
    files.push({
      name: entry.name,
      sequence: Number(match[1]),
      event_id: match[2],
      size: 0,
    });
  }

  if (
    files.length < 1 ||
    files.length >
      VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_EVENTS_V1
  ) {
    fail("SAGA_EVENT_COUNT_OUT_OF_RANGE", String(files.length));
  }

  files.sort(
    (left, right) =>
      left.sequence - right.sequence ||
      left.name.localeCompare(right.name),
  );
  let totalBytes = 0;
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (file.sequence !== index) {
      fail("SAGA_EVENT_SEQUENCE_GAP_OR_DUPLICATE", file.name);
    }
    const fullPath = path.join(eventsDir, file.name);
    const metadata = fs.lstatSync(fullPath);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.size < 1 ||
      metadata.size >
        VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_EVENT_BYTES_V1
    ) {
      fail("SAGA_EVENT_FILE_SHAPE_INVALID", file.name);
    }
    totalBytes += metadata.size;
    if (
      totalBytes >
        VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SAGA_BYTES_V1
    ) {
      fail("SAGA_EVENT_TOTAL_BYTES_EXCEEDED", String(totalBytes));
    }
    file.size = metadata.size;
  }

  const saga =
    await (input.load_saga_module || defaultSagaModule)();
  const events = files.map((file) => {
    const read = readStableJson(
      path.join(eventsDir, file.name),
      "SAGA_EVENT",
      VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_EVENT_BYTES_V1,
    );
    let validated: Record<string, any>;
    try {
      validated = saga.validateSagaEventV1(read.value);
    } catch (error) {
      fail(
        "SAGA_EVENT_VALIDATION_FAILED",
        file.name +
          ":" +
          terminalText((error as Error)?.message || error).slice(0, 200),
      );
    }
    if (
      validated.sequence !== file.sequence ||
      validated.event_id !== file.event_id
    ) {
      fail("SAGA_EVENT_FILENAME_BINDING_INVALID", file.name);
    }
    return validated;
  });

  let state: Record<string, any>;
  try {
    state = saga.foldSagaEventsV1(events);
  } catch (error) {
    fail(
      "SAGA_FOLD_FAILED",
      terminalText((error as Error)?.message || error).slice(0, 220),
    );
  }

  const last = events[events.length - 1];
  const binding = state.binding || last.binding || {};
  const expected = input.expected_binding;
  if (
    state.state !== "closed" ||
    state.terminal !== true ||
    state.receipt_status !== 1 ||
    state.event_count !== events.length ||
    terminalText(state.saga_id) !== sagaId ||
    terminalText(state.attempt_id) !== input.plan.attempt_id ||
    terminalText(state.transaction_hash).toLowerCase() !==
      input.plan.transaction_hash ||
    terminalText(state.closeout_id) !== input.plan.closeout_id ||
    last.event_type !== "closeout_committed" ||
    terminalText(last.payload?.attempt_id) !== input.plan.attempt_id ||
    terminalText(last.payload?.transaction_hash).toLowerCase() !==
      input.plan.transaction_hash ||
    terminalText(last.payload?.closeout_id) !== input.plan.closeout_id ||
    last.payload?.inventory_decremented !== true ||
    last.payload?.public_request_fulfilled !== true ||
    terminalText(binding.request_id) !== expected.request_id ||
    terminalText(binding.canonical_payment_identity) !==
      expected.canonical_payment_identity ||
    terminalText(binding.request_key_sha256) !==
      expected.request_key_sha256 ||
    terminalText(binding.payment_key_sha256) !==
      expected.payment_key_sha256 ||
    terminalText(binding.delivery_address).toLowerCase() !==
      expected.delivery_address ||
    terminalText(binding.void_amount_units) !== expected.void_amount_units ||
    terminalText(binding.chain_id) !== "2050" ||
    terminalText(binding.pool_id) !== expected.pool_id
  ) {
    fail("SAGA_CLOSED_BINDING_INVALID", sagaId);
  }

  return {
    event_count: events.length,
    last_event_id: terminalText(last.event_id),
  };
}

function requireTerminalPlanBindings(input: {
  plan: BuyVoidSagaTerminalCloseoutPlanV1;
  payment: ReturnType<typeof projectBuyVoidPaymentHistoryV1>;
}): {
  terminal_inventory_fingerprint_sha256: string;
  public_event_fingerprint_sha256: string;
} {
  const { plan, payment } = input;
  const closeout = payment.closeout;
  if (
    payment.primary_kind !== "reservation" ||
    payment.lifecycle_state !== "inventory_consumed" ||
    !closeout
  ) {
    fail("PAYMENT_NOT_INVENTORY_CONSUMED", payment.payment_key_sha256);
  }

  const stateId = terminalText(plan.canonical_confirmed_state_id);
  const stateFingerprint =
    terminalText(plan.canonical_confirmed_state_fingerprint);
  const policyFingerprint =
    terminalText(plan.server_policy_fingerprint_sha256);
  if (
    !TERMINAL_CLOSEOUT_SHA256.test(stateId) ||
    !TERMINAL_CLOSEOUT_SHA256.test(stateFingerprint) ||
    !TERMINAL_CLOSEOUT_SHA256.test(policyFingerprint)
  ) {
    fail("TERMINAL_PLAN_CONFIRMED_STATE_INVALID", plan.attempt_id);
  }

  const base = plan.base_closeout_plan;
  const baseConsumption = base?.inventory_consumption;
  const basePublic = base?.public_closeout_event;
  if (
    plan.marker !== VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1 ||
    plan.version !== 1 ||
    plan.request_id !== payment.request_id ||
    plan.attempt_id !== closeout.execution_attempt_id ||
    plan.reservation_id !== payment.primary_record_id ||
    plan.transaction_hash !== closeout.void_delivery_tx_hash ||
    base?.attempt_id !== plan.attempt_id ||
    base?.request_id !== payment.request_id ||
    base?.reservation_id !== payment.primary_record_id ||
    base?.void_delivery_tx_hash !== closeout.void_delivery_tx_hash ||
    baseConsumption?.consumption_id !== closeout.consumption_id ||
    baseConsumption?.consumption_fingerprint_sha256 !==
      closeout.consumption_fingerprint_sha256 ||
    baseConsumption?.execution_attempt_id !== closeout.execution_attempt_id ||
    baseConsumption?.reservation_id !== payment.primary_record_id ||
    baseConsumption?.canonical_payment_identity !==
      payment.canonical_payment_identity ||
    baseConsumption?.request_id !== payment.request_id ||
    baseConsumption?.instruction_id !== payment.instruction_id ||
    terminalText(baseConsumption?.delivery_address).toLowerCase() !==
      payment.delivery_address ||
    terminalText(baseConsumption?.void_delivery_tx_hash).toLowerCase() !==
      closeout.void_delivery_tx_hash ||
    terminalText(baseConsumption?.consumed_void_units) !==
      payment.void_amount_units ||
    basePublic?.request_id !== payment.request_id ||
    basePublic?.execution_attempt_id !== closeout.execution_attempt_id ||
    basePublic?.inventory_reservation_id !== payment.primary_record_id ||
    basePublic?.inventory_consumption_id !== closeout.consumption_id ||
    basePublic?.inventory_consumption_fingerprint_sha256 !==
      closeout.consumption_fingerprint_sha256 ||
    basePublic?.canonical_payment_identity !==
      payment.canonical_payment_identity ||
    basePublic?.instruction_id !== payment.instruction_id ||
    terminalText(basePublic?.delivery_address).toLowerCase() !==
      payment.delivery_address ||
    terminalText(basePublic?.void_delivery_tx_hash).toLowerCase() !==
      closeout.void_delivery_tx_hash ||
    basePublic?.operator_status !== "fulfilled"
  ) {
    fail("TERMINAL_PLAN_BASE_BINDING_INVALID", plan.attempt_id);
  }

  const terminalInventoryFingerprint = terminalFingerprint({
    schema: "void_buy_void_saga_terminal_inventory_consumption_v1",
    saga_id: plan.saga_id,
    attempt_id: plan.attempt_id,
    reservation_id: plan.reservation_id,
    transaction_hash: plan.transaction_hash,
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    inventory_consumption_id: closeout.consumption_id,
    inventory_consumption_fingerprint_sha256:
      closeout.consumption_fingerprint_sha256,
  });
  const expectedCloseoutId = terminalFingerprint({
    schema: "void_buy_void_saga_terminal_closeout_id_v1",
    saga_id: plan.saga_id,
    attempt_id: plan.attempt_id,
    reservation_id: plan.reservation_id,
    transaction_hash: plan.transaction_hash,
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    inventory_terminal_fingerprint_sha256:
      terminalInventoryFingerprint,
    server_policy_fingerprint_sha256: policyFingerprint,
  });
  if (
    plan.closeout_id !== expectedCloseoutId ||
    plan.inventory_consumption?.terminal_closeout_fingerprint_sha256 !==
      terminalInventoryFingerprint ||
    plan.inventory_consumption?.closeout_id !== plan.closeout_id ||
    plan.inventory_consumption?.saga_id !== plan.saga_id ||
    plan.inventory_consumption?.canonical_confirmed_state_id !== stateId ||
    plan.inventory_consumption
      ?.canonical_confirmed_state_fingerprint !== stateFingerprint ||
    plan.inventory_consumption
      ?.canonical_confirmed_state_completion_final !== true
  ) {
    fail("TERMINAL_INVENTORY_BINDING_INVALID", plan.attempt_id);
  }

  const publicBase = {
    ...plan.base_closeout_plan.public_closeout_event,
    terminal_closeout_schema:
      "void_buy_void_saga_terminal_closeout_event_v1" as const,
    terminal_closeout_marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
    terminal_closeout_version: 1 as const,
    saga_id: plan.saga_id,
    closeout_id: plan.closeout_id,
    canonical_confirmed_state_id: stateId,
    canonical_confirmed_state_fingerprint: stateFingerprint,
    canonical_confirmed_state_completion_final: true as const,
    inventory_consumption_terminal_fingerprint_sha256:
      terminalInventoryFingerprint,
  };
  const publicEventFingerprint = terminalFingerprint(publicBase);
  const expectedPublic = {
    ...publicBase,
    public_event_fingerprint_sha256: publicEventFingerprint,
  };
  if (
    terminalCanonical(plan.public_closeout_event) !==
      terminalCanonical(expectedPublic)
  ) {
    fail("TERMINAL_PUBLIC_EVENT_BINDING_INVALID", plan.attempt_id);
  }

  return {
    terminal_inventory_fingerprint_sha256:
      terminalInventoryFingerprint,
    public_event_fingerprint_sha256: publicEventFingerprint,
  };
}

export async function projectBuyVoidPaymentHistoryTerminalV1(input: {
  root_dir: string;
  request_dir: string;
  pool_id: string;
  payment_key_sha256: string;
  carrier_root: BuyVoidHistoryCarrierRootV1;
  read_page: (sha256: string) => Buffer;
  dependencies?: {
    load_saga_module?: () => Promise<SagaModuleV1>;
  };
}): Promise<BuyVoidPaymentHistoryTerminalProjectionV1> {
  const rootDir = safeRoot(input?.root_dir, "RUNTIME_ROOT_INVALID");
  const requestDir = assertDirectory(
    safeRoot(input?.request_dir, "REQUEST_ROOT_INVALID"),
    "REQUEST_ROOT",
    false,
  );
  const poolId = terminalText(input?.pool_id);
  const paymentKey = terminalText(input?.payment_key_sha256).toLowerCase();
  if (!TERMINAL_CLOSEOUT_SAFE_ID.test(poolId)) {
    fail("POOL_ID_INVALID", poolId || "empty");
  }
  if (!TERMINAL_CLOSEOUT_SHA256.test(paymentKey)) {
    fail("PAYMENT_KEY_INVALID", paymentKey || "empty");
  }
  if (typeof input?.read_page !== "function") {
    fail("READ_PAGE_REQUIRED", paymentKey);
  }

  const carrier = verifyBuyVoidHistoryCarrierRootV1(input.carrier_root);
  if (carrier.pool_id !== poolId) {
    fail("CARRIER_POOL_MISMATCH", carrier.pool_id);
  }
  const lookup = lookupBuyVoidHistoryIndexV1(
    carrier.payment_index_root_sha256,
    paymentKey,
    input.read_page,
  );
  if (!lookup.found || !lookup.entry) {
    fail("CARRIER_PAYMENT_MEMBERSHIP_REQUIRED", paymentKey);
  }

  const payment = projectBuyVoidPaymentHistoryV1({
    root_dir: rootDir,
    pool_id: poolId,
    payment_key_sha256: paymentKey,
  });
  if (
    payment.lifecycle_state !== "inventory_consumed" ||
    !payment.closeout ||
    payment.primary_kind !== "reservation"
  ) {
    fail("PAYMENT_NOT_INVENTORY_CONSUMED", paymentKey);
  }
  if (
    lookup.entry.payment_history_fingerprint_sha256 !==
      payment.payment_history_fingerprint_sha256
  ) {
    fail("CARRIER_LIFECYCLE_FINGERPRINT_STALE", paymentKey);
  }

  const plan = readTerminalCloseoutPlanV1({
    root_dir: rootDir,
    attempt_id: payment.closeout.execution_attempt_id,
  });
  if (!plan) {
    fail(
      "TERMINAL_PLAN_REQUIRED",
      payment.closeout.execution_attempt_id,
    );
  }
  if (
    !TERMINAL_CLOSEOUT_SAGA_ID.test(terminalText(plan.saga_id)) ||
    !TERMINAL_CLOSEOUT_SHA256.test(terminalText(plan.closeout_id)) ||
    !TERMINAL_CLOSEOUT_TX_HASH.test(
      terminalText(plan.transaction_hash).toLowerCase(),
    )
  ) {
    fail("TERMINAL_PLAN_IDENTITY_INVALID", paymentKey);
  }

  const terminal = requireTerminalPlanBindings({
    plan,
    payment,
  });

  const sidecarName =
    "operator-event-terminal-closeout-" +
    payment.request_id +
    "-" +
    plan.closeout_id +
    ".json";
  const sidecar = readStableJson(
    path.join(requestDir, sidecarName),
    "PUBLIC_TERMINAL_SIDECAR",
    VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_MAX_SIDECAR_BYTES_V1,
  );
  if (
    terminalCanonical(sidecar.value) !==
      terminalCanonical(plan.public_closeout_event) ||
    terminalText(sidecar.value.public_event_fingerprint_sha256) !==
      terminal.public_event_fingerprint_sha256
  ) {
    fail("PUBLIC_TERMINAL_SIDECAR_BINDING_INVALID", sidecarName);
  }

  const saga = await readClosedSaga({
    root_dir: rootDir,
    saga_id: plan.saga_id,
    plan,
    expected_binding: {
      request_id: payment.request_id,
      canonical_payment_identity:
        payment.canonical_payment_identity,
      request_key_sha256: payment.request_key_sha256,
      payment_key_sha256: payment.payment_key_sha256,
      delivery_address: payment.delivery_address,
      void_amount_units: payment.void_amount_units,
      pool_id: poolId,
    },
    load_saga_module:
      input.dependencies?.load_saga_module,
  });

  return {
    marker: VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_PROJECTION_V1,
    version: 1,
    pool_id: poolId,
    payment_key_sha256: paymentKey,
    carrier_root_sha256: carrier.carrier_root_sha256,
    carrier_index_root_sha256:
      carrier.payment_index_root_sha256,
    carrier_payment_history_fingerprint_sha256:
      lookup.entry.payment_history_fingerprint_sha256,
    payment_history_fingerprint_sha256:
      payment.payment_history_fingerprint_sha256,
    primary_record_fingerprint_sha256:
      lookup.entry.primary_record_fingerprint_sha256,
    lifecycle_state: "public_fulfilled_terminal_closed",
    request_id: payment.request_id,
    instruction_id: payment.instruction_id,
    canonical_payment_identity:
      payment.canonical_payment_identity,
    delivery_address: payment.delivery_address,
    void_amount_units: payment.void_amount_units,
    reservation_id: payment.primary_record_id,
    execution_attempt_id:
      payment.closeout.execution_attempt_id,
    void_delivery_tx_hash:
      payment.closeout.void_delivery_tx_hash,
    inventory_consumption_id:
      payment.closeout.consumption_id,
    inventory_consumption_fingerprint_sha256:
      payment.closeout.consumption_fingerprint_sha256,
    closeout_record_sha256:
      payment.closeout.closeout_record_sha256,
    saga_id: plan.saga_id,
    closeout_id: plan.closeout_id,
    terminal_plan_fingerprint_sha256:
      plan.plan_fingerprint_sha256,
    terminal_inventory_fingerprint_sha256:
      terminal.terminal_inventory_fingerprint_sha256,
    public_event_fingerprint_sha256:
      terminal.public_event_fingerprint_sha256,
    public_sidecar_sha256: sidecar.sha256,
    canonical_confirmed_state_id:
      plan.canonical_confirmed_state_id,
    canonical_confirmed_state_fingerprint:
      plan.canonical_confirmed_state_fingerprint,
    saga_event_count: saga.event_count,
    saga_last_event_id: saga.last_event_id,
    carrier_root_mutation_performed: false,
    filesystem_write_performed: false,
    saga_mutation_performed: false,
    public_request_mutation_performed: false,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_AUTHORITY_V1,
  };
}
