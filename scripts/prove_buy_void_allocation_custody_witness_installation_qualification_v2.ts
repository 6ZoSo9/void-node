#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
} from "../src/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1,
} from "../src/economic/buy_void_allocation_custody_witness_installation_qualification_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2,
} from "../src/economic/buy_void_allocation_custody_witness_installation_qualification_v2.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const handlerPath =
  "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs";
const handlerBytes = fs.readFileSync(handlerPath);
const actualHandlerGitBlobSha1 = crypto
  .createHash("sha1")
  .update(
    Buffer.concat([
      Buffer.from("blob " + handlerBytes.length + "\0", "utf8"),
      handlerBytes,
    ]),
  )
  .digest("hex");
assert.equal(
  actualHandlerGitBlobSha1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
  "V2 qualifier must pin the actual merged handler Git blob",
);
const handlerSource = handlerBytes.toString("utf8");
assert.ok(
  handlerSource.includes(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1.slice(
      "sha256:".length,
    ),
  ),
  "qualifier continuity SHA must be present in the reviewed handler",
);
assert.ok(
  handlerSource.includes(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
  ),
  "qualifier continuity ID must be present in the reviewed handler",
);
assert.ok(
  handlerSource.includes(
    "17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef",
  ),
  "qualifier census reference must be present in the reviewed handler",
);

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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireOk<T>(
  value: T,
): Extract<T, { ok: true }> {
  const runtime = value as T & { ok: boolean; reason?: string };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected V2 installation HOLD");
  }
  return value as Extract<T, { ok: true }>;
}

function expectHeld(
  input: unknown,
  reason: RegExp,
): void {
  const decision =
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(
      input,
    );
  const runtime = decision as typeof decision & {
    ok: boolean;
    reason?: string;
  };
  if (runtime.ok !== false) {
    throw new Error("expected V2 installation qualification HOLD");
  }
  assert.match(runtime.reason ?? "", reason);
}

const policy = requireOk(
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
    transportPolicy,
  ),
);

const expectedConfig = {
  schema:
    "void_buy_void_allocation_custody_witness_forced_command_config_v1",
  marker:
    "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1",
  version: 1,
  authority_root: "/var/lib/void-allocation-custody-witness-v1",
  witness_filename:
    "buy-void-allocation-custody-high-water-witness-v1.jsonl",
  policy: policy.policy,
};
const expectedConfigSha256 =
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(canonical(expectedConfig) + "\n", "utf8")
    .digest("hex");

const forcedCommandV2 =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json';

const baseline = {
  schema:
    "void_buy_void_allocation_custody_witness_installation_qualification_v2",
  marker:
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
  version: 2,
  collected_at_ms: 1_800_000_000_000,
  evidence_generation: 2,
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
      "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs",
    source_git_blob_sha1:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
    installed_git_blob_sha1:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
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
      "/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json",
    sha256: expectedConfigSha256,
    uid: 0,
    gid: 0,
    mode: 0o444,
    nlink: 1,
    regular_file: true,
    symlink: false,
    root_owned_nonwritable_parent_chain: true,
    authority_root: "/var/lib/void-allocation-custody-witness-v1",
    witness_filename:
      "buy-void-allocation-custody-high-water-witness-v1.jsonl",
    policy_sha256: policy.policy_sha256,
  },
  continuity_attestation: {
    path:
      "/var/lib/void-allocation-custody-witness-v1/buy-void-allocation-custody-witness-identity-continuity-attestation-v1.json",
    sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1,
    attestation_id:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
    census_receipt_sha256:
      "sha256:17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef",
    uid: 1201,
    gid: 1201,
    mode: 0o600,
    nlink: 1,
    regular_file: true,
    symlink: false,
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
    forced_command: forcedCommandV2,
    forced_command_present: true,
    forced_command_sha256:
      "sha256:46d3476854cbb8ffdfb9355b0410d15d3a4601561cba33bf583edaf8bb2cf86f",
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
      VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2: "1",
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

const ok = requireOk(
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(
    baseline,
  ),
);
assert.equal(ok.status, "source_installation_evidence_qualified_v2");
assert.match(ok.qualification_id, /^voidwiq2_[0-9a-f]{64}$/u);
assert.match(ok.parent_qualification_id, /^voidwiq1_[0-9a-f]{64}$/u);
assert.equal(
  ok.normalized.schema,
  "void_buy_void_allocation_custody_witness_installation_qualification_v2",
);
assert.equal(
  ok.normalized.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
);
assert.equal(ok.normalized.version, 2);
assert.equal(
  ok.normalized.parent_qualification_id,
  ok.parent_qualification_id,
);
assert.equal(ok.operation_performed, false);
assert.equal(ok.live_evidence_origin_proven, false);
assert.equal(ok.live_continuity_attestation_installed, false);
assert.equal(ok.live_nimo_installed, false);
assert.equal(ok.external_transport_authenticated, false);
assert.equal(ok.external_witness_storage_proven, false);
assert.equal(ok.runtime_integration, false);
assert.equal(ok.production_gate_ready, false);
assert.equal(ok.funds_movement, false);
assert.equal(
  ok.normalized.handler_git_blob_sha1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
);
assert.equal(
  ok.normalized.continuity_attestation_sha256,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1,
);
assert.equal(ok.normalized.config_uid, 0);
assert.equal(ok.normalized.config_gid, 0);
assert.equal(ok.normalized.config_mode, 0o444);
assert.equal(ok.normalized.config_root_owned_read_only, true);

const same = requireOk(
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(
    clone(baseline),
  ),
);
assert.equal(same.qualification_id, ok.qualification_id);

{
  const parentAttempt = clone(baseline) as any;
  delete parentAttempt.continuity_attestation;
  parentAttempt.schema =
    "void_buy_void_allocation_custody_witness_installation_qualification_v1";
  parentAttempt.marker =
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1";
  parentAttempt.version = 1;
  const parent =
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
      parentAttempt,
    );
  assert.equal(parent.ok, false, "V1 qualifier must not authorize V2 bytes");
}

