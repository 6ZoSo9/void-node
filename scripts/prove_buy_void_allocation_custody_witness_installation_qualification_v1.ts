#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_ACCOUNT_SHELL_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_AUTHORITY_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
  buildBuyVoidAllocationCustodyWitnessInstallationExpectationV1,
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1,
} from "../src/economic/buy_void_allocation_custody_witness_installation_qualification_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
} from "../src/economic/buy_void_allocation_custody_witness_transport_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const sha256Id = (value: string): string =>
  "sha256:" +
  crypto.createHash("sha256").update(value, "utf8").digest("hex");

const policy = Object.freeze({
  transport: "ssh",
  remote_host: "nimo-witness.internal",
  remote_port: 22,
  remote_user: "voidwitness",
  host_key_algorithm: "ssh-ed25519",
  host_key_sha256: sha("a"),
  known_hosts_sha256: sha("b"),
  client_key_algorithm: "ssh-ed25519",
  client_public_key_sha256: sha("c"),
  endpoint_marker:
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  batch_mode: true,
  strict_host_key_checking: true,
  identities_only: true,
  request_tty: false,
  clear_all_forwardings: true,
  permit_local_command: false,
  remote_forced_command_only: true,
  remote_shell_allowed: false,
  caller_selected_remote_command: false,
  caller_selected_remote_path: false,
  connect_timeout_ms: 8_000,
  operation_timeout_ms: 30_000,
  max_request_bytes: 256 * 1024,
  max_response_bytes: 24 * 1024 * 1024,
});

const expectation =
  buildBuyVoidAllocationCustodyWitnessInstallationExpectationV1(
    policy,
  );
assert.equal(expectation.ok, true);
if (!expectation.ok) throw new Error(expectation.reason);

const publicKeyBase64 =
  Buffer.from("reviewed-witness-key", "utf8").toString("base64");
const authorizedLine =
  'restrict,command="' +
  expectation.forced_command +
  '" ssh-ed25519 ' +
  publicKeyBase64 +
  " void-allocation-witness-v1";

const evidence = () => ({
  observed_at_ms: 1_800_000_000_000,
  transport_policy: policy,
  policy_sha256: expectation.policy_sha256,
  transport_source_git_blob_sha1:
    "6d697468e29fb55d6892ab1269401be485ebeba8",
  transport_source_sha256:
    "d7ef969c408d5bd2217374020cd97a773e27c8b603245837a6a29d6f0b7abca1",
  handler_source_git_blob_sha1:
    "e19fa1094981b10cea6052ac86281fd6e760b800",
  handler_source_sha256:
    "8b0f2fc8b3e93ad728f9022459a3f0b3cbe6633d07dd38d2fdb3d9744d8423ba",
  config_sha256: expectation.config_sha256,
  account: {
    name: "voidwitness",
    uid: 991,
    gid: 991,
    shell:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_ACCOUNT_SHELL_V1,
    dedicated: true,
  },
  deployed_handler: {
    path:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1,
    git_blob_sha1:
      "e19fa1094981b10cea6052ac86281fd6e760b800",
    sha256:
      "8b0f2fc8b3e93ad728f9022459a3f0b3cbe6633d07dd38d2fdb3d9744d8423ba",
    uid: 0,
    gid: 0,
    mode: "0755",
    nlink: 1,
    symlink: false,
    ancestor_chain_root_owned_nonwritable: true,
  },
  config_file: {
    path:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1,
    sha256: expectation.config_sha256,
    uid: 991,
    gid: 991,
    mode: "0600",
    nlink: 1,
    symlink: false,
    ancestor_chain_root_owned_nonwritable: true,
  },
  node_binary: {
    path: "/usr/bin/node",
    sha256: "d".repeat(64),
    uid: 0,
    gid: 0,
    mode: "0755",
    nlink: 1,
    symlink: false,
    ancestor_chain_root_owned_nonwritable: true,
  },
  shell_binary: {
    path:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_ACCOUNT_SHELL_V1,
    sha256: "e".repeat(64),
    uid: 0,
    gid: 0,
    mode: "0755",
    nlink: 1,
    symlink: false,
    ancestor_chain_root_owned_nonwritable: true,
  },
  authorized_key: {
    line: authorizedLine,
    line_sha256: sha256Id(authorizedLine),
    forced_command: expectation.forced_command,
    restrict: true,
    environment_option_present: false,
    key_algorithm: "ssh-ed25519",
    client_public_key_sha256: policy.client_public_key_sha256,
  },
  sshd: {
    permit_user_environment: false,
    permit_user_rc: false,
    accept_env: [],
    allow_agent_forwarding: false,
    allow_tcp_forwarding: false,
    x11_forwarding: false,
    permit_tunnel: false,
    gateway_ports: false,
    permit_tty: false,
  },
  effective_preexec_environment: [
    "LANG=C",
    "LC_ALL=C",
    "PATH=/usr/bin:/bin",
    "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1",
  ],
  dangerous_environment_absent: true,
  user_rc_executed: false,
  shell_startup_executed: false,
  caller_selected_command_executed: false,
  caller_selected_path_used: false,
  live_probe_performed: false,
  host_key_algorithm: policy.host_key_algorithm,
  host_key_sha256: policy.host_key_sha256,
  known_hosts_sha256: policy.known_hosts_sha256,
});

