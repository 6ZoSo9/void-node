import crypto from "node:crypto";
import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { nodeIdFromPubPEM } from "../chain/block.js";
import { loadKeypair } from "../crypto/keypair.js";
import {
  acceptVerifiedReceiptOnce,
  readCanonicalWcState,
} from "./wc_verified_receipt_acceptance_v1.js";

export const VOID_WC_PUBLIC_EARNING_PILOT_MARKER =
  "VOID_WC_PUBLIC_EARNING_PILOT_V1";
export const VOID_WC_PUBLIC_EARNING_PILOT_TASK =
  "datanet_fetch_verify";
export const VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC = 3;

export type PilotTransportMode = "inbound_fetch" | "outbound_bundle";

const OPERATOR_ISSUE_ROUTE =
  "/wc/public-earning-pilot-v1/operator/issue";
const LOCAL_EXECUTE_ROUTE =
  "/wc/public-earning-pilot-v1/execute-local";
const PUBLIC_SUBMIT_ROUTE =
  "/wc/public-earning-pilot-v1/submit-result";
const PUBLIC_STATUS_ROUTE =
  "/wc/public-earning-pilot-v1/status";
const GLOBAL_MARK = "__void_wc_public_earning_pilot_v1";

type JsonObject = Record<string, any>;

function isJsonObject(raw: unknown): raw is JsonObject {
  return Boolean(raw) && typeof raw === "object" && !Array.isArray(raw);
}

function recordPilotBestEffortFailure(
  scope: string,
  error: unknown,
  meta: JsonObject = {},
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("VOID_WC_PUBLIC_EARNING_PILOT_BEST_EFFORT_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

export interface PilotTicketRecord {
  marker: string;
  version: 1;
  ticket_id: string;
  account: string;
  task_class: string;
  executor_node_id: string;
  executor_http_base: string;
  transport_mode?: PilotTransportMode;
  dataset_id: string;
  expected_input_hash: string;
  token_sha256: string;
  nonce: string;
  issued_at_ms: number;
  expires_at_ms: number;
  max_uses: 1;
  status: string;
  public_submit_route: string;
  local_execute_route: string;
}

export interface PilotResultEnvelope {
  domain: string;
  marker: string;
  version: 1;
  ticket_id: string;
  account: string;
  task_class: string;
  executor_node_id: string;
  executor_pubkey: string;
  executor_http_base: string;
  transport_mode: PilotTransportMode;
  dataset_id: string;
  expected_input_hash: string;
  job_id: string;
  receipt_id: string;
  input_hash: string;
  output_hash: string;
  fetched_input_hash: string;
  receipt_ts_ms: number;
}

function resolveDataDir(raw?: string): string {
  return path.resolve(
    raw ||
      process.env.DATA_DIR ||
      process.env.VOID_DATA_DIR ||
      "data_a",
  );
}

function rootDir(raw?: string): string {
  return path.join(
    resolveDataDir(raw),
    "wc_v1",
    "public-earning-pilot-v1",
  );
}

function issuedDir(raw?: string): string {
  return path.join(rootDir(raw), "issued");
}

function consumedDir(raw?: string): string {
  return path.join(rootDir(raw), "consumed");
}

function locksDir(raw?: string): string {
  return path.join(rootDir(raw), "locks");
}

function auditFile(raw?: string): string {
  return path.join(rootDir(raw), "audit.jsonl");
}

function ensureDirs(raw?: string): void {
  for (const dir of [
    rootDir(raw),
    issuedDir(raw),
    consumedDir(raw),
    locksDir(raw),
  ]) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

function atomicWriteJson(file: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  fs.renameSync(tmp, file);
}

function appendJsonl(file: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(file, "a", 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(value) + "\n");
    try {
      fs.fdatasyncSync(fd);
    } catch (error) {
      recordPilotBestEffortFailure("append-jsonl-fdatasync", error, { file });
    }
  } finally {
    fs.closeSync(fd);
  }
}

function appendAudit(event: JsonObject, raw?: string): void {
  appendJsonl(auditFile(raw), {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    at_ms: Date.now(),
    ...event,
  });
}

function readJson(file: string): JsonObject | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    recordPilotBestEffortFailure("read-json", error, { file });
    return null;
  }
}

function ticketFile(dir: string, ticketId: string): string {
  return path.join(dir, `${ticketId}.json`);
}

function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeHexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function safeAccount(raw: unknown): string {
  const value = String(raw || "").trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : "";
}

function safeId(raw: unknown, max = 180): string {
  const value = String(raw || "").trim();
  if (!value || value.length > max) return "";
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : "";
}

function safeNodeId(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(value) ? value : "";
}

function safeHex64(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(value) ? value : "";
}

function safeTransportMode(raw: unknown): PilotTransportMode | "" {
  const value = String(raw || "").trim();
  return value === "inbound_fetch" || value === "outbound_bundle"
    ? value
    : "";
}

function ticketTransportMode(
  record: Partial<PilotTicketRecord>,
): PilotTransportMode {
  const explicit = safeTransportMode(record.transport_mode);
  if (explicit) return explicit;
  return safeHttpBase(record.executor_http_base)
    ? "inbound_fetch"
    : "outbound_bundle";
}

function safeHttpBase(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value || value.length > 240) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return "";
    if (parsed.pathname && parsed.pathname !== "/") return "";
    return parsed.origin;
  } catch (error) {
    recordPilotBestEffortFailure("safe-http-base", error, { value });
    return "";
  }
}

function clampInt(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function coordinatorEnabled(): boolean {
  return String(process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED || "") === "1";
}

function executorEnabled(): boolean {
  return String(process.env.VOID_WC_PUBLIC_EARNING_EXECUTOR_ENABLED || "") === "1";
}

function defaultTtlMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_TTL_MS,
    15 * 60_000,
    60_000,
    60 * 60_000,
  );
}

function maxTtlMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_MAX_TTL_MS,
    60 * 60_000,
    60_000,
    24 * 60 * 60_000,
  );
}

function globalCap(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_GLOBAL_CAP,
    10,
    1,
    10_000,
  );
}

function perAccountCap(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_PER_ACCOUNT_CAP,
    1,
    1,
    100,
  );
}

function ticketLockStaleMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_LOCK_STALE_MS,
    5 * 60_000,
    60_000,
    60 * 60_000,
  );
}

function receiptTimestampSkewMs(): number {
  return clampInt(
    process.env.VOID_WC_PUBLIC_EARNING_PILOT_RECEIPT_CLOCK_SKEW_MS,
    5 * 60_000,
    0,
    15 * 60_000,
  );
}

function loopbackOnly(req: any): boolean {
  const remote = String(
    req?.socket?.remoteAddress ||
      req?.connection?.remoteAddress ||
      req?.ip ||
      "",
  )
    .trim()
    .toLowerCase();
  return (
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1" ||
    remote === "localhost"
  );
}

function requireConfirmedLocalMutation(
  req: any,
  res: any,
  confirmation: string,
): boolean {
  if (!loopbackOnly(req)) {
    res.status(403).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "loopback_required",
    });
    return false;
  }
  const dry = String(req?.query?.dry || "");
  const confirm = String(req?.query?.confirm || "");
  if (dry !== "0" || confirm !== confirmation) {
    res.status(428).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "explicit_confirmation_required",
      required: confirmation,
    });
    return false;
  }
  return true;
}

