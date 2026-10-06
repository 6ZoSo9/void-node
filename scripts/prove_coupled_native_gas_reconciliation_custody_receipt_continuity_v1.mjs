#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1,
  planCoupledNativeGasReconciliationCustodyReceiptV1 as planReceiptRaw,
} from "../tools/void-coupled-native-gas-reconciliation-custody-receipt-continuity-v1.mjs";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1,
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

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
const ZERO_SHA256 = "sha256:" + "0".repeat(64);

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
    crypto.createHash("sha256").update(
      Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8"),
    ).digest("hex")
  );
}

function sha(fill) {
  return "sha256:" + fill.repeat(64);
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(
    Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8"),
  ).digest("hex");
}

function qualificationReceiptBody(record) {
  const out = { ...record };
  delete out.receipt_sha256;
  return out;
}

function makeCollector({
  host = "nimo-proof-host",
  payer = "0x" + "a".repeat(40),
  payerDomain = "voidngpd1_proof",
  root = "/var/lib/void-native-gas-reconciliation-proof",
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
    payer_root_dev: "1048577",
    payer_root_ino: "1001",
    payer_root_mount_id: 77,
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
  const qualificationId = sha256Id(canonical({
    domain: QUALIFICATION_DOMAIN,
    qualification_policy_fingerprint_sha256: policy,
    evidence_snapshot_fingerprint_sha256: evidence,
    receipt_sha256: receipt.receipt_sha256,
  }));
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

function requireOk(value) {
  if (value.ok !== true) {
    throw new Error(value.reason || "unexpected_hold");
  }
  return value;
}

function expectHeld(value, reason) {
  assert.equal(value.ok, false);
  if (value.ok !== false) throw new Error("expected HOLD");
  assert.equal(value.reason, reason);
}

function rehashReceipt(record) {
  const body = { ...record };
  delete body.receipt_sha256;
  return {
    ...body,
    receipt_sha256: sha256Id(canonical(body)),
  };
}

function rehashSourceBinding(binding) {
  const body = { ...binding };
  delete body.ok;
  delete body.source_binding_id;
  return {
    ...binding,
    source_binding_id: "voidngrcsb1_" + sha256Hex(canonical(body)),
  };
}

const sourceBinding = requireOk(
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1({
    repository_head_sha: "a".repeat(40),
    repository_tree_sha: "b".repeat(40),
    repository_origin: "https://github.com/6ZoSo9/void-node.git",
    worktree_clean: true,
    reviewed_base_is_ancestor: true,
    source_blobs:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1
        .map((row) => ({
          path: row.path,
          git_blob_sha1: row.git_blob_sha1,
          worktree_git_blob_sha1: row.git_blob_sha1,
        })),
  }),
);

function planReceipt(input) {
  return planReceiptRaw({
    ...input,
    source_binding: input?.source_binding ?? sourceBinding,
  });
}

const empty = requireOk(
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(""),
);
assert.equal(empty.status, "empty");
assert.equal(empty.record_count, 0);
assert.equal(empty.generation, 0);
assert.equal(empty.tip_receipt_sha256, ZERO_SHA256);
assert.match(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
  /^voidngrcsg1_[0-9a-f]{64}$/u,
);

const firstCollector = makeCollector();

expectHeld(
  planReceiptRaw({
    journal_jsonl: "",
    collector_decision: firstCollector,
  }),
  "receipt_continuity_source_binding_shape_invalid",
);

{
  const bad = structuredClone(sourceBinding);
  bad.authority.network_access = true;
  const rehashed = rehashSourceBinding(bad);
  expectHeld(
    planReceiptRaw({
      journal_jsonl: "",
      collector_decision: firstCollector,
      source_binding: rehashed,
    }),
    "receipt_continuity_source_binding_invalid",
  );
}

const firstPlan = requireOk(
  planReceipt({
    journal_jsonl: "",
    collector_decision: firstCollector,
  }),
);
assert.equal(firstPlan.status, "planned");
assert.equal(firstPlan.generation, 1);
assert.equal(firstPlan.previous_receipt_sha256, ZERO_SHA256);
assert.equal(
  firstPlan.source_generation_id,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_SOURCE_GENERATION_ID_V1,
);
assert.equal(firstPlan.operation_performed, false);
const journal1 = firstPlan.append_jsonl;
const firstClassified = requireOk(
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(journal1),
);
assert.equal(firstClassified.record_count, 1);
assert.equal(firstClassified.generation, 1);
assert.equal(
  firstClassified.tip_receipt_sha256,
  firstPlan.receipt_sha256,
);

// Clock/evidence-generation values remain informational: a later receipt may
// carry lower untrusted timestamps while this pure chain still advances only by
// predecessor receipt + generation.
const secondCollector = makeCollector({
  boot: sha("7"),
  observed: 1_799_999_000_000,
  completed: 1_799_999_000_050,
  evidenceGeneration: "1799999000000",
  evidence: sha("8"),
});
const secondPlan = requireOk(
  planReceipt({
    journal_jsonl: journal1,
    collector_decision: secondCollector,
  }),
);
assert.equal(secondPlan.generation, 2);
assert.equal(
  secondPlan.previous_receipt_sha256,
  firstPlan.receipt_sha256,
);
const journal2 = journal1 + secondPlan.append_jsonl;
const secondClassified = requireOk(
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(journal2),
);
assert.equal(secondClassified.record_count, 2);
assert.equal(secondClassified.generation, 2);
assert.equal(
  secondClassified.tip_receipt_sha256,
  secondPlan.receipt_sha256,
);

expectHeld(
  planReceipt({
    journal_jsonl: journal1,
    collector_decision: firstCollector,
  }),
  "receipt_continuity_collector_decision_replayed",
);

{
  const replayWrapped = structuredClone(firstCollector);
  replayWrapped.untrusted_padding = "bounded-replay-wrapper";
  expectHeld(
    planReceipt({
      journal_jsonl: journal1,
      collector_decision: replayWrapped,
    }),
    "receipt_continuity_qualification_receipt_replayed",
  );
}

for (const [label, collector] of [
  ["host", makeCollector({ host: "other-proof-host", evidence: sha("9") })],
  ["payer", makeCollector({
    payer: "0x" + "b".repeat(40),
    payerDomain: "voidngpd1_other",
    evidence: sha("a"),
  })],
  ["domain", makeCollector({
    payerDomain: "voidngpd1_other",
    evidence: sha("b"),
  })],
  ["root", makeCollector({
    root: "/var/lib/void-native-gas-reconciliation-other",
    evidence: sha("c"),
  })],
  ["machine", makeCollector({
    machine: sha("d"),
    evidence: sha("e"),
  })],
]) {
  expectHeld(
    planReceipt({
      journal_jsonl: journal1,
      collector_decision: collector,
    }),
    "receipt_continuity_custody_identity_changed",
  );
  assert.ok(label);
}

{
  const bad = structuredClone(firstCollector);
  bad.status = "SYNTHETIC_HOST_EVIDENCE_CLASSIFIED_TEST_ONLY";
  expectHeld(
    planReceipt({
      journal_jsonl: "",
      collector_decision: bad,
    }),
    "receipt_continuity_collector_decision_not_live_source_qualified",
  );
}

{
  const bad = structuredClone(firstCollector);
  bad.untrusted_padding = "x".repeat(8 * 1024 * 1024 + 1);
  expectHeld(
    planReceipt({
      journal_jsonl: "",
      collector_decision: bad,
    }),
    "receipt_continuity_collector_decision_too_large",
  );
}

{
  const bad = structuredClone(firstCollector);
  bad.trusted_collector_proven = true;
  expectHeld(
    planReceipt({
      journal_jsonl: "",
      collector_decision: bad,
    }),
    "receipt_continuity_collector_decision_not_live_source_qualified",
  );
}

{
  const bad = structuredClone(firstCollector);
  bad.qualification.qualification_id_sha256 = sha("f");
  expectHeld(
    planReceipt({
      journal_jsonl: "",
      collector_decision: bad,
    }),
    "receipt_continuity_qualification_id_mismatch",
  );
}

{
  const bad = structuredClone(firstCollector);
  bad.qualification.receipt.receipt_sha256 = sha("f");
  expectHeld(
    planReceipt({
      journal_jsonl: "",
      collector_decision: bad,
    }),
    "receipt_continuity_qualification_receipt_hash_mismatch",
  );
}

{
  const bad = structuredClone(firstCollector);
  bad.collector_evidence.boot_id_sha256 = sha("f");
  expectHeld(
    planReceipt({
      journal_jsonl: "",
      collector_decision: bad,
    }),
    "receipt_continuity_collector_qualification_evidence_mismatch",
  );
}

{
  const bad = structuredClone(firstCollector);
  bad.classifier_input.host_evidence.evidence_snapshot.evidence_generation =
    "1800000000001";
  expectHeld(
    planReceipt({
      journal_jsonl: "",
      collector_decision: bad,
    }),
    "receipt_continuity_collector_generation_binding_mismatch",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  const canonicalLine = JSON.stringify(first);
  const colon = canonicalLine.indexOf(":");
  assert.ok(colon > 0);
  const noncanonical =
    canonicalLine.slice(0, colon + 1) +
    " " +
    canonicalLine.slice(colon + 1) +
    "\n";
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      noncanonical,
    ),
    "receipt_continuity_receipt_serialization_noncanonical",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  first.generation = 2;
  const tampered = JSON.stringify(first) + "\n";
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      tampered,
    ),
    "receipt_continuity_generation_not_monotonic",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  const second = JSON.parse(secondPlan.append_jsonl);
  second.previous_receipt_sha256 = sha("f");
  second.receipt_sha256 = rehashReceipt(second).receipt_sha256;
  const tampered =
    JSON.stringify(first) + "\n" +
    JSON.stringify(second) + "\n";
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      tampered,
    ),
    "receipt_continuity_previous_receipt_mismatch",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  first.source_generation_id = "voidngrcsg1_" + "f".repeat(64);
  first.receipt_sha256 = rehashReceipt(first).receipt_sha256;
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      JSON.stringify(first) + "\n",
    ),
    "receipt_continuity_source_generation_mismatch",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  const second = JSON.parse(secondPlan.append_jsonl);
  second.host_id = "other-proof-host";
  second.receipt_sha256 = rehashReceipt(second).receipt_sha256;
  const tampered =
    JSON.stringify(first) + "\n" +
    JSON.stringify(second) + "\n";
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      tampered,
    ),
    "receipt_continuity_custody_identity_changed",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  const second = JSON.parse(secondPlan.append_jsonl);
  second.collector_decision_sha256 = first.collector_decision_sha256;
  second.receipt_sha256 = rehashReceipt(second).receipt_sha256;
  const tampered =
    JSON.stringify(first) + "\n" +
    JSON.stringify(second) + "\n";
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      tampered,
    ),
    "receipt_continuity_collector_decision_replayed",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  const second = JSON.parse(secondPlan.append_jsonl);
  second.qualification_receipt_sha256 =
    first.qualification_receipt_sha256;
  second.receipt_sha256 = rehashReceipt(second).receipt_sha256;
  const tampered =
    JSON.stringify(first) + "\n" +
    JSON.stringify(second) + "\n";
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      tampered,
    ),
    "receipt_continuity_qualification_receipt_replayed",
  );
}

