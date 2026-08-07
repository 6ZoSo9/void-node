// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as path from "node:path";
import * as net from "node:net";
import * as crypto from "node:crypto";

import { Mempool } from "./chain/mempool.js";
import { Block, computeRoots, blockHash, blockHeaderBytes, validateBlockForAppend } from "./chain/block.js";
import { cidForBytes } from "./util/cid.js";
import { ensureDir } from "./util/files.js";
import { SegStore } from "./chain/seg_store.js";
import { TxIndex } from "./chain/txindex.js";
import { ReceiptsStore } from "./chain/receipts.js";
import { buildKidxForJsonl } from "./util/kidx.js";
import {
  canonicalPeerAddress,
  canonicalizePeerAddressList,
  formatPeerAddress,
  httpBaseFromP2P,
  parseBootstrap,
  parsePeerAddress,
} from "./types/p2p.js";
import {
  VOID_P2P_AUTH_PROTOCOL_VERSION_V1,
  VOID_P2P_AUTH_TIMEOUT_MS_V1,
  VoidPeerAuthV1,
  VoidPeerHelloV1,
  buildVoidPeerAuthV1,
  newVoidPeerChallengeV1,
  normalizeVoidPeerHelloV1,
  verifyVoidPeerAuthV1,
} from "./p2p/auth_v1.js";
import {
  loadVoidVerifiedPeerCacheV1,
  rememberVoidAuthenticatedPeerV1,
  voidVerifiedPeerCachePathV1,
  voidVerifiedPeerDialTargetsV1,
  type VoidVerifiedPeerRecordV1,
} from "./p2p/verified_peer_cache_v1.js";
import {
  classifyVoidP2PReachabilityRuntimeV1,
  createVoidP2PReachabilityObservationV1,
  isVoidPublicDirectCandidateV1,
  isVoidReachabilityRequestIdV1,
  newVoidReachabilityRequestIdV1,
  normalizeVoidReachabilityFailureDomainV1,
  parseVoidReachabilityCandidateAddressV1,
  validateVoidP2PReachabilityObservationV1,
  type VoidP2PReachabilityObservationV1,
} from "./p2p/reachability_runtime_v1.js";

function recordSideEffectWriteFailure(scope: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

function recordMempoolBestEffortFailure(scope: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_MEMPOOL_BEST_EFFORT_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

function recordPeerHeadProbeFailure(scope: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_PEER_HEAD_PROBE_BEST_EFFORT_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

function recordImportHeadAdvanceBestEffortFailure(scope: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

function recordRemainingRuntimeBestEffortFailure(scope: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}


/** ---------- keypair shape we accept from loadKeypair() ---------- */
type KeypairShape = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
};

/** ---------- signing helpers (Node built-in ed25519) ---------- */
function signBytes(priv: crypto.KeyObject, bytes: Uint8Array): string {
  return crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
}
function verifyBytes(pub: crypto.KeyObject, bytes: Uint8Array, sigHex: string): boolean {
  try {
    return crypto.verify(null, Buffer.from(bytes), pub, Buffer.from(sigHex, "hex"));
  } catch {
    return false;
  }
}
function safeImportPublicKey(pem: string): crypto.KeyObject | null {
  try {
    return crypto.createPublicKey(pem);
  } catch {
    return null;
  }
}
function bytesToSign(topic: string, data: string, nonce: string): Uint8Array {
  return Buffer.from(JSON.stringify({ topic, data, nonce }));
}

function hasExactWireKeys(
  raw: unknown,
  expected: readonly string[],
): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const actual = Object.keys(raw as Record<string, unknown>).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length) return false;
  return actual.every((key, index) => key === wanted[index]);
}

/** ---------- wire / pubsub ---------- */
const MAX_MSG_BYTES = 64 * 1024;
const PROTO_VER = VOID_P2P_AUTH_PROTOCOL_VERSION_V1;

type Msg =
  | { type: "HELLO"; id: string; listen: string[]; proto: number; pubkey: string; challenge: string }
  | { type: "AUTH"; id: string; listen: string[]; proto: number; pubkey: string; challenge: string; self_challenge: string; sig: string }
  | { type: "SUB"; topic: string }
  | { type: "PUB"; topic: string; data: string; from: string; nonce: string; sig: string; pubkey: string }
  | { type: "PEERS"; addrs: string[] }
  | { type: "REACHABILITY_OBSERVATION"; observation: VoidP2PReachabilityObservationV1 }
  | { type: "REACHABILITY_DIALBACK_REQUEST"; request_id: string; candidate_address: string }
  | { type: "REACHABILITY_PROBE_OPEN"; request_id: string }
  | { type: "REACHABILITY_PROBE_COMPLETE"; request_id: string }
  | { type: "REACHABILITY_DIALBACK_RESULT"; request_id: string; observation: VoidP2PReachabilityObservationV1 };

function encode(m: Msg): Buffer {
  const body = Buffer.from(JSON.stringify(m));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

class Framer {
  private buf = Buffer.alloc(0);
  constructor(private onMsg: (m: Msg) => void, private onBad?: (e: Error) => void) {}
  feed(chunk: Buffer) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32BE(0);
      if (len > MAX_MSG_BYTES) {
        this.onBad?.(new Error(`frame too large: ${len}`));
        this.buf = Buffer.alloc(0);
        return;
      }
      if (this.buf.length < 4 + len) break;
      const body = this.buf.subarray(4, 4 + len);
      this.buf = this.buf.subarray(4 + len);
      try {
        this.onMsg(JSON.parse(body.toString("utf8")));
      } catch (e: any) {
        this.onBad?.(e);
      }
    }
  }
}

class PubSub {
  subs: Map<string, Set<string>> = new Map();
  subscribe(peerId: string, topic: string) {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(peerId);
  }
  subscribers(topic: string): Set<string> {
    return this.subs.get(topic) ?? new Set();
  }
}

type ReachabilityProbeContext = {
  role: "outgoing" | "incoming";
  requestId: string;
  controlPeerId: string;
  candidateAddress: string;
  subjectNodeId: string;
  startedAtMs: number;
  authenticatedRemoteId?: string;
};

type Peer = {
  id: string;
  socket: net.Socket;
  framer: Framer;
  addr: string;
  listens: string[];
  outbound: boolean;
  handshakeDone: boolean;
  localChallenge: string;
  remoteHello?: VoidPeerHelloV1;
  authTimer: NodeJS.Timeout | null;
  expectedNodeId?: string;
  reconnectAddr?: string;
  suppressReconnect: boolean;
  attachedAtMs: number;
  outboundSeenEmitted: boolean;
  probe?: ReachabilityProbeContext;
};

/** ================================================================= */
/**                               Node                                 */
/** ================================================================= */
type NodeOpts = {
  allowEmptyBlocks?: boolean;
  reachabilityTestAllowNonPublicProbe?: boolean;
};

export class Node {
  readonly id: string;
  readonly pubPEM: string;
  private priv: crypto.KeyObject;
  private pub: crypto.KeyObject;

  readonly listenAddrs: string[] = [];
  readonly peers: Map<string, Peer> = new Map();
  readonly pubsub = new PubSub();

  private readonly baseDir = process.env.DATA_DIR || "data";
  private readonly verifiedPeerCachePath = voidVerifiedPeerCachePathV1(this.baseDir);
  private verifiedPeerCacheRecords: VoidVerifiedPeerRecordV1[] = [];
  private cachedExpectedNodeByAddress = new Map<string, string>();
  private stopping = false;

  private readonly reachabilityFailureDomain =
    normalizeVoidReachabilityFailureDomainV1(
      process.env.VOID_P2P_REACHABILITY_FAILURE_DOMAIN,
    ) || "unclassified";
  private readonly reachabilityTestAllowNonPublicProbe: boolean;
  private readonly reachabilityObservations =
    new Map<string, VoidP2PReachabilityObservationV1>();
  private readonly pendingReachabilityDialbacks = new Map<
    string,
    {
      observerNodeId: string;
      candidateAddress: string;
      startedAtMs: number;
    }
  >();
  private readonly activeReachabilityProbes = new Set<string>();
  private readonly lastReachabilityProbeAt = new Map<string, number>();
  private readonly REACHABILITY_PROBE_COOLDOWN_MS = 30_000;
  private readonly REACHABILITY_MAX_ACTIVE_PROBES = 8;

  readonly txIndex = new TxIndex(path.join(this.baseDir, "index"));
  readonly receipts = new ReceiptsStore(path.join(this.baseDir, "receipts"), { shardSpan: 10_000 });

  private seen = new Set<string>();                 // pubsub message (topic:nonce) dedupe
  private seenTimestamps = new Map<string, number>();
  private readonly SEEN_TTL_MS = 5 * 60_000;

