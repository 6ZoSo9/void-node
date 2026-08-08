// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

import {
  canonicalEd25519PublicPemV1,
  deriveVoidNodeIdFromPublicPemV1,
} from "./auth_v1.js";
import {
  VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1,
  VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
  VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1,
  normalizeVoidUdpAuthenticatedPathProofV1,
  verifyVoidUdpAuthenticatedPathProofV1,
  type VoidUdpAuthenticatedPathHelloV1,
  type VoidUdpAuthenticatedPathProofV1,
} from "./udp_authenticated_path_v1.js";
import { normalizeVoidUdpObservedEndpointV1 } from "./udp_hole_punch_v1.js";

export const VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1 = 16 * 1024;
export const VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1 = 32;
export const VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1 = 64;
export const VOID_P2P_UDP_SECURE_RELIABLE_PACKET_REPLAY_WINDOW_V1 = 256;
export const VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1 = 250;
export const VOID_P2P_UDP_SECURE_RELIABLE_MAX_RETRIES_V1 = 5;
export const VOID_P2P_UDP_SECURE_RELIABLE_IDENTITY_ALGORITHM_V1 =
  VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1;
export const VOID_P2P_UDP_SECURE_RELIABLE_SIGNATURE_ALGORITHM_V1 =
  VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1;
export const VOID_P2P_UDP_SECURE_RELIABLE_KEX_ALGORITHM_V1 = "x25519" as const;
export const VOID_P2P_UDP_SECURE_RELIABLE_KDF_ALGORITHM_V1 =
  "hkdf-sha256" as const;
export const VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1 =
  "aes-256-gcm" as const;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const ID_RE = /^[0-9a-f]{32}$/;
const SIG_RE = /^[0-9a-f]{128}$/;
const KEY_DOMAIN = "VOID_P2P_UDP_SECURE_RELIABLE_KEY_V1";
const KDF_DOMAIN = "VOID_P2P_UDP_SECURE_RELIABLE_KDF_V1";
const PACKET_DOMAIN = "VOID_P2P_UDP_SECURE_RELIABLE_PACKET_V1";

export type VoidUdpSecureAuthenticatedPathEvidenceV1 = Readonly<{
  rawProof: unknown;
  expectedRemoteHello: VoidUdpAuthenticatedPathHelloV1;
  localHello: VoidUdpAuthenticatedPathHelloV1;
  expectedRemoteObservedEndpoint: string;
  localObservedEndpoint: string;
  allowNonPublicEndpoints?: boolean;
}>;

