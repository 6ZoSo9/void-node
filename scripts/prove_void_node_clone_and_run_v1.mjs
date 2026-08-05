#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import process from "node:process";

const MARKER = "VOID_NODE_CLONE_AND_RUN_V1_PROOF";
const EXPECTED_ENGINE = "^22.0.0 || ^24.0.0 || ^26.0.0";
const PINNED_NODE = "v24.18.0";
const PINNED_SHA = "783130984963db7ba9cbd01089eaf2c2efb055c7c1693c943174b967b3050cb8";
const EXPECTED_BUILD =
  "tsc -p tsconfig.build.json && node scripts/copy_void_runtime_js_v1.mjs";

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
  'SUPPORTED_NODE_MAJORS="22 24 26"',
  `NODE_VERSION="${PINNED_NODE}"`,
  "https://nodejs.org/dist/${NODE_VERSION}/${NODE_ARCHIVE}",
  `NODE_SHA256="${PINNED_SHA}"`,
  "sha256sum --check --strict",
  "ci --ignore-scripts --no-audit --no-fund",
  "crypto.randomBytes(32)",
  "mode: 0o600",
  "dotenv.parse(source)",
  "test -z \"${NODE_PRIVKEY_PATH:-}\"",
  "test -z \"${KEY_FILE:-}\"",
  "test -z \"${VOID_NODE_KEY_A:-}\"",
  "export NODE_PRIVKEY_PATH=\"$NODE_KEY_FILE\"",
  "22|24|26",
  'RUNTIME_SOURCE="host_node${major}"',
  'RUNTIME_SOURCE="repo_local_node24"',
  "wallet_key_generated=false",
  "validator_key_generated=false",
  "treasury_key_generated=false",
  "authority_activated=false",
  "host_node_required=false",
]);

if (/(?:^|\n)[ \t]*sudo[ \t]+/.test(launcher)) fail("launcher executes sudo");
if (/\|[ \t]*sudo[ \t]+/.test(launcher)) fail("launcher pipes into sudo");
if (/curl[^\n]*\|[^\n]*(?:bash|sh)/.test(launcher)) fail("launcher contains curl-pipe-shell execution");
if (/NODE_SHA256="(?:0+|[0-9a-f]{1,63})"/.test(launcher)) fail("launcher does not contain a complete pinned SHA-256");
if (launcher.includes("v22.23.2")) fail("launcher retains the invalid Node.js v22.23.2 fallback pin");
if (!launcher.includes('exec "$NODE_BIN" "$ROOT/dist/index.js"')) fail("run path does not invoke the selected verified runtime");
if (!launcher.includes('flag: "wx"')) fail("node identity creation is not exclusive-create");
if (launcher.includes('export NODE_PRIVKEY_PATH="${NODE_PRIVKEY_PATH:-$NODE_KEY_FILE}"')) {
  fail("launcher overrides explicit KEY_FILE or VOID_NODE_KEY_A aliases");
}
pass("launcher-security-runtime-and-env-contract");

run("bash", ["-n", "run-void-node.sh"]);
const help = run("bash", ["run-void-node.sh", "help"]);
for (const expected of ["./run-void-node.sh", "Node.js 22, 24, and 26", "Node.js 24 LTS"]) {
  if (!help.includes(expected)) fail(`launcher help missing ${expected}`);
}
pass("launcher-bash-and-help");

const participant = requireText("void-participant.sh", [
  "node-v24.18.0-linux-x64/bin/node",
  "22|24|26",
  "verified Node.js 22, 24, or 26 runtime unavailable",
]);
if (participant.includes("node-v22.23.2")) fail("participant wrapper retains invalid Node.js fallback path");
run("bash", ["-n", "void-participant.sh"]);
pass("participant-runtime-selection");

