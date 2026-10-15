#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1 =
  "VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1";

export const VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_SOURCE_BLOBS_V1 =
  Object.freeze({
    "ops/public/void-public-app-composition-gateway-v1.mjs":
      "b086b612fe5ee1dc1d5bcc4838d926af890d1435",
    "ops/public/void-public-participant-session-http-v1.mjs":
      "43106ae5ba4af7cd82ec66bc4729d0f6767211cf",
    "ops/public/void-public-participant-account-read-http-edge-v1.mjs":
      "583d2e61115916589e30239d1bf5451a525f2996",
    "ops/public/void-public-participant-session-state-file-v1.mjs":
      "260b1ced7eebe2385a514c66edeebff287be54e7",
    "ops/public/void-public-participant-live-role-authority-v1.mjs":
      "5d39171d7c4145c6200225d18f37b401a8b7e022",
    "tools/void-public-participant-production-composition-current-gateway-v2.mjs":
      "4d43d1d35eb955af245b514c4f70a9084955b498",
  });

export const VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_AUTHORITY_V1 =
  Object.freeze({
    read_only: true,
    loopback_get_only: true,
    process_environment_access: false,
    final_process_listener_bracket_required: true,
    session_or_challenge_mutation: false,
    bearer_token_access: false,
    account_data_access: false,
    wallet_or_signer_access: false,
    work_credit_mutation: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_mutation: false,
    service_action: false,
    systemd_mutation: false,
    tailscale_or_dns_mutation: false,
    filesystem_write: false,
    production_session_issuance_authorized: false,
    runtime_activation_authorized: false,
    funds_movement: false,
  });

const EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810";
const HOST = "127.0.0.1";
const PORT = 8082;
const SS = "/usr/bin/ss";
const MAX_COMMAND_BYTES = 2 * 1024 * 1024;
const MAX_PROC_BYTES = 128 * 1024;
const MAX_GATEWAY_BYTES = 8 * 1024 * 1024;
const MAX_HTTP_BYTES = 128 * 1024;
const HTTP_TIMEOUT_MS = 3000;
const GATEWAY_SUFFIX =
  "/ops/public/void-public-app-composition-gateway-v1.mjs";
const GATEWAY_BLOB =
  VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_SOURCE_BLOBS_V1[
    "ops/public/void-public-app-composition-gateway-v1.mjs"
  ];

const COMPOSITION_STATUS_PATH = "/__void/public-app/status.json";
const SESSION_STATUS_PATH = "/__void/participant/session/v1/status.json";
const ACCOUNT_STATUS_PATH = "/__void/participant/account-read/v1/status.json";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function gitBlobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "ascii"))
    .update(bytes)
    .digest("hex");
}

function boundedFile(file, maximum) {
  const data = fs.readFileSync(file);
  if (data.length > maximum) throw new Error("bounded_file_too_large");
  return data;
}

function commandIdentity(file) {
  const resolved = fs.realpathSync(file);
  const stat = fs.statSync(resolved, { bigint: true });
  if (!stat.isFile() || Number(stat.mode & 0o111n) === 0) {
    throw new Error("command_identity_invalid");
  }
  return Object.freeze({
    resolved,
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    size: stat.size.toString(),
    mtime_ns: stat.mtimeNs.toString(),
  });
}

function sameIdentity(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function safeCommandEnv() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    NO_COLOR: "1",
  };
}

export function parseListenerRows(raw) {
  if (typeof raw !== "string") return [];
  return raw.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/u);
      if (parts.length < 5 || parts[0] !== "LISTEN") return null;
      return {
        local: parts[3],
        process: parts.slice(5).join(" "),
      };
    }).filter(Boolean);
}

