// Source-only candidate for a future private operator route. This module
// does not mount an HTTP route or authorize economic operations.
import {
  authorizeBuyVoidOperatorLocalReadV1,
  VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1,
  VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1,
} from "./buy_void_operator_local_intent_v1.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_V2 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_V2";
export const VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2 =
  "/__void/buy-void/operator/verify-payment-v2.json";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_AUTHORITY_V2 = Object.freeze({
  private_operator_bearer_required: true,
  loopback_host_and_peer_required: true,
  registered_route_identity_required: true,
  mutation_method_post_only: true,
  exact_operator_intent_required: true,
  browser_cross_site_forbidden: true,
  source_only_unmounted: true,
  operator_principal_authenticated_for_allocation: false,
  mounted_verified_allocation_dispatch: false,
  custody_service_composed: false,
  payment_acceptance: false,
  public_presale_activation: false,
  funds_movement: false,
});

function deny(res: any, status: number, code: string): false {
  if (status === 405 && typeof res?.setHeader === "function") {
    res.setHeader("allow", "POST");
  }
  res.status(status).json({
    schema: "void_buy_void_verified_payment_transport_v2",
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_V2,
    ok: false,
    error: code,
  });
  return false;
}

function matchingLocalOrigin(req: any): boolean {
  const value = req?.headers?.origin;
  if (value === undefined) return true;
  if (typeof value !== "string" || !value || value !== value.trim()) {
    return false;
  }
  try {
    const parsed = new URL(value);
    const host = req?.headers?.host;
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      !parsed.username && !parsed.password &&
      parsed.pathname === "/" && !parsed.search && !parsed.hash &&
      typeof host === "string" &&
      parsed.host.toLowerCase() === host.toLowerCase() &&
      /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i.test(parsed.host)
    );
  } catch {
    return false;
  }
}

// True authenticates only the local transport/bearer, NOT payment finality,
// allocation custody, an operator allocation principal, or launch readiness.
export function authorizeBuyVoidVerifiedPaymentTransportV2(
  req: any,
  res: any,
): boolean {
  if (!authorizeBuyVoidOperatorLocalReadV1(req, res)) return false;
  if (req?.route?.path !== VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2) {
    return deny(res, 403, "operator_verified_payment_route_unqualified");
  }
  if (req?.method !== "POST") {
    return deny(res, 405, "operator_verified_payment_post_required");
  }
  if (req?.headers?.[VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1] !==
      VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1) {
    return deny(res, 403, "operator_verified_payment_intent_required");
  }
  const site = req?.headers?.["sec-fetch-site"];
  if (site !== undefined &&
      (typeof site !== "string" || site.trim().toLowerCase() !== "same-origin")) {
    return deny(res, 403, "operator_verified_payment_cross_site_forbidden");
  }
  if (!matchingLocalOrigin(req)) {
    return deny(res, 403, "operator_verified_payment_origin_forbidden");
  }
  return true;
}
