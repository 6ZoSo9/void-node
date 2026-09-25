// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";

export const VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V1 =
  "void_public_bootstrap_adapter_authority_message_v1" as const;
export const VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V2 =
  "void_public_bootstrap_adapter_authority_message_v2" as const;
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

let liveAuthoritiesV1 = new Map<string, AuthorityStateV1>();
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

function authorityStateV1(
  adapterOrigin: string,
  generation: string,
  sequence: number,
  secretHex: string,
  ipcBound: boolean,
): AuthorityStateV1 {
  return Object.freeze({
    adapterOrigin,
    generation,
    sequence,
    secret: Buffer.from(secretHex, "hex"),
    ipcBound,
  });
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

  const state = authorityStateV1(
    adapterOrigin,
    generation,
    sequence,
    secretHex,
    ipcBound,
  );
  liveAuthoritiesV1 = new Map([[adapterOrigin, state]]);
  highestAuthoritySequenceV1 = sequence;
  return true;
}

function installAuthoritySetV2(
  raw: unknown,
  ipcBound: boolean,
): boolean {
  if (!exactKeysV1(raw, [
    "schema",
    "type",
    "sequence",
    "authorities",
  ])) return false;
  if (raw.schema !== VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V2) return false;
  if (raw.type !== "authority_set") return false;

  const sequence = raw.sequence;
  if (
    typeof sequence !== "number" ||
    !Number.isSafeInteger(sequence) ||
    sequence <= highestAuthoritySequenceV1 ||
    !Array.isArray(raw.authorities) ||
    raw.authorities.length < 1 ||
    raw.authorities.length > 2
  ) {
    return false;
  }

  const next = new Map<string, AuthorityStateV1>();
  const generations = new Set<string>();
  const secrets = new Set<string>();
  for (const rawAuthority of raw.authorities) {
    if (!exactKeysV1(rawAuthority, [
      "adapter_origin",
      "generation",
      "secret_hex",
    ])) return false;
    const adapterOrigin = normalizeNumericLoopbackOriginV1(
      rawAuthority.adapter_origin,
    );
    const generation = rawAuthority.generation;
    const secretHex = rawAuthority.secret_hex;
    if (
      !adapterOrigin ||
      typeof generation !== "string" ||
      !/^[0-9a-f]{32}$/.test(generation) ||
      typeof secretHex !== "string" ||
      !/^[0-9a-f]{64}$/.test(secretHex) ||
      next.has(adapterOrigin) ||
      generations.has(generation) ||
      secrets.has(secretHex)
    ) {
      return false;
    }
    next.set(
      adapterOrigin,
      authorityStateV1(
        adapterOrigin,
        generation,
        sequence,
        secretHex,
        ipcBound,
      ),
    );
    generations.add(generation);
    secrets.add(secretHex);
  }

  liveAuthoritiesV1 = next;
  highestAuthoritySequenceV1 = sequence;
  return true;
}

function clearAuthorityV1(raw?: unknown): boolean {
  if (raw !== undefined) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const schema = (raw as Record<string, unknown>).schema;
    if (schema === VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V1) {
      if (!exactKeysV1(raw, [
        "schema",
        "type",
        "sequence",
        "generation",
      ])) return false;
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
    } else if (schema === VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V2) {
      if (!exactKeysV1(raw, [
        "schema",
        "type",
        "sequence",
      ])) return false;
      if (
        raw.type !== "invalidate" ||
        typeof raw.sequence !== "number" ||
        !Number.isSafeInteger(raw.sequence) ||
        raw.sequence <= highestAuthoritySequenceV1
      ) {
        return false;
      }
      highestAuthoritySequenceV1 = raw.sequence;
    } else {
      return false;
    }
  }
  liveAuthoritiesV1 = new Map();
  return true;
}

function authorityStillLiveV1(state: AuthorityStateV1): boolean {
  if (liveAuthoritiesV1.get(state.adapterOrigin) !== state) return false;
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
  let parsed: URL;
  try {
    parsed = new URL(requestedUrl);
  } catch {
    return null;
  }
  const authority = liveAuthoritiesV1.get(parsed.origin);
  if (!authority || !authorityStillLiveV1(authority)) return null;

  return Object.freeze({
    authority,
    nonce: crypto.randomBytes(32).toString("hex"),
    method: "GET" as const,
    requestedUrl: parsed.href,
    route: `${parsed.pathname}${parsed.search}`,
  });
}

export function verifiedPublicBootstrapChallengeStillLiveV1(
  challenge: VerifiedPublicBootstrapChallengeV1 | null | undefined,
): boolean {
  return !!challenge && authorityStillLiveV1(challenge.authority);
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

export function installVerifiedPublicBootstrapAuthoritySetForTestV2(input: {
  sequence: number;
  authorities: Array<{
    adapter_origin: string;
    generation: string;
    secret_hex: string;
  }>;
}): boolean {
  return installAuthoritySetV2({
    schema: VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V2,
    type: "authority_set",
    sequence: input.sequence,
    authorities: input.authorities,
  }, false);
}

export function clearVerifiedPublicBootstrapAuthorityForTestV1(): void {
  liveAuthoritiesV1 = new Map();
}

export function resetVerifiedPublicBootstrapAuthorityForTestV1(): void {
  liveAuthoritiesV1 = new Map();
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
    if (
      message &&
      typeof message === "object" &&
      !Array.isArray(message) &&
      (message as Record<string, unknown>).schema ===
        VOID_PUBLIC_BOOTSTRAP_AUTHORITY_MESSAGE_SCHEMA_V2
    ) {
      installAuthoritySetV2(message, true);
      return;
    }
    installAuthorityV1(message, true);
  });

  process.on("disconnect", () => {
    liveAuthoritiesV1 = new Map();
  });

  if (typeof process.send === "function") {
    try {
      process.send({
        schema: VOID_PUBLIC_BOOTSTRAP_AUTHORITY_CHILD_SCHEMA_V1,
        type: "ready",
      });
    } catch {
      liveAuthoritiesV1 = new Map();
    }
  }
}
