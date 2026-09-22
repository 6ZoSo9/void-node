import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
  deriveBuyVoidHistoryCarrierTxIntentV1,
  type BuyVoidHistoryCarrierRootV1,
  type BuyVoidHistoryCarrierTxIntentV1,
} from "../src/economic/buy_void_history_carrier_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_AUTHORITY_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_PAGE_SHA256_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_ROOT_SHA256_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1,
  initializeBuyVoidHistoryCarrierRootAuthorityForProofV1,
  initializeBuyVoidProductionHistoryCarrierRootAuthorityV1,
  projectBuyVoidPaymentHistoryTerminalFromCarrierAuthorityV1,
  publishBuyVoidHistoryCarrierAuthorityPageV1,
  publishBuyVoidHistoryCarrierRootSuccessorV1,
  readBuyVoidHistoryCarrierRootAuthorityPageV1,
  readBuyVoidHistoryCarrierRootAuthoritySnapshotV1,
} from "../src/economic/buy_void_history_carrier_root_authority_v1.js";

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const ATTESTATION = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/buy-void-production-history-carrier-attestation-v1.json",
    ),
    "utf8",
  ),
);
const SOURCE = fs.readFileSync(
  path.join(
    ROOT,
    "src/economic/buy_void_history_carrier_root_authority_v1.ts",
  ),
  "utf8",
);

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    assert.ok(Number.isSafeInteger(value));
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  assert.ok(value && typeof value === "object");
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          canonicalJson(record[key]),
      )
      .join(",") +
    "}"
  );
}

function rootWithDigest(
  core: Omit<BuyVoidHistoryCarrierRootV1, "carrier_root_sha256">,
): BuyVoidHistoryCarrierRootV1 {
  return {
    ...core,
    carrier_root_sha256:
      sha256(canonicalJson(core)),
  };
}

function makeFixture() {
  const page1 = Buffer.from(
    "VOID_BUY_VOID_CARRIER_AUTHORITY_PROOF_PAGE_1\n",
    "utf8",
  );
  const page1Sha = sha256(page1);
  const durable = sha256("proof-durable-root-v1");
  const payment = sha256("proof-payment-key-v1");
  const history1 = sha256("proof-history-v1");
  const root1 = rootWithDigest({
    v: 1,
    format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
    carrier_generation: 1,
    previous_carrier_root_sha256: null,
    pool_id: "proof-pool-v1",
    active_segmented_durable_root_sha256: durable,
    active_segmented_store_generation: 1,
    payment_history_fingerprint_sha256: history1,
    payment_index_root_sha256: page1Sha,
    committed_void_units: "10",
    reservation_count: "1",
    obligation_count: "0",
    committing_record_kind: "reservation",
    committing_payment_key_sha256: payment,
    committing_record_void_units: "10",
  });
  const locator = {
    segmented_durable_root_sha256: durable,
    segment_id: 4294967295,
    segment_sha256: sha256("proof-segment-v1"),
    byte_offset: "0",
    byte_length: 32,
    record_sha256: sha256("proof-record-v1"),
  };
  const intent1 =
    deriveBuyVoidHistoryCarrierTxIntentV1({
      predecessor_carrier_root_sha256: null,
      pool_id: root1.pool_id,
      committing_record_kind:
        root1.committing_record_kind,
      committing_payment_key_sha256: payment,
      committing_record_locator: locator,
      expected_segmented_durable_root_sha256:
        durable,
      expected_segmented_store_generation: 1,
      expected_payment_history_fingerprint_sha256:
        history1,
      expected_index_root_sha256:
        page1Sha,
      expected_committed_void_units: "10",
      expected_reservation_count: "1",
      expected_obligation_count: "0",
      expected_carrier_root_sha256:
        root1.carrier_root_sha256,
      new_page_digests: [page1Sha],
    });

  const page2 = Buffer.from(
    "VOID_BUY_VOID_CARRIER_AUTHORITY_PROOF_PAGE_2\n",
    "utf8",
  );
  const page2Sha = sha256(page2);
  const history2 = sha256("proof-history-v2");
  const root2 = rootWithDigest({
    v: 1,
    format: VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
    carrier_generation: 2,
    previous_carrier_root_sha256:
      root1.carrier_root_sha256,
    pool_id: root1.pool_id,
    active_segmented_durable_root_sha256: durable,
    active_segmented_store_generation: 1,
    payment_history_fingerprint_sha256: history2,
    payment_index_root_sha256: page2Sha,
    committed_void_units: "10",
    reservation_count: "1",
    obligation_count: "0",
    committing_record_kind: "history_refresh",
    committing_payment_key_sha256: payment,
    committing_record_void_units: "0",
  });
  const intent2 =
    deriveBuyVoidHistoryCarrierTxIntentV1({
      predecessor_carrier_root_sha256:
        root1.carrier_root_sha256,
      pool_id: root2.pool_id,
      committing_record_kind:
        root2.committing_record_kind,
      committing_payment_key_sha256: payment,
      committing_record_locator: locator,
      expected_segmented_durable_root_sha256:
        durable,
      expected_segmented_store_generation: 1,
      expected_payment_history_fingerprint_sha256:
        history2,
      expected_index_root_sha256:
        page2Sha,
      expected_committed_void_units: "10",
      expected_reservation_count: "1",
      expected_obligation_count: "0",
      expected_carrier_root_sha256:
        root2.carrier_root_sha256,
      new_page_digests: [page2Sha],
    });

  return {
    page1,
    page1Sha,
    root1,
    intent1,
    page2,
    page2Sha,
    root2,
    intent2,
  };
}

