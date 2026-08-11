import crypto from "node:crypto";

import { canonicalJson } from "./void_bootstrap_external_acceptance_receipt_v1.mjs";

export const VOID_BOOTSTRAP_EXTERNAL_EVIDENCE_VERIFIER_V1 =
  "void_bootstrap_external_evidence_verifier_v1";

const KINDS = Object.freeze([
  "first_paths_before_sync",
  "first_ready_after_sync",
  "first_peers_after_sync",
  "first_ready_after_removal",
  "first_peers_after_removal",
  "second_ready",
  "second_peers",
]);
const BUNDLE_KEYS = Object.freeze(["schema", ...KINDS]);
const OBSERVATION_KEYS = Object.freeze([
  "kind",
  "machine_label",
  "observed_at",
  "payload",
  "provenance",
]);
const PROVENANCE_KEYS = Object.freeze([
  "collector_id",
  "capture_id",
  "source_kind",
  "source_sha256",
]);
const KIND_TO_EVIDENCE_KEY = Object.freeze({
  first_paths_before_sync: "first_paths_before_sync_sha256",
  first_ready_after_sync: "first_ready_after_sync_sha256",
  first_peers_after_sync: "first_peers_after_sync_sha256",
  first_ready_after_removal: "first_ready_after_removal_sha256",
  first_peers_after_removal: "first_peers_after_removal_sha256",
  second_ready: "second_ready_sha256",
  second_peers: "second_peers_sha256",
});
const PAYLOAD_KEYS = Object.freeze({
  first_paths_before_sync: ["eligible_paths_before_first_sync"],
  first_ready_after_sync: ["selected_path_id", "head", "gap", "txroot_live"],
  first_peers_after_sync: ["authenticated_first_peer_id", "learned_verified_peer_ids"],
  first_ready_after_removal: ["head", "gap", "txroot_live", "first_contact_removal"],
  first_peers_after_removal: ["connected_verified_peer_ids"],
  second_ready: [
    "unavailable_component_role",
    "unavailable_component_class",
    "unavailable_failure_domain",
    "selected_path_id",
    "head",
    "gap",
    "txroot_live",
  ],
  second_peers: ["authenticated_first_peer_id", "learned_verified_peer_ids"],
});

const SHA256_RE = /^[0-9a-f]{64}$/;
const LABEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

