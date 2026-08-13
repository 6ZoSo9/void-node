import assert from "node:assert/strict";
import process from "node:process";
import test from "node:test";

import { BoundedCommandRunner } from "../src/process.js";

function baseSpec(args: readonly string[]) {
  return {
    command: process.execPath,
    args,
    cwd: process.cwd(),
    timeoutMs: 2_000,
    maxStdoutBytes: 64 * 1024,
    maxStderrBytes: 64 * 1024,
    acceptedExitCodes: [0],
    redactions: [],
    env: { ...process.env },
  } as const;
}

test("drops the stderr chunk that crosses the configured output bound", async () => {
  const runner = new BoundedCommandRunner();
  const sentinel = "VOID_MCP_OVERFLOW_SENTINEL";

  await assert.rejects(
    runner.run({
      ...baseSpec(["-e", `process.stderr.write(${JSON.stringify(sentinel)});`]),
      maxStderrBytes: 0,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /subprocess stderr exceeded 0 bytes/);
      assert.equal(error.message.includes(sentinel), false);
      return true;
    },
  );
});

test("does not retain descendant stderr after a terminal output-limit transition", async () => {
  const runner = new BoundedCommandRunner();
  const sentinel = "VOID_MCP_POST_TERMINAL_SENTINEL";
  const descendant = [
    `setTimeout(() => process.stderr.write(${JSON.stringify(sentinel)}), 50);`,
    "setTimeout(() => {}, 150);",
  ].join("");
  const parent = [
    "const { spawn } = require('node:child_process');",
    `spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { stdio: ['ignore', 'ignore', 'inherit'] });`,
    "process.stdout.write('XX');",
    "setTimeout(() => {}, 1_000);",
  ].join("");

  await assert.rejects(
    runner.run({
      ...baseSpec(["-e", parent]),
      maxStdoutBytes: 1,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /subprocess stdout exceeded 1 bytes/);
      assert.equal(error.message.includes(sentinel), false);
      return true;
    },
  );
});
