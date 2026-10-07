import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayComparePacketV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_compare_packet_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import type {
  BuyVoidWitnessLiveReadReplayCompareCallbackV1,
} from "./buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_AUTHORITY_V1 =
  Object.freeze({
    source_only_adapter: true,
    no_caller_selected_host_key_or_target: true,
    designated_custody_uid_gid_required: true,
    separate_custody_ssh_key_required: true,
    root_owned_known_hosts_file_required: true,
    exact_nimo_ed25519_host_pin_required: true,
    ssh_configuration_discarded: true,
    ssh_agent_disabled: true,
    no_password_or_keyboard_authentication: true,
    fixed_destination: true,
    fixed_ssh_timeout_and_output_cap: true,
    canonical_compare_packet_required: true,
    matched_only_callback_result: true,
    operator_installation_required: true,
    server_compare_only_authorization_proven: false,
    compare_key_provisioned: false,
    runtime_integration: false,
    unguarded_entrypoints_retired: false,
    guarded_writer_exclusivity_proven: false,
    live_authenticated_compare_executed: false,
    live_policy_enforcement_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    wallet_or_signer_access: false,
    ssh_identity_private_key_used_if_installed: true,
    private_key_material_read_by_adapter_js: false,
    private_key_access: true,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const CUSTODY_UID = 994;
const CUSTODY_GID = 981;
const KEY_PARENT = "/var/lib/void-replay-compare-transport-v1";
const KEY_PATH = KEY_PARENT + "/id_ed25519";
const KNOWN_HOSTS_PARENT = "/etc/void/replay-compare-transport-v1";
const KNOWN_HOSTS_PATH = KNOWN_HOSTS_PARENT + "/known_hosts";
const EXPECTED_NIMO_HOST_FINGERPRINT =
  "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk";
const SSH_BINARY = "/usr/bin/ssh";
const SSH_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUEST_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_request_v1";
const REQUEST_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_REQUEST_V1";
const REQUEST_ID = /^voidwlrwreq1_[0-9a-f]{64}$/u;

type LocalReplayV1 = Readonly<{
  journal_jsonl: Buffer;
  high_water_json: Buffer;
}>;

type SSHOptionsV1 = {
  input: Buffer;
  timeout: number;
  maxBuffer: number;
  encoding: null;
  env: Record<string, string>;
  windowsHide: boolean;
};

type SSHResultV1 = Readonly<{
  status: number | null;
  signal: string | null;
  error?: unknown;
  stdout: Buffer | string | null;
  stderr: Buffer | string | null;
}>;

type SSHRunnerV1 = (
  command: string,
  args: string[],
  options: SSHOptionsV1,
) => SSHResultV1;

function fail(code: string): never {
  throw new Error(code);
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
    const record = value as Record<string, unknown>;
    return "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}";
  }
  fail("witness_replay_ssh_compare_adapter_noncanonical_value");
}

function fileIdentity(path: string, uid: number, gid: number, mode: number, label: string): void {
  const stat = fs.lstatSync(path);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.uid !== uid ||
    stat.gid !== gid ||
    stat.nlink !== 1 ||
    (stat.mode & 0o777) !== mode
  ) {
    fail(label + "_identity_invalid");
  }
}

function directoryIdentity(
  path: string,
  uid: number,
  gid: number,
  mode: number,
  label: string,
): void {
  const stat = fs.lstatSync(path);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== uid ||
    stat.gid !== gid ||
    (stat.mode & 0o777) !== mode
  ) {
    fail(label + "_identity_invalid");
  }
}

function verifyPinnedNimoHost(): void {
  const lines = fs.readFileSync(KNOWN_HOSTS_PATH, "utf8").trimEnd().split("\n");
  if (lines.length !== 1) {
    fail("witness_replay_ssh_compare_adapter_known_hosts_line_count_invalid");
  }
  const parts = lines[0].split(" ");
  if (
    parts.length !== 3 ||
    parts[0] !== "nimo" ||
    parts[1] !== "ssh-ed25519" ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(parts[2])
  ) {
    fail("witness_replay_ssh_compare_adapter_known_hosts_shape_invalid");
  }
  const decoded = Buffer.from(parts[2], "base64");
  if (
    decoded.length < 32 ||
    decoded.toString("base64") !== parts[2]
  ) {
    fail("witness_replay_ssh_compare_adapter_known_hosts_key_invalid");
  }
  const fingerprint =
    "SHA256:" +
    crypto.createHash("sha256").update(decoded).digest("base64").replace(/=+$/u, "");
  if (fingerprint !== EXPECTED_NIMO_HOST_FINGERPRINT) {
    fail("witness_replay_ssh_compare_adapter_nimo_host_key_mismatch");
  }
}

function requireInstalledCredentials(): void {
  if (
    process.platform !== "linux" ||
    typeof process.geteuid !== "function" ||
    typeof process.getegid !== "function" ||
    process.geteuid() !== CUSTODY_UID ||
    process.getegid() !== CUSTODY_GID
  ) {
    fail("witness_replay_ssh_compare_adapter_custody_identity_invalid");
  }
  directoryIdentity(KEY_PARENT, CUSTODY_UID, CUSTODY_GID, 0o700, "ssh_key_parent");
  fileIdentity(KEY_PATH, CUSTODY_UID, CUSTODY_GID, 0o600, "ssh_key");
  directoryIdentity(KNOWN_HOSTS_PARENT, 0, 0, 0o755, "known_hosts_parent");
  fileIdentity(KNOWN_HOSTS_PATH, 0, 0, 0o444, "known_hosts");
  verifyPinnedNimoHost();
}

