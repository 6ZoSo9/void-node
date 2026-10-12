import { Hold, canonicalJson } from "./core.mjs";

export const CLEARWEB_ORIGIN_BINDING_MARKER =
  "VOID_BROWSER_CLEARWEB_ORIGIN_BINDING_V1";
export const CLEARWEB_ORIGIN_BINDING_PATH =
  "/.well-known/void-browser-clearweb-origin-binding-v1.json";

const SIGNATURE_DOMAIN = CLEARWEB_ORIGIN_BINDING_MARKER;
const ONION_HOSTNAME_PATTERN = /^[a-z2-7]{56}\.onion$/;
const DNS_LABEL_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

const READ_ONLY_AUTHORITY = Object.freeze({
  read_only: true,
  transaction_submission: false,
  payment_authority: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
  void_settlement: false,
  node_runtime_mutation: false,
  operator_control: false,
});

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

function requireHex(value, length, label) {
  if (
    typeof value !== "string"
    || !new RegExp(`^[0-9a-f]{${length}}$`).test(value)
  ) {
    fail(`${label} must be ${length} lowercase hexadecimal characters`);
  }
  return value;
}

function requireTimestamp(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== value) {
    fail(`${label} must be canonical ISO-8601`);
  }
  return timestamp;
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
  return base64ToBytes(
    match[1].replaceAll("\n", ""),
    "binding public key PEM",
  );
}

function hex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalPath(value, label) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    fail(`${label} must be an absolute path`);
  }
  const parsed = new URL(value, "https://void.invalid");
  if (
    parsed.pathname !== value
    || parsed.search
    || parsed.hash
    || value.includes("\\")
  ) {
    fail(`${label} must be a canonical same-origin path`);
  }
  return value;
}

