#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_DIRECTORY_ENTRIES_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_RECORD_BYTES_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1,
  observeBuyVoidProductionHistoryCarrierCensusFromRootV1,
} from "../src/economic/buy_void_production_history_carrier_census_v1.js";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function privateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function privateFile(file: string, bytes: string): void {
  privateDirectory(path.dirname(file));
  fs.writeFileSync(file, bytes, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-production-history-census-v1-"),
);
fs.chmodSync(tmp, 0o700);

try {
  const runtimeRoot = path.join(tmp, "runtime");
  privateDirectory(runtimeRoot);

  const empty =
    observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
      runtime_root: runtimeRoot,
      pool_id:
        VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
    });
  assert.equal(
    empty.marker,
    VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1,
  );
  assert.equal(empty.version, 1);
  assert.equal(empty.history_state, "empty");
  assert.equal(empty.carrier_root_sha256, null);
  assert.equal(empty.total_history_entries, 0);
  assert.equal(empty.file_content_read_performed, false);
  assert.equal(empty.mutation_performed, false);
  assert.equal(empty.directories.length, 7);
  for (const directory of empty.directories) {
    assert.equal(directory.entry_count, 0, directory.label);
    assert.equal(directory.entry_set_sha256, sha256(""));
  }

  const expectedPoolKey = sha256(
    "void-buy-inventory-pool-v1\n" +
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
  );
  assert.equal(empty.pool_key_sha256, expectedPoolKey);

  const paymentPath = path.join(
    runtimeRoot,
    "buy-void-auto-fulfillment-v1",
    "payments",
    "a".repeat(64) + ".json",
  );
  privateFile(paymentPath, "this is intentionally not json\n");
  const nonEmpty =
    observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
      runtime_root: runtimeRoot,
      pool_id:
        VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
    });
  assert.equal(
    nonEmpty.history_state,
    "materialization_required",
  );
  assert.equal(nonEmpty.carrier_root_sha256, null);
  assert.equal(nonEmpty.total_history_entries, 1);
  assert.equal(
    nonEmpty.directories.find(
      (directory) => directory.label === "PAYMENTS",
    )?.entry_count,
    1,
  );
  assert.equal(nonEmpty.file_content_read_performed, false);
  fs.unlinkSync(paymentPath);

  privateFile(
    path.join(
      runtimeRoot,
      "buy-void-auto-fulfillment-v1",
      "payments",
      "not-a-payment.json",
    ),
    "{}\n",
  );
  assert.throws(
    () =>
      observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
        runtime_root: runtimeRoot,
        pool_id:
          VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
      }),
    /PAYMENTS_ENTRY_INVALID/u,
  );
  fs.rmSync(
    path.join(
      runtimeRoot,
      "buy-void-auto-fulfillment-v1",
    ),
    { recursive: true, force: true },
  );

  const outside = path.join(tmp, "outside");
  privateDirectory(outside);
  const journalRoot = path.join(
    runtimeRoot,
    "buy-void-auto-fulfillment-v1",
  );
  privateDirectory(journalRoot);
  fs.symlinkSync(
    outside,
    path.join(journalRoot, "payments"),
  );
  assert.throws(
    () =>
      observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
        runtime_root: runtimeRoot,
        pool_id:
          VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
      }),
    /PAYMENTS_SYMLINK_COMPONENT_FORBIDDEN/u,
  );
  fs.rmSync(journalRoot, { recursive: true, force: true });

  assert.throws(
    () =>
      observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
        runtime_root: runtimeRoot,
        pool_id: "../wrong",
      }),
    /POOL_ID_INVALID/u,
  );

  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/economic/buy_void_production_history_carrier_census_v1.ts",
    ),
    "utf8",
  );
  for (const forbidden of [
    "readFileSync(",
    "readFile(",
    "openSync(",
    "writeFileSync(",
    "appendFileSync(",
    "renameSync(",
    "linkSync(",
    "unlinkSync(",
    "mkdirSync(",
    "chmodSync(",
    "rmSync(",
  ]) {
    assert.equal(
      source.includes(forbidden),
      false,
      "source content/mutation primitive forbidden: " + forbidden,
    );
  }
  assert.equal(source.includes("opendirSync("), true);
  assert.equal(source.includes("lstatSync("), true);

  assert.equal(
    VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
    "/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1",
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_DIRECTORY_ENTRIES_V1,
    4096,
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_RECORD_BYTES_V1,
    1024 * 1024,
  );

  const expectedAuthority = {
    source_only_observer: true,
    designated_host_metadata_observation: true,
    canonical_runtime_root_fixed: true,
    canonical_pool_id_fixed: true,
    file_content_read: false,
    credential_content_read: false,
    wallet_access: false,
    signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    history_mutation: false,
    carrier_page_publication: false,
    carrier_root_mutation: false,
    service_action: false,
    inventory_mutation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
  };
  assert.deepEqual(
    VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_AUTHORITY_V1,
    expectedAuthority,
  );

  console.log(
    "VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_V1_PROOF_GREEN",
  );
  console.log("empty_history_attestation_supported=true");
  console.log("nonempty_history_requires_materialization=true");
  console.log("record_content_read=false");
  console.log("canonical_runtime_root_fixed=true");
  console.log("carrier_root_invented=false");
  console.log("filesystem_mutation=false");
  console.log("credential_content_read=false");
  console.log("wallet_or_signer_access=false");
  console.log("rpc_call=false");
  console.log("transaction_broadcast=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
