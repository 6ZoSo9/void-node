#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-receipt-continuity-v1.mjs";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1,
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_HIGH_WATER_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1,
  classifyCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1,
  deriveCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1,
  inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1,
  persistCoupledNativeGasReconciliationCustodyReceiptWriterV1,
  recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1,
  testOnlyInspectCoupledNativeGasReconciliationCustodyReceiptWriterRootSwapV1,
  testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-receipt-writer-v1.mjs";

const JOURNAL_NAME =
  "coupled-native-gas-reconciliation-custody-receipts-v1.jsonl";
const HIGH_WATER_NAME =
  "coupled-native-gas-reconciliation-custody-receipt-high-water-v1.json";
const INTENT_NAME =
  "coupled-native-gas-reconciliation-custody-receipt-writer-intent-v1.json";
const LOCK_QUEUE_NAME =
  "coupled-native-gas-reconciliation-custody-receipt-writer-v1.queue";
const COLLECTOR_MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_HOST_EVIDENCE_V1";
const QUALIFICATION_MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1";
const QUALIFICATION_RECEIPT_MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_V1";
const QUALIFICATION_RECEIPT_SCHEMA =
  "void_coupled_native_gas_reconciliation_custody_receipt_v1";
const QUALIFICATION_DOMAIN =
  "void-coupled-native-gas-reconciliation-custody-qualification-v1";

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("noncanonical_number");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical_value");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8"))
      .digest("hex")
  );
}

function sha256Hex(value) {
  return crypto
    .createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8"))
    .digest("hex");
}

function sha(fill) {
  return "sha256:" + fill.repeat(64);
}

function makeCollector({
  host = "nimo-writer-proof-host",
  payer = "0x" + "a".repeat(40),
  payerDomain = "voidngpd1_writer_proof",
  root = "/var/lib/void-native-gas-reconciliation-writer-proof",
  rootDev = "1048577",
  rootIno = "1001",
  rootMountId = 77,
  machine = sha("1"),
  boot = sha("2"),
  observed = 1_800_000_000_000,
  completed = observed + 100,
  evidenceGeneration = String(observed),
  mount = sha("3"),
  policy = sha("4"),
  evidence = sha("5"),
  service = sha("6"),
} = {}) {
  const receiptBody = {
    schema: QUALIFICATION_RECEIPT_SCHEMA,
    marker: QUALIFICATION_RECEIPT_MARKER,
    version: 1,
    host_id: host,
    payer_address: payer,
    evidence_generation: evidenceGeneration,
    observed_at_ms: observed,
    expires_at_ms: observed + 120_000,
    boot_id_sha256: boot,
    payer_domain_id: payerDomain,
    payer_root_path: root,
    payer_root_dev: rootDev,
    payer_root_ino: rootIno,
    payer_root_mount_id: rootMountId,
    records_ino: "1002",
    reconciliations_ino: "1003",
    queue_ino: "1004",
    mount_instance_fingerprint_sha256: mount,
    service_unit_sha256: service,
    qualification_policy_fingerprint_sha256: policy,
    evidence_snapshot_fingerprint_sha256: evidence,
  };
  const receipt = {
    ...receiptBody,
    receipt_sha256: sha256Id(canonical(receiptBody)),
  };
  const qualificationId = sha256Id(
    canonical({
      domain: QUALIFICATION_DOMAIN,
      qualification_policy_fingerprint_sha256: policy,
      evidence_snapshot_fingerprint_sha256: evidence,
      receipt_sha256: receipt.receipt_sha256,
    }),
  );
  return {
    ok: true,
    status: "HOST_EVIDENCE_OBSERVED_SOURCE_QUALIFIED_NOT_AUTHORIZED",
    marker: COLLECTOR_MARKER,
    version: 1,
    live_observation_backed: true,
    synthetic_snapshot_authority: false,
    trusted_collector_proven: false,
    writer_generation_binding_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    live_host_qualification_performed: false,
    storage_bootstrap: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    qualification: {
      ok: true,
      status: "source_qualified",
      marker: QUALIFICATION_MARKER,
      version: 1,
      qualification_id_sha256: qualificationId,
      evidence_snapshot_fingerprint_sha256: evidence,
      qualification_policy_fingerprint_sha256: policy,
      mount_instance_fingerprint_sha256: mount,
      host_id: host,
      payer_address: payer,
      payer_domain_id: payerDomain,
      payer_root_path: root,
      receipt,
      writer_generation_binding_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
    },
    classifier_input: {
      host_evidence: {
        evidence_snapshot: {
          evidence_generation: evidenceGeneration,
        },
      },
    },
    collector_evidence: {
      observed_at_ms: observed,
      completed_at_ms: completed,
      boot_id_sha256: boot,
      machine_id_sha256: machine,
    },
  };
}

