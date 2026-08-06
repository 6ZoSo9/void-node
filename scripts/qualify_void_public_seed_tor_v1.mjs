#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  canonicalJson,
  httpGetViaSocks,
  validateOnionHostname,
} from "../tools/void-tor-agent-access-client-v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_TOR_QUALIFICATION_V1";
const RECEIPT_SCHEMA = "void_public_seed_tor_qualification_v1";
const AUTHORITY = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});

function fail(message) {
  throw new Error(String(message));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function positiveInteger(value, label, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    fail(`${label} must be an integer from ${minimum} through ${maximum}`);
  }
  return number;
}

function exactObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function parseJsonResponse(response, label) {
  if (response.status !== 200) fail(`${label} returned HTTP ${response.status}`);
  if (String(response.headers?.["x-void-public-seed-gateway"] || "") !== "v1") {
    fail(`${label} is missing x-void-public-seed-gateway: v1`);
  }
  if (!String(response.headers?.["content-type"] || "").toLowerCase().startsWith("application/json")) {
    fail(`${label} is not application/json`);
  }
  if (response.socks?.remote_dns !== true || response.socks?.address_type !== "domain") {
    fail(`${label} did not use SOCKS5 domain addressing with remote name resolution`);
  }
  let value;
  try {
    value = JSON.parse(response.body.toString("utf8"));
  } catch (error) {
    fail(`${label} is malformed JSON: ${error?.message || error}`);
  }
  return value;
}

