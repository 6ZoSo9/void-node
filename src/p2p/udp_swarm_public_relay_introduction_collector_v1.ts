// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { canonicalEd25519PublicPemV1, deriveVoidNodeIdFromPublicPemV1 } from "./auth_v1.js";
import { httpBaseFromP2P, isPublicLearnedPeerAddressV1 } from "../types/p2p.js";

export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1 =
  "VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1";
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_SCHEMA_V1 =
  "void_p2p_udp_swarm_public_relay_introduction_v1";
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_PATH_V1 =
  "/.well-known/void-p2p-udp-swarm-relay-introductions-v1.json";
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1 =
  256 * 1024;
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_SOURCES_V1 = 32;
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_TRANSPORTS_V1 = 16;
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MIN_TRANSPORTS_V1 = 2;
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_FETCH_TIMEOUT_MS_V1 =
  5_000;
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_INTERVAL_MIN_MS_V1 =
  10_000;
export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_INTERVAL_MAX_MS_V1 =
  10 * 60_000;

export const VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_AUTHORITY_V1 =
  Object.freeze({
    normal_void_peer_authentication_required: true,
    authenticated_public_key_binding_rechecked: true,
    manual_transport_addresses_required: false,
    public_numeric_peer_listen_addresses_only: true,
    minimum_independent_transport_sources: 2,
    transport_response_is_authority: false,
    signed_release_root_required_by_composition: true,
    signed_observation_quorum_required_by_composition: true,
    verified_runtime_activation_only: true,
    redirects_followed: false,
    arbitrary_url_input_accepted: false,
    peer_identity_exposed_in_status: false,
    transport_endpoint_exposed_in_status: false,
    deployment_performed: false,
    service_restart_performed: false,
    wallet_signer_validator_wc_money_authority: 0,
  });

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const DISCOVERY_ID_RE = /^voidpud1_[0-9a-f]{64}$/;
const ENVELOPE_KEYS_V1 = Object.freeze([
  "schema",
  "signed_record_id",
  "locator_mirrors",
  "discovery",
].sort());

type UnknownRecordV1 = Record<string, unknown>;

type PeerLikeV1 = Readonly<{
  id?: unknown;
  handshakeDone?: unknown;
  authenticatedPublicPem?: unknown;
  listens?: unknown;
  transport?: unknown;
}>;

export type VoidUdpSwarmPublicRelayIntroductionNodeV1 = Readonly<{
  id: string;
  peers: ReadonlyMap<string, unknown>;
}>;

export type VoidUdpSwarmAuthenticatedDiscoverySourceV1 = Readonly<{
  node_id: string;
  public_key_pem: string;
}>;

export type VoidUdpSwarmPublicRelayIntroductionTransportCandidateV1 =
  Readonly<{
    source_node_id: string;
    url: string;
  }>;

export type VoidUdpSwarmPublicRelayIntroductionEnvelopeV1 = Readonly<{
  schema: typeof VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_SCHEMA_V1;
  signed_record_id: unknown;
  locator_mirrors: readonly unknown[];
  discovery: UnknownRecordV1;
}>;

export type VoidUdpSwarmPublicRelayIntroductionCompositionInputV1 =
  Readonly<{
    signedRecordId: unknown;
    locatorMirrors: readonly unknown[];
    discovery: UnknownRecordV1;
    localNodeId: string;
    authenticatedDiscoverySources:
      readonly VoidUdpSwarmAuthenticatedDiscoverySourceV1[];
    nowMs: number;
  }>;

export type VoidUdpSwarmVerifiedDiscoveryCompositionImplementationV1 = (
  input: Readonly<Record<string, unknown>>,
) => Promise<unknown>;

type BootstrapFetchV1 = (input: unknown) => Promise<unknown>;

