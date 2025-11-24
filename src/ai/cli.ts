// @ts-nocheck
// src/ai/cli.ts
//
// Minimal VOID devnet AI/agent CLI.
// - Uses loadVoidDevnetState() for addresses.
// - Wraps existing ops scripts for health/e2e.
//
// Usage examples:
//   npx tsx src/ai/cli.ts state
//   npx tsx src/ai/cli.ts status
//   npx tsx src/ai/cli.ts e2e

import { spawnSync } from "child_process";
import { resolve } from "path";
import { loadVoidDevnetState } from "./state.js";

function runScript(scriptRelPath: string, args: string[] = []): never | void {
  const repoRoot = process.cwd();
  const scriptPath = resolve(repoRoot, scriptRelPath);

  const res = spawnSync(scriptPath, {
    stdio: "inherit",
    env: process.env,
    args: [scriptPath, ...args],
  });

  if (res.error) {
    console.error(
      `[ai/cli] failed to execute ${scriptPath}: ${String(
        (res.error as any)?.message || res.error
      )}`
    );
    process.exit(1);
  }

  if (typeof res.status === "number" && res.status !== 0) {
    console.error(
      `[ai/cli] ${scriptPath} exited with status ${res.status}`
    );
    process.exit(res.status);
  }
}

function cmdState() {
  const s = loadVoidDevnetState();
  const out = {
    chainId: s.chainId,
    adminGate: s.adminGate,
    modelRegistry: s.modelRegistry,
    datasetRegistry: s.datasetRegistry,
    jobQueue: s.jobQueue,
    receiptRegistry: s.receiptRegistry,
    agentRegistry: s.agentRegistry,
  };
  console.log(JSON.stringify(out, null, 2));
}

function cmdStatus() {
  runScript("ops/void-devnet-status.sh");
}

function cmdE2E() {
  // Full devnet e2e pipeline:
  // - devnet-up (RPC + STATE)
  // - haiku demo (post job + agent receipt)
  // - coverage + agent/metrics health
  runScript("ops/void-devnet-e2e.sh");
}

function usage(): never {
  console.error(
    [
      "Usage: npx tsx src/ai/cli.ts <command>",
      "",
      "Commands:",
      "  state   Print normalized VOID devnet state (addresses, chainId).",
      "  status  Run ops/void-devnet-status.sh and stream its output.",
      "  e2e     Run the full devnet e2e agent pipeline via ops/void-devnet-e2e.sh.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

function main() {
  const [, , cmd] = process.argv;

  switch (cmd) {
    case "state":
      cmdState();
      break;
    case "status":
      cmdStatus();
      break;
    case "e2e":
      cmdE2E();
      break;
    default:
      usage();
  }
}

main();
