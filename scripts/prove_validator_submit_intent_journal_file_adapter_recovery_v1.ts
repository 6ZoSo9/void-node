import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ValidatorSubmitIntentJournalFileAdapterV1,
  type ValidatorSubmitIntentJournalFileAppendDecisionV1,
  type ValidatorSubmitIntentJournalFileLoadDecisionV1,
} from "../src/validator/validator_submit_intent_journal_file_adapter_v1.js";
import {
  ValidatorSubmitIntentStoreV1,
  type ValidatorSubmitIntentStoreDecisionV1,
} from "../src/validator/validator_submit_intent_store_v1.js";

const ZERO_HASH = "0".repeat(64);
const intent = `0x${"a".repeat(64)}`;

function storeOk(
  decision: ValidatorSubmitIntentStoreDecisionV1,
): Extract<ValidatorSubmitIntentStoreDecisionV1, { ok: true }> {
  if (decision.ok === false) throw new Error(`unexpected store hold: ${decision.reason}`);
  return decision;
}

function recordOf(
  decision: Extract<ValidatorSubmitIntentStoreDecisionV1, { ok: true }>,
) {
  if (!decision.record) throw new Error(`missing record for ${decision.status}`);
  return decision.record;
}

function loadHeldReason(
  decision: ValidatorSubmitIntentJournalFileLoadDecisionV1,
): string {
  if (decision.ok !== false) throw new Error("expected adapter load hold");
  return decision.reason;
}

function appendHeldReason(
  decision: ValidatorSubmitIntentJournalFileAppendDecisionV1,
): string {
  if (decision.ok !== false) throw new Error("expected adapter append hold");
  return decision.reason;
}

function appendOk(
  decision: ValidatorSubmitIntentJournalFileAppendDecisionV1,
): Extract<ValidatorSubmitIntentJournalFileAppendDecisionV1, { ok: true }> {
  if (decision.ok === false) throw new Error(`unexpected adapter hold: ${decision.reason}`);
  return decision;
}

function temporaryParent(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `void-validator-file-${label}-`));
  fs.chmodSync(dir, 0o700);
  return dir;
}

function adapterAt(parent: string, options: Record<string, string | number> = {}) {
  return new ValidatorSubmitIntentJournalFileAdapterV1({
    journal_path: path.join(parent, "journal.jsonl"),
    max_file_bytes: 4 * 1024 * 1024,
    max_line_bytes: 64 * 1024,
    max_entries: 100,
    ...options,
  });
}

const store = new ValidatorSubmitIntentStoreV1({ max_records: 10 });
const pending = recordOf(storeOk(store.apply({
  action: "reserve",
  now_ms: 10_000,
  ttl_ms: 5_000,
  submit_intent_id: intent,
  expected_record_hash: null,
})));