const runtimeCopy = requireText("scripts/copy_void_runtime_js_v1.mjs", [
  "VOID_NODE_RUNTIME_JS_COPY_V1",
  'path.join(ROOT, "src", "wal", "wal_v1.js")',
  'path.join(ROOT, "dist", "wal")',
  "source runtime module must be one regular non-symlink file",
  "destination runtime directory must be one real directory",
  "fs.renameSync(TEMPORARY, DESTINATION)",
  "sourceBytes.equals(destinationBytes)",
  "VOID_NODE_RUNTIME_JS_COPY_V1_GREEN",
]);
if (/from ["'](?:https?:|node:http|node:https|node:net|node:tls)/.test(runtimeCopy)) {
  fail("runtime copy step imports network capability");
}
pass("wal-runtime-copy-source-boundary");

requireText("docs/public/clone-and-run-v1.md", [
  "git clone https://github.com/6ZoSo9/void-node.git",
  "./run-void-node.sh",
  "Node.js 22, 24, or 26",
  "Node.js 24 LTS",
  "Host Node.js, npm, and a global package installation are not required",
  "node identity",
]);
requireText("docs/public/run-a-node.md", [
  "./run-void-node.sh",
  "clone-and-run-v1.md",
]);
requireText("README.md", [
  "./run-void-node.sh",
  "docs/public/clone-and-run-v1.md",
]);

const rootPackage = JSON.parse(read("package.json"));
const sourcePackage = JSON.parse(read("src/package.json"));
if (rootPackage?.engines?.node !== EXPECTED_ENGINE) {
  fail(`unexpected root engine: ${rootPackage?.engines?.node}`);
}
if (sourcePackage?.engines?.node !== EXPECTED_ENGINE) {
  fail(`unexpected source engine: ${sourcePackage?.engines?.node}`);
}
if (rootPackage?.scripts?.build !== EXPECTED_BUILD) {
  fail(`unexpected root build contract: ${rootPackage?.scripts?.build}`);
}
if (read(".nvmrc").trim() !== "24") fail(".nvmrc is not Node.js 24 LTS");
const dockerfile = read("Dockerfile");
if ((dockerfile.match(/^FROM node:24-alpine(?:\s|$)/gm) ?? []).length !== 2) {
  fail("Docker build and runtime stages are not both Node.js 24");
}
pass("repository-engine-build-and-defaults");

const workflow = requireText(".github/workflows/void-node-clone-and-run-v1.yml", [
  "host-node: [20, 22, 24, 26]",
  "./run-void-node.sh prepare",
  "./run-void-node.sh doctor",
  "runtime_source=host_node${{ matrix.host-node }}",
  "runtime_source=repo_local_node24",
  `node_version=${PINNED_NODE}`,
  "test -f dist/wal/wal_v1.js",
  "cmp -s src/wal/wal_v1.js dist/wal/wal_v1.js",
  "curl -fsS http://127.0.0.1:4100/__void/ready.json",
  "VOID_NODE_CLONE_AND_RUN_V1_SUSTAINED_RUNTIME_GREEN",
]);
if (!workflow.includes("timeout-minutes:")) fail("workflow lacks a timeout");
if (!workflow.includes('kill -0 "$PID"')) fail("workflow lacks a post-readiness process liveness check");
if (!workflow.includes("sleep 5")) fail("workflow lacks the bounded post-readiness grace period");
pass("workflow-host-fallback-wal-and-sustained-runtime-matrix");

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      supported_host_majors: [22, 24, 26],
      unsupported_host_fallback_fixture: 20,
      default_major: 24,
      pinned_fallback: PINNED_NODE,
      pinned_fallback_sha256: PINNED_SHA,
      root_engine: EXPECTED_ENGINE,
      wal_runtime_artifact_copy: true,
      wal_runtime_byte_equality: true,
      sustained_runtime_probe: true,
      invalid_v22_23_2_removed: true,
      status: "GREEN",
    },
    null,
    2,
  ),
);
console.log(`${MARKER}_STATIC_GREEN`);
