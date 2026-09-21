#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";

const DIMS = ["integrity","provenance","freshness","availability","uniqueness","suspicion_clearance","corroboration","reproducibility"];
const GATES = ["exact_object_identity","byte_integrity","manifest_integrity","provenance_binding","replay_resistance","authorization_scope","ranking_vector_complete","phase_authority_compatible"];
const SHA256 = /^[0-9a-f]{64}$/;

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function shaText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function shaJson(value) {
  return shaText(canonical(value));
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function emitHold(reasons) {
  const out = {
    marker: "VOID_DATANET_PROMOTION_EVIDENCE_HOLD_V1",
    status: "HOLD",
    reasons: [...new Set(reasons)].sort(),
    evidence_map_written: false,
    promotion_candidate_written: false,
    chain2050_write_authorized: false,
    validator_authority_granted: false,
    governance_mutation_authorized: false,
    automatic_promotion: false,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(3);
}

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    process.stderr.write("VOID_DATANET_PROMOTION_EVIDENCE_INPUT_ERROR " + String(error?.message || error) + "\n");
    process.exit(2);
  }
}

function sourceHash(obj) {
  return shaJson(obj);
}

function evidenceMaterialHash(obj) {
  const { evidence_sha256: _ignored, ...material } = obj;
  return shaJson(material);
}

function binding(sourceId, source, field, observed, expected) {
  return {
    source_id: sourceId,
    field,
    observed,
    expected,
    source_sha256: sourceHash(source),
  };
}

function exactKeysOrHold(obj, expected, label, reasons) {
  const actual = Object.keys(obj).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) reasons.push(label + "_keys_invalid");
}

const inputPath = arg("--input");
const mapOut = arg("--map-out");
const candidateOut = arg("--candidate-out");
if (!inputPath || !mapOut || !candidateOut) {
  process.stderr.write("usage: datanet_promotion_candidate_generate_v1.mjs --input SOURCE.json --map-out MAP.json --candidate-out CANDIDATE.json\n");
  process.exit(2);
}
if (mapOut === candidateOut || fs.existsSync(mapOut) || fs.existsSync(candidateOut)) {
  process.stderr.write("VOID_DATANET_PROMOTION_EVIDENCE_OUTPUT_PRECONDITION_FAIL\n");
  process.exit(2);
}

const x = readJson(inputPath);
const reasons = [];

if (x?.schema !== "void_datanet_promotion_evidence_source_v1") reasons.push("source_schema_invalid");
if (x?.marker !== "VOID_DATANET_PROMOTION_EVIDENCE_SOURCE_V1") reasons.push("source_marker_invalid");
if (x?.version !== 1) reasons.push("source_version_invalid");

const requiredSections = [
  "object","weighted_record","manifest_record","object_proof","dedupe_evidence",
  "availability_evidence","corroboration_evidence","reproducibility_evidence",
  "phase_context","requester_weights_bps","authority_scope"
];
for (const section of requiredSections) {
  if (!x?.[section] || typeof x[section] !== "object" || Array.isArray(x[section])) reasons.push("missing_" + section);
}
if (reasons.length) emitHold(reasons);

exactKeysOrHold(x, ["schema","marker","version",...requiredSections], "source", reasons);
exactKeysOrHold(x.object, ["object_id","content_sha256","byte_length","observed_at_utc"], "object", reasons);
exactKeysOrHold(x.weighted_record, ["object_id","sha256","verification_state","freshness_state","suspicion_state","tombstone_state","source_id","promotion_eligible"], "weighted_record", reasons);
exactKeysOrHold(x.manifest_record, ["object_id","sha256","bytes","receipt_marker","receipt_valid_for_current_object"], "manifest_record", reasons);
exactKeysOrHold(x.object_proof, ["object_id","sha256","bytes","exact_bytes_verified"], "object_proof", reasons);
exactKeysOrHold(x.dedupe_evidence, ["object_id","sha256","duplicate_detected","evidence_sha256"], "dedupe_evidence", reasons);
exactKeysOrHold(x.availability_evidence, ["object_id","sha256","verified_replica_count","exact_bytes_verified","evidence_sha256"], "availability_evidence", reasons);
exactKeysOrHold(x.corroboration_evidence, ["object_id","sha256","independent_source_count","conflict_detected","evidence_sha256"], "corroboration_evidence", reasons);
exactKeysOrHold(x.reproducibility_evidence, ["object_id","sha256","independent_verifier_count","replay_verified","evidence_sha256"], "reproducibility_evidence", reasons);
exactKeysOrHold(x.phase_context, ["phase","authority_mode","validator_admission_authority_active"], "phase_context", reasons);
exactKeysOrHold(x.authority_scope, ["source_only","public_read_only","chain2050_write_authorized","validator_mutation_authorized","governance_mutation_authorized","signer_or_wallet_access","work_credit_award_authorized","runtime_service_action","funds_action"], "authority_scope", reasons);
if (reasons.length) emitHold(reasons);

