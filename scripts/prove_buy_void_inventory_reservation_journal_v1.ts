import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  BuyVoidFulfillmentJournalIntentV1,
} from "../src/economic/buy_void_fulfillment_journal_v1.js";
import {
  VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1,
  VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1,
  VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1,
  VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1,
  VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
  VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1,
  VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
  buyVoidInventoryReservationJournalPathsV1,
  listBuyVoidInventoryReservationsV1,
  listBuyVoidPaidUnreservableObligationsV1,
  reserveBuyVoidInventoryV1,
  type BuyVoidInventoryReservationPolicyV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";

function processIdentity(pid: number): {
  process_start_ticks: string;
  boot_id: string;
} {
  const stat = fs.readFileSync(
    pid === process.pid ? "/proc/self/stat" : `/proc/${pid}/stat`,
    "utf8",
  ).trim();
  const commandEnd = stat.lastIndexOf(")");
  const fieldsFromState = stat.slice(commandEnd + 1).trim().split(/\s+/u);
  return {
    process_start_ticks: fieldsFromState[19],
    boot_id: fs.readFileSync(
      "/proc/sys/kernel/random/boot_id",
      "utf8",
    ).trim(),
  };
}

function hash(char: string): string {
  return char.repeat(64);
}

function txHash(char: string): string {
  return `0x${char.repeat(64)}`;
}

function address(char: string): string {
  return `0x${char.repeat(40)}`;
}

function makeIntent(
  index: number,
  voidAmountUnits: string,
): BuyVoidFulfillmentJournalIntentV1 {
  const digit = String((index % 8) + 1);
  const paymentKey = hash(digit);
  const requestKey = hash(String(((index + 1) % 8) + 1));
  const requestId = `buyvoid_inventory_request_${index}`;
  const instructionId = `voidfill1_${digit.repeat(32)}`;
  const paymentIdentity =
    `voidpay1:base:${txHash(digit)}:${index}`;

  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1_700_000_000_000 + index,
    payment_key_sha256: paymentKey,
    request_key_sha256: requestKey,
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: paymentIdentity,
      canonical_payment_identity_sha256: hash(
        String(((index + 2) % 8) + 1),
      ),
      request_id: requestId,
      decision_fingerprint: hash(
        String(((index + 3) % 8) + 1),
      ),
      instruction_id: instructionId,
      unsigned_instruction: {
        schema:
          "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: instructionId,
        request_id: requestId,
        canonical_payment_identity: paymentIdentity,
        source_chain: "base",
        payment_transaction_hash: txHash(digit),
        payment_log_index: String(index),
        confirmed_block_number: "12345678",
        confirmation_count: "12",
        payment_usdc_units: "1000000",
        delivery_address: address(digit),
        void_amount_units: voidAmountUnits,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      status: "claimed",
    },
    verification_binding: {
      source_chain: "base",
      payment_transaction_hash: txHash(digit),
      payment_log_index: String(index),
      confirmed_block_number: "12345678",
      confirmation_count_at_claim: "12",
      usdc_contract: address("a"),
      payer_address: address(digit),
      receive_address: address("b"),
      delivery_address: address(digit),
      payment_usdc_units: "1000000",
      requested_usdc_units: "1000000",
      quoted_void_units: voidAmountUnits,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function policy(
  capacity = "1000",
  maximum = "700",
): BuyVoidInventoryReservationPolicyV1 {
  return {
    inventory_reservation_enabled: true,
    pool_id: "void-presale-mainnet0-v1",
    inventory_policy_version: "fixed-cap-v1",
    pool_capacity_void_units: capacity,
    max_reservation_void_units: maximum,
  };
}

function heldReason(
  decision: ReturnType<typeof reserveBuyVoidInventoryV1>,
): string {
  assert.equal(decision.ok, false);
  if (decision.ok) throw new Error("expected held decision");
  return decision.reason;
}

assert.equal(
  VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
  "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1,
  {
    filesystem_read: true,
    filesystem_write: true,
    aggregate_inventory_reservation: true,
    duplicate_safe_reservation: true,
    global_pool_lock: true,
    paid_unreservable_terminal_obligation: true,
    durable_history_expected_set_commitment: true,
    durable_history_filename_content_identity: true,
    durable_history_creation_recovery: true,
    durable_history_separate_anchor_authority: true,
    durable_history_coherent_suffix_rollback_detection: true,
    stale_pool_lock_recovery: true,
    cross_process_pool_lock_release_recovery: true,
    obligation_automatic_retry: false,
    obligation_refund_execution_authorized: false,
    inventory_decrement: false,
    reservation_release: false,
    sold_out_closeout: false,
    request_journal_write: false,
    rpc_call: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    runtime_route_mount: false,
    money_movement: false,
  },
);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-inventory-proof-"),
);

try {
  const firstIntent = makeIntent(1, "400");
  const preview = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: firstIntent,
    policy: policy(),
    apply: false,
    now_ms: 1_700_000_000_100,
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.status, "available");
  if (!preview.ok) throw new Error("preview unexpectedly held");
  assert.equal(preview.applied, false);
  assert.equal(preview.new_reservation, false);
  assert.equal(preview.duplicate, false);
  assert.equal(preview.aggregate.committed_void_units, "400");
  assert.equal(preview.aggregate.available_void_units, "600");
  assert.equal(
    listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }).length,
    0,
  );

  const first = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: firstIntent,
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_000_200,
  });
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.status, "reserved");
  if (!first.ok) throw new Error("first reserve unexpectedly held");
  assert.equal(first.new_reservation, true);
  assert.equal(first.duplicate, false);
  assert.equal(first.reservation.reserved_void_units, "400");
  assert.equal(
    first.reservation.committed_before_void_units,
    "0",
  );
  assert.equal(
    first.reservation.committed_after_void_units,
    "400",
  );
  assert.equal(first.aggregate.available_void_units, "600");
  assert.equal(first.reservation.inventory_decrement_performed, false);
  assert.equal(first.reservation.execution_authorized_by_this_module, false);
  assert.equal(first.reservation.money_movement_authorized_by_this_module, false);

  const duplicate = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: firstIntent,
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_000_300,
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "duplicate");
  if (!duplicate.ok) throw new Error("duplicate unexpectedly held");
  assert.equal(duplicate.new_reservation, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(
    duplicate.reservation.reservation_id,
    first.reservation.reservation_id,
  );
  assert.equal(duplicate.aggregate.committed_void_units, "400");

  const oversized = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(2, "701"),
    policy: policy(),
    apply: true,
  });
  assert.equal(
    heldReason(oversized),
    "inventory_reservation_amount_exceeds_policy",
  );

  const insufficient = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(3, "700"),
    policy: policy(),
    apply: true,
  });
  assert.equal(
    heldReason(insufficient),
    "insufficient_void_inventory",
  );

  const second = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(4, "600"),
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_000_400,
  });
  assert.equal(second.ok, true);
  assert.equal(second.status, "reserved");
  if (!second.ok) throw new Error("second reserve unexpectedly held");
  assert.equal(second.aggregate.committed_void_units, "1000");
  assert.equal(second.aggregate.available_void_units, "0");
  assert.equal(second.aggregate.sold_out, true);
  assert.equal(second.aggregate.reservation_count, 2);

  const soldOut = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(5, "1"),
    policy: policy(),
    apply: true,
  });
  assert.equal(heldReason(soldOut), "inventory_sold_out");

  const changedPolicy = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(6, "1"),
    policy: {
      ...policy(),
      inventory_policy_version: "fixed-cap-v2",
    },
    apply: false,
  });
  assert.equal(heldReason(changedPolicy), "inventory_policy_changed");

  const conflictingIntent = makeIntent(7, "1");
  conflictingIntent.payment_key_sha256 =
    firstIntent.payment_key_sha256;
  const conflict = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: conflictingIntent,
    policy: policy(),
    apply: true,
  });
  assert.equal(
    heldReason(conflict),
    "inventory_reservation_claim_conflict",
  );

  const busyRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-inventory-busy-proof-"),
  );
  try {
    const paths = buyVoidInventoryReservationJournalPathsV1(
      busyRoot,
      policy().pool_id,
    );
    fs.mkdirSync(paths.history_anchor_pool_dir, {
      recursive: true,
      mode: 0o700,
    });
    fs.writeFileSync(
      paths.lock_file,
      `${JSON.stringify({
        schema: "void_buy_void_inventory_pool_lock_v1",
        marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
        pid: 1,
        acquired_at_ms: Date.now(),
        ...processIdentity(1),
        owner_nonce: "a".repeat(32),
      }, null, 2)}
`,
      "utf8",
    );
    fs.chmodSync(paths.lock_file, 0o600);
    const busy = reserveBuyVoidInventoryV1({
      root_dir: busyRoot,
      intent: makeIntent(8, "1"),
      policy: policy(),
      apply: true,
    });
    assert.equal(heldReason(busy), "inventory_reservation_busy");
    fs.unlinkSync(paths.lock_file);

    fs.writeFileSync(
      paths.lock_file,
      `${JSON.stringify({
        schema: "void_buy_void_inventory_pool_lock_v1",
        marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
        pid: 2147483647,
        acquired_at_ms: Date.now(),
        process_start_ticks: "1",
        boot_id: "00000000-0000-0000-0000-000000000000",
        owner_nonce: "b".repeat(32),
      }, null, 2)}
`,
      "utf8",
    );
    fs.chmodSync(paths.lock_file, 0o600);
    const reclaimed = reserveBuyVoidInventoryV1({
      root_dir: busyRoot,
      intent: makeIntent(8, "1"),
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_000_900,
    });
    assert.equal(reclaimed.ok, true);
    assert.equal(fs.existsSync(paths.lock_file), false);
  } finally {
    fs.rmSync(busyRoot, { recursive: true, force: true });
  }

  const records = listBuyVoidInventoryReservationsV1({
    root_dir: root,
    pool_id: policy().pool_id,
  });
  assert.equal(records.length, 2);
  assert.equal(
    records.reduce(
      (total, item) =>
        total + BigInt(item.reserved_void_units),
      0n,
    ),
    1000n,
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}