export type VoidUdpSecureKeyOfferV1 = Readonly<{
  type: "VOID_UDP_SECURE_KEY";
  protocol: 1;
  authenticated_path_protocol: 1;
  authenticated_path_proof_sig: string;
  identity_algorithm: "ed25519";
  signature_algorithm: "ed25519";
  kex_algorithm: "x25519";
  kdf_algorithm: "hkdf-sha256";
  aead_algorithm: "aes-256-gcm";
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

export type VoidUdpSecurePacketV1 = Readonly<{
  type: "VOID_UDP_SECURE_PACKET";
  protocol: 1;
  aead_algorithm: "aes-256-gcm";
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  kind: "data" | "ack";
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
  identity_algorithm: "ed25519";
  signature_algorithm: "ed25519";
  kex_algorithm: "x25519";
  kdf_algorithm: "hkdf-sha256";
  aead_algorithm: "aes-256-gcm";
  send_key: Buffer;
  recv_key: Buffer;
  send_nonce_prefix: Buffer;
  recv_nonce_prefix: Buffer;
}>;

export const VOID_P2P_UDP_SECURE_RELIABLE_AUTHORITY_V1 = Object.freeze({
  authenticated_path_evidence_required: true,
  identity_algorithm_explicit: true,
  signature_algorithm_explicit: true,
  kex_algorithm_explicit: true,
  kdf_algorithm_explicit: true,
  aead_algorithm_explicit: true,
  algorithm_confusion_rejected: true,
  crypto_agility_extension_point_explicit: true,
  quantum_safe_claimed: false,
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

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((v, i) => v === wanted[i]);
}

function safeInteger(raw: unknown, min: number, max: number): number | undefined {
  return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= min && raw <= max
    ? raw
    : undefined;
}

function nodeId(raw: unknown): string | undefined {
  return typeof raw === "string" && NODE_ID_RE.test(raw) ? raw : undefined;
}

function id(raw: unknown): string | undefined {
  return typeof raw === "string" && ID_RE.test(raw) ? raw : undefined;
}

function canonicalBase64(raw: unknown, minBytes: number, maxBytes: number): string | undefined {
  if (typeof raw !== "string") return;
  if (raw === "") return minBytes === 0 ? "" : undefined;
  if (raw.length % 4 !== 0 || raw.length > Math.ceil(maxBytes / 3) * 4 + 4) return;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return;
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length < minBytes || decoded.length > maxBytes) return;
  return decoded.toString("base64") === raw ? raw : undefined;
}

function normalizedAuthenticatedPathProof(
  raw: unknown,
  allowNonPublicEndpoints: boolean,
): VoidUdpAuthenticatedPathProofV1 | undefined {
  const proof = normalizeVoidUdpAuthenticatedPathProofV1(
    raw,
    allowNonPublicEndpoints,
  );
  if (!proof) return;
  if (
    proof.identity_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_IDENTITY_ALGORITHM_V1 ||
    proof.signature_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_SIGNATURE_ALGORITHM_V1
  ) return;
  return proof;
}

function verifiedAuthenticatedPathProof(
  evidence: VoidUdpSecureAuthenticatedPathEvidenceV1,
): VoidUdpAuthenticatedPathProofV1 | undefined {
  const proof = verifyVoidUdpAuthenticatedPathProofV1({
    rawProof: evidence.rawProof,
    expectedRemoteHello: evidence.expectedRemoteHello,
    localHello: evidence.localHello,
    expectedRemoteObservedEndpoint: evidence.expectedRemoteObservedEndpoint,
    localObservedEndpoint: evidence.localObservedEndpoint,
    allowNonPublicEndpoints: evidence.allowNonPublicEndpoints === true,
  });
  if (!proof) return;
  if (
    proof.identity_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_IDENTITY_ALGORITHM_V1 ||
    proof.signature_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_SIGNATURE_ALGORITHM_V1
  ) return;
  return proof;
}

export function exportVoidUdpX25519PublicKeyB64V1(key: crypto.KeyObject): string {
  if (key.type !== "public" || key.asymmetricKeyType !== "x25519") {
    throw new Error("X25519 public key required");
  }
  return (key.export({ format: "der", type: "spki" }) as Buffer).toString("base64");
}

function canonicalX25519PublicKeyB64V1(raw: unknown): string | undefined {
  const b64 = canonicalBase64(raw, 40, 128);
  if (!b64) return;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(b64, "base64"),
      format: "der",
      type: "spki",
    });
    if (key.asymmetricKeyType !== "x25519") return;
    return exportVoidUdpX25519PublicKeyB64V1(key) === b64 ? b64 : undefined;
  } catch {
    return;
  }
}