const object = x.object;
const weighted = x.weighted_record;
const manifest = x.manifest_record;
const proof = x.object_proof;
const dedupe = x.dedupe_evidence;
const availability = x.availability_evidence;
const corroboration = x.corroboration_evidence;
const reproducibility = x.reproducibility_evidence;
const phase = x.phase_context;
const weights = x.requester_weights_bps;
const auth = x.authority_scope;

if (typeof object.object_id !== "string" || object.object_id.length < 1) reasons.push("object_id_missing");
if (!SHA256.test(String(object.content_sha256 || ""))) reasons.push("content_sha256_invalid");
if (!Number.isSafeInteger(object.byte_length) || object.byte_length < 1 || object.byte_length > 268435456) reasons.push("byte_length_invalid");
if (!Number.isFinite(Date.parse(String(object.observed_at_utc || "")))) reasons.push("observed_at_invalid");

for (const [name, source] of [
  ["weighted_record", weighted],
  ["manifest_record", manifest],
  ["object_proof", proof],
  ["dedupe_evidence", dedupe],
  ["availability_evidence", availability],
  ["corroboration_evidence", corroboration],
  ["reproducibility_evidence", reproducibility],
]) {
  if (source.object_id !== object.object_id) reasons.push(name + "_object_id_mismatch");
  if (source.sha256 !== object.content_sha256) reasons.push(name + "_content_sha256_mismatch");
}

if (weighted.verification_state !== "verified") reasons.push("verification_not_verified");
if (weighted.freshness_state !== "fresh") reasons.push("freshness_not_fresh");
if (weighted.suspicion_state !== "clean") reasons.push("suspicion_not_clean");
if (weighted.tombstone_state !== "active") reasons.push("tombstone_not_active");
if (typeof weighted.source_id !== "string" || weighted.source_id.length < 1) reasons.push("source_id_missing");
if (weighted.promotion_eligible !== true) reasons.push("weighted_record_not_promotion_eligible");

if (manifest.bytes !== object.byte_length) reasons.push("manifest_byte_length_mismatch");
if (proof.bytes !== object.byte_length) reasons.push("object_proof_byte_length_mismatch");
if (manifest.receipt_marker !== "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1") reasons.push("receipt_marker_invalid");
if (manifest.receipt_valid_for_current_object !== true) reasons.push("receipt_not_valid_for_current_object");
if (proof.exact_bytes_verified !== true) reasons.push("exact_bytes_not_verified");

if (dedupe.duplicate_detected !== false) reasons.push("duplicate_detected");
if (!SHA256.test(String(dedupe.evidence_sha256 || ""))) reasons.push("dedupe_evidence_hash_invalid");
else if (dedupe.evidence_sha256 !== evidenceMaterialHash(dedupe)) reasons.push("dedupe_evidence_hash_mismatch");

if (!Number.isSafeInteger(availability.verified_replica_count) || availability.verified_replica_count < 1) reasons.push("verified_replica_missing");
if (availability.exact_bytes_verified !== true) reasons.push("availability_exact_bytes_not_verified");
if (!SHA256.test(String(availability.evidence_sha256 || ""))) reasons.push("availability_evidence_hash_invalid");
else if (availability.evidence_sha256 !== evidenceMaterialHash(availability)) reasons.push("availability_evidence_hash_mismatch");

if (!Number.isSafeInteger(corroboration.independent_source_count) || corroboration.independent_source_count < 2) reasons.push("independent_corroboration_missing");
if (corroboration.conflict_detected !== false) reasons.push("corroboration_conflict_detected");
if (!SHA256.test(String(corroboration.evidence_sha256 || ""))) reasons.push("corroboration_evidence_hash_invalid");
else if (corroboration.evidence_sha256 !== evidenceMaterialHash(corroboration)) reasons.push("corroboration_evidence_hash_mismatch");

if (!Number.isSafeInteger(reproducibility.independent_verifier_count) || reproducibility.independent_verifier_count < 1) reasons.push("independent_reproducer_missing");
if (reproducibility.replay_verified !== true) reasons.push("reproducibility_replay_not_verified");
if (!SHA256.test(String(reproducibility.evidence_sha256 || ""))) reasons.push("reproducibility_evidence_hash_invalid");
else if (reproducibility.evidence_sha256 !== evidenceMaterialHash(reproducibility)) reasons.push("reproducibility_evidence_hash_mismatch");

if (phase.phase !== 0) reasons.push("non_phase0_generation_not_enabled");
if (phase.authority_mode !== "PHASE0_OPERATOR_ROOTED") reasons.push("phase0_authority_mode_invalid");
if (phase.validator_admission_authority_active !== false) reasons.push("validator_admission_authority_must_remain_inactive");

