#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_CHECKPOINT_ENVIRONMENT_COMPAT_DROPIN_RENDERER_V1";
const COMPAT_SCHEMA = "void_public_checkpoint_environment_compat_v1";
const CHECKPOINT_KEYS = Object.freeze([
  "VOID_PUBLIC_SEED_CHECKPOINT_ROOT",
  "VOID_PUBLIC_SEED_CHECKPOINT_ID",
  "VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256",
]);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const VERIFIER = path.join(
  ROOT,
  "scripts",
  "verify_void_public_checkpoint_named_tunnel_packet_v1.mjs",
);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}
function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${
        result.stderr || result.stdout || ""
      }`.trim(),
    );
  }
  return String(result.stdout || "").trim();
}
function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`invalid argument sequence near ${key || "<end>"}`);
    }
    values[key.slice(2)] = value;
    index += 1;
  }
  if (!values.packet) throw new Error("missing --packet");
  if (!values.output) throw new Error("missing --output");
  return values;
}
function realDirectory(raw, label) {
  const resolved = path.resolve(String(raw));
  const st = fs.lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isDirectory()) {
    throw new Error(`${label} must be one real directory`);
  }
  return resolved;
}
function regularFile(raw, label, { mode600 = false } = {}) {
  const resolved = path.resolve(String(raw));
  const st = fs.lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error(`${label} must be one regular non-symlink file`);
  }
  if (mode600 && (st.mode & 0o777) !== 0o600) {
    throw new Error(`${label} must have mode 0600`);
  }
  return resolved;
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function directives(text) {
  let section = "";
  let pending = "";
  const out = [];
  for (const raw of String(text).split(/\r?\n/)) {
    let line = raw.replace(/\s+$/, "");
    if (pending) {
      line = pending + line.replace(/^\s+/, "");
      pending = "";
    }
    if (line.endsWith("\\")) {
      pending = line.slice(0, -1);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      section = trimmed.slice(1, -1);
      continue;
    }
    if (section !== "Service" || !line.includes("=")) continue;
    const split = line.indexOf("=");
    out.push([line.slice(0, split).trim(), line.slice(split + 1).trim()]);
  }
  return out;
}
function derive(raw) {
  const source = regularFile(raw, "clean-environment source", { mode600: true });
  const bytes = fs.readFileSync(source);
  const all = directives(bytes.toString("utf8"));
  const env = all.filter(([key]) => key === "Environment");
  const unset = all.filter(([key]) => key === "UnsetEnvironment");
  const other = all.filter(([key]) => !["Environment", "UnsetEnvironment"].includes(key));
  if (env.length !== 0 || unset.length !== 1 || other.length !== 0) {
    throw new Error("clean-environment source is outside narrow contract");
  }
  const value = unset[0][1];
  if (!value || /["'\\]/.test(value)) {
    throw new Error("clean-environment source must contain plain bare names");
  }
  const names = value.split(/\s+/).filter(Boolean);
  const seen = new Set(names);
  for (const key of CHECKPOINT_KEYS) {
    if (!seen.has(key)) throw new Error(`clean-environment no longer unsets ${key}`);
  }
  const preserved = names.filter((name) => !CHECKPOINT_KEYS.includes(name));
  return {
    sourceSha256: sha256Bytes(bytes),
    originalCount: names.length,
    preserved,
    preservedSha256: sha256Bytes(`${preserved.join("\n")}\n`),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packetDir = realDirectory(args.packet, "packet directory");
  const output = path.resolve(args.output);
  if (fs.existsSync(output)) throw new Error("output path already exists");

  const verified = run(process.execPath, [VERIFIER, "--packet", packetDir], {
    cwd: ROOT,
  });
  const packet = readJson(path.join(packetDir, "packet.json"));

  if (!Object.hasOwn(packet, "checkpoint_environment_compat")) {
    console.log(verified);
    console.log(`${MARKER}_GREEN`);
    console.log("checkpoint_environment_compat_configured=false");
    console.log("output_created=false");
    return;
  }

  const compat = packet.checkpoint_environment_compat;
  if (!compat || compat.schema !== COMPAT_SCHEMA) {
    throw new Error("checkpoint environment compatibility binding invalid");
  }
  const derived = derive(compat.source_dropin_path);
  if (
    compat.source_dropin_sha256 !== derived.sourceSha256 ||
    compat.source_dropin_mode !== "0600" ||
    compat.original_unset_count !== derived.originalCount ||
    compat.preserved_unset_count !== derived.preserved.length ||
    compat.preserved_unset_sequence_sha256 !== derived.preservedSha256 ||
    JSON.stringify(compat.released_checkpoint_names) !== JSON.stringify(CHECKPOINT_KEYS)
  ) {
    throw new Error(
      "checkpoint environment compatibility differs from current source drop-in",
    );
  }

  const content = [
    "[Service]",
    "# Managed by VOID checkpoint environment compatibility v1.",
    "UnsetEnvironment=",
    `UnsetEnvironment=${derived.preserved.join(" ")}`,
    "",
  ].join("\n");
  fs.writeFileSync(output, content, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  fs.chmodSync(output, 0o600);

  console.log(verified);
  console.log(`${MARKER}_GREEN`);
  console.log("checkpoint_environment_compat_configured=true");
  console.log(`preserved_unset_count=${derived.preserved.length}`);
  console.log(`released_checkpoint_count=${CHECKPOINT_KEYS.length}`);
  console.log("checkpoint_three_pin_unsets_released=true");
  console.log("unrelated_unset_names_preserved=true");
  console.log("output_created=true");
}
try { main(); } catch (error) { fail(error?.stack || String(error)); }
