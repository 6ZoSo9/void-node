#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1,
  readBuyVoidHistoryCarrierRuntimeBindingV1,
  validateBuyVoidHistoryCarrierRuntimeSnapshotV1,
} from "../src/economic/buy_void_history_carrier_runtime_binding_v1.js";

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-carrier-runtime-binding-v1-"),
);
fs.chmodSync(tmp, 0o700);

try {
  const missing =
    readBuyVoidHistoryCarrierRuntimeBindingV1({});
  assert.equal(missing.configured, false);
  assert.equal(
    missing.reason,
    "history_carrier_runtime_authority_root_not_configured",
  );
  assert.deepEqual(
    missing.missing_envs,
    [
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
    ],
  );

  const invalid =
    readBuyVoidHistoryCarrierRuntimeBindingV1({
      [VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1]:
        "relative/path",
    });
  assert.equal(invalid.configured, false);
  assert.equal(
    invalid.reason,
    "history_carrier_runtime_authority_root_invalid",
  );

  const absentRoot = path.join(tmp, "absent-authority");
  const absent =
    readBuyVoidHistoryCarrierRuntimeBindingV1({
      [VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1]:
        absentRoot,
    });
  assert.equal(absent.configured, false);
  assert.equal(
    absent.reason,
    "history_carrier_runtime_authority_snapshot_read_failed",
  );

  const authorityRoot = path.join(tmp, "authority");
  fs.mkdirSync(authorityRoot, { mode: 0o700 });
  fs.chmodSync(authorityRoot, 0o700);

  const baseSnapshot: any = {
    marker: "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1",
    version: 1,
    mode: "production",
    authority_id: "a".repeat(64),
    pool_id: VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1,
    carrier_generation: 2,
    current_carrier_root_sha256: "b".repeat(64),
    current_payment_index_root_sha256: "c".repeat(64),
    current_generation_record_id: "d".repeat(64),
    current_root: {
      carrier_generation: 2,
      carrier_root_sha256: "b".repeat(64),
      payment_index_root_sha256: "c".repeat(64),
    },
    page_publication_complete: true,
    missing_page_digests: [],
    verified_generation_count: 2,
    verified_page_reference_count: 2,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
  };

  const proofOnly =
    validateBuyVoidHistoryCarrierRuntimeSnapshotV1(
      authorityRoot,
      {
        ...baseSnapshot,
        mode: "proof_only",
      },
    );
  assert.equal(proofOnly.configured, false);
  assert.equal(
    proofOnly.reason,
    "history_carrier_runtime_authority_snapshot_invalid",
  );

  const unresolvedPages =
    validateBuyVoidHistoryCarrierRuntimeSnapshotV1(
      authorityRoot,
      {
        ...baseSnapshot,
        page_publication_complete: false,
        missing_page_digests: ["e".repeat(64)],
      },
    );
  assert.equal(unresolvedPages.configured, false);
  assert.equal(
    unresolvedPages.reason,
    "history_carrier_runtime_authority_snapshot_invalid",
  );

  const positive =
    validateBuyVoidHistoryCarrierRuntimeSnapshotV1(
      authorityRoot,
      baseSnapshot,
    );
  assert.equal(positive.marker,
    VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1);
  assert.equal(positive.configured, true);
  if (positive.configured !== true) {
    throw new Error(
      "expected configured history carrier runtime snapshot",
    );
  }
  assert.equal(positive.authority_root, authorityRoot);
  assert.match(
    positive.authority_root_realpath_sha256,
    /^[0-9a-f]{64}$/u,
  );
  assert.equal(positive.authority_id, "a".repeat(64));
  assert.equal(
    positive.pool_id,
    VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1,
  );
  assert.equal(positive.carrier_generation, 2);
  assert.equal(
    positive.current_carrier_root_sha256,
    "b".repeat(64),
  );
  assert.equal(
    positive.current_payment_index_root_sha256,
    "c".repeat(64),
  );
  assert.equal(
    positive.current_generation_record_id,
    "d".repeat(64),
  );
  assert.equal(positive.page_publication_complete, true);
  assert.equal(positive.missing_page_count, 0);
  assert.equal(positive.successor_publication_mounted, true);
  assert.equal(positive.runtime_activation_ready, true);
  assert.equal(positive.filesystem_write_performed, false);
  assert.equal(positive.runtime_activation_authorized, false);
  assert.equal(positive.apply_activation_authorized, false);
  assert.equal(positive.public_activation_authorized, false);

  for (const [key, expected] of Object.entries({
    server_owned_authority_root: true,
    production_authority_required: true,
    exact_pool_required: true,
    page_publication_complete_required: true,
    missing_pages_rejected: true,
    bounded_read_only_snapshot: true,
    current_root_from_durable_authority: true,
    current_generation_from_durable_authority: true,
    systemd_root_rotation_required: false,
    service_restart_per_successor_required: false,
    successor_publication_mounted: true,
    runtime_activation_ready: true,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
    filesystem_write: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
  })) {
    assert.equal(
      (VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1 as any)[key],
      expected,
      key,
    );
  }

  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/economic/buy_void_history_carrier_runtime_binding_v1.ts",
    ),
    "utf8",
  );
  for (const forbidden of [
    "writeFileSync(",
    "appendFileSync(",
    "renameSync(",
    "linkSync(",
    "unlinkSync(",
    "rmSync(",
    "mkdirSync(",
    "systemctl",
    "eth_sendRawTransaction",
    "signTransaction(",
    "privateKey",
    "mnemonic",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  const dropin = fs.readFileSync(
    path.join(
      process.cwd(),
      "ops/systemd/void-node-live.service.d/95-buy-void-history-carrier-runtime-binding-v1.conf.example",
    ),
    "utf8",
  );
  const environmentLines = dropin
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("Environment="));
  assert.deepEqual(
    environmentLines,
    [
      "Environment=VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_ROOT=/home/zoso/.local/state/void-buy-void-history-carrier-root-authority-v1",
    ],
  );
  for (const forbidden of [
    "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=",
    "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=",
    "Environment=VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=",
    "LoadCredential=",
    "ExecStart=",
    "ExecStartPre=",
    "ExecStartPost=",
  ]) {
    assert.equal(
      dropin.includes(forbidden),
      false,
      "carrier binding drop-in contains forbidden directive: " + forbidden,
    );
  }

  console.log(
    "VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1_PROOF_GREEN",
  );
  console.log("server_owned_authority_root=true");
  console.log("production_authority_required=true");
  console.log("page_publication_complete_required=true");
  console.log("runtime_binding_snapshot_read_only=true");
  console.log("designated_host_dropin_exact=true");
  console.log("designated_host_dropin_changes_enable_flags=false");
  console.log("successor_publication_mounted=true");
  console.log("runtime_activation_ready=true");
  console.log("systemd_root_rotation_required=false");
  console.log("service_restart_per_successor_required=false");
  console.log("filesystem_write=false");
  console.log("wallet_or_signer_access=false");
  console.log("rpc_call=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