function sourceBinding() {
  const value =
    testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1({
      repository_head_sha: "a".repeat(40),
      repository_tree_sha: "b".repeat(40),
      repository_origin: "https://github.com/6ZoSo9/void-node.git",
      worktree_clean: true,
      reviewed_base_is_ancestor: true,
      source_blobs:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.map(
          (row) => ({
            path: row.path,
            git_blob_sha1: row.git_blob_sha1,
            worktree_git_blob_sha1: row.git_blob_sha1,
          }),
        ),
    });
  assert.equal(value.ok, true, JSON.stringify(value));
  return value;
}

function highWaterBytes(journal) {
  const value =
    deriveCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
      journal,
    );
  return Buffer.from(canonical(value) + "\n", "utf8");
}

function fixture({
  journal = Buffer.alloc(0),
  highWater = null,
  lockQueue = true,
} = {}) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-native-gas-receipt-writer-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const journalRoot = path.join(root, "journal");
  const highWaterRoot = path.join(root, "high-water");
  fs.mkdirSync(journalRoot, { mode: 0o700 });
  fs.mkdirSync(highWaterRoot, { mode: 0o700 });
  if (lockQueue) {
    fs.mkdirSync(path.join(journalRoot, LOCK_QUEUE_NAME), { mode: 0o700 });
  }
  fs.writeFileSync(path.join(journalRoot, JOURNAL_NAME), journal, {
    mode: 0o600,
  });
  fs.writeFileSync(
    path.join(highWaterRoot, HIGH_WATER_NAME),
    highWater ?? highWaterBytes(journal),
    { mode: 0o600 },
  );
  return { root, journalRoot, highWaterRoot };
}

function cleanup(f) {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function inputFor(f, collector = makeCollector()) {
  return {
    journal_root: f.journalRoot,
    high_water_root: f.highWaterRoot,
    collector_decision: collector,
    source_binding: sourceBinding(),
  };
}

function requireOk(value, label = "unexpected_hold") {
  assert.equal(value.ok, true, label + ":" + JSON.stringify(value));
  return value;
}

function requireHeld(value, reason = null) {
  assert.equal(value.ok, false, JSON.stringify(value));
  assert.equal(value.status, "held");
  if (reason !== null) assert.equal(value.reason, reason);
  assert.equal(value.production_gate_ready, false);
  assert.equal(value.runtime_integration, false);
  assert.equal(value.funds_movement, false);
  return value;
}

assert.equal(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1,
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1",
);
assert.equal(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_HIGH_WATER_V1,
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_HIGH_WATER_V1",
);

const trueAuthority = new Set([
  "source_only_writer",
  "continuity_contract_reused",
  "exact_planned_append_required",
  "descriptor_bound_reads",
  "filesystem_read",
  "filesystem_write",
  "serialized_publication",
  "preprovisioned_lock_queue_required",
  "separate_storage_roots_required",
  "redundant_publication_intent",
  "crash_recovery",
  "atomic_journal_publication",
  "atomic_high_water_publication",
  "exact_post_reclassification",
  "exact_terminal_idempotent_retry",
  "paired_terminal_root_revalidation",
  "high_water_exact_journal_binding",
]);
for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_AUTHORITY_V1,
)) {
  assert.equal(value, trueAuthority.has(key), key);
}