function ticketCounts(now = Date.now(), raw?: string): {
  active: number;
  consumed: number;
  accountCounts: Record<string, number>;
  executorCounts: Record<string, number>;
} {
  let active = 0;
  let consumed = 0;
  const accountCounts: Record<string, number> = {};
  const executorCounts: Record<string, number> = {};

  for (const [dir, isConsumed] of [
    [issuedDir(raw), false],
    [consumedDir(raw), true],
  ] as const) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const record = readJson(path.join(dir, name));
      if (!record) continue;
      if (!isConsumed && Number(record.expires_at_ms || 0) <= now) continue;
      if (isConsumed) consumed += 1;
      else active += 1;
      const account = safeAccount(record.account);
      const executor = safeNodeId(record.executor_node_id);
      if (account) accountCounts[account] = Number(accountCounts[account] || 0) + 1;
      if (executor) executorCounts[executor] = Number(executorCounts[executor] || 0) + 1;
    }
  }

  return { active, consumed, accountCounts, executorCounts };
}

function issueTicket(input: JsonObject, raw?: string): JsonObject {
  ensureDirs(raw);
  const account = safeAccount(input.account);
  const executorNodeId = safeNodeId(input.executor_node_id);
  const transportMode = safeTransportMode(
    input.transport_mode || "inbound_fetch",
  );
  const executorHttpBase = safeHttpBase(input.executor_http_base);
  const executorHttpBaseRaw = String(input.executor_http_base || "").trim();
  const datasetId = safeId(input.dataset_id, 160);
  const expectedInputHash = safeHex64(input.expected_input_hash);
  const taskClass = String(
    input.task_class || VOID_WC_PUBLIC_EARNING_PILOT_TASK,
  ).trim();

  if (!account) throw new Error("invalid_account");
  if (!executorNodeId) throw new Error("invalid_executor_node_id");
  if (!transportMode) throw new Error("invalid_transport_mode");
  if (transportMode === "inbound_fetch" && !executorHttpBase) {
    throw new Error("invalid_executor_http_base");
  }
  if (transportMode === "outbound_bundle" && executorHttpBaseRaw) {
    throw new Error("outbound_executor_http_base_forbidden");
  }
  if (!datasetId) throw new Error("invalid_dataset_id");
  if (!expectedInputHash) throw new Error("invalid_expected_input_hash");
  if (taskClass !== VOID_WC_PUBLIC_EARNING_PILOT_TASK) {
    throw new Error("task_class_not_allowlisted");
  }

  const counts = ticketCounts(Date.now(), raw);
  if (counts.active + counts.consumed >= globalCap()) {
    throw new Error("global_cap_reached");
  }
  if (Number(counts.accountCounts[account] || 0) >= perAccountCap()) {
    throw new Error("account_cap_reached");
  }
  if (Number(counts.executorCounts[executorNodeId] || 0) >= perAccountCap()) {
    throw new Error("executor_cap_reached");
  }

  const ttlMs = clampInt(input.ttl_ms, defaultTtlMs(), 60_000, maxTtlMs());
  const ticketId = crypto.randomBytes(16).toString("hex");
  const secret = crypto.randomBytes(32).toString("base64url");
  const token = `wcep1.${ticketId}.${secret}`;
  const now = Date.now();

  const record: PilotTicketRecord = {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    version: 1,
    ticket_id: ticketId,
    account,
    task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
    executor_node_id: executorNodeId,
    executor_http_base: transportMode === "inbound_fetch" ? executorHttpBase : "",
    transport_mode: transportMode,
    dataset_id: datasetId,
    expected_input_hash: expectedInputHash,
    token_sha256: sha256Hex(token),
    nonce: crypto.randomBytes(16).toString("hex"),
    issued_at_ms: now,
    expires_at_ms: now + ttlMs,
    max_uses: 1,
    status: "issued",
    public_submit_route: PUBLIC_SUBMIT_ROUTE,
    local_execute_route: LOCAL_EXECUTE_ROUTE,
  };

  atomicWriteJson(
    ticketFile(issuedDir(raw), ticketId),
    record as unknown as JsonObject,
  );
  appendAudit(
    {
      event: "issued",
      ticket_id: ticketId,
      account,
      executor_node_id: executorNodeId,
      executor_http_base: record.executor_http_base,
      transport_mode: transportMode,
      dataset_id: datasetId,
      expires_at_ms: record.expires_at_ms,
    },
    raw,
  );

  return {
    ...record,
    capability_token: token,
    capability_token_returned_once: true,
    operator_issued: true,
    fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    participant_selected_award: false,
    money_movement: false,
  };
}

function bearerOrBodyToken(req: any): string {
  const header = String(req?.headers?.authorization || "");
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return String(match?.[1] || req?.body?.capability_token || "").trim();
}

function parseToken(raw: string): {
  token: string;
  ticketId: string;
} | null {
  const token = String(raw || "").trim();
  const match = /^wcep1\.([0-9a-f]{32})\.([A-Za-z0-9_-]{20,})$/.exec(token);
  if (!match) return null;
  return { token, ticketId: match[1] };
}

export function pilotResultSigningObject(
  raw: Partial<PilotResultEnvelope>,
): PilotResultEnvelope {
  const executorHttpBase = safeHttpBase(raw.executor_http_base);
  const transportMode = safeTransportMode(
    raw.transport_mode ||
      (executorHttpBase ? "inbound_fetch" : "outbound_bundle"),
  );
  const envelope: PilotResultEnvelope = {
    domain: "void:mainnet-0:wc-public-earning-pilot-v1",
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    version: 1,
    ticket_id: safeId(raw.ticket_id, 64),
    account: safeAccount(raw.account),
    task_class: String(raw.task_class || "").trim(),
    executor_node_id: safeNodeId(raw.executor_node_id),
    executor_pubkey: String(raw.executor_pubkey || ""),
    executor_http_base: executorHttpBase,
    transport_mode: transportMode as PilotTransportMode,
    dataset_id: safeId(raw.dataset_id, 160),
    expected_input_hash: safeHex64(raw.expected_input_hash),
    job_id: safeId(raw.job_id, 160),
    receipt_id: safeId(raw.receipt_id, 180),
    input_hash: safeHex64(raw.input_hash),
    output_hash: safeHex64(raw.output_hash),
    fetched_input_hash: safeHex64(raw.fetched_input_hash),
    receipt_ts_ms: Math.trunc(Number(raw.receipt_ts_ms || 0)),
  };

  if (!/^[0-9a-f]{32}$/.test(envelope.ticket_id)) {
    throw new Error("invalid_ticket_id");
  }
  if (!envelope.account) throw new Error("invalid_account");
  if (envelope.task_class !== VOID_WC_PUBLIC_EARNING_PILOT_TASK) {
    throw new Error("task_class_not_allowlisted");
  }
  if (!envelope.executor_node_id) throw new Error("invalid_executor_node_id");
  if (!envelope.executor_pubkey.includes("BEGIN PUBLIC KEY")) {
    throw new Error("invalid_executor_pubkey");
  }
  if (!envelope.transport_mode) throw new Error("invalid_transport_mode");
  if (
    envelope.transport_mode === "inbound_fetch" &&
    !envelope.executor_http_base
  ) {
    throw new Error("invalid_executor_http_base");
  }
  if (
    envelope.transport_mode === "outbound_bundle" &&
    envelope.executor_http_base
  ) {
    throw new Error("outbound_executor_http_base_forbidden");
  }
  if (!envelope.dataset_id) throw new Error("invalid_dataset_id");
  if (!envelope.expected_input_hash) throw new Error("invalid_expected_input_hash");
  if (!envelope.job_id) throw new Error("invalid_job_id");
  if (!envelope.receipt_id) throw new Error("invalid_receipt_id");
  if (!envelope.input_hash) throw new Error("invalid_input_hash");
  if (!envelope.output_hash) throw new Error("invalid_output_hash");
  if (!envelope.fetched_input_hash) throw new Error("invalid_fetched_input_hash");
  if (!Number.isFinite(envelope.receipt_ts_ms) || envelope.receipt_ts_ms <= 0) {
    throw new Error("invalid_receipt_timestamp");
  }
  return envelope;
}

