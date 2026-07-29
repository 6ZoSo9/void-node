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
