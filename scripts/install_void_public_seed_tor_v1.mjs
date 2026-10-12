#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { validateOnionHostname } from "../tools/void-tor-agent-access-client-v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_TOR_INSTALLER_V1";
const CONFIRM = "activate-void-public-seed-tor-v1";
const GATEWAY_UNIT = "void-public-seed-tor-gateway-v1.service";
const TOR_UNIT = "void-public-seed-tor-v1.service";
const SENTINEL = ".void-public-seed-tor-v1-owned";

function fail(message) {
  throw new Error(String(message));
}

function run(command, args, { allowFailure = false } = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!allowFailure && result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return { status: result.status, stdout: String(result.stdout || "").trim(), stderr: String(result.stderr || "").trim() };
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function quoteSystemd(value) {
  const text = String(value);
  if (/[\0\r\n%]/.test(text)) fail("systemd argument contains a forbidden character");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function quoteTorrc(value) {
  const text = String(value);
  if (/[\0\r\n]/.test(text)) fail("torrc path contains a control character");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function exactRepository(repoRoot, expectedHead) {
  const root = fs.realpathSync(path.resolve(repoRoot));
  if (!/^[0-9a-f]{40}$/.test(expectedHead)) fail("expected head must be 40 lowercase hexadecimal characters");
  if (run("git", ["-C", root, "rev-parse", "HEAD"]).stdout !== expectedHead) fail("repository head mismatch");
  if (run("git", ["-C", root, "status", "--porcelain=v1", "--untracked-files=all"]).stdout) fail("repository is not clean");
  return root;
}

function realExecutable(raw, label) {
  const resolved = fs.realpathSync(path.resolve(raw));
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile() || (stat.mode & 0o111) === 0) fail(`${label} must be an executable regular file`);
  return resolved;
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function canonicalManagedPathV1(rawPath) {
  const absolute = path.resolve(rawPath);
  if (fs.existsSync(absolute) && fs.lstatSync(absolute).isSymbolicLink()) {
    fail("managed path must not be a symlink");
  }
  let cursor = absolute;
  const suffix = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) fail("managed path has no existing ancestor");
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.join(fs.realpathSync(cursor), ...suffix);
}

export function managedPathV1(raw, repoRoot, label) {
  const resolved = canonicalManagedPathV1(raw);
  const home = fs.realpathSync(os.homedir());
  if (!isInside(home, resolved) || resolved === home) {
    fail(`${label} must be a dedicated path beneath HOME`);
  }
  if (isInside(repoRoot, resolved)) fail(`${label} must remain outside the repository`);
  return resolved;
}

function assertNoOverlap(entries) {
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      if (isInside(entries[left][1], entries[right][1]) || isInside(entries[right][1], entries[left][1])) {
        fail(`${entries[left][0]} and ${entries[right][0]} must not overlap`);
      }
    }
  }
}

