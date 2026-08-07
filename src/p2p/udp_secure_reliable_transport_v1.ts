// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

import {
  canonicalEd25519PublicPemV1,
  deriveVoidNodeIdFromPublicPemV1,
} from "./auth_v1.js";
import { normalizeVoidUdpObservedEndpointV1 } from "./udp_hole_punch_v1.js";

export const VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1 = 16 * 1024;
export const VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1 = 32;
export const VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1 = 64;
export const VOID_P2P_UDP_SECURE_RELIABLE_PACKET_REPLAY_WINDOW_V1 = 256;
export const VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1 = 250;
export const VOID_P2P_UDP_SECURE_RELIABLE_MAX_RETRIES_V1 = 5;
export const VOID_P2P_UDP_SECURE_RELIABLE_MAX_PACKET_BYTES_V1 = 24 * 1024;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const ID_RE = /^[0-9a-f]{32}$/;
const NONCE_RE = /^[0-9a-f]{32}$/;
const SIGNATURE_RE = /^[0-9a-f]{128}$/;
const KEY_DOMAIN = "VOID_P2P_UDP_SECURE_RELIABLE_KEY_V1";
const AEAD_DOMAIN = "VOID_P2P_UDP_SECURE_RELIABLE_PACKET_V1";
const KDF_DOMAIN = "VOID_P2P_UDP_SECURE_RELIABLE_KDF_V1";

export type VoidUdpSecureKeyOfferV1 = Readonly<{
  type: "VOID_UDP_SECURE_KEY";
  protocol: 1;
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  ed25519_pubkey: string;
  x25519_pubkey_b64: string;
  source_observed_endpoint: string;
  target_observed_endpoint: string;
  nonce: string;
  sig: string;
}>;

export type VoidUdpSecurePacketKindV1 = "data" | "ack";

export type VoidUdpSecurePacketV1 = Readonly<{
  type: "VOID_UDP_SECURE_PACKET";
  protocol: 1;
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  kind: VoidUdpSecurePacketKindV1;
  packet_no: number;
  data_seq: number | null;
  ack_seq: number;
  ciphertext_b64: string;
  tag_b64: string;
}>;

export type VoidUdpSecureDirectionKeysV1 = Readonly<{
  session_id: string;
  local_node_id: string;
  peer_node_id: string;
  send_key: Buffer;
  recv_key: Buffer;
  send_nonce_prefix: Buffer;
  recv_nonce_prefix: Buffer;
}>;

export const VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1 = Object.freeze({
  x25519_ephemeral_key_agreement_required: true,
  x25519_offer_ed25519_bound: true,
  aes_256_gcm_payload_protection: true,
  ordered_delivery_supported: true,
  bounded_retransmission_supported: true,
  packet_replay_rejected: true,
  unbounded_retry_allowed: false,
  congestion_control_claimed: false,
  runtime_peer_promotion_performed: false,
  verified_direct_cache_mutation_performed: false,
  relay_fallback_preserved: true,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function safeInteger(
  raw: unknown,
  min: number,
  max: number,
): number | undefined {
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

function nonceValue(raw: unknown): string | undefined {
  return typeof raw === "string" && NONCE_RE.test(raw) ? raw : undefined;
}

function canonicalBase64(raw: unknown, minBytes: number, maxBytes: number): string | undefined {
  if (typeof raw !== "string" || raw.length < 4 || raw.length > maxBytes * 2) return;
  if (raw.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return;
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length < minBytes || decoded.length > maxBytes) return;
  if (decoded.toString("base64") !== raw) return;
  return raw;
}

export function canonicalX25519PublicKeyB64V1(raw: unknown): string | undefined {
  const encoded = canonicalBase64(raw, 40, 128);
  if (!encoded) return;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(encoded, "base64"),
      format: "der",
      type: "spki",
    });
    if (key.asymmetricKeyType !== "x25519") return;
    const canonical = key.export({ format: "der", type: "spki" }) as Buffer;
    const b64 = canonical.toString("base64");
    return b64 === encoded ? encoded : undefined;
  } catch {
    return;
  }
}

