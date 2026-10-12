// Source-only actual writer regression: terminal status must be monotonic
// inside the SAME per-request lock that protects the operator-event append.
// All state is disposable synthetic JSONL. No payment/signer/service access.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";
import {
  VOID_BUY_VOID_FULFILLED_RECONCILIATION_ONLY_V1,
} from "../src/economic/buy_void_fulfilled_reconciliation_mode_v1.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-status-under-lock-"));
const first = {
  request_id: "buyvoid_terminal_aaaaaaaa",
  quoted_void: 2,
  source_chain: "base",
  tx_hash: "0x" + "a".repeat(64),
};
const other = {
  request_id: "buyvoid_unrelated_bbbbbbbb",
  quoted_void: 2,
  source_chain: "base",
  tx_hash: "0x" + "b".repeat(64),
};
const event = (
  request: typeof first,
  operator_status: "reviewed" | "rejected" | "fulfilled",
  marked_at_ms: number,
) => ({
  schema: "void_buy_void_operator_mark_v1",
  ok: true,
  request_id: request.request_id,
  operator_status,
  marked_at_ms,
  quoted_void: request.quoted_void,
});
const noLaunch = async () => {
  assert.fail("status-only terminal proof must not invoke payment launch");
};
const noSale = async () => {
  assert.fail("status-only terminal proof must not read sale state");
};
function reconciliationOnlyEvent<T extends Record<string, any>>(
  value: T,
): T {
  const detached = { ...value } as T;
  Object.defineProperty(
    detached,
    VOID_BUY_VOID_FULFILLED_RECONCILIATION_ONLY_V1,
    {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    },
  );
  return detached;
}
async function mark(
  request: typeof first,
  status: "reviewed" | "rejected" | "fulfilled",
  time: number,
) {
  return writeBuyVoidOperatorEventWithCapacityAdmissionV1({
    event: event(request, status, time),
    request,
    request_dir: root,
    with_launch_authority_mutation: noLaunch,
    read_sale_state: noSale,
  });
}
async function reconcileFulfilled(
  request: typeof first,
  time: number,
) {
  return writeBuyVoidOperatorEventWithCapacityAdmissionV1({
    event: reconciliationOnlyEvent(event(request, "fulfilled", time)),
    request,
    request_dir: root,
    with_launch_authority_mutation: noLaunch,
    read_sale_state: noSale,
  });
}
const historyPath = path.join(root, "operator-events.jsonl");
try {
  fs.chmodSync(root, 0o700);
  const initial = await mark(first, "reviewed", 100);
  assert.equal(initial.ok, true);
  assert.equal(fs.existsSync(historyPath), true);

  // Recovery-only authority comes from the exact journal row observed under
  // the request lock, never from a stale caller snapshot. A supplied fulfilled
  // event with no matching under-lock row cannot append or create a sidecar.
  {
    const staleRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-terminal-stale-reconcile-"),
    );
    fs.chmodSync(staleRoot, 0o700);
    const staleLedger = path.join(staleRoot, "operator-events.jsonl");
    const unrelated = JSON.stringify(event(other, "reviewed", 777)) + "\n";
    fs.writeFileSync(staleLedger, unrelated, { mode: 0o600 });
    const staleEvent = reconciliationOnlyEvent(
      event(first, "fulfilled", 778),
    );
    try {
      await assert.rejects(
        () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
          event: staleEvent,
          request: first,
          request_dir: staleRoot,
          with_launch_authority_mutation: noLaunch,
          read_sale_state: noSale,
        }),
        /buy_void_operator_fulfilled_reconciliation_missing_under_lock/u,
      );
      assert.equal(fs.readFileSync(staleLedger, "utf8"), unrelated);
      assert.equal(
        fs.existsSync(path.join(
          staleRoot,
          "operator-event-" + first.request_id + "-778.json",
        )),
        false,
      );
    } finally {
      fs.rmSync(staleRoot, { recursive: true, force: true });
    }
  }
  {
    const absentRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-terminal-absent-reconcile-"),
    );
    fs.chmodSync(absentRoot, 0o700);
    const absentLedger = path.join(absentRoot, "operator-events.jsonl");
    try {
      await assert.rejects(
        () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
          event: reconciliationOnlyEvent(event(first, "fulfilled", 779)),
          request: first,
          request_dir: absentRoot,
          with_launch_authority_mutation: noLaunch,
          read_sale_state: noSale,
        }),
        /buy_void_operator_fulfilled_reconciliation_missing_under_lock/u,
      );
      assert.equal(fs.existsSync(absentLedger), false,
        "recovery-only marker must not create a missing journal");
    } finally {
      fs.rmSync(absentRoot, { recursive: true, force: true });
    }
  }

  // Simulate an *already committed* valid terminal row between a stale
  // route projection and this writer's request-lock acquisition.
  const terminal = event(first, "fulfilled", 200);
  fs.appendFileSync(historyPath, JSON.stringify(terminal) + "\n");
  const before = fs.readFileSync(historyPath);
  for (const [status, time] of [
    ["reviewed", 301],
    ["rejected", 302],
    ["fulfilled", 303],
  ] as const) {
    await assert.rejects(
      () => mark(first, status, time),
      /buy_void_operator_fulfilled_terminal_under_lock/u,
    );
    assert.deepEqual(fs.readFileSync(historyPath), before,
      "stale mark mutated canonical history after terminal closeout");
    assert.equal(fs.existsSync(path.join(root,
      "operator-event-" + first.request_id + "-" + time + ".json")), false,
      "stale mark wrote a visible sidecar");
  }

  // A journaled fulfillment with no derived sidecar is recoverable ONLY
  // when the retry supplies the byte-for-byte same original event.
  const recoveredTerminal: any = await reconcileFulfilled(first, 200);
  assert.equal(recoveredTerminal.ok, true);
  assert.equal(recoveredTerminal.journal_reused, true);
  assert.equal(recoveredTerminal.sidecar_recovered, true);
  assert.deepEqual(fs.readFileSync(historyPath), before,
    "exact fulfilled recovery duplicated a canonical journal event");
  const terminalSidecar = path.join(root,
    "operator-event-" + first.request_id + "-200.json");
  assert.deepEqual(JSON.parse(fs.readFileSync(terminalSidecar, "utf8")), terminal);
  const existingTerminal: any = await reconcileFulfilled(first, 200);
  assert.equal(existingTerminal.journal_reused, true);
  assert.equal(existingTerminal.sidecar_recovered, false);
  assert.deepEqual(fs.readFileSync(historyPath), before);

  // Exercise an actual failed sidecar open AFTER the journal's append/fsync.
  // Retry is exact; a changed event, a forged sidecar or a later legacy row
  // must not be silently adopted as an original fulfilled transaction.
  {
    const recoverRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-terminal-sidecar-recovery-"),
    );
    fs.chmodSync(recoverRoot, 0o700);
    const recoverLedger = path.join(recoverRoot, "operator-events.jsonl");
    const recoverEvent = event(first, "fulfilled", 901);
    const recoverSidecar = path.join(recoverRoot,
      "operator-event-" + first.request_id + "-901.json");
    const originalOpenSync = fs.openSync;
    let interruptionReached = false;
    const persist = async (incoming: typeof recoverEvent): Promise<any> =>
      writeBuyVoidOperatorEventWithCapacityAdmissionV1({
        event: incoming, request: first, request_dir: recoverRoot,
        with_launch_authority_mutation: noLaunch,
        read_sale_state: noSale,
      });
    const reconcilePersist = async (
      incoming: typeof recoverEvent,
    ): Promise<any> =>
      writeBuyVoidOperatorEventWithCapacityAdmissionV1({
        event: reconciliationOnlyEvent(incoming),
        request: first,
        request_dir: recoverRoot,
        with_launch_authority_mutation: noLaunch,
        read_sale_state: noSale,
      });
    try {
      (fs as any).openSync = function(
        pathname: fs.PathLike, flags: string | number, mode?: any,
      ) {
        if (!interruptionReached &&
            String(pathname).includes(
              ".operator-event-" + first.request_id + "-901.json.tmp-") &&
            typeof flags === "number" &&
            (flags & fs.constants.O_CREAT) !== 0) {
          interruptionReached = true;
          const e: NodeJS.ErrnoException =
            new Error("SYNTHETIC_SIDECAR_WRITE_INTERRUPTED");
          e.code = "ENOSPC";
          throw e;
        }
        return Reflect.apply(originalOpenSync, fs,
          [pathname, flags, mode]);
      };
      await assert.rejects(
        () => persist(recoverEvent),
        /SYNTHETIC_SIDECAR_WRITE_INTERRUPTED/u,
        "expected failure after journal fsync but before sidecar publication",
      );
    } finally {
      (fs as any).openSync = originalOpenSync;
    }
    try {
      assert.equal(interruptionReached, true);
      const authoritative = fs.readFileSync(recoverLedger);
      assert.equal(authoritative.toString("utf8"),
        JSON.stringify(recoverEvent) + "\n");
      assert.equal(fs.existsSync(recoverSidecar), false);
      const exactRetry = await reconcilePersist(recoverEvent);
      assert.equal(exactRetry.ok, true);
      assert.equal(exactRetry.journal_reused, true);
      assert.equal(exactRetry.sidecar_recovered, true);
      assert.deepEqual(fs.readFileSync(recoverLedger), authoritative,
        "crash retry must not append a second fulfilled row");
      assert.equal(fs.readFileSync(recoverSidecar, "utf8"),
        JSON.stringify(recoverEvent, null, 2));
      const stableRetry = await reconcilePersist(recoverEvent);
      assert.equal(stableRetry.journal_reused, true);
      assert.equal(stableRetry.sidecar_recovered, false);
      assert.deepEqual(fs.readFileSync(recoverLedger), authoritative);

      await assert.rejects(
        () => reconcilePersist({ ...recoverEvent, quoted_void: 999 }),
        /buy_void_operator_fulfilled_terminal_under_lock/u,
        "changed fulfillment payload must not inherit exact replay authority",
      );
      fs.writeFileSync(recoverSidecar, '{"forged":true}', { mode: 0o600 });
      await assert.rejects(
        () => reconcilePersist(recoverEvent),
        /buy_void_operator_terminal_sidecar_conflict/u,
        "an existing mismatched sidecar must not be overwritten",
      );
      assert.equal(fs.readFileSync(recoverSidecar, "utf8"), '{"forged":true}');
      assert.deepEqual(fs.readFileSync(recoverLedger), authoritative);
      fs.writeFileSync(recoverSidecar,
        JSON.stringify(recoverEvent, null, 2), { mode: 0o600 });
      const downgraded = event(first, "rejected", 902);
      fs.appendFileSync(recoverLedger, JSON.stringify(downgraded) + "\n");
      const ambiguous = fs.readFileSync(recoverLedger);
      await assert.rejects(
        () => reconcilePersist(recoverEvent),
        /buy_void_operator_fulfilled_terminal_under_lock/u,
        "historical fulfilled followed by a downgrade cannot recover as clean",
      );
      assert.deepEqual(fs.readFileSync(recoverLedger), ambiguous);
    } finally {
      fs.rmSync(recoverRoot, { recursive: true, force: true });
    }
  }

  // A short write into a private temporary file may leave a hidden
  // fragment, but NEVER a publicly visible partial terminal sidecar.
  // Retry must adopt the exact journaled fulfillment without another append.
  {
    const crashRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-terminal-short-temp-"),
    );
    fs.chmodSync(crashRoot, 0o700);
    const stored = path.join(crashRoot, "operator-events.jsonl");
    const sidecar = path.join(
      crashRoot, "operator-event-" + first.request_id + "-903.json",
    );
    const e = event(first, "fulfilled", 903);
    const perform = () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: e, request: first, request_dir: crashRoot,
      with_launch_authority_mutation: noLaunch, read_sale_state: noSale,
    });
    const replay = () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: reconciliationOnlyEvent(e), request: first,
      request_dir: crashRoot,
      with_launch_authority_mutation: noLaunch, read_sale_state: noSale,
    });
    const originalWrite = fs.writeSync;
    let injected = false;
    try {
      (fs as any).writeSync = function(...args: any[]) {
        const value = args[1];
        if (!injected && Buffer.isBuffer(value) &&
            value.includes(Buffer.from('"marked_at_ms": 903'))) {
          injected = true;
          Reflect.apply(originalWrite, fs, [
            args[0], value, 0, 8, args[4],
          ]);
          const failure: NodeJS.ErrnoException =
            new Error("SYNTHETIC_TEMP_SHORT_WRITE_INTERRUPTED");
          failure.code = "ENOSPC";
          throw failure;
        }
        return Reflect.apply(originalWrite, fs, args);
      };
      await assert.rejects(
        perform, /SYNTHETIC_TEMP_SHORT_WRITE_INTERRUPTED/u,
      );
    } finally {
      (fs as any).writeSync = originalWrite;
    }
    try {
      assert.equal(injected, true);
      const journaled = fs.readFileSync(stored);
      assert.equal(journaled.toString("utf8"), JSON.stringify(e) + "\n");
      assert.equal(fs.existsSync(sidecar), false,
        "partially written temp became publicly visible");
      const retried: any = await replay();
      assert.equal(retried.journal_reused, true);
      assert.equal(retried.sidecar_recovered, true);
      assert.deepEqual(fs.readFileSync(stored), journaled);
      assert.deepEqual(JSON.parse(fs.readFileSync(sidecar, "utf8")), e);
      assert.equal(fs.statSync(sidecar).nlink, 1);
    } finally {
      fs.rmSync(crashRoot, { recursive: true, force: true });
    }
  }

  // A failed private-temp write MUST NOT unlink an unrelated file substituted
  // at the same child pathname after the writer opened its original inode.
  // Pinning the parent directory is insufficient: child names remain mutable.
  {
    const attackRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-terminal-failed-temp-swap-"),
    );
    fs.chmodSync(attackRoot, 0o700);
    const ledger = path.join(attackRoot, "operator-events.jsonl");
    const sidecar = path.join(
      attackRoot, "operator-event-" + first.request_id + "-905.json",
    );
    const ownedTempPrefix = ".operator-event-" +
      first.request_id + "-905.json.tmp-";
    const privateRecord = path.join(attackRoot, "unrelated-private-record");
    const privateBytes = Buffer.from(
      "UNRELATED_PRIVATE_RECORD_MUST_SURVIVE",
    );
    fs.writeFileSync(privateRecord, privateBytes, { mode: 0o600 });
    const originalOwnedTemp = path.join(
      attackRoot, "original-temp-inode.moved",
    );
    const e = event(first, "fulfilled", 905);
    const perform = () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: e, request: first, request_dir: attackRoot,
      with_launch_authority_mutation: noLaunch, read_sale_state: noSale,
    });
    const replay = () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: reconciliationOnlyEvent(e), request: first,
      request_dir: attackRoot,
      with_launch_authority_mutation: noLaunch, read_sale_state: noSale,
    });
    const originalWrite = fs.writeSync;
    let reboundPath = "";
    let injected = false;
    try {
      (fs as any).writeSync = function(...args: any[]) {
        const data = args[1];
        if (!injected && Buffer.isBuffer(data) &&
            data.includes(Buffer.from('"marked_at_ms": 905'))) {
          injected = true;
          const temps = fs.readdirSync(attackRoot)
            .filter(name => name.startsWith(ownedTempPrefix));
          assert.equal(temps.length, 1);
          reboundPath = path.join(attackRoot, temps[0]);
          fs.renameSync(reboundPath, originalOwnedTemp);
          fs.renameSync(privateRecord, reboundPath);
          throw new Error("SYNTHETIC_FAILED_TEMP_NAME_REBOUND");
        }
        return Reflect.apply(originalWrite, fs, args);
      };
      await assert.rejects(
        perform, /SYNTHETIC_FAILED_TEMP_NAME_REBOUND/u,
      );
    } finally {
      (fs as any).writeSync = originalWrite;
    }
    try {
      assert.equal(injected, true);
      assert.ok(reboundPath);
      assert.deepEqual(
        fs.readFileSync(reboundPath), privateBytes,
        "failed terminal-temp cleanup removed a substituted private file",
      );
      assert.equal(fs.existsSync(originalOwnedTemp), true);
      assert.equal(fs.existsSync(sidecar), false);
      const journaled = fs.readFileSync(ledger);
      assert.equal(journaled.toString("utf8"), JSON.stringify(e) + "\n");
      const result: any = await replay();
      assert.equal(result.journal_reused, true);
      assert.equal(result.sidecar_recovered, true);
      assert.deepEqual(fs.readFileSync(ledger), journaled);
      assert.deepEqual(fs.readFileSync(reboundPath), privateBytes);
      assert.deepEqual(JSON.parse(fs.readFileSync(sidecar, "utf8")), e);
    } finally {
      fs.rmSync(attackRoot, { recursive: true, force: true });
    }
  }

  // Crash after atomically linking complete sidecar but before unlinking
  // its hidden temp. The public bytes are already complete. An exact retry
  // verifies the joined inode, prunes only its own hidden hardlink and
  // returns without a second fulfillment event.
  {
    const crashRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-terminal-post-link-"),
    );
    fs.chmodSync(crashRoot, 0o700);
    const stored = path.join(crashRoot, "operator-events.jsonl");
    const sidecar = path.join(
      crashRoot, "operator-event-" + first.request_id + "-904.json",
    );
    const e = event(first, "fulfilled", 904);
    const perform = () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: e, request: first, request_dir: crashRoot,
      with_launch_authority_mutation: noLaunch, read_sale_state: noSale,
    });
    const replay = () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event: reconciliationOnlyEvent(e), request: first,
      request_dir: crashRoot,
      with_launch_authority_mutation: noLaunch, read_sale_state: noSale,
    });
    const originalUnlink = fs.unlinkSync;
    let injected = false;
    try {
      (fs as any).unlinkSync = function(file: fs.PathLike) {
        if (!injected && String(file).includes(
          ".operator-event-" + first.request_id + "-904.json.tmp-"
        )) {
          injected = true;
          throw new Error("SYNTHETIC_POST_LINK_UNLINK_INTERRUPTED");
        }
        return Reflect.apply(originalUnlink, fs, [file]);
      };
      await assert.rejects(
        perform, /SYNTHETIC_POST_LINK_UNLINK_INTERRUPTED/u,
      );
    } finally {
      (fs as any).unlinkSync = originalUnlink;
    }
    try {
      assert.equal(injected, true);
      const journaled = fs.readFileSync(stored);
      assert.equal(journaled.toString("utf8"), JSON.stringify(e) + "\n");
      assert.deepEqual(JSON.parse(fs.readFileSync(sidecar, "utf8")), e);
      assert.equal(fs.statSync(sidecar).nlink, 2,
        "interrupted publish must leave only the exact owned hidden link");
      const retried: any = await replay();
      assert.equal(retried.journal_reused, true);
      assert.equal(retried.sidecar_recovered, false);
      assert.deepEqual(fs.readFileSync(stored), journaled);
      assert.equal(fs.statSync(sidecar).nlink, 1);
      assert.deepEqual(JSON.parse(fs.readFileSync(sidecar, "utf8")), e);
      assert.equal(
        fs.readdirSync(crashRoot).filter(x =>
          x.startsWith(
            ".operator-event-" + first.request_id + "-904.json.tmp-",
          )).length, 0,
      );
    } finally {
      fs.rmSync(crashRoot, { recursive: true, force: true });
    }
  }

  // A terminal row for request A cannot freeze unrelated request B.
  const unrelated = await mark(other, "reviewed", 400);
  assert.equal(unrelated.ok, true);
  const beforeCorruption = fs.readFileSync(historyPath);
  assert.ok(beforeCorruption.length > before.length);

  // A verified journal must never be reopened by visible pathname for append.
  // Swap the journal leaf at the first actual event write: an old
  // appendFileSync(path) would alter the replacement journal. The held
  // descriptor writer must instead HOLD, leaving that replacement unchanged.
  {
    const raceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "void-terminal-path-swap-"),
    );
    const detachedLedger = path.join(raceRoot, "operator-events.detached.jsonl");
    fs.chmodSync(raceRoot, 0o700);
    const raceLedger = path.join(raceRoot, "operator-events.jsonl");
    const originalHistory = JSON.stringify(event(other, "reviewed", 900)) + "\n";
    fs.writeFileSync(raceLedger, originalHistory, { mode: 0o600 });
    const originalWriteSync = fs.writeSync;
    let swapped = false;
    try {
      (fs as any).writeSync = function(...args: any[]) {
        const bytes = args[1];
        if (!swapped && Buffer.isBuffer(bytes) &&
            bytes.includes(Buffer.from('"marked_at_ms":901'))) {
          swapped = true;
          fs.renameSync(raceLedger, detachedLedger);
          fs.writeFileSync(raceLedger, originalHistory, { mode: 0o600 });
        }
        return Reflect.apply(originalWriteSync, fs, args);
      };
      await assert.rejects(
        () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
          event: event(other, "reviewed", 901),
          request: other,
          request_dir: raceRoot,
          with_launch_authority_mutation: noLaunch,
          read_sale_state: noSale,
        }),
        /buy_void_verified_payment_capacity_(?:event_append_path_changed|request_directory_changed)/u,
        "a replacement visible journal must not receive the committed event",
      );
      assert.equal(swapped, true, "swap seam did not reach real held-FD append");
      assert.equal(fs.readFileSync(raceLedger, "utf8"), originalHistory,
        "replacement visible journal received an unsafe event");
      assert.equal(fs.existsSync(path.join(
        raceRoot, "operator-event-" + other.request_id + "-901.json",
      )), false, "replacement directory acquired an orphan sidecar");
    } finally {
      (fs as any).writeSync = originalWriteSync;
      fs.rmSync(raceRoot, { recursive: true, force: true });

    }
  }

  // Exercise the *actual* locked writer with hostile same-process globals.
  // Native parsing must retain the historical fulfilled row even when the
  // inherited string/JSON methods can forge an apparent rejected projection.
  const stableHistory = fs.readFileSync(historyPath);
  const originalSplit = String.prototype.split;
  const originalDecode = TextDecoder.prototype.decode;
  const originalParse = JSON.parse;
  const originalStringify = JSON.stringify;
  const originalToJSON = Object.getOwnPropertyDescriptor(
    Object.prototype, "toJSON",
  );
  const fulfilledLine = originalStringify(terminal);
  const forgedLine = originalStringify({ ...terminal,
    operator_status: "rejected",
  });
  let splitCalls = 0;
  let decodeCalls = 0;
  let parseCalls = 0;
  let stringifyCalls = 0;
  let inheritedCalls = 0;
  try {
    (String.prototype as any).split = function(
      this: string, separator: string | RegExp, limit?: number,
    ) {
      if (separator === "\n" &&
          String(this).includes(fulfilledLine)) {
        splitCalls += 1;
        return [forgedLine];
      }
      return originalSplit.call(this, separator, limit);
    };
    (TextDecoder.prototype as any).decode = function(this: TextDecoder,
      bytes: Uint8Array) {
      const decoded = Reflect.apply(originalDecode, this, [bytes]) as string;
      if (decoded.includes(fulfilledLine)) {
        decodeCalls += 1;
        return decoded.replace(fulfilledLine, forgedLine);
      }
      return decoded;
    };
    (JSON as any).parse = function(source: string, reviver?: any) {
      if (source === fulfilledLine) {
        parseCalls += 1;
        return originalParse(forgedLine, reviver);
      }
      return originalParse(source, reviver);
    };
    (JSON as any).stringify = function(value: any, ...extra: any[]) {
      if (value?.operator_status === "fulfilled") {
        stringifyCalls += 1;
        return Reflect.apply(originalStringify, JSON, [
          { ...value, operator_status: "rejected" }, ...extra,
        ]);
      }
      return Reflect.apply(originalStringify, JSON, [value, ...extra]);
    };
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      writable: true,
      value: function(this: any) {
        if (this?.operator_status === "fulfilled") {
          inheritedCalls += 1;
          return { ...this, operator_status: "rejected" };
        }
        return this;
      },
    });
    // All hooks must be demonstrably armed, not zero-call tautologies.
    assert.equal("line\nother".split("\n").length, 2);
    assert.equal(
      ("prefix" + fulfilledLine + "\n").split("\n")[0], forgedLine);
    assert.equal(new TextDecoder("utf-8").decode(
      Buffer.from(fulfilledLine + "\n")).includes(forgedLine), true);
    assert.equal(JSON.parse(fulfilledLine).operator_status, "rejected");
    assert.equal(JSON.stringify(terminal).includes('"rejected"'), true);
    assert.equal(originalStringify(terminal).includes('"rejected"'), true);
    assert.equal(splitCalls, 1);
    assert.equal(decodeCalls, 1);
    assert.equal(parseCalls, 1);
    assert.equal(stringifyCalls, 1);
    assert.equal(inheritedCalls, 1);
    splitCalls = 0;
    decodeCalls = 0;
    parseCalls = 0;
    stringifyCalls = 0;
    inheritedCalls = 0;

    await assert.rejects(
      () => mark(first, "rejected", 450),
      /buy_void_operator_fulfilled_terminal_under_lock/u,
    );
    assert.deepEqual(fs.readFileSync(historyPath), stableHistory,
      "hostile hooks changed durable operator history");
    assert.equal(fs.existsSync(path.join(root,
      "operator-event-" + first.request_id + "-450.json")), false);
    assert.equal(splitCalls, 0, "writer invoked poisoned String.split");
    assert.equal(decodeCalls, 0, "writer invoked poisoned decoder");
    assert.equal(parseCalls, 0, "writer invoked poisoned JSON.parse");
    assert.equal(stringifyCalls, 0, "writer invoked poisoned JSON.stringify");
    assert.equal(inheritedCalls, 0, "writer invoked inherited toJSON");
  } finally {
    (String.prototype as any).split = originalSplit;
    (TextDecoder.prototype as any).decode = originalDecode;
    (JSON as any).parse = originalParse;
    (JSON as any).stringify = originalStringify;
    if (originalToJSON) {
      Object.defineProperty(Object.prototype, "toJSON", originalToJSON);
    } else {
      delete (Object.prototype as any).toJSON;
    }
  }

  // The central reader must HOLD on malformed raw JSONL instead of silently
  // skipping a torn historical fulfillment the mounted queue might omit.
  fs.appendFileSync(historyPath, '{"request_id":"truncated","operator_status":\n');
  const corrupted = fs.readFileSync(historyPath);
  await assert.rejects(
    () => mark(other, "rejected", 500),
    /buy_void_operator_terminal_history_(?:json_invalid|truncated_or_noncanonical)/u,
  );
  assert.deepEqual(fs.readFileSync(historyPath), corrupted,
    "malformed operator history was changed during hold");
  assert.equal(fs.existsSync(path.join(root,
    "operator-event-" + other.request_id + "-500.json")), false);

  console.log("VOID_BUY_VOID_OPERATOR_UNDER_LOCK_TERMINAL_V1_GREEN");
  console.log("historic_fulfillment_refuses_review_reject_and_duplicate=true");
  console.log("stale_route_projection_cannot_append_after_terminal=true");
  console.log("different_request_mark_still_accepted=true");
  console.log("malformed_raw_history_holds_before_append=true");
  console.log("terminal_history_hostile_intrinsics_ignored=true");
  console.log("terminal_descriptor_path_swap_holds_without_visible_append=true");
  console.log("terminal_exact_fulfilled_sidecar_recovery_without_duplicate=true");
  console.log("terminal_hidden_temp_partial_write_never_public=true");
  console.log("terminal_failed_temp_name_swap_unrelated_file_preserved=true");
  console.log("terminal_post_link_owned_hardlink_recovered_exactly_once=true");
  console.log("under_request_lock_jsonl_revalidated=true");
  console.log("actual_customer_ledger_access=false");
  console.log("payment_acceptance=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
