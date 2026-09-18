#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_CHAIN2050_DATANET_ANCHOR_BOUNDARY_V1_PROOF_GREEN";
const root = process.cwd();
const fixturePath = path.join(root, "fixtures/architecture/chain2050-datanet-anchor-boundary-v1.json");
const schemaPath = path.join(root, "schemas/chain2050-datanet-anchor-boundary-v1.schema.json");
const docPath = path.join(root, "docs/architecture/chain2050-datanet-anchor-boundary-v1.md");

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const docText = fs.readFileSync(docPath, "utf8");

assert.equal(fixture.schema, "void_chain2050_datanet_anchor_boundary_v1");
assert.equal(fixture.marker, "VOID_CHAIN2050_DATANET_ANCHOR_BOUNDARY_V1");
assert.equal(fixture.version, 1);
assert.equal(fixture.repository, "6ZoSo9/void-node");
assert.equal(fixture.source_commit, "2718a585d18c2f06903bfd033f0f5bc8c834f8a2");
assert.deepEqual(fixture.coordination, {
  doctrine: "CHAIN2050_CANONICAL_TRUTH_DATANET_BYTE_AVAILABILITY",
  issue: 1507,
  marker: "VOID_COORDINATION_CONTROL_PLANE_SUCCESSOR_V1",
});

const bindings = fixture.evidence.source_bindings;
assert.equal(bindings.length, 11);
assert.equal(new Set(bindings.map((x) => x.path)).size, bindings.length);
for (const binding of bindings) {
  assert.match(binding.git_blob_sha1, /^[0-9a-f]{40}$/);
  const result = spawnSync("git", ["hash-object", "--", binding.path], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `hash-object failed for ${binding.path}: ${result.stderr}`);
  assert.equal(result.stdout.trim(), binding.git_blob_sha1, `source binding drift: ${binding.path}`);
}

const chainFacts = new Map(fixture.chain_owns.map((x) => [x.fact_id, x]));
assert.equal(
  chainFacts.get("payment_to_fulfillment_binding")?.current_status,
  "SOURCE_IMPLEMENTED_NOT_DEPLOYED_OR_RUNTIME_BOUND",
);
assert.equal(
  chainFacts.get("datanet_object_commitment")?.current_status,
  "GAP_NOT_ON_CHAIN_CURRENT_SOURCE",
);
assert.ok(bindings.some((x) => x.path === "contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol"));
assert.ok(bindings.some((x) => x.path === "tools/datanet-field-object-pull-v1.mjs"));

assert.equal(fixture.finality.hard_finality_route_live, false);
assert.equal(fixture.finality.fork_choice_bound, false);
assert.equal(fixture.finality.peer_quorum_bound, false);

assert.equal(fixture.authority.source_only, true);
for (const [key, value] of Object.entries(fixture.authority)) {
  if (key === "source_only") continue;
  assert.equal(value, false, `authority must remain false: ${key}`);
}

assert.equal(schema.$defs.coordination.properties.issue.const, 1507);
assert.equal(
  schema.$defs.coordination.properties.marker.const,
  "VOID_COORDINATION_CONTROL_PLANE_SUCCESSOR_V1",
);
assert.equal(schema.$defs.evidence.properties.source_bindings.minItems, 11);
assert.equal(schema.$defs.evidence.properties.source_bindings.maxItems, 11);
assert.ok(
  schema.$defs.chainFact.properties.current_status.enum.includes(
    "SOURCE_IMPLEMENTED_NOT_DEPLOYED_OR_RUNTIME_BOUND",
  ),
);

assert.match(docText, /VOID_CHAIN2050_DATANET_ANCHOR_BOUNDARY_V1/);
assert.match(docText, /DataNet commitment remains an explicit source gap/);
assert.match(docText, /SOURCE_IMPLEMENTED_NOT_DEPLOYED_OR_RUNTIME_BOUND/);
assert.match(docText, /deployment\/runtime binding is\s+a separate gate/);

console.log(MARKER);
console.log(`source_commit=${fixture.source_commit}`);
console.log(`source_bindings=${bindings.length}`);
console.log("payment_fulfillment_source_implemented=true");
console.log("payment_fulfillment_deployed_or_runtime_bound=false");
console.log("datanet_chain2050_commitment_source_present=false");
console.log("hard_finality_route_live=false");
console.log("deployment=false");
console.log("runtime_service_action=false");
console.log("wallet_or_signer_action=false");
console.log("transaction_or_funds_action=false");
