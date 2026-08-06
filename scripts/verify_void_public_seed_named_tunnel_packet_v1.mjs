#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_VERIFIER_V1";
const SCHEMA = "void_public_seed_named_tunnel_packet_v1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}
function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON cannot contain non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function sha256Bytes(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function sha256File(file) { return sha256Bytes(fs.readFileSync(file)); }
function run(command, args) {
  const result = childProcess.spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  return String(result.stdout || "").trim();
}
function parseArgs(argv) {
  let packet = "";
  let skipRuntimeProbe = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--skip-runtime-probe") { skipRuntimeProbe = true; continue; }
    if (arg === "--packet") { packet = argv[index + 1] || ""; index += 1; continue; }
    throw new Error(`unexpected argument ${arg}`);
  }
  if (!packet) throw new Error("missing --packet");
  return { packet, skipRuntimeProbe };
}
function regularNonSymlink(file, label, { mode600 = false, executable = false } = {}) {
  const resolved = path.resolve(String(file));
  const lstat = fs.lstatSync(resolved);
  if (lstat.isSymbolicLink() || !lstat.isFile()) throw new Error(`${label} must be one regular non-symlink file`);
  if (fs.realpathSync(resolved) !== resolved) throw new Error(`${label} path must already be canonical`);
  if (mode600 && (lstat.mode & 0o777) !== 0o600) throw new Error(`${label} must have mode 0600`);
  if (executable && (lstat.mode & 0o111) === 0) throw new Error(`${label} must be executable`);
  return resolved;
}
function realDirectory(directory, label) {
  const resolved = path.resolve(String(directory));
  const lstat = fs.lstatSync(resolved);
  if (lstat.isSymbolicLink() || !lstat.isDirectory()) throw new Error(`${label} must be one real directory`);
  if (fs.realpathSync(resolved) !== resolved) throw new Error(`${label} path must already be canonical`);
  return resolved;
}
function readJson(file, label) {
  const bytes = fs.readFileSync(file);
  if (bytes.length > 1024 * 1024) throw new Error(`${label} exceeds one MiB`);
  try { return JSON.parse(bytes.toString("utf8")); }
  catch (error) { throw new Error(`${label} is invalid JSON: ${error?.message || error}`); }
}
function verifyAuthority(authority) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) throw new Error("packet authority must be an object");
  for (const key of ["private_routes_exposed", "wallet_authority", "signer_authority", "validator_authority", "treasury_authority", "work_credit_authority", "money_movement_authority"]) {
    if (authority[key] !== false) throw new Error(`packet authority ${key} must be false`);
  }
}
function verifyPacketId(packet) {
  if (!/^voidpsa1_[0-9a-f]{64}$/.test(String(packet.packet_id || ""))) throw new Error("packet ID is missing or malformed");
  const body = structuredClone(packet);
  delete body.packet_id;
  const expected = `voidpsa1_${sha256Bytes(canonicalJson(body))}`;
  if (packet.packet_id !== expected) throw new Error("packet ID does not match packet content");
}
async function runtimeProbe() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("http://127.0.0.1:4100/__void/ready.json", { signal: controller.signal, redirect: "manual", headers: { accept: "application/json" } });
    if (response.status !== 200) throw new Error(`local readiness returned HTTP ${response.status}`);
    const body = await response.json();
    if (body?.ready !== true || !Number.isSafeInteger(Number(body?.head)) || Number(body.head) <= 0 || Number(body?.gap) !== 0 || Number(body?.txroot_live) !== 1) {
      throw new Error("local node readiness is not exact-green");
    }
    return Number(body.head);
  } finally { clearTimeout(timer); }
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packetDir = realDirectory(args.packet, "packet directory");
  const packetPath = regularNonSymlink(path.join(packetDir, "packet.json"), "packet.json", { mode600: true });
  const packet = readJson(packetPath, "packet.json");
  if (packet.schema !== SCHEMA) throw new Error("unexpected packet schema");
  verifyPacketId(packet);
  verifyAuthority(packet.authority);
  if (packet.activation?.services_started !== false || packet.activation?.dns_changed !== false || packet.activation?.manifest_published !== false || packet.activation?.stable_seed_qualified !== false) {
    throw new Error("packet activation flags must all be false");
  }
  const repoRoot = realDirectory(packet.repository_root, "repository root");
  if (!/^[0-9a-f]{40}$/.test(String(packet.expected_repository_head || ""))) throw new Error("expected repository head is malformed");
  const head = run("git", ["-C", repoRoot, "rev-parse", "HEAD"]);
  if (head !== packet.expected_repository_head) throw new Error(`repository head ${head} does not match packet head ${packet.expected_repository_head}`);
  const dirty = run("git", ["-C", repoRoot, "status", "--porcelain=v1", "--untracked-files=all"]);
  if (dirty) throw new Error("repository is not clean");
  const credentialsFile = regularNonSymlink(packet.credentials_file, "credentials file", { mode600: true });
  void credentialsFile;
  const nodePath = regularNonSymlink(packet.node_executable?.path, "Node.js executable", { executable: true });
  const cloudflaredPath = regularNonSymlink(packet.cloudflared_executable?.path, "cloudflared executable", { executable: true });
  if (sha256File(nodePath) !== packet.node_executable.sha256) throw new Error("Node.js executable SHA-256 mismatch");
  if (sha256File(cloudflaredPath) !== packet.cloudflared_executable.sha256) throw new Error("cloudflared executable SHA-256 mismatch");
  const version = run(cloudflaredPath, ["--version"]).split(/\r?\n/)[0].slice(0, 512);
  if (version !== packet.cloudflared_executable.version) throw new Error("cloudflared version mismatch");
  const files = packet.files;
  if (!files || typeof files !== "object" || Array.isArray(files)) throw new Error("packet files map is invalid");
  const expectedNames = new Set(["cloudflared-config.yml", "void-public-seed-gateway-v1.service", "void-public-seed-named-tunnel-v1.service", "INSTALL.txt"]);
  if (Object.keys(files).length !== expectedNames.size) throw new Error("packet files map has unexpected cardinality");
  for (const [name, metadata] of Object.entries(files)) {
    if (!expectedNames.delete(name)) throw new Error(`unexpected packet file ${name}`);
    if (path.basename(name) !== name) throw new Error(`packet file name escapes packet directory: ${name}`);
    const file = regularNonSymlink(path.join(packetDir, name), `packet file ${name}`, { mode600: true });
    const stat = fs.statSync(file);
    if (stat.size !== Number(metadata.bytes)) throw new Error(`packet file ${name} byte count mismatch`);
    if (sha256File(file) !== metadata.sha256) throw new Error(`packet file ${name} SHA-256 mismatch`);
  }
  if (expectedNames.size !== 0) throw new Error("packet is missing required files");
  const configPath = path.join(packetDir, "cloudflared-config.yml");
  const gatewayUnit = fs.readFileSync(path.join(packetDir, "void-public-seed-gateway-v1.service"), "utf8");
  const tunnelUnit = fs.readFileSync(path.join(packetDir, "void-public-seed-named-tunnel-v1.service"), "utf8");
  const config = fs.readFileSync(configPath, "utf8");
  if (!config.includes(`tunnel: ${packet.tunnel_id}`)) throw new Error("config tunnel ID mismatch");
  if (!config.includes(`credentials-file: ${packet.credentials_file}`)) throw new Error("config credentials path mismatch");
  if (!config.includes(`  - hostname: ${packet.hostname}`)) throw new Error("config hostname mismatch");
  if (!config.includes("    service: http://127.0.0.1:4111")) throw new Error("config does not use loopback gateway");
  if (!config.trimEnd().endsWith("- service: http_status:404")) throw new Error("config lacks terminal catch-all 404 rule");
  run(cloudflaredPath, ["--config", configPath, "tunnel", "ingress", "validate"]);
  const combinedUnits = `${gatewayUnit}\n${tunnelUnit}`;
  for (const forbidden of ["--token", "trycloudflare.com", "100.64.", "100.122.", "0.0.0.0:4111"]) {
    if (combinedUnits.includes(forbidden)) throw new Error(`service units contain forbidden text ${forbidden}`);
  }
  if (!gatewayUnit.includes("Environment=VOID_PUBLIC_SEED_BIND=127.0.0.1")) throw new Error("gateway service is not fixed to numeric loopback");
  if (!gatewayUnit.includes("Environment=VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100")) throw new Error("gateway service upstream is not numeric loopback");
  if (!tunnelUnit.includes(`--config \"${configPath.replace(/\\/g, "\\\\").replace(/\"/g, '\\"')}\" tunnel run`)) throw new Error("tunnel service does not use the packet configuration");
  const gatewaySource = regularNonSymlink(path.join(repoRoot, "tools", "void-public-seed-gateway-v1.mjs"), "public seed gateway source");
  run(nodePath, ["--check", gatewaySource]);
  let localHead = null;
  if (!args.skipRuntimeProbe) localHead = await runtimeProbe();
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`expected_repository_head=${packet.expected_repository_head}`);
  console.log(`public_origin=${packet.public_origin}`);
  console.log(`runtime_probe_skipped=${args.skipRuntimeProbe}`);
  if (localHead !== null) console.log(`local_head=${localHead}`);
  console.log("credentials_read=false");
  console.log("token_in_process_arguments=false");
  console.log("gateway_loopback_only=true");
  console.log("catch_all_404=true");
  console.log("services_started=false");
  console.log("manifest_published=false");
  console.log("money_movement_authority=false");
}
main().catch((error) => fail(error?.stack || String(error)));
