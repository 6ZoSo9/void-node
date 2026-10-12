#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  signVoidNodeOnionBindingV1,
} from "../tools/lib/void-node-onion-binding-v1.mjs";
import {
  encodeV3OnionHostname,
} from "../tools/lib/void-tor-onion-descriptor-v1.mjs";

const MARKER =
  "VOID_TOR_ONION_STATIC_TRANSPORT_RECONCILIATION_V1_PROOF";
const SOURCE_MARKER =
  "VOID_TOR_STATIC_TRANSPORT_COMPATIBILITY_V1";
const TOOL_PATH = resolve(
  process.cwd(),
  "tools/void-tor-onion-public-node-v1.mjs",
);

const ROUTES = Object.freeze([
  Object.freeze({
    path: "/public-node/datanet/index.json",
    file: "public/public-node/datanet/index.json",
  }),
  Object.freeze({
    path: "/public-node/datanet/paid-read-quote-v1.json",
    file: "public/public-node/datanet/paid-read-quote-v1.json",
  }),
  Object.freeze({
    path: "/public-node/datanet/paid-read-quote-v1.schema.json",
    file: "public/public-node/datanet/paid-read-quote-v1.schema.json",
  }),
]);

let assertions = 0;

function check(value, message) {
  assertions += 1;
  assert.ok(value, message);
}

function equal(actual, expected, message) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJsonBody(body) {
  return JSON.parse(body.toString("utf8").trim());
}

function listen(server, host = "127.0.0.1") {
  return new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, host, () => {
      server.removeListener("error", rejectListen);
      const address = server.address();
      if (!address || typeof address === "string") {
        rejectListen(new Error("unexpected listener address"));
        return;
      }
      resolveListen(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolveClose) => {
    server.close(() => resolveClose());
  });
}

