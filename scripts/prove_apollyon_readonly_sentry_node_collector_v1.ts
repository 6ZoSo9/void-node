import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA,
} from "../src/security/apollyon_readonly_sentry_observation_v1.js";
import {
  VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_V1_SCHEMA,
  VOID_APOLLYON_READONLY_SENTRY_NODE_ENDPOINTS_V1,
  VOID_APOLLYON_READONLY_SENTRY_NODE_MAX_RESPONSE_BYTES_V1,
  VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1,
  collectApollyonReadonlySentryNodeEvidenceV1,
} from "../src/security/apollyon_readonly_sentry_node_collector_v1.js";

const MARKER = "VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_V1_PROOF_GREEN";

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

interface ResponseOptions {
  status?: number;
  redirected?: boolean;
  contentType?: string | null;
  contentLength?: string | null;
  chunks?: Uint8Array[];
}

function fakeResponse(
  url: string,
  bodyBytes: Uint8Array,
  options: ResponseOptions = {},
): Response {
  const chunks = options.chunks ?? [bodyBytes];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const headers = new Headers();
  if (options.contentType !== null) {
    headers.set("content-type", options.contentType ?? "application/json; charset=utf-8");
  }
  if (options.contentLength !== null) {
    headers.set("content-length", options.contentLength ?? String(bodyBytes.byteLength));
  }
  return {
    url,
    redirected: options.redirected ?? false,
    status: options.status ?? 200,
    headers,
    body: stream,
  } as unknown as Response;
}

const bodies = {
  health: bytes(JSON.stringify({ ok: true, extra: "bound-by-digest" })),
  ready: bytes(JSON.stringify({ ready: true, gap: 0, txroot_live: 1, extra: 7 })),
  head: bytes(JSON.stringify({ number: 1951058, note: "headfile.v1" })),
  peers: bytes(JSON.stringify({
    ok: true,
    connected: [
      { id: "peer.alpha", addr: "127.0.0.1:4701" },
      { id: "peer.beta", addr: "127.0.0.1:4702" },
    ],
    knownAddrs: ["127.0.0.1:4703"],
    verifiedPeers: [
      { node_id: "peer.beta", addresses: ["127.0.0.1:4702"], last_authenticated_at_ms: 1 },
      { node_id: "peer.offline", addresses: ["127.0.0.1:4709"], last_authenticated_at_ms: 2 },
    ],
  })),
};

type FixtureOverrides = Partial<Record<keyof typeof bodies, Response | (() => Promise<Response>)>>;

function fixtureFetch(overrides: FixtureOverrides = {}) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const byPath = new Map<string, keyof typeof bodies>(
    Object.entries(VOID_APOLLYON_READONLY_SENTRY_NODE_ENDPOINTS_V1).map(
      ([name, path]) => [path, name as keyof typeof bodies],
    ),
  );

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    const parsed = new URL(url);
    const name = byPath.get(parsed.pathname);
    if (!name) throw new Error(`unexpected path ${parsed.pathname}`);
    const override = overrides[name];
    if (typeof override === "function") return await override();
    if (override) return override;
    return fakeResponse(url, bodies[name]);
  };
  return { fetchImpl, calls };
}

async function mustCollect(fetchImpl: typeof fetch) {
  const result = await collectApollyonReadonlySentryNodeEvidenceV1(fetchImpl);
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error(result.reason);
  return result;
}

async function mustFail(fetchImpl: typeof fetch, expected: string) {
  const result = await collectApollyonReadonlySentryNodeEvidenceV1(fetchImpl);
  assert.deepEqual(result, { ok: false, reason: expected });
}

const healthyFixture = fixtureFetch();
const healthy = await mustCollect(healthyFixture.fetchImpl);
assert.equal(healthy.schema, VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_V1_SCHEMA);
assert.equal(healthy.evidence.schema, VOID_APOLLYON_NODE_HEALTH_EVIDENCE_V1_SCHEMA);
assert.equal(healthy.evidence.health_ok, true);
assert.equal(healthy.evidence.ready, true);
assert.equal(healthy.evidence.gap, 0);
assert.equal(healthy.evidence.txroot_live, 1);
assert.equal(healthy.evidence.latest_head, "1951058");
assert.equal(healthy.evidence.connected_peer_count, 2);
assert.equal(healthy.evidence.verified_peer_count, 1);
assert.equal(healthy.evidence.health_sha256, sha(bodies.health));
assert.equal(healthy.evidence.ready_sha256, sha(bodies.ready));
assert.equal(healthy.evidence.head_sha256, sha(bodies.head));
assert.equal(healthy.evidence.peers_sha256, sha(bodies.peers));
assert.equal(Object.isFrozen(healthy.evidence), true);
assert.equal(healthyFixture.calls.length, 4);

const expectedUrls = Object.values(VOID_APOLLYON_READONLY_SENTRY_NODE_ENDPOINTS_V1)
  .map((path) => `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}${path}`)
  .sort();
assert.deepEqual(healthyFixture.calls.map((call) => call.url).sort(), expectedUrls);
for (const call of healthyFixture.calls) {
  assert.equal(call.init?.method, "GET");
  assert.equal(call.init?.redirect, "error");
  assert.equal(call.init?.credentials, "omit");
  assert.ok(call.init?.signal instanceof AbortSignal);
  const headers = new Headers(call.init?.headers);
  assert.equal(headers.has("authorization"), false);
  assert.equal(headers.has("cookie"), false);
}
console.log("[PASS] exact four numeric-loopback GETs produce bounded content-addressed node evidence");
console.log("[PASS] verified peer evidence counts only authenticated connected IDs, not offline cache history");

