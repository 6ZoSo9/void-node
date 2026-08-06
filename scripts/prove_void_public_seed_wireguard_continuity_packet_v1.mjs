#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  packetId,
  verifyPacket,
} from "./lib/void_public_seed_wireguard_continuity_packet_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_WIREGUARD_CONTINUITY_PACKET_V1_PROOF_GREEN";

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result;
}

function expectFailure(command, args, pattern) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.notEqual(result.status, 0, `${command} unexpectedly succeeded`);
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-wg-continuity-proof-"));
const repo = path.join(root, "source");
const output = path.join(root, "packet");
for (const relative of [
  "scripts/lib/void_public_seed_client_transport_v1.mjs",
  "scripts/lib/void_public_seed_ip_vps_packet_v1.mjs",
  "src/http/follower_routes.ts",
  "tools/void-public-seed-gateway-v1.mjs",
]) {
  const target = path.join(repo, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, `// fixture ${relative}\n`, { mode: 0o600 });
}
run("git", ["init", "-q", repo]);
run("git", ["-C", repo, "config", "user.name", "VOID proof"]);
run("git", ["-C", repo, "config", "user.email", "void-proof@example.invalid"]);
run("git", ["-C", repo, "add", "."]);
run("git", ["-C", repo, "commit", "-q", "-m", "fixture"]);
const head = run("git", ["-C", repo, "rev-parse", "HEAD"]).stdout.trim();

const builder = path.resolve(
  "scripts/build_void_public_seed_wireguard_continuity_packet_v1.mjs",
);
const verifier = path.resolve(
  "scripts/verify_void_public_seed_wireguard_continuity_packet_v1.mjs",
);
const vpsKey = Buffer.alloc(32, 1).toString("base64");
const precisionKey = Buffer.alloc(32, 2).toString("base64");

run(process.execPath, [
  builder,
  "--public-ip", "1.1.1.1",
  "--vps-public-key", vpsKey,
  "--precision-public-key", precisionKey,
  "--repo-root", repo,
  "--expected-head", head,
  "--output", output,
]);

const packet = verifyPacket(output);
run(process.execPath, [verifier, output]);
assert.equal(packet.public_vps_ip, "1.1.1.1");
assert.equal(packet.transport.public_udp_port, 443);
assert.deepEqual(packet.transport.additional_public_tcp_ports, []);
assert.equal(packet.transport.vps_address, "10.205.0.1/32");
assert.equal(packet.transport.precision_address, "10.205.0.2/32");
assert.equal(packet.transport.precision_endpoint, "1.1.1.1:443");
assert.equal(packet.transport.vps_allowed_ip, "10.205.0.2/32");
assert.equal(packet.transport.precision_allowed_ip, "10.205.0.1/32");
assert.equal(packet.transport.persistent_keepalive_seconds, 25);
assert.equal(packet.transport.ip_forwarding_required, false);
assert.equal(packet.transport.nat_required, false);
assert.equal(packet.continuity.vps_origin, "http://127.0.0.1:4199");
assert.equal(packet.continuity.public_listener, false);
assert.equal(packet.keys.private_keys_embedded, false);
assert.equal(packet.keys.private_keys_generated, false);
assert.equal(packet.keys.private_keys_read, false);
console.log("[PASS] exact WireGuard continuity packet builds and verifies");

const vpsScript = fs.readFileSync(
  path.join(output, "void-public-seed-continuity-vps-wireguard-v1.sh"),
  "utf8",
);
const precisionScript = fs.readFileSync(
  path.join(output, "void-public-seed-continuity-precision-wireguard-v1.sh"),
  "utf8",
);
assert.match(vpsScript, /ADDRESS='10\.205\.0\.1\/32'/);
assert.match(vpsScript, /PEER_ROUTE="\$PEER_ALLOWED_IP"/);
assert.match(vpsScript, /ip route replace "\$PEER_ROUTE" dev "\$INTERFACE"/);
assert.match(precisionScript, /ADDRESS='10\.205\.0\.2\/32'/);
assert.match(precisionScript, /endpoint '1\.1\.1\.1:443'/);
assert.match(precisionScript, /allowed-ips "\$PEER_ALLOWED_IP"/);
assert.match(precisionScript, /PEER_ROUTE="\$PEER_ALLOWED_IP"/);
assert.match(precisionScript, /ip route replace "\$PEER_ROUTE" dev "\$INTERFACE"/);
assert.match(precisionScript, /persistent-keepalive 25/);
assert.doesNotMatch(precisionScript, /10\.205\.0\.[12]\/30/);
assert.doesNotMatch(precisionScript, /0\.0\.0\.0\/0/);
const vpsSocket = fs.readFileSync(
  path.join(output, "void-public-seed-continuity-vps-proxy-v1.socket"),
  "utf8",
);
const precisionSocket = fs.readFileSync(
  path.join(output, "void-public-seed-continuity-precision-proxy-v1.socket"),
  "utf8",
);
assert.match(vpsSocket, /ListenStream=127\.0\.0\.1:4199/);
assert.match(precisionSocket, /ListenStream=10\.205\.0\.2:4199/);
console.log("[PASS] exact /32 peer and non-public proxy bindings are generated");

const packetPath = path.join(output, "packet.json");
const originalPacketText = fs.readFileSync(packetPath, "utf8");

