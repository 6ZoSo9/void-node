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
    readiness: { ready: true, gap: 0, txroot_live: 1 },
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
assert.deepEqual(config.nodes.map((node) => node.name), ["precision", "nimo", "xiphos"]);
assert.equal(config.nodes.some((node) => node.name === "alienware"), false);
assert.equal(config.nodes[0].transport, "local");
assert.equal(config.nodes[1].transport, "ssh");
assert.deepEqual(config.nodes[2], {
  name: "xiphos",
  transport: "ssh",
  ssh_target: "REPLACE_WITH_XIPHOS_SSH_ALIAS",
  repo: "~/dev/void-node",
  service: "void-node-live.service",
  http_base: "http://127.0.0.1:4102",
  min_peers: 1,
});

const xiphosCatchup = classifyNodeSnapshotV1(
  greenSnapshot({
    readiness: { ready: false, gap: 999, txroot_live: 0 },
    peers: { connected: [], knownAddrs: [], verifiedPeers: [] },
  }),
  { relation: "current", commits_behind: 0, path_classification: classifyChangedPathsV1([]) },
  config.nodes[2].min_peers,
);
assert.equal(xiphosCatchup.classification, "HOLD");
assert.ok(xiphosCatchup.reasons.includes("readiness_not_green"));
assert.ok(xiphosCatchup.reasons.includes("peer_floor_not_met"));

const xiphosGapClosedWithoutTxroot = classifyNodeSnapshotV1(
  greenSnapshot({
    readiness: { ready: true, gap: 0, txroot_live: 0 },
    peers: { connected: [], knownAddrs: [], verifiedPeers: [] },
  }),
  { relation: "current", commits_behind: 0, path_classification: classifyChangedPathsV1([]) },
  config.nodes[2].min_peers,
);
assert.equal(xiphosGapClosedWithoutTxroot.classification, "HOLD");
assert.ok(xiphosGapClosedWithoutTxroot.reasons.includes("readiness_not_green"));
assert.ok(xiphosGapClosedWithoutTxroot.reasons.includes("peer_floor_not_met"));

for (const [name, readiness] of [
  ["missing_gap", { ready: true, txroot_live: 1 }],
  ["string_gap", { ready: true, gap: "0", txroot_live: 1 }],
  ["array_gap", { ready: true, gap: [0], txroot_live: 1 }],
  ["null_gap", { ready: true, gap: null, txroot_live: 1 }],
  ["object_gap", { ready: true, gap: {}, txroot_live: 1 }],
]) {
  const result = classifyNodeSnapshotV1(
    greenSnapshot({ readiness }),
    { relation: "current", commits_behind: 0, path_classification: classifyChangedPathsV1([]) },
    config.nodes[2].min_peers,
  );
  assert.equal(result.classification, "HOLD", name);
  assert.deepEqual(result.reasons, ["readiness_not_green"], name);
}

const xiphosTxrootWithoutPeer = classifyNodeSnapshotV1(
  greenSnapshot({
    readiness: { ready: true, gap: 0, txroot_live: 1 },
    peers: { connected: [], knownAddrs: [], verifiedPeers: [] },
  }),
  { relation: "current", commits_behind: 0, path_classification: classifyChangedPathsV1([]) },
  config.nodes[2].min_peers,
);
assert.equal(xiphosTxrootWithoutPeer.classification, "HOLD");
assert.deepEqual(xiphosTxrootWithoutPeer.reasons, ["peer_floor_not_met"]);

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

const retiredMarker = "VOID_RETIRED_ALIENWARE_OPERATOR_COMMAND_HOLD_V1";
const makefile = readFileSync(new URL("../Makefile", import.meta.url), "utf8");
assert.equal((makefile.match(new RegExp(retiredMarker, "g")) ?? []).length, 5);
for (const target of [
  "alienware-bootstrap",
  "alienware-update",
  "alienware-remote-update",
  "alienware-funnel-public-seed",
  "prove-alienware-follower-autostart",
]) {
  assert.ok(
    makefile.includes(`${retiredMarker} target=${target}`),
    `retired target is not fail-closed: ${target}`,
  );
}
assert.equal(
  makefile.includes("'  make alienware-"),
  false,
  "Makefile help must not advertise retired Alienware commands",
);

