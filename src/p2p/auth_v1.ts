// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";

import { canonicalizePeerAddressList } from "../types/p2p.js";

export const VOID_P2P_AUTH_PROTOCOL_VERSION_V1 = 2;
export const VOID_P2P_AUTH_CHALLENGE_BYTES_V1 = 32;
export const VOID_P2P_AUTH_TIMEOUT_MS_V1 = 5_000;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const CHALLENGE_RE = /^[0-9a-f]{64}$/;
const SIGNATURE_RE = /^[0-9a-f]{128}$/;
const MAX_PUBLIC_PEM_CHARS = 2_048;
const MAX_LISTEN_ADDRS = 32;
const AUTH_DOMAIN = "VOID_P2P_AUTHENTICATED_PEER_IDENTITY_V1";

export type VoidPeerIdentityV1 = Readonly<{
  id: string;
  listen: string[];
  proto: number;
  pubkey: string;
}>;

export type VoidPeerHelloV1 = Readonly<
  VoidPeerIdentityV1 & {
    type: "HELLO";
    challenge: string;
  }
>;

export type VoidPeerAuthV1 = Readonly<
  VoidPeerIdentityV1 & {
    type: "AUTH";
    challenge: string;
    self_challenge: string;
    sig: string;
  }
>;

function exactObjectKeys(
  value: unknown,
  expected: readonly string[],
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const object = value as Record<string, unknown>;
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length) return;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== wanted[index]) return;
  }
  return object;
}

export function canonicalEd25519PublicPemV1(
  raw: unknown,
): string | undefined {
  if (
    typeof raw !== "string" ||
    raw.length < 64 ||
    raw.length > MAX_PUBLIC_PEM_CHARS
  ) {
    return;
  }
  try {
    const key = crypto.createPublicKey(raw);
    if (key.asymmetricKeyType !== "ed25519") return;
    const canonical = key
      .export({ type: "spki", format: "pem" })
      .toString();
    return canonical === raw ? canonical : undefined;
  } catch {
    return;
  }
}

export function deriveVoidNodeIdFromPublicPemV1(
  raw: unknown,
): string | undefined {
  const pubkey = canonicalEd25519PublicPemV1(raw);
  if (!pubkey) return;
  return crypto
    .createHash("sha256")
    .update(pubkey)
    .digest("hex")
    .slice(0, 32);
}

function exactCanonicalListenV1(
  raw: unknown,
): string[] | undefined {
  if (!Array.isArray(raw) || raw.length > MAX_LISTEN_ADDRS) return;
  if (raw.some((value) => typeof value !== "string")) return;

  const listen = canonicalizePeerAddressList(raw, MAX_LISTEN_ADDRS);
  if (listen.length !== raw.length) return;
  for (let index = 0; index < listen.length; index += 1) {
    if (listen[index] !== raw[index]) return;
  }
  return listen;
}

function normalizeIdentityV1(
  object: Record<string, unknown>,
): VoidPeerIdentityV1 | undefined {
  const id = typeof object.id === "string" ? object.id : "";
  const proto = typeof object.proto === "number" ? object.proto : Number.NaN;
  const pubkey = canonicalEd25519PublicPemV1(object.pubkey);
  const listen = exactCanonicalListenV1(object.listen);

  if (!NODE_ID_RE.test(id)) return;
  if (proto !== VOID_P2P_AUTH_PROTOCOL_VERSION_V1) return;
  if (!pubkey || deriveVoidNodeIdFromPublicPemV1(pubkey) !== id) return;
  if (!listen) return;

  return Object.freeze({ id, listen, proto, pubkey });
}

export function newVoidPeerChallengeV1(): string {
  return crypto
    .randomBytes(VOID_P2P_AUTH_CHALLENGE_BYTES_V1)
    .toString("hex");
}

