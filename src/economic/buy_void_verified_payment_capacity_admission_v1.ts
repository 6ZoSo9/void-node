import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

import {
  withBuyVoidFilesystemBakeryLockAsyncV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  withBuyVoidTerminalCloseoutRequestLockV1,
} from "./buy_void_terminal_closeout_request_lock_v1.js";
import {
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1,
} from "./buy_void_verified_payment_duplicate_guard_v1.js";
import {
  classifyBuyVoidAllocationReservationLedgerV1,
  planBuyVoidAllocationReservationV1,
} from "./buy_void_allocation_reservation_ledger_v1.js";
import {
  persistBuyVoidAllocationReservationPublicationWriterV1,
  snapshotBuyVoidAllocationReservationPublicationWriterV1,
} from "./buy_void_allocation_reservation_publication_writer_v1.js";
import {
  classifyBuyVoidPreappendVerifiedPaymentLineageV1,
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "./buy_void_verified_allocation_replay_binding_v1.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    request_directory_read: true,
    request_directory_write: true,
    serialized_capacity_admission: true,
    strict_ledger_recount: true,
    durable_payment_verified_append: true,
    payment_verified_sidecar_recovery: true,
    payment_receipt_verification: false,
    durable_request_payment_binding: true,
    duplicate_payment_identity_verification: true,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    token_transfer: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const MICRO = 1_000_000n;
const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const TX_HASH = /^0x[0-9a-f]{64}$/u;

function canonicalRequestSourceChainV1(value: any): string {
  // An unbound original chain must never silently become Base, nor may an
  // alternate alias override a contradictory source_chain. Exact payment
  // replay/recovery requires this same explicit lineage.
  const normalize = (raw: unknown): string => {
    if (typeof raw !== "string") return "";
    const label = raw.trim().toLowerCase();
    const chain = label === "eth" ? "ethereum" : label;
    return chain === "base" || chain === "ethereum" ? chain : "";
  };
  const chain = normalize(value?.source_chain);
  if (!chain) {
    fail("buy_void_verified_payment_capacity_request_source_chain_invalid");
  }
  for (const alias of ["payment_chain", "chain"] as const) {
    if (Object.prototype.hasOwnProperty.call(value, alias) &&
        normalize(value[alias]) !== chain) {
      fail("buy_void_verified_payment_capacity_request_source_chain_alias_mismatch");
    }
  }
  return chain;
}

function canonicalRequestTxHashV1(value: any): string {
  const raw = String(value?.tx_hash || "").trim().toLowerCase();
  if (raw && !TX_HASH.test(raw)) {
    fail("buy_void_verified_payment_capacity_request_tx_hash_invalid");
  }
  return raw;
}

function fail(code: string): never {
  throw new Error(code);
}

function microVoid(value: unknown, code: string, positive = false): bigint {
  const raw = String(value ?? "").trim();
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(raw);
  if (!match) fail(code);
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] || "").padEnd(6, "0") || "0");
  const units = whole * MICRO + fraction;
  if (positive ? units < 1n : units < 0n) fail(code);
  return units;
}

function microVoidAsNumberV1(
  units: bigint,
  code: string,
): number {
  const value = Number(
    `${units / MICRO}.${(units % MICRO).toString().padStart(6, "0")}`,
  );
  if (!Number.isFinite(value) || microVoid(value, code) !== units) {
    fail(code);
  }
  return value;
}

// Quote from exact 6-decimal USDC/rate units. Never floor an IEEE-754 product
// into a different microVOID amount.
export function quoteBuyVoidFromUsdcV1(
  usdcAmount: unknown,
  rateVoidPerUsdc: unknown,
): number {
  const code = "buy_void_quote_exact_units_invalid";
  const usdcMicro = microVoid(usdcAmount, code, true);
  const rateMicro = microVoid(rateVoidPerUsdc, code, true);
  const product = usdcMicro * rateMicro;
  if (product % MICRO !== 0n) fail(code);
  return microVoidAsNumberV1(product / MICRO, code);
}

// Project the legacy numeric API from the same exact units as strict admission.
// Never round away a sub-micro quote or an unrepresentable numeric result.
export function projectBuyVoidVerifiedPaymentCapacityV1(
  poolVoid: unknown,
  verifiedQuotes: readonly unknown[],
) {
  const code = "buy_void_verified_payment_capacity_state_invalid";
  const pool = microVoid(poolVoid, code, true);
  let verified = 0n;
  for (const quote of verifiedQuotes) {
    verified += microVoid(quote, code, true);
  }
  const reserved = verified < pool ? verified : pool;
  return Object.freeze({
    allocation_reserved_void: microVoidAsNumberV1(reserved, code),
    verified_void_total: microVoidAsNumberV1(verified, code),
    remaining_void: microVoidAsNumberV1(pool - reserved, code),
  });
}

const LEDGER_MAX_BYTES = 64 * 1024 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

function requireCapacityDescriptorSafetyV1(): void {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("buy_void_verified_payment_capacity_descriptor_safety_unavailable");
  }
}

type PinnedRequestDirectoryV1 = {
  path: string;
  fd: number;
  stat: any;
  proc_path: string;
};

type PinnedLedgerV1 = {
  path: string;
  name: string;
  fd: number;
  directory: PinnedRequestDirectoryV1;
};

type PinnedLedgerReadV1 = {
  bytes: Buffer;
  stat: any;
};

function sameDirectoryIdentityV1(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameFileIdentityV1(left: any, right: any): boolean {
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

function sameFileInodeCustodyV1(left: any, right: any): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink
  );
}

function validateLedgerStatV1(stat: any, code: string): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1n ||
    stat.size < 0n ||
    stat.size > BigInt(LEDGER_MAX_BYTES) ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o022) !== 0
  ) {
    fail(code + "_file_invalid");
  }
}