assert.equal(
  VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1,
  "VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1",
);
assert.equal(
  VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1,
  "VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1",
);
assert.equal(
  VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1,
  "VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1",
);
assert.equal(
  VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1,
  "VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1",
);
assert.equal(
  VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
  "VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1",
);

function historyIndexLines(
  paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>,
): string[] {
  const raw = fs.readFileSync(paths.history_index_file, "utf8");
  assert.equal(raw.endsWith("\n"), true);
  return raw.slice(0, -1).split("\n");
}


function historyAnchorLines(
  paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>,
): string[] {
  const raw = fs.readFileSync(paths.history_anchor_file, "utf8");
  assert.equal(raw.endsWith("\n"), true);
  return raw.slice(0, -1).split("\n");
}

function pendingCreationNames(
  paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>,
): string[] {
  if (!fs.existsSync(paths.pending_history_dir)) return [];
  return fs.readdirSync(paths.pending_history_dir)
    .filter((name) => /^[0-9a-f]{64}\.json$/.test(name))
    .sort();
}

function pendingCreationRaw(
  paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>,
): any {
  const names = pendingCreationNames(paths);
  assert.equal(names.length, 1);
  return JSON.parse(
    fs.readFileSync(
      path.join(paths.pending_history_dir, names[0]),
      "utf8",
    ),
  );
}

function withOneShotOpenFailure(
  target: string,
  body: () => void,
): void {
  const original = fs.openSync;
  let fired = false;
  (fs as any).openSync = (
    file: fs.PathLike,
    flags: fs.OpenMode,
    mode?: fs.Mode,
  ) => {
    const numericFlags = typeof flags === "number" ? flags : 0;
    let sameParent = false;
    try {
      sameParent =
        fs.realpathSync(path.dirname(String(file))) ===
          fs.realpathSync(path.dirname(target));
    } catch {
      sameParent =
        path.basename(path.dirname(String(file))) ===
          path.basename(path.dirname(target));
    }
    if (
      !fired &&
      path.basename(String(file)) === path.basename(target) &&
      sameParent &&
      (numericFlags & fs.constants.O_WRONLY) === fs.constants.O_WRONLY
    ) {
      fired = true;
      throw new Error(`injected_open_failure:${target}`);
    }
    return original(file, flags, mode as any);
  };
  try {
    body();
  } finally {
    (fs as any).openSync = original;
  }
  assert.equal(fired, true);
}

function withRootNamespaceSwapAtIdentityCheck(
  root: string,
  body: (reviewedRoot: string) => void,
): void {
  const reviewedRoot = `${root}-reviewed`;
  const replacementRoot = `${root}-replacement`;
  fs.mkdirSync(replacementRoot, { mode: 0o700 });
  const originalLstat = fs.lstatSync;
  let swapped = false;
  (fs as any).lstatSync = (
    target: fs.PathLike,
    options?: fs.StatOptions,
  ) => {
    if (
      !swapped &&
      path.resolve(String(target)) === path.resolve(root) &&
      typeof options === "object" &&
      options !== null &&
      (options as { bigint?: boolean }).bigint === true
    ) {
      fs.renameSync(root, reviewedRoot);
      fs.renameSync(replacementRoot, root);
      swapped = true;
    }
    return (originalLstat as any)(target, options);
  };
  try {
    body(reviewedRoot);
  } finally {
    (fs as any).lstatSync = originalLstat;
    if (swapped) {
      fs.renameSync(root, replacementRoot);
      fs.renameSync(reviewedRoot, root);
    }
    fs.rmSync(replacementRoot, { recursive: true, force: true });
  }
  assert.equal(swapped, true);
}

function withDescendantNamespaceSwapAtLeafOpen(
  descendantDir: string,
  matchesLeaf: (leaf: string, flags: fs.OpenMode) => boolean,
  prepareReplacement: (replacementDir: string) => void,
  body: (reviewedDir: string, replacementDir: string) => void,
): void {
  const reviewedDir = `${descendantDir}.reviewed-${process.pid}`;
  const replacementDir = `${descendantDir}.replacement-${process.pid}`;
  fs.mkdirSync(replacementDir, { mode: 0o700 });
  prepareReplacement(replacementDir);
  const originalOpen = fs.openSync;
  let swapped = false;
  (fs as any).openSync = (
    target: fs.PathLike,
    flags: fs.OpenMode,
    mode?: fs.Mode,
  ) => {
    const targetText = String(target);
    let openedInsideDescendant = false;
    try {
      openedInsideDescendant =
        fs.realpathSync(path.dirname(targetText)) ===
          fs.realpathSync(descendantDir);
    } catch {
      openedInsideDescendant = false;
    }
    if (
      !swapped &&
      openedInsideDescendant &&
      matchesLeaf(path.basename(targetText), flags)
    ) {
      fs.renameSync(descendantDir, reviewedDir);
      fs.renameSync(replacementDir, descendantDir);
      swapped = true;
    }
    return originalOpen(target, flags, mode as any);
  };
  try {
    body(reviewedDir, descendantDir);
  } finally {
    (fs as any).openSync = originalOpen;
    if (swapped) {
      fs.renameSync(descendantDir, replacementDir);
      fs.renameSync(reviewedDir, descendantDir);
    }
    fs.rmSync(replacementDir, { recursive: true, force: true });
  }
  assert.equal(swapped, true);
}