{
  const parent = temporaryParent("torn");
  try {
    const journal = path.join(parent, "journal.jsonl");
    fs.writeFileSync(journal, '{"truncated":true}', { mode: 0o600 });
    assert.equal(
      loadHeldReason(adapterAt(parent).load(10_000)),
      "journal_torn_write_missing_final_newline",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("malformed");
  try {
    fs.writeFileSync(path.join(parent, "journal.jsonl"), "{not-json}\n", {
      mode: 0o600,
    });
    assert.equal(
      loadHeldReason(adapterAt(parent).load(10_000)),
      "journal_json_parse_failed",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("empty-line");
  try {
    fs.writeFileSync(path.join(parent, "journal.jsonl"), "\n", { mode: 0o600 });
    assert.equal(
      loadHeldReason(adapterAt(parent).load(10_000)),
      "journal_empty_line_forbidden",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("mode");
  try {
    fs.writeFileSync(path.join(parent, "journal.jsonl"), "", { mode: 0o644 });
    fs.chmodSync(path.join(parent, "journal.jsonl"), 0o644);
    assert.equal(
      loadHeldReason(adapterAt(parent).load(10_000)),
      "journal_file_mode_invalid",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("parent-mode");
  try {
    fs.chmodSync(parent, 0o755);
    assert.equal(
      loadHeldReason(adapterAt(parent).load(10_000)),
      "journal_parent_mode_invalid",
    );
  } finally {
    fs.chmodSync(parent, 0o700);
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("symlink-file");
  const other = temporaryParent("symlink-target");
  try {
    const real = path.join(other, "real.jsonl");
    fs.writeFileSync(real, "", { mode: 0o600 });
    fs.symlinkSync(real, path.join(parent, "journal.jsonl"));
    assert.equal(
      loadHeldReason(adapterAt(parent).load(10_000)),
      "journal_path_symlink_forbidden",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  }
}

{
  const realParent = temporaryParent("real-parent");
  const linkRoot = temporaryParent("parent-link-root");
  try {
    const linked = path.join(linkRoot, "linked");
    fs.symlinkSync(realParent, linked);
    const adapter = new ValidatorSubmitIntentJournalFileAdapterV1({
      journal_path: path.join(linked, "journal.jsonl"),
    });
    assert.equal(
      loadHeldReason(adapter.load(10_000)),
      "journal_parent_symlink_forbidden",
    );
  } finally {
    fs.rmSync(linkRoot, { recursive: true, force: true });
    fs.rmSync(realParent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("hardlink");
  const other = temporaryParent("hardlink-other");
  try {
    const journal = path.join(parent, "journal.jsonl");
    fs.writeFileSync(journal, "", { mode: 0o600 });
    fs.linkSync(journal, path.join(other, "alias.jsonl"));
    assert.equal(
      loadHeldReason(adapterAt(parent).load(10_000)),
      "journal_path_multiple_links_forbidden",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("stale-lock");
  try {
    const adapter = adapterAt(parent);
    fs.writeFileSync(adapter.lock_path, '{"stale":true}\n', { mode: 0o600 });
    const before = fs.readdirSync(parent);
    const held = adapter.append({
      now_ms: 10_000,
      expected_entries_total: 0,
      expected_head_hash_sha256: ZERO_HASH,
      event: { event_kind: "record_reserved", record: pending },
    });
    assert.equal(appendHeldReason(held), "journal_lock_exists");
    assert.equal(held.ok === false && held.write_performed, false);
    assert.deepEqual(fs.readdirSync(parent), before);
    assert.equal(fs.existsSync(path.join(parent, "journal.jsonl")), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}


{
  const parent = temporaryParent("lock-race");
  try {
    const adapter = adapterAt(parent);
    const originalOpenSync = fs.openSync;
    let injected = false;
    (fs as unknown as { openSync: typeof fs.openSync }).openSync = ((
      candidatePath: any,
      flags: any,
      mode?: any,
    ) => {
      if (
        !injected &&
        String(candidatePath) === adapter.lock_path &&
        typeof flags === "number" &&
        (flags & fs.constants.O_EXCL) !== 0
      ) {
        injected = true;
        const competitorFd = originalOpenSync(adapter.lock_path, "wx", 0o600);
        fs.writeFileSync(competitorFd, '{"competitor":true}\n', "utf8");
        fs.fsyncSync(competitorFd);
        fs.closeSync(competitorFd);
        const error = new Error("simulated competing lock") as Error & { code: string };
        error.code = "EEXIST";
        throw error;
      }
      return originalOpenSync(candidatePath, flags, mode);
    }) as typeof fs.openSync;

    try {
      assert.equal(
        appendHeldReason(adapter.append({
          now_ms: 10_000,
          expected_entries_total: 0,
          expected_head_hash_sha256: ZERO_HASH,
          event: { event_kind: "record_reserved", record: pending },
        })),
        "journal_lock_acquire_failed",
      );
    } finally {
      (fs as unknown as { openSync: typeof fs.openSync }).openSync = originalOpenSync;
    }

    assert.equal(injected, true);
    assert.equal(fs.existsSync(adapter.lock_path), true);
    assert.equal(
      fs.readFileSync(adapter.lock_path, "utf8"),
      '{"competitor":true}\n',
    );
    assert.equal(fs.existsSync(adapter.journal_path), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("cas");
  try {
    const adapter = adapterAt(parent);
    const first = appendOk(adapter.append({
      now_ms: 10_000,
      expected_entries_total: 0,
      expected_head_hash_sha256: ZERO_HASH,
      event: { event_kind: "record_reserved", record: pending },
    }));
    const before = fs.readFileSync(adapter.journal_path);
    assert.equal(
      appendHeldReason(adapter.append({
        now_ms: 10_100,
        expected_entries_total: 0,
        expected_head_hash_sha256: ZERO_HASH,
        event: {
          event_kind: "broadcast_started",
          event_at_ms: 10_100,
          submit_intent_id: intent,
          attempt: pending.attempt,
          record_hash_sha256: pending.record_hash_sha256,
          broadcast_id: `0x${"b".repeat(64)}`,
        },
      })),
      "journal_compare_and_swap_mismatch",
    );
    assert.deepEqual(fs.readFileSync(adapter.journal_path), before);
    assert.equal(first.entries_total, 1);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("tamper");
  try {
    const adapter = adapterAt(parent);
    appendOk(adapter.append({
      now_ms: 10_000,
      expected_entries_total: 0,
      expected_head_hash_sha256: ZERO_HASH,
      event: { event_kind: "record_reserved", record: pending },
    }));
    const parsed = JSON.parse(fs.readFileSync(adapter.journal_path, "utf8").trim());
    parsed.entry_hash_sha256 = "0".repeat(64);
    fs.writeFileSync(adapter.journal_path, `${JSON.stringify(parsed)}\n`, {
      mode: 0o600,
    });
    const held = adapter.load(10_100);
    assert.equal(loadHeldReason(held), "journal_replay_held");
    assert.equal(
      held.ok === false ? held.details?.replay_reason : null,
      "entry_hash_mismatch",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("torn-tail");
  try {
    const adapter = adapterAt(parent);
    appendOk(adapter.append({
      now_ms: 10_000,
      expected_entries_total: 0,
      expected_head_hash_sha256: ZERO_HASH,
      event: { event_kind: "record_reserved", record: pending },
    }));
    fs.appendFileSync(adapter.journal_path, '{"partial":');
    assert.equal(
      loadHeldReason(adapter.load(10_100)),
      "journal_torn_write_missing_final_newline",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

{
  const parent = temporaryParent("capacity");
  try {
    const adapter = adapterAt(parent, { max_entries: 1 });
    appendOk(adapter.append({
      now_ms: 10_000,
      expected_entries_total: 0,
      expected_head_hash_sha256: ZERO_HASH,
      event: { event_kind: "record_reserved", record: pending },
    }));
    const loaded = adapter.load(10_100);
    if (loaded.ok === false) throw new Error(`unexpected load hold: ${loaded.reason}`);
    assert.equal(
      appendHeldReason(adapter.append({
        now_ms: 10_100,
        expected_entries_total: loaded.entries_total,
        expected_head_hash_sha256: loaded.journal_head_hash_sha256,
        event: {
          event_kind: "broadcast_started",
          event_at_ms: 10_100,
          submit_intent_id: intent,
          attempt: pending.attempt,
          record_hash_sha256: pending.record_hash_sha256,
          broadcast_id: `0x${"c".repeat(64)}`,
        },
      })),
      "journal_entry_capacity_reached",
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

console.log("VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_FILE_ADAPTER_RECOVERY_V1_GREEN");
