#!/usr/bin/env node

import { createHash, createPublicKey } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  VOID_MAINNET0_NAMESPACE_AUTHORITY_KEY_ID,
  VOID_SOVEREIGN_NAME_RECORD_MARKER,
  VOID_SOVEREIGN_NAME_SCHEMA,
  VOID_SOVEREIGN_NAME_SIGNATURE_DOMAIN,
  sovereignNameCanonicalJson,
  sovereignNameRecordSigningBytes,
} from "./lib/void-sovereign-name-layer-v1.mjs";

export const VOID_SOVEREIGN_NAME_SIGNING_REQUEST_MARKER =
  "VOID_SOVEREIGN_NAME_SIGNING_REQUEST_V1";
export const VOID_SOVEREIGN_NAME_SIGNING_REQUEST_SCHEMA =
  "urn:void:schema:sovereign-name-signing-request:1";

const MAINNET_GENESIS_SHA256 =
  "22f42ef6cfa8e4ebfbc5ea98cdc536ec04c1bb4ddb15885b45b1ac02d0f122ab";
const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ONION_PATTERN = /^[a-z2-7]{56}\.onion$/;
const HEX_32 = /^[0-9a-f]{32}$/;
const HEX_64 = /^[0-9a-f]{64}$/;

const RESOLUTION_ONLY_AUTHORITY = Object.freeze({
  name_resolution: true,
  source_origin_trusted: false,
  dns_control_required: false,
  transport_provider_authority: false,
  transaction_submission: false,
  payment_authority: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
  void_settlement: false,
  node_runtime_mutation: false,
  operator_control: false,
  governance_mutation: false,
  fund_movement: false,
});

const REQUEST_AUTHORITY = Object.freeze({
  unsigned_request_creation: true,
  private_key_access: false,
  signature_creation: false,
  live_name_record_creation: false,
  publication: false,
  deployment: false,
  service_restart: false,
  dns_or_tls_mutation: false,
  tailscale_mutation: false,
  node_runtime_mutation: false,
  transaction_submission: false,
  payment_authority: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
  fund_movement: false,
});

export class SovereignNameSigningRequestHold extends Error {
  constructor(message) {
    super(message);
    this.name = "SovereignNameSigningRequestHold";
  }
}

