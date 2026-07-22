// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import { once } from "node:events";
import * as fs from "node:fs";
import * as http from "node:http";
import * as net from "node:net";
import * as path from "node:path";
import * as tls from "node:tls";

export const VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_MARKER =
  "VOID_P2P_AUTHENTICATED_EDGE_WALL_V1";

const PROTOCOL_VERSION = 1 as const;
const ALPN_PROTOCOL = "void-p2p-edge-wall-v1";
const EXPORTER_LABEL = "EXPORTER-VOID-P2P-AUTHENTICATED-EDGE-WALL-V1";
const STATUS_PATH = "/__void/p2p-authenticated-edge-wall-v1/status";
const NODE_ID_RE = /^[0-9a-f]{64}$/;

export type VoidP2pAuthenticatedEdgeWallModeV1 = "listen" | "dial" | "both";

export type VoidP2pAuthenticatedEdgePeerTargetV1 = Readonly<{
  host: string;
  port: number;
  expected_node_id?: string;
}>;

export type VoidP2pAuthenticatedEdgeWallConfigV1 = Readonly<{
  mode: VoidP2pAuthenticatedEdgeWallModeV1;
  network_id: string;
  listen_host: string;
  listen_port: number;
  backend_host: string;
  backend_port: number;
  key_file: string;
  cert_file: string;
  peers?: readonly VoidP2pAuthenticatedEdgePeerTargetV1[];
  allow_node_ids?: readonly string[];
  deny_node_ids?: readonly string[];
  permissionless?: boolean;
  status_host?: string;
  status_port?: number;
  audit_log_file?: string;
  handshake_timeout_ms?: number;
  max_clock_skew_ms?: number;
  idle_timeout_ms?: number;
  backend_connect_timeout_ms?: number;
  max_connections?: number;
  max_connections_per_ip?: number;
  max_pending_handshakes?: number;
  max_auth_line_bytes?: number;
  quarantine_threshold?: number;
  quarantine_base_ms?: number;
  quarantine_max_ms?: number;
  reconnect_min_ms?: number;
  reconnect_max_ms?: number;
}>;

export type VoidP2pAuthenticatedEdgeIdentityV1 = Readonly<{
  node_id: string;
  fingerprint256: string;
  private_key: crypto.KeyObject;
  certificate: crypto.X509Certificate;
  certificate_pem: string;
  private_key_pem: string;
}>;

type Direction = "inbound" | "outbound";

type ChallengeBody = Readonly<{
  type: "VOID_P2P_EDGE_CHALLENGE_V1";
  protocol: 1;
  network_id: string;
  server_node_id: string;
  server_nonce: string;
  issued_at_ms: number;
  exporter_sha256: string;
}>;

type SignedChallenge = ChallengeBody & Readonly<{ signature: string }>;

type AuthBody = Readonly<{
  type: "VOID_P2P_EDGE_AUTH_V1";
  protocol: 1;
  network_id: string;
  server_node_id: string;
  client_node_id: string;
  server_nonce: string;
  client_nonce: string;
  challenge_sha256: string;
  exporter_sha256: string;
  issued_at_ms: number;
}>;

type SignedAuth = AuthBody & Readonly<{ signature: string }>;

type AcceptBody = Readonly<{
  type: "VOID_P2P_EDGE_ACCEPT_V1";
  protocol: 1;
  network_id: string;
  server_node_id: string;
  client_node_id: string;
  server_nonce: string;
  client_nonce: string;
  transcript_sha256: string;
  session_id: string;
  issued_at_ms: number;
}>;

type SignedAccept = AcceptBody & Readonly<{ signature: string }>;

type SessionRecord = {
  session_id: string;
  remote_node_id: string;
  remote_fingerprint256: string;
  direction: Direction;
  remote_address: string;
  connected_at_ms: number;
  last_activity_ms: number;
  bytes_from_remote: number;
  bytes_to_remote: number;
  edge_socket: tls.TLSSocket;
  backend_socket: net.Socket;
};

type QuarantineRecord = {
  failures: number;
  until_ms: number;
  last_reason: string;
};

type WallCounters = {
  tls_connections_seen: number;
  authenticated_sessions: number;
  rejected_connections: number;
  auth_failures: number;
  policy_failures: number;
  backend_failures: number;
  duplicate_sessions_rejected: number;
  reconnect_attempts: number;
  bytes_from_remote: number;
  bytes_to_remote: number;
};

type PeerIdentity = Readonly<{
  node_id: string;
  fingerprint256: string;
  certificate: crypto.X509Certificate;
  public_key: crypto.KeyObject;
}>;

type NormalizedConfig = Required<
  Omit<
    VoidP2pAuthenticatedEdgeWallConfigV1,
    "peers" | "allow_node_ids" | "deny_node_ids" | "audit_log_file"
  >
> & {
  peers: readonly VoidP2pAuthenticatedEdgePeerTargetV1[];
  allow_node_ids: readonly string[];
  deny_node_ids: readonly string[];
  audit_log_file?: string;
};

function sha256Hex(data: crypto.BinaryLike): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sha256Buffer(data: crypto.BinaryLike): Buffer {
  return crypto.createHash("sha256").update(data).digest();
}

