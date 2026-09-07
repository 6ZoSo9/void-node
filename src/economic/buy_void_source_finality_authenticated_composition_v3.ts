import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";

import type { BuyVoidRequestV1 } from "./buy_void_auto_fulfillment_v1.js";
import {
  observeBuyVoidSourceChainFinalityV1,
  type BuyVoidSourceChainFinalityRpcPolicyV1,
} from "./buy_void_source_chain_finality_rpc_adapter_v1.js";
import type {
  BuyVoidPaymentRpcCallV1,
  BuyVoidPaymentRpcTransportV1,
} from "./buy_void_payment_rpc_observer_v1.js";
import {
  buildBuyVoidSourceFinalityAuthorityV2,
  type BuyVoidSourceFinalityAuthorityV2Result,
  type BuyVoidSourceFinalityStaticPolicyV2,
} from "./buy_void_source_finality_authority_v2.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3 =
  "VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3";

export const VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_AUTHORITY_V3 =
  Object.freeze({
    source_only_candidate: true,
    module_owned_transport_required: true,
    authenticated_transport_identity_verified: true,
    remote_provider_identity_verified: false,
    total_operation_deadline_verified: true,
    observation_generated_in_composition: true,
    source_generation_verified: false,
    ancestry_verified: false,
    provider_quorum_verified: false,
    production_source_finality_authority_ready: false,
    rpc_read: true,
    rpc_write: false,
    wallet_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    filesystem_write: false,
    runtime_route_mount: false,
    background_loop: false,
    inventory_mutation: false,
    chain2050_mutation: false,
    public_presale_activation: false,
    money_movement: false,
  });

export const VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_UPSTREAM_V3 =
  Object.freeze({
    pr_1471_head_sha: "036c34a479d8dacbfd663fcb610adabbd0008428",
    pr_1472_head_sha: "28f47db9e5c4f0064112591eb75b4ef747946c8c",
    expected_rpc_call_count: 10,
  });

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const ALLOWED_METHODS = new Set([
  "eth_chainId",
  "eth_getTransactionReceipt",
  "eth_blockNumber",
  "eth_getBlockByNumber",
]);
const DEFAULT_PER_REQUEST_TIMEOUT_MS = 8_000;
const MAX_PER_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 262_144;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_TOTAL_TIMEOUT_MS = 120_000;

export type BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3 = {
  source_finality_policy: BuyVoidSourceChainFinalityRpcPolicyV1;
  authority_policy_generation: BuyVoidSourceFinalityStaticPolicyV2;
  total_timeout_ms: string | number;
};

type TransportMetadataV3 = {
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3;
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  rpc_identity: string;
  rpc_url_fingerprint_sha256: string;
  total_timeout_ms: number;
  deadline_at_monotonic_ms: number;
  call_count: number;
  deadline_exceeded: boolean;
  module_owned_transport: true;
};

export type BuyVoidSourceFinalityAuthenticatedReadyV3 = Omit<
  BuyVoidSourceFinalityAuthorityV2Result,
  | "schema"
  | "marker"
  | "version"
  | "status"
  | "authenticated_transport_identity_verified"
  | "total_operation_deadline_verified"
  | "production_source_finality_authority_ready"
> & {
  schema: "void_buy_void_source_finality_authenticated_composition_v3";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3;
  version: 3;
  status: "source_finality_authenticated_composed";
  authenticated_transport_identity_verified: true;
  remote_provider_identity_verified: false;
  total_operation_deadline_verified: true;
  observation_generated_in_composition: true;
  source_generation_verified: false;
  production_source_finality_authority_ready: false;
  total_timeout_ms: string;
  expected_rpc_call_count: "10";
  observed_rpc_call_count: "10";
  transport_identity_sha256: string;
  composition_policy_sha256: string;
};

export type BuyVoidSourceFinalityAuthenticatedHeldV3 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3;
  reason: string;
};

export type BuyVoidSourceFinalityAuthenticatedDecisionV3 =
  | BuyVoidSourceFinalityAuthenticatedReadyV3
  | BuyVoidSourceFinalityAuthenticatedHeldV3;

const AUTHENTICATED_TRANSPORTS =
  new WeakMap<BuyVoidPaymentRpcTransportV1, TransportMetadataV3>();

function held(reason: string): BuyVoidSourceFinalityAuthenticatedHeldV3 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3,
    reason,
  };
}

