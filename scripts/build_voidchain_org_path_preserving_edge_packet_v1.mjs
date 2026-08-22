#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_BUILDER_V1";
const SCHEMA = "voidchain_org_path_preserving_edge_packet_v1";
const HOSTNAMES = Object.freeze(["voidchain.org", "www.voidchain.org"]);
const EDGE_ORIGIN = "http://127.0.0.1:8080";
const UNIT_NAME = "voidchain-org-path-preserving-edge-v1.service";
const BUILDER_RELATIVE = "scripts/build_voidchain_org_path_preserving_edge_packet_v1.mjs";
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
  const required = [
    "tunnel-id",
    "credentials-file",
    "repo-root",
    "expected-head",
    "cloudflared",
    "output",
  ];
  for (const key of required) if (!values[key]) throw new Error(`missing --${key}`);
  const unknown = Object.keys(values).filter((key) => !required.includes(key));
  if (unknown.length) throw new Error(`unknown argument --${unknown[0]}`);
  return values;
}

function rejectControl(value, label) {
  if (/[\0\r\n]/.test(value)) throw new Error(`${label} contains a control character`);
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
  if (fs.realpathSync(input) !== input) throw new Error(`${label} path must already be canonical`);
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

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
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

function systemdQuote(value) {
  const text = rejectControl(String(value), "systemd argument");
  if (text.includes("%")) throw new Error("systemd argument contains a specifier character");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function writeExclusive(file, content, mode = 0o600) {
  fs.writeFileSync(file, content, { encoding: "utf8", flag: "wx", mode });
}

function gitState(repoRoot, expectedHead) {
  if (!/^[0-9a-f]{40}$/.test(expectedHead)) throw new Error("expected head must be a 40-character lowercase SHA");
  const top = fs.realpathSync(run("git", ["-C", repoRoot, "rev-parse", "--show-toplevel"]));
  if (top !== repoRoot) throw new Error("repository root is not the Git worktree top level");
  const head = run("git", ["-C", repoRoot, "rev-parse", "HEAD"]);
  if (head !== expectedHead) throw new Error(`repository head ${head} does not match expected ${expectedHead}`);
  const dirty = run("git", ["-C", repoRoot, "status", "--porcelain=v1", "--untracked-files=all"]);
  if (dirty) throw new Error("repository must be clean before packet generation");
  return head;
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

function serviceText(repoRoot, cloudflaredPath, configPath, tunnelId) {
  return [
    "[Unit]",
    "Description=VOID voidchain.org path-preserving HTTPS edge v1",
    "After=network-online.target",
    "Wants=network-online.target",
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
    "ProtectSystem=strict",
    "ProtectHome=read-only",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");
}

function installText(output) {
  return [
    "VOID voidchain.org path-preserving edge packet v1",
    "",
    `hostnames=${HOSTNAMES.join(",")}`,
    `edge_origin=${EDGE_ORIGIN}`,
    "path_policy=host-only ingress; no path matcher, redirect, prefix strip, or rewrite",
    "",
    "This packet does not change DNS and does not touch the existing Tailscale Funnel.",
    "The packet directory must remain durable because the generated service references its config file.",
    "",
    "Verify:",
    `  node scripts/verify_voidchain_org_path_preserving_edge_packet_v1.mjs --packet ${output}`,
    "",
    "Install without starting/enabling the tunnel:",
    `  VOIDCHAIN_ORG_PATH_EDGE_START=0 bash ops/public/install_voidchain_org_path_preserving_edge_packet_v1.sh ${output}`,
    "",
    "Activate only after separate review:",
    `  VOIDCHAIN_ORG_PATH_EDGE_START=1 bash ops/public/install_voidchain_org_path_preserving_edge_packet_v1.sh ${output}`,
    "",
    "DNS/TLS binding for both hostnames is a separate operator action after activation proof.",
    "Do not use registrar HTTP forwarding; it cannot preserve arbitrary request paths.",
    "",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const tunnelId = normalizeUuid(args["tunnel-id"]);
  const repoRoot = realDirectory(args["repo-root"], "repository root");
  const expectedHead = String(args["expected-head"]).trim().toLowerCase();
  gitState(repoRoot, expectedHead);

  const builderSource = regularPath(path.join(repoRoot, BUILDER_RELATIVE), "builder source");
  const credentialsFile = regularPath(args["credentials-file"], "credentials file", { mode600: true });
  if (isPathInside(repoRoot, credentialsFile)) throw new Error("credentials file must remain outside the repository");
  if (path.basename(credentialsFile) !== `${tunnelId}.json`) throw new Error("credentials filename must match the tunnel ID");

  const cloudflaredPath = regularPath(args.cloudflared, "cloudflared executable", { executable: true });
  const cloudflaredVersion = runCloudflared(cloudflaredPath, ["--version"]).split(/\r?\n/)[0].slice(0, 512);
  if (!/cloudflared/i.test(cloudflaredVersion)) throw new Error("cloudflared --version did not identify cloudflared");

  const output = path.resolve(rejectControl(args.output, "output directory"));
  if (isPathInside(repoRoot, output)) throw new Error("output directory must remain outside the repository");
  if (fs.existsSync(output)) throw new Error("output directory already exists");
  fs.mkdirSync(output, { recursive: false, mode: 0o700 });

  const configPath = path.join(output, "cloudflared-config.yml");
  const unitPath = path.join(output, UNIT_NAME);
  const installPath = path.join(output, "INSTALL.txt");

  writeExclusive(configPath, configText(tunnelId, credentialsFile));
  writeExclusive(unitPath, serviceText(repoRoot, cloudflaredPath, configPath, tunnelId));
  writeExclusive(installPath, installText(output));

  runCloudflared(cloudflaredPath, ["--config", configPath, "tunnel", "ingress", "validate"]);

  const files = {};
  for (const name of ["cloudflared-config.yml", UNIT_NAME, "INSTALL.txt"]) {
    const file = path.join(output, name);
    files[name] = { bytes: fs.statSync(file).size, sha256: sha256File(file) };
  }

  const body = {
    schema: SCHEMA,
    marker: MARKER,
    generated_at: new Date().toISOString(),
    hostnames: HOSTNAMES,
    public_origins: HOSTNAMES.map((hostname) => `https://${hostname}`),
    path_preservation: {
      host_only_ingress: true,
      path_matcher: false,
      redirect: false,
      prefix_strip: false,
      rewrite: false,
    },
    local_edge: {
      origin: EDGE_ORIGIN,
      expected_adapter: "void_public_seed_adapter",
      existing_tailscale_funnel_unchanged: true,
    },
    tunnel_id: tunnelId,
    credentials_file: credentialsFile,
    repository_root: repoRoot,
    expected_repository_head: expectedHead,
    builder_source: {
      path: builderSource,
      sha256: sha256File(builderSource),
    },
    cloudflared_executable: {
      path: cloudflaredPath,
      sha256: sha256File(cloudflaredPath),
      version: cloudflaredVersion,
    },
    expected_route_checks: [
      { path: "/", status: 200 },
      { path: "/__void/ready.json", status: 200 },
      { path: "/__void/adapter.json", status: 200 },
      { path: "/__void/public-seed-adapter/status.json", status: 200 },
      { path: "/participant", status: 200 },
      { path: "/rpc", status: 404 },
    ],
    activation: {
      service_installed: false,
      service_started: false,
      dns_changed: false,
      northwest_forwarding_changed: false,
      tailscale_funnel_changed: false,
    },
    authority: {
      credentials_contents_read: false,
      node_runtime_changed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      work_credit_authority: false,
      treasury_authority: false,
      money_movement_authority: false,
    },
    files,
  };
  const packet = { ...body, packet_id: `voidedge1_${sha256Bytes(canonicalJson(body))}` };
  writeExclusive(path.join(output, "packet.json"), `${JSON.stringify(packet, null, 2)}\n`);

  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`packet_dir=${output}`);
  console.log(`hostnames=${HOSTNAMES.join(",")}`);
  console.log(`edge_origin=${EDGE_ORIGIN}`);
  console.log("cloudflared_preflight_timeout_ms=5000");
  console.log("cloudflared_preflight_max_output_bytes=65536");
  console.log("dns_changed=false");
  console.log("tailscale_funnel_changed=false");
}

try {
  main();
} catch (error) {
  fail(String(error?.message || error));
}
