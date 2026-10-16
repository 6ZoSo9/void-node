#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildVoidExternalPaidWorkOpeningLineageV1,
} from "./void-external-paid-work-opening-lineage-v1.mjs";
import {
  MARKER as LISTENER_BINDING_MARKER,
  STRONG_DECISION as LISTENER_STRONG_DECISION,
  validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1,
} from "../integrations/agents/authenticated-paid-work-runtime-listener-cgroup-binding-v1/index.mjs";

export const VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_V1 =
  "VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_V1";
export const VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_SCHEMA_V1 =
  "void_external_paid_work_fresh_canary_readiness_v1";

export const VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_SOURCE_BLOBS_V1 =
  Object.freeze({
    "tools/void-external-paid-work-opening-lineage-v1.mjs":
      "da4d394f9d8014faee74569896fc9e1e58360cba",
    "integrations/agents/authenticated-paid-work-runtime-listener-cgroup-binding-v1/index.mjs":
      "05dcc9c80f95fcacc7895595219d578dbf5eb0a2",
    "scripts/agent_paid_work_credential_request_gateway_v1.ts":
      "9fbdf2df2cf717bb43d5f9928323ba7f06dadec8",
    "scripts/agent_paid_work_submission_receiver_v1.ts":
      "7236b5bc241240b8af1b5f7748113e84fe1265b4",
  });

export const VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_AUTHORITY_V1 =
  Object.freeze({
    read_only_observation: true,
    listener_receipt_read: true,
    credential_content_access: false,
    raw_token_read: false,
    private_key_access: false,
    public_https_negative_probe: true,
    network_observation: true,
    service_mutation: false,
    systemd_mutation: false,
    credential_request_persisted: false,
    credential_issued: false,
    credential_registry_mutation: false,
    paid_work_submission_persisted: false,
    work_dispatch: false,
    work_execution: false,
    wc_award_authorized: false,
    wc_ledger_write: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    wc_void_market_activation: false,
    external_outreach_authorized: false,
    funds_movement: false,
  });

const EXPECTED_HOST = "zoso-Precision-Tower-7810";
const PUBLIC_HOST = "seed.nullfeed.org";
const CREDENTIAL_PORT = 4113;
const SUBMISSION_PORT = 4187;
const CREDENTIAL_REQUEST_PATH =
  "/__void/agents/paid-work/credential-requests/v1";
const CREDENTIAL_HEALTH_PATH =
  CREDENTIAL_REQUEST_PATH + "/health";
const CREDENTIAL_STATUS_PATH =
  CREDENTIAL_REQUEST_PATH + "/status";
const SUBMISSION_PATH =
  "/__void/agents/paid-work/submissions/v1";
const SUBMISSION_HEALTH_PATH =
  "/__void/agent-paid-work-submission-receiver-v1/health";
const CREDENTIAL_HEALTH_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_HEALTH_V1";
const CREDENTIAL_STATUS_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STATUS_V1";
const SUBMISSION_HEALTH_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_V1";
const MAX_RESPONSE_BYTES = 128 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_LISTENER_EVIDENCE_BYTES = 1024 * 1024;
const MAX_FUTURE_SKEW_MS = 5_000;

function fail(code) {
  throw new Error(code);
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const actual = Object.keys(value).sort().join("\n");
  const expected = [...keys].sort().join("\n");
  if (actual !== expected) fail(code);
  return value;
}

function bool(value, expected, code) {
  if (value !== expected) fail(code);
}

function positiveInteger(value, code) {
  if (!Number.isSafeInteger(value) || value < 1) fail(code);
  return value;
}

function utc(value, code) {
  if (typeof value !== "string") fail(code);
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    fail(code);
  }
  return parsed;
}

function boundedJsonBody(response, code) {
  if (
    !response ||
    typeof response !== "object" ||
    !Number.isSafeInteger(response.status)
  ) {
    fail(code);
  }
  if (
    !response.body ||
    typeof response.body !== "object" ||
    Array.isArray(response.body)
  ) {
    fail(code);
  }
  return response.body;
}

function validateListenerReceipt(receipt, now) {
  const validated =
    validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(
      receipt,
    );
  if (validated.marker !== LISTENER_BINDING_MARKER) {
    fail("fresh_canary_listener_marker_mismatch");
  }
  if (
    validated.decision?.status !== LISTENER_STRONG_DECISION ||
    validated.decision?.listener_cgroup_binding_verified !== true
  ) {
    fail("fresh_canary_listener_not_strong");
  }
  bool(
    validated.safety?.credential_access_performed,
    false,
    "fresh_canary_listener_credential_access_forbidden",
  );
  bool(
    validated.safety?.raw_token_read,
    false,
    "fresh_canary_listener_raw_token_forbidden",
  );
  const evaluated = utc(
    validated.observation?.evaluated_at_utc,
    "fresh_canary_listener_evaluated_at_invalid",
  );
  const maxAgeSeconds = positiveInteger(
    validated.observation?.max_age_seconds,
    "fresh_canary_listener_max_age_invalid",
  );
  const ageMs = now.getTime() - evaluated.getTime();
  if (
    ageMs < -MAX_FUTURE_SKEW_MS ||
    ageMs > maxAgeSeconds * 1000
  ) {
    fail("fresh_canary_listener_evidence_stale");
  }
  return validated;
}