function expectThrow(
  fn: () => unknown,
  pattern: RegExp,
): void {
  assert.throws(fn, pattern);
}

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-carrier-authority-v1-"),
);
fs.chmodSync(tmp, 0o700);

try {
  assert.equal(
    ATTESTATION.marker,
    "VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_ATTESTATION_V1",
  );
  assert.equal(
    ATTESTATION.carrier.carrier_root.carrier_root_sha256,
    VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_ROOT_SHA256_V1,
  );
  assert.deepEqual(
    ATTESTATION.carrier.tx_intent.new_page_digests,
    [
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_PAGE_SHA256_V1,
    ],
  );

  const productionRoot =
    path.join(tmp, "production-authority");
  const productionSnapshot =
    initializeBuyVoidProductionHistoryCarrierRootAuthorityV1({
      authority_root: productionRoot,
      genesis_root:
        ATTESTATION.carrier.carrier_root as
          BuyVoidHistoryCarrierRootV1,
      genesis_tx_intent:
        ATTESTATION.carrier.tx_intent as
          BuyVoidHistoryCarrierTxIntentV1,
    });
  assert.equal(productionSnapshot.mode, "production");
  assert.equal(
    productionSnapshot.current_carrier_root_sha256,
    VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_ROOT_SHA256_V1,
  );
  assert.equal(
    productionSnapshot.carrier_generation,
    1,
  );
  assert.equal(
    productionSnapshot.page_publication_complete,
    false,
  );
  assert.deepEqual(
    productionSnapshot.missing_page_digests,
    [
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_PAGE_SHA256_V1,
    ],
  );

  expectThrow(
    () =>
      publishBuyVoidHistoryCarrierAuthorityPageV1({
        authority_root: productionRoot,
        page: {
          sha256:
            VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_PAGE_SHA256_V1,
          bytes: Buffer.from("not-the-accepted-page", "utf8"),
        },
      }),
    /PAGE_DIGEST_MISMATCH/,
  );

  const fixture = makeFixture();
  const proofRoot = path.join(tmp, "proof-authority");
  const initial =
    initializeBuyVoidHistoryCarrierRootAuthorityForProofV1({
      authority_root: proofRoot,
      genesis_root: fixture.root1,
      genesis_tx_intent: fixture.intent1,
      genesis_pages: [
        {
          sha256: fixture.page1Sha,
          bytes: fixture.page1,
        },
      ],
    });
  assert.equal(initial.mode, "proof_only");
  assert.equal(initial.carrier_generation, 1);
  assert.equal(initial.page_publication_complete, true);
  assert.deepEqual(
    readBuyVoidHistoryCarrierRootAuthorityPageV1({
      authority_root: proofRoot,
      sha256: fixture.page1Sha,
    }),
    fixture.page1,
  );

  const orphan = Buffer.from(
    "VOID_BUY_VOID_CARRIER_AUTHORITY_ORPHAN_PAGE\n",
    "utf8",
  );
  const orphanSha = sha256(orphan);
  assert.equal(
    publishBuyVoidHistoryCarrierAuthorityPageV1({
      authority_root: proofRoot,
      page: {
        sha256: orphanSha,
        bytes: orphan,
      },
    }).created,
    true,
  );
  const afterOrphan =
    readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
      authority_root: proofRoot,
    });
  assert.equal(
    afterOrphan.current_carrier_root_sha256,
    fixture.root1.carrier_root_sha256,
  );
  assert.equal(
    afterOrphan.verified_generation_count,
    1,
  );

  const created =
    publishBuyVoidHistoryCarrierRootSuccessorV1({
      authority_root: proofRoot,
      expected_current_carrier_root_sha256:
        fixture.root1.carrier_root_sha256,
      next_root: fixture.root2,
      tx_intent: fixture.intent2,
      new_pages: [
        {
          sha256: fixture.page2Sha,
          bytes: fixture.page2,
        },
      ],
    });
  assert.equal(created.status, "created");
  assert.equal(created.mutation_performed, true);
  assert.equal(created.snapshot.carrier_generation, 2);
  assert.equal(
    created.snapshot.current_carrier_root_sha256,
    fixture.root2.carrier_root_sha256,
  );
  assert.equal(
    created.snapshot.page_publication_complete,
    true,
  );

  const duplicate =
    publishBuyVoidHistoryCarrierRootSuccessorV1({
      authority_root: proofRoot,
      expected_current_carrier_root_sha256:
        fixture.root1.carrier_root_sha256,
      next_root: fixture.root2,
      tx_intent: fixture.intent2,
      new_pages: [
        {
          sha256: fixture.page2Sha,
          bytes: fixture.page2,
        },
      ],
    });
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.mutation_performed, false);
  assert.equal(
    duplicate.generation_record_id,
    created.generation_record_id,
  );

  const recovered =
    readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
      authority_root: proofRoot,
    });
  assert.equal(recovered.carrier_generation, 2);
  assert.equal(
    recovered.current_carrier_root_sha256,
    fixture.root2.carrier_root_sha256,
  );
  assert.equal(recovered.page_publication_complete, true);

  const unresolvedRoot =
    path.join(tmp, "unresolved-authority");
  initializeBuyVoidHistoryCarrierRootAuthorityForProofV1({
    authority_root: unresolvedRoot,
    genesis_root: fixture.root1,
    genesis_tx_intent: fixture.intent1,
    genesis_pages: [],
  });
  expectThrow(
    () =>
      publishBuyVoidHistoryCarrierRootSuccessorV1({
        authority_root: unresolvedRoot,
        expected_current_carrier_root_sha256:
          fixture.root1.carrier_root_sha256,
        next_root: fixture.root2,
        tx_intent: fixture.intent2,
        new_pages: [
          {
            sha256: fixture.page2Sha,
            bytes: fixture.page2,
          },
        ],
      }),
    /PREDECESSOR_PAGE_PUBLICATION_UNRESOLVED/,
  );

  expectThrow(
    () =>
      publishBuyVoidHistoryCarrierRootSuccessorV1({
        authority_root: proofRoot,
        expected_current_carrier_root_sha256:
          fixture.root2.carrier_root_sha256,
        next_root: fixture.root1,
        tx_intent: fixture.intent1,
        new_pages: [
          {
            sha256: fixture.page1Sha,
            bytes: fixture.page1,
          },
        ],
      }),
    /CARRIER_GENERATION_MISMATCH/,
  );

  const alternatePage = Buffer.from(
    "VOID_BUY_VOID_CARRIER_AUTHORITY_ALTERNATE_PAGE_2\n",
    "utf8",
  );
  const alternatePageSha = sha256(alternatePage);
  const {
    carrier_root_sha256: _root2Digest,
    ...root2Core
  } = fixture.root2;
  void _root2Digest;
  const alternateRoot = rootWithDigest({
    ...root2Core,
    payment_history_fingerprint_sha256:
      sha256("proof-history-v2-alternate"),
    payment_index_root_sha256:
      alternatePageSha,
  });
  const alternateIntent =
    deriveBuyVoidHistoryCarrierTxIntentV1({
      predecessor_carrier_root_sha256:
        fixture.root1.carrier_root_sha256,
      pool_id: alternateRoot.pool_id,
      committing_record_kind:
        alternateRoot.committing_record_kind,
      committing_payment_key_sha256:
        alternateRoot.committing_payment_key_sha256,
      committing_record_locator:
        fixture.intent2.committing_record_locator,
      expected_segmented_durable_root_sha256:
        alternateRoot.active_segmented_durable_root_sha256,
      expected_segmented_store_generation:
        alternateRoot.active_segmented_store_generation,
      expected_payment_history_fingerprint_sha256:
        alternateRoot.payment_history_fingerprint_sha256,
      expected_index_root_sha256:
        alternateRoot.payment_index_root_sha256,
      expected_committed_void_units:
        alternateRoot.committed_void_units,
      expected_reservation_count:
        alternateRoot.reservation_count,
      expected_obligation_count:
        alternateRoot.obligation_count,
      expected_carrier_root_sha256:
        alternateRoot.carrier_root_sha256,
      new_page_digests: [alternatePageSha],
    });
  expectThrow(
    () =>
      publishBuyVoidHistoryCarrierRootSuccessorV1({
        authority_root: proofRoot,
        expected_current_carrier_root_sha256:
          fixture.root1.carrier_root_sha256,
        next_root: alternateRoot,
        tx_intent: alternateIntent,
        new_pages: [
          {
            sha256: alternatePageSha,
            bytes: alternatePage,
          },
        ],
      }),
    /CURRENT_ROOT_CHANGED/,
  );

  const tamperRoot =
    path.join(tmp, "tamper-authority");
  fs.cpSync(proofRoot, tamperRoot, {
    recursive: true,
  });
  fs.appendFileSync(
    path.join(
      tamperRoot,
      "generations",
      "0000000002.json",
    ),
    "foreign",
  );
  expectThrow(
    () =>
      readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
        authority_root: tamperRoot,
      }),
    /GENERATION_RECORD_INVALID/,
  );

  await assert.rejects(
    () =>
      projectBuyVoidPaymentHistoryTerminalFromCarrierAuthorityV1({
        authority_root: proofRoot,
        root_dir: proofRoot,
        request_dir: proofRoot,
        pool_id: "proof-pool-v1",
        payment_key_sha256:
          sha256("proof-payment-key-v1"),
      }),
    /PROOF_AUTHORITY_HAS_NO_TERMINAL_MOUNT_AUTHORITY/,
  );

  for (const [key, expected] of Object.entries({
    accepted_production_genesis_pinned: true,
    accepted_production_attestation_pinned: true,
    proof_only_generic_initializer_mount_authority: false,
    immutable_content_addressed_root_objects: true,
    immutable_content_addressed_page_objects: true,
    create_only_generation_slots: true,
    generation_slot_is_atomic_authority_cutover: true,
    mutable_current_pointer_required: false,
    verified_successor_transition_required: true,
    verified_tx_intent_binding_required: true,
    rollback_rejected: true,
    same_generation_alternate_root_rejected: true,
    unresolved_page_publication_rejected_before_successor: true,
    bounded_restart_recovery_scan: true,
    terminal_projection_uses_server_snapshot_not_caller_root: true,
    duplicate_successor_idempotent: true,
    concurrent_successor_generation_slot_deterministic: true,
    systemd_environment_rotation_required: false,
    service_restart_per_successor_required: false,
    runtime_integration: false,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
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
      (VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_AUTHORITY_V1 as any)[key],
      expected,
      key,
    );
  }

  for (const forbidden of [
    "sendTransaction(",
    "broadcastTransaction(",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "LoadCredential=",
    "systemctl",
    "process.env",
  ]) {
    assert.equal(
      SOURCE.includes(forbidden),
      false,
      forbidden,
    );
  }

  console.log(
    "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1_PROOF_GREEN",
  );
  console.log("production_genesis_exact=true");
  console.log("production_genesis_page_unresolved_fail_closed=true");
  console.log("content_addressed_pages=true");
  console.log("content_addressed_roots=true");
  console.log("generation_slots_create_only=true");
  console.log("mutable_current_pointer=false");
  console.log("successor_binding_verified=true");
  console.log("stale_predecessor_rejected=true");
  console.log("rollback_rejected=true");
  console.log("unresolved_page_publication_rejected=true");
  console.log("restart_recovery_deterministic=true");
  console.log("proof_authority_terminal_mount_rejected=true");
  console.log("runtime_enablement=false");
  console.log("apply_enablement=false");
  console.log("public_activation=false");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_broadcast=false");
  console.log("chain2050_write=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(tmp, {
    recursive: true,
    force: true,
  });
}
