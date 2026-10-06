import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
} from "./buy_void_allocation_custody_witness_transport_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_evidence_classifier: true,
    exact_transport_policy_binding: true,
    exact_reviewed_handler_identity_required: true,
    exact_forced_command_required: true,
    sanitized_preexec_environment_required: true,
    dedicated_account_required: true,
    restricted_authorized_key_required: true,
    strict_sshd_environment_required: true,
    pinned_host_and_client_key_binding_required: true,
    protected_config_binding_required: true,
    caller_selected_remote_command: false,
    caller_selected_remote_path: false,
    live_evidence_origin_proven: false,
    live_nimo_installed: false,
    authorized_keys_mutated: false,
    sshd_mutated: false,
    ssh_key_generated: false,
    server_controlled_policy_origin_proven: false,
    challenge_freshness_proven: false,
    response_replay_resistance_proven: false,
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
    inventory_mutation: false,
    treasury_movement: false,
    liquidity_movement: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1 =
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs";
export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1 =
  "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json";
export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_AUTHORITY_ROOT_V1 =
  "/var/lib/void-buy-allocation-custody-witness-v1";
export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_WITNESS_NAME_V1 =
  "buy-void-allocation-custody-high-water-witness-v1.jsonl";
export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_ACCOUNT_SHELL_V1 =
  "/usr/sbin/nologin";

const EXPECTED_HANDLER_GIT_BLOB_SHA1 =
  "e19fa1094981b10cea6052ac86281fd6e760b800";
const EXPECTED_HANDLER_SHA256 =
  "8b0f2fc8b3e93ad728f9022459a3f0b3cbe6633d07dd38d2fdb3d9744d8423ba";
const EXPECTED_TRANSPORT_GIT_BLOB_SHA1 =
  "6d697468e29fb55d6892ab1269401be485ebeba8";
const EXPECTED_TRANSPORT_SHA256 =
  "d7ef969c408d5bd2217374020cd97a773e27c8b603245837a6a29d6f0b7abca1";

const CONFIG_SCHEMA =
  "void_buy_void_allocation_custody_witness_forced_command_config_v1";
const CONFIG_MARKER =
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const SHA1_HEX = /^[0-9a-f]{40}$/u;
const MODE = /^(?:0600|0644|0700|0755)$/u;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;

const EVIDENCE_KEYS = Object.freeze([
  "account",
  "authorized_key",
  "caller_selected_command_executed",
  "caller_selected_path_used",
  "config_file",
  "config_sha256",
  "dangerous_environment_absent",
  "deployed_handler",
  "effective_preexec_environment",
  "handler_source_git_blob_sha1",
  "handler_source_sha256",
  "host_key_algorithm",
  "host_key_sha256",
  "known_hosts_sha256",
  "live_probe_performed",
  "node_binary",
  "observed_at_ms",
  "policy_sha256",
  "shell_startup_executed",
  "sshd",
  "transport_policy",
  "transport_source_git_blob_sha1",
  "transport_source_sha256",
  "user_rc_executed",
]);

const ACCOUNT_KEYS = Object.freeze([
  "dedicated",
  "gid",
  "name",
  "shell",
  "uid",
]);

const FILE_KEYS = Object.freeze([
  "ancestor_chain_root_owned_nonwritable",
  "gid",
  "git_blob_sha1",
  "mode",
  "nlink",
  "path",
  "sha256",
  "symlink",
  "uid",
]);

const CONFIG_FILE_KEYS = Object.freeze([
  "ancestor_chain_root_owned_nonwritable",
  "gid",
  "mode",
  "nlink",
  "path",
  "sha256",
  "symlink",
  "uid",
]);

const NODE_KEYS = Object.freeze([
  "ancestor_chain_root_owned_nonwritable",
  "gid",
  "mode",
  "nlink",
  "path",
  "sha256",
  "symlink",
  "uid",
]);

const AUTHORIZED_KEY_KEYS = Object.freeze([
  "client_public_key_sha256",
  "environment_option_present",
  "forced_command",
  "key_algorithm",
  "line",
  "line_sha256",
  "restrict",
]);

const SSHD_KEYS = Object.freeze([
  "accept_env",
  "allow_agent_forwarding",
  "allow_tcp_forwarding",
  "gateway_ports",
  "permit_tty",
  "permit_tunnel",
  "permit_user_environment",
  "permit_user_rc",
  "x11_forwarding",
]);

function fail(reason: string): never {
  throw new Error(reason);
}

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

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value)
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_installation_noncanonical_value");
}

function canonicalLine(value: unknown): string {
  return canonicalJson(value) + "\n";
}

