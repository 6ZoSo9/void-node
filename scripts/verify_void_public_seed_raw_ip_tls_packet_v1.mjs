#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import {
  normalizePublicSeedBase,
  objectWithId,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_RAW_IP_TLS_PACKET_VERIFY_V1";
function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}
function sha256File(target) {
  return crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
}
function exec(command, args) {
  const result = childProcess.spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return String(result.stdout || "").trim();
}
function assertExactExecutable(target, expectedSha, expectedVersion, label) {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o111) === 0) {
    throw new Error(`${label} executable is unsafe`);
  }
  if (sha256File(target) !== expectedSha) throw new Error(`${label} executable drift`);
  if (exec(target, label === "Node.js" ? ["--version"] : ["--version"]) !== expectedVersion) {
    throw new Error(`${label} version drift`);
  }
}
function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return value;
}
try {
  const packetDir = fs.realpathSync(process.argv[2] || "");
  const packetPath = path.join(packetDir, "packet.json");
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
  exactKeys(
    packet,
    [
      "schema",
      "source_sha",
      "public_ip",
      "endpoint",
      "ssh_port",
      "node_bin",
      "node_sha256",
      "node_version",
      "certbot_bin",
      "certbot_sha256",
      "certbot_version",
      "ports",
      "files",
      "authority",
      "packet_id",
    ],
    "packet",
  );
  if (packet.schema !== "void_public_seed_raw_ip_tls_packet_v1") {
    throw new Error("packet schema mismatch");
  }
  if (!/^[0-9a-f]{40}$/.test(packet.source_sha)) throw new Error("source SHA malformed");
  if (net.isIP(packet.public_ip) !== 4) throw new Error("public IP is not IPv4");
  const normalized = normalizePublicSeedBase(packet.endpoint);
  if (
    normalized.address_source !== "ip_literal" ||
    normalized.endpoint_address !== packet.public_ip
  ) {
    throw new Error("packet endpoint binding mismatch");
  }
  const expectedId = objectWithId("voidpsit1_", packet, "packet_id").packet_id;
  if (packet.packet_id !== expectedId) throw new Error("packet ID mismatch");
  exactKeys(packet.ports, ["public_tcp", "loopback_tcp"], "packet ports");
  exactKeys(
    packet.authority,
    [
      "manifest_published",
      "services_started",
      "firewall_applied",
      "credentials_read",
      "wallet_signer_validator_wc_money_authority",
    ],
    "packet authority",
  );
  assertExactExecutable(
    packet.node_bin,
    packet.node_sha256,
    packet.node_version,
    "Node.js",
  );
  assertExactExecutable(
    packet.certbot_bin,
    packet.certbot_sha256,
    packet.certbot_version,
    "Certbot",
  );
  if (JSON.stringify(packet.ports.loopback_tcp) !== JSON.stringify([4100, 4111])) {
    throw new Error("loopback port contract mismatch");
  }
  if (!packet.ports.public_tcp.includes(80) || !packet.ports.public_tcp.includes(443)) {
    throw new Error("ACME/TLS public port contract missing");
  }
  if (!packet.ports.public_tcp.includes(4700)) throw new Error("P2P port missing");
  for (const [key, expected] of [
    ["manifest_published", false],
    ["services_started", false],
    ["firewall_applied", false],
    ["credentials_read", false],
    ["wallet_signer_validator_wc_money_authority", 0],
  ]) {
    if (packet.authority[key] !== expected) throw new Error(`authority ${key} mismatch`);
  }

  const expectedNames = [
    "INSTALL.txt",
    "nftables-void-public-seed-v1.conf",
    "void-node-seed.env.example",
    "void-public-seed-gateway-v1.mjs",
    "void-public-seed-gateway-v1.service",
    "void-public-seed-ip-cert-deploy-hook-v1.sh",
    "void-public-seed-ip-cert-renew-v1.service",
    "void-public-seed-ip-cert-renew-v1.timer",
    "void-public-seed-ip-tls-proxy-v1.mjs",
    "void-public-seed-ip-tls-proxy-v1.service",
  ];
  const actualNames = packet.files.map((entry) => entry.name).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error("packet file set mismatch");
  }
  for (const entry of packet.files) {
    exactKeys(entry, ["name", "mode", "sha256"], `file ${entry.name}`);
    if (!/^[0-9a-f]{64}$/.test(entry.sha256)) throw new Error("file SHA malformed");
    const target = path.join(packetDir, entry.name);
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`unsafe file ${entry.name}`);
    if (sha256File(target) !== entry.sha256) throw new Error(`file SHA mismatch ${entry.name}`);
    const mode = (stat.mode & 0o777).toString(8).padStart(4, "0");
    if (mode !== entry.mode) throw new Error(`file mode mismatch ${entry.name}`);
  }

  const proxy = fs.readFileSync(path.join(packetDir, "void-public-seed-ip-tls-proxy-v1.mjs"), "utf8");
  const gateway = fs.readFileSync(path.join(packetDir, "void-public-seed-gateway-v1.mjs"), "utf8");
  const gatewayUnit = fs.readFileSync(path.join(packetDir, "void-public-seed-gateway-v1.service"), "utf8");
  const proxyUnit = fs.readFileSync(path.join(packetDir, "void-public-seed-ip-tls-proxy-v1.service"), "utf8");
  const renewService = fs.readFileSync(path.join(packetDir, "void-public-seed-ip-cert-renew-v1.service"), "utf8");
  const renewTimer = fs.readFileSync(path.join(packetDir, "void-public-seed-ip-cert-renew-v1.timer"), "utf8");
  const firewall = fs.readFileSync(path.join(packetDir, "nftables-void-public-seed-v1.conf"), "utf8");
  const nodeEnv = fs.readFileSync(path.join(packetDir, "void-node-seed.env.example"), "utf8");
  const deployHook = fs.readFileSync(
    path.join(packetDir, "void-public-seed-ip-cert-deploy-hook-v1.sh"),
    "utf8",
  );

  for (const needle of [
    "VOID_PUBLIC_SEED_IP_TLS_PROXY_V1",
    "/.well-known/acme-challenge/",
    "http://127.0.0.1:4111",
    "HTTP_PORT !== 80",
    "HTTPS_PORT !== 443",
    "misdirected_request",
  ]) {
    if (!proxy.includes(needle)) throw new Error(`proxy missing ${needle}`);
  }
  for (const needle of [
    "VOID_PUBLIC_SEED_GATEWAY_V1",
    "gateway must bind to a numeric loopback literal",
    "route_not_public",
    "method_not_allowed",
  ]) {
    if (!gateway.includes(needle)) throw new Error(`gateway source missing ${needle}`);
  }
  if (!gatewayUnit.includes("VOID_PUBLIC_SEED_BIND=127.0.0.1")) {
    throw new Error("gateway does not bind loopback");
  }
  if (!gatewayUnit.includes("VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100")) {
    throw new Error("gateway upstream is not loopback node HTTP");
  }
  if (
    !gatewayUnit.includes(
      `${packet.node_bin} /usr/local/libexec/void-public-seed-gateway-v1.mjs`,
    )
  ) {
    throw new Error("gateway unit is not bound to the packet-copied source");
  }
  for (const needle of [
    "User=voidseed",
    "AmbientCapabilities=CAP_NET_BIND_SERVICE",
    "VOID_PUBLIC_SEED_TLS_UPSTREAM=http://127.0.0.1:4111",
    `${packet.node_bin} /usr/local/libexec/void-public-seed-ip-tls-proxy-v1.mjs`,
    "NoNewPrivileges=true",
  ]) {
    if (!proxyUnit.includes(needle)) throw new Error(`proxy unit missing ${needle}`);
  }
  if (!renewService.includes("certbot") || !renewService.includes("--deploy-hook")) {
    throw new Error("renew service is not deploy-hook bound");
  }
  for (const needle of [
    "ReadWritePaths=/etc/letsencrypt",
    "/var/lib/letsencrypt",
    "/var/log/letsencrypt",
    "NoNewPrivileges=true",
  ]) {
    if (!renewService.includes(needle)) throw new Error(`renew service missing ${needle}`);
  }
  if (!renewTimer.includes("00/6:17:00") || !renewTimer.includes("Persistent=true")) {
    throw new Error("renew timer is not frequent and persistent");
  }
  for (const port of ["80", "443", "4700", "4100", "4111"]) {
    if (!firewall.includes(port)) throw new Error(`firewall missing port ${port}`);
  }
  for (const needle of [
    "readlink -f --",
    `/etc/letsencrypt/archive/$PUBLIC_IP/`,
    "openssl x509",
    "-checkip",
  ]) {
    if (!deployHook.includes(needle)) throw new Error(`deploy hook missing ${needle}`);
  }
  if (
    !nodeEnv.includes("VOID_HTTP_HOST=127.0.0.1") ||
    !nodeEnv.includes("VOID_P2P_HOST=0.0.0.0")
  ) {
    throw new Error("node seed environment boundary mismatch");
  }

  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`endpoint=${packet.endpoint}`);
  console.log("acme_http_public=true");
  console.log("restricted_https_public=true");
  console.log("native_p2p_public=true");
  console.log("node_http_loopback_only=true");
  console.log("gateway_loopback_only=true");
  console.log("manifest_published=false");
  console.log("services_started=false");
  console.log("credentials_read=false");
} catch (error) {
  fail(error?.stack || String(error));
}