function blockNumber(block) {
  const candidate = block?.number ?? block?.header?.number;
  const number = Number(candidate);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function validateObservationV1({ onionHostname, readyResponse, headResponse, rangeResponse, observedAt }) {
  const ready = exactObject(parseJsonResponse(readyResponse, "Tor seed readiness"), "Tor seed readiness");
  if (ready.ready !== true || Number(ready.gap) !== 0 || Number(ready.txroot_live) !== 1) {
    fail("Tor seed readiness is not exact-green");
  }
  const readyHead = positiveInteger(ready.head, "Tor seed readiness head");
  const latest = exactObject(parseJsonResponse(headResponse, "Tor seed latest head"), "Tor seed latest head");
  const latestHead = positiveInteger(latest.number ?? latest.head, "Tor seed latest head");
  if (readyHead !== latestHead) fail("Tor seed readiness and latest head disagree");
  const range = parseJsonResponse(rangeResponse, "Tor seed range");
  const blocks = Array.isArray(range) ? range : Array.isArray(range.blocks) ? range.blocks : null;
  if (!blocks || blocks.length !== 1 || blockNumber(blocks[0]) !== latestHead) {
    fail("Tor seed range does not contain the exact qualified head");
  }
  for (const response of [readyResponse, headResponse, rangeResponse]) {
    if (response.socks.requested_hostname !== onionHostname) fail("SOCKS requested hostname mismatch");
  }
  const time = new Date(observedAt);
  if (!Number.isFinite(time.getTime()) || time.toISOString() !== observedAt) fail("observation timestamp is not canonical");
  return Object.freeze({ observed_at: observedAt, head: latestHead });
}

export function buildTorQualificationReceiptV1({ sourceSha, onionHostname, virtualPort, socksHost, socksPort, observations }) {
  if (!/^[0-9a-f]{40}$/.test(String(sourceSha))) fail("source SHA must be 40 lowercase hexadecimal characters");
  const onion = validateOnionHostname(onionHostname);
  const virtual = positiveInteger(virtualPort, "virtual port", 1, 65535);
  if (!["127.0.0.1", "::1"].includes(String(socksHost))) fail("SOCKS host must be numeric loopback");
  const socks = positiveInteger(socksPort, "SOCKS port", 1, 65535);
  if (!Array.isArray(observations) || observations.length < 3 || observations.length > 12) {
    fail("qualification requires from three through twelve observations");
  }
  let previousTime = 0;
  let previousHead = 0;
  for (const [index, observation] of observations.entries()) {
    exactObject(observation, `observation ${index + 1}`);
    const time = Date.parse(String(observation.observed_at));
    const head = positiveInteger(observation.head, `observation ${index + 1} head`);
    if (!Number.isFinite(time) || new Date(time).toISOString() !== observation.observed_at) fail("observation timestamp is invalid");
    if (time <= previousTime) fail("qualification observations are not strictly ordered");
    if (index > 0 && head < previousHead) fail("Tor seed head regressed during qualification");
    previousTime = time;
    previousHead = head;
  }
  const span = Date.parse(observations.at(-1).observed_at) - Date.parse(observations[0].observed_at);
  if (span < 60_000 || span > 30 * 60_000) fail("qualification observation span must be from one through thirty minutes");
  const body = {
    schema: RECEIPT_SCHEMA,
    generated_at: new Date().toISOString(),
    source_sha: sourceSha,
    transport: {
      protocol: "tor-v3",
      onion_hostname: onion,
      virtual_port: virtual,
      socks_proxy: { host: socksHost, port: socks },
      socks_remote_dns: true,
      dns_required: false,
      registrar_required: false,
      certificate_authority_required: false,
      cloud_account_required: false,
      tailnet_required: false,
    },
    sample_count: observations.length,
    first_observed_at: observations[0].observed_at,
    last_observed_at: observations.at(-1).observed_at,
    minimum_head: Math.min(...observations.map((item) => item.head)),
    maximum_head: Math.max(...observations.map((item) => item.head)),
    observations: structuredClone(observations),
    gateway_contract: {
      identity_header: "x-void-public-seed-gateway: v1",
      ready: true,
      gap: 0,
      txroot_live: 1,
      exact_head_range: true,
      private_mutation_routes_exposed: false,
    },
    manifest_published: false,
    authority: AUTHORITY,
  };
  return Object.freeze({
    ...body,
    qualification_id: `voidptq1_${sha256(Buffer.from(canonicalJson(body), "utf8"))}`,
  });
}

function profile({ onionHostname, virtualPort, socksHost, socksPort, timeoutMs, maxBytes }) {
  return {
    transport: {
      onion_hostname: validateOnionHostname(onionHostname),
      virtual_port: positiveInteger(virtualPort, "virtual port", 1, 65535),
      socks_proxy: { host: socksHost, port: positiveInteger(socksPort, "SOCKS port", 1, 65535) },
    },
    limits: {
      connect_timeout_ms: timeoutMs,
      request_timeout_ms: timeoutMs,
      max_response_bytes: maxBytes,
      request_attempts: 2,
      retry_delay_ms: 250,
    },
  };
}

export async function qualifyTorSeedV1(options) {
  const request = options.request || httpGetViaSocks;
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const clock = options.clock || (() => new Date().toISOString());
  const configured = profile(options);
  const observations = [];
  for (let index = 0; index < options.samples; index += 1) {
    const readyResponse = await request(configured, "/__void/ready.json");
    const ready = JSON.parse(readyResponse.body.toString("utf8"));
    const head = positiveInteger(ready.head, "Tor seed readiness head");
    const headResponse = await request(configured, "/blocks/latest/number2.json");
    const rangeResponse = await request(configured, `/blocks/range?from=${head}&to=${head}`);
    observations.push(validateObservationV1({
      onionHostname: configured.transport.onion_hostname,
      readyResponse,
      headResponse,
      rangeResponse,
      observedAt: clock(),
    }));
    if (index + 1 < options.samples) await sleep(options.intervalMs);
  }
  return buildTorQualificationReceiptV1({
    sourceSha: options.sourceSha,
    onionHostname: configured.transport.onion_hostname,
    virtualPort: configured.transport.virtual_port,
    socksHost: configured.transport.socks_proxy.host,
    socksPort: configured.transport.socks_proxy.port,
    observations,
  });
}

function parseArgs(argv) {
  const values = { samples: 3, intervalMs: 30_000, timeoutMs: 20_000, maxBytes: 64 * 1024 * 1024 };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) fail(`invalid argument near ${key || "end"}`);
    values[key.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
  }
  for (const key of ["onionHostname", "sourceSha", "socksHost", "socksPort", "virtualPort", "output"]) {
    if (!values[key]) fail(`missing --${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  }
  values.samples = positiveInteger(values.samples, "samples", 3, 12);
  values.intervalMs = positiveInteger(values.intervalMs, "interval ms", 20_000, 10 * 60_000);
  values.timeoutMs = positiveInteger(values.timeoutMs, "timeout ms", 1_000, 120_000);
  values.maxBytes = positiveInteger(values.maxBytes, "max bytes", 64 * 1024, 128 * 1024 * 1024);
  return values;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const output = path.resolve(options.output);
  if (fs.existsSync(output)) fail("qualification output already exists");
  const receipt = await qualifyTorSeedV1(options);
  fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  console.log(`${MARKER}_GREEN`);
  console.log(`qualification_id=${receipt.qualification_id}`);
  console.log(`onion_hostname=${receipt.transport.onion_hostname}`);
  console.log(`qualified_head=${receipt.maximum_head}`);
  console.log(`output=${output}`);
  console.log("socks_remote_dns=true");
  console.log("dns_required=false");
  console.log("registrar_required=false");
  console.log("certificate_authority_required=false");
  console.log("cloud_account_required=false");
  console.log("tailnet_required=false");
  console.log("manifest_published=false");
  console.log("money_movement_authority=false");
}

const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invoked) {
  main().catch((error) => {
    console.error(`${MARKER}_FAIL: ${error?.stack || error}`);
    process.exit(1);
  });
}
