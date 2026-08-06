#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_BUILDER_V1";
const SCHEMA = "void_public_seed_named_tunnel_packet_v1";
const TEMPORARY_SUFFIXES = [
  ".trycloudflare.com",
  ".ngrok-free.app",
  ".ngrok.io",
  ".loca.lt",
  ".serveo.net",
  ".localhost.run",
  ".tunnelmole.net",
  ".pinggy.link",
  ".devtunnels.ms",
];

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
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
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
    values[key.slice(2)] = value;
    index += 1;
  }
  for (const key of [
    "hostname",
    "tunnel-id",
    "credentials-file",
    "repo-root",
    "expected-head",
    "cloudflared",
    "output",
  ]) {
    if (!values[key]) throw new Error(`missing --${key}`);
  }
  return values;
}

function rejectControl(value, label) {
  if (/[\0\r\n]/.test(value)) throw new Error(`${label} contains a control character`);
  if (value.includes("%")) throw new Error(`${label} contains a systemd specifier character`);
  return value;
}

function normalizeHostname(raw) {
  const value = String(raw).trim().toLowerCase().replace(/\.$/, "");
  rejectControl(value, "hostname");
  if (value.length < 4 || value.length > 253 || !value.includes(".")) {
    throw new Error("hostname must be a fully qualified DNS name");
  }
  if (net.isIP(value)) throw new Error("hostname must not be an IP literal");
  if (
    value === "localhost" ||
    value.endsWith(".local") ||
    value.endsWith(".internal") ||
    value.endsWith(".home") ||
    value.endsWith(".lan") ||
    value.endsWith(".onion") ||
    TEMPORARY_SUFFIXES.some((suffix) => value === suffix.slice(1) || value.endsWith(suffix))
  ) {
    throw new Error("hostname is private, local, onion-only, or temporary");
  }
  for (const label of value.split(".")) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
      throw new Error(`hostname label is invalid: ${label}`);
    }
  }
  return value;
}

function normalizeUuid(raw) {
  const value = String(raw).trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) {
    throw new Error("tunnel ID must be a canonical UUID");
  }
  return value;
}

function regularPath(raw, label, { executable = false, mode600 = false } = {}) {
  const input = path.resolve(rejectControl(String(raw), label));
  const lstat = fs.lstatSync(input);
  if (lstat.isSymbolicLink() || !lstat.isFile()) throw new Error(`${label} must be one regular non-symlink file`);
  const real = fs.realpathSync(input);
  if (real !== input) throw new Error(`${label} path must already be canonical`);
  if (executable && (lstat.mode & 0o111) === 0) throw new Error(`${label} is not executable`);
  if (mode600 && (lstat.mode & 0o777) !== 0o600) throw new Error(`${label} must have mode 0600`);
  return input;
}

function realDirectory(raw, label) {
  const input = path.resolve(rejectControl(String(raw), label));
  const lstat = fs.lstatSync(input);
  if (lstat.isSymbolicLink() || !lstat.isDirectory()) throw new Error(`${label} must be one real directory`);
  if (fs.realpathSync(input) !== input) throw new Error(`${label} path must already be canonical`);
  return input;
}

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return String(result.stdout || "").trim();
}

