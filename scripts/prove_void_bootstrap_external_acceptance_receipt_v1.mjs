#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_V1,
  buildVoidBootstrapExternalAcceptanceReceiptV1,
  validateVoidBootstrapExternalAcceptanceReceiptV1,
} from "./lib/void_bootstrap_external_acceptance_receipt_v1.mjs";

const MARKER =
  "VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_V1_PROOF_GREEN";

const peerA = "a".repeat(32);
const peerB = "b".repeat(32);
const peerC = "c".repeat(32);
const peerD = "d".repeat(32);

function hash(label) {
  return crypto.createHash("sha256").update(label).digest("hex");
}

function baseBody() {
  return {
    schema: VOID_BOOTSTRAP_EXTERNAL_ACCEPTANCE_RECEIPT_V1,
    network: "VOID Network",
    chain_id: 2050,
    repository: {
      owner_repo: "6ZoSo9/void-node",
      commit: "1".repeat(40),
    },
    evidence_mode: "synthetic_test_fixture",
    observed_at: "2026-08-07T15:00:00.000Z",
    eligible_paths_before_first_sync: [
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
      {
        path_id: "path-c",
        record_transport: "https_record_mirror",
        record_failure_domain: "mirror-b",
        introduction_transport: "relay",
        introduction_failure_domain: "relay-a",
        target_peer_id: peerC,
        eligible: true,
      },
      {
        path_id: "path-d",
        record_transport: "tor_record_mirror",
        record_failure_domain: "mirror-tor-b",
        introduction_transport: "tor_sync_seed",
        introduction_failure_domain: "seed-tor-a",
        target_peer_id: peerD,
        eligible: true,
      },
    ],
    first_node: {
      machine_label: "external-node-a",
      outside_operator_tailnet: true,
      selected_path_id: "path-a",
      authenticated_first_peer_id: peerA,
      head: 12,
      gap: 0,
      txroot_live: 1,
      learned_verified_peer_ids: [peerB, peerC],
      first_contact_removal: {
        component_role: "introduction",
        component_class: "direct_ipv6_seed",
        failure_domain: "seed-v6-a",
        continued_connectivity: true,
        connected_verified_peer_ids: [peerB],
      },
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
    evidence: {
      first_paths_before_sync_sha256: hash("paths-before-sync"),
      first_ready_after_sync_sha256: hash("first-ready"),
      first_peers_after_sync_sha256: hash("first-peers"),
      first_ready_after_removal_sha256: hash("first-ready-after-removal"),
      first_peers_after_removal_sha256: hash("first-peers-after-removal"),
      second_ready_sha256: hash("second-ready"),
      second_peers_sha256: hash("second-peers"),
    },
  };
}

function build(mutator = null) {
  const body = baseBody();
  if (mutator) mutator(body);
  return buildVoidBootstrapExternalAcceptanceReceiptV1(body);
}

function expectReject(mutator, pattern) {
  assert.throws(
    () => build(mutator),
    pattern,
  );
}

const receipt = build();
const validated =
  validateVoidBootstrapExternalAcceptanceReceiptV1(receipt);

assert.match(receipt.receipt_id, /^voidbar1_[0-9a-f]{64}$/);
assert.equal(validated.first_node.head, 12);
assert.equal(validated.first_node.gap, 0);
assert.equal(validated.first_node.txroot_live, 1);
assert.equal(validated.second_node.head, 15);
assert.equal(validated.second_node.gap, 0);
assert.equal(validated.second_node.txroot_live, 1);

const reordered = build((body) => {
  body.eligible_paths_before_first_sync.reverse();
  body.first_node.learned_verified_peer_ids.reverse();
  body.second_node.learned_verified_peer_ids.reverse();
});
assert.equal(reordered.receipt_id, receipt.receipt_id);

expectReject(
  (body) => {
    body.first_node.head = 0;
  },
  /first node head must be a positive/,
);

expectReject(
  (body) => {
    body.first_node.gap = 1;
  },
  /first node gap must equal 0/,
);

expectReject(
  (body) => {
    body.first_node.txroot_live = 0;
  },
  /first node txroot_live must equal 1/,
);

expectReject(
  (body) => {
    body.first_node.learned_verified_peer_ids = [peerA];
  },
  /additional verified peer/,
);

expectReject(
  (body) => {
    body.first_node.first_contact_removal.continued_connectivity = false;
  },
  /retain connectivity/,
);

expectReject(
  (body) => {
    body.first_node.first_contact_removal.connected_verified_peer_ids = [peerA];
  },
  /other than the original first-contact peer/,
);

expectReject(
  (body) => {
    body.second_node.head = 0;
  },
  /second node head must be a positive/,
);

expectReject(
  (body) => {
    body.second_node.gap = 2;
  },
  /second node gap must equal 0/,
);

expectReject(
  (body) => {
    body.second_node.txroot_live = 0;
  },
  /second node txroot_live must equal 1/,
);

expectReject(
  (body) => {
    body.second_node.unavailable_component_role = "introduction";
    body.second_node.unavailable_component_class = "direct_ipv6_seed";
    body.second_node.unavailable_failure_domain = "seed-v6-a";
  },
  /must differ from first-contact removal/,
);

expectReject(
  (body) => {
    body.second_node.unavailable_component_role = "record_distribution";
    body.second_node.unavailable_component_class = "tor_record_mirror";
    body.second_node.unavailable_failure_domain = "mirror-tor-a";
    body.second_node.selected_path_id = "path-b";
  },
  /depends on the intentionally unavailable component/,
);

expectReject(
  (body) => {
    body.second_node.unavailable_component_role = "record_distribution";
    body.second_node.unavailable_component_class = "https_record_mirror";
    body.second_node.unavailable_failure_domain = "mirror-b";
    body.second_node.selected_path_id = "path-a";
    body.second_node.authenticated_first_peer_id = peerA;
  },
  /independent introduction failure domains/,
);

expectReject(
  (body) => {
    body.requirements.tailscale_required = true;
  },
  /forbidden onboarding dependency enabled: tailscale_required/,
);

expectReject(
  (body) => {
    body.requirements.manual_operator_address_copy_required = true;
  },
  /manual_operator_address_copy_required/,
);

expectReject(
  (body) => {
    body.authority.money_movement_authority = true;
  },
  /money_movement_authority must be false/,
);

expectReject(
  (body) => {
    body.eligible_paths_before_first_sync[0].eligible = false;
  },
  /must be eligible before first sync/,
);

expectReject(
  (body) => {
    body.eligible_paths_before_first_sync[1].path_id =
      body.eligible_paths_before_first_sync[0].path_id;
  },
  /duplicate path IDs/,
);

const tampered = structuredClone(receipt);
tampered.first_node.head = 13;
assert.throws(
  () => validateVoidBootstrapExternalAcceptanceReceiptV1(tampered),
  /receipt ID does not match content/,
);

console.log(MARKER);
console.log(`receipt_id=${receipt.receipt_id}`);
console.log("exact_repository_commit_required=true");
console.log("multiple_eligible_paths_before_first_sync=true");
console.log("minimum_introduction_failure_domains=2");
console.log("first_contact_authenticated=true");
console.log("first_node_nonzero_head_required=true");
console.log("first_node_gap_zero_required=true");
console.log("first_node_txroot_live_required=true");
console.log("additional_verified_peers_required=true");
console.log("first_contact_component_removal_required=true");
console.log("continued_connectivity_after_removal_required=true");
console.log("second_fresh_machine_required=true");
console.log("second_unavailable_component_must_differ=true");
console.log("second_selected_path_must_avoid_unavailable_component=true");
console.log("two_independent_introduction_failure_domains_required=true");
console.log("tailscale_required=false");
console.log("operator_contact_required=false");
console.log("manual_operator_address_copy_required=false");
console.log("commercial_cloud_provider_required=false");
console.log("dns_provider_required=false");
console.log("tunnel_provider_required=false");
console.log("certificate_authority_is_network_identity=false");
console.log("evidence_sha256_bound=true");
console.log("live_network_calls_performed=false");
console.log("external_machine_acceptance_performed=false");
console.log("issue_1005_closure_claimed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
