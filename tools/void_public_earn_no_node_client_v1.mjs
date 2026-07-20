#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER = "VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1";
export const CLAIM_MARKER = "VOID_WC_PUBLIC_TICKET_CLAIM_V1";
export const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
export const TASK_CLASS = "datanet_fetch_verify";
export const FIXED_AWARD_WC = 3;
export const CLAIM_ROUTE = "/wc/public-earning-pilot-v1/claim-ticket";
export const SUBMIT_ROUTE = "/wc/public-earning-pilot-v1/submit-result";
export const STATUS_ROUTE = "/wc/public-earning-pilot-v1/status";
export const BALANCE_ROUTE = "/wc/redeemable";
const CLAIM_DOMAIN = "void:mainnet-0:wc-public-ticket-claim-v1";
const RESULT_DOMAIN = "void:mainnet-0:wc-public-earning-pilot-v1";
const DEFAULT_STATE_DIR = path.join(
  os.homedir(),
  ".local",
  "state",
  "void",
  "public-earn-no-node-client-v1",
);
const DEFAULT_MAX_DATASET_BYTES = 16 * 1024 * 1024;

class ClientError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = "ClientError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message = code, details = {}) {
  throw new ClientError(code, message, details);
}

function jsonObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeAccount(raw) {
  const value = String(raw || "").trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : "";
}

function safeNodeId(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(value) ? value : "";
}

function safeHex64(raw) {
  const value = String(raw || "").trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(value) ? value : "";
}

function safeId(raw, max = 180) {
  const value = String(raw || "").trim();
  if (!value || value.length > max) return "";
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : "";
}

function exactKeys(value, expected) {
  if (!jsonObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = expected.slice().sort();
  return (
    actual.length === wanted.length &&
    actual.every((entry, index) => entry === wanted[index])
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function nodeIdFromPubPEM(pubPEM) {
  return sha256(String(pubPEM || "")).slice(0, 32);
}

function isPrivateHttpHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  if (host.endsWith(".ts.net")) return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((value) => value < 0 || value > 255)) return false;
  if (octets[0] === 10 || octets[0] === 127) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  return false;
}

function safeBase(raw, { allowPrivateHttp = true } = {}) {
  const value = String(raw || "").trim();
  if (!value || value.length > 512) return "";
  try {
    const parsed = new URL(value);
    const https = parsed.protocol === "https:";
    const privateHttp =
      allowPrivateHttp && parsed.protocol === "http:" && isPrivateHttpHost(parsed.hostname);
    if (!https && !privateHttp) return "";
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return "";
    if (parsed.pathname && parsed.pathname !== "/") return "";
    return parsed.origin;
  } catch {
    return "";
  }
}

function expandHome(raw) {
  const value = String(raw || "").trim();
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function ensurePrivateDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
}

function atomicWrite(file, data, mode = 0o600) {
  ensurePrivateDir(path.dirname(file));
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temp, data, { mode });
  fs.chmodSync(temp, mode);
  fs.renameSync(temp, file);
  fs.chmodSync(file, mode);
}

function parseArgs(argv) {
  const args = argv.slice();
  let command = "run";
  if (args[0] && !args[0].startsWith("--")) command = args.shift();
  const options = {};
  const templates = [];
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (!raw.startsWith("--")) fail("unexpected_argument", `unexpected argument: ${raw}`);
    const equals = raw.indexOf("=");
    const name = equals >= 0 ? raw.slice(2, equals) : raw.slice(2);
    let value = equals >= 0 ? raw.slice(equals + 1) : "";
    if (equals < 0) {
      if (index + 1 >= args.length || args[index + 1].startsWith("--")) {
        value = "true";
      } else {
        value = args[index + 1];
        index += 1;
      }
    }
    if (name === "dataset-url-template") templates.push(value);
    else options[name] = value;
  }
  options["dataset-url-template"] = templates;
  return { command, options };
}

function usage() {
  return `Usage:\n  node tools/void_public_earn_no_node_client_v1.mjs identity [--state-dir PATH]\n\n  node tools/void_public_earn_no_node_client_v1.mjs status \\\n    --account ACCOUNT \\\n    --coordinator-base HTTPS_BASE \\\n    --coordinator-node-id 32_HEX \\\n    [--state-dir PATH]\n\n  node tools/void_public_earn_no_node_client_v1.mjs run \\\n    --account ACCOUNT \\\n    --coordinator-base HTTPS_BASE \\\n    --coordinator-node-id 32_HEX \\\n    [--dataset-url-template 'HTTPS_URL_WITH_{dataset_id}'] \\\n    [--state-dir PATH]\n\nThe coordinator selects the task, dataset, expected input hash, award, and expiry.\nThe client runs once and never starts a background service or a VOID node.\n`;
}

