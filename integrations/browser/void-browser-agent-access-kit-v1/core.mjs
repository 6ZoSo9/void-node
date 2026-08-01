const BINDING_DOMAIN = "VOID_NODE_ONION_BINDING_V1";
const BINDING_MARKER = "VOID_NODE_ONION_BINDING_V1";
const CAPABILITY_MARKER = "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1";
const WELL_KNOWN_DISCOVERY_MARKER = "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1";
const CANONICAL_DISCOVERY_MARKER = "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1";

export const WELL_KNOWN_DISCOVERY_PATH =
  "/.well-known/void-agent-discovery.json";

const CANONICAL_DISCOVERY_PATH = "/public-node/agents/discovery-v1.json";
const CAPABILITY_NEGOTIATION_PATH =
  "/public-node/agents/capabilities-v1.json";

export const BINDING_PATHS = Object.freeze([
  "/.well-known/void-node-onion-binding-v1.json",
  "/public-node/transports/tor-v1-binding.json",
]);

const DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-tor-onion-transport-v1.json",
  "/public-node/transports/tor-v1.json",
]);

const READ_ONLY_AUTHORITY = Object.freeze({
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

export class Hold extends Error {
  constructor(message) {
    super(message);
    this.name = "Hold";
  }
}

function fail(message) {
  throw new Hold(message);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isObject(value)) fail(`${label} must be an object`);
  return value;
}

function exactKeys(value, expected, label) {
  requireObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (!isObject(value)) fail("canonical JSON accepts plain objects only");
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`
  )).join(",")}}`;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be non-empty base64`);
  }
  let binary;
  try {
    binary = atob(value);
  } catch {
    fail(`${label} is not base64`);
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytesToBase64(bytes) !== value) fail(`${label} is not canonical base64`);
  return bytes;
}

function pemToDer(value) {
  if (typeof value !== "string") fail("binding public key PEM must be a string");
  const match = value.match(
    /^-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=\n]+)\n-----END PUBLIC KEY-----\n$/,
  );
  if (!match) fail("binding public key PEM is not canonical");
  return base64ToBytes(match[1].replaceAll("\n", ""), "binding public key PEM");
}

function hex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function requireHex(value, length, label) {
  if (typeof value !== "string" || !new RegExp(`^[0-9a-f]{${length}}$`).test(value)) {
    fail(`${label} must be ${length} lowercase hexadecimal characters`);
  }
  return value;
}

function requireTimestamp(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    fail(`${label} must be canonical ISO-8601`);
  }
  return date;
}

function requireOnionHostname(value) {
  const hostname = String(value || "").toLowerCase();
  if (!/^[a-z2-7]{56}\.onion$/.test(hostname)) {
    fail("binding onion hostname is not a Tor v3 address");
  }
  return hostname;
}

export function normalizeEndpoint(value) {
  let parsed;
  try {
    parsed = new URL(String(value || "").trim());
  } catch {
    fail("endpoint must be an absolute URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    fail("endpoint protocol must be HTTP or HTTPS");
  }
  if (parsed.username || parsed.password) fail("endpoint credentials are forbidden");
  if (parsed.search || parsed.hash) fail("endpoint query and fragment are forbidden");
  if (parsed.pathname !== "/") fail("endpoint must not contain a path");
  if (parsed.hostname.endsWith(".onion") && parsed.protocol !== "http:") {
    fail("onion endpoints must use HTTP through the browser's Tor transport");
  }
  return parsed.origin;
}

export function permissionOrigin(value) {
  const endpoint = new URL(normalizeEndpoint(value));
  return `${endpoint.protocol}//${endpoint.host}/*`;
}

export function bindingSigningBytes(binding) {
  const copy = structuredClone(requireObject(binding, "binding"));
  requireObject(copy.signature, "binding.signature");
  delete copy.signature.value;
  const prefix = new TextEncoder().encode(`${BINDING_DOMAIN}\0`);
  const body = new TextEncoder().encode(canonicalJson(copy));
  const output = new Uint8Array(prefix.length + body.length);
  output.set(prefix, 0);
  output.set(body, prefix.length);
  return output;
}

function validateTrustPins(value) {
  exactKeys(value, ["marker", "version", "network", "source", "trust"], "trust pins");
  if (value.marker !== "VOID_BROWSER_AGENT_TRUST_PINS_V1" || value.version !== 1) {
    fail("trust pin marker or version mismatch");
  }
  exactKeys(value.network, ["chain_id", "identity"], "trust pins.network");
  if (value.network.chain_id !== 2050 || value.network.identity !== "mainnet0") {
    fail("trust pin network mismatch");
  }
  exactKeys(value.source, ["repository", "base_commit", "profile_path"], "trust pins.source");
  if (
    value.source.repository !== "6ZoSo9/void-node"
    || !/^[0-9a-f]{40}$/.test(value.source.base_commit)
    || value.source.profile_path !== "config/void-tor-agent-access-client-v1.json"
  ) {
    fail("trust pin source is invalid");
  }
  exactKeys(value.trust, [
    "onion_hostname", "node_id", "public_key_fingerprint_sha256",
    "binding_sha256", "binding_expires_at",
  ], "trust pins.trust");
  requireOnionHostname(value.trust.onion_hostname);
  requireHex(value.trust.node_id, 32, "trust pins.trust.node_id");
  requireHex(
    value.trust.public_key_fingerprint_sha256,
    64,
    "trust pins.trust.public_key_fingerprint_sha256",
  );
  requireHex(value.trust.binding_sha256, 64, "trust pins.trust.binding_sha256");
  requireTimestamp(value.trust.binding_expires_at, "trust pins.trust.binding_expires_at");
  return value;
}

export async function verifySignedOnionBinding(binding, endpointValue, options = {}) {
  const endpoint = new URL(normalizeEndpoint(endpointValue));
  if (!endpoint.hostname.endsWith(".onion")) {
    fail("signed onion identity requires a direct onion endpoint");
  }
  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoImpl?.subtle) fail("Web Crypto is unavailable");
  const pins = validateTrustPins(options.trustPins);
  requireHex(options.observedBindingSha256, 64, "observed binding SHA-256");

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
  exactKeys(binding.authority, Object.keys(READ_ONLY_AUTHORITY), "binding.authority");
  exactKeys(binding.signature, [
    "domain", "algorithm", "encoding", "canonicalization", "value",
  ], "binding.signature");

  requireHex(binding.node.node_id, 32, "binding.node.node_id");
  if (
    binding.node.key_type !== "ed25519"
    || binding.node.node_id_attestation !== "signed-by-existing-void-node-key-v1"
  ) {
    fail("binding node identity profile is invalid");
  }
  requireHex(
    binding.node.public_key_fingerprint_sha256,
    64,
    "binding.node.public_key_fingerprint_sha256",
  );

  const hostname = requireOnionHostname(binding.transport.onion_hostname);
  if (
    binding.transport.protocol !== "tor-v3"
    || binding.transport.uri !== `http://${hostname}`
    || binding.transport.virtual_port !== 80
    || binding.transport.address_role !== "transport-endpoint"
  ) {
    fail("binding transport profile is invalid");
  }
  if (endpoint.hostname !== hostname) {
    fail("endpoint onion hostname does not match the signed binding");
  }
  if (
    binding.surface.id !== "void-public-node-static-read-only-v1"
    || JSON.stringify(binding.surface.methods) !== JSON.stringify(["GET", "HEAD"])
    || JSON.stringify(binding.surface.binding_paths) !== JSON.stringify(BINDING_PATHS)
    || JSON.stringify(binding.surface.descriptor_paths) !== JSON.stringify(DESCRIPTOR_PATHS)
  ) {
    fail("binding public surface profile is invalid");
  }
  for (const [key, expected] of Object.entries(READ_ONLY_AUTHORITY)) {
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

  const issued = requireTimestamp(binding.issued_at, "binding.issued_at");
  const expires = requireTimestamp(binding.expires_at, "binding.expires_at");
  const nowMs = options.nowMs ?? Date.now();
  if (issued.getTime() > nowMs + 120_000) fail("binding issuance is in the future");
  if (expires.getTime() <= nowMs) fail("binding is expired");
  if (expires.getTime() <= issued.getTime()) fail("binding validity interval is invalid");
  if (expires.getTime() - issued.getTime() > 366 * 24 * 60 * 60 * 1000) {
    fail("binding validity exceeds 366 days");
  }

  const publicDer = pemToDer(binding.node.public_key_pem);
  const fingerprint = hex(await cryptoImpl.subtle.digest("SHA-256", publicDer));
  if (fingerprint !== binding.node.public_key_fingerprint_sha256) {
    fail("binding public-key fingerprint mismatch");
  }
  if (
    binding.node.node_id !== pins.trust.node_id
    || hostname !== pins.trust.onion_hostname
    || fingerprint !== pins.trust.public_key_fingerprint_sha256
    || binding.expires_at !== pins.trust.binding_expires_at
    || options.observedBindingSha256 !== pins.trust.binding_sha256
  ) {
    fail("binding does not match the canonical VOID trust pins");
  }
  const publicKey = await cryptoImpl.subtle.importKey(
    "spki",
    publicDer,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const signature = base64ToBytes(binding.signature.value, "binding signature");
  if (signature.length !== 64) fail("binding signature must contain 64 bytes");
  const verified = await cryptoImpl.subtle.verify(
    { name: "Ed25519" },
    publicKey,
    signature,
    bindingSigningBytes(binding),
  );
  if (!verified) fail("binding Ed25519 signature verification failed");

  return Object.freeze({
    endpoint: endpoint.origin,
    endpoint_is_onion: true,
    signed_onion_hostname: hostname,
    node_id: binding.node.node_id,
    public_key_fingerprint_sha256: fingerprint,
    issued_at: binding.issued_at,
    expires_at: binding.expires_at,
    authority: structuredClone(binding.authority),
  });
}

function canonicalPath(value, label) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    fail(`${label} must be an absolute path`);
  }
  const parsed = new URL(value, "http://void.invalid");
  if (parsed.pathname !== value || parsed.search || parsed.hash || value.includes("\\")) {
    fail(`${label} must be a canonical same-origin path`);
  }
  return value;
}