function keyOfferTranscript(
  value: Omit<VoidUdpSecureKeyOfferV1, "type" | "protocol" | "sig">,
): Buffer {
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
  authenticatedPathProof: VoidUdpAuthenticatedPathProofV1;
  sourceObservedEndpoint: string;
  targetObservedEndpoint: string;
  nonce?: string;
  allowNonPublicObservedEndpoint?: boolean;
}): VoidUdpSecureKeyOfferV1 {
  const allowNonPublic = input.allowNonPublicObservedEndpoint === true;
  const pathProof = normalizedAuthenticatedPathProof(
    input.authenticatedPathProof,
    allowNonPublic,
  );
  const session_id = id(input.sessionId);
  const source_node_id = nodeId(input.sourceNodeId);
  const target_node_id = nodeId(input.targetNodeId);
  const ed25519_pubkey = canonicalEd25519PublicPemV1(input.ed25519PublicPem);
  const x25519_pubkey_b64 = exportVoidUdpX25519PublicKeyB64V1(input.x25519PublicKey);
  const source_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    input.sourceObservedEndpoint,
    allowNonPublic,
  );
  const target_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    input.targetObservedEndpoint,
    allowNonPublic,
  );
  const nonce = id(input.nonce ?? crypto.randomBytes(16).toString("hex"));
  if (
    !pathProof ||
    !session_id || !source_node_id || !target_node_id || source_node_id === target_node_id ||
    !ed25519_pubkey || deriveVoidNodeIdFromPublicPemV1(ed25519_pubkey) !== source_node_id ||
    !x25519_pubkey_b64 || !source_observed_endpoint || !target_observed_endpoint || !nonce ||
    input.ed25519PrivateKey.asymmetricKeyType !== "ed25519" ||
    pathProof.protocol !== VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1 ||
    pathProof.session_id !== session_id ||
    pathProof.source_node_id !== source_node_id ||
    pathProof.target_node_id !== target_node_id ||
    pathProof.pubkey !== ed25519_pubkey ||
    pathProof.source_observed_endpoint !== source_observed_endpoint ||
    pathProof.target_observed_endpoint !== target_observed_endpoint
  ) throw new Error("secure UDP key offer input invalid");

  const unsigned = {
    authenticated_path_protocol: VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
    authenticated_path_proof_sig: pathProof.sig,
    identity_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_IDENTITY_ALGORITHM_V1,
    signature_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_SIGNATURE_ALGORITHM_V1,
    kex_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_KEX_ALGORITHM_V1,
    kdf_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_KDF_ALGORITHM_V1,
    aead_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1,
    session_id,
    source_node_id,
    target_node_id,
    ed25519_pubkey,
    x25519_pubkey_b64,
    source_observed_endpoint,
    target_observed_endpoint,
    nonce,
  } as const;
  const sig = crypto.sign(null, keyOfferTranscript(unsigned), input.ed25519PrivateKey).toString("hex");
  if (!SIG_RE.test(sig)) throw new Error("secure UDP key offer signature invalid");
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
    authenticatedPathEvidence: VoidUdpSecureAuthenticatedPathEvidenceV1;
    allowNonPublicObservedEndpoint?: boolean;
  }>,
): VoidUdpSecureKeyOfferV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, [
    "type", "protocol", "authenticated_path_protocol", "authenticated_path_proof_sig",
    "identity_algorithm", "signature_algorithm", "kex_algorithm", "kdf_algorithm",
    "aead_algorithm", "session_id", "source_node_id", "target_node_id",
    "ed25519_pubkey", "x25519_pubkey_b64", "source_observed_endpoint",
    "target_observed_endpoint", "nonce", "sig",
  ])) return;
  if (
    value.type !== "VOID_UDP_SECURE_KEY" ||
    value.protocol !== VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1 ||
    value.authenticated_path_protocol !== VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1 ||
    value.identity_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_IDENTITY_ALGORITHM_V1 ||
    value.signature_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_SIGNATURE_ALGORITHM_V1 ||
    value.kex_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_KEX_ALGORITHM_V1 ||
    value.kdf_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_KDF_ALGORITHM_V1 ||
    value.aead_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1
  ) return;

  const allowNonPublic = expected.allowNonPublicObservedEndpoint === true;
  const pathProof = verifiedAuthenticatedPathProof(expected.authenticatedPathEvidence);
  const session_id = id(value.session_id);
  const source_node_id = nodeId(value.source_node_id);
  const target_node_id = nodeId(value.target_node_id);
  const ed25519_pubkey = canonicalEd25519PublicPemV1(value.ed25519_pubkey);
  const x25519_pubkey_b64 = canonicalX25519PublicKeyB64V1(value.x25519_pubkey_b64);
  const source_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    value.source_observed_endpoint,
    allowNonPublic,
  );
  const target_observed_endpoint = normalizeVoidUdpObservedEndpointV1(
    value.target_observed_endpoint,
    allowNonPublic,
  );
  const authenticated_path_proof_sig =
    typeof value.authenticated_path_proof_sig === "string"
      ? value.authenticated_path_proof_sig
      : "";
  const nonce = id(value.nonce);
  const sig = typeof value.sig === "string" ? value.sig : "";
  if (
    !pathProof ||
    !session_id || !source_node_id || !target_node_id || !ed25519_pubkey ||
    !x25519_pubkey_b64 || !source_observed_endpoint || !target_observed_endpoint ||
    !SIG_RE.test(authenticated_path_proof_sig) || !nonce || !SIG_RE.test(sig) ||
    deriveVoidNodeIdFromPublicPemV1(ed25519_pubkey) !== source_node_id
  ) return;

  const expectedSource = normalizeVoidUdpObservedEndpointV1(
    expected.sourceObservedEndpoint,
    allowNonPublic,
  );
  const expectedTarget = normalizeVoidUdpObservedEndpointV1(
    expected.targetObservedEndpoint,
    allowNonPublic,
  );
  if (
    !expectedSource || !expectedTarget ||
    session_id !== expected.sessionId || source_node_id !== expected.sourceNodeId ||
    target_node_id !== expected.targetNodeId || source_observed_endpoint !== expectedSource ||
    target_observed_endpoint !== expectedTarget ||
    pathProof.protocol !== VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1 ||
    pathProof.session_id !== session_id ||
    pathProof.source_node_id !== source_node_id ||
    pathProof.target_node_id !== target_node_id ||
    pathProof.pubkey !== ed25519_pubkey ||
    pathProof.source_observed_endpoint !== source_observed_endpoint ||
    pathProof.target_observed_endpoint !== target_observed_endpoint ||
    pathProof.sig !== authenticated_path_proof_sig
  ) return;

  let pub: crypto.KeyObject;
  try { pub = crypto.createPublicKey(ed25519_pubkey); } catch { return; }
  if (pub.asymmetricKeyType !== "ed25519") return;
  const unsigned = {
    authenticated_path_protocol: VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
    authenticated_path_proof_sig,
    identity_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_IDENTITY_ALGORITHM_V1,
    signature_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_SIGNATURE_ALGORITHM_V1,
    kex_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_KEX_ALGORITHM_V1,
    kdf_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_KDF_ALGORITHM_V1,
    aead_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1,
    session_id,
    source_node_id,
    target_node_id,
    ed25519_pubkey,
    x25519_pubkey_b64,
    source_observed_endpoint,
    target_observed_endpoint,
    nonce,
  } as const;
  if (!crypto.verify(null, keyOfferTranscript(unsigned), pub, Buffer.from(sig, "hex"))) return;
  return Object.freeze({
    type: "VOID_UDP_SECURE_KEY",
    protocol: VOID_P2P_UDP_SECURE_RELIABLE_PROTOCOL_VERSION_V1,
    ...unsigned,
    sig,
  });
}

