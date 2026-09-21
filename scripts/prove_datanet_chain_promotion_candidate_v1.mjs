#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixture = JSON.parse(fs.readFileSync(path.join(root, "fixtures/architecture/datanet-chain-promotion-candidate-v1.json"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(root, "schemas/datanet-chain-promotion-candidate-v1.schema.json"), "utf8"));
const doc = fs.readFileSync(path.join(root, "docs/architecture/datanet-chain-promotion-candidate-v1.md"), "utf8");
const doctrine = fs.readFileSync(path.join(root, "docs/governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md"), "utf8");

const DIMS = ["integrity","provenance","freshness","availability","uniqueness","suspicion_clearance","corroboration","reproducibility"];
const GATES = ["exact_object_identity","byte_integrity","manifest_integrity","provenance_binding","replay_resistance","authorization_scope","ranking_vector_complete","phase_authority_compatible"];
const AUTH_FALSE = ["chain2050_write_authorized","validator_vote_cast","validator_quorum_satisfied","validator_mutation_authorized","governance_mutation_authorized","sovereign_protocol_mutation_authorized","sovereign_chain_stop_authorized","signer_or_wallet_access","work_credit_award_authorized","runtime_service_action","funds_action"];
const SHA256 = /^[0-9a-f]{64}$/;

