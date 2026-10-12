// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

import {
  canonicalEd25519PublicPemV1,
  deriveVoidNodeIdFromPublicPemV1,
} from "./auth_v1.js";
import { normalizeVoidUdpObservedEndpointV1 } from "./udp_hole_punch_v1.js";

export const VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1 = 1;
export const VOID_P2P_UDP_AUTHENTICATED_PATH_CHALLENGE_BYTES_V1 = 32;
export const VOID_P2P_UDP_AUTHENTICATED_PATH_MAX_PACKET_BYTES_V1 = 4096;
export const VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1 =
  "ed25519" as const;
export const VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1 =
  "ed25519" as const;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const ID_RE = /^[0-9a-f]{32}$/;
const CHALLENGE_RE = /^[0-9a-f]{64}$/;
const SIGNATURE_RE = /^[0-9a-f]{128}$/;
const AUTH_DOMAIN = "VOID_P2P_UDP_AUTHENTICATED_PATH_V1";

export type VoidUdpAuthenticatedPathHelloV1 = Readonly<{
  type: "VOID_UDP_AUTH_HELLO";
  protocol: 1;
  identity_algorithm: "ed25519";
  signature_algorithm: "ed25519";
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  pubkey: string;
  challenge: string;
}>;

export type VoidUdpAuthenticatedPathProofV1 = Readonly<{
  type: "VOID_UDP_AUTH_PROOF";
  protocol: 1;
  identity_algorithm: "ed25519";
  signature_algorithm: "ed25519";
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  pubkey: string;
  source_challenge: string;
  target_challenge: string;
  source_observed_endpoint: string;
  target_observed_endpoint: string;
  sig: string;
}>;

export type VoidUdpAuthenticatedPathPacketV1 =
  | VoidUdpAuthenticatedPathHelloV1
  | VoidUdpAuthenticatedPathProofV1;

export const VOID_P2P_UDP_AUTHENTICATED_PATH_AUTHORITY_V1 = Object.freeze({
  void_ed25519_identity_required: true,
  identity_algorithm_explicit: true,
  signature_algorithm_explicit: true,
  algorithm_confusion_rejected: true,
  crypto_agility_extension_point_explicit: true,
  quantum_safe_claimed: false,
  mutual_fresh_challenges_required: true,
  exact_session_binding_required: true,
  exact_peer_node_id_binding_required: true,
  exact_observed_endpoint_binding_required: true,
  observed_endpoint_defines_node_identity: false,
  punch_packet_defines_node_identity: false,
  reliable_ordered_transport_claimed: false,
  runtime_peer_promotion_performed: false,
  verified_direct_cache_mutation_performed: false,
  relay_fallback_preserved: true,
  router_configuration_required: false,
  port_forward_required: false,
  wallet_signer_validator_wc_money_authority: 0,
});

function exactObjectKeys(
  raw: unknown,
  expected: readonly string[],
): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length) return;
  if (!actual.every((key, index) => key === wanted[index])) return;
  return value;
}

function sessionId(raw: unknown): string | undefined {
  return typeof raw === "string" && ID_RE.test(raw) ? raw : undefined;
}

function nodeId(raw: unknown): string | undefined {
  return typeof raw === "string" && NODE_ID_RE.test(raw) ? raw : undefined;
}

function challenge(raw: unknown): string | undefined {
  return typeof raw === "string" && CHALLENGE_RE.test(raw) ? raw : undefined;
}

function identityAlgorithm(
  raw: unknown,
): typeof VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1 | undefined {
  return raw === VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1
    ? VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1
    : undefined;
}

function signatureAlgorithm(
  raw: unknown,
): typeof VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1 | undefined {
  return raw === VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1
    ? VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1
    : undefined;
}

function canonicalIdentity(input: {
  nodeId: unknown;
  pubkey: unknown;
}): Readonly<{ node_id: string; pubkey: string }> | undefined {
  const node_id = nodeId(input.nodeId);
  const pubkey = canonicalEd25519PublicPemV1(input.pubkey);
  if (!node_id || !pubkey) return;
  if (deriveVoidNodeIdFromPublicPemV1(pubkey) !== node_id) return;
  return Object.freeze({ node_id, pubkey });
}

function canonicalEndpoint(
  raw: unknown,
  allowNonPublicEndpoints: boolean,
): string | undefined {
  return normalizeVoidUdpObservedEndpointV1(raw, allowNonPublicEndpoints);
}