export function pilotResultSigningBytes(
  raw: Partial<PilotResultEnvelope>,
): Buffer {
  return Buffer.from(JSON.stringify(pilotResultSigningObject(raw)), "utf8");
}

export function signPilotResultEnvelope(
  raw: Partial<PilotResultEnvelope>,
  privateKey: crypto.KeyObject,
): { envelope: PilotResultEnvelope; signature: JsonObject } {
  const envelope = pilotResultSigningObject(raw);
  const sig = crypto
    .sign(null, pilotResultSigningBytes(envelope), privateKey)
    .toString("hex");
  return {
    envelope,
    signature: {
      alg: "ed25519",
      key_id: envelope.executor_node_id,
      sig,
    },
  };
}

export function verifyPilotResultEnvelope(
  raw: Partial<PilotResultEnvelope>,
  signatureRaw: JsonObject,
): PilotResultEnvelope {
  const envelope = pilotResultSigningObject(raw);
  if (String(signatureRaw?.alg || "") !== "ed25519") {
    throw new Error("signature_algorithm_not_allowed");
  }
  if (safeNodeId(signatureRaw?.key_id) !== envelope.executor_node_id) {
    throw new Error("signature_key_id_mismatch");
  }
  const sig = String(signatureRaw?.sig || "").trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(sig)) {
    throw new Error("invalid_signature_shape");
  }
  if (nodeIdFromPubPEM(envelope.executor_pubkey) !== envelope.executor_node_id) {
    throw new Error("executor_pubkey_node_id_mismatch");
  }
  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey(envelope.executor_pubkey);
  } catch (error) {
    recordPilotBestEffortFailure("executor-public-key-parse", error);
    throw new Error("invalid_executor_pubkey");
  }
  const ok = crypto.verify(
    null,
    pilotResultSigningBytes(envelope),
    publicKey,
    Buffer.from(sig, "hex"),
  );
  if (!ok) throw new Error("executor_signature_invalid");
  return envelope;
}

