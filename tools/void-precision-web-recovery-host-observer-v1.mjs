#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1,
  prepareVoidPrecisionWebRecoveryPlanV1,
  verifyVoidPrecisionWebRecoveryEvidenceV1,
} from "./void-precision-web-recovery-evidence-v1.mjs";

export const MARKER = "VOID_PRECISION_WEB_RECOVERY_HOST_OBSERVER_V1";
export const OBSERVATION_MARKER =
  "VOID_PRECISION_WEB_RECOVERY_HOST_OBSERVATION_V1";
export const DEFAULT_EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810";

const SYSTEMCTL = "/usr/bin/systemctl";
const SS = "/usr/bin/ss";
const TAILSCALE = "/usr/bin/tailscale";
const MAX_COMMAND_BYTES = 2 * 1024 * 1024;
const MAX_HTTP_BYTES = 256 * 1024;
const HTTP_TIMEOUT_MS = 5_000;
export const OBSERVATION_MAX_AGE_MS = 5 * 60_000;
export const OBSERVATION_MAX_FUTURE_SKEW_MS = 5_000;
const RECEIPT_ID_RE = /^voidpwre1_[0-9a-f]{64}$/u;
const OBSERVATION_ID_RE = /^voidpwro1_[0-9a-f]{64}$/u;
const UNIT_RE = /^[A-Za-z0-9_.@:-]+\.service$/u;

const DEFAULT_UNITS = Object.freeze({
  adapter: "void-public-seed-adapter.service",
  composition: "void-public-app-composition-gateway-v1.service",
  frontdoor: "void-public-frontdoor-v1.service",
  node: "void-node-live.service",
});

const SERVICE_SPECS = Object.freeze({
  adapter: Object.freeze({
    port: 8080,
    planSource: "ops/public/public-seed-adapter-v1.mjs",
  }),
  composition: Object.freeze({
    port: 8082,
    planSource: "ops/public/void-public-app-composition-gateway-v1.mjs",
  }),
  frontdoor: Object.freeze({
    port: 8083,
    planSource: "ops/public/void-public-frontdoor-v1.mjs",
  }),
});

const SYSTEMD_PROPERTIES = Object.freeze([
  "ActiveState",
  "SubState",
  "MainPID",
  "NoNewPrivileges",
  "RestrictSUIDSGID",
  "LockPersonality",
  "PrivateTmp",
  "ProtectHome",
  "ProtectSystem",
]);

const EXPECTED_HARDENING = Object.freeze({
  no_new_privileges: true,
  restrict_suid_sgid: true,
  lock_personality: true,
  private_tmp: false,
  protect_home: false,
  protect_system: false,
});

export class PrecisionWebRecoveryHostObserverError extends Error {
  constructor(message) {
    super(message);
    this.name = "PrecisionWebRecoveryHostObserverError";
  }
}

function fail(message) {
  throw new PrecisionWebRecoveryHostObserverError(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isPlainObject(value)) fail(label + " must be an object");
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(label + " must be a non-empty string");
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") fail(label + " must be boolean");
  return value;
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail(label + " must be a positive safe integer");
  }
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function contentId(prefix, value) {
  return prefix + sha256Bytes(Buffer.from(canonicalJson(value), "utf8"));
}

function canonicalUtcSecond(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/u, "Z");
}

function requireUnitName(value, label) {
  requireString(value, label);
  if (!UNIT_RE.test(value)) fail(label + " must be a systemd service unit");
  return value;
}

function commandIdentity(executable) {
  let resolved;
  let stat;
  try {
    resolved = fs.realpathSync(executable);
    stat = fs.statSync(resolved, { bigint: true });
  } catch {
    fail("observer_command_unavailable:" + executable);
  }
  if (!stat.isFile() || (Number(stat.mode) & 0o111) === 0) {
    fail("observer_command_not_executable:" + executable);
  }
  return Object.freeze({
    path: resolved,
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: String(stat.size),
    mtime_ns: String(stat.mtimeNs),
  });
}

