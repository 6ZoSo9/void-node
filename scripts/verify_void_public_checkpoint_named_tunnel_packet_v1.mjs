#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_NAMED_TUNNEL_PACKET_VERIFIER_V1";
const BINDING_SCHEMA =
  "void_public_checkpoint_named_tunnel_binding_v1";
const COMPAT_SCHEMA =
  "void_public_checkpoint_environment_compat_v1";
const CHECKPOINT_KEYS = Object.freeze([
  "VOID_PUBLIC_SEED_CHECKPOINT_ROOT",
  "VOID_PUBLIC_SEED_CHECKPOINT_ID",
  "VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256",
]);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE_VERIFIER = path.join(
  ROOT,
  "scripts",
  "verify_void_public_seed_named_tunnel_packet_v1.mjs",
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

function parseArgs(argv) {
  let packet = "";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--packet") {
      packet = argv[index + 1] || "";
      index += 1;
      continue;
    }
    throw new Error(`unexpected argument ${arg}`);
  }
  if (!packet) throw new Error("missing --packet");
  return { packet };
}

function realDirectory(raw, label) {
  const resolved = path.resolve(String(raw));
  const lstat = fs.lstatSync(resolved);
  if (lstat.isSymbolicLink() || !lstat.isDirectory()) {
    throw new Error(`${label} must be one real directory`);
  }
  if (fs.realpathSync(resolved) !== resolved) {
    throw new Error(`${label} path must already be canonical`);
  }
  return resolved;
}

function regularFile(raw, label, { mode600 = false } = {}) {
  const resolved = path.resolve(String(raw));
  const lstat = fs.lstatSync(resolved);
  if (lstat.isSymbolicLink() || !lstat.isFile()) {
    throw new Error(`${label} must be one regular non-symlink file`);
  }
  if (fs.realpathSync(resolved) !== resolved) {
    throw new Error(`${label} path must already be canonical`);
  }
  if (mode600 && (lstat.mode & 0o777) !== 0o600) {
    throw new Error(`${label} must have mode 0600`);
  }
  return resolved;
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== "..")
  );
}

