#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RESPONSE_REJECTION_TEARDOWN_MS,
  readBoundedTextOwned,
} from "../tools/wc-public-response-teardown-v1.mjs";

const encoder = new TextEncoder();

function headers(contentLength = null) {
  return {
    get(name) {
      if (name.toLowerCase() !== "content-length") return null;
      return contentLength;
    },
  };
}

function bodyWithCancel(cancel) {
  return {
    cancel,
    getReader() {
      throw new Error("reader_should_not_be_requested");
    },
  };
}

function streamedBody({ chunks, cancel }) {
  let index = 0;
  let released = false;
  const reader = {
    async read() {
      if (index >= chunks.length) return { done: true, value: undefined };
      const value = chunks[index];
      index += 1;
      return { done: false, value };
    },
    cancel,
    releaseLock() {
      released = true;
    },
  };
  return {
    body: { getReader: () => reader },
    reader,
    released: () => released,
  };
}

async function expectPrimaryError(run, expected) {
  let observed = null;
  try {
    await run();
  } catch (error) {
    observed = error instanceof Error ? error.message : String(error);
  }
  assert.equal(observed, expected);
}

async function timed(run) {
  const started = Date.now();
  await run();
  return Date.now() - started;
}

async function main() {
  assert.equal(RESPONSE_REJECTION_TEARDOWN_MS, 250);

  for (const path of [
    "tools/wc-public-opportunity-discovery-v1.mjs",
    "tools/wc-public-coordinator-readiness-v1.mjs",
  ]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /readBoundedTextOwned/u, `${path} must use owned response teardown helper`);
    assert.match(source, /controller\.abort\(reason\)/u, `${path} must abort rejected requests before teardown wait`);
  }

  let invalidAbortCount = 0;
  const invalidElapsed = await timed(async () => {
    await expectPrimaryError(
      () => readBoundedTextOwned({
        headers: headers("not-a-number"),
        body: bodyWithCancel(() => new Promise(() => {})),
      }, {
        maximumBytes: 8,
        abort: () => { invalidAbortCount += 1; },
      }),
      "response_content_length_invalid",
    );
  });
  assert.equal(invalidAbortCount, 1);
  assert.ok(invalidElapsed >= 200, `invalid teardown released too early: ${invalidElapsed}ms`);
  assert.ok(invalidElapsed < 1000, `invalid teardown was not bounded: ${invalidElapsed}ms`);

  let oversizeAbortCount = 0;
  const oversizeElapsed = await timed(async () => {
    await expectPrimaryError(
      () => readBoundedTextOwned({
        headers: headers("9"),
        body: bodyWithCancel(() => new Promise(() => {})),
      }, {
        maximumBytes: 8,
        abort: () => { oversizeAbortCount += 1; },
      }),
      "response_body_too_large",
    );
  });
  assert.equal(oversizeAbortCount, 1);
  assert.ok(oversizeElapsed >= 200, `declared oversize teardown released too early: ${oversizeElapsed}ms`);
  assert.ok(oversizeElapsed < 1000, `declared oversize teardown was not bounded: ${oversizeElapsed}ms`);

  let streamAbortCount = 0;
  const streamed = streamedBody({
    chunks: [encoder.encode("1234"), encoder.encode("56789")],
    cancel: () => new Promise(() => {}),
  });
  const streamElapsed = await timed(async () => {
    await expectPrimaryError(
      () => readBoundedTextOwned({ headers: headers(), body: streamed.body }, {
        maximumBytes: 8,
        abort: () => { streamAbortCount += 1; },
      }),
      "response_body_too_large",
    );
  });
  assert.equal(streamAbortCount, 1);
  assert.equal(streamed.released(), true);
  assert.ok(streamElapsed >= 200, `streamed oversize teardown released too early: ${streamElapsed}ms`);
  assert.ok(streamElapsed < 1000, `streamed oversize teardown was not bounded: ${streamElapsed}ms`);

  let rejectionAbortCount = 0;
  await expectPrimaryError(
    () => readBoundedTextOwned({
      headers: headers("bad"),
      body: bodyWithCancel(() => Promise.reject(new Error("cleanup_failed"))),
    }, {
      maximumBytes: 8,
      abort: () => { rejectionAbortCount += 1; },
    }),
    "response_content_length_invalid",
  );
  assert.equal(rejectionAbortCount, 1);

  const repeatedElapsed = await timed(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expectPrimaryError(
        () => readBoundedTextOwned({
          headers: headers("99"),
          body: bodyWithCancel(() => new Promise(() => {})),
        }, {
          maximumBytes: 8,
          abort: () => {},
        }),
        "response_body_too_large",
      );
    }
  });
  assert.ok(repeatedElapsed >= 600, `repeated hostile teardown released too early: ${repeatedElapsed}ms`);
  assert.ok(repeatedElapsed < 2000, `repeated hostile teardown was not bounded: ${repeatedElapsed}ms`);

  const normal = streamedBody({
    chunks: [encoder.encode("hello"), encoder.encode(" world")],
    cancel: () => Promise.resolve(),
  });
  const normalText = await readBoundedTextOwned({
    headers: headers("11"),
    body: normal.body,
  }, {
    maximumBytes: 64,
    abort: () => { throw new Error("abort_should_not_run"); },
  });
  assert.equal(normalText, "hello world");
  assert.equal(normal.released(), true);

  process.stdout.write("VOID_WC_PUBLIC_RESPONSE_TEARDOWN_V1_GREEN\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