function validateCredentialGateway(healthResponse, statusResponse) {
  if (healthResponse.status !== 200) {
    fail("fresh_canary_credential_health_http_hold");
  }
  const health = boundedJsonBody(
    healthResponse,
    "fresh_canary_credential_health_body_invalid",
  );
  if (
    health.marker !== CREDENTIAL_HEALTH_MARKER ||
    health.version !== 1 ||
    health.ready !== true ||
    health.request_path !== CREDENTIAL_REQUEST_PATH ||
    health.decision !== "accepted_for_review_only"
  ) {
    fail("fresh_canary_credential_health_contract_hold");
  }
  for (const key of [
    "credential_issuance_authorized",
    "credential_registry_mutation_authorized",
    "receiver_restart_authorized",
  ]) {
    bool(
      health[key],
      false,
      "fresh_canary_credential_health_authority_elevated",
    );
  }

  if (statusResponse.status !== 200) {
    fail("fresh_canary_credential_status_http_hold");
  }
  const status = boundedJsonBody(
    statusResponse,
    "fresh_canary_credential_status_body_invalid",
  );
  if (
    status.marker !== CREDENTIAL_STATUS_MARKER ||
    status.version !== 1 ||
    status.ready !== true ||
    status.state_consistent !== true ||
    status.request_path !== CREDENTIAL_REQUEST_PATH ||
    status.raw_request_content_exposed !== false ||
    status.callback_uri_exposed !== false
  ) {
    fail("fresh_canary_credential_status_contract_hold");
  }
  positiveInteger(
    status.max_body_bytes,
    "fresh_canary_credential_max_body_invalid",
  );
  positiveInteger(
    status.max_requests_per_minute,
    "fresh_canary_credential_rate_limit_invalid",
  );
  for (const key of [
    "credential_issuance_authorized",
    "credential_registry_mutation_authorized",
    "receiver_restart_authorized",
  ]) {
    bool(
      status[key],
      false,
      "fresh_canary_credential_status_authority_elevated",
    );
  }

  return { health, status };
}

function validateSubmissionHealth(response) {
  if (response.status !== 200) {
    fail("fresh_canary_submission_health_http_hold");
  }
  const health = boundedJsonBody(
    response,
    "fresh_canary_submission_health_body_invalid",
  );
  if (
    health.marker !== SUBMISSION_HEALTH_MARKER ||
    health.ready !== true ||
    health.host !== "127.0.0.1" ||
    health.port !== SUBMISSION_PORT ||
    health.request_path !== SUBMISSION_PATH ||
    health.authentication_mode !== "credential_registry" ||
    typeof health.credential_registry_id !== "string" ||
    health.credential_registry_id.length < 8
  ) {
    fail("fresh_canary_submission_health_contract_hold");
  }
  positiveInteger(
    health.credential_count,
    "fresh_canary_submission_credential_count_invalid",
  );
  positiveInteger(
    health.maximum_body_bytes,
    "fresh_canary_submission_max_body_invalid",
  );
  for (const key of [
    "provider_selection_authority",
    "quote_creation_authority",
    "payment_authority",
    "work_execution_authority",
    "work_dispatch_authority",
    "wc_award_authority",
    "wc_ledger_write_authority",
    "wallet_or_signer_access",
    "buy_void_fulfillment_authority",
  ]) {
    bool(
      health[key],
      false,
      "fresh_canary_submission_health_authority_elevated",
    );
  }
  return health;
}

function validatePublicCredentialProbe(response) {
  if (response.status !== 415) {
    fail("fresh_canary_public_credential_probe_status_hold");
  }
  const body = boundedJsonBody(
    response,
    "fresh_canary_public_credential_probe_body_invalid",
  );
  if (
    body.ok !== false ||
    body.error !== "application_json_required"
  ) {
    fail("fresh_canary_public_credential_probe_contract_hold");
  }
}

function header(response, name) {
  const value =
    response?.headers?.[String(name).toLowerCase()];
  return typeof value === "string" ? value : "";
}

