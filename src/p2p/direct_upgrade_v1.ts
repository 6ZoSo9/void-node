// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import * as net from "node:net";

import { parsePeerAddress } from "../types/p2p.js";

export const VOID_P2P_DIRECT_UPGRADE_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_DIRECT_UPGRADE_MAX_PENDING_REQUESTS_V1 = 64;
export const VOID_P2P_DIRECT_UPGRADE_MAX_RELAY_SESSIONS_V1 = 128;
export const VOID_P2P_DIRECT_UPGRADE_REQUEST_TIMEOUT_MS_V1 = 5_000;
export const VOID_P2P_DIRECT_UPGRADE_MIN_START_DELAY_MS_V1 = 50;
export const VOID_P2P_DIRECT_UPGRADE_MAX_START_DELAY_MS_V1 = 1_000;
export const VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPT_TIMEOUT_MS_V1 = 5_000;
export const VOID_P2P_DIRECT_UPGRADE_SESSION_GRACE_MS_V1 = 2_000;
export const VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MIN_V1 = 49_152;
export const VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1 = 65_535;
export const VOID_P2P_DIRECT_UPGRADE_LOCAL_BIND_ATTEMPTS_V1 = 16;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const ID_RE = /^[0-9a-f]{32}$/;
const CONTROL_OR_SPACE = /[\u0000-\u001f\u007f]/;
const MAX_REASON_CHARS = 160;

const NON_PUBLIC_V4 = new net.BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  NON_PUBLIC_V4.addSubnet(network, prefix, "ipv4");
}

const NON_PUBLIC_V6 = new net.BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  NON_PUBLIC_V6.addSubnet(network, prefix, "ipv6");
}

export type VoidDirectUpgradeRequestV1 = Readonly<{
  type: "DIRECT_UPGRADE_REQUEST";
  request_id: string;
  stream_id: string;
  target_node_id: string;
  start_delay_ms: number;
  attempt_timeout_ms: number;
}>;

export type VoidDirectUpgradeOfferV1 = Readonly<{
  type: "DIRECT_UPGRADE_OFFER";
  request_id: string;
  session_id: string;
  stream_id: string;
  peer_node_id: string;
  peer_observed_address: string;
  start_delay_ms: number;
  attempt_timeout_ms: number;
}>;

export type VoidDirectUpgradeReadyV1 = Readonly<{
  type: "DIRECT_UPGRADE_READY";
  session_id: string;
  stream_id: string;
}>;

export type VoidDirectUpgradeStartV1 = Readonly<{
  type: "DIRECT_UPGRADE_START";
  session_id: string;
  stream_id: string;
}>;

export type VoidDirectUpgradeRejectV1 = Readonly<{
  type: "DIRECT_UPGRADE_REJECT";
  request_id: string;
  reason: string;
}>;

export type VoidDirectUpgradeControlMessageV1 =
  | VoidDirectUpgradeRequestV1
  | VoidDirectUpgradeOfferV1
  | VoidDirectUpgradeReadyV1
  | VoidDirectUpgradeStartV1
  | VoidDirectUpgradeRejectV1;

const DIRECT_UPGRADE_TYPES = new Set<string>([
  "DIRECT_UPGRADE_REQUEST",
  "DIRECT_UPGRADE_OFFER",
  "DIRECT_UPGRADE_READY",
  "DIRECT_UPGRADE_START",
  "DIRECT_UPGRADE_REJECT",
]);

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function idValue(raw: unknown): string | undefined {
  return typeof raw === "string" && ID_RE.test(raw) ? raw : undefined;
}

function nodeId(raw: unknown): string | undefined {
  return typeof raw === "string" && NODE_ID_RE.test(raw) ? raw : undefined;
}

function safeInteger(raw: unknown, min: number, max: number): number | undefined {
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) return;
  if (raw < min || raw > max) return;
  return raw;
}

function reasonText(raw: unknown): string | undefined {
  if (
    typeof raw !== "string" ||
    raw.length < 1 ||
    raw.length > MAX_REASON_CHARS ||
    raw !== raw.trim() ||
    CONTROL_OR_SPACE.test(raw)
  ) return;
  return raw;
}

