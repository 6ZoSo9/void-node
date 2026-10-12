import crypto from "node:crypto";
import net from "node:net";

export const BOOTSTRAP_RECORD_V2_SCHEMA = "void_public_bootstrap_record_v2";
export const BOOTSTRAP_RECORD_V2_PREFIX = "voidpbr2_";
export const BOOTSTRAP_MANIFEST_V1_SCHEMA = "void_public_bootstrap_v1";
export const BOOTSTRAP_MANIFEST_V1_PREFIX = "voidpbm1_";
export const VOID_NETWORK = "VOID Network";
export const VOID_CHAIN_ID = 2050;
export const MIRROR_ROOT_PATH = "/void/bootstrap/v2";
export const MAX_MANIFEST_BYTES = 1024 * 1024;
export const MIN_MIRRORS = 3;
export const MAX_MIRRORS = 16;
export const MIN_RECORD_VALIDITY_MS = 60 * 60 * 1000;
export const MAX_RECORD_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

const RECORD_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "generated_at",
  "expires_at",
  "manifest",
  "mirrors",
  "policy",
  "authority",
  "record_id",
]);
const MANIFEST_REF_KEYS = Object.freeze([
  "schema",
  "manifest_id",
  "sha256",
  "size_bytes",
]);
const MIRROR_KEYS = Object.freeze([
  "transport",
  "base_url",
  "failure_domain",
]);
const POLICY_KEYS = Object.freeze([
  "minimum_mirror_count",
  "minimum_successes",
  "n_minus_one_required",
  "immutable_content_paths",
  "mutable_latest_alias_allowed",
  "transport_diversity_required",
]);
const MANIFEST_KEYS_HOLD = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "status",
  "generated_at",
  "sync_endpoints",
  "onion_endpoints",
  "private_tailnet_endpoints_published",
  "authority",
  "notes",
  "manifest_id",
]);
const MANIFEST_KEYS_STABLE = Object.freeze([
  ...MANIFEST_KEYS_HOLD.filter((key) => key !== "manifest_id"),
  "expires_at",
  "manifest_id",
]);

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function canonicalValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON cannot contain non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function contentId(prefix, value, idField) {
  const body = structuredClone(value);
  delete body[idField];
  return `${prefix}${sha256Hex(canonicalJson(body))}`;
}

function falseAuthority(raw, label) {
  const authority = exactKeys(raw, AUTHORITY_KEYS, label);
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) throw new Error(`${label} ${key} must be false`);
  }
  return Object.freeze({ ...authority });
}

function decodeBase32NoPadding(text) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of String(text).toLowerCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("invalid base32 character");
    value = (value << 5) | index;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
      value &= (1 << bits) - 1;
    }
  }
  if (bits > 0 && value !== 0) throw new Error("non-canonical base32 tail bits");
  return Buffer.from(out);
}

export function validateTorV3Hostname(rawHostname) {
  const hostname = String(rawHostname || "").trim().toLowerCase();
  if (!/^[a-z2-7]{56}\.onion$/.test(hostname)) {
    throw new Error("Tor mirror hostname must be a canonical v3 onion hostname");
  }
  const decoded = decodeBase32NoPadding(hostname.slice(0, 56));
  if (decoded.length !== 35 || decoded[34] !== 3) {
    throw new Error("Tor mirror hostname has an invalid v3 payload");
  }
  const publicKey = decoded.subarray(0, 32);
  const checksum = decoded.subarray(32, 34);
  const expected = crypto
    .createHash("sha3-256")
    .update(Buffer.from(".onion checksum", "ascii"))
    .update(publicKey)
    .update(Buffer.from([3]))
    .digest()
    .subarray(0, 2);
  if (!checksum.equals(expected)) {
    throw new Error("Tor mirror hostname checksum is invalid");
  }
  return hostname;
}

