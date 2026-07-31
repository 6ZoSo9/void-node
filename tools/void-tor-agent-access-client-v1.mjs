#!/usr/bin/env node

import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify as cryptoVerify,
} from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { pathToFileURL } from "node:url";

const PROFILE_MARKER = "VOID_TOR_AGENT_ACCESS_CLIENT_PROFILE_V1";
const RECEIPT_MARKER = "VOID_TOR_AGENT_ACCESS_CLIENT_V1_RECEIPT";
const BINDING_DOMAIN = "VOID_NODE_ONION_BINDING_V1";
const BINDING_MARKER = "VOID_NODE_ONION_BINDING_V1";
const DESCRIPTOR_MARKER = "VOID_TOR_ONION_TRANSPORT_V1";
const MCP_DESCRIPTOR_MARKER = "VOID_TOR_AGENT_MCP_READONLY_V1";
const ORDER_STATUS_SURFACE_MARKER = "VOID_TOR_ORDER_STATUS_READONLY_V1";
const BINDING_PATHS = Object.freeze([
  "/.well-known/void-node-onion-binding-v1.json",
  "/public-node/transports/tor-v1-binding.json",
]);
const DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-tor-onion-transport-v1.json",
  "/public-node/transports/tor-v1.json",
]);
const MCP_DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-agent-mcp-onion-v1.json",
  "/public-node/agents/mcp-tor-v1.json",
]);
const ORDER_STATUS_DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-order-status-onion-v1.json",
  "/public-node/agents/order-status-tor-v1.json",
]);
const ORDER_STATUS_PATH_TEMPLATE =
  "/public-agent/services/v1/orders/:submission_id/status.json";
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
const MCP_AUTHORITY = Object.freeze({
  read_only: true,
  paid_work_submission: false,
  buy_void_fulfillment: false,
  work_credit_write: false,
  datanet_write: false,
  wallet_or_signer_access: false,
  node_runtime_mutation: false,
  operator_control: false,
});
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
const BASE32_LOOKUP = new Map([...BASE32].map((value, index) => [value, index]));
const LOOPBACK_PROXY_HOSTS = new Set(["127.0.0.1", "::1"]);
const MAX_HEADER_BYTES = 64 * 1024;

export class Hold extends Error {
  constructor(message) {
    super(message);
    this.name = "Hold";
  }
}

export class TransportError extends Hold {
  constructor(message) {
    super(message);
    this.name = "TransportError";
  }
}

function fail(message) {
  throw new Hold(message);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireObject(value, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  return value;
}

function exactKeys(value, expected, label) {
  requireObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch: expected=${wanted.join(",")} actual=${actual.join(",")}`);
  }
}

function allowedKeys(value, required, optional, label) {
  requireObject(value, label);
  const keys = new Set(Object.keys(value));
  for (const key of required) {
    if (!keys.has(key)) fail(`${label}.${key} is required`);
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of keys) {
    if (!allowed.has(key)) fail(`${label}.${key} is not allowed`);
  }
}

export function canonicalJson(value) {
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalTimestamp(value, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    fail(`${label} is not canonical ISO-8601`);
  }
  return date;
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

export function validateOnionHostname(value) {
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

function unsignedBindingBytes(bindingValue) {
  const clone = structuredClone(bindingValue);
  if (!isPlainObject(clone.signature)) fail("binding.signature must be an object");
  delete clone.signature.value;
  return Buffer.concat([
    Buffer.from(BINDING_DOMAIN, "utf8"),
    Buffer.from([0]),
    Buffer.from(canonicalJson(clone), "utf8"),
  ]);
}

function requireHex(value, length, label) {
  if (typeof value !== "string" || !new RegExp(`^[0-9a-f]{${length}}$`).test(value)) {
    fail(`${label} must be ${length} lowercase hexadecimal characters`);
  }
  return value;
}

function requireInteger(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    fail(`${label} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function validatePath(value, label) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    fail(`${label} must be an absolute HTTP path`);
  }
  if (value.includes("?") || value.includes("#") || value.includes("\\") || value.includes("\0")) {
    fail(`${label} must not contain a query, fragment, backslash, or NUL`);
  }
  const parsed = new URL(value, "http://void.invalid");
  if (parsed.pathname !== value || parsed.search || parsed.hash) {
    fail(`${label} is not canonical`);
  }
  if (value.length > 2048) fail(`${label} is too long`);
  return value;
}

function validateProbe(value, label, required) {
  const requiredKeys = required
    ? ["id", "path", "expected_status", "expected_sha256", "json"]
    : ["id", "path", "accepted_statuses", "json"];
  const optionalKeys = required
    ? ["expected_marker"]
    : ["expected_marker", "expected_sha256"];
  allowedKeys(value, requiredKeys, optionalKeys, label);
  if (typeof value.id !== "string" || !/^[a-z0-9][a-z0-9_.-]{0,79}$/.test(value.id)) {
    fail(`${label}.id is invalid`);
  }
  validatePath(value.path, `${label}.path`);
  if (typeof value.json !== "boolean") fail(`${label}.json must be boolean`);
  if (value.expected_marker !== undefined && typeof value.expected_marker !== "string") {
    fail(`${label}.expected_marker must be a string`);
  }
  if (required) {
    requireInteger(value.expected_status, 100, 599, `${label}.expected_status`);
    requireHex(value.expected_sha256, 64, `${label}.expected_sha256`);
  } else {
    if (!Array.isArray(value.accepted_statuses) || value.accepted_statuses.length === 0) {
      fail(`${label}.accepted_statuses must be a non-empty array`);
    }
    const statuses = value.accepted_statuses.map((item, index) =>
      requireInteger(item, 100, 599, `${label}.accepted_statuses[${index}]`));
    if (new Set(statuses).size !== statuses.length) {
      fail(`${label}.accepted_statuses must be unique`);
    }
    if (value.expected_sha256 !== undefined) {
      requireHex(value.expected_sha256, 64, `${label}.expected_sha256`);
    }
  }
  return value;
}