function sameCommandIdentity(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function commandEnv() {
  return {
    ...process.env,
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    SYSTEMD_PAGER: "cat",
    PAGER: "cat",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function runReadOnly(executable, args, code) {
  const before = commandIdentity(executable);
  const result = spawnSync(
    before.path,
    args,
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: MAX_COMMAND_BYTES,
      timeout: 10_000,
      env: commandEnv(),
    },
  );
  if (result.error || result.status !== 0) {
    fail(code);
  }
  const after = commandIdentity(executable);
  if (!sameCommandIdentity(before, after)) {
    fail("observer_command_changed_during_read:" + executable);
  }
  return String(result.stdout);
}

export function parseSystemctlShowV1(raw) {
  if (typeof raw !== "string") fail("systemctl output must be text");
  const values = {};
  for (const line of raw.split(/\r?\n/u)) {
    if (!line) continue;
    const index = line.indexOf("=");
    if (index < 1) fail("systemctl show row is malformed");
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (Object.hasOwn(values, key)) {
      fail("duplicate systemctl property:" + key);
    }
    values[key] = value;
  }
  return values;
}

function yesNo(value, label) {
  if (value === "yes") return true;
  if (value === "no") return false;
  fail(label + " must be yes or no");
}

function disabledSystemdProtection(value, label) {
  if (value === "no") return false;
  fail(label + " must equal no");
}

export function serviceSnapshotFromSystemctlV1(unit, raw) {
  requireUnitName(unit, "unit");
  const value = parseSystemctlShowV1(raw);
  for (const key of SYSTEMD_PROPERTIES) {
    if (!Object.hasOwn(value, key)) {
      fail("systemctl property missing:" + key);
    }
  }
  if (value.ActiveState !== "active" || value.SubState !== "running") {
    fail("service_not_active_running:" + unit);
  }
  if (!/^[1-9][0-9]*$/u.test(value.MainPID)) {
    fail("service_main_pid_invalid:" + unit);
  }
  const mainPid = Number(value.MainPID);
  if (!Number.isSafeInteger(mainPid) || mainPid < 1) {
    fail("service_main_pid_unsafe:" + unit);
  }
  return Object.freeze({
    unit,
    active_state: value.ActiveState,
    sub_state: value.SubState,
    main_pid: mainPid,
    hardening: Object.freeze({
      no_new_privileges: yesNo(value.NoNewPrivileges, "NoNewPrivileges"),
      restrict_suid_sgid: yesNo(value.RestrictSUIDSGID, "RestrictSUIDSGID"),
      lock_personality: yesNo(value.LockPersonality, "LockPersonality"),
      private_tmp: yesNo(value.PrivateTmp, "PrivateTmp"),
      protect_home: disabledSystemdProtection(value.ProtectHome, "ProtectHome"),
      protect_system: disabledSystemdProtection(
        value.ProtectSystem,
        "ProtectSystem",
      ),
    }),
  });
}

function readServiceSnapshot(unit) {
  const args = [
    "--user",
    "show",
    unit,
    "--no-pager",
    ...SYSTEMD_PROPERTIES.map((property) => "--property=" + property),
  ];
  return serviceSnapshotFromSystemctlV1(
    unit,
    runReadOnly(SYSTEMCTL, args, "systemctl_show_failed:" + unit),
  );
}

function readNodeInvocationId(unit) {
  requireUnitName(unit, "node unit");
  const raw = runReadOnly(
    SYSTEMCTL,
    ["--user", "show", unit, "--no-pager", "--property=InvocationID"],
    "node_invocation_read_failed",
  );
  const value = parseSystemctlShowV1(raw);
  if (
    typeof value.InvocationID !== "string" ||
    !/^[0-9a-f]{32}$/u.test(value.InvocationID)
  ) {
    fail("node_invocation_id_invalid");
  }
  return value.InvocationID;
}

export function parseSsListenersV1(raw) {
  if (typeof raw !== "string") fail("ss output must be text");
  const rows = [];
  for (const rawLine of raw.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match =
      /^LISTEN\s+\S+\s+\S+\s+(\S+)\s+(\S+)(?:\s+(.*))?$/u.exec(line);
    if (!match) fail("ss listener row is malformed");
    rows.push({
      local: match[1],
      peer: match[2],
      process: match[3] || "",
    });
  }
  return rows;
}

export function requireExactLoopbackListenerV1(rows, port, pid) {
  if (!Array.isArray(rows)) fail("listener rows must be an array");
  requirePositiveInteger(port, "port");
  requirePositiveInteger(pid, "pid");
  const suffix = ":" + port;
  const candidates = rows.filter((row) =>
    typeof row?.local === "string" && row.local.endsWith(suffix),
  );
  if (candidates.length !== 1) {
    fail("listener_count_invalid:" + port);
  }
  const row = candidates[0];
  if (row.local !== "127.0.0.1:" + port) {
    fail("listener_not_ipv4_loopback:" + port);
  }
  const pidPattern = new RegExp("(^|[^0-9])pid=" + pid + "([^0-9]|$)", "u");
  if (!pidPattern.test(String(row.process || ""))) {
    fail("listener_pid_mismatch:" + port);
  }
  return Object.freeze({
    address: row.local,
    pid,
  });
}

function readProcCmdline(pid) {
  try {
    return fs.readFileSync("/proc/" + pid + "/cmdline");
  } catch {
    fail("process_cmdline_unavailable:" + pid);
  }
}

function readProcCwd(pid) {
  try {
    return fs.realpathSync("/proc/" + pid + "/cwd");
  } catch {
    fail("process_cwd_unavailable:" + pid);
  }
}

function candidateFilePath(arg, cwd) {
  if (typeof arg !== "string" || arg.length === 0) return null;
  if (arg.startsWith("-")) return null;
  const candidate = path.isAbsolute(arg) ? arg : path.resolve(cwd, arg);
  try {
    const resolved = fs.realpathSync(candidate);
    if (!fs.statSync(resolved).isFile()) return null;
    return resolved;
  } catch {
    return null;
  }
}

export function findProcessSourceByDigestV1({
  pid,
  expectedSha256,
  cmdlineBytes = null,
  cwd = null,
  readBytes = (filePath) => fs.readFileSync(filePath),
} = {}) {
  requirePositiveInteger(pid, "pid");
  if (
    typeof expectedSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(expectedSha256)
  ) {
    fail("expected source SHA-256 is invalid");
  }
  const cmdline = Buffer.isBuffer(cmdlineBytes)
    ? cmdlineBytes
    : readProcCmdline(pid);
  const processCwd = cwd === null ? readProcCwd(pid) : cwd;
  const args = cmdline
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const matches = [];
  for (const arg of args) {
    const resolved = candidateFilePath(arg, processCwd);
    if (!resolved) continue;
    let bytes;
    try {
      bytes = readBytes(resolved);
    } catch {
      continue;
    }
    if (sha256Bytes(bytes) === expectedSha256) {
      matches.push(resolved);
    }
  }
  const unique = [...new Set(matches)];
  if (unique.length !== 1) {
    fail("process_source_digest_match_count_invalid:" + pid);
  }
  return Object.freeze({
    path: unique[0],
    sha256: expectedSha256,
  });
}

function readJsonBounded(urlString) {
  const url = new URL(urlString);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port
  ) {
    fail("observer_http_target_must_be_explicit_loopback");
  }

  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let request;
    const chunks = [];
    let bytes = 0;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error) rejectPromise(error);
      else resolvePromise(value);
    };
    const deadline = setTimeout(() => {
      request?.destroy();
      finish(new PrecisionWebRecoveryHostObserverError(
        "observer_http_deadline_exceeded",
      ));
    }, HTTP_TIMEOUT_MS);

    request = http.request({
      hostname: "127.0.0.1",
      port: Number(url.port),
      path: url.pathname,
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "void-precision-web-recovery-host-observer-v1",
      },
    }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        finish(new PrecisionWebRecoveryHostObserverError(
          "observer_http_status_invalid:" + response.statusCode,
        ));
        return;
      }
      const declared = response.headers["content-length"];
      if (
        typeof declared === "string" &&
        /^(?:0|[1-9][0-9]*)$/u.test(declared) &&
        Number(declared) > MAX_HTTP_BYTES
      ) {
        response.destroy();
        finish(new PrecisionWebRecoveryHostObserverError(
          "observer_http_declared_too_large",
        ));
        return;
      }
      response.on("data", (chunk) => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > MAX_HTTP_BYTES) {
          response.destroy();
          finish(new PrecisionWebRecoveryHostObserverError(
            "observer_http_body_too_large",
          ));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          if (!isPlainObject(parsed)) {
            throw new Error("not object");
          }
          finish(null, parsed);
        } catch {
          finish(new PrecisionWebRecoveryHostObserverError(
            "observer_http_json_invalid",
          ));
        }
      });
      response.on("error", (error) => finish(error));
    });
    request.on("error", (error) => finish(error));
    request.end();
  });
}