function validateNetwork(value, label) {
  exactKeys(value, ["name", "chain_id"], label);
  if (value.name !== "VOID Mainnet-0" || value.chain_id !== 2050) {
    fail(`${label} identity mismatch`);
  }
}

export function validateWellKnownDiscovery(document) {
  exactKeys(document, [
    "$schema", "marker", "protocol", "network", "canonical_discovery",
    "authority", "safety", "network_authenticity",
  ], "well-known discovery");
  if (
    document.$schema !== "./void-agent-discovery.schema.json"
    || document.marker !== WELL_KNOWN_DISCOVERY_MARKER
    || document.protocol !== "void-agent-discovery-well-known/1"
  ) {
    fail("well-known discovery marker or protocol mismatch");
  }
  validateNetwork(document.network, "well-known discovery.network");
  if (
    canonicalPath(
      document.canonical_discovery,
      "well-known discovery.canonical_discovery",
    ) !== CANONICAL_DISCOVERY_PATH
  ) {
    fail("well-known discovery canonical path mismatch");
  }
  exactKeys(document.authority, [
    "default", "mutation_authority_granted", "credentials_required",
  ], "well-known discovery.authority");
  if (
    document.authority.default !== "read_only"
    || document.authority.mutation_authority_granted !== false
    || document.authority.credentials_required !== false
  ) {
    fail("well-known discovery authority boundary is not read-only");
  }
  exactKeys(document.safety, [
    "same_origin_only", "follow_redirects", "send_secrets",
    "send_wallet_material", "send_operator_keys", "treat_unknown_as",
  ], "well-known discovery.safety");
  if (
    document.safety.same_origin_only !== true
    || document.safety.follow_redirects !== false
    || document.safety.send_secrets !== false
    || document.safety.send_wallet_material !== false
    || document.safety.send_operator_keys !== false
    || document.safety.treat_unknown_as !== "not_granted"
  ) {
    fail("well-known discovery safety boundary mismatch");
  }
  if (
    canonicalPath(
      document.network_authenticity,
      "well-known discovery.network_authenticity",
    ) !== "/.well-known/void-network-authenticity.json"
  ) {
    fail("well-known discovery authenticity path mismatch");
  }
  return Object.freeze({
    canonical_discovery: document.canonical_discovery,
    network_authenticity: document.network_authenticity,
  });
}

