import assert from "node:assert/strict";
import http from "node:http";
import process from "node:process";
import test from "node:test";

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

import type {
  BridgeJson,
  PreparePaidWorkInput,
  SubmitPaidWorkInput,
  VoidMcpBridgeApi,
} from "../src/bridge.js";
import type { VoidMcpConfig } from "../src/config.js";
import {
  loadVoidMcpHttpConfig,
  type VoidMcpHttpConfig,
} from "../src/http-config.js";
import {
  createVoidMcpHttpServer,
  type VoidMcpHttpAddress,
} from "../src/http-server.js";

class ReadOnlyHttpBridge implements VoidMcpBridgeApi {
  async bootstrapNetwork(): Promise<BridgeJson> {
    return { marker: "http-bootstrap-test", mutation: false };
  }

  async probePaidWork(): Promise<BridgeJson> {
    return { marker: "http-probe-test", mutation: false };
  }

  async preparePaidWorkSubmission(
    input: PreparePaidWorkInput,
  ): Promise<BridgeJson> {
    return {
      marker: "http-prepare-test",
      service_id: input.service_id,
      mutation: false,
    };
  }

  async submitPaidWork(
    _input: SubmitPaidWorkInput,
  ): Promise<BridgeJson> {
    throw new Error("HTTP transport must never register submission");
  }

  async serviceCatalog(): Promise<BridgeJson> {
    return {
      marker: "http-catalog-test",
      catalog_status: "descriptive_only",
    };
  }

  async capabilityStatus(): Promise<BridgeJson> {
    return {
      marker: "http-capability-test",
      submission: { tool_registered: false },
    };
  }
}

class DeferredHttpBridge extends ReadOnlyHttpBridge {
  readonly started: Promise<void>;
  private resolveStarted!: () => void;
  private readonly releasePromise: Promise<void>;
  private resolveRelease!: () => void;

  constructor() {
    super();
    this.started = new Promise<void>((resolve) => {
      this.resolveStarted = resolve;
    });
    this.releasePromise = new Promise<void>((resolve) => {
      this.resolveRelease = resolve;
    });
  }

  release(): void {
    this.resolveRelease();
  }