function kdfSalt(local: VoidUdpSecureKeyOfferV1, remote: VoidUdpSecureKeyOfferV1): Buffer {
  const offers = [local, remote].map((offer) => ({
    authenticated_path_protocol: offer.authenticated_path_protocol,
    authenticated_path_proof_sig: offer.authenticated_path_proof_sig,
    identity_algorithm: offer.identity_algorithm,
    signature_algorithm: offer.signature_algorithm,
    kex_algorithm: offer.kex_algorithm,
    kdf_algorithm: offer.kdf_algorithm,
    aead_algorithm: offer.aead_algorithm,
    source_node_id: offer.source_node_id,
    target_node_id: offer.target_node_id,
    x25519_pubkey_b64: offer.x25519_pubkey_b64,
    source_observed_endpoint: offer.source_observed_endpoint,
    target_observed_endpoint: offer.target_observed_endpoint,
    nonce: offer.nonce,
  })).sort((a, b) => a.source_node_id.localeCompare(b.source_node_id));
  return crypto.createHash("sha256").update(JSON.stringify({
    domain: KDF_DOMAIN,
    kdf_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_KDF_ALGORITHM_V1,
    session_id: local.session_id,
    offers,
  })).digest();
}

function derive(shared: Buffer, salt: Buffer, label: string, bytes: number): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", shared, salt, Buffer.from(label), bytes));
}