const emptyHighWater =
  deriveCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1("");
assert.equal(emptyHighWater.generation, 0);
assert.equal(emptyHighWater.record_count, 0);
assert.equal(
  emptyHighWater.source_generation_id,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
);
assert.equal(
  classifyCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
    "",
    highWaterBytes(Buffer.alloc(0)),
  ).ok,
  true,
);

{
  const f = fixture();
  try {
    const inspected = requireOk(
      await inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        inputFor(f),
      ),
    );
    assert.equal(inspected.status, "clean");
    assert.equal(inspected.generation, 0);
    assert.equal(inspected.record_count, 0);
    assert.equal(inspected.operation_performed, false);

    const persisted = requireOk(
      await persistCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        inputFor(f),
      ),
    );
    assert.equal(persisted.status, "persisted");
    assert.equal(persisted.generation, 1);
    assert.equal(persisted.record_count, 1);
    assert.equal(persisted.operation_performed, true);
    assert.equal(persisted.recovery_performed, false);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );

    const journal = fs.readFileSync(path.join(f.journalRoot, JOURNAL_NAME));
    const highWater = fs.readFileSync(
      path.join(f.highWaterRoot, HIGH_WATER_NAME),
    );
    const continuity = requireOk(
      classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
        journal,
      ),
    );
    assert.equal(continuity.generation, 1);
    assert.equal(continuity.record_count, 1);
    assert.equal(
      continuity.tip_receipt_sha256,
      persisted.tip_receipt_sha256,
    );
    assert.equal(
      classifyCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
        journal,
        highWater,
      ).ok,
      true,
    );

    const duplicate = requireOk(
      await persistCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        inputFor(f),
      ),
      "exact terminal retry",
    );
    assert.equal(duplicate.status, "idempotent");
    assert.equal(duplicate.operation_performed, false);
    assert.equal(duplicate.recovery_performed, false);
    assert.equal(duplicate.generation, persisted.generation);
    assert.equal(
      duplicate.tip_receipt_sha256,
      persisted.tip_receipt_sha256,
    );
    assert.equal(
      fs.readFileSync(path.join(f.journalRoot, JOURNAL_NAME)).equals(journal),
      true,
      "idempotent retry must not rewrite journal bytes",
    );
    assert.equal(
      fs.readFileSync(path.join(f.highWaterRoot, HIGH_WATER_NAME)).equals(
        highWater,
      ),
      true,
      "idempotent retry must not rewrite high-water bytes",
    );
  } finally {
    cleanup(f);
  }
}