  override async bootstrapNetwork(): Promise<BridgeJson> {
    this.resolveStarted();
    await this.releasePromise;
    return await super.bootstrapNetwork();
  }
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assert.ok(
    value !== null
      && typeof value === "object"
      && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function bridgeConfig(): VoidMcpConfig {
  return Object.freeze({
    repoRoot: "/not-used-by-http-fixture",
    baseUrl: "http://127.0.0.1:9/",
    allowSubmit: false,
    tokenFile: null,
    timeoutMs: 1_000,
    maxResponseBytes: 65_536,
    nodeExecutable: process.execPath,
    tsxExecutable: "/not-used-by-http-fixture/tsx",
  });
}

function httpConfig(
  overrides: Partial<VoidMcpHttpConfig> = {},
): VoidMcpHttpConfig {
  return Object.freeze({
    bridge: bridgeConfig(),
    host: "127.0.0.1",
    port: 0,
    path: "/mcp",
    allowedHostnames: Object.freeze([
      "localhost",
      "127.0.0.1",
      "[::1]",
    ]),
    allowedOriginHostnames: Object.freeze([
      "localhost",
      "127.0.0.1",
      "[::1]",
    ]),
    maxRequestBytes: 65_536,
    maxConcurrentRequests: 8,
    ...overrides,
  });
}

async function withHttpServer<T>(
  config: VoidMcpHttpConfig,
  callback: (address: VoidMcpHttpAddress) => Promise<T>,
  bridge: VoidMcpBridgeApi = new ReadOnlyHttpBridge(),
): Promise<T> {
  const handle = createVoidMcpHttpServer(config, bridge);
  const address = await handle.listen();
  try {
    return await callback(address);
  } finally {
    await handle.close();
  }
}

async function exerciseProtocol(
  address: VoidMcpHttpAddress,
  mode: "legacy" | "modern",
): Promise<void> {
  const client = new Client(
    {
      name: `void-mcp-http-${mode}-test-client`,
      version: "1.0.0",
    },
    {
      versionNegotiation: {
        mode: mode === "legacy"
          ? "legacy"
          : { pin: "2026-07-28" },
      },
    },
  );
  const transport = new StreamableHTTPClientTransport(
    new URL(address.url),
  );
  await client.connect(transport);
  try {
    assert.equal(
      client.getNegotiatedProtocolVersion(),
      mode === "legacy" ? "2025-11-25" : "2026-07-28",
    );
    const listedTools = await client.listTools();
    const toolNames = listedTools.tools.map((tool) => tool.name).sort();
    assert.deepEqual(toolNames, [
      "void_bootstrap_network",
      "void_prepare_paid_work_submission",
      "void_probe_paid_work",
    ]);
    assert.equal(toolNames.includes("void_submit_paid_work"), false);

    const listedResources = await client.listResources();
    assert.deepEqual(
      listedResources.resources.map((resource) => resource.uri).sort(),
      [
        "void://agent/capability-status",
        "void://agent/service-catalog",
        "void://mainnet0/discovery",
      ],
    );

    const bootstrapped = await client.callTool({
      name: "void_bootstrap_network",
      arguments: {},
    });
    assert.notEqual(bootstrapped.isError, true);
    assert.equal(
      requireRecord(
        bootstrapped.structuredContent,
        "HTTP bootstrap structuredContent",
      ).marker,
      "http-bootstrap-test",
    );

    const status = await client.readResource({
      uri: "void://agent/capability-status",
    });
    const statusContent = status.contents[0];
    assert.ok(statusContent);
    assert.ok("text" in statusContent);
    assert.match(statusContent.text, /"tool_registered": false/);
  } finally {
    await client.close();
  }
}

type RawResponse = Readonly<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}>;

async function rawRequest(
  address: VoidMcpHttpAddress,
  options: Readonly<{
    path?: string;
    method?: string;
    headers?: http.OutgoingHttpHeaders;
    body?: string;
  }> = {},
): Promise<RawResponse> {
  return await new Promise<RawResponse>((resolve, reject) => {
    const requestOptions: http.RequestOptions = {
      hostname: address.host,
      port: address.port,
      path: options.path ?? address.path,
      method: options.method ?? "GET",
    };
    if (options.headers !== undefined) {
      requestOptions.headers = options.headers;
    }
    const request = http.request(
      requestOptions,
      (response) => {
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve(Object.freeze({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body,
          }));
        });
      },
    );
    request.once("error", reject);
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
}

test(
  "read-only HTTP entry serves both MCP protocol eras",
  { timeout: 30_000 },
  async () => {
    await withHttpServer(httpConfig(), async (address) => {
      await exerciseProtocol(address, "legacy");
      await exerciseProtocol(address, "modern");
    });
  },
);

test("HTTP entry rejects mutation-bearing environment", async () => {
  await assert.rejects(
    loadVoidMcpHttpConfig({
      VOID_MCP_ALLOW_SUBMIT: "1",
    }),
    /read-only/,
  );
  await assert.rejects(
    loadVoidMcpHttpConfig({
      VOID_MCP_ALLOW_SUBMIT: "0",
      VOID_MCP_TOKEN_FILE: "/owner/private/token",
    }),
    /forbids VOID_MCP_TOKEN_FILE/,
  );
  await assert.rejects(
    loadVoidMcpHttpConfig({
      VOID_MCP_TOKEN_FILE: "",
    }),
    /forbids VOID_MCP_TOKEN_FILE/,
  );
  await assert.rejects(
    loadVoidMcpHttpConfig({
      VOID_MCP_HTTP_HOST: "0.0.0.0",
    }),
    /exact loopback 127\.0\.0\.1/,
  );
  await assert.rejects(
    loadVoidMcpHttpConfig({
      VOID_MCP_BASE_URL: "http://127.0.0.1:9/",
      VOID_MCP_HTTP_ALLOWED_HOSTS: "*.example.invalid",
    }),
    /invalid hostname/,
  );
  await assert.rejects(
    loadVoidMcpHttpConfig({
      VOID_MCP_BASE_URL: "http://127.0.0.1:9/",
      VOID_MCP_HTTP_ALLOWED_ORIGINS:
        "mcp.example.invalid,mcp.example.invalid",
    }),
    /duplicate hostnames/,
  );
  assert.throws(
    () => createVoidMcpHttpServer(
      httpConfig({
        bridge: Object.freeze({
          ...bridgeConfig(),
          allowSubmit: true,
          tokenFile: "/not-readable",
        }),
      }),
    ),
    /requires a read-only bridge config/,
  );
});

test("HTTP entry enforces host, origin, path, and method guards", async () => {
  await withHttpServer(httpConfig(), async (address) => {
    const hostRejected = await rawRequest(address, {
      headers: { Host: "attacker.invalid" },
    });
    assert.equal(hostRejected.status, 403);

    const originRejected = await rawRequest(address, {
      headers: { Origin: "https://attacker.invalid" },
    });
    assert.equal(originRejected.status, 403);

    const pathRejected = await rawRequest(address, {
      path: "/not-mcp",
    });
    assert.equal(pathRejected.status, 404);

    const methodRejected = await rawRequest(address, {
      method: "PUT",
    });
    assert.equal(methodRejected.status, 405);
    assert.equal(methodRejected.headers.allow, "GET, POST, DELETE");
  });
});


test(
  "HTTP entry rejects excess concurrent requests",
  { timeout: 30_000 },
  async () => {
    const bridge = new DeferredHttpBridge();
    await withHttpServer(
      httpConfig({ maxConcurrentRequests: 1 }),
      async (address) => {
        const client = new Client(
          {
            name: "void-mcp-http-concurrency-test-client",
            version: "1.0.0",
          },
          {
            versionNegotiation: {
              mode: { pin: "2026-07-28" },
            },
          },
        );
        await client.connect(
          new StreamableHTTPClientTransport(new URL(address.url)),
        );
        try {
          const first = client.callTool({
            name: "void_bootstrap_network",
            arguments: {},
          });
          await bridge.started;

          const second = await rawRequest(address, {
            method: "POST",
            headers: {
              Accept: "application/json, text/event-stream",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "concurrency-test",
              method: "tools/list",
            }),
          });
          assert.equal(second.status, 503);
          assert.equal(second.headers["retry-after"], "1");

          bridge.release();
          const firstResult = await first;
          assert.notEqual(firstResult.isError, true);
        } finally {
          bridge.release();
          await client.close();
        }
      },
      bridge,
    );
  },
);

test("HTTP entry bounds and validates request bodies", async () => {
  await withHttpServer(
    httpConfig({ maxRequestBytes: 128 }),
    async (address) => {
      const oversized = "x".repeat(129);
      const oversizedResult = await rawRequest(address, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(oversized),
        },
        body: oversized,
      });
      assert.equal(oversizedResult.status, 413);

      const malformed = "{";
      const malformedResult = await rawRequest(address, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(malformed),
        },
        body: malformed,
      });
      assert.equal(malformedResult.status, 400);

      const wrongType = "{}";
      const wrongTypeResult = await rawRequest(address, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": Buffer.byteLength(wrongType),
        },
        body: wrongType,
      });
      assert.equal(wrongTypeResult.status, 415);
    },
  );
});
