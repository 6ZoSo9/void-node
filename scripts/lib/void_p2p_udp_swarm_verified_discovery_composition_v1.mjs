import crypto from "node:crypto";

import {
  canonicalJson,
  contentId,
} from "./void_public_bootstrap_record_v2_mirror_contract_v1.mjs";
import {
  VOID_PUBLIC_BOOTSTRAP_RELEASE_LOCATOR_COMPOSITION_V1,
  resolveVoidPublicBootstrapFromReleaseRootV1,
} from "./void_public_bootstrap_release_locator_composition_v1.mjs";

export const VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_V1 =
  "void_p2p_udp_swarm_verified_discovery_composition_v1";
export const VOID_P2P_UDP_SWARM_DISCOVERY_SCHEMA_V1 =
  "void_p2p_udp_swarm_authenticated_discovery_v1";
export const VOID_P2P_UDP_SWARM_DISCOVERY_ID_PREFIX_V1 = "voidpud1_";
export const VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SCHEMA_V1 =
  "void_p2p_udp_swarm_relay_introduction_v1";
export const VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SIGNATURE_DOMAIN_V1 =
  "void.p2p.udp-swarm.relay-introduction.v1";

const VOID_NETWORK = "VOID Network";
const VOID_CHAIN_ID = 2050;
const NODE_ID_RE = /^[0-9a-f]{32}$/;
const SIGNATURE_RE = /^[0-9a-f]{128}$/;
const RECORD_ID_RE = /^voidpbr2_[0-9a-f]{64}$/;
const MANIFEST_ID_RE = /^voidpbm1_[0-9a-f]{64}$/;
const DISCOVERY_ID_RE = /^voidpud1_[0-9a-f]{64}$/;
const MIN_DISCOVERY_VALIDITY_MS = 30_000;
const MAX_DISCOVERY_VALIDITY_MS = 10 * 60_000;
const MAX_OBSERVATION_AGE_MS = 5 * 60_000;
const MAX_CLOCK_SKEW_MS = 5 * 60_000;
const MIN_OBSERVATIONS = 4;
const MAX_OBSERVATIONS = 32;
const MIN_AUTHENTICATED_SOURCES = 2;
const MAX_AUTHENTICATED_SOURCES = 32;
const MAX_ROUTES = 8;

const DISCOVERY_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "record_id",
  "manifest_id",
  "generated_at",
  "expires_at",
  "observations",
  "policy",
  "authority",
  "discovery_id",
]);
const OBSERVATION_KEYS = Object.freeze([
  "schema",
  "signature_domain",
  "network",
  "chain_id",
  "record_id",
  "manifest_id",
  "source_node_id",
  "source_public_key_pem",
  "relay_node_id",
  "target_node_id",
  "relay_failure_domain",
  "observed_at",
  "signature_hex",
]);
const SIGNED_OBSERVATION_KEYS = Object.freeze(
  OBSERVATION_KEYS.filter(
    (key) => key !== "source_public_key_pem" && key !== "signature_hex",
  ),
);
const AUTHENTICATED_SOURCE_KEYS = Object.freeze([
  "node_id",
  "public_key_pem",
]);

export const VOID_P2P_UDP_SWARM_DISCOVERY_POLICY_V1 = Object.freeze({
  minimum_sources_per_route: 2,
  minimum_relays_per_target: 2,
  minimum_relay_failure_domains_per_target: 2,
  maximum_route_count: MAX_ROUTES,
  n_minus_one_relay_required: true,
});

export const VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1 = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function canonicalTime(value, label) {
  const raw = String(value || "");
  const time = Date.parse(raw);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== raw) {
    throw new Error(`${label} must be a canonical ISO timestamp`);
  }
  return time;
}

