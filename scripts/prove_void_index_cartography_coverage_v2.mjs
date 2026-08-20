#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { buildCartography, validateRegistry } from "./generate_void_index_cartography_v1.mjs";

const MARKER = "VOID_INDEX_CARTOGRAPHY_COVERAGE_V2";
const registryPath = "docs/index-map-v1.json";
const sourcePath = "src/index.ts";
const observerEvidencePath = "runtime/canonical-producer-self-http-guard-v1.cjs";
const livenessEvidencePath = "scripts/prove_mainnet0_canonical_producer_liveness_guard_v1.mjs";

function fail(message) {
  throw new Error(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function gitStatus() {
  const result = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    encoding: "utf8",
  });
  if (result.status !== 0) fail(`git status failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

const originalStableIds = [
  "runtime.main",
  "runtime.storage-readiness",
  "chain.txroot-watchdog",
  "chain.saveblock-v7-recursion-fix",
  "buy-void.legacy-page",
  "wc.public-proof-generate",
  "wc.public-proof-success-ui",
  "datanet.public-explorer",
  "public-node.route-index",
  "public-node.self-check-ui",
  "participant.dashboard",
  "integration.participant-wallet-native",
  "integration.wc-public-capability",
  "integration.buy-void",
  "integration.validator-submit-intent",
  "integration.public-agent-service-acceptance",
];

const v2Coverage = [
  {
    id: "runtime.header3-match-exporter",
    anchor: "(function Header3MatchExporter(){",
    evidence: "observer",
  },
  {
    id: "runtime.ready-watchdog",
    anchor: "(function readyWatchdogV1(){",
    evidence: "observer",
  },
  {
    id: "runtime.proposer-activity-gauge",
    anchor: "(function proposerActivityGauge(){",
    evidence: "observer",
  },
  {
    id: "runtime.proposer-metrics-v2",
    anchor: "(function proposerMetricsV2(){",
    evidence: "observer",
  },
  {
    id: "runtime.v2fs-status-route",
    anchor: "app.get(\"/__void/metrics/proposer.commit-direct.v2fs/status.json\",",
    provenanceToken: "/__void/metrics/proposer.commit-direct.v2fs/status.json",
    evidence: "liveness",
  },
  {
    id: "runtime.autoprop-status-route",
    anchor: "app.get(\"/__void/metrics/commit-direct-autoprop.v1/status.json\",",
    provenanceToken: "/__void/metrics/commit-direct-autoprop.v1/status.json",
    evidence: "liveness",
  },
  {
    id: "runtime.v2fs-commit-route",
    anchor: "const url = base() + \"/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1\";",
    provenanceToken: "/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1",
    evidence: "liveness",
  },
];

const statusBefore = gitStatus();
const registry = validateRegistry(JSON.parse(read(registryPath)));
if (registry.source_path !== sourcePath) fail(`source path drift: ${registry.source_path}`);
if (registry.coverage_wave !== 2) fail(`coverage_wave must be 2, got ${registry.coverage_wave}`);
if (registry.coverage_baseline_landmark_count !== originalStableIds.length) {
  fail("coverage baseline landmark count drift");
}
if (registry.landmarks.length !== originalStableIds.length + v2Coverage.length) {
  fail(`expected 23 landmarks, got ${registry.landmarks.length}`);
}

const actualOriginalIds = registry.landmarks
  .slice(0, originalStableIds.length)
  .map((item) => item.id);
if (JSON.stringify(actualOriginalIds) !== JSON.stringify(originalStableIds)) {
  fail("original stable landmark IDs or order changed");
}

const byId = new Map(registry.landmarks.map((item) => [item.id, item]));
for (const expected of v2Coverage) {
  const actual = byId.get(expected.id);
  if (!actual) fail(`missing V2 landmark: ${expected.id}`);
  if (actual.anchor !== expected.anchor) fail(`V2 anchor drift: ${expected.id}`);
  if (actual.expected_occurrences !== 1) fail(`V2 occurrence contract drift: ${expected.id}`);
  if (expected.evidence === "liveness") {
    if (typeof expected.provenanceToken !== "string" || expected.provenanceToken.length === 0) {
      fail(`missing liveness provenance token: ${expected.id}`);
    }
    if (expected.anchor === expected.provenanceToken) {
      fail(`liveness navigation anchor must remain distinct from provenance token: ${expected.id}`);
    }
  }
}

const sourceBefore = read(sourcePath);
const sourceDigestBefore = sha256(sourceBefore);
const map = buildCartography({ registry, source: sourceBefore, sourcePath });
if (map.landmark_count !== 23) fail(`resolved landmark count mismatch: ${map.landmark_count}`);
if (map.source_path !== sourcePath) fail(`resolved source path mismatch: ${map.source_path}`);
if (map.source_mutation_performed !== false) fail("generator reported source mutation");

const resolvedIds = new Set(map.landmarks.map((item) => item.id));
for (const expected of v2Coverage) {
  if (!resolvedIds.has(expected.id)) fail(`V2 landmark did not resolve: ${expected.id}`);
}

const observerEvidence = read(observerEvidencePath);
const livenessEvidence = read(livenessEvidencePath);
for (const expected of v2Coverage) {
  const evidence = expected.evidence === "observer" ? observerEvidence : livenessEvidence;
  const provenanceToken = expected.provenanceToken ?? expected.anchor;
  if (!sourceBefore.includes(provenanceToken)) {
    fail(`source provenance token drift for ${expected.id}`);
  }
  if (!evidence.includes(provenanceToken)) {
    fail(`provenance evidence drift for ${expected.id} in ${expected.evidence}`);
  }
}

const sourceAfter = read(sourcePath);
if (sha256(sourceAfter) !== sourceDigestBefore || sourceAfter !== sourceBefore) {
  fail("source changed while proving cartography coverage");
}
if (gitStatus() !== statusBefore) fail("repository status changed while proving cartography coverage");

console.log(`${MARKER}_PROOF_GREEN`);
console.log(`coverage_wave=${registry.coverage_wave}`);
console.log(`baseline_landmark_count=${originalStableIds.length}`);
console.log(`added_landmark_count=${v2Coverage.length}`);
console.log(`resolved_landmark_count=${map.landmark_count}`);
console.log(`observer_provenance_bound=true`);
console.log(`liveness_navigation_anchor_unique=true`);
console.log(`liveness_route_provenance_bound=true`);
console.log(`liveness_provenance_token_separate=true`);
console.log(`original_stable_ids_preserved=true`);
console.log(`source_mutation_performed=false`);