  private txSeen = new Map<string, number>();       // tx hash -> firstSeenMs (TTL GC below)
  private readonly TX_TTL_MS = 30 * 60_000;

  private dialing = new Set<string>();
  private knownAddrs = new Set<string>();
  private backoff = new Map<string, number>();
  private readonly MIN_BACKOFF = 500;
  private readonly MAX_BACKOFF = 15_000;

  private myTopics = new Set<string>();

  // --- blob replication state ---
  private peerHttp = new Map<string, string>(); // nodeId -> http base
  private blobFetchQ: { cid: string; providers: string[]; enqueuedAt: number }[] = [];
  private blobFetchRunning = false;

  readonly store = new SegStore(process.env.DATA_DIR || "data", {
    segmentMaxBytes: 128 * 1024 * 1024,
    sparseEvery: 512,
  });
  readonly mempool = new Mempool();
  private proposerTimer: NodeJS.Timeout | null = null;
  private blobsDir = path.join(this.baseDir, "blobs");

  private allowEmptyBlocks = false;

  // Single canonical constructor: sets keys and honors opts.allowEmptyBlocks
  constructor(public tcpPort: number, kp: KeypairShape, opts?: NodeOpts) {
    this.id = kp.nodeId;
    this.priv = kp.privateKey;
    this.pub = kp.publicKey;
    this.pubPEM = kp.pubPEM;
    this.allowEmptyBlocks = !!opts?.allowEmptyBlocks;
    this.reachabilityTestAllowNonPublicProbe =
      opts?.reachabilityTestAllowNonPublicProbe === true;
    ensureDir(this.blobsDir);
  }

  onHttpAnnounce?: (p: { id: string; http?: string; p2p?: string }) => void;
  onReachabilityObservation?: (event: {
    source:
      | "local_outbound_seen"
      | "local_dialback"
      | "remote_outbound_seen"
      | "remote_dialback_result";
    observation: VoidP2PReachabilityObservationV1;
  }) => void;
  onSealed?: (b: Block, sealMs: number) => void;    // metrics-friendly hook

  server = net.createServer((sock) => this.onIncoming(sock));

  /** Rebuild compact tx index from blocks. */
  async rebuildTxIndex(): Promise<{ ok: true; blocks: number; indexed: number }> {
    const idxDir = path.join(this.baseDir, "index");
    if (fs.existsSync(idxDir)) fs.rmSync(idxDir, { recursive: true, force: true });
    fs.mkdirSync(idxDir, { recursive: true });

    const head = this.store.loadHeadNumber();
    let indexed = 0;
    const BATCH = 2000;
    let batch: { h: string; n: number; o: number }[] = [];

    for (let n = 0; n <= head; n++) {
      const b = this.store.loadBlock(n);
      if (!b?.txs?.length) continue;
      for (let i = 0; i < b.txs.length; i++) {
        const tx = b.txs[i];
        if (tx?.hash) {
          batch.push({ h: tx.hash.toLowerCase(), n, o: i });
          indexed++;
          if (batch.length >= BATCH) {
            this.txIndex.putMany(batch);
            batch = [];
          }
        }
      }
    }
    if (batch.length) this.txIndex.putMany(batch);
    return { ok: true, blocks: head + 1, indexed };
  }

  /** lifecycle */
  async start() {
    this.stopping = false;
    // bind to loopback by default to avoid accidental multi-binding conflicts
    const bindHost =
      process.env.P2P_BIND_HOST ||
      process.env.VOID_P2P_BIND_HOST ||
      "0.0.0.0";

    const advertHost =
      process.env.P2P_ADVERTISE_HOST ||
      process.env.VOID_P2P_ADVERTISE_HOST ||
      (() => {
        const raw = String(process.env.VOID_LAN_IP || process.env.LAN_IP || "").trim();
        if (raw) return raw;
        try {
          const os = require("os");
          const ifaces = (os.networkInterfaces?.() || {}) as Record<string, Array<any> | undefined>;
          for (const arr of Object.values(ifaces) as Array<Array<any> | undefined>) {
            for (const info of (arr || [])) {
              if (!info) continue;
              if (info.family === "IPv4" && !info.internal && info.address && !String(info.address).startsWith("127.")) {
                return String(info.address);
              }
            }
          }
        } catch (err) {
          recordRemainingRuntimeBestEffortFailure("lan-ip-discovery", err);
        }
        return "127.0.0.1";
      })();

    await new Promise<void>((resolve) => this.server.listen(this.tcpPort, bindHost, resolve));
    const listenPort = (this.server.address() as net.AddressInfo).port;
    const addr = formatPeerAddress(advertHost, listenPort);
    if (!addr) {
      this.server.close();
      throw new Error(`invalid P2P advertise host: ${advertHost}`);
    }
    this.listenAddrs.push(addr);
    this.knownAddrs.add(addr);
    console.log(`[void-node] started TCP on ${addr}, id=${this.id}`);

    const bootstrapRaw = String(process.env.BOOTSTRAP_ADDRS || "").trim();
    const bootstrapAddrs = parseBootstrap(bootstrapRaw);
    if (bootstrapRaw && bootstrapAddrs.length === 0) {
      console.warn("[void-node] bootstrap list contained no valid peer addresses");
    }
    if (bootstrapAddrs.length) {
      console.log(`[void-node] bootstrap dial targets: ${bootstrapAddrs.join(", ")}`);
      for (const a of bootstrapAddrs) {
        if (a !== addr && this.shouldDial(a)) {
          setTimeout(() => {
            if (!this.stopping) this.connect(a);
          }, 250).unref?.();
        }
      }
    }

    // Verified cached peers are an independent introduction path. Cached
    // identity pins also apply when the same address appears in BOOTSTRAP_ADDRS.
    this.loadVerifiedPeerReconnects();

    // Default topic subscriptions used across the stack
    this.subscribe("void/tx");
    this.subscribe("void/http");
    this.subscribe("void/blob.announce");
    this.subscribe("void/block");

    // GC dedup tables
    setInterval(() => {
      const now = Date.now();
      for (const [k, ts] of this.seenTimestamps) {
        if (now - ts > this.SEEN_TTL_MS) {
          this.seenTimestamps.delete(k);
          this.seen.delete(k);
        }
      }
      for (const [h, ts] of this.txSeen) {
        if (now - ts > this.TX_TTL_MS) this.txSeen.delete(h);
      }
    }, 30_000).unref?.();
  }

  stop() {
    this.stopping = true;
    this.pendingReachabilityDialbacks.clear();
    this.activeReachabilityProbes.clear();
    for (const p of this.peers.values()) {
      p.suppressReconnect = true;
      p.socket.destroy();
    }
    this.server.close();
  }

  private rebuildVerifiedPeerIdentityIndex() {
    this.cachedExpectedNodeByAddress.clear();
    for (const record of this.verifiedPeerCacheRecords) {
      if (record.node_id === this.id) continue;
      for (const address of record.addresses) {
        this.cachedExpectedNodeByAddress.set(address, record.node_id);
      }
    }
  }

  private loadVerifiedPeerReconnects() {
    const loaded = loadVoidVerifiedPeerCacheV1(this.verifiedPeerCachePath);
    if (!loaded.valid) {
      this.verifiedPeerCacheRecords = [];
      this.rebuildVerifiedPeerIdentityIndex();
      console.warn("VOID_P2P_VERIFIED_PEER_CACHE_V1_REJECT", {
        path: this.verifiedPeerCachePath,
        reason: loaded.reason || "invalid verified peer cache",
      });
      return;
    }

    this.verifiedPeerCacheRecords = [...loaded.records];
    this.rebuildVerifiedPeerIdentityIndex();

    const targets = voidVerifiedPeerDialTargetsV1(loaded.records, this.id);
    let delayMs = 325;
    for (const target of targets) {
      this.knownAddrs.add(target.address);
      setTimeout(() => {
        if (!this.stopping) this.connect(target.address, target.node_id);
      }, delayMs).unref?.();
      delayMs = Math.min(delayMs + 25, 750);
    }
  }

