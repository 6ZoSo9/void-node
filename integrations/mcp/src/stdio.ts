import process from "node:process";

import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { loadVoidMcpConfig } from "./config.js";
import { safeErrorMessage } from "./json.js";
import { buildVoidMcpServer } from "./server.js";

async function main(): Promise<void> {
  const config = await loadVoidMcpConfig();
  const handle = serveStdio(() => buildVoidMcpServer(config));

  const close = (): void => {
    void handle.close().finally(() => {
      process.exitCode = 0;
    });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);

  process.stderr.write(
    `VOID Agent MCP Bridge V1 ready; submit_tool=${
      config.allowSubmit ? "enabled" : "disabled"
    }\n`,
  );
}

void main().catch((error) => {
  process.stderr.write(
    `HOLD: ${safeErrorMessage(error)}\n`,
  );
  process.exitCode = 1;
});