function withOneShotLinkFailure(
  destinationFragment: string,
  body: () => void,
): void {
  const original = fs.linkSync;
  let fired = false;
  (fs as any).linkSync = (
    existingPath: fs.PathLike,
    newPath: fs.PathLike,
  ) => {
    let destination = String(newPath);
    try {
      destination = path.join(
        fs.realpathSync(path.dirname(destination)),
        path.basename(destination),
      );
    } catch {
      // Keep the rendered descriptor-relative path for the assertion below.
    }
    if (
      !fired &&
      destination.includes(destinationFragment) &&
      /^[0-9a-f]{64}\.json$/.test(path.basename(String(newPath)))
    ) {
      fired = true;
      throw new Error(
        `injected_link_failure:${destinationFragment}`,
      );
    }
    return original(existingPath, newPath);
  };
  try {
    body();
  } finally {
    (fs as any).linkSync = original;
  }
  assert.equal(fired, true);
}

function withOneShotPendingDeleteFailure(
  pendingDir: string,
  body: () => void,
): void {
  const original = fs.unlinkSync;
  let fired = false;
  (fs as any).unlinkSync = (file: fs.PathLike) => {
    let rendered = String(file);
    try {
      rendered = path.join(
        fs.realpathSync(path.dirname(rendered)),
        path.basename(rendered),
      );
    } catch {
      // Keep the rendered descriptor-relative path for the assertion below.
    }
    if (
      !fired &&
      path.basename(path.dirname(rendered)) === path.basename(pendingDir) &&
      /^[0-9a-f]{64}\.json$/.test(path.basename(rendered))
    ) {
      fired = true;
      throw new Error("injected_pending_delete_failure");
    }
    return original(file);
  };
  try {
    body();
  } finally {
    (fs as any).unlinkSync = original;
  }
  assert.equal(fired, true);
}

function finalJsonNames(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /^[0-9a-f]{64}\.json$/.test(name))
    .sort();
}

function withAdversarialRoot(
  label: string,
  body: (root: string) => void,
): void {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), `void-buy-history-${label}-`),
  );
  try {
    body(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function readChildResult(
  child: ReturnType<typeof spawn>,
): Promise<Record<string, any>> {
  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`cross_process_child_timeout:${stderr}`));
    }, 15_000);
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
      const newline = stdout.indexOf("\n");
      if (newline < 0 || settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(JSON.parse(stdout.slice(0, newline)));
      } catch (error) {
        reject(
          new Error(
            `cross_process_child_invalid_json:${
              String((error as Error)?.message || error)
            }:${stdout}:${stderr}`,
          ),
        );
      }
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `cross_process_child_early_exit:${code}:${signal}:${stdout}:${stderr}`,
        ),
      );
    });
  });
}

