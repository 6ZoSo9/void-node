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

/** ---------- wire / pubsub ---------- */
const MAX_MSG_BYTES = 64 * 1024;
const PROTO_VER = 1;

type Msg =
  | { type: "HELLO"; id: string; listen: string[]; proto: number; pubkey: string }
  | { type: "SUB"; topic: string }
  | { type: "PUB"; topic: string; data: string; from: string; nonce: string; sig: string; pubkey: string }
  | { type: "PEERS"; addrs: string[] };

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

type Peer = {
  id: string;
  socket: net.Socket;
  framer: Framer;
  addr: string;
  listens: string[];
  outbound: boolean;
  handshakeDone: boolean;
};

/** ================================================================= */
/**                               Node                                 */
/** ================================================================= */
type NodeOpts = { allowEmptyBlocks?: boolean };

export class Node {
  readonly id: string;
  readonly pubPEM: string;
  private priv: crypto.KeyObject;
  private pub: crypto.KeyObject;

  readonly listenAddrs: string[] = [];
  readonly peers: Map<string, Peer> = new Map();
  readonly pubsub = new PubSub();

  private readonly baseDir = process.env.DATA_DIR || "data";
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
    ensureDir(this.blobsDir);
  }

  onHttpAnnounce?: (p: { id: string; http?: string; p2p?: string }) => void;
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
    const addr = `${advertHost}:${(this.server.address() as net.AddressInfo).port}`;
    this.listenAddrs.push(addr);
    this.knownAddrs.add(addr);
    console.log(`[void-node] started TCP on ${addr}, id=${this.id}`);

    const bootstrapRaw = String(process.env.BOOTSTRAP_ADDRS || "").trim();
    const bootstrapAddrs = bootstrapRaw
      ? bootstrapRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    if (bootstrapAddrs.length) {
      console.log(`[void-node] bootstrap dial targets: ${bootstrapAddrs.join(", ")}`);
      for (const a of bootstrapAddrs) {
        if (a && a !== addr && this.shouldDial(a)) {
          setTimeout(() => this.connect(a), 250).unref?.();
        }
      }
    }

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
    for (const p of this.peers.values()) p.socket.destroy();
    this.server.close();
  }

  /** sockets */
  private onIncoming(socket: net.Socket) {
    const peerAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    this.attachSocket(socket, peerAddr, false);
  }
  private attachSocket(socket: net.Socket, peerAddr: string, outgoing: boolean) {
    let peerId = `?-${crypto.randomBytes(4).toString("hex")}`;
    const framer = new Framer((msg) => this.onMsg(peerId, msg), (e) => {
      console.warn(`[wire] bad message from ${peerId} (${peerAddr}):`, e.message);
    });
    socket.on("data", (chunk) => framer.feed(chunk));
    socket.on("close", () => {
      this.peers.delete(peerId);
    });
    socket.on("error", (e) => {
      console.warn(`[peer] error ${peerId} (${peerAddr}):`, e.message);
    });
    const peer: Peer = {
      id: peerId,
      socket,
      framer,
      addr: peerAddr,
      listens: [],
      outbound: outgoing,
      handshakeDone: false,
    };
    this.peers.set(peerId, peer);
    this.sendRaw(peer, { type: "HELLO", id: this.id, listen: this.listenAddrs, proto: PROTO_VER, pubkey: this.pubPEM });
  }

  private onMsg(tempOrRealId: string, msg: Msg) {
    if (msg.type === "HELLO") {
      const ent = [...this.peers.entries()].find(([k]) => k === tempOrRealId || k.startsWith("?-"));
      if (!ent) return;
      const [tmpKey, p] = ent;

      const existing = this.peers.get(msg.id);
      if (existing) {
        if (existing.outbound && !p.outbound) {
          p.socket.destroy();
          this.peers.delete(tmpKey);
          return;
        } else {
          existing.socket.destroy();
          this.peers.delete(msg.id);
        }
      }

      this.peers.delete(tmpKey);
      p.id = msg.id;
      p.handshakeDone = true;
      p.listens = Array.isArray(msg.listen) ? msg.listen : [];
      this.peers.set(p.id, p);

      console.log(`[peer] HELLO -> ${p.id} @ ${p.addr} (they listen: ${p.listens.join(",") || "n/a"})`);

      // Heuristic: infer their HTTP base from first p2p listen like 127.0.0.1:4701 -> http://127.0.0.1:4101
      const firstListen: string | undefined = p.listens[0];
      const httpFromP2P = (addr?: string): string | undefined => {
        if (!addr) return undefined;
        const m = addr.match(/^([^:]+):(\d+)$/);
        if (!m) return undefined;
        const host = m[1], port = Number(m[2]);
        if (port >= 4700 && port <= 4799) return `http://${host}:${4100 + (port - 4700)}`;
        return undefined;
      };
      const inferredHttp = httpFromP2P(firstListen);
      if (inferredHttp) {
        this.peerHttp.set(p.id, inferredHttp);
        if (p.id !== this.id) this.onHttpAnnounce?.({ id: p.id, http: inferredHttp, p2p: firstListen });
      }

      // Merge peerset and send back PEERS + our current topic subs
      for (const a of p.listens) this.knownAddrs.add(a);
      const addrs = new Set<string>();
      for (const pp of this.peers.values()) for (const a of pp.listens) addrs.add(a);
      for (const a of this.listenAddrs) addrs.add(a);

      this.sendRaw(p, { type: "PEERS", addrs: [...addrs] });
      for (const t of this.myTopics) this.sendRaw(p, { type: "SUB", topic: t });
      return;
    }

    if (msg.type === "PEERS") {
      for (const a of msg.addrs) if (!this.isSelfAddress(a)) this.knownAddrs.add(a);
      for (const a of msg.addrs) if (this.shouldDial(a)) this.connect(a);
      return;
    }

    if (msg.type === "SUB") {
      if (!this.isKnownPeer(tempOrRealId)) return;
      this.pubsub.subscribe(tempOrRealId, msg.topic);
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
            const tx = JSON.parse(msg.data);
            this.acceptTx(tx);
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
          } else if (msg.topic === "void/block") {
            const hdr = JSON.parse(msg.data);
            const num = Number(hdr?.number);
            if (Number.isFinite(num)) {
              // Announcement only. Do not persist header-shaped peer data.
              // Full block persistence must pass validateBlockForAppend() in pullOnce()/SegStore.
            }
          } else {
            // other topics: ignore for now
          }
        } catch {
          /* ignore bad payloads */
        }
      }

      // fan-out to other subscribers
      for (const p of this.peers.values()) {
        if (p.id === tempOrRealId) continue;
        if (this.pubsub.subscribers(msg.topic).has(p.id)) this.sendRaw(p, msg);
      }
      return;
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
    return this.listenAddrs.includes(addr);
  }
  private shouldDial(addr: string): boolean {
    if (this.isSelfAddress(addr)) return false;
    if (this.dialing.has(addr)) return false;
    for (const p of this.peers.values()) if (p.listens.includes(addr)) return false;
    return true;
  }
  connect(addr: string) {
    if (!this.shouldDial(addr)) return;
    this.dialing.add(addr);
    const [host, portStr] = addr.split(":");
    const port = Number(portStr);
    if (!host || !port) {
      this.dialing.delete(addr);
      return;
    }
    const socket = net.createConnection({ host, port }, () => {
      console.log(`[dial] connected ${addr}`);
      this.backoff.delete(addr);
      this.attachSocket(socket, addr, true);
      this.dialing.delete(addr);
    });
    socket.on("error", (e) => {
      console.warn(`[dial] failed ${addr}:`, e.message);
      this.dialing.delete(addr);
      socket.destroy();
      const cur = this.backoff.get(addr) ?? this.MIN_BACKOFF;
      const nxt = Math.min(cur * 2, this.MAX_BACKOFF);
      this.backoff.set(addr, nxt);
      setTimeout(() => this.connect(addr), cur);
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
    this.proposerTimer = setInterval(() => { void this.sealBlock(); }, ms);
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

    this.store.saveBlock(b);

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
    const to = theirHead;

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
    return { connected, knownAddrs: [...this.knownAddrs] };
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
