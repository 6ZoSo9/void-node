#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  buildVoidBootstrapExternalAcceptanceReceiptV1,
  validateVoidBootstrapExternalAcceptanceReceiptV1,
} from "./lib/void_bootstrap_external_acceptance_receipt_v1.mjs";
import {
  VOID_BOOTSTRAP_EXTERNAL_EVIDENCE_VERIFIER_V1,
  createVoidBootstrapExternalEvidenceVerifierV1,
  hashVoidBootstrapExternalObservationV1,
} from "./lib/void_bootstrap_external_evidence_verifier_v1.mjs";

const MARKER = "VOID_BOOTSTRAP_EXTERNAL_EVIDENCE_VERIFIER_V1_PROOF_GREEN";
const peerA = "a".repeat(32);
const peerB = "b".repeat(32);
const peerC = "c".repeat(32);

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function provenance(machine, capture) {
  return {
    collector_id: `reviewed-collector-${machine}`,
    capture_id: capture,
    source_kind: "external_machine_capture_v1",
    source_sha256: hash(`${machine}:${capture}:raw-source`),
  };
}

function observation(kind, machine, observedAt, payload, capture) {
  return {
    kind,
    machine_label: machine,
    observed_at: observedAt,
    payload,
    provenance: provenance(machine, capture),
  };
}