async function stopChild(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 2_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

function writeCrossProcessLockChild(root: string): string {
  const moduleUrl = pathToFileURL(
    path.resolve(
      "src/economic/buy_void_inventory_reservation_journal_v1.ts",
    ),
  ).href;
  const child = [
    'import fs from "node:fs";',
    `import { buyVoidInventoryReservationJournalPathsV1, reserveBuyVoidInventoryV1 } from ${JSON.stringify(moduleUrl)};`,
    'const [mode, root, inputFile] = process.argv.slice(2);',
    'const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));',
    'const paths = buyVoidInventoryReservationJournalPathsV1(root, input.policy.pool_id);',
    'const originalKill = process.kill;',
    'const originalReadFile = fs.readFileSync;',
    'if (input.owner_identity) {',
    '  process.kill = (pid, signal) => pid === input.owner_identity.pid ? true : originalKill(pid, signal);',
    '  fs.readFileSync = (file, options) => String(file) === "/proc/" + input.owner_identity.pid + "/stat" ? input.owner_identity.process_stat : originalReadFile(file, options);',
    '}',
    'function processIdentity() {',
    '  const stat = fs.readFileSync("/proc/self/stat", "utf8").trim();',
    '  const end = stat.lastIndexOf(")");',
    '  return {',
    '    process_start_ticks: stat.slice(end + 1).trim().split(/\\s+/u)[19],',
    '    boot_id: fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),',
    '  };',
    '}',
    'if (mode === "live-owner") {',
    '  const lock = {',
    '    schema: "void_buy_void_inventory_pool_lock_v1",',
    '    marker: "VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1",',
    '    pid: process.pid,',
    '    acquired_at_ms: Date.now(),',
    '    ...processIdentity(),',
    '    owner_nonce: "a".repeat(32),',
    '  };',
    '  fs.writeFileSync(paths.lock_file, JSON.stringify(lock) + "\\n", { flag: "wx", mode: 0o600 });',
    '  const dir = fs.openSync(paths.history_anchor_pool_dir, "r");',
    '  try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }',
    '  process.stdout.write(JSON.stringify({ ready: true, pid: process.pid, owner_identity: { pid: process.pid, process_stat: fs.readFileSync("/proc/self/stat", "utf8") } }) + "\\n");',
    '  setInterval(() => undefined, 1000);',
    '} else {',
    '  let fired = false;',
    '  const originalUnlink = fs.unlinkSync;',
    '  if (mode === "release-failure") {',
    '    fs.unlinkSync = (file) => {',
    '      if (!fired && String(file).endsWith("/" + paths.lock_file.split("/").pop())) {',
    '        fired = true;',
    '        throw new Error("injected_cross_process_lock_release_failure");',
    '      }',
    '      return originalUnlink(file);',
    '    };',
    '  }',
    '  const result = reserveBuyVoidInventoryV1({ root_dir: root, intent: input.intent, policy: input.policy, apply: true });',
    '  fs.unlinkSync = originalUnlink;',
    '  const releaseFiles = fs.readdirSync(paths.history_anchor_pool_dir).filter((name) => /^\\.reserve\\.lock\\.release-[0-9a-f]{32}\\.json$/u.test(name));',
    '  const survivingLock = fs.existsSync(paths.lock_file) ? JSON.parse(fs.readFileSync(paths.lock_file, "utf8")) : null;',
    '  process.stdout.write(JSON.stringify({ ready: true, result, fired, lock_exists: Boolean(survivingLock), release_files: releaseFiles, owner_identity: survivingLock ? { pid: survivingLock.pid, process_stat: fs.readFileSync("/proc/self/stat", "utf8") } : null }) + "\\n");',
    '  if (mode === "release-failure") setInterval(() => undefined, 1000);',
    '}',
  ].join("\n");
  const file = path.join(root, "cross-process-lock-child.mjs");
  fs.writeFileSync(file, child, { mode: 0o600 });
  return file;
}

async function startCrossProcessChild(
  childFile: string,
  mode: "release-failure" | "retry" | "live-owner",
  root: string,
  inputFile: string,
): Promise<{
  child: ReturnType<typeof spawn>;
  result: Record<string, any>;
}> {
  const child = spawn(
    process.execPath,
    [...process.execArgv, childFile, mode, root, inputFile],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  return { child, result: await readChildResult(child) };
}

async function proveCrossProcessReleaseRecovery(): Promise<void> {
  for (const scenario of ["reservation", "obligation"] as const) {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), `void-buy-history-cross-process-${scenario}-`),
    );
    let owner: ReturnType<typeof spawn> | null = null;
    try {
      const scenarioPolicy = scenario === "reservation"
        ? policy()
        : policy("1", "1");
      if (scenario === "obligation") {
        const seed = reserveBuyVoidInventoryV1({
          root_dir: root,
          intent: makeIntent(90, "1"),
          policy: scenarioPolicy,
          apply: true,
        });
        assert.equal(seed.ok, true);
      }
      const input = {
        intent: makeIntent(scenario === "reservation" ? 91 : 92, "1"),
        policy: scenarioPolicy,
      };
      const inputFile = path.join(root, "cross-process-input.json");
      fs.writeFileSync(inputFile, JSON.stringify(input), { mode: 0o600 });
      const childFile = writeCrossProcessLockChild(root);
      const first = await startCrossProcessChild(
        childFile,
        "release-failure",
        root,
        inputFile,
      );
      owner = first.child;
      assert.equal(first.result.fired, true);
      assert.equal(first.result.lock_exists, true);
      assert.equal(first.result.release_files.length, 1);
      assert.equal(owner.exitCode, null);
      fs.writeFileSync(
        inputFile,
        JSON.stringify({
          ...input,
          owner_identity: first.result.owner_identity,
        }),
        { mode: 0o600 },
      );
      if (scenario === "reservation") {
        assert.equal(first.result.result.ok, true);
      } else {
        assert.equal(first.result.result.ok, false);
        assert.equal(first.result.result.reason, "inventory_sold_out");
      }

      const retry = await startCrossProcessChild(
        childFile,
        "retry",
        root,
        inputFile,
      );
      assert.equal(owner.exitCode, null);
      if (scenario === "reservation") {
        assert.equal(retry.result.result.ok, true);
        assert.equal(retry.result.result.status, "duplicate");
        assert.equal(
          listBuyVoidInventoryReservationsV1({
            root_dir: root,
            pool_id: scenarioPolicy.pool_id,
          }).length,
          1,
        );
      } else {
        assert.equal(retry.result.result.ok, false);
        assert.equal(retry.result.result.reason, "inventory_sold_out");
        assert.equal(
          listBuyVoidPaidUnreservableObligationsV1({
            root_dir: root,
            pool_id: scenarioPolicy.pool_id,
          }).length,
          1,
        );
      }
      assert.equal(retry.result.lock_exists, false);
      await stopChild(retry.child);
    } finally {
      if (owner) await stopChild(owner);
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-history-cross-process-live-owner-"),
  );
  let owner: ReturnType<typeof spawn> | null = null;
  try {
    const livePolicy = policy();
    const seed = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent: makeIntent(93, "1"),
      policy: livePolicy,
      apply: true,
    });
    assert.equal(seed.ok, true);
    const input = {
      intent: makeIntent(94, "1"),
      policy: livePolicy,
    };
    const inputFile = path.join(root, "cross-process-input.json");
    fs.writeFileSync(inputFile, JSON.stringify(input), { mode: 0o600 });
    const childFile = writeCrossProcessLockChild(root);
    const live = await startCrossProcessChild(
      childFile,
      "live-owner",
      root,
      inputFile,
    );
    owner = live.child;
    assert.equal(owner.exitCode, null);
    const livePaths = buyVoidInventoryReservationJournalPathsV1(
      root,
      livePolicy.pool_id,
    );
    assert.equal(fs.existsSync(livePaths.lock_file), true);
    const liveLock = JSON.parse(fs.readFileSync(livePaths.lock_file, "utf8"));
    assert.equal(liveLock.pid, live.result.pid);
    assert.equal(
      fs.readdirSync(livePaths.history_anchor_pool_dir)
        .some((name) => name.startsWith(".reserve.lock.release-")),
      false,
    );
    fs.writeFileSync(
      inputFile,
      JSON.stringify({
        ...input,
        owner_identity: live.result.owner_identity,
      }),
      { mode: 0o600 },
    );
    const blocked = await startCrossProcessChild(
      childFile,
      "retry",
      root,
      inputFile,
    );
    assert.equal(
      blocked.result.result.ok,
      false,
      JSON.stringify(blocked.result),
    );
    assert.equal(
      blocked.result.result.reason,
      "inventory_reservation_busy",
    );
    assert.equal(owner.exitCode, null);
    await stopChild(blocked.child);
  } finally {
    if (owner) await stopChild(owner);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function seedPartiallyAvailablePool(root: string): {
  paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>;
  reservationNames: string[];
} {
  const first = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(1, "400"),
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_010_100,
  });
  assert.equal(first.ok, true);
  const second = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(4, "300"),
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_010_200,
  });
  assert.equal(second.ok, true);
  const paths = buyVoidInventoryReservationJournalPathsV1(
    root,
    policy().pool_id,
  );
  const reservationNames = finalJsonNames(paths.reservations_dir);
  assert.equal(reservationNames.length, 2);
  assert.equal(
    paths.history_anchor_dir.startsWith(`${paths.journal_dir}${path.sep}`),
    false,
  );
  assert.equal(historyAnchorLines(paths).length, 2);
  assert.deepEqual(
    finalJsonNames(paths.reservation_expectations_dir),
    reservationNames,
  );
  assert.equal(historyIndexLines(paths).length, 2);
  return { paths, reservationNames };
}

function assertNewReservationMutationBlocked(
  root: string,
  expectedMessage: RegExp,
): void {
  const paths = buyVoidInventoryReservationJournalPathsV1(
    root,
    policy().pool_id,
  );
  const beforeReservations = finalJsonNames(paths.reservations_dir);
  const beforeHolds = finalJsonNames(paths.holds_dir);
  const decision = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(7, "350"),
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_019_900,
  });
  assert.equal(decision.ok, false);
  if (decision.ok) {
    throw new Error("corrupt durable history unexpectedly admitted mutation");
  }
  assert.equal(decision.new_reservation, false);
  assert.match(
    String(decision.detail?.message || decision.reason),
    expectedMessage,
  );
  assert.deepEqual(
    finalJsonNames(paths.reservations_dir),
    beforeReservations,
  );
  assert.deepEqual(finalJsonNames(paths.holds_dir), beforeHolds);
}

withAdversarialRoot("reservation-null", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  fs.writeFileSync(
    path.join(paths.reservations_dir, reservationNames[0]),
    "null\n",
    "utf8",
  );
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_reservation_history_record/,
  );
  assertNewReservationMutationBlocked(
    root,
    /invalid_inventory_reservation_history_record/,
  );
});

withAdversarialRoot("reservation-malformed", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  fs.writeFileSync(
    path.join(paths.reservations_dir, reservationNames[0]),
    "{not-json\n",
    "utf8",
  );
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_reservation_history_record/,
  );
  assertNewReservationMutationBlocked(
    root,
    /invalid_inventory_reservation_history_record/,
  );
});

withAdversarialRoot("reservation-extra-field", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  const file = path.join(paths.reservations_dir, reservationNames[0]);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  raw.unexpected_field = true;
  fs.writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_reservation_record/,
  );
  assertNewReservationMutationBlocked(
    root,
    /invalid_inventory_reservation_record/,
  );
});

withAdversarialRoot("reservation-substitution", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  const first = path.join(paths.reservations_dir, reservationNames[0]);
  const second = path.join(paths.reservations_dir, reservationNames[1]);
  fs.copyFileSync(first, second);
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_reservation_filename_content_identity_mismatch/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_reservation_filename_content_identity_mismatch/,
  );
});

withAdversarialRoot("reservation-missing", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  fs.unlinkSync(path.join(paths.reservations_dir, reservationNames[0]));
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_reservation_history_expected_set_mismatch/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_reservation_history_expected_set_mismatch/,
  );
});


withAdversarialRoot("reservation-paired-delete", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  fs.unlinkSync(path.join(paths.reservations_dir, reservationNames[0]));
  fs.unlinkSync(
    path.join(paths.reservation_expectations_dir, reservationNames[0]),
  );
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_reservation_history_expected_set_mismatch/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_reservation_history_expected_set_mismatch/,
  );
});