function tailscaleStatus(command) {
  const raw = runReadOnly(
    TAILSCALE,
    [command, "status", "--json"],
    "tailscale_" + command + "_status_failed",
  );
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("tailscale_" + command + "_status_json_invalid");
  }
  return sha256Bytes(Buffer.from(canonicalJson(parsed), "utf8"));
}

function requireHardeningObserved(actual, label) {
  requireObject(actual, label);
  for (const [key, expected] of Object.entries(EXPECTED_HARDENING)) {
    if (actual[key] !== expected) {
      fail("service_hardening_mismatch:" + label + ":" + key);
    }
  }
}

function makeRecoveryEvidence(plan, collected) {
  const hashes = plan.source_file_sha256;
  const body = {
    marker: VOID_PRECISION_WEB_RECOVERY_EVIDENCE_V1,
    version: 1,
    status: "PRECISION_WEB_RECOVERY_LOCALLY_VERIFIED_ROUTING_UNCHANGED",
    plan_id: plan.plan_id,
    source_head_sha: plan.source_head_sha,
    source_tree_sha: plan.source_tree_sha,
    host_role: "precision_public_origin",
    adapter: {
      active: true,
      listener: "127.0.0.1:8080",
      marker: "void_public_seed_adapter",
      source_file_sha256:
        hashes["ops/public/public-seed-adapter-v1.mjs"],
    },
    composition: {
      active: true,
      listener: "127.0.0.1:8082",
      marker: "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
      runtime_truth_marker: "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
      strict_ready: true,
      network_name: "Mainnet-0",
      node_label: "Precision public seed",
      source_file_sha256:
        hashes["ops/public/void-public-app-composition-gateway-v1.mjs"],
    },
    frontdoor: {
      active: true,
      listener: "127.0.0.1:8083",
      marker: "VOID_PUBLIC_FRONTDOOR_V1",
      ready: true,
      upstream_strict_ready: true,
      upstream_marker: "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
      upstream_runtime_truth_marker:
        "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
      source_file_sha256:
        hashes["ops/public/void-public-frontdoor-v1.mjs"],
    },
    service_hardening: {
      adapter: { ...EXPECTED_HARDENING },
      composition: { ...EXPECTED_HARDENING },
      frontdoor: { ...EXPECTED_HARDENING },
    },
    node_service_restart_performed: false,
    tailscale_routing_mutated: false,
    dns_mutated: false,
    funnel_mutated: false,
    wallet_or_signer_accessed: false,
    transaction_performed: false,
    funds_moved: false,
    observed_at_utc: collected.observed_at_utc,
  };
  return Object.freeze({
    ...body,
    evidence_id: contentId("voidpwre1_", body),
  });
}

