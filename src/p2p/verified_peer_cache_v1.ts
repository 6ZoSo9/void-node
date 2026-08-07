// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { canonicalPeerAddress } from "../types/p2p.js";

export const VOID_P2P_VERIFIED_PEER_CACHE_VERSION_V1 = 1;
export const VOID_P2P_VERIFIED_PEER_CACHE_MAX_PEERS_V1 = 128;
export const VOID_P2P_VERIFIED_PEER_CACHE_MAX_ADDRS_PER_PEER_V1 = 8;
export const VOID_P2P_VERIFIED_PEER_CACHE_MAX_BYTES_V1 = 256 * 1024;
export const VOID_P2P_VERIFIED_PEER_CACHE_TTL_MS_V1 = 30 * 24 * 60 * 60 * 1000;
export const VOID_P2P_VERIFIED_PEER_CACHE_FUTURE_SKEW_MS_V1 = 5 * 60 * 1000;

const NODE_ID_RE = /^[0-9a-f]{32}$/;

export type VoidVerifiedPeerRecordV1 = Readonly<{
  node_id: string;
  addresses: readonly string[];
  last_authenticated_at_ms: number;
}>;

export type VoidVerifiedPeerCacheLoadV1 = Readonly<{
  valid: boolean;
  records: readonly VoidVerifiedPeerRecordV1[];
  reason?: string;
}>;

export function voidVerifiedPeerCachePathV1(baseDir: string): string {
  return path.join(baseDir, "p2p", "verified-peers-v1.json");
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, i) => key === wanted[i]);
}

function strictCanonicalAddresses(raw: unknown): readonly string[] | undefined {
  if (
    !Array.isArray(raw) ||
    raw.length < 1 ||
    raw.length > VOID_P2P_VERIFIED_PEER_CACHE_MAX_ADDRS_PER_PEER_V1
  ) {
    return;
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") return;
    const canonical = canonicalPeerAddress(value);
    if (!canonical || canonical !== value || seen.has(canonical)) return;
    seen.add(canonical);
    out.push(canonical);
  }
  return Object.freeze(out);
}

function parseRecord(
  raw: unknown,
  nowMs: number,
): VoidVerifiedPeerRecordV1 | "stale" | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const value = raw as Record<string, unknown>;
  if (!exactKeys(value, ["node_id", "addresses", "last_authenticated_at_ms"])) return;
  if (typeof value.node_id !== "string" || !NODE_ID_RE.test(value.node_id)) return;

  const addresses = strictCanonicalAddresses(value.addresses);
  if (!addresses) return;

  const ts = value.last_authenticated_at_ms;
  if (!Number.isSafeInteger(ts) || Number(ts) < 0) return;
  const timestamp = Number(ts);
  if (timestamp > nowMs + VOID_P2P_VERIFIED_PEER_CACHE_FUTURE_SKEW_MS_V1) return;
  if (nowMs - timestamp > VOID_P2P_VERIFIED_PEER_CACHE_TTL_MS_V1) return "stale";

  return Object.freeze({
    node_id: value.node_id,
    addresses,
    last_authenticated_at_ms: timestamp,
  });
}

export function loadVoidVerifiedPeerCacheV1(
  filePath: string,
  nowMs = Date.now(),
): VoidVerifiedPeerCacheLoadV1 {
  try {
    rejectSymlinkedPathComponents(path.dirname(filePath));
    if (!fs.existsSync(filePath)) {
      return Object.freeze({ valid: true, records: Object.freeze([]) });
    }

    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return Object.freeze({ valid: false, records: Object.freeze([]), reason: "cache path is not a regular file" });
    }
    if (stat.size < 2 || stat.size > VOID_P2P_VERIFIED_PEER_CACHE_MAX_BYTES_V1) {
      return Object.freeze({ valid: false, records: Object.freeze([]), reason: "cache size out of bounds" });
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Object.freeze({ valid: false, records: Object.freeze([]), reason: "cache document is not an object" });
    }
    const doc = parsed as Record<string, unknown>;
    if (!exactKeys(doc, ["version", "peers"]) || doc.version !== VOID_P2P_VERIFIED_PEER_CACHE_VERSION_V1) {
      return Object.freeze({ valid: false, records: Object.freeze([]), reason: "cache schema/version mismatch" });
    }
    if (!Array.isArray(doc.peers) || doc.peers.length > VOID_P2P_VERIFIED_PEER_CACHE_MAX_PEERS_V1) {
      return Object.freeze({ valid: false, records: Object.freeze([]), reason: "cache peer count out of bounds" });
    }

    const nodeIds = new Set<string>();
    const addresses = new Set<string>();
    const records: VoidVerifiedPeerRecordV1[] = [];

    for (const rawRecord of doc.peers) {
      const record = parseRecord(rawRecord, nowMs);
      if (record === "stale") continue;
      if (!record) {
        return Object.freeze({ valid: false, records: Object.freeze([]), reason: "invalid cache peer record" });
      }
      if (nodeIds.has(record.node_id)) {
        return Object.freeze({ valid: false, records: Object.freeze([]), reason: "duplicate cached node id" });
      }
      for (const address of record.addresses) {
        if (addresses.has(address)) {
          return Object.freeze({ valid: false, records: Object.freeze([]), reason: "ambiguous cached address ownership" });
        }
        addresses.add(address);
      }
      nodeIds.add(record.node_id);
      records.push(record);
    }

    records.sort((a, b) => b.last_authenticated_at_ms - a.last_authenticated_at_ms || a.node_id.localeCompare(b.node_id));
    return Object.freeze({ valid: true, records: Object.freeze(records) });
  } catch (error) {
    return Object.freeze({
      valid: false,
      records: Object.freeze([]),
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

function rejectSymlinkedPathComponents(targetPath: string): void {
  const absolute = path.resolve(targetPath);
  const parsed = path.parse(absolute);
  const relative = absolute.slice(parsed.root.length);
  let current = parsed.root;

  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`symlinked cache path component rejected: ${current}`);
    }
  }
}

