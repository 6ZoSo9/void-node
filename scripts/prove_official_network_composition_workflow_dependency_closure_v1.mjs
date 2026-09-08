#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const officialWorkflowPath =
  ".github/workflows/official-network-authenticity-composition-gateway-v1.yml";
const discoveryWorkflowPath =
  ".github/workflows/void-public-discovery-pack-serving-v1.yml";
const closureProofPath =
  "scripts/prove_official_network_composition_workflow_dependency_closure_v1.mjs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function triggerPaths(source, trigger) {
  const lines = source.split(/\r?\n/);
  const start = lines.indexOf(`  ${trigger}:`);
  assert.notEqual(start, -1, `missing ${trigger} trigger`);

  let inPaths = false;
  const result = new Set();
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^  [A-Za-z0-9_-]+:/.test(line)) break;
    if (/^[A-Za-z0-9_-]+:/.test(line)) break;
    if (line === "    paths:") {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;
    const match = line.match(/^      - ["']([^"']+)["']\s*$/);
    if (match) result.add(match[1]);
  }
  assert.ok(result.size > 0, `${trigger}.paths must not be empty`);
  return result;
}

function executedRepoPrograms(source) {
  const result = new Set();
  const patterns = [
    /\bnode(?:\s+--check)?\s+((?:scripts|ops\/public)\/[A-Za-z0-9_./-]+\.mjs)\b/g,
    /\bpython3(?:\s+-B)?\s+(scripts\/[A-Za-z0-9_./-]+\.py)\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) result.add(match[1]);
  }
  return result;
}

function directRepoRefs(source) {
  const result = new Set();
  for (const match of source.matchAll(/path\.join\(\s*repo\s*,\s*["']([^"']+)["']/gs)) {
    result.add(match[1]);
  }
  for (const match of source.matchAll(/readFile(?:Sync)?\(\s*["']([^"']+)["']/g)) {
    result.add(match[1]);
  }
  for (const match of source.matchAll(/["'](public\/\.well-known\/[^"']+)["']/g)) {
    result.add(match[1]);
  }
  return result;
}

function assertTriggerClosure(workflowPath, source, required) {
  for (const trigger of ["push", "pull_request"]) {
    const paths = triggerPaths(source, trigger);
    for (const dependency of required) {
      assert.equal(
        paths.has(dependency),
        true,
        `${workflowPath} ${trigger}.paths missing ${dependency}`,
      );
    }
  }
}

const officialWorkflow = read(officialWorkflowPath);
const discoveryWorkflow = read(discoveryWorkflowPath);

const officialPrograms = executedRepoPrograms(officialWorkflow);
for (const requiredProgram of [
  "scripts/prove_public_app_composition_gateway_v1.mjs",
  "scripts/prove_public_participant_no_node_handoff_wall_v1.mjs",
  "scripts/prove_official_network_authenticity_well_known_v1.mjs",
  "scripts/prove_official_network_authenticity_composition_gateway_v1.mjs",
  closureProofPath,
]) {
  assert.equal(
    officialPrograms.has(requiredProgram),
    true,
    `${officialWorkflowPath} does not execute ${requiredProgram}`,
  );
}

const officialRequired = new Set([
  officialWorkflowPath,
  ...officialPrograms,
]);
for (const program of officialPrograms) {
  if (!program.endsWith(".mjs") || program === closureProofPath) continue;
  for (const dependency of directRepoRefs(read(program))) {
    officialRequired.add(dependency);
  }
}
assertTriggerClosure(officialWorkflowPath, officialWorkflow, officialRequired);

const discoveryPrograms = executedRepoPrograms(discoveryWorkflow);
for (const requiredProgram of [
  "scripts/prove_void_public_discovery_pack_serving_v1.mjs",
  "scripts/prove_public_app_composition_gateway_v1.mjs",
  "scripts/prove_official_network_authenticity_composition_gateway_v1.mjs",
  closureProofPath,
]) {
  assert.equal(
    discoveryPrograms.has(requiredProgram),
    true,
    `${discoveryWorkflowPath} does not execute ${requiredProgram}`,
  );
}

const discoveryRequired = new Set([
  discoveryWorkflowPath,
  ...discoveryPrograms,
]);
for (const program of [
  "scripts/prove_public_app_composition_gateway_v1.mjs",
  "scripts/prove_official_network_authenticity_composition_gateway_v1.mjs",
]) {
  for (const dependency of directRepoRefs(read(program))) {
    discoveryRequired.add(dependency);
  }
}
assertTriggerClosure(discoveryWorkflowPath, discoveryWorkflow, discoveryRequired);

console.log(`official_required_paths=${officialRequired.size}`);
console.log(`discovery_required_paths=${discoveryRequired.size}`);
console.log("VOID_OFFICIAL_NETWORK_COMPOSITION_WORKFLOW_DEPENDENCY_CLOSURE_V1_GREEN");
