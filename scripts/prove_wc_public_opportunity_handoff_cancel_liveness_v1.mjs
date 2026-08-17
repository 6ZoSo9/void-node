#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKER = "WC_PUBLIC_OPPORTUNITY_HANDOFF_CANCEL_LIVENESS_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "tools/wc-public-opportunity-handoff-v1.mjs");
const CANONICAL_CLIENT = resolve(ROOT, "tools/void_public_earn_no_node_client_v1.mjs");
const MAX_BYTES = 64 * 1024;
const PROMPT_MS = 250;
const MIN_BOUNDED_TEARDOWN_MS = 60;

function headers(contentLength) {
  return {
    get(name) {
      if (String(name).toLowerCase() !== "content-length") return null;
      return contentLength;
    },
  };
}

async function expectPrimaryErrorPromptly(promise, expectedMessage) {
  const startedAt = Date.now();
  const result = await Promise.race([
    promise.then(
      () => ({ kind: "resolved" }),
      (error) => ({ kind: "rejected", error }),
    ),
    new Promise((resolveTimeout) => {
      setTimeout(() => resolveTimeout({ kind: "timeout" }), PROMPT_MS);
    }),
  ]);
  const elapsedMs = Date.now() - startedAt;
  assert.notEqual(result.kind, "timeout", `primary error did not settle within ${PROMPT_MS}ms`);
  assert.equal(result.kind, "rejected", "expected primary rejection");
  assert.equal(result.error?.message, expectedMessage);
  return elapsedMs;
}

function cancelBehavior(mode, tracker) {
  return (reason) => {
    tracker.calls += 1;
    tracker.reasons.push(reason);
    if (mode === "reject") return Promise.reject(new Error("synthetic cancel failure"));
    if (mode === "never") return new Promise(() => {});
    throw new Error(`unknown cancel mode: ${mode}`);
  };
}

function trackedController() {
  const tracker = { calls: 0, reasons: [] };
  return {
    tracker,
    controller: {
      abort(reason) {
        tracker.calls += 1;
        tracker.reasons.push(reason);
      },
    },
  };
}

async function proveTeardownCases(label, invoke) {
  for (const mode of ["reject", "never"]) {
    const invalidTracker = { calls: 0, reasons: [] };
    const invalidController = trackedController();
    const invalidResponse = {
      headers: headers("bad"),
      body: { cancel: cancelBehavior(mode, invalidTracker) },
    };
    const invalidElapsed = await expectPrimaryErrorPromptly(
      invoke(invalidResponse, invalidController.controller),
      `${label} content-length is invalid`,
    );
    assert.equal(invalidTracker.calls, 1, `invalid length cancel count (${label}, ${mode})`);
    assert.equal(invalidController.tracker.calls, 1, `invalid length abort count (${label}, ${mode})`);
    if (mode === "never") {
      assert.ok(
        invalidElapsed >= MIN_BOUNDED_TEARDOWN_MS,
        `invalid length released before bounded teardown terminal (${label}): ${invalidElapsed}ms`,
      );
    }

    const declaredTracker = { calls: 0, reasons: [] };
    const declaredController = trackedController();
    const declaredResponse = {
      headers: headers(String(MAX_BYTES + 1)),
      body: { cancel: cancelBehavior(mode, declaredTracker) },
    };
    const declaredElapsed = await expectPrimaryErrorPromptly(
      invoke(declaredResponse, declaredController.controller),
      `${label} response exceeds byte limit`,
    );
    assert.equal(declaredTracker.calls, 1, `declared overflow cancel count (${label}, ${mode})`);
    assert.equal(declaredController.tracker.calls, 1, `declared overflow abort count (${label}, ${mode})`);
    if (mode === "never") {
      assert.ok(
        declaredElapsed >= MIN_BOUNDED_TEARDOWN_MS,
        `declared overflow released before bounded teardown terminal (${label}): ${declaredElapsed}ms`,
      );
    }

    const streamTracker = { calls: 0, reasons: [], released: 0 };
    const streamController = trackedController();
    let readCount = 0;
    const reader = {
      async read() {
        readCount += 1;
        if (readCount === 1) return { done: false, value: new Uint8Array(MAX_BYTES + 1) };
        return { done: true, value: undefined };
      },
      cancel: cancelBehavior(mode, streamTracker),
      releaseLock() {
        streamTracker.released += 1;
      },
    };
    const streamedResponse = {
      headers: headers(null),
      body: { getReader: () => reader },
    };
    const streamedElapsed = await expectPrimaryErrorPromptly(
      invoke(streamedResponse, streamController.controller),
      `${label} response exceeds byte limit`,
    );
    assert.equal(streamTracker.calls, 1, `stream overflow cancel count (${label}, ${mode})`);
    assert.equal(streamTracker.released, 1, `stream reader release count (${label}, ${mode})`);
    assert.equal(streamController.tracker.calls, 1, `stream overflow abort count (${label}, ${mode})`);
    if (mode === "never") {
      assert.ok(
        streamedElapsed >= MIN_BOUNDED_TEARDOWN_MS,
        `stream overflow released before bounded teardown terminal (${label}): ${streamedElapsed}ms`,
      );
    }
  }
}

const temp = mkdtempSync(join(tmpdir(), "void-wc-handoff-cancel-"));
try {
  const source = readFileSync(SOURCE, "utf8");
  const finalCall = 'main().catch((error) => hold(error instanceof Error ? error.message : "unexpected error"));\n';
  assert.equal(source.split(finalCall).length, 2, "handoff terminal call shape changed");
  const instrumented = source.replace(
    finalCall,
    "export const testOnly = { readBoundedHealthText, readBoundedText };\n",
  );
  const instrumentedPath = join(temp, "handoff-contract.mjs");
  writeFileSync(instrumentedPath, instrumented, "utf8");
  writeFileSync(
    join(temp, "void_public_earn_no_node_client_v1.mjs"),
    readFileSync(CANONICAL_CLIENT, "utf8"),
    "utf8",
  );
  const { testOnly } = await import(`${pathToFileURL(instrumentedPath).href}?v=${Date.now()}`);
  assert.equal(typeof testOnly?.readBoundedHealthText, "function");
  assert.equal(typeof testOnly?.readBoundedText, "function");

  await proveTeardownCases(
    "coordinator health",
    (response, controller) => testOnly.readBoundedHealthText(response, controller),
  );
  await proveTeardownCases(
    "canonical participant status",
    (response, controller) => testOnly.readBoundedText(
      response,
      MAX_BYTES,
      "canonical participant status",
      controller,
    ),
  );

  process.stdout.write(`${MARKER}\n`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
