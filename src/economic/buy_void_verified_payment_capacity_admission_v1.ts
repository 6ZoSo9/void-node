import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  withBuyVoidTerminalCloseoutRequestLockV1,
} from "./buy_void_terminal_closeout_request_lock_v1.js";

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
    duplicate_payment_identity_verification: false,
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

const LEDGER_MAX_BYTES = 64 * 1024 * 1024;
const O_NOFOLLOW =
  typeof fs.constants.O_NOFOLLOW === "number"
    ? fs.constants.O_NOFOLLOW
    : 0;
const O_DIRECTORY =
  typeof fs.constants.O_DIRECTORY === "number"
    ? fs.constants.O_DIRECTORY
    : 0;

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
): Buffer {
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
  return bytes;
}

function parseStrictJsonLinesV1(bytes: Buffer, code: string): any[] {
  const text = bytes.toString("utf8");
  if (text.length === 0) return [];
  const lines = text.endsWith("\n")
    ? text.slice(0, -1).split("\n")
    : text.split("\n");
  if (lines.some((line) => line.length === 0)) {
    fail(code + "_empty_row");
  }
  return lines.map((line) => {
    let value: any;
    try {
      value = JSON.parse(line);
    } catch {
      fail(code + "_json_invalid");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(code + "_row_invalid");
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
    return parseStrictJsonLinesV1(
      readPinnedLedgerBytesV1(ledger, code),
      code,
    );
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
      return parseStrictJsonLinesV1(
        readPinnedLedgerBytesV1(
          ledger,
          code,
          testOnlyAfterStatBeforeRead,
        ),
        code,
      );
    } finally {
      fs.closeSync(ledger.fd);
    }
  } finally {
    fs.closeSync(directory.fd);
  }
}

function readStrictCapacityLedgerV1(
  directory: PinnedRequestDirectoryV1,
  operatorLedger: PinnedLedgerV1,
  poolVoidMicro: bigint,
) {
  const requestRows = readStrictJsonLinesFromDirectoryV1(
    directory,
    "requests.jsonl",
    "buy_void_verified_payment_capacity_requests",
  );
  const quotes = new Map<string, bigint>();
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
  }

  const eventRows = parseStrictJsonLinesV1(
    readPinnedLedgerBytesV1(
      operatorLedger,
      "buy_void_verified_payment_capacity_operator_events",
    ),
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
  return Object.freeze({
    verified_ids: verifiedIds,
    request_quotes: quotes,
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
  event: Record<string, any>,
): void {
  const code = "buy_void_verified_payment_capacity_operator_events";
  const bytes = Buffer.from(JSON.stringify(event) + "\n", "utf8");
  const before = assertPinnedLedgerVisibleV1(operatorLedger, code);
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
    const metadata = fs.lstatSync(sidecar);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.size !== expected.length
    ) {
      fail("buy_void_verified_payment_capacity_sidecar_conflict");
    }
    const observed = fs.readFileSync(sidecar);
    if (!observed.equals(expected)) {
      fail("buy_void_verified_payment_capacity_sidecar_conflict");
    }

    // If a crash happened after create-only hard-link publication but before
    // temporary-link cleanup, remove only temp names that reference the exact
    // already-verified final inode.
    for (const name of fs.readdirSync(requestDir)) {
      if (!name.startsWith(tempPrefix)) continue;
      const candidate = path.join(requestDir, name);
      let candidateMetadata;
      try {
        candidateMetadata = fs.lstatSync(candidate);
      } catch {
        continue;
      }
      if (
        candidateMetadata.isFile() &&
        !candidateMetadata.isSymbolicLink() &&
        candidateMetadata.dev === metadata.dev &&
        candidateMetadata.ino === metadata.ino
      ) {
        fs.unlinkSync(candidate);
        fsyncDirectoryV1(requestDir);
      }
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
  read_sale_state: () => Promise<any>;
  operation: (ledger: PinnedLedgerV1) => Promise<T> | T;
}): Promise<{
  ok: true;
  idempotent: boolean;
  operation_performed: boolean;
  decision: ReturnType<
    typeof classifyBuyVoidVerifiedPaymentCapacityAdmissionV1
  >;
  result: T | null;
}> {
  const rawDir = String(input?.request_dir || "").trim();
  const requestId = String(input?.request_id || "").trim();
  if (
    !rawDir ||
    !REQUEST_ID.test(requestId) ||
    typeof input?.read_sale_state !== "function" ||
    typeof input?.operation !== "function"
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
      const operatorLedger = openPinnedLedgerV1(
        directory,
        "operator-events.jsonl",
        "buy_void_verified_payment_capacity_operator_events",
        { writable: true, create: true },
      );
      if (operatorLedger === null) {
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
          directory,
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
        const alreadyVerified = strictBefore.verified_ids.has(requestId);
        const before = classifyBuyVoidVerifiedPaymentCapacityAdmissionV1({
          sale_state: saleBefore,
          quoted_void: input.quoted_void,
          already_verified: alreadyVerified,
        });
        assertProjectionMatchesStrictLedgerV1(before, strictBefore);
        if (!before.ready) fail(String(before.reason));

        if (alreadyVerified) {
          return Object.freeze({
            ok: true as const,
            idempotent: true,
            operation_performed: false,
            decision: before,
            result: null,
          });
        }

        const result = await input.operation(operatorLedger);
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
          directory,
          operatorLedger,
          poolAfter,
        );
        const durableRequestQuoteAfter =
          strictAfter.request_quotes.get(requestId);
        if (durableRequestQuoteAfter !== candidateQuoteMicro) {
          fail("buy_void_verified_payment_capacity_candidate_quote_changed");
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
          result,
        });
      } finally {
        fs.closeSync(operatorLedger.fd);
        fs.closeSync(directory.fd);
      }
    },
  );
}

export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1(input: {
  event: any;
  request: any;
  request_dir: string;
  with_launch_authority_mutation: (
    request: any,
    operation: () => any,
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

  const admission =
    await withBuyVoidVerifiedPaymentCapacityAdmissionV1({
      request_dir: requestDir,
      request_id: requestId,
      quoted_void: request.quoted_void,
      read_sale_state: input.read_sale_state,
      operation: (operatorLedger) =>
        input.with_launch_authority_mutation(
          request,
          () =>
            withBuyVoidTerminalCloseoutRequestLockV1(
              {
                request_dir: requestDir,
                request_id: requestId,
              },
              () => {
                appendPaymentVerifiedEventDurableV1(
                  operatorLedger,
                  event,
                );
                ensurePaymentVerifiedSidecarExactV1(
                  requestDir,
                  event,
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
    };
  }
  return {
    ...(admission.result as any),
    idempotent: false,
    capacity_admission: admission.decision,
  };
}
