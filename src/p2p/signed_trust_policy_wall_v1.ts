// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign as cryptoSign,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";
import {
  appendFile,
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import * as net from "node:net";
import * as path from "node:path";

export const VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER =
  "VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1";
export const VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1 =
  "void-p2p-signed-trust-policy-v1";
export const VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1 =
  "void-p2p-signed-trust-policy-envelope-v1";
export const VOID_P2P_TRUST_ROOT_SET_SCHEMA_V1 =
  "void-p2p-trust-root-set-v1";
export const VOID_P2P_TRUST_ACTIVATION_SCHEMA_V1 =
  "void-p2p-trust-policy-activation-v1";

const SIGNING_DOMAIN = "VOID_P2P_SIGNED_TRUST_POLICY_V1\n";
const NODE_ID_PATTERN = /^[0-9a-f]{64}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const EPOCH_PATTERN = /^[1-9][0-9]{0,39}$/;
const KEY_ID_PATTERN = /^[0-9a-f]{64}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export type VoidP2pTrustPolicyPeerV1 = Readonly<{
  host: string;
  port: number;
  expected_node_id: string;
}>;

export type VoidP2pSignedTrustPolicyV1 = Readonly<{
  schema: typeof VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1;
  network_id: string;
  epoch: string;
  issued_at: string;
  not_before: string;
  expires_at: string;
  previous_policy_sha256?: string;
  allow_node_ids: readonly string[];
  deny_node_ids: readonly string[];
  peers: readonly VoidP2pTrustPolicyPeerV1[];
}>;

export type VoidP2pTrustPolicySignatureV1 = Readonly<{
  key_id: string;
  signature_base64: string;
}>;

export type VoidP2pSignedTrustPolicyEnvelopeV1 = Readonly<{
  schema: typeof VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1;
  policy: VoidP2pSignedTrustPolicyV1;
  signatures: readonly VoidP2pTrustPolicySignatureV1[];
}>;

export type VoidP2pTrustRootKeyV1 = Readonly<{
  key_id: string;
  public_key_pem: string;
}>;

export type VoidP2pTrustRootSetV1 = Readonly<{
  schema: typeof VOID_P2P_TRUST_ROOT_SET_SCHEMA_V1;
  network_id: string;
  threshold: number;
  keys: readonly VoidP2pTrustRootKeyV1[];
}>;

export type VoidP2pTrustPolicyVerificationOptionsV1 = Readonly<{
  expected_network_id: string;
  now_ms?: number;
  max_clock_skew_ms?: number;
  max_policy_lifetime_ms?: number;
  max_allow_node_ids?: number;
  max_deny_node_ids?: number;
  max_peers?: number;
  max_document_bytes?: number;
}>;

export type VoidP2pVerifiedTrustPolicyV1 = Readonly<{
  marker: typeof VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER;
  policy: VoidP2pSignedTrustPolicyV1;
  policy_sha256: string;
  envelope_sha256: string;
  signer_key_ids: readonly string[];
  threshold: number;
  derived_edge_environment: Readonly<Record<string, string>>;
}>;

export type VoidP2pTrustPolicyActivationRecordV1 = Readonly<{
  schema: typeof VOID_P2P_TRUST_ACTIVATION_SCHEMA_V1;
  network_id: string;
  epoch: string;
  policy_sha256: string;
  envelope_sha256: string;
  signer_key_ids: readonly string[];
  threshold: number;
  activated_at: string;
  generation: string;
}>;

export type VoidP2pTrustPolicyActivationResultV1 = Readonly<{
  verified: VoidP2pVerifiedTrustPolicyV1;
  activation: VoidP2pTrustPolicyActivationRecordV1;
  state_dir: string;
  generation_dir: string;
  current_link: string;
  already_active: boolean;
}>;

export class VoidP2pTrustPolicyHoldV1 extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VoidP2pTrustPolicyHoldV1";
    this.code = code;
  }
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

function hold(code: string, message: string): never {
  throw new VoidP2pTrustPolicyHoldV1(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(record: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const expected = new Set(allowed);
  const actual = Object.keys(record);
  for (const key of actual) {
    if (!expected.has(key)) hold("unexpected_field", `${label}.${key} is not allowed`);
  }
  for (const key of allowed) {
    if (!(key in record)) hold("missing_field", `${label}.${key} is required`);
  }
}

function exactKeysWithOptional(
  record: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) hold("unexpected_field", `${label}.${key} is not allowed`);
  }
  for (const key of required) {
    if (!(key in record)) hold("missing_field", `${label}.${key} is required`);
  }
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") hold("invalid_type", `${label} must be a string`);
  return value;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) hold("invalid_type", `${label} must be an array`);
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    hold("invalid_type", `${label} must be a safe integer`);
  }
  return value;
}

function assertNetworkId(value: string, label = "network_id"): string {
  if (value.length < 3 || value.length > 128) {
    hold("invalid_network_id", `${label} length must be 3..128`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) {
    hold("invalid_network_id", `${label} contains unsupported characters`);
  }
  return value;
}

function assertNodeId(value: string, label: string): string {
  if (!NODE_ID_PATTERN.test(value)) {
    hold("invalid_node_id", `${label} must be exactly 64 lowercase hex characters`);
  }
  return value;
}

function assertSha256(value: string, label: string): string {
  if (!SHA256_PATTERN.test(value)) {
    hold("invalid_sha256", `${label} must be exactly 64 lowercase hex characters`);
  }
  return value;
}

function assertEpoch(value: string, label = "epoch"): bigint {
  if (!EPOCH_PATTERN.test(value)) {
    hold("invalid_epoch", `${label} must be a positive canonical decimal string`);
  }
  return BigInt(value);
}

function assertIsoInstant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    hold("invalid_time", `${label} must be a canonical ISO-8601 UTC instant`);
  }
  return parsed;
}