export function validateProfile(profile) {
  allowedKeys(
    profile,
    ["marker", "version", "transport", "trust", "limits", "required_probes", "optional_probes"],
    ["$schema"],
    "profile",
  );
  if (profile.marker !== PROFILE_MARKER || profile.version !== 1) {
    fail("profile marker or version is invalid");
  }

  exactKeys(profile.transport, ["onion_hostname", "virtual_port", "socks_proxy"], "profile.transport");
  const onionHostname = validateOnionHostname(profile.transport.onion_hostname);
  requireInteger(profile.transport.virtual_port, 1, 65535, "profile.transport.virtual_port");
  exactKeys(profile.transport.socks_proxy, ["host", "port"], "profile.transport.socks_proxy");
  if (!LOOPBACK_PROXY_HOSTS.has(profile.transport.socks_proxy.host)) {
    fail("profile.transport.socks_proxy.host must be exactly 127.0.0.1 or ::1");
  }
  requireInteger(profile.transport.socks_proxy.port, 1, 65535, "profile.transport.socks_proxy.port");

  exactKeys(
    profile.trust,
    ["node_id", "public_key_fingerprint_sha256", "binding_sha256", "binding_expires_at"],
    "profile.trust",
  );
  requireHex(profile.trust.node_id, 32, "profile.trust.node_id");
  requireHex(profile.trust.public_key_fingerprint_sha256, 64, "profile.trust.public_key_fingerprint_sha256");
  requireHex(profile.trust.binding_sha256, 64, "profile.trust.binding_sha256");
  canonicalTimestamp(profile.trust.binding_expires_at, "profile.trust.binding_expires_at");

  exactKeys(
    profile.limits,
    ["connect_timeout_ms", "request_timeout_ms", "max_response_bytes", "descriptor_future_skew_ms", "request_attempts", "retry_delay_ms"],
    "profile.limits",
  );
  requireInteger(profile.limits.connect_timeout_ms, 100, 60_000, "profile.limits.connect_timeout_ms");
  requireInteger(profile.limits.request_timeout_ms, 100, 120_000, "profile.limits.request_timeout_ms");
  requireInteger(profile.limits.max_response_bytes, 1, 16_777_216, "profile.limits.max_response_bytes");
  requireInteger(profile.limits.descriptor_future_skew_ms, 0, 600_000, "profile.limits.descriptor_future_skew_ms");
  requireInteger(profile.limits.request_attempts, 1, 5, "profile.limits.request_attempts");
  requireInteger(profile.limits.retry_delay_ms, 0, 5_000, "profile.limits.retry_delay_ms");

  if (!Array.isArray(profile.required_probes) || profile.required_probes.length === 0) {
    fail("profile.required_probes must be a non-empty array");
  }
  if (!Array.isArray(profile.optional_probes)) fail("profile.optional_probes must be an array");
  profile.required_probes.forEach((probe, index) =>
    validateProbe(probe, `profile.required_probes[${index}]`, true));
  profile.optional_probes.forEach((probe, index) =>
    validateProbe(probe, `profile.optional_probes[${index}]`, false));

  const ids = [...profile.required_probes, ...profile.optional_probes].map((probe) => probe.id);
  if (new Set(ids).size !== ids.length) fail("probe ids must be unique");
  const reserved = new Set([...BINDING_PATHS, ...DESCRIPTOR_PATHS, ...MCP_DESCRIPTOR_PATHS]);
  for (const probe of [...profile.required_probes, ...profile.optional_probes]) {
    if (reserved.has(probe.path)) fail(`probe path is reserved for identity discovery: ${probe.path}`);
  }

  return {
    ...structuredClone(profile),
    transport: {
      ...structuredClone(profile.transport),
      onion_hostname: onionHostname,
    },
  };
}

export function loadProfile(path) {
  const bytes = readFileSync(path);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`profile is not valid JSON: ${path}`);
  }
  return {
    profile: validateProfile(value),
    bytes,
    sha256: sha256(bytes),
  };
}