function openPinnedRequestDirectoryV1(
  requestDir: string,
): PinnedRequestDirectoryV1 {
  requireCapacityDescriptorSafetyV1();
  const visible = fs.lstatSync(requestDir, { bigint: true });
  if (
    !visible.isDirectory() ||
    visible.isSymbolicLink() ||
    (
      typeof process.getuid === "function" &&
      visible.uid !== BigInt(process.getuid())
    ) ||
    (Number(visible.mode) & 0o022) !== 0
  ) {
    fail("buy_void_verified_payment_capacity_request_directory_invalid");
  }
  const fd = fs.openSync(
    requestDir,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (
      !opened.isDirectory() ||
      !sameDirectoryIdentityV1(visible, opened)
    ) {
      fail("buy_void_verified_payment_capacity_request_directory_changed");
    }
    return {
      path: requestDir,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPinnedRequestDirectoryVisibleV1(
  directory: PinnedRequestDirectoryV1,
): void {
  const visible = fs.lstatSync(directory.path, { bigint: true });
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  if (
    !visible.isDirectory() ||
    visible.isSymbolicLink() ||
    !sameDirectoryIdentityV1(directory.stat, opened) ||
    !sameDirectoryIdentityV1(opened, visible)
  ) {
    fail("buy_void_verified_payment_capacity_request_directory_changed");
  }
}

function openPinnedLedgerV1(
  directory: PinnedRequestDirectoryV1,
  name: string,
  code: string,
  options: { writable: boolean; create: boolean },
): PinnedLedgerV1 | null {
  assertPinnedRequestDirectoryVisibleV1(directory);
  const visiblePath = path.join(directory.path, name);
  const pinnedPath = path.join(directory.proc_path, name);
  const access = options.writable
    ? fs.constants.O_RDWR | fs.constants.O_APPEND
    : fs.constants.O_RDONLY;
  let fd = -1;
  try {
    fd = fs.openSync(pinnedPath, access | O_NOFOLLOW);
  } catch (error: any) {
    if (String(error?.code || "") !== "ENOENT") throw error;
    if (!options.create) return null;
    fd = fs.openSync(
      pinnedPath,
      access |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    fs.fsyncSync(fd);
    fs.fsyncSync(directory.fd);
  }

  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validateLedgerStatV1(opened, code);
    const visible = fs.lstatSync(visiblePath, { bigint: true });
    validateLedgerStatV1(visible, code);
    if (!sameFileIdentityV1(opened, visible)) {
      fail(code + "_path_not_bound");
    }
    return {
      path: visiblePath,
      name,
      fd,
      directory,
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPinnedLedgerVisibleV1(
  ledger: PinnedLedgerV1,
  code: string,
): any {
  assertPinnedRequestDirectoryVisibleV1(ledger.directory);
  const opened = fs.fstatSync(ledger.fd, { bigint: true });
  validateLedgerStatV1(opened, code);
  const visible = fs.lstatSync(ledger.path, { bigint: true });
  validateLedgerStatV1(visible, code);
  if (!sameFileIdentityV1(opened, visible)) {
    fail(code + "_path_not_bound");
  }
  return opened;
}

function readPinnedLedgerBytesV1(
  ledger: PinnedLedgerV1,
  code: string,
  testOnlyAfterStatBeforeRead: (() => void) | null = null,
): PinnedLedgerReadV1 {
  const before = assertPinnedLedgerVisibleV1(ledger, code);
  if (testOnlyAfterStatBeforeRead !== null) {
    testOnlyAfterStatBeforeRead();
  }
  const size = Number(before.size);
  if (
    !Number.isSafeInteger(size) ||
    size < 0 ||
    size > LEDGER_MAX_BYTES
  ) {
    fail(code + "_file_invalid");
  }
  const bytes = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const count = fs.readSync(
      ledger.fd,
      bytes,
      offset,
      size - offset,
      offset,
    );
    if (count <= 0) fail(code + "_short_read");
    offset += count;
  }
  const after = fs.fstatSync(ledger.fd, { bigint: true });
  validateLedgerStatV1(after, code);
  if (!sameFileIdentityV1(before, after)) {
    fail(code + "_changed_during_read");
  }
  const visible = fs.lstatSync(ledger.path, { bigint: true });
  validateLedgerStatV1(visible, code);
  if (!sameFileIdentityV1(after, visible)) {
    fail(code + "_path_not_bound");
  }
  return Object.freeze({
    bytes,
    stat: after,
  });
}

// The append writer commits exact JSON.stringify(row) + LF bytes. Never accept
// a truncated final line, normalized UTF-8, duplicate member, or reformatted
// history as authoritative paid-capacity evidence.
const CAPACITY_HISTORY_UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
function parseStrictJsonLinesV1(bytes: Buffer, code: string): any[] {
  if (bytes.length === 0) return [];
  if (bytes.length >= 3 && bytes[0] === 0xef &&
      bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(code + "_utf8_bom_not_canonical");
  }
  let text: string;
  try {
    text = CAPACITY_HISTORY_UTF8.decode(bytes);
  } catch {
    fail(code + "_utf8_invalid");
  }
  if (!text.endsWith("\n") || text.includes("\r") ||
      text.charCodeAt(0) === 0xfeff) {
    fail(code + "_truncated_or_noncanonical");
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.some((line) => line.length === 0)) {
    fail(code + "_empty_row");
  }
  return lines.map((line) => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      fail(code + "_json_invalid");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(code + "_row_invalid");
    }
    if (JSON.stringify(value) !== line) {
      fail(code + "_row_noncanonical");
    }
    return value;
  });
}

function readStrictJsonLinesFromDirectoryV1(
  directory: PinnedRequestDirectoryV1,
  name: string,
  code: string,
): any[] {
  const ledger = openPinnedLedgerV1(
    directory,
    name,
    code,
    { writable: false, create: false },
  );
  if (ledger === null) return [];
  try {
    const read = readPinnedLedgerBytesV1(ledger, code);
    return parseStrictJsonLinesV1(read.bytes, code);
  } finally {
    fs.closeSync(ledger.fd);
  }
}

function readStrictJsonLinesV1(filePath: string, code: string): any[] {
  const requestDir = path.dirname(filePath);
  const directory = openPinnedRequestDirectoryV1(requestDir);
  try {
    return readStrictJsonLinesFromDirectoryV1(
      directory,
      path.basename(filePath),
      code,
    );
  } finally {
    fs.closeSync(directory.fd);
  }
}

export function testOnlyReadStrictCapacityLedgerFileV1(
  filePath: string,
  code: string,
  testOnlyAfterStatBeforeRead: () => void,
): any[] {
  const requestDir = path.dirname(filePath);
  const directory = openPinnedRequestDirectoryV1(requestDir);
  try {
    const ledger = openPinnedLedgerV1(
      directory,
      path.basename(filePath),
      code,
      { writable: false, create: false },
    );
    if (ledger === null) return [];
    try {
      const read = readPinnedLedgerBytesV1(
        ledger,
        code,
        testOnlyAfterStatBeforeRead,
      );
      return parseStrictJsonLinesV1(read.bytes, code);
    } finally {
      fs.closeSync(ledger.fd);
    }
  } finally {
    fs.closeSync(directory.fd);
  }
}


export function testOnlyReadStrictCapacityCensusV1(
  requestDirInput: string,
  poolVoidMicro: bigint,
  testOnlyAfterLedgerReadsBeforeCensusReturn: () => void,
): ReturnType<typeof readStrictCapacityLedgerV1> {
  const requestDir = path.resolve(requestDirInput);
  const directory = openPinnedRequestDirectoryV1(requestDir);
  const requestLedger = openPinnedLedgerV1(
    directory,
    "requests.jsonl",
    "buy_void_verified_payment_capacity_requests",
    { writable: false, create: false },
  );
  if (requestLedger === null) {
    fs.closeSync(directory.fd);
    fail("buy_void_verified_payment_capacity_candidate_request_missing");
  }
  const operatorLedger = openPinnedLedgerV1(
    directory,
    "operator-events.jsonl",
    "buy_void_verified_payment_capacity_operator_events",
    { writable: false, create: false },
  );
  if (operatorLedger === null) {
    fs.closeSync(requestLedger.fd);
    fs.closeSync(directory.fd);
    fail("buy_void_verified_payment_capacity_operator_events_unavailable");
  }
  try {
    return readStrictCapacityLedgerV1(
      requestLedger,
      operatorLedger,
      poolVoidMicro,
      testOnlyAfterLedgerReadsBeforeCensusReturn,
    );
  } finally {
    fs.closeSync(operatorLedger.fd);
    fs.closeSync(requestLedger.fd);
    fs.closeSync(directory.fd);
  }
}

function readStrictCapacityLedgerV1(
  requestLedger: PinnedLedgerV1,
  operatorLedger: PinnedLedgerV1,
  poolVoidMicro: bigint,
  testOnlyAfterLedgerReadsBeforeCensusReturn: (() => void) | null = null,
) {
  const requestRead = readPinnedLedgerBytesV1(
    requestLedger,
    "buy_void_verified_payment_capacity_requests",
  );
  const requestRows = parseStrictJsonLinesV1(
    requestRead.bytes,
    "buy_void_verified_payment_capacity_requests",
  );
  const quotes = new Map<string, bigint>();
  const requestPaymentBindings = new Map<
    string,
    { source_chain: string; tx_hash: string }
  >();
  for (const row of requestRows) {
    const requestId = String(row.request_id || "").trim();
    if (!REQUEST_ID.test(requestId)) {
      fail("buy_void_verified_payment_capacity_request_id_invalid");
    }
    const quote = microVoid(
      row.quoted_void,
      "buy_void_verified_payment_capacity_request_quote_invalid",
      true,
    );
    const prior = quotes.get(requestId);
    if (prior !== undefined && prior !== quote) {
      fail("buy_void_verified_payment_capacity_request_quote_changed");
    }
    quotes.set(requestId, quote);

    const sourceChain = canonicalRequestSourceChainV1(row);
    const txHash = canonicalRequestTxHashV1(row);
    const priorBinding = requestPaymentBindings.get(requestId);
    if (priorBinding) {
      if (priorBinding.source_chain !== sourceChain) {
        fail("buy_void_verified_payment_capacity_request_source_chain_changed");
      }
      if (
        priorBinding.tx_hash &&
        txHash !== priorBinding.tx_hash
      ) {
        fail("buy_void_verified_payment_capacity_request_tx_hash_changed");
      }
      if (!priorBinding.tx_hash && txHash) {
        requestPaymentBindings.set(
          requestId,
          Object.freeze({ source_chain: sourceChain, tx_hash: txHash }),
        );
      }
    } else {
      requestPaymentBindings.set(
        requestId,
        Object.freeze({ source_chain: sourceChain, tx_hash: txHash }),
      );
    }
  }

  const operatorRead = readPinnedLedgerBytesV1(
    operatorLedger,
    "buy_void_verified_payment_capacity_operator_events",
  );
  const eventRows = parseStrictJsonLinesV1(
    operatorRead.bytes,
    "buy_void_verified_payment_capacity_operator_events",
  );
  const verifiedIds = new Set<string>();
  for (const row of eventRows) {
    const requestId = String(row.request_id || "").trim();
    const status = String(row.operator_status || "").trim();
    if (!REQUEST_ID.test(requestId) || !status) {
      fail("buy_void_verified_payment_capacity_operator_event_invalid");
    }
    if (status !== "payment_verified") continue;
    const quote = quotes.get(requestId);
    if (quote === undefined) {
      fail("buy_void_verified_payment_capacity_verified_request_missing");
    }
    if (row.quoted_void !== undefined && row.quoted_void !== null) {
      const eventQuote = microVoid(
        row.quoted_void,
        "buy_void_verified_payment_capacity_event_quote_invalid",
        true,
      );
      if (eventQuote !== quote) {
        fail("buy_void_verified_payment_capacity_event_quote_mismatch");
      }
    }
    verifiedIds.add(requestId);
  }

  let verifiedVoidMicro = 0n;
  for (const requestId of verifiedIds) {
    verifiedVoidMicro += quotes.get(requestId) || 0n;
  }
  if (verifiedVoidMicro > poolVoidMicro) {
    fail("buy_void_verified_payment_capacity_ledger_oversubscribed");
  }

  if (testOnlyAfterLedgerReadsBeforeCensusReturn !== null) {
    testOnlyAfterLedgerReadsBeforeCensusReturn();
  }

  const requestLedgerCurrent = assertPinnedLedgerVisibleV1(
    requestLedger,
    "buy_void_verified_payment_capacity_requests",
  );
  if (!sameFileIdentityV1(requestRead.stat, requestLedgerCurrent)) {
    fail("buy_void_verified_payment_capacity_requests_changed_since_read");
  }
  const operatorLedgerCurrent = assertPinnedLedgerVisibleV1(
    operatorLedger,
    "buy_void_verified_payment_capacity_operator_events",
  );
  if (!sameFileIdentityV1(operatorRead.stat, operatorLedgerCurrent)) {
    fail("buy_void_verified_payment_capacity_operator_events_changed_since_read");
  }

  return Object.freeze({
    verified_ids: verifiedIds,
    operator_events: eventRows,
    request_quotes: quotes,
    request_payment_bindings: requestPaymentBindings,
    request_jsonl: Buffer.from(requestRead.bytes),
    operator_jsonl: Buffer.from(operatorRead.bytes),
    request_ledger_stat: requestRead.stat,
    operator_ledger_stat: operatorRead.stat,
    verified_void_micro: verifiedVoidMicro,
    reserved_void_micro: verifiedVoidMicro,
    remaining_void_micro: poolVoidMicro - verifiedVoidMicro,
  });
}

function assertProjectionMatchesStrictLedgerV1(
  decision: ReturnType<
    typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
  >,
  strict: ReturnType<typeof readStrictCapacityLedgerV1>,
): void {
  if (
    BigInt(decision.verified_void_micro) !== strict.verified_void_micro ||
    BigInt(decision.reserved_void_micro) !== strict.reserved_void_micro ||
    BigInt(decision.remaining_void_micro) !== strict.remaining_void_micro
  ) {
    fail("buy_void_verified_payment_capacity_projection_mismatch");
  }
}

function fsyncDirectoryV1(directory: string): void {
  const descriptor = fs.openSync(
    directory,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY,
  );
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function appendPaymentVerifiedEventDurableV1(
  operatorLedger: PinnedLedgerV1,
  expectedBefore: any,
  eventLine: Buffer,
): void {
  const code = "buy_void_verified_payment_capacity_operator_events";
  const bytes = Buffer.from(eventLine);
  if (
    bytes.length < 3 ||
    bytes.length > LEDGER_MAX_BYTES ||
    bytes[bytes.length - 1] !== 0x0a
  ) {
    fail("buy_void_verified_payment_capacity_event_append_bytes_invalid");
  }
  const before = assertPinnedLedgerVisibleV1(operatorLedger, code);
  if (!sameFileIdentityV1(expectedBefore, before)) {
    fail("buy_void_verified_payment_capacity_operator_events_changed_since_census");
  }
  if (
    before.size + BigInt(bytes.length) >
    BigInt(LEDGER_MAX_BYTES)
  ) {
    fail("buy_void_verified_payment_capacity_event_append_size_exceeded");
  }

  const written = fs.writeSync(
    operatorLedger.fd,
    bytes,
    0,
    bytes.length,
    null,
  );
  if (written !== bytes.length) {
    fail("buy_void_verified_payment_capacity_event_append_short_write");
  }
  fs.fsyncSync(operatorLedger.fd);

  const after = fs.fstatSync(operatorLedger.fd, { bigint: true });
  validateLedgerStatV1(after, code);
  if (
    !sameFileInodeCustodyV1(before, after) ||
    after.size !== before.size + BigInt(bytes.length)
  ) {
    fail("buy_void_verified_payment_capacity_event_append_identity_changed");
  }
  const visible = fs.lstatSync(operatorLedger.path, { bigint: true });
  validateLedgerStatV1(visible, code);
  if (!sameFileIdentityV1(after, visible)) {
    fail("buy_void_verified_payment_capacity_event_append_path_changed");
  }
  fs.fsyncSync(operatorLedger.directory.fd);
}

function paymentVerifiedSidecarPathV1(
  requestDir: string,
  event: Record<string, any>,
): string {
  const requestId = String(event.request_id || "").trim();
  const markedAt = Number(event.marked_at_ms);
  if (
    !REQUEST_ID.test(requestId) ||
    !Number.isSafeInteger(markedAt) ||
    markedAt < 1
  ) {
    fail("buy_void_verified_payment_capacity_sidecar_identity_invalid");
  }
  return path.join(
    requestDir,
    "operator-event-" + requestId + "-" + String(markedAt) + ".json",
  );
}

function ensurePaymentVerifiedSidecarExactV1(
  requestDir: string,
  event: Record<string, any>,
): "created" | "existing" {
  const sidecar = paymentVerifiedSidecarPathV1(requestDir, event);
  const expected = Buffer.from(JSON.stringify(event, null, 2), "utf8");
  const tempPrefix = "." + path.basename(sidecar) + ".tmp-";

  const verifyExisting = () => {
    const code =
      "buy_void_verified_payment_capacity_sidecar_conflict";
    const visibleBefore = fs.lstatSync(sidecar, { bigint: true });
    if (
      !visibleBefore.isFile() ||
      visibleBefore.isSymbolicLink() ||
      visibleBefore.size !== BigInt(expected.length) ||
      visibleBefore.nlink < 1n ||
      (
        typeof process.getuid === "function" &&
        visibleBefore.uid !== BigInt(process.getuid())
      ) ||
      (Number(visibleBefore.mode) & 0o022) !== 0
    ) {
      fail(code);
    }

    const nonblock =
      typeof fs.constants.O_NONBLOCK === "number"
        ? fs.constants.O_NONBLOCK
        : 0;
    const descriptor = fs.openSync(
      sidecar,
      fs.constants.O_RDONLY | O_NOFOLLOW | nonblock,
    );
    try {
      const before = fs.fstatSync(descriptor, { bigint: true });
      if (
        !before.isFile() ||
        before.size !== BigInt(expected.length) ||
        before.nlink < 1n ||
        !sameFileIdentityV1(visibleBefore, before)
      ) {
        fail(code);
      }

      // Read no more than the pinned size plus one sentinel byte. Concurrent
      // growth HOLDS before excess bytes can be buffered.
      const buffer = Buffer.alloc(expected.length + 1);
      let total = 0;
      while (total < buffer.length) {
        const read = fs.readSync(
          descriptor,
          buffer,
          total,
          buffer.length - total,
          total,
        );
        if (read === 0) break;
        total += read;
      }
      if (total !== expected.length) {
        fail(code);
      }
      const observed = buffer.subarray(0, total);
      if (!observed.equals(expected)) {
        fail(code);
      }

      const afterRead = fs.fstatSync(descriptor, { bigint: true });
      const visibleAfterRead =
        fs.lstatSync(sidecar, { bigint: true });
      if (
        !sameFileIdentityV1(before, afterRead) ||
        !sameFileIdentityV1(afterRead, visibleAfterRead)
      ) {
        fail(code);
      }

      // Crash recovery may leave the create-only temp hardlink. Every extra
      // link must be an exact owned temp name to this already verified inode.
      let ownedTempLinks = 0n;
      for (const name of fs.readdirSync(requestDir)) {
        if (!name.startsWith(tempPrefix)) continue;
        const candidate = path.join(requestDir, name);
        let candidateMetadata;
        try {
          candidateMetadata =
            fs.lstatSync(candidate, { bigint: true });
        } catch {
          continue;
        }
        if (
          candidateMetadata.isFile() &&
          !candidateMetadata.isSymbolicLink() &&
          candidateMetadata.dev === afterRead.dev &&
          candidateMetadata.ino === afterRead.ino
        ) {
          ownedTempLinks += 1n;
        }
      }
      if (afterRead.nlink !== 1n + ownedTempLinks) {
        fail(code);
      }

      if (ownedTempLinks > 0n) {
        for (const name of fs.readdirSync(requestDir)) {
          if (!name.startsWith(tempPrefix)) continue;
          const candidate = path.join(requestDir, name);
          let candidateMetadata;
          try {
            candidateMetadata =
              fs.lstatSync(candidate, { bigint: true });
          } catch {
            continue;
          }
          if (
            candidateMetadata.isFile() &&
            !candidateMetadata.isSymbolicLink() &&
            candidateMetadata.dev === afterRead.dev &&
            candidateMetadata.ino === afterRead.ino
          ) {
            fs.unlinkSync(candidate);
          }
        }
        fsyncDirectoryV1(requestDir);
      }

      const finalFd = fs.fstatSync(descriptor, { bigint: true });
      const finalVisible =
        fs.lstatSync(sidecar, { bigint: true });
      if (
        finalFd.nlink !== 1n ||
        finalFd.size !== BigInt(expected.length) ||
        !sameFileInodeCustodyV1(afterRead, finalFd) ||
        !sameFileIdentityV1(finalFd, finalVisible)
      ) {
        fail(code);
      }
    } finally {
      fs.closeSync(descriptor);
    }
  };

  if (fs.existsSync(sidecar)) {
    verifyExisting();
    return "existing";
  }

  const tempPath = path.join(
    requestDir,
    tempPrefix + process.pid + "-" + randomBytes(8).toString("hex"),
  );
  let descriptor = -1;
  try {
    descriptor = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    const written = fs.writeSync(
      descriptor,
      expected,
      0,
      expected.length,
      null,
    );
    if (written !== expected.length) {
      fail("buy_void_verified_payment_capacity_sidecar_short_write");
    }
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = -1;

    try {
      fs.linkSync(tempPath, sidecar);
      fsyncDirectoryV1(requestDir);
    } catch (error: any) {
      if (String(error?.code || "") !== "EEXIST") throw error;
      verifyExisting();
      return "existing";
    }

    fs.unlinkSync(tempPath);
    fsyncDirectoryV1(requestDir);
    return "created";
  } finally {
    if (descriptor >= 0) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // Best-effort descriptor cleanup after the primary failure.
      }
    }
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // A hidden temp file is not public status authority.
    }
  }
}

function recoverPaymentVerifiedSidecarsV1(
  requestDir: string,
  requestId: string,
): { recovered: number; verified_events: number } {
  return withBuyVoidTerminalCloseoutRequestLockV1(
    { request_dir: requestDir, request_id: requestId },
    () => {
      const rows = readStrictJsonLinesV1(
        path.join(requestDir, "operator-events.jsonl"),
        "buy_void_verified_payment_capacity_operator_events",
      );
      const verified = rows.filter(
        (row) =>
          String(row.request_id || "").trim() === requestId &&
          String(row.operator_status || "").trim() === "payment_verified",
      );
      if (verified.length < 1) {
        fail("buy_void_verified_payment_capacity_verified_event_missing");
      }
      let recovered = 0;
      for (const row of verified) {
        if (
          ensurePaymentVerifiedSidecarExactV1(requestDir, row) ===
          "created"
        ) {
          recovered += 1;
        }
      }
      return Object.freeze({
        recovered,
        verified_events: verified.length,
      });
    },
  );
}

function freezeDecision(input: {
  ready: boolean;
  reason: string | null;
  already_verified: boolean;
  quoted_void_micro: bigint;
  pool_void_micro: bigint;
  reserved_void_micro: bigint;
  verified_void_micro: bigint;
  remaining_void_micro: bigint;
}) {
  return Object.freeze({
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1,
    version: 1,
    ready: input.ready,
    reason: input.reason,
    already_verified: input.already_verified,
    quoted_void_micro: input.quoted_void_micro.toString(),
    pool_void_micro: input.pool_void_micro.toString(),
    reserved_void_micro: input.reserved_void_micro.toString(),
    verified_void_micro: input.verified_void_micro.toString(),
    remaining_void_micro: input.remaining_void_micro.toString(),
    authority:
      VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1,
  });
}

export function classifyBuyVoidVerifiedPaymentCapacityAdmissionV1(input: {
  sale_state: any;
  quoted_void: unknown;
  already_verified?: boolean;
}) {
  const quoted = microVoid(
    input?.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  const sale = input?.sale_state;
  if (!sale || typeof sale !== "object" || Array.isArray(sale)) {
    fail("buy_void_verified_payment_capacity_state_invalid");
  }
  const pool = microVoid(
    sale.pool_void_total,
    "buy_void_verified_payment_capacity_state_invalid",
    true,
  );
  const reserved = microVoid(
    sale.allocation_reserved_void,
    "buy_void_verified_payment_capacity_state_invalid",
  );
  const verified = microVoid(
    sale.verified_void_total,
    "buy_void_verified_payment_capacity_state_invalid",
  );
  const remaining = microVoid(
    sale.remaining_void,
    "buy_void_verified_payment_capacity_state_invalid",
  );
  if (
    reserved > pool ||
    verified > pool ||
    remaining > pool ||
    reserved !== verified ||
    reserved + remaining !== pool
  ) {
    return freezeDecision({
      ready: false,
      reason: "buy_void_verified_payment_capacity_state_invalid",
      already_verified: input.already_verified === true,
      quoted_void_micro: quoted,
      pool_void_micro: pool,
      reserved_void_micro: reserved,
      verified_void_micro: verified,
      remaining_void_micro: remaining,
    });
  }
  const already = input.already_verified === true;
  if (!already && quoted > remaining) {
    return freezeDecision({
      ready: false,
      reason: "buy_void_verified_payment_capacity_exceeded",
      already_verified: false,
      quoted_void_micro: quoted,
      pool_void_micro: pool,
      reserved_void_micro: reserved,
      verified_void_micro: verified,
      remaining_void_micro: remaining,
    });
  }
  return freezeDecision({
    ready: true,
    reason: null,
    already_verified: already,
    quoted_void_micro: quoted,
    pool_void_micro: pool,
    reserved_void_micro: reserved,
    verified_void_micro: verified,
    remaining_void_micro: remaining,
  });
}

export async function withBuyVoidVerifiedPaymentCapacityAdmissionV1<T>(input: {
  request_dir: string;
  request_id: string;
  quoted_void: unknown;
  verified_payment_event: any;
  request: any;
  read_sale_state: () => Promise<any>;
  operation: (authority: {
    request_ledger: PinnedLedgerV1;
    operator_ledger: PinnedLedgerV1;
    request_ledger_stat: any;
    operator_ledger_stat: any;
    request_jsonl: Buffer;
    operator_jsonl: Buffer;
    strict_verified_request_ids: readonly string[];
    capacity_decision: ReturnType<
      typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
    >;
    duplicate_guard: ReturnType<
      typeof classifyBuyVoidVerifiedPaymentDuplicateGuardV1
    >;
  }) => Promise<T> | T;
  idempotent_operation?: (authority: {
    request_ledger: PinnedLedgerV1;
    operator_ledger: PinnedLedgerV1;
    request_ledger_stat: any;
    operator_ledger_stat: any;
    request_jsonl: Buffer;
    operator_jsonl: Buffer;
    strict_verified_request_ids: readonly string[];
    capacity_decision: ReturnType<
      typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
    >;
    duplicate_guard: ReturnType<
      typeof classifyBuyVoidVerifiedPaymentDuplicateGuardV1
    >;
  }) => Promise<T> | T;
}): Promise<{
  ok: true;
  idempotent: boolean;
  operation_performed: boolean;
  decision: ReturnType<
    typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
  >;
  duplicate_guard: ReturnType<
    typeof classifyBuyVoidVerifiedPaymentDuplicateGuardV1
  >;
  result: T | null;
}> {
  const rawDir = String(input?.request_dir || "").trim();
  const requestId = String(input?.request_id || "").trim();
  if (
    !rawDir ||
    !REQUEST_ID.test(requestId) ||
    !input?.verified_payment_event ||
    typeof input.verified_payment_event !== "object" ||
    Array.isArray(input.verified_payment_event) ||
    !input?.request ||
    typeof input.request !== "object" ||
    Array.isArray(input.request) ||
    String(input.verified_payment_event.request_id || "").trim() !== requestId ||
    String(input.request.request_id || "").trim() !== requestId ||
    typeof input?.read_sale_state !== "function" ||
    typeof input?.operation !== "function" ||
    (
      input?.idempotent_operation !== undefined &&
      typeof input.idempotent_operation !== "function"
    )
  ) {
    fail("buy_void_verified_payment_capacity_input_invalid");
  }
  const candidateQuoteMicro = microVoid(
    input.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  const requestDir = path.resolve(rawDir);
  const lockPath = path.join(
    requestDir,
    ".verified-payment-capacity-admission-v1",
  );

  return withBuyVoidFilesystemBakeryLockAsyncV1(
    lockPath,
    async () => {
      const directory = openPinnedRequestDirectoryV1(requestDir);
      const requestLedger = openPinnedLedgerV1(
        directory,
        "requests.jsonl",
        "buy_void_verified_payment_capacity_requests",
        { writable: false, create: false },
      );
      if (requestLedger === null) {
        fs.closeSync(directory.fd);
        fail("buy_void_verified_payment_capacity_candidate_request_missing");
      }
      const operatorLedger = openPinnedLedgerV1(
        directory,
        "operator-events.jsonl",
        "buy_void_verified_payment_capacity_operator_events",
        { writable: true, create: true },
      );
      if (operatorLedger === null) {
        fs.closeSync(requestLedger.fd);
        fs.closeSync(directory.fd);
        fail("buy_void_verified_payment_capacity_operator_events_unavailable");
      }
      try {
        const saleBefore = await input.read_sale_state();
        const poolBefore = microVoid(
          saleBefore?.pool_void_total,
          "buy_void_verified_payment_capacity_state_invalid",
          true,
        );
        const strictBefore = readStrictCapacityLedgerV1(
          requestLedger,
          operatorLedger,
          poolBefore,
        );
        const durableRequestQuote =
          strictBefore.request_quotes.get(requestId);
        if (durableRequestQuote === undefined) {
          fail("buy_void_verified_payment_capacity_candidate_request_missing");
        }
        if (durableRequestQuote !== candidateQuoteMicro) {
          fail("buy_void_verified_payment_capacity_candidate_quote_mismatch");
        }

        const durablePaymentBinding =
          strictBefore.request_payment_bindings.get(requestId);
        if (!durablePaymentBinding?.tx_hash) {
          fail(
            "buy_void_verified_payment_capacity_candidate_payment_binding_missing",
          );
        }

        const requestTxHash = String(input.request.tx_hash || "")
          .trim()
          .toLowerCase();
        const eventTxHash = String(input.verified_payment_event.tx_hash || "")
          .trim()
          .toLowerCase();
        const requestChainRaw = String(
          input.request.source_chain || input.request.chain || "",
        )
          .trim()
          .toLowerCase();
        const verifierChainRaw = String(
          input.verified_payment_event?.payment_verifier?.chain || "",
        )
          .trim()
          .toLowerCase();
        const requestChain =
          requestChainRaw === "eth" ? "ethereum" : requestChainRaw;
        const verifierChain =
          verifierChainRaw === "eth" ? "ethereum" : verifierChainRaw;
        if (
          !requestTxHash ||
          requestTxHash !== eventTxHash ||
          !requestChain ||
          requestChain !== verifierChain ||
          requestTxHash !== durablePaymentBinding.tx_hash ||
          requestChain !== durablePaymentBinding.source_chain
        ) {
          fail("buy_void_verified_payment_duplicate_guard_request_binding_mismatch");
        }

        const duplicateBefore =
          classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
            candidate_event: input.verified_payment_event,
            existing_events: strictBefore.operator_events,
          });
        if (duplicateBefore.ok === false) {
          fail(
            "buy_void_verified_payment_duplicate_guard_" +
              duplicateBefore.reason,
          );
        }

        const alreadyVerified = strictBefore.verified_ids.has(requestId);
        if (duplicateBefore.idempotent !== alreadyVerified) {
          fail("buy_void_verified_payment_duplicate_guard_projection_mismatch");
        }
        const before = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
          sale_state: saleBefore,
          quoted_void: input.quoted_void,
          already_verified: alreadyVerified,
        });
        assertProjectionMatchesStrictLedgerV1(before, strictBefore);
        if (!before.ready) fail(String(before.reason));

        const operationAuthority = Object.freeze({
          request_ledger: requestLedger,
          operator_ledger: operatorLedger,
          request_ledger_stat: strictBefore.request_ledger_stat,
          operator_ledger_stat: strictBefore.operator_ledger_stat,
          request_jsonl: Buffer.from(strictBefore.request_jsonl),
          operator_jsonl: Buffer.from(strictBefore.operator_jsonl),
          strict_verified_request_ids: Object.freeze(
            [...strictBefore.verified_ids].sort(),
          ),
          capacity_decision: before,
          duplicate_guard: duplicateBefore,
        });

        if (alreadyVerified) {
          if (typeof input.idempotent_operation !== "function") {
            return Object.freeze({
              ok: true as const,
              idempotent: true,
              operation_performed: false,
              decision: before,
              duplicate_guard: duplicateBefore,
              result: null,
            });
          }

          const candidateLine =
            JSON.stringify(input.verified_payment_event);
          const exactHistoricalEvent =
            strictBefore.operator_events.some(
              (row) =>
                String(row.request_id || "").trim() === requestId &&
                String(row.operator_status || "").trim() ===
                  "payment_verified" &&
                JSON.stringify(row) === candidateLine,
            );
          if (!exactHistoricalEvent) {
            fail(
              "buy_void_verified_payment_capacity_idempotent_event_not_exact_history",
            );
          }

          const result =
            await input.idempotent_operation(operationAuthority);
          const saleAfterRecovery = await input.read_sale_state();
          const poolAfterRecovery = microVoid(
            saleAfterRecovery?.pool_void_total,
            "buy_void_verified_payment_capacity_state_invalid",
            true,
          );
          if (poolAfterRecovery !== poolBefore) {
            fail("buy_void_verified_payment_capacity_pool_changed");
          }
          const strictAfterRecovery = readStrictCapacityLedgerV1(
            requestLedger,
            operatorLedger,
            poolAfterRecovery,
          );
          const duplicateAfterRecovery =
            classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
              candidate_event: input.verified_payment_event,
              existing_events: strictAfterRecovery.operator_events,
            });
          if (
            !duplicateAfterRecovery.ok ||
            duplicateAfterRecovery.idempotent !== true ||
            strictAfterRecovery.verified_void_micro !==
              strictBefore.verified_void_micro ||
            strictAfterRecovery.reserved_void_micro !==
              strictBefore.reserved_void_micro ||
            strictAfterRecovery.remaining_void_micro !==
              strictBefore.remaining_void_micro ||
            !strictAfterRecovery.verified_ids.has(requestId)
          ) {
            fail(
              "buy_void_verified_payment_capacity_idempotent_recovery_postcheck_failed",
            );
          }
          const afterRecovery =
            classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
              sale_state: saleAfterRecovery,
              quoted_void: input.quoted_void,
              already_verified: true,
            });
          assertProjectionMatchesStrictLedgerV1(
            afterRecovery,
            strictAfterRecovery,
          );
          if (!afterRecovery.ready) {
            fail(
              "buy_void_verified_payment_capacity_idempotent_recovery_postcheck_failed",
            );
          }
          return Object.freeze({
            ok: true as const,
            idempotent: true,
            operation_performed: false,
            decision: before,
            duplicate_guard: duplicateAfterRecovery,
            result,
          });
        }

        const result = await input.operation(operationAuthority);
        const saleAfter = await input.read_sale_state();
        const poolAfter = microVoid(
          saleAfter?.pool_void_total,
          "buy_void_verified_payment_capacity_state_invalid",
          true,
        );
        if (poolAfter !== poolBefore) {
          fail("buy_void_verified_payment_capacity_pool_changed");
        }
        const strictAfter = readStrictCapacityLedgerV1(
          requestLedger,
          operatorLedger,
          poolAfter,
        );
        const durableRequestQuoteAfter =
          strictAfter.request_quotes.get(requestId);
        if (durableRequestQuoteAfter !== candidateQuoteMicro) {
          fail("buy_void_verified_payment_capacity_candidate_quote_changed");
        }
        const durablePaymentBindingAfter =
          strictAfter.request_payment_bindings.get(requestId);
        if (
          !durablePaymentBindingAfter ||
          durablePaymentBindingAfter.source_chain !==
            durablePaymentBinding.source_chain ||
          durablePaymentBindingAfter.tx_hash !== durablePaymentBinding.tx_hash
        ) {
          fail(
            "buy_void_verified_payment_capacity_candidate_payment_binding_changed",
          );
        }
        const duplicateAfter =
          classifyBuyVoidVerifiedPaymentDuplicateGuardV1({
            candidate_event: input.verified_payment_event,
            existing_events: strictAfter.operator_events,
          });
        if (!duplicateAfter.ok || duplicateAfter.idempotent !== true) {
          fail("buy_void_verified_payment_duplicate_guard_postcheck_failed");
        }

        const after = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
          sale_state: saleAfter,
          quoted_void: input.quoted_void,
          already_verified: true,
        });
        assertProjectionMatchesStrictLedgerV1(after, strictAfter);
        if (!after.ready) {
          fail("buy_void_verified_payment_capacity_postcheck_failed");
        }
        const expectedVerified =
          BigInt(before.verified_void_micro) +
          BigInt(before.quoted_void_micro);
        const expectedRemaining =
          BigInt(before.remaining_void_micro) -
          BigInt(before.quoted_void_micro);
        if (
          !strictAfter.verified_ids.has(requestId) ||
          strictAfter.verified_void_micro !== expectedVerified ||
          strictAfter.reserved_void_micro !== expectedVerified ||
          strictAfter.remaining_void_micro !== expectedRemaining ||
          BigInt(after.verified_void_micro) !== expectedVerified ||
          BigInt(after.reserved_void_micro) !== expectedVerified ||
          BigInt(after.remaining_void_micro) !== expectedRemaining ||
          after.pool_void_micro !== before.pool_void_micro
        ) {
          fail("buy_void_verified_payment_capacity_postcheck_failed");
        }
        return Object.freeze({
          ok: true as const,
          idempotent: false,
          operation_performed: true,
          decision: before,
          duplicate_guard: duplicateAfter,
          result,
        });
      } finally {
        fs.closeSync(operatorLedger.fd);
        fs.closeSync(requestLedger.fd);
        fs.closeSync(directory.fd);
      }
    },
  );
}

