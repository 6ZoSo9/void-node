import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  canonicalBuyVoidPaymentIdentityV1,
} from "./buy_void_auto_fulfillment_v1.js";
import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_V2,
} from "./buy_void_verified_payment_v2.js";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_RESERVATION_V1";

export const VOID_BUY_VOID_ALLOCATION_RESERVATION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    durable_request_history_read: true,
    durable_verified_payment_history_read: true,
    deterministic_allocation_record: true,
    append_only_allocation_publication: true,
    crash_recovery: true,
    allocation_history_validation: true,
    global_allocation_serialization: true,
    prepublication_capacity_admission: true,
    allocation_history_completeness_authority: false,
    external_high_water_binding: false,
    rollback_detection: false,
    production_gate_ready: false,
    capacity_obligation_creation: false,
    payment_verified_event_write: false,
    payment_receipt_verification: false,
    runtime_integration: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    inventory_transfer: false,
    token_transfer: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const TX_HASH = /^0x[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const RECEIPT_ID = /^voidbclive1_[0-9a-f]{64}$/u;
const ALLOCATION_ID = /^voidalloc1_[0-9a-f]{64}$/u;
const CHAIN = /^[a-z0-9][a-z0-9_-]{1,31}$/u;
const MICRO = 1_000_000n;
const PRESALE_POOL_VOID_MICRO = 10_000_000n * MICRO;
const LEDGER_MAX_BYTES = 64 * 1024 * 1024;
const RECORD_MAX_BYTES = 64 * 1024;
const MAX_ALLOCATION_RECORDS = 100_000;
const ALLOCATION_DIR = "allocation-reservations-v1";
const ALLOCATION_LOCK_SUFFIX = ".allocation-reservation-v1";
const O_NOFOLLOW =
  typeof fs.constants.O_NOFOLLOW === "number"
    ? fs.constants.O_NOFOLLOW
    : 0;
const O_DIRECTORY =
  typeof fs.constants.O_DIRECTORY === "number"
    ? fs.constants.O_DIRECTORY
    : 0;

const LAUNCH_AUTHORITY_KEYS = Object.freeze([
  "activation_generation",
  "activation_receipt_id",
  "activation_receipt_sha256",
  "coupled_launch_id",
  "expires_at_ms",
  "generation_tip_sha256",
  "marker",
  "source_composition_id",
  "version",
]);

const RECORD_KEYS = Object.freeze([
  "activation_generation",
  "activation_receipt_id",
  "activation_receipt_sha256",
  "allocation_id",
  "canonical_payment_identity",
  "coupled_launch_id",
  "generation_tip_sha256",
  "marker",
  "payment_log_index",
  "payment_transaction_hash",
  "quoted_void_micro",
  "request_authority_expires_at_ms",
  "request_id",
  "schema",
  "source_chain",
  "source_composition_id",
  "status",
  "verified_payment_event_sha256",
  "version",
]);

type PinnedDirectoryV1 = {
  path: string;
  fd: number;
  stat: any;
  proc_path: string;
};

type ParsedLineV1 = {
  value: Record<string, any>;
  bytes: Buffer;
  sha256_id: string;
};

type RequestProjectionV1 = {
  request_id: string;
  source_chain: string;
  quoted_void_micro: bigint;
  tx_hash: string;
  launch_authority: Record<string, any> | null;
  launch_authority_json: string | null;
  latest: Record<string, any>;
};

type VerifiedProjectionV1 = {
  request_id: string;
  canonical_payment_identity: string;
  source_chain: string;
  transaction_hash: string;
  log_index: string;
  event_sha256: string;
  event: Record<string, any>;
  event_bytes: Buffer;
};

export type BuyVoidAllocationReservationRecordV1 = {
  schema: "void_buy_void_allocation_reserved_v1";
  marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_V1;
  version: 1;
  status: "allocation_reserved";
  allocation_id: string;
  request_id: string;
  canonical_payment_identity: string;
  source_chain: string;
  payment_transaction_hash: string;
  payment_log_index: string;
  quoted_void_micro: string;
  verified_payment_event_sha256: string;
  coupled_launch_id: string;
  source_composition_id: string;
  activation_generation: string;
  generation_tip_sha256: string;
  activation_receipt_id: string;
  activation_receipt_sha256: string;
  request_authority_expires_at_ms: number;
};

export type BuyVoidAllocationReservationDecisionV1 =
  | {
      ok: true;
      status: "persisted" | "duplicate";
      idempotent: boolean;
      marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_V1;
      version: 1;
      record: BuyVoidAllocationReservationRecordV1;
      allocation_history_count: number;
      allocation_reserved_void_micro: string;
      capacity_obligation_created: false;
      payment_verified_event_written: false;
      funds_movement: false;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_V1;
      version: 1;
      reason: string;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_AUTHORITY_V1;
    };

function fail(code: string): never {
  throw new Error(code);
}

function held(reason: string): BuyVoidAllocationReservationDecisionV1 {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_V1,
    version: 1 as const,
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_RESERVATION_AUTHORITY_V1,
  });
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value: any): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("buy_void_allocation_canonical_value_invalid");
}

function exactKeys(value: any, keys: readonly string[], code: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
}