export function deriveVoidUdpSecureDirectionKeysV1(input: {
  localX25519PrivateKey: crypto.KeyObject;
  localOffer: VoidUdpSecureKeyOfferV1;
  remoteOffer: VoidUdpSecureKeyOfferV1;
}): VoidUdpSecureDirectionKeysV1 {
  const { localOffer, remoteOffer } = input;
  if (
    input.localX25519PrivateKey.type !== "private" || input.localX25519PrivateKey.asymmetricKeyType !== "x25519" ||
    localOffer.identity_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_IDENTITY_ALGORITHM_V1 ||
    remoteOffer.identity_algorithm !== localOffer.identity_algorithm ||
    localOffer.signature_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_SIGNATURE_ALGORITHM_V1 ||
    remoteOffer.signature_algorithm !== localOffer.signature_algorithm ||
    localOffer.kex_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_KEX_ALGORITHM_V1 ||
    remoteOffer.kex_algorithm !== localOffer.kex_algorithm ||
    localOffer.kdf_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_KDF_ALGORITHM_V1 ||
    remoteOffer.kdf_algorithm !== localOffer.kdf_algorithm ||
    localOffer.aead_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1 ||
    remoteOffer.aead_algorithm !== localOffer.aead_algorithm ||
    localOffer.authenticated_path_protocol !== VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1 ||
    remoteOffer.authenticated_path_protocol !== localOffer.authenticated_path_protocol ||
    localOffer.session_id !== remoteOffer.session_id ||
    localOffer.source_node_id !== remoteOffer.target_node_id || localOffer.target_node_id !== remoteOffer.source_node_id ||
    localOffer.source_observed_endpoint !== remoteOffer.target_observed_endpoint ||
    localOffer.target_observed_endpoint !== remoteOffer.source_observed_endpoint
  ) throw new Error("secure UDP reciprocal key offers inconsistent");

  const localPubB64 = (crypto.createPublicKey(input.localX25519PrivateKey)
    .export({ format: "der", type: "spki" }) as Buffer).toString("base64");
  if (localPubB64 !== localOffer.x25519_pubkey_b64) {
    throw new Error("local X25519 private key does not match signed offer");
  }
  const remotePub = crypto.createPublicKey({
    key: Buffer.from(remoteOffer.x25519_pubkey_b64, "base64"),
    format: "der",
    type: "spki",
  });
  if (remotePub.asymmetricKeyType !== "x25519") {
    throw new Error("remote secure UDP key offer KEX key is not X25519");
  }
  const shared = crypto.diffieHellman({ privateKey: input.localX25519PrivateKey, publicKey: remotePub });
  const salt = kdfSalt(localOffer, remoteOffer);
  const dir = (source: string, target: string, purpose: string) =>
    `${KDF_DOMAIN}|${VOID_P2P_UDP_SECURE_RELIABLE_KDF_ALGORITHM_V1}|${purpose}|${localOffer.session_id}|${source}|${target}`;
  return Object.freeze({
    session_id: localOffer.session_id,
    local_node_id: localOffer.source_node_id,
    peer_node_id: localOffer.target_node_id,
    identity_algorithm: localOffer.identity_algorithm,
    signature_algorithm: localOffer.signature_algorithm,
    kex_algorithm: localOffer.kex_algorithm,
    kdf_algorithm: localOffer.kdf_algorithm,
    aead_algorithm: localOffer.aead_algorithm,
    send_key: derive(shared, salt, dir(localOffer.source_node_id, localOffer.target_node_id, "key"), 32),
    recv_key: derive(shared, salt, dir(remoteOffer.source_node_id, remoteOffer.target_node_id, "key"), 32),
    send_nonce_prefix: derive(shared, salt, dir(localOffer.source_node_id, localOffer.target_node_id, "nonce"), 4),
    recv_nonce_prefix: derive(shared, salt, dir(remoteOffer.source_node_id, remoteOffer.target_node_id, "nonce"), 4),
  });
}