for (const phase of [
  "after_journal_intent",
  "after_high_water_intent",
  "after_journal_write",
  "after_high_water_write",
  "after_journal_intent_remove",
]) {
  const f = fixture();
  try {
    const crashed = requireHeld(
      await testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1(
        inputFor(f),
        phase,
      ),
    );
    assert.match(crashed.reason, new RegExp("test_crash_" + phase, "u"));
    const recovered = requireOk(
      await recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
      "recovery:" + phase,
    );
    assert.equal(recovered.status, "recovered");
    assert.equal(recovered.recovery_performed, true);
    assert.equal(recovered.generation, 1);
    assert.equal(recovered.record_count, 1);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      false,
      phase,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
      phase,
    );
    const inspected = requireOk(
      await inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
    );
    assert.equal(inspected.generation, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const originalInput = inputFor(f);
    const crashed = requireHeld(
      await testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1(
        originalInput,
        "after_high_water_intent",
      ),
    );
    assert.match(crashed.reason, /test_crash_after_high_water_intent/u);
    const alternate = requireHeld(
      await persistCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        inputFor(
          f,
          makeCollector({ observed: 1_800_000_001_000 }),
        ),
      ),
      "receipt_writer_pending_intent_input_mismatch",
    );
    assert.equal(alternate.operation_performed, false);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      true,
    );
    const exactRetry = requireOk(
      await persistCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        originalInput,
      ),
      "exact pending intent retry",
    );
    assert.equal(exactRetry.status, "recovered");
    assert.equal(exactRetry.recovery_performed, true);
    assert.equal(exactRetry.generation, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const crashed = requireHeld(
      await testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1(
        inputFor(f),
        "after_high_water_intent",
      ),
    );
    assert.match(crashed.reason, /test_crash_after_high_water_intent/u);
    const intent = JSON.parse(
      fs.readFileSync(
        path.join(f.journalRoot, INTENT_NAME),
        "utf8",
      ),
    );
    assert.equal(typeof intent.after_high_water_json, "string");
    fs.writeFileSync(
      path.join(f.highWaterRoot, HIGH_WATER_NAME),
      intent.after_high_water_json,
      { mode: 0o600 },
    );

    const recovered = requireOk(
      await recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
      "intent-bound high-water-ahead recovery",
    );
    assert.equal(recovered.status, "recovered");
    assert.equal(recovered.recovery_performed, true);
    assert.equal(recovered.generation, 1);
    assert.equal(recovered.record_count, 1);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      classifyCoupledNativeGasReconciliationCustodyReceiptWriterHighWaterV1(
        fs.readFileSync(path.join(f.journalRoot, JOURNAL_NAME)),
        fs.readFileSync(path.join(f.highWaterRoot, HIGH_WATER_NAME)),
      ).ok,
      true,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const crashed = requireHeld(
      await testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1(
        inputFor(f),
        "after_journal_intent",
      ),
    );
    assert.match(crashed.reason, /test_crash_after_journal_intent/u);
    const finalIntent = path.join(f.journalRoot, INTENT_NAME);
    const linkedTemp = path.join(
      f.journalRoot,
      "." + INTENT_NAME + ".tmp-" + String(process.pid) + "-aaaaaaaaaaaaaaaa",
    );
    fs.linkSync(finalIntent, linkedTemp);
    assert.equal(fs.statSync(finalIntent).nlink, 2);
    const recovered = requireOk(
      await recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
      "linked-intent-temp recovery",
    );
    assert.equal(recovered.status, "recovered");
    assert.equal(recovered.operation_performed, true);
    assert.equal(fs.existsSync(linkedTemp), false);
    assert.equal(fs.existsSync(finalIntent), false);
    assert.equal(recovered.generation, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const crashed = requireHeld(
      await testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1(
        inputFor(f),
        "after_journal_intent",
      ),
    );
    assert.match(crashed.reason, /test_crash_after_journal_intent/u);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );
    fs.writeFileSync(
      path.join(f.highWaterRoot, HIGH_WATER_NAME),
      Buffer.from('{"stale":true}\n', "utf8"),
      { mode: 0o600 },
    );
    const held = requireHeld(
      await recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
    );
    assert.match(held.reason, /receipt_writer_recovery_high_water_unknown/u);
    assert.equal(
      held.operation_performed,
      false,
      "unknown-state recovery must not repair the missing redundant intent",
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const staleTemp = path.join(
      f.journalRoot,
      "." + JOURNAL_NAME + ".tmp-" + String(process.pid) + "-bbbbbbbbbbbbbbbb",
    );
    fs.writeFileSync(staleTemp, Buffer.alloc(0), { mode: 0o600 });
    const inspected = requireHeld(
      await inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
      "receipt_writer_recovery_required",
    );
    assert.equal(inspected.operation_performed, false);
    const recovered = requireOk(
      await recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
      "stale-temp recovery",
    );
    assert.equal(recovered.status, "recovered");
    assert.equal(recovered.operation_performed, true);
    assert.equal(fs.existsSync(staleTemp), false);
    assert.equal(recovered.generation, 0);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture({ lockQueue: false });
  try {
    requireHeld(
      await inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        inputFor(f),
      ),
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    fs.writeFileSync(
      path.join(f.highWaterRoot, HIGH_WATER_NAME),
      Buffer.from('{"forged":true}\n', "utf8"),
      { mode: 0o600 },
    );
    const held = requireHeld(
      await inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        inputFor(f),
      ),
    );
    assert.match(held.reason, /receipt_writer_high_water_mismatch/u);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const journalSwap =
      testOnlyInspectCoupledNativeGasReconciliationCustodyReceiptWriterRootSwapV1(
        inputFor(f),
        "journal",
      );
    requireHeld(journalSwap);
    const highWaterSwap =
      testOnlyInspectCoupledNativeGasReconciliationCustodyReceiptWriterRootSwapV1(
        inputFor(f),
        "high_water",
      );
    requireHeld(highWaterSwap);
  } finally {
    cleanup(f);
  }
}

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-native-gas-receipt-writer-same-root-"),
  );
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(path.join(root, LOCK_QUEUE_NAME), { mode: 0o700 });
  fs.writeFileSync(path.join(root, JOURNAL_NAME), "", { mode: 0o600 });
  fs.writeFileSync(
    path.join(root, HIGH_WATER_NAME),
    highWaterBytes(Buffer.alloc(0)),
    { mode: 0o600 },
  );
  try {
    requireHeld(
      await inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: root,
        high_water_root: root,
      }),
      "receipt_writer_storage_roots_not_distinct",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    fs.rmSync(path.join(f.highWaterRoot, HIGH_WATER_NAME));
    requireHeld(
      await inspectCoupledNativeGasReconciliationCustodyReceiptWriterV1(
        inputFor(f),
      ),
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const crash =
      await testOnlyPersistCoupledNativeGasReconciliationCustodyReceiptWriterCrashV1(
        inputFor(f),
        "after_journal_intent",
      );
    requireHeld(crash);
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );
    const recovered = requireOk(
      await recoverCoupledNativeGasReconciliationCustodyReceiptWriterV1({
        journal_root: f.journalRoot,
        high_water_root: f.highWaterRoot,
      }),
    );
    assert.equal(recovered.status, "recovered");
    assert.equal(
      fs.existsSync(path.join(f.journalRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(f.highWaterRoot, INTENT_NAME)),
      false,
    );
  } finally {
    cleanup(f);
  }
}