export const VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    same_capacity_serialization_domain: true,
    prior_verified_allocation_completeness_required: true,
    durable_payment_verified_before_allocation: true,
    idempotent_missing_allocation_recovery: true,
    duplicate_payment_reappend: false,
    allocation_publication_writer_reused: true,
    canonical_allocation_planner_reused: true,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    deployed_runtime_verified: false,
    public_presale_activation: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    chain2050_write: false,
    funds_movement: false,
    production_gate_ready: false,
  });

function sha256RefV1(bytes: Buffer): string {
  return (
    "sha256:" +
    createHash("sha256").update(bytes).digest("hex")
  );
}

function microTextV1(units: bigint): string {
  if (units < 0n) {
    fail("buy_void_verified_payment_allocation_micro_invalid");
  }
  const whole = units / MICRO;
  const fraction = (units % MICRO)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/u, "");
  return fraction ? whole + "." + fraction : whole.toString();
}

function deepFreezeJsonValueV1(value: any): any {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreezeJsonValueV1(child);
  }
  return Object.freeze(value);
}

function canonicalVerifiedPaymentEventV1(value: any): {
  event: Readonly<Record<string, any>>;
  line: Buffer;
} {
  let json: string;
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== "string") {
      fail("buy_void_verified_payment_allocation_event_serialization_invalid");
    }
    json = serialized;
  } catch {
    fail("buy_void_verified_payment_allocation_event_serialization_invalid");
  }

  const line = Buffer.from(json + "\n", "utf8");
  if (line.length < 3 || line.length > LEDGER_MAX_BYTES) {
    fail("buy_void_verified_payment_allocation_event_serialization_invalid");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    fail("buy_void_verified_payment_allocation_event_serialization_invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("buy_void_verified_payment_allocation_event_serialization_invalid");
  }

  const event = deepFreezeJsonValueV1(parsed) as Readonly<Record<string, any>>;
  const rebound = Buffer.from(JSON.stringify(event) + "\n", "utf8");
  if (!rebound.equals(line)) {
    fail("buy_void_verified_payment_allocation_event_canonical_roundtrip_mismatch");
  }

  return Object.freeze({
    event,
    line: Buffer.from(line),
  });
}

