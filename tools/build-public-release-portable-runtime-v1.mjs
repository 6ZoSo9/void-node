#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_RELEASE_PORTABLE_RUNTIME_BUILDER_V1";
const RUNTIME_PATH = "runtime/bin/node";
const RUNTIME_LICENSE_PATH = "runtime/LICENSE.nodejs";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

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

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function stableJson(value) {
  const seen = new WeakSet();
  function order(input) {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input)) throw new Error("cycle in stable JSON");
    seen.add(input);
    if (Array.isArray(input)) return input.map(order);
    const output = {};
    for (const key of Object.keys(input).sort()) output[key] = order(input[key]);
    return output;
  }
  return JSON.stringify(order(value), null, 2) + "\n";
}

function compareNames(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function walk(root) {
  const output = [];
  function visit(directory) {
    const entries = fs.readdirSync(directory, {withFileTypes: true}).sort((a, b) => compareNames(a.name, b.name));
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() || entry.isSymbolicLink()) output.push(full);
      else fail(`unsupported release filesystem entry: ${full}`);
    }
  }
  visit(root);
  return output;
}

function copyExecutable(source, destination) {
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`required file missing: ${source}`);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(source, destination);
  fs.chmodSync(destination, 0o755);
}

function locateRuntimeLicense(runtimeBin, explicitPath) {
  const candidates = [
    explicitPath,
    process.env.VOID_NODE_RUNTIME_LICENSE,
    path.resolve(path.dirname(runtimeBin), "..", "LICENSE"),
    path.resolve(path.dirname(runtimeBin), "..", "..", "LICENSE"),
    "/usr/share/doc/nodejs/copyright",
  ].filter(Boolean);
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }
  fail(`Node.js runtime license not found; checked: ${candidates.join(", ")}`);
}

const args = process.argv.slice(2);
let outDir = "dist-release";
let requestedVersion = "";
let sourceDateEpoch = 0;
let runtimeBin = process.env.VOID_NODE_RUNTIME_BIN || process.execPath;
let runtimeLicense = "";
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--out") outDir = args[++index] || fail("--out needs a directory");
  else if (arg === "--version") requestedVersion = args[++index] || fail("--version needs a value");
  else if (arg === "--source-date-epoch") sourceDateEpoch = Number(args[++index]);
  else if (arg === "--runtime-bin") runtimeBin = args[++index] || fail("--runtime-bin needs a file");
  else if (arg === "--runtime-license") runtimeLicense = args[++index] || fail("--runtime-license needs a file");
  else if (arg === "--help") {
    console.log("build-public-release-portable-runtime-v1.mjs [--out DIR] [--version VERSION] [--source-date-epoch EPOCH] [--runtime-bin FILE] [--runtime-license FILE]");
    process.exit(0);
  } else fail(`unknown argument: ${arg}`);
}

runtimeBin = path.resolve(runtimeBin);
if (!fs.existsSync(runtimeBin) || !fs.statSync(runtimeBin).isFile()) fail(`runtime binary not found: ${runtimeBin}`);
const runtimeVersion = run(runtimeBin, ["--version"], {capture: true}).trim();
const runtimeMajor = Number(runtimeVersion.replace(/^v/, "").split(".")[0]);
if (runtimeMajor !== 22) fail(`portable release runtime must be Node.js 22; found ${runtimeVersion}`);
runtimeLicense = locateRuntimeLicense(runtimeBin, runtimeLicense);

const root = run("git", ["rev-parse", "--show-toplevel"], {capture: true}).trim();
const out = path.resolve(root, outDir);
const baseArgs = [path.join(root, "tools", "build-public-release-v1.mjs"), "--out", out];
if (requestedVersion) baseArgs.push("--version", requestedVersion);
if (sourceDateEpoch > 0) baseArgs.push("--source-date-epoch", String(sourceDateEpoch));
run(process.execPath, baseArgs, {cwd: root});