export function exportX25519PublicKeyB64V1(key: crypto.KeyObject): string {
  if (key.type !== "public" || key.asymmetricKeyType !== "x25519") {
    throw new Error("X25519 public key is required");
  }
  return (key.export({ format: "der", type: "spki" }) as Buffer).toString("base64");
}

function keyOfferTranscriptBytesV1(value: Readonly<{
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  ed25519_pubkey: string;
  x25519_pubkey_b64: string;
  source_observed_endpoint: string;
  target_observed_endpoint: string;
  nonce: string;
}>): Buffer {
  return Buffer.from(JSON.stringify({
    domain: KEY_DOMAIN,
    protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1,
    ...value,
  }), "utf8");
}

export function createVoidUdpSecureKeyOfferV1(input: {
  sessionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  ed25519PublicPem: string;
  ed25519PrivateKey: crypto.KeyObject;
  x25519PublicKey: crypto.KeyObject;
  sourceObservedEndpoint: string;
  targetObservedEndpoint: string;
  nonce?: string;
  allowNonPublicObservedEndpoint?: boolean;
}): VoidUdpSecureKeyOfferV1 {
  const session_id = idValue(input.sessionId);
  const source_node_id = nodeId(input.sourceNodeId);
  const target_node_id = nodeId(input.targetNodeId);
  const ed25519_pubkey = canonicalEd25519PublicPemV1(input.ed25519PublicPem);
  const x25519_pubkey_b64 = exportX25519PublicKeyB64V1(input.x25519PublicKey);
  const source_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    input.sourceObservedEndpoint,
    input.allowNonPublicObservedEndpoint === true,
  );
  const target_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    input.targetObservedEndpoint,
    input.allowNonPublicObservedEndpoint === true,
  );
  const nonce = nonceValue(input.nonce ?? crypto.randomBytes(16).toString("hex"));

  if (
    !session_id || !source_node_id || !target_node_id ||
    source_node_id === target_node_id || !ed25519_pubkey ||
    deriveVoidNodeIdFromPublicPemV1(ed25519_pubkey) !== source_node_id ||
    !x25519_pubkey_b64 || !source_observed_endpoint ||
    !target_observed_endpoint || !nonce ||
    input.ed25519PrivateKey.asymmetricKeyType !== "ed25519"
  ) {
    throw new Error("secure UDP key offer input is invalid");
  }

  const unsigned = {
    session_id,
    source_node_id,
    target_node_id,
    ed25519_pubkey,
    x25519_pubkey_b64,
    source_observed_endpoint,
    target_observed_endpoint,
    nonce,
  };
  const sig = crypto.sign(
    null,
    keyOfferTranscriptBytesV1(unsigned),
    input.ed25519PrivateKey,
  ).toString("hex");
  if (!SIGNATURE_RE.test(sig)) {
    throw new Error("secure UDP key offer signature is malformed");
  }

  return Object.freeze({
    type: "VOID_UDP_SECURE_KEY",
    protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1,
    ...unsigned,
    sig,
  });
}