function verifiedPaymentEventLineV1(event: any): Buffer {
  return Buffer.from(JSON.stringify(event) + "\n", "utf8");
}

function stableAllocationGuardRefV1(
  domain: string,
  values: readonly string[],
): string {
  return sha256RefV1(
    Buffer.from([domain, ...values].join("\n"), "utf8"),
  );
}

function allocationActivationReceiptRefV1(request: any): string {
  const raw = String(
    request?.launch_authority?.activation_receipt_sha256 || "",
  )
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(raw)) {
    fail(
      "buy_void_verified_payment_allocation_activation_receipt_invalid",
    );
  }
  return "sha256:" + raw;
}

function assertPriorVerifiedAllocationsCompleteV1(input: {
  current_request_id: string;
  allocation_ledger_root: string;
  allocation_high_water_root: string;
  authority: {
    request_jsonl: Buffer;
    operator_jsonl: Buffer;
    strict_verified_request_ids: readonly string[];
  };
}): Buffer {
  const snapshot =
    snapshotBuyVoidAllocationReservationPublicationWriterV1({
      ledger_root: input.allocation_ledger_root,
      high_water_root: input.allocation_high_water_root,
    });
  if (snapshot.ok === false) {
    fail(
      "buy_void_verified_payment_allocation_precheck_snapshot_" +
        snapshot.reason,
    );
  }
  const allocationBytes = Buffer.from(
    snapshot.ledger_jsonl,
    "utf8",
  );
  for (const priorRequestId of
    input.authority.strict_verified_request_ids) {
    if (priorRequestId === input.current_request_id) {
      continue;
    }
    const prior =
      classifyBuyVoidVerifiedAllocationReplayBindingV1({
        request_id: priorRequestId,
        requests_jsonl: Buffer.from(input.authority.request_jsonl),
        operator_events_jsonl: Buffer.from(
          input.authority.operator_jsonl,
        ),
        allocation_jsonl: allocationBytes,
      });
    if (prior.ok !== true || prior.status !== "allocation_present") {
      fail(
        "buy_void_verified_payment_allocation_prior_verified_gap",
      );
    }
  }
  return allocationBytes;
}

