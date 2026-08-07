// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as net from "node:net";

import {
  parsePeerAddress,
  type ParsedPeerAddress,
} from "../types/p2p.js";

export const VOID_P2P_REACHABILITY_OBSERVATION_SCHEMA_V1 =
  "void_p2p_reachability_observation_v1";
export const VOID_P2P_REACHABILITY_NETWORK_V1 = "VOID Network";
export const VOID_P2P_REACHABILITY_CHAIN_ID_V1 = 2050;
export const VOID_P2P_REACHABILITY_MAX_AGE_MS_V1 = 15 * 60 * 1000;
export const VOID_P2P_REACHABILITY_MAX_OBSERVATIONS_V1 = 64;
export const VOID_P2P_REACHABILITY_MIN_OBSERVERS_V1 = 2;
export const VOID_P2P_REACHABILITY_MIN_FAILURE_DOMAINS_V1 = 2;

export type VoidP2PReachabilityObservationKindV1 =
  | "authenticated_outbound_seen"
  | "authenticated_dialback";

export type VoidP2PReachabilityObservationOutcomeV1 =
  | "success"
  | "failure";

export type VoidP2PReachabilityObservationV1 = Readonly<{
  schema: "void_p2p_reachability_observation_v1";
  network: "VOID Network";
  chain_id: 2050;
  subject_node_id: string;
  observer_node_id: string;
  observer_failure_domain: string;
  observed_at: string;
  kind: VoidP2PReachabilityObservationKindV1;
  candidate_address: string;
  outcome: VoidP2PReachabilityObservationOutcomeV1;
  authenticated_subject_id: string | null;
  latency_ms: number | null;
  authority: Readonly<{
    private_routes_exposed: false;
    wallet_authority: false;
    signer_authority: false;
    validator_authority: false;
    treasury_authority: false;
    work_credit_authority: false;
    money_movement_authority: false;
  }>;
  observation_id: string;
}>;

export type VoidP2PReachabilityRuntimeClassificationNameV1 =
  | "direct_confirmed"
  | "direct_observed_unconfirmed"
  | "outbound_observed"
  | "non_public_address"
  | "unknown";

export type VoidP2PReachabilityRuntimeClassificationV1 = Readonly<{
  subject_node_id: string;
  candidate_address: string;
  classification: VoidP2PReachabilityRuntimeClassificationNameV1;
  evidence_ids: string[];
  counts: Readonly<{
    fresh_observations: number;
    outbound_successes: number;
    dialback_successes: number;
    dialback_failures: number;
    independent_success_domains: number;
    independent_success_observers: number;
  }>;
}>;

