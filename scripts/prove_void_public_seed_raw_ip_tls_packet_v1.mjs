#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_RAW_IP_TLS_PACKET_V1_PROOF";
function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout || ""}\n${result.stderr || ""}`,
    );
  }
  return String(result.stdout || "").trim();
}
function reject(command, args, pattern, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout || ""}${result.stderr || ""}`, pattern);
}
const originalUmask = process.umask(0o077);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-raw-ip-tls-proof-"));
try {
  const fixtureRepo = path.join(root, "repo");
  fs.mkdirSync(path.join(fixtureRepo, "tools"), { recursive: true });
  for (const name of [
    "void-public-seed-ip-tls-proxy-v1.mjs",
    "void-public-seed-gateway-v1.mjs",
  ]) {
    fs.copyFileSync(`tools/${name}`, path.join(fixtureRepo, "tools", name));
  }
  fs.chmodSync(path.join(fixtureRepo, "tools/void-public-seed-ip-tls-proxy-v1.mjs"), 0o755);
  fs.chmodSync(path.join(fixtureRepo, "tools/void-public-seed-gateway-v1.mjs"), 0o644);
  run("git", ["init", "-q"], { cwd: fixtureRepo });
  run("git", ["config", "user.name", "VOID proof"], { cwd: fixtureRepo });
  run("git", ["config", "user.email", "proof@void.invalid"], { cwd: fixtureRepo });
  run(
    "git",
    [
      "add",
      "--",
      "tools/void-public-seed-ip-tls-proxy-v1.mjs",
      "tools/void-public-seed-gateway-v1.mjs",
    ],
    { cwd: fixtureRepo },
  );
  run("git", ["commit", "-qm", "fixture"], { cwd: fixtureRepo });
  const head = run("git", ["rev-parse", "HEAD"], { cwd: fixtureRepo });

  const certbot = path.join(root, "certbot");
  fs.writeFileSync(certbot, "#!/bin/sh\necho 'certbot 5.4.0'\n", { mode: 0o755 });
  const packet = path.join(root, "packet");
  const builderArgs = [
    "scripts/build_void_public_seed_raw_ip_tls_packet_v1.mjs",
    "--public-ip",
    "1.1.1.1",
    "--repo-root",
    fixtureRepo,
    "--expected-head",
    head,
    "--node",
    process.execPath,
    "--certbot",
    certbot,
    "--output",
    packet,
  ];
  const output = run(process.execPath, builderArgs);
  assert.match(output, /VOID_PUBLIC_SEED_RAW_IP_TLS_PACKET_V1_GREEN/);

  const verified = run(process.execPath, [
    "scripts/verify_void_public_seed_raw_ip_tls_packet_v1.mjs",
    packet,
  ]);
  assert.match(verified, /VOID_PUBLIC_SEED_RAW_IP_TLS_PACKET_VERIFY_V1_GREEN/);

  const targetSelfTest = run(process.execPath, [
    "tools/void-public-seed-ip-tls-proxy-v1.mjs",
    "--self-test-targets",
  ]);
  assert.match(targetSelfTest, /VOID_PUBLIC_SEED_IP_TLS_PROXY_V1_TARGET_SELF_TEST_GREEN/);

  const packetJson = JSON.parse(fs.readFileSync(path.join(packet, "packet.json"), "utf8"));
  assert.equal(packetJson.endpoint, "https://1.1.1.1");
  assert.deepEqual(packetJson.ports.loopback_tcp, [4100, 4111]);
  assert(packetJson.ports.public_tcp.includes(80));
  assert(packetJson.ports.public_tcp.includes(443));
  assert(packetJson.ports.public_tcp.includes(4700));
  assert.equal(packetJson.authority.manifest_published, false);
  assert.equal(packetJson.authority.services_started, false);
  assert.equal(packetJson.authority.credentials_read, false);
  assert(fs.existsSync(path.join(packet, "void-public-seed-gateway-v1.mjs")));
  const gatewayUnit = fs.readFileSync(
    path.join(packet, "void-public-seed-gateway-v1.service"),
    "utf8",
  );
  assert(gatewayUnit.includes("/usr/local/libexec/void-public-seed-gateway-v1.mjs"));
  assert(!gatewayUnit.includes(fixtureRepo));
  const proxyUnit = fs.readFileSync(
    path.join(packet, "void-public-seed-ip-tls-proxy-v1.service"),
    "utf8",
  );
  assert(
    proxyUnit.includes(
      `${process.execPath} /usr/local/libexec/void-public-seed-ip-tls-proxy-v1.mjs`,
    ),
  );

  const tamperedPacket = path.join(root, "tampered-packet");
  fs.cpSync(packet, tamperedPacket, { recursive: true });
  fs.appendFileSync(
    path.join(tamperedPacket, "void-public-seed-gateway-v1.mjs"),
    "\n// tampered\n",
  );
  reject(
    process.execPath,
    ["scripts/verify_void_public_seed_raw_ip_tls_packet_v1.mjs", tamperedPacket],
    /file SHA mismatch/,
  );

  reject(
    process.execPath,
    builderArgs.map((value) => value === "1.1.1.1" ? "127.0.0.1" : value)
      .map((value) => value === packet ? path.join(root, "bad-private") : value),
    /non-public|IP literal/,
  );

  const oldCertbot = path.join(root, "old-certbot");
  fs.writeFileSync(oldCertbot, "#!/bin/sh\necho 'certbot 5.3.0'\n", { mode: 0o755 });
  reject(
    process.execPath,
    builderArgs.map((value) => value === certbot ? oldCertbot : value)
      .map((value) => value === packet ? path.join(root, "bad-certbot") : value),
    /5\.4 or newer/,
  );

  const proxy = fs.readFileSync("tools/void-public-seed-ip-tls-proxy-v1.mjs", "utf8");
  for (const needle of [
    "acme_only=true",
    "HTTP_PORT !== 80",
    "HTTPS_PORT !== 443",
    "http://127.0.0.1:4111",
    "misdirected_request",
    "request target must use visible origin-form",
    "requestUrl.pathname",
  ]) {
    assert(proxy.includes(needle), `proxy missing ${needle}`);
  }

  const installer = fs.readFileSync(
    "ops/public/install_void_public_seed_raw_ip_tls_packet_v1.sh",
    "utf8",
  );
  for (const needle of [
    "install-raw-ip-tls-ingress-v1",
    "VOID_PUBLIC_SEED_START_SERVICES",
    "VOID_PUBLIC_SEED_APPLY_FIREWALL",
    "certificate_requested=false",
    "repository head does not match packet source",
    "void-public-seed-gateway-v1.mjs",
    "manifest_published=false",
  ]) {
    assert(installer.includes(needle), `installer missing ${needle}`);
  }

  console.log(`${MARKER}_GREEN`);
  console.log("public_ipv4_endpoint=true");
  console.log("acme_http_port=80");
  console.log("restricted_https_port=443");
  console.log("native_p2p_port=4700");
  console.log("node_http_loopback_only=true");
  console.log("gateway_loopback_only=true");
  console.log("absolute_form_request_target_rejected=true");
  console.log("packet_gateway_source_copied=true");
  console.log("certbot_lineage_symlinks_resolved=true");
  console.log("renewal_write_paths_explicit=true");
  console.log("certbot_minimum_version=5.4");
  console.log("short_lived_renewal_timer=true");
  console.log("manifest_published=false");
  console.log("services_started=false");
  console.log("credentials_read=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  process.umask(originalUmask);
  fs.rmSync(root, { recursive: true, force: true });
}