function listenerSnapshot() {
  try {
    const before = commandIdentity(SS);
    const result = spawnSync(before.resolved, ["-H", "-ltnp"], {
      encoding: "utf8",
      env: safeCommandEnv(),
      timeout: 10000,
      maxBuffer: MAX_COMMAND_BYTES,
    });
    const after = commandIdentity(SS);
    if (!sameIdentity(before, after) || result.status !== 0) {
      return Object.freeze({
        observed: false,
        candidate_count: 0,
        exact_loopback_listener: false,
        pid: null,
      });
    }
    const rows = parseListenerRows(result.stdout || "");
    const candidates = rows.filter((row) =>
      String(row.local || "").endsWith(":" + PORT)
    );
    const exact = candidates.filter((row) => row.local === HOST + ":" + PORT);
    const pids = [];
    for (const row of candidates) {
      const matches = String(row.process || "").matchAll(/pid=([0-9]+)/gu);
      for (const match of matches) pids.push(Number(match[1]));
    }
    const uniquePids = [...new Set(pids.filter((pid) =>
      Number.isSafeInteger(pid) && pid > 0
    ))];
    return Object.freeze({
      observed: true,
      candidate_count: candidates.length,
      exact_loopback_listener:
        candidates.length === 1 && exact.length === 1,
      pid:
        candidates.length === 1 && exact.length === 1 &&
        uniquePids.length === 1
          ? uniquePids[0]
          : null,
    });
  } catch {
    return Object.freeze({
      observed: false,
      candidate_count: 0,
      exact_loopback_listener: false,
      pid: null,
    });
  }
}

function procStartTicks(pid) {
  const raw = boundedFile("/proc/" + pid + "/stat", 64 * 1024)
    .toString("utf8");
  const closing = raw.lastIndexOf(")");
  if (closing < 2) throw new Error("proc_stat_invalid");
  const tail = raw.slice(closing + 2).trim().split(/\s+/u);
  if (tail.length < 20 || !/^[1-9][0-9]*$/u.test(tail[19])) {
    throw new Error("proc_start_ticks_invalid");
  }
  return tail[19];
}

function processSnapshot(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return Object.freeze({
      observed: false,
      pid: null,
      start_ticks: null,
      node_executable_candidate: false,
      gateway_arg_candidate: false,
      visible_gateway_blob_sha1: null,
      visible_gateway_blob_matches_reviewed: false,
    });
  }
  try {
    const startTicks = procStartTicks(pid);
    const rawCmd = boundedFile("/proc/" + pid + "/cmdline", MAX_PROC_BYTES);
    const args = rawCmd.toString("utf8").split("\0").filter(Boolean);
    if (args.length !== 2) throw new Error("process_argv_shape_invalid");
    const cwd = fs.realpathSync("/proc/" + pid + "/cwd");
    const exe = fs.realpathSync("/proc/" + pid + "/exe");
    const expectedNode = fs.realpathSync("/usr/bin/node");
    const candidate = path.isAbsolute(args[1])
      ? path.resolve(args[1])
      : path.resolve(cwd, args[1]);
    const canonical = fs.realpathSync(candidate);
    const gatewayArgCandidate =
      canonical.endsWith(GATEWAY_SUFFIX) &&
      path.basename(canonical) ===
        "void-public-app-composition-gateway-v1.mjs";
    const bytes = boundedFile(canonical, MAX_GATEWAY_BYTES);
    const blob = gitBlobSha1(bytes);
    return Object.freeze({
      observed: true,
      pid,
      start_ticks: startTicks,
      node_executable_candidate: exe === expectedNode,
      gateway_arg_candidate: gatewayArgCandidate,
      visible_gateway_blob_sha1: blob,
      visible_gateway_blob_matches_reviewed: blob === GATEWAY_BLOB,
    });
  } catch {
    return Object.freeze({
      observed: false,
      pid,
      start_ticks: null,
      node_executable_candidate: false,
      gateway_arg_candidate: false,
      visible_gateway_blob_sha1: null,
      visible_gateway_blob_matches_reviewed: false,
    });
  }
}

function sameProcessGeneration(a, b) {
  return Boolean(
    a?.observed === true &&
    b?.observed === true &&
    a.pid === b.pid &&
    a.start_ticks === b.start_ticks &&
    a.node_executable_candidate === true &&
    b.node_executable_candidate === true &&
    a.gateway_arg_candidate === true &&
    b.gateway_arg_candidate === true &&
    a.visible_gateway_blob_matches_reviewed === true &&
    b.visible_gateway_blob_matches_reviewed === true
  );
}