function expectPacketMutationRejected(mutator, pattern) {
  const candidate = JSON.parse(originalPacketText);
  mutator(candidate);
  candidate.packet_id = packetId(candidate);
  fs.writeFileSync(packetPath, `${JSON.stringify(candidate, null, 2)}\n`, {
    mode: 0o600,
  });
  try {
    assert.throws(() => verifyPacket(output), pattern);
  } finally {
    fs.writeFileSync(packetPath, originalPacketText, { mode: 0o600 });
  }
}

expectPacketMutationRejected(
  (candidate) => candidate.transport.additional_public_tcp_ports.push(22),
  /transport contract mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.transport.public_udp_port = 51820,
  /transport contract mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.transport.precision_allowed_ip = "0.0.0.0/0",
  /transport contract mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.transport.vps_address = "10.205.0.1/30",
  /transport contract mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.transport.precision_address = "10.205.0.2/30",
  /transport contract mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.continuity.public_listener = true,
  /continuity contract mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.keys.private_keys_embedded = true,
  /key boundary mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.keys.vps_public_key = Buffer.alloc(32, 3).toString("base64"),
  /generated content mismatch/,
);
expectPacketMutationRejected(
  (candidate) => candidate.unrecognized_contract = false,
  /top-level field set mismatch/,
);
console.log("[PASS] resealed public-port, route, key, and listener weakening fails closed");

const extra = path.join(output, "unrecorded-extra.txt");
fs.writeFileSync(extra, "extra\n", { mode: 0o600 });
assert.throws(() => verifyPacket(output), /packet directory file set mismatch/);
fs.unlinkSync(extra);
console.log("[PASS] unrecorded packet entries are rejected");

for (const publicIp of [
  "10.0.0.1",
  "100.64.0.1",
  "127.0.0.1",
  "192.0.2.1",
  "192.168.0.1",
  "198.51.100.1",
  "203.0.113.1",
]) {
  expectFailure(
    process.execPath,
    [
      builder,
      "--public-ip", publicIp,
      "--vps-public-key", vpsKey,
      "--precision-public-key", precisionKey,
      "--repo-root", repo,
      "--expected-head", head,
      "--output", path.join(root, `reject-${publicIp.replaceAll(".", "-")}`),
    ],
    /globally routable IPv4 literal/,
  );
}
console.log("[PASS] non-public VPS addresses fail closed");

for (const badKey of [
  "",
  "not-base64",
  Buffer.alloc(31, 1).toString("base64"),
  Buffer.alloc(32, 0).toString("base64"),
]) {
  expectFailure(
    process.execPath,
    [
      builder,
      "--public-ip", "1.1.1.1",
      "--vps-public-key", badKey || "missing",
      "--precision-public-key", precisionKey,
      "--repo-root", repo,
      "--expected-head", head,
      "--output", path.join(root, `reject-key-${cryptoRandomSuffix()}`),
    ],
    /public key/,
  );
}
console.log("[PASS] malformed and all-zero public keys fail closed");

expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--vps-public-key", vpsKey,
    "--precision-public-key", vpsKey,
    "--repo-root", repo,
    "--expected-head", head,
    "--output", path.join(root, "equal-keys"),
  ],
  /must be distinct/,
);
expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--vps-public-key", vpsKey,
    "--precision-public-key", precisionKey,
    "--repo-root", repo,
    "--expected-head", head,
    "--vps-private-key-path", "relative.key",
    "--output", path.join(root, "relative-key-path"),
  ],
  /normalized absolute path/,
);
expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--vps-public-key", vpsKey,
    "--precision-public-key", precisionKey,
    "--repo-root", repo,
    "--expected-head", head,
    "--vps-private-key-path", path.join(repo, "secret.key"),
    "--output", path.join(root, "inside-key-path"),
  ],
  /outside the repository/,
);
expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--vps-public-key", vpsKey,
    "--precision-public-key", precisionKey,
    "--repo-root", repo,
    "--expected-head", head,
    "--output", path.join(repo, "packet-inside-repo"),
  ],
  /outside the repository/,
);
console.log("[PASS] private-key and packet paths remain outside the repository");

fs.writeFileSync(path.join(repo, "dirty.txt"), "dirty\n");
expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--vps-public-key", vpsKey,
    "--precision-public-key", precisionKey,
    "--repo-root", repo,
    "--expected-head", head,
    "--output", path.join(root, "dirty-source"),
  ],
  /completely clean/,
);
console.log("[PASS] dirty source checkout is rejected");

console.log(MARKER);
console.log("source_files=6");
console.log("public_wireguard_udp_port=443");
console.log("additional_public_tcp_ports=0");
console.log("wireguard_interface_addresses_exact_32=true");
console.log("wireguard_peer_routes_exact_32=true");
console.log("precision_persistent_keepalive_seconds=25");
console.log("vps_continuity_origin_loopback_only=true");
console.log("precision_gateway_publicly_exposed=false");
console.log("ip_forwarding_required=false");
console.log("nat_required=false");
console.log("private_keys_embedded=false");
console.log("private_keys_generated=false");
console.log("private_keys_read=false");
console.log("vps_accessed=false");
console.log("firewall_mutated=false");
console.log("interfaces_created=false");
console.log("services_started=false");
console.log("manifest_published=false");
console.log("deployment_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");

function cryptoRandomSuffix() {
  return Math.random().toString(16).slice(2);
}
