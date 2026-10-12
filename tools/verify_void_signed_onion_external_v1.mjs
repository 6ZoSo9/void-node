#!/usr/bin/env node
import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify as cryptoVerify,
} from "node:crypto";
import { readFileSync } from "node:fs";

const DOMAIN = "VOID_NODE_ONION_BINDING_V1";
const BINDING_MARKER = "VOID_NODE_ONION_BINDING_V1";
const DESCRIPTOR_MARKER = "VOID_TOR_ONION_TRANSPORT_V1";
const BINDING_PATHS = Object.freeze([
  "/.well-known/void-node-onion-binding-v1.json",
  "/public-node/transports/tor-v1-binding.json",
]);
const DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-tor-onion-transport-v1.json",
  "/public-node/transports/tor-v1.json",
]);
const AUTHORITY = Object.freeze({
  read_only: true,
  transaction_submission: false,
  p2p_listener: false,
  mcp_listener: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
  void_settlement: false,
  node_runtime_mutation: false,
  operator_control: false,
});
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
const BASE32_LOOKUP = new Map([...BASE32].map((value, index) => [value, index]));

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) fail(`unexpected argument: ${argument}`);
    const key = argument.slice(2);
    index += 1;
    if (index >= argv.length) fail(`missing value for --${key}`);
    values[key] = argv[index];
  }
  for (const required of [
    "binding-a",
    "binding-b",
    "descriptor-a",
    "descriptor-b",
    "expected-node-id",
    "expected-onion-hostname",
    "expected-binding-sha256",
    "expected-public-key-fingerprint",
    "expected-expires-at",
  ]) {
    if (!values[required]) fail(`missing --${required}`);
  }
  return values;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch: expected=${wanted.join(",")} actual=${actual.join(",")}`);
  }
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!isPlainObject(value)) fail("canonical JSON accepts plain objects only");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function unsignedBindingBytes(bindingValue) {
  const clone = structuredClone(bindingValue);
  if (!isPlainObject(clone.signature)) fail("signature must be an object");
  delete clone.signature.value;
  return Buffer.concat([
    Buffer.from(DOMAIN, "utf8"),
    Buffer.from([0]),
    Buffer.from(canonicalJson(clone), "utf8"),
  ]);
}

function decodeBase32(value) {
  let accumulator = 0;
  let bits = 0;
  const output = [];
  for (const character of value) {
    const decoded = BASE32_LOOKUP.get(character);
    if (decoded === undefined) fail(`invalid base32 character: ${character}`);
    accumulator = accumulator * 32 + decoded;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      const divisor = 2 ** bits;
      output.push(Math.floor(accumulator / divisor) & 0xff);
      accumulator %= divisor;
    }
  }
  if (bits > 0 && accumulator !== 0) fail("non-zero onion base32 padding bits");
  return Buffer.from(output);
}

function validateOnionHostname(value) {
  const hostname = String(value || "").toLowerCase();
  if (!/^[a-z2-7]{56}\.onion$/.test(hostname)) {
    fail("onion hostname is not a v3 address");
  }
  const payload = decodeBase32(hostname.slice(0, -6));
  if (payload.length !== 35 || payload[34] !== 3) {
    fail("onion v3 payload is invalid");
  }
  const publicKey = payload.subarray(0, 32);
  const checksum = payload.subarray(32, 34);
  const expected = createHash("sha3-256")
    .update(Buffer.from(".onion checksum", "ascii"))
    .update(publicKey)
    .update(Buffer.from([3]))
    .digest()
    .subarray(0, 2);
  if (!timingSafeEqual(checksum, expected)) fail("onion v3 checksum mismatch");
  return hostname;
}

function canonicalTimestamp(value, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    fail(`${label} is not canonical ISO-8601`);
  }
  return date;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function loadJsonPair(pathA, pathB, label) {
  const bytesA = readFileSync(pathA);
  const bytesB = readFileSync(pathB);
  if (bytesA.length !== bytesB.length || !timingSafeEqual(bytesA, bytesB)) {
    fail(`${label} aliases are not byte-identical`);
  }
  let value;
  try {
    value = JSON.parse(bytesA.toString("utf8"));
  } catch {
    fail(`${label} is not valid JSON`);
  }
  return { bytes: bytesA, value };
}

function verifyBinding(binding, options) {
  exactKeys(binding, [
    "marker", "version", "status", "issued_at", "expires_at",
    "node", "transport", "surface", "authority", "signature",
  ], "binding");
  if (binding.marker !== BINDING_MARKER || binding.version !== 1 || binding.status !== "active") {
    fail("binding marker, version, or status is invalid");
  }

  exactKeys(binding.node, [
    "node_id", "key_type", "public_key_pem",
    "public_key_fingerprint_sha256", "node_id_attestation",
  ], "binding.node");
  exactKeys(binding.transport, [
    "protocol", "onion_hostname", "uri", "virtual_port", "address_role",
  ], "binding.transport");
  exactKeys(binding.surface, [
    "id", "methods", "binding_paths", "descriptor_paths",
  ], "binding.surface");
  exactKeys(binding.authority, Object.keys(AUTHORITY), "binding.authority");
  exactKeys(binding.signature, [
    "domain", "algorithm", "encoding", "canonicalization", "value",
  ], "binding.signature");

  if (binding.node.node_id !== options.expectedNodeId) fail("binding node_id mismatch");
  if (binding.node.key_type !== "ed25519") fail("binding key_type is not Ed25519");
  if (binding.node.node_id_attestation !== "signed-by-existing-void-node-key-v1") {
    fail("binding node_id attestation profile is invalid");
  }

  let publicKey;
  try {
    publicKey = createPublicKey(binding.node.public_key_pem);
  } catch {
    fail("binding public key PEM is invalid");
  }
  if (publicKey.type !== "public" || publicKey.asymmetricKeyType !== "ed25519") {
    fail("binding public key is not Ed25519");
  }
  const canonicalPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  if (canonicalPem !== binding.node.public_key_pem) fail("binding public key PEM is not canonical");
  const fingerprint = sha256(publicKey.export({ type: "spki", format: "der" }));
  if (
    fingerprint !== binding.node.public_key_fingerprint_sha256
    || fingerprint !== options.expectedFingerprint
  ) {
    fail("binding public-key fingerprint mismatch");
  }

  const hostname = validateOnionHostname(binding.transport.onion_hostname);
  if (hostname !== options.expectedOnionHostname) fail("binding onion hostname mismatch");
  if (
    binding.transport.protocol !== "tor-v3"
    || binding.transport.virtual_port !== 80
    || binding.transport.uri !== `http://${hostname}`
    || binding.transport.address_role !== "transport-endpoint"
  ) {
    fail("binding transport profile is invalid");
  }

  if (
    binding.surface.id !== "void-public-node-static-read-only-v1"
    || JSON.stringify(binding.surface.methods) !== JSON.stringify(["GET", "HEAD"])
    || JSON.stringify(binding.surface.binding_paths) !== JSON.stringify(BINDING_PATHS)
    || JSON.stringify(binding.surface.descriptor_paths) !== JSON.stringify(DESCRIPTOR_PATHS)
  ) {
    fail("binding public surface profile is invalid");
  }
  for (const [key, expected] of Object.entries(AUTHORITY)) {
    if (binding.authority[key] !== expected) fail(`binding authority.${key} mismatch`);
  }

  if (
    binding.signature.domain !== DOMAIN
    || binding.signature.algorithm !== "ed25519"
    || binding.signature.encoding !== "base64"
    || binding.signature.canonicalization !== "void-canonical-json-v1"
  ) {
    fail("binding signature profile is invalid");
  }
  const signature = Buffer.from(String(binding.signature.value || ""), "base64");
  if (signature.length !== 64 || signature.toString("base64") !== binding.signature.value) {
    fail("binding signature is not canonical 64-byte base64");
  }
  if (!cryptoVerify(null, unsignedBindingBytes(binding), publicKey, signature)) {
    fail("binding Ed25519 signature verification failed");
  }

  const issued = canonicalTimestamp(binding.issued_at, "binding.issued_at");
  const expires = canonicalTimestamp(binding.expires_at, "binding.expires_at");
  if (binding.expires_at !== options.expectedExpiresAt) fail("binding expiry mismatch");
  if (expires.getTime() <= Date.now()) fail("binding is expired");
  if (expires.getTime() <= issued.getTime()) fail("binding validity interval is invalid");
  if (expires.getTime() - issued.getTime() > 366 * 24 * 60 * 60 * 1000) {
    fail("binding validity exceeds 366 days");
  }

  return {
    nodeId: binding.node.node_id,
    fingerprint,
    onionHostname: hostname,
    issuedAt: binding.issued_at,
    expiresAt: binding.expires_at,
  };
}