function canonicalIPv6Host(address: string): string | undefined {
  try {
    const url = new URL(`http://[${address}]/`);
    const hostname = url.hostname;
    if (!hostname.startsWith("[") || !hostname.endsWith("]")) return;
    return hostname.slice(1, -1).toLowerCase();
  } catch {
    return;
  }
}

function publicIp(host: string): boolean {
  const family = net.isIP(host);
  if (family === 4) return !NON_PUBLIC_V4.check(host, "ipv4");
  if (family === 6) {
    if (NON_PUBLIC_V6.check(host, "ipv6")) return false;
    const firstHextet = Number.parseInt(host.split(":", 1)[0] || "0", 16);
    return Number.isInteger(firstHextet) &&
      firstHextet >= 0x2000 &&
      firstHextet <= 0x3fff;
  }
  return false;
}

export function newVoidDirectUpgradeIdV1(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function isVoidDirectUpgradeControlTypeV1(raw: unknown): boolean {
  return typeof raw === "string" && DIRECT_UPGRADE_TYPES.has(raw);
}

export function normalizeVoidDirectUpgradeObservedAddressV1(
  raw: unknown,
  allowNonPublic = false,
): string | undefined {
  if (
    typeof raw !== "string" ||
    raw.length < 3 ||
    raw.length > 256 ||
    /[\s\u0000-\u001f\u007f]/.test(raw)
  ) return;
  const parsed = parsePeerAddress(raw);
  if (!parsed) return;
  const family = net.isIP(parsed.host);
  if (family !== 4 && family !== 6) return;
  let canonicalHost = parsed.host;
  if (family === 6) {
    const normalized = canonicalIPv6Host(parsed.host);
    if (!normalized) return;
    canonicalHost = normalized;
  }
  const canonical =
    family === 6
      ? `[${canonicalHost}]:${parsed.port}`
      : `${canonicalHost}:${parsed.port}`;
  if (canonical !== raw) return;
  if (!allowNonPublic && !publicIp(canonicalHost)) return;
  return canonical;
}

export function normalizeVoidDirectUpgradeControlMessageV1(
  raw: unknown,
  allowNonPublicObservedAddress = false,
): VoidDirectUpgradeControlMessageV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  const type = typeof value.type === "string" ? value.type : "";

  if (type === "DIRECT_UPGRADE_REQUEST") {
    if (!exactKeys(value, [
      "type", "request_id", "stream_id", "target_node_id",
      "start_delay_ms", "attempt_timeout_ms",
    ])) return;
    const request_id = idValue(value.request_id);
    const stream_id = idValue(value.stream_id);
    const target_node_id = nodeId(value.target_node_id);
    const start_delay_ms = safeInteger(
      value.start_delay_ms,
      VOID_P2P_DIRECT_UPGRADE_MIN_START_DELAY_MS_V1,
      VOID_P2P_DIRECT_UPGRADE_MAX_START_DELAY_MS_V1,
    );
    const attempt_timeout_ms = safeInteger(
      value.attempt_timeout_ms,
      1,
      VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPT_TIMEOUT_MS_V1,
    );
    if (!request_id || !stream_id || !target_node_id ||
        start_delay_ms === undefined || attempt_timeout_ms === undefined) return;
    return Object.freeze({
      type, request_id, stream_id, target_node_id,
      start_delay_ms, attempt_timeout_ms,
    });
  }

  if (type === "DIRECT_UPGRADE_OFFER") {
    if (!exactKeys(value, [
      "type", "request_id", "session_id", "stream_id", "peer_node_id",
      "peer_observed_address", "start_delay_ms", "attempt_timeout_ms",
    ])) return;
    const request_id = idValue(value.request_id);
    const session_id = idValue(value.session_id);
    const stream_id = idValue(value.stream_id);
    const peer_node_id = nodeId(value.peer_node_id);
    const peer_observed_address = normalizeVoidDirectUpgradeObservedAddressV1(
      value.peer_observed_address,
      allowNonPublicObservedAddress,
    );
    const start_delay_ms = safeInteger(
      value.start_delay_ms,
      VOID_P2P_DIRECT_UPGRADE_MIN_START_DELAY_MS_V1,
      VOID_P2P_DIRECT_UPGRADE_MAX_START_DELAY_MS_V1,
    );
    const attempt_timeout_ms = safeInteger(
      value.attempt_timeout_ms,
      1,
      VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPT_TIMEOUT_MS_V1,
    );
    if (!request_id || !session_id || !stream_id || !peer_node_id ||
        !peer_observed_address || start_delay_ms === undefined ||
        attempt_timeout_ms === undefined) return;
    return Object.freeze({
      type, request_id, session_id, stream_id, peer_node_id,
      peer_observed_address, start_delay_ms, attempt_timeout_ms,
    });
  }

  if (type === "DIRECT_UPGRADE_READY" || type === "DIRECT_UPGRADE_START") {
    if (!exactKeys(value, ["type", "session_id", "stream_id"])) return;
    const session_id = idValue(value.session_id);
    const stream_id = idValue(value.stream_id);
    if (!session_id || !stream_id) return;
    return Object.freeze({ type, session_id, stream_id });
  }

  if (type === "DIRECT_UPGRADE_REJECT") {
    if (!exactKeys(value, ["type", "request_id", "reason"])) return;
    const request_id = idValue(value.request_id);
    const reason = reasonText(value.reason);
    if (!request_id || !reason) return;
    return Object.freeze({ type, request_id, reason });
  }

  return;
}