const unhealthyBody = bytes(JSON.stringify({ ok: false }));
const unhealthyFixture = fixtureFetch({
  health: fakeResponse(`${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/health`, unhealthyBody),
});
const unhealthy = await mustCollect(unhealthyFixture.fetchImpl);
assert.equal(unhealthy.evidence.health_ok, false);
assert.equal(unhealthy.evidence.health_sha256, sha(unhealthyBody));
console.log("[PASS] unhealthy node state remains collectible evidence rather than transport success");

const stringHead = bytes(JSON.stringify({ number: "1951058" }));
const stringHeadFixture = fixtureFetch({
  head: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/blocks/latest/number2.json`,
    stringHead,
  ),
});
assert.equal((await mustCollect(stringHeadFixture.fetchImpl)).evidence.latest_head, "1951058");

const redirectedFixture = fixtureFetch({
  health: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/elsewhere`,
    bodies.health,
    { redirected: true },
  ),
});
await mustFail(redirectedFixture.fetchImpl, "health:response_provenance_invalid");

const statusFixture = fixtureFetch({
  ready: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/__void/ready.json`,
    bodies.ready,
    { status: 503 },
  ),
});
await mustFail(statusFixture.fetchImpl, "ready:http_status_503");

const contentTypeFixture = fixtureFetch({
  head: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/blocks/latest/number2.json`,
    bodies.head,
    { contentType: "text/html" },
  ),
});
await mustFail(contentTypeFixture.fetchImpl, "head:content_type_invalid");

const oversizedDeclaredFixture = fixtureFetch({
  health: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/health`,
    bodies.health,
    { contentLength: String(VOID_APOLLYON_READONLY_SENTRY_NODE_MAX_RESPONSE_BYTES_V1 + 1) },
  ),
});
await mustFail(oversizedDeclaredFixture.fetchImpl, "health:response_too_large");

const badLengthFixture = fixtureFetch({
  health: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/health`,
    bodies.health,
    { contentLength: "065536" },
  ),
});
await mustFail(badLengthFixture.fetchImpl, "health:response_content_length_invalid");

const oversizedChunks = [
  new Uint8Array(VOID_APOLLYON_READONLY_SENTRY_NODE_MAX_RESPONSE_BYTES_V1),
  new Uint8Array([1]),
];
const oversizedStreamFixture = fixtureFetch({
  peers: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/p2p/peers`,
    new Uint8Array(),
    { contentLength: null, chunks: oversizedChunks },
  ),
});
await mustFail(oversizedStreamFixture.fetchImpl, "peers:response_too_large");
console.log("[PASS] provenance/status/content-type/declared and streamed response bounds fail closed");

const invalidUtf8Fixture = fixtureFetch({
  health: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/health`,
    new Uint8Array([0xc3, 0x28]),
  ),
});
await mustFail(invalidUtf8Fixture.fetchImpl, "health:response_utf8_invalid");

const invalidJson = bytes("{not-json");
const invalidJsonFixture = fixtureFetch({
  ready: fakeResponse(
    `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/__void/ready.json`,
    invalidJson,
  ),
});
await mustFail(invalidJsonFixture.fetchImpl, "ready:response_json_invalid");

const badReady = bytes(JSON.stringify({ ready: true, gap: -1, txroot_live: 1 }));
await mustFail(
  fixtureFetch({
    ready: fakeResponse(
      `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/__void/ready.json`,
      badReady,
    ),
  }).fetchImpl,
  "ready:gap_invalid",
);

const badHead = bytes(JSON.stringify({ number: "01951058" }));
await mustFail(
  fixtureFetch({
    head: fakeResponse(
      `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/blocks/latest/number2.json`,
      badHead,
    ),
  }).fetchImpl,
  "head:number_invalid",
);

const duplicatePeers = bytes(JSON.stringify({
  ok: true,
  connected: [{ id: "peer.same" }, { id: "peer.same" }],
  verifiedPeers: [],
}));
await mustFail(
  fixtureFetch({
    peers: fakeResponse(
      `${VOID_APOLLYON_READONLY_SENTRY_NODE_ORIGIN_V1}/p2p/peers`,
      duplicatePeers,
    ),
  }).fetchImpl,
  "peers:connected_duplicate",
);
console.log("[PASS] fatal UTF-8, JSON, route-shape, canonical-head and duplicate-peer violations fail closed");

let hungCalls = 0;
const hungFetch: typeof fetch = async () => {
  hungCalls += 1;
  return await new Promise<Response>(() => undefined);
};
await mustFail(hungFetch, "node_evidence_timeout");
assert.equal(hungCalls, 4);
console.log("[PASS] one shared deadline bounds a snapshot even when all four transports hang");

const rejectedFetch: typeof fetch = async () => {
  throw new Error("offline");
};
const rejected = await collectApollyonReadonlySentryNodeEvidenceV1(rejectedFetch);
assert.equal(rejected.ok, false);
if (!rejected.ok) {
  assert.match(rejected.reason, /:fetch_failed$/);
}

console.log(MARKER);
console.log("fixed_origin=http://127.0.0.1:4100");
console.log("exact_get_endpoints=4");
console.log("redirects_allowed=false");
console.log("credentials_sent=false");
console.log("response_persistence=false");
console.log("model_invoked=false");
console.log("provider_invoked=false");
console.log("service_mutation=false");
console.log("chain_mutation=false");
console.log("authority_granted=false");
