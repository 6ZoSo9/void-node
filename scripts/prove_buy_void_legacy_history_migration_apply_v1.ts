#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
} from "../src/economic/buy_void_history_carrier_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1,
  type BuyVoidLegacyHistoryMigrationPlanV1,
} from "../src/economic/buy_void_legacy_history_migration_plan_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
  applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1,
} from "../src/economic/buy_void_legacy_history_migration_apply_v1.js";

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function privateDirectory(directory: string): void {
  fs.mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });
  fs.chmodSync(directory, 0o700);
}

function privateFile(file: string, bytes: Buffer | string): void {
  privateDirectory(path.dirname(file));
  fs.writeFileSync(file, bytes, {
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(
    directory,
    fs.constants.O_RDONLY |
      ((fs.constants as any).O_DIRECTORY || 0),
  );
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function expectFailure(
  run: () => unknown,
  marker: string,
): void {
  let error: unknown;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  if (!(error instanceof Error)) {
    throw new Error(
      "expected failure containing " + marker,
    );
  }
  assert.match(error.message, new RegExp(marker));
}

function syntheticRow(): Buffer {
  const body = {
    schema: "void_buy_void_inventory_reservation_v1",
    marker:
      "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
    reservation_id: "1".repeat(64),
    reserved_at_ms: 1_770_000_000_000,
    pool_id: "buy-void-presale-v1",
    inventory_policy_version: "presale-v1",
    pool_capacity_void_units: "10000000000000",
    committed_before_void_units: "0",
    reserved_void_units: "2000000",
    committed_after_void_units: "2000000",
    available_after_void_units: "9999998000000",
    payment_key_sha256: "2".repeat(64),
    request_key_sha256: "3".repeat(64),
    canonical_payment_identity:
      "voidpay1:base:0x" + "4".repeat(64) + ":0",
    request_id: "phase-b-proof-request",
    instruction_id: "phase-b-proof-instruction",
    delivery_address:
      "0x5555555555555555555555555555555555555555",
    intent_fingerprint: "6".repeat(64),
    reservation_status: "reserved",
    inventory_decrement_performed: false,
    reservation_release_authorized: false,
    execution_authorized_by_this_module: false,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };
  const canonical = JSON.stringify(body);
  return Buffer.from(canonical + "\n", "utf8");
}

function syntheticPlan(
  runtimeRoot: string,
  row: Buffer,
): BuyVoidLegacyHistoryMigrationPlanV1 {
  const payload = row.subarray(0, row.length - 1);
  const rowSha = sha256(row);
  const planSha =
    sha256(
      "phase-b-synthetic-plan\n" +
        runtimeRoot +
        "\n" +
        rowSha,
    );
  return {
    marker:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1,
    version: 1,
    runtime_root: runtimeRoot,
    pool_id: "buy-void-presale-v1",
    lineage_mode:
      "legacy_pool_consumed_current_pool_alias",
    legacy_pool_id: "void-presale-mainnet0-v1",
    payment_key_sha256: "2".repeat(64),
    primary_record_id: "1".repeat(64),
    primary_record_journal_sha256: "7".repeat(64),
    primary_record_fingerprint_sha256:
      sha256(payload),
    payment_history_fingerprint_sha256:
      "8".repeat(64),
    legacy_primary_record_id: "9".repeat(64),
    legacy_primary_record_journal_sha256:
      "a".repeat(64),
    legacy_primary_record_fingerprint_sha256:
      "b".repeat(64),
    legacy_payment_history_fingerprint_sha256:
      "c".repeat(64),
    legacy_pool_alias_fingerprint_sha256:
      "d".repeat(64),
    lifecycle_state: "legacy_pool_consumed_alias",
    execution_attempt_id: "e".repeat(64),
    execution_attempt_state_fingerprint_sha256:
      "f".repeat(64),
    inventory_consumption_id: "0".repeat(64),
    inventory_consumption_fingerprint_sha256:
      "1".repeat(64),
    inventory_consumption_record_sha256:
      "2".repeat(64),
    void_delivery_tx_hash:
      "0x" + "3".repeat(64),
    void_amount_units: "2000000",
    canonical_jsonl_payload_bytes:
      payload.length,
    canonical_jsonl_row_bytes: row.length,
    canonical_jsonl_row_sha256: rowSha,
    proposed_segment_generation: 1,
    proposed_segment_target_bytes:
      8 * 1024 * 1024,
    proposed_max_record_bytes:
      1024 * 1024,
    proposed_active_segment_id:
      VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
    proposed_active_segment_sha256: rowSha,
    proposed_record_byte_offset: "0",
    proposed_record_byte_length: row.length,
    proposed_record_sha256: rowSha,
    segmented_durable_root_sha256: null,
    carrier_root_sha256: null,
    migration_plan_sha256: planSha,
    authority:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_AUTHORITY_V1,
  };
}

type SnapshotEntry = {
  relative: string;
  kind: "directory" | "file";
  mode: number;
  size: string;
  ino: string;
  mtime_ns: string;
  ctime_ns: string;
  sha256: string | null;
};

function statNs(st: any, field: "mtime" | "ctime"): string {
  const direct = st[field + "Ns"];
  if (typeof direct === "bigint") {
    return String(direct);
  }
  return String(
    BigInt(
      Math.round(
        Number(st[field + "Ms"] || 0) *
          1_000_000,
      ),
    ),
  );
}

function snapshotTree(root: string): SnapshotEntry[] {
  const out: SnapshotEntry[] = [];
  const walk = (directory: string): void => {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const st =
        fs.lstatSync(file, { bigint: true } as any);
      const relative =
        path.relative(root, file);
      if (st.isDirectory() && !st.isSymbolicLink()) {
        out.push({
          relative,
          kind: "directory",
          mode: Number(st.mode) & 0o777,
          size: String(st.size),
          ino: String(st.ino),
          mtime_ns: statNs(st, "mtime"),
          ctime_ns: statNs(st, "ctime"),
          sha256: null,
        });
        walk(file);
      } else if (st.isFile() && !st.isSymbolicLink()) {
        out.push({
          relative,
          kind: "file",
          mode: Number(st.mode) & 0o777,
          size: String(st.size),
          ino: String(st.ino),
          mtime_ns: statNs(st, "mtime"),
          ctime_ns: statNs(st, "ctime"),
          sha256: sha256(fs.readFileSync(file)),
        });
      } else {
        throw new Error(
          "unexpected namespace kind: " + relative,
        );
      }
    }
  };
  walk(root);
  return out;
}

function applyFixture(runtimeRoot: string) {
  const row = syntheticRow();
  const plan = syntheticPlan(runtimeRoot, row);
  return {
    row,
    plan,
    receipt:
      applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1({
        runtime_root: runtimeRoot,
        plan,
        canonical_row: row,
      }),
  };
}

const tmp =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-buy-history-phase-b-proof-",
    ),
  );
