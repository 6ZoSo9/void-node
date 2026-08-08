// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/p2p/p2p.ts
/**
 * Small helpers shared by our P2P surfaces (peer-address parsing, bootstrap
 * normalization, http inference, etc.).
 */

import * as net from "node:net";

export type ParsedPeerAddress = Readonly<{
  host: string;
  port: number;
  family: 0 | 4 | 6;
  canonical: string;
}>;

const MAX_PEER_ADDRESS_CHARS = 512;
const CONTROL_OR_SPACE = /[\u0000-\u0020\u007f]/;

const NON_PUBLIC_LEARNED_V4_RANGES: ReadonlyArray<readonly [string, number]> = [
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
];

const NON_PUBLIC_LEARNED_V6_RANGES: ReadonlyArray<readonly [string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

const NON_PUBLIC_LEARNED_V4 = new net.BlockList();
for (const [network, prefix] of NON_PUBLIC_LEARNED_V4_RANGES) {
  NON_PUBLIC_LEARNED_V4.addSubnet(network, prefix, "ipv4");
}

const NON_PUBLIC_LEARNED_V6 = new net.BlockList();
for (const [network, prefix] of NON_PUBLIC_LEARNED_V6_RANGES) {
  NON_PUBLIC_LEARNED_V6.addSubnet(network, prefix, "ipv6");
}


function normalizeDnsHost(raw: string): string | undefined {
  if (!raw || raw.length > 253) return;
  if (raw.startsWith(".") || raw.endsWith(".") || raw.includes("..")) return;
  const labels = raw.split(".");
  for (const label of labels) {
    if (
      label.length < 1 ||
      label.length > 63 ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)
    ) {
      return;
    }
  }

  // WHATWG host parsing follows the legacy IPv4-number grammar used by the
  // Node resolver path. Reject DNS-form strings that become IPv4 literals
  // (for example 2130706433, 127.1, 0177.0.0.1, or 0x7f000001) so one network
  // address cannot acquire multiple accepted peer-address identities.
  try {
    const parsedHostname = new URL(`http://${raw}/`).hostname;
    if (net.isIP(parsedHostname) === 4) return;
    if (parsedHostname.toLowerCase() !== raw.toLowerCase()) return;
  } catch {
    return;
  }

  return raw.toLowerCase();
}

function normalizeIpv6(raw: string): string | undefined {
  if (!raw || raw.includes("%") || net.isIP(raw) !== 6) return;
  try {
    const hostname = new URL(`http://[${raw}]/`).hostname;
    if (!hostname.startsWith("[") || !hostname.endsWith("]")) return;
    return hostname.slice(1, -1).toLowerCase();
  } catch {
    return;
  }
}

/**
 * Canonical VOID raw-TCP peer-address parser.
 *
 * v1 accepted forms:
 *   - 192.0.2.10:4700
 *   - peer.example:4700
 *   - [2001:db8::10]:4700
 *
 * IPv6 zone identifiers are intentionally rejected in v1 because they are
 * interface-local and are not portable peer advertisements.
 */
