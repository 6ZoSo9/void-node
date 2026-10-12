#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_AI_AGENT_PUBLIC_INGRESS_MILESTONE_PROOF_V1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const milestone = JSON.parse(await readFile(
  path.join(root, "docs/public/ai-agent-public-ingress-milestone-v1.json"),
  "utf8",
));
const schema = JSON.parse(await readFile(
  path.join(root, "docs/public/ai-agent-public-ingress-milestone-v1.schema.json"),
  "utf8",
));
const markdown = await readFile(
  path.join(root, "docs/public/ai-agent-public-ingress-milestone-v1.md"),
  "utf8",
);

assert(milestone.marker === "VOID_AI_AGENT_PUBLIC_INGRESS_MILESTONE_V1", "marker differs");
assert(milestone.version === 1, "version differs");
assert(milestone.main_commit === "462e460147da4b60682351160ba5290846cba9a4", "main differs");
assert(milestone.public_endpoint.base_url === "https://zoso-precision-tower-7810.taila47fd.ts.net:8443", "public base differs");
assert(milestone.public_endpoint.public_internet_verified === true, "public verification differs");
assert(milestone.public_endpoint.tls_default_trust === true, "TLS trust differs");
assert(milestone.public_endpoint.routes.length === 4, "route count differs");

const expected = new Map([
  ["/public-node/agents/discovery-v1.json", "4b390d453a78ce707bba2c9a2d3161aeb9df62d69ec15fb26c1a1c0a92b4f75b"],
  ["/public-node/agents/discovery-v1.schema.json", "b13022fc2ea647acd4d837347dc3ecf4d668b1301e0271bf022ab79acf3d69a2"],
  ["/.well-known/void-agent-discovery.json", "5fcce19145fb4ad4b11b6b7acd0461a5e73d20cb11a968283086d314d38c12ff"],
  ["/.well-known/void-agent-discovery.schema.json", "53a8a103f029b27c4c123db0abd066db6437f63c8415205cd5cab77739e78599"],
]);

for (const route of milestone.public_endpoint.routes) {
  assert(expected.get(route.path) === route.sha256, `${route.path} hash differs`);
  assert(JSON.stringify(route.methods) === JSON.stringify(["GET", "HEAD"]), `${route.path} methods differ`);
  expected.delete(route.path);
}
assert(expected.size === 0, "required route missing");

assert(milestone.containment.gateway_bind === "127.0.0.1:4112", "gateway bind differs");
assert(milestone.containment.raw_gateway_port_exposed === false, "raw port exposure differs");
assert(milestone.containment.main_node_port_exposed === false, "main node exposure differs");
assert(milestone.containment.unknown_paths_status === 404, "404 contract differs");
assert(milestone.containment.unsupported_methods_status === 405, "405 contract differs");
assert(milestone.containment.allow_header === "GET, HEAD", "Allow header differs");

assert(milestone.authority.discovery_only === true, "discovery-only differs");
for (const [name, value] of Object.entries(milestone.authority)) {
  if (name === "discovery_only") continue;
  assert(value === false, `${name} must remain false`);
}

assert(milestone.independent_verification.runner === "github-hosted-ubuntu-latest", "runner differs");
assert(milestone.independent_verification.workflow_run_id === 30057397052, "run differs");
assert(milestone.independent_verification.job_id === 89371891151, "job differs");
assert(milestone.independent_verification.verdict === "AI_AGENT_PUBLIC_GATEWAY_INDEPENDENT_PUBLIC_NETWORK_EXACT_GREEN", "verdict differs");
assert(milestone.next_lane.name === "AI-agent capability negotiation v1", "next lane differs");
assert(schema.properties.marker.const === "VOID_AI_AGENT_PUBLIC_INGRESS_MILESTONE_V1", "schema marker differs");

for (const text of [
  "https://zoso-precision-tower-7810.taila47fd.ts.net:8443",
  "127.0.0.1:4112",
  "30057397052",
  "89371891151",
  "AI_AGENT_PUBLIC_GATEWAY_INDEPENDENT_PUBLIC_NETWORK_EXACT_GREEN",
  "AI-agent capability negotiation v1",
  "automatic Buy VOID fulfillment",
  "automatic Work Credit awards",
]) {
  assert(markdown.includes(text), `markdown lacks ${text}`);
}

process.stdout.write(
  `${MARKER}\n` +
  `route_count=4\n` +
  `public_internet_verified=1\n` +
  `tls_default_trust=1\n` +
  `discovery_only=1\n` +
  `mutation_authority=0\n` +
  `buy_void_fulfillment_authority=0\n` +
  `work_credit_award_authority=0\n` +
  `next_lane=AI-agent capability negotiation v1\n` +
  `verdict=AI_AGENT_PUBLIC_INGRESS_MILESTONE_RECORD_EXACT_GREEN\n` +
  `${MARKER}_COMPLETE\n`
);
