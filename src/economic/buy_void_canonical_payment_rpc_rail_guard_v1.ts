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
export function classifyBuyVoidCanonicalPaymentRpcRailV1(
  policy: unknown,
): BuyVoidCanonicalPaymentRpcRailDecisionV1 {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return held("canonical_payment_rpc_policy_invalid");
  }
  const value = policy as Record<string, unknown>;
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

export async function observeBuyVoidCanonicalRailPaymentV1(input: {
  request: BuyVoidRequestV1;
  policy: BuyVoidPaymentRpcObserverPolicyV1;
  transport?: BuyVoidPaymentRpcTransportV1;
}): Promise<
  BuyVoidPaymentObservationDecisionV1 | BuyVoidCanonicalPaymentRpcRailHeldV1
> {
  const rail = classifyBuyVoidCanonicalPaymentRpcRailV1(input?.policy);
  if (rail.ok === false) return rail;

  // A request cannot relabel the canonical source rail. This is not an
  // allocation/presale authority check; the original request must still be
  // independently bound to durable checkout and exact native USDC bytes.
  if (input?.request?.source_chain !== rail.source_chain) {
    return held("canonical_payment_rpc_request_chain_mismatch", rail.chain_id);
  }

  return observeBuyVoidPaymentV1({
    request: input.request,
    policy: input.policy,
    ...(input.transport ? { transport: input.transport } : {}),
  });
}
