#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_VERIFIER_V1";
const SCHEMA = "voidchain_org_path_preserving_edge_packet_v1";
const HOSTNAMES = ["voidchain.org", "www.voidchain.org"];
const EDGE_ORIGIN = "http://127.0.0.1:8080";
const UNIT_NAME = "voidchain-org-path-preserving-edge-v1.service";
const BUILDER_RELATIVE = "scripts/build_voidchain_org_path_preserving_edge_packet_v1.mjs";
const EXPECTED_FILES = ["INSTALL.txt", "cloudflared-config.yml", UNIT_NAME, "packet.json"].sort();
const CLOUDFLARED_TOOL_TIMEOUT_MS = 5_000;
const CLOUDFLARED_TOOL_MAX_OUTPUT_BYTES = 64 * 1024;

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

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`unexpected argument ${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`missing value for ${key}`);
    const name = key.slice(2);
    if (name in values) throw new Error(`duplicate --${name}`);
    values[name] = value;
    index += 1;
  }
  if (!values.packet) throw new Error("missing --packet");
  const unknown = Object.keys(values).filter((key) => key !== "packet" && key !== "repo-root");
  if (unknown.length) throw new Error(`unknown argument --${unknown[0]}`);
  return values;
}

function realDirectory(raw, label) {
  const input = path.resolve(String(raw));
  const stat = fs.lstatSync(input);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label} must be one real directory`);
  if (fs.realpathSync(input) !== input) throw new Error(`${label} path must already be canonical`);
  return input;
}

function regularPath(raw, label, { executable = false, mode600 = false } = {}) {
  const input = path.resolve(String(raw));
  const stat = fs.lstatSync(input);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`${label} must be one regular non-symlink file`);
  if (fs.realpathSync(input) !== input) throw new Error(`${label} path must already be canonical`);
  if (executable && (stat.mode & 0o111) === 0) throw new Error(`${label} is not executable`);
  if (mode600 && (stat.mode & 0o777) !== 0o600) throw new Error(`${label} must have mode 0600`);
  return input;
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function run(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return String(result.stdout || "").trim();
}

