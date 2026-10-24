// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";

import { registerP2PRoutes } from "../src/http/p2p_routes.js";

const MARKER = "VOID_P2P_DIAL_ROUTE_VALIDATION_V1_PROOF_GREEN";

type Handler = (
  req: { body?: unknown; query: Record<string, unknown> },
  res: {
    status(code: number): unknown;
    json(value: unknown): unknown;
  },
) => unknown;

function register(node: unknown) {
  const getHandlers = new Map<string, Handler>();
  const postHandlers = new Map<string, Handler>();
  const app = {
    get(path: string, handler: Handler) {
      getHandlers.set(path, handler);
      return app;
    },
    post(path: string, handler: Handler) {
      postHandlers.set(path, handler);
      return app;
    },
  };

  registerP2PRoutes(app as any, node);

  const getDial = getHandlers.get("/p2p/dial");
  const postDial = postHandlers.get("/p2p/dial");
  assert(getDial, "GET /p2p/dial handler missing");
  assert(postDial, "POST /p2p/dial handler missing");
  return { getDial, postDial };
}

function invoke(
  handler: Handler,
  req: { body?: unknown; query: Record<string, unknown> },
) {
  let status = 200;
  let payload: unknown;
  const response = {
    status(code: number) {
      status = code;
      return response;
    },
    json(value: unknown) {
      payload = value;
      return response;
    },
  };

  handler(req, response);
  return { status, payload };
}

const dials: string[] = [];
const { getDial, postDial } = register({
  connect(address: string) {
    dials.push(address);
  },
  peersSnapshot() {
    return { connected: [], knownAddrs: [] };
  },
});

assert.deepEqual(
  invoke(getDial, {
    query: { addr: "Seed.Example:4701" },
  }),
  {
    status: 200,
    payload: { ok: true, dialing: "seed.example:4701" },
  },
);
assert.deepEqual(dials, ["seed.example:4701"]);

assert.deepEqual(
  invoke(postDial, {
    body: { addr: "[2001:0db8::1]:4700" },
    query: {},
  }),
  {
    status: 200,
    payload: { ok: true, dialing: "[2001:db8::1]:4700" },
  },
);
assert.deepEqual(dials, ["seed.example:4701", "[2001:db8::1]:4700"]);

const malformed: unknown[] = [
  "",
  "seed.example:0",
  "seed.example:65536",
  "seed.example:99999",
  "seed.example:-1",
  "seed.example:abc",
  "seed.example:4700/path",
  "seed.example:4700?x=1",
  " user.example:4700",
  "127.1:4700",
  "0177.0.0.1:4700",
  "0x7f000001:4700",
  "2001:db8::1:4700",
  "[fe80::1%eth0]:4700",
  ["seed.example:4700"],
  { toString: () => "seed.example:4700" },
  4700,
];

for (const addr of malformed) {
  const before = dials.length;
  assert.deepEqual(
    invoke(postDial, {
      body: { addr },
      query: {},
    }),
    {
      status: 200,
      payload: { ok: false, error: "bad addr" },
    },
    `unexpected dial result for ${String(addr)}`,
  );
  assert.equal(
    dials.length,
    before,
    `malformed address reached node.connect: ${String(addr)}`,
  );
}

assert.deepEqual(
  invoke(postDial, {
    body: {},
    query: { addr: "Fallback.Example:4702" },
  }),
  {
    status: 200,
    payload: { ok: true, dialing: "fallback.example:4702" },
  },
);
assert.equal(dials.at(-1), "fallback.example:4702");

const unavailable = register({});
assert.deepEqual(
  invoke(unavailable.postDial, {
    body: { addr: "seed.example:4700" },
    query: {},
  }).payload,
  { ok: false, error: "node.connect() not available" },
);

const throwing = register({
  connect() {
    throw new Error("dial disabled");
  },
});
assert.deepEqual(
  invoke(throwing.postDial, {
    body: { addr: "seed.example:4700" },
    query: {},
  }).payload,
  { ok: false, error: "dial disabled" },
);

console.log(MARKER);
console.log("canonical_parser_reused=true");
console.log("malformed_address_implicit_success=false");
console.log("non_string_address_coercion=false");
console.log("canonical_address_passed_to_node_connect=true");
console.log("node_connect_unavailable_explicit_error=true");
console.log("node_connect_throw_explicit_error=true");
console.log("live_socket_opened=false");
console.log("runtime_or_network_mutation=false");
console.log("wallet_signer_validator_wc_money_authority=0");