function statePaths(raw) {
  const root = path.resolve(expandHome(raw || DEFAULT_STATE_DIR));
  return {
    root,
    identityDir: path.join(root, "identity"),
    pendingDir: path.join(root, "pending"),
    receiptsDir: path.join(root, "receipts"),
    privateKey: path.join(root, "identity", "executor-private-key.pem"),
    publicKey: path.join(root, "identity", "executor-public-key.pem"),
    identity: path.join(root, "identity", "identity.json"),
    lock: path.join(root, "run.lock"),
  };
}

function loadOrCreateIdentity(paths) {
  ensurePrivateDir(paths.root);
  ensurePrivateDir(paths.identityDir);
  ensurePrivateDir(paths.pendingDir);
  ensurePrivateDir(paths.receiptsDir);

  const privateExists = fs.existsSync(paths.privateKey);
  const publicExists = fs.existsSync(paths.publicKey);
  if (privateExists !== publicExists) {
    fail("identity_incomplete", "identity key files are incomplete");
  }

  if (!privateExists) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    const privatePEM = privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString();
    const publicPEM = publicKey
      .export({ type: "spki", format: "pem" })
      .toString();
    atomicWrite(paths.privateKey, privatePEM, 0o600);
    atomicWrite(paths.publicKey, publicPEM, 0o600);
  }

  fs.chmodSync(paths.privateKey, 0o600);
  fs.chmodSync(paths.publicKey, 0o600);
  const privatePEM = fs.readFileSync(paths.privateKey, "utf8");
  const publicPEM = fs.readFileSync(paths.publicKey, "utf8");
  let privateKey;
  let publicKey;
  try {
    privateKey = crypto.createPrivateKey(privatePEM);
    publicKey = crypto.createPublicKey(publicPEM);
  } catch {
    fail("identity_key_parse_failed", "stored Ed25519 identity could not be parsed");
  }
  if (privateKey.asymmetricKeyType !== "ed25519" || publicKey.asymmetricKeyType !== "ed25519") {
    fail("identity_key_type_invalid", "stored identity is not Ed25519");
  }
  const probe = crypto.randomBytes(32);
  const signature = crypto.sign(null, probe, privateKey);
  if (!crypto.verify(null, probe, publicKey, signature)) {
    fail("identity_keypair_mismatch", "stored public and private keys do not match");
  }
  const nodeId = nodeIdFromPubPEM(publicPEM);
  const identityRecord = {
    marker: MARKER,
    version: 1,
    node_id: nodeId,
    public_key_sha256: sha256(publicPEM),
    algorithm: "ed25519",
    full_void_node_required: false,
  };
  atomicWrite(paths.identity, JSON.stringify(identityRecord, null, 2) + "\n", 0o600);
  return { nodeId, publicPEM, privateKey, publicKey };
}

function canonicalClaim(raw) {
  if (!exactKeys(raw, [
    "account",
    "claim_nonce",
    "claim_ts_ms",
    "domain",
    "executor_node_id",
    "executor_pubkey",
    "marker",
    "version",
  ])) {
    fail("unexpected_claim_request_field");
  }
  const claim = {
    domain: String(raw.domain || ""),
    marker: String(raw.marker || ""),
    version: Number(raw.version || 0),
    account: safeAccount(raw.account),
    executor_node_id: safeNodeId(raw.executor_node_id),
    executor_pubkey: String(raw.executor_pubkey || ""),
    claim_nonce: String(raw.claim_nonce || "").trim().toLowerCase(),
    claim_ts_ms: Math.trunc(Number(raw.claim_ts_ms || 0)),
  };
  if (claim.domain !== CLAIM_DOMAIN) fail("claim_domain_mismatch");
  if (claim.marker !== CLAIM_MARKER) fail("claim_marker_mismatch");
  if (claim.version !== 1) fail("claim_version_unsupported");
  if (!claim.account) fail("invalid_account");
  if (!claim.executor_node_id) fail("invalid_executor_node_id");
  if (
    claim.executor_pubkey.length < 80 ||
    claim.executor_pubkey.length > 2048 ||
    !claim.executor_pubkey.includes("BEGIN PUBLIC KEY") ||
    !claim.executor_pubkey.includes("END PUBLIC KEY")
  ) {
    fail("invalid_executor_pubkey");
  }
  if (!/^[0-9a-f]{32}$/.test(claim.claim_nonce)) fail("invalid_claim_nonce");
  if (!Number.isFinite(claim.claim_ts_ms) || claim.claim_ts_ms <= 0) {
    fail("invalid_claim_timestamp");
  }
  if (nodeIdFromPubPEM(claim.executor_pubkey) !== claim.executor_node_id) {
    fail("claim_executor_pubkey_node_id_mismatch");
  }
  return claim;
}