function prepareOwnedRoot(root, kind) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${kind} root must be a real directory`);
  fs.chmodSync(root, 0o700);
  const sentinel = path.join(root, SENTINEL);
  const expected = `marker=${MARKER}\nkind=${kind}\npath=${root}\nuid=${process.getuid()}\n`;
  if (fs.existsSync(sentinel)) {
    if (fs.lstatSync(sentinel).isSymbolicLink() || fs.readFileSync(sentinel, "utf8") !== expected) fail(`${kind} root ownership sentinel mismatch`);
  } else {
    const entries = fs.readdirSync(root);
    if (entries.length !== 0) fail(`${kind} root is non-empty without an ownership sentinel`);
    fs.writeFileSync(sentinel, expected, { flag: "wx", mode: 0o600 });
  }
}


function preparePrivateDirectoryV1(target, label) {
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      fail(`${label} must be a real directory`);
    }
  } else {
    fs.mkdirSync(target, { mode: 0o700 });
  }
  fs.chmodSync(target, 0o700);
}

export function writeManagedFileV1(target, content, mode = 0o600, label = "managed file") {
  const destination = path.resolve(target);
  if (fs.existsSync(destination)) {
    const stat = fs.lstatSync(destination);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      fail(`${label} must be a non-symlink regular file`);
    }
  }
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(12).toString("hex")}`;
  try {
    fs.writeFileSync(temporary, content, { flag: "wx", mode });
    fs.renameSync(temporary, destination);
    fs.chmodSync(destination, mode);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function unitIsEnabledV1(unit) {
  return run("systemctl", ["--user", "is-enabled", "--quiet", unit], {
    allowFailure: true,
  }).status === 0;
}

function unitIsActiveV1(unit) {
  return run("systemctl", ["--user", "is-active", "--quiet", unit], {
    allowFailure: true,
  }).status === 0;
}

function disableAutoStartV1({ stop = false } = {}) {
  const args = stop
    ? ["--user", "disable", "--now", TOR_UNIT, GATEWAY_UNIT]
    : ["--user", "disable", TOR_UNIT, GATEWAY_UNIT];
  run("systemctl", args, { allowFailure: true });
  for (const unit of [TOR_UNIT, GATEWAY_UNIT]) {
    if (unitIsEnabledV1(unit)) fail(`${unit} remained enabled`);
    if (stop && unitIsActiveV1(unit)) fail(`${unit} remained active`);
  }
}

export function renderTorSeedV1(options) {
  const repoRoot = path.resolve(options.repoRoot);
  const nodePath = path.resolve(options.nodePath);
  const torPath = path.resolve(options.torPath);
  const gatewaySource = path.join(repoRoot, "tools", "void-public-seed-gateway-v1.mjs");
  const qualifierSource = path.join(repoRoot, "scripts", "qualify_void_public_seed_tor_v1.mjs");
  const torData = path.join(options.dataRoot, "tor-data");
  const hiddenService = path.join(options.dataRoot, "hidden-service");
  const hostnameFile = path.join(hiddenService, "hostname");
  const qualificationDir = path.join(options.stateRoot, "qualifications");
  const torrcPath = path.join(options.configRoot, "torrc");
  const torrc = [
    `# Generated by ${MARKER}. No registrar, DNS, CDN, CA, cloud account, Tailnet, wallet, signer, validator, or mutation port is required.`,
    `DataDirectory ${quoteTorrc(torData)}`,
    `SocksPort 127.0.0.1:${options.socksPort} IsolateSOCKSAuth`,
    "SafeSocks 1",
    "SafeLogging 1",
    "ClientOnly 1",
    "RunAsDaemon 0",
    "Log notice stdout",
    `HiddenServiceDir ${quoteTorrc(hiddenService)}`,
    "HiddenServiceVersion 3",
    `HiddenServicePort ${options.virtualPort} 127.0.0.1:${options.gatewayPort}`,
    "",
  ].join("\n");
  const gatewayUnit = [
    "[Unit]",
    "Description=VOID restricted public seed gateway over Tor v1",
    "After=network.target",
    "",
    "[Service]",
    "Type=simple",
    "Environment=VOID_PUBLIC_SEED_BIND=127.0.0.1",
    `Environment=VOID_PUBLIC_SEED_PORT=${options.gatewayPort}`,
    "Environment=VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100",
    `ExecStart=${quoteSystemd(nodePath)} ${quoteSystemd(gatewaySource)}`,
    "Restart=on-failure",
    "RestartSec=3",
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "ProtectSystem=strict",
    "ProtectHome=read-only",
    "RestrictSUIDSGID=true",
    "RestrictRealtime=true",
    "LockPersonality=true",
    "UMask=0077",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");
  const torUnit = [
    "[Unit]",
    "Description=VOID stable Tor v3 public seed transport v1",
    `Requires=${GATEWAY_UNIT}`,
    `After=network-online.target ${GATEWAY_UNIT}`,
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    `ExecStart=${quoteSystemd(torPath)} -f ${quoteSystemd(torrcPath)}`,
    "Restart=on-failure",
    "RestartSec=5",
    "NoNewPrivileges=true",
    "PrivateTmp=true",
    "ProtectSystem=strict",
    "ProtectHome=read-only",
    `ReadWritePaths=${quoteSystemd(options.dataRoot)} ${quoteSystemd(options.stateRoot)}`,
    "RestrictSUIDSGID=true",
    "RestrictRealtime=true",
    "LockPersonality=true",
    "UMask=0077",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");
  return Object.freeze({
    torrc,
    gatewayUnit,
    torUnit,
    paths: { torrcPath, torData, hiddenService, hostnameFile, qualificationDir, gatewaySource, qualifierSource },
  });
}

function parseArgs(argv) {
  const command = argv.shift() || "plan";
  const values = { command, gatewayPort: 4111, socksPort: 19051, virtualPort: 80 };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) fail(`invalid argument near ${key || "end"}`);
    values[key.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
  }
  for (const key of ["repoRoot", "expectedHead", "tor"]) if (!values[key]) fail(`missing --${key}`);
  for (const key of ["gatewayPort", "socksPort", "virtualPort"]) {
    values[key] = Number(values[key]);
    if (!Number.isInteger(values[key]) || values[key] < 1 || values[key] > 65535) fail(`${key} is invalid`);
  }
  return values;
}

function normalizedOptions(args) {
  const repoRoot = exactRepository(args.repoRoot, args.expectedHead);
  const defaults = {
    configRoot: path.join(os.homedir(), ".config", "void", "tor-public-seed-v1"),
    dataRoot: path.join(os.homedir(), ".local", "share", "void", "tor-public-seed-v1"),
    stateRoot: path.join(os.homedir(), ".local", "state", "void", "tor-public-seed-v1"),
  };
  const configRoot = managedPathV1(args.configRoot || defaults.configRoot, repoRoot, "config root");
  const dataRoot = managedPathV1(args.dataRoot || defaults.dataRoot, repoRoot, "data root");
  const stateRoot = managedPathV1(args.stateRoot || defaults.stateRoot, repoRoot, "state root");
  const unitDir = managedPathV1(
    path.join(os.homedir(), ".config", "systemd", "user"),
    repoRoot,
    "systemd user unit root",
  );
  assertNoOverlap([["config root", configRoot], ["data root", dataRoot], ["state root", stateRoot]]);
  for (const [label, managedRoot] of [
    ["config root", configRoot],
    ["data root", dataRoot],
    ["state root", stateRoot],
  ]) {
    if (isInside(managedRoot, unitDir) || isInside(unitDir, managedRoot)) {
      fail(`${label} and systemd user unit root must not overlap`);
    }
  }
  const nodePath = realExecutable(process.execPath, "Node.js executable");
  const torPath = realExecutable(args.tor, "Tor executable");
  const torVersion = run(torPath, ["--version"]).stdout.split(/\r?\n/)[0];
  if (!/\bTor\b/i.test(torVersion)) fail("Tor executable did not identify itself");
  return {
    ...args,
    repoRoot,
    configRoot,
    dataRoot,
    stateRoot,
    unitDir,
    nodePath,
    torPath,
    torVersion,
  };
}

function writeRender(options, rendered) {
  disableAutoStartV1({ stop: true });
  for (const [root, kind] of [
    [options.configRoot, "config"],
    [options.dataRoot, "data"],
    [options.stateRoot, "state"],
  ]) prepareOwnedRoot(root, kind);
  preparePrivateDirectoryV1(rendered.paths.torData, "Tor data directory");
  preparePrivateDirectoryV1(rendered.paths.hiddenService, "hidden-service directory");
  preparePrivateDirectoryV1(rendered.paths.qualificationDir, "qualification directory");
  writeManagedFileV1(rendered.paths.torrcPath, rendered.torrc, 0o600, "Tor configuration");
  fs.mkdirSync(options.unitDir, { recursive: true, mode: 0o700 });
  const unitStat = fs.lstatSync(options.unitDir);
  if (unitStat.isSymbolicLink() || !unitStat.isDirectory()) {
    fail("systemd user unit root must be a real directory");
  }
  const gatewayUnitPath = path.join(options.unitDir, GATEWAY_UNIT);
  const torUnitPath = path.join(options.unitDir, TOR_UNIT);
  writeManagedFileV1(gatewayUnitPath, rendered.gatewayUnit, 0o600, "gateway unit");
  writeManagedFileV1(torUnitPath, rendered.torUnit, 0o600, "Tor unit");
  run(options.torPath, ["--verify-config", "-f", rendered.paths.torrcPath]);
  if (run("bash", ["-lc", "command -v systemd-analyze >/dev/null 2>&1"], { allowFailure: true }).status === 0) {
    run("systemd-analyze", ["verify", gatewayUnitPath, torUnitPath]);
  }
  run("systemctl", ["--user", "daemon-reload"]);
  disableAutoStartV1({ stop: true });
  return options.unitDir;
}

async function fetchReady(url) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { accept: "application/json" } });
  if (response.status !== 200) fail(`readiness returned HTTP ${response.status}`);
  return response.json();
}

