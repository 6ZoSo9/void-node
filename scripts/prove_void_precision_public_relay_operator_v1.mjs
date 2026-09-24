#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_PRECISION_PUBLIC_RELAY_OPERATOR_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = path.join(ROOT, "ops/public/void-public-relay-natpmp-v1.mjs");
const installerPath = path.join(ROOT, "ops/public/void-precision-public-relay-activate-v1.sh");
const indexPath = path.join(ROOT, "src/index.ts");
const nodePath = path.join(ROOT, "src/node_core.ts");

for (const target of [helperPath, installerPath, indexPath, nodePath]) {
  const stat = fs.lstatSync(target);
  assert(stat.isFile() && !stat.isSymbolicLink(), `expected regular source file: ${target}`);
}

execFileSync(process.execPath, ["--check", helperPath], { stdio: "inherit" });
execFileSync("/usr/bin/bash", ["-n", installerPath], { stdio: "inherit" });

const helper = fs.readFileSync(helperPath, "utf8");
const installer = fs.readFileSync(installerPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");
const node = fs.readFileSync(nodePath, "utf8");

for (const token of [
  "VOID_PUBLIC_RELAY_EXPECTED_WAN_IPV4",
  "VOID_PUBLIC_RELAY_EXPECTED_GATEWAY",
  "VOID_PUBLIC_RELAY_EXPECTED_IFACE",
  "VOID_PUBLIC_RELAY_NATPMP_LIFETIME_SECONDS",
  "VOID_PUBLIC_RELAY_NATPMP_RENEW_SECONDS",
  "requestNatPmp",
  "await mapOne(2, TCP_PORT, LIFETIME",
  "await mapOne(1, UDP_PORT, LIFETIME",
  "await mapOne(opcode, port, 0",
  'process.on("SIGTERM"',
  'process.on("SIGINT"',
  "gateway WAN IPv4 changed",
  "default gateway changed",
  "default interface changed",
]) {
  assert(helper.includes(token), `missing helper invariant: ${token}`);
}

for (const token of [
  'WAN="24.40.99.171"',
  'GATEWAY="192.168.1.1"',
  'IFACE="enp11s0"',
  'NODE_ID="9d89483769e469e0473b489dc50dba96"',
  'TCP_PORT="4700"',
  'UDP_PORT="4711"',
  "Environment=P2P_BIND_HOST=0.0.0.0",
  "Environment=P2P_ADVERTISE_HOST=$WAN",
  "Environment=VOID_P2P_REACHABILITY_FAILURE_DOMAIN=precision-home-edge",
  "Environment=VOID_P2P_RELAY_SERVER_ENABLED=1",
  "Environment=VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1",
  "Environment=VOID_P2P_UDP_SWARM_FAMILY=udp4",
  "Environment=VOID_P2P_UDP_SWARM_BIND_HOST=0.0.0.0",
  "Environment=VOID_P2P_UDP_SWARM_BIND_PORT=$UDP_PORT",
  "Environment=VOID_P2P_UDP_SWARM_RELAY_ENDPOINT=$WAN:$UDP_PORT",
  "Environment=VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED=0",
  "Environment=VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENABLED=0",
  'sudo ufw allow in on "$IFACE" proto tcp to any port "$TCP_PORT"',
  'sudo ufw allow in on "$IFACE" proto udp to any port "$UDP_PORT"',
  'systemctl --user enable --now "$RELAY_UNIT"',
  'systemctl --user restart "$UNIT"',
  "external_reverification_required=true",
  "second_independent_relay_required_for_n_minus_one=true",
  "VOID_PRECISION_PUBLIC_RELAY_ACTIVATE_V1_GREEN",
]) {
  assert(installer.includes(token), `missing installer invariant: ${token}`);
}

assert(!installer.includes("VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED=1"));
assert(!installer.includes("VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENABLED=1"));
assert(!installer.includes("8545"));
assert(!installer.includes("transaction_signing=true"));
assert(!installer.includes("transaction_broadcast=true"));
assert(!installer.includes("funds_movement=true"));

for (const token of [
  "readVoidUdpSwarmNodeRuntimeEnvironmentV1(process.env)",
  "relayServer: udpSwarmRuntimeConfig.relay_server_enabled",
  "udpSwarmRelayEndpoint:",
  "createVoidUdpSwarmNodeRuntimeMountV1",
]) {
  assert(index.includes(token), `runtime integration invariant missing: ${token}`);
}

for (const token of [
  "private authenticatedDirectPeer",
  "requestRelayReservation(",
  "const relayPeer = this.authenticatedDirectPeer(relayNodeId)",
  "connectViaRelay(",
]) {
  assert(node.includes(token), `authenticated relay prerequisite missing: ${token}`);
}

console.log(MARKER);
console.log("public_tcp_endpoint=24.40.99.171:4700");
console.log("public_udp_endpoint=24.40.99.171:4711");
console.log("nat_pmp_lease_bounded=true");
console.log("nat_pmp_delete_on_stop=true");
console.log("public_p2p_advertisement_required=true");
console.log("relay_server_enabled=true");
console.log("udp_swarm_runtime_enabled=true");
console.log("public_introduction_collector_enabled=false");
console.log("relay_self_orchestration_enabled=false");
console.log("authenticated_direct_peer_required_before_relay_reservation=true");
console.log("external_reverification_required=true");
console.log("second_independent_relay_required_for_n_minus_one=true");
console.log("wallet_signer_validator_wc_money_authority=0");
