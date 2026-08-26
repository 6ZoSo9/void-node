// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

export const VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V1 =
  "void_public_bootstrap_adapter_authority_message_v1" as const;
export const VOID_PUBLIC_BOOTSTRAP_AUTHORITY_CHILD_SCHEMA_V1 =
  "void_public_bootstrap_adapter_authority_child_v1" as const;
export const VOID_PUBLIC_SEED_RESPONSE_AUTHORITY_SCHEMA_V1 =
  "void_public_seed_response_authority_v1" as const;

export const VOID_PUBLIC_SEED_AUTHORITY_CHALLENGE_HEADER_V1 =
  "x-void-public-seed-authority-challenge" as const;
export const VOID_PUBLIC_SEED_AUTHORITY_SCHEMA_HEADER_V1 =
  "x-void-public-seed-authority-schema" as const;
export const VOID_PUBLIC_SEED_AUTHORITY_GENERATION_HEADER_V1 =
  "x-void-public-seed-authority-generation" as const;
export const VOID_PUBLIC_SEED_AUTHORITY_SEQUENCE_HEADER_V1 =
  "x-void-public-seed-authority-sequence" as const;
export const VOID_PUBLIC_SEED_AUTHORITY_ROUTE_HEADER_V1 =
  "x-void-public-seed-authority-route-b64url" as const;
export const VOID_PUBLIC_SEED_AUTHORITY_BODY_SHA256_HEADER_V1 =
  "x-void-public-seed-authority-body-sha256" as const;
export const VOID_PUBLIC_SEED_AUTHORITY_HMAC_HEADER_V1 =
  "x-void-public-seed-authority-hmac" as const;

type AuthorityStateV1 = {
  adapterOrigin: string;
  generation: string;
  sequence: number;
  secret: Buffer;
  ipcBound: boolean;
};

export type VerifiedPublicBootstrapChallengeV1 = {
  authority: AuthorityStateV1;
  nonce: string;
  method: "GET";
  requestedUrl: string;
  route: string;
};

let liveAuthorityV1: AuthorityStateV1 | null = null;
let highestAuthoritySequenceV1 = 0;

function exactKeysV1(raw: unknown, expected: readonly string[]): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const actual = Object.keys(raw as Record<string, unknown>).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function normalizeNumericLoopbackOriginV1(raw: unknown): string | null {
  const token = String(raw ?? "").trim();
  if (!token) return null;
  let url: URL;
  try {
    url = new URL(token);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "http:" ||
    (hostname !== "127.0.0.1" && hostname !== "::1") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    return null;
  }
  return url.origin;
}

function installAuthorityV1(
  raw: unknown,
  ipcBound: boolean,
): boolean {
  if (!exactKeysV1(raw, [
    "schema",
    "type",
    "sequence",
    "generation",
    "adapter_origin",
    "secret_hex",
  ])) return false;
  if (raw.schema !== VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V1) return false;
  if (raw.type !== "authority") return false;

  const sequence = raw.sequence;
  const generation = raw.generation;
  const adapterOrigin = normalizeNumericLoopbackOriginV1(raw.adapter_origin);
  const secretHex = raw.secret_hex;

  if (
    typeof sequence !== "number" ||
    !Number.isSafeInteger(sequence) ||
    sequence <= highestAuthoritySequenceV1 ||
    typeof generation !== "string" ||
    !/^[0-9a-f]{32}$/.test(generation) ||
    !adapterOrigin ||
    typeof secretHex !== "string" ||
    !/^[0-9a-f]{64}$/.test(secretHex)
  ) {
    return false;
  }

  liveAuthorityV1 = Object.freeze({
    adapterOrigin,
    generation,
    sequence,
    secret: Buffer.from(secretHex, "hex"),
    ipcBound,
  });
  highestAuthoritySequenceV1 = sequence;
  return true;
}

function clearAuthorityV1(raw?: unknown): boolean {
  if (raw !== undefined) {
    if (!exactKeysV1(raw, [
      "schema",
      "type",
      "sequence",
      "generation",
    ])) return false;
    if (raw.schema !== VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V1) return false;
    if (raw.type !== "invalidate") return false;
    if (
      typeof raw.sequence !== "number" ||
      !Number.isSafeInteger(raw.sequence) ||
      raw.sequence <= highestAuthoritySequenceV1 ||
      typeof raw.generation !== "string" ||
      !/^[0-9a-f]{32}$/.test(raw.generation)
    ) {
      return false;
    }
    highestAuthoritySequenceV1 = raw.sequence;
  }
  liveAuthorityV1 = null;
  return true;
}

function authorityStillLiveV1(state: AuthorityStateV1): boolean {
  if (liveAuthorityV1 !== state) return false;
  if (state.ipcBound && process.connected === false) return false;
  return true;
}