function sameListener(a, b) {
  return Boolean(
    a?.observed === true &&
    b?.observed === true &&
    a.candidate_count === 1 &&
    b.candidate_count === 1 &&
    a.exact_loopback_listener === true &&
    b.exact_loopback_listener === true &&
    Number.isSafeInteger(a.pid) &&
    a.pid === b.pid
  );
}

function selectedHeaders(headers) {
  return Object.freeze({
    content_type: String(headers["content-type"] || "")
      .split(";")[0].trim().toLowerCase(),
    participant_composition:
      String(headers["x-void-public-participant-composition"] || ""),
    marker: String(headers["x-void-marker"] || ""),
  });
}

function readHttpBounded(pathname) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(Object.freeze(value));
    };
    let request;
    const timer = setTimeout(() => {
      request?.destroy();
      finish({
        observed: false,
        status: null,
        headers: Object.freeze({
          content_type: "",
          participant_composition: "",
          marker: "",
        }),
        body: null,
      });
    }, HTTP_TIMEOUT_MS);
    request = http.request({
      hostname: HOST,
      port: PORT,
      path: pathname,
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "void-public-participant-designated-host-census-v1",
        connection: "close",
      },
    }, (response) => {
      const chunks = [];
      let total = 0;
      const declared = Number(response.headers["content-length"] || 0);
      if (
        Number.isFinite(declared) &&
        declared > MAX_HTTP_BYTES
      ) {
        response.destroy();
        clearTimeout(timer);
        finish({
          observed: false,
          status: response.statusCode ?? null,
          headers: selectedHeaders(response.headers),
          body: null,
        });
        return;
      }
      response.on("data", (chunk) => {
        total += chunk.length;
        if (total > MAX_HTTP_BYTES) {
          response.destroy();
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        clearTimeout(timer);
        if (total > MAX_HTTP_BYTES) {
          finish({
            observed: false,
            status: response.statusCode ?? null,
            headers: selectedHeaders(response.headers),
            body: null,
          });
          return;
        }
        let body = null;
        const headers = selectedHeaders(response.headers);
        if (headers.content_type === "application/json" && total > 0) {
          try {
            const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              body = parsed;
            }
          } catch {
            body = null;
          }
        }
        finish({
          observed: true,
          status: response.statusCode ?? null,
          headers,
          body,
        });
      });
      response.on("error", () => {
        clearTimeout(timer);
        finish({
          observed: false,
          status: response.statusCode ?? null,
          headers: selectedHeaders(response.headers),
          body: null,
        });
      });
    });
    request.on("error", () => {
      clearTimeout(timer);
      finish({
        observed: false,
        status: null,
        headers: Object.freeze({
          content_type: "",
          participant_composition: "",
          marker: "",
        }),
        body: null,
      });
    });
    request.end();
  });
}

function compositionStatusQualified(observation) {
  const body = observation?.body;
  return Boolean(
    observation?.observed === true &&
    observation.status === 200 &&
    observation.headers?.content_type === "application/json" &&
    body &&
    body.ok === true &&
    body.marker === "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1" &&
    body.runtime_truth_marker ===
      "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1" &&
    body.mode === "public_safe_composition" &&
    body.host === HOST &&
    body.port === PORT &&
    body.public_upstream_private === true &&
    body.node_upstream_private === true &&
    body.account_views_public === false &&
    body.mutation === false &&
    body.generic_mutation === false &&
    body.money_movement === false
  );
}

function sessionStatusQualified(observation) {
  const body = observation?.body;
  return Boolean(
    observation?.observed === true &&
    observation.status === 200 &&
    observation.headers?.content_type === "application/json" &&
    observation.headers?.participant_composition === "v1" &&
    observation.headers?.marker ===
      "VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1" &&
    body &&
    body.ok === true &&
    body.marker === "VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1" &&
    body.capability === "participant.account.read.v1" &&
    Number.isSafeInteger(body.challenge_ttl_ms) &&
    body.challenge_ttl_ms > 0 &&
    body.challenge_ttl_ms <= 60000 &&
    Number.isSafeInteger(body.session_ttl_ms) &&
    body.session_ttl_ms > 0 &&
    body.login_key_type === "ed25519" &&
    body.role_authority_required === true &&
    body.required_role === "AGENT" &&
    body.durable_state_store === true &&
    body.durable_state_store_required_for_production === true &&
    body.cookie_authentication === false &&
    body.account_enumeration === false &&
    body.wallet_passphrase_transport === false &&
    body.signing_authority === false &&
    body.money_movement_authority === false &&
    body.production_route_mounted === false
  );
}

