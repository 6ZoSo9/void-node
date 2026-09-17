#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_NAMED_TUNNEL_PACKET_VERIFIER_V1";
const BINDING_SCHEMA =
  "void_public_checkpoint_named_tunnel_binding_v1";
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
    console.log("checkpoint_publication_configured=false");
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

  console.log(base);
  console.log(`${MARKER}_GREEN`);
  console.log("checkpoint_publication_configured=true");
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
