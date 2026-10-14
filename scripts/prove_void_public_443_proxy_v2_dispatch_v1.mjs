#!/usr/bin/env node
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";

import {
  VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1,
  VOID_PUBLIC_443_DISPATCH_EARN_V1,
  VOID_PUBLIC_443_DISPATCH_FRONTDOOR_V1,
  VOID_PUBLIC_443_PROXY_V2_DISPATCH_AUTHORITY_V1,
  classifyVoidPublic443ProxyV2DispatchV1,
} from "../tools/void-public-443-proxy-v2-dispatch-v1.mjs";
import {
  VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-edge-composition-v1.mjs";
import {
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
} from "../tools/void-public-earn-proxy-v2-edge-contract-v1.mjs";

const ROOT = process.cwd();
const DISPATCHER = path.join(
  ROOT,
  "ops",
  "public",
  "void-public-443-proxy-v2-dispatcher-v1.mjs",
);

const SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);

function proxy4({
  source = "203.0.113.10",
  sourcePort = 50000,
  destinationPort = 443,
} = {}) {
  const octets = source.split(".").map(Number);
  assert.equal(octets.length, 4);
  const payload = Buffer.alloc(12);
  payload.set(octets, 0);
  payload.set([127, 0, 0, 1], 4);
  payload.writeUInt16BE(sourcePort, 8);
  payload.writeUInt16BE(destinationPort, 10);

  const header = Buffer.alloc(16);
  SIGNATURE.copy(header, 0);
  header[12] = 0x21;
  header[13] = 0x11;
  header.writeUInt16BE(payload.length, 14);
  return Buffer.concat([header, payload]);
}

function request({
  source = "203.0.113.10",
  sourcePort = 50000,
  destinationPort = 443,
  method = "POST",
  target,
  headers = [],
  body = Buffer.alloc(0),
  includeProxy = true,
}) {
  const proxy = includeProxy
    ? proxy4({ source, sourcePort, destinationPort })
    : Buffer.alloc(0);
  const http = Buffer.concat([
    Buffer.from(
      [
        method + " " + target + " HTTP/1.1",
        "Host: public.example",
        "Content-Length: " + String(body.length),
        ...headers,
        "Connection: close",
        "",
        "",
      ].join("\r\n"),
      "ascii",
    ),
    body,
  ]);
  return Object.freeze({
    proxy,
    http,
    all: Buffer.concat([proxy, http]),
  });
}

function classify(bytes) {
  return classifyVoidPublic443ProxyV2DispatchV1({
    connection_prefix: bytes,
  });
}

const credential = request({
  target: VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1,
});
const credentialClassified = classify(credential.all);
assert.equal(credentialClassified.ok, true);
assert.equal(
  credentialClassified.dispatch_target,
  VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1,
);
assert.equal(credentialClassified.preserve_proxy_preface, true);
assert.equal(credentialClassified.strip_proxy_preface, false);

const earnClaim = request({
  target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
});
const earnClaimClassified = classify(earnClaim.all);
assert.equal(earnClaimClassified.ok, true);
assert.equal(
  earnClaimClassified.dispatch_target,
  VOID_PUBLIC_443_DISPATCH_EARN_V1,
);
assert.equal(earnClaimClassified.preserve_proxy_preface, true);

const earnSubmit = request({
  target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
  headers: ["Authorization: Bearer opaque"],
});
const earnSubmitClassified = classify(earnSubmit.all);
assert.equal(earnSubmitClassified.ok, true);
assert.equal(
  earnSubmitClassified.dispatch_target,
  VOID_PUBLIC_443_DISPATCH_EARN_V1,
);

const ordinary = request({
  method: "GET",
  target: "/app/",
  headers: ["X-Forwarded-For: 198.51.100.9"],
});
const ordinaryClassified = classify(ordinary.all);
assert.equal(ordinaryClassified.ok, true);
assert.equal(
  ordinaryClassified.dispatch_target,
  VOID_PUBLIC_443_DISPATCH_FRONTDOOR_V1,
);
assert.equal(ordinaryClassified.preserve_proxy_preface, false);
assert.equal(ordinaryClassified.strip_proxy_preface, true);