export function validateLocalReadyV1(local) {
  if (!local || typeof local !== "object" || Array.isArray(local)) {
    fail("local node readiness must be an object");
  }
  if (local.ready !== true || local.gap !== 0 || local.txroot_live !== 1) {
    fail("local node is not exact-green");
  }
  if (!Number.isSafeInteger(local.head) || local.head <= 0) {
    fail("local node head must be a positive integer");
  }
  return local.head;
}

async function waitForGateway(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/__void/ready.json`, { redirect: "manual", signal: AbortSignal.timeout(3000) });
      if (response.status === 200 && response.headers.get("x-void-public-seed-gateway") === "v1") return;
    } catch (error) {
      void error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  fail("restricted Tor gateway did not become ready");
}

async function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

async function activate(options, rendered) {
  if (process.env.VOID_PUBLIC_SEED_TOR_CONFIRM !== CONFIRM) {
    fail(`activation requires VOID_PUBLIC_SEED_TOR_CONFIRM=${CONFIRM}`);
  }
  let activated = false;
  try {
    const local = await fetchReady("http://127.0.0.1:4100/__void/ready.json");
    const localHead = validateLocalReadyV1(local);
    for (const port of [options.gatewayPort, options.socksPort]) {
      if (!(await portAvailable(port))) fail(`required loopback port is occupied: ${port}`);
    }
    run("systemctl", ["--user", "enable", GATEWAY_UNIT, TOR_UNIT]);
    for (const unit of [GATEWAY_UNIT, TOR_UNIT]) {
      if (!unitIsEnabledV1(unit)) fail(`${unit} did not become enabled`);
    }
    run("systemctl", ["--user", "restart", GATEWAY_UNIT]);
    await waitForGateway(options.gatewayPort);
    run("systemctl", ["--user", "restart", TOR_UNIT]);
    for (let attempt = 0; attempt < 180 && !fs.existsSync(rendered.paths.hostnameFile); attempt += 1) {
      if (run("systemctl", ["--user", "is-active", "--quiet", TOR_UNIT], { allowFailure: true }).status !== 0) {
        fail("Tor service exited before creating its identity");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!fs.existsSync(rendered.paths.hostnameFile)) fail("Tor did not create a v3 onion hostname");
    const onion = validateOnionHostname(fs.readFileSync(rendered.paths.hostnameFile, "utf8").trim());
    const output = path.join(
      rendered.paths.qualificationDir,
      `qualification-${options.expectedHead}-${new Date().toISOString().replace(/[-:.]/g, "")}.json`,
    );
    run(options.nodePath, [
      rendered.paths.qualifierSource,
      "--onion-hostname", onion,
      "--source-sha", options.expectedHead,
      "--socks-host", "127.0.0.1",
      "--socks-port", String(options.socksPort),
      "--virtual-port", String(options.virtualPort),
      "--samples", "3",
      "--interval-ms", "30000",
      "--output", output,
    ]);
    activated = true;
    console.log(`${MARKER}_ACTIVATED`);
    console.log(`local_head=${localHead}`);
    console.log(`onion_hostname=${onion}`);
    console.log(`qualification_file=${output}`);
    console.log("services_enabled=true");
    console.log("socks_remote_dns=true");
    console.log("dns_required=false");
    console.log("registrar_required=false");
    console.log("cloud_account_required=false");
    console.log("manifest_published=false");
  } finally {
    if (!activated) {
      disableAutoStartV1({ stop: true });
      console.error("fail_closed_services_stopped=true");
      console.error("onion_identity_preserved=true");
    }
  }
}

async function main() {
  const options = normalizedOptions(parseArgs(process.argv.slice(2)));
  const rendered = renderTorSeedV1(options);
  if (options.command === "plan") {
    console.log(`${MARKER}_PLAN`);
    console.log(`expected_head=${options.expectedHead}`);
    console.log(`tor_sha256=${sha256File(options.torPath)}`);
    console.log(`config_root=${options.configRoot}`);
    console.log(`data_root=${options.dataRoot}`);
    console.log(`state_root=${options.stateRoot}`);
    console.log("dns_required=false");
    console.log("services_changed=false");
    return;
  }
  if (!new Set(["install", "activate"]).has(options.command)) fail(`unsupported command ${options.command}`);
  if (
    options.command === "activate" &&
    process.env.VOID_PUBLIC_SEED_TOR_CONFIRM !== CONFIRM
  ) {
    fail(`activation requires VOID_PUBLIC_SEED_TOR_CONFIRM=${CONFIRM}`);
  }
  const unitDir = writeRender(options, rendered);
  console.log(`${MARKER}_INSTALLED`);
  console.log(`gateway_unit=${path.join(unitDir, GATEWAY_UNIT)}`);
  console.log(`tor_unit=${path.join(unitDir, TOR_UNIT)}`);
  console.log(`identity_dir=${rendered.paths.hiddenService}`);
  console.log("identity_preserved=true");
  console.log("services_started=false");
  if (options.command === "install") console.log("services_enabled=false");
  if (options.command === "activate") await activate(options, rendered);
  console.log("wallet_signer_validator_wc_money_authority=0");
}

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invoked) {
  main().catch((error) => {
    console.error(`${MARKER}_FAIL: ${error?.stack || error}`);
    process.exit(1);
  });
}