export type VoidUdpSwarmPublicRelayIntroductionCollectorOutcomeV1 =
  Readonly<{
    marker: typeof VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1;
    status: "activated" | "held";
    reason:
      | "activated"
      | "collector_stopped"
      | "run_already_in_progress"
      | "authenticated_peer_invariant_invalid"
      | "insufficient_authenticated_sources"
      | "insufficient_public_transport_sources"
      | "insufficient_matching_transport_responses"
      | "verified_composition_rejected"
      | "runtime_activation_rejected";
    authenticated_source_count: number;
    transport_candidate_count: number;
    successful_transport_count: number;
    matching_transport_group_count: number;
    activated: boolean;
    route_count: number;
  }>;

export type VoidUdpSwarmPublicRelayIntroductionCollectorOptionsV1 =
  Readonly<{
    node: VoidUdpSwarmPublicRelayIntroductionNodeV1;
    releaseRoot: unknown;
    fetchRecordBytes: BootstrapFetchV1;
    fetchManifestBytes: BootstrapFetchV1;
    composeVerifiedDiscovery?:
      VoidUdpSwarmVerifiedDiscoveryCompositionImplementationV1;
    activateVerifiedComposition: (raw: unknown) => Readonly<{
      route_count: number;
    }>;
    fetchIntroduction?: (
      candidate: VoidUdpSwarmPublicRelayIntroductionTransportCandidateV1,
    ) => Promise<unknown>;
    nowMs?: () => number;
    intervalMs?: number;
  }>;

export type VoidUdpSwarmPublicRelayIntroductionCollectorMountOptionsV1 =
  Omit<
    VoidUdpSwarmPublicRelayIntroductionCollectorOptionsV1,
    "node" | "activateVerifiedComposition"
  >;

