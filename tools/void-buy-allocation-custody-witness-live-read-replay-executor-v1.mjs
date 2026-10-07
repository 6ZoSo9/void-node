#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isIP } from "node:net";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_PACKAGE_V1,
} from "./void-buy-allocation-custody-witness-installation-evidence-v2.mjs";
import {
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1,
} from "./void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs";
import {
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadQualificationV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_qualification_v1.js";
import {
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1,
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_composition_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_AUTHORITY_V1 =
  Object.freeze({
    source_executor: true,
    replay_storage_live_observation_required: true,
    witness_installation_package_required: true,
    local_csprng_entropy_generation: true,
    durable_issue_required: true,
    pinned_ssh_transport_required: true,
    canonical_transport_request_required: true,
    canonical_transport_response_validation_required: true,
    canonical_live_read_qualification_required: true,
    durable_consume_required: true,
    failure_abandonment_required: true,
    canonical_composition_required: true,
    content_addressed_ceremony_receipt: true,
    filesystem_read: true,
    filesystem_write: true,
    network_access: true,
    ssh_execution: true,
    credential_read: true,
    credential_write: false,
    witness_mutation: false,
    remote_filesystem_write: false,
    replay_journal_write: true,
    replay_high_water_write: true,
    replay_intent_write: true,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_export: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    inventory_mutation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const CONFIG_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_executor_config_v1";
const CONFIG_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_CONFIG_V1";
const RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_executor_receipt_v1";
const RECEIPT_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_RECEIPT_V1";
const PACKAGE_SCHEMA =
  "void_buy_void_allocation_custody_witness_installation_evidence_package_v1";
const CHALLENGE_TTL_MS = 30_000;
const MAX_JSON_BYTES = 24 * 1024 * 1024;
const SAFE_HOST = /^[A-Za-z0-9._-]{1,255}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const QUALIFICATION_ID = /^voidwlrcmp1_[0-9a-f]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_live_read_replay_executor_noncanonical_value");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function exactConfig(raw) {
  const value = exactObject(
    raw,
    [
      "schema",
      "marker",
      "version",
      "replay_journal_root",
      "replay_high_water_root",
      "expected_replay_hostname",
      "witness_installation_package_path",
      "transport_policy_path",
      "client_private_key_path",
      "client_known_hosts_path",
    ],
    "witness_live_read_replay_executor_config_invalid",
  );
  if (
    value.schema !== CONFIG_SCHEMA ||
    value.marker !== CONFIG_MARKER ||
    value.version !== 1
  ) {
    fail("witness_live_read_replay_executor_config_invalid");
  }
  const absolute = (input, label) => {
    const rawPath = String(input || "");
    if (
      !rawPath ||
      !path.isAbsolute(rawPath) ||
      path.resolve(rawPath) !== rawPath ||
      rawPath.includes("\0")
    ) {
      fail(label);
    }
    return rawPath;
  };
  const hostname = String(value.expected_replay_hostname || "");
  if (!SAFE_HOST.test(hostname)) {
    fail("witness_live_read_replay_executor_hostname_invalid");
  }
  return Object.freeze({
    replay_journal_root: absolute(
      value.replay_journal_root,
      "witness_live_read_replay_executor_journal_root_invalid",
    ),
    replay_high_water_root: absolute(
      value.replay_high_water_root,
      "witness_live_read_replay_executor_high_water_root_invalid",
    ),
    expected_replay_hostname: hostname,
    witness_installation_package_path: absolute(
      value.witness_installation_package_path,
      "witness_live_read_replay_executor_package_path_invalid",
    ),
    transport_policy_path: absolute(
      value.transport_policy_path,
      "witness_live_read_replay_executor_policy_path_invalid",
    ),
    client_private_key_path: absolute(
      value.client_private_key_path,
      "witness_live_read_replay_executor_private_key_path_invalid",
    ),
    client_known_hosts_path: absolute(
      value.client_known_hosts_path,
      "witness_live_read_replay_executor_known_hosts_path_invalid",
    ),
  });
}

function readBoundedFile(file, maxBytes, modeRequired = null) {
  const visible = fs.lstatSync(file, { bigint: true });
  if (
    !visible.isFile() ||
    visible.isSymbolicLink() ||
    visible.nlink !== 1n ||
    visible.size < 1n ||
    visible.size > BigInt(maxBytes) ||
    (
      typeof process.geteuid === "function" &&
      visible.uid !== BigInt(process.geteuid())
    ) ||
    (
      modeRequired !== null &&
      (Number(visible.mode) & 0o7777) !== modeRequired
    )
  ) {
    fail("witness_live_read_replay_executor_file_invalid");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (
      opened.dev !== visible.dev ||
      opened.ino !== visible.ino ||
      opened.uid !== visible.uid ||
      opened.gid !== visible.gid ||
      opened.mode !== visible.mode ||
      opened.nlink !== visible.nlink ||
      opened.size !== visible.size
    ) {
      fail("witness_live_read_replay_executor_file_path_not_bound");
    }
    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) {
        fail("witness_live_read_replay_executor_file_short_read");
      }
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(file, { bigint: true });
    if (
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.size !== opened.size ||
      after.mtimeNs !== opened.mtimeNs ||
      after.ctimeNs !== opened.ctimeNs ||
      visibleAfter.dev !== opened.dev ||
      visibleAfter.ino !== opened.ino ||
      visibleAfter.size !== opened.size ||
      visibleAfter.mtimeNs !== opened.mtimeNs ||
      visibleAfter.ctimeNs !== opened.ctimeNs
    ) {
      fail("witness_live_read_replay_executor_file_changed");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function readJsonFile(file, maxBytes, modeRequired = null) {
  const bytes = readBoundedFile(file, maxBytes, modeRequired);
  try {
    return Object.freeze({
      bytes,
      value: JSON.parse(bytes.toString("utf8")),
    });
  } catch {
    fail("witness_live_read_replay_executor_json_invalid");
  }
}

function validateInstallationPackage(value) {
  const raw = exactObject(
    value,
    [
      "schema",
      "marker",
      "version",
      "installation_receipt",
      "installation_normalized_qualification",
      "installation_normalized_qualification_sha256",
      "installation_qualification_id",
      "operation_performed",
      "live_evidence_origin_proven",
      "external_transport_authenticated",
      "external_witness_storage_proven",
      "runtime_integration",
      "production_gate_ready",
      "funds_movement",
      "package_sha256",
    ],
    "witness_live_read_replay_executor_package_invalid",
  );
  if (
    raw.schema !== PACKAGE_SCHEMA ||
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_PACKAGE_V1 ||
    raw.version !== 1 ||
    raw.operation_performed !== false ||
    raw.live_evidence_origin_proven !== false ||
    raw.external_transport_authenticated !== false ||
    raw.external_witness_storage_proven !== false ||
    raw.runtime_integration !== false ||
    raw.production_gate_ready !== false ||
    raw.funds_movement !== false ||
    typeof raw.installation_normalized_qualification_sha256 !== "string" ||
    !SHA256_ID.test(raw.installation_normalized_qualification_sha256) ||
    typeof raw.installation_qualification_id !== "string" ||
    !/^voidwiq2_[0-9a-f]{64}$/u.test(raw.installation_qualification_id) ||
    typeof raw.package_sha256 !== "string" ||
    !SHA256_ID.test(raw.package_sha256)
  ) {
    fail("witness_live_read_replay_executor_package_invalid");
  }
  const normalizedSha = sha256Id(
    Buffer.from(
      canonicalJson(raw.installation_normalized_qualification),
      "utf8",
    ),
  );
  if (
    normalizedSha !== raw.installation_normalized_qualification_sha256 ||
    "voidwiq2_" + normalizedSha.slice("sha256:".length) !==
      raw.installation_qualification_id ||
    raw.installation_receipt?.normalized_qualification_sha256 !==
      normalizedSha ||
    raw.installation_receipt?.installation_qualification_id !==
      raw.installation_qualification_id
  ) {
    fail("witness_live_read_replay_executor_package_commitment_mismatch");
  }
  const body = { ...raw };
  delete body.package_sha256;
  if (
    sha256Id(Buffer.from(canonicalJson(body), "utf8")) !==
    raw.package_sha256
  ) {
    fail("witness_live_read_replay_executor_package_digest_mismatch");
  }
  return raw;
}

function parseClientPublicKey(text) {
  const parts = String(text || "").trim().split(/\s+/u);
  if (
    parts.length < 2 ||
    parts[0] !== "ssh-ed25519" ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(parts[1])
  ) {
    fail("witness_live_read_replay_executor_client_key_invalid");
  }
  const blob = Buffer.from(parts[1], "base64");
  if (blob.length < 51 || blob.toString("base64") !== parts[1]) {
    fail("witness_live_read_replay_executor_client_key_invalid");
  }
  return Object.freeze({
    algorithm: "ssh-ed25519",
    sha256: sha256Id(blob),
  });
}

function defaultRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.encoding || "utf8",
    shell: false,
    timeout: options.timeout ?? 10_000,
    maxBuffer: options.maxBuffer ?? 1024 * 1024,
    input: options.input,
    env: options.env || {
      PATH: "/usr/sbin:/usr/bin:/sbin:/bin",
      LANG: "C",
      LC_ALL: "C",
    },
  });
  return result;
}

function defaultIo() {
  return Object.freeze({
    nowMs() {
      return Date.now();
    },
    randomBytes(count) {
      return crypto.randomBytes(count);
    },
    run: defaultRun,
    resolveNetworkContext(remoteHost) {
      const getent = defaultRun(
        "/usr/bin/getent",
        ["ahostsv4", remoteHost],
      );
      if (
        getent.error ||
        getent.signal ||
        getent.status !== 0 ||
        typeof getent.stdout !== "string"
      ) {
        fail("witness_live_read_replay_executor_remote_resolution_failed");
      }
      const remote = getent.stdout
        .split(/\r?\n/u)
        .map((line) => line.trim().split(/\s+/u)[0])
        .find((candidate) => isIP(candidate) === 4);
      if (!remote) {
        fail("witness_live_read_replay_executor_remote_resolution_failed");
      }
      const route = defaultRun(
        "/usr/sbin/ip",
        ["-4", "route", "get", remote],
      );
      if (
        route.error ||
        route.signal ||
        route.status !== 0 ||
        typeof route.stdout !== "string"
      ) {
        fail("witness_live_read_replay_executor_route_probe_failed");
      }
      const match = /\bsrc\s+([0-9.]+)\b/u.exec(route.stdout);
      const source = match?.[1] || "";
      if (
        isIP(source) !== 4 ||
        source.startsWith("127.") ||
        remote.startsWith("127.") ||
        source === remote
      ) {
        fail("witness_live_read_replay_executor_network_context_invalid");
      }
      return Object.freeze({
        client_address: source,
        remote_address: remote,
      });
    },
    runSsh({ policy, keyPath, knownHostsPath, requestJson }) {
      const args = [
        "-F", "/dev/null",
        "-T",
        "-p", String(policy.remote_port),
        "-i", keyPath,
        "-o", "BatchMode=yes",
        "-o", "IdentitiesOnly=yes",
        "-o", "StrictHostKeyChecking=yes",
        "-o", "UserKnownHostsFile=" + knownHostsPath,
        "-o", "GlobalKnownHostsFile=/dev/null",
        "-o", "ClearAllForwardings=yes",
        "-o", "PermitLocalCommand=no",
        "-o", "RequestTTY=no",
        "-o", "PasswordAuthentication=no",
        "-o", "KbdInteractiveAuthentication=no",
        "-o", "NumberOfPasswordPrompts=0",
        "-o", "HostKeyAlgorithms=ssh-ed25519",
        "-o", "PubkeyAcceptedAlgorithms=ssh-ed25519",
        "-o", "LogLevel=ERROR",
        "-o", "ConnectTimeout=" +
          String(Math.floor(policy.connect_timeout_ms / 1000)),
        policy.remote_user + "@" + policy.remote_host,
      ];
      return defaultRun(
        "/usr/bin/ssh",
        args,
        {
          input: requestJson,
          timeout: policy.operation_timeout_ms + 2_000,
          maxBuffer: policy.max_response_bytes + 1024 * 1024,
          encoding: "utf8",
        },
      );
    },
  });
}

function held(reason, state = {}) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1,
    version: 1,
    reason: String(reason || "witness_live_read_replay_executor_failed"),
    issue_persisted: state.issue_persisted === true,
    consume_persisted: state.consume_persisted === true,
    abandonment_persisted: state.abandonment_persisted === true,
    ssh_execution_performed: state.ssh_execution_performed === true,
    live_remote_read_performed: state.live_remote_read_performed === true,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_AUTHORITY_V1,
  });
}

