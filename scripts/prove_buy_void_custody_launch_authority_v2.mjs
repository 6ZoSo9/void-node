#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { Wallet } from "ethers";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
  buyLaunchLiveActivationReceiptIdV1,
  buyLaunchLiveActivationTypedDataV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

import {
  VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2,
  VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2_POLICY,
  buildBuyVoidCustodyLaunchHighWaterV2,
  classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2,
  testOnlyBuildGenerationJournalEventV2,
  testOnlyClassifyBuyVoidCustodyLaunchAuthorityV2,
} from "../src/economic/buy_void_custody_launch_authority_v2.mjs";

const SOURCE =
  "src/economic/buy_void_custody_launch_authority_v2.mjs";
const EXPECTED_SOURCE_BLOB =
  "223ebdb8317009228094b8ebecef19dc37d87a91";

function gitBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

const sourceBytes = fs.readFileSync(SOURCE);
assert.equal(
  gitBlob(sourceBytes),
  EXPECTED_SOURCE_BLOB,
  "exact custody launch classifier source drift",
);
const source = sourceBytes.toString("utf8");
assert.equal(source.includes('from "node:fs"'), false,
  "classifier must remain filesystem-I/O free");
assert.equal(source.includes("userInfo"), false,
  "classifier must not derive authority from OS-account home");
assert.equal(source.includes("buyLaunchGenerationExternalAnchorPathV1"), false,
  "classifier must not read the operator-home external anchor");

for (const required of [
  "verifyBuyLaunchLiveActivationSignatureV1",
  "verifyBuyLaunchLiveActivationSovereignSignatureV1",
  "classifyBuyLaunchGenerationJournalV1",
  "custody_launch_high_water_bootstrap_required",
  "custody_launch_high_water_advance_required",
  "operator_home_anchor_read: false",
  "custody_high_water_write_performed: false",
  "custody_reserve_method_enabled: false",
  "production_allocation_mutation_ready: false",
]) assert.ok(source.includes(required), required);

const policy = VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2_POLICY;
assert.equal(policy.source_only_classifier, true);
assert.equal(policy.cross_uid_operator_home_anchor_dependency, false);
assert.equal(policy.dual_signature_required, true);
assert.equal(policy.shared_generation_journal_required, true);
assert.equal(policy.custody_private_high_water_required, true);
assert.equal(policy.custody_high_water_writer_implemented, false);
assert.equal(policy.caller_supplied_source_gate_authority, false);
assert.equal(policy.caller_supplied_journal_bytes_authority, false);
assert.equal(policy.caller_supplied_receipt_bytes_authority, false);
assert.equal(policy.caller_supplied_high_water_bytes_authority, false);
assert.equal(policy.caller_supplied_clock_authority, false);
assert.equal(policy.trusted_server_clock_required_before_runtime_use, true);
assert.equal(
  policy.observed_bytes_must_be_server_descriptor_bound_before_runtime_use,
  true,
);
assert.equal(policy.custody_reserve_method_enabled, false);
assert.equal(policy.custody_recover_method_enabled, false);
assert.equal(policy.production_allocation_mutation_ready, false);
assert.equal(policy.funds_movement, false);

// Fixed synthetic private keys used only to exercise EIP-712 verification.
// They are not VOID production keys and authorize nothing outside this proof.
const activationWallet = new Wallet(
  "0x" + "11".repeat(32),
);
const sovereignWallet = new Wallet(
  "0x" + "22".repeat(32),
);

const SOURCE_COMPOSITION =
  "sha256:" + "ab".repeat(32);
const SOURCE_GATE = Object.freeze({
  ready: true,
  id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
  composition_id: SOURCE_COMPOSITION,
});

const GEN1 = "0x" + "31".repeat(32);
const GEN2 = "0x" + "32".repeat(32);
const GEN_ALT = "0x" + "33".repeat(32);

function journal(events) {
  return Buffer.from(
    events.map((event) => JSON.stringify(event)).join("\n") + "\n",
    "utf8",
  );
}

const event1 = testOnlyBuildGenerationJournalEventV2({
  sequence: 1,
  previous_event_sha256: null,
  generation: GEN1,
  state: "active",
  occurred_at_ms: 1_000,
});
const journal1 = journal([event1]);

const event2 = testOnlyBuildGenerationJournalEventV2({
  sequence: 2,
  previous_event_sha256: event1.event_sha256,
  generation: GEN1,
  state: "revoked",
  occurred_at_ms: 2_000,
});
const event3 = testOnlyBuildGenerationJournalEventV2({
  sequence: 3,
  previous_event_sha256: event2.event_sha256,
  generation: GEN2,
  state: "active",
  occurred_at_ms: 3_000,
});
const journal3 = journal([event1, event2, event3]);