export function validateCanonicalDiscovery(document) {
  exactKeys(document, [
    "$schema", "marker", "protocol", "network", "purpose", "authority",
    "entrypoints", "capabilities", "agent_onboarding", "safety",
  ], "canonical discovery");
  if (
    document.$schema !== "./discovery-v1.schema.json"
    || document.marker !== CANONICAL_DISCOVERY_MARKER
    || document.protocol !== "void-agent-discovery/1"
  ) {
    fail("canonical discovery marker or protocol mismatch");
  }
  validateNetwork(document.network, "canonical discovery.network");
  if (typeof document.purpose !== "string" || document.purpose.length === 0) {
    fail("canonical discovery purpose is missing");
  }
  exactKeys(document.authority, [
    "default", "granted_http_methods", "mutation_authority_granted",
    "credentials_required_for_discovery", "forbidden_assumptions",
  ], "canonical discovery.authority");
  if (
    document.authority.default !== "read_only"
    || document.authority.mutation_authority_granted !== false
    || document.authority.credentials_required_for_discovery !== false
  ) {
    fail("canonical discovery authority boundary is not read-only");
  }
  const methods = document.authority.granted_http_methods;
  if (
    !Array.isArray(methods)
    || methods.length === 0
    || new Set(methods).size !== methods.length
    || methods.some((method) => method !== "GET" && method !== "HEAD")
  ) {
    fail("canonical discovery grants an unsafe HTTP method");
  }
  if (
    !Array.isArray(document.authority.forbidden_assumptions)
    || document.authority.forbidden_assumptions.length === 0
    || document.authority.forbidden_assumptions.some(
      (value) => typeof value !== "string" || value.length === 0,
    )
  ) {
    fail("canonical discovery forbidden assumptions are missing");
  }

  requireObject(document.entrypoints, "canonical discovery.entrypoints");
  for (const [name, value] of Object.entries(document.entrypoints)) {
    canonicalPath(value, `canonical discovery.entrypoints.${name}`);
  }
  if (
    document.entrypoints.capability_negotiation
    !== CAPABILITY_NEGOTIATION_PATH
  ) {
    fail("canonical discovery capability path mismatch");
  }

  if (!Array.isArray(document.capabilities) || document.capabilities.length === 0) {
    fail("canonical discovery capabilities are missing");
  }
  const seen = new Set();
  for (const [index, capability] of document.capabilities.entries()) {
    requireObject(capability, `canonical discovery.capabilities[${index}]`);
    const id = capability.id;
    if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_.-]{0,79}$/.test(id)) {
      fail(`canonical discovery capability id is invalid at index ${index}`);
    }
    if (seen.has(id)) fail(`duplicate canonical discovery capability id: ${id}`);
    seen.add(id);
    if (capability.discovery !== undefined) {
      canonicalPath(
        capability.discovery,
        `canonical discovery capability ${id}.discovery`,
      );
    }
    if (
      capability.state === "live"
      && (
        capability.authority !== "read_only"
        || typeof capability.discovery !== "string"
      )
    ) {
      fail(`live canonical discovery capability is not read-only: ${id}`);
    }
    if (
      capability.state === "guarded"
      && (capability.authority !== "not_granted" || capability.enabled !== false)
    ) {
      fail(`guarded canonical discovery capability grants authority: ${id}`);
    }
  }
  const negotiation = document.capabilities.find(
    (capability) => capability.id === "capability_negotiation",
  );
  if (
    negotiation?.state !== "live"
    || negotiation.authority !== "read_only"
    || negotiation.discovery !== document.entrypoints.capability_negotiation
  ) {
    fail("canonical discovery capability negotiation is inconsistent");
  }

  requireObject(document.agent_onboarding, "canonical discovery.agent_onboarding");
  const steps = document.agent_onboarding.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    fail("canonical discovery onboarding steps are missing");
  }
  for (const [index, step] of steps.entries()) {
    requireObject(step, `canonical discovery.agent_onboarding.steps[${index}]`);
    if (step.action === "fetch") {
      if (step.method !== "GET") {
        fail(`canonical discovery onboarding fetch is not GET at index ${index}`);
      }
      canonicalPath(
        step.path,
        `canonical discovery.agent_onboarding.steps[${index}].path`,
      );
    }
  }
  if (!steps.some((step) => step.action === "enforce_authority_boundary")) {
    fail("canonical discovery authority enforcement step is missing");
  }
  if (
    !Array.isArray(document.agent_onboarding.stop_conditions)
    || document.agent_onboarding.stop_conditions.length === 0
    || document.agent_onboarding.stop_conditions.some(
      (value) => typeof value !== "string" || value.length === 0,
    )
  ) {
    fail("canonical discovery stop conditions are missing");
  }

  exactKeys(document.safety, [
    "same_origin_only", "follow_cross_origin_links_automatically",
    "send_secrets", "send_wallet_material", "send_operator_keys",
    "treat_unknown_capability_as",
  ], "canonical discovery.safety");
  if (
    document.safety.same_origin_only !== true
    || document.safety.follow_cross_origin_links_automatically !== false
    || document.safety.send_secrets !== false
    || document.safety.send_wallet_material !== false
    || document.safety.send_operator_keys !== false
    || document.safety.treat_unknown_capability_as !== "not_granted"
  ) {
    fail("canonical discovery safety boundary mismatch");
  }

  return Object.freeze({
    capability_negotiation: document.entrypoints.capability_negotiation,
    network: Object.freeze({ name: document.network.name, chain_id: 2050 }),
  });
}