withAdversarialRoot("reservation-paired-rename", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  const renamed = `${"e".repeat(64)}.json`;
  assert.equal(
    fs.existsSync(path.join(paths.reservations_dir, renamed)),
    false,
  );
  fs.renameSync(
    path.join(paths.reservations_dir, reservationNames[0]),
    path.join(paths.reservations_dir, renamed),
  );
  fs.renameSync(
    path.join(paths.reservation_expectations_dir, reservationNames[0]),
    path.join(paths.reservation_expectations_dir, renamed),
  );
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_reservation_history_expected_set_mismatch/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_reservation_history_expected_set_mismatch/,
  );
});

withAdversarialRoot("history-index-malformed-tail", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  fs.appendFileSync(paths.history_index_file, '{"broken":', "utf8");
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_history_index_truncated_tail/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_history_index_truncated_tail/,
  );
});

withAdversarialRoot("history-index-valid-tail-truncation", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  const lines = historyIndexLines(paths);
  assert.equal(lines.length, 2);
  assert.equal(historyAnchorLines(paths).length, 2);
  fs.writeFileSync(
    paths.history_index_file,
    `${lines[0]}\n`,
    "utf8",
  );
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_history_anchor_index_mismatch/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_history_anchor_index_mismatch/,
  );
});

withAdversarialRoot("history-index-missing", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  fs.unlinkSync(paths.history_index_file);
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_history_index_missing_for_existing_history/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_history_index_missing_for_existing_history/,
  );
});

withAdversarialRoot("reservation-unexpected", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  const source = path.join(paths.reservations_dir, reservationNames[0]);
  const unexpected = `${"f".repeat(64)}.json`;
  fs.copyFileSync(source, path.join(paths.reservations_dir, unexpected));
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_reservation_history_expected_set_mismatch/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_reservation_history_expected_set_mismatch/,
  );
});


function assertReservationCreationCrashRecovery(
  label: string,
  inject: (
    paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>,
    body: () => void,
  ) => void,
): void {
  withAdversarialRoot(`reservation-crash-${label}`, (root) => {
    const intent = makeIntent(2, "400");
    const paths = buyVoidInventoryReservationJournalPathsV1(
      root,
      policy().pool_id,
    );
    inject(paths, () => {
      const interrupted = reserveBuyVoidInventoryV1({
        root_dir: root,
        intent,
        policy: policy(),
        apply: true,
        now_ms: 1_700_000_040_100,
      });
      assert.equal(interrupted.ok, false);
      if (interrupted.ok) {
        throw new Error("interrupted reservation unexpectedly passed");
      }
      assert.equal(
        interrupted.reason,
        "inventory_reservation_write_failed",
      );
    });
    assert.equal(pendingCreationNames(paths).length, 1);

    const preview = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent,
      policy: policy(),
      apply: false,
      now_ms: 1_700_000_040_150,
    });
    assert.equal(preview.ok, false);

    const recovered = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_040_200,
    });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) {
      throw new Error(`reservation recovery failed:${label}`);
    }
    assert.equal(recovered.status, "duplicate");
    assert.equal(recovered.new_reservation, false);
    assert.equal(pendingCreationNames(paths).length, 0);
    assert.equal(historyIndexLines(paths).length, 1);
    assert.equal(historyAnchorLines(paths).length, 1);
  });
}

assertReservationCreationCrashRecovery(
  "after-pending-before-index",
  (paths, body) => withOneShotOpenFailure(
    paths.history_index_file,
    body,
  ),
);
assertReservationCreationCrashRecovery(
  "after-index-before-expectation",
  (paths, body) => withOneShotLinkFailure(
    `${path.sep}reservation-expectations${path.sep}`,
    body,
  ),
);
assertReservationCreationCrashRecovery(
  "after-expectation-before-record",
  (paths, body) => withOneShotLinkFailure(
    `${path.sep}reservations${path.sep}`,
    body,
  ),
);
assertReservationCreationCrashRecovery(
  "after-record-before-anchor",
  (paths, body) => withOneShotOpenFailure(
    paths.history_anchor_file,
    body,
  ),
);
assertReservationCreationCrashRecovery(
  "after-anchor-before-pending-delete",
  (paths, body) => withOneShotPendingDeleteFailure(
    paths.pending_history_dir,
    body,
  ),
);

withAdversarialRoot("reservation-crash-torn-index-tail", (root) => {
  const intent = makeIntent(2, "400");
  const paths = buyVoidInventoryReservationJournalPathsV1(
    root,
    policy().pool_id,
  );
  withOneShotOpenFailure(paths.history_index_file, () => {
    const interrupted = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_041_100,
    });
    assert.equal(interrupted.ok, false);
  });
  const expected = JSON.stringify(pendingCreationRaw(paths).index_entry);
  fs.writeFileSync(
    paths.history_index_file,
    expected.slice(0, Math.max(1, Math.floor(expected.length / 3))),
    "utf8",
  );
  fs.chmodSync(paths.history_index_file, 0o600);
  const recovered = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent,
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_041_200,
  });
  assert.equal(recovered.ok, true);
  assert.equal(pendingCreationNames(paths).length, 0);
});

withAdversarialRoot("reservation-crash-torn-anchor-tail", (root) => {
  const intent = makeIntent(2, "400");
  const paths = buyVoidInventoryReservationJournalPathsV1(
    root,
    policy().pool_id,
  );
  withOneShotOpenFailure(paths.history_anchor_file, () => {
    const interrupted = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_042_100,
    });
    assert.equal(interrupted.ok, false);
  });
  const expected = JSON.stringify(pendingCreationRaw(paths).anchor_entry);
  fs.writeFileSync(
    paths.history_anchor_file,
    expected.slice(0, Math.max(1, Math.floor(expected.length / 3))),
    "utf8",
  );
  fs.chmodSync(paths.history_anchor_file, 0o600);
  const recovered = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent,
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_042_200,
  });
  assert.equal(recovered.ok, true);
  assert.equal(pendingCreationNames(paths).length, 0);
});

withAdversarialRoot("reservation-coherent-suffix-rollback", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  const lines = historyIndexLines(paths);
  assert.equal(lines.length, 2);
  assert.equal(historyAnchorLines(paths).length, 2);
  const tail = JSON.parse(lines[1]);
  const name = `${tail.record_id}.json`;
  fs.writeFileSync(paths.history_index_file, `${lines[0]}\n`, "utf8");
  fs.unlinkSync(path.join(paths.reservations_dir, name));
  fs.unlinkSync(path.join(paths.reservation_expectations_dir, name));
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_history_anchor_index_mismatch/,
  );
  assertNewReservationMutationBlocked(
    root,
    /inventory_history_anchor_index_mismatch/,
  );
});

function seedObligations(root: string): {
  paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>;
  obligationNames: string[];
} {
  const reserved = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(1, "700"),
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_020_100,
  });
  assert.equal(reserved.ok, true);

  for (const [index, amount] of [[4, "400"], [7, "500"]] as const) {
    const held = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent: makeIntent(index, amount),
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_020_100 + index,
    });
    assert.equal(held.ok, false);
    if (held.ok) throw new Error("expected insufficient inventory hold");
    assert.equal(
      held.detail?.terminal_recovery_obligation_recorded,
      true,
    );
  }

  const paths = buyVoidInventoryReservationJournalPathsV1(
    root,
    policy().pool_id,
  );
  const obligationNames = finalJsonNames(paths.holds_dir);
  assert.equal(obligationNames.length, 2);
  assert.deepEqual(
    finalJsonNames(paths.obligation_expectations_dir),
    obligationNames,
  );
  assert.equal(historyIndexLines(paths).length, 3);
  assert.equal(
    listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }).length,
    2,
  );
  return { paths, obligationNames };
}