function validateHttpsHostname(rawHostname) {
  const hostname = String(rawHostname || "").trim().toLowerCase();
  if (net.isIP(hostname)) throw new Error("HTTPS mirror root must use a DNS hostname in this contract version");
  if (hostname.length > 253 || !hostname.includes(".")) {
    throw new Error("HTTPS mirror hostname must be fully qualified");
  }
  if (!/^[a-z0-9.-]+$/.test(hostname) || hostname.includes("..") || hostname.startsWith(".") || hostname.endsWith(".")) {
    throw new Error("HTTPS mirror hostname is not canonical");
  }
  const labels = hostname.split(".");
  for (const label of labels) {
    if (!label || label.length > 63 || label.startsWith("-") || label.endsWith("-")) {
      throw new Error("HTTPS mirror hostname label is invalid");
    }
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".onion")
  ) {
    throw new Error("HTTPS mirror hostname is private, local, or onion-only");
  }
  return hostname;
}

export function normalizeMirrorRoot(rawMirror) {
  const mirror = exactKeys(structuredClone(rawMirror), MIRROR_KEYS, "bootstrap record mirror");
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(String(mirror.failure_domain || ""))) {
    throw new Error("bootstrap mirror failure_domain is invalid");
  }
  if (mirror.transport !== "https" && mirror.transport !== "tor_http") {
    throw new Error("bootstrap mirror transport must be https or tor_http");
  }
  let url;
  try {
    url = new URL(String(mirror.base_url || ""));
  } catch {
    throw new Error("bootstrap mirror base_url is invalid");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("bootstrap mirror base_url must not contain credentials, query, or fragment");
  }
  if (url.pathname !== MIRROR_ROOT_PATH) {
    throw new Error(`bootstrap mirror base_url path must be exactly ${MIRROR_ROOT_PATH}`);
  }
  if (mirror.transport === "https") {
    if (url.protocol !== "https:" || url.port !== "") {
      throw new Error("HTTPS mirror root must use canonical HTTPS port 443");
    }
    validateHttpsHostname(url.hostname);
  } else {
    if (url.protocol !== "http:" || url.port !== "") {
      throw new Error("Tor mirror root must use canonical HTTP virtual port 80");
    }
    validateTorV3Hostname(url.hostname);
  }
  const baseUrl = `${url.protocol}//${url.hostname}${MIRROR_ROOT_PATH}`;
  if (String(mirror.base_url) !== baseUrl) {
    throw new Error("bootstrap mirror base_url must already be canonical");
  }
  return Object.freeze({
    transport: mirror.transport,
    base_url: baseUrl,
    failure_domain: mirror.failure_domain,
  });
}

export function validateMirrorSet(rawMirrors) {
  if (!Array.isArray(rawMirrors) || rawMirrors.length < MIN_MIRRORS || rawMirrors.length > MAX_MIRRORS) {
    throw new Error(`bootstrap record requires ${MIN_MIRRORS} through ${MAX_MIRRORS} mirrors`);
  }
  const mirrors = rawMirrors.map(normalizeMirrorRoot);
  const bases = new Set();
  const hosts = new Set();
  const domains = new Set();
  const transports = new Set();
  for (const mirror of mirrors) {
    const hostname = new URL(mirror.base_url).hostname;
    if (bases.has(mirror.base_url)) throw new Error("bootstrap record contains a duplicate mirror root");
    if (hosts.has(hostname)) throw new Error("bootstrap record mirror hostnames must be distinct");
    if (domains.has(mirror.failure_domain)) throw new Error("bootstrap record failure domains must be distinct");
    bases.add(mirror.base_url);
    hosts.add(hostname);
    domains.add(mirror.failure_domain);
    transports.add(mirror.transport);
  }
  if (!transports.has("https") || !transports.has("tor_http")) {
    throw new Error("bootstrap record mirror set must contain HTTPS and Tor transport diversity");
  }
  return Object.freeze(mirrors.map((entry) => Object.freeze({ ...entry })));
}

