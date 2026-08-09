#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  VOID_NODE_FLEET_DRIFT_AUDIT_V1,
  buildFleetDecisionV1,
  classifyChangedPathsV1,
  classifyNodeSnapshotV1,
  exampleFleetConfigV1,
} from "../tools/void-node-fleet-drift-audit-v1.mjs";

const shaA = "a".repeat(40);
const shaB = "b".repeat(40);

function greenSnapshot(overrides = {}) {
  return {
    reachable: true,
    repo_ok: true,
    head: shaA,
    branch: "main",
    dirty_count: 0,
    service_active: true,
    health_json_ok: true,
    health: { ok: true },
    readiness_json_ok: true,
    readiness: { ready: true, gap: 0 },
    peers_json_ok: true,
    peers: {
      connected: [{ id: "peer", addr: "127.0.0.1:4700" }],
      knownAddrs: ["127.0.0.1:4700"],
      verifiedPeers: [],
    },
    ...overrides,
  };
}

const evidence = classifyChangedPathsV1([
  "docs/public/example.md",
  ".github/workflows/example.yml",
  "scripts/prove_example.mjs",
]);
assert.equal(evidence.runtime_relevant_path_count, 0);
assert.equal(evidence.evidence_only_path_count, 3);

const runtime = classifyChangedPathsV1([
  "src/node_core.ts",
  "ops/voidctl",
  "public/index.html",
  "contracts/mainnet0/VoidValidatorCandidateRegistry.sol",
  "integrations/agents/example/index.mjs",
]);
assert.equal(runtime.runtime_relevant_path_count, 5);

const unknown = classifyChangedPathsV1(["mystery/new-runtime.bin"]);
assert.deepEqual(unknown.review_required, ["mystery/new-runtime.bin"]);
assert.equal(unknown.runtime_relevant_path_count, 1);

const current = classifyNodeSnapshotV1(
  greenSnapshot(),
  { relation: "current", commits_behind: 0, path_classification: classifyChangedPathsV1([]) },
  1,
);
assert.equal(current.classification, "CURRENT");
assert.deepEqual(current.reasons, []);

const evidenceBehind = classifyNodeSnapshotV1(
  greenSnapshot(),
  { relation: "behind", commits_behind: 8, path_classification: evidence },
  1,
);
assert.equal(evidenceBehind.classification, "BEHIND_EVIDENCE_ONLY");

const runtimeBehind = classifyNodeSnapshotV1(
  greenSnapshot(),
  { relation: "behind", commits_behind: 8, path_classification: runtime },
  1,
);
assert.equal(runtimeBehind.classification, "BEHIND_RUNTIME_RELEVANT");

for (const [name, snapshot, comparison, expectedReason] of [
  ["dirty", greenSnapshot({ dirty_count: 1 }), { relation: "behind", path_classification: runtime }, "worktree_dirty"],
  ["service", greenSnapshot({ service_active: false }), { relation: "current" }, "service_inactive"],
  ["health", greenSnapshot({ health: { ok: false } }), { relation: "current" }, "health_not_green"],
  ["ready", greenSnapshot({ readiness: { ready: false, gap: 1 } }), { relation: "current" }, "readiness_not_green"],
  [
    "peers",
    greenSnapshot({
      peers: {
        connected: [],
        knownAddrs: ["127.0.0.1:4700"],
        verifiedPeers: [{ node_id: "cached-peer", addresses: ["127.0.0.1:4700"] }],
      },
    }),
    { relation: "current" },
    "peer_floor_not_met",
  ],
  ["diverged", greenSnapshot(), { relation: "diverged" }, "git_diverged"],
]) {
  const result = classifyNodeSnapshotV1(snapshot, comparison, 1);
  assert.equal(result.classification, "HOLD", name);
  assert.ok(result.reasons.includes(expectedReason), `${name}: ${expectedReason}`);
}

const unreachable = classifyNodeSnapshotV1({ reachable: false }, { relation: "unavailable" }, 1);
assert.equal(unreachable.classification, "HOLD");
assert.ok(unreachable.reasons.includes("node_unreachable"));

const fleetCurrent = buildFleetDecisionV1(shaB, [
  { name: "precision", head: shaB, classification: "CURRENT", reasons: [], comparison: { relation: "current", commits_behind: 0 } },
  { name: "nimo", head: shaB, classification: "CURRENT", reasons: [], comparison: { relation: "current", commits_behind: 0 } },
]);
assert.equal(fleetCurrent.decision, "CURRENT");
assert.equal(fleetCurrent.convergence_candidates.length, 0);

const fleetBehind = buildFleetDecisionV1(shaB, [
  {
    name: "precision",
    head: shaA,
    classification: "BEHIND_RUNTIME_RELEVANT",
    reasons: [],
    comparison: { relation: "behind", commits_behind: 4, path_classification: runtime },
  },
  { name: "nimo", head: shaB, classification: "CURRENT", reasons: [], comparison: { relation: "current", commits_behind: 0 } },
]);
assert.equal(fleetBehind.decision, "CONVERGENCE_RECOMMENDED");
assert.equal(fleetBehind.convergence_candidates.length, 1);
assert.equal(fleetBehind.convergence_candidates[0].name, "precision");

const fleetHold = buildFleetDecisionV1(shaB, [
  { name: "precision", head: shaA, classification: "HOLD", reasons: ["worktree_dirty"], comparison: { relation: "behind" } },
]);
assert.equal(fleetHold.decision, "HOLD");

const config = exampleFleetConfigV1();
assert.equal(config.nodes.length, 3);
assert.deepEqual(config.nodes.map((node) => node.name), ["precision", "nimo", "alienware"]);
assert.equal(config.nodes[0].transport, "local");
assert.equal(config.nodes[1].transport, "ssh");

const source = readFileSync(new URL("../tools/void-node-fleet-drift-audit-v1.mjs", import.meta.url), "utf8");
for (const forbidden of [
  "git fetch",
  "git pull",
  "git checkout",
  "git reset",
  "systemctl --user restart",
  "systemctl --user start",
  "systemctl --user stop",
  "eth_sendRawTransaction",
]) {
  assert.equal(source.includes(forbidden), false, `forbidden mutation token: ${forbidden}`);
}
assert.ok(source.includes("ls-remote"));
assert.ok(source.includes("BatchMode=yes"));
assert.ok(source.includes("mutation_attempted: false"));
assert.ok(source.includes("credential_read: false"));
assert.ok(source.includes("funds_moved: false"));

const repeatedA = buildFleetDecisionV1(shaB, [
  {
    name: "precision",
    head: shaA,
    classification: "BEHIND_RUNTIME_RELEVANT",
    reasons: [],
    comparison: { relation: "behind", commits_behind: 4, path_classification: runtime },
  },
]);
const repeatedB = buildFleetDecisionV1(shaB, [
  {
    name: "precision",
    head: shaA,
    classification: "BEHIND_RUNTIME_RELEVANT",
    reasons: [],
    comparison: { relation: "behind", commits_behind: 4, path_classification: runtime },
  },
]);
assert.equal(repeatedA.audit_id_sha256, repeatedB.audit_id_sha256);

console.log(`${VOID_NODE_FLEET_DRIFT_AUDIT_V1}_PROOF_GREEN`);
console.log("current_classification=true");
console.log("evidence_only_drift=true");
console.log("runtime_relevant_drift=true");
console.log("dirty_and_diverged_hold=true");
console.log("deterministic_audit_id=true");
console.log("mutation_attempted=false");