export function newVoidUdpAuthenticatedPathChallengeV1(): string {
  return crypto
    .randomBytes(VOID_P2P_UDP_AUTHENTICATED_PATH_CHALLENGE_BYTES_V1)
    .toString("hex");
}

export function createVoidUdpAuthenticatedPathHelloV1(input: {
  sessionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  pubkey: string;
  challenge?: string;
}): VoidUdpAuthenticatedPathHelloV1 {
  const session_id = sessionId(input.sessionId);
  const source = canonicalIdentity({
    nodeId: input.sourceNodeId,
    pubkey: input.pubkey,
  });
  const target_node_id = nodeId(input.targetNodeId);
  const challengeValue = challenge(
    input.challenge ?? newVoidUdpAuthenticatedPathChallengeV1(),
  );

  if (
    !session_id ||
    !source ||
    !target_node_id ||
    source.node_id === target_node_id ||
    !challengeValue
  ) {
    throw new Error("UDP authenticated-path HELLO input is invalid");
  }

  return Object.freeze({
    type: "VOID_UDP_AUTH_HELLO",
    protocol: VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
    identity_algorithm: VOID_P2P_UDP_AUTHENTICATED_PATH_IDENTITY_ALGORITHM_V1,
    signature_algorithm: VOID_P2P_UDP_AUTHENTICATED_PATH_SIGNATURE_ALGORITHM_V1,
    session_id,
    source_node_id: source.node_id,
    target_node_id,
    pubkey: source.pubkey,
    challenge: challengeValue,
  });
}

export function normalizeVoidUdpAuthenticatedPathHelloV1(
  raw: unknown,
): VoidUdpAuthenticatedPathHelloV1 | undefined {
  const value = exactObjectKeys(raw, [
    "type",
    "protocol",
    "identity_algorithm",
    "signature_algorithm",
    "session_id",
    "source_node_id",
    "target_node_id",
    "pubkey",
    "challenge",
  ]);
  if (!value || value.type !== "VOID_UDP_AUTH_HELLO") return;
  if (value.protocol !== VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1) {
    return;
  }

  const identity_algorithm = identityAlgorithm(value.identity_algorithm);
  const signature_algorithm = signatureAlgorithm(value.signature_algorithm);
  const session_id = sessionId(value.session_id);
  const source = canonicalIdentity({
    nodeId: value.source_node_id,
    pubkey: value.pubkey,
  });
  const target_node_id = nodeId(value.target_node_id);
  const challengeValue = challenge(value.challenge);
  if (
    !identity_algorithm ||
    !signature_algorithm ||
    !session_id ||
    !source ||
    !target_node_id ||
    source.node_id === target_node_id ||
    !challengeValue
  ) return;

  return Object.freeze({
    type: "VOID_UDP_AUTH_HELLO",
    protocol: VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
    identity_algorithm,
    signature_algorithm,
    session_id,
    source_node_id: source.node_id,
    target_node_id,
    pubkey: source.pubkey,
    challenge: challengeValue,
  });
}

function proofTranscriptBytesV1(value: Readonly<{
  identity_algorithm: "ed25519";
  signature_algorithm: "ed25519";
  session_id: string;
  source_node_id: string;
  target_node_id: string;
  pubkey: string;
  source_challenge: string;
  target_challenge: string;
  source_observed_endpoint: string;
  target_observed_endpoint: string;
}>): Buffer {
  return Buffer.from(
    JSON.stringify({
      domain: AUTH_DOMAIN,
      protocol: VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
      identity_algorithm: value.identity_algorithm,
      signature_algorithm: value.signature_algorithm,
      session_id: value.session_id,
      source_node_id: value.source_node_id,
      target_node_id: value.target_node_id,
      pubkey: value.pubkey,
      source_challenge: value.source_challenge,
      target_challenge: value.target_challenge,
      source_observed_endpoint: value.source_observed_endpoint,
      target_observed_endpoint: value.target_observed_endpoint,
    }),
    "utf8",
  );
}

