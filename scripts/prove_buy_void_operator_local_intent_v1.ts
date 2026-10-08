import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1,
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1,
  VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1,
  VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1,
  authorizeBuyVoidOperatorLocalReadV1,
  authorizeBuyVoidOperatorMutationV1,
} from "../src/economic/buy_void_operator_local_intent_v1.js";

type Result = {
  status: number;
  body: any;
  headers: Record<string, string>;
};

function response(): {
  result: Result;
  res: any;
} {
  const result: Result = {
    status: 200,
    body: null,
    headers: {},
  };
  return {
    result,
    res: {
      setHeader(name: string, value: string) {
        result.headers[name.toLowerCase()] = String(value);
      },
      status(code: number) {
        result.status = code;
        return this;
      },
      json(body: unknown) {
        result.body = body;
        return this;
      },
    },
  };
}

function request(overrides: Record<string, any> = {}): any {
  const base = {
    method: "POST",
    headers: {
      host: "127.0.0.1:4100",
      [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]:
        VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1,
      origin: "http://127.0.0.1:4100",
      "sec-fetch-site": "same-origin",
    },
    socket: {
      remoteAddress: "127.0.0.1",
    },
  };
  return {
    ...base,
    ...overrides,
    headers: {
      ...base.headers,
      ...(overrides.headers || {}),
    },
    socket: {
      ...base.socket,
      ...(overrides.socket || {}),
    },
  };
}

assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1,
  "VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1",
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1.host_or_peer_authority_forbidden,
  true,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1.query_secret,
  false,
);

for (const [host, remote] of [
  ["127.0.0.1:4100", "127.0.0.1"],
  ["localhost:4100", "::1"],
  ["[::1]:4100", "::ffff:127.0.0.1"],
] as const) {
  const { result, res } = response();
  assert.equal(
    authorizeBuyVoidOperatorLocalReadV1(
      request({ headers: { host }, socket: { remoteAddress: remote } }),
      res,
    ),
    true,
  );
  assert.equal(result.body, null);
}

for (const req of [
  request({
    headers: { host: "127.0.0.1:4100" },
    socket: { remoteAddress: "203.0.113.9" },
  }),
  request({
    headers: { host: "public.example.invalid" },
    socket: { remoteAddress: "127.0.0.1" },
  }),
  request({
    headers: { host: "localhost.evil.invalid:4100" },
    socket: { remoteAddress: "127.0.0.1" },
  }),
  request({
    headers: { host: "127.0.0.1:99999" },
    socket: { remoteAddress: "127.0.0.1" },
  }),
]) {
  const { result, res } = response();
  assert.equal(authorizeBuyVoidOperatorLocalReadV1(req, res), false);
  assert.equal(result.status, 403);
  assert.equal(result.body?.error, "operator_queue_local_only");
}

{
  const { result, res } = response();
  assert.equal(authorizeBuyVoidOperatorMutationV1(request(), res), true);
  assert.equal(result.body, null);
}

{
  const { result, res } = response();
  const cli = request({
    headers: {
      host: "localhost:4100",
      origin: undefined,
      "sec-fetch-site": undefined,
    },
    socket: { remoteAddress: "::1" },
  });
  assert.equal(authorizeBuyVoidOperatorMutationV1(cli, res), true);
  assert.equal(result.body, null);
}

for (const [req, status, error] of [
  [
    request({ method: "GET" }),
    405,
    "operator_mutation_method_not_allowed",
  ],
  [
    request({
      headers: {
        [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]: undefined,
      },
    }),
    403,
    "operator_mutation_intent_required",
  ],
  [
    request({
      headers: {
        [VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1]:
          "VOID_BUY_VOID_OPERATOR_MUTATION_V0",
      },
    }),
    403,
    "operator_mutation_intent_required",
  ],
  [
    request({ headers: { "sec-fetch-site": "cross-site" } }),
    403,
    "operator_mutation_cross_site_forbidden",
  ],
  [
    request({ headers: { origin: "https://evil.example.invalid" } }),
    403,
    "operator_mutation_origin_forbidden",
  ],
  [
    request({ headers: { origin: "http://localhost:9999" } }),
    403,
    "operator_mutation_origin_forbidden",
  ],
  [
    request({
      headers: { host: "127.0.0.1:4100" },
      socket: { remoteAddress: "198.51.100.5" },
    }),
    403,
    "operator_queue_local_only",
  ],
] as const) {
  const { result, res } = response();
  assert.equal(authorizeBuyVoidOperatorMutationV1(req, res), false);
  assert.equal(result.status, status);
  assert.equal(result.body?.error, error);
  if (status === 405) {
    assert.equal(result.headers.allow, "POST");
  }
}

const runtimeSource = fs.readFileSync("src/index.ts", "utf8");
const txHashBindingSource = fs.readFileSync(
  "src/economic/buy_void_request_tx_hash_binding_v1.ts",
  "utf8",
);

for (const route of [
  "/__void/buy-void/operator/verify-payment.json",
  "/__void/buy-void/operator/mark.json",
]) {
  assert.equal(
    runtimeSource.includes(`app.post("${route}"`),
    true,
    `operator mutation route must be POST: ${route}`,
  );
  assert.equal(
    runtimeSource.includes(`app.get("${route}"`),
    false,
    `operator mutation route must not remain GET: ${route}`,
  );
}
assert.match(
  runtimeSource,
  /const __voidBuyVoidOperatorLocalOnlyV1=__boi\.authorizeBuyVoidOperatorLocalReadV1/u,
);
assert.match(
  runtimeSource,
  /const __voidBuyVoidOperatorMutationIntentV1=__boi\.authorizeBuyVoidOperatorMutationV1/u,
);
assert.match(
  runtimeSource,
  /if \(!__voidBuyVoidOperatorMutationIntentV1\(req,res\)\) return;/u,
);
assert.match(
  runtimeSource,
  /method:"POST",headers:\{"x-void-operator-intent":"VOID_BUY_VOID_OPERATOR_MUTATION_V1"\}/u,
);
assert.match(
  runtimeSource,
  /mutationIntent:__voidBuyVoidOperatorMutationIntentV1/u,
);
assert.match(
  txHashBindingSource,
  /if \(!mutationIntent\(req, res\)\) return;/u,
);

console.log("VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1_PROOF_GREEN");
console.log("loopback_host_and_socket_peer_required=true");
console.log("forged_local_host_remote_peer_rejected=true");
console.log("public_host_loopback_proxy_rejected=true");
console.log("operator_mutation_post_required=true");
console.log("operator_mutation_intent_header_required=true");
console.log("cross_site_browser_mutation_rejected=true");
console.log("mounted_operator_mutation_routes_post_only=true");
console.log("tx_hash_binding_mutation_intent_wired=true");
console.log("query_secret=false");
console.log("runtime_mutation=false");
console.log("funds_movement=false");
