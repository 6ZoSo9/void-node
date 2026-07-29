import process from "node:process";

import { loadVoidMcpHttpConfig } from "./http-config.js";
import { createVoidMcpHttpServer } from "./http-server.js";
import { safeErrorMessage } from "./json.js";

async function main(): Promise<void> {
  const config = await loadVoidMcpHttpConfig();
  const handle = createVoidMcpHttpServer(config);
  const address = await handle.listen();
  let closing = false;

  const close = (signal: string): void => {
    if (closing) return;
    closing = true;
    process.stderr.write(
      `VOID Agent MCP HTTP V1 closing; signal=${signal}\n`,
    );
    void handle.close().then(
      () => {
        process.exitCode = 0;
      },
      (error: unknown) => {
        process.stderr.write(
          `HOLD: ${safeErrorMessage(error)}\n`,
        );
        process.exitCode = 1;
      },
    );
  };

  process.once("SIGINT", () => close("SIGINT"));
  process.once("SIGTERM", () => close("SIGTERM"));
  process.stderr.write(
    [
      "VOID Agent MCP HTTP V1 ready",
      `url=${address.url}`,
      "submit_tool=disabled",
      "bind_scope=loopback_only",
      "tls_termination=external_reverse_proxy_required",
    ].join(" ") + "\n",
  );
}

void main().catch((error) => {
  process.stderr.write(`HOLD: ${safeErrorMessage(error)}\n`);
  process.exitCode = 1;
});