function plainObject(value, what) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${what} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, what) {
  const object = plainObject(value, what);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${what} keys mismatch`);
  }
  return object;
}

function validLabel(value, what) {
  const text = String(value || "");
  if (!LABEL_RE.test(text)) throw new Error(`${what} is invalid`);
  return text;
}

function canonicalIso(value, what) {
  const text = String(value || "");
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== text) {
    throw new Error(`${what} must be canonical ISO-8601 UTC`);
  }
  return text;
}

function hashCanonical(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function equalUnordered(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const sort = (values) =>
    [...values].sort((x, y) => canonicalJson(x).localeCompare(canonicalJson(y)));
  return canonicalJson(sort(a)) === canonicalJson(sort(b));
}

function greenReady(payload) {
  return (
    Number.isSafeInteger(payload.head) &&
    payload.head > 0 &&
    payload.gap === 0 &&
    payload.txroot_live === 1
  );
}

function validateObservation(raw, kind) {
  const observation = exactKeys(
    structuredClone(raw),
    OBSERVATION_KEYS,
    `${kind} observation`,
  );
  if (observation.kind !== kind) throw new Error(`${kind} observation kind mismatch`);
  const machineLabel = validLabel(observation.machine_label, `${kind} machine label`);
  const observedAt = canonicalIso(observation.observed_at, `${kind} observed_at`);
  const payload = exactKeys(observation.payload, PAYLOAD_KEYS[kind], `${kind} payload`);
  const provenance = exactKeys(observation.provenance, PROVENANCE_KEYS, `${kind} provenance`);
  validLabel(provenance.collector_id, `${kind} collector_id`);
  validLabel(provenance.capture_id, `${kind} capture_id`);
  if (provenance.source_kind !== "external_machine_capture_v1") {
    throw new Error(`${kind} source_kind is invalid`);
  }
  if (!SHA256_RE.test(String(provenance.source_sha256 || ""))) {
    throw new Error(`${kind} source_sha256 must be SHA-256`);
  }
  return Object.freeze({
    kind,
    machine_label: machineLabel,
    observed_at: observedAt,
    payload: Object.freeze(structuredClone(payload)),
    provenance: Object.freeze(structuredClone(provenance)),
  });
}

function validateBundle(raw) {
  const bundle = exactKeys(
    structuredClone(raw),
    BUNDLE_KEYS,
    "external acceptance evidence bundle",
  );
  if (bundle.schema !== VOID_BOOTSTRAP_EXTERNAL_EVIDENCE_VERIFIER_V1) {
    throw new Error("external acceptance evidence bundle schema mismatch");
  }
  const normalized = { schema: bundle.schema };
  for (const kind of KINDS) normalized[kind] = validateObservation(bundle[kind], kind);
  return Object.freeze(normalized);
}

function semanticMatch(receipt, bundle) {
  const firstLabel = receipt.first_node.machine_label;
  const secondLabel = receipt.second_node.machine_label;
  for (const kind of KINDS.slice(0, 5)) {
    if (bundle[kind].machine_label !== firstLabel) return false;
  }
  for (const kind of KINDS.slice(5)) {
    if (bundle[kind].machine_label !== secondLabel) return false;
  }

  const receiptObservedAt = Date.parse(receipt.observed_at);
  if (!Number.isFinite(receiptObservedAt)) return false;
  let previousObservedAt = -Infinity;
  for (const kind of KINDS) {
    const observedAt = Date.parse(bundle[kind].observed_at);
    if (
      !Number.isFinite(observedAt) ||
      observedAt < previousObservedAt ||
      observedAt > receiptObservedAt
    ) return false;
    previousObservedAt = observedAt;
  }

  if (!equalUnordered(
    bundle.first_paths_before_sync.payload.eligible_paths_before_first_sync,
    receipt.eligible_paths_before_first_sync,
  )) return false;

  const firstReady = bundle.first_ready_after_sync.payload;
  if (
    firstReady.selected_path_id !== receipt.first_node.selected_path_id ||
    firstReady.head !== receipt.first_node.head ||
    firstReady.gap !== receipt.first_node.gap ||
    firstReady.txroot_live !== receipt.first_node.txroot_live
  ) return false;

  const firstPeers = bundle.first_peers_after_sync.payload;
  if (
    firstPeers.authenticated_first_peer_id !== receipt.first_node.authenticated_first_peer_id ||
    !equalUnordered(firstPeers.learned_verified_peer_ids, receipt.first_node.learned_verified_peer_ids)
  ) return false;

  const afterRemoval = bundle.first_ready_after_removal.payload;
  if (!greenReady(afterRemoval)) return false;
  if (canonicalJson(afterRemoval.first_contact_removal) !==
      canonicalJson(receipt.first_node.first_contact_removal)) return false;
  if (!equalUnordered(
    bundle.first_peers_after_removal.payload.connected_verified_peer_ids,
    receipt.first_node.first_contact_removal.connected_verified_peer_ids,
  )) return false;

  const secondReady = bundle.second_ready.payload;
  if (!greenReady(secondReady)) return false;
  if (
    secondReady.unavailable_component_role !== receipt.second_node.unavailable_component_role ||
    secondReady.unavailable_component_class !== receipt.second_node.unavailable_component_class ||
    secondReady.unavailable_failure_domain !== receipt.second_node.unavailable_failure_domain ||
    secondReady.selected_path_id !== receipt.second_node.selected_path_id ||
    secondReady.head !== receipt.second_node.head ||
    secondReady.gap !== receipt.second_node.gap ||
    secondReady.txroot_live !== receipt.second_node.txroot_live
  ) return false;

  const secondPeers = bundle.second_peers.payload;
  if (
    secondPeers.authenticated_first_peer_id !== receipt.second_node.authenticated_first_peer_id ||
    !equalUnordered(secondPeers.learned_verified_peer_ids, receipt.second_node.learned_verified_peer_ids)
  ) return false;

  return true;
}

export function createVoidBootstrapExternalEvidenceVerifierV1({
  evidenceBundle,
  verifyCaptureProvenance,
}) {
  const bundle = validateBundle(evidenceBundle);
  if (typeof verifyCaptureProvenance !== "function") {
    throw new Error("verifyCaptureProvenance function is required");
  }

  return function verifyExternalEvidence(candidateReceipt) {
    try {
      const receipt = plainObject(candidateReceipt, "candidate acceptance receipt");
      if (receipt.evidence_mode !== "external_machine_observation") return false;
      plainObject(receipt.evidence, "candidate acceptance evidence");

      for (const [kind, evidenceKey] of Object.entries(KIND_TO_EVIDENCE_KEY)) {
        const observation = bundle[kind];
        if (receipt.evidence[evidenceKey] !== hashCanonical(observation)) return false;
        if (
          verifyCaptureProvenance(
            Object.freeze(structuredClone(observation)),
            Object.freeze(structuredClone(receipt)),
          ) !== true
        ) return false;
      }
      return semanticMatch(receipt, bundle);
    } catch {
      return false;
    }
  };
}

export function hashVoidBootstrapExternalObservationV1(observation) {
  return hashCanonical(observation);
}