function minimalManifestContract(rawManifest, { nowMs = null } = {}) {
  const manifest = plainObject(structuredClone(rawManifest), "bootstrap manifest");
  const stable = Object.prototype.hasOwnProperty.call(manifest, "expires_at");
  exactKeys(manifest, stable ? MANIFEST_KEYS_STABLE : MANIFEST_KEYS_HOLD, "bootstrap manifest");
  if (
    manifest.schema !== BOOTSTRAP_MANIFEST_V1_SCHEMA ||
    manifest.network !== VOID_NETWORK ||
    !Number.isSafeInteger(manifest.chain_id) ||
    manifest.chain_id !== VOID_CHAIN_ID
  ) {
    throw new Error("bootstrap manifest network contract mismatch");
  }
  if (manifest.private_tailnet_endpoints_published !== false) {
    throw new Error("bootstrap manifest violates private Tailnet boundary");
  }
  falseAuthority(manifest.authority, "bootstrap manifest authority");
  if (!Array.isArray(manifest.sync_endpoints) || !Array.isArray(manifest.onion_endpoints)) {
    throw new Error("bootstrap manifest endpoint sets must be arrays");
  }
  if (typeof manifest.notes !== "string" || manifest.notes.length > 4096) {
    throw new Error("bootstrap manifest notes are invalid");
  }

  const generatedAt = Date.parse(String(manifest.generated_at || ""));
  if (!Number.isFinite(generatedAt)) {
    throw new Error("bootstrap manifest generated_at is invalid");
  }
  if (nowMs !== null) {
    if (!Number.isFinite(nowMs)) throw new Error("bootstrap manifest validation time is invalid");
    if (generatedAt > nowMs + 5 * 60 * 1000) {
      throw new Error("bootstrap manifest generated_at is too far in the future");
    }
  }

  if (stable) {
    if (manifest.status !== "stable_https_seed") {
      throw new Error("bootstrap stable manifest status is unsupported by the merged v1 contract");
    }
    if (manifest.sync_endpoints.length < 1 || manifest.sync_endpoints.length > 8) {
      throw new Error("bootstrap stable HTTPS manifest must contain one through eight synchronization endpoints");
    }
    if (manifest.onion_endpoints.length !== 0) {
      throw new Error("bootstrap stable HTTPS manifest must not contain onion endpoints");
    }
    const expiresAt = Date.parse(String(manifest.expires_at || ""));
    if (!Number.isFinite(expiresAt) || expiresAt <= generatedAt) {
      throw new Error("bootstrap stable manifest expires_at is invalid");
    }
    const validity = expiresAt - generatedAt;
    if (validity < MIN_RECORD_VALIDITY_MS || validity > MAX_RECORD_VALIDITY_MS) {
      throw new Error("bootstrap stable manifest validity must be from one hour through seven days");
    }
    if (nowMs !== null && expiresAt <= nowMs) {
      throw new Error("bootstrap stable manifest is expired");
    }
  } else {
    if (manifest.status !== "hold_no_stable_seed") {
      throw new Error("bootstrap hold manifest status is invalid");
    }
    if (manifest.sync_endpoints.length !== 0) {
      throw new Error("bootstrap hold manifest must not contain synchronization endpoints");
    }
    if (manifest.onion_endpoints.length !== 0) {
      throw new Error("bootstrap hold manifest must not contain onion endpoints");
    }
  }

  const expectedManifestId = contentId(BOOTSTRAP_MANIFEST_V1_PREFIX, manifest, "manifest_id");
  if (manifest.manifest_id !== expectedManifestId) {
    throw new Error("bootstrap manifest ID does not match its content");
  }
  return Object.freeze(structuredClone(manifest));
}