export function verifyVoidUdpSecureKeyOfferV1(
  raw: unknown,
  expected: Readonly<{
    sessionId: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceObservedEndpoint: string;
    targetObservedEndpoint: string;
    allowNonPublicObservedEndpoint?: boolean;
  }>,
): VoidUdpSecureKeyOfferV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, [
    "type", "protocol", "session_id", "source_node_id", "target_node_id",
    "ed25519_pubkey", "x25519_pubkey_b64", "source_observed_endpoint",
    "target_observed_endpoint", "nonce", "sig",
  ])) return;
  if (value.type !== "VOID_UDP_SECURE_KEY") return;
  if (value.protocol !== VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1) return;

  const session_id = idValue(value.session_id);
  const source_node_id = nodeId(value.source_node_id);
  const target_node_id = nodeId(value.target_node_id);
  const ed25519_pubkey = canonicalEd25519PublicPemV1(value.ed25519_pubkey);
  const x25519_pubkey_b64 = canonicalX25519PublicKeyB64V1(value.x25519_pubkey_b64);
  const source_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    value.source_observed_endpoint,
    expected.allowNonPublicObservedEndpoint === true,
  );
  const target_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    value.target_observed_endpoint,
    expected.allowNonPublicObservedEndpoint === true,
  );
  const nonce = nonceValue(value.nonce);
  const sig = typeof value.sig === "string" ? value.sig : "";

  if (
    !session_id || !source_node_id || !target_node_id ||
    !ed25519_pubkey || !x25519_pubkey_b64 ||
    !source_observed_endpoint || !target_observed_endpoint ||
    !nonce || !SIGNATURE_RE.test(sig)
  ) return;
  if (deriveVoidNodeIdFromPublicPemV1(ed25519_pubkey) !== source_node_id) return;

  const expectedSourceEndpoint = normalizeVoidUdpObservedEndpointV1(
    expected.sourceObservedEndpoint,
    expected.allowNonPublicObservedEndpoint === true,
  );
  const expectedTargetEndpoint = normalizeVoidUdpObservedEndpointV1(
    expected.targetObservedEndpoint,
    expected.allowNonPublicObservedEndpoint === true,
  );
  if (
    session_id !== expected.sessionId ||
    source_node_id !== expected.sourceNodeId ||
    target_node_id !== expected.targetNodeId ||
    source_observed_endpoint !== expectedSourceEndpoint ||
    target_observed_endpoint !== expectedTargetEndpoint
  ) return;

  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey(ed25519_pubkey);
  } catch {
    return;
  }
  const ok = crypto.verify(
    null,
    keyOfferTranscriptBytesV1({
      session_id,
      source_node_id,
      target_node_id,
      ed25519_pubkey,
      x25519_pubkey_b64,
      source_observed_endpoint,
      target_observed_endpoint,
      nonce,
    }),
    publicKey,
    Buffer.from(sig, "hex"),
  );
  if (!ok) return;

  return Object.freeze({
    type: "VOID_UDP_SECURE_KEY",
    protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1,
    session_id,
    source_node_id,
    target_node_id,
    ed25519_pubkey,
    x25519_pubkey_b64,
    source_observed_endpoint,
    target_observed_endpoint,
    nonce,
    sig,
  });
}

function offerBindingBytesV1(localOffer: VoidUdpSecureKeyOfferV1, remoteOffer: VoidUdpSecureKeyOfferV1): Buffer {
  const offers = [localOffer, remoteOffer]
    .map((offer) => ({
      source_node_id: offer.source_node_id,
      target_node_id: offer.target_node_id,
      x25519_pubkey_b64: offer.x25519_pubkey_b64,
      source_observed_endpoint: offer.source_observed_endpoint,
      target_observed_endpoint: offer.target_observed_endpoint,
      nonce: offer.nonce,
    }))
    .sort((a, b) => a.source_node_id.localeCompare(b.source_node_id));
  return Buffer.from(JSON.stringify({
    domain: KDF_DOMAIN,
    protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1,
    session_id: localOffer.session_id,
    offers,
  }), "utf8");
}

function directionalInfoV1(
  sessionId: string,
  sourceNodeId: string,
  targetNodeId: string,
  purpose: "key" | "nonce",
): Buffer {
  return Buffer.from(
    `${KDF_DOMAIN}|${purpose}|${sessionId}|${sourceNodeId}|${targetNodeId}`,
    "utf8",
  );
}