function assertSortedUnique(values: readonly string[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) {
      hold("noncanonical_order", `${label} must be strictly sorted and duplicate-free`);
    }
  }
}

function assertHost(value: string, label: string): string {
  if (value !== value.trim() || value.length < 1 || value.length > 253) {
    hold("invalid_peer_host", `${label} must be trimmed and 1..253 characters`);
  }
  if (/\s|[\u0000-\u001f\u007f]/.test(value)) {
    hold("invalid_peer_host", `${label} contains whitespace or control characters`);
  }
  if (/[\/@?#]/.test(value) || value === "*" || value === "0.0.0.0" || value === "::" || value === "[::]") {
    hold("invalid_peer_host", `${label} is not a dialable host`);
  }
  const ip = net.isIP(value);
  if (ip !== 0) return value;
  const labels = value.split(".");
  if (
    labels.some(
      (part) =>
        part.length < 1 ||
        part.length > 63 ||
        !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(part),
    )
  ) {
    hold("invalid_peer_host", `${label} is neither an IP literal nor a valid DNS name`);
  }
  return value;
}

function peerSortKey(peer: VoidP2pTrustPolicyPeerV1): string {
  return `${peer.expected_node_id}\u0000${peer.host.toLowerCase()}\u0000${String(peer.port).padStart(5, "0")}`;
}

function canonicalJsonInternal(value: unknown, stack: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      hold("noncanonical_json", "canonical JSON permits only finite safe integers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (stack.has(value)) hold("noncanonical_json", "cyclic JSON value");
    stack.add(value);
    const rendered = `[${value.map((entry) => canonicalJsonInternal(entry, stack)).join(",")}]`;
    stack.delete(value);
    return rendered;
  }
  if (isRecord(value)) {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      hold("noncanonical_json", "canonical JSON objects must be plain objects");
    }
    if (stack.has(value)) hold("noncanonical_json", "cyclic JSON value");
    stack.add(value);
    const keys = Object.keys(value).sort();
    const rendered = `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJsonInternal(value[key], stack)}`)
      .join(",")}}`;
    stack.delete(value);
    return rendered;
  }
  hold("noncanonical_json", `unsupported JSON value type: ${typeof value}`);
}

export function canonicalVoidP2pTrustJsonV1(value: JsonValue): string {
  return canonicalJsonInternal(value, new Set<object>());
}

function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function publicKeyId(key: KeyObject): string {
  const der = key.export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex");
}

export function voidP2pTrustKeyIdFromPublicKeyPemV1(publicKeyPem: string): string {
  let key: KeyObject;
  try {
    key = createPublicKey(publicKeyPem);
  } catch {
    return hold("invalid_public_key", "public key PEM could not be parsed");
  }
  if (key.asymmetricKeyType !== "ed25519") {
    hold("invalid_public_key", "trust root key must be Ed25519");
  }
  return publicKeyId(key);
}

function parsePeer(value: unknown, index: number): VoidP2pTrustPolicyPeerV1 {
  if (!isRecord(value)) hold("invalid_peer", `peers[${index}] must be an object`);
  exactKeys(value, ["host", "port", "expected_node_id"], `peers[${index}]`);
  const host = assertHost(requireString(value.host, `peers[${index}].host`), `peers[${index}].host`);
  const port = requireInteger(value.port, `peers[${index}].port`);
  if (port < 1 || port > 65535) hold("invalid_peer_port", `peers[${index}].port must be 1..65535`);
  const expectedNodeId = assertNodeId(
    requireString(value.expected_node_id, `peers[${index}].expected_node_id`),
    `peers[${index}].expected_node_id`,
  );
  return Object.freeze({ host, port, expected_node_id: expectedNodeId });
}

export function parseVoidP2pSignedTrustPolicyV1(value: unknown): VoidP2pSignedTrustPolicyV1 {
  if (!isRecord(value)) hold("invalid_policy", "policy must be an object");
  exactKeysWithOptional(
    value,
    [
      "schema",
      "network_id",
      "epoch",
      "issued_at",
      "not_before",
      "expires_at",
      "allow_node_ids",
      "deny_node_ids",
      "peers",
    ],
    ["previous_policy_sha256"],
    "policy",
  );
  if (value.schema !== VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1) {
    hold("invalid_schema", `policy.schema must be ${VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1}`);
  }
  const networkId = assertNetworkId(requireString(value.network_id, "policy.network_id"), "policy.network_id");
  const epoch = requireString(value.epoch, "policy.epoch");
  assertEpoch(epoch, "policy.epoch");
  const issuedAt = requireString(value.issued_at, "policy.issued_at");
  const notBefore = requireString(value.not_before, "policy.not_before");
  const expiresAt = requireString(value.expires_at, "policy.expires_at");
  assertIsoInstant(issuedAt, "policy.issued_at");
  assertIsoInstant(notBefore, "policy.not_before");
  assertIsoInstant(expiresAt, "policy.expires_at");

  let previousPolicySha256: string | undefined;
  if (value.previous_policy_sha256 !== undefined) {
    previousPolicySha256 = assertSha256(
      requireString(value.previous_policy_sha256, "policy.previous_policy_sha256"),
      "policy.previous_policy_sha256",
    );
  }

  const allow = requireArray(value.allow_node_ids, "policy.allow_node_ids").map((entry, index) =>
    assertNodeId(requireString(entry, `policy.allow_node_ids[${index}]`), `policy.allow_node_ids[${index}]`),
  );
  const deny = requireArray(value.deny_node_ids, "policy.deny_node_ids").map((entry, index) =>
    assertNodeId(requireString(entry, `policy.deny_node_ids[${index}]`), `policy.deny_node_ids[${index}]`),
  );
  assertSortedUnique(allow, "policy.allow_node_ids");
  assertSortedUnique(deny, "policy.deny_node_ids");
  const peers = requireArray(value.peers, "policy.peers").map(parsePeer);
  for (let index = 1; index < peers.length; index += 1) {
    if (peerSortKey(peers[index - 1]!) >= peerSortKey(peers[index]!)) {
      hold("noncanonical_order", "policy.peers must be strictly sorted and duplicate-free");
    }
  }

  const overlap = allow.find((nodeId) => deny.includes(nodeId));
  if (overlap) hold("ambiguous_policy", `node ID appears in both allow and deny lists: ${overlap}`);
  const allowSet = new Set(allow);
  const denySet = new Set(deny);
  for (const peer of peers) {
    if (!allowSet.has(peer.expected_node_id)) {
      hold("peer_not_allowlisted", `peer ${peer.host}:${peer.port} is not in allow_node_ids`);
    }
    if (denySet.has(peer.expected_node_id)) {
      hold("peer_denied", `peer ${peer.host}:${peer.port} is denied`);
    }
  }

  return Object.freeze({
    schema: VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1,
    network_id: networkId,
    epoch,
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    ...(previousPolicySha256 ? { previous_policy_sha256: previousPolicySha256 } : {}),
    allow_node_ids: Object.freeze([...allow]),
    deny_node_ids: Object.freeze([...deny]),
    peers: Object.freeze([...peers]),
  });
}

function parseSignature(value: unknown, index: number): VoidP2pTrustPolicySignatureV1 {
  if (!isRecord(value)) hold("invalid_signature", `signatures[${index}] must be an object`);
  exactKeys(value, ["key_id", "signature_base64"], `signatures[${index}]`);
  const keyId = requireString(value.key_id, `signatures[${index}].key_id`);
  if (!KEY_ID_PATTERN.test(keyId)) hold("invalid_key_id", `signatures[${index}].key_id must be 64 lowercase hex`);
  const signatureBase64 = requireString(value.signature_base64, `signatures[${index}].signature_base64`);
  if (!BASE64_PATTERN.test(signatureBase64)) {
    hold("invalid_signature", `signatures[${index}].signature_base64 is not canonical base64`);
  }
  const bytes = Buffer.from(signatureBase64, "base64");
  if (bytes.length !== 64 || bytes.toString("base64") !== signatureBase64) {
    hold("invalid_signature", `signatures[${index}] must contain a canonical 64-byte Ed25519 signature`);
  }
  return Object.freeze({ key_id: keyId, signature_base64: signatureBase64 });
}

export function parseVoidP2pSignedTrustPolicyEnvelopeV1(
  value: unknown,
): VoidP2pSignedTrustPolicyEnvelopeV1 {
  if (!isRecord(value)) hold("invalid_envelope", "policy envelope must be an object");
  exactKeys(value, ["schema", "policy", "signatures"], "envelope");
  if (value.schema !== VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1) {
    hold(
      "invalid_schema",
      `envelope.schema must be ${VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1}`,
    );
  }
  const policy = parseVoidP2pSignedTrustPolicyV1(value.policy);
  const signatures = requireArray(value.signatures, "envelope.signatures").map(parseSignature);
  assertSortedUnique(
    signatures.map((signature) => signature.key_id),
    "envelope.signatures",
  );
  return Object.freeze({
    schema: VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1,
    policy,
    signatures: Object.freeze([...signatures]),
  });
}

function parseRootKey(value: unknown, index: number): VoidP2pTrustRootKeyV1 {
  if (!isRecord(value)) hold("invalid_root_key", `root_set.keys[${index}] must be an object`);
  exactKeys(value, ["key_id", "public_key_pem"], `root_set.keys[${index}]`);
  const keyId = requireString(value.key_id, `root_set.keys[${index}].key_id`);
  if (!KEY_ID_PATTERN.test(keyId)) hold("invalid_key_id", `root_set.keys[${index}].key_id must be 64 lowercase hex`);
  const publicKeyPem = requireString(value.public_key_pem, `root_set.keys[${index}].public_key_pem`);
  const derived = voidP2pTrustKeyIdFromPublicKeyPemV1(publicKeyPem);
  if (derived !== keyId) {
    hold("root_key_id_mismatch", `root_set.keys[${index}] key_id does not match its public key`);
  }
  return Object.freeze({ key_id: keyId, public_key_pem: publicKeyPem });
}

export function parseVoidP2pTrustRootSetV1(value: unknown): VoidP2pTrustRootSetV1 {
  if (!isRecord(value)) hold("invalid_root_set", "root set must be an object");
  exactKeys(value, ["schema", "network_id", "threshold", "keys"], "root_set");
  if (value.schema !== VOID_P2P_TRUST_ROOT_SET_SCHEMA_V1) {
    hold("invalid_schema", `root_set.schema must be ${VOID_P2P_TRUST_ROOT_SET_SCHEMA_V1}`);
  }
  const networkId = assertNetworkId(requireString(value.network_id, "root_set.network_id"), "root_set.network_id");
  const threshold = requireInteger(value.threshold, "root_set.threshold");
  const keys = requireArray(value.keys, "root_set.keys").map(parseRootKey);
  assertSortedUnique(
    keys.map((key) => key.key_id),
    "root_set.keys",
  );
  if (keys.length < 1) hold("empty_root_set", "root_set.keys must not be empty");
  if (threshold < 1 || threshold > keys.length) {
    hold("invalid_threshold", "root_set.threshold must be between 1 and the root key count");
  }
  return Object.freeze({
    schema: VOID_P2P_TRUST_ROOT_SET_SCHEMA_V1,
    network_id: networkId,
    threshold,
    keys: Object.freeze([...keys]),
  });
}

function signingBytes(policy: VoidP2pSignedTrustPolicyV1): Buffer {
  return Buffer.from(`${SIGNING_DOMAIN}${canonicalVoidP2pTrustJsonV1(policy as unknown as JsonValue)}`, "utf8");
}

function verifyPolicyTimes(
  policy: VoidP2pSignedTrustPolicyV1,
  options: VoidP2pTrustPolicyVerificationOptionsV1,
): void {
  const now = options.now_ms ?? Date.now();
  if (!Number.isSafeInteger(now) || now < 0) hold("invalid_now", "now_ms must be a nonnegative safe integer");
  const skew = options.max_clock_skew_ms ?? 60_000;
  const maxLifetime = options.max_policy_lifetime_ms ?? 30 * 24 * 60 * 60_000;
  if (!Number.isSafeInteger(skew) || skew < 0 || skew > 24 * 60 * 60_000) {
    hold("invalid_limit", "max_clock_skew_ms is outside the supported range");
  }
  if (!Number.isSafeInteger(maxLifetime) || maxLifetime < 1 || maxLifetime > 366 * 24 * 60 * 60_000) {
    hold("invalid_limit", "max_policy_lifetime_ms is outside the supported range");
  }
  const issued = assertIsoInstant(policy.issued_at, "policy.issued_at");
  const notBefore = assertIsoInstant(policy.not_before, "policy.not_before");
  const expires = assertIsoInstant(policy.expires_at, "policy.expires_at");
  if (issued > notBefore || notBefore >= expires) {
    hold("invalid_time_order", "policy times must satisfy issued_at <= not_before < expires_at");
  }
  if (expires - notBefore > maxLifetime) {
    hold("policy_lifetime_exceeded", "policy validity exceeds max_policy_lifetime_ms");
  }
  if (issued > now + skew) hold("policy_issued_in_future", "policy.issued_at is too far in the future");
  if (now + skew < notBefore) hold("policy_not_yet_valid", "policy is not yet valid");
  if (now - skew >= expires) hold("policy_expired", "policy has expired");
}

function deriveEdgeEnvironment(
  policy: VoidP2pSignedTrustPolicyV1,
): Readonly<Record<string, string>> {
  return Object.freeze({
    VOID_P2P_EDGE_WALL_NETWORK_ID: policy.network_id,
    VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS: policy.allow_node_ids.join(","),
    VOID_P2P_EDGE_WALL_DENY_NODE_IDS: policy.deny_node_ids.join(","),
    VOID_P2P_EDGE_WALL_PERMISSIONLESS: "0",
    VOID_P2P_EDGE_WALL_PEERS_JSON: JSON.stringify(policy.peers),
  });
}

function verifyPolicyLimits(
  policy: VoidP2pSignedTrustPolicyV1,
  options: VoidP2pTrustPolicyVerificationOptionsV1,
): void {
  const maxAllow = options.max_allow_node_ids ?? 1_024;
  const maxDeny = options.max_deny_node_ids ?? 1_024;
  const maxPeers = options.max_peers ?? 256;
  for (const [label, value, hardMaximum] of [
    ["max_allow_node_ids", maxAllow, 100_000],
    ["max_deny_node_ids", maxDeny, 100_000],
    ["max_peers", maxPeers, 10_000],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0 || value > hardMaximum) {
      hold("invalid_limit", `${label} is outside the supported range`);
    }
  }
  if (policy.allow_node_ids.length < 1) {
    hold("fail_closed_empty_allowlist", "signed trust policy requires at least one allowlisted node ID");
  }
  if (policy.allow_node_ids.length > maxAllow) hold("policy_limit_exceeded", "allow_node_ids exceeds limit");
  if (policy.deny_node_ids.length > maxDeny) hold("policy_limit_exceeded", "deny_node_ids exceeds limit");
  if (policy.peers.length > maxPeers) hold("policy_limit_exceeded", "peers exceeds limit");
}

export function verifyVoidP2pSignedTrustPolicyV1(input: Readonly<{
  envelope: unknown;
  root_set: unknown;
  options: VoidP2pTrustPolicyVerificationOptionsV1;
}>): VoidP2pVerifiedTrustPolicyV1 {
  const envelope = parseVoidP2pSignedTrustPolicyEnvelopeV1(input.envelope);
  const rootSet = parseVoidP2pTrustRootSetV1(input.root_set);
  const expectedNetworkId = assertNetworkId(input.options.expected_network_id, "expected_network_id");
  if (rootSet.network_id !== expectedNetworkId) {
    hold("root_network_mismatch", "root set is bound to a different VOID network ID");
  }
  if (envelope.policy.network_id !== expectedNetworkId) {
    hold("policy_network_mismatch", "signed policy is bound to a different VOID network ID");
  }
  verifyPolicyTimes(envelope.policy, input.options);
  verifyPolicyLimits(envelope.policy, input.options);

  const policyCanonical = canonicalVoidP2pTrustJsonV1(envelope.policy as unknown as JsonValue);
  const envelopeCanonical = canonicalVoidP2pTrustJsonV1(envelope as unknown as JsonValue);
  const maxDocumentBytes = input.options.max_document_bytes ?? 1024 * 1024;
  if (!Number.isSafeInteger(maxDocumentBytes) || maxDocumentBytes < 1 || maxDocumentBytes > 16 * 1024 * 1024) {
    hold("invalid_limit", "max_document_bytes is outside the supported range");
  }
  if (Buffer.byteLength(envelopeCanonical, "utf8") > maxDocumentBytes) {
    hold("document_too_large", "signed trust policy envelope exceeds max_document_bytes");
  }

  const rootById = new Map(rootSet.keys.map((entry) => [entry.key_id, entry]));
  const validSigners: string[] = [];
  const message = Buffer.from(`${SIGNING_DOMAIN}${policyCanonical}`, "utf8");
  for (const signature of envelope.signatures) {
    const root = rootById.get(signature.key_id);
    if (!root) hold("unknown_signer", `signature key is not in the pinned root set: ${signature.key_id}`);
    const publicKey = createPublicKey(root.public_key_pem);
    const signatureBytes = Buffer.from(signature.signature_base64, "base64");
    if (!cryptoVerify(null, message, publicKey, signatureBytes)) {
      hold("invalid_signature", `signature verification failed for key ${signature.key_id}`);
    }
    validSigners.push(signature.key_id);
  }
  if (validSigners.length < rootSet.threshold) {
    hold(
      "threshold_not_met",
      `valid signature count ${validSigners.length} is below pinned threshold ${rootSet.threshold}`,
    );
  }

  const derived = deriveEdgeEnvironment(envelope.policy);
  return Object.freeze({
    marker: VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER,
    policy: envelope.policy,
    policy_sha256: sha256Hex(policyCanonical),
    envelope_sha256: sha256Hex(envelopeCanonical),
    signer_key_ids: Object.freeze([...validSigners]),
    threshold: rootSet.threshold,
    derived_edge_environment: derived,
  });
}

export function signVoidP2pTrustPolicyV1(input: Readonly<{
  policy: unknown;
  private_key_pem: string;
  existing_signatures?: readonly VoidP2pTrustPolicySignatureV1[];
}>): VoidP2pSignedTrustPolicyEnvelopeV1 {
  const policy = parseVoidP2pSignedTrustPolicyV1(input.policy);
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey(input.private_key_pem);
  } catch {
    return hold("invalid_private_key", "private signing key PEM could not be parsed");
  }
  if (privateKey.asymmetricKeyType !== "ed25519") {
    hold("invalid_private_key", "policy signing key must be Ed25519");
  }
  const publicKey = createPublicKey(privateKey);
  const keyId = publicKeyId(publicKey);
  const signatureBase64 = cryptoSign(null, signingBytes(policy), privateKey).toString("base64");
  const existing = (input.existing_signatures ?? []).map((entry, index) => parseSignature(entry, index));
  const byId = new Map(existing.map((entry) => [entry.key_id, entry]));
  byId.set(keyId, Object.freeze({ key_id: keyId, signature_base64: signatureBase64 }));
  const signatures = [...byId.values()].sort((left, right) => left.key_id.localeCompare(right.key_id));
  return Object.freeze({
    schema: VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1,
    policy,
    signatures: Object.freeze(signatures),
  });
}

export function createVoidP2pTrustRootSetV1(input: Readonly<{
  network_id: string;
  threshold: number;
  public_key_pems: readonly string[];
}>): VoidP2pTrustRootSetV1 {
  const networkId = assertNetworkId(input.network_id);
  const keys = input.public_key_pems
    .map((publicKeyPem) => ({
      key_id: voidP2pTrustKeyIdFromPublicKeyPemV1(publicKeyPem),
      public_key_pem: publicKeyPem,
    }))
    .sort((left, right) => left.key_id.localeCompare(right.key_id));
  return parseVoidP2pTrustRootSetV1({
    schema: VOID_P2P_TRUST_ROOT_SET_SCHEMA_V1,
    network_id: networkId,
    threshold: input.threshold,
    keys,
  });
}

async function readJson(pathname: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await readFile(pathname, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return hold("file_read_failed", `failed to read ${pathname}: ${message}`);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return hold("invalid_json", `${pathname} is not valid JSON`);
  }
}

export async function readVoidP2pTrustPolicyInputsV1(input: Readonly<{
  envelope_file: string;
  root_set_file: string;
}>): Promise<Readonly<{ envelope: unknown; root_set: unknown }>> {
  return Object.freeze({
    envelope: await readJson(path.resolve(input.envelope_file)),
    root_set: await readJson(path.resolve(input.root_set_file)),
  });
}

async function assertDirectoryNotSymlink(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    hold("unsafe_state_directory", "state_dir must be a real directory, not a symlink");
  }
  await chmod(directory, 0o700);
}

async function fsyncFile(pathname: string): Promise<void> {
  const handle = await open(pathname, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function fsyncDirectory(pathname: string): Promise<void> {
  const handle = await open(pathname, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function ensureActivationJournalRecord(
  stateDir: string,
  activation: VoidP2pTrustPolicyActivationRecordV1,
): Promise<void> {
  const journalPath = path.join(stateDir, "activation.ndjson");
  const expected = canonicalVoidP2pTrustJsonV1(
    activation as unknown as JsonValue,
  );
  let raw = "";
  try {
    const info = await lstat(journalPath);
    if (!info.isFile() || info.isSymbolicLink()) {
      hold(
        "unsafe_activation_journal",
        "activation journal must be a regular file",
      );
    }
    raw = await readFile(journalPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  if (raw && !raw.endsWith("\n")) {
    hold(
      "invalid_activation_journal",
      "activation journal must end at a complete record boundary",
    );
  }

  const lines = raw ? raw.slice(0, -1).split("\n") : [];
  let previousEpoch = 0n;
  let exactMatches = 0;
  for (const [index, line] of lines.entries()) {
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(line);
    } catch {
      hold(
        "invalid_activation_journal",
        `activation journal line ${index + 1} is not valid JSON`,
      );
    }
    const parsed = parseVoidP2pTrustPolicyActivationRecordV1(
      parsedValue,
      `activation_journal[${index}]`,
    );
    if (parsed.network_id !== activation.network_id) {
      hold(
        "invalid_activation_journal",
        `activation journal line ${index + 1} is bound to a different network`,
      );
    }
    const canonical = canonicalVoidP2pTrustJsonV1(
      parsed as unknown as JsonValue,
    );
    if (canonical !== line) {
      hold(
        "invalid_activation_journal",
        `activation journal line ${index + 1} is not canonical`,
      );
    }
    const epoch = BigInt(parsed.epoch);
    if (epoch <= previousEpoch) {
      hold(
        "invalid_activation_journal",
        "activation journal epochs must be strictly increasing",
      );
    }
    previousEpoch = epoch;
    if (line === expected) exactMatches += 1;
    else if (parsed.epoch === activation.epoch) {
      hold(
        "activation_journal_conflict",
        "active epoch conflicts with its durable journal record",
      );
    }
  }

  if (exactMatches > 1) {
    hold(
      "invalid_activation_journal",
      "active activation record appears more than once",
    );
  }
  if (exactMatches === 1 && lines.at(-1) !== expected) {
    hold(
      "invalid_activation_journal",
      "active activation record must be the journal tail",
    );
  }
  if (exactMatches === 0) {
    const activeEpoch = BigInt(activation.epoch);
    if (previousEpoch >= activeEpoch) {
      hold(
        "activation_journal_conflict",
        "activation journal is ahead of the active policy",
      );
    }
    await appendFile(journalPath, `${expected}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await chmod(journalPath, 0o600);
  }
  await fsyncFile(journalPath);
  await fsyncDirectory(stateDir);
}