function nonce(prefix: Buffer, packetNo: number): Buffer {
  const n = safeInteger(packetNo, 0, Number.MAX_SAFE_INTEGER);
  if (prefix.length !== 4 || n === undefined) throw new Error("secure UDP packet nonce invalid");
  const out = Buffer.alloc(12);
  prefix.copy(out, 0);
  out.writeBigUInt64BE(BigInt(n), 4);
  return out;
}

function header(input: {
  aead_algorithm: "aes-256-gcm";
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  kind: "data" | "ack";
  packet_no: number;
  data_seq: number | null;
  ack_seq: number;
}) {
  if (input.aead_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1) {
    throw new Error("secure UDP packet AEAD algorithm unsupported");
  }
  const session_id = id(input.session_id);
  const source_node_id = nodeId(input.source_node_id);
  const target_node_id = nodeId(input.target_node_id);
  const packet_no = safeInteger(input.packet_no, 0, Number.MAX_SAFE_INTEGER);
  const ack_seq = safeInteger(input.ack_seq, -1, Number.MAX_SAFE_INTEGER);
  const data_seq = input.kind === "data"
    ? safeInteger(input.data_seq, 0, Number.MAX_SAFE_INTEGER)
    : input.data_seq === null ? null : undefined;
  if (
    !session_id || !source_node_id || !target_node_id || source_node_id === target_node_id ||
    packet_no === undefined || ack_seq === undefined || data_seq === undefined
  ) throw new Error("secure UDP packet header invalid");
  return {
    aead_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1,
    session_id,
    source_node_id,
    target_node_id,
    kind: input.kind,
    packet_no,
    data_seq,
    ack_seq,
  } as const;
}

function aad(value: ReturnType<typeof header>): Buffer {
  return Buffer.from(JSON.stringify({ domain: PACKET_DOMAIN, protocol: 1, ...value }), "utf8");
}

export function encodeVoidUdpSecurePacketV1(input: {
  keys: VoidUdpSecureDirectionKeysV1;
  kind: "data" | "ack";
  packetNo: number;
  dataSeq: number | null;
  ackSeq: number;
  plaintext?: Uint8Array;
}): VoidUdpSecurePacketV1 {
  if (input.keys.aead_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1) {
    throw new Error("secure UDP direction keys use unsupported AEAD algorithm");
  }
  const plaintext = Buffer.from(input.plaintext ?? Buffer.alloc(0));
  if (input.kind === "ack" && plaintext.length !== 0) throw new Error("ACK cannot carry payload");
  if (plaintext.length > VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1) throw new Error("payload too large");
  const h = header({
    aead_algorithm: input.keys.aead_algorithm,
    session_id: input.keys.session_id,
    source_node_id: input.keys.local_node_id,
    target_node_id: input.keys.peer_node_id,
    kind: input.kind,
    packet_no: input.packetNo,
    data_seq: input.dataSeq,
    ack_seq: input.ackSeq,
  });
  const cipher = crypto.createCipheriv("aes-256-gcm", input.keys.send_key, nonce(input.keys.send_nonce_prefix, h.packet_no));
  cipher.setAAD(aad(h));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Object.freeze({
    type: "VOID_UDP_SECURE_PACKET",
    protocol: 1,
    ...h,
    ciphertext_b64: ciphertext.toString("base64"),
    tag_b64: cipher.getAuthTag().toString("base64"),
  });
}