const OBSERVATION_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "subject_node_id",
  "observer_node_id",
  "observer_failure_domain",
  "observed_at",
  "kind",
  "candidate_address",
  "outcome",
  "authenticated_subject_id",
  "latency_ms",
  "authority",
  "observation_id",
]);

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const REQUEST_ID_RE = /^[0-9a-f]{32}$/;
const FAILURE_DOMAIN_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const NON_PUBLIC_V4 = new net.BlockList();
const NON_PUBLIC_V4_SUBNETS: ReadonlyArray<readonly [string, number]> = [
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
for (const [network, prefix] of NON_PUBLIC_V4_SUBNETS) {
  NON_PUBLIC_V4.addSubnet(network, prefix, "ipv4");
}

const NON_PUBLIC_V6 = new net.BlockList();
const NON_PUBLIC_V6_SUBNETS: ReadonlyArray<readonly [string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];
for (const [network, prefix] of NON_PUBLIC_V6_SUBNETS) {
  NON_PUBLIC_V6.addSubnet(network, prefix, "ipv6");
}

function exactObjectKeys(
  raw: unknown,
  expected: readonly string[],
): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const object = raw as Record<string, unknown>;
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length) return;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] !== wanted[index]) return;
  }
  return object;
}

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON cannot contain non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalize(object[key])]),
    );
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function canonicalVoidReachabilityJsonV1(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function contentId(
  prefix: string,
  value: Record<string, unknown>,
  idField: string,
): string {
  const body = structuredClone(value);
  delete body[idField];
  return `${prefix}${crypto
    .createHash("sha256")
    .update(canonicalVoidReachabilityJsonV1(body))
    .digest("hex")}`;
}

function zeroAuthority() {
  return Object.freeze({
    private_routes_exposed: false as const,
    wallet_authority: false as const,
    signer_authority: false as const,
    validator_authority: false as const,
    treasury_authority: false as const,
    work_credit_authority: false as const,
    money_movement_authority: false as const,
  });
}

function requireNodeId(raw: unknown, label: string): string {
  const value = typeof raw === "string" ? raw : "";
  if (!NODE_ID_RE.test(value)) {
    throw new Error(`${label} must be 32 lowercase hex characters`);
  }
  return value;
}

export function normalizeVoidReachabilityFailureDomainV1(
  raw: unknown,
): string | undefined {
  const value = typeof raw === "string" ? raw : "";
  return FAILURE_DOMAIN_RE.test(value) ? value : undefined;
}

export function isVoidReachabilityRequestIdV1(raw: unknown): raw is string {
  return typeof raw === "string" && REQUEST_ID_RE.test(raw);
}

export function newVoidReachabilityRequestIdV1(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function parseVoidReachabilityCandidateAddressV1(
  raw: unknown,
): ParsedPeerAddress | undefined {
  if (typeof raw !== "string") return;
  const parsed = parsePeerAddress(raw);
  if (!parsed || (parsed.family !== 4 && parsed.family !== 6)) return;
  if (parsed.canonical !== raw) return;
  return parsed;
}

export function isVoidPublicDirectCandidateV1(raw: unknown): boolean {
  const parsed = parseVoidReachabilityCandidateAddressV1(raw);
  if (!parsed) return false;
  if (parsed.family === 4) {
    return !NON_PUBLIC_V4.check(parsed.host, "ipv4");
  }
  if (NON_PUBLIC_V6.check(parsed.host, "ipv6")) return false;
  const first = parsed.host.split(":", 1)[0] || "0";
  const firstHextet = Number.parseInt(first, 16);
  return (
    Number.isInteger(firstHextet) &&
    firstHextet >= 0x2000 &&
    firstHextet <= 0x3fff
  );
}

function requireTimestamp(raw: unknown, label: string): {
  iso: string;
  ms: number;
} {
  const ms = Date.parse(String(raw));
  if (!Number.isFinite(ms)) throw new Error(`${label} is invalid`);
  return { iso: new Date(ms).toISOString(), ms };
}

function validateAuthority(raw: unknown): void {
  const object = exactObjectKeys(raw, AUTHORITY_KEYS);
  if (!object) throw new Error("reachability authority keys mismatch");
  for (const key of AUTHORITY_KEYS) {
    if (object[key] !== false) {
      throw new Error(`reachability authority ${key} must be false`);
    }
  }
}

function validateObservationSemantics(
  observation: VoidP2PReachabilityObservationV1,
): void {
  if (observation.subject_node_id === observation.observer_node_id) {
    throw new Error("subject and observer node IDs must differ");
  }
  if (
    observation.kind !== "authenticated_outbound_seen" &&
    observation.kind !== "authenticated_dialback"
  ) {
    throw new Error("reachability observation kind is invalid");
  }
  if (
    observation.outcome !== "success" &&
    observation.outcome !== "failure"
  ) {
    throw new Error("reachability observation outcome is invalid");
  }
  if (
    observation.kind === "authenticated_outbound_seen" &&
    observation.outcome !== "success"
  ) {
    throw new Error("authenticated outbound observation must succeed");
  }

  if (observation.outcome === "success") {
    if (
      observation.authenticated_subject_id !== observation.subject_node_id
    ) {
      throw new Error(
        "successful observation must authenticate exact subject identity",
      );
    }
    if (
      !Number.isSafeInteger(observation.latency_ms) ||
      (observation.latency_ms as number) < 0 ||
      (observation.latency_ms as number) > 60_000
    ) {
      throw new Error("successful observation latency is invalid");
    }
  } else if (
    observation.authenticated_subject_id !== null ||
    observation.latency_ms !== null
  ) {
    throw new Error(
      "failed observation must not claim identity or latency",
    );
  }
}

export function createVoidP2PReachabilityObservationV1(input: Readonly<{
  subjectNodeId: string;
  observerNodeId: string;
  observerFailureDomain: string;
  observedAt: string;
  kind: VoidP2PReachabilityObservationKindV1;
  candidateAddress: string;
  outcome: VoidP2PReachabilityObservationOutcomeV1;
  authenticatedSubjectId?: string | null;
  latencyMs?: number | null;
}>): VoidP2PReachabilityObservationV1 {
  const candidate = parseVoidReachabilityCandidateAddressV1(
    input.candidateAddress,
  );
  if (!candidate) throw new Error("candidate address is not canonical IP:port");

  const failureDomain = normalizeVoidReachabilityFailureDomainV1(
    input.observerFailureDomain,
  );
  if (!failureDomain) throw new Error("observer failure domain is invalid");

  const observed = requireTimestamp(input.observedAt, "observed_at");
  const body = {
    schema: VOID_P2P_REACHABILITY_OBSERVATION_SCHEMA_V1,
    network: VOID_P2P_REACHABILITY_NETWORK_V1 as "VOID Network",
    chain_id: VOID_P2P_REACHABILITY_CHAIN_ID_V1 as 2050,
    subject_node_id: requireNodeId(input.subjectNodeId, "subject node ID"),
    observer_node_id: requireNodeId(input.observerNodeId, "observer node ID"),
    observer_failure_domain: failureDomain,
    observed_at: observed.iso,
    kind: input.kind,
    candidate_address: candidate.canonical,
    outcome: input.outcome,
    authenticated_subject_id:
      input.authenticatedSubjectId === undefined
        ? null
        : input.authenticatedSubjectId,
    latency_ms: input.latencyMs === undefined ? null : input.latencyMs,
    authority: zeroAuthority(),
  };
  validateObservationSemantics(
    body as VoidP2PReachabilityObservationV1,
  );
  const observation = Object.freeze({
    ...body,
    observation_id: contentId(
      "voidpro1_",
      body as unknown as Record<string, unknown>,
      "observation_id",
    ),
  });
  return observation as VoidP2PReachabilityObservationV1;
}

export function validateVoidP2PReachabilityObservationV1(
  raw: unknown,
  {
    nowMs = Date.now(),
    maxAgeMs = VOID_P2P_REACHABILITY_MAX_AGE_MS_V1,
  }: Readonly<{ nowMs?: number; maxAgeMs?: number }> = {},
): Readonly<{
  observation: VoidP2PReachabilityObservationV1;
  observedMs: number;
  stale: boolean;
}> {
  const object = exactObjectKeys(raw, OBSERVATION_KEYS);
  if (!object) throw new Error("reachability observation keys mismatch");

  if (
    object.schema !== VOID_P2P_REACHABILITY_OBSERVATION_SCHEMA_V1 ||
    object.network !== VOID_P2P_REACHABILITY_NETWORK_V1 ||
    object.chain_id !== VOID_P2P_REACHABILITY_CHAIN_ID_V1
  ) {
    throw new Error("reachability observation network contract mismatch");
  }

  requireNodeId(object.subject_node_id, "subject node ID");
  requireNodeId(object.observer_node_id, "observer node ID");
  if (!normalizeVoidReachabilityFailureDomainV1(object.observer_failure_domain)) {
    throw new Error("observer failure domain is invalid");
  }
  if (!parseVoidReachabilityCandidateAddressV1(object.candidate_address)) {
    throw new Error("candidate address is invalid");
  }
  validateAuthority(object.authority);

  const observation =
    structuredClone(object) as unknown as VoidP2PReachabilityObservationV1;
  validateObservationSemantics(observation);

  if (
    !Number.isSafeInteger(maxAgeMs) ||
    maxAgeMs < 1_000 ||
    maxAgeMs > 24 * 60 * 60 * 1_000
  ) {
    throw new Error("maximum observation age is invalid");
  }
  if (!Number.isFinite(nowMs)) {
    throw new Error("reachability validation time is invalid");
  }

  const observed = requireTimestamp(observation.observed_at, "observed_at");
  if (observed.ms > nowMs + 5 * 60 * 1_000) {
    throw new Error("reachability observation is from the future");
  }

  const expectedId = contentId(
    "voidpro1_",
    observation as unknown as Record<string, unknown>,
    "observation_id",
  );
  if (observation.observation_id !== expectedId) {
    throw new Error("reachability observation ID does not match content");
  }

  return Object.freeze({
    observation: Object.freeze(
      structuredClone(observation),
    ) as VoidP2PReachabilityObservationV1,
    observedMs: observed.ms,
    stale: nowMs - observed.ms > maxAgeMs,
  });
}

export function classifyVoidP2PReachabilityRuntimeV1(
  rawObservations: readonly unknown[],
  {
    nowMs = Date.now(),
    maxAgeMs = VOID_P2P_REACHABILITY_MAX_AGE_MS_V1,
  }: Readonly<{ nowMs?: number; maxAgeMs?: number }> = {},
): VoidP2PReachabilityRuntimeClassificationV1 {
  if (
    !Array.isArray(rawObservations) ||
    rawObservations.length < 1 ||
    rawObservations.length >
      VOID_P2P_REACHABILITY_MAX_OBSERVATIONS_V1
  ) {
    throw new Error("runtime reachability classification evidence count is invalid");
  }

  const validated = rawObservations.map((raw) =>
    validateVoidP2PReachabilityObservationV1(raw, { nowMs, maxAgeMs }),
  );
  const subjectNodeId = validated[0].observation.subject_node_id;
  const candidateAddress = validated[0].observation.candidate_address;
  const ids = new Set<string>();

  for (const entry of validated) {
    const observation = entry.observation;
    if (observation.subject_node_id !== subjectNodeId) {
      throw new Error("runtime observations must share one subject");
    }
    if (observation.candidate_address !== candidateAddress) {
      throw new Error("runtime observations must share one candidate");
    }
    if (ids.has(observation.observation_id)) {
      throw new Error("runtime observations contain duplicate evidence");
    }
    ids.add(observation.observation_id);
  }

  const fresh = validated
    .filter((entry) => !entry.stale)
    .map((entry) => entry.observation);
  const outbound = fresh.filter(
    (entry) =>
      entry.kind === "authenticated_outbound_seen" &&
      entry.outcome === "success",
  );
  const successes = fresh.filter(
    (entry) =>
      entry.kind === "authenticated_dialback" &&
      entry.outcome === "success",
  );
  const failures = fresh.filter(
    (entry) =>
      entry.kind === "authenticated_dialback" &&
      entry.outcome === "failure",
  );
  const successObservers = new Set(
    successes.map((entry) => entry.observer_node_id),
  );
  const successDomains = new Set(
    successes.map((entry) => entry.observer_failure_domain),
  );

  const directConfirmed =
    successObservers.size >= VOID_P2P_REACHABILITY_MIN_OBSERVERS_V1 &&
    successDomains.size >= VOID_P2P_REACHABILITY_MIN_FAILURE_DOMAINS_V1;

  let classification: VoidP2PReachabilityRuntimeClassificationNameV1;
  if (!isVoidPublicDirectCandidateV1(candidateAddress)) {
    classification = "non_public_address";
  } else if (directConfirmed) {
    classification = "direct_confirmed";
  } else if (successes.length > 0) {
    classification = "direct_observed_unconfirmed";
  } else if (outbound.length > 0) {
    classification = "outbound_observed";
  } else {
    classification = "unknown";
  }

  return Object.freeze({
    subject_node_id: subjectNodeId,
    candidate_address: candidateAddress,
    classification,
    evidence_ids: fresh.map((entry) => entry.observation_id).sort(),
    counts: Object.freeze({
      fresh_observations: fresh.length,
      outbound_successes: outbound.length,
      dialback_successes: successes.length,
      dialback_failures: failures.length,
      independent_success_domains: successDomains.size,
      independent_success_observers: successObservers.size,
    }),
  });
}
