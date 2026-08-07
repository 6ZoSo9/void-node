import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_FILESYSTEM_BAKERY_LOCK_V1 =
  "VOID_BUY_VOID_FILESYSTEM_BAKERY_LOCK_V1";

export const VOID_BUY_VOID_FILESYSTEM_BAKERY_LOCK_AUTHORITY_V1 = {
  source_only_contract: true,
  unique_claim_paths: true,
  choosing_phase_required: true,
  monotonically_increasing_ticket: true,
  dead_process_claim_cleanup: true,
  own_claim_cleanup_only: true,
  shared_replacement_unlink: false,
  filesystem_read: true,
  filesystem_write: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

const CLAIM_SCHEMA = "void_buy_void_filesystem_bakery_lock_claim_v1";
const NONCE = /^[0-9a-f]{32}$/;
const CHOOSING = /^choosing-([1-9][0-9]*)-([0-9a-f]{32})\.json$/;
const TICKET = /^ticket-([0-9]{16})-([1-9][0-9]*)-([0-9a-f]{32})\.json$/;
const TEMP = /^\..+\.tmp-([1-9][0-9]*)-([0-9a-f]{16})$/;
const MAX_JSON_BYTES = 16 * 1024;
const STALE_TEMP_MS = 60_000;
const MAX_WAIT_MS = 30_000;
const POLL_MS = 10;
const SLEEP = new Int32Array(new SharedArrayBuffer(4));

export type BuyVoidFilesystemBakeryLockClaimV1 = {
  schema: typeof CLAIM_SCHEMA;
  pid: number;
  nonce: string;
  phase: "choosing" | "ticket";
  ticket: number | null;
  created_at_utc: string;
};

type ScannedClaimV1 = BuyVoidFilesystemBakeryLockClaimV1 & {
  path: string;
  name: string;
};

function safeInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    throw new Error(`${label}_invalid`);
  }
  return parsed;
}

function canonicalUtc(value: unknown, label: string): string {
  const raw = String(value || "").trim();
  const time = Date.parse(raw);
  if (!raw || !Number.isFinite(time) || new Date(time).toISOString() !== raw) {
    throw new Error(`${label}_invalid`);
  }
  return raw;
}

function ensurePrivateDirectory(directory: string): string {
  const resolved = path.resolve(directory);
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  fs.chmodSync(resolved, 0o700);
  const metadata = fs.lstatSync(resolved);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("bakery_lock_directory_must_be_direct_directory");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("bakery_lock_directory_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("bakery_lock_directory_must_be_private");
  }
  return resolved;
}