function canonicalClearwebOrigin(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be an absolute URL`);
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || parsed.port
    || parsed.origin !== value
  ) {
    fail(`${label} must be a canonical default-port HTTPS origin`);
  }
  const labels = parsed.hostname.split(".");
  if (
    parsed.hostname.endsWith(".onion")
    || parsed.hostname.length > 253
    || labels.length < 2
    || labels.some((entry) => !DNS_LABEL_PATTERN.test(entry))
    || !/^[a-z]{2,63}$/.test(labels.at(-1))
  ) {
    fail(`${label} must use a public ASCII DNS hostname`);
  }
  return parsed;
}

function observedClearwebOrigin(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    fail("observed endpoint must be an absolute URL");
  }
  if (
    parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    fail("observed endpoint must be an origin without credentials or a path");
  }
  return canonicalClearwebOrigin(parsed.origin, "observed endpoint");
}

function validateTrustPins(value) {
  exactKeys(
    value,
    ["marker", "version", "network", "source", "trust"],
    "trust pins",
  );
  if (value.marker !== "VOID_BROWSER_AGENT_TRUST_PINS_V1" || value.version !== 1) {
    fail("trust pin marker or version mismatch");
  }
  exactKeys(value.network, ["chain_id", "identity"], "trust pins.network");
  if (value.network.chain_id !== 2050 || value.network.identity !== "mainnet0") {
    fail("trust pin network mismatch");
  }
  exactKeys(
    value.source,
    ["repository", "base_commit", "profile_path"],
    "trust pins.source",
  );
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
  if (!ONION_HOSTNAME_PATTERN.test(value.trust.onion_hostname)) {
    fail("trust pin onion hostname is invalid");
  }
  requireHex(value.trust.node_id, 32, "trust pins.trust.node_id");
  requireHex(
    value.trust.public_key_fingerprint_sha256,
    64,
    "trust pins.trust.public_key_fingerprint_sha256",
  );
  requireHex(
    value.trust.binding_sha256,
    64,
    "trust pins.trust.binding_sha256",
  );
  requireTimestamp(
    value.trust.binding_expires_at,
    "trust pins.trust.binding_expires_at",
  );
  return value;
}

export function clearwebOriginBindingSigningBytes(binding) {
  const copy = structuredClone(requireObject(binding, "binding"));
  requireObject(copy.signature, "binding.signature");
  delete copy.signature.value;
  const prefix = new TextEncoder().encode(`${SIGNATURE_DOMAIN}\0`);
  const body = new TextEncoder().encode(canonicalJson(copy));
  const bytes = new Uint8Array(prefix.length + body.length);
  bytes.set(prefix, 0);
  bytes.set(body, prefix.length);
  return bytes;
}

export async function verifySignedClearwebOriginBinding(
  binding,
  endpointValue,
  options = {},
) {
  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoImpl?.subtle) fail("Web Crypto is unavailable");
  const pins = validateTrustPins(options.trustPins);

  exactKeys(binding, [
    "$schema", "marker", "version", "status", "issued_at", "expires_at",
    "network", "origin", "node", "onion_identity", "surface", "authority",
    "signature",
  ], "binding");
  if (
    binding.$schema
      !== "https://voidchain.io/schemas/void-browser-clearweb-origin-binding-v1.schema.json"
    || binding.marker !== CLEARWEB_ORIGIN_BINDING_MARKER
    || binding.version !== 1
    || binding.status !== "active"
  ) {
    fail("binding schema, marker, version, or status mismatch");
  }

  exactKeys(
    binding.network,
    ["name", "chain_id", "identity"],
    "binding.network",
  );
  if (
    binding.network.name !== "VOID Mainnet-0"
    || binding.network.chain_id !== 2050
    || binding.network.identity !== "mainnet0"
  ) {
    fail("binding network identity mismatch");
  }

  exactKeys(
    binding.origin,
    ["value", "scheme", "host", "port"],
    "binding.origin",
  );
  const signedOrigin = canonicalClearwebOrigin(
    binding.origin.value,
    "binding.origin.value",
  );
  if (
    binding.origin.scheme !== "https"
    || binding.origin.host !== signedOrigin.hostname
    || binding.origin.port !== 443
  ) {
    fail("binding origin profile mismatch");
  }
  const observedOrigin = observedClearwebOrigin(endpointValue);
  if (observedOrigin.origin !== signedOrigin.origin) {
    fail("observed endpoint does not match the signed clearweb origin");
  }

  exactKeys(binding.node, [
    "node_id", "key_type", "public_key_pem", "public_key_fingerprint_sha256",
  ], "binding.node");
  requireHex(binding.node.node_id, 32, "binding.node.node_id");
  if (binding.node.key_type !== "ed25519") fail("binding node key type mismatch");
  requireHex(
    binding.node.public_key_fingerprint_sha256,
    64,
    "binding.node.public_key_fingerprint_sha256",
  );

  exactKeys(binding.onion_identity, [
    "onion_hostname", "binding_sha256", "binding_expires_at",
  ], "binding.onion_identity");
  if (!ONION_HOSTNAME_PATTERN.test(binding.onion_identity.onion_hostname)) {
    fail("binding onion hostname is invalid");
  }
  requireHex(
    binding.onion_identity.binding_sha256,
    64,
    "binding.onion_identity.binding_sha256",
  );
  const onionBindingExpires = requireTimestamp(
    binding.onion_identity.binding_expires_at,
    "binding.onion_identity.binding_expires_at",
  );

  exactKeys(binding.surface, [
    "binding_path", "well_known_discovery_path", "canonical_discovery_path",
    "capability_negotiation_path", "methods", "same_origin_only",
  ], "binding.surface");
  if (
    canonicalPath(binding.surface.binding_path, "binding.surface.binding_path")
      !== CLEARWEB_ORIGIN_BINDING_PATH
    || canonicalPath(
      binding.surface.well_known_discovery_path,
      "binding.surface.well_known_discovery_path",
    ) !== "/.well-known/void-agent-discovery.json"
    || canonicalPath(
      binding.surface.canonical_discovery_path,
      "binding.surface.canonical_discovery_path",
    ) !== "/public-node/agents/discovery-v1.json"
    || canonicalPath(
      binding.surface.capability_negotiation_path,
      "binding.surface.capability_negotiation_path",
    ) !== "/public-node/agents/capabilities-v1.json"
    || JSON.stringify(binding.surface.methods) !== JSON.stringify(["GET", "HEAD"])
    || binding.surface.same_origin_only !== true
  ) {
    fail("binding discovery surface mismatch");
  }

  exactKeys(
    binding.authority,
    Object.keys(READ_ONLY_AUTHORITY),
    "binding.authority",
  );
  for (const [key, expected] of Object.entries(READ_ONLY_AUTHORITY)) {
    if (binding.authority[key] !== expected) {
      fail(`binding authority.${key} mismatch`);
    }
  }

  exactKeys(binding.signature, [
    "domain", "algorithm", "encoding", "canonicalization", "key_id", "value",
  ], "binding.signature");
  if (
    binding.signature.domain !== SIGNATURE_DOMAIN
    || binding.signature.algorithm !== "ed25519"
    || binding.signature.encoding !== "base64"
    || binding.signature.canonicalization !== "void-canonical-json-v1"
    || binding.signature.key_id
      !== `ed25519:${binding.node.public_key_fingerprint_sha256}`
  ) {
    fail("binding signature profile mismatch");
  }

  const issued = requireTimestamp(binding.issued_at, "binding.issued_at");
  const expires = requireTimestamp(binding.expires_at, "binding.expires_at");
  const nowMs = options.nowMs ?? Date.now();
  if (issued.getTime() > nowMs + 120_000) fail("binding issuance is in the future");
  if (expires.getTime() <= nowMs) fail("binding is expired");
  if (expires.getTime() <= issued.getTime()) fail("binding validity interval is invalid");
  if (expires.getTime() > onionBindingExpires.getTime()) {
    fail("binding outlives the pinned onion identity");
  }
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
    || fingerprint !== pins.trust.public_key_fingerprint_sha256
    || binding.onion_identity.onion_hostname !== pins.trust.onion_hostname
    || binding.onion_identity.binding_sha256 !== pins.trust.binding_sha256
    || binding.onion_identity.binding_expires_at !== pins.trust.binding_expires_at
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
    clearwebOriginBindingSigningBytes(binding),
  );
  if (!verified) fail("binding Ed25519 signature verification failed");

  return Object.freeze({
    origin: signedOrigin.origin,
    node_id: binding.node.node_id,
    public_key_fingerprint_sha256: fingerprint,
    onion_hostname: binding.onion_identity.onion_hostname,
    onion_binding_sha256: binding.onion_identity.binding_sha256,
    issued_at: binding.issued_at,
    expires_at: binding.expires_at,
    authority: structuredClone(binding.authority),
  });
}
