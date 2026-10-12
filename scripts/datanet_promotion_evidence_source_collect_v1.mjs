#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";

const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_OBJECT_BYTES = 16 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const SHA256 = /^[0-9a-f]{64}$/;
const EVIDENCE_LOCATOR = /^evidence:\/\/[^\s]{1,480}$/;
const DIMS = [
  "integrity","provenance","freshness","availability",
  "uniqueness","suspicion_clearance","corroboration","reproducibility",
];

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonical(value[key]),
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

function shaBuffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function shaJson(value) {
  return shaBuffer(Buffer.from(canonical(value), "utf8"));
}

function evidenceMaterialHash(record) {
  const { evidence_sha256: _ignored, ...material } = record;
  return shaJson(material);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function emitHold(...reasons) {
  const out = {
    marker: "VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_HOLD_V1",
    status: "HOLD",
    reasons: [...new Set(reasons.flat().filter(Boolean))].sort(),
    source_bundle_written: false,
    chain2050_write_authorized: false,
    datanet_mutation_authorized: false,
    validator_authority_granted: false,
    automatic_promotion: false,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(3);
}

function failInput(message) {
  process.stderr.write("VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_INPUT_ERROR " + message + "\n");
  process.exit(2);
}

function exactKeys(obj, expected) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return JSON.stringify(Object.keys(obj).sort()) === JSON.stringify([...expected].sort());
}

function parseBase(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch (error) {
    emitHold("base_url_invalid");
  }
  if (!["http:", "https:"].includes(url.protocol)) emitHold("base_protocol_invalid");
  if (url.username || url.password) emitHold("base_credentials_forbidden");
  if (url.search || url.hash) emitHold("base_query_or_fragment_forbidden");
  if (url.pathname !== "/" && url.pathname !== "") emitHold("base_path_must_be_root");
  return url.origin;
}

async function fetchBounded(base, route, label, maxBytes, json) {
  let response;
  try {
    response = await fetch(base + route, {
      method: "GET",
      redirect: "error",
      headers: { accept: json ? "application/json" : "application/octet-stream" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    emitHold(label + "_fetch_failed");
  }

  if (response.status !== 200) emitHold(label + "_http_status_" + response.status);

  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader !== null) {
    const n = Number(lengthHeader);
    if (!Number.isSafeInteger(n) || n < 0 || n > maxBytes) {
      emitHold(label + "_content_length_invalid");
    }
  }

  let bytes;
  try {
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    emitHold(label + "_body_read_failed");
  }
  if (bytes.length > maxBytes) emitHold(label + "_body_too_large");

  if (!json) return bytes;

  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    emitHold(label + "_json_invalid");
  }
  return parsed;
}

function readExternalEvidence(path) {
  if (!path || !fs.existsSync(path)) emitHold("external_evidence_missing");
  let text;
  try {
    text = fs.readFileSync(path, "utf8");
  } catch (error) {
    failInput(String(error?.message || error));
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    emitHold("external_evidence_json_invalid");
  }
}

function validateExternalEvidence(bundle, objectId, sha256) {
  const reasons = [];
  if (!exactKeys(bundle, [
    "schema","marker","version","corroboration_evidence",
    "reproducibility_evidence","authority",
  ])) reasons.push("external_evidence_keys_invalid");
  if (bundle.schema !== "void_datanet_promotion_external_evidence_v1") reasons.push("external_evidence_schema_invalid");
  if (bundle.marker !== "VOID_DATANET_PROMOTION_EXTERNAL_EVIDENCE_V1") reasons.push("external_evidence_marker_invalid");
  if (bundle.version !== 1) reasons.push("external_evidence_version_invalid");

  const corr = bundle.corroboration_evidence;
  const repro = bundle.reproducibility_evidence;
  if (!exactKeys(corr, [
    "object_id","sha256","source_locator","independent_source_count",
    "conflict_detected","evidence_sha256",
  ])) reasons.push("corroboration_keys_invalid");
  if (!exactKeys(repro, [
    "object_id","sha256","source_locator","independent_verifier_count",
    "replay_verified","evidence_sha256",
  ])) reasons.push("reproducibility_keys_invalid");

  for (const [name, record] of [["corroboration", corr], ["reproducibility", repro]]) {
    if (!record || typeof record !== "object") {
      reasons.push(name + "_missing");
      continue;
    }
    if (record.object_id !== objectId) reasons.push(name + "_object_id_mismatch");
    if (record.sha256 !== sha256) reasons.push(name + "_sha256_mismatch");
    if (!EVIDENCE_LOCATOR.test(String(record.source_locator || ""))) reasons.push(name + "_source_locator_invalid");
    if (!SHA256.test(String(record.evidence_sha256 || ""))) reasons.push(name + "_evidence_sha256_invalid");
    else if (record.evidence_sha256 !== evidenceMaterialHash(record)) reasons.push(name + "_evidence_sha256_mismatch");
  }

  if (!Number.isSafeInteger(corr?.independent_source_count) || corr.independent_source_count < 2) {
    reasons.push("corroboration_independent_sources_insufficient");
  }
  if (corr?.conflict_detected !== false) reasons.push("corroboration_conflict_detected");
  if (!Number.isSafeInteger(repro?.independent_verifier_count) || repro.independent_verifier_count < 1) {
    reasons.push("reproducibility_independent_verifier_missing");
  }
  if (repro?.replay_verified !== true) reasons.push("reproducibility_replay_not_verified");

  const expectedAuthority = {
    evidence_only: true,
    chain2050_write_authorized: false,
    validator_authority_granted: false,
    governance_mutation_authorized: false,
    signer_or_wallet_access: false,
    work_credit_award_authorized: false,
    runtime_service_action: false,
    funds_action: false,
  };
  if (!exactKeys(bundle.authority, Object.keys(expectedAuthority))) reasons.push("external_authority_keys_invalid");
  for (const [key, expected] of Object.entries(expectedAuthority)) {
    if (bundle.authority?.[key] !== expected) reasons.push("external_authority_invalid_" + key);
  }

  if (reasons.length) emitHold(reasons);
  return { corr, repro };
}

function writeCreateOnly(path, value) {
  if (fs.existsSync(path)) failInput("output already exists: " + path);
  let fd;
  try {
    fd = fs.openSync(path, "wx", 0o600);
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
  } catch (error) {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
        process.stderr.write(
          "VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_CLOSE_FAIL " +
          String(closeError?.message || closeError) + "\n",
        );
      }
    }
    try {
      if (fs.existsSync(path)) fs.unlinkSync(path);
    } catch (cleanupError) {
      process.stderr.write(
        "VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_CLEANUP_FAIL " +
        String(cleanupError?.message || cleanupError) + "\n",
      );
    }
    failInput(String(error?.message || error));
  }
}

