#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCustodyQualificationV1,
  type BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_custody_qualification_v1.js";
import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical proof value");
}

const sha256Id = (value: string | Buffer): string =>
  "sha256:" + crypto.createHash("sha256").update(value).digest("hex");

const entropy = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const journalRootBase = Object.freeze({
  path: "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
  dev: "2050",
  ino: "100",
  uid: 994,
  gid: 981,
  mode: 0o700,
  mount_id: 33,
  major_minor: "8:2",
  fs_type: "ext4",
  mount_source: "/dev/sda2",
  mount_source_resolved: "/dev/sda2",
  mount_point: "/",
  parent_device: "/dev/sda",
  disk_serial: "2530E9C796D8",
  disk_wwn: "0x500a0751e9c796d8",
});

const highWaterRootBase = Object.freeze({
  path: "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
  dev: "66306",
  ino: "200",
  uid: 994,
  gid: 981,
  mode: 0o700,
  mount_id: 3936,
  major_minor: "259:2",
  fs_type: "ext4",
  mount_source: "/dev/nvme0n1p1",
  mount_source_resolved: "/dev/nvme0n1p1",
  mount_point: "/var/lib/void-allocation-custody-v1",
  parent_device: "/dev/nvme0n1",
  disk_serial: "25278B802787",
  disk_wwn: "eui.e8238fa6bf530001001b448b42e66c36",
});

function highWater(journal: string) {
  const result =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      journal,
    );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("high-water derive held");
  return result;
}

let inodeCounter = 1000;
function placementFor(
  journal: string,
  options: {
    journalRoot?: Record<string, any>;
    highWaterRoot?: Record<string, any>;
    dynamicSalt?: number;
  } = {},
) {
  const derived = highWater(journal);
  const journalBytes = Buffer.from(journal, "utf8");
  const highBytes = Buffer.from(derived.high_water_json, "utf8");
  const dynamicSalt = options.dynamicSalt ?? 0;
  const journalRoot = {
    ...journalRootBase,
    ino: String(Number(journalRootBase.ino) + dynamicSalt),
    mount_id: journalRootBase.mount_id + dynamicSalt,
    ...(options.journalRoot || {}),
  };
  const highWaterRoot = {
    ...highWaterRootBase,
    ino: String(Number(highWaterRootBase.ino) + dynamicSalt),
    mount_id: highWaterRootBase.mount_id + dynamicSalt,
    ...(options.highWaterRoot || {}),
  };
  inodeCounter += 10;
  const snapshot = {
    hostname: "zoso-Precision-Tower-7810",
    journal_root: journalRoot,
    high_water_root: highWaterRoot,
    journal_file: {
      path: journalRoot.path + "/live-read-replay-v1.jsonl",
      dev: journalRoot.dev,
      ino: String(inodeCounter),
      mtime_ns: String(1_800_000_000_000_000_000 + dynamicSalt),
      ctime_ns: String(1_800_000_000_000_000_100 + dynamicSalt),
      sha256: sha256Id(journalBytes),
      bytes: journalBytes.length,
      uid: journalRoot.uid,
      gid: journalRoot.gid,
      mode: 0o600,
      nlink: 1,
      regular_file: true,
      symlink: false,
    },
    high_water_file: {
      path: highWaterRoot.path + "/live-read-replay-high-water-v1.json",
      dev: highWaterRoot.dev,
      ino: String(inodeCounter + 1),
      mtime_ns: String(1_800_000_000_000_000_200 + dynamicSalt),
      ctime_ns: String(1_800_000_000_000_000_300 + dynamicSalt),
      sha256: sha256Id(highBytes),
      bytes: highBytes.length,
      uid: highWaterRoot.uid,
      gid: highWaterRoot.gid,
      mode: 0o600,
      nlink: 1,
      regular_file: true,
      symlink: false,
    },
    journal_jsonl: journalBytes,
    high_water_json: highBytes,
    journal_intent_present: false,
    high_water_intent_present: false,
  };
  const normalized = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1",
    version: 1,
    parent_writer_marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1",
    high_water_marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1",
    hostname: snapshot.hostname,
    journal_root: snapshot.journal_root,
    high_water_root: snapshot.high_water_root,
    journal_file: snapshot.journal_file,
    high_water_file: snapshot.high_water_file,
    high_water_sha256: derived.high_water_sha256,
    generation: derived.high_water.generation,
    sequence: derived.high_water.sequence,
    event_count: derived.high_water.event_count,
    pending: derived.high_water.pending,
    pending_challenge_sha256:
      derived.high_water.pending_challenge_sha256,
    pending_challenge_id:
      derived.high_water.pending_challenge_id,
    pending_expires_at_ms:
      derived.high_water.pending_expires_at_ms,
    last_terminal_state:
      derived.high_water.last_terminal_state,
    ready_for_issue:
      derived.high_water.ready_for_issue,
  });
  return Object.freeze({
    qualification_id:
      "voidwlrie1_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(normalized), "utf8")
        .digest("hex"),
    normalized,
    storage_domain_classification_green: true,
    live_storage_observation_proven: true,
    distinct_local_storage_domains_proven: true,
    distinct_parent_block_devices_proven: true,
    canonical_journal_high_water_binding_proven: true,
    no_pending_publication_intent_observed: true,
    double_census_stability_proven: true,
  });
}

