#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_RELEASE_BUILDER_V1";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd,
    env: {...process.env, ...(options.env || {})},
    encoding: options.encoding ?? "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 1024 * 1024 * 128,
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
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}
function walk(root) {
  const out = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() || entry.isSymbolicLink()) out.push(full);
      else fail(`unsupported release filesystem entry: ${full}`);
    }
  }
  visit(root);
  return out;
}
function copyEntry(source, target) {
  fs.mkdirSync(path.dirname(target), {recursive: true});
  const st = fs.lstatSync(source);
  if (st.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(source), target);
  else if (st.isDirectory()) fs.cpSync(source, target, {recursive: true, dereference: false, preserveTimestamps: false});
  else if (st.isFile()) fs.copyFileSync(source, target);
}
function stableJson(value) {
  const seen = new WeakSet();
  function order(v) {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) throw new Error("cycle in stable JSON");
    seen.add(v);
    if (Array.isArray(v)) return v.map(order);
    const out = {};
    for (const key of Object.keys(v).sort()) out[key] = order(v[key]);
    return out;
  }
  return JSON.stringify(order(value), null, 2) + "\n";
}

const args = process.argv.slice(2);
let outDir = "dist-release";
let requestedVersion = "";
let sourceDateEpoch = Number(process.env.SOURCE_DATE_EPOCH || "0");
for (let i=0; i<args.length; i++) {
  if (args[i] === "--out") outDir = args[++i] || fail("--out needs a directory");
  else if (args[i] === "--version") requestedVersion = args[++i] || fail("--version needs a value");
  else if (args[i] === "--source-date-epoch") sourceDateEpoch = Number(args[++i]);
  else if (args[i] === "--help") {
    console.log("build-public-release-v1.mjs [--out DIR] [--version VERSION] [--source-date-epoch EPOCH]");
    process.exit(0);
  } else fail(`unknown argument: ${args[i]}`);
}

const root = run("git", ["rev-parse", "--show-toplevel"], {capture: true}).trim();
process.chdir(root);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson.name !== "void-node") fail(`unexpected package name: ${packageJson.name}`);
if (packageJson.private !== true) fail("package.json must remain private to prevent accidental npm publication");
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor !== 22) fail(`Node.js 22 required; found ${process.version}`);
const commit = run("git", ["rev-parse", "HEAD"], {capture: true}).trim();
const short = commit.slice(0, 12);
const version = requestedVersion || `${packageJson.version}-dev.${short}`;
if (!/^[0-9A-Za-z][0-9A-Za-z._+-]{0,127}$/.test(version)) fail(`unsafe release version: ${version}`);
if (!Number.isFinite(sourceDateEpoch) || sourceDateEpoch <= 0) {
  sourceDateEpoch = Number(run("git", ["show", "-s", "--format=%ct", "HEAD"], {capture: true}).trim());
}
const builtAt = new Date(sourceDateEpoch * 1000).toISOString();
const platform = "linux-x64";
const topName = `void-node-${version}-${platform}`;
const out = path.resolve(root, outDir);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-release-v1-"));
const stage = path.join(tmp, topName);
fs.mkdirSync(stage, {recursive: true});
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});

const forbiddenParts = new Set([".git", ".runtime", ".secrets", "node_modules", "dist-release", "data", "wallets", "keystores", "coverage", ".cache"]);
const forbiddenNames = [/^\.env(?:\.|$)/i, /^\.npmrc$/i, /(?:^|[-_.])(mnemonic|passphrase|seed)(?:[-_.]|$)/i, /(?:^|[-_.])private[-_.]?key(?:[-_.]|$)/i];
const forbiddenExts = new Set([".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3", ".db", ".log"]);
function allowed(rel) {
  const parts = rel.split("/");
  if (parts.some(p => forbiddenParts.has(p))) return false;
  const base = parts.at(-1) || "";
  if (forbiddenNames.some(re => re.test(base))) return false;
  if (forbiddenExts.has(path.extname(base).toLowerCase())) return false;
  if (rel.startsWith(".github/") || rel.startsWith("test/") || rel.startsWith("tests/")) return false;
  return true;
}