async function fetchJson(
  url: string,
  init?: RequestInit,
  timeoutMs = 30_000,
): Promise<JsonObject> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...(init || {}),
      signal: controller.signal,
    });
    const text = await response.text();
    let body: any = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch (error) {
      recordPilotBestEffortFailure("fetch-json-parse", error, { url });
      body = {
        ok: false,
        error: "non_json_response",
        raw: text.slice(0, 500),
      };
    }
    if (!response.ok) {
      const error: any = new Error(String(body?.error || `http_${response.status}`));
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function findObject(
  value: any,
  predicate: (candidate: JsonObject) => boolean,
  depth = 0,
): JsonObject | null {
  if (!value || depth > 12) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    if (predicate(value)) return value;
    for (const child of Object.values(value)) {
      const found = findObject(child, predicate, depth + 1);
      if (found) return found;
    }
  } else if (Array.isArray(value)) {
    for (const child of value) {
      const found = findObject(child, predicate, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findJobId(value: any): string {
  const object = findObject(value, (candidate) => {
    const id = safeId(candidate.job_id || candidate.id, 160);
    if (!id) return false;
    if (candidate.receipt_id && !candidate.job_id) return false;
    return true;
  });
  return safeId(object?.job_id || object?.id, 160);
}

function findVerifiedReceipt(
  value: any,
  expectedReceiptId = "",
): JsonObject | null {
  return findObject(value, (candidate) => {
    const receiptId = safeId(candidate.receipt_id || candidate.id, 180);
    if (!receiptId) return false;
    if (expectedReceiptId && receiptId !== expectedReceiptId) return false;
    return (
      String(candidate.kind || "") === VOID_WC_PUBLIC_EARNING_PILOT_TASK &&
      String(candidate.status || "").toLowerCase() === "completed" &&
      candidate?.output?.verified === true
    );
  });
}

function normalizedRemoteJob(
  value: any,
  expectedJobId: string,
): JsonObject | null {
  let best: JsonObject | null = null;
  let bestScore = -1;

  const walk = (candidate: any, depth = 0): void => {
    if (!candidate || depth > 12) return;
    if (Array.isArray(candidate)) {
      for (const child of candidate) walk(child, depth + 1);
      return;
    }
    if (typeof candidate !== "object") return;

    const id = safeId(candidate.job_id || candidate.id, 160);
    if (id === expectedJobId) {
      let score = 0;
      if (candidate.account || candidate.who) score += 3;
      if (candidate.kind) score += 3;
      if (candidate.dataset_id || candidate.selected_dataset_id) score += 3;
      if (candidate.input && typeof candidate.input === "object") score += 2;
      if (candidate.meta && typeof candidate.meta === "object") score += 1;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    for (const child of Object.values(candidate)) {
      walk(child, depth + 1);
    }
  };

  walk(value);
  return best;
}

export function assertPilotTicketEnvelopeMatch(
  record: PilotTicketRecord,
  envelope: PilotResultEnvelope,
): void {
  const checks: Array<[string, string, string]> = [
    ["ticket_id", envelope.ticket_id, record.ticket_id],
    ["account", envelope.account, record.account],
    ["task_class", envelope.task_class, record.task_class],
    ["executor_node_id", envelope.executor_node_id, record.executor_node_id],
    ["executor_http_base", envelope.executor_http_base, record.executor_http_base],
    ["transport_mode", envelope.transport_mode, ticketTransportMode(record)],
    ["dataset_id", envelope.dataset_id, record.dataset_id],
    ["expected_input_hash", envelope.expected_input_hash, record.expected_input_hash],
  ];
  for (const [field, actual, expected] of checks) {
    if (actual !== expected) throw new Error(`ticket_${field}_mismatch`);
  }
  if (
    envelope.input_hash !== record.expected_input_hash ||
    envelope.fetched_input_hash !== record.expected_input_hash
  ) {
    throw new Error("verified_input_hash_mismatch");
  }

  const skewMs = receiptTimestampSkewMs();
  const now = Date.now();
  const earliestAllowed = Number(record.issued_at_ms || 0) - skewMs;
  const latestAllowed = Math.min(
    Number(record.expires_at_ms || 0) + skewMs,
    now + skewMs,
  );
  if (envelope.receipt_ts_ms < earliestAllowed) {
    throw new Error("receipt_timestamp_before_ticket");
  }
  if (envelope.receipt_ts_ms > latestAllowed) {
    throw new Error("receipt_timestamp_after_ticket");
  }
}

function parsedJobPlaintext(job: JsonObject): JsonObject {
  const raw = String(
    job.plaintext ||
      job?.input?.plaintext ||
      job?.input?.input?.plaintext ||
      "",
  ).trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    recordPilotBestEffortFailure("remote-job-plaintext-parse", error, {
      job_id: safeId(job.job_id || job.id, 160),
    });
    return {};
  }
}

export function assertRemoteJobTruth(
  raw: JsonObject,
  envelope: PilotResultEnvelope,
): void {
  const job = normalizedRemoteJob(raw, envelope.job_id);
  if (!job) throw new Error("remote_job_missing");
  const plaintext = parsedJobPlaintext(job);
  const account = safeAccount(
    job.account ||
      job.who ||
      job?.input?.account ||
      job?.input?.who ||
      job?.input?.input?.account ||
      job?.input?.input?.who,
  );
  const kind = String(
    job.kind ||
      job?.input?.kind ||
      job?.input?.input?.kind ||
      "",
  ).trim();
  const meta =
    (job?.meta && typeof job.meta === "object" ? job.meta : null) ||
    (job?.input?.meta && typeof job.input.meta === "object"
      ? job.input.meta
      : null) ||
    (job?.input?.input?.meta && typeof job.input.input.meta === "object"
      ? job.input.input.meta
      : null) ||
    {};
  const datasetId = safeId(
    job.dataset_id ||
      job.selected_dataset_id ||
      job?.input?.dataset_id ||
      job?.input?.input?.dataset_id ||
      meta.selected_dataset_id ||
      plaintext.dataset_id,
    160,
  );
  const expectedInputHash = safeHex64(
    plaintext.expected_input_hash ||
      job.expected_input_hash ||
      job?.input?.expected_input_hash ||
      job?.input?.input?.expected_input_hash,
  );
  const capabilityTicketId = safeId(
    plaintext.capability_ticket_id ||
      meta.capability_ticket_id ||
      job.capability_ticket_id ||
      job?.input?.capability_ticket_id ||
      job?.input?.input?.capability_ticket_id,
    64,
  );
  const executorNodeId = safeNodeId(
    plaintext.executor_node_id ||
      meta.executor_node_id ||
      job.executor_node_id ||
      job?.input?.executor_node_id ||
      job?.input?.input?.executor_node_id,
  );
  if (account !== envelope.account) throw new Error("remote_job_account_mismatch");
  if (kind !== envelope.task_class) throw new Error("remote_job_task_mismatch");
  if (datasetId !== envelope.dataset_id) {
    throw new Error("remote_job_dataset_mismatch");
  }
  if (expectedInputHash !== envelope.expected_input_hash) {
    throw new Error("remote_job_expected_input_hash_mismatch");
  }
  if (capabilityTicketId !== envelope.ticket_id) {
    throw new Error("remote_job_capability_ticket_mismatch");
  }
  if (executorNodeId !== envelope.executor_node_id) {
    throw new Error("remote_job_executor_node_mismatch");
  }
}

export function assertRemoteReceiptTruth(
  receipt: JsonObject,
  envelope: PilotResultEnvelope,
): void {
  const account = safeAccount(receipt.account || receipt.who || receipt.owner);
  const jobId = safeId(receipt.job_id, 160);
  const receiptId = safeId(receipt.receipt_id || receipt.id, 180);
  const datasetId = safeId(receipt.dataset_id || receipt.selected_dataset_id, 160);
  const kind = String(receipt.kind || "").trim();
  const status = String(receipt.status || "").trim().toLowerCase();
  const inputHash = safeHex64(receipt.input_hash);
  const outputHash = safeHex64(receipt.output_hash);
  const fetchedInputHash = safeHex64(receipt?.output?.fetched_input_hash);
  const receiptTsMs = Math.trunc(Number(receipt?.ts_ms || 0));
  if (!Number.isFinite(receiptTsMs) || receiptTsMs <= 0) {
    throw new Error("remote_receipt_timestamp_invalid");
  }

  const checks: Array<[string, string, string]> = [
    ["account", account, envelope.account],
    ["job_id", jobId, envelope.job_id],
    ["receipt_id", receiptId, envelope.receipt_id],
    ["dataset_id", datasetId, envelope.dataset_id],
    ["kind", kind, envelope.task_class],
    ["status", status, "completed"],
    ["input_hash", inputHash, envelope.input_hash],
    ["output_hash", outputHash, envelope.output_hash],
    ["fetched_input_hash", fetchedInputHash, envelope.fetched_input_hash],
  ];
  for (const [field, actual, expected] of checks) {
    if (actual !== expected) throw new Error(`remote_receipt_${field}_mismatch`);
  }
  if (receiptTsMs !== envelope.receipt_ts_ms) {
    throw new Error("remote_receipt_timestamp_mismatch");
  }
  if (receipt?.output?.verified !== true) {
    throw new Error("remote_receipt_not_verified");
  }
}

function readJsonlMatches(
  file: string,
  predicate: (value: JsonObject) => boolean,
): JsonObject[] {
  if (!fs.existsSync(file)) return [];
  const out: JsonObject[] = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (predicate(value)) out.push(value);
    } catch (error) {
      recordPilotBestEffortFailure("read-jsonl-line", error, { file });
    }
  }
  return out;
}

function appendExactOnce(
  file: string,
  value: JsonObject,
  idFields: string[],
): { appended: boolean; existing: JsonObject | null } {
  const keys = idFields.map((field) => String(value?.[field] || ""));
  const matches = readJsonlMatches(file, (candidate) =>
    idFields.every(
      (field, index) => String(candidate?.[field] || "") === keys[index],
    ),
  );
  if (matches.length > 1) throw new Error("remote_truth_duplicate_conflict");
  if (matches.length === 1) {
    const existing = matches[0];
    for (const field of [
      "account",
      "job_id",
      "receipt_id",
      "dataset_id",
      "kind",
      "status",
      "input_hash",
      "output_hash",
    ]) {
      if (
        value[field] !== undefined &&
        String(existing?.[field] || "") !== String(value?.[field] || "")
      ) {
        throw new Error(`remote_truth_${field}_conflict`);
      }
    }
    return { appended: false, existing };
  }
  appendJsonl(file, value);
  return { appended: true, existing: null };
}

export function persistImportedRemoteTruthOnce(
  envelopeRaw: Partial<PilotResultEnvelope>,
  signatureRaw: JsonObject,
  raw?: string,
): JsonObject {
  const envelope = verifyPilotResultEnvelope(envelopeRaw, signatureRaw);
  const dataDir = resolveDataDir(raw);
  const importedAt = Date.now();
  const provenance = {
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    capability_ticket_id: envelope.ticket_id,
    executor_node_id: envelope.executor_node_id,
    executor_http_base: envelope.executor_http_base,
    transport_mode: envelope.transport_mode,
    coordinator_inbound_fetch: envelope.transport_mode === "inbound_fetch",
    participant_outbound_bundle: envelope.transport_mode === "outbound_bundle",
    executor_signature_sha256: sha256Hex(String(signatureRaw?.sig || "")),
    verified_remote_health: true,
    verified_remote_job: true,
    verified_remote_receipt: true,
    imported_at_ms: importedAt,
  };

  const receipt: JsonObject = {
    receipt_id: envelope.receipt_id,
    job_id: envelope.job_id,
    account: envelope.account,
    kind: envelope.task_class,
    status: "completed",
    dataset_id: envelope.dataset_id,
    input_hash: envelope.input_hash,
    output_hash: envelope.output_hash,
    output: {
      verified: true,
      fetched_input_hash: envelope.fetched_input_hash,
    },
    ts_ms: envelope.receipt_ts_ms,
    remote_executor_provenance: provenance,
  };

  const job: JsonObject = {
    id: envelope.job_id,
    job_id: envelope.job_id,
    account: envelope.account,
    kind: envelope.task_class,
    status: "queued",
    dataset_id: envelope.dataset_id,
    selected_dataset_id: envelope.dataset_id,
    meta: {
      selection_reason: "wc_public_earning_pilot_v1",
      capability_ticket_id: envelope.ticket_id,
      executor_node_id: envelope.executor_node_id,
    },
    remote_executor_provenance: provenance,
  };

  const completed: JsonObject = {
    job_id: envelope.job_id,
    status: "completed",
    receipt_id: envelope.receipt_id,
    dataset_id: envelope.dataset_id,
    input_hash: envelope.input_hash,
    output_hash: envelope.output_hash,
    verified: true,
    completed_at_ms: envelope.receipt_ts_ms,
    remote_executor_provenance: provenance,
  };

  const receiptResult = appendExactOnce(
    path.join(dataDir, "agent_v1", "receipts.jsonl"),
    receipt,
    ["receipt_id"],
  );
  const jobResult = appendExactOnce(
    path.join(dataDir, "agent", "jobs.jsonl"),
    job,
    ["job_id"],
  );
  const completedResult = appendExactOnce(
    path.join(dataDir, "agent_v1", "job_state.jsonl"),
    completed,
    ["job_id", "receipt_id"],
  );

  return {
    envelope,
    receipt,
    job,
    completed,
    appended: {
      receipt: receiptResult.appended,
      job: jobResult.appended,
      completed: completedResult.appended,
    },
  };
}

export async function verifyPilotSubmissionEvidence(
  record: PilotTicketRecord,
  envelope: PilotResultEnvelope,
  proofBundleRaw?: JsonObject,
): Promise<{
  transportMode: PilotTransportMode;
  health: JsonObject;
  job: JsonObject;
  receipt: JsonObject;
  coordinatorInboundFetch: boolean;
  participantOutboundBundle: boolean;
}> {
  const transportMode = ticketTransportMode(record);

  if (transportMode === "outbound_bundle") {
    const proofBundle = isJsonObject(proofBundleRaw)
      ? proofBundleRaw
      : {};
    if (
      proofBundle.marker !== VOID_WC_PUBLIC_EARNING_PILOT_MARKER ||
      Number(proofBundle.version || 0) !== 1 ||
      safeTransportMode(proofBundle.transport_mode) !== "outbound_bundle" ||
      safeId(proofBundle.ticket_id, 64) !== envelope.ticket_id ||
      safeNodeId(proofBundle.executor_node_id) !==
        envelope.executor_node_id ||
      safeId(proofBundle.job_id, 160) !== envelope.job_id ||
      safeId(proofBundle.receipt_id, 180) !== envelope.receipt_id
    ) {
      throw new Error("outbound_proof_bundle_invalid");
    }

    const health = isJsonObject(proofBundle.health)
      ? proofBundle.health
      : {};
    const job = isJsonObject(proofBundle.job)
      ? proofBundle.job
      : {};
    const receiptCandidate = isJsonObject(proofBundle.receipt)
      ? proofBundle.receipt
      : {};

    if (health?.ok !== true) {
      throw new Error("outbound_health_not_ok");
    }
    if (safeNodeId(health?.nodeId) !== record.executor_node_id) {
      throw new Error("outbound_health_node_id_mismatch");
    }
    assertRemoteJobTruth(job, envelope);
    const receipt = findVerifiedReceipt(
      receiptCandidate,
      envelope.receipt_id,
    );
    if (!receipt) throw new Error("outbound_receipt_missing");
    assertRemoteReceiptTruth(receipt, envelope);

    return {
      transportMode,
      health,
      job,
      receipt,
      coordinatorInboundFetch: false,
      participantOutboundBundle: true,
    };
  }

  const health = await fetchJson(
    `${record.executor_http_base}/health`,
    undefined,
    10_000,
  );
  if (safeNodeId(health?.nodeId) !== record.executor_node_id) {
    throw new Error("remote_health_node_id_mismatch");
  }

  const job = await fetchJson(
    `${record.executor_http_base}/jobs/${encodeURIComponent(envelope.job_id)}`,
    undefined,
    15_000,
  );
  assertRemoteJobTruth(job, envelope);

  const remoteReceipts = await fetchJson(
    `${record.executor_http_base}/receipts` +
      `?account=${encodeURIComponent(record.account)}&limit=50`,
    undefined,
    15_000,
  );
  const receipt = findVerifiedReceipt(
    remoteReceipts,
    envelope.receipt_id,
  );
  if (!receipt) throw new Error("remote_receipt_missing");
  assertRemoteReceiptTruth(receipt, envelope);

  return {
    transportMode,
    health,
    job,
    receipt,
    coordinatorInboundFetch: true,
    participantOutboundBundle: false,
  };
}

export async function acquirePilotTicketLock(
  ticketIdRaw: string,
  raw?: string,
): Promise<{ file: string; handle: fsp.FileHandle }> {
  const ticketId = safeId(ticketIdRaw, 64);
  if (!/^[0-9a-f]{32}$/.test(ticketId)) {
    throw new Error("invalid_ticket_id");
  }
  ensureDirs(raw);
  const file = path.join(locksDir(raw), `${ticketId}.lock`);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let handle: fsp.FileHandle | null = null;
    try {
      handle = await fsp.open(file, "wx", 0o600);
      await handle.writeFile(
        JSON.stringify({
          marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
          ticket_id: ticketId,
          pid: process.pid,
          created_at_ms: Date.now(),
        }) + "\n",
        "utf8",
      );
      return { file, handle };
    } catch (error: any) {
      if (handle) {
        try {
          await handle.close();
        } catch (closeError) {
          recordPilotBestEffortFailure("ticket-lock-open-cleanup-close", closeError, {
            file,
          });
        }
        try {
          await fsp.unlink(file);
        } catch (unlinkError: any) {
          if (String(unlinkError?.code || "") !== "ENOENT") {
            recordPilotBestEffortFailure(
              "ticket-lock-open-cleanup-unlink",
              unlinkError,
              { file },
            );
          }
        }
      }

      if (String(error?.code || "") !== "EEXIST") throw error;

      let createdAt = 0;
      let modifiedAt = 0;
      try {
        const current = JSON.parse(await fsp.readFile(file, "utf8"));
        createdAt = Number(current?.created_at_ms || 0);
      } catch (readError: any) {
        if (String(readError?.code || "") === "ENOENT") continue;
        recordPilotBestEffortFailure("ticket-lock-stale-read", readError, {
          file,
          ticket_id: ticketId,
        });
      }
      try {
        modifiedAt = Number((await fsp.stat(file)).mtimeMs || 0);
      } catch (statError: any) {
        if (String(statError?.code || "") === "ENOENT") continue;
        recordPilotBestEffortFailure("ticket-lock-stale-stat", statError, {
          file,
          ticket_id: ticketId,
        });
      }

      const anchor = Math.max(createdAt, modifiedAt);
      const ageMs = anchor > 0 ? Math.max(0, Date.now() - anchor) : 0;
      if (attempt === 0 && anchor > 0 && ageMs > ticketLockStaleMs()) {
        try {
          await fsp.unlink(file);
          appendAudit(
            {
              event: "stale_lock_recovered",
              ticket_id: ticketId,
              stale_age_ms: ageMs,
            },
            raw,
          );
          continue;
        } catch (unlinkError: any) {
          if (String(unlinkError?.code || "") === "ENOENT") continue;
          throw unlinkError;
        }
      }
      throw new Error("ticket_inflight");
    }
  }
  throw new Error("ticket_inflight");
}

export async function releasePilotTicketLock(lock: {
  file: string;
  handle: fsp.FileHandle;
}): Promise<void> {
  try {
    await lock.handle.close();
  } finally {
    try {
      await fsp.unlink(lock.file);
    } catch (error) {
      recordPilotBestEffortFailure("release-ticket-lock", error, {
        file: lock.file,
      });
    }
  }
}

function completeTicket(
  record: PilotTicketRecord,
  patch: JsonObject,
  raw?: string,
): JsonObject {
  const completed = {
    ...record,
    ...patch,
    status: "completed",
    completed_at_ms: Date.now(),
  };
  const consumedPath = ticketFile(consumedDir(raw), record.ticket_id);
  atomicWriteJson(consumedPath, completed);
  try {
    fs.unlinkSync(ticketFile(issuedDir(raw), record.ticket_id));
  } catch (error) {
    recordPilotBestEffortFailure("complete-ticket-issued-cleanup", error, {
      ticket_id: record.ticket_id,
    });
  }
  return completed;
}

async function executeLocalWork(req: any, res: any): Promise<any> {
  if (!executorEnabled()) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_lane_disabled",
    });
  }
  if (
    !requireConfirmedLocalMutation(
      req,
      res,
      "wcPublicEarningPilotExecuteLocal",
    )
  ) {
    return;
  }

  const ticket = req?.body?.ticket || {};
  const token = bearerOrBodyToken(req);
  const coordinatorBase = safeHttpBase(req?.body?.coordinator_base);
  const account = safeAccount(ticket.account);
  const executorNodeId = safeNodeId(ticket.executor_node_id);
  const datasetId = safeId(ticket.dataset_id, 160);
  const expectedInputHash = safeHex64(ticket.expected_input_hash);
  const ticketId = safeId(ticket.ticket_id, 64);
  const transportMode = ticketTransportMode(ticket);
  const expiresAt = Number(ticket.expires_at_ms || 0);

  const parsedToken = parseToken(token);
  if (!parsedToken || parsedToken.ticketId !== ticketId) {
    return res.status(401).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_capability",
    });
  }
  if (!coordinatorBase) {
    return res.status(400).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_coordinator_base",
    });
  }
  if (
    !account ||
    !executorNodeId ||
    !datasetId ||
    !expectedInputHash ||
    !/^[0-9a-f]{32}$/.test(ticketId)
  ) {
    return res.status(400).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_ticket",
    });
  }
  if (expiresAt <= Date.now()) {
    return res.status(410).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "capability_expired",
    });
  }

  const node: any =
    (globalThis as any).__void_node ||
    (globalThis as any).node ||
    (globalThis as any).VOID_NODE;
  const liveNodeId = safeNodeId(node?.id);
  if (!liveNodeId || liveNodeId !== executorNodeId) {
    return res.status(403).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_node_binding_mismatch",
      local_node_id: liveNodeId || null,
    });
  }

  const keyPathRaw = String(
    process.env.NODE_PRIVKEY_PATH ||
      process.env.KEY_FILE ||
      process.env.VOID_NODE_KEY_A ||
      "",
  ).trim();
  if (!keyPathRaw) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_key_unavailable",
    });
  }
  const keyPath = path.resolve(keyPathRaw);
  if (!fs.existsSync(keyPath)) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_key_unavailable",
    });
  }
  const kp = loadKeypair(keyPath);
  if (kp.nodeId !== executorNodeId) {
    return res.status(403).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "executor_key_node_binding_mismatch",
    });
  }

  const port = String(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100");
  const localBase = `http://127.0.0.1:${port}`;
  const plaintext = JSON.stringify({
    dataset_id: datasetId,
    expected_input_hash: expectedInputHash,
    stale_for_ms: 600_000,
    difficulty_bucket: "high",
    network_need_score: 1,
    capability_ticket_id: ticketId,
    executor_node_id: executorNodeId,
  });

  const submitted = await fetchJson(
    `${localBase}/jobs/submit?dry=0&confirm=jobsSubmit`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account,
        kind: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
        plaintext,
        meta: {
          selection_reason: "wc_public_earning_pilot_v1",
          selected_task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
          selected_dataset_id: datasetId,
          selected_difficulty_bucket: "high",
          selected_network_need_score: 1,
          selected_stale_for_ms: 600_000,
          safe_mode: true,
          capability_ticket_id: ticketId,
          executor_node_id: executorNodeId,
        },
      }),
    },
    15_000,
  );

  const jobId = findJobId(submitted);
  if (!jobId) throw new Error("local_job_submit_missing_job_id");

  const worked = await fetchJson(
    `${localBase}/__void/jobs-and-datanet-worker/run-once` +
      `?account=${encodeURIComponent(account)}` +
      `&job_id=${encodeURIComponent(jobId)}` +
      `&dry=0&confirm=jobsWorkerRunOnce`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account, job_id: jobId }),
    },
    60_000,
  );

  const receipt = findVerifiedReceipt(worked);
  if (!receipt) throw new Error("local_verified_receipt_missing");
  const receiptId = safeId(receipt.receipt_id || receipt.id, 180);
  const receiptJobId = safeId(receipt.job_id, 160);
  const receiptAccount = safeAccount(receipt.account || receipt.who || receipt.owner);
  const receiptDatasetId = safeId(
    receipt.dataset_id || receipt.selected_dataset_id,
    160,
  );
  const inputHash = safeHex64(receipt.input_hash);
  const outputHash = safeHex64(receipt.output_hash);
  const fetchedInputHash = safeHex64(receipt?.output?.fetched_input_hash);
  const receiptTs = Math.trunc(Number(receipt.ts_ms || 0));
  if (!Number.isFinite(receiptTs) || receiptTs <= 0) {
    throw new Error("local_receipt_timestamp_invalid");
  }

  if (receiptJobId !== jobId) throw new Error("local_receipt_job_mismatch");
  if (receiptAccount !== account) throw new Error("local_receipt_account_mismatch");
  if (receiptDatasetId !== datasetId) throw new Error("local_receipt_dataset_mismatch");
  if (
    inputHash !== expectedInputHash ||
    fetchedInputHash !== expectedInputHash
  ) {
    throw new Error("local_receipt_input_hash_mismatch");
  }
  if (!outputHash) throw new Error("local_receipt_output_hash_invalid");

  const executorHttpBase = safeHttpBase(ticket.executor_http_base);
  if (transportMode === "inbound_fetch" && !executorHttpBase) {
    throw new Error("invalid_executor_http_base");
  }
  if (transportMode === "outbound_bundle" && executorHttpBase) {
    throw new Error("outbound_executor_http_base_forbidden");
  }

  const signed = signPilotResultEnvelope(
    {
      ticket_id: ticketId,
      account,
      task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
      executor_node_id: executorNodeId,
      executor_pubkey: kp.pubPEM,
      executor_http_base: executorHttpBase,
      transport_mode: transportMode,
      dataset_id: datasetId,
      expected_input_hash: expectedInputHash,
      job_id: jobId,
      receipt_id: receiptId,
      input_hash: inputHash,
      output_hash: outputHash,
      fetched_input_hash: fetchedInputHash,
      receipt_ts_ms: receiptTs,
    },
    kp.privateKey,
  );

  let proofBundle: JsonObject | undefined;
  if (transportMode === "outbound_bundle") {
    const localHealth = await fetchJson(`${localBase}/health`, undefined, 10_000);
    if (localHealth?.ok !== true || safeNodeId(localHealth?.nodeId) !== executorNodeId) {
      throw new Error("local_outbound_health_invalid");
    }
    const localJob = await fetchJson(
      `${localBase}/jobs/${encodeURIComponent(jobId)}`,
      undefined,
      15_000,
    );
    assertRemoteJobTruth(localJob, signed.envelope);
    const localReceipts = await fetchJson(
      `${localBase}/receipts` +
        `?account=${encodeURIComponent(account)}&limit=50`,
      undefined,
      15_000,
    );
    const persistedReceipt = findVerifiedReceipt(localReceipts, receiptId);
    if (!persistedReceipt) throw new Error("local_outbound_receipt_missing");
    assertRemoteReceiptTruth(persistedReceipt, signed.envelope);
    proofBundle = {
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      version: 1,
      transport_mode: "outbound_bundle",
      ticket_id: ticketId,
      executor_node_id: executorNodeId,
      job_id: jobId,
      receipt_id: receiptId,
      health: localHealth,
      job: localJob,
      receipt: persistedReceipt,
    };
  }

  const coordinator = await fetchJson(
    `${coordinatorBase}${PUBLIC_SUBMIT_ROUTE}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...signed,
        ...(proofBundle ? { proof_bundle: proofBundle } : {}),
      }),
    },
    45_000,
  );

  return res.status(200).json({
    ok: true,
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    remote_executor: true,
    local_node_id: executorNodeId,
    transport_mode: transportMode,
    coordinator_inbound_fetch: transportMode === "inbound_fetch",
    participant_outbound_bundle: transportMode === "outbound_bundle",
    ticket_id: ticketId,
    job_id: jobId,
    receipt_id: receiptId,
    dataset_id: datasetId,
    coordinator,
    participant_selected_award: false,
    automatic_background_loop: false,
    money_movement: false,
  });
}

async function submitRemoteResult(req: any, res: any): Promise<any> {
  if (!coordinatorEnabled()) {
    return res.status(503).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "coordinator_lane_disabled",
    });
  }

  const parsed = parseToken(bearerOrBodyToken(req));
  if (!parsed) {
    return res.status(401).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_capability",
    });
  }

  const consumedPath = ticketFile(consumedDir(), parsed.ticketId);
  if (fs.existsSync(consumedPath)) {
    return res.status(409).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "capability_already_used",
    });
  }

  const issuedPath = ticketFile(issuedDir(), parsed.ticketId);
  const record = readJson(issuedPath) as PilotTicketRecord | null;
  if (!record) {
    return res.status(401).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_capability",
    });
  }
  if (!safeHexEqual(record.token_sha256, sha256Hex(parsed.token))) {
    return res.status(401).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "invalid_capability",
    });
  }
  if (Number(record.expires_at_ms || 0) <= Date.now()) {
    return res.status(410).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: "capability_expired",
    });
  }

  let lock: { file: string; handle: fsp.FileHandle } | null = null;
  try {
    lock = await acquirePilotTicketLock(record.ticket_id);
    const envelope = verifyPilotResultEnvelope(
      req?.body?.envelope || {},
      req?.body?.signature || {},
    );
    assertPilotTicketEnvelopeMatch(record, envelope);

    const evidence = await verifyPilotSubmissionEvidence(
      record,
      envelope,
      req?.body?.proof_bundle,
    );

    const before = await readCanonicalWcState(record.account);
    const imported = persistImportedRemoteTruthOnce(
      envelope,
      req?.body?.signature || {},
    );
    const acceptance = await acceptVerifiedReceiptOnce(imported.receipt, {
      expectedAccount: record.account,
      expectedJobId: envelope.job_id,
      expectedReceiptId: envelope.receipt_id,
      capabilityTicketId: record.ticket_id,
      source: "wc_public_earning_pilot_v1",
    });

    const sameTicketDuplicate =
      acceptance?.duplicate === true &&
      String(
        acceptance?.entry?.reward_meta?.capability_ticket_id || "",
      ) === record.ticket_id;

    if (
      !(
        (
          acceptance?.credited === true &&
          acceptance?.duplicate !== true
        ) ||
        sameTicketDuplicate
      ) ||
      Number(acceptance?.award_wc || 0) !==
        VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC
    ) {
      throw new Error("verified_receipt_acceptance_failed");
    }

    const after = await readCanonicalWcState(record.account);
    const delta =
      Math.round(
        (Number(after.redeemable || 0) -
          Number(before.redeemable || 0)) *
          1e9,
      ) / 1e9;
    if (!sameTicketDuplicate && delta !== VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC) {
      throw new Error("canonical_wc_delta_mismatch");
    }
    if (
      sameTicketDuplicate &&
      Number(after.redeemable || 0) < VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC
    ) {
      throw new Error("canonical_wc_recovery_state_invalid");
    }

    const completed = completeTicket(record, {
      executor_signature_sha256: sha256Hex(
        String(req?.body?.signature?.sig || ""),
      ),
      executor_pubkey_sha256: sha256Hex(envelope.executor_pubkey),
      transport_mode: evidence.transportMode,
      coordinator_inbound_fetch: evidence.coordinatorInboundFetch,
      participant_outbound_bundle: evidence.participantOutboundBundle,
      outbound_proof_bundle_sha256:
        evidence.participantOutboundBundle
          ? sha256Hex(JSON.stringify(req?.body?.proof_bundle || {}))
          : null,
      job_id: envelope.job_id,
      receipt_id: envelope.receipt_id,
      dataset_id: envelope.dataset_id,
      wc_delta: sameTicketDuplicate ? 0 : delta,
      canonical_redeemable_after: Number(after.redeemable || 0),
      recovered_after_acceptance: sameTicketDuplicate,
    });

    appendAudit({
      event: sameTicketDuplicate ? "completed_recovery" : "credited",
      ticket_id: record.ticket_id,
      account: record.account,
      executor_node_id: record.executor_node_id,
      transport_mode: evidence.transportMode,
      coordinator_inbound_fetch: evidence.coordinatorInboundFetch,
      participant_outbound_bundle: evidence.participantOutboundBundle,
      job_id: envelope.job_id,
      receipt_id: envelope.receipt_id,
      dataset_id: envelope.dataset_id,
      wc_delta: sameTicketDuplicate ? 0 : delta,
      canonical_redeemable_after: Number(after.redeemable || 0),
    });

    return res.status(200).json({
      ok: true,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      remote_executor: true,
      executor_node_id: record.executor_node_id,
      transport_mode: evidence.transportMode,
      coordinator_inbound_fetch: evidence.coordinatorInboundFetch,
      participant_outbound_bundle: evidence.participantOutboundBundle,
      signature_verified: true,
      remote_health_verified: true,
      remote_job_verified: true,
      remote_receipt_verified: true,
      imported_truth: imported.appended,
      capability_consumed: true,
      ticket_id: record.ticket_id,
      account: record.account,
      task_class: record.task_class,
      job_id: envelope.job_id,
      receipt_id: envelope.receipt_id,
      dataset_id: envelope.dataset_id,
      wc: {
        before: Number(before.redeemable || 0),
        after: Number(after.redeemable || 0),
        delta: sameTicketDuplicate ? 0 : delta,
        fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
        canonical_redeemable: true,
      },
      acceptance: {
        credited: acceptance?.credited === true,
        duplicate: acceptance?.duplicate === true,
        recovered_after_acceptance: sameTicketDuplicate,
      },
      completed_ticket_status: completed.status,
      participant_selected_award: false,
      automatic_background_loop: false,
      generic_credit_route: false,
      wc_to_void: false,
      wallet_send: false,
      buy_void_fulfillment: false,
      money_movement: false,
    });
  } catch (error: any) {
    appendAudit({
      event: "submit_rejected",
      ticket_id: parsed.ticketId,
      error: String(error?.message || error),
    });
    const status =
      String(error?.message || "") === "ticket_inflight" ? 409 : 422;
    return res.status(status).json({
      ok: false,
      marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
      error: String(error?.message || error),
    });
  } finally {
    if (lock) await releasePilotTicketLock(lock);
  }
}

function publicStatus(accountRaw: unknown): JsonObject {
  const account = safeAccount(accountRaw);
  const counts = ticketCounts();
  return {
    ok: true,
    marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
    coordinator_enabled: coordinatorEnabled(),
    executor_enabled: executorEnabled(),
    task_class: VOID_WC_PUBLIC_EARNING_PILOT_TASK,
    fixed_award_wc: VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC,
    routes: {
      operator_issue: OPERATOR_ISSUE_ROUTE,
      local_execute: LOCAL_EXECUTE_ROUTE,
      public_submit: PUBLIC_SUBMIT_ROUTE,
      status: PUBLIC_STATUS_ROUTE,
    },
    capability: {
      account_bound: true,
      executor_node_bound: true,
      executor_http_bound_for_inbound_fetch: true,
      outbound_only_supported: true,
      inbound_executor_reachability_required_for_outbound: false,
      transport_modes: ["inbound_fetch", "outbound_bundle"],
      dataset_bound: true,
      input_hash_bound: true,
      expiring: true,
      single_use: true,
      token_stored_as_sha256_only: true,
      ed25519_executor_signature_required: true,
      remote_health_required: true,
      remote_persisted_job_required: true,
      remote_persisted_receipt_required: true,
      outbound_health_evidence_required: true,
      outbound_persisted_job_bundle_required: true,
      outbound_persisted_receipt_bundle_required: true,
      outbound_evidence_bound_to_signed_envelope: true,
      receipt_timestamp_bound_to_ticket_window: true,
      stale_ticket_lock_recovery: true,
      participant_selected_award: false,
    },
    caps: {
      per_account: perAccountCap(),
      global: globalCap(),
      active_issued: counts.active,
      consumed: counts.consumed,
      account_total: account ? Number(counts.accountCounts[account] || 0) : null,
    },
    canonical_pipeline: {
      participant_jobs_submit: "/jobs/submit",
      participant_worker_run_once:
        "/__void/jobs-and-datanet-worker/run-once",
      coordinator_receipt_import:
        "signed_remote_truth_import_v1",
      receipt_acceptance:
        "in_process_verified_receipt_acceptance_v1",
      balance: "/wc/redeemable",
    },
    automatic_background_loop: false,
    generic_credit_route: false,
    wc_to_void: false,
    wallet_send: false,
    buy_void_fulfillment: false,
    money_movement: false,
  };
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any = globalState.__void_http_app || globalState.app;
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    const timer = setTimeout(mount, 400);
    (timer as any).unref?.();
    return;
  }
  if (app[GLOBAL_MARK]) return;
  app[GLOBAL_MARK] = true;

  app.get(PUBLIC_STATUS_ROUTE, (req: any, res: any) => {
    try {
      return res.json(publicStatus(req?.query?.account));
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
        error: String(error?.message || error),
      });
    }
  });

  app.post(
    OPERATOR_ISSUE_ROUTE,
    express.json({ limit: "256kb" }),
    (req: any, res: any) => {
      if (!coordinatorEnabled()) {
        return res.status(503).json({
          ok: false,
          marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
          error: "coordinator_lane_disabled",
        });
      }
      if (
        !requireConfirmedLocalMutation(
          req,
          res,
          "wcPublicEarningPilotIssue",
        )
      ) {
        return;
      }
      try {
        return res.status(201).json(issueTicket(req?.body || {}));
      } catch (error: any) {
        return res.status(409).json({
          ok: false,
          marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
          error: String(error?.message || error),
        });
      }
    },
  );

  app.post(
    LOCAL_EXECUTE_ROUTE,
    express.json({ limit: "1mb" }),
    (req: any, res: any) => {
      executeLocalWork(req, res).catch((error: any) => {
        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
            error: String(error?.message || error),
          });
        }
      });
    },
  );

  app.post(
    PUBLIC_SUBMIT_ROUTE,
    express.json({ limit: "1mb" }),
    (req: any, res: any) => {
      submitRemoteResult(req, res).catch((error: any) => {
        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            marker: VOID_WC_PUBLIC_EARNING_PILOT_MARKER,
            error: String(error?.message || error),
          });
        }
      });
    },
  );

  console.log(
    `[wc-public-earning-pilot-v1] mounted coordinator=${coordinatorEnabled()} executor=${executorEnabled()}`,
  );
}

mount();
