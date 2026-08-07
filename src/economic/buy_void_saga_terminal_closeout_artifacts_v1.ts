import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  writeBuyVoidInventoryConsumptionV1,
} from "./buy_void_confirmed_closeout_v1.js";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  TERMINAL_CLOSEOUT_ROOT,
  TERMINAL_CLOSEOUT_SHA256,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1,
  terminalFingerprint,
  terminalHash,
  terminalSha256,
  terminalText,
  type BuyVoidSagaTerminalCloseoutDependenciesV1,
  type BuyVoidSagaTerminalCloseoutPlanV1,
  type BuyVoidSagaTerminalCloseoutPublicEventV1,
  type ReconstructedTerminalCloseoutV1,
} from "./buy_void_saga_terminal_closeout_model_v1.js";

const MAX_JSON_BYTES = 1024 * 1024;
const MAX_EVENT_BYTES = 16 * 1024 * 1024;
const MAX_EVENT_ROWS = 100_000;

export type TerminalCloseoutApplyProgressV1 = {
  plan_persisted: boolean;
  inventory_committed: boolean;
  public_committed: boolean;
};

export type TerminalCloseoutArtifactResultV1 = {
  plan_state: "created" | "duplicate";
  inventory_mutation: boolean;
  inventory_duplicate: boolean;
  public_mutation: boolean;
  public_duplicate: boolean;
  public_recovered_partial: boolean;
};

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
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return resolved;
      throw error;
    }
    if (metadata.isSymbolicLink()) {
      throw new Error(`${label}_symlink_component_forbidden`);
    }
  }
  return resolved;
}

