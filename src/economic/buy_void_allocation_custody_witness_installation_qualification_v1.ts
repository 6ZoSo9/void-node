import crypto from "node:crypto";
import path from "node:path";

import {
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
} from "./buy_void_allocation_custody_witness_transport_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_installation_evidence_classification: true,
    transport_policy_binding: true,
    reviewed_handler_blob_binding: true,
    dedicated_account_required: true,
    protected_config_required: true,
    restrictive_authorized_key_required: true,
    sshd_environment_restrictions_required: true,
    preexec_original_command_rejection_required: true,
    sanitized_node_environment_required: true,
    pinned_host_key_required: true,
    pinned_client_key_required: true,
    live_evidence_origin_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    live_nimo_installed: false,
    live_ssh_execution_performed: false,
    authorized_keys_mutated: false,
    sshd_mutated: false,
    config_installed: false,
    ssh_key_generated: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1 =
  "e19fa1094981b10cea6052ac86281fd6e760b800";

const SCHEMA =
  "void_buy_void_allocation_custody_witness_installation_qualification_v1";
const HANDLER_PATH =
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs";
const CONFIG_PATH =
  "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json";
const NODE_PATH = "/usr/bin/node";
const ENV_PATH = "/usr/bin/env";
const AUTHORITY_ROOT =
  "/var/lib/void-allocation-custody-witness-v1";
const WITNESS_NAME =
  "buy-void-allocation-custody-high-water-witness-v1.jsonl";
const FORCED_COMMAND =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json';
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const GIT_SHA1 = /^[0-9a-f]{40}$/u;
const USER = /^[a-z_][a-z0-9_-]{0,31}$/u;
const SAFE_ABSOLUTE =
  /^\/(?:[A-Za-z0-9._+-]+\/)*[A-Za-z0-9._+-]+$/u;
const VERSION = /^v?[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9._-]+)?$/u;

const DANGEROUS_ENVIRONMENT_NAMES = Object.freeze([
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
]);

const TOP_KEYS = Object.freeze([
  "account",
  "authorized_key",
  "collected_at_ms",
  "config",
  "evidence_generation",
  "handler",
  "host_binding",
  "marker",
  "node",
  "preexec",
  "schema",
  "sshd",
  "transport_policy",
  "version",
]);
const ACCOUNT_KEYS = Object.freeze([
  "dedicated_account",
  "gid",
  "remote_user",
  "shell",
  "uid",
]);
const HANDLER_KEYS = Object.freeze([
  "installed_git_blob_sha1",
  "mode",
  "nlink",
  "path",
  "regular_file",
  "root_owned_parent_chain",
  "source_git_blob_sha1",
  "symlink",
  "uid",
  "gid",
]);
const NODE_KEYS = Object.freeze([
  "gid",
  "mode",
  "node_major",
  "node_version",
  "path",
  "regular_file",
  "resolved_path",
  "root_owned",
  "sha256",
  "symlink",
  "uid",
]);
const CONFIG_KEYS = Object.freeze([
  "authority_root",
  "gid",
  "mode",
  "nlink",
  "path",
  "policy_sha256",
  "regular_file",
  "root_owned_nonwritable_parent_chain",
  "sha256",
  "symlink",
  "uid",
  "witness_filename",
]);
const AUTHORIZED_KEY_KEYS = Object.freeze([
  "authorized_keys_gid",
  "authorized_keys_mode",
  "authorized_keys_nlink",
  "authorized_keys_parent_private",
  "authorized_keys_path",
  "authorized_keys_regular_file",
  "authorized_keys_symlink",
  "authorized_keys_uid",
  "caller_selected_command",
  "caller_selected_path",
  "environment_options",
  "forced_command",
  "forced_command_present",
  "forced_command_sha256",
  "key_algorithm",
  "permit_agent_forwarding",
  "permit_port_forwarding",
  "permit_pty",
  "permit_user_rc",
  "permit_x11_forwarding",
  "public_key_sha256",
  "restrict",
  "line_sha256",
]);
const SSHD_KEYS = Object.freeze([
  "accept_env",
  "authorized_keys_environment_allowed",
  "effective_config_sha256",
  "kbd_interactive_authentication",
  "password_authentication",
  "permit_user_environment",
  "publickey_only",
]);
const PREEXEC_KEYS = Object.freeze([
  "dangerous_environment_absent",
  "env_path",
  "environment_cleared_before_node",
  "node_environment",
  "original_command_rejected_before_sanitization",
  "shell_startup_hook_executed",
  "user_rc_executed",
]);
const NODE_ENV_KEYS = Object.freeze([
  "LANG",
  "LC_ALL",
  "PATH",
  "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1",
]);
const HOST_KEYS = Object.freeze([
  "client_public_key_sha256",
  "host_key_algorithm",
  "host_key_sha256",
  "known_hosts_sha256",
  "remote_host",
  "remote_port",
]);

