// SPDX-License-Identifier: VCL-1.0
import { createHash } from "node:crypto";
import {
  VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
  parseChain2050RoleAuthorityGenerationV1,
} from "./chain2050_role_authority_record_v1.js";
import {
  VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA,
  type ApollyonNodeHealthEvidenceV1,
} from "./apollyon_readonly_sentry_observation_v1.js";

export const VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_V1_SCHEMA =
  "void.apollyon-readonly-sentry-node-collector.v1" as const;
export const VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1 =
  "http://127.0.0.1:4100" as const;
export const VOID_APOLLYON_READONLY_SENTRY_NODE_TIMEOUT_MS_V1 = 1500 as const;
export const VOID_APOLLYON_READONLY_SENTRY_NODE_MAX_RESPONSE_BYTES_V1 = 64 * 1024;

export const VOID_APOLLYON_READONLY_SENTRY_NODE_ENDPOINTS_V1 = Object.freeze({
  health: "/health",
  ready: "/__void/ready.json",
  head: "/blocks/latest/number2.json",
  peers: "/p2p/peers",
} as const);

type EndpointNameV1 = keyof typeof VOID_APOLLYON_READONLY_SENTRY_NODE_ENDPOINTS_V1;

export type ApollyonReadonlySentryNodeCollectorResultV1 =
  | {
      ok: true;
      schema: typeof VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_V1_SCHEMA;
      evidence: Readonly<ApollyonNodeHealthEvidenceV1>;
    }
  | { ok: false; reason: string };

class CollectorErrorV1 extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "CollectorErrorV1";
    this.code = code;
  }
}

const CANONICAL_CONTENT_LENGTH = /^(0|[1-9][0-9]*)$/;
const PEER_ID = /^[A-Za-z0-9._:-]{1,256}$/;
const MAX_PEER_RECORDS = 4096;
const MAX_GAP = 1_000_000_000;
const RESPONSE_CLEANUP_MS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function boundedSafeInteger(value: unknown, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;
}

function collectorError(error: unknown, fallback: string): CollectorErrorV1 {
  if (error instanceof CollectorErrorV1) return error;
  return new CollectorErrorV1(fallback);
}

async function settleBestEffort(cleanup: () => Promise<unknown> | unknown): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(cleanup).catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, RESPONSE_CLEANUP_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function abortError(signal: AbortSignal): CollectorErrorV1 {
  if (signal.reason instanceof CollectorErrorV1) return signal.reason;
  return new CollectorErrorV1("node_evidence_timeout");
}

async function withAbortV1<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw abortError(signal);
  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      reject(abortError(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
    if (signal.aborted) onAbort();
  });
}

async function cancelResponseV1(response: Response, reason: unknown): Promise<void> {
  if (!response.body) return;
  await settleBestEffort(() => response.body?.cancel(reason));
}

