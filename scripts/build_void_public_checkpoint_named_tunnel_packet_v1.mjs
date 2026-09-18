#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_NAMED_TUNNEL_PACKET_BUILDER_V1";
const BINDING_SCHEMA =
  "void_public_checkpoint_named_tunnel_binding_v1";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE_BUILDER = path.join(
  ROOT,
  "scripts",
  "build_void_public_seed_named_tunnel_packet_v1.mjs",
);
const CHECKPOINT_VERIFIER = path.join(
  ROOT,
  "scripts",
  "verify_void_public_checkpoint_named_tunnel_packet_v1.mjs",
);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
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

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
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
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      throw new Error(`unexpected argument ${key}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${key}`);
    }
    const name = key.slice(2);
    if (Object.hasOwn(values, name)) {
      throw new Error(`duplicate argument ${key}`);
    }
    values[name] = value;
    index += 1;
  }
  for (const key of [
    "hostname",
    "tunnel-id",
    "credentials-file",
    "repo-root",
    "expected-head",
    "cloudflared",
    "output",
    "checkpoint-packet",
  ]) {
    if (!values[key]) throw new Error(`missing --${key}`);
  }
  return values;
}

function rejectControl(value, label) {
  const text = String(value);
  if (/[\0\r\n]/.test(text)) {
    throw new Error(`${label} contains a control character`);
  }
  if (text.includes("%")) {
    throw new Error(`${label} contains a systemd specifier character`);
  }
  return text;
}

function realDirectory(raw, label) {
  const input = path.resolve(rejectControl(raw, label));
  const lstat = fs.lstatSync(input);
  if (lstat.isSymbolicLink() || !lstat.isDirectory()) {
    throw new Error(`${label} must be one real directory`);
  }
  if (fs.realpathSync(input) !== input) {
    throw new Error(`${label} path must already be canonical`);
  }
  return input;
}

function regularFile(raw, label, { mode600 = false } = {}) {
  const input = path.resolve(rejectControl(raw, label));
  const lstat = fs.lstatSync(input);
  if (lstat.isSymbolicLink() || !lstat.isFile()) {
    throw new Error(`${label} must be one regular non-symlink file`);
  }
  if (fs.realpathSync(input) !== input) {
    throw new Error(`${label} path must already be canonical`);
  }
  if (mode600 && (lstat.mode & 0o777) !== 0o600) {
    throw new Error(`${label} must have mode 0600`);
  }
  return input;
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== "..")
  );
}

function systemdEnvironmentLine(name, value) {
  if (!/^[A-Z0-9_]+$/.test(name)) {
    throw new Error(`invalid systemd environment name ${name}`);
  }
  const text = rejectControl(value, `${name} value`);
  if (!/^[A-Za-z0-9_./:+@-]+$/.test(text)) {
    throw new Error(
      `${name} contains a character unsupported by portable systemd Environment`,
    );
  }
  return `Environment=${name}=${text}`;
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

function assertFalseAuthority(authority) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    throw new Error("checkpoint preflight authority is invalid");
  }
  for (const key of [
    "publication_authority",
    "gateway_start_authority",
    "deployment_authority",
    "runtime_service_authority",
    "wallet_or_funds_authority",
  ]) {
    if (authority[key] !== false) {
      throw new Error(`checkpoint preflight authority ${key} must be false`);
    }
  }
}

