#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_RELEASE_PORTABLE_RUNTIME_V1_PROOF";
function fail(message) { console.error(`[FAIL] ${message}`); process.exit(1); }
function pass(message) { console.log(`[PASS] ${message}`); }
function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd,
    env: {...process.env, ...(options.env || {})},
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout || "");
      process.stderr.write(result.stderr || "");
    }
    fail(`${command} ${args.join(" ")} failed with rc=${result.status}`);
  }
  return options.capture ? String(result.stdout || "") : "";
}
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function needFile(file) { if (!fs.existsSync(file)) fail(`missing ${file}`); pass(`file-present-${file}`); }
function needText(file, needles) {
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) if (!text.includes(needle)) fail(`${file} missing ${JSON.stringify(needle)}`);
  pass(`markers-${file}`);
  return text;
}

const full = process.argv.includes("--full");
const required = [
  "tools/build-public-release-portable-runtime-v1.mjs",
  "ops/public/install-void-node-portable-runtime-v1.sh",
  "release/portable/bin/void-node",
  "release/portable/bin/void-node-run",
  "scripts/prove_public_release_portable_runtime_v1.mjs",
  ".github/workflows/public-release-portable-runtime-v1.yml",
  "docs/public/portable-runtime-install-v1.md",
];
for (const file of required) needFile(file);

const builder = needText("tools/build-public-release-portable-runtime-v1.mjs", [
  "VOID_PUBLIC_RELEASE_PORTABLE_RUNTIME_BUILDER_V1",
  'runtime_delivery: "bundled"',
  "host_node_required: false",
  'bundled_node_path: RUNTIME_PATH',
  "SPDXRef-Package-NodejsRuntime",
  "RELEASE-CONTENTS-SHA256",
]);
if (!builder.includes('copyExecutable(runtimeBin, path.join(stage, RUNTIME_PATH))')) fail("builder does not copy the verified runtime into the archive");
pass("builder-bundles-runtime-and-license");

const installer = needText("ops/public/install-void-node-portable-runtime-v1.sh", [
  "VOID_PUBLIC_RELEASE_PORTABLE_INSTALLER_V1",
  'assert j.get("host_node_required") is False',
  'assert runtime_path=="runtime/bin/node"',
  "manifest_build_runtime_binding_verified=true",
  "host_node_required=false",
  "service_started_implicitly=false",
  "guarded_lanes_activated=false",
]);
if (/for tool in[^\n]*\bnode\b/.test(installer)) fail("portable installer still requires a host node command");
if (/command -v node/.test(installer)) fail("portable installer probes host Node.js");
if (/curl[^\n]*\|[^\n]*(?:bash|sh)/.test(installer)) fail("portable installer contains curl-pipe-shell execution");
if (!/if test "\$START" = 1; then systemctl --user start/.test(installer)) fail("service start is not explicitly START-gated");
pass("installer-has-no-host-node-or-implicit-start");

const manager = needText("release/portable/bin/void-node", [
  "VOID_NODE_PORTABLE_RELEASE_DOCTOR_V1",
  'RUNTIME_NODE="$RELEASE_ROOT/runtime/bin/node"',
  'exec "$RUNTIME_NODE" "$RELEASE_ROOT/bin/void-node-update"',
  "host_node_required=false",
]);
if (/\bnode\s+-e\b/.test(manager)) fail("portable manager directly invokes host node");
needText("release/portable/bin/void-node-run", [
  'NODE_BIN="$RELEASE_ROOT/runtime/bin/node"',
  "VOID_NODE_ALLOW_RUNTIME_OVERRIDE",
  'exec "$NODE_BIN" "$ENTRY"',
]);
pass("portable-manager-and-runner-use-bundled-runtime");

needText(".github/workflows/public-release-portable-runtime-v1.yml", [
  "actions/checkout@v6",
  "actions/setup-node@v6",
  "node-version: '22'",
  "prove_public_release_portable_runtime_v1.mjs --full",
]);
needText(".github/workflows/public-release-distribution-v1.yml", [
  "build-public-release-portable-runtime-v1.mjs",
  "public-release-portable-runtime-v1.yml",
]);
needText("docs/public/portable-runtime-install-v1.md", [
  "Host Node.js, npm, and Git are not required",
  "Ubuntu 24.04",
  "Ubuntu 26.04",
  "service remains disabled and stopped",
]);

run("bash", ["-n", "ops/public/install-void-node-portable-runtime-v1.sh"]);
run("bash", ["-n", "release/portable/bin/void-node"]);
run("bash", ["-n", "release/portable/bin/void-node-run"]);
run(process.execPath, ["--check", "tools/build-public-release-portable-runtime-v1.mjs"]);
pass("syntax-checks");

if (!full) {
  console.log(`${MARKER}_STATIC_GREEN`);
  process.exit(0);
}