function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Id(value: string | Buffer): string {
  return "sha256:" + sha256Hex(value);
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as Record<string, unknown>;
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

function exactInt(
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

function sha256Field(value: unknown, reason: string): string {
  const raw = exactString(value, reason);
  if (!SHA256_ID.test(raw)) fail(reason);
  return raw;
}

function sha256HexField(value: unknown, reason: string): string {
  const raw = exactString(value, reason);
  if (!SHA256_HEX.test(raw)) fail(reason);
  return raw;
}

function sha1Field(value: unknown, reason: string): string {
  const raw = exactString(value, reason);
  if (!SHA1_HEX.test(raw)) fail(reason);
  return raw;
}

function modeField(value: unknown, reason: string): string {
  const raw = exactString(value, reason);
  if (!MODE.test(raw)) fail(reason);
  return raw;
}

function expectedForcedCommand(): string {
  return (
    "/usr/bin/env -i " +
    "PATH=/usr/bin:/bin " +
    "LANG=C LC_ALL=C " +
    "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 " +
    "/usr/bin/node " +
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1 +
    " --config=" +
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1
  );
}

export function buildBuyVoidAllocationCustodyWitnessInstallationExpectationV1(
  transportPolicy: unknown,
) {
  const classified =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
      transportPolicy,
    );
  if (classified.ok === false) {
    return held(
      "witness_installation_transport_" + classified.reason,
    );
  }

  const config = Object.freeze({
    schema: CONFIG_SCHEMA,
    marker: CONFIG_MARKER,
    version: 1,
    authority_root:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_AUTHORITY_ROOT_V1,
    witness_filename:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_WITNESS_NAME_V1,
    policy: classified.policy,
  });
  const configJson = canonicalLine(config);

  return Object.freeze({
    ok: true as const,
    status: "expectation_built" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
    version: 1 as const,
    transport_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
    endpoint_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
    transport_policy: classified.policy,
    policy_sha256: classified.policy_sha256,
    config,
    config_json: configJson,
    config_sha256: sha256Id(configJson),
    forced_command: expectedForcedCommand(),
    handler_path:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1,
    config_path:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1,
    authority_root:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_AUTHORITY_ROOT_V1,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V1,
  });
}

function requireExactFile(
  input: unknown,
  expected: {
    path: string;
    git_blob_sha1: string;
    sha256: string;
    mode: "0755";
  },
): Readonly<Record<string, unknown>> {
  const raw = exactObject(
    input,
    FILE_KEYS,
    "witness_installation_handler_file_invalid",
  );
  if (
    raw.path !== expected.path ||
    sha1Field(
      raw.git_blob_sha1,
      "witness_installation_handler_file_invalid",
    ) !== expected.git_blob_sha1 ||
    sha256HexField(
      raw.sha256,
      "witness_installation_handler_file_invalid",
    ) !== expected.sha256 ||
    modeField(
      raw.mode,
      "witness_installation_handler_file_invalid",
    ) !== expected.mode ||
    exactInt(
      raw.uid,
      0,
      0,
      "witness_installation_handler_file_invalid",
    ) !== 0 ||
    exactInt(
      raw.gid,
      0,
      0,
      "witness_installation_handler_file_invalid",
    ) !== 0 ||
    exactInt(
      raw.nlink,
      1,
      1,
      "witness_installation_handler_file_invalid",
    ) !== 1 ||
    raw.symlink !== false ||
    raw.ancestor_chain_root_owned_nonwritable !== true
  ) {
    fail("witness_installation_handler_file_invalid");
  }
  return Object.freeze({ ...raw });
}

function requireProtectedConfig(
  input: unknown,
  accountUid: number,
  accountGid: number,
  expectedConfigSha256: string,
): Readonly<Record<string, unknown>> {
  const raw = exactObject(
    input,
    CONFIG_FILE_KEYS,
    "witness_installation_config_file_invalid",
  );
  if (
    raw.path !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_CONFIG_PATH_V1 ||
    sha256Field(
      raw.sha256,
      "witness_installation_config_file_invalid",
    ) !== expectedConfigSha256 ||
    modeField(
      raw.mode,
      "witness_installation_config_file_invalid",
    ) !== "0600" ||
    exactInt(
      raw.uid,
      accountUid,
      accountUid,
      "witness_installation_config_file_invalid",
    ) !== accountUid ||
    exactInt(
      raw.gid,
      accountGid,
      accountGid,
      "witness_installation_config_file_invalid",
    ) !== accountGid ||
    exactInt(
      raw.nlink,
      1,
      1,
      "witness_installation_config_file_invalid",
    ) !== 1 ||
    raw.symlink !== false ||
    raw.ancestor_chain_root_owned_nonwritable !== true
  ) {
    fail("witness_installation_config_file_invalid");
  }
  return Object.freeze({ ...raw });
}

function requireNodeBinary(
  input: unknown,
): Readonly<Record<string, unknown>> {
  const raw = exactObject(
    input,
    NODE_KEYS,
    "witness_installation_node_binary_invalid",
  );
  if (
    raw.path !== "/usr/bin/node" ||
    !SHA256_HEX.test(String(raw.sha256 ?? "")) ||
    modeField(
      raw.mode,
      "witness_installation_node_binary_invalid",
    ) !== "0755" ||
    exactInt(
      raw.uid,
      0,
      0,
      "witness_installation_node_binary_invalid",
    ) !== 0 ||
    exactInt(
      raw.gid,
      0,
      0,
      "witness_installation_node_binary_invalid",
    ) !== 0 ||
    exactInt(
      raw.nlink,
      1,
      1,
      "witness_installation_node_binary_invalid",
    ) !== 1 ||
    raw.symlink !== false ||
    raw.ancestor_chain_root_owned_nonwritable !== true
  ) {
    fail("witness_installation_node_binary_invalid");
  }
  return Object.freeze({ ...raw });
}

function requireAccount(
  input: unknown,
  remoteUser: string,
) {
  const raw = exactObject(
    input,
    ACCOUNT_KEYS,
    "witness_installation_account_invalid",
  );
  if (
    raw.name !== remoteUser ||
    raw.shell !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_ACCOUNT_SHELL_V1 ||
    raw.dedicated !== true
  ) {
    fail("witness_installation_account_invalid");
  }
  return Object.freeze({
    name: remoteUser,
    uid: exactInt(
      raw.uid,
      1,
      4_294_967_294,
      "witness_installation_account_invalid",
    ),
    gid: exactInt(
      raw.gid,
      1,
      4_294_967_294,
      "witness_installation_account_invalid",
    ),
    shell:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_ACCOUNT_SHELL_V1,
    dedicated: true as const,
  });
}

function requireAuthorizedKey(
  input: unknown,
  forcedCommand: string,
  clientPublicKeySha256: string,
) {
  const raw = exactObject(
    input,
    AUTHORIZED_KEY_KEYS,
    "witness_installation_authorized_key_invalid",
  );
  const line = exactString(
    raw.line,
    "witness_installation_authorized_key_invalid",
  );
  if (
    line.includes("\n") ||
    line.includes("\r") ||
    raw.forced_command !== forcedCommand ||
    raw.restrict !== true ||
    raw.environment_option_present !== false ||
    raw.key_algorithm !== "ssh-ed25519" ||
    raw.client_public_key_sha256 !== clientPublicKeySha256 ||
    sha256Id(line) !== raw.line_sha256
  ) {
    fail("witness_installation_authorized_key_invalid");
  }
  const prefix =
    'restrict,command="' +
    forcedCommand +
    '" ssh-ed25519 ';
  if (
    !line.startsWith(prefix) ||
    !/^[A-Za-z0-9+/]+={0,2} void-allocation-witness-v1$/u.test(
      line.slice(prefix.length),
    )
  ) {
    fail("witness_installation_authorized_key_invalid");
  }
  return Object.freeze({
    line,
    line_sha256: raw.line_sha256 as string,
  });
}

function requireSshd(input: unknown) {
  const raw = exactObject(
    input,
    SSHD_KEYS,
    "witness_installation_sshd_invalid",
  );
  if (
    !Array.isArray(raw.accept_env) ||
    raw.accept_env.length !== 0 ||
    raw.permit_user_environment !== false ||
    raw.permit_user_rc !== false ||
    raw.allow_agent_forwarding !== false ||
    raw.allow_tcp_forwarding !== false ||
    raw.x11_forwarding !== false ||
    raw.permit_tunnel !== false ||
    raw.gateway_ports !== false ||
    raw.permit_tty !== false
  ) {
    fail("witness_installation_sshd_invalid");
  }
  return Object.freeze({
    permit_user_environment: false as const,
    permit_user_rc: false as const,
    accept_env: Object.freeze([] as string[]),
    allow_agent_forwarding: false as const,
    allow_tcp_forwarding: false as const,
    x11_forwarding: false as const,
    permit_tunnel: false as const,
    gateway_ports: false as const,
    permit_tty: false as const,
  });
}

export function classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
  input: {
    evidence: unknown;
    now_ms: unknown;
  },
) {
  try {
    const evidence = exactObject(
      input?.evidence,
      EVIDENCE_KEYS,
      "witness_installation_evidence_shape_invalid",
    );

    const expectation =
      buildBuyVoidAllocationCustodyWitnessInstallationExpectationV1(
        evidence.transport_policy,
      );
    if (expectation.ok === false) {
      fail(expectation.reason);
    }

    const nowMs = exactInt(
      input?.now_ms,
      0,
      9_007_199_254_740_991,
      "witness_installation_clock_invalid",
    );
    const observedAtMs = exactInt(
      evidence.observed_at_ms,
      0,
      nowMs,
      "witness_installation_evidence_time_invalid",
    );
    if (
      nowMs - observedAtMs > MAX_EVIDENCE_AGE_MS
    ) {
      fail("witness_installation_evidence_stale");
    }

    if (
      evidence.live_probe_performed !== false ||
      evidence.caller_selected_command_executed !== false ||
      evidence.caller_selected_path_used !== false ||
      evidence.user_rc_executed !== false ||
      evidence.shell_startup_executed !== false ||
      evidence.dangerous_environment_absent !== true
    ) {
      fail("witness_installation_execution_boundary_invalid");
    }

    if (
      evidence.transport_source_git_blob_sha1 !==
        EXPECTED_TRANSPORT_GIT_BLOB_SHA1 ||
      evidence.transport_source_sha256 !==
        EXPECTED_TRANSPORT_SHA256 ||
      evidence.handler_source_git_blob_sha1 !==
        EXPECTED_HANDLER_GIT_BLOB_SHA1 ||
      evidence.handler_source_sha256 !==
        EXPECTED_HANDLER_SHA256 ||
      evidence.policy_sha256 !== expectation.policy_sha256 ||
      evidence.config_sha256 !== expectation.config_sha256 ||
      evidence.host_key_algorithm !==
        expectation.transport_policy.host_key_algorithm ||
      evidence.host_key_sha256 !==
        expectation.transport_policy.host_key_sha256 ||
      evidence.known_hosts_sha256 !==
        expectation.transport_policy.known_hosts_sha256
    ) {
      fail("witness_installation_source_policy_binding_invalid");
    }

    const account = requireAccount(
      evidence.account,
      expectation.transport_policy.remote_user,
    );

    const handler = requireExactFile(
      evidence.deployed_handler,
      {
        path:
          VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_HANDLER_PATH_V1,
        git_blob_sha1: EXPECTED_HANDLER_GIT_BLOB_SHA1,
        sha256: EXPECTED_HANDLER_SHA256,
        mode: "0755",
      },
    );

    const configFile = requireProtectedConfig(
      evidence.config_file,
      account.uid,
      account.gid,
      expectation.config_sha256,
    );
    const nodeBinary = requireNodeBinary(evidence.node_binary);

    const authorizedKey = requireAuthorizedKey(
      evidence.authorized_key,
      expectation.forced_command,
      expectation.transport_policy.client_public_key_sha256,
    );
    const sshd = requireSshd(evidence.sshd);

    const effectiveEnvironment = evidence.effective_preexec_environment;
    if (
      !Array.isArray(effectiveEnvironment) ||
      effectiveEnvironment.length !== 4 ||
      effectiveEnvironment[0] !== "LANG=C" ||
      effectiveEnvironment[1] !== "LC_ALL=C" ||
      effectiveEnvironment[2] !== "PATH=/usr/bin:/bin" ||
      effectiveEnvironment[3] !==
        "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1"
    ) {
      fail("witness_installation_preexec_environment_invalid");
    }

    const attestationBody = Object.freeze({
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
      version: 1,
      observed_at_ms: observedAtMs,
      policy_sha256: expectation.policy_sha256,
      transport_source_git_blob_sha1:
        EXPECTED_TRANSPORT_GIT_BLOB_SHA1,
      transport_source_sha256:
        EXPECTED_TRANSPORT_SHA256,
      handler_source_git_blob_sha1:
        EXPECTED_HANDLER_GIT_BLOB_SHA1,
      handler_source_sha256:
        EXPECTED_HANDLER_SHA256,
      handler_path: expectation.handler_path,
      config_path: expectation.config_path,
      config_sha256: expectation.config_sha256,
      forced_command: expectation.forced_command,
      remote_user: account.name,
      remote_uid: account.uid,
      remote_gid: account.gid,
      remote_shell: account.shell,
      authorized_key_line_sha256:
        authorizedKey.line_sha256,
      node_path: nodeBinary.path,
      node_sha256: nodeBinary.sha256,
      host_key_algorithm:
        expectation.transport_policy.host_key_algorithm,
      host_key_sha256:
        expectation.transport_policy.host_key_sha256,
      known_hosts_sha256:
        expectation.transport_policy.known_hosts_sha256,
      client_public_key_sha256:
        expectation.transport_policy.client_public_key_sha256,
      sshd,
      handler_mode: handler.mode,
      handler_owner_uid: handler.uid,
      config_mode: configFile.mode,
      config_owner_uid: configFile.uid,
      live_probe_performed: false,
    });

    return Object.freeze({
      ok: true as const,
      status:
        "installation_evidence_qualified_not_live" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1,
      version: 1 as const,
      qualification_id:
        "voidwinstall1_" +
        sha256Hex(canonicalJson(attestationBody)),
      attestation: attestationBody,
      operation_performed: false as const,
      live_evidence_origin_proven: false as const,
      live_nimo_installed: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      runtime_integration: false as const,
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
