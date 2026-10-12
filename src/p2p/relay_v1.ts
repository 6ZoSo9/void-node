// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import { EventEmitter } from "node:events";

export const VOID_P2P_RELAY_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_RELAY_DEFAULT_RESERVATION_TTL_MS_V1 = 2 * 60 * 1000;
export const VOID_P2P_RELAY_MIN_RESERVATION_TTL_MS_V1 = 1_000;
export const VOID_P2P_RELAY_MAX_RESERVATION_TTL_MS_V1 = 10 * 60 * 1000;
export const VOID_P2P_RELAY_MAX_RESERVATIONS_V1 = 256;
export const VOID_P2P_RELAY_MAX_STREAMS_V1 = 256;
export const VOID_P2P_RELAY_MAX_STREAMS_PER_PEER_V1 = 8;
export const VOID_P2P_RELAY_MAX_PENDING_REQUESTS_V1 = 64;
export const VOID_P2P_RELAY_REQUEST_TIMEOUT_MS_V1 = 5_000;
export const VOID_P2P_RELAY_MAX_DATA_BYTES_V1 = 24 * 1024;
export const VOID_P2P_RELAY_MAX_QUEUED_BYTES_V1 = 128 * 1024;
export const VOID_P2P_RELAY_STREAM_IDLE_TIMEOUT_MS_V1 = 60_000;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const RELAY_ID_RE = /^[0-9a-f]{32}$/;
const CONTROL_OR_SPACE = /[\u0000-\u001f\u007f]/;
const MAX_REASON_CHARS = 160;
const MAX_DATA_B64_CHARS = Math.ceil(VOID_P2P_RELAY_MAX_DATA_BYTES_V1 / 3) * 4;

export type VoidRelayReserveV1 = Readonly<{
  type: "RELAY_RESERVE";
  request_id: string;
  ttl_ms: number;
}>;
export type VoidRelayReservedV1 = Readonly<{
  type: "RELAY_RESERVED";
  request_id: string;
  reservation_id: string;
  ttl_ms: number;
}>;
export type VoidRelayConnectV1 = Readonly<{
  type: "RELAY_CONNECT";
  request_id: string;
  target_node_id: string;
}>;
export type VoidRelayConnectedV1 = Readonly<{
  type: "RELAY_CONNECTED";
  request_id: string;
  stream_id: string;
  target_node_id: string;
}>;
export type VoidRelayIncomingV1 = Readonly<{
  type: "RELAY_INCOMING";
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  reservation_id: string;
}>;
export type VoidRelayReadyV1 = Readonly<{ type: "RELAY_READY"; stream_id: string }>;
export type VoidRelayStartV1 = Readonly<{ type: "RELAY_START"; stream_id: string }>;
export type VoidRelayDataV1 = Readonly<{
  type: "RELAY_DATA";
  stream_id: string;
  data_b64: string;
}>;
export type VoidRelayCloseV1 = Readonly<{
  type: "RELAY_CLOSE";
  stream_id: string;
  reason: string;
}>;
export type VoidRelayRejectV1 = Readonly<{
  type: "RELAY_REJECT";
  request_id: string;
  reason: string;
}>;

export type VoidRelayControlMessageV1 =
  | VoidRelayReserveV1
  | VoidRelayReservedV1
  | VoidRelayConnectV1
  | VoidRelayConnectedV1
  | VoidRelayIncomingV1
  | VoidRelayReadyV1
  | VoidRelayStartV1
  | VoidRelayDataV1
  | VoidRelayCloseV1
  | VoidRelayRejectV1;

const RELAY_TYPES = new Set<string>([
  "RELAY_RESERVE", "RELAY_RESERVED", "RELAY_CONNECT", "RELAY_CONNECTED",
  "RELAY_INCOMING", "RELAY_READY", "RELAY_START", "RELAY_DATA",
  "RELAY_CLOSE", "RELAY_REJECT",
]);

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
function relayId(raw: unknown): string | undefined {
  return typeof raw === "string" && RELAY_ID_RE.test(raw) ? raw : undefined;
}
function nodeId(raw: unknown): string | undefined {
  return typeof raw === "string" && NODE_ID_RE.test(raw) ? raw : undefined;
}
function reasonText(raw: unknown): string | undefined {
  if (
    typeof raw !== "string" || raw.length < 1 || raw.length > MAX_REASON_CHARS ||
    raw !== raw.trim() || CONTROL_OR_SPACE.test(raw)
  ) return;
  return raw;
}