function persistVerifiedPaymentAllocationUnderCapacityLockV1(input: {
  request: any;
  event: any;
  event_line: Buffer;
  allocation_ledger_root: string;
  allocation_high_water_root: string;
  authority: {
    request_jsonl: Buffer;
    operator_jsonl: Buffer;
    strict_verified_request_ids: readonly string[];
    capacity_decision: ReturnType<
      typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
    >;
    duplicate_guard: ReturnType<
      typeof classifyBuyVoidVerifiedPaymentDuplicateGuardV1
    >;
  };
  payment_event_already_durable: boolean;
}) {
  const requestId = String(input.request?.request_id || "").trim();
  const eventLine = Buffer.from(input.event_line);
  if (!eventLine.equals(verifiedPaymentEventLineV1(input.event))) {
    fail("buy_void_verified_payment_allocation_event_bytes_mismatch");
  }
  const eventSha = sha256RefV1(eventLine);

  const snapshot =
    snapshotBuyVoidAllocationReservationPublicationWriterV1({
      ledger_root: input.allocation_ledger_root,
      high_water_root: input.allocation_high_water_root,
    });
  if (snapshot.ok === false) {
    fail(
      "buy_void_verified_payment_allocation_snapshot_" +
        snapshot.reason,
    );
  }
  let allocationBytes = Buffer.from(
    snapshot.ledger_jsonl,
    "utf8",
  );

  // Never accept another payment while an older verified obligation remains
  // unallocated. On exact replay, the current request is the one allowed gap
  // and is repaired below.
  for (const priorRequestId of
    input.authority.strict_verified_request_ids) {
    if (
      input.payment_event_already_durable &&
      priorRequestId === requestId
    ) {
      continue;
    }
    const prior = classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id: priorRequestId,
      requests_jsonl: Buffer.from(input.authority.request_jsonl),
      operator_events_jsonl: Buffer.from(
        input.authority.operator_jsonl,
      ),
      allocation_jsonl: allocationBytes,
    });
    if (prior.ok !== true || prior.status !== "allocation_present") {
      fail(
        "buy_void_verified_payment_allocation_prior_verified_gap",
      );
    }
  }

  if (input.payment_event_already_durable) {
    const current = classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id: requestId,
      requests_jsonl: Buffer.from(input.authority.request_jsonl),
      operator_events_jsonl: Buffer.from(
        input.authority.operator_jsonl,
      ),
      allocation_jsonl: allocationBytes,
    });
    if (
      current.status !== "allocation_present" &&
      current.status !== "verified_allocation_missing"
    ) {
      fail(
        "buy_void_verified_payment_allocation_replay_lineage_invalid",
      );
    }
    if (
      current.payment_verified_event_sha256 !== eventSha
    ) {
      fail(
        "buy_void_verified_payment_allocation_event_digest_mismatch",
      );
    }
  }

  const allocationClassified =
    classifyBuyVoidAllocationReservationLedgerV1(
      allocationBytes,
    );
  if (allocationClassified.ok === false) {
    fail(
      "buy_void_verified_payment_allocation_ledger_" +
        allocationClassified.reason,
    );
  }
  const lastCreated =
    allocationClassified.records.length > 0
      ? allocationClassified.records[
          allocationClassified.records.length - 1
        ].created_at_ms
      : 0;
  const eventMarkedAt = Number(input.event?.marked_at_ms);
  if (
    !Number.isSafeInteger(eventMarkedAt) ||
    eventMarkedAt < 1
  ) {
    fail(
      "buy_void_verified_payment_allocation_event_time_invalid",
    );
  }
  const createdAt = Math.max(
    lastCreated,
    eventMarkedAt,
    Date.now(),
  );

  const verifier = input.event?.payment_verifier;
  if (
    !verifier ||
    typeof verifier !== "object" ||
    Array.isArray(verifier)
  ) {
    fail(
      "buy_void_verified_payment_allocation_verifier_missing",
    );
  }
  const logIndex = String(verifier.log_index ?? "").trim();
  const verifierReceiptRef = sha256RefV1(
    Buffer.from(JSON.stringify(verifier), "utf8"),
  );
  const duplicateRef = stableAllocationGuardRefV1(
    "VOID_BUY_VOID_ALLOCATION_DUPLICATE_GUARD_BINDING_V1",
    [
      requestId,
      eventSha,
      String(input.request.source_chain || "").trim().toLowerCase(),
      String(input.request.tx_hash || "").trim().toLowerCase(),
      logIndex,
    ],
  );
  const inventoryRef = stableAllocationGuardRefV1(
    "VOID_BUY_VOID_ALLOCATION_CAPACITY_GUARD_BINDING_V1",
    [
      String(input.authority.capacity_decision.pool_void_micro),
      String(input.authority.capacity_decision.quoted_void_micro),
      eventSha,
    ],
  );

  const plan = planBuyVoidAllocationReservationV1({
    ledger_jsonl: allocationBytes,
    request_id: requestId,
    source_chain: input.request.source_chain,
    payment_transaction_hash: input.request.tx_hash,
    payment_log_index: logIndex,
    launch_authority: input.request.launch_authority,
    buyer_delivery_wallet: input.request.delivery_address,
    quote_void_amount: input.request.quoted_void,
    quote_usdc_amount: input.request.usdc_amount,
    pool_void_total: microTextV1(
      BigInt(input.authority.capacity_decision.pool_void_micro),
    ),
    verified_payment_receipt_ref: verifierReceiptRef,
    payment_verified_event_sha256: eventSha,
    duplicate_payment_guard_result: duplicateRef,
    inventory_allocation_guard_result: inventoryRef,
    operator_activation_record_ref:
      allocationActivationReceiptRefV1(input.request),
    created_at_ms: createdAt,
    verified_payment_gate_green: true,
    duplicate_payment_guard_green:
      input.authority.duplicate_guard.ok === true,
    inventory_allocation_guard_green:
      input.authority.capacity_decision.ready === true,
    operator_activation_record_green: true,
  });
  if (plan.ok === false) {
    fail(
      "buy_void_verified_payment_allocation_plan_" +
        plan.reason,
    );
  }

  const persisted =
    persistBuyVoidAllocationReservationPublicationWriterV1({
      ledger_root: input.allocation_ledger_root,
      high_water_root: input.allocation_high_water_root,
      next_ledger_jsonl: plan.next_ledger_jsonl,
    });
  if (persisted.ok === false) {
    fail(
      "buy_void_verified_payment_allocation_persist_" +
        persisted.reason,
    );
  }

  const finalSnapshot =
    snapshotBuyVoidAllocationReservationPublicationWriterV1({
      ledger_root: input.allocation_ledger_root,
      high_water_root: input.allocation_high_water_root,
    });
  if (finalSnapshot.ok === false) {
    fail(
      "buy_void_verified_payment_allocation_post_snapshot_" +
        finalSnapshot.reason,
    );
  }
  allocationBytes = Buffer.from(
    finalSnapshot.ledger_jsonl,
    "utf8",
  );
  const operatorBytes =
    input.payment_event_already_durable
      ? Buffer.from(input.authority.operator_jsonl)
      : Buffer.concat([
          Buffer.from(input.authority.operator_jsonl),
          eventLine,
        ]);
  const rebound =
    classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id: requestId,
      requests_jsonl: Buffer.from(input.authority.request_jsonl),
      operator_events_jsonl: operatorBytes,
      allocation_jsonl: allocationBytes,
    });
  if (
    rebound.ok !== true ||
    rebound.status !== "allocation_present" ||
    rebound.payment_verified_event_sha256 !== eventSha ||
    rebound.allocation_record_id !== plan.record.record_id
  ) {
    fail(
      "buy_void_verified_payment_allocation_postcheck_failed",
    );
  }

  return Object.freeze({
    ok: true as const,
    marker:
      VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1,
    idempotent: plan.idempotent,
    payment_verified_event_sha256: eventSha,
    allocation_record_id: plan.record.record_id,
    allocation_writer_status: persisted.status,
    allocation_writer_operation_performed:
      persisted.operation_performed,
    prior_allocation_recovery_performed:
      snapshot.operation_performed,
    final_record_count: finalSnapshot.record_count,
    final_tip_hash: finalSnapshot.tip_hash,
    runtime_integration: false as const,
    protected_high_water_custody_proven: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1,
  });
}