function validatePreflightReceipt(receipt, checkpointRoot, manifest) {
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt) ||
    receipt.schema !== "void_public_checkpoint_publication_preflight_v1" ||
    receipt.status !== "green"
  ) {
    throw new Error("checkpoint preflight receipt domain/status mismatch");
  }

  if (receipt.packet_root !== checkpointRoot) {
    throw new Error("checkpoint preflight packet root mismatch");
  }

  const exact = {
    checkpoint_id: manifest.checkpoint_id,
    manifest_sha256: sha256File(path.join(checkpointRoot, "checkpoint.json")),
    source_sha: manifest.source_sha,
    head: manifest.head,
    block_count: manifest.block_count,
    segment_count: manifest.segment_count,
    payload_bytes: manifest.payload_bytes,
  };
  for (const [key, expected] of Object.entries(exact)) {
    if (receipt[key] !== expected) {
      throw new Error(
        `checkpoint preflight ${key} mismatch: expected ${expected} got ${receipt[key]}`,
      );
    }
  }

  if (
    !receipt.restart_authority ||
    typeof receipt.restart_authority !== "object" ||
    Array.isArray(receipt.restart_authority)
  ) {
    throw new Error("checkpoint preflight restart authority missing");
  }
  if (
    receipt.restart_authority.checkpoint_descriptor_sha256 !==
    receipt.manifest_sha256
  ) {
    throw new Error(
      "checkpoint preflight raw descriptor is not the accepted restart descriptor",
    );
  }

  assertFalseAuthority(receipt.authority);

  const gatewayEnv = receipt.gateway_env;
  if (
    !gatewayEnv ||
    typeof gatewayEnv !== "object" ||
    Array.isArray(gatewayEnv)
  ) {
    throw new Error("checkpoint preflight gateway env missing");
  }
  const expectedGatewayEnv = {
    VOID_PUBLIC_SEED_CHECKPOINT_ROOT: checkpointRoot,
    VOID_PUBLIC_SEED_CHECKPOINT_ID: receipt.checkpoint_id,
    VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256: receipt.manifest_sha256,
  };
  if (
    Object.keys(gatewayEnv).sort().join("\n") !==
    Object.keys(expectedGatewayEnv).sort().join("\n")
  ) {
    throw new Error("checkpoint preflight gateway env key set mismatch");
  }
  for (const [key, expected] of Object.entries(expectedGatewayEnv)) {
    if (gatewayEnv[key] !== expected) {
      throw new Error(`checkpoint preflight gateway env ${key} mismatch`);
    }
  }

  return Object.freeze({
    schema: BINDING_SCHEMA,
    packet_root: checkpointRoot,
    checkpoint_id: receipt.checkpoint_id,
    manifest_sha256: receipt.manifest_sha256,
    source_sha: receipt.source_sha,
    head: receipt.head,
    block_count: receipt.block_count,
    segment_count: receipt.segment_count,
    payload_bytes: receipt.payload_bytes,
    restart_authority: receipt.restart_authority,
    gateway_env: expectedGatewayEnv,
    authority: receipt.authority,
  });
}