export function newVoidRelayIdV1(): string {
  return crypto.randomBytes(16).toString("hex");
}
export function isVoidRelayControlTypeV1(raw: unknown): boolean {
  return typeof raw === "string" && RELAY_TYPES.has(raw);
}
export function decodeVoidRelayDataV1(raw: string): Buffer | undefined {
  if (
    typeof raw !== "string" || raw.length < 4 || raw.length > MAX_DATA_B64_CHARS ||
    raw.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)
  ) return;
  const decoded = Buffer.from(raw, "base64");
  if (
    decoded.length < 1 || decoded.length > VOID_P2P_RELAY_MAX_DATA_BYTES_V1 ||
    decoded.toString("base64") !== raw
  ) return;
  return decoded;
}

export function normalizeVoidRelayControlMessageV1(
  raw: unknown,
): VoidRelayControlMessageV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  const type = typeof value.type === "string" ? value.type : "";

  if (type === "RELAY_RESERVE") {
    if (!exactKeys(value, ["type", "request_id", "ttl_ms"])) return;
    const request_id = relayId(value.request_id);
    const ttl_ms = safeInteger(
      value.ttl_ms,
      VOID_P2P_RELAY_MIN_RESERVATION_TTL_MS_V1,
      VOID_P2P_RELAY_MAX_RESERVATION_TTL_MS_V1,
    );
    if (!request_id || ttl_ms === undefined) return;
    return Object.freeze({ type, request_id, ttl_ms });
  }
  if (type === "RELAY_RESERVED") {
    if (!exactKeys(value, ["type", "request_id", "reservation_id", "ttl_ms"])) return;
    const request_id = relayId(value.request_id);
    const reservation_id = relayId(value.reservation_id);
    const ttl_ms = safeInteger(
      value.ttl_ms,
      VOID_P2P_RELAY_MIN_RESERVATION_TTL_MS_V1,
      VOID_P2P_RELAY_MAX_RESERVATION_TTL_MS_V1,
    );
    if (!request_id || !reservation_id || ttl_ms === undefined) return;
    return Object.freeze({ type, request_id, reservation_id, ttl_ms });
  }
  if (type === "RELAY_CONNECT") {
    if (!exactKeys(value, ["type", "request_id", "target_node_id"])) return;
    const request_id = relayId(value.request_id);
    const target_node_id = nodeId(value.target_node_id);
    if (!request_id || !target_node_id) return;
    return Object.freeze({ type, request_id, target_node_id });
  }
  if (type === "RELAY_CONNECTED") {
    if (!exactKeys(value, ["type", "request_id", "stream_id", "target_node_id"])) return;
    const request_id = relayId(value.request_id);
    const stream_id = relayId(value.stream_id);
    const target_node_id = nodeId(value.target_node_id);
    if (!request_id || !stream_id || !target_node_id) return;
    return Object.freeze({ type, request_id, stream_id, target_node_id });
  }
  if (type === "RELAY_INCOMING") {
    if (!exactKeys(value, [
      "type",
      "stream_id",
      "source_node_id",
      "target_node_id",
      "reservation_id",
    ])) return;
    const stream_id = relayId(value.stream_id);
    const source_node_id = nodeId(value.source_node_id);
    const target_node_id = nodeId(value.target_node_id);
    const reservation_id = relayId(value.reservation_id);
    if (!stream_id || !source_node_id || !target_node_id || !reservation_id) return;
    return Object.freeze({
      type,
      stream_id,
      source_node_id,
      target_node_id,
      reservation_id,
    });
  }
  if (type === "RELAY_READY" || type === "RELAY_START") {
    if (!exactKeys(value, ["type", "stream_id"])) return;
    const stream_id = relayId(value.stream_id);
    if (!stream_id) return;
    return Object.freeze({ type, stream_id });
  }
  if (type === "RELAY_DATA") {
    if (!exactKeys(value, ["type", "stream_id", "data_b64"])) return;
    const stream_id = relayId(value.stream_id);
    const data_b64 = typeof value.data_b64 === "string" ? value.data_b64 : "";
    if (!stream_id || !decodeVoidRelayDataV1(data_b64)) return;
    return Object.freeze({ type, stream_id, data_b64 });
  }
  if (type === "RELAY_CLOSE") {
    if (!exactKeys(value, ["type", "stream_id", "reason"])) return;
    const stream_id = relayId(value.stream_id);
    const reason = reasonText(value.reason);
    if (!stream_id || !reason) return;
    return Object.freeze({ type, stream_id, reason });
  }
  if (type === "RELAY_REJECT") {
    if (!exactKeys(value, ["type", "request_id", "reason"])) return;
    const request_id = relayId(value.request_id);
    const reason = reasonText(value.reason);
    if (!request_id || !reason) return;
    return Object.freeze({ type, request_id, reason });
  }
  return;
}