function fail(message) {
  throw new SovereignNameSigningRequestHold(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!isObject(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

function timestamp(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail(`${label} must be canonical ISO-8601`);
  }
  return parsed;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalPublicKey(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  if (!/^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=\n]+\n-----END PUBLIC KEY-----\n$/.test(value)) {
    fail(`${label} must be canonical public-key PEM`);
  }
  let key;
  try {
    key = createPublicKey(value);
  } catch {
    fail(`${label} is not a public key`);
  }
  if (key.asymmetricKeyType !== "ed25519") fail(`${label} is not Ed25519`);
  const canonical = key.export({ type: "spki", format: "pem" }).toString();
  if (canonical !== value) fail(`${label} is not canonical Ed25519 PEM`);
  const der = key.export({ type: "spki", format: "der" });
  return Object.freeze({ pem: canonical, fingerprint: sha256(der) });
}

function canonicalName(value) {
  if (typeof value !== "string" || !value.startsWith("void://")) {
    fail("name must be a canonical void:// name");
  }
  const labels = value.slice("void://".length).split("/");
  if (
    labels.length < 1
    || labels.length > 8
    || labels.some((label) => !LABEL_PATTERN.test(label))
    || `void://${labels.join("/")}` !== value
  ) {
    fail("name must be a canonical void:// name");
  }
  return labels;
}

function canonicalTransport(transport, index, issued, recordExpires) {
  exactKeys(
    transport,
    ["kind", "endpoint", "priority", "expires_at"],
    `input.transports[${index}]`,
  );
  if (!Number.isSafeInteger(transport.priority) || transport.priority < 0) {
    fail("transport priority must be a non-negative safe integer");
  }
  let parsed;
  try {
    parsed = new URL(transport.endpoint);
  } catch {
    fail("transport endpoint must be an absolute URL");
  }
  if (
    parsed.username
    || parsed.password
    || parsed.port
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || parsed.origin !== transport.endpoint
  ) {
    fail("transport endpoint must be a canonical default-port origin");
  }
  if (transport.kind === "https") {
    if (parsed.protocol !== "https:" || parsed.hostname.endsWith(".onion")) {
      fail("HTTPS transport endpoint is invalid");
    }
  } else if (transport.kind === "tor-v3") {
    if (parsed.protocol !== "http:" || !ONION_PATTERN.test(parsed.hostname)) {
      fail("Tor transport endpoint is not a canonical HTTP Tor v3 origin");
    }
  } else {
    fail("transport kind is unsupported");
  }
  const expires = timestamp(transport.expires_at, `input.transports[${index}].expires_at`);
  if (expires.getTime() <= issued.getTime()) fail("transport expires before issuance");
  if (expires.getTime() > recordExpires.getTime()) fail("transport outlives record");
  return Object.freeze({
    kind: transport.kind,
    endpoint: parsed.origin,
    priority: transport.priority,
    expires_at: transport.expires_at,
  });
}

function buildInputFromRequest(request) {
  return {
    name: request.unsigned_record.name.canonical,
    sequence: request.unsigned_record.sequence,
    previous_record_sha256: request.unsigned_record.previous_record_sha256,
    issued_at: request.unsigned_record.issued_at,
    expires_at: request.unsigned_record.expires_at,
    subject: {
      node_id: request.unsigned_record.subject.node_id,
      public_key_pem: request.unsigned_record.subject.public_key_pem,
    },
    transports: structuredClone(request.unsigned_record.transports),
    namespace_authority: structuredClone(request.namespace_authority),
  };
}

export function buildVoidSovereignNameSigningRequest(input, options = {}) {
  exactKeys(input, [
    "name", "sequence", "previous_record_sha256", "issued_at", "expires_at",
    "subject", "transports", "namespace_authority",
  ], "input");
  const labels = canonicalName(input.name);
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1) {
    fail("sequence must be a positive safe integer");
  }
  if (input.sequence === 1) {
    if (input.previous_record_sha256 !== null) {
      fail("sequence 1 must have a null predecessor");
    }
  } else if (
    typeof input.previous_record_sha256 !== "string"
    || !HEX_64.test(input.previous_record_sha256)
  ) {
    fail("updated records require a canonical predecessor SHA-256");
  }
  const issued = timestamp(input.issued_at, "input.issued_at");
  const expires = timestamp(input.expires_at, "input.expires_at");
  if (expires.getTime() <= issued.getTime()) fail("record validity interval is invalid");
  if (expires.getTime() - issued.getTime() > 366 * 24 * 60 * 60 * 1000) {
    fail("record validity exceeds 366 days");
  }

  exactKeys(input.subject, ["node_id", "public_key_pem"], "input.subject");
  if (typeof input.subject.node_id !== "string" || !HEX_32.test(input.subject.node_id)) {
    fail("subject node_id must be 32 lowercase hexadecimal characters");
  }
  const subjectKey = canonicalPublicKey(
    input.subject.public_key_pem,
    "input subject public key",
  );

  exactKeys(
    input.namespace_authority,
    ["key_id", "public_key_pem"],
    "input.namespace_authority",
  );
  const namespaceKey = canonicalPublicKey(
    input.namespace_authority.public_key_pem,
    "input namespace authority public key",
  );
  const namespaceKeyId = `ed25519:${namespaceKey.fingerprint}`;
  const expectedNamespaceKeyId = options.expectedNamespaceAuthorityKeyId
    ?? VOID_MAINNET0_NAMESPACE_AUTHORITY_KEY_ID;
  if (
    input.namespace_authority.key_id !== namespaceKeyId
    || namespaceKeyId !== expectedNamespaceKeyId
  ) {
    fail("namespace authority does not match the pinned VOID root");
  }

  if (!Array.isArray(input.transports) || input.transports.length < 1 || input.transports.length > 8) {
    fail("transports must contain one to eight entries");
  }
  const transports = input.transports.map((transport, index) => (
    canonicalTransport(transport, index, issued, expires)
  ));
  const endpoints = new Set();
  let previousPriority = -1;
  for (const transport of transports) {
    if (transport.priority <= previousPriority) {
      fail("transport priorities must be unique and strictly increasing");
    }
    if (endpoints.has(transport.endpoint)) fail("transport endpoints must be unique");
    previousPriority = transport.priority;
    endpoints.add(transport.endpoint);
  }

  const unsignedRecord = {
    $schema: VOID_SOVEREIGN_NAME_SCHEMA,
    marker: VOID_SOVEREIGN_NAME_RECORD_MARKER,
    version: 1,
    status: "active",
    issued_at: input.issued_at,
    expires_at: input.expires_at,
    sequence: input.sequence,
    previous_record_sha256: input.previous_record_sha256,
    network: {
      name: "VOID Mainnet-0",
      chain_id: 2050,
      identity: "mainnet0",
      genesis_sha256: MAINNET_GENESIS_SHA256,
    },
    namespace: {
      name: "void",
      authority_key_id: namespaceKeyId,
    },
    name: { labels, canonical: input.name },
    subject: {
      identity: `voidid:ed25519:${subjectKey.fingerprint}`,
      node_id: input.subject.node_id,
      key_type: "ed25519",
      key_id: `ed25519:${subjectKey.fingerprint}`,
      public_key_pem: subjectKey.pem,
      public_key_fingerprint_sha256: subjectKey.fingerprint,
    },
    transports,
    authority: structuredClone(RESOLUTION_ONLY_AUTHORITY),
    signature: {
      domain: VOID_SOVEREIGN_NAME_SIGNATURE_DOMAIN,
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: "void-canonical-json-v1",
      key_id: namespaceKeyId,
      value: null,
    },
  };
  const payload = Buffer.from(sovereignNameRecordSigningBytes(unsignedRecord));
  const payloadSha256 = sha256(payload);
  return Object.freeze({
    $schema: VOID_SOVEREIGN_NAME_SIGNING_REQUEST_SCHEMA,
    marker: VOID_SOVEREIGN_NAME_SIGNING_REQUEST_MARKER,
    version: 1,
    status: "unsigned",
    request_id: `voidsnsr1_${payloadSha256}`,
    generated_at: input.issued_at,
    namespace_authority: {
      key_id: namespaceKeyId,
      public_key_pem: namespaceKey.pem,
    },
    unsigned_record: unsignedRecord,
    signing: {
      domain: VOID_SOVEREIGN_NAME_SIGNATURE_DOMAIN,
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: "void-canonical-json-v1",
      key_id: namespaceKeyId,
      payload_sha256: payloadSha256,
      payload_base64: payload.toString("base64"),
    },
    authority: structuredClone(REQUEST_AUTHORITY),
  });
}

export function verifyVoidSovereignNameSigningRequest(request, options = {}) {
  exactKeys(request, [
    "$schema", "marker", "version", "status", "request_id", "generated_at",
    "namespace_authority", "unsigned_record", "signing", "authority",
  ], "request");
  if (
    request.$schema !== VOID_SOVEREIGN_NAME_SIGNING_REQUEST_SCHEMA
    || request.marker !== VOID_SOVEREIGN_NAME_SIGNING_REQUEST_MARKER
    || request.version !== 1
    || request.status !== "unsigned"
  ) {
    fail("request schema, marker, version, or status mismatch");
  }
  exactKeys(request.signing, [
    "domain", "algorithm", "encoding", "canonicalization", "key_id",
    "payload_sha256", "payload_base64",
  ], "request.signing");
  exactKeys(request.authority, Object.keys(REQUEST_AUTHORITY), "request.authority");
  for (const [key, expected] of Object.entries(REQUEST_AUTHORITY)) {
    if (request.authority[key] !== expected) fail(`request authority.${key} mismatch`);
  }
  if (request.generated_at !== request.unsigned_record?.issued_at) {
    fail("request generated_at must equal record issued_at");
  }
  if (request.unsigned_record?.signature?.value !== null) {
    fail("request must not contain a signature value");
  }
  const rebuilt = buildVoidSovereignNameSigningRequest(
    buildInputFromRequest(request),
    options,
  );
  if (sovereignNameCanonicalJson(request) !== sovereignNameCanonicalJson(rebuilt)) {
    fail("request does not match its deterministic signing payload");
  }
  return Object.freeze({
    request_id: rebuilt.request_id,
    canonical_name: rebuilt.unsigned_record.name.canonical,
    subject_identity: rebuilt.unsigned_record.subject.identity,
    subject_node_id: rebuilt.unsigned_record.subject.node_id,
    namespace_authority_key_id: rebuilt.namespace_authority.key_id,
    sequence: rebuilt.unsigned_record.sequence,
    transport_count: rebuilt.unsigned_record.transports.length,
    payload_sha256: rebuilt.signing.payload_sha256,
    private_key_access: false,
    signature_created: false,
  });
}

async function readJson(path, label) {
  let value;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`${label} could not be read as JSON: ${error.message}`);
  }
  return value;
}

