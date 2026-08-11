import crypto from "node:crypto";

import { canonicalJson } from "./void_bootstrap_external_acceptance_receipt_v1.mjs";

export const VOID_BOOTSTRAP_EXTERNAL_EVIDENCE_VERIFIER_V1 =
  "void_bootstrap_external_evidence_verifier_v1";

const BUNDLE_KEYS = Object.freeze([
  "schema",
  "first_paths_before_sync",
  "first_ready_after_sync",
  "first_peers_after_sync",
  "first_ready_after_removal",
  "first_peers_after_removal",
  "second_ready",
  "second_peers",
]);

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
  first_peers_after_sync: [
    "authenticated_first_peer_id",
    "learned_verified_peer_ids",
  ],
  first_ready_after_removal: [
    "head",
    "gap",
    "txroot_live",
    "first_contact_removal",
  ],
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
  second_peers: [
    "authenticated_first_peer_id",
    "learned_verified_peer_ids",
  ],
});

const SHA256_RE = /^[0-9a-f]{64}$/;
const LABEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

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

function canonicalIso(value, label) {
  const text = String(value || "");
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== text) {
    throw new Error(`${label} must be canonical ISO-8601 UTC`);
  }
  return text;
}

function label(value, what) {
  const text = String(value || "");
  if (!LABEL_RE.test(text)) throw new Error(`${what} is invalid`);
  return text;
}

function sha256Canonical(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function sortedJson(value) {
  return [...value].sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b)));
}

function equalUnordered(a, b) {
  return canonicalJson(sortedJson(a)) === canonicalJson(sortedJson(b));
}

function validateObservation(raw, expectedKind) {
  const observation = exactKeys(
    structuredClone(raw),
    OBSERVATION_KEYS,
    `${expectedKind} observation`,
  );
  if (observation.kind !== expectedKind) {
    throw new Error(`${expectedKind} observation kind mismatch`);
  }
  const machineLabel = label(
    observation.machine_label,
    `${expectedKind} machine label`,
  );
  const observedAt = canonicalIso(
    observation.observed_at,
    `${expectedKind} observed_at`,
  );
  const payload = exactKeys(
    observation.payload,
    PAYLOAD_KEYS[expectedKind],
    `${expectedKind} payload`,
  );
  const provenance = exactKeys(
    observation.provenance,
    PROVENANCE_KEYS,
    `${expectedKind} provenance`,
  );
  label(provenance.collector_id, `${expectedKind} collector_id`);
  label(provenance.capture_id, `${expectedKind} capture_id`);
  if (provenance.source_kind !== "external_machine_capture_v1") {
    throw new Error(`${expectedKind} source_kind is invalid`);
  }
  if (!SHA256_RE.test(String(provenance.source_sha256 || ""))) {
    throw new Error(`${expectedKind} source_sha256 must be SHA-256`);
  }
  return Object.freeze({
    kind: expectedKind,
    machine_label: machineLabel,
    observed_at: observedAt,
    payload: Object.freeze(structuredClone(payload)),
    provenance: Object.freeze(structuredClone(provenance)),
  });
}

function sameRemoval(receiptRemoval, observationRemoval) {
  return canonicalJson(receiptRemoval) === canonicalJson(observationRemoval);
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
  for (const kind of Object.keys(KIND_TO_EVIDENCE_KEY)) {
    normalized[kind] = validateObservation(bundle[kind], kind);
  }
  return Object.freeze(normalized);
}

function semanticMatch(receipt, bundle) {
  const firstLabel = receipt.first_node.machine_label;
  const secondLabel = receipt.second_node.machine_label;

  for (const kind of [
    "first_paths_before_sync",
    "first_ready_after_sync",
    "first_peers_after_sync",
    "first_ready_after_removal",
    "first_peers_after_removal",
  ]) {
    if (bundle[kind].machine_label !== firstLabel) return false;
  }
  for (const kind of ["second_ready", "second_peers"]) {
    if (bundle[kind].machine_label !== secondLabel) return false;
  }

  const receiptObservedAt = Date.parse(receipt.observed_at);
  for (const kind of Object.keys(KIND_TO_EVIDENCE_KEY)) {
    if (Date.parse(bundle[kind].observed_at) > receiptObservedAt) return false;
  }

  if (
    !equalUnordered(
      bundle.first_paths_before_sync.payload.eligible_paths_before_first_sync,
      receipt.eligible_paths_before_first_sync,
    )
  ) return false;

  const firstReady = bundle.first_ready_after_sync.payload;
  if (
    firstReady.selected_path_id !== receipt.first_node.selected_path_id ||
    firstReady.head !== receipt.first_node.head ||
    firstReady.gap !== receipt.first_node.gap ||
    firstReady.txroot_live !== receipt.first_node.txroot_live
  ) return false;

  const firstPeers = bundle.first_peers_after_sync.payload;
  if (
    firstPeers.authenticated_first_peer_id !==
      receipt.first_node.authenticated_first_peer_id ||
    !equalUnordered(
      firstPeers.learned_verified_peer_ids,
      receipt.first_node.learned_verified_peer_ids,
    )
  ) return false;

  const firstReadyAfterRemoval = bundle.first_ready_after_removal.payload;
  if (
    firstReadyAfterRemoval.head !== receipt.first_node.head ||
    firstReadyAfterRemoval.gap !== receipt.first_node.gap ||
    firstReadyAfterRemoval.txroot_live !== receipt.first_node.txroot_live ||
    !sameRemoval(
      receipt.first_node.first_contact_removal,
      firstReadyAfterRemoval.first_contact_removal,
    )
  ) return false;

  if (
    !equalUnordered(
      bundle.first_peers_after_removal.payload.connected_verified_peer_ids,
      receipt.first_node.first_contact_removal.connected_verified_peer_ids,
    )
  ) return false;

  const secondReady = bundle.second_ready.payload;
  if (
    secondReady.unavailable_component_role !==
      receipt.second_node.unavailable_component_role ||
    secondReady.unavailable_component_class !==
      receipt.second_node.unavailable_component_class ||
    secondReady.unavailable_failure_domain !==
      receipt.second_node.unavailable_failure_domain ||
    secondReady.selected_path_id !== receipt.second_node.selected_path_id ||
    secondReady.head !== receipt.second_node.head ||
    secondReady.gap !== receipt.second_node.gap ||
    secondReady.txroot_live !== receipt.second_node.txroot_live
  ) return false;

  const secondPeers = bundle.second_peers.payload;
  if (
    secondPeers.authenticated_first_peer_id !==
      receipt.second_node.authenticated_first_peer_id ||
    !equalUnordered(
      secondPeers.learned_verified_peer_ids,
      receipt.second_node.learned_verified_peer_ids,
    )
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
      if (!plainObject(receipt.evidence, "candidate acceptance evidence")) return false;

      for (const [kind, evidenceKey] of Object.entries(KIND_TO_EVIDENCE_KEY)) {
        const observation = bundle[kind];
        const expectedHash = sha256Canonical(observation);
        if (receipt.evidence[evidenceKey] !== expectedHash) return false;
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
  return sha256Canonical(observation);
}