function canonicalTranscriptV1(input: {
  generation: string;
  sequence: number;
  nonce: string;
  method: string;
  route: string;
  status: number;
  byteLength: number;
  bodySha256: string;
}): string {
  return JSON.stringify({
    schema: VOID_PUBLIC_SEED_RESPONSE_AUTHORITY_SCHEMA_V1,
    generation: input.generation,
    sequence: input.sequence,
    nonce: input.nonce,
    method: input.method,
    route: input.route,
    status: input.status,
    byte_length: input.byteLength,
    body_sha256: input.bodySha256,
  });
}

export function createVerifiedPublicBootstrapChallengeV1(
  requestedUrl: string,
): VerifiedPublicBootstrapChallengeV1 | null {
  const authority = liveAuthorityV1;
  if (!authority || !authorityStillLiveV1(authority)) return null;

  let parsed: URL;
  try {
    parsed = new URL(requestedUrl);
  } catch {
    return null;
  }
  if (parsed.origin !== authority.adapterOrigin) return null;

  return Object.freeze({
    authority,
    nonce: crypto.randomBytes(32).toString("hex"),
    method: "GET" as const,
    requestedUrl: parsed.href,
    route: `${parsed.pathname}${parsed.search}`,
  });
}

export function verifyVerifiedPublicBootstrapResponseV1(
  response: Response,
  exactBody: Uint8Array,
  challenge: VerifiedPublicBootstrapChallengeV1,
): boolean {
  if (!authorityStillLiveV1(challenge.authority)) return false;
  if (response.status < 200 || response.status > 299) return false;

  const schema = String(
    response.headers.get(VOID_PUBLIC_SEED_AUTHORITY_SCHEMA_HEADER_V1) || "",
  );
  const generation = String(
    response.headers.get(VOID_PUBLIC_SEED_AUTHORITY_GENERATION_HEADER_V1) || "",
  );
  const sequenceRaw = String(
    response.headers.get(VOID_PUBLIC_SEED_AUTHORITY_SEQUENCE_HEADER_V1) || "",
  );
  const routeB64url = String(
    response.headers.get(VOID_PUBLIC_SEED_AUTHORITY_ROUTE_HEADER_V1) || "",
  );
  const bodyShaHeader = String(
    response.headers.get(VOID_PUBLIC_SEED_AUTHORITY_BODY_SHA256_HEADER_V1) || "",
  );
  const hmacHex = String(
    response.headers.get(VOID_PUBLIC_SEED_AUTHORITY_HMAC_HEADER_V1) || "",
  );

  if (
    schema !== VOID_PUBLIC_SEED_RESPONSE_AUTHORITY_SCHEMA_V1 ||
    generation !== challenge.authority.generation ||
    sequenceRaw !== String(challenge.authority.sequence) ||
    routeB64url !== Buffer.from(challenge.route, "utf8").toString("base64url") ||
    !/^[0-9a-f]{64}$/.test(bodyShaHeader) ||
    !/^[0-9a-f]{64}$/.test(hmacHex)
  ) {
    return false;
  }

  const bytes = Buffer.from(exactBody);
  const bodySha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (bodyShaHeader !== bodySha256) return false;

  const transcript = canonicalTranscriptV1({
    generation: challenge.authority.generation,
    sequence: challenge.authority.sequence,
    nonce: challenge.nonce,
    method: challenge.method,
    route: challenge.route,
    status: response.status,
    byteLength: bytes.length,
    bodySha256,
  });

  const expected = crypto
    .createHmac("sha256", challenge.authority.secret)
    .update(transcript, "utf8")
    .digest();
  const actual = Buffer.from(hmacHex, "hex");
  if (actual.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(expected, actual)) return false;

  return authorityStillLiveV1(challenge.authority);
}

export function installVerifiedPublicBootstrapAuthorityForTestV1(input: {
  sequence: number;
  generation: string;
  adapter_origin: string;
  secret_hex: string;
}): boolean {
  return installAuthorityV1({
    schema: VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V1,
    type: "authority",
    ...input,
  }, false);
}

export function clearVerifiedPublicBootstrapAuthorityForTestV1(): void {
  liveAuthorityV1 = null;
}

export function resetVerifiedPublicBootstrapAuthorityForTestV1(): void {
  liveAuthorityV1 = null;
  highestAuthoritySequenceV1 = 0;
}

if (typeof process.on === "function") {
  process.on("message", (message: unknown) => {
    if (
      message &&
      typeof message === "object" &&
      !Array.isArray(message) &&
      (message as Record<string, unknown>).type === "invalidate"
    ) {
      clearAuthorityV1(message);
      return;
    }
    installAuthorityV1(message, true);
  });

  process.on("disconnect", () => {
    liveAuthorityV1 = null;
  });

  if (typeof process.send === "function") {
    try {
      process.send({
        schema: VOID_PUBLIC_BOOTSTRAP_AUTHORITY_CHILD_SCHEMA_V1,
        type: "ready",
      });
    } catch {
      liveAuthorityV1 = null;
    }
  }
}
