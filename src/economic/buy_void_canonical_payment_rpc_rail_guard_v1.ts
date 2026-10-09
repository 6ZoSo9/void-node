import { types as utilTypes } from "node:util";
import type { BuyVoidRequestV1 } from "./buy_void_auto_fulfillment_v1.js";
import {
  observeBuyVoidPaymentV1,
  type BuyVoidPaymentRpcObserverPolicyV1,
  type BuyVoidPaymentRpcTransportV1,
  type BuyVoidPaymentObservationDecisionV1,
} from "./buy_void_payment_rpc_observer_v1.js";

export const VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1 =
  "VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1";

export const VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1 =
  Object.freeze({
    exact_base_chain_id: 8453,
    exact_ethereum_chain_id: 1,
    independent_rail_policy_required: true,
    no_caller_supplied_chain_aliases: true,
    pre_rpc_chain_policy_binding: true,
    policy_snapshot_once_before_guard_and_transport: true,
    policy_accessors_or_proxy_allowed: false,
    request_payment_identity_snapshot_once: true,
    request_accessors_or_proxy_allowed: false,
    imported_legacy_transport_retained: true,
    observed_provider_honesty_verified: false,
    production_payment_authority_ready: false,
    runtime_route_mount: false,
    signer_access: false,
    wallet_access: false,
    transaction_broadcast: false,
    filesystem_write: false,
    funds_moved: false,
  });

type Rail = "base" | "ethereum";

export type BuyVoidCanonicalPaymentRpcRailHeldV1 = Readonly<{
  ok: false;
  marker: typeof VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1;
  reason: string;
  expected_chain_id?: "8453" | "1";
}>;

export type BuyVoidCanonicalPaymentRpcRailReadyV1 = Readonly<{
  ok: true;
  marker: typeof VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1;
  source_chain: Rail;
  chain_id: "8453" | "1";
}>;

export type BuyVoidCanonicalPaymentRpcRailDecisionV1 =
  | BuyVoidCanonicalPaymentRpcRailReadyV1
  | BuyVoidCanonicalPaymentRpcRailHeldV1;

const held = (
  reason: string,
  expectedChainId?: "8453" | "1",
): BuyVoidCanonicalPaymentRpcRailHeldV1 =>
  Object.freeze({
    ok: false,
    marker: VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1,
    reason,
    ...(expectedChainId ? { expected_chain_id: expectedChainId } : {}),
  });

/**
 * Deliberately strict, source-only successor boundary.
 *
 * The imported V1 HTTP transport validates that a chain ID is positive and
 * that eth_chainId agrees with the configured ID; it does not independently
 * require Base=8453 or Ethereum=1. This guard checks those exact canonical
 * rail identities BEFORE any observer/transport is constructed or called.
 *
 * It does not establish an honest RPC provider, source finality, or deployed
 * payment authority. The existing provider/receipt checks remain mandatory.
 */
const POLICY_KEYS = Object.freeze([
  "enabled",
  "source_chain",
  "chain_id",
  "rpc_url",
  "timeout_ms",
  "max_response_bytes",
] as const);