export type VoidRelayReservationRecordV1 = Readonly<{
  node_id: string;
  reservation_id: string;
  ttl_ms: number;
  expires_at_ms: number;
}>;
export type VoidRelayStreamRecordV1 = Readonly<{
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  target_reservation_id: string;
  created_at_ms: number;
  last_activity_at_ms: number;
  started: boolean;
}>;
type MutableRelayStreamV1 = {
  stream_id: string;
  source_node_id: string;
  target_node_id: string;
  target_reservation_id: string;
  created_at_ms: number;
  last_activity_at_ms: number;
  started: boolean;
  ready: Set<string>;
};

export function voidRelayRequestTimedOutV1(
  requestedAtMs: number,
  nowMs = Date.now(),
): boolean {
  if (
    !Number.isSafeInteger(requestedAtMs) ||
    requestedAtMs < 0 ||
    !Number.isSafeInteger(nowMs) ||
    nowMs < requestedAtMs
  ) {
    return true;
  }
  return nowMs - requestedAtMs > VOID_P2P_RELAY_REQUEST_TIMEOUT_MS_V1;
}

export function voidRelayWritableQueueWithinBoundV1(
  currentQueuedBytes: number,
  nextFrameBytes: number,
): boolean {
  if (
    !Number.isSafeInteger(currentQueuedBytes) ||
    currentQueuedBytes < 0 ||
    !Number.isSafeInteger(nextFrameBytes) ||
    nextFrameBytes < 1
  ) {
    return false;
  }
  return (
    currentQueuedBytes <= VOID_P2P_RELAY_MAX_QUEUED_BYTES_V1 &&
    nextFrameBytes <= VOID_P2P_RELAY_MAX_QUEUED_BYTES_V1 &&
    currentQueuedBytes + nextFrameBytes <=
      VOID_P2P_RELAY_MAX_QUEUED_BYTES_V1
  );
}

export function voidRelayClientExpiryV1(
  requestedAtMs: number,
  requestedTtlMs: number,
  responseTtlMs: number,
  nowMs = Date.now(),
): number | undefined {
  if (
    !Number.isSafeInteger(requestedAtMs) ||
    requestedAtMs < 0 ||
    !Number.isSafeInteger(nowMs) ||
    nowMs < requestedAtMs
  ) return;
  const requested = safeInteger(
    requestedTtlMs,
    VOID_P2P_RELAY_MIN_RESERVATION_TTL_MS_V1,
    VOID_P2P_RELAY_MAX_RESERVATION_TTL_MS_V1,
  );
  const response = safeInteger(
    responseTtlMs,
    VOID_P2P_RELAY_MIN_RESERVATION_TTL_MS_V1,
    VOID_P2P_RELAY_MAX_RESERVATION_TTL_MS_V1,
  );
  if (
    requested === undefined ||
    response === undefined ||
    response > requested
  ) return;
  const expiresAtMs = requestedAtMs + response;
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= nowMs) return;
  return expiresAtMs;
}

export class VoidRelayServerStateV1 {
  private reservations = new Map<string, VoidRelayReservationRecordV1>();
  private streams = new Map<string, MutableRelayStreamV1>();

  reserve(
    nodeIdValue: string,
    ttlMs = VOID_P2P_RELAY_DEFAULT_RESERVATION_TTL_MS_V1,
    nowMs = Date.now(),
  ): VoidRelayReservationRecordV1 {
    if (!NODE_ID_RE.test(nodeIdValue)) throw new Error("relay reservation node ID is invalid");
    const ttl = safeInteger(
      ttlMs,
      VOID_P2P_RELAY_MIN_RESERVATION_TTL_MS_V1,
      VOID_P2P_RELAY_MAX_RESERVATION_TTL_MS_V1,
    );
    if (ttl === undefined) throw new Error("relay reservation TTL is invalid");
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("relay clock is invalid");
    this.sweep(nowMs);
    if (!this.reservations.has(nodeIdValue) &&
        this.reservations.size >= VOID_P2P_RELAY_MAX_RESERVATIONS_V1) {
      throw new Error("relay reservation capacity reached");
    }
    const record = Object.freeze({
      node_id: nodeIdValue,
      reservation_id: newVoidRelayIdV1(),
      ttl_ms: ttl,
      expires_at_ms: nowMs + ttl,
    });
    this.reservations.set(nodeIdValue, record);
    return record;
  }

