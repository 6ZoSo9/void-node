import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  Client,
  InMemoryTransport,
} from "@modelcontextprotocol/client";

import { VoidMcpBridge } from "../src/bridge.js";
import { buildVoidMcpServer } from "../src/server.js";
import {
  FakeRunner,
  makeConfig,
  SAMPLE_INPUT,
  writeFixtureRepo,
} from "./fixtures.js";

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

async function withFixture<T>(
  callback: (root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "void-mcp-server-test-"),
  );
  await chmod(root, 0o700);
  try {
    await writeFixtureRepo(root);
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("legacy MCP clients see read-only defaults and resources", async () => {
  await withFixture(async (root) => {
    const config = makeConfig(root);
    const bridge = new VoidMcpBridge(
      config,
      new FakeRunner(),
    );
    const server = buildVoidMcpServer(config, bridge);
    const client = new Client({
      name: "void-mcp-test-client",
      version: "1.0.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      assert.equal(
        client.getNegotiatedProtocolVersion(),
        "2025-11-25",
      );
      const listed = await client.listTools();
      const names = listed.tools.map((tool) => tool.name).sort();
      assert.deepEqual(names, [
        "void_bootstrap_network",
        "void_prepare_paid_work_submission",
        "void_probe_paid_work",
      ]);

      const resources = await client.listResources();
      assert.deepEqual(
        resources.resources.map((resource) => resource.uri).sort(),
        [
          "void://agent/capability-status",
          "void://agent/service-catalog",
          "void://mainnet0/discovery",
        ],
      );

      const prepared = await client.callTool({
        name: "void_prepare_paid_work_submission",
        arguments: { ...SAMPLE_INPUT },
      });
      assert.notEqual(prepared.isError, true);
      const preparedContent = requireRecord(
        prepared.structuredContent,
        "prepared structuredContent",
      );
      assert.equal(
        preparedContent.marker,
        "VOID_AGENT_MCP_PREPARED_SUBMISSION_V1",
      );

      const status = await client.readResource({
        uri: "void://agent/capability-status",
      });
      const statusContent = status.contents[0];
      assert.ok(statusContent);
      assert.ok("text" in statusContent);
      assert.match(
        statusContent.text,
        /"tool_registered": false/,
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});

test("submit tool is registered only behind the exact operator gate", async () => {
  await withFixture(async (root) => {
    const tokenPath = path.join(root, "operator.token");
    await writeFile(
      tokenPath,
      "server-test-private-token-value\n",
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    await chmod(tokenPath, 0o600);

    const config = makeConfig(root, {
      allowSubmit: true,
      tokenFile: tokenPath,
    });
    const bridge = new VoidMcpBridge(
      config,
      new FakeRunner(),
    );
    const server = buildVoidMcpServer(config, bridge);
    const client = new Client({
      name: "void-mcp-submit-test-client",
      version: "1.0.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const listed = await client.listTools();
      assert.ok(
        listed.tools.some(
          (tool) => tool.name === "void_submit_paid_work",
        ),
      );

      const rejected = await client.callTool({
        name: "void_submit_paid_work",
        arguments: {
          ...SAMPLE_INPUT,
          confirm: "anything-else",
          expect_new: false,
        },
      });
      assert.equal(rejected.isError, true);

      const accepted = await client.callTool({
        name: "void_submit_paid_work",
        arguments: {
          ...SAMPLE_INPUT,
          confirm: "submit-paid-work",
          expect_new: false,
        },
      });
      assert.notEqual(accepted.isError, true);
      const acceptedContent = requireRecord(
        accepted.structuredContent,
        "accepted structuredContent",
      );
      assert.equal(
        acceptedContent.marker,
        "VOID_AGENT_MCP_SUBMISSION_RESULT_V1",
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});