function plain(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactKeys(value: unknown, expected: readonly string[]): boolean {
  if (!plain(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((entry, index) => entry === wanted[index])
  );
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("non_canonical_number");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (plain(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  throw new Error("non_canonical_value");
}

function sha256(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function parsePositiveBoundedInteger(
  value: unknown,
  maximum: number,
): number | null {
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    return null;
  }
  return parsed;
}

function boundedOptionalInteger(
  value: unknown,
  fallback: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  return parsePositiveBoundedInteger(value, maximum) ?? fallback;
}

function normalizeChain(value: unknown): "base" | "ethereum" | "" {
  const raw = String(value ?? "").trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return chain === "base" || chain === "ethereum" ? chain : "";
}

function expectedChainId(chain: "base" | "ethereum"): "8453" | "1" {
  return chain === "base" ? "8453" : "1";
}

function safeId(value: unknown): string {
  const result = String(value ?? "").trim();
  return SAFE_ID.test(result) ? result : "";
}

function digest(value: unknown): string {
  const result = String(value ?? "").trim().toLowerCase();
  return SHA256.test(result) ? result : "";
}

function normalizeCompositionTransportPolicy(input: {
  source_finality_policy: BuyVoidSourceChainFinalityRpcPolicyV1;
  total_timeout_ms: string | number;
}):
  | {
      source_chain: "base" | "ethereum";
      evm_chain_id: "8453" | "1";
      rpc_url: URL;
      rpc_identity: string;
      rpc_url_fingerprint_sha256: string;
      per_request_timeout_ms: number;
      max_response_bytes: number;
      total_timeout_ms: number;
    }
  | null {
  const policy = input.source_finality_policy as unknown;
  if (!plain(policy)) return null;
  const allowed = new Set([
    "enabled",
    "source_chain",
    "chain_id",
    "rpc_url",
    "rpc_url_fingerprint_sha256",
    "rpc_identity",
    "finality_adapter_id",
    "min_confirmations",
    "usdc_contract",
    "receive_address",
    "timeout_ms",
    "max_response_bytes",
  ]);
  for (const key of Object.keys(policy)) {
    if (!allowed.has(key)) return null;
  }
  for (const key of [
    "enabled",
    "source_chain",
    "chain_id",
    "rpc_url",
    "rpc_url_fingerprint_sha256",
    "rpc_identity",
    "finality_adapter_id",
    "min_confirmations",
    "usdc_contract",
    "receive_address",
  ]) {
    if (!Object.prototype.hasOwnProperty.call(policy, key)) return null;
  }
  if (policy.enabled !== true) return null;

  const sourceChain = normalizeChain(policy.source_chain);
  if (!sourceChain) return null;
  const chainId = String(policy.chain_id ?? "").trim();
  if (chainId !== expectedChainId(sourceChain)) return null;

  let rpcUrl: URL;
  try {
    rpcUrl = new URL(String(policy.rpc_url ?? "").trim());
  } catch {
    return null;
  }
  if (rpcUrl.username || rpcUrl.password || rpcUrl.hash) return null;
  const loopback =
    rpcUrl.hostname === "127.0.0.1" ||
    rpcUrl.hostname === "::1" ||
    rpcUrl.hostname === "localhost";
  if (rpcUrl.protocol !== "https:" && !(rpcUrl.protocol === "http:" && loopback)) {
    return null;
  }

  const actualFingerprint = crypto
    .createHash("sha256")
    .update(rpcUrl.toString(), "utf8")
    .digest("hex");
  const configuredFingerprint = digest(policy.rpc_url_fingerprint_sha256);
  if (!configuredFingerprint || configuredFingerprint !== actualFingerprint) {
    return null;
  }
  const rpcIdentity = safeId(policy.rpc_identity);
  if (!rpcIdentity) return null;

  const totalTimeout = parsePositiveBoundedInteger(
    input.total_timeout_ms,
    MAX_TOTAL_TIMEOUT_MS,
  );
  if (totalTimeout === null) return null;

  return {
    source_chain: sourceChain,
    evm_chain_id: expectedChainId(sourceChain),
    rpc_url: rpcUrl,
    rpc_identity: rpcIdentity,
    rpc_url_fingerprint_sha256: configuredFingerprint,
    per_request_timeout_ms: boundedOptionalInteger(
      policy.timeout_ms,
      DEFAULT_PER_REQUEST_TIMEOUT_MS,
      MAX_PER_REQUEST_TIMEOUT_MS,
    ),
    max_response_bytes: boundedOptionalInteger(
      policy.max_response_bytes,
      DEFAULT_MAX_RESPONSE_BYTES,
      MAX_RESPONSE_BYTES,
    ),
    total_timeout_ms: totalTimeout,
  };
}

function createModuleOwnedDeadlineTransportV3(normalized: {
  source_chain: "base" | "ethereum";
  evm_chain_id: "8453" | "1";
  rpc_url: URL;
  rpc_identity: string;
  rpc_url_fingerprint_sha256: string;
  per_request_timeout_ms: number;
  max_response_bytes: number;
  total_timeout_ms: number;
}): {
  transport: BuyVoidPaymentRpcTransportV1;
  metadata: TransportMetadataV3;
} {
  const started = performance.now();
  const metadata: TransportMetadataV3 = {
    marker: VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3,
    source_chain: normalized.source_chain,
    evm_chain_id: normalized.evm_chain_id,
    rpc_identity: normalized.rpc_identity,
    rpc_url_fingerprint_sha256: normalized.rpc_url_fingerprint_sha256,
    total_timeout_ms: normalized.total_timeout_ms,
    deadline_at_monotonic_ms: started + normalized.total_timeout_ms,
    call_count: 0,
    deadline_exceeded: false,
    module_owned_transport: true,
  };

  let requestId = 0;

  const transport: BuyVoidPaymentRpcTransportV1 = {
    async call(input: BuyVoidPaymentRpcCallV1): Promise<unknown> {
      if (!ALLOWED_METHODS.has(input.method)) {
        throw new Error("source_finality_rpc_method_not_allowed");
      }
      if (!Array.isArray(input.params) || input.params.length > 2) {
        throw new Error("source_finality_rpc_params_invalid");
      }

      const remaining = metadata.deadline_at_monotonic_ms - performance.now();
      if (remaining <= 0) {
        metadata.deadline_exceeded = true;
        throw new Error("source_finality_total_deadline_exceeded");
      }

      metadata.call_count += 1;
      const currentRequestId = ++requestId;
      const payload = Buffer.from(
        JSON.stringify({
          jsonrpc: "2.0",
          id: currentRequestId,
          method: input.method,
          params: input.params,
        }),
        "utf8",
      );
      const client = normalized.rpc_url.protocol === "https:" ? https : http;

      return new Promise((resolve, reject) => {
        let settled = false;
        let hardTimer: NodeJS.Timeout | null = null;

        const finishResolve = (value: unknown) => {
          if (settled) return;
          settled = true;
          if (hardTimer) clearTimeout(hardTimer);
          resolve(value);
        };
        const finishReject = (error: Error) => {
          if (settled) return;
          settled = true;
          if (hardTimer) clearTimeout(hardTimer);
          reject(error);
        };

        const request = client.request(
          normalized.rpc_url,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              "content-length": String(payload.byteLength),
            },
            timeout: normalized.per_request_timeout_ms,
          },
          (response) => {
            const chunks: Buffer[] = [];
            let size = 0;
            response.on("data", (chunk: Buffer | string) => {
              const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              size += value.byteLength;
              if (size > normalized.max_response_bytes) {
                request.destroy(new Error("source_finality_rpc_response_too_large"));
                return;
              }
              chunks.push(value);
            });
            response.on("end", () => {
              if (
                typeof response.statusCode !== "number" ||
                response.statusCode < 200 ||
                response.statusCode >= 300
              ) {
                finishReject(new Error("source_finality_rpc_http_status"));
                return;
              }
              const contentType = String(
                response.headers["content-type"] || "",
              ).toLowerCase();
              if (!contentType.startsWith("application/json")) {
                finishReject(new Error("source_finality_rpc_content_type_invalid"));
                return;
              }
              let decoded: unknown;
              try {
                decoded = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              } catch {
                finishReject(new Error("source_finality_rpc_invalid_json"));
                return;
              }
              if (!plain(decoded)) {
                finishReject(new Error("source_finality_rpc_invalid_envelope"));
                return;
              }
              if (decoded.jsonrpc !== "2.0" || decoded.id !== currentRequestId) {
                finishReject(new Error("source_finality_rpc_envelope_mismatch"));
                return;
              }
              if (decoded.error) {
                finishReject(new Error("source_finality_rpc_error_response"));
                return;
              }
              if (!Object.prototype.hasOwnProperty.call(decoded, "result")) {
                finishReject(new Error("source_finality_rpc_result_missing"));
                return;
              }
              finishResolve(decoded.result);
            });
          },
        );

        hardTimer = setTimeout(() => {
          metadata.deadline_exceeded = true;
          request.destroy(new Error("source_finality_total_deadline_exceeded"));
        }, Math.max(1, Math.ceil(remaining)));
        request.on("timeout", () => {
          request.destroy(new Error("source_finality_rpc_call_timeout"));
        });
        request.on("error", (error) => {
          finishReject(error instanceof Error ? error : new Error("source_finality_rpc_error"));
        });
        request.end(payload);
      });
    },
  };

  AUTHENTICATED_TRANSPORTS.set(transport, metadata);
  return { transport, metadata };
}

export async function observeBuyVoidSourceFinalityAuthenticatedCompositionV3(
  input: {
    request: BuyVoidRequestV1;
    policy: BuyVoidSourceFinalityAuthenticatedCompositionPolicyV3;
  },
): Promise<BuyVoidSourceFinalityAuthenticatedDecisionV3> {
  if (!exactKeys(input, ["policy", "request"])) {
    return held("source_finality_composition_input_shape");
  }
  if (!exactKeys(input.policy, [
    "authority_policy_generation",
    "source_finality_policy",
    "total_timeout_ms",
  ])) {
    return held("source_finality_composition_policy_shape");
  }

  const normalized = normalizeCompositionTransportPolicy({
    source_finality_policy: input.policy.source_finality_policy,
    total_timeout_ms: input.policy.total_timeout_ms,
  });
  if (!normalized) {
    return held("source_finality_composition_transport_policy_invalid");
  }

  const { transport, metadata } =
    createModuleOwnedDeadlineTransportV3(normalized);
  const admittedMetadata = AUTHENTICATED_TRANSPORTS.get(transport);
  if (
    !admittedMetadata ||
    admittedMetadata !== metadata ||
    admittedMetadata.module_owned_transport !== true
  ) {
    return held("source_finality_transport_origin_not_authenticated");
  }

  const observed = await observeBuyVoidSourceChainFinalityV1({
    request: input.request,
    policy: input.policy.source_finality_policy,
    transport,
  });

  if (metadata.deadline_exceeded) {
    return held("source_finality_total_deadline_exceeded");
  }
  if (performance.now() > metadata.deadline_at_monotonic_ms) {
    metadata.deadline_exceeded = true;
    return held("source_finality_total_deadline_exceeded");
  }
  if (observed.ok === false) {
    return held(`source_finality_upstream_${observed.reason}`);
  }
  if (
    metadata.call_count !==
    VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_UPSTREAM_V3.expected_rpc_call_count
  ) {
    return held("source_finality_unexpected_rpc_call_count");
  }
  if (
    observed.source_chain !== metadata.source_chain ||
    observed.evm_chain_id !== metadata.evm_chain_id ||
    observed.rpc_identity !== metadata.rpc_identity ||
    observed.rpc_url_fingerprint_sha256 !==
      metadata.rpc_url_fingerprint_sha256
  ) {
    return held("source_finality_transport_observation_identity_mismatch");
  }

  let authorityV2: BuyVoidSourceFinalityAuthorityV2Result;
  try {
    authorityV2 = buildBuyVoidSourceFinalityAuthorityV2({
      policy_generation: input.policy.authority_policy_generation,
      observed,
    });
  } catch {
    return held("source_finality_authority_v2_rejected");
  }

  if (performance.now() > metadata.deadline_at_monotonic_ms) {
    metadata.deadline_exceeded = true;
    return held("source_finality_total_deadline_exceeded");
  }

  const transportIdentitySha256 = sha256({
    marker: VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3,
    transport_origin: "module_owned_http_v3",
    source_chain: metadata.source_chain,
    evm_chain_id: metadata.evm_chain_id,
    rpc_identity: metadata.rpc_identity,
    rpc_url_fingerprint_sha256: metadata.rpc_url_fingerprint_sha256,
  });
  const compositionPolicySha256 = sha256({
    marker: VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3,
    version: 3,
    total_timeout_ms: String(metadata.total_timeout_ms),
    expected_upstream: VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_UPSTREAM_V3,
    transport_identity_sha256: transportIdentitySha256,
    stable_config_sha256: authorityV2.stable_config_sha256,
  });

  return {
    ...authorityV2,
    schema: "void_buy_void_source_finality_authenticated_composition_v3",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_AUTHENTICATED_COMPOSITION_V3,
    version: 3,
    status: "source_finality_authenticated_composed",
    authenticated_transport_identity_verified: true,
    remote_provider_identity_verified: false,
    total_operation_deadline_verified: true,
    observation_generated_in_composition: true,
    source_generation_verified: false,
    production_source_finality_authority_ready: false,
    total_timeout_ms: String(metadata.total_timeout_ms),
    expected_rpc_call_count: "10",
    observed_rpc_call_count: "10",
    transport_identity_sha256: transportIdentitySha256,
    composition_policy_sha256: compositionPolicySha256,
  };
}