export function verifyBinding(binding, profile, options = {}) {
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

  if (binding.node.node_id !== profile.trust.node_id) fail("binding node_id mismatch");
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
    || fingerprint !== profile.trust.public_key_fingerprint_sha256
  ) {
    fail("binding public-key fingerprint mismatch");
  }

  const hostname = validateOnionHostname(binding.transport.onion_hostname);
  if (hostname !== profile.transport.onion_hostname) fail("binding onion hostname mismatch");
  if (
    binding.transport.protocol !== "tor-v3"
    || binding.transport.virtual_port !== profile.transport.virtual_port
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
    binding.signature.domain !== BINDING_DOMAIN
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
  if (binding.expires_at !== profile.trust.binding_expires_at) fail("binding expiry mismatch");
  const nowMs = options.nowMs ?? Date.now();
  if (expires.getTime() <= nowMs) fail("binding is expired");
  if (issued.getTime() > nowMs + 120_000) fail("binding issuance is unreasonably in the future");
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
    authority: structuredClone(binding.authority),
  };
}

function verifyDescriptorIdentity(identity, bindingSummary) {
  exactKeys(identity, [
    "canonical_void_node_identity", "signed_void_node_binding",
    "tor_self_authentication", "binding_status", "node_id", "key_type",
    "public_key_fingerprint_sha256", "issued_at", "expires_at", "binding_paths",
  ], "descriptor.identity");
  if (
    identity.canonical_void_node_identity !== true
    || identity.signed_void_node_binding !== true
    || identity.tor_self_authentication !== true
    || identity.binding_status !== "signed-node-to-onion-v1"
    || identity.node_id !== bindingSummary.nodeId
    || identity.key_type !== "ed25519"
    || identity.public_key_fingerprint_sha256 !== bindingSummary.fingerprint
    || identity.issued_at !== bindingSummary.issuedAt
    || identity.expires_at !== bindingSummary.expiresAt
    || JSON.stringify(identity.binding_paths) !== JSON.stringify(BINDING_PATHS)
  ) {
    fail("descriptor signed identity profile is invalid");
  }
}

function validateGeneratedAt(value, profile, options, label) {
  const generated = canonicalTimestamp(value, label);
  const nowMs = options.nowMs ?? Date.now();
  if (generated.getTime() > nowMs + profile.limits.descriptor_future_skew_ms) {
    fail(`${label} is unreasonably in the future`);
  }
  return generated;
}

function verifyAgentSurfaces(agentSurfaces, profile) {
  allowedKeys(
    agentSurfaces,
    ["mcp_readonly_v1"],
    ["order_status_readonly_v1"],
    "descriptor.agent_surfaces",
  );
  const mcp = agentSurfaces.mcp_readonly_v1;
  exactKeys(mcp, [
    "marker", "status", "uri", "descriptor_paths", "methods", "application_authority",
  ], "descriptor.agent_surfaces.mcp_readonly_v1");
  if (
    mcp.marker !== MCP_DESCRIPTOR_MARKER
    || !new Set(["active", "unavailable"]).has(mcp.status)
    || mcp.uri !== `http://${profile.transport.onion_hostname}/mcp`
    || JSON.stringify(mcp.descriptor_paths) !== JSON.stringify(MCP_DESCRIPTOR_PATHS)
    || JSON.stringify(mcp.methods) !== JSON.stringify(["GET", "POST", "DELETE"])
    || mcp.application_authority !== "read_only"
  ) {
    fail("descriptor MCP agent surface is invalid");
  }

  const orderStatus = agentSurfaces.order_status_readonly_v1;
  if (orderStatus !== undefined) {
    exactKeys(orderStatus, [
      "marker", "status", "reason", "uri_template", "descriptor_paths", "methods",
      "application_authority",
    ], "descriptor.agent_surfaces.order_status_readonly_v1");
    const validReason = orderStatus.status === "active"
      ? orderStatus.reason === null
      : typeof orderStatus.reason === "string" && orderStatus.reason.length > 0;
    if (
      orderStatus.marker !== ORDER_STATUS_SURFACE_MARKER
      || !new Set(["active", "unavailable"]).has(orderStatus.status)
      || !validReason
      || orderStatus.uri_template
        !== `http://${profile.transport.onion_hostname}${ORDER_STATUS_PATH_TEMPLATE}`
      || JSON.stringify(orderStatus.descriptor_paths)
        !== JSON.stringify(ORDER_STATUS_DESCRIPTOR_PATHS)
      || JSON.stringify(orderStatus.methods) !== JSON.stringify(["GET"])
      || orderStatus.application_authority !== "read_only"
    ) {
      fail("descriptor order-status agent surface is invalid");
    }
  }
  return structuredClone(mcp);
}

