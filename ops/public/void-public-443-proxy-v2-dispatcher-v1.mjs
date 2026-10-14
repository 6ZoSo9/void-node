#!/usr/bin/env node
import net from "node:net";
import process from "node:process";

import {
  VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1,
  VOID_PUBLIC_443_DISPATCH_EARN_V1,
  VOID_PUBLIC_443_DISPATCH_FRONTDOOR_V1,
  classifyVoidPublic443ProxyV2DispatchV1,
} from "../../tools/void-public-443-proxy-v2-dispatch-v1.mjs";

const MARKER = "VOID_PUBLIC_443_PROXY_V2_DISPATCH_RUNTIME_V1";
const HOST = "127.0.0.1";
const MAX_UNCLASSIFIED_PREFIX_BYTES = 512 + 8 * 1024 + 2;
const CONNECT_TIMEOUT_MS = 5000;
const proofMode =
  process.env.VOID_PUBLIC_443_PROXY_V2_DISPATCH_PROOF_MODE === "1";

function fail(code) {
  throw new Error(code);
}

function portFromEnv(name, { allowProofZero = false } = {}) {
  const raw = String(process.env[name] ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/u.test(raw)) {
    fail("public_443_dispatch_port_invalid:" + name);
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value > 65535 ||
    (
      value === 0
        ? !(allowProofZero && proofMode)
        : value < 1024
    )
  ) {
    fail("public_443_dispatch_port_invalid:" + name);
  }
  return value;
}

const listenPort = portFromEnv(
  "VOID_PUBLIC_443_PROXY_V2_DISPATCH_PORT",
  { allowProofZero: true },
);
const credentialPort = portFromEnv(
  "VOID_PUBLIC_443_CREDENTIAL_EDGE_PORT",
);
const earnPort = portFromEnv(
  "VOID_PUBLIC_443_EARN_EDGE_PORT",
);
const frontdoorPort = portFromEnv(
  "VOID_PUBLIC_443_FRONTDOOR_PORT",
);

const fixedPorts = [credentialPort, earnPort, frontdoorPort];
if (new Set(fixedPorts).size !== fixedPorts.length) {
  fail("public_443_dispatch_downstream_port_collision");
}
if (listenPort !== 0 && fixedPorts.includes(listenPort)) {
  fail("public_443_dispatch_listener_port_collision");
}

function sendError(socket, reason) {
  if (socket.destroyed) return;
  const body = Buffer.from(
    JSON.stringify({
      ok: false,
      error: "public_443_ingress_rejected",
      reason: String(reason || "dispatch_hold").slice(0, 160),
    }) + "\n",
    "utf8",
  );
  socket.end(
    Buffer.concat([
      Buffer.from(
        [
          "HTTP/1.1 400 Bad Request",
          "Connection: close",
          "Cache-Control: no-store",
          "Content-Type: application/json; charset=utf-8",
          "Content-Length: " + String(body.length),
          "",
          "",
        ].join("\r\n"),
        "ascii",
      ),
      body,
    ]),
  );
}

function isIncomplete(reason) {
  return (
    reason === "dispatch_proxy_v2_header_incomplete" ||
    reason === "dispatch_proxy_v2_header_truncated" ||
    reason === "dispatch_http_request_line_incomplete"
  );
}

function readDispatchPrefix(socket) {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let settled = false;

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("end", onEnd);
      socket.off("timeout", onTimeout);
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const onError = (error) => finish(reject, error);
    const onEnd = () =>
      finish(
        reject,
        new Error("public_443_dispatch_client_ended_before_route"),
      );
    const onTimeout = () =>
      finish(
        reject,
        new Error("public_443_dispatch_request_timeout"),
      );

    const onData = (chunk) => {
      if (settled) return;
      try {
        buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
        const classified =
          classifyVoidPublic443ProxyV2DispatchV1({
            connection_prefix: buffer,
          });
        if (classified.ok === true) {
          socket.pause();
          finish(
            resolve,
            Object.freeze({
              classified,
              buffered: Buffer.from(buffer),
            }),
          );
          return;
        }
        if (isIncomplete(classified.reason)) {
          if (buffer.length > MAX_UNCLASSIFIED_PREFIX_BYTES) {
            throw new Error(
              "public_443_dispatch_unclassified_prefix_too_large",
            );
          }
          return;
        }
        throw new Error(
          String(classified.reason || "public_443_dispatch_hold"),
        );
      } catch (error) {
        finish(reject, error);
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("end", onEnd);
    socket.once("timeout", onTimeout);
    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.resume();
  });
}

