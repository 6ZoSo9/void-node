import crypto from "node:crypto";

import {
  canonicalJson,
  contentId,
} from "./void_public_bootstrap_record_v2_mirror_contract_v1.mjs";
import {
  validateVoidBootstrapRecordReleaseRootV1,
} from "./void_bootstrap_record_release_root_v1.mjs";
import {
  VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1,
  composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1,
} from "./void_p2p_udp_swarm_verified_discovery_composition_v1.mjs";

export const VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_V1 =
  "void_p2p_udp_swarm_signed_observer_authorization_v1";
export const VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1 =
  "void_p2p_udp_swarm_observer_authorization_v1";
export const VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_PREFIX_V1 =
  "voidpua1_";
export const VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SIGNATURE_DOMAIN_V1 =
  "void.p2p.udp-swarm.observer-authorization.v1";

const VOID_NETWORK = "VOID Network";
const VOID_CHAIN_ID = 2050;
const NODE_ID_RE = /^[0-9a-f]{32}$/;
const AUTHORIZATION_ID_RE = /^voidpua1_[0-9a-f]{64}$/;
const MIN_OBSERVERS = 2;
const MAX_OBSERVERS = 32;
const MAX_LIVE_AUTHENTICATED_SOURCES = 32;
const MIN_VALIDITY_MS = 30_000;
const MAX_VALIDITY_MS = 24 * 60 * 60_000;
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

const OBSERVER_KEYS = Object.freeze(["node_id", "public_key_pem"]);
const AUTHENTICATED_SOURCE_KEYS = OBSERVER_KEYS;
const SIGNATURE_KEYS = Object.freeze(["key_id", "signature_base64"]);
const AUTHORIZATION_BODY_KEYS = Object.freeze([
  "schema",
  "signature_domain",
  "network",
  "chain_id",
  "root_id",
  "issued_at",
  "not_before",
  "expires_at",
  "observers",
  "authority",
  "authorization_id",
]);
const AUTHORIZATION_ENVELOPE_KEYS = Object.freeze([
  ...AUTHORIZATION_BODY_KEYS,
  "signatures",
]);

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

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function canonicalTime(value, label) {
  const raw = String(value || "");
  const time = Date.parse(raw);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== raw) {
    throw new Error(`${label} must be a canonical ISO timestamp`);
  }
  return time;
}