const altEvent1 = testOnlyBuildGenerationJournalEventV2({
  sequence: 1,
  previous_event_sha256: null,
  generation: GEN_ALT,
  state: "active",
  occurred_at_ms: 1_000,
});
const altJournal1 = journal([altEvent1]);

async function signedReceipt({
  generation,
  tip,
  activatedAt,
  expiresAt,
  nonceByte,
  sourceComposition = SOURCE_COMPOSITION,
  activation = activationWallet,
  sovereign = sovereignWallet,
}) {
  const body = {
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
    version: 1,
    status: "COUPLED_PUBLIC_LAUNCH_ACTIVE",
    coupled_launch_id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    source_composition_id: sourceComposition,
    activation_signer: activation.address.toLowerCase(),
    sovereign_signer: sovereign.address.toLowerCase(),
    activation_nonce: "0x" + nonceByte.repeat(32),
    activation_generation: generation,
    generation_tip_sha256: tip,
    activated_at_ms: activatedAt,
    expires_at_ms: expiresAt,
    buy_void_private_runtime_active: true,
    wc_void_market_active: true,
    public_presale_active: true,
    same_launch_ceremony: true,
    public_buy_request_intake_authorized: true,
    runtime_or_launch_evidence: true,
    source_ready_only: false,
  };
  const activationReceiptId =
    buyLaunchLiveActivationReceiptIdV1(body);
  const unsigned = {
    ...body,
    activation_receipt_id: activationReceiptId,
  };
  const typed = buyLaunchLiveActivationTypedDataV1(unsigned);
  const activationSignature = await activation.signTypedData(
    typed.domain,
    typed.types,
    typed.value,
  );
  const sovereignSignature = await sovereign.signTypedData(
    typed.domain,
    typed.types,
    typed.value,
  );
  return Buffer.from(
    JSON.stringify({
      ...unsigned,
      activation_signature: activationSignature,
      sovereign_signature: sovereignSignature,
    }, null, 2) + "\n",
    "utf8",
  );
}

const receipt1 = await signedReceipt({
  generation: GEN1,
  tip: event1.event_sha256,
  activatedAt: 10_000,
  expiresAt: 250_000,
  nonceByte: "41",
});

function classify({
  journalBytes,
  receiptBytes,
  highWaterBytes,
  nowMs,
}) {
  return testOnlyClassifyBuyVoidCustodyLaunchAuthorityV2({
    source_gate: SOURCE_GATE,
    generation_journal_bytes: journalBytes,
    activation_receipt_bytes: receiptBytes,
    custody_high_water_bytes: highWaterBytes,
    now_ms: nowMs,
    expected_activation_signer: activationWallet.address,
    expected_sovereign_signer: sovereignWallet.address,
  });
}

function assertCandidateAbsent(result, label) {
  assert.equal(result.candidate_high_water_json, null, label + "_json");
  assert.equal(result.candidate_high_water_sha256, null, label + "_sha256");
}

// A new custody domain may derive a candidate but is never considered ready
// until its own protected high-water has been separately established.
const bootstrap = classify({
  journalBytes: journal1,
  receiptBytes: receipt1,
  highWaterBytes: null,
  nowMs: 20_000,
});
assert.equal(bootstrap.ready, false);
assert.equal(
  bootstrap.reason,
  "custody_launch_high_water_bootstrap_required",
);
assert.equal(bootstrap.high_water_advance_required, true);
assert.equal(bootstrap.custody_high_water_write_performed, false);
assert.equal(bootstrap.custody_reserve_method_enabled, false);
assert.match(
  String(bootstrap.candidate_high_water_sha256),
  /^sha256:[0-9a-f]{64}$/u,
);

const highWater1 = Buffer.from(
  bootstrap.candidate_high_water_json,
  "utf8",
);
const ready1 = classify({
  journalBytes: journal1,
  receiptBytes: receipt1,
  highWaterBytes: highWater1,
  nowMs: 20_000,
});
assert.equal(ready1.ready, true);
assert.equal(ready1.marker, VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2);
assert.equal(ready1.sequence, 1);
assert.equal(ready1.generation, GEN1);
assert.equal(ready1.tip_sha256, event1.event_sha256);
assert.equal(ready1.high_water_matches_current, true);
assert.equal(ready1.high_water_advance_required, false);
assert.equal(ready1.operator_home_anchor_read, false);
assert.equal(ready1.custody_high_water_write_performed, false);
assert.equal(ready1.custody_reserve_method_enabled, false);
assert.equal(ready1.production_allocation_mutation_ready, false);