const nowMs = 1_800_000_000_100;
const baseline =
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1({
    evidence: evidence(),
    now_ms: nowMs,
  });
assert.equal(baseline.ok, true);
if (!baseline.ok) throw new Error(baseline.reason);
assert.equal(
  baseline.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
);
assert.equal(
  baseline.status,
  "installation_evidence_qualified_not_live",
);
assert.match(
  baseline.qualification_id,
  /^voidwinstall1_[0-9a-f]{64}$/u,
);
assert.equal(
  baseline.attestation.handler_path,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1,
);
assert.equal(
  baseline.attestation.config_path,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1,
);
assert.equal(
  baseline.attestation.config_sha256,
  expectation.config_sha256,
);
assert.equal(baseline.live_evidence_origin_proven, false);
assert.equal(baseline.live_nimo_installed, false);
assert.equal(baseline.external_transport_authenticated, false);
assert.equal(baseline.external_witness_storage_proven, false);
assert.equal(baseline.runtime_integration, false);
assert.equal(baseline.production_gate_ready, false);
assert.equal(baseline.funds_movement, false);

assert.equal(
  expectation.config.authority_root,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_AUTHORITY_ROOT_V1,
);
assert.equal(
  expectation.forced_command,
  "/usr/bin/env -i " +
    "PATH=/usr/bin:/bin LANG=C LC_ALL=C " +
    "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 " +
    "/usr/bin/node " +
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1 +
    " --config=" +
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1,
);
assert.equal(
  expectation.forced_command.includes("NODE_OPTIONS"),
  false,
);
assert.equal(
  expectation.forced_command.includes("LD_PRELOAD"),
  false,
);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_contract",
    "pure_evidence_classifier",
    "exact_transport_policy_binding",
    "exact_reviewed_handler_identity_required",
    "exact_forced_command_required",
    "sanitized_preexec_environment_required",
    "dedicated_account_required",
    "restricted_authorized_key_required",
    "strict_sshd_environment_required",
    "pinned_host_and_client_key_binding_required",
    "protected_config_binding_required",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

function cloneEvidence(): any {
  return JSON.parse(JSON.stringify(evidence()));
}

function expectHeld(
  mutate: (candidate: any) => void,
  reason: string,
): void {
  const candidate = cloneEvidence();
  mutate(candidate);
  const decision =
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1({
      evidence: candidate,
      now_ms: nowMs,
    });
  assert.equal(decision.ok, false, reason);
  if (decision.ok) {
    throw new Error("expected installation HOLD: " + reason);
  }
  assert.equal(decision.reason, reason);
}

