#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1,
  buildVoidPublicOriginBindingActivationPacketV1,
} from "./void-public-origin-binding-activation-packet-v1.mjs";

export const VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1 =
  "VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1";
export const VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1 =
  "void-public-seed-gateway-v1.service";
export const VOID_PUBLIC_ORIGIN_BINDING_SEED_GATEWAY_PORT_V1 = 4111;
export const VOID_PUBLIC_ORIGIN_BINDING_SEED_DROPIN_V1 =
  "95-void-public-origin-binding-v1.conf";

const PACKET_MAX_BYTES = 512 * 1024;
const CLEAN_MAX_BYTES = 1024 * 1024;
const ENV_KEYS = Object.freeze([
  "VOID_PUBLIC_ORIGIN_BINDING_FILE",
  "VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN",
  "VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID",
]);

function fail(message) { throw new Error(message); }
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON cannot contain non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  fail(`canonical JSON cannot contain ${typeof value}`);
}
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }

function readDirect(file, label, maximumBytes, mode600 = false) {
  if (typeof file !== "string" || !path.isAbsolute(file)) {
    fail(`${label} must be an absolute path`);
  }
  let canonical;
  try { canonical = fs.realpathSync.native(file); }
  catch (error) { fail(`${label} could not be canonicalized: ${error.message}`); }
  if (canonical !== file) fail(`${label} must not traverse symlinks or path aliases`);
  const st = fs.lstatSync(canonical, { bigint: true });
  if (!st.isFile() || st.isSymbolicLink()) {
    fail(`${label} must be a regular non-symlink file`);
  }
  if (mode600 && (Number(st.mode) & 0o777) !== 0o600) {
    fail(`${label} must have mode 0600`);
  }
  if (st.size < 1n || st.size > BigInt(maximumBytes)) {
    fail(`${label} size is invalid`);
  }

  const fd = fs.openSync(
    canonical,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      BigInt(bytes.length) !== before.size
    ) {
      fail(`${label} changed during read`);
    }
    return Object.freeze({
      file: canonical,
      bytes,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function readJson(file, label, maximumBytes) {
  const loaded = readDirect(file, label, maximumBytes, true);
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(loaded.bytes); }
  catch { fail(`${label} is not valid UTF-8`); }
  let value;
  try { value = JSON.parse(text); }
  catch { fail(`${label} is not valid JSON`); }
  return Object.freeze({ ...loaded, value });
}

function serviceDirectives(text) {
  let section = "";
  let pending = "";
  const out = [];
  for (const raw of String(text).split(/\r?\n/u)) {
    let line = raw.replace(/\s+$/u, "");
    if (pending) {
      line = pending + line.replace(/^\s+/u, "");
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
  if (pending) fail("clean-environment source has unterminated continuation");
  return out;
}

function inspectCleanEnvironment(file) {
  const loaded = readDirect(file, "clean-environment drop-in", CLEAN_MAX_BYTES, true);
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(loaded.bytes); }
  catch { fail("clean-environment drop-in is not valid UTF-8"); }

  const directives = serviceDirectives(text);
  const env = directives.filter(([key]) => key === "Environment");
  const unset = directives.filter(([key]) => key === "UnsetEnvironment");
  const other = directives.filter(
    ([key]) => key !== "Environment" && key !== "UnsetEnvironment",
  );
  if (env.length !== 0 || other.length !== 0 || unset.length > 1) {
    fail("clean-environment drop-in is outside narrow UnsetEnvironment contract");
  }

  const names = [];
  if (unset.length === 1) {
    const value = unset[0][1];
    if (value && /["'\\]/u.test(value)) {
      fail("clean-environment UnsetEnvironment must use plain bare names");
    }
    for (const name of value.split(/\s+/u).filter(Boolean)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name) || names.includes(name)) {
        fail("clean-environment variable-name set is invalid");
      }
      names.push(name);
    }
  }
  for (const key of ENV_KEYS) {
    if (names.includes(key)) {
      fail(`clean-environment drop-in unsets required binding variable ${key}`);
    }
  }

  return Object.freeze({
    file: loaded.file,
    sha256: loaded.sha256,
    mode: "0600",
    unset_count: names.length,
    binding_variables_unset: false,
    unset_names_sha256: sha256(Buffer.from(`${names.join("\n")}\n`, "utf8")),
  });
}

function portableValue(name, value) {
  const text = String(value);
  if (!text || /[\0\r\n%]/u.test(text) || !/^[A-Za-z0-9_./:+@-]+$/u.test(text)) {
    fail(`${name} is not portable as a narrow systemd Environment value`);
  }
  return text;
}

function renderDropin(environment) {
  const actual = Object.keys(environment || {}).sort();
  const expected = [...ENV_KEYS].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("activation packet environment key set mismatch");
  }
  return [
    "[Service]",
    "# Managed by VOID public-origin binding seed-service plan v1.",
    ...ENV_KEYS.map(
      (key) => `Environment=${key}=${portableValue(key, environment[key])}`,
    ),
    "",
  ].join("\n");
}

function preflightOutput(file) {
  if (typeof file !== "string" || !path.isAbsolute(file) || path.resolve(file) !== file) {
    fail("output path must be an absolute canonical path");
  }
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("output parent must not traverse symlinks or path aliases");
  }
  try {
    fs.lstatSync(file);
    fail("refusing to overwrite existing output");
  } catch (error) {
    if (error?.message === "refusing to overwrite existing output") throw error;
    if (error?.code !== "ENOENT") throw error;
  }
  return file;
}

function writePrivateJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({ sha256: sha256(bytes) });
  } finally {
    fs.closeSync(fd);
  }
}