function runCloudflared(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: CLOUDFLARED_TOOL_TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: CLOUDFLARED_TOOL_MAX_OUTPUT_BYTES,
  });
  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      throw new Error(`cloudflared invocation timed out after ${CLOUDFLARED_TOOL_TIMEOUT_MS}ms`);
    }
    throw new Error(`cloudflared invocation failed: ${result.error.message}`);
  }
  if (result.signal) {
    throw new Error(`cloudflared invocation terminated by signal ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return String(result.stdout || "").trim();
}

function sameArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function configText(tunnelId, credentialsFile) {
  return [
    `tunnel: ${tunnelId}`,
    `credentials-file: ${credentialsFile}`,
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
    `  - hostname: ${HOSTNAMES[0]}`,
    `    service: ${EDGE_ORIGIN}`,
    `  - hostname: ${HOSTNAMES[1]}`,
    `    service: ${EDGE_ORIGIN}`,
    "  - service: http_status:404",
    "",
  ].join("\n");
}

function gitState(repoRoot, expectedHead) {
  if (!/^[0-9a-f]{40}$/.test(expectedHead)) throw new Error("packet expected_repository_head is invalid");
  const top = fs.realpathSync(run("git", ["-C", repoRoot, "rev-parse", "--show-toplevel"]));
  if (top !== repoRoot) throw new Error("repository root is not the Git worktree top level");
  const head = run("git", ["-C", repoRoot, "rev-parse", "HEAD"]);
  if (head !== expectedHead) throw new Error(`current repository head ${head} does not match packet head ${expectedHead}`);
  const dirty = run("git", ["-C", repoRoot, "status", "--porcelain=v1", "--untracked-files=all"]);
  if (dirty) throw new Error("repository must be clean during packet verification");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packetDir = realDirectory(args.packet, "packet directory");
  const packetPath = regularPath(path.join(packetDir, "packet.json"), "packet.json");
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

  if (packet.schema !== SCHEMA) throw new Error("packet schema mismatch");
  if (!sameArray(packet.hostnames, HOSTNAMES)) throw new Error("packet hostnames mismatch");
  if (!sameArray(packet.public_origins, HOSTNAMES.map((host) => `https://${host}`))) throw new Error("packet public origins mismatch");
  if (packet.local_edge?.origin !== EDGE_ORIGIN) throw new Error("packet local edge origin mismatch");
  if (packet.local_edge?.expected_adapter !== "void_public_seed_adapter") throw new Error("packet adapter identity mismatch");
  if (packet.local_edge?.existing_tailscale_funnel_unchanged !== true) throw new Error("packet must preserve the existing Funnel");
  for (const key of ["host_only_ingress", "path_matcher", "redirect", "prefix_strip", "rewrite"]) {
    const expected = key === "host_only_ingress";
    if (packet.path_preservation?.[key] !== expected) throw new Error(`path preservation flag mismatch: ${key}`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(packet.tunnel_id || "")) {
    throw new Error("packet tunnel ID is invalid");
  }

  const repoRoot = realDirectory(args["repo-root"] || packet.repository_root, "repository root");
  if (repoRoot !== packet.repository_root) throw new Error("repository root differs from packet");
  if (isPathInside(repoRoot, packetDir)) throw new Error("packet directory must remain outside the repository");
  gitState(repoRoot, packet.expected_repository_head);

  const builderSource = regularPath(path.join(repoRoot, BUILDER_RELATIVE), "builder source");
  if (packet.builder_source?.path !== builderSource) throw new Error("builder source path mismatch");
  if (packet.builder_source?.sha256 !== sha256File(builderSource)) throw new Error("builder source hash mismatch");

  const credentialsFile = regularPath(packet.credentials_file, "credentials file", { mode600: true });
  if (isPathInside(repoRoot, credentialsFile)) throw new Error("credentials file must remain outside the repository");
  if (path.basename(credentialsFile) !== `${packet.tunnel_id}.json`) throw new Error("credentials filename does not match tunnel ID");

  const cloudflaredPath = regularPath(packet.cloudflared_executable?.path, "cloudflared executable", { executable: true });
  if (packet.cloudflared_executable?.sha256 !== sha256File(cloudflaredPath)) throw new Error("cloudflared executable hash mismatch");
  const version = runCloudflared(cloudflaredPath, ["--version"]).split(/\r?\n/)[0].slice(0, 512);
  if (version !== packet.cloudflared_executable?.version || !/cloudflared/i.test(version)) throw new Error("cloudflared version mismatch");

  const names = fs.readdirSync(packetDir).sort();
  if (!sameArray(names, EXPECTED_FILES)) throw new Error(`packet file set mismatch: ${names.join(",")}`);
  const dataFiles = ["cloudflared-config.yml", UNIT_NAME, "INSTALL.txt"];
  for (const name of dataFiles) {
    const file = regularPath(path.join(packetDir, name), name);
    const recorded = packet.files?.[name];
    if (!recorded || recorded.bytes !== fs.statSync(file).size || recorded.sha256 !== sha256File(file)) {
      throw new Error(`packet file identity mismatch: ${name}`);
    }
  }

  const configPath = path.join(packetDir, "cloudflared-config.yml");
  const config = fs.readFileSync(configPath, "utf8");
  const expectedConfig = configText(packet.tunnel_id, credentialsFile);
  if (config !== expectedConfig) throw new Error("cloudflared config is not the exact host-only path-preserving form");
  if (/^\s*path\s*:/m.test(config) || /\b(?:redirect|rewrite|strip)\b/i.test(config)) {
    throw new Error("cloudflared config contains a path selector or rewrite primitive");
  }
  const originMatches = config.match(/service: http:\/\/127\.0\.0\.1:8080/g) || [];
  if (originMatches.length !== 2) throw new Error("cloudflared config must map exactly two hostnames to the existing edge");
  if (!config.endsWith("  - service: http_status:404\n")) throw new Error("cloudflared config final deny rule mismatch");

  runCloudflared(cloudflaredPath, ["--config", configPath, "tunnel", "ingress", "validate"]);

  const { packet_id: packetId, ...body } = packet;
  const expectedId = `voidedge1_${sha256Bytes(canonicalJson(body))}`;
  if (packetId !== expectedId) throw new Error("packet ID mismatch");

  const activation = packet.activation || {};
  for (const key of [
    "service_installed",
    "service_started",
    "dns_changed",
    "northwest_forwarding_changed",
    "tailscale_funnel_changed",
  ]) {
    if (activation[key] !== false) throw new Error(`packet activation flag must be false: ${key}`);
  }
  const authority = packet.authority || {};
  for (const [key, expected] of Object.entries({
    credentials_contents_read: false,
    node_runtime_changed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    work_credit_authority: false,
    treasury_authority: false,
    money_movement_authority: false,
  })) {
    if (authority[key] !== expected) throw new Error(`packet authority flag mismatch: ${key}`);
  }

  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packetId}`);
  console.log(`hostnames=${HOSTNAMES.join(",")}`);
  console.log(`edge_origin=${EDGE_ORIGIN}`);
  console.log("path_preserved=true");
  console.log("cloudflared_preflight_timeout_ms=5000");
  console.log("cloudflared_preflight_max_output_bytes=65536");
  console.log("dns_changed=false");
  console.log("tailscale_funnel_changed=false");
  console.log("credentials_contents_read=false");
}

try {
  main();
} catch (error) {
  fail(String(error?.message || error));
}
