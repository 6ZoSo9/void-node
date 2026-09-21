#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const collector = path.join(root, "scripts/datanet_promotion_evidence_source_collect_v1.mjs");
const generator = path.join(root, "scripts/datanet_promotion_candidate_generate_v1.mjs");
const externalFixturePath = path.join(
  root,
  "fixtures/architecture/datanet-promotion-external-evidence-v1.green.json",
);
const externalSchema = JSON.parse(
  fs.readFileSync(
    path.join(root, "schemas/datanet-promotion-external-evidence-v1.schema.json"),
    "utf8",
  ),
);

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

function runChild(args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const objectId = "collector-demo.txt";
const content = Buffer.from("VOID DataNet promotion evidence collector v1\n", "utf8");
const sha256 = shaBuffer(content);
const observedAt = "2026-09-21T22:30:00Z";

const state = {
  contentBySha: content,
  contentById: content,
  proofBytes: content.length,
  weightedFreshness: "fresh",
  weightedSuspicion: "clean",
  duplicate: false,
};

function weightedDoc() {
  return {
    marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1",
    object_count: 1,
    weighted_records: [{
      object_id: objectId,
      sha256,
      verification_state: "verified",
      freshness_state: state.weightedFreshness,
      suspicion_state: state.weightedSuspicion,
      tombstone_state: "active",
      source_id: "operator_local_data_drop",
      promotion_eligible: true,
    }],
  };
}

function manifestObjects() {
  const objects = [{
    object_id: objectId,
    sha256,
    bytes: content.length,
    receipt_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
    receipt_valid_for_current_object: true,
  }];
  if (state.duplicate) {
    objects.push({
      object_id: "collector-demo-copy.txt",
      sha256,
      bytes: content.length,
      receipt_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
      receipt_valid_for_current_object: true,
    });
  }
  return objects;
}

function manifestDoc() {
  return {
    marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1",
    manifest_root_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1",
    object_count: manifestObjects().length,
    objects: manifestObjects(),
  };
}

function proofDoc() {
  return {
    marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1",
    proof_type: "operator_local_public_read_only_object_proof",
    object_id: objectId,
    sha256,
    bytes: state.proofBytes,
    receipt_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
    receipt_sha256: sha256,
    receipt_valid_for_current_object: true,
    public_upload: false,
    operator_local_import_only: true,
    public_read_only: true,
    trusted_as_network_truth: false,
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const json = (value) => {
    const body = Buffer.from(JSON.stringify(value), "utf8");
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(body.length),
    });
    res.end(body);
  };
  const bytes = (value) => {
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": String(value.length),
    });
    res.end(value);
  };

  if (url.pathname === "/public-node/local-data-drop/weighted.json") return json(weightedDoc());
  if (url.pathname === "/public-node/local-data-drop/manifest.json") return json(manifestDoc());
  if (url.pathname === "/public-node/local-data-drop/proof/" + sha256 + ".json") return json(proofDoc());
  if (url.pathname === "/public-node/local-data-drop/by-sha256/" + sha256) return bytes(state.contentBySha);
  if (url.pathname === "/public-node/local-data-drop/" + encodeURIComponent(objectId)) return bytes(state.contentById);
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;

function externalEvidence() {
  const corroboration = {
    object_id: objectId,
    sha256,
    source_locator: "evidence://void/datanet/corroboration/collector-demo",
    independent_source_count: 2,
    conflict_detected: false,
  };
  corroboration.evidence_sha256 = evidenceMaterialHash(corroboration);

  const reproducibility = {
    object_id: objectId,
    sha256,
    source_locator: "evidence://void/datanet/reproducibility/collector-demo",
    independent_verifier_count: 1,
    replay_verified: true,
  };
  reproducibility.evidence_sha256 = evidenceMaterialHash(reproducibility);

  return {
    schema: "void_datanet_promotion_external_evidence_v1",
    marker: "VOID_DATANET_PROMOTION_EXTERNAL_EVIDENCE_V1",
    version: 1,
    corroboration_evidence: corroboration,
    reproducibility_evidence: reproducibility,
    authority: {
      evidence_only: true,
      chain2050_write_authorized: false,
      validator_authority_granted: false,
      governance_mutation_authorized: false,
      signer_or_wallet_access: false,
      work_credit_award_authorized: false,
      runtime_service_action: false,
      funds_action: false,
    },
  };
}

