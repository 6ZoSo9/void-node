#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const generator = path.join(root, "scripts/datanet_promotion_candidate_generate_v1.mjs");
const fixturePath = path.join(root, "fixtures/architecture/datanet-promotion-evidence-source-v1.green.json");
const sourceSchema = JSON.parse(fs.readFileSync(path.join(root, "schemas/datanet-promotion-evidence-source-v1.schema.json"), "utf8"));
const mapSchema = JSON.parse(fs.readFileSync(path.join(root, "schemas/datanet-promotion-evidence-map-v1.schema.json"), "utf8"));
const candidateSchema = JSON.parse(fs.readFileSync(path.join(root, "schemas/datanet-chain-promotion-candidate-v1.schema.json"), "utf8"));
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const DIMS = ["integrity","provenance","freshness","availability","uniqueness","suspicion_clearance","corroboration","reproducibility"];

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function shaText(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

function run(input, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-promotion-v1-"));
  const inputPath = path.join(dir, "input.json");
  const mapOut = path.join(dir, "map.json");
  const candidateOut = path.join(dir, "candidate.json");
  fs.writeFileSync(inputPath, JSON.stringify(input, null, 2) + "\n");
  const result = spawnSync(process.execPath, [generator, "--input", inputPath, "--map-out", mapOut, "--candidate-out", candidateOut], {
    cwd: root,
    encoding: "utf8",
  });
  return {dir,inputPath,mapOut,candidateOut,result,label};
}

function expectHold(input, expectedReason, label) {
  const r = run(input, label);
  assert.equal(r.result.status, 3, label + " must HOLD");
  const out = JSON.parse(r.result.stdout);
  assert.equal(out.marker, "VOID_DATANET_PROMOTION_EVIDENCE_HOLD_V1");
  assert.equal(out.status, "HOLD");
  assert.ok(out.reasons.includes(expectedReason), label + " missing expected HOLD reason: " + expectedReason + " got=" + out.reasons.join(","));
  assert.equal(fs.existsSync(r.mapOut), false, label + " must not write evidence map");
  assert.equal(fs.existsSync(r.candidateOut), false, label + " must not write candidate");
  assert.equal(out.chain2050_write_authorized, false);
  assert.equal(out.validator_authority_granted, false);
  return out;
}

assert.equal(sourceSchema.$id, "https://voidchain.org/schemas/datanet-promotion-evidence-source-v1.schema.json");
assert.equal(mapSchema.$id, "https://voidchain.org/schemas/datanet-promotion-evidence-map-v1.schema.json");
assert.equal(candidateSchema.$id, "https://voidchain.org/schemas/datanet-chain-promotion-candidate-v1.schema.json");
assert.equal(mapSchema.properties.candidate_eligible.const, true);
assert.equal(mapSchema.$defs.authority.properties.chain2050_write_authorized.const, false);
assert.equal(mapSchema.$defs.authority.properties.validator_authority_granted.const, false);
assert.equal(sourceSchema.$defs.authority.properties.chain2050_write_authorized.const, false);

const green = run(fixture, "green");
assert.equal(green.result.status, 0, green.result.stderr + green.result.stdout);
const stdout = JSON.parse(green.result.stdout);
assert.equal(stdout.marker, "VOID_DATANET_PROMOTION_EVIDENCE_GENERATOR_V1_GREEN");
assert.equal(stdout.status, "GREEN");
assert.equal(stdout.phase, 0);
assert.equal(stdout.validator_admission_authority_active, false);
assert.equal(stdout.canonical_write_authorized, false);
assert.equal(stdout.automatic_promotion, false);
assert.ok(fs.existsSync(green.mapOut));
assert.ok(fs.existsSync(green.candidateOut));

const map = JSON.parse(fs.readFileSync(green.mapOut, "utf8"));
const candidate = JSON.parse(fs.readFileSync(green.candidateOut, "utf8"));
assert.equal(map.marker, "VOID_DATANET_PROMOTION_EVIDENCE_MAP_V1");
assert.equal(map.object_id_sha256, shaText(fixture.object.object_id));
assert.equal(map.content_sha256, fixture.object.content_sha256);
assert.equal(map.candidate_eligible, true);
assert.equal(map.baseline_floor_bps, 10000);
assert.deepEqual(Object.keys(map.dimensions).sort(), [...DIMS].sort());
for (const key of DIMS) {
  assert.equal(map.dimensions[key].status, "PASS");
  assert.equal(map.dimensions[key].score_bps, 10000);
  assert.ok(map.dimensions[key].sources.length >= 1);
  for (const source of map.dimensions[key].sources) assert.match(source.source_sha256, /^[0-9a-f]{64}$/);
}
assert.equal(map.authority.evidence_only, true);
assert.equal(map.authority.chain2050_write_authorized, false);
assert.equal(map.authority.validator_authority_granted, false);
assert.equal(map.authority.automatic_promotion, false);

assert.equal(candidate.marker, "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1");
assert.equal(candidate.ranking.network_baseline.baseline_floor_bps, 10000);
assert.equal(candidate.ranking.requester_overlay.overlay_score_bps, 10000);
assert.equal(candidate.hard_gates.length, 8);
assert.ok(candidate.hard_gates.every(g => g.status === "PASS"));
assert.equal(candidate.phase_context.phase, 0);
assert.equal(candidate.phase_context.validator_admission_authority_active, false);
assert.equal(candidate.admission.disposition, "PHASE0_OPERATOR_REVIEW_ONLY");
assert.equal(candidate.admission.validator_consideration_permitted, false);
assert.equal(candidate.admission.canonical_write_authorized, false);
assert.equal(candidate.admission.automatic_promotion, false);
assert.equal(candidate.authority.chain2050_write_authorized, false);
assert.equal(candidate.authority.validator_vote_cast, false);
assert.equal(candidate.authority.validator_quorum_satisfied, false);
assert.equal(candidate.authority.sovereign_protocol_mutation_authorized, false);
assert.equal(candidate.authority.sovereign_chain_stop_authorized, false);

const missingCorroboration = clone(fixture);
delete missingCorroboration.corroboration_evidence;
expectHold(missingCorroboration, "missing_corroboration_evidence", "missing corroboration");

const contradiction = clone(fixture);
contradiction.manifest_record.sha256 = "f".repeat(64);
expectHold(contradiction, "manifest_record_content_sha256_mismatch", "content contradiction");

const stale = clone(fixture);
stale.weighted_record.freshness_state = "stale";
expectHold(stale, "freshness_not_fresh", "stale");

const duplicate = clone(fixture);
duplicate.dedupe_evidence.duplicate_detected = true;
expectHold(duplicate, "duplicate_detected", "duplicate");

const suspicious = clone(fixture);
suspicious.weighted_record.suspicion_state = "suspicious";
expectHold(suspicious, "suspicion_not_clean", "suspicious");

const partial = clone(fixture);
partial.weighted_record.verification_state = "pending";
expectHold(partial, "verification_not_verified", "partially verified");

const conflict = clone(fixture);
conflict.corroboration_evidence.conflict_detected = true;
expectHold(conflict, "corroboration_conflict_detected", "conflicting corroboration");

const noReproducer = clone(fixture);
noReproducer.reproducibility_evidence.independent_verifier_count = 0;
expectHold(noReproducer, "independent_reproducer_missing", "missing reproducer");

const phaseEscalation = clone(fixture);
phaseEscalation.phase_context.phase = 3;
phaseEscalation.phase_context.authority_mode = "VALIDATOR_QUORUM_REQUIRED";
phaseEscalation.phase_context.validator_admission_authority_active = true;
expectHold(phaseEscalation, "non_phase0_generation_not_enabled", "phase escalation");

const authorityEscalation = clone(fixture);
authorityEscalation.authority_scope.chain2050_write_authorized = true;
expectHold(authorityEscalation, "authority_scope_invalid_chain2050_write_authorized", "chain authority escalation");

const badWeights = clone(fixture);
badWeights.requester_weights_bps.integrity += 1;
expectHold(badWeights, "requester_weights_must_sum_10000", "weight sum");

console.log("VOID_DATANET_PROMOTION_EVIDENCE_MAP_GENERATOR_V1_PROOF_GREEN");
console.log("healthy_dimensions=8");
console.log("healthy_dimension_score_bps=10000");
console.log("missing_evidence_holds=true");
console.log("contradictory_evidence_holds=true");
console.log("stale_holds=true");
console.log("duplicate_holds=true");
console.log("suspicious_holds=true");
console.log("partial_verification_holds=true");
console.log("corroboration_conflict_holds=true");
console.log("missing_reproducer_holds=true");
console.log("non_phase0_generation_holds=true");
console.log("authority_escalation_holds=true");
console.log("candidate_write_before_green=false");
console.log("chain2050_write_authorized=false");
console.log("validator_authority_granted=false");