export function evaluateCollectedPrecisionWebObservationV1({
  plan,
  collected,
  expectedHostname = DEFAULT_EXPECTED_HOSTNAME,
  trustedNowMs = Date.now(),
} = {}) {
  requireObject(plan, "plan");
  requireObject(collected, "collected");
  requireString(expectedHostname, "expected hostname");
  if (collected.marker !== OBSERVATION_MARKER || collected.version !== 1) {
    fail("collected_observation_identity_invalid");
  }
  if (collected.hostname !== expectedHostname) {
    fail("precision_hostname_mismatch");
  }
  if (
    collected.node_invocation_id_before !==
      collected.node_invocation_id_after
  ) {
    fail("node_invocation_changed_during_observation");
  }
  if (
    collected.tailscale_serve_sha256_before !==
      collected.tailscale_serve_sha256_after
  ) {
    fail("tailscale_serve_changed_during_observation");
  }
  if (
    collected.tailscale_funnel_sha256_before !==
      collected.tailscale_funnel_sha256_after
  ) {
    fail("tailscale_funnel_changed_during_observation");
  }

  const serviceNames = ["adapter", "composition", "frontdoor"];
  for (const name of serviceNames) {
    const observed = requireObject(
      collected.services?.[name],
      "collected.services." + name,
    );
    const spec = SERVICE_SPECS[name];
    if (
      observed.active_state !== "active" ||
      observed.sub_state !== "running"
    ) {
      fail("service_not_active_running:" + name);
    }
    requirePositiveInteger(observed.main_pid, name + " main pid");
    if (
      observed.listener?.address !== "127.0.0.1:" + spec.port ||
      observed.listener?.pid !== observed.main_pid
    ) {
      fail("service_listener_mismatch:" + name);
    }
    const expectedDigest = plan.source_file_sha256?.[spec.planSource];
    if (
      typeof expectedDigest !== "string" ||
      observed.process_source_sha256 !== expectedDigest
    ) {
      fail("service_process_source_mismatch:" + name);
    }
    requireHardeningObserved(observed.hardening, name);
  }

  const adapterJson = requireObject(
    collected.http?.adapter_manifest,
    "adapter manifest",
  );
  if (
    adapterJson.adapter !== "void_public_seed_adapter" ||
    adapterJson.version !== 1 ||
    adapterJson.upstream_private !== true ||
    adapterJson.private_rpc_public !== false
  ) {
    fail("adapter_http_identity_mismatch");
  }

  const compositionJson = requireObject(
    collected.http?.composition_status,
    "composition status",
  );
  if (
    compositionJson.ok !== true ||
    compositionJson.marker !== "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1" ||
    compositionJson.runtime_truth_marker !==
      "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1" ||
    compositionJson.strict_ready !== true ||
    compositionJson.ready !== true ||
    compositionJson.network_name !== "Mainnet-0" ||
    compositionJson.node?.label !== "Precision public seed" ||
    compositionJson.node?.role !== "public-seed" ||
    compositionJson.node?.public !== true
  ) {
    fail("composition_http_identity_or_readiness_mismatch");
  }

  const frontdoorJson = requireObject(
    collected.http?.frontdoor_status,
    "frontdoor status",
  );
  if (
    frontdoorJson.marker !== "VOID_PUBLIC_FRONTDOOR_V1" ||
    frontdoorJson.ready !== true ||
    frontdoorJson.upstream_strict_ready !== true ||
    frontdoorJson.upstream_marker !==
      "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1" ||
    frontdoorJson.upstream_runtime_truth_marker !==
      "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1"
  ) {
    fail("frontdoor_http_identity_or_readiness_mismatch");
  }

  if (
    typeof collected.observed_at_utc !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(
      collected.observed_at_utc,
    )
  ) {
    fail("observation_timestamp_invalid");
  }
  if (!Number.isSafeInteger(trustedNowMs) || trustedNowMs < 0) {
    fail("trusted_observer_time_invalid");
  }
  const observedAtMs = Date.parse(collected.observed_at_utc);
  if (
    !Number.isFinite(observedAtMs) ||
    new Date(observedAtMs).toISOString().replace(".000Z", "Z") !==
      collected.observed_at_utc
  ) {
    fail("observation_timestamp_invalid");
  }
  const observationAgeMs = trustedNowMs - observedAtMs;
  if (observationAgeMs < -OBSERVATION_MAX_FUTURE_SKEW_MS) {
    fail("observation_timestamp_too_far_in_future");
  }
  if (observationAgeMs > OBSERVATION_MAX_AGE_MS) {
    fail("observation_timestamp_stale");
  }

  const evidence = makeRecoveryEvidence(plan, collected);
  if (!RECEIPT_ID_RE.test(evidence.evidence_id)) {
    fail("recovery_evidence_id_invalid");
  }
  const verification = verifyVoidPrecisionWebRecoveryEvidenceV1({
    plan,
    evidence,
  });
  if (
    verification.ok !== true ||
    verification.observation_claims_consistent !== true
  ) {
    fail("recovery_evidence_verification_failed");
  }

  const material = {
    marker: MARKER,
    version: 1,
    status: "PRECISION_WEB_RECOVERY_HOST_OBSERVATION_ACCEPTED",
    hostname: collected.hostname,
    plan_id: plan.plan_id,
    recovery_evidence_id: evidence.evidence_id,
    recovery_evidence: evidence,
    source_verifier_status: verification.status,
    live_host_observation_performed: true,
    services_active_and_exact: true,
    loopback_listeners_exact: true,
    running_source_bytes_bound: true,
    precision_hardening_profile_observed: true,
    composition_strict_ready_observed: true,
    frontdoor_strict_ready_observed: true,
    node_invocation_stable_during_observation: true,
    tailscale_serve_stable_during_observation: true,
    tailscale_funnel_stable_during_observation: true,
    observer_read_only: true,
    negative_action_scope: "observer_process_only",
    historical_mutation_absence_not_inferred: true,
    independent_host_acceptance: true,
    ingress_activation_authorized: false,
    service_mutation_authorized: false,
    routing_mutation_authorized: false,
    dns_mutation_authorized: false,
    tailscale_mutation_authorized: false,
    node_restart_authorized: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_performed: false,
    validator_mutation: false,
    work_credit_mutation: false,
    funds_moved: false,
  };
  return Object.freeze({
    ...material,
    observation_id: contentId("voidpwro1_", material),
  });
}

