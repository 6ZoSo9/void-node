import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  withBuyVoidFilesystemBakeryLockV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";

export const VOID_BUY_VOID_TERMINAL_CLOSEOUT_REQUEST_LOCK_V1 =
  "VOID_BUY_VOID_TERMINAL_CLOSEOUT_REQUEST_LOCK_V1";

export const VOID_BUY_VOID_TERMINAL_CLOSEOUT_REQUEST_LOCK_AUTHORITY_V1 = {
  source_only_contract: true,
  exact_request_id_lock_scope: true,
  shared_operator_event_writer_lock: true,
  lock_before_terminal_plan_revalidation: true,
  filesystem_read: true,
  filesystem_write: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,200}$/;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function assertNoSymlinkPathComponents(target: string): string {
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
      throw new Error("terminal_closeout_request_lock_symlink_forbidden");
    }
  }
  return resolved;
}

function ensurePrivateLockDirectory(requestDir: string): string {
  const resolvedRequestDir = assertNoSymlinkPathComponents(requestDir);
  const requestMetadata = fs.lstatSync(resolvedRequestDir);
  if (!requestMetadata.isDirectory() || requestMetadata.isSymbolicLink()) {
    throw new Error("terminal_closeout_request_dir_must_be_direct");
  }

  const locks = path.join(
    resolvedRequestDir,
    ".terminal-closeout-locks-v1",
  );
  try {
    fs.mkdirSync(locks, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") throw error;
  }
  const metadata = fs.lstatSync(locks);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("terminal_closeout_lock_dir_must_be_direct");
  }
  if (
    typeof process.getuid === "function" &&
    metadata.uid !== process.getuid()
  ) {
    throw new Error("terminal_closeout_lock_dir_owner_mismatch");
  }
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error("terminal_closeout_lock_dir_must_be_private");
  }
  return locks;
}

export function buyVoidTerminalCloseoutRequestLockPathV1(input: {
  request_dir: string;
  request_id: string;
}): string {
  const requestDir = String(input?.request_dir || "").trim();
  const requestId = String(input?.request_id || "").trim();
  if (!requestDir || requestDir.includes("\0")) {
    throw new Error("terminal_closeout_request_dir_invalid");
  }
  if (!SAFE_REQUEST_ID.test(requestId)) {
    throw new Error("terminal_closeout_request_id_invalid");
  }
  const locks = ensurePrivateLockDirectory(requestDir);
  return path.join(
    locks,
    sha256(`void-buy-terminal-closeout-request-v1\n${requestId}`),
  );
}

export function withBuyVoidTerminalCloseoutRequestLockV1<T>(
  input: { request_dir: string; request_id: string },
  operation: () => T,
): T {
  if (typeof operation !== "function") {
    throw new Error("terminal_closeout_request_lock_operation_required");
  }
  return withBuyVoidFilesystemBakeryLockV1(
    buyVoidTerminalCloseoutRequestLockPathV1(input),
    operation,
  );
}