function exactKeys(obj, expected, label) {
  assert.deepEqual(Object.keys(obj).sort(), [...expected].sort(), `${label} keys`);
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function validate(candidate) {
  exactKeys(candidate, ["schema","marker","version","parent_policy","candidate","ranking","hard_gates","phase_context","admission","authority"], "top");
  assert.equal(candidate.schema, "void_datanet_chain_promotion_candidate_v1");
  assert.equal(candidate.marker, "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1");
  assert.equal(candidate.version, 1);
  assert.equal(candidate.parent_policy, "VOID_DATANET_CHAIN_TRUTH_MEMBRANE_WC_EXCHANGE_V1_20260921");

  const id = candidate.candidate;
  exactKeys(id, ["candidate_id","object_id_sha256","content_sha256","byte_length","data_weight_record_sha256","observed_at_utc"], "candidate");
  assert.match(id.candidate_id, /^voiddcp1_[a-z0-9]{16,64}$/);
  for (const key of ["object_id_sha256","content_sha256","data_weight_record_sha256"]) assert.match(id[key], SHA256);
  assert.ok(Number.isSafeInteger(id.byte_length) && id.byte_length >= 1 && id.byte_length <= 268435456);
  assert.ok(Number.isFinite(Date.parse(id.observed_at_utc)));

  const baseline = candidate.ranking.network_baseline;
  exactKeys(baseline, ["method_id","dimension_scores_bps","baseline_floor_bps","components_inspectable","ranking_is_authority"], "baseline");
  assert.equal(baseline.method_id, "VOID_DATANET_BASELINE_FLOOR_V1");
  exactKeys(baseline.dimension_scores_bps, DIMS, "dimension scores");
  for (const k of DIMS) assert.ok(Number.isInteger(baseline.dimension_scores_bps[k]) && baseline.dimension_scores_bps[k] >= 0 && baseline.dimension_scores_bps[k] <= 10000);
  assert.equal(baseline.baseline_floor_bps, Math.min(...DIMS.map(k => baseline.dimension_scores_bps[k])));
  assert.equal(baseline.components_inspectable, true);
  assert.equal(baseline.ranking_is_authority, false);

  const overlay = candidate.ranking.requester_overlay;
  exactKeys(overlay, ["method_id","weights_bps","overlay_score_bps","may_change_baseline_evidence","may_override_hard_gate","grants_authority"], "overlay");
  assert.equal(overlay.method_id, "VOID_DATANET_REQUESTER_WEIGHTED_ATTENTION_V1");
  exactKeys(overlay.weights_bps, DIMS, "weights");
  const weightSum = DIMS.reduce((n, k) => n + overlay.weights_bps[k], 0);
  assert.equal(weightSum, 10000);
  const weighted = DIMS.reduce((n, k) => n + baseline.dimension_scores_bps[k] * overlay.weights_bps[k], 0);
  assert.equal(overlay.overlay_score_bps, Math.floor(weighted / 10000));
  assert.equal(overlay.may_change_baseline_evidence, false);
  assert.equal(overlay.may_override_hard_gate, false);
  assert.equal(overlay.grants_authority, false);

  assert.equal(candidate.hard_gates.length, GATES.length);
  assert.equal(new Set(candidate.hard_gates.map(g => g.gate_id)).size, GATES.length);
  assert.deepEqual(candidate.hard_gates.map(g => g.gate_id).sort(), [...GATES].sort());
  for (const gate of candidate.hard_gates) {
    exactKeys(gate, ["gate_id","status","required_for_consideration","evidence_sha256"], "hard gate");
    assert.match(gate.evidence_sha256, SHA256);
  }
  if (candidate.admission.qualified_for_consideration) {
    for (const gate of candidate.hard_gates.filter(g => g.required_for_consideration)) assert.equal(gate.status, "PASS");
  }

  if (candidate.phase_context.phase === 0) {
    assert.equal(candidate.phase_context.authority_mode, "PHASE0_OPERATOR_ROOTED");
    assert.equal(candidate.phase_context.validator_admission_authority_active, false);
    assert.equal(candidate.admission.operator_review_permitted, true);
    assert.equal(candidate.admission.validator_consideration_permitted, false);
    assert.equal(candidate.admission.disposition, "PHASE0_OPERATOR_REVIEW_ONLY");
  }

  assert.equal(candidate.admission.canonical_write_authorized, false);
  assert.equal(candidate.admission.automatic_promotion, false);

  exactKeys(candidate.authority, ["source_only","candidate_only",...AUTH_FALSE], "authority");
  assert.equal(candidate.authority.source_only, true);
  assert.equal(candidate.authority.candidate_only, true);
  for (const key of AUTH_FALSE) assert.equal(candidate.authority[key], false, `authority must remain false: ${key}`);
}

validate(fixture);

assert.equal(schema.$id, "https://voidchain.org/schemas/datanet-chain-promotion-candidate-v1.schema.json");
assert.equal(schema.properties.marker.const, "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1");
assert.equal(schema.$defs.baseline.properties.ranking_is_authority.const, false);
assert.equal(schema.$defs.overlay.properties.may_override_hard_gate.const, false);
assert.equal(schema.$defs.admission.properties.canonical_write_authorized.const, false);
assert.equal(schema.$defs.admission.properties.automatic_promotion.const, false);
for (const key of AUTH_FALSE) assert.equal(schema.$defs.authority.properties[key].const, false);

assert.match(doc, /Ranking is evidence, not authority/);
assert.match(doc, /baseline_floor_bps.*minimum component score/s);
assert.match(doc, /failed required hard gate cannot be averaged away/i);
assert.match(doc, /Phase 0 remains operator-rooted/);
assert.match(doc, /canonical_write_authorized=false/);
assert.match(doctrine, /Ranking is evidence, not authority/);

const badFloor = clone(fixture);
badFloor.ranking.network_baseline.baseline_floor_bps += 1;
assert.throws(() => validate(badFloor));

const badWeights = clone(fixture);
badWeights.ranking.requester_overlay.weights_bps.integrity -= 1;
assert.throws(() => validate(badWeights));

const badOverlay = clone(fixture);
badOverlay.ranking.requester_overlay.overlay_score_bps += 1;
assert.throws(() => validate(badOverlay));

const failedGate = clone(fixture);
failedGate.hard_gates[0].status = "FAIL";
assert.throws(() => validate(failedGate));

const phaseEscalation = clone(fixture);
phaseEscalation.phase_context.validator_admission_authority_active = true;
assert.throws(() => validate(phaseEscalation));

const authorityEscalation = clone(fixture);
authorityEscalation.authority.chain2050_write_authorized = true;
assert.throws(() => validate(authorityEscalation));

const hiddenField = clone(fixture);
hiddenField.silent_authority = true;
assert.throws(() => validate(hiddenField));

console.log("VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1_PROOF_GREEN");
console.log("source_only=true");
console.log("phase=0");
console.log("validator_admission_authority_active=false");
console.log("baseline_floor_bps=" + fixture.ranking.network_baseline.baseline_floor_bps);
console.log("requester_overlay_score_bps=" + fixture.ranking.requester_overlay.overlay_score_bps);
console.log("hard_gates=" + fixture.hard_gates.length);
console.log("canonical_write_authorized=false");
console.log("automatic_promotion=false");
console.log("authority_escalation=false");