const expectedAuth = {
  source_only: true,
  public_read_only: true,
  chain2050_write_authorized: false,
  validator_mutation_authorized: false,
  governance_mutation_authorized: false,
  signer_or_wallet_access: false,
  work_credit_award_authorized: false,
  runtime_service_action: false,
  funds_action: false,
};
for (const [key, expected] of Object.entries(expectedAuth)) {
  if (auth[key] !== expected) reasons.push("authority_scope_invalid_" + key);
}

const weightKeys = Object.keys(weights).sort();
if (JSON.stringify(weightKeys) !== JSON.stringify([...DIMS].sort())) reasons.push("requester_weight_keys_invalid");
for (const key of DIMS) {
  if (!Number.isInteger(weights[key]) || weights[key] < 0 || weights[key] > 10000) reasons.push("requester_weight_invalid_" + key);
}
if (DIMS.reduce((n, key) => n + Number(weights[key] || 0), 0) !== 10000) reasons.push("requester_weights_must_sum_10000");

if (reasons.length) emitHold(reasons);

const dimensionSources = {
  integrity: [
    binding("weighted_record", weighted, "verification_state", weighted.verification_state, "verified"),
    binding("object_proof", proof, "exact_bytes_verified", proof.exact_bytes_verified, true),
    binding("object_proof", proof, "sha256", proof.sha256, object.content_sha256),
    binding("object_proof", proof, "bytes", proof.bytes, object.byte_length),
    binding("manifest_record", manifest, "bytes", manifest.bytes, object.byte_length),
  ],
  provenance: [
    binding("weighted_record", weighted, "source_id", weighted.source_id, "nonempty"),
    binding("manifest_record", manifest, "receipt_marker", manifest.receipt_marker, "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1"),
    binding("manifest_record", manifest, "receipt_valid_for_current_object", manifest.receipt_valid_for_current_object, true),
  ],
  freshness: [
    binding("weighted_record", weighted, "freshness_state", weighted.freshness_state, "fresh"),
  ],
  availability: [
    binding("availability_evidence", availability, "verified_replica_count", availability.verified_replica_count, ">=1"),
    binding("availability_evidence", availability, "exact_bytes_verified", availability.exact_bytes_verified, true),
  ],
  uniqueness: [
    binding("dedupe_evidence", dedupe, "duplicate_detected", dedupe.duplicate_detected, false),
  ],
  suspicion_clearance: [
    binding("weighted_record", weighted, "suspicion_state", weighted.suspicion_state, "clean"),
    binding("weighted_record", weighted, "tombstone_state", weighted.tombstone_state, "active"),
    binding("weighted_record", weighted, "promotion_eligible", weighted.promotion_eligible, true),
  ],
  corroboration: [
    binding("corroboration_evidence", corroboration, "independent_source_count", corroboration.independent_source_count, ">=2"),
    binding("corroboration_evidence", corroboration, "conflict_detected", corroboration.conflict_detected, false),
  ],
  reproducibility: [
    binding("reproducibility_evidence", reproducibility, "independent_verifier_count", reproducibility.independent_verifier_count, ">=1"),
    binding("reproducibility_evidence", reproducibility, "replay_verified", reproducibility.replay_verified, true),
  ],
};

const ruleIds = {
  integrity: "VOID_DATANET_PROMOTION_INTEGRITY_BINARY_V1",
  provenance: "VOID_DATANET_PROMOTION_PROVENANCE_BINARY_V1",
  freshness: "VOID_DATANET_PROMOTION_FRESHNESS_BINARY_V1",
  availability: "VOID_DATANET_PROMOTION_AVAILABILITY_BINARY_V1",
  uniqueness: "VOID_DATANET_PROMOTION_UNIQUENESS_BINARY_V1",
  suspicion_clearance: "VOID_DATANET_PROMOTION_SUSPICION_CLEARANCE_BINARY_V1",
  corroboration: "VOID_DATANET_PROMOTION_CORROBORATION_BINARY_V1",
  reproducibility: "VOID_DATANET_PROMOTION_REPRODUCIBILITY_BINARY_V1",
};

const objectIdSha256 = shaText(object.object_id);
const sourceBundleSha256 = shaJson(x);
const dimensions = Object.fromEntries(DIMS.map(key => [key, {
  status: "PASS",
  score_bps: 10000,
  rule_id: ruleIds[key],
  sources: dimensionSources[key],
}]));