type RecordV1 = Record<string, unknown>;

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1,
  });
}

function fail(reason: string): never {
  throw new Error(reason);
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as RecordV1;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_installation_noncanonical_value");
}

function sha256Id(value: string): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value, "utf8").digest("hex")
  );
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): RecordV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as RecordV1;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return record;
}

function exactString(value: unknown, reason: string): string {
  if (typeof value !== "string") fail(reason);
  return value;
}

function exactInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  reason: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(reason);
  }
  return value;
}

function exactMode(value: unknown, expected: number, reason: string): number {
  const mode = exactInteger(value, 0, 0o7777, reason);
  if (mode !== expected) fail(reason);
  return mode;
}

function sha256Field(value: unknown, reason: string): string {
  const text = exactString(value, reason);
  if (!SHA256_ID.test(text)) fail(reason);
  return text;
}

function gitSha1Field(value: unknown, reason: string): string {
  const text = exactString(value, reason);
  if (!GIT_SHA1.test(text)) fail(reason);
  return text;
}

function absolutePath(value: unknown, expected: string | null, reason: string) {
  const text = exactString(value, reason);
  if (
    !SAFE_ABSOLUTE.test(text) ||
    path.resolve(text) !== text ||
    text.includes("\0")
  ) {
    fail(reason);
  }
  if (expected !== null && text !== expected) fail(reason);
  return text;
}

function exactStringArray(value: unknown, reason: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    fail(reason);
  }
  return Object.freeze([...value]);
}