const manifestPath = path.join(out, "void-node-release-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.marker !== "VOID_PUBLIC_RELEASE_MANIFEST_V1") fail("unexpected base release manifest marker");
if (manifest.platform !== "linux-x64") fail(`portable runtime currently supports linux-x64 only; found ${manifest.platform}`);
if (!Number.isSafeInteger(manifest.source_date_epoch) || manifest.source_date_epoch <= 0) fail("invalid source_date_epoch in base manifest");

const archive = path.join(out, manifest.archive);
if (!fs.existsSync(archive)) fail(`base release archive missing: ${archive}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-portable-runtime-v1-"));
try {
  const extractRoot = path.join(tmp, "extract");
  fs.mkdirSync(extractRoot, {recursive: true});
  run("tar", ["-xzf", archive, "-C", extractRoot, "--no-same-owner", "--no-same-permissions"]);
  const topEntries = fs.readdirSync(extractRoot, {withFileTypes: true}).filter((entry) => entry.isDirectory());
  if (topEntries.length !== 1) fail(`base archive must contain exactly one top directory; found ${topEntries.length}`);
  const stage = path.join(extractRoot, topEntries[0].name);

  const portableInstaller = path.join(root, "ops", "public", "install-void-node-portable-runtime-v1.sh");
  const portableManager = path.join(root, "release", "portable", "bin", "void-node");
  const portableRunner = path.join(root, "release", "portable", "bin", "void-node-run");
  copyExecutable(portableInstaller, path.join(stage, "install-void-node-v1.sh"));
  copyExecutable(portableManager, path.join(stage, "bin", "void-node"));
  copyExecutable(portableRunner, path.join(stage, "bin", "void-node-run"));
  copyExecutable(runtimeBin, path.join(stage, RUNTIME_PATH));
  fs.copyFileSync(runtimeLicense, path.join(stage, RUNTIME_LICENSE_PATH));
  fs.chmodSync(path.join(stage, RUNTIME_LICENSE_PATH), 0o644);

  const stagedRuntime = path.join(stage, RUNTIME_PATH);
  const stagedVersion = run(stagedRuntime, ["--version"], {capture: true}).trim();
  if (stagedVersion !== runtimeVersion) fail(`staged runtime version mismatch: ${stagedVersion} != ${runtimeVersion}`);
  const runtimeSha = sha256(stagedRuntime);

  const buildInfoPath = path.join(stage, "BUILD-INFO.json");
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
  Object.assign(buildInfo, {
    portable_runtime_marker: "VOID_PUBLIC_RELEASE_PORTABLE_RUNTIME_V1",
    runtime_delivery: "bundled",
    host_node_required: false,
    bundled_node_runtime: true,
    bundled_node_version: runtimeVersion,
    bundled_node_major: runtimeMajor,
    bundled_node_path: RUNTIME_PATH,
    bundled_node_sha256: runtimeSha,
    bundled_node_license_path: RUNTIME_LICENSE_PATH,
  });
  fs.writeFileSync(buildInfoPath, stableJson(buildInfo));

  const sbomPath = path.join(stage, "SBOM.spdx.json");
  const sbom = JSON.parse(fs.readFileSync(sbomPath, "utf8"));
  const packages = Array.isArray(sbom.packages) ? sbom.packages.filter((entry) => entry?.SPDXID !== "SPDXRef-Package-NodejsRuntime") : [];
  packages.push({
    SPDXID: "SPDXRef-Package-NodejsRuntime",
    name: "node",
    versionInfo: runtimeVersion.replace(/^v/, ""),
    downloadLocation: "NOASSERTION",
    filesAnalyzed: false,
    licenseConcluded: "MIT",
    licenseDeclared: "MIT",
    copyrightText: "NOASSERTION",
    comment: `Bundled Linux x64 runtime at ${RUNTIME_PATH}; sha256=${runtimeSha}; license=${RUNTIME_LICENSE_PATH}`,
  });
  sbom.packages = packages.sort((a, b) => compareNames(String(a.SPDXID), String(b.SPDXID)));
  fs.writeFileSync(sbomPath, stableJson(sbom));

  Object.assign(manifest, {
    runtime_delivery: "bundled",
    host_node_required: false,
    bundled_node_runtime: true,
    bundled_node_version: runtimeVersion,
    bundled_node_major: runtimeMajor,
    bundled_node_path: RUNTIME_PATH,
    bundled_node_sha256: runtimeSha,
    bundled_node_license_path: RUNTIME_LICENSE_PATH,
  });

  const notesPath = path.join(out, manifest.release_notes);
  const baseNotes = fs.readFileSync(notesPath, "utf8").trimEnd();
  fs.writeFileSync(notesPath, `${baseNotes}\nHost Node.js, npm, and Git are not required for release installation or runtime.\nBundled runtime: ${runtimeVersion} (${runtimeSha}).\n`);

  const internalManifest = path.join(stage, "RELEASE-CONTENTS-SHA256");
  fs.rmSync(internalManifest, {force: true});
  const internal = [];
  for (const full of walk(stage)) {
    const rel = path.relative(stage, full).split(path.sep).join("/");
    if (rel === "RELEASE-CONTENTS-SHA256") continue;
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) {
      const resolved = fs.realpathSync(full);
      if (!fs.statSync(resolved).isFile()) fail(`release symlink must resolve to a regular file: ${rel}`);
    }
    internal.push(`${sha256(full)}  ${rel}`);
  }
  fs.writeFileSync(internalManifest, internal.sort(compareNames).join("\n") + "\n");

  fs.rmSync(archive, {force: true});
  const tarArgs = [
    "--sort=name",
    `--mtime=@${manifest.source_date_epoch}`,
    "--owner=0",
    "--group=0",
    "--numeric-owner",
    "--format=posix",
    "--pax-option=delete=atime,delete=ctime",
    "-C",
    extractRoot,
    "-cf",
    "-",
    topEntries[0].name,
  ];
  const shell = `set -o pipefail; tar ${tarArgs.map((value) => JSON.stringify(value)).join(" ")} | gzip -n > ${JSON.stringify(archive)}`;
  run("bash", ["-lc", shell]);

  manifest.archive_sha256 = sha256(archive);
  manifest.archive_bytes = fs.statSync(archive).size;
  fs.writeFileSync(manifestPath, stableJson(manifest));

  const installerAsset = path.join(out, "install-void-node-v1.sh");
  fs.copyFileSync(portableInstaller, installerAsset);
  fs.chmodSync(installerAsset, 0o755);
  const sbomAsset = path.join(out, manifest.sbom);
  fs.copyFileSync(sbomPath, sbomAsset);

  const assets = [archive, installerAsset, manifestPath, sbomAsset, notesPath];
  const sums = assets
    .map((file) => `${sha256(file)}  ${path.basename(file)}`)
    .sort(compareNames)
    .join("\n") + "\n";
  fs.writeFileSync(path.join(out, "SHA256SUMS"), sums);

  console.log(`${MARKER} GREEN`);
  console.log(`archive=${archive}`);
  console.log(`archive_sha256=${manifest.archive_sha256}`);
  console.log(`bundled_node_version=${runtimeVersion}`);
  console.log(`bundled_node_sha256=${runtimeSha}`);
  console.log("host_node_required=false");
  console.log("service_started_by_default=false");
  console.log("guarded_lanes_activated=false");
} finally {
  fs.rmSync(tmp, {recursive: true, force: true});
}
