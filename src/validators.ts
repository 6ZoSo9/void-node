// src/validators.ts

const LOOSE = process.env.VALIDATION_LOOSE === "1";

/** overall JSON size cap (bytes) to avoid pathological messages */
const MAX_JSON_BYTES = Number(process.env.MAX_JSON_BYTES || 1_000_000); // 1 MB default

type V = { ok: true } | { ok: false; error: string };
const ok = (): V => ({ ok: true });
const bad = (e: string): V => ({ ok: false, error: e });

/* ------------------------- hex helpers ------------------------- */

const RX_HEX_BARE = /^[0-9a-f]+$/i;

function isBareHex(s: unknown, lenChars?: number) {
  if (typeof s !== "string") return false;
  if (!RX_HEX_BARE.test(s)) return false;
  if (lenChars !== undefined && s.length !== lenChars) return false;
  return true;
}

function is0xHex(s: unknown, lenChars?: number) {
  if (typeof s !== "string") return false;
  if (!s.startsWith("0x")) return false;
  const rest = s.slice(2);
  if (!RX_HEX_BARE.test(rest)) return false;
  if (lenChars !== undefined && rest.length !== lenChars) return false;
  return true;
}

/** Accepts either bare or 0x-prefixed hex; optional byteLen constraint. */
function isHexEither(s: unknown, byteLen?: number) {
  const charLen = byteLen !== undefined ? byteLen * 2 : undefined;
  return isBareHex(s, charLen) || is0xHex(s, charLen);
}

/** Utility for defensive JSON parsing with a size cap */
function safeParseJSON(jsonStr: string): { ok: true; value: any } | { ok: false; error: string } {
  if (typeof jsonStr !== "string") return { ok: false, error: "not string" };
  // quick byte-length guard
  const bytes = Buffer.byteLength(jsonStr, "utf8");
  if (bytes > MAX_JSON_BYTES) return { ok: false, error: "payload too large" };
  try {
    return { ok: true, value: JSON.parse(jsonStr) };
  } catch {
    return { ok: false, error: "not JSON" };
  }
}

/* -------------------------- validators ------------------------- */

function validateHello(msg: string): V {
  if (typeof msg !== "string") return bad("must be string");
  if (msg.length > 1024) return bad("too long");
  return ok();
}

/**
 * TX validator aligned with our node (mempool + pubsub):
 * - require: hash (32 bytes hex; 0x or bare), body (object)
 * - optional: from/to (20 bytes hex), nonce (>=0), sig (65 bytes hex unless LOOSE)
 */
function validateTx(jsonStr: string): V {
  const parsed = safeParseJSON(jsonStr);
  if (!parsed.ok) return parsed;
  const o: any = parsed.value;

  if (typeof o !== "object" || o === null) return bad("not object");

  // required
  if (!isHexEither(o.hash, 32)) return bad("hash must be 32-byte hex (0x/bare)");
  if (typeof o.body !== "object" || o.body === null || Array.isArray(o.body)) {
    return bad("body must be an object");
  }

  // optional
  if (o.from !== undefined && !isHexEither(o.from, 20)) return bad("from must be 20-byte hex");
  if (o.to !== undefined && !isHexEither(o.to, 20)) return bad("to must be 20-byte hex");
  if (o.nonce !== undefined && (typeof o.nonce !== "number" || !Number.isFinite(o.nonce) || o.nonce < 0)) {
    return bad("nonce must be number >= 0");
  }
  if (o.sig !== undefined) {
    if (LOOSE) {
      if (typeof o.sig !== "string" || o.sig.length === 0) return bad("sig must be non-empty string");
    } else {
      // 65 bytes (130 hex chars) typical for ECDSA; our core signs headers with Ed25519 (64B),
      // but tx sig format is not enforced by node_core, so keep 65B here for compatibility.
      const okSig = isHexEither(o.sig, 65);
      if (!okSig) return bad("sig must be 65-byte hex (0x/bare)");
    }
  }

  return ok();
}

/**
 * HTTP announce: { id: string, http: "http(s)://..." }
 */
function validateHttpAnnounce(jsonStr: string): V {
  const parsed = safeParseJSON(jsonStr);
  if (!parsed.ok) return parsed;
  const o: any = parsed.value;

  if (typeof o !== "object" || o === null) return bad("not object");
  const id = String(o.id || "").trim();
  const http = String(o.http || "").trim();
  if (!id) return bad("missing id");
  if (!/^https?:\/\/.+/i.test(http)) return bad("bad http");
  if (http.length > 2048) return bad("http too long");
  return ok();
}

/**
 * Block header broadcast validator (as used in pubsub):
 * { number, parentHash, txRoot, blobRoot, timestamp, proposer?, sig? }
 */
function validateBlockHeader(jsonStr: string): V {
  const parsed = safeParseJSON(jsonStr);
  if (!parsed.ok) return parsed;
  const o: any = parsed.value;

  if (typeof o !== "object" || o === null) return bad("not object");

  const numOk = Number.isInteger(o.number) && o.number >= 0;
  if (!numOk) return bad("number must be integer >= 0");

  if (!isHexEither(o.parentHash, 32)) return bad("parentHash must be 32-byte hex");
  if (!isHexEither(o.txRoot, 32)) return bad("txRoot must be 32-byte hex");
  if (!isHexEither(o.blobRoot, 32)) return bad("blobRoot must be 32-byte hex");

  const tsOk = typeof o.timestamp === "number" && Number.isFinite(o.timestamp) && o.timestamp > 0;
  if (!tsOk) return bad("timestamp must be a positive number");

  if (o.proposer !== undefined) {
    const prop = String(o.proposer || "").trim();
    if (!prop) return bad("proposer, if present, must be non-empty");
  }

  if (o.sig !== undefined && !LOOSE) {
    // For our signed headers we use Ed25519 (64B). Accept 64B in strict mode.
    if (!isHexEither(o.sig, 64)) return bad("sig must be 64-byte hex");
  } else if (o.sig !== undefined && LOOSE) {
    if (typeof o.sig !== "string" || o.sig.length === 0) return bad("sig must be string");
  }

  return ok();
}

/**
 * Blob announcement validator:
 * { cid: hex(32B), size: number >= 0 }
 * Our CIDs are sha256 hex (32 bytes => 64 hex chars).
 */
function validateBlobAnnounce(jsonStr: string): V {
  const parsed = safeParseJSON(jsonStr);
  if (!parsed.ok) return parsed;
  const o: any = parsed.value;

  if (typeof o !== "object" || o === null) return bad("not object");
  if (!isHexEither(o.cid, 32)) return bad("cid must be 32-byte hex (sha256)");
  if (typeof o.size !== "number" || !Number.isFinite(o.size) || o.size < 0) {
    return bad("size must be number >= 0");
  }
  return ok();
}

/* -------------------------- registry -------------------------- */

const validators: Record<string, (msg: string) => V> = {
  "void/hello": validateHello,
  "void/tx": validateTx,
  "void/http": validateHttpAnnounce,
  "void/block": validateBlockHeader,
  "void/blob.announce": validateBlobAnnounce,
};

export function validateTopic(topic: string, msg: string): V {
  const v = validators[topic];
  return v ? v(msg) : ok();
}

export function hasValidator(topic: string): boolean {
  return Object.prototype.hasOwnProperty.call(validators, topic);
}

export function listTopics(): string[] {
  return Object.keys(validators);
}