export function buildManifestReference(manifestBytes, { nowMs = null } = {}) {
  const bytes = Buffer.from(manifestBytes);
  if (bytes.length < 2 || bytes.length > MAX_MANIFEST_BYTES) {
    throw new Error("bootstrap manifest bytes are outside the allowed size range");
  }
  let manifest;
  try {
    manifest = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("bootstrap manifest bytes are not valid JSON");
  }
  const validated = minimalManifestContract(manifest, { nowMs });
  return Object.freeze({
    schema: validated.schema,
    manifest_id: validated.manifest_id,
    sha256: sha256Hex(bytes),
    size_bytes: bytes.length,
  });
}

function validateManifestReference(rawReference) {
  const reference = exactKeys(structuredClone(rawReference), MANIFEST_REF_KEYS, "bootstrap record manifest reference");
  if (reference.schema !== BOOTSTRAP_MANIFEST_V1_SCHEMA) {
    throw new Error("bootstrap record manifest schema mismatch");
  }
  if (!/^voidpbm1_[0-9a-f]{64}$/.test(String(reference.manifest_id || ""))) {
    throw new Error("bootstrap record manifest ID is malformed");
  }
  if (!/^[0-9a-f]{64}$/.test(String(reference.sha256 || ""))) {
    throw new Error("bootstrap record manifest SHA-256 is malformed");
  }
  if (!Number.isSafeInteger(reference.size_bytes) || reference.size_bytes < 2 || reference.size_bytes > MAX_MANIFEST_BYTES) {
    throw new Error("bootstrap record manifest size is invalid");
  }
  return Object.freeze({ ...reference });
}

function expectedPolicy() {
  return Object.freeze({
    minimum_mirror_count: MIN_MIRRORS,
    minimum_successes: 1,
    n_minus_one_required: true,
    immutable_content_paths: true,
    mutable_latest_alias_allowed: false,
    transport_diversity_required: true,
  });
}

function validatePolicy(rawPolicy) {
  const policy = exactKeys(structuredClone(rawPolicy), POLICY_KEYS, "bootstrap record mirror policy");
  const expected = expectedPolicy();
  for (const key of POLICY_KEYS) {
    if (policy[key] !== expected[key]) {
      throw new Error(`bootstrap record mirror policy ${key} mismatch`);
    }
  }
  return expected;
}

function validateRecordTimes(record, nowMs) {
  if (!Number.isFinite(nowMs)) throw new Error("bootstrap record validation time is invalid");
  const generatedAt = Date.parse(String(record.generated_at || ""));
  const expiresAt = Date.parse(String(record.expires_at || ""));
  if (!Number.isFinite(generatedAt) || !Number.isFinite(expiresAt)) {
    throw new Error("bootstrap record timestamps are invalid");
  }
  if (generatedAt > nowMs + 5 * 60 * 1000) {
    throw new Error("bootstrap record generated_at is too far in the future");
  }
  if (expiresAt <= nowMs) throw new Error("bootstrap record is expired");
  const validity = expiresAt - generatedAt;
  if (validity < MIN_RECORD_VALIDITY_MS || validity > MAX_RECORD_VALIDITY_MS) {
    throw new Error("bootstrap record validity must be from one hour through seven days");
  }
  return Object.freeze({ generatedAt, expiresAt });
}

export function buildBootstrapRecordV2({ manifestBytes, mirrors, generatedAt, expiresAt }) {
  const generatedAtMs = Date.parse(String(generatedAt));
  if (!Number.isFinite(generatedAtMs)) throw new Error("bootstrap record generatedAt is invalid");
  const record = {
    schema: BOOTSTRAP_RECORD_V2_SCHEMA,
    network: VOID_NETWORK,
    chain_id: VOID_CHAIN_ID,
    generated_at: String(generatedAt),
    expires_at: String(expiresAt),
    manifest: buildManifestReference(manifestBytes, { nowMs: generatedAtMs }),
    mirrors: validateMirrorSet(mirrors),
    policy: expectedPolicy(),
    authority: Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false])),
  };
  const withId = { ...record, record_id: contentId(BOOTSTRAP_RECORD_V2_PREFIX, record, "record_id") };
  return validateBootstrapRecordV2(withId, { nowMs: generatedAtMs });
}

