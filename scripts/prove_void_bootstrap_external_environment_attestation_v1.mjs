#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  VOID_BOOTSTRAP_EXTERNAL_ENVIRONMENT_ATTESTATION_V1,
  buildVoidBootstrapExternalEnvironmentAttestationV1,
  validateVoidBootstrapExternalEnvironmentAttestationV1,
} from "./lib/void_bootstrap_external_environment_attestation_v1.mjs";

const MARKER =
  "VOID_BOOTSTRAP_EXTERNAL_ENVIRONMENT_ATTESTATION_V1_PROOF_GREEN";

function sha(label) {
  return crypto.createHash("sha256").update(label).digest("hex");
}

function fixture() {
  return {
    schema: VOID_BOOTSTRAP_EXTERNAL_ENVIRONMENT_ATTESTATION_V1,
    network: "VOID Network",
    chain_id: 2050,
    repository: {
      owner_repo: "6ZoSo9/void-node",
      commit: "1".repeat(40),
    },
    evidence_mode: "synthetic_test_fixture",
    observed_at: "2026-08-07T18:00:00.000Z",
    machine: {
      machine_label: "external-linux-a",
      os_family: "linux",
      fresh_checkout: true,
      outside_operator_tailnet: true,
      operator_managed_machine: false,
    },
    launcher: {
      executable: "./run-void-node.sh",
      arguments: [],
      manual_bootstrap_addresses_supplied: false,
      private_address_supplied: false,
      tailscale_address_supplied: false,
      ssh_tunnel_supplied: false,
      manual_environment_edit_required: false,
    },
    dependencies: {
      tailscale_required: false,
      tailscale_path_used: false,
      vpn_required: false,
      ssh_required: false,
      router_configuration_required: false,
      port_forward_required: false,
      operator_contact_required: false,
      commercial_cloud_provider_required: false,
      dns_provider_required: false,
      tunnel_provider_required: false,
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
      repository_state_sha256: sha("repo-state"),
      launcher_invocation_sha256: sha("launcher"),
      sanitized_network_posture_sha256: sha("network-posture"),
      sanitized_environment_scan_sha256: sha("environment-scan"),
    },
  };
}

function reject(mutator, pattern) {
  const body = fixture();
  mutator(body);
  assert.throws(
    () => buildVoidBootstrapExternalEnvironmentAttestationV1(body),
    pattern,
  );
}

const attestation =
  buildVoidBootstrapExternalEnvironmentAttestationV1(fixture());
validateVoidBootstrapExternalEnvironmentAttestationV1(attestation);

assert.match(attestation.attestation_id, /^voidbea1_[0-9a-f]{64}$/);

reject(
  (body) => {
    body.machine.outside_operator_tailnet = false;
  },
  /outside operator Tailnet/,
);

reject(
  (body) => {
    body.machine.operator_managed_machine = true;
  },
  /must not be an operator-managed machine/,
);

reject(
  (body) => {
    body.machine.fresh_checkout = false;
  },
  /fresh checkout/,
);

reject(
  (body) => {
    body.launcher.executable = "./custom-launcher.sh";
  },
  /must be .\/run-void-node\.sh/,
);

reject(
  (body) => {
    body.launcher.arguments = ["--bootstrap", "example"];
  },
  /no positional arguments/,
);

reject(
  (body) => {
    body.launcher.manual_bootstrap_addresses_supplied = true;
  },
  /manual_bootstrap_addresses_supplied must be false/,
);

reject(
  (body) => {
    body.launcher.private_address_supplied = true;
  },
  /private_address_supplied must be false/,
);

reject(
  (body) => {
    body.launcher.tailscale_address_supplied = true;
  },
  /tailscale_address_supplied must be false/,
);

reject(
  (body) => {
    body.launcher.ssh_tunnel_supplied = true;
  },
  /ssh_tunnel_supplied must be false/,
);

reject(
  (body) => {
    body.dependencies.tailscale_required = true;
  },
  /tailscale_required must be false/,
);

reject(
  (body) => {
    body.dependencies.tailscale_path_used = true;
  },
  /tailscale_path_used must be false/,
);

reject(
  (body) => {
    body.dependencies.router_configuration_required = true;
  },
  /router_configuration_required must be false/,
);

reject(
  (body) => {
    body.dependencies.operator_contact_required = true;
  },
  /operator_contact_required must be false/,
);

reject(
  (body) => {
    body.authority.signer_authority = true;
  },
  /signer_authority must be false/,
);

reject(
  (body) => {
    body.authority.money_movement_authority = true;
  },
  /money_movement_authority must be false/,
);

reject(
  (body) => {
    body.evidence.sanitized_network_posture_sha256 = "bad";
  },
  /must be SHA-256/,
);

const tamperedId = structuredClone(attestation);
tamperedId.machine.machine_label = "external-linux-b";
assert.throws(
  () => validateVoidBootstrapExternalEnvironmentAttestationV1(tamperedId),
  /ID does not match content/,
);

console.log(MARKER);
console.log(`attestation_id=${attestation.attestation_id}`);
console.log("exact_repository_commit_required=true");
console.log("linux_fresh_checkout_required=true");
console.log("outside_operator_tailnet_required=true");
console.log("operator_managed_machine_allowed=false");
console.log("exact_default_launcher_required=true");
console.log("launcher_positional_arguments_allowed=false");
console.log("manual_bootstrap_addresses_allowed=false");
console.log("private_address_input_allowed=false");
console.log("tailscale_address_input_allowed=false");
console.log("ssh_tunnel_input_allowed=false");
console.log("manual_environment_edit_required=false");
console.log("tailscale_required=false");
console.log("tailscale_path_used=false");
console.log("vpn_required=false");
console.log("ssh_required=false");
console.log("router_configuration_required=false");
console.log("port_forward_required=false");
console.log("operator_contact_required=false");
console.log("commercial_cloud_provider_required=false");
console.log("dns_provider_required=false");
console.log("tunnel_provider_required=false");
console.log("sanitized_evidence_sha256_bound=true");
console.log("raw_network_addresses_stored=false");
console.log("credentials_stored=false");
console.log("external_machine_acceptance_performed=false");
console.log("live_network_calls_performed=false");
console.log("issue_1005_closure_claimed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