export function classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
  input: unknown,
) {
  try {
    const raw = exactObject(
      input,
      TOP_KEYS,
      "witness_installation_shape_invalid",
    );
    if (
      raw.schema !== SCHEMA ||
      raw.marker !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1 ||
      raw.version !== 1
    ) {
      fail("witness_installation_identity_invalid");
    }

    const transport =
      classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
        raw.transport_policy,
      );
    if (transport.ok === false) {
      fail("witness_installation_transport_" + transport.reason);
    }

    const account = exactObject(
      raw.account,
      ACCOUNT_KEYS,
      "witness_installation_account_invalid",
    );
    const remoteUser = exactString(
      account.remote_user,
      "witness_installation_account_invalid",
    );
    if (
      !USER.test(remoteUser) ||
      remoteUser !== transport.policy.remote_user ||
      account.dedicated_account !== true ||
      account.shell !== "/bin/sh"
    ) {
      fail("witness_installation_account_invalid");
    }
    const uid = exactInteger(
      account.uid,
      1,
      4_294_967_294,
      "witness_installation_account_invalid",
    );
    const gid = exactInteger(
      account.gid,
      1,
      4_294_967_294,
      "witness_installation_account_invalid",
    );

    const handler = exactObject(
      raw.handler,
      HANDLER_KEYS,
      "witness_installation_handler_invalid",
    );
    const sourceBlob = gitSha1Field(
      handler.source_git_blob_sha1,
      "witness_installation_handler_invalid",
    );
    const installedBlob = gitSha1Field(
      handler.installed_git_blob_sha1,
      "witness_installation_handler_invalid",
    );
    if (
      sourceBlob !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1 ||
      installedBlob !== sourceBlob ||
      absolutePath(
        handler.path,
        HANDLER_PATH,
        "witness_installation_handler_invalid",
      ) !== HANDLER_PATH ||
      handler.uid !== 0 ||
      handler.gid !== 0 ||
      handler.nlink !== 1 ||
      handler.regular_file !== true ||
      handler.symlink !== false ||
      handler.root_owned_parent_chain !== true
    ) {
      fail("witness_installation_handler_invalid");
    }
    exactMode(
      handler.mode,
      0o444,
      "witness_installation_handler_invalid",
    );

    const node = exactObject(
      raw.node,
      NODE_KEYS,
      "witness_installation_node_invalid",
    );
    if (
      absolutePath(node.path, NODE_PATH, "witness_installation_node_invalid") !==
        NODE_PATH ||
      absolutePath(
        node.resolved_path,
        NODE_PATH,
        "witness_installation_node_invalid",
      ) !== NODE_PATH ||
      node.uid !== 0 ||
      node.gid !== 0 ||
      node.root_owned !== true ||
      node.regular_file !== true ||
      node.symlink !== false
    ) {
      fail("witness_installation_node_invalid");
    }
    exactMode(
      node.mode,
      0o755,
      "witness_installation_node_invalid",
    );
    const nodeMajor = exactInteger(
      node.node_major,
      22,
      26,
      "witness_installation_node_invalid",
    );
    if (![22, 24, 26].includes(nodeMajor)) {
      fail("witness_installation_node_invalid");
    }
    const nodeVersion = exactString(
      node.node_version,
      "witness_installation_node_invalid",
    );
    if (!VERSION.test(nodeVersion)) {
      fail("witness_installation_node_invalid");
    }
    const nodeSha256 = sha256Field(
      node.sha256,
      "witness_installation_node_invalid",
    );

    const config = exactObject(
      raw.config,
      CONFIG_KEYS,
      "witness_installation_config_invalid",
    );
    if (
      absolutePath(
        config.path,
        CONFIG_PATH,
        "witness_installation_config_invalid",
      ) !== CONFIG_PATH ||
      config.uid !== uid ||
      config.gid !== gid ||
      config.nlink !== 1 ||
      config.regular_file !== true ||
      config.symlink !== false ||
      config.root_owned_nonwritable_parent_chain !== true ||
      config.witness_filename !== WITNESS_NAME ||
      config.policy_sha256 !== transport.policy_sha256
    ) {
      fail("witness_installation_config_invalid");
    }
    exactMode(
      config.mode,
      0o600,
      "witness_installation_config_invalid",
    );
    const configSha256 = sha256Field(
      config.sha256,
      "witness_installation_config_invalid",
    );
    const authorityRoot = absolutePath(
      config.authority_root,
      AUTHORITY_ROOT,
      "witness_installation_config_invalid",
    );

    const authorizedKey = exactObject(
      raw.authorized_key,
      AUTHORIZED_KEY_KEYS,
      "witness_installation_authorized_key_invalid",
    );
    if (
      authorizedKey.key_algorithm !== "ssh-ed25519" ||
      authorizedKey.public_key_sha256 !==
        transport.policy.client_public_key_sha256 ||
      authorizedKey.restrict !== true ||
      authorizedKey.forced_command_present !== true ||
      authorizedKey.forced_command !== FORCED_COMMAND ||
      authorizedKey.caller_selected_command !== false ||
      authorizedKey.caller_selected_path !== false ||
      authorizedKey.permit_pty !== false ||
      authorizedKey.permit_agent_forwarding !== false ||
      authorizedKey.permit_port_forwarding !== false ||
      authorizedKey.permit_x11_forwarding !== false ||
      authorizedKey.permit_user_rc !== false ||
      authorizedKey.authorized_keys_uid !== uid ||
      authorizedKey.authorized_keys_gid !== gid ||
      authorizedKey.authorized_keys_nlink !== 1 ||
      authorizedKey.authorized_keys_regular_file !== true ||
      authorizedKey.authorized_keys_symlink !== false ||
      authorizedKey.authorized_keys_parent_private !== true
    ) {
      fail("witness_installation_authorized_key_invalid");
    }
    exactMode(
      authorizedKey.authorized_keys_mode,
      0o600,
      "witness_installation_authorized_key_invalid",
    );
    const environmentOptions = exactStringArray(
      authorizedKey.environment_options,
      "witness_installation_authorized_key_invalid",
    );
    if (environmentOptions.length !== 0) {
      fail("witness_installation_authorized_key_invalid");
    }
    const authorizedKeysPath = absolutePath(
      authorizedKey.authorized_keys_path,
      "/var/lib/" + remoteUser + "/.ssh/authorized_keys",
      "witness_installation_authorized_key_invalid",
    );
    const forcedCommandSha256 = sha256Field(
      authorizedKey.forced_command_sha256,
      "witness_installation_authorized_key_invalid",
    );
    if (forcedCommandSha256 !== sha256Id(FORCED_COMMAND)) {
      fail("witness_installation_authorized_key_invalid");
    }
    const authorizedKeyLineSha256 = sha256Field(
      authorizedKey.line_sha256,
      "witness_installation_authorized_key_invalid",
    );

    const sshd = exactObject(
      raw.sshd,
      SSHD_KEYS,
      "witness_installation_sshd_invalid",
    );
    if (
      sshd.permit_user_environment !== false ||
      sshd.authorized_keys_environment_allowed !== false ||
      sshd.publickey_only !== true ||
      sshd.password_authentication !== false ||
      sshd.kbd_interactive_authentication !== false
    ) {
      fail("witness_installation_sshd_invalid");
    }
    const acceptEnv = exactStringArray(
      sshd.accept_env,
      "witness_installation_sshd_invalid",
    );
    if (acceptEnv.length !== 0) {
      fail("witness_installation_sshd_invalid");
    }
    const sshdConfigSha256 = sha256Field(
      sshd.effective_config_sha256,
      "witness_installation_sshd_invalid",
    );

    const preexec = exactObject(
      raw.preexec,
      PREEXEC_KEYS,
      "witness_installation_preexec_invalid",
    );
    if (
      preexec.original_command_rejected_before_sanitization !== true ||
      preexec.environment_cleared_before_node !== true ||
      preexec.user_rc_executed !== false ||
      preexec.shell_startup_hook_executed !== false ||
      absolutePath(
        preexec.env_path,
        ENV_PATH,
        "witness_installation_preexec_invalid",
      ) !== ENV_PATH
    ) {
      fail("witness_installation_preexec_invalid");
    }
    const dangerous = exactStringArray(
      preexec.dangerous_environment_absent,
      "witness_installation_preexec_invalid",
    );
    if (
      dangerous.length !== DANGEROUS_ENVIRONMENT_NAMES.length ||
      dangerous.some(
        (name, index) => name !== DANGEROUS_ENVIRONMENT_NAMES[index],
      )
    ) {
      fail("witness_installation_preexec_invalid");
    }
    const nodeEnv = exactObject(
      preexec.node_environment,
      NODE_ENV_KEYS,
      "witness_installation_preexec_invalid",
    );
    if (
      nodeEnv.PATH !== "/usr/bin:/bin" ||
      nodeEnv.LANG !== "C" ||
      nodeEnv.LC_ALL !== "C" ||
      nodeEnv.VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1 !== "1"
    ) {
      fail("witness_installation_preexec_invalid");
    }

    const host = exactObject(
      raw.host_binding,
      HOST_KEYS,
      "witness_installation_host_binding_invalid",
    );
    if (
      host.remote_host !== transport.policy.remote_host ||
      host.remote_port !== transport.policy.remote_port ||
      host.host_key_algorithm !== transport.policy.host_key_algorithm ||
      host.host_key_sha256 !== transport.policy.host_key_sha256 ||
      host.known_hosts_sha256 !== transport.policy.known_hosts_sha256 ||
      host.client_public_key_sha256 !==
        transport.policy.client_public_key_sha256
    ) {
      fail("witness_installation_host_binding_invalid");
    }

    const collectedAtMs = exactInteger(
      raw.collected_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "witness_installation_collection_invalid",
    );
    const evidenceGeneration = exactInteger(
      raw.evidence_generation,
      1,
      Number.MAX_SAFE_INTEGER,
      "witness_installation_collection_invalid",
    );

    const normalized = Object.freeze({
      schema: SCHEMA,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
      version: 1 as const,
      collected_at_ms: collectedAtMs,
      evidence_generation: evidenceGeneration,
      transport_policy_sha256: transport.policy_sha256,
      remote_user: remoteUser,
      account_uid: uid,
      account_gid: gid,
      account_shell: "/bin/sh",
      handler_path: HANDLER_PATH,
      handler_git_blob_sha1: sourceBlob,
      node_path: NODE_PATH,
      node_resolved_path: exactString(
        node.resolved_path,
        "witness_installation_node_invalid",
      ),
      node_sha256: nodeSha256,
      node_major: nodeMajor,
      node_version: nodeVersion,
      config_path: CONFIG_PATH,
      config_sha256: configSha256,
      authority_root: authorityRoot,
      witness_filename: WITNESS_NAME,
      authorized_keys_path: authorizedKeysPath,
      authorized_key_line_sha256: authorizedKeyLineSha256,
      forced_command_sha256: forcedCommandSha256,
      sshd_effective_config_sha256: sshdConfigSha256,
      dangerous_environment_absent:
        DANGEROUS_ENVIRONMENT_NAMES,
      preexec_original_command_rejected_before_sanitization: true as const,
      preexec_environment_cleared_before_node: true as const,
      node_environment: Object.freeze({
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
        VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1: "1",
      }),
      host_key_sha256: transport.policy.host_key_sha256,
      known_hosts_sha256: transport.policy.known_hosts_sha256,
      client_public_key_sha256:
        transport.policy.client_public_key_sha256,
    });
    const qualificationId =
      "voidwiq1_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(normalized), "utf8")
        .digest("hex");

    return Object.freeze({
      ok: true as const,
      status: "source_installation_evidence_qualified" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
      version: 1 as const,
      qualification_id: qualificationId,
      normalized,
      operation_performed: false as const,
      live_evidence_origin_proven: false as const,
      trusted_verification_clock_proven: false as const,
      evidence_generation_monotonicity_proven: false as const,
      live_nimo_installed: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      runtime_integration: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_installation_qualification_failed",
    );
  }
}