const sameSourceOtherPort = classify(
  request({
    source: "203.0.113.10",
    sourcePort: 59999,
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  }).all,
);
assert.equal(sameSourceOtherPort.ok, true);
assert.equal(
  sameSourceOtherPort.limiter_source_key,
  earnClaimClassified.limiter_source_key,
);

for (const candidate of [
  request({
    target: VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 + "?x=1",
  }),
  request({
    target: VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 + "/",
  }),
  request({
    target:
      "/__void/agents/paid-work/x/../credential-requests/v1",
  }),
  request({
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1 + "?x=1",
  }),
  request({
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1 + "/",
  }),
  request({
    target:
      "/wc/public-earning-pilot-v1/x/../claim-ticket",
  }),
  request({
    method: "GET",
    target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
  }),
]) {
  const result = classify(candidate.all);
  assert.equal(result.ok, false);
  assert.equal(result.status, "HOLD");
  assert.match(
    result.reason,
    /^dispatch_sensitive_(target_noncanonical|post_required)$/u,
  );
}

const wrongDestination = classify(
  request({
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    destinationPort: 8443,
  }).all,
);
assert.equal(wrongDestination.ok, false);
assert.equal(
  wrongDestination.reason,
  "dispatch_proxy_destination_port_invalid",
);

const directHttp = classify(
  request({
    target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    includeProxy: false,
  }).all,
);
assert.equal(directHttp.ok, false);
assert.match(directHttp.reason, /^dispatch_proxy_v2_/u);