function readAllServiceSnapshots(units) {
  return {
    adapter: readServiceSnapshot(units.adapter),
    composition: readServiceSnapshot(units.composition),
    frontdoor: readServiceSnapshot(units.frontdoor),
  };
}

export async function collectPrecisionWebRecoveryObservationV1({
  expectedHostname = DEFAULT_EXPECTED_HOSTNAME,
  units = DEFAULT_UNITS,
} = {}) {
  const hostname = os.hostname();
  if (hostname !== expectedHostname) fail("precision_hostname_mismatch");
  const plan = prepareVoidPrecisionWebRecoveryPlanV1();

  const nodeInvocationBefore = readNodeInvocationId(units.node);
  const serveBefore = tailscaleStatus("serve");
  const funnelBefore = tailscaleStatus("funnel");

  const services = readAllServiceSnapshots(units);
  const listeners = parseSsListenersV1(
    runReadOnly(SS, ["-H", "-ltnp"], "ss_listener_read_failed"),
  );

  const observedServices = {};
  for (const name of ["adapter", "composition", "frontdoor"]) {
    const service = services[name];
    const spec = SERVICE_SPECS[name];
    const listener = requireExactLoopbackListenerV1(
      listeners,
      spec.port,
      service.main_pid,
    );
    const expectedDigest = plan.source_file_sha256[spec.planSource];
    const source = findProcessSourceByDigestV1({
      pid: service.main_pid,
      expectedSha256: expectedDigest,
    });
    observedServices[name] = {
      ...service,
      listener,
      process_source_path: source.path,
      process_source_sha256: source.sha256,
    };
  }

  const httpEvidence = {
    adapter_manifest: await readJsonBounded(
      "http://127.0.0.1:8080/__void/adapter.json",
    ),
    composition_status: await readJsonBounded(
      "http://127.0.0.1:8082/__void/public-app/network.json",
    ),
    frontdoor_status: await readJsonBounded(
      "http://127.0.0.1:8083/__void/frontdoor/status.json",
    ),
  };

  const nodeInvocationAfter = readNodeInvocationId(units.node);
  const serveAfter = tailscaleStatus("serve");
  const funnelAfter = tailscaleStatus("funnel");

  const collected = Object.freeze({
    marker: OBSERVATION_MARKER,
    version: 1,
    hostname,
    units: { ...units },
    services: observedServices,
    http: httpEvidence,
    node_invocation_id_before: nodeInvocationBefore,
    node_invocation_id_after: nodeInvocationAfter,
    tailscale_serve_sha256_before: serveBefore,
    tailscale_serve_sha256_after: serveAfter,
    tailscale_funnel_sha256_before: funnelBefore,
    tailscale_funnel_sha256_after: funnelAfter,
    observed_at_utc: canonicalUtcSecond(),
  });

  return evaluateCollectedPrecisionWebObservationV1({
    plan,
    collected,
    expectedHostname,
  });
}

