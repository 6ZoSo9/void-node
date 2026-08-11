// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { EventEmitter } from "node:events";

import {
  VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1,
  VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1,
  VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1,
  VoidUdpSecureReliableReceiverV1,
  VoidUdpSecureReliableSenderV1,
  type VoidUdpSecurePacketV1,
} from "./udp_secure_reliable_transport_v1.js";

export const VOID_P2P_UDP_PEER_SOCKET_ADAPTER_VERSION_V1 = 1;
export const VOID_P2P_UDP_PEER_SOCKET_ADAPTER_DEFAULT_HIGH_WATER_BYTES_V1 =
  128 * 1024;
export const VOID_P2P_UDP_PEER_SOCKET_ADAPTER_DEFAULT_MAX_QUEUED_BYTES_V1 =
  512 * 1024;
export const VOID_P2P_UDP_PEER_SOCKET_ADAPTER_DEFAULT_POLL_MS_V1 = 50;

export const VOID_P2P_UDP_PEER_SOCKET_ADAPTER_AUTHORITY_V1 = Object.freeze({
  peer_socket_shape_exposed: true,
  ordered_secure_transport_required: true,
  plaintext_udp_payload_allowed: false,
  bounded_write_queue_required: true,
  bounded_retransmission_required: true,
  configurable_secure_payload_chunk_bytes: true,
  transport_exhaustion_fails_closed: true,
  runtime_node_core_mount_performed: false,
  runtime_peer_promotion_performed: false,
  verified_direct_cache_mutation_performed: false,
  relay_fallback_preserved: true,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

export type VoidUdpPeerSocketPacketTransmitV1 = (
  packet: VoidUdpSecurePacketV1,
) => void | Promise<void>;

export type VoidUdpPeerSocketAdapterOptionsV1 = Readonly<{
  autoRetransmit?: boolean;
  retransmitPollMs?: number;
  highWaterBytes?: number;
  maxQueuedBytes?: number;
  maxPayloadBytes?: number;
}>;

type QueuedChunkV1 = {
  bytes: Buffer;
};

function boundedInteger(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined) return fallback;
  if (typeof raw !== "number" || !Number.isSafeInteger(raw)) {
    throw new Error("UDP peer-socket adapter option must be an integer");
  }
  if (raw < min || raw > max) {
    throw new Error("UDP peer-socket adapter option is out of range");
  }
  return raw;
}

function toBytes(raw: Uint8Array | string): Buffer {
  if (typeof raw === "string") return Buffer.from(raw, "utf8");
  if (!(raw instanceof Uint8Array)) {
    throw new Error("UDP peer-socket write requires bytes or string");
  }
  return Buffer.from(raw);
}

export class VoidUdpPeerSocketAdapterV1 extends EventEmitter {
  private readonly queued: QueuedChunkV1[] = [];
  private queuedBytes = 0;
  private readonly pendingBytes = new Map<number, number>();
  private closed = false;
  private closeScheduled = false;
  private flushActive = false;
  private backpressured = false;
  private readonly highWaterBytes: number;
  private readonly maxQueuedBytes: number;
  private readonly maxPayloadBytes: number;
  private readonly pollMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly sender: VoidUdpSecureReliableSenderV1,
    private readonly receiver: VoidUdpSecureReliableReceiverV1,
    private readonly transmit: VoidUdpPeerSocketPacketTransmitV1,
    options: VoidUdpPeerSocketAdapterOptionsV1 = {},
  ) {
    super();
    this.highWaterBytes = boundedInteger(
      options.highWaterBytes,
      VOID_P2P_UDP_PEER_SOCKET_ADAPTER_DEFAULT_HIGH_WATER_BYTES_V1,
      1,
      16 * 1024 * 1024,
    );
    this.maxQueuedBytes = boundedInteger(
      options.maxQueuedBytes,
      VOID_P2P_UDP_PEER_SOCKET_ADAPTER_DEFAULT_MAX_QUEUED_BYTES_V1,
      this.highWaterBytes,
      32 * 1024 * 1024,
    );
    this.maxPayloadBytes = boundedInteger(
      options.maxPayloadBytes,
      VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1,
      1,
      VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1,
    );
    this.pollMs = boundedInteger(
      options.retransmitPollMs,
      VOID_P2P_UDP_PEER_SOCKET_ADAPTER_DEFAULT_POLL_MS_V1,
      10,
      VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1,
    );

    if (options.autoRetransmit !== false) {
      this.timer = setInterval(() => {
        try {
          this.tick();
        } catch (error) {
          this.destroy(error instanceof Error ? error : new Error(String(error)));
        }
      }, this.pollMs);
      this.timer.unref?.();
    }
  }

  get destroyed(): boolean {
    return this.closed;
  }

  get writableLength(): number {
    let pending = 0;
    for (const bytes of this.pendingBytes.values()) pending += bytes;
    return this.queuedBytes + pending;
  }

  private scheduleClose(error?: Error): void {
    if (this.closeScheduled) return;
    this.closeScheduled = true;
    queueMicrotask(() => {
      if (error && this.listenerCount("error") > 0) this.emit("error", error);
      this.emit("close");
    });
  }

  private noteBackpressure(): boolean {
    const writable = this.writableLength;
    if (writable >= this.highWaterBytes) {
      this.backpressured = true;
      return false;
    }
    return true;
  }

  private maybeDrain(): void {
    if (!this.backpressured) return;
    if (this.writableLength >= this.highWaterBytes) return;
    this.backpressured = false;
    queueMicrotask(() => {
      if (!this.closed) this.emit("drain");
    });
  }

  private transmitPacket(packet: VoidUdpSecurePacketV1): void {
    if (this.closed) return;
    try {
      Promise.resolve(this.transmit(packet)).catch((error) => {
        this.destroy(error instanceof Error ? error : new Error(String(error)));
      });
    } catch (error) {
      this.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private flushQueued(nowMs = Date.now()): void {
    if (this.closed || this.flushActive) return;
    this.flushActive = true;
    try {
      while (
        this.queued.length > 0 &&
        this.sender.pendingCount() < VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1
      ) {
        const item = this.queued.shift()!;
        this.queuedBytes -= item.bytes.length;
        const packet = this.sender.createData(
          item.bytes,
          this.receiver.ackSeq(),
          nowMs,
        );
        if (packet.data_seq === null) {
          throw new Error("secure UDP sender produced data packet without sequence");
        }
        this.pendingBytes.set(packet.data_seq, item.bytes.length);
        this.transmitPacket(packet);
      }
    } finally {
      this.flushActive = false;
    }
    this.maybeDrain();
  }

  private applyPeerAck(peerAckSeq: number): void {
    this.sender.acknowledge(peerAckSeq);
    for (const seq of [...this.pendingBytes.keys()]) {
      if (seq <= peerAckSeq) this.pendingBytes.delete(seq);
    }
    this.flushQueued();
    this.maybeDrain();
  }

  write(raw: Uint8Array | string): boolean {
    if (this.closed) return false;
    const bytes = toBytes(raw);
    if (bytes.length === 0) return this.noteBackpressure();

    if (this.writableLength + bytes.length > this.maxQueuedBytes) {
      this.destroy(new Error("UDP peer-socket bounded write queue exceeded"));
      return false;
    }

    for (
      let offset = 0;
      offset < bytes.length;
      offset += this.maxPayloadBytes
    ) {
      const chunk = Buffer.from(
        bytes.subarray(
          offset,
          Math.min(
            bytes.length,
            offset + this.maxPayloadBytes,
          ),
        ),
      );
      this.queued.push({ bytes: chunk });
      this.queuedBytes += chunk.length;
    }

    this.flushQueued();
    return this.noteBackpressure();
  }

  receivePacket(raw: unknown): boolean {
    if (this.closed) return false;
    const result = this.receiver.receive(raw);
    if (!result.accepted) return false;

    this.applyPeerAck(result.peer_ack_seq);

    for (const bytes of result.delivered) {
      this.emit("data", Buffer.from(bytes));
    }

    const kind =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>).kind
        : undefined;
    if (kind === "data") {
      this.transmitPacket(this.sender.createAck(this.receiver.ackSeq()));
    }
    return true;
  }

  tick(nowMs = Date.now()): void {
    if (this.closed) return;
    // Peer acknowledgements are applied immediately by receivePacket().
    // Passing the local receive ACK here would falsely acknowledge our own
    // missing outbound sequence when traffic is bidirectional. Retransmission
    // therefore performs no additional peer-ACK advancement.
    const due = this.sender.retransmitDue(-1, nowMs);
    if (due.exhausted_data_seqs.length > 0) {
      this.destroy(
        new Error(
          `secure UDP retransmission exhausted: ${due.exhausted_data_seqs.join(",")}`,
        ),
      );
      return;
    }
    for (const packet of due.packets) this.transmitPacket(packet);
    this.flushQueued(nowMs);
  }

  destroy(error?: Error): this {
    if (this.closed) return this;
    this.closed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.queued.length = 0;
    this.queuedBytes = 0;
    this.pendingBytes.clear();
    this.scheduleClose(error);
    return this;
  }
}