const root = run("git", ["rev-parse", "--show-toplevel"], {capture: true}).trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-portable-runtime-proof-"));
try {
  const out1 = path.join(tmp, "out1");
  const out2 = path.join(tmp, "out2");
  const version = "0.0.0-portable-walltest";
  const epoch = "1700000000";
  const buildArgs = ["tools/build-public-release-portable-runtime-v1.mjs", "--version", version, "--source-date-epoch", epoch];
  run(process.execPath, [...buildArgs, "--out", out1], {cwd: root});
  run(process.execPath, [...buildArgs, "--out", out2], {cwd: root});

  const manifest1 = JSON.parse(fs.readFileSync(path.join(out1, "void-node-release-manifest.json"), "utf8"));
  const manifest2 = JSON.parse(fs.readFileSync(path.join(out2, "void-node-release-manifest.json"), "utf8"));
  for (const manifest of [manifest1, manifest2]) {
    if (manifest.runtime_delivery !== "bundled") fail("manifest runtime_delivery is not bundled");
    if (manifest.host_node_required !== false) fail("manifest still requires host Node.js");
    if (manifest.bundled_node_runtime !== true || manifest.bundled_node_major !== 22) fail("manifest does not bind Node.js 22 runtime");
    if (manifest.bundled_node_path !== "runtime/bin/node") fail("manifest runtime path is not canonical");
    if (!/^[0-9a-f]{64}$/.test(manifest.bundled_node_sha256 || "")) fail("manifest runtime SHA is invalid");
  }
  const archive1 = path.join(out1, manifest1.archive);
  const archive2 = path.join(out2, manifest2.archive);
  if (sha256(archive1) !== sha256(archive2)) fail(`portable archive is not deterministic: ${sha256(archive1)} != ${sha256(archive2)}`);
  pass(`deterministic-portable-archive-${sha256(archive1)}`);
  run("sha256sum", ["--check", "--strict", "SHA256SUMS"], {cwd: out1});

  const listing = run("tar", ["-tzf", archive1], {capture: true}).split("\n").filter(Boolean);
  if (!listing.some((entry) => entry.endsWith("/runtime/bin/node"))) fail("portable archive lacks runtime/bin/node");
  if (!listing.some((entry) => entry.endsWith("/runtime/LICENSE.nodejs"))) fail("portable archive lacks Node.js license");
  pass("portable-archive-runtime-content");

  const fakeHome = path.join(tmp, "home");
  const fakeBin = path.join(tmp, "fake-bin");
  const installRoot = path.join(fakeHome, "share", "void-node");
  const binDir = path.join(fakeHome, "bin");
  fs.mkdirSync(fakeHome, {recursive: true});
  fs.mkdirSync(fakeBin, {recursive: true});
  const poisonedHostNode = path.join(fakeBin, "node");
  fs.writeFileSync(poisonedHostNode, "#!/usr/bin/env bash\necho HOST_NODE_MUST_NOT_RUN >&2\nexit 97\n", {mode: 0o755});
  const env = {
    HOME: fakeHome,
    PATH: `${fakeBin}:${process.env.PATH}`,
    VOID_NODE_ALLOW_ROOT_INSTALL: "1",
    VOID_NODE_CONFIG_DIR: path.join(fakeHome, "config"),
    VOID_NODE_STATE_DIR: path.join(fakeHome, "state"),
    VOID_NODE_SYSTEMD_DIR: path.join(fakeHome, "systemd"),
  };
  const installerAsset = path.join(out1, "install-void-node-v1.sh");
  const installOutput = run("bash", [
    installerAsset,
    "install",
    "--archive", archive1,
    "--checksums", path.join(out1, "SHA256SUMS"),
    "--manifest", path.join(out1, "void-node-release-manifest.json"),
    "--install-root", installRoot,
    "--bin-dir", binDir,
    "--yes",
  ], {env, capture: true});
  if (!installOutput.includes("host_node_required=false")) fail("installer did not report host-node independence");
  if (!installOutput.includes("service_started_implicitly=false")) fail("installer did not preserve stopped-by-default boundary");
  pass("install-with-poisoned-host-node");

  const command = path.join(binDir, "void-node");
  run(command, ["version"], {env});
  run(command, ["verify"], {env});
  const doctor = run(command, ["doctor"], {env, capture: true});
  if (!doctor.includes("bundled_node22=true") || !doctor.includes("host_node_required=false")) fail("portable doctor did not prove bundled runtime health");
  run(command, ["update", "help"], {env});
  pass("manager-doctor-and-updater-ignore-host-node");

  run("bash", [installerAsset, "uninstall", "--install-root", installRoot, "--bin-dir", binDir, "--yes", "--purge"], {env});
  if (fs.existsSync(installRoot) || fs.existsSync(command)) fail("portable uninstall left installation artifacts");
  pass("portable-uninstall-purge");
  console.log(`${MARKER}_FULL_GREEN`);
} finally {
  fs.rmSync(tmp, {recursive: true, force: true});
}
