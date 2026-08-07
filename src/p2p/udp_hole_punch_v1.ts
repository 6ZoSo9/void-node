// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import * as net from "node:net";

export const VOID_P2P_UDP_HOLE_PUNCH_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_UDP_HOLE_PUNCH_DEFAULT_LOCAL_BIND_PORT_V1 = 0;
export const VOID_P2P_UDP_HOLE_PUNCH_FIXED_PARTICIPANT_PORT_REQUIRED_V1 = false;
export const VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MIN_V1 = 49_152;
export const VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MAX_V1 = 65_535;
export const VOID_P2P_UDP_HOLE_PUNCH_MIN_START_DELAY_MS_V1 = 25;
export const VOID_P2P_UDP_HOLE_PUNCH_MAX_START_DELAY_MS_V1 = 2_000;
export const VOID_P2P_UDP_HOLE_PUNCH_MIN_INTERVAL_MS_V1 = 25;
export const VOID_P2P_UDP_HOLE_PUNCH_MAX_INTERVAL_MS_V1 = 500;
export const VOID_P2P_UDP_HOLE_PUNCH_MIN_BURST_COUNT_V1 = 2;
export const VOID_P2P_UDP_HOLE_PUNCH_MAX_BURST_COUNT_V1 = 16;
export const VOID_P2P_UDP_HOLE_PUNCH_MAX_ATTEMPT_MS_V1 = 10_000;
export const VOID_P2P_UDP_HOLE_PUNCH_MAX_PACKET_BYTES_V1 = 512;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const ID_RE = /^[0-9a-f]{32}$/;
const CONTROL_OR_SPACE = /[\u0000-\u001f\u007f\s]/;

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

export type VoidUdpHolePunchPacketV1 = Readonly<{
  type: "VOID_UDP_PUNCH";
  protocol: 1;
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  nonce: string;
  attempt: number;
}>;

export type VoidUdpHolePunchPlanV1 = Readonly<{
  session_id: string;
  local_node_id: string;
  peer_node_id: string;
  peer_observed_endpoint: string;
  start_delay_ms: number;
  burst_interval_ms: number;
  burst_count: number;
  attempt_timeout_ms: number;
  send_offsets_ms: readonly number[];
}>;

export const VOID_P2P_UDP_HOLE_PUNCH_AUTHORITY_V1 = Object.freeze({
  peer_identity_authenticated_by_punch_packet: false,
  observed_endpoint_defines_node_identity: false,
  fixed_participant_port_required: false,
  literal_video_game_port_required: false,
  router_configuration_required: false,
  port_forward_required: false,
  upnp_required: false,
  nat_pmp_required: false,
  relay_fallback_required_for_all_nodes: false,
  direct_path_success_claimed: false,
  runtime_integration_performed: false,
  wallet_signer_validator_wc_money_authority: 0,
});

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function safeInteger(raw: unknown, min: number, max: number): number | undefined {
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) return;
  if (raw < min || raw > max) return;
  return raw;
}

function nodeId(raw: unknown): string | undefined {
  return typeof raw === "string" && NODE_ID_RE.test(raw) ? raw : undefined;
}

