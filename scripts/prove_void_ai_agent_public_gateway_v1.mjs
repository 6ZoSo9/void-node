#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_V1";
const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "..");
const gatewayPath = path.join(
  repositoryRoot,
  "ops/void-ai-agent-public-gateway-v1.mjs",
);

const expectedRoutes = new Map([
  [
    "/public-node/agents/discovery-v1.json",
    "public/public-node/agents/discovery-v1.json",
  ],
  [
    "/public-node/agents/discovery-v1.schema.json",
    "public/public-node/agents/discovery-v1.schema.json",
  ],
  [
    "/.well-known/void-agent-discovery.json",
    "public/.well-known/void-agent-discovery.json",
  ],
  [
    "/.well-known/void-agent-discovery.schema.json",
    "public/.well-known/void-agent-discovery.schema.json",
  ],
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function request({ port, method, requestPath }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: requestPath,
        headers: {
          Host: "gateway-proof.invalid",
          "User-Agent": "void-gateway-proof/1",
        },
        timeout: 5_000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForReady(child) {
  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      reject(
        new Error(
          `gateway startup timeout stdout=${stdout} stderr=${stderr}`,
        ),
      );
    }, 10_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;

      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim().startsWith("{")) {
          continue;
        }

        try {
          const value = JSON.parse(line);
          if (
            value.marker === "VOID_AI_AGENT_PUBLIC_GATEWAY_V1" &&
            value.ready === true
          ) {
            clearTimeout(timer);
            resolve(value);
            return;
          }
        } catch {
          // Continue collecting output.
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      reject(
        new Error(
          `gateway exited before ready code=${code} signal=${signal} ` +
            `stdout=${stdout} stderr=${stderr}`,
        ),
      );
    });
  });
}

const child = spawn(process.execPath, [gatewayPath], {
  cwd: repositoryRoot,
  env: {
    ...process.env,
    VOID_REPO_ROOT: repositoryRoot,
    VOID_AI_AGENT_PUBLIC_GATEWAY_HOST: "127.0.0.1",
    VOID_AI_AGENT_PUBLIC_GATEWAY_PORT: "0",
    VOID_AI_AGENT_PUBLIC_GATEWAY_PROOF_MODE: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stopped = false;

async function stopChild() {
  if (stopped) {
    return;
  }
  stopped = true;

  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 5_000);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

try {
  const ready = await waitForReady(child);

  assert(ready.host === "127.0.0.1", "gateway did not bind loopback");
  assert(
    Number.isInteger(ready.port) && ready.port > 0,
    "gateway did not report a valid proof port",
  );
  assert(
    ready.mutation_authority === false,
    "gateway unexpectedly reports mutation authority",
  );
  assert(
    ready.proxy_authority === false,
    "gateway unexpectedly reports proxy authority",
  );
  assert(
    JSON.stringify([...ready.allowed_routes].sort()) ===
      JSON.stringify([...expectedRoutes.keys()].sort()),
    "gateway route list differs from exact allowlist",
  );

  for (const [route, relativePath] of expectedRoutes.entries()) {
    const expected = await readFile(
      path.join(repositoryRoot, relativePath),
    );
    JSON.parse(expected.toString("utf8"));

    const get = await request({
      port: ready.port,
      method: "GET",
      requestPath: route,
    });

    assert(get.status === 200, `${route} GET was not 200`);
    assert(
      get.body.equals(expected),
      `${route} GET bytes differ from repository`,
    );
    assert(
      String(get.headers["content-type"] || "").startsWith(
        "application/json",
      ),
      `${route} GET content-type is not JSON`,
    );
    assert(
      get.headers["cache-control"] === "no-store",
      `${route} GET cache-control differs`,
    );
    assert(
      get.headers["access-control-allow-origin"] === "*",
      `${route} GET CORS differs`,
    );

    const head = await request({
      port: ready.port,
      method: "HEAD",
      requestPath: route,
    });

    assert(head.status === 200, `${route} HEAD was not 200`);
    assert(head.body.length === 0, `${route} HEAD returned a body`);
    assert(
      Number(head.headers["content-length"]) === expected.length,
      `${route} HEAD content-length differs`,
    );
  }

  const deniedPaths = [
    "/",
    "/health",
    "/__void/ready.json",
    "/tx/submit",
    "/public-node/agents/discovery-v1.json?extra=1",
    "//public-node/agents/discovery-v1.json",
    "/public-node/agents/%64iscovery-v1.json",
  ];

  for (const requestPath of deniedPaths) {
    const denied = await request({
      port: ready.port,
      method: "GET",
      requestPath,
    });
    assert(
      denied.status === 404,
      `${requestPath} should return 404`,
    );
    assert(
      denied.body.length === 0,
      `${requestPath} should return an empty body`,
    );
  }

  for (const method of [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ]) {
    const denied = await request({
      port: ready.port,
      method,
      requestPath: "/.well-known/void-agent-discovery.json",
    });

    assert(denied.status === 405, `${method} should return 405`);
    assert(
      denied.headers.allow === "GET, HEAD",
      `${method} Allow header differs`,
    );
    assert(
      denied.headers["cache-control"] === "no-store",
      `${method} cache-control differs`,
    );
    assert(
      denied.body.length === 0,
      `${method} should return an empty body`,
    );
  }

  process.stdout.write(
    `${MARKER}\n` +
      `gateway_host=${ready.host}\n` +
      `gateway_port=${ready.port}\n` +
      `allowed_route_count=${expectedRoutes.size}\n` +
      `get_head_exact_green=1\n` +
      `deny_surface_exact_green=1\n` +
      `mutation_authority=0\n` +
      `proxy_authority=0\n` +
      `verdict=AI_AGENT_PUBLIC_GATEWAY_LOCAL_PROOF_EXACT_GREEN\n` +
      `${MARKER}_COMPLETE\n`,
  );
} finally {
  await stopChild();
}
