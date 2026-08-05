#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import process from "node:process";

const MARKER = "VOID_NODE_CLONE_AND_RUN_V1_PROOF";

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function read(path) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
  return fs.readFileSync(path, "utf8");
}

function requireText(path, needles) {
  const text = read(path);
  for (const needle of needles) {
    if (!text.includes(needle)) fail(`${path} missing ${JSON.stringify(needle)}`);
  }
  pass(`markers-${path}`);
  return text;
}

function run(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    fail(`${command} ${args.join(" ")} failed with rc=${result.status}`);
  }
  return String(result.stdout || "");
}

const launcher = requireText("run-void-node.sh", [
  "VOID_NODE_CLONE_AND_RUN_V1",
  "v22.23.2",
  "https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}",
  "b294b161bdaf0ce6063902bf141517f2a2022e8dd21b1e09557fb471f3bc882c",
  "sha256sum --check --strict",
  "ci --ignore-scripts --no-audit --no-fund",
  "crypto.randomBytes(32)",
  "mode: 0o600",
  "wallet_key_generated=false",
  "validator_key_generated=false",
  "treasury_key_generated=false",
  "authority_activated=false",
  "host_node_required=false",
]);

if (/\bsudo\b/.test(launcher)) fail("launcher contains sudo");
if (/curl[^\n]*\|[^\n]*(?:bash|sh)/.test(launcher)) fail("launcher contains curl-pipe-shell execution");
if (/NODE_SHA256="(?:0+|[0-9a-f]{1,63})"/.test(launcher)) fail("launcher does not contain a complete pinned SHA-256");
if (!launcher.includes('test "$major" = 22')) fail("host runtime is not restricted to the repository-supported Node major");
if (!launcher.includes('exec "$NODE_BIN" "$ROOT/dist/index.js"')) fail("run path does not invoke the selected verified runtime");
if (!launcher.includes('flag: "wx"')) fail("node identity creation is not exclusive-create");
pass("launcher-security-and-runtime-contract");

run("bash", ["-n", "run-void-node.sh"]);
const help = run("bash", ["run-void-node.sh", "help"]);
if (!help.includes("./run-void-node.sh")) fail("launcher help does not expose root command");
pass("launcher-bash-and-help");

requireText("docs/public/clone-and-run-v1.md", [
  "git clone https://github.com/6ZoSo9/void-node.git",
  "./run-void-node.sh",
  "Host Node.js, npm, and a global package installation are not required",
  "node-identity key",
]);
requireText("docs/public/run-a-node.md", [
  "./run-void-node.sh",
  "clone-and-run-v1.md",
]);
requireText("README.md", [
  "./run-void-node.sh",
  "docs/public/clone-and-run-v1.md",
]);

const packageJson = JSON.parse(read("package.json"));
if (packageJson?.engines?.node !== ">=22 <23") {
  fail(`repository engine boundary changed without a compatibility lane: ${packageJson?.engines?.node}`);
}
pass("repository-engine-remains-node22");

const workflow = requireText(".github/workflows/void-node-clone-and-run-v1.yml", [
  "host-node: [22, 26]",
  "./run-void-node.sh prepare",
  "./run-void-node.sh doctor",
  "runtime_source=repo_local_node22",
  "curl -fsS http://127.0.0.1:4100/__void/ready.json",
]);
if (!workflow.includes("timeout-minutes:")) fail("workflow lacks a timeout");
pass("workflow-host-and-fallback-matrix");

console.log(`${MARKER}_STATIC_GREEN`);