function claimSigningBytes(raw) {
  return Buffer.from(JSON.stringify(canonicalClaim(raw)), "utf8");
}

function signClaim(raw, privateKey) {
  const claim = canonicalClaim(raw);
  const sig = crypto.sign(null, claimSigningBytes(claim), privateKey).toString("hex");
  return {
    claim,
    signature: { alg: "ed25519", key_id: claim.executor_node_id, sig },
  };
}

function canonicalResult(raw) {
  const executorHttpBase = String(raw.executor_http_base || "").trim();
  const transportMode = String(
    raw.transport_mode || (executorHttpBase ? "inbound_fetch" : "outbound_bundle"),
  ).trim();
  const envelope = {
    domain: RESULT_DOMAIN,
    marker: PILOT_MARKER,
    version: 1,
    ticket_id: safeId(raw.ticket_id, 64),
    account: safeAccount(raw.account),
    task_class: String(raw.task_class || "").trim(),
    executor_node_id: safeNodeId(raw.executor_node_id),
    executor_pubkey: String(raw.executor_pubkey || ""),
    executor_http_base: executorHttpBase,
    transport_mode: transportMode,
    dataset_id: safeId(raw.dataset_id, 160),
    expected_input_hash: safeHex64(raw.expected_input_hash),
    job_id: safeId(raw.job_id, 160),
    receipt_id: safeId(raw.receipt_id, 180),
    input_hash: safeHex64(raw.input_hash),
    output_hash: safeHex64(raw.output_hash),
    fetched_input_hash: safeHex64(raw.fetched_input_hash),
    receipt_ts_ms: Math.trunc(Number(raw.receipt_ts_ms || 0)),
  };
  if (!/^[0-9a-f]{32}$/.test(envelope.ticket_id)) fail("invalid_ticket_id");
  if (!envelope.account) fail("invalid_account");
  if (envelope.task_class !== TASK_CLASS) fail("task_class_not_allowlisted");
  if (!envelope.executor_node_id) fail("invalid_executor_node_id");
  if (!envelope.executor_pubkey.includes("BEGIN PUBLIC KEY")) fail("invalid_executor_pubkey");
  if (envelope.transport_mode !== "outbound_bundle") fail("invalid_transport_mode");
  if (envelope.executor_http_base) fail("outbound_executor_http_base_forbidden");
  if (!envelope.dataset_id) fail("invalid_dataset_id");
  if (!envelope.expected_input_hash) fail("invalid_expected_input_hash");
  if (!envelope.job_id) fail("invalid_job_id");
  if (!envelope.receipt_id) fail("invalid_receipt_id");
  if (!envelope.input_hash) fail("invalid_input_hash");
  if (!envelope.output_hash) fail("invalid_output_hash");
  if (!envelope.fetched_input_hash) fail("invalid_fetched_input_hash");
  if (!Number.isFinite(envelope.receipt_ts_ms) || envelope.receipt_ts_ms <= 0) {
    fail("invalid_receipt_timestamp");
  }
  return envelope;
}

function resultSigningBytes(raw) {
  return Buffer.from(JSON.stringify(canonicalResult(raw)), "utf8");
}

function signResult(raw, privateKey) {
  const envelope = canonicalResult(raw);
  const sig = crypto.sign(null, resultSigningBytes(envelope), privateKey).toString("hex");
  return {
    envelope,
    signature: { alg: "ed25519", key_id: envelope.executor_node_id, sig },
  };
}

function validateTicket(response, account, executorNodeId, capabilityToken) {
  if (!jsonObject(response) || response.ok !== true || response.marker !== CLAIM_MARKER) {
    fail("public_claim_response_invalid");
  }
  if (
    response.claim_request_verified !== true ||
    response.executor_key_possession_verified !== true ||
    response.server_selected_work !== true ||
    response.capability_token_returned_once !== true
  ) {
    fail("public_claim_verification_missing");
  }
  const token = String(capabilityToken || "");
  if (!/^wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) {
    fail("capability_token_shape_invalid");
  }
  const ticket = jsonObject(response.ticket) ? response.ticket : {};
  const ticketId = safeId(ticket.ticket_id, 64);
  const datasetId = safeId(ticket.dataset_id, 160);
  const expectedInputHash = safeHex64(ticket.expected_input_hash);
  if (!/^[0-9a-f]{32}$/.test(ticketId)) fail("ticket_id_invalid");
  if (safeAccount(ticket.account) !== account) fail("ticket_account_mismatch");
  if (safeNodeId(ticket.executor_node_id) !== executorNodeId) {
    fail("ticket_executor_node_mismatch");
  }
  if (String(ticket.executor_http_base || "") !== "") fail("ticket_executor_http_base_forbidden");
  if (String(ticket.transport_mode || "") !== "outbound_bundle") fail("ticket_transport_mode_invalid");
  if (String(ticket.task_class || "") !== TASK_CLASS) fail("ticket_task_invalid");
  if (Number(ticket.fixed_award_wc || 0) !== FIXED_AWARD_WC) fail("ticket_award_invalid");
  if (String(ticket.status || "") !== "issued") fail("ticket_status_invalid");
  if (!datasetId) fail("ticket_dataset_invalid");
  if (!expectedInputHash) fail("ticket_expected_input_hash_invalid");
  if (safeHex64(ticket.token_sha256) !== sha256(token)) fail("capability_token_sha_mismatch");
  const expiresAtMs = Math.trunc(Number(ticket.expires_at_ms || 0));
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) fail("capability_expired");
  return { ...ticket, ticket_id: ticketId, dataset_id: datasetId, expected_input_hash: expectedInputHash, expires_at_ms: expiresAtMs };
}