async function writeNewJson(path, value) {
  try {
    await access(path, fsConstants.F_OK);
    fail(`refusing to overwrite existing output: ${path}`);
  } catch (error) {
    if (error instanceof SovereignNameSigningRequestHold) throw error;
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx",
    mode: 0o644,
  });
}

async function main(argv) {
  const [command, first, second, ...extra] = argv;
  if (extra.length > 0) fail("too many arguments");
  if (command === "build" && first && second) {
    const request = buildVoidSovereignNameSigningRequest(
      await readJson(first, "input"),
    );
    await writeNewJson(second, request);
    const summary = verifyVoidSovereignNameSigningRequest(request);
    console.log(VOID_SOVEREIGN_NAME_SIGNING_REQUEST_MARKER);
    console.log(`request_id=${summary.request_id}`);
    console.log(`canonical_name=${summary.canonical_name}`);
    console.log(`subject_identity=${summary.subject_identity}`);
    console.log(`payload_sha256=${summary.payload_sha256}`);
    console.log("private_key_access=false");
    console.log("signature_created=false");
    console.log(`output=${second}`);
    return;
  }
  if (command === "verify" && first && !second) {
    const summary = verifyVoidSovereignNameSigningRequest(
      await readJson(first, "request"),
    );
    console.log("VOID_SOVEREIGN_NAME_SIGNING_REQUEST_V1_VERIFIED");
    for (const [key, value] of Object.entries(summary)) {
      console.log(`${key}=${value}`);
    }
    return;
  }
  fail(
    "usage: void-sovereign-name-signing-request-v1.mjs "
      + "build <input.json> <request.json> | verify <request.json>",
  );
}

const direct = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