function assertLiabilityCorruptionBlocksReservation(
  root: string,
  expectedMessage: RegExp,
): void {
  const paths = buyVoidInventoryReservationJournalPathsV1(
    root,
    policy().pool_id,
  );
  const beforeReservations = finalJsonNames(paths.reservations_dir);
  const beforeHolds = finalJsonNames(paths.holds_dir);
  const decision = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(2, "1"),
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_029_900,
  });
  assert.equal(decision.ok, false);
  if (decision.ok) {
    throw new Error("corrupt liability history unexpectedly admitted mutation");
  }
  assert.match(
    String(decision.detail?.message || decision.reason),
    expectedMessage,
  );
  assert.deepEqual(
    finalJsonNames(paths.reservations_dir),
    beforeReservations,
  );
  assert.deepEqual(finalJsonNames(paths.holds_dir), beforeHolds);
}

withAdversarialRoot("obligation-array", (root) => {
  const { paths, obligationNames } = seedObligations(root);
  fs.writeFileSync(
    path.join(paths.holds_dir, obligationNames[0]),
    "[]\n",
    "utf8",
  );
  assert.throws(
    () => listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_paid_unreservable_history_record/,
  );
  assertLiabilityCorruptionBlocksReservation(
    root,
    /invalid_paid_unreservable_history_record/,
  );
});

withAdversarialRoot("obligation-substitution", (root) => {
  const { paths, obligationNames } = seedObligations(root);
  fs.copyFileSync(
    path.join(paths.holds_dir, obligationNames[0]),
    path.join(paths.holds_dir, obligationNames[1]),
  );
  assert.throws(
    () => listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /paid_unreservable_filename_content_identity_mismatch/,
  );
  assertLiabilityCorruptionBlocksReservation(
    root,
    /paid_unreservable_filename_content_identity_mismatch/,
  );
});


withAdversarialRoot("obligation-paired-delete", (root) => {
  const { paths, obligationNames } = seedObligations(root);
  fs.unlinkSync(path.join(paths.holds_dir, obligationNames[0]));
  fs.unlinkSync(
    path.join(paths.obligation_expectations_dir, obligationNames[0]),
  );
  assert.throws(
    () => listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /paid_unreservable_history_expected_set_mismatch/,
  );
  assertLiabilityCorruptionBlocksReservation(
    root,
    /paid_unreservable_history_expected_set_mismatch/,
  );
});

withAdversarialRoot("obligation-paired-rename", (root) => {
  const { paths, obligationNames } = seedObligations(root);
  const renamed = `${"d".repeat(64)}.json`;
  assert.equal(
    fs.existsSync(path.join(paths.holds_dir, renamed)),
    false,
  );
  fs.renameSync(
    path.join(paths.holds_dir, obligationNames[0]),
    path.join(paths.holds_dir, renamed),
  );
  fs.renameSync(
    path.join(paths.obligation_expectations_dir, obligationNames[0]),
    path.join(paths.obligation_expectations_dir, renamed),
  );
  assert.throws(
    () => listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /paid_unreservable_history_expected_set_mismatch/,
  );
  assertLiabilityCorruptionBlocksReservation(
    root,
    /paid_unreservable_history_expected_set_mismatch/,
  );
});

withAdversarialRoot("obligation-missing", (root) => {
  const { paths, obligationNames } = seedObligations(root);
  fs.unlinkSync(path.join(paths.holds_dir, obligationNames[0]));
  assert.throws(
    () => listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /paid_unreservable_history_expected_set_mismatch/,
  );
  assertLiabilityCorruptionBlocksReservation(
    root,
    /paid_unreservable_history_expected_set_mismatch/,
  );
});


function assertObligationCreationCrashRecovery(
  label: string,
  inject: (
    paths: ReturnType<typeof buyVoidInventoryReservationJournalPathsV1>,
    body: () => void,
  ) => void,
): void {
  withAdversarialRoot(`obligation-crash-${label}`, (root) => {
    const first = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent: makeIntent(1, "700"),
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_050_100,
    });
    assert.equal(first.ok, true);
    const intent = makeIntent(4, "400");
    const paths = buyVoidInventoryReservationJournalPathsV1(
      root,
      policy().pool_id,
    );
    inject(paths, () => {
      const interrupted = reserveBuyVoidInventoryV1({
        root_dir: root,
        intent,
        policy: policy(),
        apply: true,
        now_ms: 1_700_000_050_200,
      });
      assert.equal(interrupted.ok, false);
      if (interrupted.ok) {
        throw new Error("interrupted obligation unexpectedly passed");
      }
      assert.equal(
        interrupted.reason,
        "paid_unreservable_obligation_write_failed",
      );
    });
    assert.equal(pendingCreationNames(paths).length, 1);

    const recovered = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent,
      policy: policy(),
      apply: true,
      now_ms: 1_700_000_050_300,
    });
    assert.equal(recovered.ok, false);
    if (recovered.ok) {
      throw new Error(`obligation recovery unexpectedly reserved:${label}`);
    }
    assert.equal(recovered.reason, "insufficient_void_inventory");
    assert.equal(
      recovered.detail?.terminal_recovery_obligation_recorded,
      true,
    );
    assert.equal(pendingCreationNames(paths).length, 0);
    assert.equal(historyIndexLines(paths).length, 2);
    assert.equal(historyAnchorLines(paths).length, 2);
  });
}

assertObligationCreationCrashRecovery(
  "after-pending-before-index",
  (paths, body) => withOneShotOpenFailure(
    paths.history_index_file,
    body,
  ),
);
assertObligationCreationCrashRecovery(
  "after-index-before-expectation",
  (paths, body) => withOneShotLinkFailure(
    `${path.sep}obligation-expectations${path.sep}`,
    body,
  ),
);
assertObligationCreationCrashRecovery(
  "after-expectation-before-record",
  (paths, body) => withOneShotLinkFailure(
    `${path.sep}holds${path.sep}`,
    body,
  ),
);
assertObligationCreationCrashRecovery(
  "after-record-before-anchor",
  (paths, body) => withOneShotOpenFailure(
    paths.history_anchor_file,
    body,
  ),
);
assertObligationCreationCrashRecovery(
  "after-anchor-before-pending-delete",
  (paths, body) => withOneShotPendingDeleteFailure(
    paths.pending_history_dir,
    body,
  ),
);

withAdversarialRoot("obligation-coherent-suffix-rollback", (root) => {
  const { paths } = seedObligations(root);
  const lines = historyIndexLines(paths);
  assert.equal(lines.length, 3);
  assert.equal(historyAnchorLines(paths).length, 3);
  const tail = JSON.parse(lines[2]);
  const name = `${tail.record_id}.json`;
  fs.writeFileSync(
    paths.history_index_file,
    `${lines.slice(0, 2).join("\n")}\n`,
    "utf8",
  );
  fs.unlinkSync(path.join(paths.holds_dir, name));
  fs.unlinkSync(path.join(paths.obligation_expectations_dir, name));
  assert.throws(
    () => listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /inventory_history_anchor_index_mismatch/,
  );
  assertLiabilityCorruptionBlocksReservation(
    root,
    /inventory_history_anchor_index_mismatch/,
  );
});

withAdversarialRoot("authority-directory-mode", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  const before = finalJsonNames(paths.reservations_dir);
  fs.chmodSync(paths.reservations_dir, 0o755);
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_authority_directory/,
  );
  assertNewReservationMutationBlocked(root, /invalid_inventory_authority_directory/);
  assert.deepEqual(finalJsonNames(paths.reservations_dir), before);
});