export function executeBuyVoidAllocationCustodyWitnessLiveReadReplayExecutorV1(
  rawConfig,
  injected = null,
) {
  const liveExecution = injected === null;
  const io = Object.freeze({
    ...defaultIo(),
    ...(injected || {}),
  });
  const state = {
    issue_persisted: false,
    consume_persisted: false,
    abandonment_persisted: false,
    ssh_execution_performed: false,
    live_remote_read_performed: false,
  };
  let issue = null;
  let config = null;
  try {
    config = exactConfig(rawConfig);

    const packageFile = readJsonFile(
      config.witness_installation_package_path,
      MAX_JSON_BYTES,
      0o600,
    );
    const installationPackage =
      validateInstallationPackage(packageFile.value);

    const policyFile = readJsonFile(
      config.transport_policy_path,
      256 * 1024,
      0o600,
    );
    const policyDecision =
      classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
        policyFile.value,
      );
    if (policyDecision.ok !== true) {
      fail(
        "witness_live_read_replay_executor_transport_" +
          String(policyDecision.reason || "invalid"),
      );
    }
    const policy = policyDecision.policy;

    const knownHostsBytes = readBoundedFile(
      config.client_known_hosts_path,
      64 * 1024,
      0o600,
    );
    if (
      sha256Id(knownHostsBytes) !== policy.known_hosts_sha256
    ) {
      fail("witness_live_read_replay_executor_known_hosts_mismatch");
    }

    readBoundedFile(
      config.client_private_key_path,
      64 * 1024,
      0o600,
    );
    const keyProbe = io.run(
      "/usr/bin/ssh-keygen",
      ["-y", "-f", config.client_private_key_path],
      { timeout: 5_000, maxBuffer: 64 * 1024 },
    );
    if (
      keyProbe.error ||
      keyProbe.signal ||
      keyProbe.status !== 0 ||
      typeof keyProbe.stdout !== "string"
    ) {
      fail("witness_live_read_replay_executor_client_key_probe_failed");
    }
    const clientKey = parseClientPublicKey(keyProbe.stdout);
    if (
      clientKey.algorithm !== policy.client_key_algorithm ||
      clientKey.sha256 !== policy.client_public_key_sha256
    ) {
      fail("witness_live_read_replay_executor_client_key_mismatch");
    }

    const storage =
      (injected?.collectReplayStorageEvidence ||
        inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1)(
        {
          journal_root: config.replay_journal_root,
          high_water_root: config.replay_high_water_root,
          expected_hostname: config.expected_replay_hostname,
        },
      );
    if (
      !storage ||
      storage.ok !== true ||
      storage.status !== "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED"
    ) {
      fail(
        "witness_live_read_replay_executor_storage_" +
          String(storage?.reason || "invalid"),
      );
    }

    const entropy = Buffer.from(io.randomBytes(32));
    if (entropy.length !== 32) {
      fail("witness_live_read_replay_executor_entropy_invalid");
    }
    const entropySha256 = sha256Id(entropy);
    const issuedAtMs = Number(io.nowMs());
    if (!Number.isSafeInteger(issuedAtMs) || issuedAtMs < 1) {
      fail("witness_live_read_replay_executor_clock_invalid");
    }
    const expiresAtMs = issuedAtMs + CHALLENGE_TTL_MS;

    issue =
      (injected?.persistIssue ||
        persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1)(
        {
          journal_root: config.replay_journal_root,
          high_water_root: config.replay_high_water_root,
          entropy_sha256: entropySha256,
          issued_at_ms: issuedAtMs,
          expires_at_ms: expiresAtMs,
        },
      );
    if (!issue || issue.ok !== true || issue.status !== "persisted_issue") {
      fail(
        "witness_live_read_replay_executor_issue_" +
          String(issue?.reason || "invalid"),
      );
    }
    state.issue_persisted = true;

    const built =
      buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
        policy,
        challenge_sha256: issue.transition_challenge_sha256,
      });
    if (built.ok !== true) {
      fail(
        "witness_live_read_replay_executor_request_" +
          String(built.reason || "invalid"),
      );
    }

    const network = io.resolveNetworkContext(policy.remote_host);
    if (
      !network ||
      isIP(network.client_address) === 0 ||
      isIP(network.remote_address) === 0
    ) {
      fail("witness_live_read_replay_executor_network_context_invalid");
    }

    state.ssh_execution_performed = liveExecution;
    const ssh = io.runSsh({
      policy,
      keyPath: config.client_private_key_path,
      knownHostsPath: config.client_known_hosts_path,
      requestJson: built.request_json,
    });
    if (
      !ssh ||
      ssh.error ||
      ssh.signal ||
      ssh.status !== 0 ||
      typeof ssh.stdout !== "string" ||
      typeof ssh.stderr !== "string" ||
      ssh.stderr !== ""
    ) {
      fail("witness_live_read_replay_executor_ssh_failed");
    }
    const responseBytes = Buffer.from(ssh.stdout, "utf8");
    const responseObservedAtMs = Number(io.nowMs());
    if (
      !Number.isSafeInteger(responseObservedAtMs) ||
      responseObservedAtMs < issuedAtMs ||
      responseObservedAtMs > expiresAtMs
    ) {
      fail("witness_live_read_replay_executor_response_time_invalid");
    }

    const transportValidation =
      validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
        policy,
        request_json: built.request_json,
        response_json: responseBytes,
      });
    if (
      transportValidation.ok !== true ||
      transportValidation.status !== "read_response_verified"
    ) {
      fail(
        "witness_live_read_replay_executor_response_" +
          String(transportValidation.reason || "invalid"),
      );
    }
    state.live_remote_read_performed = liveExecution;

    const qualifyLiveRead =
      injected?.qualifyLiveRead ||
      classifyBuyVoidAllocationCustodyWitnessLiveReadQualificationV1;
    const liveRead = qualifyLiveRead({
      installation_receipt:
        installationPackage.installation_receipt,
      installation_normalized_qualification:
        installationPackage.installation_normalized_qualification,
      transport_policy: policy,
      client_known_hosts_base64:
        knownHostsBytes.toString("base64"),
      challenge_sha256: issue.transition_challenge_sha256,
      challenge_issued_at_ms: issue.transition_issued_at_ms,
      response_observed_at_ms: responseObservedAtMs,
      prior_evidence_generation: storage.normalized.generation,
      evidence_generation: issue.generation,
      observed_client_address: network.client_address,
      observed_remote_address: network.remote_address,
      read_request_json: built.request_json,
      read_response_json: responseBytes,
    });
    if (
      !liveRead ||
      liveRead.ok !== true ||
      liveRead.status !== "live_read_packet_qualified"
    ) {
      fail(
        "witness_live_read_replay_executor_live_read_" +
          String(liveRead?.reason || "invalid"),
      );
    }

    const responseSha256 = sha256Id(responseBytes);
    const consume =
      (injected?.persistTerminal ||
        persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1)(
        {
          journal_root: config.replay_journal_root,
          high_water_root: config.replay_high_water_root,
          outcome: "consumed",
          request_id: built.request_id,
          response_sha256: responseSha256,
          terminal_at_ms: responseObservedAtMs,
        },
      );
    if (
      !consume ||
      consume.ok !== true ||
      consume.status !== "persisted_consumed"
    ) {
      fail(
        "witness_live_read_replay_executor_consume_" +
          String(consume?.reason || "invalid"),
      );
    }
    state.consume_persisted = true;

    const compose =
      injected?.compose ||
      classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1;
    const composition = compose({
      replay_storage_evidence: storage,
      issue_result: issue,
      live_read_qualification: liveRead,
      consume_result: consume,
      transport_policy: policy,
      read_request_json: built.request_json,
      read_response_json: responseBytes,
    });
    if (
      !composition ||
      composition.ok !== true ||
      composition.status !== "replay_live_read_composed" ||
      typeof composition.qualification_id !== "string" ||
      !QUALIFICATION_ID.test(composition.qualification_id)
    ) {
      fail(
        "witness_live_read_replay_executor_composition_" +
          String(composition?.reason || "invalid"),
      );
    }

    const body = Object.freeze({
      schema: RECEIPT_SCHEMA,
      marker: RECEIPT_MARKER,
      version: 1,
      replay_storage_qualification_id: storage.qualification_id,
      witness_installation_package_sha256:
        installationPackage.package_sha256,
      witness_installation_qualification_id:
        installationPackage.installation_qualification_id,
      composition_qualification_id:
        composition.qualification_id,
      transport_policy_sha256:
        policyDecision.policy_sha256,
      entropy_sha256: entropySha256,
      challenge_sha256: issue.transition_challenge_sha256,
      challenge_id: issue.transition_challenge_id,
      challenge_issued_at_ms: issue.transition_issued_at_ms,
      challenge_expires_at_ms: issue.transition_expires_at_ms,
      request_id: built.request_id,
      response_sha256: responseSha256,
      response_observed_at_ms: responseObservedAtMs,
      observed_client_address: network.client_address,
      observed_remote_address: network.remote_address,
      issue_generation: issue.generation,
      consume_generation: consume.generation,
      consume_journal_sha256: consume.journal_sha256,
      consume_high_water_sha256: consume.high_water_sha256,
      local_csprng_entropy_generated: true,
      strict_host_key_policy_enforced: true,
      pinned_client_key_policy_enforced: true,
      ssh_process_exit_zero_observed: true,
      live_execution_performed: liveExecution,
      live_remote_read_performed: liveExecution,
      live_evidence_origin_proven: liveExecution,
      external_transport_authenticated: liveExecution,
      external_witness_storage_proven: false,
      live_sshd_connection_context_proven: false,
      trusted_verification_clock_proven: false,
      challenge_unpredictability_proven: false,
      response_replay_resistance_proven: false,
      live_durable_storage_proven: false,
      rollback_resistance_proven: false,
      protected_high_water_custody_proven: false,
      independent_custody_proven: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
    });
    const receiptSha256 = sha256Id(
      Buffer.from(canonicalJson(body), "utf8"),
    );
    return Object.freeze({
      ok: true,
      status: liveExecution
        ? "live_replay_read_executed"
        : "test_replay_read_executed",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_V1,
      version: 1,
      receipt: Object.freeze({
        ...body,
        receipt_sha256: receiptSha256,
        receipt_id:
          "voidwlrex1_" +
          receiptSha256.slice("sha256:".length),
      }),
      issue_persisted: true,
      consume_persisted: true,
      abandonment_persisted: false,
      ssh_execution_performed: liveExecution,
      live_remote_read_performed: liveExecution,
      live_evidence_origin_proven: liveExecution,
      external_transport_authenticated: liveExecution,
      external_witness_storage_proven: false,
      rollback_resistance_proven: false,
      protected_high_water_custody_proven: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXECUTOR_AUTHORITY_V1,
    });
  } catch (error) {
    if (
      config &&
      issue &&
      issue.ok === true &&
      state.issue_persisted &&
      !state.consume_persisted
    ) {
      try {
        const terminalAtMs = Math.max(
          Number(io.nowMs()),
          Number(issue.transition_issued_at_ms),
        );
        const abandoned =
          (injected?.persistTerminal ||
            persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1)(
            {
              journal_root: config.replay_journal_root,
              high_water_root: config.replay_high_water_root,
              outcome: "abandoned",
              terminal_at_ms: terminalAtMs,
            },
          );
        state.abandonment_persisted =
          Boolean(
            abandoned &&
            abandoned.ok === true &&
            abandoned.status === "persisted_abandoned",
          );
      } catch (abandonError) {
        return held(
          String(
            error instanceof Error
              ? error.message
              : error || "executor_failed",
          ) +
            "|abandonment_failed:" +
            String(
              abandonError instanceof Error
                ? abandonError.message
                : abandonError || "unknown",
            ),
          state,
        );
      }
    }
    return held(
      error instanceof Error
        ? error.message
        : String(error || "witness_live_read_replay_executor_failed"),
      state,
    );
  }
}

function main() {
  const raw =
    process.env.VOID_BUY_VOID_WITNESS_LIVE_READ_REPLAY_EXECUTOR_CONFIG_JSON;
  if (!raw) {
    fail("witness_live_read_replay_executor_config_env_required");
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    fail("witness_live_read_replay_executor_config_json_invalid");
  }
  const result =
    executeBuyVoidAllocationCustodyWitnessLiveReadReplayExecutorV1(config);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exitCode = 2;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