function request({
  port,
  path,
  method = "GET",
  hostHeader = "",
}) {
  return new Promise((resolveRequest, rejectRequest) => {
    const headers = {
      "accept-encoding": "identity",
      connection: "close",
    };
    if (hostHeader) headers.host = hostHeader;

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.once("end", () => {
          resolveRequest({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.once("error", rejectRequest);
    req.end();
  });
}

function waitForGateway(child) {
  return new Promise((resolveReady, rejectReady) => {
    let stdout = "";
    let stderr = "";
    let port = 0;

    const timeout = setTimeout(() => {
      rejectReady(
        new Error(
          `gateway readiness timed out\nstdout=${stdout}\nstderr=${stderr}`,
        ),
      );
    }, 15_000);

    const inspect = () => {
      const match = stdout.match(/^port=(\d+)$/m);
      if (
        stdout.includes("VOID_TOR_ONION_PUBLIC_NODE_V1_READY")
        && match
      ) {
        port = Number(match[1]);
        clearTimeout(timeout);
        resolveReady({ port, stdout: () => stdout, stderr: () => stderr });
      }
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      inspect();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("exit", (code, signal) => {
      if (!port) {
        clearTimeout(timeout);
        rejectReady(
          new Error(
            `gateway exited before readiness: code=${code} signal=${signal}\n`
            + `stdout=${stdout}\nstderr=${stderr}`,
          ),
        );
      }
    });
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolveExit) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

async function main() {
  const source = await readFile(TOOL_PATH, "utf8");

  check(source.includes(SOURCE_MARKER), "source compatibility marker");
  check(
    source.includes("function handleSynchronousPublicRequest"),
    "synchronous public handler exists",
  );
  check(
    source.includes("async function proxyMcpRequest"),
    "bounded async MCP bridge remains",
  );
  check(
    source.includes("if (parsed.search || parsed.hash) return { error: 404 };"),
    "strict query rejection remains",
  );

  const helperIndex = source.indexOf(
    "function handleSynchronousPublicRequest",
  );
  const serverIndex = source.indexOf(
    "const server = http.createServer",
  );
  const handledIndex = source.indexOf(
    "const handled = handleSynchronousPublicRequest",
    serverIndex,
  );
  const asyncWrapperIndex = source.indexOf(
    "void (async () => {",
    serverIndex,
  );
  const proxyIndex = source.indexOf(
    "await proxyMcpRequest",
    asyncWrapperIndex,
  );

  check(helperIndex > 0 && helperIndex < serverIndex, "helper precedes server");
  check(
    handledIndex > serverIndex
      && handledIndex < asyncWrapperIndex
      && asyncWrapperIndex < proxyIndex,
    "static handler runs before preserved async MCP bridge",
  );

  const temporary = await mkdtemp(
    join(tmpdir(), "void-tor-static-transport-proof-"),
  );
  const hostnameFile = join(temporary, "hostname");
  const bindingFile = join(temporary, "binding.json");
  const fakeOnion = encodeV3OnionHostname(
    createHash("sha256")
      .update("void-tor-static-transport-proof-v1")
      .digest()
      .subarray(0, 32),
  );
  await writeFile(hostnameFile, `${fakeOnion}\n`, { mode: 0o600 });

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicDer = publicKey.export({ type: "spki", format: "der" });
  const nodeId = sha256(publicDer);
  const issuedAt = new Date(Date.now() - 60_000);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const binding = signVoidNodeOnionBindingV1({
    nodeId,
    privateKey,
    publicKey,
    onionHostname: fakeOnion,
    virtualPort: 80,
    issuedAt,
    expiresAt,
  });
  await writeFile(
    bindingFile,
    `${JSON.stringify(binding, null, 2)}\n`,
    { mode: 0o600 },
  );

  const mcpServer = http.createServer((req, res) => {
    const body = Buffer.from(
      `${JSON.stringify({
        marker: "VOID_TOR_STATIC_TRANSPORT_MCP_FIXTURE_V1",
        method: req.method,
        path: req.url,
      })}\n`,
      "utf8",
    );
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(body.length),
    });
    res.end(body);
  });

  let gateway;
  let relayServer;
  try {
    const mcpPort = await listen(mcpServer);

    gateway = spawn(
      process.execPath,
      [
        TOOL_PATH,
        "--host",
        "127.0.0.1",
        "--port",
        "0",
        "--hostname-file",
        hostnameFile,
        "--binding-file",
        bindingFile,
        "--virtual-port",
        "80",
        "--mcp-upstream-port",
        String(mcpPort),
        "--mcp-timeout-ms",
        "2000",
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const ready = await waitForGateway(gateway);
    const gatewayPort = ready.port;

    relayServer = net.createServer((client) => {
      const upstream = net.createConnection({
        host: "127.0.0.1",
        port: gatewayPort,
      });
      client.pipe(upstream);
      upstream.pipe(client);
      const destroyBoth = () => {
        client.destroy();
        upstream.destroy();
      };
      client.once("error", destroyBoth);
      upstream.once("error", destroyBoth);
    });
    const relayPort = await listen(relayServer);

    for (const route of ROUTES) {
      const expected = await readFile(resolve(process.cwd(), route.file));

      const directGet = await request({
        port: gatewayPort,
        path: route.path,
      });
      equal(directGet.status, 200, `${route.path} direct GET status`);
      equal(
        sha256(directGet.body),
        sha256(expected),
        `${route.path} direct GET body`,
      );

      const directHead = await request({
        port: gatewayPort,
        path: route.path,
        method: "HEAD",
      });
      equal(directHead.status, 200, `${route.path} direct HEAD status`);
      equal(directHead.body.length, 0, `${route.path} direct HEAD body`);
      equal(
        Number(directHead.headers["content-length"]),
        expected.length,
        `${route.path} direct HEAD length`,
      );

      const directQuery = await request({
        port: gatewayPort,
        path: `${route.path}?void_probe=1`,
      });
      equal(directQuery.status, 404, `${route.path} strict query denial`);

      const directPost = await request({
        port: gatewayPort,
        path: route.path,
        method: "POST",
      });
      equal(directPost.status, 405, `${route.path} POST denial`);

      const relayedGet = await request({
        port: relayPort,
        path: route.path,
        hostHeader: fakeOnion,
      });
      equal(relayedGet.status, 200, `${route.path} relay GET status`);
      equal(
        sha256(relayedGet.body),
        sha256(expected),
        `${route.path} relay GET body`,
      );
    }

    const descriptor = await request({
      port: relayPort,
      path: "/public-node/agents/mcp-tor-v1.json",
      hostHeader: fakeOnion,
    });
    equal(descriptor.status, 200, "MCP descriptor relay status");
    const descriptorValue = parseJsonBody(descriptor.body);
    equal(
      descriptorValue.marker,
      "VOID_TOR_AGENT_MCP_READONLY_V1",
      "MCP descriptor marker",
    );
    equal(
      descriptorValue.identity.signed_void_node_binding,
      true,
      "MCP descriptor signed binding",
    );
    equal(
      descriptorValue.identity.canonical_void_node_identity,
      true,
      "MCP descriptor canonical identity",
    );
    equal(
      descriptorValue.identity.node_id,
      nodeId,
      "MCP descriptor node ID",
    );

    const bindingRoute = await request({
      port: relayPort,
      path: "/public-node/transports/tor-v1-binding.json",
      hostHeader: fakeOnion,
    });
    equal(bindingRoute.status, 200, "binding relay status");
    const bindingValue = parseJsonBody(bindingRoute.body);
    equal(bindingValue.node.node_id, nodeId, "binding relay node ID");
    equal(
      bindingValue.transport.onion_hostname,
      fakeOnion,
      "binding relay onion hostname",
    );

    const mcpResponse = await request({
      port: relayPort,
      path: "/mcp",
      hostHeader: fakeOnion,
    });
    equal(mcpResponse.status, 200, "MCP relay status");
    check(
      mcpResponse.body
        .toString("utf8")
        .includes("VOID_TOR_STATIC_TRANSPORT_MCP_FIXTURE_V1"),
      "MCP response came from bounded upstream fixture",
    );

    const checkProcess = spawn(
      process.execPath,
      [
        TOOL_PATH,
        "--host",
        "127.0.0.1",
        "--port",
        "0",
        "--hostname-file",
        hostnameFile,
        "--binding-file",
        bindingFile,
        "--mcp-upstream-port",
        String(mcpPort),
        "--check",
      ],
      {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let checkStdout = "";
    checkProcess.stdout.setEncoding("utf8");
    checkProcess.stdout.on("data", (chunk) => {
      checkStdout += chunk;
    });
    const checkCode = await new Promise((resolveExit) => {
      checkProcess.once("exit", (code) => resolveExit(code));
    });
    equal(checkCode, 0, "tool check exit");
    check(
      checkStdout.includes(
        `static_transport_compatibility=${SOURCE_MARKER}`,
      ),
      "tool check compatibility marker",
    );

    console.log(`${MARKER}_GREEN`);
    console.log(`assertions=${assertions}`);
    console.log("static_handler=synchronous");
    console.log("mcp_bridge=preserved-async-bounded");
    console.log("binding_fixture=ephemeral-signed-ed25519");
    console.log("mcp_descriptor=active-signed-identity");
    console.log("query_policy=strict-404");
    console.log("direct_paid_read_routes=3");
    console.log("relayed_paid_read_routes=3");
    console.log("service_restart=false");
    console.log("runtime_route_activation=false");
    console.log("payment_execution=false");
    console.log("fund_movement=false");
  } finally {
    if (relayServer) await close(relayServer);
    if (gateway) await stopChild(gateway);
    await close(mcpServer);
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`${MARKER}_HOLD`);
  console.error(error?.stack || error);
  process.exitCode = 1;
});