export type VoidDirectUpgradeRelaySessionSnapshotV1 = Readonly<{
  session_id: string;
  request_id: string;
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  source_observed_address: string;
  target_observed_address: string;
  start_delay_ms: number;
  attempt_timeout_ms: number;
  created_at_ms: number;
  expires_at_ms: number;
  started: boolean;
  ready_node_ids: readonly string[];
}>;

type MutableRelaySessionV1 = {
  session_id: string;
  request_id: string;
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  source_observed_address: string;
  target_observed_address: string;
  start_delay_ms: number;
  attempt_timeout_ms: number;
  created_at_ms: number;
  expires_at_ms: number;
  started: boolean;
  ready: Set<string>;
};

export class VoidDirectUpgradeRelayStateV1 {
  private sessions = new Map<string, MutableRelaySessionV1>();

  openSession(input: {
    requestId: string;
    streamId: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceObservedAddress: string;
    targetObservedAddress: string;
    startDelayMs: number;
    attemptTimeoutMs: number;
    nowMs?: number;
    allowNonPublicObservedAddress?: boolean;
  }): VoidDirectUpgradeRelaySessionSnapshotV1 {
    const requestId = idValue(input.requestId);
    const streamId = idValue(input.streamId);
    const sourceNodeId = nodeId(input.sourceNodeId);
    const targetNodeId = nodeId(input.targetNodeId);
    const sourceObservedAddress = normalizeVoidDirectUpgradeObservedAddressV1(
      input.sourceObservedAddress,
      !!input.allowNonPublicObservedAddress,
    );
    const targetObservedAddress = normalizeVoidDirectUpgradeObservedAddressV1(
      input.targetObservedAddress,
      !!input.allowNonPublicObservedAddress,
    );
    const startDelayMs = safeInteger(
      input.startDelayMs,
      VOID_P2P_DIRECT_UPGRADE_MIN_START_DELAY_MS_V1,
      VOID_P2P_DIRECT_UPGRADE_MAX_START_DELAY_MS_V1,
    );
    const attemptTimeoutMs = safeInteger(
      input.attemptTimeoutMs,
      1,
      VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPT_TIMEOUT_MS_V1,
    );
    const nowMs = safeInteger(
      input.nowMs ?? Date.now(),
      0,
      Number.MAX_SAFE_INTEGER,
    );
    if (!requestId || !streamId || !sourceNodeId || !targetNodeId ||
        sourceNodeId === targetNodeId || !sourceObservedAddress ||
        !targetObservedAddress || startDelayMs === undefined ||
        attemptTimeoutMs === undefined || nowMs === undefined) {
      throw new Error("direct-upgrade relay session input is invalid");
    }

    this.sweep(nowMs);
    if (this.sessions.size >= VOID_P2P_DIRECT_UPGRADE_MAX_RELAY_SESSIONS_V1) {
      throw new Error("direct-upgrade relay session capacity reached");
    }

    let sessionId = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = newVoidDirectUpgradeIdV1();
      if (!this.sessions.has(candidate)) {
        sessionId = candidate;
        break;
      }
    }
    if (!sessionId) {
      throw new Error("direct-upgrade relay session ID allocation collision");
    }