function fixture() {
  const paths = [
    {
      path_id: "path-a",
      record_transport: "https_record_mirror",
      record_failure_domain: "mirror-a",
      introduction_transport: "direct_ipv6_seed",
      introduction_failure_domain: "seed-v6-a",
      target_peer_id: peerA,
      eligible: true,
    },
    {
      path_id: "path-b",
      record_transport: "tor_record_mirror",
      record_failure_domain: "mirror-tor-a",
      introduction_transport: "direct_ipv4_seed",
      introduction_failure_domain: "seed-v4-a",
      target_peer_id: peerB,
      eligible: true,
    },
  ];

  const removal = {
    component_role: "introduction",
    component_class: "direct_ipv6_seed",
    failure_domain: "seed-v6-a",
    continued_connectivity: true,
    connected_verified_peer_ids: [peerB],
  };

  const bundle = {
    schema: VOID_BOOTSTRAP_EXTERNAL_EVIDENCE_VERIFIER_V1,
    first_paths_before_sync: observation(
      "first_paths_before_sync",
      "external-node-a",
      "2026-08-11T14:00:00.000Z",
      { eligible_paths_before_first_sync: paths },
      "first-paths",
    ),
    first_ready_after_sync: observation(
      "first_ready_after_sync",
      "external-node-a",
      "2026-08-11T14:01:00.000Z",
      { selected_path_id: "path-a", head: 12, gap: 0, txroot_live: 1 },
      "first-ready",
    ),
    first_peers_after_sync: observation(
      "first_peers_after_sync",
      "external-node-a",
      "2026-08-11T14:01:01.000Z",
      {
        authenticated_first_peer_id: peerA,
        learned_verified_peer_ids: [peerB, peerC],
      },
      "first-peers",
    ),
    first_ready_after_removal: observation(
      "first_ready_after_removal",
      "external-node-a",
      "2026-08-11T14:02:00.000Z",
      { head: 13, gap: 0, txroot_live: 1, first_contact_removal: removal },
      "first-ready-after-removal",
    ),
    first_peers_after_removal: observation(
      "first_peers_after_removal",
      "external-node-a",
      "2026-08-11T14:02:01.000Z",
      { connected_verified_peer_ids: [peerB] },
      "first-peers-after-removal",
    ),
    second_ready: observation(
      "second_ready",
      "external-node-b",
      "2026-08-11T14:03:00.000Z",
      {
        unavailable_component_role: "record_distribution",
        unavailable_component_class: "https_record_mirror",
        unavailable_failure_domain: "mirror-a",
        selected_path_id: "path-b",
        head: 15,
        gap: 0,
        txroot_live: 1,
      },
      "second-ready",
    ),
    second_peers: observation(
      "second_peers",
      "external-node-b",
      "2026-08-11T14:03:01.000Z",
      {
        authenticated_first_peer_id: peerB,
        learned_verified_peer_ids: [peerA, peerC],
      },
      "second-peers",
    ),
  };

  const evidence = {
    first_paths_before_sync_sha256:
      hashVoidBootstrapExternalObservationV1(bundle.first_paths_before_sync),
    first_ready_after_sync_sha256:
      hashVoidBootstrapExternalObservationV1(bundle.first_ready_after_sync),
    first_peers_after_sync_sha256:
      hashVoidBootstrapExternalObservationV1(bundle.first_peers_after_sync),
    first_ready_after_removal_sha256:
      hashVoidBootstrapExternalObservationV1(bundle.first_ready_after_removal),
    first_peers_after_removal_sha256:
      hashVoidBootstrapExternalObservationV1(bundle.first_peers_after_removal),
    second_ready_sha256:
      hashVoidBootstrapExternalObservationV1(bundle.second_ready),
    second_peers_sha256:
      hashVoidBootstrapExternalObservationV1(bundle.second_peers),
  };

  const body = {
    schema: "void_bootstrap_external_acceptance_receipt_v1",
    network: "VOID Network",
    chain_id: 2050,
    repository: {
      owner_repo: "6ZoSo9/void-node",
      commit: "1".repeat(40),
    },
    evidence_mode: "external_machine_observation",
    observed_at: "2026-08-11T14:04:00.000Z",
    eligible_paths_before_first_sync: paths,
    first_node: {
      machine_label: "external-node-a",
      outside_operator_tailnet: true,
      selected_path_id: "path-a",
      authenticated_first_peer_id: peerA,
      head: 12,
      gap: 0,
      txroot_live: 1,
      learned_verified_peer_ids: [peerB, peerC],
      first_contact_removal: removal,
    },
    second_node: {
      machine_label: "external-node-b",
      outside_operator_tailnet: true,
      unavailable_component_role: "record_distribution",
      unavailable_component_class: "https_record_mirror",
      unavailable_failure_domain: "mirror-a",
      selected_path_id: "path-b",
      authenticated_first_peer_id: peerB,
      head: 15,
      gap: 0,
      txroot_live: 1,
      learned_verified_peer_ids: [peerA, peerC],
    },
    requirements: {
      tailscale_required: false,
      private_tailnet_dependency: false,
      manual_operator_address_copy_required: false,
      operator_contact_required: false,
      commercial_cloud_provider_required: false,
      dns_provider_required: false,
      tunnel_provider_required: false,
      certificate_authority_is_network_identity: false,
    },
    authority: {
      private_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
    evidence,
  };

  return { bundle, body };
}

function reviewedProvenance(observation) {
  return (
    observation.provenance.source_kind === "external_machine_capture_v1" &&
    observation.provenance.collector_id.startsWith("reviewed-collector-") &&
    /^[0-9a-f]{64}$/.test(observation.provenance.source_sha256)
  );
}

const { bundle, body } = fixture();
const verifyExternalEvidence = createVoidBootstrapExternalEvidenceVerifierV1({
  evidenceBundle: bundle,
  verifyCaptureProvenance: reviewedProvenance,
});

const receipt = buildVoidBootstrapExternalAcceptanceReceiptV1(body, {
  verifyExternalEvidence,
});
assert.equal(
  validateVoidBootstrapExternalAcceptanceReceiptV1(receipt, {
    verifyExternalEvidence,
  }).receipt_id,
  receipt.receipt_id,
);

assert.throws(
  () => createVoidBootstrapExternalEvidenceVerifierV1({ evidenceBundle: bundle }),
  /verifyCaptureProvenance function is required/,
);

const rejectingVerifier = createVoidBootstrapExternalEvidenceVerifierV1({
  evidenceBundle: bundle,
  verifyCaptureProvenance() {
    return false;
  },
});
assert.equal(rejectingVerifier(receipt), false);

const duplicateCaptureIdentityBundle = structuredClone(bundle);
duplicateCaptureIdentityBundle.second_peers.provenance.collector_id =
  duplicateCaptureIdentityBundle.second_ready.provenance.collector_id;
duplicateCaptureIdentityBundle.second_peers.provenance.capture_id =
  duplicateCaptureIdentityBundle.second_ready.provenance.capture_id;
assert.throws(
  () => createVoidBootstrapExternalEvidenceVerifierV1({
    evidenceBundle: duplicateCaptureIdentityBundle,
    verifyCaptureProvenance: reviewedProvenance,
  }),
  /capture identity must be unique/,
);

const nonStringCaptureIdentityBundle = structuredClone(bundle);
nonStringCaptureIdentityBundle.second_peers.provenance.collector_id = 7;
assert.throws(
  () => createVoidBootstrapExternalEvidenceVerifierV1({
    evidenceBundle: nonStringCaptureIdentityBundle,
    verifyCaptureProvenance() {
      return true;
    },
  }),
  /collector_id is invalid/,
);

const duplicateSourceCaptureBundle = structuredClone(bundle);
duplicateSourceCaptureBundle.second_peers.provenance.source_sha256 =
  duplicateSourceCaptureBundle.second_ready.provenance.source_sha256;
assert.throws(
  () => createVoidBootstrapExternalEvidenceVerifierV1({
    evidenceBundle: duplicateSourceCaptureBundle,
    verifyCaptureProvenance: reviewedProvenance,
  }),
  /source capture SHA-256 must be unique/,
);

const nonStringSourceCaptureBundle = structuredClone(bundle);
nonStringSourceCaptureBundle.second_peers.provenance.source_sha256 = [
  "f".repeat(64),
];
assert.throws(
  () => createVoidBootstrapExternalEvidenceVerifierV1({
    evidenceBundle: nonStringSourceCaptureBundle,
    verifyCaptureProvenance: reviewedProvenance,
  }),
  /source_sha256 must be a SHA-256 string/,
);

const tamperedBundle = structuredClone(bundle);
tamperedBundle.first_ready_after_sync.payload.head = 99;
const tamperedVerifier = createVoidBootstrapExternalEvidenceVerifierV1({
  evidenceBundle: tamperedBundle,
  verifyCaptureProvenance: reviewedProvenance,
});
assert.equal(tamperedVerifier(receipt), false);

const provenanceTamperedBundle = structuredClone(bundle);
provenanceTamperedBundle.second_peers.provenance.source_sha256 = "f".repeat(64);
const provenanceTamperedVerifier = createVoidBootstrapExternalEvidenceVerifierV1({
  evidenceBundle: provenanceTamperedBundle,
  verifyCaptureProvenance: reviewedProvenance,
});
assert.equal(provenanceTamperedVerifier(receipt), false);

const futureBundle = structuredClone(bundle);
futureBundle.second_peers.observed_at = "2026-08-11T14:05:00.000Z";
const futureVerifier = createVoidBootstrapExternalEvidenceVerifierV1({
  evidenceBundle: futureBundle,
  verifyCaptureProvenance: reviewedProvenance,
});
assert.equal(futureVerifier(receipt), false);

const outOfOrderBundle = structuredClone(bundle);
outOfOrderBundle.first_ready_after_removal.observed_at = "2026-08-11T14:00:30.000Z";
const outOfOrderBody = structuredClone(body);
outOfOrderBody.evidence.first_ready_after_removal_sha256 =
  hashVoidBootstrapExternalObservationV1(outOfOrderBundle.first_ready_after_removal);
const outOfOrderVerifier = createVoidBootstrapExternalEvidenceVerifierV1({
  evidenceBundle: outOfOrderBundle,
  verifyCaptureProvenance: reviewedProvenance,
});
assert.throws(() => buildVoidBootstrapExternalAcceptanceReceiptV1(outOfOrderBody, {
  verifyExternalEvidence: outOfOrderVerifier,
}));

console.log(MARKER);
console.log("seven_observation_hashes_exactly_bound=true");
console.log("receipt_semantics_reproduced_from_observations=true");
console.log("capture_provenance_verifier_required=true");
console.log("capture_provenance_self_assertion_accepted=false");
console.log("duplicate_capture_identity_accepted=false");
console.log("non_string_capture_identity_accepted=false");
console.log("duplicate_source_capture_sha256_accepted=false");
console.log("non_string_source_capture_sha256_accepted=false");
console.log("observation_hash_tamper_accepted=false");
console.log("observation_semantic_tamper_accepted=false");
console.log("future_observation_accepted=false");
console.log("out_of_order_observation_accepted=false");
console.log("network_collection_performed=false");
console.log("external_machine_provenance_claimed_by_source=false");
console.log("issue_1005_closure_claimed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