function requireNodeId(value, label) {
  const nodeId = String(value || "");
  if (!NODE_ID_RE.test(nodeId)) throw new Error(`${label} is invalid`);
  return nodeId;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalEd25519Identity(nodeIdValue, publicKeyPemValue, label) {
  const nodeId = requireNodeId(nodeIdValue, `${label} node_id`);
  const publicKeyPem = String(publicKeyPemValue || "");
  let publicKey;
  try {
    publicKey = crypto.createPublicKey(publicKeyPem);
  } catch {
    throw new Error(`${label} public key is invalid`);
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error(`${label} public key must be Ed25519`);
  }
  const canonicalPem = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  if (canonicalPem !== publicKeyPem) {
    throw new Error(`${label} public key is not canonical PEM`);
  }
  const derivedNodeId = crypto
    .createHash("sha256")
    .update(canonicalPem)
    .digest("hex")
    .slice(0, 32);
  if (derivedNodeId !== nodeId) {
    throw new Error(`${label} identity does not match its key`);
  }
  return Object.freeze({ nodeId, publicKeyPem: canonicalPem, publicKey });
}

function authenticatedSourceMap(rawSources, localNodeId) {
  if (
    !Array.isArray(rawSources) ||
    rawSources.length < MIN_AUTHENTICATED_SOURCES ||
    rawSources.length > MAX_AUTHENTICATED_SOURCES
  ) {
    throw new Error("authenticated discovery source count is invalid");
  }
  const sources = new Map();
  for (const [index, rawSource] of rawSources.entries()) {
    const source = exactKeys(
      rawSource,
      AUTHENTICATED_SOURCE_KEYS,
      `authenticated discovery source ${index + 1}`,
    );
    const identity = canonicalEd25519Identity(
      source.node_id,
      source.public_key_pem,
      "authenticated discovery source",
    );
    if (identity.nodeId === localNodeId) {
      throw new Error("local node cannot be an authenticated discovery source");
    }
    if (sources.has(identity.nodeId)) {
      throw new Error("authenticated discovery sources must be unique");
    }
    sources.set(identity.nodeId, identity);
  }
  return sources;
}

function sameExactObject(actual, expected, label) {
  exactKeys(actual, Object.keys(expected), label);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error(`${label} weakens the compiled contract`);
  }
}

function signedObservationBody(rawObservation) {
  const body = {};
  for (const key of SIGNED_OBSERVATION_KEYS) body[key] = rawObservation[key];
  return body;
}

export function voidP2pUdpSwarmRelayIntroductionSigningPayloadV1(
  observation,
) {
  const value = exactKeys(
    structuredClone(observation),
    SIGNED_OBSERVATION_KEYS,
    "relay introduction signing body",
  );
  return Buffer.from(canonicalJson(value), "utf8");
}

export function voidP2pUdpSwarmDiscoveryIdV1(discovery) {
  return contentId(
    VOID_P2P_UDP_SWARM_DISCOVERY_ID_PREFIX_V1,
    discovery,
    "discovery_id",
  );
}

function validateObservation(
  rawObservation,
  discovery,
  nowMs,
  localNodeId,
  authenticatedSources,
) {
  const observation = exactKeys(
    structuredClone(rawObservation),
    OBSERVATION_KEYS,
    "relay introduction",
  );
  if (
    observation.schema !== VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SCHEMA_V1 ||
    observation.signature_domain !==
      VOID_P2P_UDP_SWARM_RELAY_INTRODUCTION_SIGNATURE_DOMAIN_V1 ||
    observation.network !== VOID_NETWORK ||
    observation.chain_id !== VOID_CHAIN_ID
  ) {
    throw new Error("relay introduction network contract mismatch");
  }
  if (
    observation.record_id !== discovery.record_id ||
    observation.manifest_id !== discovery.manifest_id
  ) {
    throw new Error("relay introduction escaped its bootstrap binding");
  }

  const sourceNodeId = requireNodeId(
    observation.source_node_id,
    "relay introduction source_node_id",
  );
  const relayNodeId = requireNodeId(
    observation.relay_node_id,
    "relay introduction relay_node_id",
  );
  const targetNodeId = requireNodeId(
    observation.target_node_id,
    "relay introduction target_node_id",
  );
  if (
    relayNodeId === targetNodeId ||
    sourceNodeId === localNodeId ||
    relayNodeId === localNodeId ||
    targetNodeId === localNodeId
  ) {
    throw new Error("relay introduction contains an invalid local or self route");
  }
  const failureDomain = String(observation.relay_failure_domain || "");
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(failureDomain)) {
    throw new Error("relay introduction failure domain is invalid");
  }
  const observedAt = canonicalTime(
    observation.observed_at,
    "relay introduction observed_at",
  );
  if (observedAt > nowMs + MAX_CLOCK_SKEW_MS) {
    throw new Error("relay introduction is from the future");
  }
  if (nowMs - observedAt > MAX_OBSERVATION_AGE_MS) {
    throw new Error("relay introduction is stale");
  }

  const authenticatedSource = authenticatedSources.get(sourceNodeId);
  if (
    !authenticatedSource ||
    authenticatedSource.publicKeyPem !== observation.source_public_key_pem
  ) {
    throw new Error(
      "relay introduction source is not bound to an authenticated peer identity",
    );
  }
  if (!SIGNATURE_RE.test(String(observation.signature_hex || ""))) {
    throw new Error("relay introduction signature is malformed");
  }
  const verified = crypto.verify(
    null,
    voidP2pUdpSwarmRelayIntroductionSigningPayloadV1(
      signedObservationBody(observation),
    ),
    authenticatedSource.publicKey,
    Buffer.from(observation.signature_hex, "hex"),
  );
  if (!verified) throw new Error("relay introduction signature is invalid");

  return Object.freeze({
    source_node_id: sourceNodeId,
    relay_node_id: relayNodeId,
    target_node_id: targetNodeId,
    relay_failure_domain: failureDomain,
    observed_at_ms: observedAt,
  });
}

