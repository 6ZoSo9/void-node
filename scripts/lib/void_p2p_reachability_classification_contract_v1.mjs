import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export const OBSERVATION_SCHEMA = "void_p2p_reachability_observation_v1";
export const RECORD_SCHEMA = "void_p2p_reachability_record_v1";
export const NETWORK = "VOID Network";
export const CHAIN_ID = 2050;
export const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;
export const DEFAULT_RECORD_VALIDITY_MS = 15 * 60 * 1000;
export const DIRECT_CONFIRMATION_MIN_INDEPENDENT_OBSERVERS = 2;
export const DIRECT_CONFIRMATION_MIN_INDEPENDENT_FAILURE_DOMAINS = 2;
export const MAX_OBSERVATIONS = 64;

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

const RECORD_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "generated_at",
  "expires_at",
  "subject_node_id",
  "candidate_address",
  "classification",
  "evidence_ids",
  "counts",
  "invariants",
  "authority",
  "record_id",
]);

const COUNT_KEYS = Object.freeze([
  "fresh_observations",
  "outbound_successes",
  "dialback_successes",
  "dialback_failures",
  "independent_success_domains",
  "independent_success_observers",
]);

const INVARIANT_KEYS = Object.freeze([
  "nat_type_inferred",
  "relay_required_inferred",
  "single_failed_dialback_proves_unreachable",
  "direct_confirmation_requires_independent_authenticated_dialbacks",
  "direct_confirmation_min_independent_observers",
  "direct_confirmation_min_independent_failure_domains",
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

const NON_PUBLIC_V4 = new net.BlockList();
for (const [network, prefix] of [
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
]) NON_PUBLIC_V4.addSubnet(network, prefix, "ipv4");

const NON_PUBLIC_V6 = new net.BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
]) NON_PUBLIC_V6.addSubnet(network, prefix, "ipv6");

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

function safeInteger(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} through ${max}`);
  }
  return value;
}

function timestampMs(value, label) {
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not a valid timestamp`);
  return parsed;
}

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON cannot contain a non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function contentId(prefix, value, idField) {
  const body = structuredClone(value);
  delete body[idField];
  return `${prefix}${crypto.createHash("sha256").update(canonicalJson(body)).digest("hex")}`;
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
    if (value[key] !== false) throw new Error(`${label} ${key} must be false`);
  }
  return Object.freeze({ ...value });
}

function validateNodeId(value, label) {
  const text = String(value || "");
  if (!/^[0-9a-f]{32}$/.test(text)) throw new Error(`${label} must be 32 lowercase hex characters`);
  return text;
}

function validateFailureDomain(value) {
  const text = String(value || "");
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(text)) {
    throw new Error("observer failure domain is invalid");
  }
  return text;
}

function canonicalIPv6Host(address) {
  const url = new URL(`http://[${address}]/`);
  const hostname = url.hostname;
  if (!hostname.startsWith("[") || !hostname.endsWith("]")) {
    throw new Error("candidate IPv6 address could not be canonicalized");
  }
  return hostname.slice(1, -1).toLowerCase();
}

