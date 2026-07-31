#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) { console.error("VOID_TOR_AGENT_DISCOVERY_PARITY_V1_BUILD_FAIL"); console.error(message); process.exit(1); }
function load(path) { return JSON.parse(readFileSync(path, "utf8")); }
function canonical(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function exact(actual, expected, label) { if (actual !== expected) throw new Error(`${label} mismatch: expected=${expected} actual=${actual}`); }

try {
  const mode = process.argv.includes("--write") ? "write" : "check";
  const root = process.cwd();
  const profilePath = resolve(root, "config/void-tor-agent-discovery-parity-v1.json");
  const canonicalPaidPath = resolve(root, "public/public-node/agents/paid-work-v1.json");
  const rootOut = resolve(root, "public/.well-known/void-public-node.json");
  const paidAliasOut = resolve(root, "public/public-node/agent-paid-work-public-discovery-v1.json");
  const profile = load(profilePath);
  const canonicalPaid = load(canonicalPaidPath);
  const base = profile.transport.base_url;
  const links = Object.fromEntries(profile.routes.map((route) => [route.id, `${base}${route.path}`]));
  const routeMarkers = Object.fromEntries(profile.routes.filter((route) => route.marker).map((route) => [route.id, route.marker]));
  const rootDocument = {
    $schema: "./void-public-node.schema.json",
    marker: "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1",
    version: 1,
    purpose: "well_known_public_node_agent_discovery",
    protocol: "void-public-node-discovery-v1",
    status: "public_node_agent_discovery_ready",
    effective_base_url: base,
    network: { name: "VOID Mainnet-0", identity: "mainnet0", chain_id: 2050 },
    transport: { protocol: profile.transport.protocol, onion_hostname: profile.transport.onion_hostname, virtual_port: profile.transport.virtual_port, address_role: "canonical_public_read_only_agent_origin" },
    identity: { signed_node_binding_required: true, binding_paths: ["/.well-known/void-node-onion-binding-v1.json", "/public-node/transports/tor-v1-binding.json"], authenticity_path: "/.well-known/void-network-authenticity.json" },
    links,
    route_markers: routeMarkers,
    parity: { profile: "/config/void-tor-agent-discovery-parity-v1.json", route_count: profile.routes.length, client_profile_marker: profile.client_parity.profile_marker, client_optional_probe_paths: profile.client_parity.optional_probe_paths, expected_client_discovery_parity: profile.client_parity.expected_after_activation },
    authority: profile.authority,
    safety: profile.safety,
  };
  const paidAlias = structuredClone(canonicalPaid);
  paidAlias.$schema = "/public-node/agents/paid-work-v1.schema.json";
  paidAlias.routes = { self: "/public-node/agent-paid-work-public-discovery-v1.json", schema: "/public-node/agents/paid-work-v1.schema.json", canonical_agent_discovery: "/public-node/agents/discovery-v1.json" };
  const outputs = [[rootOut, canonical(rootDocument)], [paidAliasOut, canonical(paidAlias)]];
  for (const [path, expected] of outputs) {
    if (mode === "write") writeFileSync(path, expected, { mode: 0o644 });
    else {
      if (!existsSync(path)) throw new Error(`generated file missing: ${path}`);
      exact(readFileSync(path, "utf8"), expected, path);
    }
    console.log(`generated=${path}`); console.log(`sha256=${sha256(Buffer.from(expected))}`);
  }
  console.log("VOID_TOR_AGENT_DISCOVERY_PARITY_V1_BUILD_GREEN");
  console.log(`mode=${mode}`); console.log(`route_count=${profile.routes.length}`); console.log("mutation_authority_granted=false"); console.log("payment_execution=false"); console.log("fund_movement=false");
} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