function validateCoordinatorStatus(status) {
  const publicClaim = jsonObject(status?.public_claim) ? status.public_claim : {};
  if (
    status?.ok !== true ||
    status?.marker !== PILOT_MARKER ||
    status?.coordinator_enabled !== true ||
    status?.executor_enabled !== false ||
    Number(status?.fixed_award_wc || 0) !== FIXED_AWARD_WC ||
    publicClaim.marker !== CLAIM_MARKER ||
    publicClaim.enabled !== true ||
    publicClaim.available !== true ||
    publicClaim.server_selected_work !== true ||
    publicClaim.proof_of_executor_key_possession_required !== true ||
    publicClaim.transport_mode !== "outbound_bundle" ||
    Number(publicClaim.fixed_award_wc || 0) !== FIXED_AWARD_WC ||
    publicClaim.participant_selected_dataset !== false ||
    publicClaim.participant_selected_input_hash !== false ||
    publicClaim.participant_selected_award !== false ||
    publicClaim.money_movement !== false
  ) {
    fail("public_claim_not_available");
  }
  return publicClaim;
}

function validateBalance(body, account) {
  if (body?.ok !== true || safeAccount(body?.account) !== account) {
    fail("balance_response_invalid");
  }
  const value = Number(body.redeemable);
  if (!Number.isFinite(value) || value < 0) fail("balance_redeemable_invalid");
  return value;
}

function redact(value, secrets = []) {
  if (typeof value === "string") {
    let output = value;
    for (const secret of secrets) {
      if (secret) output = output.split(secret).join("[REDACTED]");
    }
    return output;
  }
  if (Array.isArray(value)) return value.map((entry) => redact(entry, secrets));
  if (jsonObject(value)) {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/token|secret|private|authorization|cookie/i.test(key)) output[key] = "[REDACTED]";
      else output[key] = redact(entry, secrets);
    }
    return output;
  }
  return value;
}

async function requestJson(url, init = {}, timeoutMs = 30_000, secrets = []) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: "error" });
    const text = await response.text();
    for (const secret of secrets) {
      if (secret && text.includes(secret)) fail("secret_reflection_detected");
    }
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      fail("non_json_response", "server returned a non-JSON response", { status: response.status });
    }
    if (!response.ok) {
      fail(
        String(body?.error || `http_${response.status}`),
        `HTTP ${response.status}`,
        { status: response.status, body: redact(body, secrets) },
      );
    }
    return { status: response.status, body, headers: response.headers };
  } catch (error) {
    if (error instanceof ClientError) throw error;
    if (error?.name === "AbortError") fail("request_timeout", `request timed out: ${url}`);
    fail("request_failed", `request failed: ${url}`);
  } finally {
    clearTimeout(timer);
  }
}