function validatePublicSubmissionProbe(response) {
  if (response.status !== 401) {
    fail("fresh_canary_public_submission_probe_status_hold");
  }
  const body = boundedJsonBody(
    response,
    "fresh_canary_public_submission_probe_body_invalid",
  );
  if (
    body.ok !== false ||
    body.error !== "bearer_authorization_required" ||
    header(
      response,
      "x-void-agent-paid-work-submission-route",
    ) !== "v1"
  ) {
    fail("fresh_canary_public_submission_probe_contract_hold");
  }
}

export function classifyVoidExternalPaidWorkFreshCanaryReadinessV1(
  input,
) {
  exactKeys(
    input,
    [
      "observed_at_utc",
      "hostname",
      "listener_receipt",
      "credential_health",
      "credential_status",
      "submission_health",
      "public_credential_probe",
      "public_submission_probe",
    ],
    "fresh_canary_readiness_input_shape_invalid",
  );

  if (input.hostname !== EXPECTED_HOST) {
    fail("fresh_canary_readiness_hostname_mismatch");
  }
  const now = utc(
    input.observed_at_utc,
    "fresh_canary_readiness_observed_at_invalid",
  );
  const listener = validateListenerReceipt(
    input.listener_receipt,
    now,
  );
  const credential = validateCredentialGateway(
    input.credential_health,
    input.credential_status,
  );
  const submission = validateSubmissionHealth(
    input.submission_health,
  );
  validatePublicCredentialProbe(
    input.public_credential_probe,
  );
  validatePublicSubmissionProbe(
    input.public_submission_probe,
  );

  const lineage =
    buildVoidExternalPaidWorkOpeningLineageV1();

  return Object.freeze({
    schema:
      VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_V1,
    version: 1,
    status:
      "OPENING_CANARY_PRE_OUTREACH_READINESS_GREEN",
    observed_at_utc: now.toISOString(),
    source_lineage_id: lineage.lineage_id,
    host: EXPECTED_HOST,
    listener_receipt_id: listener.receipt_id,
    listener_cgroup_binding_verified: true,
    credential_request_gateway_ready: true,
    credential_request_request_count:
      Number(credential.status.request_count),
    credential_request_receipt_count:
      Number(credential.status.receipt_count),
    submission_receiver_ready: true,
    submission_authentication_mode:
      submission.authentication_mode,
    submission_credential_registry_id:
      submission.credential_registry_id,
    submission_credential_count:
      submission.credential_count,
    public_hostname: PUBLIC_HOST,
    credential_request_public_route_observed: true,
    authenticated_submission_public_route_observed: true,
    public_probe_mutation_performed: false,
    current_fresh_external_credential_required_after_outreach:
      true,
    external_outreach_authorized: false,
    authority:
      VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_AUTHORITY_V1,
    next_gate:
      "OPERATOR_REVIEW_BEFORE_ONE_EXTERNAL_CANARY_OUTREACH",
  });
}

function readEvidenceFile(file) {
  const canonical = path.resolve(file);
  const fd = fs.openSync(
    canonical,
    fs.constants.O_RDONLY |
      Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const stat = fs.fstatSync(fd);
    if (
      !stat.isFile() ||
      stat.size < 2 ||
      stat.size > MAX_LISTENER_EVIDENCE_BYTES
    ) {
      fail("fresh_canary_listener_receipt_file_invalid");
    }
    const bytes = fs.readFileSync(fd);
    return JSON.parse(bytes.toString("utf8"));
  } finally {
    fs.closeSync(fd);
  }
}

function normalizeHeaders(headers) {
  const output = {};
  for (const [name, value] of Object.entries(headers || {})) {
    if (Array.isArray(value)) {
      output[String(name).toLowerCase()] = value.join(",");
    } else if (value !== undefined) {
      output[String(name).toLowerCase()] = String(value);
    }
  }
  return output;
}

