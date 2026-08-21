#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MARKER = "WC_PUBLIC_OPPORTUNITY_HANDOFF_CANCEL_LIVENESS_GREEN";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "tools/wc-public-opportunity-handoff-v1.mjs");
const MAX_BYTES = 64 * 1024;
const PROMPT_MS = 250;

function headers(contentLength) {
  return {
    get(name) {
      if (String(name).toLowerCase() !== "content-length") return null;
      return contentLength;
    },
  };
}

async function expectPrimaryErrorPromptly(promise, expectedMessage) {
  const result = await Promise.race([
    promise.then(
      () => ({ kind: "resolved" }),
      (error) => ({ kind: "rejected", error }),
    ),
    new Promise((resolveTimeout) => {
      setTimeout(() => resolveTimeout({ kind: "timeout" }), PROMPT_MS);
    }),
  ]);
  assert.notEqual(result.kind, "timeout", `primary error did not settle within ${PROMPT_MS}ms`);
  assert.equal(result.kind, "rejected", "expected primary rejection");
  assert.equal(result.error?.message, expectedMessage);
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

const temp = mkdtempSync(join(tmpdir(), "void-wc-handoff-cancel-"));
try {
  const source = readFileSync(SOURCE, "utf8");
  const finalCall = 'main().catch((error) => hold(error instanceof Error ? error.message : "unexpected error"));\n';
  assert.equal(source.split(finalCall).length, 2, "handoff terminal call shape changed");
  const instrumented = source.replace(
    finalCall,
    "export const testOnly = { readBoundedHealthText };\n",
  );
  const instrumentedPath = join(temp, "handoff-contract.mjs");
  writeFileSync(instrumentedPath, instrumented, "utf8");
  const { testOnly } = await import(`${pathToFileURL(instrumentedPath).href}?v=${Date.now()}`);
  assert.equal(typeof testOnly?.readBoundedHealthText, "function");

  for (const mode of ["reject", "never"]) {
    const invalidTracker = { calls: 0, reasons: [] };
    const invalidResponse = {
      headers: headers("bad"),
      body: { cancel: cancelBehavior(mode, invalidTracker) },
    };
    await expectPrimaryErrorPromptly(
      testOnly.readBoundedHealthText(invalidResponse),
      "coordinator health content-length is invalid",
    );
    assert.equal(invalidTracker.calls, 1, `invalid length cancel count (${mode})`);

    const declaredTracker = { calls: 0, reasons: [] };
    const declaredResponse = {
      headers: headers(String(MAX_BYTES + 1)),
      body: { cancel: cancelBehavior(mode, declaredTracker) },
    };
    await expectPrimaryErrorPromptly(
      testOnly.readBoundedHealthText(declaredResponse),
      "coordinator health response exceeds byte limit",
    );
    assert.equal(declaredTracker.calls, 1, `declared overflow cancel count (${mode})`);

    const streamTracker = { calls: 0, reasons: [], released: 0 };
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
    await expectPrimaryErrorPromptly(
      testOnly.readBoundedHealthText(streamedResponse),
      "coordinator health response exceeds byte limit",
    );
    assert.equal(streamTracker.calls, 1, `stream overflow cancel count (${mode})`);
    assert.equal(streamTracker.released, 1, `stream reader release count (${mode})`);
  }

  process.stdout.write(`${MARKER}\n`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