export function deriveVoidUdpSecureDirectionKeysV1(input: {
  localX25519PrivateKey: crypto.KeyObject;
  localOffer: VoidUdpSecureKeyOfferV1;
  remoteOffer: VoidUdpSecureKeyOfferV1;
}): VoidUdpSecureDirectionKeysV1 {
  const { localOffer, remoteOffer } = input;
  if (
    input.localX25519PrivateKey.type !== "private" ||
    input.localX25519PrivateKey.asymmetricKeyType !== "x25519" ||
    localOffer.session_id !== remoteOffer.session_id ||
    localOffer.source_node_id !== remoteOffer.target_node_id ||
    localOffer.target_node_id !== remoteOffer.source_node_id ||
    localOffer.source_observed_endpoint !== remoteOffer.target_observed_endpoint ||
    localOffer.target_observed_endpoint !== remoteOffer.source_observed_endpoint
  ) {
    throw new Error("secure UDP reciprocal key offers are inconsistent");
  }

  const localPublicB64 = crypto.createPublicKey(input.localX25519PrivateKey)
    .export({ format: "der", type: "spki" }) as Buffer;
  if (localPublicB64.toString("base64") !== localOffer.x25519_pubkey_b64) {
    throw new Error("local X25519 private key does not match signed offer");
  }

  const remotePublic = crypto.createPublicKey({
    key: Buffer.from(remoteOffer.x25519_pubkey_b64, "base64"),
    format: "der",
    type: "spki",
  });
  const sharedSecret = crypto.diffieHellman({
    privateKey: input.localX25519PrivateKey,
    publicKey: remotePublic,
  });
  if (sharedSecret.length !== 32) {
    throw new Error("unexpected X25519 shared-secret length");
  }

  const salt = crypto.createHash("sha256")
    .update(offerBindingBytesV1(localOffer, remoteOffer))
    .digest();
  const sendKey = Buffer.from(crypto.hkdfSync(
    "sha256",
    sharedSecret,
    salt,
    directionalInfoV1(
      localOffer.session_id,
      localOffer.source_node_id,
      localOffer.target_node_id,
      "key",
    ),
    32,
  ));
  const recvKey = Buffer.from(crypto.hkdfSync(
    "sha256",
    sharedSecret,
    salt,
    directionalInfoV1(
      localOffer.session_id,
      remoteOffer.source_node_id,
      remoteOffer.target_node_id,
      "key",
    ),
    32,
  ));
  const sendNoncePrefix = Buffer.from(crypto.hkdfSync(
    "sha256",
    sharedSecret,
    salt,
    directionalInfoV1(
      localOffer.session_id,
      localOffer.source_node_id,
      localOffer.target_node_id,
      "nonce",
    ),
    4,
  ));
  const recvNoncePrefix = Buffer.from(crypto.hkdfSync(
    "sha256",
    sharedSecret,
    salt,
    directionalInfoV1(
      localOffer.session_id,
      remoteOffer.source_node_id,
      remoteOffer.target_node_id,
      "nonce",
    ),
    4,
  ));

  return Object.freeze({
    session_id: localOffer.session_id,
    local_node_id: localOffer.source_node_id,
    peer_node_id: localOffer.target_node_id,
    send_key: sendKey,
    recv_key: recvKey,
    send_nonce_prefix: sendNoncePrefix,
    recv_nonce_prefix: recvNoncePrefix,
  });
}

function packetNonceV1(prefix: Buffer, packetNo: number): Buffer {
  if (prefix.length !== 4) throw new Error("secure UDP nonce prefix must be 4 bytes");
  const normalized = safeInteger(packetNo, 0, Number.MAX_SAFE_INTEGER);
  if (normalized === undefined) throw new Error("secure UDP packet number is invalid");
  const nonce = Buffer.alloc(12);
  prefix.copy(nonce, 0);
  nonce.writeBigUInt64BE(BigInt(normalized), 4);
  return nonce;
}

function packetAadBytesV1(value: Readonly<{
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  kind: VoidUdpSecurePacketKindV1;
  packet_no: number;
  data_seq: number | null;
  ack_seq: number;
}>): Buffer {
  return Buffer.from(JSON.stringify({
    domain: AEAD_DOMAIN,
    protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1,
    ...value,
  }), "utf8");
}