{
  const first = JSON.parse(firstPlan.append_jsonl);
  first.receipt_sha256 = sha("f");
  expectHeld(
    classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
      JSON.stringify(first) + "\n",
    ),
    "receipt_continuity_receipt_hash_mismatch",
  );
}

expectHeld(
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
    Buffer.from([0xff]),
  ),
  "receipt_continuity_journal_utf8_invalid",
);

expectHeld(
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(
    firstPlan.append_jsonl.slice(0, -1),
  ),
  "receipt_continuity_journal_missing_final_newline",
);

expectHeld(
  classifyCoupledNativeGasReconciliationCustodyReceiptContinuityV1(undefined),
  "receipt_continuity_journal_input_invalid",
);

const authority =
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_AUTHORITY_V1;
const trueKeys = new Set([
  "source_only_contract",
  "pure_receipt_chain_classification",
  "exact_source_generation_bound",
  "source_binding_validation_required_for_plan",
  "source_binding_id_committed_in_receipt",
  "exact_live_collector_decision_hash_bound",
  "collector_decision_canonical_bytes_bounded",
  "exact_qualification_receipt_bound",
  "predecessor_receipt_binding_required",
  "supplied_chain_generation_monotonicity_proven",
  "collector_decision_replay_rejected",
  "qualification_receipt_replay_rejected",
  "host_payer_machine_continuity_required",
  "boot_identity_may_advance",
]);
for (const [key, value] of Object.entries(authority)) {
  assert.equal(value, trueKeys.has(key), key);
}

