#!/usr/bin/env node
// VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1 proof.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const MARKER = "VOIDCHAIN_ORG_PUBLIC_READ_CORS_V1";
const ALLOWED_ORIGIN = "https://voidchain.org";
const DENIED_ORIGIN = "https://example.invalid";

const repo = process.cwd();
const gateway = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);

const ROUTES = [
  "/__void/ready.json",
  "/blocks/latest/number2.json",
  "/.well-known/void-public-node.json",
  "/public-node/route-index.json",
  "/version",
  "/public-node",
];

const listen = async (server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
};

const jsonBody = (route) => {
  switch (route) {
    case "/__void/ready.json":
      return {
        ready: true,
        gap: 0,
        txroot_live: 0,
        head: 1856587,
      };
    case "/blocks/latest/number2.json":
      return { number2: 1856587 };
    case "/.well-known/void-public-node.json":
      return {
        protocol: "void-public-node-discovery-v1",
        status: "public_node_agent_discovery_ready",
      };
    case "/public-node/route-index.json":
      return {
        marker: "VOID_PUBLIC_NODE_ROUTE_INDEX_V1",
        routes: ROUTES,
      };
    case "/version":
      return {
        network: "VOID Network",
        chain_id: 2050,
        version: "proof-fixture",
      };
    default:
      return { ok: true };
  }
};

const upstreamHandler = (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const route = url.pathname;

  if (!["GET", "HEAD"].includes(req.method || "")) {
    const body = Buffer.from(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
    );
    res.writeHead(405, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(body.length),
      "allow": "GET, HEAD",
    });
    return res.end(req.method === "HEAD" ? undefined : body);
  }

  if (route === "/public-node" || route === "/public-node/") {
    const body = Buffer.from(
      "<!doctype html><html><body>"
      + "<h1>VOID Public Node</h1>"
      + "<div>public-node read-only proof fixture</div>"
      + "</body></html>",
    );
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-length": String(body.length),
      "vary": "Accept-Encoding",
    });
    return res.end(req.method === "HEAD" ? undefined : body);
  }

  if (ROUTES.includes(route)) {
    const body = Buffer.from(JSON.stringify(jsonBody(route)));
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(body.length),
      "vary": "Accept-Encoding",
    });
    return res.end(req.method === "HEAD" ? undefined : body);
  }

  const body = Buffer.from(
    JSON.stringify({ ok: false, error: "fixture_not_found" }),
  );
  res.writeHead(404, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
  });
  return res.end(req.method === "HEAD" ? undefined : body);
};

const publicServer = http.createServer(upstreamHandler);
const nodeServer = http.createServer(upstreamHandler);

let child;