function requireOk<T extends { ok: boolean; reason?: string }>(
  value: T,
): Extract<T, { ok: true }> {
  assert.equal(
    value.ok,
    true,
    value.ok ? undefined : value.reason,
  );
  if (!value.ok) throw new Error(value.reason || "held");
  return value as Extract<T, { ok: true }>;
}

function expectHeld(
  value: ReturnType<
    typeof classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCustodyQualificationV1
  >,
  reason: string | RegExp,
) {
  assert.equal(value.ok, false);
  if (value.ok) throw new Error("expected HOLD");
  if (typeof reason === "string") {
    assert.equal(value.reason, reason);
  } else {
    assert.match(value.reason, reason);
  }
}

function classify(
  journal: string,
  priorReceipt: unknown | null,
  placement: unknown = placementFor(journal),
) {
  const derived = highWater(journal);
  return classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCustodyQualificationV1({
    placement_evidence: placement,
    current_journal_jsonl: journal,
    current_high_water_json: derived.high_water_json,
    prior_receipt: priorReceipt,
  });
}

const journal0 = "";
const genesis = requireOk(classify(journal0, null));
assert.equal(genesis.status, "source_qualified");
assert.equal(genesis.custody_epoch, "0");
assert.equal(genesis.current_event_count, 0);
assert.equal(genesis.receipt.custody_epoch, "0");
assert.equal(genesis.receipt.previous_receipt_sha256, null);
assert.equal(genesis.receipt.journal_bytes, 0);
assert.equal(
  genesis.receipt.journal_sha256,
  sha256Id(Buffer.alloc(0)),
);
assert.equal(genesis.receipt.generation, 0);
assert.equal(genesis.receipt.sequence, 0);
assert.equal(genesis.receipt.event_count, 0);
assert.equal(genesis.receipt.pending, false);
assert.equal(genesis.receipt.ready_for_issue, true);
assert.equal(genesis.placement_external_trust_proven, false);
assert.equal(genesis.prior_receipt_external_trust_proven, false);
assert.equal(genesis.rollback_resistance_proven, false);
assert.equal(genesis.protected_high_water_custody_proven, false);
assert.equal(genesis.independent_custody_proven, false);
assert.equal(genesis.production_gate_ready, false);

const idempotent = requireOk(
  classify(journal0, genesis.receipt),
);
assert.equal(idempotent.status, "idempotent");
assert.deepEqual(idempotent.receipt, genesis.receipt);
assert.equal(
  idempotent.storage_policy_fingerprint_sha256,
  genesis.storage_policy_fingerprint_sha256,
);