function idValue(raw: unknown): string | undefined {
  return typeof raw === "string" && ID_RE.test(raw) ? raw : undefined;
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

export function newVoidUdpHolePunchIdV1(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function isVoidUdpDynamicPrivatePortV1(raw: unknown): boolean {
  return typeof raw === "number" &&
    Number.isSafeInteger(raw) &&
    raw >= VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MIN_V1 &&
    raw <= VOID_P2P_UDP_HOLE_PUNCH_DYNAMIC_PRIVATE_PORT_MAX_V1;
}

export function normalizeVoidUdpObservedEndpointV1(
  raw: unknown,
  allowNonPublic = false,
): string | undefined {
  if (
    typeof raw !== "string" ||
    raw.length < 3 ||
    raw.length > 256 ||
    CONTROL_OR_SPACE.test(raw)
  ) return;

  let host = "";
  let portText = "";

  if (raw.startsWith("[")) {
    const close = raw.indexOf("]");
    if (close <= 1 || raw[close + 1] !== ":") return;
    if (raw.indexOf("]", close + 1) !== -1) return;
    host = raw.slice(1, close);
    portText = raw.slice(close + 2);
    if (net.isIP(host) !== 6) return;
    const normalized = canonicalIPv6Host(host);
    if (!normalized) return;
    host = normalized;
  } else {
    const colon = raw.lastIndexOf(":");
    if (colon <= 0 || raw.indexOf(":") !== colon) return;
    host = raw.slice(0, colon);
    portText = raw.slice(colon + 1);
    if (net.isIP(host) !== 4) return;
  }

  if (!/^[0-9]+$/.test(portText)) return;
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return;

  const family = net.isIP(host);
  if (family !== 4 && family !== 6) return;
  if (!allowNonPublic && !publicIp(host)) return;

  const canonical = family === 6 ? `[${host}]:${port}` : `${host}:${port}`;
  return canonical === raw ? canonical : undefined;
}

export function createVoidUdpHolePunchPacketV1(input: {
  sessionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  nonce?: string;
  attempt: number;
}): VoidUdpHolePunchPacketV1 {
  const sessionId = idValue(input.sessionId);
  const sourceNodeId = nodeId(input.sourceNodeId);
  const targetNodeId = nodeId(input.targetNodeId);
  const nonce = idValue(input.nonce ?? newVoidUdpHolePunchIdV1());
  const attempt = safeInteger(
    input.attempt,
    0,
    VOID_P2P_UDP_HOLE_PUNCH_MAX_BURST_COUNT_V1 - 1,
  );
  if (
    !sessionId ||
    !sourceNodeId ||
    !targetNodeId ||
    sourceNodeId === targetNodeId ||
    !nonce ||
    attempt === undefined
  ) {
    throw new Error("UDP hole-punch packet input is invalid");
  }
  return Object.freeze({
    type: "VOID_UDP_PUNCH",
    protocol: VOID_P2P_UDP_HOLE_PUNCH_PROTOCOL_VERSION_V1,
    session_id: sessionId,
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    nonce,
    attempt,
  });
}

export function encodeVoidUdpHolePunchPacketV1(
  packet: VoidUdpHolePunchPacketV1,
): Buffer {
  const normalized = normalizeVoidUdpHolePunchPacketV1(packet);
  if (!normalized) throw new Error("UDP hole-punch packet is invalid");
  const bytes = Buffer.from(JSON.stringify(normalized), "utf8");
  if (bytes.length > VOID_P2P_UDP_HOLE_PUNCH_MAX_PACKET_BYTES_V1) {
    throw new Error("UDP hole-punch packet exceeds byte limit");
  }
  return bytes;
}

export function normalizeVoidUdpHolePunchPacketV1(
  raw: unknown,
): VoidUdpHolePunchPacketV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, [
    "type",
    "protocol",
    "session_id",
    "source_node_id",
    "target_node_id",
    "nonce",
    "attempt",
  ])) return;
  if (value.type !== "VOID_UDP_PUNCH") return;
  if (value.protocol !== VOID_P2P_UDP_HOLE_PUNCH_PROTOCOL_VERSION_V1) return;
  const session_id = idValue(value.session_id);
  const source_node_id = nodeId(value.source_node_id);
  const target_node_id = nodeId(value.target_node_id);
  const nonce = idValue(value.nonce);
  const attempt = safeInteger(
    value.attempt,
    0,
    VOID_P2P_UDP_HOLE_PUNCH_MAX_BURST_COUNT_V1 - 1,
  );
  if (
    !session_id ||
    !source_node_id ||
    !target_node_id ||
    source_node_id === target_node_id ||
    !nonce ||
    attempt === undefined
  ) return;
  return Object.freeze({
    type: "VOID_UDP_PUNCH",
    protocol: VOID_P2P_UDP_HOLE_PUNCH_PROTOCOL_VERSION_V1,
    session_id,
    source_node_id,
    target_node_id,
    nonce,
    attempt,
  });
}