function accountStatusQualified(observation) {
  const body = observation?.body;
  return Boolean(
    observation?.observed === true &&
    observation.status === 200 &&
    observation.headers?.content_type === "application/json" &&
    observation.headers?.participant_composition === "v1" &&
    observation.headers?.marker ===
      "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1" &&
    body &&
    body.ok === true &&
    body.marker ===
      "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1" &&
    body.capability === "participant.account.read.v1" &&
    body.wallet_path ===
      "/__void/participant/account-read/v1/wallet.json" &&
    body.earn_path ===
      "/__void/participant/account-read/v1/earn.json" &&
    body.cookie_authentication === false &&
    body.raw_route_forwarding === false &&
    body.wallet_mutation_authority === false &&
    body.work_credit_mutation_authority === false &&
    body.money_movement_authority === false &&
    body.listener_created === false &&
    body.production_route_mounted === false
  );
}

function endpointStable(a, b) {
  return Boolean(
    a?.observed === b?.observed &&
    a?.status === b?.status &&
    a?.headers?.content_type === b?.headers?.content_type &&
    a?.headers?.participant_composition ===
      b?.headers?.participant_composition &&
    a?.headers?.marker === b?.headers?.marker &&
    JSON.stringify(a?.body ?? null) === JSON.stringify(b?.body ?? null)
  );
}

