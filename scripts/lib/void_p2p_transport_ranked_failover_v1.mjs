import crypto from "node:crypto";

import {
  canonicalJson,
  parseCanonicalIpPeerAddress,
  validateReachabilityRecord,
} from "./void_p2p_reachability_classification_contract_v1.mjs";

export const VOID_P2P_TRANSPORT_RANKED_FAILOVER_V1 =
  "void_p2p_transport_ranked_failover_v1";

export const VOID_P2P_TRANSPORT_MAX_DIRECT_CANDIDATES_V1 = 16;
export const VOID_P2P_TRANSPORT_MAX_RELAY_CANDIDATES_V1 = 8;
export const VOID_P2P_TRANSPORT_MAX_CANDIDATES_V1 =
  VOID_P2P_TRANSPORT_MAX_DIRECT_CANDIDATES_V1 +
  VOID_P2P_TRANSPORT_MAX_RELAY_CANDIDATES_V1;
export const VOID_P2P_TRANSPORT_RELAY_MAX_RESERVATION_TTL_MS_V1 =
  10 * 60 * 1000;

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const RELAY_ID_RE = /^[0-9a-f]{32}$/;
const FAILURE_DOMAIN_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const CANDIDATE_ID_RE = /^voidptc1_[0-9a-f]{64}$/;
const PLAN_ID_RE = /^voidptp1_[0-9a-f]{64}$/;

const PLAN_KEYS = Object.freeze([
  "schema",
  "subject_node_id",
  "created_at",
  "expires_at",
  "candidates",
  "invariants",
  "authority",
  "plan_id",
]);

const CANDIDATE_COMMON_KEYS = Object.freeze([
  "candidate_id",
  "subject_node_id",
  "transport",
  "rank",
  "failure_domain",
  "identity_source",
  "direct_identity_evidence",
]);

const DIRECT_KEYS = Object.freeze([
  ...CANDIDATE_COMMON_KEYS,
  "address",
  "address_family",
  "reachability_classification",
  "reachability_record_id",
]);

const RELAY_KEYS = Object.freeze([
  ...CANDIDATE_COMMON_KEYS,
  "relay_node_id",
  "relay_peer_state",
  "reservation_id",
  "reservation_expires_at_ms",
]);

