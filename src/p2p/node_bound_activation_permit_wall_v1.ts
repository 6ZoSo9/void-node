// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  rename,
  rm,
  symlink,
} from "node:fs/promises";
import * as net from "node:net";
import * as path from "node:path";

export const VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER =
  "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1";
export const VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1 =
  "void-p2p-node-bound-activation-permit-v1";
export const VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_ENVELOPE_SCHEMA_V1 =
  "void-p2p-node-bound-activation-permit-envelope-v1";
export const VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_SCHEMA_V1 =
  "void-p2p-activation-permit-root-set-v1";
export const VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1 =
  "void-p2p-activation-runtime-profile-v1";
export const VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_SCHEMA_V1 =
  "void-p2p-activation-permit-consumption-v1";

const SIGNING_DOMAIN = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_V1\n";
const HEX_64 = /^[0-9a-f]{64}$/;
const SEQUENCE = /^[1-9][0-9]{0,39}$/;
const NETWORK_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const HOSTNAME = /^(?=.{1,253}$)(?!-)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(?:\.(?!-)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

export type VoidP2pActivationPermitSignatureV1 = Readonly<{
  key_id: string;
  signature_base64: string;
}>;

export type VoidP2pActivationPermitRootKeyV1 = Readonly<{
  key_id: string;
  public_key_pem: string;
}>;

export type VoidP2pActivationPermitRootSetV1 = Readonly<{
  schema: typeof VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_SCHEMA_V1;
  network_id: string;
  threshold: number;
  keys: readonly VoidP2pActivationPermitRootKeyV1[];
}>;

export type VoidP2pActivationRuntimeProfileV1 = Readonly<{
  schema: typeof VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1;
  network_id: string;
  control: Readonly<{
    activation_permit_state_dir: string;
    trust_policy_state_dir: string;
  }>;
  edge: Readonly<{
    mode: "listen" | "dial" | "both";
    listen_host: string;
    listen_port: number;
    backend_host: string;
    backend_port: number;
    status_host: string;
    status_port: number;
    key_file: string;
    cert_file: string;
    audit_log: string;
  }>;
  limits: Readonly<{
    handshake_timeout_ms: number;
    max_clock_skew_ms: number;
    idle_timeout_ms: number;
    backend_connect_timeout_ms: number;
    max_connections: number;
    max_connections_per_ip: number;
    max_pending_handshakes: number;
    max_auth_line_bytes: number;
    quarantine_threshold: number;
    quarantine_base_ms: number;
    quarantine_max_ms: number;
    reconnect_min_ms: number;
    reconnect_max_ms: number;
  }>;
}>;

export type VoidP2pNodeBoundActivationPermitV1 = Readonly<{
  schema: typeof VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1;
  network_id: string;
  edge_node_id: string;
  sequence: string;
  issued_at: string;
  not_before: string;
  expires_at: string;
  previous_permit_sha256?: string;
  policy_epoch: string;
  policy_sha256: string;
  policy_envelope_sha256: string;
  trust_root_set_sha256: string;
  runtime_profile_sha256: string;
}>;

export type VoidP2pNodeBoundActivationPermitEnvelopeV1 = Readonly<{
  schema: typeof VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_ENVELOPE_SCHEMA_V1;
  permit: VoidP2pNodeBoundActivationPermitV1;
  signatures: readonly VoidP2pActivationPermitSignatureV1[];
}>;

export type VoidP2pActivationPermitVerificationOptionsV1 = Readonly<{
  expected_network_id: string;
  expected_edge_node_id: string;
  expected_policy_epoch: string;
  expected_policy_sha256: string;
  expected_policy_envelope_sha256: string;
  expected_trust_root_set_sha256: string;
  expected_runtime_profile_sha256: string;
  now_ms?: number;
  max_clock_skew_ms?: number;
  max_permit_lifetime_ms?: number;
  max_document_bytes?: number;
}>;

export type VoidP2pVerifiedNodeBoundActivationPermitV1 = Readonly<{
  marker: typeof VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER;
  envelope: VoidP2pNodeBoundActivationPermitEnvelopeV1;
  root_set: VoidP2pActivationPermitRootSetV1;
  permit: VoidP2pNodeBoundActivationPermitV1;
  permit_sha256: string;
  envelope_sha256: string;
  root_set_sha256: string;
  signer_key_ids: readonly string[];
  threshold: number;
}>;

export type VoidP2pActivationPermitConsumptionRecordV1 = Readonly<{
  schema: typeof VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_SCHEMA_V1;
  network_id: string;
  edge_node_id: string;
  sequence: string;
  permit_sha256: string;
  envelope_sha256: string;
  policy_epoch: string;
  policy_sha256: string;
  policy_envelope_sha256: string;
  trust_root_set_sha256: string;
  runtime_profile_sha256: string;
  activation_permit_root_set_sha256: string;
  signer_key_ids: readonly string[];
  threshold: number;
  consumed_at: string;
  generation: string;
}>;

export type VoidP2pActivationPermitConsumptionResultV1 = Readonly<{
  marker: typeof VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER;
  state_dir: string;
  generation: string;
  generation_dir: string;
  sealed_policy_envelope_file: string;
  sealed_trust_root_set_file: string;
  sealed_runtime_profile_file: string;
  consumption: VoidP2pActivationPermitConsumptionRecordV1;
}>;

export class VoidP2pActivationPermitHoldV1 extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VoidP2pActivationPermitHoldV1";
    this.code = code;
  }
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type UnknownRecord = Record<string, unknown>;

function hold(code: string, message: string): never {
  throw new VoidP2pActivationPermitHoldV1(code, message);
}