for (const relativePath of [
  "../ops/install-devbox-ubuntu.sh",
  "../ops/install-user-units.sh",
  "../ops/install-path-status.sh",
]) {
  const text = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  assert.equal(text.includes("make alienware-"), false, relativePath);
  assert.ok(text.includes("void-nimo-no-tailnet-onboarding-v1.md"), relativePath);
  assert.ok(text.includes("void-xiphos-node-onboarding-v1.md"), relativePath);
  assert.ok(text.includes("void-node-fleet-drift-audit-v1.md"), relativePath);
}

const retiredRunbook = readFileSync(
  new URL("../ops/SECOND_MACHINE_ONBOARDING.md", import.meta.url),
  "utf8",
);
assert.ok(retiredRunbook.includes("Historical retired-host record"));
assert.ok(retiredRunbook.includes("Alienware is permanently retired"));
assert.ok(retiredRunbook.includes("Precision, Nimo, and Xiphos"));

const operatorContact = readFileSync(
  new URL("../ops/mainnet/operator-contact.zoso.md", import.meta.url),
  "utf8",
);
assert.ok(operatorContact.includes("active operator fleet: Precision, Nimo, and Xiphos"));
assert.ok(operatorContact.includes("Alienware is retired"));
assert.equal(
  operatorContact.includes("running the Precision and Alienware nodes"),
  false,
);

const validatorPromotionPlan = readFileSync(
  new URL("../ops/mainnet/validator-admission-promotion-plan.zoso.md", import.meta.url),
  "utf8",
);
assert.ok(
  validatorPromotionPlan.includes(
    "selected peer must be Nimo or Xiphos; retired Alienware must not satisfy this gate",
  ),
);
assert.equal(
  validatorPromotionPlan.includes("Prove Precision and Alienware both read"),
  false,
);

const fleetWorkflow = readFileSync(
  new URL("../.github/workflows/void-node-fleet-drift-audit-v1.yml", import.meta.url),
  "utf8",
);
const pullStart = fleetWorkflow.indexOf("  pull_request:\n");
const pushStart = fleetWorkflow.indexOf("  push:\n");
const permissionsStart = fleetWorkflow.indexOf("\npermissions:\n");
assert.ok(pullStart >= 0 && pushStart > pullStart && permissionsStart > pushStart);
const pullBlock = fleetWorkflow.slice(pullStart, pushStart);
const pushBlock = fleetWorkflow.slice(pushStart, permissionsStart);
for (const relativePath of [
  "ops/mainnet/operator-contact.zoso.md",
  "ops/mainnet/validator-admission-promotion-plan.zoso.md",
]) {
  const token = `- "${relativePath}"`;
  assert.equal(
    pullBlock.split(token).length - 1,
    1,
    `pull_request trigger mismatch: ${relativePath}`,
  );
  assert.equal(
    pushBlock.split(token).length - 1,
    1,
    `push trigger mismatch: ${relativePath}`,
  );
}

for (const relativePath of [
  "../ops/alienware-bootstrap-node-helper-relayer.sh",
  "../ops/alienware-update-node-helper-relayer.sh",
  "../ops/alienware-remote-update.sh",
  "../ops/public/alienware-funnel-public-seed-v1.sh",
  "../ops/prove-alienware-follower-autostart.sh",
]) {
  const text = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const lines = text.split(/\r?\n/);
  assert.equal(lines[0], "#!/usr/bin/env bash", relativePath);
  assert.ok(
    lines[1].includes("VOID_RETIRED_ALIENWARE_SCRIPT_HOLD_V1"),
    `retired script guard marker missing: ${relativePath}`,
  );
  assert.equal(lines[2], "exit 2", `retired script does not fail closed: ${relativePath}`);
}

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
console.log("gap_exact_numeric_zero_required=true");
console.log("txroot_live_required=true");
console.log("live_peer_required=true");
console.log("evidence_only_drift=true");
console.log("runtime_relevant_drift=true");
console.log("dirty_and_diverged_hold=true");
console.log("deterministic_audit_id=true");
console.log("retired_alienware_operator_commands_hold=true");
console.log("retired_alienware_direct_scripts_hold=true");
console.log("active_operator_topology_docs_pinned=true");
console.log("active_operator_topology_trigger_symmetry=true");
console.log("mutation_attempted=false");
