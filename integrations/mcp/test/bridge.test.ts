import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { VoidMcpBridge } from "../src/bridge.js";
import { canonicalJson } from "../src/json.js";
import {
  FakeRunner,
  makeConfig,
  SAMPLE_INPUT,
  writeFixtureRepo,
} from "./fixtures.js";

async function withFixture<T>(
  callback: (root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "void-mcp-test-"),
  );
  await chmod(root, 0o700);
  try {
    await writeFixtureRepo(root);
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("preparation is deterministic, private, and network-free", async () => {
  await withFixture(async (root) => {
    const runner = new FakeRunner();
    const bridge = new VoidMcpBridge(
      makeConfig(root),
      runner,
    );

    const first =
      await bridge.preparePaidWorkSubmission(SAMPLE_INPUT);
    const second =
      await bridge.preparePaidWorkSubmission(SAMPLE_INPUT);

    assert.equal(first.work_order_id, second.work_order_id);
    assert.equal(first.submission_id, second.submission_id);
    assert.equal(first.request_sha256, second.request_sha256);
    assert.deepEqual(first.request, second.request);
    assert.equal(first.network_submission_performed, false);
    assert.deepEqual(
      Object.values(first.authority as Record<string, unknown>),
      Object.values(first.authority as Record<string, unknown>)
        .map(() => false),
    );
    assert.equal(
      runner.specs.some((spec) => spec.args.includes("submit")),
      false,
    );
    assert.ok(
      runner.observations.every(
        (observation) =>
          observation.directoryMode === 0o700
          && observation.inputMode === 0o600,
      ),
    );
  });
});

test("submission requires the operator gate and exact confirmation", async () => {
  await withFixture(async (root) => {
    const disabled = new VoidMcpBridge(
      makeConfig(root),
      new FakeRunner(),
    );
    await assert.rejects(
      disabled.submitPaidWork({
        ...SAMPLE_INPUT,
        confirm: "submit-paid-work",
        expect_new: false,
      }),
      /disabled by the local operator/,
    );

    const tokenPath = path.join(root, "operator.token");
    const sentinel =
      "VOID_TEST_SENTINEL_TOKEN_1234567890";
    await writeFile(tokenPath, `${sentinel}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await chmod(tokenPath, 0o600);

    const runner = new FakeRunner();
    const bridge = new VoidMcpBridge(
      makeConfig(root, {
        allowSubmit: true,
        tokenFile: tokenPath,
      }),
      runner,
    );

    await assert.rejects(
      bridge.submitPaidWork({
        ...SAMPLE_INPUT,
        confirm: "wrong" as "submit-paid-work",
        expect_new: false,
      }),
      /confirm must be exactly/,
    );

    const result = await bridge.submitPaidWork({
      ...SAMPLE_INPUT,
      confirm: "submit-paid-work",
      expect_new: true,
    });
    const serialized = canonicalJson(result);
    assert.equal(serialized.includes(sentinel), false);
    assert.equal(serialized.includes(tokenPath), false);
    assert.equal(
      (
        result.interpretation as Record<string, unknown>
      ).accepted_for_review,
      true,
    );
    assert.equal(
      (
        result.interpretation as Record<string, unknown>
      ).private_temp_cleanup_completed,
      true,
    );
    assert.equal(
      (
        result.interpretation as Record<string, unknown>
      ).payment_executed,
      false,
    );
    assert.equal(
      (
        result.interpretation as Record<string, unknown>
      ).work_credit_awarded,
      false,
    );
    assert.ok(
      runner.observations.some(
        (observation) =>
          observation.kind === "submit"
          && observation.directoryMode === 0o700
          && observation.inputMode === 0o600,
      ),
    );

    const submitSpec = runner.specs.find(
      (spec) => spec.args.includes("submit"),
    );
    assert.ok(submitSpec);
    assert.equal(
      submitSpec.args.includes(sentinel),
      false,
    );
    assert.equal(submitSpec.env.VOID_MCP_TOKEN_FILE, undefined);
    assert.equal(submitSpec.env.VOID_MCP_ALLOW_SUBMIT, undefined);
  });
});

test("accepted submission remains explicit when private cleanup fails", async () => {
  await withFixture(async (root) => {
    const tokenPath = path.join(root, "operator.token");
    await writeFile(
      tokenPath,
      "cleanup-failure-private-test-token\n",
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    await chmod(tokenPath, 0o600);

    const runner = new FakeRunner();
    let retainedDirectory: string | null = null;
    const bridge = new VoidMcpBridge(
      makeConfig(root, {
        allowSubmit: true,
        tokenFile: tokenPath,
      }),
      runner,
      async (directory) => {
        retainedDirectory = directory;
        throw new Error("synthetic private temp cleanup failure");
      },
    );

    try {
      const result = await bridge.submitPaidWork({
        ...SAMPLE_INPUT,
        confirm: "submit-paid-work",
        expect_new: true,
      });
      const interpretation =
        result.interpretation as Record<string, unknown>;
      assert.equal(interpretation.accepted_for_review, true);
      assert.equal(interpretation.duplicate, false);
      assert.equal(interpretation.conflicting_duplicate, false);
      assert.equal(interpretation.private_temp_cleanup_completed, false);
      assert.equal(
        runner.specs.filter((spec) => spec.args.includes("submit")).length,
        1,
      );
      assert.ok(retainedDirectory);
      const serialized = canonicalJson(result);
      assert.equal(serialized.includes(tokenPath), false);
      assert.equal(serialized.includes(retainedDirectory), false);
      assert.ok(
        Object.values(
          result.authority as Record<string, unknown>,
        ).every((value) => value === false),
      );
    } finally {
      if (retainedDirectory !== null) {
        await rm(retainedDirectory, { recursive: true, force: true });
      }
    }
  });
});

test("conflicting duplicates remain explicit and grant no authority", async () => {
  await withFixture(async (root) => {
    const tokenPath = path.join(root, "operator.token");
    await writeFile(
      tokenPath,
      "another-private-test-token\n",
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    await chmod(tokenPath, 0o600);

    const runner = new FakeRunner();
    runner.submitMode = "conflict";
    const bridge = new VoidMcpBridge(
      makeConfig(root, {
        allowSubmit: true,
        tokenFile: tokenPath,
      }),
      runner,
    );
    const result = await bridge.submitPaidWork({
      ...SAMPLE_INPUT,
      confirm: "submit-paid-work",
      expect_new: false,
    });
    const interpretation =
      result.interpretation as Record<string, unknown>;
    assert.equal(interpretation.accepted_for_review, false);
    assert.equal(interpretation.conflicting_duplicate, true);
    assert.equal(interpretation.private_temp_cleanup_completed, true);
    assert.ok(
      Object.values(
        result.authority as Record<string, unknown>,
      ).every((value) => value === false),
    );
  });
});

test("catalog status is fingerprint-verified and descriptive only", async () => {
  await withFixture(async (root) => {
    const bridge = new VoidMcpBridge(
      makeConfig(root),
      new FakeRunner(),
    );
    const catalog = await bridge.serviceCatalog();
    assert.equal(catalog.catalog_status, "descriptive_only");
    const status = await bridge.capabilityStatus();
    assert.equal(
      (
        status.submission as Record<string, unknown>
      ).tool_registered,
      false,
    );
    assert.equal(
      (
        status.capabilities as Record<string, unknown>
      ).automatic_payment,
      false,
    );
  });
});

function boundedProcessSpec(args: readonly string[]) {
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

test("bounded runner rejects the chunk that crosses the stderr limit", async () => {
  const { BoundedCommandRunner } = await import("../src/process.js");
  const runner = new BoundedCommandRunner();
  const sentinel = "VOID_MCP_OVERFLOW_SENTINEL";

  await assert.rejects(
    runner.run({
      ...boundedProcessSpec([
        "-e",
        `process.stderr.write(${JSON.stringify(sentinel)});`,
      ]),
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

test("bounded runner discards descendant stderr after terminal overflow", async () => {
  const { BoundedCommandRunner } = await import("../src/process.js");
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
      ...boundedProcessSpec(["-e", parent]),
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

test("bounded runner settles while a descendant still holds stdout", async () => {
  const { BoundedCommandRunner } = await import("../src/process.js");
  const runner = new BoundedCommandRunner();
  const descendant = "setTimeout(() => {}, 5_000);";
  const parent = [
    "const { spawn } = require('node:child_process');",
    `spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { stdio: ['ignore', 'inherit', 'ignore'] });`,
    "process.stdout.write('XX');",
    "setInterval(() => {}, 10_000);",
  ].join("");
  const startedAt = Date.now();

  await assert.rejects(
    runner.run({
      ...boundedProcessSpec(["-e", parent]),
      timeoutMs: 4_000,
      maxStdoutBytes: 1,
    }),
    /subprocess stdout exceeded 1 bytes/,
  );

  const elapsedMs = Date.now() - startedAt;
  assert.ok(
    elapsedMs < 2_500,
    `terminal subprocess rejection waited ${elapsedMs}ms for descendant-held stdout`,
  );
});
