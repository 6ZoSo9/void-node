export const VOID_SOVEREIGN_NAME_RECORD_MARKER =
  "VOID_SOVEREIGN_NAME_RECORD_V1";
export const VOID_SOVEREIGN_NAME_SCHEMA =
  "urn:void:schema:sovereign-name-record:1";
export const VOID_SOVEREIGN_NAME_SIGNATURE_DOMAIN =
  "VOID_SOVEREIGN_NAME_RECORD_V1";
export const VOID_MAINNET0_NAMESPACE_AUTHORITY_KEY_ID =
  "ed25519:00e7609bf643b41c7cae625c3ae51f5d55c06ec1adba35e8eb80300c64e77a7c";

const MAINNET_GENESIS_SHA256 =
  "22f42ef6cfa8e4ebfbc5ea98cdc536ec04c1bb4ddb15885b45b1ac02d0f122ab";
const ONION_PATTERN = /^[a-z2-7]{56}\.onion$/;
const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
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

export class SovereignNameHold extends Error {
  constructor(message) {
    super(message);
    this.name = "SovereignNameHold";
  }
}

function fail(message) {
  throw new SovereignNameHold(message);
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

function requireHex(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail(`${label} is not canonical lowercase hexadecimal`);
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

function pemToDer(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  const match = value.match(
    /^-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=\n]+)\n-----END PUBLIC KEY-----\n$/,
  );
  if (!match) fail(`${label} is not canonical public-key PEM`);
  return base64ToBytes(match[1].replaceAll("\n", ""), label);
}