function renderDatasetTemplate(template, datasetId) {
  const value = String(template || "").trim();
  if (!value) return "";
  const encoded = encodeURIComponent(datasetId);
  let rendered = value
    .replaceAll("{dataset_id}", encoded)
    .replaceAll("{dataset_id_uri}", encoded);
  if (!value.includes("{dataset_id}")) {
    const parsed = new URL(rendered);
    if (!parsed.searchParams.has("dataset_id") && !parsed.searchParams.has("id")) {
      parsed.searchParams.set("dataset_id", datasetId);
      rendered = parsed.toString();
    }
  }
  try {
    const parsed = new URL(rendered);
    const https = parsed.protocol === "https:";
    const privateHttp = parsed.protocol === "http:" && isPrivateHttpHost(parsed.hostname);
    if (!https && !privateHttp) return "";
    if (parsed.username || parsed.password || parsed.hash) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function datasetTemplates(coordinatorBase, publicClaim, explicit) {
  const candidates = [];
  for (const value of explicit || []) if (value) candidates.push(value);
  for (const key of [
    "dataset_url_template",
    "dataset_fetch_url_template",
    "public_dataset_url_template",
    "dataset_route_template",
    "dataset_fetch_route",
  ]) {
    const value = String(publicClaim?.[key] || "").trim();
    if (!value) continue;
    candidates.push(value.startsWith("/") ? `${coordinatorBase}${value}` : value);
  }
  candidates.push(
    `${coordinatorBase}/public-node/datanet/open-by-id-v1?dataset_id={dataset_id}`,
    `${coordinatorBase}/public-node/datanet/open-by-id?dataset_id={dataset_id}`,
    `${coordinatorBase}/public-node/datanet/dataset-v1?dataset_id={dataset_id}`,
    `${coordinatorBase}/datanet/open-by-id-v1?dataset_id={dataset_id}`,
    `${coordinatorBase}/datanet/open-by-id?dataset_id={dataset_id}`,
    `${coordinatorBase}/datanet/datasets/{dataset_id}`,
    `${coordinatorBase}/datanet/dataset/{dataset_id}`,
    `${coordinatorBase}/public-node/datanet/datasets/{dataset_id}`,
  );
  return [...new Set(candidates)];
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (jsonObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function candidateBuffersFromJson(value, depth = 0, key = "") {
  if (depth > 8) return [];
  const output = [];
  if (Buffer.isBuffer(value)) return [value];
  if (typeof value === "string") {
    output.push(Buffer.from(value, "utf8"));
    if (/base64|bytes|blob|data/i.test(key) && /^[A-Za-z0-9+/_=-]+$/.test(value)) {
      for (const encoding of ["base64", "base64url"]) {
        try {
          const decoded = Buffer.from(value, encoding);
          if (decoded.length) output.push(decoded);
        } catch {}
      }
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const entry of value) output.push(...candidateBuffersFromJson(entry, depth + 1, key));
    return output;
  }
  if (jsonObject(value)) {
    for (const [childKey, entry] of Object.entries(value)) {
      if (/content|data|payload|body|plaintext|bytes|blob|object/i.test(childKey)) {
        output.push(...candidateBuffersFromJson(entry, depth + 1, childKey));
        if (jsonObject(entry) || Array.isArray(entry)) output.push(Buffer.from(stableJson(entry), "utf8"));
      }
    }
  }
  return output;
}

async function fetchAndVerifyDataset(ticket, coordinatorBase, publicClaim, explicitTemplates, maxBytes) {
  const attempts = [];
  for (const template of datasetTemplates(coordinatorBase, publicClaim, explicitTemplates)) {
    const url = renderDatasetTemplate(template, ticket.dataset_id);
    if (!url) continue;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { accept: "application/octet-stream, application/json;q=0.9, text/plain;q=0.8" },
        signal: controller.signal,
        redirect: "error",
      });
      if (!response.ok) {
        attempts.push({ url, status: response.status });
        continue;
      }
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > maxBytes) fail("dataset_too_large");
      const raw = Buffer.from(await response.arrayBuffer());
      if (raw.length > maxBytes) fail("dataset_too_large");
      const rawHash = sha256(raw);
      if (rawHash === ticket.expected_input_hash) {
        return { url, bytes: raw.length, fetchedHash: rawHash, representation: "raw" };
      }
      const contentType = String(response.headers.get("content-type") || "");
      if (contentType.includes("json") || /^[\s\r\n]*[\[{]/.test(raw.toString("utf8", 0, Math.min(raw.length, 32)))) {
        try {
          const parsed = JSON.parse(raw.toString("utf8"));
          for (const candidate of candidateBuffersFromJson(parsed)) {
            if (candidate.length > maxBytes) continue;
            const digest = sha256(candidate);
            if (digest === ticket.expected_input_hash) {
              return { url, bytes: candidate.length, fetchedHash: digest, representation: "json-content" };
            }
          }
        } catch {}
      }
      attempts.push({ url, status: response.status, hash: rawHash });
    } catch (error) {
      if (error instanceof ClientError) throw error;
      attempts.push({ url, error: error?.name === "AbortError" ? "timeout" : "fetch_failed" });
    } finally {
      clearTimeout(timer);
    }
  }
  fail("dataset_fetch_verify_failed", "no public dataset representation matched the server-selected expected hash", { attempts });
}

function validateCoordinatorSubmission(body, ticket, before) {
  if (
    body?.ok !== true ||
    body?.marker !== PILOT_MARKER ||
    body?.remote_executor !== true ||
    safeNodeId(body?.executor_node_id) !== ticket.executor_node_id ||
    body?.transport_mode !== "outbound_bundle" ||
    body?.coordinator_inbound_fetch !== false ||
    body?.participant_outbound_bundle !== true ||
    body?.signature_verified !== true ||
    body?.remote_health_verified !== true ||
    body?.remote_job_verified !== true ||
    body?.remote_receipt_verified !== true ||
    body?.capability_consumed !== true ||
    safeId(body?.ticket_id, 64) !== ticket.ticket_id ||
    safeAccount(body?.account) !== ticket.account ||
    safeId(body?.dataset_id, 160) !== ticket.dataset_id ||
    Number(body?.wc?.fixed_award_wc || 0) !== FIXED_AWARD_WC ||
    Number(body?.wc?.delta) !== FIXED_AWARD_WC ||
    Number(body?.wc?.before) !== before ||
    body?.participant_selected_award !== false ||
    body?.money_movement !== false
  ) {
    fail("coordinator_submission_response_invalid");
  }
  return Number(body.wc.after);
}

function acquireRunLock(file) {
  ensurePrivateDir(path.dirname(file));
  try {
    const fd = fs.openSync(file, "wx", 0o600);
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, created_at_ms: Date.now() }) + "\n");
    return fd;
  } catch (error) {
    if (error?.code === "EEXIST") fail("client_already_running");
    throw error;
  }
}