function readJson(file, label) {
  const bytes = fs.readFileSync(file);
  if (bytes.length > 8 * 1024 * 1024) {
    throw new Error(`${label} exceeds eight MiB`);
  }
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error?.message || error}`);
  }
}

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON cannot contain non-finite numbers");
    }
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

function systemdEnvironmentLine(name, value) {
  const text = String(value);
  if (
    /[\0\r\n%]/.test(text) ||
    !/^[A-Za-z0-9_./:+@-]+$/.test(text)
  ) {
    throw new Error(`${name} is not portable as a systemd Environment value`);
  }
  return `Environment=${name}=${text}`;
}

function parseCompatSource(raw) {
  const source = regularFile(
    raw,
    "clean-environment compatibility source",
    { mode600: true },
  );
  const bytes = fs.readFileSync(source);
  if (bytes.length > 1024 * 1024) {
    throw new Error("clean-environment compatibility source exceeds one MiB");
  }

  let section = "";
  let pending = "";
  const directives = [];
  for (const rawLine of bytes.toString("utf8").split(/\r?\n/)) {
    let line = rawLine.replace(/\s+$/, "");
    if (pending) {
      line = pending + line.replace(/^\s+/, "");
      pending = "";
    }
    if (line.endsWith("\\")) {
      pending = line.slice(0, -1);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) {
      continue;
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      section = trimmed.slice(1, -1);
      continue;
    }
    if (section !== "Service" || !line.includes("=")) continue;
    const split = line.indexOf("=");
    directives.push([
      line.slice(0, split).trim(),
      line.slice(split + 1).trim(),
    ]);
  }
  if (pending) {
    throw new Error("clean-environment source has unterminated continuation");
  }

  const environments = directives.filter(([key]) => key === "Environment");
  const unsets = directives.filter(([key]) => key === "UnsetEnvironment");
  const other = directives.filter(
    ([key]) => key !== "Environment" && key !== "UnsetEnvironment",
  );
  if (environments.length !== 0 || unsets.length !== 1 || other.length !== 0) {
    throw new Error(
      "clean-environment compatibility source is outside narrow contract",
    );
  }

  const value = unsets[0][1];
  if (!value || /["'\\]/.test(value)) {
    throw new Error(
      "clean-environment compatibility source must use plain bare names",
    );
  }
  const names = value.split(/\s+/).filter(Boolean);
  const seen = new Set();
  for (const name of names) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || seen.has(name)) {
      throw new Error("clean-environment compatibility name set is invalid");
    }
    seen.add(name);
  }
  for (const key of CHECKPOINT_KEYS) {
    if (!seen.has(key)) {
      throw new Error(`clean-environment no longer unsets ${key}`);
    }
  }
  const preserved = names.filter((name) => !CHECKPOINT_KEYS.includes(name));
  return {
    schema: COMPAT_SCHEMA,
    source_dropin_path: source,
    source_dropin_sha256: sha256Bytes(bytes),
    source_dropin_mode: "0600",
    original_unset_count: names.length,
    preserved_unset_count: preserved.length,
    preserved_unset_sequence_sha256: sha256Bytes(
      `${preserved.join("\n")}\n`,
    ),
    released_checkpoint_names: [...CHECKPOINT_KEYS],
  };
}

function assertFalseAuthority(authority) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    throw new Error("checkpoint binding authority is invalid");
  }
  for (const key of [
    "publication_authority",
    "gateway_start_authority",
    "deployment_authority",
    "runtime_service_authority",
    "wallet_or_funds_authority",
  ]) {
    if (authority[key] !== false) {
      throw new Error(`checkpoint binding authority ${key} must be false`);
    }
  }
}

function bindingFromReceipt(receipt) {
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt) ||
    receipt.schema !== "void_public_checkpoint_publication_preflight_v1" ||
    receipt.status !== "green"
  ) {
    throw new Error("fresh checkpoint preflight receipt is invalid");
  }
  assertFalseAuthority(receipt.authority);
  return {
    schema: BINDING_SCHEMA,
    packet_root: receipt.packet_root,
    checkpoint_id: receipt.checkpoint_id,
    manifest_sha256: receipt.manifest_sha256,
    source_sha: receipt.source_sha,
    head: receipt.head,
    block_count: receipt.block_count,
    segment_count: receipt.segment_count,
    payload_bytes: receipt.payload_bytes,
    restart_authority: receipt.restart_authority,
    gateway_env: receipt.gateway_env,
    authority: receipt.authority,
  };
}

function runFreshPreflight(repoRoot, binding) {
  const tool = regularFile(
    path.join(
      repoRoot,
      "tools",
      "void-public-checkpoint-publication-preflight-v1.mjs",
    ),
    "checkpoint publication preflight source",
  );
  run(process.execPath, ["--check", tool]);

  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-checkpoint-ingress-verify-"),
  );
  const receiptPath = path.join(temporary, "receipt.json");
  try {
    run(
      process.execPath,
      [
        tool,
        "--packet",
        binding.packet_root,
        "--expected-source-sha",
        binding.source_sha,
        "--receipt",
        receiptPath,
      ],
      { cwd: repoRoot },
    );
    return readJson(
      regularFile(
        receiptPath,
        "fresh checkpoint preflight receipt",
        { mode600: true },
      ),
      "fresh checkpoint preflight receipt",
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packetDir = realDirectory(args.packet, "packet directory");

  const base = run(
    process.execPath,
    [BASE_VERIFIER, "--packet", packetDir, "--skip-runtime-probe"],
    { cwd: ROOT },
  );

  const packetPath = regularFile(
    path.join(packetDir, "packet.json"),
    "packet.json",
    { mode600: true },
  );
  const packet = readJson(packetPath, "packet.json");
  const gatewayUnitPath = regularFile(
    path.join(packetDir, "void-public-seed-gateway-v1.service"),
    "gateway unit",
    { mode600: true },
  );
  const gatewayUnit = fs.readFileSync(gatewayUnitPath, "utf8");
  const checkpointLines = gatewayUnit
    .split(/\r?\n/)
    .filter((line) =>
      line.startsWith("Environment=VOID_PUBLIC_SEED_CHECKPOINT_"),
    );

  if (!Object.hasOwn(packet, "checkpoint_publication")) {
    if (checkpointLines.length !== 0) {
      throw new Error(
        "unbound checkpoint environment exists without packet binding",
      );
    }
    console.log(base);
    console.log(`${MARKER}_GREEN`);
    if (Object.hasOwn(packet, "checkpoint_environment_compat")) {
      throw new Error(
        "checkpoint environment compatibility exists without checkpoint publication",
      );
    }
    console.log("checkpoint_publication_configured=false");
    console.log("checkpoint_environment_compat_configured=false");
    console.log("gateway_checkpoint_environment_present=false");
    console.log("services_started=false");
    return;
  }

  const binding = packet.checkpoint_publication;
  if (
    !binding ||
    typeof binding !== "object" ||
    Array.isArray(binding) ||
    binding.schema !== BINDING_SCHEMA
  ) {
    throw new Error("checkpoint publication binding domain mismatch");
  }
  assertFalseAuthority(binding.authority);

  const repoRoot = realDirectory(packet.repository_root, "repository root");
  const checkpointRoot = realDirectory(
    binding.packet_root,
    "checkpoint packet root",
  );
  if (isPathInside(repoRoot, checkpointRoot)) {
    throw new Error("checkpoint packet must remain outside the repository");
  }

  const freshReceipt = runFreshPreflight(repoRoot, binding);
  const expectedBinding = bindingFromReceipt(freshReceipt);
  if (canonicalJson(binding) !== canonicalJson(expectedBinding)) {
    throw new Error(
      "checkpoint publication binding differs from fresh independent preflight",
    );
  }

  const expectedLines = [
    systemdEnvironmentLine(
      "VOID_PUBLIC_SEED_CHECKPOINT_ROOT",
      binding.gateway_env.VOID_PUBLIC_SEED_CHECKPOINT_ROOT,
    ),
    systemdEnvironmentLine(
      "VOID_PUBLIC_SEED_CHECKPOINT_ID",
      binding.gateway_env.VOID_PUBLIC_SEED_CHECKPOINT_ID,
    ),
    systemdEnvironmentLine(
      "VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256",
      binding.gateway_env.VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256,
    ),
  ];

  if (
    checkpointLines.length !== expectedLines.length ||
    checkpointLines.some((line, index) => line !== expectedLines[index])
  ) {
    throw new Error(
      "gateway checkpoint environment does not exactly match fresh preflight",
    );
  }

  let compatConfigured = false;
  if (Object.hasOwn(packet, "checkpoint_environment_compat")) {
    const compat = packet.checkpoint_environment_compat;
    if (
      !compat ||
      typeof compat !== "object" ||
      Array.isArray(compat) ||
      compat.schema !== COMPAT_SCHEMA ||
      typeof compat.source_dropin_path !== "string"
    ) {
      throw new Error("checkpoint environment compatibility binding invalid");
    }
    const expectedCompat = parseCompatSource(compat.source_dropin_path);
    if (canonicalJson(compat) !== canonicalJson(expectedCompat)) {
      throw new Error(
        "checkpoint environment compatibility differs from current source drop-in",
      );
    }
    compatConfigured = true;
  }

  console.log(base);
  console.log(`${MARKER}_GREEN`);
  console.log("checkpoint_publication_configured=true");
  console.log(
    `checkpoint_environment_compat_configured=${compatConfigured}`,
  );
  if (compatConfigured) {
    console.log("checkpoint_three_pin_unsets_released=true");
    console.log("unrelated_unset_names_preserved=true");
  }
  console.log(`checkpoint_id=${binding.checkpoint_id}`);
  console.log(`checkpoint_manifest_sha256=${binding.manifest_sha256}`);
  console.log(`checkpoint_source_sha=${binding.source_sha}`);
  console.log(`checkpoint_head=${binding.head}`);
  console.log(`checkpoint_segment_count=${binding.segment_count}`);
  console.log(`checkpoint_payload_bytes=${binding.payload_bytes}`);
  console.log("checkpoint_preflight_authority_bound=true");
  console.log("raw_checkpoint_descriptor_sha256_bound=true");
  console.log("gateway_three_pin_tuple_exact=true");
  console.log("gateway_loopback_only=true");
  console.log("services_started=false");
  console.log("checkpoint_publication_public=false");
  console.log("wallet_authority=false");
  console.log("money_movement_authority=false");
}

try {
  main();
} catch (error) {
  fail(error?.stack || String(error));
}