export async function discoverReadOnlySurface(endpointValue, options = {}) {
  const origin = normalizeEndpoint(endpointValue);
  const fetchJson = options.fetchJson ?? fetchBoundedJson;
  if (typeof fetchJson !== "function") fail("discovery fetcher is invalid");
  const fetchOptions = {
    maximum: options.maximum ?? 1024 * 1024,
    timeoutMs: options.timeoutMs ?? 8_000,
    cryptoImpl: options.cryptoImpl,
  };
  const wellKnown = validateWellKnownDiscovery(
    await fetchJson(`${origin}${WELL_KNOWN_DISCOVERY_PATH}`, fetchOptions),
  );
  const canonical = validateCanonicalDiscovery(
    await fetchJson(`${origin}${wellKnown.canonical_discovery}`, fetchOptions),
  );
  const catalog = await fetchJson(
    `${origin}${canonical.capability_negotiation}`,
    fetchOptions,
  );
  return Object.freeze({
    contracts: Object.freeze({
      well_known: WELL_KNOWN_DISCOVERY_PATH,
      canonical: wellKnown.canonical_discovery,
      capabilities: canonical.capability_negotiation,
      network_authenticity: wellKnown.network_authenticity,
    }),
    network: canonical.network,
    capabilities: intersectReadOnlyCapabilities(catalog),
  });
}