function validateDiscovery(
  rawDiscovery,
  { nowMs, localNodeId, authenticatedSources },
) {
  const discovery = exactKeys(
    structuredClone(rawDiscovery),
    DISCOVERY_KEYS,
    "UDP swarm discovery",
  );
  if (
    discovery.schema !== VOID_P2P_UDP_SWARM_DISCOVERY_SCHEMA_V1 ||
    discovery.network !== VOID_NETWORK ||
    discovery.chain_id !== VOID_CHAIN_ID ||
    !RECORD_ID_RE.test(String(discovery.record_id || "")) ||
    !MANIFEST_ID_RE.test(String(discovery.manifest_id || ""))
  ) {
    throw new Error("UDP swarm discovery network contract mismatch");
  }
  sameExactObject(
    discovery.policy,
    VOID_P2P_UDP_SWARM_DISCOVERY_POLICY_V1,
    "UDP swarm discovery policy",
  );
  sameExactObject(
    discovery.authority,
    VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1,
    "UDP swarm discovery authority",
  );
  if (!DISCOVERY_ID_RE.test(String(discovery.discovery_id || ""))) {
    throw new Error("UDP swarm discovery ID is malformed");
  }
  if (discovery.discovery_id !== voidP2pUdpSwarmDiscoveryIdV1(discovery)) {
    throw new Error("UDP swarm discovery ID does not match canonical bytes");
  }

  const generatedAt = canonicalTime(
    discovery.generated_at,
    "UDP swarm discovery generated_at",
  );
  const expiresAt = canonicalTime(
    discovery.expires_at,
    "UDP swarm discovery expires_at",
  );
  if (generatedAt > nowMs + MAX_CLOCK_SKEW_MS) {
    throw new Error("UDP swarm discovery is from the future");
  }
  if (expiresAt <= nowMs) throw new Error("UDP swarm discovery is expired");
  const validity = expiresAt - generatedAt;
  if (
    validity < MIN_DISCOVERY_VALIDITY_MS ||
    validity > MAX_DISCOVERY_VALIDITY_MS
  ) {
    throw new Error("UDP swarm discovery validity is outside its bound");
  }
  if (
    !Array.isArray(discovery.observations) ||
    discovery.observations.length < MIN_OBSERVATIONS ||
    discovery.observations.length > MAX_OBSERVATIONS
  ) {
    throw new Error("UDP swarm discovery observation count is invalid");
  }

  const observations = discovery.observations.map((entry) =>
    validateObservation(
      entry,
      discovery,
      nowMs,
      localNodeId,
      authenticatedSources,
    ),
  );
  for (const observation of observations) {
    if (
      observation.observed_at_ms > generatedAt ||
      generatedAt - observation.observed_at_ms > MAX_OBSERVATION_AGE_MS
    ) {
      throw new Error("relay introduction is outside its discovery window");
    }
  }

  const relayDomains = new Map();
  const sourcesByRoute = new Map();
  for (const observation of observations) {
    const priorDomain = relayDomains.get(observation.relay_node_id);
    if (priorDomain && priorDomain !== observation.relay_failure_domain) {
      throw new Error("relay introduction assigns conflicting failure domains");
    }
    relayDomains.set(
      observation.relay_node_id,
      observation.relay_failure_domain,
    );
    const routeKey = `${observation.relay_node_id}/${observation.target_node_id}`;
    const sources = sourcesByRoute.get(routeKey) || new Set();
    if (sources.has(observation.source_node_id)) {
      throw new Error("relay route contains a duplicate source observation");
    }
    sources.add(observation.source_node_id);
    sourcesByRoute.set(routeKey, sources);
  }

  if (sourcesByRoute.size < 2 || sourcesByRoute.size > MAX_ROUTES) {
    throw new Error("UDP swarm discovery route count is invalid");
  }
  for (const sources of sourcesByRoute.values()) {
    if (
      sources.size <
      VOID_P2P_UDP_SWARM_DISCOVERY_POLICY_V1.minimum_sources_per_route
    ) {
      throw new Error("relay route lacks independent signed source quorum");
    }
  }

  const relaysByTarget = new Map();
  for (const routeKey of sourcesByRoute.keys()) {
    const [relayNodeId, targetNodeId] = routeKey.split("/");
    const relays = relaysByTarget.get(targetNodeId) || new Set();
    relays.add(relayNodeId);
    relaysByTarget.set(targetNodeId, relays);
  }
  for (const relays of relaysByTarget.values()) {
    const domains = new Set([...relays].map((relay) => relayDomains.get(relay)));
    if (
      relays.size <
        VOID_P2P_UDP_SWARM_DISCOVERY_POLICY_V1.minimum_relays_per_target ||
      domains.size <
        VOID_P2P_UDP_SWARM_DISCOVERY_POLICY_V1
          .minimum_relay_failure_domains_per_target
    ) {
      throw new Error("target lacks N-1 relay failure-domain coverage");
    }
  }

  return Object.freeze({
    discovery,
    routes: Object.freeze([...sourcesByRoute.keys()].sort()),
    source_count: new Set(observations.map((entry) => entry.source_node_id)).size,
    relay_count: relayDomains.size,
    target_count: relaysByTarget.size,
    relay_failure_domain_count: new Set(relayDomains.values()).size,
  });
}