try {
  const publicPort = await listen(publicServer);
  const nodePort = await listen(nodeServer);

  const probe = http.createServer();
  const compositionPort = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));

  child = spawn(process.execPath, [gateway], {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(compositionPort),
      VOID_PUBLIC_GATEWAY_UPSTREAM:
        `http://127.0.0.1:${publicPort}`,
      VOID_NODE_UPSTREAM:
        `http://127.0.0.1:${nodePort}`,
      VOID_PUBLIC_DISCOVERY_ROOT: "",
      VOID_PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const base = `http://127.0.0.1:${compositionPort}`;
  let started = false;
  let lastError = "";

  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(
        `${base}/__void/public-app/status.json`,
      );
      if (response.status === 200) {
        started = true;
        break;
      }
    } catch (error) {
      lastError = String(error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  assert.equal(
    started,
    true,
    [
      "composition gateway failed to start",
      `last_error=${lastError}`,
      `stdout=${stdout}`,
      `stderr=${stderr}`,
    ].join("\n"),
  );

  for (const route of ROUTES) {
    const allowed = await fetch(base + route, {
      headers: {
        Origin: ALLOWED_ORIGIN,
      },
      redirect: "manual",
    });

    assert.equal(allowed.status, 200, `${route} allowed status`);
    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      ALLOWED_ORIGIN,
      `${route} exact ACAO`,
    );
    assert.equal(
      allowed.headers.get("access-control-allow-credentials"),
      null,
      `${route} no credential CORS`,
    );
    assert.equal(
      allowed.headers.get("x-void-public-read-cors"),
      "voidchain-org-v1",
      `${route} CORS marker`,
    );

    const vary = String(allowed.headers.get("vary") || "");
    const varyValues = vary
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    assert.equal(
      varyValues.includes("origin"),
      true,
      `${route} Vary includes Origin`,
    );
    if (route === "/public-node") {
      assert.equal(
        varyValues.includes("accept-encoding"),
        true,
        `${route} upstream Vary preserved`,
      );
    }


    const allowedHead = await fetch(base + route, {
      method: "HEAD",
      headers: {
        Origin: ALLOWED_ORIGIN,
      },
      redirect: "manual",
    });

    assert.equal(
      allowedHead.status,
      200,
      `${route} allowed HEAD status`,
    );
    assert.equal(
      allowedHead.headers.get("access-control-allow-origin"),
      ALLOWED_ORIGIN,
      `${route} HEAD exact ACAO`,
    );
    assert.equal(
      allowedHead.headers.get("access-control-allow-credentials"),
      null,
      `${route} HEAD no credential CORS`,
    );
    assert.equal(
      allowedHead.headers.get("x-void-public-read-cors"),
      "voidchain-org-v1",
      `${route} HEAD CORS marker`,
    );
    assert.equal(
      (await allowedHead.arrayBuffer()).byteLength,
      0,
      `${route} HEAD body empty`,
    );

    const denied = await fetch(base + route, {
      headers: {
        Origin: DENIED_ORIGIN,
      },
      redirect: "manual",
    });

    assert.equal(denied.status, 200, `${route} denied-origin status`);
    assert.equal(
      denied.headers.get("access-control-allow-origin"),
      null,
      `${route} denied origin gets no ACAO`,
    );
    assert.equal(
      denied.headers.get("x-void-public-read-cors"),
      null,
      `${route} denied origin gets no CORS marker`,
    );

    const originless = await fetch(base + route, {
      redirect: "manual",
    });

    assert.equal(originless.status, 200, `${route} originless status`);
    assert.equal(
      originless.headers.get("access-control-allow-origin"),
      null,
      `${route} originless gets no ACAO`,
    );
  }

  for (const method of ["POST", "OPTIONS"]) {
    const response = await fetch(
      `${base}/__void/ready.json`,
      {
        method,
        headers: {
          Origin: ALLOWED_ORIGIN,
        },
        redirect: "manual",
      },
    );

    assert.notEqual(
      response.status,
      200,
      `${method} must not be enabled by CORS`,
    );
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      null,
      `${method} gets no ACAO`,
    );
    assert.equal(
      response.headers.get("x-void-public-read-cors"),
      null,
      `${method} gets no CORS marker`,
    );
  }

  {
    const unknown = await fetch(
      `${base}/not-a-voidchain-cors-route`,
      {
        headers: {
          Origin: ALLOWED_ORIGIN,
        },
        redirect: "manual",
      },
    );

    assert.equal(unknown.status, 404);
    assert.equal(
      unknown.headers.get("access-control-allow-origin"),
      null,
    );
    assert.equal(
      unknown.headers.get("x-void-public-read-cors"),
      null,
    );
  }

  console.log(`${MARKER}_PROOF_GREEN`);
  console.log(`allowed_origin=${ALLOWED_ORIGIN}`);
  console.log("allowed_methods=GET,HEAD");
  console.log("head_verified=true");
  console.log("allowed_route_count=6");
  console.log("wildcard_origin=false");
  console.log("allow_credentials=false");
  console.log("options_enabled=false");
  console.log("mutation_methods_enabled=false");
  console.log("unknown_routes_cors=false");
  console.log("vary_origin=true");
  console.log("upstream_vary_preserved_on_proxied_route=true");
  console.log("synthesized_route_requires_only_vary_origin=true");
} finally {
  if (child && child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }

  await Promise.all([
    new Promise((resolve) => publicServer.close(resolve)),
    new Promise((resolve) => nodeServer.close(resolve)),
  ]);
}