function assertPrivateDirectory(directory: string, label: string): string {
  const metadata = fs.lstatSync(directory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label}_must_be_direct`);
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error(`${label}_owner_mismatch`);
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error(`${label}_must_be_private`);
  }
  return directory;
}

function privateDirectoryExistsReadOnly(
  directory: string,
  label: string,
): boolean {
  const resolved = assertNoSymlinkPathComponents(directory, label);
  try {
    assertPrivateDirectory(resolved, label);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return false;
    throw error;
  }
}

function ensurePrivateDirectory(directory: string): string {
  const resolved = assertNoSymlinkPathComponents(
    directory,
    "terminal_closeout_directory",
  );
  let exists = true;
  try {
    fs.lstatSync(resolved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    exists = false;
  }
  if (!exists) {
    fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  }
  assertNoSymlinkPathComponents(resolved, "terminal_closeout_directory");
  return assertPrivateDirectory(resolved, "terminal_closeout_directory");
}

function fsyncDirectory(directory: string): void {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

export function readTerminalDirectJsonV1(
  file: string,
  label: string,
): Record<string, any> | null {
  let metadata: fs.Stats;
  try {
    metadata = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label}_must_be_direct_file`);
  }
  if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
    throw new Error(`${label}_size_out_of_range`);
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label}_object_required`);
  }
  return parsed as Record<string, any>;
}

export function readTerminalDirectJsonLinesV1(
  file: string,
  label: string,
): Array<Record<string, any>> {
  let metadata: fs.Stats;
  try {
    metadata = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw error;
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label}_must_be_direct_file`);
  }
  if (metadata.size > MAX_EVENT_BYTES) {
    throw new Error(`${label}_size_out_of_range`);
  }
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length > MAX_EVENT_ROWS) {
    throw new Error(`${label}_row_count_out_of_range`);
  }
  return lines.map((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`${label}_row_${index + 1}_json_invalid`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label}_row_${index + 1}_object_required`);
    }
    return parsed as Record<string, any>;
  });
}

function atomicCreatePrivateJson(
  file: string,
  value: unknown,
): "created" | "exists" {
  const parent = ensurePrivateDirectory(path.dirname(file));
  return atomicLinkJson(file, value, parent);
}

function atomicCreatePublicJson(
  file: string,
  value: unknown,
): "created" | "exists" {
  const parent = path.dirname(file);
  assertNoSymlinkPathComponents(parent, "terminal_closeout_public_parent");
  const metadata = fs.lstatSync(parent);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("terminal_closeout_public_parent_must_be_direct");
  }
  return atomicLinkJson(file, value, parent);
}

function atomicLinkJson(
  file: string,
  value: unknown,
  parent: string,
): "created" | "exists" {
  const temporary = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    try {
      fs.linkSync(temporary, file);
      fsyncDirectory(parent);
      return "created";
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return "exists";
      throw error;
    }
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    }
  }
}

function appendTerminalPublicJsonLineDurable(
  file: string,
  row: Record<string, unknown>,
): void {
  const parent = path.dirname(file);
  assertNoSymlinkPathComponents(parent, "terminal_closeout_request_dir");
  const metadata = fs.lstatSync(parent);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("terminal_closeout_request_dir_must_be_direct");
  }
  const payload = Buffer.from(`${JSON.stringify(row)}\n`, "utf8");
  const descriptor = fs.openSync(file, "a", 0o600);
  try {
    const written = fs.writeSync(
      descriptor,
      payload,
      0,
      payload.length,
      null,
    );
    if (written !== payload.length) {
      throw new Error("terminal_closeout_public_append_short_write");
    }
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(file, 0o600);
  fsyncDirectory(parent);
}

export function terminalEffectiveStatusV1(
  request: Record<string, any>,
  events: Array<Record<string, any>>,
): string {
  const requestId = terminalText(request.request_id);
  const applicable = events
    .filter((event) => terminalText(event.request_id) === requestId)
    .sort((left, right) =>
      Number(left.marked_at_ms || 0) - Number(right.marked_at_ms || 0));
  return terminalText(
    applicable.at(-1)?.operator_status ||
      request.effective_status ||
      request.status,
  ).toLowerCase();
}

export function terminalCloseoutPlanPathV1(
  rootDir: string,
  attemptId: string,
): string {
  const rawRoot = terminalText(rootDir);
  const normalizedAttemptId = terminalText(attemptId).toLowerCase();
  if (!rawRoot || !path.isAbsolute(rawRoot) || rawRoot.includes("\0")) {
    throw new Error("terminal_closeout_plan_root_invalid");
  }
  if (!TERMINAL_CLOSEOUT_SHA256.test(normalizedAttemptId)) {
    throw new Error("terminal_closeout_plan_attempt_id_invalid");
  }
  return path.join(
    path.resolve(rawRoot),
    TERMINAL_CLOSEOUT_ROOT,
    "attempts",
    normalizedAttemptId,
    "plan.json",
  );
}

export function readTerminalCloseoutPlanV1(input: {
  root_dir: string;
  attempt_id: string;
  expected?: Partial<BuyVoidSagaTerminalCloseoutPlanV1>;
}): BuyVoidSagaTerminalCloseoutPlanV1 | null {
  const file = terminalCloseoutPlanPathV1(input.root_dir, input.attempt_id);
  const attemptDirectory = path.dirname(file);
  const attemptsDirectory = path.dirname(attemptDirectory);
  const managedRoot = path.dirname(attemptsDirectory);
  for (const [directory, label] of [
    [managedRoot, "terminal_closeout_root"],
    [attemptsDirectory, "terminal_closeout_attempts"],
    [attemptDirectory, "terminal_closeout_attempt"],
  ] as const) {
    if (!privateDirectoryExistsReadOnly(directory, label)) return null;
  }
  const existing = readTerminalDirectJsonV1(
    file,
    "terminal_closeout_plan",
  );
  if (!existing) return null;
  if (
    existing.schema !== "void_buy_void_saga_terminal_closeout_plan_v1" ||
    existing.marker !== VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_V1 ||
    existing.version !== 1 ||
    !TERMINAL_CLOSEOUT_SHA256.test(terminalText(existing.closeout_id)) ||
    !TERMINAL_CLOSEOUT_SHA256.test(
      terminalText(existing.plan_fingerprint_sha256),
    )
  ) {
    throw new Error("terminal_closeout_persisted_plan_invalid");
  }
  for (const [key, value] of Object.entries(input.expected || {})) {
    if ((existing as Record<string, unknown>)[key] !== value) {
      throw new Error("terminal_closeout_persisted_plan_binding_conflict");
    }
  }
  const { plan_fingerprint_sha256: recorded, ...withoutFingerprint } = existing;
  if (terminalFingerprint(withoutFingerprint) !== recorded) {
    throw new Error("terminal_closeout_persisted_plan_fingerprint_invalid");
  }
  return existing as BuyVoidSagaTerminalCloseoutPlanV1;
}

export function persistTerminalCloseoutPlanV1(
  rootDir: string,
  plan: BuyVoidSagaTerminalCloseoutPlanV1,
): "created" | "duplicate" {
  const file = terminalCloseoutPlanPathV1(rootDir, plan.attempt_id);
  if (atomicCreatePrivateJson(file, plan) === "created") return "created";
  const existing = readTerminalCloseoutPlanV1({
    root_dir: rootDir,
    attempt_id: plan.attempt_id,
    expected: {
      closeout_id: plan.closeout_id,
      plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
      canonical_confirmed_state_id: plan.canonical_confirmed_state_id,
      canonical_confirmed_state_fingerprint:
        plan.canonical_confirmed_state_fingerprint,
    },
  });
  if (!existing) throw new Error("terminal_closeout_plan_disappeared");
  return "duplicate";
}

function samePublicEvent(
  value: Record<string, any>,
  expected: BuyVoidSagaTerminalCloseoutPublicEventV1,
): boolean {
  return (
    terminalText(value.request_id) === expected.request_id &&
    terminalText(value.operator_status) === "fulfilled" &&
    terminalHash(value.void_delivery_tx_hash) === expected.void_delivery_tx_hash &&
    terminalText(value.closeout_id) === expected.closeout_id &&
    terminalText(value.saga_id) === expected.saga_id &&
    terminalText(value.canonical_confirmed_state_id) ===
      expected.canonical_confirmed_state_id &&
    terminalText(value.canonical_confirmed_state_fingerprint) ===
      expected.canonical_confirmed_state_fingerprint &&
    terminalText(value.inventory_consumption_id) ===
      expected.inventory_consumption_id &&
    terminalText(value.public_event_fingerprint_sha256) ===
      expected.public_event_fingerprint_sha256
  );
}

function writeTerminalPublicCloseoutV1(
  requestDir: string,
  event: BuyVoidSagaTerminalCloseoutPublicEventV1,
): { mutation_performed: boolean; duplicate: boolean; recovered_partial: boolean } {
  assertNoSymlinkPathComponents(requestDir, "terminal_closeout_request_dir");
  const directory = fs.lstatSync(requestDir);
  if (!directory.isDirectory() || directory.isSymbolicLink()) {
    throw new Error("terminal_closeout_request_dir_must_be_direct");
  }
  const journal = path.join(requestDir, "operator-events.jsonl");
  const rows = readTerminalDirectJsonLinesV1(
    journal,
    "terminal_closeout_operator_events",
  );
  const fulfilled = rows.filter(
    (row) =>
      terminalText(row.request_id) === event.request_id &&
      terminalText(row.operator_status).toLowerCase() === "fulfilled",
  );
  if (
    fulfilled.some(
      (row) => terminalHash(row.void_delivery_tx_hash) !== event.void_delivery_tx_hash,
    )
  ) {
    throw new Error("terminal_closeout_public_transaction_conflict");
  }
  const exact = fulfilled.find((row) => samePublicEvent(row, event));
  if (fulfilled.some((row) => !samePublicEvent(row, event))) {
    throw new Error("terminal_closeout_legacy_fulfilled_event_lacks_evidence");
  }

  const sidecar = path.join(
    requestDir,
    `operator-event-terminal-closeout-${event.request_id}-${event.closeout_id}.json`,
  );
  let mutation = false;
  let recovered = false;
  if (!exact) {
    appendTerminalPublicJsonLineDurable(journal, event);
    mutation = true;
  }
  const sidecarState = atomicCreatePublicJson(sidecar, event);
  if (sidecarState === "created") {
    mutation = true;
    recovered = Boolean(exact);
  } else {
    const existing = readTerminalDirectJsonV1(
      sidecar,
      "terminal_closeout_public_sidecar",
    );
    if (!existing || !samePublicEvent(existing, event)) {
      throw new Error("terminal_closeout_public_sidecar_conflict");
    }
  }
  return {
    mutation_performed: mutation,
    duplicate: Boolean(exact) && sidecarState === "exists",
    recovered_partial: recovered,
  };
}

function requestLockPath(requestDir: string, requestId: string): string {
  const locks = ensurePrivateDirectory(
    path.join(requestDir, ".terminal-closeout-locks-v1"),
  );
  return path.join(
    locks,
    terminalSha256(`void-buy-terminal-closeout-request-v1\n${requestId}`),
  );
}

function verifyInventoryWrite(
  decision: any,
  plan: BuyVoidSagaTerminalCloseoutPlanV1,
): { mutation_performed: boolean; duplicate: boolean } {
  if (!decision || decision.ok !== true) {
    throw new Error(
      `terminal_inventory_consumption_held:${terminalText(decision?.reason) || "unknown"}`,
    );
  }
  const record = decision.record || plan.inventory_consumption;
  if (
    record.closeout_id !== plan.closeout_id ||
    record.canonical_confirmed_state_id !== plan.canonical_confirmed_state_id ||
    record.canonical_confirmed_state_fingerprint !==
      plan.canonical_confirmed_state_fingerprint ||
    record.terminal_closeout_fingerprint_sha256 !==
      plan.inventory_consumption.terminal_closeout_fingerprint_sha256 ||
    record.inventory_decrement_performed !== true
  ) {
    throw new Error("terminal_inventory_consumption_evidence_mismatch");
  }
  return {
    mutation_performed: decision.mutation_performed === true,
    duplicate: decision.duplicate === true,
  };
}

export function applyTerminalCloseoutArtifactsV1(
  reconstructed: ReconstructedTerminalCloseoutV1,
  dependencies: BuyVoidSagaTerminalCloseoutDependenciesV1,
  progress: TerminalCloseoutApplyProgressV1,
): TerminalCloseoutArtifactResultV1 {
  return withBuyVoidFilesystemBakeryLockV1(
    requestLockPath(
      reconstructed.policy.request_dir,
      reconstructed.plan.request_id,
    ),
    () => {
      const planState = persistTerminalCloseoutPlanV1(
        reconstructed.root_dir,
        reconstructed.plan,
      );
      progress.plan_persisted = true;
      dependencies.fault_inject?.("after_plan_before_inventory");

      const writeInventory =
        dependencies.write_inventory_consumption ||
        writeBuyVoidInventoryConsumptionV1;
      const inventory = verifyInventoryWrite(
        writeInventory({
          root_dir: reconstructed.root_dir,
          record: reconstructed.plan.inventory_consumption,
        }),
        reconstructed.plan,
      );
      progress.inventory_committed = true;
      dependencies.fault_inject?.("after_inventory_before_public");

      const publicResult = writeTerminalPublicCloseoutV1(
        reconstructed.policy.request_dir,
        reconstructed.plan.public_closeout_event,
      );
      progress.public_committed = true;
      dependencies.fault_inject?.("after_public_before_saga");

      return {
        plan_state: planState,
        inventory_mutation: inventory.mutation_performed,
        inventory_duplicate: inventory.duplicate,
        public_mutation: publicResult.mutation_performed,
        public_duplicate: publicResult.duplicate,
        public_recovered_partial: publicResult.recovered_partial,
      };
    },
  );
}