export function verifyDescriptor(descriptor, bindingSummary, profile, options = {}) {
  allowedKeys(
    descriptor,
    ["marker", "version", "status", "generated_at", "transport", "surface", "identity", "authority"],
    ["agent_surfaces"],
    "descriptor",
  );
  if (
    descriptor.marker !== DESCRIPTOR_MARKER
    || descriptor.version !== 1
    || descriptor.status !== "active"
  ) {
    fail("descriptor marker, version, or status is invalid");
  }
  validateGeneratedAt(descriptor.generated_at, profile, options, "descriptor.generated_at");

  exactKeys(descriptor.transport, [
    "protocol", "uri", "onion_hostname", "virtual_port", "address_role",
  ], "descriptor.transport");
  const hostname = validateOnionHostname(descriptor.transport.onion_hostname);
  if (
    hostname !== profile.transport.onion_hostname
    || descriptor.transport.protocol !== "tor-v3"
    || descriptor.transport.uri !== `http://${hostname}`
    || descriptor.transport.virtual_port !== profile.transport.virtual_port
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
  verifyDescriptorIdentity(descriptor.identity, bindingSummary);
  exactKeys(descriptor.authority, Object.keys(AUTHORITY), "descriptor.authority");
  for (const [key, expected] of Object.entries(AUTHORITY)) {
    if (descriptor.authority[key] !== expected) fail(`descriptor authority.${key} mismatch`);
  }
  const mcpSurface = descriptor.agent_surfaces === undefined
    ? null
    : verifyAgentSurfaces(descriptor.agent_surfaces, profile);
  return {
    generatedAt: descriptor.generated_at,
    semanticSha256: semanticDigest(descriptor, ["generated_at"]),
    mcpSurface,
  };
}

function semanticDigest(value, ignoredKeys = []) {
  const clone = structuredClone(value);
  for (const key of ignoredKeys) delete clone[key];
  return sha256(Buffer.from(canonicalJson(clone), "utf8"));
}

function verifyMcpDescriptor(value, bindingSummary, profile, options = {}) {
  exactKeys(value, [
    "marker", "version", "status", "generated_at", "transport", "protocol",
    "identity", "authority", "security", "discovery",
  ], "mcp_descriptor");
  if (value.marker !== MCP_DESCRIPTOR_MARKER || value.version !== 1 || value.status !== "active") {
    fail("MCP descriptor marker, version, or status is invalid");
  }
  validateGeneratedAt(value.generated_at, profile, options, "mcp_descriptor.generated_at");
  exactKeys(value.transport, [
    "protocol", "uri", "onion_hostname", "virtual_port", "path", "descriptor_paths",
  ], "mcp_descriptor.transport");
  if (
    value.transport.protocol !== "mcp-streamable-http-over-tor-v3"
    || value.transport.uri !== `http://${profile.transport.onion_hostname}/mcp`
    || value.transport.onion_hostname !== profile.transport.onion_hostname
    || value.transport.virtual_port !== profile.transport.virtual_port
    || value.transport.path !== "/mcp"
    || JSON.stringify(value.transport.descriptor_paths) !== JSON.stringify(MCP_DESCRIPTOR_PATHS)
  ) {
    fail("MCP descriptor transport profile is invalid");
  }
  exactKeys(value.protocol, ["name", "supported_versions", "methods", "anonymous"], "mcp_descriptor.protocol");
  if (
    value.protocol.name !== "mcp-streamable-http"
    || !Array.isArray(value.protocol.supported_versions)
    || value.protocol.supported_versions.length === 0
    || JSON.stringify(value.protocol.methods) !== JSON.stringify(["GET", "POST", "DELETE"])
    || value.protocol.anonymous !== true
  ) {
    fail("MCP descriptor protocol profile is invalid");
  }
  verifyDescriptorIdentity(value.identity, bindingSummary);
  exactKeys(value.authority, Object.keys(MCP_AUTHORITY), "mcp_descriptor.authority");
  for (const [key, expected] of Object.entries(MCP_AUTHORITY)) {
    if (value.authority[key] !== expected) fail(`mcp_descriptor.authority.${key} mismatch`);
  }
  exactKeys(value.security, [
    "exact_path_allowlist", "fixed_loopback_upstream", "generic_proxy",
    "credential_headers_accepted", "browser_origin_requests_accepted",
    "bounded_request_bytes", "bounded_response_bytes", "maximum_concurrent_requests",
    "upstream_timeout_ms",
  ], "mcp_descriptor.security");
  if (
    value.security.exact_path_allowlist !== true
    || value.security.fixed_loopback_upstream !== true
    || value.security.generic_proxy !== false
    || value.security.credential_headers_accepted !== false
    || value.security.browser_origin_requests_accepted !== false
  ) {
    fail("MCP descriptor security profile is invalid");
  }
  requireInteger(value.security.bounded_request_bytes, 1, 1_048_576, "mcp_descriptor.security.bounded_request_bytes");
  requireInteger(value.security.bounded_response_bytes, 1, 16_777_216, "mcp_descriptor.security.bounded_response_bytes");
  requireInteger(value.security.maximum_concurrent_requests, 1, 64, "mcp_descriptor.security.maximum_concurrent_requests");
  requireInteger(value.security.upstream_timeout_ms, 100, 60_000, "mcp_descriptor.security.upstream_timeout_ms");
  exactKeys(value.discovery, ["tor_transport_descriptor_paths", "signed_node_binding_paths"], "mcp_descriptor.discovery");
  if (
    JSON.stringify(value.discovery.tor_transport_descriptor_paths) !== JSON.stringify(DESCRIPTOR_PATHS)
    || JSON.stringify(value.discovery.signed_node_binding_paths) !== JSON.stringify(BINDING_PATHS)
  ) {
    fail("MCP descriptor discovery links are invalid");
  }
  return {
    generatedAt: value.generated_at,
    semanticSha256: semanticDigest(value, ["generated_at"]),
    supportedVersions: [...value.protocol.supported_versions],
    methods: [...value.protocol.methods],
    security: structuredClone(value.security),
  };
}

function connectSocket(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new TransportError(`SOCKS proxy connection timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    timer.unref?.();
    const cleanup = () => clearTimeout(timer);
    socket.once("connect", () => {
      cleanup();
      resolve(socket);
    });
    socket.once("error", (error) => {
      cleanup();
      reject(new TransportError(`SOCKS proxy connection failed: ${error.message}`));
    });
  });
}

function waitReadable(socket, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new TransportError(`${label} timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    timer.unref?.();
    const onReadable = () => done(resolve);
    const onEnd = () => done(() => reject(new TransportError(`${label} ended early`)));
    const onClose = () => done(() => reject(new TransportError(`${label} closed early`)));
    const onError = (error) => done(() => reject(new TransportError(`${label} failed: ${error.message}`)));
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("readable", onReadable);
      socket.off("end", onEnd);
      socket.off("close", onClose);
      socket.off("error", onError);
    };
    const done = (callback) => {
      cleanup();
      callback();
    };
    socket.once("readable", onReadable);
    socket.once("end", onEnd);
    socket.once("close", onClose);
    socket.once("error", onError);
  });
}