export function classifyVoidPublicParticipantDesignatedHostCensusV1(
  observation,
) {
  const hostnameMatches =
    observation?.hostname === EXPECTED_HOSTNAME;
  const listenerStable =
    sameListener(
      observation?.listener_before,
      observation?.listener_after,
    ) &&
    sameListener(
      observation?.listener_after,
      observation?.listener_final,
    );
  const processStable =
    sameProcessGeneration(
      observation?.process_before,
      observation?.process_after,
    ) &&
    sameProcessGeneration(
      observation?.process_after,
      observation?.process_final,
    );
  const samePid =
    observation?.listener_before?.pid ===
      observation?.process_before?.pid &&
    observation?.listener_after?.pid ===
      observation?.process_after?.pid &&
    observation?.listener_final?.pid ===
      observation?.process_final?.pid &&
    observation?.listener_before?.pid ===
      observation?.listener_final?.pid;

  const compositionBefore =
    compositionStatusQualified(observation?.composition_before);
  const compositionAfter =
    compositionStatusQualified(observation?.composition_after);
  const compositionStable =
    compositionBefore &&
    compositionAfter &&
    endpointStable(
      observation?.composition_before,
      observation?.composition_after,
    );

  const sessionBefore =
    sessionStatusQualified(observation?.session_before);
  const sessionAfter =
    sessionStatusQualified(observation?.session_after);
  const accountBefore =
    accountStatusQualified(observation?.account_before);
  const accountAfter =
    accountStatusQualified(observation?.account_after);

  const participantEndpointStable =
    endpointStable(observation?.session_before, observation?.session_after) &&
    endpointStable(observation?.account_before, observation?.account_after);
  const partialSurface =
    sessionBefore !== accountBefore ||
    sessionAfter !== accountAfter;
  const participantActive =
    sessionBefore &&
    sessionAfter &&
    accountBefore &&
    accountAfter &&
    participantEndpointStable;

  const runtimeCandidate =
    hostnameMatches &&
    listenerStable &&
    processStable &&
    samePid &&
    compositionStable;

  let status = "HOST_RUNTIME_HOLD";
  let nextAction =
    "repair_or_start_reviewed_composition_runtime_then_rerun";
  if (runtimeCandidate && partialSurface) {
    status = "PARTICIPANT_SURFACE_PARTIAL_HOLD";
    nextAction = "repair_partial_participant_surface_then_rerun";
  } else if (runtimeCandidate && participantActive) {
    status =
      "PARTICIPANT_LOOPBACK_SURFACE_OBSERVED_HOST_GATES_REMAIN";
    nextAction =
      "qualify_scalar_config_state_custody_restart_rollback_and_external_acceptance";
  } else if (runtimeCandidate) {
    status =
      "PARTICIPANT_SURFACE_DEFAULT_OFF_OR_UNOBSERVED";
    nextAction =
      "install_or_verify_participant_scalar_configuration_then_rerun";
  }

  return Object.freeze({
    marker: VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1,
    version: 1,
    status,
    hostname_matches_precision: hostnameMatches,
    listener_generation_stable: listenerStable,
    process_generation_stable: processStable,
    listener_process_pid_bound: samePid,
    final_generation_bracket_verified:
      listenerStable && processStable && samePid,
    composition_status_stable_and_qualified: compositionStable,
    running_visible_gateway_blob_matches_reviewed:
      observation?.process_before?.visible_gateway_blob_matches_reviewed ===
        true &&
      observation?.process_after?.visible_gateway_blob_matches_reviewed ===
        true &&
      observation?.process_final?.visible_gateway_blob_matches_reviewed ===
        true,
    running_loaded_source_bytes_proven: false,
    participant_status_endpoints_stable: participantEndpointStable,
    participant_partial_surface_observed: partialSurface,
    participant_loopback_surface_observed: participantActive,
    durable_state_store_status_observed: participantActive,
    role_authority_required_status_observed: participantActive,
    required_role: participantActive ? "AGENT" : null,
    anonymous_account_views_public: false,
    participant_default_off_proven: false,
    systemd_service_binding_verified: false,
    participant_activation_configuration_values_verified: false,
    binding_registry_path_custody_verified: false,
    session_state_path_custody_verified: false,
    live_role_rpc_target_verified: false,
    startup_restart_rollback_verified: false,
    public_external_reachability_verified: false,
    real_agent_login_verified: false,
    production_session_issuance_authorized: false,
    public_session_route_mount_authorized: false,
    runtime_activation_authorized: false,
    service_action: false,
    systemd_mutation: false,
    tailscale_or_dns_mutation: false,
    filesystem_write: false,
    bearer_token_access: false,
    account_data_access: false,
    work_credit_mutation: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
    next_action: nextAction,
    authority:
      VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_AUTHORITY_V1,
  });
}

function syntheticHttp(status, body, {
  participant = "",
  marker = "",
  contentType = "application/json",
} = {}) {
  return Object.freeze({
    observed: true,
    status,
    headers: Object.freeze({
      content_type: contentType,
      participant_composition: participant,
      marker,
    }),
    body,
  });
}