function realRequest({
  protocol,
  hostname,
  port,
  method,
  requestPath,
  headers = {},
  body = Buffer.alloc(0),
}) {
  return new Promise((resolve, reject) => {
    const client = protocol === "https:" ? https : http;
    const request = client.request(
      {
        protocol,
        hostname,
        port,
        method,
        path: requestPath,
        headers: {
          ...headers,
          "content-length": String(body.length),
          "user-agent":
            "void-external-paid-work-fresh-canary-readiness-v1",
          connection: "close",
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const chunks = [];
        let total = 0;
        response.on("data", (chunk) => {
          total += chunk.length;
          if (total > MAX_RESPONSE_BYTES) {
            request.destroy(
              new Error(
                "fresh_canary_readiness_response_too_large",
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const raw = Buffer.concat(chunks);
          let parsed = {};
          if (raw.length) {
            try {
              parsed = JSON.parse(raw.toString("utf8"));
            } catch {
              reject(
                new Error(
                  "fresh_canary_readiness_response_json_invalid",
                ),
              );
              return;
            }
          }
          resolve({
            status: response.statusCode || 0,
            headers: normalizeHeaders(response.headers),
            body: parsed,
          });
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(
        new Error("fresh_canary_readiness_request_timeout"),
      );
    });
    request.on("error", reject);
    request.end(body);
  });
}

export async function collectVoidExternalPaidWorkFreshCanaryReadinessV1({
  listenerReceipt,
  adapters = {
    hostname: os.hostname,
    now: () => new Date(),
    request: realRequest,
  },
}) {
  const empty = Buffer.alloc(0);
  const emptyJson = Buffer.from("{}", "utf8");
  const emptyJsonSha = crypto
    .createHash("sha256")
    .update(emptyJson)
    .digest("hex");

  const [
    credentialHealth,
    credentialStatus,
    submissionHealth,
    publicCredentialProbe,
    publicSubmissionProbe,
  ] = await Promise.all([
    adapters.request({
      protocol: "http:",
      hostname: "127.0.0.1",
      port: CREDENTIAL_PORT,
      method: "GET",
      requestPath: CREDENTIAL_HEALTH_PATH,
    }),
    adapters.request({
      protocol: "http:",
      hostname: "127.0.0.1",
      port: CREDENTIAL_PORT,
      method: "GET",
      requestPath: CREDENTIAL_STATUS_PATH,
    }),
    adapters.request({
      protocol: "http:",
      hostname: "127.0.0.1",
      port: SUBMISSION_PORT,
      method: "GET",
      requestPath: SUBMISSION_HEALTH_PATH,
    }),
    adapters.request({
      protocol: "https:",
      hostname: PUBLIC_HOST,
      port: 443,
      method: "POST",
      requestPath: CREDENTIAL_REQUEST_PATH,
      headers: {
        "content-type": "text/plain",
      },
      body: empty,
    }),
    adapters.request({
      protocol: "https:",
      hostname: PUBLIC_HOST,
      port: 443,
      method: "POST",
      requestPath: SUBMISSION_PATH,
      headers: {
        "content-type": "application/json",
        "x-void-payload-sha256": emptyJsonSha,
      },
      body: emptyJson,
    }),
  ]);

  return classifyVoidExternalPaidWorkFreshCanaryReadinessV1({
    observed_at_utc: adapters.now().toISOString(),
    hostname: adapters.hostname(),
    listener_receipt: listenerReceipt,
    credential_health: credentialHealth,
    credential_status: credentialStatus,
    submission_health: submissionHealth,
    public_credential_probe: publicCredentialProbe,
    public_submission_probe: publicSubmissionProbe,
  });
}

function printPlan() {
  const fields = {
    marker:
      VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_V1,
    mode: "--plan",
    read_only: true,
    expected_host: EXPECTED_HOST,
    source_lineage_required: true,
    strong_listener_receipt_required: true,
    credential_gateway_health_get: true,
    credential_gateway_status_get: true,
    submission_receiver_health_get: true,
    public_https_negative_probe: true,
    public_probe_hostname: PUBLIC_HOST,
    public_probe_credential_request_post_rejected_before_intake:
      true,
    public_probe_submission_post_rejected_before_receiver:
      true,
    credential_content_access: false,
    raw_token_read: false,
    credential_issuance: false,
    credential_registry_mutation: false,
    paid_work_submission_persisted: false,
    work_dispatch: false,
    work_execution: false,
    wc_ledger_write: false,
    external_outreach_authorized: false,
    funds_movement: false,
  };
  for (const [key, value] of Object.entries(fields)) {
    process.stdout.write(
      `${key}=${String(value)}\n`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--plan") {
    printPlan();
    return;
  }
  if (
    args.length !== 2 ||
    args[0] !== "--listener-receipt"
  ) {
    fail(
      "usage: --plan | --listener-receipt <strong-receipt.json>",
    );
  }
  const listenerReceipt = readEvidenceFile(args[1]);
  const result =
    await collectVoidExternalPaidWorkFreshCanaryReadinessV1({
      listenerReceipt,
    });
  process.stdout.write(
    JSON.stringify(result, null, 2) + "\n",
  );
  process.stdout.write(
    VOID_EXTERNAL_PAID_WORK_FRESH_CANARY_READINESS_V1 +
      "_GREEN\n",
  );
}

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      `HOLD=${String(error?.message || error)}\n`,
    );
    process.stderr.write(
      "credential_content_access=false\n" +
      "raw_token_read=false\n" +
      "credential_issuance=false\n" +
      "paid_work_submission_persisted=false\n" +
      "work_dispatch=false\n" +
      "wc_ledger_write=false\n" +
      "external_outreach_authorized=false\n" +
      "funds_movement=false\n",
    );
    process.exitCode = 2;
  }
}