function verifyDescriptor(descriptor, bindingSummary, options) {
  exactKeys(descriptor, [
    "marker", "version", "status", "generated_at",
    "transport", "surface", "identity", "authority",
  ], "descriptor");
  if (
    descriptor.marker !== DESCRIPTOR_MARKER
    || descriptor.version !== 1
    || descriptor.status !== "active"
  ) {
    fail("descriptor marker, version, or status is invalid");
  }
  canonicalTimestamp(descriptor.generated_at, "descriptor.generated_at");

  exactKeys(descriptor.transport, [
    "protocol", "uri", "onion_hostname", "virtual_port", "address_role",
  ], "descriptor.transport");
  const hostname = validateOnionHostname(descriptor.transport.onion_hostname);
  if (
    hostname !== options.expectedOnionHostname
    || descriptor.transport.protocol !== "tor-v3"
    || descriptor.transport.uri !== `http://${hostname}`
    || descriptor.transport.virtual_port !== 80
    || descriptor.transport.address_role !== "transport-endpoint"
  ) {
    fail("descriptor transport profile is invalid");
  }

  exactKeys(descriptor.surface, [
    "id", "methods", "descriptor_paths", "local_target",
  ], "descriptor.surface");
  if (
    descriptor.surface.id !== "void-public-node-static-read-only-v1"
    || JSON.stringify(descriptor.surface.methods) !== JSON.stringify(["GET", "HEAD"])
    || JSON.stringify(descriptor.surface.descriptor_paths) !== JSON.stringify(DESCRIPTOR_PATHS)
    || descriptor.surface.local_target !== "http://127.0.0.1:18088"
  ) {
    fail("descriptor surface profile is invalid");
  }

  exactKeys(descriptor.identity, [
    "canonical_void_node_identity",
    "signed_void_node_binding",
    "tor_self_authentication",
    "binding_status",
    "node_id",
    "key_type",
    "public_key_fingerprint_sha256",
    "issued_at",
    "expires_at",
    "binding_paths",
  ], "descriptor.identity");
  if (
    descriptor.identity.canonical_void_node_identity !== true
    || descriptor.identity.signed_void_node_binding !== true
    || descriptor.identity.tor_self_authentication !== true
    || descriptor.identity.binding_status !== "signed-node-to-onion-v1"
    || descriptor.identity.node_id !== bindingSummary.nodeId
    || descriptor.identity.key_type !== "ed25519"
    || descriptor.identity.public_key_fingerprint_sha256 !== bindingSummary.fingerprint
    || descriptor.identity.issued_at !== bindingSummary.issuedAt
    || descriptor.identity.expires_at !== bindingSummary.expiresAt
    || JSON.stringify(descriptor.identity.binding_paths) !== JSON.stringify(BINDING_PATHS)
  ) {
    fail("descriptor signed identity profile is invalid");
  }

  exactKeys(descriptor.authority, Object.keys(AUTHORITY), "descriptor.authority");
  for (const [key, expected] of Object.entries(AUTHORITY)) {
    if (descriptor.authority[key] !== expected) fail(`descriptor authority.${key} mismatch`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const bindingPair = loadJsonPair(args["binding-a"], args["binding-b"], "binding");
  const descriptorPair = loadJsonPair(args["descriptor-a"], args["descriptor-b"], "descriptor");

  const bindingSha = sha256(bindingPair.bytes);
  if (bindingSha !== args["expected-binding-sha256"]) {
    fail(`binding body SHA mismatch: expected=${args["expected-binding-sha256"]} actual=${bindingSha}`);
  }

  const options = {
    expectedNodeId: args["expected-node-id"],
    expectedOnionHostname: args["expected-onion-hostname"],
    expectedFingerprint: args["expected-public-key-fingerprint"],
    expectedExpiresAt: args["expected-expires-at"],
  };
  const bindingSummary = verifyBinding(bindingPair.value, options);
  verifyDescriptor(descriptorPair.value, bindingSummary, options);

  const summary = {
    marker: "VOID_SIGNED_ONION_EXTERNAL_CRYPTO_VERIFY_V1",
    status: "green",
    node_id: bindingSummary.nodeId,
    onion_hostname: bindingSummary.onionHostname,
    binding_sha256: bindingSha,
    descriptor_sha256: sha256(descriptorPair.bytes),
    public_key_fingerprint_sha256: bindingSummary.fingerprint,
    issued_at: bindingSummary.issuedAt,
    expires_at: bindingSummary.expiresAt,
    ed25519_signature_verified: true,
    onion_v3_checksum_verified: true,
    alias_bodies_identical: true,
    read_only: true,
  };
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

try {
  main();
} catch (error) {
  console.error(`VOID_SIGNED_ONION_EXTERNAL_CRYPTO_VERIFY_V1_FAIL`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