export async function composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
  releaseRoot,
  signedRecordId,
  locatorMirrors,
  fetchRecordBytes,
  fetchManifestBytes,
  discovery,
  localNodeId,
  authenticatedDiscoverySources,
  nowMs = Date.now(),
}) {
  if (!Number.isFinite(nowMs)) {
    throw new Error("UDP swarm discovery composition time is invalid");
  }
  const localId = requireNodeId(localNodeId, "local node ID");
  const authenticatedSources = authenticatedSourceMap(
    authenticatedDiscoverySources,
    localId,
  );
  const validated = validateDiscovery(discovery, {
    nowMs,
    localNodeId: localId,
    authenticatedSources,
  });
  const bootstrap = await resolveVoidPublicBootstrapFromReleaseRootV1({
    releaseRoot,
    signedRecordId,
    locatorMirrors,
    fetchRecordBytes,
    fetchManifestBytes,
    nowMs,
  });
  if (
    bootstrap.marker !==
      VOID_PUBLIC_BOOTSTRAP_RELEASE_LOCATOR_COMPOSITION_V1 ||
    bootstrap.record_id !== validated.discovery.record_id ||
    bootstrap.manifest_id !== validated.discovery.manifest_id
  ) {
    throw new Error("UDP swarm discovery escaped verified bootstrap resolution");
  }
  if (
    bootstrap.manifest?.status !== "stable_https_seed" ||
    bootstrap.manifest?.manifest_id !== bootstrap.manifest_id ||
    !Array.isArray(bootstrap.manifest?.sync_endpoints) ||
    bootstrap.manifest.sync_endpoints.length === 0
  ) {
    throw new Error("UDP swarm discovery requires a stable verified bootstrap manifest");
  }
  if (
    bootstrap.transport_is_authority !== false ||
    bootstrap.launcher_activation_performed !== false
  ) {
    throw new Error("verified bootstrap composition authority boundary changed");
  }

  return deepFreeze({
    marker: VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_V1,
    record_id: bootstrap.record_id,
    manifest_id: bootstrap.manifest_id,
    discovery_id: validated.discovery.discovery_id,
    route_count: validated.routes.length,
    source_count: validated.source_count,
    relay_count: validated.relay_count,
    target_count: validated.target_count,
    relay_failure_domain_count: validated.relay_failure_domain_count,
    n_minus_one_relay_coverage_verified: true,
    environment: {
      VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED: "1",
      VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES: validated.routes.join(","),
    },
    transport_is_authority: false,
    wallet_signer_validator_wc_money_authority: 0,
    network_io_implemented: false,
    environment_mutation_performed: false,
    launcher_activation_performed: false,
    deployment_performed: false,
    service_restart_performed: false,
  });
}