  openStream(
    sourceNodeId: string,
    targetNodeId: string,
    nowMs = Date.now(),
  ): VoidRelayStreamRecordV1 {
    if (!NODE_ID_RE.test(sourceNodeId) || !NODE_ID_RE.test(targetNodeId)) {
      throw new Error("relay stream endpoint node ID is invalid");
    }
    if (sourceNodeId === targetNodeId) throw new Error("relay self/loop stream rejected");
    this.sweep(nowMs);
    const reservation = this.reservations.get(targetNodeId);
    if (!reservation || reservation.expires_at_ms <= nowMs) {
      throw new Error("relay target has no active reservation");
    }
    if (this.streams.size >= VOID_P2P_RELAY_MAX_STREAMS_V1) {
      throw new Error("relay stream capacity reached");
    }
    for (const endpoint of [sourceNodeId, targetNodeId]) {
      const count = [...this.streams.values()].filter(
        (stream) => stream.source_node_id === endpoint || stream.target_node_id === endpoint,
      ).length;
      if (count >= VOID_P2P_RELAY_MAX_STREAMS_PER_PEER_V1) {
        throw new Error("relay per-peer stream capacity reached");
      }
    }
    let streamId = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = newVoidRelayIdV1();
      if (!this.streams.has(candidate)) {
        streamId = candidate;
        break;
      }
    }
    if (!streamId) throw new Error("relay stream ID allocation collision");

    const stream: MutableRelayStreamV1 = {
      stream_id: streamId,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      target_reservation_id: reservation.reservation_id,
      created_at_ms: nowMs,
      last_activity_at_ms: nowMs,
      started: false,
      ready: new Set<string>(),
    };
    this.streams.set(stream.stream_id, stream);
    return this.snapshotStream(stream);
  }

  hasStream(streamId: string): boolean { return this.streams.has(streamId); }

  reservationFor(
    nodeIdValue: string,
    nowMs = Date.now(),
  ): VoidRelayReservationRecordV1 | undefined {
    this.sweep(nowMs);
    return this.reservations.get(nodeIdValue);
  }

  markReady(endpointNodeId: string, streamId: string, nowMs = Date.now()) {
    const stream = this.requireEndpoint(endpointNodeId, streamId, nowMs);
    if (stream.started) {
      return Object.freeze({ started_now: false, stream: this.snapshotStream(stream) });
    }
    stream.ready.add(endpointNodeId);
    let startedNow = false;
    if (stream.ready.has(stream.source_node_id) && stream.ready.has(stream.target_node_id)) {
      stream.started = true;
      stream.last_activity_at_ms = nowMs;
      startedNow = true;
    }
    return Object.freeze({ started_now: startedNow, stream: this.snapshotStream(stream) });
  }

  routeData(endpointNodeId: string, streamId: string, dataBytes: number, nowMs = Date.now()) {
    if (!Number.isSafeInteger(dataBytes) || dataBytes < 1 ||
        dataBytes > VOID_P2P_RELAY_MAX_DATA_BYTES_V1) {
      throw new Error("relay data size is invalid");
    }
    const stream = this.requireEndpoint(endpointNodeId, streamId, nowMs);
    if (!stream.started) throw new Error("relay stream is not started");
    stream.last_activity_at_ms = nowMs;
    const counterpart_node_id =
      endpointNodeId === stream.source_node_id ? stream.target_node_id : stream.source_node_id;
    return Object.freeze({
      counterpart_node_id,
      stream: this.snapshotStream(stream),
    });
  }

  closeStream(endpointNodeId: string, streamId: string, nowMs = Date.now()) {
    this.sweep(nowMs);
    const stream = this.streams.get(streamId);
    if (!stream) return;
    if (endpointNodeId !== stream.source_node_id && endpointNodeId !== stream.target_node_id) {
      throw new Error("relay close endpoint is not part of stream");
    }
    this.streams.delete(streamId);
    return this.snapshotStream(stream);
  }

  removePeer(nodeIdValue: string): readonly VoidRelayStreamRecordV1[] {
    this.reservations.delete(nodeIdValue);
    const closed: VoidRelayStreamRecordV1[] = [];
    for (const [streamId, stream] of this.streams) {
      if (stream.source_node_id === nodeIdValue || stream.target_node_id === nodeIdValue) {
        closed.push(this.snapshotStream(stream));
        this.streams.delete(streamId);
      }
    }
    return Object.freeze(closed);
  }

  sweep(nowMs = Date.now()): readonly VoidRelayStreamRecordV1[] {
    for (const [nodeIdValue, reservation] of this.reservations) {
      if (reservation.expires_at_ms <= nowMs) this.reservations.delete(nodeIdValue);
    }
    const closed: VoidRelayStreamRecordV1[] = [];
    for (const [streamId, stream] of this.streams) {
      const targetReservation = this.reservations.get(stream.target_node_id);
      if (!targetReservation ||
          nowMs - stream.last_activity_at_ms > VOID_P2P_RELAY_STREAM_IDLE_TIMEOUT_MS_V1) {
        closed.push(this.snapshotStream(stream));
        this.streams.delete(streamId);
      }
    }
    return Object.freeze(closed);
  }

  snapshot(nowMs = Date.now()) {
    this.sweep(nowMs);
    const reservations = [...this.reservations.values()]
      .sort((a, b) => a.node_id.localeCompare(b.node_id));
    const streams = [...this.streams.values()]
      .map((stream) => this.snapshotStream(stream))
      .sort((a, b) => a.stream_id.localeCompare(b.stream_id));
    return Object.freeze({
      reservation_count: reservations.length,
      stream_count: streams.length,
      reservations: Object.freeze(reservations),
      streams: Object.freeze(streams),
    });
  }

  private requireEndpoint(endpointNodeId: string, streamId: string, nowMs: number) {
    this.sweep(nowMs);
    const stream = this.streams.get(streamId);
    if (!stream) throw new Error("relay stream is missing or expired");
    if (endpointNodeId !== stream.source_node_id && endpointNodeId !== stream.target_node_id) {
      throw new Error("relay endpoint is not part of stream");
    }
    return stream;
  }
  private snapshotStream(stream: MutableRelayStreamV1): VoidRelayStreamRecordV1 {
    return Object.freeze({
      stream_id: stream.stream_id,
      source_node_id: stream.source_node_id,
      target_node_id: stream.target_node_id,
      target_reservation_id: stream.target_reservation_id,
      created_at_ms: stream.created_at_ms,
      last_activity_at_ms: stream.last_activity_at_ms,
      started: stream.started,
    });
  }
}