function normalizeChain(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return CHAIN.test(chain) ? chain : "";
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return TX_HASH.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0
      ? BigInt(value)
      : null;
  }
  const raw = String(value ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/u.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function microVoid(value: unknown, code: string, positive = false): bigint {
  const raw = String(value ?? "").trim();
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(raw);
  if (!match) fail(code);
  const units =
    BigInt(match[1]) * MICRO +
    BigInt((match[2] || "").padEnd(6, "0") || "0");
  if (positive ? units < 1n : units < 0n) fail(code);
  return units;
}

function sameDirectoryIdentity(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentity(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink
  );
}

function validateDirectoryStat(stat: any, code: string): void {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o022) !== 0
  ) {
    fail(code);
  }
}

function validateFileStat(
  stat: any,
  maxBytes: number,
  code: string,
  allowedLinks = 1n,
): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== allowedLinks ||
    stat.size < 1n ||
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

function openPinnedDirectory(
  directoryPath: string,
  code: string,
): PinnedDirectoryV1 {
  const resolved = path.resolve(directoryPath);
  const visible = fs.lstatSync(resolved, { bigint: true });
  validateDirectoryStat(visible, code + "_invalid");
  const fd = fs.openSync(
    resolved,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateDirectoryStat(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_changed");
    }
    return Object.freeze({
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
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
  validateDirectoryStat(opened, code + "_invalid");
  validateDirectoryStat(visible, code + "_invalid");
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
  testOnlyAfterVisibleBeforeOpen: (() => void) | null = null,
): PinnedDirectoryV1 {
  if (
    !name ||
    name.includes("/") ||
    name === "." ||
    name === ".."
  ) {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(parent, code + "_parent");
  const visiblePath = path.join(parent.path, name);
  const pinnedPath = path.join(parent.proc_path, name);
  const visible = fs.lstatSync(visiblePath, { bigint: true });
  validateDirectoryStat(visible, code + "_invalid");
  if (testOnlyAfterVisibleBeforeOpen !== null) {
    testOnlyAfterVisibleBeforeOpen();
  }
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateDirectoryStat(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_path_not_bound");
    }
    assertPinnedDirectoryVisible(parent, code + "_parent");
    return Object.freeze({
      path: visiblePath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function readPinnedNamedFile(
  directory: PinnedDirectoryV1,
  name: string,
  maxBytes: number,
  code: string,
  testOnlyAfterStatBeforeRead: (() => void) | null = null,
): Buffer {
  if (
    !name ||
    name.includes("/") ||
    name === "." ||
    name === ".."
  ) {
    fail(code + "_name_invalid");
  }
  assertPinnedDirectoryVisible(directory, code + "_directory");
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const visibleBefore = fs.lstatSync(visiblePath, { bigint: true });
  validateFileStat(visibleBefore, maxBytes, code + "_file_invalid");
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateFileStat(opened, maxBytes, code + "_file_invalid");
    if (!sameFileIdentity(visibleBefore, opened)) {
      fail(code + "_path_not_bound");
    }
    if (testOnlyAfterStatBeforeRead !== null) {
      testOnlyAfterStatBeforeRead();
    }
    const size = Number(opened.size);
    if (!Number.isSafeInteger(size) || size < 1 || size > maxBytes) {
      fail(code + "_file_invalid");
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    validateFileStat(after, maxBytes, code + "_file_invalid");
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    validateFileStat(visibleAfter, maxBytes, code + "_file_invalid");
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(code + "_changed_during_read");
    }
    assertPinnedDirectoryVisible(directory, code + "_directory");
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function parseStrictJsonLines(
  bytes: Buffer,
  code: string,
): ParsedLineV1[] {
  if (bytes.length === 0) return [];
  if (bytes[bytes.length - 1] !== 0x0a) {
    fail(code + "_truncated_tail");
  }
  const rows: ParsedLineV1[] = [];
  let start = 0;
  while (start < bytes.length) {
    const newline = bytes.indexOf(0x0a, start);
    if (newline < 0) fail(code + "_truncated_tail");
    if (newline === start) fail(code + "_empty_row");
    const body = bytes.subarray(start, newline);
    let value: any;
    try {
      value = JSON.parse(body.toString("utf8"));
    } catch {
      fail(code + "_json_invalid");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(code + "_row_invalid");
    }
    const lineBytes = Buffer.from(bytes.subarray(start, newline + 1));
    rows.push(Object.freeze({
      value,
      bytes: lineBytes,
      sha256_id: "sha256:" + sha256(lineBytes),
    }));
    start = newline + 1;
  }
  return rows;
}

function validateLaunchAuthority(value: any): Record<string, any> {
  exactKeys(
    value,
    LAUNCH_AUTHORITY_KEYS,
    "buy_void_allocation_launch_authority_shape_invalid",
  );
  if (
    value.marker !== "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1" ||
    value.version !== 1 ||
    !SHA256_ID.test(String(value.coupled_launch_id || "")) ||
    !SHA256_ID.test(String(value.source_composition_id || "")) ||
    !BYTES32.test(String(value.activation_generation || "").toLowerCase()) ||
    !SHA256_ID.test(String(value.generation_tip_sha256 || "")) ||
    !RECEIPT_ID.test(String(value.activation_receipt_id || "")) ||
    !HEX64.test(String(value.activation_receipt_sha256 || "")) ||
    !Number.isSafeInteger(value.expires_at_ms) ||
    value.expires_at_ms <= 0
  ) {
    fail("buy_void_allocation_launch_authority_invalid");
  }
  return Object.freeze({
    marker: value.marker,
    version: 1,
    coupled_launch_id: String(value.coupled_launch_id),
    source_composition_id: String(value.source_composition_id),
    activation_generation:
      String(value.activation_generation).toLowerCase(),
    generation_tip_sha256: String(value.generation_tip_sha256),
    activation_receipt_id: String(value.activation_receipt_id),
    activation_receipt_sha256: String(value.activation_receipt_sha256),
    expires_at_ms: value.expires_at_ms,
  });
}

function buildRequestProjection(
  rows: ParsedLineV1[],
): Map<string, RequestProjectionV1> {
  const requests = new Map<string, RequestProjectionV1>();
  for (const row of rows) {
    const value = row.value;
    const requestId = String(value.request_id || "").trim();
    if (!REQUEST_ID.test(requestId)) {
      fail("buy_void_allocation_request_id_invalid");
    }
    const quote = microVoid(
      value.quoted_void,
      "buy_void_allocation_request_quote_invalid",
      true,
    );
    const chain = normalizeChain(value.source_chain);
    if (!chain) fail("buy_void_allocation_request_source_chain_invalid");
    const txRaw = String(value.tx_hash || "").trim();
    const txHash = txRaw ? normalizeHash(txRaw) : "";
    if (txRaw && !txHash) {
      fail("buy_void_allocation_request_tx_hash_invalid");
    }
    const launch =
      value.launch_authority === undefined ||
      value.launch_authority === null
        ? null
        : validateLaunchAuthority(value.launch_authority);
    const launchJson = launch ? canonicalJson(launch) : null;
    const previous = requests.get(requestId);
    if (previous) {
      if (
        previous.quoted_void_micro !== quote ||
        previous.source_chain !== chain ||
        previous.launch_authority_json !== launchJson ||
        (previous.tx_hash && !txHash) ||
        (previous.tx_hash && txHash && previous.tx_hash !== txHash)
      ) {
        fail("buy_void_allocation_request_revision_conflict");
      }
    }
    requests.set(
      requestId,
      Object.freeze({
        request_id: requestId,
        source_chain: chain,
        quoted_void_micro: quote,
        tx_hash: txHash || previous?.tx_hash || "",
        launch_authority: launch,
        launch_authority_json: launchJson,
        latest: value,
      }),
    );
  }
  return requests;
}

function buildVerifiedProjection(
  row: ParsedLineV1,
  requests: Map<string, RequestProjectionV1>,
): VerifiedProjectionV1 {
  const event = row.value;
  if (
    event.schema !== "void_buy_void_verified_payment_event_v2" ||
    event.marker !== VOID_BUY_VOID_VERIFIED_PAYMENT_V2 ||
    event.operator_status !== "payment_verified" ||
    event.payment_verified !== true ||
    event.payment_identity_input_complete !== true
  ) {
    fail("buy_void_allocation_verified_payment_event_invalid");
  }
  const requestId = String(event.request_id || "").trim();
  if (!REQUEST_ID.test(requestId)) {
    fail("buy_void_allocation_verified_payment_request_id_invalid");
  }
  const verifier = event.payment_verifier;
  if (!verifier || typeof verifier !== "object" || Array.isArray(verifier)) {
    fail("buy_void_allocation_payment_verifier_invalid");
  }
  const chain = normalizeChain(verifier.chain);
  const transactionHash = normalizeHash(verifier.transaction_hash);
  const outerHash = normalizeHash(event.tx_hash);
  const logIndex = parseNonNegativeInteger(verifier.log_index);
  if (
    !chain ||
    !transactionHash ||
    !outerHash ||
    transactionHash !== outerHash ||
    logIndex === null
  ) {
    fail("buy_void_allocation_payment_identity_invalid");
  }
  let paymentIdentity: string;
  try {
    paymentIdentity = canonicalBuyVoidPaymentIdentityV1({
      source_chain: chain,
      payment_transaction_hash: transactionHash,
      payment_log_index: logIndex,
    });
  } catch {
    fail("buy_void_allocation_payment_identity_invalid");
  }
  const request = requests.get(requestId);
  if (!request) {
    fail("buy_void_allocation_verified_request_missing");
  }
  if (
    request.source_chain !== chain ||
    !request.tx_hash ||
    request.tx_hash !== transactionHash
  ) {
    fail("buy_void_allocation_request_payment_lineage_mismatch");
  }
  if (!request.launch_authority) {
    fail("buy_void_allocation_request_launch_authority_missing");
  }
  return Object.freeze({
    request_id: requestId,
    canonical_payment_identity: paymentIdentity,
    source_chain: chain,
    transaction_hash: transactionHash,
    log_index: logIndex.toString(),
    event_sha256: row.sha256_id,
    event,
    event_bytes: row.bytes,
  });
}

function buildVerifiedMaps(
  rows: ParsedLineV1[],
  requests: Map<string, RequestProjectionV1>,
) {
  const byRequest = new Map<string, VerifiedProjectionV1>();
  const byPayment = new Map<string, VerifiedProjectionV1>();
  const byDigest = new Map<string, VerifiedProjectionV1>();
  for (const row of rows) {
    const status = String(row.value.operator_status || "").trim();
    const verified = row.value.payment_verified === true;
    if (status !== "payment_verified" && !verified) continue;
    const projection = buildVerifiedProjection(row, requests);
    if (
      byRequest.has(projection.request_id) ||
      byPayment.has(projection.canonical_payment_identity) ||
      byDigest.has(projection.event_sha256)
    ) {
      fail("buy_void_allocation_duplicate_verified_payment_history");
    }
    byRequest.set(projection.request_id, projection);
    byPayment.set(projection.canonical_payment_identity, projection);
    byDigest.set(projection.event_sha256, projection);
  }
  return Object.freeze({ byRequest, byPayment, byDigest });
}

function allocationBody(
  request: RequestProjectionV1,
  verified: VerifiedProjectionV1,
) {
  const launch = request.launch_authority;
  if (!launch) fail("buy_void_allocation_request_launch_authority_missing");
  return Object.freeze({
    schema: "void_buy_void_allocation_reserved_v1",
    marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_V1,
    version: 1,
    status: "allocation_reserved",
    request_id: request.request_id,
    canonical_payment_identity: verified.canonical_payment_identity,
    source_chain: verified.source_chain,
    payment_transaction_hash: verified.transaction_hash,
    payment_log_index: verified.log_index,
    quoted_void_micro: request.quoted_void_micro.toString(),
    verified_payment_event_sha256: verified.event_sha256,
    coupled_launch_id: launch.coupled_launch_id,
    source_composition_id: launch.source_composition_id,
    activation_generation: launch.activation_generation,
    generation_tip_sha256: launch.generation_tip_sha256,
    activation_receipt_id: launch.activation_receipt_id,
    activation_receipt_sha256: launch.activation_receipt_sha256,
    request_authority_expires_at_ms: launch.expires_at_ms,
  });
}

function buildBuyVoidAllocationReservationRecordV1(input: {
  request_projection: RequestProjectionV1;
  verified_projection: VerifiedProjectionV1;
}): BuyVoidAllocationReservationRecordV1 {
  const body = allocationBody(
    input.request_projection,
    input.verified_projection,
  );
  const allocationId =
    "voidalloc1_" + sha256(Buffer.from(canonicalJson(body), "utf8"));
  return Object.freeze({
    ...body,
    allocation_id: allocationId,
  }) as BuyVoidAllocationReservationRecordV1;
}

function recordBytes(
  record: BuyVoidAllocationReservationRecordV1,
): Buffer {
  return Buffer.from(canonicalJson(record) + "\n", "utf8");
}

function parseAllocationRecord(
  bytes: Buffer,
): BuyVoidAllocationReservationRecordV1 {
  let value: any;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("buy_void_allocation_record_json_invalid");
  }
  exactKeys(
    value,
    RECORD_KEYS,
    "buy_void_allocation_record_shape_invalid",
  );
  if (
    value.schema !== "void_buy_void_allocation_reserved_v1" ||
    value.marker !== VOID_BUY_VOID_ALLOCATION_RESERVATION_V1 ||
    value.version !== 1 ||
    value.status !== "allocation_reserved" ||
    !ALLOCATION_ID.test(String(value.allocation_id || "")) ||
    !REQUEST_ID.test(String(value.request_id || "")) ||
    !/^voidpay1:[a-z0-9_-]+:0x[0-9a-f]{64}:[0-9]+$/u.test(
      String(value.canonical_payment_identity || ""),
    ) ||
    !CHAIN.test(String(value.source_chain || "")) ||
    !TX_HASH.test(String(value.payment_transaction_hash || "")) ||
    parseNonNegativeInteger(value.payment_log_index) === null ||
    parseNonNegativeInteger(value.quoted_void_micro) === null ||
    BigInt(value.quoted_void_micro) < 1n ||
    !SHA256_ID.test(String(value.verified_payment_event_sha256 || "")) ||
    !SHA256_ID.test(String(value.coupled_launch_id || "")) ||
    !SHA256_ID.test(String(value.source_composition_id || "")) ||
    !BYTES32.test(String(value.activation_generation || "")) ||
    !SHA256_ID.test(String(value.generation_tip_sha256 || "")) ||
    !RECEIPT_ID.test(String(value.activation_receipt_id || "")) ||
    !HEX64.test(String(value.activation_receipt_sha256 || "")) ||
    !Number.isSafeInteger(value.request_authority_expires_at_ms) ||
    value.request_authority_expires_at_ms <= 0
  ) {
    fail("buy_void_allocation_record_invalid");
  }
  const body: Record<string, any> = { ...value };
  delete body.allocation_id;
  const expectedId =
    "voidalloc1_" + sha256(Buffer.from(canonicalJson(body), "utf8"));
  if (expectedId !== value.allocation_id) {
    fail("buy_void_allocation_record_id_mismatch");
  }
  return Object.freeze({ ...value });
}

function openOrCreateAllocationDirectory(
  requestDirectory: PinnedDirectoryV1,
): PinnedDirectoryV1 {
  assertPinnedDirectoryVisible(
    requestDirectory,
    "buy_void_allocation_request_directory",
  );
  const pinnedPath = path.join(requestDirectory.proc_path, ALLOCATION_DIR);
  try {
    fs.mkdirSync(pinnedPath, { mode: 0o700 });
    fs.fsyncSync(requestDirectory.fd);
  } catch (error: any) {
    if (String(error?.code || "") !== "EEXIST") throw error;
  }
  return openPinnedChildDirectory(
    requestDirectory,
    ALLOCATION_DIR,
    "buy_void_allocation_history_directory",
  );
}

function fsyncDirectory(directory: PinnedDirectoryV1): void {
  assertPinnedDirectoryVisible(
    directory,
    "buy_void_allocation_history_directory",
  );
  fs.fsyncSync(directory.fd);
}

function normalizePublishedAllocationTemps(
  directory: PinnedDirectoryV1,
): void {
  const names = fs.readdirSync(directory.proc_path).sort();
  for (const name of names) {
    const match =
      /^\.(voidalloc1_[0-9a-f]{64})\.tmp-[0-9]+-[0-9a-f]{16}$/u.exec(
        name,
      );
    if (!match) continue;
    const tempPath = path.join(directory.proc_path, name);
    const temp = fs.lstatSync(tempPath, { bigint: true });
    if (temp.nlink === 1n) {
      validateFileStat(
        temp,
        RECORD_MAX_BYTES,
        "buy_void_allocation_history_temp_invalid",
      );
      continue;
    }
    validateFileStat(
      temp,
      RECORD_MAX_BYTES,
      "buy_void_allocation_history_temp_invalid",
      2n,
    );
    const finalName = match[1] + ".json";
    const finalPath = path.join(directory.proc_path, finalName);
    let final;
    try {
      final = fs.lstatSync(finalPath, { bigint: true });
    } catch {
      fail("buy_void_allocation_linked_final_missing");
    }
    validateFileStat(
      final,
      RECORD_MAX_BYTES,
      "buy_void_allocation_record_file_invalid",
      2n,
    );
    if (final.dev !== temp.dev || final.ino !== temp.ino) {
      fail("buy_void_allocation_linked_temp_identity_mismatch");
    }
    fs.unlinkSync(tempPath);
    fsyncDirectory(directory);
    const normalized = fs.lstatSync(finalPath, { bigint: true });
    validateFileStat(
      normalized,
      RECORD_MAX_BYTES,
      "buy_void_allocation_record_file_invalid",
    );
  }
}

function cleanupExpectedTempFiles(
  directory: PinnedDirectoryV1,
  allocationId: string,
  expected: Buffer,
): void {
  const prefix = "." + allocationId + ".tmp-";
  for (const name of fs.readdirSync(directory.proc_path)) {
    if (!name.startsWith(prefix)) continue;
    const bytes = readPinnedNamedFile(
      directory,
      name,
      RECORD_MAX_BYTES,
      "buy_void_allocation_temp",
    );
    if (!bytes.equals(expected)) {
      fail("buy_void_allocation_temp_conflict");
    }
    fs.unlinkSync(path.join(directory.proc_path, name));
    fsyncDirectory(directory);
  }
}

function recoverPublishedHardlinkIfNeeded(
  directory: PinnedDirectoryV1,
  finalName: string,
  allocationId: string,
  expected: Buffer,
): void {
  const visiblePath = path.join(directory.path, finalName);
  const metadata = fs.lstatSync(visiblePath, { bigint: true });
  if (metadata.nlink === 1n) return;
  if (metadata.nlink !== 2n) {
    fail("buy_void_allocation_record_link_count_invalid");
  }
  const prefix = "." + allocationId + ".tmp-";
  let linkedTemp = "";
  for (const name of fs.readdirSync(directory.proc_path)) {
    if (!name.startsWith(prefix)) continue;
    const candidate = fs.lstatSync(
      path.join(directory.proc_path, name),
      { bigint: true },
    );
    if (
      candidate.isFile() &&
      !candidate.isSymbolicLink() &&
      candidate.dev === metadata.dev &&
      candidate.ino === metadata.ino
    ) {
      if (linkedTemp) {
        fail("buy_void_allocation_multiple_linked_temps");
      }
      linkedTemp = name;
    }
  }
  if (!linkedTemp) {
    fail("buy_void_allocation_linked_temp_missing");
  }
  const fd = fs.openSync(
    path.join(directory.proc_path, finalName),
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateFileStat(
      opened,
      RECORD_MAX_BYTES,
      "buy_void_allocation_record_file_invalid",
      2n,
    );
    const bytes = fs.readFileSync(fd);
    if (!bytes.equals(expected)) {
      fail("buy_void_allocation_existing_record_conflict");
    }
  } finally {
    fs.closeSync(fd);
  }
  fs.unlinkSync(path.join(directory.proc_path, linkedTemp));
  fsyncDirectory(directory);
}

function ensureAllocationRecord(
  directory: PinnedDirectoryV1,
  record: BuyVoidAllocationReservationRecordV1,
): "created" | "existing" {
  const expected = recordBytes(record);
  const finalName = record.allocation_id + ".json";
  const finalPath = path.join(directory.path, finalName);
  if (fs.existsSync(finalPath)) {
    recoverPublishedHardlinkIfNeeded(
      directory,
      finalName,
      record.allocation_id,
      expected,
    );
    const existing = readPinnedNamedFile(
      directory,
      finalName,
      RECORD_MAX_BYTES,
      "buy_void_allocation_existing_record",
    );
    if (!existing.equals(expected)) {
      fail("buy_void_allocation_existing_record_conflict");
    }
    cleanupExpectedTempFiles(
      directory,
      record.allocation_id,
      expected,
    );
    return "existing";
  }

  cleanupExpectedTempFiles(
    directory,
    record.allocation_id,
    expected,
  );

  const tempName =
    "." +
    record.allocation_id +
    ".tmp-" +
    String(process.pid) +
    "-" +
    randomBytes(8).toString("hex");
  const tempPath = path.join(directory.proc_path, tempName);
  const finalPinnedPath = path.join(directory.proc_path, finalName);
  let fd = -1;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    const written = fs.writeSync(
      fd,
      expected,
      0,
      expected.length,
      null,
    );
    if (written !== expected.length) {
      fail("buy_void_allocation_record_short_write");
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    try {
      fs.linkSync(tempPath, finalPinnedPath);
      fsyncDirectory(directory);
    } catch (error: any) {
      if (String(error?.code || "") !== "EEXIST") throw error;
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        fsyncDirectory(directory);
      }
      recoverPublishedHardlinkIfNeeded(
        directory,
        finalName,
        record.allocation_id,
        expected,
      );
      const raced = readPinnedNamedFile(
        directory,
        finalName,
        RECORD_MAX_BYTES,
        "buy_void_allocation_existing_record",
      );
      if (!raced.equals(expected)) {
        fail("buy_void_allocation_existing_record_conflict");
      }
      return "existing";
    }
    fs.unlinkSync(tempPath);
    fsyncDirectory(directory);
    const published = readPinnedNamedFile(
      directory,
      finalName,
      RECORD_MAX_BYTES,
      "buy_void_allocation_published_record",
    );
    if (!published.equals(expected)) {
      fail("buy_void_allocation_published_record_mismatch");
    }
    return "created";
  } finally {
    if (fd >= 0) {
      try { fs.closeSync(fd); } catch { /* best effort */ }
    }
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // Hidden temp state is never allocation authority.
    }
  }
}

function scanAllocationHistory(
  allocationDirectory: PinnedDirectoryV1,
  requests: Map<string, RequestProjectionV1>,
  verified: ReturnType<typeof buildVerifiedMaps>,
) {
  normalizePublishedAllocationTemps(allocationDirectory);
  const byRequest = new Map<string, BuyVoidAllocationReservationRecordV1>();
  const byPayment = new Map<string, BuyVoidAllocationReservationRecordV1>();
  const byEvent = new Map<string, BuyVoidAllocationReservationRecordV1>();
  const byId = new Map<string, BuyVoidAllocationReservationRecordV1>();
  let totalMicro = 0n;
  let count = 0;

  for (const name of fs.readdirSync(allocationDirectory.proc_path).sort()) {
    if (name.startsWith(".")) {
      if (
        !/^\.voidalloc1_[0-9a-f]{64}\.tmp-[0-9]+-[0-9a-f]{16}$/u.test(
          name,
        )
      ) {
        fail("buy_void_allocation_history_unknown_hidden_entry");
      }
      const tempStat = fs.lstatSync(
        path.join(allocationDirectory.proc_path, name),
        { bigint: true },
      );
      validateFileStat(
        tempStat,
        RECORD_MAX_BYTES,
        "buy_void_allocation_history_temp_invalid",
      );
      continue;
    }
    if (!/^voidalloc1_[0-9a-f]{64}\.json$/u.test(name)) {
      fail("buy_void_allocation_history_unknown_entry");
    }
    count += 1;
    if (count > MAX_ALLOCATION_RECORDS) {
      fail("buy_void_allocation_history_record_limit");
    }
    const bytes = readPinnedNamedFile(
      allocationDirectory,
      name,
      RECORD_MAX_BYTES,
      "buy_void_allocation_history_record",
    );
    const record = parseAllocationRecord(bytes);
    if (name !== record.allocation_id + ".json") {
      fail("buy_void_allocation_history_filename_mismatch");
    }
    const request = requests.get(record.request_id);
    const event = verified.byDigest.get(
      record.verified_payment_event_sha256,
    );
    if (!request || !event) {
      fail("buy_void_allocation_orphan_record");
    }
    const expected = buildBuyVoidAllocationReservationRecordV1({
      request_projection: request,
      verified_projection: event,
    });
    if (!recordBytes(expected).equals(bytes)) {
      fail("buy_void_allocation_history_lineage_mismatch");
    }
    if (
      byRequest.has(record.request_id) ||
      byPayment.has(record.canonical_payment_identity) ||
      byEvent.has(record.verified_payment_event_sha256) ||
      byId.has(record.allocation_id)
    ) {
      fail("buy_void_allocation_history_duplicate_identity");
    }
    byRequest.set(record.request_id, record);
    byPayment.set(record.canonical_payment_identity, record);
    byEvent.set(record.verified_payment_event_sha256, record);
    byId.set(record.allocation_id, record);
    totalMicro += BigInt(record.quoted_void_micro);
    if (totalMicro > PRESALE_POOL_VOID_MICRO) {
      fail("buy_void_allocation_history_oversubscribed");
    }
  }

  return Object.freeze({
    byRequest,
    byPayment,
    byEvent,
    byId,
    count,
    total_micro: totalMicro,
  });
}

function emptyAllocationHistory() {
  return Object.freeze({
    byRequest: new Map<string, BuyVoidAllocationReservationRecordV1>(),
    byPayment: new Map<string, BuyVoidAllocationReservationRecordV1>(),
    byEvent: new Map<string, BuyVoidAllocationReservationRecordV1>(),
    byId: new Map<string, BuyVoidAllocationReservationRecordV1>(),
    count: 0,
    total_micro: 0n,
  });
}

function openExistingAllocationDirectory(
  requestDirectory: PinnedDirectoryV1,
): PinnedDirectoryV1 | null {
  assertPinnedDirectoryVisible(
    requestDirectory,
    "buy_void_allocation_request_directory",
  );
  const pinnedPath = path.join(requestDirectory.proc_path, ALLOCATION_DIR);
  try {
    fs.lstatSync(pinnedPath, { bigint: true });
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") return null;
    throw error;
  }
  return openPinnedChildDirectory(
    requestDirectory,
    ALLOCATION_DIR,
    "buy_void_allocation_history_directory",
  );
}

function loadAuthorityState(requestDir: string) {
  const requestDirectory = openPinnedDirectory(
    requestDir,
    "buy_void_allocation_request_directory",
  );
  let allocationDirectory: PinnedDirectoryV1 | null = null;
  try {
    const requestsBytes = readPinnedNamedFile(
      requestDirectory,
      "requests.jsonl",
      LEDGER_MAX_BYTES,
      "buy_void_allocation_requests",
    );
    const operatorBytes = readPinnedNamedFile(
      requestDirectory,
      "operator-events.jsonl",
      LEDGER_MAX_BYTES,
      "buy_void_allocation_operator_events",
    );
    const requests = buildRequestProjection(
      parseStrictJsonLines(
        requestsBytes,
        "buy_void_allocation_requests",
      ),
    );
    const verified = buildVerifiedMaps(
      parseStrictJsonLines(
        operatorBytes,
        "buy_void_allocation_operator_events",
      ),
      requests,
    );
    allocationDirectory =
      openExistingAllocationDirectory(requestDirectory);
    const history = allocationDirectory
      ? scanAllocationHistory(
          allocationDirectory,
          requests,
          verified,
        )
      : emptyAllocationHistory();
    return {
      requestDirectory,
      allocationDirectory,
      requests,
      verified,
      history,
    };
  } catch (error) {
    if (allocationDirectory) {
      try { fs.closeSync(allocationDirectory.fd); } catch { /* best effort */ }
    }
    try { fs.closeSync(requestDirectory.fd); } catch { /* best effort */ }
    throw error;
  }
}

function allocationReservationLockPathV1(
  requestDir: string,
): string {
  return requestDir + ALLOCATION_LOCK_SUFFIX;
}

export function persistBuyVoidAllocationReservationV1(input: {
  request_dir: string;
  request_id: string;
}): BuyVoidAllocationReservationDecisionV1 {
  const requestDirRaw = String(input?.request_dir || "").trim();
  const requestId = String(input?.request_id || "").trim();
  if (!requestDirRaw || !REQUEST_ID.test(requestId)) {
    return held("buy_void_allocation_input_invalid");
  }
  const requestDir = path.resolve(requestDirRaw);
  return withBuyVoidFilesystemBakeryLockV1(
    allocationReservationLockPathV1(requestDir),
    () => persistBuyVoidAllocationReservationUnlockedV1(input),
  );
}

function persistBuyVoidAllocationReservationUnlockedV1(input: {
  request_dir: string;
  request_id: string;
}): BuyVoidAllocationReservationDecisionV1 {
  const requestDirRaw = String(input?.request_dir || "").trim();
  const requestId = String(input?.request_id || "").trim();
  if (!requestDirRaw || !REQUEST_ID.test(requestId)) {
    return held("buy_void_allocation_input_invalid");
  }
  const requestDir = path.resolve(requestDirRaw);
  let loaded: ReturnType<typeof loadAuthorityState> | null = null;
  try {
    loaded = loadAuthorityState(requestDir);
    const request = loaded.requests.get(requestId);
    const verified = loaded.verified.byRequest.get(requestId);
    if (!request) fail("buy_void_allocation_request_missing");
    if (!verified) fail("buy_void_allocation_verified_payment_missing");

    const record = buildBuyVoidAllocationReservationRecordV1({
      request_projection: request,
      verified_projection: verified,
    });

    const existingByRequest =
      loaded.history.byRequest.get(record.request_id);
    const existingByPayment =
      loaded.history.byPayment.get(record.canonical_payment_identity);
    const existingByEvent =
      loaded.history.byEvent.get(record.verified_payment_event_sha256);
    for (const existing of [
      existingByRequest,
      existingByPayment,
      existingByEvent,
    ]) {
      if (existing && existing.allocation_id !== record.allocation_id) {
        fail("buy_void_allocation_identity_conflict");
      }
    }

    const existingExact = loaded.history.byId.get(record.allocation_id);
    const capacityDelta = existingExact
      ? 0n
      : BigInt(record.quoted_void_micro);
    if (
      loaded.history.total_micro + capacityDelta >
      PRESALE_POOL_VOID_MICRO
    ) {
      fail("buy_void_allocation_capacity_exceeded");
    }

    if (!loaded.allocationDirectory) {
      loaded.allocationDirectory =
        openOrCreateAllocationDirectory(loaded.requestDirectory);
    }
    const publication = ensureAllocationRecord(
      loaded.allocationDirectory,
      record,
    );

    const postHistory = scanAllocationHistory(
      loaded.allocationDirectory,
      loaded.requests,
      loaded.verified,
    );
    const post =
      postHistory.byId.get(record.allocation_id);
    if (
      !post ||
      post.request_id !== record.request_id ||
      post.canonical_payment_identity !== record.canonical_payment_identity ||
      post.verified_payment_event_sha256 !==
        record.verified_payment_event_sha256
    ) {
      fail("buy_void_allocation_postcheck_failed");
    }

    return Object.freeze({
      ok: true as const,
      status:
        publication === "created"
          ? "persisted" as const
          : "duplicate" as const,
      idempotent: publication === "existing",
      marker: VOID_BUY_VOID_ALLOCATION_RESERVATION_V1,
      version: 1 as const,
      record,
      allocation_history_count: postHistory.count,
      allocation_reserved_void_micro:
        postHistory.total_micro.toString(),
      capacity_obligation_created: false as const,
      payment_verified_event_written: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(String((error as Error)?.message || error));
  } finally {
    if (loaded) {
      if (loaded.allocationDirectory) {
        try { fs.closeSync(loaded.allocationDirectory.fd); } catch { /* best effort */ }
      }
      try { fs.closeSync(loaded.requestDirectory.fd); } catch { /* best effort */ }
    }
  }
}

export function listBuyVoidAllocationReservationsV1(
  requestDirRaw: string,
): BuyVoidAllocationReservationRecordV1[] {
  const raw = String(requestDirRaw || "").trim();
  if (!raw) throw new Error("buy_void_allocation_input_invalid");
  const requestDir = path.resolve(raw);
  return withBuyVoidFilesystemBakeryLockV1(
    allocationReservationLockPathV1(requestDir),
    () => listBuyVoidAllocationReservationsUnlockedV1(requestDir),
  );
}

function listBuyVoidAllocationReservationsUnlockedV1(
  requestDirRaw: string,
): BuyVoidAllocationReservationRecordV1[] {
  const requestDir = path.resolve(String(requestDirRaw || "").trim());
  const loaded = loadAuthorityState(requestDir);
  try {
    return Object.freeze(
      [...loaded.history.byId.values()]
        .sort((left, right) =>
          left.allocation_id.localeCompare(right.allocation_id),
        ),
    ) as unknown as BuyVoidAllocationReservationRecordV1[];
  } finally {
    if (loaded.allocationDirectory) {
      fs.closeSync(loaded.allocationDirectory.fd);
    }
    fs.closeSync(loaded.requestDirectory.fd);
  }
}

export function testOnlyOpenBuyVoidAllocationChildDirectoryV1(
  requestDirRaw: string,
  testOnlyAfterVisibleBeforeOpen: () => void,
): void {
  const requestDir = path.resolve(String(requestDirRaw || "").trim());
  const requestDirectory = openPinnedDirectory(
    requestDir,
    "buy_void_allocation_test_request_directory",
  );
  let child: PinnedDirectoryV1 | null = null;
  try {
    child = openPinnedChildDirectory(
      requestDirectory,
      ALLOCATION_DIR,
      "buy_void_allocation_test_history_directory",
      testOnlyAfterVisibleBeforeOpen,
    );
  } finally {
    if (child) {
      fs.closeSync(child.fd);
    }
    fs.closeSync(requestDirectory.fd);
  }
}

export function testOnlyReadBuyVoidAllocationAuthorityFileV1(
  filePathRaw: string,
  testOnlyAfterStatBeforeRead: () => void,
): Buffer {
  const filePath = path.resolve(String(filePathRaw || "").trim());
  const directory = openPinnedDirectory(
    path.dirname(filePath),
    "buy_void_allocation_test_directory",
  );
  try {
    return readPinnedNamedFile(
      directory,
      path.basename(filePath),
      LEDGER_MAX_BYTES,
      "buy_void_allocation_test_file",
      testOnlyAfterStatBeforeRead,
    );
  } finally {
    fs.closeSync(directory.fd);
  }
}