export function parseCanonicalIpPeerAddress(raw) {
  const value = String(raw || "");
  if (!value || value.length > 256 || /[\s\x00-\x1f\x7f]/.test(value)) {
    throw new Error("candidate address contains whitespace/control characters or is empty");
  }
  if (/[\/@?#]/.test(value)) throw new Error("candidate address must be a bare IP and port");

  let host;
  let portText;
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    if (close <= 1 || value.indexOf("]", close + 1) !== -1 || value[close + 1] !== ":") {
      throw new Error("candidate IPv6 address has malformed brackets");
    }
    host = value.slice(1, close);
    portText = value.slice(close + 2);
    if (host.includes("%")) throw new Error("IPv6 zone identifiers are not accepted");
    if (net.isIP(host) !== 6) throw new Error("bracketed candidate host must be IPv6");
  } else {
    const first = value.indexOf(":");
    const last = value.lastIndexOf(":");
    if (first <= 0 || first !== last) throw new Error("IPv6 candidates must use brackets");
    host = value.slice(0, first);
    portText = value.slice(first + 1);
    if (net.isIP(host) !== 4) throw new Error("unbracketed candidate host must be IPv4");
  }

  if (!/^[1-9][0-9]{0,4}$/.test(portText)) throw new Error("candidate port is invalid");
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("candidate port is out of range");
  const family = net.isIP(host);
  const canonicalHost = family === 6 ? canonicalIPv6Host(host) : host;
  const canonical = family === 6 ? `[${canonicalHost}]:${port}` : `${canonicalHost}:${port}`;
  if (canonical !== value) throw new Error("candidate address is not canonical");
  return Object.freeze({ host: canonicalHost, port, family, canonical });
}

export function isPublicDirectIp(address) {
  const family = net.isIP(address);
  if (family === 4) return !NON_PUBLIC_V4.check(address, "ipv4");
  if (family === 6) {
    if (NON_PUBLIC_V6.check(address, "ipv6")) return false;
    const firstHextet = Number.parseInt(address.split(":", 1)[0] || "0", 16);
    return Number.isInteger(firstHextet) && firstHextet >= 0x2000 && firstHextet <= 0x3fff;
  }
  return false;
}

export function createReachabilityObservation({
  subjectNodeId,
  observerNodeId,
  observerFailureDomain,
  observedAt,
  kind,
  candidateAddress,
  outcome,
  authenticatedSubjectId = null,
  latencyMs = null,
}) {
  const body = {
    schema: OBSERVATION_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    subject_node_id: validateNodeId(subjectNodeId, "subject node ID"),
    observer_node_id: validateNodeId(observerNodeId, "observer node ID"),
    observer_failure_domain: validateFailureDomain(observerFailureDomain),
    observed_at: new Date(timestampMs(observedAt, "observed_at")).toISOString(),
    kind,
    candidate_address: parseCanonicalIpPeerAddress(candidateAddress).canonical,
    outcome,
    authenticated_subject_id: authenticatedSubjectId,
    latency_ms: latencyMs,
    authority: zeroAuthority(),
  };
  validateObservationSemantics(body);
  return Object.freeze({ ...body, observation_id: contentId("voidpro1_", body, "observation_id") });
}

function validateObservationSemantics(observation) {
  if (observation.subject_node_id === observation.observer_node_id) {
    throw new Error("subject and observer node IDs must differ");
  }
  if (!["authenticated_outbound_seen", "authenticated_dialback"].includes(observation.kind)) {
    throw new Error("reachability observation kind is invalid");
  }
  if (!["success", "failure"].includes(observation.outcome)) {
    throw new Error("reachability observation outcome is invalid");
  }
  if (observation.kind === "authenticated_outbound_seen" && observation.outcome !== "success") {
    throw new Error("authenticated outbound observation must be successful");
  }
  if (observation.outcome === "success") {
    if (observation.authenticated_subject_id !== observation.subject_node_id) {
      throw new Error("successful observation must authenticate the exact subject node ID");
    }
    safeInteger(observation.latency_ms, "successful observation latency_ms", { min: 0, max: 60000 });
  } else {
    if (observation.authenticated_subject_id !== null || observation.latency_ms !== null) {
      throw new Error("failed observation must not claim authenticated identity or latency");
    }
  }
}

export function validateReachabilityObservation(raw, { nowMs = Date.now(), maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const observation = exactKeys(structuredClone(raw), OBSERVATION_KEYS, "reachability observation");
  if (observation.schema !== OBSERVATION_SCHEMA || observation.network !== NETWORK || observation.chain_id !== CHAIN_ID) {
    throw new Error("reachability observation network contract mismatch");
  }
  validateNodeId(observation.subject_node_id, "subject node ID");
  validateNodeId(observation.observer_node_id, "observer node ID");
  validateFailureDomain(observation.observer_failure_domain);
  parseCanonicalIpPeerAddress(observation.candidate_address);
  validateAuthority(observation.authority, "reachability observation authority");
  validateObservationSemantics(observation);
  const observedMs = timestampMs(observation.observed_at, "observed_at");
  safeInteger(maxAgeMs, "maximum observation age", { min: 1000, max: 24 * 60 * 60 * 1000 });
  if (!Number.isFinite(nowMs)) throw new Error("reachability validation time is invalid");
  if (observedMs > nowMs + 5 * 60 * 1000) throw new Error("reachability observation is from the future");
  const expectedId = contentId("voidpro1_", observation, "observation_id");
  if (observation.observation_id !== expectedId) throw new Error("reachability observation ID does not match content");
  return Object.freeze({ observation: Object.freeze(structuredClone(observation)), observedMs, stale: nowMs - observedMs > maxAgeMs });
}

export function classifyReachability(rawObservations, {
  nowMs = Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  recordValidityMs = DEFAULT_RECORD_VALIDITY_MS,
} = {}) {
  if (!Array.isArray(rawObservations) || rawObservations.length < 1 || rawObservations.length > MAX_OBSERVATIONS) {
    throw new Error(`reachability classification requires 1 through ${MAX_OBSERVATIONS} observations`);
  }
  const validity = safeInteger(recordValidityMs, "record validity", { min: 60_000, max: 60 * 60 * 1000 });
  const validated = rawObservations.map((entry) => validateReachabilityObservation(entry, { nowMs, maxAgeMs }));
  const subjectNodeId = validated[0].observation.subject_node_id;
  const candidateAddress = validated[0].observation.candidate_address;
  const seenIds = new Set();
  for (const entry of validated) {
    const observation = entry.observation;
    if (observation.subject_node_id !== subjectNodeId) throw new Error("reachability observations must share one subject node ID");
    if (observation.candidate_address !== candidateAddress) throw new Error("reachability observations must share one candidate address");
    if (seenIds.has(observation.observation_id)) throw new Error("reachability observations contain a duplicate observation ID");
    seenIds.add(observation.observation_id);
  }

  const fresh = validated.filter((entry) => !entry.stale).map((entry) => entry.observation);
  const parsed = parseCanonicalIpPeerAddress(candidateAddress);
  const publicDirectCandidate = isPublicDirectIp(parsed.host);
  const outboundSuccesses = fresh.filter((entry) => entry.kind === "authenticated_outbound_seen" && entry.outcome === "success");
  const dialbackSuccesses = fresh.filter((entry) => entry.kind === "authenticated_dialback" && entry.outcome === "success");
  const dialbackFailures = fresh.filter((entry) => entry.kind === "authenticated_dialback" && entry.outcome === "failure");
  const successDomains = new Set(dialbackSuccesses.map((entry) => entry.observer_failure_domain));
  const successObservers = new Set(dialbackSuccesses.map((entry) => entry.observer_node_id));
  const directConfirmed =
    successDomains.size >= DIRECT_CONFIRMATION_MIN_INDEPENDENT_FAILURE_DOMAINS &&
    successObservers.size >= DIRECT_CONFIRMATION_MIN_INDEPENDENT_OBSERVERS;

  let classification;
  if (!publicDirectCandidate) classification = "non_public_address";
  else if (directConfirmed) classification = "direct_confirmed";
  else if (dialbackSuccesses.length >= 1) classification = "direct_observed_unconfirmed";
  else if (outboundSuccesses.length >= 1) classification = "outbound_observed";
  else classification = "unknown";

  const generatedAt = new Date(nowMs).toISOString();
  const body = {
    schema: RECORD_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    generated_at: generatedAt,
    expires_at: new Date(nowMs + validity).toISOString(),
    subject_node_id: subjectNodeId,
    candidate_address: candidateAddress,
    classification,
    evidence_ids: fresh.map((entry) => entry.observation_id).sort(),
    counts: {
      fresh_observations: fresh.length,
      outbound_successes: outboundSuccesses.length,
      dialback_successes: dialbackSuccesses.length,
      dialback_failures: dialbackFailures.length,
      independent_success_domains: successDomains.size,
      independent_success_observers: successObservers.size,
    },
    invariants: {
      nat_type_inferred: false,
      relay_required_inferred: false,
      single_failed_dialback_proves_unreachable: false,
      direct_confirmation_requires_independent_authenticated_dialbacks: true,
      direct_confirmation_min_independent_observers: DIRECT_CONFIRMATION_MIN_INDEPENDENT_OBSERVERS,
      direct_confirmation_min_independent_failure_domains: DIRECT_CONFIRMATION_MIN_INDEPENDENT_FAILURE_DOMAINS,
      runtime_integration_performed: false,
      network_calls_performed: false,
    },
    authority: zeroAuthority(),
  };
  const record = Object.freeze({ ...body, record_id: contentId("voidprc1_", body, "record_id") });
  validateReachabilityRecord(record, { nowMs });
  return record;
}

export function validateReachabilityRecord(raw, { nowMs = Date.now() } = {}) {
  const record = exactKeys(structuredClone(raw), RECORD_KEYS, "reachability record");
  if (record.schema !== RECORD_SCHEMA || record.network !== NETWORK || record.chain_id !== CHAIN_ID) {
    throw new Error("reachability record network contract mismatch");
  }
  validateNodeId(record.subject_node_id, "record subject node ID");
  parseCanonicalIpPeerAddress(record.candidate_address);
  if (!["direct_confirmed", "direct_observed_unconfirmed", "outbound_observed", "non_public_address", "unknown"].includes(record.classification)) {
    throw new Error("reachability record classification is invalid");
  }
  if (!Array.isArray(record.evidence_ids) || record.evidence_ids.length > MAX_OBSERVATIONS) {
    throw new Error("reachability record evidence IDs are invalid");
  }
  if (record.evidence_ids.some((id) => !/^voidpro1_[0-9a-f]{64}$/.test(String(id)))) {
    throw new Error("reachability record contains malformed evidence ID");
  }
  if (new Set(record.evidence_ids).size !== record.evidence_ids.length) throw new Error("reachability record contains duplicate evidence IDs");
  if (JSON.stringify([...record.evidence_ids].sort()) !== JSON.stringify(record.evidence_ids)) throw new Error("reachability record evidence IDs must be sorted");
  const counts = exactKeys(record.counts, COUNT_KEYS, "reachability record counts");
  for (const key of COUNT_KEYS) safeInteger(counts[key], `reachability count ${key}`, { min: 0, max: MAX_OBSERVATIONS });
  if (counts.independent_success_domains > counts.dialback_successes) throw new Error("independent success-domain count exceeds dialback successes");
  if (counts.independent_success_observers > counts.dialback_successes) throw new Error("independent success-observer count exceeds dialback successes");
  if (counts.fresh_observations !== record.evidence_ids.length) throw new Error("fresh observation count does not match evidence list");
  if (counts.outbound_successes + counts.dialback_successes + counts.dialback_failures !== counts.fresh_observations) {
    throw new Error("reachability record counts do not partition fresh observations");
  }
  const invariants = exactKeys(record.invariants, INVARIANT_KEYS, "reachability record invariants");
  if (invariants.nat_type_inferred !== false || invariants.relay_required_inferred !== false || invariants.single_failed_dialback_proves_unreachable !== false || invariants.direct_confirmation_requires_independent_authenticated_dialbacks !== true || invariants.direct_confirmation_min_independent_observers !== DIRECT_CONFIRMATION_MIN_INDEPENDENT_OBSERVERS || invariants.direct_confirmation_min_independent_failure_domains !== DIRECT_CONFIRMATION_MIN_INDEPENDENT_FAILURE_DOMAINS || invariants.runtime_integration_performed !== false || invariants.network_calls_performed !== false) {
    throw new Error("reachability record inference/runtime invariants are invalid");
  }
  validateAuthority(record.authority, "reachability record authority");
  if (!Number.isFinite(nowMs)) throw new Error("reachability record validation time is invalid");
  const generatedAt = timestampMs(record.generated_at, "record generated_at");
  const expiresAt = timestampMs(record.expires_at, "record expires_at");
  if (generatedAt > nowMs + 5 * 60 * 1000 || expiresAt <= nowMs || expiresAt <= generatedAt || expiresAt - generatedAt > 60 * 60 * 1000) {
    throw new Error("reachability record time contract is invalid");
  }

  const publicDirectCandidate = isPublicDirectIp(parseCanonicalIpPeerAddress(record.candidate_address).host);
  const canConfirm =
    counts.dialback_successes >= DIRECT_CONFIRMATION_MIN_INDEPENDENT_OBSERVERS &&
    counts.independent_success_observers >= DIRECT_CONFIRMATION_MIN_INDEPENDENT_OBSERVERS &&
    counts.independent_success_domains >= DIRECT_CONFIRMATION_MIN_INDEPENDENT_FAILURE_DOMAINS;
  let expectedClassification;
  if (!publicDirectCandidate) expectedClassification = "non_public_address";
  else if (canConfirm) expectedClassification = "direct_confirmed";
  else if (counts.dialback_successes >= 1) expectedClassification = "direct_observed_unconfirmed";
  else if (counts.outbound_successes >= 1) expectedClassification = "outbound_observed";
  else expectedClassification = "unknown";
  if (record.classification !== expectedClassification) {
    throw new Error("reachability record classification does not match its counts/address semantics");
  }
  const expectedId = contentId("voidprc1_", record, "record_id");
  if (record.record_id !== expectedId) throw new Error("reachability record ID does not match content");
  return Object.freeze(structuredClone(record));
}

export function loadObservationFile(rawPath, { maxBytes = 1024 * 1024 } = {}) {
  const target = path.resolve(String(rawPath || ""));
  const status = fs.lstatSync(target);
  if (status.isSymbolicLink() || !status.isFile()) throw new Error("observation file must be one regular non-symlink file");
  if (fs.realpathSync(target) !== target) throw new Error("observation file path must already be canonical");
  if (status.size < 2 || status.size > maxBytes) throw new Error("observation file size is invalid");
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(target, "utf8")); }
  catch (error) { throw new Error(`observation file JSON is invalid: ${error.message}`); }
  if (!Array.isArray(parsed)) throw new Error("observation file must contain a JSON array");
  return Object.freeze({ target, observations: parsed });
}