for (const [key, expected] of Object.entries({
  one_public_443_owner_required: true,
  strict_proxy_v2_source_required: true,
  public_tls_destination_port_bound: true,
  exact_credential_route_only: true,
  exact_earn_claim_submit_routes_only: true,
  ordinary_public_frontdoor_passthrough: true,
  sensitive_proxy_preface_preserved: true,
  frontdoor_proxy_preface_stripped: true,
  source_identity_forwarded_as_http_header: false,
  forwarding_headers_trusted_for_dispatch: false,
  generic_sensitive_mutation_route_authorized: false,
  connector_process_identity_proven: false,
  downstream_listener_ownership_proven: false,
  exclusive_reachability_proven: false,
  nftables_policy_proven: false,
  tailscale_funnel_configuration_verified: false,
  runtime_integration: false,
  work_credit_write: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_PUBLIC_443_PROXY_V2_DISPATCH_AUTHORITY_V1[key],
    expected,
    key,
  );
}

async function makeBackend(name) {
  const calls = [];
  const state = { accepted: 0, live: 0 };
  const server = net.createServer((socket) => {
    state.accepted += 1;
    state.live += 1;
    socket.once("close", () => { state.live -= 1; });
    socket.on("error", () => {});
    const chunks = [];
    socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    socket.once("end", () => {
      calls.push(Buffer.concat(chunks));
      const body = Buffer.from(name + "\n", "utf8");
      socket.end(
        Buffer.concat([
          Buffer.from(
            [
              "HTTP/1.1 200 OK",
              "Connection: close",
              "Content-Type: text/plain",
              "Content-Length: " + String(body.length),
              "",
              "",
            ].join("\r\n"),
            "ascii",
          ),
          body,
        ]),
      );
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return Object.freeze({
    name,
    server,
    port: address.port,
    calls,
    state,
  });
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function startDispatcher({
  credentialPort,
  earnPort,
  frontdoorPort,
}) {
  const logs = [];
  const child = spawn(process.execPath, [DISPATCHER], {
    cwd: ROOT,
    env: {
      ...process.env,
      VOID_PUBLIC_443_PROXY_V2_DISPATCH_PROOF_MODE: "1",
      VOID_PUBLIC_443_PROXY_V2_DISPATCH_PORT: "0",
      VOID_PUBLIC_443_CREDENTIAL_EDGE_PORT:
        String(credentialPort),
      VOID_PUBLIC_443_EARN_EDGE_PORT: String(earnPort),
      VOID_PUBLIC_443_FRONTDOOR_PORT: String(frontdoorPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) =>
    logs.push(chunk.toString("utf8")),
  );
  child.stderr.on("data", (chunk) =>
    logs.push(chunk.toString("utf8")),
  );
  return { child, logs };
}

async function ready(runtime) {
  for (let index = 0; index < 160; index += 1) {
    if (runtime.child.exitCode !== null) {
      throw new Error(runtime.logs.join(""));
    }
    for (const line of runtime.logs
      .join("")
      .split(/\r?\n/u)
      .filter(Boolean)) {
      try {
        const value = JSON.parse(line);
        if (
          value?.marker ===
            "VOID_PUBLIC_443_PROXY_V2_DISPATCH_RUNTIME_V1" &&
          value.ready === true
        ) {
          return value;
        }
      } catch (error) {
        void error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(
    "public 443 dispatcher readiness timeout: " +
      runtime.logs.join(""),
  );
}

async function sendRaw(port, bytes) {
  const socket = net.createConnection({
    host: "127.0.0.1",
    port,
  });
  socket.setNoDelay(true);
  const chunks = [];
  socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  await once(socket, "connect");
  socket.end(bytes);
  await once(socket, "close");
  return Buffer.concat(chunks).toString("utf8");
}

async function waitForAccepted(backend, count) {
  for (let index = 0; index < 160; index += 1) {
    if (backend.state.accepted >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    "backend accept timeout: " +
      backend.name +
      " expected=" +
      String(count) +
      " actual=" +
      String(backend.state.accepted),
  );
}

async function abruptResetAfterDispatch(port, bytes, backend) {
  const socket = net.createConnection({
    host: "127.0.0.1",
    port,
  });
  socket.setNoDelay(true);
  socket.on("error", () => {});
  await once(socket, "connect");
  const expectedAccepted = backend.state.accepted + 1;
  socket.write(bytes);
  await waitForAccepted(backend, expectedAccepted);
  assert.equal(typeof socket.resetAndDestroy, "function");
  const closed = new Promise((resolve) => socket.once("close", resolve));
  socket.resetAndDestroy();
  await closed;
}

async function proveRejectedHalfOpenCleanup(port, bytes, healthyBytes) {
  const heldClients = [];
  try {
    // A peer can receive a server FIN but deliberately keep its write half
    // open. Client "close" is NOT a proof that the server freed its descriptor.
    // Keep the server's entire 256-connection budget occupied on the peer side;
    // one more healthy request must still be accepted and answered.
    for (let index = 0; index < 256; index += 1) {
      const socket = net.createConnection({
        host: "127.0.0.1",
        port,
        allowHalfOpen: true,
      });
      heldClients.push(socket);
      socket.setNoDelay(true);
      socket.on("error", () => {});
      const chunks = [];
      socket.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      const remoteEnd = new Promise((resolve) => socket.once("end", resolve));
      await once(socket, "connect");
      socket.write(bytes);
      let deadline;
      try {
        await Promise.race([
          remoteEnd,
          new Promise((_, reject) => {
            deadline = setTimeout(
              () => reject(new Error("rejection response deadline exceeded")),
              3500,
            );
          }),
        ]);
      } finally {
        clearTimeout(deadline);
      }
      assert.match(
        Buffer.concat(chunks).toString("utf8"),
        /^HTTP\/1\.1 400 Bad Request/u,
      );
    }

    const healthyResponse = await sendRaw(port, healthyBytes);
    assert.match(
      healthyResponse,
      /^HTTP\/1\.1 200 OK/u,
      "dispatcher exhausted by rejected half-open peers",
    );
  } finally {
    for (const socket of heldClients) socket.destroy();
  }
}

async function proveRelayIdleCleanup(port, bytes, backend) {
  const expectedAccepted = backend.state.accepted + 1;
  const socket = net.createConnection({ host: "127.0.0.1", port });
  socket.setNoDelay(true);
  socket.on("error", () => {});
  const closed = new Promise((resolve) => socket.once("close", resolve));
  await once(socket, "connect");
  // Fully classified request, but no client FIN: backend intentionally waits
  // for EOF, and the relay must close both descriptors after a quiet interval.
  socket.write(bytes);
  await waitForAccepted(backend, expectedAccepted);
  let deadline;
  try {
    await Promise.race([
      closed,
      new Promise((_, reject) => {
        deadline = setTimeout(
          () => reject(new Error("relay idle socket remained open")),
          6000,
        );
      }),
    ]);
  } finally {
    clearTimeout(deadline);
    socket.destroy();
  }

  for (let index = 0; index < 160 && backend.state.live !== 0; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(backend.state.live, 0, "idle downstream leaked a socket");
}

async function stop(runtime) {
  if (runtime.child.exitCode !== null) return;
  const exit = once(runtime.child, "exit");
  runtime.child.kill("SIGTERM");
  await exit;
}

const credentialBackend = await makeBackend("credential");
const earnBackend = await makeBackend("earn");
const frontdoorBackend = await makeBackend("frontdoor");
const runtime = startDispatcher({
  credentialPort: credentialBackend.port,
  earnPort: earnBackend.port,
  frontdoorPort: frontdoorBackend.port,
});

try {
  const info = await ready(runtime);
  assert.equal(info.listen_host, "127.0.0.1");
  assert.equal(info.public_tls_port, 443);
  assert.equal(info.relay_idle_timeout_ms, 1500);
  assert.equal(info.relay_idle_cleanup_enabled, true);
  assert.equal(info.one_public_443_owner_required, true);
  assert.equal(info.strict_proxy_v2_source_required, true);
  assert.equal(info.sensitive_proxy_preface_preserved, true);
  assert.equal(info.frontdoor_proxy_preface_stripped, true);
  assert.equal(info.source_identity_forwarded_as_http_header, false);
  assert.equal(info.connector_process_identity_proven, false);
  assert.equal(info.runtime_integration, false);

  let response = await sendRaw(info.listen_port, credential.all);
  assert.match(response, /^HTTP\/1\.1 200 OK/u);
  assert.equal(credentialBackend.calls.length, 1);
  assert.deepEqual(credentialBackend.calls[0], credential.all);
  assert.equal(earnBackend.calls.length, 0);
  assert.equal(frontdoorBackend.calls.length, 0);

  response = await sendRaw(info.listen_port, earnClaim.all);
  assert.match(response, /^HTTP\/1\.1 200 OK/u);
  assert.equal(earnBackend.calls.length, 1);
  assert.deepEqual(earnBackend.calls[0], earnClaim.all);

  response = await sendRaw(info.listen_port, earnSubmit.all);
  assert.match(response, /^HTTP\/1\.1 200 OK/u);
  assert.equal(earnBackend.calls.length, 2);
  assert.deepEqual(earnBackend.calls[1], earnSubmit.all);

  response = await sendRaw(info.listen_port, ordinary.all);
  assert.match(response, /^HTTP\/1\.1 200 OK/u);
  assert.equal(frontdoorBackend.calls.length, 1);
  assert.deepEqual(frontdoorBackend.calls[0], ordinary.http);
  assert.equal(
    frontdoorBackend.calls[0].subarray(0, 3).toString("ascii"),
    "GET",
  );

  const ordinaryPost = request({
    target: "/public/existing-post",
    body: Buffer.from("x", "ascii"),
  });
  response = await sendRaw(info.listen_port, ordinaryPost.all);
  assert.match(response, /^HTTP\/1\.1 200 OK/u);
  assert.equal(frontdoorBackend.calls.length, 2);
  assert.deepEqual(frontdoorBackend.calls[1], ordinaryPost.http);

  await abruptResetAfterDispatch(
    info.listen_port,
    ordinary.all,
    frontdoorBackend,
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(
    runtime.child.exitCode,
    null,
    "client reset terminated dispatcher: " + runtime.logs.join(""),
  );
  const acceptedBeforeResetRecovery = frontdoorBackend.state.accepted;
  response = await sendRaw(info.listen_port, ordinary.all);
  assert.match(response, /^HTTP\/1\.1 200 OK/u);
  assert.equal(
    frontdoorBackend.state.accepted,
    acceptedBeforeResetRecovery + 1,
  );
  assert.deepEqual(frontdoorBackend.calls.at(-1), ordinary.http);

  await proveRelayIdleCleanup(
    info.listen_port,
    ordinary.all,
    frontdoorBackend,
  );
  assert.equal(
    runtime.child.exitCode,
    null,
    "idle relay cleanup terminated dispatcher: " + runtime.logs.join(""),
  );
  response = await sendRaw(info.listen_port, ordinary.all);
  assert.match(response, /^HTTP\/1\.1 200 OK/u);

  const beforeHalfOpenProof = frontdoorBackend.calls.length;
  const beforeHalfOpenEarn = earnBackend.calls.length;
  await proveRejectedHalfOpenCleanup(
    info.listen_port,
    request({
      method: "GET",
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    }).all,
    ordinary.all,
  );
  assert.equal(earnBackend.calls.length, beforeHalfOpenEarn);
  assert.equal(
    frontdoorBackend.calls.length,
    beforeHalfOpenProof + 1,
  );
  assert.deepEqual(frontdoorBackend.calls.at(-1), ordinary.http);

  const beforeRejects = Object.freeze({
    credential: credentialBackend.calls.length,
    earn: earnBackend.calls.length,
    frontdoor: frontdoorBackend.calls.length,
  });

  for (const rejected of [
    request({
      target:
        VOID_AGENT_CREDENTIAL_REQUEST_PATH_V1 + "?bad=1",
    }),
    request({
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1 + "/",
    }),
    request({
      method: "GET",
      target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
    }),
    request({
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
      destinationPort: 8443,
    }),
    request({
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
      includeProxy: false,
    }),
  ]) {
    response = await sendRaw(info.listen_port, rejected.all);
    assert.match(response, /^HTTP\/1\.1 400 Bad Request/u);
  }

  assert.equal(
    credentialBackend.calls.length,
    beforeRejects.credential,
  );
  assert.equal(earnBackend.calls.length, beforeRejects.earn);
  assert.equal(
    frontdoorBackend.calls.length,
    beforeRejects.frontdoor,
  );

  console.log("VOID_PUBLIC_443_PROXY_V2_DISPATCH_V1_GREEN");
  console.log("one_public_443_owner_source_contract=true");
  console.log("strict_proxy_v2_required=true");
  console.log("credential_exact_route_to_credential_edge=true");
  console.log("earn_exact_routes_to_earn_edge=true");
  console.log("ordinary_public_routes_to_frontdoor=true");
  console.log("sensitive_proxy_preface_preserved=true");
  console.log("frontdoor_proxy_preface_stripped=true");
  console.log("client_half_close_response_preserved=true");
  console.log("client_reset_after_classification_process_survives=true");
  console.log("relay_idle_socket_pair_closed=true");
  console.log("relay_idle_cleanup_dispatcher_survives=true");
  console.log("rejected_half_open_server_capacity_preserved=true");
  console.log("sensitive_aliases_fail_closed=true");
  console.log("generic_sensitive_mutation_route_authorized=false");
  console.log("source_port_in_dispatch_identity=false");
  console.log("source_identity_forwarded_as_http_header=false");
  console.log("connector_process_identity_proven=false");
  console.log("downstream_listener_ownership_proven=false");
  console.log("exclusive_reachability_proven=false");
  console.log("nftables_policy_proven=false");
  console.log("tailscale_funnel_configuration_verified=false");
  console.log("runtime_integration=false");
  console.log("work_credit_write=false");
  console.log("funds_movement=false");
} finally {
  await stop(runtime);
  await Promise.all([
    closeServer(credentialBackend.server),
    closeServer(earnBackend.server),
    closeServer(frontdoorBackend.server),
  ]);
}