export function createVoidUdpAuthenticatedPathProofV1(input: {
  localHello: VoidUdpAuthenticatedPathHelloV1;
  remoteHello: VoidUdpAuthenticatedPathHelloV1;
  localObservedEndpoint: string;
  remoteObservedEndpoint: string;
  privateKey: crypto.KeyObject;
  allowNonPublicEndpoints?: boolean;
}): VoidUdpAuthenticatedPathProofV1 {
  const local = normalizeVoidUdpAuthenticatedPathHelloV1(input.localHello);
  const remote = normalizeVoidUdpAuthenticatedPathHelloV1(input.remoteHello);
  const allowNonPublic = input.allowNonPublicEndpoints === true;
  const source_observed_endpoint = canonicalEndpoint(
    input.localObservedEndpoint,
    allowNonPublic,
  );
  const target_observed_endpoint = canonicalEndpoint(
    input.remoteObservedEndpoint,
    allowNonPublic,
  );

  if (
    !local ||
    !remote ||
    !source_observed_endpoint ||
    !target_observed_endpoint ||
    local.identity_algorithm !== remote.identity_algorithm ||
    local.signature_algorithm !== remote.signature_algorithm ||
    local.session_id !== remote.session_id ||
    local.source_node_id !== remote.target_node_id ||
    local.target_node_id !== remote.source_node_id
  ) {
    throw new Error("UDP authenticated-path proof inputs do not form one session");
  }

  if (input.privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("UDP authenticated-path proof requires Ed25519 private key");
  }

  const unsigned = Object.freeze({
    identity_algorithm: local.identity_algorithm,
    signature_algorithm: local.signature_algorithm,
    session_id: local.session_id,
    source_node_id: local.source_node_id,
    target_node_id: local.target_node_id,
    pubkey: local.pubkey,
    source_challenge: local.challenge,
    target_challenge: remote.challenge,
    source_observed_endpoint,
    target_observed_endpoint,
  });

  const sig = crypto
    .sign(null, proofTranscriptBytesV1(unsigned), input.privateKey)
    .toString("hex");
  if (!SIGNATURE_RE.test(sig)) {
    throw new Error("generated UDP authenticated-path signature is malformed");
  }

  return Object.freeze({
    type: "VOID_UDP_AUTH_PROOF",
    protocol: VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
    ...unsigned,
    sig,
  });
}

export function normalizeVoidUdpAuthenticatedPathProofV1(
  raw: unknown,
  allowNonPublicEndpoints = false,
): VoidUdpAuthenticatedPathProofV1 | undefined {
  const value = exactObjectKeys(raw, [
    "type",
    "protocol",
    "identity_algorithm",
    "signature_algorithm",
    "session_id",
    "source_node_id",
    "target_node_id",
    "pubkey",
    "source_challenge",
    "target_challenge",
    "source_observed_endpoint",
    "target_observed_endpoint",
    "sig",
  ]);
  if (!value || value.type !== "VOID_UDP_AUTH_PROOF") return;
  if (value.protocol !== VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1) {
    return;
  }

  const identity_algorithm = identityAlgorithm(value.identity_algorithm);
  const signature_algorithm = signatureAlgorithm(value.signature_algorithm);
  const session_id = sessionId(value.session_id);
  const source = canonicalIdentity({
    nodeId: value.source_node_id,
    pubkey: value.pubkey,
  });
  const target_node_id = nodeId(value.target_node_id);
  const source_challenge = challenge(value.source_challenge);
  const target_challenge = challenge(value.target_challenge);
  const source_observed_endpoint = canonicalEndpoint(
    value.source_observed_endpoint,
    allowNonPublicEndpoints,
  );
  const target_observed_endpoint = canonicalEndpoint(
    value.target_observed_endpoint,
    allowNonPublicEndpoints,
  );
  const sig = typeof value.sig === "string" ? value.sig : "";

  if (
    !identity_algorithm ||
    !signature_algorithm ||
    !session_id ||
    !source ||
    !target_node_id ||
    source.node_id === target_node_id ||
    !source_challenge ||
    !target_challenge ||
    !source_observed_endpoint ||
    !target_observed_endpoint ||
    !SIGNATURE_RE.test(sig)
  ) return;

  return Object.freeze({
    type: "VOID_UDP_AUTH_PROOF",
    protocol: VOID_P2P_UDP_AUTHENTICATED_PATH_PROTOCOL_VERSION_V1,
    identity_algorithm,
    signature_algorithm,
    session_id,
    source_node_id: source.node_id,
    target_node_id,
    pubkey: source.pubkey,
    source_challenge,
    target_challenge,
    source_observed_endpoint,
    target_observed_endpoint,
    sig,
  });
}

