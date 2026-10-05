import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  VOID_COUPLED_NATIVE_GAS_LIABILITY_V1,
  classifyCoupledNativeGasBuyVoidAdmissionV1,
  type CoupledNativeGasLiabilityRecordV1,
  type CoupledNativeGasPayerObservationV1,
} from "./coupled_native_gas_liability_v1.js";
import type {
  BuyVoidPreparedTransactionPlanReservationV1,
} from "./buy_void_prepared_transaction_plan_reservation_v1.js";

export const VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1 =
  "VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1";

export const VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1 =
  Object.freeze({
    source_store: true,
    canonical_liability_classifier_reused: true,
    payer_scoped_store: true,
    payer_domain_identity_required: true,
    full_locked_census: true,
    serialized_admission: true,
    preprovisioned_root_required: true,
    preprovisioned_records_directory_required: true,
    preprovisioned_lock_queue_required: true,
    descriptor_bound_reads: true,
    create_once_publication: true,
    exact_postwrite_census: true,
    exact_idempotent_replay: true,
    postpublication_failure_reports_mutation: true,
    open_liability_only: true,
    filesystem_read: true,
    filesystem_write: true,
    storage_bootstrap: false,
    root_path_stability_proven: false,
    terminal_receipt_reconciliation: false,
    liability_release_or_delete: false,
    cross_lane_nonce_scheduler_proven: false,
    live_balance_observation: false,
    live_fee_observation: false,
    trusted_time_source_proven: false,
    wc_void_candidate_admission: false,
    full_presale_lifetime_capacity_proven: false,
    ongoing_wc_void_native_gas_model_proven: false,
    runtime_integration: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const PAYER_DOMAIN_SCHEMA =
  "void_coupled_native_gas_open_liability_store_payer_domain_v1";
const PAYER_DOMAIN_NAME = "payer-domain-v1.json";
const RECORDS_DIRECTORY = "records";
const LOCK_QUEUE_DIRECTORY = "gas-liability-admission-v1.queue";
const MAX_RECORD_BYTES = 64 * 1024;
const MAX_RECORDS = 100_000;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const RECORD_NAME = /^([0-9a-f]{64})\.json$/u;
const TEMP_NAME =
  /^\.([0-9a-f]{64})\.json\.tmp-([1-9][0-9]*)-([0-9a-f]{16})$/u;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

type PinnedDirectoryV1 = {
  path: string;
  fd: number;
  stat: fs.BigIntStats;
  proc_path: string;
};

type PinnedFileSnapshotV1 = {
  path: string;
  fd: number;
  stat: fs.BigIntStats;
  bytes: Buffer;
};

export type CoupledNativeGasStorePayerDomainV1 = {
  schema: typeof PAYER_DOMAIN_SCHEMA;
  marker: typeof VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1;
  version: 1;
  chain_id: "2050";
  payer_address: string;
  payer_domain_id: string;
};

export type CoupledNativeGasOpenLiabilityStoreDecisionV1 =
  | {
      ok: true;
      status: "stored" | "idempotent";
      mutation_performed: boolean;
      payer_address: string;
      tracked_open_liability_count: number;
      reserved_after_wei: string;
      liability: CoupledNativeGasLiabilityRecordV1;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held" | "held_after_mutation";
      reason: string;
      mutation_performed: boolean;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1;
      detail?: Readonly<Record<string, unknown>>;
    };

class CoupledNativeGasStorePostMutationError extends Error {}

function held(
  reason: string,
  detail?: Readonly<Record<string, unknown>>,
  mutationPerformed = false,
): Extract<CoupledNativeGasOpenLiabilityStoreDecisionV1, { ok: false }> {
  return Object.freeze({
    ok: false,
    status: mutationPerformed ? "held_after_mutation" : "held",
    reason,
    mutation_performed: mutationPerformed,
    authority: VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1,
    ...(detail ? { detail } : {}),
  });
}

function fail(code: string): never {
  throw new Error(code);
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) fail("coupled_native_gas_store_noncanonical_value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function directObject(
  value: unknown,
  code: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  code: string,
): void {
  const actual = Object.keys(value).sort().join("\n");
  const wanted = [...expected].sort().join("\n");
  if (actual !== wanted) fail(code);
}

function requireDescriptorSafety(): void {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("coupled_native_gas_store_descriptor_safety_unavailable");
  }
}

function sameDirectoryIdentity(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentity(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function validatePrivateDirectory(
  stat: fs.BigIntStats,
  code: string,
): void {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function openPinnedDirectory(
  rawPath: string,
  code: string,
): PinnedDirectoryV1 {
  requireDescriptorSafety();
  const raw = String(rawPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail(code + "_path_invalid");
  }
  const resolved = path.resolve(raw);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(resolved, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      fail(code + "_missing");
    }
    throw error;
  }
  validatePrivateDirectory(visible, code + "_invalid");
  const fd = fs.openSync(
    resolved,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_changed");
    }
    return {
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPinnedDirectoryVisible(
  directory: PinnedDirectoryV1,
  code: string,
): void {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(opened, code + "_invalid");
  validatePrivateDirectory(visible, code + "_invalid");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_changed");
  }
}

function openPinnedChildDirectory(
  parent: PinnedDirectoryV1,
  name: string,
  code: string,
): PinnedDirectoryV1 {
  if (!name || name.includes("/") || name === "." || name === "..") {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(parent, code + "_parent");
  const visiblePath = path.join(parent.path, name);
  const pinnedPath = path.join(parent.proc_path, name);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      fail(code + "_missing");
    }
    throw error;
  }
  validatePrivateDirectory(visible, code + "_invalid");
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_path_not_bound");
    }
    assertPinnedDirectoryVisible(parent, code + "_parent");
    return {
      path: visiblePath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function fsyncDirectory(
  directory: PinnedDirectoryV1,
  code: string,
): void {
  assertPinnedDirectoryVisible(directory, code);
  fs.fsyncSync(directory.fd);
}

function validatePrivateFile(
  stat: fs.BigIntStats,
  maxBytes: number,
  code: string,
  allowedLinks = 1n,
): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== allowedLinks ||
    stat.size < 2n ||
    stat.size > BigInt(maxBytes) ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function readPinnedFile(
  directory: PinnedDirectoryV1,
  name: string,
  maxBytes: number,
  code: string,
): Buffer {
  if (!name || name.includes("/") || name === "." || name === "..") {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      fail(code + "_missing");
    }
    throw error;
  }
  validatePrivateFile(visible, maxBytes, code + "_invalid");
  const fd = fs.openSync(pinnedPath, fs.constants.O_RDONLY | O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(opened, maxBytes, code + "_invalid");
    if (
      visible.dev !== opened.dev ||
      visible.ino !== opened.ino ||
      visible.size !== opened.size ||
      visible.mtimeNs !== opened.mtimeNs ||
      visible.ctimeNs !== opened.ctimeNs
    ) {
      fail(code + "_path_not_bound");
    }
    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    if (
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.size !== opened.size ||
      after.mtimeNs !== opened.mtimeNs ||
      after.ctimeNs !== opened.ctimeNs ||
      visibleAfter.dev !== after.dev ||
      visibleAfter.ino !== after.ino ||
      visibleAfter.size !== after.size ||
      visibleAfter.mtimeNs !== after.mtimeNs ||
      visibleAfter.ctimeNs !== after.ctimeNs
    ) {
      fail(code + "_changed_during_read");
    }
    assertPinnedDirectoryVisible(directory, code + "_directory");
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function openPinnedFileSnapshot(
  directory: PinnedDirectoryV1,
  name: string,
  maxBytes: number,
  code: string,
): PinnedFileSnapshotV1 {
  if (!name || name.includes("/") || name === "." || name === "..") {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      fail(code + "_missing");
    }
    throw error;
  }
  validatePrivateFile(visible, maxBytes, code + "_invalid");
  const fd = fs.openSync(pinnedPath, fs.constants.O_RDONLY | O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(opened, maxBytes, code + "_invalid");
    if (!sameFileIdentity(visible, opened)) {
      fail(code + "_path_not_bound");
    }

    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }

    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(code + "_changed_during_read");
    }
    assertPinnedDirectoryVisible(directory, code + "_directory");
    return {
      path: visiblePath,
      fd,
      stat: after,
      bytes,
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPinnedFileSnapshotCurrent(
  directory: PinnedDirectoryV1,
  snapshot: PinnedFileSnapshotV1,
  maxBytes: number,
  code: string,
): void {
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const opened = fs.fstatSync(snapshot.fd, { bigint: true });
  const visible = fs.lstatSync(snapshot.path, { bigint: true });
  validatePrivateFile(opened, maxBytes, code + "_invalid");
  validatePrivateFile(visible, maxBytes, code + "_invalid");
  if (
    !sameFileIdentity(snapshot.stat, opened) ||
    !sameFileIdentity(opened, visible)
  ) {
    fail(code + "_changed");
  }

  const bytes = Buffer.alloc(Number(opened.size));
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.readSync(
      snapshot.fd,
      bytes,
      offset,
      bytes.length - offset,
      offset,
    );
    if (count <= 0) fail(code + "_short_read");
    offset += count;
  }
  const after = fs.fstatSync(snapshot.fd, { bigint: true });
  const visibleAfter = fs.lstatSync(snapshot.path, { bigint: true });
  if (
    !sameFileIdentity(snapshot.stat, after) ||
    !sameFileIdentity(after, visibleAfter) ||
    !bytes.equals(snapshot.bytes)
  ) {
    fail(code + "_changed");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
}

function closePinnedFile(snapshot: PinnedFileSnapshotV1 | null): void {
  if (!snapshot) return;
  try {
    fs.closeSync(snapshot.fd);
  } catch {
    // Best effort only.
  }
}

function normalizedAddress(value: unknown): string {
  const result = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(result) ? result : "";
}

export function buildCoupledNativeGasStorePayerDomainV1(
  payerAddressRaw: unknown,
): CoupledNativeGasStorePayerDomainV1 {
  const payerAddress = normalizedAddress(payerAddressRaw);
  if (!payerAddress) fail("coupled_native_gas_store_payer_address_invalid");
  const body: Omit<
    CoupledNativeGasStorePayerDomainV1,
    "payer_domain_id"
  > = {
    schema: PAYER_DOMAIN_SCHEMA,
    marker: VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_V1,
    version: 1,
    chain_id: "2050",
    payer_address: payerAddress,
  };
  return Object.freeze({
    ...body,
    payer_domain_id: sha256(canonical(body)),
  });
}

export function serializeCoupledNativeGasStorePayerDomainV1(
  payerAddressRaw: unknown,
): string {
  return canonical(
    buildCoupledNativeGasStorePayerDomainV1(payerAddressRaw),
  ) + "\n";
}

type CoupledNativeGasStorePayerDomainSnapshotV1 = {
  file: PinnedFileSnapshotV1;
  value: CoupledNativeGasStorePayerDomainV1;
};

function parsePayerDomainBytes(
  bytes: Buffer,
): CoupledNativeGasStorePayerDomainV1 {
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) {
    fail("coupled_native_gas_store_payer_domain_serialization_invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    fail("coupled_native_gas_store_payer_domain_json_invalid");
  }
  const value = directObject(
    parsed,
    "coupled_native_gas_store_payer_domain_object_required",
  );
  exactKeys(
    value,
    [
      "schema",
      "marker",
      "version",
      "chain_id",
      "payer_address",
      "payer_domain_id",
    ],
    "coupled_native_gas_store_payer_domain_keys_invalid",
  );
  const expected = buildCoupledNativeGasStorePayerDomainV1(
    value.payer_address,
  );
  if (
    value.schema !== expected.schema ||
    value.marker !== expected.marker ||
    value.version !== expected.version ||
    value.chain_id !== expected.chain_id ||
    value.payer_address !== expected.payer_address ||
    value.payer_domain_id !== expected.payer_domain_id ||
    text !== canonical(expected) + "\n"
  ) {
    fail("coupled_native_gas_store_payer_domain_binding_invalid");
  }
  return expected;
}

function openPayerDomainSnapshot(
  root: PinnedDirectoryV1,
): CoupledNativeGasStorePayerDomainSnapshotV1 {
  const file = openPinnedFileSnapshot(
    root,
    PAYER_DOMAIN_NAME,
    MAX_RECORD_BYTES,
    "coupled_native_gas_store_payer_domain",
  );
  try {
    return {
      file,
      value: parsePayerDomainBytes(file.bytes),
    };
  } catch (error) {
    closePinnedFile(file);
    throw error;
  }
}

function assertPayerDomainSnapshotCurrent(
  root: PinnedDirectoryV1,
  snapshot: CoupledNativeGasStorePayerDomainSnapshotV1,
): void {
  assertPinnedFileSnapshotCurrent(
    root,
    snapshot.file,
    MAX_RECORD_BYTES,
    "coupled_native_gas_store_payer_domain",
  );
}

function parseRecord(
  bytes: Buffer,
  name: string,
  payerAddress: string,
): unknown {
  const match = RECORD_NAME.exec(name);
  if (!match) fail("coupled_native_gas_store_record_name_invalid");
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) {
    fail("coupled_native_gas_store_record_serialization_invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    fail("coupled_native_gas_store_record_json_invalid");
  }
  const value = directObject(
    parsed,
    "coupled_native_gas_store_record_object_required",
  );
  if (
    value.marker !== VOID_COUPLED_NATIVE_GAS_LIABILITY_V1 ||
    value.version !== 1 ||
    value.status !== "open" ||
    value.payer_address !== payerAddress ||
    value.liability_id !== match[1] ||
    !SHA256.test(String(value.liability_id ?? "")) ||
    text !== canonical(value) + "\n"
  ) {
    fail("coupled_native_gas_store_record_binding_invalid");
  }
  return value;
}

function temporaryName(liabilityId: string): string {
  return (
    "." +
    liabilityId +
    ".json.tmp-" +
    String(process.pid) +
    "-" +
    crypto.randomBytes(8).toString("hex")
  );
}

function cleanupRecordTemps(records: PinnedDirectoryV1): void {
  assertPinnedDirectoryVisible(
    records,
    "coupled_native_gas_store_records_directory",
  );
  let changed = false;
  for (const entry of fs.readdirSync(records.proc_path, {
    withFileTypes: true,
  })) {
    const match = TEMP_NAME.exec(entry.name);
    if (!match) continue;
    if (!entry.isFile() || entry.isSymbolicLink()) {
      fail("coupled_native_gas_store_temp_invalid");
    }
    const tempPath = path.join(records.proc_path, entry.name);
    const stat = fs.lstatSync(tempPath, { bigint: true });
    if (stat.nlink === 1n) {
      validatePrivateFile(
        stat,
        MAX_RECORD_BYTES,
        "coupled_native_gas_store_temp_invalid",
      );
      fs.unlinkSync(tempPath);
      changed = true;
      continue;
    }
    validatePrivateFile(
      stat,
      MAX_RECORD_BYTES,
      "coupled_native_gas_store_temp_invalid",
      2n,
    );
    const finalPath = path.join(records.proc_path, match[1] + ".json");
    const final = fs.lstatSync(finalPath, { bigint: true });
    validatePrivateFile(
      final,
      MAX_RECORD_BYTES,
      "coupled_native_gas_store_record_invalid",
      2n,
    );
    if (stat.dev !== final.dev || stat.ino !== final.ino) {
      fail("coupled_native_gas_store_temp_binding_invalid");
    }
    fs.unlinkSync(tempPath);
    changed = true;
  }
  if (changed) {
    fs.fsyncSync(records.fd);
  }
}

function readCensus(
  records: PinnedDirectoryV1,
  payerAddress: string,
): unknown[] {
  cleanupRecordTemps(records);
  const names = fs.readdirSync(records.proc_path).sort();
  if (names.length > MAX_RECORDS) {
    fail("coupled_native_gas_store_record_count_exceeded");
  }
  const out: unknown[] = [];
  for (const name of names) {
    if (!RECORD_NAME.test(name)) {
      fail("coupled_native_gas_store_record_name_invalid");
    }
    const bytes = readPinnedFile(
      records,
      name,
      MAX_RECORD_BYTES,
      "coupled_native_gas_store_record",
    );
    out.push(parseRecord(bytes, name, payerAddress));
  }
  assertPinnedDirectoryVisible(
    records,
    "coupled_native_gas_store_records_directory",
  );
  return out;
}

function canonicalLiabilityBytes(
  liability: CoupledNativeGasLiabilityRecordV1,
): Buffer {
  return Buffer.from(canonical(liability) + "\n", "utf8");
}

function createOnceLiability(
  records: PinnedDirectoryV1,
  liability: CoupledNativeGasLiabilityRecordV1,
): void {
  const bytes = canonicalLiabilityBytes(liability);
  if (bytes.length > MAX_RECORD_BYTES) {
    fail("coupled_native_gas_store_candidate_too_large");
  }
  const finalName = liability.liability_id + ".json";
  const finalPath = path.join(records.proc_path, finalName);
  const tempName = temporaryName(liability.liability_id);
  const tempPath = path.join(records.proc_path, tempName);
  let fd = -1;
  let linked = false;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.writeSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (count <= 0) fail("coupled_native_gas_store_short_write");
      offset += count;
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    try {
      fs.linkSync(tempPath, finalPath);
      linked = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
        const existing = readPinnedFile(
          records,
          finalName,
          MAX_RECORD_BYTES,
          "coupled_native_gas_store_record",
        );
        if (!existing.equals(bytes)) {
          fail("coupled_native_gas_store_existing_record_conflict");
        }
        fail("coupled_native_gas_store_unserialized_record_appeared");
      }
      throw error;
    }
    fs.fsyncSync(records.fd);
    fs.unlinkSync(tempPath);
    fs.fsyncSync(records.fd);
    const published = readPinnedFile(
      records,
      finalName,
      MAX_RECORD_BYTES,
      "coupled_native_gas_store_record",
    );
    if (!published.equals(bytes)) {
      fail("coupled_native_gas_store_publication_postcheck_failed");
    }
  } catch (error) {
    if (linked) {
      throw new CoupledNativeGasStorePostMutationError(
        error instanceof Error
          ? error.message
          : "coupled_native_gas_store_postmutation_failure",
      );
    }
    throw error;
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {
        // Best effort only.
      }
    }
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fs.fsyncSync(records.fd);
      }
    } catch {
      if (linked) {
        // The canonical final name remains authoritative; later locked
        // recovery validates and removes only an exact reviewed temp.
      }
    }
  }
}