function releaseRunLock(file, fd) {
  try { fs.closeSync(fd); } catch {}
  try { fs.unlinkSync(file); } catch {}
}

async function inspectCoordinator(options, identity) {
  const account = safeAccount(options.account);
  const coordinatorBase = safeBase(options["coordinator-base"]);
  const trustedNodeId = safeNodeId(options["coordinator-node-id"]);
  if (!account) fail("invalid_account");
  if (!coordinatorBase) fail("invalid_coordinator_base");
  if (!trustedNodeId) fail("invalid_coordinator_node_id");
  const health = (await requestJson(`${coordinatorBase}/health`, {}, 15_000)).body;
  if (health?.ok !== true || safeNodeId(health?.nodeId) !== trustedNodeId) {
    fail("coordinator_node_identity_mismatch");
  }
  const status = (
    await requestJson(
      `${coordinatorBase}${STATUS_ROUTE}?account=${encodeURIComponent(account)}`,
      {},
      15_000,
    )
  ).body;
  const publicClaim = validateCoordinatorStatus(status);
  const balance = validateBalance(
    (
      await requestJson(
        `${coordinatorBase}${BALANCE_ROUTE}?account=${encodeURIComponent(account)}`,
        {},
        15_000,
      )
    ).body,
    account,
  );
  return { account, coordinatorBase, trustedNodeId, health, status, publicClaim, balance, identity };
}

function loadPendingClaim(paths, account, coordinatorBase, coordinatorNodeId, executorNodeId) {
  ensurePrivateDir(paths.pendingDir);
  const matches = [];
  for (const name of fs.readdirSync(paths.pendingDir).sort()) {
    if (!/^[0-9a-f]{32}\.json$/.test(name)) continue;
    const file = path.join(paths.pendingDir, name);
    let root;
    try {
      root = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      fail("pending_ticket_invalid", `pending ticket is not valid JSON: ${name}`);
    }
    if (
      safeAccount(root?.ticket?.account) !== account ||
      safeBase(root?.coordinator_base) !== coordinatorBase ||
      safeNodeId(root?.coordinator_node_id) !== coordinatorNodeId ||
      safeNodeId(root?.ticket?.executor_node_id) !== executorNodeId
    ) {
      continue;
    }
    const token = String(root?.capability_token || "");
    const ticket = validateTicket(
      {
        ok: true,
        marker: CLAIM_MARKER,
        claim_request_verified: true,
        executor_key_possession_verified: true,
        server_selected_work: true,
        capability_token_returned_once: true,
        ticket: root.ticket,
      },
      account,
      executorNodeId,
      token,
    );
    matches.push({ file, ticket, capabilityToken: token });
  }
  if (matches.length > 1) fail("multiple_pending_tickets");
  return matches[0] || null;
}