function runCheckpointPreflight(repoRoot, checkpointRoot, sourceSha) {
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
    path.join(os.tmpdir(), "void-checkpoint-ingress-preflight-"),
  );
  const receipt = path.join(temporary, "receipt.json");
  try {
    run(
      process.execPath,
      [
        tool,
        "--packet",
        checkpointRoot,
        "--expected-source-sha",
        sourceSha,
        "--receipt",
        receipt,
      ],
      { cwd: repoRoot },
    );
    return readJson(
      regularFile(receipt, "checkpoint preflight receipt", { mode600: true }),
      "checkpoint preflight receipt",
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function baseBuilderArgs(args) {
  return [
    BASE_BUILDER,
    "--hostname",
    args.hostname,
    "--tunnel-id",
    args["tunnel-id"],
    "--credentials-file",
    args["credentials-file"],
    "--repo-root",
    args["repo-root"],
    "--expected-head",
    args["expected-head"],
    "--cloudflared",
    args.cloudflared,
    "--output",
    args.output,
  ];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = realDirectory(args["repo-root"], "repository root");
  const checkpointRoot = realDirectory(
    args["checkpoint-packet"],
    "checkpoint packet root",
  );
  if (isPathInside(repoRoot, checkpointRoot)) {
    throw new Error("checkpoint packet must remain outside the repository");
  }

  const manifestPath = regularFile(
    path.join(checkpointRoot, "checkpoint.json"),
    "checkpoint manifest",
  );
  const manifest = readJson(manifestPath, "checkpoint manifest");
  if (
    manifest.schema !== "void_public_canonical_checkpoint_v1" ||
    typeof manifest.source_sha !== "string" ||
    !/^[0-9a-f]{40}$/.test(manifest.source_sha) ||
    typeof manifest.checkpoint_id !== "string" ||
    !/^voidpbc1_[0-9a-f]{64}$/.test(manifest.checkpoint_id) ||
    !Number.isSafeInteger(manifest.head) ||
    manifest.head < 0 ||
    !Number.isSafeInteger(manifest.block_count) ||
    manifest.block_count !== manifest.head + 1 ||
    !Number.isSafeInteger(manifest.segment_count) ||
    manifest.segment_count <= 0 ||
    !Number.isSafeInteger(manifest.payload_bytes) ||
    manifest.payload_bytes <= 0
  ) {
    throw new Error("checkpoint manifest identity/count contract mismatch");
  }

  const preflight = runCheckpointPreflight(
    repoRoot,
    checkpointRoot,
    manifest.source_sha,
  );
  const binding = validatePreflightReceipt(
    preflight,
    checkpointRoot,
    manifest,
  );

  const output = path.resolve(rejectControl(args.output, "output directory"));
  if (fs.existsSync(output)) {
    throw new Error("output directory already exists");
  }

  let outputCreated = false;
  try {
    const baseOutput = run(process.execPath, baseBuilderArgs(args), {
      cwd: ROOT,
    });
    outputCreated = true;

    const gatewayUnitPath = path.join(
      output,
      "void-public-seed-gateway-v1.service",
    );
    let gatewayUnit = fs.readFileSync(gatewayUnitPath, "utf8");
    const anchor =
      "Environment=VOID_PUBLIC_SEED_UPSTREAM=http://127.0.0.1:4100\n";
    if (gatewayUnit.split(anchor).length !== 2) {
      throw new Error("gateway unit upstream anchor is not unique");
    }

    const checkpointLines = [
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
    ].join("\n") + "\n";

    if (gatewayUnit.includes("VOID_PUBLIC_SEED_CHECKPOINT_")) {
      throw new Error("base gateway unit unexpectedly contains checkpoint pins");
    }
    gatewayUnit = gatewayUnit.replace(
      anchor,
      anchor + checkpointLines,
    );
    fs.writeFileSync(gatewayUnitPath, gatewayUnit, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.chmodSync(gatewayUnitPath, 0o600);

    const packetPath = path.join(output, "packet.json");
    const packet = readJson(packetPath, "base packet");
    if (Object.hasOwn(packet, "checkpoint_publication")) {
      throw new Error("base packet unexpectedly contains checkpoint publication");
    }
    packet.checkpoint_publication = binding;

    const gatewayMetadata =
      packet.files?.["void-public-seed-gateway-v1.service"];
    if (!gatewayMetadata || typeof gatewayMetadata !== "object") {
      throw new Error("base packet gateway file metadata missing");
    }
    gatewayMetadata.bytes = fs.statSync(gatewayUnitPath).size;
    gatewayMetadata.sha256 = sha256File(gatewayUnitPath);

    delete packet.packet_id;
    packet.packet_id = `voidpsa1_${sha256Bytes(canonicalJson(packet))}`;
    fs.writeFileSync(
      packetPath,
      `${JSON.stringify(packet, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    fs.chmodSync(packetPath, 0o600);

    const verified = run(
      process.execPath,
      [CHECKPOINT_VERIFIER, "--packet", output],
      { cwd: ROOT },
    );

    console.log(baseOutput);
    console.log(verified);
    console.log(`${MARKER}_GREEN`);
    console.log(`packet=${output}`);
    console.log(`packet_id=${packet.packet_id}`);
    console.log(`checkpoint_id=${binding.checkpoint_id}`);
    console.log(`checkpoint_manifest_sha256=${binding.manifest_sha256}`);
    console.log(`checkpoint_source_sha=${binding.source_sha}`);
    console.log(`checkpoint_head=${binding.head}`);
    console.log(`checkpoint_segment_count=${binding.segment_count}`);
    console.log(`checkpoint_payload_bytes=${binding.payload_bytes}`);
    console.log("checkpoint_preflight_authority_bound=true");
    console.log("gateway_three_pin_tuple_embedded=true");
    console.log("gateway_loopback_only=true");
    console.log("services_started=false");
    console.log("dns_changed=false");
    console.log("checkpoint_publication_public=false");
    console.log("wallet_authority=false");
    console.log("money_movement_authority=false");
  } catch (error) {
    if (outputCreated && fs.existsSync(output)) {
      fs.rmSync(output, { recursive: true, force: true });
    }
    throw error;
  }
}

try {
  main();
} catch (error) {
  fail(error?.stack || String(error));
}