export function validateBootstrapRecordV2(rawRecord, { nowMs = Date.now() } = {}) {
  const record = exactKeys(structuredClone(rawRecord), RECORD_KEYS, "bootstrap record v2");
  if (
    record.schema !== BOOTSTRAP_RECORD_V2_SCHEMA ||
    record.network !== VOID_NETWORK ||
    !Number.isSafeInteger(record.chain_id) ||
    record.chain_id !== VOID_CHAIN_ID
  ) {
    throw new Error("bootstrap record v2 network contract mismatch");
  }
  validateRecordTimes(record, nowMs);
  const manifest = validateManifestReference(record.manifest);
  const mirrors = validateMirrorSet(record.mirrors);
  const policy = validatePolicy(record.policy);
  const authority = falseAuthority(record.authority, "bootstrap record v2 authority");
  const expectedId = contentId(BOOTSTRAP_RECORD_V2_PREFIX, record, "record_id");
  if (record.record_id !== expectedId) {
    throw new Error("bootstrap record v2 ID does not match its content");
  }
  return Object.freeze({
    ...record,
    manifest,
    mirrors,
    policy,
    authority,
  });
}

export function deriveMirroredManifestUrl(mirror, manifestId) {
  const normalized = normalizeMirrorRoot(mirror);
  if (!/^voidpbm1_[0-9a-f]{64}$/.test(String(manifestId || ""))) {
    throw new Error("manifest ID is malformed");
  }
  return `${normalized.base_url}/manifests/${manifestId}.json`;
}

export function deriveMirroredRecordUrl(mirror, recordId) {
  const normalized = normalizeMirrorRoot(mirror);
  if (!/^voidpbr2_[0-9a-f]{64}$/.test(String(recordId || ""))) {
    throw new Error("bootstrap record ID is malformed");
  }
  return `${normalized.base_url}/records/${recordId}.json`;
}

export function validateManifestBytesAgainstRecord(record, rawBytes, { nowMs = Date.now() } = {}) {
  const validatedRecord = validateBootstrapRecordV2(record, { nowMs });
  const bytes = Buffer.from(rawBytes);
  if (bytes.length !== validatedRecord.manifest.size_bytes) {
    throw new Error("mirrored manifest byte length mismatch");
  }
  if (sha256Hex(bytes) !== validatedRecord.manifest.sha256) {
    throw new Error("mirrored manifest SHA-256 mismatch");
  }
  const reference = buildManifestReference(bytes, { nowMs });
  if (reference.manifest_id !== validatedRecord.manifest.manifest_id) {
    throw new Error("mirrored manifest content ID mismatch");
  }
  return Object.freeze({ bytes, manifest: JSON.parse(bytes.toString("utf8")), reference });
}

export async function resolveManifestFromBootstrapRecordV2(
  rawRecord,
  fetchBytes,
  { nowMs = Date.now() } = {},
) {
  if (typeof fetchBytes !== "function") throw new Error("fetchBytes must be a function");
  const record = validateBootstrapRecordV2(rawRecord, { nowMs });
  const failures = [];
  for (const mirror of record.mirrors) {
    const url = deriveMirroredManifestUrl(mirror, record.manifest.manifest_id);
    try {
      const raw = await fetchBytes({ mirror, url, manifest: record.manifest });
      const bytes = Buffer.from(raw);
      const verified = validateManifestBytesAgainstRecord(record, bytes, { nowMs });
      return Object.freeze({
        record,
        mirror,
        url,
        manifest: verified.manifest,
        bytes: verified.bytes,
        failures: Object.freeze([...failures]),
      });
    } catch (error) {
      failures.push(Object.freeze({
        mirror: mirror.base_url,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
  const summary = failures.map((entry) => `${entry.mirror}: ${entry.error}`).join("; ");
  throw new Error(`all bootstrap record mirrors failed: ${summary}`);
}