  private rememberAuthenticatedPeer(peer: Peer) {
    if (!peer.handshakeDone || peer.id.startsWith("?-") || peer.listens.length === 0) return;
    try {
      const loaded = rememberVoidAuthenticatedPeerV1(
        this.verifiedPeerCachePath,
        this.id,
        peer.id,
        peer.listens,
      );
      if (!loaded.valid) {
        throw new Error(loaded.reason || "verified peer cache post-write validation failed");
      }
      this.verifiedPeerCacheRecords = [...loaded.records];
      this.rebuildVerifiedPeerIdentityIndex();
    } catch (error) {
      console.warn("VOID_P2P_VERIFIED_PEER_CACHE_V1_WRITE_FAILURE_VISIBLE", {
        peer_id: peer.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private scheduleVerifiedPeerReconnect(peer: Peer) {
    if (
      this.stopping ||
      peer.suppressReconnect ||
      !peer.handshakeDone ||
      peer.id.startsWith("?-")
    ) {
      return;
    }

    const address =
      peer.reconnectAddr && peer.listens.includes(peer.reconnectAddr)
        ? peer.reconnectAddr
        : peer.listens[0];
    if (!address) return;

    const current = this.backoff.get(address) ?? this.MIN_BACKOFF;
    const delayMs = Math.min(Math.max(current, this.MIN_BACKOFF), this.MAX_BACKOFF);
    const next = Math.min(delayMs * 2, this.MAX_BACKOFF);
    this.backoff.set(address, next);

    setTimeout(() => {
      if (!this.stopping) this.connect(address, peer.id);
    }, delayMs).unref?.();
  }


  private recordReachabilityObservation(
    raw: unknown,
    source:
      | "local_outbound_seen"
      | "local_dialback"
      | "remote_outbound_seen"
      | "remote_dialback_result",
  ): boolean {
    try {
      const validated = validateVoidP2PReachabilityObservationV1(raw);
      if (
        (source === "remote_outbound_seen" ||
          source === "remote_dialback_result") &&
        validated.stale
      ) {
        return false;
      }
      const observation = validated.observation;
      if (this.reachabilityObservations.has(observation.observation_id)) {
        return true;
      }
      this.reachabilityObservations.set(
        observation.observation_id,
        observation,
      );
      while (this.reachabilityObservations.size > 64) {
        const first = this.reachabilityObservations.keys().next().value;
        if (typeof first !== "string") break;
        this.reachabilityObservations.delete(first);
      }
      this.onReachabilityObservation?.({ source, observation });
      return true;
    } catch (error) {
      console.warn("VOID_P2P_REACHABILITY_RUNTIME_V1_OBSERVATION_REJECT", {
        source,
        reason: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private emitAuthenticatedOutboundSeen(peer: Peer) {
    if (
      peer.probe ||
      peer.outbound ||
      peer.outboundSeenEmitted ||
      !peer.handshakeDone ||
      peer.id.startsWith("?-")
    ) {
      return;
    }
    peer.outboundSeenEmitted = true;
    const latencyMs = Math.min(
      60_000,
      Math.max(0, Date.now() - peer.attachedAtMs),
    );
    for (const candidate of peer.listens.slice(0, 8)) {
      if (!parseVoidReachabilityCandidateAddressV1(candidate)) continue;
      try {
        const observation = createVoidP2PReachabilityObservationV1({
          subjectNodeId: peer.id,
          observerNodeId: this.id,
          observerFailureDomain: this.reachabilityFailureDomain,
          observedAt: new Date().toISOString(),
          kind: "authenticated_outbound_seen",
          candidateAddress: candidate,
          outcome: "success",
          authenticatedSubjectId: peer.id,
          latencyMs,
        });
        this.recordReachabilityObservation(
          observation,
          "local_outbound_seen",
        );
        this.sendRaw(peer, {
          type: "REACHABILITY_OBSERVATION",
          observation,
        });
      } catch (error) {
        console.warn(
          "VOID_P2P_REACHABILITY_RUNTIME_V1_OUTBOUND_OBSERVATION_REJECT",
          {
            peer_id: peer.id,
            candidate,
            reason: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  }

  private reachabilityCandidateAllowed(candidate: string): boolean {
    if (!parseVoidReachabilityCandidateAddressV1(candidate)) return false;
    return (
      isVoidPublicDirectCandidateV1(candidate) ||
      this.reachabilityTestAllowNonPublicProbe
    );
  }

  requestReachabilityDialback(
    observerNodeId: string,
    candidateInput?: string,
  ):
    | {
        ok: true;
        request_id: string;
        candidate_address: string;
      }
    | { ok: false; error: string } {
    const observer = this.peers.get(observerNodeId);
    if (
      !observer ||
      observer.probe ||
      !observer.handshakeDone ||
      observer.id.startsWith("?-")
    ) {
      return { ok: false, error: "observer_not_authenticated" };
    }

    const candidate =
      candidateInput ||
      this.listenAddrs.find((address) =>
        this.reachabilityCandidateAllowed(address),
      );
    if (!candidate) return { ok: false, error: "no_eligible_candidate" };

    const parsed = parseVoidReachabilityCandidateAddressV1(candidate);
    if (!parsed) return { ok: false, error: "candidate_not_ip_literal" };
    if (!this.listenAddrs.includes(parsed.canonical)) {
      return { ok: false, error: "candidate_not_authenticated_listen" };
    }
    if (
      !this.reachabilityTestAllowNonPublicProbe &&
      !isVoidPublicDirectCandidateV1(parsed.canonical)
    ) {
      return { ok: false, error: "candidate_not_public" };
    }
    if (this.pendingReachabilityDialbacks.size >= 8) {
      return { ok: false, error: "too_many_pending_dialbacks" };
    }
    for (const pending of this.pendingReachabilityDialbacks.values()) {
      if (
        pending.observerNodeId === observerNodeId &&
        pending.candidateAddress === parsed.canonical
      ) {
        return { ok: false, error: "dialback_already_pending" };
      }
    }

    const requestId = newVoidReachabilityRequestIdV1();
    const startedAtMs = Date.now();
    this.pendingReachabilityDialbacks.set(requestId, {
      observerNodeId,
      candidateAddress: parsed.canonical,
      startedAtMs,
    });
    this.sendRaw(observer, {
      type: "REACHABILITY_DIALBACK_REQUEST",
      request_id: requestId,
      candidate_address: parsed.canonical,
    });
    setTimeout(() => {
      const current = this.pendingReachabilityDialbacks.get(requestId);
      if (
        current &&
        current.observerNodeId === observerNodeId &&
        current.candidateAddress === parsed.canonical
      ) {
        this.pendingReachabilityDialbacks.delete(requestId);
      }
    }, 15_000).unref?.();

    return {
      ok: true,
      request_id: requestId,
      candidate_address: parsed.canonical,
    };
  }

  private handleReachabilityDialbackRequest(peer: Peer, raw: unknown) {
    if (
      !hasExactWireKeys(raw, [
        "type",
        "request_id",
        "candidate_address",
      ])
    ) {
      return;
    }
    const object = raw as Record<string, unknown>;
    if (object.type !== "REACHABILITY_DIALBACK_REQUEST") return;
    if (!isVoidReachabilityRequestIdV1(object.request_id)) return;
    const requestId = object.request_id;
    const candidate = parseVoidReachabilityCandidateAddressV1(
      object.candidate_address,
    );
    if (!candidate) return;
    if (!peer.listens.includes(candidate.canonical)) return;
    if (!this.reachabilityCandidateAllowed(candidate.canonical)) return;
    if (this.activeReachabilityProbes.size >= this.REACHABILITY_MAX_ACTIVE_PROBES) {
      return;
    }

    const now = Date.now();
    const last = this.lastReachabilityProbeAt.get(peer.id) || 0;
    if (now - last < this.REACHABILITY_PROBE_COOLDOWN_MS) return;
    const activeKey = `${peer.id}:${requestId}`;
    if (this.activeReachabilityProbes.has(activeKey)) return;

    this.lastReachabilityProbeAt.set(peer.id, now);
    this.activeReachabilityProbes.add(activeKey);
    this.startReachabilityDialbackProbe(
      peer.id,
      requestId,
      candidate.canonical,
      now,
    );
  }

  private startReachabilityDialbackProbe(
    subjectNodeId: string,
    requestId: string,
    candidateAddress: string,
    startedAtMs: number,
  ) {
    const parsed = parseVoidReachabilityCandidateAddressV1(candidateAddress);
    if (!parsed) {
      this.completeReachabilityDialbackAttempt(
        subjectNodeId,
        requestId,
        candidateAddress,
        startedAtMs,
        false,
      );
      return;
    }

    let attached = false;
    const socket = net.createConnection(
      { host: parsed.host, port: parsed.port },
      () => {
        attached = true;
        this.attachSocket(
          socket,
          parsed.canonical,
          true,
          subjectNodeId,
          parsed.canonical,
          {
            role: "outgoing",
            requestId,
            controlPeerId: subjectNodeId,
            candidateAddress: parsed.canonical,
            subjectNodeId,
            startedAtMs,
          },
        );
      },
    );
    socket.once("error", (error) => {
      if (attached) return;
      console.warn("VOID_P2P_REACHABILITY_RUNTIME_V1_DIALBACK_FAILURE", {
        subject_node_id: subjectNodeId,
        candidate_address: parsed.canonical,
        reason: error.message,
      });
      this.completeReachabilityDialbackAttempt(
        subjectNodeId,
        requestId,
        parsed.canonical,
        startedAtMs,
        false,
      );
      socket.destroy();
    });
  }

  private completeReachabilityDialbackAttempt(
    subjectNodeId: string,
    requestId: string,
    candidateAddress: string,
    startedAtMs: number,
    success: boolean,
    authenticatedSubjectId?: string,
    probePeer?: Peer,
  ) {
    const activeKey = `${subjectNodeId}:${requestId}`;
    if (!this.activeReachabilityProbes.delete(activeKey)) return;

    try {
      const observation = createVoidP2PReachabilityObservationV1({
        subjectNodeId,
        observerNodeId: this.id,
        observerFailureDomain: this.reachabilityFailureDomain,
        observedAt: new Date().toISOString(),
        kind: "authenticated_dialback",
        candidateAddress,
        outcome: success ? "success" : "failure",
        authenticatedSubjectId: success
          ? authenticatedSubjectId || null
          : null,
        latencyMs: success
          ? Math.min(60_000, Math.max(0, Date.now() - startedAtMs))
          : null,
      });
      this.recordReachabilityObservation(observation, "local_dialback");
      const controlPeer = this.peers.get(subjectNodeId);
      if (
        controlPeer &&
        !controlPeer.probe &&
        controlPeer.handshakeDone &&
        !controlPeer.id.startsWith("?-")
      ) {
        this.sendRaw(controlPeer, {
          type: "REACHABILITY_DIALBACK_RESULT",
          request_id: requestId,
          observation,
        });
      }
    } catch (error) {
      console.warn(
        "VOID_P2P_REACHABILITY_RUNTIME_V1_DIALBACK_OBSERVATION_FAILURE",
        {
          subject_node_id: subjectNodeId,
          candidate_address: candidateAddress,
          reason: error instanceof Error ? error.message : String(error),
        },
      );
    }

    if (probePeer) {
      probePeer.suppressReconnect = true;
      setTimeout(() => probePeer.socket.destroy(), success ? 25 : 0).unref?.();
    }
  }

  private handleReachabilityProbeOpen(peer: Peer, raw: unknown) {
    if (
      !hasExactWireKeys(raw, ["type", "request_id"]) ||
      peer.outbound ||
      peer.handshakeDone ||
      peer.remoteHello ||
      peer.probe
    ) {
      return;
    }
    const object = raw as Record<string, unknown>;
    if (object.type !== "REACHABILITY_PROBE_OPEN") return;
    if (!isVoidReachabilityRequestIdV1(object.request_id)) return;
    const pending = this.pendingReachabilityDialbacks.get(object.request_id);
    if (!pending) return;

    peer.probe = {
      role: "incoming",
      requestId: object.request_id,
      controlPeerId: pending.observerNodeId,
      candidateAddress: pending.candidateAddress,
      subjectNodeId: this.id,
      startedAtMs: pending.startedAtMs,
    };
    peer.expectedNodeId = pending.observerNodeId;
    peer.suppressReconnect = true;
  }

  private finishReachabilityProbeAuthentication(
    peer: Peer,
    auth: VoidPeerAuthV1,
  ): boolean {
    const probe = peer.probe;
    if (!probe) return false;

    const expectedIdentity =
      probe.role === "outgoing"
        ? probe.subjectNodeId
        : probe.controlPeerId;
    if (auth.id !== expectedIdentity) {
      if (probe.role === "outgoing") {
        this.completeReachabilityDialbackAttempt(
          probe.subjectNodeId,
          probe.requestId,
          probe.candidateAddress,
          probe.startedAtMs,
          false,
          undefined,
          peer,
        );
      }
      peer.socket.destroy();
      return false;
    }

    if (peer.authTimer) {
      clearTimeout(peer.authTimer);
      peer.authTimer = null;
    }
    peer.handshakeDone = true;
    peer.listens = [...auth.listen];
    peer.remoteHello = undefined;
    probe.authenticatedRemoteId = auth.id;

    if (probe.role === "incoming") {
      return true;
    }

    if (!auth.listen.includes(probe.candidateAddress)) {
      this.completeReachabilityDialbackAttempt(
        probe.subjectNodeId,
        probe.requestId,
        probe.candidateAddress,
        probe.startedAtMs,
        false,
        undefined,
        peer,
      );
      return false;
    }

    this.sendRaw(peer, {
      type: "REACHABILITY_PROBE_COMPLETE",
      request_id: probe.requestId,
    });
    this.completeReachabilityDialbackAttempt(
      probe.subjectNodeId,
      probe.requestId,
      probe.candidateAddress,
      probe.startedAtMs,
      true,
      auth.id,
      peer,
    );
    return true;
  }

  private handleReachabilityProbeComplete(peer: Peer, raw: unknown) {
    if (
      !hasExactWireKeys(raw, ["type", "request_id"]) ||
      !peer.probe ||
      peer.probe.role !== "incoming" ||
      !peer.handshakeDone ||
      !peer.probe.authenticatedRemoteId
    ) {
      return;
    }
    const object = raw as Record<string, unknown>;
    if (object.type !== "REACHABILITY_PROBE_COMPLETE") return;
    if (
      !isVoidReachabilityRequestIdV1(object.request_id) ||
      object.request_id !== peer.probe.requestId
    ) {
      return;
    }
    const pending = this.pendingReachabilityDialbacks.get(object.request_id);
    if (
      !pending ||
      pending.observerNodeId !== peer.probe.authenticatedRemoteId
    ) {
      peer.socket.destroy();
      return;
    }
    peer.suppressReconnect = true;
    peer.socket.destroy();
  }

  private handleReachabilityObservationMessage(peer: Peer, raw: unknown) {
    if (!hasExactWireKeys(raw, ["type", "observation"])) return;
    const object = raw as Record<string, unknown>;
    if (object.type !== "REACHABILITY_OBSERVATION") return;
    try {
      const validated = validateVoidP2PReachabilityObservationV1(
        object.observation,
      );
      const observation = validated.observation;
      if (
        validated.stale ||
        observation.kind !== "authenticated_outbound_seen" ||
        observation.outcome !== "success" ||
        observation.subject_node_id !== this.id ||
        observation.observer_node_id !== peer.id ||
        !this.listenAddrs.includes(observation.candidate_address)
      ) {
        return;
      }
      this.recordReachabilityObservation(
        observation,
        "remote_outbound_seen",
      );
    } catch {
      return;
    }
  }

  private handleReachabilityDialbackResult(peer: Peer, raw: unknown) {
    if (
      !hasExactWireKeys(raw, [
        "type",
        "request_id",
        "observation",
      ])
    ) {
      return;
    }
    const object = raw as Record<string, unknown>;
    if (object.type !== "REACHABILITY_DIALBACK_RESULT") return;
    if (!isVoidReachabilityRequestIdV1(object.request_id)) return;
    const pending = this.pendingReachabilityDialbacks.get(object.request_id);
    if (!pending || pending.observerNodeId !== peer.id) return;

    try {
      const validated = validateVoidP2PReachabilityObservationV1(
        object.observation,
      );
      const observation = validated.observation;
      if (
        validated.stale ||
        validated.observedMs + 1_000 < pending.startedAtMs ||
        observation.kind !== "authenticated_dialback" ||
        observation.subject_node_id !== this.id ||
        observation.observer_node_id !== peer.id ||
        observation.candidate_address !== pending.candidateAddress
      ) {
        return;
      }
      if (
        this.recordReachabilityObservation(
          observation,
          "remote_dialback_result",
        )
      ) {
        this.pendingReachabilityDialbacks.delete(object.request_id);
      }
    } catch {
      return;
    }
  }

  reachabilitySnapshot() {
    const observations = [...this.reachabilityObservations.values()];
    const groups = new Map<string, VoidP2PReachabilityObservationV1[]>();
    for (const observation of observations) {
      const key =
        `${observation.subject_node_id}\u0000${observation.candidate_address}`;
      const group = groups.get(key) || [];
      group.push(observation);
      groups.set(key, group);
    }
    const classifications = [...groups.values()].map((group) =>
      classifyVoidP2PReachabilityRuntimeV1(group),
    );
    return {
      observer_failure_domain: this.reachabilityFailureDomain,
      observations: observations.map((entry) => structuredClone(entry)),
      classifications: classifications.map((entry) => structuredClone(entry)),
      pending_dialbacks: this.pendingReachabilityDialbacks.size,
      active_probes: this.activeReachabilityProbes.size,
      runtime_integration_performed: true,
    };
  }

  /** sockets */
  private onIncoming(socket: net.Socket) {
    const remoteHost = String(socket.remoteAddress || "");
    const remotePort = Number(socket.remotePort || 0);
    const peerAddr =
      formatPeerAddress(remoteHost, remotePort) ||
      `${remoteHost}:${remotePort}`;
    this.attachSocket(socket, peerAddr, false);
  }
  private rejectUnauthenticatedPeer(peer: Peer, reason: string) {
    if (peer.probe?.role === "outgoing") {
      this.completeReachabilityDialbackAttempt(
        peer.probe.subjectNodeId,
        peer.probe.requestId,
        peer.probe.candidateAddress,
        peer.probe.startedAtMs,
        false,
        undefined,
        peer,
      );
    }
    if (peer.authTimer) {
      clearTimeout(peer.authTimer);
      peer.authTimer = null;
    }
    if (this.peers.get(peer.id) === peer) this.peers.delete(peer.id);
    console.warn("VOID_P2P_AUTHENTICATED_PEER_IDENTITY_V1_REJECT", {
      peer: peer.addr,
      reason,
    });
    peer.socket.destroy();
  }

  private finishAuthenticatedPeer(peer: Peer, auth: VoidPeerAuthV1) {
    if (peer.probe) {
      return this.finishReachabilityProbeAuthentication(peer, auth);
    }

    if (peer.expectedNodeId && auth.id !== peer.expectedNodeId) {
      console.warn("VOID_P2P_VERIFIED_PEER_CACHE_IDENTITY_MISMATCH_V1", {
        address: peer.reconnectAddr || peer.addr,
        expected_node_id: peer.expectedNodeId,
        authenticated_node_id: auth.id,
      });
      this.rejectUnauthenticatedPeer(peer, "cached reconnect identity mismatch");
      return false;
    }

    for (const address of auth.listen) {
      const cachedOwner = this.cachedExpectedNodeByAddress.get(address);
      if (cachedOwner && cachedOwner !== auth.id) {
        console.warn("VOID_P2P_VERIFIED_PEER_CACHE_ADDRESS_OWNERSHIP_MISMATCH_V1", {
          address,
          expected_node_id: cachedOwner,
          authenticated_node_id: auth.id,
        });
        this.rejectUnauthenticatedPeer(peer, "authenticated address ownership mismatch");
        return false;
      }
    }

    const temporaryId = peer.id;
    const existing = this.peers.get(auth.id);

    if (existing && existing !== peer) {
      if (existing.outbound && !peer.outbound) {
        this.rejectUnauthenticatedPeer(peer, "duplicate inbound connection");
        return false;
      }
      if (existing.authTimer) {
        clearTimeout(existing.authTimer);
        existing.authTimer = null;
      }
      existing.suppressReconnect = true;
      existing.socket.destroy();
      this.peers.delete(auth.id);
    }

    if (peer.authTimer) {
      clearTimeout(peer.authTimer);
      peer.authTimer = null;
    }
    this.peers.delete(temporaryId);
    peer.id = auth.id;
    peer.handshakeDone = true;
    peer.listens = [...auth.listen];
    peer.remoteHello = undefined;
    if (!peer.reconnectAddr || !peer.listens.includes(peer.reconnectAddr)) {
      peer.reconnectAddr = peer.listens[0];
    }
    this.peers.set(peer.id, peer);

    if (peer.reconnectAddr) this.backoff.delete(peer.reconnectAddr);
    this.rememberAuthenticatedPeer(peer);

    const firstListen = peer.listens[0];
    const inferredHttp = httpBaseFromP2P(firstListen);
    if (inferredHttp) {
      this.peerHttp.set(peer.id, inferredHttp);
      if (peer.id !== this.id) {
        this.onHttpAnnounce?.({ id: peer.id, http: inferredHttp, p2p: firstListen });
      }
    }

    for (const address of peer.listens) this.knownAddrs.add(address);
    const addrs = new Set<string>();
    for (const connectedPeer of this.peers.values()) {
      if (!connectedPeer.handshakeDone) continue;
      for (const address of connectedPeer.listens) addrs.add(address);
    }
    for (const address of this.listenAddrs) addrs.add(address);

    this.sendRaw(peer, { type: "PEERS", addrs: [...addrs] });
    for (const topic of this.myTopics) this.sendRaw(peer, { type: "SUB", topic });
    return true;
  }

  private attachSocket(
    socket: net.Socket,
    peerAddr: string,
    outgoing: boolean,
    expectedNodeId?: string,
    reconnectAddr?: string,
    reachabilityProbe?: ReachabilityProbeContext,
  ) {
    const peer: Peer = {
      id: `?-${crypto.randomBytes(4).toString("hex")}`,
      socket,
      framer: undefined as unknown as Framer,
      addr: peerAddr,
      listens: [],
      outbound: outgoing,
      handshakeDone: false,
      localChallenge: newVoidPeerChallengeV1(),
      authTimer: null,
      expectedNodeId,
      reconnectAddr,
      suppressReconnect: !!reachabilityProbe,
      attachedAtMs: Date.now(),
      outboundSeenEmitted: false,
      probe: reachabilityProbe,
    };

    peer.framer = new Framer(
      (msg) => this.onMsg(peer, msg),
      (error) => console.warn(`[wire] bad message from ${peer.id} (${peerAddr}):`, error.message),
    );
    socket.on("data", (chunk) => peer.framer.feed(chunk));
    socket.on("close", () => {
      if (peer.authTimer) {
        clearTimeout(peer.authTimer);
        peer.authTimer = null;
      }
      if (
        peer.probe?.role === "outgoing" &&
        !peer.handshakeDone
      ) {
        this.completeReachabilityDialbackAttempt(
          peer.probe.subjectNodeId,
          peer.probe.requestId,
          peer.probe.candidateAddress,
          peer.probe.startedAtMs,
          false,
          undefined,
          peer,
        );
      }
      if (this.peers.get(peer.id) === peer) this.peers.delete(peer.id);
      this.scheduleVerifiedPeerReconnect(peer);
    });
    socket.on("error", (error) => {
      console.warn(`[peer] error ${peer.id} (${peerAddr}):`, error.message);
    });

    this.peers.set(peer.id, peer);
    peer.authTimer = setTimeout(() => {
      if (!peer.handshakeDone) this.rejectUnauthenticatedPeer(peer, "authentication timeout");
    }, VOID_P2P_AUTH_TIMEOUT_MS_V1);
    peer.authTimer.unref?.();

    if (peer.probe?.role === "outgoing") {
      this.sendRaw(peer, {
        type: "REACHABILITY_PROBE_OPEN",
        request_id: peer.probe.requestId,
      });
    }

    this.sendRaw(peer, {
      type: "HELLO",
      id: this.id,
      listen: this.listenAddrs,
      proto: PROTO_VER,
      pubkey: this.pubPEM,
      challenge: peer.localChallenge,
    });
  }

  private onMsg(peer: Peer, msg: Msg) {
    if ((msg as any)?.type === "REACHABILITY_PROBE_OPEN") {
      this.handleReachabilityProbeOpen(peer, msg);
      return;
    }

    if (msg.type === "HELLO") {
      if (peer.handshakeDone || peer.remoteHello) {
        this.rejectUnauthenticatedPeer(peer, "duplicate HELLO");
        return;
      }
      const hello = normalizeVoidPeerHelloV1(msg);
      if (!hello || hello.id === this.id) {
        this.rejectUnauthenticatedPeer(peer, hello ? "self identity on remote socket" : "invalid HELLO");
        return;
      }
      peer.remoteHello = hello;
      let auth: VoidPeerAuthV1;
      try {
        auth = buildVoidPeerAuthV1(
          { id: this.id, listen: this.listenAddrs, proto: PROTO_VER, pubkey: this.pubPEM },
          hello.challenge,
          peer.localChallenge,
          this.priv,
        );
      } catch (error) {
        this.rejectUnauthenticatedPeer(
          peer,
          `local AUTH construction failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return;
      }
      this.sendRaw(peer, auth);
      return;
    }

    if (msg.type === "AUTH") {
      if (peer.handshakeDone || !peer.remoteHello) {
        this.rejectUnauthenticatedPeer(peer, peer.handshakeDone ? "duplicate AUTH" : "AUTH before HELLO");
        return;
      }
      const auth = verifyVoidPeerAuthV1(msg, peer.localChallenge, peer.remoteHello);
      if (!auth) {
        this.rejectUnauthenticatedPeer(peer, "invalid AUTH");
        return;
      }
      this.finishAuthenticatedPeer(peer, auth);
      return;
    }

    if ((msg as any)?.type === "REACHABILITY_PROBE_COMPLETE") {
      this.handleReachabilityProbeComplete(peer, msg);
      return;
    }

    if (!peer.handshakeDone || peer.id.startsWith("?-")) return;

    this.emitAuthenticatedOutboundSeen(peer);

    if ((msg as any)?.type === "REACHABILITY_OBSERVATION") {
      this.handleReachabilityObservationMessage(peer, msg);
      return;
    }

    if ((msg as any)?.type === "REACHABILITY_DIALBACK_REQUEST") {
      this.handleReachabilityDialbackRequest(peer, msg);
      return;
    }

    if ((msg as any)?.type === "REACHABILITY_DIALBACK_RESULT") {
      this.handleReachabilityDialbackResult(peer, msg);
      return;
    }

    if (msg.type === "PEERS") {
      const learned = canonicalizePeerAddressList(msg.addrs, 64);
      for (const address of learned) if (!this.isSelfAddress(address)) this.knownAddrs.add(address);
      for (const address of learned) if (this.shouldDial(address)) this.connect(address);
      return;
    }

    if (msg.type === "SUB") {
      this.pubsub.subscribe(peer.id, msg.topic);
      return;
    }

    if (msg.type === "PUB") {
      const key = `${msg.topic}:${msg.nonce}`;
      if (this.seen.has(key)) return;
      const pub = safeImportPublicKey(msg.pubkey);
      if (!pub) return;
      const bytes = bytesToSign(msg.topic, msg.data, msg.nonce);
      if (!verifyBytes(pub, bytes, msg.sig)) return;
      this.seen.add(key);
      this.seenTimestamps.set(key, Date.now());

      if (this.pubsub.subscribers(msg.topic).has(this.id)) {
        try {
          if (msg.topic === "void/tx") {
            this.acceptTx(JSON.parse(msg.data));
          } else if (msg.topic === "void/http") {
            const info = JSON.parse(msg.data);
            const pid = String(info?.id || "").trim();
            const http = String(info?.http || "").trim();
            if (pid && /^https?:\/\/.+/.test(http)) {
              const base = http.replace(/\/+$/, "");
              this.peerHttp.set(pid, base);
              if (pid !== this.id) this.onHttpAnnounce?.({ id: pid, http: base });
            }
          } else if (msg.topic === "void/blob.announce") {
            const ann = JSON.parse(msg.data);
            const cid = String(ann?.cid || "").trim();
            if (cid && !this.getBlob(cid)) {
              const providers = [...this.peerHttp.values()];
              if (providers.length) this.enqueueBlobFetch(cid, providers);
            }
          }
        } catch (error) {
          void error;
        }
      }

      for (const connectedPeer of this.peers.values()) {
        if (!connectedPeer.handshakeDone || connectedPeer.id === peer.id) continue;
        if (this.pubsub.subscribers(msg.topic).has(connectedPeer.id)) {
          this.sendRaw(connectedPeer, msg);
        }
      }
    }
  }

  /** canonical tx intake (validation + dedupe) */
  acceptTx(raw: any): boolean {
    if (!raw || typeof raw !== "object") return false;
    const h = String(raw.hash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(h)) return false;
    if (this.txSeen.has(h)) return false;      // de-dupe globally
    const tx = { hash: h, body: raw.body ?? {} };
    this.txSeen.set(h, Date.now());
    try { (this.mempool as any).push?.(tx); } catch (err) { recordMempoolBestEffortFailure("accept-tx-mempool-push", err, { txHash: h }); }
    return true;
  }

  private sendRaw(peer: Peer, msg: Msg) {
    try {
      peer.socket.write(encode(msg));
    } catch (err) {
      recordRemainingRuntimeBestEffortFailure("send-raw-socket-write", err, { peerId: String((peer as any)?.id ?? "") });
    }
  }
  private isKnownPeer(id: string): boolean {
    return this.peers.has(id) && !id.startsWith("?-");
  }
  private isSelfAddress(addr: string): boolean {
    const canonical = canonicalPeerAddress(addr);
    return !!canonical && this.listenAddrs.includes(canonical);
  }
  private shouldDial(addr: string): boolean {
    const canonical = canonicalPeerAddress(addr);
    if (!canonical) return false;
    if (this.isSelfAddress(canonical)) return false;
    if (this.dialing.has(canonical)) return false;
    for (const p of this.peers.values()) if (p.listens.includes(canonical)) return false;
    return true;
  }
  connect(addr: string, expectedNodeId?: string) {
    const parsed = parsePeerAddress(addr);
    if (!parsed) return;
    const canonical = parsed.canonical;
    if (!this.shouldDial(canonical)) return;

    const pinnedNodeId =
      expectedNodeId || this.cachedExpectedNodeByAddress.get(canonical);
    this.dialing.add(canonical);

    const socket = net.createConnection(
      { host: parsed.host, port: parsed.port },
      () => {
        console.log(`[dial] connected ${canonical}`);
        this.attachSocket(socket, canonical, true, pinnedNodeId, canonical);
        this.dialing.delete(canonical);
      },
    );
    socket.on("error", (e) => {
      console.warn(`[dial] failed ${canonical}:`, e.message);
      this.dialing.delete(canonical);
      socket.destroy();
      const cur = this.backoff.get(canonical) ?? this.MIN_BACKOFF;
      const nxt = Math.min(cur * 2, this.MAX_BACKOFF);
      this.backoff.set(canonical, nxt);
      setTimeout(() => {
        if (!this.stopping) this.connect(canonical, pinnedNodeId);
      }, cur).unref?.();
    });
  }

  /** pubsub facade */
  subscribe(topic: string) {
    this.myTopics.add(topic);
    this.pubsub.subscribe(this.id, topic);
    for (const p of this.peers.values()) this.sendRaw(p, { type: "SUB", topic });
  }
  publishString(topic: string, data: string) {
    const nonce = crypto.randomBytes(8).toString("hex");
    const bytes = bytesToSign(topic, data, nonce);
    const sig = signBytes(this.priv, bytes);
    const msg: Msg = { type: "PUB", topic, data, from: this.id, nonce, sig, pubkey: this.pubPEM };

    for (const p of this.peers.values()) {
      if (this.pubsub.subscribers(topic).has(p.id)) this.sendRaw(p, msg);
    }

    if (this.pubsub.subscribers(topic).has(this.id)) {
      const key = `${topic}:${nonce}`;
      this.seen.add(key);
      this.seenTimestamps.set(key, Date.now());
    }
  }
  publishJson(topic: string, obj: any) {
    this.publishString(topic, JSON.stringify(obj));
  }

  /** --------- blob replication --------- */
  private enqueueBlobFetch(cid: string, providers: string[]) {
    if (this.blobFetchQ.some((q) => q.cid === cid)) return;
    this.blobFetchQ.push({ cid, providers: providers.slice(0, 8), enqueuedAt: Date.now() });
    if (!this.blobFetchRunning) {
      this.blobFetchRunning = true;
      void this.blobFetchLoop();
    }
  }

  private async blobFetchLoop() {
    const backoff = new Map<string, number>();
    const MIN_MS = 1500;
    const MAX_MS = 20_000;

    const fetchWithTimeout = async (url: string, ms = 7000) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      try {
        return await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "void-node/1 blob-fetch" } } as any);
      } finally {
        clearTimeout(t);
      }
    };

    // Try several common endpoints and payload shapes
    const tryFetchBlob = async (base: string, cid: string): Promise<Buffer | null> => {
      const candidates = [
        `${base}/blob/${cid}`,          // raw bytes (preferred by our code)
        `${base}/blob/raw/${cid}`,     // alt
        `${base}/blob/get/${cid}`,     // alt
      ];
      for (const url of candidates) {
        try {
          const r = await fetchWithTimeout(url);
          if (!r?.ok) continue;
          const ctype = String(r.headers.get("content-type") || "").toLowerCase();
          if (ctype.includes("application/json")) {
            const j: any = await r.json();
            if (typeof j?.base64 === "string") return Buffer.from(j.base64, "base64");
            if (typeof j?.text === "string") return Buffer.from(j.text, "utf8");
            continue;
          }
          const buf = Buffer.from(await r.arrayBuffer());
          return buf;
        } catch {
          /* keep trying */
        }
      }
      return null;
    };

    while (this.blobFetchQ.length) {
      const job = this.blobFetchQ.shift()!;
      if (this.getBlob(job.cid)) continue;

      let ok = false;

      for (const base of job.providers) {
        const buf = await tryFetchBlob(base, job.cid);
        if (!buf) continue;

        try {
          const computed = await cidForBytes(buf);
          if (computed !== job.cid) continue;
          await this.putBlobFromBuffer(buf);
          ok = true;
          break;
        } catch {
          /* move to next provider */
        }
      }

      if (!ok) {
        const cur = backoff.get(job.cid) ?? MIN_MS;
        const next = Math.min(cur * 2, MAX_MS);
        backoff.set(job.cid, next);
        setTimeout(() => this.enqueueBlobFetch(job.cid, job.providers), cur);
      } else {
        backoff.delete(job.cid);
      }
    }

    this.blobFetchRunning = false;
  }

  /** --------- proposer --------- */
  startProposer(intervalMs = 5000) {
    if (this.proposerTimer) return { ok: false, error: "already running" };
    const ms = Math.max(300, Number(intervalMs) || 5000);
    this.proposerTimer = setInterval(() => {
      void this.sealBlock().catch((err) => {
        recordRemainingRuntimeBestEffortFailure(
          "proposer-interval-seal",
          err,
          { intervalMs: ms },
        );
      });
    }, ms);
    return { ok: true, intervalMs: ms };
  }
  stopProposer() {
    if (!this.proposerTimer) return { ok: true, note: "not running" };
    clearInterval(this.proposerTimer);
    this.proposerTimer = null;
    return { ok: true, stopped: true };
  }

  private takeTxBatch(max = 1000): any[] {
    try {
      if (typeof (this.mempool as any).drain === "function") {
        const r1 = (this.mempool as any).drain(max);
        if (Array.isArray(r1)) return r1;
        const r2 = (this.mempool as any).drain();
        if (Array.isArray(r2)) return r2;
      }
      if (typeof (this.mempool as any).popMany === "function") {
        const r = (this.mempool as any).popMany(max);
        if (Array.isArray(r)) return r;
      }
      if (typeof (this.mempool as any).take === "function") {
        const r = (this.mempool as any).take(max);
        if (Array.isArray(r)) return r;
      }
      if (typeof (this.mempool as any).peekAll === "function") {
        const all = (this.mempool as any).peekAll();
        if (Array.isArray(all)) {
          if (typeof (this.mempool as any).clear === "function") {
            try { (this.mempool as any).clear(); } catch (err) { recordMempoolBestEffortFailure("take-tx-batch-mempool-clear", err, { max, available: all.length }); }
          }
          return all.slice(0, max);
        }
      }
    } catch (err) {
      recordMempoolBestEffortFailure("take-tx-batch-mempool-drain", err, { max });
    }
    return [];
  }

  async sealBlock(opts?: { allowEmptyOnce?: boolean }): Promise<{ ok: true; number: number; txs: number }> {
    const t0 = Date.now();

    const parent = this.store.loadHeadNumber();
    const number = parent + 1;

    const batch = this.takeTxBatch(1000);
    const txs = batch
      .filter(
        (t) =>
          t &&
          typeof t === "object" &&
          typeof t.body === "object" &&
          t.body !== null &&
          typeof t.hash === "string" &&
          /^[0-9a-fA-F]{64}$/.test(t.hash),
      )
      .map((t) => ({ ...t, hash: String(t.hash).toLowerCase() }));

    // Allow sealing an empty block if the one-shot flag is set OR global flag is enabled
    const allowEmpty = !!opts?.allowEmptyOnce || this.allowEmptyBlocks;
    if (txs.length === 0 && !allowEmpty) {
      return { ok: true, number: parent, txs: 0 };
    }
    const blobs = discoverLocalBlobs(this.baseDir);
    const roots = computeRoots(txs, blobs);
    const now = Date.now();

    const parentBlock = parent >= 0 ? this.store.loadBlock(parent) : null;
    const parentHash = parent >= 0 && parentBlock ? blockHash(parentBlock) : "".padStart(64, "0");

    const headerBytes = blockHeaderBytes({
      number,
      parentHash,
      timestamp: now,
      txRoot: roots.txRoot,
      blobRoot: roots.blobRoot,
      proposer: this.id,
    } as any);

    const sig = signBytes(this.priv, headerBytes);
    const b: Block = {
      number,
      parentHash,
      timestamp: now,
      txRoot: roots.txRoot,
      blobRoot: roots.blobRoot,
      txs,
      blobs,
      proposer: this.id,
      proposerPubkey: this.pubPEM,
      sig,
    };

    await this.store.saveBlock(b);

    if (b.txs?.length) {
      try {
        const refs = b.txs.map((tx, i) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }));
        this.txIndex.putMany(refs);
      } catch (err) {
        recordSideEffectWriteFailure("local-production-tx-index", err, { blockNumber: b.number, txCount: b.txs?.length ?? 0 });
      }
      try {
        const shard = this.txIndex.shardForBlock(b.number);
        await buildKidxForJsonl(shard.path);
      } catch (err) {
        recordSideEffectWriteFailure("local-production-kidx", err, { blockNumber: b.number, txCount: b.txs?.length ?? 0 });
      }
      try {
        const anyReceipts: any = this.receipts as any;
        const recs = b.txs.map((tx, i) => ({
          h: tx.hash.toLowerCase(),
          n: b.number,
          o: i,
          ts: b.timestamp ?? now,
        }));
        if (typeof anyReceipts.appendMany === "function") {
          await anyReceipts.appendMany(recs);
        } else if (typeof anyReceipts.append === "function") {
          for (const r of recs) await anyReceipts.append(r);
        }
      } catch (err) {
        recordSideEffectWriteFailure("local-production-receipts", err, { blockNumber: b.number, txCount: b.txs?.length ?? 0 });
      }
    }

    this.publishJson("void/block", {
      number: b.number,
      hash: blockHash(b),
      txRoot: b.txRoot,
      blobRoot: b.blobRoot,
      timestamp: b.timestamp,
    });

    const dt = Date.now() - t0;
    this.onSealed?.(b, dt);

    return { ok: true, number: b.number, txs: b.txs?.length ?? 0 };
  }

  /** follower: one-shot */
  async pullOnce(peerHttp: string, hooks?: { onImportBlock?: (b: any) => void }) {
    const myHead = this.store.loadHeadNumber();

    const readPeerHead = async (): Promise<number> => {
      const base = String(peerHttp || "").replace(/\/+$/, "");

      // 1) Preferred current surface
      try {
        const r: any = await fetch(`${base}/blocks/latest/number2.json`).catch(() => null);
        if (r && r.ok) {
          const j: any = await r.json().catch(() => null);
          const n = Number(j?.number);
          if (Number.isFinite(n) && n >= 0) return n;
        }
      } catch (err) {
        recordPeerHeadProbeFailure("peer-head-probe-latest-number2", err, { peerHttp: base });
      }

      // 2) Fallback to /head
      try {
        const r: any = await fetch(`${base}/head`).catch(() => null);
        if (r && r.ok) {
          const j: any = await r.json().catch(() => null);
          const n = Number(j?.head);
          if (Number.isFinite(n) && n >= 0) return n;
        }
      } catch (err) {
        recordPeerHeadProbeFailure("peer-head-probe-head", err, { peerHttp: base });
      }

      // 3) Fallback demo summary
      try {
        const r: any = await fetch(`${base}/__void/demo/summary.json`).catch(() => null);
        if (r && r.ok) {
          const j: any = await r.json().catch(() => null);
          const n = Number(j?.chain?.head);
          if (Number.isFinite(n) && n >= 0) return n;
        }
      } catch (err) {
        recordPeerHeadProbeFailure("peer-head-probe-demo-summary", err, { peerHttp: base });
      }

      // 4) Last resort legacy helper
      try {
        const r: any = await fetch(`${base}/api/health`).catch(() => null);
        if (r && r.ok) {
          const j: any = await r.json().catch(() => null);
          const n = Number(j?.head);
          if (Number.isFinite(n) && n >= 0) return n;
        }
      } catch (err) {
        recordPeerHeadProbeFailure("peer-head-probe-api-health", err, { peerHttp: base });
      }

      return -1;
    };

    const theirHead = await readPeerHead();

    if (!(Number.isFinite(theirHead) && theirHead >= 0)) {
      return { ok: false, imported: 0, alreadyHad: 0, filled: 0, reason: "peer head unavailable", myHead, theirHead };
    }
    if (theirHead <= myHead) {
      return { ok: true, imported: 0, alreadyHad: 0, filled: 0, reason: "no new blocks", myHead, theirHead };
    }

    const from = myHead + 1;
    const maxPull = Math.max(1, Number(process.env.VOID_FOLLOWER_PULL_LIMIT || 250) || 250);
    const to = Math.min(theirHead, myHead + maxPull);

    const fetchRange = async (): Promise<any[]> =>
      await fetch(`${peerHttp}/blocks/range?from=${from}&to=${to}`)
        .then((r) => r.json())
        .then((j) => (Array.isArray(j) ? j : []))
        .catch(() => []);

    let arr: any[] = await fetchRange();
    let retried = false;

    if (!Array.isArray(arr) || arr.length === 0 || Number(arr[arr.length - 1]?.number) !== theirHead) {
      arr = await fetchRange();
      retried = true;
    }

    let imported = 0;
    let alreadyHad = 0;
    let filled = 0;
    const importedNums: number[] = [];

    const persistHeadIfPossible = (n: number) => {
      try {
        const st: any = this.store as any;
        if (!Number.isFinite(n) || n < 0) return;
        if (typeof st?.persistHeadAtomic === "function") {
          st.persistHeadAtomic(n);
          return;
        }
      } catch (err) {
        recordImportHeadAdvanceBestEffortFailure("persist-head-atomic", err, { head: n });
      }
      try {
        const fs = require("node:fs");
        const path = require("node:path");
        const base = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data");
        const hj = path.join(base, "heads.json");
        const ht = path.join(base, "head.txt");
        fs.writeFileSync(hj + ".tmp", JSON.stringify({ head: n, hash: "0x0" }) + "\n");
        fs.renameSync(hj + ".tmp", hj);
        fs.writeFileSync(ht + ".tmp", String(n) + "\n");
        fs.renameSync(ht + ".tmp", ht);
      } catch (err) {
        recordImportHeadAdvanceBestEffortFailure("persist-head-filesystem", err, { head: n });
      }
    };

    const advanceContiguousHead = (startHead: number, maxSeen: number): number => {
      let h = Number(startHead);
      const maxN = Number(maxSeen);
      if (!(Number.isFinite(h) && h >= -1)) h = -1;
      if (!(Number.isFinite(maxN) && maxN >= 0)) return h;
      while (h < maxN) {
        const nxt = h + 1;
        let blk: any = null;
        try { blk = this.store.loadBlock(nxt); } catch (err) { recordImportHeadAdvanceBestEffortFailure("advance-contiguous-head-load-block", err, { blockNumber: nxt }); }
        if (!blk || Number(blk?.number) !== nxt) break;
        h = nxt;
      }
      if (h > startHead) {
        persistHeadIfPossible(h);
        try {
          const st: any = this.store as any;
          if (typeof st.headNumber === "number" || st.headNumber == null) st.headNumber = h;
          if (typeof st.latestNumber === "number" || st.latestNumber == null) st.latestNumber = h;
        } catch (err) {
          recordImportHeadAdvanceBestEffortFailure("advance-contiguous-head-memory", err, { head: h, startHead, maxSeen: maxN });
        }
      }
      return h;
    };

    for (const b of arr) {
      const n = Number(b?.number);
      if (!Number.isFinite(n)) continue;

      const existing = this.store.loadBlock(n);
      const incomingHasTxs = Array.isArray(b?.txs) && b.txs.length > 0;
      const existingHasTxs = Array.isArray(existing?.txs) && existing.txs.length > 0;

      if (!existing) {
        const parentBlock = n === 0 ? null : this.store.loadBlock(n - 1);
        const valid = validateBlockForAppend(b, parentBlock as any);
        if (!valid.ok) {
          return {
            ok: false,
            imported,
            alreadyHad,
            filled,
            reason: "invalid imported block",
            invalidBlock: n,
            invalidReason: (valid as any).reason || "unknown",
            myHead,
            theirHead,
            from,
            to,
            got: Array.isArray(arr) ? arr.length : 0,
            retried,
            importedNums,
          };
        }

        this.store.saveBlock(b);
        imported++;
        importedNums.push(n);

        if (incomingHasTxs) {
          try {
            const refs = b.txs.map((tx: any, i: number) => ({ h: String(tx.hash).toLowerCase(), n, o: i }));
            this.txIndex.putMany(refs);
          } catch (err) {
            recordSideEffectWriteFailure("peer-import-tx-index", err, { blockNumber: n, txCount: b.txs?.length ?? 0 });
          }
          try {
            const anyReceipts: any = this.receipts as any;
            const recs = b.txs.map((tx: any, i: number) => ({
              h: String(tx.hash).toLowerCase(),
              n,
              o: i,
              ts: b.timestamp ?? Date.now(),
            }));
            if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
            else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r);
          } catch (err) {
            recordSideEffectWriteFailure("peer-import-receipts", err, { blockNumber: n, txCount: b.txs?.length ?? 0 });
          }
        }

        hooks?.onImportBlock?.(b);
        continue;
      }

      if (!existingHasTxs && incomingHasTxs) {
        const parentBlock = n === 0 ? null : this.store.loadBlock(n - 1);
        const valid = validateBlockForAppend(b, parentBlock as any);
        if (!valid.ok) {
          return {
            ok: false,
            imported,
            alreadyHad,
            filled,
            reason: "invalid imported fill block",
            invalidBlock: n,
            invalidReason: (valid as any).reason || "unknown",
            myHead,
            theirHead,
            from,
            to,
            got: Array.isArray(arr) ? arr.length : 0,
            retried,
            importedNums,
          };
        }

        const merged = { ...existing, ...b, txs: b.txs };
        this.store.saveBlock(merged);
        filled++;
        importedNums.push(n);

        try {
          const refs = b.txs.map((tx: any, i: number) => ({ h: String(tx.hash).toLowerCase(), n, o: i }));
          this.txIndex.putMany(refs);
        } catch (err) {
          recordSideEffectWriteFailure("peer-import-tx-index", err, { blockNumber: n, txCount: b.txs?.length ?? 0 });
        }
        try {
          const anyReceipts: any = this.receipts as any;
          const recs = b.txs.map((tx: any, i: number) => ({
            h: String(tx.hash).toLowerCase(),
            n,
            o: i,
            ts: b.timestamp ?? Date.now(),
          }));
          if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
          else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r);
        } catch (err) {
          recordSideEffectWriteFailure("peer-import-receipts", err, { blockNumber: n, txCount: b.txs?.length ?? 0 });
        }

        hooks?.onImportBlock?.(b);
        continue;
      }

      alreadyHad++;
    }

    const maxSeen = Math.max(
      Number.isFinite(theirHead) ? theirHead : -1,
      ...((Array.isArray(arr) ? arr : []).map((x:any) => Number(x?.number)).filter((n:any) => Number.isFinite(n)))
    );
    const advancedHead = advanceContiguousHead(myHead, maxSeen);

    return {
      ok: true,
      imported,
      alreadyHad,
      filled,
      myHead,
      advancedHead,
      theirHead,
      from,
      to,
      got: Array.isArray(arr) ? arr.length : 0,
      retried,
      importedNums,
    };
  }

  /** follower periodic */
  startFollower(peerHttp = "http://localhost:4100", intervalMs = 2000, opts?: { onImportBlock?: (b: Block) => void }) {
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        await this.pullOnce(peerHttp, opts);
      } catch (err) {
        recordRemainingRuntimeBestEffortFailure("follower-periodic-pull", err, { peerHttp });
      }
      running = false;
    };
    void tick();
    setInterval(tick, intervalMs).unref?.();
    return { ok: true, peerHttp, intervalMs };
  }

  peersSnapshot() {
    const connected = [...this.peers.values()]
      .filter((p) => !p.id.startsWith("?-"))
      .map((p) => ({ id: p.id, addr: p.addr, listens: p.listens, outbound: p.outbound }));
    const verifiedPeers = this.verifiedPeerCacheRecords.map((record) => ({
      node_id: record.node_id,
      addresses: [...record.addresses],
      last_authenticated_at_ms: record.last_authenticated_at_ms,
    }));
    return { connected, knownAddrs: [...this.knownAddrs], verifiedPeers };
  }

  /** blobs */
  async putBlobFromBuffer(buf: Buffer) {
    const cid = await cidForBytes(buf);
    const file = path.join(this.blobsDir, cid);
    if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
    this.publishJson("void/blob.announce", { cid, size: buf.length });
    return { cid, size: buf.length };
  }
  getBlob(cid: string): Buffer | null {
    const file = path.join(this.blobsDir, cid);
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file);
  }
}

function discoverLocalBlobs(baseDir = process.env.DATA_DIR || "data"): { cid: string; size: number }[] {
  const dir = path.join(baseDir, "blobs");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^[0-9a-f]{64}$/i.test(f))
    .map((f) => {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      return { cid: f, size: st.size };
    });
}

// ---------------- [ADD] tx enqueue shim export (idempotent) ----------------
// Some routes import { globalEnqueueTx } from "../node_core.js". Provide a tiny
// queue that lives on globalThis so the import resolves without touching other code.
export function globalEnqueueTx(tx: any) {
  try {
    const g: any = globalThis as any;
    if (!g.__void_tx_queue) g.__void_tx_queue = [];
    g.__void_tx_queue.push(tx ?? {});
    return g.__void_tx_queue.length;
  } catch {
    return -1;
  }
}
// ---------------------------------------------------------------------------
