// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import crypto from "node:crypto";

import {
  canonicalJson,
  isPublicDirectIp,
  parseCanonicalIpPeerAddress,
} from "./void_p2p_reachability_classification_contract_v1.mjs";

export const VOID_P2P_DIRECT_UPGRADE_CANDIDATE_SCHEMA_V1 =
  "void_p2p_direct_upgrade_candidate_v1";
export const VOID_P2P_DIRECT_UPGRADE_SESSION_SCHEMA_V1 =
  "void_p2p_direct_upgrade_session_v1";
export const VOID_P2P_DIRECT_UPGRADE_NETWORK_V1 = "VOID Network";
export const VOID_P2P_DIRECT_UPGRADE_CHAIN_ID_V1 = 2050;

export const VOID_P2P_DIRECT_UPGRADE_CANDIDATE_MAX_TTL_MS_V1 = 30_000;
export const VOID_P2P_DIRECT_UPGRADE_FUTURE_SKEW_MS_V1 = 2_000;
export const VOID_P2P_DIRECT_UPGRADE_START_DELAY_MIN_MS_V1 = 50;
export const VOID_P2P_DIRECT_UPGRADE_START_DELAY_MAX_MS_V1 = 1_000;
export const VOID_P2P_DIRECT_UPGRADE_ATTEMPT_TIMEOUT_MAX_MS_V1 = 5_000;
export const VOID_P2P_DIRECT_UPGRADE_RETRY_COOLDOWN_MS_V1 = 5_000;
export const VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPTS_PER_CANDIDATE_V1 = 3;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const CONNECTION_ID_RE = /^[0-9a-f]{32}$/;
const CANDIDATE_ID_PREFIX = "void-dupcand-v1:";
const SESSION_RECORD_ID_PREFIX = "void-dupsession-v1:";

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

const CANDIDATE_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "subject_node_id",
  "observer_node_id",
  "relay_connection_id",
  "relay_local_port",
  "observed_address",
  "observed_at_ms",
  "expires_at_ms",
  "authority",
  "candidate_id",
]);

const SESSION_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "session_id",
  "coordination_relay_node_id",
  "local_node_id",
  "remote_node_id",
  "local_candidate_id",
  "remote_candidate_id",
  "start_delay_ms",
  "attempt_timeout_ms",
  "created_at_ms",
  "expires_at_ms",
  "invariants",
  "authority",
  "record_id",
]);

const SESSION_INVARIANT_KEYS = Object.freeze([
  "candidate_is_transport_hint_only",
  "candidate_persisted_to_verified_direct_cache",
  "relay_kept_until_direct_auth",
  "direct_promotion_requires_expected_node_auth",
  "listener_port_reuse_required",
  "kernel_simultaneous_open_assumed",
  "nat_type_inferred",
  "relay_required_inferred",
  "unreachable_inferred",
  "runtime_integration_performed",
  "external_nat_traversal_proven",
]);

function plainObject(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${label} must be an object`);
  }
  return raw;
}

function exactKeys(raw, expected, label) {
  const value = plainObject(raw, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} keys mismatch`);
  }
  return value;
}

function safeInteger(raw, label, min, max) {
  if (
    !Number.isSafeInteger(raw) ||
    raw < min ||
    raw > max
  ) {
    throw new Error(`${label} must be an integer from ${min} through ${max}`);
  }
  return raw;
}

function nodeId(raw, label) {
  const value = String(raw || "");
  if (!NODE_ID_RE.test(value)) {
    throw new Error(`${label} must be 32 lowercase hex characters`);
  }
  return value;
}

function connectionId(raw, label) {
  const value = String(raw || "");
  if (!CONNECTION_ID_RE.test(value)) {
    throw new Error(`${label} must be 32 lowercase hex characters`);
  }
  return value;
}