function normalizePacketHeaderV1(raw: Record<string, unknown>): Readonly<{
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  kind: VoidUdpSecurePacketKindV1;
  packet_no: number;
  data_seq: number | null;
  ack_seq: number;
}> | undefined {
  const session_id = idValue(raw.session_id);
  const source_node_id = nodeId(raw.source_node_id);
  const target_node_id = nodeId(raw.target_node_id);
  const kind = raw.kind === "data" || raw.kind === "ack" ? raw.kind : undefined;
  const packet_no = safeInteger(raw.packet_no, 0, Number.MAX_SAFE_INTEGER);
  const ack_seq = safeInteger(raw.ack_seq, -1, Number.MAX_SAFE_INTEGER);
  let data_seq: number | null = null;
  if (kind === "data") {
    const parsed = safeInteger(raw.data_seq, 0, Number.MAX_SAFE_INTEGER);
    if (parsed === undefined) return;
    data_seq = parsed;
  } else if (kind === "ack") {
    if (raw.data_seq !== null) return;
  }
  if (
    !session_id || !source_node_id || !target_node_id ||
    source_node_id === target_node_id || !kind ||
    packet_no === undefined || ack_seq === undefined
  ) return;
  return Object.freeze({
    session_id,
    source_node_id,
    target_node_id,
    kind,
    packet_no,
    data_seq,
    ack_seq,
  });
}

export function encodeVoidUdpSecurePacketV1(input: {
  keys: VoidUdpSecureDirectionKeysV1;
  kind: VoidUdpSecurePacketKindV1;
  packetNo: number;
  dataSeq: number | null;
  ackSeq: number;
  plaintext?: Uint8Array;
}): VoidUdpSecurePacketV1 {
  const plaintext = Buffer.from(input.plaintext ?? Buffer.alloc(0));
  if (input.kind === "ack" && plaintext.length !== 0) {
    throw new Error("secure UDP ACK packets cannot carry application payload");
  }
  if (plaintext.length > VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1) {
    throw new Error("secure UDP payload exceeds limit");
  }
  const header = normalizePacketHeaderV1({
    session_id: input.keys.session_id,
    source_node_id: input.keys.local_node_id,
    target_node_id: input.keys.peer_node_id,
    kind: input.kind,
    packet_no: input.packetNo,
    data_seq: input.dataSeq,
    ack_seq: input.ackSeq,
  });
  if (!header) throw new Error("secure UDP packet header is invalid");

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    input.keys.send_key,
    packetNonceV1(input.keys.send_nonce_prefix, header.packet_no),
    { authTagLength: 16 },
  );
  cipher.setAAD(packetAadBytesV1(header));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packet = Object.freeze({
    type: "VOID_UDP_SECURE_PACKET" as const,
    protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1 as 1,
    ...header,
    ciphertext_b64: ciphertext.toString("base64"),
    tag_b64: tag.toString("base64"),
  });
  if (Buffer.byteLength(JSON.stringify(packet), "utf8") > VOID_P2P_UDP_SECURE_RELIABLE_MAX_PACKET_BYTES_V1) {
    throw new Error("secure UDP encoded packet exceeds limit");
  }
  return packet;
}

export function decryptVoidUdpSecurePacketV1(
  raw: unknown,
  keys: VoidUdpSecureDirectionKeysV1,
): Readonly<{ packet: VoidUdpSecurePacketV1; plaintext: Buffer }> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, [
    "type", "protocol", "session_id", "source_node_id", "target_node_id",
    "kind", "packet_no", "data_seq", "ack_seq", "ciphertext_b64", "tag_b64",
  ])) return;
  if (value.type !== "VOID_UDP_SECURE_PACKET") return;
  if (value.protocol !== VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1) return;
  const header = normalizePacketHeaderV1(value);
  if (!header) return;
  if (
    header.session_id !== keys.session_id ||
    header.source_node_id !== keys.peer_node_id ||
    header.target_node_id !== keys.local_node_id
  ) return;
  const ciphertext_b64 = canonicalBase64(value.ciphertext_b64, 0, VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1 + 64);
  const tag_b64 = canonicalBase64(value.tag_b64, 16, 16);
  if (ciphertext_b64 === undefined || !tag_b64) return;

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      keys.recv_key,
      packetNonceV1(keys.recv_nonce_prefix, header.packet_no),
      { authTagLength: 16 },
    );
    decipher.setAAD(packetAadBytesV1(header));
    decipher.setAuthTag(Buffer.from(tag_b64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext_b64, "base64")),
      decipher.final(),
    ]);
    if (header.kind === "ack" && plaintext.length !== 0) return;
    if (plaintext.length > VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1) return;
    return Object.freeze({
      packet: Object.freeze({
        type: "VOID_UDP_SECURE_PACKET",
        protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1,
        ...header,
        ciphertext_b64,
        tag_b64,
      }),
      plaintext,
    });
  } catch {
    return;
  }
}