async function readExact(socket, length, timeoutMs, label) {
  const chunks = [];
  let total = 0;
  while (total < length) {
    const chunk = socket.read(length - total);
    if (chunk !== null) {
      chunks.push(chunk);
      total += chunk.length;
      continue;
    }
    await waitReadable(socket, timeoutMs, label);
  }
  return Buffer.concat(chunks, total);
}

const SOCKS_REPLY_NAMES = Object.freeze({
  1: "general failure",
  2: "connection not allowed",
  3: "network unreachable",
  4: "host unreachable",
  5: "connection refused",
  6: "TTL expired",
  7: "command not supported",
  8: "address type not supported",
});

export async function openSocks5DomainConnection(profile) {
  const proxy = profile.transport.socks_proxy;
  const socket = await connectSocket(proxy.host, proxy.port, profile.limits.connect_timeout_ms);
  try {
    socket.write(Buffer.from([0x05, 0x01, 0x00]));
    const method = await readExact(socket, 2, profile.limits.connect_timeout_ms, "SOCKS method negotiation");
    if (method[0] !== 0x05 || method[1] !== 0x00) {
      fail(`SOCKS proxy rejected no-authentication mode: ${method.toString("hex")}`);
    }

    const hostnameBytes = Buffer.from(profile.transport.onion_hostname, "ascii");
    if (hostnameBytes.length > 255) fail("onion hostname is too long for SOCKS5 domain addressing");
    const port = profile.transport.virtual_port;
    const request = Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03, hostnameBytes.length]),
      hostnameBytes,
      Buffer.from([(port >> 8) & 0xff, port & 0xff]),
    ]);
    socket.write(request);

    const response = await readExact(socket, 4, profile.limits.connect_timeout_ms, "SOCKS CONNECT response");
    if (response[0] !== 0x05 || response[2] !== 0x00) fail("SOCKS CONNECT response is malformed");
    if (response[1] !== 0x00) {
      const reason = SOCKS_REPLY_NAMES[response[1]] || `unknown reply ${response[1]}`;
      throw new TransportError(`SOCKS CONNECT failed: ${reason}`);
    }
    if (response[3] === 0x01) await readExact(socket, 4, profile.limits.connect_timeout_ms, "SOCKS IPv4 bind address");
    else if (response[3] === 0x04) await readExact(socket, 16, profile.limits.connect_timeout_ms, "SOCKS IPv6 bind address");
    else if (response[3] === 0x03) {
      const length = (await readExact(socket, 1, profile.limits.connect_timeout_ms, "SOCKS domain bind length"))[0];
      await readExact(socket, length, profile.limits.connect_timeout_ms, "SOCKS domain bind address");
    } else {
      fail(`SOCKS CONNECT returned unsupported address type: ${response[3]}`);
    }
    await readExact(socket, 2, profile.limits.connect_timeout_ms, "SOCKS bind port");
    return {
      socket,
      remoteDns: true,
      addressType: "domain",
      requestedHostname: profile.transport.onion_hostname,
      requestedPort: profile.transport.virtual_port,
    };
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

function collectUntilClose(socket, maximumBytes, timeoutMs) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;
    const timer = setTimeout(() => {
      finish(() => {
        socket.destroy();
        reject(new TransportError(`HTTP response timed out after ${timeoutMs} ms`));
      });
    }, timeoutMs);
    timer.unref?.();
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("end", onEnd);
      socket.off("close", onClose);
      socket.off("error", onError);
    };
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const onData = (chunk) => {
      total += chunk.length;
      if (total > maximumBytes + MAX_HEADER_BYTES) {
        finish(() => {
          socket.destroy();
          reject(new Hold(`HTTP response exceeded ${maximumBytes} body bytes plus header allowance`));
        });
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => finish(() => resolve(Buffer.concat(chunks, total)));
    const onClose = () => finish(() => resolve(Buffer.concat(chunks, total)));
    const onError = (error) => finish(() => reject(new TransportError(`HTTP socket failed: ${error.message}`)));
    socket.on("data", onData);
    socket.once("end", onEnd);
    socket.once("close", onClose);
    socket.once("error", onError);
  });
}

