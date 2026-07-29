import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createMcpHandler } from "@modelcontextprotocol/server";

import {
  type BridgeJson,
  type PreparePaidWorkInput,
  type SubmitPaidWorkInput,
  type VoidMcpBridgeApi,
} from "../src/bridge.js";
import type { VoidMcpConfig } from "../src/config.js";
import { buildVoidMcpServer } from "../src/server.js";

class ProtocolBridge implements VoidMcpBridgeApi {
  async bootstrapNetwork(): Promise<BridgeJson> {
    return { marker: "bootstrap-test", authority: { mutation: false } };
  }

  async probePaidWork(): Promise<BridgeJson> {
    return { marker: "probe-test", authority: { mutation: false } };
  }

  async preparePaidWorkSubmission(
    input: PreparePaidWorkInput,
  ): Promise<BridgeJson> {
    return {
      marker: "prepare-test",
      service_id: input.service_id,
      authority: { mutation: false },
    };
  }

  async submitPaidWork(
    input: SubmitPaidWorkInput,
  ): Promise<BridgeJson> {
    return {
      marker: "submit-test",
      confirm: input.confirm,
      authority: { mutation: false },
    };
  }

  async serviceCatalog(): Promise<BridgeJson> {
    return {
      marker: "catalog-test",
      catalog_status: "descriptive_only",
    };
  }

  async capabilityStatus(): Promise<BridgeJson> {
    return {
      marker: "status-test",
      submission: { tool_registered: false },
    };
  }
}

function protocolConfig(): VoidMcpConfig {
  return Object.freeze({
    repoRoot: "/not-used-by-protocol-fixture",
    baseUrl: "http://127.0.0.1:9/",
    allowSubmit: false,
    tokenFile: null,
    timeoutMs: 1_000,
    maxResponseBytes: 65_536,
    nodeExecutable: process.execPath,
    tsxExecutable: "/not-used-by-protocol-fixture/tsx",
  });
}

test("2026-07-28 HTTP protocol path negotiates explicitly", async () => {
  const config = protocolConfig();
  const handler = createMcpHandler(
    () => buildVoidMcpServer(config, new ProtocolBridge()),
  );
  const transport = new StreamableHTTPClientTransport(
    new URL("http://test.local/mcp"),
    {
      fetch: (
        url: string | URL | Request,
        init?: RequestInit,
      ) => handler.fetch(new Request(url, init)),
    },
  );
  const client = new Client(
    {
      name: "void-mcp-modern-test-client",
      version: "1.0.0",
    },
    {
      versionNegotiation: {
        mode: { pin: "2026-07-28" },
      },
    },
  );
  await client.connect(transport);
  try {
    assert.equal(
      client.getNegotiatedProtocolVersion(),
      "2026-07-28",
    );
    const listed = await client.listTools();
    assert.ok(
      listed.tools.some(
        (tool) => tool.name === "void_bootstrap_network",
      ),
    );
  } finally {
    await client.close();
    await handler.close();
  }
});

async function findRepoRoot(): Promise<string> {
  let current = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 12; depth += 1) {
    try {
      await access(
        path.join(
          current,
          "tools/void-ai-agent-bootstrap-client-v1.mjs",
        ),
      );
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  throw new Error("repository root not found for stdio test");
}

function inheritedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string",
    ),
  );
}

async function exerciseStdio(
  mode: "legacy" | "modern",
): Promise<void> {
  const repoRoot = await findRepoRoot();
  const serverPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/stdio.js",
  );
  const env = {
    ...inheritedEnvironment(),
    VOID_MCP_BASE_URL: "http://127.0.0.1:9",
    VOID_MCP_REPO_ROOT: repoRoot,
    VOID_MCP_ALLOW_SUBMIT: "0",
  };
  const options =
    mode === "modern"
      ? {
          versionNegotiation: {
            mode: { pin: "2026-07-28" as const },
          },
        }
      : undefined;
  const client = new Client(
    {
      name: `void-mcp-stdio-${mode}-test-client`,
      version: "1.0.0",
    },
    options,
  );
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      env,
      stderr: "pipe",
    }),
  );
  try {
    assert.equal(
      client.getNegotiatedProtocolVersion(),
      mode === "modern" ? "2026-07-28" : "2025-11-25",
    );
    const listed = await client.listTools();
    assert.deepEqual(
      listed.tools
        .map((tool) => tool.name)
        .filter((name) => name === "void_submit_paid_work"),
      [],
    );
  } finally {
    await client.close();
  }
}

test(
  "stdio entry serves the established 2025 protocol era",
  { timeout: 30_000 },
  async () => {
    await exerciseStdio("legacy");
  },
);

test(
  "stdio entry serves the 2026-07-28 protocol era when pinned",
  { timeout: 30_000 },
  async () => {
    await exerciseStdio("modern");
  },
);