function record(value: unknown, code: string, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold(code, `${label} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, expected: readonly string[], code: string, label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    hold(code, `${label} fields must be exactly ${wanted.join(",")}`);
  }
}

function stringField(value: unknown, code: string, label: string): string {
  if (typeof value !== "string" || value.length === 0) hold(code, `${label} must be a nonempty string`);
  return value;
}

function integerField(
  value: unknown,
  minimum: number,
  maximum: number,
  code: string,
  label: string,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    hold(code, `${label} must be an integer in [${minimum},${maximum}]`);
  }
  return value as number;
}

function hex64(value: unknown, code: string, label: string): string {
  const rendered = stringField(value, code, label);
  if (!HEX_64.test(rendered)) hold(code, `${label} must be 64 lowercase hexadecimal characters`);
  return rendered;
}

function sequence(value: unknown, code: string, label: string): string {
  const rendered = stringField(value, code, label);
  if (!SEQUENCE.test(rendered)) hold(code, `${label} must be a canonical positive decimal string`);
  return rendered;
}

function networkId(value: unknown, code: string, label: string): string {
  const rendered = stringField(value, code, label);
  if (!NETWORK_ID.test(rendered)) hold(code, `${label} is not a canonical VOID network ID`);
  return rendered;
}

function canonicalInstant(value: unknown, code: string, label: string): Readonly<{ text: string; ms: number }> {
  const text = stringField(value, code, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(text)) {
    hold(code, `${label} must be a canonical UTC millisecond instant`);
  }
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== text) {
    hold(code, `${label} is not a valid canonical UTC instant`);
  }
  return Object.freeze({ text, ms });
}

function jsonValue(value: unknown, label: string): JsonValue {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      hold("noncanonical_json", `${label} contains a noncanonical number`);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => jsonValue(entry, `${label}[${index}]`));
  if (value && typeof value === "object") {
    const output: Record<string, JsonValue> = {};
    for (const key of Object.keys(value as UnknownRecord).sort()) {
      const nested = (value as UnknownRecord)[key];
      if (nested === undefined) hold("noncanonical_json", `${label}.${key} is undefined`);
      output[key] = jsonValue(nested, `${label}.${key}`);
    }
    return output;
  }
  hold("noncanonical_json", `${label} contains unsupported JSON data`);
}

export function canonicalVoidP2pActivationPermitJsonV1(value: unknown): string {
  return JSON.stringify(jsonValue(value, "document"));
}

export function hashVoidP2pActivationPermitDocumentV1(value: unknown): string {
  return sha256Text(canonicalVoidP2pActivationPermitJsonV1(value));
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function publicKeyDer(key: KeyObject): Buffer {
  return key.export({ type: "spki", format: "der" }) as Buffer;
}

export function voidP2pActivationPermitKeyIdFromPublicKeyPemV1(publicKeyPem: string): string {
  let key: KeyObject;
  try {
    key = createPublicKey(publicKeyPem);
  } catch {
    hold("invalid_root_key", "activation-permit public key is malformed");
  }
  if (key.asymmetricKeyType !== "ed25519") {
    hold("invalid_root_key", "activation-permit public key must be Ed25519");
  }
  return createHash("sha256").update(publicKeyDer(key)).digest("hex");
}

function strictSortedUnique(values: readonly string[], code: string, label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) {
      hold(code, `${label} must be strictly sorted and duplicate-free`);
    }
  }
}

export function parseVoidP2pActivationPermitRootSetV1(value: unknown): VoidP2pActivationPermitRootSetV1 {
  const source = record(value, "invalid_root_set", "root set");
  exactKeys(source, ["schema", "network_id", "threshold", "keys"], "invalid_root_set", "root set");
  if (source.schema !== VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_SCHEMA_V1) {
    hold("invalid_root_set", "root set schema mismatch");
  }
  const network_id = networkId(source.network_id, "invalid_root_set", "root set network_id");
  if (!Array.isArray(source.keys) || source.keys.length === 0 || source.keys.length > 64) {
    hold("invalid_root_set", "root set keys must contain 1..64 entries");
  }
  const keys = source.keys.map((entry, index) => {
    const key = record(entry, "invalid_root_set", `root set key ${index}`);
    exactKeys(key, ["key_id", "public_key_pem"], "invalid_root_set", `root set key ${index}`);
    const key_id = hex64(key.key_id, "invalid_root_set", `root set key ${index} key_id`);
    const public_key_pem = stringField(
      key.public_key_pem,
      "invalid_root_set",
      `root set key ${index} public_key_pem`,
    );
    if (voidP2pActivationPermitKeyIdFromPublicKeyPemV1(public_key_pem) !== key_id) {
      hold("invalid_root_set", `root set key ${index} key_id does not match public key`);
    }
    return Object.freeze({ key_id, public_key_pem });
  });
  strictSortedUnique(keys.map((key) => key.key_id), "invalid_root_set", "root set keys");
  const threshold = integerField(source.threshold, 1, keys.length, "invalid_root_set", "root set threshold");
  return Object.freeze({
    schema: VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_SCHEMA_V1,
    network_id,
    threshold,
    keys: Object.freeze(keys),
  });
}

function host(value: unknown, code: string, label: string): string {
  const rendered = stringField(value, code, label);
  if (
    rendered.includes("://") ||
    rendered.includes("/") ||
    rendered.includes("\\") ||
    /\s/.test(rendered) ||
    (!net.isIP(rendered) && rendered !== "localhost" && !HOSTNAME.test(rendered))
  ) {
    hold(code, `${label} must be an IP literal or DNS hostname without a URL/path`);
  }
  return rendered.toLowerCase();
}

function loopbackHost(rendered: string): boolean {
  if (rendered === "localhost" || rendered === "::1") return true;
  if (net.isIPv4(rendered)) return rendered.startsWith("127.");
  return false;
}

function absoluteFile(value: unknown, code: string, label: string): string {
  const rendered = stringField(value, code, label);
  if (!path.isAbsolute(rendered) || rendered.includes("\0")) {
    hold(code, `${label} must be an absolute path`);
  }
  return path.normalize(rendered);
}

export function parseVoidP2pActivationRuntimeProfileV1(value: unknown): VoidP2pActivationRuntimeProfileV1 {
  const source = record(value, "invalid_runtime_profile", "runtime profile");
  exactKeys(
    source,
    ["schema", "network_id", "control", "edge", "limits"],
    "invalid_runtime_profile",
    "runtime profile",
  );
  if (source.schema !== VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1) {
    hold("invalid_runtime_profile", "runtime profile schema mismatch");
  }
  const network_id = networkId(source.network_id, "invalid_runtime_profile", "runtime profile network_id");
  const controlSource = record(source.control, "invalid_runtime_profile", "runtime profile control");
  exactKeys(
    controlSource,
    ["activation_permit_state_dir", "trust_policy_state_dir"],
    "invalid_runtime_profile",
    "runtime profile control",
  );
  const control = Object.freeze({
    activation_permit_state_dir: absoluteFile(
      controlSource.activation_permit_state_dir,
      "invalid_runtime_profile",
      "activation_permit_state_dir",
    ),
    trust_policy_state_dir: absoluteFile(
      controlSource.trust_policy_state_dir,
      "invalid_runtime_profile",
      "trust_policy_state_dir",
    ),
  });
  const edgeSource = record(source.edge, "invalid_runtime_profile", "runtime profile edge");
  exactKeys(
    edgeSource,
    [
      "mode", "listen_host", "listen_port", "backend_host", "backend_port", "status_host",
      "status_port", "key_file", "cert_file", "audit_log",
    ],
    "invalid_runtime_profile",
    "runtime profile edge",
  );
  const mode = stringField(edgeSource.mode, "invalid_runtime_profile", "runtime profile edge mode");
  if (mode !== "listen" && mode !== "dial" && mode !== "both") {
    hold("invalid_runtime_profile", "runtime profile edge mode must be listen, dial, or both");
  }
  const listen_host = host(edgeSource.listen_host, "invalid_runtime_profile", "runtime profile listen_host");
  const backend_host = host(edgeSource.backend_host, "invalid_runtime_profile", "runtime profile backend_host");
  const status_host = host(edgeSource.status_host, "invalid_runtime_profile", "runtime profile status_host");
  if (!loopbackHost(backend_host)) hold("invalid_runtime_profile", "runtime profile backend must be loopback-only");
  if (!loopbackHost(status_host)) hold("invalid_runtime_profile", "runtime profile status must be loopback-only");
  const edge = Object.freeze({
    mode,
    listen_host,
    listen_port: integerField(edgeSource.listen_port, 1, 65535, "invalid_runtime_profile", "listen_port"),
    backend_host,
    backend_port: integerField(edgeSource.backend_port, 1, 65535, "invalid_runtime_profile", "backend_port"),
    status_host,
    status_port: integerField(edgeSource.status_port, 1, 65535, "invalid_runtime_profile", "status_port"),
    key_file: absoluteFile(edgeSource.key_file, "invalid_runtime_profile", "key_file"),
    cert_file: absoluteFile(edgeSource.cert_file, "invalid_runtime_profile", "cert_file"),
    audit_log: absoluteFile(edgeSource.audit_log, "invalid_runtime_profile", "audit_log"),
  }) as VoidP2pActivationRuntimeProfileV1["edge"];

  const limitSource = record(source.limits, "invalid_runtime_profile", "runtime profile limits");
  exactKeys(
    limitSource,
    [
      "handshake_timeout_ms", "max_clock_skew_ms", "idle_timeout_ms",
      "backend_connect_timeout_ms", "max_connections", "max_connections_per_ip",
      "max_pending_handshakes", "max_auth_line_bytes", "quarantine_threshold",
      "quarantine_base_ms", "quarantine_max_ms", "reconnect_min_ms", "reconnect_max_ms",
    ],
    "invalid_runtime_profile",
    "runtime profile limits",
  );
  const limits = Object.freeze({
    handshake_timeout_ms: integerField(limitSource.handshake_timeout_ms, 100, 120_000, "invalid_runtime_profile", "handshake_timeout_ms"),
    max_clock_skew_ms: integerField(limitSource.max_clock_skew_ms, 0, 600_000, "invalid_runtime_profile", "max_clock_skew_ms"),
    idle_timeout_ms: integerField(limitSource.idle_timeout_ms, 1_000, 86_400_000, "invalid_runtime_profile", "idle_timeout_ms"),
    backend_connect_timeout_ms: integerField(limitSource.backend_connect_timeout_ms, 100, 120_000, "invalid_runtime_profile", "backend_connect_timeout_ms"),
    max_connections: integerField(limitSource.max_connections, 1, 10_000, "invalid_runtime_profile", "max_connections"),
    max_connections_per_ip: integerField(limitSource.max_connections_per_ip, 1, 1_000, "invalid_runtime_profile", "max_connections_per_ip"),
    max_pending_handshakes: integerField(limitSource.max_pending_handshakes, 1, 10_000, "invalid_runtime_profile", "max_pending_handshakes"),
    max_auth_line_bytes: integerField(limitSource.max_auth_line_bytes, 512, 1_048_576, "invalid_runtime_profile", "max_auth_line_bytes"),
    quarantine_threshold: integerField(limitSource.quarantine_threshold, 1, 1_000, "invalid_runtime_profile", "quarantine_threshold"),
    quarantine_base_ms: integerField(limitSource.quarantine_base_ms, 100, 86_400_000, "invalid_runtime_profile", "quarantine_base_ms"),
    quarantine_max_ms: integerField(limitSource.quarantine_max_ms, 100, 604_800_000, "invalid_runtime_profile", "quarantine_max_ms"),
    reconnect_min_ms: integerField(limitSource.reconnect_min_ms, 100, 86_400_000, "invalid_runtime_profile", "reconnect_min_ms"),
    reconnect_max_ms: integerField(limitSource.reconnect_max_ms, 100, 604_800_000, "invalid_runtime_profile", "reconnect_max_ms"),
  });
  if (limits.max_connections_per_ip > limits.max_connections) {
    hold("invalid_runtime_profile", "max_connections_per_ip exceeds max_connections");
  }
  if (limits.max_pending_handshakes > limits.max_connections) {
    hold("invalid_runtime_profile", "max_pending_handshakes exceeds max_connections");
  }
  if (limits.quarantine_base_ms > limits.quarantine_max_ms) {
    hold("invalid_runtime_profile", "quarantine_base_ms exceeds quarantine_max_ms");
  }
  if (limits.reconnect_min_ms > limits.reconnect_max_ms) {
    hold("invalid_runtime_profile", "reconnect_min_ms exceeds reconnect_max_ms");
  }
  return Object.freeze({
    schema: VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1,
    network_id,
    control,
    edge,
    limits,
  });
}

export function hashVoidP2pActivationRuntimeProfileV1(
  value: unknown,
): Readonly<{ profile: VoidP2pActivationRuntimeProfileV1; profile_sha256: string }> {
  const profile = parseVoidP2pActivationRuntimeProfileV1(value);
  return Object.freeze({
    profile,
    profile_sha256: sha256Text(canonicalVoidP2pActivationPermitJsonV1(profile)),
  });
}

export function deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1(
  profileInput: unknown,
): Readonly<Record<string, string>> {
  const profile = parseVoidP2pActivationRuntimeProfileV1(profileInput);
  const values: Record<string, string> = {
    VOID_P2P_EDGE_WALL_MODE: profile.edge.mode,
    VOID_P2P_EDGE_WALL_LISTEN_HOST: profile.edge.listen_host,
    VOID_P2P_EDGE_WALL_LISTEN_PORT: String(profile.edge.listen_port),
    VOID_P2P_EDGE_WALL_BACKEND_HOST: profile.edge.backend_host,
    VOID_P2P_EDGE_WALL_BACKEND_PORT: String(profile.edge.backend_port),
    VOID_P2P_EDGE_WALL_STATUS_HOST: profile.edge.status_host,
    VOID_P2P_EDGE_WALL_STATUS_PORT: String(profile.edge.status_port),
    VOID_P2P_EDGE_WALL_KEY_FILE: profile.edge.key_file,
    VOID_P2P_EDGE_WALL_CERT_FILE: profile.edge.cert_file,
    VOID_P2P_EDGE_WALL_AUDIT_LOG: profile.edge.audit_log,
    VOID_P2P_EDGE_WALL_HANDSHAKE_TIMEOUT_MS: String(profile.limits.handshake_timeout_ms),
    VOID_P2P_EDGE_WALL_MAX_CLOCK_SKEW_MS: String(profile.limits.max_clock_skew_ms),
    VOID_P2P_EDGE_WALL_IDLE_TIMEOUT_MS: String(profile.limits.idle_timeout_ms),
    VOID_P2P_EDGE_WALL_BACKEND_CONNECT_TIMEOUT_MS: String(profile.limits.backend_connect_timeout_ms),
    VOID_P2P_EDGE_WALL_MAX_CONNECTIONS: String(profile.limits.max_connections),
    VOID_P2P_EDGE_WALL_MAX_CONNECTIONS_PER_IP: String(profile.limits.max_connections_per_ip),
    VOID_P2P_EDGE_WALL_MAX_PENDING_HANDSHAKES: String(profile.limits.max_pending_handshakes),
    VOID_P2P_EDGE_WALL_MAX_AUTH_LINE_BYTES: String(profile.limits.max_auth_line_bytes),
    VOID_P2P_EDGE_WALL_QUARANTINE_THRESHOLD: String(profile.limits.quarantine_threshold),
    VOID_P2P_EDGE_WALL_QUARANTINE_BASE_MS: String(profile.limits.quarantine_base_ms),
    VOID_P2P_EDGE_WALL_QUARANTINE_MAX_MS: String(profile.limits.quarantine_max_ms),
    VOID_P2P_EDGE_WALL_RECONNECT_MIN_MS: String(profile.limits.reconnect_min_ms),
    VOID_P2P_EDGE_WALL_RECONNECT_MAX_MS: String(profile.limits.reconnect_max_ms),
  };
  return Object.freeze(values);
}

export function parseVoidP2pNodeBoundActivationPermitV1(
  value: unknown,
): VoidP2pNodeBoundActivationPermitV1 {
  const source = record(value, "invalid_permit", "permit");
  const sequenceText = sequence(source.sequence, "invalid_permit", "permit sequence");
  const expected = [
    "schema", "network_id", "edge_node_id", "sequence", "issued_at", "not_before",
    "expires_at", "policy_epoch", "policy_sha256", "policy_envelope_sha256",
    "trust_root_set_sha256", "runtime_profile_sha256",
  ];
  if (sequenceText !== "1") expected.push("previous_permit_sha256");
  exactKeys(source, expected, "invalid_permit", "permit");
  if (source.schema !== VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1) {
    hold("invalid_permit", "permit schema mismatch");
  }
  const permit: VoidP2pNodeBoundActivationPermitV1 = Object.freeze({
    schema: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1,
    network_id: networkId(source.network_id, "invalid_permit", "permit network_id"),
    edge_node_id: hex64(source.edge_node_id, "invalid_permit", "permit edge_node_id"),
    sequence: sequenceText,
    issued_at: canonicalInstant(source.issued_at, "invalid_permit", "permit issued_at").text,
    not_before: canonicalInstant(source.not_before, "invalid_permit", "permit not_before").text,
    expires_at: canonicalInstant(source.expires_at, "invalid_permit", "permit expires_at").text,
    ...(sequenceText === "1"
      ? {}
      : {
          previous_permit_sha256: hex64(
            source.previous_permit_sha256,
            "invalid_permit",
            "permit previous_permit_sha256",
          ),
        }),
    policy_epoch: sequence(source.policy_epoch, "invalid_permit", "permit policy_epoch"),
    policy_sha256: hex64(source.policy_sha256, "invalid_permit", "permit policy_sha256"),
    policy_envelope_sha256: hex64(
      source.policy_envelope_sha256,
      "invalid_permit",
      "permit policy_envelope_sha256",
    ),
    trust_root_set_sha256: hex64(
      source.trust_root_set_sha256,
      "invalid_permit",
      "permit trust_root_set_sha256",
    ),
    runtime_profile_sha256: hex64(
      source.runtime_profile_sha256,
      "invalid_permit",
      "permit runtime_profile_sha256",
    ),
  });
  const issued = Date.parse(permit.issued_at);
  const notBefore = Date.parse(permit.not_before);
  const expires = Date.parse(permit.expires_at);
  if (!(issued <= notBefore && notBefore < expires)) {
    hold("invalid_permit", "permit timestamps must satisfy issued_at <= not_before < expires_at");
  }
  return permit;
}

export function parseVoidP2pNodeBoundActivationPermitEnvelopeV1(
  value: unknown,
): VoidP2pNodeBoundActivationPermitEnvelopeV1 {
  const source = record(value, "invalid_envelope", "permit envelope");
  exactKeys(source, ["schema", "permit", "signatures"], "invalid_envelope", "permit envelope");
  if (source.schema !== VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_ENVELOPE_SCHEMA_V1) {
    hold("invalid_envelope", "permit envelope schema mismatch");
  }
  if (!Array.isArray(source.signatures) || source.signatures.length > 64) {
    hold("invalid_envelope", "permit envelope signatures must be an array of at most 64 entries");
  }
  const signatures = source.signatures.map((entry, index) => {
    const signature = record(entry, "invalid_envelope", `signature ${index}`);
    exactKeys(signature, ["key_id", "signature_base64"], "invalid_envelope", `signature ${index}`);
    const key_id = hex64(signature.key_id, "invalid_envelope", `signature ${index} key_id`);
    const signature_base64 = stringField(
      signature.signature_base64,
      "invalid_envelope",
      `signature ${index} signature_base64`,
    );
    if (!BASE64.test(signature_base64) || Buffer.from(signature_base64, "base64").length !== 64) {
      hold("invalid_envelope", `signature ${index} must be a canonical 64-byte Ed25519 signature`);
    }
    return Object.freeze({ key_id, signature_base64 });
  });
  strictSortedUnique(signatures.map((entry) => entry.key_id), "invalid_envelope", "permit signatures");
  return Object.freeze({
    schema: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_ENVELOPE_SCHEMA_V1,
    permit: parseVoidP2pNodeBoundActivationPermitV1(source.permit),
    signatures: Object.freeze(signatures),
  });
}

export function createVoidP2pActivationPermitRootSetV1(input: Readonly<{
  network_id: string;
  threshold: number;
  public_key_pems: readonly string[];
}>): VoidP2pActivationPermitRootSetV1 {
  const keys = input.public_key_pems
    .map((public_key_pem) => Object.freeze({
      key_id: voidP2pActivationPermitKeyIdFromPublicKeyPemV1(public_key_pem),
      public_key_pem,
    }))
    .sort((left, right) => left.key_id.localeCompare(right.key_id));
  return parseVoidP2pActivationPermitRootSetV1({
    schema: VOID_P2P_ACTIVATION_PERMIT_ROOT_SET_SCHEMA_V1,
    network_id: input.network_id,
    threshold: input.threshold,
    keys,
  });
}

function signingPreimage(permit: VoidP2pNodeBoundActivationPermitV1): Buffer {
  return Buffer.from(`${SIGNING_DOMAIN}${canonicalVoidP2pActivationPermitJsonV1(permit)}`, "utf8");
}

export function signVoidP2pNodeBoundActivationPermitV1(input: Readonly<{
  permit: unknown;
  private_key_pem: string;
  existing_signatures?: readonly VoidP2pActivationPermitSignatureV1[];
}>): VoidP2pNodeBoundActivationPermitEnvelopeV1 {
  const permit = parseVoidP2pNodeBoundActivationPermitV1(input.permit);
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey(input.private_key_pem);
  } catch {
    hold("invalid_signing_key", "activation-permit private key is malformed");
  }
  if (privateKey.asymmetricKeyType !== "ed25519") {
    hold("invalid_signing_key", "activation-permit private key must be Ed25519");
  }
  const publicKey = createPublicKey(privateKey);
  const key_id = createHash("sha256").update(publicKeyDer(publicKey)).digest("hex");
  const existing = [...(input.existing_signatures ?? [])];
  if (existing.some((entry) => entry.key_id === key_id)) {
    hold("duplicate_signer", "activation permit already contains this signer");
  }
  const signature = cryptoSign(null, signingPreimage(permit), privateKey);
  const signatures = [
    ...existing,
    Object.freeze({ key_id, signature_base64: signature.toString("base64") }),
  ].sort((left, right) => left.key_id.localeCompare(right.key_id));
  return parseVoidP2pNodeBoundActivationPermitEnvelopeV1({
    schema: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_ENVELOPE_SCHEMA_V1,
    permit,
    signatures,
  });
}

export function verifyVoidP2pNodeBoundActivationPermitV1(input: Readonly<{
  envelope: unknown;
  root_set: unknown;
  options: VoidP2pActivationPermitVerificationOptionsV1;
}>): VoidP2pVerifiedNodeBoundActivationPermitV1 {
  const rawEnvelope = canonicalVoidP2pActivationPermitJsonV1(input.envelope);
  const maxBytes = input.options.max_document_bytes ?? 1024 * 1024;
  if (Buffer.byteLength(rawEnvelope, "utf8") > maxBytes) {
    hold("document_too_large", "activation-permit envelope exceeds configured size limit");
  }
  const envelope = parseVoidP2pNodeBoundActivationPermitEnvelopeV1(input.envelope);
  const roots = parseVoidP2pActivationPermitRootSetV1(input.root_set);
  const permit = envelope.permit;
  const expectedNetwork = networkId(
    input.options.expected_network_id,
    "invalid_expected_value",
    "expected network_id",
  );
  if (roots.network_id !== expectedNetwork || permit.network_id !== expectedNetwork) {
    hold("wrong_network", "activation-permit root set, permit, and expected network differ");
  }
  const comparisons: readonly [string, string, string][] = [
    [permit.edge_node_id, hex64(input.options.expected_edge_node_id, "invalid_expected_value", "expected edge_node_id"), "wrong_edge_node"],
    [permit.policy_epoch, sequence(input.options.expected_policy_epoch, "invalid_expected_value", "expected policy_epoch"), "wrong_policy_epoch"],
    [permit.policy_sha256, hex64(input.options.expected_policy_sha256, "invalid_expected_value", "expected policy_sha256"), "wrong_policy"],
    [permit.policy_envelope_sha256, hex64(input.options.expected_policy_envelope_sha256, "invalid_expected_value", "expected policy_envelope_sha256"), "wrong_policy_envelope"],
    [permit.trust_root_set_sha256, hex64(input.options.expected_trust_root_set_sha256, "invalid_expected_value", "expected trust_root_set_sha256"), "wrong_trust_root_set"],
    [permit.runtime_profile_sha256, hex64(input.options.expected_runtime_profile_sha256, "invalid_expected_value", "expected runtime_profile_sha256"), "wrong_runtime_profile"],
  ];
  for (const [actual, expected, code] of comparisons) {
    if (actual !== expected) hold(code, `${code.replaceAll("_", " ")} mismatch`);
  }

  const now = input.options.now_ms ?? Date.now();
  const skew = input.options.max_clock_skew_ms ?? 60_000;
  const lifetime = input.options.max_permit_lifetime_ms ?? 24 * 60 * 60_000;
  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(skew) ||
    skew < 0 ||
    !Number.isSafeInteger(lifetime) ||
    lifetime < 1
  ) {
    hold("invalid_verification_options", "activation-permit time options are invalid");
  }
  const issued = Date.parse(permit.issued_at);
  const notBefore = Date.parse(permit.not_before);
  const expires = Date.parse(permit.expires_at);
  if (expires - notBefore > lifetime) hold("permit_lifetime_exceeded", "activation permit lifetime exceeds configured maximum");
  if (issued > now + skew) hold("permit_issued_in_future", "activation permit issued_at is in the future");
  if (now + skew < notBefore) hold("permit_not_yet_valid", "activation permit is not yet valid");
  if (now - skew >= expires) hold("permit_expired", "activation permit is expired");

  const rootsById = new Map(roots.keys.map((entry) => [entry.key_id, entry]));
  const signerKeyIds: string[] = [];
  const preimage = signingPreimage(permit);
  for (const signature of envelope.signatures) {
    const root = rootsById.get(signature.key_id);
    if (!root) hold("unknown_signer", `activation permit contains unknown signer ${signature.key_id}`);
    const ok = cryptoVerify(
      null,
      preimage,
      createPublicKey(root.public_key_pem),
      Buffer.from(signature.signature_base64, "base64"),
    );
    if (!ok) hold("invalid_signature", `activation permit signature is invalid for ${signature.key_id}`);
    signerKeyIds.push(signature.key_id);
  }
  if (signerKeyIds.length < roots.threshold) {
    hold("insufficient_signatures", "activation permit does not meet the pinned signature threshold");
  }
  const canonicalPermit = canonicalVoidP2pActivationPermitJsonV1(permit);
  const canonicalEnvelope = canonicalVoidP2pActivationPermitJsonV1(envelope);
  const canonicalRootSet = canonicalVoidP2pActivationPermitJsonV1(roots);
  return Object.freeze({
    marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
    envelope,
    root_set: roots,
    permit,
    permit_sha256: sha256Text(canonicalPermit),
    envelope_sha256: sha256Text(canonicalEnvelope),
    root_set_sha256: sha256Text(canonicalRootSet),
    signer_key_ids: Object.freeze(signerKeyIds),
    threshold: roots.threshold,
  });
}

async function writeAndSyncExclusive(file: string, data: string): Promise<void> {
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(data, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(file, 0o600);
}

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function ensureRealDirectory(directory: string): Promise<void> {
  try {
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      hold("unsafe_state_path", `${directory} must be a real directory, not a symbolic link`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      hold("unsafe_state_path", `${directory} must be a real directory, not a symbolic link`);
    }
  }
  await chmod(directory, 0o700);
}

function generationName(sequenceText: string, permitSha256: string): string {
  return `${sequenceText.padStart(40, "0")}-${permitSha256}`;
}

function parseConsumption(value: unknown): VoidP2pActivationPermitConsumptionRecordV1 {
  const source = record(value, "corrupt_state", "consumption record");
  exactKeys(
    source,
    [
      "schema", "network_id", "edge_node_id", "sequence", "permit_sha256", "envelope_sha256",
      "policy_epoch", "policy_sha256", "policy_envelope_sha256", "trust_root_set_sha256",
      "runtime_profile_sha256", "activation_permit_root_set_sha256", "signer_key_ids",
      "threshold", "consumed_at", "generation",
    ],
    "corrupt_state",
    "consumption record",
  );
  if (source.schema !== VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_SCHEMA_V1) {
    hold("corrupt_state", "consumption record schema mismatch");
  }
  if (!Array.isArray(source.signer_key_ids) || source.signer_key_ids.length === 0) {
    hold("corrupt_state", "consumption signer_key_ids are malformed");
  }
  const signer_key_ids = source.signer_key_ids.map((entry, index) =>
    hex64(entry, "corrupt_state", `consumption signer_key_ids[${index}]`),
  );
  strictSortedUnique(signer_key_ids, "corrupt_state", "consumption signer_key_ids");
  const sequenceText = sequence(source.sequence, "corrupt_state", "consumption sequence");
  const permit_sha256 = hex64(source.permit_sha256, "corrupt_state", "consumption permit_sha256");
  const generation = stringField(source.generation, "corrupt_state", "consumption generation");
  if (generation !== generationName(sequenceText, permit_sha256)) {
    hold("corrupt_state", "consumption generation does not match sequence and permit hash");
  }
  return Object.freeze({
    schema: VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_SCHEMA_V1,
    network_id: networkId(source.network_id, "corrupt_state", "consumption network_id"),
    edge_node_id: hex64(source.edge_node_id, "corrupt_state", "consumption edge_node_id"),
    sequence: sequenceText,
    permit_sha256,
    envelope_sha256: hex64(source.envelope_sha256, "corrupt_state", "consumption envelope_sha256"),
    policy_epoch: sequence(source.policy_epoch, "corrupt_state", "consumption policy_epoch"),
    policy_sha256: hex64(source.policy_sha256, "corrupt_state", "consumption policy_sha256"),
    policy_envelope_sha256: hex64(source.policy_envelope_sha256, "corrupt_state", "consumption policy_envelope_sha256"),
    trust_root_set_sha256: hex64(source.trust_root_set_sha256, "corrupt_state", "consumption trust_root_set_sha256"),
    runtime_profile_sha256: hex64(source.runtime_profile_sha256, "corrupt_state", "consumption runtime_profile_sha256"),
    activation_permit_root_set_sha256: hex64(
      source.activation_permit_root_set_sha256,
      "corrupt_state",
      "consumption activation_permit_root_set_sha256",
    ),
    signer_key_ids: Object.freeze(signer_key_ids),
    threshold: integerField(source.threshold, 1, 64, "corrupt_state", "consumption threshold"),
    consumed_at: canonicalInstant(source.consumed_at, "corrupt_state", "consumption consumed_at").text,
    generation,
  });
}

async function loadCurrentConsumption(stateDir: string): Promise<VoidP2pActivationPermitConsumptionRecordV1 | null> {
  const current = path.join(stateDir, "current");
  let metadata;
  try {
    metadata = await lstat(current);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (!metadata.isSymbolicLink()) hold("corrupt_state", "current activation-permit pointer is not a symlink");
  const target = await readlink(current);
  const pure = target.replaceAll("\\", "/");
  if (
    path.isAbsolute(target) ||
    !pure.startsWith("generations/") ||
    pure.includes("../") ||
    pure.endsWith("/..") ||
    pure.split("/").length !== 2
  ) {
    hold("corrupt_state", "current activation-permit pointer escapes generations");
  }
  const generation = pure.slice("generations/".length);
  const generationDirectory = path.join(stateDir, target);
  const generationMetadata = await lstat(generationDirectory);
  if (!generationMetadata.isDirectory() || generationMetadata.isSymbolicLink()) {
    hold("corrupt_state", "current activation-permit generation is not a real directory");
  }
  const consumptionFile = path.join(generationDirectory, "consumption.json");
  const consumptionMetadata = await lstat(consumptionFile);
  if (!consumptionMetadata.isFile() || consumptionMetadata.isSymbolicLink()) {
    hold("corrupt_state", "current activation-permit consumption record is not a real file");
  }
  const parsed = JSON.parse(await readFile(consumptionFile, "utf8")) as unknown;
  const consumption = parseConsumption(parsed);
  if (consumption.generation !== generation) {
    hold("corrupt_state", "current activation-permit pointer and record generation differ");
  }
  return consumption;
}

export async function consumeVoidP2pNodeBoundActivationPermitV1(input: Readonly<{
  verified: VoidP2pVerifiedNodeBoundActivationPermitV1;
  trust_policy_envelope: unknown;
  trust_root_set: unknown;
  runtime_profile: unknown;
  state_dir: string;
  now_ms?: number;
}>): Promise<VoidP2pActivationPermitConsumptionResultV1> {
  if (input.verified.marker !== VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER) {
    hold("invalid_verified_permit", "verified activation-permit marker mismatch");
  }
  const parsedRuntimeProfile = hashVoidP2pActivationRuntimeProfileV1(input.runtime_profile);
  const trustPolicyEnvelopeSha256 = hashVoidP2pActivationPermitDocumentV1(input.trust_policy_envelope);
  const trustRootSetSha256 = hashVoidP2pActivationPermitDocumentV1(input.trust_root_set);
  if (trustPolicyEnvelopeSha256 !== input.verified.permit.policy_envelope_sha256) {
    hold("wrong_policy_envelope", "consumption policy envelope does not match verified permit");
  }
  if (trustRootSetSha256 !== input.verified.permit.trust_root_set_sha256) {
    hold("wrong_trust_root_set", "consumption trust root set does not match verified permit");
  }
  if (parsedRuntimeProfile.profile_sha256 !== input.verified.permit.runtime_profile_sha256) {
    hold("wrong_runtime_profile", "consumption runtime profile does not match verified permit");
  }
  if (parsedRuntimeProfile.profile.network_id !== input.verified.permit.network_id) {
    hold("wrong_network", "runtime profile and activation permit network differ");
  }
  const stateDir = path.resolve(input.state_dir);
  if (stateDir !== parsedRuntimeProfile.profile.control.activation_permit_state_dir) {
    hold("wrong_state_directory", "consumption state directory does not match the signed runtime profile");
  }
  await ensureRealDirectory(stateDir);
  const generations = path.join(stateDir, "generations");
  await ensureRealDirectory(generations);
  const now = input.now_ms ?? Date.now();
  if (!Number.isSafeInteger(now)) hold("invalid_consumption_time", "consumption time is invalid");
  const notBefore = Date.parse(input.verified.permit.not_before);
  const expires = Date.parse(input.verified.permit.expires_at);
  if (now < notBefore) hold("permit_not_yet_valid", "activation permit is not yet valid for consumption");
  if (now >= expires) hold("permit_expired", "activation permit expired before consumption");
  const lockFile = path.join(stateDir, "consume.lock");
  let lock;
  try {
    lock = await open(lockFile, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      hold("activation_in_progress", "another activation-permit consumption holds the lock");
    }
    throw error;
  }
  try {
    await lock.writeFile(`${process.pid}\n`, "utf8");
    await lock.sync();
    const current = await loadCurrentConsumption(stateDir);
    const permit = input.verified.permit;
    const next = BigInt(permit.sequence);
    if (!current) {
      if (permit.sequence !== "1" || permit.previous_permit_sha256 !== undefined) {
        hold("first_sequence_required", "first consumed activation permit must be sequence 1 without predecessor");
      }
    } else {
      if (permit.network_id !== current.network_id || permit.edge_node_id !== current.edge_node_id) {
        hold("state_identity_mismatch", "activation-permit state belongs to another network or edge node");
      }
      const active = BigInt(current.sequence);
      if (next <= active) hold("permit_replay", "activation permit sequence is not greater than consumed state");
      if (next !== active + 1n) hold("permit_sequence_gap", "activation permit sequence must advance exactly by one");
      if (permit.previous_permit_sha256 !== current.permit_sha256) {
        hold("wrong_predecessor", "activation permit predecessor does not match consumed state");
      }
    }

    const generation = generationName(permit.sequence, input.verified.permit_sha256);
    const destination = path.join(generations, generation);
    try {
      await lstat(destination);
      hold("permit_already_consumed", "activation permit generation already exists");
    } catch (error) {
      if (error instanceof VoidP2pActivationPermitHoldV1) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const staging = path.join(generations, `.staging-${generation}-${process.pid}-${Date.now()}`);
    await mkdir(staging, { mode: 0o700 });
    const consumed_at = new Date(now).toISOString();
    const consumption: VoidP2pActivationPermitConsumptionRecordV1 = Object.freeze({
      schema: VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_SCHEMA_V1,
      network_id: permit.network_id,
      edge_node_id: permit.edge_node_id,
      sequence: permit.sequence,
      permit_sha256: input.verified.permit_sha256,
      envelope_sha256: input.verified.envelope_sha256,
      policy_epoch: permit.policy_epoch,
      policy_sha256: permit.policy_sha256,
      policy_envelope_sha256: permit.policy_envelope_sha256,
      trust_root_set_sha256: permit.trust_root_set_sha256,
      runtime_profile_sha256: permit.runtime_profile_sha256,
      activation_permit_root_set_sha256: input.verified.root_set_sha256,
      signer_key_ids: input.verified.signer_key_ids,
      threshold: input.verified.threshold,
      consumed_at,
      generation,
    });
    try {
      await writeAndSyncExclusive(
        path.join(staging, "permit-envelope.json"),
        `${JSON.stringify(input.verified.envelope, null, 2)}\n`,
      );
      await writeAndSyncExclusive(
        path.join(staging, "activation-permit-root-set.json"),
        `${JSON.stringify(input.verified.root_set, null, 2)}\n`,
      );
      await writeAndSyncExclusive(
        path.join(staging, "trust-policy-envelope.json"),
        `${canonicalVoidP2pActivationPermitJsonV1(input.trust_policy_envelope)}\n`,
      );
      await writeAndSyncExclusive(
        path.join(staging, "trust-root-set.json"),
        `${canonicalVoidP2pActivationPermitJsonV1(input.trust_root_set)}\n`,
      );
      await writeAndSyncExclusive(
        path.join(staging, "runtime-profile.json"),
        `${canonicalVoidP2pActivationPermitJsonV1(parsedRuntimeProfile.profile)}\n`,
      );
      await writeAndSyncExclusive(
        path.join(staging, "consumption.json"),
        `${JSON.stringify(consumption, null, 2)}\n`,
      );
      await syncDirectory(staging);
      await rename(staging, destination);
      await syncDirectory(generations);
    } catch (error) {
      await rm(staging, { recursive: true, force: true });
      throw error;
    }

    const temporaryLink = path.join(stateDir, `.current-${process.pid}-${Date.now()}`);
    await symlink(path.posix.join("generations", generation), temporaryLink);
    await rename(temporaryLink, path.join(stateDir, "current"));
    await syncDirectory(stateDir);

    const audit = await open(path.join(stateDir, "consumed.ndjson"), "a", 0o600);
    try {
      await audit.writeFile(`${canonicalVoidP2pActivationPermitJsonV1(consumption)}\n`, "utf8");
      await audit.sync();
    } finally {
      await audit.close();
    }
    return Object.freeze({
      marker: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_MARKER,
      state_dir: stateDir,
      generation,
      generation_dir: destination,
      sealed_policy_envelope_file: path.join(destination, "trust-policy-envelope.json"),
      sealed_trust_root_set_file: path.join(destination, "trust-root-set.json"),
      sealed_runtime_profile_file: path.join(destination, "runtime-profile.json"),
      consumption,
    });
  } finally {
    await lock.close();
    await rm(lockFile, { force: true });
    await syncDirectory(stateDir);
  }
}

export async function readVoidP2pActivationPermitJsonFileV1(
  file: string,
  maxBytes = 1024 * 1024,
): Promise<unknown> {
  const resolved = path.resolve(file);
  const data = await readFile(resolved);
  if (data.length > maxBytes) hold("document_too_large", `${resolved} exceeds configured size limit`);
  try {
    return JSON.parse(data.toString("utf8")) as unknown;
  } catch {
    hold("invalid_json", `${resolved} is not valid JSON`);
  }
}

export async function writeVoidP2pActivationPermitEnvelopeExclusiveV1(
  file: string,
  envelopeInput: unknown,
): Promise<void> {
  const envelope = parseVoidP2pNodeBoundActivationPermitEnvelopeV1(envelopeInput);
  const resolved = path.resolve(file);
  await mkdir(path.dirname(resolved), { recursive: true, mode: 0o700 });
  await writeAndSyncExclusive(resolved, `${JSON.stringify(envelope, null, 2)}\n`);
  await syncDirectory(path.dirname(resolved));
}