function parseArgs(argv) {
  const args = {
    expectedHostname: DEFAULT_EXPECTED_HOSTNAME,
    units: { ...DEFAULT_UNITS },
    outputPath: null,
    pretty: false,
  };
  const remaining = [...argv];
  while (remaining.length > 0) {
    const flag = remaining.shift();
    if (flag === "--pretty") {
      args.pretty = true;
      continue;
    }
    const value = remaining.shift();
    if (!value || value.startsWith("--")) fail("missing value for " + flag);
    if (flag === "--expected-hostname") args.expectedHostname = value;
    else if (flag === "--adapter-unit") args.units.adapter = value;
    else if (flag === "--composition-unit") args.units.composition = value;
    else if (flag === "--frontdoor-unit") args.units.frontdoor = value;
    else if (flag === "--node-unit") args.units.node = value;
    else if (flag === "--output") args.outputPath = value;
    else fail("unknown argument:" + flag);
  }
  for (const [name, unit] of Object.entries(args.units)) {
    requireUnitName(unit, name + " unit");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await collectPrecisionWebRecoveryObservationV1({
    expectedHostname: args.expectedHostname,
    units: args.units,
  });
  const output = JSON.stringify(result, null, args.pretty ? 2 : 0) + "\n";
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(MARKER + "=HOLD\n" + message + "\n");
    process.exitCode = 2;
  });
}