function downstreamPort(target) {
  if (target === VOID_PUBLIC_443_DISPATCH_CREDENTIAL_V1) {
    return credentialPort;
  }
  if (target === VOID_PUBLIC_443_DISPATCH_EARN_V1) {
    return earnPort;
  }
  if (target === VOID_PUBLIC_443_DISPATCH_FRONTDOOR_V1) {
    return frontdoorPort;
  }
  fail("public_443_dispatch_target_invalid");
}

function connectDownstream(socket, dispatch) {
  return new Promise((resolve, reject) => {
    const port = downstreamPort(dispatch.classified.dispatch_target);
    const downstream = net.createConnection({
      host: HOST,
      port,
    });
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    // readDispatchPrefix() removes its temporary error listener after
    // classification. Keep relay-phase client errors connection-scoped and
    // tear down only the paired downstream socket.
    socket.once("error", (error) => {
      if (!downstream.destroyed) downstream.destroy();
      if (!socket.destroyed) socket.destroy();
      finish(reject, error);
    });

    downstream.setTimeout(CONNECT_TIMEOUT_MS);
    downstream.once("timeout", () => {
      downstream.destroy(
        new Error("public_443_dispatch_downstream_timeout"),
      );
    });
    downstream.once("error", (error) => {
      finish(reject, error);
    });
    downstream.once("connect", () => {
      try {
        downstream.setTimeout(0);
        downstream.setNoDelay(true);
        const initial =
          dispatch.classified.preserve_proxy_preface === true
            ? dispatch.buffered
            : dispatch.buffered.subarray(
                dispatch.classified.proxy_consumed_bytes,
              );

        downstream.pipe(socket);
        if (socket.readableEnded) {
          downstream.end(initial);
        } else {
          downstream.write(initial);
          socket.pipe(downstream);
          socket.resume();
        }

        finish(
          resolve,
          Object.freeze({
            downstream,
            target: dispatch.classified.dispatch_target,
          }),
        );
      } catch (error) {
        downstream.destroy();
        finish(reject, error);
      }
    });
  });
}

const server = net.createServer(
  { allowHalfOpen: true },
  (socket) => {
    socket.setNoDelay(true);
    // Never let a peer TCP reset become an unhandled EventEmitter error during
    // the narrow classification -> relay handoff window.
    socket.on("error", () => {});
    void (async () => {
    let dispatch;
    try {
      dispatch = await readDispatchPrefix(socket);
    } catch (error) {
      sendError(socket, error instanceof Error ? error.message : String(error));
      return;
    }

    try {
      await connectDownstream(socket, dispatch);
    } catch (error) {
      process.stderr.write(
        MARKER +
          " downstream_error=" +
          String(error) +
          "\n",
      );
      if (!socket.destroyed) {
        sendError(socket, "downstream_unavailable");
      }
    }
    })();
  },
);

server.maxConnections = 256;
server.on("error", (error) => {
  process.stderr.write(
    MARKER + " server_error=" + String(error) + "\n",
  );
  process.exitCode = 1;
});

function shutdown(signal) {
  server.close((error) => {
    if (error) {
      process.stderr.write(
        MARKER + " shutdown_error=" + String(error) + "\n",
      );
      process.exit(1);
    }
    process.stdout.write(
      MARKER + " stopped signal=" + signal + "\n",
    );
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(
  {
    host: HOST,
    port: listenPort,
    exclusive: true,
  },
  () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      fail("public_443_dispatch_listener_address_invalid");
    }
    process.stdout.write(
      JSON.stringify({
        marker: MARKER,
        ready: true,
        listen_host: address.address,
        listen_port: address.port,
        public_tls_port: 443,
        credential_edge_host: HOST,
        credential_edge_port: credentialPort,
        earn_edge_host: HOST,
        earn_edge_port: earnPort,
        frontdoor_host: HOST,
        frontdoor_port: frontdoorPort,
        one_public_443_owner_required: true,
        strict_proxy_v2_source_required: true,
        sensitive_proxy_preface_preserved: true,
        frontdoor_proxy_preface_stripped: true,
        source_identity_forwarded_as_http_header: false,
        forwarding_headers_trusted_for_dispatch: false,
        connector_process_identity_proven: false,
        downstream_listener_ownership_proven: false,
        exclusive_reachability_proven: false,
        nftables_policy_proven: false,
        tailscale_funnel_configuration_verified: false,
        runtime_integration: false,
        work_credit_write: false,
        funds_movement: false,
      }) + "\n",
    );
  },
);