for (const mutate of [
  (v: any) => { v.handler.source_git_blob_sha1 = "0".repeat(40); },
  (v: any) => { v.handler.installed_git_blob_sha1 = "1".repeat(40); },
  (v: any) => { v.handler.path = "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs"; },
]) {
  const value = clone(baseline);
  mutate(value);
  expectHeld(value, /witness_installation_v2_handler_invalid/u);
}

{
  const value = clone(baseline);
  value.config.path =
    "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json";
  expectHeld(value, /witness_installation_v2_config_invalid/u);
}
for (const [field, replacement] of [
  ["uid", 1201],
  ["gid", 1201],
  ["mode", 0o600],
  ["nlink", 2],
  ["regular_file", false],
  ["symlink", true],
  ["root_owned_nonwritable_parent_chain", false],
] as const) {
  const value = clone(baseline) as any;
  value.config[field] = replacement;
  expectHeld(value, /witness_installation_v2_config_invalid/u);
}
{
  const value = clone(baseline);
  value.authorized_key.forced_command =
    value.authorized_key.forced_command.replaceAll("V2", "V1").replaceAll("-v2.", "-v1.");
  expectHeld(value, /witness_installation_v2_authorized_key_invalid/u);
}
{
  const value = clone(baseline);
  value.authorized_key.forced_command_sha256 = sha("9");
  expectHeld(value, /witness_installation_v2_authorized_key_invalid/u);
}
{
  const value = clone(baseline) as any;
  delete value.preexec.node_environment
    .VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2;
  value.preexec.node_environment
    .VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1 = "1";
  expectHeld(value, /witness_installation_v2_preexec_invalid/u);
}
{
  const value = clone(baseline) as any;
  value.preexec.node_environment.NODE_OPTIONS = "";
  expectHeld(value, /witness_installation_v2_preexec_invalid/u);
}

for (const [field, replacement] of [
  ["path", "/tmp/continuity.json"],
  ["sha256", sha("9")],
  ["attestation_id", "voidwica1_" + "9".repeat(64)],
  ["census_receipt_sha256", sha("8")],
  ["uid", 1202],
  ["gid", 1202],
  ["mode", 0o644],
  ["nlink", 2],
  ["regular_file", false],
  ["symlink", true],
] as const) {
  const value = clone(baseline) as any;
  value.continuity_attestation[field] = replacement;
  expectHeld(
    value,
    /witness_installation_v2_continuity_attestation_invalid/u,
  );
}

{
  const value = clone(baseline) as any;
  delete value.continuity_attestation;
  expectHeld(value, /witness_installation_v2_shape_invalid/u);
}

{
  const value = clone(baseline);
  value.sshd.strict_modes = false;
  expectHeld(
    value,
    /witness_installation_v2_parent_witness_installation_sshd_invalid/u,
  );
}
{
  const value = clone(baseline);
  value.authorized_key.authorized_keys_uid = 1201;
  expectHeld(
    value,
    /witness_installation_v2_parent_witness_installation_authorized_key_invalid/u,
  );
}
{
  const value = clone(baseline);
  value.account.shell_root_owned_nonwritable_parent_chain = false;
  expectHeld(
    value,
    /witness_installation_v2_parent_witness_installation_account_invalid/u,
  );
}
{
  const value = clone(baseline);
  value.preexec.original_command_rejected_before_sanitization = false;
  expectHeld(
    value,
    /witness_installation_v2_parent_witness_installation_preexec_invalid/u,
  );
}
{
  const value = clone(baseline);
  value.host_binding.host_key_sha256 = sha("9");
  expectHeld(
    value,
    /witness_installation_v2_parent_witness_installation_host_binding_invalid/u,
  );
}

const trueKeys = new Set([
  "source_contract",
  "pure_installation_evidence_classification",
  "v1_qualification_reused",
  "transport_policy_binding",
  "reviewed_handler_blob_binding",
  "v2_handler_blob_binding",
  "v2_forced_command_binding",
  "continuity_attestation_binding",
  "dedicated_account_required",
  "protected_config_required",
  "root_owned_read_only_config_file_required",
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
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V2,
)) {
  assert.equal(value, trueKeys.has(key), key);
}

console.log(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2 +
    "_GREEN",
);
console.log("v1_qualification_reused=true");
console.log("v2_handler_blob_binding=true");
console.log("v2_forced_command_binding=true");
console.log("continuity_attestation_binding=true");
console.log("continuity_attestation_account_owned_mode_0600=true");\nconsole.log("config_root_owned_read_only_mode_0444=true");
console.log("root_owned_authorized_keys_required=true");
console.log("sshd_strict_modes=true");
console.log("original_command_rejected_before_environment_sanitization=true");
console.log("live_evidence_origin_proven=false");
console.log("live_continuity_attestation_installed=false");
console.log("live_nimo_installed=false");
console.log("external_transport_authenticated=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