type PendingSendV1 = {
  data_seq: number;
  plaintext: Buffer;
  last_sent_at_ms: number;
  retries: number;
};

export class VoidUdpSecureReliableSenderV1 {
  private nextPacketNo = 0;
  private nextDataSeq = 0;
  private readonly pending = new Map<number, PendingSendV1>();

  constructor(private readonly keys: VoidUdpSecureDirectionKeysV1) {}

  pendingCount(): number {
    return this.pending.size;
  }

  createData(payload: Uint8Array, ackSeq: number, nowMs = Date.now()): VoidUdpSecurePacketV1 {
    if (this.pending.size >= VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1) {
      throw new Error("secure UDP send window is full");
    }
    const plaintext = Buffer.from(payload);
    if (plaintext.length < 1 || plaintext.length > VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1) {
      throw new Error("secure UDP application payload size is invalid");
    }
    const now = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (now === undefined) throw new Error("secure UDP send time is invalid");
    const dataSeq = this.nextDataSeq++;
    const packet = encodeVoidUdpSecurePacketV1({
      keys: this.keys,
      kind: "data",
      packetNo: this.nextPacketNo++,
      dataSeq,
      ackSeq,
      plaintext,
    });
    this.pending.set(dataSeq, {
      data_seq: dataSeq,
      plaintext,
      last_sent_at_ms: now,
      retries: 0,
    });
    return packet;
  }

  createAck(ackSeq: number): VoidUdpSecurePacketV1 {
    return encodeVoidUdpSecurePacketV1({
      keys: this.keys,
      kind: "ack",
      packetNo: this.nextPacketNo++,
      dataSeq: null,
      ackSeq,
    });
  }

  acknowledge(ackSeq: number): number {
    const ack = safeInteger(ackSeq, -1, Number.MAX_SAFE_INTEGER);
    if (ack === undefined) throw new Error("secure UDP ACK sequence is invalid");
    let removed = 0;
    for (const seq of [...this.pending.keys()]) {
      if (seq <= ack) {
        this.pending.delete(seq);
        removed += 1;
      }
    }
    return removed;
  }

  retransmitDue(
    peerAckSeq: number,
    nowMs = Date.now(),
  ): Readonly<{
    packets: readonly VoidUdpSecurePacketV1[];
    exhausted_data_seqs: readonly number[];
  }> {
    const now = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (now === undefined) throw new Error("secure UDP retransmission time is invalid");
    this.acknowledge(peerAckSeq);
    const packets: VoidUdpSecurePacketV1[] = [];
    const exhausted: number[] = [];
    for (const [seq, pending] of [...this.pending.entries()].sort((a, b) => a[0] - b[0])) {
      if (now - pending.last_sent_at_ms < VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1) continue;
      if (pending.retries >= VOID_P2P_UDP_SECURE_RELIABLE_MAX_RETRIES_V1) {
        exhausted.push(seq);
        this.pending.delete(seq);
        continue;
      }
      pending.retries += 1;
      pending.last_sent_at_ms = now;
      packets.push(encodeVoidUdpSecurePacketV1({
        keys: this.keys,
        kind: "data",
        packetNo: this.nextPacketNo++,
        dataSeq: pending.data_seq,
        ackSeq: peerAckSeq,
        plaintext: pending.plaintext,
      }));
    }
    return Object.freeze({
      packets: Object.freeze(packets),
      exhausted_data_seqs: Object.freeze(exhausted),
    });
  }
}