const receipt2 = await signedReceipt({
  generation: GEN2,
  tip: event3.event_sha256,
  activatedAt: 30_000,
  expiresAt: 270_000,
  nonceByte: "42",
});

const advance = classify({
  journalBytes: journal3,
  receiptBytes: receipt2,
  highWaterBytes: highWater1,
  nowMs: 40_000,
});
assert.equal(advance.ready, false);
assert.equal(
  advance.reason,
  "custody_launch_high_water_advance_required",
);
assert.equal(advance.sequence, 3);
assert.equal(advance.generation, GEN2);
assert.equal(advance.tip_sha256, event3.event_sha256);
assert.equal(advance.custody_high_water_write_performed, false);

const highWater3 = Buffer.from(
  advance.candidate_high_water_json,
  "utf8",
);
const ready3 = classify({
  journalBytes: journal3,
  receiptBytes: receipt2,
  highWaterBytes: highWater3,
  nowMs: 40_000,
});
assert.equal(ready3.ready, true);
assert.equal(ready3.sequence, 3);
assert.equal(ready3.generation, GEN2);

// Custody-private high-water prevents rollback of the shared journal.
const rollback = classify({
  journalBytes: journal1,
  receiptBytes: receipt1,
  highWaterBytes: highWater3,
  nowMs: 20_000,
});
assert.equal(rollback.ready, false);
assert.equal(rollback.reason, "high_water_sequence_rollback");

// Same sequence with an alternate signed branch cannot satisfy prior custody
// high-water lineage.
const altReceipt = await signedReceipt({
  generation: GEN_ALT,
  tip: altEvent1.event_sha256,
  activatedAt: 10_000,
  expiresAt: 250_000,
  nonceByte: "43",
});
const fork = classify({
  journalBytes: altJournal1,
  receiptBytes: altReceipt,
  highWaterBytes: highWater1,
  nowMs: 20_000,
});
assert.equal(fork.ready, false);
assert.equal(fork.reason, "high_water_lineage_mismatch");

// A valid old receipt cannot authorize the new active generation.
const staleReceipt = classify({
  journalBytes: journal3,
  receiptBytes: receipt1,
  highWaterBytes: highWater3,
  nowMs: 40_000,
});
assert.equal(staleReceipt.ready, false);
assert.equal(staleReceipt.reason, "receipt_generation_mismatch");
assertCandidateAbsent(staleReceipt, "stale_generation_receipt");

const malformedReceipt = classify({
  journalBytes: journal3,
  receiptBytes: Buffer.from("{", "utf8"),
  highWaterBytes: highWater3,
  nowMs: 40_000,
});
assert.equal(malformedReceipt.ready, false);
assert.equal(malformedReceipt.reason, "receipt_json_invalid");
assertCandidateAbsent(malformedReceipt, "malformed_receipt");

const wrongSourceReceipt = await signedReceipt({
  generation: GEN2,
  tip: event3.event_sha256,
  activatedAt: 30_000,
  expiresAt: 270_000,
  nonceByte: "44",
  sourceComposition: "sha256:" + "cd".repeat(32),
});
const wrongSource = classify({
  journalBytes: journal3,
  receiptBytes: wrongSourceReceipt,
  highWaterBytes: highWater3,
  nowMs: 40_000,
});
assert.equal(wrongSource.ready, false);
assert.equal(wrongSource.reason, "receipt_semantics_invalid");
assertCandidateAbsent(wrongSource, "source_composition_mismatch");

// Signature failure is terminal even with current journal/high-water.
const forged = JSON.parse(receipt2.toString("utf8"));
forged.activation_signature =
  "0x" + "00".repeat(65);
const forgedResult = classify({
  journalBytes: journal3,
  receiptBytes: Buffer.from(
    JSON.stringify(forged, null, 2) + "\n",
    "utf8",
  ),
  highWaterBytes: highWater3,
  nowMs: 40_000,
});
assert.equal(forgedResult.ready, false);
assert.equal(forgedResult.reason, "receipt_signature_invalid");
assertCandidateAbsent(forgedResult, "forged_activation_signature");

const forgedSovereign = JSON.parse(receipt2.toString("utf8"));
forgedSovereign.sovereign_signature =
  "0x" + "00".repeat(65);
const forgedSovereignResult = classify({
  journalBytes: journal3,
  receiptBytes: Buffer.from(
    JSON.stringify(forgedSovereign, null, 2) + "\n",
    "utf8",
  ),
  highWaterBytes: highWater3,
  nowMs: 40_000,
});
assert.equal(forgedSovereignResult.ready, false);
assert.equal(forgedSovereignResult.reason, "receipt_signature_invalid");
assertCandidateAbsent(forgedSovereignResult, "forged_sovereign_signature");

