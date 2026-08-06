import crypto from "node:crypto";
import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";

export const QUALIFICATION_SCHEMA = "void_public_seed_qualification_v1";
export const BOOTSTRAP_SCHEMA = "void_public_bootstrap_v1";
export const NETWORK = "VOID Network";
export const CHAIN_ID = 2050;
export const DEFAULT_MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
export const DEFAULT_MIN_SAMPLES = 3;
export const DEFAULT_MIN_SPAN_MS = 60_000;
export const DEFAULT_MAX_RECEIPT_AGE_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_MANIFEST_VALIDITY_MS = 72 * 60 * 60 * 1000;

const TEMPORARY_HOST_SUFFIXES = Object.freeze([
  ".trycloudflare.com",
  ".ngrok-free.app",
  ".ngrok.io",
  ".loca.lt",
  ".serveo.net",
  ".localhost.run",
  ".tunnelmole.net",
  ".pinggy.link",
  ".devtunnels.ms",
]);

const NON_PUBLIC_V4 = new net.BlockList();
const NON_PUBLIC_V6 = new net.BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]) {
  NON_PUBLIC_V4.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
]) {
  NON_PUBLIC_V6.addSubnet(network, prefix, "ipv6");
}

export function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

export function assertSafeInteger(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be an integer from ${min} through ${max}`);
  }
  return number;
}

export function normalizeHostname(hostname) {
  return String(hostname).trim().toLowerCase().replace(/^\[|\]$/g, "");
}

export function isTemporarySeedHostname(hostname) {
  const host = normalizeHostname(hostname);
  return TEMPORARY_HOST_SUFFIXES.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  );
}

export function isPublicIpAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return !NON_PUBLIC_V4.check(address, "ipv4");
  if (family === 6) return !NON_PUBLIC_V6.check(address, "ipv6");
  return false;
}

export function normalizePublicSeedBase(
  raw,
  { allowLoopbackFixture = false, allowTemporaryFixture = false } = {},
) {
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    throw new Error("seed base is not a valid URL");
  }

  if (url.username || url.password) throw new Error("seed base must not contain credentials");
  if (url.search || url.hash) throw new Error("seed base must not contain query or fragment");
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("seed base must not contain a path");
  }

  const hostname = normalizeHostname(url.hostname);
  const loopbackFixture =
    allowLoopbackFixture &&
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost", "::1"].includes(hostname);

  if (!loopbackFixture && url.protocol !== "https:") {
    throw new Error("stable public seed must use HTTPS");
  }
  if (!loopbackFixture) {
    if (net.isIP(hostname)) throw new Error("stable public seed must use a DNS hostname");
    if (!hostname.includes(".")) throw new Error("stable public seed hostname must be fully qualified");
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".home") ||
      hostname.endsWith(".lan")
    ) {
      throw new Error("stable public seed hostname is private or local");
    }
    if (!allowTemporaryFixture && isTemporarySeedHostname(hostname)) {
      throw new Error("temporary tunnel provider hostnames cannot qualify as stable seeds");
    }
  }

  return Object.freeze({
    base: url.origin,
    hostname,
    loopback_fixture: loopbackFixture,
  });
}

export async function resolvePublicDns(
  hostname,
  { lookup = dns.promises.lookup, allowLoopbackFixture = false } = {},
) {
  const host = normalizeHostname(hostname);
  if (allowLoopbackFixture && ["127.0.0.1", "localhost", "::1"].includes(host)) {
    return [host === "localhost" ? "127.0.0.1" : host];
  }
  if (net.isIP(host)) throw new Error("public DNS resolution requires a hostname");

  const records = await lookup(host, { all: true, verbatim: true });
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("seed hostname has no address records");
  }
  if (records.length > 16) throw new Error("seed hostname resolves to too many addresses");

  const addresses = [...new Set(records.map((record) => String(record.address)))].sort();
  for (const address of addresses) {
    if (!isPublicIpAddress(address)) {
      throw new Error(`seed hostname resolves to non-public address ${address}`);
    }
  }
  return addresses;
}

function normalizeForCanonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON cannot contain non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalizeForCanonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeForCanonicalJson(value[key])]),
    );
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(normalizeForCanonicalJson(value));
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function objectWithId(prefix, value, idField) {
  const body = structuredClone(value);
  delete body[idField];
  return { ...body, [idField]: `${prefix}${sha256Hex(canonicalJson(body))}` };
}

export function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} did not return valid JSON`);
  }
}

export function sortedUnion(left, right) {
  return [...new Set([...left, ...right])].sort();
}

export function writeJsonAtomic(path, value) {
  const target = String(path);
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  fs.renameSync(temporary, target);
}

export function readJsonFile(path, label = "JSON file") {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${label} could not be read: ${error.message}`);
  }
  return parsed;
}