function fsyncDirectory(directory: string): void {
  const descriptor = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function atomicWriteJson(file: string, value: unknown): void {
  const parent = ensurePrivateDirectory(path.dirname(file));
  const temporary = path.join(
    parent,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`,
  );
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, file);
  fsyncDirectory(parent);
}

function readClaim(file: string): BuyVoidFilesystemBakeryLockClaimV1 {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("bakery_lock_claim_must_be_direct_file");
  }
  if (metadata.size < 2 || metadata.size > MAX_JSON_BYTES) {
    throw new Error("bakery_lock_claim_size_out_of_range");
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("bakery_lock_claim_object_required");
  }
  const value = parsed as Record<string, unknown>;
  const keys = Object.keys(value).sort();
  const expected = [
    "created_at_utc",
    "nonce",
    "phase",
    "pid",
    "schema",
    "ticket",
  ].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error("bakery_lock_claim_keys_invalid");
  }
  if (value.schema !== CLAIM_SCHEMA) {
    throw new Error("bakery_lock_claim_schema_invalid");
  }
  const pid = safeInteger(value.pid, 1, Number.MAX_SAFE_INTEGER, "bakery_lock_pid");
  const nonce = String(value.nonce || "");
  if (!NONCE.test(nonce)) throw new Error("bakery_lock_nonce_invalid");
  const phase = String(value.phase || "");
  if (phase !== "choosing" && phase !== "ticket") {
    throw new Error("bakery_lock_phase_invalid");
  }
  let ticket: number | null = null;
  if (phase === "choosing") {
    if (value.ticket !== null) {
      throw new Error("bakery_lock_choosing_ticket_must_be_null");
    }
  } else {
    ticket = safeInteger(
      value.ticket,
      1,
      Number.MAX_SAFE_INTEGER,
      "bakery_lock_ticket",
    );
  }
  return {
    schema: CLAIM_SCHEMA,
    pid,
    nonce,
    phase,
    ticket,
    created_at_utc: canonicalUtc(
      value.created_at_utc,
      "bakery_lock_created_at",
    ),
  };
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    throw error;
  }
}

function removeOwnClaim(file: string): void {
  try {
    fs.unlinkSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
}

function scanQueue(queue: string): {
  choosing: ScannedClaimV1[];
  tickets: ScannedClaimV1[];
} {
  const choosing: ScannedClaimV1[] = [];
  const tickets: ScannedClaimV1[] = [];
  let changed = false;

  for (const entry of fs.readdirSync(queue, { withFileTypes: true })) {
    const full = path.join(queue, entry.name);
    if (entry.name.includes(".tmp-")) {
      if (!TEMP.test(entry.name) || !entry.isFile() || entry.isSymbolicLink()) {
        throw new Error("bakery_lock_temporary_entry_invalid");
      }
      let metadata: fs.Stats;
      try {
        metadata = fs.lstatSync(full);
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code === "ENOENT") continue;
        throw error;
      }
      if (Date.now() - metadata.mtimeMs > STALE_TEMP_MS) {
        removeOwnClaim(full);
        changed = true;
      }
      continue;
    }

    const choosingMatch = CHOOSING.exec(entry.name);
    const ticketMatch = TICKET.exec(entry.name);
    if (!choosingMatch && !ticketMatch) {
      throw new Error("bakery_lock_queue_entry_invalid");
    }
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error("bakery_lock_queue_claim_invalid");
    }

    let claim: BuyVoidFilesystemBakeryLockClaimV1;
    let metadata: fs.Stats;
    try {
      metadata = fs.lstatSync(full);
      claim = readClaim(full);
    } catch (error) {
      try {
        metadata = fs.lstatSync(full);
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException)?.code === "ENOENT") continue;
        throw statError;
      }
      if (Date.now() - metadata.mtimeMs > STALE_TEMP_MS) {
        removeOwnClaim(full);
        changed = true;
        continue;
      }
      throw error;
    }

    const match = choosingMatch || ticketMatch;
    if (!match) throw new Error("bakery_lock_filename_match_missing");
    const pid = Number(choosingMatch ? match[1] : match[2]);
    const nonce = choosingMatch ? match[2] : match[3];
    if (claim.pid !== pid || claim.nonce !== nonce) {
      throw new Error("bakery_lock_filename_binding_mismatch");
    }
    if (choosingMatch) {
      if (claim.phase !== "choosing" || claim.ticket !== null) {
        throw new Error("bakery_lock_choosing_binding_mismatch");
      }
    } else {
      const ticket = Number(match[1]);
      if (claim.phase !== "ticket" || claim.ticket !== ticket) {
        throw new Error("bakery_lock_ticket_binding_mismatch");
      }
    }

    if (!processIsAlive(claim.pid)) {
      removeOwnClaim(full);
      changed = true;
      continue;
    }

    const scanned: ScannedClaimV1 = {
      ...claim,
      path: full,
      name: entry.name,
    };
    if (claim.phase === "choosing") choosing.push(scanned);
    else tickets.push(scanned);
  }

  if (changed) fsyncDirectory(queue);
  return { choosing, tickets };
}

function sleep(ms: number): void {
  Atomics.wait(SLEEP, 0, 0, ms);
}

export function withBuyVoidFilesystemBakeryLockV1<T>(
  lockPath: string,
  operation: () => T,
): T {
  const raw = String(lockPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("bakery_lock_path_must_be_absolute");
  }
  const queue = ensurePrivateDirectory(`${path.resolve(raw)}.queue`);
  const nonce = crypto.randomBytes(16).toString("hex");
  const createdAt = new Date().toISOString();
  const choosingPath = path.join(
    queue,
    `choosing-${process.pid}-${nonce}.json`,
  );
  let ticketPath = "";

  atomicWriteJson(choosingPath, {
    schema: CLAIM_SCHEMA,
    pid: process.pid,
    nonce,
    phase: "choosing",
    ticket: null,
    created_at_utc: createdAt,
  });

  try {
    const initial = scanQueue(queue);
    const maximum = initial.tickets.reduce(
      (current, claim) => Math.max(current, claim.ticket || 0),
      0,
    );
    const ticket = safeInteger(
      maximum + 1,
      1,
      Number.MAX_SAFE_INTEGER,
      "bakery_lock_ticket",
    );
    ticketPath = path.join(
      queue,
      `ticket-${String(ticket).padStart(16, "0")}-${process.pid}-${nonce}.json`,
    );
    atomicWriteJson(ticketPath, {
      schema: CLAIM_SCHEMA,
      pid: process.pid,
      nonce,
      phase: "ticket",
      ticket,
      created_at_utc: createdAt,
    });
    removeOwnClaim(choosingPath);
    fsyncDirectory(queue);

    const deadline = Date.now() + MAX_WAIT_MS;
    for (;;) {
      const scanned = scanQueue(queue);
      const own = scanned.tickets.find((claim) => claim.path === ticketPath);
      if (!own) throw new Error("bakery_lock_ownership_lost");
      if (scanned.choosing.length === 0) {
        scanned.tickets.sort((left, right) =>
          (left.ticket || 0) - (right.ticket || 0) ||
          left.pid - right.pid ||
          left.nonce.localeCompare(right.nonce),
        );
        if (scanned.tickets[0]?.path === ticketPath) break;
      }
      if (Date.now() >= deadline) {
        throw new Error("bakery_lock_wait_timeout");
      }
      sleep(POLL_MS);
    }

    return operation();
  } finally {
    removeOwnClaim(choosingPath);
    if (ticketPath) removeOwnClaim(ticketPath);
    fsyncDirectory(queue);
  }
}