export function selfTestVoidPublicParticipantDesignatedHostCensusV1() {
  const listener = Object.freeze({
    observed: true,
    candidate_count: 1,
    exact_loopback_listener: true,
    pid: 4321,
  });
  const process = Object.freeze({
    observed: true,
    pid: 4321,
    start_ticks: "12345",
    node_executable_candidate: true,
    gateway_arg_candidate: true,
    visible_gateway_blob_sha1: GATEWAY_BLOB,
    visible_gateway_blob_matches_reviewed: true,
  });
  const compositionBody = {
    ok: true,
    marker: "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
    runtime_truth_marker: "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
    mode: "public_safe_composition",
    host: HOST,
    port: PORT,
    public_upstream_private: true,
    node_upstream_private: true,
    account_views_public: false,
    mutation: false,
    generic_mutation: false,
    money_movement: false,
  };
  const sessionBody = {
    ok: true,
    marker: "VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1",
    capability: "participant.account.read.v1",
    challenge_ttl_ms: 60000,
    session_ttl_ms: 3600000,
    login_key_type: "ed25519",
    role_authority_required: true,
    required_role: "AGENT",
    durable_state_store: true,
    durable_state_store_required_for_production: true,
    cookie_authentication: false,
    account_enumeration: false,
    wallet_passphrase_transport: false,
    signing_authority: false,
    money_movement_authority: false,
    production_route_mounted: false,
  };
  const accountBody = {
    ok: true,
    marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1",
    capability: "participant.account.read.v1",
    wallet_path: "/__void/participant/account-read/v1/wallet.json",
    earn_path: "/__void/participant/account-read/v1/earn.json",
    cookie_authentication: false,
    raw_route_forwarding: false,
    wallet_mutation_authority: false,
    work_credit_mutation_authority: false,
    money_movement_authority: false,
    listener_created: false,
    production_route_mounted: false,
  };
  const composition = syntheticHttp(200, compositionBody);
  const session = syntheticHttp(200, sessionBody, {
    participant: "v1",
    marker: "VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1",
  });
  const account = syntheticHttp(200, accountBody, {
    participant: "v1",
    marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1",
  });
  const active = {
    hostname: EXPECTED_HOSTNAME,
    listener_before: listener,
    listener_after: listener,
    listener_final: listener,
    process_before: process,
    process_after: process,
    process_final: process,
    composition_before: composition,
    composition_after: composition,
    session_before: session,
    session_after: session,
    account_before: account,
    account_after: account,
  };
  const accepted =
    classifyVoidPublicParticipantDesignatedHostCensusV1(active);
  if (
    accepted.status !==
      "PARTICIPANT_LOOPBACK_SURFACE_OBSERVED_HOST_GATES_REMAIN" ||
    accepted.participant_loopback_surface_observed !== true ||
    accepted.durable_state_store_status_observed !== true ||
    accepted.final_generation_bracket_verified !== true ||
    accepted.production_session_issuance_authorized !== false
  ) {
    throw new Error("active_self_test_failed");
  }

  const inactiveHttp = syntheticHttp(
    404,
    { ok: false, error: "not_public" },
  );
  const inactive =
    classifyVoidPublicParticipantDesignatedHostCensusV1({
      ...active,
      session_before: inactiveHttp,
      session_after: inactiveHttp,
      account_before: inactiveHttp,
      account_after: inactiveHttp,
    });
  if (
    inactive.status !==
      "PARTICIPANT_SURFACE_DEFAULT_OFF_OR_UNOBSERVED" ||
    inactive.participant_loopback_surface_observed !== false
  ) {
    throw new Error("inactive_self_test_failed");
  }

  const partial =
    classifyVoidPublicParticipantDesignatedHostCensusV1({
      ...active,
      account_before: inactiveHttp,
      account_after: inactiveHttp,
    });
  if (partial.status !== "PARTICIPANT_SURFACE_PARTIAL_HOLD") {
    throw new Error("partial_surface_self_test_failed");
  }

  const movedProcess =
    classifyVoidPublicParticipantDesignatedHostCensusV1({
      ...active,
      process_after: { ...process, start_ticks: "12346" },
    });
  if (movedProcess.status !== "HOST_RUNTIME_HOLD") {
    throw new Error("process_generation_self_test_failed");
  }

  const movedFinalProcess =
    classifyVoidPublicParticipantDesignatedHostCensusV1({
      ...active,
      process_final: { ...process, start_ticks: "12346" },
    });
  if (
    movedFinalProcess.status !== "HOST_RUNTIME_HOLD" ||
    movedFinalProcess.final_generation_bracket_verified !== false
  ) {
    throw new Error("final_process_generation_self_test_failed");
  }

  const movedFinalListener =
    classifyVoidPublicParticipantDesignatedHostCensusV1({
      ...active,
      listener_final: { ...listener, pid: 4322 },
      process_final: { ...process, pid: 4322, start_ticks: "12346" },
    });
  if (
    movedFinalListener.status !== "HOST_RUNTIME_HOLD" ||
    movedFinalListener.final_generation_bracket_verified !== false
  ) {
    throw new Error("final_listener_generation_self_test_failed");
  }

  const wrongBlob =
    classifyVoidPublicParticipantDesignatedHostCensusV1({
      ...active,
      process_after: {
        ...process,
        visible_gateway_blob_matches_reviewed: false,
      },
    });
  if (wrongBlob.status !== "HOST_RUNTIME_HOLD") {
    throw new Error("source_blob_self_test_failed");
  }

  return true;
}