function zeroAuthority() {
  return {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
}

function validateAuthority(raw, label) {
  const value = exactKeys(raw, AUTHORITY_KEYS, label);
  for (const key of AUTHORITY_KEYS) {
    if (value[key] !== false) {
      throw new Error(`${label} ${key} must be false`);
    }
  }
  return Object.freeze({ ...value });
}

function contentId(prefix, value, idField) {
  const body = structuredClone(value);
  delete body[idField];
  return `${prefix}${crypto.createHash("sha256")
    .update(canonicalJson(body))
    .digest("hex")}`;
}

function publicObservedAddress(raw) {
  const parsed = parseCanonicalIpPeerAddress(raw);
  if (!isPublicDirectIp(parsed.host)) {
    throw new Error("direct-upgrade observed address must be a canonical public IP and port");
  }
  return parsed.canonical;
}

function candidateInvariants() {
  return Object.freeze({
    candidate_is_transport_hint_only: true,
    candidate_persisted_to_verified_direct_cache: false,
    relay_kept_until_direct_auth: true,
    direct_promotion_requires_expected_node_auth: true,
    listener_port_reuse_required: false,
    kernel_simultaneous_open_assumed: false,
    nat_type_inferred: false,
    relay_required_inferred: false,
    unreachable_inferred: false,
    runtime_integration_performed: false,
    external_nat_traversal_proven: false,
  });
}

export function newVoidP2pDirectUpgradeIdV1() {
  return crypto.randomBytes(16).toString("hex");
}

export function createVoidP2pDirectUpgradeCandidateV1({
  subjectNodeId,
  observerNodeId,
  relayConnectionId,
  relayLocalPort,
  observedAddress,
  observedAtMs,
  ttlMs = 15_000,
}) {
  const subject_node_id = nodeId(subjectNodeId, "subject node ID");
  const observer_node_id = nodeId(observerNodeId, "observer node ID");
  if (subject_node_id === observer_node_id) {
    throw new Error("subject and observer node IDs must differ");
  }
  const relay_connection_id = connectionId(
    relayConnectionId,
    "relay connection ID",
  );
  const relay_local_port = safeInteger(
    relayLocalPort,
    "relay local port",
    1,
    65_535,
  );
  const observed_address = publicObservedAddress(observedAddress);
  const observed_at_ms = safeInteger(
    observedAtMs,
    "observed at",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const ttl_ms = safeInteger(
    ttlMs,
    "candidate TTL",
    1,
    VOID_P2P_DIRECT_UPGRADE_CANDIDATE_MAX_TTL_MS_V1,
  );
  const expires_at_ms = observed_at_ms + ttl_ms;
  if (!Number.isSafeInteger(expires_at_ms)) {
    throw new Error("candidate expiry overflow");
  }

  const candidate = {
    schema: VOID_P2P_DIRECT_UPGRADE_CANDIDATE_SCHEMA_V1,
    network: VOID_P2P_DIRECT_UPGRADE_NETWORK_V1,
    chain_id: VOID_P2P_DIRECT_UPGRADE_CHAIN_ID_V1,
    subject_node_id,
    observer_node_id,
    relay_connection_id,
    relay_local_port,
    observed_address,
    observed_at_ms,
    expires_at_ms,
    authority: zeroAuthority(),
    candidate_id: "",
  };
  candidate.candidate_id = contentId(
    CANDIDATE_ID_PREFIX,
    candidate,
    "candidate_id",
  );
  return validateVoidP2pDirectUpgradeCandidateV1(candidate, {
    nowMs: observed_at_ms,
  });
}

export function validateVoidP2pDirectUpgradeCandidateV1(
  raw,
  {
    nowMs = Date.now(),
    expectedSubjectNodeId,
    authenticatedObserverNodeId,
    expectedRelayConnectionId,
    activeRelayLocalPort,
    relayConnectionActive = true,
  } = {},
) {
  const value = exactKeys(raw, CANDIDATE_KEYS, "direct-upgrade candidate");
  if (value.schema !== VOID_P2P_DIRECT_UPGRADE_CANDIDATE_SCHEMA_V1) {
    throw new Error("direct-upgrade candidate schema mismatch");
  }
  if (value.network !== VOID_P2P_DIRECT_UPGRADE_NETWORK_V1) {
    throw new Error("direct-upgrade candidate network mismatch");
  }
  if (value.chain_id !== VOID_P2P_DIRECT_UPGRADE_CHAIN_ID_V1) {
    throw new Error("direct-upgrade candidate chain ID mismatch");
  }

  const subject_node_id = nodeId(value.subject_node_id, "subject node ID");
  const observer_node_id = nodeId(value.observer_node_id, "observer node ID");
  if (subject_node_id === observer_node_id) {
    throw new Error("subject and observer node IDs must differ");
  }
  const relay_connection_id = connectionId(
    value.relay_connection_id,
    "relay connection ID",
  );
  const relay_local_port = safeInteger(
    value.relay_local_port,
    "relay local port",
    1,
    65_535,
  );
  const observed_address = publicObservedAddress(value.observed_address);
  const observed_at_ms = safeInteger(
    value.observed_at_ms,
    "observed at",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const expires_at_ms = safeInteger(
    value.expires_at_ms,
    "expires at",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const now_ms = safeInteger(
    nowMs,
    "current time",
    0,
    Number.MAX_SAFE_INTEGER,
  );

  if (
    expires_at_ms <= observed_at_ms ||
    expires_at_ms - observed_at_ms >
      VOID_P2P_DIRECT_UPGRADE_CANDIDATE_MAX_TTL_MS_V1
  ) {
    throw new Error("direct-upgrade candidate lifetime is invalid");
  }
  if (
    observed_at_ms >
    now_ms + VOID_P2P_DIRECT_UPGRADE_FUTURE_SKEW_MS_V1
  ) {
    throw new Error("direct-upgrade candidate is too far in the future");
  }
  if (expires_at_ms <= now_ms) {
    throw new Error("direct-upgrade candidate is stale");
  }

  const authority = validateAuthority(
    value.authority,
    "direct-upgrade candidate authority",
  );

  const candidate = Object.freeze({
    schema: value.schema,
    network: value.network,
    chain_id: value.chain_id,
    subject_node_id,
    observer_node_id,
    relay_connection_id,
    relay_local_port,
    observed_address,
    observed_at_ms,
    expires_at_ms,
    authority,
    candidate_id: String(value.candidate_id || ""),
  });

  const expectedId = contentId(
    CANDIDATE_ID_PREFIX,
    candidate,
    "candidate_id",
  );
  if (candidate.candidate_id !== expectedId) {
    throw new Error("direct-upgrade candidate content ID mismatch");
  }

  if (
    expectedSubjectNodeId !== undefined &&
    candidate.subject_node_id !==
      nodeId(expectedSubjectNodeId, "expected subject node ID")
  ) {
    throw new Error("direct-upgrade candidate subject mismatch");
  }
  if (
    authenticatedObserverNodeId !== undefined &&
    candidate.observer_node_id !==
      nodeId(authenticatedObserverNodeId, "authenticated observer node ID")
  ) {
    throw new Error("direct-upgrade candidate observer mismatch");
  }
  if (
    expectedRelayConnectionId !== undefined &&
    candidate.relay_connection_id !==
      connectionId(expectedRelayConnectionId, "expected relay connection ID")
  ) {
    throw new Error("direct-upgrade candidate relay connection mismatch");
  }
  if (
    activeRelayLocalPort !== undefined &&
    candidate.relay_local_port !==
      safeInteger(activeRelayLocalPort, "active relay local port", 1, 65_535)
  ) {
    throw new Error("direct-upgrade candidate source-port binding mismatch");
  }
  if (relayConnectionActive !== true) {
    throw new Error("direct-upgrade candidate requires its relay connection to remain active");
  }

  return candidate;
}

export function voidP2pDirectUpgradeCandidateUsableV1(
  candidate,
  context,
) {
  try {
    validateVoidP2pDirectUpgradeCandidateV1(candidate, context);
    return true;
  } catch {
    return false;
  }
}

export function createVoidP2pDirectUpgradeSessionV1({
  sessionId = newVoidP2pDirectUpgradeIdV1(),
  coordinationRelayNodeId,
  localNodeId,
  remoteNodeId,
  localCandidate,
  remoteCandidate,
  startDelayMs = 200,
  attemptTimeoutMs = 3_000,
  createdAtMs = Date.now(),
}) {
  const session_id = connectionId(sessionId, "session ID");
  const coordination_relay_node_id = nodeId(
    coordinationRelayNodeId,
    "coordination relay node ID",
  );
  const local_node_id = nodeId(localNodeId, "local node ID");
  const remote_node_id = nodeId(remoteNodeId, "remote node ID");
  if (
    local_node_id === remote_node_id ||
    coordination_relay_node_id === local_node_id ||
    coordination_relay_node_id === remote_node_id
  ) {
    throw new Error("direct-upgrade session node identities must be distinct");
  }

  const created_at_ms = safeInteger(
    createdAtMs,
    "session created at",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const local = validateVoidP2pDirectUpgradeCandidateV1(localCandidate, {
    nowMs: created_at_ms,
    expectedSubjectNodeId: local_node_id,
    authenticatedObserverNodeId: coordination_relay_node_id,
  });
  const remote = validateVoidP2pDirectUpgradeCandidateV1(remoteCandidate, {
    nowMs: created_at_ms,
    expectedSubjectNodeId: remote_node_id,
    authenticatedObserverNodeId: coordination_relay_node_id,
  });

  const start_delay_ms = safeInteger(
    startDelayMs,
    "direct-upgrade start delay",
    VOID_P2P_DIRECT_UPGRADE_START_DELAY_MIN_MS_V1,
    VOID_P2P_DIRECT_UPGRADE_START_DELAY_MAX_MS_V1,
  );
  const attempt_timeout_ms = safeInteger(
    attemptTimeoutMs,
    "direct-upgrade attempt timeout",
    1,
    VOID_P2P_DIRECT_UPGRADE_ATTEMPT_TIMEOUT_MAX_MS_V1,
  );

  const attemptEnd = created_at_ms + start_delay_ms + attempt_timeout_ms;
  const expires_at_ms = Math.min(
    local.expires_at_ms,
    remote.expires_at_ms,
    attemptEnd,
  );
  if (
    !Number.isSafeInteger(attemptEnd) ||
    expires_at_ms <= created_at_ms + start_delay_ms
  ) {
    throw new Error("direct-upgrade candidates expire before the attempt can complete");
  }

  const session = {
    schema: VOID_P2P_DIRECT_UPGRADE_SESSION_SCHEMA_V1,
    network: VOID_P2P_DIRECT_UPGRADE_NETWORK_V1,
    chain_id: VOID_P2P_DIRECT_UPGRADE_CHAIN_ID_V1,
    session_id,
    coordination_relay_node_id,
    local_node_id,
    remote_node_id,
    local_candidate_id: local.candidate_id,
    remote_candidate_id: remote.candidate_id,
    start_delay_ms,
    attempt_timeout_ms,
    created_at_ms,
    expires_at_ms,
    invariants: candidateInvariants(),
    authority: zeroAuthority(),
    record_id: "",
  };
  session.record_id = contentId(
    SESSION_RECORD_ID_PREFIX,
    session,
    "record_id",
  );

  return validateVoidP2pDirectUpgradeSessionV1(session, {
    localCandidate: local,
    remoteCandidate: remote,
    nowMs: created_at_ms,
  });
}

export function validateVoidP2pDirectUpgradeSessionV1(
  raw,
  {
    localCandidate,
    remoteCandidate,
    nowMs = Date.now(),
  } = {},
) {
  const value = exactKeys(raw, SESSION_KEYS, "direct-upgrade session");
  if (value.schema !== VOID_P2P_DIRECT_UPGRADE_SESSION_SCHEMA_V1) {
    throw new Error("direct-upgrade session schema mismatch");
  }
  if (value.network !== VOID_P2P_DIRECT_UPGRADE_NETWORK_V1) {
    throw new Error("direct-upgrade session network mismatch");
  }
  if (value.chain_id !== VOID_P2P_DIRECT_UPGRADE_CHAIN_ID_V1) {
    throw new Error("direct-upgrade session chain ID mismatch");
  }

  const session_id = connectionId(value.session_id, "session ID");
  const coordination_relay_node_id = nodeId(
    value.coordination_relay_node_id,
    "coordination relay node ID",
  );
  const local_node_id = nodeId(value.local_node_id, "local node ID");
  const remote_node_id = nodeId(value.remote_node_id, "remote node ID");
  if (
    local_node_id === remote_node_id ||
    coordination_relay_node_id === local_node_id ||
    coordination_relay_node_id === remote_node_id
  ) {
    throw new Error("direct-upgrade session node identities must be distinct");
  }

  const start_delay_ms = safeInteger(
    value.start_delay_ms,
    "start delay",
    VOID_P2P_DIRECT_UPGRADE_START_DELAY_MIN_MS_V1,
    VOID_P2P_DIRECT_UPGRADE_START_DELAY_MAX_MS_V1,
  );
  const attempt_timeout_ms = safeInteger(
    value.attempt_timeout_ms,
    "attempt timeout",
    1,
    VOID_P2P_DIRECT_UPGRADE_ATTEMPT_TIMEOUT_MAX_MS_V1,
  );
  const created_at_ms = safeInteger(
    value.created_at_ms,
    "created at",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const expires_at_ms = safeInteger(
    value.expires_at_ms,
    "expires at",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const now_ms = safeInteger(
    nowMs,
    "current time",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  if (
    expires_at_ms <= created_at_ms + start_delay_ms ||
    expires_at_ms > created_at_ms + start_delay_ms + attempt_timeout_ms
  ) {
    throw new Error("direct-upgrade session expiry is invalid");
  }
  if (expires_at_ms <= now_ms) {
    throw new Error("direct-upgrade session is expired");
  }

  const invariants = exactKeys(
    value.invariants,
    SESSION_INVARIANT_KEYS,
    "direct-upgrade session invariants",
  );
  const expectedInvariants = candidateInvariants();
  for (const key of SESSION_INVARIANT_KEYS) {
    if (invariants[key] !== expectedInvariants[key]) {
      throw new Error(`direct-upgrade invariant ${key} mismatch`);
    }
  }
  const authority = validateAuthority(
    value.authority,
    "direct-upgrade session authority",
  );

  const session = Object.freeze({
    schema: value.schema,
    network: value.network,
    chain_id: value.chain_id,
    session_id,
    coordination_relay_node_id,
    local_node_id,
    remote_node_id,
    local_candidate_id: String(value.local_candidate_id || ""),
    remote_candidate_id: String(value.remote_candidate_id || ""),
    start_delay_ms,
    attempt_timeout_ms,
    created_at_ms,
    expires_at_ms,
    invariants: Object.freeze({ ...invariants }),
    authority,
    record_id: String(value.record_id || ""),
  });

  const expectedRecordId = contentId(
    SESSION_RECORD_ID_PREFIX,
    session,
    "record_id",
  );
  if (session.record_id !== expectedRecordId) {
    throw new Error("direct-upgrade session content ID mismatch");
  }

  if (localCandidate !== undefined) {
    const local = validateVoidP2pDirectUpgradeCandidateV1(localCandidate, {
      nowMs: now_ms,
      expectedSubjectNodeId: local_node_id,
      authenticatedObserverNodeId: coordination_relay_node_id,
    });
    if (local.candidate_id !== session.local_candidate_id) {
      throw new Error("direct-upgrade local candidate ID mismatch");
    }
  }
  if (remoteCandidate !== undefined) {
    const remote = validateVoidP2pDirectUpgradeCandidateV1(remoteCandidate, {
      nowMs: now_ms,
      expectedSubjectNodeId: remote_node_id,
      authenticatedObserverNodeId: coordination_relay_node_id,
    });
    if (remote.candidate_id !== session.remote_candidate_id) {
      throw new Error("direct-upgrade remote candidate ID mismatch");
    }
  }

  return session;
}

export function planVoidP2pDirectUpgradeAttemptV1({
  session,
  localCandidate,
  remoteCandidate,
  nowMs = Date.now(),
}) {
  const validated = validateVoidP2pDirectUpgradeSessionV1(session, {
    localCandidate,
    remoteCandidate,
    nowMs,
  });
  const local = validateVoidP2pDirectUpgradeCandidateV1(localCandidate, {
    nowMs,
    expectedSubjectNodeId: validated.local_node_id,
    authenticatedObserverNodeId: validated.coordination_relay_node_id,
  });
  const remote = validateVoidP2pDirectUpgradeCandidateV1(remoteCandidate, {
    nowMs,
    expectedSubjectNodeId: validated.remote_node_id,
    authenticatedObserverNodeId: validated.coordination_relay_node_id,
  });

  return Object.freeze({
    session_id: validated.session_id,
    coordination_relay_node_id: validated.coordination_relay_node_id,
    barrier: Object.freeze({
      start_after_ms: validated.start_delay_ms,
      attempt_timeout_ms: validated.attempt_timeout_ms,
    }),
    local_action: Object.freeze({
      keep_relay_connection_open: true,
      bind_local_port: local.relay_local_port,
      connect_to: remote.observed_address,
      expected_remote_node_id: validated.remote_node_id,
      persist_observed_candidate: false,
    }),
    remote_action: Object.freeze({
      keep_relay_connection_open: true,
      bind_local_port: remote.relay_local_port,
      connect_to: local.observed_address,
      expected_remote_node_id: validated.local_node_id,
      persist_observed_candidate: false,
    }),
  });
}

export function evaluateVoidP2pDirectUpgradeAttemptV1({
  session,
  side,
  directSocketConnected,
  authCompleted,
  authenticatedRemoteNodeId,
  elapsedMs,
  relayTransportAlive,
}) {
  const validated = validateVoidP2pDirectUpgradeSessionV1(session, {
    nowMs: session.created_at_ms,
  });
  if (side !== "local" && side !== "remote") {
    throw new Error("direct-upgrade result side must be local or remote");
  }
  if (typeof directSocketConnected !== "boolean") {
    throw new Error("direct-upgrade directSocketConnected must be boolean");
  }
  if (typeof authCompleted !== "boolean") {
    throw new Error("direct-upgrade authCompleted must be boolean");
  }
  if (typeof relayTransportAlive !== "boolean") {
    throw new Error("direct-upgrade relayTransportAlive must be boolean");
  }
  const elapsed_ms = safeInteger(
    elapsedMs,
    "direct-upgrade elapsed time",
    0,
    Number.MAX_SAFE_INTEGER,
  );

  const expectedRemoteNodeId =
    side === "local"
      ? validated.remote_node_id
      : validated.local_node_id;

  const authenticatedRemote =
    typeof authenticatedRemoteNodeId === "string" &&
    NODE_ID_RE.test(authenticatedRemoteNodeId)
      ? authenticatedRemoteNodeId
      : undefined;

  const withinDeadline =
    elapsed_ms <= validated.attempt_timeout_ms;
  const identityMatches =
    authCompleted &&
    authenticatedRemote === expectedRemoteNodeId;

  const promote_direct =
    directSocketConnected &&
    authCompleted &&
    identityMatches &&
    withinDeadline;

  return Object.freeze({
    promote_direct,
    reject_direct: !promote_direct,
    expected_remote_node_id: expectedRemoteNodeId,
    identity_match: identityMatches,
    within_attempt_deadline: withinDeadline,
    keep_relay_peer_stream: promote_direct
      ? false
      : relayTransportAlive,
    keep_relay_reservation: true,
    close_relay_peer_stream_after_direct_auth: promote_direct,
    candidate_persisted_to_verified_direct_cache: false,
    nat_type_inferred: false,
    relay_required_inferred: false,
    unreachable_inferred: false,
    direct_upgrade_proves_external_nat_traversal: false,
  });
}

export function voidP2pDirectUpgradeRetryDecisionV1({
  attemptCount,
  lastAttemptAtMs,
  nowMs,
  candidateExpiresAtMs,
}) {
  const attempt_count = safeInteger(
    attemptCount,
    "attempt count",
    0,
    VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPTS_PER_CANDIDATE_V1,
  );
  const last_attempt_at_ms = safeInteger(
    lastAttemptAtMs,
    "last attempt at",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const now_ms = safeInteger(
    nowMs,
    "current time",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const candidate_expires_at_ms = safeInteger(
    candidateExpiresAtMs,
    "candidate expires at",
    1,
    Number.MAX_SAFE_INTEGER,
  );

  const retry_at_ms =
    last_attempt_at_ms + VOID_P2P_DIRECT_UPGRADE_RETRY_COOLDOWN_MS_V1;
  const retry_allowed =
    attempt_count <
      VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPTS_PER_CANDIDATE_V1 &&
    retry_at_ms < candidate_expires_at_ms;

  return Object.freeze({
    retry_allowed,
    retry_at_ms,
    retry_now:
      retry_allowed &&
      now_ms >= retry_at_ms &&
      now_ms < candidate_expires_at_ms,
    max_attempts:
      VOID_P2P_DIRECT_UPGRADE_MAX_ATTEMPTS_PER_CANDIDATE_V1,
  });
}