withAdversarialRoot("authority-record-mode", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  fs.chmodSync(path.join(paths.reservations_dir, reservationNames[0]), 0o644);
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_reservation_history_record/,
  );
  assertNewReservationMutationBlocked(root, /invalid_inventory_reservation_history_record/);
});

withAdversarialRoot("authority-symlink-root", (realRoot) => {
  const linkRoot = `${realRoot}-link`;
  fs.symlinkSync(realRoot, linkRoot, "dir");
  try {
    const held = reserveBuyVoidInventoryV1({
      root_dir: linkRoot,
      intent: makeIntent(7, "1"),
      policy: policy(),
      apply: true,
    });
    assert.match(heldReason(held), /inventory_authority_symlink_ancestor/);
    assert.deepEqual(fs.readdirSync(realRoot), []);
  } finally {
    fs.unlinkSync(linkRoot);
  }
});

withAdversarialRoot("authority-read-root-generation-swap", (root) => {
  seedPartiallyAvailablePool(root);
  withRootNamespaceSwapAtIdentityCheck(root, () => {
    assert.throws(
      () => listBuyVoidInventoryReservationsV1({
        root_dir: root,
        pool_id: policy().pool_id,
      }),
      /inventory_authority_namespace_changed/,
    );
    assert.deepEqual(fs.readdirSync(root), []);
  });
});

withAdversarialRoot("authority-write-root-generation-swap", (root) => {
  withRootNamespaceSwapAtIdentityCheck(root, (reviewedRoot) => {
    const held = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent: makeIntent(7, "1"),
      policy: policy(),
      apply: true,
    });
    assert.match(heldReason(held), /inventory_authority_namespace_changed/);
    assert.deepEqual(fs.readdirSync(root), []);
    assert.deepEqual(fs.readdirSync(reviewedRoot), []);
  });
});

withAdversarialRoot("authority-read-descendant-generation-swap", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  const targetName = reservationNames[0];
  const redirected = '{"redirected_authority":true}\n';
  withDescendantNamespaceSwapAtLeafOpen(
    paths.reservations_dir,
    (leaf) => leaf === targetName,
    (replacementDir) => {
      fs.writeFileSync(
        path.join(replacementDir, targetName),
        redirected,
        { encoding: "utf8", mode: 0o600 },
      );
    },
    (_reviewedDir, replacementDir) => {
      assert.throws(
        () => listBuyVoidInventoryReservationsV1({
          root_dir: root,
          pool_id: policy().pool_id,
        }),
        /inventory_authority_namespace_changed/,
      );
      assert.equal(
        fs.readFileSync(path.join(replacementDir, targetName), "utf8"),
        redirected,
      );
    },
  );
  assert.equal(
    listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }).length,
    2,
  );
});

withAdversarialRoot("authority-write-descendant-generation-swap", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  const intent = makeIntent(7, "100");
  const preview = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent,
    policy: policy(),
    apply: false,
    now_ms: 1_700_000_019_910,
  });
  assert.equal(preview.ok, true);
  if (!preview.ok) throw new Error("descendant write preview held");
  const targetName = `${preview.reservation.reservation_id}.json`;
  withDescendantNamespaceSwapAtLeafOpen(
    paths.reservations_dir,
    (leaf) => leaf.startsWith(`.${targetName}.tmp-`),
    () => undefined,
    (_reviewedDir, replacementDir) => {
      const held = reserveBuyVoidInventoryV1({
        root_dir: root,
        intent,
        policy: policy(),
        apply: true,
        now_ms: 1_700_000_019_910,
      });
      assert.equal(held.ok, false);
      assert.match(
        String(held.ok ? "" : held.detail?.message || held.reason),
        /inventory_authority_namespace_changed/,
      );
      assert.deepEqual(fs.readdirSync(replacementDir), []);
    },
  );
  const recovered = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent,
    policy: policy(),
    apply: true,
    now_ms: 1_700_000_019_910,
  });
  assert.equal(recovered.ok, true);
  assert.equal(
    listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }).length,
    3,
  );
});

withAdversarialRoot("bounded-record-read", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  const file = path.join(paths.reservations_dir, reservationNames[0]);
  fs.writeFileSync(file, `{"oversized":"${"x".repeat(1_048_576)}"}\n`, "utf8");
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_reservation_history_record:too_large/,
  );
  assertNewReservationMutationBlocked(root, /too_large/);
});

withAdversarialRoot("bounded-index-line-read", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  fs.appendFileSync(paths.history_index_file, `${"x".repeat(262_145)}\n`, "utf8");
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_history_index_file:line_too_large/,
  );
  assertNewReservationMutationBlocked(root, /line_too_large/);
});

withAdversarialRoot("exact-index-sequence-type", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  const lines = historyIndexLines(paths);
  const first = JSON.parse(lines[0]);
  first.sequence = "1";
  fs.writeFileSync(
    paths.history_index_file,
    `${JSON.stringify(first)}\n${lines.slice(1).join("\n")}\n`,
    "utf8",
  );
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_history_index_entry/,
  );
  assertNewReservationMutationBlocked(root, /invalid_inventory_history_index_entry/);
});

withAdversarialRoot("exact-anchor-sequence-type", (root) => {
  const { paths } = seedPartiallyAvailablePool(root);
  const lines = historyAnchorLines(paths);
  const first = JSON.parse(lines[0]);
  first.sequence = "1";
  fs.writeFileSync(
    paths.history_anchor_file,
    `${JSON.stringify(first)}\n${lines.slice(1).join("\n")}\n`,
    "utf8",
  );
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_history_anchor_entry/,
  );
  assertNewReservationMutationBlocked(root, /invalid_inventory_history_anchor_entry/);
});

withAdversarialRoot("exact-reservation-numeric-string-type", (root) => {
  const { paths, reservationNames } = seedPartiallyAvailablePool(root);
  const file = path.join(paths.reservations_dir, reservationNames[0]);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  raw.reserved_void_units = Number(raw.reserved_void_units);
  fs.writeFileSync(file, `${JSON.stringify(raw)}\n`, "utf8");
  assert.throws(
    () => listBuyVoidInventoryReservationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_inventory_reservation_record/,
  );
  assertNewReservationMutationBlocked(root, /invalid_inventory_reservation_record/);
});

withAdversarialRoot("exact-obligation-numeric-string-type", (root) => {
  const { paths, obligationNames } = seedObligations(root);
  const file = path.join(paths.holds_dir, obligationNames[0]);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  raw.requested_void_units = Number(raw.requested_void_units);
  fs.writeFileSync(file, `${JSON.stringify(raw)}\n`, "utf8");
  assert.throws(
    () => listBuyVoidPaidUnreservableObligationsV1({
      root_dir: root,
      pool_id: policy().pool_id,
    }),
    /invalid_paid_unreservable_obligation_record/,
  );
  assertLiabilityCorruptionBlocksReservation(
    root,
    /invalid_paid_unreservable_obligation_record/,
  );
});

withAdversarialRoot("exact-lock-runtime-types", (root) => {
  const paths = buyVoidInventoryReservationJournalPathsV1(root, policy().pool_id);
  fs.mkdirSync(paths.history_anchor_pool_dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(paths.lock_file, `${JSON.stringify({
    schema: "void_buy_void_inventory_pool_lock_v1",
    marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
    pid: String(process.pid),
    acquired_at_ms: Date.now(),
    ...processIdentity(process.pid),
    owner_nonce: "c".repeat(32),
  })}\n`, { mode: 0o600 });
  const held = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(7, "1"),
    policy: policy(),
    apply: true,
  });
  assert.match(heldReason(held), /invalid_inventory_reservation_lock/);
});