export class VoidUdpSecureReliableReceiverV1 {
  private nextDataSeq = 0;
  private highestPacketNo = -1;
  private readonly seenPacketNos = new Set<number>();
  private readonly buffered = new Map<number, Buffer>();

  constructor(private readonly keys: VoidUdpSecureDirectionKeysV1) {}

  ackSeq(): number {
    return this.nextDataSeq - 1;
  }

  bufferedCount(): number {
    return this.buffered.size;
  }

  private acceptPacketNo(packetNo: number): boolean {
    if (this.seenPacketNos.has(packetNo)) return false;
    if (
      this.highestPacketNo >= 0 &&
      packetNo <= this.highestPacketNo - VOID_P2P_UDP_SECURE_RELIABLE_PACKET_REPLAY_WINDOW_V1
    ) return false;
    this.seenPacketNos.add(packetNo);
    if (packetNo > this.highestPacketNo) this.highestPacketNo = packetNo;
    const floor = this.highestPacketNo - VOID_P2P_UDP_SECURE_RELIABLE_PACKET_REPLAY_WINDOW_V1;
    for (const seen of [...this.seenPacketNos]) {
      if (seen <= floor) this.seenPacketNos.delete(seen);
    }
    return true;
  }

  receive(raw: unknown): Readonly<{
    accepted: boolean;
    replay: boolean;
    peer_ack_seq: number;
    ack_seq: number;
    delivered: readonly Buffer[];
  }> {
    const decrypted = decryptVoidUdpSecurePacketV1(raw, this.keys);
    if (!decrypted) {
      return Object.freeze({
        accepted: false,
        replay: false,
        peer_ack_seq: -1,
        ack_seq: this.ackSeq(),
        delivered: Object.freeze([]),
      });
    }
    const packet = decrypted.packet;
    if (!this.acceptPacketNo(packet.packet_no)) {
      return Object.freeze({
        accepted: false,
        replay: true,
        peer_ack_seq: packet.ack_seq,
        ack_seq: this.ackSeq(),
        delivered: Object.freeze([]),
      });
    }

    if (packet.kind === "ack") {
      return Object.freeze({
        accepted: true,
        replay: false,
        peer_ack_seq: packet.ack_seq,
        ack_seq: this.ackSeq(),
        delivered: Object.freeze([]),
      });
    }

    const seq = packet.data_seq!;
    if (seq < this.nextDataSeq) {
      return Object.freeze({
        accepted: true,
        replay: false,
        peer_ack_seq: packet.ack_seq,
        ack_seq: this.ackSeq(),
        delivered: Object.freeze([]),
      });
    }
    if (seq >= this.nextDataSeq + VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1) {
      return Object.freeze({
        accepted: false,
        replay: false,
        peer_ack_seq: packet.ack_seq,
        ack_seq: this.ackSeq(),
        delivered: Object.freeze([]),
      });
    }
    if (!this.buffered.has(seq)) {
      this.buffered.set(seq, Buffer.from(decrypted.plaintext));
    }
    if (this.buffered.size > VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1) {
      throw new Error("secure UDP receive window exceeded invariant");
    }

    const delivered: Buffer[] = [];
    while (this.buffered.has(this.nextDataSeq)) {
      const value = this.buffered.get(this.nextDataSeq)!;
      this.buffered.delete(this.nextDataSeq);
      delivered.push(value);
      this.nextDataSeq += 1;
    }
    return Object.freeze({
      accepted: true,
      replay: false,
      peer_ack_seq: packet.ack_seq,
      ack_seq: this.ackSeq(),
      delivered: Object.freeze(delivered),
    });
  }
}