function systemdQuote(value) {
  const text = rejectControl(String(value), "systemd argument");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function writeExclusive(file, content, mode) {
  fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx", mode });
}

function gitState(repoRoot, expectedHead) {
  if (!/^[0-9a-f]{40}$/.test(expectedHead)) throw new Error("expected head must be a 40-character lowercase SHA");
  const head = run("git", ["-C", repoRoot, "rev-parse", "HEAD"]);
  if (head !== expectedHead) throw new Error(`repository head ${head} does not match expected ${expectedHead}`);
  const dirty = run("git", ["-C", repoRoot, "status", "--porcelain=v1", "--untracked-files=all"]);
  if (dirty) throw new Error("repository must be clean before packet generation");
  return head;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const hostname = normalizeHostname(args.hostname);
  const tunnelId = normalizeUuid(args["tunnel-id"]);
  const credentialsFile = regularPath(args["credentials-file"], "credentials file", { mode600: true });
  const repoRoot = realDirectory(args["repo-root"], "repository root");
  const expectedHead = String(args["expected-head"]).trim().toLowerCase();
  gitState(repoRoot, expectedHead);

  const nodePath = regularPath(process.execPath, "Node.js executable", { executable: true });
  const cloudflaredPath = regularPath(args.cloudflared, "cloudflared executable", { executable: true });
  const gatewaySource = regularPath(
    path.join(repoRoot, "tools", "void-public-seed-gateway-v1.mjs"),
    "public seed gateway source",
  );
  run(nodePath, ["--check", gatewaySource]);
  const cloudflaredVersion = run(cloudflaredPath, ["--version"]).split(/\r?\n/)[0].slice(0, 512);
  if (!/cloudflared/i.test(cloudflaredVersion)) throw new Error("cloudflared --version did not identify cloudflared");

  const output = path.resolve(rejectControl(args.output, "output directory"));
  if (fs.existsSync(output)) throw new Error("output directory already exists");
  fs.mkdirSync(output, { recursive: false, mode: 0o700 });

  const configPath = path.join(output, "cloudflared-config.yml");
  const gatewayUnitPath = path.join(output, "void-public-seed-gateway-v1.service");
  const tunnelUnitPath = path.join(output, "void-public-seed-named-tunnel-v1.service");
  const instructionPath = path.join(output, "INSTALL.txt");

  const config = [
    `tunnel: ${tunnelId}`,
    `credentials-file: ${credentialsFile}`,
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
    `  - hostname: ${hostname}`,
    "    service: http://127.0.0.1:4111",
    "  - service: http_status:404",
    "",
  ].join("\n");

  const gatewayUnit = [
    "[Unit]",
    "Description=VOID restricted public seed gateway v1",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    `WorkingDirectory=${systemdQuote(repoRoot)}`,
    "Environment=VOID_PUBLIC_SEED_BIND=127.0.0.1",
    "Environment=VOID_PUBLIC_SEED_PORT=4111",
    "Environment=VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100",
    `ExecStart=${systemdQuote(nodePath)} ${systemdQuote(gatewaySource)}`,
    "Restart=always",
    "RestartSec=5",
    "KillMode=control-group",
    "TimeoutStopSec=15",
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");

  const tunnelUnit = [
    "[Unit]",
    "Description=VOID stable public seed named tunnel v1",
    "After=network-online.target void-public-seed-gateway-v1.service",
    "Wants=network-online.target void-public-seed-gateway-v1.service",
    "",
    "[Service]",
    "Type=simple",
    `WorkingDirectory=${systemdQuote(repoRoot)}`,
    `ExecStart=${systemdQuote(cloudflaredPath)} --no-autoupdate --config ${systemdQuote(configPath)} tunnel run ${systemdQuote(tunnelId)}`,
    "Restart=always",
    "RestartSec=5",
    "KillMode=control-group",
    "TimeoutStopSec=20",
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");

  const instructions = [
    "VOID stable public seed named-tunnel packet v1",
    "",
    `hostname=${hostname}`,
    `tunnel_id=${tunnelId}`,
    `expected_repo_head=${expectedHead}`,
    "",
    "Review packet.json and every generated file before installation.",
    "The credentials file remains external and is never copied into this packet.",
    "Install without starting services:",
    `  VOID_PUBLIC_SEED_START_SERVICES=0 bash ops/public/install_void_public_seed_named_tunnel_packet_v1.sh ${output}`,
    "Activate only after review:",
    `  VOID_PUBLIC_SEED_START_SERVICES=1 bash ops/public/install_void_public_seed_named_tunnel_packet_v1.sh ${output}`,
    "After public DNS/TLS is live, run the manual qualification workflow.",
    "",
  ].join("\n");

  writeExclusive(configPath, config, 0o600);
  writeExclusive(gatewayUnitPath, gatewayUnit, 0o600);
  writeExclusive(tunnelUnitPath, tunnelUnit, 0o600);
  writeExclusive(instructionPath, instructions, 0o600);

  run(cloudflaredPath, ["--config", configPath, "tunnel", "ingress", "validate"]);

  const fileEntries = {};
  for (const name of [
    path.basename(configPath),
    path.basename(gatewayUnitPath),
    path.basename(tunnelUnitPath),
    path.basename(instructionPath),
  ]) {
    const file = path.join(output, name);
    fileEntries[name] = {
      bytes: fs.statSync(file).size,
      sha256: sha256File(file),
    };
  }

  const body = {
    schema: SCHEMA,
    generated_at: new Date().toISOString(),
    hostname,
    public_origin: `https://${hostname}`,
    tunnel_id: tunnelId,
    credentials_file: credentialsFile,
    repository_root: repoRoot,
    expected_repository_head: expectedHead,
    node_executable: {
      path: nodePath,
      sha256: sha256File(nodePath),
      version: process.versions.node,
    },
    cloudflared_executable: {
      path: cloudflaredPath,
      sha256: sha256File(cloudflaredPath),
      version: cloudflaredVersion,
    },
    gateway: {
      bind: "127.0.0.1",
      port: 4111,
      upstream: "http://127.0.0.1:4100",
      public_routes_only: true,
    },
    activation: {
      services_started: false,
      dns_changed: false,
      manifest_published: false,
      stable_seed_qualified: false,
    },
    authority: {
      private_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
    files: fileEntries,
  };
  const packet = {
    ...body,
    packet_id: `voidpsa1_${sha256Bytes(canonicalJson(body))}`,
  };
  const packetPath = path.join(output, "packet.json");
  writeExclusive(packetPath, `${JSON.stringify(packet, null, 2)}\n`, 0o600);

  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`packet_dir=${output}`);
  console.log(`expected_repository_head=${expectedHead}`);
  console.log(`public_origin=${packet.public_origin}`);
  console.log("credentials_read=false");
  console.log("services_started=false");
  console.log("dns_changed=false");
  console.log("manifest_published=false");
  console.log("money_movement_authority=false");
}

try {
  main();
} catch (error) {
  fail(error?.stack || String(error));
}