export function buildVoidPublicOriginBindingSeedServicePlanV1({
  activationPacketFile,
  cleanEnvironmentDropin,
  nowMs = Date.now(),
  rebuildActivationPacket = buildVoidPublicOriginBindingActivationPacketV1,
} = {}) {
  if (typeof rebuildActivationPacket !== "function") {
    fail("activation packet verifier is unavailable");
  }
  if (!Number.isFinite(nowMs)) fail("plan verification time is invalid");

  const loaded = readJson(
    activationPacketFile,
    "activation packet",
    PACKET_MAX_BYTES,
  );
  const packet = loaded.value;
  if (
    packet?.marker !== VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1 ||
    packet?.version !== 1 ||
    packet?.status !==
      "verified_signed_binding_ready_for_operator_installation" ||
    typeof packet?.binding?.file !== "string"
  ) {
    fail("activation packet identity mismatch");
  }

  const rebuilt = rebuildActivationPacket({
    bindingFile: packet.binding.file,
    nowMs,
  });
  if (canonicalJson(packet) !== canonicalJson(rebuilt)) {
    fail("activation packet differs from fresh signed-binding verification");
  }

  const clean = inspectCleanEnvironment(cleanEnvironmentDropin);
  const dropinText = renderDropin(packet.environment);
  const dropinBytes = Buffer.from(dropinText, "utf8");
  const body = {
    marker: VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1,
    version: 1,
    status: "source_only_seed_gateway_environment_plan",
    activation_packet: {
      file: loaded.file,
      sha256: loaded.sha256,
      binding_file: packet.binding.file,
      binding_artifact_sha256: packet.binding.artifact_sha256,
      binding_sha256: packet.binding.binding_sha256,
      expires_at: packet.binding.expires_at,
    },
    target: {
      unit: VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_UNIT_V1,
      bind: "127.0.0.1",
      port: VOID_PUBLIC_ORIGIN_BINDING_SEED_GATEWAY_PORT_V1,
      dropin_name: VOID_PUBLIC_ORIGIN_BINDING_SEED_DROPIN_V1,
      daemon_reload_required_after_install: true,
      gateway_restart_required_after_install: true,
      named_tunnel_restart_required: false,
    },
    clean_environment: clean,
    environment: packet.environment,
    dropin: {
      mode: "0600",
      bytes: dropinBytes.length,
      sha256: sha256(dropinBytes),
      text: dropinText,
    },
    authority: {
      source_only_plan: true,
      dropin_write: false,
      daemon_reload: false,
      service_enable: false,
      service_start: false,
      service_restart: false,
      tunnel_mutation: false,
      dns_or_tls_mutation: false,
      private_key_access: false,
      wallet_or_signer_access: false,
      signature_creation: false,
      node_runtime_mutation: false,
      work_credit_mutation: false,
      transaction_submission: false,
      validator_mutation: false,
      funds_movement: false,
    },
  };
  return Object.freeze({
    ...body,
    plan_id:
      "voidpobssp1_" + sha256(Buffer.from(canonicalJson(body), "utf8")),
  });
}

export function writeVoidPublicOriginBindingSeedServicePlanV1({
  activationPacketFile,
  cleanEnvironmentDropin,
  outputFile,
  nowMs = Date.now(),
  rebuildActivationPacket = buildVoidPublicOriginBindingActivationPacketV1,
} = {}) {
  const output = preflightOutput(outputFile);
  const plan = buildVoidPublicOriginBindingSeedServicePlanV1({
    activationPacketFile,
    cleanEnvironmentDropin,
    nowMs,
    rebuildActivationPacket,
  });
  const written = writePrivateJson(output, plan);
  return Object.freeze({
    plan,
    artifact_sha256: written.sha256,
    output_mode: "0600",
  });
}

function parseArgs(argv) {
  const options = {
    command: argv[0] || "",
    activationPacketFile: "",
    cleanEnvironmentDropin: "",
    outputFile: "",
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value for ${argument}`);
      return argv[index];
    };
    if (argument === "--activation-packet") {
      options.activationPacketFile = next();
    } else if (argument === "--clean-environment-dropin") {
      options.cleanEnvironmentDropin = next();
    } else if (argument === "--output") {
      options.outputFile = next();
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function usage() {
  console.log(
    "usage: node tools/void-public-origin-binding-seed-service-plan-v1.mjs build " +
      "--activation-packet /absolute/activation-packet.json " +
      "--clean-environment-dropin /absolute/90-void-nullfeed-clean-environment.conf " +
      "--output /absolute/seed-service-plan.json",
  );
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (direct) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (
      options.command === "help" ||
      options.command === "--help" ||
      options.command === "-h"
    ) {
      usage();
    } else if (options.command === "build") {
      if (
        !options.activationPacketFile ||
        !options.cleanEnvironmentDropin ||
        !options.outputFile
      ) {
        fail(
          "build requires --activation-packet, --clean-environment-dropin, and --output",
        );
      }
      const result = writeVoidPublicOriginBindingSeedServicePlanV1({
        activationPacketFile: options.activationPacketFile,
        cleanEnvironmentDropin: options.cleanEnvironmentDropin,
        outputFile: options.outputFile,
      });
      console.log(VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1);
      console.log(`plan_id=${result.plan.plan_id}`);
      console.log(`target_unit=${result.plan.target.unit}`);
      console.log(`target_port=${result.plan.target.port}`);
      console.log(`dropin_sha256=${result.plan.dropin.sha256}`);
      console.log("dropin_write=false");
      console.log("daemon_reload=false");
      console.log("service_restart=false");
      console.log("private_key_access=false");
      console.log("signature_creation=false");
      console.log("runtime_mutation=false");
    } else {
      usage();
      fail("unknown command");
    }
  } catch (error) {
    console.error("VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_PLAN_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