withAdversarialRoot("pid-reuse-lock-recovery", (root) => {
  const paths = buyVoidInventoryReservationJournalPathsV1(root, policy().pool_id);
  fs.mkdirSync(paths.history_anchor_pool_dir, { recursive: true, mode: 0o700 });
  const identity = processIdentity(process.pid);
  fs.writeFileSync(paths.lock_file, `${JSON.stringify({
    schema: "void_buy_void_inventory_pool_lock_v1",
    marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
    pid: process.pid,
    acquired_at_ms: Date.now(),
    process_start_ticks: String(BigInt(identity.process_start_ticks) + 1n),
    boot_id: identity.boot_id,
    owner_nonce: "d".repeat(32),
  })}\n`, { mode: 0o600 });
  const recovered = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(7, "1"),
    policy: policy(),
    apply: true,
  });
  assert.equal(recovered.ok, true);
  assert.equal(fs.existsSync(paths.lock_file), false);
});

withAdversarialRoot("stale-reclaim-compare-delete-race", (root) => {
  const seeded = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(1, "1"),
    policy: policy(),
    apply: true,
  });
  assert.equal(seeded.ok, true);
  const paths = buyVoidInventoryReservationJournalPathsV1(root, policy().pool_id);
  const stale = {
    schema: "void_buy_void_inventory_pool_lock_v1",
    marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
    pid: 2147483647,
    acquired_at_ms: Date.now(),
    process_start_ticks: "1",
    boot_id: "00000000-0000-0000-0000-000000000000",
    owner_nonce: "e".repeat(32),
  };
  fs.writeFileSync(paths.lock_file, `${JSON.stringify(stale)}\n`, { mode: 0o600 });
  fs.linkSync(paths.lock_file, paths.lock_reclaim_file);
  fs.unlinkSync(paths.lock_file);
  const live = {
    ...stale,
    pid: 1,
    ...processIdentity(1),
    owner_nonce: "f".repeat(32),
  };
  fs.writeFileSync(paths.lock_file, `${JSON.stringify(live)}\n`, { mode: 0o600 });
  const held = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: makeIntent(2, "1"),
    policy: policy(),
    apply: true,
  });
  assert.equal(heldReason(held), "inventory_reservation_busy");
  assert.deepEqual(JSON.parse(fs.readFileSync(paths.lock_file, "utf8")), live);
});

withAdversarialRoot("uncertain-lock-publication-recovery", (root) => {
  const paths = buyVoidInventoryReservationJournalPathsV1(root, policy().pool_id);
  const originalOpen = fs.openSync;
  const originalLink = fs.linkSync;
  const originalFsync = fs.fsyncSync;
  const originalClose = fs.closeSync;
  const directoryDescriptors = new Set<number>();
  let armed = false;
  let fired = false;
  (fs as any).openSync = (file: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode) => {
    const descriptor = (originalOpen as any)(file, flags, mode);
    let openedPath = String(file);
    try {
      openedPath = fs.realpathSync(`/proc/self/fd/${descriptor}`);
    } catch {
      // Non-directory descriptors do not need a stable rendered path here.
    }
    if (
      path.basename(openedPath) ===
        path.basename(paths.history_anchor_pool_dir) &&
      (typeof flags === "number"
        ? (flags & fs.constants.O_DIRECTORY) === fs.constants.O_DIRECTORY
        : String(flags) === "r")
    ) {
      directoryDescriptors.add(descriptor);
    }
    return descriptor;
  };
  (fs as any).linkSync = (source: fs.PathLike, destination: fs.PathLike) => {
    const result = originalLink(source, destination);
    if (path.basename(String(destination)) === path.basename(paths.lock_file)) {
      armed = true;
    }
    return result;
  };
  (fs as any).fsyncSync = (descriptor: number) => {
    if (!fired && armed && directoryDescriptors.has(descriptor)) {
      fired = true;
      throw new Error("injected_uncertain_lock_publication");
    }
    return originalFsync(descriptor);
  };
  (fs as any).closeSync = (descriptor: number) => {
    try {
      return originalClose(descriptor);
    } finally {
      directoryDescriptors.delete(descriptor);
    }
  };
  try {
    const recovered = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent: makeIntent(7, "1"),
      policy: policy(),
      apply: true,
    });
    assert.equal(fired, true);
    assert.equal(recovered.ok, true);
  } finally {
    (fs as any).openSync = originalOpen;
    (fs as any).linkSync = originalLink;
    (fs as any).fsyncSync = originalFsync;
    (fs as any).closeSync = originalClose;
  }
  assert.equal(fs.existsSync(paths.lock_file), false);
});

withAdversarialRoot("lock-release-recovery", (root) => {
  const paths = buyVoidInventoryReservationJournalPathsV1(root, policy().pool_id);
  const intent = makeIntent(7, "1");
  const originalUnlink = fs.unlinkSync;
  let fired = false;
  (fs as any).unlinkSync = (file: fs.PathLike) => {
    if (!fired && path.basename(String(file)) === path.basename(paths.lock_file)) {
      fired = true;
      throw new Error("injected_lock_release_failure");
    }
    return originalUnlink(file);
  };
  try {
    const first = reserveBuyVoidInventoryV1({
      root_dir: root,
      intent,
      policy: policy(),
      apply: true,
    });
    assert.equal(first.ok, true);
    assert.equal(fired, true);
    assert.equal(fs.existsSync(paths.lock_file), true);
  } finally {
    (fs as any).unlinkSync = originalUnlink;
  }
  const recovered = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent,
    policy: policy(),
    apply: true,
  });
  assert.equal(recovered.ok, true);
  if (!recovered.ok) throw new Error("lock release recovery unexpectedly held");
  assert.equal(recovered.status, "duplicate");
  assert.equal(fs.existsSync(paths.lock_file), false);
});

await proveCrossProcessReleaseRecovery();

console.log("durable_history_expected_set_commitment=1");
console.log("durable_history_append_only_hash_chain_index=1");
console.log("durable_history_paired_deletion_fail_closed=1");
console.log("durable_history_creation_pending_protocol=1");
console.log("durable_history_creation_crash_recovery=1");
console.log("durable_history_torn_index_tail_recovery=1");
console.log("durable_history_torn_anchor_tail_recovery=1");
console.log("durable_history_stale_lock_recovery=1");
console.log("durable_history_separate_anchor_authority=1");
console.log("durable_history_coherent_suffix_rollback_detection=1");
console.log("durable_history_index_truncated_tail_fail_closed=1");
console.log("durable_history_filename_content_identity=1");
console.log("durable_history_missing_record_fail_closed=1");
console.log("durable_history_non_object_fail_closed=1");
console.log("durable_history_closed_schema_enforced=1");
console.log("durable_history_liability_corruption_blocks_new_mutation=1");
console.log("durability_authority_owner_mode_symlink_fail_closed=1");
console.log("durability_authority_generation_pinned_root=1");
console.log("durability_authority_ancestor_swap_read_write_hold=1");
console.log("durability_authority_descendant_generation_pinned=1");
console.log("durability_authority_descendant_swap_read_write_hold=1");
console.log("bounded_durable_state_reads=1");
console.log("durable_metadata_exact_runtime_json_types=1");
console.log("pool_lock_process_instance_identity=1");
console.log("pool_lock_publication_recovery=1");
console.log("pool_lock_release_recovery=1");
console.log("pool_lock_cross_process_release_recovery=1");
console.log("stale_lock_compare_delete_race_closed=1");

console.log("VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1_GREEN");