async function writeExclusiveJson(pathname: string, value: JsonValue): Promise<void> {
  const handle = await open(pathname, "wx", 0o600);
  try {
    await handle.writeFile(`${canonicalVoidP2pTrustJsonV1(value)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

const ACTIVATION_RECORD_KEYS_V1 = [
  "schema",
  "network_id",
  "epoch",
  "policy_sha256",
  "envelope_sha256",
  "signer_key_ids",
  "threshold",
  "activated_at",
  "generation",
] as const;

function parseVoidP2pTrustPolicyActivationRecordV1(
  value: unknown,
  label = "activation",
): VoidP2pTrustPolicyActivationRecordV1 {
  if (!isRecord(value)) hold("invalid_activation", `${label} must be an object`);
  exactKeys(value, ACTIVATION_RECORD_KEYS_V1, label);
  if (value.schema !== VOID_P2P_TRUST_ACTIVATION_SCHEMA_V1) {
    hold("invalid_activation", `${label} schema mismatch`);
  }
  const activation: VoidP2pTrustPolicyActivationRecordV1 = Object.freeze({
    schema: VOID_P2P_TRUST_ACTIVATION_SCHEMA_V1,
    network_id: assertNetworkId(
      requireString(value.network_id, `${label}.network_id`),
      `${label}.network_id`,
    ),
    epoch: requireString(value.epoch, `${label}.epoch`),
    policy_sha256: assertSha256(
      requireString(value.policy_sha256, `${label}.policy_sha256`),
      `${label}.policy_sha256`,
    ),
    envelope_sha256: assertSha256(
      requireString(value.envelope_sha256, `${label}.envelope_sha256`),
      `${label}.envelope_sha256`,
    ),
    signer_key_ids: Object.freeze(
      requireArray(value.signer_key_ids, `${label}.signer_key_ids`).map(
        (entry, index) => {
          const keyId = requireString(
            entry,
            `${label}.signer_key_ids[${index}]`,
          );
          if (!KEY_ID_PATTERN.test(keyId)) {
            hold(
              "invalid_activation",
              `${label} signer key ID is invalid`,
            );
          }
          return keyId;
        },
      ),
    ),
    threshold: requireInteger(value.threshold, `${label}.threshold`),
    activated_at: requireString(
      value.activated_at,
      `${label}.activated_at`,
    ),
    generation: requireString(value.generation, `${label}.generation`),
  });
  assertEpoch(activation.epoch, `${label}.epoch`);
  assertIsoInstant(activation.activated_at, `${label}.activated_at`);
  assertSortedUnique(activation.signer_key_ids, `${label}.signer_key_ids`);
  if (
    activation.threshold < 1 ||
    activation.threshold > activation.signer_key_ids.length
  ) {
    hold(
      "invalid_activation",
      `${label} threshold is inconsistent with signer_key_ids`,
    );
  }
  const expectedGeneration =
    `${activation.epoch.padStart(40, "0")}-${activation.policy_sha256}`;
  if (activation.generation !== expectedGeneration) {
    hold(
      "invalid_activation",
      `${label} generation must bind epoch and policy_sha256`,
    );
  }
  return activation;
}

async function readActiveRecord(stateDir: string): Promise<Readonly<{
  activation: VoidP2pTrustPolicyActivationRecordV1;
  generation_dir: string;
}> | null> {
  const current = path.join(stateDir, "current");
  let info;
  try {
    info = await lstat(current);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (!info.isSymbolicLink()) hold("unsafe_current_pointer", "state current pointer must be a symbolic link");
  const target = await readlink(current);
  if (path.isAbsolute(target)) hold("unsafe_current_pointer", "state current pointer must be relative");
  const normalized = path.normalize(target);
  if (!normalized.startsWith(`generations${path.sep}`) || normalized.includes(`..${path.sep}`)) {
    hold("unsafe_current_pointer", "state current pointer escapes the generations directory");
  }
  const generationDir = path.resolve(stateDir, normalized);
  const generationsRoot = path.resolve(stateDir, "generations") + path.sep;
  if (!generationDir.startsWith(generationsRoot)) {
    hold("unsafe_current_pointer", "state current pointer escapes the generations directory");
  }
  const generationInfo = await lstat(generationDir);
  if (!generationInfo.isDirectory() || generationInfo.isSymbolicLink()) {
    hold("unsafe_current_pointer", "active generation must be a real directory");
  }
  const activation = parseVoidP2pTrustPolicyActivationRecordV1(
    await readJson(path.join(generationDir, "activation.json")),
  );
  if (activation.generation !== path.basename(generationDir)) {
    hold("invalid_activation", "activation generation does not match current target");
  }
  return Object.freeze({ activation, generation_dir: generationDir });
}
export async function activateVoidP2pSignedTrustPolicyV1(input: Readonly<{
  envelope: unknown;
  root_set: unknown;
  options: VoidP2pTrustPolicyVerificationOptionsV1;
  state_dir: string;
}>): Promise<VoidP2pTrustPolicyActivationResultV1> {
  const verified = verifyVoidP2pSignedTrustPolicyV1(input);
  const stateDir = path.resolve(input.state_dir);
  await assertDirectoryNotSymlink(stateDir);
  const generationsDir = path.join(stateDir, "generations");
  await assertDirectoryNotSymlink(generationsDir);
  const lockPath = path.join(stateDir, "activation.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return hold("activation_locked", "another trust-policy activation holds the state lock");
    }
    throw error;
  }
  const nonce = `${process.pid}-${randomBytes(8).toString("hex")}`;
  const stagingDir = path.join(generationsDir, `.staging-${nonce}`);
  const temporaryLink = path.join(stateDir, `.current-${nonce}`);
  try {
    await lock.writeFile(`${process.pid}\n${new Date().toISOString()}\n`, "utf8");
    await lock.sync();
    const current = await readActiveRecord(stateDir);
    const newEpoch = assertEpoch(verified.policy.epoch, "policy.epoch");
    if (current) {
      await ensureActivationJournalRecord(stateDir, current.activation);
      const currentEpoch = assertEpoch(current.activation.epoch, "activation.epoch");
      if (newEpoch < currentEpoch) {
        hold("policy_rollback", "signed policy epoch is lower than the active epoch");
      }
      if (newEpoch === currentEpoch) {
        if (verified.policy_sha256 !== current.activation.policy_sha256) {
          hold("epoch_reuse", "signed policy reuses the active epoch with different content");
        }
        return Object.freeze({
          verified,
          activation: current.activation,
          state_dir: stateDir,
          generation_dir: current.generation_dir,
          current_link: path.join(stateDir, "current"),
          already_active: true,
        });
      }
      if (verified.policy.previous_policy_sha256 !== current.activation.policy_sha256) {
        hold("broken_policy_chain", "new policy does not name the active policy SHA-256 as its predecessor");
      }
    } else {
      if (newEpoch !== 1n) hold("invalid_genesis_epoch", "first activated signed policy must use epoch 1");
      if (verified.policy.previous_policy_sha256 !== undefined) {
        hold("invalid_genesis_predecessor", "epoch 1 must not declare previous_policy_sha256");
      }
    }

    const generation = `${verified.policy.epoch.padStart(40, "0")}-${verified.policy_sha256}`;
    const generationDir = path.join(generationsDir, generation);
    try {
      await lstat(generationDir);
      hold("generation_exists", "target policy generation already exists unexpectedly");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await mkdir(stagingDir, { mode: 0o700 });
    const envelope = parseVoidP2pSignedTrustPolicyEnvelopeV1(input.envelope);
    const activatedAt = new Date(input.options.now_ms ?? Date.now()).toISOString();
    const activation: VoidP2pTrustPolicyActivationRecordV1 = Object.freeze({
      schema: VOID_P2P_TRUST_ACTIVATION_SCHEMA_V1,
      network_id: verified.policy.network_id,
      epoch: verified.policy.epoch,
      policy_sha256: verified.policy_sha256,
      envelope_sha256: verified.envelope_sha256,
      signer_key_ids: verified.signer_key_ids,
      threshold: verified.threshold,
      activated_at: activatedAt,
      generation,
    });
    await writeExclusiveJson(
      path.join(stagingDir, "policy-envelope.json"),
      envelope as unknown as JsonValue,
    );
    await writeExclusiveJson(
      path.join(stagingDir, "edge-wall-environment.json"),
      verified.derived_edge_environment as unknown as JsonValue,
    );
    await writeExclusiveJson(
      path.join(stagingDir, "activation.json"),
      activation as unknown as JsonValue,
    );
    await fsyncDirectory(stagingDir);
    await rename(stagingDir, generationDir);
    await fsyncDirectory(generationsDir);
    await symlink(path.join("generations", generation), temporaryLink);
    await rename(temporaryLink, path.join(stateDir, "current"));
    await fsyncDirectory(stateDir);
    await ensureActivationJournalRecord(stateDir, activation);
    return Object.freeze({
      verified,
      activation,
      state_dir: stateDir,
      generation_dir: generationDir,
      current_link: path.join(stateDir, "current"),
      already_active: false,
    });
  } finally {
    await lock.close().catch(() => undefined);
    await rm(lockPath, { force: true }).catch(() => undefined);
    await rm(stagingDir, { recursive: true, force: true }).catch(() => undefined);
    await rm(temporaryLink, { force: true }).catch(() => undefined);
  }
}

export async function loadActiveVoidP2pTrustPolicyV1(stateDir: string): Promise<Readonly<{
  activation: VoidP2pTrustPolicyActivationRecordV1;
  environment: Readonly<Record<string, string>>;
  envelope: VoidP2pSignedTrustPolicyEnvelopeV1;
}> | null> {
  const resolved = path.resolve(stateDir);
  const current = await readActiveRecord(resolved);
  if (!current) return null;
  const environmentValue = await readJson(path.join(current.generation_dir, "edge-wall-environment.json"));
  if (!isRecord(environmentValue)) hold("invalid_active_environment", "active environment must be an object");
  const requiredKeys = [
    "VOID_P2P_EDGE_WALL_NETWORK_ID",
    "VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS",
    "VOID_P2P_EDGE_WALL_DENY_NODE_IDS",
    "VOID_P2P_EDGE_WALL_PERMISSIONLESS",
    "VOID_P2P_EDGE_WALL_PEERS_JSON",
  ] as const;
  exactKeys(environmentValue, requiredKeys, "active_environment");
  const environment: Record<string, string> = {};
  for (const key of requiredKeys) {
    const value = environmentValue[key];
    if (typeof value !== "string") {
      hold("invalid_active_environment", `active environment entry must be a string: ${key}`);
    }
    environment[key] = value;
  }
  if (environment.VOID_P2P_EDGE_WALL_PERMISSIONLESS !== "0") {
    hold("invalid_active_environment", "active environment attempted to enable permissionless admission");
  }
  const envelopeValue = await readJson(path.join(current.generation_dir, "policy-envelope.json"));
  const envelope = parseVoidP2pSignedTrustPolicyEnvelopeV1(envelopeValue);
  const policyCanonical = canonicalVoidP2pTrustJsonV1(envelope.policy as unknown as JsonValue);
  const envelopeCanonical = canonicalVoidP2pTrustJsonV1(envelope as unknown as JsonValue);
  if (sha256Hex(policyCanonical) !== current.activation.policy_sha256) {
    hold("active_policy_corrupt", "active policy hash does not match activation record");
  }
  if (sha256Hex(envelopeCanonical) !== current.activation.envelope_sha256) {
    hold("active_policy_corrupt", "active envelope hash does not match activation record");
  }
  const expectedEnvironment = deriveEdgeEnvironment(envelope.policy);
  if (canonicalVoidP2pTrustJsonV1(environment as unknown as JsonValue) !==
      canonicalVoidP2pTrustJsonV1(expectedEnvironment as unknown as JsonValue)) {
    hold("active_policy_corrupt", "active environment does not match the active policy");
  }
  return Object.freeze({
    activation: current.activation,
    environment: Object.freeze(environment),
    envelope,
  });
}

export async function writeVoidP2pSignedTrustEnvelopeExclusiveV1(
  pathname: string,
  envelope: VoidP2pSignedTrustPolicyEnvelopeV1,
): Promise<void> {
  const resolved = path.resolve(pathname);
  await mkdir(path.dirname(resolved), { recursive: true, mode: 0o700 });
  await writeExclusiveJson(resolved, envelope as unknown as JsonValue);
}