export function decryptVoidUdpSecurePacketV1(
  raw: unknown,
  keys: VoidUdpSecureDirectionKeysV1,
): Readonly<{ packet: VoidUdpSecurePacketV1; plaintext: Buffer }> | undefined {
  if (keys.aead_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1) return;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, [
    "type", "protocol", "aead_algorithm", "session_id", "source_node_id", "target_node_id", "kind",
    "packet_no", "data_seq", "ack_seq", "ciphertext_b64", "tag_b64",
  ])) return;
  if (
    value.type !== "VOID_UDP_SECURE_PACKET" ||
    value.protocol !== 1 ||
    value.aead_algorithm !== VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1
  ) return;
  if (value.kind !== "data" && value.kind !== "ack") return;
  let h: ReturnType<typeof header>;
  try {
    h = header({
      aead_algorithm: VOID_P2P_UDP_SECURE_RELIABLE_AEAD_ALGORITHM_V1,
      session_id: String(value.session_id ?? ""),
      source_node_id: String(value.source_node_id ?? ""),
      target_node_id: String(value.target_node_id ?? ""),
      kind: value.kind,
      packet_no: Number(value.packet_no),
      data_seq: value.data_seq === null ? null : Number(value.data_seq),
      ack_seq: Number(value.ack_seq),
    });
  } catch { return; }
  if (h.session_id !== keys.session_id || h.source_node_id !== keys.peer_node_id || h.target_node_id !== keys.local_node_id) return;
  const ciphertext_b64 = canonicalBase64(value.ciphertext_b64, 0, VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1);
  const tag_b64 = canonicalBase64(value.tag_b64, 16, 16);
  if (ciphertext_b64 === undefined || !tag_b64) return;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", keys.recv_key, nonce(keys.recv_nonce_prefix, h.packet_no));
    decipher.setAAD(aad(h));
    decipher.setAuthTag(Buffer.from(tag_b64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext_b64, "base64")),
      decipher.final(),
    ]);
    if (h.kind === "ack" && plaintext.length !== 0) return;
    return Object.freeze({
      packet: Object.freeze({
        type: "VOID_UDP_SECURE_PACKET",
        protocol: 1,
        ...h,
        ciphertext_b64,
        tag_b64,
      }),
      plaintext,
    });
  } catch { return; }
}

type Pending = { dataSeq: number; plaintext: Buffer; lastSentAtMs: number; retries: number };

export class VoidUdpSecureReliableSenderV1 {
  private nextPacketNo = 0;
  private nextDataSeq = 0;
  private readonly pending = new Map<number, Pending>();
  constructor(private readonly keys: VoidUdpSecureDirectionKeysV1) {}

  pendingCount(): number { return this.pending.size; }

  createData(payload: Uint8Array, ackSeq: number, nowMs = Date.now()): VoidUdpSecurePacketV1 {
    if (this.pending.size >= VOID_P2P_UDP_SECURE_RELIABLE_MAX_IN_FLIGHT_V1) throw new Error("send window full");
    const plaintext = Buffer.from(payload);
    if (plaintext.length < 1 || plaintext.length > VOID_P2P_UDP_SECURE_RELIABLE_MAX_PAYLOAD_BYTES_V1) throw new Error("payload size invalid");
    const now = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (now === undefined) throw new Error("send time invalid");
    const seq = this.nextDataSeq++;
    const packet = encodeVoidUdpSecurePacketV1({
      keys: this.keys,
      kind: "data",
      packetNo: this.nextPacketNo++,
      dataSeq: seq,
      ackSeq,
      plaintext,
    });
    this.pending.set(seq, { dataSeq: seq, plaintext, lastSentAtMs: now, retries: 0 });
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
    if (ack === undefined) throw new Error("ACK invalid");
    let removed = 0;
    for (const seq of [...this.pending.keys()]) {
      if (seq <= ack) { this.pending.delete(seq); removed += 1; }
    }
    return removed;
  }

