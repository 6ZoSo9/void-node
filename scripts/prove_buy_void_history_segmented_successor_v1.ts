#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildSegmentedJsonlV1FromFile,
} from "../src/storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlCheckpointV1,
  deriveSegmentedJsonlSnapshotAuthorityV1,
  verifySegmentedJsonlCheckpointAnchorV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
} from "../src/storage/segmented_jsonl_materialized_authority_v1.js";
import {
  publishSegmentedJsonlDurableRootV1,
  readSegmentedJsonlDurableRootV1,
  verifySegmentedJsonlDurableRootMaterializedAtUseV1,
} from "../src/storage/segmented_jsonl_durable_root_v1.js";
import {
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_MAX_PREDECESSOR_BYTES_V1,
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1,
  materializeBuyVoidHistorySegmentedSuccessorLocatorV1,
  stageBuyVoidHistorySegmentedSuccessorV1,
} from "../src/economic/buy_void_history_segmented_successor_v1.js";

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function expectFailure(fn: () => unknown, token: string): void {
  let message = "";
  try {
    fn();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert.ok(
    message.includes(token),
    `expected ${token}, got ${message || "success"}`,
  );
}

function writePrivate(file: string, body: Buffer): void {
  fs.writeFileSync(file, body, { mode: 0o600, flag: "wx" });
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-history-successor-v1-"),
);
fs.chmodSync(tmp, 0o700);

try {
  const generationOneMaterialized =
    path.join(tmp, "generation-1-materialized.jsonl");
  const firstRecord = Buffer.from(
    JSON.stringify({
      schema: "void_buy_void_inventory_reservation_v1",
      marker: "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
      reservation_id: "1".repeat(64),
      payment_key_sha256: "2".repeat(64),
      void_amount_units: "100",
    }) + "\n",
    "utf8",
  );
  writePrivate(generationOneMaterialized, firstRecord);

  const generationOneStore =
    path.join(tmp, "generation-1-store");
  const manifestOne =
    buildSegmentedJsonlV1FromFile(
      generationOneMaterialized,
      generationOneStore,
      {
        segmentTargetBytes: 8 * 1024 * 1024,
        maxRecordBytes: 1024 * 1024,
        generation: 1,
        validateJson: true,
      },
    );
  const snapshotOne =
    deriveSegmentedJsonlSnapshotAuthorityV1(manifestOne);
  const checkpointOne =
    deriveSegmentedJsonlCheckpointV1(snapshotOne, null);
  const anchorOne =
    verifySegmentedJsonlCheckpointAnchorV1({
      checkpoint: checkpointOne,
      snapshot: snapshotOne,
      trusted_checkpoint_sha256:
        checkpointOne.checkpoint_sha256,
    });
  const materializedOne =
    deriveSegmentedJsonlMaterializedAuthorityV1(
      generationOneStore,
      generationOneMaterialized,
    );

  const liveDurableRoot =
    path.join(tmp, "live-durable-root");
  fs.mkdirSync(liveDurableRoot, { mode: 0o700 });
  const durableOne =
    publishSegmentedJsonlDurableRootV1(
      liveDurableRoot,
      {
        checkpoint: checkpointOne,
        snapshot: snapshotOne,
        materialized: materializedOne,
      },
    );
  assert.equal(durableOne.store_generation, 1);
  assert.equal(durableOne.previous_root_sha256, null);
  assert.equal(
    readSegmentedJsonlDurableRootV1(liveDurableRoot)?.root_sha256,
    durableOne.root_sha256,
  );

  const firstMaterializedBefore =
    fs.readFileSync(generationOneMaterialized);
  const firstStoreManifestBefore =
    fs.readFileSync(
      path.join(generationOneStore, "manifest.v1.json"),
    );

  const generations = path.join(tmp, "successor-generations");
  fs.mkdirSync(generations, { mode: 0o700 });

  const secondRecord = Buffer.from(
    JSON.stringify({
      schema: "void_buy_void_inventory_reservation_v1",
      marker: "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
      reservation_id: "3".repeat(64),
      payment_key_sha256: "4".repeat(64),
      void_amount_units: "25",
    }) + "\n",
    "utf8",
  );

  const staged =
    stageBuyVoidHistorySegmentedSuccessorV1({
      durable_root_directory: liveDurableRoot,
      current_store_root: generationOneStore,
      current_materialized_file:
        generationOneMaterialized,
      current_checkpoint_anchor: anchorOne,
      trusted_current_durable_root_sha256:
        durableOne.root_sha256,
      generation_parent: generations,
      record_bytes: secondRecord,
    });

  assert.equal(staged.status, "staged");
  assert.equal(staged.metadata.current_store_generation, 1);
  assert.equal(staged.metadata.next_store_generation, 2);
  assert.equal(
    staged.metadata.appended_record_offset,
    firstRecord.length,
  );
  assert.equal(
    staged.metadata.appended_record_bytes,
    secondRecord.length,
  );
  assert.equal(
    staged.metadata.appended_record_sha256,
    sha256(secondRecord),
  );
  assert.equal(staged.filesystem_mutation_performed, true);
  assert.equal(staged.durable_root_publish_performed, false);
  assert.equal(staged.carrier_root_mutation_performed, false);
  assert.equal(staged.runtime_activation_authorized, false);
  assert.equal(staged.apply_activation_authorized, false);
  assert.equal(staged.public_activation_authorized, false);
  assert.equal(staged.transaction_broadcast_performed, false);
  assert.equal(staged.chain2050_write_performed, false);
  assert.equal(staged.funds_movement_performed, false);

  assert.deepEqual(
    fs.readFileSync(generationOneMaterialized),
    firstMaterializedBefore,
  );
  assert.deepEqual(
    fs.readFileSync(path.join(generationOneStore, "manifest.v1.json")),
    firstStoreManifestBefore,
  );
  assert.equal(
    readSegmentedJsonlDurableRootV1(liveDurableRoot)?.root_sha256,
    durableOne.root_sha256,
    "staging must not publish durable root",
  );

  assert.equal(
    fs.statSync(staged.generation_root).mode & 0o777,
    0o700,
  );
  assert.equal(
    fs.statSync(staged.materialized_file).mode & 0o777,
    0o600,
  );
  assert.equal(
    fs.statSync(staged.metadata_file).mode & 0o777,
    0o400,
  );
  assert.equal(
    fs.readdirSync(generations)
      .filter((name) => name.startsWith(".stage-"))
      .length,
    0,
    "successful stage must have one atomic visible generation and no live temp",
  );

  const duplicate =
    stageBuyVoidHistorySegmentedSuccessorV1({
      durable_root_directory: liveDurableRoot,
      current_store_root: generationOneStore,
      current_materialized_file:
        generationOneMaterialized,
      current_checkpoint_anchor: anchorOne,
      trusted_current_durable_root_sha256:
        durableOne.root_sha256,
      generation_parent: generations,
      record_bytes: secondRecord,
    });
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.filesystem_mutation_performed, false);
  assert.equal(
    duplicate.metadata.stage_id,
    staged.metadata.stage_id,
  );

  expectFailure(
    () =>
      stageBuyVoidHistorySegmentedSuccessorV1({
        durable_root_directory: liveDurableRoot,
        current_store_root: generationOneStore,
        current_materialized_file:
          generationOneMaterialized,
        current_checkpoint_anchor: anchorOne,
        trusted_current_durable_root_sha256:
          durableOne.root_sha256,
        generation_parent: generations,
        record_bytes: Buffer.from('{"foreign":true}\n', "utf8"),
      }),
    "EXISTING_STAGE_INPUT_MISMATCH",
  );

  expectFailure(
    () =>
      stageBuyVoidHistorySegmentedSuccessorV1({
        durable_root_directory: liveDurableRoot,
        current_store_root: generationOneStore,
        current_materialized_file:
          generationOneMaterialized,
        current_checkpoint_anchor: anchorOne,
        trusted_current_durable_root_sha256:
          "f".repeat(64),
        generation_parent: generations,
        record_bytes: secondRecord,
      }),
    "CURRENT_DURABLE_ROOT_BINDING_INVALID",
  );

  expectFailure(
    () =>
      stageBuyVoidHistorySegmentedSuccessorV1({
        durable_root_directory: liveDurableRoot,
        current_store_root: generationOneStore,
        current_materialized_file:
          generationOneMaterialized,
        current_checkpoint_anchor: anchorOne,
        trusted_current_durable_root_sha256:
          durableOne.root_sha256,
        generation_parent: generations,
        record_bytes: Buffer.from('{"unterminated":true}', "utf8"),
      }),
    "RECORD_FRAMING_INVALID",
  );

  const durableTwo =
    publishSegmentedJsonlDurableRootV1(
      liveDurableRoot,
      staged.publish_input,
    );
  assert.equal(durableTwo.store_generation, 2);
  assert.equal(
    durableTwo.previous_root_sha256,
    durableOne.root_sha256,
  );
  assert.equal(
    durableTwo.append_only_witness_sha256,
    staged.metadata.append_only_witness.witness_sha256,
  );
  assert.equal(
    readSegmentedJsonlDurableRootV1(liveDurableRoot)?.root_sha256,
    durableTwo.root_sha256,
  );

  const locator =
    materializeBuyVoidHistorySegmentedSuccessorLocatorV1(
      staged,
      durableTwo,
    );
  assert.equal(
    locator.segmented_durable_root_sha256,
    durableTwo.root_sha256,
  );
  assert.equal(locator.byte_offset, String(firstRecord.length));
  assert.equal(locator.byte_length, secondRecord.length);
  assert.equal(locator.record_sha256, sha256(secondRecord));

  const verifiedSecondRecord =
    verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      liveDurableRoot,
      staged.store_root,
      staged.materialized_file,
      staged.metadata.next_materialized_authority,
      durableTwo.root_sha256,
      (reader) =>
        reader.read(
          Number(locator.byte_offset),
          locator.byte_length,
        ),
    );
  assert.deepEqual(verifiedSecondRecord, secondRecord);

  expectFailure(
    () =>
      materializeBuyVoidHistorySegmentedSuccessorLocatorV1(
        staged,
        {
          ...durableTwo,
          previous_root_sha256: "e".repeat(64),
        },
      ),
    "PUBLISHED_DURABLE_ROOT_STAGE_MISMATCH",
  );

  assert.equal(
    VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_MAX_PREDECESSOR_BYTES_V1,
    16 * 1024 * 1024,
  );

  for (const [key, expected] of Object.entries({
    source_only_producer: true,
    dedicated_successor_namespace_required: true,
    legacy_migration_namespace_mutation: false,
    exact_predecessor_durable_root_required: true,
    exact_predecessor_checkpoint_anchor_required: true,
    exact_predecessor_materialized_authority_required: true,
    predecessor_materialized_verified_at_use: true,
    predecessor_byte_ceiling: 16 * 1024 * 1024,
    one_record_append_per_generation: true,
    canonical_json_record_required: true,
    atomic_generation_visibility: true,
    completed_stage_replay_idempotent: true,
    append_only_witness_produced_at_use: true,
    durable_root_publish_input_materialized: true,
    durable_root_publish_performed: false,
    carrier_root_mutation: false,
    carrier_successor_publication: false,
    reservation_lifecycle_mount: false,
    paid_unreservable_obligation_lifecycle_mount: false,
    terminal_closeout_refresh_mount: false,
    runtime_activation_ready: false,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
    service_action: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
    automatic_retry: false,
  })) {
    assert.equal(
      (VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1 as any)[key],
      expected,
      key,
    );
  }

  const source = fs.readFileSync(
    "src/economic/buy_void_history_segmented_successor_v1.ts",
    "utf8",
  );
  for (const forbidden of [
    "eth_sendRawTransaction",
    "signTransaction(",
    "privateKey",
    "mnemonic",
    "systemctl",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "forbidden source token: " + forbidden,
    );
  }

  assert.equal(
    VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1,
    "VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1",
  );

  console.log(
    "VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1_PROOF_GREEN",
  );
  console.log("dedicated_live_namespace_proven=true");
  console.log("legacy_generation_one_unchanged=true");
  console.log("one_record_successor_generation_proven=true");
  console.log("predecessor_durable_root_verified=true");
  console.log("predecessor_materialized_verified_at_use=true");
  console.log("append_only_witness_produced=true");
  console.log("predecessor_byte_ceiling=16777216");
  console.log("atomic_generation_visibility=true");
  console.log("completed_stage_replay_idempotent=true");
  console.log("staging_does_not_publish_durable_root=true");
  console.log("explicit_durable_root_publish_proven=true");
  console.log("published_locator_exact_record_readback=true");
  console.log("carrier_root_mutation=false");
  console.log("carrier_successor_publication=false");
  console.log("lifecycle_mount=false");
  console.log("runtime_activation_ready=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
