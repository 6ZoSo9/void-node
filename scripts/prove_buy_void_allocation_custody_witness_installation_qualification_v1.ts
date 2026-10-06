#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1,
} from "../src/economic/buy_void_allocation_custody_witness_installation_qualification_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const transportPolicy = {
  transport: "ssh",
  remote_host: "nimo.void.internal",
  remote_port: 22,
  remote_user: "voidwitness",
  host_key_algorithm: "ssh-ed25519",
  host_key_sha256: sha("1"),
  known_hosts_sha256: sha("2"),
  client_key_algorithm: "ssh-ed25519",
  client_public_key_sha256: sha("3"),
  endpoint_marker: "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V1",
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
} as const;

const dangerousEnvironment = [
  "BASH_ENV",
  "ENV",
  "GCONV_PATH",
  "LD_AUDIT",
  "LD_LIBRARY_PATH",
  "LD_PRELOAD",
  "NODE_OPTIONS",
  "NODE_PATH",
  "OPENSSL_CONF",
] as const;

const baseline = {
  schema:
    "void_buy_void_allocation_custody_witness_installation_qualification_v1",
  marker:
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1",
  version: 1,
  collected_at_ms: 1_800_000_000_000,
  evidence_generation: 1,
  transport_policy: transportPolicy,
  account: {
    remote_user: "voidwitness",
    uid: 1201,
    gid: 1201,
    shell: "/bin/sh",
    dedicated_account: true,
  },
  handler: {
    path:
      "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs",
    source_git_blob_sha1:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1,
    installed_git_blob_sha1:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1,
    uid: 0,
    gid: 0,
    mode: 0o444,
    nlink: 1,
    regular_file: true,
    symlink: false,
    root_owned_parent_chain: true,
  },
  node: {
    path: "/usr/bin/node",
    resolved_path: "/usr/bin/node",
    sha256: sha("4"),
    uid: 0,
    gid: 0,
    mode: 0o755,
    regular_file: true,
    symlink: false,
    root_owned: true,
    node_major: 24,
    node_version: "v24.19.0",
  },
  config: {
    path:
      "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json",
    sha256: sha("5"),
    uid: 1201,
    gid: 1201,
    mode: 0o600,
    nlink: 1,
    regular_file: true,
    symlink: false,
    root_owned_nonwritable_parent_chain: true,
    authority_root: "/var/lib/void-allocation-custody-witness-v1",
    witness_filename:
      "buy-void-allocation-custody-high-water-witness-v1.jsonl",
    policy_sha256:
      "sha256:1c8a9a4d144e28d585e38c41f21576e72ccb76eec89ecec0f641c46d12c9c720",
  },
  authorized_key: {
    authorized_keys_path: "/var/lib/voidwitness/.ssh/authorized_keys",
    authorized_keys_uid: 1201,
    authorized_keys_gid: 1201,
    authorized_keys_mode: 0o600,
    authorized_keys_nlink: 1,
    authorized_keys_regular_file: true,
    authorized_keys_symlink: false,
    authorized_keys_parent_private: true,
    line_sha256: sha("6"),
    key_algorithm: "ssh-ed25519",
    public_key_sha256: sha("3"),
    restrict: true,
    forced_command_present: true,
    forced_command_sha256: sha("7"),
    environment_options: [],
    permit_pty: false,
    permit_agent_forwarding: false,
    permit_port_forwarding: false,
    permit_x11_forwarding: false,
    permit_user_rc: false,
    caller_selected_command: false,
    caller_selected_path: false,
  },
  sshd: {
    permit_user_environment: false,
    accept_env: [],
    publickey_only: true,
    password_authentication: false,
    kbd_interactive_authentication: false,
    authorized_keys_environment_allowed: false,
    effective_config_sha256: sha("8"),
  },
  preexec: {
    env_path: "/usr/bin/env",
    original_command_rejected_before_sanitization: true,
    environment_cleared_before_node: true,
    user_rc_executed: false,
    shell_startup_hook_executed: false,
    dangerous_environment_absent: [...dangerousEnvironment],
    node_environment: {
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1: "1",
    },
  },
  host_binding: {
    remote_host: "nimo.void.internal",
    remote_port: 22,
    host_key_algorithm: "ssh-ed25519",
    host_key_sha256: sha("1"),
    known_hosts_sha256: sha("2"),
    client_public_key_sha256: sha("3"),
  },
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireOk<T>(
  value: T,
): Extract<T, { ok: true }> {
  const runtime = value as T & { ok: boolean; reason?: string };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected installation HOLD");
  }
  return value as Extract<T, { ok: true }>;
}

function expectHeld(
  input: unknown,
  reason: RegExp,
): void {
  const decision =
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
      input,
    );
  assert.equal(decision.ok, false);
  if (decision.ok === true) {
    throw new Error("expected installation qualification HOLD");
  }
  assert.match(decision.reason, reason);
}

const transportProbe =
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
    baseline,
  );
expectHeld(
  baseline,
  /witness_installation_config_invalid/u,
);
if (transportProbe.ok === true) {
  throw new Error("baseline policy digest fixture must be rebound below");
}

const policyOnly = clone(baseline);
const parentProbe = await import(
  "../src/economic/buy_void_allocation_custody_witness_transport_v1.js"
);
const classifiedPolicy =
  parentProbe.classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
    transportPolicy,
  );
assert.equal(classifiedPolicy.ok, true);
if (classifiedPolicy.ok !== true) {
  throw new Error(classifiedPolicy.reason);
}
policyOnly.config.policy_sha256 = classifiedPolicy.policy_sha256;