async function runOnce(options) {
  const paths = statePaths(options["state-dir"]);
  const lockFd = acquireRunLock(paths.lock);
  try {
    const identity = loadOrCreateIdentity(paths);
    const context = await inspectCoordinator(options, identity);
    const pending = loadPendingClaim(
      paths,
      context.account,
      context.coordinatorBase,
      context.trustedNodeId,
      identity.nodeId,
    );
    let capabilityToken;
    let ticket;
    let pendingFile;
    let resumedPendingTicket = false;
    if (pending) {
      capabilityToken = pending.capabilityToken;
      ticket = pending.ticket;
      pendingFile = pending.file;
      resumedPendingTicket = true;
    } else {
      const signedClaim = signClaim(
        {
          domain: CLAIM_DOMAIN,
          marker: CLAIM_MARKER,
          version: 1,
          account: context.account,
          executor_node_id: identity.nodeId,
          executor_pubkey: identity.publicPEM,
          claim_nonce: crypto.randomBytes(16).toString("hex"),
          claim_ts_ms: Date.now(),
        },
        identity.privateKey,
      );
      const claimResponse = await requestJson(
        `${context.coordinatorBase}${CLAIM_ROUTE}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(signedClaim),
        },
        35_000,
      );
      capabilityToken = String(claimResponse.body?.capability_token || "");
      ticket = validateTicket(
        claimResponse.body,
        context.account,
        identity.nodeId,
        capabilityToken,
      );
      pendingFile = path.join(paths.pendingDir, `${ticket.ticket_id}.json`);
      atomicWrite(
        pendingFile,
        JSON.stringify(
          {
            marker: MARKER,
            version: 1,
            ticket,
            capability_token: capabilityToken,
            coordinator_base: context.coordinatorBase,
            coordinator_node_id: context.trustedNodeId,
            claimed_at_ms: Date.now(),
          },
          null,
          2,
        ) + "\n",
        0o600,
      );
    }

    const maxBytesRaw = Number(options["max-dataset-bytes"] || DEFAULT_MAX_DATASET_BYTES);
    const maxBytes = Number.isFinite(maxBytesRaw) && maxBytesRaw > 0
      ? Math.min(Math.trunc(maxBytesRaw), 256 * 1024 * 1024)
      : DEFAULT_MAX_DATASET_BYTES;
    const dataset = await fetchAndVerifyDataset(
      ticket,
      context.coordinatorBase,
      context.publicClaim,
      options["dataset-url-template"],
      maxBytes,
    );

    const jobId = `job_no_node_v1_${crypto.randomBytes(12).toString("hex")}`;
    const receiptId = `rcpt_no_node_v1_${crypto.randomBytes(12).toString("hex")}`;
    const receiptTs = Date.now();
    const output = {
      verified: true,
      fetched_input_hash: dataset.fetchedHash,
      dataset_id: ticket.dataset_id,
      fetched_bytes: dataset.bytes,
    };
    const outputHash = sha256(Buffer.from(JSON.stringify(output), "utf8"));
    const signedResult = signResult(
      {
        ticket_id: ticket.ticket_id,
        account: ticket.account,
        task_class: TASK_CLASS,
        executor_node_id: identity.nodeId,
        executor_pubkey: identity.publicPEM,
        executor_http_base: "",
        transport_mode: "outbound_bundle",
        dataset_id: ticket.dataset_id,
        expected_input_hash: ticket.expected_input_hash,
        job_id: jobId,
        receipt_id: receiptId,
        input_hash: dataset.fetchedHash,
        output_hash: outputHash,
        fetched_input_hash: dataset.fetchedHash,
        receipt_ts_ms: receiptTs,
      },
      identity.privateKey,
    );
    const plaintext = JSON.stringify({
      dataset_id: ticket.dataset_id,
      expected_input_hash: ticket.expected_input_hash,
      capability_ticket_id: ticket.ticket_id,
      executor_node_id: identity.nodeId,
    });
    const job = {
      id: jobId,
      job_id: jobId,
      account: ticket.account,
      kind: TASK_CLASS,
      status: "completed",
      dataset_id: ticket.dataset_id,
      selected_dataset_id: ticket.dataset_id,
      plaintext,
      input: { account: ticket.account, kind: TASK_CLASS, plaintext },
      meta: {
        selection_reason: "void_public_earn_no_node_client_v1",
        selected_dataset_id: ticket.dataset_id,
        capability_ticket_id: ticket.ticket_id,
        executor_node_id: identity.nodeId,
      },
    };
    const receipt = {
      receipt_id: receiptId,
      job_id: jobId,
      account: ticket.account,
      kind: TASK_CLASS,
      status: "completed",
      dataset_id: ticket.dataset_id,
      input_hash: dataset.fetchedHash,
      output_hash: outputHash,
      output,
      ts_ms: receiptTs,
    };
    const proofBundle = {
      marker: PILOT_MARKER,
      version: 1,
      transport_mode: "outbound_bundle",
      ticket_id: ticket.ticket_id,
      executor_node_id: identity.nodeId,
      job_id: jobId,
      receipt_id: receiptId,
      health: { ok: true, nodeId: identity.nodeId, peers: [] },
      job,
      receipt,
    };
    const submission = await requestJson(
      `${context.coordinatorBase}${SUBMIT_ROUTE}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${capabilityToken}`,
        },
        body: JSON.stringify({ ...signedResult, proof_bundle: proofBundle }),
      },
      45_000,
      [capabilityToken],
    );
    const responseAfter = validateCoordinatorSubmission(
      submission.body,
      ticket,
      context.balance,
    );
    const balanceAfter = validateBalance(
      (
        await requestJson(
          `${context.coordinatorBase}${BALANCE_ROUTE}?account=${encodeURIComponent(context.account)}`,
          {},
          15_000,
        )
      ).body,
      context.account,
    );
    if (balanceAfter !== context.balance + FIXED_AWARD_WC || balanceAfter !== responseAfter) {
      fail("canonical_balance_delta_mismatch");
    }
    const receiptFile = path.join(paths.receiptsDir, `${ticket.ticket_id}.json`);
    atomicWrite(
      receiptFile,
      JSON.stringify(
        {
          marker: MARKER,
          version: 1,
          timestamp: new Date().toISOString(),
          account: ticket.account,
          executor_node_id: identity.nodeId,
          coordinator_node_id: context.trustedNodeId,
          coordinator_base: context.coordinatorBase,
          ticket_id: ticket.ticket_id,
          dataset_id: ticket.dataset_id,
          expected_input_hash: ticket.expected_input_hash,
          dataset_url: dataset.url,
          dataset_representation: dataset.representation,
          fetched_bytes: dataset.bytes,
          job_id: jobId,
          receipt_id: receiptId,
          token_sha256: sha256(capabilityToken),
          wc: {
            before: context.balance,
            after: balanceAfter,
            delta: FIXED_AWARD_WC,
            fixed_award_wc: FIXED_AWARD_WC,
          },
          transport_mode: "outbound_bundle",
          full_void_node_required: false,
          loopback_sign_claim_used: false,
          loopback_execute_local_used: false,
          resumed_pending_ticket: resumedPendingTicket,
          participant_selected_task: false,
          participant_selected_dataset: false,
          participant_selected_input_hash: false,
          participant_selected_award: false,
          money_movement: false,
        },
        null,
        2,
      ) + "\n",
      0o600,
    );
    fs.unlinkSync(pendingFile);
    console.log(`account=${ticket.account}`);
    console.log(`executor_node_id=${identity.nodeId}`);
    console.log(`ticket_id=${ticket.ticket_id}`);
    console.log(`job_id=${jobId}`);
    console.log(`receipt_id=${receiptId}`);
    console.log(`dataset_id=${ticket.dataset_id}`);
    console.log("transport_mode=outbound_bundle");
    console.log("full_void_node_required=false");
    console.log("inbound_executor_reachability_required=false");
    console.log(`wc_before=${context.balance}`);
    console.log(`wc_after=${balanceAfter}`);
    console.log(`wc_delta=${FIXED_AWARD_WC}`);
    console.log(`resumed_pending_ticket=${resumedPendingTicket}`);
    console.log("ticket_deleted=1");
    console.log(`receipt=${receiptFile}`);
    console.log("VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_EARNED_3_WC_EXACT_GREEN");
    return 0;
  } finally {
    releaseRunLock(paths.lock, lockFd);
  }
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (command === "help" || options.help === "true") {
    process.stdout.write(usage());
    return 0;
  }
  const paths = statePaths(options["state-dir"]);
  const identity = loadOrCreateIdentity(paths);
  if (command === "identity") {
    console.log(`marker=${MARKER}`);
    console.log(`executor_node_id=${identity.nodeId}`);
    console.log(`state_dir=${paths.root}`);
    console.log(`public_key=${paths.publicKey}`);
    console.log("full_void_node_required=false");
    console.log("VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_IDENTITY_EXACT_GREEN");
    return 0;
  }
  if (command === "status") {
    const context = await inspectCoordinator(options, identity);
    console.log(`marker=${MARKER}`);
    console.log(`account=${context.account}`);
    console.log(`executor_node_id=${identity.nodeId}`);
    console.log(`coordinator_node_id=${context.trustedNodeId}`);
    console.log(`redeemable=${context.balance}`);
    console.log("public_claim_available=true");
    console.log("full_void_node_required=false");
    console.log("VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_STATUS_EXACT_GREEN");
    return 0;
  }
  if (command !== "run") fail("unknown_command", `unknown command: ${command}`);
  return runOnce(options);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().then(
    (code) => process.exitCode = Number(code || 0),
    (error) => {
      const code = error instanceof ClientError ? error.code : "unexpected_error";
      const details = error instanceof ClientError ? redact(error.details) : {};
      console.error(`HOLD: ${code}`);
      if (details && Object.keys(details).length) {
        console.error(`details=${JSON.stringify(details)}`);
      }
      console.error("VOID_PUBLIC_EARN_NO_NODE_CLIENT_V1_HOLD");
      process.exitCode = 1;
    },
  );
}

export const testOnly = {
  canonicalClaim,
  claimSigningBytes,
  signClaim,
  canonicalResult,
  resultSigningBytes,
  signResult,
  nodeIdFromPubPEM,
  safeAccount,
  safeNodeId,
  safeHex64,
  sha256,
};