export function normalizeVoidPeerHelloV1(
  raw: unknown,
): VoidPeerHelloV1 | undefined {
  const object = exactObjectKeys(raw, [
    "type",
    "id",
    "listen",
    "proto",
    "pubkey",
    "challenge",
  ]);
  if (!object || object.type !== "HELLO") return;

  const identity = normalizeIdentityV1(object);
  const challenge =
    typeof object.challenge === "string" ? object.challenge : "";
  if (!identity || !CHALLENGE_RE.test(challenge)) return;

  return Object.freeze({
    type: "HELLO",
    ...identity,
    challenge,
  });
}

function authTranscriptBytesV1(
  value: Readonly<{
    challenge: string;
    self_challenge: string;
    id: string;
    listen: string[];
    proto: number;
    pubkey: string;
  }>,
): Buffer {
  return Buffer.from(
    JSON.stringify({
      domain: AUTH_DOMAIN,
      challenge: value.challenge,
      self_challenge: value.self_challenge,
      id: value.id,
      listen: value.listen,
      proto: value.proto,
      pubkey: value.pubkey,
    }),
    "utf8",
  );
}

export function buildVoidPeerAuthV1(
  identityInput: VoidPeerIdentityV1,
  challenge: string,
  selfChallenge: string,
  privateKey: crypto.KeyObject,
): VoidPeerAuthV1 {
  const identity = normalizeIdentityV1({
    id: identityInput.id,
    listen: identityInput.listen,
    proto: identityInput.proto,
    pubkey: identityInput.pubkey,
  });
  if (!identity) throw new Error("local peer identity is not canonical");
  if (!CHALLENGE_RE.test(challenge)) {
    throw new Error("remote peer challenge is malformed");
  }
  if (!CHALLENGE_RE.test(selfChallenge)) {
    throw new Error("local peer challenge is malformed");
  }

  const unsigned = {
    challenge,
    self_challenge: selfChallenge,
    ...identity,
  };
  const sig = crypto
    .sign(null, authTranscriptBytesV1(unsigned), privateKey)
    .toString("hex");

  if (!SIGNATURE_RE.test(sig)) {
    throw new Error("generated peer-auth signature is malformed");
  }

  return Object.freeze({
    type: "AUTH",
    ...unsigned,
    sig,
  });
}

export function verifyVoidPeerAuthV1(
  raw: unknown,
  expectedChallenge: string,
  expectedHello: VoidPeerHelloV1,
): VoidPeerAuthV1 | undefined {
  const object = exactObjectKeys(raw, [
    "type",
    "id",
    "listen",
    "proto",
    "pubkey",
    "challenge",
    "self_challenge",
    "sig",
  ]);
  if (!object || object.type !== "AUTH") return;
  if (!CHALLENGE_RE.test(expectedChallenge)) return;

  const identity = normalizeIdentityV1(object);
  const challenge =
    typeof object.challenge === "string" ? object.challenge : "";
  const selfChallenge =
    typeof object.self_challenge === "string"
      ? object.self_challenge
      : "";
  const sig = typeof object.sig === "string" ? object.sig : "";

  if (
    !identity ||
    !CHALLENGE_RE.test(challenge) ||
    !CHALLENGE_RE.test(selfChallenge) ||
    !SIGNATURE_RE.test(sig)
  ) {
    return;
  }

  if (challenge !== expectedChallenge) return;
  if (selfChallenge !== expectedHello.challenge) return;
  if (
    identity.id !== expectedHello.id ||
    identity.proto !== expectedHello.proto ||
    identity.pubkey !== expectedHello.pubkey ||
    JSON.stringify(identity.listen) !== JSON.stringify(expectedHello.listen)
  ) {
    return;
  }

  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey(identity.pubkey);
  } catch {
    return;
  }

  const ok = crypto.verify(
    null,
    authTranscriptBytesV1({
      challenge,
      self_challenge: selfChallenge,
      ...identity,
    }),
    publicKey,
    Buffer.from(sig, "hex"),
  );
  if (!ok) return;

  return Object.freeze({
    type: "AUTH",
    challenge,
    self_challenge: selfChallenge,
    ...identity,
    sig,
  });
}