export async function writeBuyVoidVerifiedPaymentAllocationHandoffV1(
  input: {
    event: any;
    request: any;
    request_dir: string;
    allocation_ledger_root: string;
    allocation_high_water_root: string;
    with_launch_authority_mutation: (
      request: any,
      operation: (assert_current_authority: () => any) => any,
    ) => Promise<any>;
    read_sale_state: () => Promise<any>;
    test_only_after_payment_fsync?: (() => void) | null;
    test_only_after_allocation_persist?: (() => void) | null;
  },
) {
  const rawEvent = input?.event;
  const request = input?.request;
  if (
    !rawEvent ||
    typeof rawEvent !== "object" ||
    Array.isArray(rawEvent)
  ) {
    fail("buy_void_verified_payment_allocation_handoff_input_invalid");
  }
  const canonicalEvent = canonicalVerifiedPaymentEventV1(rawEvent);
  const event = canonicalEvent.event;
  const eventLine = canonicalEvent.line;
  const requestDirRaw = String(input?.request_dir || "").trim();
  const allocationLedgerRoot = String(
    input?.allocation_ledger_root || "",
  ).trim();
  const allocationHighWaterRoot = String(
    input?.allocation_high_water_root || "",
  ).trim();
  const requestId = String(event?.request_id || "").trim();
  if (
    String(event.operator_status || "") !== "payment_verified" ||
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    !REQUEST_ID.test(requestId) ||
    requestId !== String(request.request_id || "").trim() ||
    !requestDirRaw ||
    !allocationLedgerRoot ||
    !allocationHighWaterRoot ||
    typeof input?.with_launch_authority_mutation !== "function" ||
    typeof input?.read_sale_state !== "function" ||
    (
      input.test_only_after_payment_fsync !== undefined &&
      input.test_only_after_payment_fsync !== null &&
      typeof input.test_only_after_payment_fsync !== "function"
    ) ||
    (
      input.test_only_after_allocation_persist !== undefined &&
      input.test_only_after_allocation_persist !== null &&
      typeof input.test_only_after_allocation_persist !== "function"
    )
  ) {
    fail("buy_void_verified_payment_allocation_handoff_input_invalid");
  }

  const requestQuoted = microVoid(
    request.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  const eventQuoted = microVoid(
    event.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  if (requestQuoted !== eventQuoted) {
    fail("buy_void_verified_payment_capacity_quote_mismatch");
  }

  const requestDir = path.resolve(requestDirRaw);
  fs.mkdirSync(requestDir, { recursive: true });

  const admission =
    await withBuyVoidVerifiedPaymentCapacityAdmissionV1({
      request_dir: requestDir,
      request_id: requestId,
      quoted_void: request.quoted_void,
      verified_payment_event: event,
      request,
      read_sale_state: input.read_sale_state,
      operation: (authority) =>
        input.with_launch_authority_mutation(
          request,
          (assertCurrentAuthority) =>
            withBuyVoidTerminalCloseoutRequestLockV1(
              {
                request_dir: requestDir,
                request_id: requestId,
              },
              () => {
                if (
                  typeof assertCurrentAuthority !== "function"
                ) {
                  fail(
                    "buy_void_verified_payment_capacity_launch_authority_assertion_missing",
                  );
                }
                assertCurrentAuthority();
                const requestBeforeAppend =
                  assertPinnedLedgerVisibleV1(
                    authority.request_ledger,
                    "buy_void_verified_payment_capacity_requests",
                  );
                if (
                  !sameFileIdentityV1(
                    authority.request_ledger_stat,
                    requestBeforeAppend,
                  )
                ) {
                  fail(
                    "buy_void_verified_payment_capacity_requests_changed_since_census",
                  );
                }
                const preappendAllocationBytes =
                  assertPriorVerifiedAllocationsCompleteV1({
                    current_request_id: requestId,
                    allocation_ledger_root: allocationLedgerRoot,
                    allocation_high_water_root:
                      allocationHighWaterRoot,
                    authority,
                  });
                const preappend =
                  classifyBuyVoidPreappendVerifiedPaymentLineageV1({
                    request,
                    event,
                    requests_jsonl: Buffer.from(
                      authority.request_jsonl,
                    ),
                    prior_operator_events_jsonl: Buffer.from(
                      authority.operator_jsonl,
                    ),
                    allocation_jsonl: Buffer.from(
                      preappendAllocationBytes,
                    ),
                  });
                if (preappend.ok !== true) {
                  fail(
                    "buy_void_verified_payment_preappend_lineage_" +
                      String(preappend.reason || "held"),
                  );
                }
                appendPaymentVerifiedEventDurableV1(
                  authority.operator_ledger,
                  authority.operator_ledger_stat,
                  eventLine,
                );
                if (
                  typeof input.test_only_after_payment_fsync ===
                  "function"
                ) {
                  input.test_only_after_payment_fsync();
                }
                const allocation =
                  persistVerifiedPaymentAllocationUnderCapacityLockV1({
                    request,
                    event,
                    event_line: eventLine,
                    allocation_ledger_root:
                      allocationLedgerRoot,
                    allocation_high_water_root:
                      allocationHighWaterRoot,
                    authority,
                    payment_event_already_durable: false,
                  });
                if (
                  typeof input.test_only_after_allocation_persist ===
                  "function"
                ) {
                  input.test_only_after_allocation_persist();
                }
                const sidecarState =
                  ensurePaymentVerifiedSidecarExactV1(
                    requestDir,
                    event,
                  );
                return Object.freeze({
                  ok: true as const,
                  dir: requestDir,
                  payment_event_appended: true as const,
                  allocation,
                  sidecar_state: sidecarState,
                });
              },
            ),
        ),
      idempotent_operation: (authority) =>
        withBuyVoidTerminalCloseoutRequestLockV1(
          {
            request_dir: requestDir,
            request_id: requestId,
          },
          () => {
            const allocation =
              persistVerifiedPaymentAllocationUnderCapacityLockV1({
                request,
                event,
                event_line: eventLine,
                allocation_ledger_root:
                  allocationLedgerRoot,
                allocation_high_water_root:
                  allocationHighWaterRoot,
                authority,
                payment_event_already_durable: true,
              });
            if (
              typeof input.test_only_after_allocation_persist ===
              "function"
            ) {
              input.test_only_after_allocation_persist();
            }
            const sidecarState =
              ensurePaymentVerifiedSidecarExactV1(
                requestDir,
                event,
              );
            return Object.freeze({
              ok: true as const,
              dir: requestDir,
              payment_event_appended: false as const,
              allocation,
              sidecar_state: sidecarState,
            });
          },
        ),
    });

  const result = admission.result;
  if (!result) {
    fail(
      "buy_void_verified_payment_allocation_handoff_result_missing",
    );
  }
  return Object.freeze({
    ...result,
    idempotent: admission.idempotent,
    capacity_admission: admission.decision,
    duplicate_guard: admission.duplicate_guard,
    runtime_integration: false as const,
    protected_high_water_custody_proven: false as const,
    production_gate_ready: false as const,
    funds_movement: false as const,
    authority:
      VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1,
  });
}

export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1(input: {
  event: any;
  request: any;
  request_dir: string;
  with_launch_authority_mutation: (
    request: any,
    operation: (assert_current_authority: () => any) => any,
  ) => Promise<any>;
  read_sale_state: () => Promise<any>;
}) {
  const event = input?.event;
  const request = input?.request;
  const requestDirRaw = String(input?.request_dir || "").trim();
  const requestId = String(event?.request_id || "").trim();
  if (
    !event ||
    typeof event !== "object" ||
    Array.isArray(event) ||
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    !REQUEST_ID.test(requestId) ||
    requestId !== String(request?.request_id || "").trim() ||
    !requestDirRaw ||
    typeof input?.with_launch_authority_mutation !== "function" ||
    typeof input?.read_sale_state !== "function"
  ) {
    fail("buy_void_operator_event_capacity_writer_input_invalid");
  }
  const requestDir = path.resolve(requestDirRaw);
  fs.mkdirSync(requestDir, { recursive: true });

  const paymentVerified =
    String(event.operator_status || "") === "payment_verified";

  if (!paymentVerified) {
    return withBuyVoidTerminalCloseoutRequestLockV1(
      {
        request_dir: requestDir,
        request_id: requestId,
      },
      () => {
        fs.appendFileSync(
          path.join(requestDir, "operator-events.jsonl"),
          JSON.stringify(event) + "\n",
        );
        fs.writeFileSync(
          path.join(
            requestDir,
            "operator-event-" +
              requestId +
              "-" +
              String(event.marked_at_ms || "") +
              ".json",
          ),
          JSON.stringify(event, null, 2),
        );
        return { ok: true, dir: requestDir };
      },
    );
  }

  const canonicalPayment =
    canonicalVerifiedPaymentEventV1(event);
  const paymentEvent = canonicalPayment.event;
  const paymentEventLine = canonicalPayment.line;
  if (
    String(paymentEvent.request_id || "").trim() !== requestId ||
    String(paymentEvent.operator_status || "") !== "payment_verified"
  ) {
    fail("buy_void_verified_payment_capacity_canonical_event_identity_mismatch");
  }

  const requestQuoted = microVoid(
    request.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  const eventQuoted = microVoid(
    paymentEvent.quoted_void,
    "buy_void_verified_payment_capacity_quote_invalid",
    true,
  );
  if (requestQuoted !== eventQuoted) {
    fail("buy_void_verified_payment_capacity_quote_mismatch");
  }

  const admission =
    await withBuyVoidVerifiedPaymentCapacityAdmissionV1({
      request_dir: requestDir,
      request_id: requestId,
      quoted_void: request.quoted_void,
      verified_payment_event: paymentEvent,
      request,
      read_sale_state: input.read_sale_state,
      operation: (authority) =>
        input.with_launch_authority_mutation(
          request,
          (assertCurrentAuthority) =>
            withBuyVoidTerminalCloseoutRequestLockV1(
              {
                request_dir: requestDir,
                request_id: requestId,
              },
              () => {
                if (typeof assertCurrentAuthority !== "function") {
                  fail(
                    "buy_void_verified_payment_capacity_launch_authority_assertion_missing",
                  );
                }
                assertCurrentAuthority();
                const requestBeforeAppend =
                  assertPinnedLedgerVisibleV1(
                    authority.request_ledger,
                    "buy_void_verified_payment_capacity_requests",
                  );
                if (
                  !sameFileIdentityV1(
                    authority.request_ledger_stat,
                    requestBeforeAppend,
                  )
                ) {
                  fail(
                    "buy_void_verified_payment_capacity_requests_changed_since_census",
                  );
                }
                appendPaymentVerifiedEventDurableV1(
                  authority.operator_ledger,
                  authority.operator_ledger_stat,
                  paymentEventLine,
                );
                return { ok: true, dir: requestDir };
              },
            ),
        ),
    });
  if (admission.idempotent) {
    const recovery = recoverPaymentVerifiedSidecarsV1(
      requestDir,
      requestId,
    );
    return {
      ok: true,
      dir: requestDir,
      idempotent: true,
      sidecar_recovered: recovery.recovered > 0,
      recovered_sidecar_count: recovery.recovered,
      capacity_admission: admission.decision,
      duplicate_guard: admission.duplicate_guard,
    };
  }
  const sidecarState = withBuyVoidTerminalCloseoutRequestLockV1(
    { request_dir: requestDir, request_id: requestId },
    () => ensurePaymentVerifiedSidecarExactV1(requestDir, paymentEvent),
  );
  return {
    ...(admission.result as any),
    idempotent: false,
    sidecar_recovered: false,
    recovered_sidecar_count: 0,
    sidecar_state: sidecarState,
    capacity_admission: admission.decision,
    duplicate_guard: admission.duplicate_guard,
  };
}