async function runCollector({
  external = externalEvidence(),
  includeExternal = true,
  baseOverride = base,
  label = "case",
} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-collector-v1-"));
  const externalPath = path.join(dir, "external.json");
  const sourceOut = path.join(dir, "source.json");
  if (includeExternal) {
    fs.writeFileSync(externalPath, JSON.stringify(external, null, 2) + "\n");
  }
  const args = [
    collector,
    "--base", baseOverride,
    "--object-id", objectId,
    "--observed-at", observedAt,
    "--external-evidence", externalPath,
    "--out", sourceOut,
  ];
  const result = await runChild(args);
  return { dir, externalPath, sourceOut, result, label };
}

async function runGenerator(sourcePath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-generator-from-collector-v1-"));
  const mapOut = path.join(dir, "map.json");
  const candidateOut = path.join(dir, "candidate.json");
  const result = await runChild([
    generator,
    "--input", sourcePath,
    "--map-out", mapOut,
    "--candidate-out", candidateOut,
  ]);
  return { dir, mapOut, candidateOut, result };
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

function assertCollectorHold(run, reason) {
  assert.equal(run.result.code, 3, run.result.stderr + run.result.stdout);
  const out = parseStdout(run.result);
  assert.equal(out.marker, "VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_HOLD_V1");
  assert.ok(out.reasons.includes(reason), `expected ${reason}, got ${out.reasons.join(",")}`);
  assert.equal(fs.existsSync(run.sourceOut), false);
  assert.equal(out.chain2050_write_authorized, false);
  assert.equal(out.datanet_mutation_authorized, false);
  assert.equal(out.validator_authority_granted, false);
}

try {
  assert.equal(
    externalSchema.$id,
    "https://voidchain.org/schemas/datanet-promotion-external-evidence-v1.schema.json",
  );
  assert.equal(
    externalSchema.$defs.authority.properties.chain2050_write_authorized.const,
    false,
  );

  const committedExternal = JSON.parse(fs.readFileSync(externalFixturePath, "utf8"));
  for (const record of [
    committedExternal.corroboration_evidence,
    committedExternal.reproducibility_evidence,
  ]) {
    assert.equal(record.evidence_sha256, evidenceMaterialHash(record));
  }

  const green = await runCollector({ label: "green" });
  assert.equal(green.result.code, 0, green.result.stderr + green.result.stdout);
  const greenOut = parseStdout(green.result);
  assert.equal(greenOut.marker, "VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_V1_GREEN");
  assert.equal(greenOut.status, "GREEN");
  assert.equal(greenOut.object_id, objectId);
  assert.equal(greenOut.content_sha256, sha256);
  assert.equal(greenOut.byte_length, content.length);
  assert.equal(greenOut.dedupe_duplicate_detected, false);
  assert.equal(greenOut.verified_replica_count, 1);
  assert.equal(greenOut.chain2050_write_authorized, false);
  assert.equal(greenOut.datanet_mutation_authorized, false);
  assert.equal(greenOut.validator_authority_granted, false);
  assert.ok(fs.existsSync(green.sourceOut));

  const source = JSON.parse(fs.readFileSync(green.sourceOut, "utf8"));
  assert.equal(source.marker, "VOID_DATANET_PROMOTION_EVIDENCE_SOURCE_V1");
  assert.equal(source.object.object_id, objectId);
  assert.equal(source.object.content_sha256, sha256);
  assert.equal(source.object.byte_length, content.length);
  assert.equal(source.manifest_record.bytes, content.length);
  assert.equal(source.object_proof.bytes, content.length);
  assert.equal(source.object_proof.exact_bytes_verified, true);
  assert.equal(source.dedupe_evidence.duplicate_detected, false);
  assert.equal(source.availability_evidence.verified_replica_count, 1);
  assert.equal(source.requester_weights_bps.integrity, 1250);
  assert.equal(
    Object.values(source.requester_weights_bps).reduce((a, b) => a + b, 0),
    10000,
  );
  assert.equal(
    source.dedupe_evidence.evidence_sha256,
    evidenceMaterialHash(source.dedupe_evidence),
  );
  assert.equal(
    source.availability_evidence.evidence_sha256,
    evidenceMaterialHash(source.availability_evidence),
  );

  const generated = await runGenerator(green.sourceOut);
  assert.equal(
    generated.result.code,
    0,
    generated.result.stderr + generated.result.stdout,
  );
  const generatedOut = parseStdout(generated.result);
  assert.equal(
    generatedOut.marker,
    "VOID_DATANET_PROMOTION_EVIDENCE_GENERATOR_V1_GREEN",
  );
  assert.equal(generatedOut.baseline_floor_bps, 10000);
  assert.equal(generatedOut.requester_overlay_score_bps, 10000);
  assert.equal(generatedOut.phase, 0);
  assert.equal(generatedOut.canonical_write_authorized, false);

  state.contentBySha = Buffer.alloc(content.length, 0x58);
  const badHash = await runCollector({ label: "same-length bad hash" });
  assertCollectorHold(badHash, "content_address_sha256_mismatch");
  state.contentBySha = content;

  state.contentBySha = Buffer.concat([content, Buffer.from("X", "utf8")]);
  const badFetchedLength = await runCollector({ label: "bad fetched length" });
  assertCollectorHold(badFetchedLength, "fetched_byte_length_mismatch");
  state.contentBySha = content;

  state.proofBytes = content.length + 1;
  const badLength = await runCollector({ label: "bad proof length" });
  assertCollectorHold(badLength, "proof_byte_length_mismatch");
  state.proofBytes = content.length;

  const missingExternal = await runCollector({
    includeExternal: false,
    label: "missing external",
  });
  assertCollectorHold(missingExternal, "external_evidence_missing");

  const tamperedExternalValue = externalEvidence();
  tamperedExternalValue.corroboration_evidence.evidence_sha256 = "f".repeat(64);
  const tamperedExternal = await runCollector({
    external: tamperedExternalValue,
    label: "tampered external",
  });
  assertCollectorHold(tamperedExternal, "corroboration_evidence_sha256_mismatch");

  const mismatchedExternalValue = externalEvidence();
  mismatchedExternalValue.reproducibility_evidence.object_id = "other-object.txt";
  mismatchedExternalValue.reproducibility_evidence.evidence_sha256 =
    evidenceMaterialHash(mismatchedExternalValue.reproducibility_evidence);
  const mismatchedExternal = await runCollector({
    external: mismatchedExternalValue,
    label: "mismatched external",
  });
  assertCollectorHold(mismatchedExternal, "reproducibility_object_id_mismatch");

  state.duplicate = true;
  const duplicate = await runCollector({ label: "duplicate" });
  assert.equal(duplicate.result.code, 0, duplicate.result.stderr + duplicate.result.stdout);
  const duplicateSource = JSON.parse(fs.readFileSync(duplicate.sourceOut, "utf8"));
  assert.equal(duplicateSource.dedupe_evidence.duplicate_detected, true);
  const duplicateGenerated = await runGenerator(duplicate.sourceOut);
  assert.equal(duplicateGenerated.result.code, 3);
  const duplicateHold = parseStdout(duplicateGenerated.result);
  assert.ok(duplicateHold.reasons.includes("duplicate_detected"));
  assert.equal(fs.existsSync(duplicateGenerated.mapOut), false);
  assert.equal(fs.existsSync(duplicateGenerated.candidateOut), false);
  state.duplicate = false;

  state.weightedFreshness = "stale";
  const stale = await runCollector({ label: "stale" });
  assert.equal(stale.result.code, 0, stale.result.stderr + stale.result.stdout);
  const staleGenerated = await runGenerator(stale.sourceOut);
  assert.equal(staleGenerated.result.code, 3);
  const staleHold = parseStdout(staleGenerated.result);
  assert.ok(staleHold.reasons.includes("freshness_not_fresh"));
  state.weightedFreshness = "fresh";

  const credentialBase = await runCollector({
    baseOverride: `http://user:pass@127.0.0.1:${address.port}`,
    label: "credential base",
  });
  assertCollectorHold(credentialBase, "base_credentials_forbidden");

  console.log("VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_V1_PROOF_GREEN");
  console.log("public_route_reads_only=true");
  console.log("weighted_manifest_proof_identity_bound=true");
  console.log("object_id_and_content_address_bytes_match=true");
  console.log("same_length_hash_tamper_holds=true");
  console.log("fetched_byte_length_tamper_holds=true");
  console.log("byte_length_bound=true");
  console.log("dedupe_derived_from_manifest=true");
  console.log("availability_derived_from_verified_fetch=true");
  console.log("corroboration_remains_external=true");
  console.log("independent_reproducibility_remains_external=true");
  console.log("external_evidence_hash_tamper_holds=true");
  console.log("missing_external_evidence_holds=true");
  console.log("duplicate_reaches_generator_hold=true");
  console.log("stale_reaches_generator_hold=true");
  console.log("credentialed_base_holds=true");
  console.log("chain2050_write_authorized=false");
  console.log("datanet_mutation_authorized=false");
  console.log("validator_authority_granted=false");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