function canonicalBase64(raw, label, expectedBytes = null) {
  const value = String(raw || "");
  if (!value || value.length > 4096 || /\s/.test(value)) {
    throw new Error(`${label} is not canonical base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== value) {
    throw new Error(`${label} is not canonical base64`);
  }
  if (expectedBytes !== null && bytes.length !== expectedBytes) {
    throw new Error(`${label} has an invalid byte length`);
  }
  return bytes;
}

function requireNodeId(value, label) {
  const nodeId = String(value || "");
  if (!NODE_ID_RE.test(nodeId)) throw new Error(`${label} is invalid`);
  return nodeId;
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

function authorizationBody(raw) {
  const value = structuredClone(raw);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    delete value.signatures;
  }
  return exactKeys(
    value,
    AUTHORIZATION_BODY_KEYS,
    "UDP swarm observer authorization body",
  );
}

export function voidP2pUdpSwarmObserverAuthorizationIdV1(rawAuthorization) {
  return contentId(
    VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_PREFIX_V1,
    authorizationBody(rawAuthorization),
    "authorization_id",
  );
}

export function voidP2pUdpSwarmObserverAuthorizationSigningPayloadV1(
  rawAuthorization,
) {
  const body = authorizationBody(rawAuthorization);
  return Buffer.from(
    `${VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SIGNATURE_DOMAIN_V1}\n${canonicalJson(body)}\n`,
    "utf8",
  );
}

function validateAuthority(raw) {
  const authority = exactKeys(
    raw,
    Object.keys(VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1),
    "UDP swarm observer authorization authority",
  );
  if (
    canonicalJson(authority) !==
    canonicalJson(VOID_P2P_UDP_SWARM_DISCOVERY_AUTHORITY_V1)
  ) {
    throw new Error("UDP swarm observer authorization grants forbidden authority");
  }
  return Object.freeze({ ...authority });
}

function validateObserverList(rawObservers) {
  if (
    !Array.isArray(rawObservers) ||
    rawObservers.length < MIN_OBSERVERS ||
    rawObservers.length > MAX_OBSERVERS
  ) {
    throw new Error("UDP swarm observer authorization observer count is invalid");
  }
  const observers = [];
  const seen = new Set();
  for (const [index, rawObserver] of rawObservers.entries()) {
    const observer = exactKeys(
      rawObserver,
      OBSERVER_KEYS,
      `UDP swarm observer authorization observer ${index + 1}`,
    );
    const identity = canonicalEd25519Identity(
      observer.node_id,
      observer.public_key_pem,
      "authorized UDP swarm observer",
    );
    if (seen.has(identity.nodeId)) {
      throw new Error("UDP swarm observer authorization contains a duplicate observer");
    }
    seen.add(identity.nodeId);
    observers.push(
      Object.freeze({
        node_id: identity.nodeId,
        public_key_pem: identity.publicKeyPem,
      }),
    );
  }
  const sorted = [...observers].sort((a, b) =>
    a.node_id.localeCompare(b.node_id),
  );
  if (canonicalJson(observers) !== canonicalJson(sorted)) {
    throw new Error("UDP swarm observer authorization observers must be canonically sorted");
  }
  return Object.freeze(observers);
}

export function validateVoidP2pUdpSwarmObserverAuthorizationV1(
  rawAuthorization,
  releaseRoot,
  { nowMs = Date.now() } = {},
) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("UDP swarm observer authorization validation time is invalid");
  }
  const envelope = exactKeys(
    structuredClone(rawAuthorization),
    AUTHORIZATION_ENVELOPE_KEYS,
    "UDP swarm observer authorization",
  );
  if (
    envelope.schema !==
      VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SCHEMA_V1 ||
    envelope.signature_domain !==
      VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_SIGNATURE_DOMAIN_V1 ||
    envelope.network !== VOID_NETWORK ||
    envelope.chain_id !== VOID_CHAIN_ID
  ) {
    throw new Error("UDP swarm observer authorization network contract mismatch");
  }

  const validatedRoot = validateVoidBootstrapRecordReleaseRootV1(releaseRoot, {
    allowHold: false,
  });
  if (envelope.root_id !== validatedRoot.root.root_id) {
    throw new Error("UDP swarm observer authorization release root mismatch");
  }

  validateAuthority(envelope.authority);
  const observers = validateObserverList(envelope.observers);

  const issuedAt = canonicalTime(
    envelope.issued_at,
    "UDP swarm observer authorization issued_at",
  );
  const notBefore = canonicalTime(
    envelope.not_before,
    "UDP swarm observer authorization not_before",
  );
  const expiresAt = canonicalTime(
    envelope.expires_at,
    "UDP swarm observer authorization expires_at",
  );
  if (notBefore < issuedAt) {
    throw new Error("UDP swarm observer authorization starts before issuance");
  }
  if (issuedAt > nowMs + MAX_CLOCK_SKEW_MS) {
    throw new Error("UDP swarm observer authorization was issued in the future");
  }
  if (notBefore > nowMs + MAX_CLOCK_SKEW_MS) {
    throw new Error("UDP swarm observer authorization is not yet active");
  }
  if (expiresAt <= nowMs) {
    throw new Error("UDP swarm observer authorization is expired");
  }
  const validity = expiresAt - notBefore;
  if (validity < MIN_VALIDITY_MS || validity > MAX_VALIDITY_MS) {
    throw new Error("UDP swarm observer authorization validity is outside its bound");
  }

  if (!AUTHORIZATION_ID_RE.test(String(envelope.authorization_id || ""))) {
    throw new Error("UDP swarm observer authorization ID is malformed");
  }
  if (
    envelope.authorization_id !==
    voidP2pUdpSwarmObserverAuthorizationIdV1(envelope)
  ) {
    throw new Error("UDP swarm observer authorization ID does not match its content");
  }

  if (
    !Array.isArray(envelope.signatures) ||
    envelope.signatures.length < validatedRoot.root.threshold ||
    envelope.signatures.length > validatedRoot.keys.length
  ) {
    throw new Error("UDP swarm observer authorization signature count is invalid");
  }
  const signingPayload =
    voidP2pUdpSwarmObserverAuthorizationSigningPayloadV1(envelope);
  const rootKeys = new Map(
    validatedRoot.keys.map((entry) => [entry.key_id, entry]),
  );
  const signerKeyIds = [];
  const seenSigners = new Set();
  for (const [index, rawSignature] of envelope.signatures.entries()) {
    const signature = exactKeys(
      rawSignature,
      SIGNATURE_KEYS,
      `UDP swarm observer authorization signature ${index + 1}`,
    );
    const keyId = String(signature.key_id || "");
    const rootKey = rootKeys.get(keyId);
    if (!rootKey) {
      throw new Error("UDP swarm observer authorization signer is not in the release root");
    }
    if (seenSigners.has(keyId)) {
      throw new Error("UDP swarm observer authorization contains a duplicate signer");
    }
    const signatureBytes = canonicalBase64(
      signature.signature_base64,
      "UDP swarm observer authorization signature",
      64,
    );
    if (!crypto.verify(null, signingPayload, rootKey.publicKey, signatureBytes)) {
      throw new Error("UDP swarm observer authorization signature is invalid");
    }
    seenSigners.add(keyId);
    signerKeyIds.push(keyId);
  }
  const sortedSignerKeyIds = [...signerKeyIds].sort();
  if (canonicalJson(signerKeyIds) !== canonicalJson(sortedSignerKeyIds)) {
    throw new Error("UDP swarm observer authorization signatures must be canonically sorted");
  }
  if (signerKeyIds.length < validatedRoot.root.threshold) {
    throw new Error("UDP swarm observer authorization lacks release-root quorum");
  }

  return deepFreeze({
    marker: VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_V1,
    authorization: {
      ...envelope,
      observers,
    },
    observer_count: observers.length,
    signer_key_ids: signerKeyIds,
    threshold: validatedRoot.root.threshold,
    transport_is_authority: false,
    wallet_signer_validator_wc_money_authority: 0,
  });
}

function authorizedDiscoverySourceContext({
  observerAuthorization,
  releaseRoot,
  authenticatedDiscoverySources,
  localNodeId,
  nowMs = Date.now(),
}) {
  const localId = requireNodeId(localNodeId, "local node ID");
  const validatedAuthorization =
    validateVoidP2pUdpSwarmObserverAuthorizationV1(
      observerAuthorization,
      releaseRoot,
      { nowMs },
    );
  const authorizedObservers = new Map(
    validatedAuthorization.authorization.observers.map((entry) => [
      entry.node_id,
      entry,
    ]),
  );
  if (
    !Array.isArray(authenticatedDiscoverySources) ||
    authenticatedDiscoverySources.length > MAX_LIVE_AUTHENTICATED_SOURCES
  ) {
    throw new Error("live authenticated discovery source count is invalid");
  }

  const seen = new Set();
  const eligible = [];
  for (const [index, rawSource] of authenticatedDiscoverySources.entries()) {
    const source = exactKeys(
      rawSource,
      AUTHENTICATED_SOURCE_KEYS,
      `live authenticated discovery source ${index + 1}`,
    );
    const identity = canonicalEd25519Identity(
      source.node_id,
      source.public_key_pem,
      "live authenticated discovery source",
    );
    if (identity.nodeId === localId) {
      throw new Error("local node cannot be a live authenticated discovery source");
    }
    if (seen.has(identity.nodeId)) {
      throw new Error("live authenticated discovery sources must be unique");
    }
    seen.add(identity.nodeId);
    const authorized = authorizedObservers.get(identity.nodeId);
    if (
      authorized &&
      authorized.public_key_pem === identity.publicKeyPem
    ) {
      eligible.push(
        Object.freeze({
          node_id: identity.nodeId,
          public_key_pem: identity.publicKeyPem,
        }),
      );
    }
  }

  eligible.sort((a, b) => a.node_id.localeCompare(b.node_id));
  if (eligible.length < MIN_OBSERVERS) {
    throw new Error(
      "insufficient live signed-observer authorization for UDP swarm discovery",
    );
  }
  return Object.freeze({
    eligible_sources: Object.freeze(eligible),
    authorization: validatedAuthorization.authorization,
  });
}

export function authorizeVoidP2pUdpSwarmDiscoverySourcesV1(options) {
  return authorizedDiscoverySourceContext(options).eligible_sources;
}

function enforceDiscoveryAuthorizationWindow(rawDiscovery, authorization) {
  const discovery = plainObject(
    rawDiscovery,
    "authorized UDP swarm discovery",
  );
  const generatedAt = canonicalTime(
    discovery.generated_at,
    "authorized UDP swarm discovery generated_at",
  );
  const expiresAt = canonicalTime(
    discovery.expires_at,
    "authorized UDP swarm discovery expires_at",
  );
  const authorizationNotBefore = canonicalTime(
    authorization.not_before,
    "UDP swarm observer authorization not_before",
  );
  const authorizationExpiresAt = canonicalTime(
    authorization.expires_at,
    "UDP swarm observer authorization expires_at",
  );
  if (generatedAt < authorizationNotBefore) {
    throw new Error(
      "UDP swarm discovery predates observer authorization",
    );
  }
  if (expiresAt > authorizationExpiresAt) {
    throw new Error(
      "UDP swarm discovery lease exceeds observer authorization",
    );
  }
  if (!Array.isArray(discovery.observations)) {
    throw new Error("authorized UDP swarm discovery observations must be an array");
  }
  for (const [index, rawObservation] of discovery.observations.entries()) {
    const observation = plainObject(
      rawObservation,
      `authorized UDP swarm discovery observation ${index + 1}`,
    );
    const observedAt = canonicalTime(
      observation.observed_at,
      `authorized UDP swarm discovery observation ${index + 1} observed_at`,
    );
    if (
      observedAt < authorizationNotBefore ||
      observedAt >= authorizationExpiresAt
    ) {
      throw new Error(
        "UDP swarm discovery observation falls outside observer authorization",
      );
    }
  }
}

export async function composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1({
  observerAuthorization,
  releaseRoot,
  authenticatedDiscoverySources,
  localNodeId,
  nowMs = Date.now(),
  ...compositionInput
}) {
  const context = authorizedDiscoverySourceContext({
    observerAuthorization,
    releaseRoot,
    authenticatedDiscoverySources,
    localNodeId,
    nowMs,
  });
  enforceDiscoveryAuthorizationWindow(
    compositionInput.discovery,
    context.authorization,
  );
  return composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1({
    ...compositionInput,
    releaseRoot,
    authenticatedDiscoverySources: context.eligible_sources,
    localNodeId,
    nowMs,
  });
}