for (const decision of [
  empty,
  firstPlan,
  firstClassified,
  secondPlan,
  secondClassified,
]) {
  assert.equal(decision.trusted_collector_proven, false);
  assert.equal(decision.bootstrap_receipt_external_trust_proven, false);
  assert.equal(decision.evidence_generation_monotonicity_proven, false);
  assert.equal(decision.verification_clock_authority_proven, false);
  assert.equal(decision.rollback_resistance_proven, false);
  assert.equal(decision.live_host_qualification_performed, false);
  assert.equal(decision.storage_bootstrap, false);
  assert.equal(decision.runtime_integration, false);
  assert.equal(decision.production_gate_ready, false);
  assert.equal(decision.funds_movement, false);
}

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_CONTINUITY_V1_GREEN",
);
console.log("source_generation_bound=true");
console.log("source_binding_validation_required_for_plan=true");
console.log("source_binding_id_committed_in_receipt=true");
console.log("historical_source_binding_revalidation=false");
console.log("qualification_receipt_self_hash_bound=true");
console.log("qualification_id_rederived=true");
console.log("collector_decision_hash_bound=true");
console.log("predecessor_receipt_bound=true");
console.log("supplied_chain_generation_monotonicity_proven=true");
console.log("collector_decision_replay_rejected=true");
console.log("qualification_receipt_replay_rejected=true");
console.log("host_payer_machine_continuity_required=true");
console.log("boot_identity_may_advance=true");
console.log("collector_clock_used_as_authority=false");
console.log("collector_evidence_generation_used_as_authority=false");
console.log("trusted_collector_proven=false");
console.log("bootstrap_receipt_external_trust_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("verification_clock_authority_proven=false");
console.log("rollback_resistance_proven=false");
console.log("live_host_qualification_performed=false");
console.log("storage_bootstrap=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