console.log("== build application ==");
run("npm", ["run", "build"], {cwd: root, env: {SOURCE_DATE_EPOCH: String(sourceDateEpoch)}});

const listed = run("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {capture: true});
for (const rel of listed.split("\0").filter(Boolean).sort()) {
  if (!allowed(rel)) continue;
  const source = path.join(root, rel);
  if (!fs.existsSync(source)) continue;
  copyEntry(source, path.join(stage, rel));
}

// Generated build output is commonly gitignored, so bind it explicitly.
for (const candidate of ["dist"]) {
  const source = path.join(root, candidate);
  if (fs.existsSync(source)) copyEntry(source, path.join(stage, candidate));
}

// Runtime command files belong at top-level bin/, not release/bin/.
const releaseBin = path.join(root, "release", "bin");
if (!fs.existsSync(releaseBin)) fail("missing release/bin runtime commands");
fs.cpSync(releaseBin, path.join(stage, "bin"), {recursive: true, dereference: false, preserveTimestamps: false});
fs.rmSync(path.join(stage, "release"), {recursive: true, force: true});
const installerSource = path.join(root, "ops", "public", "install-void-node-v1.sh");
if (!fs.existsSync(installerSource)) fail("missing public installer");
fs.copyFileSync(installerSource, path.join(stage, "install-void-node-v1.sh"));
for (const executable of ["bin/void-node", "bin/void-node-run", "install-void-node-v1.sh"]) {
  fs.chmodSync(path.join(stage, executable), 0o755);
}

console.log("== install production dependencies into stage ==");
run("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: stage,
  env: {npm_config_update_notifier: "false", npm_config_audit: "false", SOURCE_DATE_EPOCH: String(sourceDateEpoch)},
});
// npm may omit node_modules entirely for a zero-dependency package; the release
// contract still exposes an explicit production-dependency root.
fs.mkdirSync(path.join(stage, "node_modules"), {recursive: true});

const buildInfo = {
  marker: "VOID_PUBLIC_RELEASE_BUILD_INFO_V1",
  version,
  package_version: packageJson.version,
  git_commit: commit,
  git_short: short,
  built_at_utc: builtAt,
  source_date_epoch: sourceDateEpoch,
  node_version: process.version,
  platform,
  package_private: true,
  service_enabled_by_default: false,
  service_started_by_default: false,
  wallet_key_generated: false,
  validator_key_generated: false,
  treasury_key_generated: false,
};
fs.writeFileSync(path.join(stage, "BUILD-INFO.json"), stableJson(buildInfo));

const lock = JSON.parse(fs.readFileSync(path.join(stage, "package-lock.json"), "utf8"));
const packages = Object.entries(lock.packages || {}).filter(([name]) => name !== "").map(([name, meta]) => ({
  SPDXID: `SPDXRef-Package-${crypto.createHash("sha256").update(name).digest("hex").slice(0,16)}`,
  name: name.replace(/^node_modules\//, "") || packageJson.name,
  versionInfo: String(meta.version || "UNKNOWN"),
  downloadLocation: "NOASSERTION",
  filesAnalyzed: false,
  licenseConcluded: "NOASSERTION",
  licenseDeclared: String(meta.license || "NOASSERTION"),
  copyrightText: "NOASSERTION",
}));
const sbom = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: `void-node-${version}`,
  documentNamespace: `https://void.network/spdx/void-node/${version}/${commit}`,
  creationInfo: {created: builtAt, creators: ["Tool: VOID public release builder v1"]},
  packages,
};
fs.writeFileSync(path.join(stage, "SBOM.spdx.json"), stableJson(sbom));

// Fail closed on secret-bearing paths in the final stage.
for (const full of walk(stage)) {
  const rel = path.relative(stage, full).split(path.sep).join("/");
  if (!allowed(rel) && !rel.startsWith("node_modules/")) fail(`forbidden release path escaped staging filter: ${rel}`);
}