export async function collectVoidPublicParticipantDesignatedHostCensusV1() {
  const hostname = os.hostname();
  const user = os.userInfo();
  if (hostname !== EXPECTED_HOSTNAME) {
    throw new Error("designated_precision_hostname_required");
  }
  if (user.username !== "zoso") {
    throw new Error("ordinary_zoso_observer_required");
  }
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    throw new Error("root_observer_forbidden");
  }

  const listenerBefore = listenerSnapshot();
  const processBefore = processSnapshot(listenerBefore.pid);

  const compositionBefore = await readHttpBounded(COMPOSITION_STATUS_PATH);
  const sessionBefore = await readHttpBounded(SESSION_STATUS_PATH);
  const accountBefore = await readHttpBounded(ACCOUNT_STATUS_PATH);

  const listenerAfter = listenerSnapshot();
  const processAfter = processSnapshot(listenerAfter.pid);

  const compositionAfter = await readHttpBounded(COMPOSITION_STATUS_PATH);
  const sessionAfter = await readHttpBounded(SESSION_STATUS_PATH);
  const accountAfter = await readHttpBounded(ACCOUNT_STATUS_PATH);

  // Final generation snapshot occurs after every accepted second HTTP sample.
  // This closes the observation window over both status sets rather than
  // accepting final HTTP evidence from a post-snapshot replacement process.
  const listenerFinal = listenerSnapshot();
  const processFinal = processSnapshot(listenerFinal.pid);

  return Object.freeze({
    observed_at_utc: new Date().toISOString(),
    ...classifyVoidPublicParticipantDesignatedHostCensusV1({
      hostname,
      listener_before: listenerBefore,
      listener_after: listenerAfter,
      listener_final: listenerFinal,
      process_before: processBefore,
      process_after: processAfter,
      process_final: processFinal,
      composition_before: compositionBefore,
      composition_after: compositionAfter,
      session_before: sessionBefore,
      session_after: sessionAfter,
      account_before: accountBefore,
      account_after: accountAfter,
    }),
  });
}

function printPlan() {
  console.log(VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1);
  for (const [key, value] of Object.entries({
    mode: "--plan",
    read_only: true,
    designated_hostname: EXPECTED_HOSTNAME,
    loopback_get_only: true,
    process_environment_access: false,
    session_or_challenge_mutation: false,
    bearer_token_access: false,
    account_data_access: false,
    filesystem_write: false,
    service_action: false,
    systemd_mutation: false,
    tailscale_or_dns_mutation: false,
    runtime_activation_authorized: false,
    production_session_issuance_authorized: false,
    funds_movement: false,
    next_action: "run_read_only_designated_host_census",
  })) {
    console.log(key + "=" + String(value));
  }
}

const direct = Boolean(
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
);
if (direct) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("HOLD=exactly_one_mode_required");
    process.exitCode = 2;
  } else if (args[0] === "--self-test") {
    selfTestVoidPublicParticipantDesignatedHostCensusV1();
    console.log(
      "VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1_SELF_TEST_GREEN",
    );
  } else if (args[0] === "--plan") {
    printPlan();
  } else if (args[0] === "--run") {
    try {
      const result =
        await collectVoidPublicParticipantDesignatedHostCensusV1();
      console.log(JSON.stringify(result));
    } catch (error) {
      console.log(VOID_PUBLIC_PARTICIPANT_DESIGNATED_HOST_CENSUS_V1);
      console.log("status=HOLD");
      console.log(
        "reason=" +
        String(error instanceof Error ? error.message : error),
      );
      console.log("runtime_activation_authorized=false");
      console.log("production_session_issuance_authorized=false");
      console.log("funds_movement=false");
      process.exitCode = 2;
    }
  } else {
    console.error("HOLD=unknown_mode");
    process.exitCode = 2;
  }
}