function hex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function sovereignNameCanonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(sovereignNameCanonicalJson).join(",")}]`;
  }
  if (!isObject(value)) fail("canonical JSON accepts plain objects only");
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${sovereignNameCanonicalJson(value[key])}`
  )).join(",")}}`;
}

export function sovereignNameRecordSigningBytes(record) {
  const copy = structuredClone(requireObject(record, "record"));
  requireObject(copy.signature, "record.signature");
  delete copy.signature.value;
  const prefix = new TextEncoder().encode(
    `${VOID_SOVEREIGN_NAME_SIGNATURE_DOMAIN}\0`,
  );
  const body = new TextEncoder().encode(sovereignNameCanonicalJson(copy));
  const output = new Uint8Array(prefix.length + body.length);
  output.set(prefix, 0);
  output.set(body, prefix.length);
  return output;
}

export async function sovereignNameRecordSha256(record, options = {}) {
  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoImpl?.subtle) fail("Web Crypto is unavailable");
  const bytes = new TextEncoder().encode(sovereignNameCanonicalJson(record));
  return hex(await cryptoImpl.subtle.digest("SHA-256", bytes));
}

function canonicalHttpsEndpoint(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("HTTPS transport endpoint must be an absolute URL");
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.port
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || parsed.origin !== value
  ) {
    fail("HTTPS transport endpoint must be a canonical default-port origin");
  }
  if (parsed.hostname.endsWith(".onion")) {
    fail("HTTPS transport endpoint must not be an onion address");
  }
  return parsed.origin;
}

function canonicalOnionEndpoint(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("Tor transport endpoint must be an absolute URL");
  }
  if (
    parsed.protocol !== "http:"
    || parsed.username
    || parsed.password
    || parsed.port
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || !ONION_PATTERN.test(parsed.hostname)
    || parsed.origin !== value
  ) {
    fail("Tor transport endpoint must be a canonical HTTP Tor v3 origin");
  }
  return parsed.origin;
}

async function parseEd25519PublicKey(pem, label, cryptoImpl) {
  const der = pemToDer(pem, label);
  const fingerprint = hex(await cryptoImpl.subtle.digest("SHA-256", der));
  let key;
  try {
    key = await cryptoImpl.subtle.importKey(
      "spki",
      der,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
  } catch {
    fail(`${label} is not an Ed25519 public key`);
  }
  return { der, fingerprint, key };
}

export async function verifyVoidSovereignNameRecord(record, options = {}) {
  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  if (!cryptoImpl?.subtle) fail("Web Crypto is unavailable");
  const namespaceAuthority = requireObject(
    options.namespaceAuthority,
    "namespace authority",
  );
  exactKeys(
    namespaceAuthority,
    ["key_id", "public_key_pem"],
    "namespace authority",
  );

  exactKeys(record, [
    "$schema", "marker", "version", "status", "issued_at", "expires_at",
    "sequence", "previous_record_sha256", "network", "namespace", "name",
    "subject", "transports", "authority", "signature",
  ], "record");
  if (
    record.$schema !== VOID_SOVEREIGN_NAME_SCHEMA
    || record.marker !== VOID_SOVEREIGN_NAME_RECORD_MARKER
    || record.version !== 1
    || record.status !== "active"
  ) {
    fail("record schema, marker, version, or status mismatch");
  }

  exactKeys(
    record.network,
    ["name", "chain_id", "identity", "genesis_sha256"],
    "record.network",
  );
  if (
    record.network.name !== "VOID Mainnet-0"
    || record.network.chain_id !== 2050
    || record.network.identity !== "mainnet0"
    || record.network.genesis_sha256 !== MAINNET_GENESIS_SHA256
  ) {
    fail("record network identity mismatch");
  }

  exactKeys(
    record.namespace,
    ["name", "authority_key_id"],
    "record.namespace",
  );
  if (record.namespace.name !== "void") fail("record namespace mismatch");

  exactKeys(record.name, ["labels", "canonical"], "record.name");
  if (
    !Array.isArray(record.name.labels)
    || record.name.labels.length < 1
    || record.name.labels.length > 8
    || record.name.labels.some((label) => (
      typeof label !== "string" || !LABEL_PATTERN.test(label)
    ))
  ) {
    fail("record name labels are invalid");
  }
  const canonicalName = `void://${record.name.labels.join("/")}`;
  if (record.name.canonical !== canonicalName) {
    fail("record canonical name mismatch");
  }
  if (
    options.expectedCanonicalName !== undefined
    && options.expectedCanonicalName !== canonicalName
  ) {
    fail("record does not match the expected canonical name");
  }

  if (!Number.isSafeInteger(record.sequence) || record.sequence < 1) {
    fail("record sequence must be a positive safe integer");
  }
  if (record.sequence === 1) {
    if (record.previous_record_sha256 !== null) {
      fail("first record must not claim a previous record");
    }
  } else {
    requireHex(
      record.previous_record_sha256,
      HEX_64,
      "record.previous_record_sha256",
    );
  }
  if (
    options.minimumSequence !== undefined
    && record.sequence < options.minimumSequence
  ) {
    fail("record sequence rollback rejected");
  }
  if (
    options.expectedPreviousRecordSha256 !== undefined
    && record.previous_record_sha256 !== options.expectedPreviousRecordSha256
  ) {
    fail("record hash chain mismatch");
  }

  exactKeys(record.subject, [
    "identity", "node_id", "key_type", "key_id", "public_key_pem",
    "public_key_fingerprint_sha256",
  ], "record.subject");
  requireHex(record.subject.node_id, HEX_32, "record.subject.node_id");
  if (record.subject.key_type !== "ed25519") {
    fail("record subject key type mismatch");
  }
  const subjectKey = await parseEd25519PublicKey(
    record.subject.public_key_pem,
    "record subject public key",
    cryptoImpl,
  );
  const subjectKeyId = `ed25519:${subjectKey.fingerprint}`;
  const subjectIdentity = `voidid:ed25519:${subjectKey.fingerprint}`;
  if (
    record.subject.public_key_fingerprint_sha256 !== subjectKey.fingerprint
    || record.subject.key_id !== subjectKeyId
    || record.subject.identity !== subjectIdentity
  ) {
    fail("record subject self-certifying identity mismatch");
  }
  if (
    options.expectedIdentity !== undefined
    && options.expectedIdentity !== subjectIdentity
  ) {
    fail("record does not match the expected subject identity");
  }

  const issued = requireTimestamp(record.issued_at, "record.issued_at");
  const expires = requireTimestamp(record.expires_at, "record.expires_at");
  const nowMs = options.nowMs ?? Date.now();
  if (issued.getTime() > nowMs + 120_000) fail("record issuance is in the future");
  if (expires.getTime() <= nowMs) fail("record is expired");
  if (expires.getTime() <= issued.getTime()) fail("record validity interval is invalid");
  if (expires.getTime() - issued.getTime() > 366 * 24 * 60 * 60 * 1000) {
    fail("record validity exceeds 366 days");
  }

  if (!Array.isArray(record.transports) || record.transports.length < 1) {
    fail("record must contain at least one transport");
  }
  if (record.transports.length > 8) fail("record has too many transports");
  const endpoints = new Set();
  const priorities = new Set();
  let previousPriority = -1;
  const transports = record.transports.map((transport, index) => {
    exactKeys(
      transport,
      ["kind", "endpoint", "priority", "expires_at"],
      `record.transports[${index}]`,
    );
    if (!Number.isInteger(transport.priority) || transport.priority < 0) {
      fail("transport priority must be a non-negative integer");
    }
    if (transport.priority <= previousPriority || priorities.has(transport.priority)) {
      fail("transport priorities must be unique and strictly increasing");
    }
    previousPriority = transport.priority;
    priorities.add(transport.priority);
    let endpoint;
    if (transport.kind === "https") {
      endpoint = canonicalHttpsEndpoint(transport.endpoint);
    } else if (transport.kind === "tor-v3") {
      endpoint = canonicalOnionEndpoint(transport.endpoint);
    } else {
      fail("transport kind is unsupported");
    }
    if (endpoints.has(endpoint)) fail("transport endpoints must be unique");
    endpoints.add(endpoint);
    const transportExpires = requireTimestamp(
      transport.expires_at,
      `record.transports[${index}].expires_at`,
    );
    if (transportExpires.getTime() <= nowMs) fail("transport is expired");
    if (transportExpires.getTime() > expires.getTime()) {
      fail("transport outlives the name record");
    }
    return Object.freeze({
      kind: transport.kind,
      endpoint,
      priority: transport.priority,
      expires_at: transport.expires_at,
    });
  });

  exactKeys(
    record.authority,
    Object.keys(RESOLUTION_ONLY_AUTHORITY),
    "record.authority",
  );
  for (const [key, expected] of Object.entries(RESOLUTION_ONLY_AUTHORITY)) {
    if (record.authority[key] !== expected) {
      fail(`record authority.${key} mismatch`);
    }
  }

  const authorityKey = await parseEd25519PublicKey(
    namespaceAuthority.public_key_pem,
    "namespace authority public key",
    cryptoImpl,
  );
  const authorityKeyId = `ed25519:${authorityKey.fingerprint}`;
  const expectedAuthorityKeyId = options.expectedNamespaceAuthorityKeyId
    ?? VOID_MAINNET0_NAMESPACE_AUTHORITY_KEY_ID;
  if (
    namespaceAuthority.key_id !== authorityKeyId
    || record.namespace.authority_key_id !== authorityKeyId
    || authorityKeyId !== expectedAuthorityKeyId
  ) {
    fail("namespace authority key mismatch");
  }

  exactKeys(record.signature, [
    "domain", "algorithm", "encoding", "canonicalization", "key_id", "value",
  ], "record.signature");
  if (
    record.signature.domain !== VOID_SOVEREIGN_NAME_SIGNATURE_DOMAIN
    || record.signature.algorithm !== "ed25519"
    || record.signature.encoding !== "base64"
    || record.signature.canonicalization !== "void-canonical-json-v1"
    || record.signature.key_id !== authorityKeyId
  ) {
    fail("record signature profile mismatch");
  }
  const signature = base64ToBytes(record.signature.value, "record signature");
  if (signature.length !== 64) fail("record signature must contain 64 bytes");
  const verified = await cryptoImpl.subtle.verify(
    { name: "Ed25519" },
    authorityKey.key,
    signature,
    sovereignNameRecordSigningBytes(record),
  );
  if (!verified) fail("record Ed25519 signature verification failed");

  return Object.freeze({
    canonical_name: canonicalName,
    subject_identity: subjectIdentity,
    subject_node_id: record.subject.node_id,
    subject_public_key_fingerprint_sha256: subjectKey.fingerprint,
    namespace_authority_key_id: authorityKeyId,
    sequence: record.sequence,
    previous_record_sha256: record.previous_record_sha256,
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    transports: Object.freeze(transports),
    authority: Object.freeze(structuredClone(record.authority)),
  });
}