const refreshed = requireOk(
  classify(
    journal0,
    genesis.receipt,
    placementFor(journal0, { dynamicSalt: 7 }),
  ),
);
assert.equal(refreshed.status, "idempotent");
assert.deepEqual(refreshed.receipt, genesis.receipt);
assert.notEqual(
  refreshed.placement_qualification_id,
  genesis.placement_qualification_id,
);
assert.equal(
  refreshed.storage_policy_fingerprint_sha256,
  genesis.storage_policy_fingerprint_sha256,
);
assert.notEqual(
  refreshed.qualification_id,
  genesis.qualification_id,
);

const issue1 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
    journal_jsonl: journal0,
    entropy_sha256: entropy("1"),
    issued_at_ms: 1_000,
    expires_at_ms: 39_000,
  });
assert.equal(issue1.ok, true);
if (!issue1.ok) throw new Error("issue1 held");
const journal1 = issue1.next_journal_jsonl;

const epoch1 = requireOk(
  classify(journal1, genesis.receipt),
);
assert.equal(epoch1.status, "source_qualified");
assert.equal(epoch1.custody_epoch, "1");
assert.equal(epoch1.receipt.custody_epoch, "1");
assert.equal(
  epoch1.receipt.previous_receipt_sha256,
  genesis.receipt.receipt_sha256,
);
assert.equal(epoch1.receipt.event_count, 1);
assert.equal(epoch1.receipt.sequence, 1);
assert.equal(epoch1.receipt.generation, 1);
assert.equal(epoch1.receipt.pending, true);
assert.equal(
  epoch1.receipt.pending_challenge_sha256,
  issue1.challenge_sha256,
);

const consume1 =
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeTerminalV1({
    journal_jsonl: journal1,
    outcome: "consumed",
    request_id: "voidwreq1_" + "a".repeat(64),
    response_sha256: entropy("b"),
    terminal_at_ms: 2_000,
  });
assert.equal(consume1.ok, true);
if (!consume1.ok) throw new Error("consume1 held");
const journal2 = consume1.next_journal_jsonl;

const epoch2 = requireOk(
  classify(journal2, epoch1.receipt),
);
assert.equal(epoch2.custody_epoch, "2");
assert.equal(epoch2.receipt.event_count, 2);
assert.equal(epoch2.receipt.sequence, 2);
assert.equal(epoch2.receipt.generation, 1);
assert.equal(epoch2.receipt.pending, false);
assert.equal(epoch2.receipt.last_terminal_state, "consumed");
assert.equal(
  epoch2.receipt.previous_receipt_sha256,
  epoch1.receipt.receipt_sha256,
);

expectHeld(
  classify(journal1, null),
  "witness_replay_custody_prior_receipt_required",
);

expectHeld(
  classify(journal2, genesis.receipt),
  "witness_replay_custody_multi_event_jump_forbidden",
);

{
  const stalePlacement = placementFor(journal0);
  const derived1 = highWater(journal1);
  const held =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCustodyQualificationV1({
      placement_evidence: stalePlacement,
      current_journal_jsonl: journal1,
      current_high_water_json: derived1.high_water_json,
      prior_receipt: genesis.receipt,
    });
  expectHeld(
    held,
    "witness_replay_custody_placement_current_state_mismatch",
  );
}

function rebuildReceipt(
  receipt: BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1,
  overrides: Partial<BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1>,
) {
  const next = {
    ...receipt,
    ...overrides,
  } as BuyVoidAllocationCustodyWitnessLiveReadReplayCustodyReceiptV1;
  const body = { ...next } as Record<string, unknown>;
  delete body.receipt_sha256;
  return Object.freeze({
    ...next,
    receipt_sha256: sha256Id(
      Buffer.from(canonicalJson(body), "utf8"),
    ),
  });
}

{
  const forgedGenesisPredecessor = rebuildReceipt(
    genesis.receipt,
    {
      previous_receipt_sha256: entropy("e"),
    },
  );
  expectHeld(
    classify(journal0, forgedGenesisPredecessor),
    "witness_replay_custody_receipt_chain_invalid",
  );
}

{
  const forgedMissingPredecessor = rebuildReceipt(
    epoch1.receipt,
    {
      previous_receipt_sha256: null,
    },
  );
  expectHeld(
    classify(journal1, forgedMissingPredecessor),
    "witness_replay_custody_receipt_chain_invalid",
  );
}