function parseHttpResponse(raw, maximumBodyBytes) {
  const split = raw.indexOf("\r\n\r\n");
  if (split < 0) fail("HTTP response header terminator is missing");
  if (split > MAX_HEADER_BYTES) fail("HTTP response headers are too large");
  const headerText = raw.subarray(0, split).toString("latin1");
  const body = raw.subarray(split + 4);
  if (body.length > maximumBodyBytes) fail("HTTP response body exceeds configured maximum");
  const lines = headerText.split("\r\n");
  const match = /^HTTP\/1\.[01] ([0-9]{3})(?: .*)?$/.exec(lines.shift() || "");
  if (!match) fail("HTTP status line is invalid");
  const status = Number(match[1]);
  const headers = {};
  for (const line of lines) {
    if (/^[ \t]/.test(line)) fail("folded HTTP headers are forbidden");
    const index = line.indexOf(":");
    if (index <= 0) fail("HTTP header line is invalid");
    const name = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(name)) fail("HTTP header name is invalid");
    if (headers[name] !== undefined) fail(`duplicate HTTP header is forbidden: ${name}`);
    headers[name] = value;
  }
  if (headers["transfer-encoding"] !== undefined) {
    fail("Transfer-Encoding responses are not accepted by the bounded client");
  }
  if (headers["content-length"] !== undefined) {
    if (!/^[0-9]+$/.test(headers["content-length"])) fail("HTTP Content-Length is invalid");
    const expected = Number(headers["content-length"]);
    if (!Number.isSafeInteger(expected) || expected !== body.length) {
      fail(`HTTP body length mismatch: expected=${expected} actual=${body.length}`);
    }
  }
  return { status, headers, body };
}

async function httpGetViaSocksOnce(profile, path) {
  validatePath(path, "request path");
  const started = Date.now();
  const connection = await openSocks5DomainConnection(profile);
  const { socket } = connection;
  try {
    const request = [
      `GET ${path} HTTP/1.1`,
      `Host: ${profile.transport.onion_hostname}`,
      "Accept: application/json",
      "Accept-Encoding: identity",
      "Cache-Control: no-cache",
      "User-Agent: void-tor-agent-access-client-v1",
      "Connection: close",
      "",
      "",
    ].join("\r\n");
    socket.write(request, "ascii");
    const raw = await collectUntilClose(
      socket,
      profile.limits.max_response_bytes,
      profile.limits.request_timeout_ms,
    );
    const parsed = parseHttpResponse(raw, profile.limits.max_response_bytes);
    return {
      path,
      status: parsed.status,
      headers: parsed.headers,
      body: parsed.body,
      bodySha256: sha256(parsed.body),
      bytes: parsed.body.length,
      durationMs: Date.now() - started,
      socks: {
        proxy: `${profile.transport.socks_proxy.host}:${profile.transport.socks_proxy.port}`,
        remote_dns: connection.remoteDns,
        address_type: connection.addressType,
        requested_hostname: connection.requestedHostname,
        requested_port: connection.requestedPort,
      },
    };
  } finally {
    socket.destroy();
  }
}

function sleep(milliseconds) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    timer.unref?.();
  });
}

export async function httpGetViaSocks(profile, path) {
  let lastError = null;
  for (let attempt = 1; attempt <= profile.limits.request_attempts; attempt += 1) {
    try {
      const response = await httpGetViaSocksOnce(profile, path);
      return { ...response, attempts: attempt };
    } catch (error) {
      if (!(error instanceof TransportError)) throw error;
      lastError = error;
      if (attempt < profile.limits.request_attempts) {
        await sleep(profile.limits.retry_delay_ms);
      }
    }
  }
  throw lastError || new TransportError("HTTP request failed without a transport error");
}

function parseJsonBody(response, label) {
  let value;
  try {
    value = JSON.parse(response.body.toString("utf8"));
  } catch {
    fail(`${label} is not valid JSON`);
  }
  return value;
}

async function fetchPair(profile, paths, label) {
  const responses = [];
  for (const path of paths) responses.push(await httpGetViaSocks(profile, path));
  for (const response of responses) {
    if (response.status !== 200) fail(`${label} path returned HTTP ${response.status}: ${response.path}`);
  }
  return responses;
}

function responsesByteIdentical(a, b) {
  return a.body.length === b.body.length && timingSafeEqual(a.body, b.body);
}

function safeMarker(value) {
  return isPlainObject(value) && typeof value.marker === "string" ? value.marker : null;
}

async function inspectMcp(profile, bindingSummary, options) {
  const records = [];
  for (const path of MCP_DESCRIPTOR_PATHS) {
    try {
      const response = await httpGetViaSocks(profile, path);
      records.push(response);
    } catch (error) {
      return {
        status: "degraded",
        reason: error instanceof Error ? error.message : String(error),
        paths: MCP_DESCRIPTOR_PATHS.map((pathValue) => ({ path: pathValue, reachable: false })),
      };
    }
  }
  if (records.every((record) => record.status === 404)) {
    return {
      status: "unavailable",
      reason: "descriptor-not-published",
      paths: records.map((record) => ({ path: record.path, status: record.status, sha256: record.bodySha256 })),
    };
  }
  if (!records.every((record) => record.status === 200)) {
    return {
      status: "degraded",
      reason: "descriptor-alias-status-mismatch",
      paths: records.map((record) => ({ path: record.path, status: record.status, sha256: record.bodySha256 })),
    };
  }
  try {
    const values = records.map((record, index) =>
      verifyMcpDescriptor(parseJsonBody(record, `MCP descriptor alias ${index + 1}`), bindingSummary, profile, options));
    if (values[0].semanticSha256 !== values[1].semanticSha256) {
      fail("MCP descriptor aliases are not semantically identical");
    }
    return {
      status: "advertised",
      execution_proven: false,
      semantic_sha256: values[0].semanticSha256,
      supported_versions: values[0].supportedVersions,
      methods: values[0].methods,
      security: values[0].security,
      paths: records.map((record) => ({ path: record.path, status: record.status, sha256: record.bodySha256 })),
    };
  } catch (error) {
    return {
      status: "degraded",
      reason: error instanceof Error ? error.message : String(error),
      paths: records.map((record) => ({ path: record.path, status: record.status, sha256: record.bodySha256 })),
    };
  }
}