function closePinned(directory: PinnedDirectoryV1 | null): void {
  if (!directory) return;
  try {
    fs.closeSync(directory.fd);
  } catch {
    // Best effort only.
  }
}

export async function persistCoupledNativeGasOpenLiabilityV1(input: {
  root_dir: string;
  read_now_ms: () => unknown;
  buy_void_plan: BuyVoidPreparedTransactionPlanReservationV1 | unknown;
  payer_observation: CoupledNativeGasPayerObservationV1 | unknown;
}): Promise<CoupledNativeGasOpenLiabilityStoreDecisionV1> {
  let root: PinnedDirectoryV1 | null = null;
  let records: PinnedDirectoryV1 | null = null;
  let queue: PinnedDirectoryV1 | null = null;
  let durableMutationPerformed = false;
  try {
    if (typeof input?.read_now_ms !== "function") {
      fail("coupled_native_gas_store_time_provider_required");
    }
    const readNowMs = input.read_now_ms;

    root = openPinnedDirectory(
      String(input?.root_dir || "").trim(),
      "coupled_native_gas_store_root",
    );
    records = openPinnedChildDirectory(
      root,
      RECORDS_DIRECTORY,
      "coupled_native_gas_store_records_directory",
    );
    queue = openPinnedChildDirectory(
      root,
      LOCK_QUEUE_DIRECTORY,
      "coupled_native_gas_store_lock_queue",
    );

    return await withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(
      queue.proc_path,
      async () => {
        let payerDomainSnapshot:
          CoupledNativeGasStorePayerDomainSnapshotV1 | null = null;
        try {
          assertPinnedDirectoryVisible(
            root!,
            "coupled_native_gas_store_root",
          );
          assertPinnedDirectoryVisible(
            records!,
            "coupled_native_gas_store_records_directory",
          );
          assertPinnedDirectoryVisible(
            queue!,
            "coupled_native_gas_store_lock_queue",
          );

          payerDomainSnapshot = openPayerDomainSnapshot(root!);
          const payerDomain = payerDomainSnapshot.value;

          const before = readCensus(
            records!,
            payerDomain.payer_address,
          );

          const admissionNowMs = readNowMs();
          const classified =
            classifyCoupledNativeGasBuyVoidAdmissionV1({
              now_ms: admissionNowMs,
              buy_void_plan: input?.buy_void_plan,
              payer_observation: input?.payer_observation,
              open_liabilities: before,
            });
          if (classified.ok === false) {
            return held(classified.reason, classified.detail);
          }
          if (classified.payer_address !== payerDomain.payer_address) {
            return held("coupled_native_gas_store_payer_domain_mismatch");
          }

          assertPayerDomainSnapshotCurrent(
            root!,
            payerDomainSnapshot,
          );

          if (classified.status === "idempotent") {
            const expectedName =
              classified.liability.liability_id + ".json";
            const existing = readPinnedFile(
              records!,
              expectedName,
              MAX_RECORD_BYTES,
              "coupled_native_gas_store_record",
            );
            if (
              !existing.equals(
                canonicalLiabilityBytes(classified.liability),
              )
            ) {
              return held(
                "coupled_native_gas_store_idempotent_record_bytes_mismatch",
              );
            }
            assertPayerDomainSnapshotCurrent(
              root!,
              payerDomainSnapshot,
            );
            assertPinnedDirectoryVisible(
              records!,
              "coupled_native_gas_store_records_directory",
            );
            assertPinnedDirectoryVisible(
              queue!,
              "coupled_native_gas_store_lock_queue",
            );
            return Object.freeze({
              ok: true,
              status: "idempotent",
              mutation_performed: false,
              payer_address: classified.payer_address,
              tracked_open_liability_count: before.length,
              reserved_after_wei: classified.reserved_after_wei,
              liability: classified.liability,
              authority:
                VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1,
            });
          }

          if (before.length >= MAX_RECORDS) {
            return held("coupled_native_gas_store_record_count_exceeded");
          }

          assertPayerDomainSnapshotCurrent(
            root!,
            payerDomainSnapshot,
          );

          createOnceLiability(records!, classified.liability);
          durableMutationPerformed = true;

          const after = readCensus(
            records!,
            payerDomain.payer_address,
          );
          if (after.length !== before.length + 1) {
            fail("coupled_native_gas_store_postwrite_count_mismatch");
          }
          const post =
            classifyCoupledNativeGasBuyVoidAdmissionV1({
              now_ms: admissionNowMs,
              buy_void_plan: input?.buy_void_plan,
              payer_observation: input?.payer_observation,
              open_liabilities: after,
            });
          if (
            post.ok !== true ||
            post.status !== "idempotent" ||
            post.liability.liability_id !==
              classified.liability.liability_id ||
            post.reserved_after_wei !== classified.reserved_after_wei
          ) {
            fail("coupled_native_gas_store_postwrite_classifier_mismatch");
          }

          assertPayerDomainSnapshotCurrent(
            root!,
            payerDomainSnapshot,
          );
          assertPinnedDirectoryVisible(
            root!,
            "coupled_native_gas_store_root",
          );
          assertPinnedDirectoryVisible(
            records!,
            "coupled_native_gas_store_records_directory",
          );
          assertPinnedDirectoryVisible(
            queue!,
            "coupled_native_gas_store_lock_queue",
          );

          return Object.freeze({
            ok: true,
            status: "stored",
            mutation_performed: true,
            payer_address: classified.payer_address,
            tracked_open_liability_count: after.length,
            reserved_after_wei: post.reserved_after_wei,
            liability: classified.liability,
            authority:
              VOID_COUPLED_NATIVE_GAS_OPEN_LIABILITY_STORE_AUTHORITY_V1,
          });
        } finally {
          closePinnedFile(payerDomainSnapshot?.file ?? null);
        }
      },
    );
  } catch (error) {
    const mutationPerformed =
      durableMutationPerformed ||
      error instanceof CoupledNativeGasStorePostMutationError;
    return held(
      error instanceof Error
        ? error.message
        : "coupled_native_gas_store_failed",
      mutationPerformed
        ? Object.freeze({
            durable_state_requires_reinspection: true,
          })
        : undefined,
      mutationPerformed,
    );
  } finally {
    closePinned(queue);
    closePinned(records);
    closePinned(root);
  }
}