  retransmitDue(peerAckSeq: number, nowMs = Date.now()): Readonly<{
    packets: readonly VoidUdpSecurePacketV1[];
    exhausted_data_seqs: readonly number[];
  }> {
    this.acknowledge(peerAckSeq);
    const now = safeInteger(nowMs, 0, Number.MAX_SAFE_INTEGER);
    if (now === undefined) throw new Error("retransmit time invalid");
    const packets: VoidUdpSecurePacketV1[] = [];
    const exhausted: number[] = [];
    for (const [seq, p] of [...this.pending.entries()].sort((a, b) => a[0] - b[0])) {
      if (now - p.lastSentAtMs < VOID_P2P_UDP_SECURE_RELIABLE_RTO_MS_V1) continue;
      if (p.retries >= VOID_P2P_UDP_SECURE_RELIABLE_MAX_RETRIES_V1) {
        exhausted.push(seq);
        this.pending.delete(seq);
        continue;
      }
      p.retries += 1;
      p.lastSentAtMs = now;
      packets.push(encodeVoidUdpSecurePacketV1({
        keys: this.keys,
        kind: "data",
        packetNo: this.nextPacketNo++,
        dataSeq: p.dataSeq,
        ackSeq: peerAckSeq,
        plaintext: p.plaintext,
      }));
    }
    return Object.freeze({ packets: Object.freeze(packets), exhausted_data_seqs: Object.freeze(exhausted) });
  }
}

export class VoidUdpSecureReliableReceiverV1 {
  private nextDataSeq = 0;
  private highestPacketNo = -1;
  private readonly seenPacketNos = new Set<number>();
  private readonly buffered = new Map<number, Buffer>();
  constructor(private readonly keys: VoidUdpSecureDirectionKeysV1) {}

  ackSeq(): number { return this.nextDataSeq - 1; }
  bufferedCount(): number { return this.buffered.size; }

  private packetNoFresh(packetNo: number): boolean {
    if (this.seenPacketNos.has(packetNo)) return false;
    if (this.highestPacketNo >= 0 && packetNo <= this.highestPacketNo - VOID_P2P_UDP_SECURE_RELIABLE_PACKET_REPLAY_WINDOW_V1) return false;
    this.seenPacketNos.add(packetNo);
    if (packetNo > this.highestPacketNo) this.highestPacketNo = packetNo;
    const floor = this.highestPacketNo - VOID_P2P_UDP_SECURE_RELIABLE_PACKET_REPLAY_WINDOW_V1;
    for (const seen of [...this.seenPacketNos]) if (seen <= floor) this.seenPacketNos.delete(seen);
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
    if (!decrypted) return Object.freeze({ accepted: false, replay: false, peer_ack_seq: -1, ack_seq: this.ackSeq(), delivered: Object.freeze([]) });
    const packet = decrypted.packet;
    if (!this.packetNoFresh(packet.packet_no)) {
      return Object.freeze({ accepted: false, replay: true, peer_ack_seq: packet.ack_seq, ack_seq: this.ackSeq(), delivered: Object.freeze([]) });
    }
    if (packet.kind === "ack") {
      return Object.freeze({ accepted: true, replay: false, peer_ack_seq: packet.ack_seq, ack_seq: this.ackSeq(), delivered: Object.freeze([]) });
    }

    const seq = packet.data_seq!;
    if (seq < this.nextDataSeq) {
      return Object.freeze({ accepted: true, replay: false, peer_ack_seq: packet.ack_seq, ack_seq: this.ackSeq(), delivered: Object.freeze([]) });
    }
    if (seq >= this.nextDataSeq + VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1) {
      return Object.freeze({ accepted: false, replay: false, peer_ack_seq: packet.ack_seq, ack_seq: this.ackSeq(), delivered: Object.freeze([]) });
    }
    if (!this.buffered.has(seq)) this.buffered.set(seq, Buffer.from(decrypted.plaintext));
    if (this.buffered.size > VOID_P2P_UDP_SECURE_RELIABLE_RECV_WINDOW_V1) throw new Error("receive window invariant exceeded");

    const delivered: Buffer[] = [];
    while (this.buffered.has(this.nextDataSeq)) {
      delivered.push(this.buffered.get(this.nextDataSeq)!);
      this.buffered.delete(this.nextDataSeq);
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
