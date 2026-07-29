import { createHash, timingSafeEqual } from "node:crypto";
import { mkdirSync, openSync, closeSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const VOID_TOR_ONION_TRANSPORT_MARKER = "VOID_TOR_ONION_TRANSPORT_V1";
export const VOID_TOR_DESCRIPTOR_PATHS = Object.freeze([
  "/.well-known/void-tor-onion-transport-v1.json",
  "/public-node/transports/tor-v1.json",
]);

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const BASE32_LOOKUP = new Map(
  [...BASE32_ALPHABET].map((character, index) => [character, index]),
);
const ONION_CHECKSUM_PREFIX = Buffer.from(".onion checksum", "ascii");
const ONION_V3_VERSION = 3;

function assertPort(value, label) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must be an integer from 1 through 65535`);
  }
  return port;
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("generated_at must be a valid timestamp");
  }
  return date.toISOString();
}

export function decodeBase32NoPadding(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) throw new Error("base32 value is empty");

  const bytes = [];
  let accumulator = 0;
  let bits = 0;

  for (const character of text) {
    const decoded = BASE32_LOOKUP.get(character);
    if (decoded === undefined) {
      throw new Error(`invalid base32 character: ${character}`);
    }
    accumulator = accumulator * 32 + decoded;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      const divisor = 2 ** bits;
      bytes.push(Math.floor(accumulator / divisor) & 0xff);
      accumulator %= divisor;
    }
  }

  if (bits > 0 && accumulator !== 0) {
    throw new Error("non-zero base32 padding bits");
  }

  return Buffer.from(bytes);
}

export function encodeBase32NoPadding(value) {
  const bytes = Buffer.from(value);
  let output = "";
  let accumulator = 0;
  let bits = 0;

  for (const byte of bytes) {
    accumulator = accumulator * 256 + byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      const divisor = 2 ** bits;
      output += BASE32_ALPHABET[Math.floor(accumulator / divisor) & 31];
      accumulator %= divisor;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(accumulator * (2 ** (5 - bits))) & 31];
  }

  return output;
}

function checksumForPublicKey(publicKey) {
  return createHash("sha3-256")
    .update(ONION_CHECKSUM_PREFIX)
    .update(publicKey)
    .update(Buffer.from([ONION_V3_VERSION]))
    .digest()
    .subarray(0, 2);
}

export function encodeV3OnionHostname(publicKeyValue) {
  const publicKey = Buffer.from(publicKeyValue);
  if (publicKey.length !== 32) {
    throw new Error("v3 onion public key must be exactly 32 bytes");
  }
  const payload = Buffer.concat([
    publicKey,
    checksumForPublicKey(publicKey),
    Buffer.from([ONION_V3_VERSION]),
  ]);
  return `${encodeBase32NoPadding(payload)}.onion`;
}

export function validateV3OnionHostname(value) {
  const hostname = String(value || "").trim().toLowerCase();
  if (!/^[a-z2-7]{56}\.onion$/.test(hostname)) {
    throw new Error("onion hostname must be a 56-character v3 address");
  }

  const payload = decodeBase32NoPadding(hostname.slice(0, -6));
  if (payload.length !== 35) {
    throw new Error("decoded v3 onion address must be 35 bytes");
  }

  const publicKey = payload.subarray(0, 32);
  const checksum = payload.subarray(32, 34);
  const version = payload[34];
  if (version !== ONION_V3_VERSION) {
    throw new Error(`unsupported onion service version: ${version}`);
  }

  const expectedChecksum = checksumForPublicKey(publicKey);
  if (!timingSafeEqual(checksum, expectedChecksum)) {
    throw new Error("v3 onion checksum mismatch");
  }

  return hostname;
}

export function buildVoidTorDescriptorV1({
  onionHostname,
  localPort = 18088,
  virtualPort = 80,
  generatedAt = new Date(),
  status = "active",
} = {}) {
  const hostname = validateV3OnionHostname(onionHostname);
  const normalizedLocalPort = assertPort(localPort, "local_port");
  const normalizedVirtualPort = assertPort(virtualPort, "virtual_port");
  if (!new Set(["active", "planned", "unavailable"]).has(status)) {
    throw new Error("status must be active, planned, or unavailable");
  }

  return {
    marker: VOID_TOR_ONION_TRANSPORT_MARKER,
    version: 1,
    status,
    generated_at: normalizeTimestamp(generatedAt),
    transport: {
      protocol: "tor-v3",
      uri: `http://${hostname}`,
      onion_hostname: hostname,
      virtual_port: normalizedVirtualPort,
      address_role: "transport-endpoint",
    },
    surface: {
      id: "void-public-node-static-read-only-v1",
      methods: ["GET", "HEAD"],
      descriptor_paths: [...VOID_TOR_DESCRIPTOR_PATHS],
      local_target: `http://127.0.0.1:${normalizedLocalPort}`,
    },
    identity: {
      canonical_void_node_identity: false,
      signed_void_node_binding: false,
      tor_self_authentication: true,
      binding_status: "operator-local-unbound-v1",
    },
    authority: {
      read_only: true,
      transaction_submission: false,
      p2p_listener: false,
      mcp_listener: false,
      wallet_or_signer_access: false,
      work_credit_write: false,
      void_settlement: false,
      node_runtime_mutation: false,
      operator_control: false,
    },
  };
}

export function writeJsonAtomic(pathValue, value, mode = 0o600) {
  const outputPath = resolve(pathValue);
  const parent = dirname(outputPath);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  const body = `${JSON.stringify(value, null, 2)}\n`;
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, "wx", mode);
    writeFileSync(descriptor, body, { encoding: "utf8" });
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    rmSync(temporaryPath, { force: true });
    throw error;
  }
  return outputPath;
}