const INVARIANT_KEYS = Object.freeze([
  "direct_transport_preferred",
  "relay_transport_can_define_endpoint_identity",
  "relay_success_promotes_direct_reachability",
  "failed_candidate_changes_reachability_record",
  "failed_candidate_infers_nat_type",
  "failed_candidate_infers_relay_required",
  "runtime_integration_performed",
  "network_calls_performed",
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

function validateNodeId(value, label) {
  const text = String(value || "");
  if (!NODE_ID_RE.test(text)) {
    throw new Error(`${label} must be 32 lowercase hex characters`);
  }
  return text;
}

function validateRelayId(value, label) {
  const text = String(value || "");
  if (!RELAY_ID_RE.test(text)) {
    throw new Error(`${label} must be 32 lowercase hex characters`);
  }
  return text;
}

function validateFailureDomain(value, label) {
  const text = String(value || "");
  if (!FAILURE_DOMAIN_RE.test(text)) {
    throw new Error(`${label} is invalid`);
  }
  return text;
}

function timestampMs(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be an ISO timestamp string`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error(`${label} must use canonical ISO UTC form`);
  }
  return parsed;
}

function contentId(prefix, value, idField) {
  const body = structuredClone(value);
  delete body[idField];
  return `${prefix}${crypto
    .createHash("sha256")
    .update(canonicalJson(body))
    .digest("hex")}`;
}

function zeroAuthority() {
  return Object.freeze(
    Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false])),
  );
}

function expectedInvariants() {
  return Object.freeze({
    direct_transport_preferred: true,
    relay_transport_can_define_endpoint_identity: false,
    relay_success_promotes_direct_reachability: false,
    failed_candidate_changes_reachability_record: false,
    failed_candidate_infers_nat_type: false,
    failed_candidate_infers_relay_required: false,
    runtime_integration_performed: false,
    network_calls_performed: false,
  });
}

function validateAuthority(raw) {
  const authority = exactKeys(
    raw,
    AUTHORITY_KEYS,
    "transport failover authority",
  );
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error(`transport failover authority ${key} must be false`);
    }
  }
  return zeroAuthority();
}

function validateInvariants(raw) {
  const invariants = exactKeys(
    raw,
    INVARIANT_KEYS,
    "transport failover invariants",
  );
  const expected = expectedInvariants();
  for (const key of INVARIANT_KEYS) {
    if (invariants[key] !== expected[key]) {
      throw new Error(`transport failover invariant ${key} mismatch`);
    }
  }
  return expected;
}

function directRank(record) {
  const parsed = parseCanonicalIpPeerAddress(record.candidate_address);
  const familyBias = parsed.family === 6 ? 0 : 1;

  if (record.classification === "direct_confirmed") {
    return 10 + familyBias;
  }
  if (record.classification === "direct_observed_unconfirmed") {
    return 20 + familyBias;
  }
  return null;
}

function candidateSortKey(candidate) {
  const locator =
    candidate.transport === "direct_tcp_v1"
      ? candidate.address
      : candidate.relay_node_id;
  return [
    String(candidate.rank).padStart(4, "0"),
    candidate.transport,
    candidate.failure_domain,
    locator,
    candidate.candidate_id,
  ].join("\u0000");
}

function buildDirectCandidate(rawRecord, subjectNodeId, nowMs) {
  const record = validateReachabilityRecord(rawRecord, { nowMs });
  if (record.subject_node_id !== subjectNodeId) {
    throw new Error(
      "direct reachability record subject does not match transport plan subject",
    );
  }

  const rank = directRank(record);
  if (rank === null) return null;

  const parsed = parseCanonicalIpPeerAddress(record.candidate_address);
  const body = {
    subject_node_id: subjectNodeId,
    transport: "direct_tcp_v1",
    rank,
    failure_domain: parsed.family === 6 ? "direct-ipv6" : "direct-ipv4",
    identity_source: "end_to_end_void_auth_v1",
    direct_identity_evidence: true,
    address: record.candidate_address,
    address_family: parsed.family,
    reachability_classification: record.classification,
    reachability_record_id: record.record_id,
  };

  return Object.freeze({
    candidate_id: contentId("voidptc1_", body, "candidate_id"),
    ...body,
  });
}

function buildRelayCandidate(rawRelay, subjectNodeId, nowMs) {
  const relay = exactKeys(
    structuredClone(rawRelay),
    [
      "subject_node_id",
      "relay_node_id",
      "relay_peer_state",
      "failure_domain",
      "reservation_id",
      "reservation_expires_at_ms",
    ],
    "relay transport candidate",
  );

  if (
    validateNodeId(relay.subject_node_id, "relay subject node ID") !==
    subjectNodeId
  ) {
    throw new Error("relay candidate subject does not match plan subject");
  }

  const relayNodeId = validateNodeId(
    relay.relay_node_id,
    "relay node ID",
  );
  if (relayNodeId === subjectNodeId) {
    throw new Error("relay node cannot equal target subject node");
  }
  if (relay.relay_peer_state !== "authenticated_direct_peer_v1") {
    throw new Error(
      "relay candidate requires an authenticated direct relay peer",
    );
  }

  const failureDomain = validateFailureDomain(
    relay.failure_domain,
    "relay failure domain",
  );
  const reservationId = validateRelayId(
    relay.reservation_id,
    "relay reservation ID",
  );
  const reservationExpiresAtMs = relay.reservation_expires_at_ms;
  if (
    !Number.isSafeInteger(reservationExpiresAtMs) ||
    reservationExpiresAtMs <= nowMs ||
    reservationExpiresAtMs - nowMs >
      VOID_P2P_TRANSPORT_RELAY_MAX_RESERVATION_TTL_MS_V1
  ) {
    throw new Error(
      "relay reservation must be active at plan creation and within relay-v1 TTL bounds",
    );
  }

  const body = {
    subject_node_id: subjectNodeId,
    transport: "relay_v1",
    rank: 100,
    failure_domain: failureDomain,
    identity_source: "end_to_end_void_auth_v1",
    direct_identity_evidence: false,
    relay_node_id: relayNodeId,
    relay_peer_state: "authenticated_direct_peer_v1",
    reservation_id: reservationId,
    reservation_expires_at_ms: reservationExpiresAtMs,
  };

  return Object.freeze({
    candidate_id: contentId("voidptc1_", body, "candidate_id"),
    ...body,
  });
}

function validateCandidate(raw, subjectNodeId, planCreatedAtMs) {
  const transport = String(raw?.transport || "");
  const expected =
    transport === "direct_tcp_v1"
      ? DIRECT_KEYS
      : transport === "relay_v1"
        ? RELAY_KEYS
        : null;
  if (!expected) {
    throw new Error("transport candidate type is unsupported");
  }

  const candidate = exactKeys(
    structuredClone(raw),
    expected,
    "transport candidate",
  );

  if (
    validateNodeId(candidate.subject_node_id, "candidate subject node ID") !==
    subjectNodeId
  ) {
    throw new Error("transport candidate subject mismatch");
  }
  if (!CANDIDATE_ID_RE.test(String(candidate.candidate_id || ""))) {
    throw new Error("transport candidate ID is malformed");
  }
  validateFailureDomain(
    candidate.failure_domain,
    "candidate failure domain",
  );
  if (candidate.identity_source !== "end_to_end_void_auth_v1") {
    throw new Error("transport candidate identity source is invalid");
  }

  if (transport === "direct_tcp_v1") {
    const parsed = parseCanonicalIpPeerAddress(candidate.address);
    if (candidate.address_family !== parsed.family) {
      throw new Error("direct candidate address-family mismatch");
    }
    if (
      !["direct_confirmed", "direct_observed_unconfirmed"].includes(
        candidate.reachability_classification,
      )
    ) {
      throw new Error("direct candidate reachability class is not dial-eligible");
    }
    const expectedRank =
      candidate.reachability_classification === "direct_confirmed"
        ? 10 + (parsed.family === 6 ? 0 : 1)
        : 20 + (parsed.family === 6 ? 0 : 1);
    if (candidate.rank !== expectedRank) {
      throw new Error("direct candidate rank does not match evidence/family");
    }
    if (
      typeof candidate.reachability_record_id !== "string" ||
      !/^voidprc1_[0-9a-f]{64}$/.test(candidate.reachability_record_id)
    ) {
      throw new Error("direct candidate reachability record ID is malformed");
    }
    if (candidate.direct_identity_evidence !== true) {
      throw new Error("direct candidate must carry direct identity evidence");
    }
  } else {
    validateNodeId(candidate.relay_node_id, "candidate relay node ID");
    if (candidate.relay_node_id === subjectNodeId) {
      throw new Error("candidate relay node cannot equal subject");
    }
    if (candidate.relay_peer_state !== "authenticated_direct_peer_v1") {
      throw new Error(
        "candidate relay peer state must be authenticated_direct_peer_v1",
      );
    }
    validateRelayId(candidate.reservation_id, "candidate relay reservation ID");
    if (
      !Number.isSafeInteger(candidate.reservation_expires_at_ms) ||
      candidate.reservation_expires_at_ms <= planCreatedAtMs ||
      candidate.reservation_expires_at_ms - planCreatedAtMs >
        VOID_P2P_TRANSPORT_RELAY_MAX_RESERVATION_TTL_MS_V1
    ) {
      throw new Error(
        "candidate relay reservation expiry is outside relay-v1 TTL bounds",
      );
    }
    if (candidate.rank !== 100) {
      throw new Error("relay candidate rank must be 100");
    }
    if (candidate.direct_identity_evidence !== false) {
      throw new Error(
        "relay candidate must not claim direct identity/reachability evidence",
      );
    }
  }

  const expectedId = contentId("voidptc1_", candidate, "candidate_id");
  if (candidate.candidate_id !== expectedId) {
    throw new Error("transport candidate ID does not match content");
  }

  return Object.freeze(candidate);
}

export function buildVoidP2PTransportFailoverPlanV1({
  subjectNodeId,
  reachabilityRecords = [],
  relayReservations = [],
  nowMs = Date.now(),
  validityMs = 5 * 60 * 1000,
}) {
  const subject = validateNodeId(subjectNodeId, "transport plan subject node ID");
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("transport plan clock is invalid");
  }
  if (
    !Number.isSafeInteger(validityMs) ||
    validityMs < 60_000 ||
    validityMs > 15 * 60 * 1000
  ) {
    throw new Error(
      "transport plan validity must be from one through fifteen minutes",
    );
  }

  if (
    !Array.isArray(reachabilityRecords) ||
    reachabilityRecords.length >
      VOID_P2P_TRANSPORT_MAX_DIRECT_CANDIDATES_V1
  ) {
    throw new Error("direct reachability candidate count is invalid");
  }
  if (
    !Array.isArray(relayReservations) ||
    relayReservations.length >
      VOID_P2P_TRANSPORT_MAX_RELAY_CANDIDATES_V1
  ) {
    throw new Error("relay candidate count is invalid");
  }

  const direct = reachabilityRecords
    .map((record) => buildDirectCandidate(record, subject, nowMs))
    .filter(Boolean);
  const relays = relayReservations
    .map((relay) => buildRelayCandidate(relay, subject, nowMs))
    .filter(Boolean);

  const candidates = [...direct, ...relays].sort((left, right) =>
    candidateSortKey(left).localeCompare(candidateSortKey(right)),
  );

  if (candidates.length === 0) {
    throw new Error("transport failover plan has no eligible candidates");
  }
  if (candidates.length > VOID_P2P_TRANSPORT_MAX_CANDIDATES_V1) {
    throw new Error("transport failover plan exceeds candidate bound");
  }

  const candidateIds = new Set();
  const directAddresses = new Set();
  const relayReservationsSeen = new Set();
  const relayFailureDomains = new Set();

  for (const candidate of candidates) {
    if (candidateIds.has(candidate.candidate_id)) {
      throw new Error("transport failover plan contains duplicate candidate ID");
    }
    candidateIds.add(candidate.candidate_id);

    if (candidate.transport === "direct_tcp_v1") {
      if (directAddresses.has(candidate.address)) {
        throw new Error(
          "transport failover plan contains duplicate direct address",
        );
      }
      directAddresses.add(candidate.address);
    } else {
      const key = candidate.relay_node_id;
      if (relayReservationsSeen.has(key)) {
        throw new Error(
          "transport failover plan contains duplicate relay route",
        );
      }
      relayReservationsSeen.add(key);
      if (relayFailureDomains.has(candidate.failure_domain)) {
        throw new Error(
          "transport failover plan relay failure domains must be distinct",
        );
      }
      relayFailureDomains.add(candidate.failure_domain);
    }
  }

  const body = {
    schema: VOID_P2P_TRANSPORT_RANKED_FAILOVER_V1,
    subject_node_id: subject,
    created_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + validityMs).toISOString(),
    candidates,
    invariants: expectedInvariants(),
    authority: zeroAuthority(),
  };

  const plan = Object.freeze({
    ...body,
    plan_id: contentId("voidptp1_", body, "plan_id"),
  });
  return validateVoidP2PTransportFailoverPlanV1(plan, { nowMs });
}

export function validateVoidP2PTransportFailoverPlanV1(
  rawPlan,
  { nowMs = Date.now() } = {},
) {
  const plan = exactKeys(
    structuredClone(rawPlan),
    PLAN_KEYS,
    "transport failover plan",
  );

  if (plan.schema !== VOID_P2P_TRANSPORT_RANKED_FAILOVER_V1) {
    throw new Error("transport failover plan schema mismatch");
  }
  const subject = validateNodeId(
    plan.subject_node_id,
    "transport failover plan subject",
  );
  if (!PLAN_ID_RE.test(String(plan.plan_id || ""))) {
    throw new Error("transport failover plan ID is malformed");
  }
  if (!Array.isArray(plan.candidates) || plan.candidates.length < 1) {
    throw new Error("transport failover plan candidates are invalid");
  }
  if (
    plan.candidates.length > VOID_P2P_TRANSPORT_MAX_CANDIDATES_V1
  ) {
    throw new Error("transport failover plan exceeds candidate bound");
  }
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("transport failover plan validation clock is invalid");
  }

  const createdAtMs = timestampMs(
    plan.created_at,
    "transport failover plan created_at",
  );
  const expiresAtMs = timestampMs(
    plan.expires_at,
    "transport failover plan expires_at",
  );
  if (
    createdAtMs > nowMs + 5 * 60 * 1000 ||
    expiresAtMs <= nowMs ||
    expiresAtMs <= createdAtMs ||
    expiresAtMs - createdAtMs > 15 * 60 * 1000
  ) {
    throw new Error("transport failover plan time contract is invalid");
  }

  const candidates = plan.candidates.map((candidate) =>
    validateCandidate(candidate, subject, createdAtMs),
  );
  const sorted = [...candidates].sort((left, right) =>
    candidateSortKey(left).localeCompare(candidateSortKey(right)),
  );
  if (canonicalJson(candidates) !== canonicalJson(sorted)) {
    throw new Error("transport failover candidates are not canonical/ranked");
  }

  const ids = new Set();
  const directAddresses = new Set();
  const relayKeys = new Set();
  const relayFailureDomains = new Set();

  for (const candidate of candidates) {
    if (ids.has(candidate.candidate_id)) {
      throw new Error("transport failover plan has duplicate candidate ID");
    }
    ids.add(candidate.candidate_id);

    if (candidate.transport === "direct_tcp_v1") {
      if (directAddresses.has(candidate.address)) {
        throw new Error("transport failover plan has duplicate direct address");
      }
      directAddresses.add(candidate.address);
    } else {
      const key = candidate.relay_node_id;
      if (relayKeys.has(key)) {
        throw new Error(
          "transport failover plan has duplicate relay route",
        );
      }
      relayKeys.add(key);
      if (relayFailureDomains.has(candidate.failure_domain)) {
        throw new Error(
          "transport failover plan relay failure domains must be distinct",
        );
      }
      relayFailureDomains.add(candidate.failure_domain);
    }
  }

  validateInvariants(plan.invariants);
  validateAuthority(plan.authority);

  const expectedId = contentId("voidptp1_", plan, "plan_id");
  if (plan.plan_id !== expectedId) {
    throw new Error("transport failover plan ID does not match content");
  }

  return Object.freeze(structuredClone(plan));
}

export function nextVoidP2PTransportCandidateV1(
  rawPlan,
  failedCandidateIds = [],
  { nowMs = Date.now() } = {},
) {
  const plan = validateVoidP2PTransportFailoverPlanV1(rawPlan, { nowMs });
  if (!Array.isArray(failedCandidateIds)) {
    throw new Error("failed candidate IDs must be an array");
  }

  const failed = new Set();
  for (const id of failedCandidateIds) {
    const text = String(id || "");
    if (!CANDIDATE_ID_RE.test(text)) {
      throw new Error("failed candidate ID is malformed");
    }
    if (failed.has(text)) {
      throw new Error("failed candidate ID list contains a duplicate");
    }
    failed.add(text);
  }

  return (
    plan.candidates.find(
      (candidate) =>
        !failed.has(candidate.candidate_id) &&
        (candidate.transport !== "relay_v1" ||
          candidate.reservation_expires_at_ms > nowMs),
    ) || null
  );
}