const baseRaw = arg("--base");
const objectId = arg("--object-id");
const observedAtRaw = arg("--observed-at");
const externalPath = arg("--external-evidence");
const outPath = arg("--out");

if (!baseRaw || !objectId || !observedAtRaw || !outPath) {
  failInput(
    "usage: datanet_promotion_evidence_source_collect_v1.mjs " +
    "--base URL --object-id ID --observed-at ISO8601 --external-evidence FILE --out SOURCE.json",
  );
}
if (objectId.length > 512 || objectId.includes("\0")) emitHold("object_id_invalid");
if (fs.existsSync(outPath)) failInput("output already exists: " + outPath);

const base = parseBase(baseRaw);
let observedAt;
try {
  observedAt = new Date(observedAtRaw).toISOString();
} catch (error) {
  emitHold("observed_at_invalid");
}
if (!Number.isFinite(Date.parse(observedAtRaw))) emitHold("observed_at_invalid");

const external = readExternalEvidence(externalPath);

const weightedDoc = await fetchBounded(
  base, "/public-node/local-data-drop/weighted.json",
  "weighted", MAX_JSON_BYTES, true,
);
const manifestDoc = await fetchBounded(
  base, "/public-node/local-data-drop/manifest.json",
  "manifest", MAX_JSON_BYTES, true,
);

if (weightedDoc.marker !== "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1") {
  emitHold("weighted_marker_invalid");
}
if (manifestDoc.marker !== "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1") {
  emitHold("manifest_marker_invalid");
}
if (manifestDoc.manifest_root_marker !== "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1") {
  emitHold("manifest_root_marker_invalid");
}

const weightedMatches = (weightedDoc.weighted_records || []).filter(
  (record) => record?.object_id === objectId,
);
const manifestMatches = (manifestDoc.objects || []).filter(
  (record) => record?.object_id === objectId,
);
if (weightedMatches.length !== 1) emitHold("weighted_object_identity_not_unique");
if (manifestMatches.length !== 1) emitHold("manifest_object_identity_not_unique");

const weighted = weightedMatches[0];
const manifest = manifestMatches[0];
const sha256 = String(manifest.sha256 || "");
const byteLength = manifest.bytes;

if (!SHA256.test(sha256)) emitHold("manifest_sha256_invalid");
if (weighted.sha256 !== sha256) emitHold("weighted_manifest_sha256_mismatch");
if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > MAX_OBJECT_BYTES) {
  emitHold("collector_object_size_unsupported");
}
if (weighted.receipt_valid_for_current_object === false) emitHold("weighted_receipt_invalid");

const proofRoute = "/public-node/local-data-drop/proof/" + sha256 + ".json";
const contentRoute = "/public-node/local-data-drop/by-sha256/" + sha256;
const objectRoute = "/public-node/local-data-drop/" + encodeURIComponent(objectId);