export function verifyVoidUdpAuthenticatedPathProofV1(input: {
  rawProof: unknown;
  expectedRemoteHello: VoidUdpAuthenticatedPathHelloV1;
  localHello: VoidUdpAuthenticatedPathHelloV1;
  expectedRemoteObservedEndpoint: string;
  localObservedEndpoint: string;
  allowNonPublicEndpoints?: boolean;
}): VoidUdpAuthenticatedPathProofV1 | undefined {
  const allowNonPublic = input.allowNonPublicEndpoints === true;
  const proof = normalizeVoidUdpAuthenticatedPathProofV1(
    input.rawProof,
    allowNonPublic,
  );
  const remote = normalizeVoidUdpAuthenticatedPathHelloV1(
    input.expectedRemoteHello,
  );
  const local = normalizeVoidUdpAuthenticatedPathHelloV1(input.localHello);
  const expectedRemoteObservedEndpoint = canonicalEndpoint(
    input.expectedRemoteObservedEndpoint,
    allowNonPublic,
  );
  const localObservedEndpoint = canonicalEndpoint(
    input.localObservedEndpoint,
    allowNonPublic,
  );

  if (
    !proof ||
    !remote ||
    !local ||
    !expectedRemoteObservedEndpoint ||
    !localObservedEndpoint
  ) return;

  if (
    remote.identity_algorithm !== local.identity_algorithm ||
    remote.signature_algorithm !== local.signature_algorithm ||
    remote.session_id !== local.session_id ||
    remote.source_node_id !== local.target_node_id ||
    remote.target_node_id !== local.source_node_id
  ) return;

  if (
    proof.identity_algorithm !== remote.identity_algorithm ||
    proof.signature_algorithm !== remote.signature_algorithm ||
    proof.session_id !== local.session_id ||
    proof.source_node_id !== remote.source_node_id ||
    proof.target_node_id !== local.source_node_id ||
    proof.pubkey !== remote.pubkey ||
    proof.source_challenge !== remote.challenge ||
    proof.target_challenge !== local.challenge ||
    proof.source_observed_endpoint !== expectedRemoteObservedEndpoint ||
    proof.target_observed_endpoint !== localObservedEndpoint
  ) return;

  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey(proof.pubkey);
  } catch {
    return;
  }
  if (publicKey.asymmetricKeyType !== "ed25519") return;

  const ok = crypto.verify(
    null,
    proofTranscriptBytesV1({
      identity_algorithm: proof.identity_algorithm,
      signature_algorithm: proof.signature_algorithm,
      session_id: proof.session_id,
      source_node_id: proof.source_node_id,
      target_node_id: proof.target_node_id,
      pubkey: proof.pubkey,
      source_challenge: proof.source_challenge,
      target_challenge: proof.target_challenge,
      source_observed_endpoint: proof.source_observed_endpoint,
      target_observed_endpoint: proof.target_observed_endpoint,
    }),
    publicKey,
    Buffer.from(proof.sig, "hex"),
  );
  if (!ok) return;

  return proof;
}

export function encodeVoidUdpAuthenticatedPathPacketV1(
  packet: VoidUdpAuthenticatedPathPacketV1,
  allowNonPublicEndpoints = false,
): Buffer {
  const normalized =
    packet.type === "VOID_UDP_AUTH_HELLO"
      ? normalizeVoidUdpAuthenticatedPathHelloV1(packet)
      : normalizeVoidUdpAuthenticatedPathProofV1(
          packet,
          allowNonPublicEndpoints,
        );
  if (!normalized) {
    throw new Error("UDP authenticated-path packet is invalid");
  }
  const bytes = Buffer.from(JSON.stringify(normalized), "utf8");
  if (bytes.length > VOID_P2P_UDP_AUTHENTICATED_PATH_MAX_PACKET_BYTES_V1) {
    throw new Error("UDP authenticated-path packet exceeds byte limit");
  }
  return bytes;
}

export function decodeVoidUdpAuthenticatedPathPacketV1(
  raw: Uint8Array,
  allowNonPublicEndpoints = false,
): VoidUdpAuthenticatedPathPacketV1 | undefined {
  if (!(raw instanceof Uint8Array)) return;
  if (
    raw.byteLength < 2 ||
    raw.byteLength > VOID_P2P_UDP_AUTHENTICATED_PATH_MAX_PACKET_BYTES_V1
  ) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw).toString("utf8"));
  } catch {
    return;
  }

  const hello = normalizeVoidUdpAuthenticatedPathHelloV1(parsed);
  if (hello) return hello;
  return normalizeVoidUdpAuthenticatedPathProofV1(
    parsed,
    allowNonPublicEndpoints,
  );
}