const writerSource = fs.readFileSync(
  "tools/void-coupled-native-gas-reconciliation-custody-receipt-writer-v1.mjs",
  "utf8",
);
assert.match(writerSource, /O_NOFOLLOW/u);
assert.match(writerSource, /\/proc\/self\/fd/u);
assert.match(writerSource, /withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1/u);
assert.match(writerSource, /planCoupledNativeGasReconciliationCustodyReceiptV1/u);
assert.match(writerSource, /classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1/u);
assert.equal(writerSource.includes("Date.now("), false);
assert.equal(writerSource.includes("process.env.DATA_DIR"), false);

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_WRITER_V1_GREEN",
);
console.log("exact_continuity_planner_reused=true");
console.log("descriptor_bound_private_roots=true");
console.log("separate_storage_roots_required=true");
console.log("preprovisioned_lock_queue_required=true");
console.log("redundant_publication_intent=true");
console.log("five_crash_cutpoints_recovered=true");
console.log("linked_intent_temp_recovered=true");
console.log("stale_atomic_temp_recovered=true");
console.log("paired_terminal_root_revalidation=true");
console.log("high_water_exact_journal_binding=true");
console.log("exact_post_reclassification=true");
console.log("exact_terminal_idempotent_retry=true");
console.log("intent_bound_high_water_ahead_recovery=true");
console.log("pending_intent_exact_input_binding=true");
console.log("unknown_state_before_redundant_intent_repair=true");
console.log("storage_bootstrap=false");
console.log("rollback_resistance_proven=false");
console.log("protected_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("trusted_collector_proven=false");
console.log("verification_clock_authority_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