export function intersectReadOnlyCapabilities(catalog) {
  requireObject(catalog, "catalog");
  if (catalog.marker !== CAPABILITY_MARKER) fail("capability marker mismatch");
  if (catalog.network?.chain_id !== 2050 || catalog.network?.name !== "VOID Mainnet-0") {
    fail("capability network identity mismatch");
  }
  if (
    catalog.authority?.mutation_authority_granted !== false
    || catalog.authority?.payment_submission_active !== false
    || catalog.authority?.work_credit_awards_active !== false
    || catalog.authority?.buy_void_automatic_fulfillment_active !== false
  ) {
    fail("capability authority boundary is not read-only");
  }
  if (!Array.isArray(catalog.capabilities)) fail("catalog.capabilities must be an array");

  const granted = [];
  const not_granted = [];
  const seen = new Set();
  for (const item of catalog.capabilities) {
    const id = typeof item?.id === "string" ? item.id : "invalid";
    if (seen.has(id)) fail(`duplicate capability id: ${id}`);
    seen.add(id);
    const methods = Array.isArray(item?.http_methods) ? item.http_methods : [];
    const paths = Array.isArray(item?.paths) ? item.paths : [];
    const eligible = (
      /^[a-z0-9][a-z0-9_.-]{0,79}$/.test(id)
      && item.enabled === true
      && item.state === "live"
      && item.access === "anonymous"
      && item.authority === "read_only"
      && methods.length > 0
      && methods.every((method) => method === "GET" || method === "HEAD")
      && paths.length > 0
    );
    if (!eligible) {
      not_granted.push({ id, reason: "not_explicitly_live_anonymous_read_only" });
      continue;
    }
    try {
      paths.forEach((path, index) => canonicalPath(path, `${id}.paths[${index}]`));
    } catch {
      not_granted.push({ id, reason: "path_not_same_origin_canonical" });
      continue;
    }
    granted.push(id);
  }
  return Object.freeze({ granted, not_granted });
}

export async function fetchBoundedJsonDocument(url, options = {}) {
  const maximum = options.maximum ?? 512 * 1024;
  const timeoutMs = options.timeoutMs ?? 8_000;
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 2 * 1024 * 1024) {
    fail("maximum response size is invalid");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
    fail("request timeout is invalid");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let bytes;
  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) fail(`request returned HTTP ${response.status}`);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("application/json")) fail("response is not application/json");
    const declared = Number(response.headers.get("content-length") || 0);
    if (Number.isFinite(declared) && declared > maximum) fail("response is too large");
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof Hold) throw error;
    fail(`request failed: ${String(error?.message || error)}`);
  } finally {
    clearTimeout(timer);
  }
  if (bytes.length > maximum) fail("response is too large");
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("response is not strict JSON");
  }
  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoImpl?.subtle) fail("Web Crypto is unavailable");
  return Object.freeze({
    value,
    sha256: hex(await cryptoImpl.subtle.digest("SHA-256", bytes)),
    byte_length: bytes.length,
  });
}

export async function fetchBoundedJson(url, options = {}) {
  return (await fetchBoundedJsonDocument(url, options)).value;
}