// High-water encoding is exact and source-composition bound.
const rebuiltHighWater3 = buildBuyVoidCustodyLaunchHighWaterV2({
  source_composition_id: SOURCE_COMPOSITION,
  sequence: 3,
  generation: GEN2,
  tip_sha256: event3.event_sha256,
  journal_prefix_sha256:
    "sha256:" + crypto.createHash("sha256").update(journal3).digest("hex"),
});
assert.equal(rebuiltHighWater3.equals(highWater3), true);

// The production wrapper deliberately derives the source gate itself. On the
// current source generation the global verified-payment-capacity readiness is
// still false, so production classification must remain HOLD.
// A raw-byte variation of an already accepted prefix cannot satisfy the
// custody high-water even if the existing journal semantic classifier accepts
// the same parsed event values.
const spacedJournal1 = Buffer.from(
  journal1.toString("utf8").replace(',"version"', ', "version"'),
  "utf8",
);
const rawPrefixMutation = classify({
  journalBytes: spacedJournal1,
  receiptBytes: receipt1,
  highWaterBytes: highWater1,
  nowMs: 20_000,
});
assert.equal(rawPrefixMutation.ready, false);
assert.equal(rawPrefixMutation.reason, "generation_journal_noncanonical");

const forgedHighWater = JSON.parse(highWater1.toString("utf8"));
forgedHighWater.journal_prefix_sha256 = "sha256:" + "00".repeat(32);
const forgedHighWaterResult = classify({
  journalBytes: journal1,
  receiptBytes: receipt1,
  highWaterBytes: Buffer.from(
    JSON.stringify(forgedHighWater, null, 2) + "\n",
    "utf8",
  ),
  nowMs: 20_000,
});
assert.equal(forgedHighWaterResult.ready, false);
assert.equal(
  forgedHighWaterResult.reason,
  "high_water_prefix_mismatch",
);

const callerClockHeld =
  classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2({
    generation_journal_bytes: journal1,
    activation_receipt_bytes: receipt1,
    custody_high_water_bytes: highWater1,
    now_ms: 20_000,
  });
assert.equal(callerClockHeld.ready, false);
assert.equal(callerClockHeld.reason, "caller_supplied_clock_forbidden");
assertCandidateAbsent(callerClockHeld, "caller_supplied_clock");

const productionHold =
  classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2({
    generation_journal_bytes: journal1,
    activation_receipt_bytes: receipt1,
    custody_high_water_bytes: highWater1,
  });
assert.equal(productionHold.ready, false);
assert.equal(productionHold.reason, "source_gate_not_ready");
assert.equal(productionHold.operator_home_anchor_read, false);
assert.equal(productionHold.custody_reserve_method_enabled, false);
assert.equal(productionHold.production_allocation_mutation_ready, false);
assert.equal(productionHold.funds_movement, false);

console.log("VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2_SOURCE_PROOF_GREEN");
console.log("classifier_source_blob=" + EXPECTED_SOURCE_BLOB);
console.log("dual_signed_activation_receipt_verified=true");
console.log("shared_generation_journal_verified=true");
console.log("custody_private_high_water_required=true");
console.log("missing_high_water_bootstrap_HOLD=true");
console.log("generation_advance_requires_high_water_update=true");
console.log("custody_high_water_rollback_rejected=true");
console.log("same_sequence_fork_rejected=true");
console.log("noncanonical_journal_bytes_rejected=true");
console.log("high_water_prefix_digest_mismatch_rejected=true");
console.log("stale_generation_receipt_rejected=true");
console.log("forged_activation_signature_rejected=true");
console.log("forged_sovereign_signature_rejected=true");
console.log("invalid_receipt_candidate_high_water_absent=true");
console.log("caller_supplied_clock_authority=false");
console.log("trusted_server_clock_required=true");
console.log("operator_home_anchor_dependency=false");
console.log("classifier_filesystem_io=false");
console.log("classifier_userInfo_dependency=false");
console.log("observed_bytes_not_caller_authority=true");
console.log("production_source_gate_ready=false");
console.log("custody_high_water_write_performed=false");
console.log("custody_reserve_method_enabled=false");
console.log("custody_recover_method_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("payment_or_allocation_append_performed=false");
console.log("service_or_permission_mutation=false");
console.log("wallet_or_production_signer_access=false");
console.log("chain_or_wc_mutation=false");
console.log("presale_or_market_activation=false");
console.log("funds_moved=false");