async function readBoundedBodyV1(
  response: Response,
  signal: AbortSignal,
  endpoint: EndpointNameV1,
): Promise<Uint8Array> {
  const rawLength = String(response.headers.get("content-length") ?? "").trim();
  if (rawLength !== "") {
    if (!CANONICAL_CONTENT_LENGTH.test(rawLength)) {
      const error = new CollectorErrorV1(`${endpoint}:response_content_length_invalid`);
      await cancelResponseV1(response, error);
      throw error;
    }
    const advertised = Number(rawLength);
    if (
      !Number.isSafeInteger(advertised) ||
      advertised > VOID_APOLLYON_READONLY_SENTRY_NODE_MAX_RESPONSE_BYTES_V1
    ) {
      const error = new CollectorErrorV1(`${endpoint}:response_too_large`);
      await cancelResponseV1(response, error);
      throw error;
    }
  }

  if (!response.body) {
    throw new CollectorErrorV1(`${endpoint}:response_body_missing`);
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = response.body.getReader();
  } catch {
    throw new CollectorErrorV1(`${endpoint}:response_reader_unavailable`);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await withAbortV1(reader.read(), signal);
      if (part.done) break;
      if (!(part.value instanceof Uint8Array)) {
        throw new CollectorErrorV1(`${endpoint}:response_chunk_invalid`);
      }
      if (
        part.value.byteLength >
        VOID_APOLLYON_READONLY_SENTRY_NODE_MAX_RESPONSE_BYTES_V1 - total
      ) {
        throw new CollectorErrorV1(`${endpoint}:response_too_large`);
      }
      total += part.value.byteLength;
      chunks.push(part.value);
    }
  } catch (error) {
    await settleBestEffort(() => reader.cancel(error));
    throw error;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

interface EndpointEvidenceV1 {
  bytes: Uint8Array;
  sha256: string;
  json: unknown;
}

async function fetchEndpointV1(
  endpoint: EndpointNameV1,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<EndpointEvidenceV1> {
  const path = VOID_APOLLYON_READONLY_SENTRY_NODE_ENDPOINTS_V1[endpoint];
  const requested = `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}${path}`;

  let response: Response;
  try {
    response = await withAbortV1(
      Promise.resolve().then(() =>
        fetchImpl(requested, {
          method: "GET",
          redirect: "error",
          credentials: "omit",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          signal,
        }),
      ),
      signal,
    );
  } catch (error) {
    if (signal.aborted) throw abortError(signal);
    throw collectorError(error, `${endpoint}:fetch_failed`);
  }

  let responseUrl = "";
  let redirected = false;
  try {
    responseUrl = response.url;
    redirected = response.redirected;
  } catch {
    const error = new CollectorErrorV1(`${endpoint}:response_provenance_invalid`);
    await cancelResponseV1(response, error);
    throw error;
  }
  if (responseUrl !== requested || redirected) {
    const error = new CollectorErrorV1(`${endpoint}:response_provenance_invalid`);
    await cancelResponseV1(response, error);
    throw error;
  }
  if (response.status !== 200) {
    const error = new CollectorErrorV1(`${endpoint}:http_status_${response.status}`);
    await cancelResponseV1(response, error);
    throw error;
  }

  const contentType = String(response.headers.get("content-type") ?? "").trim();
  if (contentType !== "" && !/^application\/json(?:\s*;|$)/i.test(contentType)) {
    const error = new CollectorErrorV1(`${endpoint}:content_type_invalid`);
    await cancelResponseV1(response, error);
    throw error;
  }

  const bytes = await readBoundedBodyV1(response, signal, endpoint);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CollectorErrorV1(`${endpoint}:response_utf8_invalid`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new CollectorErrorV1(`${endpoint}:response_json_invalid`);
  }

  return { bytes, sha256: sha256Bytes(bytes), json };
}

function parseHealthV1(value: unknown): boolean {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    throw new CollectorErrorV1("health:shape_invalid");
  }
  return value.ok;
}

function parseReadyV1(value: unknown): { ready: boolean; gap: number; txroot_live: 0 | 1 } {
  if (!isRecord(value) || typeof value.ready !== "boolean") {
    throw new CollectorErrorV1("ready:shape_invalid");
  }
  if (!boundedSafeInteger(value.gap, MAX_GAP)) {
    throw new CollectorErrorV1("ready:gap_invalid");
  }
  if (value.txroot_live !== 0 && value.txroot_live !== 1) {
    throw new CollectorErrorV1("ready:txroot_live_invalid");
  }
  return { ready: value.ready, gap: value.gap, txroot_live: value.txroot_live };
}

function parseHeadV1(value: unknown): string {
  if (!isRecord(value)) throw new CollectorErrorV1("head:shape_invalid");
  const raw = value.number;
  if (typeof raw === "number") {
    if (!Number.isSafeInteger(raw) || raw < 0) {
      throw new CollectorErrorV1("head:number_invalid");
    }
    return String(raw);
  }
  if (
    typeof raw !== "string" ||
    parseChain2050RoleAuthorityGenerationV1(raw) === null
  ) {
    throw new CollectorErrorV1("head:number_invalid");
  }
  return raw;
}

function parsePeerIdV1(value: unknown, label: string): string {
  if (typeof value !== "string" || !PEER_ID.test(value)) {
    throw new CollectorErrorV1(`peers:${label}_invalid`);
  }
  return value;
}

function parsePeersV1(value: unknown): { connected: number; verifiedConnected: number } {
  if (!isRecord(value) || value.ok !== true) {
    throw new CollectorErrorV1("peers:shape_invalid");
  }
  if (!Array.isArray(value.connected) || !Array.isArray(value.verifiedPeers)) {
    throw new CollectorErrorV1("peers:shape_invalid");
  }
  if (
    value.connected.length > MAX_PEER_RECORDS ||
    value.verifiedPeers.length > MAX_PEER_RECORDS
  ) {
    throw new CollectorErrorV1("peers:record_count_too_large");
  }

  const connectedIds = new Set<string>();
  for (const entry of value.connected) {
    if (!isRecord(entry)) throw new CollectorErrorV1("peers:connected_entry_invalid");
    const id = parsePeerIdV1(entry.id, "connected_id");
    if (connectedIds.has(id)) throw new CollectorErrorV1("peers:connected_duplicate");
    connectedIds.add(id);
  }

  const verifiedIds = new Set<string>();
  for (const entry of value.verifiedPeers) {
    if (!isRecord(entry)) throw new CollectorErrorV1("peers:verified_entry_invalid");
    const id = parsePeerIdV1(entry.node_id, "verified_node_id");
    if (verifiedIds.has(id)) throw new CollectorErrorV1("peers:verified_duplicate");
    verifiedIds.add(id);
  }

  let verifiedConnected = 0;
  for (const id of connectedIds) {
    if (verifiedIds.has(id)) verifiedConnected += 1;
  }
  return { connected: connectedIds.size, verifiedConnected };
}

export async function collectApollyonReadonlySentryNodeEvidenceV1(
  fetchImpl: typeof fetch = fetch,
): Promise<ApollyonReadonlySentryNodeCollectorResultV1> {
  if (typeof fetchImpl !== "function") {
    return { ok: false, reason: "node_evidence_fetch_invalid" };
  }

  const controller = new AbortController();
  const timeoutError = new CollectorErrorV1("node_evidence_timeout");
  const timer = setTimeout(
    () => controller.abort(timeoutError),
    VOID_APOLLYON_READONLY_SENTRY_NODE_TIMEOUT_MS_V1,
  );

  try {
    const [healthEvidence, readyEvidence, headEvidence, peerEvidence] =
      await Promise.all([
        fetchEndpointV1("health", fetchImpl, controller.signal),
        fetchEndpointV1("ready", fetchImpl, controller.signal),
        fetchEndpointV1("head", fetchImpl, controller.signal),
        fetchEndpointV1("peers", fetchImpl, controller.signal),
      ]);

    const healthOk = parseHealthV1(healthEvidence.json);
    const ready = parseReadyV1(readyEvidence.json);
    const latestHead = parseHeadV1(headEvidence.json);
    const peers = parsePeersV1(peerEvidence.json);

    const evidence: ApollyonNodeHealthEvidenceV1 = Object.freeze({
      schema: VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA,
      chain_id: VOID_CHAIN2050_ROLE_AUTHORITY_CHAIN_ID,
      health_ok: healthOk,
      ready: ready.ready,
      gap: ready.gap,
      txroot_live: ready.txroot_live,
      latest_head: latestHead,
      connected_peer_count: peers.connected,
      verified_peer_count: peers.verifiedConnected,
      health_sha256: healthEvidence.sha256,
      ready_sha256: readyEvidence.sha256,
      head_sha256: headEvidence.sha256,
      peers_sha256: peerEvidence.sha256,
    });

    return {
      ok: true,
      schema: VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_V1_SCHEMA,
      evidence,
    };
  } catch (error) {
    if (!controller.signal.aborted) {
      controller.abort(error instanceof Error ? error : new Error("node evidence failed"));
    }
    const normalized = controller.signal.reason instanceof CollectorErrorV1
      ? controller.signal.reason
      : collectorError(error, "node_evidence_failed");
    return { ok: false, reason: normalized.code };
  } finally {
    clearTimeout(timer);
  }
}
