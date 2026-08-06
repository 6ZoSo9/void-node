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
} from "./lib/void_public_seed_ip_vps_packet_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_IP_VPS_PACKET_V1_PROOF";

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function expectFailure(command, args, pattern, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  assert.notEqual(result.status, 0, `${command} unexpectedly succeeded`);
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-ip-vps-packet-proof-"));
const repo = path.join(root, "source");
const output = path.join(root, "packet");
fs.mkdirSync(path.join(repo, "tools"), { recursive: true, mode: 0o700 });
fs.writeFileSync(
  path.join(repo, "tools", "void-public-seed-gateway-v1.mjs"),
  'console.log("VOID_PUBLIC_SEED_GATEWAY_V1_READY");\n',
  { mode: 0o600 },
);

run("git", ["init", "-q", repo]);
run("git", ["-C", repo, "config", "user.name", "VOID proof"]);
run("git", ["-C", repo, "config", "user.email", "void-proof@example.invalid"]);
run("git", ["-C", repo, "add", "."]);
run("git", ["-C", repo, "commit", "-q", "-m", "fixture"]);
const head = run("git", ["-C", repo, "rev-parse", "HEAD"]).stdout.trim();

const builder = path.resolve("scripts/build_void_public_seed_ip_vps_packet_v1.mjs");
const verifier = path.resolve("scripts/verify_void_public_seed_ip_vps_packet_v1.mjs");

run(process.execPath, [
  builder,
  "--public-ip", "1.1.1.1",
  "--repo-root", repo,
  "--expected-head", head,
  "--output", output,
]);

const verifyOptions = Object.freeze({
  repoRoot: repo,
  expectedHead: head,
});
const verified = verifyPacket(output, verifyOptions);
assert.equal(verified.public_ip, "1.1.1.1");
assert.equal(verified.public_https, "https://1.1.1.1");
assert.equal(verified.public_p2p, "1.1.1.1:4700");
assert.deepEqual(verified.required_inbound_tcp_ports, [80, 443, 4700]);
assert.deepEqual(verified.forbidden_public_tcp_ports, [4100, 4111]);
const verifierSuccess = run(process.execPath, [
  verifier,
  output,
  "--repo-root",
  repo,
  "--expected-head",
  head,
]);
assert.match(verifierSuccess.stdout, /source_checkout_required=true/);
assert.match(verifierSuccess.stdout, /source_head_bound_to_checkout=true/);
assert.match(verifierSuccess.stdout, /gateway_source_hash_bound_to_checkout=true/);
console.log("[PASS] exact public-IP VPS packet builds and verifies against clean exact source");

assert.throws(
  () => verifyPacket(output),
  /source repository root is required/,
);
expectFailure(
  process.execPath,
  [verifier, output],
  /source repository root is required/,
);
assert.throws(
  () =>
    verifyPacket(output, {
      repoRoot: repo,
      expectedHead: "0".repeat(40),
    }),
  /repository head mismatch/,
);
fs.writeFileSync(path.join(repo, "verification-dirty.txt"), "dirty\n");
assert.throws(
  () => verifyPacket(output, verifyOptions),
  /completely clean/,
);
fs.unlinkSync(path.join(repo, "verification-dirty.txt"));
console.log("[PASS] missing, wrong-head, and dirty source verification fail closed");

const extraFile = path.join(output, "unrecorded-extra.txt");
fs.writeFileSync(extraFile, "unrecorded packet material\n", { mode: 0o600 });
assert.throws(() => verifyPacket(output, verifyOptions), /packet directory file set mismatch/);
fs.unlinkSync(extraFile);

const extraDirectory = path.join(output, "unrecorded-extra-directory");
fs.mkdirSync(extraDirectory, { mode: 0o700 });
assert.throws(() => verifyPacket(output, verifyOptions), /packet directory file set mismatch/);
fs.rmdirSync(extraDirectory);

const extraSymlink = path.join(output, "unrecorded-extra-symlink");
fs.symlinkSync("packet.json", extraSymlink);
assert.throws(() => verifyPacket(output, verifyOptions), /packet directory file set mismatch/);
fs.unlinkSync(extraSymlink);
console.log("[PASS] unrecorded file, directory, and symlink are rejected");

const packetPath = path.join(output, "packet.json");
const originalPacketText = fs.readFileSync(packetPath, "utf8");

function expectPacketMutationRejected(mutator, pattern) {
  const packet = JSON.parse(originalPacketText);
  mutator(packet);
  packet.packet_id = packetId(packet);
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, { mode: 0o600 });
  try {
    assert.throws(() => verifyPacket(output, verifyOptions), pattern);
  } finally {
    fs.writeFileSync(packetPath, originalPacketText, { mode: 0o600 });
  }
}