export class VoidRelayVirtualSocketV1 extends EventEmitter {
  readonly streamId: string;
  destroyed = false;
  private active = false;
  private remoteClosing = false;
  private pending: Buffer[] = [];
  private pendingBytes = 0;

  constructor(
    streamId: string,
    private readonly sendData: (dataB64: string) => void,
    private readonly sendClose: (reason: string) => void,
  ) {
    super();
    if (!RELAY_ID_RE.test(streamId)) throw new Error("relay virtual stream ID is invalid");
    this.streamId = streamId;
  }

  write(data: Uint8Array | string): boolean {
    if (this.destroyed) return false;
    try {
      const bytes = Buffer.from(data);
      for (let offset = 0; offset < bytes.length; offset += VOID_P2P_RELAY_MAX_DATA_BYTES_V1) {
        const chunk = bytes.subarray(
          offset,
          Math.min(offset + VOID_P2P_RELAY_MAX_DATA_BYTES_V1, bytes.length),
        );
        if (chunk.length) this.sendData(chunk.toString("base64"));
      }
      return true;
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  feedBase64(dataB64: string): void {
    if (this.destroyed) return;
    const bytes = decodeVoidRelayDataV1(dataB64);
    if (!bytes) {
      this.destroy(new Error("invalid relayed data frame"));
      return;
    }
    if (!this.active) {
      if (this.pendingBytes + bytes.length > VOID_P2P_RELAY_MAX_QUEUED_BYTES_V1) {
        this.destroy(new Error("relay virtual socket pre-start queue exceeded"));
        return;
      }
      this.pending.push(bytes);
      this.pendingBytes += bytes.length;
      return;
    }
    this.emit("data", bytes);
  }

  activate(): void {
    if (this.destroyed || this.active) return;
    this.active = true;
    const pending = this.pending;
    this.pending = [];
    this.pendingBytes = 0;
    for (const bytes of pending) {
      if (this.destroyed) return;
      this.emit("data", bytes);
    }
  }

  remoteClose(_reason = "remote_close"): void {
    if (this.destroyed) return;
    this.remoteClosing = true;
    this.destroyed = true;
    this.pending = [];
    this.pendingBytes = 0;
    this.emit("close");
  }

  destroy(error?: Error): this {
    if (this.destroyed) return this;
    this.destroyed = true;
    this.pending = [];
    this.pendingBytes = 0;
    if (!this.remoteClosing) {
      try {
        this.sendClose(error ? "relay_stream_error" : "relay_stream_closed");
      } catch (closeError) {
        if (!error) {
          error = closeError instanceof Error ? closeError : new Error(String(closeError));
        }
      }
    }
    if (error) this.emit("error", error);
    this.emit("close");
    return this;
  }
}
