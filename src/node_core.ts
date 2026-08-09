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
  isPublicLearnedPeerAddressV1,
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
import {
  VOID_P2P_RELAY_DEFAULT_RESERVATION_TTL_MS_V1,
  VOID_P2P_RELAY_MAX_PENDING_REQUESTS_V1,
  VOID_P2P_RELAY_MAX_QUEUED_BYTES_V1,
  VOID_P2P_RELAY_REQUEST_TIMEOUT_MS_V1,
  VOID_P2P_RELAY_MAX_STREAMS_PER_PEER_V1,
  VOID_P2P_RELAY_MAX_STREAMS_V1,
  VoidRelayServerStateV1,
  VoidRelayVirtualSocketV1,
  decodeVoidRelayDataV1,
  isVoidRelayControlTypeV1,
  newVoidRelayIdV1,
  normalizeVoidRelayControlMessageV1,
  voidRelayClientExpiryV1,
  voidRelayRequestTimedOutV1,
  voidRelayWritableQueueWithinBoundV1,
  type VoidRelayControlMessageV1,
  type VoidRelayStreamRecordV1,
} from "./p2p/relay_v1.js";
import {
  normalizeVoidUdpSwarmControlMessageV1,
  type VoidUdpSwarmControlMessageV1,
} from "./p2p/udp_swarm_control_v1.js";
import { VoidUdpSwarmRelayBridgeV1 } from "./p2p/udp_swarm_relay_bridge_v1.js";
import {
  VoidUdpSwarmAuthenticatedControlAdapterV1,
  type VoidUdpSwarmControlDeliveryV1,
  type VoidUdpSwarmProbeActionV1,
  type VoidUdpSwarmDirectUpgradeOfferActionV1,
} from "./p2p/udp_swarm_authenticated_control_adapter_v1.js";
import type { VoidUdpPeerSocketAdapterV1 } from "./p2p/udp_peer_socket_adapter_v1.js";
import { VoidUdpSwarmAuthenticatedDirectCandidateV1 } from "./p2p/udp_swarm_authenticated_direct_candidate_v1.js";
import { evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1 } from "./p2p/udp_swarm_relay_preserving_takeover_policy_v1.js";
import {
  VoidUdpSwarmDirectRouteHealthObserverV1,
  type VoidUdpSwarmDirectRouteHealthObserverRouteStateV1,
} from "./p2p/udp_swarm_direct_route_health_observer_v1.js";
import {
  VoidUdpSwarmDirectRouteHealthProbeV1,
  buildVoidUdpSwarmDirectRouteHealthPongV1,
  normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeResultV1,
} from "./p2p/udp_swarm_direct_route_health_probe_v1.js";
import {
  VoidUdpSwarmRelayRetirementExecutorV1,
  type VoidUdpSwarmRelayRetirementBindingV1,
  type VoidUdpSwarmRelayRetirementRevalidationV1,
} from "./p2p/udp_swarm_relay_retirement_executor_v1.js";
import {
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1,
  evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1,
  type VoidUdpSwarmPostRetirementRecoveryDecisionV1,
} from "./p2p/udp_swarm_post_retirement_recovery_policy_v1.js";
import {
  VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1,
  VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MIN_V1,
  VOID_P2P_DIRECT_UPGRADE_LOCAL_BIND_ATTEMPTS_V1,
  VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPT_TIMEOUT_MS_V1,
  VOID_P2P_DIRECT_UPGRADE_MAX_PENDING_REQUESTS_V1,
  VOID_P2P_DIRECT_UPGRADE_REQUEST_TIMEOUT_MS_V1,
  VoidDirectUpgradeRelayStateV1,
  isVoidDirectUpgradeControlTypeV1,
  newVoidDirectUpgradeIdV1,
  normalizeVoidDirectUpgradeControlMessageV1,
  normalizeVoidDirectUpgradeObservedAddressV1,
  voidDirectUpgradeRequestTimedOutV1,
  type VoidDirectUpgradeControlMessageV1,
} from "./p2p/direct_upgrade_v1.js";

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
  | { type: "REACHABILITY_DIALBACK_RESULT"; request_id: string; observation: VoidP2PReachabilityObservationV1 }
  | VoidRelayControlMessageV1
  | VoidUdpSwarmControlMessageV1
  | VoidUdpSwarmDirectRouteHealthProbeMessageV1
  | VoidDirectUpgradeControlMessageV1;

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

type PeerTransportV1 = "direct" | "relay";

type PeerSocketV1 = {
  on(event: "data", listener: (chunk: Buffer) => void): unknown;
  on(event: "close", listener: () => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  write(data: Uint8Array | string): boolean;
  destroy(error?: Error): unknown;
  readonly writableLength?: number;
  readonly localAddress?: string;
  readonly localPort?: number;
  readonly remoteAddress?: string;
  readonly remotePort?: number;
  readonly destroyed?: boolean;
};

type RelayLocalStreamV1 = {
  relay_node_id: string;
  remote_node_id: string;
  stream_id: string;
  outgoing: boolean;
  started: boolean;
  socket: VoidRelayVirtualSocketV1;
};

type DirectUpgradeLocalSessionV1 = {
  session_id: string;
  relay_node_id: string;
  stream_id: string;
  remote_node_id: string;
  peer_observed_address: string;
  local_address: string;
  local_port: number;
  start_delay_ms: number;
  attempt_timeout_ms: number;
  created_at_ms: number;
  expires_at_ms: number;
  started: boolean;
};

type UdpSwarmAuthenticatedDirectCandidateContextV1 = Readonly<{
  session_id: string;
  expected_peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  candidate: VoidUdpSwarmAuthenticatedDirectCandidateV1;
}>;

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
  socket: PeerSocketV1;
  framer: Framer;
  addr: string;
  listens: string[];
  outbound: boolean;
  handshakeDone: boolean;
  localChallenge: string;
  remoteHello?: VoidPeerHelloV1;
  authenticatedPublicPem?: string;
  authTimer: NodeJS.Timeout | null;
  expectedNodeId?: string;
  reconnectAddr?: string;
  suppressReconnect: boolean;
  attachedAtMs: number;
  outboundSeenEmitted: boolean;
  probe?: ReachabilityProbeContext;
  transport: PeerTransportV1;
  relayViaNodeId?: string;
  relayStreamId?: string;
  persistDirectEvidence: boolean;
  punchCapable: boolean;
  directUpgradeSessionId?: string;
  udpSwarmDirectCandidate?: UdpSwarmAuthenticatedDirectCandidateContextV1;
};

type UdpSwarmPromotedRelayFallbackV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  direct_peer: Peer;
  relay_peer: Peer;
}>;

type UdpSwarmPromotedDirectRouteHealthContextV1 = {
  session_id: string;
  peer_node_id: string;
  direct_peer: Peer;
  observer: VoidUdpSwarmDirectRouteHealthObserverV1;
  probe: VoidUdpSwarmDirectRouteHealthProbeV1;
  retirement: VoidUdpSwarmRelayRetirementExecutorV1;
  next_probe_at_ms: number;
  relay_retired_at_ms: number | null;
  relay_retirement_last_error: string | null;
};

type UdpSwarmPostRetirementRecoveryContextV1 = {
  session_id: string;
  peer_node_id: string;
  relay_node_id: string;
  retired_relay_stream_id: string;
  relay_retired_at_ms: number;
  reacquisition_attempt_count: number;
  last_reacquisition_attempt_at_ms: number | null;
  local_admission_retry_at_ms: number | null;
  last_request_id: string | null;
  last_error: string | null;
  last_decision_reason: string | null;
};

const VOID_P2P_UDP_SWARM_PROMOTED_DIRECT_HEALTH_PROBE_INTERVAL_MS_V1 =
  7_500;