async function runRequiredProbe(profile, probe) {
  const response = await httpGetViaSocks(profile, probe.path);
  if (response.status !== probe.expected_status) {
    fail(`required probe ${probe.id} status mismatch: expected=${probe.expected_status} actual=${response.status}`);
  }
  if (response.bodySha256 !== probe.expected_sha256) {
    fail(`required probe ${probe.id} body SHA mismatch: expected=${probe.expected_sha256} actual=${response.bodySha256}`);
  }
  let marker = null;
  if (probe.json) {
    const value = parseJsonBody(response, `required probe ${probe.id}`);
    marker = safeMarker(value);
    if (probe.expected_marker !== undefined && marker !== probe.expected_marker) {
      fail(`required probe ${probe.id} marker mismatch`);
    }
  }
  return {
    id: probe.id,
    path: probe.path,
    status: "exact",
    http_status: response.status,
    bytes: response.bytes,
    sha256: response.bodySha256,
    marker,
    duration_ms: response.durationMs,
    attempts: response.attempts,
  };
}

async function runOptionalProbe(profile, probe) {
  try {
    const response = await httpGetViaSocks(profile, probe.path);
    const accepted = probe.accepted_statuses.includes(response.status);
    if (!accepted) {
      return {
        id: probe.id,
        path: probe.path,
        status: "degraded",
        http_status: response.status,
        bytes: response.bytes,
        sha256: response.bodySha256,
        reason: "unexpected-http-status",
        duration_ms: response.durationMs,
        attempts: response.attempts,
      };
    }
    if (response.status !== 200) {
      return {
        id: probe.id,
        path: probe.path,
        status: "unavailable",
        http_status: response.status,
        bytes: response.bytes,
        sha256: response.bodySha256,
        duration_ms: response.durationMs,
        attempts: response.attempts,
      };
    }
    if (probe.expected_sha256 !== undefined && response.bodySha256 !== probe.expected_sha256) {
      return {
        id: probe.id,
        path: probe.path,
        status: "degraded",
        http_status: response.status,
        bytes: response.bytes,
        sha256: response.bodySha256,
        reason: "body-sha-mismatch",
        duration_ms: response.durationMs,
        attempts: response.attempts,
      };
    }
    let marker = null;
    if (probe.json) {
      const value = parseJsonBody(response, `optional probe ${probe.id}`);
      marker = safeMarker(value);
      if (probe.expected_marker !== undefined && marker !== probe.expected_marker) {
        return {
          id: probe.id,
          path: probe.path,
          status: "degraded",
          http_status: response.status,
          bytes: response.bytes,
          sha256: response.bodySha256,
          marker,
          reason: "marker-mismatch",
          duration_ms: response.durationMs,
        };
      }
    }
    return {
      id: probe.id,
      path: probe.path,
      status: "available",
      http_status: response.status,
      bytes: response.bytes,
      sha256: response.bodySha256,
      marker,
      duration_ms: response.durationMs,
      attempts: response.attempts,
    };
  } catch (error) {
    return {
      id: probe.id,
      path: probe.path,
      status: "degraded",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runClient(profileInput, options = {}) {
  const profile = validateProfile(profileInput);
  const effectiveProfileSha256 = sha256(Buffer.from(canonicalJson(profile), "utf8"));
  const profileFileSha256 = options.profileFileSha256 || null;

  const bindingResponses = await fetchPair(profile, BINDING_PATHS, "binding");
  if (!responsesByteIdentical(bindingResponses[0], bindingResponses[1])) {
    fail("binding aliases are not byte-identical");
  }
  if (bindingResponses[0].bodySha256 !== profile.trust.binding_sha256) {
    fail(`binding body SHA mismatch: expected=${profile.trust.binding_sha256} actual=${bindingResponses[0].bodySha256}`);
  }
  const bindingValue = parseJsonBody(bindingResponses[0], "binding");
  const bindingSummary = verifyBinding(bindingValue, profile, options);

  const descriptorResponses = await fetchPair(profile, DESCRIPTOR_PATHS, "transport descriptor");
  const descriptorValues = descriptorResponses.map((response, index) =>
    verifyDescriptor(parseJsonBody(response, `transport descriptor alias ${index + 1}`), bindingSummary, profile, options));
  if (descriptorValues[0].semanticSha256 !== descriptorValues[1].semanticSha256) {
    fail("transport descriptor aliases are not semantically identical");
  }

  const required = [];
  for (const probe of profile.required_probes) required.push(await runRequiredProbe(profile, probe));
  const optional = [];
  for (const probe of profile.optional_probes) optional.push(await runOptionalProbe(profile, probe));
  const mcp = await inspectMcp(profile, bindingSummary, options);

  const optionalAvailable = optional.filter((item) => item.status === "available").length;
  const optionalUnavailable = optional.filter((item) => item.status === "unavailable").length;
  const optionalDegraded = optional.filter((item) => item.status === "degraded").length;
  const discoveryIds = new Set([
    "void_public_node", "agent_discovery", "network_authenticity", "agent_first_contact",
  ]);
  const discovery = optional.filter((item) => discoveryIds.has(item.id));
  const discoveryParity = discovery.length > 0 && discovery.every((item) => item.status === "available")
    ? "full"
    : discovery.some((item) => item.status === "available")
      ? "partial"
      : "absent";

  return {
    marker: RECEIPT_MARKER,
    version: 1,
    status: "green",
    generated_at: new Date(options.nowMs ?? Date.now()).toISOString(),
    profile_file_sha256: profileFileSha256,
    effective_profile_sha256: effectiveProfileSha256,
    transport: {
      protocol: "tor-v3-via-socks5h",
      onion_hostname: profile.transport.onion_hostname,
      uri: `http://${profile.transport.onion_hostname}`,
      virtual_port: profile.transport.virtual_port,
      socks_proxy: `${profile.transport.socks_proxy.host}:${profile.transport.socks_proxy.port}`,
      remote_dns: true,
      local_onion_dns_resolution: false,
      redirects_followed: false,
      credentials_sent: false,
    },
    identity: {
      node_id: bindingSummary.nodeId,
      public_key_fingerprint_sha256: bindingSummary.fingerprint,
      binding_sha256: bindingResponses[0].bodySha256,
      issued_at: bindingSummary.issuedAt,
      expires_at: bindingSummary.expiresAt,
      ed25519_signature_verified: true,
      onion_v3_checksum_verified: true,
      binding_aliases_byte_identical: true,
      descriptor_aliases_semantically_identical: true,
      descriptor_semantic_sha256: descriptorValues[0].semanticSha256,
      descriptor_generated_at: descriptorValues.map((value) => value.generatedAt),
      descriptor_timestamp_policy: "chronology-only-not-session-freshness",
    },
    authority: bindingSummary.authority,
    capabilities: {
      required,
      optional,
      mcp_readonly: mcp,
      discovery_parity: discoveryParity,
    },
    summary: {
      required_exact: required.length,
      optional_available: optionalAvailable,
      optional_unavailable: optionalUnavailable,
      optional_degraded: optionalDegraded,
      mcp_status: mcp.status,
      mutation_authority_granted: false,
      payment_execution: false,
      fund_movement: false,
    },
  };
}

function parseArgs(argv) {
  const options = {
    profile: "config/void-tor-agent-access-client-v1.json",
    pretty: false,
    output: "",
    socksHost: "",
    socksPort: 0,
    connectTimeoutMs: 0,
    requestTimeoutMs: 0,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value for ${argument}`);
      return argv[index];
    };
    if (argument === "--profile") options.profile = next();
    else if (argument === "--pretty") options.pretty = true;
    else if (argument === "--output") options.output = next();
    else if (argument === "--socks-host") options.socksHost = next();
    else if (argument === "--socks-port") options.socksPort = Number(next());
    else if (argument === "--connect-timeout-ms") options.connectTimeoutMs = Number(next());
    else if (argument === "--request-timeout-ms") options.requestTimeoutMs = Number(next());
    else if (argument === "--help" || argument === "-h") options.help = true;
    else fail(`unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node tools/void-tor-agent-access-client-v1.mjs [options]

Options:
  --profile PATH                 Trust and probe profile
  --socks-host 127.0.0.1        Override local SOCKS proxy host
  --socks-port 19050            Override local SOCKS proxy port
  --connect-timeout-ms N         Override SOCKS connection timeout
  --request-timeout-ms N         Override per-request timeout
  --output PATH                  Write the JSON receipt to a file
  --pretty                       Pretty-print JSON
  --help                         Show this help

The client performs read-only HTTP GET requests. It never sends credentials,
wallet material, operator keys, payment instructions, or mutation requests.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const loaded = loadProfile(args.profile);
  const profile = structuredClone(loaded.profile);
  if (args.socksHost) profile.transport.socks_proxy.host = args.socksHost;
  if (args.socksPort) profile.transport.socks_proxy.port = args.socksPort;
  if (args.connectTimeoutMs) profile.limits.connect_timeout_ms = args.connectTimeoutMs;
  if (args.requestTimeoutMs) profile.limits.request_timeout_ms = args.requestTimeoutMs;
  const validated = validateProfile(profile);
  const receipt = await runClient(validated, { profileFileSha256: loaded.sha256 });
  const output = `${JSON.stringify(receipt, null, args.pretty ? 2 : 0)}\n`;
  if (args.output) writeFileSync(args.output, output, { mode: 0o600 });
  process.stdout.write(output);
}

const executedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedDirectly) {
  main().catch((error) => {
    console.error("VOID_TOR_AGENT_ACCESS_CLIENT_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
