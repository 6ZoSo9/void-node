#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

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
  "BASHOPTS",
  "ENV",
  "GCONV_PATH",
  "LD_AUDIT",
  "LD_LIBRARY_PATH",
  "LD_PRELOAD",
  "NODE_OPTIONS",
  "NODE_PATH",
  "OPENSSL_CONF",
  "PS4",
  "SHELLOPTS",
] as const;

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical fixture");
}

const expectedConfig = {
  schema:
    "void_buy_void_allocation_custody_witness_forced_command_config_v1",
  marker:
    "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1",
  version: 1,
  authority_root: "/var/lib/void-allocation-custody-witness-v1",
  witness_filename:
    "buy-void-allocation-custody-high-water-witness-v1.jsonl",
  policy: transportPolicy,
};
const expectedConfigSha256 =
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(canonical(expectedConfig) + "\n", "utf8")
    .digest("hex");

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
    shell_path: "/bin/sh",
    shell_path_symlink: true,
    shell_resolved_path: "/usr/bin/dash",
    shell_sha256: sha("a"),
    shell_uid: 0,
    shell_gid: 0,
    shell_mode: 0o755,
    shell_regular_file: true,
    shell_root_owned: true,
    shell_root_owned_nonwritable_parent_chain: true,
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
    root_owned_nonwritable_parent_chain: true,
    node_major: 24,
    node_version: "v24.19.0",
  },
  config: {
    path:
      "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json",
    sha256: expectedConfigSha256,
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
    authorized_keys_path: "/etc/ssh/authorized_keys/voidwitness",
    authorized_keys_uid: 0,
    authorized_keys_gid: 0,
    authorized_keys_mode: 0o444,
    authorized_keys_nlink: 1,
    authorized_keys_regular_file: true,
    authorized_keys_symlink: false,
    authorized_keys_root_owned_nonwritable_parent_chain: true,
    line_sha256: sha("6"),
    key_algorithm: "ssh-ed25519",
    public_key_sha256: sha("3"),
    restrict: true,
    forced_command:
      'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json',
    forced_command_present: true,
    forced_command_sha256:
      "sha256:8a625211d41d6044bb87abaafa954cd89db07d81a5bbb3f4ac6a788c7e1ae422",
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
    authorized_keys_file: "/etc/ssh/authorized_keys/voidwitness",
    publickey_only: true,
    password_authentication: false,
    kbd_interactive_authentication: false,
    authorized_keys_environment_allowed: false,
    strict_modes: true,
    effective_config_sha256: sha("8"),
  },
  preexec: {
    env_path: "/usr/bin/env",
    env_resolved_path: "/usr/bin/env",
    env_sha256: sha("c"),
    env_uid: 0,
    env_gid: 0,
    env_mode: 0o755,
    env_regular_file: true,
    env_symlink: false,
    env_root_owned_nonwritable_parent_chain: true,
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
  const runtime = decision as typeof decision & {
    ok: boolean;
    reason?: string;
  };
  if (runtime.ok !== false) {
    throw new Error("expected installation qualification HOLD");
  }
  assert.match(runtime.reason ?? "", reason);
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
const policyRuntime = classifiedPolicy as typeof classifiedPolicy & {
  ok: boolean;
  reason?: string;
};
if (policyRuntime.ok !== true) {
  throw new Error(policyRuntime.reason ?? "unexpected transport policy HOLD");
}
policyOnly.config.policy_sha256 =
  (classifiedPolicy as Extract<typeof classifiedPolicy, { ok: true }>)
    .policy_sha256;

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
  value.account.shell_sha256 = sha("b");
  const changed = requireOk(
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
      value,
    ),
  );
  assert.notEqual(
    changed.qualification_id,
    ok.qualification_id,
    "shell identity is evidence identity, not a caller-ignored field",
  );
}
{
  const value = clone(policyOnly);
  value.account.shell_path_symlink = false;
  expectHeld(value, /witness_installation_account_invalid/u);
}
{
  const value = clone(policyOnly);
  value.account.shell_root_owned_nonwritable_parent_chain = false;
  expectHeld(value, /witness_installation_account_invalid/u);
}
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
  value.node.resolved_path = "/opt/node/bin/node";
  expectHeld(value, /witness_installation_node_invalid/u);
}
{
  const value = clone(policyOnly);
  value.node.root_owned_nonwritable_parent_chain = false;
  expectHeld(value, /witness_installation_node_invalid/u);
}
{
  const value = clone(policyOnly);
  value.node.node_major = 20;
  expectHeld(value, /witness_installation_node_invalid/u);
}
{
  const value = clone(policyOnly);
  value.node.node_version = "v22.19.0";
  expectHeld(value, /witness_installation_node_invalid/u);
}
{
  const value = clone(policyOnly);
  value.config.uid = 0;
  expectHeld(value, /witness_installation_config_invalid/u);
}
{
  const value = clone(policyOnly);
  value.config.sha256 = sha("5");
  expectHeld(value, /witness_installation_config_digest_mismatch/u);
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
  value.config.authority_root = "/var/lib/alternate-witness-root";
  expectHeld(value, /witness_installation_config_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.environment_options = ["NODE_OPTIONS=--require=/tmp/x.js"];
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.authorized_keys_path =
    "/tmp/authorized_keys";
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.authorized_keys_uid = 1201;
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.authorized_keys_mode = 0o600;
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.authorized_keys_root_owned_nonwritable_parent_chain =
    false;
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.restrict = false;
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.forced_command =
    "/usr/bin/node /tmp/handler.mjs";
  expectHeld(value, /witness_installation_authorized_key_invalid/u);
}
{
  const value = clone(policyOnly);
  value.authorized_key.forced_command_sha256 = sha("7");
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
  value.sshd.authorized_keys_file =
    "/var/lib/voidwitness/.ssh/authorized_keys";
  expectHeld(value, /witness_installation_sshd_invalid/u);
}
{
  const value = clone(policyOnly);
  value.sshd.strict_modes = false;
  expectHeld(value, /witness_installation_sshd_invalid/u);
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
  value.preexec.env_resolved_path = "/tmp/env";
  expectHeld(value, /witness_installation_preexec_invalid/u);
}
{
  const value = clone(policyOnly);
  value.preexec.env_mode = 0o644;
  expectHeld(value, /witness_installation_preexec_invalid/u);
}
{
  const value = clone(policyOnly);
  value.preexec.env_root_owned_nonwritable_parent_chain = false;
  expectHeld(value, /witness_installation_preexec_invalid/u);
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
  "root_owned_authorized_keys_required",
  "effective_authorized_keys_path_binding",
  "sshd_environment_restrictions_required",
  "preexec_original_command_rejection_required",
  "preexec_binary_identity_binding",
  "root_owned_execution_chain_required",
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
console.log("preexec_binary_identity_binding=true");
console.log("root_owned_execution_chain_required=true");
console.log("sanitized_node_environment_required=true");
console.log("authorized_key_environment_options_allowed=false");
console.log("authorized_keys_root_owned=true");
console.log("authorized_keys_account_writable=false");
console.log("sshd_authorized_keys_file_bound=true");
console.log("sshd_strict_modes=true");
console.log("node_major_matches_version=true");
console.log("permit_user_environment=false");
console.log("accept_env_empty=true");
console.log("live_evidence_origin_proven=false");
console.log("live_nimo_installed=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
