#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_CHECKPOINT_ENVIRONMENT_COMPAT_PACKET_COMPOSER_V1";
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
function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite canonical number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
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
function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== "..")
  );
}
function replaceExactOccurrences(text, before, after, expected, label) {
  const count = text.split(before).length - 1;
  if (count !== expected) {
    throw new Error(
      `${label} old packet-root occurrence count ${count}; expected ${expected}`,
    );
  }
  const rewritten = text.split(before).join(after);
  if (rewritten.includes(before)) {
    throw new Error(`${label} still contains old packet root after relocation`);
  }
  const newCount = rewritten.split(after).length - 1;
  if (newCount !== expected) {
    throw new Error(
      `${label} new packet-root occurrence count ${newCount}; expected ${expected}`,
    );
  }
  return rewritten;
}
function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`unexpected argument ${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${key}`);
    if (Object.hasOwn(values, key.slice(2))) throw new Error(`duplicate ${key}`);
    values[key.slice(2)] = value;
    index += 1;
  }
  for (const key of ["packet", "clean-environment-dropin", "output"]) {
    if (!values[key]) throw new Error(`missing --${key}`);
  }
  return values;
}
function realDirectory(raw, label) {
  const resolved = path.resolve(String(raw));
  const st = fs.lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isDirectory()) {
    throw new Error(`${label} must be one real directory`);
  }
  if (fs.realpathSync(resolved) !== resolved) {
    throw new Error(`${label} must already be canonical`);
  }
  return resolved;
}
function regularFile(raw, label, { mode600 = false } = {}) {
  const resolved = path.resolve(String(raw));
  const st = fs.lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error(`${label} must be one regular non-symlink file`);
  }
  if (fs.realpathSync(resolved) !== resolved) {
    throw new Error(`${label} must already be canonical`);
  }
  if (mode600 && (st.mode & 0o777) !== 0o600) {
    throw new Error(`${label} must have mode 0600`);
  }
  return resolved;
}
function readJson(file, label) {
  const bytes = fs.readFileSync(file);
  if (bytes.length > 8 * 1024 * 1024) throw new Error(`${label} exceeds 8 MiB`);
  return JSON.parse(bytes.toString("utf8"));
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
  if (pending) throw new Error("unterminated drop-in continuation");
  return out;
}
function unsetNames(text) {
  const all = directives(text);
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
  const seen = new Set();
  for (const name of names) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || seen.has(name)) {
      throw new Error("clean-environment name set is invalid");
    }
    seen.add(name);
  }
  for (const key of CHECKPOINT_KEYS) {
    if (!seen.has(key)) throw new Error(`clean-environment no longer unsets ${key}`);
  }
  return names;
}
function derive(raw) {
  const source = regularFile(raw, "clean-environment source", { mode600: true });
  const bytes = fs.readFileSync(source);
  const names = unsetNames(bytes.toString("utf8"));
  const preserved = names.filter((name) => !CHECKPOINT_KEYS.includes(name));
  return Object.freeze({
    schema: COMPAT_SCHEMA,
    source_dropin_path: source,
    source_dropin_sha256: sha256Bytes(bytes),
    source_dropin_mode: "0600",
    original_unset_count: names.length,
    preserved_unset_count: preserved.length,
    preserved_unset_sequence_sha256: sha256Bytes(`${preserved.join("\n")}\n`),
    released_checkpoint_names: [...CHECKPOINT_KEYS],
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePacket = realDirectory(args.packet, "source packet");
  const output = path.resolve(args.output);
  if (fs.existsSync(output)) throw new Error("output directory already exists");

  const sourceVerified = run(
    process.execPath,
    [VERIFIER, "--packet", sourcePacket],
    { cwd: ROOT },
  );
  if (!sourceVerified.includes("checkpoint_publication_configured=true")) {
    throw new Error("source packet is not checkpoint-bound");
  }

  const sourceJson = readJson(
    regularFile(path.join(sourcePacket, "packet.json"), "source packet.json", {
      mode600: true,
    }),
    "source packet.json",
  );
  if (Object.hasOwn(sourceJson, "checkpoint_environment_compat")) {
    throw new Error("source packet already has environment compatibility");
  }

  const repoRoot = realDirectory(
    sourceJson.repository_root,
    "packet repository root",
  );
  if (isPathInside(repoRoot, output)) {
    throw new Error("compatibility output must remain outside the repository");
  }
  if (isPathInside(sourcePacket, output)) {
    throw new Error(
      "compatibility output must not be nested inside the source packet",
    );
  }

  const compat = derive(args["clean-environment-dropin"]);
  if (isPathInside(repoRoot, compat.source_dropin_path)) {
    throw new Error(
      "clean-environment compatibility source must remain outside the repository",
    );
  }
  let created = false;
  try {
    fs.cpSync(sourcePacket, output, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    created = true;

    const tunnelName = "void-public-seed-named-tunnel-v1.service";
    const installName = "INSTALL.txt";
    const tunnelPath = path.join(output, tunnelName);
    const installPath = path.join(output, installName);

    const relocatedTunnel = replaceExactOccurrences(
      fs.readFileSync(tunnelPath, "utf8"),
      sourcePacket,
      output,
      1,
      "named-tunnel service",
    );
    const relocatedInstall = replaceExactOccurrences(
      fs.readFileSync(installPath, "utf8"),
      sourcePacket,
      output,
      2,
      "INSTALL.txt",
    );
    fs.writeFileSync(tunnelPath, relocatedTunnel, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.chmodSync(tunnelPath, 0o600);
    fs.writeFileSync(installPath, relocatedInstall, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.chmodSync(installPath, 0o600);

    const packetPath = path.join(output, "packet.json");
    const packet = readJson(packetPath, "packet.json");
    if (
      !packet.files ||
      typeof packet.files !== "object" ||
      Array.isArray(packet.files)
    ) {
      throw new Error("packet files metadata is invalid");
    }
    for (const [name, file] of [
      [tunnelName, tunnelPath],
      [installName, installPath],
    ]) {
      if (
        !packet.files[name] ||
        typeof packet.files[name] !== "object" ||
        Array.isArray(packet.files[name])
      ) {
        throw new Error(`packet file metadata missing for ${name}`);
      }
      packet.files[name].bytes = fs.statSync(file).size;
      packet.files[name].sha256 = sha256File(file);
    }

    packet.checkpoint_environment_compat = compat;
    delete packet.packet_id;
    packet.packet_id = `voidpsa1_${sha256Bytes(canonicalJson(packet))}`;
    fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.chmodSync(packetPath, 0o600);

    const verified = run(process.execPath, [VERIFIER, "--packet", output], {
      cwd: ROOT,
    });

    console.log(sourceVerified);
    console.log(verified);
    console.log(`${MARKER}_GREEN`);
    console.log(`packet=${output}`);
    console.log(`packet_id=${packet.packet_id}`);
    console.log(`source_dropin_sha256=${compat.source_dropin_sha256}`);
    console.log(`original_unset_count=${compat.original_unset_count}`);
    console.log(`preserved_unset_count=${compat.preserved_unset_count}`);
    console.log(`released_checkpoint_count=${compat.released_checkpoint_names.length}`);
    console.log("checkpoint_environment_compat_bound=true");
    console.log("packet_root_relocated=true");
    console.log("tunnel_config_path_relocated=true");
    console.log("install_command_paths_relocated=true");
    console.log("relocated_file_metadata_refreshed=true");
    console.log("unrelated_unset_names_preserved=true");
    console.log("checkpoint_three_pin_unsets_released=true");
    console.log("services_started=false");
    console.log("checkpoint_publication_public=false");
  } catch (error) {
    if (created && fs.existsSync(output)) {
      fs.rmSync(output, { recursive: true, force: true });
    }
    throw error;
  }
}
try { main(); } catch (error) { fail(error?.stack || String(error)); }