function exactRecord(
  raw: unknown,
  keys: readonly string[],
  label: string,
): UnknownRecordV1 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${label} must be an object`);
  }
  const record = raw as UnknownRecordV1;
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys)) {
    throw new Error(`${label} keys mismatch`);
  }
  return record;
}

function canonicalValue(raw: unknown, depth = 0): unknown {
  if (depth > 32) throw new Error("introduction document nesting is too deep");
  if (
    raw === null ||
    typeof raw === "string" ||
    typeof raw === "boolean"
  ) {
    return raw;
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      throw new Error("introduction document contains a non-finite number");
    }
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => canonicalValue(entry, depth + 1));
  }
  if (raw && typeof raw === "object") {
    const record = raw as UnknownRecordV1;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalValue(record[key], depth + 1)]),
    );
  }
  throw new Error("introduction document is not canonical JSON data");
}

function canonicalJson(raw: unknown): string {
  return JSON.stringify(canonicalValue(raw));
}

function boundedDocument(raw: unknown): unknown {
  let parsed = raw;
  if (Buffer.isBuffer(raw) || raw instanceof Uint8Array) {
    const bytes = Buffer.from(raw);
    if (
      bytes.length < 2 ||
      bytes.length >
        VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1
    ) {
      throw new Error("introduction response bytes are outside their bound");
    }
    parsed = JSON.parse(bytes.toString("utf8"));
  } else if (typeof raw === "string") {
    const bytes = Buffer.byteLength(raw);
    if (
      bytes < 2 ||
      bytes > VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1
    ) {
      throw new Error("introduction response text is outside its bound");
    }
    parsed = JSON.parse(raw);
  }
  const canonical = canonicalJson(parsed);
  if (
    Buffer.byteLength(canonical) >
    VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1
  ) {
    throw new Error("introduction response object is outside its bound");
  }
  return parsed;
}

export function parseVoidUdpSwarmPublicRelayIntroductionEnvelopeV1(
  raw: unknown,
): VoidUdpSwarmPublicRelayIntroductionEnvelopeV1 {
  const value = exactRecord(
    boundedDocument(raw),
    ENVELOPE_KEYS_V1,
    "public relay introduction envelope",
  );
  if (
    value.schema !==
    VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_SCHEMA_V1
  ) {
    throw new Error("public relay introduction envelope schema mismatch");
  }
  if (
    !value.signed_record_id ||
    typeof value.signed_record_id !== "object" ||
    Array.isArray(value.signed_record_id)
  ) {
    throw new Error("public relay introduction signed record ID is invalid");
  }
  if (
    !Array.isArray(value.locator_mirrors) ||
    value.locator_mirrors.length < 3 ||
    value.locator_mirrors.length > 16
  ) {
    throw new Error("public relay introduction locator mirror count is invalid");
  }
  if (
    !value.discovery ||
    typeof value.discovery !== "object" ||
    Array.isArray(value.discovery) ||
    !DISCOVERY_ID_RE.test(
      String((value.discovery as UnknownRecordV1).discovery_id || ""),
    )
  ) {
    throw new Error("public relay introduction discovery identity is invalid");
  }
  return Object.freeze({
    schema: VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_SCHEMA_V1,
    signed_record_id: structuredClone(value.signed_record_id),
    locator_mirrors: Object.freeze(structuredClone(value.locator_mirrors)),
    discovery: Object.freeze(
      structuredClone(value.discovery) as UnknownRecordV1,
    ),
  });
}

function authenticatedPeerSnapshot(node: VoidUdpSwarmPublicRelayIntroductionNodeV1): {
  sources: readonly VoidUdpSwarmAuthenticatedDiscoverySourceV1[];
  transports: readonly VoidUdpSwarmPublicRelayIntroductionTransportCandidateV1[];
} {
  if (!NODE_ID_RE.test(node.id)) {
    throw new Error("collector local node ID is invalid");
  }
  const sources = new Map<
    string,
    VoidUdpSwarmAuthenticatedDiscoverySourceV1
  >();
  const transports: VoidUdpSwarmPublicRelayIntroductionTransportCandidateV1[] =
    [];

  for (const rawPeer of node.peers.values()) {
    const peer = rawPeer as PeerLikeV1;
    if (peer.handshakeDone !== true) continue;
    const nodeId = String(peer.id || "");
    const publicKeyPem = canonicalEd25519PublicPemV1(
      peer.authenticatedPublicPem,
    );
    if (
      !NODE_ID_RE.test(nodeId) ||
      nodeId === node.id ||
      !publicKeyPem ||
      deriveVoidNodeIdFromPublicPemV1(publicKeyPem) !== nodeId ||
      (peer.transport !== "direct" && peer.transport !== "relay") ||
      !Array.isArray(peer.listens)
    ) {
      throw new Error("authenticated peer invariant is invalid");
    }
    if (sources.has(nodeId)) {
      throw new Error("authenticated peer identity is duplicated");
    }
    sources.set(
      nodeId,
      Object.freeze({ node_id: nodeId, public_key_pem: publicKeyPem }),
    );

    const publicBases = (peer.listens as unknown[])
      .filter(
        (entry): entry is string =>
          typeof entry === "string" && isPublicLearnedPeerAddressV1(entry),
      )
      .map((entry) => httpBaseFromP2P(entry))
      .filter((entry): entry is string => typeof entry === "string")
      .sort();
    const publicBase = publicBases[0];
    if (publicBase) {
      transports.push(
        Object.freeze({
          source_node_id: nodeId,
          url: `${publicBase}${VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_PATH_V1}`,
        }),
      );
    }
  }

  if (
    sources.size >
    VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_SOURCES_V1
  ) {
    throw new Error("authenticated discovery source count exceeds its bound");
  }
  const sourceList = [...sources.values()].sort((a, b) =>
    a.node_id.localeCompare(b.node_id),
  );
  transports.sort(
    (a, b) =>
      a.source_node_id.localeCompare(b.source_node_id) ||
      a.url.localeCompare(b.url),
  );
  return {
    sources: Object.freeze(sourceList),
    transports: Object.freeze(
      transports.slice(
        0,
        VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_TRANSPORTS_V1,
      ),
    ),
  };
}

export async function fetchVoidUdpSwarmPublicRelayIntroductionV1(
  candidate: VoidUdpSwarmPublicRelayIntroductionTransportCandidateV1,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_FETCH_TIMEOUT_MS_V1,
  );
  timeout.unref?.();
  try {
    const response = await fetch(candidate.url, {
      method: "GET",
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status !== 200) {
      throw new Error("introduction transport returned a non-200 status");
    }
    const contentType = String(response.headers.get("content-type") || "")
      .toLowerCase()
      .split(";", 1)[0]
      ?.trim();
    if (contentType !== "application/json") {
      throw new Error("introduction transport content type is not JSON");
    }
    const contentLength = response.headers.get("content-length");
    if (
      contentLength &&
      (!/^\d+$/.test(contentLength) ||
        Number(contentLength) >
          VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1)
    ) {
      throw new Error("introduction transport content length is invalid");
    }
    if (!response.body) {
      throw new Error("introduction transport response body is unavailable");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let byteCount = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.byteLength === 0) continue;
        byteCount += value.byteLength;
        if (
          byteCount >
          VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MAX_BYTES_V1
        ) {
          await reader.cancel().catch(() => undefined);
          throw new Error("introduction transport response exceeds its bound");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return boundedDocument(Buffer.concat(chunks, byteCount));
  } finally {
    clearTimeout(timeout);
  }
}

function boundedInterval(raw: number | undefined): number {
  const interval = raw ?? 30_000;
  if (
    !Number.isSafeInteger(interval) ||
    interval <
      VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_INTERVAL_MIN_MS_V1 ||
    interval >
      VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_INTERVAL_MAX_MS_V1
  ) {
    throw new Error("public relay introduction interval is outside its bound");
  }
  return interval;
}

async function defaultVerifiedDiscoveryCompositionV1(): Promise<
  VoidUdpSwarmVerifiedDiscoveryCompositionImplementationV1
> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<Record<string, unknown>>;
  const module = await dynamicImport(
    new URL(
      "../../scripts/lib/void_p2p_udp_swarm_verified_discovery_composition_v1.mjs",
      import.meta.url,
    ).href,
  );
  const implementation =
    module.composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1;
  if (typeof implementation !== "function") {
    throw new Error("verified discovery composition module is unavailable");
  }
  return implementation as VoidUdpSwarmVerifiedDiscoveryCompositionImplementationV1;
}

export async function composeVoidP2pUdpSwarmRoutesFromPublicRelayIntroductionV1(
  input: VoidUdpSwarmPublicRelayIntroductionCompositionInputV1,
  dependencies: Readonly<{
    releaseRoot: unknown;
    fetchRecordBytes: BootstrapFetchV1;
    fetchManifestBytes: BootstrapFetchV1;
    composeVerifiedDiscovery?:
      VoidUdpSwarmVerifiedDiscoveryCompositionImplementationV1;
  }>,
): Promise<unknown> {
  if (typeof dependencies.fetchRecordBytes !== "function") {
    throw new Error("bootstrap record fetch callback is required");
  }
  if (typeof dependencies.fetchManifestBytes !== "function") {
    throw new Error("bootstrap manifest fetch callback is required");
  }
  const compose =
    dependencies.composeVerifiedDiscovery ??
    (await defaultVerifiedDiscoveryCompositionV1());
  return compose({
    releaseRoot: dependencies.releaseRoot,
    signedRecordId: input.signedRecordId,
    locatorMirrors: input.locatorMirrors,
    fetchRecordBytes: dependencies.fetchRecordBytes,
    fetchManifestBytes: dependencies.fetchManifestBytes,
    discovery: input.discovery,
    localNodeId: input.localNodeId,
    authenticatedDiscoverySources: input.authenticatedDiscoverySources,
    nowMs: input.nowMs,
  });
}

function outcome(
  reason: VoidUdpSwarmPublicRelayIntroductionCollectorOutcomeV1["reason"],
  counts: Readonly<{
    authenticatedSources?: number;
    transportCandidates?: number;
    successfulTransports?: number;
    matchingGroups?: number;
    routeCount?: number;
  }> = {},
): VoidUdpSwarmPublicRelayIntroductionCollectorOutcomeV1 {
  const activated = reason === "activated";
  return Object.freeze({
    marker: VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1,
    status: activated ? "activated" : "held",
    reason,
    authenticated_source_count: counts.authenticatedSources ?? 0,
    transport_candidate_count: counts.transportCandidates ?? 0,
    successful_transport_count: counts.successfulTransports ?? 0,
    matching_transport_group_count: counts.matchingGroups ?? 0,
    activated,
    route_count: counts.routeCount ?? 0,
  });
}

export class VoidUdpSwarmPublicRelayIntroductionCollectorV1 {
  private readonly intervalMs: number;
  private readonly nowMs: () => number;
  private readonly fetchIntroduction: (
    candidate: VoidUdpSwarmPublicRelayIntroductionTransportCandidateV1,
  ) => Promise<unknown>;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;
  private runCount = 0;
  private activationCount = 0;
  private heldCount = 0;
  private fetchRejectCount = 0;
  private compositionRejectCount = 0;
  private activationRejectCount = 0;
  private lastOutcome = outcome("insufficient_authenticated_sources");

  constructor(
    private readonly options: VoidUdpSwarmPublicRelayIntroductionCollectorOptionsV1,
  ) {
    if (typeof options.fetchRecordBytes !== "function") {
      throw new Error("bootstrap record fetch callback is required");
    }
    if (typeof options.fetchManifestBytes !== "function") {
      throw new Error("bootstrap manifest fetch callback is required");
    }
    if (
      options.composeVerifiedDiscovery !== undefined &&
      typeof options.composeVerifiedDiscovery !== "function"
    ) {
      throw new Error("verified discovery composition callback is invalid");
    }
    if (typeof options.activateVerifiedComposition !== "function") {
      throw new Error("verified runtime activation callback is required");
    }
    this.intervalMs = boundedInterval(options.intervalMs);
    this.nowMs = options.nowMs ?? Date.now;
    this.fetchIntroduction =
      options.fetchIntroduction ?? fetchVoidUdpSwarmPublicRelayIntroductionV1;
  }

  async start(): Promise<VoidUdpSwarmPublicRelayIntroductionCollectorOutcomeV1> {
    if (this.stopped) throw new Error("public relay introduction collector is stopped");
    if (this.timer) return this.lastOutcome;
    const first = await this.runOnce();
    if (this.stopped) return first;
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
    this.timer.unref?.();
    return first;
  }

  async runOnce(): Promise<VoidUdpSwarmPublicRelayIntroductionCollectorOutcomeV1> {
    if (this.stopped) return this.record(outcome("collector_stopped"));
    if (this.running) return outcome("run_already_in_progress");
    this.running = true;
    this.runCount += 1;
    try {
      let snapshot;
      try {
        snapshot = authenticatedPeerSnapshot(this.options.node);
      } catch {
        return this.record(outcome("authenticated_peer_invariant_invalid"));
      }
      const counts = {
        authenticatedSources: snapshot.sources.length,
        transportCandidates: snapshot.transports.length,
      };
      if (snapshot.sources.length < 2) {
        return this.record(
          outcome("insufficient_authenticated_sources", counts),
        );
      }
      if (
        snapshot.transports.length <
        VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MIN_TRANSPORTS_V1
      ) {
        return this.record(
          outcome("insufficient_public_transport_sources", counts),
        );
      }

      const fetched = await Promise.all(
        snapshot.transports.map(async (transport) => {
          try {
            const envelope =
              parseVoidUdpSwarmPublicRelayIntroductionEnvelopeV1(
                await this.fetchIntroduction(transport),
              );
            return Object.freeze({
              transport,
              envelope,
              canonical: canonicalJson(envelope),
            });
          } catch {
            this.fetchRejectCount += 1;
            return null;
          }
        }),
      );
      const successful = fetched.filter(
        (entry): entry is NonNullable<typeof entry> => entry !== null,
      );
      const groups = new Map<
        string,
        {
          envelope: VoidUdpSwarmPublicRelayIntroductionEnvelopeV1;
          sourceNodeIds: Set<string>;
        }
      >();
      for (const entry of successful) {
        const existing = groups.get(entry.canonical) ?? {
          envelope: entry.envelope,
          sourceNodeIds: new Set<string>(),
        };
        existing.sourceNodeIds.add(entry.transport.source_node_id);
        groups.set(entry.canonical, existing);
      }
      const matching = [...groups.entries()]
        .filter(
          ([, entry]) =>
            entry.sourceNodeIds.size >=
            VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_MIN_TRANSPORTS_V1,
        )
        .sort(([a], [b]) => a.localeCompare(b));
      const fullCounts = {
        ...counts,
        successfulTransports: successful.length,
        matchingGroups: matching.length,
      };
      if (matching.length === 0) {
        return this.record(
          outcome("insufficient_matching_transport_responses", fullCounts),
        );
      }

      let composition: unknown;
      for (const [, group] of matching) {
        try {
          const nowMs = this.nowMs();
          if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
            throw new Error("collector clock is invalid");
          }
          composition =
            await composeVoidP2pUdpSwarmRoutesFromPublicRelayIntroductionV1(
              {
                signedRecordId: group.envelope.signed_record_id,
                locatorMirrors: group.envelope.locator_mirrors,
                discovery: group.envelope.discovery,
                localNodeId: this.options.node.id,
                authenticatedDiscoverySources: snapshot.sources,
                nowMs,
              },
              {
                releaseRoot: this.options.releaseRoot,
                fetchRecordBytes: this.options.fetchRecordBytes,
                fetchManifestBytes: this.options.fetchManifestBytes,
                composeVerifiedDiscovery:
                  this.options.composeVerifiedDiscovery,
              },
            );
          break;
        } catch {
          this.compositionRejectCount += 1;
        }
      }
      if (composition === undefined) {
        return this.record(
          outcome("verified_composition_rejected", fullCounts),
        );
      }

      try {
        const activated = this.options.activateVerifiedComposition(composition);
        return this.record(
          outcome("activated", {
            ...fullCounts,
            routeCount: activated.route_count,
          }),
        );
      } catch {
        this.activationRejectCount += 1;
        return this.record(
          outcome("runtime_activation_rejected", fullCounts),
        );
      }
    } finally {
      this.running = false;
    }
  }

  status(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      marker: VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_COLLECTOR_V1,
      started: this.timer !== null,
      stopped: this.stopped,
      running: this.running,
      last_outcome: this.lastOutcome,
      counters: Object.freeze({
        runs: this.runCount,
        activations: this.activationCount,
        held: this.heldCount,
        fetch_rejects: this.fetchRejectCount,
        composition_rejects: this.compositionRejectCount,
        activation_rejects: this.activationRejectCount,
      }),
      privacy: Object.freeze({
        peer_identity_exposed: false,
        transport_endpoint_exposed: false,
        discovery_identity_exposed: false,
      }),
      authority: VOID_P2P_UDP_SWARM_PUBLIC_RELAY_INTRODUCTION_AUTHORITY_V1,
    });
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private record(
    value: VoidUdpSwarmPublicRelayIntroductionCollectorOutcomeV1,
  ): VoidUdpSwarmPublicRelayIntroductionCollectorOutcomeV1 {
    this.lastOutcome = value;
    if (value.activated) this.activationCount += 1;
    else this.heldCount += 1;
    return value;
  }
}