function ensureSafeCacheDirectory(dir: string): void {
  rejectSymlinkedPathComponents(dir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  rejectSymlinkedPathComponents(dir);
  const stat = fs.lstatSync(dir);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("cache directory is not a regular directory");
  }
  fs.chmodSync(dir, 0o700);
}

export function writeVoidVerifiedPeerCacheV1(
  filePath: string,
  records: readonly VoidVerifiedPeerRecordV1[],
  nowMs = Date.now(),
): void {
  if (records.length > VOID_P2P_VERIFIED_PEER_CACHE_MAX_PEERS_V1) {
    throw new Error("too many verified peer records");
  }

  const document = {
    version: VOID_P2P_VERIFIED_PEER_CACHE_VERSION_V1,
    peers: records.map((record) => ({
      node_id: record.node_id,
      addresses: [...record.addresses],
      last_authenticated_at_ms: record.last_authenticated_at_ms,
    })),
  };

  const encoded = JSON.stringify(document, null, 2) + "\n";
  if (Buffer.byteLength(encoded) > VOID_P2P_VERIFIED_PEER_CACHE_MAX_BYTES_V1) {
    throw new Error("verified peer cache would exceed size limit");
  }

  const parent = path.dirname(filePath);
  ensureSafeCacheDirectory(parent);
  if (fs.existsSync(filePath)) {
    const existing = fs.lstatSync(filePath);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error("refusing to replace non-regular cache file");
    }
  }

  // Validate the exact document before replacing the canonical file.
  const probePath = path.join(
    parent,
    `.verified-peers-v1.validate.${process.pid}.${crypto.randomBytes(6).toString("hex")}`,
  );
  fs.writeFileSync(probePath, encoded, { flag: "wx", mode: 0o600 });
  try {
    const checked = loadVoidVerifiedPeerCacheV1(probePath, nowMs);
    if (!checked.valid || checked.records.length !== records.length) {
      throw new Error(`refusing invalid verified peer cache write: ${checked.reason || "record mismatch"}`);
    }
  } finally {
    fs.rmSync(probePath, { force: true });
  }

  const tempPath = path.join(
    parent,
    `.verified-peers-v1.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`,
  );
  const fd = fs.openSync(tempPath, "wx", 0o600);
  try {
    fs.writeFileSync(fd, encoded, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempPath, filePath);
  fs.chmodSync(filePath, 0o600);

  // Persist the directory entry as well as the file contents on POSIX filesystems.
  try {
    const dirFd = fs.openSync(parent, fs.constants.O_RDONLY);
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } catch {
    // Atomic rename is still the safety boundary; unsupported directory fsync is non-fatal.
  }
}

export function rememberVoidAuthenticatedPeerV1(
  filePath: string,
  selfNodeId: string,
  peerNodeId: string,
  rawAddresses: readonly string[],
  nowMs = Date.now(),
): VoidVerifiedPeerCacheLoadV1 {
  if (!NODE_ID_RE.test(selfNodeId) || !NODE_ID_RE.test(peerNodeId) || peerNodeId === selfNodeId) {
    throw new Error("invalid self/peer node id for verified cache");
  }

  const addresses = strictCanonicalAddresses(rawAddresses);
  if (!addresses) throw new Error("authenticated peer has no valid canonical listen addresses");

  const loaded = loadVoidVerifiedPeerCacheV1(filePath, nowMs);
  if (!loaded.valid) {
    throw new Error(`existing verified peer cache is invalid: ${loaded.reason || "unknown"}`);
  }

  const claimed = new Set(addresses);
  for (const record of loaded.records) {
    if (record.node_id === peerNodeId) continue;
    for (const address of record.addresses) {
      if (claimed.has(address)) {
        throw new Error(
          `authenticated address is already pinned to another node id: ${address}`,
        );
      }
    }
  }

  const next: VoidVerifiedPeerRecordV1[] = [];
  next.push(Object.freeze({
    node_id: peerNodeId,
    addresses,
    last_authenticated_at_ms: nowMs,
  }));

  for (const record of loaded.records) {
    if (record.node_id === peerNodeId) continue;
    next.push(record);
  }

  next.sort((a, b) => b.last_authenticated_at_ms - a.last_authenticated_at_ms || a.node_id.localeCompare(b.node_id));
  const bounded = next.slice(0, VOID_P2P_VERIFIED_PEER_CACHE_MAX_PEERS_V1);
  writeVoidVerifiedPeerCacheV1(filePath, bounded, nowMs);
  return loadVoidVerifiedPeerCacheV1(filePath, nowMs);
}

export function voidVerifiedPeerDialTargetsV1(
  records: readonly VoidVerifiedPeerRecordV1[],
  selfNodeId: string,
): ReadonlyArray<Readonly<{ node_id: string; address: string }>> {
  const out: Array<{ node_id: string; address: string }> = [];
  for (const record of records) {
    if (record.node_id === selfNodeId) continue;
    for (const address of record.addresses) {
      out.push(Object.freeze({ node_id: record.node_id, address }));
    }
  }
  return Object.freeze(out);
}