export function decodeVoidUdpHolePunchPacketV1(
  raw: Uint8Array,
): VoidUdpHolePunchPacketV1 | undefined {
  if (!(raw instanceof Uint8Array)) return;
  if (raw.byteLength < 2 || raw.byteLength > VOID_P2P_UDP_HOLE_PUNCH_MAX_PACKET_BYTES_V1) {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw).toString("utf8"));
  } catch {
    return;
  }
  return normalizeVoidUdpHolePunchPacketV1(parsed);
}

export function createVoidUdpHolePunchPlanV1(input: {
  sessionId: string;
  localNodeId: string;
  peerNodeId: string;
  peerObservedEndpoint: string;
  startDelayMs?: number;
  burstIntervalMs?: number;
  burstCount?: number;
  attemptTimeoutMs?: number;
  allowNonPublicObservedEndpoint?: boolean;
}): VoidUdpHolePunchPlanV1 {
  const sessionId = idValue(input.sessionId);
  const localNodeId = nodeId(input.localNodeId);
  const peerNodeId = nodeId(input.peerNodeId);
  const peerObservedEndpoint = normalizeVoidUdpObservedEndpointV1(
    input.peerObservedEndpoint,
    input.allowNonPublicObservedEndpoint === true,
  );
  const startDelayMs = safeInteger(
    input.startDelayMs ?? 100,
    VOID_P2P_UDP_HOLE_PUNCH_MIN_START_DELAY_MS_V1,
    VOID_P2P_UDP_HOLE_PUNCH_MAX_START_DELAY_MS_V1,
  );
  const burstIntervalMs = safeInteger(
    input.burstIntervalMs ?? 75,
    VOID_P2P_UDP_HOLE_PUNCH_MIN_INTERVAL_MS_V1,
    VOID_P2P_UDP_HOLE_PUNCH_MAX_INTERVAL_MS_V1,
  );
  const burstCount = safeInteger(
    input.burstCount ?? 8,
    VOID_P2P_UDP_HOLE_PUNCH_MIN_BURST_COUNT_V1,
    VOID_P2P_UDP_HOLE_PUNCH_MAX_BURST_COUNT_V1,
  );
  const attemptTimeoutMs = safeInteger(
    input.attemptTimeoutMs ?? 3_000,
    1,
    VOID_P2P_UDP_HOLE_PUNCH_MAX_ATTEMPT_MS_V1,
  );

  if (
    !sessionId ||
    !localNodeId ||
    !peerNodeId ||
    localNodeId === peerNodeId ||
    !peerObservedEndpoint ||
    startDelayMs === undefined ||
    burstIntervalMs === undefined ||
    burstCount === undefined ||
    attemptTimeoutMs === undefined
  ) {
    throw new Error("UDP hole-punch plan input is invalid");
  }

  const lastOffset = startDelayMs + (burstCount - 1) * burstIntervalMs;
  if (lastOffset > attemptTimeoutMs) {
    throw new Error("UDP hole-punch burst schedule exceeds attempt timeout");
  }

  const sendOffsets = Object.freeze(
    Array.from({ length: burstCount }, (_, index) =>
      startDelayMs + index * burstIntervalMs,
    ),
  );

  return Object.freeze({
    session_id: sessionId,
    local_node_id: localNodeId,
    peer_node_id: peerNodeId,
    peer_observed_endpoint: peerObservedEndpoint,
    start_delay_ms: startDelayMs,
    burst_interval_ms: burstIntervalMs,
    burst_count: burstCount,
    attempt_timeout_ms: attemptTimeoutMs,
    send_offsets_ms: sendOffsets,
  });
}

export function voidUdpHolePunchPacketMatchesPlanV1(
  packet: VoidUdpHolePunchPacketV1,
  plan: VoidUdpHolePunchPlanV1,
): boolean {
  const normalized = normalizeVoidUdpHolePunchPacketV1(packet);
  if (!normalized) return false;
  return (
    normalized.session_id === plan.session_id &&
    normalized.source_node_id === plan.peer_node_id &&
    normalized.target_node_id === plan.local_node_id &&
    normalized.attempt < plan.burst_count
  );
}