expectPacketMutationRejected(
  (packet) => {
    delete packet.authority;
  },
  /top-level field set mismatch/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.authority = {};
  },
  /authority contract mismatch/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.activation = {};
  },
  /activation contract mismatch/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.certbot.certificate_profile = "default";
  },
  /certbot contract mismatch/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.snapshot.required_before_activation = false;
  },
  /snapshot contract mismatch/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.service_user = "otheruser";
  },
  /generated content mismatch/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.gateway_source_sha256 = "0".repeat(63);
  },
  /gateway source SHA-256 is invalid/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.gateway_source_sha256 = "0".repeat(64);
  },
  /gateway source SHA-256 does not match verified source checkout/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.source_head = "0".repeat(40);
  },
  /packet source head does not match verified source checkout/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.generated_at = "not-an-iso-timestamp";
  },
  /generated_at is invalid/,
);
expectPacketMutationRejected(
  (packet) => {
    packet.unrecognized_contract = false;
  },
  /top-level field set mismatch/,
);
console.log("[PASS] packet metadata schema and generated-content bindings fail closed");

for (const privateIp of [
  "0.0.0.1",
  "10.0.0.1",
  "100.64.0.1",
  "127.0.0.1",
  "169.254.1.1",
  "172.16.0.1",
  "192.0.2.1",
  "192.168.1.1",
  "198.18.0.1",
  "198.51.100.1",
  "203.0.113.1",
  "224.0.0.1",
]) {
  expectFailure(
    process.execPath,
    [
      builder,
      "--public-ip", privateIp,
      "--repo-root", repo,
      "--expected-head", head,
      "--output", path.join(root, `reject-${privateIp.replaceAll(".", "-")}`),
    ],
    /globally routable IPv4 literal/,
  );
}
console.log("[PASS] non-public IPv4 ranges fail closed");

expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--repo-root", repo,
    "--expected-head", "0".repeat(40),
    "--output", path.join(root, "wrong-head"),
  ],
  /head mismatch/,
);
console.log("[PASS] wrong source head is rejected");

fs.writeFileSync(path.join(repo, "dirty.txt"), "dirty\n");
expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--repo-root", repo,
    "--expected-head", head,
    "--output", path.join(root, "dirty-output"),
  ],
  /completely clean/,
);
fs.unlinkSync(path.join(repo, "dirty.txt"));
console.log("[PASS] dirty source checkout is rejected");

expectFailure(
  process.execPath,
  [
    builder,
    "--public-ip", "1.1.1.1",
    "--repo-root", repo,
    "--expected-head", head,
    "--output", path.join(repo, "packet-inside-repo"),
  ],
  /outside the repository/,
);
console.log("[PASS] packet output inside source repository is rejected");

const tls = path.join(output, "nginx-void-public-seed-tls-v1.conf");
fs.appendFileSync(tls, "\n# tamper\n");
assert.throws(() => verifyPacket(output, verifyOptions), /hash or size mismatch/);
console.log("[PASS] tampered packet file is rejected");

console.log(`${MARKER}_GREEN`);
console.log("new_source_files=6");
console.log("packet_directory_exact_set_enforced=true");
console.log("unrecorded_packet_entries_accepted=false");
console.log("packet_top_level_schema_exact=true");
console.log("packet_nested_contracts_exact=true");
console.log("packet_metadata_generated_content_bound=true");
console.log("self_recomputed_weakened_packet_accepted=false");
console.log("source_checkout_required=true");
console.log("source_checkout_clean_required=true");
console.log("source_head_bound_to_checkout=true");
console.log("gateway_source_hash_bound_to_checkout=true");
console.log("self_recomputed_forged_source_accepted=false");
console.log("domain_required=false");
console.log("tailscale_required=false");
console.log("public_https_port=443");
console.log("public_p2p_port=4700");
console.log("node_http_loopback_only=true");
console.log("gateway_http_loopback_only=true");
console.log("certbot_shortlived_profile_required=true");
console.log("certificate_issued=false");
console.log("manifest_published=false");
console.log("vps_access=false");
console.log("wallet_authority=false");
console.log("signer_authority=false");
console.log("validator_authority=false");
console.log("money_movement_authority=false");