expectHeld(
  (x) => {
    x.handler_source_git_blob_sha1 = "0".repeat(40);
  },
  "witness_installation_source_policy_binding_invalid",
);
expectHeld(
  (x) => {
    x.deployed_handler.sha256 = "0".repeat(64);
  },
  "witness_installation_handler_file_invalid",
);
expectHeld(
  (x) => {
    x.deployed_handler.path = "/tmp/handler.mjs";
  },
  "witness_installation_handler_file_invalid",
);
expectHeld(
  (x) => {
    x.deployed_handler.symlink = true;
  },
  "witness_installation_handler_file_invalid",
);
expectHeld(
  (x) => {
    x.config_file.sha256 = sha("9");
  },
  "witness_installation_config_file_invalid",
);
expectHeld(
  (x) => {
    x.config_file.mode = "0644";
  },
  "witness_installation_config_file_invalid",
);
expectHeld(
  (x) => {
    x.account.shell = "/bin/bash";
  },
  "witness_installation_account_invalid",
);
expectHeld(
  (x) => {
    x.account.name = "operator";
  },
  "witness_installation_account_invalid",
);
expectHeld(
  (x) => {
    x.node_binary.path = "node";
  },
  "witness_installation_node_binary_invalid",
);
expectHeld(
  (x) => {
    x.shell_binary.path = "/bin/sh";
  },
  "witness_installation_shell_binary_invalid",
);
expectHeld(
  (x) => {
    x.shell_binary.symlink = true;
  },
  "witness_installation_shell_binary_invalid",
);
expectHeld(
  (x) => {
    x.authorized_key.forced_command += " --evil";
  },
  "witness_installation_authorized_key_invalid",
);
expectHeld(
  (x) => {
    x.authorized_key.restrict = false;
  },
  "witness_installation_authorized_key_invalid",
);
expectHeld(
  (x) => {
    x.authorized_key.environment_option_present = true;
  },
  "witness_installation_authorized_key_invalid",
);
expectHeld(
  (x) => {
    x.authorized_key.line =
      'environment="NODE_OPTIONS=--require=/tmp/pwn",'+
      x.authorized_key.line;
    x.authorized_key.line_sha256 =
      sha256Id(x.authorized_key.line);
  },
  "witness_installation_authorized_key_invalid",
);
expectHeld(
  (x) => {
    x.sshd.accept_env = ["NODE_OPTIONS"];
  },
  "witness_installation_sshd_invalid",
);
expectHeld(
  (x) => {
    x.sshd.permit_user_environment = true;
  },
  "witness_installation_sshd_invalid",
);
expectHeld(
  (x) => {
    x.sshd.permit_user_rc = true;
  },
  "witness_installation_sshd_invalid",
);
expectHeld(
  (x) => {
    x.sshd.allow_tcp_forwarding = true;
  },
  "witness_installation_sshd_invalid",
);
expectHeld(
  (x) => {
    x.sshd.permit_tty = true;
  },
  "witness_installation_sshd_invalid",
);
expectHeld(
  (x) => {
    x.effective_preexec_environment = [
      ...x.effective_preexec_environment,
      "NODE_OPTIONS=--require=/tmp/pwn",
    ];
  },
  "witness_installation_preexec_environment_invalid",
);
expectHeld(
  (x) => {
    x.dangerous_environment_absent = false;
  },
  "witness_installation_execution_boundary_invalid",
);
expectHeld(
  (x) => {
    x.user_rc_executed = true;
  },
  "witness_installation_execution_boundary_invalid",
);
expectHeld(
  (x) => {
    x.shell_startup_executed = true;
  },
  "witness_installation_execution_boundary_invalid",
);
expectHeld(
  (x) => {
    x.caller_selected_command_executed = true;
  },
  "witness_installation_execution_boundary_invalid",
);
expectHeld(
  (x) => {
    x.caller_selected_path_used = true;
  },
  "witness_installation_execution_boundary_invalid",
);
expectHeld(
  (x) => {
    x.live_probe_performed = true;
  },
  "witness_installation_execution_boundary_invalid",
);
expectHeld(
  (x) => {
    x.host_key_sha256 = sha("9");
  },
  "witness_installation_source_policy_binding_invalid",
);
expectHeld(
  (x) => {
    x.known_hosts_sha256 = sha("9");
  },
  "witness_installation_source_policy_binding_invalid",
);
expectHeld(
  (x) => {
    x.policy_sha256 = sha("9");
  },
  "witness_installation_source_policy_binding_invalid",
);
expectHeld(
  (x) => {
    x.observed_at_ms = nowMs - 15 * 60 * 1000 - 1;
  },
  "witness_installation_evidence_stale",
);

const source = fs.readFileSync(
  "src/economic/buy_void_allocation_custody_witness_installation_qualification_v1.ts",
  "utf8",
);
assert.doesNotMatch(source, /node:fs/u);
assert.doesNotMatch(source, /node:child_process/u);
assert.doesNotMatch(source, /spawnSync|execFile|ssh\s/u);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1_GREEN",
);
console.log("exact_transport_policy_binding=true");
console.log("exact_reviewed_handler_identity_required=true");
console.log("protected_config_binding_required=true");
console.log("sanitized_preexec_environment_required=true");
console.log("restricted_authorized_key_required=true");
console.log("strict_sshd_environment_required=true");
console.log("dangerous_preexec_environment_rejected=true");
console.log("caller_selected_command_or_path_rejected=true");
console.log("live_evidence_origin_proven=false");
console.log("live_nimo_installed=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