    const expiresAt =
      nowMs + startDelayMs + attemptTimeoutMs +
      VOID_P2P_DIRECT_UPGRADE_SESSION_GRACE_MS_V1;
    if (!Number.isSafeInteger(expiresAt)) {
      throw new Error("direct-upgrade relay session expiry overflow");
    }

    const session: MutableRelaySessionV1 = {
      session_id: sessionId,
      request_id: requestId,
      stream_id: streamId,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      source_observed_address: sourceObservedAddress,
      target_observed_address: targetObservedAddress,
      start_delay_ms: startDelayMs,
      attempt_timeout_ms: attemptTimeoutMs,
      created_at_ms: nowMs,
      expires_at_ms: expiresAt,
      started: false,
      ready: new Set<string>(),
    };
    this.sessions.set(sessionId, session);
    return this.snapshotOne(session);
  }

  sessionFor(
    sessionId: string,
    nowMs = Date.now(),
  ): VoidDirectUpgradeRelaySessionSnapshotV1 | undefined {
    this.sweep(nowMs);
    const session = this.sessions.get(sessionId);
    return session ? this.snapshotOne(session) : undefined;
  }

  markReady(
    endpointNodeId: string,
    sessionId: string,
    streamId: string,
    nowMs = Date.now(),
  ): Readonly<{
    started_now: boolean;
    session: VoidDirectUpgradeRelaySessionSnapshotV1;
  }> {
    this.sweep(nowMs);
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("direct-upgrade relay session is missing or expired");
    if (session.stream_id !== streamId) {
      throw new Error("direct-upgrade READY stream mismatch");
    }
    if (
      endpointNodeId !== session.source_node_id &&
      endpointNodeId !== session.target_node_id
    ) {
      throw new Error("direct-upgrade READY endpoint is not part of session");
    }
    session.ready.add(endpointNodeId);
    let startedNow = false;
    if (!session.started &&
        session.ready.has(session.source_node_id) &&
        session.ready.has(session.target_node_id)) {
      session.started = true;
      startedNow = true;
    }
    return Object.freeze({
      started_now: startedNow,
      session: this.snapshotOne(session),
    });
  }

  removePeer(nodeIdValue: string): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.source_node_id === nodeIdValue ||
          session.target_node_id === nodeIdValue) {
        this.sessions.delete(sessionId);
      }
    }
  }

  sweep(nowMs = Date.now()): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.expires_at_ms <= nowMs) this.sessions.delete(sessionId);
    }
  }

  snapshot(nowMs = Date.now()) {
    this.sweep(nowMs);
    const sessions = [...this.sessions.values()]
      .map((session) => this.snapshotOne(session))
      .sort((a, b) => a.session_id.localeCompare(b.session_id));
    return Object.freeze({
      session_count: sessions.length,
      sessions: Object.freeze(sessions),
    });
  }

  private snapshotOne(
    session: MutableRelaySessionV1,
  ): VoidDirectUpgradeRelaySessionSnapshotV1 {
    return Object.freeze({
      session_id: session.session_id,
      request_id: session.request_id,
      stream_id: session.stream_id,
      source_node_id: session.source_node_id,
      target_node_id: session.target_node_id,
      source_observed_address: session.source_observed_address,
      target_observed_address: session.target_observed_address,
      start_delay_ms: session.start_delay_ms,
      attempt_timeout_ms: session.attempt_timeout_ms,
      created_at_ms: session.created_at_ms,
      expires_at_ms: session.expires_at_ms,
      started: session.started,
      ready_node_ids: Object.freeze([...session.ready].sort()),
    });
  }
}

export function voidDirectUpgradeRequestTimedOutV1(
  requestedAtMs: number,
  nowMs = Date.now(),
): boolean {
  if (!Number.isSafeInteger(requestedAtMs) || requestedAtMs < 0 ||
      !Number.isSafeInteger(nowMs) || nowMs < requestedAtMs) return true;
  return nowMs - requestedAtMs > VOID_P2P_DIRECT_UPGRADE_REQUEST_TIMEOUT_MS_V1;
}