/** ================================================================= */
/**                               Node                                 */
/** ================================================================= */
type NodeOpts = {
  allowEmptyBlocks?: boolean;
  reachabilityTestAllowNonPublicProbe?: boolean;
  relayServer?: boolean;
  udpSwarmRelayEndpoint?: string;
  udpSwarmAllowNonPublicEndpoint?: boolean;
  directUpgradeEnabled?: boolean;
  directUpgradeAllowNonPublicCandidates?: boolean;
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

  private readonly relayServerEnabled: boolean;
  private readonly relayServerState = new VoidRelayServerStateV1();
  private relaySweepTimer: NodeJS.Timeout | null = null;
  private relayPendingReservations = new Map<
    string,
    {
      relay_node_id: string;
      requested_ttl_ms: number;
      requested_at_ms: number;
    }
  >();
  private relayPendingConnects = new Map<
    string,
    {
      relay_node_id: string;
      target_node_id: string;
      requested_at_ms: number;
    }
  >();
  private relayClientReservations = new Map<
    string,
    { relay_node_id: string; reservation_id: string; expires_at_ms: number }
  >();
  private relayStreams = new Map<string, RelayLocalStreamV1>();
  private readonly udpSwarmAllowNonPublicEndpoint: boolean;
  private readonly udpSwarmControl: VoidUdpSwarmAuthenticatedControlAdapterV1;
  private readonly udpSwarmDirectCandidates = new Map<string, Peer>();
  private readonly udpSwarmPromotedRelayFallbacks =
    new Map<string, UdpSwarmPromotedRelayFallbackV1>();
  private readonly udpSwarmPromotedDirectRouteHealth =
    new Map<string, UdpSwarmPromotedDirectRouteHealthContextV1>();
  private readonly udpSwarmPostRetirementRecovery =
    new Map<string, UdpSwarmPostRetirementRecoveryContextV1>();

  private readonly directUpgradeEnabled: boolean;
  private readonly directUpgradeAllowNonPublicCandidates: boolean;
  private readonly directUpgradeRelayState = new VoidDirectUpgradeRelayStateV1();
  private directUpgradePendingRequests = new Map<
    string,
    {
      relay_node_id: string;
      target_node_id: string;
      stream_id: string;
      requested_at_ms: number;
    }
  >();
  private directUpgradeLocalSessions = new Map<
    string,
    DirectUpgradeLocalSessionV1
  >();

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
  private learnedPeerDialAttemptsV1 = new Set<string>();
  private readonly MAX_LEARNED_PEER_ADVERTISEMENTS_PER_MESSAGE_V1 = 64;
  private readonly MAX_LEARNED_PEER_DIALS_PER_MESSAGE_V1 = 8;
  private readonly MAX_LEARNED_PEER_DIALS_PER_RUNTIME_V1 = 64;
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
    this.relayServerEnabled = !!opts?.relayServer;
    this.udpSwarmAllowNonPublicEndpoint =
      opts?.udpSwarmAllowNonPublicEndpoint === true;
    const udpSwarmRelayEndpoint = String(
      opts?.udpSwarmRelayEndpoint || "",
    ).trim();
    if (udpSwarmRelayEndpoint && !this.relayServerEnabled) {
      throw new Error(
        "UDP swarm relay endpoint requires relayServer=true",
      );
    }
    const udpSwarmRelayBridge = udpSwarmRelayEndpoint
      ? new VoidUdpSwarmRelayBridgeV1(
          this.relayServerState,
          udpSwarmRelayEndpoint,
          (nodeId) =>
            this.authenticatedDirectPeer(nodeId)?.authenticatedPublicPem,
          this.udpSwarmAllowNonPublicEndpoint,
        )
      : undefined;
    this.udpSwarmControl = new VoidUdpSwarmAuthenticatedControlAdapterV1({
      localNodeId: this.id,
      localPublicPem: this.pubPEM,
      localPrivateKey: this.priv,
      isStartedRelayClientStream: (relayNodeId, peerNodeId, streamId) => {
        const entry = this.relayStreams.get(
          this.relayStreamKey(relayNodeId, streamId),
        );
        return !!entry && entry.started && entry.remote_node_id === peerNodeId;
      },
      relayBridge: udpSwarmRelayBridge,
      allowNonPublicEndpoint: this.udpSwarmAllowNonPublicEndpoint,
    });
    this.directUpgradeEnabled = !!opts?.directUpgradeEnabled;
    this.directUpgradeAllowNonPublicCandidates =
      !!opts?.directUpgradeAllowNonPublicCandidates;
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
  onUdpSwarmProbeAction?: (action: VoidUdpSwarmProbeActionV1) => void;
  onUdpSwarmDirectUpgradeOffer?: (
    action: VoidUdpSwarmDirectUpgradeOfferActionV1,
  ) => void;
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

    if (!this.relaySweepTimer) {
      this.relaySweepTimer = setInterval(() => {
        if (!this.stopping) {
          this.sweepRelayClientState();
          this.sweepRelayServerState();
          this.udpSwarmControl.sweep();
          this.sweepDirectUpgradeState();
          this.sweepUdpSwarmPromotedRelayRetirementV1();
          this.sweepUdpSwarmPostRetirementRecoveryV1();
          this.sweepUdpSwarmPromotedDirectRouteHealthV1();
        }
      }, 1_000);
      this.relaySweepTimer.unref?.();
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
    this.stopping = true;
    this.pendingReachabilityDialbacks.clear();
    this.activeReachabilityProbes.clear();
    if (this.relaySweepTimer) {
      clearInterval(this.relaySweepTimer);
      this.relaySweepTimer = null;
    }
    for (const stream of this.relayStreams.values()) {
      stream.socket.remoteClose("node stopping");
    }
    this.relayStreams.clear();
    this.directUpgradePendingRequests.clear();
    this.directUpgradeLocalSessions.clear();
    for (const peer of this.udpSwarmDirectCandidates.values()) {
      peer.udpSwarmDirectCandidate?.candidate.discard("node_stopping");
    }
    this.udpSwarmDirectCandidates.clear();
    this.udpSwarmPromotedRelayFallbacks.clear();
    this.udpSwarmPromotedDirectRouteHealth.clear();
    this.udpSwarmPostRetirementRecovery.clear();
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
      peer.transport !== "direct" ||
      !peer.persistDirectEvidence ||
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
      if (this.stopping) return;
      if (peer.punchCapable) {
        void this.connectPunchCapableRelay(address, peer.id);
      } else {
        this.connect(address, peer.id);
      }
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
      peer.transport !== "direct" ||
      !peer.persistDirectEvidence ||
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
          "direct",
          undefined,
          undefined,
          false,
          false,
          undefined,
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
      peer.transport !== "direct" ||
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
    const directUpgrade = this.matchIncomingDirectUpgrade(peerAddr);
    this.attachSocket(
      socket,
      peerAddr,
      false,
      directUpgrade?.remote_node_id,
      undefined,
      "direct",
      undefined,
      undefined,
      directUpgrade ? false : true,
      false,
      directUpgrade?.session_id,
    );
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

  private exactLiveRelayPeerForUdpSwarmV1(
  relayPeer: Peer | undefined,
  expectedPeerNodeId: string,
  relayNodeId: string,
  relayStreamId: string,
): Peer | undefined {
  if (
    !relayPeer ||
    relayPeer.socket.destroyed === true ||
    !relayPeer.handshakeDone ||
    relayPeer.id !== expectedPeerNodeId ||
    relayPeer.transport !== "relay" ||
    relayPeer.relayViaNodeId !== relayNodeId ||
    relayPeer.relayStreamId !== relayStreamId
  ) return;

  const stream = this.relayStreams.get(
    this.relayStreamKey(relayNodeId, relayStreamId),
  );
  if (
    !stream ||
    !stream.started ||
    stream.remote_node_id !== expectedPeerNodeId ||
    stream.socket !== relayPeer.socket
  ) return;
  return relayPeer;
}

private liveRelayPeerForUdpSwarmCandidateV1(
  expectedPeerNodeId: string,
  relayNodeId: string,
  relayStreamId: string,
): Peer | undefined {
  const routedRelay = this.exactLiveRelayPeerForUdpSwarmV1(
    this.peers.get(expectedPeerNodeId),
    expectedPeerNodeId,
    relayNodeId,
    relayStreamId,
  );
  if (routedRelay) return routedRelay;

  const promotedFallback =
    this.udpSwarmPromotedRelayFallbacks.get(expectedPeerNodeId);
  if (
    !promotedFallback ||
    promotedFallback.relay_node_id !== relayNodeId ||
    promotedFallback.relay_stream_id !== relayStreamId
  ) return;
  return this.exactLiveRelayPeerForUdpSwarmV1(
    promotedFallback.relay_peer,
    expectedPeerNodeId,
    relayNodeId,
    relayStreamId,
  );
}

private sweepUdpSwarmAuthenticatedDirectCandidatesV1(
  reason = "relay_fallback_lost",
): void {
  for (const [sessionId, peer] of [...this.udpSwarmDirectCandidates]) {
    const context = peer.udpSwarmDirectCandidate;
    if (!context) {
      this.udpSwarmDirectCandidates.delete(sessionId);
      continue;
    }
    if (
      this.liveRelayPeerForUdpSwarmCandidateV1(
        context.expected_peer_node_id,
        context.relay_node_id,
        context.relay_stream_id,
      )
    ) continue;
    this.udpSwarmDirectCandidates.delete(sessionId);
    context.candidate.discard(reason);
  }
}

private finishUdpSwarmAuthenticatedDirectCandidateV1(
  peer: Peer,
  auth: VoidPeerAuthV1,
): boolean {
  const context = peer.udpSwarmDirectCandidate;
  if (!context) return false;
  if (
    this.udpSwarmDirectCandidates.get(context.session_id) !== peer ||
    peer.transport !== "direct" ||
    peer.persistDirectEvidence ||
    peer.expectedNodeId !== context.expected_peer_node_id
  ) {
    this.udpSwarmDirectCandidates.delete(context.session_id);
    context.candidate.discard("candidate Node mount binding mismatch");
    return false;
  }

  if (!context.candidate.acceptNormalVoidAuthentication(auth.id, auth.pubkey)) {
    this.udpSwarmDirectCandidates.delete(context.session_id);
    return false;
  }

  const candidateSnapshot = context.candidate.snapshot();
  const existingRoute = this.peers.get(context.expected_peer_node_id);
  const takeoverDecision =
    evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1({
      candidate_phase: candidateSnapshot.phase,
      expected_peer_node_id: context.expected_peer_node_id,
      authenticated_peer_node_id:
        candidateSnapshot.authenticated_peer_node_id,
      existing_authenticated_route:
        existingRoute &&
        existingRoute.handshakeDone &&
        existingRoute.id === context.expected_peer_node_id
          ? {
              peer_node_id: existingRoute.id,
              transport: existingRoute.transport,
              relay_node_id: existingRoute.relayViaNodeId ?? null,
              relay_stream_id: existingRoute.relayStreamId ?? null,
            }
          : null,
      relay_fallback_live:
        !!this.liveRelayPeerForUdpSwarmCandidateV1(
          context.expected_peer_node_id,
          context.relay_node_id,
          context.relay_stream_id,
        ),
    });
  if (takeoverDecision.action !== "stage_authenticated_candidate") {
    this.udpSwarmDirectCandidates.delete(context.session_id);
    context.candidate.discard(
      `relay-preserving takeover policy rejected candidate: ${takeoverDecision.reason}`,
    );
    return false;
  }

  if (peer.authTimer) {
    clearTimeout(peer.authTimer);
    peer.authTimer = null;
  }
  peer.authenticatedPublicPem = auth.pubkey;
  peer.listens = [...auth.listen];
  peer.remoteHello = undefined;
  return true;
}

private finishAuthenticatedPeer(peer: Peer, auth: VoidPeerAuthV1) {
    if (peer.probe) {
      return this.finishReachabilityProbeAuthentication(peer, auth);
    }
    if (peer.udpSwarmDirectCandidate) {
      return this.finishUdpSwarmAuthenticatedDirectCandidateV1(peer, auth);
    }

    if (peer.expectedNodeId && auth.id !== peer.expectedNodeId) {
      if (peer.directUpgradeSessionId) {
        console.warn("VOID_P2P_DIRECT_UPGRADE_IDENTITY_MISMATCH_V1", {
          session_id: peer.directUpgradeSessionId,
          expected_node_id: peer.expectedNodeId,
          authenticated_node_id: auth.id,
        });
        this.rejectUnauthenticatedPeer(peer, "direct-upgrade peer identity mismatch");
      } else if (peer.transport === "relay") {
        console.warn("VOID_P2P_RELAY_DESTINATION_IDENTITY_MISMATCH_V1", {
          relay_node_id: peer.relayViaNodeId,
          stream_id: peer.relayStreamId,
          expected_node_id: peer.expectedNodeId,
          authenticated_node_id: auth.id,
        });
        this.rejectUnauthenticatedPeer(peer, "relayed peer identity mismatch");
      } else if (!peer.persistDirectEvidence) {
        console.warn("VOID_P2P_EPHEMERAL_DIRECT_IDENTITY_MISMATCH_V1", {
          expected_node_id: peer.expectedNodeId,
          authenticated_node_id: auth.id,
          transport_hint: peer.addr,
        });
        this.rejectUnauthenticatedPeer(peer, "ephemeral direct peer identity mismatch");
      } else {
        console.warn("VOID_P2P_VERIFIED_PEER_CACHE_IDENTITY_MISMATCH_V1", {
          address: peer.reconnectAddr || peer.addr,
          expected_node_id: peer.expectedNodeId,
          authenticated_node_id: auth.id,
        });
        this.rejectUnauthenticatedPeer(peer, "cached reconnect identity mismatch");
      }
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

    if (
      existing &&
      existing !== peer &&
      existing.transport === "direct" &&
      peer.transport === "relay"
    ) {
      this.rejectUnauthenticatedPeer(
        peer,
        "direct authenticated transport already preferred",
      );
      return false;
    }

    if (
      existing &&
      existing !== peer &&
      existing.transport === "relay" &&
      peer.transport === "direct"
    ) {
      existing.suppressReconnect = true;
      existing.socket.destroy();
      this.peers.delete(auth.id);
    }

    if (
      existing &&
      existing !== peer &&
      this.peers.get(auth.id) === existing
    ) {
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
    peer.authenticatedPublicPem = auth.pubkey;
    peer.listens = [...auth.listen];
    peer.remoteHello = undefined;
    if (
      peer.transport === "direct" &&
      peer.persistDirectEvidence &&
      (!peer.reconnectAddr || !peer.listens.includes(peer.reconnectAddr))
    ) {
      peer.reconnectAddr = peer.listens[0];
    }
    this.peers.set(peer.id, peer);

    if (peer.transport === "direct" && peer.persistDirectEvidence) {
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
    }
    if (peer.directUpgradeSessionId) {
      this.completeDirectUpgradeSession(peer.directUpgradeSessionId, peer.id);
    }

    this.sendRaw(peer, {
      type: "PEERS",
      addrs: this.publicPeerExchangeAddrsV1(),
    });
    for (const topic of this.myTopics) this.sendRaw(peer, { type: "SUB", topic });
    return true;
  }

  stageUdpSwarmAuthenticatedDirectCandidateV1(
  options: Readonly<{
    sessionId: string;
    expectedPeerNodeId: string;
    relayNodeId: string;
    relayStreamId: string;
    transportHint: string;
    socket: VoidUdpPeerSocketAdapterV1;
  }>,
): boolean {
  const reject = (reason: string): false => {
    if (!options.socket.destroyed) options.socket.destroy(new Error(reason));
    return false;
  };
  if (this.stopping) return reject("node is stopping");
  if (this.udpSwarmDirectCandidates.has(options.sessionId)) {
    return reject("UDP swarm candidate session already staged");
  }
  if (
    !this.liveRelayPeerForUdpSwarmCandidateV1(
      options.expectedPeerNodeId,
      options.relayNodeId,
      options.relayStreamId,
    )
  ) {
    return reject("exact live relay fallback is required before UDP candidate staging");
  }

  let candidate: VoidUdpSwarmAuthenticatedDirectCandidateV1;
  try {
    candidate = new VoidUdpSwarmAuthenticatedDirectCandidateV1({
      sessionId: options.sessionId,
      expectedPeerNodeId: options.expectedPeerNodeId,
      relayNodeId: options.relayNodeId,
      relayStreamId: options.relayStreamId,
      transportHint: options.transportHint,
      socket: options.socket,
      isRelayFallbackLive: () =>
        !!this.liveRelayPeerForUdpSwarmCandidateV1(
          options.expectedPeerNodeId,
          options.relayNodeId,
          options.relayStreamId,
        ),
    });
  } catch (error) {
    return reject(
      error instanceof Error ? error.message : String(error),
    );
  }

  const context: UdpSwarmAuthenticatedDirectCandidateContextV1 =
    Object.freeze({
      session_id: options.sessionId,
      expected_peer_node_id: options.expectedPeerNodeId,
      relay_node_id: options.relayNodeId,
      relay_stream_id: options.relayStreamId,
      candidate,
    });
  try {
    this.attachSocket(
      options.socket,
      options.transportHint,
      true,
      options.expectedPeerNodeId,
      undefined,
      "direct",
      undefined,
      undefined,
      false,
      false,
      undefined,
      undefined,
      context,
    );
    return true;
  } catch (error) {
    candidate.discard(
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

udpSwarmAuthenticatedDirectCandidateSnapshotV1() {
  const candidates = [...this.udpSwarmDirectCandidates.entries()]
    .map(([sessionId, peer]) => {
      const context = peer.udpSwarmDirectCandidate;
      if (!context) return;
      const routedPeer = this.peers.get(context.expected_peer_node_id);
      return {
        ...context.candidate.snapshot(),
        session_id: sessionId,
        relay_fallback_live:
          !!this.liveRelayPeerForUdpSwarmCandidateV1(
            context.expected_peer_node_id,
            context.relay_node_id,
            context.relay_stream_id,
          ),
        candidate_is_normal_peer_route: routedPeer === peer,
        routed_peer_transport: routedPeer?.transport ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    .sort((a, b) => a.session_id.localeCompare(b.session_id));
  return {
    candidate_count: candidates.length,
    candidates,
    normal_peer_routing_promotion_performed: candidates.some(
      (entry) => entry.candidate_is_normal_peer_route,
    ),
    relay_retirement_performed: false,
  };
}

promoteUdpSwarmAuthenticatedDirectCandidateV1(
  sessionId: string,
):
  | {
      ok: true;
      session_id: string;
      peer_node_id: string;
      relay_fallback_live: true;
      persist_direct_evidence: false;
      relay_retirement_performed: false;
    }
  | { ok: false; error: string } {
  if (this.stopping) return { ok: false, error: "node_stopping" };
  const peer = this.udpSwarmDirectCandidates.get(sessionId);
  const context = peer?.udpSwarmDirectCandidate;
  if (!peer || !context || context.session_id !== sessionId) {
    return { ok: false, error: "candidate_not_staged" };
  }

  const snapshot = context.candidate.snapshot();
  if (
    snapshot.phase !== "authenticated_candidate" ||
    snapshot.authenticated_peer_node_id !== context.expected_peer_node_id ||
    !snapshot.authenticated_public_key_bound ||
    !peer.authenticatedPublicPem ||
    peer.handshakeDone ||
    peer.transport !== "direct" ||
    peer.persistDirectEvidence ||
    peer.expectedNodeId !== context.expected_peer_node_id ||
    this.peers.get(peer.id) !== peer
  ) {
    return { ok: false, error: "candidate_not_promotion_ready" };
  }

  if (
    this.udpSwarmPromotedRelayFallbacks.has(context.expected_peer_node_id)
  ) {
    return { ok: false, error: "relay_fallback_already_retained" };
  }

  const relayPeer = this.liveRelayPeerForUdpSwarmCandidateV1(
    context.expected_peer_node_id,
    context.relay_node_id,
    context.relay_stream_id,
  );
  if (
    !relayPeer ||
    this.peers.get(context.expected_peer_node_id) !== relayPeer
  ) {
    return { ok: false, error: "exact_live_relay_route_required" };
  }

  const promotedAtMs = Date.now();
  let healthObserver: VoidUdpSwarmDirectRouteHealthObserverV1;
  let healthProbe: VoidUdpSwarmDirectRouteHealthProbeV1;
  let relayRetirement: VoidUdpSwarmRelayRetirementExecutorV1;
  try {
    healthObserver = new VoidUdpSwarmDirectRouteHealthObserverV1({
      sessionId,
      expectedPeerNodeId: context.expected_peer_node_id,
      relayNodeId: context.relay_node_id,
      relayStreamId: context.relay_stream_id,
      promotedAtMs,
    });
    healthProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(sessionId);
    relayRetirement = new VoidUdpSwarmRelayRetirementExecutorV1({
      session_id: sessionId,
      expected_peer_node_id: context.expected_peer_node_id,
      relay_node_id: context.relay_node_id,
      relay_stream_id: context.relay_stream_id,
    });
  } catch {
    return { ok: false, error: "health_state_initialization_failed" };
  }

  const promotion =
    context.candidate.authorizeDirectPeerPromotion(promotedAtMs);
  if (!promotion) {
    if (context.candidate.phase === "discarded") {
      this.udpSwarmDirectCandidates.delete(sessionId);
    }
    return { ok: false, error: "promotion_authorization_rejected" };
  }
  if (
    promotion.session_id !== sessionId ||
    promotion.peer_node_id !== context.expected_peer_node_id ||
    promotion.relay_node_id !== context.relay_node_id ||
    promotion.relay_stream_id !== context.relay_stream_id ||
    promotion.socket !== peer.socket ||
    promotion.persist_direct_evidence !== false ||
    promotion.relay_retirement_authorized !== false ||
    this.peers.get(context.expected_peer_node_id) !== relayPeer ||
    !this.exactLiveRelayPeerForUdpSwarmV1(
      relayPeer,
      context.expected_peer_node_id,
      context.relay_node_id,
      context.relay_stream_id,
    )
  ) {
    this.udpSwarmDirectCandidates.delete(sessionId);
    peer.socket.destroy(new Error("promotion authorization binding changed"));
    return { ok: false, error: "promotion_binding_changed" };
  }

  const temporaryId = peer.id;
  this.udpSwarmPromotedRelayFallbacks.set(
    context.expected_peer_node_id,
    Object.freeze({
      session_id: sessionId,
      peer_node_id: context.expected_peer_node_id,
      relay_node_id: context.relay_node_id,
      relay_stream_id: context.relay_stream_id,
      direct_peer: peer,
      relay_peer: relayPeer,
    }),
  );
  this.udpSwarmPromotedDirectRouteHealth.set(
    context.expected_peer_node_id,
    {
      session_id: sessionId,
      peer_node_id: context.expected_peer_node_id,
      direct_peer: peer,
      observer: healthObserver,
      probe: healthProbe,
      retirement: relayRetirement,
      next_probe_at_ms: promotedAtMs,
      relay_retired_at_ms: null,
      relay_retirement_last_error: null,
    },
  );
  this.udpSwarmDirectCandidates.delete(sessionId);
  if (this.peers.get(temporaryId) === peer) this.peers.delete(temporaryId);
  delete peer.udpSwarmDirectCandidate;
  peer.id = context.expected_peer_node_id;
  peer.handshakeDone = true;
  this.peers.set(peer.id, peer);

  this.sendRaw(peer, {
    type: "PEERS",
    addrs: this.publicPeerExchangeAddrsV1(),
  });
  for (const topic of this.myTopics) this.sendRaw(peer, { type: "SUB", topic });

  return {
    ok: true,
    session_id: sessionId,
    peer_node_id: peer.id,
    relay_fallback_live: true,
    persist_direct_evidence: false,
    relay_retirement_performed: false,
  };
}

udpSwarmPromotedDirectRouteSnapshotV1() {
  const routes = [...this.udpSwarmPromotedRelayFallbacks.values()]
    .map((entry) => {
      const routedPeer = this.peers.get(entry.peer_node_id);
      return {
        session_id: entry.session_id,
        peer_node_id: entry.peer_node_id,
        relay_node_id: entry.relay_node_id,
        relay_stream_id: entry.relay_stream_id,
        direct_route_live:
          routedPeer === entry.direct_peer &&
          routedPeer.handshakeDone &&
          routedPeer.transport === "direct",
        relay_fallback_live:
          this.exactLiveRelayPeerForUdpSwarmV1(
            entry.relay_peer,
            entry.peer_node_id,
            entry.relay_node_id,
            entry.relay_stream_id,
          ) === entry.relay_peer,
        persist_direct_evidence: entry.direct_peer.persistDirectEvidence,
        relay_retirement_performed: false as const,
      };
    })
    .sort((a, b) => a.peer_node_id.localeCompare(b.peer_node_id));
  return {
    promoted_route_count: routes.length,
    routes,
    relay_retirement_performed: false,
  };
}

private restoreUdpSwarmRelayFallbackAfterDirectCloseV1(peer: Peer): boolean {
  const fallback = this.udpSwarmPromotedRelayFallbacks.get(peer.id);
  if (!fallback || fallback.direct_peer !== peer) return false;
  this.udpSwarmPromotedRelayFallbacks.delete(peer.id);
  if (this.peers.has(peer.id)) return false;
  const relayPeer = this.exactLiveRelayPeerForUdpSwarmV1(
    fallback.relay_peer,
    fallback.peer_node_id,
    fallback.relay_node_id,
    fallback.relay_stream_id,
  );
  if (!relayPeer) return false;
  this.peers.set(fallback.peer_node_id, relayPeer);
  console.warn("VOID_P2P_UDP_SWARM_DIRECT_PROMOTION_V1_RELAY_RESTORED", {
    peer_node_id: fallback.peer_node_id,
    session_id: fallback.session_id,
    relay_node_id: fallback.relay_node_id,
    relay_stream_id: fallback.relay_stream_id,
  });
  return true;
}

private udpSwarmPromotedDirectRouteHealthStateV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
): VoidUdpSwarmDirectRouteHealthObserverRouteStateV1 {
  const routedPeer = this.peers.get(context.peer_node_id);
  const directRouteLive =
    routedPeer === context.direct_peer &&
    routedPeer.handshakeDone &&
    !!routedPeer.authenticatedPublicPem &&
    routedPeer.transport === "direct" &&
    routedPeer.socket.destroyed !== true;
  const fallback =
    this.udpSwarmPromotedRelayFallbacks.get(context.peer_node_id);
  const relayFallbackLive =
    !!fallback &&
    fallback.session_id === context.session_id &&
    fallback.direct_peer === context.direct_peer &&
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      fallback.peer_node_id,
      fallback.relay_node_id,
      fallback.relay_stream_id,
    ) === fallback.relay_peer;
  return Object.freeze({
    authenticated_peer_node_id:
      directRouteLive && routedPeer ? routedPeer.id : null,
    direct_route_live: directRouteLive,
    direct_route_transport: routedPeer?.transport ?? null,
    relay_fallback_live: relayFallbackLive,
  });
}

private udpSwarmPromotedDirectRouteHealthContextForPeerV1(
  peer: Peer,
  sessionId: string,
): UdpSwarmPromotedDirectRouteHealthContextV1 | undefined {
  const context = this.udpSwarmPromotedDirectRouteHealth.get(peer.id);
  if (
    !context ||
    context.session_id !== sessionId ||
    context.peer_node_id !== peer.id ||
    context.direct_peer !== peer
  ) return;
  const routeState =
    this.udpSwarmPromotedDirectRouteHealthStateV1(context);
  if (
    !routeState.direct_route_live ||
    !routeState.relay_fallback_live ||
    routeState.authenticated_peer_node_id !== peer.id ||
    routeState.direct_route_transport !== "direct"
  ) return;
  return context;
}

private recordUdpSwarmPromotedDirectRouteHealthResultV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
  result: VoidUdpSwarmDirectRouteHealthProbeResultV1,
): boolean {
  if (result.outcome === "success") {
    return context.observer.recordSuccessfulRoundTrip(
      result.observed_at_ms,
      result.rtt_ms,
    );
  }
  return context.observer.recordFailedRoundTrip(
    result.observed_at_ms,
    result.reason,
  );
}

private handleUdpSwarmPromotedDirectRouteHealthMessageV1(
  peer: Peer,
  message: VoidUdpSwarmDirectRouteHealthProbeMessageV1,
  nowMs = Date.now(),
): boolean {
  const context =
    this.udpSwarmPromotedDirectRouteHealthContextForPeerV1(
      peer,
      message.session_id,
    );
  if (!context) return false;

  if (message.type === "UDP_SWARM_DIRECT_HEALTH_PING") {
    const pong = buildVoidUdpSwarmDirectRouteHealthPongV1(message);
    if (!pong) return false;
    this.sendRaw(peer, pong);
    return true;
  }

  const result = context.probe.acceptPong(message, nowMs);
  if (!result) return false;
  return this.recordUdpSwarmPromotedDirectRouteHealthResultV1(
    context,
    result,
  );
}

private sweepUdpSwarmPromotedDirectRouteHealthV1(
  nowMs = Date.now(),
): { probes_sent: number; failures_recorded: number } {
  let probesSent = 0;
  let failuresRecorded = 0;
  for (const context of this.udpSwarmPromotedDirectRouteHealth.values()) {
    const routeState =
      this.udpSwarmPromotedDirectRouteHealthStateV1(context);
    if (!routeState.direct_route_live || !routeState.relay_fallback_live) {
      continue;
    }

    const expired = context.probe.expirePending(nowMs);
    if (
      expired &&
      this.recordUdpSwarmPromotedDirectRouteHealthResultV1(
        context,
        expired,
      )
    ) {
      failuresRecorded += 1;
    }
    if (context.probe.poisoned) continue;
    if (context.probe.snapshot().pending_probe) continue;
    if (!Number.isSafeInteger(nowMs) || nowMs < context.next_probe_at_ms) {
      continue;
    }

    const ping = context.probe.createPing(nowMs);
    if (!ping) continue;
    const nextProbeAtMs =
      nowMs +
      VOID_P2P_UDP_SWARM_PROMOTED_DIRECT_HEALTH_PROBE_INTERVAL_MS_V1;
    context.next_probe_at_ms = Number.isSafeInteger(nextProbeAtMs)
      ? nextProbeAtMs
      : Number.MAX_SAFE_INTEGER;
    this.sendRaw(context.direct_peer, ping);
    probesSent += 1;
  }
  return {
    probes_sent: probesSent,
    failures_recorded: failuresRecorded,
  };
}


private udpSwarmPromotedRelayRetirementRevalidationV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
  nowMs: number,
): VoidUdpSwarmRelayRetirementRevalidationV1 {
  const binding = context.retirement.snapshot().binding;
  const routeState =
    this.udpSwarmPromotedDirectRouteHealthStateV1(context);
  const fallback =
    this.udpSwarmPromotedRelayFallbacks.get(binding.expected_peer_node_id);
  const exactDirectRouteBindingLive =
    this.udpSwarmPromotedDirectRouteHealth.get(
      binding.expected_peer_node_id,
    ) === context &&
    this.peers.get(binding.expected_peer_node_id) === context.direct_peer &&
    context.direct_peer.id === binding.expected_peer_node_id &&
    routeState.direct_route_live &&
    routeState.authenticated_peer_node_id === binding.expected_peer_node_id &&
    routeState.direct_route_transport === "direct";
  const exactRelayFallbackBindingLive =
    !!fallback &&
    fallback.session_id === binding.session_id &&
    fallback.peer_node_id === binding.expected_peer_node_id &&
    fallback.relay_node_id === binding.relay_node_id &&
    fallback.relay_stream_id === binding.relay_stream_id &&
    fallback.direct_peer === context.direct_peer &&
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      binding.expected_peer_node_id,
      binding.relay_node_id,
      binding.relay_stream_id,
    ) === fallback.relay_peer;
  return Object.freeze({
    session_id: binding.session_id,
    expected_peer_node_id: binding.expected_peer_node_id,
    authenticated_peer_node_id: routeState.authenticated_peer_node_id,
    relay_node_id: binding.relay_node_id,
    relay_stream_id: binding.relay_stream_id,
    direct_route_live: routeState.direct_route_live,
    direct_route_transport: routeState.direct_route_transport,
    relay_fallback_live: routeState.relay_fallback_live,
    exact_direct_route_binding_live: exactDirectRouteBindingLive,
    exact_relay_fallback_binding_live: exactRelayFallbackBindingLive,
    health_policy_decision: context.observer.evaluate(routeState, nowMs),
  });
}

private retireExactUdpSwarmPromotedRelayFallbackV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
  binding: VoidUdpSwarmRelayRetirementBindingV1,
  nowMs: number,
): boolean {
  const current =
    this.udpSwarmPromotedRelayRetirementRevalidationV1(context, nowMs);
  if (
    current.session_id !== binding.session_id ||
    current.expected_peer_node_id !== binding.expected_peer_node_id ||
    current.relay_node_id !== binding.relay_node_id ||
    current.relay_stream_id !== binding.relay_stream_id ||
    current.authenticated_peer_node_id !== binding.expected_peer_node_id ||
    !current.direct_route_live ||
    current.direct_route_transport !== "direct" ||
    !current.relay_fallback_live ||
    !current.exact_direct_route_binding_live ||
    !current.exact_relay_fallback_binding_live ||
    current.health_policy_decision.action !== "authorize_relay_retirement" ||
    current.health_policy_decision.relay_retirement_authorized !== true
  ) return false;

  const fallback =
    this.udpSwarmPromotedRelayFallbacks.get(binding.expected_peer_node_id);
  if (
    !fallback ||
    fallback.session_id !== binding.session_id ||
    fallback.peer_node_id !== binding.expected_peer_node_id ||
    fallback.relay_node_id !== binding.relay_node_id ||
    fallback.relay_stream_id !== binding.relay_stream_id ||
    fallback.direct_peer !== context.direct_peer ||
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      binding.expected_peer_node_id,
      binding.relay_node_id,
      binding.relay_stream_id,
    ) !== fallback.relay_peer
  ) return false;

  if (
    !this.udpSwarmPromotedRelayFallbacks.delete(
      binding.expected_peer_node_id,
    )
  ) return false;

  fallback.relay_peer.suppressReconnect = true;
  fallback.relay_peer.socket.destroy();
  console.warn("VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_V1_RETIRED", {
    peer_node_id: binding.expected_peer_node_id,
    session_id: binding.session_id,
    relay_node_id: binding.relay_node_id,
    relay_stream_id: binding.relay_stream_id,
  });
  return true;
}

private sweepUdpSwarmPromotedRelayRetirementV1(
  nowMs = Date.now(),
): { retirements_performed: number; terminal_failures: number } {
  let retirementsPerformed = 0;
  let terminalFailures = 0;
  for (const context of this.udpSwarmPromotedDirectRouteHealth.values()) {
    if (context.retirement.snapshot().phase !== "pending") continue;
    const result = context.retirement.execute({
      revalidate: () =>
        this.udpSwarmPromotedRelayRetirementRevalidationV1(
          context,
          nowMs,
        ),
      retireExactRelayFallback: (binding) =>
        this.retireExactUdpSwarmPromotedRelayFallbackV1(
          context,
          binding,
          nowMs,
        ),
    });
    if (result.ok === true) {
      context.relay_retired_at_ms = nowMs;
      context.relay_retirement_last_error = null;
      retirementsPerformed += 1;
      continue;
    }
    if (!result.terminal) continue;
    context.relay_retirement_last_error = result.error;
    terminalFailures += 1;
    console.warn("VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_V1_TERMINAL_FAILURE", {
      peer_node_id: context.peer_node_id,
      session_id: context.session_id,
      error: result.error,
      relay_retirement_performed: result.relay_retirement_performed,
    });
  }
  return {
    retirements_performed: retirementsPerformed,
    terminal_failures: terminalFailures,
  };
}

udpSwarmPromotedDirectRouteHealthSnapshotV1(nowMs = Date.now()) {
  const routes = [...this.udpSwarmPromotedDirectRouteHealth.values()]
    .map((context) => {
      const routeState =
        this.udpSwarmPromotedDirectRouteHealthStateV1(context);
      const policyDecision = context.observer.evaluate(
        routeState,
        nowMs,
      );
      const observer = context.observer.snapshot();
      const probe = context.probe.snapshot();
      const retirement = context.retirement.snapshot();
      return {
        session_id: context.session_id,
        peer_node_id: context.peer_node_id,
        promoted_at_ms: observer.promoted_at_ms,
        direct_route_live: routeState.direct_route_live,
        direct_route_transport: routeState.direct_route_transport,
        relay_fallback_live: routeState.relay_fallback_live,
        observer,
        probe,
        policy_decision: policyDecision,
        relay_retirement_authorized:
          policyDecision.relay_retirement_authorized,
        relay_retirement_phase: retirement.phase,
        relay_retirement_callback_attempted:
          retirement.retirement_callback_attempted,
        relay_retirement_performed: retirement.relay_retirement_performed,
        relay_retired_at_ms: context.relay_retired_at_ms,
        relay_retirement_last_error: context.relay_retirement_last_error,
      };
    })
    .sort((a, b) => a.peer_node_id.localeCompare(b.peer_node_id));
  return {
    promoted_health_route_count: routes.length,
    routes,
    relay_retirement_performed: routes.some(
      (entry) => entry.relay_retirement_performed === true,
    ),
    relay_retirement_indeterminate: routes.some(
      (entry) => entry.relay_retirement_performed === null,
    ),
  };
}


private captureUdpSwarmPostRetirementRecoveryAfterDirectCloseV1(
  peer: Peer,
): boolean {
  const healthContext = this.udpSwarmPromotedDirectRouteHealth.get(peer.id);
  const retirement = healthContext?.retirement.snapshot();
  this.udpSwarmPromotedDirectRouteHealth.delete(peer.id);

  const relayRestored = this.restoreUdpSwarmRelayFallbackAfterDirectCloseV1(peer);
  if (relayRestored) {
    this.udpSwarmPostRetirementRecovery.delete(peer.id);
    return false;
  }

  if (
    !healthContext ||
    !retirement ||
    retirement.phase !== "retired" ||
    retirement.retirement_callback_attempted !== true ||
    retirement.relay_retirement_performed !== true ||
    healthContext.relay_retired_at_ms === null ||
    retirement.binding.session_id !== healthContext.session_id ||
    retirement.binding.expected_peer_node_id !== peer.id ||
    healthContext.peer_node_id !== peer.id ||
    healthContext.direct_peer !== peer
  ) return false;

  const binding = retirement.binding;
  this.udpSwarmPostRetirementRecovery.set(peer.id, {
    session_id: binding.session_id,
    peer_node_id: binding.expected_peer_node_id,
    relay_node_id: binding.relay_node_id,
    retired_relay_stream_id: binding.relay_stream_id,
    relay_retired_at_ms: healthContext.relay_retired_at_ms,
    reacquisition_attempt_count: 0,
    last_reacquisition_attempt_at_ms: null,
    local_admission_retry_at_ms: null,
    last_request_id: null,
    last_error: null,
    last_decision_reason: null,
  });
  console.warn("VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_V1_ARMED", {
    peer_node_id: binding.expected_peer_node_id,
    session_id: binding.session_id,
    relay_node_id: binding.relay_node_id,
    retired_relay_stream_id: binding.relay_stream_id,
  });
  return true;
}

private udpSwarmPostRetirementNewerSessionPresentV1(
  context: UdpSwarmPostRetirementRecoveryContextV1,
): boolean {
  const health = this.udpSwarmPromotedDirectRouteHealth.get(context.peer_node_id);
  if (health && health.session_id !== context.session_id) return true;

  const fallback = this.udpSwarmPromotedRelayFallbacks.get(context.peer_node_id);
  if (fallback && fallback.session_id !== context.session_id) return true;

  for (const peer of this.udpSwarmDirectCandidates.values()) {
    const candidate = peer.udpSwarmDirectCandidate;
    if (
      candidate &&
      candidate.expected_peer_node_id === context.peer_node_id &&
      candidate.session_id !== context.session_id
    ) return true;
  }
  return false;
}

private udpSwarmPostRetirementRecoveryDecisionV1(
  context: UdpSwarmPostRetirementRecoveryContextV1,
  nowMs: number,
): VoidUdpSwarmPostRetirementRecoveryDecisionV1 {
  const routedPeer = this.peers.get(context.peer_node_id);
  const normalRouteLive = !!routedPeer &&
    routedPeer.handshakeDone &&
    !routedPeer.id.startsWith("?-") &&
    routedPeer.socket.destroyed !== true;
  const directRouteLive = normalRouteLive && routedPeer?.transport === "direct";

  const fallback = this.udpSwarmPromotedRelayFallbacks.get(context.peer_node_id);
  const relayFallbackLive = !!fallback &&
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      fallback.peer_node_id,
      fallback.relay_node_id,
      fallback.relay_stream_id,
    ) === fallback.relay_peer;

  const retiredRelayStreamLive = this.relayStreams.has(
    this.relayStreamKey(
      context.relay_node_id,
      context.retired_relay_stream_id,
    ),
  );
  const replacementRelayStreamLive = [...this.relayStreams.values()].some(
    (entry) =>
      entry.relay_node_id === context.relay_node_id &&
      entry.remote_node_id === context.peer_node_id &&
      entry.stream_id !== context.retired_relay_stream_id,
  );
  const recoveryInFlight = [...this.relayPendingConnects.values()].some(
    (pending) =>
      pending.relay_node_id === context.relay_node_id &&
      pending.target_node_id === context.peer_node_id,
  );
  const relayControlPeer = this.authenticatedDirectPeer(context.relay_node_id);

  return evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1({
    session_id: context.session_id,
    expected_peer_node_id: context.peer_node_id,
    relay_node_id: context.relay_node_id,
    retired_relay_stream_id: context.retired_relay_stream_id,
    retirement_phase: "retired",
    retirement_callback_attempted: true,
    relay_retirement_performed: true,
    relay_retired_at_ms: context.relay_retired_at_ms,
    node_stopping: this.stopping,
    newer_udp_swarm_session_present:
      this.udpSwarmPostRetirementNewerSessionPresentV1(context),
    direct_route_live: directRouteLive,
    normal_route_live: normalRouteLive,
    relay_fallback_live: relayFallbackLive,
    retired_relay_stream_live: retiredRelayStreamLive,
    replacement_relay_stream_live: replacementRelayStreamLive,
    recovery_in_flight: recoveryInFlight,
    relay_control_route_live: !!relayControlPeer,
    relay_control_route_transport: relayControlPeer?.transport ?? null,
    authenticated_relay_control_node_id: relayControlPeer?.id ?? null,
    reacquisition_attempt_count: context.reacquisition_attempt_count,
    last_reacquisition_attempt_at_ms:
      context.last_reacquisition_attempt_at_ms,
    now_ms: nowMs,
  });
}

private sweepUdpSwarmPostRetirementRecoveryV1(
  nowMs = Date.now(),
): {
  contexts: number;
  attempts_started: number;
  attempts_rejected: number;
  contexts_cleared: number;
} {
  let attemptsStarted = 0;
  let attemptsRejected = 0;
  let contextsCleared = 0;

  for (const [peerNodeId, context] of this.udpSwarmPostRetirementRecovery) {
    const decision = this.udpSwarmPostRetirementRecoveryDecisionV1(
      context,
      nowMs,
    );
    context.last_decision_reason = decision.reason;

    if (
      decision.reason === "normal_route_already_live" ||
      decision.reason === "direct_route_still_live" ||
      decision.reason === "newer_udp_swarm_session_present" ||
      decision.reason === "relay_fallback_already_live"
    ) {
      this.udpSwarmPostRetirementRecovery.delete(peerNodeId);
      contextsCleared += 1;
      continue;
    }

    if (
      decision.action !== "authorize_fresh_relay_reacquisition" ||
      decision.next_attempt_number === null
    ) continue;

    if (
      context.local_admission_retry_at_ms !== null &&
      nowMs < context.local_admission_retry_at_ms
    ) {
      context.last_decision_reason =
        "local_relay_admission_retry_interval_not_elapsed";
      continue;
    }

    const requestId = this.connectViaRelay(
      context.relay_node_id,
      context.peer_node_id,
    );
    context.last_request_id = requestId ?? null;
    if (requestId) {
      context.reacquisition_attempt_count = decision.next_attempt_number;
      context.last_reacquisition_attempt_at_ms = nowMs;
      context.local_admission_retry_at_ms = null;
      context.last_error = null;
      attemptsStarted += 1;
      console.warn("VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_V1_REQUESTED", {
        peer_node_id: context.peer_node_id,
        session_id: context.session_id,
        relay_node_id: context.relay_node_id,
        retired_relay_stream_id: context.retired_relay_stream_id,
        request_id: requestId,
        attempt_number: context.reacquisition_attempt_count,
      });
    } else {
      const retryAtMs =
        nowMs +
        VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1;
      context.local_admission_retry_at_ms = Number.isSafeInteger(retryAtMs)
        ? retryAtMs
        : Number.MAX_SAFE_INTEGER;
      context.last_error = "relay_connect_request_not_started";
      context.last_decision_reason = "local_relay_admission_rejected";
      attemptsRejected += 1;
    }
  }

  return {
    contexts: this.udpSwarmPostRetirementRecovery.size,
    attempts_started: attemptsStarted,
    attempts_rejected: attemptsRejected,
    contexts_cleared: contextsCleared,
  };
}

udpSwarmPostRetirementRecoverySnapshotV1(nowMs = Date.now()) {
  const recoveries = [...this.udpSwarmPostRetirementRecovery.values()]
    .map((context) => {
      const decision = this.udpSwarmPostRetirementRecoveryDecisionV1(
        context,
        nowMs,
      );
      return {
        session_id: context.session_id,
        peer_node_id: context.peer_node_id,
        relay_node_id: context.relay_node_id,
        retired_relay_stream_id: context.retired_relay_stream_id,
        relay_retired_at_ms: context.relay_retired_at_ms,
        reacquisition_attempt_count: context.reacquisition_attempt_count,
        last_reacquisition_attempt_at_ms:
          context.last_reacquisition_attempt_at_ms,
        local_admission_retry_at_ms: context.local_admission_retry_at_ms,
        local_admission_retry_active:
          context.local_admission_retry_at_ms !== null &&
          nowMs < context.local_admission_retry_at_ms,
        last_request_id: context.last_request_id,
        last_error: context.last_error,
        last_decision_reason: context.last_decision_reason,
        decision,
      };
    })
    .sort((a, b) => a.peer_node_id.localeCompare(b.peer_node_id));
  const activeRecoveryNetworkAttemptsStarted = recoveries.reduce(
    (total, entry) => total + entry.reacquisition_attempt_count,
    0,
  );
  return {
    recovery_context_count: recoveries.length,
    recoveries,
    active_recovery_network_attempts_started:
      activeRecoveryNetworkAttemptsStarted,
    verified_direct_evidence_persisted: false as const,
    production_udp_activation_performed: false as const,
  };
}

attachEphemeralDirectTransportV1(
    socket: PeerSocketV1,
    expectedNodeId: string,
    transportHint: string,
  ): boolean {
    if (
      this.stopping ||
      !/^[0-9a-f]{32}$/.test(expectedNodeId) ||
      expectedNodeId === this.id ||
      typeof transportHint !== "string" ||
      transportHint.length < 1 ||
      transportHint.length > 256 ||
      /[\s\u0000-\u001f\u007f]/.test(transportHint)
    ) return false;

    this.attachSocket(
      socket,
      transportHint,
      true,
      expectedNodeId,
      undefined,
      "direct",
      undefined,
      undefined,
      false,
    );
    return true;
  }

  private attachSocket(
    socket: PeerSocketV1,
    peerAddr: string,
    outgoing: boolean,
    expectedNodeId?: string,
    reconnectAddr?: string,
    transport: PeerTransportV1 = "direct",
    relayViaNodeId?: string,
    relayStreamId?: string,
    persistDirectEvidence = transport === "direct",
    punchCapable = false,
    directUpgradeSessionId?: string,
    reachabilityProbe?: ReachabilityProbeContext,
    udpSwarmDirectCandidate?: UdpSwarmAuthenticatedDirectCandidateContextV1,
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
      suppressReconnect: !!reachabilityProbe || !persistDirectEvidence,
      attachedAtMs: Date.now(),
      outboundSeenEmitted: false,
      probe: reachabilityProbe,
      transport,
      relayViaNodeId,
      relayStreamId,
      persistDirectEvidence,
      punchCapable,
      directUpgradeSessionId,
      udpSwarmDirectCandidate,
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
      if (peer.udpSwarmDirectCandidate) {
        const current = this.udpSwarmDirectCandidates.get(
          peer.udpSwarmDirectCandidate.session_id,
        );
        if (current === peer) {
          this.udpSwarmDirectCandidates.delete(
            peer.udpSwarmDirectCandidate.session_id,
          );
        }
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
      const closedNormalRoute = this.peers.get(peer.id) === peer;
      if (closedNormalRoute) this.peers.delete(peer.id);
      if (closedNormalRoute && peer.transport === "direct") {
        this.captureUdpSwarmPostRetirementRecoveryAfterDirectCloseV1(peer);
      }
      if (peer.directUpgradeSessionId) {
        this.directUpgradeLocalSessions.delete(peer.directUpgradeSessionId);
      }
      this.handlePeerTransportClose(peer);
      this.scheduleVerifiedPeerReconnect(peer);
    });
    socket.on("error", (error) => {
      console.warn(`[peer] error ${peer.id} (${peerAddr}):`, error.message);
    });

    this.peers.set(peer.id, peer);
    if (udpSwarmDirectCandidate) {
      this.udpSwarmDirectCandidates.set(
        udpSwarmDirectCandidate.session_id,
        peer,
      );
    }
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

    const retainedRelayFallback =
      peer.transport === "relay"
        ? this.udpSwarmPromotedRelayFallbacks.get(peer.id)
        : undefined;
    if (
      retainedRelayFallback?.relay_peer === peer &&
      this.peers.get(peer.id) !== peer
    ) {
      return;
    }

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

    const directHealthType = (msg as any)?.type;
    if (
      directHealthType === "UDP_SWARM_DIRECT_HEALTH_PING" ||
      directHealthType === "UDP_SWARM_DIRECT_HEALTH_PONG"
    ) {
      const healthMessage =
        normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1(msg);
      if (!healthMessage) {
        console.warn("VOID_P2P_UDP_SWARM_DIRECT_HEALTH_MOUNT_V1_REJECT", {
          peer_id: peer.id,
          reason: "invalid direct-route health message",
        });
        return;
      }
      this.handleUdpSwarmPromotedDirectRouteHealthMessageV1(
        peer,
        healthMessage,
      );
      return;
    }

    const udpSwarmMessage = normalizeVoidUdpSwarmControlMessageV1(
      msg,
      this.udpSwarmAllowNonPublicEndpoint,
    );
    if (udpSwarmMessage) {
      this.handleUdpSwarmAuthenticatedControl(peer, udpSwarmMessage);
      return;
    }

    if (isVoidRelayControlTypeV1((msg as any)?.type)) {
      const relayMessage = normalizeVoidRelayControlMessageV1(msg);
      if (!relayMessage) {
        console.warn("VOID_P2P_RELAY_RESERVATION_V1_REJECT", {
          peer_id: peer.id,
          reason: "invalid relay control message",
        });
        return;
      }
      this.onRelayControlMessage(peer, relayMessage);
      return;
    }

    if (isVoidDirectUpgradeControlTypeV1((msg as any)?.type)) {
      const directUpgradeMessage = normalizeVoidDirectUpgradeControlMessageV1(
        msg,
        this.directUpgradeAllowNonPublicCandidates,
      );
      if (!directUpgradeMessage) {
        console.warn("VOID_P2P_DIRECT_UPGRADE_RUNTIME_V1_REJECT", {
          peer_id: peer.id,
          reason: "invalid direct-upgrade control message",
        });
        return;
      }
      this.onDirectUpgradeControlMessage(peer, directUpgradeMessage);
      return;
    }

    if (msg.type === "PEERS") {
      const learned = canonicalizePeerAddressList(
        msg.addrs,
        this.MAX_LEARNED_PEER_ADVERTISEMENTS_PER_MESSAGE_V1,
      )
        .filter((address) => isPublicLearnedPeerAddressV1(address))
        .slice(0, this.MAX_LEARNED_PEER_DIALS_PER_MESSAGE_V1);

      for (const address of learned) {
        if (!this.shouldDialLearnedPeerV1(address)) continue;
        this.knownAddrs.add(address);
        this.connect(address, undefined, false);
      }
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

  private publicPeerExchangeAddrsV1(): string[] {
    const addrs = new Set<string>();
    for (const connectedPeer of this.peers.values()) {
      if (
        !connectedPeer.handshakeDone ||
        connectedPeer.transport !== "direct" ||
        !connectedPeer.persistDirectEvidence
      ) continue;
      for (const address of connectedPeer.listens) {
        if (isPublicLearnedPeerAddressV1(address)) addrs.add(address);
      }
    }
    for (const address of this.listenAddrs) {
      if (isPublicLearnedPeerAddressV1(address)) addrs.add(address);
    }
    return [...addrs];
  }

  private shouldDialLearnedPeerV1(addr: string): boolean {
    const canonical = canonicalPeerAddress(addr);
    if (!canonical || !isPublicLearnedPeerAddressV1(canonical)) return false;
    if (this.learnedPeerDialAttemptsV1.has(canonical)) return false;
    if (
      this.learnedPeerDialAttemptsV1.size >=
      this.MAX_LEARNED_PEER_DIALS_PER_RUNTIME_V1
    ) {
      return false;
    }
    if (!this.shouldDial(canonical)) return false;

    // Reserve the one-shot attempt before dialing so repeated PEERS messages
    // cannot race the same address into multiple pre-authentication attempts.
    this.learnedPeerDialAttemptsV1.add(canonical);
    return true;
  }

  private sendUdpSwarmControlDeliveries(
    deliveries: readonly VoidUdpSwarmControlDeliveryV1[],
  ): number {
    let sent = 0;
    for (const delivery of deliveries) {
      const recipient = this.authenticatedDirectPeer(delivery.recipient_node_id);
      if (!recipient) {
        console.warn("VOID_P2P_UDP_SWARM_NODE_CONTROL_V1_DELIVERY_HOLD", {
          recipient_node_id: delivery.recipient_node_id,
          reason: "authenticated direct control peer unavailable",
        });
        continue;
      }
      this.sendRaw(recipient, delivery.message);
      sent += 1;
    }
    return sent;
  }

  private handleUdpSwarmAuthenticatedControl(
    peer: Peer,
    message: VoidUdpSwarmControlMessageV1,
  ): void {
    if (peer.transport !== "direct") {
      console.warn("VOID_P2P_UDP_SWARM_NODE_CONTROL_V1_REJECT", {
        peer_id: peer.id,
        reason: "UDP swarm control requires authenticated direct control peer",
      });
      return;
    }
    try {
      const result = this.udpSwarmControl.handleAuthenticatedControl({
        fromNodeId: peer.id,
        message,
      });
      this.sendUdpSwarmControlDeliveries(result.control_deliveries);
      for (const action of result.udp_probe_actions) {
        this.onUdpSwarmProbeAction?.(action);
      }
      if (result.direct_upgrade_offer) {
        this.onUdpSwarmDirectUpgradeOffer?.(result.direct_upgrade_offer);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn("VOID_P2P_UDP_SWARM_NODE_CONTROL_V1_REJECT", {
        peer_id: peer.id,
        message_type: message.type,
        reason,
      });
      if (message.type === "UDP_SWARM_UPGRADE_REQUEST") {
        const rejection = normalizeVoidUdpSwarmControlMessageV1({
          type: "UDP_SWARM_UPGRADE_REJECT",
          protocol: 1,
          request_id: message.request_id,
          reason: "udp_swarm_upgrade_unavailable",
        });
        if (rejection?.type === "UDP_SWARM_UPGRADE_REJECT") {
          this.sendRaw(peer, rejection);
        }
      }
    }
  }

  requestUdpSwarmUpgradeV1(
    relayNodeId: string,
    targetNodeId: string,
    streamId: string,
  ): { ok: true; request_id: string } | { ok: false; error: string } {
    const relayPeer = this.authenticatedDirectPeer(relayNodeId);
    if (!relayPeer) return { ok: false, error: "relay_not_authenticated_direct" };
    try {
      const started = this.udpSwarmControl.beginUpgrade({
        relayNodeId,
        targetNodeId,
        streamId,
      });
      if (started.control_delivery.recipient_node_id !== relayNodeId) {
        throw new Error("UDP swarm request delivery relay mismatch");
      }
      this.sendRaw(relayPeer, started.control_delivery.message);
      return { ok: true, request_id: started.request_id };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  ingestUdpSwarmRendezvousProbeV1(
    packet: unknown,
    remoteAddress: string,
    remotePort: number,
  ):
    | { ok: true; control_deliveries_sent: number; observation: unknown }
    | { ok: false; error: string } {
    try {
      const result = this.udpSwarmControl.handleRelayUdpProbe({
        packet,
        remoteAddress,
        remotePort,
      });
      const sent = this.sendUdpSwarmControlDeliveries(
        result.control_deliveries,
      );
      return {
        ok: true,
        control_deliveries_sent: sent,
        observation: structuredClone(result.observation),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  udpSwarmControlSnapshot() {
    return this.udpSwarmControl.snapshot();
  }

  private relayStreamKey(relayNodeId: string, streamId: string): string {
    return `${relayNodeId}:${streamId}`;
  }

  private authenticatedDirectPeer(nodeId: string): Peer | undefined {
    const peer = this.peers.get(nodeId);
    if (!peer || !peer.handshakeDone || peer.id.startsWith("?-") || peer.transport !== "direct") return;
    return peer;
  }

  private activeRelayClientReservation(relayNodeId: string) {
    const reservation = this.relayClientReservations.get(relayNodeId);
    if (!reservation) return;
    if (reservation.expires_at_ms <= Date.now()) {
      this.relayClientReservations.delete(relayNodeId);
      return;
    }
    return reservation;
  }

  requestRelayReservation(
    relayNodeId: string,
    ttlMs = VOID_P2P_RELAY_DEFAULT_RESERVATION_TTL_MS_V1,
  ): string | undefined {
    const relayPeer = this.authenticatedDirectPeer(relayNodeId);
    if (
      !relayPeer ||
      relayNodeId === this.id ||
      this.relayPendingReservations.size >= VOID_P2P_RELAY_MAX_PENDING_REQUESTS_V1
    ) return;
    const requestId = newVoidRelayIdV1();
    const normalized = normalizeVoidRelayControlMessageV1({
      type: "RELAY_RESERVE",
      request_id: requestId,
      ttl_ms: ttlMs,
    });
    if (!normalized || normalized.type !== "RELAY_RESERVE") return;
    this.relayPendingReservations.set(requestId, {
      relay_node_id: relayNodeId,
      requested_ttl_ms: normalized.ttl_ms,
      requested_at_ms: Date.now(),
    });
    this.sendRaw(relayPeer, normalized);
    return requestId;
  }

  connectViaRelay(relayNodeId: string, targetNodeId: string): string | undefined {
    const relayPeer = this.authenticatedDirectPeer(relayNodeId);
    if (
      !relayPeer ||
      relayNodeId === this.id ||
      targetNodeId === this.id ||
      targetNodeId === relayNodeId ||
      !/^[0-9a-f]{32}$/.test(targetNodeId) ||
      this.relayPendingConnects.size >= VOID_P2P_RELAY_MAX_PENDING_REQUESTS_V1
    ) return;
    const requestId = newVoidRelayIdV1();
    this.relayPendingConnects.set(requestId, {
      relay_node_id: relayNodeId,
      target_node_id: targetNodeId,
      requested_at_ms: Date.now(),
    });
    this.sendRaw(relayPeer, {
      type: "RELAY_CONNECT",
      request_id: requestId,
      target_node_id: targetNodeId,
    });
    return requestId;
  }

  relaySnapshot() {
    this.sweepRelayClientState();
    const clientReservations = [...this.relayClientReservations.values()]
      .map((entry) => ({ ...entry }))
      .sort((a, b) => a.relay_node_id.localeCompare(b.relay_node_id));
    const streams = [...this.relayStreams.values()]
      .map((entry) => ({
        relay_node_id: entry.relay_node_id,
        remote_node_id: entry.remote_node_id,
        stream_id: entry.stream_id,
        outgoing: entry.outgoing,
        started: entry.started,
      }))
      .sort((a, b) =>
        a.relay_node_id.localeCompare(b.relay_node_id) ||
        a.stream_id.localeCompare(b.stream_id)
      );
    return {
      server_enabled: this.relayServerEnabled,
      client_reservations: clientReservations,
      streams,
      server: this.relayServerState.snapshot(),
    };
  }

  private stageRelayEndpoint(
    relayPeer: Peer,
    streamId: string,
    remoteNodeId: string,
    outgoing: boolean,
  ): boolean {
    if (relayPeer.transport !== "direct") return false;
    const key = this.relayStreamKey(relayPeer.id, streamId);
    const existing = this.relayStreams.get(key);
    if (existing) {
      return (
        existing.remote_node_id === remoteNodeId &&
        existing.outgoing === outgoing
      );
    }

    const perRelay = [...this.relayStreams.values()].filter(
      (entry) => entry.relay_node_id === relayPeer.id,
    ).length;
    if (
      this.relayStreams.size >= VOID_P2P_RELAY_MAX_STREAMS_V1 ||
      perRelay >= VOID_P2P_RELAY_MAX_STREAMS_PER_PEER_V1
    ) {
      return false;
    }

    const socket = new VoidRelayVirtualSocketV1(
      streamId,
      (dataB64) => this.sendRaw(relayPeer, {
        type: "RELAY_DATA",
        stream_id: streamId,
        data_b64: dataB64,
      }),
      (reason) => this.sendRaw(relayPeer, {
        type: "RELAY_CLOSE",
        stream_id: streamId,
        reason,
      }),
    );

    this.relayStreams.set(key, {
      relay_node_id: relayPeer.id,
      remote_node_id: remoteNodeId,
      stream_id: streamId,
      outgoing,
      started: false,
      socket,
    });
    this.sendRaw(relayPeer, { type: "RELAY_READY", stream_id: streamId });
    return true;
  }

  private startRelayEndpoint(relayPeer: Peer, streamId: string): void {
    const key = this.relayStreamKey(relayPeer.id, streamId);
    const entry = this.relayStreams.get(key);
    if (!entry || entry.started) return;
    entry.started = true;
    this.attachSocket(
      entry.socket,
      `relay:${relayPeer.id}/${streamId}->${entry.remote_node_id}`,
      entry.outgoing,
      entry.remote_node_id,
      undefined,
      "relay",
      relayPeer.id,
      streamId,
    );
    entry.socket.activate();
  }

  private finishRelayLocalStream(relayNodeId: string, streamId: string, reason: string): void {
    const key = this.relayStreamKey(relayNodeId, streamId);
    const entry = this.relayStreams.get(key);
    if (!entry) return;
    this.relayStreams.delete(key);
    entry.socket.remoteClose(reason);
    this.udpSwarmControl.sweep();
    this.sweepUdpSwarmAuthenticatedDirectCandidatesV1(
      "relay_fallback_stream_closed",
    );
  }

  private sendRelayCloseToNode(nodeId: string, streamId: string, reason: string): void {
    const peer = this.authenticatedDirectPeer(nodeId);
    if (!peer) return;
    this.sendRaw(peer, { type: "RELAY_CLOSE", stream_id: streamId, reason });
  }

  private closeRelayServerStream(
    stream: VoidRelayStreamRecordV1,
    reason: string,
    exceptNodeId?: string,
  ): void {
    for (const nodeId of [stream.source_node_id, stream.target_node_id]) {
      if (nodeId === exceptNodeId) continue;
      this.sendRelayCloseToNode(nodeId, stream.stream_id, reason);
    }
  }

  private sweepRelayClientState(nowMs = Date.now()): void {
    for (const [requestId, pending] of this.relayPendingReservations) {
      if (voidRelayRequestTimedOutV1(pending.requested_at_ms, nowMs)) {
        this.relayPendingReservations.delete(requestId);
      }
    }
    for (const [requestId, pending] of this.relayPendingConnects) {
      if (voidRelayRequestTimedOutV1(pending.requested_at_ms, nowMs)) {
        this.relayPendingConnects.delete(requestId);
      }
    }
    for (const [relayNodeId, reservation] of this.relayClientReservations) {
      if (reservation.expires_at_ms <= nowMs) {
        this.relayClientReservations.delete(relayNodeId);
      }
    }
  }

  private sweepRelayServerState(): void {
    if (!this.relayServerEnabled) return;
    for (const stream of this.relayServerState.sweep()) {
      this.closeRelayServerStream(stream, "relay_stream_expired");
    }
  }

  private handlePeerTransportClose(peer: Peer): void {
    if (peer.transport === "relay") {
      if (peer.relayViaNodeId && peer.relayStreamId) {
        const key = this.relayStreamKey(peer.relayViaNodeId, peer.relayStreamId);
        const entry = this.relayStreams.get(key);
        if (entry?.socket === peer.socket) {
          this.relayStreams.delete(key);
          this.udpSwarmControl.sweep();
        }
      }
      this.sweepUdpSwarmAuthenticatedDirectCandidatesV1(
        "relay_fallback_transport_closed",
      );
      return;
    }

    if (!peer.handshakeDone || peer.id.startsWith("?-")) return;

    this.udpSwarmControl.removeAuthenticatedPeer(peer.id);

    this.directUpgradeRelayState.removePeer(peer.id);
    for (const [requestId, pending] of this.directUpgradePendingRequests) {
      if (pending.relay_node_id === peer.id) {
        this.directUpgradePendingRequests.delete(requestId);
      }
    }
    for (const [sessionId, session] of this.directUpgradeLocalSessions) {
      if (session.relay_node_id === peer.id) {
        this.directUpgradeLocalSessions.delete(sessionId);
      }
    }

    if (this.relayServerEnabled) {
      for (const stream of this.relayServerState.removePeer(peer.id)) {
        this.closeRelayServerStream(stream, "relay_endpoint_disconnected", peer.id);
      }
    }

    this.relayClientReservations.delete(peer.id);
    for (const [requestId, pending] of this.relayPendingReservations) {
      if (pending.relay_node_id === peer.id) {
        this.relayPendingReservations.delete(requestId);
      }
    }
    for (const [requestId, pending] of this.relayPendingConnects) {
      if (pending.relay_node_id === peer.id) this.relayPendingConnects.delete(requestId);
    }
    for (const entry of [...this.relayStreams.values()]) {
      if (entry.relay_node_id === peer.id) {
        this.finishRelayLocalStream(entry.relay_node_id, entry.stream_id, "relay_transport_disconnected");
      }
    }
  }

  private rejectRelayRequest(peer: Peer, requestId: string, reason: string): void {
    this.sendRaw(peer, { type: "RELAY_REJECT", request_id: requestId, reason });
  }

  private onRelayControlMessage(peer: Peer, msg: VoidRelayControlMessageV1): void {
    this.sweepRelayServerState();

    if (msg.type === "RELAY_RESERVE") {
      if (!this.relayServerEnabled || peer.transport !== "direct") {
        this.rejectRelayRequest(peer, msg.request_id, "relay server disabled");
        return;
      }
      try {
        const reservation = this.relayServerState.reserve(peer.id, msg.ttl_ms);
        this.sendRaw(peer, {
          type: "RELAY_RESERVED",
          request_id: msg.request_id,
          reservation_id: reservation.reservation_id,
          ttl_ms: reservation.ttl_ms,
        });
      } catch (error) {
        this.rejectRelayRequest(peer, msg.request_id, error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (msg.type === "RELAY_CONNECT") {
      if (!this.relayServerEnabled || peer.transport !== "direct") {
        this.rejectRelayRequest(peer, msg.request_id, "relay server disabled");
        return;
      }
      if (msg.target_node_id === this.id || msg.target_node_id === peer.id) {
        this.rejectRelayRequest(peer, msg.request_id, "relay loop rejected");
        return;
      }
      const targetPeer = this.authenticatedDirectPeer(msg.target_node_id);
      if (!targetPeer) {
        this.rejectRelayRequest(peer, msg.request_id, "relay target is not directly authenticated");
        return;
      }
      try {
        const stream = this.relayServerState.openStream(peer.id, msg.target_node_id);
        this.sendRaw(peer, {
          type: "RELAY_CONNECTED",
          request_id: msg.request_id,
          stream_id: stream.stream_id,
          target_node_id: msg.target_node_id,
        });
        this.sendRaw(targetPeer, {
          type: "RELAY_INCOMING",
          stream_id: stream.stream_id,
          source_node_id: peer.id,
          target_node_id: msg.target_node_id,
          reservation_id: stream.target_reservation_id,
        });
      } catch (error) {
        this.rejectRelayRequest(peer, msg.request_id, error instanceof Error ? error.message : String(error));
      }
      return;
    }

    if (msg.type === "RELAY_READY") {
      if (
        !this.relayServerEnabled ||
        peer.transport !== "direct" ||
        !this.relayServerState.hasStream(msg.stream_id)
      ) return;
      try {
        const ready = this.relayServerState.markReady(peer.id, msg.stream_id);
        if (ready.started_now) {
          const sourcePeer = this.authenticatedDirectPeer(ready.stream.source_node_id);
          const targetPeer = this.authenticatedDirectPeer(ready.stream.target_node_id);
          if (!sourcePeer || !targetPeer) {
            const closed = this.relayServerState.closeStream(peer.id, msg.stream_id);
            if (closed) this.closeRelayServerStream(closed, "relay_endpoint_disconnected");
            return;
          }
          this.sendRaw(sourcePeer, { type: "RELAY_START", stream_id: msg.stream_id });
          this.sendRaw(targetPeer, { type: "RELAY_START", stream_id: msg.stream_id });
        }
      } catch (error) {
        console.warn("VOID_P2P_RELAY_RESERVATION_V1_READY_REJECT", {
          peer_id: peer.id,
          stream_id: msg.stream_id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (msg.type === "RELAY_DATA") {
      if (
        this.relayServerEnabled &&
        peer.transport === "direct" &&
        this.relayServerState.hasStream(msg.stream_id)
      ) {
        const decoded = decodeVoidRelayDataV1(msg.data_b64);
        if (!decoded) return;
        try {
          const routed = this.relayServerState.routeData(peer.id, msg.stream_id, decoded.length);
          const counterpart = this.authenticatedDirectPeer(routed.counterpart_node_id);
          if (!counterpart) {
            const closed = this.relayServerState.closeStream(peer.id, msg.stream_id);
            if (closed) this.closeRelayServerStream(closed, "relay_counterpart_disconnected", peer.id);
            return;
          }
          const relayFrameBytes = encode(msg).length;
          const queuedBytes = Number(counterpart.socket.writableLength ?? 0);
          if (
            !voidRelayWritableQueueWithinBoundV1(
              queuedBytes,
              relayFrameBytes,
            )
          ) {
            const closed = this.relayServerState.closeStream(
              peer.id,
              msg.stream_id,
            );
            if (closed) {
              this.closeRelayServerStream(
                closed,
                "relay_backpressure_limit",
              );
            }
            console.warn("VOID_P2P_RELAY_RESERVATION_V1_BACKPRESSURE_CLOSE", {
              stream_id: msg.stream_id,
              queued_bytes: queuedBytes,
              frame_bytes: relayFrameBytes,
              limit_bytes: VOID_P2P_RELAY_MAX_QUEUED_BYTES_V1,
            });
            return;
          }
          this.sendRaw(counterpart, msg);
        } catch (error) {
          console.warn("VOID_P2P_RELAY_RESERVATION_V1_DATA_REJECT", {
            peer_id: peer.id,
            stream_id: msg.stream_id,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }
      const local = this.relayStreams.get(this.relayStreamKey(peer.id, msg.stream_id));
      if (local) local.socket.feedBase64(msg.data_b64);
      return;
    }

    if (msg.type === "RELAY_CLOSE") {
      if (
        this.relayServerEnabled &&
        peer.transport === "direct" &&
        this.relayServerState.hasStream(msg.stream_id)
      ) {
        try {
          const closed = this.relayServerState.closeStream(peer.id, msg.stream_id);
          if (closed) this.closeRelayServerStream(closed, msg.reason, peer.id);
        } catch (error) {
          console.warn("VOID_P2P_RELAY_RESERVATION_V1_CLOSE_REJECT", {
            peer_id: peer.id,
            stream_id: msg.stream_id,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }
      this.finishRelayLocalStream(peer.id, msg.stream_id, msg.reason);
      return;
    }

    if (msg.type === "RELAY_RESERVED") {
      const pending = this.relayPendingReservations.get(msg.request_id);
      if (
        !pending ||
        pending.relay_node_id !== peer.id ||
        peer.transport !== "direct"
      ) return;
      this.relayPendingReservations.delete(msg.request_id);
      if (voidRelayRequestTimedOutV1(pending.requested_at_ms)) {
        console.warn("VOID_P2P_RELAY_RESERVATION_V1_REQUEST_TIMEOUT", {
          relay_node_id: peer.id,
          request_id: msg.request_id,
          kind: "reservation",
        });
        return;
      }
      const expiresAtMs = voidRelayClientExpiryV1(
        pending.requested_at_ms,
        pending.requested_ttl_ms,
        msg.ttl_ms,
      );
      if (expiresAtMs === undefined) {
        console.warn("VOID_P2P_RELAY_RESERVATION_V1_TTL_REJECT", {
          relay_node_id: peer.id,
          request_id: msg.request_id,
          requested_ttl_ms: pending.requested_ttl_ms,
          response_ttl_ms: msg.ttl_ms,
        });
        return;
      }
      this.relayClientReservations.set(peer.id, {
        relay_node_id: peer.id,
        reservation_id: msg.reservation_id,
        expires_at_ms: expiresAtMs,
      });
      return;
    }

    if (msg.type === "RELAY_CONNECTED") {
      const pending = this.relayPendingConnects.get(msg.request_id);
      if (
        !pending ||
        pending.relay_node_id !== peer.id ||
        pending.target_node_id !== msg.target_node_id ||
        peer.transport !== "direct"
      ) return;
      this.relayPendingConnects.delete(msg.request_id);
      if (voidRelayRequestTimedOutV1(pending.requested_at_ms)) {
        console.warn("VOID_P2P_RELAY_RESERVATION_V1_REQUEST_TIMEOUT", {
          relay_node_id: peer.id,
          request_id: msg.request_id,
          kind: "connect",
        });
        this.sendRaw(peer, {
          type: "RELAY_CLOSE",
          stream_id: msg.stream_id,
          reason: "relay_request_timed_out",
        });
        return;
      }
      if (!this.stageRelayEndpoint(peer, msg.stream_id, msg.target_node_id, true)) {
        this.sendRaw(peer, {
          type: "RELAY_CLOSE",
          stream_id: msg.stream_id,
          reason: "relay_client_capacity_reached",
        });
      }
      return;
    }

    if (msg.type === "RELAY_INCOMING") {
      const reservation = this.activeRelayClientReservation(peer.id);
      if (
        peer.transport !== "direct" ||
        msg.target_node_id !== this.id ||
        !reservation ||
        msg.reservation_id !== reservation.reservation_id
      ) return;
      if (!this.stageRelayEndpoint(peer, msg.stream_id, msg.source_node_id, false)) {
        this.sendRaw(peer, {
          type: "RELAY_CLOSE",
          stream_id: msg.stream_id,
          reason: "relay_client_capacity_reached",
        });
      }
      return;
    }

    if (msg.type === "RELAY_START") {
      this.startRelayEndpoint(peer, msg.stream_id);
      return;
    }

    if (msg.type === "RELAY_REJECT") {
      const pendingRelay = this.relayPendingReservations.get(msg.request_id);
      const pendingConnect = this.relayPendingConnects.get(msg.request_id);
      this.relayPendingReservations.delete(msg.request_id);
      this.relayPendingConnects.delete(msg.request_id);
      console.warn("VOID_P2P_RELAY_RESERVATION_V1_REQUEST_REJECT", {
        relay_node_id:
          pendingRelay?.relay_node_id ||
          pendingConnect?.relay_node_id ||
          peer.id,
        request_id: msg.request_id,
        reason: msg.reason,
      });
    }
  }


  private observedDirectUpgradeAddress(peer: Peer): string | undefined {
    if (peer.transport !== "direct") return;
    const remoteAddress = String(peer.socket.remoteAddress || "");
    const remotePort = Number(peer.socket.remotePort || 0);
    const formatted = formatPeerAddress(remoteAddress, remotePort);
    if (!formatted) return;
    return normalizeVoidDirectUpgradeObservedAddressV1(
      formatted,
      this.directUpgradeAllowNonPublicCandidates,
    );
  }

  private directUpgradeLocalBind(peer: Peer) {
    if (
      peer.transport !== "direct" ||
      !peer.punchCapable ||
      typeof peer.socket.localAddress !== "string" ||
      !Number.isSafeInteger(peer.socket.localPort) ||
      Number(peer.socket.localPort) < 1 ||
      Number(peer.socket.localPort) > 65535
    ) return;
    const localAddress = peer.socket.localAddress;
    if (net.isIP(localAddress) === 0) return;
    return {
      local_address: localAddress,
      local_port: Number(peer.socket.localPort),
    };
  }

  private relayServerStreamForDirectUpgrade(
    streamId: string,
    requesterNodeId: string,
    peerNodeId: string,
  ) {
    const stream = this.relayServerState
      .snapshot()
      .streams
      .find((entry) => entry.stream_id === streamId);
    if (!stream || !stream.started) return;
    const forward =
      stream.source_node_id === requesterNodeId &&
      stream.target_node_id === peerNodeId;
    const reverse =
      stream.target_node_id === requesterNodeId &&
      stream.source_node_id === peerNodeId;
    if (!forward && !reverse) return;
    return stream;
  }

  private async resolvePunchLocalAddress(
    host: string,
    port: number,
  ): Promise<string | undefined> {
    const configured = String(
      process.env.P2P_PUNCH_BIND_HOST ||
      process.env.P2P_BIND_HOST ||
      "",
    ).trim();
    if (
      configured &&
      configured !== "0.0.0.0" &&
      configured !== "::" &&
      net.isIP(configured) !== 0
    ) return configured;

    return await new Promise<string | undefined>((resolve) => {
      const socket = net.createConnection({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(undefined);
      }, 2_000);
      timer.unref?.();
      socket.once("connect", () => {
        clearTimeout(timer);
        const localAddress = String(socket.localAddress || "");
        socket.destroy();
        resolve(net.isIP(localAddress) !== 0 ? localAddress : undefined);
      });
      socket.once("error", () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(undefined);
      });
    });
  }

  async connectPunchCapableRelay(
    addr: string,
    expectedNodeId?: string,
    requestedLocalPort?: number,
  ): Promise<number | undefined> {
    if (!this.directUpgradeEnabled || this.stopping) return;
    const parsed = parsePeerAddress(addr);
    if (!parsed) return;
    const canonical = parsed.canonical;
    if (!this.shouldDial(canonical)) return;

    if (
      requestedLocalPort !== undefined &&
      (
        !Number.isSafeInteger(requestedLocalPort) ||
        requestedLocalPort < VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MIN_V1 ||
        requestedLocalPort > VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1
      )
    ) return;

    const pinnedNodeId =
      expectedNodeId || this.cachedExpectedNodeByAddress.get(canonical);

    // Reserve the dial slot before the asynchronous route/local-address probe.
    // Without this, concurrent punch-capable callers can both pass shouldDial()
    // and race into duplicate outer relay connections.
    this.dialing.add(canonical);
    try {
      const localAddress = await this.resolvePunchLocalAddress(
        parsed.host,
        parsed.port,
      );
      if (!localAddress || this.stopping) return;

      const attempts = requestedLocalPort !== undefined
        ? 1
        : VOID_P2P_DIRECT_UPGRADE_LOCAL_BIND_ATTEMPTS_V1;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const localPort = requestedLocalPort ??
          crypto.randomInt(
            VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MIN_V1,
            VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1 + 1,
          );
        const socket = new net.Socket();
        try {
          await new Promise<void>((resolve, reject) => {
            const onError = (error: Error) => {
              socket.off("error", onError);
              reject(error);
            };
            socket.once("error", onError);
            socket.connect(
              {
                host: parsed.host,
                port: parsed.port,
                localAddress,
                localPort,
              },
              () => {
                socket.off("error", onError);
                resolve();
              },
            );
          });

          console.log(
            `[dial] connected punch-capable relay ${canonical} from ${localAddress}:${localPort}`,
          );
          this.attachSocket(
            socket,
            canonical,
            true,
            pinnedNodeId,
            canonical,
            "direct",
            undefined,
            undefined,
            true,
            true,
          );
          return localPort;
        } catch (error) {
          socket.destroy();
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as any).code || "")
              : "";
          if (
            requestedLocalPort === undefined &&
            code === "EADDRINUSE"
          ) continue;
          console.warn(
            `[dial] punch-capable relay failed ${canonical}:`,
            error instanceof Error ? error.message : String(error),
          );
          return;
        }
      }

      console.warn(
        "VOID_P2P_DIRECT_UPGRADE_LOCAL_PORT_ALLOCATION_EXHAUSTED_V1",
        { address: canonical },
      );
      return;
    } finally {
      this.dialing.delete(canonical);
    }
  }

  requestDirectUpgrade(
    relayNodeId: string,
    targetNodeId: string,
    startDelayMs = 200,
    attemptTimeoutMs = 3_000,
  ): string | undefined {
    if (!this.directUpgradeEnabled) return;
    const relayPeer = this.authenticatedDirectPeer(relayNodeId);
    const targetPeer = this.peers.get(targetNodeId);
    if (
      !relayPeer ||
      !relayPeer.punchCapable ||
      !targetPeer ||
      !targetPeer.handshakeDone ||
      targetPeer.transport !== "relay" ||
      targetPeer.relayViaNodeId !== relayNodeId ||
      !targetPeer.relayStreamId ||
      this.directUpgradePendingRequests.size >=
        VOID_P2P_DIRECT_UPGRADE_MAX_PENDING_REQUESTS_V1
    ) return;

    const requestId = newVoidDirectUpgradeIdV1();
    const request = normalizeVoidDirectUpgradeControlMessageV1({
      type: "DIRECT_UPGRADE_REQUEST",
      request_id: requestId,
      stream_id: targetPeer.relayStreamId,
      target_node_id: targetNodeId,
      start_delay_ms: startDelayMs,
      attempt_timeout_ms: attemptTimeoutMs,
    }, this.directUpgradeAllowNonPublicCandidates);
    if (!request || request.type !== "DIRECT_UPGRADE_REQUEST") return;

    this.directUpgradePendingRequests.set(requestId, {
      relay_node_id: relayNodeId,
      target_node_id: targetNodeId,
      stream_id: targetPeer.relayStreamId,
      requested_at_ms: Date.now(),
    });
    this.sendRaw(relayPeer, request);
    return requestId;
  }

  directUpgradeSnapshot() {
    this.sweepDirectUpgradeState();
    return {
      enabled: this.directUpgradeEnabled,
      pending_requests: this.directUpgradePendingRequests.size,
      local_sessions: this.directUpgradeLocalSessions.size,
      relay: this.directUpgradeRelayState.snapshot(),
      local: [...this.directUpgradeLocalSessions.values()]
        .map((session) => ({
          session_id: session.session_id,
          relay_node_id: session.relay_node_id,
          stream_id: session.stream_id,
          remote_node_id: session.remote_node_id,
          peer_observed_address: session.peer_observed_address,
          started: session.started,
        }))
        .sort((a, b) => a.session_id.localeCompare(b.session_id)),
    };
  }

  private sweepDirectUpgradeState(nowMs = Date.now()): void {
    this.directUpgradeRelayState.sweep(nowMs);
    for (const [requestId, pending] of this.directUpgradePendingRequests) {
      if (voidDirectUpgradeRequestTimedOutV1(pending.requested_at_ms, nowMs)) {
        this.directUpgradePendingRequests.delete(requestId);
      }
    }
    for (const [sessionId, session] of this.directUpgradeLocalSessions) {
      if (session.expires_at_ms <= nowMs) {
        this.directUpgradeLocalSessions.delete(sessionId);
      }
    }
  }

  private matchIncomingDirectUpgrade(
    peerAddr: string,
  ): DirectUpgradeLocalSessionV1 | undefined {
    if (!this.directUpgradeEnabled) return;
    this.sweepDirectUpgradeState();
    const canonical = canonicalPeerAddress(peerAddr);
    if (!canonical) return;
    for (const session of this.directUpgradeLocalSessions.values()) {
      if (
        session.started &&
        session.peer_observed_address === canonical &&
        session.expires_at_ms > Date.now()
      ) return session;
    }
    return;
  }

  private completeDirectUpgradeSession(
    sessionId: string,
    authenticatedPeerId: string,
  ): void {
    const session = this.directUpgradeLocalSessions.get(sessionId);
    if (!session) return;
    if (session.remote_node_id !== authenticatedPeerId) return;
    this.directUpgradeLocalSessions.delete(sessionId);
    console.log("VOID_P2P_DIRECT_UPGRADE_RUNTIME_V1_PROMOTED", {
      session_id: sessionId,
      remote_node_id: authenticatedPeerId,
      relay_node_id: session.relay_node_id,
    });
  }

  private attemptDirectUpgradeSession(sessionId: string): void {
    const session = this.directUpgradeLocalSessions.get(sessionId);
    if (!session || !session.started || this.stopping) return;
    if (session.expires_at_ms <= Date.now()) {
      this.directUpgradeLocalSessions.delete(sessionId);
      return;
    }

    const relayPeer = this.authenticatedDirectPeer(session.relay_node_id);
    const bind = relayPeer ? this.directUpgradeLocalBind(relayPeer) : undefined;
    if (
      !relayPeer ||
      !relayPeer.punchCapable ||
      !bind ||
      bind.local_address !== session.local_address ||
      bind.local_port !== session.local_port
    ) {
      this.directUpgradeLocalSessions.delete(sessionId);
      return;
    }

    const parsed = parsePeerAddress(session.peer_observed_address);
    if (!parsed) {
      this.directUpgradeLocalSessions.delete(sessionId);
      return;
    }

    const socket = new net.Socket();
    let connected = false;
    const timeout = setTimeout(() => {
      if (!connected) socket.destroy();
    }, Math.min(
      session.attempt_timeout_ms,
      VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPT_TIMEOUT_MS_V1,
    ));
    timeout.unref?.();

    const onError = (error: Error) => {
      if (connected) return;
      clearTimeout(timeout);
      socket.destroy();
      this.directUpgradeLocalSessions.delete(sessionId);
      console.warn("VOID_P2P_DIRECT_UPGRADE_RUNTIME_V1_ATTEMPT_FAILED", {
        session_id: sessionId,
        remote_node_id: session.remote_node_id,
        reason: error.message,
      });
    };
    socket.once("error", onError);
    socket.connect(
      {
        host: parsed.host,
        port: parsed.port,
        localAddress: session.local_address,
        localPort: session.local_port,
      },
      () => {
        connected = true;
        clearTimeout(timeout);
        socket.off("error", onError);
        this.attachSocket(
          socket,
          session.peer_observed_address,
          true,
          session.remote_node_id,
          undefined,
          "direct",
          undefined,
          undefined,
          false,
          false,
          sessionId,
        );
      },
    );
  }

  private rejectDirectUpgradeRequest(
    peer: Peer,
    requestId: string,
    reason: string,
  ): void {
    this.sendRaw(peer, {
      type: "DIRECT_UPGRADE_REJECT",
      request_id: requestId,
      reason,
    });
  }

  private onDirectUpgradeControlMessage(
    peer: Peer,
    msg: VoidDirectUpgradeControlMessageV1,
  ): void {
    this.sweepDirectUpgradeState();

    if (msg.type === "DIRECT_UPGRADE_REQUEST") {
      if (
        !this.directUpgradeEnabled ||
        !this.relayServerEnabled ||
        peer.transport !== "direct"
      ) {
        this.rejectDirectUpgradeRequest(
          peer,
          msg.request_id,
          "direct-upgrade relay coordination disabled",
        );
        return;
      }

      const stream = this.relayServerStreamForDirectUpgrade(
        msg.stream_id,
        peer.id,
        msg.target_node_id,
      );
      const targetPeer = this.authenticatedDirectPeer(msg.target_node_id);
      if (!stream || !targetPeer) {
        this.rejectDirectUpgradeRequest(
          peer,
          msg.request_id,
          "direct-upgrade relay stream is not active",
        );
        return;
      }

      const sourceObserved = this.observedDirectUpgradeAddress(peer);
      const targetObserved = this.observedDirectUpgradeAddress(targetPeer);
      if (!sourceObserved || !targetObserved) {
        this.rejectDirectUpgradeRequest(
          peer,
          msg.request_id,
          "direct-upgrade public endpoint observation unavailable",
        );
        return;
      }

      try {
        const session = this.directUpgradeRelayState.openSession({
          requestId: msg.request_id,
          streamId: msg.stream_id,
          sourceNodeId: peer.id,
          targetNodeId: msg.target_node_id,
          sourceObservedAddress: sourceObserved,
          targetObservedAddress: targetObserved,
          startDelayMs: msg.start_delay_ms,
          attemptTimeoutMs: msg.attempt_timeout_ms,
          allowNonPublicObservedAddress:
            this.directUpgradeAllowNonPublicCandidates,
        });

        this.sendRaw(peer, {
          type: "DIRECT_UPGRADE_OFFER",
          request_id: msg.request_id,
          session_id: session.session_id,
          stream_id: session.stream_id,
          peer_node_id: session.target_node_id,
          peer_observed_address: session.target_observed_address,
          start_delay_ms: session.start_delay_ms,
          attempt_timeout_ms: session.attempt_timeout_ms,
        });
        this.sendRaw(targetPeer, {
          type: "DIRECT_UPGRADE_OFFER",
          request_id: msg.request_id,
          session_id: session.session_id,
          stream_id: session.stream_id,
          peer_node_id: session.source_node_id,
          peer_observed_address: session.source_observed_address,
          start_delay_ms: session.start_delay_ms,
          attempt_timeout_ms: session.attempt_timeout_ms,
        });
      } catch (error) {
        this.rejectDirectUpgradeRequest(
          peer,
          msg.request_id,
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }

    if (msg.type === "DIRECT_UPGRADE_OFFER") {
      if (
        !this.directUpgradeEnabled ||
        peer.transport !== "direct" ||
        !peer.punchCapable
      ) return;

      const localStream = this.relayStreams.get(
        this.relayStreamKey(peer.id, msg.stream_id),
      );
      const bind = this.directUpgradeLocalBind(peer);
      if (
        !localStream ||
        !localStream.started ||
        localStream.remote_node_id !== msg.peer_node_id ||
        !bind
      ) return;

      const pending = this.directUpgradePendingRequests.get(msg.request_id);
      if (pending) {
        if (
          pending.relay_node_id !== peer.id ||
          pending.target_node_id !== msg.peer_node_id ||
          pending.stream_id !== msg.stream_id
        ) return;
        this.directUpgradePendingRequests.delete(msg.request_id);
      }

      if (
        this.directUpgradeLocalSessions.size >=
          VOID_P2P_DIRECT_UPGRADE_MAX_PENDING_REQUESTS_V1
      ) return;

      const now = Date.now();
      const expiresAt =
        now + msg.start_delay_ms + msg.attempt_timeout_ms +
        VOID_P2P_DIRECT_UPGRADE_REQUEST_TIMEOUT_MS_V1;
      if (!Number.isSafeInteger(expiresAt)) return;

      const existing = this.directUpgradeLocalSessions.get(msg.session_id);
      if (existing) {
        if (
          existing.relay_node_id !== peer.id ||
          existing.stream_id !== msg.stream_id ||
          existing.remote_node_id !== msg.peer_node_id ||
          existing.peer_observed_address !== msg.peer_observed_address
        ) return;
      } else {
        this.directUpgradeLocalSessions.set(msg.session_id, {
          session_id: msg.session_id,
          relay_node_id: peer.id,
          stream_id: msg.stream_id,
          remote_node_id: msg.peer_node_id,
          peer_observed_address: msg.peer_observed_address,
          local_address: bind.local_address,
          local_port: bind.local_port,
          start_delay_ms: msg.start_delay_ms,
          attempt_timeout_ms: msg.attempt_timeout_ms,
          created_at_ms: now,
          expires_at_ms: expiresAt,
          started: false,
        });
      }

      this.sendRaw(peer, {
        type: "DIRECT_UPGRADE_READY",
        session_id: msg.session_id,
        stream_id: msg.stream_id,
      });
      return;
    }

    if (msg.type === "DIRECT_UPGRADE_READY") {
      if (
        !this.directUpgradeEnabled ||
        !this.relayServerEnabled ||
        peer.transport !== "direct"
      ) return;
      try {
        const ready = this.directUpgradeRelayState.markReady(
          peer.id,
          msg.session_id,
          msg.stream_id,
        );
        if (!ready.started_now) return;

        const sourcePeer =
          this.authenticatedDirectPeer(ready.session.source_node_id);
        const targetPeer =
          this.authenticatedDirectPeer(ready.session.target_node_id);
        if (!sourcePeer || !targetPeer) return;

        this.sendRaw(sourcePeer, {
          type: "DIRECT_UPGRADE_START",
          session_id: ready.session.session_id,
          stream_id: ready.session.stream_id,
        });
        this.sendRaw(targetPeer, {
          type: "DIRECT_UPGRADE_START",
          session_id: ready.session.session_id,
          stream_id: ready.session.stream_id,
        });
      } catch (error) {
        console.warn("VOID_P2P_DIRECT_UPGRADE_RUNTIME_V1_READY_REJECT", {
          peer_id: peer.id,
          session_id: msg.session_id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (msg.type === "DIRECT_UPGRADE_START") {
      if (!this.directUpgradeEnabled || peer.transport !== "direct") return;
      const session = this.directUpgradeLocalSessions.get(msg.session_id);
      if (
        !session ||
        session.relay_node_id !== peer.id ||
        session.stream_id !== msg.stream_id ||
        session.started
      ) return;
      session.started = true;
      setTimeout(() => {
        if (!this.stopping) {
          this.attemptDirectUpgradeSession(msg.session_id);
        }
      }, session.start_delay_ms).unref?.();
      return;
    }

    if (msg.type === "DIRECT_UPGRADE_REJECT") {
      this.directUpgradePendingRequests.delete(msg.request_id);
      console.warn("VOID_P2P_DIRECT_UPGRADE_RUNTIME_V1_REQUEST_REJECT", {
        relay_node_id: peer.id,
        request_id: msg.request_id,
        reason: msg.reason,
      });
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
    for (const p of this.peers.values()) {
      if (p.transport === "direct" && p.listens.includes(canonical)) return false;
    }
    return true;
  }
  connect(
    addr: string,
    expectedNodeId?: string,
    retryOnFailure = true,
  ) {
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

      // Third-party PEERS entries are unverified until authentication
      // completes. Their initial discovery dial is one-shot: a sender cannot
      // manufacture persistent retry loops toward arbitrary public targets.
      if (!retryOnFailure) return;

      const cur = this.backoff.get(canonical) ?? this.MIN_BACKOFF;
      const nxt = Math.min(cur * 2, this.MAX_BACKOFF);
      this.backoff.set(canonical, nxt);
      setTimeout(() => {
        if (!this.stopping) this.connect(canonical, pinnedNodeId, true);
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