const internal = [];
for (const full of walk(stage)) {
  const rel = path.relative(stage, full).split(path.sep).join("/");
  if (rel === "RELEASE-CONTENTS-SHA256") continue;
  const st = fs.lstatSync(full);
  if (st.isSymbolicLink()) {
    const resolved = fs.realpathSync(full);
    if (!fs.statSync(resolved).isFile()) fail(`release symlink must resolve to a regular file: ${rel}`);
    // GNU sha256sum follows file symlinks, so hash the resolved file contents.
    internal.push(`${sha256(full)}  ${rel}`);
  } else internal.push(`${sha256(full)}  ${rel}`);
}
fs.writeFileSync(path.join(stage, "RELEASE-CONTENTS-SHA256"), internal.sort().join("\n") + "\n");

const archiveName = `${topName}.tar.gz`;
const archive = path.join(out, archiveName);
console.log("== create deterministic archive ==");
const tarArgs = [
  "--sort=name",
  `--mtime=@${sourceDateEpoch}`,
  "--owner=0", "--group=0", "--numeric-owner", "--format=posix",
  "--pax-option=delete=atime,delete=ctime",
  "-C", tmp, "-cf", "-", topName,
];
const shell = `set -o pipefail; tar ${tarArgs.map(x=>JSON.stringify(x)).join(" ")} | gzip -n > ${JSON.stringify(archive)}`;
run("bash", ["-lc", shell]);
const archiveSha = sha256(archive);

const installerAsset = path.join(out, "install-void-node-v1.sh");
fs.copyFileSync(installerSource, installerAsset);
fs.chmodSync(installerAsset, 0o755);
const sbomAssetName = `void-node-${version}.spdx.json`;
const sbomAsset = path.join(out, sbomAssetName);
fs.copyFileSync(path.join(stage, "SBOM.spdx.json"), sbomAsset);
const notesName = `void-node-${version}-release-notes.txt`;
const notes = path.join(out, notesName);
fs.writeFileSync(notes, [
  `VOID Network node release ${version}`,
  `Commit: ${commit}`,
  `Built: ${builtAt}`,
  "Install defaults: user-scoped, checksum-verified, service disabled, service stopped.",
  "Guarded economic, validator, treasury, and authority lanes are not activated by this release.",
  "",
].join("\n"));

const manifest = {
  marker: "VOID_PUBLIC_RELEASE_MANIFEST_V1",
  schema_version: 1,
  version,
  git_commit: commit,
  built_at_utc: builtAt,
  source_date_epoch: sourceDateEpoch,
  platform,
  archive: archiveName,
  archive_sha256: archiveSha,
  archive_bytes: fs.statSync(archive).size,
  installer: "install-void-node-v1.sh",
  checksums: "SHA256SUMS",
  sbom: sbomAssetName,
  release_notes: notesName,
  minimum_node_major: 22,
  package_private: true,
  install_scope: "unprivileged_user",
  service_enabled_by_default: false,
  service_started_by_default: false,
  guarded_lanes_activated: false,
};
const manifestPath = path.join(out, "void-node-release-manifest.json");
fs.writeFileSync(manifestPath, stableJson(manifest));

const assets = [archive, installerAsset, manifestPath, sbomAsset, notes];
const sums = assets.map(file => `${sha256(file)}  ${path.basename(file)}`).sort().join("\n") + "\n";
fs.writeFileSync(path.join(out, "SHA256SUMS"), sums);

fs.rmSync(tmp, {recursive: true, force: true});
console.log(`${MARKER} GREEN`);
console.log(`version=${version}`);
console.log(`git_commit=${commit}`);
console.log(`archive=${archive}`);
console.log(`archive_sha256=${archiveSha}`);
console.log(`manifest=${manifestPath}`);
console.log(`checksums=${path.join(out, "SHA256SUMS")}`);
console.log(`service_started_by_default=false`);
console.log(`guarded_lanes_activated=false`);