const evidenceMap = {
  schema: "void_datanet_promotion_evidence_map_v1",
  marker: "VOID_DATANET_PROMOTION_EVIDENCE_MAP_V1",
  version: 1,
  object_id_sha256: objectIdSha256,
  content_sha256: object.content_sha256,
  source_bundle_sha256: sourceBundleSha256,
  dimensions,
  baseline_floor_bps: Math.min(...DIMS.map(k => dimensions[k].score_bps)),
  candidate_eligible: true,
  authority: {
    evidence_only: true,
    chain2050_write_authorized: false,
    validator_authority_granted: false,
    governance_mutation_authorized: false,
    automatic_promotion: false,
  },
};

const overlayScore = Math.floor(DIMS.reduce((n, key) => n + dimensions[key].score_bps * weights[key], 0) / 10000);
const evidenceMapSha256 = shaJson(evidenceMap);

const gateEvidence = {
  exact_object_identity: shaJson({object_id: object.object_id, object_id_sha256: objectIdSha256, content_sha256: object.content_sha256}),
  byte_integrity: shaJson({weighted_verification: weighted.verification_state, proof}),
  manifest_integrity: shaJson(manifest),
  provenance_binding: shaJson({source_id: weighted.source_id, manifest}),
  replay_resistance: dedupe.evidence_sha256,
  authorization_scope: shaJson(auth),
  ranking_vector_complete: evidenceMapSha256,
  phase_authority_compatible: shaJson(phase),
};

const candidate = {
  schema: "void_datanet_chain_promotion_candidate_v1",
  marker: "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1",
  version: 1,
  parent_policy: "VOID_DATANET_CHAIN_TRUTH_MEMBRANE_WC_EXCHANGE_V1_20260921",
  candidate: {
    candidate_id: "voiddcp1_" + shaJson({sourceBundleSha256, objectIdSha256, content_sha256: object.content_sha256}).slice(0, 32),
    object_id_sha256: objectIdSha256,
    content_sha256: object.content_sha256,
    byte_length: object.byte_length,
    data_weight_record_sha256: shaJson(weighted),
    observed_at_utc: object.observed_at_utc,
  },
  ranking: {
    network_baseline: {
      method_id: "VOID_DATANET_BASELINE_FLOOR_V1",
      dimension_scores_bps: Object.fromEntries(DIMS.map(key => [key, dimensions[key].score_bps])),
      baseline_floor_bps: evidenceMap.baseline_floor_bps,
      components_inspectable: true,
      ranking_is_authority: false,
    },
    requester_overlay: {
      method_id: "VOID_DATANET_REQUESTER_WEIGHTED_ATTENTION_V1",
      weights_bps: weights,
      overlay_score_bps: overlayScore,
      may_change_baseline_evidence: false,
      may_override_hard_gate: false,
      grants_authority: false,
    },
  },
  hard_gates: GATES.map(gate_id => ({
    gate_id,
    status: "PASS",
    required_for_consideration: true,
    evidence_sha256: gateEvidence[gate_id],
  })),
  phase_context: {
    phase: 0,
    authority_mode: "PHASE0_OPERATOR_ROOTED",
    validator_admission_authority_active: false,
  },
  admission: {
    qualified_for_consideration: true,
    operator_review_permitted: true,
    validator_consideration_permitted: false,
    disposition: "PHASE0_OPERATOR_REVIEW_ONLY",
    canonical_write_authorized: false,
    automatic_promotion: false,
  },
  authority: {
    source_only: true,
    candidate_only: true,
    chain2050_write_authorized: false,
    validator_vote_cast: false,
    validator_quorum_satisfied: false,
    validator_mutation_authorized: false,
    governance_mutation_authorized: false,
    sovereign_protocol_mutation_authorized: false,
    sovereign_chain_stop_authorized: false,
    signer_or_wallet_access: false,
    work_credit_award_authorized: false,
    runtime_service_action: false,
    funds_action: false,
  },
};

try {
  fs.writeFileSync(mapOut, JSON.stringify(evidenceMap, null, 2) + "\n", {flag:"wx"});
  fs.writeFileSync(candidateOut, JSON.stringify(candidate, null, 2) + "\n", {flag:"wx"});
} catch (error) {
  for (const output of [mapOut, candidateOut]) {
    try { if (fs.existsSync(output)) fs.unlinkSync(output); } catch {}
  }
  process.stderr.write("VOID_DATANET_PROMOTION_EVIDENCE_OUTPUT_WRITE_FAIL " + String(error?.message || error) + "\n");
  process.exit(2);
}

process.stdout.write(JSON.stringify({
  marker: "VOID_DATANET_PROMOTION_EVIDENCE_GENERATOR_V1_GREEN",
  status: "GREEN",
  evidence_map_sha256: evidenceMapSha256,
  candidate_id: candidate.candidate.candidate_id,
  baseline_floor_bps: evidenceMap.baseline_floor_bps,
  requester_overlay_score_bps: overlayScore,
  phase: 0,
  validator_admission_authority_active: false,
  canonical_write_authorized: false,
  automatic_promotion: false,
}, null, 2) + "\n");