{
  const forged = rebuildReceipt(genesis.receipt, {
    journal_sha256: entropy("f"),
  });
  expectHeld(
    classify(journal1, forged),
    "witness_replay_custody_prior_journal_prefix_invalid",
  );
}

{
  const changedPlacement = placementFor(journal1, {
    highWaterRoot: {
      disk_serial: "DIFFERENT-DISK",
    },
  });
  expectHeld(
    classify(journal1, genesis.receipt, changedPlacement),
    "witness_replay_custody_prior_receipt_policy_mismatch",
  );
}

{
  const badPlacement = structuredClone(
    placementFor(journal0),
  ) as Record<string, unknown>;
  badPlacement.qualification_id =
    "voidwlrie1_" + "f".repeat(64);
  expectHeld(
    classify(journal0, null, badPlacement),
    "witness_replay_custody_placement_qualification_id_invalid",
  );
}

{
  const forged = structuredClone(
    placementFor(journal0),
  ) as Record<string, any>;
  forged.normalized.high_water_root.parent_device =
    forged.normalized.journal_root.parent_device;
  forged.normalized.high_water_root.disk_serial =
    forged.normalized.journal_root.disk_serial;
  forged.normalized.high_water_root.disk_wwn =
    forged.normalized.journal_root.disk_wwn;
  forged.qualification_id =
    "voidwlrie1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(forged.normalized), "utf8")
      .digest("hex");
  expectHeld(
    classify(journal0, null, forged),
    "witness_replay_custody_placement_storage_not_distinct",
  );
}

{
  const inconsistent = rebuildReceipt(genesis.receipt, {
    generation: 7,
  });
  expectHeld(
    classify(journal0, inconsistent),
    "witness_replay_custody_prior_receipt_state_mismatch",
  );
}

{
  const corrupted = {
    ...genesis.receipt,
    receipt_sha256: entropy("f"),
  };
  expectHeld(
    classify(journal1, corrupted),
    "witness_replay_custody_receipt_digest_invalid",
  );
}

for (const key of [
  "source_only_contract",
  "canonical_replay_writer_required",
  "canonical_replay_high_water_required",
  "live_placement_evidence_input_required",
  "placement_qualification_id_recomputed",
  "placement_current_state_binding_required",
  "storage_policy_fingerprint_bound",
  "exact_prior_journal_prefix_required",
  "canonical_single_event_advance_required",
  "content_addressed_custody_receipt",
  "canonical_genesis_without_prior_receipt_only",
  "prior_receipt_required_after_genesis",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

for (const key of [
  "io_performed",
  "verification_clock_authority_proven",
  "evidence_generation_monotonicity_proven",
  "placement_external_trust_proven",
  "prior_receipt_external_trust_proven",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "trusted_verification_clock_proven",
  "challenge_entropy_proven",
  "challenge_unpredictability_proven",
  "live_evidence_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

assert.equal(
  genesis.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1,
);
assert.equal(
  genesis.receipt.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_RECEIPT_V1,
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_CUSTODY_QUALIFICATION_V1_GREEN",
);
console.log("genesis_receipt_epoch_zero=true");
console.log("placement_qualification_id_recomputed=true");
console.log("fabricated_same_disk_placement_rejected=true");
console.log("placement_current_state_binding=true");
console.log("storage_policy_fingerprint_bound=true");
console.log("evidence_refresh_does_not_advance_custody_epoch=true");
console.log("exact_prior_journal_prefix_required=true");
console.log("canonical_single_event_advance_required=true");
console.log("multi_event_jump_forbidden=true");
console.log("stale_placement_rejected=true");
console.log("storage_policy_drift_rejected=true");
console.log("receipt_self_hash_required=true");
console.log("receipt_genesis_predecessor_absent_required=true");
console.log("receipt_non_genesis_predecessor_required=true");
console.log("receipt_high_water_state_consistency_required=true");
console.log("placement_external_trust_proven=false");
console.log("prior_receipt_external_trust_proven=false");
console.log("rollback_resistance_proven=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");