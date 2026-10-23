// Synthetic, noncustomer proof. No HTTP server or payment/custody writer.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  authorizeBuyVoidVerifiedPaymentTransportV2,
  VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2,
  VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_AUTHORITY_V2,
} from "../src/economic/buy_void_verified_payment_transport_v2.js";
import { authorizeBuyVoidOperatorMutationV1 } from
  "../src/economic/buy_void_operator_local_intent_v1.js";

const runtimeSource = fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
assert.equal(runtimeSource.includes("buy_void_verified_payment_transport_v2"), false,
  "candidate must remain unmounted in the real node");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-bv-v2-transport-"));
const previous = process.env.CREDENTIALS_DIRECTORY;
const token = "voidbvo1." + "A".repeat(43);
const cred = path.join(root, "buy-void-operator-capability-v1");
let count = 0;

function req(patch: Record<string, unknown> = {}): any {
  return {
    method: "POST",
    socket: { remoteAddress: "127.0.0.1" },
    route: { path: VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2 },
    headers: {
      host: "127.0.0.1:4100",
      authorization: "Bearer " + token,
      "x-void-operator-intent": "VOID_BUY_VOID_OPERATOR_MUTATION_V1",
      "sec-fetch-site": "same-origin",
      origin: "http://127.0.0.1:4100",
    },
    ...patch,
  };
}
function response() {
  const state: { status: number | null; body: any; headers: Record<string, string> } = {
    status: null, body: null, headers: {},
  };
  const res: any = {
    status(code: number) { state.status = code; return this; },
    json(body: unknown) { state.body = body; return this; },
    setHeader(name: string, value: string) { state.headers[name] = value; },
  };
  return { state, res };
}
function deny(request: any, status: number, error: string, old = false) {
  const { state, res } = response();
  const value = old
    ? authorizeBuyVoidOperatorMutationV1(request, res)
    : authorizeBuyVoidVerifiedPaymentTransportV2(request, res);
  assert.equal(value, false);
  assert.equal(state.status, status);
  assert.equal(state.body?.error, error);
  assert.equal(state.body?.ok, false);
  assert.equal(JSON.stringify(state.body).includes(token), false);
  count++;
  return state;
}
try {
  fs.chmodSync(root, 0o700);
  fs.writeFileSync(cred, token + "\n", { mode: 0o600, flag: "wx" });
  process.env.CREDENTIALS_DIRECTORY = root;
  const { state, res } = response();
  assert.equal(authorizeBuyVoidVerifiedPaymentTransportV2(req(), res), true);
  assert.equal(state.status, null);
  count++;

  // The original registered payment-only route must remain blocked.
  const oldRoute = { path: "/__void/buy-void/operator/verify-payment.json" };
  deny(req({ route: oldRoute }), 503, "buy_void_allocation_handoff_unmounted", true);
  deny(req({ route: oldRoute }), 403, "operator_verified_payment_route_unqualified");

  const method = deny(req({ method: "GET" }), 405,
    "operator_verified_payment_post_required");
  assert.equal(method.headers.allow, "POST");
  deny(req({ headers: { ...req().headers, "x-void-operator-intent": "" } }),
    403, "operator_verified_payment_intent_required");
  deny(req({ headers: { ...req().headers, "sec-fetch-site": "cross-site" } }),
    403, "operator_verified_payment_cross_site_forbidden");
  deny(req({ headers: { ...req().headers, origin: "https://example.org/" } }),
    403, "operator_verified_payment_origin_forbidden");
  deny(req({ headers: { ...req().headers, authorization: "Bearer voidbvo1." + "B".repeat(43) } }),
    401, "operator_capability_required");
  deny(req({ socket: { remoteAddress: "203.0.113.42" } }),
    403, "operator_queue_local_only");
  deny(req({ headers: { ...req().headers, host: "voidchain.org" } }),
    403, "operator_queue_local_only");
  fs.renameSync(cred, cred + ".moved");
  deny(req(), 503, "operator_capability_unavailable");

  for (const key of [
    "source_only_unmounted", "private_operator_bearer_required",
    "loopback_host_and_peer_required", "registered_route_identity_required",
    "mutation_method_post_only", "exact_operator_intent_required",
    "browser_cross_site_forbidden",
  ]) assert.equal((VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_AUTHORITY_V2 as any)[key], true);
  for (const key of [
    "operator_principal_authenticated_for_allocation",
    "mounted_verified_allocation_dispatch", "custody_service_composed",
    "payment_acceptance", "public_presale_activation", "funds_movement",
  ]) assert.equal((VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_AUTHORITY_V2 as any)[key], false);
  assert.equal(Object.isFrozen(VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_AUTHORITY_V2), true);
} finally {
  if (previous === undefined) delete process.env.CREDENTIALS_DIRECTORY;
  else process.env.CREDENTIALS_DIRECTORY = previous;
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_TRANSPORT_V2_PROOF_GREEN");
console.log("synthetic_cases=" + String(count));
console.log("old_payment_only_route_remains_503=true");
console.log("new_v2_route_transport_credential_bound=true");
console.log("source_only_unmounted=true");
console.log("operator_principal_authenticated_for_allocation=false");
console.log("mounted_verified_allocation_dispatch=false");
console.log("custody_service_composed=false");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