function sshArgs(): string[] {
  return [
    "-F", "/dev/null",
    "-T",
    "-i", KEY_PATH,
    "-o", "BatchMode=yes",
    "-o", "IdentitiesOnly=yes",
    "-o", "IdentityAgent=none",
    "-o", "PreferredAuthentications=publickey",
    "-o", "PasswordAuthentication=no",
    "-o", "KbdInteractiveAuthentication=no",
    "-o", "StrictHostKeyChecking=yes",
    "-o", "HostKeyAlgorithms=ssh-ed25519",
    "-o", "HostKeyAlias=nimo",
    "-o", "UserKnownHostsFile=" + KNOWN_HOSTS_PATH,
    "-o", "GlobalKnownHostsFile=/dev/null",
    "-o", "UpdateHostKeys=no",
    "-o", "CanonicalizeHostname=no",
    "-o", "ClearAllForwardings=yes",
    "-o", "RequestTTY=no",
    "-o", "ForwardAgent=no",
    "-o", "ForwardX11=no",
    "-o", "PermitLocalCommand=no",
    "-o", "ConnectionAttempts=1",
    "-o", "ConnectTimeout=4",
    "-o", "ControlMaster=no",
    "-o", "ProxyCommand=none",
    "-o", "ProxyJump=none",
    "voidwitness@100.91.79.112",
  ];
}

function responseBytes(value: unknown, label: string): Buffer {
  if (!Buffer.isBuffer(value) || value.length > MAX_RESPONSE_BYTES) {
    fail(label);
  }
  return Buffer.from(value);
}

function buildRequest(input: LocalReplayV1, requestId: string): Buffer {
  if (!REQUEST_ID.test(requestId)) {
    fail("witness_replay_ssh_compare_adapter_request_id_invalid");
  }
  if (
    !Buffer.isBuffer(input.journal_jsonl) ||
    !Buffer.isBuffer(input.high_water_json) ||
    input.journal_jsonl.length > 8 * 1024 * 1024 ||
    input.high_water_json.length > 16 * 1024
  ) {
    fail("witness_replay_ssh_compare_adapter_local_state_invalid");
  }
  const journal = Buffer.from(input.journal_jsonl);
  const highWater = Buffer.from(input.high_water_json);
  const checked =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
      journal_jsonl: journal,
      high_water_json: highWater,
    });
  if (checked.ok !== true) {
    fail("witness_replay_ssh_compare_adapter_local_" + String(checked.reason || "held"));
  }
  const request = Object.freeze({
    schema: REQUEST_SCHEMA,
    marker: REQUEST_MARKER,
    version: 1,
    operation: "compare",
    request_id: requestId,
    source_journal_json_base64: journal.toString("base64"),
    source_high_water_json_base64: highWater.toString("base64"),
  });
  const bytes = Buffer.from(canonicalJson(request) + "\n", "utf8");
  if (bytes.length > 12 * 1024 * 1024) {
    fail("witness_replay_ssh_compare_adapter_request_too_large");
  }
  return bytes;
}

function compare(
  input: LocalReplayV1,
  requestId: string,
  run: SSHRunnerV1,
) {
  const request = buildRequest(input, requestId);
  const result = run(SSH_BINARY, sshArgs(), {
    input: request,
    timeout: SSH_TIMEOUT_MS,
    maxBuffer: MAX_RESPONSE_BYTES,
    encoding: null,
    windowsHide: true,
    env: {
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      HOME: KEY_PARENT,
    },
  });

  if (
    result.error ||
    result.signal !== null ||
    result.status !== 0
  ) {
    fail("witness_replay_ssh_compare_adapter_ssh_transport_failed");
  }
  const stderr = responseBytes(
    result.stderr,
    "witness_replay_ssh_compare_adapter_ssh_stderr_invalid",
  );
  const response = responseBytes(
    result.stdout,
    "witness_replay_ssh_compare_adapter_response_invalid",
  );
  if (stderr.length !== 0 || response.length < 2) {
    fail("witness_replay_ssh_compare_adapter_ssh_channel_invalid");
  }

  const qualified =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayComparePacketV1({
      current_journal_jsonl: input.journal_jsonl,
      current_high_water_json: input.high_water_json,
      request_json: request,
      response_json: response,
    });
  if (qualified.ok !== true) {
    fail("witness_replay_ssh_compare_adapter_packet_" + String(qualified.reason || "held"));
  }
  return Object.freeze({
    request_json: Buffer.from(request),
    response_json: Buffer.from(response),
  });
}

/**
 * Source-only adapter; actual installation requires a dedicated compare-only
 * key and root-owned Nimo host pin. This module never provisions credentials.
 */
export function createBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareAdapterV1():
  BuyVoidWitnessLiveReadReplayCompareCallbackV1 {
  return (input) => {
    requireInstalledCredentials();
    const requestId = "voidwlrwreq1_" + crypto.randomBytes(32).toString("hex");
    return compare(input, requestId, (command, args, options) =>
      spawnSync(command, args, options));
  };
}

/**
 * Test-only seam: a stubbed runner cannot establish SSH or any live authority.
 */
export function testOnlyCompareBuyVoidAllocationCustodyWitnessLiveReadReplaySshAdapterV1(
  input: LocalReplayV1,
  requestId: string,
  run: SSHRunnerV1,
) {
  return compare(input, requestId, run);
}

export function testOnlyBuildBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareRequestV1(
  input: LocalReplayV1,
  requestId: string,
): Buffer {
  return buildRequest(input, requestId);
}