function snapshotCanonicalPaymentRpcPolicyV1(
  policy: unknown,
): BuyVoidPaymentRpcObserverPolicyV1 | BuyVoidCanonicalPaymentRpcRailHeldV1 {
  if (
    !policy ||
    typeof policy !== "object" ||
    Array.isArray(policy) ||
    utilTypes.isProxy(policy)
  ) {
    return held("canonical_payment_rpc_policy_invalid");
  }
  const proto = Object.getPrototypeOf(policy);
  if (proto !== Object.prototype && proto !== null) {
    return held("canonical_payment_rpc_policy_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(policy);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) {
    return held("canonical_payment_rpc_policy_invalid");
  }
  if (
    own.some((key) => !POLICY_KEYS.includes(key as typeof POLICY_KEYS[number]))
  ) {
    return held("canonical_payment_rpc_policy_invalid");
  }
  const read = (key: typeof POLICY_KEYS[number]): unknown => {
    const descriptor = descriptors[key];
    if (!descriptor) return undefined;
    if (
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      throw new Error("canonical_payment_rpc_policy_accessor_forbidden");
    }
    return descriptor.value;
  };

  let enabled: unknown;
  let sourceChain: unknown;
  let chainId: unknown;
  let rpcUrl: unknown;
  let timeoutMs: unknown;
  let maxResponseBytes: unknown;
  try {
    enabled = read("enabled");
    sourceChain = read("source_chain");
    chainId = read("chain_id");
    rpcUrl = read("rpc_url");
    timeoutMs = read("timeout_ms");
    maxResponseBytes = read("max_response_bytes");
  } catch {
    return held("canonical_payment_rpc_policy_accessor_forbidden");
  }

  if (
    typeof enabled !== "boolean" ||
    (sourceChain !== "base" && sourceChain !== "ethereum") ||
    (typeof chainId !== "string" && typeof chainId !== "number") ||
    typeof rpcUrl !== "string" ||
    rpcUrl.length < 1 ||
    (timeoutMs !== undefined &&
      typeof timeoutMs !== "string" &&
      typeof timeoutMs !== "number") ||
    (maxResponseBytes !== undefined &&
      typeof maxResponseBytes !== "string" &&
      typeof maxResponseBytes !== "number")
  ) {
    return held("canonical_payment_rpc_policy_invalid");
  }

  const snapshot: BuyVoidPaymentRpcObserverPolicyV1 = {
    enabled,
    source_chain: sourceChain,
    chain_id: chainId,
    rpc_url: rpcUrl,
    ...(typeof timeoutMs === "string" || typeof timeoutMs === "number"
      ? { timeout_ms: timeoutMs }
      : {}),
    ...(typeof maxResponseBytes === "string" ||
    typeof maxResponseBytes === "number"
      ? { max_response_bytes: maxResponseBytes }
      : {}),
  };
  return Object.freeze(snapshot);
}

function snapshotCanonicalPaymentRequestIdentityV1(
  request: unknown,
): BuyVoidRequestV1 | BuyVoidCanonicalPaymentRpcRailHeldV1 {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    utilTypes.isProxy(request)
  ) {
    return held("canonical_payment_rpc_request_invalid");
  }
  const proto = Object.getPrototypeOf(request);
  if (proto !== Object.prototype && proto !== null) {
    return held("canonical_payment_rpc_request_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(request);
  const source = descriptors.source_chain;
  const tx = descriptors.tx_hash;
  if (
    !source ||
    source.enumerable !== true ||
    !Object.hasOwn(source, "value") ||
    (source.value !== "base" && source.value !== "ethereum") ||
    !tx ||
    tx.enumerable !== true ||
    !Object.hasOwn(tx, "value") ||
    typeof tx.value !== "string"
  ) {
    return held("canonical_payment_rpc_request_invalid");
  }
  return Object.freeze({
    source_chain: source.value,
    tx_hash: tx.value,
  }) as BuyVoidRequestV1;
}

function classifyCanonicalPaymentRpcPolicySnapshotV1(
  value: BuyVoidPaymentRpcObserverPolicyV1,
): BuyVoidCanonicalPaymentRpcRailDecisionV1 {
  if (value.enabled !== true) {
    return held("canonical_payment_rpc_policy_disabled");
  }
  if (value.source_chain !== "base" &&
      value.source_chain !== "ethereum") {
    return held("canonical_payment_rpc_source_chain_invalid");
  }

  const rail: Rail = value.source_chain;
  const expected: "8453" | "1" = rail === "base" ? "8453" : "1";
  // Never Number(value): coercion could accept objects with executable
  // valueOf/toString, float/boolean/null, hex and unreviewed aliases.
  if (value.chain_id !== Number(expected) &&
      value.chain_id !== expected) {
    return held("canonical_payment_rpc_chain_id_mismatch", expected);
  }
  return Object.freeze({
    ok: true,
    marker: VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1,
    source_chain: rail,
    chain_id: expected,
  });
}

export function classifyBuyVoidCanonicalPaymentRpcRailV1(
  policy: unknown,
): BuyVoidCanonicalPaymentRpcRailDecisionV1 {
  const snapshot = snapshotCanonicalPaymentRpcPolicyV1(policy);
  if ("reason" in snapshot) return snapshot;
  return classifyCanonicalPaymentRpcPolicySnapshotV1(snapshot);
}

export async function observeBuyVoidCanonicalRailPaymentV1(input: {
  request: BuyVoidRequestV1;
  policy: BuyVoidPaymentRpcObserverPolicyV1;
  transport?: BuyVoidPaymentRpcTransportV1;
}): Promise<
  BuyVoidPaymentObservationDecisionV1 | BuyVoidCanonicalPaymentRpcRailHeldV1
> {
  const policySnapshot =
    snapshotCanonicalPaymentRpcPolicyV1(input?.policy);
  if ("reason" in policySnapshot) return policySnapshot;

  const requestSnapshot =
    snapshotCanonicalPaymentRequestIdentityV1(input?.request);
  if ("reason" in requestSnapshot) return requestSnapshot;

  const rail = classifyCanonicalPaymentRpcPolicySnapshotV1(policySnapshot);
  if (rail.ok === false) return rail;

  // A request cannot relabel the canonical source rail. This is not an
  // allocation/presale authority check; the original request must still be
  // independently bound to durable checkout and exact native USDC bytes.
  if (requestSnapshot.source_chain !== rail.source_chain) {
    return held("canonical_payment_rpc_request_chain_mismatch", rail.chain_id);
  }

  const transport = input?.transport;
  return observeBuyVoidPaymentV1({
    request: requestSnapshot,
    policy: policySnapshot,
    ...(transport ? { transport } : {}),
  });
}
