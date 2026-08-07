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