function randomNonce(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

function signBody(privateKey: crypto.KeyObject, body: unknown): string {
  return crypto.sign(null, canonicalBytes(body), privateKey).toString("base64url");
}

function verifyBody(
  publicKey: crypto.KeyObject,
  body: unknown,
  signature: string,
): boolean {
  try {
    const raw = Buffer.from(signature, "base64url");
    if (raw.length !== 64) return false;
    return crypto.verify(null, canonicalBytes(body), publicKey, raw);
  } catch {
    return false;
  }
}

function normalizeNodeId(value: string): string {
  const out = String(value || "").trim().toLowerCase();
  if (!NODE_ID_RE.test(out)) {
    throw new Error(`invalid node id: ${value}`);
  }
  return out;
}

function normalizeRemoteAddress(value: string | undefined): string {
  const raw = String(value || "unknown").trim();
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

function isValidPort(value: number, allowZero = false): boolean {
  return Number.isInteger(value) && value >= (allowZero ? 0 : 1) && value <= 65535;
}

function isValidHost(value: string): boolean {
  const host = String(value || "").trim();
  return host.length > 0 && host.length <= 255 && !/[\s/]/.test(host);
}

function isLoopbackHost(value: string): boolean {
  const host = String(value || "").trim().toLowerCase();
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

function isValidNetworkId(value: string): boolean {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9._:-]{3,128}$/.test(id);
}

function assertFinitePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive`);
  }
}

function stableJitter(baseMs: number): number {
  const spread = Math.max(1, Math.floor(baseMs * 0.2));
  return baseMs + crypto.randomInt(0, spread + 1);
}

function timingSafeEqualBuffers(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicKeyDer(key: crypto.KeyObject): Buffer {
  return key.export({ type: "spki", format: "der" }) as Buffer;
}

function certificateFingerprint256(certificate: crypto.X509Certificate): string {
  return certificate.fingerprint256.replaceAll(":", "").toLowerCase();
}

function certificateIsCurrentlyValid(
  certificate: crypto.X509Certificate,
  maxClockSkewMs: number,
): boolean {
  const now = Date.now();
  const from = Date.parse(certificate.validFrom);
  const to = Date.parse(certificate.validTo);
  return (
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    now + maxClockSkewMs >= from &&
    now - maxClockSkewMs <= to
  );
}

export function loadVoidP2pAuthenticatedEdgeIdentityV1(input: {
  key_file: string;
  cert_file: string;
}): VoidP2pAuthenticatedEdgeIdentityV1 {
  const privateKeyPem = fs.readFileSync(input.key_file, "utf8");
  const certificatePem = fs.readFileSync(input.cert_file, "utf8");
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const certificate = new crypto.X509Certificate(certificatePem);

  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("edge identity private key must be Ed25519");
  }
  if (certificate.publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("edge identity certificate public key must be Ed25519");
  }

  const certPublic = publicKeyDer(certificate.publicKey);
  const privatePublic = publicKeyDer(crypto.createPublicKey(privateKey));
  if (!timingSafeEqualBuffers(certPublic, privatePublic)) {
    throw new Error("edge identity key and certificate do not match");
  }

  return {
    node_id: sha256Hex(certPublic),
    fingerprint256: certificateFingerprint256(certificate),
    private_key: privateKey,
    certificate,
    certificate_pem: certificatePem,
    private_key_pem: privateKeyPem,
  };
}

function peerIdentityFromSocket(socket: tls.TLSSocket): PeerIdentity {
  let certificate: crypto.X509Certificate | undefined;
  try {
    certificate = socket.getPeerX509Certificate?.();
  } catch {
    certificate = undefined;
  }
  if (!certificate) {
    const legacy = socket.getPeerCertificate(true);
    const raw = legacy?.raw;
    if (!raw || !Buffer.isBuffer(raw) || raw.length === 0) {
      throw new Error("peer did not present a certificate");
    }
    certificate = new crypto.X509Certificate(raw);
  }
  if (certificate.publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("peer certificate public key must be Ed25519");
  }
  const publicKey = certificate.publicKey;
  return {
    node_id: sha256Hex(publicKeyDer(publicKey)),
    fingerprint256: certificateFingerprint256(certificate),
    certificate,
    public_key: publicKey,
  };
}

function normalizeConfig(
  input: VoidP2pAuthenticatedEdgeWallConfigV1,
): NormalizedConfig {
  if (!(["listen", "dial", "both"] as const).includes(input.mode)) {
    throw new Error(`invalid edge wall mode: ${input.mode}`);
  }
  if (!isValidNetworkId(input.network_id)) {
    throw new Error("network_id must be 3-128 safe characters");
  }
  if (!isValidHost(input.listen_host)) throw new Error("invalid listen_host");
  if (!isValidPort(input.listen_port, true)) throw new Error("invalid listen_port");
  if (!isValidHost(input.backend_host)) throw new Error("invalid backend_host");
  if (!isLoopbackHost(input.backend_host)) {
    throw new Error("backend_host must be loopback-only in wall v1");
  }
  if (!isValidPort(input.backend_port)) throw new Error("invalid backend_port");
  if (!input.key_file || !input.cert_file) {
    throw new Error("key_file and cert_file are required");
  }

  const peers = [...(input.peers || [])].map((peer) => {
    if (!isValidHost(peer.host)) throw new Error(`invalid peer host: ${peer.host}`);
    if (!isValidPort(peer.port)) throw new Error(`invalid peer port: ${peer.port}`);
    return {
      host: peer.host.trim(),
      port: peer.port,
      expected_node_id: peer.expected_node_id
        ? normalizeNodeId(peer.expected_node_id)
        : undefined,
    };
  });

  const allowNodeIds = [...new Set((input.allow_node_ids || []).map(normalizeNodeId))];
  const denyNodeIds = [...new Set((input.deny_node_ids || []).map(normalizeNodeId))];
  for (const nodeId of allowNodeIds) {
    if (denyNodeIds.includes(nodeId)) {
      throw new Error(`node id is present in both allow and deny sets: ${nodeId}`);
    }
  }

  const config: NormalizedConfig = {
    mode: input.mode,
    network_id: input.network_id.trim(),
    listen_host: input.listen_host.trim(),
    listen_port: input.listen_port,
    backend_host: input.backend_host.trim(),
    backend_port: input.backend_port,
    key_file: path.resolve(input.key_file),
    cert_file: path.resolve(input.cert_file),
    peers,
    allow_node_ids: allowNodeIds,
    deny_node_ids: denyNodeIds,
    permissionless: input.permissionless === true,
    status_host: String(input.status_host || "127.0.0.1").trim(),
    status_port: input.status_port ?? 0,
    audit_log_file: input.audit_log_file
      ? path.resolve(input.audit_log_file)
      : undefined,
    handshake_timeout_ms: input.handshake_timeout_ms ?? 10_000,
    max_clock_skew_ms: input.max_clock_skew_ms ?? 60_000,
    idle_timeout_ms: input.idle_timeout_ms ?? 120_000,
    backend_connect_timeout_ms: input.backend_connect_timeout_ms ?? 5_000,
    max_connections: input.max_connections ?? 128,
    max_connections_per_ip: input.max_connections_per_ip ?? 8,
    max_pending_handshakes: input.max_pending_handshakes ?? 32,
    max_auth_line_bytes: input.max_auth_line_bytes ?? 16 * 1024,
    quarantine_threshold: input.quarantine_threshold ?? 3,
    quarantine_base_ms: input.quarantine_base_ms ?? 30_000,
    quarantine_max_ms: input.quarantine_max_ms ?? 60 * 60_000,
    reconnect_min_ms: input.reconnect_min_ms ?? 1_000,
    reconnect_max_ms: input.reconnect_max_ms ?? 30_000,
  };

  if (!isValidHost(config.status_host)) throw new Error("invalid status_host");
  if (!isLoopbackHost(config.status_host)) {
    throw new Error("status_host must be loopback-only in wall v1");
  }
  if (!isValidPort(config.status_port, true)) throw new Error("invalid status_port");
  for (const [name, value] of Object.entries({
    handshake_timeout_ms: config.handshake_timeout_ms,
    max_clock_skew_ms: config.max_clock_skew_ms,
    idle_timeout_ms: config.idle_timeout_ms,
    backend_connect_timeout_ms: config.backend_connect_timeout_ms,
    max_connections: config.max_connections,
    max_connections_per_ip: config.max_connections_per_ip,
    max_pending_handshakes: config.max_pending_handshakes,
    max_auth_line_bytes: config.max_auth_line_bytes,
    quarantine_threshold: config.quarantine_threshold,
    quarantine_base_ms: config.quarantine_base_ms,
    quarantine_max_ms: config.quarantine_max_ms,
    reconnect_min_ms: config.reconnect_min_ms,
    reconnect_max_ms: config.reconnect_max_ms,
  })) {
    assertFinitePositive(name, value);
  }
  if (config.reconnect_min_ms > config.reconnect_max_ms) {
    throw new Error("reconnect_min_ms cannot exceed reconnect_max_ms");
  }
  if (config.quarantine_base_ms > config.quarantine_max_ms) {
    throw new Error("quarantine_base_ms cannot exceed quarantine_max_ms");
  }
  if (
    (config.mode === "dial" || config.mode === "both") &&
    config.peers.length === 0
  ) {
    throw new Error("dial or both mode requires at least one peer target");
  }
  if (!config.permissionless && config.allow_node_ids.length === 0) {
    throw new Error(
      "fail-closed admission requires allow_node_ids, or permissionless=true explicitly",
    );
  }

  return config;
}

class JsonLineReader {
  private buffer = Buffer.alloc(0);
  private waiters: Array<{
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];
  private terminalError: Error | null = null;
  private released = false;

  private readonly onData = (chunk: Buffer): void => {
    if (this.released) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.drain();
    if (!this.buffer.includes(0x0a) && this.buffer.length > this.maxBytes) {
      this.fail(new Error("authentication line exceeds configured limit"));
    }
  };

  private readonly onError = (error: Error): void => {
    this.fail(error);
  };

  private readonly onEnd = (): void => {
    this.fail(new Error("socket ended during authentication"));
  };

  constructor(
    private readonly socket: tls.TLSSocket,
    private readonly maxBytes: number,
  ) {
    socket.on("data", this.onData);
    socket.once("error", this.onError);
    socket.once("end", this.onEnd);
    socket.once("close", this.onEnd);
  }

  next(timeoutMs: number): Promise<unknown> {
    if (this.released) {
      return Promise.reject(new Error("authentication reader already released"));
    }
    if (this.terminalError) return Promise.reject(this.terminalError);
    const immediate = this.extractOne();
    if (immediate.found) return immediate.promise;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((entry) => entry.timer === timer);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error("authentication message timeout"));
      }, timeoutMs);
      timer.unref?.();
      this.waiters.push({ resolve, reject, timer });
      this.drain();
    });
  }

  release(): Buffer {
    if (this.released) return Buffer.alloc(0);
    this.released = true;
    this.socket.pause();
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("end", this.onEnd);
    this.socket.off("close", this.onEnd);
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("authentication reader released"));
    }
    const remainder = this.buffer;
    this.buffer = Buffer.alloc(0);
    return remainder;
  }

  private extractOne(): {
    found: boolean;
    promise: Promise<unknown>;
  } {
    const newline = this.buffer.indexOf(0x0a);
    if (newline < 0) {
      return { found: false, promise: Promise.resolve(undefined) };
    }
    if (newline > this.maxBytes) {
      return {
        found: true,
        promise: Promise.reject(
          new Error("authentication line exceeds configured limit"),
        ),
      };
    }
    const line = this.buffer.subarray(0, newline).toString("utf8").trim();
    this.buffer = this.buffer.subarray(newline + 1);
    if (!line) {
      return {
        found: true,
        promise: Promise.reject(new Error("empty authentication message")),
      };
    }
    try {
      return { found: true, promise: Promise.resolve(JSON.parse(line)) };
    } catch {
      return {
        found: true,
        promise: Promise.reject(new Error("invalid authentication JSON")),
      };
    }
  }

  private drain(): void {
    while (this.waiters.length > 0) {
      const extracted = this.extractOne();
      if (!extracted.found) break;
      const waiter = this.waiters.shift()!;
      clearTimeout(waiter.timer);
      extracted.promise.then(waiter.resolve, waiter.reject);
    }
  }

  private fail(error: Error): void {
    if (this.terminalError) return;
    this.terminalError = error;
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }
}

async function writeJsonLine(socket: tls.TLSSocket, value: unknown): Promise<void> {
  const encoded = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  if (!socket.write(encoded)) {
    await once(socket, "drain");
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("authentication message must be an object");
  }
  return value as Record<string, unknown>;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  maxLength = 4096,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new Error(`invalid authentication field: ${key}`);
  }
  return value;
}

function requireNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`invalid authentication field: ${key}`);
  }
  return value;
}

function parseChallenge(value: unknown): SignedChallenge {
  const record = asRecord(value);
  const body: ChallengeBody = {
    type: requireString(record, "type") as ChallengeBody["type"],
    protocol: requireNumber(record, "protocol") as 1,
    network_id: requireString(record, "network_id", 128),
    server_node_id: requireString(record, "server_node_id", 64),
    server_nonce: requireString(record, "server_nonce", 128),
    issued_at_ms: requireNumber(record, "issued_at_ms"),
    exporter_sha256: requireString(record, "exporter_sha256", 64),
  };
  return { ...body, signature: requireString(record, "signature", 128) };
}

function parseAuth(value: unknown): SignedAuth {
  const record = asRecord(value);
  const body: AuthBody = {
    type: requireString(record, "type") as AuthBody["type"],
    protocol: requireNumber(record, "protocol") as 1,
    network_id: requireString(record, "network_id", 128),
    server_node_id: requireString(record, "server_node_id", 64),
    client_node_id: requireString(record, "client_node_id", 64),
    server_nonce: requireString(record, "server_nonce", 128),
    client_nonce: requireString(record, "client_nonce", 128),
    challenge_sha256: requireString(record, "challenge_sha256", 64),
    exporter_sha256: requireString(record, "exporter_sha256", 64),
    issued_at_ms: requireNumber(record, "issued_at_ms"),
  };
  return { ...body, signature: requireString(record, "signature", 128) };
}

function parseAccept(value: unknown): SignedAccept {
  const record = asRecord(value);
  const body: AcceptBody = {
    type: requireString(record, "type") as AcceptBody["type"],
    protocol: requireNumber(record, "protocol") as 1,
    network_id: requireString(record, "network_id", 128),
    server_node_id: requireString(record, "server_node_id", 64),
    client_node_id: requireString(record, "client_node_id", 64),
    server_nonce: requireString(record, "server_nonce", 128),
    client_nonce: requireString(record, "client_nonce", 128),
    transcript_sha256: requireString(record, "transcript_sha256", 64),
    session_id: requireString(record, "session_id", 64),
    issued_at_ms: requireNumber(record, "issued_at_ms"),
  };
  return { ...body, signature: requireString(record, "signature", 128) };
}

function challengeBodyOf(value: SignedChallenge): ChallengeBody {
  return {
    type: value.type,
    protocol: value.protocol,
    network_id: value.network_id,
    server_node_id: value.server_node_id,
    server_nonce: value.server_nonce,
    issued_at_ms: value.issued_at_ms,
    exporter_sha256: value.exporter_sha256,
  };
}

function authBodyOf(value: SignedAuth): AuthBody {
  return {
    type: value.type,
    protocol: value.protocol,
    network_id: value.network_id,
    server_node_id: value.server_node_id,
    client_node_id: value.client_node_id,
    server_nonce: value.server_nonce,
    client_nonce: value.client_nonce,
    challenge_sha256: value.challenge_sha256,
    exporter_sha256: value.exporter_sha256,
    issued_at_ms: value.issued_at_ms,
  };
}

function acceptBodyOf(value: SignedAccept): AcceptBody {
  return {
    type: value.type,
    protocol: value.protocol,
    network_id: value.network_id,
    server_node_id: value.server_node_id,
    client_node_id: value.client_node_id,
    server_nonce: value.server_nonce,
    client_nonce: value.client_nonce,
    transcript_sha256: value.transcript_sha256,
    session_id: value.session_id,
    issued_at_ms: value.issued_at_ms,
  };
}

function isFreshTimestamp(value: number, maxClockSkewMs: number): boolean {
  return Math.abs(Date.now() - value) <= maxClockSkewMs;
}

function sessionIdFor(
  challengeBody: ChallengeBody,
  authBody: AuthBody,
): { transcript_sha256: string; session_id: string } {
  const transcript = canonicalBytes({ challenge: challengeBody, auth: authBody });
  const transcriptSha256 = sha256Hex(transcript);
  return {
    transcript_sha256: transcriptSha256,
    session_id: sha256Hex(
      canonicalBytes({
        marker: VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_MARKER,
        transcript_sha256: transcriptSha256,
      }),
    ),
  };
}

function exporterHash(socket: tls.TLSSocket, networkId: string): string {
  const exported = socket.exportKeyingMaterial(
    32,
    EXPORTER_LABEL,
    Buffer.from(networkId, "utf8"),
  );
  return sha256Hex(exported);
}

async function waitForSecureConnect(
  socket: tls.TLSSocket,
  timeoutMs: number,
): Promise<void> {
  if (socket.destroyed) throw new Error("TLS socket was destroyed before connect");
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("TLS connection timeout"));
      socket.destroy();
    }, timeoutMs);
    timer.unref?.();
    const onSecure = (): void => {
      cleanup();
      resolve();
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off("secureConnect", onSecure);
      socket.off("error", onError);
    };
    socket.once("secureConnect", onSecure);
    socket.once("error", onError);
  });
}

async function connectBackend(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<net.Socket> {
  const socket = net.createConnection({ host, port });
  socket.setNoDelay(true);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new Error("backend connection timeout"));
    }, timeoutMs);
    timer.unref?.();
    const onConnect = (): void => {
      cleanup();
      resolve();
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("error", onError);
    };
    socket.once("connect", onConnect);
    socket.once("error", onError);
  });
  return socket;
}

export class VoidP2pAuthenticatedEdgeWallV1 {
  readonly marker = VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_MARKER;
  readonly identity: VoidP2pAuthenticatedEdgeIdentityV1;

  private readonly config: NormalizedConfig;
  private readonly allowNodeIds: Set<string>;
  private readonly denyNodeIds: Set<string>;
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly remoteSessions = new Map<string, string>();
  private readonly edgeSockets = new Set<tls.TLSSocket>();
  private readonly reservedRemoteNodeIds = new Set<string>();
  private readonly dialWakeups = new Set<() => void>();
  private readonly quarantines = new Map<string, QuarantineRecord>();
  private readonly inboundPerIp = new Map<string, number>();
  private readonly seenAuthDigests = new Map<string, number>();
  private readonly dialLoops = new Set<Promise<void>>();
  private readonly counters: WallCounters = {
    tls_connections_seen: 0,
    authenticated_sessions: 0,
    rejected_connections: 0,
    auth_failures: 0,
    policy_failures: 0,
    backend_failures: 0,
    duplicate_sessions_rejected: 0,
    reconnect_attempts: 0,
    bytes_from_remote: 0,
    bytes_to_remote: 0,
  };

  private tlsServer: tls.Server | null = null;
  private statusServer: http.Server | null = null;
  private started = false;
  private stopping = false;
  private pendingHandshakes = 0;
  private gcTimer: NodeJS.Timeout | null = null;

  constructor(input: VoidP2pAuthenticatedEdgeWallConfigV1) {
    this.config = normalizeConfig(input);
    this.identity = loadVoidP2pAuthenticatedEdgeIdentityV1({
      key_file: this.config.key_file,
      cert_file: this.config.cert_file,
    });
    if (
      !certificateIsCurrentlyValid(
        this.identity.certificate,
        this.config.max_clock_skew_ms,
      )
    ) {
      throw new Error("local edge identity certificate is not currently valid");
    }
    this.allowNodeIds = new Set(this.config.allow_node_ids);
    this.denyNodeIds = new Set(this.config.deny_node_ids);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.stopping = false;

    try {
      if (this.config.audit_log_file) {
        fs.mkdirSync(path.dirname(this.config.audit_log_file), { recursive: true });
      }

      if (this.config.mode === "listen" || this.config.mode === "both") {
        await this.startTlsServer();
      }
      await this.startStatusServer();

      this.gcTimer = setInterval(() => this.gc(), 30_000);
      this.gcTimer.unref?.();

      if (this.config.mode === "dial" || this.config.mode === "both") {
        for (const target of this.config.peers) {
          const loop = this.runDialLoop(target).finally(() =>
            this.dialLoops.delete(loop),
          );
          this.dialLoops.add(loop);
        }
      }

      this.audit("wall_started", {
        node_id: this.identity.node_id,
        network_id: this.config.network_id,
        mode: this.config.mode,
        listen: this.getListenAddress(),
        status: this.getStatusAddress(),
        permissionless: this.config.permissionless,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.audit("wall_start_failed", { reason: message });
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.started || this.stopping) return;
    this.stopping = true;
    for (const wake of [...this.dialWakeups]) wake();

    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    for (const socket of this.edgeSockets) socket.destroy();
    this.edgeSockets.clear();
    for (const session of this.sessions.values()) {
      session.edge_socket.destroy();
      session.backend_socket.destroy();
    }
    this.sessions.clear();
    this.remoteSessions.clear();
    this.reservedRemoteNodeIds.clear();

    const closes: Promise<void>[] = [];
    if (this.tlsServer) {
      const server = this.tlsServer;
      this.tlsServer = null;
      closes.push(
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          (server as tls.Server & { closeAllConnections?: () => void })
            .closeAllConnections?.();
        }),
      );
    }
    if (this.statusServer) {
      const server = this.statusServer;
      this.statusServer = null;
      closes.push(
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections?.();
        }),
      );
    }

    await Promise.allSettled(closes);
    await Promise.allSettled([...this.dialLoops]);
    this.started = false;
    this.audit("wall_stopped", { node_id: this.identity.node_id });
  }

  getListenAddress(): { host: string; port: number } | null {
    const address = this.tlsServer?.address();
    if (!address || typeof address === "string") return null;
    return { host: address.address, port: address.port };
  }

  getStatusAddress(): { host: string; port: number } | null {
    const address = this.statusServer?.address();
    if (!address || typeof address === "string") return null;
    return { host: address.address, port: address.port };
  }

  getStatus(): Record<string, unknown> {
    const now = Date.now();
    const sessions = [...this.sessions.values()].map((session) => ({
      session_id: session.session_id,
      remote_node_id: session.remote_node_id,
      remote_fingerprint256: session.remote_fingerprint256,
      direction: session.direction,
      remote_address: session.remote_address,
      connected_at_ms: session.connected_at_ms,
      age_ms: Math.max(0, now - session.connected_at_ms),
      last_activity_ms: session.last_activity_ms,
      idle_ms: Math.max(0, now - session.last_activity_ms),
      bytes_from_remote: session.bytes_from_remote,
      bytes_to_remote: session.bytes_to_remote,
    }));
    const quarantines = [...this.quarantines.entries()]
      .filter(([, record]) => record.until_ms > now)
      .map(([subject, record]) => ({
        subject,
        failures: record.failures,
        until_ms: record.until_ms,
        remaining_ms: record.until_ms - now,
        last_reason: record.last_reason,
      }));
    return {
      marker: this.marker,
      protocol: PROTOCOL_VERSION,
      enabled: this.started && !this.stopping,
      network_id: this.config.network_id,
      node_id: this.identity.node_id,
      fingerprint256: this.identity.fingerprint256,
      mode: this.config.mode,
      permissionless: this.config.permissionless,
      listen: this.getListenAddress(),
      backend: { host: this.config.backend_host, port: this.config.backend_port },
      status: this.getStatusAddress(),
      pending_handshakes: this.pendingHandshakes,
      active_session_count: sessions.length,
      counters: { ...this.counters },
      sessions,
      quarantines,
      boundaries: {
        tls_minimum: "TLSv1.3",
        alpn: ALPN_PROTOCOL,
        mutual_certificate_required: true,
        channel_binding_exporter_required: true,
        ed25519_identity_required: true,
        fail_closed_admission: !this.config.permissionless,
        existing_node_protocol_unchanged: true,
        local_backend_only: true,
        loopback_status_only: true,
        ledger_mutation_authority: false,
        validator_mutation_authority: false,
        wallet_or_signer_authority: false,
      },
    };
  }

  private async startTlsServer(): Promise<void> {
    const server = tls.createServer(
      {
        key: this.identity.private_key_pem,
        cert: this.identity.certificate_pem,
        requestCert: true,
        rejectUnauthorized: false,
        minVersion: "TLSv1.3",
        maxVersion: "TLSv1.3",
        ALPNProtocols: [ALPN_PROTOCOL],
        handshakeTimeout: this.config.handshake_timeout_ms,
      },
      (socket) => {
        void this.handleInbound(socket);
      },
    );
    server.maxConnections = this.config.max_connections;
    server.on("tlsClientError", (error, socket) => {
      this.counters.rejected_connections += 1;
      this.audit("tls_client_error", {
        remote_address: normalizeRemoteAddress(socket.remoteAddress),
        reason: error.message,
      });
    });
    server.on("error", (error) => {
      this.audit("tls_server_error", { reason: error.message });
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = (): void => {
          server.off("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(this.config.listen_port, this.config.listen_host);
      });
    } catch (error) {
      server.close();
      throw error;
    }
    this.tlsServer = server;
  }

  private async startStatusServer(): Promise<void> {
    const server = http.createServer((request, response) => {
      const method = String(request.method || "GET").toUpperCase();
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if ((method === "GET" || method === "HEAD") && url.pathname === STATUS_PATH) {
        const payload = Buffer.from(`${JSON.stringify(this.getStatus())}\n`, "utf8");
        response.statusCode = 200;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.setHeader("cache-control", "no-store");
        response.setHeader("content-length", String(payload.length));
        response.end(method === "HEAD" ? undefined : payload);
        return;
      }
      response.statusCode = method === "GET" || method === "HEAD" ? 404 : 405;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(`${JSON.stringify({ ok: false, error: "not_found" })}\n`);
    });
    server.on("error", (error) => {
      this.audit("status_server_error", { reason: error.message });
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = (): void => {
          server.off("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(this.config.status_port, this.config.status_host);
      });
    } catch (error) {
      server.close();
      throw error;
    }
    this.statusServer = server;
  }

  private async handleInbound(socket: tls.TLSSocket): Promise<void> {
    this.edgeSockets.add(socket);
    socket.once("close", () => this.edgeSockets.delete(socket));
    this.counters.tls_connections_seen += 1;
    const remoteAddress = normalizeRemoteAddress(socket.remoteAddress);
    const remotePort = socket.remotePort || 0;
    const remoteLabel = `${remoteAddress}:${remotePort}`;
    const ipCount = (this.inboundPerIp.get(remoteAddress) || 0) + 1;
    this.inboundPerIp.set(remoteAddress, ipCount);
    const releaseIp = (): void => {
      const next = Math.max(0, (this.inboundPerIp.get(remoteAddress) || 1) - 1);
      if (next === 0) this.inboundPerIp.delete(remoteAddress);
      else this.inboundPerIp.set(remoteAddress, next);
    };
    socket.once("close", releaseIp);

    try {
      if (socket.alpnProtocol !== ALPN_PROTOCOL) {
        throw new Error("required ALPN protocol was not negotiated");
      }
      if (this.isQuarantined(`ip:${remoteAddress}`)) {
        throw new Error("remote IP is quarantined");
      }
      if (ipCount > this.config.max_connections_per_ip) {
        throw new Error("per-IP connection limit exceeded");
      }
      if (this.pendingHandshakes >= this.config.max_pending_handshakes) {
        throw new Error("pending authentication limit exceeded");
      }
      await this.authenticateInbound(socket, remoteLabel);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.counters.rejected_connections += 1;
      this.registerFailure([`ip:${remoteAddress}`], message);
      this.audit("inbound_rejected", { remote_address: remoteLabel, reason: message });
      socket.destroy();
    }
  }

  private async authenticateInbound(
    socket: tls.TLSSocket,
    remoteAddress: string,
  ): Promise<void> {
    this.pendingHandshakes += 1;
    const reader = new JsonLineReader(socket, this.config.max_auth_line_bytes);
    let peer: PeerIdentity | null = null;
    let bridgeInput:
      | { peer: PeerIdentity; session_id: string }
      | null = null;
    try {
      peer = peerIdentityFromSocket(socket);
      if (
        !certificateIsCurrentlyValid(
          peer.certificate,
          this.config.max_clock_skew_ms,
        )
      ) {
        throw new Error("peer certificate is not currently valid");
      }
      if (this.isQuarantined(`node:${peer.node_id}`)) {
        throw new Error("peer node id is quarantined");
      }
      this.enforcePeerPolicy(peer.node_id, undefined);

      const exporterSha256 = exporterHash(socket, this.config.network_id);
      const challengeBody: ChallengeBody = {
        type: "VOID_P2P_EDGE_CHALLENGE_V1",
        protocol: PROTOCOL_VERSION,
        network_id: this.config.network_id,
        server_node_id: this.identity.node_id,
        server_nonce: randomNonce(),
        issued_at_ms: Date.now(),
        exporter_sha256: exporterSha256,
      };
      const challenge: SignedChallenge = {
        ...challengeBody,
        signature: signBody(this.identity.private_key, challengeBody),
      };
      await writeJsonLine(socket, challenge);

      const auth = parseAuth(await reader.next(this.config.handshake_timeout_ms));
      const authBody = authBodyOf(auth);
      if (authBody.type !== "VOID_P2P_EDGE_AUTH_V1") {
        throw new Error("unexpected authentication message type");
      }
      if (authBody.protocol !== PROTOCOL_VERSION) {
        throw new Error("protocol version mismatch");
      }
      if (authBody.network_id !== this.config.network_id) {
        throw new Error("network id mismatch");
      }
      if (normalizeNodeId(authBody.server_node_id) !== this.identity.node_id) {
        throw new Error("server node id mismatch");
      }
      if (normalizeNodeId(authBody.client_node_id) !== peer.node_id) {
        throw new Error("client node id is not bound to peer certificate");
      }
      if (authBody.server_nonce !== challengeBody.server_nonce) {
        throw new Error("server challenge nonce mismatch");
      }
      if (authBody.exporter_sha256 !== exporterSha256) {
        throw new Error("TLS channel binding mismatch");
      }
      if (authBody.challenge_sha256 !== sha256Hex(canonicalBytes(challengeBody))) {
        throw new Error("challenge transcript mismatch");
      }
      if (!isFreshTimestamp(authBody.issued_at_ms, this.config.max_clock_skew_ms)) {
        throw new Error("client authentication timestamp is stale");
      }
      if (!verifyBody(peer.public_key, authBody, auth.signature)) {
        throw new Error("client authentication signature is invalid");
      }

      const authDigest = sha256Hex(
        canonicalBytes({
          peer_node_id: peer.node_id,
          server_nonce: authBody.server_nonce,
          client_nonce: authBody.client_nonce,
          exporter_sha256: exporterSha256,
        }),
      );
      if (this.seenAuthDigests.has(authDigest)) {
        throw new Error("authentication replay detected");
      }
      this.seenAuthDigests.set(
        authDigest,
        Date.now() + Math.max(this.config.max_clock_skew_ms * 2, 120_000),
      );

      const ids = sessionIdFor(challengeBody, authBody);
      const acceptBody: AcceptBody = {
        type: "VOID_P2P_EDGE_ACCEPT_V1",
        protocol: PROTOCOL_VERSION,
        network_id: this.config.network_id,
        server_node_id: this.identity.node_id,
        client_node_id: peer.node_id,
        server_nonce: challengeBody.server_nonce,
        client_nonce: authBody.client_nonce,
        transcript_sha256: ids.transcript_sha256,
        session_id: ids.session_id,
        issued_at_ms: Date.now(),
      };
      const accept: SignedAccept = {
        ...acceptBody,
        signature: signBody(this.identity.private_key, acceptBody),
      };
      await writeJsonLine(socket, accept);
      bridgeInput = { peer, session_id: ids.session_id };
    } catch (error) {
      this.counters.auth_failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      const subjects = peer ? [`node:${peer.node_id}`] : [];
      this.registerFailure(subjects, message);
      reader.release();
      throw error;
    } finally {
      this.pendingHandshakes = Math.max(0, this.pendingHandshakes - 1);
    }

    try {
      await this.bridgeAuthenticatedSession({
        socket,
        reader,
        remainder: undefined,
        peer: bridgeInput.peer,
        direction: "inbound",
        remote_address: remoteAddress,
        session_id: bridgeInput.session_id,
      });
    } catch (error) {
      reader.release();
      socket.destroy();
      throw error;
    }
  }

  private async runDialLoop(
    target: VoidP2pAuthenticatedEdgePeerTargetV1,
  ): Promise<void> {
    let backoffMs = this.config.reconnect_min_ms;
    const targetLabel = `${target.host}:${target.port}`;
    while (!this.stopping) {
      if (
        target.expected_node_id &&
        this.remoteSessions.has(normalizeNodeId(target.expected_node_id))
      ) {
        await this.waitForDialWake(500);
        continue;
      }
      this.counters.reconnect_attempts += 1;
      try {
        await this.connectOutbound(target);
        backoffMs = this.config.reconnect_min_ms;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.audit("outbound_connection_failed", {
          target: targetLabel,
          reason: message,
        });
      }
      if (this.stopping) break;
      await this.waitForDialWake(stableJitter(backoffMs));
      backoffMs = Math.min(this.config.reconnect_max_ms, backoffMs * 2);
    }
  }

  private async connectOutbound(
    target: VoidP2pAuthenticatedEdgePeerTargetV1,
  ): Promise<void> {
    const socket = tls.connect({
      host: target.host,
      port: target.port,
      key: this.identity.private_key_pem,
      cert: this.identity.certificate_pem,
      rejectUnauthorized: false,
      minVersion: "TLSv1.3",
      maxVersion: "TLSv1.3",
      ALPNProtocols: [ALPN_PROTOCOL],
      servername: net.isIP(target.host) ? undefined : target.host,
    });
    this.edgeSockets.add(socket);
    socket.once("close", () => this.edgeSockets.delete(socket));
    socket.setNoDelay(true);
    await waitForSecureConnect(socket, this.config.handshake_timeout_ms);
    if (socket.alpnProtocol !== ALPN_PROTOCOL) {
      socket.destroy();
      throw new Error("required ALPN protocol was not negotiated");
    }
    await this.authenticateOutbound(socket, target);
  }

  private async authenticateOutbound(
    socket: tls.TLSSocket,
    target: VoidP2pAuthenticatedEdgePeerTargetV1,
  ): Promise<void> {
    this.pendingHandshakes += 1;
    const reader = new JsonLineReader(socket, this.config.max_auth_line_bytes);
    let peer: PeerIdentity | null = null;
    let bridgeInput:
      | { peer: PeerIdentity; session_id: string }
      | null = null;
    try {
      peer = peerIdentityFromSocket(socket);
      if (
        !certificateIsCurrentlyValid(
          peer.certificate,
          this.config.max_clock_skew_ms,
        )
      ) {
        throw new Error("peer certificate is not currently valid");
      }
      this.enforcePeerPolicy(peer.node_id, target.expected_node_id);
      if (this.isQuarantined(`node:${peer.node_id}`)) {
        throw new Error("peer node id is quarantined");
      }

      const exporterSha256 = exporterHash(socket, this.config.network_id);
      const challenge = parseChallenge(
        await reader.next(this.config.handshake_timeout_ms),
      );
      const challengeBody = challengeBodyOf(challenge);
      if (challengeBody.type !== "VOID_P2P_EDGE_CHALLENGE_V1") {
        throw new Error("unexpected challenge message type");
      }
      if (challengeBody.protocol !== PROTOCOL_VERSION) {
        throw new Error("protocol version mismatch");
      }
      if (challengeBody.network_id !== this.config.network_id) {
        throw new Error("network id mismatch");
      }
      if (normalizeNodeId(challengeBody.server_node_id) !== peer.node_id) {
        throw new Error("server node id is not bound to peer certificate");
      }
      if (challengeBody.exporter_sha256 !== exporterSha256) {
        throw new Error("TLS channel binding mismatch");
      }
      if (!isFreshTimestamp(challengeBody.issued_at_ms, this.config.max_clock_skew_ms)) {
        throw new Error("server challenge timestamp is stale");
      }
      if (!verifyBody(peer.public_key, challengeBody, challenge.signature)) {
        throw new Error("server challenge signature is invalid");
      }

      const authBody: AuthBody = {
        type: "VOID_P2P_EDGE_AUTH_V1",
        protocol: PROTOCOL_VERSION,
        network_id: this.config.network_id,
        server_node_id: peer.node_id,
        client_node_id: this.identity.node_id,
        server_nonce: challengeBody.server_nonce,
        client_nonce: randomNonce(),
        challenge_sha256: sha256Hex(canonicalBytes(challengeBody)),
        exporter_sha256: exporterSha256,
        issued_at_ms: Date.now(),
      };
      const auth: SignedAuth = {
        ...authBody,
        signature: signBody(this.identity.private_key, authBody),
      };
      await writeJsonLine(socket, auth);

      const accept = parseAccept(await reader.next(this.config.handshake_timeout_ms));
      const acceptBody = acceptBodyOf(accept);
      const ids = sessionIdFor(challengeBody, authBody);
      if (acceptBody.type !== "VOID_P2P_EDGE_ACCEPT_V1") {
        throw new Error("unexpected accept message type");
      }
      if (acceptBody.protocol !== PROTOCOL_VERSION) {
        throw new Error("protocol version mismatch");
      }
      if (acceptBody.network_id !== this.config.network_id) {
        throw new Error("network id mismatch");
      }
      if (normalizeNodeId(acceptBody.server_node_id) !== peer.node_id) {
        throw new Error("accept server node id mismatch");
      }
      if (normalizeNodeId(acceptBody.client_node_id) !== this.identity.node_id) {
        throw new Error("accept client node id mismatch");
      }
      if (
        acceptBody.server_nonce !== challengeBody.server_nonce ||
        acceptBody.client_nonce !== authBody.client_nonce
      ) {
        throw new Error("accept nonce mismatch");
      }
      if (
        acceptBody.transcript_sha256 !== ids.transcript_sha256 ||
        acceptBody.session_id !== ids.session_id
      ) {
        throw new Error("accept transcript mismatch");
      }
      if (!isFreshTimestamp(acceptBody.issued_at_ms, this.config.max_clock_skew_ms)) {
        throw new Error("server accept timestamp is stale");
      }
      if (!verifyBody(peer.public_key, acceptBody, accept.signature)) {
        throw new Error("server accept signature is invalid");
      }
      bridgeInput = { peer, session_id: ids.session_id };
    } catch (error) {
      this.counters.auth_failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      const subjects = peer ? [`node:${peer.node_id}`] : [];
      this.registerFailure(subjects, message);
      reader.release();
      socket.destroy();
      throw error;
    } finally {
      this.pendingHandshakes = Math.max(0, this.pendingHandshakes - 1);
    }

    try {
      await this.bridgeAuthenticatedSession({
        socket,
        reader,
        remainder: undefined,
        peer: bridgeInput.peer,
        direction: "outbound",
        remote_address: `${target.host}:${target.port}`,
        session_id: bridgeInput.session_id,
      });
    } catch (error) {
      reader.release();
      socket.destroy();
      throw error;
    }
  }

  private async bridgeAuthenticatedSession(input: {
    socket: tls.TLSSocket;
    reader: JsonLineReader;
    remainder?: Buffer;
    peer: PeerIdentity;
    direction: Direction;
    remote_address: string;
    session_id: string;
  }): Promise<void> {
    const buffered = input.remainder ?? input.reader.release();
    if (
      this.remoteSessions.has(input.peer.node_id) ||
      this.reservedRemoteNodeIds.has(input.peer.node_id)
    ) {
      this.counters.duplicate_sessions_rejected += 1;
      throw new Error("duplicate authenticated peer session");
    }
    if (
      this.sessions.size + this.reservedRemoteNodeIds.size >=
      this.config.max_connections
    ) {
      throw new Error("authenticated session limit exceeded");
    }

    this.reservedRemoteNodeIds.add(input.peer.node_id);
    let backend: net.Socket;
    try {
      backend = await connectBackend(
        this.config.backend_host,
        this.config.backend_port,
        this.config.backend_connect_timeout_ms,
      );
    } catch (error) {
      this.counters.backend_failures += 1;
      throw error;
    } finally {
      this.reservedRemoteNodeIds.delete(input.peer.node_id);
    }

    const now = Date.now();
    const session: SessionRecord = {
      session_id: input.session_id,
      remote_node_id: input.peer.node_id,
      remote_fingerprint256: input.peer.fingerprint256,
      direction: input.direction,
      remote_address: input.remote_address,
      connected_at_ms: now,
      last_activity_ms: now,
      bytes_from_remote: 0,
      bytes_to_remote: 0,
      edge_socket: input.socket,
      backend_socket: backend,
    };
    this.sessions.set(session.session_id, session);
    this.remoteSessions.set(session.remote_node_id, session.session_id);
    this.counters.authenticated_sessions += 1;
    this.clearFailure(`node:${session.remote_node_id}`);

    this.audit("session_authenticated", {
      session_id: session.session_id,
      remote_node_id: session.remote_node_id,
      remote_fingerprint256: session.remote_fingerprint256,
      direction: session.direction,
      remote_address: session.remote_address,
    });

    input.socket.setNoDelay(true);
    input.socket.setKeepAlive(true, 30_000);
    backend.setNoDelay(true);
    backend.setKeepAlive(true, 30_000);

    if (buffered.length > 0) {
      backend.write(buffered);
    }

    await new Promise<void>((resolve) => {
      let closed = false;
      let idleTimer: NodeJS.Timeout | null = null;

      const touch = (): void => {
        session.last_activity_ms = Date.now();
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          this.audit("session_idle_timeout", {
            session_id: session.session_id,
            remote_node_id: session.remote_node_id,
          });
          input.socket.destroy();
          backend.destroy();
        }, this.config.idle_timeout_ms);
        idleTimer.unref?.();
      };

      const finish = (reason: string): void => {
        if (closed) return;
        closed = true;
        if (idleTimer) clearTimeout(idleTimer);
        input.socket.off("data", onRemoteData);
        backend.off("data", onBackendData);
        input.socket.off("drain", onRemoteDrain);
        backend.off("drain", onBackendDrain);
        input.socket.destroy();
        backend.destroy();
        this.sessions.delete(session.session_id);
        if (this.remoteSessions.get(session.remote_node_id) === session.session_id) {
          this.remoteSessions.delete(session.remote_node_id);
        }
        this.audit("session_closed", {
          session_id: session.session_id,
          remote_node_id: session.remote_node_id,
          reason,
          bytes_from_remote: session.bytes_from_remote,
          bytes_to_remote: session.bytes_to_remote,
        });
        resolve();
      };

      const onRemoteData = (chunk: Buffer): void => {
        touch();
        session.bytes_from_remote += chunk.length;
        this.counters.bytes_from_remote += chunk.length;
        if (!backend.write(chunk)) input.socket.pause();
      };
      const onBackendData = (chunk: Buffer): void => {
        touch();
        session.bytes_to_remote += chunk.length;
        this.counters.bytes_to_remote += chunk.length;
        if (!input.socket.write(chunk)) backend.pause();
      };
      const onRemoteDrain = (): void => {
        backend.resume();
      };
      const onBackendDrain = (): void => {
        input.socket.resume();
      };

      input.socket.on("data", onRemoteData);
      backend.on("data", onBackendData);
      input.socket.on("drain", onRemoteDrain);
      backend.on("drain", onBackendDrain);
      input.socket.once("error", (error) => finish(`edge_error:${error.message}`));
      backend.once("error", (error) => finish(`backend_error:${error.message}`));
      input.socket.once("end", () => finish("edge_end"));
      backend.once("end", () => finish("backend_end"));
      input.socket.once("close", () => finish("edge_close"));
      backend.once("close", () => finish("backend_close"));
      touch();
      input.socket.resume();
      backend.resume();
    });
  }

  private async waitForDialWake(ms: number): Promise<void> {
    if (this.stopping) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.dialWakeups.delete(finish);
        resolve();
      };
      const timer = setTimeout(finish, ms);
      timer.unref?.();
      this.dialWakeups.add(finish);
      if (this.stopping) finish();
    });
  }

  private enforcePeerPolicy(nodeIdInput: string, expectedNodeId?: string): void {
    const nodeId = normalizeNodeId(nodeIdInput);
    if (expectedNodeId && nodeId !== normalizeNodeId(expectedNodeId)) {
      this.counters.policy_failures += 1;
      throw new Error("peer node id does not match pinned target identity");
    }
    if (this.denyNodeIds.has(nodeId)) {
      this.counters.policy_failures += 1;
      throw new Error("peer node id is denied");
    }
    if (!this.config.permissionless && !this.allowNodeIds.has(nodeId)) {
      this.counters.policy_failures += 1;
      throw new Error("peer node id is not allowlisted");
    }
  }

  private isQuarantined(subject: string): boolean {
    const record = this.quarantines.get(subject);
    if (!record) return false;
    if (record.until_ms <= Date.now()) {
      this.quarantines.delete(subject);
      return false;
    }
    return true;
  }

  private clearFailure(subject: string): void {
    this.quarantines.delete(subject);
  }

  private registerFailure(subjects: readonly string[], reason: string): void {
    for (const subject of subjects) {
      if (!subject) continue;
      const prior = this.quarantines.get(subject) || {
        failures: 0,
        until_ms: 0,
        last_reason: "",
      };
      const failures = prior.failures + 1;
      let untilMs = prior.until_ms;
      if (failures >= this.config.quarantine_threshold) {
        const exponent = Math.min(16, failures - this.config.quarantine_threshold);
        const duration = Math.min(
          this.config.quarantine_max_ms,
          this.config.quarantine_base_ms * 2 ** exponent,
        );
        untilMs = Date.now() + duration;
      }
      this.quarantines.set(subject, {
        failures,
        until_ms: untilMs,
        last_reason: reason.slice(0, 256),
      });
    }
  }

  private gc(): void {
    const now = Date.now();
    for (const [digest, expiresAt] of this.seenAuthDigests) {
      if (expiresAt <= now) this.seenAuthDigests.delete(digest);
    }
    for (const [subject, record] of this.quarantines) {
      if (record.until_ms > 0 && record.until_ms <= now) {
        this.quarantines.delete(subject);
      }
    }
  }

  private audit(event: string, details: Record<string, unknown>): void {
    const entry = {
      marker: this.marker,
      event,
      at_ms: Date.now(),
      ...details,
    };
    if (!this.config.audit_log_file) return;
    try {
      fs.appendFileSync(
        this.config.audit_log_file,
        `${JSON.stringify(entry)}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("VOID_P2P_EDGE_WALL_AUDIT_WRITE_FAILURE_VISIBLE", {
        event,
        message,
      });
    }
  }
}

export const VOID_P2P_AUTHENTICATED_EDGE_WALL_V1_STATUS_PATH = STATUS_PATH;