const proof = await fetchBounded(base, proofRoute, "proof", MAX_JSON_BYTES, true);
if (proof.marker !== "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1") emitHold("proof_marker_invalid");
if (proof.object_id !== objectId) emitHold("proof_object_id_mismatch");
if (proof.sha256 !== sha256) emitHold("proof_sha256_mismatch");
if (proof.bytes !== byteLength) emitHold("proof_byte_length_mismatch");
if (proof.receipt_marker !== "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1") emitHold("proof_receipt_marker_invalid");
if (proof.receipt_sha256 !== sha256) emitHold("proof_receipt_sha256_mismatch");
if (proof.receipt_valid_for_current_object !== true) emitHold("proof_receipt_invalid");
if (proof.public_upload !== false) emitHold("proof_public_upload_must_be_false");
if (proof.operator_local_import_only !== true) emitHold("proof_operator_local_import_only_required");
if (proof.public_read_only !== true) emitHold("proof_public_read_only_required");
if (proof.trusted_as_network_truth !== false) emitHold("proof_network_truth_claim_forbidden");

const contentBySha = await fetchBounded(base, contentRoute, "content_address", MAX_OBJECT_BYTES, false);
const contentById = await fetchBounded(base, objectRoute, "object_id", MAX_OBJECT_BYTES, false);
if (contentBySha.length !== byteLength || contentById.length !== byteLength) emitHold("fetched_byte_length_mismatch");
if (shaBuffer(contentBySha) !== sha256) emitHold("content_address_sha256_mismatch");
if (shaBuffer(contentById) !== sha256) emitHold("object_id_sha256_mismatch");
if (!contentBySha.equals(contentById)) emitHold("public_fetch_routes_disagree");

const sameSha = (manifestDoc.objects || []).filter(
  (record) => record?.sha256 === sha256,
);
const duplicateDetected = sameSha.some((record) => record?.object_id !== objectId);

const dedupeEvidence = {
  object_id: objectId,
  sha256,
  source_locator: "/public-node/local-data-drop/manifest.json",
  duplicate_detected: duplicateDetected,
};
dedupeEvidence.evidence_sha256 = evidenceMaterialHash(dedupeEvidence);

const availabilityEvidence = {
  object_id: objectId,
  sha256,
  source_locator: contentRoute,
  verified_replica_count: 1,
  exact_bytes_verified: true,
};
availabilityEvidence.evidence_sha256 = evidenceMaterialHash(availabilityEvidence);

const { corr, repro } = validateExternalEvidence(external, objectId, sha256);

const weights = Object.fromEntries(DIMS.map((key) => [key, 1250]));
const source = {
  schema: "void_datanet_promotion_evidence_source_v1",
  marker: "VOID_DATANET_PROMOTION_EVIDENCE_SOURCE_V1",
  version: 1,
  object: {
    object_id: objectId,
    content_sha256: sha256,
    byte_length: byteLength,
    observed_at_utc: observedAt,
  },
  weighted_record: {
    object_id: objectId,
    sha256,
    source_locator: "/public-node/local-data-drop/weighted.json",
    verification_state: weighted.verification_state,
    freshness_state: weighted.freshness_state,
    suspicion_state: weighted.suspicion_state,
    tombstone_state: weighted.tombstone_state,
    source_id: weighted.source_id,
    promotion_eligible: weighted.promotion_eligible,
  },
  manifest_record: {
    object_id: objectId,
    sha256,
    source_locator: "/public-node/local-data-drop/manifest.json",
    bytes: byteLength,
    receipt_marker: manifest.receipt_marker,
    receipt_valid_for_current_object: manifest.receipt_valid_for_current_object,
  },
  object_proof: {
    object_id: objectId,
    sha256,
    source_locator: proofRoute,
    bytes: byteLength,
    exact_bytes_verified: true,
  },
  dedupe_evidence: dedupeEvidence,
  availability_evidence: availabilityEvidence,
  corroboration_evidence: corr,
  reproducibility_evidence: repro,
  phase_context: {
    phase: 0,
    authority_mode: "PHASE0_OPERATOR_ROOTED",
    validator_admission_authority_active: false,
  },
  requester_weights_bps: weights,
  authority_scope: {
    source_only: true,
    public_read_only: true,
    chain2050_write_authorized: false,
    validator_mutation_authorized: false,
    governance_mutation_authorized: false,
    signer_or_wallet_access: false,
    work_credit_award_authorized: false,
    runtime_service_action: false,
    funds_action: false,
  },
};

writeCreateOnly(outPath, source);

process.stdout.write(JSON.stringify({
  marker: "VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_V1_GREEN",
  status: "GREEN",
  object_id: objectId,
  content_sha256: sha256,
  byte_length: byteLength,
  observed_at_utc: observedAt,
  dedupe_duplicate_detected: duplicateDetected,
  verified_replica_count: 1,
  external_corroboration_sources: corr.independent_source_count,
  external_reproducibility_verifiers: repro.independent_verifier_count,
  source_bundle_sha256: shaJson(source),
  phase: 0,
  chain2050_write_authorized: false,
  datanet_mutation_authorized: false,
  validator_authority_granted: false,
  automatic_promotion: false,
}, null, 2) + "\n");