export function parsePeerAddress(
  raw?: string | null,
): ParsedPeerAddress | undefined {
  if (typeof raw !== "string") return;
  if (
    raw.length < 3 ||
    raw.length > MAX_PEER_ADDRESS_CHARS ||
    raw !== raw.trim() ||
    CONTROL_OR_SPACE.test(raw) ||
    /[/?#@]/.test(raw)
  ) {
    return;
  }

  let host = "";
  let portRaw = "";
  let family: 0 | 4 | 6 = 0;

  if (raw.startsWith("[")) {
    const close = raw.indexOf("]");
    if (
      close < 2 ||
      raw.indexOf("]", close + 1) !== -1 ||
      raw[close + 1] !== ":"
    ) {
      return;
    }
    const inputHost = raw.slice(1, close);
    if (raw.slice(close + 2).includes(":")) return;
    const normalized = normalizeIpv6(inputHost);
    if (!normalized) return;
    host = normalized;
    family = 6;
    portRaw = raw.slice(close + 2);
  } else {
    const firstColon = raw.indexOf(":");
    const lastColon = raw.lastIndexOf(":");
    if (firstColon <= 0 || firstColon !== lastColon) {
      return;
    }

    const inputHost = raw.slice(0, firstColon);
    portRaw = raw.slice(firstColon + 1);
    const detected = net.isIP(inputHost);

    if (detected === 6) return;
    if (detected === 4) {
      host = inputHost;
      family = 4;
    } else {
      const normalized = normalizeDnsHost(inputHost);
      if (!normalized) return;
      host = normalized;
      family = 0;
    }
  }

  if (!/^\d{1,5}$/.test(portRaw)) return;
  const port = Number(portRaw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) return;

  const canonical =
    family === 6 ? `[${host}]:${port}` : `${host}:${port}`;

  return Object.freeze({ host, port, family, canonical });
}

export function canonicalPeerAddress(
  raw?: string | null,
): string | undefined {
  return parsePeerAddress(raw)?.canonical;
}

export function formatPeerAddress(
  rawHost: string,
  rawPort: number,
): string | undefined {
  const host = String(rawHost || "").trim();
  const port = Number(rawPort);
  if (!host || !Number.isSafeInteger(port)) return;
  return parsePeerAddress(
    net.isIP(host) === 6 ? `[${host}]:${port}` : `${host}:${port}`,
  )?.canonical;
}

export function canonicalizePeerAddressList(
  values: unknown,
  maxEntries = 64,
): string[] {
  if (!Array.isArray(values)) return [];
  const limit = Math.max(0, Math.min(256, Math.floor(maxEntries) || 0));
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values.slice(0, limit)) {
    if (typeof raw !== "string") continue;
    const canonical = canonicalPeerAddress(raw);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out;
}


/**
 * Decide whether an address learned indirectly through a PEERS advertisement
 * is eligible for bounded public discovery.
 *
 * Third-party PEERS entries are not identity-bound. V1 therefore accepts only
 * canonical globally routable numeric IP literals. DNS names are intentionally
 * excluded because resolving a third-party hostname before authentication
 * would let an authenticated sender steer the node toward arbitrary resolver
 * results. Explicit bootstrap entries and a peer's own authenticated,
 * transcript-bound listen addresses keep their existing behavior.
 */
export function isPublicLearnedPeerAddressV1(
  raw?: string | null,
): boolean {
  const parsed = parsePeerAddress(raw);
  if (!parsed || parsed.family === 0) return false;

  if (parsed.family === 4) {
    return !NON_PUBLIC_LEARNED_V4.check(parsed.host, "ipv4");
  }

  if (NON_PUBLIC_LEARNED_V6.check(parsed.host, "ipv6")) return false;

  // Keep indirect IPv6 admission narrow: globally routable 2000::/3 only.
  const firstHextet = Number.parseInt(parsed.host.split(":", 1)[0] || "0", 16);
  return Number.isInteger(firstHextet) &&
    firstHextet >= 0x2000 &&
    firstHextet <= 0x3fff;
}

/** Infer HTTP base from a P2P port in the 4700-4799 compatibility range. */
export function httpBaseFromP2P(addr?: string): string | undefined {
  const parsed = parsePeerAddress(addr);
  if (!parsed) return;
  if (parsed.port < 4700 || parsed.port > 4799) return;

  const httpPort = 4100 + (parsed.port - 4700);
  const urlHost =
    parsed.family === 6 ? `[${parsed.host}]` : parsed.host;
  return `http://${urlHost}:${httpPort}`;
}

/** Normalize and deduplicate bootstrap list from env string "a,b,c". */
export function parseBootstrap(s?: string | null): string[] {
  if (!s) return [];
  return canonicalizePeerAddressList(
    String(s).split(",").map((value) => value.trim()),
    64,
  );
}

/** Quick backoff curve (ms) with caps. */
export function nextBackoff(prev: number, min = 500, max = 15000): number {
  const p = Math.max(min, prev || min);
  return Math.min(p * 2, max);
}