fs.chmodSync(tmp, 0o700);

try {
  const runtimeRoot = path.join(tmp, "runtime");
  privateDirectory(runtimeRoot);

  const first = applyFixture(runtimeRoot);
  assert.equal(
    first.receipt.marker,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1,
  );
  assert.equal(first.receipt.version, 1);
  assert.equal(first.receipt.status, "created");
  assert.equal(
    first.receipt.mutation_performed,
    true,
  );
  assert.equal(
    first.receipt.migration_plan_sha256,
    first.plan.migration_plan_sha256,
  );
  assert.equal(
    first.receipt.evidence.migration_plan_sha256,
    first.plan.migration_plan_sha256,
  );
  assert.equal(
    first.receipt.evidence.lineage_mode,
    first.plan.lineage_mode,
  );
  assert.equal(
    first.receipt.evidence.legacy_pool_alias_fingerprint_sha256,
    first.plan.legacy_pool_alias_fingerprint_sha256,
  );
  assert.equal(
    first.receipt.evidence.canonical_jsonl_row_sha256,
    sha256(first.row),
  );
  assert.equal(
    first.receipt.evidence.record_locator
      .segmented_durable_root_sha256,
    first.receipt.evidence.durable_root_sha256,
  );
  assert.equal(
    first.receipt.evidence.record_locator.segment_id,
    VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
  );
  assert.equal(
    first.receipt.evidence.record_locator.segment_sha256,
    sha256(first.row),
  );
  assert.equal(
    first.receipt.evidence.record_locator.byte_offset,
    "0",
  );
  assert.equal(
    first.receipt.evidence.record_locator.byte_length,
    first.row.length,
  );
  assert.equal(
    first.receipt.evidence.record_locator.record_sha256,
    sha256(first.row),
  );
  assert.match(
    first.receipt.evidence.evidence_id,
    /^[0-9a-f]{64}$/u,
  );
  assert.match(
    first.receipt.pointer.pointer_id,
    /^[0-9a-f]{64}$/u,
  );
  assert.equal(
    first.receipt.pointer.evidence_id,
    first.receipt.evidence.evidence_id,
  );
  assert.equal(
    first.receipt.pointer.durable_root_sha256,
    first.receipt.evidence.durable_root_sha256,
  );
  assert.deepEqual(
    first.receipt.evidence.authority,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_AUTHORITY_V1,
  );

  assert.deepEqual(
    fs.readdirSync(runtimeRoot).sort(),
    [
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    ],
  );
  const publishedRoot =
    path.join(
      runtimeRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    );
  assert.deepEqual(
    fs.readdirSync(publishedRoot).sort(),
    [
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
    ].sort(),
  );
  const generationsRoot =
    path.join(
      publishedRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
    );
  assert.deepEqual(
    fs.readdirSync(generationsRoot),
    [first.plan.migration_plan_sha256],
  );
  const generationRoot =
    path.join(
      generationsRoot,
      first.plan.migration_plan_sha256,
    );
  assert.deepEqual(
    fs.readdirSync(generationRoot).sort(),
    [
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    ].sort(),
  );

  const beforeDuplicate =
    snapshotTree(runtimeRoot);
  const duplicate =
    applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1({
      runtime_root: runtimeRoot,
      plan: first.plan,
      canonical_row: first.row,
    });
  assert.equal(duplicate.status, "duplicate");
  assert.equal(
    duplicate.mutation_performed,
    false,
  );
  assert.deepEqual(
    duplicate.evidence,
    first.receipt.evidence,
  );
  assert.deepEqual(
    duplicate.pointer,
    first.receipt.pointer,
  );
  assert.deepEqual(
    snapshotTree(runtimeRoot),
    beforeDuplicate,
    "exact replay must be persistently read-only",
  );

  const foreignPointerRoot =
    path.join(tmp, "foreign-pointer");
  privateDirectory(foreignPointerRoot);
  const foreignPointerStore =
    path.join(
      foreignPointerRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    );
  privateDirectory(foreignPointerStore);
  privateFile(
    path.join(
      foreignPointerStore,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
    ),
    "{}\n",
  );
  const foreignPointerRow = syntheticRow();
  const foreignPointerPlan =
    syntheticPlan(
      foreignPointerRoot,
      foreignPointerRow,
    );
  const foreignPointerBefore =
    snapshotTree(foreignPointerRoot);
  expectFailure(
    () =>
      applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1({
        runtime_root: foreignPointerRoot,
        plan: foreignPointerPlan,
        canonical_row: foreignPointerRow,
      }),
    "CURRENT_POINTER_FOREIGN",
  );
  assert.deepEqual(
    snapshotTree(foreignPointerRoot),
    foreignPointerBefore,
    "foreign current pointer must be preserved without mutation",
  );
  assert.equal(
    fs.existsSync(
      path.join(
        foreignPointerStore,
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
      ),
    ),
    false,
  );

  const foreignGenerationRoot =
    path.join(tmp, "foreign-generation");
  privateDirectory(foreignGenerationRoot);
  const foreignGenerationStore =
    path.join(
      foreignGenerationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    );
  const foreignGenerations =
    path.join(
      foreignGenerationStore,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
    );
  privateDirectory(foreignGenerations);
  privateDirectory(
    path.join(
      foreignGenerations,
      "f".repeat(64),
    ),
  );
  const foreignGenerationRow = syntheticRow();
  const foreignGenerationPlan =
    syntheticPlan(
      foreignGenerationRoot,
      foreignGenerationRow,
    );
  const foreignGenerationBefore =
    snapshotTree(foreignGenerationRoot);
  expectFailure(
    () =>
      applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1({
        runtime_root: foreignGenerationRoot,
        plan: foreignGenerationPlan,
        canonical_row: foreignGenerationRow,
      }),
    "FOREIGN_GENERATION_PRESENT",
  );
  assert.deepEqual(
    snapshotTree(foreignGenerationRoot),
    foreignGenerationBefore,
    "foreign generation must be preserved before expected generation creation",
  );
  assert.equal(
    fs.existsSync(
      path.join(
        foreignGenerations,
        foreignGenerationPlan.migration_plan_sha256,
      ),
    ),
    false,
  );

  const partialRoot =
    path.join(tmp, "partial-store");
  privateDirectory(partialRoot);
  const partial = applyFixture(partialRoot);
  const partialStoreRoot =
    path.join(
      partialRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    );
  const partialGenerationRoot =
    path.join(
      partialStoreRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
      partial.plan.migration_plan_sha256,
    );
  fs.unlinkSync(
    path.join(
      partialStoreRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
    ),
  );
  fs.unlinkSync(
    path.join(
      partialGenerationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
    ),
  );
  fs.unlinkSync(
    path.join(
      partialGenerationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
      "manifest.v1.json",
    ),
  );
  fsyncDirectory(partialStoreRoot);
  fsyncDirectory(partialGenerationRoot);
  fsyncDirectory(
    path.join(
      partialGenerationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    ),
  );
  const partialBefore =
    snapshotTree(partialRoot);
  expectFailure(
    () =>
      applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1({
        runtime_root: partialRoot,
        plan: partial.plan,
        canonical_row: partial.row,
      }),
    "INCOMPLETE_SEGMENTED_STORE_REQUIRES_REVIEW",
  );
  assert.deepEqual(
    snapshotTree(partialRoot),
    partialBefore,
    "incomplete owned store must be preserved for review",
  );

  const wrongRoot =
    path.join(tmp, "wrong-root");
  privateDirectory(wrongRoot);
  const wrongRow = syntheticRow();
  const wrongPlan =
    syntheticPlan(
      path.join(tmp, "different-runtime"),
      wrongRow,
    );
  const wrongBefore = snapshotTree(wrongRoot);
  expectFailure(
    () =>
      applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1({
        runtime_root: wrongRoot,
        plan: wrongPlan,
        canonical_row: wrongRow,
      }),
    "INVALID_PHASE_A_PLAN",
  );
  assert.deepEqual(
    snapshotTree(wrongRoot),
    wrongBefore,
  );

  const source =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "src/economic/buy_void_legacy_history_migration_apply_v1.ts",
      ),
      "utf8",
    );
  for (const required of [
    "applyBuyVoidProductionLegacyHistoryMigrationV1",
    "planBuyVoidProductionLegacyHistoryMigrationV1",
    "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_EXPECTED_PLAN_SHA256_V1",
    "create_only_current_pointer: true",
    "exact_successful_replay_idempotent: true",
    "foreign_state_preserved_on_hold: true",
    "legacy_journal_mutation: false",
    "payment_history_projection_mutation: false",
    "carrier_root_mutation: false",
    "runtime_activation: false",
    "publishSegmentedJsonlDurableRootV1",
    "verifySegmentedJsonlDurableRootMaterializedAtUseV1",
    "reconstructSegmentedJsonlV1ToFile",
    "buildSegmentedJsonlV1FromFile",
    "CURRENT_POINTER_FOREIGN",
    "FOREIGN_GENERATION_PRESENT",
    "INCOMPLETE_SEGMENTED_STORE_REQUIRES_REVIEW",
  ]) {
    assert.equal(
      source.includes(required),
      true,
      "missing Phase-B contract: " + required,
    );
  }
  for (const forbidden of [
    "rmSync(",
    "renameSync(",
    "unlinkSync(",
    "systemctl",
    "fetch(",
    "curl",
    "wallet_access: true",
    "transaction_broadcast: true",
    "funds_movement: true",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden Phase-B primitive: " + forbidden,
    );
  }

  console.log(
    "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1_PROOF_GREEN",
  );
  console.log("phase_a_plan_bound=true");
  console.log("one_row_segmented_store_created=true");
  console.log("materialized_authority_bound=true");
  console.log("durable_root_published_and_reread=true");
  console.log("durable_alias_evidence_published=true");
  console.log("current_pointer_create_only=true");
  console.log("exact_successful_replay_persistently_read_only=true");
  console.log("foreign_pointer_preserved=true");
  console.log("foreign_generation_preserved=true");
  console.log("incomplete_store_preserved_for_review=true");
  console.log("legacy_journal_mutation=false");
  console.log("carrier_root_mutation=false");
  console.log("runtime_activation=false");
  console.log("service_action=false");
  console.log("credential_content_read=false");
  console.log("wallet_or_signer_access=false");
  console.log("rpc_call=false");
  console.log("transaction_signing=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_write=false");
  console.log("inventory_mutation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(tmp, {
    recursive: true,
    force: true,
  });
}