const ok = requireOk(
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
    policyOnly,
  ),
);
assert.equal(ok.status, "source_installation_evidence_qualified");
assert.match(ok.qualification_id, /^voidwiq1_[0-9a-f]{64}$/u);
assert.equal(ok.operation_performed, false);
assert.equal(ok.live_evidence_origin_proven, false);
assert.equal(ok.trusted_verification_clock_proven, false);
assert.equal(ok.evidence_generation_monotonicity_proven, false);
assert.equal(ok.live_nimo_installed, false);
assert.equal(ok.external_transport_authenticated, false);
assert.equal(ok.external_witness_storage_proven, false);
assert.equal(ok.runtime_integration, false);
assert.equal(ok.production_gate_ready, false);
assert.equal(ok.funds_movement, false);
assert.equal(
  requireOk(
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
      clone(policyOnly),
    ),
  ).qualification_id,
  ok.qualification_id,
  "same evidence must produce the same qualification ID",
);

{
  const value = clone(policyOnly);
  value.handler.source_git_blob_sha1 = "0".repeat(40);
  expectHeld(value, /witness_installation_handler_invalid/u);
}
{
  const value = clone(policyOnly);
  value.handler.installed_git_blob_sha1 = "1".repeat(40);
  expectHeld(value, /witness_installation_handler_invalid/u);
}
{
  const value = clone(policyOnly);
  value.handler.path = "/tmp/handler.mjs";
  expectHeld(value, /witness_installation_handler_invalid/u);
}
{
  const value = clone(policyOnly);
  value.handler.root_owned_parent_chain = false;
  expectHeld(value, /witness_installation_handler_invalid/u);
}
{
  const value = clone(policyOnly);
  value.node.mode = 0o644;
  expectHeld(value, /witness_installation_node_invalid/u);
}
{
  const value = clone(policyOnly);
  value.node.node_major = 20;
  expectHeld(value, /witness_installation_node_invalid/u);
}
{
  const value = clone(policyOnly);
  value.config.uid = 0;
  expectHeld(value, /witness_installation_config_invalid/u);
}
{
  const value = clone(policyOnly);
  value.config.policy_sha256 = sha("9");
  expectHeld(value, /witness_installation_config_invalid/u);
}
{
  const value = clone(policyOnly);
  value.config.authority_root = "relative/root";
  expectHeld(value, /witness_installation_config_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.environment_options = ["NODE_OPTIONS=--require=/tmp/x.js"];
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.restrict = false;
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.permit_user_rc = true;
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.caller_selected_command = true;
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.sshd.permit_user_environment = true;
  expectHeld(value, /witness_installation_sshd_invalid/u);
}
{
  const value = clone(policyOnly);
  value.sshd.accept_env = ["NODE_OPTIONS"];
  expectHeld(value, /witness_installation_sshd_invalid/u);
}
{
  const value = clone(policyOnly);
  value.sshd.publickey_only = false;
  expectHeld(value, /witness_installation_sshd_invalid/u);
}
{
  const value = clone(policyOnly);
  value.preexec.original_command_rejected_before_sanitization = false;
  expectHeld(value, /witness_installation_preexec_invalid/u);
}
{
  const value = clone(policyOnly);
  value.preexec.environment_cleared_before_node = false;
  expectHeld(value, /witness_installation_preexec_invalid/u);
}
{
  const value = clone(policyOnly);
  value.preexec.user_rc_executed = true;
  expectHeld(value, /witness_installation_preexec_invalid/u);
}
{
  const value = clone(policyOnly);
  value.preexec.dangerous_environment_absent =
    value.preexec.dangerous_environment_absent.slice(1);
  expectHeld(value, /witness_installation_preexec_invalid/u);
}
{
  const value = clone(policyOnly);
  (value.preexec.node_environment as Record<string, string>).NODE_OPTIONS = "";
  expectHeld(value, /witness_installation_preexec_invalid/u);
}
{
  const value = clone(policyOnly);
  value.host_binding.host_key_sha256 = sha("9");
  expectHeld(value, /witness_installation_host_binding_invalid/u);
}
{
  const value = clone(policyOnly);
  value.account.remote_user = "other";
  expectHeld(value, /witness_installation_account_invalid/u);
}
{
  const value = clone(policyOnly) as any;
  value.evidence_generation = "1";
  expectHeld(value, /witness_installation_collection_invalid/u);
}

const trueKeys = new Set([
  "source_contract",
  "pure_installation_evidence_classification",
  "transport_policy_binding",
  "reviewed_handler_blob_binding",
  "dedicated_account_required",
  "protected_config_required",
  "restrictive_authorized_key_required",
  "sshd_environment_restrictions_required",
  "preexec_original_command_rejection_required",
  "sanitized_node_environment_required",
  "pinned_host_key_required",
  "pinned_client_key_required",
]);
for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1,
)) {
  assert.equal(value, trueKeys.has(key), key);
}

console.log(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1 +
    "_GREEN",
);
console.log("transport_policy_binding=true");
console.log("reviewed_handler_blob_binding=true");
console.log("original_command_rejected_before_environment_sanitization=true");
console.log("sanitized_node_environment_required=true");
console.log("authorized_key_environment_options_allowed=false");
console.log("permit_user_environment=false");
console.log("accept_env_empty=true");
console.log("live_evidence_origin_proven=false");
console.log("live_nimo_installed=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
